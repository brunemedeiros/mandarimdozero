---
paths:
  - "supabase/functions/**"
  - "docs/email/**"
  - "docs/auth/**"
  - "index.html"
---

# E-mails (padrão visual Prof Brune, variação 1c)

Fonte de verdade: `docs/email/PADRAO-EMAIL.md`. Modelo base: `docs/email/supabase/confirmar-conta.html`.

- Todo e-mail novo (Supabase Auth, Edge Functions como `notification-cron`/`report-reply-send`, Resend) parte do
  modelo base: fundo bege, cartão branco 600px, faixa roxa `#3D167B` com marca + etiqueta + título Anton com trecho
  rosa, corpo Nunito, um botão rosa com sombra sólida, assinatura com foto e rodapé cinza.
- Tabelas + estilo em linha; imagens só por URL https (foto: `https://app.profbrune.com.br/icons/brune-email.jpg`,
  arquivo `icons/brune-email.jpg`, só vale depois do merge na `main`); texto de pré-visualização escondido.
- Resend: mandar também a versão em texto puro. Um único sistema envia cada evento (não duplicar Auth + Edge).
- Modelos do Supabase Auth ficam em `docs/email/supabase/` e são colados à mão pela autora (exigem SMTP próprio);
  passo a passo em `docs/auth/confirmacao-por-codigo.md`. Mostrar à autora antes de aplicar.
