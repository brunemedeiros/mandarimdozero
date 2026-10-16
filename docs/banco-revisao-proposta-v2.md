# Banco de Revisão: respostas e proposta (v2, 2026-10-16)

Continua `docs/banco-revisao-auditoria.md` (v1, como o Banco funciona hoje). Esta versão responde às perguntas da autora, registra as decisões
e propõe as mudanças. **Nada daqui foi implementado no site ainda**: cada proposta espera aprovação (seção 8).

## 1. Decisões já tomadas (autora, 2026-10-16)
1. **Um único conjunto de regras** nos três lugares onde o aluno estuda ou a professora revisa (Modo aula, Aluno > Revisão no site, área do aluno do artifact). A única diferença aceita: **só a Revisão do site gera XP**.
2. **O que o aluno estuda sozinho precisa alimentar o Banco** (estatísticas e Récap). É o modo mais importante do estudo.
3. **Status e "De onde vêm" ficam como estão.** Não mexer.
4. **Primeiro o site, depois decidimos o artifact.** (O ajuste de acentos e de Pronúncia no artifact já foi publicado em 2026-10-16, versão 35.)
5. Teclado de acentos do **português** entra (para o app `pt`).
6. **Áudio e mandarim ficam fora de foco** por enquanto.
7. **Digitar**: resultado automático (Errei com erro, Difícil com "Quase", e no acerto o aluno escolhe Bom ou Fácil), nas mesmas cores da Revisão.

## 2. Respostas às perguntas

### 2.1 "18 pendentes de 725": o que significa? Os outros já estão sendo estudados?
- **Pendente** = item que ainda **espera a sua conferência**; não virou cartão. **Aprovado com cartão** = o cartão já está na conta do aluno, em Aluno > Revisão.
- "Não está pendente" **não** quer dizer "está sendo estudado". Conferi na produção (progresso gravado dos alunos vinculados):

| | |
|---|---|
| Alunos vinculados e ativos | 8 |
| Cartões da professora ativos na conta deles | **731** (os itens aprovados com cartão são 725; a diferença não investiguei) |
| Alunos que já abriram o app depois da entrega (têm esses cartões no progresso) | 5 de 8 |
| Cartões já estudados pelo menos uma vez | **22** (cerca de 3%) |
| Desses, com algum erro | 9 |

Ou seja: os cartões chegaram, mas quase ninguém estudou ainda. Isso reforça a prioridade de a revisão em casa ser fácil de abrir e de **aparecer para você**.

### 2.2 Qual é o motor ou algoritmo de revisão?
- **Site (Revisão e Aluno > Revisão): FSRS-6**, o mesmo algoritmo do Anki atual, com 21 parâmetros. Cada cartão tem estabilidade e dificuldade próprias; a retenção desejada é 90% (o aluno ajusta em Configurações: "mais frequente", "equilibrada", "mais espaçada"). **Errei** sempre volta à meia-noite seguinte. Os botões Errei, Difícil, Bom e Fácil já mostram **o intervalo real** que o motor vai agendar (ex.: 4 h, 1 dia, 2 dias, 1 sem.).
- **Modo aula (professora):** uma **escada fixa de níveis** (seção 2.6), herdada do artifact antigo. Não é FSRS.
- **Artifact (aluno):** outra escada fixa, de 6 caixas, guardada só no navegador.

### 2.3 Só o Modo aula tem Récap? Isso muda da "Revisão do dia" do aluno?
Sim. **Récap** existe só no Modo aula: são até 8 itens escolhidos para a próxima aula. A **Revisão do dia** do aluno (no artifact) é a fila dele, e **Aluno > Revisão no site** tem só o botão "Estudar N" com a fila do dia.
Hoje elas **não se conhecem**. Com os dados compartilhados (proposta A), o Récap passa a ser o que **vale a pena rever em aula**, já descontando o que o aluno fez bem em casa.

### 2.4 Por que o aluno não tem "Última aula"? O que justifica abas diferentes?
Não há justificativa pedagógica registrada: as abas da professora (Récap, Última aula, Erros) e as do aluno no artifact (Revisão do dia, Corrija a frase, Tudo que vimos) foram desenhadas separadas. No **site**, Aluno > Revisão **nem tem abas**: só contagens e o botão. A proposta D coloca as mesmas visões nos dois lados.

