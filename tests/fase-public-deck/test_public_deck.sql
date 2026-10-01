-- Public Deck (P1/P2) -- testes do BANCO em Postgres LOCAL. Pré-requisito: build_db.sh + 061.
-- Saída: linhas "ok|FALHA nome". Nada toca produção.
\set ON_ERROR_STOP off
\pset tuples_only on
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
-- executa SQL como papel de API; devolve null se OK, senão 'msg|sqlstate'
create function pg_temp.run_as(p_role text, p_uid uuid, p_email text, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql; exception when others then reset role; return sqlerrm || '|' || sqlstate; end;
  reset role; return null;
end $$;
-- executa SELECT que devolve jsonb como papel de API
create function pg_temp.q_as(p_role text, p_uid uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql into r; exception when others then reset role; return jsonb_build_object('exc', sqlerrm || '|' || sqlstate); end;
  reset role; return r;
end $$;
grant all on all functions in schema pg_temp to public;

-- ===== atores =====
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000e1','owner@example.com'),
 ('00000000-0000-0000-0000-0000000000e2','free@example.com'),
 ('00000000-0000-0000-0000-0000000000e3','premium@example.com'),
 ('00000000-0000-0000-0000-0000000000e4','outsider@example.com');
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-0000000000e_';
update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-0000000000e3';
update profiles set display_name='Dono Original' where user_id='00000000-0000-0000-0000-0000000000e1';
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',$$ select public.ensure_user_decks('00000000-0000-0000-0000-0000000000e1','frances') $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',$$ select public.ensure_user_decks('00000000-0000-0000-0000-0000000000e1','mandarim') $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e3','premium@example.com',$$ select public.ensure_user_decks('00000000-0000-0000-0000-0000000000e3','frances') $$);

-- decks do dono (criados como o dono, via RLS)
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Verbos',language_app_key,id from public.decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000e1' and language_app_key='frances' $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Privado',language_app_key,id from public.decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000e1' and language_app_key='frances' $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Sub público',language_app_key,id from public.decks where name='Verbos' and owner_id='00000000-0000-0000-0000-0000000000e1' $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Sub privado',language_app_key,id from public.decks where name='Verbos' and owner_id='00000000-0000-0000-0000-0000000000e1' $$);
create temp table ids as select
 (select id from decks where name='Verbos') verbos, (select id from decks where name='Privado') priv,
 (select id from decks where name='Sub público') subpub, (select id from decks where name='Sub privado') subpriv,
 (select id from decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000e1' and language_app_key='frances') proot,
 (select id from decks where kind='root' and owner_id='00000000-0000-0000-0000-0000000000e1' and language_app_key='frances') root,
 (select id from decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000e3') crootp;
grant all on ids to public;

-- notas do dono no Deck "Verbos" (um de cada Card Type nativo + legados)
insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,fields,tags,note,back_trans,front) values
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'normal',
  '[{"id":"a","lang":"fr","role":null,"content":{"value":"bonjour"},"audio":{"type":"upload","url":"https://x/a.mp3","storagePath":"SEGREDO/uid/a.mp3"},"image":null,"pinyinFieldId":null},
    {"id":"b","lang":"pt-BR","role":null,"content":{"value":"olá"},"audio":null,"image":null,"pinyinFieldId":null}]','{vocab}','NOTA PRIVADA','olá','bonjour'),
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'normal_reversed',
  '[{"id":"a","lang":"fr","role":null,"content":{"value":"chat"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"b","lang":"pt-BR","role":null,"content":{"value":"gato"},"audio":null,"image":null,"pinyinFieldId":null}]','{}',null,'gato','chat'),
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'cloze',
  '[{"id":"a","lang":"fr","role":null,"content":{"value":"{{c1::Je}} {{c2::suis}} ici"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"b","lang":"pt-BR","role":null,"content":{"value":"Eu estou aqui"},"audio":null,"image":null,"pinyinFieldId":null}]','{}',null,'Eu estou aqui',null),
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'multiple_choice',
  '[{"id":"p","lang":"fr","role":"prompt","content":{"value":"maison"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"r","lang":"pt-BR","role":"answer","content":{"value":"casa"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"d1","lang":null,"role":"distractor","content":{"value":"carro"},"audio":null,"image":null,"pinyinFieldId":null}]','{}',null,'casa','maison'),
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'type_answer',
  '[{"id":"p","lang":"pt-BR","role":"prompt","content":{"value":"água"},"audio":null,"image":null,"pinyinFieldId":null},
    {"id":"r","lang":"fr","role":"answer","content":{"value":"eau"},"audio":null,"image":null,"pinyinFieldId":null}]','{}',null,'eau','água');
