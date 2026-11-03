---
paths:
  - "fr/**"
  - "zh/**"
  - "index.html"
  - "shared/*.js"
---

# Front-end fr/zh (app.js, index.html, CSS)

- Lição, exercícios, diálogo, Revisão (cartões e Revisão rápida), voz, salvar/carregar, conquistas, trilha, configurações e a
  casca do app são **comuns** em `shared/core/` (`licao-base`, `licao-dialogo`, `licao-exercicios`, `trilha-licao`,
  `estado-salvar`, `revisao-cartoes`, `app-comum`, `voz`; família latina em `shared/core/familias/latina-licao.js`); o que muda
  por idioma vem de `LANG_HOOKS` (`<site>/lang-hooks.js`). Nunca copiar para um `app.js` (que só tem dados/configuração e o
  próprio do idioma: hanzi, pinyin, histórias no zh). Guarda: `tests/paridade-sites/test_quase_iguais.js` (paridade 5d).
  Desafios e Ditados só existem no fr (os motores são comuns, ver abaixo).
- **LANG_HOOKS**: contrato único em `shared/core/lang-hooks-contrato.js` (tipo, obrigatório, padrão neutro); gancho novo entra lá no mesmo PR, e
  padrão comum nunca é texto de um idioma. Guarda: `tests/paridade-sites/test_contrato_lang_hooks.js`. Idioma de Field/voz/nacionalidade vem do registro (`languages/registry.*`), nunca `'fr'` fixo.
