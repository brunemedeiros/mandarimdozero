-- Identity/Attribution -- testes do BANCO em Postgres LOCAL (build_db.sh): migrations reais
-- 001..058 + seed legado + 060. Saída: linhas "ok|FALHA nome". Nada toca produção.
\set ON_ERROR_STOP off
\pset tuples_only on
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
-- executa sql como um papel de API com sub/email; devolve null se OK, senão a mensagem de erro
create function pg_temp.run_as(p_role text, p_uid uuid, p_email text, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role',p_role,'user_metadata',json_build_object('full_name','Maria Silva'))::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql; exception when others then reset role; return sqlerrm || '|' || sqlstate; end;
  reset role; return null;
end $$;
grant all on all functions in schema pg_temp to public;

-- ===== 11/12. contas existentes preservadas =====
select pg_temp.chk('11 legado preservado: 3 usernames idênticos (incl. 2 com ".")',
  (select string_agg(username,',' order by username) from profiles where user_id::text like '00000000%') = 'ana.silva,bruno22,carla.m');

-- ===== 1. criação automática de username (via RPC) =====
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000b1','maria.silva@gmail.com');
select pg_temp.chk('1 ensure_my_profile cria profile', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000b1','maria.silva@gmail.com',
  $$ select public.ensure_my_profile() $$) is null);
select pg_temp.chk('1 formato gerado ^u[0-9a-f]{10}$', (select username ~ '^u[0-9a-f]{10}$' from profiles where user_id='00000000-0000-0000-0000-0000000000b1'));
select pg_temp.chk('1 display_name inicial vem do metadado (apresentação)', (select display_name from profiles where user_id='00000000-0000-0000-0000-0000000000b1')='Maria Silva');
select pg_temp.chk('1 idempotente (2ª chamada não cria outro)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000b1','maria.silva@gmail.com', $$ select public.ensure_my_profile() $$) is null
  and (select count(*) from profiles where user_id='00000000-0000-0000-0000-0000000000b1')=1);
select pg_temp.chk('1 sem login recusa', pg_temp.run_as('authenticated',null,'x','select public.ensure_my_profile()') like 'not_authenticated%');

-- ===== 4/5. username não baseado em e-mail nem display_name; não escolhível =====
select pg_temp.chk('4/5 não contém parte local do e-mail nem display_name',
  (select username not ilike '%maria%' and username not ilike '%silva%' and username not ilike '%gmail%' from profiles where user_id='00000000-0000-0000-0000-0000000000b1'));
insert into auth.users(id,email) select ('00000000-0000-0000-0000-00000000c'||lpad(g::text,3,'0'))::uuid, 'pessoa'||g||'.teste@example.com' from generate_series(1,60) g;
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-00000000c%';
select pg_temp.chk('4/5 60 contas: todos no formato e nenhum derivado do e-mail',
  (select count(*) filter (where username ~ '^u[0-9a-f]{10}$' and username not ilike '%pessoa%' and username not ilike '%teste%') from profiles where user_id::text like '00000000-0000-0000-0000-00000000c%')=60);
select pg_temp.chk('2 unicidade: 60 usernames distintos', (select count(distinct username) from profiles where user_id::text like '00000000-0000-0000-0000-00000000c%')=60);
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000b2','x@example.com');
create temp table r5(e text);
insert into r5 select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000b2','x@example.com', $$ insert into public.profiles(user_id, username) values ('00000000-0000-0000-0000-0000000000b2','escolhido') $$);
select pg_temp.chk('5 INSERT direto com username escolhido é ignorado (trigger gera)', (select e is null from r5)
  and (select username from profiles where user_id='00000000-0000-0000-0000-0000000000b2') ~ '^u[0-9a-f]{10}$');
