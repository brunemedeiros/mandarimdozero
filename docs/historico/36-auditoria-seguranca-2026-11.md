# 36. Auditoria de segurança (2026-11-19) e consertos

Pedido da dona: "rodar a Security Audit da Cloudflare". Essa skill não existe aqui e o site não passa pela
Cloudflare (GitHub Pages; da Cloudflare só vêm JSZip e sql.js pelo cdnjs). Opção escolhida pela dona:
auditoria feita pelo Claude, só leitura, em 3 frentes: Supabase ao vivo (alertas de segurança, Storage,
funções), código do repositório e cabeçalhos do site no ar.

## Achados (do mais grave ao menos grave)

| # | Gravidade | O que | Situação |
|---|---|---|---|
| 1 | Grave | Pasta `report-screenshots` pública: visitante sem conta listava e baixava os 16 prints dos reports (testado como anônimo: a lista veio) e enviava arquivo de qualquer tipo e tamanho | Conserto: migration 139 + Painel com link temporário. Decisão da dona: só ela vê os prints |
| 2 | Médio | `avatars`, `flashcard-media` e `support-materials`: qualquer um LISTAVA a pasta inteira (via os ids das contas); `avatars` sem limite de tipo/tamanho | Conserto: migration 139 (cada conta só lista a própria pasta; o link direto continua público) |
| 3 | Médio | Bibliotecas externas sem versão fixa (`supabase-js@2`) e sem lacre SRI (nenhuma das 4) | Conserto: 3 guardadas no site, Hanzi Writer com SRI (abaixo) |
| 4 | Médio | `notification-cron` aceita a chave pública (`verify_jwt` aceita o token anon): qualquer um dispara os avisos fora de hora. Limites por dia e intervalo mínimo seguram o estrago | Conserto: senha `x-cron-token` + migration 140 (abaixo) |
| 5 | Leve | Proteção contra senhas vazadas (HaveIBeenPwned) desligada no Auth | Só no plano Pro (conferido 2026-11-25); alternativa grátis abaixo |
| 6 | Leve | Sem CSP / proteção contra moldura (GitHub Pages não deixa configurar cabeçalhos) | Conserto: CSP por `<meta>` + anti-moldura (abaixo) |
| 7 | Leve | 20 funções sem `search_path` fixo (nenhuma `security definer`) | Pendente |

Conferido e OK: nenhum segredo no código nem no histórico do git; das funções `security definer` executáveis
por conta logada, só sobram consultas públicas de propósito (`check_username_signup`, `classroom_code_info`,
`invite_code_info`, `get_profile_card`, `get_public_*`) e `ensure_course_decks` (lista fixa de idiomas);
32 tabelas "RLS sem policy" = bloqueadas para todos fora das funções (lado seguro); GA4 manda o endereço
limpo (`cleanLocation` em `shared/consent.js`), sem convite/token; `push-send` e `delete-my-account` conferem
o login; texto de outros usuários (Mural, amigos, notificações) passa por `escapeHTML` (amostra, não linha a linha).
Os 38 reports da produção são todos de contas logadas (nenhum convidado), por isso o envio de print passou a exigir login.

## Conserto 1 e 2 (migration 139)

- Arquivo: `shared/supabase_migrations/139_storage_lockdown.sql`; para colar: `docs/rollout-sql/139_sql_editor.sql`.
- Por que SQL Editor: `ALTER POLICY` em `storage.objects` dá "must be owner of table objects" (testado no
  Staging em 2026-11-21) e `DROP POLICY` pela ferramenta MCP fica esperando confirmação.
- Painel (Admin > Reports): `trpScreenshotPath` (`shared/admin-reports-ui.js`) tira o caminho do endereço antigo
  gravado em `reports.screenshot_url`; `reportsSignScreenshot` (`shared/admin-reports.js`) troca o link por um
  temporário de 10 min ao abrir a janela. O envio do aluno (`shared/reports.js`) não mudou: já grava em `<uid>/...`.
- Testes: `tests/painel-admin/test_reports_ui_unit.js` 32/32, `test_reports_playwright.js` 182/182.
- Aplicação: Staging pela autora no SQL Editor (2026-11-22), conferido: regras e limites certos; visitante
  sem conta lista 0 arquivos nas 4 pastas e o envio sem login dá 403. Staging não tem arquivo nenhum, então o
  link direto público e o envio logado ficam para conferir na produção. Produção pela autora no SQL Editor
  (2026-11-23), conferido: regras iguais ao Staging, os 16 prints continuam guardados; visitante lista 0 arquivos
  (inclusive dentro da subpasta de uma conta), envio sem login = 403, link antigo do print = 400, link direto da
  foto de perfil e do áudio de cartão = 200. O link "Ver print" do Painel só volta quando a branch for mesclada.

## Conserto 4 (senha no robô de avisos, migration 140)

- `supabase/functions/notification-cron/index.ts` e a cópia `docs/deploy/notification-cron-para-colar-no-painel.ts`:
  sem o secret `NOTIFICATION_CRON_TOKEN` (ou com menos de 24 caracteres) = 503; cabeçalho `x-cron-token` diferente = 401.
  Código do repo conferido igual ao da produção (v34) antes da mudança.
- `shared/supabase_migrations/140_notification_cron_token.sql`: `_notif_cron_post()` lê do Vault `notif_cron_url`,
  `notif_cron_anon`, `notif_cron_token` (molde de `_rb_agent_post`) e o cron `notification-cron-diario` (22h UTC)
  passa a chamá-la. Tira do comando do cron a chave secreta que estava em texto puro.
- Testes: `tests/pt-servidor/test_cron_pt.js` 71/71 (2 novos da senha); k2b 60/60, p1 67/67, conta 28/28,
  mapa 29/29, a0 12/12. Função testada no Staging em transação desfeita (sem Vault recusa; com Vault manda a
  senha; anon/authenticated sem permissão), zero resíduo. Staging não tem o robô nem o cron.