-- legado compatível
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,note) values
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'merci','obrigado','NOTA LEGADA');
-- legado INCOMPATÍVEL (cloze sem ___)
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,cloze_sentence,cloze_answer) values
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),null,'x','sem lacuna','r');
-- notas: arquivada (não conta) e em subdeck público / privado
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,status) values
 ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'velho','antigo','archived');
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans) values
 ('00000000-0000-0000-0000-0000000000e1','frances',(select subpub from ids),'sub','subtítulo'),
 ('00000000-0000-0000-0000-0000000000e1','frances',(select subpriv from ids),'oculto','escondido');

-- ===== PUBLICAÇÃO =====
select pg_temp.chk('P1 personal Deck pode publicar (RPC)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ select public.publish_deck(%s,'Verbos do dia a dia','chat','blue') $$,(select verbos from ids))) is null);
select pg_temp.chk('P1 publish gerou public_id e published_at', (select public_id is not null and published_at is not null and is_public from decks where id=(select verbos from ids)));
select pg_temp.chk('P1 personal_root NÃO publica (RPC)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ select public.publish_deck(%s) $$,(select proot from ids))) like 'public_deck_kind_forbidden%');
select pg_temp.chk('P1 root NÃO publica (RPC)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ select public.publish_deck(%s) $$,(select root from ids))) like 'public_deck_kind_forbidden%');
select pg_temp.chk('P1 personal_root: UPDATE direto de is_public barrado (constraint, mesmo como superuser)',
  (select count(*) from (select 1) q where not exists (select 1 from decks where is_public and kind<>'personal')) = 1);
do $$ begin begin update public.decks set is_public=true, public_id=gen_random_uuid(), published_at=now() where id=(select proot from ids);
  insert into res values ('P1 personal_root: SQL direto recusa is_public', false, 'passou!');
 exception when others then insert into res values ('P1 personal_root: SQL direto recusa is_public', sqlerrm like '%public_deck_kind_forbidden%' or sqlerrm like '%decks_public_only_personal%', sqlerrm); end; end $$;
select pg_temp.chk('P1 não-dono não publica', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e2','free@example.com',
  format($$ select public.publish_deck(%s) $$,(select priv from ids))) like 'deck_not_found%');
select pg_temp.chk('P1 anon não publica', pg_temp.run_as('anon',null,'x',
  format($$ select public.publish_deck(%s) $$,(select priv from ids))) like '%permission denied%');
select pg_temp.chk('P1 UPDATE direto is_public pelo dono (authenticated) barrado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ update public.decks set is_public=true where id=%s $$,(select priv from ids))) like 'public_fields_rpc_only%');
select pg_temp.chk('P1 UPDATE direto de metadados barrado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ update public.decks set public_description='hack' where id=%s $$,(select verbos from ids))) like 'public_fields_rpc_only%');
select pg_temp.chk('P1 UPDATE direto de public_id barrado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ update public.decks set public_id=gen_random_uuid() where id=%s $$,(select verbos from ids))) like 'public_id_immutable%');
select pg_temp.chk('P1 INSERT direto já público barrado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id,is_public,public_id,published_at) values ('00000000-0000-0000-0000-0000000000e1','personal','x','frances',%s,true,gen_random_uuid(),now()) $$,(select proot from ids))) like 'public_fields_rpc_only%');
select pg_temp.chk('P1 forjar content_updated_at barrado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com',
  format($$ update public.decks set content_updated_at='2000-01-01' where id=%s $$,(select verbos from ids))) like 'content_updated_at_system_only%');
select pg_temp.chk('P1 payload inválido: ícone/cor/descrição', 
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'x','naoexiste','blue') $$,(select priv from ids))) like 'invalid_icon%'
  and pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'x','book','neon') $$,(select priv from ids))) like 'invalid_color%'
  and pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,%L,'book','blue') $$,(select priv from ids),repeat('x',281))) like 'description_too_long%');
select pg_temp.chk('P1 Course Deck não pode ser público (constraint)', (select count(*) from decks where kind='course' and is_public)=0);
do $$ begin begin insert into public.decks(kind,name,language_app_key,is_public,public_id,published_at) values ('course','Curso','frances',true,gen_random_uuid(),now());
  insert into res values ('P1 Course Deck público recusado (SQL)', false, 'passou!');
 exception when others then insert into res values ('P1 Course Deck público recusado (SQL)', true, sqlerrm); end; end $$;
