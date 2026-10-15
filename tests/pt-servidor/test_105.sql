-- Teste da migration 105 (E6 mínima do português no servidor). Postgres LOCAL, tudo numa transação que termina em ROLLBACK:
-- a própria 105 é aplicada AQUI DENTRO (duas vezes), depois de guardar o resultado das funções antigas (059, 078, 102) com os
-- mesmos dados. Variáveis: mig (caminho da 105), cases (conteúdo de progress_block_cases.json). Saída: "ok|..." ou "FALHA|...".
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;

-- ---------- contas ----------
-- T professora; S1 só francês legado; S2 chinês legado + mandarim@en (curso atual pt-BR); S3 francês só no site em inglês
-- (frances@en); S4 português (portugues@en); S5 francês legado + frances@en com o curso atual frances@en.
create temp table ppl(x text, id uuid) on commit drop;
insert into ppl values
  ('T',  '10500000-0000-0000-0000-0000000000a1'), ('S1', '10500000-0000-0000-0000-0000000000b1'),
  ('S2', '10500000-0000-0000-0000-0000000000b2'), ('S3', '10500000-0000-0000-0000-0000000000b3'),
  ('S4', '10500000-0000-0000-0000-0000000000b4'), ('S5', '10500000-0000-0000-0000-0000000000b5'),
  ('F1', '10500000-0000-0000-0000-0000000000c1'), ('F2', '10500000-0000-0000-0000-0000000000c2'),
  ('F3', '10500000-0000-0000-0000-0000000000c3'), ('F4', '10500000-0000-0000-0000-0000000000c4'),
  ('F5', '10500000-0000-0000-0000-0000000000c5'), ('F6', '10500000-0000-0000-0000-0000000000c6'),
  ('F7', '10500000-0000-0000-0000-0000000000c7'), ('F8', '10500000-0000-0000-0000-0000000000c8');
grant all on ppl to public;
insert into auth.users(id, email) select id, lower(x) || '-105@example.invalid' from ppl;
insert into profiles(user_id, username, display_name, public_profile)
select id, 'u105' || lower(x), 'Pessoa ' || x, false from ppl
on conflict (user_id) do update set display_name = excluded.display_name;

create temp table links(s text, lang text) on commit drop;
insert into links values ('S1','frances'), ('S2','mandarim'), ('S3','frances'), ('S4','portugues'), ('S5','frances');
grant all on links to public;
insert into teacher_students(teacher_id, student_id, language_app_key, status)
select (select id from ppl where x = 'T'), p.id, l.lang, 'active' from links l join ppl p on p.x = l.s;

-- Decks (raiz, Meus Decks, Cartões da professora) como a professora (claims da admin só para criar a estrutura)
select set_config('request.jwt.claim.sub', (select id::text from ppl where x = 'T'), true);
select set_config('request.jwt.claims', '{"email":"brunemed1310@gmail.com"}', true);
select count(*) from links l join ppl p on p.x = l.s, lateral public.ensure_teacher_decks(p.id, l.lang);
select count(*) from links l join ppl p on p.x = l.s, lateral public.ensure_user_decks(p.id, l.lang);
select set_config('request.jwt.claims', '', true);

-- 4 Notes da professora e 2 próprias por aluno/idioma
create temp table rowsx(s text, lang text, origin text, n int, id bigint) on commit drop;
grant all on rowsx to public;
do $$
declare l record; i int; v_id bigint; v_troot bigint; v_proot bigint; v_t uuid := (select id from ppl where x = 'T');
begin
  for l in select links.s, links.lang, ppl.id from links join ppl on ppl.x = links.s loop
    select id into v_troot from decks where owner_id = l.id and language_app_key = l.lang and kind = 'teacher_root';
    select id into v_proot from decks where owner_id = l.id and language_app_key = l.lang and kind = 'personal_root';
    for i in 1..4 loop
      insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, status, deck_id)
      values (v_t, l.id, l.lang, 'f' || i, 'b' || i, case when i = 4 then 'archived' else 'active' end, v_troot) returning id into v_id;
      insert into rowsx values (l.s, l.lang, 'teacher', i, v_id);
    end loop;
    for i in 1..2 loop
      insert into own_flashcards(owner_id, language_app_key, front, back_trans, status, deck_id)
      values (l.id, l.lang, 'o' || i, 'o' || i, 'active', v_proot) returning id into v_id;
      insert into rowsx values (l.s, l.lang, 'self', i, v_id);
    end loop;
  end loop;
end $$;

