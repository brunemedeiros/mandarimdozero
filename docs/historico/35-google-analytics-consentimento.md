# Histórico: Google Analytics 4 com consentimento

## Decisão (dona do projeto, 2026-11-13 e 2026-11-14)

Substitui a decisão antiga de fazer o site "sem telemetria de terceiros" (comentário em `shared/analytics.js` e texto
`admin.analytics.dev.osNote` em `shared/i18n/pt-BR.js` e `en.js`). Esses dois textos só mudam na Fase 3 (instalação);
até lá o código ainda diz "sem telemetria de terceiros".

- **Ferramenta**: Google Analytics 4, para saber quantas pessoas visitam o site e de onde vêm (links com UTM, ex.:
  `?utm_source=instagram&utm_medium=bio`). A dona aceitou que o GA4 vai subcontar, porque parte das pessoas recusa o banner.
- **Onde**: só em `app.profbrune.com.br`, nas páginas abertas (início, sobre, ajuda, testes de nivelamento, contrato,
  páginas de privacidade, tela de entrar) **e dentro do app** (fr, zh e o futuro pt). Os testes e o contrato são molduras
  do Apps Script: o GA4 mede a moldura, não o formulário. `profbrune.com.br` e `agenda.profbrune.com.br` ficam de fora por enquanto.
- **Consentimento: modo BÁSICO, confirmado pela dona em 2026-11-15** depois do alerta abaixo (rever quando o site crescer).
  Histórico da escolha: em 2026-11-14 ficou o básico (o código do Google só é baixado depois do "Aceitar";
  sem aceite, nada vai para o Google). Em 2026-11-15 a dona pediu o avançado ("quero estimativas melhores"). Alerta dado a
  ela: a estimativa do Google só liga com pelo menos 1.000 usuários por dia que aceitaram (em 7 dos últimos 28 dias) e
  1.000 eventos por dia de quem recusou (por 7 dias); o app logado teve média de 2 usuários por dia (máximo 7) nos 28 dias
  até 2026-11-15 (`usage_events`, produção). Sem atingir esse volume, o avançado manda ao Google dados de quem recusou sem
  dar estimativa nenhuma. Até ela confirmar, vale o básico. Nos dois modos: "Aceitar" e "Recusar" com o mesmo destaque,
  escolha guardada e link "Preferências de cookies" no rodapé.
- **Política**: opção B. Uma "Política de cookies" curta e separada, em pt-BR e en, publicada junto com o GA4. A mesma
  seção entra no rascunho da política geral (aba Privacidade do Admin e `ajuda/textos/politica.html`), que segue só em
  pt-BR até o advogado fechar; quando fechar, as duas se juntam.
- **Sem dados pessoais no Google**: nada de nome, e-mail ou id. Limpar o endereço antes de enviar (`?convite=`,
  `#access_token=`, `#error=` e outros parâmetros que não sejam UTM). Não medir o Painel de Admin nem a atividade da dona.
  Nas páginas abertas ela não está logada: prever um "Não contar este aparelho".
- **Links `?origem=` dos testes**: continuam como estão (a planilha do Apps Script depende deles). A moldura repassa todos
  os parâmetros, então os `utm_` também chegam à planilha. Pendência futura: migrar os `?origem=` para UTM.

## Respostas da dona em 2026-11-15 (Fase 0)

- Contrato (`/contrato/`) **fora** do GA4. Central de Ajuda (`/ajuda/`): **pendência**, ligar o GA4 quando ficar pública.
- Painel de Admin e Painel da Professora **fora** da medição.
- No app ela quer medir mais (telas e ações), mesmo repetindo o Analytics do Admin, para ter tudo num lugar só; se der,
  tudo de uma vez na Fase 3 (lista de telas e ações aguarda aprovação dela).
