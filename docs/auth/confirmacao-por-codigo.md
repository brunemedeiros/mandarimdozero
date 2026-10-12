# Confirmação do cadastro por código (passo manual da autora)

O site (portão `index.html`) agora pede o **código** do e-mail depois de "Criar conta" e chama
`verifyOtp({ email, token, type: 'email' })`. A confirmação de e-mail já está ligada na produção
(conferido em 2026-10-12: o único cadastro por e-mail recebeu `confirmation_sent_at`), mas o e-mail padrão
manda só um **link**. Para o código aparecer no e-mail:

0. **Antes de tudo, SMTP próprio** (o Supabase só deixa editar o modelo com SMTP configurado; descoberto em
   2026-10-12). Domínio `profbrune.com.br` está verificado no Resend (região sa-east-1, envio ligado).
   a) Resend > API Keys > Create API key: nome `supabase-auth`, permissão "Sending access", domínio
      `profbrune.com.br`. Copiar a chave (começa com `re_`; só aparece uma vez).
   b) Supabase > Authentication > Emails > Set up SMTP: Sender email `nao-responda@profbrune.com.br`,
      Sender name `Prof. Brune`, Host `smtp.resend.com`, Port `465`, Username `resend`, Password = a chave.
1. Supabase (produção) > Authentication > Emails > **Confirm signup**
   (https://supabase.com/dashboard/project/eigjocalzwamisgqilhg/auth/templates).
2. Assunto: `Seu código para ativar a conta`
3. Corpo: em **Source**, apagar tudo e colar o conteúdo de `docs/auth/email-confirmacao.html` (visual do site:
   papel creme, logo, faixa azul/rosa, código grande, botão azul escuro; tabelas e estilos inline para Gmail/Outlook).


Até o passo 3 ser feito, o e-mail continua trazendo o link, e tocar nele também confirma a conta (a tela do
código avisa isso).
