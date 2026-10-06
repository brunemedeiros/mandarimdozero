-- D2 -- executor de cenários do teste diferencial. Cada cenário devolve um jsonb NORMALIZADO
-- (sem ids/timestamps): resultado ou erro (mensagem|sqlstate), Notes e Decks criados pelo copiador.
\set ON_ERROR_STOP on
create or replace function d2t.call(p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform d2t.as_user('00000000-0000-0000-0000-000000000dd3');
  set local role authenticated;
  begin execute p_sql into r;
  exception when others then reset role; return jsonb_build_object('error', sqlerrm || '|' || sqlstate); end;
  reset role; return r;
end $$;
create or replace function d2t.pid(k text) returns uuid language sql as $$ select public_id from d2t.decks where d2t.decks.k = $1 $$;
create or replace function d2t.manifest(k text, sel jsonb) returns jsonb language sql as $$
  select d2t.call(format('select public.get_public_deck_media_manifest(%L, %L::jsonb)', d2t.pid(k), sel)) $$;
create or replace function d2t.default_sel(k text) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('sig', n->>'sig', 'cls', n->>'cls') order by (n->>'pos')::int), '[]'::jsonb)
    from jsonb_array_elements(d2t.call(format('select public.check_public_deck_duplicates(%L)', d2t.pid(k))) -> 'notes') n
   where (n->>'selected_default')::boolean $$;
-- mapa como o cliente monta: url do manifest -> cópia na pasta do copiador
create or replace function d2t.map_of(man jsonb) returns jsonb language sql as $$
  select coalesce(jsonb_object_agg(i->>'url', d2t.u('00000000-0000-0000-0000-000000000dd3/pubcopy-' || replace(i->>'path','/','_'))), '{}'::jsonb)
    from jsonb_array_elements(man -> 'items') i $$;
create or replace function d2t.snapshot() returns jsonb language sql as $$
  select jsonb_build_object(
    'notes', (select coalesce(jsonb_agg(jsonb_build_object(
                 'deck', (select string_agg(x.name, ' > ' order by x.depth desc) from (
                            with recursive a(id, name, parent_deck_id, depth) as (
                              select d.id, d.name, d.parent_deck_id, 0 from decks d where d.id = f.deck_id
                              union all select d.id, d.name, d.parent_deck_id, a.depth + 1 from decks d join a on d.id = a.parent_deck_id)
                            select name, depth from a) x),
                 'fields', f.fields, 'mode', f.card_generation_mode, 'tags', f.tags, 'front', f.front, 'back', f.back_trans,
                 'note', f.note, 'status', f.status, 'revision', f.revision, 'pinyin', f.front_pinyin, 'choices', f.choices,
                 'cloze', f.cloze_sentence, 'audio_url', f.audio_url, 'image_url', f.image_url) order by f.id), '[]'::jsonb)
              from own_flashcards f where f.owner_id = '00000000-0000-0000-0000-000000000dd3' and f.created_at >= now()),
    'decks', (select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'parent', p.name, 'lang', d.language_app_key, 'pub', d.is_public) order by d.id), '[]'::jsonb)
              from decks d left join decks p on p.id = d.parent_deck_id
             where d.owner_id = '00000000-0000-0000-0000-000000000dd3' and d.kind = 'personal' and d.created_at >= now()),
    'objects_copier', (select count(*) from storage.objects where split_part(name,'/',1) = '00000000-0000-0000-0000-000000000dd3'))
$$;
create or replace function d2t.copy(k text, map jsonb, sel jsonb, dest bigint default null) returns jsonb language sql as $$
  select jsonb_build_object('result', (select r - 'deck_id' from (select d2t.call(format('select public.copy_public_deck(%L, %s, %L::jsonb, %s)',
            d2t.pid(k), coalesce(dest::text, 'null'), map, coalesce(quote_literal(sel::text) || '::jsonb', 'null'))) r) q),
         'snapshot', d2t.snapshot()) $$;
-- remove a i-ésima chave (ordem das chaves do manifest)
create or replace function d2t.drop_key(map jsonb, man jsonb, pos int) returns jsonb language sql as $$
  select map - ((man -> 'items' -> pos) ->> 'url') $$;
