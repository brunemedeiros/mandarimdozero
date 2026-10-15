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
3. Corpo: em **Source**, apagar tudo e colar `docs/email/supabase/confirmar-conta.html` (padrão Prof Brune,
   `docs/email/PADRAO-EMAIL.md`).
4. Mesmos passos para os outros modelos (Subject entre parênteses):
   - Magic Link: `docs/email/supabase/magic-link.html` ("Seu link para entrar")
   - Reset Password: `docs/email/supabase/redefinir-senha.html` ("Crie uma senha nova")
   - Change Email Address: `docs/email/supabase/trocar-email.html` ("Confirme o novo e-mail")
   A foto da assinatura (`icons/brune-email.jpg`) só aparece depois que a branch for mergeada na `main`.


Feito pela autora em 2026-10-12.

## Problema achado no primeiro teste (2026-10-12) e correção

Cadastro de teste com e-mail institucional: o código chegou, mas o site disse que tinha vencido, e "Reenviar código"
não mandou nada. No banco, a conta foi confirmada 20 segundos depois do cadastro, sem a pessoa digitar o código:
o antivírus do e-mail abriu sozinho o link do botão "Ativar minha conta" (`ConfirmationURL`), o que confirmou a
conta e invalidou o código. O Supabase não reenvia código para conta já confirmada (responde ok sem mandar nada).

Correção:
- O botão do modelo `confirmar-conta.html` agora aponta para `https://app.profbrune.com.br/?confirmar={{ .TokenHash }}`.
  O portão mostra "Ativar sua conta" e só confirma com um toque (`verifyOtp({ token_hash, type: 'email' })`).
  **Passo da autora**: colar de novo o modelo Confirm signup depois do merge.
- Se o código falhar ou a pessoa pedir reenvio, o portão tenta entrar com o e-mail e a senha do cadastro: se a
  conta já estiver ativa, entra direto.
- Os outros 3 modelos também: Magic Link `?entrar=`, Reset Password `?nova-senha=` (tipo `recovery`, abre "Crie uma
  senha nova"), Change Email `?trocar-email=` (tipo `email_change`; no primeiro dos dois links da troca segura pede
  o outro endereço). Todos com `{{ .TokenHash }}` e tela de um toque (`GATE_LINK_KINDS` em `index.html`).
  **Passo da autora**: colar de novo os 4 modelos depois do merge.
- Aviso visual: a tela do código confere sozinha (a cada 15s e ao voltar para a aba) se a conta já foi ativada em
  outra aba ou janela e mostra "Sua conta foi ativada! Entrando..." antes de seguir. Teste: 100/100
  (`tests/login-obrigatorio/test_playwright.js`).

PR #305 mergeado e publicado em 2026-10-12; a autora colou os 4 modelos novos em 2026-10-13.
