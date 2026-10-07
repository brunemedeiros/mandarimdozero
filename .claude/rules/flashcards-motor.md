---
paths:
  - "shared/flashcard-*.js"
  - "shared/own-flashcards.js"
  - "shared/teacher-flashcards.js"
  - "shared/my-flashcards.js"
  - "shared/admin-flashcards.js"
  - "shared/anki-*.js"
  - "shared/public-deck.js"
  - "shared/public-profile.js"
  - "shared/card-variants.js"
---

# Motor de flashcards (Note / Card Type / CardInstance)

Histórico completo: `docs/historico/04-*` (motor e editor), `05-*` (áudio/Anki), `06-*` (consolidação).

## Invariantes
- Fonte de verdade: Note = `fields` (array de Field) + `card_generation_mode` (`normal`, `normal_reversed`,
  `multiple_choice`, `type_answer`, `cloze`), sempre pareados (CHECK no banco, `validateNativeNoteRow`).
- CardInstances são derivadas em runtime por `buildEngineCardsFromRow()`/`interpretNoteFromRow()` e NUNCA
  persistidas. Ids: `t{id}`/`s{id}` (+ `-r{revision}` após edição, `-b` na metade reversa, `-cN` no Cloze nativo).
- Builders devolvem ARRAY de cards; quem mescla em `STATE.cards` itera tudo.
- Field: `{id, lang, role, content:{value}, audio, image, pinyinFieldId}`. `role` só decide em Múltipla escolha
  (prompt/answer/distractor); os outros tipos são posicionais (`contentFieldIndices` pula satélites de pinyin).
  Direção vem do CardInstance; nunca usar `frontIsTargetLanguage`/`isReverse`/`reviewDirection` em cartão nativo
  (são só da trilha/legado). zh nunca inverte.
- Cloze: sintaxe interna `{{cN::resposta}}` ou `{{cN::resposta|pinyin}}` num único Field; a autora nunca digita a
  sintaxe (editor visual). zh exige `compareAnswer` por marca.
- Toda leitura de conteúdo passa por `resolveCardContentView()`/`resolveCardField()`; renderers não leem Field cru.
- 4 renderers (`renderNormalCard`, `renderMultipleChoiceCard`, `renderTypeAnswerCard`, `renderClozeCard`, em fr/zh
  `app.js`) com contrato `(mountEl, card, localState, callbacks)`. Review e Preview usam os MESMOS renderers;
  nunca criar renderer paralelo. Estado efêmero só em `localState` (Review: `STATE.reviewCardState`).
- `Field.audio`: `null | {type:'url'|'upload'|'tts'|'recording', ...}`; resolver por `resolveFieldAudioUrl()`.
  Áudio/imagem de um lado só aparecem quando aquele lado está visível (nunca vazar a resposta).
- Criação é sempre nativa (`createFlashcard`/`createOwnFlashcard` exigem `nativeState`). Legado: só leitura,
  edição e conversão EXPLÍCITA (botão "Usar o novo editor"); nunca converter automaticamente nem em massa.
- `revision` incrementa em mudança de conteúdo (reseta FSRS via id novo). Arquivar ≠ apagar; "Arquivar" saiu da UI.
- Tags: `normalizeNoteTags()` é a única normalização; limites 20 tags × 50 caracteres; `criado-por-*` é tag de sistema.
- Limite grátis: 20 CardInstances em `own_flashcards` (Premium e aluno vinculado sem teto); importações cortam e avisam.
- Export Anki leva mídia por Field e tags; import cria Note nativa (nunca histórico FSRS do Anki).
