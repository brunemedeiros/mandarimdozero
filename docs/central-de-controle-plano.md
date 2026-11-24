# Central de Controle (Visão Geral do Painel de Admin): plano

Pedido da autora em 2026-11-19, a partir de um anúncio do Instagram (perfil ro.guerreiro, imersão paga que ensina a fazer um app
no Lovable). O vídeo mostra a "Central de Controle" de um app de treino e alimentação. Este documento guarda o que se aproveita,
as decisões da autora e as fases. **Nada foi implementado ainda.**

## 1. O que o vídeo mostra (resumo)

- **Visão Geral**: seletor 7 / 30 / 90 dias; números (total de alunas, ativas, engajamento médio, novos cadastros); linha "Acessos ao
  longo do tempo" (acessos e alunas únicas por dia); linha "Novos cadastros" (contas por dia); rosca "Status das contas" (ativa,
  cancelada, expirada, pagamento pendente; clicar numa fatia filtra a lista); barras "Distribuição de engajamento" (Nenhum, Baixo,
  Médio, Alto, Altíssimo). A dona do vídeo diz que o gráfico de engajamento "é o ouro": a meta é levar quem está em Baixo para Alto.
- Outras telas: áreas de conteúdo com chave "Área habilitada no app" e "Novo módulo"; Desafios com datas e importação de PDF;
  Integrações com a Hotmart (compra libera o acesso; "modo teste").

## 2. O que se aproveita e o que não

| Ideia | Decisão |
|---|---|
| Visão Geral com período e gráficos | **Fase 1** |
| Distribuição de engajamento com clique que mostra quem está em cada faixa | **Fase 1** (a parte mais útil) |
| Status das contas | **Fase 1**, em dois blocos separados (ver 3.4) |
| "Precisa de você" e saúde das rotinas automáticas | **Fase 2** |
| Menu lateral único (Admin + Professora) | **Fase 3**, só depois de a autora usar a Visão Geral |
| Chave liga/desliga de cada área | Futuro (hoje são constantes no código, como `CHALLENGE_PAYWALL_ENABLED`) |
| Integração de pagamento (Hotmart/Stripe) | Futuro, junto da pendência do Stripe |
| Importar desafio de PDF | Não (Desafios seguem a skill `criar-desafios`) |
| Fazer no Lovable | Não (seria outro site, com outro login e o mesmo banco sem as proteções atuais) |

## 3. Decisões da autora (2026-11-24)

1. **Só para a admin.** A professora não vê. Grátis x Premium: tela só da admin, nada muda para os alunos.
2. **Tirar a aba Badges** do Painel de Admin ("não está sendo usada"). A Visão Geral passa a ser a primeira aba.
3. **Começar pela Fase 1.** Menu lateral só depois de usar a Visão Geral.
4. **Quem entra na conta**: seletor com as categorias juntas e separadas: **Todas as contas**, **Meus alunos** (vínculo ativo em
   `teacher_students`) e **Outras contas** (sem vínculo). Abre em Meus alunos.
5. **Engajamento** = dias com estudo nos últimos 7 dias: Nenhum = 0, Baixo = 1, Médio = 2 a 3, Alto = 4 a 5, Altíssimo = 6 a 7.
6. **Em Meus alunos, também um medidor de revisões feitas** (no período escolhido, total e por aluno).
7. **Status são duas coisas diferentes**:
   - **Situação** (Em dia 0 a 3 dias, Atenção 4 a 6, Parado 7+; a mesma regra da aba Alunos): útil já.
   - **Plano** (Grátis x Premium): importante no futuro. A autora **vai ter** cancelada, expirada e pagamento pendente quando houver
     venda; o bloco nasce preparado para receber esses estados sem refazer a tela.
8. **Badges: pode tirar** (confirmado em 2026-11-24, sabendo que "Pioneiro/a" não poderá mais ser dado à mão; os já dados ficam).
9. **"Dia com estudo" = só estudo de verdade** (lição, revisão, desafio, ditado, conjugação); abrir o site ou trocar de aba não conta.

