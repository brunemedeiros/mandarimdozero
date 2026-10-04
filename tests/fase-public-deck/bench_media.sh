#!/bin/bash
# D2 -- benchmark LOCAL da cópia de Public Deck com mídia (nunca toca Staging/produção).
# Uso: bench_media.sh <N> <media: none|audio|audio_image|multi>   (DB pubdeck preparado por run.sh)
# Mede, como `authenticated` e com statement_timeout=8s (igual ao Staging): check, manifest e cópia
# pelo caminho real do app (seleção explícita [{sig,cls}] + mapa de mídia completo).
N=${1:-2000}; MEDIA=${2:-audio}
P="psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -At -v ON_ERROR_STOP=1"
OWN=00000000-0000-0000-0000-0000000000b1; PREM=00000000-0000-0000-0000-0000000000b3
U='https://proj.supabase.co/storage/v1/object/public/flashcard-media/'
as_user(){ echo "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); select set_config('request.jwt.claims','{\"sub\":\"$1\"}',false);"; }
$P >/dev/null <<SQL
create unique index if not exists bucketid_objname on storage.objects(bucket_id, name); -- igual ao Supabase
insert into auth.users(id,email) values ('$OWN','bench-own@example.com'),('$PREM','bench-prem@example.com') on conflict do nothing;
SQL
for u in $OWN $PREM; do echo "$(as_user $u) select public.ensure_my_profile();" | $P >/dev/null 2>&1; done
$P >/dev/null <<SQL
update profiles set plan_tier='premium', public_profile=true where user_id in ('$OWN','$PREM');
delete from own_flashcards where owner_id in ('$OWN','$PREM');
delete from decks where owner_id in ('$OWN','$PREM') and kind='personal';
delete from storage.objects where name like 'b%-bench/%' or split_part(name,'/',1) in ('$OWN','$PREM');
SQL
for u in $OWN $PREM; do echo "$(as_user $u) select public.ensure_user_decks('$u','frances');" | $P >/dev/null; done
DECK=$($P -c "insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select owner_id,'personal','Bench $N $MEDIA',language_app_key,id from decks where kind='personal_root' and owner_id='$OWN' and language_app_key='frances' returning id" | head -1)
case $MEDIA in
  none)        F="jsonb_build_array(jsonb_build_object('id','a','lang','fr','content',jsonb_build_object('value','f'||g)), jsonb_build_object('id','b','lang','pt-BR','content',jsonb_build_object('value','b'||g)))";;
  audio)       F="jsonb_build_array(jsonb_build_object('id','a','lang','fr','content',jsonb_build_object('value','f'||g),'audio',jsonb_build_object('type','upload','url','$U$OWN/a'||g||'.mp3','storagePath','$OWN/a'||g||'.mp3')), jsonb_build_object('id','b','lang','pt-BR','content',jsonb_build_object('value','b'||g)))";;
  audio_image) F="jsonb_build_array(jsonb_build_object('id','a','lang','fr','content',jsonb_build_object('value','f'||g),'audio',jsonb_build_object('type','upload','url','$U$OWN/a'||g||'.mp3'),'image',jsonb_build_object('url','$U$OWN/i'||g||'.png')), jsonb_build_object('id','b','lang','pt-BR','content',jsonb_build_object('value','b'||g)))";;
  multi)       F="jsonb_build_array(jsonb_build_object('id','a','lang','fr','content',jsonb_build_object('value','f'||g),'audio',jsonb_build_object('type','upload','url','$U$OWN/a'||g||'.mp3')), jsonb_build_object('id','b','lang','pt-BR','content',jsonb_build_object('value','b'||g),'audio',jsonb_build_object('type','tts','generatedUrl','$U$OWN/t'||g||'.mp3','generationKey','k'||g),'image',jsonb_build_object('url','$U$OWN/i'||g||'.png')))";;
esac
$P >/dev/null <<SQL
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,fields,card_generation_mode,tags)
select '$OWN','frances',$DECK,'f'||g,'b'||g,$F,'normal','{}' from generate_series(1,$N) g;
insert into storage.objects(bucket_id,name)
select 'flashcard-media', p from (select distinct substring(u from '/flashcard-media/(.*)$') p from own_flashcards f,
  lateral (select e #>> '{audio,url}' u from jsonb_array_elements(f.fields) e union all select e #>> '{audio,generatedUrl}' from jsonb_array_elements(f.fields) e
           union all select e #>> '{image,url}' from jsonb_array_elements(f.fields) e) q where f.deck_id=$DECK and u is not null) s;
-- cópias "já feitas pelo cliente" na pasta do copiador (passo 2 do fluxo P7)
insert into storage.objects(bucket_id,name) select bucket_id, '$PREM/pubcopy-'||replace(name,'/','_') from storage.objects where split_part(name,'/',1)='$OWN';
SQL
echo "$(as_user $OWN) select public.publish_deck($DECK,'b','book','gray');" | $P >/dev/null
PID=$($P -c "select public_id from decks where id=$DECK")
OUT=$($P -v ON_ERROR_STOP=0 <<SQL 2>&1
set statement_timeout = '8s';
$(as_user $PREM)
select set_config('bench.t0', clock_timestamp()::text, false);
select (public.check_public_deck_duplicates('$PID')) ->> 'source_total' \gset
select 'check='||round(extract(epoch from clock_timestamp()-current_setting('bench.t0')::timestamptz)::numeric,3);
create temp table sel as select jsonb_agg(jsonb_build_object('sig',n->>'sig','cls',n->>'cls')) s
  from jsonb_array_elements(public.check_public_deck_duplicates('$PID') -> 'notes') n where (n->>'selectable')::boolean and (n->>'selected_default')::boolean;
select set_config('bench.t0', clock_timestamp()::text, false);
create temp table man as select public.get_public_deck_media_manifest('$PID', (select s from sel)) m;
select 'manifest='||round(extract(epoch from clock_timestamp()-current_setting('bench.t0')::timestamptz)::numeric,3)||' itens='||(select m->>'count' from man);
create temp table mp as select coalesce(jsonb_object_agg(i->>'url', '$U$PREM/pubcopy-'||replace(i->>'path','/','_')), '{}'::jsonb) m
  from man, jsonb_array_elements(man.m->'items') i;
select set_config('bench.t0', clock_timestamp()::text, false);
select 'copy_result='||(public.copy_public_deck('$PID', null, (select m from mp), (select s from sel)) ->> 'notes_copied');
select 'copy='||round(extract(epoch from clock_timestamp()-current_setting('bench.t0')::timestamptz)::numeric,3);
SQL
)
echo "N=$N media=$MEDIA :: $(echo "$OUT" | grep -E '^(check|manifest|copy|ERROR|psql)' | tr '\n' ' ')"