- Ordem na produção: 1) senha no Vault (gerada no próprio banco) e secret da função com o mesmo valor;
  2) migration 140; 3) deploy da função; 4) teste sem senha = 401 e conferir a rodada das 22h UTC.
- Aplicação na produção (2026-11-23, autorizada): Vault `notif_cron_url`, `notif_cron_anon` (cópia de `rb_agent_anon`)
  e `notif_cron_token` (48 caracteres, gerado no banco, ninguém viu o valor no chat); secret `NOTIFICATION_CRON_TOKEN`
  colado pela autora no painel (a tela de secrets do MCP estava desligada pelo Supabase); migration 140 gravada como
  `20261123141933`; `notification-cron` **v36** (conteúdo baixado de volta e idêntico ao repositório). Teste: sem senha
  e com senha errada = 401 (não 503, logo o secret existe). Falta conferir a rodada das 22h UTC (senha igual nos dois lados).

## Ajuste do link da captura (2026-11-23)

- A autora clicou em "Ver captura de tela anexada" muito depois de abrir a janela do report e recebeu
  `"exp" claim timestamp check failed`: o link de 10 min era criado ao ABRIR a janela e tinha vencido.
- Agora o link é criado na hora do clique (`reportsOpenScreenshot` em `shared/admin-reports.js`): a aba nova abre no
  próprio clique e recebe o endereço logo depois; cada clique cria um link novo; se falhar, aviso
  `admin.reports.detail.screenshotError` (pt-BR e en).
- Testes: `tests/painel-admin/test_reports_playwright.js` 192/192 (10 novos: abrir não cria link, clique cria o link
  certo, segundo clique cria outro, falha avisa), `test_reports_ui_unit.js` 32/32. Testes de `tests/i18n/` que quebram
  (`test_i18n_unit`, `test_playwright`, `test_badges_i18n`, `test_translation_compare`) quebram igual na `main`
  (pedem um commit antigo que não está nesta cópia do repositório).

## 1ª rodada do robô de avisos com senha (2026-11-23, 22h UTC)

- Cron `notification-cron-diario` = succeeded; resposta da função **200 ok:true**: 44 combinações conta/idioma lidas,
  36 avisos criados, 62 eventos de cron no dia (59 no dia anterior, sem senha). Senha do Vault e secret batem.
- 10 erros na rodada, **anteriores a esta mudança** (código igual ao da v34): `Cannot read properties of undefined
  (reading 'split')` em 10 contas do francês. Causa: a missão do dia "Ganhe 50 XP hoje" (`xp50`, no site desde
  ~2026-10-23, substituiu `stars40`) não está em `MISSION_FIELD_BY_ID` do `notification-cron`; o erro acontece no
  último passo (lembrete de missões), então só esse lembrete deixa de sair para essas contas. Conserto aprovado pela
  autora (2026-11-24): `xp50: { field: 'xp' }` (o site mede `d.xp`) e missão desconhecida passa a ser pulada em
  `computeMissionProgress` (nunca mais derruba a conta). `notification-cron` **v37** na produção (2026-11-24),
  conteúdo baixado de volta e idêntico ao repositório; sem senha = 401. `tests/pt-servidor/test_cron_pt.js` 75/75
  (4 novos). Conferir a rodada das 22h UTC de 2026-11-24 (esperado: 0 erros).

## Conserto 3: bibliotecas com versão fixa (2026-11-24)

- supabase-js **2.119.2**, JSZip 3.10.1 e sql.js 1.8.0 (+ `.wasm`) guardados em `shared/vendor/` (versão no nome da pasta;
  baixados de 2 CDNs com sha256 idêntico; impressões digitais e passo a passo de atualização em `shared/vendor/README.md`).
  Páginas: `index.html`, `fr/index.html`, `zh/index.html`; `locateFile` do sql.js em `shared/anki-export.js` e
  `shared/anki-import-ui.js`. Por que guardar no site e não "lacrar" o CDN: os testes trocam o supabase-js por uma
  versão falsa interceptando o endereço, e o lacre (SRI) faria o navegador recusá-la (154 pontos de teste); os testes do
  Anki fazem o mesmo com JSZip/sql.js. Com a cópia no site, a versão só muda por commit e o site não depende do CDN.
- Hanzi Writer (só `zh`) segue no jsdelivr, agora `@3.5.0` com `integrity` sha384 + `crossorigin`; testado num navegador
  real: lacre certo carrega, lacre errado é bloqueado.
- Testes: 154 interceptações trocadas para `/cdn\.jsdelivr\.net\/npm\/@supabase|\/shared\/vendor\/supabase-js/`.
  Regressão (subagente) sem falha nova depois do ajuste: painel-admin (5 arquivos), painel-professora 895/895, pwa-cache,
  volta-aba, cores-marca, i18n (3), banco-revisao 846/846, login-obrigatorio 124/124, zh-manual, trilha zh, paridade-sites.
  Única falha nova era do teste `paridade-sites/test_modulos_niveis_zh_playwright.js`: o sorteio fixo do teste mudou de
  ordem porque JSZip/sql.js agora carregam (antes o teste os bloqueava); o erro proposital passou a ser "1ª pergunta
  comum a partir da 4ª" (95/95, 2 vezes). Pré-existentes iguais na `main`: checkpoint-zh (instável), registro
  (literais de appKey), revisao-seguranca A1/A3, `i18n/test_playwright` (commit antigo ausente); k2f não roda aqui.

## Missões de dias antigos no robô de avisos (2026-11-24)

- Sugestão vinda da sessão do PR 492, conferida nos dados: 45 blocos de progresso com missões congeladas de dias antigos
  (desde 18/09) e ~10 avisos "faltam N missões" por dia sobre elas. O conserto da v37 (xp50) ainda somaria ~10 contas.
- Conserto: o lembrete só considera `state.daily.date === hoje` (mesma aproximação de fuso do cron). Teste de ponta a
  ponta em `tests/pt-servidor/test_cron_pt.js` (77/77; contra a v37 o teste novo falha, como devia).
