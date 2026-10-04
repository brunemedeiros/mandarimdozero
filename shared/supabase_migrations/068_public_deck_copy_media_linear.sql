-- 068 -- Public Deck: mídia da cópia com custo linear (corrige o defeito D2 da P8).
--
-- Defeito (P8, Staging, após a 067): copiar um Public Deck de 2000 Notes COM áudio em todas era
-- cancelado pelo statement_timeout de 8 s do papel `authenticated` (57014); 1000 com áudio levava
-- 3,97 s contra 1,97 s sem mídia. O limite do contrato (2000 Notes) vale também com mídia.
--
-- Causa (auditoria local, ver CLAUDE.md "D2"): o custo estava nas chamadas de mídia POR NOTA e na
-- regex de public.flashcard_media_path (~32 µs/URL no local; a `substring` não ancorada sozinha
-- ~21 µs). A 2000 Notes com 1 áudio cada, a cópia avaliava essa regex ~8000 vezes:
--   * _validate_media_map: laço PL/pgSQL, 2 regex + 1 EXISTS em storage.objects por entrada;
--   * por Note, no laço: native_fields_media_urls (SRF, regex por URL) para contar e
--     native_fields_remap_media -> _remap_media_obj (PL/pgSQL, regex por url/generatedUrl).
-- O manifest (RPC separado) ainda filtrava `sig = any(v_sel)` por Note (custo Notes x seleção).
--
-- Correção (sem mudar contrato nem resultado):
--   1. _validate_media_map: as MESMAS verificações por entrada (chave e destino são URLs do
--      bucket, destino na pasta do copiador, chave <> destino, objeto destino existe), numa
--      única consulta; caminho calculado uma vez por chave/valor; uma junção com storage.objects.
--   2. copy_public_deck: a mídia de TODAS as Notes a criar é resolvida numa passada antes do
--      laço (checagem de mapa incompleto por URL distinta, reescrita e contagem com as mesmas
--      regras de _remap_media_obj/native_fields_media_urls). O laço só consulta o índice.
--      Tudo o mais é idêntico à 067 (plano, lock, seleção, atribuição, Decks, contadores).
--   3. get_public_deck_media_manifest: seleção por busca de chave (como a 067 fez na cópia) e
--      caminho calculado uma vez por URL distinta. Mesma saída (mesmos itens, mesma ordem).
--
-- Semântica INALTERADA: mesmos erros (invalid_media_map, deck_media_too_large,
-- media_map_incomplete, ...), mesmos limites (2000 Notes / 2000 mídias), mesma atomicidade
-- (uma função = uma transação; qualquer erro desfaz tudo), mesma independência física da mídia
-- (todo destino continua tendo de ser objeto REAL na pasta do copiador), storagePath e
-- generationKey nunca copiados. Única diferença observável possível: se uma cópia tivesse DOIS
-- defeitos ao mesmo tempo (mapa incompleto E falha de INSERT de uma Note anterior, que não ocorre
-- com dados válidos), o erro relatado seria media_map_incomplete; em ambos os casos nada é criado.
-- Funções de duplicatas (_public_deck_plan, 067) e flashcard_media_path NÃO são alteradas.
-- Assinaturas idênticas (create or replace; privilégios reafirmados). Idempotente. Sem dados/schema.
--
-- Rollback: reaplicar _validate_media_map da 061 e get_public_deck_media_manifest da 062 e
-- copy_public_deck da 067.

