# Auditoria de textos PT-BR para internacionalização da interface (i18n)

Data: 2026-10-03. Escopo: somente leitura. Único arquivo criado: este.
Objetivo: dimensionar o trabalho de permitir **idioma de interface** (en/es) separado do **idioma estudado** (fr/zh).

> Método: scripts Python (heurística "é português?": acentos ã/õ/ç/é... + lista de palavras PT) sobre
> literais de string do JS (comentários removidos por um tokenizer próprio) e sobre nós de texto/atributos do HTML
> (`<script>`, `<style>` e `<!-- -->` removidos). Node (`vm`) para percorrer `UNITS` de `content.js`.
> Os números são **aproximados**: um literal/template multilinha conta 1 mesmo tendo várias frases (subestima);
> literais curtos de 1 palavra sem acento (ex.: "Enviar") ficam de fora do JS (subestima), e alguns nomes de variável/CSS
> podem entrar (superestima, filtrei os sem espaço e sem acento). Trate como ordem de grandeza (±15%).
> Scripts: scratchpad da sessão (`count.py`, `count2.py`, `count3.py`, `dup.py`, `content.js`), comandos-chave abaixo.

## 1. Contagem

### (a) Texto estático no HTML

Comando: regex `>([^<>]+)<` (nós de texto, ≥3 letras) e `(placeholder|title|aria-label|alt)="..."` depois de remover script/style/comentários.

| Arquivo | Nós de texto | Atributos (placeholder/title/aria-label/alt) | Total |
|---|---|---|---|
| fr/index.html | 253 | 51 | **304** |
| zh/index.html | 226 | 58 | **284** |
| Idênticos entre fr e zh (nós de texto) | 181 de ~224/200 | – | únicos fr∪zh ≈ 243 nós |

Duplicação alta: ~80% do HTML estático é igual nos dois arquivos (copiado, não compartilhado). Os `index.html` também carregam muito texto montado por JS (item b).

### (b) Textos de UI em JS (toasts, mensagens, modais, rótulos, templates com HTML)