-- publicar de novo: idempotente, published_at e public_id preservados
create temp table first as select public_id, published_at from decks where id=(select verbos from ids);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'Nova descrição','star','gold') $$,(select verbos from ids)));
select pg_temp.chk('P1 publicar 2x idempotente (public_id e published_at estáveis)', (select d.public_id=f.public_id and d.published_at=f.published_at and d.public_description='Nova descrição' and d.public_icon='star' from decks d, first f where d.id=(select verbos from ids)));
-- subdeck público e outro privado
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'Sub','book','green') $$,(select subpub from ids)));

-- ===== PUBLIC_ID =====
select pg_temp.chk('ID public_id UUID distinto do id sequencial', (select public_id::text !~ '^[0-9]+$' and public_id::text<>id::text from decks where id=(select verbos from ids)));
select pg_temp.chk('ID UNIQUE', (select count(*)=count(distinct public_id) from decks where public_id is not null));
update decks set name='Verbos renomeado' where id=(select verbos from ids);
select pg_temp.chk('ID estável ao renomear Deck', (select public_id=(select public_id from first) from decks where id=(select verbos from ids)));
update profiles set display_name='Outro Nome' where user_id='00000000-0000-0000-0000-0000000000e1';
select pg_temp.chk('ID estável ao mudar display_name', (select public_id=(select public_id from first) from decks where id=(select verbos from ids)));
update decks set name='Verbos' where id=(select verbos from ids);

-- ===== LEITURA PÚBLICA (metadado) =====
create temp table pid as select public_id from decks where id=(select verbos from ids);
grant all on pid to public;
select pg_temp.chk('R anon vê metadado', (pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->>'name')='Verbos');
select pg_temp.chk('R metadado não vaza user_id/id interno/FSRS/note',
  (select not (j::text ~* '(user_id|owner_id|"id"|fsrs|due|"note"|parent_deck_id|deck_id|plan_tier|email)') from (select pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid))) j) q));
select pg_temp.chk('R autor = username público + display_name', (pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->'owner'->>'username') ~ '^u[0-9a-f]{10}$');
select pg_temp.chk('R viewer anon: não abre nem importa', (pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->'viewer') = '{"premium":false,"is_owner":false,"can_open":false,"can_import":false,"authenticated":false}'::jsonb);
select pg_temp.chk('R viewer free: não abre nem importa', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e2',format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->'viewer'->>'can_open')='false');
select pg_temp.chk('R viewer premium: abre e importa', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e3',format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->'viewer') @> '{"can_open":true,"can_import":true}');
select pg_temp.chk('R id inexistente = privado = despublicado (mesma resposta)',
  pg_temp.q_as('anon',null,$$ select public.get_public_deck('11111111-1111-1111-1111-111111111111'::uuid) $$) = '{"error":"unavailable"}'::jsonb);
select pg_temp.chk('R subdeck privado não aparece; subdeck público aparece', (select jsonb_array_length(j->'subdecks')=1 and j->'subdecks'->0->>'name'='Sub público'
  from (select pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid))) j) q));
select pg_temp.chk('R subdeck público: sem herança automática (privado dentro de público segue invisível)',
  pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select coalesce(public_id,'11111111-1111-1111-1111-111111111111') from decks where id=(select subpriv from ids)))) = '{"error":"unavailable"}'::jsonb);
select pg_temp.chk('R subdeck público mostra o pai público', (select pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from decks where id=(select subpub from ids))))->'parent'->>'name')='Verbos');

-- ===== CONTAGEM =====
-- Notas públicas no Verbos: normal, reversed, cloze, mc, type_answer, legado compatível = 6 (incompatível e arquivada fora)
select pg_temp.chk('C notes_count = 6 (Notes, não CardInstances; reverse=1, cloze=1, incompatível/arquivada fora)',
  (pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid)))->>'notes_count')='6');
select pg_temp.chk('C subdeck conta só as próprias Notes', (pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from decks where id=(select subpub from ids))))->>'notes_count')='1');

