# Verificar o app do Google Agenda ("Idiomas com Prof. Brune")

Projeto do Google Cloud: **Prof Brune Agenda**. Escopo pedido: `calendar.readonly` (sensível, sem avaliação de segurança).

**Estado (2026-10-26):** passos 1 a 5 feitos (domínio verificado no Search Console, endereços e domínios do supabase.co
tirados, app publicado, marca verificada e aparecendo para os usuários em 2026-10-25). **Pendente (a autora deixou para
depois): passo 6**, verificação do escopo com o vídeo (roteiro abaixo). Até lá, a tela do Google mostra o aviso laranja
"não verificado", mas a conexão funciona e não vence.

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

## Roteiro do vídeo (passo 6)

Antes: site em inglês (menu da bandeira; voltar depois), Chrome com a barra de endereço visível, gravador (Win+Alt+R ou
Clipchamp; Mac Cmd+Shift+5), evento de teste "Test lesson" na agenda Trabalho. Nomes de alunos aparecem: passar rápido.

1. `https://app.profbrune.com.br/sobre.html`, trecho "Optional Google Calendar connection" (5 s).
2. Teacher > Lessons > Calendar > Google Calendar: mostrar a frase "One-way sync" (10 s).
3. "Connect again" > tela do Google em **English** (seletor no rodapé) > clicar na barra de endereço e mostrar
   `client_id=...apps.googleusercontent.com` (3 s parado) > nome do app e escopo > Continue > Allow (30 s).
4. De volta ao site: conectado, lista de agendas (10 s).
5. "Read now" > aulas com horário no calendário > abrir uma aula com horário travado "do Google" (20 s).
6. Arrastar "Test lesson" no Google Agenda > "Read now" > horário da aula muda no site (40 s).
7. Passar o mouse em "Disconnect" sem clicar (5 s).

Enviar: YouTube **Não listado** > Google Auth Platform > Acesso a dados (conferir `.../auth/calendar.readonly` nos
escopos sensíveis) > Central de verificação > "Prepare for verification" > justificativa (abaixo) + link do vídeo > enviar.
A resposta chega em `brunemed1310@gmail.com`.

## Justificativa do escopo (colar)

> Idiomas com Prof. Brune is a language-learning site. Teachers can optionally connect Google Calendar so their scheduled
> lessons are recorded on the site with the correct date, time and length. We request calendar.readonly because we only
> read events from the calendars the teacher selects; we never create, modify or delete events. Events that are not
> lessons are not kept (their title and guests are discarded). Data is never sold, shared or used for advertising or AI training.

## Do lado do site (feito pelo Claude)

- `sobre.html` (página pública) e `privacidade-google-agenda.html` (nome do app atualizado).
- `infra/agenda-netlify/netlify.toml`: `/google/callback` repassado para a Edge Function `google-calendar`.
- Edge Function: na produção a volta do login é `https://agenda.profbrune.com.br/google/callback` (fixo no código pelo
  projeto; o secret opcional `GCAL_REDIRECT_URI` sobrepõe). Quem já está conectado não é afetado (a leitura usa o token
  guardado, não o retorno do login).