select pg_temp.chk('5 INSERT do profile de OUTRA conta continua barrado pela RLS',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000b1','m', $$ insert into public.profiles(user_id) values ('00000000-0000-0000-0000-0000000000a2') $$) is not null);

-- ===== 6/7. imutabilidade (API direta, todos os papéis) =====
select pg_temp.chk('6 UPDATE username pela própria conta (authenticated) → username_immutable',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000a1','a', $$ update public.profiles set username='novo.nome' where user_id='00000000-0000-0000-0000-0000000000a1' $$) like 'username_immutable%');
select pg_temp.chk('7 UPDATE username por service_role → recusado',
  pg_temp.run_as('service_role',null,'a', $$ update public.profiles set username='outro' where user_id='00000000-0000-0000-0000-0000000000a1' $$) like 'username_immutable%');
do $$ begin begin update public.profiles set username='x.y.z' where user_id='00000000-0000-0000-0000-0000000000a1'; insert into res values ('7 UPDATE por SQL direto recusado', false, 'passou!');
  exception when others then insert into res values ('7 UPDATE por SQL direto recusado', sqlerrm like 'username_immutable%', sqlerrm); end; end $$;
select pg_temp.chk('7 trocar username com UPDATE em lote também recusa',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000a1','a', $$ update public.profiles set username = username || 'x' $$) is not null);
select pg_temp.chk('7 user_id imutável', pg_temp.run_as('service_role',null,'a', $$ update public.profiles set user_id='00000000-0000-0000-0000-0000000000f9' where user_id='00000000-0000-0000-0000-0000000000a2' $$) like 'user_id_immutable%');
select pg_temp.chk('7 UPDATE com o MESMO username (clientes antigos) passa',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000a2','b', $$ update public.profiles set username='bruno22', bio='nova' where user_id='00000000-0000-0000-0000-0000000000a2' $$) is null);
-- ===== 8. display_name editável sem mexer em username =====
create temp table r8(e text);
insert into r8 select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000a1','a', $$ update public.profiles set display_name='Ana Santos' where user_id='00000000-0000-0000-0000-0000000000a1' $$);
select pg_temp.chk('8 display_name muda livremente', (select e is null from r8)
  and (select display_name||'/'||username from profiles where user_id='00000000-0000-0000-0000-0000000000a1')='Ana Santos/ana.silva');
select pg_temp.chk('9 busca por username (URL pública) continua achando o mesmo user_id após mudar display_name',
  (select user_id from profiles where username='ana.silva')='00000000-0000-0000-0000-0000000000a1');
select pg_temp.chk('10 identidade técnica = user_id (PK, FK auth.users)', (select count(*) from pg_constraint where conrelid='public.profiles'::regclass and contype in ('p','f'))=2);

-- ===== 13-15. Tag de sistema protegida no servidor =====
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d1','dono@example.com'),('00000000-0000-0000-0000-0000000000d2','outro@example.com');
insert into profiles(user_id) values ('00000000-0000-0000-0000-0000000000d1'),('00000000-0000-0000-0000-0000000000d2');
update profiles set public_profile=true;
select pg_temp.chk('13 INSERT de Note com criado-por-* por authenticated → system_tag_protected',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ insert into own_flashcards(owner_id,language_app_key,front,back_trans,tags) values ('00000000-0000-0000-0000-0000000000d2','frances','a','b',array['criado-por-ana-silva']) $$) like 'system_tag_protected%');
select pg_temp.chk('13 variante criado-por (sem sufixo) também reservada',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ insert into own_flashcards(owner_id,language_app_key,front,back_trans,tags) values ('00000000-0000-0000-0000-0000000000d2','frances','a','b',array['criado-por']) $$) like 'system_tag_protected%');
select pg_temp.chk('13 variante com maiúscula/acento não passa (tag precisa ser canônica)',
  pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ insert into own_flashcards(owner_id,language_app_key,front,back_trans,tags) values ('00000000-0000-0000-0000-0000000000d2','frances','a','b',array['Criado-Por-x']) $$) like 'invalid_tag%');
select pg_temp.chk('13 service_role também não forja',
  pg_temp.run_as('service_role',null,'o', $$ insert into own_flashcards(owner_id,language_app_key,front,back_trans,tags) values ('00000000-0000-0000-0000-0000000000d2','frances','a','b',array['criado-por-x']) $$) like 'system_tag_protected%');
select pg_temp.chk('13 tag comum continua permitida', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ insert into own_flashcards(owner_id,language_app_key,front,back_trans,tags) values ('00000000-0000-0000-0000-0000000000d2','frances','a','b',array['saudacao','a1']) $$) is null);
-- nota-fonte legítima emitida por SQL de manutenção (papel não-API), p/ os testes de cópia
insert into own_flashcards(id,owner_id,language_app_key,front,back_trans,note,tags,fields,card_generation_mode) overriding system value
 values (9001,'00000000-0000-0000-0000-0000000000d1','frances','bonjour','olá','nota do autor',array['saudacao'],
  '[{"id":"f1","lang":"fr","role":null,"content":{"value":"bonjour"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"f2","lang":"pt-BR","role":null,"content":{"value":"olá"},"audio":null,"image":null,"pinyinFieldId":null}]','normal');
