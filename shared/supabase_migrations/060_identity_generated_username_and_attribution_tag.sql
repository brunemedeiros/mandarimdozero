-- Identity / Attribution (CLAUDE.md, docs/identidade-username-tag-auditoria.md Parte IV).
-- NÃO APLICADA em produção por esta entrega -- criada e testada só em Postgres
-- local. A 059 (métricas da professora) continua pendente e independente desta.
--
-- Modelo de identidade:
--   user_id      -> identidade técnica permanente (profiles.user_id, PK, FK auth.users)
--   username     -> identificador público GERADO pelo sistema, permanente e imutável
--   display_name -> apresentação, editável
--
-- Esta migration NÃO altera nenhuma linha existente de profiles (nenhum username
-- é reescrito, nenhum backfill). Os 26 usernames atuais passam a ser
-- permanentes como estão. As contas ainda sem profile recebem o username no
-- momento do primeiro profile (RPC ensure_my_profile / trigger de INSERT).
--
-- Escopo: (1) username gerado no INSERT; (2) username e user_id imutáveis no
-- servidor, para qualquer papel; (3) RPC atômica de criação de profile;
-- (4) Tag de sistema `criado-por-*` protegida no servidor; (5) RPC de cópia
-- atribuída (copy_public_flashcard); (6) rename/delete de tag recusam o prefixo.
-- Reversão: ver bloco ROLLBACK no fim do arquivo.

-- ---------------------------------------------------------------------------
-- 1. Geração do username (sem nome, e-mail ou display_name; sem separadores,
--    então a Tag criado-por-<username> é literalmente igual ao username)
-- ---------------------------------------------------------------------------
create or replace function public.generate_public_username()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v text;
  n int := 0;
begin
  loop
    -- 'u' + 10 hex de um UUID v4 aleatório (independente de user_id/e-mail/nome).
    v := 'u' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    exit when not exists (select 1 from public.profiles where username = v);
    n := n + 1;
    if n >= 20 then
      raise exception 'username_generation_exhausted' using errcode = '53000';
    end if;
  end loop;
  return v;
end;
$$;

-- Todo INSERT em profiles recebe um username gerado: o valor enviado pelo
-- cliente (ou por qualquer papel) é descartado. Não há caminho de escolha.
create or replace function public.profiles_assign_username()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.username := public.generate_public_username();
  return new;
end;
$$;

drop trigger if exists profiles_assign_username_trigger on public.profiles;
create trigger profiles_assign_username_trigger
  before insert on public.profiles
  for each row execute function public.profiles_assign_username();

-- ---------------------------------------------------------------------------
-- 2. Imutabilidade de username e user_id (todos os papéis, inclusive service_role).
--    Manutenção excepcional: ALTER TABLE ... DISABLE TRIGGER explícito por um
--    superusuário; não existe via de aplicação.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_protect_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'username_immutable' using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_identity_trigger on public.profiles;
create trigger profiles_protect_identity_trigger
  before update on public.profiles
  for each row execute function public.profiles_protect_identity();

-- ---------------------------------------------------------------------------
-- 3. Criação atômica do profile da conta logada (substitui o INSERT com
--    sufixo numérico do cliente). Idempotente e segura contra concorrência.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.profiles;
  v_name text;
  tries int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into r from public.profiles where user_id = v_uid;
  if found then
    return r;
  end if;
  -- display_name inicial (apresentação, editável) vem do metadado de login,
  -- nunca alimenta o username.
  v_name := nullif(left(btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', '')), 60), '');
  loop
    begin
      insert into public.profiles (user_id, display_name)
      values (v_uid, v_name)
      returning * into r;
      return r;
    exception when unique_violation then
      -- outra requisição da MESMA conta criou o profile primeiro, ou o username
      -- sorteado colidiu (o trigger sorteia outro na próxima volta).
      select * into r from public.profiles where user_id = v_uid;
      if found then
        return r;
      end if;
      tries := tries + 1;
      if tries >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Tag de sistema `criado-por-*` (AT §10.3) protegida no servidor
-- ---------------------------------------------------------------------------
create or replace function public.is_attribution_tag(p_tag text)
returns boolean
language sql
immutable
as $$
  select p_tag is not null
     and (lower(btrim(p_tag)) = 'criado-por' or lower(btrim(p_tag)) like 'criado-por-%');
$$;

-- Representação textual da atribuição a partir do username (imutável). A
-- identidade real continua sendo user_id; esta função só gera o texto.
create or replace function public.attribution_tag_for_username(p_username text)
returns text
language plpgsql
immutable
as $$
declare
  v text := trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_username, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));