- `notification-cron` **v38** na produção (2026-11-24, autorizada pela autora): conteúdo baixado de volta e idêntico ao
  repositório; sem senha = 401. Conferir a rodada das 22h UTC de 2026-11-24.

## Mídia de deck público depois da 139 (decisão de 2026-11-24)

- Pergunta da sessão do PR 486: a 139 tirou de cada conta a leitura pela API da pasta de outra pessoa no
  `flashcard-media`, e a importação de deck público copiava a mídia com `storage.copy()` da pasta da dona para a de
  quem importa. Depois da 139 esse copy é recusado e a importação de deck com mídia falharia inteira
  ("media_copy_failed"). Na produção (2026-11-24) há 0 decks públicos, 0 com mídia e 0 cópias: ninguém foi afetado.
- Opções pesadas: (a) devolver a leitura só para arquivos de deck público (política com função que procura o
  caminho nos cartões de decks públicos; mais SQL a manter e reabre a listagem desses arquivos); (b) copiar no servidor
  (Edge Function nova com service role; mais um robô para publicar e proteger).
- **Decisão: (c) baixar e enviar de novo no navegador.** O bucket continua público (o link direto abre para todos) e cada
  conta já grava na própria pasta. `copyPublicDeckMediaObject` em `shared/public-deck.js` tenta o `copy()` (vale para
  arquivo da própria conta) e, se for recusado, baixa pelo link público e faz `upload` para `<uid>/pubcopy-...`.
  Não abre permissão nova, não precisa de migration nem de deploy. Custo: o arquivo passa pelo navegador (no máximo
  5 MB cada, limite do bucket). CORS conferido na produção (`access-control-allow-origin: *` no link público).
- Testes: `tests/fase-public-deck/test_playwright.js` 158/158 (3 novos por idioma: cópia recusada baixa e envia para a
  pasta de quem importa; importação termina com o mapa das mídias; envio recusado não chama a RPC). Com o caminho novo
  desligado de propósito, 4 falham. O teste real de Storage (`tests/fase-public-deck/staging_storage_test.js`, precisa de
  contas no Staging) não foi rodado aqui.

## Rodada das 22h UTC de 2026-11-24 (v38) conferida

- 200 ok:true, 44 combinações conta/idioma, **0 erros** (na véspera, 10 da missão `xp50`), 29 avisos criados.
- Lembretes "faltam N missões": 2 (na véspera 9, no dia 22 eram 10): agora só saem para quem mexeu nas missões hoje.

## Senhas vazadas e cabeçalhos de proteção (2026-11-25)

- **Senhas vazadas:** a proteção do Supabase (HaveIBeenPwned) só existe no plano Pro; o projeto está no grátis
  (`get_organization`: plan free). Das 63 contas, 54 entram pelo Google e 9 por e-mail e senha; o site aceita senha
  de 6 caracteres (`index.html`, cadastro). Proposta à autora: mínimo de 8 sem obrigar maiúscula/número (o tamanho
  protege mais que regras de composição, que viram "Senha1"), testando antes no Staging o aviso de "senha fraca" que
  o Supabase pode mostrar a quem já tem senha curta. **Decidido pela autora (2026-11-25): mínimo 8, sem regras extras.**
- **Anti-moldura (clickjacking), aprovado em 2026-11-25:** `shared/anti-moldura.js` no começo do `<head>` de 12 páginas
  (`index.html`, `fr`, `zh`, Sobre, 4 de privacidade, Ajuda, contrato, 2 testes de nivelamento; não na tela sem internet).
  `frame-ancestors`/`X-Frame-Options` não funcionam por `<meta>` e o GitHub Pages não deixa cabeçalho. Em moldura de outro
  endereço a página some (o Chrome só deixa trocar a janela inteira com clique da pessoa); moldura do próprio site segue
  permitida. Teste `tests/anti-moldura/test_playwright.js` 5/5.
- **Lista do que a página pode carregar (CSP), aprovado em 2026-11-25:** `<meta http-equiv="Content-Security-Policy">` em
  `index.html`, `fr/index.html`, `zh/index.html`, gerado por `scripts/csp-atualizar.js` (impressões sha256 do código solto,
  sem `unsafe-inline` nem `unsafe-eval` para script; `wasm-unsafe-eval` para o sql.js; estilos com `unsafe-inline`; imagens de
  qualquer `https:`; conexões só com o site, o Supabase de produção, Google Analytics e jsdelivr no zh). A publicação
  (`deploy-pages.yml`) roda o script antes de ir ao ar; `tests/csp/test_csp_playwright.js` 12/12 confere a lista em dia,
  13 abas no fr e 11 no zh sem nenhuma recusa, a entrada sem login, e um ataque simulado (script de fora recusado, `onerror`
  numa imagem não roda). Regra para as outras sessões em `.claude/rules/frontend-fr-zh.md`.
- Regressão (subagente, 115 arquivos de navegador): nenhuma falha nova do site. Ajustes de teste: `fase-public-deck` usava
  um endereço inventado do Supabase (agora o real, interceptado) 158/158; `i18n/test_card_variants_browser.js` usava
  `new Function` na página (agora lê o campo) 24/24; `pwa-cache/test_playwright.js` injetava `<script>` solto (agora `<meta>`)
  21/21. `pwa-cache/test_aviso_versao_playwright.js` oscila por tempo (falhou 1 de 4 vezes aqui; 3/3 depois, aqui e na
  `main`). Pré-existentes iguais na `main`: checkpoint-zh, desafios-etapa-d, fase-j, xp-semana, recomecar-curso
  (timeouts), `i18n/test_playwright` e k2f (ambiente).
- Conferido no ar depois do PR #520: aceitando os cookies, o gtag carrega e manda o `g/collect`, sem nenhuma recusa da CSP.

## Senha com mínimo de 8 (2026-11-25)

