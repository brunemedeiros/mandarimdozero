-- 116 (Etapa 5): permissões efetivas pela tabela Admin > Planos. Postgres LOCAL (run.sh), nunca produção.
-- Contas: grátis, aluno (vínculo ativo), aluno com vínculo removido, Premium Basic, Premium Pro, Premium vencido,
-- professora (não admin) e admin. Saída: linhas "ok|FALHA nome". Tudo dentro de begin ... rollback.
\set ON_ERROR_STOP off
\pset tuples_only on
begin;
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
create function pg_temp.q_as(p_uid uuid, p_email text, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin execute p_sql into r; exception when others then reset role; return jsonb_build_object('exc', sqlerrm || '|' || sqlstate); end;
  reset role; return r;
end $$;
grant all on all functions in schema pg_temp to public;
grant all on res to public;

-- Antes: guarda o que NÃO pode mudar (cartões próprios, papéis, vínculos).
create temp table antes as select
  (select md5(coalesce(string_agg(id::text||status||coalesce(deck_id::text,''), ',' order by id),'')) from own_flashcards) cards,
  1 as x;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000116a1','gratis116@x.com'),
 ('00000000-0000-0000-0000-0000000116a2','aluno116@x.com'),
 ('00000000-0000-0000-0000-0000000116a3','basic116@x.com'),
 ('00000000-0000-0000-0000-0000000116a4','pro116@x.com'),
 ('00000000-0000-0000-0000-0000000116a5','prof116@x.com'),
 ('00000000-0000-0000-0000-0000000116a6','venceu116@x.com'),
 ('00000000-0000-0000-0000-0000000116a7','exaluno116@x.com'),
 ('00000000-0000-0000-0000-0000000116a8','dono116@x.com');
insert into auth.users(id,email) select '00000000-0000-0000-0000-0000000116a9','brunemed1310@gmail.com'
 where not exists (select 1 from auth.users where email='brunemed1310@gmail.com');
insert into profiles(user_id, username) select id, 'u'||right(id::text,4) from auth.users where id::text like '00000000-0000-0000-0000-0000000116a_' on conflict (user_id) do nothing;
insert into account_roles(user_id, role) values
 ('00000000-0000-0000-0000-0000000116a3','premium_basic'),
 ('00000000-0000-0000-0000-0000000116a4','premium_pro'),
 ('00000000-0000-0000-0000-0000000116a5','teacher');
insert into account_roles(user_id, role, expires_at) values ('00000000-0000-0000-0000-0000000116a6','premium_basic', now() - interval '1 day');
insert into account_roles(user_id, role) select id, 'admin' from auth.users where email='brunemed1310@gmail.com' on conflict do nothing;
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('00000000-0000-0000-0000-0000000116a5','00000000-0000-0000-0000-0000000116a2','frances','active'),
 ('00000000-0000-0000-0000-0000000116a5','00000000-0000-0000-0000-0000000116a7','frances','removed');

-- Deck público do dono (conta grátis) com 1 cartão.
select pg_temp.q_as('00000000-0000-0000-0000-0000000116a8','dono116@x.com',$q$select to_jsonb(public.ensure_user_decks('00000000-0000-0000-0000-0000000116a8','frances'))$q$);
insert into decks(owner_id, kind, name, language_app_key, parent_deck_id, is_public, public_id, published_at)
select owner_id, 'personal', 'Deck 116', 'frances', id, true, '00000000-0000-0000-0000-00000000d116', now()
  from decks where owner_id='00000000-0000-0000-0000-0000000116a8' and kind='personal_root' and language_app_key='frances';
insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,fields,tags,back_trans,front) values
 ('00000000-0000-0000-0000-0000000116a8','frances',(select id from decks where public_id='00000000-0000-0000-0000-00000000d116'),'normal',
  '[{"id":"a","lang":"fr","role":null,"content":{"value":"pomme"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"b","lang":"pt-BR","role":null,"content":{"value":"maçã"},"audio":null,"image":null,"pinyinFieldId":null}]','{}','maçã','pomme');
update antes set cards = (select md5(coalesce(string_agg(id::text||status||coalesce(deck_id::text,''), ',' order by id),'')) from own_flashcards);

create temp table conta(uid uuid, email text, nome text);
insert into conta values
 ('00000000-0000-0000-0000-0000000116a1','gratis116@x.com','gratis'),
 ('00000000-0000-0000-0000-0000000116a2','aluno116@x.com','aluno'),
 ('00000000-0000-0000-0000-0000000116a3','basic116@x.com','basic'),
 ('00000000-0000-0000-0000-0000000116a4','pro116@x.com','pro'),
 ('00000000-0000-0000-0000-0000000116a5','prof116@x.com','professora'),
 ('00000000-0000-0000-0000-0000000116a6','venceu116@x.com','premium_vencido'),
 ('00000000-0000-0000-0000-0000000116a7','exaluno116@x.com','ex_aluno'),
 ((select id from auth.users where email='brunemed1310@gmail.com'),'brunemed1310@gmail.com','admin');
