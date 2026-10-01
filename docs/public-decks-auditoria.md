# Auditoria de prontidão -- Public Decks + atribuição de cópias (somente leitura)

Nenhum código, migration, RPC, RLS, rota ou UI foi alterado. Origem das regras: o documento
"Arquitetura Total" NÃO está no repositório; as regras abaixo vêm das instruções da autora
(prompts K.8 e desta etapa), de `CLAUDE.md`, `docs/K-analytics-contrato.md` e das migrations.
Onde isso não decide, está marcado **DECISÃO PENDENTE**.

## 1. Status: BLOCKED (para Public Decks e atribuição); Perfil Público = PARTIALLY READY
O Perfil Público por conta existe e funciona. Public Deck e `source_*` não existem; o modelo público
atual (por conta, cartões soltos) conflita em pontos concretos com a arquitetura (seção 5).

## 2. O que a arquitetura exige (regras dadas)
Public Deck é flag sobre Deck pessoal (`is_public`), nunca um `kind` próprio; cartão público pode ser
copiado; cópia independente, sem live link; `source_user_id/source_card_id` preservados; "Já adicionado";
cópia entra no teto Free de 20 CardInstances; report via Reports existente; sem duplicata silenciosa;
sem migração destrutiva; Note = fonte de verdade, CardInstance derivada e nunca persistida; Deck =
organização; privacidade filtrada no servidor; FSRS/due/N-L-R/Teacher/Study nunca públicos.

## 3. O que existe
- `profiles.public_profile` (default true; 041 tornou todas as contas públicas), rota `#/user/<username>`
  sem login (`shared/router.js`, `shared/public-profile.js`).
- `get_public_profile_stats(text)` (037) e `get_public_flashcards(text,text)` (038, hoje na versão 056,
  lê `own_flashcards`): SECURITY DEFINER, `search_path=public`, `grant ... to anon, authenticated`; checam
  `public_profile` e filtram `status='active'` e `hidden_from_profile=false` no servidor.
- Gate de login no cliente para ver/importar; cópia via `createOwnFlashcard` (nova linha independente,
  Deck padrão, preflight do teto Free por CardInstance, `#flashcard-limit-modal`); reporte `openReportModal`;
  tags viajam como valor.
- `decks.is_public boolean default false` (049): triggers rejeitam público em `root`, `teacher_root`,
  `teacher` e `course`; `personal_root` e `personal` NÃO rejeitam. Nada lê ou escreve a flag. RLS de `decks`:
  dono lê/escreve o próprio `personal`, professora lê a árvore Teacher; ninguém além do dono lê Deck pessoal.
  `shared/deck-engine.js` registra explicitamente que nenhuma checagem pública foi adicionada.

## 4. Gaps exatos
1. Nenhum fluxo publica/despublica Deck; nenhuma RPC/rota/slug de Deck público; nenhuma UI de publicar.
2. Zero `source_user_id`/`source_card_id` (nenhum arquivo). Logo: sem origem permanente, sem "Já adicionado",
   sem proteção contra duplicata (hoje importar duas vezes cria duas linhas), sem importação de Deck inteiro.
3. Cópia atual cai no Deck padrão do importador (Meus Decks); a árvore do Deck público não é reproduzida.
4. Sem política para tornar privado de novo, nem para cópias já feitas.

## 5. Conflitos entre arquitetura e implementação
- **Unidade e fonte do conteúdo público.** `get_public_flashcards` devolve as colunas Legacy espelhadas
  (`front`, `back_trans`, `front_pinyin`, `front_is_target_language`), não `fields`/`card_generation_mode`.
  Em Note nativa essas colunas são mirror write-only (6D.6): Cloze tem `front` nulo, Múltipla Escolha perde os
  distratores, Type Answer perde o formato, mídia por Field não é entregue. Resultado: o que o visitante vê e
  copia pode ser incompleto/enganoso para Notes nativas. Viola "Note é a fonte de verdade".
- **Publicação por conta, não por Deck.** "Conta pública = todos os cartões ativos não escondidos" contradiz
  "Public Deck = flag no Deck". `hidden_from_profile` é um 3º eixo de visibilidade que teria de coexistir.
- **Contagem.** A RPC devolve uma linha por Note; Reverse/Cloze não aparecem como CardInstances, e o teto
  Free só é calculado no cliente depois de baixar a Note. A contagem pública de "cartões" exigiria
  `generatedCardInstanceCount` (cliente hoje) no servidor ou uma regra de exibição só em Notes.
- **Enumeração.** `anon` pode listar tudo de qualquer username público; o `id` retornado é sequencial.
  Aceitável hoje (tudo é público por definição), mas uma RPC de Deck por `id` permitiria sondar Decks privados
  se não responder igual a "não existe" e "privado".
- `own_flashcards.status='archived'` é excluído (correto); Teacher/Study nunca entram (correto, tabela diferente).

