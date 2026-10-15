-- 105 -- E6 mínima: o servidor entende o português (`pt`, chave `portugues`, curso `portugues@en`) (2026-10-15).
--
-- Auditoria: docs/i18n/e6-minimo-servidor-pt.md (achados Q2 e Q3). Autorizado pela dona em 2026-10-15. Tudo grátis.
--
-- 1. _progress_block(data, idioma, idioma_do_site?): em que bloco de progress.data mora o progresso de um idioma. MESMA regra
--    do notification-cron (blockForLanguage) e de shared/course-storage.js:
--      sem idioma do site: o curso aberto por último (_meta.currentCourse) quando é deste idioma (chave em
--        _meta.courses[curso].storageKey; senão "idioma@pt-BR" = chave legada sem sufixo; senão o próprio curso), senão a
--        chave legada (frances, mandarim), senão a primeira chave "idioma@..." na ordem do jsonb (a mesma que o cron vê);
--      com idioma do site: só o bloco daquele curso (storageKey registrado; pt-BR de frances/mandarim = chave legada, como o
--        legacyStorage de languages/registry.json; o resto usa o próprio "idioma@site"), sem cair em outro curso.
--    Função pura (immutable), sem security definer.
-- 2. get_teacher_student_metrics (059) e get_teacher_student_deck_counts (078) leem o bloco por _progress_block: o aluno de
--    português (bloco portugues@en) e quem estuda fr/zh no site em inglês (frances@en) deixam de aparecer "sem cartão" no
--    painel da professora. Mesma assinatura, mesma porta (vínculo ativo), mesmos grants. Para contas só com as chaves de
--    hoje (frances, mandarim) o resultado é o MESMO de antes (provado em tests/pt-servidor/test_105.sql).
-- 3. _friends_notify e _friends_notify_msg (102): o aviso de Amigos vai para o sino SÓ nos idiomas que a pessoa estuda
--    (_studied_languages: idiomas com bloco em progress.data, portugues incluído). Conta sem nenhum bloco recebe UMA linha,
--    no idioma atual da conta (_meta.currentLearningLanguage) ou em frances, para o aviso não se perder. O texto continua
--    no idioma do site de quem recebe (_ui_lang, 102); o push continua igual.
--
-- Nada é apagado, nenhuma tabela ou dado muda: só create or replace, aplicável pela ferramenta de migration (MCP).
-- ROLLBACK (manual): reaplicar as definições de get_teacher_student_metrics (059), get_teacher_student_deck_counts (078),
--   _friends_notify e _friends_notify_msg (102), que são create or replace com a mesma assinatura. As duas funções novas
--   (_progress_block, _studied_languages) podem ficar sem uso; removê-las, se um dia quiser, é pelo SQL Editor.

-- ---------- 1. bloco de progresso de um idioma ----------
create or replace function public._progress_block(p_data jsonb, p_app_key text, p_site_lang text default null)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_cur text;
  v_key text;
  v_b jsonb;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or coalesce(p_app_key, '') = '' then
    return null;
  end if;

  -- curso pedido (idioma do site conhecido): só o bloco dele, como shared/course-storage.js:blockFor
  if p_site_lang is not null then
    v_cur := p_app_key || '@' || p_site_lang;
    v_key := coalesce(
      case when jsonb_typeof(p_data #> array['_meta', 'courses', v_cur, 'storageKey']) = 'string'
           then nullif(p_data #>> array['_meta', 'courses', v_cur, 'storageKey'], '') end,
      case when p_site_lang = 'pt-BR' and p_app_key in ('frances', 'mandarim') then p_app_key else v_cur end);
    v_b := p_data -> v_key;
    return case when v_b is not null and v_b not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb) then v_b end;
  end if;

  -- sem idioma do site: mesma regra de blockForLanguage (notification-cron)
  v_cur := p_data #>> '{_meta,currentCourse}';
  if v_cur is not null and split_part(v_cur, '@', 1) = p_app_key then
    v_key := coalesce(p_data #>> array['_meta', 'courses', v_cur, 'storageKey'],
                      case when v_cur = p_app_key || '@pt-BR' then p_app_key else v_cur end);
    v_b := p_data -> v_key;
    if v_b is not null and v_b not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb) then return v_b; end if;
  end if;

  v_b := p_data -> p_app_key;
  if v_b is not null and v_b not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb) then return v_b; end if;

  select e.value into v_b
    from jsonb_each(p_data) with ordinality as e(key, value, ord)
   where left(e.key, length(p_app_key) + 1) = p_app_key || '@'
     and e.value not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
   order by e.ord
   limit 1;
  return v_b;