grant all on conta to public;
create temp table mp as select c.nome, pg_temp.q_as(c.uid, c.email, 'select public.my_permissions()') j from conta c;
grant all on mp to public;
create function pg_temp.en(n text, k text) returns boolean language sql as $$ select (j->'permissions'->k->>'enabled')::boolean from mp where nome=n $$;
create function pg_temp.lim(n text, k text) returns text language sql as $$ select coalesce(j->'permissions'->k->>'limit','null') from mp where nome=n $$;

-- ===== Matriz esperada (tabela de 2026-10-22 + 116) =====
-- chave -> grátis, aluno, basic, pro, professora, vencido, ex_aluno, admin
create temp table esperado(k text, gratis text, aluno text, basic text, pro text, professora text, vencido text, exaluno text, admin text);
insert into esperado values
 ('own_cards_limit',      '20',  'null','null','null','null','20',  '20',  'null'),
 ('rich_card_formats',    'f',   't',   't',   't',   't',   'f',   'f',   't'),
 ('tts_monthly_quota',    '0',   '300', '300', '300', '300', '0',   '0',   'null'),
 ('public_deck_import',   'f',   't',   't',   't',   't',   'f',   'f',   't'),
 ('public_deck_copy_count','f',  't',   't',   't',   't',   'f',   'f',   't'),
 ('challenges_premium',   'f',   't',   't',   't',   't',   'f',   'f',   't'),
 ('conj_games',           'f',   't',   't',   't',   't',   'f',   'f',   't'),
 ('trail_skip_locked',    'f',   't',   't',   't',   'f',   'f',   'f',   't'),
 ('class_logs_view',      'f',   't',   'f',   'f',   'f',   'f',   'f',   't'),
 ('teacher_panel',        'f',   'f',   'f',   'f',   't',   'f',   'f',   't'),
 ('review_bank',          'f',   'f',   'f',   'f',   't',   'f',   'f',   't');
create function pg_temp.val(n text, k text) returns text language sql as $$
  select case when (select kind from permission_catalog where key=k)='limit' then pg_temp.lim(n,k)
              else left(pg_temp.en(n,k)::text,1) end $$;
select pg_temp.chk('matriz '||e.k||' / '||x.nome, pg_temp.val(x.nome, e.k) = x.v, 'esperado '||x.v||', veio '||coalesce(pg_temp.val(x.nome, e.k),'?'))
  from esperado e cross join lateral (values ('gratis',e.gratis),('aluno',e.aluno),('basic',e.basic),('pro',e.pro),
       ('professora',e.professora),('premium_vencido',e.vencido),('ex_aluno',e.exaluno),('admin',e.admin)) x(nome, v);

-- 'free' (linha Grátis) vem igual para todas as contas, inclusive a admin (Admin Mode desligado)
select pg_temp.chk('free presente para '||nome, j ? 'free' and (j->'free'->'own_cards_limit'->>'limit') = '20'
       and (j->'free'->'rich_card_formats'->>'enabled')::boolean = false and (j->'free'->'tts_monthly_quota'->>'limit') = '0', (j->'free')::text) from mp;
select pg_temp.chk('papel student só com vínculo ativo', (select (j->'roles') ? 'student' from mp where nome='aluno') and not (select (j->'roles') ? 'student' from mp where nome='ex_aluno'));
-- sem login: nada
select pg_temp.chk('sem login: my_permissions vazio', (pg_temp.q_as(null, '', 'select public.my_permissions()') -> 'permissions') = '{}'::jsonb);

-- ===== Deck público (servidor) =====
create temp table pd as select c.nome,
  pg_temp.q_as(c.uid, c.email, $q$select public.get_public_deck('00000000-0000-0000-0000-00000000d116')$q$) deck,
  pg_temp.q_as(c.uid, c.email, $q$select public.get_public_deck_notes('00000000-0000-0000-0000-00000000d116')$q$) notes,
  pg_temp.q_as(c.uid, c.email, $q$select public.check_public_deck_duplicates('00000000-0000-0000-0000-00000000d116', null)$q$) dup,
  pg_temp.q_as(c.uid, c.email, $q$select public.get_public_deck_media_manifest('00000000-0000-0000-0000-00000000d116', null)$q$) man
  from conta c;
grant all on pd to public;
select pg_temp.chk('deck público can_import / '||nome,
   (deck->'viewer'->>'can_import')::boolean = (nome in ('aluno','basic','pro','professora','admin')), deck->>'viewer') from pd;
select pg_temp.chk('deck público notas / '||nome,
   case when nome in ('aluno','basic','pro','professora','admin') then (notes->>'total')::int = 1 else notes->>'error' = 'premium_required' end, notes::text) from pd;
