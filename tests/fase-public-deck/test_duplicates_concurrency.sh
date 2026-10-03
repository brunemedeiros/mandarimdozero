#!/bin/bash
# Public Deck V1 (062) -- concorrência REAL (duas conexões) contra o Postgres local (db pubdeck, preparado por run.sh).
# 1) dois imports simultâneos do MESMO usuário com o MESMO plano confirmado: um cria, o outro recebe duplicates_changed (nada parcial).
# 2) o lock é por copiador: uma sessão segurando o lock do usuário bloqueia a cópia dele, mas NÃO a de outro usuário.
P="psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -At"
OWN=00000000-0000-0000-0000-0000000000e1; PREM=00000000-0000-0000-0000-0000000000e3; OTHER=00000000-0000-0000-0000-0000000000e4
as_user(){ echo "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); select set_config('request.jwt.claims','{\"sub\":\"$1\"}',false);"; }
OK=0; FAIL=0
t(){ if [ "$2" = "1" ]; then OK=$((OK+1)); echo "ok|$1"; else FAIL=$((FAIL+1)); echo "FALHA|$1 $3"; fi; }
$P -c "update profiles set plan_tier='premium' where user_id in ('$PREM','$OTHER')" >/dev/null
$P -c "delete from own_flashcards where owner_id in ('$OWN','$PREM','$OTHER'); delete from decks where owner_id in ('$OWN','$PREM','$OTHER') and kind='personal'" >/dev/null
for u in $OWN $PREM $OTHER; do $P -c "select public.ensure_user_decks('$u','frances')" >/dev/null 2>&1; done
D=$($P -c "insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select owner_id,'personal','Corrida',language_app_key,id from decks where kind='personal_root' and owner_id='$OWN' and language_app_key='frances' returning id" | head -1)
$P -c "insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,tags) select '$OWN','frances',$D,'r'||g,'rb'||g,'{}' from generate_series(1,3) g" >/dev/null
echo "$(as_user $OWN) select public.publish_deck($D,'x','book','gray');" | $P >/dev/null
PID=$($P -c "select public_id from decks where id=$D")
SEL=$(echo "$(as_user $PREM) select (select jsonb_agg(jsonb_build_object('sig',e->>'sig','cls',e->>'cls')) from jsonb_array_elements(public.check_public_deck_duplicates('$PID')->'notes') e where e->>'cls'='none');" | $P | tail -1)
t "plano com 3 Notes novas" "$([ "$(echo "$SEL" | grep -o '"sig"' | wc -l)" = 3 ] && echo 1 || echo 0)" "$SEL"
# 1) corrida
for i in 1 2; do ( echo "$(as_user $PREM) select public.copy_public_deck('$PID',null,'{}'::jsonb,'$SEL'::jsonb);" | $P >/tmp/dupc_out_$i 2>/tmp/dupc_err_$i ) & done; wait
OKS=0; CHG=0; for i in 1 2; do if [ -s /tmp/dupc_out_$i ] && ! grep -q ERROR /tmp/dupc_err_$i; then OKS=$((OKS+1)); fi; if grep -q duplicates_changed /tmp/dupc_err_$i; then CHG=$((CHG+1)); fi; done
t "corrida: exatamente 1 import tem sucesso" "$([ $OKS = 1 ] && echo 1 || echo 0)" "ok=$OKS chg=$CHG"
t "corrida: o outro recebe duplicates_changed" "$([ $CHG = 1 ] && echo 1 || echo 0)" "ok=$OKS chg=$CHG"
t "corrida: 3 Notes e 1 Deck criados (nada duplicado/parcial)" "$([ "$($P -c "select count(*) from own_flashcards where owner_id='$PREM'")|$($P -c "select count(*) from decks where owner_id='$PREM' and name='Corrida'")" = '3|1' ] && echo 1 || echo 0)"
# 2) lock por copiador
D2=$($P -c "insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select owner_id,'personal','Corrida2',language_app_key,id from decks where kind='personal_root' and owner_id='$OWN' and language_app_key='frances' returning id" | head -1)
$P -c "insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,tags) select '$OWN','frances',$D2,'q'||g,'qb'||g,'{}' from generate_series(1,2) g" >/dev/null
echo "$(as_user $OWN) select public.publish_deck($D2,'x','book','gray');" | $P >/dev/null
PID2=$($P -c "select public_id from decks where id=$D2")
( echo "begin; select pg_advisory_xact_lock(hashtextextended('public_deck_import:$PREM',0)); select pg_sleep(3); commit;" | $P >/dev/null ) & sleep 0.7
s=$(date +%s.%N); echo "$(as_user $PREM) select public.copy_public_deck('$PID2');" | $P >/dev/null 2>&1; el=$(echo "$(date +%s.%N) - $s" | bc)
s2=$(date +%s.%N); echo "$(as_user $OTHER) select public.copy_public_deck('$PID2');" | $P >/dev/null 2>&1; el2=$(echo "$(date +%s.%N) - $s2" | bc)
wait
t "lock do copiador bloqueia o MESMO usuário (>=1.5s esperando)" "$([ "$(echo "$el > 1.5" | bc)" = 1 ] && echo 1 || echo 0)" "$el"
t "...mas não bloqueia outro usuário (<1s)" "$([ "$(echo "$el2 < 1" | bc)" = 1 ] && echo 1 || echo 0)" "$el2"
t "após o lock, o import do usuário concluiu (2 Notes)" "$([ "$($P -c "select count(*) from own_flashcards where owner_id='$PREM' and front like 'q%'")" = 2 ] && echo 1 || echo 0)"
echo "RESULTADO $OK/$((OK+FAIL))"
