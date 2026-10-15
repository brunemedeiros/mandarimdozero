-- Teste da migration 095 (sugestões de amigos). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
select date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date as w0 \gset

-- Pessoas (prefixo 95): A = eu; B amiga de A; C amiga de B (amiga em comum); T professora de A;
-- D colega (mesma professora); E colega de turma do Mural; F convidada por A; G parceira de estudo (pública);
-- H parceiro privado; I perto no ranking (público); J colega que não quer aparecer; K colega que não aceita pedidos;
-- L colega com pedido aberto; M colega dispensada; N colega que recusou há 10 dias; O convidou A mas não quer aparecer;
-- P colega com professora removida (não conta); Q aluna de A quando A é professora (não sugerida)
create temp table ppl(x text, h text) on commit drop;
insert into ppl values ('a1','a1'),('b1','b1'),('c1','c1'),('d1','d1'),('e1','e1'),('f1','f1'),('g1','11'),('h1','12'),('i1','13'),('j1','14'),('k1','15'),('l1','16'),('m1','17'),('n1','18'),('o1','19'),('p1','20'),('t1','21');
insert into auth.users(id, email)
select ('95000000-0000-0000-0000-0000000000' || h)::uuid, x || '95@example.invalid' from ppl;
insert into profiles(user_id, username, display_name, public_profile, avatar_url)
select ('95000000-0000-0000-0000-0000000000' || h)::uuid, 'u95' || x, 'Pessoa ' || upper(x), x in ('g1','i1','b1','c1'), 'https://ex.invalid/' || x || '.png' from ppl
on conflict (user_id) do update set display_name = excluded.display_name,
  public_profile = excluded.public_profile, avatar_url = excluded.avatar_url; -- o banco já cria o perfil (e o @) ao criar o usuário
select username as ua from profiles where user_id = '95000000-0000-0000-0000-0000000000a1' \gset
select username as uh from profiles where user_id = '95000000-0000-0000-0000-000000000012' \gset

insert into friendships(requester_id, addressee_id, status, requested_at, responded_at) values
  ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-0000000000b1','accepted', now() - interval '9 days', now() - interval '9 days'),
  ('95000000-0000-0000-0000-0000000000b1','95000000-0000-0000-0000-0000000000c1','accepted', now() - interval '9 days', now() - interval '9 days'),
  ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-000000000016','pending', now(), null),
  ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-000000000018','declined', now() - interval '10 days', now() - interval '10 days');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-0000000000a1','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-0000000000d1','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000014','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000015','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000016','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000017','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000018','frances','active'),
  ('95000000-0000-0000-0000-000000000021','95000000-0000-0000-0000-000000000020','frances','removed');
insert into classrooms(id, teacher_id, language_app_key, name) overriding system value values (9501, '95000000-0000-0000-0000-000000000021', 'frances', 'Turma 95');
insert into classroom_members(classroom_id, student_id) values (9501, '95000000-0000-0000-0000-0000000000a1'), (9501, '95000000-0000-0000-0000-0000000000e1');
insert into friend_invites(inviter_id, invitee_id) values
  ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-0000000000f1'),
  ('95000000-0000-0000-0000-000000000019','95000000-0000-0000-0000-0000000000a1');
insert into friend_settings(user_id, suggest_me, accept_requests) values
  ('95000000-0000-0000-0000-000000000014', false, true),
  ('95000000-0000-0000-0000-000000000015', true, false),
  ('95000000-0000-0000-0000-000000000019', false, true);
insert into friend_suggestion_dismissals(user_id, target_id) values ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-000000000017');
-- XP da semana: A 200 em francês; G 1000 em francês (parceira); H 300 em francês (privado); I 220 em mandarim (perto)
insert into weekly_xp(user_id, week_start, language_app_key, amount) values
  ('95000000-0000-0000-0000-0000000000a1', :'w0', 'frances', 200),
  ('95000000-0000-0000-0000-000000000011', :'w0', 'frances', 1000),
  ('95000000-0000-0000-0000-000000000012', :'w0', 'frances', 300),
  ('95000000-0000-0000-0000-000000000013', :'w0', 'mandarim', 220);

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
set local role authenticated;
select pg_temp.as_user('95000000-0000-0000-0000-0000000000a1');
create temp table s on commit drop as select * from friend_suggestions(30);

