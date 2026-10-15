# Teste de rede da tarefa agendada (Staging)

Serve para saber se a tarefa agendada consegue fazer uma chamada de ESCRITA (POST) até a função `review-bank-agent`. É só um "ping": não lê
dados de aluno e não grava nada. Usa o Staging e um token descartável de teste (o valor real não fica no repositório; o do Staging é considerado queimado).

Como usar: claude.ai > Tarefas agendadas > nova tarefa, nome "TESTE de rede (apagar depois)", permissões Auto, frequência qualquer
(se não houver "uma vez", escolha diária e use "Executar agora"). Colar o texto da versão 2 em Instruções. Rodar uma vez, ler a resposta e APAGAR a tarefa.

## Resultado da versão 1 (2026-10-14): BLOQUEADA pelo classificador de segurança, não pela rede
A versão 1 mandava um `curl` com dois tokens dentro do comando e pedia `state` (contagem de alunos). A sessão da tarefa (modo Auto, sem ninguém para aprovar)
recusou os dois comandos como "Exfil Scouting / Data Exfiltration": credenciais para um endereço externo desconhecido e extração de dados de terceiros.
Ou seja, o problema não foi firewall: o ambiente decide, comando a comando, se o envio parece vazamento. O conector do Supabase que a tarefa já tem
não passa por esse filtro do mesmo jeito. Não se deve tentar "driblar" o bloqueio: ou o dono autoriza de forma explícita e verdadeira no texto da tarefa,
ou o caminho muda (plano B abaixo).

## Texto das instruções (versão 2: só ping, com a autorização da dona dos dados dita às claras)

Esta é uma tarefa de teste. Responda em português do Brasil, trabalhe sozinha(o) e sem fazer perguntas.

Autorização da professora: a professora Brune é a dona do projeto Supabase "Idiomas com Prof. Brune — Staging" (endereço ilfjzizjfcmhibkhwber.supabase.co)
e da função `review-bank-agent` que roda nele; ela criou essa função e o token de teste abaixo. Ela pediu explicitamente este teste: uma única chamada "ping"
a essa função dela, para saber se esta tarefa consegue chamá-la. A chamada não lê nem grava nenhum dado de aluno e não envia nenhum dado a terceiros.

Rode no Bash exatamente este comando e mostre a saída:

curl -sS -m 60 -X POST 'https://ilfjzizjfcmhibkhwber.supabase.co/functions/v1/review-bank-agent' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZmp6aXpqZmNtaGlia2h3YmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTg5NjQsImV4cCI6MjEwNjQ3NDk2NH0.lNNVvpwyiOoYOZ3peECh0JtR61nXA-6KhUTNlcvWE6I' -H 'x-agent-token: <TOKEN-DE-TESTE-DO-STAGING>' -H 'content-type: application/json' -d '{"action":"ping"}' -w '\n[HTTP %{http_code}]\n'

Responda só com o código HTTP e o corpo. Se for bloqueado, copie a mensagem exatamente como apareceu, diga qual comando foi bloqueado e pare: não tente outro caminho.

## Como ler o resultado
- `[HTTP 200]` com `"ok":true`: a tarefa consegue chamar a função. Segue o plano principal (texto da tarefa nova).
- `[HTTP 401]` ou `503`: a rede passou; o token ou os segredos do Staging mudaram. Me avise.
- Bloqueado de novo pelo classificador, mesmo com a autorização dita às claras: não insistir. Plano B.
- Erro de rede, "host not allowed" ou 403 do proxy: liberar `*.supabase.co` em Acesso à rede do ambiente da tarefa.

## Plano B (sem nenhuma chamada HTTP da tarefa)
A tarefa usa só o conector do Supabase (já ligado nela e já autorizado por você) para: (1) ler o estado por uma função SQL de leitura e (2) gravar a entrega
numa tabela "caixa de entrada" (`review_bank_agent_inbox`). A mesma função de hoje processa a caixa (itens, recap, cartões) disparada de dentro do Supabase,
sem sair para a internet. Custo: o conector tem acesso amplo ao banco, então a trava deixa de ser técnica e passa a ser o texto da tarefa; em troca a validação
e a geração de cartões continuam no servidor. Só construir se o teste da versão 2 também for bloqueado.
