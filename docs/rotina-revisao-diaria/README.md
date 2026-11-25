# Revisão diária do trabalho (rotina da madrugada)

Decidida pela autora em 2026-11-10 (grilling nesta data). Texto da tarefa: `tarefa.txt` (colar de novo na tarefa agendada se mudar).

## O que ela faz
Às 02h20 (America/Sao_Paulo) lê tudo das últimas 24 horas (PRs mesclados e abertos, commits direto na `main`),
procura problemas que a sessão não percebeu, classifica em Severo / Médio / Leve e manda um resumo matinal por
notificação. **Só lê**: não corrige, não comenta, não envia nada às sessões.

## Decisões (Q1 a Q14)
| # | Decisão |
|---|---|
| Q1 | Revisão depois de publicar (madrugada); checagem na abertura do PR fica para depois, se aparecerem muitos Severos |
| Q2 | PRs mesclados + abertos + conferência só leitura na produção do que o PR afirma (migrations, Edge Functions); rotinas do Banco e do Recap ficam fora |
| Q3 | Janela = últimas 24 horas; horário 02h20 (as rotinas das 01h50 já terminaram) |
| Q4 | Escala Severo / Médio / Leve (definições em `tarefa.txt`) |
| Q5 | Maestro no Sonnet; testes no Haiku (agente `regressao`); Opus só nos PRs arriscados |
| Q6 | Encaminhar às sessões = texto pronto no resumo para a autora colar; o agente não envia (passo B, enviar com aprovação, fica para depois) |
| Q7 | Notificação no celular; silêncio nos dias sem PR |
| Q8 | Memória: lê o relatório da noite anterior (bloco "Pendências em aberto") |
| Q9 | Paridade: só aponta o que não está classificado em `docs/auditoria-paridade-fr-zh.md`; pt só como nota |
| Q10 | Testes só das áreas mexidas (+ `tests/paridade-sites/` quando tocar fr/zh); nunca `capturas_*.js` |
| Q11 | Conectores: só Supabase (list_migrations, list_edge_functions, get_edge_function, get_advisors) e Claude_Code_Remote (leitura). GitHub só leitura por instrução (não há como travar por ferramenta) |
| Q12 | Lê só as mensagens da autora nas sessões dos PRs arriscados |
| Q13 | Formato do resumo em `tarefa.txt`, Passo 4 |
| Q14 | Execução de teste antes de agendar |

## Grátis x Premium
Não se aplica (ferramenta interna da autora, nada muda para alunos).

## Ajustes depois da experiência
- 2026-11-13: sem memória entre noites (o conector Claude_Code_Remote não chega à tarefa), então teste com falha é comparado com a `main` de 24 horas antes; Opus obrigatório nos PRs arriscados; histórico completo do repositório.
- 2026-11-24 (rotina aprovada): perda de dado de aluno, mesmo indireta, é sempre Severo (em 16/11 o apagamento em cascata do histórico do Modo aula ao juntar fichas saiu como Médio); no máximo 3 Leves; nada de mensagens sobre o próprio funcionamento.
- Entrega: o e-mail das tarefas agendadas não chega ao Gmail da autora; vale a notificação no celular (ligada em 2026-11-18).
- 2026-11-24 (depois da revisão de 24/11, que custou ~US$ 5,50 a preço de tabela com 5 Opus): Opus só nos PRs CRÍTICOS (migration, dado de aluno, FSRS, produção); os outros arriscados vão para um ajudante Sonnet. A regra de só leitura vai copiada para cada ajudante e eles não usam o Supabase (um Opus tinha rodado `execute_sql` com SELECT). Severo leva a etiqueta "já no ar" ou "corrigir antes de ligar". PR sem link de sessão aparece pela branch.
- 2026-11-25: a autora não achava as conversas pela branch (a branch muda e o app mostra o título da conversa). O link da conversa passa a vir do texto do PR ou, se faltar, da linha "Claude-Session:" dos commits; a branch só em último caso.
- 2026-11-25 (autorizado): memória entre noites pelo arquivo `pendencias.md` na branch `revisao-diaria-pendencias` (única exceção ao "só leitura"; nunca na `main`). Cada pendência fica embaixo da conversa que precisa resolvê-la; toda noite a rotina confere quais foram resolvidas e o resumo traz "Resolvido desde ontem" e "Continua aberto". Todos os Leves voltam para a notificação.
