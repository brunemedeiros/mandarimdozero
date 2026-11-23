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
| 3 | Médio | Bibliotecas externas sem versão fixa (`supabase-js@2`) e sem lacre SRI (nenhuma das 4) | Pendente (já era adiado no histórico 33) |
| 4 | Médio | `notification-cron` aceita a chave pública (`verify_jwt` aceita o token anon): qualquer um dispara os avisos fora de hora. Limites por dia e intervalo mínimo seguram o estrago | Conserto: senha `x-cron-token` + migration 140 (abaixo) |
| 5 | Leve | Proteção contra senhas vazadas (HaveIBeenPwned) desligada no Auth | Pendente (talvez só no plano pago) |
| 6 | Leve | Sem CSP / proteção contra moldura (GitHub Pages não deixa configurar cabeçalhos) | Pendente; dá para pôr parte por `<meta>` |
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
  último passo (lembrete de missões), então só esse lembrete deixa de sair para essas contas. Conserto proposto à
  autora (mapear `xp50` e tolerar missão desconhecida + novo deploy), aguardando aprovação.

