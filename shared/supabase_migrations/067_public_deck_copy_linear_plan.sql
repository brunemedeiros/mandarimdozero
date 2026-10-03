-- 067 -- Public Deck: cópia e plano de duplicatas com custo linear (corrige o defeito D1 da P8).
--
-- Defeito (P8, Staging): a cópia de 2000 Notes levava 10,8 s e era cancelada pelo
-- statement_timeout de 8 s do papel `authenticated`, embora o contrato admita 2000.
-- Duas causas de custo quadrático, ambas na 062:
--   1. copy_public_deck: para CADA Note da árvore, `jsonb_to_recordset(v_plan) ... where
--      p.f_id = f.id` desempacotava o plano inteiro (com a forma nativa de todas as Notes).
--   2. _public_deck_plan: para CADA Note da origem, EXISTS sobre a coleção inteira do
--      copiador (custo origem x coleção; afeta também check e manifest).
-- Correção: o plano das Notes a criar vira um índice jsonb (f_id -> forma nativa) montado
-- uma vez, e a coleção do copiador é agregada uma vez por chave em índices jsonb consultados
-- por chave (sem JOIN origem x coleção: o custo não depende de estimativas do otimizador).
-- Também: o mapa de mídia é materializado uma vez antes do laço (antes, repassado por Note,
-- podia ser descomprimido a cada Note quando chegava comprimido).
--
-- Semântica INALTERADA: mesmas classes (exact, exact_archived, source_duplicate,
-- cross_family, variant, none) e mesma precedência; mesmo local_archived/local_deck_id;
-- mesma regra de seleção, lock, recálculo sob lock, duplicates_changed, atribuição,
-- mídia, árvore de Decks, contadores, erros e limites (2000 continua 2000).
-- Assinaturas idênticas às da 062 (create or replace; privilégios reafirmados abaixo).
-- Idempotente: pode ser reaplicada sem efeito adicional. Sem alteração de dados ou schema.
--
-- Rollback: reaplicar os blocos de _public_deck_plan e copy_public_deck da 062.

create or replace function public._public_deck_plan(p_uid uuid, p_ids bigint[], p_lang text)
returns table (pos bigint, f_id bigint, src_deck_id bigint, mode text, sig text, cls text,
               local_archived boolean, local_deck_id bigint, instances int, nat jsonb)
language plpgsql stable
set search_path = public
as $$
begin
  return query
  with loc as (
    select f.id, f.status, f.deck_id, public._note_dup_parts(n.nat, f.language_app_key) p
      from public.own_flashcards f
      cross join lateral (select public.public_note_native(f) as nat) n
     where f.owner_id = p_uid and f.language_app_key = p_lang and n.nat is not null
  ), src as (
    select f.id, f.deck_id, n.nat, public._note_dup_parts(n.nat, p_lang) p,
           row_number() over (order by f.created_at, f.id) rn
      from public.own_flashcards f
      cross join lateral (select public.public_note_native(f) as nat) n
     where f.deck_id = any(p_ids) and f.status = 'active' and n.nat is not null
  ), s2 as (
    select src.*, row_number() over (partition by src.p ->> 'sig' order by src.rn) as sig_rn from src
  ),
  -- 067: a coleção do copiador é agregada UMA vez por chave e vira índices jsonb (antes: um
  -- EXISTS sobre a coleção inteira por Note da origem, custo origem x coleção). Mesmas regras.
  loc_sig as (            -- por assinatura: existe ativa? qual Deck mostrar (ativa primeiro, menor id)
    select loc.p ->> 'sig' as l_sig, bool_or(loc.status = 'active') as l_has_active,
           (array_agg(loc.deck_id order by (loc.status = 'active') desc, loc.id))[1] as l_deck_id
      from loc where loc.p ->> 'sig' is not null group by loc.p ->> 'sig'
  ), loc_pk as (          -- por par (pkey): faixa dos modos existentes (para "existe modo diferente")
    select loc.p ->> 'pkey' as l_pkey, min(loc.p ->> 'mode') as l_mn, max(loc.p ->> 'mode') as l_mx
      from loc where loc.p ->> 'pkey' is not null and loc.p ->> 'mode' is not null group by loc.p ->> 'pkey'
  ), loc_fv as (          -- (família, chave de variante) existentes
    select distinct loc.p ->> 'family' as l_family, loc.p ->> 'vkey' as l_vkey
      from loc where loc.p ->> 'family' is not null and loc.p ->> 'vkey' is not null
  ), loc_idx as (        -- 067: índices jsonb montados UMA vez; a consulta por Note é uma busca por chave
    select (select coalesce(jsonb_object_agg(l_sig, jsonb_build_array(l_has_active, l_deck_id)), '{}'::jsonb) from loc_sig) as by_sig,
           (select coalesce(jsonb_object_agg(l_pkey, jsonb_build_array(l_mn, l_mx)), '{}'::jsonb) from loc_pk) as by_pkey,
           (select coalesce(jsonb_object_agg(l_family || '|' || l_vkey, true), '{}'::jsonb) from loc_fv) as by_fv
  )
  -- Sem JOIN entre origem e coleção: o plano não depende de estimativas do otimizador
  -- (um nested loop escolhido por estimativa ruim reintroduziria o custo origem x coleção).
  select s2.rn, s2.id, s2.deck_id, s2.p ->> 'mode', s2.p ->> 'sig',
         case
           when (li.by_sig -> (s2.p ->> 'sig') ->> 0)::boolean then 'exact'
           when li.by_sig ? (s2.p ->> 'sig') then 'exact_archived'
           when s2.sig_rn > 1 then 'source_duplicate'
           when s2.p ->> 'pkey' is not null and li.by_pkey ? (s2.p ->> 'pkey')
                and ((li.by_pkey -> (s2.p ->> 'pkey') ->> 0) <> s2.p ->> 'mode'
                     or (li.by_pkey -> (s2.p ->> 'pkey') ->> 1) <> s2.p ->> 'mode') then 'cross_family'
           when li.by_fv ? ((s2.p ->> 'family') || '|' || (s2.p ->> 'vkey')) then 'variant'
           else 'none'
         end,
         coalesce(li.by_sig ? (s2.p ->> 'sig') and not (li.by_sig -> (s2.p ->> 'sig') ->> 0)::boolean, false),
         (li.by_sig -> (s2.p ->> 'sig') ->> 1)::bigint,
         public._note_instance_count(s2.nat),
         s2.nat
    from s2 cross join loc_idx li
   order by s2.rn;
end;
$$;
revoke all on function public._public_deck_plan(uuid, bigint[], text) from public, anon, authenticated;

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
      v_media_remapped := v_media_remapped + (select count(*) from public.native_fields_media_urls(nat -> 'fields'));
      nat := jsonb_set(nat, '{fields}', public.native_fields_remap_media(nat -> 'fields', v_media));
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
