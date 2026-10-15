# Rotina automática do Banco de Revisão (tarefa da madrugada -> site)

Decidido com a autora em 2026-10-13. Substitui, aluno por aluno, a tarefa agendada "Recap dos alunos" que hoje grava no artifact.

## Ideia
- A parte inteligente continua na tarefa agendada do Claude (ler o caderno no Drive, a agenda no Calendar, aplicar o Manual).
  Só muda o destino: em vez do banco do artifact, ela chama a Edge Function `review-bank-agent`.
- **Cada aluno tem um único dono**: `review_bank_students.agent_managed = false` (ainda do artifact, padrão) ou `true` (do site).
  A caixa "Atualizar automaticamente toda madrugada" está no formulário do aluno (Professora > Cartões > Banco > Alunos > Editar).
- Alunos sem conta continuam no artifact (área `#revisar` com código) até criarem conta; a tarefa antiga segue igual para eles.

## Função `supabase/functions/review-bank-agent`
- `index.ts` (Deno, borda), `core.mjs` (lógica pura, testada com banco falso), `engine.generated.mjs` (GERADO por
  `node scripts/build-review-bank-agent.js` a partir dos MESMOS `shared/*.js` do navegador: motor de cartões + modelo do Banco + parser da importação).
  Teste `test_agent_core.js` falha se o gerado estiver desatualizado.
- Autenticação: JWT do gateway (`verify_jwt: true`, serve a chave anon) + cabeçalho `x-agent-token` = secret `REVIEW_BANK_AGENT_TOKEN`.
  A professora vem do secret `REVIEW_BANK_AGENT_TEACHER_ID`, nunca do corpo. Sem secrets: 503. Usa service role, então toda consulta filtra por teacher.
- Os valores dos secrets a autora digita no painel do Supabase (a ferramenta MCP nunca vê o valor). O token também vai no texto da tarefa agendada.
- Ações (POST JSON):
  - `ping`: confere token, secrets e rede; devolve `managed_students`.
  - `state`: alunos gerenciados e ativos (id, nome, idioma, língua de referência, caderno, nomes na agenda, datas de aula, última entrada lida,
    e-mail da conta vinculada) com os itens existentes compactos (para a tarefa não repetir), `manual_markdown`, `auto_generate`.
  - `register_student {name, language, reference, agenda_names, notebook_id, last_entry_read, started_on}`: cria aluno novo já gerenciado (idempotente por nome+idioma).
  - `ingest {students:[{student_id, items:[{key?, type, q, a, wrong, gap, note, doubt, sensitive, proposal, date}], lesson_dates, last_entry_read, recap_date}]}`.
- Regras do `ingest` (nenhuma delas depende do texto da tarefa):
  - só aluno do Banco da professora com `agent_managed = true`; outros vão para `rejected`;
  - só INSERE (itens e recaps). Nunca edita, apaga, corta nem aprova item existente; nunca toca em progresso (FSRS);
  - status vem da regra, nunca do que a tarefa manda: dúvida, sensível, linha `[pessoal]` (a marca é tirada do texto), sugestão ou pedido de
    `cortado` => `pendente` (com "Para conferir" preenchido, senão a geração automática entregaria o cartão); só o item limpo entra `aprovado`;
    com "geração automática" desligada, item limpo de aluno vinculado também entra `pendente` (aluno sem conta segue aprovado: não há cartão a gerar);
  - duplicado por chave ou por conteúdo (tipo + pergunta + resposta normalizados) é ignorado; chave sem `key` = hash determinístico;
  - `lesson_dates`: mantém as passadas, troca as futuras; `last_entry_read` só avança;
  - Récap da aula (`recap_date`): `rbSelectRecap` (tamanho 8), não refaz se já existe para a data;
  - cartões: só aluno com conta vinculada, pela mesma regra (`rbReadyToDeliver`) e o mesmo motor (`rbBuildCard`) da tela "Gerar cartões",
    gravados por `agent_approve_review_bank_item` (só `service_role` executa); respeita "geração automática" ligada/desligada;
  - cada rodada grava uma linha em `review_bank_agent_runs` (a professora lê; só a função grava).