insert into r select (select reason from s where user_id = '95000000-0000-0000-0000-0000000000f1') = 'invite', 'F: entrou pelo meu convite';
insert into r select (select reason from s where user_id = '95000000-0000-0000-0000-000000000019') = 'invited_by', 'O: me convidou (aparece mesmo com "não aparecer nas sugestões")';
insert into r select (select reason from s where user_id = '95000000-0000-0000-0000-0000000000d1') = 'classmate', 'D: colega da mesma professora';
insert into r select (select reason from s where user_id = '95000000-0000-0000-0000-0000000000e1') = 'classmate', 'E: colega da turma do Mural';
insert into r select (select reason || ':' || mutual_count from s where user_id = '95000000-0000-0000-0000-0000000000c1') = 'mutual:1', 'C: 1 amigo em comum';
insert into r select (select reason || ':' || language_app_key from s where user_id = '95000000-0000-0000-0000-000000000011') = 'partner:frances', 'G: parceira de estudo (francês)';
insert into r select (select reason from s where user_id = '95000000-0000-0000-0000-000000000013') = 'ranking', 'I: perto no ranking (220 x 200)';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000012'), 'H: perfil privado não entra como parceiro';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000014'), 'J: desligou "aparecer nas sugestões"';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000015'), 'K: não aceita pedidos';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000016'), 'L: pedido aberto';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000017'), 'M: dispensada no X';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000018'), 'N: recusou há 10 dias';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000020'), 'P: vínculo removido não é colega';
insert into r select not exists (select 1 from s where user_id = '95000000-0000-0000-0000-000000000021'), 'T: a própria professora não é sugerida';
insert into r select not exists (select 1 from s where user_id in ('95000000-0000-0000-0000-0000000000a1', '95000000-0000-0000-0000-0000000000b1')), 'eu e quem já é amigo ficam de fora';
insert into r select (select avatar_url from s where user_id = '95000000-0000-0000-0000-0000000000d1') is null, 'colega com perfil privado vem sem foto';
insert into r select (select avatar_url from s where user_id = '95000000-0000-0000-0000-000000000011') is not null, 'perfil público vem com foto';
insert into r select (select array_agg(user_id order by ord) from (select user_id, row_number() over () ord from s) x)[1:2] <@ array['95000000-0000-0000-0000-0000000000f1'::uuid, '95000000-0000-0000-0000-000000000019'::uuid], 'convite vem primeiro';
insert into r select (select count(*) from friend_suggestions(2)) = 2, 'limite respeitado';

-- dispensar e convite
insert into r select (dismiss_friend_suggestion('95000000-0000-0000-0000-0000000000d1') ->> 'ok')::boolean, 'dispensar D';
insert into r select not exists (select 1 from friend_suggestions(30) where user_id = '95000000-0000-0000-0000-0000000000d1'), 'D sumiu depois do X';
insert into r select (dismiss_friend_suggestion('95000000-0000-0000-0000-0000000000a1') ->> 'error') = 'invalid_target', 'não dá para dispensar a si mesma';
select pg_temp.as_user('95000000-0000-0000-0000-000000000012');
insert into r select (record_friend_invite(upper(:'ua')) ->> 'ok')::boolean, 'H registra que veio pelo link de A (maiúsculas ok)';
insert into r select (record_friend_invite(:'uh') ->> 'ok')::boolean = false, 'convite do próprio link é ignorado';
insert into r select (record_friend_invite('ninguem') ->> 'ok')::boolean = false, 'usuário inexistente é ignorado';
insert into r select (record_friend_invite(:'ua') ->> 'ok')::boolean, 'repetir não dá erro';
select pg_temp.as_user('95000000-0000-0000-0000-0000000000a1');
insert into r select (select reason from friend_suggestions(30) where user_id = '95000000-0000-0000-0000-000000000012') = 'invite', 'H aparece para A como convite (mesmo privado)';
reset role;
insert into r select not has_function_privilege('anon', 'public.friend_suggestions(integer)', 'EXECUTE'), 'anon não lê sugestões';
insert into r select not has_table_privilege('authenticated', 'public.friend_invites', 'SELECT'), 'convites sem leitura direta';
insert into r select not has_table_privilege('authenticated', 'public.friend_suggestion_dismissals', 'SELECT'), 'dispensados sem leitura direta';
select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