## 6. Modelo de dados proposto (conceitual, nada criado)
- **Atribuição vive na NOTE** (linha de `own_flashcards`), não na CardInstance: `source_user_id uuid`
  (nullable, sem FK com cascade; `on delete set null` ou texto estável) e `source_note_id bigint`
  (nome do arquivo de regras é `source_card_id`; semanticamente é o id da linha/Note de origem). CardInstances
  irmãs (Reverse, Cloze, `-rN`) herdam por derivação em runtime porque compartilham o `rowId`; nada novo na
  CardInstance. Unicidade parcial `(owner_id, source_user_id, source_card_id)` onde não nulo = base de
  "Já adicionado" e anti-duplicata. Exclusiva de cópias públicas; Teacher e criação própria ficam nulos.
- **Visibilidade vive no Deck** (`is_public` já existe), só em `personal_root`/`personal` (as triggers já
  restringem). Conteúdo público = Notes ativas cujo `deck_id` está na subárvore pública. Slug/URL: **DECISÃO PENDENTE**
  (sugestão: `#/user/<username>/deck/<id>`, estável por id).
- **Payload público** = projeção da Note nativa (campos de texto, `card_generation_mode`, tags, mídia pública se
  decidido), sem `revision`, FSRS, due, status, `hidden_from_profile`, ids internos além do necessário.

## 7. Segurança/RLS/RPC
Existe: SECURITY DEFINER + checagem de flag no servidor, sem policy pública em `own_flashcards`/`decks`.
Faltaria: RPC de Deck público que valide `is_public` em todos os ancestrais relevantes e devolva resposta idêntica
para "inexistente" e "privado"; RPC de cópia atômica (insere a Note com `source_*` e respeita o teto Free no
servidor, hoje só cliente); trigger que impeça editar/forjar `source_*` pelo dono depois da inserção; revisão do
`grant to anon` (manter só nas RPCs de leitura pública); mídia: bucket `flashcard-media` é público por URL,
então "mídia privada" não existe -- publicar um Deck publica as URLs.

## 8. Fluxo conceitual
Dono publica Deck pessoal -> visitante sem login vê Deck/contagens -> login exigido para ver Notes/copiar ->
cópia atômica cria Notes novas (Native, Deck de destino, tags, `source_*`) -> coleção própria independente
(editar/apagar/privatizar o original não altera a cópia; a atribuição permanece) -> "Já adicionado" por unicidade.

## 9. Decisões pendentes
Tipos de Deck públicos (arquitetura só afirma "pessoal"; `personal_root` pode?); visibilidade herdada pela
subárvore ou por Deck; Deck vazio publicável; o que a página mostra (Notes, CardInstances ou ambos; sugestão:
Notes + contagem de cartões separada, Reverse=1/2, Cloze=1/N); mídia pública; tags públicas; o que acontece com
cópias ao despublicar (sugestão: nada); original apagado (sugestão: `source_*` permanece, só some o vínculo de
exibição); conteúdo editável após publicar (a cópia já feita não muda); coexistência com `hidden_from_profile`
e com o perfil por conta (substituir ou manter); copiar Deck inteiro vs. cartão a cartão e como mapear a árvore;
Anki export/import preservar `source_*` (sugestão: ficam fora do `.apkg`, preservados só no banco);
política pública de **XP/streak/progresso (DECISÃO PENDENTE -- manter públicos por padrão ou mudar)**.

## 10. Ordem recomendada
1) Decisões da seção 9. 2) Corrigir a RPC pública para projetar a Note nativa (sem isso, publicar é enganoso).
3) `source_*` + unicidade + trigger de imutabilidade (aditivo, sem backfill). 4) RPC de cópia atômica com teto
Free no servidor e "Já adicionado". 5) Publicar/despublicar Deck + RPC de leitura por Deck + rota. 6) Cópia de
Deck inteiro. 7) Só então Public Analytics (K.8).

## 11. Testes necessários antes de publicar
Privacidade (anon: privado = inexistente; Teacher/Study/FSRS nunca; arquivado fora; subárvore), unidade
(Reverse/Cloze/`-rN`), cópia (independência, `source_*` estáveis, edição/exclusão do original, duplicata, "Já
adicionado", teto Free servidor+cliente, atomicidade), RLS com papéis reais (SQL local e Supabase), Playwright
FR/ZH sem login e logado, enumeração de ids, Anki round-trip.

## 12. Impacto em K.8
K.8 permanece bloqueada. Pré-requisitos: itens 2-5 acima e a decisão de política de XP/streak/progresso.

## 13. Itens a carregar para a auditoria final
- K.7: fronteira real da lição (`dueCount` no fim de lição) e texto real do banner de revisão sem teste de
  browser; só evidência indireta das fórmulas.
- Política pública de XP/streak/progresso (já publicados por conta, `public_profile` true para todos).
- Migration 059 NÃO aplicada: aplicar antes de publicar o front da K.6/K.7.
- `notification-cron` (K.0-C) NÃO deployado.
- Testes SQL de K.0/K.6 só rodaram em Postgres local com schema mínimo, nunca no Supabase real.