begin
  if v = '' then
    raise exception 'username_without_identity' using errcode = '22023';
  end if;
  return 'criado-por-' || v;
end;
$$;

-- Guarda de tags em own_flashcards e teacher_flashcards:
--  * toda tag precisa ser canônica (fecha variantes 'Criado-Por-x', acentos etc.);
--  * o conjunto de tags de sistema não pode mudar (criar, renomear, apagar)
--    para os papéis de API (anon/authenticated/service_role/authenticator).
-- Funções SECURITY DEFINER do banco (dono = papel de migração) e SQL de
-- manutenção não são papéis de API e podem emitir a atribuição.
create or replace function public.note_tags_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_new text[];
  v_old text[];
  v_api boolean := current_user in ('anon', 'authenticated', 'service_role', 'authenticator');
begin
  if exists (select 1 from unnest(coalesce(new.tags, '{}'::text[])) t where not public.note_tag_is_canonical(t)) then
    raise exception 'invalid_tag' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct t order by t), '{}'::text[]) into v_new
    from unnest(coalesce(new.tags, '{}'::text[])) t where public.is_attribution_tag(t);
  if tg_op = 'INSERT' then
    v_old := '{}'::text[];
  else
    select coalesce(array_agg(distinct t order by t), '{}'::text[]) into v_old
      from unnest(coalesce(old.tags, '{}'::text[])) t where public.is_attribution_tag(t);
  end if;
  if v_api and v_new is distinct from v_old then
    raise exception 'system_tag_protected' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists own_flashcards_note_tags_guard on public.own_flashcards;
create trigger own_flashcards_note_tags_guard
  before insert or update of tags on public.own_flashcards
  for each row execute function public.note_tags_guard();

drop trigger if exists teacher_flashcards_note_tags_guard on public.teacher_flashcards;
create trigger teacher_flashcards_note_tags_guard
  before insert or update of tags on public.teacher_flashcards
  for each row execute function public.note_tags_guard();

