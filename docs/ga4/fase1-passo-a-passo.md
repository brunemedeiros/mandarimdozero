# GA4, Fase 1: criar a conta (passo manual da dona)

Os nomes dos menus do Google mudam com frequência. Se algum botão estiver com outro nome, procure o mais parecido ou mande
um print. Leva uns 10 minutos.

## A. Criar conta, propriedade e fluxo

1. Abra https://analytics.google.com e entre com a sua conta Google de trabalho (a que vai ser dona dos dados).
2. Clique em **Começar a medir**.
3. **Conta**: nome `Prof. Brune`. Em "Configurações de compartilhamento de dados", desmarque todas as caixas. Avançar.
4. **Propriedade**: nome `app.profbrune.com.br`, fuso **Brasil, horário de São Paulo**, moeda **Real brasileiro (R$)**. Avançar.
5. **Detalhes da empresa**: setor **Educação** (ou o mais próximo), tamanho **Pequeno**. Avançar.
6. **Objetivos**: marque **Gerar leads**, **Entender o tráfego da Web e/ou do app** e **Ver o engajamento e a retenção de
   usuários** (os nomes que apareceram para a dona em 2026-11-15). Os objetivos só escolhem quais relatórios aparecem no menu;
   dá para mudar depois. Clique em **Criar**.
7. Aceite os Termos de Serviço (país **Brasil**) e os termos de processamento de dados.
8. Em "Coleta de dados", escolha **Web**.
   - URL do site: `app.profbrune.com.br` (com `https://` já escolhido).
   - Nome do fluxo: `Site do app`.
   - Ao lado de "Medição otimizada", clique na **engrenagem**:
     - deixe ligado **Visualizações de página** e **Cliques de saída**;
     - desligue Rolagens, Pesquisa no site, Interações com formulários, Engajamento com vídeo e Downloads de arquivos;
     - em Visualizações de página > **Mostrar configurações avançadas**, desmarque **Mudanças de página com base em
       eventos do histórico do navegador** (o site manda as telas do app do jeito certo; com isso ligado, contaria em dobro).
     - Salvar.
   - Clique em **Criar e continuar** (ou **Criar fluxo**).
9. Aparece o **ID da métrica** (ou "ID de medição"), no formato **G-XXXXXXXXXX**, no canto de cima à direita da tela
   "Detalhes do fluxo da Web". **Copie e me mande.** Não precisa seguir as "instruções de instalação": essa parte é minha.

## A2. Conferir a Medição otimizada depois (caminho exato, 2026-11-24)

Administrador (engrenagem embaixo, à esquerda) > **Coleta e modificação de dados** > **Fluxos de dados** > clique em
**Site do app** > em "Eventos", ao lado de **Medição otimizada**, clique na **engrenagem** > em **Visualizações de página**,
clique em **Mostrar configurações avançadas** > **desmarque "Alterações na página de acordo com os eventos do histórico de
navegação"** (deixe "Carregamentos de página") > desligue também Rolagens, Pesquisa no site, Interações com formulários,
Engajamento com vídeo e Downloads de arquivos > deixe só **Cliques de saída** ligado > **Salvar**.

Conferido em 2026-11-24: estava assim (só Cliques de saída). "Carregamentos de página" fica sempre marcado e não
desmarca; o site impede o envio automático pelo código (`gtag('set')` antes do `js`, histórico 35).

## B. Privacidade (no mesmo dia)

Tudo fica em **Administrador** (engrenagem no canto de baixo, à esquerda).

1. **Coleta e modificação de dados > Retenção de dados**: "Retenção de dados de eventos" = **14 meses**. Salvar.
2. **Coleta e modificação de dados > Coleta de dados**: deixe **Coleta de dados dos Indicadores do Google** (Sinais do Google)
   **desativada**. Se aparecer "Configurações avançadas para permitir a personalização de anúncios", deixe **desativado**
   para todas as regiões.
3. **Vinculações de produtos**: não vincule Google Ads nem nada.
4. **Filtro de tráfego interno**: não precisa. Ele funciona pelo endereço de internet (IP), que muda no celular e em casa. No
   lugar, o site vai ter o botão "Não contar este aparelho" no Painel de Admin.

A Fase 1 termina quando você me mandar o G-XXXXXXXXXX.