- **Tokens de cor**: nomes iguais podem ter valores diferentes. Em fr, `--seal-red` é AZUL (#3498D6) e
  `--on-seal-red` é quase preto; em zh é vermelho e branco. Ler o `:root` do arquivo antes de usar. Texto sobre
  `--error-red`/`--jade` usa `--on-vivid`. Cor nova vira token definido nos 3 blocos de tema (`:root`,
  `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])`, e `:root[data-theme="dark"]`).
- Toda cor de fundo nova: screenshot Playwright em fr claro, fr escuro, zh claro, zh escuro (skill `teste-navegador`).
- Alvos de toque >= 44px no celular (só em `@media`), sem rolagem horizontal em 390px.
- Texto vindo de usuário/autor: sempre `escapeHTML()` (escapa aspas; usado em atributos também).
- URL de mídia de cartão (imagem/áudio) no HTML: sempre `safeMediaUrl()`/`flashcardImageHTML()` (`shared/core/midia-segura.js`), nunca crua. Guarda: `tests/revisao-seguranca/`.
- Texto visível novo passa por `t()`/`shared/i18n` (ver `.claude/rules/i18n.md`); português não muda sem aprovação.
- `let`/`const` top-level de `<script>` são bindings léxicos: não redeclarar o mesmo nome em dois scripts da página
  (ex.: `CARD_TYPE_UI_META` só em `admin-flashcards.js`); `window.X` não enxerga `let X`.
- Nunca re-renderizar um formulário inteiro por mudança de seleção/digitação (apaga o que a pessoa digitou):
  atualizar só o pedaço dependente via DOM. Re-render completo só no carregamento e depois de salvar.
- `STATE.streak` só muda ao estudar: para exibir use `effectiveStreak()` (`shared/srs.js`).
- Áudio: `speakFrench/speakChinese` = reprodução + `registerAudioPlay()` (analytics); `speakXAudioOnly`/
  `playAudioPreview` = só reprodução. Preview (`card.__isPreviewCard`) nunca conta analytics nem faz autoplay.
- Service Worker do PWA cacheia: ao testar, bloquear SW; ao publicar, a versão é atualizada pelo `pwa.js`.
- Diálogo: palavras do vocabulário da unidade em COR + negrito (`.dlg-new`, `var(--seal-red-dark)`), nunca sublinhado
  (sublinhado = pontuação faltando/bloco no lugar errado). Transcrição (pinyin) também destacada (`.dlg-new-py`,
  alinhada por busca, `dlgHighlightPinyin`). zh: pinyin acima do hanzi. Idioma novo reutiliza essas classes.
- **Resposta com mais de uma forma** ("allemand / allemande", "un / une"): em QUALQUER exercício de digitar (hoje e os futuros) vale uma
  forma só, o texto inteiro (barra com ou sem espaço, vírgula) na ordem do cartão; ordem trocada, só espaço e a 2ª forma incompleta são erro.
  Use os helpers (fr: `FamiliaLatina` / `typedAnswerVerdictForExpected`; zh: `acceptedFormsTyped` + `typedVariants`), nunca
  `acceptedForms()` cru. Erro marcado em vermelho: `typedAttemptHTML` (comum, `shared/core/licao-feedback.js`; a forma de comparar de cada idioma vem de `LANG_HOOKS.typedAttemptForm`). O teclado de letras ganha uma fileira com letras que a resposta
  pede e ele não tem (`frAccentPickerHTML(resposta)`). Guarda: `tests/respostas-digitadas/`.
- **Telas de exercício seguem o molde da trilha** (decisão da autora, 2026-10-23, vale para Jogos, Desafios, Revisão e futuros): o comando
  fica SEMPRE no idioma do site, em qualquer nível (rótulo pequeno `t('fr.exercise.whatMeans')`, nos Desafios `chT('ch.expr.whatMeans')` com o mesmo texto, acima do cartão com o item; nunca frase em
  francês vinda do conteúdo); saída pelo X com barra de progresso (não link "← Voltar"); ⚑ e pílula de Atalhos do teclado; respostas com
  badge numerado 1-4 e seleção digitando o número; "Não sei" abaixo das opções; feedback com Continuar. Auditoria e plano: `docs/historico/`.
- **Unidade de gramática** (`type:"grammar"`) e **exercício de cenário**: motor comum em `shared/core/gramatica-cenario.js` (CSS em
  `shared/gramatica-cenario.css`); o que muda por idioma vem de `LANG_HOOKS` (`grammarAnswerVerdict`, `scenarioOptionHTML`, `phraseAnswerHTML`...).
  Guarda: `tests/paridade-sites/test_gramatica_cenario*.js`.
- **Módulos e níveis** (Ponto de verificação do módulo e o pulo, Revisão do módulo, Teste de Nível, seletor de nível, trilha/Mapa por
  módulos, tela de módulo concluído): motor comum em `shared/core/modulos-niveis.js` (CSS em `shared/modulos-niveis.css`, depois do `<style>`),
  vale para todo site que declarar `MODULES`/`LEVEL_TESTS`; prova por idioma em `LANG_HOOKS.checkpointExam`/`checkpointScore`. Nunca copiar
  para um `app.js`. Guarda: `tests/paridade-sites/test_modulos_niveis*.js`.
- **Conjugação** (escolha, busca, prática, correção, teclado, resultado, abas Praticar | Jogos, selo dos Jogos, contadores das missões):
  motor comum em `shared/conjugacao.js` (CSS em `shared/conjugacao.css`, depois do `<style>`; jogos em `shared/conj-games.js`); o que é do
  idioma vai na config do site (`fr/conj-config.js`, `registerConjugation`). Nunca copiar para um `app.js`; o zh não carrega (não conjuga).
  Guarda: `tests/paridade-sites/test_conjugacao*.js`.
- **Ditados** (lista, linha "Revisão do A1" da trilha, player, correção, resultado, registro da tentativa): motor comum em
  `shared/ditados.js` (CSS em `shared/ditados.css`, depois do `<style>`); o que é do idioma (ditados, família latina, voz, teclado, mp3,
  abreviações, ganchos dos Desafios) vai em `fr/ditados-config.js` (`registerDictations`). Nunca copiar para um `app.js`; o zh não
  carrega (decisão da dona pendente). Guarda: `tests/paridade-sites/test_ditados*.js`.
- **Desafios** (catálogo, Free x Premium, textos `chT`, revisão espaçada, correção de cada tipo, telas do aluno, linha "Desafios do Módulo N"
  da trilha, admin e importação): motor comum em `shared/desafios.js`, `shared/desafios-telas.js` e `shared/desafios-admin.js` (CSS em
  `shared/desafios.css`, logo depois do `<style>`); o que é do idioma (família da Acentuação, teclado, tabela, textos que citam o idioma) vai em
  `fr/desafios-config.js` (`registerChallenges`). Nunca copiar para um `app.js`; o zh não carrega (decisão da dona pendente).
  Guarda: `tests/paridade-sites/test_desafios*.js`.
  **Expressões em passos** (palpite, resposta, "Veja em frases" com "Quando usar", "Monte a frase", "Sua vez" com XP só na 1ª conclusão, final): `exprShowOptions`...
  `exprShowFinal` em `shared/desafios-telas.js`; barra do topo só nelas (`data-lesson-bar`, `shared/activity-focus.js`); texto novo = chave em `CHALLENGE_I18N`
  (pt-BR e en). Os testes `tests/paridade-sites/test_desafios*.js` e `test_conjugacao*.js` comparam "antes x depois" do refactor: mudança de propósito
  entra na lista de neutralizações do teste (com data e motivo), nunca apagando a comparação. Testes: `tests/desafios-expressoes-passos/`.
  Dados opcionais de cada expressão: `example/secondExample.{pt,mark}` (tradução e trecho exato do francês a destacar), `literal.{pt,note}` (tradução literal e nota de origem); no site em outro idioma vêm do overlay (`docs/i18n/challenges-en.json`: `example`, `secondExample`, `literal`, `literalNote`) e nunca entram em `CHALLENGE_SITE_LANG_FIELDS` (sem o campo, a parte some; o desafio não). Teste: `tests/desafios-exemplos-traducao/`. Gravar SQL no navegador troca `\n` por `\r\n`: usar `chr(10)` (`docs/i18n/lote-exemplos-expressoes/gerar.py`) e conferir por hash.
- **Lembrete de revisão do rodapé** (`maybeShowReviewReminder`, `shared/core/revisao-decks.js`): o dia só é gravado depois de o banner ficar visível uns segundos ou ser clicado/dispensado
  (`markReviewReminderSeen`); em lição (`lesson-focus`) nem aparece nem gasta o dia; reavalia ao voltar para a aba e ao sair da lição. Guarda: `tests/lembrete-revisao/`.
- Enter dentro de campo de resposta pertence ao campo (não aciona o atalho global de "Continuar").
- Ícones: emoji escrito no texto vira desenho do Fluent por `shared/emoji-icons.js`. Emoji novo precisa entrar no MAP de lá
  e ter o SVG em `shared/icons/fluent/` (senão aparece o emoji do aparelho). Ícone de menu = `<img class="tab-icon" ...>`.
- **Paridade**: CSS de classe usada por `shared/` vai para o `index.html` de cada site (ou para um `.css` de `shared/`) no mesmo PR;
  `tests/paridade-sites/test_css_compartilhado.js` descobre os sites sozinho e barra a falta. Recurso só do fr: ver a
  classificação (A idioma, B pendência da autora, C esquecido) em `docs/auditoria-paridade-fr-zh.md` antes de dar por pronto.