- Privacidade por padrão + caixinha de idade no cadastro (sugestões 1 e 2): ela pediu para aplicar e, depois de aplicado,
  registrar no documento do advogado que já existem. Antes, levantamento do que muda para quem já usa.
  Levantamento (2026-11-15): conflita com a decisão dela da migration `041_public_profile_default_true.sql` (perfil público
  por padrão, inclusive contas antigas). Hoje: perfil nasce público; toda conta com XP entra no Ranking Geral (sem opção de
  sair); Amigos com busca por nome, sugestões automáticas (`suggest_me`), pedidos (`accept_requests`), cutucar e missão em
  dupla automática, tudo ligado por padrão (`friend_settings`); cadastro sem caixinha de idade, e o Google pula o passo 3.
  Opções A (tudo protegido para todos), B (só contas novas, Ranking e Amigos desligados) e C (contas novas com perfil
  privado, Ranking e Amigos ligados) apresentadas a ela; aguarda escolha.

## Fase 0 aprovada (2026-11-15)

- Banner: **G3, uma linha só** ("Este site usa cookies para melhorar a sua experiência e medir as visitas. [Política de
  cookies]" [Recusar opcionais] [Aceitar todos]). A frase "Ao clicar em Aceitar, você concorda..." não é necessária: o
  clique já é o consentimento.
- Lista de medições do app (telas, ações e eventos-chave de `docs/ga4/fase0-levantamento.md`, seção 1): aprovada, vai
  toda na Fase 3.
- Privacidade por padrão: **opção C** (contas novas nascem com perfil privado; Ranking e Amigos continuam ligados; contas
  antigas não mudam) + caixinha de idade. Feita nesta conversa logo depois da Fase 0, como **Fase P**.
- Fase 6 (`/aulas/`): **moldura** com o formulário dentro, resposta marcada pelo `utm_source`, só o formulário de francês.
- Idiomas do banner e da política: pt-BR e en (o espanhol está congelado e fora do menu de idioma).

## Fase P (privacidade por padrão, opção C)

- 2026-11-15: migration `136_privacy_default_and_age_ack` (contas novas com `public_profile = false`; contas antigas não
  mudam; `profile_private.age_ack_at` + `ack_my_age()`) aplicada no **Staging** (versão `20261115211611`; conferido: padrão
  false, 4/4 perfis antigos continuam públicos, anon não executa). **Produção: aplicada em 2026-11-15 com autorização da dona**
  (versão `20261115213809`; hash dos 39 perfis `02439bc3a9c1c1d410595cb39786fe4f` igual antes e depois, 39/39 públicos).
- Cadastro, passo 2: caixinha obrigatória ("Tenho 18 anos ou mais, ou tenho autorização do meu responsável para usar o
  site." / "I'm 18 or older, or I have my parent or guardian's permission to use the site."); sem marcar, Google e e-mail
  ficam travados; a data é gravada depois do login (`afterAuthResolved`). Testes: `tests/privacidade-padrao/run.sh` 8/8,
  `tests/login-obrigatorio/test_entrada_idioma.js` 162/162, `test_playwright.js` 124/124, `tests/cores-marca/test_portao.js` 6/6.
- Contas que já existem (e conta nova criada pelo "Entrar com Google" da tela de Entrar, que não passa pelo passo 2): primeiro
  a opção A (faixa no topo do Estudo); depois a dona escolheu a **"A1 nova"** (2026-11-15): janela no estilo das janelas do
  topo (classes `tpop-*`), ao abrir o site, com a caixinha, "Agora não" (fecha nesta visita, volta na próxima; Esc também) e
  "Confirmar" (travado até marcar). `shared/age-ack.js` e `.css`, fr e zh; professora e admin dispensadas. Teste
  `tests/privacidade-padrao/test_janela_idade_playwright.js` 42/42.

## Estilo do banner de cookies (pedido da dona, 2026-11-15)

"Recusar opcionais" à esquerda e "Aceitar todos" à direita, no estilo da tela do próprio Google que ela mostrou: os dois botões
do mesmo tamanho e com borda; o texto de "Aceitar todos" na cor da marca (azul no fr, vermelho no zh) e o de "Recusar
opcionais" em cinza. Fundo cheio colorido só no "Aceitar" foi desaconselhado (empurra a pessoa a aceitar, contra a orientação
da ANPD e o pedido do prompt). Aguarda o "ok" dela.

GA4 (Fase 1): desmarcar "Alterações na página de acordo com os eventos do histórico de navegação" e deixar "Carregamentos de
página" (o site manda as telas do app sozinho; com isso ligado, as limpezas de endereço do site contariam visitas a mais).

