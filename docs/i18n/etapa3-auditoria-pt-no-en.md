# Etapa 3: auditoria de português no site em inglês

Data: 2026-10-19. Branch `claude/optimistic-ramanujan-tercxc`. Só auditoria: nenhum arquivo do site foi alterado.
Regra da dona (2026-10-15): **site em inglês não tem NADA em português**.

## Como foi feito

1. **Varredura estática** (`tests/i18n/scan_pt_literais.js`): lê `fr/app.js`, `zh/app.js`, `shared/**/*.js`
   (fora de `shared/i18n`, `shared/vendor`) com o parser do TypeScript e os `index.html` de fr/zh; acusa literal com
   cara de português fora de `t()`/`tp()`/`chT()`, fallback cuja chave falta em `en.js`, texto/atributo do HTML sem
   `data-i18n`. Resultado bruto: 594 literais, 51 textos e 20 atributos do HTML, 0 fallbacks sem en.
   **Chaves usadas em `t()`/`data-i18n` que existem em pt-BR e faltam em en: 0** (e 0 chaves só no pt-BR).
   A lista bruta tem falso positivo (ids, valores de status, listas de palavras do comparador de tradução,
   conteúdo do curso de português em `shared/core/familias/latina-idiomas.js`); a triagem está nas tabelas abaixo.
2. **Teste no navegador** (`tests/i18n/test_sem_portugues_en.js`): fr e zh com o site em inglês, login simulado,
   percorre as telas do aluno e coleta o texto visível (innerText + placeholder/aria-label/title/alt + toasts).
   Saída completa guardada em `docs/i18n/etapa3-saida-test_sem_portugues_en.txt`.
3. Cada achado da tabela foi conferido no código (arquivo:linha). Quando o teste mostrou o texto na tela, a coluna
   "Visto" diz **sim**; "estático" = só pela leitura do código (tela não percorrida pelo teste).

Legenda da coluna "Chave en": **existe** = já há chave com o mesmo texto no catálogo (dá para usar direto);
**nova** = precisa de chave nova em `pt-BR.js` + `en.js` (português idêntico ao atual, `DELIBERATE_PT_CHANGES` vazio).

## Resumo

| Grupo | Achados (linhas da tabela) | Observação |
|---|---|---|
| (a) Interface do aluno | **50** | 1 causa raiz de "primeira pintura" (fr e zh) explica a maior parte do que o teste vê na trilha |
| (b) Conteúdo pedagógico sem versão en | **2** (fr: 20 cenas + 20 perguntas com 3 opções; zh: 18 + 18; o teste detecta 38 e 22 textos) | cena do diálogo e pergunta de compreensão do diálogo |
| (c) Texto vindo do banco/servidor | **4** | Desafios (conteúdo do banco) e espelho legado gravado no banco |
| (d) Admin/professora | **8** | só listado |

Teste no navegador (execução de 2026-10-19, reprodutível: `Math.random` com semente; duas execuções seguidas deram o
mesmo resultado): **fr 183 trechos em português, zh 101**, conteúdo do curso sem en **fr 38, zh 22**, pageerrors 0.
Os trechos por tela estão no fim deste documento.

---

## (a) Interface do aluno

