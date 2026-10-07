# i18n -- Etapa 2: núcleo + piloto (modal "Reportar problema ou sugestão")

## O que foi migrado
- **Núcleo** `shared/i18n/i18n.js` (script global, sem build): `getUiLang()`, `setUiLang()`, `t(chave, params)` (interpolação `{nome}`), `tp(chave, n, params)` (plural via `Intl.PluralRules`), `fmtDate`, `fmtNumber` (via `Intl`), `applyDomI18n(root)` (`data-i18n` e `data-i18n-attr="attr:chave;attr2:chave2"`), `i18nReady` (Promise) e evento `window` `'i18n:change'`.
- **Catálogos** `shared/i18n/pt-BR.js` (fonte da verdade, 40 chaves), `en.js` e `es.js` (40 chaves cada, com comentário de confiança por linha: EN 38 ALTA / 2 MÉDIA; ES 38 ALTA / 2 MÉDIA).
- **Recorte**: modal `#report-modal` (fr e zh, mesmas chaves), pontos de entrada (pill ⚑ da topbar, bandeira da lição, item "⚑ Reportar problema" do menu) e `shared/reports.js` (rótulos de categoria/gravidade, erros, "Enviando...", "Enviar", toast).
- Ordem de carga: `i18n.js` e `pt-BR.js` entram antes de `content.js` (primeiros scripts do `<body>`), portanto antes de `reports.js` e de `app.js`. `en.js`/`es.js` são injetados sob demanda.

## Decisões
1. **Regra de ouro**: o português continua escrito no HTML. `applyDomI18n` não toca em nada enquanto o idioma for pt-BR (só restaura elementos já traduzidos, se alguém voltar para pt-BR com `setUiLang`). Se o JS falhar, o modal segue em português.
2. **Idioma de interface** (eixo separado do idioma estudado): `?ui=en|es|pt-BR` (salvo em `localStorage['ui-language']`) > `localStorage` > `pt-BR`. Nunca derivado de `APP_KEY`/`Field.lang`. `<html lang>` acompanha. **Não grava** em Supabase/progress (TODO no código: `progress.data._meta.uiLanguage`).
3. **`data-i18n` em elemento com filhos** (ex.: `Quanto isso atrapalhou? <span>(opcional)</span>`): troca só o primeiro nó de texto, preservando os espaços e o `<span>` (que tem sua própria chave).
4. **`REPORT_CATEGORIES`/`REPORT_SEVERITIES`**: mantêm `label` pt-BR literal (o Painel de Admin, `shared/admin-reports.js`, lê `c.label` e não foi migrado) e ganharam `labelKey`. O formulário mostra `t(labelKey)`. Ids estáveis intocados; lógica nunca usa o texto.
5. **`reportT(chave, textoOriginal)`** em `reports.js`: se o núcleo não carregar, cai no texto original -- por isso o pt-BR aparece duas vezes (catálogo e literal). O teste de regressão garante que os dois são idênticos.
6. Botões de categoria/gravidade são montados uma vez no parse; como `en.js`/`es.js` chegam depois, `refreshReportOptionLabels()` re-traduz ao abrir o modal e em `'i18n:change'`.
7. **Service Worker**: `fr|zh/service-worker.js` versiona pelo `__BUILD_ID__` (SHA trocado no deploy) e o precache só lista arquivos da pasta do idioma; `shared/*.js` são cacheados em runtime (network-first). Nada a alterar -- incluir os novos arquivos na lista não segue o padrão atual.
8. `t()` nunca lança nem devolve vazio: en/es -> pt-BR -> a própria chave (chave vazia -> `[i18n]`). `console.warn` só com `window.I18N_DEBUG = true`.

