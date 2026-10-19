# Atividades finais estilo *défi* no site (francês A1 e A2)

Data: 2026-10-17. Documento de **exploração e proposta** (decisão 0.1.4 do `04-lacunas-e-propostas-fr.md`). **Nenhum arquivo do site foi alterado.**
Base: `02-referencia-livros-fr.md` (seções 2 Alter Ego+ 1, 3 Défi 1, 7 Défi 2, 8.7 Défi 3, 14 Défi Actuel 2, 15 Défi Actuel 1) e
`04-lacunas-e-propostas-fr.md` (seções 7 "Atividade final Premium", 9 "Exercícios novos", 11 mapa do A1 revisado, 6.3 mapa do A2).
Fatos sobre o site conferidos no código nesta sessão (arquivo citado em cada linha). Siglas: **DA1** Défi Actuel 1, **DA2** Défi Actuel 2,
**D1** Défi 1, **D3** Défi 3, **AE** Alter Ego+ 1 (as mesmas do `02`).

> **Em uma frase:** dá para ter um *défi* por módulo já com o motor de hoje (texto guiado, ficha, diálogo em turnos, quiz que vira cartões,
> gravação no aparelho), corrigido por regras + modelo + rubrica; o que a sala de aula dava de graça (colega, professora, mural na parede)
> volta em fases: Mural para alunos vinculados **já hoje**, Portfólio e fila da professora na fase 2, IA só depois do paywall.

---

## 1. O que torna um *défi* bom, e o que se perde fora da sala

### 1.1 Princípios (o que os livros fazem e o site precisa manter)

| Princípio | O que é | Como aparece nos livros | Teste rápido para cada *défi* do site |
|---|---|---|---|
| **Tarefa real** | fazer algo que um falante faz na vida (convidar, anunciar, reclamar, guiar) e não "praticar o passé composé" | D1/DA1: cada dossiê fecha com uma tarefa de produção; AE: projeto em 3 tarefas por dossiê | o enunciado tem **destinatário** e **objetivo** ("para o Paul, que vai visitar você")? |
| **Produto final** | sai uma coisa concreta: postal, quiz, guia, CV, calendário | DA2: "donnerie", "recueil", "guia culinário", "programa de festival" | dá para **mostrar** o resultado a alguém (ou guardar)? |
| **Reciclagem do módulo** | a tarefa exige o léxico e a gramática do módulo, não de outro | D1 escreve o módulo "de trás para a frente" (04, 7.1 adota isso) | cada peça obrigatória aponta para uma unidade do módulo? |
| **Personalização** | o aluno fala do mundo dele (cidade, país, gostos) | DA1: "carta de moradias **do seu país**", "itinerários afetivos" | o aluno escolhe algo (tema, lugar, personagem)? |
| **Partilha** | o produto é lido, usado ou votado por outros | turma: exposição, votação, jogo de adivinhação | existe **alguém** do outro lado (amigo, professora, comunidade, personagem)? |
| **Andaime antes da produção** | modelo, exemplo, vocabulário à mão | o dossiê tem *Découvrir* (documento-modelo) antes de *Construire et créer* | o aluno vê um exemplo resolvido antes de escrever? |
| **Tamanho certo** | A1: 20 a 50 palavras ou 3 a 6 trocas; A2: 60 a 80 palavras ou monólogo de 1 a 2 min (DELF) | DELF A1 PE2 40 palavras, A2 PE1 60 palavras (`03`) | cabe em 20 a 40 min? |

### 1.2 O que se perde ao tirar o *défi* da sala, e como recuperar

| Perda | Por que importa | Como recuperar no site | Quando |
|---|---|---|---|
| **Colaboração** (negociar em grupo, dividir tarefas) | é onde a língua é usada "de verdade" | (a) **personagem** que faz o papel do colega no diálogo em turnos; (b) **amigo** responde ao quiz do aluno ou recebe o convite; (c) **enquete da comunidade**: o aluno responde e vê o resultado agregado e anônimo dos outros alunos ("62 % preferem o sábado"), que substitui a estatística da turma do DA1 U4 | (a) fase 1; (b) e (c) fase 2 |
| **Avaliação pelo professor** | é o retorno que corrige erro de gramática e dá confiança | (a) correção **automática** onde há gabarito; (b) **semiautomática**: peças obrigatórias, contagem, "erros previsíveis" do módulo, modelo e rubrica; (c) **professora vinculada**: pelo Mural já hoje, fila própria na fase 2; (d) **IA** só depois do paywall | (a)(b) fase 1; (c) fase 0 e 2; (d) fase 3 |
| **Produto exposto** (cartaz na parede, apresentação) | dá sentido e orgulho ao trabalho | **Portfólio** ("Mon carnet") com os produtos; **baixar como imagem** (postal, cartaz) para mandar por WhatsApp; compartilhar com a professora e, por escolha do aluno, com amigos; deck público para quizzes | fase 1 (imagem), fase 2 (Portfólio com partilha) |
| **Interação oral espontânea** | o diálogo de sala não tem roteiro | diálogo em turnos com ramos e um turno livre; gravação com o modelo em TTS para comparar; para vinculados, o *défi* vira assunto da próxima aula (Aulas, `shared/teacher-class-logs.js`) | fase 1 (turnos e gravação), fase 2 (envio) |
| **Prazo e ritmo do grupo** | a turma puxa | missão do dia / missão em dupla da semana pode ser "fazer o *défi* do módulo"; aviso no sino quando a professora responde | fase 2 |
| **Ferramenta digital do *défi* nº 03** (D1 usava apps externos: mapa interativo, imagem falante) | o produto multimídia | o próprio site é a ferramenta: mapa esquemático, cartão com áudio gravado, cartões próprios com imagem | fase 1 a 2 |

---

## 2. Inventário do que o site tem HOJE (conferido no código)

