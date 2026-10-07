# Arquitetura Total --- Decks, Tags, Painel e Sistema de Estudo

**Projeto:** aplicação de aprendizagem de idiomas\
**Status:** implementada (fases A a K1); pendências em `docs/historico/14-pendencias-pos-paywall-e-decks.md`\
**Data:** 2026-09-27

------------------------------------------------------------------------

## 1. Objetivo

Implementar uma arquitetura de estudo inspirada conceitualmente no Anki,
mas integrada à experiência de cursos da aplicação.

A arquitetura deve separar claramente:

1.  **Curso** --- estrutura pedagógica criada pelo sistema.
2.  **Deck** --- unidade organizacional de estudo.
3.  **Note** --- conteúdo/fonte editável.
4.  **Field** --- campos de conteúdo de uma Note.
5.  **Card Type** --- regra/template que determina quais Cards são
    gerados.
6.  **CardInstance** --- unidade efetivamente estudada e agendada pelo
    FSRS.
7.  **Tags** --- metadados da Note.
8.  **Review** --- sessão de estudo dos CardInstances.
9.  **Painel** --- navegador/gerenciador de Notes/Cards.
10. **Importação/Exportação** --- interoperabilidade com Anki e Decks
    públicos.

A regra arquitetural central é:

> **Note → Card Type → CardInstances → Review/FSRS**

Deck organiza os Cards, mas não define o conteúdo nem a direção do Card.

------------------------------------------------------------------------

# 2. Princípios arquiteturais

## 2.1 Note é a fonte de verdade do conteúdo

A Note contém o conteúdo editável.

CardInstances são derivados da Note e do Card Type.

Não persistir CardInstances gerados como se fossem uma segunda fonte
independente de conteúdo.

Fluxo:

`Note + Card Type → geração determinística de CardInstances`

Alterações estruturais da Note regeneram a representação necessária dos
Cards, preservando identidade, histórico e FSRS quando a identidade do
Card continua válida.

------------------------------------------------------------------------

## 2.2 CardInstance é a unidade de estudo

Cada CardInstance possui:

-   identidade própria;
-   referência à Note;
-   referência ao Deck;
-   direção estrutural determinada pelo próprio Card;
-   estado/agendamento FSRS;
-   histórico de revisão;
-   origem;
-   metadados necessários ao Review.

O Review nunca deve decidir arbitrariamente uma direção com `isReverse`,
`reviewDirection`, alternância ou mecanismo equivalente.

Para `Normal com reverso`, existem **dois CardInstances independentes**,
ambos pertencentes ao mesmo Deck.

------------------------------------------------------------------------

## 2.3 Cards irmãos da mesma Note permanecem juntos

Se uma Note gera múltiplos Cards:

-   Normal → 1 Card;
-   Normal com reverso → 2 Cards;
-   Cloze com 3 marcas → 3 Cards;

esses Cards formam uma unidade de organização.

O usuário não pode mover apenas um Card irmão para outro Deck.

Mover a Note muda o Deck do conjunto de Cards gerados por ela.

------------------------------------------------------------------------

# 3. Hierarquia de idioma e Decks

## 3.1 Deck raiz do idioma

Cada idioma possui um Deck raiz.

Exemplo:

`Francês`

O Deck raiz do idioma é **100% agregador**.

Ele:

-   não recebe Cards diretamente;
-   não é um destino de movimentação;
-   não é deletável pelo aluno;
-   soma os Cards de todos os descendentes;
-   permite estudar todos os descendentes;
-   representa o filtro equivalente a "Todos".

Exemplo:

`Francês` - Francês geral - Francês para Viagens - Pronúncia do
Francês - Meus Decks - Cartões da Professora

------------------------------------------------------------------------

## 3.2 Regra de estudo da hierarquia

Ao clicar em um Deck:

-   o Deck selecionado e todos os seus descendentes entram no escopo;
-   não entram irmãos ou ancestrais.

Exemplo:

`Francês > Meus Decks`

estuda:

-   Cards diretamente em Meus Decks;
-   Cards de todos os seus subdecks.

`Francês`

estuda tudo abaixo de Francês.

------------------------------------------------------------------------

## 3.3 Contagens agregadas

Deck pai soma os Cards de todos os descendentes.

As colunas principais são:

-   **Novo**
-   **Aprendendo**
-   **Revisar**

A contagem de Review representa Cards já graduados e **devidos naquele
momento**, não simplesmente Cards que já foram estudados.

A contagem de Aprendendo representa Cards que já foram vistos, mas ainda
estão na etapa inicial de aprendizagem.

A contagem de Novo representa Cards que ainda não foram estudados.

Essas contagens devem respeitar as regras da sessão e os limites globais
definidos pelo usuário quando aplicável.

------------------------------------------------------------------------

# 4. Tipos de Deck

## 4.1 Decks de curso

Decks associados aos cursos do sistema.

Exemplos:

