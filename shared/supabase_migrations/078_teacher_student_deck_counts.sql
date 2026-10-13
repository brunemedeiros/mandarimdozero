-- 078 -- K.9: contagens por Deck do aluno para a professora (docs/K-analytics-contrato.md, "Fase K final").
--
-- get_teacher_student_deck_counts(aluno, idioma): a árvore "Meus Decks" do aluno (personal_root + subdecks) e a
-- árvore "Cartões da professora" DESTA professora (teacher_root + subdecks), cada Deck com as contagens da
-- SUBÁRVORE (o Deck + descendentes), mesma regra de getDeckCounts/structuralCounts no cliente:
--   bucket: state learning|relearning -> learning; review -> review; senão reps > 0 -> learning; reps = 0 -> new.
--   total = cartões (CardInstance: Reverso = 2, Cloze = N); review = ESTADO review; due = não-New com due <= agora.
-- Só nome do Deck e números: nunca o conteúdo dos cartões. A privacidade do perfil/Deck não vale para a professora
-- (decisão da autora), então os Decks privados entram.
-- Porta: a mesma da 059 (vínculo ACTIVE professora = auth.uid() x aluno x idioma).
-- Trilha (Course Deck) fica de fora: o painel 070 já mostra o progresso da trilha, e a elegibilidade dos cartões da
-- trilha (lição concluída) é regra do cliente.
-- Cartão -> Note: card.rowId (gravado pelo motor em toda CardInstance da linha) com origin 'self'/'teacher'; saves
-- antigos SEM rowId: formato ancorado ^s{n}... / ^t{n}... e só se {n} for linha real deste aluno (e desta
-- professora, no caso 'teacher'). Note -> Deck: own_flashcards.deck_id / teacher_flashcards.deck_id (fonte de
-- verdade; o deckId salvo no progresso não é lido). Só linhas ATIVAS (arquivado fora, como no cliente).
-- Limitação herdada da 059: só conta cartões que o aluno já sincronizou em progress.
-- Sem mudança de schema. Desfazer: drop function public.get_teacher_student_deck_counts(uuid, text).

create or replace function public.get_teacher_student_deck_counts(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lang_data jsonb;
  v_cards jsonb;
  v_now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
  v_out jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from teacher_students ts
     where ts.teacher_id = auth.uid() and ts.student_id = p_student_id
       and ts.language_app_key = p_language_app_key and ts.status = 'active'
  ) then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  select data -> p_language_app_key into v_lang_data from progress where user_id = p_student_id;
  v_cards := case when jsonb_typeof(v_lang_data -> 'cards') = 'array' then v_lang_data -> 'cards' else '[]'::jsonb end;

  with recursive
  tree as (
    select d.id, d.parent_deck_id, d.kind, d.name, 0 as depth, d.created_at
      from decks d
     where d.owner_id = p_student_id and d.language_app_key = p_language_app_key
       and (d.kind = 'personal_root' or (d.kind = 'teacher_root' and d.teacher_id = auth.uid()))
    union all
    select c.id, c.parent_deck_id, c.kind, c.name, t.depth + 1, c.created_at
      from decks c join tree t on c.parent_deck_id = t.id
     where c.owner_id = p_student_id and c.language_app_key = p_language_app_key and t.depth < 50
  ),
  closure as (                      -- (ancestral, descendente), inclusive o próprio Deck
    select id as anc, id as des, 0 as lvl from tree
    union all
    select cl.anc, t.id, cl.lvl + 1 from closure cl join tree t on t.parent_deck_id = cl.des where cl.lvl < 50
  ),
  own_rows as (
    select o.id, o.deck_id from own_flashcards o
     where o.owner_id = p_student_id and o.language_app_key = p_language_app_key and o.status = 'active'
  ),
  teacher_rows as (
    select tf.id, tf.deck_id from teacher_flashcards tf
     where tf.teacher_id = auth.uid() and tf.student_id = p_student_id
       and tf.language_app_key = p_language_app_key and tf.status = 'active'
  ),
  raw as (select c from jsonb_array_elements(v_cards) c where jsonb_typeof(c) = 'object'),
  parsed as (
    select c,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' and c ->> 'origin' in ('self', 'teacher') then c ->> 'origin'
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^s[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' and coalesce(c ->> 'origin', 'self') = 'self' then 'self'
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^t[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' and coalesce(c ->> 'origin', 'teacher') = 'teacher' then 'teacher'
      end as origin,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' and c ->> 'origin' in ('self', 'teacher') then (c ->> 'rowId')::bigint
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^[st][0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' then (substring(c ->> 'id' from '^[st]([0-9]+)'))::bigint
      end as row_id
    from raw
  ),
  carded as (
    select coalesce(o.deck_id, t.deck_id) as deck_id,
      case when (p.c ->> 'reps') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'reps')::numeric else 0 end as reps,
      case when (p.c ->> 'due') ~ '^[0-9]+(\.[0-9]+)?$' then (p.c ->> 'due')::numeric else 0 end as due,
      coalesce(nullif(p.c ->> 'state', ''), 'new') as st
    from parsed p
    left join own_rows o on p.origin = 'self' and o.id = p.row_id
    left join teacher_rows t on p.origin = 'teacher' and t.id = p.row_id
    where (p.origin = 'self' and o.id is not null) or (p.origin = 'teacher' and t.id is not null)
  ),
  bucketed as (
    select deck_id, due,
      case when st in ('learning', 'relearning') then 'learning'
           when st = 'review' then 'review'
           when reps > 0 then 'learning'
           else 'new' end as bucket
    from carded
  ),
  per_deck as (
    select cl.anc as deck_id,
      count(b.bucket) as total,
      count(*) filter (where b.bucket = 'new') as n_new,
      count(*) filter (where b.bucket = 'learning') as n_learning,
      count(*) filter (where b.bucket = 'review') as n_review,
      count(*) filter (where b.bucket <> 'new' and b.due > 0 and b.due <= v_now_ms) as n_due
    from closure cl
    left join bucketed b on b.deck_id = cl.des
    group by cl.anc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'parentId', t.parent_deck_id, 'kind', t.kind, 'name', t.name, 'depth', t.depth,
      'total', pd.total, 'new', pd.n_new, 'learning', pd.n_learning, 'review', pd.n_review, 'due', pd.n_due)
    order by (t.kind in ('teacher_root', 'teacher')), t.depth, lower(t.name), t.id), '[]'::jsonb)
    into v_out
  from tree t join per_deck pd on pd.deck_id = t.id;

  return jsonb_build_object('decks', v_out);
end;
$$;

revoke all on function public.get_teacher_student_deck_counts(uuid, text) from public;
revoke all on function public.get_teacher_student_deck_counts(uuid, text) from anon;
grant execute on function public.get_teacher_student_deck_counts(uuid, text) to authenticated;
