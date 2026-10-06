-- 071_public_deck_hardening.sql
-- Hardening pós-P8 do Public Deck (checkpoint final P8, CLAUDE.md). Aditiva (só create or replace), sem mudança de dado.
--
-- 1. public_note_native: tira storagePath/generationKey também de `image` (antes só de `audio`).
--    Afeta o que get_public_deck_notes devolve ao público e o "nat" do plano de duplicatas. As assinaturas
--    de duplicata (_note_dup_parts) usam só content.value, então NÃO mudam. A cópia (068) já removia dos dois.
-- 2. flashcard_media_path: o host passa a ser ancorado em *.supabase.co (antes qualquer host com o caminho
--    /storage/v1/object/public/flashcard-media/ era tratado como do nosso bucket). Conferido em 2026-10-05:
--    a produção não tem nenhuma URL de mídia gravada; o app só gera URLs via getPublicUrl (<ref>.supabase.co).
--    Uma URL de outro host deixa de ser "nossa": não entra no manifest nem é remapeada (fica como link externo).
--
-- Rollback: reaplicar as definições de public_note_native e flashcard_media_path da 061.

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
             case when jsonb_typeof(e -> 'image') = 'object'
                  then jsonb_set(x.e1, '{image}', (e -> 'image') - 'storagePath' - 'generationKey')
                  else x.e1 end
             order by ord)
      into v_fields
      from jsonb_array_elements(r.fields) with ordinality t(e, ord)
      cross join lateral (select case when jsonb_typeof(e -> 'audio') = 'object'
                                      then jsonb_set(e, '{audio}', (e -> 'audio') - 'storagePath' - 'generationKey')
                                      else e end as e1) x;
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

create or replace function public.flashcard_media_path(p_url text) returns text
language sql immutable set search_path = public as $$
  select case when p_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/flashcard-media/[^?#]+$'
               and p_url !~ '\.\.'
              then substring(p_url from '/storage/v1/object/public/flashcard-media/([^?#]+)$') end
$$;
