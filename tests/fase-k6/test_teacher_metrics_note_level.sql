-- K.6 -- get_teacher_student_metrics (migration 059): contrato Note x CardInstance.
-- Roda numa transação que SEMPRE faz rollback (termina em RAISE EXCEPTION
-- 'RESULTS: ...'). Auto-contido: cria seus próprios usuários (uuids fixos) e
-- linhas. Rodar APÓS aplicar a 059. Local: tests/fase-k6/run_local.sh (usa um
-- schema mínimo, local_stub_schema.sql). No Supabase: as FKs reais exigem
-- usuários existentes em auth.users -- ver cabeçalho de tests/fase-k0.
do $$
declare
  T  uuid := '00000000-0000-0000-0000-0000000000a1';  -- professora
  T2 uuid := '00000000-0000-0000-0000-0000000000a2';  -- outra professora
  S  uuid := '00000000-0000-0000-0000-0000000000b1';  -- aluno
  S2 uuid := '00000000-0000-0000-0000-0000000000b2';  -- outro aluno
  r bigint[] := '{}'; i int; rid bigint;
  rO bigint; rT2 bigint; rZH bigint; rS2 bigint;     -- linhas "alheias"
  past numeric := 1000; fut numeric := 99999999999999;
  res jsonb; oks int := 0; total int := 0; fails text := '';
  nrows_active int;
