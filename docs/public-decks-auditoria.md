# Auditoria de prontidão -- Public Decks + atribuição (v2, contra a Arquitetura Total)

Somente leitura: nenhum código, migration, RPC, RLS, rota ou UI foi alterado.
**Fonte de verdade:** `docs/arquitetura-total-decks-tags-painel.md` (citada por seção, "AT §n").
**Esta v2 substitui a v1** (commit `dce4748`), escrita sem acesso ao documento. A seção 1 lista o que mudou.

## 1. Correções em relação à v1 (o que a v1 errou ou presumiu)
| # | v1 dizia | O documento define | Efeito |
|---|---|---|---|
| 1 | Atribuição por colunas `source_user_id/source_card_id` na Note | Atribuição = **Tag permanente `criado-por-[username]`**, não removível pelo destinatário (AT §10.3, inv. 14). AT §6 prevê "metadados de origem/atribuição/importação" na Note, sem nomear colunas | `source_*` não é exigido pelo documento; deixa de ser premissa. Colunas só se forem necessárias para "semelhante/já importado" (DECISÃO PENDENTE) |
| 2 | `personal_root` talvez público | **Só Decks DENTRO de Meus Decks** podem ser públicos; não curso, não professora, não raiz do idioma (AT §18) | `personal_root` (Meus Decks em si) fica de fora; a trigger atual a permite e teria de ser apertada |
| 3 | Visitante vê Notes após login | **Free** sabe que o Deck existe mas **não abre nem importa**; **Premium** importa Deck público de qualquer usuário (AT §18.2) | Gate de login atual é insuficiente; falta gate de plano |
| 4 | Cópia "atômica", tudo ou nada no teto Free | Cria **só o que cabe, informa o corte** ("Este Deck criaria 100 Cards, mas sua conta pode possuir apenas 20...") e mostra CTA Premium; atômico "quando possível", nunca silencioso (AT §17) | O `preflight` atual (`ok: requested<=remaining`, bloqueia tudo) contradiz o documento |
| 5 | "Já adicionado" por unicidade `source_*` | Não há "Já adicionado" no documento: há **reimportação manual** que **detecta Deck/Notes semelhantes, avisa e oferece merge/importação** (AT §19.1, §23) | Recurso diferente do que a v1 propunha |
| 6 | Página pública mostra Notes e contagens a decidir | Página mostra nome, **nº de Notes**, descrição, idioma, autor, data da última atualização, Cards; **sem lista/contagem de Tags** (AT §18) | Contagem pública = **Notes** (decidido); descrição e "última atualização" são novos dados |
| 7 | Slug/URL pendente | Perfil `fr/#/user/username`; Deck público "tem página própria", sem formato definido (AT §18, §20) | Segue pendente só o formato da rota do Deck |
| 8 | Visibilidade/exclusão a decidir | Excluir Deck pessoal: avisa, **mover ou excluir permanentemente**, árvore inteira, **não existe arquivamento** (AT §5.4) | Contradiz a UI atual de "Arquivados historicamente" (CONSOLIDAÇÃO-3) |
| 9 | Pendências de mídia/tags públicas | Tags **são visíveis dentro dos Cards** (AT §18); mídia é propriedade do Field (AT §9); ícone+cor do Deck, **sem upload** (AT §18.1) | Tags públicas decidido; ícone/cor novos |
| 10 | Username editável? não verificado | **Username único e imutável** (AT §20, inv. 15) | Hoje é **editável** (ver seção 4, C1) |

## 2. O que o documento exige (Public Decks, cópia, perfil)
- Só Decks em Meus Decks; vedados curso/professora/raiz (§18). Página própria; ícone+cor (§18.1).
- Free enxerga existência; Premium importa (§18.2). Cópia independente, sem live link; Notes, Cards e Tags
  independentes; recebe a Tag permanente de autoria (§19, §10.3). Em cópias múltiplas preserva-se só a
  atribuição original (§10.3).
- Sem assinatura/atualização automática: autor edita/adiciona/renomeia e o Deck segue o mesmo; o importador
  reimporta manualmente com detecção, aviso e merge, sem duplicar em silêncio (§19.1, §23, inv. 28).
