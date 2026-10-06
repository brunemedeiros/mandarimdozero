# Projeto: variantes de palavra por idioma do site (cartões da trilha)

Estado: **Fase 0 (auditoria) concluída; nenhuma linha de código de produção alterada.**
Decisões da dona do projeto em 2026-10-06 (abaixo, seção 2). Hoje o histórico por palavra usa a "gaveta"
(`STATE.cardVariants`, `shared/card-variants.js`, commit `c0abfb5`).

## 1. O que é "variante" (e o que não é)

| Caso | Exemplo | Variante? |
|---|---|---|
| A. Mesma palavra estudada, só a tradução muda | `maison` → "casa" / "house" | **Não.** Progresso único; só o verso muda. |
| B. A palavra estudada muda conforme o idioma do site | país/nacionalidade, hanzi 巴/美, moedas, cidades, exemplos e notas culturais | **Sim.** É outro item de memória. |

A categoria B vai **crescer muito** em A2, B1 etc. (país, nacionalidade, moeda, cidade, exemplo e nota cultural).
Isso é requisito de processo: ver seção 6.

## 2. Decisões (dona do projeto, 2026-10-06)

1. **O seletor da variante é só o idioma do site.** Personalizar por país do perfil fica para depois e não é
   pré-requisito. Não existe (nem se pretende) idioma do site por país.
