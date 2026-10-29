# 31. Revisão do código compartilhado: correção dos achados graves (2026-10-24)

Relatório de origem: `docs/revisao-codigo-compartilhado-erros.md` (C1, A1, A2, A3; revisado na `main` `1559776e`).
Branch: `claude/friendly-hamilton-u4ssl2`, um commit por achado. Nada no banco nem em produção; sem PR.
O que a aluna vê em uso normal não muda (provas abaixo). Vale para todos os sites (código em `shared/`).

## O que mudou

| Achado | Correção | Arquivos |
|---|---|---|
| C1 (crítico) URL de imagem/áudio crua no HTML | Helper novo `safeMediaUrl(url)` / `flashcardImageHTML(url)`: aceita só `https:`, `http:`, `blob:`, `data:image/...`, `data:audio/...` e caminho do próprio site; recusa `javascript:`, `data:text/html`, `//outro-host`, caracteres de controle, `"`, `<`, `>` e crase; escapa para atributo. URL recusada = sem imagem/sem botão de áudio. | `shared/core/midia-segura.js` (novo, carregado logo depois de `shared/utils.js` em `fr/index.html` e `zh/index.html`), `shared/core/revisao-cartoes.js` (5 imagens), `shared/core/quase-iguais-pinyin.js` (Múltipla escolha), `shared/core/quase-iguais-simples.js` (`customAudioBtnHTML`) |
| A1 (alto) texto do cartão vira HTML | `escapeHTML` nas peças do Combinar, nas opções e no enunciado da Revisão rápida (fr e zh, com o pinyin) | `shared/core/exercicios-licao.js`, `shared/core/licao-base.js`, `fr/lang-hooks.js`, `zh/lang-hooks.js` |
| A2 (alto, progresso) busca que falha apagava o FSRS | As buscas aceitam `{ nullOnError: true }` (outros chamadores seguem recebendo `[]`); falha marca `CARD_FETCH_FAILED[origem]`; `applySerializedState` guarda as entradas salvas sem par dessa origem em `PRESERVED_SAVED_CARDS`; `serializeState` as regrava intactas; a próxima busca boa (mesma sessão, ex.: `refreshTeacherDeliveries`/importação de Deck público, ou próximo acesso) devolve o progresso aos cartões e esvazia a lista. Busca boa e vazia continua tirando cartão apagado. | `shared/teacher-flashcards.js`, `shared/own-flashcards.js`, `shared/core/estado-trilha-desafios.js`, `shared/core/estado-salvar.js`, `shared/study-trail-model.js` (`savedCardOrigin`, `unmatchedSavedCardsOfOrigins`, `serializeCardsForSave(cards, preserved)`) |
| A3 (alto) Revisão rápida dava nota depois de sair | `stopSpeedSession()` (cronômetro + passagem de 700 ms agendada + `active=false`) ao trocar de aba (`shared/tabs.js`), em Voltar aos modos (inclusive no caminho da aba Aluno > Revisão), ao abrir qualquer modo e ao começar sessão nova; a passagem fica em `SPEED_STATE.advanceHandle` presa a `SPEED_STATE.session`; `answerSpeedQuestion` e o fim do cronômetro não gravam com a sessão encerrada. | `shared/core/app-comum.js`, `shared/core/exercicios-licao.js`, `shared/core/quase-iguais-textos.js`, `shared/core/quase-iguais-simples.js`, `shared/core/revisao-decks.js`, `shared/tabs.js` |

Na tela, enquanto a busca de cartões falha (A2), eles continuam fora da sessão, como antes; só o save deixou de perdê-los.

## Provas (`tests/revisao-seguranca/`, `sh tests/revisao-seguranca/run.sh`)

Cada teste carrega os arquivos de produção no Chromium com o Supabase de mentira; `REPO_ROOT=<worktree>` roda contra
outra árvore. Na `origin/main` (`1559776e`) x nesta branch:

| Teste | origin/main | branch |
|---|---|---|
| `test_c1_unit.js` (regras do helper, Node) | (não existe) | 32/32 |
| `test_c1_midia.js` (fr e zh: Normal, Múltipla escolha, Digitar, botão de áudio, URL legítima igual) | 8/16 (`onerror` roda: `pwned=105`) | 16/16 |
| `test_a1_texto.js` (fr e zh: Combinar, Revisão rápida, 1140/1260 textos reais da trilha com o mesmo texto exibido) | 4/14 (5 execuções no Combinar, 1 na Revisão rápida) | 14/14 |
| `test_a2_progresso.js` (fr e zh: falha, recuperação na mesma sessão, busca vazia, só uma origem falhando) | 8/18 (save sai sem `t77`/`s88`) | 18/18 |
| `test_a3_revisao_rapida.js` (fr e zh: Voltar + aba, só aba, voltar para a Revisão; controle sem sair) | 14/26 (`s801` leva Errei depois de sair) | 26/26 |

Capturas antes x depois (fr e zh, claro, 1200px; Revisão com imagem e áudio, Combinar, Revisão rápida): HTML da sessão
idêntico nas 6 telas (fora a porta do servidor de teste); pixels iguais no Combinar e na Revisão rápida do zh, diferenças
de 44 a 1097 px (de 1.080.000) só na faixa do botão de áudio/transição, com o mesmo HTML. Ficaram no scratchpad da sessão
(`scratchpad/correcoes/antes|depois`).

## Regressão (branch x origin/main, números reais)

- Iguais nas duas árvores, todos passando: `tests/paridade-sites/test_quase_iguais.js` (fr pt-BR 1004/1004, fr en 382/382,
  zh pt-BR 1007/1007, zh en 363/363 cenas iguais; 1392 e 1376 verificações), `test_atalhos` 92, `test_voz` 34,
  `test_licao_feedback` 43/43, `test_licao_feedback_playwright` 16/16, `test_gramatica_cenario` 46/46, `_zh_playwright` 54/54,
  `test_modulos_niveis` 90, `_zh_playwright` 95, `test_conjugacao` 343, `_motor` 45, `test_desafios` 2242, `_css` 25,
  `_motor` 49, `test_ditados` 828, `_motor` 41, `test_css_compartilhado` 5/5, `test_correcoes_5d` 4;
  `tests/e4/test_progresso_ida_e_volta.js` 26, `test_core_carregado` 53 (51 na main: conta o arquivo novo), `test_lote5c` 20,
  `test_lote5e` 10, `test_lote5d` 12 (depois de pôr o stub `flashcardImageHTML` no VM do teste, commit próprio);
  `tests/curriculo-ids/test_save_antigo_browser.js` 29, `test_carregamento` 125/125; `tests/banco-revisao/test_playwright.js`
  672/672, `test_banner_professora` 51/51, `test_merge_saved_cards` 10/10, `test_model` 63/63 e os demais unitários;
  `tests/deck-browser` 208; `tests/fase-public-deck/test_playwright.js` 152; `tests/fase-i` 48/48 e 67/67; `tests/modo-foco` 19/19;
  `tests/conjugacao` 80/80; `tests/janelas-revisao` 40; `tests/i18n/test_i18n_unit.js` 2343/2343; `tests/xp/test_trilha_xp.js` 19/19.
- Falhas pré-existentes (mesmas na origin/main): `tests/fase-h/test_playwright.js` 66/68 e `test_teacher_experience_unit.js`
  76/78 (H5/H10, texto das contagens da árvore do aluno), `tests/banco-revisao/test_agent_core.js` 48/49
  (`engine.generated.mjs` desatualizado; nenhum arquivo do motor foi tocado aqui), `tests/e4/test_lote5b_textos.js` 9/11
  (teste desatualizado com o plural de `review.match.attempts`), `tests/fase-public-deck/test_legacy_parity.js` (precisa de Postgres).

## Riscos e o que ficou de fora

- C1: URL legítima com `"`, `<`, `>` ou crase crus deixa de mostrar a mídia (o upload grava URL codificada; não deve existir).
  `http:` continua aceito porque links externos antigos podem usá-lo. A validação no banco (CHECK em `fields`, recusar URL de
  fora do bucket ao publicar Deck público) continua só proposta.
- A2: entradas guardadas não aparecem na sessão enquanto a busca falha (igual a antes); se a aluna nunca mais tiver uma busca
  boa, elas seguem regravadas sem mudança. Troca de conta/curso esvazia a lista no começo de `loadStateAndRender`.
- A3: trocar de aba agora encerra a Revisão rápida em todos os sites (antes a tela também sumia, mas a sessão seguia escondida).
- Ainda sem escape (baixo, fora do pedido): `badge.name`/`badge.desc` no aviso de conquista nova
  (`shared/core/estado-trilha-desafios.js`, `showBadgeUnlockCelebration`), que vêm do catálogo de badges (admin/professora).

