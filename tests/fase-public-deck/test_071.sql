-- 071: storagePath fora de image no conteúdo público; host de mídia ancorado em *.supabase.co.
\set QUIET on
do $$
declare r public.own_flashcards; nat jsonb; n int := 0; ok int := 0;
  procedure_ok boolean;
begin
  r.fields := '[{"id":"a","lang":"fr","role":null,"content":{"value":"chat"},
                 "audio":{"type":"upload","url":"https://x.supabase.co/storage/v1/object/public/flashcard-media/u/a.mp3","storagePath":"u/a.mp3","generationKey":"k"},
                 "image":{"url":"https://x.supabase.co/storage/v1/object/public/flashcard-media/u/i.png","storagePath":"u/i.png"},"pinyinFieldId":null},
                {"id":"b","lang":"pt-BR","role":null,"content":{"value":"gato"},"audio":null,"image":null,"pinyinFieldId":null}]';
  r.card_generation_mode := 'normal'; r.language_app_key := 'frances';
  nat := public.public_note_native(r);
  n := n+1; if not (nat #> '{fields,0,image}' ? 'storagePath') then ok := ok+1; raise notice 'ok|image sem storagePath'; else raise notice 'FALHA|image ainda tem storagePath'; end if;
  n := n+1; if not (nat #> '{fields,0,audio}' ?| array['storagePath','generationKey']) then ok := ok+1; raise notice 'ok|audio sem storagePath/generationKey'; else raise notice 'FALHA|audio'; end if;
  n := n+1; if nat #>> '{fields,0,image,url}' like 'https://x.supabase.co/%' and nat #>> '{fields,1,content,value}' = 'gato' and nat ->> 'mode' = 'normal' then ok := ok+1; raise notice 'ok|resto do Field intacto'; else raise notice 'FALHA|conteúdo mudou'; end if;
  n := n+1; if (nat -> 'fields' -> 1 -> 'image') = 'null'::jsonb then ok := ok+1; raise notice 'ok|image null continua null'; else raise notice 'FALHA|image null'; end if;
  n := n+1; if public.flashcard_media_path('https://abc-1.supabase.co/storage/v1/object/public/flashcard-media/u/a.mp3') = 'u/a.mp3' then ok := ok+1; raise notice 'ok|host supabase aceito'; else raise notice 'FALHA|host supabase'; end if;
  n := n+1; if public.flashcard_media_path('https://evil.example/storage/v1/object/public/flashcard-media/u/a.mp3') is null then ok := ok+1; raise notice 'ok|host externo recusado'; else raise notice 'FALHA|host externo aceito'; end if;
  n := n+1; if public.flashcard_media_path('https://x.supabase.co.evil.example/storage/v1/object/public/flashcard-media/u/a.mp3') is null then ok := ok+1; raise notice 'ok|sufixo enganoso recusado'; else raise notice 'FALHA|sufixo enganoso'; end if;
  n := n+1; if public.flashcard_media_path('https://x.supabase.co/storage/v1/object/public/flashcard-media/u/../b.mp3') is null then ok := ok+1; raise notice 'ok|.. recusado'; else raise notice 'FALHA|..'; end if;
  n := n+1; if (select count(*) from public.native_fields_media_urls('[{"audio":{"url":"https://evil.example/storage/v1/object/public/flashcard-media/u/a.mp3"}}]')) = 0 then ok := ok+1; raise notice 'ok|URL externa fora do manifest'; else raise notice 'FALHA|URL externa no manifest'; end if;
  raise notice 'RESULTADO 071 %/%', ok, n;
end $$;