## 4. Fase 0: levantamento (feito em 2026-11-24, só leitura)

Números da produção nesse dia: 40 contas, 15 alunos com vínculo ativo, 7 contas novas em 30 dias, 39 grátis e 1 Premium (o 1 Premium é a
própria admin: `plan_tier` espelha o papel; nenhum aluno é Premium). `usage_events` tem ~5.700 eventos desde 2026-09-07 (90 dias é leve).

- **Eventos**: tabela `usage_events` (`user_id, event_type, event_name, meta, created_at, session_id, language_app_key, device_type`).
  O Analytics baixa até 50 000 eventos para o navegador (páginas de 1000, `shared/admin-analytics.js:64-81`) e conta o dia em **UTC**
  (`analyticsDayKey`, `shared/admin-analytics-calc.js:144`): estudo às 22h de Brasília cai no dia seguinte.
- **Acessos por dia**: já calculados no Analytics (`activeByDay`, `admin-analytics-calc.js:376-392`).
- **Cadastros por dia**: não existe série; só o total (`fetchNewProfilesInWindow`, `admin-analytics.js:160-169`).
- **Situação Em dia/Atenção/Parado**: `tsuSituation` (`shared/teacher-students-ui.js:28-33`), a partir de `lastStudyDay` do progresso,
  lido pela RPC `get_teacher_student_overview` (070) **um aluno por vez** (até 5 em paralelo, `shared/admin-students.js:103-117`).
- **Revisões**: evento `review_answer` em `usage_events` (`trackReviewAnswer`, `shared/analytics.js:160-171`; origem no `meta.cardOrigin`)
  e, no Banco, `review_bank_reviews` (`via` aula/casa, `review_date`). A 070 agrega 7 e 30 dias para 1 aluno; não há contagem por dia.
- **Agregação no servidor para admin**: só existe `admin_public_deck_copy_stats` (079). Nada de contagem por dia.
- **Plano**: `profiles.plan_tier` ('free' | 'premium'), espelho de `account_roles` desde a 075 (professora e admin contam como premium).
- **Badges**: a aba só cria badges especiais e os dá à mão. Produção: "Turma da Prof. Brune" (15 contas, dado **automaticamente** pelo
  vínculo, trigger da 077: continua funcionando sem a aba), "Pioneiro/a" (2 contas, dado à mão) e "Embaixador/a" (ninguém).
  Tirar a aba **não apaga** nenhum badge já dado. `shared/admin-badges.js` continua carregado (tem `fetchAllProfiles`, usada pela aba Alunos).

## 5. Fase 1: aba "Visão Geral" (aprovada em 2026-11-24; revisada pelo revisor de planos no mesmo dia)

### 5.0 Correções da revisão (o que mudou em relação à primeira versão)
- Migration **145** (138 a 142 e 144 já existem na `main` e na produção; a 143 fica livre para quem a reservou. Primeiro foi escrita como 142 e renumerada em 2026-11-24 ao achar a `142_cards_digest_signing_key`).
- **Situação não é refeita em SQL**: a regra da aba Alunos tem detalhes (bloco do curso, `_account.lastStudyDay`, data local, estado
  "Sem estudo") que divergiriam. A Visão Geral reaproveita `studentLoadRows` + `tsuRowData` (`shared/admin-students.js`), então o
  número bate com a aba Alunos por construção. São **4 estados**: Em dia, Atenção, Parado, Sem estudo.
- **Modo aula não marca "dia com estudo"**: o evento `review_answer` com `event_name='class_mode'` é gravado quando a aluna abre o
  site depois da aula (não é estudo dela naquele dia). Fica fora.
