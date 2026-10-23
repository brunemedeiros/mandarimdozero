# 21. Etapa 0a do currículo fr: ids estáveis por item (2026-10-18)

Plano: `docs/i18n/curriculo/04-lacunas-e-propostas-fr.md`, seção 2 (opção (c) aprovada pela dona, decisões 3, 4 e 5).
Grátis x Premium: infraestrutura invisível, tudo grátis; nada muda para o aluno.

## O que entrou

- `fr/content.js`: chave `k` em 473 itens (204 palavras, 182 frases, 87 falas). Valor = id de hoje sem o "u": **nenhum id mudou,
  nenhum aluno precisa de migração**. Cabeçalho com a regra da chave.
- `fr/scripts/congelar_chaves.js` (idempotente; item novo ganha a próxima chave livre) + `fr/scripts/item_keys_registry.json`.
- `fr/scripts/ids_publicados.js` + `fr/published_ids.json` (livro-razão: 570 cartões, 30 unidades, 6 módulos, 82 lições; gravado
  com o código de ANTES das chaves) + `checkLedger`.
- `fr/curriculum-changes.js` (vazio, `CURRICULUM_VERSION = 1`): `STUDY_KEY_MERGES`, `STUDY_RETIRED_KEYS`, `UNIT_MERGES`,
  `MODULE_MERGES`, `RETIRED_LESSON_IDS`. Carregado em `fr/index.html` (e no precache do `fr/service-worker.js`).
- `shared/study-trail-model.js`: `studyItemCardId`/`studyWordCardId` (sem `k` = regra antiga, zh igual), `applyStudyKeyChanges`
  (pura: fusões com a regra FSRS, aposentados e órfãos para o arquivo, volta do arquivado, idempotente),
  `renameStudyIdsInRecords`, `applyUnitModuleMerges`, `stampUnitLessonIds`/`reconcileUnitLessonIdx`, `released` na whitelist.
- Id montado na mão trocado por `studyWordCardId`/`studyItemCardId`: `shared/srs.js`, `shared/core/exercicios-licao.js`,
  `fr/app.js` e `zh/app.js` (`renderBlockIntroCard`).
- `isCardLessonCompleted` (`shared/core/revisao-decks.js`): `released` passa sempre; a marca só é gravada em item com chave (fr).
- `fr/app.js`: `STATE.retiredStudyCards`; `serializeState` salva o arquivo, `_curriculumVersion` e `lessonId`;
  `applySerializedState` aplica as mudanças de currículo antes do merge e marca `released` em tudo que o portão já libera.
  O zh não mudou (continua sem arquivo; item sem `k`).

## Testes

`tests/curriculo-ids/`: `test_chaves.js` (19), `test_ids_publicados.js` (12), `test_carregamento.js` (111: função pura, 5 saves
simulados, conteúdo v2 de teste com as operações da seção 5, ida e volta, volta de aposentado, portão, lessonId, zh),
`test_playwright.js` (10, navegador real). Saves reais: o teste lê `tests/curriculo-ids/fixtures/real-*.json` se existirem (não há).
Testes antigos ajustados de propósito: `fase-e/test_course_decks_unit.js` (id === u{k}), `k2c/test_study_native_unit.js`
(whitelist com `released`), `camada-curso/test_equivalence.js` (`k` sai da comparação com o original),
`e4/test_progresso_ida_e_volta.js` (aceita `released` novo; +2 checagens), `trilha/test_a0_eligibility.js` e o cenário de lição
parcial da Fase E (apagam `released` entre cenários artificiais), `i18n/test_i18n_unit.js` (o `<script>` novo sai dos dois lados).
Bateria completa: 148 suítes antes, 151 depois; 0 falhas novas. Capturas antes x depois: 18 de 18 iguais.

## Fica para a 0b

Script de operações (`curriculo_ops.js`), mapa do cron (`STUDY_ITEM_GATE`) e deploy do `notification-cron`, regra 2.10
(unidade nova nasce aberta), esconder Course Deck de unidade que deixou de existir, camadas por chave.

## Depois: zh e código comum (2026-10-23)

O zh ganhou a mesma chave `k` e o carregar/salvar com mudanças de currículo foi para `shared/core/curriculo-progresso.js`
(os scripts saíram de `fr/scripts/` para `scripts/`): `23-paridade-c1-chave-estavel-zh.md`.