## Migrations 089 e 090 (no Staging aparecem como `086_review_bank_agent` e `087_review_bank_agent_deck_fix`)
Renumeradas de 086/087 para 089/090 em 2026-10-13: outras conversas já usavam 086 (friends_streak), 087 (mural) e 088 (revoke_anon_ensure_user_decks).
- `089_review_bank_agent.sql`: `agent_managed` em `review_bank_students`, tabela `review_bank_agent_runs`, função `agent_approve_review_bank_item`.
- `090_review_bank_agent_deck_fix.sql`: corrige a função da 089 (deck "Cartões da professora" com `auth.uid()` nulo). Aplicar sempre as duas, em ordem.
Staging e produção: aplicadas em 2026-10-13 (produção: versões 20261013172151 e 20261013172156; conferido: 24 alunos, 2076 itens e 75 cartões do Banco intactos, `agent_managed` falso em todos).

## Deploy (feito pela ferramenta MCP, sem CLI)
O motor gerado tem ~288 KB e não cabe inline na chamada. O deploy leva `index.ts` (sem os comentários longos) e dois atalhos de 2 linhas
(`engine.generated.mjs` e `core.mjs`) que reexportam os arquivos do GitHub **fixados no commit** (`raw.githubusercontent.com/.../<sha>/...`).
O bundle é montado no deploy; em execução não há dependência do GitHub. Mudou código em `shared/` ou na função: push, novo deploy com o novo SHA.
A ferramenta de segredos do MCP pede que a autora digite o valor no painel do Supabase (nunca passa pelo chat).
- Staging: função v7 (commit adf0eb5), migrations 086 e 087, secrets digitados pela autora. Teste ao vivo feito em 2026-10-13 com alunos "ZZ":
  ping, state (traz o e-mail da conta vinculada), ingest com todos os casos (limpo, erro, estrutura, verbo, dúvida, sensível, `[pessoal]`, cortado, duplicado,
  inválido), cartões em "Cartões da professora" (modo digitar para erro, observação preservada), repetir a rodada não duplica nada, aluno sem conta não gera cartão,
  aluno não gerenciado e id inexistente rejeitados, register_student idempotente, token errado 401, JSON inválido 400, geração automática desligada.
  O teste achou um bug que o teste local não pegou: `ensure_teacher_decks` confere `auth.uid()`, nulo no service role (087 corrige assumindo a identidade da professora
  só dentro da transação). O teste local passou antes por herdar as claims de uma sessão anterior; agora a sessão é limpa antes do service_role.
  Dados de teste ainda no Staging: limpar com `tests/banco-revisao/limpar_staging_zz.sql` (a ferramenta MCP não executa DELETE: trava em 60 s).
- Produção: função v1 implantada em 2026-10-13 (commit adf0eb5), TRAVADA: sem os 2 segredos responde 503 `not_configured`. A autora digita os segredos de produção (id da professora `33c478d9-b6f4-4b5a-8798-a037672edce4` e um token novo, privado) e só então a função passa a aceitar chamadas.

## Virada por aluno (não aplicar tudo de uma vez)
1. A autora já importou os 24 alunos no site (todos com `agent_managed = false`). Para um aluno migrar: conta criada e vínculo ativo + vinculado no Banco.
2. Gerar um arquivo novo só com o estado atual daquele aluno no artifact (a importação só insere o que falta), importar, conferir.
3. No MESMO dia, antes da tarefa das 01:50: marcar "Atualizar automaticamente" no site e arquivar o aluno no artifact (a tarefa antiga ignora arquivados). Arquivar tira o acesso dele ao `#revisar`.
4. A tarefa nova (texto próprio, chama a função) cuida só dos gerenciados. A antiga só sai do ar quando o último aluno migrar.

