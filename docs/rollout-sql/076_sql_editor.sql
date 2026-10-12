begin;
set local lock_timeout = '10s';
-- 076 -- Regras das tabelas da professora passam a usar o PAPEL Professora (075), não o e-mail da autora.
-- Etapa 1 do plano Professora (docs/plano-professora-privacidade.md).
--
-- O que muda:
--   * teacher_students: escrita geral só da admin (is_admin()); a professora pode desativar os vínculos DELA
--     (criar vínculo virá pelo convite que o aluno aceita, migration futura).
--   * teacher_flashcards: escreve a professora dona (teacher_id = auth.uid() + papel Professora). Os triggers
--     da 055 continuam exigindo vínculo ativo para criar/mover cartão.
--   * teacher_class_logs (Aulas) e teacher_support_materials (Material de apoio): CORRIGE O FURO de qualquer
--     conta gravar para qualquer aluno. Agora: papel Professora + vínculo ativo para gravar; o aluno com vínculo
--     ativo só LÊ (Aulas pela RPC get_my_class_logs, que não devolve o campo "Anotações", nota privada da
--     professora).
--   * Bucket support-materials: só quem é Professora envia arquivo.
--   * decks: escrita da admin via is_admin(); Decks da professora exigem papel Professora.
--   * ensure_user_decks: além do dono e da admin, a professora com vínculo ativo com aquele aluno.
--   * Proteção de plan_tier/role (063/066): admin via is_admin() (o e-mail continua valendo dentro dele).
--
-- Policies cujo papel era {public} passam a valer só para authenticated: as funções is_admin()/is_teacher()
-- não são executáveis por anon, e quem não está logado nunca escreveu nessas tabelas.
-- As policies conferem o vínculo com `exists` em teacher_students (que a professora e o aluno já podem ler pela RLS),
-- e não com teacher_link_is_active(), que não tem EXECUTE para authenticated (fechada na 055). Colunas da
-- tabela da policy sempre qualificadas pelo nome da tabela (sem isso, `student_id` viraria ts.student_id).
-- Nenhuma remoção: as policies existentes são alteradas com ALTER POLICY (renomeadas antes, só se ainda tiverem o
-- nome antigo, para a migration poder rodar de novo) e as novas são criadas só se não existirem. Funções com create or replace. Não muda nenhum dado.
-- Desfazer (manual): ALTER POLICY de volta para as expressões das migrations 025, 026, 031, 033, 049 e 050/063/066.

-- ---------- teacher_students ----------
alter policy teacher_students_admin_write on public.teacher_students
  using (public.is_admin()) with check (public.is_admin());
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_students' and policyname='teacher_students_teacher_update') then
    create policy teacher_students_teacher_update on public.teacher_students for update to authenticated
      using (auth.uid() = teacher_id and public.is_teacher())
      with check (auth.uid() = teacher_id and public.is_teacher() and status <> 'active');
  end if;
end $$;

-- ---------- teacher_flashcards ----------
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_flashcards' and policyname='teacher_flashcards_admin_write') then
    alter policy teacher_flashcards_admin_write on public.teacher_flashcards rename to teacher_flashcards_teacher_write;
  end if;
end $$;
alter policy teacher_flashcards_teacher_write on public.teacher_flashcards to authenticated
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher());

-- ---------- teacher_class_logs (Aulas) ----------
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_class_logs' and policyname='teacher_class_logs_owner_all') then
    alter policy teacher_class_logs_owner_all on public.teacher_class_logs rename to teacher_class_logs_teacher_all;
  end if;
end $$;
alter policy teacher_class_logs_teacher_all on public.teacher_class_logs to authenticated
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher()
              and exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid()
                          and ts.student_id = teacher_class_logs.student_id
                          and ts.language_app_key = teacher_class_logs.language_app_key and ts.status = 'active'));

