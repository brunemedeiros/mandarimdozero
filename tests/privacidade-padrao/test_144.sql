-- Teste da migration 144 (data da confirmação de idade protegida). Transação + ROLLBACK, saída "ok|nome" ou "FALHA|nome".
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('14400000-0000-0000-0000-0000000000a1','a-144@example.invalid'),
  ('14400000-0000-0000-0000-0000000000b1','b-144@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','14400000-0000-0000-0000-0000000000a1',true);
do $$ declare t timestamptz; t2 timestamptz; g text; n int; begin
  -- gravar a data direto pela API: recusado
  begin insert into profile_private(user_id, gender, age_ack_at) values (auth.uid(), 'feminine', now()); insert into r values (false,'insert com a data pela API recusado');
  exception when others then insert into r values (sqlerrm = 'age_ack_at_protected','insert com a data pela API recusado'); end;
  -- gênero sem a data: ok (como antes)
  insert into profile_private(user_id, gender) values (auth.uid(), 'feminine');
  insert into r values (true,'gênero continua editável pela API');
  -- a função grava a data
  t := public.ack_my_age();
  insert into r values (t is not null,'ack_my_age grava a data');
  -- trocar ou apagar a data pela API: recusado
  begin update profile_private set age_ack_at = now() - interval '1 year' where user_id = auth.uid(); insert into r values (false,'trocar a data pela API recusado');
  exception when others then insert into r values (sqlerrm = 'age_ack_at_protected','trocar a data pela API recusado'); end;
  begin update profile_private set age_ack_at = null where user_id = auth.uid(); insert into r values (false,'apagar a data pela API recusado');
  exception when others then insert into r values (sqlerrm = 'age_ack_at_protected','apagar a data pela API recusado'); end;
  begin delete from profile_private where user_id = auth.uid(); insert into r values (false,'apagar a linha com a data pela API recusado');
  exception when others then insert into r values (sqlerrm = 'age_ack_at_protected','apagar a linha com a data pela API recusado'); end;
  -- mudar só o gênero continua ok e mantém a data
  update profile_private set gender = 'other' where user_id = auth.uid();
  select gender, age_ack_at into g, t2 from profile_private where user_id = auth.uid();
  insert into r values (g = 'other' and t2 = t,'mudar o gênero mantém a data');
  -- confirmar de novo não muda a data
  perform pg_sleep(0.01);
  insert into r values (public.ack_my_age() = t,'confirmar de novo mantém a primeira data');
end $$;
-- conta sem linha: a função cria com a data (insert pela função, não pela API)
select set_config('request.jwt.claim.sub','14400000-0000-0000-0000-0000000000b1',true);
do $$ begin insert into r values (public.ack_my_age() is not null,'conta sem linha: ack_my_age cria com a data'); end $$;
reset role;

-- servidor (fora da API): não troca uma data já gravada, mas pode apagar a linha (exclusão de conta)
do $$ begin
  begin update profile_private set age_ack_at = now() + interval '1 day' where user_id = '14400000-0000-0000-0000-0000000000a1'; insert into r values (false,'servidor não troca data gravada');
  exception when others then insert into r values (sqlerrm = 'age_ack_at_protected','servidor não troca data gravada'); end;
  delete from profile_private where user_id = '14400000-0000-0000-0000-0000000000b1';
  insert into r values (not exists(select 1 from profile_private where user_id = '14400000-0000-0000-0000-0000000000b1'),'exclusão de conta (servidor) apaga a linha');
end $$;

select case when ok then 'ok' else 'FALHA' end || '|' || name from r;
select 'RESUMO|' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
