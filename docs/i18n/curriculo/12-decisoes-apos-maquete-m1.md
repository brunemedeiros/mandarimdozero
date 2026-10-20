# Decisões da dona depois de ver a maquete do módulo 1 (2026-10-18)

Fonte: retorno da dona sobre a maquete (`maquete-m1/`, artifact privado) e sobre o preview (`09`). Itens marcados **[a fazer]** entram na
maquete v2; **[padrão]** viram regra de interface; **[pendência]** ficam registrados no `CLAUDE.md` ("Pendências da autora").

## Diálogo
1. **Proposta aprovada:** balão neutro à esquerda (mensagem recebida), azul à direita (enviada), nome colorido acima do balão da esquerda.
2. **Botões por fala:** 🔊 e 🌐 (44 px) abaixo do balão, **mantendo** "Ouvir tudo" e "Mostrar traduções" no alto.
3. **SEM seletor "quem fica à direita".** O diálogo é entre duas pessoas que não são o aluno; o falante A fica sempre à esquerda e o B à direita.
   Só se o aluno participar do diálogo (ideia futura) ele ficaria à direita, sem seletor. (A ideia do seletor era minha e foi retirada.)
4. **Palavra nova no diálogo:** no desktop, **hover** (em vez de aviso ao tocar), e o balão com o significado **fica fixo** até o aluno clicar em
   outra parte da tela. No celular, toque abre o mesmo balão. [a fazer]

## Lâmpada 💡
5. O **contador some depois do primeiro clique**, mas a lâmpada continua abrindo as notas (só não fica o contador distraindo). Uma nota nova
   (ou ainda não vista) volta a acender o contador. [a fazer]

## Padrão de feedback dos exercícios (referência: Busuu, captura enviada pela dona)
6. **[padrão]** Em TODO exercício (digitar, clicar, ouvir, conjugar), depois da resposta, certa **ou** errada, o painel de resposta mostra: estado
   ("Bom trabalho!", "Quase", "Resposta correta"), a **frase correta em francês com áudio** e a **tradução** logo abaixo. Hoje isso só acontece no
   "Ponto de verificação: a frase nova"; deve valer em "Praticando: digite o que ouviu", em "Você entendeu?" (3 checagens), nos exercícios de digitar
   das gramáticas e nos demais. Digitar a resposta certa não prova que o aluno sabe o significado: a tradução precisa estar sempre visível.
7. **[padrão]** Erro de digitação ou de conjugação: além da caixa vermelha com a resposta, **marcar em vermelho as letras erradas ou o que faltou**
   (diferença letra a letra), como o ditado já faz palavra a palavra.
8. Estudo do código e proposta do componente único: `13-padrao-feedback-exercicios.md` (em andamento).

## Som
9. **Remover o selo de som na palavra** (clicar nele tirava o aluno da lição e o jogava numa lição de som). No lugar, uma **nota curta logo depois
   da palavra** (ex.: depois de *ans*, a nota da ligação *deux‿ans*, *trois‿ans*). [a fazer]
10. A lição/exercício de som vem **logo depois da lição em andamento, na ordem da trilha**; nunca um atalho que tire o aluno de uma lição. [padrão]
11. **Áudio da pergunta que sobe e da afirmação que desce:** na maquete as duas saíram iguais (voz do navegador, não o áudio real). Risco real: o TTS
    (Chirp 3 HD) pode não variar a entonação. Antes de publicar, **testar** "Ça va ?" x "Ça va." no laboratório de áudio do fr e, se não variar,
    usar frases-modelo gravadas/ajustadas. [pendência técnica]
12. Nos exercícios do "Som do módulo" que dizem "ouça as duas em seguida", **faltou o botão de áudio** (erro da maquete). [a fazer]
13. **"Grave e compare":** implementar já de forma básica, **sem correção** (o aluno grava, ouve a si mesmo e o modelo). No futuro, uma API de
    avaliação de pronúncia. Observação minha: a avaliação de pronúncia com nota por som que encontrei é a do **Azure** (fr-FR); não confirmei
    que o Google ofereça equivalente, só reconhecimento de fala (confiança **média**). Decidir quando chegar a hora (custo e Premium).

