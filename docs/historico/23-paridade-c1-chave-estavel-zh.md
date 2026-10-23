# 23. Paridade C1: chave estável por item e mudanças de currículo no zh, em código comum (2026-10-23)

Plano: Etapa 1 do plano de paridade aprovado pela dona (`docs/auditoria-paridade-fr-zh.md`, seção 5, C1). Continua a
Etapa 0a do fr (`21-etapa-0a-ids-estaveis-fr.md`) e a 0b (`22-etapa-0b-parte-1.md`), agora para todos os sites.
Grátis x Premium: infraestrutura invisível, tudo grátis; nada muda para o aluno na tela.

## O que entrou

- `zh/content.js`: chave `k` em 305 itens (166 palavras, 68 frases, 71 falas), valor = id de hoje sem o "u" (`1-v0`,
  `3-p2`, `5-d4`). **Nenhum id de cartão mudou** (420 cartões; conferido contra a `origin/main`, ids e cartões campo a campo).
  Cabeçalho com a regra. O `k` de `dialogue.check` ("fill", "listen") é outra coisa e não foi tocado.
- `zh/curriculum-changes.js` (vazio, `CURRICULUM_VERSION = 1`, mesma forma do fr; carregado em `zh/index.html` e no precache
  do `zh/service-worker.js`), `zh/published_ids.json` (420 cartões, 18 unidades, 0 módulos, 74 lições) e
  `zh/scripts/item_keys_registry.json`.
- Scripts movidos de `fr/scripts/` para `scripts/` e generalizados: `scripts/congelar_chaves.js [site...] [--conferir]` e
  `scripts/ids_publicados.js [site...] [--conferir]`; sem site = todos. `scripts/lib/sites.js` descobre os sites (pasta da raiz
  com `index.html` e `app.js`; appKey pelo `path` do `languages/registry.json`). Correção para unidade numérica (zh): o id da
  unidade é comparado como texto e o registro ordena 1, 2, ..., 10.
- `scripts/gerar_mapa_cron.js` usa os sites descobertos (zh com `zh/curriculum-changes.js`). **O mapa `STUDY_ITEM_GATE` não
  mudou** (`--conferir` ok nos dois arquivos): nenhum deploy do `notification-cron` é necessário.
- `shared/core/curriculo-progresso.js` (novo, carregado nos dois `index.html` antes do `app.js`), tirado de `fr/app.js`:
  - `curriculumSaveFields()`: `stampUnitLessonIds` + `retiredStudyCards` + `_curriculumVersion` (usado com `...` no `serializeState`);
  - `curriculumLoadPrepare(data)`: `applyStudyKeyChanges`, `renameStudyIdsInRecords`, `applyUnitModuleMerges`, grava `STATE.retiredStudyCards`;
  - `curriculumLoadReconcileUnits()`: `reconcileUnitLessonIdx` + `openUnitsBeforeOpenOnes(trailGroups(), ...)`;
  - `curriculumLoadStampReleased()`: marca `released` pelo portão (`isCardLessonCompleted`).
  As funções puras continuam em `shared/study-trail-model.js`. Funciona sem `MODULES` e sem `curriculum-changes.js`.
  `fr/app.js` e `zh/app.js` (`serializeState` e `applySerializedState`) chamam as mesmas funções; o zh ganhou
  `STATE.retiredStudyCards`.

## O que muda para quem estuda zh (invisível)

- O save passa a ter `_curriculumVersion`, `retiredStudyCards` e `lessonId` da unidade começada.
- Cartão da trilha já liberado pelo portão ganha a marca `released` no 1º carregamento (igual ao fr desde a Etapa 0a).
- Entrada de cartão da trilha no save que não existe mais no conteúdo (órfão) vai para o arquivo com o progresso; antes era
  ignorada e se perdia no save seguinte.
- Unidade inserida antes de onde a aluna está nasce aberta (2.10). Com o conteúdo de hoje nada muda (o teste do navegador
  confere que as unidades depois da atual continuam trancadas).

## Testes

Ver a seção "Números" abaixo. Testes antigos ajustados de propósito: `curriculo-ids/test_chaves.js` e `test_ids_publicados.js`
(todos os sites; simulação de item novo também no zh), `curriculo-ids/test_carregamento.js` (a seção "zh não muda" virou
"zh com a mesma regra": save antigo, órfão, released, ida e volta, fusão sem módulos), `curriculo-ids/test_unidade_nova.js`
(fr e zh chamam a função comum), `e4/test_progresso_ida_e_volta.js` (o zh também ganha `released`; +2 checagens da versão),
`fase-e/harness.js` (extrai as 4 funções novas). Novo: `curriculo-ids/test_save_antigo_browser.js` (navegador, fr e zh: save
antigo sem `_curriculumVersion` carrega em página nova, nada some, FSRS intacto, órfão no arquivo, salvar e recarregar igual).