### 2.5 Aluno > Revisão é diferente da área do aluno do artifact? Cartões gerados = sem abas?
- **Aluno > Revisão (site):** não tem abas. Mostra contagens (novos, aprendendo, revisão) e o botão "Estudar N", que abre **a mesma sessão da Revisão**, só com os seus cartões. É uma sequência de cartões agendados pelo FSRS para aquele dia.
- **Artifact:** tem as 3 abas e os 3 modos (Ver, Múltipla escolha, Digitar), com visual e regras próprios.
- Sim: com cartões gerados, **não existem** Récap, Última aula e Erros do lado do aluno hoje.

**Previews dos tipos de exercício** (renderizados no app real, claro e escuro): ver as imagens enviadas junto com esta resposta (Normal frente e verso com os 4 botões e intervalos, Completar, Digite a resposta, Pronúncia, Modo aula, painel e sessão de Aluno > Revisão).

### 2.6 O que justifica os níveis e os intervalos do Modo aula? O que é subir e voltar?
- Os dez intervalos (1, 3, 7, 14, 30, 60, 90, 120, 180, 270 dias) vêm do **Banco antigo no artifact**. Não há justificativa pedagógica nem estudo registrados no repositório: é uma escada de caixas parecida com a de Leitner, **igual para todo item e todo aluno**.
- **Subir** (Acertou) = o item vai para o nível seguinte e só volta depois de mais dias. **Com ajuda** = fica no mesmo nível. **Errou** = volta ao nível 0 e reaparece amanhã.
- Só vale para o Modo aula, provavelmente porque ele foi construído antes de existir a ligação com o progresso do aluno (é uma dedução, não está registrado). O FSRS é melhor (ajusta por item e por pessoa), por isso a proposta A **aposenta a escada** quando o aluno tem conta.

### 2.7 Por que não há teclado de acentos no Modo aula? Só flashcard com 3 botões?
Sim: no Modo aula **a professora vê a pergunta, o aluno responde de viva voz e ela marca Acertou, Com ajuda ou Errou.** Ninguém digita, então não há o que acentuar.

### 2.8 O que é a "Visão geral"? É uma lista dos itens aprovados que o aluno consulta?
Não. É um **painel só da professora**: uma linha por aluno com próxima aula, itens pendentes e aprovados, última entrada lida no caderno, dias sem leitura, Récap gerado e usado, revisões e acerto dos últimos 30 dias, erros e o motivo mais comum.
A lista de **tudo que o aluno já viu** é a aba "Tudo que vimos" do **artifact**. No **site** o aluno **não tem** essa lista (a proposta D traz).

### 2.9 Fontes além do Google Docs (Notion, PDF de slides)?
- **Notion:** possível: o conector do Notion existe na conta, mas hoje a tarefa usa só Drive, Calendar e Supabase, então seria preciso ligá-lo e acrescentar ao texto da tarefa onde ler e como identificar aluno e data.
- **PDF de slides:** possível se o PDF estiver no Google Drive (a tarefa lê arquivos do Drive) ou se você me passar o arquivo numa conversa: eu extraio e envio pelo mesmo caminho que a rotina usa (`ingest`). **Não conferi** a qualidade com slides só de imagem (sem texto); PDF com texto selecionável deve funcionar.
- **Dentro do site, sem a Claude:** hoje não existe (a geração depende de um modelo de IA). A importação por arquivo do Banco aceita **itens já prontos**, não PDF cru.

## 3. Proposta A: um dado só, um motor só (prioridade 1)

**Problema:** o que a professora marca no Modo aula chega ao FSRS do aluno, mas o que o aluno faz sozinho **não volta** (ele fica no progresso do próprio aluno, que a professora não pode ler). Resultado: o Récap pode repetir em aula o que ele já dominou em casa, e a "Visão geral" ignora o estudo em casa.