-   Francês geral
-   Francês para Viagens
-   Pronúncia do Francês

Características:

-   criados pelo sistema;
-   podem possuir subdecks definidos pelo sistema;
-   não podem ser estruturalmente modificados pelo aluno;
-   Cards gerados pelo Study Trail entram no Deck de curso
    correspondente;
-   o aluno não pode mover esses Cards para seus Decks pessoais.

------------------------------------------------------------------------

## 4.2 Meus Decks

`Meus Decks` é um **Deck real**, não apenas uma categoria visual.

Ele funciona como o Deck pessoal padrão do aluno.

Um Card criado pelo usuário entra inicialmente em:

`Francês > Meus Decks`

se o usuário não selecionar outro destino.

`Meus Decks` pode:

-   conter Cards diretamente;
-   possuir subdecks;
-   ter Cards movidos entre seus próprios subdecks;
-   receber Cards importados pelo usuário;
-   conter Decks pessoais públicos.

Exemplo:

`Francês` - Meus Decks - Cards diretamente em Meus Decks - La mode -
Livro Défi

Ao criar `La mode`, novos Cards podem ser direcionados diretamente para
esse subdeck.

------------------------------------------------------------------------

## 4.3 Cartões da Professora

Nome definitivo:

**Cartões da Professora**

Existe uma árvore de Deck controlada pela professora para cada aluno.

Exemplo conceitual:

`Francês > Cartões da Professora` - Aula 1 - Aula 2 - Vocabulário -
Pronúncia

A professora pode:

-   criar subdecks;
-   mover Cards entre os subdecks;
-   adicionar Cards;
-   remover Cards.

O aluno pode:

-   estudar;
-   visualizar os Cards permitidos;
-   utilizar o conteúdo.

O aluno não pode:

-   editar Cards da professora;
-   mover Cards da professora;
-   apagar Cards da professora;
-   alterar a estrutura controlada pela professora.

Com Admin Mode ON, a professora possui visibilidade dos Decks privados
do aluno.

------------------------------------------------------------------------

# 5. Regras de movimentação

## 5.1 Cards do Study Trail

Cards gerados automaticamente pelo curso:

-   pertencem ao Deck do curso;
-   não podem ser movidos pelo aluno para Decks pessoais;
-   permanecem associados ao conteúdo pedagógico que os gerou.

------------------------------------------------------------------------

## 5.2 Cards criados pelo usuário

Podem ser movidos entre Decks pessoais permitidos.

Não podem ser movidos para:

-   Deck raiz do idioma;
-   Deck de curso;
-   Deck da professora.

------------------------------------------------------------------------

## 5.3 Cards importados

Cards importados pelo usuário entram na árvore de `Meus Decks`.

O usuário pode:

-   preservar a hierarquia original dentro de um destino pessoal;
-   importar para um Deck pessoal existente;
-   reorganizar posteriormente dentro dos Decks pessoais permitidos.

Cards importados comportam-se como conteúdo pessoal do usuário depois da
importação.

------------------------------------------------------------------------

## 5.4 Exclusão de Deck pessoal

Ao excluir um Deck pessoal, mostrar:

> **Excluir este deck irá excluir todos os cartões dentro dele**

Opções:

-   **Mover para outro deck**
-   **Excluir permanentemente**

Se houver subdecks, a operação deve considerar toda a árvore
descendente.

Ao mover, Notes e todos os Cards irmãos são movidos juntos.

Não existe arquivamento.

------------------------------------------------------------------------

# 6. Note

Uma Note contém:

-   `id`
-   `lang`
-   `fields`
-   `fieldOrder`
-   `card_generation_mode`
-   `revision`
-   `tags`
-   metadados de origem
-   metadados de atribuição/importação quando aplicáveis.

A Note **não** possui `cardTypeId` como fonte de direção.

`card_generation_mode` identifica o tipo de geração atualmente usado
pelo editor/engine.

------------------------------------------------------------------------

# 7. Field

Schema nativo:

``` text
{
  id,
  lang,
  role,
  content: {
    type: "plain",
    value
  },
  audio,
  image,
  pinyinFieldId
}
```

Regras:

-   idioma pertence ao Field;
-   idioma não determina direção;
-   idioma não determina automaticamente áudio;
-   `role` é metadado semântico;
-   `role` nunca determina direção;
-   `fieldOrder` representa somente a ordem editorial;
-   imagem pertence ao Field;
-   áudio pertence ao Field;
-   relações de pinyin podem ser expressas por `pinyinFieldId`.

Rich text permanece como evolução futura.

------------------------------------------------------------------------

# 8. Card Types

MVP fixo:

1.  **Normal**
2.  **Normal com reverso**
3.  **Digite a resposta**
4.  **Complete a lacuna (Cloze)**
5.  **Múltipla escolha**

Não haverá templates personalizados pelo usuário no MVP.

------------------------------------------------------------------------

## 8.1 Normal

