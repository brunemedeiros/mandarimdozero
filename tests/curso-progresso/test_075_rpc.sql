-- E3 / C3: get_teacher_student_overview (070) e get_public_profile_stats (037) depois da migration 075.
-- Transação + ROLLBACK (nunca deixa resíduo). Saída: "ok|..." ou "FALHA|..." por cenário, e "total=N falhas=M" no fim.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;

insert into auth.users(id, email) values
  ('75000000-0000-0000-0000-0000000000a1', 'prof-075@example.invalid'),
  ('75000000-0000-0000-0000-0000000000b1', 'aluno-075@example.invalid'),
  ('75000000-0000-0000-0000-0000000000c1', 'aluno-conta-075@example.invalid'),
  ('75000000-0000-0000-0000-0000000000d1', 'aluno-novo-075@example.invalid');
-- o username é gerado por trigger (060): o teste lê o gerado em vez de impor um
insert into profiles(user_id, username, public_profile) values
  ('75000000-0000-0000-0000-0000000000b1', 'x075b', true),
  ('75000000-0000-0000-0000-0000000000c1', 'x075c', true),
  ('75000000-0000-0000-0000-0000000000d1', 'x075d', true);
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
  ('75000000-0000-0000-0000-0000000000a1', '75000000-0000-0000-0000-0000000000b1', 'frances', 'active'),
  ('75000000-0000-0000-0000-0000000000a1', '75000000-0000-0000-0000-0000000000c1', 'frances', 'active'),
  ('75000000-0000-0000-0000-0000000000a1', '75000000-0000-0000-0000-0000000000d1', 'frances', 'active');

-- B: conta de hoje (sem _account): frances + mandarim, como em produção
-- C: francês e francês@en, com _account à frente do bloco; mais _meta
-- D: bloco com a sequência mais NOVA que a da conta (a conta não pode ganhar do bloco)
insert into progress(user_id, data) values
('75000000-0000-0000-0000-0000000000b1', jsonb_build_object(
  'frances', jsonb_build_object('lastStudyDay', to_char(current_date, 'YYYY-MM-DD'), 'streak', 4, 'xp', 321, 'progressSummary', jsonb_build_object('levelId','A1','levelLabel','A1','pct',12)),
  'mandarim', jsonb_build_object('lastStudyDay', '2026-09-01', 'streak', 2, 'xp', 10, 'progressSummary', jsonb_build_object('levelId','HSK1','levelLabel','HSK1','pct',5)),
  '_meta', jsonb_build_object('x', 1))),
('75000000-0000-0000-0000-0000000000c1', jsonb_build_object(
  'frances', jsonb_build_object('lastStudyDay', to_char(current_date - 3, 'YYYY-MM-DD'), 'streak', 1, 'xp', 100, 'progressSummary', jsonb_build_object('levelId','A1','levelLabel','A1','pct',20)),
  'frances@en', jsonb_build_object('lastStudyDay', to_char(current_date - 3, 'YYYY-MM-DD'), 'streak', 1, 'xp', 7, 'progressSummary', jsonb_build_object('levelId','A1','levelLabel','A1','pct',3)),
  '_account', jsonb_build_object('lastStudyDay', to_char(current_date, 'YYYY-MM-DD'), 'streak', 3, 'activityLog', jsonb_build_object(to_char(current_date, 'YYYY-MM-DD'), 2)),
  '_meta', jsonb_build_object('uiLanguage', 'en'))),
('75000000-0000-0000-0000-0000000000d1', jsonb_build_object(
  'frances', jsonb_build_object('lastStudyDay', to_char(current_date, 'YYYY-MM-DD'), 'streak', 5, 'xp', 50, 'progressSummary', jsonb_build_object('levelId','A1','levelLabel','A1','pct',9)),
  '_account', jsonb_build_object('lastStudyDay', to_char(current_date - 1, 'YYYY-MM-DD'), 'streak', 9)));