## Limitações
- Sem seletor de idioma na interface (só `?ui=`); sem persistência na conta.
- Admin de Reports continua em pt-BR (lê os rótulos literais).
- Se o idioma for trocado enquanto o botão mostra "Enviando...", o `applyDomI18n` reescreve para "Enviar"/"Send" (cosmético, só em troca de idioma em tempo de execução).
- "Report"/"Reporte" e "Obrigada" (feminino da autora) viram formas neutras em EN/ES.

## Testes
- `node tests/i18n/test_i18n_unit.js` (Node/vm: detecção, t/tp/fallback/interpolação/PluralRules, paridade, regressão byte a byte contra `git show e88fabb:...`; `I18N_BASELINE` troca o commit).
- `node tests/i18n/test_playwright.js` (Chromium, fr+zh: pt-BR idêntico ao baseline servido via `git archive`; `?ui=en`/`?ui=es`; envio; idioma estudado preservado).
- `node scripts/i18n-lint.js` (faltantes em en/es, órfãs, chaves usadas no código que não existem em pt-BR).

## Como migrar o próximo modal (ex.: `#flashcard-limit-modal`)
1. Criar as chaves em `pt-BR.js` copiando o texto do HTML **byte a byte**; mesmas chaves em `en.js`/`es.js` com comentário de confiança.
2. No HTML (fr **e** zh), acrescentar `data-i18n="chave"` / `data-i18n-attr="placeholder:chave;aria-label:chave2"` sem mudar o texto.
3. No JS, trocar literal por `t('chave')` (ou um helper com fallback como `reportT`). Textos montados antes do catálogo chegar precisam de um refresh em `'i18n:change'`.
4. Acrescentar as strings ao teste de regressão (o teste já cobre qualquer chave nova de pt-BR, contanto que o arquivo de origem esteja na lista em `test_i18n_unit.js`) e rodar o lint.

## Passo seguinte: modais pequenos e seletor

### Decisões da dona do projeto aplicadas
- **Foco só em inglês (EN-US)**. Espanhol **congelado**: `es.js` não ganhou chaves novas; o lint (`scripts/i18n-lint.js`) trata chave ausente em `es` como **aviso** ("es congelado"), em `en` continua **erro**. Testes exigem paridade `en` <-> `pt-BR` e só "sem órfãs" em `es`. Chave nova em `?ui=es` cai em pt-BR.
- Seletor oferece só **Português (Brasil)** e **English** (`I18N_SELECTABLE_UI_LANGS`); o núcleo ainda entende `?ui=es` só para teste.
- Idioma da interface fica **só no navegador** (`localStorage['ui-language']`). Nada em Supabase/progress (TODO `progress.data._meta.uiLanguage` mantido em `i18n.js`).

### O que foi migrado (fr e zh, mesmas chaves)
- `#flashcard-limit-modal` e `#flashcard-reset-confirm-modal` (fr+zh) e `#premium-challenges-modal` (só existe no fr): título, `aria-label` do ✕ (`common.close`), corpo e botões "Descartar edições"/"Sim".
- Textos em JS ligados a esses modais: preflight do limite em `shared/my-flashcards.js` ("Este cartão geraria N cartão(ões)...", chave `flashcardLimit.wouldGenerate` via `tp()`; em pt-BR o valor é uma string única com `cartão(ões)` e `{n}` recebe o número cru, então o texto é idêntico; em inglês há plural de verdade) e a mensagem de reserva quando o modal não existe (`flashcardLimit.fallbackError`) em `shared/public-profile.js` e `shared/anki-import-ui.js`. Todos com fallback para o literal original se o núcleo não carregar.
- **Corpo com `<strong>`**: novo atributo `data-i18n-html="chave"` em `applyDomI18n`. O valor do catálogo é o innerHTML original byte a byte; ao aplicar, o texto é escapado e só `<strong>`, `<b>` e `<em>` (sem atributos) voltam a ser tags (testado com uma tradução maliciosa). O lint reconhece o atributo.
- **Seletor "Idioma da interface"** em Configurações > Geral > Preferências (fr e zh), depois de "Som de acerto/erro". Reaproveita `.pref-row` e `.review-settings-select` (zero CSS/cor nova; testado claro/escuro e 390px). Opções com nome fixo no próprio idioma (`lang` em cada `<option>`). A ligação mora em `i18n.js` (`wireUiLanguageSelect`): `change` -> `setUiLang()` (que já aplica `applyDomI18n` na página, atualiza `<html lang>` e salva no localStorage); o `<select>` se sincroniza em `'i18n:change'`. Não toca em `APP_KEY`, idioma estudado, conta ou outras chaves do localStorage (testado). `fr/app.js`/`zh/app.js` não foram alterados.
- Texto novo (não existia em português): `settings.uiLanguage.title` "Idioma da interface" e `settings.uiLanguage.sub` "Muda só os textos do app (menus, botões e avisos). Não muda o idioma que você estuda."
- Service Worker/PWA: nada a mudar (mesmo motivo da Etapa 2: `shared/*` é cache em runtime).