### Trilha (lista) e cartão "Continuar"

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a1 | `fr/app.js:521` (`onApplied`) e `fr/app.js:543` | **Causa raiz**: a trilha é pintada no boot, antes de `shared/i18n/en.js` e `fr/content.en.js` chegarem (são carregados sob demanda). Nem `onApplied` do overlay nem o `i18n:change` repintam a trilha e os cartões laterais. Resultado na primeira tela: títulos/objetivos de unidade, módulo e lição, "Nível 1", "Ponto de verificação", "GRAMÁTICA", "Desafios do Módulo N", "0 de 4 lições", "Ninguém pontuou essa semana ainda.", "🎯 Missões do dia", missões ("Complete sua primeira lição do dia"), aria "Expandir lições" | sim (71 trechos) | existem | chamar `renderUnitsGrid()` (e os cartões laterais) no `onApplied` do `CONTENT_I18N` e no `i18n:change` quando a trilha estiver visível |
| a2 | `zh/app.js:599` e `zh/app.js:626` | mesma causa raiz no zh (histórias "Revendo Unidades 1-5", "🔒 COMPLETE A UNIDADE ACIMA", "Estude 1 lição de Hanzi"...) | sim (40 trechos) | existem | idem a1 |
| a3 | `shared/core/revisao-decks.js:175` | `${done} de ${total} lições concluídas` | sim | nova (há `trail.unit.lessonsProgress` = "{done} of {total} lessons", sem "concluídas") | `trail.continue.metric` |
| a4 | `shared/core/revisao-decks.js:178` | "Sua trilha", "Você concluiu toda a trilha 🎉" | estático | nova | `trail.continue.eyebrowDone`, `trail.continue.allDone` |
| a5 | `shared/core/revisao-decks.js:182` | ` · lição ${i} de ${n}` | sim | nova | `trail.continue.lessonOf` |
| a6 | `shared/core/revisao-decks.js:186` | "Continue de onde parou" / "Comece por aqui" | sim | nova | `trail.continue.eyebrowResume` / `.eyebrowStart` |
| a7 | `shared/core/revisao-decks.js:190` | botão "Continuar" / "Começar" | sim | existe: `common.continue`, `fr.challenges.start` | usar `common.continue` e uma chave comum `common.start` (nova) |
| a8 | `fr/app.js:3997-4003` (`buildModuleReviewRow`) | "Revisão do módulo", chip "REVISÃO", "Bloqueada: libere o módulo (complete a unidade anterior) para revisar.", "Nada para revisar ainda: estude as unidades deste módulo e volte aqui.", "Revisada em {data} · de novo agora: … (opcional)", "Recomendado antes de seguir (opcional)" | sim | nova | `trail.moduleReview.*`; data por `toLocaleDateString(getUiLang())` |
| a9 | `shared/review-milestone.js:54-58` (`milestoneReasonText`) | "{n} itens: X com erros recentes, Y vencendo hoje, Z com memória mais fraca, W novos" | sim | nova | `trail.moduleReview.reason.*` com `.one/.other` |
| a10 | `fr/app.js:4592` (`showTrailSkipLocked`, toast) | "Pular unidades é do plano Premium (ou de alunos da professora). Pelo plano grátis, siga as unidades em ordem. 🔒" | sim (toast) | 1ª frase existe: `trail.checkpoint.skipLocked` | `trail.checkpoint.skipLockedToast` (nova) ou `skipLocked` + frase nova |
| a11 | `zh/index.html:4768` | "Nível 1 · Iniciante (HSK 1)" (`<h2>` fixo, sem `data-i18n`) | sim | nova | `data-i18n` com `zh.path.levelTitle` |
| a12 | `shared/core/estado-trilha-desafios.js:39` | toast "Esta palavra já foi estudada pelo cartão inverso." | estático | nova | `trail.known.siblingStudied` |
| a13 | `shared/core/estado-trilha-desafios.js:72` | "✓ Já sei" / "Já sei?" | estático | existe no zh: `zh.path.knownDone`, `zh.path.knownAsk` | chave comum `trail.known.done/ask` |