-- cartões de um bloco: os 4 da professora (1 review devido, 1 learning, 1 new, 1 arquivado) + 2 próprios (1 review, 1 new)
create or replace function pg_temp.cards(p_s text, p_lang text, p_mul int) returns jsonb language sql as $f$
  select jsonb_agg(jsonb_build_object('id', case when x.origin = 'teacher' then 't' else 's' end || x.id, 'rowId', x.id, 'origin', x.origin,
    'reps', case when x.n = 3 or (x.origin = 'self' and x.n = 2) then 0 else x.n * p_mul end,
    'state', case when x.n = 1 then 'review' when x.n = 2 and x.origin = 'teacher' then 'learning' when x.n = 4 then 'review' else 'new' end,
    'lapses', case when x.n = 2 then 2 else 0 end, 'interval', 70, 'due', case when x.n = 1 then 1000 else 99999999999999 end) order by x.origin, x.n)
  from rowsx x where x.s = p_s and x.lang = p_lang
$f$;
insert into progress(user_id, data)
select p.id, case p.x
  when 'S1' then jsonb_build_object('frances', jsonb_build_object('lastStudyDay', '2026-10-01', 'cards', pg_temp.cards('S1', 'frances', 1)))
  when 'S2' then jsonb_build_object('mandarim', jsonb_build_object('lastStudyDay', '2026-10-02', 'cards', pg_temp.cards('S2', 'mandarim', 1)),
                                    'mandarim@en', jsonb_build_object('lastStudyDay', '2026-10-09', 'cards', '[]'::jsonb),
                                    '_meta', jsonb_build_object('currentCourse', 'mandarim@pt-BR', 'courses', jsonb_build_object('mandarim@pt-BR', jsonb_build_object('storageKey', 'mandarim'))))
  when 'S3' then jsonb_build_object('frances@en', jsonb_build_object('lastStudyDay', '2026-10-03', 'cards', pg_temp.cards('S3', 'frances', 1)),
                                    '_meta', jsonb_build_object('uiLanguage', 'en', 'currentCourse', 'frances@en'))
  when 'S4' then jsonb_build_object('portugues@en', jsonb_build_object('lastStudyDay', '2026-10-04', 'cards', pg_temp.cards('S4', 'portugues', 1)),
                                    '_meta', jsonb_build_object('uiLanguage', 'en', 'currentCourse', 'portugues@en'))
  when 'S5' then jsonb_build_object('frances', jsonb_build_object('lastStudyDay', '2026-09-01', 'cards', '[]'::jsonb),
                                    'frances@en', jsonb_build_object('lastStudyDay', '2026-10-05', 'cards', pg_temp.cards('S5', 'frances', 1)),
                                    '_meta', jsonb_build_object('uiLanguage', 'en', 'currentCourse', 'frances@en', 'courses', jsonb_build_object('frances@en', jsonb_build_object('storageKey', 'frances@en'))))
  end
from ppl p where p.x like 'S%';
create temp table snap as select md5(string_agg(user_id::text || data::text, ',' order by user_id)) h from progress where user_id in (select id from ppl where x like 'S%');
grant all on snap to public;

-- ---------- ANTES da 105: resultado das funções antigas ----------
create temp table outx(phase text, s text, lang text, metrics jsonb, decks jsonb) on commit drop;
grant all on outx to public;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select id::text from ppl where x = 'T'), true);
insert into outx select 'old', l.s, l.lang, public.get_teacher_student_metrics(p.id, l.lang), public.get_teacher_student_deck_counts(p.id, l.lang)
from links l join ppl p on p.x = l.s;
reset role;

-- ---------- aplica a 105 (duas vezes: idempotente) ----------
\i :mig
\i :mig

set local role authenticated;
select set_config('request.jwt.claim.sub', (select id::text from ppl where x = 'T'), true);
insert into outx select 'new', l.s, l.lang, public.get_teacher_student_metrics(p.id, l.lang), public.get_teacher_student_deck_counts(p.id, l.lang)
from links l join ppl p on p.x = l.s;
-- outra professora (sem vínculo) continua barrada
select set_config('request.jwt.claim.sub', (select id::text from ppl where x = 'F1'), true);
insert into r select (public.get_teacher_student_metrics((select id from ppl where x = 'S4'), 'portugues') ->> 'error') = 'not_authorized'
  and (public.get_teacher_student_deck_counts((select id from ppl where x = 'S4'), 'portugues') ->> 'error') = 'not_authorized',
  'sem vínculo: as duas RPCs continuam barradas';
reset role;

create temp view cmp as
  select o.s, o.lang, o.metrics om, n.metrics nm, o.decks od, n.decks nd from outx o join outx n on n.s = o.s and n.lang = o.lang and n.phase = 'new' where o.phase = 'old';