### Textos em inglês de confiança MÉDIA (para revisar)
1. `premium.challenges.bodyHtml` -- "**Module Challenges** reinforce each topic in the course with Expressions, Listen and Translate, Accents, and extra Dictations." (nomes das categorias de desafio precisam bater com a aba Desafios quando ela for traduzida).
2. `premium.challenges.howToActivate` -- "They're part of the Premium plan. To activate it, contact the admin (profbrune)."
3. `flashcardLimit.modal.bodyHtml` -- "You've reached the free plan's limit of **20 active cards of your own**. To create more, archive a card you no longer use, or ask your teacher to link your account -- students linked to a teacher get unlimited cards of their own." **Atenção**: o português (mantido igual, pela regra de ouro) ainda manda "arquivar", e a interface não oferece mais arquivar (CONSOLIDAÇÃO-3); o texto PT merece revisão própria.
4. `flashcardLimit.fallbackError` -- "You've reached the free plan's card limit."
5. `flashcardLimit.wouldGenerate` -- "This card would create {n} study card(s), but you only have {remaining} left on the free plan." (singular/plural reais).
6. `flashcardReset.modal.body` -- "This edit will reset the review progress for this card. Do you want to continue?"

### Testes
- `node tests/i18n/test_i18n_unit.js`: 126/126 (regressão pt-BR contra `e88fabb` e contra o commit anterior a este passo, `I18N_PREV`=`96558b7`, inclusive o template com `{n}`; HTML inteiro sem `data-i18n*` e sem o bloco do seletor idêntico ao anterior; paridade en <-> pt-BR; es congelado; plural en).
- `node tests/i18n/test_playwright.js`: 209/209 (fr e zh; modal Report da Etapa 2 + 3 modais idênticos ao commit anterior em pt-BR, inglês via seletor e via `?ui=en`, texto injetado pelo JS, persistência após reload, volta ao português, idioma estudado/conta intactos, 390px claro/escuro sem estouro, zero pageerror novo).
- `node scripts/i18n-lint.js`: OK (es: 13 avisos "congelado").
- Regressão: `tests/fase-h/test_playwright.js` 68/68, `tests/fase-f/test_playwright.js` 46/46, `tests/fase-f/test_add_card_unit.js` 68/68.

### Próximos candidatos
- Resto da tela Configurações (abas Geral/Notificações/Exportar, "Conta", "Preferências", os três `.pref-row` existentes).
- Topbar/menu da conta (Meu perfil, Configurações, Sair) e toasts de `shared/toast.js`/`shared/auth.js`.
- Tela "Meus Cartões" (rótulos, selo `N/20`, botões), depois Decks e Revisão. A aba Desafios precisa de decisão sobre os nomes das categorias (ver MÉDIA 1).
- `confirm()`/toasts de importação ("Importar N cartão(ões)...", "✓ N cartão(ões) importado(s).") com `tp()`.