---

# 31b. Erros médios (M1, M2, M3) e melhorias 1 a 4 (2026-10-26)

Aprovado pela dona: os 3 erros médios de `docs/revisao-codigo-compartilhado-erros.md` e as propostas 1 a 4 da seção 9 de
`docs/revisao-codigo-compartilhado-arquitetura.md`. Mesma branch, um commit por item. Banco/produção: só leitura (SELECT na
tabela `challenges` para o M3). Sem PR. Grátis x Premium: nada muda (infraestrutura e correções; vale para todos os sites).

## O que mudou

| Item | Mudança | Arquivos |
|---|---|---|
| M1 | Chave `k` congelada em cada hanzi (valor inicial = posição de hoje, `"0-c0"`): **nenhum id mudou**. Id do cartão = `"h" + k` (`hanziCardId`); `refreshHanziCardTexts` casa pelo id. `scripts/congelar_chaves.js` congela e dá a próxima chave livre ao hanzi novo (registro `hanzi` em `zh/scripts/item_keys_registry.json`); `scripts/ids_publicados.js` grava os 198 ids no livro-razão (campo `hanzi`) e barra sumiço fora de `HANZI_RETIRED_KEYS` (novo em `zh/curriculum-changes.js`; aposentar perde o progresso do hanzi, só com a autora). | `zh/hanzi-data.js`, `zh/app.js`, `zh/published_ids.json`, `zh/curriculum-changes.js`, `zh/scripts/item_keys_registry.json`, `scripts/congelar_chaves.js`, `scripts/ids_publicados.js` |
| M2 | Timers da 2ª tentativa da voz em `TTS.retryTimers`, presos a um token; `cancelStudyVoiceRetry()` chamado por `stopExerciseAudio()` (tocar outro áudio, trocar de cartão, sair da lição/Revisão) e por `switchTab`; sem nova tentativa se o botão saiu da tela. | `shared/core/voz.js`, `shared/core/exercicios-licao.js`, `shared/tabs.js` |
| M3 | Fora do pt-BR, desafio sem a tradução dos campos que a tela mostra em português (`CHALLENGE_SITE_LANG_FIELDS`: sentido da Expressão; referências e explicação do Ouça e traduza; explicação da Acentuação; tradução e explicação do Complete a frase) fica fora da lista, contagem, fila, revisão espaçada, Expressão do dia e linha "Desafios do Módulo", e não abre (a prévia da admin abre). Progresso salvo intacto. A lista espera o overlay (`CONTENT_I18N.load`, exposto em `shared/content-i18n.js`) e é repintada quando ele chega (`repaintChallengesForUiLanguage`). pt-BR: nada muda. `c.meaning.pt` sem `meaning` não derruba a tela. A contagem das conquistas (`challengesTotal`) continua contando todos os publicados (não mexi em progresso de conquista). | `shared/desafios.js`, `shared/desafios-telas.js`, `shared/content-i18n.js`, `fr/app.js` |
| Melhoria 1 | `shared/core/lang-hooks-contrato.js`: 81 ganchos (tipo, obrigatório sempre/por módulos/Teste de Nível/família, padrão neutro, descrição) + `defineLangHooks()` (aplica padrões neutros que faltarem, avisa no console o que falta ou sobra; não congela). fr e zh carregam o contrato antes de `lang-hooks.js` e declaram `LANG_HOOKS` por ele (com repasse quando o contrato não está carregado, para testes antigos). | `shared/core/lang-hooks-contrato.js`, `fr|zh/lang-hooks.js`, `fr|zh/index.html` |
| Melhoria 2 | Sem padrão em francês: `checkpoint-exam.js` não cai mais em `fr.checkpoint.exam.*` (sem chaves, enunciado neutro, só em teste Node) e `levelTestKey` não cai em `trail.levelTest.*` (sem chave: texto vazio + aviso no console). O fr declara `checkpointExam.keys` e `levelTestKeys` (as mesmas chaves de antes); o contrato cobra de site com módulos/Teste de Nível. `buildCheckpointQueue` só usa `checkpointExam` como item quando ele tem `word`/`phrase`. | `shared/checkpoint-exam.js`, `shared/core/modulos-niveis.js`, `fr/lang-hooks.js`, contrato |
| Melhoria 3 | Fields da trilha não CJK pelo registro: estudado = `fieldLang`, tradução = `LanguageRegistry.baseTranslationLangOf` (novo: 1º idioma de site do curso; pt-BR no fr, en no pt). `{nacionalidade}` no idioma estudado (fr, zh, pt). Voz sugerida pelo `locale` do registro (`localeOfFieldLang`, novo; conhece pt). | `shared/study-trail-model.js`, `shared/profile-placeholders.js`, `shared/flashcard-field-editor.js`, `languages/registry-api.js` (+ `registry.js` gerado) |
| Melhoria 4 | Service worker com `cache: 'no-cache'` (revalida; 304 sem corpo) no lugar de `no-store`; o pré-cache da instalação também revalida. `shared/pwa.js` não precisou mudar: o deploy troca o `__BUILD_ID__` do SW, o navegador instala o novo e o `pwa.js` oferece recarregar. | `fr/service-worker.js`, `zh/service-worker.js` |

