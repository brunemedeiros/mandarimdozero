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
