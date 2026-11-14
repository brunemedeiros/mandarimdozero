# 33. PWA: teste do cache, sem internet depois de publicar e recarregar sem misturar versões (2026-11-11)

Publicado pelo PR #466 (merge `7c28e9d`, 2026-11-11), autorizado pela autora. Vale para fr e zh (mudança igual nos dois
`service-worker.js`) e para o futuro pt (regra em `.claude/rules/frontend-fr-zh.md`). Nada no banco. Tudo grátis.
Continuação da melhoria 4 (`docs/historico/31-revisao-codigo-compartilhado.md`; `docs/revisao-codigo-compartilhado-arquitetura.md` seção 8).

## Ponto de partida

`node tests/pwa-cache/test_playwright.js` falhava 4/10 na `main` (`64d408b`): "abrir de novo revalida" (tudo voltava 200,
~5 MB no fr e ~4,3 MB no zh) e "sem internet, abre do cache". Falhava igual no commit `21fd055`, onde o teste nasceu: o site
não tinha mudado (não houve `git bisect` a fazer).

## Causa no teste (Playwright 1.63)

- `context.route()` desliga o cache HTTP (está na documentação do Playwright) e agora vale também para o service worker:
  o SW deixava de mandar `If-None-Match`. Troca: internet de fora bloqueada pelo Chromium (`--host-resolver-rules`), sem `route()`.
- `page.reload()` na mesma aba reaproveita o cache em memória do Chromium e nem passa pelo SW. Troca: "abrir de novo" = aba nova.
- `setOffline` agora derruba também a rede do SW: o item "sem internet" passou a testar de verdade (antes passava sem testar).

Resultado: abrir de novo = fr 233/233 arquivos com 304, zh 204/204, 0 KB de corpo. As alunas não baixam o site a cada abertura.

## Defeitos do site achados e consertados (todos antigos, não regressão)

1. **Sem internet logo depois de uma publicação, o app não abria**: o cache novo tinha só os ~18 arquivos da lista fixa e o
   `activate` apagava o antigo; os scripts vinham como a página (erro "Unexpected token '<'"). Agora a instalação busca de novo
   (`no-cache`, 304 quando não mudou) tudo o que a versão anterior guardava (241 arquivos no fr, 212 no zh); falha pula o arquivo.
2. **Recarregar a aba (puxar para baixo, F5) logo depois de uma publicação misturava versões**: `index.html` novo com
   `content.js`/`shared/*.js` antigos, guardados na memória da aba por até 10 minutos (`max-age=600` do GitHub Pages), até o aviso
   "Atualizar" aparecer. O botão "Atualizar" já funcionava (conferido). Agora o SW entrega à página uma cópia com
   `Cache-Control: no-cache` (`paraAPagina`; só respostas 200, o áudio em pedaços, 206, passa como veio), sem custo de internet.
3. **fr e zh apagavam o cache um do outro** (mesmo endereço, `app.profbrune.com.br`): cada SW só apaga caches com o próprio `CACHE_PREFIX`.

Junção com o PR #465 (aviso "Nova versão disponível" só com código antigo, de outra conversa): conflito nos dois
`service-worker.js` resolvido mantendo `BUILD_ID` e `CACHE_PREFIX`. O PR #465 supõe que quem recarrega depois de publicar já
recebe os arquivos novos; o conserto 2 é o que garante isso no recarregar manual.

## Testes

- `tests/pwa-cache/test_playwright.js`: 13/13 (itens novos: sem internet logo depois de publicar; recarregar sem misturar; convivência fr e zh).
  Contra a `main` antes do PR: 8 de 11 (acusa 1 e 3); contra o 1º commit do PR, sem o conserto 2: 11/13.