select pg_temp.chk('deck público duplicatas / '||nome,
   case when nome in ('aluno','basic','pro','professora','admin') then (dup->>'source_total')::int = 1 else dup->>'exc' like 'premium_required%' end, left(dup::text,120)) from pd;
select pg_temp.chk('deck público mídia / '||nome,
   case when nome in ('aluno','basic','pro','professora','admin') then (man->>'count')::int = 0 else man->>'exc' like 'premium_required%' end, left(man::text,120)) from pd;
-- copiar: aluno consegue (antes era barrado); grátis continua barrado
select pg_temp.q_as('00000000-0000-0000-0000-0000000116a2','aluno116@x.com',$q$select to_jsonb(public.ensure_user_decks('00000000-0000-0000-0000-0000000116a2','frances'))$q$);
select pg_temp.chk('aluno copia Deck público',
   (pg_temp.q_as('00000000-0000-0000-0000-0000000116a2','aluno116@x.com', $q$select public.copy_public_deck('00000000-0000-0000-0000-00000000d116', null, '{}'::jsonb, null)$q$)->>'notes_copied')::int = 1);
select pg_temp.chk('grátis não copia Deck público',
   pg_temp.q_as('00000000-0000-0000-0000-0000000116a1','gratis116@x.com', $q$select public.copy_public_deck('00000000-0000-0000-0000-00000000d116', null, '{}'::jsonb, null)$q$)->>'exc' like 'premium_required%');
-- a tabela manda: desligar public_deck_import do Aluno barra o aluno na hora
update role_permissions set enabled = false where role='student' and permission_key='public_deck_import';
select pg_temp.chk('tabela manda: aluno sem public_deck_import é barrado',
   pg_temp.q_as('00000000-0000-0000-0000-0000000116a2','aluno116@x.com', $q$select public.get_public_deck_notes('00000000-0000-0000-0000-00000000d116')$q$)->>'error' = 'premium_required');
update role_permissions set enabled = true where role='student' and permission_key='public_deck_import';
-- e ligar para o Grátis libera o grátis
update role_permissions set enabled = true where role='user' and permission_key='public_deck_import';
select pg_temp.chk('tabela manda: Grátis com public_deck_import abre',
   (pg_temp.q_as('00000000-0000-0000-0000-0000000116a1','gratis116@x.com', $q$select public.get_public_deck('00000000-0000-0000-0000-00000000d116')$q$)->'viewer'->>'can_open')::boolean);
update role_permissions set enabled = false where role='user' and permission_key='public_deck_import';
-- dono sem plano continua abrindo o próprio Deck
select pg_temp.chk('dono grátis abre o próprio Deck',
   (pg_temp.q_as('00000000-0000-0000-0000-0000000116a8','dono116@x.com', $q$select public.get_public_deck_notes('00000000-0000-0000-0000-00000000d116')$q$)->>'total')::int = 1);

-- ===== Estrutura =====
select pg_temp.chk('5 RPCs sem plan_tier', (select count(*) from pg_proc where proname in ('get_public_deck','get_public_deck_notes','get_public_deck_media_manifest','check_public_deck_duplicates','copy_public_deck') and prosrc ilike '%plan_tier%') = 0);
select pg_temp.chk('5 RPCs security definer + search_path', (select count(*) from pg_proc where proname in ('get_public_deck','get_public_deck_notes','get_public_deck_media_manifest','check_public_deck_duplicates','copy_public_deck') and prosecdef and proconfig::text like '%search_path=public%') = 5);
select pg_temp.chk('my_permissions sem EXECUTE para anon', not has_function_privilege('anon', 'public.my_permissions()', 'execute'));
select pg_temp.chk('copy_public_deck sem EXECUTE para anon', not has_function_privilege('anon', 'public.copy_public_deck(uuid,bigint,jsonb,jsonb)', 'execute'));
select pg_temp.chk('conj_games no catálogo', exists (select 1 from permission_catalog where key='conj_games' and kind='bool'));
select pg_temp.chk('professora segue sem pular (célula desligada)', not (select enabled from role_permissions where role='teacher' and permission_key='trail_skip_locked'));

-- Nenhum cartão existente mudou (só o copiado pelo aluno foi criado); papéis intactos.
select pg_temp.chk('cartões existentes intactos', (select md5(coalesce(string_agg(id::text||status||coalesce(deck_id::text,''), ',' order by id),'')) from own_flashcards
   where owner_id <> '00000000-0000-0000-0000-0000000116a2') = (select cards from antes));
select case when ok then 'ok' else 'FALHA' end || '|' || name || case when ok then '' else ' :: ' || coalesce(info,'') end from res order by ok, name;
select 'TOTAL ' || count(*) filter (where ok) || '/' || count(*) from res;
rollback;
