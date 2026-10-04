-- ============================================================================
-- 061 -- Public Deck (P1 banco/contrato de dados + P2 RPCs)  [LOCAL, NÃO APLICADA]
-- ----------------------------------------------------------------------------
-- Decisões aprovadas (ver docs/public-decks-contrato-tecnico.md, v6):
--  * Public Deck NÃO é uma entidade nova: continua sendo `decks` (kind='personal').
--  * Publicar é ato explícito POR Deck (sem herança da subtree).
--  * Identidade da URL: `public_id` (uuid), gerado no 1º publish, estável, UNIQUE.
--    NÃO é mecanismo de autorização: todas as RPCs revalidam dono/kind/is_public/perfil.
--  * `public_profile=false` esconde o Deck (lista e URL direta) sem apagar `is_public`.
--  * Anônimo e Free veem só metadado; abrir o conteúdo e copiar = Premium (ou o dono).
--  * Conteúdo público = Note NATIVA (fields + card_generation_mode + tags). Nunca o
--    espelho Legacy; Legacy só aparece se mapeável com segurança (public_note_native).
--  * `note` (campo livre do dono) NUNCA é público nem é copiado.
--  * Cópia independente, sem live link, atribuição `criado-por-[username]` derivada
--    de user_id (mesma regra única de copy_public_flashcard: note_attribution_tag).
--  * "Última atualização" = alterações de conteúdo/estrutura (nunca FSRS/revisão).
--  * Reports: reutiliza `reports.context` (jsonb); nenhuma tabela nova.
-- Aditiva; sem backfill destrutivo; não remove coluna Legacy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas aditivas em decks
-- ---------------------------------------------------------------------------
alter table public.decks add column if not exists public_id uuid;
alter table public.decks add column if not exists public_description text;
alter table public.decks add column if not exists public_icon text;
alter table public.decks add column if not exists public_color text;
alter table public.decks add column if not exists published_at timestamptz;
alter table public.decks add column if not exists content_updated_at timestamptz not null default now();

create unique index if not exists decks_public_id_key on public.decks (public_id) where public_id is not null;
create index if not exists decks_owner_public_idx on public.decks (owner_id) where is_public;

