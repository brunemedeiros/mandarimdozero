# Fase 3: auditoria do Painel de Admin (Planos, Notificações, Badges, Reports, Analytics)

Auditoria feita em 2026-10-13, antes de qualquer código (regra do projeto para fases grandes). Mapa gerado por leitura do código, nada foi alterado.
Autorização da autora: "autorizado" (início da Fase 3). Esta auditoria pede as decisões da seção 5 antes de codar.

## 1. Onde isso mora hoje
- `#view-admin-badges` (fr/zh `index.html`, ~4380) com 5 abas `[data-admin-section]`: badges, analytics, notifications, reports, premium (Planos). A troca de aba
  (`switchAdminPanelSection`, `renderAdminPanelView`, `wireAdminPanelTabs`) mora dentro de `shared/admin-analytics.js` (L1386-1420), não em arquivo próprio.
- Gate de tela: `isAdminUser()` (e-mail fixo da autora, `fr/app.js:2229`, `zh/app.js:2206`); proteção real é RLS e RPCs `admin_*`. Admin Mode (`shared/profile.js`,
  `shared/auth.js`) só mostra/esconde a navegação; há um segundo botão dele dentro de Analytics.
- Fr e zh têm HTML de modais separados (duplicação manual): `#admin-manage-badge-modal`, `#admin-edit-badge-modal`, `#admin-edit-template-modal`, `#admin-report-detail-modal`.

## 2. As 5 abas
| Aba | Arquivo (linhas) | Escreve no banco | Padrões antigos | Testes funcionais hoje | Risco |
|---|---|---|---|---|---|
| Planos | `admin-premium.js` (269) | só por RPC (`admin_grant_role`, `admin_revoke_role`, `admin_set_role_permission`) | já em seções; combobox próprio; sem confirm | parcial (stub + SQL 075/076) | alto: permissões reais, a matriz grava a cada clique sem confirmar |
| Notificações | `admin-notifications.js` (344) | `notification_templates`, `notification_rules` | 1 `confirm()`, 1 modal | nenhum | médio: muda o que todos recebem (app, push, e-mail) |
| Badges | `admin-badges.js` (481) | `badge_catalog`, `badge_grants` | 1 `confirm()`, 2 modais | nenhum | médio-alto: renomear não é transação; apagar badge apaga concessões em dois passos |
| Reports | `admin-reports.js` (346) | `reports` (status, prioridade, nota); Edge Function `report-reply-send` (e-mail) | 1 modal grande | nenhum | alto: dados pessoais, e-mail irreversível, lista limitada a 200 |
| Analytics | `admin-analytics.js` (1422) | só o Admin Mode | 10 sub-abas; gráficos feitos à mão em HTML/CSS (barras, funil, KPIs, coorte); cálculo misturado com tela | quase nenhum | alto: leituras cortadas em 5000/2000 eventos sem aviso; estado global acoplado ao DOM |

Pontos que valem corrigir de passagem (sem mudar regra): `confirm()` vira `PainelUI.confirmar`; modais viram `<dialog class="p-dialogo">`; estilos inline saem;
rótulos fixos (`ANALYTICS_*_LABELS`, `NOTIFICATION_TEMPLATE_EVENT_LABELS`, `label_pt` do banco) passam por `t()` quando forem texto nosso.

## 3. Travas de teste que existem
`tests/painel-professora/test_playwright.js` exige exatamente as abas `badges, analytics, notifications, reports, premium`, "sem Tags", `#view-admin-badges` e `.admin-only-nav`;
`tests/fase-j` usa `data-admin-section`; vários testes stubam `isAdminUser`. Então: manter esses nomes e ids, a rota interna `admin-badges` (usada em notificações de supervisão)
e o contêiner `.panel-view`. As telas novas ficam sob `<div class="painel">` (o teste de escopo do Design System garante que o CSS não vaza).

## 4. Proposta (mesmo método da Fase 2: 1 tela por vez, só com seu "pode seguir")
Ordem, da mais simples à mais delicada:
1. **Navegação do painel** sai de `admin-analytics.js` para `shared/admin-panel.js` (sem mudar o comportamento), junto com o Admin Mode em um lugar só.
2. **Planos** (valida combobox, matriz e formulário no padrão novo; ganha confirmação ao desligar permissão sensível, se você quiser).
3. **Notificações** (lista por evento, formulário e janela de edição).
4. **Badges** (catálogo, conceder, janelas), com testes ANTES de mexer em renomear e apagar.
5. **Reports** (filtros, lista, janela de detalhe e resposta por e-mail, com a Edge Function simulada nos testes).
6. **Analytics**, por último e em partes: primeiro extrair o cálculo (`computeAnalytics`, coortes, técnica) para um arquivo testável em Node, depois migrar uma sub-aba por vez.
Cada passo: testes da área (Node e navegador, fr/zh × claro/escuro + celular), regressão do painel-ds e da professora, registro em `docs/historico/15-*`.
**Sem migration e sem dado novo** nos passos 1 a 5. Para o 6, um aviso de "dados cortados" não exige banco; um resumo no servidor (RPC) para não depender do corte de 5000 eventos exigiria migration (Staging antes, SQL Editor).
Grátis x Premium: nada muda (é ferramenta da admin; os planos continuam como estão, sem checkout).

## 5. Decisões que preciso da autora
1. A ordem acima serve? (A navegação primeiro é só arrumação interna, sem mudar nada que você vê.)
2. **Planos:** quer confirmação antes de ligar/desligar uma permissão na matriz (hoje grava ao clicar)? E ao conceder/tirar um papel?
3. **Badges:** posso tornar "renomear" e "apagar" mais seguros? Hoje renomear não é uma operação única (pode ficar pela metade se cair a conexão). A correção segura é uma RPC no banco (migration, Staging antes), ou deixar como está e só avisar na tela.
4. **Analytics:** os números hoje podem estar cortados (limite de 5000 eventos). Quer só um aviso claro na tela quando cortar (sem banco), ou resumir no servidor (migration) numa etapa depois?
5. **Notificações e Reports:** posso deixar a janela de edição/detalhe como janela (dialog) do Design System, com as mesmas regras? E o envio de e-mail de resposta pede confirmação ("enviar para fulano?") antes de enviar?
6. **Tags** (Painel de Tags da Fase J) continua fora da área Admin, como no teste atual?
7. Os dois botões de **Admin Mode** (topo e dentro de Analytics) podem virar um só lugar?
