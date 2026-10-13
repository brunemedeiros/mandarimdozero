# Teste de rede da tarefa agendada (Staging)

Serve para provar que a tarefa agendada consegue fazer uma chamada de ESCRITA (POST) até a função `review-bank-agent` a partir do ambiente dela.
É só um "ping" e uma leitura (`state`); não grava nada. Usa o Staging e o token descartável de teste.

Como usar: claude.ai > Tarefas agendadas > nova tarefa, nome "TESTE de rede (apagar depois)", permissões Auto, frequência qualquer
(se não houver "uma vez", escolha diária e use "Executar agora"). Colar o texto abaixo em Instruções. Rodar uma vez, ler a resposta e APAGAR a tarefa.

## Texto das instruções

Esta é uma tarefa de teste de rede. Faça somente o que está abaixo, sem perguntar nada e sem ler ou gravar mais nada. Responda em português do Brasil.

1. Rode no Bash exatamente este comando e guarde a saída:

curl -sS -m 60 -X POST 'https://ilfjzizjfcmhibkhwber.supabase.co/functions/v1/review-bank-agent' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZmp6aXpqZmNtaGlia2h3YmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTg5NjQsImV4cCI6MjEwNjQ3NDk2NH0.lNNVvpwyiOoYOZ3peECh0JtR61nXA-6KhUTNlcvWE6I' -H 'x-agent-token: f72f7ac39ce849663a4c276a0d94af749dc0486b6f25b62d' -H 'content-type: application/json' -d '{"action":"ping"}' -w '\n[HTTP %{http_code}]\n'

2. Rode o mesmo comando trocando o corpo para {"action":"state"} e conte quantos alunos vieram em "students".

3. Responda apenas com: o código HTTP e o corpo da chamada 1, o código HTTP e a quantidade de alunos da chamada 2. Se qualquer chamada falhar ou for bloqueada
(erro de rede, host não permitido, 403, tempo esgotado), copie a mensagem de erro exatamente como apareceu e diga qual comando falhou. Não tente outro caminho.

## Como ler o resultado
- `[HTTP 200]` com `"ok":true`: a rede da tarefa deixa chegar. Pode seguir para o texto da tarefa nova.
- `[HTTP 401]`/`503`: a rede passou, mas o token ou os segredos do Staging mudaram; me avise.
- Erro de rede, "host not allowed", 403 do proxy ou tempo esgotado: o ambiente bloqueia o endereço. Solução: no ambiente da tarefa, em Acesso à rede,
  liberar `*.supabase.co` (ou o endereço `ilfjzizjfcmhibkhwber.supabase.co` e depois `eigjocalzwamisgqilhg.supabase.co`). Se não houver como, o plano B é o conector do Supabase, que eu não recomendo.