### Mapa da trilha

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a14 | `shared/trail-map.js:22` (`TRAIL_MAP_NOTE`) | "✓ Concluída", "↷ Pulada", "Você está aqui", "🔒 Bloqueada", "Nada ainda" | sim | nova | `trail.map.note.*` (getter com `t()`) |
| a15 | `shared/trail-map.js:23` (`TRAIL_MAP_STATE_LABEL`) | "Concluída", "Pulada", "Atual", "Disponível", "Bloqueada", "Sem itens" (texto e aria-label de todo nó) | sim | existem `trail.unit.skipped`, `badge.ui.locked`; resto nova | `trail.map.state.*` |
| a16 | `shared/trail-map.js:78` | aria-label "Fechar painel" | sim | existe `common.close` | `t('common.close')` |
| a17 | `shared/trail-map.js:118-119` | aria "Modo de visualização da trilha", botões "Trilha" / "Mapa" | sim | nova (`students.ev.tab.path` = "Path" é de outra tela) | `trail.view.aria`, `trail.view.trail`, `trail.view.map` |
| a18 | `fr/app.js:1128-1144` (`mapUnitDescribe`) | "{done} de {n} lições concluídas", "🔁 {n} para revisar", "Complete a unidade anterior para liberar esta.", "Fazer Ponto de verificação para pular", "Pular unidades é do plano Premium…", "Abrir de novo", "Continuar"/"Começar", "Gramática"/"Unidade" | sim | existem `trail.checkpoint.skipLocked`, `trail.eyebrow.grammar`, `common.continue`; resto nova | `trail.map.unit.*` |
| a19 | `fr/app.js:1153-1162` (`renderTrailMapView`) | aria ", gramática", rótulo "Revisão", aria "Revisão do módulo N, opcional, nada para revisar ainda", rótulo "Ponto", aria "Ponto de verificação do módulo N", título de seção "Módulo N · …" | sim | nova | `trail.map.*` |
| a20 | `fr/app.js:1177-1189` (`describe`) | "Revisão do módulo", "Revisada"/"Sem itens"/"Recomendada", "Opcional: uma sessão curta…", "Nada para revisar ainda…", "Última sessão: dd/mm/aaaa", "Revisar agora", "Libere o módulo…", "Fazer o Ponto de verificação"/"Refazer o ponto", "PONTO DE VERIFICAÇÃO", "Aprovado (melhor nota N%)"/"Disponível"/"Bloqueado", "Teste o módulo inteiro de uma vez…" | sim | existem `trail.checkpoint.title`, `trail.checkpoint.skipLocked`; resto nova | `trail.map.review.*`, `trail.map.checkpoint.*` |
| a21 | `zh/app.js:1319-1334` (`mapUnitDescribe`) | igual a a18 | sim | idem a18 | idem a18 (mover para `shared/core` junto) |
| a22 | `zh/app.js:1350-1364` | aria "História: …", "HISTÓRIA", "Concluída"/"Disponível"/"Bloqueada", "Complete a unidade anterior para liberar esta história.", "Ler de novo"/"Ler a história", título de seção "Unidades" | sim | nova | `trail.map.story.*`, `trail.map.unitsSection` |

### Lição, sequência e avisos

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a23 | `fr/index.html:5656`, `zh/index.html:4801` | botão "← Voltar" da lição (`#step-back-btn`) | sim | existe `fieldEditor.audio.back` ("← Back") | `data-i18n` com chave comum `common.backArrow` (nova) |
| a24 | `fr/index.html:6469`, `zh/index.html:5528` + `shared/core/gamificacao.js:49` | "Você está em uma sequência de {n} dia(s)!" (HTML fixo + "dia"/"dias" no JS) | sim | nova | `streak.modal.headline` com `.one/.other` |
| a25 | `fr/index.html:6473`, `zh/index.html:5532` | "Continuar" (`#streak-modal-continue-btn`) | sim | existe `common.continue` | `data-i18n="common.continue"` |
| a26 | `fr/index.html:6481`, `zh/index.html:5540` | "{n} cartões estão esperando por você — afie sua memória revisando o que já viu." | sim | nova | `reviewReminder.sub` (plural) |
| a27 | `fr/index.html:6485`, `zh/index.html:5544` | "Revisar agora" | sim | nova | `reviewReminder.cta` |

### Perfil, Hanzi, carregamento

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a28 | `fr/index.html:5813-5814, 5835-5836`; `zh/index.html:4903-4904, 4925-4926` | abas "Metas" / "Progresso" (sem `data-i18n`; "Visão geral" e "Amigos" ao lado têm) | sim | existem `profile.tabGoals`, `profile.tabProgress` | `data-i18n` |
| a29 | `fr/index.html:5840`, `zh/index.html:4930` | "Minhas metas" | sim | nova | `profile.goals.title` |
| a30 | `fr/index.html:5849`, `zh/index.html:4939` | aria-label e title "Editar meta" | sim | nova | `data-i18n-attr` com `profile.goals.edit` |
| a31 | `fr/index.html:5821`, `zh/index.html:4911` | "Conquistas" (rótulo da grade) | sim | existe `profile.sectionBadges` | `data-i18n` só no texto (o contador é `<span>` filho: separar) |
| a32 | `shared/core/estado-trilha-desafios.js:1023` | "Conteúdos da professora estudados" / "Meus conteúdos estudados" | estático (só com cartões teacher/self) | nova | `progress.stat.teacherContent` / `.ownContent` |
| a33 | `shared/profile.js:367, 368, 403` | "Entre com sua conta pra salvar uma foto.", "Escolha um arquivo de imagem (JPG, PNG...).", "Entre com sua conta." | estático | 403: existe `deck.err.loginRequired`; resto nova | `profile.err.*` |
| a34 | `zh/index.html:5108` | "🔁 Revisar caracteres" (`#hanzi-review-all-btn`) | sim | nova | `zh.hanzi.reviewAll` |
| a35 | `shared/utils.js:28-30` (`LOADING_PHRASES`) | "Carregando...", "Só um instante...", "Quase lá...", "Buscando os dados...", "Preparando tudo...", "Um momento..." — usado por `loadingHTML()` sem rótulo (ranking, sino, mural, perfil público, cartões, materiais, ~15 chamadas) | estático (aparece rápido demais para o teste) | existe `gate.loading` ("Loading...") | sorteio de chaves `loading.phrase.*` |