2. **A chave da variante é o IDIOMA, não a palavra.** Mesma palavra em dois idiomas de site = dois cartões
   com históricos separados, porque o áudio gerado é diferente. (Isso substitui a ideia de "compartilhar a
   mesma palavra entre idiomas" da primeira proposta.)
3. A Fase 0 (auditoria, sem mudar comportamento) foi autorizada.
4. Outros slots de variante: deixar para depois; o mecanismo deve ser genérico (por categoria), não só país/hanzi.
5. **(2026-10-06, 2ª rodada) Curso = idioma estudado × idioma do site. Trocar o idioma do site troca o curso**
   (modelo Duolingo: histórico separado por curso, sem "compartilhar" entre idiomas do site). Isso **substitui
   a Opção 2** (variante dormente na mesma conta de progresso) como direção: a separação passa a vir do curso, e
   a gaveta deixa de ser necessária quando os cursos existirem. A Fase 1 do plano (seção 8) fica **suspensa até
   uma auditoria nova** de "progresso por curso" (`progress.data` hoje só é separado por idioma estudado).
   Ainda em aberto: o seletor (ver seção 9), e se streak/XP são por curso ou por conta.
6. **Placeholders de perfil** (mecanismo à parte, independe do item 5): `{nome}`/`{primeiro_nome}` e
   `{nacionalidade}` preenchidos a partir do perfil, para frases como "Je m'appelle {nome}" (hoje fixo "Brune") e
   "Je suis {nacionalidade}". Convidado: nome vazio ou "Convidado". Falta criar "País de Origem" no perfil.
   Preenchimento inicial feito pela dona do projeto: todos os alunos vinculados = Brasil, exceto Barae e Evan =
   EUA; os demais ela informa quando listados. Valor padrão para quem não preencher: a definir (sugestão: Brasil
   para o site em português; neutro em outros idiomas).

## 9. Seletor de idioma/curso (a decidir)

- (1) Seletor de idioma do site que troca interface e curso juntos.
- (2) Seletor de curso "Meus cursos / My courses" (bandeira no topo, lista de cursos, "Adicionar curso"), com a
  lista de cursos oferecida dependendo de "Eu falo X" (idioma do site), estilo Duolingo.
- Recomendação: (2) como controle principal; (1) só no primeiro acesso/login ("Eu falo…") e nas configurações.
  Só oferecer um curso (idioma estudado × idioma do site) quando o conteúdo existir traduzido.

## 3. Diferença real entre as opções (explicação simples)

- **Opção 0 – gaveta (hoje):** um cartão por posição. Ao trocar o idioma, o progresso da palavra atual é guardado
  numa gaveta e o da palavra nova é tirado dela. O cartão é "um só" e o histórico das outras palavras fica escondido.
- **Opção 1/2 – um cartão por variante (sua ideia):** cada idioma tem o seu cartão de verdade, cada um com seu
  FSRS. Só o do idioma ativo entra na fila; os outros ficam "dormentes". A Opção 2 é a Opção 1 com 3 cuidados:
  (a) o id atual continua sendo o da variante original; (b) a variante só é criada quando alguém a usa
  (criação preguiçosa); (c) uma única regra decide quem está dormente.
- **Opção 3 – modelo nativo (Note com campos por idioma):** é migrar a trilha para o mesmo modelo dos cartões
  nativos. Projeto enorme; não recomendado agora.
- **"Seletor plugável"** só queria dizer: a regra "qual variante está ativa" fica separada de "onde ela é guardada".
  Com a decisão 1 o seletor é fixo (idioma do site) e isso deixa de ser uma preocupação.

**Recomendação mantida: Opção 2**, com chave = idioma do site e seletor = idioma do site.

## 4. Como o Duolingo trata isso (pesquisa, confiança média)

Não consegui abrir as páginas oficiais (acesso bloqueado neste ambiente); o que segue vem de resultados de busca
e fontes secundárias, e **os resultados se contradizem em parte**:
- O progresso é guardado **por curso** (idioma estudado + idioma de quem estuda). Trocar de curso não apaga o
  progresso dos outros.
- Um curso com outro "idioma base" muda a interface para esse idioma, sem apagar o progresso dos cursos antigos.
- Fontes secundárias dizem que o Duolingo **não troca o idioma base dentro de um curso em andamento**: para
  mudar, começa-se um curso novo com o outro idioma base.
- Uma busca indicou que a interface pode ser trocada de forma independente sem afetar o progresso; ela não
  trouxe fonte oficial e conflita com o ponto anterior.
- A lista de idiomas disponíveis depende do idioma base (poucos pelo português, dezenas pelo inglês), como você descreveu.

Conclusão para o projeto: o Duolingo trata o idioma de quem estuda como parte da **identidade do curso**.
Isso é coerente com a decisão 2 (histórico separado por idioma). Para o nosso app, confirmar antes de decidir se
trocar o idioma do site no meio do curso deve avisar que o histórico é separado (o aviso de confirmação já existe).

## 5. Fase 0 – auditoria (achados)

Arquitetura atual: a elegibilidade na fila passa por `isCardLessonCompleted()` (fila, contagens de Deck,
Speed, Combinar). Os consumidores abaixo **não passam por esse portão** e precisariam ignorar variantes
dormentes. Contei 54 usos de `STATE.cards` em `fr/app.js`.

| Consumidor | Onde | Risco com variante dormente |
|---|---|---|
| **Agrupamento de "palavra" da trilha (K2)** | `shared/study-trail-model.js`: `studyWordCardsFor` (filtra por `unitId`+`vocabIdx`), `studyWordHasEvidence`, `wordLevelFirstLearnedDates`, `projectStudyWordsToA` | **Alto.** Uma variante com o mesmo `unitId`/`vocabIdx` entraria como "irmã" da mesma palavra e infla/mistura contagens. É o ponto mais delicado. |
| Progresso da trilha / "Estudadas" | `shared/analytics-metrics.js`: `studyTrailWordProgress`, `ownContentProgress` | Médio. Precisa ignorar dormentes. |
| Progresso por unidade | `fr/app.js` linhas ~1886, ~7577, ~8094 (`STATE.cards.filter(c => c.unitId === ...)`) | Médio. |
| Distratores de Speed Review | `fr/app.js` ~5453 | Médio (já passa por `hasPlainFrontBack`; falta o filtro de dormente). |
| Export Anki | `shared/anki-export.js` (`unidade${unitId}`; `ankiExportCardKind`) | Médio. |
| **RPCs do painel/métricas** | `059_teacher_metrics_note_level.sql` (l.69-70), `070_teacher_student_overview.sql` (l.131-146): leem `progress.data.cards` | **Alto.** O servidor não conhece idiomas; precisa de um campo persistido (`dormant`) para ignorar. |
| Decks de curso | `assignCourseDeckIds` (`fr/app.js` ~6385) | Baixo. Variante herda o `deckId` da unidade. |
| Salvar/carregar | `serializeCardsForSave`, `mergeSavedCards`, `migrateCardToFSRS` | Médio. Ids novos precisam sobreviver ao merge-por-id; sem migração do save atual. |
| Gaveta atual | `shared/card-variants.js` + `refreshStudyCardTexts` | A migração gaveta → cartão dormente precisa ser reversível. |

Não auditado ainda (fica para a Fase 0.b): `zh/app.js` linha a linha, painel de estatísticas completo,
notificações do `notification-cron` (que lê o progresso para lembretes).

## 6. Regra de processo (vale para todo conteúdo novo)

Ao criar uma unidade/nível (A2, B1…), para cada item da trilha que **troque a palavra estudada por idioma**
(país, nacionalidade, moeda, cidade, exemplo ou nota cultural):
1. Registrar a categoria do slot (ex.: `nacionalidade`, `moeda`, `cidade`, `exemplo-cultural`) no conteúdo.
2. Cada idioma do site precisa de uma variante própria **com áudio próprio** (decisão 2).
3. Itens que só mudam a tradução (caso A) **não** são variantes.
4. Notas de realidade e culturais seguem a regra de confiança já existente (alta/média/baixa).

## 7. Itens relacionados já pedidos (fora deste projeto)

- Primeiro acesso: escolher o idioma estudado já sabendo o idioma do site; seletor "Idioma do site" no topo
  direito; a lista de idiomas estudáveis depende do idioma do site (como no Duolingo).
- Criar perfil: país de origem, foto opcional, nome sugerido a partir do e-mail, usuário automático.
  Já existe: pergunta do idioma do site no primeiro cadastro (`601953b`) e username automático (migration 060).
  Falta: país de origem no perfil e nome sugerido (não iniciado).
- O país de origem só serviria, no futuro, para variantes onde isso fizer sentido; não muda o idioma do site.

## 8. Plano

| Fase | O quê | Muda comportamento? |
|---|---|---|
| 0 | Auditoria (este documento) | Não |
| 0.b | Fechar o não auditado (zh, estatísticas, notificações) | Não |
| 1 | `variantOf` / `dormant` + predicado único `isVariantActive` chamado em `isCardLessonCompleted` e nos consumidores da tabela; tudo ativo | Não |
| 2 | Migrar a gaveta para cartões dormentes, atrás de flag, reversível; id original intacto | Só com a flag |
| 3 | Persistir `dormant` e fazer as RPCs ignorarem | Sim (painel) |

Gatilho: antes de entrar conteúdo do curso de Português ou um 3º idioma de site. Com 2 idiomas, a gaveta basta.

## 10. Decisões da 3ª rodada (2026-10-06)

- Personagens nomeados em diálogos (Ana/Léo, "B", Brune nas Units 5 e 8 do zh) NÃO são convertidos: não representam o usuário.
- Países dos alunos vinculados: padrão Brasil; Barae (`hirschbarae`) e Evan (`evaneldemachki`) = EUA; demais a confirmar.
- Gênero vira campo do perfil (Masculino, Feminino, Outro, Prefiro não dizer); tratamento de "Outro/Prefiro não dizer" em aberto (ver conversa).
- Cursos: FSRS dos cartões da professora/próprios fica por idioma estudado; missões do dia por curso; ranking = "Todos" + cada idioma estudado (não é curso; francês pelo português ou pelo inglês soma igual); curso só disponível quando o A1 existir no idioma do site; não existe curso sem conteúdo/interface naquele idioma do site.
- Migration 072 (`profiles.country`) aplicada no Staging em 2026-10-06 (produção pendente).

## 11. Decisões da 4ª rodada (2026-10-06): gênero e nacionalidade neutra

- **Gênero** (Masculino, Feminino, Outro, Prefiro não dizer; opcional) é dado sensível e NÃO fica em `profiles` (legível publicamente). Mora em tabela separada `profile_private` (migration 073): `user_id` PK, `gender` com CHECK, RLS só do próprio dono (select/insert/update/delete), `anon` sem privilégio, `on delete cascade`. Professora/admin não leem. Valores internos: `masculine`, `feminine`, `other`, `undisclosed`, NULL.
- **Placeholders**: `{nacionalidade}` (fr) e `{nacionalidade_t}` (pt) dependem do gênero. Masculino = forma masculina; Feminino = feminina; Outro, Prefiro não dizer, não preenchido e convidado = **forma neutra com duas terminações** no texto exibido (fr "brésilien·ne", pt "brasileiro·a"). Inglês ("Brazilian") e chinês não têm gênero, ficam como estavam. Tabela por país em `PROFILE_COUNTRIES` (`fr`/`frm`/`frn`, `pt`/`ptm`/`ptn`). Invariáveis (britannique, canadense) repetem a forma.
- **Áudio**: a forma neutra é LIDA como as duas ("brésilien, brésilienne"), sem mudar o texto exibido nem chaves de manifest. Implementado em `speakableProfileText` (shared/profile-placeholders.js), chamado só no caminho Web Speech de `speakFrenchAudioOnly` (fr/app.js). Texto com placeholder quase nunca bate `AUDIO_MANIFEST` (chave = texto literal), então cai no Web Speech como já ocorria com nome/país; se algum dia bater (ex.: frase sem gênero), toca o mp3. O TTS por Field (Edge Function) não precisa disso: o conteúdo de Fields é digitado pelo usuário e não usa placeholders.
- **Efeito visível**: quem não preencheu o gênero (todos hoje) passa a ver "brésilien·ne"/"brasileiro·a" onde antes aparecia a forma feminina. Decisão da dona.
- Pendente: aplicar a 073 na produção; cada aluna(o) escolhe o próprio gênero (nada é preenchido por nós).

