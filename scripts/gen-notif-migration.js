const tr=require('../docs/i18n/notif-en.json');
const esc=s=>s===null?'null':"'"+s.replace(/'/g,"''")+"'";
const vals=Object.entries(tr).map(([id,[t,b]])=>`  (${id}, ${esc(t)}, ${esc(b)})`).join(',\n');
const sql=`-- Fase 11 (i18n): templates de notificação por idioma do SITE.
-- Aditiva: ui_language default 'pt-BR' (todas as linhas atuais continuam
-- valendo igual). Linhas em inglês entram INATIVAS (active=false) até a
-- Brune aprovar os textos (docs/i18n/traducoes-en-pendentes.md, Fase 11);
-- ativar = update notification_templates set active=true where ui_language='en'.
alter table notification_templates add column if not exists ui_language text not null default 'pt-BR';
alter table notification_templates drop constraint if exists notification_templates_ui_language_check;
alter table notification_templates add constraint notification_templates_ui_language_check check (ui_language in ('pt-BR','en'));

create temp table _tr(src_id bigint, title text, body text) on commit drop;
insert into _tr(src_id, title, body) values
${vals};

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
`;
require('fs').writeFileSync('shared/supabase_migrations/056_notification_templates_ui_language.sql',sql);