### Revisão, Decks, Tags, importação e exportação

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a36 | `shared/tag-manager.js:30-193` (arquivo inteiro, 0 chamadas a `t()`) | erros de renomear ("Tags de atribuição…", "Nomes que começam com criado-por…", "Digite um nome de tag válido…", "Não foi possível concluir agora…"), "Nenhuma alteração.", "notas serão alteradas", aviso de colisão, painéis de renomear/excluir, "Carregando tags…", "Tags dos seus próprios cartões. As tags dos cartões da professora não aparecem aqui…", "Você ainda não usa nenhuma tag." | sim (2 trechos; o resto estático) | nova (há `review.panel.noTags` = "No tags.") | `tagManager.*` |
| a37 | `shared/deck-data.js:348-395` (`deletePersonalDeckTree`), mostrado em `shared/deck-browser.js:821, 829` | 10 mensagens de erro ao excluir Deck ("Só é possível excluir um Deck pessoal seu.", "Não foi possível mover os cartões agora. Nada foi excluído." …) | estático | 348: existe `deck.err.loginRequired`; resto nova | `deck.delete.err.*` |
| a38 | `shared/my-flashcards.js:1210-1217` (`openFlashcardLimitModal` com `cutMessage`) | título "🔒 Importação limitada pelo plano grátis" e caixa "⭐ Com o Premium, seus cartões próprios são ilimitados. Para ativar, fale com a administração (profbrune)…" (a frase do corte em si já sai em inglês) | sim | nova | `flashcardLimit.cut.title`, `flashcardLimit.cut.ctaHtml` |
| a39 | `shared/my-flashcards.js:164, 174` | "Tags dos cartões da professora:", "Filtro de tags ativo na Revisão: … vale também para "Estudar este Deck"." (+ botão) | estático | nova | `myFlashcards.tags.teacher`, `myFlashcards.tags.filterNotice` |
| a40 | `shared/my-flashcards.js:1041` | toast "Nenhum dos cartões selecionados cabe neste formato (só frente e verso)." | estático | nova | `myFlashcards.export.noneFits` |
| a41 | `shared/flashcard-model.js:600, 604` (`validateNoteTags`) | "Tag muito longa (máximo N caracteres)…", "Máximo de N tags por cartão…" (erro do editor) | estático | nova | `tags.err.tooLong`, `tags.err.tooMany` |
| a42 | `shared/flashcard-native-persistence.js:139-146, 488-489` | erros de "Usar o novo editor" (frase sem `___`, mais de um `___`, múltipla escolha sem resposta) e resumo de tags descartadas na importação | estático | nova | `noteConvert.err.*`, `import.tagsDropped.*` |
| a43 | `shared/own-flashcards.js:127` | "Não foi possível copiar o cartão agora." | estático | nova | `ownFlashcards.err.copyFailed` |
| a44 | `shared/study-trail-model.js:106-108` | etiqueta da tag derivada da unidade aparece como "#unidade-…" (`friendlyTagLabel` não traduz esse prefixo; `nivel-`, `modulo-`, `licao-` já são traduzidos) | estático | existe `settings.export.unit` ("Unit") | só no rótulo de exibição (`friendlyTagLabel`): o slug é lógica de filtro e não muda |
| a45 | `shared/anki-parser.js:37-45, 66, 134`; `shared/anki-import.js:370-703, 889, 897`; `shared/anki-import-ui.js:37-39, 231, 397` | erros e avisos da importação de `.apkg` (≈35 frases: "Arquivo não é um .apkg/.zip válido.", "… -- Note pulada.", "Já existem Decks com estes nomes…", rótulos "Normal com reverso", "Completar a frase (Cloze)", "Digite a resposta") | estático | rótulos de tipo existem no editor (`cardType.*`); resto nova | `ankiImport.err.*`, `ankiImport.warn.*` |
| a46 | `fr/app.js:5058-5066, 5149`; `zh/app.js:4802-4810, 4888`; `shared/anki-export.js:236, 322, 338` | arquivo exportado para o Anki: campos "Tradução"/"Caractere", modelo "Cartão 1", nome do arquivo `…-unidade-N.apkg` (aparece no Anki, fora do site) | estático | nova | nomes de campo pelo idioma do site na hora de exportar |
| a47 | `shared/public-deck.js:224-681` (3 `t()` no arquivo); `shared/public-profile.js:272`; `fr/index.html:5475-5476`, `zh/index.html:4615-4616` | Decks públicos inteiros: erros de importação (`publicDeckErrorMessage`, 259-277), rótulos de tipo (293-296), data em `toLocaleDateString('pt-BR')` (299), página do Deck, plano de importação, "Copiando mídia…", "✅ N Notes importadas…", publicar/despublicar ("🌐 Este Deck é público…", "Tornar este Deck privado?…"), "Nenhum Deck público ainda."; seção "Decks públicos" do perfil público; convite do visitante "Quer estudar francês/mandarim também?" / "Criar minha conta →" | estático (precisa de Deck público no banco) | `publicDeckCopies.tab` = "Public decks" existe; resto nova | `publicDeck.*` |

