---
paths:
  - "fr/**"
  - "zh/**"
  - "index.html"
  - "shared/*.js"
---

# Front-end fr/zh (app.js, index.html, CSS)

- `fr/app.js` e `zh/app.js` são espelhados: mudança em um quase sempre vale no outro (com as adaptações de idioma:
  zh tem hanzi+pinyin separados, `speakChinese`, `pinyinTonePickerHTML`; fr tem `speakFrench`, `frAccentPickerHTML`).
  Desafios e Ditados só existem no fr.
- **Tokens de cor**: nomes iguais podem ter valores diferentes. Em fr, `--seal-red` é AZUL (#3498D6) e
  `--on-seal-red` é quase preto; em zh é vermelho e branco. Ler o `:root` do arquivo antes de usar. Texto sobre
  `--error-red`/`--jade` usa `--on-vivid`. Cor nova vira token definido nos 3 blocos de tema (`:root`,
  `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])`, e `:root[data-theme="dark"]`).
- Toda cor de fundo nova: screenshot Playwright em fr claro, fr escuro, zh claro, zh escuro (skill `teste-navegador`).
- Alvos de toque >= 44px no celular (só em `@media`), sem rolagem horizontal em 390px.
- Texto vindo de usuário/autor: sempre `escapeHTML()` (escapa aspas; usado em atributos também).
- Texto visível novo passa por `t()`/`shared/i18n` (ver `.claude/rules/i18n.md`); português não muda sem aprovação.
- `let`/`const` top-level de `<script>` são bindings léxicos: não redeclarar o mesmo nome em dois scripts da página
  (ex.: `CARD_TYPE_UI_META` só em `admin-flashcards.js`); `window.X` não enxerga `let X`.
- Nunca re-renderizar um formulário inteiro por mudança de seleção/digitação (apaga o que a pessoa digitou):
  atualizar só o pedaço dependente via DOM. Re-render completo só no carregamento e depois de salvar.
- `STATE.streak` só muda ao estudar: para exibir use `effectiveStreak()` (`shared/srs.js`).
- Áudio: `speakFrench/speakChinese` = reprodução + `registerAudioPlay()` (analytics); `speakXAudioOnly`/
  `playAudioPreview` = só reprodução. Preview (`card.__isPreviewCard`) nunca conta analytics nem faz autoplay.
- Service Worker do PWA cacheia: ao testar, bloquear SW; ao publicar, a versão é atualizada pelo `pwa.js`.
- Enter dentro de campo de resposta pertence ao campo (não aciona o atalho global de "Continuar").
