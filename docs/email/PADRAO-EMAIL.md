# Padrão de e-mail Prof Brune (variação 1c)

Padrão visual de TODO e-mail enviado em nome da Prof Brune (Central, site app.profbrune.com.br, Supabase Auth, Edge Functions). Referência pronta: `confirmar-conta.html`.

## Estrutura (de cima para baixo)

1. **Fundo bege** `#FAF5EA`, ocupando a tela toda.
2. **Cartão branco**, largura máxima 600px, cantos 22px.
3. **Faixa roxa** `#3D167B`, texto `#FAF5EA`, com:
   - marca: `IDIOMAS COM PROF BRUNE` (900, 14px). Em e-mail de um curso específico pode virar `FRANÇAIS AVEC PROF BRUNE` / `中文 COM PROF BRUNE`;
   - etiqueta: pílula com borda rosa, texto `#f6c4ec`, 11px, caixa alta, espaçada;
   - título: Anton (peso normal: a Anton já é grossa), 38px (30px no celular), caixa alta. Um trecho em rosa `#E36BCA` como destaque.
4. **Corpo** (Nunito 16px, entrelinha 1.65, texto `#22113f`).
5. **Caixas de destaque** em bege `#FAF5EA`, cantos 16px: listas com ✓ azul `#3498D6`, ou o código de verificação (38px, 900, roxo, espaçado).
6. **Botão rosa** centralizado: fundo `#E36BCA`, borda 2px `#22113f`, sombra sólida `4px 4px 0 #22113f`, cantos 999px, texto 900 escuro. Um botão principal por e-mail.
7. **Assinatura**: foto redonda 60px com borda rosa, despedida em negrito, "Brune, sua professora de…", links Instagram / site em `#1d6fa5`.
8. **Rodapé** fora do cartão, 12px, cinza `#5d4f72`. Em e-mail de marketing: como sair da lista.

## Tokens

| Uso | Cor |
|---|---|
| Roxo (faixa, títulos de caixa, código) | `#3D167B` |
| Rosa (destaque, botão, borda da foto) | `#E36BCA` |
| Azul (✓ das listas) | `#3498D6` |
| Bege (fundo, caixas) | `#FAF5EA` |
| Tinta (texto) | `#22113f` |
| Cinza (notas, rodapé) | `#5d4f72` |
| Linha (divisória da assinatura) | `#ece4f2` |

Fontes: títulos `'Anton','Impact','Arial Narrow',sans-serif`; texto `'Nunito','Helvetica Neue',Arial,sans-serif`. Gmail ignora fonte da web, então os fallbacks precisam ficar bons sozinhos.

## Regras técnicas

- Layout em `<table role="presentation">` e **estilo em linha** (Gmail descarta boa parte do `<style>`); o `<style>` só serve para o ajuste de celular.
- Imagens sempre por **URL https hospedada** (nunca `data:` base64: o Gmail bloqueia). Foto da assinatura: `https://app.profbrune.com.br/icons/brune-email.jpg` (arquivo `icons/brune-email.jpg`, 240×240, recorte da foto da Torre Eiffel; exibida a 60px, nítida em tela retina).
- Texto de pré-visualização escondido logo após o `<body>` (o que aparece na lista da caixa de entrada).
- Sempre enviar também a versão em texto puro quando quem envia permitir (Resend permite; Supabase Auth não).
- Nunca expor preço, dado pessoal sensível ou dados de contrato no e-mail.
- Um único sistema envia cada e-mail automático (não duplicar Supabase Auth + Edge Function para o mesmo evento).

## E-mails de conta (Supabase Auth)

Mesmo modelo, trocando etiqueta, título e texto. Variáveis do Supabase: `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .Email }}`.

| Modelo do Supabase | Etiqueta | Título | Botão |
|---|---|---|---|
| Confirm signup | Confirme seu e-mail | Falta pouco *para começar!* | Ativar minha conta |
| Magic Link | Seu acesso | Entre *com um clique.* | Entrar no app |
| Reset Password | Nova senha | Vamos criar *uma senha nova.* | Criar nova senha |
| Change Email | Novo e-mail | Confirme *o novo endereço.* | Confirmar e-mail |