- Site (`index.html`): cadastro e "Crie uma senha nova" pedem 8 (`minlength` e conferência no código; antes a senha nova só
  tinha o `minlength` do navegador); recusa do servidor por senha curta vira "A senha precisa ter pelo menos 8 caracteres."
  (pt-BR e en). Testes: `login-obrigatorio/test_playwright.js` 127/127 (3 novos: 7 caracteres avisa e não salva),
  `test_entrada_idioma.js` 162/162, `test_esqueci_senha.js` 57/57, `csp` 12/12 (lista recalculada).
- Staging, com o mínimo 8 ligado pela autora no painel: conta com senha antiga de 6 continua entrando (200 com sessão; o
  Supabase só devolve `weak_password` junto, que o site ignora); cadastro com 7 é recusado (422 `weak_password`).
  Conta de teste `zz-teste-senha@example.invalid` criada no Staging para isso; a remoção pelo MCP pediu confirmação e ficou
  sem resposta: apagar pelo SQL Editor do Staging (`delete from auth.users where email like 'zz-teste-senha%@example.invalid';`).
- Produção: mínimo 8 ligado pela autora no painel (2026-11-25); site publicado pelo PR #526 (publicação conferida no ar).
  Conta de teste do Staging apagada (0 usuários, 0 identidades, 0 perfis).
- Pedido da sessão dos PRs 492/504: `admin.reports.detail.screenshotError` entrou em `NEW_KEYS` de
  `tests/i18n/test_i18n_unit.js` (precisa de `git fetch --unshallow`): 2331/2335 aqui; na `main` 2332/2337. As 4 que sobram
  são de outras sessões (`fr.conj.newSession`, `notif.cat.cartoes_professora`, `notif.pref.emailOnly`, `review.practiceMore`).


## Segunda rodada: chaves, RLS e teste IDOR (2026-11-25)

Pedido da dona: auditoria só de leitura em 3 frentes (chaves no código e no histórico; tabelas, RLS, Storage e funções;
teste IDOR com dois alunos fictícios no Staging). Nada mudou em produção.

- **Chaves (subagente, 2481 commits de todas as branches + site no ar):** nenhum segredo. Só a chave pública `anon`
  (produção e Staging) e a `sb_publishable_` dos testes, públicas por design. Sem `service_role`, `sb_secret_`, Resend,
  Google, GitHub, Notion, chave privada nem `.env` (nem no histórico). Não usa Vite (sem `VITE_`). Workflows leem
  `${{ secrets.* }}`. Sugestão preventiva: `.env*`, `*.pem`, `*.key` no `.gitignore`. Não verificável daqui: os valores do
  Vault e dos secrets.
- **Banco (produção, só leitura):** 72 tabelas, todas com RLS. 9 regras `using true`, todas de propósito (catálogos,
  modelos de aviso, Desafios publicados, XP/conquistas para o Ranking), menos o envio de report. Storage: `avatars` e
  `flashcard-media` públicas com limite; `support-materials` pública **sem limite de tamanho e tipo** (0 arquivos);
  `mural` e `report-screenshots` privadas. Funções `security definer` abertas a visitante: as mesmas 7 da 1ª rodada.
  Abertas a conta logada: 128; as 24 que recebem id de outra pessoa conferem admin/dona (código lido).
  Hoje só a conta da autora tem os papéis admin, teacher e premium_basic.
- **Regras do Staging = produção** (hash `5d74535018c7e732a011b00523e008d4`, 86 regras), então o teste no Staging vale para a produção.
- **Teste IDOR** (Staging, transações desfeitas, zero resíduo conferido): A não lê, edita nem apaga nada do B em 15 tabelas
  (o controle mostra que o B vê os seus); as funções do aluno dão `not_authorized` para A e respondem para a professora do B;
  A não vira admin nem cria vínculo. **Achado (Médio):** `reports_public_insert` era `WITH CHECK (true)`: A e um visitante
  gravaram report com o `user_id` do B, status `resolvido`, prioridade, nota interna, resposta e `reporter_email` forjados
  (a resposta da admin iria para esse e-mail). **Achado (Leve):** a conta se dá XP (`weekly_xp`) e conquistas
  (`earned_badges`) à vontade (o XP é calculado no navegador; consertar pede mudar o desenho, decisão da autora).
  Leve também: regras de admin por e-mail do token em vez de `is_admin()` (funciona, só não é uniforme).
- **Conserto do report, migration 147** (`shared/supabase_migrations/147_reports_insert_own.sql`), aprovada pela autora:
  `ALTER POLICY` no lugar (sem DROP, por isso foi pelo MCP). Visitante só com `user_id` nulo; logado só com o próprio
  `user_id` e `reporter_email` nulo; ninguém preenche status (fica `novo`), prioridade, nota nem resposta. O site
  (`shared/reports.js`) já manda exatamente isso. **Staging: aplicada em 2026-11-25** (gravada como `147_reports_insert_own`);
  conferida em transação desfeita: 2 envios legítimos aceitos (logado e visitante com e-mail), 8 falsificações recusadas.
  **Produção: aplicada em 2026-11-25 com autorização da autora** (versão `20261125220157`); conferida em `pg_policies`: texto
  certo, hash das 86 regras igual nos dois projetos (`102e79f81def52aa19d5222cafbaa08b`), os 38 reports intactos. Voltar atrás: comentário no fim da migration.
- Teste de regressão: `tests/seguranca-idor/` (`idor_staging.sql` diz sozinho `IDOR_OK`/`IDOR_FALHOU`; README com a tabela).
  Rodado no Staging em 2026-11-25 depois da 147: **`IDOR_OK passou=90`** (a autora aprovou a confirmação do MCP, que
  aparece porque o script tem `delete`); zero resíduo conferido (0 contas, 0 perfis, 0 reports de teste).
- Não verificado nesta rodada: IDOR nas Edge Functions. Propostas pendentes: limite da `support-materials` (P2) e
  `is_admin()` no lugar do e-mail (P3).

## Edge Functions: revisão de IDOR (2026-11-25)

