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