## M3: Desafios publicados sem inglês na produção (SELECT de 2026-10-26)

228 publicados (121 Expressões, 48 Ouça e traduza, 53 Acentuação, 6 Complete a frase). Explicação e pergunta das Expressões
estão em francês (conferido), então não precisam de tradução. **16 sem a parte em inglês** (passam a não aparecer no site em
inglês até ganharem tradução em `docs/i18n/challenges-en.json`):
- Acentuação (explicação): `accent-a1-001`, `accent-a2-001`, `accent-b2-001`;
- Expressões (sentido): `expr-a1-001`, `expr-a1-002`, `expr-a1-003`, `expr-a2-001`, `expr-a2-002`, `expr-a2-003`, `expr-b2-001`, `expr-b2-002`, `expr-b2-003`;
- Ouça e traduza (referências): `lt-a1-001`, `lt-a2-001`, `lt-b1-001`, `lt-b2-001` (este também sem a explicação).
No overlay e não publicados: `lt-auto-001`, `accent-a1m4-001`, `expr-a1m4-001`, `accent-a1m5-001`.
Diferença repositório x produção notada: `lt-a1m3-002/005/006` têm explicação em português no lote do repositório
(`lote-a1-m3.json`) e explicação vazia na produção.

## Provas (números reais)

| Teste | origin/main (`62ba54c6`) | branch |
|---|---|---|
| `tests/curriculo-ids/test_hanzi_chaves.js` (novo; com `REPO_BASE`: mesmos 198 ids na mesma ordem e cartões iguais campo a campo; ida e volta; save antigo; hanzi novo + lição invertida segue o caractere, contra o controle pela posição que move o progresso) | não existe | 14/14 (15/15 com `REPO_BASE`) |
| `tests/revisao-seguranca/test_m2_voz_cancelar.js` (novo; fr e zh) | 6/16 | 16/16 |
| `tests/desafios-idioma-site/test_playwright.js` (novo; en e pt-BR) | 26/36 | 36/36 |
| `tests/paridade-sites/test_contrato_lang_hooks.js` (novo) | não existe | 29/29 |
| Capturas de módulos e níveis (`capturas_modulos_niveis.js`, antes x depois) | | 64/64 iguais (0 px) |
| Cartão do Teste de Nível + 72 perguntas das provas, fr pt-BR e en (antes x depois) | | idênticos |
| `tests/paridade-sites/test_idioma_registro.js` (novo; contra `5d9f480f`) | | 10/10: fr 570 e zh 420 cartões idênticos, 2040 combinações de placeholders iguais, voz igual; pt de mentira com Fields pt+en, "americana"/"italiano·a", voz pt-BR |
| `tests/pwa-cache/test_playwright.js` (novo; SW ligado, servidor com ETag e max-age=600) | 8/10: reabrir baixava 4773 KB (fr, 179 arquivos com 200) e 4020 KB (zh) | 10/10: 0 KB (180 e 163 arquivos com 304); arquivo alterado chega (200) e entra no cache; SW novo assume; offline abre |

Testes antigos ajustados de propósito: `tests/camada-curso/test_equivalence.js` (tira o `k` dos hanzi dos dois lados, como já
fazia com os itens da trilha); `tests/paridade-sites/test_desafios.js` + `desafios-harness.js` (a carga em inglês publica só
os desafios com tradução, para seguir comparando o resto com o fr de antes; o sumiço é provado no teste novo).