## Teste de rede da tarefa agendada (2026-10-14): bloqueado pelo classificador
A versão 1 do teste (`docs/rotina-banco/teste-de-rede.md`) foi recusada pela própria sessão da tarefa (modo Auto) como "Exfil Scouting / Data Exfiltration":
tokens dentro de um `curl` para um endereço desconhecido e pedido de contagem de alunos. Não é firewall. Próximo passo: versão 2 (só ping, autorização da dona dita às claras);
se também for bloqueada, plano B sem HTTP (conector do Supabase + tabela caixa de entrada processada dentro do Supabase). Segredos de produção conferidos: a função
responde 401 (não 503) a um token inventado, então os dois segredos existem lá.

### Versão 2 (2026-10-14): bloqueada de novo
Mesmo com a autorização da dona dita às claras e só um ping, o classificador negou o `curl` (motivo `[Exfil Scouting]`). Conclusão: no modo Auto, sem ninguém para aprovar,
qualquer POST a um endereço que não seja um conector já autorizado é barrado. Não insistir nem tentar outra ferramenta para mandar a mesma requisição.
Caminho escolhido para propor (aguarda o aval da autora): plano B sem HTTP, com `pg_net`, `pg_cron` e `supabase_vault`, que já estão instalados na produção.
Desenho: a tarefa lê o estado por uma função SQL e grava a entrega numa tabela caixa de entrada pelo conector do Supabase; um `pg_cron` chama a função `review-bank-agent`
(ação `process_inbox`) por dentro do Supabase, com o token guardado no Vault. A função processa (itens, recap, cartões) e devolve o resultado na própria linha da caixa.
Bônus: recap e geração de cartões podem rodar pelo cron mesmo que a tarefa falhe numa noite. Na tarefa nova, ligar só os conectores necessários (Drive, Agenda, Supabase).

## Plano B construído e testado no Staging (2026-10-15)
Migrations `097` (no Staging aparece como `091`; renumerada porque as 091 a 096 já eram de outras conversas) (caixa de entrada, funções `review_bank_agent_state`/`agent_inbox_submit`, gatilho com `pg_net`, `agent_inbox_sweep`, `agent_inbox_claim`), `098` (no Staging `092`) (o motivo da falha de envio fica em `error`) e `099` (no Staging `093`)
(estado leve + `review_bank_agent_items(aluno)`). Segredos do Vault: `rb_agent_url`, `rb_agent_anon`, `rb_agent_token`, `rb_agent_teacher`. Ações novas da função: `process_inbox` e `nightly`.
Agendamentos: `docs/rotina-banco/agendar-cron.sql` (`rb-agent-sweep` a cada 5 min; `rb-agent-nightly` às 05:30 UTC = 02:30 em Brasília). Texto da tarefa: `docs/rotina-banco/tarefa-nova.md`.
Teste ao vivo no Staging: `state` leve, entrega por `agent_inbox_submit`, o gatilho chamou a função (HTTP 200), a linha foi para `feito` com o resultado, aluno novo cadastrado, itens limpos aprovados e com cartão (vinculada),
`[pessoal]`/dúvida/"cortado" pendentes, recap criado, `nightly` pelo cron OK. Lição: o Staging não tinha `pg_net` nem `pg_cron` (criados lá para o teste; a produção já os tinha) e o gatilho engolia o erro (corrigido na 092).
Testes locais: SQL 83/83, lógica 44/44. Produção: ainda NÃO aplicado (097 a 099, segredos do Vault, cron, nova versão da função).

## Pendências
- Teste de chamada de escrita a partir do ambiente da tarefa agendada: versão 1 bloqueada pelo classificador (ver acima); rodar a versão 2.
- Escrever o texto da tarefa nova (passos: `state` -> agenda -> caderno -> `ingest`); só ligar depois de testada.
- Produção: migrations e função feitas; falta a autora digitar os segredos lá e o merge da branch (caixa "Atualizar automaticamente" no formulário do aluno).
- Interface: mostrar "última rodada" (lê `review_bank_agent_runs`).