-- Dado inválido pré-existente (a lacuna de personal_root): corrige antes de impor a regra.
update public.decks set is_public = false where is_public and kind <> 'personal';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'decks_public_only_personal') then
    alter table public.decks add constraint decks_public_only_personal check (not is_public or kind = 'personal');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decks_public_requires_id') then
    alter table public.decks add constraint decks_public_requires_id
      check (not is_public or (public_id is not null and published_at is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decks_public_description_len') then
    alter table public.decks add constraint decks_public_description_len
      check (public_description is null or char_length(public_description) <= 280);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decks_public_icon_list') then
    alter table public.decks add constraint decks_public_icon_list
      check (public_icon is null or public_icon in
        ('book','chat','globe','star','food','travel','work','school','music','heart','pencil','lightbulb'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decks_public_color_list') then
    alter table public.decks add constraint decks_public_color_list
      check (public_color is null or public_color in
        ('red','orange','gold','green','teal','blue','purple','pink','gray'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Guarda: campos de publicação só por RPC; public_id imutável; content_updated_at
--    não forjável. Papéis de API (anon/authenticated/service_role/authenticator)
--    NÃO escrevem esses campos direto; as RPCs SECURITY DEFINER (dono = papel de
--    migração) e o SQL de manutenção podem.
-- ---------------------------------------------------------------------------
create or replace function public.decks_public_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_api boolean := current_user in ('anon', 'authenticated', 'service_role', 'authenticator');
begin
  if new.is_public and new.kind <> 'personal' then
    raise exception 'public_deck_kind_forbidden' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' then
    if old.public_id is not null and new.public_id is distinct from old.public_id then
      raise exception 'public_id_immutable' using errcode = '42501';
    end if;
    if v_api then
      if new.is_public is distinct from old.is_public
         or new.public_id is distinct from old.public_id
         or new.published_at is distinct from old.published_at
         or new.public_description is distinct from old.public_description
         or new.public_icon is distinct from old.public_icon
         or new.public_color is distinct from old.public_color then
        raise exception 'public_fields_rpc_only' using errcode = '42501';
      end if;
      if new.content_updated_at is distinct from old.content_updated_at then
        raise exception 'content_updated_at_system_only' using errcode = '42501';
      end if;
    end if;
    -- "última atualização": só conteúdo/estrutura/metadado público
    if new.name is distinct from old.name
       or new.parent_deck_id is distinct from old.parent_deck_id
       or new.is_public is distinct from old.is_public
       or new.public_description is distinct from old.public_description
       or new.public_icon is distinct from old.public_icon
       or new.public_color is distinct from old.public_color then
      new.content_updated_at := now();
    end if;
  else
    if v_api and (new.is_public or new.public_id is not null or new.published_at is not null
                  or new.public_description is not null or new.public_icon is not null
                  or new.public_color is not null) then
      raise exception 'public_fields_rpc_only' using errcode = '42501';
    end if;
    if v_api then
      new.content_updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists decks_public_guard_trigger on public.decks;
create trigger decks_public_guard_trigger
  before insert or update on public.decks
  for each row execute function public.decks_public_guard();

-- subdeck criado/movido/removido altera a estrutura do Deck pai
create or replace function public.decks_touch_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.parent_deck_id is not null then
    update public.decks set content_updated_at = now() where id = new.parent_deck_id;
  elsif tg_op = 'DELETE' and old.parent_deck_id is not null then
    update public.decks set content_updated_at = now() where id = old.parent_deck_id;
  elsif tg_op = 'UPDATE' and new.parent_deck_id is distinct from old.parent_deck_id then
    update public.decks set content_updated_at = now()
     where id in (coalesce(old.parent_deck_id, -1), coalesce(new.parent_deck_id, -1));
  end if;
  return null;
end;
$$;

drop trigger if exists decks_touch_parent_trigger on public.decks;
create trigger decks_touch_parent_trigger
  after insert or update of parent_deck_id or delete on public.decks
  for each row execute function public.decks_touch_parent();

-- ---------------------------------------------------------------------------
-- 3. own_flashcards.updated_at (conteúdo da Note) + toque no Deck de origem/destino
-- ---------------------------------------------------------------------------
alter table public.own_flashcards add column if not exists updated_at timestamptz;
update public.own_flashcards set updated_at = created_at where updated_at is null;
alter table public.own_flashcards alter column updated_at set default now();
alter table public.own_flashcards alter column updated_at set not null;

-- Ignora: updated_at, note (campo privado) e hidden_from_profile (legado). FSRS/revisão
-- nem vivem nesta tabela (ficam em `progress`), então nunca contam.
create or replace function public.own_flashcards_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'updated_at' - 'note' - 'hidden_from_profile')
     is distinct from (to_jsonb(old) - 'updated_at' - 'note' - 'hidden_from_profile') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists own_flashcards_touch_updated_at_trigger on public.own_flashcards;
create trigger own_flashcards_touch_updated_at_trigger
  before update on public.own_flashcards
  for each row execute function public.own_flashcards_touch_updated_at();

create or replace function public.own_flashcards_touch_deck()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.deck_id is not null then
      update public.decks set content_updated_at = now() where id = new.deck_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.deck_id is not null then
      update public.decks set content_updated_at = now() where id = old.deck_id;
    end if;
  elsif new.updated_at is distinct from old.updated_at then
    update public.decks set content_updated_at = now()
     where id in (coalesce(old.deck_id, -1), coalesce(new.deck_id, -1));
  end if;
  return null;
end;
$$;

drop trigger if exists own_flashcards_touch_deck_trigger on public.own_flashcards;
create trigger own_flashcards_touch_deck_trigger
  after insert or update or delete on public.own_flashcards
  for each row execute function public.own_flashcards_touch_deck();

-- ---------------------------------------------------------------------------
-- 4. Regra única de atribuição (reutilizada por copy_public_flashcard e copy_public_deck)
-- ---------------------------------------------------------------------------
create or replace function public.note_attribution_tag(p_src_tags text[], p_src_owner uuid, p_copier uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_attr text;
  v_username text;
begin
  -- cópia de cópia: mantém SOMENTE a atribuição original já presente na fonte
  select t into v_attr
    from unnest(coalesce(p_src_tags, '{}'::text[])) with ordinality u(t, n)
   where public.is_attribution_tag(t)
   order by n limit 1;
  if v_attr is null and p_src_owner is distinct from p_copier then
    select username into v_username from public.profiles where user_id = p_src_owner;
    v_attr := public.attribution_tag_for_username(v_username);
  end if;
  return v_attr;
end;
$$;

-- tags comuns (sem atribuição) + a atribuição, respeitando o limite de 20 por Note
create or replace function public.note_copy_tags(p_src_tags text[], p_attr text)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_tags text[];
begin
  select coalesce(array_agg(t order by n), '{}'::text[]) into v_tags
    from (select t, n from unnest(coalesce(p_src_tags, '{}'::text[])) with ordinality u(t, n)
           where not public.is_attribution_tag(t) order by n limit 19) q;
  if p_attr is not null then
    v_tags := v_tags || p_attr;
  end if;
  return v_tags;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Representação NATIVA pública de uma Note (nunca o espelho Legacy cru)
--    * Note nativa: devolve fields/mode, sem storagePath/generationKey.
--    * Note Legacy: mapeamento espelho EXATO de nativeNoteEditorStateFromLegacyRow
--      (shared/flashcard-native-persistence.js), com paridade testada. Se não for
--      mapeável com segurança → NULL (incompatível: não publicar, não alterar).
-- ---------------------------------------------------------------------------
create or replace function public.public_note_native(r public.own_flashcards)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_study text := case r.language_app_key when 'frances' then 'fr' when 'mandarim' then 'zh' else null end;
  v_zh boolean := r.language_app_key = 'mandarim';
  v_front_target boolean := coalesce(r.front_is_target_language, true);
  v_fields jsonb;
  v_pos int;
  v_i int;
  v_front text := coalesce(r.front, '');
  v_back text := coalesce(r.back_trans, '');
  v_mark text;
  v_blank_count int;
  v_lang_a text;
  v_lang_b text;
  v_choices jsonb := coalesce(r.choices, '[]'::jsonb);
  el jsonb;
  v_aud jsonb := case when coalesce(r.audio_url, '') <> '' then jsonb_build_object('type','upload','url',r.audio_url) end;
  v_img jsonb := case when coalesce(r.image_url, '') <> '' then jsonb_build_object('url',r.image_url) end;
begin
  if r.fields is not null and r.card_generation_mode is not null then
    if jsonb_typeof(r.fields) <> 'array' or jsonb_array_length(r.fields) = 0 then
      return null;
    end if;
    select jsonb_agg(
             case when jsonb_typeof(e -> 'audio') = 'object'
                  then jsonb_set(e, '{audio}', (e -> 'audio') - 'storagePath' - 'generationKey')
                  else e end
             order by ord)
      into v_fields
      from jsonb_array_elements(r.fields) with ordinality t(e, ord);
    return jsonb_build_object('mode', r.card_generation_mode, 'fields', v_fields);
  end if;

  -- ---- Legacy ----
  if coalesce(r.cloze_sentence, '') <> '' then
    v_blank_count := (char_length(r.cloze_sentence) - char_length(replace(r.cloze_sentence, '___', ''))) / 3;
    if v_blank_count <> 1 or btrim(coalesce(r.cloze_answer, '')) = '' then
      return null;
    end if;
    v_pos := position('___' in r.cloze_sentence);
    v_mark := '{{c1::' || r.cloze_answer
              || case when v_zh and coalesce(r.cloze_answer_pinyin, '') <> '' then '|' || r.cloze_answer_pinyin else '' end
              || '}}';
    v_fields := jsonb_build_array(
      jsonb_build_object('id','f1','lang', case when v_zh then 'zh' else v_study end, 'role', null,
        'content', jsonb_build_object('value', substr(r.cloze_sentence, 1, v_pos - 1) || v_mark || substr(r.cloze_sentence, v_pos + 3)),
        'audio', null, 'image', null, 'pinyinFieldId', null),
      jsonb_build_object('id','f2','lang','pt-BR','role', null,
        'content', jsonb_build_object('value', v_back), 'audio', null, 'image', null, 'pinyinFieldId', null));
    if v_study is not null then
      v_fields := jsonb_set(v_fields, '{0,audio}', coalesce(v_aud, 'null'::jsonb));
      v_fields := jsonb_set(v_fields, '{0,image}', coalesce(v_img, 'null'::jsonb));
    elsif v_aud is not null or v_img is not null then
      return null;   -- mídia sem Field de destino seguro: incompatível (nunca publicar parcial)
    end if;
    if btrim(v_back) = '' then return null; end if;
    return jsonb_build_object('mode', 'cloze', 'fields', v_fields);
  end if;

  if jsonb_typeof(v_choices) = 'array' and jsonb_array_length(v_choices) > 0 then
    if btrim(v_back) = '' or btrim(v_front) = '' then return null; end if;
    v_lang_a := case when v_zh then 'zh' when v_front_target then v_study else 'pt-BR' end;
    v_lang_b := case when v_zh then 'pt-BR' when v_front_target then 'pt-BR' else v_study end;
    v_fields := jsonb_build_array(
      jsonb_build_object('id','f1','lang',v_lang_a,'role','prompt','content',jsonb_build_object('value',v_front),
                         'audio',null,'image',null,'pinyinFieldId',null),
      jsonb_build_object('id','f2','lang',v_lang_b,'role','answer','content',jsonb_build_object('value',v_back),
                         'audio',null,'image',null,'pinyinFieldId',null));
    v_i := 0;
    for el in select * from jsonb_array_elements(v_choices) limit 3 loop
      v_i := v_i + 1;
      v_fields := v_fields || jsonb_build_array(jsonb_build_object('id','f'||(v_i+2),'lang',null,'role','distractor',
        'content',jsonb_build_object('value', coalesce(el #>> '{}', '')),'audio',null,'image',null,'pinyinFieldId',null));
    end loop;
    if v_zh and coalesce(r.front_pinyin, '') <> '' then
      v_fields := jsonb_set(v_fields, '{0,pinyinFieldId}', '"fp"');
      v_fields := (select jsonb_agg(x order by ord) from (
        select x, ord from jsonb_array_elements(v_fields) with ordinality t(x, ord) where ord = 1
        union all select jsonb_build_object('id','fp','lang','zh-pinyin','role',null,'content',jsonb_build_object('value',r.front_pinyin),
                                            'audio',null,'image',null,'pinyinFieldId',null), 1.5
        union all select x, ord from jsonb_array_elements(v_fields) with ordinality t(x, ord) where ord > 1) q);
    end if;
    if v_study is not null then
      select ord - 1 into v_pos from jsonb_array_elements(v_fields) with ordinality t(x, ord)
       where x ->> 'lang' = v_study limit 1;
      if v_pos is not null then
        v_fields := jsonb_set(v_fields, array[v_pos::text, 'audio'], coalesce(v_aud, 'null'::jsonb));
        v_fields := jsonb_set(v_fields, array[v_pos::text, 'image'], coalesce(v_img, 'null'::jsonb));
      elsif v_aud is not null or v_img is not null then
        return null;
      end if;
    elsif v_aud is not null or v_img is not null then
      return null;
    end if;
    return jsonb_build_object('mode', 'multiple_choice', 'fields', v_fields);
  end if;

  -- normal
  if btrim(v_front) = '' or btrim(v_back) = '' then return null; end if;
  if v_zh then
    v_lang_a := 'zh'; v_lang_b := 'pt-BR';
  else
    v_lang_a := case when v_front_target then v_study else 'pt-BR' end;
    v_lang_b := case when v_front_target then 'pt-BR' else v_study end;
  end if;
  v_fields := jsonb_build_array(
    jsonb_build_object('id','f1','lang',v_lang_a,'role',null,'content',jsonb_build_object('value',v_front),
                       'audio',null,'image',null,
                       'pinyinFieldId', case when v_zh and coalesce(r.front_pinyin,'') <> '' then 'fp' else null end));
  if v_zh and coalesce(r.front_pinyin, '') <> '' then
    v_fields := v_fields || jsonb_build_array(jsonb_build_object('id','fp','lang','zh-pinyin','role',null,
      'content',jsonb_build_object('value',r.front_pinyin),'audio',null,'image',null,'pinyinFieldId',null));
  end if;
  v_fields := v_fields || jsonb_build_array(jsonb_build_object('id','f2','lang',v_lang_b,'role',null,
    'content',jsonb_build_object('value',v_back),'audio',null,'image',null,'pinyinFieldId',null));
  if v_study is not null then
    select ord - 1 into v_pos from jsonb_array_elements(v_fields) with ordinality t(x, ord)
     where x ->> 'lang' = v_study limit 1;
    if v_pos is not null then
      v_fields := jsonb_set(v_fields, array[v_pos::text, 'audio'], coalesce(v_aud, 'null'::jsonb));
      v_fields := jsonb_set(v_fields, array[v_pos::text, 'image'], coalesce(v_img, 'null'::jsonb));
    elsif v_aud is not null or v_img is not null then
      return null;
    end if;
  elsif v_aud is not null or v_img is not null then
    return null;
  end if;
  return jsonb_build_object('mode', 'normal', 'fields', v_fields);
end;
$$;
revoke all on function public.public_note_native(public.own_flashcards) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5b. Mídia da cópia e limites TÉCNICOS
--
--  LIMITES (NÃO são regra de produto, nada têm a ver com o limite Free de 20
--  CardInstances): guardas técnicas de tamanho/tempo de uma única operação de
--  cópia. 2000 foi escolhido de forma conservadora: o benchmark local (Postgres)
--  copia 2000 Notes em ~1 s numa transação, então o banco NÃO é o gargalo; o que
--  motiva o teto é (a) a resposta/memória de uma única transação e (b) o número de
--  objetos que o CLIENTE precisa duplicar no Storage antes da RPC (um por mídia).
--  Configuráveis sem migration:
--    alter database postgres set app.public_deck_copy_max_notes = '3000';
--    alter database postgres set app.public_deck_copy_max_media = '3000';
-- ---------------------------------------------------------------------------
create or replace function public.public_deck_copy_max_notes() returns int
language sql stable set search_path = public as $$
  select coalesce(nullif(current_setting('app.public_deck_copy_max_notes', true), '')::int, 2000)
$$;
create or replace function public.public_deck_copy_max_media() returns int
language sql stable set search_path = public as $$
  select coalesce(nullif(current_setting('app.public_deck_copy_max_media', true), '')::int, 2000)
$$;

-- Caminho do objeto no bucket flashcard-media a partir da URL pública; NULL se a URL
-- não é de um objeto do nosso bucket (link externo, outro bucket, etc.).
create or replace function public.flashcard_media_path(p_url text) returns text
language sql immutable set search_path = public as $$
  select case when p_url ~ '^https?://[^/?#]+/storage/v1/object/public/flashcard-media/[^?#]+$'
               and p_url !~ '\.\.'
              then substring(p_url from '/storage/v1/object/public/flashcard-media/([^?#]+)$') end
$$;

-- URLs (do nosso bucket) referenciadas pelos Fields de uma Note nativa.
create or replace function public.native_fields_media_urls(p_fields jsonb) returns setof text
language sql immutable set search_path = public as $$
  select distinct u from (
    select e #>> '{audio,url}' as u from jsonb_array_elements(p_fields) e where jsonb_typeof(e -> 'audio') = 'object'
    union all
    select e #>> '{audio,generatedUrl}' from jsonb_array_elements(p_fields) e where jsonb_typeof(e -> 'audio') = 'object'
    union all
    select e #>> '{image,url}' from jsonb_array_elements(p_fields) e where jsonb_typeof(e -> 'image') = 'object'
  ) q where u is not null and public.flashcard_media_path(u) is not null
$$;

-- Reescreve as URLs do nosso bucket de um objeto de mídia pelo mapa antigo->novo.
-- Mapa incompleto = erro (nunca deixa a cópia apontar para o arquivo do original).
-- storagePath/generationKey do original nunca sobrevivem.
create or replace function public._remap_media_obj(o jsonb, m jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare k text; v text; res jsonb := o;
begin
  foreach k in array array['url', 'generatedUrl'] loop
    v := o ->> k;
    if v is not null and public.flashcard_media_path(v) is not null then
      if m ->> v is null then
        raise exception 'media_map_incomplete' using errcode = '22023';
      end if;
      res := jsonb_set(res, array[k], to_jsonb(m ->> v));
    end if;
  end loop;
  return res - 'storagePath' - 'generationKey';
end;
$$;

create or replace function public.native_fields_remap_media(p_fields jsonb, p_map jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(
           case when jsonb_typeof(e -> 'audio') = 'object' or jsonb_typeof(e -> 'image') = 'object'
                then e
                     || case when jsonb_typeof(e -> 'audio') = 'object'
                             then jsonb_build_object('audio', public._remap_media_obj(e -> 'audio', p_map)) else '{}'::jsonb end
                     || case when jsonb_typeof(e -> 'image') = 'object'
                             then jsonb_build_object('image', public._remap_media_obj(e -> 'image', p_map)) else '{}'::jsonb end
                else e end
           order by ord), '[]'::jsonb)
    from jsonb_array_elements(p_fields) with ordinality t(e, ord)
$$;

-- O mapa enviado pelo cliente só vale se TODO destino é um objeto REAL do próprio
-- copiador (pasta = auth.uid()) no bucket flashcard-media; nunca de terceiros.
create or replace function public._validate_media_map(p_map jsonb, p_uid uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare k text; v text; vp text;
begin
  if p_map is null or jsonb_typeof(p_map) <> 'object' then
    raise exception 'invalid_media_map' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_map)) > public.public_deck_copy_max_media() then
    raise exception 'deck_media_too_large' using errcode = '54000';
  end if;
  for k, v in select key, value #>> '{}' from jsonb_each(p_map) loop
    vp := public.flashcard_media_path(v);
    if public.flashcard_media_path(k) is null or vp is null
       or split_part(vp, '/', 1) <> p_uid::text
       or k = v
       or not exists (select 1 from storage.objects o where o.bucket_id = 'flashcard-media' and o.name = vp) then
      raise exception 'invalid_media_map' using errcode = '22023';
    end if;
  end loop;
end;
$$;
revoke all on function public._validate_media_map(jsonb, uuid) from public, anon, authenticated;
revoke all on function public._remap_media_obj(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.native_fields_remap_media(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.native_fields_media_urls(jsonb) from public, anon, authenticated;

-- Raiz + subdecks que TAMBÉM são públicos do mesmo dono (sem herança de publicação).
create or replace function public.public_deck_subtree_ids(p_root bigint, p_owner uuid) returns bigint[]
language sql stable security definer set search_path = public as $$
  with recursive t(id) as (
    select p_root
    union
    select c.id from public.decks c join t on c.parent_deck_id = t.id
     where c.is_public and c.kind = 'personal' and c.owner_id = p_owner
  ) select array_agg(id) from t
$$;
revoke all on function public.public_deck_subtree_ids(bigint, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Publicar / despublicar (única porta de escrita dos campos de publicação)
-- ---------------------------------------------------------------------------
create or replace function public.publish_deck(
  p_deck_id bigint,
  p_description text default null,
  p_icon text default null,
  p_color text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  d public.decks;
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_icon text := coalesce(nullif(btrim(p_icon), ''), 'book');
  v_color text := coalesce(nullif(btrim(p_color), ''), 'gray');
  v_profile_public boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into d from public.decks where id = p_deck_id for update;
  if not found or d.owner_id is distinct from v_uid then
    raise exception 'deck_not_found' using errcode = 'P0002';
  end if;
  if d.kind <> 'personal' then
    raise exception 'public_deck_kind_forbidden' using errcode = '22023';
  end if;
  if btrim(d.name) = '' then
    raise exception 'invalid_deck_name' using errcode = '22023';
  end if;
  if v_desc is not null and char_length(v_desc) > 280 then
    raise exception 'description_too_long' using errcode = '22023';
  end if;
  if v_icon not in ('book','chat','globe','star','food','travel','work','school','music','heart','pencil','lightbulb') then
    raise exception 'invalid_icon' using errcode = '22023';
  end if;
  if v_color not in ('red','orange','gold','green','teal','blue','purple','pink','gray') then
    raise exception 'invalid_color' using errcode = '22023';
  end if;

  update public.decks
     set is_public = true,
         public_id = coalesce(public_id, gen_random_uuid()),
         published_at = case when d.is_public then d.published_at else now() end,
         public_description = v_desc,
         public_icon = v_icon,
         public_color = v_color
   where id = d.id
   returning * into d;

  select public_profile into v_profile_public from public.profiles where user_id = v_uid;
  return jsonb_build_object(
    'public_id', d.public_id,
    'published_at', d.published_at,
    'visible_on_profile', coalesce(v_profile_public, false));
end;
$$;

create or replace function public.unpublish_deck(p_deck_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  d public.decks;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into d from public.decks where id = p_deck_id for update;
  if not found or d.owner_id is distinct from v_uid then
    raise exception 'deck_not_found' using errcode = 'P0002';
  end if;
  -- mantém public_id, metadado e published_at (histórico); só retira o acesso
  update public.decks set is_public = false where id = d.id;
  return jsonb_build_object('public_id', d.public_id, 'is_public', false);
end;
$$;

revoke all on function public.publish_deck(bigint, text, text, text) from public, anon;
revoke all on function public.unpublish_deck(bigint) from public, anon;
grant execute on function public.publish_deck(bigint, text, text, text) to authenticated;
grant execute on function public.unpublish_deck(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Leitura pública (anon + authenticated). Resposta uniforme "unavailable".
-- ---------------------------------------------------------------------------
create or replace function public.get_public_deck(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.decks;
  p public.profiles;
  v_uid uuid := auth.uid();
  v_premium boolean := false;
  v_notes int;
  v_subdecks jsonb;
  v_parent jsonb;
begin
  select dk.* into d
    from public.decks dk
    join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then
    return jsonb_build_object('error', 'unavailable');
  end if;
  select * into p from public.profiles where user_id = d.owner_id;

  if v_uid is not null then
    select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
    v_premium := coalesce(v_premium, false);
  end if;

  select count(*) into v_notes
    from public.own_flashcards f
   where f.deck_id = d.id and f.status = 'active' and public.public_note_native(f) is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', c.public_id, 'name', c.name, 'icon', c.public_icon, 'color', c.public_color,
           'notes_count', (select count(*) from public.own_flashcards f
                            where f.deck_id = c.id and f.status = 'active' and public.public_note_native(f) is not null))
           order by c.name), '[]'::jsonb)
    into v_subdecks
    from public.decks c
   where c.parent_deck_id = d.id and c.is_public and c.kind = 'personal' and c.owner_id = d.owner_id;

  select jsonb_build_object('public_id', pd.public_id, 'name', pd.name) into v_parent
    from public.decks pd
   where pd.id = d.parent_deck_id and pd.is_public and pd.kind = 'personal';

  return jsonb_build_object(
    'public_id', d.public_id,
    'name', d.name,
    'description', d.public_description,
    'icon', d.public_icon,
    'color', d.public_color,
    'language', d.language_app_key,
    'published_at', d.published_at,
    'updated_at', d.content_updated_at,
    'notes_count', v_notes,
    'owner', jsonb_build_object('username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url),
    'subdecks', v_subdecks,
    'parent', v_parent,
    'viewer', jsonb_build_object(
      'authenticated', v_uid is not null,
      'premium', v_premium,
      'is_owner', v_uid is not null and v_uid = d.owner_id,
      'can_open', v_uid is not null and (v_premium or v_uid = d.owner_id),
      'can_import', v_uid is not null and v_premium and v_uid <> d.owner_id));
end;
$$;

create or replace function public.get_public_deck_notes(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.decks;
  v_uid uuid := auth.uid();
  v_premium boolean := false;
  v_notes jsonb;
  v_total int;
begin
  select dk.* into d
    from public.decks dk
    join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then
    return jsonb_build_object('error', 'unavailable');
  end if;
  if v_uid is null then
    return jsonb_build_object('error', 'login_required');
  end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not (coalesce(v_premium, false) or v_uid = d.owner_id) then
    return jsonb_build_object('error', 'premium_required');
  end if;

  select count(*) into v_total from public.own_flashcards f
   where f.deck_id = d.id and f.status = 'active' and public.public_note_native(f) is not null;

  -- Somente: idx, mode, fields, tags. Nunca note, status, revision, owner_id, deck_id, id.
  select coalesce(jsonb_agg(jsonb_build_object(
           'idx', q.rn, 'mode', q.nat ->> 'mode', 'fields', q.nat -> 'fields', 'tags', to_jsonb(q.tags))
           order by q.rn), '[]'::jsonb)
    into v_notes
    from (select row_number() over (order by f.created_at, f.id) as rn,
                 public.public_note_native(f) as nat, f.tags
            from public.own_flashcards f
           where f.deck_id = d.id and f.status = 'active') q
   where q.nat is not null and q.rn <= public.public_deck_copy_max_notes();

  return jsonb_build_object('language', d.language_app_key, 'total', v_total, 'notes', v_notes,
                            'truncated', v_total > public.public_deck_copy_max_notes());
end;
$$;

create or replace function public.list_public_decks_for_user(p_username text, p_language_app_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_public boolean;
  v_list jsonb;
begin
  select user_id, public_profile into v_owner, v_public from public.profiles where username = p_username;
  if v_owner is null or not coalesce(v_public, false) then
    return jsonb_build_object('decks', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', d.public_id, 'name', d.name, 'description', d.public_description,
           'icon', d.public_icon, 'color', d.public_color, 'language', d.language_app_key,
           'published_at', d.published_at, 'updated_at', d.content_updated_at,
           'notes_count', (select count(*) from public.own_flashcards f
                            where f.deck_id = d.id and f.status = 'active' and public.public_note_native(f) is not null))
           order by d.published_at desc), '[]'::jsonb)
    into v_list
    from public.decks d
   where d.owner_id = v_owner and d.is_public and d.kind = 'personal'
     and (p_language_app_key is null or d.language_app_key = p_language_app_key);
  return jsonb_build_object('decks', v_list);
end;
$$;

-- relatório PRIVADO do dono: notas incompatíveis (não publicadas) e contagens
create or replace function public.get_public_deck_owner_status(p_deck_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  d public.decks;
  v_inc jsonb;
  v_ok int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into d from public.decks where id = p_deck_id and owner_id = v_uid and kind = 'personal';
  if not found then
    raise exception 'deck_not_found' using errcode = 'P0002';
  end if;
  select count(*) into v_ok from public.own_flashcards f
   where f.deck_id = d.id and f.status = 'active' and public.public_note_native(f) is not null;
  select coalesce(jsonb_agg(jsonb_build_object('note_id', f.id, 'reason', 'not_representable_as_native') order by f.id), '[]'::jsonb)
    into v_inc
    from public.own_flashcards f
   where f.deck_id = d.id and f.status = 'active' and public.public_note_native(f) is null;
  return jsonb_build_object(
    'is_public', d.is_public, 'public_id', d.public_id, 'published_at', d.published_at,
    'description', d.public_description, 'icon', d.public_icon, 'color', d.public_color,
    'notes_count', v_ok, 'incompatible', v_inc, 'updated_at', d.content_updated_at);
end;
$$;

revoke all on function public.get_public_deck(uuid) from public;
revoke all on function public.get_public_deck_notes(uuid) from public;
revoke all on function public.list_public_decks_for_user(text, text) from public;
revoke all on function public.get_public_deck_owner_status(bigint) from public, anon;
grant execute on function public.get_public_deck(uuid) to anon, authenticated;
grant execute on function public.get_public_deck_notes(uuid) to anon, authenticated;
grant execute on function public.list_public_decks_for_user(text, text) to anon, authenticated;
grant execute on function public.get_public_deck_owner_status(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Cópia de Public Deck (Premium). Atômica (uma função = uma transação).
--    Reutiliza a regra única de atribuição. Não copia FSRS, histórico, note,
--    storagePath nem generationKey.
--
--    MÍDIA INDEPENDENTE (P7): a cópia nunca aponta para o arquivo do original.
--    Fluxo (Storage e Postgres não compartilham transação):
--      1. cliente: get_public_deck_media_manifest(public_id)  -> URLs a duplicar
--      2. cliente: storage.copy(origem, '<uid do copiador>/pubcopy-...') por arquivo
--         (com o JWT do próprio copiador; a policy do bucket só deixa criar na
--         própria pasta -- nenhuma permissão ampla é dada ao cliente)
--      3. cliente: copy_public_deck(public_id, destino, p_media_map {urlAntiga: urlNova})
--         -> UMA transação: valida o mapa (destinos reais, na pasta do copiador),
--         copia as Notes reescrevendo toda URL do nosso bucket pelo mapa; mapa
--         incompleto/inválido => erro e NADA é criado.
--      4. falha no passo 2 ou 3: o cliente remove os objetos que ele mesmo criou
--         (compensação). Links externos (audio.type='url') não são do app e
--         permanecem como link.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_deck_media_manifest(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  v_ids bigint[];
  v_items jsonb;
  v_count int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;
  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  select coalesce(jsonb_agg(jsonb_build_object('url', u, 'path', public.flashcard_media_path(u)) order by u), '[]'::jsonb)
    into v_items
    from (select distinct m as u
            from public.own_flashcards f
            cross join lateral public.public_note_native(f) nat
            cross join lateral public.native_fields_media_urls(nat -> 'fields') m
           where f.deck_id = any(v_ids) and f.status = 'active' and nat is not null) q;
  v_count := jsonb_array_length(v_items);
  if v_count > public.public_deck_copy_max_media() then
    raise exception 'deck_media_too_large' using errcode = '54000';
  end if;
  return jsonb_build_object('count', v_count, 'items', v_items);
end;
$$;
revoke all on function public.get_public_deck_media_manifest(uuid) from public, anon;
grant execute on function public.get_public_deck_media_manifest(uuid) to authenticated;

drop function if exists public.copy_public_deck(uuid, bigint);
create or replace function public.copy_public_deck(p_public_id uuid, p_dest_deck_id bigint default null, p_media_map jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  v_root_id bigint;
  v_parent_id bigint;
  v_map jsonb := '{}'::jsonb;       -- id antigo -> id novo
  v_queue bigint[];
  v_cur public.decks;
  v_new_id bigint;
  v_notes_copied int := 0;
  v_skipped int := 0;
  v_media_remapped int := 0;
  v_ids bigint[];
  v_total int := 0;
  f public.own_flashcards;
  nat jsonb;
  v_attr text;
  v_front text;
  v_back text;
  c public.decks;
  dest public.decks;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then
    raise exception 'premium_required' using errcode = '42501';
  end if;

  select dk.* into src
    from public.decks dk
    join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then
    raise exception 'unavailable' using errcode = 'P0002';
  end if;
  if src.owner_id = v_uid then
    raise exception 'cannot_copy_own_deck' using errcode = '22023';
  end if;

  -- destino: Meus Decks do idioma da fonte, ou um Deck pessoal próprio do mesmo idioma
  perform public.ensure_user_decks(v_uid, src.language_app_key);
  if p_dest_deck_id is null then
    select id into v_parent_id from public.decks
     where owner_id = v_uid and kind = 'personal_root' and language_app_key = src.language_app_key;
  else
    select * into dest from public.decks where id = p_dest_deck_id;
    if not found or dest.owner_id is distinct from v_uid or dest.kind not in ('personal_root','personal')
       or dest.language_app_key <> src.language_app_key then
      raise exception 'invalid_destination' using errcode = '22023';
    end if;
    v_parent_id := dest.id;
  end if;

  -- guarda TÉCNICA de tamanho (configurável; não é regra de produto): conta as Notes
  -- da raiz E dos subdecks públicos que serão copiados.
  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  select count(*) into v_total from public.own_flashcards where deck_id = any(v_ids) and status = 'active';
  if v_total > public.public_deck_copy_max_notes() then
    raise exception 'deck_too_large' using errcode = '54000';
  end if;
  -- o mapa de mídia só vale se cada destino é objeto real da pasta do copiador
  perform public._validate_media_map(coalesce(p_media_map, '{}'::jsonb), v_uid);

  -- BFS sobre a fonte e seus subdecks que TAMBÉM são públicos (sem herança)
  insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
  values (v_uid, 'personal', src.name, src.language_app_key, v_parent_id)
  returning id into v_root_id;
  v_map := jsonb_build_object(src.id::text, v_root_id);
  v_queue := array[src.id];

  while coalesce(array_length(v_queue, 1), 0) > 0 loop
    v_cur := null;
    select * into v_cur from public.decks where id = v_queue[1];
    v_queue := v_queue[2:];

    for f in select * from public.own_flashcards
              where deck_id = v_cur.id and status = 'active' order by created_at, id loop
      nat := public.public_note_native(f);
      if nat is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      v_attr := public.note_attribution_tag(f.tags, f.owner_id, v_uid);
      -- espelho legado decorativo (write-only; back_trans é NOT NULL)
      with cf as (
        select e, ord from jsonb_array_elements(nat -> 'fields') with ordinality t(e, ord)
         where not exists (select 1 from jsonb_array_elements(nat -> 'fields') x where x ->> 'pinyinFieldId' = e ->> 'id')
      )
      select
        case when nat ->> 'mode' = 'cloze' then null
             when nat ->> 'mode' = 'multiple_choice'
               then (select e #>> '{content,value}' from cf where e ->> 'role' = 'prompt' limit 1)
             else (select e #>> '{content,value}' from cf order by ord limit 1) end,
        case when nat ->> 'mode' = 'multiple_choice'
               then (select e #>> '{content,value}' from cf where e ->> 'role' = 'answer' limit 1)
             else (select e #>> '{content,value}' from cf order by ord offset 1 limit 1) end
        into v_front, v_back;
      -- mídia: toda URL do nosso bucket é trocada pela do objeto do copiador
      -- (erro 'media_map_incomplete' se faltar -- a cópia nunca aponta para o original)
      v_media_remapped := v_media_remapped + (select count(*) from public.native_fields_media_urls(nat -> 'fields'));
      nat := jsonb_set(nat, '{fields}', public.native_fields_remap_media(nat -> 'fields', coalesce(p_media_map, '{}'::jsonb)));
      insert into public.own_flashcards
        (owner_id, language_app_key, fields, card_generation_mode, tags, note,
         front, back_trans, front_pinyin, choices, cloze_sentence, cloze_answer, cloze_answer_pinyin,
         front_is_target_language, deck_id, status, revision)
      values
        (v_uid, f.language_app_key, nat -> 'fields', nat ->> 'mode', public.note_copy_tags(f.tags, v_attr), null,
         v_front, coalesce(nullif(v_back, ''), '(sem tradução)'), null, null, null, null, null,
         true, (v_map ->> v_cur.id::text)::bigint, 'active', 0);
      v_notes_copied := v_notes_copied + 1;
    end loop;

    for c in select * from public.decks
              where parent_deck_id = v_cur.id and is_public and kind = 'personal' and owner_id = src.owner_id
              order by name, id loop
      insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
      values (v_uid, 'personal', c.name, c.language_app_key, (v_map ->> v_cur.id::text)::bigint)
      returning id into v_new_id;
      v_map := v_map || jsonb_build_object(c.id::text, v_new_id);
      v_queue := v_queue || c.id;
    end loop;
  end loop;

  return jsonb_build_object(
    'deck_id', v_root_id,
    'notes_copied', v_notes_copied,
    'skipped_incompatible', v_skipped,
    'media_remapped', v_media_remapped);
end;
$$;

revoke all on function public.copy_public_deck(uuid, bigint, jsonb) from public, anon;
grant execute on function public.copy_public_deck(uuid, bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Fluxo legado (cartões soltos) -- compatibilidade: `note` deixa de ser público;
--    copy_public_flashcard passa a usar a regra única de atribuição e não copia `note`.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_flashcards(p_username text, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_public boolean;
  v_cards jsonb;
begin
  select user_id, public_profile into v_user_id, v_public
  from profiles where username = p_username;

  if v_user_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if not v_public then
    return jsonb_build_object('error', 'not_public');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'front', front,
    'frontPinyin', front_pinyin,
    'backTrans', back_trans,
    'frontIsTargetLanguage', front_is_target_language,
    'tags', to_jsonb(tags)
  ) order by created_at desc), '[]'::jsonb)
  into v_cards
  from own_flashcards
  where owner_id = v_user_id
    and language_app_key = p_language_app_key
    and status = 'active'
    and hidden_from_profile = false;

  return jsonb_build_object('cards', v_cards);
end;
$function$;

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

  v_attr := public.note_attribution_tag(s.tags, s.owner_id, v_uid);
  v_tags := public.note_copy_tags(s.tags, v_attr);

  insert into public.own_flashcards
    (owner_id, language_app_key, fields, card_generation_mode, note, tags,
     front, back_trans, front_pinyin, choices, cloze_sentence, cloze_answer, cloze_answer_pinyin,
     front_is_target_language, deck_id, status, revision)
  values
    (v_uid, s.language_app_key, p_columns -> 'fields', 'normal', null, v_tags,
     s.front, coalesce(s.back_trans, '(sem tradução)'), null, null, null, null, null,
     coalesce((p_columns ->> 'front_is_target_language')::boolean, true), p_deck_id, 'active', 0)
  returning * into r;
  return r;
end;
$$;

revoke all on function public.copy_public_flashcard(bigint, text, jsonb, bigint) from public, anon;
grant execute on function public.copy_public_flashcard(bigint, text, jsonb, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, se necessário; nada abaixo roda automaticamente):
--   drop function public.copy_public_deck(uuid, bigint, jsonb);
--   drop function public.get_public_deck_media_manifest(uuid);
--   drop function public.get_public_deck_owner_status(bigint);
--   drop function public.list_public_decks_for_user(text, text);
--   drop function public.get_public_deck_notes(uuid);
--   drop function public.get_public_deck(uuid);
--   drop function public.unpublish_deck(bigint);
--   drop function public.publish_deck(bigint, text, text, text);
--   drop function public.public_note_native(public.own_flashcards);
--   drop function public.note_copy_tags(text[], text);
--   drop function public.note_attribution_tag(text[], uuid, uuid);
--   drop trigger own_flashcards_touch_deck_trigger on public.own_flashcards;
--   drop trigger own_flashcards_touch_updated_at_trigger on public.own_flashcards;
--   drop trigger decks_touch_parent_trigger on public.decks;
--   drop trigger decks_public_guard_trigger on public.decks;
--   alter table public.decks drop constraint decks_public_only_personal, ... ;
--   (colunas public_*, published_at, content_updated_at e own_flashcards.updated_at podem ficar)
-- ---------------------------------------------------------------------------
