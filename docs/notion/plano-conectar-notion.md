# Plano: "Conectar Notion" (aulas do Notion entram sozinhas no site)

Pedido da autora (2026-11-03): em vez de uma tarefa do Claude só para ela, um recurso do site que qualquer professora usa
com o próprio Notion. Situação que motivou: a importação de 15/10 foi única; de 16/10 a 03/11 a autora preencheu 75 linhas no
Notion (61 com Tópico ou "Para a próxima aula") e nada entrou no site, que só recebeu as aulas do Google Agenda (256, sem tema).

## Como funciona (igual ao Google Agenda, 117)

1. Professora > Mural > Aulas e materiais > "Conectar Notion": entra com a conta do Notion e escolhe o banco de aulas
   (o Notion só mostra ao site os bancos que ela autorizar).
2. Tela de colunas: o site sugere pelo nome e ela confirma qual coluna é Data, Aluno, Tópico, Para a próxima aula, Presença,
   Competências e Idioma. Cada professora monta o Notion de um jeito; só Data e Aluno são obrigatórias.
3. Nomes dos alunos: cada opção da coluna Aluno (ex.: "Carol 🇧🇷") é ligada uma vez a um aluno ou turma do site; o site sugere
   pelos "nomes na agenda" do Banco e pelo nome do perfil. Opção nova ou sem par vai para a caixa de revisão.
4. Leitura: a cada hora o servidor lê só as linhas editadas desde a última leitura (função `notion-sync`, cron como o
   `gcal-sync`). Cada linha casa com a aula do mesmo aluno/turma e dia (a que o Google criou); preenche Tópico, Para a
   próxima aula, Presença (vira o rótulo de mesmo nome) e Competências. Aí o aviso do Mural, o sino e os cartões do Banco
   saem sozinhos, como se ela tivesse escrito no site.
5. Só LÊ o Notion, nunca escreve lá. O corpo da página do Notion não entra (só as colunas). Pontualidade e Uso da L1 ficam
   de fora (decisão de 2026-10-14).

## Revisão (um lugar só)

- Faixa no topo de Aulas e materiais: "N aulas atualizadas pelo Notion" (abre só essas, de todos os alunos).
- Caixa "Para revisar do Notion": linha sem aluno ligado, sem aula no dia, ou com dois alunos possíveis.
- Cada aula guarda de onde veio (`notion_page_id`) e quando foi lida.

## Infra (passos da autora, uma vez)

- Criar a integração pública no Notion (notion.so/my-integrations), com o endereço de volta
  `https://agenda.profbrune.com.br/notion/callback`; colar o Client ID e o Client Secret nos secrets do Supabase
  (`NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`), nunca no chat. Passo a passo vai junto com a entrega.
- O Notion pede revisão para integração pública só se for listada na galeria deles; para uso por link não precisa.

## Etapas

1. Banco (migration nova): conexões e tokens do Notion (só o servidor lê), escolha do banco, mapa de colunas, nomes ligados,
   origem na aula. Teste SQL local.
2. Função `notion-sync` (login, lista de bancos, leitura incremental, casar e gravar) + cron. Teste com dados falsos.
3. Telas: Conectar, colunas, nomes, faixa e caixa de revisão. Testes no navegador e prévia para a autora.
4. Trazer 16/10 até hoje sem aviso e sem sino (marcadas para a faixa de revisão), só com autorização.

Grátis x Premium: faz parte do plano Professora (como o Google Agenda); para o aluno não muda nada.

## Perguntas para a autora (antes de codar)

Ver a conversa de 2026-11-03.