## Escolhas de 2026-11-15 (terceira rodada)

- Banner de cookies: **B1 nova** (janela no estilo das do topo, título "Cookies", botões "Recusar opcionais" e "Aceitar
  todos" iguais). Pergunta dela: por que não tem "Personalizar/Preferências" como outros sites. Resposta: aqueles sites
  têm várias categorias opcionais (funcionais, desempenho, anúncios); o dela tem uma só (medição), então a tela de
  preferências repete a escolha do banner. Proposta enviada com prévia: link discreto "Preferências" no banner abrindo uma
  janela com "Necessários (sempre ativos)" e "Medição de visitas" (chave), que é a mesma janela do "Preferências de
  cookies" do rodapé, pedida no prompt. Aguarda o ok dela.
- GA4: anúncios desligados em todas as regiões (conferido por ela). Vinculações: conferir que não há nada vinculado.
  Filtros de dados: o GA4 já cria o filtro "Tráfego interno" em modo de teste, que não faz nada sem regras; deixar como está.

## Fase 3 (2026-11-16): aviso de cookies + GA4

- `shared/consent.js` + `shared/consent.css` (um só arquivo para todas as páginas e sites; `data-page="app"` no fr/zh,
  `"public"` no resto). Aviso "B1 nova" (G3, botões iguais, "Recusar opcionais" à esquerda, link "Política de cookies" e
  "Preferências"); janela de Preferências (Necessários sempre ativos + chave "Medição de visitas", desligada até aceitar).
  Escolha em `localStorage['cookie-consent']` (`{v:1, analytics, at}`; subir `STORE_VERSION` quando a política mudar de
  verdade). Links "Preferências de cookies" (`[data-consent-open]`): rodapé do Sobre e das páginas de privacidade, pé da
  entrada e Configurações > Geral > "Privacidade e cookies" (fr e zh).
- GA4 `G-CE3282C1FB` modo básico: o `gtag.js` só é pedido depois do aceite; `cookie_expires` 13 meses (34128000 s), sem
  Sinais do Google nem anúncios, sem `user_id`, `send_page_view:false` e `page_view` manual com endereço limpo (caminho +
  `utm_*`; convite, token, e-mail e `#...` nunca saem; referência sem parâmetros). UTM da chegada guardado na aba
  (`sessionStorage['consent-utm']`) até a escolha. Recusar depois de aceitar apaga `_ga`/`_ga_*` e liga `ga-disable`.
- App: só mede depois de `setContext` (chamado em `shared/auth.js` com o perfil carregado); professora/admin não são
  medidas e o aparelho fica marcado (`localStorage['ga-ignore-device']='1'`, vale também nas páginas abertas). Telas viram
  páginas virtuais (`/fr/<aba>`; abas com "admin"/"teacher" nunca), `lesson_start`/`lesson_complete` (tipo + curso),
  `course_restart`; tudo espelhado de `trackEvent` (`shared/analytics.js`). Entrada: `sign_up` (método + curso).
- Entrada sem Google Fonts (usa `shared/fonts/nunito.css`). "Sem telemetria de terceiros" atualizado em `shared/analytics.js`
  e em `admin.analytics.dev.osNote` (pt-BR e en).
- Navegador automático (`navigator.webdriver`) não vê o aviso sozinho (cobriria os botões dos outros testes); o teste do aviso
  liga com `window.__CONSENT_TEST__ = true`.
- Testes: `tests/consentimento/test_playwright.js` 57/57 (nada ao Google antes da escolha nem depois de recusar; aceitar pede
  o gtag com o ID; config; endereço limpo com utm; revogar apaga cookies; UTM guardado; en sem português; `?origem=` dos testes
  intacto; app fr e zh com telas, eventos, admin/professora fora; Configurações; posição acima do menu de baixo).
- Fora desta fase: Contrato e Central de Ajuda sem GA4 (decisão da dona); `/aulas/` é a Fase 6.
- Regressão (subagente `regressao`, 2026-11-16): tudo passando, exceto dois testes que precisavam registrar a mudança
  aprovada: `tests/paridade-sites/test_quase_iguais.js` (neutralização da caixa "Privacidade e cookies" das Configurações,
  agora 2770/2770) e `tests/i18n/test_i18n_unit.js` (chaves `consent.*` e `ageAck.*` na lista de textos novos, "Cookies"
  igual nos dois idiomas; 2338/2338). Política geral em rascunho (aba Privacidade do Admin, `ajuda/textos/politica.html` e
  documento do advogado): item novo "Medição de visitas" na seção 5 e Google Fonts retirado da lista de terceiros.

## Fase 4 (2026-11-16): publicação

- PR #483 (Fases 2 e 3, com o aviso C2) mesclado na `main` com autorização da dona. Conferido no ar com navegador
  automático (2026-11-16): aviso aparece; recusar não faz nenhum pedido ao Google; aceitar pede o `gtag.js` do
  `G-CE3282C1FB` e o `page_view` sai como `https://app.profbrune.com.br/?utm_source=teste&utm_medium=teste` (o `convite=`
  foi tirado); teste de nivelamento fr com aviso e `?origem=` chegando ao Apps Script; sem Google Fonts. O envio ao Google
  foi bloqueado na conferência para não criar visita falsa.
- Falta (com a dona): ver a visita no "Tempo real" do GA4 com o link de teste numa janela anônima (os aparelhos onde ela
  entra como admin ficam marcados para não contar) e marcar os eventos-chave (`sign_up`, cliques de saída e o evento
  criado para abertura dos testes de nivelamento).

## Correções da revisão diária (2026-11-24)

Dois achados da revisão diária, confirmados pela dona:
1. **Data do aceite de idade editável pela API** (a policy de update da 073 libera qualquer coluna de `profile_private`).
   Migration `144_protect_age_ack` (a 143 já era de outra conversa: `143_review_bank_typed_text`): trigger
   `profile_private_age_ack_guard` + função `_guard_age_ack()`. Pela API (authenticated/anon) ninguém grava, troca nem apaga
   `age_ack_at`, nem apaga a linha que já tem a data; o gênero continua editável. Só a `ack_my_age()` grava, uma vez;
   depois nem o servidor troca a data (exclusão de conta pelo servidor continua apagando a linha). Teste local
   `tests/privacidade-padrao/test_144.sql` 11/11 (e `test_136.sql` 8/8). **Staging: aplicada (versão `20261124160100`) e
   testada numa transação desfeita (4/4). Produção: aplicada com autorização da dona em 2026-11-24 (versão `20261124170904`);
   8 linhas e o hash das datas iguais antes e depois; trigger ligado; tentativa de troca como `authenticated` numa transação
   desfeita recusada com `age_ack_at_protected`.**
2. **Eventos do GA4 com o endereço completo** (só o `page_view` era limpo). `shared/consent.js`: `page_location` e
   `page_referrer` limpos já no `gtag('config')` e `gtag('set')` a cada página, então lição, cadastro, recomeço e cliques de
   saída também saem limpos; só mede em `app.profbrune.com.br` (fora dele, só o teste do aviso com `__CONSENT_TEST__`);
   nome de tela só vira página se existir `#view-<aba>` (antes `#segredo` no link virava `/fr/segredo`). `shared/auth.js`:
   `setContext` só com o perfil de fato carregado (sem perfil, nada medido; a admin pelo e-mail marca o aparelho).
   `tests/consentimento/test_playwright.js` 76/76. Conferido com o `gtag.js` de verdade (envio capturado e bloqueado):
   nossos eventos saem com `/fr/` limpo. **Ainda vaza** o `page_view` automático do próprio Google ao mudar o endereço
   (`dl` com `?cur=&view=&ui=`): vem da opção "Alterações na página de acordo com os eventos do histórico de navegação",
   que o `gtag.js` servido para o ID mostra LIGADA (`vtp_enableHistoryEvents:true`; também rolagem, formulários, vídeo e
   downloads ligados). Só dá para desligar no painel do GA4 (dona); depois, conferir de novo no `gtag.js`.
3. **Causa real do vazamento (2026-11-24, depois do PR)**: a dona conferiu o painel e as opções já estavam desligadas. O que
   manda as opções de verdade são as tags `__ccd_em_*` do `gtag.js` servido, e só existe a `__ccd_em_outbound_click`
   (Cliques de saída): o painel está certo; o `__ogt_auto_events` com tudo `true` é só o "ouvinte" genérico. Testes com o
   `gtag.js` real numa página mínima (envio capturado e bloqueado): **a tag do Google desta propriedade se configura sozinha
   ao carregar e ignora o `gtag('config')` da página inteiro**, até no snippet padrão do Google. Sem nenhum `config`, ela
   já mandava um `page_view` com o endereço completo; e com o `config` vinham cookie de 400 dias (não 13 meses), `npa=0`
   e o título errado. Saída: as mesmas regras num **`gtag('set', …)` ANTES do `gtag('js')`**: nenhum envio automático,
   endereço limpo, cookie de 395 dias e `npa=1`. O `config` continua, caso o Google volte a lê-lo.
   `tests/consentimento/test_playwright.js` 77/77 (nova conferência da ordem). Na `main` de 16/11 até a publicação, o 1º
   `page_view` de cada visita com aceite levou o endereço de chegada sem o trecho do `#` (a tag apaga e-mails do endereço,
   `__ccd_auto_redact`), e os cookies `_ga` foram gravados por 400 dias (o Google renova a validade a cada envio, então
   passam a 13 meses na próxima visita). Opcional: pedir ao Google a exclusão do `page_location` desse período
   (Administrador > Coleta e modificação de dados > Solicitações de exclusão de dados).
   Publicado pelo PR #510 (2026-11-24, ~14h10 de Brasília) e conferido no ar. A dona conferiu no painel que a "Coleta de
   dados fornecidos pelo usuário" está DESLIGADA (o `__ogt_1p_data_v2` do `gtag.js` fica parado). Período registrado no
   documento do advogado (aba Resumo, "Correção de 24/11/2026"), com 2 perguntas: avisar quem aceitou no período? pedir
   ao Google a exclusão dos endereços completos?
4. **Origem chegando (2026-11-24, depois do #510)**: em janela anônima nova (a anônima antiga ainda guardava o aceite, por
   isso o aviso não aparecia), a dona aceitou e o "Tempo real" mostrou 1 usuário com "Origem atribuída ao primeiro
   usuário" = `teste`. A cadeia UTM -> GA4 funciona de ponta a ponta. No menu dela (montado por "Objetivos de negócios"),
   a "Aquisição de tráfego" se acha pela barra de pesquisa do GA4.

## Conferência de 2026-11-24

- GA4 recebendo dados (print da dona, "Eventos recentes"): `first_visit`, `page_view`, `session_start`, `user_engagement`,
  `lesson_start`, `lesson_complete`. Ainda sem `sign_up` e `click`. Na produção: 1 conta nova desde a publicação (nasceu
  com perfil privado) e 6 confirmações de idade. `sign_up` conferido de ponta a ponta no teste (cadastro por e-mail com
  cookies aceitos; `tests/consentimento/test_playwright.js` 63/63): a ausência vem de não ter havido cadastro com aceite.
  Conta criada pelo "Entrar com Google" da tela de Entrar (sem passar pelo cadastro) passou a gerar `sign_up` (pedido da
  dona, 2026-11-24): `index.html`, ao escolher o curso, só se a conta foi criada há menos de 30 minutos (conta antiga sem
  curso não conta); método pelo `app_metadata.provider`. Teste 65/65.
- Dona criou o evento `abrir_teste_nivelamento` no GA4 (2026-11-24). Na "Aquisição de tráfego" ainda só "(direct) / (none)"
  (5 sessões); o envio do site foi conferido ao vivo (o pedido ao Google leva o endereço com os `utm_*`, `_fv=1`, `_ss=1`),
  então a falta do teste / teste deve ser atraso de processamento ou o período do relatório (o padrão "últimos 28 dias"
  não inclui o dia de hoje). Conferir de novo depois de 48 h.
- Na interface nova do GA4, "eventos-chave" viraram "Eventos principais" (estrela em Administrador > Exibição de dados >
  Eventos). `close_convert_lead`, `qualify_lead` e `purchase` foram criados pelo objetivo "Gerar leads" e nunca recebem dados.

## Ajustes pedidos depois da Fase 3 (2026-11-16)

- A dona achou o aviso grande. Prévias enviadas (tela real, celular e computador): **C1** sem o título "Cookies", ícone
  menor, faixa colorida (celular 208 px em vez de 255); **C2** sem faixa colorida (198 px); no computador as duas viram uma
  faixa larga e baixa (67 px em vez de 260). **Escolhida: C2** (2026-11-16), aplicada em `shared/consent.js`/`.css`;
  `tests/consentimento/test_playwright.js` 59/59 (inclui altura no celular e no computador). Fase 3 aprovada e publicação
  autorizada pela dona no mesmo dia.
- Documento do advogado: seção "Como o aviso de cookies e o Google Analytics funcionam (16/11/2026)" na aba Resumo, com a
  tabela do comportamento e 3 perguntas (UTM guardado na aba antes da escolha, medição própria fora do aviso, texto curto).

## Fase 2 (2026-11-16): política de cookies

- Página nova `privacidade-cookies.html` (pt-BR e en na mesma página, molde das outras de privacidade): o que fica no
  aparelho sem pedir, a medição com o GA4 (para quê, o que não é enviado, sem anúncios, 14 meses no Google), tabela dos
  cookies `_ga` e `_ga_CE3282C1FB` com **13 meses** (a Fase 3 tem de configurar o GA4 com essa duração, `cookie_expires`),
  Google LLC e dados fora do Brasil, outros serviços (formulários do Google nos testes e no contrato, jsDelivr, cdnjs,
  Supabase), a medição própria sem cookies, como aceitar/recusar/mudar (recusar depois de aceitar APAGA os cookies do GA4:
  a Fase 3 tem de fazer isso), direitos da LGPD e ANPD, contato. O formulário de aulas entra na página quando a Fase 6 sair.
- Links: rodapé do `sobre.html` e rodapé novo nas três páginas de privacidade. Teste `tests/privacidade-padrao/test_pagina_cookies.js` 32/32.
- Recomendação: publicar junto com a Fase 3, porque a página cita o aviso e o "Preferências de cookies", que só existem nela.
- A seção curta de cookies na política geral (aba Privacidade do Admin, `ajuda/textos/politica.html` e documento do
  advogado) entra depois que a dona aprovar o texto desta página.

## Fase P publicada (2026-11-16)

- PR #481 mesclado na `main` com autorização da dona (2026-11-16) e conferido no ar (o cadastro tem a caixinha e
  `shared/age-ack.js` publicado). Regressão: todas as áreas vizinhas passando; o teste das janelas do topo
  (`tests/janelas-topo/test_playwright.js`) passou a marcar "Agora não" na janela de idade antes de clicar no 🔥/⭐ (276/276).
