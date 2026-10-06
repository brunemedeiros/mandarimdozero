#!/bin/bash
# Concorrência: 40 sessões paralelas (usuários distintos) + 20 sessões paralelas no MESMO usuário.
set -u
P="psql -h /tmp/pg -p 54329 -U pguser ident -qAt"
$P -c "insert into auth.users(id,email) select ('00000000-0000-0000-0000-0000000e'||lpad(g::text,4,'0'))::uuid,'c'||g||'@example.com' from generate_series(1,40) g; insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000f0001','same@example.com'); grant select on auth.users to authenticated;" >/dev/null
call(){ $P -c "set request.jwt.claim.sub='$1'; set request.jwt.claims='{\"sub\":\"$1\",\"role\":\"authenticated\"}'; set role authenticated; select (public.ensure_my_profile()).username;" >/dev/null 2>>/tmp/conc_err.txt; }
: > /tmp/conc_err.txt
for g in $(seq 1 40); do call "00000000-0000-0000-0000-0000000e$(printf %04d $g)" & done; wait
for i in $(seq 1 20); do call "00000000-0000-0000-0000-0000000f0001" & done; wait
a=$($P -c "select count(*)||'/'||count(distinct username) from profiles where user_id::text like '00000000-0000-0000-0000-0000000e%'")
b=$($P -c "select count(*) from profiles where user_id='00000000-0000-0000-0000-0000000f0001'")
echo "usuarios distintos (perfis/usernames distintos): $a  (esperado 40/40)"
echo "mesmo usuario, 20 chamadas simultaneas -> perfis: $b (esperado 1)"
echo "erros: $(grep -c . /tmp/conc_err.txt)"; head -3 /tmp/conc_err.txt
