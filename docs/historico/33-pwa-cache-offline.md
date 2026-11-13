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

