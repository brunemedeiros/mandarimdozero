# Verificar o app do Google Agenda ("Idiomas com Prof. Brune")

Projeto do Google Cloud: **Prof Brune Agenda**. Escopo pedido: `calendar.readonly` (sensível, sem avaliação de segurança).

Dois avisos diferentes na tela do Google:
- **Nome técnico** (`eigjocalzwamisgqilhg.supabase.co`) no lugar do nome do app: some com a **verificação da marca**
  (branding) e com o retorno do login pelo domínio da Prof. Brune (`agenda.profbrune.com.br/google/callback`).
- **"Este app não foi verificado pelo Google"** (caixa laranja): some só com a **verificação do escopo** (vídeo + justificativa).

Enquanto o app está em "Teste", a conexão vence a cada 7 dias. Publicado (mesmo sem verificação), não vence.
Logotipo enviado = a marca precisa ser verificada antes de publicar. Para publicar logo, tirar o logo e pôr de volta na verificação.

## Ordem

1. **Search Console** (com a mesma conta Google dona do projeto): https://search.google.com/search-console >
   Adicionar propriedade > **Domínio** > `profbrune.com.br` > copiar o TXT `google-site-verification=...` >
   Registro.br > profbrune.com.br > DNS > Editar zona > Nova entrada TXT, nome em branco, valor colado > Salvar >
   voltar ao Search Console > Verificar (pode levar algumas horas). Vale para todos os projetos da conta.
2. **Cliente OAuth** (Google Auth Platform > Clientes > o cliente Web):
   - URIs de redirecionamento: acrescentar `https://agenda.profbrune.com.br/google/callback`.
   - Depois que a conexão nova funcionar: tirar as duas do `supabase.co` (domínio que não é da Prof. Brune barra a
     verificação). O Staging, se precisar, ganha um cliente próprio em modo Teste.
3. **Branding**: nome `Idiomas com Prof. Brune`; página inicial `https://app.profbrune.com.br/sobre.html` (pública; a
   `app.profbrune.com.br/` pede login e o Google recusa); política de privacidade
   `https://app.profbrune.com.br/privacidade-google-agenda.html`; domínio autorizado `profbrune.com.br` (só ele).
4. Esperar 24 horas depois do passo 1 e clicar em **Corrigi os problemas** (verificação da marca).
5. **Publicar app** (Público-alvo > Publicar).
6. **Central de verificação** > verificação do escopo: justificativa (texto abaixo) + vídeo no YouTube (não listado)
   mostrando: tela do site com o botão "Conectar Google Agenda", a tela do Google com o nome do app e o escopo, e as aulas
   aparecendo em Professora > Aulas > Calendário. Em inglês ou com legenda em inglês.

## Justificativa do escopo (colar)

> Idiomas com Prof. Brune is a language-learning site. Teachers can optionally connect Google Calendar so their scheduled
> lessons are recorded on the site with the correct date, time and length. We request calendar.readonly because we only
> read events from the calendars the teacher selects; we never create, modify or delete events. Events that are not
> lessons are not kept (their title and guests are discarded). Data is never sold, shared or used for advertising or AI training.

## Do lado do site (feito pelo Claude)

- `sobre.html` (página pública) e `privacidade-google-agenda.html` (nome do app atualizado).
- `infra/agenda-netlify/netlify.toml`: `/google/callback` repassado para a Edge Function `google-calendar`.
- Edge Function: `GCAL_REDIRECT_URI` (secret só na produção) = `https://agenda.profbrune.com.br/google/callback`.
  Ligar o secret **só depois** do passo 2 e do Netlify publicado; quem já está conectado não é afetado (a leitura usa o
  token guardado, não o retorno do login).