- Documento do advogado atualizado: seção "Já aplicado no site em 16/11/2026" na aba Resumo, com a pergunta se a
  autodeclaração + perfil privado por padrão bastam para o ECA Digital.

## Respostas de 2026-11-15 (quarta rodada)

- **"Preferências" no banner: sim.** Link discreto embaixo dos botões do banner B1 nova, abrindo a janela "Preferências de
  cookies" (Necessários sempre ativos + Medição de visitas com chave). A chave nasce DESLIGADA (nada marcado de antemão);
  só aparece ligada para quem já aceitou. É a mesma janela do link "Preferências de cookies" do rodapé.
- **Fase 1 aprovada** pela dona.
- Ideias para o futuro (não fazer agora): vincular o **Search Console** ao GA4 (mostra o que as pessoas buscaram no Google
  até chegar ao site); criar o **Perfil da Empresa no Google** da professora (aparece na Busca e no Maps, com avaliações de
  alunos; dá para esconder o endereço e mostrar só a área de atendimento ou "aulas on-line"; é independente do GA4).

## Fase 1 (2026-11-15)

- ID da métrica do GA4: **`G-CE3282C1FB`** (público por natureza: aparece no código de qualquer site que usa o GA4). O ID do
  fluxo não é necessário. Falta a dona confirmar a parte B (14 meses, Sinais do Google desligados, anúncios desligados) e
  escrever "Fase 1 aprovada".

