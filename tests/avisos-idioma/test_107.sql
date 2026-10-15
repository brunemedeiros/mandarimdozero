-- Teste do 106 (SQL Editor): acabamento da 104. Aviso do Mural de turma de PORTUGUÊS chega em inglês para quem usa o site
-- em inglês; a palavra 'Professora' (nome de reserva) não fica solta na frase em inglês. Roda depois de aplicar o 106 duas vezes. ROLLBACK.
begin;
create temp table r(ok boolean, name text) on commit drop;
insert into auth.users(id, email) values
  ('10600000-0000-0000-0000-0000000000e1', 'en106@example.invalid'),
  ('10600000-0000-0000-0000-0000000000b1', 'pt106@example.invalid');
insert into progress(user_id, data) values
  ('10600000-0000-0000-0000-0000000000e1', '{"_meta":{"uiLanguage":"en"}}'),
  ('10600000-0000-0000-0000-0000000000b1', '{"_meta":{"uiLanguage":"pt-BR"}}');

-- 1. nome de reserva 'Professora'
insert into r select _notif_text_en('mural_post', '📌 Professora postou no mural (turma Turma P): oi') = '📌 Your teacher posted on the board (class Turma P): oi', 'Professora vira "Your teacher" no post';
insert into r select _notif_text_en('mural_comment', '💬 Professora comentou no mural: ok') = '💬 Your teacher commented on the board: ok', 'Professora vira "Your teacher" no comentário';
insert into r select _notif_text_en('mural_classroom', '🏫 Professora colocou você na turma Sábado.') = '🏫 Your teacher added you to the class Sábado.', 'Professora vira "Your teacher" ao entrar na turma';
insert into r select _notif_text_en('mural_classroom_join', '🏫 Professora entrou pelo link na turma T e agora é seu aluno/a de português 🎉') = '🏫 A student joined the class T through your link and is now your Portuguese student 🎉', 'aluno sem nome vira "A student" (turma de português)';
insert into r select _notif_text_en('teacher_invite_accepted', 'Professora aceitou seu convite e agora é seu aluno/a de português 🎉') = 'A student accepted your invitation and is now your Portuguese student 🎉', 'aluno sem nome vira "A student" (convite)';
insert into r select _notif_text_en('teacher_invite_declined', 'Professora recusou o convite para as aulas de francês.') = 'A student declined the invitation to French classes.', 'aluno sem nome vira "A student" (recusa)';
insert into r select _notif_text_en('teacher_invite', 'Professora te convidou para ser aluno/a de chinês 🎓') = 'Your teacher invited you to be their Chinese student 🎓', 'convite da professora sem nome continua "Your teacher" (igual à 104)';

-- 2. nomes de verdade não mudam
insert into r select _notif_text_en('mural_post', '📌 Ana Prof postou no mural: 📎') = '📌 Ana Prof posted on the board: 📎', 'nome de verdade fica como está';

-- 3. idioma `portugues`: quem usa o site em inglês recebe em inglês; quem usa em português recebe como veio
select _mural_notify('10600000-0000-0000-0000-0000000000e1', 'portugues', 'mural_post', '📌 Ana Prof postou no mural (turma Turma P): Leiam a página 3', 'my-mural');
select _mural_notify('10600000-0000-0000-0000-0000000000e1', 'portugues', 'mural_classroom', '🏫 Professora colocou você na turma Turma P.', 'my-mural');
select _mural_notify('10600000-0000-0000-0000-0000000000b1', 'portugues', 'mural_post', '📌 Ana Prof postou no mural (turma Turma P): Leiam a página 3', 'my-mural');
insert into r select (select count(*) from notifications where user_id = '10600000-0000-0000-0000-0000000000e1' and language_app_key = 'portugues'
  and body in ('📌 Ana Prof posted on the board (class Turma P): Leiam a página 3', '🏫 Your teacher added you to the class Turma P.')) = 2,
  'turma de português: avisos em inglês no sino do portugues';
insert into r select not exists (select 1 from notifications n where n.user_id = '10600000-0000-0000-0000-0000000000e1' and n.body ~ '(postou|colocou você|Professora)'),
  'site em inglês: nenhuma palavra em português nos avisos do Mural';
insert into r select (select body from notifications where user_id = '10600000-0000-0000-0000-0000000000b1' and language_app_key = 'portugues') =
  '📌 Ana Prof postou no mural (turma Turma P): Leiam a página 3', 'site em português: aviso igual ao de antes';

-- 4. frase desconhecida continua sem tradução; funções internas fechadas
insert into r select _notif_text_en('mural_post', 'frase nova qualquer') is null, 'frase desconhecida: sem tradução (fica como veio)';
insert into r select not has_function_privilege('authenticated', 'public._who_en(text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public._who_en(text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public._notif_text_en(text,text)', 'EXECUTE'), 'funções internas fechadas';

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
