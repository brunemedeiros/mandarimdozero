-- Fase E do prompt-mestre "Decks, Tags e Painel" (ver documento
-- "Arquitetura Total -- Decks, Tags, Painel e Sistema de Estudo", e
-- CLAUDE.md seção "Fase E -- Study Trail <-> Decks") -- materializa os
-- Course Decks que a migration 049 (Fase B) já tinha reservado no `kind`
-- mas deliberadamente não criava ("nenhuma linha deste kind é criada por
-- esta migration -- Study Trail continua fora do banco").
--
-- Decisão de granularidade (Etapa 2, já travada e documentada em
-- CLAUDE.md antes desta migration ser escrita): 1 Deck de curso RAIZ por
-- idioma (kind='course', course_unit_id NULL, parent_deck_id NULL) + 1
-- Deck de curso FILHO por Unit que de fato produz vocabulário
-- (kind='course', course_unit_id = String(u.id), parent do Deck raiz do
-- mesmo idioma). Unidades de gramática (fr, type:'grammar') nunca geram
-- vocab/cards (buildCardsFromUnits() já as pula) -- nunca ganham Course
-- Deck.
--
-- `course_unit_id` é sempre `text` (nunca `integer`) porque `u.id` tem
-- FORMATOS DIFERENTES entre os dois idiomas -- confirmado por auditoria
-- do content.js real antes de escrever isto: fr usa string
-- ("A1-1"/"A1-g1"), zh usa number (1, 2, 3...). Nunca
-- `unitId === deckId` (regra fundamental do prompt-mestre) --
-- `course_unit_id` é só uma CHAVE DE BUSCA no Deck (mesmo papel que
-- `teacher_id`/`owner_id` já cumprem noutras linhas -- identificam, não
-- SÃO a identidade primária, que continua sendo `decks.id`, bigint
-- próprio, nunca reaproveitado de `unitId`).
alter table public.decks add column if not exists course_unit_id text;

-- Unicidade estrutural (mesmo padrão de índice parcial já usado pra
-- root/personal_root/teacher_root, migration 049) -- nunca 2 Course
-- Decks pra a mesma Unit no mesmo idioma, nunca 2 raízes de curso pro
-- mesmo idioma.
create unique index if not exists decks_unique_course_unit
  on public.decks (language_app_key, course_unit_id)
  where kind = 'course' and course_unit_id is not null;

create unique index if not exists decks_unique_course_root
  on public.decks (language_app_key)
  where kind = 'course' and course_unit_id is null;

-- ---------------------------------------------------------------------
-- Estende decks_validate_hierarchy() (migration 049) -- o ramo `course`
-- de lá só checava owner_id/teacher_id nulos, sem validar hierarquia
-- (nenhuma linha desse kind existia ainda). Agora que Course Decks têm 2
-- níveis reais (raiz + por-Unit), a mesma disciplina de validação
-- cross-row que os outros 5 kinds já têm passa a valer aqui também --
-- `create or replace function`, mesma assinatura/trigger de sempre,
-- nenhuma outra ramificação (root/personal_root/personal/teacher_root/
-- teacher) tocada.
-- ---------------------------------------------------------------------
create or replace function public.decks_validate_hierarchy()
returns trigger
language plpgsql
as $$
declare
  v_parent public.decks%rowtype;
  v_ancestor_id bigint;
  v_depth int := 0;
begin
  if new.kind = 'root' then
    if new.parent_deck_id is not null then
      raise exception 'Deck raiz (kind=root) não pode ter parent_deck_id.';
    end if;
    if new.owner_id is null then
      raise exception 'Deck raiz precisa de owner_id.';
    end if;
    if new.teacher_id is not null then
      raise exception 'Deck raiz não pode ter teacher_id.';
    end if;
    if new.is_public then
      raise exception 'Deck raiz não pode ser público.';
    end if;

  elsif new.kind = 'personal_root' then
    if new.owner_id is null then
      raise exception 'Meus Decks precisa de owner_id.';
    end if;
    if new.teacher_id is not null then
      raise exception 'Meus Decks não pode ter teacher_id.';
    end if;
    select * into v_parent from public.decks where id = new.parent_deck_id;
    if not found or v_parent.kind <> 'root' or v_parent.owner_id <> new.owner_id
       or v_parent.language_app_key <> new.language_app_key then
      raise exception 'Meus Decks precisa ter como parent o Deck raiz do mesmo dono/idioma.';
    end if;

  elsif new.kind = 'personal' then
    if new.owner_id is null then
      raise exception 'Deck pessoal precisa de owner_id.';
    end if;
    if new.teacher_id is not null then
      raise exception 'Deck pessoal não pode ter teacher_id.';
    end if;
    select * into v_parent from public.decks where id = new.parent_deck_id;
    if not found or v_parent.kind not in ('personal_root', 'personal')
       or v_parent.owner_id <> new.owner_id or v_parent.language_app_key <> new.language_app_key then
      raise exception 'Deck pessoal precisa ter como parent Meus Decks ou outro Deck pessoal do mesmo dono/idioma.';
    end if;

  elsif new.kind = 'teacher_root' then
    if new.owner_id is null or new.teacher_id is null then
      raise exception 'Deck da professora (raiz) precisa de owner_id (aluna) e teacher_id (professora).';
    end if;
    if new.is_public then
      raise exception 'Deck da professora não pode ser público.';
    end if;
    select * into v_parent from public.decks where id = new.parent_deck_id;
    if not found or v_parent.kind <> 'root' or v_parent.owner_id <> new.owner_id
       or v_parent.language_app_key <> new.language_app_key then
      raise exception 'Deck da professora (raiz) precisa ter como parent o Deck raiz da mesma aluna/idioma.';
    end if;

  elsif new.kind = 'teacher' then
    if new.owner_id is null or new.teacher_id is null then
      raise exception 'Subdeck da professora precisa de owner_id (aluna) e teacher_id (professora).';
    end if;
    if new.is_public then
      raise exception 'Deck da professora não pode ser público.';
    end if;
    select * into v_parent from public.decks where id = new.parent_deck_id;
    if not found or v_parent.kind not in ('teacher_root', 'teacher')
       or v_parent.owner_id <> new.owner_id or v_parent.teacher_id <> new.teacher_id
       or v_parent.language_app_key <> new.language_app_key then
      raise exception 'Subdeck da professora precisa ter como parent o Deck raiz da professora ou outro subdeck dela, mesma aluna/idioma.';
    end if;

  elsif new.kind = 'course' then
    -- Fase E: Course Deck é sempre conteúdo do sistema -- nunca de uma
    -- conta (regra já travada na migration 049, reafirmada aqui).
    if new.owner_id is not null or new.teacher_id is not null then
      raise exception 'Deck de curso não pode ter owner_id/teacher_id (é conteúdo do sistema, não de uma conta).';
    end if;
    if new.is_public then
      raise exception 'Deck de curso não pode ser público.';
    end if;
    if new.course_unit_id is null then
      -- Raiz de curso (1 por idioma) -- nunca tem parent.
      if new.parent_deck_id is not null then
        raise exception 'Deck de curso raiz (course_unit_id nulo) não pode ter parent_deck_id.';
      end if;
    else
      -- Deck de curso por Unit -- precisa ter como parent a RAIZ de curso
      -- do mesmo idioma (nunca outro Deck por-Unit, nunca um Deck de
      -- outro kind).
      select * into v_parent from public.decks where id = new.parent_deck_id;
      if not found or v_parent.kind <> 'course' or v_parent.course_unit_id is not null
         or v_parent.language_app_key <> new.language_app_key then
        raise exception 'Deck de curso por Unit precisa ter como parent a raiz de curso do mesmo idioma.';
      end if;
    end if;
  end if;

  -- Ciclo mais profundo que auto-parent direto (já barrado pelo CHECK da
  -- tabela) -- só importa de verdade quando um futuro "mover Deck"
  -- (Fase C) fizer UPDATE de parent_deck_id; em INSERT nunca dispara
  -- (uma linha nova não pode já ser ancestral de si mesma), mas o
  -- trigger roda nos dois eventos pra já vir pronto pra isso.
  if new.parent_deck_id is not null then
    v_ancestor_id := new.parent_deck_id;
    while v_ancestor_id is not null loop
      v_depth := v_depth + 1;
      if v_depth > 100 then
        raise exception 'Hierarquia de Decks excede profundidade razoável -- possível ciclo.';
      end if;
      if v_ancestor_id = new.id then
        raise exception 'Hierarquia de Decks não pode formar ciclo.';
      end if;
      select parent_deck_id into v_ancestor_id from public.decks where id = v_ancestor_id;
    end loop;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS -- leitura de Course Deck é pública entre contas autenticadas E
-- convidadas (Study Trail funciona em modo convidado, sem sessão real --
-- ver CLAUDE.md "modo convidado"): é conteúdo do sistema, sem nenhum
-- dado sensível (só id/nome/hierarquia), mesmo raciocínio já usado pras
-- funções RPC de perfil público (get_public_profile_stats,
-- get_public_flashcards). Escopado estritamente a `kind='course'` --
-- nunca vaza leitura de Deck pessoal/de professora por engano (essas
-- continuam só sob decks_owner_select/decks_teacher_select).
-- Escrita continua SÓ via ensure_course_decks() (SECURITY DEFINER,
-- abaixo) ou decks_admin_write (migration 049, e-mail hardcoded) --
-- nenhuma policy de escrita nova pra usuário comum.
drop policy if exists decks_course_select on public.decks;
create policy decks_course_select on public.decks
  for select using (kind = 'course');

-- ---------------------------------------------------------------------
-- Bootstrap idempotente dos Course Decks de UM idioma -- SEPARADO de
-- ensure_user_decks() (migration 049, semanticamente exclusiva de
-- root/personal_root "de conta"), conforme a instrução desta fase exigia
-- explicitamente. SECURITY DEFINER porque nenhuma policy de escrita
-- comum cobre kind='course' (só decks_admin_write, e-mail hardcoded) --
-- mas a função em si só grava linhas kind='course'/owner_id=null/
-- teacher_id=null (hardcoded no corpo, nunca a partir de input do
-- chamador), então nenhum caller pode usar isto pra escrever um Deck
-- pessoal/de professora por essa via.
--
-- `p_units` -- array de {unit_id, title}, sempre vindo do CLIENTE (só
-- content.js sabe quais Units existem de verdade -- não há tabela de
-- Units no banco, de propósito, Study Trail continua 100% fora do banco
-- nesta fase). A função só RECONCILIA Course Decks pra bater com o que o
-- cliente informou -- nunca inventa Units, nunca apaga Course Decks de
-- Units que sumiram de uma chamada pra outra (nenhuma migração
-- destrutiva, regra explícita desta fase).
--
-- Só `authenticated` pode chamar (nunca `anon`) -- mesmo nível de
-- restrição de ensure_user_decks(); modo convidado (sem sessão real)
-- nunca chama isto, então cartões de trilha em modo convidado
-- simplesmente não ganham deckId nesta fase (mesmo comportamento de
-- hoje, sem nenhuma UI que dependa disso ainda).
create or replace function public.ensure_course_decks(p_language_app_key text, p_units jsonb)
returns setof public.decks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_id bigint;
  v_language_label text;
  v_unit jsonb;
  v_unit_id text;
  v_unit_title text;
  v_deck_id bigint;
begin
  if p_language_app_key not in ('frances', 'mandarim', 'portugues') then
    raise exception 'Idioma inválido: %', p_language_app_key;
  end if;

  v_language_label := case p_language_app_key
    when 'frances' then 'Francês'
    when 'mandarim' then 'Mandarim'
    when 'portugues' then 'Português'
    else p_language_app_key
  end;

  -- Raiz de curso do idioma -- mesmo padrão select-then-insert-if-missing
  -- de ensure_user_decks() (idempotência garantida pelo índice único
  -- parcial decks_unique_course_root, releitura resolve corrida).
  select id into v_root_id from public.decks
    where language_app_key = p_language_app_key and kind = 'course' and course_unit_id is null;
  if v_root_id is null then
    insert into public.decks (kind, name, language_app_key, course_unit_id)
    values ('course', v_language_label || ' — Curso', p_language_app_key, null)
    on conflict (language_app_key) where (kind = 'course' and course_unit_id is null) do nothing
    returning id into v_root_id;
    if v_root_id is null then
      select id into v_root_id from public.decks
        where language_app_key = p_language_app_key and kind = 'course' and course_unit_id is null;
    end if;
  end if;

  -- Um Deck por Unit informada -- mesmo padrão, mais um UPDATE leve de
  -- `name` caso o título da Unit tenha mudado em content.js desde o
  -- último bootstrap (nunca toca kind/ownership/hierarquia).
  for v_unit in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb))
  loop
    v_unit_id := v_unit ->> 'unit_id';
    v_unit_title := coalesce(v_unit ->> 'title', v_unit_id);
    if v_unit_id is null or length(trim(v_unit_id)) = 0 then
      continue;
    end if;

    select id into v_deck_id from public.decks
      where language_app_key = p_language_app_key and kind = 'course' and course_unit_id = v_unit_id;
    if v_deck_id is null then
      insert into public.decks (kind, name, language_app_key, course_unit_id, parent_deck_id)
      values ('course', v_unit_title, p_language_app_key, v_unit_id, v_root_id)
      on conflict (language_app_key, course_unit_id) where (kind = 'course' and course_unit_id is not null) do nothing
      returning id into v_deck_id;
      if v_deck_id is null then
        select id into v_deck_id from public.decks
          where language_app_key = p_language_app_key and kind = 'course' and course_unit_id = v_unit_id;
      end if;
    else
      update public.decks set name = v_unit_title
        where id = v_deck_id and name is distinct from v_unit_title;
    end if;
  end loop;

  return query select * from public.decks
    where language_app_key = p_language_app_key and kind = 'course'
    order by (course_unit_id is not null), id;
end;
$$;

revoke all on function public.ensure_course_decks(text, jsonb) from public;
grant execute on function public.ensure_course_decks(text, jsonb) to authenticated;
