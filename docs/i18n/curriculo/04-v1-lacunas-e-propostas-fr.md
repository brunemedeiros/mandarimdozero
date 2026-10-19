# Lacunas e propostas do currículo de francês (A1 revisado e A2 novo)

Data: 2026-10-15. Documento de proposta: **nenhum arquivo do site foi alterado**.
Base: `01-auditoria-fr-atual.md` (o que o site tem), `02-referencia-livros-fr.md` (livros da dona), `03-delf-cefr-a1-a2.md` (DELF/CEFR),
mais conferências pontuais feitas agora em `fr/content.js`, `courses/fr-pt-BR/layer.js`, `fr/conjugation-data.js`, `fr/app.js`,
`shared/study-trail-model.js` e `fr/scripts/grammar_input_map.json` (citadas onde usadas).

Siglas das fontes (as mesmas do `02`, seção 9): **AE** Alter Ego+ 1 (dossiê.lição); **D1** Défi 1 (unidade.dossiê); **D2** Défi 2 (unidade);
**GP** Grammaire Progressive A1 (capítulo, títulos deduzidos); **GEF** Grammaire Essentielle A1-A2 (capítulo); **VP** Vocabulaire Progressif A1
(capítulo); **CPI** Communication Progressive Intermédiaire; **VPI** Vocabulaire Progressif Intermédiaire; **DELF A1/A2** e **CEFR** = `03`.
Siglas do site: unidade `A1-N` (vocabulário), `A1-gN` (gramática), módulo `A1-mN`. Proposta nova: `A1-21`... e `A1-g11`... (ids novos, nunca
reaproveitados), `A2-N` / `A2-gN` / `A2-mN`.

---

## 1. Critérios

### 1.1 Como decidi o nível de cada tópico

| Rótulo | Regra | Exemplo |
|---|---|---|
| **A1 (núcleo)** | Aparece nos **dois métodos A1** (AE dossiês 0 a 6 **e** D1) ou é exigido por uma tarefa do **DELF A1** (formulário, cartão-postal, entrevista, troca de informações, compra com preços). Para gramática/léxico puro, vale também GP/VP + um dos métodos | artigos, *ne... pas*, futuro próximo, passé composé com *avoir* e *être*, dados pessoais |
| **A1+ (zona cinza)** | Aparece no AE e/ou na GP, mas **não** no D1; ou o AE só o traz nos dossiês 7 a 9, que o próprio livro chama "vers le DELF A2" | pronomes COI, *en*, relativos *qui/que*, futuro simples, comparativo, negação complexa |
| **A2** | Só nas fontes A2 (D2, GEF marcados A2 pelo conteúdo, CPI, VPI) ou só nos dossiês 8 e 9 do AE, ou é a tarefa típica do **DELF A2** (relato no passado, carta com função, monólogo de 2 min, interação com negociação) | imperfeito x passé composé, condicional, *si*, discurso indireto, superlativo |
| **B1 (teto)** | Só na Grammaire en Dialogues Intermédiaire (B1) | mais-que-perfeito, futuro anterior, pronomes duplos, relativos compostos |

**Recomendação padrão para a zona cinza** (aplicada item a item nas seções 3 a 5):
1. Se o site **já usa** a estrutura num input (frase, diálogo) e ela resolve uma situação A1, ela fica no A1 como **bloco memorizado com nota de explicação** (reconhecer e usar a fórmula, sem tabela), e é **sistematizada no A2**. Ex.: *je la prends* (A1-10).
2. Se o site **não usa** e o DELF A1 não cobra, vai para o **começo do A2**. Ex.: futuro simples, COI, *en*.
3. Exceção explícita: o **comparativo** (A1-g7 já existe) fica no A1 por decisão de custo zero, mas com input corrigido (decisão 2 da seção 11).

### 1.2 O que é fonte lida e o que é inferência

| Afirmação | Origem | Confiança |
|---|---|---|
| O que o site tem (contagens, unidades, anomalias numeradas "anomalia N") | `01`, conferido por script; conferências extras minhas com `grep`/Node nesta sessão (marcadas "conferido agora") | alta |
| Nível dos tópicos nos livros | `02`, seção 9 (cada linha tem a sua confiança: AE/D1/VP/GEF alta; GP e D2 média) | alta/média |
| Exigências do DELF A1/A2 e descritores CEFR | `03` (sites oficiais não abriram; resumos de busca + memória) | alta nas durações e partes; média nos detalhes |
| Classificação A1 / A1+ / A2 | Regra da tabela 1.1 aplicada às linhas do `02` | média-alta (é inferência minha, mas sobre dados de confiança alta) |
| Listas de palavras das unidades propostas | **Inferência minha** a partir dos temas dos livros (VP e AE) e da necessidade de não duplicar vocabulário já existente no site | média (é proposta para a dona revisar) |
| Ordem e posição das unidades novas | **Inferência minha** com dois limites técnicos do site: ids estáveis e "input antes da gramática" (`grammar_input_map.json`) | média |
| Notas culturais e de realidade sugeridas (seção 8) | Conhecimento meu; confiança anotada nota a nota | variável |
| Ranking de frequência de verbos (seção 6) | Memória de listas de frequência do francês; **conferir com uma fonte** (ex.: Lexique 3) antes de usar | média |

### 1.3 Limites técnicos que moldaram as propostas (conferido agora no código)

- O cartão de palavra da trilha tem id **`u{unidade}-v{índice}`** (`shared/study-trail-model.js:31`, `shared/srs.js:25`) e o de frase usa o
  índice da frase (`shared/study-trail-model.js:211`). **Trocar a ordem, apagar ou mover uma palavra/frase entre unidades muda o id e
  deixa o histórico FSRS do aluno órfão.** Por isso toda proposta abaixo é **"só acrescentar no fim"** dentro de unidades existentes;
  conteúdo novo grande vai em **unidade nova com id novo**.
- Lições (`lessons[].vocabIdx`) só apontam índices: dá para **reagrupar lições** sem mudar id de cartão (afeta só o `lessonIdx` de quem
  está no meio daquela unidade).
- O número do módulo exibido é a **posição** no array (`fr/app.js:1128`, "Módulo ${mIdx + 1}"), não o id. Dá para inserir módulo novo com id
  novo (`A1-m7`) em qualquer posição.
- O desbloqueio é sequencial pela ordem do array `UNITS` dentro do nível (`fr/app.js:4497-4501`): **unidade inserida antes de uma já
  concluída nasce trancada** para quem já passou dali. Precisa de um "reparo de desbloqueio" no carregamento (ver seção 11, etapa D).

---

## 2. Matriz de cobertura

Legenda de **Status**: **BEM** = ensinado explicitamente (gramática ou nota) e praticado; **USO** = aparece em frases/diálogos sem ensino;
**PARCIAL** = parte do tópico está, parte não; **AUSENTE** = não aparece (ou aparece por acaso, 1 ou 2 linhas).
**Nível** = conclusão pela regra 1.1. Contagens "N linhas" = `grep -c` em `fr/content.js` (francês da trilha), conferido agora.

### 2.1 Comunicação e temas

| # | Tópico | Nível | Status | Onde no site | Observação |
|---|---|---|---|---|---|
| C1 | Cumprimentar, despedir-se, *tu* x *vous* | A1 | BEM | A1-1, A1-2 (nota tu/vous), A1-7 (nota despedidas) | |
| C2 | Apresentar-se: nome, nacionalidade, idade | A1 | BEM | A1-2, A1-3, A1-9 | nacionalidades repetidas em A1-2 e A1-9 (anomalia 7) |
| C3 | Apresentar-se: **profissão** | A1 | AUSENTE | nenhuma (`professeur` 0, `étudiant` 0; `médecin` só como saúde) | DELF A1 PO parte 1 pede |
| C4 | **Soletrar / alfabeto** | A1 | AUSENTE | nenhuma (`alphabet` 0) | AE 0, D1 1.1 abrem por aqui |
| C5 | **Dados pessoais, formulário** (endereço, telefone, e-mail, data de nascimento) | A1 | AUSENTE | `adresse` 0, `e-mail` 0, `téléphone` 2 linhas | DELF A1 PE parte 1 |
| C6 | Números | A1 | PARCIAL | A1-3 (0, 1, 2, 3, 10, 20), A1-10 (30 a 100), A1-g10 (70 a 99) | 4 a 9 e 11 a 19 nunca são vocabulário (anomalia 24) |
| C7 | Gostos (*aimer, adorer, détester*) | A1 | PARCIAL | A1-5 (aimer, détester), A1-19 | *adorer* sem vocabulário; *aimer* + infinitivo sem explicação; "moi non plus" 0 |
| C8 | Família | A1 | BEM | A1-4 (núcleo + cônjuges) | faltam avós, filhos (*les enfants*), estado civil (`marié` 0) |
| C9 | Descrição física e caráter | A1 | PARCIAL | A1-16 (grand, petit, joli, gentil) | `yeux` 0, `cheveux` 2 linhas; caráter só *gentil/sympa* |
| C10 | Cidade, lugares, caminho | A1 | BEM | A1-8, A1-18 | |
| C11 | Transportes | A1 | BEM | A1-14, A1-g5 | |
| C12 | Hora e horários | A1 | PARCIAL | A1-6 | *et quart* 1 linha, *et demie* 2; horários de abertura (AE 4.1) ausentes |
| C13 | Dias, meses, datas | A1 | PARCIAL | A1-7 | só lundi, mardi, janvier, décembre; `jeudi`, `vendredi`, `dimanche` 0 linhas na base; 8 meses ausentes (anomalia 25) |
| C14 | Rotina e hábitos | A1 | BEM | A1-6, A1-g3, A1-g8 | |
| C15 | Lazer e esportes | A1 | BEM | A1-19 (jouer de/à) | *faire du sport* usado sem explicar o contraído |
| C16 | **Propor, aceitar, recusar, convidar** | A1 | PARCIAL | A1-7 (marcar/recusar encontro), A1-19 (combinar) | `d'accord` 0, `désolé` 0, `volontiers` 0 |
| C17 | Moradia (cômodos, móveis) | A1 | BEM | A1-17, A1-18 | |
| C18 | Comida e bebida (café, gostos) | A1 | BEM | A1-5 | |
| C19 | **Refeições do dia, cardápio, restaurante** | A1 (restaurante completo A2) | PARCIAL | `petit-déjeuner` 0, `déjeuner` 1, `dîner` 2; *l'addition* em A1-5 | VP 14, AE 7.1 |
| C20 | Compras: loja, preço, tamanho, mercado, quantidade | A1 | BEM | A1-10, A1-11, A1-12 | |
| C21 | Formas de pagamento | A1 | AUSENTE | `carte` 0, `espèces` 0 | AE 8.1; DELF A1 PO parte 3 (pagar) |
| C22 | Roupas e cores | A1 | PARCIAL | roupas: só pantalon, robe (vocabulário); cores BEM (A1-16) | VP 9 |
| C23 | Corpo e saúde básica (*avoir mal à*) | A1 | BEM | A1-15 | consulta completa = A2 |
| C24 | Clima e estações | A1 | BEM | A1-13 | |
| C25 | **Cartão-postal, mensagem curta** | A1 | AUSENTE | nenhuma produção escrita na trilha | DELF A1 PE parte 2; CEFR A1 PE |
| C26 | **Viagem, férias, hospedagem** | A1 | AUSENTE | `hôtel` 0, `vacances` 0, `plage` 0 | AE 2.2-2.3, D1 6.2, VP 26 |
| C27 | **Festas e rituais** | A1 | AUSENTE | `fête` 0; `anniversaire` 4 linhas soltas | AE 5.1 |
| C28 | Telefonar | A1-A2 | AUSENTE | `allô` 0 | AE 5.2 (A1); CPI (A2) |
| C29 | Contar o passado (um dia, um fim de semana) | fim do A1 | PARCIAL | A1-20, A1-g9 | ordem invertida (anomalias 17, 26, 27) |
| C30 | Lembranças, infância, antes x agora | A2 | AUSENTE | | correto para o A1 |
| C31 | Descrever um objeto (forma, função) | A1+/A2 | AUSENTE | | vai para o A2 |
| C32 | Dar conselho | A1 (imperativo) → A2 | USO | "Vous devez vous reposer" (A1-15) | imperativo nunca ensinado |
| C33 | Opinar, apreciar, criticar | A1 simples → A2 | USO | Expressões "C'est trop cher !", "Ça te plaît ?" | |
| C34 | Emoções | A1 simples → A2 | PARCIAL | *avoir peur/faim* (A1-g1) | |
| C35 | Obrigação (*il faut*, *devoir*) | A1 | BEM | A1-g6 | proibição/permissão = A2 |
| C36 | Trabalho | A1 básico → A2 | USO | *travailler* (A1-6), `travail` 27 linhas | sem unidade |
| C37 | Estudos e formação | A2 | AUSENTE | `école` 3 linhas | correto para o A1 |
| C38 | Cultura (livro, filme, museu) | A2 | PARCIAL | A1-19 (cinéma, film), A1-8 (musée) | |
| C39 | Meio ambiente, consumo | A2 | AUSENTE | | correto para o A1 |
| C40 | Reclamar, desculpar-se | A2 | PARCIAL | *pardon*, *excusez-moi* (A1-1, A1-8) | correto para o A1 |
| C41 | Mediação simples (repassar uma informação) | A1/A2 (CEFR CV) | PARCIAL | o "Ouça e traduza" já é mediação de língua para língua (Desafios) | nenhuma tarefa de "repassar um horário/preço" |