insert into r select (select om = nm and od = nd from cmp where s = 'S1'), 'S1 (só francês legado): métricas e Decks IGUAIS aos de antes';
insert into r select (select om = nm and od = nd from cmp where s = 'S2'), 'S2 (chinês legado + mandarim@en, curso atual pt-BR): IGUAIS aos de antes';
insert into r select (select md5(string_agg(om::text || od::text, '|' order by s)) = md5(string_agg(nm::text || nd::text, '|' order by s)) from cmp where s in ('S1', 'S2')),
  'hash das contas só com chaves de hoje: igual antes e depois';
insert into r select (select (om ->> 'cardsTotal')::int = 0 and om ->> 'lastStudyDay' is null from cmp where s = 'S4'), 'S4 (português) ANTES: aparecia sem cartão (o erro)';
insert into r select (select (nm ->> 'cardsTotal')::int = 3 and (nm ->> 'contentsTotal')::int = 3 and (nm ->> 'cardsDue')::int = 1
  and (nm ->> 'cardsReview')::int = 1 and (nm ->> 'cardsLearning')::int = 1 and (nm ->> 'archivedCards')::int = 1
  and nm ->> 'lastStudyDay' = '2026-10-04' from cmp where s = 'S4'), 'S4 (portugues@en) DEPOIS: 3 cartões ativos da professora, FSRS e último dia de estudo';
insert into r select (select nm - 'lastStudyDay' = (select metrics - 'lastStudyDay' from outx where phase = 'new' and s = 'S1') from cmp where s = 'S4'),
  'S4 tem as mesmas contagens de S1 (mesmos cartões, outro idioma)';
insert into r select (select (om ->> 'cardsTotal')::int = 0 and (nm ->> 'cardsTotal')::int = 3 and nm ->> 'lastStudyDay' = '2026-10-03' from cmp where s = 'S3'),
  'S3 (francês no site em inglês, frances@en): antes sem cartão, agora com';
insert into r select (select (om ->> 'cardsTotal')::int = 0 and (nm ->> 'cardsTotal')::int = 3 and nm ->> 'lastStudyDay' = '2026-10-05' from cmp where s = 'S5'),
  'S5 (frances + frances@en, curso atual @en): lê o curso atual, como o cron';
insert into r select (select (select sum((d ->> 'total')::int) from jsonb_array_elements(od -> 'decks') d where d ->> 'kind' in ('personal_root', 'teacher_root')) = 0
  and (select sum((d ->> 'total')::int) from jsonb_array_elements(nd -> 'decks') d where d ->> 'kind' in ('personal_root', 'teacher_root')) = 5 from cmp where s = 'S4'),
  'Decks do S4: antes 0 cartões, agora 5 (3 da professora ativos + 2 próprios)';
insert into r select (select (select (d ->> 'due')::int from jsonb_array_elements(nd -> 'decks') d where d ->> 'kind' = 'teacher_root') = 1 from cmp where s = 'S4'),
  'Decks do S4: o cartão devido da professora aparece';

-- ---------- _progress_block: os MESMOS casos do teste Node (cron e shared/course-storage.js) ----------
create temp table cases as select c from jsonb_array_elements(:'cases'::jsonb) c;
insert into r select public._progress_block(c -> 'data', c ->> 'app', c ->> 'site') is not distinct from
  case when jsonb_typeof(c -> 'expect') = 'null' then null else c -> 'expect' end, '_progress_block: ' || (c ->> 'name') from cases;
insert into r select public._progress_block('[1]'::jsonb, 'frances') is null and public._progress_block('{"frances":{}}'::jsonb, '') is null, '_progress_block: entrada estranha devolve null';

-- ---------- avisos de Amigos: só nos idiomas que a pessoa estuda ----------
insert into progress(user_id, data) values
  ((select id from ppl where x = 'F1'), '{"portugues@en": {"streak": 1}, "_meta": {"uiLanguage": "en"}}'),
  ((select id from ppl where x = 'F2'), '{"frances": {"streak": 1}, "mandarim@en": {"streak": 1}}'),
  ((select id from ppl where x = 'F3'), '{"frances": {"streak": 1}}'),
  ((select id from ppl where x = 'F5'), '{"_meta": {"currentLearningLanguage": "pt", "uiLanguage": "en"}}'),
  ((select id from ppl where x = 'F6'), '{"frances@en": {"x": 1}, "portugues@en": {"x": 1}, "_meta": {"uiLanguage": "en"}}'),
  ((select id from ppl where x = 'F7'), '{"portugues@en": {"x": 1}, "_meta": {"uiLanguage": "en"}}'),
  ((select id from ppl where x = 'F8'), '{"portugues@en": {"x": 1}, "_meta": {"uiLanguage": "en"}}');
