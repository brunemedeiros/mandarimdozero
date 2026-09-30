-- Fase H (H6/H12): a professora só opera a árvore de Teacher Decks e cria
-- Teacher Cards enquanto o vínculo teacher_students (professora+aluno+idioma)
-- estiver 'active'. Aditiva: não altera policies nem migrations antigas, e
-- NÃO toca linhas existentes (histórico preservado). Vale para qualquer papel
-- (admin inclusive) -- a professora do Deck/cartão é a que precisa do vínculo.
--   * decks (teacher_root/teacher): INSERT, UPDATE e DELETE exigem vínculo ativo
--     (DELETE: exceto quando a conta do aluno/professora já foi removida --
--     cascata de auth.users, mesma exceção da 054);
--   * teacher_flashcards: INSERT exige vínculo ativo; UPDATE só quando deck_id
--     muda para um Deck (edição de conteúdo de cartão histórico não é bloqueada).
create or replace function teacher_link_is_active(p_teacher uuid, p_student uuid, p_lang text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from teacher_students
    where teacher_id = p_teacher and student_id = p_student
      and language_app_key = p_lang and status = 'active');
$$;
revoke all on function teacher_link_is_active(uuid, uuid, text) from public, anon, authenticated;

create or replace function decks_require_active_link()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare r decks;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  if r.kind not in ('teacher_root', 'teacher') then
    return r;
  end if;
  if tg_op = 'DELETE' and (
       (r.owner_id is not null and not exists (select 1 from auth.users where id = r.owner_id))
    or (r.teacher_id is not null and not exists (select 1 from auth.users where id = r.teacher_id))) then
    return r;
  end if;
  if not teacher_link_is_active(r.teacher_id, r.owner_id, r.language_app_key) then
    raise exception 'vinculo professora-aluno inativo para este idioma' using errcode = '42501';
  end if;
  return r;
end;
$$;
revoke all on function decks_require_active_link() from public, anon, authenticated;

drop trigger if exists decks_require_active_link_trigger on decks;
create trigger decks_require_active_link_trigger
  before insert or update or delete on decks
  for each row execute function decks_require_active_link();

create or replace function teacher_flashcards_require_active_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- deck_id inalterado, ou virando NULL (ON DELETE SET NULL de uma cascata de
  -- conta): não é "operar a árvore" e não pode travar a remoção da conta.
  if tg_op = 'UPDATE' and (new.deck_id is not distinct from old.deck_id or new.deck_id is null) then
    return new;
  end if;
  if not teacher_link_is_active(new.teacher_id, new.student_id, new.language_app_key) then
    raise exception 'vinculo professora-aluno inativo para este idioma' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function teacher_flashcards_require_active_link() from public, anon, authenticated;

drop trigger if exists teacher_flashcards_require_active_link_trigger on teacher_flashcards;
create trigger teacher_flashcards_require_active_link_trigger
  before insert or update on teacher_flashcards
  for each row execute function teacher_flashcards_require_active_link();
