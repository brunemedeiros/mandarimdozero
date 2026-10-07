-- Fase 11 (i18n): templates de notificação por idioma do SITE.
-- Aditiva: ui_language default 'pt-BR' (todas as linhas atuais continuam
-- valendo igual). Linhas em inglês entram INATIVAS (active=false) até a
-- Brune aprovar os textos (docs/i18n/traducoes-en-pendentes.md, Fase 11);
-- ativar = update notification_templates set active=true where ui_language='en'.
alter table notification_templates add column if not exists ui_language text not null default 'pt-BR';
alter table notification_templates drop constraint if exists notification_templates_ui_language_check;
alter table notification_templates add constraint notification_templates_ui_language_check check (ui_language in ('pt-BR','en'));

create temp table _tr(src_id bigint, title text, body text) on commit drop;
insert into _tr(src_id, title, body) values
  (1, null, 'Hey, did you forget about me? 🥺 Just five little minutes and your daily study is done.'),
  (2, null, 'Your French is right here, waiting for you (with puppy-dog eyes) 🐶'),
  (3, null, 'Hey, did you forget about me? 🥺 Just five little minutes and your daily Mandarin is done.'),
  (4, null, 'Your Chinese is right here, waiting for you (with kitten eyes) 🐱'),
  (5, null, '3 days without showing up... I already miss you! Come say a quick hi? 👋'),
  (6, null, 'Psst. Your French is missing being practiced.'),
  (8, null, 'Psst. Your 谢谢 is missing being practiced.'),
  (9, null, 'Where are you? Your French is still here, on the same page you left it 📖'),
  (10, null, '5 days! How about just one quick exercise to keep the rhythm?'),
  (11, null, 'Where are you? Your Mandarin is still here, on the same page you left it 📖'),
  (13, null, 'A whole week... is everything okay over there? Come on, we''ll pick it back up together 🫶'),
  (14, null, 'Your streak is sleeping. How about waking it up with 5 little minutes?'),
  (17, null, 'It''s been a little while! No rush -- just reminding you that your progress is waiting 🙂'),
  (18, null, 'Want to pick up where you left off? We''ll help you remember quickly.'),
  (21, null, 'No rush at all -- but if you feel like it, your progress is waiting for you here.'),
  (23, null, 'Your French is still safely stored, just the way you left it. Come back whenever you like 🙂'),
  (24, null, 'Your Mandarin is still safely stored, just the way you left it. Come back whenever you like 🙂'),
  (25, null, 'Your progress is still safely stored here, just the way you left it.'),
  (27, 'Points earned!', 'You earned +{{amount}} XP ⭐ Keep it up!'),
  (28, 'Nice!', '+{{amount}} XP in the bag 💪'),
  (31, 'New achievement! 🏅', 'You unlocked the badge "{{badge_name}}" {{badge_icon}}'),
  (33, 'Mission complete! 🎯', '{{mission_label}} — done! Ready for the next one?'),
  (34, 'Nice!', '{{mission_icon}} Mission complete: {{mission_label}}'),
  (35, '🔥 Streak kept!', 'You''ve been studying for {{days}} days in a row. Don''t let it cool down!'),
  (36, '🔥 You studied today!', '{{days}}-day streak. You''re flying!'),
  (39, 'Reviews waiting', '{{dueCount}} words are waiting for review -- some for a few days now 📚'),
  (40, 'Time to review', 'You have {{dueCount}} words ready to review. Shall we?'),
  (43, '🔥 Your streak is at risk!', 'You haven''t studied today yet -- {{days}} days of streak waiting for 5 little minutes from you.'),
  (44, 'Don''t let it go out!', 'Only today is missing to keep your {{days}}-day streak. There''s still time!'),
  (47, 'Almost at today''s goal', '{{lessonsRemaining}} lessons left to hit your daily goal today.'),
  (48, 'Almost there!', 'You''ve already done part of today''s goal -- only {{lessonsRemaining}} lessons left.'),
  (51, '📈 You moved up in the ranking!', 'You''re now No. {{newRank}} in this week''s overall ranking 🎉'),
  (53, 'Someone passed you', 'You dropped to No. {{newRank}} in the overall ranking. Let''s win it back? 💪'),
  (55, '🏆 This week''s result', 'You finished the week at No. {{rank}} of {{totalParticipants}} in the overall ranking. A new week has already started!'),
  (57, 'Almost there for today''s missions', 'You''ve already started today -- {{missing}} daily missions left to finish everything 🎯'),
  (58, 'Almost there!', '{{missing}} of today''s missions are still waiting for you.'),
  (63, 'Show off your achievement! 🏅', 'You''ve already earned a special badge, but you haven''t picked one to show next to your name on the Ranking yet. How about choosing one now?'),
  (64, 'Don''t forget!', 'Your featured badge on the Ranking is still empty -- turn one on in Edit profile.'),
  (67, 'We miss you in French 👋', 'It''s been 9 days since you studied here. No rush at all -- your progress is still saved, exactly as you left it. Whenever you want, just come back.'),
  (68, 'We miss you in Mandarin 👋', 'It''s been 9 days since you studied here. No rush at all -- your progress is still saved, exactly as you left it. Whenever you want, just come back.'),
  (69, 'Your French is waiting for you', '15 days away -- that''s okay, life happens. Just a reminder that your progress is safely stored here, ready for whenever you want to pick it back up.'),
  (70, 'Your Mandarin is waiting for you', '15 days away -- that''s okay, life happens. Just a reminder that your progress is safely stored here, ready for whenever you want to pick it back up.'),
  (71, 'Still there? Your French is waiting', '20 days already! No pressure at all -- just stopping by to remind you that you can pick up right where you left off, at your own pace.'),
  (72, 'Still there? Your Mandarin is waiting', '20 days already! No pressure at all -- just stopping by to remind you that you can pick up right where you left off, at your own pace.'),
  (73, 'A month without French -- everything okay?', 'It''s been a month since you last stopped by. Your progress is still saved, just the way you left it. Whenever you feel like coming back, we''re here.'),
  (74, 'A month without Mandarin -- everything okay?', 'It''s been a month since you last stopped by. Your progress is still saved, just the way you left it. Whenever you feel like coming back, we''re here.'),
  (75, null, 'Haven''t shown up in a few days: {{studentList}}. Maybe it''s time to say hi 👋'),
  (76, null, 'A few days without practice over there: {{studentList}}. A reminder from you might help them get back into rhythm.');

-- Francês e mandarim com texto idêntico compartilham a tradução do francês.
create temp table _map on commit drop as
select s.id as dst_id, coalesce(f.id, s.id) as tr_id
from notification_templates s
left join notification_templates f on f.language_app_key='frances' and f.ui_language='pt-BR' and f.channel=s.channel and f.event_type=s.event_type and f.body=s.body and coalesce(f.title,'')=coalesce(s.title,'')
where s.ui_language='pt-BR';

insert into notification_templates (event_type, channel, language_app_key, icon, title, body, active, ui_language, created_by)
select s.event_type, s.channel, s.language_app_key, s.icon, tr.title, tr.body, false, 'en', 'i18n-fase11'
from notification_templates s
join _map m on m.dst_id = s.id
join _tr tr on tr.src_id = m.tr_id
where s.ui_language = 'pt-BR'
  and not exists (select 1 from notification_templates x where x.ui_language='en' and x.event_type=s.event_type and x.channel=s.channel and x.language_app_key=s.language_app_key and x.body=tr.body);