Gera um CardInstance.

Exemplo:

`front → back`

A direção vem da estrutura do CardInstance.

------------------------------------------------------------------------

## 8.2 Normal com reverso

Gera dois CardInstances independentes:

`A → B`

e

`B → A`

Características:

-   mesmo Note;
-   mesmo Deck;
-   FSRS independente;
-   histórico independente;
-   identidade independente;
-   não usa toggle de direção;
-   não usa `isReverse` como mecanismo estrutural.

Alterar a Note altera os dois Cards.

Mover a Note move os dois Cards.

------------------------------------------------------------------------

## 8.3 Digite a resposta

Possui:

-   Field de prompt;
-   Field de resposta esperada.

No chinês, pode utilizar `pinyinFieldId` para representar a resposta
esperada em pinyin.

A comparação deve reutilizar a lógica existente de normalização/accepted
forms.

Não duplicar lógica de comparação dentro do editor.

------------------------------------------------------------------------

## 8.4 Cloze

O editor possui um único campo de texto.

Fluxo:

1.  usuário escreve o texto;
2.  seleciona uma parte;
3.  clica em Cloze;
4.  o trecho selecionado vira uma marca;
5.  múltiplas marcas podem existir;
6.  cada marca gera um CardInstance independente.

Representação interna:

`{{c1::Je}} {{c2::suis}} brésilienne.`

Pode existir comparação opcional:

`{{c1::汉字|pinyin}}`

Nesse caso:

-   texto antes de `|` é conteúdo visível do Cloze;
-   valor depois de `|` é `compareAnswer`;
-   sintaxe nunca deve ser exibida diretamente ao usuário.

Cada `cN` possui FSRS próprio.

------------------------------------------------------------------------

## 8.5 Múltipla escolha

Schema nativo:

-   exatamente 1 prompt;
-   exatamente 1 answer;
-   1--3 distractors.

Distractors são campos/estruturas semânticas da Note.

Não criar um sistema paralelo de `choices`.

Não inventar distractors automaticamente.

------------------------------------------------------------------------

# 9. Áudio e mídia

Áudio é propriedade explícita do Field.

Não assumir:

> "campo em francês = gerar áudio automaticamente"

O usuário deve poder escolher o áudio.

Fontes possíveis:

-   gravação;
-   upload;
-   TTS/AwesomeTTS-like;
-   outras fontes futuras.

A arquitetura deve separar:

-   existência do áudio;
-   origem do áudio;
-   referência ao arquivo;
-   idioma do Field.

O idioma do Field não é um gatilho de áudio.

------------------------------------------------------------------------

# 10. Tags

Tags pertencem à **Note**, não ao CardInstance.

Consequentemente:

-   dois Cards irmãos compartilham as mesmas Tags;
-   Tags não são duplicadas por direção;
-   Tags acompanham a Note quando ela é movida.

Tags são **globais na conta** e compartilhadas entre idiomas.

Exemplo:

`criado-por-catharina`

pode ser usada simultaneamente em:

-   Francês;
-   Inglês;
-   Chinês.

O Painel pode portanto encontrar Notes de múltiplos idiomas através da
mesma Tag.

------------------------------------------------------------------------

## 10.1 Normalização

Tags devem:

-   ser minúsculas;
-   não possuir acentos;
-   não possuir espaços;
-   transformar espaços em `-`;
-   evitar caracteres especiais;
-   tratar diferenças de maiúsculas/minúsculas como a mesma Tag.

Exemplos:

`Erro` → `erro`

`Coisas que errei hoje` → `coisas-que-errei-hoje`

`passé composé` → `passe-compose`

Não haverá hierarquia de subtags.

------------------------------------------------------------------------

## 10.2 Renomear Tag

O usuário pode renomear uma Tag no Painel.

A operação altera todas as Notes que utilizam aquela Tag.

------------------------------------------------------------------------

## 10.3 Atribuição de autoria

Cards copiados de Deck público recebem:

`criado-por-[username]`

Exemplo:

`criado-por-catharinaurbani`

Essa Tag:

-   é permanente;
-   não pode ser apagada pelo destinatário;
-   representa o autor original;
-   permanece mesmo se o Deck for posteriormente movido.

Username é imutável.

Display name pode mudar.

Em cópias múltiplas, preserva-se somente a atribuição original.

------------------------------------------------------------------------

# 11. Study Trail

Cursos e Decks são conceitos diferentes.

Exemplo:

**Curso:** Francês geral\
**Deck correspondente:** Francês \> Francês geral

O Curso é uma experiência pedagógica.

O Deck é uma unidade de organização/estudo.

------------------------------------------------------------------------

## 11.1 Geração de Cards

O Study Trail só gera Cards depois que o aluno encontra/estuda o
conteúdo correspondente.

Tanto:

-   nova palavra/expressão;
-   "Na frase"

devem gerar Cards separados quando ambos estiverem definidos como itens
estudáveis.

