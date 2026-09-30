-- Fase B do prompt-mestre "Decks, Tags e Painel" (ver documento
-- "Arquitetura Total -- Decks, Tags, Painel e Sistema de Estudo", e
-- CLAUDE.md seção "Fase A -- Auditoria Pré-Deck Engine") -- MODELO DE
-- DADOS de Deck. Só fundação: nenhum Deck Engine, nenhuma agregação,
-- nenhuma UI, nenhuma migração de Study Trail, nenhuma mudança de limite
-- Free/FSRS/Review nesta migration (tudo isso é Fase C+).
--
-- Invariantes já fixados que esta migration respeita, sem reabrir:
-- Note é fonte de verdade; CardInstance nunca é persistido (nenhuma
-- tabela nova pra isso); Deck nunca contém Fields/conteúdo/direção/
-- Card Type; uma Note tem no máximo 1 Deck efetivo (deck_id simples,
-- nunca N:N); Cards irmãos (Normal-reverso, Cloze multi-marca) sempre
-- compartilham Deck porque a associação vive na NOTE, nunca no
-- CardInstance (que nem existe persistido); Study Trail continua 100%
-- fora do banco nesta fase; Tags não mudam (continuam em
-- teacher_flashcards.tags/own_flashcards.tags, text[], migration 048).
--
-- ---------------------------------------------------------------------
-- Tipos de Deck (`kind`) -- decisão de representação (seção 5)
-- ---------------------------------------------------------------------
-- Uma coluna `kind text not null check (kind in (...))` -- mesmo padrão
-- já usado em TODO enum-like deste schema (teacher_students.status,
-- teacher_flashcards.language_app_key, profiles.role, etc., confirmado
-- por auditoria das migrations 025/026/028/042 antes de escrever isto --
-- nunca um tipo `enum` nativo do Postgres, nunca uma tabela de lookup).
-- 6 valores, cada um mapeado 1:1 num conceito do documento:
--   'root'          -- raiz de idioma (Francês/Mandarim/Português).
--   'personal_root' -- "Meus Decks", filho fixo da raiz.
--   'personal'      -- subdeck pessoal, dentro de Meus Decks.
--   'course'        -- Deck de curso (Study Trail) -- NENHUMA linha deste
--                       kind é criada por esta migration; só a
--                       representação existe, pronta pra quando a Fase E
--                       migrar Study Trail.
--   'teacher_root'  -- raiz "Cartões da Professora" pra 1 aluna+idioma.
--   'teacher'       -- subdeck dentro da árvore de uma professora.
-- Nenhum kind 'public' separado -- "público" é sempre uma FLAG
-- (`is_public`) sobre um Deck pessoal já existente, nunca um tipo à
-- parte (documento, seção sobre Deck público: "Deck público copiado é
-- independente" -- ele é sempre uma CÓPIA pessoal de outra conta, não
-- uma categoria estrutural nova).
--
-- ---------------------------------------------------------------------
-- Ownership (seção 9) -- por que 2 colunas (owner_id + teacher_id)
-- ---------------------------------------------------------------------
-- `owner_id` -- de quem é a ÁRVORE (a conta em cuja coleção o Deck
-- aparece). Pra Decks pessoais é a própria conta; pra Decks de
-- professora é a ALUNA (mesmo papel que teacher_flashcards.student_id já
-- desempenha -- é a coleção DELA que mostra esses cartões).
-- `teacher_id` -- nullable, só populado em 'teacher_root'/'teacher' --
-- quem CONTROLA/administra aquele subtree (mesmo nome de coluna que
-- teacher_flashcards.teacher_id, mesmo conceito). Mirror exato do par
-- (teacher_id, student_id) que teacher_flashcards já usa -- nunca um
-- terceiro vocabulário novo pra "quem pode editar x quem é o dono".
create table if not exists public.decks (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  teacher_id uuid references auth.users(id) on delete cascade,
  parent_deck_id bigint references public.decks(id) on delete cascade,
  kind text not null check (kind in ('root', 'personal_root', 'personal', 'course', 'teacher_root', 'teacher')),
  name text not null,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  -- Seção 10 (Public Deck) -- só a flag, sem nenhum campo adicional
  -- (slug público, contador de cópias, etc.) -- nada disso foi pedido
  -- ainda e seria especulativo. "Público" só se aplica a Decks pessoais
  -- (kind='personal'/'personal_root') -- curso/professora/raiz nunca
  -- ficam públicos por este mecanismo (checado no trigger abaixo).
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  -- Auto-parent nunca é válido (raiz também nunca tem parent, mas isso é
  -- responsabilidade do trigger abaixo, que sabe distinguir por kind --
  -- aqui só a regra universal "não pode ser pai de si mesmo").
  check (parent_deck_id is null or parent_deck_id <> id)
);