Subagente, só leitura do código (seguindo os shims até o código que roda) + GET/OPTIONS sem token na produção.
**Nenhum IDOR grave ou médio:** nas 11 funções a identidade vem do JWT, de uma senha (`x-cron-token`, `x-agent-token`,
em tempo constante) ou de link assinado (HMAC), nunca de um `user_id` mandado no corpo. Sem token: 401 em delete-my-account,
notification-cron, push-dispatch, push-send, report-reply-send, review-bank-agent e tts-generate; as públicas de propósito
(class-calendar-feed, google-calendar, notion-sync, teacher-cards-digest) respondem 404/405 sem parâmetro.
Confirmado de forma independente: push-send (sem `user_id`; a RLS de `push_subscriptions` limita aos aparelhos de quem
chama) e delete-my-account (id do `getUser(token)` + e-mail digitado igual ao da conta) conferem o DONO, não só o login.

| # | Gravidade | Achado | Situação |
|---|---|---|---|
| A1 | Leve (defeito, não brecha) | `push-send` não responde OPTIONS nem manda CORS (`index.ts:42-44`, OPTIONS ao vivo = 405): o navegador barra a chamada de `shared/notifications.js:89`, então os pushes do próprio navegador (XP, conquista, Desafio) provavelmente nunca chegam | Pendente (pede deploy) |
| A2 | Leve | `report-reply-send` responde para o `reporter_email` gravado no report | Resolvido pela 147 (só visitante grava e-mail; logada vai pelo e-mail da conta) |
| A3 | Informativo | `tts-generate` aceita cartão que a pessoa consegue VER (aluna gera áudio de cartão da professora); gasta só a cota dela, arquivo na pasta dela | Aceitável |
| A4 | Informativo | Token do `class-calendar-feed` sem validade (~79 bits), pode ser trocado | Decisão de projeto |
| A5 | Leve | OAuth do Google Agenda e do Notion sem vínculo com o navegador: professora que mandasse o link de consentimento a outra pessoa ligaria a agenda dela à própria conta | Exige papel de professora + enganar alguém |
| A6 | Informativo | CORS `*` sem cookies/credenciais | Sem risco |

Testes ao vivo das funções com duas contas: não feitos. No Staging só existem 7 das 11 (faltam push-send, tts-generate,
notification-cron e teacher-cards-digest), e testar exige contas reais com senha no Staging (sobram depois e precisam ser
apagadas pela autora). Roteiro dos testes HTTP esperados: relatório do subagente resumido acima (A x B → 403/`not_authorized`).

## Notificações no celular/navegador (push): conferência de 2026-11-25

Pedido da dona: "confira se as notificações do navegador estão chegando". Resposta: **na prática, não chegam para ninguém além
da própria autora**, por três motivos independentes:
1. **Só 1 aparelho inscrito no site inteiro** (`push_subscriptions` na produção): o da autora (Chrome/Android, desde 2026-09-10).
   Nenhuma inscrição nova desde então, embora 41 contas tenham "push" marcado nas preferências e a faixa de convite em Amigos
   exista desde 2026-10-15. Sem aparelho inscrito, nenhum push sai (nem do site, nem do robô `notification-cron`, nem do
   `push-dispatch` de Amigos).
2. **`push-send` sem CORS** (`supabase/functions/push-send/index.ts:42-44`): a pergunta prévia do navegador recebe 405. No
   registro da produção de hoje: Opera/Windows parou no 405 e não enviou; um iPhone (Safari) conseguiu 2 POST 200 (12:34 e 12:44
   UTC), mas essa conta não tem aparelho inscrito, então nada foi entregue. Pushes do servidor não passam por aqui.
3. **Inscrever de novo o mesmo aparelho falha** (teste no Staging, transação desfeita): a 1ª inscrição grava; a 2ª (mesmo
   aparelho, `upsert` em `shared/push.js:78`) é recusada pela RLS ("USING expression") porque `push_subscriptions` não tem regra
   de UPDATE (só SELECT, INSERT, DELETE da 013). Quem clica "Ativar" de novo vê "não foi possível salvar".
Consertos propostos, aguardando a autora: CORS no `push-send` (deploy), regra de UPDATE da própria linha (migration sem DROP)
e investigar por que ninguém ativa (convite, telas, iPhone exige o site instalado na tela inicial).

### Consertos 1 e 2 no Staging e investigação da adesão (2026-11-25, aprovados pela autora)

- **148 `push_subscriptions_owner_update`** (`shared/supabase_migrations/148_push_subscriptions_owner_update.sql`, sem DROP):
  Staging aplicada. Teste (transação desfeita): ativar aparelho novo ok, ativar de novo o mesmo aparelho ok (antes: recusado),
  A editar o aparelho de B = 0 linhas, A passar o próprio aparelho para B = recusado, A sobrescrever a inscrição de B pelo
  upsert = recusado, chave de B intacta. Produção: pendente do "ok" da autora.
- **`push-send` com CORS** (`supabase/functions/push-send/index.ts`, molde do push-dispatch; sem VAPID = 503 em vez de não subir).
  Código da produção (v12) conferido igual ao repositório antes da mudança. Staging: publicada (v1, não existia lá).
  `tests/push-cors/test_cors_push_send.js` (Chromium de verdade na origem do site, só chave pública): Staging 3/3
  (chamada chega; 503 `vapid_missing` porque o Staging não tem as chaves de push); produção 2/3 (navegador bloqueia: o defeito).
  Produção: pendente do "ok" da autora; depois rodar o teste com `producao` (esperado 4/4 com `sent:0`).