## Prévias pedidas em 2026-11-15 (aguardam escolha)

- Confirmação de idade com mais destaque: A1 janela ao abrir com "Agora não" (volta na próxima visita), A2 janela
  obrigatória (só some confirmando; "Sair da conta"), A3 faixa colorida no topo. Antes ela tinha preferido não ter janela
  única; a janela volta agora a pedido dela.
- Banner de cookies: B1 botões iguais, só o texto de "Aceitar" na cor da marca; B2 "Aceitar" cheio na cor da marca (azul no
  fr, vermelho no zh); B3 "Aceitar" cheio em cor neutra (tinta escura, igual nos dois sites). Dúvida da dona: vermelho no zh
  parecer "cancelar". Nota: no zh todos os botões principais já são vermelhos ("Começar", "Continuar").
- 2026-11-15, segunda rodada (pedido da dona: janelas no estilo das janelas do topo 🔥 e ⭐, `shared/janelas-topo.css`,
  classes `tpop-*`): A1 nova e A2 nova (cabeçalho na cor da marca com título grande e 🙋, caixinha num cartão, "Confirmar"
  em pílula com borda), A3 mantida; B1 nova (cabeçalho "Cookies" com 📊, botões iguais) e B2 nova ("Aceitar todos" cheio
  na cor da marca), B1/B2 antigas e B3 mantidas como opção. Prévias geradas na tela real do app (fr e zh, claro e escuro).
