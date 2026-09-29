-- Fase G (hardening): proteção estrutural de Teacher Decks contra DELETE.
-- Aditiva. Não altera policies (decks_admin_write/decks_teacher_write intactas)
-- nem o FK (teacher_flashcards.deck_id continua ON DELETE SET NULL).
-- Regras (valem para UI, função SQL, API direta e admin):
--   * teacher_root nunca pode ser apagado;
--   * teacher só pode ser apagado se vazio (sem filhos e sem teacher_flashcards).
-- Exceção única: remoção da CONTA (cascata de auth.users) -- quando o aluno ou
-- a professora do Deck já não existe em auth.users, o Deck pode ir junto.
-- Decks personal/course/root/personal_root: sem mudança.
-- SECURITY DEFINER: precisa ler auth.users e enxergar TODOS os cartoes/filhos
-- (independente da RLS de quem apaga); a funcao so le e levanta excecao.
create or replace function decks_protect_teacher_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if old.kind not in ('teacher_root','teacher') then
    return old;
  end if;

  -- cascata de remoção de conta: não bloquear
  if (old.owner_id is not null and not exists (select 1 from auth.users where id = old.owner_id))
     or (old.teacher_id is not null and not exists (select 1 from auth.users where id = old.teacher_id)) then
    return old;
  end if;

  if old.kind = 'teacher_root' then
    raise exception 'teacher_root nao pode ser apagado' using errcode = '23503';
  end if;

  if exists (select 1 from decks where parent_deck_id = old.id) then
    raise exception 'Teacher Deck com subdecks nao pode ser apagado' using errcode = '23503';
  end if;
  if exists (select 1 from teacher_flashcards where deck_id = old.id) then
    raise exception 'Teacher Deck com cartoes nao pode ser apagado' using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists decks_protect_teacher_delete_trigger on decks;
create trigger decks_protect_teacher_delete_trigger
  before delete on decks
  for each row execute function decks_protect_teacher_delete();

revoke all on function decks_protect_teacher_delete() from public, anon, authenticated;