-- Leitura do aluno: só com vínculo ativo e sem o campo "notes" (Anotações = nota privada da professora).
create or replace function public.get_my_class_logs(p_language_app_key text)
returns table (id bigint, class_date date, topic text, homework text, observations text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.class_date, l.topic, l.homework, l.observations, l.created_at, l.updated_at
    from public.teacher_class_logs l
   where l.student_id = auth.uid()
     and l.language_app_key = p_language_app_key
     and public.teacher_link_is_active(l.teacher_id, l.student_id, l.language_app_key)
   order by l.class_date desc, l.id desc;
$$;
revoke execute on function public.get_my_class_logs(text) from public, anon;
grant execute on function public.get_my_class_logs(text) to authenticated;

-- ---------- teacher_support_materials (Material de apoio) ----------
alter policy teacher_support_materials_teacher_all on public.teacher_support_materials to authenticated
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher()
              and exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid()
                          and ts.student_id = teacher_support_materials.student_id
                          and ts.language_app_key = teacher_support_materials.language_app_key and ts.status = 'active'));
alter policy teacher_support_materials_student_read on public.teacher_support_materials to authenticated
  using (auth.uid() = student_id and exists (select 1 from public.teacher_students ts where ts.student_id = auth.uid()
         and ts.teacher_id = teacher_support_materials.teacher_id
         and ts.language_app_key = teacher_support_materials.language_app_key and ts.status = 'active'));

-- ---------- Storage: só Professora envia arquivo de Material de apoio ----------
alter policy support_materials_owner_insert on storage.objects
  with check (bucket_id = 'support-materials' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());

-- ---------- decks ----------
alter policy decks_admin_write on public.decks to authenticated using (public.is_admin()) with check (public.is_admin());
alter policy decks_teacher_write on public.decks to authenticated
  using (auth.uid() = teacher_id and kind = 'teacher' and public.is_teacher())
  with check (auth.uid() = teacher_id and kind = 'teacher' and public.is_teacher());

-- ---------- ensure_user_decks: dono, admin ou professora com vínculo ativo ----------
create or replace function public.ensure_user_decks(p_owner_id uuid, p_language_app_key text)
returns table(root_deck_id bigint, personal_root_deck_id bigint)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_root_id bigint;
  v_personal_root_id bigint;
  v_language_label text;
begin
  if p_language_app_key not in ('frances', 'mandarim', 'portugues') then
    raise exception 'Idioma inválido: %', p_language_app_key;
  end if;
  if auth.uid() is distinct from p_owner_id
     and not public.is_admin()
     and not (public.is_teacher() and public.teacher_link_is_active(auth.uid(), p_owner_id, p_language_app_key)) then
    raise exception 'not_authorized';
  end if;

  v_language_label := case p_language_app_key
    when 'frances' then 'Francês'
    when 'mandarim' then 'Mandarim'
    when 'portugues' then 'Português'
    else p_language_app_key
  end;

  select id into v_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
  if v_root_id is null then
    insert into public.decks (owner_id, kind, name, language_app_key)
    values (p_owner_id, 'root', v_language_label, p_language_app_key)
    on conflict do nothing
    returning id into v_root_id;
    if v_root_id is null then
      select id into v_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
    end if;
  end if;

  select id into v_personal_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
  if v_personal_root_id is null then
    insert into public.decks (owner_id, parent_deck_id, kind, name, language_app_key)
    values (p_owner_id, v_root_id, 'personal_root', 'Meus Decks', p_language_app_key)
    on conflict do nothing
    returning id into v_personal_root_id;
    if v_personal_root_id is null then
      select id into v_personal_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
    end if;
  end if;

  return query select v_root_id, v_personal_root_id;
end;
$function$;

-- ---------- Proteção de plan_tier/role (063/066) com is_admin() ----------
create or replace function public.profiles_protect_plan_role()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (new.plan_tier is distinct from old.plan_tier or new.role is distinct from old.role)
     and current_user in ('anon','authenticated','authenticator') then
    if current_user = 'anon' or not public.is_admin() then
      raise exception 'plan_role_protected' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function public.profiles_protect_plan_role_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (new.role is distinct from 'user' or new.plan_tier is distinct from 'free')
     and current_user in ('anon','authenticated','authenticator') then
    if current_user = 'anon' or not public.is_admin() then
      raise exception 'plan_role_protected' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
commit;