| Capacidade | Onde (arquivo) | O que faz de fato | Usável num *défi*? Como |
|---|---|---|---|
| **Desafios** (4 categorias) | `fr/app.js` 6528 (`CHALLENGE_VALID_TYPES`), 6652 (`CHALLENGE_CATEGORIES`); tabela `challenges` (`fr/scripts/supabase_migrations/001`, CHECK de `type` ampliado na 007) | Expressões (múltipla escolha), Ouça e traduza (texto livre comparado), Acentuação, Complete a frase. Só no fr | **Sim, como casa do *défi*.** Mas um tipo novo na tabela exige trocar o CHECK de `type` (migration com DROP, SQL Editor da dona). Alternativa sem migration: *défis* como conteúdo em arquivo (ver 7.2) |
| **Unidade "Desafios do Módulo N"** na Trilha | `fr/app.js` 1330 (`fillModuleChallengeRows`) | linha opcional Premium no fim de cada módulo que já tem desafio publicado | **Sim:** é o lugar natural do *défi* na Trilha (depois do Ponto de verificação, sem bloquear) |
| **Paywall** | `fr/app.js` 7069 (`CHALLENGE_PAYWALL_ENABLED = false`), 7072 (`CHALLENGES_SERVER_GATING = false`), `shared/roles.js` 164 (`isPremium`) | selo Premium aparece, nada é trancado | *défi* nasce com selo Premium e aberto a todos enquanto o paywall estiver desligado |
| **Comparador de tradução** | `shared/translation-compare.js` ("sem IA em tempo de execução") | sobreposição de palavras de conteúdo + troca sujeito/verbo, pt-BR e en | **Sim** para mediação (responder em português/inglês) e frases curtas com respostas aceitas |
| **`mustInclude` / `mustExclude`** | `fr/app.js` 8180 a 8223 (alertas do Ouça e traduza) | procura grupos de alternativas no texto e avisa "faltou uma ideia" | **Sim:** é a base das **peças obrigatórias** do texto guiado |
| **Comparador da família latina** | `shared/core/familias/latina.js` | comparação tolerante a acento, correção de ditado, teclado de acentos | **Sim:** campos de ficha e respostas curtas em francês |
| **Ditado com diferença palavra a palavra** | `fr/app.js` 6263 (`evaluateDictation`), 6402 (`renderDictationResult`) | marca palavra certa/errada/faltando | **Sim:** "copie o modelo de memória", ditado de preços/soletrar dentro do *défi* |
| **Dados de conjugação** | `fr/conjugation-data.js` | formas dos verbos | **Sim (novo uso):** detectar forma verbal inexistente no texto do aluno ("*mangons*?") |
| **Exercícios da lição** | `fr/app.js` 3119 (múltipla escolha), 3240 (digitar), 3318 (cenário "o que você diz?"), 3385 (cloze), 3503 (ordenar blocos), 2347/2465 (diálogo e checagens); `shared/core/exercicios-licao.js` | renderers da trilha | **Sim:** aquecimento do *défi* e os turnos fechados do role-play reaproveitam esses renderers |
| **Ponto de verificação** | `shared/checkpoint-exam.js` | prova de 12 itens (palavra, frase, escuta, gramática) | não é *défi*; continua sendo o que destrava o módulo |
| **Gravação de áudio** | `shared/flashcard-field-audio-recorder.js` (MediaRecorder, máquina de estados testada) | grava no navegador; hoje só para Field de cartão | **Sim:** gravação do *défi* oral. **Atenção:** se for enviada, NÃO usar o bucket `flashcard-media` (ver abaixo) |
| **Bucket `flashcard-media`** | `shared/supabase_migrations/032` (`public = true`, policy `flashcard_media_public_read` para `anon`), 046 (5 MiB, só áudio), 072 (+ imagens) | leitura **pública** por URL | **Não** para produção de aluno (voz e texto pessoal ficariam públicos por URL). Precisa bucket privado novo |
| **Bucket `mural`** | `shared/supabase_migrations/087_mural.sql` 531 | **privado**, 10 MB, só PDF e imagem (JPEG/PNG/WebP); link assinado | **Sim, já hoje**, para vinculados: aluno envia foto/PDF do produto. **Sem áudio** |
| **Mural** | `087_mural.sql` 262 (`mural_create_post`), `shared/mural.js` | o aluno com vínculo ativo posta no **próprio mural individual** (texto até 5.000 caracteres + até 5 anexos), a professora comenta; aviso no sino | **Sim, fase 0 sem código:** a professora publica o enunciado, o aluno responde ali, ela comenta |
| **TTS** | `supabase/functions/tts-generate/index.ts` (Google Chirp 3 HD; 20 por janela curta, 300 por mês por conta) + mp3 pré-gerados (`AUDIO_MANIFEST`, skill `audio-tts`) | áudio das falas | **Sim:** falas do personagem e modelo oral **pré-gerados** pela autora (não por aluno, para não gastar cota) |
| **Reconhecimento de fala** | nenhum (`SpeechRecognition` não aparece no código) | | **Não existe.** Pronúncia só por autoavaliação ou professora |
| **IA em tempo de execução** | nenhuma Edge Function chama modelo de linguagem; a "rotina do Banco" usa uma tarefa agendada do Claude da dona (`097_review_bank_agent_inbox.sql`), não uma API | | **Não existe.** Feedback por IA = Edge Function nova (04, 7.2) |
| **Cartões próprios** | `shared/own-flashcards.js`, `shared/my-flashcards.js` 34 (`FREE_OWN_FLASHCARD_LIMIT = 20`), motor em `shared/flashcard-model.js` | 5 tipos (normal, normal com reverso, múltipla escolha, digite, cloze), áudio/imagem por Field, tags, deck | **Sim:** quiz do aluno vira cartões de múltipla escolha num deck "Défi · ..." com tag. Grátis: teto de 20 CardInstances |
| **Decks e Deck público** | `shared/deck-browser.js`, `shared/public-deck.js` (deck pessoal com `is_public`; Free vê só metadados, Premium abre e importa) | | **Sim, com limite:** compartilhar o quiz com amigos funciona só para Premium do outro lado |
| **Course Decks** | `shared/supabase_migrations/051_create_course_decks.sql` (1 deck por unidade de vocabulário) | | indireto: o *défi* pode sugerir "revise o deck da unidade X" quando um item falha |
| **Painel da professora** | `shared/teacher-panel.js` (Alunos, Cartões, Aulas, Material, Mural), `shared/student-metrics.js` (só agregados dos cartões dela) | | **Sim:** Mural e Aulas hoje; **não há fila de correção** |
| **Cartões da professora / Banco de Revisão** | `shared/teacher-flashcards.js`, `shared/review-bank*.js` (081 a 100) | erros de aula viram cartões do aluno | **Sim (ótimo encaixe):** erros que a professora marcar no *défi* viram itens do Banco → cartões |
| **Aulas** | `shared/teacher-class-logs.js` (094, 101) | registro de aula visível ao aluno | o *défi* entregue pode virar assunto da aula seguinte |
| **Sino da professora** | `108_teacher_bell.sql` (categoria `supervisao`) | aviso sobre aluno no sino dela | **Sim (fase 2):** "Ana entregou o *défi* do módulo 6" |
| **Amigos** | `shared/friends.js`, 073/086/095/102/109 | pedido e aceite, ranking, foguinho, parabéns, cutucar, **missão em dupla = meta de XP** (`duo_missions.goal_xp` 150/300/600) | **Parcial:** não há troca de conteúdo entre amigos (nem mensagem); um *défi* em dupla exige tabela nova. A missão pode contar "concluir o *défi*" como XP |
| **Conquistas** | `shared/badge-tracks.js` (trilhas com níveis), `shared/core/gamificacao.js` | | **Sim:** trilha nova "Défis" (bronze/prata/ouro por módulos concluídos) |
| **Notificações e push** | `shared/notifications.js`, `supabase/functions/push-dispatch` | sino, push | **Sim (fase 2):** "a professora comentou o seu *défi*" no idioma do site de quem recebe (`_ui_lang`) |
| **Placeholders de perfil** | `shared/profile-placeholders.js` (`{primeiro_nome}`, `{nacionalidade}`) | | **Sim:** modelos e falas do personagem chamam o aluno pelo nome sem pedir dado novo |
| **Imagem no navegador** | `shared/mural.js` 159 e `shared/profile.js` 344 (canvas para comprimir) | | **Sim:** "baixar o postal como imagem" sem servidor |
| **Mapa interativo** | não existe (o `trail-map.js` é a Trilha) | | tela nova (SVG esquemático) |
| **Portfólio / envios do aluno** | não existe; o progresso mora em `progress.data` (jsonb único por conta, `shared/auth.js` 519 `saveState`), que a professora não lê | | precisa tabela própria (fase 2); na fase 1 dá para guardar a última versão no progresso, com teto |
| **Checkout** | não existe (CLAUDE.md) | | IA paga só depois |

**Conclusão do inventário:** o site já tem quase todas as peças de **correção fechada** e de **interação com personagem**; faltam três
coisas para o *défi* completo: (1) um lugar privado para guardar o que o aluno produz, (2) uma fila para a professora e (3) um canal entre amigos.

---

## 3. Catálogo de formatos (famílias de *défi* adaptadas ao virtual)

Legenda de esforço: **P** pequeno (dados + renderer existente), **M** médio (renderer novo, sem banco), **G** grande (tabela/RLS/migration ou Edge Function).
Todo formato herda as regras do site: texto visível por `t()` (site em inglês sem nada em português), `escapeHTML()` em texto do aluno, cores com tokens nos 4 cenários.

### F1 · Produzir e guardar (texto guiado)
- **Tela a tela:** enunciado com destinatário → "peças obrigatórias" (ex.: cumprimentar, dizer onde está...) → caixa de texto com contador de palavras e teclado de acentos → Enviar → peças encontradas/faltando + alertas de "erros previsíveis" → modelo → rubrica de autoavaliação (4 itens, 0 a 2) → Guardar no Portfólio.
- **Entrega:** texto de 20 a 80 palavras.
- **Correção:** semiautomática (peças por listas de formas, contagem, verbo desconhecido via `conjugation-data.js`, concordância de gênero com o vocabulário do módulo que tem gênero marcado) + modelo + rubrica; professora (fase 2); IA (fase 3).
- **Esforço:** M (renderer de texto livre; lógica reaproveita `mustInclude` e o comparador latino).
- **Grátis x Premium:** *défi* Premium; versão curta dentro da unidade (E1 do 04) grátis.
- **Risco:** texto pode trazer dado pessoal → incentivar personagem/persona; guardar privado.

### F2 · Modelo guiado (ficha, postal, CV, anúncio, cartaz)
- **Tela a tela:** documento desenhado (ficha de hotel, cartão-postal, CV, anúncio) com campos no lugar certo; campos fechados (data, preço, e-mail) e um ou dois campos abertos curtos.
- **Entrega:** documento preenchido, que pode ser **baixado como imagem**.
- **Correção:** automática por campo (gabarito, normalização de data/e-mail/preço) + F1 nos campos abertos.
- **Esforço:** M (um "molde" por tipo de documento, reaproveitado em vários módulos: ficha A1-m7, postal A1-m4, anúncio A1-m5, CV A2-m6).
- **Grátis x Premium:** Premium (o E2 "Formulário" da trilha continua grátis).
- **Risco:** dado real → a ficha é sempre de personagem (decisão 22 do 04).

### F3 · Quiz que o aluno cria e o sistema aplica de volta
- **Tela a tela:** o aluno **joga primeiro** um quiz-modelo da autora → monta 5 perguntas num editor guiado (palavra interrogativa em seletor, resposta certa, 2 distratores) → o sistema confere a forma (ex.: *quel/quelle* com o gênero do nome, preposição com país) → "Salvar como cartões": 5 Notes de **múltipla escolha** em `own_flashcards`, deck "Défi · <tema>", tag `defi-<módulo>` → entram na Revisão do próprio aluno.
- **Entrega:** 5 perguntas (que viram cartões).
- **Correção:** automática na forma (regras pequenas e certeiras); o conteúdo (fato sobre o país) não é corrigido; amigo joga (fase 2).
- **Esforço:** M (editor guiado simples + `createOwnFlashcard` com `nativeState` já existente).
- **Grátis x Premium:** Premium; os cartões criados contam no teto de 20 de quem é grátis (avisar antes de salvar; aluno vinculado e Premium sem teto).
- **Risco:** baixo (texto curto). Compartilhar com amigo via deck público só abre para Premium (`shared/public-deck.js`).

### F4 · Role-play com personagem (diálogo em turnos)
- **Tela a tela:** personagem com nome e áudio (TTS pré-gerado) fala → o aluno escolhe a resposta (turnos fechados, renderer de cenário) ou escreve (turno livre com peças) → ramos: resposta inadequada (registro, sentido) gera reação do personagem e repete o turno → no fim, resumo da conversa inteira e, opcional, gravar um turno em voz.
- **Entrega:** a conversa completa (e a gravação).
- **Correção:** automática nos turnos fechados; semiautomática no turno livre; modelo de cada turno.
- **Esforço:** P a M (E7 do 04 é encadear `scenario`; o turno livre usa F1).
- **Grátis x Premium:** Premium no *défi*; E7 na trilha grátis.
- **Risco:** nenhum de privacidade; cuidado de **coerência pedagógica**: o personagem só usa o que o módulo ensinou.

