-- Fase G -- Teacher Decks: bootstrap idempotente do teacher_root.
--
-- ensure_teacher_decks(p_student_id, p_language_app_key) cria (se faltar) o
-- Deck `teacher_root` ("Cartões da professora") da árvore que a professora
-- CHAMADORA controla para 1 aluno+idioma. Aditiva: nenhuma linha existente é
-- alterada, nenhum backfill, nenhum cartão recebe deck_id aqui.
--
-- Fonte única de verdade de cada bootstrap:
--   * `root` do aluno continua sendo responsabilidade de ensure_user_decks()
--     (migration 049/050). Esta função NÃO recria essa lógica: se o root não
--     existir, chama ensure_user_decks() (que também cria o personal_root do
--     aluno -- efeito colateral inofensivo, é o mesmo bootstrap de sempre).
--     Como ensure_user_decks() só aceita "a própria conta ou o admin", uma
--     professora que NÃO seja o admin e cujo aluno ainda não abriu o app
--     receberá not_authorized nesse passo (root ausente). Limitação
--     registrada, coerente com teacher_flashcards ser escrita só pelo admin
--     (migration 026) -- não ampliamos permissões aqui.
--   * `teacher_root` é criado só aqui.
--
-- Autorização (SECURITY DEFINER, mesmo padrão de get_teacher_student_metrics):
--   * o chamador é SEMPRE a professora (auth.uid()); teacher_id nunca vem do
--     cliente;
--   * exige vínculo teacher_students ATIVO (teacher_id = auth.uid(),
--     student_id, language_app_key) -- sem vínculo, idioma sem vínculo,
--     aluno de outra professora ou o próprio aluno chamando: not_authorized.
create or replace function public.ensure_teacher_decks(p_student_id uuid, p_language_app_key text)
returns table (root_deck_id bigint, teacher_root_deck_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_root_id bigint;
  v_troot_id bigint;
begin
  if v_teacher is null or p_student_id is null or v_teacher = p_student_id then
    raise exception 'not_authorized';
  end if;
  if p_language_app_key not in ('frances', 'mandarim', 'portugues') then
    raise exception 'Idioma inválido: %', p_language_app_key;
  end if;
  if not exists (
    select 1 from public.teacher_students ts
    where ts.teacher_id = v_teacher and ts.student_id = p_student_id
      and ts.language_app_key = p_language_app_key and ts.status = 'active'
  ) then
    raise exception 'not_authorized';
  end if;

  select id into v_root_id from public.decks
    where owner_id = p_student_id and language_app_key = p_language_app_key and kind = 'root';
  if v_root_id is null then
    perform public.ensure_user_decks(p_student_id, p_language_app_key);
    select id into v_root_id from public.decks
      where owner_id = p_student_id and language_app_key = p_language_app_key and kind = 'root';
    if v_root_id is null then
      raise exception 'root_unavailable';
    end if;
  end if;

  select id into v_troot_id from public.decks
    where owner_id = p_student_id and teacher_id = v_teacher
      and language_app_key = p_language_app_key and kind = 'teacher_root';
  if v_troot_id is null then
    insert into public.decks (owner_id, teacher_id, parent_deck_id, kind, name, language_app_key)
    values (p_student_id, v_teacher, v_root_id, 'teacher_root', 'Cartões da professora', p_language_app_key)
    on conflict do nothing
    returning id into v_troot_id;
    if v_troot_id is null then
      -- corrida: outra chamada inseriu entre o select e o insert
      -- (decks_unique_teacher_root) -- releitura resolve.
      select id into v_troot_id from public.decks
        where owner_id = p_student_id and teacher_id = v_teacher
          and language_app_key = p_language_app_key and kind = 'teacher_root';
    end if;
  end if;

  return query select v_root_id, v_troot_id;
end;
$$;

revoke all on function public.ensure_teacher_decks(uuid, text) from public;
revoke execute on function public.ensure_teacher_decks(uuid, text) from anon;
grant execute on function public.ensure_teacher_decks(uuid, text) to authenticated;