- **Investigação da adesão (subagente, só leitura):**
  - O servidor envia e o Google aceita: `notification-cron` (22h UTC de 24 e 25/11) e `push-dispatch` (fila de Amigos, 10 itens,
    todos para a conta da autora) sem nenhum erro; inscrição não foi apagada (seria se o Google desse 404/410), chave VAPID bate
    (senão 403). Logo a inscrição de 10/09 provavelmente é de OUTRO navegador/aparelho da autora, ou o Chrome/site está com
    notificação bloqueada no Android. Teste para ela: Configurações > Notificações no celular atual.
  - Convite de Amigos chega a no máximo 4 contas (só quem tem amizade aceita; janela só no 1º amigo). Fora disso, só o
    interruptor escondido em Configurações > Notificações.
  - iPhone (11 das 27 contas ativas em 60 dias; maior grupo de celular): fora da Tela de Início o interruptor só diz "Seu navegador
    não suporta notificações push"; o passo a passo do iPhone existe só na faixa de Amigos. A página de entrada (`index.html`, raiz)
    não tem manifest nem a meta da Apple: adicionar à Tela de Início a partir dela pode virar atalho comum (suspeito).
  - Parte técnica certa (service workers com `push`/`notificationclick`, escopo /fr e /zh, CSP). Nada medido: 0 eventos de ativação.
  - Plano proposto (aguarda a autora): convite visível para todas (depois de lição/Revisão, com "Agora não"); passo a passo do
    iPhone em Configurações + manifest na raiz; medir tentativas/resultados; botão "mandar aviso de teste para este aparelho".
    Tudo grátis.

- **Produção (2026-11-25, "ok" da autora):** `148_push_subscriptions_owner_update` gravada como `20261125224057` (regra
  conferida em `pg_policies`); `push-send` **v13** (mesmo conteúdo do Staging, sha `336083...e1`; voltar atrás = v12, o
  conteúdo anterior está no git antes do commit 985c118d). `tests/push-cors/test_cors_push_send.js producao` 4/4
  (antes 2/3). A autora tentou ligar o push no celular: "Você não permitiu as notificações" (motivo `denied`: o Android/Chrome
  recusou sem mostrar a pergunta; o site não tinha como pedir de novo). Plano B e A aprovados, prévia antes de mexer.

### Plano B e A implementados na branch (2026-11-25; decisões da autora: 2ª lição, a cada 7 dias, no máximo 3 vezes, sem "Não perguntar mais")

- Peça comum `shared/push-convite.js` + `.css` (ligada em `fr/index.html` e `zh/index.html`; textos `push.*` em pt-BR e en):
  - **B**: Configurações > Notificações mostra uma caixa FIXA com o passo a passo quando o navegador guardou "Bloquear"
    (Android: Chrome > Configurações do site > Notificações + ícone do app > Informações do app; computador: cadeado) ou no
    iPhone fora da Tela de Início; "Já liberei, tentar de novo". Caso da autora (2026-11-25): liberar o ícone no Android não
    tirou o "Bloquear" do Chrome (`Notification.permission === 'denied'`, aviso "estão bloqueadas"); passo a passo enviado.
  - **A**: convite na tela de Lição concluída (`renderLessonCompleteScreen`, contado em `licao-base.js`), não no checkpoint nem
    na 1ª lição do curso; navegador bloqueado não recebe convite; "Ativar" recusado vira o passo a passo de liberar. O lugar do
    convite só é criado quando ele aparece: a 1ª versão punha um `<div hidden>` em toda tela de conclusão e isso mudava quando
    os avisos "+N XP" somem (`test_quase_iguais` 101 falhas, `test_atalhos` 18); com o lugar criado só na hora, os dois voltaram
    ao normal (2764/2770 com as 6 de sempre; 92/92).