**Como ficaria:**
1. **Cada nota que o aluno dá a um cartão da professora** (no site) grava também um registro no Banco: item, nota (Errei, Difícil, Bom, Fácil), data, se foi digitado e o **próximo vencimento do FSRS dele**. Uma função de banco nova (`log_my_bank_review`) faz isso com segurança (só para os cartões do próprio aluno). Se a internet falhar, o registro espera na fila local e sobe no próximo carregamento (como já ocorre no sentido contrário).
2. **Modo aula e estudo em casa escrevem na mesma tabela** (`review_bank_reviews`), com origem "aula" ou "casa". As estatísticas somam as duas, com filtro.
3. **O vencimento do item passa a ser o do FSRS do aluno** quando ele tem conta. A escada fixa fica só como reserva para aluno sem conta (até vincular).
4. **Regra do Récap** (até 8 itens para a próxima aula): primeiro o que o aluno **errou em casa** ou em aula; depois o que está para vencer ou mais esquecido; **fora** o que ele acertou (Bom ou Fácil) depois da última aula e não está vencido. Assim a aula não repete o que ele já fez bem.
5. **Visão geral e Desempenho** mostram também: dias em que estudou em casa (7 e 30 dias), cartões revistos, acerto em casa x em aula e itens que mais erra em casa.

**Consequências e cuidados:** exige migration (função nova e coluna de nota; Staging primeiro) e **mexe em dado de estudo do aluno**, que a professora passa a ver por item. Sugiro avisar os alunos no texto de privacidade. Alunos sem conta (artifact) continuam de fora até migrarem. O progresso FSRS já gravado **não é alterado** em nada.

## 4. Proposta B: tipos de item, campos e estrutura

**O que os dados mostram** (2163 itens na produção):
- **Vocabulário (960) é um tipo misto:** 56% têm resposta com 3 palavras ou mais (são frases) e 30% trazem alternativas com " / ".
- **A "palavra da lacuna" é preenchida mas pouco usada:** em 391 itens de vocabulário e 244 de erro ela existe, mas **vocabulário nunca vira "completar"** e erro **sempre** vira "digite". A lacuna só funciona em estrutura e verbo, e **só se a palavra aparecer igual** na frase e a frase tiver 3 palavras ou mais.
- **Verbo (137) mistura duas coisas:** tabelas de conjugação ("TER no presente: eu tenho, você tem…") e frases traduzidas ("eu falei / eu perguntei = j'ai parlé / j'ai demandé"). Digitar ou virar a tabela inteira é um exercício ruim.
- **Pronúncia (89):** a resposta mistura a palavra, o som (/karãnt/) e a explicação num campo só.
- A **observação** existe em só 49% dos itens e o nome "Para conferir" se mistura com observação na tela.

**Taxonomia proposta (5 tipos, por função pedagógica):**

| Tipo | Campos | Exercício gerado (consequência) |
|---|---|---|
| **Palavra** (hoje Vocabulário curto) | termo, sentido, artigo ou gênero (opcional), frase de exemplo (opcional), observação | Normal (sentido para termo). **Opção "com reverso"** (termo para sentido), por aluno. Se houver exemplo, um **Completar** extra com o termo |
| **Frase** (hoje Estrutura, e as frases que estão em Vocabulário e Verbo) | frase na língua de referência, frase-alvo, **lacunas marcadas explicitamente** (ex.: `dans [[cette]] entreprise`), regra ou observação | **Completar** quando há lacuna (acaba a regra de achar a palavra igual); sem lacuna, Normal. Opção **traduzir digitando** para a frase inteira |
| **Conjugação** (novo, estruturado) | infinitivo, tempo, uma forma por pessoa | Um cartão **Digite a forma** por pessoa (ou um cartão com as 6 formas), usando o que a Conjugação do site já tem. A tabela deixa de ser um texto solto |
| **Erro corrigido** | frase errada, forma certa, por quê, **categoria do erro** (acento, artigo, concordância, tempo, preposição, ortografia, outro) | Digite a resposta, como hoje. A categoria alimenta as estatísticas |
| **Pronúncia** | palavra ou frase, **som** (campo próprio), dica | Normal (virar para ver). Nunca digitar. Voz da máquina fica para depois, como você disse |

**Campos comuns:** observação (aparece depois de responder), dúvida da professora (interno, nunca aparece ao aluno), data da aula e **origem** (documento e trecho: ajuda a rastrear e a ligar Notion e PDF). Tags de tema, opcionais.

