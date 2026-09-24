-- Renomeia a tabela `student_flashcards` (e a coluna `student_id` dentro
-- dela) pra `own_flashcards`/`owner_id`.
--
-- Mesmo princípio já aplicado na migration 042 (profiles.role
-- 'student'->'user'): "aluno/a" neste repositório sempre significa
-- vínculo FORMAL numa linha ativa de teacher_students (ver CLAUDE.md,
-- seção "Auditoria de terminologia"). Esta tabela nunca foi isso -- desde
-- a Fase 5 do sistema de alunas particulares ela guarda os flashcards que
-- QUALQUER conta registrada cria pra si mesma em "Meus Cartões", vinculada
-- a uma professora ou não. O próprio código-cliente já evitava a palavra
-- "student" nos nomes de função (fetchMyOwnFlashcards, createOwnFlashcard,
-- etc.) -- só o nome da tabela/coluna no banco ainda carregava a
-- inconsistência. Pedido explícito da autora, depois de eu confirmar o
-- escopo exato (tabela+coluna, ~10-15 pontos de código, dado real de 3
-- linhas hoje -- baixo risco de volume, mas referenciado em vários
-- arquivos).
--
-- `ALTER TABLE ... RENAME` e `ALTER TABLE ... RENAME COLUMN` atualizam
-- automaticamente tudo que referencia a tabela/coluna por OID/attnum
-- (foreign keys, índices, a policy de RLS) -- só a function
-- get_public_flashcards (migration 038) precisa ser recriada de propósito
-- porque o corpo dela é TEXTO (plpgsql), não uma referência resolvida.
-- Confirmado ao vivo (pg_proc.prosrc) que é a ÚNICA function que
-- referencia esta tabela no corpo.
alter table public.student_flashcards rename to own_flashcards;
alter table public.own_flashcards rename column student_id to owner_id;

-- Cosmético (constraints continuam funcionando com o nome antigo, mas
-- manter tudo consistente evita confundir uma sessão futura que for ler o
-- schema).
alter table public.own_flashcards rename constraint student_flashcards_pkey to own_flashcards_pkey;
alter table public.own_flashcards rename constraint student_flashcards_language_app_key_check to own_flashcards_language_app_key_check;
alter table public.own_flashcards rename constraint student_flashcards_status_check to own_flashcards_status_check;
alter table public.own_flashcards rename constraint student_flashcards_student_id_fkey to own_flashcards_owner_id_fkey;
alter policy student_flashcards_owner_all on public.own_flashcards rename to own_flashcards_owner_all;

-- Recria get_public_flashcards (Fase 2 do prompt-mestre "perfil público",
-- migration 038) com o nome novo de tabela/coluna -- mesma lógica,
-- character por character, só a fonte lida (own_flashcards/owner_id).
create or replace function public.get_public_flashcards(p_username text, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_public boolean;
  v_cards jsonb;
begin
  select user_id, public_profile into v_user_id, v_public
  from profiles where username = p_username;

  if v_user_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if not v_public then
    return jsonb_build_object('error', 'not_public');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'front', front,
    'frontPinyin', front_pinyin,
    'backTrans', back_trans,
    'note', note,
    'frontIsTargetLanguage', front_is_target_language
  ) order by created_at desc), '[]'::jsonb)
  into v_cards
  from own_flashcards
  where owner_id = v_user_id
    and language_app_key = p_language_app_key
    and status = 'active'
    and hidden_from_profile = false;

  return jsonb_build_object('cards', v_cards);
end;
$$;

revoke all on function public.get_public_flashcards(text, text) from public;
grant execute on function public.get_public_flashcards(text, text) to anon, authenticated;