## M1.5 (g) être e avoir
14. Hoje só algumas formas têm áudio (as que estavam em frases: *je suis, j'ai, il a, elle est*). **Botão 🔊 ao lado de cada conjugação (fora da caixa)**
    que toca pronome + verbo. Sugestão minha, a confirmar: um botão "Ouvir a conjugação toda" que toca as seis em sequência, destacando cada uma,
    porque depender de 6 cliques não ensina o ritmo. [a fazer]

## M1.6 / M1.7
15. **Nota cultural na M1.6 sobre *la féminisation des noms de métier***: *l'auteur / l'auteure / l'autrice*, *Madame le président / Madame la
    présidente*, etc. Estava citada de passagem na M1.7 e é relevante demais para isso. Nota nova, com **nível de confiança** declarado e
    revisão da dona antes de publicar (regra das notas de realidade). [a fazer]

## Défi de fim de módulo
16. **ARQUIVADO por enquanto**, com tudo o que foi produzido preservado: `07-atividades-finais-defi.md` e as telas do défi em `maquete-m1/` e no
    `09`. Motivo: não pode coincidir com as funções do **Ponto de verificação** e dos **Desafios**; deve ser algo mais claramente voltado ao
    **DELF**. Retomar depois. [pendência]
17. A ideia de **criar um diálogo e gravar uma apresentação** (ou **gravar uma habilidade exigida no fim de um módulo**) é interessante e **não deve
    ficar restrita a uma seção**: explorar depois como recurso geral. [pendência]

## Pendências registradas
- Retomar as atividades finais/défi, ligadas ao DELF, sem sobrepor Ponto de verificação e Desafios (arquivo `07` + maquete).
- Explorar gravação de apresentação/diálogo/habilidade como recurso geral de fim de módulo.
- Testar a entonação de pergunta x afirmação no TTS do francês antes de publicar a lição de som.
- Corretor de pronúncia (API) no "Grave e compare": avaliar custo e Premium no futuro.

---

# Segunda rodada de ajustes da maquete (2026-10-18, depois da maquete v2)

## Áudio e botões
18. **"Ouvir tudo" (diálogo) e "Ouvir a conjugação toda" (M1.5 g) precisam de botão de PAUSAR**, para o caso de o aluno clicar por acidente. [padrão]

## Diálogo
19. Manter o **nome dos personagens**: o nome fica **abaixo do avatar**, como já existia. Se o diálogo é para o aluno agir como ele mesmo, o lado direito mostra o avatar, ícone ou
    iniciais dele com **"Você"** (en: **"You"**) embaixo do avatar. [a fazer]

## Pronúncia (antes "Som")
20. A faixa e a lição **"Som" passam a se chamar "Pronúncia"** (en: **Pronunciation**), inclusive "Pronúncia do módulo". [a fazer]
21. A prática de pronúncia fica **só na M1.7 (g)**, com masculino e feminino das nacionalidades. Sai a linha curta de som que a maquete v2 pôs na M1.3. [a fazer]

## Painel de resposta
22. **[padrão] Regra geral: o painel de resposta fica preso ao pé da tela, mas nunca se sobrepõe a outro elemento nem os esconde.** Implementação: a área da lição reserva
    espaço embaixo igual à altura do painel (a rolagem chega até o último elemento, como o botão "← Voltar", sempre acima do painel). Com zoom alto ou tela baixa, o painel passa a
    fazer parte do fluxo (deixa de ser fixo). [a fazer na maquete; entra na especificação do componente do `13`]

## Notas
23. **Visual único para as notas curtas** ("Vale entender isso"): "Moi, je m'appelle Ana. Et toi ?" e "Et lui ? Et elle ?" estavam com visuais diferentes. Uma nota é um só
    componente visual, com variações só de tipo (explicação, realidade, cultural). [a fazer / padrão]

## M1.7 (g) masculino e feminino
24. A caixa "iguais, ou diferentes só na escrita" não faz sentido. Trocar por **"Escritas diferentes, mas sons iguais"**. [a fazer]
25. **Sempre que o texto disser que dois sons são iguais ou diferentes, mostrar os dois lados com áudio** (a versão masculina e a feminina lado a lado, cada uma com 🔊),
    para o aluno poder conferir. Hoje a tela não mostra o masculino para comparar. [padrão]

## Nota N02
26. **N02 fica COMO ESTÁ** (decisão da dona): o aluno precisa conhecer *s'il vous plaît* e também *s'il te plaît*, então a menção ao *tu* no parêntese faz sentido na M1.1.
    Observação de conteúdo: hoje o vocabulário da A1-1 só tem *s'il vous plaît*; *s'il te plaît* aparece só na nota. Pergunta aberta para a dona: pôr *s'il vous plaît / s'il te plaît*
    como cartão em par (formal / informal) no vocabulário da M1.1?

---

# Terceira rodada (2026-10-18, depois da maquete v3)

27. **Nota "Et lui ? Et elle ?" (M1.4):** fica como está (a dona achou ótima), mas **precisa nomear o conceito**: *lui* e *elle* são **pronomes tônicos** e contrastam com os
    pronomes sujeito *il* / *elle*. Uma linha curta. [a fazer]
28. **Regra do currículo: nunca ensinar só o formal ou só o informal.** *S'il vous plaît* e *s'il te plaît* entram juntos na M1.1: no mesmo cartão (par) ou em dois cartões
    seguidos, um após o outro. Vale para qualquer par de registro (*tu / vous*, *salut / bonjour*, etc.). Ver `15-regras-do-curriculo.md`. [padrão]
29. **Visual das notas: a "caixa roxinha"** (a variação `wrapup` do bloco de gramática do site) é o gosto da dona. Interpretação a confirmar: **todas** as notas usam essa caixa;
    o tipo (explicação, realidade, cultural) aparece no rótulo/ícone, não na cor da faixa lateral.
30. **M1.7 (g) é só masculino e feminino.** A lição de **ritmo e entonação** (pergunta que sobe, afirmação que desce, onde cai a força) **não entra na M1.7**: continua separada
    (a proposta de juntar foi retirada).
31. **Nome:** a dona pediu trocar "Som" por "Pronúncia" (a faixa/etiqueta). "Pronúncia **do módulo**" foi um acréscimo da maquete e não foi pedido; a lição passa a se chamar só
    **"Pronúncia"** (com subtítulo do assunto, ex.: "Pronúncia: pergunta e afirmação").

---

# Quarta rodada (2026-10-18)

32. **Entonação de pergunta e afirmação NÃO é uma lição de pronúncia** (uma frase só é cedo demais): vira uma **nota de pronúncia** na M1.1, ao ensinar *Ça va ?* (pergunta, sobe) e
    *Ça va.* (resposta, desce), com os dois áudios. Some a lição avulsa "ritmo e entonação" do módulo. Regra geral: **pronúncia vira lição só quando há conteúdo suficiente**;
    com uma ou duas frases, é nota. A pronúncia do M1 fica: nota em M1.1 (*Ça va ?* / *Ça va.*), nota em M1.3 (ligação *deux‿ans*) e a prática da M1.7 (masculino e feminino).
33. **Nova categoria de nota: "pronúncia"** (além de explicação, realidade e cultural), com rótulo/ícone próprio, na mesma caixa roxinha.
34. **Caixa roxinha para TODAS as notas** (confirmado); o tipo aparece no rótulo/ícone, não na cor. [a fazer na maquete v4]
35. **Nota M1.2 "Moi, je m'appelle Ana. Et toi ?" passa a incluir "Et vous ?"** (regra do projeto: formal e informal sempre juntos) e a introduzir os **pronomes tônicos**:
    *moi, toi, vous* são pronomes tônicos (como *mim* e *ti* em "para mim, para ti"); usamos o tônico **no começo da frase, para dar ênfase, ou depois de preposição ou conjunção**
    (aqui, depois de "Et"). Assim a nota "Et lui ? Et elle ?" da M1.4 só amplia a lista (*lui, elle*) e contrasta com os pronomes sujeito *il / elle*. [a fazer]
36. **Lição "Pronúncia do módulo: ritmo e entonação" sai** (ver 32); fica só a prática "Pronúncia: masculino ou feminino?" na M1.7. [a fazer]

---

# Quinta rodada (2026-10-19)

37. **Nota "onde cai a força" (merCI, bonJOUR): sai.** Já não está na maquete v4/v5.
38. **Rótulos de realidade ficam:** "Na vida real", "Assim também se fala", "Variação regional".
39. **Nota "Et lui ? Et elle ?" (M1.4)** ganha a frase: *lui* é diferente do sujeito *il*; *elle* é igual nos dois usos.

---

# Sexta rodada (2026-10-19): perguntas que travavam o M1 e aprovação do mapa do A1

40. **Mapa final do A1 APROVADO** (8 módulos, 48 unidades; `08-mapa-final-a1-a2-v2.md` seção 3.1). O M1 está fechado. Falta aprovar o A2.
41. **Palavras *dix-sept, dix-huit, dix-neuf* TÊM cartão** (a recomendação era deixá-las sem). A M1.4 passa a ter 13 palavras (conjunto fechado): 4 lições + Revisão da unidade.
42. **Títulos funcionais** em unidades e módulos (regra 2): "Primeiros contatos" vira "Apresentar-se" etc. Muda texto publicado (`DELIBERATE_PT_CHANGES` e camada en).
43. **Ids de módulo por sobreposição de unidades** e **aviso no Mural** sobre a nova numeração.
44. **"Continuar" segue onde o aluno estava**, não aponta para a unidade nova aberta atrás dele (mudança pequena em `currentTrailUnit`).
45. **Conjuntos fechados com mais de 10 palavras** ficam numa unidade só (M1.3 com 14, M1.4 com 13, M3.1, M3.3, M3.5, M4.1): 4 lições + Revisão da unidade.
46. **Critério nota x gramática** (vira nota só o que a prova do módulo e os Desafios não cobram com correção) e **teto de 5 telas e 8 exercícios por gramática**.
47. **A lição final de cada unidade passa a se chamar "Revisão da unidade"** (en: "Unit review"). "Ponto de verificação" fica só para a prova do módulo. Motivo: a dona não quer dois "Ponto de verificação". Muda texto publicado em `fr/content.js` (lições), `fr/app.js`, `shared/i18n` e camada en; `DELIBERATE_PT_CHANGES`. Aplicar na Etapa de textos, com teste.
48. ***s'il vous plaît / s'il te plaît* num cartão em par**, mantendo a chave do cartão atual (progresso de quem já estudou segue).
49. **Detalhes do M1** como na maquete (*neuf ans* na nota de ligação; Léa e Hugo; exemplos da M1.5 trocados); **tela "Uma pegadinha comum" (*avoir faim*) sai da M1.5** e vira nota na M4.1; **nota de instruções de aula (*écoutez, répétez*) sai da trilha**; **aceitar *professeur* e *professeure*** (e *ingénieur / ingénieure*) para mulher.
50. **Palavras novas em unidade já concluída** (*quatre... neuf*): **tela única opcional "Novidades desta unidade"**, não direto para a Revisão (código novo pequeno).
51. **M1.5, tela "Être e avoir na apresentação":** não usar *Je suis Ana* (pouco usual para dizer o nome; o nome se diz com *je m'appelle* ou *moi, c'est...*). *Être* aparece com nacionalidade: *Je suis brésilienne. Je suis français.*; *avoir* com a idade.

---

# Sétima rodada (2026-10-19): perguntas do M2

52. ***sympa* e *timide* como cartões na M2.3** (12 palavras); o resto do caráter fica no A2 M4.5.
53. **Frases do `A1-3` sobre família** (*J'ai deux frères et trois sœurs.*, *Quel est l'âge de ton père ?*) vão para a M2.1 mantendo a chave.
54. ***c'est / il est* como nota na M2.1**, não tela da `A1-g2`.
55. **"O gênero não segue o português"**: tela na `A1-g17` (*l'âge*) e nota na M5.3 (*le pantalon, la robe*).
56. **Dados pessoais e soletrar (`A1-23`) no M7** (ficha de hotel), não no M2.
57. **Perguntas (sistema completo) são conteúdo do A1, não do A2** (a dona, 2026-10-19): palavras interrogativas e estrutura interrogativa (entonação, *est-ce que*, inversão) se espaçam em vários módulos e unidades do A1. Isso REVOGA "sistema completo no A2 M9.4" e "palavras de pergunta só viram notas". Desenho em discussão (ver `08 v2` pergunta 18).
58. **Negação**: a dona quer tratar a negação simples e a complexa com mais peso (nota para cada uma ou uma gramática maior "Negação"). Em discussão (ver `08 v2` pergunta 18).
59. **Artigos e plural saem da M1.7 e viram a M2.2** (`A1-g17`). A M1.7 passa a tratar só do gênero de pessoas (masculino e feminino de nacionalidades e profissões).
60. **Negação simples = notas leves ao longo do A1** ("aliás, veja como fica no negativo"), a cada estrutura verbal nova (*être, avoir*, artigo indefinido, partitivo, modais, *passé composé*, futuro próximo), sem lição própria. Onde a estrutura já é gramática, vira tela dentro dela. Posições propostas em `16-negacao-e-perguntas-no-a1.md` (a dona confirma).
61. **Com os artigos (M2.2)**, ensinar a negação do indefinido: *J'ai une voiture* → *Je n'ai pas de voiture*. **Em Comer e beber**, nota após *Je mange de la salade* → *Je ne mange pas de salade* (M4.2).
62. **Negação complexa**: notas breves quando a palavra aparece e **uma gramática dedicada no A2** para sistematizar (`A2-g21`, ampliada e renomeada "Negação complexa"). Revoga a decisão 18 do `10` ("negação complexa desfeita em notas").
63. **Perguntas seguem o mesmo desenho** (A1): nota leve na 1ª vez de cada palavra de pergunta e uma gramática A1 "Palavras de pergunta" para sistematizar; o A2 M9.4 fica só com os três registros. **M2.7 passa a "Perguntar: sim ou não"** (sem negação). Posição da gramática "Palavras de pergunta": pergunta aberta (recomendado M6, depois do M6.1).
64. **Negação por diálogo, não por nota** (a dona, 2026-10-19): a forma negativa NÃO ganha uma nota por verbo novo; aparece num diálogo natural depois da afirmativa (ex.: M1.2 *Tu es française ? Non, je ne suis pas française. Je suis brésilienne.*). Nota só na 1ª aparição (a confirmar) e onde há regra que não se deduz (*pas de*, o *ne* que cai). Revisa a decisão 60.
65. **Nome "Palavras interrogativas"** (não "Palavras de pergunta").
66. **Perguntas: análise global** em `16`: as perguntas pessoais (*comment, quel, d'où, qui, combien de*) nascem em M1/M2 e as de hora, lugar e coisa em M3, M4, M6, M8. Proposta de duas gramáticas curtas (M2 e M6), a confirmar. Revisa a decisão 63.
67. ***C'est qui ? C'est ma sœur.*** (e não *Qui est-ce ?*) como frase nova na M2.1; escolha da dona. Grafia correta: *sœur*, com ligadura.
68. **Primeira aparição da negação (M1.2): nota breve de 2 linhas** junto do diálogo novo (*Tu es française ? Non, je ne suis pas française. Je suis brésilienne.*).
69. **Notas de negação do M4.2 (*pas de* / partitivo) e do M5.3 (o *ne* que cai na fala) ficam.**
70. **"Palavras interrogativas" em duas gramáticas**: (1) sobre pessoas, M2.7 (`A1-g22`, id novo); (2) lugar, hora e coisas, no M6 depois do M6.1 (id novo, a numerar). A M2 passa a 8 unidades (M2.8 = "Perguntar: sim ou não") e a M6 a 7. O A1 passa de 20 para 22 gramáticas.
71. ***Pourquoi / parce que*** só no M8.4 (diálogo de convite, recusar e justificar).

---

# Oitava rodada (2026-10-19): M3

72. **Dividir a `A1-g3`**: verbos em *-er* na M3.2 (com *on* só na tabela) e pronominais na nova `A1-g18` (M3.4), que nasce aberta, não concluída, para quem já fez a `A1-g3`.
73. **Reescrever os exercícios das gramáticas publicadas que mudam de lugar** (`A1-g8`, `g5`, `g3`, `g7`, `g6`) e criar o teste "exercício só com palavras vistas até ali".
74. ***tôt, tard* na M3.1; *pas encore, après* na M8.2**; *hier* fundido; *récemment* sai para o A2 M2.5 (progresso intacto).
75. **M3.3**: a nota de pronúncia *samedi* = "sam'di" fica no M3.3, junto da palavra. **M3.5** (14 palavras): conjunto fechado, 4 lições + Revisão da unidade.
76. **M3 fechado** (6 unidades, 37 cartões, ~2h50), com o diálogo de negação do M3.3 (decisão 64) e as perguntas de hora e dia em diálogo (decisão 66).

---

# Nona rodada (2026-10-19): M4 e regra "conteúdo nasce traduzido"

77. **M4 "Comer e beber" aprovado**: *adorer* na M4.1; partitivos antes do restaurante; `A1-g5` (*faire / prendre*) vira M4.6 (muda de módulo).
78. **Tônicos com preposição**: nota breve na M4.1 (*Pour moi, un café*) e nota na M8.4 (*avec moi, chez toi*); sem tela de gramática no A1 e sem *sans*.
79. **M4.1 com 6 notas fica** (sem teto; a lâmpada rola). A nota de negação com partitivo é a N26 do M4.2 (*Je ne mange pas de ...*), com o contraste *le poisson* do M4.1 (decisão 69).
80. **Regra "conteúdo nasce traduzido"** (dona, 2026-10-19, outra sessão; na `main`): todo conteúdo novo ou alterado do mapa sai com pt-BR e en no mesmo lote (camada `courses/fr-pt-BR/layer.js`, inglês em `docs/i18n/content-en/`, Desafios em `challenges-en.json` e `dictations-en.json`; validadores `build-content-overlay`, `validate-content-overlay`, `validate-challenges-en`, `tests/i18n/test_sem_portugues_en.js`). Vale para toda entrega de conteúdo deste currículo.

---

# Décima rodada (2026-10-19): M5

81. **"Conteúdo nasce traduzido" vale a partir da aprovação**: nenhuma tradução (pt-BR ou en) é produzida para conteúdo ainda não aprovado pela dona. Depois de aprovado, o lote sai com as duas.
82. **Demonstrativos *ce / cette / ces*: ficam como nota** (M5.3), sem gramática própria (o M5 já tem duas gramáticas).
83. **`A1-g15`: só masculino, feminino e plural do adjetivo**, título visível **"Gramática: adjetivos"** (escolha da dona).
84. **A nota de *combien* na M5.1 fica.** A dona não decidiu uma regra geral contra notas de pergunta: nota de pergunta é permitida quando há propósito (corrige a leitura literal da decisão 66).
85. **Nova unidade M5.4 "Cores e materiais"** (`A1-29`, id novo), depois de "Comprar roupas" e antes da "Gramática: adjetivos" (agora M5.5). ~10 cartões: *gris, rose, orange, marron, clair, foncé, le bois, le verre, le coton, le cuir*; demais materiais numa **nota de vocabulário "Outros materiais"** (*la laine, le plastique, le métal, le papier, la soie, la pierre*) em vez de um cartão para cada. M5 passa a 5 unidades (3 + 2), ~2h55.
86. **Notas da M5.4**: *orange, marron* e *bleu clair* não mudam (na lição das cores, Exp, alta); *en* + material (depois dos materiais, Exp, alta); "Outros materiais" (vocabulário, Exp, alta).
87. **M2.3 passa a ser sobre aparência física, não roupas** (dona): altura, bonito/feio, loiro/moreno, tipos de cabelo, olhos etc. Como ficam as cores básicas e quais palavras entram: pergunta aberta (ver `08 v2`).
88. **Cores divididas por uso (opção B)**: a M2.3 fica com as cores de olhos e cabelo (*noir, bleu, vert, marron*, mais *blond, brun*); *rouge, jaune, blanc* (e as frases que as usam) vão para a M5.4 com as novas. As chaves estáveis e `released` protegem o progresso de quem já estudou.
89. **M2.3 só aparência física, sem roupas e sem caráter** (dona): "Descrever a aparência", 12 palavras (*grand, petit, joli, laid, les cheveux, les yeux, blond, brun, noir, bleu, vert, marron*) e uma nota de vocabulário "Outros traços" (*long, court, roux, bouclé, raide, la barbe, les lunettes*). *gentil* (cartão publicado) e a N16 vão para o A2 M4.5 "Descrever o caráter"; *sympa* e *timide* entram lá. Revisa a decisão 52.
90. **Padrão de título "Gramática: …"** para todas as unidades de gramática do A1 (dona); o assunto vem curto, sem subtítulo explicativo. Muda título publicado em 9 gramáticas já publicadas (camada pt-BR e en; `DELIBERATE_PT_CHANGES`). A2: a decidir.
91. **M5.4**: `le verre` já é cartão do M4.5 (copo); na M5.4 aparece só o sentido de material. Notas de vocabulário "Outros materiais" e "Outras cores" (*violet, beige, doré, argenté*).

---

# Décima primeira rodada (2026-10-19): padrão de título e M6

92. **Padrão "Gramática: …" vale para o A2 e para todos os cursos** (fr, zh, pt): regra 10 no `15`. Aplicado nos títulos das gramáticas do A2 no `08 v2`.
93. **Imperativo logo depois de "Perguntar e indicar o caminho"** (é onde aparece: *Tournez à gauche*). Revisa a posição da `A1-g19` no M6.
94. **Palavras interrogativas (lugar, hora e coisas) depois de "Pegar transporte"** no M6, se o tema comportar (dona).
95. ***le médecin* vai para a M1.6** e continua aparecendo em frases de exemplo na unidade de "Dizer onde dói"; *se reposer* vem para a unidade de saúde. **Modais perdem 2 exercícios** e *savoir* vai para o A2 (aprovado).
96. **A unidade de saúde (`A1-15`) está deslocada no M6 "Na cidade"** (dona). A junção vinha do módulo publicado "Deslocando-se e cuidando de si", não de um motivo pedagógico. Solução em discussão (ver `08 v2`).
97. **Nova unidade M6.3 "Lugares da cidade"** (`A1-30`, id novo), logo depois da gramática de imperativo: *la pharmacie, la banque, l'hôpital, la poste, la boulangerie, le supermarché, l'école, le parc, la mairie, l'église* (ajustável). A nota "farmácia: cruz verde, 15 e 112" vai para ela. *l'hôpital* sai da M6.1.
98. **M6 reordenado** (dona): M6.1 Perguntar e indicar o caminho; M6.2 Gramática: imperativo; M6.3 Lugares da cidade; M6.4 Gramática: *aller* e os contraídos; M6.5 Pegar transporte; M6.6 Gramática: palavras interrogativas (lugar, hora e coisas) (id novo `A1-g23`). A saúde e os modais saem do M6 (destino em discussão).
99. **Módulo "Saúde e conselhos" com 3 unidades**: Dizer onde dói (`A1-15`), **Pedir ajuda** (nova, com diálogo simulando a ligação para a urgência: números 15, 112, 18) e Gramática: modais e *il faut*. Aprovado pela dona; texto da unidade nova passa por revisão dela antes de ser escrito.
100. **O M7 "Casa, hotel e férias" se separa** (dona). Divisão e posição do M6.4 (*aller*) em discussão: análise crítica no `08 v2`/chat. Termo correto: "contrações" (não "contraídos") para *au, aux, du, des*.
101. **M6.4 = "Gramática: o verbo *aller*"** (com *aller* em itálico): conjugação + *aller à* + lugar, com retomada curta das contrações (que a gramática do M2.6 já ensinou), **sem link para outra unidade**. Termo "contrações". Nota nova: *en* + país feminino (*Je vais en France*) x *à la* + lugar feminino (*Je vais à la pharmacie*) (Exp, alta).
102. **Divisão do A1 em 10 módulos aprovada** (dona): M7 Casa e moradia; M8 Viagem e férias; M9 Saúde e conselhos; M10 Lazer, convites e passado (um módulo só). Unidade nova "Países e cidades" em Viagem (vocabulário, com nota breve de retomada *en / au / aux / à* + *partir*).
103. **Casa e moradia** precisa de mais conteúdo: levantamento do que existe e proposta no `08 v2` e no chat; entra uma gramática sobre *il y a* e *c'est* + adjetivo (pedido da dona).
104. **"Dar os dados pessoais" não é de Viagem** (dona): destino em discussão (proposta: Casa, como \"endereço e dados de contato\").
