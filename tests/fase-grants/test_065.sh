#!/bin/bash
# Pré-requisito: run.sh (cadeia 001..064 num banco com padrão restritivo de GRANTs).
HERE=$(cd "$(dirname "$0")" && pwd); MIG="$HERE/../../shared/supabase_migrations"
Q="psql -h /tmp/pg -p 54329 -U postgres grants65 -Atq -v ON_ERROR_STOP=1"
ok=0; bad=0; chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "FALHA: $1 (esperado '$3', obtido '$2')"; fi; }
DML(){ $Q -c "select count(*) from pg_class c, unnest(array['anon','authenticated','service_role']) r, unnest(array['SELECT','INSERT','UPDATE','DELETE']) p where c.relnamespace='public'::regnamespace and c.relkind='r' and has_table_privilege(r, c.oid, p)"; }
NT=$($Q -c "select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r'")
FN_BEFORE=$($Q -c "select md5(string_agg(p.oid::regprocedure::text||coalesce(p.proacl::text,''),',' order by p.oid::regprocedure::text)) from pg_proc p where pronamespace='public'::regnamespace")
SEQ_BEFORE=$($Q -c "select md5(string_agg(relname||coalesce(relacl::text,''),',' order by relname)) from pg_class where relnamespace='public'::regnamespace and relkind='S'")
RLS_BEFORE=$($Q -c "select md5(string_agg(tablename||policyname||cmd||coalesce(qual,'')||coalesce(with_check,''),',' order by tablename,policyname)) from pg_policies where schemaname='public'")
TRG_BEFORE=$($Q -c "select md5(string_agg(tgrelid::regclass::text||tgname,',' order by tgrelid::regclass::text,tgname)) from pg_trigger where not tgisinternal")
chk "antes: nenhum DML concedido" "$(DML)" "0"
$Q -c "select set_config('request.jwt.claim.sub','',true)" >/dev/null
# antes: authenticated não consegue nem ler profiles
B=$(psql -h /tmp/pg -p 54329 -U postgres grants65 -At -c "set role authenticated; select count(*) from public.profiles" 2>&1 | grep -c 'permission denied')
chk "antes: SELECT negado para authenticated" "$B" "1"
psql -h /tmp/pg -p 54329 -U postgres grants65 -q -v ON_ERROR_STOP=1 -f $MIG/065_grant_table_privileges_parity.sql >/dev/null 2>&1; chk "065 aplica sem erro" "$?" "0"
chk "depois: 4 DML x 3 papeis x todas as tabelas" "$(DML)" "$((NT*12))"
psql -h /tmp/pg -p 54329 -U postgres grants65 -q -v ON_ERROR_STOP=1 -f $MIG/065_grant_table_privileges_parity.sql >/dev/null 2>&1; chk "065 idempotente (2a execucao sem erro)" "$?" "0"
chk "idempotente: mesmo numero de grants" "$(DML)" "$((NT*12))"
chk "funcoes/EXECUTE inalterados" "$($Q -c "select md5(string_agg(p.oid::regprocedure::text||coalesce(p.proacl::text,''),',' order by p.oid::regprocedure::text)) from pg_proc p where pronamespace='public'::regnamespace")" "$FN_BEFORE"
chk "sequencias inalteradas" "$($Q -c "select md5(string_agg(relname||coalesce(relacl::text,''),',' order by relname)) from pg_class where relnamespace='public'::regnamespace and relkind='S'")" "$SEQ_BEFORE"
chk "policies RLS inalteradas" "$($Q -c "select md5(string_agg(tablename||policyname||cmd||coalesce(qual,'')||coalesce(with_check,''),',' order by tablename,policyname) ) from pg_policies where schemaname='public'")" "$RLS_BEFORE"
chk "triggers inalterados" "$($Q -c "select md5(string_agg(tgrelid::regclass::text||tgname,',' order by tgrelid::regclass::text,tgname)) from pg_trigger where not tgisinternal")" "$TRG_BEFORE"
chk "RLS continua ligado em todas as tabelas" "$($Q -c "select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity")" "0"
chk "privilegios nao-DML preservados (TRUNCATE etc.)" "$($Q -c "select has_table_privilege('anon','public.profiles','TRUNCATE')::int+has_table_privilege('service_role','public.profiles','REFERENCES')::int")" "2"
# default privileges: tabela futura criada por postgres ja nasce com DML
$Q -c "create table public._t065(id int)" >/dev/null
chk "tabela futura herda DML (default privileges)" "$($Q -c "select has_table_privilege('authenticated','public._t065','INSERT')::int+has_table_privilege('anon','public._t065','SELECT')::int+has_table_privilege('service_role','public._t065','DELETE')::int")" "3"
$Q -c "drop table public._t065" >/dev/null
# default de funcao NAO foi ampliado (anon nao ganha EXECUTE em funcao futura)
$Q -c "create function public._f065() returns int language sql as 'select 1'" >/dev/null
chk "funcao futura nao ganha EXECUTE para anon via 065" "$($Q -c "select has_function_privilege('anon','public._f065()','EXECUTE')::int")" "1"   # PUBLIC padrao do Postgres (igual antes da 065)
$Q -c "drop function public._f065()" >/dev/null
# funcional: RLS passa a decidir (e continua negando o que deve)
ID1=$($Q -c "insert into auth.users(id,email) values (gen_random_uuid(),'a@x.test') returning id")
ID2=$($Q -c "insert into auth.users(id,email) values (gen_random_uuid(),'b@x.test') returning id")
as_user(){ psql -h /tmp/pg -p 54329 -U postgres grants65 -Atq -c "set role authenticated" -c "select set_config('request.jwt.claim.sub','$1',false)" -c "select set_config('request.jwt.claims','{\"sub\":\"$1\",\"email\":\"$1@x.test\"}',false)" -c "$2" 2>&1 | tail -1; }
chk "authenticated cria o proprio perfil (RLS permite)" "$(as_user $ID1 "insert into public.profiles(user_id,username) values ('$ID1','x') returning user_id")" "$ID1"
chk "authenticated NAO cria perfil de outro (RLS nega)" "$(as_user $ID1 "insert into public.profiles(user_id,username) values ('$ID2','x') returning user_id" | grep -c 'row-level security')" "1"
chk "anon le perfis publicos (policy profiles_public_read)" "$(psql -h /tmp/pg -p 54329 -U postgres grants65 -At -c "set role anon" -c "select count(*) from public.profiles" | tail -1)" "1"
chk "anon NAO escreve perfil (RLS nega)" "$(psql -h /tmp/pg -p 54329 -U postgres grants65 -At -c "set role anon" -c "insert into public.profiles(user_id,username) values ('$ID2','x')" 2>&1 | grep -c 'row-level security')" "1"
chk "authenticated NAO le progress de outro (RLS)" "$(as_user $ID2 "select count(*) from public.progress")" "0"
echo "RESULTADO 065: $ok ok, $bad falhas"