### Desafios (só fr)

| # | Arquivo:linha | Texto em português | Visto | Chave en | Correção sugerida |
|---|---|---|---|---|---|
| a48 | `fr/app.js:6892-6899` (`CHALLENGE_I18N['pt-BR']`) | 8 chaves sem par em `CHALLENGE_I18N.en`: busca "Buscar expressão…", "Buscar nas expressões", "Nenhuma expressão encontrada.", filtro "Filtrar expressões", "Todas", "Pendentes", "Concluídas", anel "{done} de {total} concluídas" | sim | **falta en** (o `chT()` cai no pt-BR) | acrescentar as 8 em `CHALLENGE_I18N.en` (fr/app.js ~6949) |
| a49 | `fr/app.js:6918-6920` | `ch.lt.legend.bad/near/miss`: "palavra errada", "quase certa", "faltou" (legenda do Ouça e traduza) | estático | **falta en** | idem a48 |
| a50 | `fr/app.js:5991-5993` (fallback do ditado sem áudio) | "🔇 sem áudio", aria "Áudio da frase N indisponível neste dispositivo", title "Áudio indisponível neste dispositivo" | estático | nova | `dict.noAudio*` em `CHALLENGE_I18N` |

Total do grupo (a): **50 achados** (a1 a a50; quando o mesmo texto está em fr e zh espelhados, conta uma vez).

### Conferidos e NÃO são achados

- `#ui-language-first-modal` (fr/index.html:6324-6334, zh/index.html:5389): pergunta de idioma do 1º acesso é
  bilíngue de propósito e só aparece quando ainda não há idioma escolhido.
- Textos fixos do HTML trocados pelo JS em inglês (a varredura acusa, o navegador mostra em inglês): explicação e botões
  dos Ditados (fr/index.html:6010-6062), janela Premium dos Desafios (6285-6286), "Ranking semanal" (5798 / zh 4888),
  "Continuar →" da lição (5657 / zh 4802), contagem de hanzi (zh 5104).
- "Ranking" (barra lateral): mesma palavra em inglês. "Vérifier" nos Desafios: francês ensinado, não português.
- `DECK_BROWSER_STATE_LABEL_KEYS` (`shared/deck-browser.js:917-927`), `ownCardInstanceCutMessage`
  (`shared/deck-engine.js:318-336`), `REPORT_CATEGORIES` (`shared/reports.js:37-59`), `FLASHCARD_ORIGIN_TITLES_PT`
  (`shared/flashcard-model.js:51`), `STUDY_TRAIL_TAG_LABEL_PT` (`shared/study-trail-model.js:655-657`): o português é
  id/lógica ou fallback de Node; a tela usa `t()`.
- Listas de palavras em português do comparador de tradução (`fr/app.js:8096-8097, 8268`,
  `shared/translation-compare.js:22-23`) e `shared/core/familias/latina-idiomas.js` (curso de português): lógica/conteúdo ensinado.
- Nome do Deck raiz "Meus Decks" gravado pelo `ensure_user_decks`: a tela mostra "My Decks" (conferido na captura).

---

## (b) Conteúdo pedagógico sem versão em inglês

