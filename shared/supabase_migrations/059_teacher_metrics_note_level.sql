-- K.6 -- get_teacher_student_metrics: métricas em duas unidades separadas.
--
-- ANTES (029/058): tudo era contado por CardInstance (card serializado) e o
-- "total" era o nº de linhas (Notes) com nome de "cartões"; "fracas" incluía
-- cartões nunca estudados (reps = 0) e Reverse/Cloze inflavam a força.
--
-- AGORA (contrato docs/K-analytics-contrato.md):
--   CARDINSTANCE (cartões): cardsTotal, cardsNew, cardsLearning, cardsReview,
--     cardsDue -- só cards de linhas ATIVAS. Reverso = 2, Cloze = N.
--   NOTE (conteúdos): contentsTotal (linhas ATIVAS de teacher_flashcards),
--     contentsStudied, contentsNotStarted e contentsStrength{NotStarted,Weak,
--     Medium,Strong}.
--   ARQUIVADOS (informativo, nunca somado ao ativo): archivedNotes, archivedCards.
--   lastStudyDay: atividade da CONTA no idioma (não é atividade do conteúdo).
--
-- Identidade da Note no servidor: card.rowId = id da linha de
-- teacher_flashcards (gravado pelo motor em TODA CardInstance da linha,
-- inclusive -b, -cN, -rN). Saves antigos sem rowId: o id da linha é lido do
-- formato ancorado ^t{n}(-r{n})?(-b|-c{n})?$ e SÓ vale se {n} é uma linha real
-- desta professora/aluno/idioma (mesma validação de K.0-B). Nenhum outro
-- sufixo/direção é interpretado.
--
-- Seleção (inalterada de K.0-B): origin = 'teacher' (ou ausente só no
-- fallback), nunca study/self; linha pertence a ESTA professora, ESTE aluno e
-- ESTE idioma. Atividade/arquivamento vêm do status da LINHA no banco (fonte
-- de verdade), não do espelho flashcardStatus salvo no progresso.
--
-- Definições (iguais às do cliente, shared/srs.js cardStudyBucket e
-- shared/analytics-metrics.js):
--   bucket: state learning|relearning -> learning; review -> review;
--           senão reps > 0 -> learning, reps = 0 -> new.
--   Devido: bucket <> new e due > 0 e due <= agora (ms). Sem 48h.
--   Estudado: alguma CardInstance irmã com reps > 0.
--   Força da Note: nenhuma irmã estudada -> not_started; senão a MAIS FRACA
--     entre as estudadas (irmã New não rebaixa). Por card: lapses >= 2 fraca;
--     lapses < 2 e interval >= 60 forte; resto média (cardStrengthBucket).
--
-- Sem mudança de schema, sem backfill, sem RLS nova. Só CREATE OR REPLACE.
-- Aplicar ANTES de publicar o front (admin-students.js passa a ler as novas chaves).
-- ROLLBACK: reaplicar o corpo de 058_fix_teacher_metrics_card_selection.sql.
create or replace function public.get_teacher_student_metrics(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_lang_data jsonb;
  v_cards jsonb;
  v_now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
  v_out jsonb;
begin
  select exists(
    select 1 from teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = p_student_id
      and ts.language_app_key = p_language_app_key
      and ts.status = 'active'
  ) into v_authorized;

  if not v_authorized then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  select data -> p_language_app_key into v_lang_data
  from progress where user_id = p_student_id;

  v_cards := case when jsonb_typeof(v_lang_data -> 'cards') = 'array'
                  then v_lang_data -> 'cards' else '[]'::jsonb end;

  with rws as (
    select tf.id, (tf.status = 'active') as is_active
    from teacher_flashcards tf
    where tf.teacher_id = auth.uid()
      and tf.student_id = p_student_id
      and tf.language_app_key = p_language_app_key
  ),
  raw as (
    select c from jsonb_array_elements(v_cards) c where jsonb_typeof(c) = 'object'
  ),
  parsed as (
    select c,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' then
          case when c ->> 'origin' = 'teacher' then (c ->> 'rowId')::bigint end
        when (c ->> 'id') ~ '^t[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$'
             and coalesce(c ->> 'origin', 'teacher') = 'teacher' then
          (substring(c ->> 'id' from '^t([0-9]+)'))::bigint
      end as row_id
    from raw
  ),
  nums as (
    select p.row_id, r.is_active,
      case when (p.c ->> 'reps') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'reps')::numeric else 0 end as reps,
      case when (p.c ->> 'lapses') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'lapses')::numeric else 0 end as lapses,
      case when (p.c ->> 'interval') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'interval')::numeric else 0 end as ivl,
      case when (p.c ->> 'due') ~ '^[0-9]+(\.[0-9]+)?$' then (p.c ->> 'due')::numeric else 0 end as due,
      coalesce(nullif(p.c ->> 'state', ''), 'new') as st
    from parsed p
    join rws r on r.id = p.row_id
  ),
  cardx as (
    select row_id, is_active, reps, lapses, ivl, due,
      case when st in ('learning', 'relearning') then 'learning'
           when st = 'review' then 'review'
           when reps > 0 then 'learning'
           else 'new' end as bucket
    from nums
  ),
  active_cards as (select * from cardx where is_active),
  note_agg as (
    -- uma linha por Note ATIVA (inclusive sem nenhum card no progresso)
    select r.id,
      coalesce(bool_or(a.reps > 0), false) as studied,
      -- ranking da irmã estudada: 0 fraca, 1 média, 2 forte; mais fraca = min
      min(case when a.reps > 0 then
            case when a.lapses >= 2 then 0
                 when a.lapses < 2 and a.ivl >= 60 then 2
                 else 1 end
          end) as rank
    from rws r
    left join active_cards a on a.row_id = r.id
    where r.is_active
    group by r.id
  )
  select jsonb_build_object(
    'lastStudyDay', v_lang_data ->> 'lastStudyDay',
    'contentsTotal', (select count(*) from note_agg),
    'contentsStudied', (select count(*) from note_agg where studied),
    'contentsNotStarted', (select count(*) from note_agg where not studied),
    'contentsStrengthNotStarted', (select count(*) from note_agg where not studied),
    'contentsStrengthWeak', (select count(*) from note_agg where studied and rank = 0),
    'contentsStrengthMedium', (select count(*) from note_agg where studied and rank = 1),
    'contentsStrengthStrong', (select count(*) from note_agg where studied and rank = 2),
    'cardsTotal', (select count(*) from active_cards),
    'cardsNew', (select count(*) from active_cards where bucket = 'new'),
    'cardsLearning', (select count(*) from active_cards where bucket = 'learning'),
    'cardsReview', (select count(*) from active_cards where bucket = 'review'),
    'cardsDue', (select count(*) from active_cards where bucket <> 'new' and due > 0 and due <= v_now_ms),
    'archivedNotes', (select count(*) from rws where not is_active),
    'archivedCards', (select count(*) from cardx where not is_active)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.get_teacher_student_metrics(uuid, text) from public;
revoke all on function public.get_teacher_student_metrics(uuid, text) from anon;
grant execute on function public.get_teacher_student_metrics(uuid, text) to authenticated;