- Testes: `tests/push-convite/test_playwright.js` 58/58 (fr e zh, Android/computador/iPhone, inglês sem português; fotos claro e
  escuro conferidas); amigos-push 72/72, configuracoes 27/27, i18n 2334/2334, csp 12/12, css_compartilhado 5/5, boas-vindas 190/190,
  xp trilha 19/19, e4 5b/5c/5e, m2 voz 16/16. `css-comum/test_cascata` acusa só as regras NOVAS do convite (é a prova de "mover
  CSS sem mudar nada", compara com a main). Pré-existentes iguais sem a mudança: `xp-semana` (janela de idade por cima),
  `e4/test_lote5d_pinyin` (trava ao carregar).
- Falta: PR para publicar (a pedido da autora); depois, conferir no ar.
- 2026-11-26: o aparelho da autora tem o site instalado pelo **Opera** (símbolo "O" no canto do ícone), não pelo Chrome; por isso
  não havia nada em Chrome > Configurações do site. O passo a passo do Android (B) passou a valer para qualquer navegador
  (cadeado do endereço → Permissões/Configurações do site → Notificações) e explica o símbolo do ícone. `tests/push-convite` 58/58.
- 2026-11-26: a autora liberou as notificações no Opera (escudo verde → Permissões → Notificações) e ligou o push no site:
  nova inscrição na produção (18:30 UTC, `fcm.googleapis.com`, `push_subscriptions.id` 5; a de 10/09 continua). Aviso de teste
  pedido por ela: 1 linha em `push_outbox` (id 11, "Teste da Prof. Brune 🔔") + `push-dispatch` chamado com a chave pública:
  `{"claimed":1,"sent":2,"failed":0,"pruned":0}` (aceito pelo Google nos 2 aparelhos).
  **Chegou no celular dela às 15:31 de Brasília** (print: notificação do Opera "Teste da Prof. Brune", com o ícone do site).
  Caminho inteiro confirmado: fila → push-dispatch → Google → Opera no Android.

## P2 e P3 no Staging (2026-11-26)

- **150 `admin_policies_is_admin`** (P3): as 16 regras que reconheciam a admin pelo e-mail do token passam a usar `is_admin()`
  (papel `admin` em `account_roles` OU o e-mail da autora; hoje só a conta dela tem o papel). `ALTER POLICY` no lugar, sem DROP.
  Lista conferida igual nos dois projetos. Staging aplicada em 2026-11-26.
- **151 `support_materials_size_limit`** (P2): a pasta pública `support-materials` passa a recusar arquivo acima de 50 MB, o mesmo
  limite da tela (`TMT_MAX_FILE_BYTES`). Tipos de arquivo continuam livres (a tela aceita qualquer tipo); restringir só com a lista
  da autora. Staging aplicada em 2026-11-26.
- Teste (Staging, transação desfeita): admin pelo papel e conta com o e-mail da admin editam report alheio (1), veem os 122
  Desafios (com os 2 rascunhos) e passam pela regra das conquistas; aluna comum: editar report 0, Desafios 120 (só publicados),
  criar conquista recusado; limite da pasta = 52428800. Produção: aguardando o "ok" da autora.
- Base para o teto de XP (produção, 2026-11-26): 89 semanas com XP, maior 2019, 95% abaixo de 1336, média 423.
## CSP por `<meta>` deixava a abertura em ~30 s no celular (2026-11-26/27)

Com a política num `<meta>`, o Chrome (e Opera) e o Firefox desligam o "preload scanner": os ~180 `<script src>` do fim do
`<body>` passaram a ser buscados um de cada vez. Rede de celular simulada (150 ms por arquivo): antes do PR #520 6,1 s; depois
30,6 s; sem a CSP 8,0 s; com a CSP no fim do `<head>` 30,7 s (o lugar não importa). Conserto aprovado pela dona (a proteção
fica): `scripts/csp-atualizar.js` também escreve, logo depois do `<meta>`, um bloco `<!-- preload:... -->` com um
`<link rel="preload" as="script">` por script do próprio site (sem os de fora nem os com lacre SRI); roda na publicação como a
CSP, então a lista nunca fica velha. Resultado: fr 32 s -> 6 s, zh 29 s -> 6 s. Testes: `tests/csp/` 12/12, anti-moldura 5/5,
pwa-cache 21/21, 48/48 e 14/14, login-obrigatorio 127/127, 166/166 e 63/63, consentimento 77/77, animações 40/40, paridade
2770/2770 e 92/92, i18n 2333/2333 (sem falha nova).

## XP do Ranking: opções A e D (2026-11-27, decisão da autora: teto 8.000)

- **152 `weekly_xp_cap_and_alerts`**: gatilho `weekly_xp_cap` (segura em 8.000; sem DROP, criado só se não existir) e RPC
  `admin_xp_alerts()` (só admin; contas com >= 3.000 nas últimas 2 semanas). Staging aplicada em 2026-11-27. Teste (transação
  desfeita): 1.200 e 7.999 ficam, 99.999 vira 8.000, linha nova de 50.000 vira 8.000, aluna chamando a lista = not_authorized,
  admin vê a conta com 8.000 "no teto". Produção: aguardando o "ok" da autora.
- Tela: bloco "XP fora do normal" no topo da Visão Geral (`aovXpAlertsHTML`, `shared/admin-overview-ui.js`), só quando há alguém;
  falha da RPC nunca derruba a Visão Geral. Testes: `tests/central-de-controle/` 45/45 e 170/170 (fr/zh, claro/escuro, celular).

## P2, P3 e teto do XP na produção (2026-11-27, "ok" da autora)

- Versões: `150_admin_policies_is_admin` = `20261127152524`, `151_support_materials_size_limit` = `20261127152526`,
  `152_weekly_xp_cap_and_alerts` = `20261127152530`. Conferido: 0 regras com o e-mail, 18 com `is_admin()` (16 novas + 2 que já
  usavam), limite 52428800, gatilho `weekly_xp_cap` presente, `admin_xp_alerts` fechada para visitante, XP intacto (133 linhas,
  maior 2.019), hash das regras igual ao do Staging (`644c1d6487092f1f2f03807160de6717`). Tela "XP fora do normal" no PR seguinte.

## Material de apoio: pasta fechada (2026-11-27, pedido da autora)

- **153 `support_materials_private`**: `support-materials` deixa de ser pública e ganha a regra `support_materials_student_read`
  (a aluna lê o arquivo de um material que ela consegue ver em `teacher_support_materials`: enviado para ela e com vínculo ativo;
  a subconsulta respeita a RLS dessa tabela). A professora continua lendo a própria pasta. Diferente da 139, o `CREATE POLICY` em
  `storage.objects` passou pela ferramenta MCP (Staging, 2026-11-27).
- Teste no Staging (transação desfeita): professora vê 2 arquivos; aluna certa vê só o dela (1) e nenhum outro da professora;
  outra aluna 0; visitante 0; a mesma aluna sem vínculo 0; pasta `public = false`. Na produção havia 0 arquivos (2 materiais, nenhum
  com arquivo): nada quebra.
- Site: o arquivo abre por link temporário de 10 min criado no clique (`openSupportMaterialFile` em
  `shared/teacher-support-materials.js`, molde dos prints dos reports), na tela da aluna e no painel da professora (`data-sm-file`);
  `file_url` continua no formato antigo. Aviso novo `supportMaterials.fileError` (pt-BR e en).
- Testes: `painel-materiais` 42/42 e 214/214 (novo: o clique pede o link de 10 min com o caminho certo; o teste antigo do link
  perigoso na vista da aluna conferia um elemento vazio e foi corrigido), painel-professora 895/895, mural 325/325, csp 12/12,
  i18n 2333/2333. Produção e PR: aguardando o "ok" da autora.

## Rodada de 2026-11-27 (tarde): pasta fechada na produção, 20 funções, decisões

- **153 na produção** (versão `20261127154756`): pasta `support-materials` fechada e regra `support_materials_student_read`;
  site publicado pelo PR #541 e conferido no ar (~40 s depois da mesclagem).
- **Tipos de arquivo do Material de apoio: ficam LIVRES** (decisão da autora, 2026-11-27). Só o limite de 50 MB (151).
- **154 `functions_fixed_search_path`** (achado 7 de 2026-11-19): as 20 funções sem `search_path` fixo passam a ter
  `search_path = public` (nenhuma é security definer nem usa extensão). Staging aplicada em 2026-11-27. Teste (transação
  desfeita): as 10 funções simples devolvem o esperado; gatilhos de data (`profiles`, `reports`, `notification_*`, `challenges`)
  e de conferência (`own_flashcards`/`teacher_flashcards` validam o deck, `decks_validate_hierarchy` aceita "Meus Decks" como
  pai e recusa pai errado, igual a antes da mudança); 0 funções sem endereço fixo. Produção: aguardando o "ok" da autora.
- **Testes ao vivo das Edge Functions com contas de verdade**: autorizados pela autora (Staging, contas `zz-edge-*`); resultado abaixo.
- **Resultado (subagente, Staging, contas de verdade com senha):** nenhuma das 8 funções deixou a conta A mexer na conta B.
  push-send (CORS 200; leitura só das inscrições de quem chama; envio real não testável no Staging, sem chaves de push),
  delete-my-account (e-mail de B = 400 `confirm_mismatch`; e-mail de A + `user_id` de B = só A apagada, B intacta),
  report-reply-send (403 antes de qualquer envio), push-dispatch (só a fila, 0 linhas), review-bank-agent (401 nos 3 casos),
  google-calendar e notion-sync (401 para aluna; callback com `state` falso = 400), class-calendar-feed (senha aleatória = calendário vazio).
  Nenhum e-mail ou push saiu. Sobrou no Staging a conta `zz-edge-b` e 4 linhas dela (a limpeza pela ferramenta ficou esperando
  confirmação): `docs/rollout-sql/limpeza-staging-zz-edge.sql` para a autora colar no SQL Editor do Staging.
- **Google Agenda/Notion (A5)**: explicado à autora; conserto possível = conferir no retorno do Google/Notion que é o MESMO navegador
  que começou a ligação (marca guardada no navegador no `start` e conferida no `callback`). Aguarda decisão.
- **154 na produção** (2026-11-27, "ok" da autora; versão `20261127224036`): lista das 20 funções conferida igual à do Staging
  pelo hash dos nomes (`c48305caa22cae60001d19a53e300208`); depois, 0 funções sem `search_path` e as funções respondem igual.
- **Limpeza do Staging**: a 1ª versão do arquivo falhou com `profile_delete_forbidden` (o gatilho `profiles_protect_delete` só deixa
  o perfil sair junto com a conta; como tudo estava entre `begin`/`commit`, nada foi apagado). Arquivo corrigido: apaga os dados e a
  conta; o perfil sai em cascata.
- **Google Agenda/Notion (A5)**: a autora pediu o conserto agora (2026-11-27).

## Conserto A5: ligação do Google Agenda / Notion confirmada pela sessão logada (2026-11-27, Staging)

- **Como era:** a volta do login do Google/Notion (`callback`) já gravava a ligação para a dona do `state`. Link de consentimento
  repassado a outra pessoa ligaria a agenda/Notion dela à conta de quem começou.
- **Como ficou:** a volta só guarda uma **pendência** (`oauth_pending_links`, migration `156_oauth_confirm_same_session`; tokens
  no `payload`, código de confirmação de 256 bits do qual só o hash SHA-256 fica no banco, 15 min, uso único) e volta ao site com
  `?gcal=confirmar&c=<código>` / `?notion=confirmar&c=<código>`. O site tira o código do endereço ao carregar e chama a ação nova
  `confirm` com a sessão de quem está logado; `oauth_pending_confirm` só ativa se for a MESMA conta, senão descarta a pendência
  (tokens apagados). Respostas: 200 ok, 403 `not_same_user`, 410 `expired`, 409 `already_used`, 404 `not_found`, 400 `invalid_code`,
  401 sem login. Ligação ativa antiga não muda enquanto não houver confirmação. Sincronização e uso dos tokens não mudaram.
  Aviso novo no site (pt-BR e en): `panel.gcal.confirmFailed` / `panel.notion.confirmFailed`.
- **Sobra conhecida:** se a outra pessoa não estiver logada no site e repassar o endereço final (com o código) a quem começou, em
  até 15 min, a ligação acontece; exige que ela entregue um link secreto, não só que clique.
- **Produção antes do conserto (conferido, só leitura):** `google-calendar` v5 e `notion-sync` v3, código igual ao do repositório.
- **Staging:** 156 aplicada (versão `20261127224710`); `google-calendar` **v9** e `notion-sync` **v7** (`verify_jwt:false`
  nas duas, como antes). Teste do banco (transação desfeita): 30/30. Ponta a ponta por HTTP com 2 contas de senha
  (`zz-oauth-a/b@example.invalid`) e pendências gravadas pelo banco (tokens falsos): A confirma a própria = 200 e ligação ativa;
  B confirma a de A = 403 e a pendência some (A tentando depois = 409); vencido = 410; reusado = 409; código do Google no Notion =
  404; sem login = 401; código mal formado = 400; `callback` com `state` falso = 400; ligação de A não trocada pela tentativa de B.
- **Testes:** `tests/oauth-confirmar/run.sh` (Node 65/65 + Postgres local 30/30); `tests/aulas-presenca/run.sh` sem falha
  (117 45/45, 128 19/19 etc.); `tests/aulas-presenca/test_google_map.mjs` 9/9 (ajustado para a importação nova);
  `tests/notion/test_map.mjs` 13/13.
- **Limpeza:** a remoção das contas `zz-oauth-*` pela ferramenta ficou esperando confirmação: `docs/rollout-sql/limpeza-staging-zz-oauth.sql`
  (SQL Editor do Staging; a ligação de teste e as pendências saem em cascata).
- **Produção (aguardando o ok da autora):** 1) migration 156; 2) deploy de `google-calendar` e `notion-sync` (mesmos arquivos da
  pasta, `verify_jwt:false`); 3) PR do site (`shared/google-calendar.js`, `shared/notion-sync.js`, textos). Fazer 2 e 3 juntos: com a
  função nova e o site antigo, a volta mostra o Painel sem ligar nada (o site antigo não conhece `confirmar`). O repasse
  `agenda.profbrune.com.br/google|notion/callback` (Netlify) não muda. Voltar atrás: republicar v5/v3.
