---
name: notas-de-realidade
description: Escrever, revisar ou listar notas de realidade (forma ensinada x forma real, registro, gíria, variação regional, gramática coloquial) e notas culturais (história, costume, festividade) nas unidades de fr/content.js e zh/content.js. Use sempre que for criar/editar uma nota dessas ou uma unidade nova.
---

# Notas de realidade e culturais

Histórico completo e lista das notas existentes: `docs/historico/01-regras-gerais-notas-realidade-cultura-streak.md`.

## Taxonomia (travada em código: `REALITY_NOTE_*` e `CULTURE_NOTE_*` em fr/zh `app.js`)
- Realidade (`kind:'reality'`): `informal`, `familiar-giria` (só A2/HSK2+, badge próprio), `regional`
  (`variants:[{region, form}]`, sem forma oficial), `gramatica-coloquial` (desvio gramatical aceito na fala).
- Cultura (`kind:'culture'`): `historia`, `costume`, `festividade`. Fato isolado, sem contraste de forma.
- Ficam em `concepts` da unidade, com `trigger: {afterVocabIdx}` ou `{after:'dialogue'}`.
- Usar `isRealityNoteCategoryAllowedAtLevel(category, level)`; chaves de nível: fr `A1`, zh `HSK1`.

## Critério
- Só entra se responder à palavra/expressão ensinada naquele momento. Sem teto e sem mínimo por unidade.
- Na dúvida, deixar de fora (nunca publicar nota de confiança média/baixa sem a autora pedir).
- Nunca duplicar o que a gramática da unidade já ensina.
- Português do Brasil coloquial no texto de apoio.
- `gramatica-coloquial` ainda não é aceita na correção dos exercícios: o texto da nota avisa para escrever a forma padrão.

## Entrega (obrigatório)
Terminar com a lista de TODAS as notas do app (não só as novas), cada uma com idioma/unidade/id/resumo e
nível de confiança (alta/média/baixa). Atualizar a lista no arquivo de histórico.
