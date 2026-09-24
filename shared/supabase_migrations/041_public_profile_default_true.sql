-- Reversão explícita e confirmada de uma decisão de privacidade já
-- grillada (Fase 1 do prompt-mestre "perfil público / flashcards
-- públicos", ver CLAUDE.md -- "privado por padrão" foi resposta a uma
-- pergunta direta do grilling na época). A autora pediu diretamente:
-- "Tem como tornar todo perfil público (cartões, progresso, conquistas
-- etc) dos usuários por default ao invés de privado por default?" --
-- confirmado explicitamente (via AskUserQuestion) que o escopo inclui
-- TAMBÉM as contas já registradas, não só as novas.
--
-- Muda o DEFAULT da coluna (contas futuras já nascem públicas) e faz um
-- UPDATE em massa nas linhas já existentes -- as duas partes foram
-- confirmadas explicitamente com a autora antes de rodar, ver CLAUDE.md.
alter table public.profiles
  alter column public_profile set default true;

update public.profiles set public_profile = true where public_profile = false;
