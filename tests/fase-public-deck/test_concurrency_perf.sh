#!/bin/bash
# P7 -- concorrência e performance contra o Postgres local (db pubdeck, preparado por run.sh).
# 1) 8 publicações simultâneas do MESMO Deck → um único public_id estável.
# 2) 4 cópias simultâneas (Premium) → 4 cópias independentes, sem erro/duplicação de atribuição.
# 3) Deck com 2000 Notes: tempo de metadado, conteúdo e cópia.
P="psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -At"
OWN=00000000-0000-0000-0000-0000000000e1; PREM=00000000-0000-0000-0000-0000000000e3
as_user(){ echo "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); select set_config('request.jwt.claims','{\"sub\":\"$1\"}',false);"; }
$P -c "delete from own_flashcards where owner_id in ('$OWN','$PREM'); delete from decks where owner_id in ('$OWN','$PREM') and kind='personal'" >/dev/null
$P -c "select public.ensure_user_decks('$OWN','frances')" >/dev/null 2>&1
DECK=$($P -c "insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select owner_id,'personal','Concorrência',language_app_key,id from decks where kind='personal_root' and owner_id='$OWN' and language_app_key='frances' returning id" | head -1)
for i in 1 2 3 4 5 6 7 8; do ( echo "$(as_user $OWN) select public.publish_deck($DECK,'x','book','gray');" | $P >/dev/null 2>/tmp/cc_err_$i ) & done; wait
IDS=$($P -c "select count(distinct public_id)||'/'||count(*) from decks where id=$DECK and public_id is not null")
ERRS=$(cat /tmp/cc_err_* 2>/dev/null | grep -ci error || true)
echo "publicações simultâneas: distintos/linhas=$IDS erros=$ERRS"
$P -c "insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,tags) select '$OWN','frances',$DECK,'f'||g,'b'||g,'{vocab}' from generate_series(1,2000) g" >/dev/null
PID=$($P -c "select public_id from decks where id=$DECK")
t(){ local s=$(date +%s.%N); "$@" >/dev/null; echo "$(echo "$(date +%s.%N) - $s" | bc)"; }
echo "metadado (2000 Notes): $(t $P -c "$(as_user $PREM) select public.get_public_deck('$PID')")s"
echo "conteúdo (2000 Notes): $(t $P -c "$(as_user $PREM) select length(public.get_public_deck_notes('$PID')::text)")s"
for i in 1 2 3 4; do ( echo "$(as_user $PREM) select public.copy_public_deck('$PID');" | $P >/dev/null 2>/tmp/cp_err_$i ) & done; wait
echo "cópias simultâneas: decks=$($P -c "select count(*) from decks where owner_id='$PREM' and name='Concorrência'") notas=$($P -c "select count(*) from own_flashcards where owner_id='$PREM'") erros=$(cat /tmp/cp_err_* | grep -ci error || true)"
echo "cópia de 2000 Notes (1 chamada): $(t $P -c "$(as_user $PREM) select public.copy_public_deck('$PID')")s"
echo "atribuição única por Note: $($P -c "select count(*) filter (where (select count(*) from unnest(tags) t where t like 'criado-por-%')=1)||'/'||count(*) from own_flashcards where owner_id='$PREM'")"
