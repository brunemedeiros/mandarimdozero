-- Teste da 113 (conferir o @ no cadastro, sem login). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('11200000-0000-0000-0000-0000000000a1', 'a112@example.invalid'),
  ('11200000-0000-0000-0000-0000000000b1', 'b112@example.invalid'),
  ('11200000-0000-0000-0000-0000000000c1', 'c112@example.invalid');
alter table profiles disable trigger user;
insert into profiles(user_id, username, display_name) values
  ('11200000-0000-0000-0000-0000000000a1', 'raissa.lima', 'Raissa'),
  ('11200000-0000-0000-0000-0000000000b1', 'raissalima', 'Outra Raissa'),
  ('11200000-0000-0000-0000-0000000000c1', 'raissa.lima2', 'Terceira');
alter table profiles enable trigger user;
set local role anon;
insert into r select (check_username_signup('ana.souza') ->> 'status') = 'ok', 'sem login: @ livre';
insert into r select jsonb_array_length(check_username_signup('ana.souza') -> 'suggestions') = 0, 'livre: sem sugestões';
insert into r select (check_username_signup('raissa.lima') ->> 'status') = 'taken', 'sem login: @ em uso';
insert into r select (check_username_signup('raissa.lima') -> 'suggestions') = '["raissa.lima3","raissa.lima4","raissa.lima5"]'::jsonb, 'sugestões livres (pula raissalima e raissa.lima2, em uso)';
insert into r select (check_username_signup(' Ana.Souza ') ->> 'status') = 'ok', 'normaliza espaços e maiúsculas';
insert into r select (check_username_signup('ra') ->> 'status') = 'invalid', 'curto demais';
insert into r select (check_username_signup('ana..souza') ->> 'status') = 'invalid', 'ponto duplo';
insert into r select (check_username_signup('u0123456789') ->> 'status') = 'invalid', 'formato de @ aleatório';
insert into r select (check_username_signup(repeat('a', 300)) ->> 'status') = 'invalid', 'entrada enorme recusada sem consulta';
insert into r select (check_username_signup('admin') ->> 'status') = 'reserved' and jsonb_array_length(check_username_signup('admin') -> 'suggestions') = 3, 'reservado com sugestões';
insert into r select (check_username_signup('raissa_lima') ->> 'status') = 'invalid', 'sublinhado fora da regra nova';
insert into r select not (check_username_signup('raissa.lima')::text ~ 'Raissa|11200000'), 'não devolve nome nem id';
reset role;
insert into r select has_function_privilege('anon', 'public.check_username_signup(text)', 'execute'), 'anon pode chamar';
insert into r select not has_function_privilege('anon', 'public._username_problem(text,uuid)', 'execute'), 'regra interna continua fechada';
insert into r select not has_function_privilege('anon', 'public.claim_my_username(text,text)', 'execute'), 'gravar continua só com login';
select case when ok then 'ok   ' else 'FALHOU ' end || name from r order by name;
select count(*) filter (where ok) || '/' || count(*) || ' ok' from r;
rollback;