-- rename/delete (057): recusam o prefixo reservado de forma explícita e antes
-- de qualquer UPDATE (nem origem nem destino; sem merge sobre a atribuição).
create or replace function public.rename_note_tag(p_scope text, p_old text, p_new text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_merged bigint := 0;
  v_affected bigint := 0;
begin
  if p_scope not in ('own', 'teacher') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if not note_tag_is_canonical(p_old) or not note_tag_is_canonical(p_new) then
    raise exception 'invalid_tag' using errcode = '22023';
  end if;
  if is_attribution_tag(p_old) or is_attribution_tag(p_new) then
    raise exception 'system_tag_protected' using errcode = '42501';
  end if;
  if p_old = p_new then
    return jsonb_build_object('affected', 0, 'merged', 0, 'unchanged', true);
  end if;

  if p_scope = 'own' then
    select count(*) into v_merged from own_flashcards
      where owner_id = auth.uid() and tags @> array[p_old, p_new];
    update own_flashcards o
       set tags = coalesce((
             select array_agg(d.t order by d.first_pos)
             from (
               select s.t, min(s.pos) as first_pos
               from (select case when x = p_old then p_new else x end as t, pos
                     from unnest(o.tags) with ordinality as u(x, pos)) s
               group by s.t
             ) d), '{}'::text[])
     where o.owner_id = auth.uid() and o.tags @> array[p_old];
    get diagnostics v_affected = row_count;
  else
    select count(*) into v_merged from teacher_flashcards
      where teacher_id = auth.uid() and tags @> array[p_old, p_new];
    update teacher_flashcards f
       set tags = coalesce((
             select array_agg(d.t order by d.first_pos)
             from (
               select s.t, min(s.pos) as first_pos
               from (select case when x = p_old then p_new else x end as t, pos
                     from unnest(f.tags) with ordinality as u(x, pos)) s
               group by s.t
             ) d), '{}'::text[])
     where f.teacher_id = auth.uid() and f.tags @> array[p_old];
    get diagnostics v_affected = row_count;
  end if;

  return jsonb_build_object('affected', v_affected, 'merged', v_merged, 'unchanged', false);
end;
$$;

create or replace function public.delete_note_tag(p_scope text, p_tag text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_affected bigint := 0;
begin
  if p_scope not in ('own', 'teacher') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if not note_tag_is_canonical(p_tag) then
    raise exception 'invalid_tag' using errcode = '22023';
  end if;
  if is_attribution_tag(p_tag) then
    raise exception 'system_tag_protected' using errcode = '42501';
  end if;

  if p_scope = 'own' then
    update own_flashcards
       set tags = array_remove(tags, p_tag)
     where owner_id = auth.uid() and tags @> array[p_tag];
  else
    update teacher_flashcards
       set tags = array_remove(tags, p_tag)
     where teacher_id = auth.uid() and tags @> array[p_tag];
  end if;
  get diagnostics v_affected = row_count;
  return jsonb_build_object('affected', v_affected);
end;
$$;

revoke all on function public.rename_note_tag(text, text, text) from public, anon;
revoke all on function public.delete_note_tag(text, text) from public, anon;
grant execute on function public.rename_note_tag(text, text, text) to authenticated;
grant execute on function public.delete_note_tag(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Cópia atribuída de um cartão público (escopo mínimo: o fluxo "adicionar aos
--    meus cartões" do perfil público que já existe; NÃO é Public Deck).
--    * o conteúdo vem do servidor: o payload do cliente só é aceito se o texto de
--      cada Field for exatamente o texto publicado pelo autor (sem fabricar
--      conteúdo sob o nome de outra pessoa);
--    * a autoria é derivada de user_id (dono da linha-fonte), não do texto de tag
--      enviado pelo cliente; se a fonte já carrega atribuição (cópia de cópia),
--      mantém SOMENTE essa, sem adicionar outra;
--    * a cópia é independente (sem referência à fonte, sem live link).
-- ---------------------------------------------------------------------------
create or replace function public.copy_public_flashcard(
  p_source_id bigint,
  p_language_app_key text,
  p_columns jsonb,
  p_deck_id bigint default null
)
returns public.own_flashcards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s public.own_flashcards;
  v_owner_username text;
  v_attr text;
  v_tags text[];
  v_texts text[];
  v_n int;
  r public.own_flashcards;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select f.* into s
    from public.own_flashcards f
    join public.profiles p on p.user_id = f.owner_id
   where f.id = p_source_id
     and f.status = 'active'
     and f.hidden_from_profile = false
     and p.public_profile = true;
  if not found then
    raise exception 'source_not_available' using errcode = 'P0002';
  end if;
  if s.language_app_key is distinct from p_language_app_key then
    raise exception 'invalid_copy_payload' using errcode = '22023';
  end if;

  -- payload: Note normal, 2 Fields (ou 3 com pinyin), sem mídia, texto idêntico ao publicado
  if p_columns is null
     or p_columns ->> 'card_generation_mode' is distinct from 'normal'
     or jsonb_typeof(p_columns -> 'fields') <> 'array' then
    raise exception 'invalid_copy_payload' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_columns -> 'fields');
  if v_n not in (2, 3) then
    raise exception 'invalid_copy_payload' using errcode = '22023';
  end if;
  if exists (
       select 1 from jsonb_array_elements(p_columns -> 'fields') e
        where jsonb_typeof(e -> 'id') <> 'string'
           or (e ->> 'audio') is not null and e ->> 'audio' <> 'null'
           or (e ->> 'image') is not null and e ->> 'image' <> 'null'
     ) then
    raise exception 'invalid_copy_payload' using errcode = '22023';
  end if;
  select array_agg(coalesce(e -> 'content' ->> 'value', '') order by coalesce(e -> 'content' ->> 'value', ''))
    into v_texts from jsonb_array_elements(p_columns -> 'fields') e;
  if v_n = 2 then
    if v_texts is distinct from (select array_agg(x order by x) from unnest(array[coalesce(s.front, ''), coalesce(s.back_trans, '')]) x) then
      raise exception 'invalid_copy_payload' using errcode = '22023';
    end if;
  else
    if s.front_pinyin is null or v_texts is distinct from (select array_agg(x order by x) from unnest(array[coalesce(s.front, ''), coalesce(s.back_trans, ''), s.front_pinyin]) x) then
      raise exception 'invalid_copy_payload' using errcode = '22023';
    end if;
  end if;

  -- atribuição: autor original (user_id da fonte), nunca parsing de tag
  select t into v_attr
    from unnest(s.tags) with ordinality u(t, n)
   where public.is_attribution_tag(t)
   order by n limit 1;
  if v_attr is null and s.owner_id <> v_uid then
    select username into v_owner_username from public.profiles where user_id = s.owner_id;
    v_attr := public.attribution_tag_for_username(v_owner_username);
  end if;

  select coalesce(array_agg(t order by n), '{}'::text[]) into v_tags
    from (select t, n from unnest(s.tags) with ordinality u(t, n)
           where not public.is_attribution_tag(t) order by n limit 19) q;
  if v_attr is not null then
    v_tags := v_tags || v_attr;
  end if;

  insert into public.own_flashcards
    (owner_id, language_app_key, fields, card_generation_mode, note, tags,
     front, back_trans, front_pinyin, choices, cloze_sentence, cloze_answer, cloze_answer_pinyin,
     front_is_target_language, deck_id, status, revision)
  values
    (v_uid, s.language_app_key, p_columns -> 'fields', 'normal', s.note, v_tags,
     s.front, coalesce(s.back_trans, '(sem tradução)'), null, null, null, null, null,
     coalesce((p_columns ->> 'front_is_target_language')::boolean, true), p_deck_id, 'active', 0)
  returning * into r;
  return r;
end;
$$;

revoke all on function public.copy_public_flashcard(bigint, text, jsonb, bigint) from public, anon;
grant execute on function public.copy_public_flashcard(bigint, text, jsonb, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Um identificador por conta, para sempre: o profile de uma conta que ainda
-- existe em auth.users NÃO pode ser apagado (apagar + recriar geraria um
-- SEGUNDO username para o mesmo user_id). A exclusão da conta (cascata de
-- auth.users) continua liberando o profile. Hoje já não há policy de DELETE
-- (a RLS barra authenticated); isto fecha também service_role/SQL direto.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_protect_delete()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'profile_delete_forbidden' using errcode = '42501';
  end if;
  return old;
end $$;
revoke all on function public.profiles_protect_delete() from public, anon, authenticated;
drop trigger if exists profiles_protect_delete_trigger on public.profiles;
create trigger profiles_protect_delete_trigger before delete on public.profiles
  for each row execute function public.profiles_protect_delete();

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, se necessário):
--   drop trigger profiles_assign_username_trigger on public.profiles;
--   drop trigger profiles_protect_identity_trigger on public.profiles;
--   drop trigger profiles_protect_delete_trigger on public.profiles; drop function public.profiles_protect_delete();
--   drop trigger own_flashcards_note_tags_guard on public.own_flashcards;
--   drop trigger teacher_flashcards_note_tags_guard on public.teacher_flashcards;
--   drop function public.copy_public_flashcard(bigint, text, jsonb, bigint);
--   drop function public.ensure_my_profile();
--   drop function public.note_tags_guard(), public.profiles_assign_username(), public.profiles_protect_identity(),
--                 public.generate_public_username(), public.attribution_tag_for_username(text), public.is_attribution_tag(text);
--   e reaplicar rename_note_tag / delete_note_tag de 057_note_tag_management_rpcs.sql.
-- ---------------------------------------------------------------------------
