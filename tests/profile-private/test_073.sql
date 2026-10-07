-- Teste da migration 073 (profile_private). Roda em transação + ROLLBACK, saída "ok|nome" ou "FALHA|nome".
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('73000000-0000-0000-0000-0000000000a1','a-073@example.invalid'),
  ('73000000-0000-0000-0000-0000000000b1','b-073@example.invalid');

-- como dono A
set local role authenticated;
select set_config('request.jwt.claim.sub','73000000-0000-0000-0000-0000000000a1',true);
do $$ declare n int; begin
  insert into profile_private(user_id, gender) values ('73000000-0000-0000-0000-0000000000a1','feminine');
  insert into r values (true,'dono insere o proprio');
  update profile_private set gender='other' where user_id='73000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count; insert into r values (n=1,'dono atualiza o proprio');
  select count(*) into n from profile_private; insert into r values (n=1,'dono le o proprio');
  begin insert into profile_private(user_id, gender) values ('73000000-0000-0000-0000-0000000000b1','masculine'); insert into r values (false,'dono NAO insere de outro');
  exception when others then insert into r values (true,'dono NAO insere de outro'); end;
  begin insert into profile_private(user_id, gender) values ('73000000-0000-0000-0000-0000000000a1','xx'); insert into r values (false,'check recusa valor invalido');
  exception when others then insert into r values (true,'check recusa valor invalido'); end;
end $$;
reset role;
insert into profile_private(user_id, gender) values ('73000000-0000-0000-0000-0000000000b1','masculine');

-- como B: nao ve nem altera a de A
set local role authenticated;
select set_config('request.jwt.claim.sub','73000000-0000-0000-0000-0000000000b1',true);
do $$ declare n int; begin
  select count(*) into n from profile_private where user_id='73000000-0000-0000-0000-0000000000a1'; insert into r values (n=0,'outro nao le o de A');
  update profile_private set gender='feminine' where user_id='73000000-0000-0000-0000-0000000000a1'; get diagnostics n = row_count; insert into r values (n=0,'outro nao atualiza o de A');
  delete from profile_private where user_id='73000000-0000-0000-0000-0000000000a1'; get diagnostics n = row_count; insert into r values (n=0,'outro nao apaga o de A');
  select count(*) into n from profile_private; insert into r values (n=1,'B ve so a propria');
end $$;
reset role;

-- anon: sem privilegio
set local role anon;
do $$ begin
  begin perform count(*) from profile_private; insert into r values (false,'anon NAO le');
  exception when insufficient_privilege then insert into r values (true,'anon NAO le'); end;
end $$;
reset role;

-- cascade ao apagar a conta
delete from auth.users where id='73000000-0000-0000-0000-0000000000b1';
do $$ declare n int; begin select count(*) into n from profile_private where user_id='73000000-0000-0000-0000-0000000000b1'; insert into r values (n=0,'apagar conta apaga o dado'); end $$;
-- RLS ligada
insert into r select relrowsecurity, 'RLS ligada' from pg_class where oid='public.profile_private'::regclass;
select case when ok then 'ok' else 'FALHA' end || '|' || name from r;
rollback;
