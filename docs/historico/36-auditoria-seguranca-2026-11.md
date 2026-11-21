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
| 4 | Médio | `notification-cron` aceita a chave pública (`verify_jwt` aceita o token anon): qualquer um dispara os avisos fora de hora. Limites por dia e intervalo mínimo seguram o estrago | Pendente: exigir segredo, como a `review-bank-agent` |
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
- Aplicação: Staging __ / produção __ (preencher).
