-- Fase 2 do prompt-mestre "perfil público / flashcards públicos" (ver
-- CLAUDE.md, Fase 1 já entregue) -- lista de flashcards PRÓPRIOS
-- (student_flashcards, origin='self') de um perfil público, pra outra
-- conta poder ver e importar uma cópia pra si mesma (Q3/Q4/Q7 do
-- grilling: cópia-referência, nunca um link vivo -- editar o original
-- depois NÃO altera a cópia já importada).
--
-- Mesmo padrão de get_public_profile_stats (migration 037): function
-- SECURITY DEFINER que checa profiles.public_profile=true ELA MESMA antes
-- de tocar em qualquer linha, nunca uma RLS policy declarativa nova em
-- student_flashcards (que continua "dono lê/escreve tudo", RLS da
-- migration 028, sem nenhuma mudança). Concedida a anon TAMBÉM -- mesmo
-- motivo da 037: a lista precisa poder ser "vista" tecnicamente por
-- qualquer chamada, mas a Fase 2 do cliente só a invoca depois que a
-- pessoa está logada de verdade (gate de login antes de sequer chamar
-- isto, ver shared/public-profile.js) -- a função em si não distingue
-- quem está chamando, só se o PERFIL VISITADO é público.
--
-- Escopada por idioma (p_language_app_key) -- a mesma conta pode ter
-- cartões próprios em francês E mandarim (dois sites diferentes), mas só
-- faz sentido devolver os do idioma que o VISITANTE está estudando no
-- site em que está agora (fr/#/user/x só pode importar pro deck de
-- francês do visitante, nunca pro de mandarim, mesma regra que
-- confirmAndImportMyFlashcards() já aplica ao importe via arquivo/link).
--
-- Só cartões ATIVOS (status='active') e NÃO escondidos
-- (hidden_from_profile=false, ver migration 037) -- cascata "conta
-- pública = todo cartão público, exceto os marcados individualmente como
-- escondidos" travada no grilling da Fase 1.
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
  from student_flashcards
  where student_id = v_user_id
    and language_app_key = p_language_app_key
    and status = 'active'
    and hidden_from_profile = false;

  return jsonb_build_object('cards', v_cards);
end;
$$;

revoke all on function public.get_public_flashcards(text, text) from public;
grant execute on function public.get_public_flashcards(text, text) to anon, authenticated;