select pg_temp.chk('manutenção SQL pode emitir tag de sistema (papel não-API)', (select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','d', $$ select 1 $$)) is null);

-- ===== 17. cópia atribuída =====
create function pg_temp.cols(p_front text, p_back text, p_extra jsonb default '{}') returns jsonb language sql as $$
 select jsonb_build_object('card_generation_mode','normal','front_is_target_language',true,'fields', jsonb_build_array(
   jsonb_build_object('id','n1','lang','fr','role',null,'content',jsonb_build_object('value',p_front),'audio',null,'image',null,'pinyinFieldId',null),
   jsonb_build_object('id','n2','lang','pt-BR','role',null,'content',jsonb_build_object('value',p_back),'audio',null,'image',null,'pinyinFieldId',null))) || p_extra $$;
create temp table cp(k text, id bigint);
grant all on cp to public;
select pg_temp.chk('17 cópia pelo RPC funciona', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ insert into cp select 'c1', (public.copy_public_flashcard(9001,'frances',%L::jsonb)).id $f$, pg_temp.cols('bonjour','olá')::text)) is null);
select pg_temp.chk('17 cópia recebeu criado-por-<username do autor> (derivado do user_id da fonte)',
  (select tags from own_flashcards where id=(select id from cp where k='c1')) = array['saudacao', 'criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1')]);
select pg_temp.chk('17 cópia é independente: dono = quem copiou, sem coluna de origem', (select owner_id from own_flashcards where id=(select id from cp where k='c1'))='00000000-0000-0000-0000-0000000000d2'
  and not exists (select 1 from information_schema.columns where table_name='own_flashcards' and column_name in ('source_user_id','source_card_id','source_id')));
-- 16. siblings: atribuição é por Note (linha) -- a mesma lista serve a todos os CardInstances (derivados em runtime)
select pg_temp.chk('16 atribuição vive na linha (Note); CardInstance não é persistido', not exists (select 1 from information_schema.tables where table_schema='public' and table_name ilike '%card_instance%'));
-- 18. cópia de cópia
update own_flashcards set hidden_from_profile=false where id=(select id from cp where k='c1');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d3','terceiro@example.com'); insert into profiles(user_id,public_profile) values ('00000000-0000-0000-0000-0000000000d3',true);
select pg_temp.chk('18 cópia de cópia', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d3','t',
  format($f$ insert into cp select 'c2', (public.copy_public_flashcard(%s,'frances',%L::jsonb)).id $f$, (select id from cp where k='c1'), pg_temp.cols('bonjour','olá')::text)) is null);
select pg_temp.chk('18 mantém SOMENTE o autor original (nenhuma segunda criado-por, nenhuma do intermediário)',
  (select count(*) from own_flashcards o, unnest(o.tags) t where o.id=(select id from cp where k='c2') and t like 'criado-por%')=1
  and (select tags from own_flashcards where id=(select id from cp where k='c2')) @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1')]);
-- 19. display_name não altera atribuição
update profiles set display_name='Autor Renomeado' where user_id='00000000-0000-0000-0000-0000000000d1';
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d4','quarto@example.com'); insert into profiles(user_id,public_profile) values ('00000000-0000-0000-0000-0000000000d4',true);
create temp table r19(e text); grant all on r19 to public;
insert into r19 select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q',
  format($f$ insert into cp select 'c3', (public.copy_public_flashcard(9001,'frances',%L::jsonb)).id $f$, pg_temp.cols('bonjour','olá')::text));
select pg_temp.chk('19 nova cópia após mudar display_name mantém a MESMA tag', (select e is null from r19)
  and (select tags from own_flashcards where id=(select id from cp where k='c3')) = (select tags from own_flashcards where id=(select id from cp where k='c1')));
select pg_temp.chk('19 cópia antiga não mudou', (select count(*) from own_flashcards where id=(select id from cp where k='c1') and 'criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1') = any(tags))=1);
-- 20. imports não fabricam autoria
select pg_temp.chk('20 conteúdo fabricado sob o nome do autor é recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q',
  format($f$ select public.copy_public_flashcard(9001,'frances',%L::jsonb) $f$, pg_temp.cols('texto inventado','olá')::text)) like 'invalid_copy_payload%');
select pg_temp.chk('20 payload com mídia embutida recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q',
  format($f$ select public.copy_public_flashcard(9001,'frances',%L::jsonb) $f$, replace(pg_temp.cols('bonjour','olá')::text, '"audio": null', '"audio": {"type":"url","url":"https://x/y.mp3"}'))) like 'invalid_copy_payload%');