- Importado entra em `Idioma > Meus Decks` ou subdeck pessoal; nunca raiz "Importado" (§24).
- Perfil: username único e imutável; display name editável; mostra username, display name, avatar, bio,
  Decks públicos; **sem busca pública de usuários** (§20).
- Cópia passa a ser conteúdo pessoal (editável, movível); original não é alterado (§34).
- Limite Free por CardInstance (§17); FSRS global (§15); Note é a fonte do conteúdo (§2.1, inv. 22-23).

## 3. O que existe no código (verificado)
- `profiles.public_profile` (default true), rota `#/user/<username>`, página sem login; RPCs
  `get_public_profile_stats` e `get_public_flashcards` (SECURITY DEFINER, `anon`), filtro no servidor
  (`status='active'`, `hidden_from_profile=false`).
- Cópia independente via `createOwnFlashcard`, Deck padrão, teto Free por CardInstance com bloqueio total,
  `openReportModal`, tags viajam como valor; Premium existe (`plan_tier`, `isPremium`, `admin-premium.js`).
- `decks.is_public` sem nenhum leitor/escritor; triggers rejeitam público em root, teacher_root, teacher e course;
  **permitem** `personal_root` e `personal`.
- Exclusão de Deck pessoal: `deleteDeck`/`validateDeckDeletion` em `deck-data.js`/`deck-engine.js` (só vazio);
  "Arquivados" ainda existe na UI de Meus Cartões.

## 4. Gaps e conflitos com o documento
**Gaps (ausente):** publicar/despublicar Deck; página/rota/RPC de Deck público; ícone, cor, descrição, "última
atualização" no Deck; gate Free/Premium para abrir/importar; Tag `criado-por-[username]` (zero ocorrências) e sua
proteção contra remoção (hoje o Painel de Tags da Fase J permite renomear/excluir qualquer tag); importação de Deck
inteiro com hierarquia; detecção de semelhantes/merge na reimportação; escolha de destino em Meus Decks.
**Conflitos (existe e contradiz):**
- C1 **Username editável** (`saveProfileEdits` aceita novo username e só checa disponibilidade). Viola inv. 15 e
  quebra a atribuição permanente e URLs `fr/#/user/username`. Pré-requisito de qualquer publicação.
- C2 **RPC pública lê o espelho Legacy** (`front`, `back_trans`...), não `fields`/`card_generation_mode`:
  Cloze nativo tem `front` nulo, MC perde distratores, Type Answer perde formato, mídia por Field não sai. Viola
  "Native Fields são a fonte" (inv. 23, inv. 24).
- C3 **Publicação por conta** ("todos os ativos não escondidos") contradiz publicação por Deck; coexistência com
  `hidden_from_profile` indefinida.
- C4 **Teto Free tudo-ou-nada** contradiz o corte parcial informado (AT §17); vale também para Anki/arquivo.
- C5 **Gate só de login**, sem Premium para importar.
- C6 **Trigger permite `personal_root` público**; documento só admite Decks dentro de Meus Decks.
- C7 **Tag de autoria seria removível/renomeável** pelo Painel de Tags (K.6/Fase J) se existisse; precisa de tag de
  sistema protegida (RPCs `rename_note_tag`/`delete_note_tag`).
- C8 **"Arquivados"** na UI contradiz "não existe arquivamento" (AT §5.4); fora do escopo público, mas afeta o
  universo ("ativos") das RPCs.
- C9 **Perfil público expõe XP, streak e % de progresso** por idioma; o documento lista como públicos apenas
  username, display name, avatar, bio e Decks públicos (AT §20). O documento **não autoriza** XP/streak/progresso
  públicos. Continua DECISÃO PENDENTE, agora com o documento apontando para remover.

## 5. Modelo de dados (conceitual; nada criado)
- **Visibilidade:** `decks.is_public` já existe; restringir a `kind='personal'` (excluir `personal_root`).
  Acrescentar ao Deck público só o que o documento nomeia: descrição, ícone, cor; "última atualização" pode ser
  derivada (max de alteração das Notes) para não criar segunda fonte (AT §39).
- **Atribuição:** Tag de sistema `criado-por-<username>` na Note copiada (Tags pertencem à Note, inv. 11). Como o
  username é imutável, a tag é estável. Proteção: marcar como tag de sistema (prefixo reservado) bloqueada em
  editor e Painel de Tags. Origem estruturada (autor + Note de origem) só se a detecção de semelhantes/merge
  precisar; **DECISÃO PENDENTE** se bastam comparação de conteúdo ou metadado de importação (AT §6 admite
  "metadados de atribuição/importação").
