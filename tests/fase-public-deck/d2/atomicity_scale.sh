#!/bin/bash
# D2 -- atomicidade em escala (LOCAL): Deck de 2000 Notes com áudio (fixture do bench_media.sh).
# Cada falha deve deixar 0 Notes e 0 Decks novos do copiador. statement_timeout = 8s como no Staging.
HERE=$(cd "$(dirname "$0")" && pwd)
bash "$HERE/../bench_media.sh" 2000 audio >/dev/null 2>&1
P="psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -At"
PREM=00000000-0000-0000-0000-0000000000b3
$P -c "delete from own_flashcards where owner_id='$PREM'; delete from decks where owner_id='$PREM' and kind='personal'" >/dev/null
U='https://proj.supabase.co/storage/v1/object/public/flashcard-media/'
run(){ # $1=nome $2=expressão SQL que transforma o mapa completo (variável m) $3=erro esperado
  local out
  out=$($P <<SQL 2>&1
set statement_timeout = '8s';
select set_config('request.jwt.claim.sub','$PREM',false); select set_config('request.jwt.claims','{"sub":"$PREM"}',false);
\set PIDV `psql -h /tmp/pg -p 54329 -U pguser pubdeck -At -c "select public_id from decks where owner_id='00000000-0000-0000-0000-0000000000b1' and public_id is not null order by id desc limit 1"`
set role authenticated;
create temp table pid as select :'PIDV'::uuid p;
create temp table sel as select jsonb_agg(jsonb_build_object('sig',n->>'sig','cls',n->>'cls')) s from jsonb_array_elements(public.check_public_deck_duplicates((select p from pid))->'notes') n where (n->>'selected_default')::boolean;
create temp table man as select public.get_public_deck_media_manifest((select p from pid),(select s from sel)) m;
create temp table mp as select jsonb_object_agg(i->>'url','${U}$PREM/pubcopy-'||replace(i->>'path','/','_')) m from man, jsonb_array_elements(man.m->'items') i;
create temp table it as select (man.m->'items'->((man.m->>'count')::int - 1))->>'url' last_url, (man.m->'items'->((man.m->>'count')::int / 2))->>'url' mid_url from man;
select set_config('d2.t0', clock_timestamp()::text, false);
select public.copy_public_deck((select p from pid), null, (select $2 from mp, it), (select s from sel))->>'notes_copied';
select 'tempo='||round(extract(epoch from clock_timestamp()-current_setting('d2.t0')::timestamptz)::numeric,3);
SQL
)
  local err=$(echo "$out" | grep -o 'ERROR:  [a-z_]*' | head -1 | sed 's/ERROR:  //')
  local t=$(echo "$out" | grep -o 'tempo=[0-9.]*')
  local notes=$($P -c "select count(*) from own_flashcards where owner_id='$PREM'")
  local decks=$($P -c "select count(*) from decks where owner_id='$PREM' and kind='personal'")
  if [ "$err" = "$3" ] && [ "$notes" = 0 ] && [ "$decks" = 0 ]; then st=ok; else st=FALHA; fi
  echo "$st|$1: erro=${err:-nenhum} (esperado $3) notes=$notes decks=$decks $t"
}
run "mapa sem o ÚLTIMO item (2000)" "mp.m - it.last_url" media_map_incomplete
run "mapa sem o item do MEIO (2000)" "mp.m - it.mid_url" media_map_incomplete
run "último destino na pasta do AUTOR" "jsonb_set(mp.m, array[it.last_url], to_jsonb(it.last_url))" invalid_media_map
run "último destino inexistente no Storage" "jsonb_set(mp.m, array[it.last_url], to_jsonb('${U}$PREM/nao-existe.mp3'::text))" invalid_media_map
run "mapa vazio" "'{}'::jsonb" media_map_incomplete
# controle: o mesmo fluxo com o mapa completo cria tudo (prova que as falhas acima não são do fixture)
out=$($P <<SQL 2>&1
set statement_timeout = '8s';
select set_config('request.jwt.claim.sub','$PREM',false); select set_config('request.jwt.claims','{"sub":"$PREM"}',false);
\set PIDV `psql -h /tmp/pg -p 54329 -U pguser pubdeck -At -c "select public_id from decks where owner_id='00000000-0000-0000-0000-0000000000b1' and public_id is not null order by id desc limit 1"`
set role authenticated;
create temp table pid as select :'PIDV'::uuid p;
create temp table sel as select jsonb_agg(jsonb_build_object('sig',n->>'sig','cls',n->>'cls')) s from jsonb_array_elements(public.check_public_deck_duplicates((select p from pid))->'notes') n where (n->>'selected_default')::boolean;
create temp table man as select public.get_public_deck_media_manifest((select p from pid),(select s from sel)) m;
create temp table mp as select jsonb_object_agg(i->>'url','${U}$PREM/pubcopy-'||replace(i->>'path','/','_')) m from man, jsonb_array_elements(man.m->'items') i;
select public.copy_public_deck((select p from pid), null, (select m from mp), (select s from sel))->>'notes_copied';
SQL
)
n=$($P -c "select count(*) from own_flashcards where owner_id='$PREM'")
l=$($P -c "select count(*) from own_flashcards f, jsonb_array_elements(f.fields) e where f.owner_id='$PREM' and e #>> '{audio,url}' like '%/flashcard-media/00000000-0000-0000-0000-0000000000b1/%'")
[ "$n" = 2000 ] && [ "$l" = 0 ] && echo "ok|controle: mapa completo cria 2000 Notes, 0 URLs na pasta do autor" || echo "FALHA|controle notes=$n urls_autor=$l $out"