Exemplo de Tags:

-   `estudo`
-   `frances-geral`
-   `modulo-1`
-   `unidade-familia`
-   `licao-4`
-   `palavra`
-   `na-frase`

Os Cards entram no mesmo Deck de curso correspondente.

A implementação deve primeiro auditar o comportamento atual do Study
Trail antes de alterar o pipeline.

------------------------------------------------------------------------

# 12. Review

A tela principal de Review deve se aproximar da tela de Decks do Anki.

Tabela/lista:

  Deck     Novo   Aprendendo   Revisar
  ------ ------ ------------ ---------

Não haverá botão "Estudar" nessa tela principal.

Clicar no nome do Deck abre a tela intermediária de detalhes.

------------------------------------------------------------------------

# 13. Detalhe do Deck

Tela inspirada no Deck Detail do Anki.

Mostrar:

-   nome do Deck;
-   Novo;
-   Aprendendo;
-   Revisar.

Ações:

-   **Estudar agora**
-   **Adicionar cartão**
-   **Painel**

O Painel não é a mesma coisa que essa tela.

------------------------------------------------------------------------

# 14. Painel

O Painel é equivalente conceitualmente ao Browser/Navegador do Anki.

Serve para:

-   listar Cards/Notes;
-   pesquisar;
-   filtrar;
-   editar;
-   visualizar;
-   gerenciar Tags;
-   selecionar Notes;
-   executar ações administrativas permitidas.

Tags são filtros no Painel.

Tags não aparecem como filtro da tela principal de Review.

O Painel trabalha preferencialmente no nível de Note, porque Tags
pertencem à Note.

Ao selecionar uma Note com dois Cards, ambos devem ser apresentados como
pertencentes à mesma unidade de conteúdo.

------------------------------------------------------------------------

# 15. FSRS e estados

FSRS é global por usuário.

Não haverá presets de FSRS específicos por Deck.

Configurações globais incluem:

-   FSRS;
-   frequência de revisão;
-   novas palavras por dia;
-   intensidade da sessão.

Não criar configuração independente por Deck sem nova decisão
arquitetural.

------------------------------------------------------------------------

## 15.1 Estados conceituais

### New

Card nunca estudado.

### Learning

Card já visto, mas ainda não graduado.

### Review

Card graduado e elegível para revisão.

Review não significa:

> "errou anteriormente".

Um Card em Review pode sofrer lapse, entrar novamente em relearning e
depois retornar para Review.

------------------------------------------------------------------------

## 15.2 Contagem versus estado

Separar:

-   estado persistido do Card;
-   disponibilidade do Card na sessão atual.

A interface mostra quantidade relevante para o estudo naquele momento,
respeitando regras globais e disponibilidade.

------------------------------------------------------------------------

# 16. Normal com reverso e FSRS

Cada direção possui scheduling independente.

Exemplo:

Note:

`Bonjour ↔ Olá`

Cards:

-   Card A: `Bonjour → Olá`
-   Card B: `Olá → Bonjour`

Se o aluno:

-   acerta A;
-   erra B;

o estado de A e B pode divergir.

Não utilizar um único FSRS para os dois.

------------------------------------------------------------------------

# 17. Limite gratuito

O limite de Cards é contado por **CardInstance**, não por Note.

Exemplos:

-   Normal = 1;
-   Normal com reverso = 2;
-   Cloze com 3 marcas = 3.

Antes da criação/importação:

1.  calcular quantos CardInstances seriam gerados;
2.  comparar com o limite disponível;
3.  criar somente a quantidade permitida;
4.  informar claramente o corte.

Mensagem definida:

> **Este Deck criaria 100 Cards, mas sua conta pode possuir apenas 20.
> Por isso, apenas os primeiros 20 foram criados.**

Exibir CTA de upgrade Premium de forma destacada.

A lógica deve ser transacional/atômica quando possível e nunca criar uma
parte silenciosamente sem informar o usuário.

------------------------------------------------------------------------

# 18. Decks públicos

Somente Decks dentro de `Meus Decks` podem ser públicos.

Não podem ser públicos:

-   Decks de curso;
-   Decks da professora;
-   raiz do idioma.

Um Deck público possui página própria.

A página mostra:

-   nome;
-   número de Notes;
-   descrição, se existir;
-   idioma;
-   autor;
-   data da última atualização;
-   Cards do Deck.

Não mostrar lista/contagem de Tags como elemento da hierarquia pública.

Tags continuam visíveis dentro dos Cards conforme a experiência
definida.

------------------------------------------------------------------------

## 18.1 Identidade visual de Deck público

O autor não faz upload de imagem personalizada.

Pode escolher:

-   ícone;
-   cor.

A interface pode seguir o padrão visual do seletor de ícone/cor usado em
Projects.

------------------------------------------------------------------------

## 18.2 Permissões

Usuário gratuito:

