# Link de agenda com o domínio da Prof. Brune (agenda.profbrune.com.br)

Objetivo: o link que professoras e alunos assinam no Google Agenda passa a ser
`https://agenda.profbrune.com.br/<senha de 16 letras>` em vez do endereço técnico do Supabase.

Como funciona: o Netlify atende `agenda.profbrune.com.br` e repassa cada pedido, na hora, para a Edge Function
`class-calendar-feed` (Supabase, produção). Ele não guarda dado nenhum. É configurado **uma vez só**: aulas novas,
professoras novas e links novos não exigem nada no Netlify. A regra fica em `infra/agenda-netlify/netlify.toml`.

Custo: plano grátis do Netlify (o arquivo de cada agenda é pequeno e o Google busca poucas vezes por dia).

## 1. Netlify (uma vez)

1. Entrar em https://app.netlify.com (a conta antiga serve; se pedir, entrar com o GitHub).
2. **Add new project** (ou "Add new site") > **Import an existing project** > **GitHub** > autorizar e escolher
   o repositório `brunemedeiros/mandarimdozero`.
3. Na tela de configuração:
   - **Branch to deploy**: `main`
   - **Base directory**: `infra/agenda-netlify`
   - **Build command** e **Publish directory**: deixar como o Netlify preencher (o arquivo `netlify.toml` da pasta já
     diz o que fazer).
4. **Deploy**. Quando terminar, o Netlify dá um endereço tipo `nome-aleatorio.netlify.app`.
   Dá para trocar o nome em **Project configuration > Change project name** (sugestão: `agenda-profbrune`).
5. Teste rápido: abrir `https://agenda-profbrune.netlify.app/` deve levar para o site (app.profbrune.com.br).
6. **Domain management** > **Add a domain** > digitar `agenda.profbrune.com.br` > confirmar.
   O Netlify vai mostrar que falta apontar o DNS: anotar o valor que ele pede (é o endereço `....netlify.app`).

Depois disso o Netlify só publica de novo se a pasta `infra/agenda-netlify` mudar (o resto do repositório não dispara nada).

## 2. Registro.br (uma vez, igual ao `app`)

1. Entrar em https://registro.br > **Domínios** > `profbrune.com.br` > **DNS** > **Configurar zona DNS**
   (onde já está o registro do `app`).
2. **Nova entrada**:
   - Tipo: `CNAME`
   - Nome: `agenda`
   - Valor/Dados: o endereço do Netlify, por exemplo `agenda-profbrune.netlify.app` (terminar com ponto se o
     Registro.br pedir: `agenda-profbrune.netlify.app.`)
3. Salvar. A propagação costuma levar de alguns minutos a algumas horas.

## 3. Cadeado (https)

No Netlify, em **Domain management > HTTPS**, o certificado sai sozinho depois que o DNS propagar
("Let's Encrypt certificate"). Se ficar parado, clicar em **Verify DNS configuration** / **Provision certificate**.

## 4. Avisar no chat

Quando `https://agenda.profbrune.com.br/` abrir o site com cadeado, avisar no chat. Aí o Claude liga
`CALENDAR_FEED_HOST = 'https://agenda.profbrune.com.br'` em `shared/teacher-class-logs.js`, testa um link real
e publica. A partir daí o bloco "Ver as aulas na sua agenda" mostra o endereço novo para todo mundo.

Quem já assinou o link antigo (do Supabase) precisa assinar o novo uma vez (remover a agenda antiga no Google e
clicar em "Abrir no Google Agenda" de novo).
