-- Teste da 111 (escolher o @ uma vez). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
-- N: conta nova (sem perfil). V: conta antiga com @ do e-mail. O: dona do @ antigo raissa_lima.
insert into auth.users(id, email) values
  ('11100000-0000-0000-0000-0000000000a1', 'nova111@example.invalid'),
  ('11100000-0000-0000-0000-0000000000b1', 'velha111@example.invalid'),
  ('11100000-0000-0000-0000-0000000000c1', 'outra111@example.invalid');
-- contas antigas: @ gravado como antes da 060 (o gatilho sorteia no INSERT; acerta-se com o gatilho desligado)
alter table profiles disable trigger user;
insert into profiles(user_id, username, display_name) values
  ('11100000-0000-0000-0000-0000000000b1', 'catharina24', 'Catharina'),
  ('11100000-0000-0000-0000-0000000000c1', 'raissa_lima', 'Outra Raissa');
alter table profiles enable trigger user;

select pg_temp.as_user('11100000-0000-0000-0000-0000000000a1');
set local role authenticated;
insert into r select (get_my_profile() ->> 'username') ~ '^u[0-9a-f]{10}$', 'conta nova ganha @ aleatório (110)';
insert into r select my_username_choice_pending(), 'conta nova precisa escolher o @';
insert into r select check_username('raissa.lima') = 'taken', 'raissa.lima recusado: mesma tag do raissa_lima antigo';
insert into r select check_username('raissalima') = 'ok', 'raissalima livre';
insert into r select check_username('ra') = 'invalid', 'curto demais';
insert into r select check_username('.raissa') = 'invalid' and check_username('rai..ssa') = 'invalid' and check_username('raissa.') = 'invalid', 'ponto só entre letras/números';
insert into r select check_username('Raíssa') = 'invalid', 'acento e maiúscula fora (o site já envia normalizado)';
insert into r select check_username('admin') = 'reserved' and check_username('prof.brune') = 'reserved', 'nomes reservados';
insert into r select check_username('u0123456789') = 'invalid', 'não pode escolher formato de @ aleatório';
insert into r select (claim_my_username('raissalima', '') ->> 'error') = 'name_required', 'nome obrigatório';
insert into r select (claim_my_username('raissa.lima', 'Raissa Lima') ->> 'error') = 'taken', 'claim recusa @ com tag igual';
insert into r select (claim_my_username('raissalima', ' Raissa Lima ') ->> 'username') = 'raissalima', 'escolhe o @';
insert into r select (get_my_profile() ->> 'display_name') = 'Raissa Lima' and (get_my_profile() ->> 'username_chosen_at') is not null, 'nome gravado e escolha registrada';
insert into r select not my_username_choice_pending(), 'não pede de novo';
insert into r select (claim_my_username('raissa.l', 'Raissa') ->> 'error') = 'already_chosen', 'segunda escolha recusada';
reset role;
-- o @ continua imutável fora da claim, para qualquer papel
do $$ begin
  begin update profiles set username = 'outro.nome' where user_id = '11100000-0000-0000-0000-0000000000a1';
    insert into r values (false, 'UPDATE direto do @ escolhido recusado');
  exception when others then insert into r values (sqlerrm = 'username_immutable', 'UPDATE direto do @ escolhido recusado'); end;
  begin update profiles set username_chosen_at = null where user_id = '11100000-0000-0000-0000-0000000000a1';
    insert into r values (false, 'não dá para apagar a marca de escolha');
  exception when others then insert into r values (sqlerrm = 'username_immutable', 'não dá para apagar a marca de escolha'); end;
  -- nem com a marca da transação ligada, numa conta antiga
  perform set_config('app.username_claim', 'on', true);
  begin update profiles set username = 'catharina.n', username_chosen_at = now() where user_id = '11100000-0000-0000-0000-0000000000b1';
    insert into r values (false, 'conta antiga não troca o @ nem com a marca');
  exception when others then insert into r values (sqlerrm = 'username_immutable', 'conta antiga não troca o @ nem com a marca'); end;
  perform set_config('app.username_claim', '', true);
end $$;
-- conta antiga: não aparece a tela e a claim recusa
select pg_temp.as_user('11100000-0000-0000-0000-0000000000b1');
set local role authenticated;
insert into r select not my_username_choice_pending(), 'conta antiga (@ do e-mail) não recebe a tela';
insert into r select (claim_my_username('catharina.nova', 'Catharina') ->> 'error') = 'already_chosen', 'conta antiga não troca o @';
insert into r select check_username('raissalima') = 'taken', 'o @ escolhido passa a constar como em uso';
reset role;
-- permissões
insert into r select not has_function_privilege('anon', 'public.claim_my_username(text,text)', 'execute')
  and not has_function_privilege('anon', 'public.check_username(text)', 'execute')
  and not has_function_privilege('authenticated', 'public._username_problem(text,uuid)', 'execute'), 'funções fechadas para anon e a interna para todos';

select case when ok then 'ok|' else 'FALHOU|' end || name from r;
select 'total: ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