-   consegue saber que o Deck existe;
-   não pode abrir/importar o Deck público.

Premium:

-   pode importar Deck público de qualquer usuário.

------------------------------------------------------------------------

# 19. Cópia de Deck público

A cópia é independente.

Não existe live link.

Após importar:

-   Notes são independentes;
-   Cards são independentes;
-   Tags são independentes;
-   alterações posteriores no original não alteram a cópia.

A cópia recebe a Tag permanente de autoria original.

------------------------------------------------------------------------

## 19.1 Atualizações do Deck público

Não haverá sistema de assinatura/atualização automática.

Se o autor:

-   editar Cards;
-   adicionar Cards;
-   renomear o Deck;

o Deck continua sendo o mesmo Deck público.

O usuário que já importou precisa procurar/importar novamente
manualmente.

Na nova importação:

-   detectar Deck/Notes semelhantes;
-   avisar;
-   oferecer importação/merge;
-   nunca duplicar silenciosamente conteúdo igual.

------------------------------------------------------------------------

# 20. Perfil público

Username:

-   único;
-   imutável.

Display name:

-   editável.

O perfil público já planejado segue:

`fr/#/user/username`

Pode mostrar:

-   username;
-   display name;
-   avatar;
-   bio;
-   Decks públicos.

Não criar busca pública de usuários sem decisão futura.

------------------------------------------------------------------------

# 21. Importação Anki

O importador `.apkg` deve respeitar a arquitetura nativa.

Fluxo:

`APKG → Anki Notes/Models/Templates → Native Notes/Fields/Card Type → CardInstances`

Nunca:

`APKG → CardInstances persistidos diretamente`

------------------------------------------------------------------------

## 21.1 Estrutura Anki

Interpretar:

-   ZIP;
-   SQLite `collection`;
-   Notes;
-   Cards;
-   Models;
-   Templates;
-   Decks;
-   Media.

Separar:

-   Note Anki;
-   Card Anki;
-   Model;
-   Template;
-   conteúdo.

------------------------------------------------------------------------

## 21.2 Mapeamentos

Basic:

→ Normal

Basic + reversed:

→ Normal com reverso, somente quando os templates demonstrarem
claramente a inversão.

Cloze:

→ Cloze.

Type Answer:

→ somente se a semântica puder ser preservada com segurança.

Multiple Choice:

→ somente se houver estrutura explícita de prompt + resposta + 1--3
distractors.

Nunca inferir Multiple Choice arbitrariamente de HTML.

------------------------------------------------------------------------

## 21.3 Identidade Anki

GUID do Anki não vira Card ID do aplicativo.

Pode ser preservado como metadado se houver campo apropriado.

Os IDs nativos do aplicativo continuam sendo controlados pelo próprio
sistema.

------------------------------------------------------------------------

## 21.4 Mídia

Interpretar referências como:

`[sound:arquivo.mp3]`

e imagens correspondentes.

Mapear para:

-   `Field.audio`;
-   `Field.image`.

Media ausente deve gerar aviso.

------------------------------------------------------------------------

## 21.5 Cloze importado

Preservar clozes de forma segura.

Não transformar automaticamente hints de Cloze em `compareAnswer`.

Somente mapear quando houver semântica inequívoca.

------------------------------------------------------------------------

## 21.6 Histórico Anki

Não importar:

-   review history;
-   FSRS Anki;
-   scheduling state do Anki.

A importação cria conteúdo nativo e usa o scheduling padrão da
aplicação.

------------------------------------------------------------------------

# 22. Destino da importação

O usuário deve poder escolher um destino dentro de `Meus Decks`.

Opções arquiteturais:

1.  preservar hierarquia original dentro do Deck de destino;
2.  colocar tudo em um Deck pessoal existente;
3.  escolher um Deck raiz pessoal e preservar a hierarquia relativa
    abaixo dele.

Não criar um Deck global "Importado".

------------------------------------------------------------------------

# 23. Duplicatas na importação

Se já existir um Deck com o mesmo nome:

> **Um deck com este nome já existe. O que você deseja fazer?**

Opções:

-   criar com sufixo `(2)`;
-   inserir no Deck existente.

Ao inserir:

-   detectar conteúdo igual/similar;
-   oferecer merge;
-   evitar duplicatas silenciosas.

A política deve ser conservadora.

------------------------------------------------------------------------

# 24. Importação de Deck público

Deck público importado entra em:

`Idioma > Meus Decks`

ou em um subdeck pessoal escolhido.

Não criar raiz global "Importado".

Depois da importação, comporta-se como conteúdo pessoal do usuário.

------------------------------------------------------------------------

# 25. Professor/Admin

Admin Mode:

-   OFF → experiência normal do aluno;
-   ON → habilita recursos administrativos.

Com Admin Mode ON, próximo ao perfil do aluno existe um botão:

**Analytics**

Ao desligar Admin Mode, o botão desaparece.