end;
$$;
revoke all on function public._progress_block(jsonb, text, text) from public, anon, authenticated;

-- ---------- idiomas que a conta estuda (para o sino) ----------
create or replace function public._studied_languages(p_user uuid)
returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_data jsonb;
  v_out text[];
begin
  select data into v_data from progress where user_id = p_user;
  select coalesce(array_agg(l.k order by l.ord), '{}'::text[]) into v_out
    from unnest(array['frances', 'mandarim', 'portugues']) with ordinality as l(k, ord)
   where public._progress_block(v_data, l.k) is not null;
  if cardinality(v_out) > 0 then
    return v_out;
  end if;
  return array[case v_data #>> '{_meta,currentLearningLanguage}' when 'zh' then 'mandarim' when 'pt' then 'portugues' else 'frances' end];
end;
$$;
revoke all on function public._studied_languages(uuid) from public, anon, authenticated;

-- ---------- 2. painel da professora (corpo da 059 e da 078; só muda a leitura do bloco) ----------
create or replace function public.get_teacher_student_metrics(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_lang_data jsonb;
  v_cards jsonb;
  v_now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
  v_out jsonb;
begin
  select exists(
    select 1 from teacher_students ts
    where ts.teacher_id = auth.uid()
      and ts.student_id = p_student_id
      and ts.language_app_key = p_language_app_key
      and ts.status = 'active'
  ) into v_authorized;

  if not v_authorized then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  -- 105: bloco do curso pela mesma regra do notification-cron (frances, frances@en, portugues@en...)
  select public._progress_block(data, p_language_app_key) into v_lang_data
  from progress where user_id = p_student_id;

  v_cards := case when jsonb_typeof(v_lang_data -> 'cards') = 'array'
                  then v_lang_data -> 'cards' else '[]'::jsonb end;

  with rws as (
    select tf.id, (tf.status = 'active') as is_active
    from teacher_flashcards tf
    where tf.teacher_id = auth.uid()
      and tf.student_id = p_student_id
      and tf.language_app_key = p_language_app_key
  ),
  raw as (
    select c from jsonb_array_elements(v_cards) c where jsonb_typeof(c) = 'object'
  ),
  parsed as (
    select c,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' then
          case when c ->> 'origin' = 'teacher' then (c ->> 'rowId')::bigint end
        when (c ->> 'id') ~ '^t[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$'
             and coalesce(c ->> 'origin', 'teacher') = 'teacher' then
          (substring(c ->> 'id' from '^t([0-9]+)'))::bigint
      end as row_id
    from raw
  ),
  nums as (
    select p.row_id, r.is_active,
      case when (p.c ->> 'reps') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'reps')::numeric else 0 end as reps,
      case when (p.c ->> 'lapses') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'lapses')::numeric else 0 end as lapses,
      case when (p.c ->> 'interval') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'interval')::numeric else 0 end as ivl,
      case when (p.c ->> 'due') ~ '^[0-9]+(\.[0-9]+)?$' then (p.c ->> 'due')::numeric else 0 end as due,
      coalesce(nullif(p.c ->> 'state', ''), 'new') as st
    from parsed p
    join rws r on r.id = p.row_id
  ),
  cardx as (
    select row_id, is_active, reps, lapses, ivl, due,
      case when st in ('learning', 'relearning') then 'learning'
           when st = 'review' then 'review'
           when reps > 0 then 'learning'
           else 'new' end as bucket
    from nums
  ),
  active_cards as (select * from cardx where is_active),
  note_agg as (
    -- uma linha por Note ATIVA (inclusive sem nenhum card no progresso)
    select r.id,
      coalesce(bool_or(a.reps > 0), false) as studied,
      -- ranking da irmã estudada: 0 fraca, 1 média, 2 forte; mais fraca = min
      min(case when a.reps > 0 then
            case when a.lapses >= 2 then 0
                 when a.lapses < 2 and a.ivl >= 60 then 2
                 else 1 end
          end) as rank
    from rws r
    left join active_cards a on a.row_id = r.id
    where r.is_active
    group by r.id
  )
  select jsonb_build_object(
    'lastStudyDay', v_lang_data ->> 'lastStudyDay',
    'contentsTotal', (select count(*) from note_agg),
    'contentsStudied', (select count(*) from note_agg where studied),
    'contentsNotStarted', (select count(*) from note_agg where not studied),
    'contentsStrengthNotStarted', (select count(*) from note_agg where not studied),
    'contentsStrengthWeak', (select count(*) from note_agg where studied and rank = 0),
    'contentsStrengthMedium', (select count(*) from note_agg where studied and rank = 1),
    'contentsStrengthStrong', (select count(*) from note_agg where studied and rank = 2),
    'cardsTotal', (select count(*) from active_cards),
    'cardsNew', (select count(*) from active_cards where bucket = 'new'),
    'cardsLearning', (select count(*) from active_cards where bucket = 'learning'),
    'cardsReview', (select count(*) from active_cards where bucket = 'review'),
    'cardsDue', (select count(*) from active_cards where bucket <> 'new' and due > 0 and due <= v_now_ms),
    'archivedNotes', (select count(*) from rws where not is_active),
    'archivedCards', (select count(*) from cardx where not is_active)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.get_teacher_student_metrics(uuid, text) from public;
revoke all on function public.get_teacher_student_metrics(uuid, text) from anon;
grant execute on function public.get_teacher_student_metrics(uuid, text) to authenticated;

create or replace function public.get_teacher_student_deck_counts(p_student_id uuid, p_language_app_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lang_data jsonb;
  v_cards jsonb;
  v_now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
  v_out jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from teacher_students ts
     where ts.teacher_id = auth.uid() and ts.student_id = p_student_id
       and ts.language_app_key = p_language_app_key and ts.status = 'active'
  ) then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  -- 105: bloco do curso pela mesma regra do notification-cron (frances, frances@en, portugues@en...)
  select public._progress_block(data, p_language_app_key) into v_lang_data from progress where user_id = p_student_id;
  v_cards := case when jsonb_typeof(v_lang_data -> 'cards') = 'array' then v_lang_data -> 'cards' else '[]'::jsonb end;

  with recursive
  tree as (
    select d.id, d.parent_deck_id, d.kind, d.name, 0 as depth, d.created_at
      from decks d
     where d.owner_id = p_student_id and d.language_app_key = p_language_app_key
       and (d.kind = 'personal_root' or (d.kind = 'teacher_root' and d.teacher_id = auth.uid()))
    union all
    select c.id, c.parent_deck_id, c.kind, c.name, t.depth + 1, c.created_at
      from decks c join tree t on c.parent_deck_id = t.id
     where c.owner_id = p_student_id and c.language_app_key = p_language_app_key and t.depth < 50
  ),
  closure as (                      -- (ancestral, descendente), inclusive o próprio Deck
    select id as anc, id as des, 0 as lvl from tree
    union all
    select cl.anc, t.id, cl.lvl + 1 from closure cl join tree t on t.parent_deck_id = cl.des where cl.lvl < 50
  ),
  own_rows as (
    select o.id, o.deck_id from own_flashcards o
     where o.owner_id = p_student_id and o.language_app_key = p_language_app_key and o.status = 'active'
  ),
  teacher_rows as (
    select tf.id, tf.deck_id from teacher_flashcards tf
     where tf.teacher_id = auth.uid() and tf.student_id = p_student_id
       and tf.language_app_key = p_language_app_key and tf.status = 'active'
  ),
  raw as (select c from jsonb_array_elements(v_cards) c where jsonb_typeof(c) = 'object'),
  parsed as (
    select c,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' and c ->> 'origin' in ('self', 'teacher') then c ->> 'origin'
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^s[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' and coalesce(c ->> 'origin', 'self') = 'self' then 'self'
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^t[0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' and coalesce(c ->> 'origin', 'teacher') = 'teacher' then 'teacher'
      end as origin,
      case
        when (c ->> 'rowId') ~ '^[0-9]{1,15}$' and c ->> 'origin' in ('self', 'teacher') then (c ->> 'rowId')::bigint
        when c ->> 'rowId' is null and (c ->> 'id') ~ '^[st][0-9]{1,15}(-r[0-9]+)?(-b|-c[0-9]+)?$' then (substring(c ->> 'id' from '^[st]([0-9]+)'))::bigint
      end as row_id
    from raw
  ),
  carded as (
    select coalesce(o.deck_id, t.deck_id) as deck_id,
      case when (p.c ->> 'reps') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p.c ->> 'reps')::numeric else 0 end as reps,
      case when (p.c ->> 'due') ~ '^[0-9]+(\.[0-9]+)?$' then (p.c ->> 'due')::numeric else 0 end as due,
      coalesce(nullif(p.c ->> 'state', ''), 'new') as st
    from parsed p
    left join own_rows o on p.origin = 'self' and o.id = p.row_id
    left join teacher_rows t on p.origin = 'teacher' and t.id = p.row_id
    where (p.origin = 'self' and o.id is not null) or (p.origin = 'teacher' and t.id is not null)
  ),
  bucketed as (
    select deck_id, due,
      case when st in ('learning', 'relearning') then 'learning'
           when st = 'review' then 'review'
           when reps > 0 then 'learning'
           else 'new' end as bucket
    from carded
  ),
  per_deck as (
    select cl.anc as deck_id,
      count(b.bucket) as total,
      count(*) filter (where b.bucket = 'new') as n_new,
      count(*) filter (where b.bucket = 'learning') as n_learning,
      count(*) filter (where b.bucket = 'review') as n_review,
      count(*) filter (where b.bucket <> 'new' and b.due > 0 and b.due <= v_now_ms) as n_due
    from closure cl
    left join bucketed b on b.deck_id = cl.des
    group by cl.anc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'parentId', t.parent_deck_id, 'kind', t.kind, 'name', t.name, 'depth', t.depth,
      'total', pd.total, 'new', pd.n_new, 'learning', pd.n_learning, 'review', pd.n_review, 'due', pd.n_due)
    order by (t.kind in ('teacher_root', 'teacher')), t.depth, lower(t.name), t.id), '[]'::jsonb)
    into v_out
  from tree t join per_deck pd on pd.deck_id = t.id;

  return jsonb_build_object('decks', v_out);