- `tests/pwa-cache/test_aviso_versao_playwright.js` (PR #465): 14/14 depois da junção.
- Áudio (mp3) tocando pelo SW: ok. Os outros testes de navegador usam `serviceWorkers: 'block'`.

## Conferido no ar (2026-11-11, navegador real, como visitante, `app.profbrune.com.br`)

| | fr | zh |
|:-|:-|:-|
| Versão do SW | `7c28e9d` | `7c28e9d` |
| Arquivos pelo SW ao abrir de novo | 231/231 | 202/202 |
| `Cache-Control` que a página recebe | `no-cache` | `no-cache` |
| Abre sem internet, sem erro de script | sim | sim |
| Arquivos no cache | 241 | 211 |
| Cache do fr continua depois de abrir o zh | | sim |
| Aviso "Atualizar" à toa | não | não |

Sem internet, só a caixa do Ranking fica em "Preparando tudo..." (precisa do Supabase), o esperado.

Não conferido no ar: o momento logo depois de uma publicação (exige outra publicação; coberto pelo teste) e celular de verdade.

## Depois da conferência: logada sem internet e a decisão "só com internet" (2026-11-11)

Teste da autora no celular (modo avião, logada): app aberto pela metade, trilha vazia. Reproduzido no ar com sessão simulada:
- **Transição de versão (uma vez só):** o celular trocou para a versão nova logo depois da publicação e a versão antiga só tinha 18
  arquivos para passar adiante; sem internet, `shared/*` vinha como página. Some depois de uma abertura com internet.
- **Logada, ~40 s de espera:** a biblioteca do Supabase (`@supabase/supabase-js@2` pelo CDN, hoje 2.119.0, versão que muda sozinha)
  repete cada leitura que falha 4 vezes (esperas de 1, 2 e 4 s), e o app soma as próprias repetições (`loadState`, 3 tentativas).
- **Depois da espera:** "0 de 92 lições" com o aviso "ainda confirmando seu progresso". Não há cópia local do progresso;
  `progressLoadedOk` impede salvar, então nada se perde, mas estudar sem internet não conta.

Decisão da autora: **por enquanto o site só funciona com internet**. Sem internet, a abertura mostra a tela comum
`shared/offline.html` ("Você está sem internet. Conecte-se para usar o site.", botão "Tentar de novo"; em inglês no site em
inglês; cor de cada site, claro e escuro), que volta sozinha para o app no evento `online`. O SW guarda a tela na instalação
(`OFFLINE_URL`) e, para arquivo sem cópia, devolve erro de rede em vez da página. Mantidos: revalidação (304), cópia na
instalação, `paraAPagina` e `CACHE_PREFIX`.

Testes: `tests/pwa-cache/test_playwright.js` 21/21 (8 itens novos de fr e zh: tela em pt-BR e en, "Tentar de novo", erro de rede, volta
sozinho); contra a `main` sem a tela, 13/21. `test_aviso_versao_playwright.js` 14/14; `tests/cores-marca/` 96/96 (36+8+20+6+26);
`tests/paridade-sites/test_css_compartilhado.js` 5/5. Capturas fr e zh, claro e escuro, 390 px e 1280 px: botão `--brand-fill` com
branco, 48 px de altura, sem rolagem lateral, 0 erro de página.

Adiados pela autora (registrados no "Estado atual" do `CLAUDE.md`): aviso/estudo sem internet para quem está logada e fixar a versão da
biblioteca do Supabase (caminho com menos risco: CDN com versão fixa e guardada pelo SW, sem mexer nos 127 testes que interceptam o CDN).

### Publicado e conferido no ar (2026-11-11)

Publicado pelo PR #468 (merge `7fcc38e`, a pedido da autora), junto com a `main` do PR #458 (faixa do modo convidado, sem
conflito; teste do cache 21/21 depois da junção). Conferido em `app.profbrune.com.br` com navegador de verdade:

| | fr | zh |
|:-|:-|:-|
| Versão do SW | `7fcc38e` | `7fcc38e` |
| Logada (sessão simulada), modo avião: tela "Sem internet" | em 0,1 s | em 0,1 s |
| Erros de página | 0 | 0 |
| Internet volta: volta sozinha para o app | sim | sim |

Idioma da tela: segue o idioma guardado pelo site (navegador em pt-BR: "Você está sem internet"; navegador em inglês, site em
inglês: "You're offline"). Na primeira visita a fonte Nunito pode ainda não estar guardada e a tela usa a fonte do aparelho
(só aparência). Não conferido no ar: celular de verdade (teste da autora pendente).

## Internet caindo com o site já aberto: aviso por cima (2026-11-13)

