#!/bin/bash
# Pré-requisito: run.sh + 065 aplicada (test_065.sh). Testa a 066 no banco local grants65.
HERE=$(cd "$(dirname "$0")" && pwd); MIG="$HERE/../../shared/supabase_migrations"
C="psql -h /tmp/pg -p 54329 -U postgres grants65 -Atq"
ok=0; bad=0; chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "FALHA: $1 (esperado '$3', obtido '$2')"; fi; }
mk(){ $C -c "insert into auth.users(id,email) values (gen_random_uuid(),'$1') returning id"; }
# executa SQL como authenticated (JWT: sub=$1, email=$2) numa sessão; devolve a última linha
as_auth(){ $C -c "set role authenticated" -c "select set_config('request.jwt.claim.sub','$1',false)" -c "select set_config('request.jwt.claims','{\"sub\":\"$1\",\"email\":\"$2\"}',false)" -c "$3" 2>&1 | { o=$(cat); if echo "$o" | grep -q ERROR; then echo "$o" | tr '\n' ' '; else echo "$o" | tail -1; fi; }; }
protegido(){ echo "$1" | grep -c 'plan_role_protected'; }
# ANTES da 066: a lacuna existe (prova negativa)
U0=$(mk antes@x.test)
chk "ANTES da 066: INSERT admin/premium e permitido (lacuna)" "$(as_auth $U0 antes@x.test "insert into public.profiles(user_id,username,role,plan_tier) values ('$U0','x','admin','premium') returning role||'/'||plan_tier")" "admin/premium"
psql -h /tmp/pg -p 54329 -U postgres grants65 -q -v ON_ERROR_STOP=1 -f $MIG/066_profiles_protect_plan_role_insert.sql >/dev/null 2>&1; chk "066 aplica sem erro" "$?" "0"
psql -h /tmp/pg -p 54329 -U postgres grants65 -q -v ON_ERROR_STOP=1 -f $MIG/066_profiles_protect_plan_role_insert.sql >/dev/null 2>&1; chk "066 idempotente" "$?" "0"
chk "1 trigger de INSERT e 1 de UPDATE de plano/role" "$($C -c "select count(*) from pg_trigger where tgrelid='public.profiles'::regclass and tgname in ('trg_profiles_protect_plan_role','trg_profiles_protect_plan_role_insert')")" "2"
chk "funcao sem EXECUTE para anon/authenticated/public" "$($C -c "select (has_function_privilege('anon','public.profiles_protect_plan_role_insert()','EXECUTE')::int+has_function_privilege('authenticated','public.profiles_protect_plan_role_insert()','EXECUTE')::int)")" "0"
# usuario comum
U1=$(mk novo1@x.test)
chk "INSERT admin+premium bloqueado" "$(protegido "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username,role,plan_tier) values ('$U1','x','admin','premium')")")" "1"
chk "INSERT so premium bloqueado" "$(protegido "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username,plan_tier) values ('$U1','x','premium')")")" "1"
chk "INSERT so admin bloqueado" "$(protegido "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username,role) values ('$U1','x','admin')")")" "1"
chk "INSERT role=teacher bloqueado" "$(protegido "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username,role) values ('$U1','x','teacher')")")" "1"
chk "nenhuma linha criada pelas tentativas" "$($C -c "select count(*) from public.profiles where user_id='$U1'")" "0"
chk "INSERT normal (defaults) permitido" "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username) values ('$U1','x') returning role||'/'||plan_tier")" "user/free"
chk "INSERT explicito user/free permitido" "$(U=$(mk novo1b@x.test); as_auth $U novo1b@x.test "insert into public.profiles(user_id,username,role,plan_tier) values ('$U','x','user','free') returning role||'/'||plan_tier")" "user/free"
chk "RLS: nao cria perfil de outro" "$(as_auth $U1 novo1@x.test "insert into public.profiles(user_id,username) values (gen_random_uuid(),'x')" | grep -c 'row-level security')" "1"
# caminho do app: ensure_my_profile (SECURITY DEFINER)
U2=$(mk novo2@x.test)
chk "ensure_my_profile cria perfil user/free" "$(as_auth $U2 novo2@x.test "select (ensure_my_profile()).role||'/'||(ensure_my_profile()).plan_tier")" "user/free"
# UPDATE legitimo e 063 continuam
chk "UPDATE de campo legitimo (bio)" "$(as_auth $U1 novo1@x.test "update public.profiles set bio='oi' where user_id='$U1' returning bio")" "oi"
chk "063 ainda bloqueia UPDATE de plano" "$(protegido "$(as_auth $U1 novo1@x.test "update public.profiles set plan_tier='premium' where user_id='$U1'")")" "1"
chk "063 ainda bloqueia UPDATE de role" "$(protegido "$(as_auth $U1 novo1@x.test "update public.profiles set role='admin' where user_id='$U1'")")" "1"
# mecanismo administrativo legitimo
U3=$(mk premium@x.test)
chk "admin (JWT brunemed1310@gmail.com) insere premium" "$(as_auth $U3 brunemed1310@gmail.com "insert into public.profiles(user_id,username,role,plan_tier) values ('$U3','x','admin','premium') returning role||'/'||plan_tier")" "admin/premium"
U4=$(mk srv@x.test)
chk "papel interno (postgres) insere premium/admin" "$($C -c "insert into public.profiles(user_id,username,role,plan_tier) values ('$U4','x','admin','premium') returning role||'/'||plan_tier")" "admin/premium"
U5=$(mk svc@x.test)
chk "service_role insere premium" "$($C -c "set role service_role" -c "insert into public.profiles(user_id,username,plan_tier) values ('$U5','x','premium') returning plan_tier" 2>&1 | tail -1)" "premium"
chk "anon nao insere perfil" "$($C -c "set role anon" -c "insert into public.profiles(user_id,username,role) values ('$U5','y','admin')" 2>&1 | grep -q 'row-level security\|permission denied\|plan_role' && echo 1 || echo 0)" "1"
# regressoes
chk "RLS ligado" "$($C -c "select relrowsecurity::int from pg_class where oid='public.profiles'::regclass")" "1"
chk "policies de profiles inalteradas (3)" "$($C -c "select count(*) from pg_policies where tablename='profiles'")" "3"
echo "RESULTADO 066: $ok ok, $bad falhas"