## Regressão (branch x origin/main)

Iguais nas duas árvores ou só na branch com os números novos: `test_quase_iguais` (fr pt-BR 1004/1004, fr en 382/382, zh
pt-BR 1007/1007, zh en 363/363; 1392 e 1376), `test_atalhos` 92, `test_voz` 34, `test_licao_feedback` 43/43 e `_playwright`
16/16, `test_gramatica_cenario` 46/46 e `_zh_playwright` 54/54, `test_modulos_niveis` 90 e `_zh_playwright` 95,
`test_ditados` 828, `test_desafios_motor` 49, `test_ditados_motor` 41, `test_conjugacao_motor` 45, `test_css_compartilhado` 5/5,
`test_correcoes_5d` 4; `tests/revisao-seguranca/run.sh` (32, 16, 14, 18, 26, 16); `tests/curriculo-ids` (chaves 38, livro-razão
24, carregamento 125, unidade nova 39, cron 29, deck excluído 9, navegador 10 e 23, save antigo 29); `tests/e4` (ida e volta 26,
core 55 (53 na main: os arquivos novos), 5c 20, 5d 12, 5e 10); `tests/i18n/test_i18n_unit.js` 2343/2343, `test_sem_portugues_en`
6/6, `test_content_zh_en` 16; `tests/desafios-album` 66, `-cloze` 38, `-conclusao` 19, `-modulo` 75; `tests/ditado` 58;
`tests/modo-foco` 19; `tests/checkpoint-zh` 25; `tests/perfil-privado` 16, `tests/perfil-faltando` 7; `tests/placeholders` 70 e 45;
`tests/cores-marca` 20, 6, 26; `tests/banco-revisao/test_playwright.js` 672/672, banner 51/51 e os unitários (18, 40, 5, 11, 10,
63, 18); `tests/camada-curso` 75; `tests/trilha/test_checkpoint_exam.js` 43; `tests/familia-latina` 60, paridade 1483871, navegador 23;
`tests/fase-f` 68 e 50, `tests/fase-g` 134; `tests/curso-progresso/test_hanzi_restore.js` 9.

Falhas pré-existentes (mesmas na origin/main): `test_desafios.js` 2 cenas "premium" (link do botão Premium mudou para
contato@; 2238/2240), `test_conjugacao.js` 342/343 (mesma cena da janela Premium), `tests/conjugacao/test_playwright.js` 79/80
(e-mail contato@), `test_desafios_css.js` 21/25 (`.gcal-review-bar` nova), `tests/desafios-progresso` 22/23 ("barra existe"),
`tests/banco-revisao/test_agent_core.js` 48/49, `tests/e4/test_lote5b_textos.js` 9/11, `tests/registro/test_registry.js` 88/89,
`tests/i18n/test_card_variants_browser.js` 14/16.

## Riscos e o que ficou de fora

- M1: `lessonIndex` e `hanziLessonProgress` continuam pela posição da lição (mudar hanzi de lição muda a lição dele, não o
  progresso do cartão). Hanzi aposentado perde o progresso (não há arquivo para hanzi).
- M3: no site em inglês, 16 desafios somem até ganharem tradução; a lista fica vazia por um instante se o overlay ainda não
  chegou (a tela de categorias espera; a lista aberta direto é repintada quando ele chega). Ditados não entraram neste item.
- Melhoria 1: chaves com prefixo de outro site (`fr` usa `zh.hint.fullsentence`; `zh` usa `fr.hint.reorderTranslate`) não são
  barradas (proposta 6, chaves neutras). `defineLangHooks` só avisa no console; quem barra é o teste.
- Melhoria 3: no site em inglês do fr/zh o Field de tradução continua com `lang:'pt-BR'` (como antes; só o pt passa a ter `en`).
  `speakableProfileText` lê só as formas neutras do francês (o pt vai precisar do seu `ttsText`).
- Melhoria 4: com o GitHub Pages, cada abertura ainda faz ~180 pedidos (respostas 304 pequenas); o próximo ganho é o
  carregamento sob demanda (proposta 10).

## Passos manuais

Nenhum (nada de banco, secret ou deploy). Publicar só quando a dona pedir o PR. Para os 16 desafios voltarem ao site em
inglês: traduzir em `docs/i18n/challenges-en.json`, `node scripts/build-challenges-overlay.js en` e `node scripts/validate-challenges-en.js`.