Comando: tokenizer de literais `'`/`"`/`` ` `` sem comentários + filtro PT; contagem "ampla" (≥1 palavra PT ou ã/õ/ção) e mantendo só literais com espaço ou acento.

| Arquivo | Literais PT (aprox.) |
|---|---|
| fr/app.js | 365 |
| zh/app.js | 225 |
| shared/admin-analytics.js | 84 |
| shared/admin-flashcards.js | 75 |
| shared/deck-data.js | 55 |
| shared/flashcard-field-editor.js | 51 |
| shared/profile.js | 45 |
| shared/my-flashcards.js | 41 |
| shared/admin-badges.js | 33 |
| shared/flashcard-model.js | 30 |
| shared/admin-reports.js | 37 |
| shared/admin-class-logs.js | 27 |
| shared/admin-support-materials.js | 27 |
| shared/public-profile.js | 26 |
| shared/flashcard-cloze-editor.js | 26 |
| shared/anki-import-ui.js | 24 |
| shared/wizard.js | 21 |
| shared/reports.js | 20 |
| shared/teacher-flashcards.js | 20 |
| shared/own-flashcards.js | 19 |
| demais 29 arquivos de shared/ (≤18 cada) | ~220 |
| **Total shared/** | **≈ 941** |
| **Total JS de UI (app.js fr+zh + shared)** | **≈ 1.531** |

Indicadores: `showToast(` 96 chamadas; `confirm(` 13; `alert(` 3; 308 linhas com `innerHTML`; 14 `toLocale*String`; ≈528 linhas citam "cartão/cartões" e ≈467 "aluno/aluna".
Duplicação fr×zh em app.js: 113 literais PT idênticos nos dois (de 348 fr / 215 zh); união única ≈ 450 (economia de ~140 se o catálogo for compartilhado).
Fora do pedido, mas relevantes e com PT: `fr/challenges.js` (~46), `fr/dictations.js` (~20, incluindo instruções faladas em PT para o TTS), `zh/stories.js` (~99), `zh/hanzi-data.js` (~114), `fr/conjugation-data.js` (~12), `shared/app-identity.js` (6), manifests PWA (`name`/`description` por idioma), Edge Functions (`supabase/functions/*`: mensagens de notificação/e-mail).

### (c) Conteúdo pedagógico em content.js (percorrido via `node vm` sobre `UNITS`)

fr: 30 unidades (20 comunicativas + 10 `type:"grammar"`), 6 módulos, 1 level-test. zh: 18 unidades, sem módulos. Não existe `GRAMMAR_NOTES`/`usageNote` em uso (removidos); a teoria vive em `concepts` e `grammar.blocks`.

| Campo (PT) | fr: strings / caracteres | zh: strings / caracteres |
|---|---|---|
| Tradução de vocabulário (`vocab[].t`) | 204 / 2.000 | 166 / 1.711 |
| Tradução de frases (`phrases[].t`) | 182 / 4.679 | 68 / 1.636 |
| Diálogo: título + `lines[].t` | 107 / 2.499 | 89 / 2.480 |
| Título/goal/cenário da unidade | 60 / 2.583 | 36 / 1.440 |
| `concepts` kind gramática (título+corpo+exemplos.t) | 70 / 7.941 | 219 / 17.085 |
| `concepts` kind `reality` (título+corpo+exemplos+variants) | 50 / 5.896 | 25 / 3.118 |
| `concepts` kind `culture` | 32 / 3.850 | 25 / 3.274 |
| `grammar.blocks` (só fr; título+corpo+exemplos.t) | 144 / 10.090 | – |
| `trueFalseExercises` (claim + whyNote, com `<strong>`) | 16 / 1.426 | 16 / 1.442 |
| **Total** | **≈ 865 / ≈ 41 mil caracteres** | **≈ 644 / ≈ 32 mil caracteres** |

(Os 64 `grammar.exercises` do fr são prompts em francês e não entram.) Não contados: `LEVELS[].label` (ex.: "Nível 1 · Débutant"), `MODULES[].title` (6), `LEVEL_TESTS`, `wrapup`/hints de exercícios.
Observação importante: aqui o PT é **a língua-alvo da tradução** (campo `t`), não só UI. Para interface em inglês, `vocab.t` e `phrases.t` teriam de ter uma coluna `t_en` (ou o aluno continuaria vendo PT só nas traduções). É um projeto à parte, ~1.500 strings / ~73 mil caracteres, a revisar por pessoa (confiança: ver regra de revisão de notas de realidade no CLAUDE.md).

### (d) Dados com texto PT nas migrations (só arquivos .sql)

| Fonte | O que tem texto PT | Quantidade |
|---|---|---|
| 010, 011, 012, 014, 015, 018, 019, 030 (`notification_templates`) | `title`/`body` por `event_type` × `channel` × `language_app_key` | ≈ 53 linhas semente (~106 strings título+corpo), **duplicadas por idioma estudado** (frances/mandarim com o mesmo texto: 011:15-18) |
| 015 | e-mails de reengajamento (dias 9/15/20/30) | 8 linhas (assunto+corpo) |
| 010 `notification_rules` | só categoria/limites (sem texto PT) | 8 linhas, nada a traduzir |
| 003 `badge_catalog` | sem seed; `name`/`description` são digitados pela admin | linhas dinâmicas (limite 40/120 caracteres) |
| BADGES (código) | `fr/app.js:1711`, `zh/app.js:1846` (`name`/`desc`), `shared/profile.js:51` (SPECIAL_BADGES) | código, não banco |
| `profiles`/`teacher_*` etc. | sem texto de UI; `check` com valores técnicos | – |

Comando: `grep -cE "^\s*\('" shared/supabase_migrations/0{10,11,12,14,15,18,19,30}_*.sql` + inspeção.

## 2. Padrões que dificultam i18n

| Padrão | Ocorrências (aprox.) | Onde |
|---|---|---|
| Plural manual (`n > 1 ? 'ões' : ''`, `length > 1 ?`) | ≈ 30 linhas | `fr/app.js:1269`, `fr/app.js:3527`, `zh/app.js:3729`, `shared/admin-*.js` |
| Gênero/número PT embutido (aluno/aluna, "pra esses alunos / este aluno / nenhum aluno") | ≈ 467 linhas citam aluno/aluna; decisão M/F já existe (CLAUDE.md: "aluno" genérico) | `shared/admin-flashcards.js:957,1081,1089,1265`, `admin-class-logs.js`, `admin-support-materials.js` |
| Concatenação de frase por pedaços | muito comum (`texto` + `${n}` + `texto`, "criado em " + data) | `shared/admin-flashcards.js:915`, `admin-students.js:84`, `my-flashcards.js:386`, `support-materials-view.js:37` |
| Datas formatadas à mão / locale fixo `'pt-BR'` | 14 `toLocale*` + 2 `<html lang="pt-BR">` + `app-identity` | `fr/app.js:7653,7663`, `zh/app.js:7581,7591`, `admin-reports.js:139,233`, `admin-analytics.js:203` |
| Números/unidades no texto ("3 de 5", "N atividade(s)") | alto | `fr/app.js:3128`, `fr/app.js:7663` |
| HTML dentro de strings (templates com `innerHTML`) | 308 linhas `innerHTML`; `<strong>`/`<em>` em 94 trechos de content.js | `fr/content.js:147,268` (`whyNote`), `fr/app.js:3128` |
| Strings PT usadas como chave de lógica | poucas, mas críticas | `shared/anki-import.js:186,200-203` (nomes de campo 'Caractere','Tradução' como contrato do .apkg exportado), `shared/reports.js:38-56` (`kind:'problema'/'sugestao'`), `shared/flashcard-model.js:1201` (`unitTitle` 'Da sua professora' vira texto de dado do card) |
| Textos duplicados entre fr e zh (copia e cola) | 113 literais JS + 181 nós HTML idênticos | `fr/app.js` × `zh/app.js`, os dois `index.html` |
| Rótulos PT em dados de configuração | médio | `fr/app.js:5561` (`REVIEW_ORIGIN_LABELS`), `shared/notification-preferences.js:28` (`NOTIFICATION_PREF_CATEGORIES`), `LEVELS[].label` em content.js, `FIELD_LANG_OPTIONS` em `shared/flashcard-field-editor.js:50,143` |
| Texto de interface gravado no banco/estado por idioma estudado | notification_templates por `language_app_key` | migrations 011/012/014/015/019/030 |
| Rótulos por emoji + texto na mesma string ("⚑ Reportar problema") | muito comum | `fr/index.html:3747`, `shared/notification-preferences.js:28-36` |
| `alert()`/`confirm()` com PT | 13 + 3 | `shared/*.js`, `fr/app.js` |

## 3. Proposta de formato da tabela de textos

**Arquivos** (sem build, scripts globais como o resto do projeto):
```
shared/i18n/i18n.js        // núcleo: t(), tp() (plural), setUiLang(), getUiLang(), applyDomI18n()
shared/i18n/pt-BR.js       // window.I18N_CATALOG['pt-BR'] = { ... }   (fonte da verdade, completo)
shared/i18n/en.js          // só o que foi traduzido; falta -> cai em pt-BR
shared/i18n/es.js
```
Carregar `i18n.js` e `pt-BR.js` antes de `toast.js`/`auth.js`; `en.js`/`es.js` sob demanda (inserir `<script>` ou `import()` quando o idioma for escolhido) para não pesar a carga inicial.

**Chaves**: `escopo.tela.elemento`, ASCII, minúsculas, ponto como separador, estáveis (não derivadas do texto):
`report.modal.title`, `report.category.bug_tecnico`, `common.close`, `flashcards.admin.createButton`. Escopos: `common`, `auth`, `profile`, `report`, `flashcards`, `deck`, `review`, `lesson`, `admin`, `notif`, `toast`. Textos específicos do idioma estudado ficam em `fr.*`/`zh.*` (ex.: `zh.pinyin.picker.title`); o resto é compartilhado.

**Função**: `t('chave', {n: 3, nome: 'Ana'})`, interpolação `{n}`; `t` nunca lança, nunca devolve vazio.
**Plural**: `tp('review.dueCards', n)` com objeto `{ one: '{n} cartão', other: '{n} cartões' }` e regras por idioma via `Intl.PluralRules(uiLang)` (en/es/pt têm one/other; PT-BR trata 0 como "one"? usar a regra do `Intl`, não escrever à mão). Gênero: evitar na chave; usar forma neutra ("aluno" genérico, já a decisão do projeto) ou variante `_f`/`_m` só quando indispensável.
**HTML estático**: atributos `data-i18n="chave"`, `data-i18n-attr="placeholder:chave;title:chave2;aria-label:chave3"`, e `applyDomI18n(root)` roda no boot e após render de modais. Textos montados em JS usam `t()` direto; evitar HTML dentro de strings: separar em `{ pre, strong, post }` ou aceitar a marcação mínima `<b>..</b>` sanitizada pelo próprio `t()` (só uma lista curta de tags).
**Fallback**: en/es -> pt-BR -> a própria chave (e `console.warn` em modo dev). Linter simples (script Node em `scripts/`) lista chaves faltantes em en/es e chaves usadas no código que não existem em pt-BR.
**Datas/números**: `fmtDate(d, opts)` e `fmtNumber(n)` com `Intl.*(uiLang)`; substituir os 14 `toLocale*('pt-BR')`.
**Idioma de interface (eixo separado)**: novo dado `uiLanguage` (`'pt-BR'|'en'|'es'`).
- Guardar em `progress.data._meta.uiLanguage` (mesma linha/RLS já usada por `_meta.currentLearningLanguage`, sem migração) + `localStorage['ui-language']` como atalho/convidado, igual ao padrão de `shared/language-pref.js`.
- Detecção: (1) conta -> `_meta.uiLanguage`; (2) localStorage; (3) `navigator.language` só para **sugerir** (banner "Ver em inglês?"), nunca trocar sozinho; (4) padrão `pt-BR`. Contas existentes não têm o campo -> `pt-BR` (nada muda).
- Nunca derivar de `APP_KEY`, `Field.lang` nem de `currentLearningLanguage`. `<html lang>` passa a refletir `uiLanguage` (hoje fixo `pt-BR` nos dois index.html).
- Idioma da tradução do conteúdo (`vocab.t`) é um terceiro assunto: ao começar, `t` continua PT para todos; coluna `t_en`/`t_es` entra em fase própria e `getTranslation(item, uiLang)` cai em `t`.
- Banco: `notification_templates` ganha coluna `ui_language` (default `'pt-BR'`); as linhas atuais viram pt-BR; e-mails e notificações do cron escolhem por preferência do aluno (hoje por `language_app_key`, o que duplica). Edge Functions precisam de leitura de `uiLanguage` -> fase tardia.
- Seletor na tela Configurações ("Idioma da interface"), ao lado de Modo escuro; salva igual às outras preferências.
- Regra de qualidade (CLAUDE.md): cada tradução nova relatada ao chat com nível de confiança; PT-BR continua o registro de referência.

## 4. Recorte PILOTO sugerido (~50 chaves): modal "Reportar problema ou sugestão"

Por quê: modal único, autocontido, compartilhado por fr e zh (`shared/reports.js`), sem dependência de lógica de estudo, já com ids estáveis nas categorias, sem plural nem gênero difíceis, usado também por convidados (testa o idioma sem conta).

Arquivos/linhas:
- `fr/index.html:4106-4146` (modal inteiro: título, `aria-label` fechar, rótulos, placeholders, "(opcional...)", botão anexar, nota de privacidade, Enviar, tela de sucesso, Fechar) e `zh/index.html:3701-3741` (mesmo bloco). ≈ 17 textos, **mesma chave nos dois**.
- Pontos de entrada: `fr/index.html:3214` (aria-label+title do pill), `3343` (flag da lição), `3747` (item do menu "⚑ Reportar problema"); `zh/index.html:2868`, `2990`, `3354`. ≈ 4 chaves.
- `shared/reports.js:37-45` (8 `REPORT_CATEGORIES.label`), `:52-57` (4 `REPORT_SEVERITIES.label`), `:299` e `:310` (mensagens de limite), `:343,346,353,357` (anexo), `:424,511,520,558` ('Enviar'), `:489,495,502,557` (erros), `:506` ('Enviando...'), `:572` (toast de sucesso). ≈ 30 strings (≈ 22 chaves únicas após deduplicar 'Enviar'/'Não foi possível enviar a imagem').
- Total ≈ 45-50 chaves únicas (≈ 75 ocorrências hoje). Risco baixo: se uma chave faltar, `t()` cai em pt-BR e o modal continua igual.
- Criar `shared/i18n/*` apenas com essas chaves e o seletor de idioma provisório (query `?ui=en` para teste; sem UI de configuração ainda). Ajustes de plural/data: nenhum nesse recorte (bom para validar o núcleo antes).

Segundo passo natural: modais pequenos `#flashcard-limit-modal` (fr/index.html:4028) e `#flashcard-reset-confirm-modal` (4045), `#premium-challenges-modal` (4015), depois tela Configurações.

## 5. Os 10 exemplos mais problemáticos

| # | Arquivo:linha | Problema |
|---|---|---|
| 1 | `fr/app.js:1269` (e `zh/app.js:1434`) | plural PT por sufixo: `lição${n > 1 ? 'ões' : ''}`; frase montada em pedaços |
| 2 | `fr/app.js:3527` / `zh/app.js:3729` | `cartão`/`cartões` com ternário e emoji dentro do HTML; fr e zh divergem na forma (duplicado e diferente) |
| 3 | `shared/admin-flashcards.js:957` (idem `admin-class-logs.js:98`, `admin-support-materials.js:93`) | "Nenhum cartão ainda pra" + ` esses alunos`/` este aluno`/` nenhum aluno selecionado` concatenado, gênero e número fundidos na mesma expressão |
| 4 | `shared/admin-flashcards.js:1089,1265` | rótulo de botão por concatenação: `Criar cartão` + ` pra ${n} alunos` |
| 5 | `shared/anki-import.js:186,200-203` | **PT como chave de lógica**: reconhece o `.apkg` exportado pelo app comparando nomes de campo 'Caractere' e 'Tradução'; traduzir esses nomes quebraria o round-trip de importação |
| 6 | `shared/flashcard-model.js:1201` | `unitTitle = 'Da sua professora' : 'Meus cartões'` vira dado no objeto do card (texto de UI dentro do motor, sem `t()`) |
| 7 | `fr/app.js:7663` / `zh/app.js:7591` | `title="${n} atividade(s) em ${date.toLocaleDateString('pt-BR')}"` — plural escondido "(s)", locale fixo, em atributo HTML |
| 8 | `shared/admin-flashcards.js:915`, `admin-students.js:84`, `my-flashcards.js:386`, `support-materials-view.js:37` | "criado em/vinculado em/enviado em " + data: ordem das palavras fixa em PT e data formatada por `toLocaleDateString('pt-BR')` |
| 9 | `fr/content.js:147,268` (`whyNote`) e 94 trechos com `<strong>` | explicação PT com HTML e aspas escapadas dentro do dado; mistura tradução da língua-alvo com texto pedagógico PT; trocar de idioma exigiria reescrever o HTML |
| 10 | `shared/reports.js:38-56` + `fr/index.html:4106-4146` | rótulos de categoria/gravidade em PT com `kind:'problema'/'sugestao'` também em PT; mesmos textos repetidos em fr e zh (HTML + JS) e `html lang="pt-BR"` fixo (`fr/index.html:2`) |

Menções honrosas: `fr/app.js:3128` (contador "N de M" / 'Nota de realidade' / 'Vale entender' no mesmo ternário), `notification_templates` duplicadas por idioma estudado (`011_seed_client_event_templates.sql:15-18`), `shared/notification-preferences.js:28-36` (emoji+texto como rótulo e id em PT como chave).

## Esforço estimado (ordem de grandeza)

| Camada | Itens | Observação |
|---|---|---|
| HTML estático | ~590 ocorrências (~245 únicas) | mecânico com `data-i18n` |
| JS de UI | ~1.530 literais (~1.250 únicos após deduplicar fr/zh) | exige revisar plural/data/HTML (~35% dos casos) |
| Conteúdo pedagógico | ~1.500 strings / ~73 mil caracteres | decisão separada: tradução do currículo, não UI |
| Dados/Edge Functions | ~106 strings de notificação + e-mails + BADGES | `ui_language` + cron |