Teste da autora no celular: abriu com internet, ligou o modo avião no meio de uma lição. O site continuou (áudio "Não foi possível
reproduzir", aviso "Ainda confirmando seu progresso salvo", cartão sem a palavra); só ao fechar e abrir apareceu a tela "Sem internet".
- **Por que "Ainda confirmando":** o supabase-js avisa `SIGNED_IN` toda vez que a aba volta a ficar visível (`_onVisibilityChanged` →
  `_recoverAndRefresh`; puxar a cortina para ligar o modo avião conta), e `onAuthStateChange` chama `onUserLoggedIn` de novo, que zera
  `progressLoadedOk` e relê o progresso. Sem internet a releitura falha e o app fica sem poder salvar até recarregar (nada se perde).

Decisão da autora (entre "aviso por cima" e "ir para a tela e recarregar", depois de comparar o esforço): **aviso por cima**.
`shared/sem-internet.js` + `shared/sem-internet.css`, ligados no `fr/index.html` e no `zh/index.html`:
- evento `offline`: caixa "Você está sem internet" / "Assim que a internet voltar, você continua de onde parou." (en: "You're offline" /
  "As soon as you're back online, you'll pick up right where you left off.", chaves `ui.offline.title`/`ui.offline.body`), com o logo do
  site; tudo o que está no `body` fica `inert` e as teclas não passam; áudio e voz param;
- evento `online`: a caixa some, nada é recarregado (a lição continua do mesmo exercício) e, se `progressLoadedOk` ficou falso, chama
  `loadStateAndRender()` (o mesmo do login);
- o aviso é montado escondido na abertura, para o logo já estar baixado quando a internet cair;
- só tokens que todo site define (`--paper`, `--paper-warm`, `--paper-line`, `--ink`, `--ink-soft`), sem cor nova.

Testes: `tests/pwa-cache/test_aviso_sem_internet_playwright.js` 24/24 (fr e zh: aviso na hora em pt-BR e en, site inerte, teclas
bloqueadas, logo, some sozinho sem recarregar, relê o progresso, 0 erro); contra a `main` sem o aviso, 12/22 (versão sem o item do logo).
Regressão: `tests/pwa-cache/test_playwright.js` 21/21; `test_aviso_versao_playwright.js` 14/14; `tests/i18n/test_i18n_unit.js` 2338/2338
(chaves novas na lista `NEW_KEYS`); `tests/paridade-sites/` todos verdes (quase iguais 2770, Desafios 2333, Ditados 828, Conjugação 343...);
`tests/cores-marca/` 96/96; `tests/janelas-topo/` 276/276; `tests/teclado-revisao/` 82/82 (rodando sozinho; em lote com 6 testes ao mesmo
tempo deu 8 falhas de tempo, iguais com e sem a mudança). Capturas fr e zh, claro e escuro, 390 px, e en: conferidas.

Achado fora do escopo (sugerido como tarefa separada): `onUserLoggedIn` roda de novo a cada volta para a aba, também COM internet (relê o
progresso e redesenha a trilha); pode atrapalhar uma lição em andamento e merece uma checagem "mesma conta, já carregada".

Ajuste no mesmo PR (2026-11-14): a tela `shared/offline.html` tenta de novo a cada 5 s enquanto o aparelho disser que tem internet
(`navigator.onLine`). Antes, se o evento `online` chegasse com a rede ainda subindo, a tela recarregava, caía de novo nela e não
voltava mais sozinha (não vem outro `online`). Visto como falha intermitente de "a internet volta e a tela volta sozinha" no
`tests/pwa-cache/test_playwright.js` (1 em 5 rodadas); depois do ajuste, 3/3 com 21/21.

## O aviso por cima não aparecia no celular da autora (2026-11-14)

Teste da autora no celular, com a versão do PR #476 no ar: a volta para o site funcionou, mas ao ligar o modo avião com o site
aberto o aviso NÃO apareceu (ela entrou na lição; o áudio não tocava); só ao recarregar apareceu a tela "Sem internet". Ou seja:
o aparelho não disparou o evento `offline` para a página. O aviso dependia só desse evento.

Conserto em `shared/sem-internet.js` (o site percebe sozinho): um "toque" no servidor (`HEAD ./manifest.json`, `cache: 'no-store'`;
o service worker não mexe em HEAD, então vai direto à rede; qualquer resposta = tem internet) decide se mostra ou esconde.
Confere quando: um pedido do site falha por rede (`window.fetch` embrulhado; este arquivo carrega antes do `supabase-client.js`,
então pega também o Supabase), um áudio não toca (`HTMLMediaElement.prototype.play`), a aba volta a aparecer, e a cada 20 s com a aba
visível. Com o aviso aberto, confere a cada 4 s e esconde quando a rede responde, mesmo sem o evento `online`.

Teste `tests/pwa-cache/test_aviso_sem_internet_playwright.js`: 48/48 (itens novos: rede bloqueada SEM evento, com `navigator.onLine`
verdadeiro, percebida pelo áudio, por um pedido e pelo batimento; some sozinho sem o evento `online`; sem alarme falso com rede). Na
versão de antes: 42/48, os 6 "o aviso aparece" falham (o que a autora viu).

Publicado pelo PR #478 (merge `24eaa64`, 2026-11-14, a pedido da autora). Conferido no ar (`app.profbrune.com.br`, navegador de verdade,
rede bloqueada SEM o evento `offline`, `navigator.onLine` verdadeiro), fr e zh: sem alarme falso em 30 s com internet; pelo áudio que
não toca, o aviso aparece em 0,2 s; só pelo batimento, em ~9 s; a rede volta e ele some em ~4 s sem o evento `online`, mesma página,
0 erro. Falta repetir o teste no celular da autora.