insert into own_flashcards(owner_id, language_app_key, front, back_trans, status) values
  ('75000000-0000-0000-0000-0000000000c1', 'frances', 'a', 'a', 'active'),
  ('75000000-0000-0000-0000-0000000000c1', 'frances', 'b', 'b', 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '75000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"75000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- ---------- get_teacher_student_overview ----------
-- B (conta de hoje): mesmo resultado de antes, com os campos novos
insert into r select (o->'languages'->0->>'key') = 'frances' and (o->'languages'->0->>'languageAppKey') = 'frances' and (o->'languages'->0->>'courseId') = 'frances@pt-BR', 'B: frances primeiro, com languageAppKey e courseId'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000b1', 'frances') o) x;
insert into r select (o->'languages'->0->'streak')::int = 4 and (o->'languages'->1->>'key') = 'mandarim' and (o->'languages'->1->'streak')::int = 2, 'B: sem _account a sequência é a do bloco (4 e 2)'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000b1', 'frances') o) x;
insert into r select jsonb_array_length(o->'languages') = 2, 'B: _meta nunca vira idioma' from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000b1', 'frances') o) x;
-- C: frances e frances@en, _account à frente
insert into r select jsonb_array_length(o->'languages') = 2 and (o->'languages'->0->>'key') = 'frances' and (o->'languages'->1->>'key') = 'frances@en', 'C: frances e frances@en aparecem (e _account/_meta não)'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000c1', 'frances') o) x;
insert into r select (o->'languages'->1->>'languageAppKey') = 'frances' and (o->'languages'->1->>'courseId') = 'frances@en', 'C: frances@en -> languageAppKey frances e courseId frances@en'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000c1', 'frances') o) x;
insert into r select (o->'languages'->0->'streak')::int = 3 and (o->'languages'->1->'streak')::int = 3
  and (o->'languages'->0->>'lastStudyDay') = to_char(current_date, 'YYYY-MM-DD'), 'C: _account à frente vale para os dois cursos (sequência 3, hoje)'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000c1', 'frances') o) x;
insert into r select (o->'languages'->1->'ownCardsActive')::int = 2 and (o->'languages'->0->'ownCardsActive')::int = 2, 'C: cartões próprios contam pelo idioma estudado também no frances@en'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000c1', 'frances') o) x;
-- D: o bloco está à frente da conta -> vale o bloco
insert into r select (o->'languages'->0->'streak')::int = 5 and (o->'languages'->0->>'lastStudyDay') = to_char(current_date, 'YYYY-MM-DD'), 'D: _account atrás do bloco não vence (sequência 5)'
  from (select get_teacher_student_overview('75000000-0000-0000-0000-0000000000d1', 'frances') o) x;
-- autorização continua
insert into r select (get_teacher_student_overview('75000000-0000-0000-0000-0000000000b1', 'mandarim')->>'error') = 'not_authorized', 'sem vínculo no idioma -> not_authorized';

-- ---------- get_public_profile_stats (anon pode chamar) ----------
reset role; set local role anon;
insert into r select jsonb_array_length(s->'languages') = 2 and (s->'languages'->0->>'languageAppKey') in ('frances','mandarim'), 'perfil B: 2 idiomas, languageAppKey continua o idioma'
  from (select get_public_profile_stats((select username from profiles where user_id = '75000000-0000-0000-0000-0000000000b1')) s) x;
insert into r select exists (select 1 from jsonb_array_elements(s->'languages') l where l->>'languageAppKey' = 'frances' and l->>'courseId' = 'frances@pt-BR' and (l->>'streak')::int = 4)
  and exists (select 1 from jsonb_array_elements(s->'languages') l where l->>'languageAppKey' = 'mandarim' and l->>'courseId' = 'mandarim@pt-BR' and (l->>'streak')::int = 2), 'perfil B: sem _account, sequência por bloco (4 e 2), courseId com @pt-BR'
  from (select get_public_profile_stats((select username from profiles where user_id = '75000000-0000-0000-0000-0000000000b1')) s) x;
insert into r select jsonb_array_length(s->'languages') = 2
  and exists (select 1 from jsonb_array_elements(s->'languages') l where l->>'courseId' = 'frances@en' and l->>'languageAppKey' = 'frances' and (l->>'streak')::int = 3), 'perfil C: frances e frances@en, ambos com languageAppKey frances, sequência da conta (3)'
  from (select get_public_profile_stats((select username from profiles where user_id = '75000000-0000-0000-0000-0000000000c1')) s) x;
insert into r select (s->'languages'->0->>'lastStudyDay') = to_char(current_date, 'YYYY-MM-DD'), 'perfil C: último dia da conta'
  from (select get_public_profile_stats((select username from profiles where user_id = '75000000-0000-0000-0000-0000000000c1')) s) x;
insert into r select (s->'languages'->0->>'streak')::int = 5, 'perfil D: bloco à frente da conta vence (5)' from (select get_public_profile_stats((select username from profiles where user_id = '75000000-0000-0000-0000-0000000000d1')) s) x;
insert into r select (get_public_profile_stats('naoexiste075')->>'error') = 'not_found', 'perfil inexistente continua not_found';

-- ---------- permissões (iguais às de antes) ----------
reset role;
insert into r select not has_function_privilege('anon', 'public.get_teacher_student_overview(uuid, text)', 'execute'), 'overview: anon sem EXECUTE';
insert into r select has_function_privilege('authenticated', 'public.get_teacher_student_overview(uuid, text)', 'execute'), 'overview: authenticated com EXECUTE';
insert into r select has_function_privilege('anon', 'public.get_public_profile_stats(text)', 'execute'), 'perfil público: anon com EXECUTE';
insert into r select (select prosecdef from pg_proc where oid = 'public.get_teacher_student_overview(uuid, text)'::regprocedure) and (select prosecdef from pg_proc where oid = 'public.get_public_profile_stats(text)'::regprocedure), 'as duas continuam security definer';

select case when ok then 'ok' else 'FALHA' end || '|' || name from r;
select 'total=' || count(*) || ' falhas=' || count(*) filter (where not ok) from r;
rollback;