Analytics é escopo posterior, mas a arquitetura de Deck deve permitir
futuramente consultar:

-   Decks do aluno;
-   quantidade de Cards;
-   New/Learning/Review;
-   progresso;
-   quantidade de pessoas que adicionaram Decks públicos;
-   outras métricas.

------------------------------------------------------------------------

# 26. Relacionamento entre Course e Deck

Curso e Deck não são sinônimos.

Exemplo:

**Curso** `Francês geral A1-B2`

Pode conter:

-   módulos;
-   unidades;
-   lições;
-   atividades;
-   conteúdo pedagógico.

**Deck** `Francês > Francês geral`

é a unidade de Cards associada àquele curso.

Um curso pode, no futuro, gerar diferentes Decks.

Um Deck não deve carregar a lógica pedagógica do curso.

Essa separação é necessária para permitir:

-   cursos alternativos;
-   cursos de viagem;
-   pronúncia;
-   cursos futuros;
-   Cards pessoais;
-   Cards de professora;
-   Decks públicos.

------------------------------------------------------------------------

# 27. Compatibilidade com arquitetura atual

A arquitetura existente já possui:

-   Note/Field nativos;
-   Card Type;
-   geração de CardInstances;
-   FSRS;
-   renderizadores separados;
-   Preview baseado no renderer real;
-   editor nativo;
-   Cloze nativo;
-   Type Answer;
-   Multiple Choice;
-   Anki export/import em evolução.

Regras de compatibilidade:

-   preservar IDs existentes;
-   preservar FSRS;
-   preservar histórico;
-   preservar origem;
-   preservar áudio;
-   preservar imagem;
-   não destruir dados legados;
-   evitar segunda fonte de verdade;
-   usar adapters somente na fronteira de compatibilidade.

Legacy pode permanecer como representação de leitura/escrita de
compatibilidade enquanto a migração gradual acontece.

O mirror legado `front/back_trans` é apenas compatibilidade e nunca deve
competir com `fields` como fonte de conteúdo.

------------------------------------------------------------------------

# 28. Revision

A Note possui `revision`.

Incrementar quando uma mudança puder alterar:

-   conteúdo visível ao aluno;
-   resposta correta;
-   estrutura dos Cards gerados.

Mudanças puramente visuais/editoriais que não alteram conteúdo não
precisam necessariamente incrementar.

A regra deve permanecer simples e determinística.

------------------------------------------------------------------------

# 29. Regras de geração

A geração de Cards deve ser determinística.

Para uma mesma:

`Note + Card Type + configuração`

o engine deve gerar o mesmo conjunto lógico de Cards.

Exemplos:

Normal:

`1 CardInstance`

Normal com reverso:

`2 CardInstances`

Cloze com c1/c2:

`2 CardInstances`

Multiple Choice:

`1 CardInstance`

Type Answer:

`1 CardInstance`

Não permitir que Review, Deck ou UI inventem Cards adicionais.

------------------------------------------------------------------------

# 30. Identidade de Card

Namespaces devem permanecer independentes.

Note ID:

-   identifica conteúdo.

CardInstance ID:

-   identifica unidade estudável.

Legacy ID:

-   deve ser preservado quando necessário para compatibilidade.

Para estruturas derivadas:

-   Normal principal mantém identidade compatível;
-   Reverse possui identidade própria;
-   Cloze possui identidade própria por marca.

IDs de Cards irmãos não devem ser confundidos com o ID da Note.

------------------------------------------------------------------------

# 31. Renderização

Todos os modos devem possuir renderer real compartilhado entre:

-   Review;
-   Preview;
-   eventualmente outras superfícies que exibam o Card.

Renderers existentes:

-   Normal;
-   Multiple Choice;
-   Type Answer;
-   Cloze.

Preview não deve duplicar a implementação visual do Review.

Preview deve:

1.  montar estado de Note;
2.  serializar pelo pipeline real;
3.  gerar CardInstances;
4.  chamar o renderer real;
5.  manter estado local próprio;
6.  nunca persistir;
7.  nunca alterar FSRS;
8.  nunca registrar Review.

------------------------------------------------------------------------

# 32. Editor

Editor nativo utiliza estado de Note/Fields.

Componentes compartilhados:

-   Field Editor;
-   Multiple Choice Editor;
-   Type Answer Editor;
-   Cloze Editor;
-   Card Type selector;
-   Preview;
-   persistência nativa.

Rich text:

-   futuro;
-   não bloquear a arquitetura atual.

O editor não deve conhecer detalhes de FSRS.

------------------------------------------------------------------------

# 33. Painel e edição

Ao abrir uma Note no Painel:

-   carregar Note;
-   carregar Fields;
-   carregar Tags;
-   derivar CardInstances;
-   permitir edição conforme permissões.

Ao salvar:

-   validar Note;
-   incrementar revision se necessário;
-   atualizar conteúdo;
-   regenerar Cards;
-   preservar identidade/histórico quando a identidade lógica do Card
    permanece.