**Impacto:**
- **Migração dos 2163 itens:** por regra segura (Estrutura vai para Frase; Vocabulário com 3 palavras ou mais vai para Frase; Verbo com lista de pessoas vai para Conjugação) e uma **tela de conferência** para os casos ambíguos. **Cartões já entregues e o progresso FSRS não são alterados** sem você confirmar (regra do projeto).
- **Banco de dados:** mudança de tipos e colunas novas (exemplo, formas, som, origem); migration no Staging primeiro.
- **Rotina da madrugada e o Manual de anotações** passam a usar os tipos novos (a função da rotina e o texto da tarefa são atualizados juntos).
- **Quantidade de cartões:** o "com reverso" e o "Completar extra" aumentam os cartões; por isso são opções, não padrão.

## 5. Proposta C: exercícios, botões e visual

1. **Modo aula com 4 botões** (Errei, Difícil, Bom, Fácil), **com o intervalo de cada um**, igual à Revisão. Hoje são 3 botões e as cores não casam: o verde de "Acertou" é a cor do **Fácil** na Revisão, mas vira nota **Bom**, que na Revisão é **azul**.
2. **Digitar (site: Completar e Digite a resposta):** erro = **Errei** (vermelho, mostra a resposta certa); "Quase" (só faltou acento, ou uma letra a mais ou a menos) = **Difícil** (âmbar); acerto = o aluno escolhe **Bom** (azul) ou **Fácil** (verde), com o intervalo de cada um. Hoje o acerto digitado vira Bom direto, sem chance de Fácil, e o XP máximo é 4. Com a mudança, digitar pode render até 8 XP.
3. **Teclado de acentos:** francês como hoje; **português** para o app `pt` (o módulo da família latina já aceita grupos de teclas por idioma).
4. **Paleta (conferida no código):** a Revisão usa Errei = vermelho de erro, Difícil = âmbar, Bom = azul e Fácil = verde. **Aluno > Revisão usa exatamente a mesma sessão** (mesmos botões e cores). O **Modo aula** usa verde, âmbar e vermelho próprios do Banco. O **artifact** tem paleta própria (roxo, verde, âmbar, vermelho). A proposta é **uma só paleta e um só componente de botões** nos três.

## 6. Proposta D: as mesmas visões nos dois lados

| Visão | Hoje | Proposta |
|---|---|---|
| **Hoje** | aluno: "Estudar N" (site) e "Revisão do dia" (artifact) | igual nos dois |
| **Récap** (professora) | só no Modo aula | continua, com a regra nova da proposta A |
| **Última aula** | só no Modo aula | **também para o aluno**: revisar a última aula quando quiser |
| **Erros** | só no Modo aula (itens em que a professora marcou "Errou") | **também para o aluno** ("meus erros"), contando erros de aula **e de casa** |
| **Tudo que vimos** | só no artifact | **também em Aluno > Revisão** (lista pesquisável dos itens aprovados) |

Proposta: estudar fora do vencimento (Última aula, Erros) conta como revisão no FSRS e dá XP no site; a decidir junto com a proposta.

## 7. Estado de português (informação para decidir a ordem)
11 alunos de português, **1058 itens aprovados e 144 pendentes, 0 cartões**: o app `pt` ainda não existe e ninguém está vinculado. Tudo o que for desenhado acima precisa valer também para o `pt` (regra "decisão vale para todos os sites").

## 8. Decisões que preciso da autora e ordem sugerida

**Decisões:**
1. Aprovar a **proposta A** (dados compartilhados com FSRS) e o aviso aos alunos sobre a professora ver o estudo em casa.
2. **Modo aula com 4 botões** e intervalos (recomendo sim).
3. **Taxonomia da proposta B**: aprovar, ajustar ou escolher só parte. Dizer também se "com reverso" e "Completar extra" ficam desligados por padrão (recomendo desligados).
4. **Digitar com Bom ou Fácil** no acerto (recomendo sim).
5. **Visões da proposta D** no Aluno > Revisão do site.

**Ordem sugerida (cada passo testado e entregue sozinho):**
1. Digitar com Bom ou Fácil, intervalos nos botões e teclado do português (pequeno, só no site).
2. Proposta A: registro do estudo em casa, estatísticas e regra do Récap (migration no Staging primeiro).
3. Modo aula com 4 botões e a escada aposentada para quem tem conta.
4. Visões do aluno (proposta D).
5. Tipos novos e migração dos itens (proposta B), junto com a rotina da madrugada e o Manual.
6. Fontes novas (Notion, PDF) e o artifact, quando você decidir.
