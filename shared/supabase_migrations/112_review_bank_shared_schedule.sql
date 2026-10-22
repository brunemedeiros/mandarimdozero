-- 112: Banco de Revisão com UM agendamento só (decisão da autora, 2026-10-18; docs/banco-revisao-proposta-v2.md, proposta A).
--
-- * O Modo aula passa a usar o FSRS (o mesmo motor do site) em vez da escada fixa de níveis (083). O estado de memória
--   do item fica em review_bank_items.fsrs (jsonb com stability, difficulty, state, lastReview, due, reps, lapses...),
--   e due_date continua existindo como data derivada (o Récap e a Visão geral leem esse campo).
-- * O estudo do aluno em casa (Aluno > Revisão) agora também grava no Banco: uma linha em review_bank_reviews com
--   via = 'casa' e a nota (0 a 3), e, quando o aluno é uma conta individual, o estado FSRS espelhado no item.
-- * Respostas do Modo aula passam a guardar a nota (grade 0 a 3: Errei, Difícil, Bom, Fácil) além do resultado antigo
--   (acertou, ajuda, errou), para o app do aluno aplicar a nota certa no FSRS dele (Bom e Fácil deixam de se confundir).
--
-- Aditiva e idempotente; sem DROP (create or replace com a mesma assinatura e retorno; função nova para a nota).
-- Não apaga nem altera nenhuma linha existente: itens e respostas antigas ficam como estão (via = 'aula' por padrão).
-- Progresso FSRS dos alunos NÃO é tocado (ele vive em progress, só o dono grava).
-- Desfazer (manual): remover as funções log_my_bank_review e get_my_pending_bank_grades, recriar a get_my_pending_bank_reviews
-- da 096 sem o filtro via, e remover as colunas abaixo.

alter table public.review_bank_items
  add column if not exists fsrs jsonb,
  add column if not exists last_source text check (last_source is null or last_source in ('aula', 'casa'));

alter table public.review_bank_reviews
  add column if not exists grade smallint check (grade is null or grade between 0 and 3),
  add column if not exists typed boolean not null default false,
  add column if not exists via text not null default 'aula' check (via in ('aula', 'casa'));
create index if not exists review_bank_reviews_via_idx on public.review_bank_reviews (bank_student_id, via, review_date desc);

