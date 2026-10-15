# E-mails de cadastro e senha em português e em inglês (Supabase Auth)

Os 4 modelos desta pasta têm o texto em português (igual aos de `docs/email/supabase/`, byte a byte) e em inglês, no
mesmo arquivo. Quem escolhe é uma condição no topo, que lê o idioma do site gravado na conta
(`user_metadata.ui_language`). Sem o dado, ou com qualquer valor que não seja `en`, sai em português (como hoje).

| Modelo do Supabase | Arquivo (colar em Source) | Assunto |
|---|---|---|
| Confirm signup | `confirmar-conta.html` | ver abaixo |
| Magic Link | `magic-link.html` | ver abaixo |
| Reset Password | `redefinir-senha.html` | ver abaixo |
| Change Email Address | `trocar-email.html` | ver abaixo |

## Como o idioma chega ao e-mail

O Supabase deixa o modelo ler `{{ .Data }}`, que é o `user_metadata` da conta. O portão (`index.html`) agora grava
`ui_language` (`en` ou `pt-BR`) no cadastro: usa a escolha guardada no navegador (`ui-language`) e, se não houver, o
idioma do navegador. Só quem se cadastrar **depois do deploy deste código** tem a chave. Vale para o e-mail de
confirmação do cadastro, que é o que o aluno do `/pt` recebe primeiro.

Limite e solução: o modelo não consegue descobrir o idioma sozinho (o Supabase não manda o idioma da página). Por decisão
da dona (2026-10-15), vale o idioma do site que a pessoa está usando NO MOMENTO: `shared/auth.js` regrava
`user_metadata.ui_language` ao trocar o idioma do site e uma vez ao carregar (contas antigas ganham a chave sozinhas no primeiro
acesso depois do deploy). Quem nunca mais entrar continua sem a chave e recebe em português, como hoje.

## Passo a passo para colar (você faz; leva uns 5 minutos)

Pré-requisito: o merge desta branch na `main` (o portão precisa gravar o idioma) e o SMTP próprio já configurado, como
em `docs/auth/confirmacao-por-codigo.md`. Antes de trocar, deixe guardados os modelos atuais (os arquivos de
`docs/email/supabase/` são exatamente eles).

1. Supabase (produção) > Authentication > Emails: https://supabase.com/dashboard/project/eigjocalzwamisgqilhg/auth/templates
   (se o Staging tiver SMTP, teste lá antes: `ilfjzizjfcmhibkhwber`).
2. Em cada um dos 4 modelos: abrir **Source**, apagar tudo e colar o arquivo da tabela (o arquivo inteiro, inclusive a
   primeira linha que começa com `{{ $en := false }}`).
3. Assunto (Subject) de cada modelo, colando a linha inteira:

   - Confirm signup:
     `{{ if eq (printf "%v" .Data.ui_language) "en" }}Your code to activate your account{{ else }}Seu código para ativar a conta{{ end }}`
   - Magic Link:
     `{{ if eq (printf "%v" .Data.ui_language) "en" }}Your link to sign in{{ else }}Seu link para entrar{{ end }}`
   - Reset Password:
     `{{ if eq (printf "%v" .Data.ui_language) "en" }}Create a new password{{ else }}Crie uma senha nova{{ end }}`
   - Change Email Address:
     `{{ if eq (printf "%v" .Data.ui_language) "en" }}Confirm your new email{{ else }}Confirme o novo e-mail{{ end }}`

   Se, ao enviar um teste, o assunto chegar com as chaves `{{ ... }}` cruas, o campo de assunto desta versão do Supabase não
   aceita condição: volte o assunto para o texto em português de antes (o corpo continua certo nos dois idiomas) e me avise.
4. Salvar. **Teste** com um cadastro novo: (a) navegador em inglês (ou `localStorage['ui-language']='en'`): e-mail em
   inglês, botão "Activate my account"; (b) navegador em português: e-mail em português, igual ao de hoje.
   Para Reset Password, Magic Link e Change Email, use uma conta criada depois do deploy.
5. Se algo sair estranho: colar de volta os arquivos de `docs/email/supabase/` (os de português de antes).

## O que foi testado aqui (sem rede, sem Supabase)

`bash tests/email-auth/run.sh`: renderiza os 4 modelos com o motor de template do Go (o mesmo do Supabase Auth, em
`html/template` e `text/template`) com `Data` ausente, vazio, `pt-BR`, `en`, `es` e outras chaves: o português sai idêntico ao
modelo atual em todos os casos que não são `en`, e o inglês não tem nenhuma palavra em português nem erro de template (48
verificações). O que **não** dá para provar daqui: se o painel do Supabase aceita a condição no campo de assunto (passo 3) e se
`.Data` chega em cada tipo de e-mail. O teste do passo 4 confirma.

## Textos em inglês (confiança)

Todos em tom caloroso e curto, no padrão `docs/email/PADRAO-EMAIL.md` (marca "LANGUAGES WITH PROF BRUNE", assinatura
"Brune, your language teacher"). Confiança **alta** em todos os textos de ação (código, botão, avisos de segurança).
Confiança **média** nos títulos da faixa roxa, por serem frases curtas com destaque em rosa: "Almost there, *let's get started!*",
"Sign in *with one click.*", "Let's create *a new password.*", "Confirm *the new address.*", e na despedida "Happy studying!".