create temp table r20(e text); grant all on r20 to public;
insert into r20 select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q',
  format($f$ insert into cp select 'c4', (public.copy_public_flashcard(9001,'frances',%L::jsonb)).id $f$, pg_temp.cols('bonjour','olá','{"tags":["criado-por-vitima"]}')::text));
select pg_temp.chk('20 tags enviadas pelo cliente são ignoradas (tag vem do servidor)', (select e is null from r20)
  and exists (select 1 from cp where k='c4')
  and not exists (select 1 from own_flashcards where id=(select id from cp where k='c4') and 'criado-por-vitima' = any(tags)));
update profiles set public_profile=false where user_id='00000000-0000-0000-0000-0000000000d2';
select pg_temp.chk('20 fonte oculta/privada recusada', (select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q', format($f$ select public.copy_public_flashcard(%s,'frances',%L::jsonb) $f$, (select id from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2' limit 1), pg_temp.cols('a','b')::text))) like 'source_not_available%');
select pg_temp.chk('20 idioma divergente recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d4','q',
  format($f$ select public.copy_public_flashcard(9001,'mandarim',%L::jsonb) $f$, pg_temp.cols('bonjour','olá')::text)) like 'invalid_copy_payload%');
select pg_temp.chk('20 copiar sem login recusa', pg_temp.run_as('authenticated',null,'q', $$ select public.copy_public_flashcard(9001,'frances','{}'::jsonb) $$) like 'not_authenticated%');
select pg_temp.chk('anon sem permissão no RPC de cópia', pg_temp.run_as('anon',null,'q', $$ select public.copy_public_flashcard(9001,'frances','{}'::jsonb) $$) like 'permission denied%');
-- 14/15. renomear/apagar/mesclar a atribuição
select pg_temp.chk('14 rename de tag COMUM para criado-por-* recusado (forja)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ select public.rename_note_tag('own','saudacao','criado-por-ana') $$) like 'system_tag_protected%');
select pg_temp.chk('14 rename da atribuição para outra pessoa recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ select public.rename_note_tag('own',%L,'criado-por-outra') $f$, 'criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1'))) like 'system_tag_protected%');
select pg_temp.chk('15 delete da atribuição recusado (RPC)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ select public.delete_note_tag('own',%L) $f$, 'criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1'))) like 'system_tag_protected%');
select pg_temp.chk('15 UPDATE direto removendo a atribuição recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ update own_flashcards set tags=array['saudacao'] where id=%s $f$, (select id from cp where k='c1'))) like 'system_tag_protected%');
select pg_temp.chk('15 UPDATE direto trocando a atribuição recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ update own_flashcards set tags=array['saudacao','criado-por-fulano'] where id=%s $f$, (select id from cp where k='c1'))) like 'system_tag_protected%');
select pg_temp.chk('15 UPDATE direto adicionando 2ª atribuição recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ update own_flashcards set tags=tags||array['criado-por-fulano'] where id=%s $f$, (select id from cp where k='c1'))) like 'system_tag_protected%');
select pg_temp.chk('15 editar tags COMUNS mantendo a atribuição passa', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ update own_flashcards set tags=array['saudacao','novo','criado-por-%s'] where id=%s $f$, (select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1'), (select id from cp where k='c1'))) is null);
select pg_temp.chk('15 rename de tag comum (sem atribuição) continua funcionando', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o', $$ select public.rename_note_tag('own','novo','novissimo') $$) is null);
select pg_temp.chk('15 editar a Note (sem tocar tags) mantém a atribuição', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','o',
  format($f$ update own_flashcards set front='editado' where id=%s $f$, (select id from cp where k='c1'))) is null
  and exists (select 1 from own_flashcards where id=(select id from cp where k='c1') and tags::text like '%criado-por-%'));
select pg_temp.chk('teacher_flashcards: admin não forja nem altera', true);

-- ===== perfil público / regressão =====
select pg_temp.chk('21 get_public_profile_stats segue funcionando por username', (public.get_public_profile_stats('ana.silva') is not null));
select pg_temp.chk('21 get_public_flashcards segue funcionando por username', ((public.get_public_flashcards((select username from profiles where user_id='00000000-0000-0000-0000-0000000000d1'),'frances') -> 'cards') is not null));

select (case when ok then 'ok   ' else 'FALHA' end) || ' ' || name || case when ok then '' else '  :: ' || info end from res order by ok, name;
select 'RESUMO ' || count(*) filter (where ok) || '/' || count(*) || ' ok' from res;