- **Revisões sem contar duas vezes**, em dois números separados (como o bloco "Desempenho (aula e casa)" do Banco):
  **Em casa** = `usage_events` `review_answer` sem `class_mode`; **Na aula** = `review_bank_reviews` com `via='aula'` e
  `source='modo_aula'`, ligada ao aluno pelo vínculo (ou membros da turma), dia por `created_at` em São Paulo. Nunca somar `via='casa'`
  (repete o "Em casa") nem linhas importadas.
- **Admin e professora ficam fora** de todas as contagens e do bloco Plano.
- O e-mail diário da 141 (`teacher-cards-digest`) usa outra regra de "parado" (qualquer evento). Registrado para não confundir.

### 5.1 Definições (fixas, testadas)
- **Dia com estudo** (função `_is_study_event`): `lesson_complete` de `vocab_lesson`, `unit_checkpoint`, `flashcard_review`,
  `speed_review`, `match_game`, `challenge`, `dictation`, `conjugation_session`, `conj_game`, `hanzi_lesson`, `hanzi_review`; e
  `review_answer` de `flashcard`, `speed_review`, `hanzi`. Fora: `tab_switch`, `lesson_start`, `technical_*`, `report_submitted`,
  `course_restart*`, `comeback_*`, `class_mode`. Só `actor_type` `user`/`student`. Dia no fuso America/Sao_Paulo.
- **Últimos 7 dias** = hoje + 6 dias anteriores (São Paulo). O engajamento usa SEMPRE os últimos 7 dias, qualquer que seja o período
  escolhido (a tela diz isso). **Engajamento médio** = média de dias com estudo. **Conta nova** (criada há menos de 7 dias) é marcada.
- **Ativas no período** = pelo menos 1 dia com estudo. **Acessos** = sessões distintas (`session_id`), como no Analytics.
- Visão Geral conta o dia em São Paulo; o Analytics ainda conta em UTC (nota na tela; alinhar o Analytics depois).
- **Idioma**: filtra os eventos; a conta entra se tiver evento, bloco de progresso ou vínculo nesse idioma; conta sem idioma só em
  "Todos". Alunos de português estudam pelo site fr (`usage_events.language_app_key` só tem `frances`/`mandarim`).

### 5.2 Banco (migration 145, Staging antes da produção; skill `migration-supabase`)
- `_is_study_event(type, name)` (imutável).
- `admin_overview_stats(p_days, p_scope, p_language)`: séries diárias com `generate_series` (dia vazio = 0; datas em texto
  `AAAA-MM-DD`), acessos, contas ativas, cadastros, faixas de engajamento com a lista de cada faixa (só `user_id`, nome, @ e números),
  contas por plano.
- `admin_overview_reviews(p_days, p_language)`: revisões Em casa e Na aula por aluno com vínculo.
- Padrão de segurança do projeto: `security definer`, `stable`, `set search_path = public`, checagem `public.is_admin()` com
  `raise exception 'not_authorized' using errcode = '42501'`, `revoke all ... from public, anon`, `grant execute ... to authenticated`,
  entradas validadas (`p_days` em 7/30/90, `p_scope` e `p_language` em lista fechada). Filtro de data com o fuso do lado da constante.
- Teste em Postgres local (padrão de `tests/banco-revisao-compartilhado/run.sh`): admin vê; não admin e anônimo recebem erro;
  `class_mode` não conta; `via='casa'` não soma; estudo às 22h de Brasília cai no dia certo.

### 5.3 Tela
- Peças `shared/admin-overview-ui.js` (dado -> HTML, teste em Node) e controlador `shared/admin-overview.js`, no Design System do
  painel. Gráficos em SVG feito à mão: `role="img"` com resumo, valores também em texto, barras clicáveis como `<button>`, cores só
  por tokens, poucos rótulos de eixo no celular. Datas montadas como `new Date(a, m-1, d)` (sem mudar de dia).