end;
$$;

revoke all on function public.get_teacher_student_deck_counts(uuid, text) from public;
revoke all on function public.get_teacher_student_deck_counts(uuid, text) from anon;
grant execute on function public.get_teacher_student_deck_counts(uuid, text) to authenticated;

-- ---------- 3. avisos de Amigos (corpo da 102; só muda a lista de idiomas) ----------
create or replace function public._friends_notify(
  p_user uuid, p_event text, p_title text, p_body text, p_action_tab text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channels jsonb;
  v_lang text;
  v_set friend_settings%rowtype;
  v_suffix text;
begin
  -- Quem ainda chama com o texto pronto em português (respond_friend_request, da 073: não é recriada aqui porque tem
  -- comando de apagar linha e a ferramenta de migration trava esperando confirmação) passa pelo texto no idioma de quem recebe.
  v_suffix := case p_event when 'friend_request_accepted' then ' aceitou seu pedido de amizade 🎉'
                           when 'friend_request' then ' enviou um pedido de amizade 👋'
                           when 'friend_overtake' then ' passou você no ranking da semana 🏃'
                           when 'friend_thanks' then ' agradeceu seu parabéns 💛' end;
  if v_suffix is not null and right(coalesce(p_body, ''), length(v_suffix)) = v_suffix then
    perform _friends_notify_msg(p_user, p_event, jsonb_build_object('name', left(p_body, length(p_body) - length(v_suffix))), p_action_tab);
    return;
  end if;
  select * into v_set from friend_settings where user_id = p_user;
  if found then
    if p_event = 'friend_request' and not v_set.notify_requests then return; end if;
    if p_event = 'friend_request_accepted' and not v_set.notify_accepts then return; end if;
    if p_event = 'friend_overtake' and not v_set.notify_overtakes then return; end if;
    if p_event in ('friend_congrats', 'friend_thanks') and not v_set.notify_congrats then return; end if;
    if p_event = 'friend_nudge' and not v_set.accept_nudges then return; end if;
    if p_event in ('duo_mission_started', 'duo_mission_done') and not v_set.notify_missions then return; end if;
  end if;
  select channels -> 'amigos' into v_channels from notification_preferences where user_id = p_user;
  if v_channels is not null and jsonb_typeof(v_channels) = 'array' and not (v_channels ? 'in_app') then
    return;
  end if;
  -- 105: só nos idiomas que a pessoa estuda (blocos de progresso), não mais nos dois sites fixos
  foreach v_lang in array public._studied_languages(p_user) loop
    insert into notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
    values (p_user, v_lang, 'amigos', p_event, p_title, p_body, p_action_tab);
  end loop;
end;
$$;
revoke all on function public._friends_notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public._friends_notify_msg(p_user uuid, p_event text, p_params jsonb, p_action_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channels jsonb;
  v_lang text;
  v_set friend_settings%rowtype;
  v_body text;
begin
  select * into v_set from friend_settings where user_id = p_user;
  if found then
    if p_event = 'friend_request' and not v_set.notify_requests then return; end if;
    if p_event = 'friend_request_accepted' and not v_set.notify_accepts then return; end if;
    if p_event = 'friend_overtake' and not v_set.notify_overtakes then return; end if;
    if p_event in ('friend_congrats', 'friend_thanks') and not v_set.notify_congrats then return; end if;
    if p_event = 'friend_nudge' and not v_set.accept_nudges then return; end if;
    if p_event in ('duo_mission_started', 'duo_mission_done') and not v_set.notify_missions then return; end if;
  end if;
  select channels -> 'amigos' into v_channels from notification_preferences where user_id = p_user;
  if v_channels is not null and jsonb_typeof(v_channels) = 'array' and not (v_channels ? 'in_app') then
    return;
  end if;
  v_body := _friends_msg(p_event, _ui_lang(p_user), coalesce(p_params, '{}'::jsonb));
  if v_body is null then return; end if;
  -- 105: só nos idiomas que a pessoa estuda (blocos de progresso), não mais nos dois sites fixos
  foreach v_lang in array public._studied_languages(p_user) loop
    insert into notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
    values (p_user, v_lang, 'amigos', p_event, null, v_body, p_action_tab);
  end loop;
  perform _friends_push(p_user, v_body, p_action_tab);
end;
$$;
revoke all on function public._friends_notify_msg(uuid, text, jsonb, text) from public, anon, authenticated;