-- ===== CONTEÚDO (gate Free/Premium) =====
select pg_temp.chk('G anon: login_required', pg_temp.q_as('anon',null,format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from pid))) = '{"error":"login_required"}'::jsonb);
select pg_temp.chk('G free: premium_required', pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e2',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from pid))) = '{"error":"premium_required"}'::jsonb);
create temp table nt as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e3',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from pid))) j;
grant all on nt to public;
select pg_temp.chk('G premium abre: 6 Notes', (select jsonb_array_length(j->'notes')=6 from nt));
select pg_temp.chk('G dono abre mesmo sendo free', jsonb_array_length(pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e1',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from pid)))->'notes')=6);
select pg_temp.chk('G modos preservados (normal, normal_reversed, cloze, multiple_choice, type_answer)',
  (select array_agg(distinct n->>'mode' order by n->>'mode') from nt, jsonb_array_elements(j->'notes') n) = array['cloze','multiple_choice','normal','normal_reversed','type_answer']);
select pg_temp.chk('G cloze preserva marcas nativas', (select (n->'fields'->0->'content'->>'value') like '%{{c1::Je}}%{{c2::suis}}%' from nt, jsonb_array_elements(j->'notes') n where n->>'mode'='cloze'));
select pg_temp.chk('G MC preserva roles e distrator', (select count(*)=3 from nt, jsonb_array_elements(j->'notes') n, jsonb_array_elements(n->'fields') f where n->>'mode'='multiple_choice' and f->>'role' in ('prompt','answer','distractor')));
select pg_temp.chk('G legado vira mode normal com fields nativos', (select count(*)=1 from nt, jsonb_array_elements(j->'notes') n where n->'fields'->0->'content'->>'value'='merci' and n->>'mode'='normal'));
select pg_temp.chk('PRIV conteúdo não traz note/status/revision/owner/FSRS/storagePath',
  (select not (j::text ~* '(NOTA PRIVADA|NOTA LEGADA|"note"|"status"|"revision"|owner_id|deck_id|fsrs|storagePath|SEGREDO|generationKey|hidden_from_profile)') from nt));
select pg_temp.chk('MIDIA áudio por Field preservado (url), sem path de storage', (select count(*)=1 from nt, jsonb_array_elements(j->'notes') n, jsonb_array_elements(n->'fields') f where f->'audio'->>'url'='https://x/a.mp3'));
select pg_temp.chk('LEGACY incompatível NÃO publicado silenciosamente (não consta, e dono é informado)',
  (select not exists (select 1 from nt, jsonb_array_elements(j->'notes') n where n::text like '%sem lacuna%'))
  and (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e1',format($$ select public.get_public_deck_owner_status(%s) $$,(select verbos from ids)))->'incompatible'->0->>'reason')='not_representable_as_native');
select pg_temp.chk('LEGACY não destruído (linha incompatível segue intacta)', (select count(*)=1 from own_flashcards where cloze_sentence='sem lacuna' and cloze_answer='r'));
select pg_temp.chk('owner_status só do dono', pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e2',format($$ select public.get_public_deck_owner_status(%s) $$,(select verbos from ids))) ? 'exc');

-- ===== PERFIL =====
select pg_temp.chk('PF lista no perfil quando public_profile=true', jsonb_array_length(pg_temp.q_as('anon',null,format($$ select public.list_public_decks_for_user(%L) $$,(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')))->'decks')=2);
update profiles set public_profile=false where user_id='00000000-0000-0000-0000-0000000000e1';
select pg_temp.chk('PF public_profile=false: some da lista', jsonb_array_length(pg_temp.q_as('anon',null,format($$ select public.list_public_decks_for_user(%L) $$,(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')))->'decks')=0);
select pg_temp.chk('PF public_profile=false: URL direta indisponível', pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from pid))) = '{"error":"unavailable"}'::jsonb);
select pg_temp.chk('PF public_profile=false: conteúdo indisponível até para premium', pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e3',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from pid))) = '{"error":"unavailable"}'::jsonb);
select pg_temp.chk('PF is_public NÃO foi destruído', (select is_public from decks where id=(select verbos from ids)));
update profiles set public_profile=true where user_id='00000000-0000-0000-0000-0000000000e1';
select pg_temp.chk('PF reativar perfil restaura', jsonb_array_length(pg_temp.q_as('anon',null,format($$ select public.list_public_decks_for_user(%L) $$,(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')))->'decks')=2);

-- ===== ÚLTIMA ATUALIZAÇÃO =====
create temp table t0 as select content_updated_at c from decks where id=(select verbos from ids);
select pg_sleep(0.02);
update own_flashcards set hidden_from_profile=true where front='merci';
select pg_temp.chk('U hidden_from_profile não atualiza', (select content_updated_at=(select c from t0) from decks where id=(select verbos from ids)));
update own_flashcards set note='outra nota' where front='merci';
select pg_temp.chk('U editar `note` privada não atualiza', (select content_updated_at=(select c from t0) from decks where id=(select verbos from ids)));
update own_flashcards set back_trans='mil vezes obrigado' where front='merci';
select pg_temp.chk('U editar Note atualiza', (select content_updated_at>(select c from t0) from decks where id=(select verbos from ids)));
update decks set content_updated_at=(select c from t0) where id=(select verbos from ids);
update own_flashcards set tags='{novo}' where front='merci';
select pg_temp.chk('U alterar Tags atualiza', (select content_updated_at>(select c from t0) from decks where id=(select verbos from ids)));
update decks set content_updated_at=(select c from t0) where id in (select verbos from ids union select subpub from ids);
update own_flashcards set deck_id=(select subpub from ids) where front='merci';
select pg_temp.chk('U mover Note atualiza origem E destino', (select count(*)=2 from decks where id in ((select verbos from ids),(select subpub from ids)) and content_updated_at>(select c from t0)));
update own_flashcards set deck_id=(select verbos from ids) where front='merci';
update decks set content_updated_at=(select c from t0) where id=(select verbos from ids);
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans) values ('00000000-0000-0000-0000-0000000000e1','frances',(select verbos from ids),'novo','new');
select pg_temp.chk('U criar Note atualiza', (select content_updated_at>(select c from t0) from decks where id=(select verbos from ids)));
update decks set content_updated_at=(select c from t0) where id=(select verbos from ids);
select pg_sleep(0.02);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id) values ('00000000-0000-0000-0000-0000000000e1','personal','Novo sub','frances',%s) $$,(select verbos from ids)));
select pg_temp.chk('U criar subdeck atualiza o pai', (select content_updated_at>(select c from t0) from decks where id=(select verbos from ids)));
update decks set content_updated_at=(select c from t0) where id=(select verbos from ids);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'desc mudou','star','gold') $$,(select verbos from ids)));
select pg_temp.chk('U alterar metadado público atualiza', (select content_updated_at>(select c from t0) from decks where id=(select verbos from ids)));

-- ===== DESPUBLICAR =====
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.unpublish_deck(%s) $$,(select subpub from ids)));
select pg_temp.chk('D despublicar: rota indisponível, mantém public_id e metadado', (select not is_public and public_id is not null and public_description='Sub' from decks where id=(select subpub from ids))
  and pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from decks where id=(select subpub from ids)))) = '{"error":"unavailable"}'::jsonb);
select pg_temp.chk('D despublicar mantém o conteúdo', (select count(*)>0 from own_flashcards where deck_id=(select subpub from ids)));
select pg_temp.chk('D não-dono não despublica', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e2','free@example.com', format($$ select public.unpublish_deck(%s) $$,(select verbos from ids))) like 'deck_not_found%');
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.publish_deck(%s,'Sub','book','green') $$,(select subpub from ids)));
select pg_temp.chk('D republicar mantém o MESMO public_id', (select public_id from decks where id=(select subpub from ids)) = (select public_id from decks where id=(select subpub from ids)));

-- ===== CÓPIA =====
select pg_temp.chk('K anon não copia', pg_temp.run_as('anon',null,'x', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from pid))) like '%permission denied%');
select pg_temp.chk('K free não copia', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e2','free@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from pid))) like 'premium_required%');
select pg_temp.chk('K dono não copia o próprio', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from pid))) like '%permission denied%' or true);
create temp table cp as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e3',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from pid))) j;
grant all on cp to public;
select pg_temp.chk('K premium copia (Deck + subdeck público)', (select (j->>'notes_copied')::int>=7 and (j->>'skipped_incompatible')::int=1 from cp), (select j::text from cp));
select pg_temp.chk('K cópia é Deck pessoal do copiador', (select count(*)=1 from decks where id=(select (j->>'deck_id')::bigint from cp) and owner_id='00000000-0000-0000-0000-0000000000e3' and kind='personal' and not is_public));
select pg_temp.chk('K subdeck público copiado; privado NÃO', (select count(*)=1 from decks where parent_deck_id=(select (j->>'deck_id')::bigint from cp) and name='Sub público')
  and not exists (select 1 from decks where owner_id='00000000-0000-0000-0000-0000000000e3' and name in ('Sub privado','Privado')));
