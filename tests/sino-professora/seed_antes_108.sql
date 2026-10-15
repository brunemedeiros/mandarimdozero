-- Avisos gravados ANTES da 108 (banco local descartável): como estão na produção hoje.
insert into auth.users(id, email) values
  ('10500000-0000-0000-0000-0000000000f1', 'old105t@x.invalid'),
  ('10500000-0000-0000-0000-0000000000f2', 'old105s@x.invalid');
insert into notifications (user_id, language_app_key, category, event_type, title, body, action_tab, read_at, created_at) values
  ('10500000-0000-0000-0000-0000000000f1', 'frances',  'supervisao', 'student_inactive_alert', null, 'Sem aparecer há alguns dias: Ana (3 dias). Talvez seja hora de mandar um alô 👋', 'admin-badges', null, '2026-10-01T10:00:00Z'),
  ('10500000-0000-0000-0000-0000000000f1', 'mandarim', 'supervisao', 'teacher_invite_accepted', null, 'Bia aceitou seu convite e agora é seu aluno/a de chinês 🎉', 'teacher-panel', '2026-10-02T09:00:00Z', '2026-10-02T08:00:00Z'),
  ('10500000-0000-0000-0000-0000000000f1', 'frances',  'mural', 'mural_post', null, '📌 Caio postou no mural: Oi!', 'teacher-mural', null, '2026-10-03T08:00:00Z'),
  ('10500000-0000-0000-0000-0000000000f1', 'frances',  'gamificacao', 'xp_earned', 'Boa!', '+20 XP', null, null, '2026-10-04T08:00:00Z'),
  ('10500000-0000-0000-0000-0000000000f2', 'frances',  'mural', 'mural_post', null, '📌 Tereza postou no mural: Leiam', 'my-mural', null, '2026-10-05T08:00:00Z'),
  ('10500000-0000-0000-0000-0000000000f2', 'frances',  'sistema', 'teacher_invite', null, 'Tereza te convidou para ser aluno/a de francês 🎓', 'path', null, '2026-10-06T08:00:00Z');
-- hash das linhas antigas (todas as colunas que já existiam) para conferir depois da 108
create table public._t105_before as
  select md5(string_agg(concat_ws('|', id, user_id, language_app_key, category, event_type, title, body, action_tab, read_at, clicked_at, created_at), ',' order by id)) as h,
         count(*) as n
    from notifications;
create table public._t105_tmpl_before as
  select md5(string_agg(concat_ws('|', id, event_type, channel, language_app_key, title, body, active, ui_language), ',' order by id)) as h, count(*) as n
    from notification_templates;