-- ---------- Aluno: respostas do Modo aula ainda não aplicadas (agora só as de aula) ----------
-- Mesma assinatura e retorno da 096 (clientes antigos continuam funcionando); acrescenta o filtro via = 'aula' para que o
-- estudo em casa de um aluno nunca vire "resposta da aula" de outro (membros de Turma).
create or replace function public.get_my_pending_bank_reviews(p_language_app_key text)
returns table (id uuid, teacher_flashcard_id bigint, outcome text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, t.id, r.outcome, r.created_at
    from public.review_bank_reviews r
    join public.review_bank_items i on i.id = r.item_id
    join public.review_bank_students s on s.id = r.bank_student_id
    join public.teacher_flashcards t on t.bank_item_id = i.id and t.student_id = auth.uid()
   where s.language_app_key = p_language_app_key
     and r.via = 'aula'
     and public.teacher_link_is_active(s.teacher_id, auth.uid(), s.language_app_key)
     and not exists (select 1 from public.review_bank_review_acks a where a.review_id = r.id and a.student_id = auth.uid())
     and (
       (s.linked_student_id = auth.uid() and r.applied_at is null)
       or (s.classroom_id is not null and r.source = 'modo_aula'
           and exists (select 1 from public.classroom_members m
                        where m.classroom_id = s.classroom_id and m.student_id = auth.uid() and m.added_at <= r.created_at))
     )
   order by r.created_at;
$$;

-- Versão com a nota (0 a 3). Resposta antiga sem nota: o cliente deduz (acertou = Bom, ajuda = Difícil, errou = Errei).
create or replace function public.get_my_pending_bank_grades(p_language_app_key text)
returns table (id uuid, teacher_flashcard_id bigint, outcome text, grade smallint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, t.id, r.outcome, r.grade, r.created_at
    from public.review_bank_reviews r
    join public.review_bank_items i on i.id = r.item_id
    join public.review_bank_students s on s.id = r.bank_student_id
    join public.teacher_flashcards t on t.bank_item_id = i.id and t.student_id = auth.uid()
   where s.language_app_key = p_language_app_key
     and r.via = 'aula'
     and public.teacher_link_is_active(s.teacher_id, auth.uid(), s.language_app_key)
     and not exists (select 1 from public.review_bank_review_acks a where a.review_id = r.id and a.student_id = auth.uid())
     and (
       (s.linked_student_id = auth.uid() and r.applied_at is null)
       or (s.classroom_id is not null and r.source = 'modo_aula'
           and exists (select 1 from public.classroom_members m
                        where m.classroom_id = s.classroom_id and m.student_id = auth.uid() and m.added_at <= r.created_at))
     )
   order by r.created_at;
$$;

-- ---------- Aluno: registra o estudo em casa de um cartão da professora ----------
-- p_grade: 0 Errei, 1 Difícil, 2 Bom, 3 Fácil; null = só atualiza o estado espelhado (depois de aplicar respostas da aula).
-- p_fsrs: estado de memória do cartão do aluno DEPOIS da nota (o app dele calcula). Só campos conhecidos são gravados.
-- Conta individual (aluno do Banco ligado a esta conta): o item espelha o estado e a próxima data do aluno.
-- Aluno de Turma: grava a linha da resposta (estatística), mas NÃO mexe no estado do item (ele é da turma inteira).
-- Cartão que não é do Banco, de outro aluno ou sem vínculo ativo: devolve false sem erro (o app descarta da fila).
create or replace function public.log_my_bank_review(p_card_id bigint, p_grade integer, p_typed boolean, p_fsrs jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_card public.teacher_flashcards%rowtype;
  v_item public.review_bank_items%rowtype;
  v_bs public.review_bank_students%rowtype;
  v_outcome text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_fsrs jsonb;
  v_due date;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  if p_grade is not null and (p_grade < 0 or p_grade > 3) then raise exception 'grade_invalido'; end if;
  select * into v_card from public.teacher_flashcards
   where id = p_card_id and student_id = v_me and bank_item_id is not null;
  if not found then return false; end if;
  if not public.teacher_link_is_active(v_card.teacher_id, v_me, v_card.language_app_key) then return false; end if;
  select * into v_item from public.review_bank_items
   where id = v_card.bank_item_id and teacher_id = v_card.teacher_id for update;
  if not found then return false; end if;
  select * into v_bs from public.review_bank_students where id = v_item.bank_student_id;
  if not found then return false; end if;

  v_outcome := case p_grade when 0 then 'errou' when 1 then 'ajuda' when 2 then 'acertou' when 3 then 'acertou' else null end;

  if p_grade is not null then
    insert into public.review_bank_reviews
      (item_id, teacher_id, student_id, bank_student_id, language_app_key, outcome, grade, typed, source, via, review_date, applied_at)
    values
      (v_item.id, v_item.teacher_id, v_me, v_item.bank_student_id, v_item.language_app_key, v_outcome, p_grade::smallint,
       coalesce(p_typed, false), 'modo_aula', 'casa', v_today, now());
  end if;

  if v_bs.linked_student_id is not null and v_bs.linked_student_id = v_me then
    begin
      if p_fsrs is not null and jsonb_typeof(p_fsrs) = 'object' then
        v_fsrs := jsonb_strip_nulls(jsonb_build_object(
          'stability', nullif(p_fsrs ->> 'stability', '')::numeric,
          'difficulty', nullif(p_fsrs ->> 'difficulty', '')::numeric,
          'state', case when p_fsrs ->> 'state' in ('new', 'learning', 'review', 'relearning') then p_fsrs ->> 'state' else null end,
          'lastReview', nullif(p_fsrs ->> 'lastReview', '')::bigint,
          'due', nullif(p_fsrs ->> 'due', '')::bigint,
          'reps', nullif(p_fsrs ->> 'reps', '')::integer,
          'lapses', nullif(p_fsrs ->> 'lapses', '')::integer,
          'interval', nullif(p_fsrs ->> 'interval', '')::integer,
          'fsrsReps', nullif(p_fsrs ->> 'fsrsReps', '')::integer,
          'fsrsLapses', nullif(p_fsrs ->> 'fsrsLapses', '')::integer));
        if v_fsrs ? 'due' then
          v_due := (to_timestamp((v_fsrs ->> 'due')::double precision / 1000.0) at time zone 'America/Sao_Paulo')::date;
        end if;
      end if;
    exception when others then
      v_fsrs := null; v_due := null;
    end;
    update public.review_bank_items
       set fsrs = coalesce(v_fsrs, fsrs),
           due_date = coalesce(v_due, due_date),
           last_result = coalesce(v_outcome, last_result),
           last_review_date = case when v_outcome is null then last_review_date else v_today end,
           last_source = case when v_outcome is null then last_source else 'casa' end,
           updated_at = updated_at
     where id = v_item.id;
  end if;
  return true;
end;
$$;

revoke execute on function public.get_my_pending_bank_reviews(text), public.get_my_pending_bank_grades(text),
  public.log_my_bank_review(bigint, integer, boolean, jsonb) from public, anon;
grant execute on function public.get_my_pending_bank_reviews(text), public.get_my_pending_bank_grades(text),
  public.log_my_bank_review(bigint, integer, boolean, jsonb) to authenticated;
