# Google Agenda → site: passo a passo do Google Cloud (uma vez só)

Para o site poder **ler** a sua agenda, o Google exige um "app" cadastrado no Google Cloud, que é o cartão de identificação
do site ao pedir permissão. É grátis (não precisa de cartão de crédito) e leva uns 30 a 40 minutos. Só a dona do site faz
isso, uma vez; as outras professoras só clicam em "Conectar Google Agenda".

Use a conta Google em que estão as agendas "Brune Medeiros" e "Trabalho".

## 1. Criar o projeto
1. Abrir https://console.cloud.google.com e entrar com a conta Google.
2. No topo, clicar no seletor de projeto > **Novo projeto**. Nome: `Prof Brune Agenda`. **Criar**.
3. Confirmar que o projeto novo está selecionado no topo.

## 2. Ligar a API do Google Agenda
1. Menu ☰ > **APIs e serviços** > **Biblioteca**.
2. Buscar **Google Calendar API** > abrir > **Ativar**.

## 3. Tela de permissão (o que aparece quando alguém conecta)
1. Menu ☰ > **APIs e serviços** > **Tela de permissão OAuth** (pode aparecer como **Google Auth Platform**) > **Começar**.
2. Nome do app: `Prof. Brune`. E-mail de suporte: o seu. **Próximo**.
3. Público: **Externo**. **Próximo**.
4. Dados de contato: o seu e-mail. Aceitar a política > **Criar**.
5. Em **Acesso a dados** (ou **Escopos**) > **Adicionar ou remover escopos**: marcar
   `.../auth/calendar.readonly` (Ver os eventos das suas agendas), `openid` e `.../auth/userinfo.email`. **Atualizar** > **Salvar**.
6. Em **Público**: clicar em **Publicar app** e confirmar. O status fica **Em produção**.
   Sem isso a conexão cai sozinha a cada 7 dias. O app fica "não verificado" (ver o item 6 abaixo).

## 4. Criar a chave do site
1. Em **Clientes** (ou **Credenciais** > **Criar credenciais** > **ID do cliente OAuth**).
2. Tipo: **Aplicativo da Web**. Nome: `Site Prof Brune`.
3. **URIs de redirecionamento autorizados** > **Adicionar URI** (as duas, exatamente assim):
   - `https://eigjocalzwamisgqilhg.supabase.co/functions/v1/google-calendar/callback`
   - `https://ilfjzizjfcmhibkhwber.supabase.co/functions/v1/google-calendar/callback`
4. **Criar**. Aparecem o **ID do cliente** e a **Chave secreta do cliente**. Copiar os dois (a chave secreta não se manda no chat).

## 5. Guardar a chave no Supabase (nos dois projetos)
1. Staging: https://supabase.com/dashboard/project/ilfjzizjfcmhibkhwber/functions/secrets
2. Produção: https://supabase.com/dashboard/project/eigjocalzwamisgqilhg/functions/secrets
3. Em cada um, **Add new secret** duas vezes:
   - Nome `GOOGLE_CLIENT_ID`, valor = ID do cliente
   - Nome `GOOGLE_CLIENT_SECRET`, valor = Chave secreta do cliente
4. **Save**. Avisar no chat ("chaves salvas").

## 6. O aviso "app não verificado"
Ao conectar, o Google mostra "O Google não verificou este app". É esperado: clicar em **Avançado** > **Acessar Prof. Brune
(não seguro)** > marcar a permissão de ver a agenda > **Continuar**. Vale para até 100 contas. Para abrir para muitas
professoras, pedimos a verificação do Google (dias a semanas; exige a política de privacidade publicada).

## Custo
Grátis: o projeto do Google Cloud não precisa de cobrança ativada, e a leitura da agenda fica muito abaixo da cota gratuita.
No Supabase, a leitura a cada 15 minutos é uma chamada de Edge Function e uma consulta no banco, dentro do plano atual.
Nada disso usa o Claude.