insert into friend_settings(user_id, notify_requests) values ((select id from ppl where x = 'F7'), false);
insert into notification_preferences(user_id, channels) values ((select id from ppl where x = 'F8'), '{"amigos": ["push"]}');
select count(*) as n_other from notifications where user_id not in (select id from ppl) \gset
select public._friends_notify_msg(id, 'friend_request', '{"name": "Ana"}', 'friends') from ppl where x like 'F%';
create temp view fr as select p.x, string_agg(n.language_app_key, ',' order by n.language_app_key) langs, string_agg(distinct n.body, ' / ') bodies
  from ppl p left join notifications n on n.user_id = p.id and n.event_type = 'friend_request' where p.x like 'F%' group by p.x;
insert into r select (select langs = 'portugues' and bodies = 'Ana sent you a friend request 👋' from fr where x = 'F1'), 'F1 (só portugues@en, site em inglês): 1 aviso no sino do português, em inglês';
insert into r select (select langs = 'frances,mandarim' from fr where x = 'F2'), 'F2 (frances + mandarim@en): francês e chinês';
insert into r select (select langs = 'frances' and bodies = 'Ana enviou um pedido de amizade 👋' from fr where x = 'F3'), 'F3 (só francês): só francês, em português (antes: francês e chinês)';
insert into r select (select langs = 'frances' from fr where x = 'F4'), 'F4 (sem progresso): 1 aviso, não se perde';
insert into r select (select langs = 'portugues' from fr where x = 'F5'), 'F5 (sem bloco, idioma atual pt): 1 aviso em portugues';
insert into r select (select langs = 'frances,portugues' and bodies = 'Ana sent you a friend request 👋' from fr where x = 'F6'), 'F6 (frances@en + portugues@en): francês e português, em inglês';
insert into r select (select langs is null from fr where x = 'F7'), 'F7 desligou pedidos de amizade: nada';
insert into r select (select langs is null from fr where x = 'F8'), 'F8 sem sino de Amigos nas preferências: nada';
-- texto pronto antigo (respond_friend_request, 073) passa por _friends_notify
select public._friends_notify(id, 'friend_request_accepted', null, 'Bia aceitou seu pedido de amizade 🎉', 'friends') from ppl where x in ('F1', 'F3');
insert into r select (select count(*) = 1 and min(body) = 'Bia accepted your friend request 🎉' and min(language_app_key) = 'portugues' from notifications
  where user_id = (select id from ppl where x = 'F1') and event_type = 'friend_request_accepted'), '_friends_notify (texto antigo): F1 recebe em inglês, só em portugues';
insert into r select (select count(*) = 1 and min(language_app_key) = 'frances' from notifications
  where user_id = (select id from ppl where x = 'F3') and event_type = 'friend_request_accepted'), '_friends_notify (texto antigo): F3 só em frances';
select public._friends_notify(id, 'outro_evento', null, 'texto livre', 'friends') from ppl where x = 'F6';
insert into r select (select string_agg(language_app_key, ',' order by language_app_key) = 'frances,portugues' from notifications
  where user_id = (select id from ppl where x = 'F6') and event_type = 'outro_evento'), '_friends_notify (texto livre): idiomas da pessoa';
insert into r select (select count(*) from notifications where user_id not in (select id from ppl)) = :n_other, 'nenhuma outra conta recebeu aviso';

-- ---------- segurança e dados ----------
insert into r select not has_function_privilege('anon', 'public.get_teacher_student_metrics(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.get_teacher_student_deck_counts(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.get_teacher_student_metrics(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.get_teacher_student_deck_counts(uuid, text)', 'execute'), 'grants das RPCs do painel iguais aos de antes';
insert into r select not has_function_privilege('authenticated', 'public._progress_block(jsonb, text, text)', 'execute')
  and not has_function_privilege('anon', 'public._progress_block(jsonb, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public._studied_languages(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public._friends_notify_msg(uuid, text, jsonb, text)', 'execute')
  and not has_function_privilege('authenticated', 'public._friends_notify(uuid, text, text, text, text)', 'execute'), 'funções internas fechadas';
insert into r select (select bool_and(prosecdef) and bool_and(proconfig @> array['search_path=public']) from pg_proc
  where proname in ('get_teacher_student_metrics', 'get_teacher_student_deck_counts', '_friends_notify', '_friends_notify_msg') and pronamespace = 'public'::regnamespace),
  'security definer + search_path nas funções recriadas';
insert into r select (select not prosecdef and provolatile = 'i' from pg_proc where proname = '_progress_block' and pronamespace = 'public'::regnamespace), '_progress_block pura (immutable, sem security definer)';
insert into r select (select h from snap) = (select md5(string_agg(user_id::text || data::text, ',' order by user_id)) from progress where user_id in (select id from ppl where x like 'S%')),
  'progresso dos alunos intacto';

select case when ok then 'ok|' else 'FALHA|' end || name from r;
select 'total=' || count(*) || ' falhas=' || count(*) filter (where not ok) from r;
rollback;
