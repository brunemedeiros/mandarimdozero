-- Teste da 104: frases do Mural e do convite da professora em inglês para quem usa o site em inglês. ROLLBACK.
begin;
create temp table r(ok boolean, name text) on commit drop;
insert into auth.users(id, email) values
  ('10400000-0000-0000-0000-0000000000e1', 'en104@example.invalid'),
  ('10400000-0000-0000-0000-0000000000b1', 'pt104@example.invalid');
insert into progress(user_id, data) values
  ('10400000-0000-0000-0000-0000000000e1', '{"_meta":{"uiLanguage":"en"}}'),
  ('10400000-0000-0000-0000-0000000000b1', '{"_meta":{"uiLanguage":"pt-BR"}}');
-- frases montadas exatamente como as funções da produção (2026-10-15)
create temp table f(ev text, pt text, en text) on commit drop;
insert into f values
 ('mural_post', '📌 ' || 'Ana Prof' || ' postou no mural' || ' (turma ' || 'Turma A: manhã' || ')' || ': ' || 'Leiam o texto: página 3…',
                '📌 Ana Prof posted on the board (class Turma A: manhã): Leiam o texto: página 3…'),
 ('mural_post', '📌 ' || 'Bia' || ' postou no mural' || '' || ': ' || '📎',
                '📌 Bia posted on the board: 📎'),
 ('mural_comment', '💬 ' || 'Bia' || ' comentou no mural: ' || 'Obrigada!', '💬 Bia commented on the board: Obrigada!'),
 ('mural_classroom', '🏫 ' || 'Ana Prof' || ' colocou você na turma ' || 'Sábado.' || '.', '🏫 Ana Prof added you to the class Sábado..'),
 ('mural_classroom_join', '🏫 ' || 'Caio' || ' entrou pelo link na turma ' || 'Turma B' || ' e agora é seu aluno/a de ' || 'francês' || ' 🎉',
                '🏫 Caio joined the class Turma B through your link and is now your French student 🎉'),
 ('mural_classroom_join', '🏫 ' || 'Caio' || ' entrou pelo link na turma ' || 'Turma B' || '' || ' 🎉',
                '🏫 Caio joined the class Turma B through your link 🎉'),
 ('teacher_invite_accepted', 'Duda' || ' entrou pelo seu link e agora é seu aluno/a de ' || 'chinês' || ' 🎉',
                'Duda joined through your link and is now your Chinese student 🎉'),
 ('teacher_invite_accepted', 'Duda' || ' aceitou seu convite e agora é seu aluno/a de ' || 'português' || ' 🎉',
                'Duda accepted your invitation and is now your Portuguese student 🎉'),
 ('teacher_invite_declined', 'Duda' || ' recusou o convite para as aulas de ' || 'francês' || '.', 'Duda declined the invitation to French classes.'),
 ('teacher_invite', 'Ana Prof' || ' te convidou para ser aluno/a de ' || 'francês' || ' 🎓', 'Ana Prof invited you to be their French student 🎓'),
 ('teacher_invite', 'Professora' || ' te convidou para ser aluno/a de ' || 'chinês' || ' 🎓', 'Your teacher invited you to be their Chinese student 🎓');
insert into r select _notif_text_en(ev, pt) is not distinct from en, 'tradução: ' || ev || ' | ' || left(en, 50) from f;
-- gravação
select _mural_notify('10400000-0000-0000-0000-0000000000e1', 'frances', ev, pt, 'my-mural') from f where ev like 'mural%';
select _mural_notify('10400000-0000-0000-0000-0000000000b1', 'frances', ev, pt, 'my-mural') from f where ev like 'mural%';
select _teacher_notify('10400000-0000-0000-0000-0000000000e1', 'frances', 'supervisao', ev, pt, 'teacher-panel') from f where ev like 'teacher%';
select _teacher_notify('10400000-0000-0000-0000-0000000000b1', 'frances', 'supervisao', ev, pt, 'teacher-panel') from f where ev like 'teacher%';
insert into r select (select count(*) from notifications n join f on f.en = n.body where n.user_id = '10400000-0000-0000-0000-0000000000e1') = 11, 'site em inglês: os 11 avisos gravados em inglês';
insert into r select not exists (select 1 from notifications n where n.user_id = '10400000-0000-0000-0000-0000000000e1'
  and (n.body ~ '(postou|comentou|colocou você|entrou pelo|aceitou|recusou|te convidou|aluno/a)')), 'site em inglês: nenhuma palavra em português';
insert into r select (select count(*) from notifications n join f on f.pt = n.body where n.user_id = '10400000-0000-0000-0000-0000000000b1') = 11, 'site em português: os 11 avisos iguais aos de antes';
insert into r select (select category from notifications where user_id = '10400000-0000-0000-0000-0000000000e1' and event_type = 'mural_post' limit 1) = 'mural'
  and (select category from notifications where user_id = '10400000-0000-0000-0000-0000000000e1' and event_type = 'teacher_invite' limit 1) = 'supervisao', 'categorias mantidas';
-- regras antigas mantidas
select _teacher_notify('10400000-0000-0000-0000-0000000000e1', 'portugues', 'sistema', 'teacher_invite', 'x', 'path');
insert into r select not exists (select 1 from notifications where body = 'x'), '_teacher_notify continua ignorando idioma fora de frances/mandarim';
select _mural_notify(null, 'frances', 'mural_post', 'y', 'my-mural');
insert into r select not exists (select 1 from notifications where body = 'y'), '_mural_notify continua ignorando conta nula';
insert into r select _notif_text_en('mural_post', 'frase nova qualquer') is null, 'frase desconhecida: sem tradução (fica como veio)';
insert into r select not has_function_privilege('authenticated', 'public._mural_notify(uuid,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._teacher_notify(uuid,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public._notif_text_en(text,text)', 'EXECUTE'), 'funções internas fechadas';
select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
