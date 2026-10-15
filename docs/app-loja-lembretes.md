# App de loja (App Store e Google Play): lembretes para a sessão de decisão

Ler ANTES de começar qualquer conversa sobre transformar o site em app de loja. Itens anotados a pedido da autora
(2026-10-14). Cada um é uma decisão ou um trabalho que só faz sentido junto com o app.

## Sugestão de amigos pela agenda do celular (como o Duolingo)

Hoje não dá, por três motivos. Os três precisam estar resolvidos antes de ligar o recurso:

1. **Acesso aos contatos**: o site (mesmo instalado como PWA) não lê a agenda. O navegador só oferece o seletor
   manual de contatos (Contact Picker API), e só no Chrome do Android. Num app de loja (ex.: Capacitor ou React Native
   empacotando o site) existe permissão de contatos de verdade, com o pedido do sistema ("Permitir acesso aos
   contatos?").
2. **Telefone cadastrado**: hoje o site não pede o número de ninguém, então não há com o que comparar. Seria preciso um
   campo de telefone (opcional), com verificação por SMS (custo por mensagem) para ninguém se passar por outra pessoa.
3. **Privacidade (LGPD) e regras das lojas**:
   - consentimento explícito para enviar a agenda;
   - nunca guardar os números da agenda, só uma versão embaralhada (hash), que é o que o Duolingo diz fazer;
   - texto na política de privacidade;
   - opção "não me encontrem pelo telefone";
   - a Apple e o Google exigem explicar no app e na página da loja por que os contatos são pedidos (o app pode ser
     recusado sem isso).

Por que não programar agora e deixar desligado: o jeito de ler a agenda depende da tecnologia escolhida para o app
(Capacitor, React Native ou outra), e código que não roda envelhece sem teste. O que já está pronto e serve no app:
a amizade com pedido e aceite, o convite por link (`?amigo=usuario`) e a busca por @ (`shared/friends.js`).

## Outros pontos que já apareceram e dependem do app

- Notificações push nativas (hoje é push do navegador, `shared/push.js`): no iPhone o push web só funciona com o site
  instalado na tela inicial.
- Ícones: a troca geral para o Fluent Emoji (`docs/icones-fluent.md`) deve acontecer antes, para as telas das lojas já
  saírem com os ícones novos.
