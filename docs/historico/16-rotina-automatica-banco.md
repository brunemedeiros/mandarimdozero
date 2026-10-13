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
  - status vem da regra: dúvida, sensível ou sugestão => `pendente`; senão `aprovado` (a tarefa não consegue mandar `cortado`);
  - duplicado por chave ou por conteúdo (tipo + pergunta + resposta normalizados) é ignorado; chave sem `key` = hash determinístico;
  - `lesson_dates`: mantém as passadas, troca as futuras; `last_entry_read` só avança;
  - Récap da aula (`recap_date`): `rbSelectRecap` (tamanho 8), não refaz se já existe para a data;
  - cartões: só aluno com conta vinculada, pela mesma regra (`rbReadyToDeliver`) e o mesmo motor (`rbBuildCard`) da tela "Gerar cartões",
    gravados por `agent_approve_review_bank_item` (só `service_role` executa); respeita "geração automática" ligada/desligada;
  - cada rodada grava uma linha em `review_bank_agent_runs` (a professora lê; só a função grava).

## Migration 086 (`086_review_bank_agent.sql`)
`agent_managed` em `review_bank_students`, tabela `review_bank_agent_runs`, função `agent_approve_review_bank_item`.
Staging: aplicada em 2026-10-13. Produção: NÃO.

## Deploy (feito pela ferramenta MCP, sem CLI)
O motor gerado tem ~288 KB e não cabe inline na chamada. O deploy leva `index.ts` e `core.mjs` iguais aos do repositório e um
`engine.generated.mjs` de 2 linhas que reexporta o motor do GitHub **fixado no commit** (`raw.githubusercontent.com/.../<sha>/...`).
O bundle é montado no deploy; em execução não há dependência do GitHub. Mudou código em `shared/` ou na função: push, novo deploy com o novo SHA.
- Staging: deploy v1 feito (commit 69ad254). Boot, gateway (401 sem JWT), 503 sem secrets e 405 em GET conferidos ao vivo.
  Falta: a autora digitar os 2 secrets no Staging para o teste ao vivo (`ping` e `ingest` com dados de teste).
- Produção: NÃO implantada.

## Virada por aluno (não aplicar tudo de uma vez)
1. A autora já importou os 24 alunos no site (todos com `agent_managed = false`). Para um aluno migrar: conta criada e vínculo ativo + vinculado no Banco.
2. Gerar um arquivo novo só com o estado atual daquele aluno no artifact (a importação só insere o que falta), importar, conferir.
3. No MESMO dia, antes da tarefa das 01:50: marcar "Atualizar automaticamente" no site e arquivar o aluno no artifact (a tarefa antiga ignora arquivados). Arquivar tira o acesso dele ao `#revisar`.
4. A tarefa nova (texto próprio, chama a função) cuida só dos gerenciados. A antiga só sai do ar quando o último aluno migrar.

## Pendências
- Teste ao vivo no Staging (secrets + `ping` + `ingest`) e teste de chamada de escrita a partir do ambiente da tarefa agendada (rede avaliada por chamada).
- Escrever o texto da tarefa nova (passos: `state` -> agenda -> caderno -> `ingest`); só ligar depois de testada.
- Produção: aplicar 086, implantar a função, digitar os secrets lá, só com autorização da autora naquela etapa.
- Interface: mostrar "última rodada" (lê `review_bank_agent_runs`).
