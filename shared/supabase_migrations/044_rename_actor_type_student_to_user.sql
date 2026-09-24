-- Renomeia o valor `'student'` -> `'user'` em usage_events.actor_type,
-- mesmo princípio das migrations 042/043: essa coluna nunca significou
-- "aluno formal" (vínculo em teacher_students) -- é só "não é a conta
-- admin", calculada em trackEvent() (shared/analytics.js) via
-- `isAdminUser() ? 'admin' : 'student'`. Todo evento de qualquer conta
-- não-admin, vinculada ou não a uma professora, cai aqui. Texto livre
-- (não um enum do Postgres -- ver comentário original na migration 008
-- sobre isso), então não há constraint pra recriar, só o default e as
-- linhas já gravadas.
alter table public.usage_events
  alter column actor_type set default 'user';

update public.usage_events
set actor_type = 'user'
where actor_type = 'student';