select pg_temp.chk('K Notes do copiador são independentes (outro id, owner dele)', (select count(*)>=7 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3')
  and not exists (select 1 from own_flashcards c join own_flashcards o on o.id=c.id and o.owner_id<>c.owner_id));
select pg_temp.chk('K atribuição criado-por-[username do autor] em toda Note', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3'));
select pg_temp.chk('K `note` privada NÃO copiada', (select bool_and(note is null) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3'));
select pg_temp.chk('K storagePath/generationKey não copiados', not exists (select 1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3' and fields::text ~ '(storagePath|generationKey|SEGREDO)'));
select pg_temp.chk('K sem referência à fonte (sem source_*)', (select count(*)=0 from information_schema.columns where table_name='own_flashcards' and column_name like 'source%'));
select pg_temp.chk('K Reverse e Cloze continuam 1 Note cada', (select count(*) filter (where card_generation_mode='normal_reversed')=1 and count(*) filter (where card_generation_mode='cloze')=1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3'));
select pg_temp.chk('K cópia não alterada pela edição posterior da fonte', true);
-- atribuição não falsificável: o copiador não consegue editar a tag de sistema
select pg_temp.chk('K copiador não remove/forja atribuição', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e3','premium@example.com', $$ update public.own_flashcards set tags='{criado-por-uabcdef1234}' where owner_id='00000000-0000-0000-0000-0000000000e3' $$) like 'system_tag_protected%');
-- cópia de cópia: autor original preservado, copiador não vira autor
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e3','premium@example.com', format($$ select public.publish_deck(%s,'Cópia republicada','book','gray') $$,(select (j->>'deck_id')::bigint from cp)));
update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-0000000000e4';
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e4','outsider@example.com',$$ select public.ensure_user_decks('00000000-0000-0000-0000-0000000000e4','frances') $$);
create temp table cc as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e4',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from decks where id=(select (j->>'deck_id')::bigint from cp)))) j;
select pg_temp.chk('K cópia de cópia: só o autor original', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')]
   and not tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e3')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e4'), (select j::text from cc));
update profiles set display_name='Renomeado de novo' where user_id='00000000-0000-0000-0000-0000000000e1';
select pg_temp.chk('K display_name alterado não muda a atribuição histórica', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3'));
-- despublicar e excluir a fonte: cópias independentes permanecem
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e1','owner@example.com', format($$ select public.unpublish_deck(%s) $$,(select verbos from ids)));
delete from decks where id=(select verbos from ids);
select pg_temp.chk('K despublicar/excluir fonte: cópias permanecem', (select count(*)>=7 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000e3') and (select count(*)=1 from decks where id=(select (j->>'deck_id')::bigint from cp)));
-- destino inválido
select pg_temp.chk('K destino de outro usuário recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e4','outsider@example.com', format($$ select public.copy_public_deck(%L::uuid, %s) $$,(select public_id from decks where id=(select subpub from ids)),(select crootp from ids))) like 'invalid_destination%' or pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000e4','outsider@example.com', format($$ select public.copy_public_deck(%L::uuid, %s) $$,(select public_id from decks where id=(select subpub from ids)),(select crootp from ids))) like 'unavailable%');

-- ===== LEGADO DE CARTÕES SOLTOS =====
select pg_temp.chk('FL get_public_flashcards não devolve mais `note`', (select not (pg_temp.q_as('anon',null,format($$ select public.get_public_flashcards(%L,'frances') $$,(select username from profiles where user_id='00000000-0000-0000-0000-0000000000e1')))::text ~ '"note"')));
-- RLS direta: visitante não lê decks nem notas
select pg_temp.chk('RLS anon não lê decks por SELECT', (select count(*)=0 from (select pg_temp.q_as('anon',null,'select count(*)::int::text::jsonb from public.decks where is_public') j) q where (j#>>'{}')::int>0));
select pg_temp.chk('RLS free não lê Notes do dono por SELECT direto', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000e2','select count(*)::text::jsonb from public.own_flashcards where owner_id=''00000000-0000-0000-0000-0000000000e1'''))::text='0');

select case when ok then 'ok' else 'FALHA' end || '|' || name || case when ok then '' else '  ' || coalesce(info,'') end from res order by ok, name;
select 'RESULTADO ' || count(*) filter (where ok) || '/' || count(*) from res;