Se uma mudança alterar estruturalmente a quantidade de Cards, a política
de preservação deve ser explícita e testada.

------------------------------------------------------------------------

# 34. Permissões de edição

### Curso

Aluno:

-   estuda;
-   não edita estrutura;
-   não move Cards.

### Meus Decks

Aluno:

-   cria;
-   edita;
-   move;
-   exclui;
-   publica, quando elegível.

### Cartões da Professora

Professora:

-   cria;
-   edita;
-   move;
-   organiza;
-   remove.

Aluno:

-   estuda;
-   visualiza conforme permissões;
-   não modifica estrutura/conteúdo controlado.

### Deck público copiado

Aluno:

-   passa a controlar sua própria cópia;
-   pode editar/mover conforme as regras de Deck pessoal;
-   não altera o original.

------------------------------------------------------------------------

# 35. Auditorias obrigatórias antes da implementação

Antes de implementar Decks, executar auditoria de:

1.  FSRS e estados atuais;
2.  Study Trail;
3.  geração de Cards;
4.  persistência atual;
5.  Review;
6.  filtros;
7.  origem dos Cards;
8.  Admin/teacher flow;
9.  Anki import/export;
10. limites Free/Premium;
11. Reports;
12. estrutura de usuário/idioma;
13. public profile/public Deck;
14. tags existentes;
15. qualquer mecanismo atual de `deck`, `collection`, `category` ou
    equivalente.

A auditoria deve localizar o que já existe antes de criar novas
tabelas/estruturas.

------------------------------------------------------------------------

# 36. Ordem recomendada de implementação

## Fase A --- Auditoria

### A1 --- Deck/Review/FSRS

Mapear:

-   estados;
-   contagens;
-   sessão;
-   disponibilidade;
-   persistência.

### A2 --- Study Trail

Mapear:

-   geração atual;
-   relação curso → Card;
-   "Na frase";
-   destinos atuais.

### A3 --- Tags

Mapear:

-   armazenamento;
-   normalização;
-   filtros;
-   UI existente.

### A4 --- Professor/Admin

Mapear:

-   cartões de professora;
-   seleção de alunos;
-   permissões;
-   estado ativo/inativo.

### A5 --- Import/Export

Concluir auditoria Anki e compatibilidade com Deck.

------------------------------------------------------------------------

## Fase B --- Modelo de dados

Criar/ajustar:

-   Deck;
-   Deck hierarchy;
-   Note ↔ Deck;
-   tags;
-   source/origin;
-   public identity;
-   teacher ownership;
-   import metadata.

Garantir que:

-   Note tenha um único Deck efetivo;
-   irmãos permaneçam juntos;
-   raiz de idioma seja agregadora;
-   Meus Decks seja Deck real;
-   Cards de curso tenham Deck de curso;
-   Cards de professora tenham Deck controlado.

------------------------------------------------------------------------

## Fase C --- Deck Engine

Implementar:

-   árvore;
-   ancestrais;
-   descendentes;
-   agregação;
-   contagens;
-   escopo de estudo;
-   movimentação;
-   exclusão;
-   validação de destino.

------------------------------------------------------------------------

## Fase D --- FSRS/Review Integration

Implementar:

-   New;
-   Learning;
-   Review;
-   due;
-   contagens;
-   limites globais;
-   Study Now;
-   seleção de Cards por Deck.

Não criar presets por Deck.

------------------------------------------------------------------------

## Fase E --- Study Trail

Integrar:

-   curso → Deck;
-   geração pós-exposição;
-   palavra;
-   Na frase;
-   Tags automáticas;
-   preservação da origem.

------------------------------------------------------------------------

## Fase F --- Editor e criação de Cards

Integrar:

-   Add Card;
-   Deck selector;
-   Note;
-   Tags;
-   Card Type;
-   geração;
-   Preview;
-   persistência.

------------------------------------------------------------------------

## Fase G --- Painel

Implementar:

-   tabela de Notes/Cards;
-   filtros;
-   Tags;
-   edição;
-   seleção;
-   movimentação;
-   operações em lote;
-   permissões.

------------------------------------------------------------------------

## Fase H --- Professor

Implementar:

-   Deck `Cartões da Professora`;
-   subdecks;
-   organização;
-   permissões;
-   visibilidade Admin Mode;
-   integração com alunos elegíveis.

------------------------------------------------------------------------

## Fase I --- Importação/Exportação

Implementar:

-   `.apkg`;
-   Deck hierarchy;
-   destino em Meus Decks;
-   duplicatas;
-   merge;
-   mídia;
-   limite Free;
-   warnings;
-   atomicidade;
-   round-trip tests.

------------------------------------------------------------------------

## Fase J --- Decks públicos

Implementar:

-   publicação;
-   página pública;
-   ícone/cor;
-   permissões Premium;
-   cópia independente;
-   atribuição original;
-   reimportação/merge.