### 2.2 Gramática

| # | Tópico | Nível | Status | Onde no site | Observação |
|---|---|---|---|---|---|
| G1 | *être*, *avoir* no presente | A1 | BEM | A1-g1 | |
| G2 | *s'appeler* e pronominais | A1 | BEM | A1-g3 | *se lever/se réveiller* não existem na Conjugação |
| G3 | Presente dos verbos em *-er* | A1 | BEM | A1-g3 | letras mudas da terminação não são explicadas (AE 1.3) |
| G4 | *aller* | A1 | USO | desde A1-1 | sem tabela nem explicação (anomalia 11) |
| G5 | *venir* | A1 | PARCIAL | A1-9 (nota *venir de*) | sem tabela |
| G6 | *faire*, *prendre* | A1 | BEM | A1-g5 | |
| G7 | *vouloir, pouvoir, devoir, savoir*, *il faut* | A1 | BEM | A1-g6 | |
| G8 | Outros irregulares A1 (*sortir, dormir, partir, dire, lire, écrire, boire, mettre*) | A1 | USO | vocabulário de A1-5, A1-6, A1-19 | nenhuma tabela (GP 36-39) |
| G9 | **Gênero dos nomes, artigos definidos e indefinidos, plural** | A1 | USO | todo o vocabulário vem com artigo | nunca explicado (anomalia 13) |
| G10 | Artigos contraídos (*au, du, aux, des*) | A1 | PARCIAL | A1-g4 (au/aux com países); *au cinéma* 6 linhas, *du sport* 3 | sem regra geral (*à + le*, *de + le*) |
| G11 | Partitivos, *pas de*, quantidade | A1 | PARCIAL | notas em A1-5, A1-11, A1-12, A1-17 | bem explicado em notas, sem tabela nem exercício de gramática |
| G12 | Possessivos | A1 | BEM | A1-4 (nota), A1-g2 | |
| G13 | Demonstrativos (*ce, cet, cette, ces*) | A1 | USO | A1-5, A1-10 e mais 6 | nunca explicado |
| G14 | Gênero e número dos adjetivos | A1 | PARCIAL | pares de nacionalidade (A1-9) | sem regra geral |
| G15 | Lugar do adjetivo | A1 → A2 | PARCIAL | A1-16 (nota) | |
| G16 | *c'est* x *il est* | A1 | USO | `c'est` 28 linhas, `il est` 13 | nunca contrastado (AE 5.3, D1 3.2, GP 25-27) |
| G17 | *il y a* | A1 | BEM | A1-17 (vocabulário + nota) | nota antecipada no A1-8 com palavra de outra unidade (anomalias 18, 31) |
| G18 | Preposições + cidade/país | A1 | BEM | A1-g4 | 0 input antes (anomalia 21) |
| G19 | Preposições de lugar | A1 | BEM | A1-18 | |
| G20 | **Pergunta** (entonação, *est-ce que*, *qu'est-ce que*, interrogativos, *quel*) | A1 | USO | desde A1-1 | só 5 notas de realidade sobre a forma *in situ* (anomalia 14) |
| G21 | Pergunta por inversão | A1 (reconhecer) → A2 (produzir) | USO | 8 unidades | sem explicação |
| G22 | **Negação *ne... pas*** | A1 | USO | desde A1-1 | sem explicação própria (anomalia 12) |
| G23 | *ne... jamais* | A1 | BEM | A1-g8 | |
| G24 | Negação complexa (*plus, rien, personne*), *ne... que* | A1+ → A2 | AUSENTE | `rien` 4 linhas, `ne... plus` 0 | vai para o A2 |
| G25 | Pronomes tônicos | A1 | USO | "et toi ?", "Moi aussi" (2 linhas) | sem explicação |
| G26 | *on* = *nous* | A1 | BEM | A1-7 (nota de realidade) | |
| G27 | **Imperativo** | A1 | USO | "Tournez", "Excusez-moi" (A1-8), A1-14 | sem explicação (anomalia 20) |
| G28 | **Futuro próximo** | A1 | USO | 8 frases em 5 unidades | nunca ensinado (anomalia 10) |
| G29 | Passado recente (*venir de* + inf.) | A1+ | AUSENTE | 1 linha | vai para o A2 |
| G30 | Passé composé com *avoir* | fim do A1 | BEM (ordem errada) | A1-20 (uso), A1-g9 | ensinado depois do uso maciço (anomalia 17) |
| G31 | Passé composé com *être* e pronominais | fim do A1 | PARCIAL | A1-g9 (mesma unidade) | 0 input antes (validador) |
| G32 | Pronome COD | A1 (D1, GP) / ponte (AE 7) | USO | "je la prends" (A1-10) | zona cinza: reconhecer no A1, sistematizar no A2 |
| G33 | Pronome *y* (lugar) | A1 | AUSENTE | `j'y`/`on y va` 0 | AE 6.2, D1 7.1, GP 56 |
| G34 | Pronome *en* | A1+ → A2 | AUSENTE | | A2 |
| G35 | COI (*lui, leur*) | A1+ → A2 | AUSENTE | `lui`/`leur` pronome 0 | A2 |
| G36 | Relativos *qui, que* | A1+ → A2 | AUSENTE | 1 a 2 linhas | A2 |
| G37 | Comparativo | A1+ | BEM sem input | A1-g7 | validador: 0 ocorrências antes e depois |
| G38 | Superlativo | A2 | AUSENTE | `meilleur` 3 linhas (só no A1-g7) | A2 |
| G39 | Futuro simples | A1+ → A2 | AUSENTE | | só na Conjugação |
| G40 | Imperfeito | A2 (ponte) | AUSENTE | | só na Conjugação e no Jogo |
| G41 | Marcadores de tempo e duração (*il y a, depuis, pendant*) | fim do A1 → A2 | PARCIAL | A1-20 (*il y a deux jours*), *depuis* 3 linhas (A1-15) | |
| G42 | Causa e finalidade simples (*pourquoi, parce que, pour* + inf.) | A1 | AUSENTE | `pourquoi` 0, `parce que` 0 | AE 2.1, D1 6.1 |
| G43 | Condicional, *si*, discurso indireto, *-ment*, pronomes demonstrativos | A2 | AUSENTE | (só *je voudrais* como fórmula) | A2 |

### 2.3 Fonética e ortografia

| # | Ponto | Nível | Status | Onde no site | Observação |
|---|---|---|---|---|---|
| F1 | Alfabeto e acentos gráficos (nomes das letras e dos acentos) | A1 | AUSENTE | | Acentuação só como Desafio (46 publicados) |
| F2 | Acento na última sílaba / grupo rítmico | A1 | AUSENTE | | todos os métodos |
| F3 | Ligação (*liaison*) e encadeamento | A1 | AUSENTE | `liaison` 0 na camada (`01` 6.1) | todos os métodos; números (*deux‿ans*) |
| F4 | Entonação da pergunta x afirmação | A1 | AUSENTE | | todos os métodos |
| F5 | Elisão (*j', l', d', qu'*) | A1 | USO | o tempo todo | nunca explicada |
| F6 | *e* caduco / mudo | A1 | AUSENTE | | AE, D1 |
| F7 | [y] x [u] | A1 | AUSENTE | | AE 1.1, D1 P15 (*rue/roue*, *tu/tout*) |
| F8 | Nasais | A1 → A2 | AUSENTE | | AE 4.2, 8.1-8.2 |
| F9 | Letras mudas (*-ent*, *-es* dos verbos) | A1 | AUSENTE | | AE 1.3, 2.2 |
| F10 | Forma falada reduzida (*t'es, y'a*, queda do *ne*) | A1 (reconhecer) | BEM | notas de realidade A1-2, A1-17, A1-19 | |

### 2.4 Léxico (capítulos do VP A1 → site)

| VP | Tema | Status | Onde no site |
|---|---|---|---|
| 1 | usos e cortesia | BEM | A1-1 |
| 2 | família e fases da vida | PARCIAL | A1-4 (sem avós, filhos, fases da vida) |
| 3 | amor e emoções | AUSENTE | |
| 4 | caráter | AUSENTE | (*gentil* só) |
| 5 | comunicação (telefone, carta, mail) | AUSENTE | |
| 6 | corpo e movimentos | PARCIAL | A1-15 (4 partes do corpo) |
| 7 | saúde | BEM | A1-15 |
| 8 | descrição física | PARCIAL | A1-16 |
| 9 | roupas e cores | PARCIAL | A1-10 (2 roupas), A1-16 (cores) |
| 10 | casa e moradia | BEM | A1-17, A1-18 |
| 11 | atividades diárias | BEM | A1-6 |
| 12 | alimentos e lojas | BEM | A1-5, A1-11 (lojas: só *le magasin*) |
| 13 | fazer compras | BEM | A1-10, A1-12 |
| 14 | cozinha e refeições | PARCIAL | sem refeições do dia nem cardápio |
| 15 | o tempo que passa | PARCIAL | A1-6, A1-7 (dias e meses incompletos) |
| 16 | escola e ensino | AUSENTE | (A2) |
| 17 | profissões | AUSENTE | |
| 18 | tecnologia e mídia | AUSENTE | (`ordinateur`/`portable` 0) |
| 19 | dinheiro e banco | PARCIAL | *euro* (24 linhas), preços |
| 20 | correio, serviços, administração | AUSENTE | |
| 21 | geografia e francofonia | PARCIAL | A1-2, A1-9, A1-g4 (só França, Brasil e Europa) |
| 22 | clima | BEM | A1-13 |
| 23 | cidade e campo | PARCIAL | A1-8 (cidade) |
| 24 | direções | BEM | A1-8 |
| 25 | transportes | BEM | A1-14 |
| 26 | turismo, viagens, férias | AUSENTE | |
| 27 | lazer, esportes, jogos | BEM | A1-19 |
| 28 | artes e espetáculos | PARCIAL | A1-19 (cinema, música) |

### 2.5 Cultura

| # | Tema | Nível | Status | Onde no site |
|---|---|---|---|---|
| K1 | Cumprimentos, *la bise*, *tu/vous* | A1 | BEM | A1-1, A1-2 |
| K2 | Refeições e hábitos à mesa | A1 | BEM | A1-4 (repas dominical), A1-5 (croissant), A1-6 (almoço) |
| K3 | Paris (metrô, arrondissements, lugares) | A1 | PARCIAL | A1-14 (metrô); A1-8 sem nota |
| K4 | **Francofonia** (Bélgica, Suíça, Quebec, África, ultramar) | A1 | AUSENTE como tema | só a nota regional de *vingt* (A1-3) cita que "não é igual em todo lugar" |
| K5 | **Festas e datas** (categoria `festividade`) | A1 | AUSENTE | 0 notas `festividade` no francês (conferido agora) |
| K6 | Correspondência e endereço (como se escreve um endereço, CEP) | A1 | AUSENTE | |
| K7 | Ritmo de vida, trabalho, escola | A1 → A2 | PARCIAL | A1-6 (almoço longo) |
| K8 | Símbolos e história | A1 | BEM | A1-7 (dias), A1-16 (bandeira), A1-19 (cinema) |
| K9 | Mercado, lojas, comércio | A1 | BEM | A1-11 (marché) |
| K10 | Moradia | A1 | BEM | A1-17 (rez-de-chaussée) |

### 2.6 Conjugação (verbos e tempos do A1 x trilha x banco)