begin
  insert into teacher_students(teacher_id,student_id,language_app_key,status) values
    (T,S,'frances','active'), (T,S,'mandarim','active'), (T2,S,'frances','active'), (T,S2,'frances','active');

  -- linhas desta professora/aluno/idioma: r[1..13]; r[12] arquivada; r[13] sem cards no progresso
  for i in 1..13 loop
    insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans,status)
    values (T,S,'frances','k6-'||i,'k6-'||i, case when i=12 then 'archived' else 'active' end) returning id into rid;
    r := r || rid;
  end loop;
  insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,S2,'frances','x','x') returning id into rS2;
  insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T2,S,'frances','x','x') returning id into rT2;
  insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,S,'mandarim','x','x') returning id into rZH;

  create temp table k6_cases(label text, cards jsonb, expect jsonb) on commit drop;
  perform set_config('request.jwt.claims', json_build_object('sub', T, 'role','authenticated')::text, true);

  -- construtor de card (origin teacher, ativo)
  create or replace function pg_temp.mk(id text, rid bigint, reps numeric, lapses numeric, ivl numeric, st text, due numeric, origin text default 'teacher')
  returns jsonb language sql as $f$
    select jsonb_build_object('id',id,'origin',origin,'rowId',rid,'flashcardStatus','active','reps',reps,'lapses',lapses,'interval',ivl,'state',st,'due',due)
  $f$;

  insert into k6_cases values
   ('1 Normal 1 Note/1 Card, strong, review devido', jsonb_build_array(pg_temp.mk('t'||r[1],r[1],3,0,70,'review',past)),
      '{"contentsStudied":1,"contentsStrengthStrong":1,"contentsStrengthWeak":0,"cardsTotal":1,"cardsReview":1,"cardsDue":1,"cardsNew":0}'),
   ('2 Reverse: A estudado + B New -> 1 conteudo, 2 cards, New nao rebaixa', jsonb_build_array(
      pg_temp.mk('t'||r[2],r[2],1,0,10,'learning',past), pg_temp.mk('t'||r[2]||'-b',r[2],0,0,0,'new',0)),
      '{"contentsStudied":1,"contentsStrengthMedium":1,"contentsStrengthWeak":0,"cardsTotal":2,"cardsNew":1,"cardsLearning":1}'),
   ('3 Reverse: dois estudados strong+weak -> weakest = weak', jsonb_build_array(
      pg_temp.mk('t'||r[2],r[2],5,0,70,'review',fut), pg_temp.mk('t'||r[2]||'-b',r[2],3,2,2,'relearning',past)),
      '{"contentsStudied":1,"contentsStrengthWeak":1,"contentsStrengthStrong":0,"cardsReview":1,"cardsLearning":1,"cardsDue":1}'),
   ('4 Cloze 3 marcas todas estudadas -> 1 conteudo, 3 cards', jsonb_build_array(
      pg_temp.mk('t'||r[3]||'-c1',r[3],2,0,70,'review',fut), pg_temp.mk('t'||r[3]||'-c2',r[3],2,0,70,'review',fut), pg_temp.mk('t'||r[3]||'-c3',r[3],2,0,70,'review',fut)),
      '{"contentsStudied":1,"contentsStrengthStrong":1,"cardsTotal":3,"cardsReview":3,"cardsDue":0}'),
   ('5 Cloze 3 marcas, 2 New -> 1 estudado, cards New nao contam como conteudo', jsonb_build_array(
      pg_temp.mk('t'||r[3]||'-c1',r[3],1,0,5,'learning',past), pg_temp.mk('t'||r[3]||'-c2',r[3],0,0,0,'new',0), pg_temp.mk('t'||r[3]||'-c3',r[3],0,0,0,'new',0)),
      '{"contentsStudied":1,"contentsStrengthMedium":1,"cardsTotal":3,"cardsNew":2}'),
   ('6 Nenhuma irma estudada -> Nao iniciada, NAO Fraca', jsonb_build_array(
      pg_temp.mk('t'||r[5],r[5],0,0,0,'new',0), pg_temp.mk('t'||r[5]||'-b',r[5],0,0,0,'new',0)),
      '{"contentsStudied":0,"contentsStrengthWeak":0,"contentsStrengthMedium":0,"contentsStrengthStrong":0,"cardsNew":2,"cardsTotal":2}'),
   ('7 Learning', jsonb_build_array(pg_temp.mk('t'||r[6],r[6],1,0,1,'learning',past)),
      '{"cardsLearning":1,"cardsReview":0,"cardsNew":0,"cardsDue":1}'),
   ('8 Relearning conta em Learning', jsonb_build_array(pg_temp.mk('t'||r[6],r[6],4,1,3,'relearning',fut)),
      '{"cardsLearning":1,"cardsReview":0,"cardsDue":0}'),
   ('9 state new mas reps>0 (Errei antigo) = Learning', jsonb_build_array(pg_temp.mk('t'||r[6],r[6],2,1,0,'new',past)),
      '{"cardsLearning":1,"cardsNew":0,"cardsDue":1}'),
   ('10 Review devido = Review + Due', jsonb_build_array(pg_temp.mk('t'||r[7],r[7],2,0,20,'review',past)),
      '{"cardsReview":1,"cardsDue":1}'),
   ('11 Review NAO devido = Review sem Due', jsonb_build_array(pg_temp.mk('t'||r[7],r[7],2,0,20,'review',fut)),
      '{"cardsReview":1,"cardsDue":0}'),
   ('12 New com due no passado nao e Devido', jsonb_build_array(pg_temp.mk('t'||r[7],r[7],0,0,0,'new',past)),
      '{"cardsNew":1,"cardsDue":0}'),
   ('13 Reverse estados diferentes: learning + review -> 2 cards, 1 conteudo', jsonb_build_array(
      pg_temp.mk('t'||r[8],r[8],1,0,2,'learning',fut), pg_temp.mk('t'||r[8]||'-b',r[8],3,0,40,'review',fut)),
      '{"contentsStudied":1,"cardsLearning":1,"cardsReview":1,"cardsTotal":2,"contentsStrengthMedium":1}'),
   ('14 Arquivado (linha) fora do ativo, mesmo com flashcardStatus stale ativo', jsonb_build_array(
      pg_temp.mk('t'||r[12],r[12],3,0,70,'review',past)),
      '{"cardsTotal":0,"cardsDue":0,"archivedCards":1,"archivedNotes":1,"contentsStudied":0}'),
   ('15 Self com mesmo rowId nao entra', jsonb_build_array(
      pg_temp.mk('s'||r[1],r[1],3,0,70,'review',past,'self')),
      '{"cardsTotal":0,"contentsStudied":0}'),
   ('16 Study nao entra', jsonb_build_array(
      jsonb_build_object('id','uA1-1-v0','origin','study','reps',3,'lapses',0,'interval',70,'state','review','due',1000),
      jsonb_build_object('id','uA1-1-v0-b','origin','study','reps',3,'rowId',r[1])),
      '{"cardsTotal":0,"contentsStudied":0}'),
   ('17 Linha de OUTRO aluno nao entra', jsonb_build_array(pg_temp.mk('t'||rS2,rS2,3,0,70,'review',past)),
      '{"cardsTotal":0,"contentsStudied":0}'),
   ('18 Linha de OUTRA professora nao entra', jsonb_build_array(pg_temp.mk('t'||rT2,rT2,3,0,70,'review',past)),
      '{"cardsTotal":0,"contentsStudied":0}'),
   ('19 Linha de OUTRO idioma nao entra no progresso frances', jsonb_build_array(pg_temp.mk('t'||rZH,rZH,3,0,70,'review',past)),
      '{"cardsTotal":0,"contentsStudied":0}'),
   ('20 Revisao -rN, -rN-b, -rN-c1: mesma Note (rowId), 1 conteudo', jsonb_build_array(
      pg_temp.mk('t'||r[9]||'-r2',r[9],1,0,5,'learning',fut), pg_temp.mk('t'||r[9]||'-r2-b',r[9],0,0,0,'new',0), pg_temp.mk('t'||r[9]||'-r2-c1',r[9],0,0,0,'new',0)),
      '{"contentsStudied":1,"cardsTotal":3}'),
   ('21 Save antigo sem rowId (fallback validado) agrupa na Note', jsonb_build_array(
      jsonb_build_object('id','t'||r[9]||'-r2','reps',2,'lapses',0,'interval',5,'state','learning','due',99999999999999,'flashcardStatus','active'),
      jsonb_build_object('id','t'||r[9]||'-r2-b','origin','teacher','reps',0,'state','new','due',0,'flashcardStatus','active')),
      '{"contentsStudied":1,"cardsTotal":2}'),
   ('22 Fallback com origin self no id t{n} nao entra', jsonb_build_array(
      jsonb_build_object('id','t'||r[1],'origin','self','reps',3)), '{"cardsTotal":0}'),
   ('23 Fallback com n inexistente nao entra', jsonb_build_array(
      jsonb_build_object('id','t999999999','reps',3), jsonb_build_object('id','t'||r[1]||'-b-b','reps',3)), '{"cardsTotal":0}'),
   ('24 media: reps2 lapses1 ivl59', jsonb_build_array(pg_temp.mk('t'||r[10],r[10],2,1,59,'review',fut)), '{"contentsStrengthMedium":1,"contentsStrengthStrong":0}'),
   ('25 forte: reps2 lapses1 ivl60', jsonb_build_array(pg_temp.mk('t'||r[10],r[10],2,1,60,'review',fut)), '{"contentsStrengthStrong":1,"contentsStrengthMedium":0}'),
   ('26 fraca: lapses2 estudado', jsonb_build_array(pg_temp.mk('t'||r[10],r[10],9,2,300,'review',fut)), '{"contentsStrengthWeak":1,"contentsStrengthStrong":0}'),
   ('27 numeros malformados/fracionarios nao quebram', jsonb_build_array(
      jsonb_build_object('id','t'||r[11],'origin','teacher','rowId',r[11],'reps','abc','lapses',null,'interval',2.5,'state','review','due','x'),
      jsonb_build_object('id','t'||r[11]||'-b','origin','teacher','rowId',r[11],'reps',2.0,'lapses',0,'interval',12.75,'state','learning','due',1000.5)),
      '{"cardsTotal":2,"contentsStudied":1}'),
   ('28 cards nao-objeto/null no array nao quebram', jsonb_build_array(null, 5, 'x', pg_temp.mk('t'||r[1],r[1],1,0,1,'learning',past)),
      '{"cardsTotal":1}'),
   ('29 Progresso vazio', '[]'::jsonb, '{"cardsTotal":0,"contentsStudied":0,"cardsDue":0}');

  declare rec record; k text; v jsonb; ok boolean; nact int;
  begin
  select count(*) into nact from teacher_flashcards where teacher_id=T and student_id=S and language_app_key='frances' and status='active';
  for rec in select * from k6_cases loop
    insert into progress(user_id,data) values (S, jsonb_build_object('frances', jsonb_build_object('cards', rec.cards, 'lastStudyDay','2026-09-30')))
      on conflict (user_id) do update set data = excluded.data;
    res := public.get_teacher_student_metrics(S,'frances');
    ok := true;
    for k, v in select * from jsonb_each(rec.expect) loop
      if (res -> k) is distinct from v then ok := false; fails := fails||' | '||rec.label||': '||k||' esperado '||v||' veio '||coalesce((res->k)::text,'null'); end if;
    end loop;
    -- invariantes em todo caso
    if (res->>'contentsTotal')::int <> nact then ok := false; fails := fails||' | '||rec.label||': contentsTotal '||(res->>'contentsTotal')||' <> '||nact; end if;
    if (res->>'contentsStudied')::int + (res->>'contentsNotStarted')::int <> (res->>'contentsTotal')::int then ok := false; fails := fails||' | '||rec.label||': studied+notStarted<>total'; end if;
    if (res->>'contentsStrengthNotStarted')::int + (res->>'contentsStrengthWeak')::int + (res->>'contentsStrengthMedium')::int + (res->>'contentsStrengthStrong')::int <> (res->>'contentsTotal')::int then ok := false; fails := fails||' | '||rec.label||': soma de forca <> total'; end if;
    if (res->>'cardsNew')::int + (res->>'cardsLearning')::int + (res->>'cardsReview')::int <> (res->>'cardsTotal')::int then ok := false; fails := fails||' | '||rec.label||': N+L+R<>total'; end if;
    if (res->>'cardsDue')::int > (res->>'cardsLearning')::int + (res->>'cardsReview')::int then ok := false; fails := fails||' | '||rec.label||': Due > L+R'; end if;
    total := total + 1; if ok then oks := oks + 1; end if;
  end loop;
  end;

  declare chk text;
  begin
  -- contentsTotal = Notes ATIVAS (12), inclusive r[13], que nunca aparece no progresso
  insert into progress(user_id,data) values (S, '{"frances":{"cards":[]}}') on conflict (user_id) do update set data = excluded.data;
  res := public.get_teacher_student_metrics(S,'frances');
  total := total + 1;
  if (res->>'contentsTotal')::int = 12 and (res->>'contentsStrengthNotStarted')::int = 12 and (res->>'archivedNotes')::int = 1
    then oks := oks+1; else fails := fails||' | contentsTotal deve ser 12 Notes ativas: '||res::text; end if;

  -- conjunto exato de chaves: nada de Study/Self/XP/streak/ids
  total := total + 1;
  select string_agg(k, ',' order by k) into chk from jsonb_object_keys(res) k;
  if chk = 'archivedCards,archivedNotes,cardsDue,cardsLearning,cardsNew,cardsReview,cardsTotal,contentsNotStarted,contentsStrengthMedium,contentsStrengthNotStarted,contentsStrengthStrong,contentsStrengthWeak,contentsStudied,contentsTotal,lastStudyDay'
    then oks := oks+1; else fails := fails||' | chaves inesperadas: '||chk; end if;

  -- mandarim: escopo por idioma (so a linha rZH; cards de frances nao vazam)
  insert into progress(user_id,data) values (S, jsonb_build_object(
      'frances', jsonb_build_object('cards', jsonb_build_array(pg_temp.mk('t'||r[1],r[1],3,0,70,'review',1000))),
      'mandarim', jsonb_build_object('cards', jsonb_build_array(pg_temp.mk('t'||rZH,rZH,1,0,5,'learning',1000)), 'lastStudyDay','2026-01-02')))
    on conflict (user_id) do update set data = excluded.data;
  res := public.get_teacher_student_metrics(S,'mandarim');
  total := total + 1;
  if (res->>'contentsTotal')::int = 1 and (res->>'contentsStudied')::int = 1 and (res->>'cardsTotal')::int = 1 and res->>'lastStudyDay' = '2026-01-02'
    then oks := oks+1; else fails := fails||' | escopo mandarim: '||res::text; end if;

  -- outra professora enxerga SO o que e dela (linha rT2); card da T nao conta
  perform set_config('request.jwt.claims', json_build_object('sub', T2, 'role','authenticated')::text, true);
  res := public.get_teacher_student_metrics(S,'frances');
  total := total + 1;
  if (res->>'contentsTotal')::int = 1 and (res->>'cardsTotal')::int = 0 and (res->>'contentsStudied')::int = 0
    then oks := oks+1; else fails := fails||' | T2 nao pode ver cards/Notes da T: '||res::text; end if;

  -- autorizacao: sem vinculo, aluno chamando, idioma sem vinculo, vinculo inativo
  perform set_config('request.jwt.claims', json_build_object('sub', T2, 'role','authenticated')::text, true);
  total := total + 1;
  if public.get_teacher_student_metrics(S2,'frances')->>'error' = 'not_authorized' then oks := oks+1; else fails := fails||' | T2 x S2 deveria ser not_authorized'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', S, 'role','authenticated')::text, true);
  total := total + 1;
  if public.get_teacher_student_metrics(S,'frances')->>'error' = 'not_authorized' then oks := oks+1; else fails := fails||' | aluno chamando deveria ser not_authorized'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', T, 'role','authenticated')::text, true);
  total := total + 1;
  if public.get_teacher_student_metrics(S,'portugues')->>'error' = 'not_authorized' then oks := oks+1; else fails := fails||' | idioma sem vinculo deveria ser not_authorized'; end if;
  update teacher_students set status='removed' where teacher_id=T and student_id=S and language_app_key='frances';
  total := total + 1;
  if public.get_teacher_student_metrics(S,'frances')->>'error' = 'not_authorized' then oks := oks+1; else fails := fails||' | vinculo inativo deveria ser not_authorized'; end if;
  update teacher_students set status='active' where teacher_id=T and student_id=S and language_app_key='frances';

  -- sem linha em progress: zeros, lastStudyDay null, sem erro
  delete from progress where user_id = S;
  res := public.get_teacher_student_metrics(S,'frances');
  total := total + 1;
  if (res->>'cardsTotal')::int = 0 and (res->>'contentsStudied')::int = 0 and (res->>'contentsTotal')::int = 12 and res->'lastStudyDay' = 'null'::jsonb
    then oks := oks+1; else fails := fails||' | sem progress: '||res::text; end if;
  end;

  raise exception 'RESULTS: % ok de % | falhas:%', oks, total, coalesce(nullif(fails,''),' nenhuma');
end $$;
