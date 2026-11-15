-- Teste da migration 136 (perfil privado para contas novas + confirmação de idade). Transação + ROLLBACK.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('13600000-0000-0000-0000-0000000000a1','antiga-136@example.invalid'),
  ('13600000-0000-0000-0000-0000000000b1','nova-136@example.invalid'),
  ('13600000-0000-0000-0000-0000000000c1','outra-136@example.invalid');

-- conta "antiga": gravada com public_profile = true explícito (como ficou depois da 041) continua pública
insert into profiles(user_id, username, public_profile) values ('13600000-0000-0000-0000-0000000000a1','antiga', true);
-- conta nova: o INSERT não informa a coluna (como get_my_profile) e nasce privada
insert into profiles(user_id, username) values ('13600000-0000-0000-0000-0000000000b1','nova');
insert into r select public_profile = true, 'conta antiga continua publica' from profiles where username='antiga';
insert into r select public_profile = false, 'conta nova nasce privada' from profiles where username='nova';

-- sem login: ack_my_age recusa
set local role anon;
do $$ begin
  begin perform public.ack_my_age(); insert into r values (false,'anon nao executa ack_my_age');
  exception when others then insert into r values (true,'anon nao executa ack_my_age'); end;
end $$;
reset role;

-- logada (B): confirma, a data fica, confirmar de novo não muda a data
set local role authenticated;
select set_config('request.jwt.claim.sub','13600000-0000-0000-0000-0000000000b1',true);
do $$ declare t1 timestamptz; t2 timestamptz; n int; begin
  t1 := public.ack_my_age();
  insert into r values (t1 is not null,'ack_my_age grava a data');
  select age_ack_at into t2 from profile_private where user_id = auth.uid();
  insert into r values (t2 = t1,'dono le a propria data');
  perform pg_sleep(0.01);
  t2 := public.ack_my_age();
  insert into r values (t2 = t1,'confirmar de novo mantem a primeira data');
  select count(*) into n from profile_private where user_id='13600000-0000-0000-0000-0000000000c1';
  insert into r values (n = 0,'nao ve a linha de outra pessoa');
end $$;
reset role;

-- quem já tinha profile_private (gênero) não perde o gênero ao confirmar
insert into profile_private(user_id, gender) values ('13600000-0000-0000-0000-0000000000c1','feminine');
set local role authenticated;
select set_config('request.jwt.claim.sub','13600000-0000-0000-0000-0000000000c1',true);
do $$ declare g text; t timestamptz; begin
  t := public.ack_my_age();
  select gender into g from profile_private where user_id = auth.uid();
  insert into r values (g = 'feminine' and t is not null,'confirmar mantem o genero');
end $$;
reset role;

select case when ok then 'ok' else 'FALHA' end || '|' || name from r;
select 'RESUMO|' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
