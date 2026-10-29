---
name: criar-desafios
description: Decidir e gerar Desafios (Ditado, Ouça e traduza, Acentuação/tons, Expressões, Complete a frase) ao criar um nível, módulo, unidade ou lição novos, em qualquer idioma, e preparar o lote para revisão e importação. Use também ao mexer na aba Desafios ou nos ditados.
---

# Criar Desafios

Histórico e decisões: `docs/historico/09-desafios-ditados.md`. Política em código: `shared/challenge-policy.js`.

1. Rodar `challengeChecklist(idioma, escopo)` e, para CADA categoria, decidir `trail` (aberto, na trilha),
   `premium` (unidade "Desafios do Módulo N") ou `n/a` com motivo. Nunca deixar em branco.
2. Padrão atual: Ditado = trail (1 Free por módulo + 2 Premium); Ouça e traduza, Acentuação, Expressões,
   Complete a frase = Premium. Regra futura de Free (quando o paywall ligar): 1 atividade por categoria no total.
3. Densidade leve: Ouça e traduza ~2 por unidade; Expressões ~5 por módulo; Acentuação só com acento real
   (fr ´ ` ^ ~ ¨, "ç" não conta; zh tons). Só vocabulário já visto no módulo.
4. Conteúdo em `fr/scripts/challenges_import/modulo-*-content.json` → `build_modulo.py` → `lote-*.json` + `lote-*.md`.
   A autora revisa o `.md` antes de áudio/importação. Importar como `needs_review`.
4b. **Registro obrigatório em toda expressão nova** (regra de 12/10/2026): campo `register` no conteúdo-fonte
   (`soutenu` / `neutre` / `familier` / `très familier` / `vulgaire`), que o builder converte no campo próprio
   `register` do desafio (`formal` / `neutral` / `familiar` / `slang` / `vulgar`). Sem ele o build falha.
   Na lista vira etiqueta (Formal, Dia a dia, Entre amigos, Gíria, Pode ofender). Reportar o registro de cada
   expressão nova no chat com nível de confiança. Expressão criada à mão (admin/SQL) também precisa do campo.
4c. **Tradução no mesmo lote** (regra de 19/10/2026): cada desafio nasce com a versão em inglês em
   `docs/i18n/challenges-en.json` (expression `meaning`; listen_translate `referenceTranslations` + `explanation`;
   accent `explanation`; cloze_grammar `translation` + `explanation`; ditado em `dictations-en.json`), revisada no mesmo `.md`
   com nível de confiança. `node scripts/build-challenges-overlay.js en` e `node scripts/validate-challenges-en.js` sem erro
   antes de importar. Lote sem inglês não é importado.
4d. **Português do Brasil no Ouça e traduza** (regra de 26/10/2026): as `referenceTranslations` em pt só têm formas do
   Brasil (nada de "estou a comer", autocarro, telemóvel...; "tu" + 2ª pessoa pode). Resposta da aluna em português de
   Portugal vira "Quase" com a forma do Brasil na devolutiva. A detecção e a troca são do código comum
   (`shared/core/familias/portugues-variantes.js`, vale para todo exercício com resposta em português); o Ouça e traduza
   chama por `listenTranslateVerdict` em `shared/desafios.js`. A varredura de `tests/desafios-ptpt/test_ptpt.js` barra
   forma de Portugal nos lotes.
5. Áudio: Actions > "Áudio TTS" com o modo do lote (ex.: `desafios-a1-m1`, `ditados`).
6. Conclusão: acerto ou erro leve conclui; erro total mostra "Tentar de novo"/"Tentar mais tarde".
7. Textos de interface via `chT()`/`CHALLENGE_I18N`. chinês ainda não tem aba Desafios.
8. Testes: `fr/scripts/test_answer_validation.js`, `tests/desafios-*`, `tests/ditado`.
