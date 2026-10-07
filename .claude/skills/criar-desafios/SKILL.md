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
5. Áudio: Actions > "Áudio TTS" com o modo do lote (ex.: `desafios-a1-m1`, `ditados`).
6. Conclusão: acerto ou erro leve conclui; erro total mostra "Tentar de novo"/"Tentar mais tarde".
7. Textos de interface via `chT()`/`CHALLENGE_I18N`. chinês ainda não tem aba Desafios.
8. Testes: `fr/scripts/test_answer_validation.js`, `tests/desafios-*`, `tests/ditado`.
