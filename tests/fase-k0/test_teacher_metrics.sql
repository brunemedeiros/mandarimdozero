-- K.0-B -- seleção de CardInstances em get_teacher_student_metrics.
-- Roda numa única transação que SEMPRE faz rollback (termina em RAISE EXCEPTION
-- 'RESULTS: ...'). Usa uma professora e um aluno reais com vínculo ativo, mas
-- só dentro da transação: insere teacher_flashcards temporárias e troca o
-- progress.data.frances.cards do aluno; nada sobrevive.
-- Pergunta de cada caso: "este CardInstance entra (1) ou não entra (0) na seleção?"
-- Medido por active+archived de um progresso com UM único card.
do $$
declare
  T uuid := '33c478d9-b6f4-4b5a-8798-a037672edce4';
  S uuid := 'ae90fc45-f4b8-49ca-8665-a01d3107ecf7';
  r bigint[] := '{}';  -- ids das linhas temporárias
  i int; rid bigint;
  res jsonb; n int; fails text := ''; oks int := 0; total int := 0;
  rec record; cards jsonb;
  total_notes int; before_total int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', T, 'role', 'authenticated')::text, true);
  select (public.get_teacher_student_metrics(S,'frances')->>'teacherCardsTotal')::int into before_total;
  for i in 1..8 loop
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans)
    values (T, S, 'frances', 'k0b-'||i, 'k0b-'||i) returning id into rid;
    r := r || rid;
  end loop;
  -- r[1]=Normal r[2]=Reverse r[3]=Cloze r[4]=TypeAnswer r[5]=MC r[6]=Revision r[7]=Archived r[8]=legado

  create temp table k0_cases(label text, card jsonb, expect int) on commit drop;
  insert into k0_cases values
   ('Normal t1 (origin+rowId)',      jsonb_build_object('id','t'||r[1],'origin','teacher','rowId',r[1],'flashcardStatus','active','reps',3,'lapses',0,'interval',70), 1),
   ('Reverse A t2',                  jsonb_build_object('id','t'||r[2],'origin','teacher','rowId',r[2],'flashcardStatus','active','reps',1), 1),
   ('Reverse B t2-b',                jsonb_build_object('id','t'||r[2]||'-b','origin','teacher','rowId',r[2],'flashcardStatus','active','reps',0), 1),
   ('Cloze t3-c1',                   jsonb_build_object('id','t'||r[3]||'-c1','origin','teacher','rowId',r[3],'flashcardStatus','active','reps',1), 1),
   ('Cloze t3-c2',                   jsonb_build_object('id','t'||r[3]||'-c2','origin','teacher','rowId',r[3],'flashcardStatus','active','reps',1), 1),
   ('Cloze t3-c3',                   jsonb_build_object('id','t'||r[3]||'-c3','origin','teacher','rowId',r[3],'flashcardStatus','active','reps',1), 1),
   ('Type Answer t4',                jsonb_build_object('id','t'||r[4],'origin','teacher','rowId',r[4],'flashcardStatus','active','reps',2), 1),
   ('Multiple Choice t5',            jsonb_build_object('id','t'||r[5],'origin','teacher','rowId',r[5],'flashcardStatus','active','reps',2), 1),
   ('Revision t6-r2',                jsonb_build_object('id','t'||r[6]||'-r2','origin','teacher','rowId',r[6],'flashcardStatus','active','reps',0), 1),
   ('Revision+Reverse t6-r2-b',      jsonb_build_object('id','t'||r[6]||'-r2-b','origin','teacher','rowId',r[6],'flashcardStatus','active','reps',0), 1),
   ('Revision+Cloze t6-r2-c1',       jsonb_build_object('id','t'||r[6]||'-r2-c1','origin','teacher','rowId',r[6],'flashcardStatus','active','reps',0), 1),
   ('Archived t7',                   jsonb_build_object('id','t'||r[7],'origin','teacher','rowId',r[7],'flashcardStatus','archived','reps',1), 1),
   ('Sem flashcardStatus t2-b',      jsonb_build_object('id','t'||r[2]||'-b','origin','teacher','rowId',r[2],'reps',1), 1),
   ('Legado tN sem origin/rowId',    jsonb_build_object('id','t'||r[8],'flashcardStatus','active','reps',1), 1),
   ('Save antigo sem rowId: t2-b',   jsonb_build_object('id','t'||r[2]||'-b','origin','teacher','reps',1), 1),
   ('Save antigo sem rowId: t6-r2-c1', jsonb_build_object('id','t'||r[6]||'-r2-c1','reps',1), 1),
   ('rowId manda sobre o formato do id', jsonb_build_object('id','qualquer-coisa','origin','teacher','rowId',r[1],'reps',1), 1),
   -- negativos: NÃO devem entrar
   ('Self com rowId igual (origin self)', jsonb_build_object('id','s'||r[1],'origin','self','rowId',r[1],'reps',1), 0),
   ('Self id parecido t{n}-b mas origin self', jsonb_build_object('id','t'||r[1]||'-b','origin','self','reps',1), 0),
   ('Trilha u1-v0',                  jsonb_build_object('id','uA1-1-v0','origin','study','reps',1), 0),
   ('Trilha -b',                     jsonb_build_object('id','uA1-1-v0-b','origin','study','reps',1), 0),
   ('rowId de OUTRA linha (inexistente)', jsonb_build_object('id','t999999999','origin','teacher','rowId',999999999,'reps',1), 0),
   ('id t999999999 sem rowId',       jsonb_build_object('id','t999999999','reps',1), 0),
   ('sufixo inválido -b-b',          jsonb_build_object('id','t'||r[1]||'-b-b','reps',1), 0),
   ('sufixo inválido -c (sem n)',    jsonb_build_object('id','t'||r[1]||'-c','reps',1), 0),
   ('lookalike t{n}x',               jsonb_build_object('id','t'||r[1]||'x','reps',1), 0),
   ('prefixo errado xt{n}',          jsonb_build_object('id','xt'||r[1],'reps',1), 0),
   ('rowId não numérico, id inválido', jsonb_build_object('id','foo','origin','teacher','rowId','abc','reps',1), 0),
   ('origin teacher + rowId de outro aluno', jsonb_build_object('id','t1','origin','teacher','rowId',(select min(id) from teacher_flashcards where student_id <> S),'reps',1), 0);

  for rec in select * from k0_cases loop
    update progress set data = data || jsonb_build_object('frances',
        coalesce(data->'frances','{}'::jsonb) || jsonb_build_object('cards', jsonb_build_array(rec.card)))
      where user_id = S;
    res := public.get_teacher_student_metrics(S,'frances');
    n := coalesce((res->>'teacherCardsActive')::int,0) + coalesce((res->>'teacherCardsArchived')::int,0);
    total := total + 1;
    if n = rec.expect then oks := oks + 1; else fails := fails || ' | ' || rec.label || ' esperado ' || rec.expect || ' veio ' || n; end if;
  end loop;

  -- agregados: significado inalterado. Total = nº de LINHAS (Notes), não de cards.
  select jsonb_agg(card) into cards from k0_cases where expect = 1 and label in
    ('Normal t1 (origin+rowId)','Reverse A t2','Reverse B t2-b','Cloze t3-c1','Cloze t3-c2','Cloze t3-c3','Archived t7');
  update progress set data = data || jsonb_build_object('frances',
      coalesce(data->'frances','{}'::jsonb) || jsonb_build_object('cards', cards)) where user_id = S;
  res := public.get_teacher_student_metrics(S,'frances');
  total := total + 4;
  if (res->>'teacherCardsTotal')::int = before_total + 8 then oks := oks+1; else fails := fails||' | Total deve contar Notes (linhas): '||(res->>'teacherCardsTotal'); end if;
  if (res->>'teacherCardsActive')::int = 6 and (res->>'teacherCardsArchived')::int = 1 then oks := oks+1; else fails := fails||' | active/archived: '||res::text; end if;
  if (res->>'teacherCardsNeverReviewed')::int = 1 then oks := oks+1; else fails := fails||' | neverReviewed: '||res::text; end if;
  if (res->>'teacherCardsWeak')::int + (res->>'teacherCardsMedium')::int + (res->>'teacherCardsStrong')::int = 7 then oks := oks+1; else fails := fails||' | weak+medium+strong: '||res::text; end if;

  -- autorização intacta: outra professora/aluno sem vínculo continua not_authorized
  perform set_config('request.jwt.claims', json_build_object('sub', S, 'role', 'authenticated')::text, true);
  total := total + 1;
  if public.get_teacher_student_metrics(S,'frances')->>'error' = 'not_authorized' then oks := oks+1; else fails := fails||' | aluno chamando a RPC deveria ser not_authorized'; end if;

  raise exception 'RESULTS: % ok de % | falhas:%', oks, total, coalesce(nullif(fails,''),' nenhuma');
end $$;
