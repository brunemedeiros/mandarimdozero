-- Fase I (Tags) -- aditiva e idempotente. NENHUMA tabela/coluna nova: a fonte
-- persistida continua sendo `tags text[]` (migration 048) nas duas tabelas de
-- Note. Esta migration só (1) impõe no banco os MESMOS limites do cliente
-- (20 tags por Note, 50 caracteres por tag -- shared/flashcard-model.js:
-- TAG_MAX_PER_NOTE/TAG_MAX_LENGTH) como rede de segurança contra chamadas
-- diretas à API, e (2) faz get_public_flashcards devolver as tags da Note, pra
-- a cópia de um cartão público carregar as tags (valores, sem vínculo vivo).
-- Não altera RLS. Dados existentes: 0 linhas com tags (verificado antes de
-- aplicar), então os CHECKs validam sem reescrever nada.

create or replace function public.note_tags_within_limits(p_tags text[])
returns boolean
language sql
immutable
as $$
  select coalesce(cardinality(p_tags), 0) <= 20
     and not exists (select 1 from unnest(p_tags) as t where char_length(t) > 50);
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'own_flashcards_tags_limits') then
    alter table public.own_flashcards
      add constraint own_flashcards_tags_limits check (public.note_tags_within_limits(tags));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teacher_flashcards_tags_limits') then
    alter table public.teacher_flashcards
      add constraint teacher_flashcards_tags_limits check (public.note_tags_within_limits(tags));
  end if;
end $$;

create or replace function public.get_public_flashcards(p_username text, p_language_app_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    'frontIsTargetLanguage', front_is_target_language,
    'tags', to_jsonb(tags)
  ) order by created_at desc), '[]'::jsonb)
  into v_cards
  from own_flashcards
  where owner_id = v_user_id
    and language_app_key = p_language_app_key
    and status = 'active'
    and hidden_from_profile = false;

  return jsonb_build_object('cards', v_cards);
end;
$function$;