-- cenários
create or replace function d2t.run(scn text) returns jsonb language plpgsql as $$
declare man jsonb; sel jsonb; m jsonb; n int; dest bigint;
begin
  sel := d2t.default_sel(case when scn like 'quirk%' then 'quirk' when scn like '%zh%' then 'zh' else 'main' end);
  man := d2t.manifest(case when scn like 'quirk%' then 'quirk' when scn like '%zh%' then 'zh' else 'main' end, sel);
  m := d2t.map_of(man); n := jsonb_array_length(man -> 'items');
  case scn
    when 'manifest_default' then return d2t.manifest('main', null);
    when 'manifest_explicit' then return man;
    when 'manifest_zh' then return man;
    when 'check_main' then return d2t.call(format('select public.check_public_deck_duplicates(%L)', d2t.pid('main'))) - 'root_id';
    when 'ok_explicit' then return d2t.copy('main', m, sel);
    when 'ok_default_null_sel' then return d2t.copy('main', d2t.map_of(d2t.manifest('main', null)), null);
    when 'ok_extra_valid_key' then return d2t.copy('main', m || jsonb_build_object(d2t.u('00000000-0000-0000-0000-000000000dd1/arch.mp3'), d2t.u('00000000-0000-0000-0000-000000000dd3/pubcopy-00000000-0000-0000-0000-000000000dd1_arch.mp3')), sel);
    when 'ok_dest_subdeck' then
      perform d2t.call($q$ select to_jsonb(public.ensure_user_decks('00000000-0000-0000-0000-000000000dd3','frances')) $q$);
      insert into decks(owner_id,kind,name,language_app_key,parent_deck_id)
      select owner_id,'personal','Destino D2',language_app_key,id from decks where owner_id='00000000-0000-0000-0000-000000000dd3' and kind='personal_root' and language_app_key='frances'
      returning id into dest;
      return d2t.copy('main', m, sel, dest);
    when 'fail_missing_last' then return d2t.copy('main', d2t.drop_key(m, man, n - 1), sel);
    when 'fail_missing_middle' then return d2t.copy('main', d2t.drop_key(m, man, n / 2), sel);
    when 'fail_missing_first' then return d2t.copy('main', d2t.drop_key(m, man, 0), sel);
    when 'fail_empty_map' then return d2t.copy('main', '{}'::jsonb, sel);
    when 'fail_map_null' then return d2t.copy('main', null, sel);
    when 'fail_map_array' then return d2t.copy('main', '[]'::jsonb, sel);
    when 'fail_dest_other_user_folder' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], to_jsonb(d2t.u('00000000-0000-0000-0000-000000000dd1/chat.mp3'))), sel);
    when 'fail_dest_original_same' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], to_jsonb((man->'items'->0)->>'url')), sel);
    when 'fail_dest_object_missing' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], to_jsonb(d2t.u('00000000-0000-0000-0000-000000000dd3/nao-existe.mp3'))), sel);
    when 'fail_dest_external' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], to_jsonb('https://ext.example.com/x.mp3'::text)), sel);
    when 'fail_dest_dotdot' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], to_jsonb(d2t.u('00000000-0000-0000-0000-000000000dd3/../00000000-0000-0000-0000-000000000dd1/chat.mp3'))), sel);
    when 'fail_key_external' then return d2t.copy('main', m || jsonb_build_object('https://ext.example.com/a.mp3', d2t.u('00000000-0000-0000-0000-000000000dd3/pubcopy-00000000-0000-0000-0000-000000000dd1_chat.mp3')), sel);
    when 'fail_value_not_string' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], '123'::jsonb), sel);
    when 'fail_value_json_null' then return d2t.copy('main', jsonb_set(m, array[(man->'items'->0)->>'url'], 'null'::jsonb), sel);
    when 'fail_too_many_keys' then perform set_config('app.public_deck_copy_max_media', '3', true); return d2t.copy('main', m, sel);
    when 'fail_manifest_too_many' then perform set_config('app.public_deck_copy_max_media', '3', true); return d2t.manifest('main', sel);
    when 'quirk_manifest_map' then return d2t.copy('quirk', m, sel);
    when 'quirk_full_map' then return d2t.copy('quirk', m || jsonb_build_object(d2t.u('00000000-0000-0000-0000-000000000dd1/qg.png'), d2t.u('00000000-0000-0000-0000-000000000dd3/pubcopy-00000000-0000-0000-0000-000000000dd1_qg.png')), sel);
    when 'zh_ok' then return d2t.copy('zh', m, sel);
    when 'zh_missing' then return d2t.copy('zh', d2t.drop_key(m, man, 0), sel);
    else raise exception 'unknown scenario %', scn;
  end case;
end $$;