**Lote D (2026-10-19): b1 e b2 resolvidos** (overlay aceita `dialogue.scene`/`dialogue.check`; 38 cenas e 38 perguntas traduzidas). Lista: `docs/i18n/etapa3-traducoes-conteudo.md`.

Medido pelo teste (seção "Conteúdo do curso"): compara o conteúdo carregado em pt-BR com o mesmo conteúdo depois do
overlay `content.en.js`; conta o texto que continua igual e tem cara de português (campos do idioma estudado ficam de fora).
Títulos, objetivos, vocabulário, frases, falas do diálogo, conceitos e gramática estão todos traduzidos.

| # | Onde está o português | O que falta | Textos | Visto | Correção sugerida |
|---|---|---|---|---|---|
| b1 | `courses/fr-pt-BR/layer.js` (ex.: linha 59, A1-1), exibido em `fr/app.js:2406` (cena) e no passo `dialogueCheck` (`fr/app.js:1593`) | `dialogue.scene` (cena "📍 Num café de Paris, de manhã…") e a pergunta de compreensão `dialogue.check[k=understand]` (`q` e 3 `opts`): a camada tem 20 cenas e 20 perguntas, `fr/content.en.js` tem 0 | 38 detectados pelo teste (de até 100) | sim (comparação de conteúdo) | o formato do overlay (`shared/content-i18n.js:15`, `dialogue:{title, lines}`) não tem `scene` nem `check`: acrescentar `dialogue.scene` e `dialogue.check` ao formato e traduzir em `fr/content.en.js` |
| b2 | `courses/zh-pt-BR/layer.js`, exibido em `zh/app.js:2286` e no passo do diálogo | idem: 18 cenas e 18 perguntas na camada, 0 em `zh/content.en.js` | 22 detectados (de até 90) | sim | idem em `zh/content.en.js` |

Lista completa (unidade, campo, texto) na saída do teste: `docs/i18n/etapa3-saida-test_sem_portugues_en.txt`.
Observação: a comparação usa a mesma lista de palavras do teste, então opção ou pergunta sem palavra típica escapa
(o número do teste é um piso; a contagem real vem da camada, acima). Falha pré-existente, não mexida aqui: `tests/i18n/test_content_en.js` dá 29 ok, 1 falha
("aviso visível em unidade de gramática").

---

## (c) Texto vindo do banco/servidor

**Lote D (2026-10-19): c2 e c3 resolvidos** (overlay de Desafios com `cloze_grammar`; também as 33 explicações do Ouça e traduza que faltavam e o realinhamento do Módulo 3). Lista: `docs/i18n/etapa3-traducoes-conteudo.md`.

| # | Arquivo:linha / origem | Texto em português | Visto | Chave/tradução en | Correção sugerida |
|---|---|---|---|---|---|
| c1 | `fr/app.js:8025` (`renderExpressionFeedbackScreen`), dado da tabela `challenges` | "In English: **Bom fim de semana!**": lê `c.meaning.pt` direto, **ignora a tradução que já existe** em `fr/challenges.en.js` (`meaning` = "Have a good weekend!") | sim | existe (overlay) | usar `challengeText(c, 'meaning')` / overlay quando houver |
| c2 | `fr/app.js:8689-8690` (`renderClozeGrammarFeedback`), tabela `challenges` tipo `cloze_grammar` | "Translation: Ontem, nós comemos no restaurante." (`translationPt`) e a explicação ("Manger forma o passé composé com avoir…") | sim | **não existe**: `scripts/build-challenges-overlay.js` não gera `cloze_grammar` (overlay só tem `expr`/`lt`/`accent`) | incluir `cloze_grammar` (`translation`, `explanation`) no overlay e no build |
| c3 | lotes `fr/scripts/challenges_import/lote-a1-m6.json` e `lote-a1-m6-cloze.json` | 10 desafios sem entrada no overlay en: `lt-a1m6-005`, `lt-a1m6-006` (traduções de referência e explicação em pt: "Eu gosto de ouvir música."), `accent-a1m6-006`, `accent-a1m6-007`, `cloze-a1m6-001` a `006` | sim (lt-a1m6-005, cloze-a1m6-001) | não existe | traduzir e rodar `scripts/build-challenges-overlay.js`. **Não conferido** se estão publicados na produção (sem acesso ao banco nesta auditoria) |
| c4 | `shared/flashcard-native-persistence.js:214-227` (`deriveLegacyMirrorFromNoteEditorState`) | "(múltipla escolha)", "(completar a frase)", "(sem tradução)" gravados nas colunas legadas do cartão no banco | estático | nova | gravar neutro (ou não exibir o espelho legado) |