- **Conteúdo público:** projeção da Note nativa (campos, `card_generation_mode`, tags, mídia do Field), sem FSRS,
  `revision` interna, status, `hidden_from_profile`, due.

## 6. Segurança/RLS/RPC
Existe: padrão SECURITY DEFINER com checagem no servidor, sem policy pública nas tabelas. Falta: RPC de leitura de
Deck público (verifica `is_public`, `kind='personal'`, dono; resposta igual para inexistente/privado); RPC de cópia
que valide Premium e aplique o corte do teto Free **no servidor** (hoje só cliente); proteção da tag de autoria no
servidor (RPCs de tags e `own_flashcards` UPDATE); username imutável por trigger/policy, não só UI; revisão do
`grant anon` (só leitura pública). Mídia: bucket público por URL; publicar Deck publica as URLs.

## 7. Fluxo (conforme AT §18-§24)
Dono publica Deck em Meus Decks -> qualquer pessoa vê a página do Deck (nome, nº de Notes, autor...) -> Free:
sabe que existe, não abre/importa; Premium: escolhe destino em Meus Decks -> cópia independente com tag
`criado-por-<username>`, corte no limite informado -> reimportação manual detecta semelhantes e oferece merge.

## 8. Decisões pendentes (o documento não decide)
Formato da rota/URL do Deck público; se publicar uma pasta publica a subárvore ou só o Deck; Deck vazio publicável;
fate de `hidden_from_profile` e do perfil por conta (substituir); como detectar "semelhante" (conteúdo vs metadado
de origem) e política de merge; texto de "última atualização"; o que ocorre com cópias se o autor despublica
(sugestão: nada, são independentes); autor apaga/despublica e a tag permanece; Anki export/import preserva ou não a
tag (ela é uma Tag comum, então viaja); **política de XP/streak/progresso públicos** (documento não os lista);
quem pode ver o Deck de um usuário com `public_profile` desligado.

## 9. Ordem recomendada (ajustada ao documento: Fase J)
1) Decisões da seção 8. 2) **Username imutável** (servidor). 3) Projetar a Note nativa na RPC pública (C2).
4) Tag de sistema `criado-por-` protegida (editor, Painel de Tags, RPCs). 5) Publicar/despublicar Deck (apenas
`personal`) + RPC de leitura + rota + ícone/cor/descrição. 6) Importação com gate Premium, destino em Meus Decks,
corte informado do teto Free (revisar também Anki/arquivo). 7) Reimportação: detecção de semelhantes e merge.
8) Revisar política de XP/streak/progresso no perfil. 9) Só então Public Analytics (K.8).

## 10. Testes necessários antes de publicar
Privacidade (anon: privado = inexistente; só Decks dentro de Meus Decks; curso/professora/raiz nunca; Teacher/Study/
FSRS nunca; arquivado fora); projeção nativa por Card Type (Normal, Reverso, Cloze, MC, Type Answer, mídia);
Free x Premium (existe/abre/importa); corte do teto (parcial, mensagem exata, CTA); cópia (independência,
tag de autoria imutável e não removível, destino, hierarquia); reimportação (semelhantes, merge, sem duplicata
silenciosa); username imutável; RLS com papéis reais; Playwright FR/ZH sem login, Free, Premium; enumeração de ids.

## 11. Impacto em K.8
Bloqueada. Dependências: itens 2-7 acima e a decisão sobre XP/streak/progresso. "Public Analytics" do contrato K
(`docs/K-analytics-contrato.md`) usa contagem por **Notes** no Deck público (decidido por AT §18), sem FSRS.
A menção a `source_*` na seção K.8 desse contrato é a premissa da v1 e deve ser lida como "atribuição por tag".

## 12. A carregar para a auditoria final
K.7: fronteira de lição e texto real do banner sem teste de browser. Política pública de XP/streak/progresso
(C9). Migration 059 não aplicada (aplicar antes do front). `notification-cron` não deployado. SQL de K.0/K.6 só em
Postgres local com schema mínimo. Username editável (C1) e "Arquivados" (C8) como divergências do documento.