------------------------------------------------------------------------

## Fase K --- Analytics

Posterior:

-   métricas de aluno;
-   visão de Decks;
-   Cards;
-   New/Learning/Review;
-   progresso;
-   dados públicos relevantes.

------------------------------------------------------------------------

# 37. Testes obrigatórios

## Unitários

Testar:

-   geração;
-   Deck hierarchy;
-   agregação;
-   movimentação;
-   exclusão;
-   Tags;
-   normalização;
-   Card siblings;
-   FSRS states;
-   limites;
-   permissões.

## Integração

Testar:

-   Note → Cards;
-   Deck → Review;
-   Study Trail → Deck;
-   Editor → Deck;
-   Import → Deck;
-   Public Deck → copy;
-   Teacher → student;
-   Delete Deck → move/delete Cards.

## Browser

Testar em FR e ZH:

-   Deck list;
-   Deck detail;
-   Review;
-   Panel;
-   Add Card;
-   Tags;
-   teacher;
-   import;
-   public Deck.

## Regressão

Manter toda a suíte atual.

Não aceitar regressão em:

-   Review;
-   Preview;
-   Cloze;
-   Type Answer;
-   Multiple Choice;
-   Speed Review;
-   Combinar;
-   Anki export;
-   Anki import;
-   FSRS.

------------------------------------------------------------------------

# 38. Invariantes arquiteturais

Estas regras devem ser tratadas como invariantes:

1.  Uma Note não pertence a múltiplos Decks simultaneamente.
2.  Todos os CardInstances irmãos de uma Note pertencem ao mesmo Deck.
3.  O Deck raiz do idioma nunca contém Cards diretamente.
4.  Meus Decks pode conter Cards diretamente.
5.  Curso e Deck são entidades conceitualmente diferentes.
6.  CardInstance é a unidade de scheduling.
7.  Normal com reverso possui dois CardInstances independentes.
8.  Review não decide direção.
9.  `isReverse` não é mecanismo estrutural de Card.
10. `reviewDirection` legado não deve controlar Cards nativos.
11. Tags pertencem à Note.
12. Tags são globais na conta.
13. Tags são normalizadas.
14. Atribuição original de Deck público é permanente.
15. Username é imutável.
16. Deck público copiado não possui live link.
17. Cards de curso não podem ser movidos para Decks pessoais pelo aluno.
18. Cards da professora não podem ser modificados/movidos pelo aluno.
19. FSRS é global por usuário.
20. Não existem presets FSRS por Deck no MVP.
21. Card limit conta CardInstances.
22. CardInstances não são persistidos como segunda fonte de conteúdo.
23. Native Fields são a fonte de conteúdo.
24. Legacy fields existem somente como compatibilidade quando
    necessários.
25. Preview usa os mesmos renderers do Review.
26. Cloze possui um único parser central.
27. Não importar review history do Anki.
28. Não criar duplicatas silenciosamente.
29. Não apagar dados existentes durante migração.
30. Não criar novas entidades sem primeiro auditar estruturas
    equivalentes já existentes.

------------------------------------------------------------------------

# 39. Regra geral para futuras mudanças

Qualquer nova funcionalidade envolvendo Cards deve responder
explicitamente:

1.  Ela pertence à **Note**?
2.  Ela pertence ao **Field**?
3.  Ela pertence ao **Card Type**?
4.  Ela pertence ao **CardInstance**?
5.  Ela pertence ao **Deck**?
6.  Ela pertence ao **Review/FSRS**?
7.  Ela pertence à **origem/atribuição**?
8.  Ela é apenas uma propriedade de UI?

Se uma informação puder ser derivada de outra entidade, evitar
armazená-la novamente.

Especialmente:

> **Não criar uma segunda fonte de verdade apenas para facilitar uma
> tela.**

------------------------------------------------------------------------

# 40. Estado esperado ao final

O sistema deverá permitir:

-   cursos independentes de Decks;
-   Decks hierárquicos;
-   Deck raiz agregador;
-   Meus Decks como Deck pessoal real;
-   Cards pessoais;
-   Cards de cursos;
-   Cards da professora;
-   Decks públicos;
-   importação Anki;
-   exportação Anki;
-   Tags globais;
-   Painel estilo Anki;
-   Review estilo Anki;
-   FSRS global;
-   Normal;
-   Normal com reverso;
-   Type Answer;
-   Cloze múltiplo;
-   Multiple Choice;
-   áudio por Field;
-   mídia por Field;
-   atribuição permanente;
-   cópias independentes;
-   controle de permissões;
-   limites por CardInstance;
-   preservação de histórico;
-   compatibilidade com dados legados.

A arquitetura deve continuar permitindo novos idiomas, novos cursos,
novos Card Types e novos formatos de conteúdo sem transformar Deck,
Review ou idioma em mecanismos de apresentação ou lógica que pertencem a
outras camadas.
