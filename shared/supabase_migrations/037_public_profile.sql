-- Fase 1 do prompt-mestre "perfil público / flashcards públicos" (ver
-- CLAUDE.md, grilling completo antes de codar) -- schema + função de
-- leitura agregada. A LISTA de cartões pra importar é Fase 2, ainda não
-- implementada -- esta migration só cobre o toggle de privacidade e as
-- estatísticas agregadas (streak/XP/progresso por idioma) mostradas no
-- perfil público.
--
-- public_profile: default `false` (grillado -- privado por padrão).
-- Quando `true`, TODO cartão próprio (student_flashcards, origin='self')
-- fica público, EXCETO os marcados individualmente como
-- hidden_from_profile -- a conta é o interruptor mestre, o cartão é uma
-- exceção por cima dele (nunca o contrário: hidden_from_profile=false
-- não teria efeito nenhum se a conta estiver privada).
alter table public.profiles
  add column if not exists public_profile boolean not null default false;

-- hidden_from_profile: default `false` -- todo cartão já existente
-- continua com o comportamento implícito de sempre (visível SE a conta
-- virar pública; a conta em si já nasce privada, então nenhum cartão de
-- ninguém fica exposto por causa desta migration sozinha). Independente
-- de `status` (active/archived, Fase 2/3 do sistema de alunas
-- particulares) -- um cartão arquivado E escondido são dois eixos
-- diferentes; a Fase 2 desta feature decide se cartão arquivado aparece
-- na lista de importação ou não.
alter table public.student_flashcards
  add column if not exists hidden_from_profile boolean not null default false;

-- Estatísticas agregadas de um perfil público, pra qualquer visitante
-- (inclusive SEM LOGIN -- ver decisão do grilling: perfil visível sem
-- conta, só a lista de cartões exige login). RLS de `progress` continua
-- SEM nenhuma policy nova (só auth.uid()=user_id) -- mesmo princípio já
-- usado em get_teacher_student_metrics (migration 029): toda checagem de
-- autorização mora dentro da function SECURITY DEFINER, nunca uma policy
-- declarativa que abriria a linha inteira (os dois idiomas, cards,
-- respostas granulares).
--
-- Reaproveita o campo `progressSummary` que serializeState() (fr/zh
-- app.js) já grava em TODO save desde que esse campo existe -- não
-- recalcula % de progresso do zero aqui (evita duplicar
-- computeProgressSummary() em SQL). Só inclui um idioma no resultado se
-- pct > 0 (grillado -- idioma nunca estudado não aparece no perfil).
create or replace function public.get_public_profile_stats(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_public boolean;
  v_data jsonb;
  v_langs jsonb := '[]'::jsonb;
  v_key text;
  v_lang jsonb;
  v_pct int;
begin
  select user_id, public_profile into v_user_id, v_public
  from profiles where username = p_username;

  if v_user_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if not v_public then
    return jsonb_build_object('error', 'not_public');
  end if;

  select data into v_data from progress where user_id = v_user_id;
  v_data := coalesce(v_data, '{}'::jsonb);

  for v_key in select jsonb_object_keys(v_data)
  loop
    v_lang := v_data -> v_key;
    -- object_keys também pega chaves não-idioma se algum dia existirem
    -- na raiz de `data` -- checagem defensiva, só processa se parecer
    -- um bloco de idioma de verdade (tem progressSummary ou xp).
    if jsonb_typeof(v_lang) = 'object' and (v_lang ? 'progressSummary' or v_lang ? 'xp') then
      v_pct := coalesce((v_lang -> 'progressSummary' ->> 'pct')::int, 0);
      if v_pct > 0 then
        v_langs := v_langs || jsonb_build_array(jsonb_build_object(
          'languageAppKey', v_key,
          'pct', v_pct,
          'levelLabel', v_lang -> 'progressSummary' ->> 'levelLabel',
          'xp', coalesce((v_lang ->> 'xp')::int, 0),
          'streak', coalesce((v_lang ->> 'streak')::int, 0),
          'lastStudyDay', v_lang ->> 'lastStudyDay'
        ));
      end if;
    end if;
  end loop;

  return jsonb_build_object('userId', v_user_id, 'languages', v_langs);
end;
$$;

revoke all on function public.get_public_profile_stats(text) from public;
-- `anon` incluso de propósito -- é a única function SECURITY DEFINER
-- desta feature chamável sem sessão (mesmo motivo de profiles_public_read
-- já ser `to anon, authenticated` desde a migration 001).
grant execute on function public.get_public_profile_stats(text) to anon, authenticated;