comment on table public.decks is 'Fase B -- entidade Deck (modelo de dados). Deck Engine ainda não existe -- ver Fase C.';

-- Seção 6 (raiz de idioma) + 7 (Meus Decks) + 9 (Teacher Deck) --
-- unicidade estrutural garantida por índice parcial (não por UNIQUE
-- constraint simples, já que só se aplica a alguns valores de `kind`):
-- no máximo 1 raiz por (dono, idioma), no máximo 1 "Meus Decks" por
-- (dono, idioma), no máximo 1 raiz de professora por
-- (aluna, professora, idioma).
create unique index if not exists decks_unique_root on public.decks (owner_id, language_app_key) where kind = 'root';
create unique index if not exists decks_unique_personal_root on public.decks (owner_id, language_app_key) where kind = 'personal_root';
create unique index if not exists decks_unique_teacher_root on public.decks (owner_id, teacher_id, language_app_key) where kind = 'teacher_root';

-- Seção 14 -- índices pra hierarquia/ownership/idioma/kind, todos citados
-- explicitamente na instrução.
create index if not exists decks_parent_deck_id_idx on public.decks (parent_deck_id);
create index if not exists decks_owner_id_idx on public.decks (owner_id);
create index if not exists decks_teacher_id_idx on public.decks (teacher_id);
create index if not exists decks_language_app_key_idx on public.decks (language_app_key);
create index if not exists decks_kind_idx on public.decks (kind);

alter table public.decks enable row level security;

-- Leitura: dono lê a própria árvore inteira (root/personal_root/personal
-- que possui); professora lê a árvore que ela controla (teacher_root/
-- teacher de qualquer aluna sua). Sem policy nenhuma pra 'course' -- não
-- existe linha desse kind ainda, e quando existir (Fase E) precisa de
-- decisão própria de quem pode ler curso (provavelmente `to
-- authenticated using (true)`, já que é conteúdo do sistema, não
-- privado -- não decidido aqui de propósito, fora do escopo).
drop policy if exists decks_owner_select on public.decks;
create policy decks_owner_select on public.decks
  for select using (auth.uid() = owner_id);

drop policy if exists decks_teacher_select on public.decks;
create policy decks_teacher_select on public.decks
  for select using (auth.uid() = teacher_id);

-- Escrita normal do usuário: só subdecks pessoais (kind='personal') que
-- ele mesmo possui -- nunca 'root'/'personal_root' (bootstrap-only, ver
-- ensure_user_decks() abaixo, mesmo princípio de "Meus Decks é REAL mas
-- não é criado por ação normal do usuário" -- section 7 não pede um
-- fluxo de criação manual de Meus Decks, só que ele EXISTA), nunca
-- 'course'/'teacher_root'/'teacher' (owner comum nunca controla essas
-- árvores).
drop policy if exists decks_owner_write on public.decks;
create policy decks_owner_write on public.decks
  for all using (auth.uid() = owner_id and kind = 'personal' and teacher_id is null)
  with check (auth.uid() = owner_id and kind = 'personal' and teacher_id is null);

-- Escrita da professora: só subdecks 'teacher' dentro da própria árvore
-- -- nunca 'teacher_root' (bootstrap-only, mesmo raciocínio acima),
-- nunca decks de outra professora (teacher_id = auth.uid() já garante
-- isso). Aluno nunca tem write nenhum sobre Teacher Deck (seção 15,
-- "Aluno não pode: editar; mover; apagar") -- nenhuma policy dá a ela
-- write aqui, só decks_teacher_select (leitura).
drop policy if exists decks_teacher_write on public.decks;
create policy decks_teacher_write on public.decks
  for all using (auth.uid() = teacher_id and kind = 'teacher')
  with check (auth.uid() = teacher_id and kind = 'teacher');

-- Admin (mesmo e-mail hardcoded de sempre, mesmo padrão de
-- teacher_flashcards/teacher_students) -- único jeito de mexer em
-- root/personal_root/teacher_root/course por fora de ensure_user_decks()
-- (ex.: correção manual, debug).
drop policy if exists decks_admin_write on public.decks;
create policy decks_admin_write on public.decks
  for all using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

