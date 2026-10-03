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
