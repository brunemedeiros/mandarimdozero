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

Números da produção nesse dia: 40 contas, 15 alunos com vínculo ativo, 7 contas novas em 30 dias, 39 grátis e 1 Premium.

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

## 5. Fase 1: aba "Visão Geral" (aprovada em 2026-11-24)

### 5.1 Banco (migration, Staging antes da produção; skill `migration-supabase`)
Uma RPC só de leitura, `security definer`, que recusa quem não é admin: `admin_overview_stats(p_days, p_scope, p_language)`.
Faz as contas no servidor e devolve só números (sem nome, e-mail ou texto de aluno, exceto na lista de quem está em cada faixa):
- acessos e contas únicas por dia; cadastros por dia;
- dias com estudo nos últimos 7 dias por conta, já agrupados nas 5 faixas, com a lista de contas de cada faixa;
- situação (Em dia/Atenção/Parado) dos alunos com vínculo, pela mesma regra da aba Alunos;
- revisões feitas no período por aluno com vínculo;
- contas por plano (e, no futuro, por estado de assinatura).

Regras: dia contado no **fuso de São Paulo**, não em UTC; "dia com estudo" = evento de estudo de verdade (lição, revisão, desafio,
ditado, conjugação), **sem** contar só abrir o site ou trocar de aba (decisão 9); o tipo exato da lista de eventos é fechado na implementação e
registrado aqui. Ponto a conferir antes de codar: no Modo aula a revisão gera `review_answer` **e** linha em `review_bank_reviews`;
a contagem não pode somar a mesma revisão duas vezes.

### 5.2 Tela
- Primeira aba do Painel de Admin; peças em `shared/admin-overview-ui.js` (dado -> HTML, testável em Node) e controlador
  `shared/admin-overview.js`, no Design System do painel (`p-indicadores`, `p-barras`). Gráficos de linha e rosca em SVG feito à mão,
  sem biblioteca nova.
- Topo: período (7 / 30 / 90 dias), categoria (Meus alunos | Outras contas | Todas as contas), idioma.
- Números: contas na categoria, ativas no período, engajamento médio, cadastros novos, Premium.
- Linhas: acessos por dia e cadastros por dia.
- Barras: distribuição de engajamento. **Clicar numa barra abre a lista de quem está nela**, com atalho para a ficha do aluno.
- Bloco "Situação" (só Meus alunos): Em dia / Atenção / Parado, clicável.
- Bloco "Revisões feitas" (só Meus alunos): total do período e por aluno.
- Bloco "Plano": Grátis x Premium hoje; cancelada/expirada/pagamento pendente quando houver venda.
- Textos em pt-BR e en (`t()`), nada fixo em português; vale para fr, zh e os próximos sites (fica em `shared/`, liga nos dois `index.html`).

### 5.3 Tirar a aba Badges
- Sai o botão `data-admin-section="badges"`; a seção padrão vira a Visão Geral.
- Ficam (testes antigos e rotas de aviso dependem deles): `#view-admin-badges`, `data-tab="admin-badges"`, `data-admin-section` e o script `admin-badges.js`.
- Testes a atualizar (lista de abas e `aba: 'badges'`): `tests/painel-admin/test_{analytics,badges,notifications,reports,planos}_playwright.js`,
  `tests/painel-admin/harness.js`, `tests/painel-professora/test_playwright.js:613-616`.

### 5.4 Testes e conferência
Teste das peças em Node, teste da RPC no Postgres local (admin vê, não admin recebe erro), Playwright da aba, regressão de
`tests/painel-admin/` e `tests/painel-professora/`, capturas fr/zh × claro/escuro e celular (skill `teste-navegador`).

## 6. Fase 2: "Precisa de você" e saúde das rotinas (depois da Fase 1)

Uma caixa no topo da Visão Geral com o que pede ação: reports abertos, pedidos de alunas no Banco (cortar, corrigir), aulas para
conferir (Notion e Google Agenda) e itens pendentes da rotina do Banco. Mais uma luz verde/vermelha por rotina automática (rotina da
madrugada do Banco, Google Agenda, Notion, avisos e e-mails) com a última vez que rodou certo. A autora escolhe os itens antes.

## 7. Fase 3: menu lateral único (depois de usar a Visão Geral)

Juntar Admin e Professora num menu lateral, como no vídeo. Só com prévia visual aprovada.