-- ---------------------------------------------------------------------
-- Integridade de hierarquia (seção 16) -- trigger, não só CHECK, porque
-- a validação cruza linhas (o parent precisa existir e ter kind/dono/
-- idioma compatíveis com o filho) e detecta ciclo mais profundo que um
-- CHECK simples não expressa.
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
    -- Study Trail não é migrado nesta fase (nenhuma linha kind='course'
    -- é criada por esta migration) -- só a regra já decidível hoje: é
    -- conteúdo do sistema, nunca de uma conta específica. Como/se um
    -- futuro Deck de curso se encaixa sob a raiz de CADA aluna, ou existe
    -- como árvore própria por idioma, fica explicitamente em aberto pra
    -- quando a Fase E migrar Study Trail -- não decidido aqui.
    if new.owner_id is not null or new.teacher_id is not null then
      raise exception 'Deck de curso não pode ter owner_id/teacher_id (é conteúdo do sistema, não de uma conta).';
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

drop trigger if exists decks_validate_hierarchy_trigger on public.decks;
create trigger decks_validate_hierarchy_trigger
  before insert or update on public.decks
  for each row execute function public.decks_validate_hierarchy();

-- ---------------------------------------------------------------------
-- Note -> Deck (seção 11) -- deck_id simples, nullable, on delete set
-- null (nunca cascade -- apagar um Deck não pode apagar a Note/Fields/
-- FSRS/progresso dela; a Note só perde a organização, volta a "sem
-- Deck", igual a uma linha Legacy hoje -- seção 12). Nenhuma coluna
-- nova em Legacy: é a MESMA coluna `deck_id`, legado ou nativo, pareada
-- ou não com `fields`/`card_generation_mode` -- Deck é um eixo de
-- ORGANIZAÇÃO, ortogonal a Legacy x Nativo (mesmo espírito de `tags`,
-- migration 048, que também nunca distinguiu Legacy de Nativo).
-- ---------------------------------------------------------------------
alter table public.own_flashcards add column if not exists deck_id bigint references public.decks(id) on delete set null;
create index if not exists own_flashcards_deck_id_idx on public.own_flashcards (deck_id);

alter table public.teacher_flashcards add column if not exists deck_id bigint references public.decks(id) on delete set null;
create index if not exists teacher_flashcards_deck_id_idx on public.teacher_flashcards (deck_id);

-- Cards irmãos (Normal-reverso -> 2 CardInstances, Cloze multi-marca ->
-- N) nunca recebem Decks diferentes PORQUE nunca existe um `deck_id` por
-- CardInstance pra divergir -- eles são todos derivados em runtime da
-- MESMA linha/Note (buildEngineCardsFromRow(), shared/flashcard-model.js,
-- intocado nesta fase), que só tem 1 `deck_id`. Isso é garantido pela
-- própria ausência de uma coluna de Deck no CardInstance (nunca
-- existiu, nunca vai existir -- seção 3.6), não por nenhuma lógica nova
-- desta migration.

-- Note pessoal só pode apontar pra Deck pessoal do mesmo dono/idioma;
-- Note de professora só pode apontar pra Deck da mesma professora/
-- aluna/idioma. Trigger (não CHECK) pelo mesmo motivo do de decks acima
-- -- valida contra outra tabela. Rodando como o papel que faz a
-- escrita (nunca SECURITY DEFINER): tanto a escrita normal em
-- own_flashcards (a própria conta) quanto em teacher_flashcards (hoje só
-- a admin/professora, via decks_admin_write) já teriam, por RLS de
-- leitura de `decks`, acesso de SELECT ao Deck que estão referenciando
-- quando o vínculo é legítimo -- um deck_id de outra conta nunca seria
-- lido dentro do trigger, então cai em "not found", rejeitado. Reforça
-- a segurança numa 2ª camada, nunca substitui a RLS de escrita das duas
-- tabelas (que continua intocada -- own_flashcards_owner_all/
-- teacher_flashcards_admin_write).
create or replace function public.own_flashcards_validate_deck()
returns trigger
language plpgsql
as $$
declare
  v_deck public.decks%rowtype;
begin
  if new.deck_id is null then
    return new;
  end if;
  select * into v_deck from public.decks where id = new.deck_id;
  if not found or v_deck.kind not in ('personal_root', 'personal')
     or v_deck.owner_id <> new.owner_id or v_deck.language_app_key <> new.language_app_key then
    raise exception 'own_flashcards.deck_id precisa apontar pra um Deck pessoal (Meus Decks ou subdeck) do mesmo dono e idioma.';
  end if;
  return new;
end;
$$;

drop trigger if exists own_flashcards_validate_deck_trigger on public.own_flashcards;
create trigger own_flashcards_validate_deck_trigger
  before insert or update on public.own_flashcards
  for each row execute function public.own_flashcards_validate_deck();

create or replace function public.teacher_flashcards_validate_deck()
returns trigger
language plpgsql
as $$
declare
  v_deck public.decks%rowtype;
begin
  if new.deck_id is null then
    return new;
  end if;
  select * into v_deck from public.decks where id = new.deck_id;
  if not found or v_deck.kind not in ('teacher_root', 'teacher')
     or v_deck.owner_id <> new.student_id or v_deck.teacher_id <> new.teacher_id
     or v_deck.language_app_key <> new.language_app_key then
    raise exception 'teacher_flashcards.deck_id precisa apontar pra um Deck da professora (raiz ou subdeck) da mesma aluna/professora/idioma.';
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_flashcards_validate_deck_trigger on public.teacher_flashcards;
create trigger teacher_flashcards_validate_deck_trigger
  before insert or update on public.teacher_flashcards
  for each row execute function public.teacher_flashcards_validate_deck();

-- ---------------------------------------------------------------------
-- Inicialização (seção 13) -- function idempotente, SECURITY DEFINER
-- (mesmo padrão de get_teacher_student_metrics, migration 029) porque
-- precisa criar 'root'/'personal_root', que a RLS normal de escrita
-- (decks_owner_write) deliberadamente NÃO permite pro usuário comum.
-- Checagem de autorização interna: só a própria conta (ou admin) pode
-- bootstrapar pra um owner_id -- nunca uma conta arbitrária bootstrapando
-- Decks pra outra.
--
-- Escopo desta migration: só root + personal_root (bootstrap "de
-- conta"). teacher_root fica pra quando a Fase H (árvore de professora)
-- decidir o mecanismo certo de disparo (ex.: no momento em que um
-- vínculo teacher_students é criado) -- não implementado aqui, de
-- propósito, e não é um bloqueio: teacher_flashcards.deck_id continua
-- nullable, e nenhuma linha existente depende de Deck pra continuar
-- funcionando (Deck Engine, o único consumidor futuro, ainda não
-- existe).
--
-- Não invocada por esta migration pra nenhuma das 22 contas reais
-- existentes -- decisão documentada no checkpoint desta fase: nada
-- consome root/personal_root ainda (Fase C não existe), então backfill
-- silencioso pra contas existentes seria especulativo; fica pra quando
-- o primeiro consumidor real (Fase C) decidir se chama isto sob demanda
-- (lazy, na 1ª leitura de Decks) ou via backfill explícito.
create or replace function public.ensure_user_decks(p_owner_id uuid, p_language_app_key text)
returns table (root_deck_id bigint, personal_root_deck_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_id bigint;
  v_personal_root_id bigint;
  v_language_label text;
begin
  if p_language_app_key not in ('frances', 'mandarim', 'portugues') then
    raise exception 'Idioma inválido: %', p_language_app_key;
  end if;
  if auth.uid() is distinct from p_owner_id and (auth.jwt() ->> 'email') <> 'brunemed1310@gmail.com' then
    raise exception 'not_authorized';
  end if;

  -- Mesmos rótulos em português já usados em outros pontos do cliente
  -- pra estes 3 idiomas (ex.: STUDENT_LANGUAGE_LABELS, shared/
  -- admin-students.js) -- nunca uma escolha nova.
  v_language_label := case p_language_app_key
    when 'frances' then 'Francês'
    when 'mandarim' then 'Mandarim'
    when 'portugues' then 'Português'
    else p_language_app_key
  end;

  select id into v_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
  if v_root_id is null then
    insert into public.decks (owner_id, kind, name, language_app_key)
    values (p_owner_id, 'root', v_language_label, p_language_app_key)
    on conflict do nothing
    returning id into v_root_id;
    if v_root_id is null then
      -- Corrida: outra chamada concorrente já inseriu entre o select e o
      -- insert acima -- idempotência garantida pelo índice único parcial
      -- decks_unique_root, releitura simples resolve.
      select id into v_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
    end if;
  end if;

  select id into v_personal_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
  if v_personal_root_id is null then
    insert into public.decks (owner_id, parent_deck_id, kind, name, language_app_key)
    values (p_owner_id, v_root_id, 'personal_root', 'Meus Decks', p_language_app_key)
    on conflict do nothing
    returning id into v_personal_root_id;
    if v_personal_root_id is null then
      select id into v_personal_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
    end if;
  end if;

  return query select v_root_id, v_personal_root_id;
end;
$$;

revoke all on function public.ensure_user_decks(uuid, text) from public;
grant execute on function public.ensure_user_decks(uuid, text) to authenticated;
