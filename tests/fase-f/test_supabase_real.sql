-- Fase F -- teste REAL no Postgres (Supabase): destino de Deck na criação de
-- own_flashcards + RLS. Tudo numa transação terminada em ROLLBACK (zero
-- resíduo). Requer >= 2 usuários em auth.users. Cada linha do SELECT final
-- é um cenário; `ok` deve ser true em todas.
begin;
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated;
do $$
declare
  u1 uuid; u2 uuid; v_root bigint; v_pr bigint; v_pr2 bigint; v_sub bigint; v_id bigint;
  v_course bigint; v_troot bigint; v_teacher bigint; v_other bigint; v_n int;
  v_fields jsonb := '[{"id":"f1","lang":"fr","role":null,"content":{"value":"a"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"f2","lang":"pt-BR","role":null,"content":{"value":"b"},"audio":null,"image":null,"pinyinFieldId":null}]'::jsonb;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at offset 1 limit 1;

  -- setup como superusuário: árvore do u1, Course Deck, Teacher Deck, Deck do u2
  insert into decks(owner_id, kind, name, language_app_key) values (u1, 'root', 'root', 'frances') returning id into v_root;
  insert into decks(owner_id, parent_deck_id, kind, name, language_app_key) values (u1, v_root, 'personal_root', 'Meus Decks', 'frances') returning id into v_pr;
  insert into decks(owner_id, parent_deck_id, kind, name, language_app_key) values (u1, v_pr, 'personal', 'Verbos', 'frances') returning id into v_sub;
  insert into decks(kind, name, language_app_key) values ('course', 'curso-teste-f', 'frances') returning id into v_course;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (u1, u2, v_root, 'teacher_root', 'prof', 'frances') returning id into v_troot;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (u1, u2, v_troot, 'teacher', 'aulas', 'frances') returning id into v_teacher;
  insert into decks(owner_id, kind, name, language_app_key) values (u2, 'root', 'root2', 'frances') returning id into v_n;
  insert into decks(owner_id, parent_deck_id, kind, name, language_app_key) values (u2, v_n, 'personal_root', 'Meus Decks', 'frances') returning id into v_other;

  -- a partir daqui: sessão do u1 (RLS + triggers valem)
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- bootstrap idempotente pelo mesmo RPC que o cliente usa
  select personal_root_deck_id into v_pr2 from ensure_user_decks(u1, 'frances');
  insert into results values ('bootstrap idempotente devolve o mesmo personal_root', v_pr2 = v_pr, null);

  -- criação no personal_root e no subdeck (Note nativa)
  insert into own_flashcards(owner_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
    values (u1, 'frances', v_pr, 'a', 'b', v_fields, 'normal') returning id into v_id;
  insert into results select 'INSERT nativo no personal_root', deck_id = v_pr and card_generation_mode = 'normal', null from own_flashcards where id = v_id;
  insert into own_flashcards(owner_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
    values (u1, 'frances', v_sub, 'a', 'b', v_fields, 'normal_reversed') returning id into v_id;
  insert into results select 'INSERT nativo (reverso) no subdeck pessoal', deck_id = v_sub, null from own_flashcards where id = v_id;

  -- destinos proibidos: cada tentativa DEVE falhar
  declare t record;
  begin
    for t in select * from (values ('Course Deck', v_course), ('Teacher Deck', v_teacher), ('teacher_root', v_troot), ('Deck de outro usuário', v_other), ('root', v_root), ('Deck inexistente', 999999999::bigint)) x(n, did) loop
      begin
        insert into own_flashcards(owner_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
          values (u1, 'frances', t.did, 'a', 'b', v_fields, 'normal');
        insert into results values ('destino proibido rejeitado: ' || t.n, false, 'INSERIU');
      exception when others then
        insert into results values ('destino proibido rejeitado: ' || t.n, true, left(sqlerrm, 90));
      end;
    end loop;
  end;

  -- idioma diferente do Deck
  begin
    insert into own_flashcards(owner_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
      values (u1, 'mandarim', v_pr, 'a', 'b', v_fields, 'normal');
    insert into results values ('Deck de outro idioma rejeitado', false, 'INSERIU');
  exception when others then insert into results values ('Deck de outro idioma rejeitado', true, left(sqlerrm, 90)); end;

  -- RLS: u1 não cria linha em nome de u2
  begin
    insert into own_flashcards(owner_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
      values (u2, 'frances', v_other, 'a', 'b', v_fields, 'normal');
    insert into results values ('RLS: não cria cartão em nome de outro usuário', false, 'INSERIU');
  exception when others then insert into results values ('RLS: não cria cartão em nome de outro usuário', true, left(sqlerrm, 90)); end;

  -- RLS: u1 não enxerga o Deck pessoal de u2
  select count(*) into v_n from decks where id = v_other;
  insert into results values ('RLS: Deck pessoal alheio invisível', v_n = 0, v_n::text);

  -- RLS: u2 não enxerga cartões de u1 nem move deck_id deles
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select count(*) into v_n from own_flashcards where owner_id = u1;
  insert into results values ('RLS: cartões de outro usuário invisíveis', v_n = 0, v_n::text);
  update own_flashcards set deck_id = v_other where owner_id = u1;
  get diagnostics v_n = row_count;
  insert into results values ('RLS: não move cartão de outro usuário', v_n = 0, v_n::text);

  reset role;
end $$;
select name, ok, detail from results order by ok, name;
rollback;
