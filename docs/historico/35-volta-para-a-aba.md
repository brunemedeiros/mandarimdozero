# 35. Volta para a aba: o site refaz o login inteiro e a lição recomeça (auditoria, 2026-11-14)

Pedido da autora (2026-11-14): investigar a releitura do progresso a cada volta para o site, achada em
`docs/historico/33-pwa-cache-offline.md` (seção "Internet caindo com o site já aberto"). A autora escolheu a opção A (seção final).

## O que acontece

1. **A biblioteca do Supabase avisa "entrou" a cada volta.** No supabase-js (CDN `@supabase/supabase-js@2`, hoje 2.119.0),
   `visibilitychange` para `visible` chama `_onVisibilityChanged` → `_recoverAndRefresh`, que, com a sessão válida e longe de
   vencer, faz `_notifyAllSubscribers('SIGNED_IN')`. Conferido com a biblioteca de verdade num navegador: 2 voltas para a aba =
   2 avisos `SIGNED_IN` a mais (`aoAbrir: SIGNED_IN, INITIAL_SESSION`; depois `SIGNED_IN` a cada volta). Perto de vencer, ela
   renova o token e manda `TOKEN_REFRESHED` (não `SIGNED_IN`).
2. **O site trata cada aviso como um login novo.** `shared/auth.js`, `onAuthStateChange`: todo `SIGNED_IN` chama
   `onUserLoggedIn(user)`, sem conferir se é a mesma conta já carregada. Ele:
   - zera `progressLoadedOk` e roda `loadStateAndRender()`: relê cartões da professora, cartões próprios e o progresso, aplica por
     cima do `STATE` e redesenha trilha, topo e lembretes;
   - refaz Admin Mode, papéis, perfil, contadores de avisos e de amigos, preferências, idioma da conta;
   - repete os passos "depois do login": `applyInitialRoute()` (redesenha a tela do endereço), convites, Mural, recomeço do curso.
3. **No meio de uma lição, a lição recomeça.** Durante a lição o endereço é `#/unit/<id>`; `applyInitialRoute()` → `renderRoute`
   → `openUnitDetail(id)`, que zera o andamento (`STEP_STATE.acq`). Na sessão de Revisão o endereço é `#/review/<modo>` e a rota
   chama `openReviewSession(modo)` de novo (pelo código, a sessão é montada de novo; não medido: conta de teste sem cartões para hoje).

## Medido no navegador (stub do Supabase que guarda o que é salvo; hoje em `tests/volta-aba/test_playwright.js`)

| | fr | zh |
|:-|:-|:-|
| Lição: antes de voltar à aba | 3º passo, "Bonjour ou Bonsoir?" (`introIdx` 2) | 3º passo, "再见 no dia a dia costuma virar 拜拜" (`introIdx` 2) |
| Lição: depois de voltar à aba | 1º passo, "bonjour / olá, bom dia" (`introIdx` 0) | 1º passo, "你好 / olá" (`introIdx` 0) |
| Chamadas ao servidor por volta | ~12 RPCs + ~10 leituras de tabela, 2 leituras do progresso | ~10 RPCs + ~10 leituras, 2 do progresso |
| Trilha aberta | tela igual, mesmas chamadas | tela igual, mesmas chamadas |
| Erros de página | 0 | 0 |

Nada se perde do que já foi salvo, mas a aluna refaz a lição desde o começo toda vez que troca de app e volta (WhatsApp,
notificação, tela bloqueada). Acontece hoje no site no ar, para toda conta logada, nos dois sites.

## Proteção que já existe

`saveState()` lê o servidor antes de gravar e recusa gravar se um campo vitalício (`MONOTONIC_PROGRESS_FIELDS`, ex.: XP) ficou
menor que o já salvo (sessão desatualizada, outro aparelho estudou): avisa ("staleLocal") e relê o progresso sozinha. É isso que
protege duas abas/aparelhos abertos, não a releitura a cada volta.

## Proposta (aguarda a autora)

- **A (recomendada):** em `SIGNED_IN` da MESMA conta já carregada (`CURRENT_USER.id === session.user.id` e `progressLoadedOk`),
  só atualizar os dados do login (`CURRENT_USER = session.user`) e não refazer nada: tela, lição e Revisão ficam como estão.
  Conta diferente (troca de conta na mesma aba) e primeiro login continuam com o fluxo inteiro. Se o progresso ainda não foi
  confirmado (`progressLoadedOk` falso, ex.: depois de ficar sem internet), relê o progresso sem reaplicar a rota.
  Risco: uma aba antiga deixa de se atualizar sozinha ao voltar; coberto pelo guarda do `saveState()` (recusa e relê).
- **B:** mesma conta → relê o progresso em silêncio, sem rota e sem repetir avisos. A lição não recomeça, mas o `STATE` é trocado
  por baixo durante a atividade (pequena chance de corrida com um salvamento) e as ~20 chamadas por volta continuam.
- Vale para todos os sites (código em `shared/auth.js`). Teste a acrescentar: lição e Revisão não recomeçam ao voltar à aba;
  troca de conta na mesma aba continua recarregando tudo; aba antiga com outro aparelho mais adiantado é corrigida ao salvar.

## Implementado: opção A (decisão da autora, 2026-11-14, "faça a A, mas me mostre antes de juntar")

`shared/auth.js`: no `onAuthStateChange`, `SIGNED_IN` da mesma conta já aberta (`isSameLoadedAccount`) chama
`onSameAccountSignedInAgain`: só atualiza `CURRENT_USER` e o nome no topo; se `progressLoadedOk` for falso, relê o progresso com
`loadStateAndRender()` (uma leitura por vez), sem `applyInitialRoute`. Conta diferente e primeiro login seguem pelo `onUserLoggedIn`.

Teste `tests/volta-aba/test_playwright.js` (substitui a auditoria): **24/24** em fr e zh (trilha sem releitura nem rota; lição no meio
fica no mesmo passo depois de 2 voltas; Revisão não reabre; progresso não confirmado relê sem rota; troca de conta recarrega tudo;
outro aparelho mais adiantado: o salvar recusa e relê; 0 erro). Na versão antes do conserto: 12/24 (os 6 itens de cada site sobre
releitura, rota, lição e Revisão falham; a Revisão também reabria a sessão, agora medido). Regressão: `revisao-seguranca/test_a2_progresso`
18/18, `janelas-topo` 276/276, `xp-semana` 242/242, `amigos` 210, `amigos-push` 72, `conquistas` 66, `conta-excluir` 20/20, `k2d` 30/30,
`fase-e` 38/38, `zh-manual` 27, `pwa-cache/test_aviso_sem_internet` 24/24, `paridade-sites/test_quase_iguais` 2770. Imagens "hoje x
conserto" mostradas à autora antes de juntar.