| Verbo / tempo | Nível | Ensinado na trilha | No banco da Conjugação (`fr/conjugation-data.js`) |
|---|---|---|---|
| être, avoir | A1 | A1-g1 | sim (#1, #2) |
| verbos em -er (parler, aimer, habiter, travailler, manger...) | A1 | A1-g3 | sim |
| se lever, se réveiller, se coucher, s'habiller, se promener, s'amuser, se reposer | A1 | se lever/se réveiller em A1-g3 | **não** (nenhum pronominal; só s'asseoir; conferido agora: lever, réveiller, coucher, habiller, promener, amuser, reposer ausentes) |
| détester, adorer, visiter, neiger | A1 | vocabulário/frases de A1-5, A1-19, A1-20, A1-13 | **não** |
| épeler, monter, rencontrer, louer, déménager, se marier | A1 (épeler, monter, rencontrer) / A2 | não | **não** (conferido agora) |
| aller, venir | A1 | não (só uso / nota) | sim (#3, #166) |
| faire, prendre | A1 | A1-g5 | sim (#4, #186) |
| vouloir, pouvoir, devoir, savoir, falloir | A1 | A1-g6 | sim (#228 a #231, #237) |
| sortir, dormir, partir, lire, boire, dire, écrire, mettre, connaître | A1 | não | sim |
| finir, choisir (-ir) | A1 | não | sim |
| payer, envoyer (-yer) | A1 (AE 5.1) | não | sim |
| éteindre | A2 | não | sim, mas no grupo errado (`g1`; é -re do 3º grupo, anomalia 34) |
| Présent | A1 | sim | sim |
| Passé composé | fim do A1 | A1-g9 | sim |
| Impératif | A1 | **não** | sim |
| Futur proche | A1 | **não** | saiu da prática (decisão da dona, 2026-10-13) |
| Imparfait, futur simple, conditionnel | A2 | não | sim (sem etiqueta de nível) |
| Plus-que-parfait, subjonctif | B1 | não | sim (sem etiqueta de nível) |

---

## 3. FALTAS no A1 (priorizadas)

**P0** = quebra a coerência da trilha (estrutura usada sem ensino em várias unidades, objetivo que não bate) ou impede uma tarefa do DELF A1.
**P1** = núcleo A1 de todas as fontes que o site não tem. **P2** = melhora, zona cinza útil ou ajuste fino.

| # | Prio. | Falta | Onde (unidade / arquivo) | Proposta concreta | Fontes |
|---|---|---|---|---|---|
| 1 | P0 | **Números 4 a 9** nunca são vocabulário, mas aparecem (huit, sept, six, cinq...) | A1-3 (`fr/content.js:384`) | Acrescentar no FIM do vocabulário do A1-3: *quatre, cinq, six, sept, huit, neuf* (índices 10 a 15) e reagrupar as lições: L1 zéro, un/une, deux, trois; L2 quatre, cinq, six; L3 sept, huit, neuf, dix; L4 vingt, l'âge, avoir, ans, combien + diálogo | AE 0; D1 1.1; GP 28; DELF A1 (preços, idade) |
| 2 | P0 | **Números 11 a 29** nunca são vocabulário (quinze no A1-4, dix-neuf no A1-10, vingt-cinq no ditado d1) | nova **A1-21** | Unidade nova "Números de 11 a 29": *onze, douze, treize, quatorze, quinze, seize, dix-sept, dix-huit, dix-neuf, vingt et un*; nota de explicação "17 a 19 = 10 + 7..." e "22 a 29 sem *et*"; nota de fonética: ligação *dix-huit‿ans*, *vingt‿et un* | mesmas do item 1 |
| 3 | P0 | **Objetivo do A1-3** promete "do zero a cem" (anomalia 23) | `courses/fr-pt-BR/layer.js:195` e `fr/content.en.js` | Novo objetivo: "Contar de zero a vinte e dizer e perguntar a idade." (o até cem fica com A1-10/A1-g10) | `01` 5.4 |
| 4 | P0 | **Gênero, artigos, plural** nunca explicados (anomalia 13) | nova **A1-g11** | "Artigos, gênero e plural": *le/la/l'/les*, *un/une/des*; gênero não segue o português (*le lait*, *la mer*... com exemplos só de vocabulário visto: *le fromage, la pomme, l'eau* feminino); *-s* do plural mudo; *des → de* na negação (gancho para A1-g14) | AE 0, 1.2; D1 1.1, 2.2; GP 10-12; GEF 2-4 |
| 5 | P0 | **Negação e perguntas** usadas desde A1-1 sem explicação (anomalias 12, 14) | nova **A1-g12** | "Frase negativa e perguntas": *ne... pas* (*n'* antes de vogal); 3 jeitos de perguntar: entonação (*Tu es français ?*), *est-ce que*, inversão (só reconhecer: *Comment allez-vous ?*, *Quel âge as-tu ?*); interrogativos *comment, où, quand, combien, pourquoi, qui, qu'est-ce que*; *quel/quelle/quels/quelles*; tela de fonética: entonação ascendente | AE 1.1, 1.2, 2.2, 5.1; D1 2.1-2.2; GP 5, 51-52; GEF 39-42; DELF A1 PO parte 2 (fazer perguntas) |
| 6 | P0 | **aller + futuro próximo** usados desde A1-1/A1-5 sem ensino (anomalias 10, 11) | nova **A1-g13** | "O verbo aller, o futuro próximo e os contraídos": tabela de *aller*; *aller à la / au / à l' / aux* + lugar (input do A1-8); *je vais* + infinitivo; negação *je ne vais pas* + inf.; *venir de la / du* (prévia do A1-9) | AE 2.2, 4.2; D1 6.1, 7.1; GP 13, 42-43; GEF 7, 26 |
| 7 | P0 | **Dados pessoais e soletrar** (DELF A1 PE parte 1: formulário) | nova **A1-23** | "Dados pessoais e formulário": *le prénom, le nom de famille, épeler, l'adresse, le code postal, le numéro de téléphone, le portable, le mail, la date de naissance, né / née*; nota de explicação "Como se soletra" (alfabeto, *accent aigu/grave*, *double v*); exercício novo de formulário (seção 7) | AE 0, 1.2; D1 1.1; VP 20; DELF A1 PE; CEFR A1 PE |
| 8 | P0 | **Produção escrita** inexistente (DELF A1 PE parte 2: cartão-postal ~40 palavras) | nova **A1-26** + tipo de exercício novo | Cartão-postal guiado na unidade de viagem (seção 7, tipo E1) | AE 2.3, 6.3; DELF A1 PE; CEFR A1 PE |
| 9 | P0 | **Passé composé antes da hora**: 9 de 10 frases do A1-20 e o diálogo já no passado; nota diz "que você já viu"; A1-g9 vem depois e diz "Você concluiu o nível A1" (anomalias 17, 26, 27) | A1-20, A1-g9 (`layer.js:2088`, `:2126`) | Ver seção 4.2: manter A1-20 como primeiro contato (input), reescrever objetivo e nota, acrescentar uma nota de explicação "j'ai + particípio" no A1-20; A1-g9 só com *avoir*; *être* e pronominais numa unidade nova **A1-g16**; mover a frase "Você concluiu o nível A1!" para o Teste de Nível | AE 4.3, 5.3; D1 8.2; GP 44-46 (todos fecham o A1 com o passé composé) |
| 10 | P0 | **Dias da semana e meses incompletos**; Desafio de Acentuação do A1-7 cobra *février* e *août*, que não estão na unidade (anomalia 25) | A1-7 e nova **A1-24** | A1-7: acrescentar no fim *mercredi, jeudi, vendredi, samedi, dimanche* e reagrupar em 4 lições. A1-24 "Meses e datas": *février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre* + diálogo "C'est quand ton anniversaire ? / Le premier mars." | AE 1.1-1.2; D1 5.2; GP 29; VP 15; DELF A1 (data de nascimento) |
| 11 | P0 | **Profissões** ausentes (DELF A1 PO parte 1: falar de si) | nova **A1-22** | "Profissões": *le travail, le professeur / la professeure, l'étudiant / l'étudiante, le vendeur / la vendeuse, le serveur / la serveuse, l'infirmier / l'infirmière, l'ingénieur / l'ingénieure, l'avocat / l'avocate, le bureau, l'entreprise*; nota de explicação "Je suis professeur (sem artigo)" x "C'est un professeur" | AE 3.1; D1 1.2; VP 17; GP 1; DELF A1 PO parte 1 |
| 12 | P1 | **Imperativo** usado sem ensino (anomalia 20) | A1-g6 (acrescentar telas no fim) | Novas telas: "Dar instruções: o imperativo" (*Tournez, Prenez, Allez*; *tu* sem *-s* nos verbos em -er: *Mange !*; *nous*; *Excusez-moi* como fórmula; negativo só reconhecido) + 4 exercícios; título passa a "Verbos modais, il faut e o imperativo" | AE 4.2, 5.2; D1 7.2; GEF 32 |
| 13 | P1 | **Partitivos e quantidade** só em notas | nova **A1-g14** | Sistematiza as notas de A1-5, A1-11, A1-12, A1-17 (sem repetir o texto delas): tabela *du / de la / de l' / des*, *pas de*, *beaucoup de / un kilo de*, *aimer le* x *manger du*; 6 exercícios | AE 7.1, 8.1; D1 8.1; GP 31-32; GEF 5-6, 10 |
| 14 | P1 | **Adjetivos (gênero e número), demonstrativos, c'est x il est** sem regra | nova **A1-g15** | "Adjetivos e demonstrativos": feminino (*-e, -ne, -lle*, *beau/belle* só reconhecido), plural; lugar (*petit, grand, joli* antes; cores depois); *ce / cet / cette / ces*; *c'est* + adjetivo x *il est* + adjetivo/profissão | AE 2.3, 3.2, 5.3; D1 3.2, 4.1, 7.2; GP 2-3, 15, 25-27; GEF 8, 11-12 |
| 15 | P1 | **Pronomes tônicos** sem explicação | A1-g1 (1 tela no fim) | Tela "Moi, toi, lui, elle..." com *Et toi ? Moi aussi. Moi non plus. C'est moi.* + 2 exercícios | AE 3.2, 5.1; GP 59; GEF 14 |
| 16 | P1 | **Propor, aceitar, recusar** sem as fórmulas básicas (`d'accord` 0) | nova **A1-27** | "Convites e festas": *la fête, l'anniversaire, inviter, le cadeau, libre, d'accord, avec plaisir, volontiers, désolé / désolée, dommage*; nota de explicação *pourquoi ? / parce que* | AE 4.2, 5.1; D1 6.2; CEFR A1/A2 "Conversa" |
| 17 | P1 | **Viagem e hospedagem** ausentes | nova **A1-26** | "Férias e hotel": *les vacances, l'hôtel, la nuit, réserver, la valise, le passeport, la mer, la montagne, la plage, la carte postale*; *y* de lugar só como fórmula (*On y va !*) | AE 2.2-2.3, 6.2-6.3; D1 6.2; VP 26 |
| 18 | P1 | **Refeições e restaurante** incompletos | nova **A1-25** | "Refeições e restaurante": *le petit-déjeuner, le déjeuner, le dîner, la carte, le menu, l'entrée, le plat, la boisson, commander, le verre* (sem repetir *le dessert*, *l'addition*, *la table*, *le serveur*) | AE 7.1; D1 8.1; VP 14 |
| 19 | P1 | **Fonética** sem nenhum ponto explícito | notas de explicação em unidades existentes e novas (lista na seção 8.3) | 7 notas curtas: ligação nos números (A1-21), letras mudas do -er (A1-g3), entonação da pergunta (A1-g12), [y]/[u] com *la rue* (A1-8), nasais com *le pain / le poisson* (A1-5), *e* caduco com *samedi / la fenêtre* (A1-7 / A1-17), acentos gráficos (A1-23) | AE e D1 (todos os pontos da tabela 9.3 do `02`); CEFR CV "controle fonológico" |
| 20 | P1 | **Francofonia** ausente das notas | notas culturais/regionais (seção 8) | Bélgica e Suíça (números, refeições), Quebec (*bienvenue* = de nada), África | AE carnets; D1 2.1, 6.1, 7.1 |
| 21 | P1 | **Gostos**: *adorer* sem vocabulário, "moi non plus" ausente | A1-19 (acrescentar *adorer* no fim do vocabulário) + nota "aimer + infinitivo" | *J'adore danser. Moi aussi. Je n'aime pas lire. Moi non plus.* | AE 1.3, 3.1; D1 2.2; GP 12 |
| 22 | P1 | **Causa e finalidade** (*pourquoi, parce que, pour* + inf.) ausentes | A1-27 (nota) + frases | *Pourquoi tu ne viens pas ? Parce que je travaille.* | AE 2.1; D1 6.1; GEF 44 |
| 23 | P1 | **Contraídos** sem regra geral | A1-g13 | ver item 6 | AE 2.1, 3.1; D1 6.1; GP 13 |
| 24 | P2 | Descrição física pobre | A1-16 (acrescentar frases) | Frases novas com *Il a les cheveux bruns / les yeux bleus. Elle est grande et mince.* (palavras novas entram como vocabulário só se a dona quiser uma 11ª a 13ª palavra) | AE 3.2, 5.3; VP 8 |
| 25 | P2 | Roupas: só 2 | A1-10 (frases) ou A2-6 | *la chemise, la jupe, le pull, les chaussures* como vocabulário de uma lição extra do A1-10 OU no A2 (A1-10 já tem 14 palavras) | VP 9; AE 7.2 (ponte) |
| 26 | P2 | Pagamento | A1-25 ou A1-10 (frases) | *Je peux payer par carte ? En espèces.* | AE 8.1 |
| 27 | P2 | *y* de lugar | A1-14 / A1-26 (nota) | *J'y vais en métro.* como fórmula, com nota | AE 6.2; D1 7.1; GP 56 |
| 28 | P2 | COD sem explicação (*je la prends*) | A1-10 (nota de explicação após o diálogo) | "Je la prends = eu levo (ela)": reconhecer; sistematizar no A2-g7 | D1 7.1; GP 57 (zona cinza, regra 1.1) |
| 29 | P2 | Família sem avós/filhos/estado civil | A1-4 (frases) | *mes grands-parents, j'ai deux enfants, je suis marié(e)* em frases novas | AE 3.3; D1 3.1-3.2; VP 2 |
| 30 | P2 | Horários (*et quart, et demie, moins le quart*), abertura/fechamento | A1-6 (frases e nota) | *Il est huit heures et demie. Le musée ouvre à neuf heures.* | AE 4.1; GP 29 |
| 31 | P2 | Telefonar (*Allô ?*) | A1-23 (1 frase e nota) ou A2-14 | *Allô ? C'est Léa.* | AE 5.2; CPI |
| 32 | P2 | Verdadeiro ou falso só em 8 de 20 unidades (anomalia 5) | as 12 restantes | 1 V/F por unidade (A1-3, 4, 6, 7, 10, 11, 12, 14, 16, 17, 18, 20) | padrão do próprio site |
| 33 | P2 | Poucas frases em A1-9 e A1-18 (5) (anomalia 6) | A1-9, A1-18 | acrescentar 2 frases com cenário em cada | padrão do próprio site |

### 3.1 Anomalias do `01` que não são "falta de conteúdo" (correções de texto/gancho)

| Anomalia (`01`) | Correção proposta | Arquivo |
|---|---|---|
| 18 e 31: nota `ou-est-vs-il-y-a` (A1-8) usa *pharmacie* | Trocar o exemplo por palavras do A1-8: *Il y a un musée près de la gare.* | `courses/fr-pt-BR/layer.js` + `fr/content.en.js` (+ `fr/content.js` se o exemplo em francês mora na base) |
| 29: `nous-sommes-on-est` dispara depois de *aujourd'hui* | Mudar o gatilho para `after:'dialogue'` ou para depois de *lundi* | `fr/content.js` (`trigger`) |
| 30: `andar-terreo-premier-etage` dispara depois de *la chambre* | Gatilho `after:'dialogue'` (onde *étage* aparece na frase p6) | `fr/content.js` |
| 22: A1-g6 promete *connaître* "mais adiante" | Cumprir no A2 (A2-g? com *savoir* x *connaître*, ver 5) ou tirar a promessa | `layer.js:1550` |
| 27: "Você concluiu o nível A1!" no A1-g9 | Trocar por "Você concluiu o passé composé com avoir!" e levar a frase de fim de nível para a tela do Teste de Nível | `layer.js:2126` |
| 28: lição "nome-e-ser" ensina *la France* | Reagrupar lições do A1-2: L1 *je, tu, s'appeler*; L2 *le nom, être, le pays*; L3 *la France, le Brésil, français/e, brésilien/ne* + diálogo (só `vocabIdx`, sem mudar id de cartão) | `fr/content.js` |
| 38: Acentuação cobra *très* no A1-12 e no A1-16 | O vocabulário das duas unidades não tem palavra com acento-alvo. A1-12: tirar o desafio (`n/a`, motivo "sem acento real na unidade"). A1-16: trocar por uma palavra acentuada que já esteja numa frase da unidade (ex.: *préféré*, se a dona confirmar que está lá) ou tirar | tabela `challenges` (produção, com autorização) + lote do repo |
| 36: 4 "Ouça e traduza" do A1-m3 estão só na produção | Exportar as 4 linhas para `lote-a1-m3.json` (repo = fonte) | `fr/scripts/challenges_import/` |

---

## 4. REMOÇÕES e DESLOCAMENTOS

### 4.1 O que sai do A1 (ou ganha etiqueta de outro nível)

| # | Item | Hoje | Proposta | Motivo / fonte |
|---|---|---|---|---|
| R1 | Jogo "Passé composé ou Imparfait?" | aberto a qualquer aluno, sem nível (`fr/conj-games.js`) | Etiqueta **A2** e sugestão só depois do A2-g3; no A1, jogos novos (seção 6.1) | imperfeito e alternância = A2 em todas as fontes (`02` 9.2) |
| R2 | Tempos imparfait, futur simple, conditionnel (A2), plus-que-parfait, subjonctif (B1) na Conjugação | sem etiqueta | Etiqueta de nível no seletor de tempo (não trancar) | `02` 9.2 e 10.5 |
| R3 | A1-g7 Comparativos | A1-m5 | **Fica no A1** (decisão 2), no fim do módulo de descrição, com input novo: 3 frases acrescentadas em A1-16 e A1-17 (*Ma chambre est plus petite que le salon.*) | zona cinza (AE 8.3 ponte; GP 33-34 A1; D1 não tem); validador acusa 0 input |
| R4 | Frase "Je vais détester ce plat" (A1-5) | 1ª aparição do futuro próximo, sentido estranho | Reescrever no mesmo índice: *Je vais prendre un café.* (troca de texto mantém o id; regenerar áudio) | coerência pedagógica (frase que o aluno vê precisa responder a uma situação real) |
| R5 | 5 notas de realidade iguais sobre pergunta *in situ* (A1-2, A1-3, A1-9, A1-10, A1-20) | 5 das 15 notas de realidade tratam do mesmo fenômeno (conferido agora) | Manter A1-2 (primeira) e A1-20 (passado); nas outras 3, encurtar para 1 linha "como no A1-2" ou tirar (decisão 12). Depois do A1-g12 a regra fica numa tela própria | regra da skill `notas-de-realidade`: nunca duplicar o que a gramática ensina |
| R6 | "On est allés au cinéma" no diálogo do A1-20 | passé composé com *être* antes de qualquer ensino | Manter (é input para o A1-g16), mas a nota nova do A1-20 avisa "com alguns verbos é *je suis* + particípio; você vai ver isso daqui a pouco" | input antes da gramática |

**Nada do núcleo A1 sai.** O passé composé **fica no A1** (todas as fontes fecham o A1 com ele, `02` 10.2), só muda de forma (4.2).

### 4.2 Deslocamentos e mudanças de ordem

| # | O quê | De | Para | Por quê |
|---|---|---|---|---|
| D1 | Passé composé com *être* e pronominais | dentro do A1-g9 | nova **A1-g16**, logo depois do A1-g9 | A1-g9 hoje ensina dois auxiliares de uma vez sem input de *être* (validador: 0 antes); AE separa em 4.3 e 5.3; GP em 44-45 e 46 |
| D2 | Ordem A1-20 → A1-g9 | igual | **igual** (input antes da gramática), com o A1-20 reescrito como "primeiro contato" | regra da casa (`grammar_input_map.json`); a anomalia é de texto (objetivo e nota), não de ordem |
| D3 | A1-4 Família e A1-g2 Possessivos | A1-m1 | novo módulo **"Quem é você"** (id `A1-m7`, exibido como Módulo 2) | equilibrar: o m1 ganha A1-21 e perde 2; fica identidade/números, e família vai com profissões e dados pessoais |
| D4 | A1-11 Mercado e A1-12 Quantidades | A1-m3 (7 unidades) | novo módulo **"Comer e comprar"** (id `A1-m8`, exibido como Módulo 5) | o m3 tem 7 unidades e 54 palavras (anomalia 3); juntam-se a A1-g14 e A1-25 |
| D5 | Ordem relativa das 30 unidades existentes | | **inalterada** (só inserções entre elas) | não reabrir desbloqueio de quem está no meio |
| D6 | Mensagem de fim do A1 | A1-g9 | tela do Teste de Nível `A1-final` | anomalia 27 |
| D7 | Nota `vingt-to-quatrevingts` (base 20) | A1-3 | fica, mas o exemplo de 80 vira "você vai ver no A1-10" | é prévia; a regra fica no A1-g10 |

### 4.3 Repetições (o que fazer sem quebrar FSRS)

| Repetição (`01` 5.2) | Proposta |
|---|---|
| *français/e*, *brésilien/ne* no A1-2 e no A1-9 | Manter os dois cartões (apagar quebraria FSRS). Recentrar o A1-9 em **origem e moradia de terceiros** (*Il vient d'Italie, il habite à Lyon*) com frases novas no fim; o diálogo do A1-9 deixa de repetir "Je suis brésilien" |
| *manger* em A1-5 e A1-6; *hier* em A1-7 e A1-20 | Aceitar (são verbos/advérbios centrais). Opcional futuro: marcar o 2º como "revisão" na tela de introdução (precisa de código) |
| Frases repetidas ("Combien ça coûte ?", "Je suis {nacionalidade}.") | Trocar o texto da 2ª ocorrência no mesmo índice por uma variação (*Ça coûte combien, ce pantalon ?*) |
| 70, 80, 90 no A1-10 e no A1-g10 | Manter (vocabulário + sistematização é o padrão da casa) |

### 4.4 Desequilíbrios de unidades e módulos

| Medida | Hoje | Proposta |
|---|---|---|
| Unidades por módulo | 4 a 7 | 4 a 6 (seção 9) |
| Palavras por unidade | 10, exceto A1-10 (14) | A1-3 (16) e A1-7 (15) passam do padrão por causa do "só acrescentar"; aceitável e documentado |
| Notas de realidade/cultura | A1-8, A1-12, A1-13, A1-18 com 0 | propostas na seção 8 (sem forçar no A1-18) |
| Gramática por módulo | 1 a 2 | 1 a 2 (as novas entram distribuídas) |

---

## 5. PROPOSTA DE A2

**Tamanho:** 8 módulos, **34 unidades** (19 de vocabulário/situação + 15 de gramática), ~190 palavras novas, mesmo molde do A1 (10 palavras, 3 lições + consolidação, diálogo com 3 checagens, 1 nota de explicação por unidade). Cada módulo fecha com uma **tarefa DELF A2** (seção 7) e o nível fecha com um **Teste de Nível A2 em formato DELF**.
Base: D2 (unidades 1 a 8), AE 8-9 (ponte), CPI, VPI, GEF; tarefas do DELF A2 (`03` seção 3). Léxico = inferência minha a partir dos temas (confiança média).
Grátis x Premium: igual ao A1 (trilha aberta; Desafios Premium com paywall desligado; 1 ditado grátis por módulo). Decisão 9.

### A2-m1 · Lembranças (DELF A2: monólogo "fale da sua infância"; PE: contar uma lembrança)

| Unidade | Objetivo comunicativo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-1 Minha infância | Descrever como era a vida de criança, hábitos do passado | uso do imperfeito (input) | *l'enfance, l'enfant, le souvenir, se souvenir de, le jouet, le copain / la copine, l'école primaire, la récréation, autrefois, d'habitude* | cultura/costume: quarta-feira sem aula na escola primária francesa (alta); realidade/informal: *la récré* (alta) | OT 2; Acentuação (*récréation, école*); Expressões: *Quand j'étais petit(e)...*, *Ça me rappelle...* | imparfait de *être, avoir, aller, jouer, habiter* |
| A2-g1 O imperfeito | | formação (radical do *nous* + *-ais*), *être → j'étais*; usos: descrição e hábito | | | Complete a frase 5 | imparfait (todos os grupos) |
| A2-2 Antes e agora | Comparar a vida antes e hoje; cidade x campo | imperfeito x presente; comparativo (revisão do A1-g7) | *la ville, la campagne, le village, le bruit, calme, bruyant, la vie, changer, maintenant, avant* | cultura: os "néo-ruraux" (média); expressão *métro, boulot, dodo* (registro familiar, alta) | OT 2; Expressões 2 | *changer, vivre, devenir* |
| A2-g2 Momentos da ação | | *venir de* (passado recente), *être en train de*, *être sur le point de*, *commencer à*, *arrêter de* | | | Complete a frase 5 | présent de *venir, être* |

### A2-m2 · Contar uma experiência (DELF A2 PE 1: relato de 60 palavras; CO: anúncios de estação/aeroporto)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-3 Uma viagem inesquecível | Contar uma viagem (o que aconteceu + como era) | input PC + imperfeito | *le voyage, le séjour, l'avion, l'aéroport, le vol, le paysage, la visite, découvrir, inoubliable, rater* | francofonia: destino fora da França (Quebec ou Senegal) (alta); *faire escale* | OT 2; Acentuação (*séjour, aéroport*); Ditado de relato | PC com *être* (*partir, arriver, rester, rentrer*) + imparfait |
| A2-g3 Passé composé x imperfeito | | ação pontual x cenário/descrição; marcadores (*soudain, tout à coup* x *d'habitude*) | | | Complete a frase 6 | PC e imparfait |
| A2-4 Um imprevisto | Contar um problema e como se resolveu | conectores do relato (*d'abord, ensuite, puis, enfin*) | *perdre, oublier, tomber en panne, en retard, la grève, le problème, heureusement, malheureusement, soudain, tout à coup* | cultura: *la grève* nos transportes (alta) | OT 2; Expressões: *Quelle galère !* (familiar), *Pas de chance !* | *perdre, oublier, tomber* |
| A2-g4 Tempo, duração e concordância | | *il y a, depuis, pendant, en, ça fait... que*; concordância do particípio com *être* (revisão do A1-g16) | | | Complete a frase 5 | |

### A2-m3 · Objetos e compras (DELF A2 PO 3: devolver/trocar um produto; CE: anúncio)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-5 Descrever um objeto | Dizer forma, matéria, função | *ça sert à*, *c'est en* + matéria | *l'objet, la forme, rond, carré, en bois, en métal, en plastique, léger, lourd, pratique* | | OT 2; Acentuação (*léger, carré*) | *servir, utiliser* |
| A2-g5 Relativos *qui, que, où* | | *l'objet qui..., le livre que..., la ville où...* | | | Complete a frase 6 | |
| A2-6 Comprar on-line e reclamar | Encomendar, reclamar, trocar, pedir reembolso | condicional de cortesia como fórmula (*je voudrais échanger*) | *la commande, la livraison, livrer, le colis, rembourser, échanger, le ticket de caisse, abîmé, marcher (funcionar), la réclamation* | realidade/informal: *Ça marche pas* (alta) | OT 2; Expressões: *C'est pas normal !*, *Je ne suis pas satisfait(e)* | *rembourser, échanger, livrer* |
| A2-g6 Comparativo e superlativo | | revisão de *plus/moins/aussi... que*; *le plus, le moins, le meilleur, le mieux* | | | Complete a frase 5 | |

### A2-m4 · Saúde e bem-estar (DELF A2 PO 3: consulta; CO: recado de consultório)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-7 Na consulta | Marcar consulta, descrever sintomas, entender a receita | *depuis* + tempo (revisão) | *le rendez-vous, l'ordonnance, le médicament, le comprimé, tousser, le rhume, la grippe, se faire mal, allergique, la carte Vitale* | cultura: *carte Vitale* e *médecin traitant* (alta) | OT 2; Acentuação (*le médicament*, *l'ordonnance* não tem: só a primeira) | *tousser, se faire mal* |
| A2-g7 Pronomes COD e COI | | *le, la, les, lui, leur*; lugar no presente, no PC, no futuro próximo e no imperativo | | | Complete a frase 6 | |
| A2-8 Esporte e hábitos saudáveis | Falar dos hábitos e dar conselhos | | *la forme, en forme, courir, nager, la salle de sport, l'entraînement, le match, gagner, l'équipe, se reposer* | cultura/história: Tour de France (alta); realidade `familiar-giria`: *être crevé* (alta) | OT 2; Expressões: *Je suis crevé(e)*, *Allez, courage !* | *courir, nager* |
| A2-g8 Condicional para aconselhar | | *tu devrais, vous pourriez, il faudrait, je voudrais*; imperativo negativo | | | Complete a frase 5 | conditionnel présent |

### A2-m5 · À mesa (DELF A2 PO 3: reservar e pedir; CE: cardápio)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-9 No restaurante | Reservar, pedir, apreciar e reclamar do prato | *en* com quantidade (input) | *la réservation, saignant, à point, bien cuit, le pourboire, délicieux, fade, salé, sucré, épicé* | cultura: *service compris* e gorjeta (alta) | OT 2; Acentuação (*épicé, salé*); Expressões: *C'est délicieux !*, *L'addition, s'il vous plaît* (já A1: não repetir) | |
| A2-g9 Pronomes *en* e *y* | | *en* (quantidade, *de* + coisa), *y* (lugar, *à* + coisa: *penser à*) | | | Complete a frase 6 | |
| A2-10 Receitas | Explicar uma receita (passos, quantidades) | imperativo e infinitivo de instrução | *la recette, couper, mélanger, cuire, ajouter, faire bouillir, la poêle, le four, la cuillère, l'ingrédient* | festividade: Chandeleur e crêpes (2 de fevereiro, alta) | OT 2; Ditado de receita | *cuire, mettre* |

### A2-m6 · Estudos, trabalho e moradia (DELF A2 PO 2: monólogo sobre estudos/trabalho; CE: classificado)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-11 Estudos e formação | Contar a formação e planos | futuro simples (input) | *les études, la fac, le diplôme, l'examen, réussir, rater (prova), le stage, le CV, la formation, s'inscrire* | cultura: *le bac* (alta); realidade/informal: *la fac* (alta) | OT 2; Acentuação (*diplôme, études*) | *réussir, s'inscrire* |
| A2-g10 Futuro simples | | formação regular; irregulares *serai, aurai, irai, ferai, pourrai, viendrai, verrai*; *quand* + futuro | | | Complete a frase 6 | futur simple |
| A2-12 Trabalho e regras | Falar do trabalho; obrigação, proibição, permissão | *il est interdit de, avoir le droit de, il faut / il ne faut pas* | *l'entreprise, le / la collègue, le / la chef, le salaire, l'emploi, le contrat, les congés, interdit, autorisé, le boulot* | cultura/história: as 35 horas e os *congés payés* de 1936 (alta); `familiar-giria`: *le boulot* (alta) | OT 2; Expressões 2 | |
| A2-g11 Condição com *si* | | *si* + presente → presente/futuro/imperativo | | | Complete a frase 5 | |
| A2-13 Procurar moradia e dividir apartamento | Ler classificado, perguntar, combinar regras | relativos (revisão) | *louer, le loyer, la colocation, le / la colocataire, l'annonce, meublé, les charges, déménager, le / la propriétaire, le quartier* | cultura: abreviações de classificado (T2, cc) (alta); realidade/informal: *la coloc* (alta) | OT 2; Acentuação (*meublé, propriétaire*) | *louer, déménager* (faltam no banco) |

### A2-m7 · Comunicar e se relacionar (DELF A2 PE 2: carta para convidar, recusar, desculpar-se, agradecer; CO: mensagens de voz)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-14 Telefonar e deixar recado | Ligar, atender, deixar e entender recado | pergunta formal por inversão (*Puis-je parler à... ?*) | *allô, rappeler, laisser un message, la messagerie, ne quittez pas, de la part de qui, raccrocher, occupé, le répondeur, le numéro* | realidade: *Allô* só ao telefone (alta) | OT 2; Ditado de recado | *rappeler* |
| A2-15 Escrever para convidar, recusar, agradecer | Escrever mensagem/carta com função | fórmulas de abertura e fecho | *cher / chère, l'invitation, remercier, s'excuser, accepter, refuser, malheureusement, amitiés, bisous, cordialement* | realidade/informal: *Bisous* x *Cordialement* (alta) | OT 2; Expressões: *Je te remercie de tout cœur*, *Je suis vraiment désolé(e)* | *remercier, s'excuser* |
| A2-g12 Discurso indireto e perguntas formais | | *il dit que, il demande si / ce que / où*; inversão produzida | | | Complete a frase 5 | |
| A2-16 Sentimentos | Expressar sentimentos, felicitar, consolar | *je suis content(e) de* + inf. | *content, triste, fâché, inquiet, surpris, déçu, féliciter, consoler, félicitations, la nouvelle* | `familiar-giria`: *Ça me saoule* (média: registro forte, conferir) | OT 2; Expressões: *Félicitations !*, *Ne t'inquiète pas* | |
| A2-g13 Negação complexa e restrição | | *ne... plus, ne... rien, ne... personne, ne... jamais* (revisão), *ne... aucun*, *ne... que* | | | Complete a frase 6 | |

### A2-m8 · Opinião e cultura (DELF A2 PO 2: monólogo "um filme/livro"; CE: artigo curto)

| Unidade | Objetivo | Gramática | Léxico (10) | Notas | Desafios | Conjugação |
|---|---|---|---|---|---|---|
| A2-17 Livro, filme, exposição | Apresentar e opinar sobre uma obra | *je pense que, à mon avis, j'ai trouvé ça...* | *le roman, l'auteur / l'autrice, le personnage, l'histoire, l'exposition, le tableau, le / la peintre, raconter, émouvant, ennuyeux* | cultura: *Le Petit Prince*; Orsay (estação virou museu, AE carnet D8) (alta) | OT 2; Acentuação (*émouvant*) | *lire, écrire, voir* (PC) |
| A2-g14 Opinar e ligar ideias | | *parce que, comme, donc, alors, pourtant, grâce à, à cause de*; advérbios em *-ment* | | | Complete a frase 6 | |
| A2-18 Meio ambiente e consumo responsável | Dizer o que faz pelo meio ambiente, concordar/discordar | | *l'environnement, la planète, trier, recycler, les déchets, gaspiller, la pollution, économiser, l'énergie, protéger* | costume: *tri sélectif* (média: as cores variam por cidade) | OT 2; Expressões: *Je suis d'accord / pas d'accord* | *protéger, recycler* |
| A2-19 Viajar pela francofonia | Descrever uma paisagem e situar um lugar | lugar do adjetivo (revisão) | *le nord, le sud, l'est, l'ouest, la côte, l'île, le fleuve, la forêt, le désert, la région* | francofonia (Bélgica, Suíça, Quebec, Senegal, Reunião) (alta) | OT 2; Ditado | |
| A2-g15 Pronomes demonstrativos e interrogativos | | *celui / celle / ceux / celles (-ci, -là)*; *lequel / laquelle* | | | Complete a frase 5 | |

**Fora do A2 (teto, não entram):** mais-que-perfeito, futuro anterior, pronomes duplos, relativos compostos, gerúndio (só um livro A2 traz, D2 8), subjuntivo (só GEF 34, confiança baixa) → B1. *savoir* x *connaître* (promessa do A1-g6) entra como 2 telas no A2-g7 ou como nota de explicação no A2-11 (decisão 15).

---

## 6. Conjugação, Desafios e Ditados

### 6.1 Conjugação (`fr/app.js:5112-5150`, `fr/conjugation-data.js`, `fr/conj-games.js`)

| # | Problema (`01`) | Proposta | Esforço |
|---|---|---|---|
| J1 | "Top N" não é frequência (anomalia 32): `CONJ_VERB_RANK` usa a ordem do arquivo, que é por grupo; com Top 10/25/50/100 o `g3oir` e quase todo `g3re/g3ir` somem | Trocar por uma lista explícita de frequência (`CONJ_FREQ_ORDER`) e manter a ordem do arquivo só como desempate. Lista inicial (memória de listas de frequência; **conferir com Lexique 3**, confiança média): *être, avoir, faire, aller, dire, pouvoir, vouloir, savoir, voir, venir, devoir, prendre, mettre, falloir, parler, passer, trouver, donner, comprendre, connaître, partir, croire, demander, penser, aimer, rester, sortir, attendre, entendre, vivre, arriver, entrer, écrire, lire, chercher, appeler, boire, jouer, finir, travailler, manger, ouvrir, écouter, regarder, habiter, acheter, payer, choisir, dormir, essayer* (50) | baixo |
| J2 | Verbos da trilha ausentes (anomalia 33 + conferido agora) | Acrescentar: **A1**: *lever, réveiller, coucher, habiller, promener, amuser, reposer* (com suporte a pronominal: exibir *je me lève*, auxiliar *être* no PC), *détester, adorer, visiter, neiger, épeler, monter, rencontrer*; **A2**: *louer, déménager, marier* (*se marier*). Gerar as formas pelo mesmo pipeline Verbiste do cabeçalho do arquivo | médio (pronominal muda a exibição e o PC) |
| J3 | *éteindre* no grupo `g1` (anomalia 34) | Mudar para `g3re` | baixo |
| J4 | Sem ligação unidade → verbo/tempo | Botão "Praticar os verbos desta unidade" no fim de cada unidade, que abre a Conjugação com o filtro pronto (verbos da tabela 2.6 por unidade; tempo = présent, e passé composé a partir do A1-g9). Prática continua livre | médio |
| J5 | Tempos sem nível (anomalia 35) | Etiqueta no seletor: Présent, Passé composé, Impératif = A1; Imparfait, Futur simple, Conditionnel = A2; Plus-que-parfait, Subjonctif = B1 | baixo |
| J6 | Só 1 jogo, de nível A2 | Jogos A1 novos (Premium, como o atual): **"Être ou avoir?"** (auxiliar do PC, 20 frases com verbos do A1-g9/g16), **"Qual é o particípio?"** (*fait, pris, bu, vu, lu, eu, été, mis, dit, écrit*), **"Agora ou depois?"** (présent x futur proche, reconhecer *je vais* + inf.) | médio |
| J7 | Imperativo existe no banco mas não na trilha | Resolvido pelo item 12 da seção 3 (A1-g6) | |

Grátis x Premium: prática da Conjugação **grátis**; Jogos **Premium** (com cadeado, paywall desligado), como hoje (`CONJ_GAMES_PAYWALL_ENABLED=false`).

### 6.2 Desafios por categoria (regra da skill `criar-desafios`)

Regra a seguir em cada unidade/módulo novo: rodar `challengeChecklist(idioma, escopo)` e decidir **cada** categoria como `trail`, `premium` ou `n/a` com motivo; Ditado = trail (1 grátis + 2 Premium por módulo); Ouça e traduza, Acentuação, Expressões, Complete a frase = Premium; densidade: OT ~2 por unidade, Expressões ~5 por módulo, Acentuação só com acento real (´ ` ^ ¨, "ç" não conta); só vocabulário já visto no módulo; toda expressão com `register`; tudo entra `needs_review` com `.md` de revisão.

| Lacuna (`01` 2.4, 5.7) | Proposta |
|---|---|
| **Complete a frase** só no A1-m6 (6, todos do A1-g9) | 3 a 6 `cloze_grammar` por unidade de gramática: A1-g1 a A1-g8, A1-g10 e as novas A1-g11 a A1-g16 (~70 novos no A1). É a categoria que mais falta, porque é a única que treina gramática fora da trilha |
| Expressões ausentes em A1-3, A1-4, A1-9, A1-11, A1-18 | A1-3: `n/a` (motivo: números e idade não têm expressão fixa natural de nível A1; *Ça fait combien ?* já está no A1-10). A1-4: *Tel père, tel fils* (register `neutre`, confiança alta). A1-9: *Bienvenue en France !* (`neutre`, alta). A1-11: *J'ai un petit creux* (`familier`, alta). A1-18: `n/a` (motivo: unidade de posição de objetos, sem expressão natural de nível A1) |
| Acentuação fora do alvo (*très* no A1-12/A1-16; *février/août* no A1-7) | Ver 3.1; *février/août* passam a ser alvo legítimo com a A1-24 |
| Unidades novas A1-21 a A1-27 | OT 2 cada (14). Acentuação só onde há acento real no vocabulário proposto: A1-21 `n/a` (nenhum), A1-22 *l'infirmière* (è), A1-23 *le prénom, né / née, le numéro de téléphone*, A1-24 *février, août*, A1-25 *le petit-déjeuner, le dîner, l'entrée*, A1-26 *l'hôtel*, A1-27 *désolé, la fête*. Expressões ~5 por módulo novo: `A1-m7` (*Qu'est-ce que vous faites dans la vie ?*, *Ça s'écrit comment ?*, *Tel père, tel fils*, *Enchanté de faire votre connaissance*, *Je vous en prie*); `A1-m8` (*Et avec ceci ?*, *Ce sera tout ?*, *J'ai un petit creux*, *C'est délicieux !*, *Santé !*). Registro de cada uma a definir na geração |
| Repo x produção (A1-m3 com 4 OT só na produção) | Exportar para o lote do repo antes de qualquer mudança de módulo |
| Mudança de módulo de A1-4, A1-11, A1-12 (seção 4.2) | Atualizar o módulo dessas linhas na tabela `challenges` (13 linhas: A1-4 OT 2 + Acent. 3; A1-11 OT 2 + Acent. 2; A1-12 OT 2 + Acent. 1 + Expr. 1). **Dado em produção: só com autorização explícita da dona** e Staging antes |
| A2 | 8 módulos × (OT ~8, Acentuação ~6, Expressões ~5, Complete a frase ~15) ≈ 270 desafios; gerar módulo a módulo |

### 6.3 Ditados (`fr/dictations.js`, validador `python3 fr/scripts/check_dictation_vocab.py`)

| Lacuna | Proposta |
|---|---|
| Módulos novos `A1-m7` e `A1-m8` não têm ditado | 3 por módulo (1 grátis + 2 Premium), 18 a 33 palavras como os atuais |
| d1 e d3 podem usar palavras de A1-4 e A1-11/12, que mudam de módulo | Rodar o validador depois da mudança; se acusar, trocar a palavra no mesmo id de ditado |
| Ditado só de frases corridas | 2 formatos novos, compatíveis com o motor de ditado: **"Ditado de números"** (telefone em pares, preços, idades: DELF A1 CO cobra números) no A1-m1 e m4, e **"Ditado de soletrar"** (nome e e-mail letra por letra) no A1-m7 |
| Revisão do A1 (r1 a r3) | Refazer depois do A1 revisado, cobrindo profissões, datas e passado |
| A2 | 8 × 3 + 3 de revisão = 27; tipos: relato (m2), recado (m7), receita (m5) |

---

## 7. Exercícios e tipos de lição

O motor hoje gera tudo a partir de campos da unidade (`01` seção 0): vocabulário (múltipla escolha, escuta, digitação), frases com blocos (ordenar, traduzir montando, cloze), cenário (o que você diz?), V/F, diálogo (lacuna, escuta, compreensão), telas de gramática + lacunas, consolidação, Ponto de verificação (12 itens, 70%) e Teste de Nível (5 por módulo, 75%). **Não há** produção livre, compreensão sem texto, documento autêntico nem prova por competência.

| # | Tipo novo | O que é | Compatível com o motor? | Nível / onde | Grátis x Premium (proposta) | Fontes |
|---|---|---|---|---|---|---|
| E1 | **Produção escrita guiada** | Tela com tarefa (destinatário, objetivo, mínimo de palavras), 3 a 5 "peças obrigatórias" em lista de checagem (ex.: cumprimentar, dizer onde está, dizer o tempo, despedir-se), modelo de resposta revelado depois; o aluno se autoavalia nos itens. Correção automática só de formas obrigatórias (`mustInclude`, já existe para Ouça e traduza) | Sim, com campo novo `writingTask` por unidade e um renderer novo simples (texto livre + checklist). Correção pela professora (aluno vinculado) num 2º momento | A1: formulário (A1-23), cartão-postal (A1-26), convite (A1-27). A2: um por módulo (60 palavras) | Grátis com autoavaliação; correção da professora para alunos vinculados | DELF A1/A2 PE; AE projetos; D1 *défis* |
| E2 | **Formulário** | Campos (nome, sobrenome, nacionalidade, data de nascimento, endereço, e-mail) com resposta aceita por campo; pode usar os marcadores de perfil (`{nome}`, `{nacionalidade}`) | Sim: vários `type_answer` numa tela | A1-23 | Grátis | DELF A1 PE parte 1 |
| E3 | **Tarefa final do módulo** (estilo *défi* / projeto) | Fecho de cada módulo com uma produção que junta o módulo: "apresente sua família", "conte seu fim de semana". Formato E1 + gravação oral opcional (E6) | Sim (reusa E1) | 1 por módulo (A1 e A2) | Grátis | D1 (défi por dossiê), AE (projeto por dossiê) |
| E4 | **Compreensão oral graduada** | Ouvir o diálogo **sem texto** 2 vezes, responder 3 perguntas de múltipla escolha, só então ver o texto. Depois, "documentos sonoros" curtos (anúncio de estação, recado de secretária eletrônica) | Sim: o diálogo já tem áudio e `check.listen`; precisa de um passo novo `listenFirst` antes do `dialogue` e de um campo `audioDocs` com perguntas | A1 a partir do m2; A2 todos | Grátis (trilha) | DELF A1/A2 CO (2 escutas); CEFR "ouvir anúncios" |
| E5 | **Compreensão escrita com documento** | Card que imita placa, cardápio, horário, mensagem, classificado, com 3 perguntas | Sim: campo `readingDocs` (texto formatado/HTML ou imagem) + múltipla escolha existente | A1: placa de loja (A1-10), cardápio (A1-25), horário de trem (A1-14); A2: classificado (A2-13), e-mail (A2-15) | Grátis | DELF A1/A2 CE; CEFR "ler para se orientar" |
| E6 | **Produção oral com gravação** | O aluno ouve a pergunta da "entrevista dirigida" (*Comment vous appelez-vous ? Qu'est-ce que vous faites ?*), grava a resposta, ouve o modelo e se autoavalia | Parcial: precisa de gravação (o editor de cartões já tem `audio.type='recording'`; reaproveitar o componente) | A1: entrevista (m1, m7); A2: monólogo de 2 min (m1, m6, m8) | Grátis autoavaliado; feedback da professora para vinculados | DELF A1/A2 PO |
| E7 | **Diálogo em turnos (interação simulada)** | O "cenário" atual em sequência: 4 a 6 escolhas que constroem a conversa de compra/reserva | Sim: lista de `scenario` encadeados com o diálogo como roteiro | A1-10, A1-25, A1-26; A2-6, A2-9 | Grátis | DELF A1 PO 3 / A2 PO 3 |
| E8 | **Pares mínimos (fonética)** | Ouvir e escolher: *rue/roue*, *tu/tout*, *le/les*, *deux/douze*, *ils sont/ils ont* | Sim: escuta + múltipla escolha. Risco: a voz TTS precisa diferenciar bem os pares (testar no laboratório de áudio) | nas unidades da seção 8.3 | Grátis | AE, D1 (fonética por lição) |
| E9 | **Mini-prova estilo DELF por módulo** | Opcional, depois do Ponto de verificação: CO (2 documentos), CE (2 documentos), PE (E1), PO (E6), 25 pontos cada; CO e CE corrigidos, PE e PO autoavaliados por grade simples; aprovação 50/100 e 5/25 por parte, como o DELF | Sim, reusando E1, E4, E5, E6; não substitui o Ponto de verificação (que segue destravando) | fim de cada módulo; Teste de Nível A1 e A2 viram simulado completo | Decisão 8 (recomendo grátis) | DELF (`03` seção 1); D1 e D2 (avaliação a cada 2 unidades) |
| E10 | **Mediação** | "Repasse a informação": ler um aviso em francês e responder em português a quem pergunta (*A que horas abre?*) | Sim: o comparador de tradução para pt-BR já existe (`shared/translation-compare.js`) | A1-6, A1-14, A1-25 | Grátis | CEFR CV, mediação |

**Ordem recomendada:** E4 e E7 (só dados novos no padrão atual) → E1/E2/E3 (renderer simples) → E5 → E8 → E6 → E9.

---

## 8. Notas de realidade e culturais: lacunas por tema

Hoje (conferido agora): 15 de realidade (informal 5, gramática coloquial 9, regional 1) e 10 culturais (costume 6, história 4, **festividade 0**). 5 das 9 de gramática coloquial são sobre pergunta *in situ* (R5). Unidades sem nenhuma: A1-8, A1-12, A1-13, A1-18 e todas as de gramática (por regra). Regras da skill: só entra se responder à palavra ensinada naquele momento; nada de média/baixa confiança publicado sem a dona pedir; `familiar-giria` só a partir do A2.

### 8.1 Propostas por tema (A1)

| Unidade | Gatilho (palavra) | Tipo / categoria | Conteúdo proposto | Confiança |
|---|---|---|---|---|
| A1-1 | *de rien* | realidade / regional | No Quebec, "de nada" é *Bienvenue !* (calco do inglês); na França, *de rien* ou *je vous en prie* | alta |
| A1-8 | *la place* ou diálogo | cultura / costume | Paris dividida em 20 *arrondissements* em espiral; o número aparece no CEP (750**08**) | alta |
| A1-8 | *pardon* / *Excusez-moi* (frase) | realidade / informal | *Pardon* para abrir caminho e chamar atenção na rua; *Excusez-moi* mais formal | média (conferir com a dona) |
| A1-12 | *un demi-kilo* | realidade / informal | Na feira se ouve *une livre de tomates* (meio quilo) | alta |
| A1-13 | *il fait froid* | realidade / regional | No Quebec, *il fait frette* (muito frio) | alta |
| A1-13 | *le soleil* / diálogo | cultura / costume | Temperatura em graus Celsius; previsão *la météo* | alta (mas fraca como nota; opcional) |
| A1-14 | *le métro* / *le vélo* | cultura / costume | Bicicletas compartilhadas nas grandes cidades | alta (sem citar marca) |
| A1-15 | *la pharmacie* | cultura / costume | Cruz verde luminosa; farmacêutico orienta antes do médico; 15 (SAMU) e 112 | alta |
| A1-18 | | nenhuma | Sem gatilho natural: não forçar | |
| A1-21 | *dix-sept* | realidade / regional | Bélgica e Suíça: *septante, nonante* (Suíça romanda: *huitante* em alguns cantões). Cuidado: a nota do A1-3 já cita o tema; **mover** o conteúdo regional para cá e deixar no A1-3 só a base 20 | alta |
| A1-21 | *vingt et un* | explicação (fonética) | Ligação: *vingt‿et un* [t], *dix-huit‿ans* [z]; *six* e *dix* mudam de som (*six ans* [z], *six livres* mudo) | alta |
| A1-22 | *la professeure* | realidade / informal? (variação normativa) | Feminização das profissões: *professeure, ingénieure, autrice* hoje correntes; antes era *le professeur* para todos | média-alta (categoria a decidir: é variação de norma, não de registro) |
| A1-23 | *l'adresse* | cultura / costume | Ordem do endereço francês: número + rua, CEP de 5 dígitos (2 primeiros = departamento) + cidade | alta |
| A1-23 | *le mail* | realidade / regional | No Quebec, *le courriel*; na França *le mail / l'e-mail*; *arobase* = @ | alta |
| A1-24 | *juillet* | cultura / festividade | 14 de julho, festa nacional (tomada da Bastilha, 1789) | alta |
| A1-24 | *mai* | cultura / festividade | 1º de maio: costume de dar *muguet* (lírio-do-vale) | alta |
| A1-24 | *le premier* (frase) | explicação | Só o dia 1 usa ordinal: *le premier mai*, mas *le deux mai* | alta |
| A1-25 | *le déjeuner* | realidade / regional | Bélgica, Suíça e Quebec: *déjeuner* = café da manhã, *dîner* = almoço, *souper* = jantar | alta |
| A1-25 | *la carte* | cultura / costume | Água da torneira (*une carafe d'eau*) e pão vêm de graça no restaurante | alta |
| A1-25 | *le menu* | explicação (falso amigo) | *le menu* = prato feito/combinação de preço fixo; o cardápio é *la carte* | alta |
| A1-26 | *les vacances* | cultura / história | *Congés payés* (1936) e as "grandes férias" de julho e agosto | alta |
| A1-26 | *la carte postale* | realidade / informal | Fecho de cartão a amigo: *Bisous*, *Grosses bises*; a desconhecido não | alta |
| A1-27 | *la fête* | cultura / festividade | *Fête de la musique* (21 de junho) | alta |
| A1-27 | *l'anniversaire* | cultura / festividade | *Galette des rois* em janeiro (quem acha a fava é rei) | alta |
| A1-27 | *d'accord* | realidade / informal | Na fala: *OK*, *Ça marche*, *Carrément* (este último já perto de `familiar-giria`: deixar para o A2) | alta (só *OK/Ça marche* no A1) |

### 8.2 A2 (categorias que abrem no A2)

`familiar-giria` passa a valer: *le boulot*, *bosser*, *la bouffe*, *crevé*, *un truc*, *c'est nul*, *trop bien*, *ouf* (verlan, média: frequência alta entre jovens, registro a confirmar). Culturais: escola sem aula na quarta à tarde (A2-1), *carte Vitale* (A2-7), Tour de France (A2-8), Chandeleur (A2-10), *le bac* (A2-11), 35 horas (A2-12), classificados (A2-13), *Le Petit Prince* e Orsay (A2-17), *tri sélectif* (A2-18, média), francofonia africana e ultramar (A2-19). Confiança alta salvo indicado; tudo na tabela da seção 5.

### 8.3 Notas de explicação de fonética (não são "realidade"; são `concepts` de explicação)

| Unidade | Gatilho | Ponto |
|---|---|---|
| A1-5 | *le pain* / *le poisson* | as vogais nasais: *pain* [ɛ̃], *poisson* [ɔ̃], *viande* [ɑ̃] (esta no A1-11, se preferir) |
| A1-7 | *samedi* | *e* caduco: *sam'di* |
| A1-8 | *la rue* | [y] x [u]: *rue* x *roue*; *tu* x *tout* |
| A1-g3 | tela nova | as terminações *-e, -es, -ent* não se pronunciam: *je parle, tu parles, ils parlent* soam igual |
| A1-g12 | tela nova | entonação: sobe na pergunta, desce na afirmação |
| A1-21 | *vingt et un* | ligação (ver 8.1) |
| A1-23 | *épeler* | alfabeto e nomes dos acentos (*accent aigu, grave, circonflexe, cédille, tréma*) |

Taxonomia: o código não tem categoria "pronúncia" (`REALITY_NOTE_*`); por isso elas entram como nota de **explicação**, sem mexer na taxonomia.

---

## 9. Proposta de A1 revisado (mapa final)

Princípios: as 30 unidades existentes **continuam com o mesmo id e na mesma ordem relativa**; só há inserções (13 unidades novas), 2 módulos novos e acréscimos no fim de vocabulário/frases. Status: **M** = mantida igual; **A** = alterada (acréscimo ou texto); **N** = nova; **→** = mudou de módulo.

| Módulo (posição · id · título) | Unidades na ordem | Status | O que entra / sai |
|---|---|---|---|
| **1 · A1-m1 · Primeiros contatos** | A1-1 | A | nota Quebec *bienvenue* (8.1); 1 V/F já existe |
| | A1-2 | A | reagrupar lições (3.1, anomalia 28); nota curta "soletrar o nome" opcional |
| | A1-3 | A | + *quatre, cinq, six, sept, huit, neuf* no fim; 4 lições; objetivo novo; nota regional encurtada (o regional vai para A1-21) |
| | **A1-21 Números de 11 a 29** | N | *onze, douze, treize, quatorze, quinze, seize, dix-sept, dix-huit, dix-neuf, vingt et un*; diálogo sobre idade e turma; notas: regional *septante* + ligação |
| | A1-g1 | A | + tela de pronomes tônicos (*moi, toi, lui, elle, nous, vous, eux, elles*) |
| **2 · A1-m7 (novo) · Quem é você** | A1-4 → | A/→ | vem do m1; + frases com *grands-parents, enfants, marié(e)*; + 1 V/F |
| | **A1-g11 Artigos, gênero e plural** | N | ver item 4 da seção 3 |
| | A1-g2 → | M/→ | vem do m1 |
| | **A1-22 Profissões** | N | ver item 11 |
| | **A1-23 Dados pessoais e formulário** | N | ver item 7; tipos E2 (formulário) e E1; telefone em pares só até 29 (os números maiores voltam em exemplos do A1-g10) |
| | **A1-g12 Frase negativa e perguntas** | N | ver item 5 |
| **3 · A1-m2 · Rotina e tempo** | A1-5 | A | frase R4 reescrita; nota de nasais |
| | A1-6 | A | + frases *et quart / et demie*, horário de abertura; + 1 V/F |
| | A1-g3 | A | + tela "letras mudas" |
| | A1-7 | A | + *mercredi, jeudi, vendredi, samedi, dimanche* no fim; 4 lições; gatilho da nota `nous-sommes-on-est` corrigido; nota *e* caduco |
| | **A1-24 Meses e datas** | N | 10 meses; diálogo de aniversário; notas 14 juillet, 1er mai, *le premier* |
| **4 · A1-m3 · Cidade e origem** | A1-8 | A | nota *il y a* com exemplo da própria unidade; notas *arrondissements* e [y]/[u] |
| | **A1-g13 aller, futuro próximo e contraídos** | N | ver item 6 |
| | A1-g4 | A | + 3 frases com *en/au* + país no A1-8 ou A1-9 para dar input (validador) |
| | A1-9 | A | + 2 frases (origem/moradia de terceiros); diálogo sem repetir A1-2 |
| | A1-10 | A | + nota COD *je la prends*; frase repetida variada; + 1 V/F; documento E5 (etiqueta de preço) |
| | A1-g10 | A | + exemplos com telefone em pares |
| **5 · A1-m8 (novo) · Comer e comprar** | A1-11 → | A/→ | vem do m3; + 1 V/F |
| | A1-12 → | A/→ | vem do m3; nota *une livre*; Acentuação corrigida |
| | **A1-g14 Partitivos e quantidade** | N | ver item 13 |
| | **A1-25 Refeições e restaurante** | N | ver item 18; E7 (pedido em turnos), E5 (cardápio) |
| **6 · A1-m4 · Deslocar-se e cuidar de si** | A1-13 | A | nota *frette*; + 1 V/F |
| | A1-14 | A | nota de bicicletas; E5 (horário de trem); + 1 V/F |
| | A1-g5 | M | |
| | **A1-26 Férias e hotel** | N | ver item 17; E1 cartão-postal; *y* como fórmula |
| | A1-15 | A | nota farmácia; *depuis* como fórmula com nota |
| | A1-g6 | A | + telas e exercícios do imperativo; novo título |
| **7 · A1-m5 · Casa e descrição** | A1-16 | A | + frases de descrição física; + 2 frases com comparativo; + 1 V/F |
| | **A1-g15 Adjetivos e demonstrativos** | N | ver item 14 |
| | A1-17 | A | gatilho da nota do térreo corrigido; + 1 frase com comparativo; + 1 V/F |
| | A1-18 | A | + 2 frases; + 1 V/F |
| | A1-g7 | A | fica no fim do módulo (decisão 2) |
| **8 · A1-m6 · Lazer, convites e passado** | A1-19 | A | + *adorer* no fim do vocabulário; nota *aimer* + infinitivo / *moi non plus* |
| | A1-g8 | M | |
| | **A1-27 Convites e festas** | N | ver item 16; notas festividade; E1 (convite curto) |
| | A1-20 | A | objetivo novo ("Contar o que você fez: primeiro contato com o passé composé"); nota "j'ai + particípio"; nota antiga corrigida; + 1 V/F |
| | A1-g9 | A | só *avoir* + particípios irregulares + negação no PC; frase final corrigida |
| | **A1-g16 Passé composé com être** | N | verbos de movimento, concordância, pronominais (*je me suis levé(e)*) |
| **Teste de Nível A1** | A1-final | A | 5 itens × 8 módulos = 40; mensagem "Você concluiu o A1"; opcional simulado DELF A1 (E9) |

**Totais:** 8 módulos, **43 unidades** (27 de vocabulário + 16 de gramática), ~282 palavras únicas (200 + 70 das 7 unidades novas + 12 acrescentadas em A1-3, A1-7, A1-19), 8 ditados de módulo × 3.
**Versão enxuta (só P0):** A1-21, A1-22, A1-23, A1-24, A1-g11, A1-g12, A1-g13, A1-g16 + correções de texto = 38 unidades em 7 módulos (sem o `A1-m8`: A1-11 e A1-12 ficam no m3).

---

## 10. O molde para o português

### 10.1 Reaproveitável (função comunicativa) x específico do francês, por módulo do A1 revisado

| Módulo | Funções independentes do idioma (vão para o pt) | Específico do francês (não vai como está) | Equivalente a pensar no português (curso `portugues@en`) |
|---|---|---|---|
| 1 Primeiros contatos | cumprimentar, despedir-se, agradecer, apresentar-se, contar 0-29, dizer a idade | *tu/vous*, *la bise*, base 20 e *septante*, ligação nos números, *avoir* + idade | *você/tu/o senhor*; beijo no rosto (número varia por região); *ter* + idade (igual ao francês); *dezesseis/dezessete*; **"meia" = seis** ao ditar telefone |
| 2 Quem é você | família, profissão, dados pessoais, soletrar, perguntar e negar | gênero com *le/la*, elisão *l'*, inversão, *ne... pas* em duas partes, *est-ce que* | artigos e **contrações** (*do, da, no, na, pelo*); negação com *não* antes do verbo e a dupla (*não sei não*, regional); pergunta só por entonação; **ser x estar** (não existe em francês: ponto novo, provavelmente já no módulo 1 ou 2) |
| 3 Rotina e tempo | hora, rotina, dias, meses, datas | pronominais com *se* obrigatórios, letras mudas, *e* caduco | dias da semana numerados (*segunda-feira*), "o dia 1º"; reflexivos menos frequentes na fala (*eu levanto*); **estar + gerúndio** (A1 no Brasil) |
| 4 Cidade e origem | pedir caminho, dizer origem, comprar roupa, preço | *à/en/au/aux*, *aller à la/au*, contraídos | *em/no/na* + lugar, *de/do/da* + país (já previsto no piloto pt: nota `eu-sou-de-do-da`); **ir + infinitivo** igual ao *futur proche* |
| 5 Comer e comprar | pedir, quantidade, cardápio, restaurante | partitivo (*du, de la*), *pas de*, *une livre* | português não tem partitivo (**ponto mais fácil**); quilo/meio quilo; *a conta, por favor*; gorjeta 10% na conta |
| 6 Deslocar-se e cuidar de si | transporte, clima, viagem, hotel, saúde, instruções | *il fait*, *avoir mal à*, imperativo de *vous* | *está frio / faz frio*; *estar com dor de*; imperativo na fala = forma do indicativo (*fala*, *vem*) x norma (*fale*): nota de realidade |
| 7 Casa e descrição | descrever casa, objetos, pessoas, comparar | concordância e posição do adjetivo, *c'est/il est*, *ce/cet/cette* | concordância (parecida), adjetivo quase sempre depois; *este/esse/aquele* (3 graus, na fala 2) |
| 8 Lazer, convites e passado | gostos, convidar/aceitar/recusar, contar o fim de semana | passé composé com 2 auxiliares, concordância do particípio | **pretérito perfeito simples** (sem auxiliar: muito mais fácil, pode vir antes); imperfeito pode entrar mais cedo que no francês |
| Avaliação | Ponto de verificação, Teste de Nível, tarefas por competência | formato DELF | o **Celpe-Bras** não certifica A1/A2 (níveis a partir de Intermediário, confiança alta; conferir se houve mudança recente) e é por **tarefas integradas** (ler/ouvir e escrever com gênero, interlocutor e propósito): inspira E1/E3/E9 no pt, mas não dá escala A1/A2 |

Também reaproveitável (pedagogia, `01` 6.2): molde da unidade, 1 nota contrastiva por unidade, gramática depois do input, notas de realidade com gatilho, avaliação em camadas, Desafios por módulo, tipos de exercício novos da seção 7 (todos independem do idioma, exceto E8, que precisa de pares mínimos próprios do português: *avó/avô*, *pão/pau*, *mais/mas*).

### 10.2 Perguntas para responder quando chegarem os livros de PLE e o material do Celpe-Bras

1. Em que ponto os livros de PLE para iniciantes põem **ser x estar**? (no francês não existe; é o maior "ponto novo" do molde)
2. O **pretérito perfeito** vem no meio do A1 (é um tempo simples) ou no fim, como o passé composé?
3. O **pretérito imperfeito** fica no A2, como no francês, ou entra no fim do A1?
4. **Estar + gerúndio** é A1? (no francês *être en train de* é A1+/A2)
5. Imperativo: ensinar a forma da norma (*fale*), a da fala (*fala*) ou as duas (com nota de realidade)?
6. Pronomes oblíquos e colocação (*me chamo* x *chamo-me*; *te amo*; *vou te ligar*): o que é A1? (decisão 4 do catálogo de erros, ainda aberta)
7. *A gente* no lugar de *nós*: desde a 1ª unidade (como *on* no francês)?
8. Futuro: só *ir* + infinitivo no A1/A2 e o futuro simples (*falarei*) só reconhecido?
9. Contrações (*no, na, do, pelo*) e crase: em que unidade e com que carga?
10. Variedade: a decisão já tomada (vozes próximas da paulista, notas comparando Rio x SP) vale para todo o curso?
11. Notas culturais do Brasil: quais temas os livros de PLE trazem (festas juninas, Carnaval, comida regional, "jeitinho")?
12. Avaliação: usar a escala CEFR (A1/A2) mesmo sem exame oficial correspondente, ou outra (ex.: níveis do próprio livro)?
13. Tarefas estilo Celpe-Bras (gênero + interlocutor + propósito) no fim de cada módulo: adotar já no A1?
14. Conjugação do português: que verbos e tempos no A1 (decisão da dona: Conjugação está entre os módulos do começo)?
15. Números: incluir o "meia" (seis) no ditado de telefone desde o A1?

---

## 11. Decisões que dependem da dona e plano de execução

### 11.1 Decisões (com a minha recomendação)

1. **Fronteira A1/A2.** Adotar a regra 1.1 (A1 = núcleo dos dois métodos + DELF A1; zona cinza só como fórmula quando já usada). *Recomendo: sim.*
2. **A1-g7 Comparativos** fica no A1 ou vai para o A2-g6? *Recomendo: fica no A1 (custo zero, útil em compras), com input novo; o superlativo vai para o A2.*
3. **Tamanho do A1 revisado:** completo (43 unidades, 8 módulos) ou enxuto (38, só P0)? *Recomendo: aprovar o mapa completo e executar em ondas, P0 primeiro (seção 11.2).*
4. **Módulos novos** `A1-m7` e `A1-m8` inseridos nas posições 2 e 5 (o número exibido dos módulos seguintes muda: "Módulo 2" passa a ser outro). *Recomendo: sim; avisar os alunos por aviso no Mural.*
5. **Política "só acrescentar"** em unidades existentes (nunca reordenar/apagar/mover palavra ou frase): aceita que A1-3 e A1-7 fiquem com 16 e 15 palavras? *Recomendo: sim; é o que protege o FSRS.*
6. **Unidades inseridas para quem já passou daquele ponto:** destravar automaticamente (sem obrigar a fazer) e mostrar "Novo" no mapa. *Recomendo: destravar e marcar "Novo"; não exigir para o Teste de Nível de quem já fez.*
7. **Correção da produção escrita/oral (E1, E6):** só autoavaliação, professora (alunos vinculados) ou IA? *Recomendo: autoavaliação + modelo agora; envio para a professora depois; IA não (custo e infraestrutura).*
8. **Mini-prova DELF por módulo (E9):** por módulo ou a cada 2 módulos (como o Défi)? Grátis ou Premium? *Recomendo: por módulo, opcional, grátis; o Teste de Nível vira simulado completo.*
9. **Grátis x Premium** de tudo o que é novo: trilha (unidades novas, E1 a E8) grátis; Desafios Premium (paywall desligado); 1 ditado grátis por módulo; Jogos da Conjugação Premium. *Recomendo: assim.*
10. **Conjugação:** ranking por frequência (J1) com a lista conferida no Lexique 3, etiquetas de nível (J5), verbos novos (J2), jogos A1 (J6). *Recomendo: J1, J3 e J5 já; J2 e J6 com o A1 revisado.*
11. **Jogo "Passé composé ou Imparfait?"** com etiqueta A2. *Recomendo: sim.*
12. **Notas repetidas de pergunta *in situ*** (R5): manter as 5, encurtar 3 ou tirar 3? *Recomendo: manter A1-2 e A1-20, encurtar as outras 3 para 1 linha.*
13. **Classificação da nota de feminização das profissões** (A1-22): é "realidade" (que categoria?) ou explicação? *Recomendo: explicação.*
14. **A2:** aprovar o mapa (8 módulos, 34 unidades) e construir na ordem m1 → m2 (passado = coração do DELF A2) → m7 (carta) → os demais. *Recomendo: sim.*
15. ***savoir* x *connaître*** (promessa do A1-g6): tela no A2-g7 ou nota no A2-11? *Recomendo: nota de explicação no A2-11 (estudos: "Je connais cette école" x "Je sais parler anglais").*
16. **Fonte de nível do Grammaire Essentielle e do Beacco:** vale conferir no livro físico quais capítulos são A1/A2 (subjuntivo) e comprar os referenciais Beacco A1/A2? *Recomendo: conferir o GEF (rápido); o Beacco é opcional.*
17. **Atualizar o módulo de 13 desafios na produção** (seção 6.2): autoriza? *Recomendo: sim, primeiro no Staging, junto com a publicação do A1 revisado.*

### 11.2 Plano de execução em etapas

Riscos de progresso (lidos em `.claude/rules/conteudo-trilha.md` e `flashcards-motor.md`, conferidos no código):
- **Ids de cartão da trilha são por índice** (`u{unidade}-v{i}`, frases por índice e local): nunca reordenar, apagar ou mover palavra/frase. Trocar só o **texto** mantém o id e o histórico (usar só para corrigir/variar, não para mudar o sentido).
- Acrescentar palavras numa unidade **já concluída** cria cartões novos para quem já terminou (aparecem como novos na Revisão): avisar no Mural.
- Reagrupar lições muda o `lessonIdx` de quem está no meio da unidade: zerar `lessonIdx` só das unidades reagrupadas e não concluídas.
- Unidade nova antes de outra já concluída nasce trancada (`fr/app.js:4497-4501`): precisa de reparo no carregamento (decisão 6).
- `unitProgress`, `checkpointProgress` e `levelTestProgress` são por id: ids existentes não mudam, então nada se perde; quem já passou no Ponto de verificação do `A1-m1` antigo continua aprovado.
- Todo texto novo vai para **duas camadas** (`courses/fr-pt-BR/layer.js` e `fr/content.en.js`): o site em inglês não pode ter nada em português; tradução nova entra `needs_review` com confiança. Mudança de texto em português existente passa pela lista `DELIBERATE_PT_CHANGES` (`tests/i18n`).
- Áudio: texto novo ou alterado = mp3 novo (skill `audio-tts`); texto com marcador de perfil cai no Web Speech.
- Desafios e ditados ligados a módulo: mudar unidade de módulo exige atualizar dados na produção (autorização).
- Decks e tags da trilha (Course Decks por idioma estudado, decisão Q-12): conferir que unidades e módulos novos geram deck/tag sem ajuste manual (`studyTrailTags`).

| Etapa | O que muda | Arquivos | Esforço | Risco | Testes |
|---|---|---|---|---|---|
| **A. Correções de texto e gancho** | anomalias 3, 18, 22, 27, 28-31; frase R4; frases repetidas (4.3); Acentuação fora do alvo (dados); éteindre (J3); etiquetas de nível na Conjugação (J5, R1, R2) | `layer.js`, `fr/content.en.js`, `fr/content.js` (gatilhos, `lessons`), `fr/conjugation-data.js`, `fr/app.js` | baixo | baixo (sem id novo) | `tests/camada-curso`, `tests/i18n`, `tests/conjugacao`, `check_grammar_input.js` |
| **B. Acréscimos em unidades existentes** | A1-3 (+6), A1-7 (+5), A1-19 (+1) no fim; frases novas (input de A1-g4, A1-g7, descrição, família); V/F nas 12 unidades; notas da seção 8 (alta confiança) | `fr/content.js`, camadas, `AUDIO_MANIFEST` | médio | médio (cartões novos para quem já concluiu; `lessonIdx`) | regressão da trilha, `tests/curso-progresso`, `check_dictation_vocab.py`, teste no navegador (skill `teste-navegador`) |
| **C. Gramática nova e ampliada** | A1-g11, g12, g13, g16 (P0); g14, g15 (P1); telas novas em A1-g1, g3, g6, g9 | `fr/content.js`, camadas, `grammar_input_map.json` | médio | baixo (unidades de gramática não geram cartão FSRS de palavra; conferir) | `check_grammar_input.js` (0 avisos novos), Ponto de verificação |
| **D. Unidades e módulos novos** | A1-21 a A1-27; módulos `A1-m7`, `A1-m8`; reparo de desbloqueio; Teste de Nível com 40 itens; ditados dos módulos novos; módulo de 13 desafios atualizado (produção, com autorização) | `fr/content.js` (`UNITS`, `MODULES`), camadas, `fr/app.js` (reparo), `fr/dictations.js`, lotes de desafios, banco | alto | alto (desbloqueio, módulo exibido muda de número, dados em produção) | regressão completa, `tests/desafios-*`, `tests/ditado`, `tests/checkpoint-*`, navegador nos 4 cenários (fr × claro/escuro, celular) |
| **E. Tipos de exercício** | E4, E7 → E1/E2/E3 → E5 → E8 → E6 → E9 | `fr/app.js` + `shared/core/` (núcleo comum, já pensando no pt) | alto | médio (UI nova) | testes novos em `tests/<tema>/`, navegador |
| **F. Conjugação** | J1, J2, J4, J6 | `fr/conjugation-data.js`, `fr/app.js`, `fr/conj-games.js` | médio | baixo | `tests/conjugacao` |
| **G. Desafios do A1** | Complete a frase das 16 gramáticas, Expressões das unidades sem nenhuma, OT/Acentuação/Expressões das unidades novas | `fr/scripts/challenges_import/`, skill `criar-desafios` | médio | baixo (`needs_review`) | `fr/scripts/test_answer_validation.js`, `tests/desafios-*` |
| **H. A2** | módulo a módulo (m1, m2, m7, depois o resto), cada um com Desafios, ditados e tarefa DELF | tudo acima | muito alto | baixo para o A1 (nível novo) | idem D |

Ordem: A → C → B → D → G → F → E → H (A e C não mexem em progresso e já resolvem as maiores incoerências; D é a etapa que exige mais cuidado e a autorização de dados).

---

## Resumo

- **Principais lacunas do A1:** números 4 a 19, artigos/gênero, negação e perguntas, *aller* + futuro próximo, imperativo (todos usados sem ensino); dados pessoais/formulário, soletrar, profissões, cartão-postal, viagem/hotel, convites (aceitar/recusar), refeições; dias e meses incompletos; fonética inexistente; francofonia e festividades ausentes das notas; nenhuma produção escrita/oral nem compreensão sem texto.
- **Passé composé:** fica no A1 (todas as fontes), mas o A1-20 vira "primeiro contato" com objetivo e nota corrigidos, o A1-g9 fica só com *avoir* e o *être* ganha unidade própria (A1-g16).
- **Remoções/etiquetas:** Jogo PC x Imparfait e tempos A2/B1 da Conjugação ganham etiqueta de nível; frase "Je vais détester ce plat" reescrita; 3 notas repetidas de pergunta *in situ* encurtadas. Nada do núcleo sai; o comparativo fica (decisão 2).
- **Deslocamentos:** A1-4/A1-g2 e A1-11/A1-12 vão para 2 módulos novos; ordem relativa das 30 unidades preservada.
- **A1 revisado:** 8 módulos, 43 unidades (13 novas), ~282 palavras; versão enxuta: 38 unidades.
- **A2 proposto:** 8 módulos, 34 unidades (19 + 15 gramática), ~190 palavras, cada módulo com tarefa DELF A2 e Teste de Nível em formato DELF.
- **Conjugação/Desafios/Ditados:** ranking real de frequência, 17 verbos faltando, *éteindre*, jogos A1; Complete a frase para todas as gramáticas; ditados de números e soletrar; 13 desafios mudam de módulo (dado em produção).
- **Risco principal:** ids de cartão por índice: tudo é "só acrescentar" e unidades novas; desbloqueio de unidades inseridas precisa de código.
- **Decisões abertas:** 17 (seção 11.1), com destaque para 3 (tamanho), 4 e 6 (módulos novos e desbloqueio), 7 e 8 (correção de produção e mini-prova DELF), 9 (grátis x Premium) e 17 (dados em produção).