- GA4: não clicar em "Confirmação de coleta de dados do usuário / Eu confirmo" (é para quem manda e-mail ou telefone ao
  Google; o site não manda dado pessoal). "Coleta de dados do dispositivo e local granular" (cidade e modelo do aparelho,
  sem guardar o IP) pode ficar ligada; a política cita. "Personalização de anúncios": desligada para todas as regiões.

## Fase extra (depois da Fase 4): página `/aulas/`

Nova versão do prompt (2026-11-15) chama de **Fase 6**: link geral https://forms.gle/9994D2GHdwDj4RyT7 (formulário de aulas
de francês); avaliar redirecionar x moldura com o formulário dentro (sugestão dela, para o banner aparecer); marcar a
resposta pelo `utm_source` é opcional e precisa de confirmação dela.

Pedido da dona (2026-11-15): `app.profbrune.com.br/aulas/` lê o `utm_source` e redireciona para o formulário de aulas do
Google Forms com a pergunta "Como conheceu a Prof. Brune?" (campo `entry.1856921042`) já marcada: `instagram` → "Instagram
@prof.brune", `tiktok` → "TikTok", `indicacao` → "Indicação de amigo, familiar ou aluno", `mundolingo` → "Mundo Lingo",
`pessoal` → "Perfil pessoal da Brune (Instagram ou outra rede)"; sem utm (ou valor desconhecido) → formulário sem opção
marcada. O GA4 registra a visita antes de redirecionar. Atenção: quem chega por esse link é redirecionado sem ver o banner,
então no modo básico essa visita não chega ao GA4 (a origem fica registrada na resposta do formulário).

## Pontos em aberto

- **Idade mínima**: a dona não tem alunos menores nas aulas, mas o cadastro do site não pergunta a idade, e nem os Termos
  nem a política em rascunho falam de idade mínima. Ideia dela (2026-11-15): aceitar menores com a ciência dos responsáveis,
  sem perguntar a idade. Levar ao advogado: LGPD art. 14 e o ECA Digital (Lei 15.211/2025, em vigor desde 2026-03-17, que
  não aceita a autodeclaração como único meio de saber a idade), ainda mais porque o site tem Amigos, Ranking e perfil público.

- **Levar ao advogado**: os pontos do GA4, da medição própria e da idade mínima estão na seção "Novos pontos de 15/11/2026"
  da aba Resumo do documento do advogado (https://claude.ai/artifact/GCZFie5fbCT2rKW4nKUfuq).

## Andamento

- 2026-11-14: decisão registrada. Fase 0 (levantamento) ainda não começou. Plano completo das fases: prompt da dona
  (Fases 0 a 5, aprovação "Fase N aprovada" entre elas; nada vai para a `main` sem aprovação).