### F5 · Itinerário / mapa interativo
- **Tela a tela:** mapa esquemático (SVG) de um bairro francófono fictício com 8 lugares do vocabulário → o aluno marca 3 lugares "preferidos" e liga a rota → para cada trecho escreve uma instrução (*Tournez à gauche, allez tout droit, prenez le bus 12*) → o sistema confere as peças (verbo de direção, lugar com contração *au/à la/à l'*); versão compreensão: o sistema dá as instruções e o aluno segue no mapa (automático).
- **Entrega:** itinerário com 3 paradas e frases.
- **Correção:** automática (seguir instruções) + semiautomática (escrever instruções).
- **Esforço:** G (tela nova, acessível no celular, validada nos 4 cenários).
- **Grátis x Premium:** Premium.
- **Risco:** não usar mapa real do bairro do aluno (localização é dado pessoal); só cidade fictícia ou famosa.

### F6 · Coleção de cartões para um deck do tema
- **Tela a tela:** "Monte o seu kit de 8 palavras para <tema> que o curso não ensinou" (ex.: os pratos da sua região) → para cada uma: palavra em francês, tradução, imagem opcional, frase de exemplo usando a gramática do módulo → o sistema confere a frase (peças) → deck próprio.
- **Entrega:** deck com 6 a 10 cartões.
- **Correção:** semiautomática (frase); a palavra nova não tem gabarito (aviso: "confira no dicionário"; professora valida na fase 2).
- **Esforço:** P (editor de cartões já existe; falta só o "roteiro" do *défi*).
- **Grátis x Premium:** Premium; teto de 20 cartões para grátis.
- **Risco:** palavra errada vira cartão e é memorizada: marcar o deck como "feito por você, não revisado" até a professora ver.

### F7 · Troca com amigo (*défi* em dupla)
- **Tela a tela:** o aluno faz a parte dele (ex.: convite) → escolhe um amigo → o amigo recebe aviso, lê e responde com a parte dele (aceitar/recusar com motivo) → os dois veem a troca e o modelo.
- **Entrega:** a troca dos dois.
- **Correção:** semiautomática de cada parte + o amigo marca "entendi / não entendi" (feedback de compreensão, não de gramática).
- **Esforço:** G (tabela nova de trocas + RPC com checagem de amizade + aviso; hoje amigos não trocam conteúdo e a missão em dupla é só meta de XP, `102_friends_duo.sql`).
- **Grátis x Premium:** Premium para quem inicia; responder pode ser grátis (traz o amigo grátis para dentro).
- **Risco:** moderação (texto livre entre pessoas): limite de tamanho, botão de denúncia (`shared/reports.js`), só entre amigos aceitos, nada público.

### F8 · Revisão pela professora vinculada
- **Fase 0 (hoje, sem código):** a professora publica o enunciado no Mural (turma ou individual); o aluno responde no próprio mural (texto + foto/PDF); ela comenta.
- **Fase 2:** botão "Enviar para a professora" no *défi* → fila na aba Professora (Alunos > Défis): texto, áudio, rubrica preenchida pelo aluno → ela marca a rubrica, sublinha erros, escreve ou grava um comentário, e pode **mandar um erro para o Banco de Revisão** (vira cartão pelo fluxo atual) → aviso no sino do aluno.
- **Esforço:** fase 0 nenhum; fase 2 G (tabela + RLS + bucket privado de áudio + tela + avisos nos 2 idiomas do site).
- **Grátis x Premium:** grátis para aluno vinculado (é parte da aula), independente de Premium.
- **Risco:** carga de trabalho da professora (limitar a 1 envio por *défi*, com reenvio só depois do retorno).

### F9 · Autoavaliação com rubrica + comparação com modelo (transversal)
- Entra no fim de F1, F2, F4, F10. Rubrica DELF simplificada (cumpri a tarefa / vocabulário do módulo / frases compreensíveis / ortografia), 0 a 2 cada.
  Comparação com o modelo: lado a lado, com as peças coloridas no modelo e no texto do aluno. "Reescrever" abre o texto de novo (versão 2 fica guardada).
- **Esforço:** P. **Grátis x Premium:** acompanha o *défi*.

### F10 · Produção oral gravada
- **Tela a tela:** pergunta em áudio → gravar até 60 s (A1) ou 2 min (A2) → ouvir a própria voz → ouvir o modelo → rubrica oral (respondi? dá para entender? usei o que o módulo ensinou?) → regravar.
- **Correção:** autoavaliação; professora (fase 2); sem reconhecimento de fala.
- **Esforço:** P na fase 1 (gravação **só no aparelho**, sem envio); M a G para envio (bucket privado).
- **Grátis x Premium:** Premium; E6 da trilha grátis.
- **Risco:** voz é dado pessoal: nunca no bucket público `flashcard-media`.

### F11 · Enquete da comunidade (o "calendário da turma" virtual)
- **Tela a tela:** o aluno responde 3 a 5 perguntas fechadas em francês (*Votre jour préféré ? Votre repas préféré ?*) e escreve uma frase justificando → vê o **resultado agregado e anônimo** dos outros alunos do curso, em francês (*Le samedi est le jour préféré de 48 % des élèves.*) → responde 3 perguntas de leitura sobre o gráfico (automático).
- **Correção:** automática (leitura do gráfico) + peças (frase).
- **Esforço:** G (tabela de respostas fechadas + RPC agregada com mínimo de 10 respostas; sem texto livre no agregado).
- **Grátis x Premium:** Premium para responder o *défi*; o gráfico pode aparecer grátis como isca.
- **Risco:** baixo se só respostas fechadas forem agregadas e nada identificar ninguém.

### F12 · Adivinhação (devinette)
- **Tela a tela:** o aluno resolve 3 adivinhações da autora (*C'est une famille de quatre personnes. Le père est cuisinier...*) → escreve a dele (5 pistas) → o sistema confere as peças (possessivos, *c'est / il est*, profissão sem artigo) → guarda; na fase 2 um amigo tenta adivinhar.
- **Esforço:** P (resolver) + M (escrever). **Grátis x Premium:** Premium.
- **Risco:** pessoas reais e famílias reais: usar só famílias de ficção ou de domínio público, nunca a família do aluno com nomes reais.

### Resumo do catálogo

| Formato | Correção principal | Esforço | Banco novo? | Fase |
|---|---|---|---|---|
| F1 Texto guiado | peças + modelo + rubrica | M | não (fase 1) | 1 |
| F2 Modelo guiado | gabarito por campo + F1 | M | não | 1 |
| F3 Quiz que vira cartões | forma automática | M | não | 1 |
| F4 Role-play em turnos | automática + F1 | P a M | não | 1 |
| F5 Mapa / itinerário | automática + F1 | G | não | 2 |
| F6 Kit de cartões | semiautomática | P | não | 1 |
| F7 Troca com amigo | semiautomática + amigo | G | sim | 2 |
| F8 Professora | humana | 0 (Mural) / G (fila) | sim (fila) | 0 e 2 |
| F9 Rubrica + modelo | autoavaliação | P | não | 1 |
| F10 Oral gravado | autoavaliação / professora | P (local) / G (envio) | sim (envio) | 1 e 2 |
| F11 Enquete | automática | G | sim | 2 |
| F12 Adivinhação | automática + F1 | P a M | não | 1 |

---

## 4. Um *défi* por módulo

Cada *défi* = **núcleo DELF** (a atividade final já proposta no 04, seção 7.4, que fica como parte automática) + **produto pessoal** (o *défi*
propriamente dito). Marcação: **[livro]** reaproveita um *défi* (citado); **[adaptado]** parte de um *défi* e muda bastante; **[original]**.
Tempo = estimativa do aluno com o andaime incluído. Todos **Premium** (paywall desligado: todos usam), com correção da professora grátis para vinculados.

### 4.1 A1 revisado (04, seção 11)

**A1 · 1 (A1-m1) Primeiros contatos** · A1-1 Cumprimentar, A1-2 Se apresentar, A1-3 e A1-21 Números e idade, A1-g1 *avoir/être* + tônicos
- **Principal: "Bienvenue au club !"** [adaptado de DA1 U0/U1 e D1 U1 D1 "apresentar a si mesmo"] · F4 + F10 + F1
  - Enunciado: *Vous arrivez au club de conversation de Lyon. Léa vous accueille. Répondez-lui, puis écrivez votre message de présentation pour le groupe.*
  - Recicla: *bonjour, salut, au revoir, merci, je m'appelle, j'ai ... ans, je suis, et toi ?, moi, enchanté(e)*, números até 20.
  - No site: (1) diálogo de 5 turnos com Léa (cumprimentar, nome, idade, *ça va ?*, despedida), turnos fechados; (2) mensagem de 20 a 30 palavras para o grupo (F1, peças: cumprimento, nome, idade, uma frase com *je suis*, despedida); (3) gravar a apresentação (20 s) e ouvir o modelo.
  - Entregável: conversa + mensagem + gravação. Correção: automática nos turnos; peças + modelo + rubrica; gravação autoavaliada. **Tempo:** 15 a 20 min.
  - Privacidade: idade e nome podem ser os de uma **persona** (o *défi* oferece "usar o meu nome" ou "criar um personagem").
- **Alternativa: "Mon avatar"** [original] · F2: ficha da persona que acompanha o aluno em todos os *défis* (prénom, âge, salutation préférée, 3 chiffres porte-bonheur por extenso). Correção automática (números por extenso). 10 min.

**A1 · 2 (A1-m7) Quem é você** · A1-4 Família, A1-g11 Artigos, A1-g2 Possessivos, A1-22 Profissões, A1-23 Dados pessoais, A1-g12 Negação e perguntas
- **Principal: "Devinez la famille !"** [livro: DA1 U3 "jogo de adivinhação sobre famílias famosas"; D1 U3 nº 03 "imagem falante de uma família célebre"] · F12 + F2
  - Enunciado: *Lisez les indices et devinez la famille. Ensuite, écrivez cinq indices sur une famille célèbre (de film, de série ou de BD).*
  - Recicla: *le père, la mère, le frère, la sœur, mon/ma/mes, son/sa/ses, il est + profissão sem artigo, il n'est pas, c'est / il est*.
  - No site: (1) resolver 3 adivinhações da autora (famílias de ficção: ex. a família de *Le Petit Nicolas*, uma família de desenho); (2) escrever 5 pistas com peças (1 possessivo, 1 profissão, 1 negação, 1 número); (3) **ficha de inscrição** do personagem principal (núcleo DELF do 04: 8 campos) + soletrar o e-mail ouvido.
  - Entregável: 5 pistas + ficha. Correção: ficha e soletrar automáticos; pistas semiautomáticas (alerta *il est un médecin* → sem artigo). **Tempo:** 25 min.
- **Alternativa: "Le portrait d'un pays"** [livro: DA1 U1 "fazer o retrato de um país"; D1 U1 D2] · F2: cartaz "Mon pays en chiffres" (habitants por extenso até 100 não cabe; usar *il y a* + idade média, profissões comuns, línguas). Atenção: países e preposições só no A1-m3; aqui só identidade e profissões. 20 min.

**A1 · 3 (A1-m2) Rotina e calendário** · A1-5 Comida e bebida, A1-6 Horas e rotina, A1-g3 Verbos do 1º grupo e pronominais, A1-7 Dias, A1-24 Meses e datas
- **Principal: "Le calendrier des jours préférés"** [livro: DA1 U4 "criar o calendário dos dias preferidos da turma"; D1 U5 nº 03 "personalidade falando da sua festa preferida"] · F2 + F11
  - Enunciado: *Quel est votre jour préféré de la semaine ? Racontez cette journée heure par heure. Puis découvrez le calendrier des élèves du site.*
  - Recicla: dias, meses, horas (*à huit heures*), pronominais (*je me lève, je me couche*), refeições (*je prends le petit-déjeuner*), *le samedi* (hábito).
  - No site: (1) agenda de um dia (6 horários) em F2: hora em seletor, ação escrita; (2) 3 frases sobre por que gosta desse dia (*j'aime le samedi parce que...*: *parce que* é do A1-27, então aqui só *j'aime... j'adore...*); (3) fase 2: o dia escolhido entra na enquete e o aluno lê o calendário da comunidade (3 perguntas de leitura).
  - Entregável: agenda + 3 frases. Correção: hora/dia automáticos (*à 7 h 30* aceito como *à sept heures et demie*), pronominais conferidos por lista (*je me lève*, não *je lève*). **Tempo:** 20 min.
  - Fase 1 sem enquete: o "calendário" mostra 3 personagens fixos para comparar (*Léa préfère le dimanche...*).
- **Alternativa: "On se voit quand ?"** [04, 7.4: marcar um encontro] · F4 + F1: Léa propõe 2 horários; o aluno recusa um e aceita o outro com dia, hora e lugar. 15 min.

**A1 · 4 (A1-m3) Na cidade** · A1-8 Lugares, A1-g13 *aller* + futuro próximo + contraídos, A1-9 Nacionalidades, A1-g4 Preposições com países, A1-14 Transporte, A1-g5 *faire/prendre*
- **Principal: "Mon itinéraire coup de cœur"** [livro: DA1 U8 "itinerários afetivos na cidade"; D1 U7 nº 03 "mapa interativo dos lugares preferidos do bairro"] · F5 + F1
  - Enunciado: *Votre ami Paul arrive samedi. Choisissez trois lieux que vous aimez dans le quartier et expliquez-lui le chemin. Dites aussi ce que vous allez faire là-bas.*
  - Recicla: *la boulangerie, la gare, le musée, le parc; au / à la / à l'; tournez, allez tout droit, prenez le métro; je vais + inf.*
  - No site: (1) **compreensão**: seguir 3 instruções no mapa (automático); (2) marcar 3 lugares e escrever 1 instrução + 1 frase no futuro próximo para cada (peças: contração certa, verbo de direção, *aller* + infinitivo); (3) núcleo DELF do 04: **mediação**: repassar em português/inglês o horário de um aviso de metrô.
  - Entregável: itinerário de 3 paradas. Correção: automática (seguir) + peças + alerta "*à le* → *au*". **Tempo:** 25 a 30 min.
  - Esforço G (mapa novo): por isso a **alternativa** pode sair antes.
- **Alternativa: "Le quiz de mon pays"** [livro: DA1 U2 "fazer um quiz sobre um país"; D1 U2 D1 "criar um quiz cultural sobre o seu"] · F3: 5 perguntas sobre o país do aluno que viram cartões. Exemplo completo na seção 5.2. 20 min.

**A1 · 5 (A1-m8) Compras** · A1-28 Números 30 a 100 e preços, A1-g10 70 a 99, A1-10 Roupas e compras, A1-11 Mercado, A1-12 Pesos e quantidades, A1-g14 Partitivos
- **Principal: "La boutique de souvenirs de ma ville"** [livro: D1 U2 D2 "criar os souvenirs da sua cidade"; D1 U7 D2 compras] · F2 + F4
  - Enunciado: *Vous ouvrez une petite boutique de souvenirs de votre ville. Créez la vitrine (quatre objets, avec le prix et la couleur). Ensuite, une cliente française entre dans la boutique.*
  - Recicla: preços (30 a 100 €), cores, *un t-shirt, une tasse; il coûte combien ?; c'est cher; je le prends* (fórmula), *du, de la, des*.
  - No site: (1) vitrine em F2: 4 objetos, preço por extenso e em algarismos (automático: *quarante-cinq* = 45), cor concordando; (2) role-play invertido: o aluno é o vendedor e responde à cliente (turnos fechados + 1 livre); (3) núcleo DELF: ditado de 5 preços ouvidos.
  - Entregável: vitrine (imagem baixável) + conversa. Correção: automática (preços, ditado), peças no turno livre. **Tempo:** 25 min.
- **Alternativa: "Le panier anti-gaspi"** [adaptado de D1 U8 D1, antidesperdício] · F2: lista de compras para uma receita com orçamento de 30 €: quantidades (*un kilo de, 200 grammes de*) e partitivos; o site soma os preços de uma "tabela da feira" e confere o total (automático). 20 min.

**A1 · 6 (A1-m4) Viagem, tempo e saúde** · A1-25 Refeições e restaurante, A1-13 Clima, A1-26 Férias e hotel, A1-15 Corpo e saúde, A1-g6 Modais, *il faut*, imperativo
- **Principal: "Carte postale de vacances"** [livro: AE D2 L3 "Bons baisers de..." (cartão-postal); DELF A1 PE2] · F2 + F1 + F9. Exemplo completo na seção 5.1.
  - Enunciado: *Vous êtes en vacances. Écrivez une carte postale à votre ami Paul (35 à 50 mots) : où vous êtes, le temps, ce que vous faites, un conseil, au revoir.*
  - Recicla: *il fait chaud/froid, il pleut, il neige; je suis à; l'hôtel, la plage; il faut + inf.; imperativo (Viens !)*.
  - Entregável: postal (baixável como imagem). Correção: peças + contagem + erros previsíveis + modelo + rubrica. **Tempo:** 20 a 25 min.
- **Alternativa: "Le kit de survie du voyageur"** [original, ecoa DA2 U2] · F1: 5 conselhos para um amigo que vai visitar a sua cidade numa estação (*En juillet, il fait froid à Curitiba : prends un pull ! Il faut boire de l'eau.*). 15 min.

**A1 · 7 (A1-m5) Casa e descrição** · A1-16 Cores e descrições, A1-g15 Adjetivos e demonstrativos, A1-17 Casa, A1-18 Onde as coisas estão, A1-g7 Comparativos
- **Principal: "Logements étudiants de mon pays"** [livro: DA1 U5 "carta de moradias estudantis do seu país"; D1 U4 D1 "descrever moradias (as de lá e as do seu país)"] · F2 + F1
  - Enunciado: *Un étudiant français veut étudier dans votre ville. Présentez-lui deux logements (une chambre en résidence et un appartement en colocation) et comparez-les.*
  - Recicla: *il y a / il n'y a pas de; la cuisine, la salle de bains; grand, petit, clair; ce, cette; plus ... que, moins ... que; à côté de, en face de*.
  - No site: (1) 2 fichas de anúncio (F2: tipo, cômodos, preço, cor/ambiente); (2) 3 frases de comparação (peças: *plus/moins ... que*, concordância do adjetivo); (3) núcleo DELF do 04: o anúncio vira texto de 30 a 40 palavras.
  - Entregável: "carta" com 2 moradias. Correção: campos automáticos; comparação semiautomática (alerta "*plus grand que* com *chambre* → *plus grande*"). **Tempo:** 25 min.
- **Alternativa: "Décorez la chambre"** [livro: D1 U4 D2 nº 03 "revista de decoração"] · F5 em versão pequena: planta de um quarto; o aluno arrasta 6 móveis e descreve onde estão (*Le lit est à côté de la fenêtre*); compreensão inversa automática (o site descreve, o aluno arruma). Esforço G. 20 min.

**A1 · 8 (A1-m6) Lazer, convites e passado** · A1-19 Lazer, A1-g8 Frequência, A1-27 Convites, festas e desculpas, A1-20 Expressões de passado, A1-g9 e A1-g16 Passé composé
- **Principal: "Une personne qui m'inspire"** [livro: DA1 U7 "apresentar as ações de uma pessoa importante na sua área"; D1 U8 D2 "biografia de um alimento"] · F2 + F1
  - Enunciado: *Choisissez une personne importante dans un domaine que vous aimez (sport, musique, cuisine...). Racontez cinq choses qu'elle a faites.*
  - Recicla: passé composé com *avoir* e *être* (*elle a gagné, il est allé*), *en 2010, après, puis*, lazer (*jouer, chanter, voyager*), negação no PC.
  - No site: (1) linha do tempo com 5 marcos (ano em seletor + frase no PC); (2) peças: 3 verbos com *avoir*, 1 com *être* (concordância *elle est allée*), 1 negação no PC; (3) núcleo DELF do 04: **convite e resposta** (F4: um amigo convida para ver um filme sobre essa pessoa; aceitar ou recusar com *parce que*).
  - Entregável: linha do tempo + troca do convite. Correção: verbo conferido contra `conjugation-data.js` (particípio inexistente = alerta), concordância com *être*; peças. **Tempo:** 30 min.
  - Coerência: só verbos do A1-g9/A1-g16; *naître* só se entrar na lista do A1-g16 (hoje *naître* é léxico do A2-3).
- **Alternativa: "Mon week-end en cinq photos"** [04, 7.4] · F1: escolher 5 ilustrações e contar o fim de semana no PC (5 frases). 15 min.

### 4.2 A2 (04, seção 6.3)

**A2 · 1 (A2-m1) Lembranças e fases da vida** · imperfeito, momentos da ação, fases da vida
- **Principal: "Le musée de mon enfance"** [adaptado de D3 U1 "Avant / Après" (teto B1) e DA2 U2 "medicina antes e hoje"] · F2 + F10
  - Enunciado : *Créez la vitrine du « musée de votre enfance » : trois objets, avec une petite étiquette. Puis enregistrez une minute sur votre enfance.*
  - Recicla: *quand j'étais petit(e), je jouais, il y avait, d'habitude, autrefois, le jouet, la récréation*; imperfeito.
  - No site: 3 etiquetas de museu (objeto + 2 frases no imperfeito); gravação de 1 min (DELF A2 PO2) com o modelo da autora em áudio.
  - Correção: imperfeito conferido (formas inexistentes, *je jouait*); peças; rubrica oral. **Tempo:** 30 min.
- **Alternativa: "Avant, maintenant"** [original] · F2: tabela de 4 linhas comparando a cidade do aluno antes e hoje + 60 palavras. 25 min.

**A2 · 2 (A2-m2) Contar uma experiência** · viagem, PC x imperfeito, imprevisto, PC a fundo, acontecimentos, duração e conectores
- **Principal: "Le voyage qui a mal tourné"** [original; DELF A2 PE1] · F2 (montador de história) + F1
  - Enunciado : *Racontez un voyage avec un problème (avion raté, valise perdue...) en 60 à 80 mots. Utilisez « d'abord, ensuite, soudain, heureusement, enfin ».*
  - No site: (1) o aluno ordena 6 cartas-cena de uma história-modelo (automático); (2) escreve a dele com peças: 2 imperfeitos de cenário, 3 PC, 3 conectores, 1 *il y a* + tempo.
  - Correção: peças + verbos + modelo + rubrica DELF (5 critérios). **Tempo:** 30 min.
- **Alternativa: "Le guide de voyage original"** [livro: DA2 U7 "fazer um guia de viagem original"] · F2: 3 fichas "lugar inesperado" de uma viagem já feita (o que vi, o que aconteceu). 30 min.

**A2 · 3 (A2-m3) Objetos e consumo** · descrever objeto, relativos, comprar on-line e reclamar, comparativo/superlativo, consumo responsável, demonstrativos
- **Principal: "La donnerie"** [livro: DA2 U1 "criar a *donnerie* da turma"] · F2 + F7 (fase 2)
  - Enunciado : *Vous déménagez et vous donnez trois objets. Écrivez une petite annonce pour chacun : forme, matière, à quoi il sert. Puis choisissez un objet dans la donnerie et écrivez au donneur.*
  - Recicla: *rond, en bois, léger; ça sert à; c'est un objet qui / que; d'occasion, garder, jeter; celui-ci, celle-là*.
  - No site: (1) 3 anúncios em F2 (foto opcional, peças: matéria, forma, *qui/que*, *servir à*); (2) **vitrine**: na fase 1, objetos da autora (CE automático: "qual objeto serve para a cozinha?"); na fase 2, também os dos amigos que quiserem mostrar; (3) mensagem ao doador (F1).
  - Correção: peças + relativo certo (*un objet que j'utilise*, alerta para *qui j'utilise*). **Tempo:** 30 min.
- **Alternativa: "Le service client"** [04, 7.4: reclamação de produto] · F4 + F1: chat com o atendimento sobre um pacote danificado; e-mail de reclamação de 60 palavras. 25 min.

**A2 · 4 (A2-m4) Saúde e bem-estar** · consulta, COD, corpo e emergências, COI, esporte e hábitos, condicional
- **Principal: "Le recueil des remèdes de grand-mère"** [livro: DA2 U2 "fazer um *recueil* de remédios de avó"] · F2 + F1
  - Enunciado : *Pour un petit livre de remèdes du monde, présentez deux remèdes de votre famille ou de votre pays. Puis donnez un conseil à un ami malade.*
  - Recicla: *le rhume, tousser, la gorge; on le boit chaud; je lui conseille de...; tu devrais*; COD/COI.
  - No site: 2 fichas de remédio (problema, ingredientes, como fazer); conselho com condicional; leitura do "recueil" da autora (3 remédios francófonos, CE automático).
  - Correção: peças (1 COD, 1 COI, 1 condicional) + modelo. Aviso fixo na tela: "não é conselho médico". **Tempo:** 25 min.
  - Risco: informação de saúde falsa; por isso nada vai a público, só Portfólio/professora.
- **Alternativa: "Inventez une épreuve sportive"** [livro: DA2 U4] · F2: regras de uma prova (presente e imperativo; futuro simples só no A2-m6) + conselhos aos participantes (*vous devriez*). 25 min.

**A2 · 5 (A2-m5) À mesa** · restaurante, *en*, receitas, imperativo com pronomes, sentidos, advérbios
- **Principal: "Le guide gourmand de ma ville"** [livro: DA2 U3 "criar um guia culinário da sua cidade"] · F2 + F6
  - Enunciado : *Créez trois pages d'un guide gourmand : un plat typique, un restaurant que vous aimez, une recette rapide.*
  - Recicla: *croustillant, épicé, délicieux; on en mange; coupez-les; de plus en plus; plutôt, trop*.
  - No site: 3 páginas em F2; a receita usa imperativo com pronome (peça); os pratos viram um **kit de cartões** (F6) com foto.
  - Correção: peças + modelo; alerta *en* ausente quando há quantidade. **Tempo:** 35 min.
- **Alternativa: "Au restaurant"** [04, 7.4: reserva e pedido; DELF A2 PO3] · F4 com turno de reclamação do prato. 20 min.

**A2 · 6 (A2-m6) Estudos e projetos** · estudos, futuro simples, aprender línguas, *quand*/*si*, projetos e sonhos, *savoir* x *connaître*
- **Principal: "Le CV d'un personnage de fiction"** [livro: DA2 U5 "fazer o CV de um personagem fictício"] · F2
  - Enunciado : *Choisissez un personnage de livre ou de film. Écrivez son CV (formation, langues, compétences) et une phrase sur ses projets.*
  - Recicla: *le diplôme, le stage, la formation; il parle couramment; il sait / il connaît; dans cinq ans, il travaillera*.
  - No site: molde de CV francês (F2) com campos fechados (datas, níveis de língua A1 a C2) e abertos; "projetos" com futuro simples e *si* + presente.
  - Correção: datas e níveis automáticos; *savoir/connaître* conferidos por lista; futuro simples contra `conjugation-data.js`. **Tempo:** 30 min.
  - Continuidade: o CV fica no Portfólio e é usado no *défi* do A2-m7.
- **Alternativa: "Lettre à moi dans cinq ans"** [original] · F1: 60 palavras no futuro simples sobre o próprio francês. 20 min.

**A2 · 7 (A2-m7) Trabalho e dinheiro** · trabalho, procurar emprego, obrigação/proibição, regras, banco, discurso indireto
- **Principal: "L'entretien d'embauche"** [livro: DA2 U6 "preparar uma entrevista de emprego"] · F4 + F10 + F1. Exemplo completo na seção 5.3.
  - Recicla: *l'offre d'emploi, postuler, l'expérience, motivé; il faut, on n'a pas le droit de; elle demande si*.
  - Entregável: entrevista + gravação + repasse em discurso indireto. **Tempo:** 30 a 35 min.
- **Alternativa: "Le règlement du coworking idéal"** [original, ecoa AE D9 L3 regulamento] · F2: 6 regras (obrigação, proibição, permissão). 20 min.

**A2 · 8 (A2-m8) Moradia e cidade** · procurar moradia, colocação e vizinhos, *y*, papelada, trânsito, indefinidos
- **Principal: "La charte de la coloc"** [livro: AE D9 L3 "Cherchons colocataire" (regulamento de convivência)] · F2 + F1
  - Enunciado : *Vous cherchez un(e) colocataire. Écrivez l'annonce, puis la charte de la maison (six règles). Enfin, écrivez un message poli au voisin qui fait du bruit.*
  - Recicla: *le loyer, les charges, meublé; faire le ménage, sortir les poubelles; chacun, tout le monde, quelqu'un; on y va*.
  - Correção: anúncio (campos), charte (peças: obrigação/proibição/indefinido), mensagem (registro: alerta se começar com *Salut*). **Tempo:** 30 min.
- **Alternativa: "Mode d'emploi pour un étranger"** [original; mediação] · F1: guia de 5 passos para uma pessoa francesa resolver uma papelada na cidade do aluno. 25 min.

**A2 · 9 (A2-m9) Comunicar e se relacionar** · telefonar, cartas com função, pergunta formal, sentimentos, internet e redes, negação complexa
- **Principal: "Invitation et réponse"** [original; DELF A2 PE2 carta com função] · F7 (fase 2) / F4 (fase 1)
  - Enunciado : *Écrivez une invitation à un(e) ami(e) pour un événement. Votre ami(e) va vous répondre. Ensuite, répondez à l'invitation que vous avez reçue.*
  - No site: fase 1: o aluno escreve o convite e responde ao convite de um personagem (aceitar/recusar com desculpa, sentimentos); fase 2: troca real com um amigo do site.
  - Correção: peças (fórmula de abertura e fecho, data/hora, sentimento, *je ne pourrai pas*), registro; amigo marca "entendi". **Tempo:** 25 min.
- **Alternativa: "Messagerie vocale"** [adaptado de AE D5 L2 "Telefonar"] · F10: gravar 3 recados (remarcar, avisar atraso, agradecer). 15 min.

**A2 · 10 (A2-m10) Opinião, cultura e mundo** · livro/filme/exposição, opinar e ligar ideias, patrimônio e festas, meio ambiente, gerúndio, francofonia, *il faut que*
- **Principal: "Mon festival de cinéma"** [livro: DA2 U8 "fazer o programa de um festival de cinema"] · F2 + F11 (fase 2)
  - Enunciado : *Vous organisez un petit festival. Choisissez trois films, écrivez une présentation de chacun et votre avis. Puis votez pour le « Prix du public ».*
  - Recicla: *le personnage, l'histoire, émouvant, ennuyeux; à mon avis, je pense que, comme, donc; en regardant; il faut que tu le voies* (fórmula).
  - Correção: peças (opinião + causa/consequência + gerúndio), modelo; votação agregada na fase 2. **Tempo:** 35 min.
- **Alternativa: "Le guide de voyage de la francophonie"** [livro: DA2 U7] · F2: guia de um lugar francófono (pontos cardeais, paisagem, festa). 30 min.

### 4.3 Quadro-resumo

| Módulo | *Défi* principal | Formato | Origem |
|---|---|---|---|
| A1-m1 | Bienvenue au club ! | F4 + F10 + F1 | adaptado (DA1 U0/U1, D1 U1) |
| A1-m7 | Devinez la famille ! | F12 + F2 | livro (DA1 U3, D1 U3 nº 03) |
| A1-m2 | Le calendrier des jours préférés | F2 + F11 | livro (DA1 U4) |
| A1-m3 | Mon itinéraire coup de cœur | F5 + F1 | livro (DA1 U8, D1 U7 nº 03) |
| A1-m8 | La boutique de souvenirs | F2 + F4 | livro (D1 U2 D2) |
| A1-m4 | Carte postale de vacances | F2 + F1 + F9 | livro (AE D2 L3) |
| A1-m5 | Logements étudiants de mon pays | F2 + F1 | livro (DA1 U5, D1 U4) |
| A1-m6 | Une personne qui m'inspire | F2 + F1 + F4 | livro (DA1 U7) |
| A2-m1 | Le musée de mon enfance | F2 + F10 | adaptado (D3 U1, DA2 U2) |
| A2-m2 | Le voyage qui a mal tourné | F2 + F1 | original (DELF A2 PE1) |
| A2-m3 | La donnerie | F2 + F7 | livro (DA2 U1) |
| A2-m4 | Le recueil des remèdes de grand-mère | F2 + F1 | livro (DA2 U2) |
| A2-m5 | Le guide gourmand de ma ville | F2 + F6 | livro (DA2 U3) |
| A2-m6 | Le CV d'un personnage de fiction | F2 | livro (DA2 U5) |
| A2-m7 | L'entretien d'embauche | F4 + F10 + F1 | livro (DA2 U6) |
| A2-m8 | La charte de la coloc | F2 + F1 | livro (AE D9 L3) |
| A2-m9 | Invitation et réponse | F7 / F4 | original (DELF A2 PE2) |
| A2-m10 | Mon festival de cinéma | F2 + F11 | livro (DA2 U8) |

Usados como alternativa: DA1 U1 (retrato de país), DA1 U2/D1 U2 (quiz), DA1 U6 (atividades por traço de caráter) **não entrou**: adjetivos de caráter
ficaram no A2 (`02`, 15.1); se a dona adiantar a lista curta (*sympa, timide*), vira alternativa do A1-m6. DA2 U4 (prova esportiva) e DA2 U7 (guia de viagem) entram como alternativas.

---

## 5. Três exemplos completos

Textos de interface abaixo em português (site pt-BR); no site em inglês tudo isso sai em inglês. O francês é igual nos dois.

### 5.1 F2 + F1 + F9 · A1-m4 "Carte postale de vacances"

**Tela 1 · Abertura**
> 🏖️ **Défi do módulo 6 · Carte postale de vacances** · selo Premium · ⏱ 20 min
> Você está de férias e vai mandar um cartão-postal para o seu amigo Paul, que mora em Lyon.
> *Vous êtes en vacances. Écrivez une carte postale à votre ami Paul (35 à 50 mots).*
> O seu cartão precisa ter: 1. um cumprimento · 2. onde você está · 3. como está o tempo · 4. o que você faz · 5. um conselho para o Paul · 6. uma despedida.
> [Começar]

**Tela 2 · Escolher o lugar** (muda o modelo e as perguntas de aquecimento)
> *Où êtes-vous ?* (ilustrações) **Nice** (praia) · **Chamonix** (montanha, inverno) · **Québec** (neve)
> Aluno escolhe **Chamonix**.

**Tela 3 · Aquecimento (automático, 3 itens)**
> 1. *À Chamonix, en hiver, il fait...* (a) *chaud* (b) *froid* ✓ (c) *beau et chaud*
> 2. Complete: *Il ___ beaucoup en janvier.* → aluno digita *neige* ✓
> 3. *Paul a froid. Vous dites :* (a) *Prends un manteau !* ✓ (b) *Prenez la plage !* (c) *Il faut chaud.*

**Tela 4 · Escrever** (cartão desenhado: à esquerda a caixa de texto, à direita o endereço fixo *Paul Martin, 8 rue Victor-Hugo, 69002 Lyon*; contador "0 / 35 a 50 palavras"; teclado de acentos)
> Texto do aluno (Ana):
> *Salut Paul ! Je suis à Chamonix avec mon sœur. Il fait très froid et il neige. Le matin, nous faisons du ski et le soir nous mangons une fondue à l'hôtel. C'est super ! Viens en février, mais il faut prendre un manteau ! À bientôt, Ana*
> [Enviar]

**Tela 5 · Retorno (semiautomático)**
> ✅ **Peças: 6 de 6** · cumprimento (*Salut Paul*) · onde (*Je suis à Chamonix*) · tempo (*il fait très froid, il neige*) · o que faz (*nous faisons du ski*) · conselho (*il faut prendre un manteau*) · despedida (*À bientôt*)
> ✅ **Tamanho:** 47 palavras
> ⚠️ **Confira 2 pontos:**
> · *mon sœur* → *sœur* é feminino: **ma sœur**. (veio do A1-g2, Possessivos)
> · *mangons* → com *nous*, os verbos em *-ger* guardam o *e*: **mangeons**. (A1-g3)
> [Corrigir o meu texto] [Ver o modelo]

Como o sistema achou: *sœur* está no vocabulário do curso com gênero feminino → *mon* antes dele dispara o alerta; *mangons* não existe nas formas de `fr/conjugation-data.js` e a forma mais próxima é *mangeons*. O que **não** é pego: ordem estranha, palavra certa no lugar errado, sentido. Isso o retorno diz com clareza: "Este retorno confere peças e erros comuns; não é uma correção completa."

**Tela 6 · Modelo lado a lado**
> *Coucou Paul ! Je suis à Chamonix avec ma famille. Il fait très froid, mais il fait beau. Le matin, je fais du ski et l'après-midi, je me promène en ville. Le soir, on mange une fondue : c'est délicieux ! Viens l'hiver prochain, mais prends un gros manteau ! Bisous, Ana*
> (as 6 peças coloridas nos dois textos)

**Tela 7 · Rubrica (autoavaliação)**
> Fiz o que a tarefa pedia? 0 · 1 · **2** · Usei palavras do módulo? 0 · 1 · **2** · Dá para entender todas as frases? 0 · 1 · **2** · Ortografia e acentos? 0 · **1** · 2 → 7/8
> [Guardar no meu Carnet] [Baixar o postal como imagem] [Enviar para a professora] (só aparece com vínculo ativo; fase 0 = post no Mural; fase 2 = fila)

**Tela 8 · Retorno da professora (fase 2, aluna vinculada)**
> 💬 Prof. Brune: *Très bien, Ana !* Seu cartão está completo e natural. Corrigido: *ma sœur*, *mangeons*. Dica: no cartão a gente usa muito *Bisous* com amigos. Mandei *ma sœur / mon frère* para o seu Banco de Revisão. Nota: 9/10.
> (sino: "A professora comentou o seu *défi* do módulo 6")

### 5.2 F3 · A1-m3 (alternativa) "Le quiz de mon pays"

**Tela 1 · Abertura**
> 🌍 **Défi do módulo 4 · Le quiz de mon pays** · Premium · ⏱ 20 min
> Primeiro, jogue o quiz de uma aluna belga. Depois, crie 5 perguntas sobre o seu país. Elas viram cartões na sua Revisão.

**Tela 2 · Quiz-modelo "La Belgique" (automático)**
> 1. *Quelle est la capitale de la Belgique ?* (a) *Bruxelles* ✓ (b) *Liège* (c) *Genève*
> 2. *On parle quelles langues en Belgique ?* (a) *français, néerlandais, allemand* ✓ (b) *français et anglais* (c) *français et espagnol*
> 3. *Quel est le plat typique ?* (a) *les moules-frites* ✓ (b) *la paella* (c) *les sushis*
> 4. *Où est l'Atomium ?* (a) *à Bruxelles* ✓ (b) *à Paris* (c) *à Montréal*
> 5. *Le festival de BD de Bruxelles est en quel mois ?* (a) *en septembre* ✓ (b) *en mars* (c) *en décembre*
> Ana: 4/5. Retorno mostra a estrutura de cada pergunta: palavra interrogativa + verbo + resto.
> (fatos do quiz-modelo a conferir pela autora antes de publicar)

**Tela 3 · Montar a pergunta 1** (editor guiado: seletor de palavra interrogativa *Quel · Quelle · Quels · Quelles · Où · Comment · Quand*; campo da pergunta; resposta certa; 2 erradas)
> Ana: [Quel] *est la capitale du Brésil ?* · certa: *Brasília* · erradas: *Rio de Janeiro*, *São Paulo*
> ⚠️ *capitale* é feminino → **Quelle** *est la capitale du Brésil ?* [Trocar] → Ana troca. ✅ *du Brésil*: país masculino, certo.

**Tela 4 · Perguntas 2 a 5**
> 2. *On parle quelle langue au Brésil ?* · *le portugais* / *l'espagnol* / *le français* ✅
> 3. *Quel plat on mange à Bahia ?* · *l'acarajé* / *la fondue* / *le couscous* ✅ (aviso brando: "na escrita formal: *Quel plat mange-t-on ?*; aqui está ótimo para a fala")
> 4. *Le Carnaval est en quel mois ?* · *en février* / *en juillet* / *en novembre* ✅ (aviso: "às vezes é em março; quer pôr *en février ou en mars*?")
> 5. *Où est la plage de Copacabana ?* · *à Rio de Janeiro* / *à Salvador* / *à Brasília* ✅ (*en Rio* seria pego: cidade pede *à*)

Regras automáticas usadas: gênero do nome depois de *quel* (lista do curso + pequena lista do *défi*: *capitale, langue, ville, fête, plage, plat, monnaie*), preposição com país (lista do A1-g4) e com cidade (*à*), interrogação terminando em `?` com espaço antes (tipografia francesa: aviso, não erro).

**Tela 5 · Salvar**
> As 5 perguntas viram **5 cartões de múltipla escolha** no deck "Défi · Mon pays" (tag `defi-a1-m3`). Eles aparecem na sua Revisão.
> (conta grátis: "Você tem 12 de 20 cartões próprios; estes 5 cabem.")
> [Salvar] [Desafiar um amigo] (fase 2)

**Tela 6 · Fase 2: amigo joga**
> Marina recebe "Ana criou um quiz sobre o Brasil para você" → joga → Ana recebe "Marina acertou 4 de 5 no seu quiz". Errou a 4 → Ana vê qual alternativa confundiu mais.

### 5.3 F4 + F10 + F1 · A2-m7 "L'entretien d'embauche"

**Tela 1 · Abertura**
> 💼 **Défi do módulo 7 · L'entretien d'embauche** · Premium · ⏱ 30 min
> Você vai fazer uma entrevista para uma vaga num hotel em Annecy. Se você fez o *défi* do módulo 6, o seu CV aparece aqui para consulta.

**Tela 2 · Documento (compreensão escrita, automático)**
> *Offre d'emploi · Hôtel du Lac, Annecy · Réceptionniste (H/F) · CDI, temps plein · Vous parlez français et anglais ; le portugais est un plus · Expérience : un an minimum · Vous travaillez un week-end sur deux · Envoyez votre CV avant le 15 novembre.*
> 1. *Le poste est à temps partiel.* V / **F** ✓ · 2. *Il faut parler deux langues minimum.* **V** ✓ · 3. *On travaille tous les week-ends.* V / **F** ✓

**Tela 3 · Entrevista em turnos** (Mme Girard, recrutadora, com áudio; o aluno responde)
> **T1** *Bonjour, asseyez-vous. Vous avez trouvé l'hôtel facilement ?*
> (a) *Oui, merci, c'est très bien indiqué.* ✓ (b) *Salut ! Ouais, pas de souci.* (c) *Non, je n'ai pas d'expérience.*
> Se (b): Mme Girard ergue a sobrancelha: "Numa entrevista, use o registro formal." e o turno volta.
> **T2 (livre)** *Pouvez-vous vous présenter et parler de votre expérience ?* · peças: formação (*j'ai étudié / j'ai un diplôme*), experiência com duração (*depuis / pendant*), uma língua.
> Ana: *J'ai étudié le tourisme à Recife. Je travaille dans une auberge de jeunesse depuis deux ans. Je parle portugais, anglais et un peu français.*
> ✅ 3 de 3 peças · 💡 "*un peu français* → *un peu le français* fica mais natural, mas é compreensível."
> **T3** *Pourquoi voulez-vous travailler chez nous ?* (a) *Parce que j'aime le contact avec les clients et je voudrais améliorer mon français.* ✓ (b) *Parce que le salaire, c'est tout.* (c) *Parce que je déteste les hôtels.*
> **T4** *Vous pouvez travailler le week-end ?* (a) *Oui, un week-end sur deux, ça ne me pose pas de problème.* ✓ (b) *Non, je ne travaille jamais.* (c) *Oui, je suis en train de dormir.*
> **T5 (livre)** *Vous avez des questions ?* · peça: uma pergunta formal com *est-ce que* (a inversão só vem no A2-m9).
> Ana: *Est-ce que je dois porter un uniforme ?* ✅
> **T6** *Très bien. On vous rappelle cette semaine. Au revoir !* → (a) *Merci beaucoup, au revoir, madame.* ✓

**Tela 4 · Gravação (F10)**
> Grave a resposta do T2 em voz (até 1 min). [● Gravar] → [▶ Ouvir a minha] [▶ Ouvir o modelo]
> Rubrica oral: respondi à pergunta? · dá para entender? · usei *depuis / pendant*? (autoavaliação; com vínculo: "Enviar para a professora", fase 2)

**Tela 5 · Repasse em discurso indireto (automático, comparador)**
> Mme Girard manda um e-mail. Seu amigo pergunta: *Qu'est-ce qu'elle dit ?*
> E-mail: *« Vous commencez lundi. Est-ce que vous pouvez venir à 8 heures ? Où habitez-vous ? »*
> Ana escreve: *Elle dit que je commence lundi. Elle demande si je peux venir à 8 heures. Elle demande où j'habite.* ✅✅✅
> (respostas aceitas incluem *elle me demande si...*; erro previsível *elle demande est-ce que* → alerta "no discurso indireto vira **si**")

**Tela 6 · Fecho**
> Entrevista: 6/6 turnos · 2 turnos livres com todas as peças · repasse 3/3. Modelo completo da entrevista em texto e áudio.
> [Guardar no Carnet] · conquista "Défis" nível bronze (se for o 1º)

---

## 6. Portfólio do aluno ("Mon carnet")

**Vale a pena?** Sim. É o que devolve o "produto exposto" e dá sentido aos *défis* em sequência (o CV do A2-m6 usado no A2-m7; o postal que vira modelo do
relato do A2-m2). Também é a peça que liga aluno e professora sem depender do Mural. O nome *Carnet* ecoa o "Carnet de voyage" do AE.

**Como seria:**
- Entrada em Perfil (ou no painel Aluno): grade de cartões por módulo, com o produto final de cada *défi* (texto, ficha renderizada, áudio, quiz), data, versão e retorno (rubrica, comentário da professora).
- Por produto: **Ver**, **Reescrever** (nova versão; a antiga fica), **Baixar como imagem/PDF** (impressão do navegador), **Compartilhar** com: professora vinculada (padrão desligado; um toque liga) e, na fase 2b, um amigo específico (leitura só).
- Linha do tempo "o meu francês em 18 *défis*": a autoavaliação de cada módulo em gráfico simples.

**Dados (fase 2):** tabela `task_submissions` (conta, idioma, curso, `module_key` estável da Etapa 0 do 04, `task_id`, versão, `content` jsonb com teto de tamanho,
rubrica, `shared_with_teacher`, retorno da professora, datas). RLS só do dono; professora lê por RPC `security definer` com checagem de vínculo ativo (padrão das 059/070);
amigo lê por RPC com checagem de amizade e permissão explícita por produto. Áudio num **bucket privado novo** (padrão do `mural`: caminho com dono, link assinado), nunca no `flashcard-media`.

**Fase 1 (sem tabela):** guardar só a **última versão** de cada *défi* dentro do progresso (`STATE`, salvo por `saveState`), com teto (ex.: 2.000 caracteres por *défi*,
sem áudio), e migrar para a tabela na fase 2. Funciona, mas a professora não vê e o progresso cresce (18 × 2 KB ≈ 36 KB por idioma: aceitável, não ideal).

**Riscos:**
- **LGPD:** texto e voz são dados pessoais; incentivar persona; apagar a conta apaga o Carnet (cascata); nada público; termo curto na primeira vez que compartilha.
- **Moderação:** só existe se houver partilha com amigos; limitar tamanho, permitir denúncia (`shared/reports.js`), nunca galeria aberta.
- **Desvincular a professora** não apaga nada (mesma regra do progresso); ela só perde a leitura.
- **Perder o Premium** não esconde o Carnet: o aluno sempre lê o que produziu (nunca prender o texto do aluno atrás do paywall).
- **Esforço:** G na fase 2 (migration Staging → produção, RLS, RPCs, tela, testes em `tests/defis/`).

**Grátis x Premium:** ver e baixar o próprio Carnet: **grátis** sempre. Produzir *défis*: Premium. Compartilhar com a professora: grátis para vinculado. Compartilhar com amigo: Premium para quem compartilha.

---

## 7. Recomendação de fases

| Fase | O que entra | Correção | Esforço relativo | Grátis x Premium | Depende de |
|---|---|---|---|---|---|
| **0 · já (sem código)** | A professora usa o **Mural** para propor 1 *défi* por módulo aos vinculados (enunciado da seção 4); aluno responde com texto + foto/PDF; ela comenta e manda erros ao Banco de Revisão | professora | nenhum | grátis (vinculados) | nada; só o enunciado pronto (este documento) |
| **1a · motor atual** | 1 *défi* piloto: **A1-m4 Carte postale** (F2 + F1 + F9) e **A1-m3 Quiz** (F3); renderer "texto guiado" (peças + contagem + erros previsíveis + modelo + rubrica); "baixar como imagem"; conclusão em `completedChallenges` | automática + semiautomática | M (renderer + 2 *défis*) | Premium (aberto com paywall desligado) | Etapa 0 (ids estáveis) para amarrar ao módulo; decisão Q2 (onde moram os *défis*) |
| **1b** | os outros 6 do A1 com F4/F2/F1/F12; gravação **local** (F10); trilha de conquista "Défis" | idem | M (sobretudo conteúdo: ~1 dia de autoria por *défi* + revisão da dona) | Premium | 1a |
| **2a · fila da professora + Carnet** | tabela de envios, bucket privado de áudio, aba "Défis" no painel da professora, aviso no sino (categoria `supervisao`) e ao aluno no idioma do site, botão "mandar ao Banco de Revisão" | professora | G | grátis para vinculados; Carnet grátis | migration (Staging antes) + autorização da dona |
| **2b · social** | quiz para amigo, *défi* em dupla (F7), enquete da comunidade (F11), "concluir o *défi*" valendo na missão em dupla, mapa (F5) | amigo / automática | G | Premium para quem inicia; responder grátis | 2a; moderação definida |
| **2c · A2** | 10 *défis* do A2, junto com a construção do A2 (ordem do 04: m1 → m2 → m9 → demais) | idem | M por *défi* | Premium | conteúdo do A2 |
| **3 · IA (depois do paywall)** | Edge Function `writing-feedback` (texto + rubrica DELF → nota por critério + 3 correções comentadas), Haiku primeiro; piloto com 30 a 50 textos corrigidos pela professora para medir concordância; sem nome nem e-mail no texto | IA | M a G | **só Premium com cota** (ex.: 10 por mês) | paywall/checkout; secret no servidor; texto de privacidade |

Ordem de valor por esforço: **0 → 1a → 2a → 1b → 2c → 2b → 3**. A fase 2a vem cedo porque 13 dos 24 alunos atuais estudam português e a fila serve aos dois idiomas.

Observações técnicas:
- **zh:** Desafios só existem no fr (`.claude/rules/frontend-fr-zh.md`); o motor do *défi* deve nascer em `shared/` (renderer de texto guiado, molde de documento) para o pt e o zh herdarem. Os *défis* do zh ficam para depois.
- **Site em inglês:** enunciado, peças, rubrica, alertas e retorno com versão em inglês (camada do curso); o francês é o mesmo.
- **Testes:** `tests/defis/` com casos de peças, erros previsíveis (falso positivo é o maior risco) e salvar como cartões; validação visual nos 4 cenários (skill `teste-navegador`).
- **Notas culturais** dentro dos *défis* (ex.: *Bisous* no postal, CV francês sem foto) seguem a skill `notas-de-realidade`, com confiança reportada.

---

## 8. Perguntas para a dona

1. **Um *défi* por módulo com "núcleo DELF + produto pessoal" (seção 4) substitui a atividade final do 04 (7.4) ou fica além dela?** Recomendo **substituir**: a atividade do 04 vira a parte automática de cada *défi* (já está assim na seção 4).
2. **Onde os *défis* moram: (a) arquivo de conteúdo `fr/module-tasks.js` + camada do curso (como `fr/dictations.js`) ou (b) tipo novo `module_task` na tabela `challenges`?** Recomendo **(a)**: não precisa mudar o CHECK da tabela (migration com DROP), ganha a tradução pela camada do curso e a revisão segue pelo `.md` como os ditados. A linha "Desafios do Módulo N" da Trilha passa a mostrar o *défi* também.
3. **Primeiro piloto: postal (A1-m4) + quiz (A1-m3)?** Recomendo **sim**: um de texto e um que vira cartões, os dois sem banco novo.
4. **Persona/personagem como padrão** (o aluno escolhe "usar o meu nome" ou "um personagem") em todos os *défis* com dado pessoal? Recomendo **sim** (LGPD, decisão 22 do 04).
5. **Fase 0 pelo Mural:** quer que eu prepare os 8 enunciados do A1 prontos para colar no Mural dos vinculados? Recomendo **sim**: custo zero, já testa os enunciados com alunos reais.
6. **Fila da professora (fase 2a):** autoriza planejar a migration (tabela de envios + bucket privado de áudio), Staging antes? Recomendo **sim**, logo depois do piloto 1a.
7. **Retorno da professora vira cartão?** Botão "mandar este erro ao Banco de Revisão" no *défi* corrigido. Recomendo **sim** (reaproveita `approve_review_bank_item`, cartão sai pelo motor de hoje).
8. **Carnet (Portfólio):** grátis para ler e baixar sempre, mesmo sem Premium? Recomendo **sim**.
9. **Partilha com amigos (quiz, troca em dupla, enquete):** entra só na fase 2b e só entre amigos aceitos, sem galeria pública? Recomendo **sim**; galeria pública, nunca sem moderação.
10. **Gravação:** na fase 1 a voz fica **só no aparelho** (não sobe)? Recomendo **sim**; envio só com bucket privado na fase 2a.
11. **Erros previsíveis:** posso montar, por módulo, uma lista curta de erros que o sistema avisa (gênero com possessivo, *-ger* com *nous*, artigo com profissão, *à le*)? Recomendo **sim**, com teto de 5 a 8 regras por módulo e teste contra falso positivo; você revisa a lista.
12. **Tamanho:** A1 com 20 a 50 palavras e 15 a 30 min; A2 com 60 a 80 palavras ou 1 a 2 min de fala, 25 a 35 min. Ok? Recomendo **sim** (DELF).
13. **DA1 U6 (atividades por traço de caráter):** adiantar 6 adjetivos de caráter (*sympa, timide, drôle, calme, sportif, curieux*) para o A1-m6 e usar esse *défi*? Recomendo **não por enquanto** (decisão de manter caráter no A2); fica como *défi* do A2-m9 (sentimentos) se quiser.
14. **Mapa (F5) no A1-m3:** esforço grande. Recomendo lançar o **quiz** (alternativa) no lugar e deixar o itinerário para a fase 2b.
15. **IA (fase 3):** só depois do paywall, Premium com cota, piloto de concordância com os seus textos corrigidos antes. Recomendo **sim**, e nunca para aluno grátis enquanto não houver teto de custo.
16. **Conquista "Défis"** (bronze 1, prata 4, ouro 8 no A1; níveis novos no A2): recomendo **sim**, no catálogo de `shared/badge-tracks.js`.
17. **Fatos culturais dos modelos** (quiz da Bélgica, remédios francófonos, CV francês): recomendo que eu entregue cada um com confiança (alta/média/baixa) para a sua revisão antes de publicar.

---

## Resumo

- Um bom *défi* = tarefa real + produto + reciclagem do módulo + personalização + partilha; fora da sala perdem-se colega, professora e mural, recuperáveis por personagem, amigos, enquete agregada, Mural/fila da professora e Carnet.
- O site já tem: 4 tipos de Desafio, linha "Desafios do Módulo N" na Trilha, `mustInclude`, comparadores (tradução e latino), ditado com diferença, gravador, TTS, cartões próprios, deck público, Mural com anexos privados, Banco de Revisão, sino da professora, conquistas.
- Não tem: fila de correção, lugar privado para produção do aluno (o bucket `flashcard-media` é público), troca de conteúdo entre amigos, reconhecimento de fala, IA, mapa, checkout.
- 12 formatos (F1 a F12) com tela, entrega, correção, esforço, grátis x Premium e risco.
- 18 *défis* (8 do A1 e 10 do A2), cada um com alternativa; 14 principais vêm dos livros (DA1, DA2, D1, AE), 2 são adaptados e 2 originais.
- 3 exemplos completos: postal (A1-m4), quiz do país (A1-m3), entrevista de emprego (A2-m7).
- Carnet (Portfólio): vale; fase 1 na memória do progresso com teto, fase 2 com tabela e bucket privados; leitura sempre grátis.
- Fases: 0 Mural (já) → 1a piloto postal + quiz → 2a fila da professora + Carnet → 1b resto do A1 → 2c A2 → 2b social → 3 IA depois do paywall.
- 17 perguntas para a dona, com recomendação.