Fora do alcance desta auditoria (não contado): avisos do sino, push e e-mail são montados no banco/Edge Function com
`_ui_lang` (regra em `.claude/rules/i18n.md`); o teste usa banco simulado e não prova o que está ativo na produção.

---

## (d) Admin/professora (só listado)

| # | Arquivo:linha | O quê |
|---|---|---|
| d1 | `fr/app.js:8602-8610, 8822-8823, 8996-9020` | validação, checklist e formulários do admin de Desafios ("a frase não tem lacuna ___", "Frase:", "Opções por lacuna"…) |
| d2 | `fr/index.html:6134` | janela "Importar desafios" ("Cole aqui a saída do pipeline de geração…") |
| d3 | `fr/index.html:5967`, `zh/index.html:5057` | aria-label "Cartões ou Banco de Revisão" (painel da professora) |
| d4 | `shared/painel/painel-ui.js:101, 316, 327, 374-375, 415, 438` | peças do Design System do painel: "Próxima", dias da semana, "Mês anterior"/"Próximo mês" (existem `panel.classLog.cal.prev/next`), "Cancelar"/"Continuar", "Não foi possível enviar", "Fechar" |
| d5 | `shared/roles.js:69-186` | erros de vincular aluna e mudar plano ("Digite o @username da aluna.", "Plano inválido."…) |
| d6 | `shared/review-bank-model.js:116` | "Cartão de mandarim precisa de pinyin: crie pelo formulário de cartões." |
| d7 | `shared/admin-class-logs.js:205, 213` | prefixo "Para a próxima aula:" das notas importadas do Notion (dado) |
| d8 | `shared/review-bank*.js`, `admin-*.js`, `teacher-cards-ui.js` | a varredura acusa ids e valores de status (`aprovado`, `erro`, `todos`, `editar-*`): lógica, não texto; conferir na fase do painel |

---

## Saída resumida do teste no navegador

Comando: `node tests/i18n/test_sem_portugues_en.js` (capturas: `SHOTS=/pasta node tests/i18n/test_sem_portugues_en.js`).
Resultado: `4/6 checks ok` (falha esperada: português na interface e no conteúdo). Trechos NOVOS por tela, na ordem
do percurso (um trecho conta só na primeira tela onde aparece; a primeira pintura tem conjunto próprio):

| Tela | fr | zh |
|---|---|---|
| trilha (primeira pintura, convidado) | 71 | 40 |
| trilha (re-render, logado) | 11 | 8 |
| mapa da trilha | 53 | 25 |
| mapa: painel da unidade atual | 4 | 4 |
| mapa: painel de unidade bloqueada | 3 | 2 |
| mapa: painel da Revisão do módulo | 2 | - |
| mapa: painel do Ponto de verificação | 4 | - |
| mapa: painel da história | - | 2 |
| lição: passo 1 ("← Voltar") | 1 | 1 |
| lição: fim (janela de sequência) | 2 | 2 |
| lição: volta à trilha | 3 | 2 |
| Tags: gerenciador | 2 | 2 |
| janela: importação cortada | 3 | 3 |
| Desafios: lista de Expressões | 9 | - |
| Desafios: Expressão respondida | 1 | - |
| Desafios: Ouça e traduza respondido | 1 | - |
| Desafios: Complete a frase respondido | 2 | - |
| Hanzi (aba) | - | 1 |
| Perfil: aba Metas | 5 | 5 |
| Perfil: aba Progresso | 1 | 1 |
| janela de sequência (3 dias) | 1 | 1 |
| aviso: cartões esperando | 2 | 2 |
| toasts soltos | 2 | 0 |
| **Total interface** | **183** | **101** |
| Conteúdo do curso sem en | 38 | 22 |

Telas percorridas sem nenhum português: Revisão (aba e sessão), painel de Decks, Configurações, Ranking, Perfil (visão
geral e Amigos, com listas vazias), Conjugação (fr), lista de Ditados, player e resultado do ditado, listas de Ouça e
traduza, Acentuação e Complete a frase.

Limites: o banco é simulado com listas vazias (amigos, ranking, notificações, Decks públicos e cartões da professora
não aparecem cheios); telas marcadas "estático" nas tabelas não foram abertas pelo teste.