-- ---------------------------------------------------------------------------
-- 1. Validação do mapa de mídia (mesmas regras da 061, em uma consulta)
-- ---------------------------------------------------------------------------
create or replace function public._validate_media_map(p_map jsonb, p_uid uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_map is null or jsonb_typeof(p_map) <> 'object' then
    raise exception 'invalid_media_map' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_map)) > public.public_deck_copy_max_media() then
    raise exception 'deck_media_too_large' using errcode = '54000';
  end if;
  -- 068: caminho calculado UMA vez por chave e por destino; destino conferido em storage.objects
  -- por busca de chave (índice bucket_id+name). Qualquer entrada inválida => invalid_media_map.
  -- MATERIALIZED: impede o planejador de reavaliar a regex em cada condição abaixo.
  if exists (
    with e as materialized (
      select kv.key as k, kv.value #>> '{}' as v,
             public.flashcard_media_path(kv.key) as kp,
             public.flashcard_media_path(kv.value #>> '{}') as vp
        from jsonb_each(p_map) kv)
    select 1 from e
     where e.kp is null or e.vp is null
        or split_part(e.vp, '/', 1) <> p_uid::text
        or e.k = e.v
        or not exists (select 1 from storage.objects o where o.bucket_id = 'flashcard-media' and o.name = e.vp)) then
    raise exception 'invalid_media_map' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._validate_media_map(jsonb, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Manifest de mídia (mesma saída da 062)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_deck_media_manifest(p_public_id uuid, p_selection jsonb default null)
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
  v_plan jsonb;
  v_sigs text[]; v_cls text[]; v_sel text[];
  v_sel_set jsonb;         -- 068: conjunto das assinaturas selecionadas (busca por chave)
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;
  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  v_plan := public._public_deck_plan_json(v_uid, v_ids, src.language_app_key);
  select array_agg(p.sig order by p.pos), array_agg(p.cls order by p.pos) into v_sigs, v_cls
    from jsonb_to_recordset(v_plan) as p(pos bigint, sig text, cls text);
  v_sel := public._public_deck_resolve_selection(coalesce(v_sigs, '{}'), coalesce(v_cls, '{}'), p_selection, false);
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_sel_set from unnest(v_sel) x;

  -- 068: mesmas URLs que native_fields_media_urls (audio.url, audio.generatedUrl, image.url do
  -- nosso bucket), mas o caminho é calculado UMA vez por URL distinta.
  with q as materialized (   -- MATERIALIZED: a regex roda uma vez por URL distinta
    select d.u, public.flashcard_media_path(d.u) as pth
            from (select distinct x.u
                    from jsonb_to_recordset(v_plan) as p(sig text, cls text, nat jsonb)
                    cross join lateral jsonb_array_elements(p.nat -> 'fields') e
                    cross join lateral (values (case when jsonb_typeof(e -> 'audio') = 'object' then e #>> '{audio,url}' end),
                                               (case when jsonb_typeof(e -> 'audio') = 'object' then e #>> '{audio,generatedUrl}' end),
                                               (case when jsonb_typeof(e -> 'image') = 'object' then e #>> '{image,url}' end)) x(u)
                   where v_sel_set ? p.sig and p.cls in ('none','variant') and x.u is not null) d)
  select coalesce(jsonb_agg(jsonb_build_object('url', q.u, 'path', q.pth) order by q.u), '[]'::jsonb)
    into v_items
    from q
   where q.pth is not null;
  v_count := jsonb_array_length(v_items);
  if v_count > public.public_deck_copy_max_media() then
    raise exception 'deck_media_too_large' using errcode = '54000';
  end if;
  return jsonb_build_object('count', v_count, 'items', v_items);
end;
$$;
revoke all on function public.get_public_deck_media_manifest(uuid, jsonb) from public, anon;
grant execute on function public.get_public_deck_media_manifest(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cópia (067 + mídia resolvida em uma passada)
-- ---------------------------------------------------------------------------
create or replace function public.copy_public_deck(
  p_public_id uuid, p_dest_deck_id bigint default null,
  p_media_map jsonb default '{}'::jsonb, p_selection jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  dest public.decks;
  v_root_id bigint;
  v_parent_id bigint;
  v_map jsonb := '{}'::jsonb;
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
  v_plan jsonb;
  v_sigs text[]; v_cls text[]; v_sel text[];
  v_need bigint[];
  v_create jsonb;          -- 067: f_id -> forma nativa, só das Notes a criar
  v_media jsonb;           -- 067: mapa de mídia materializado uma vez
  v_sel_set jsonb;         -- 067: conjunto das assinaturas selecionadas (busca por chave)
  v_mcount jsonb;          -- 068: f_id -> nº de URLs do bucket da Note (mesma conta de native_fields_media_urls)
  v_decks_created int := 0;
  v_name text;
  v_ex int := 0; v_exa int := 0; v_nsel int := 0; v_srcdup int := 0; v_cross int := 0; v_var_unsel int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;

  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  -- SERIALIZAÇÃO por copiador: duas abas / dois imports do mesmo usuário esperam aqui
  perform pg_advisory_xact_lock(hashtextextended('public_deck_import:' || v_uid::text, 0));

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

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  select count(*) into v_total from public.own_flashcards where deck_id = any(v_ids) and status = 'active';
  if v_total > public.public_deck_copy_max_notes() then raise exception 'deck_too_large' using errcode = '54000'; end if;
  perform public._validate_media_map(coalesce(p_media_map, '{}'::jsonb), v_uid);
  -- 067: mapa de mídia materializado UMA vez (descomprimido, em memória). Antes ele era repassado
  -- por Note e, se chegasse comprimido/TOAST, descomprimido a cada Note (custo Notes x mapa).
  -- `|| '{}'` não altera o conteúdo: mesmas chaves e valores.
  v_media := coalesce(p_media_map, '{}'::jsonb) || '{}'::jsonb;

  -- equivalência RECALCULADA sob o lock; comparada com o plano confirmado (assinatura + classe)
  v_plan := public._public_deck_plan_json(v_uid, v_ids, src.language_app_key);
  select array_agg(p.sig order by p.pos), array_agg(p.cls order by p.pos) into v_sigs, v_cls
    from jsonb_to_recordset(v_plan) as p(pos bigint, sig text, cls text);
  v_sel := public._public_deck_resolve_selection(coalesce(v_sigs, '{}'), coalesce(v_cls, '{}'), p_selection, true);
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_sel_set from unnest(v_sel) x;

  select count(*) filter (where p.cls = 'exact'), count(*) filter (where p.cls = 'exact_archived'),
         count(*) filter (where p.cls = 'source_duplicate'), count(*) filter (where p.cls = 'cross_family'),
         count(*) filter (where p.cls = 'variant' and not (v_sel_set ? p.sig)),
         count(*) filter (where p.cls = 'none' and not (v_sel_set ? p.sig))
    into v_ex, v_exa, v_srcdup, v_cross, v_var_unsel, v_nsel
    from jsonb_to_recordset(v_plan) as p(sig text, cls text);
  v_skipped := v_total - jsonb_array_length(v_plan);

  -- Decks necessários: os que têm Note a criar + ancestrais (dentro da árvore pública)
  select coalesce(array_agg(distinct id), '{}') into v_need from (
    with recursive anc(id) as (
      select distinct p.src_deck_id from jsonb_to_recordset(v_plan) as p(src_deck_id bigint, sig text, cls text)
       where v_sel_set ? p.sig and p.cls in ('none','variant')
      union
      select d.parent_deck_id from public.decks d join anc on d.id = anc.id
       where d.id <> src.id and d.parent_deck_id = any(v_ids)
    ) select id from anc where id is not null) q;

  if coalesce(array_length(v_need, 1), 0) = 0 then
    return jsonb_build_object('deck_id', null, 'notes_copied', 0, 'skipped_incompatible', v_skipped,
      'skipped_exact', v_ex, 'skipped_exact_archived', v_exa, 'skipped_source_duplicates', v_srcdup,
      'cross_family', v_cross, 'variants_not_selected', v_var_unsel, 'decks_created', 0,
      'decks_omitted', (select count(*) from public.decks where id = any(v_ids)),
      'media_remapped', 0, 'root_name', null);
  end if;

  -- 067: índice das Notes a criar, montado UMA vez (busca por chave no conjunto da seleção
  -- já validada sob o lock). Mesma regra do laço da 062: assinatura selecionada E classe none/variant.
  select coalesce(jsonb_object_agg(p.f_id::text, p.nat), '{}'::jsonb) into v_create
    from jsonb_to_recordset(v_plan) as p(f_id bigint, sig text, cls text, nat jsonb)
   where p.cls in ('none','variant') and v_sel_set ? p.sig;

  -- 068: MÍDIA RESOLVIDA EM UMA PASSADA para todas as Notes a criar (antes: 2 funções de mídia
  -- por Note, cada uma reavaliando a regex de caminho por URL). Regras idênticas às da 061:
  --   * examina url e generatedUrl de todo objeto audio/image (como _remap_media_obj);
  --   * URL do nosso bucket ausente do mapa => media_map_incomplete (nada é criado);
  --   * toda chave do mapa já foi validada como URL do bucket, então "está no mapa" = "é do
  --     bucket e tem destino"; URL fora do mapa só é consultada (regex) uma vez, por URL distinta;
  --   * storagePath/generationKey sempre removidos de audio/image objeto;
  --   * contagem por Note = URLs distintas do bucket em audio.url/audio.generatedUrl/image.url
  --     (exatamente native_fields_media_urls).
  if exists (
    select 1
      from (select distinct x.u
              from jsonb_each(v_create) nc
              cross join lateral jsonb_array_elements(nc.value -> 'fields') e
              cross join lateral (values ('audio'), ('image')) kk(k)
              cross join lateral (values (e -> kk.k ->> 'url'), (e -> kk.k ->> 'generatedUrl')) x(u)
             where jsonb_typeof(e -> kk.k) = 'object' and x.u is not null) d
     where not (v_media ? d.u) and public.flashcard_media_path(d.u) is not null) then
    raise exception 'media_map_incomplete' using errcode = '22023';
  end if;
  select coalesce(jsonb_object_agg(nc.key, jsonb_set(nc.value, '{fields}', rw.fields)), '{}'::jsonb),
         coalesce(jsonb_object_agg(nc.key, cnt.n), '{}'::jsonb)
    into v_create, v_mcount
    from jsonb_each(v_create) nc
    cross join lateral (
      select coalesce(jsonb_agg(case when jsonb_typeof(e -> 'audio') = 'object' or jsonb_typeof(e -> 'image') = 'object'
                                     then e || coalesce(
               (select jsonb_object_agg(kk.k,
                         (case when v_media ? (o.o ->> 'generatedUrl')
                               then jsonb_set(o.x, '{generatedUrl}', to_jsonb(v_media ->> (o.o ->> 'generatedUrl')))
                               else o.x end) - 'storagePath' - 'generationKey')
                  from (values ('audio'), ('image')) kk(k)
                  cross join lateral (select e -> kk.k as o) o0
                  cross join lateral (select o0.o,
                                             case when v_media ? (o0.o ->> 'url')
                                                  then jsonb_set(o0.o, '{url}', to_jsonb(v_media ->> (o0.o ->> 'url')))
                                                  else o0.o end as x) o
                 where jsonb_typeof(o0.o) = 'object'), '{}'::jsonb)
                                     else e end order by ord), '[]'::jsonb) as fields
        from jsonb_array_elements(nc.value -> 'fields') with ordinality t(e, ord)) rw
    cross join lateral (
      select count(distinct x.u)::int as n
        from jsonb_array_elements(nc.value -> 'fields') e
        cross join lateral (values (case when jsonb_typeof(e -> 'audio') = 'object' then e #>> '{audio,url}' end),
                                   (case when jsonb_typeof(e -> 'audio') = 'object' then e #>> '{audio,generatedUrl}' end),
                                   (case when jsonb_typeof(e -> 'image') = 'object' then e #>> '{image,url}' end)) x(u)
       where v_media ? x.u) cnt;

  v_name := public._unique_deck_name(v_parent_id, v_uid, src.name);
  insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
  values (v_uid, 'personal', v_name, src.language_app_key, v_parent_id)
  returning id into v_root_id;
  v_decks_created := 1;
  v_map := jsonb_build_object(src.id::text, v_root_id);
  v_queue := array[src.id];

  while coalesce(array_length(v_queue, 1), 0) > 0 loop
    v_cur := null;
    select * into v_cur from public.decks where id = v_queue[1];
    v_queue := v_queue[2:];

    for f in select * from public.own_flashcards
              where deck_id = v_cur.id and status = 'active' order by created_at, id loop
      -- 067: consulta O(log n) no índice montado UMA vez (antes: o plano inteiro era
      -- desempacotado por Note). Ausente = incompatível (já contada) OU não selecionada OU
      -- classe fora de none/variant -- exatamente as mesmas três condições de antes.
      -- 1 Note por assinatura selecionada: a 1ª ocorrência (cls none/variant) é a única com essa classe
      nat := v_create -> f.id::text;
      if nat is null then continue; end if;
      v_attr := public.note_attribution_tag(f.tags, f.owner_id, v_uid);
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
      -- 068: mídia já resolvida antes do laço (mesma reescrita e mesma contagem de antes)
      v_media_remapped := v_media_remapped + coalesce((v_mcount ->> f.id::text)::int, 0);
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
                and id = any(v_need)
              order by name, id loop
      insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
      values (v_uid, 'personal', public._unique_deck_name((v_map ->> v_cur.id::text)::bigint, v_uid, c.name),
              c.language_app_key, (v_map ->> v_cur.id::text)::bigint)
      returning id into v_new_id;
      v_decks_created := v_decks_created + 1;
      v_map := v_map || jsonb_build_object(c.id::text, v_new_id);
      v_queue := v_queue || c.id;
    end loop;
  end loop;

  return jsonb_build_object(
    'deck_id', v_root_id,
    'notes_copied', v_notes_copied,
    'skipped_incompatible', v_skipped,
    'skipped_exact', v_ex,
    'skipped_exact_archived', v_exa,
    'skipped_source_duplicates', v_srcdup,
    'cross_family', v_cross,
    'variants_not_selected', v_var_unsel,
    'decks_created', v_decks_created,
    'decks_omitted', (select count(*) from public.decks where id = any(v_ids)) - v_decks_created,
    'media_remapped', v_media_remapped,
    'root_name', v_name);
end;
$$;

revoke all on function public.copy_public_deck(uuid, bigint, jsonb, jsonb) from public, anon;
grant execute on function public.copy_public_deck(uuid, bigint, jsonb, jsonb) to authenticated;