- Topo: período (7 / 30 / 90 dias), categoria (Meus alunos | Outras contas | Todas as contas), idioma.
- Números, linhas (acessos e cadastros por dia), barras de engajamento clicáveis (lista de quem está na faixa, com atalho para a ficha).
- Só em Meus alunos: Situação (4 estados, clicável) e Revisões (Em casa e Na aula, total e por aluno).
- Plano: por enquanto só números (hoje 0 Premium entre os alunos); o gráfico entra quando houver venda e os estados cancelada,
  expirada e pagamento pendente.
- Estados vazios: categoria sem contas, faixa vazia sem clique, série zerada, e falha da consulta mostra aviso (nunca "0").
- Textos em pt-BR e en (`t()`); fica em `shared/` e liga nos `index.html` de fr e zh.

### 5.4 Tirar a aba Badges
- Sai o botão `data-admin-section="badges"`; `ADMIN_PANEL_STATE`, a lista de seções e o "volta para" de `shared/admin-panel.js`
  passam a usar a Visão Geral; `is-active`/`aria-selected` vão para o botão novo (fr e zh).
- Ficam: `#view-admin-badges`, `data-tab="admin-badges"`, CSS `[data-active-tab="admin-badges"]`, `data-admin-section`, o script
  `admin-badges.js` (tem `fetchAllProfiles`, usada pela aba Alunos) e `test_badges_ui_unit.js`.
- `test_badges_playwright.js` é aposentado (a aba deixa de existir); listas de abas atualizadas nos outros testes; chaves
  `panel.tab.badges`/`admin.panel.tab.badges` conferidas no scan de i18n; cabeçalho de `admin-panel.js` e `.claude/rules/admin-professora.md` atualizados.

### 5.5 Testes e conferência
Node (peças), Postgres local (RPCs), Playwright da aba, regressão de `tests/painel-admin/`, `tests/painel-professora/` e
`tests/painel-alunos/`, capturas fr/zh × claro/escuro e celular. Na produção (com autorização), a Situação tem que bater 15/15 com a aba Alunos.

### 5.6 Respostas da autora (2026-11-24)
- **Desafios e Ditados x Situação**: por agora a tela só explica a diferença numa frase (engajamento conta Desafios e Ditados; a
  Situação usa o "último dia de estudo", que eles não atualizam). Corrigir os Desafios fica para depois, como tarefa separada.
- **"Meus alunos"** = vínculo ativo com a admin; ex-alunas ficam em "Outras contas". Confirmado.
- **Filtro "Português" fica visível.** Os alunos de português vão estudar pelo site de português quando ele existir; até lá o
  filtro mostra pouco ou nada, e a tela não esconde a opção.

## 6. Fase 2: "Precisa de você" e saúde das rotinas (depois da Fase 1)

Uma caixa no topo da Visão Geral com o que pede ação: reports abertos, pedidos de alunas no Banco (cortar, corrigir), aulas para
conferir (Notion e Google Agenda) e itens pendentes da rotina do Banco. Mais uma luz verde/vermelha por rotina automática (rotina da
madrugada do Banco, Google Agenda, Notion, avisos e e-mails) com a última vez que rodou certo. A autora escolhe os itens antes.

## 7. Fase 3: menu lateral único (depois de usar a Visão Geral)

Juntar Admin e Professora num menu lateral, como no vídeo. Só com prévia visual aprovada.

## 8. Registro de entregas

| Data | O quê | Onde |
|---|---|---|
| 2026-11-24 | Migration `145_admin_overview` (primeiro escrita como 142) (4 funções só de leitura: `_is_study_event`, `_admin_overview_accounts` (interna, fechada), `admin_overview_stats`, `admin_overview_reviews`) | Postgres local: `tests/central-de-controle/run.sh` 29/29. **Staging**: versão `20261124023521` (gravada com o nome `142_admin_overview`) (grants conferidos; sem login = `not_authorized`). **Produção: NÃO aplicada** (aguarda a autora). |
