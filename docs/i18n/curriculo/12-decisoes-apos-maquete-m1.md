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
105. **Casa e moradia aprovada** com 6 unidades: M7.1 Tipos de moradia e cômodos; M7.2 Descrever a moradia; M7.3 Gramática: *il y a* e *c'est* + adjetivo; M7.4 Móveis e objetos da casa; M7.5 Dizer onde as coisas estão; M7.6 Gramática: comparativos (~2h45).
106. **Sai a unidade "Dar os dados pessoais"** (`A1-23`) (dona): as palavras se distribuem pelas unidades onde fazem sentido (proposta de lugares em discussão). O hotel só reusa em diálogo.
107. **Dúvida da dona sobre a gramática de países (M2.6)**: com só *la France* e *le Brésil* como cartões a base de vocabulário é fina para ensinar *en / au / aux*. Confirmado: a gramática publicada (`A1-g4`) usa países nos exemplos sem cartão. Solução em discussão.

---

# Décima segunda rodada (2026-10-19): A1 em 10 módulos

108. **Alfabeto como lição de pronúncia na M1.2**, "O alfabeto e soletrar o nome", **sem cartão por letra**: tabela com áudio de cada letra, exercícios de ouvir e escolher ou digitar
     letras e de soletrar nomes; cartões só de *épeler* e da frase *Ça s'écrit comment ?*; confusões a treinar: G/J, E/I, H e os nomes dos acentos. Exceção à decisão 32
     (lição de pronúncia só com conteúdo suficiente), aprovada pela dona. A M1.2 ganha também *le prénom* (11 palavras).
109. **Opção A para a gramática de países** (resposta à dúvida da decisão 107): a `A1-g4` sai do M2 (base de vocabulário fina) e vira a **M8.2**, logo depois do vocabulário
     "Países e cidades" (`A1-31`). O M2 fica com 7 unidades (M2.6 palavras interrogativas sobre pessoas, M2.7 perguntar sim ou não). A M2.5 ensina *venir de* e *habiter à*
     como fórmulas, com nota breve só para os países que o aluno já tem (*Je viens de France / du Brésil. J'habite à Paris.*).
110. **Palavras da unidade "Dar os dados pessoais" (`A1-23`, nunca publicada, removida pela decisão 106) distribuídas**: *le prénom* e o alfabeto na M1.2; *le numéro de
     téléphone, le portable, le mail* na M5.1 (com as notas de telefone em pares e *courriel / arobase*); *la date de naissance* e *né / née* na M3.5; *l'adresse* na M7.1 (com
     *le code postal* na nota da ordem do endereço). O check-in da M8.3 só reusa essas palavras em diálogo.
111. **M3.5 com 15 palavras aceita** (conjunto fechado: 4 lições + Revisão da unidade), com *la date de naissance*.
112. **A1 com 10 módulos** (consolida as decisões 102, 105, 106 e 109): M1 Apresentar-se (`A1-m1`), M2 Família e pessoas próximas (`A1-m7`), M3 Rotina e calendário (`A1-m2`),
     M4 Comer e beber (`A1-m3`), M5 Compras (`A1-m8`), M6 Na cidade (`A1-m4`), M7 Casa e moradia (`A1-m5`), M8 Viagem e férias (`A1-m9`, novo), M9 Saúde e conselhos
     (`A1-m10`, novo), M10 Lazer, convites e passado (`A1-m6`). Ids de módulo por sobreposição de unidades; `A1-m7` a `A1-m10` nunca foram aprovados por ninguém. Total: 56 unidades
     (33 de vocabulário + 23 de gramática), 349 cartões, ~29h (estimativa). Mapa em `08-mapa-final-a1-a2-v2.md` seção 3.1. Ficam abertas as perguntas 58 (cartões publicados
     *la porte, la fenêtre, il y a, il n'y a pas de* que saem da `A1-17`) e 59 (nota *Allô ?*).
113. **Cartões que saem da `A1-17`**: *la porte, la fenêtre* vão para a M7.4 (móveis e objetos); *il y a, il n'y a pas de* ficam na M7.1; a M7.3 (gramática) sistematiza. As notas N37 (*y'a*) e "*la fenêtre*: o *e* que some" ficam na M7.1.
114. **Nota *Allô ?*** fica na M5.1, junto do telefone.
115. ***Il fait zéro degré dehors*** vai para a M8.5 (Falar do tempo e das estações).

---

# Décima terceira rodada (2026-10-19): A1 em 9 módulos, saúde no A2 e ajustes do A2

116. **O módulo "Saúde e conselhos" sai do A1** (dona): o A1 passa a ter **9 módulos** (55 unidades: 32 de vocabulário + 23 de gramática, 339 cartões, ~28h15). O id
     `A1-m10` nunca existiu em produção e é apagado do mapa. A unidade publicada **`A1-15` ("Dizer onde dói") muda de nível**: vira a **A2 M4.1 "Corpo e dores"**, com o
     mesmo id e as mesmas chaves de cartão (*la tête, le ventre, la main, le pied, la gorge, la dent, malade, avoir mal, la fièvre, se sentir, se reposer*) e as notas N34,
     N35, *Reposez-vous !*, *avoir mal au / à la / aux* e *depuis*. Riscos (conclusão, desbloqueio do módulo, Teste de Nível, tags, Desafios, ditados, cron) e o que falta
     implementar: `08 v2` seção 5. Ids de módulo: `A1-m6` = Lazer, convites e passado (M9); `A1-m9` = Viagem e férias (M8).
117. **"Pedir ajuda" (`A1-32`) vai para o A1 M8 "Viagem e férias", como a última unidade (M8.6)**, depois de "Clima e estações". A ligação é para a **polícia** (perdi o
     passaporte, roubaram a bolsa; números 17 e 112), não para a urgência médica. Lista proposta, **a revisar pela dona**: *au secours, appeler, avoir besoin de, urgent,
     vite, la police, perdu, le commissariat, l'aide* (sai *l'ambulance*, que vai para o A2 M4.3). M8 com 6 unidades (~3h05).
118. **Modais e *il faut* (`A1-g6`) vão para o A1 M9 "Lazer, convites e passado"**, antes de "Convidar, aceitar, recusar e se desculpar". Ordem do M9: M9.1 Falar de lazer;
     M9.2 Gramática: modais e *il faut*; M9.3 Convidar, aceitar, recusar e se desculpar; M9.4 Contar o que você fez; M9.5 Gramática: *passé composé* com *avoir*; M9.6 Gramática:
     *passé composé* com *être* (~3h15; substitui a ordem da decisão 35). A gramática é **revisada para o novo contexto**: exemplos e exercícios sobre convites e lazer
     (*Tu veux aller au cinéma ce week-end ? Je ne peux pas, mais je peux samedi prochain.*, *Tu dois voir ce film*, *Il faut réserver*), sem frases de saúde e sem *savoir*
     (A2 M6.4); a tela de negação com modais (*Je ne peux pas venir*) fica nela. Telas e exercícios publicados que mudam: `08 v2` seção 3.1, M9.2.
119. **Regra geral (dona): mover unidade = reavaliar as palavras e o conteúdo** para o novo módulo, ordem e tema, e dizer no mapa (coluna "Muda") o que foi trocado. Vale
     para todas as unidades movidas desta rodada (é a regra 11 do `15`).
120. **"Descrever o caráter" (`A2-35`) vai para o A2 M1 "Lembranças e fases da vida", como M1.3**, para comparar como a pessoa era antes (imperfeito + traços) e como é hoje
     (*Petit, j'étais timide ; aujourd'hui, je suis plus sûr de moi.*). Ordem do M1: M1.1 Contar como era a infância; M1.2 Gramática: imperfeito; M1.3 Descrever o caráter
     (antes e hoje); M1.4 Comparar antes e agora; M1.5 Contar as fases da vida. *gentil* (cartão publicado da `A1-16`), *sympa* e *timide* entram aqui; lista (*courageux,
     patient, drôle, curieux, têtu...*, 12 a 14, confiança média) **a revisar pela dona**. Sai do M4 e não vai para o M9.
121. **"Entender regras e avisos" (`A2-21`) vai do A2 M7 para o A2 M8**, depois de "Trânsito e carro", com as palavras revistas para a cidade (placas, interdições, avisos)
     em vez de regras de trabalho. O A2 M7 fica com 4 unidades.
122. **"Gramática: negação complexa" (`A2-g21`, antes "Alguém e ninguém") é a última unidade do A2 M8 (M8.7)**, depois de "Entender regras e avisos", porque ali
     *ne... plus, rien, personne, aucun, que* e *ni... ni* já apareceram em notas e diálogos. M8: M8.1 Procurar moradia; M8.2 Dividir apartamento e vizinhos; M8.3 Gramática:
     pronome *y*; M8.4 Serviços e papelada; M8.5 Trânsito e carro; M8.6 Entender regras e avisos; M8.7 Gramática: negação complexa.
123. **A2 M4 reordenado**: M4.1 Corpo e dores (a `A1-15`, vinda do A1); M4.2 Na consulta (`A2-10`); M4.3 **Emergências** (`A2-11`, renomeada; só emergência médica:
     *le bras, la jambe, le dos, les urgences, l'ambulance, le SAMU, grave, blessé...*, sem o que a `A1-15` já ensina); M4.4 Gramática: pronomes COI; M4.5 Esporte e
     hábitos saudáveis; M4.6 Gramática: condicional dos conselhos. Tabela "Saúde: o que é do A1 e o que é do A2" no `08 v2` (seção 3.2).

Pendência registrada junto (regra 11 do `15`): **auditoria pedagógica completa do A1 e do A2 antes da implementação real**, a cargo do agente `auditor-curricular`.

---

# Décima quarta rodada (2026-10-19): grátis x Premium nas notas e gramáticas

124. **Regra 12 (dona)**: notas (breves ou longas) ficam dentro das lições e são sempre grátis; unidades de gramática são Premium por natureza. Não tirar um conceito das notas para deixá-lo só numa gramática: o aluno gratuito precisa de uma versão gratuita (nota breve ou formulação numa lição de vocabulário) de cada conceito; a gramática Premium sistematiza e treina (reconhecimento, sistematização e produção). Nota breve não gera cartão nem entra nos Pontos de verificação. A dona reconhece que decisões anteriores desta fase podem ter ignorado isso; **auditoria pedida** (ver `auditoria/`).

---

# Décima quinta rodada (2026-10-19 a 2026-10-21): respostas à auditoria da saúde e dos modais

Base: `auditoria/2026-10-19-a1-a2-rodada-saude-modais.md` (tabelas 1.1 e 1.2). Aplicado em `08-mapa-final-a1-a2-v2.md`, `15` (regras 12 a 14), `16` e `00`. Nada aplicado ao site.

125. **Conclusão com paywall ligado: opção A** (dona). O aluno gratuito **conclui módulo e nível sem as unidades de gramática** (Premium). O Ponto de verificação do módulo
     cobra dele só o que ele pôde estudar (palavras, frases, escuta); do Premium, cobra também a gramática. **Revisa a decisão 46**: o critério nota x gramática continua
     ("vira gramática o que a prova do módulo e os Desafios cobram com correção"), mas essa cobrança vale para o Premium; para o gratuito, a prova do módulo não tem item de
     gramática. Falta implementar (`08 v2` seções 5 e 7): `moduleCompleted` e `levelCompleted` sem as gramáticas para quem não é Premium, Ponto de verificação por plano e
     teste. Nada implementado nesta fase; Teste de Nível e desbloqueio do módulo seguinte ficam na pergunta 60 do `08 v2`.
126. **Coluna "Versão grátis"** em todas as tabelas do A1 e do A2 do `08 v2`: para cada gramática, onde está a nota ou formulação gratuita do conceito (posição + gancho),
     com as notas novas marcadas *(nota nova)*. **O texto das notas só se escreve depois, módulo a módulo, aprovado pela dona.** Propostas aprovadas: artigos e plural na
     M2.1 (gancho *les parents*: o plural se ouve no artigo) + diálogo *Tu as des frères ? Non, je n'ai pas de frère.* com nota breve (*un, une, des* viram *de* depois de
     *pas*); adjetivos: +1 linha na N15 da M2.3 ("plural: *grands*, o *s* não se ouve") e a nota das cores (*orange, marron* não mudam); comparativos na M7.2 (gancho *grand*:
     *plus grand que, moins cher que, aussi calme que*, *meilleur*); números de 70 a 99 na M5.1 (gancho *soixante-dix*: 75, 80, 92, *deux cents*). E as demais da tabela 1.1:
     *son / sa* na M2.1; *est-ce que* na M2.5; terminações mudas do *-er* e pronominais na M3.1; imperativo *Tourne / Tournez* na M6.1; *aller à* + contrações na M6.3;
     *en, au, aux, à* + país completo na M8.1; futuro próximo na M8.3; modais e *il faut* na M9.1; PC negativo por diálogo na M9.4; +1 linha na nota da M1.6 (*-ier / -ière*).
127. **Nova unidade de vocabulário "Frequência"** (`A1-35`, id novo) no A1 M3, **antes da gramática**: M3.6 Frequência (10 palavras, lista a revisar pela dona: *toujours,
     souvent, parfois, rarement, jamais, tous les jours, d'habitude, de temps en temps, une fois par semaine, chaque*) e M3.7 Gramática: advérbios de frequência (`A1-g8`:
     posição do advérbio e *ne... jamais*). M3 passa a 7 unidades (4 + 3), 48 cartões, ~3h25. A1: 56 unidades (33 + 23).
128. **"Pedir ajuda" (A1 M8.6) no presente, sem passé composé**. Lista a revisar pela dona; frases-modelo: *Je suis perdu(e)*, *Je ne trouve pas mon passeport*, *J'ai besoin
     de la police*, *Au secours !*. As frases no passado (*J'ai perdu...*, *On m'a volé...*) só do M9 em diante.
129. **Conjuntos abertos com mais de 10 palavras são cortados para 10** (M5.1, M5.4, M7.1, M8.1); o excedente vai para **nota de vocabulário** (método dos materiais). Conjuntos
     fechados continuam permitidos (M1.3, M1.4, M3.5, M3.1, M3.3, M4.1, conforme o mapa). Junto, a decisão 113 nas tabelas: *la porte, la fenêtre* → M7.4 (10); *il y a,
     il n'y a pas de* ficam na M7.1; a nota "*la fenêtre*: o *e* que some" vai **com o cartão para a M7.4** (revisa a 113 nesse ponto); as frases publicadas *La porte est fermée
     à clé.* e *La fenêtre donne sur le jardin.* vão para a M7.4 e *La cuisine est très propre.*, *Le salon est confortable.* para a M7.2. Cortes propostos (pergunta 64 do
     `08 v2`): M5.1 *en espèces, le portable, le mail* em nota; M5.4 *le cuir* em "Outros materiais"; M7.1 *le studio, l'immeuble, le jardin* em nota; M8.1 *le Japon* em
     "Outros países". Contagens: M7 34, M8 39, A1 344 (depois, pelas 139 e 140: M2 30, M8 40, A1 343; e M3.1, M3.3, M4.1 são exceções aceitas como conjuntos naturais, não "fechados").
130. **Correção da `A1-15`** (a unidade publicada "Corpo e saúde"; "Dizer onde dói" no mapa de 10 módulos): são **10 cartões publicados** (*la tête, le ventre, la main, le pied,
     malade, le médecin, la pharmacie, avoir mal, la fièvre, se sentir*); *la gorge, la dent, se reposer* nunca foram publicados; *le médecin* e *la pharmacie* saem (ficam no A1,
     M1.6 e M6.3) → no A2 M4.1: **8 chaves antigas + 3 novas** (11). A unidade tem **3 lições + a lição final** (agora "Revisão da unidade"); `pe-doente-medico` e
     `farmacia-dor-febre` perdem palavras e são refeitas (`RETIRED_LESSON_IDS`). Corrige a decisão 116 ("mesmas chaves", "11 cartões") e a seção 5 do `08 v2`. A2: 9 cartões
     já publicados (8 + *gentil*) (corrigido pela 136: 10, com *récemment*).
131. **M6.4 (`A1-g13`) ensina as contrações *au, aux* (à + le / les) pela primeira vez** (nenhuma gramática as ensina antes, porque a de países foi para a M8.2): "retomada"
     vira ensino completo (revisa a decisão 101). A versão grátis é a nota da M6.3 (*Je vais à la pharmacie, au parc*). A nota *en* x *à la* fica fixada na M6.3.
132. **Conteúdo publicado que precisa de reescrita** (lista na seção 7 do `08 v2`): *gentil* e *sympa* no diálogo da M2.3 (`A1-16`), na `A1-g7` e no ditado `d5`; o diálogo da
     M2.5 (`A1-9`) com *en Allemagne* e *au Portugal*; *La porte est fermée à clé.*, *La fenêtre donne sur le jardin.*, *La cuisine est très propre.*, *Le salon est confortable.*
     (hoje antes dos cartões); *Désolée, je suis rentrée tard hier* sai da M9.3 (PC) e vai para a M9.4.
133. **Palavra repetida entre cartões = um cartão só**: *clair* tem cartão só na M5.4 (a M7.2 usa em frase e nota, "iluminado") e *le bureau* só na M1.6 (a M7.4 usa em frase e
     nota, "escrivaninha"); *la poste, la mairie, la banque, la police* e os números 112, 15 e 17 aparecem no A1 e no A2, e **o A2 não os reensina** como cartão novo (A2: 428
     cartões, 419 novos; corrigido pela 136: 427, 417 novos + 10 publicados; pela 139: 426, 416 + 10). Regra 14 do `15`. Números de emergência corrigidos pela 141: o A1 ensina 17 e 112 (M8.6), o A2 ensina 15 e 18 (M4.3).
134. **A2: coluna "Versão grátis"** nas 22 gramáticas, com as posições propostas pela auditoria (tabela 1.2) para as 13 sem versão grátis e para as parciais. A **nota *depuis* da
     A2 M4.1 fica**: a `A2-g5` (M2.6) vem antes na ordem do mapa, mas é Premium; a versão grátis de *depuis / pendant* entra na M2.5, antes da gramática.
135. **Auditoria**: o relatório de 2026-10-19 fica como **histórico**; depois desta rodada será rodada outra (`auditor-curricular`).

---

# Décima sexta rodada (2026-10-21): correções da auditoria da equidade

Base: `auditoria/2026-10-21-a1-a2-rodada-equidade.md`. Aplicado em `08-mapa-final-a1-a2-v2.md`, `16`, `15`, `00` e no `CLAUDE.md` (estado do cron). Nada aplicado ao site.

136. **Correções de rodada de auditoria sem decisão nova** (2026-10-21; só os achados que o relatório marca como "o editor corrige", aplicando regras e decisões já tomadas):
     - **Versão grátis**: a A2 M4.1 não abriga mais a de *depuis* (a da M2.5 vem antes; a nota da M4.1 é retomada); *combien de* da M2.6 ganha a fala *Tu as combien de
       frères ? J'ai deux frères.* no diálogo novo da M2.1; diálogos negativos posicionados na M3.1 (*Tu te lèves tôt ? Non, je ne me lève pas tôt.*, para a M3.4), M6.1
       (*Ne tournez pas à gauche...*, para a M6.2) e M8.3 (*Tu vas réserver l'hôtel ? Non, je ne vais pas réserver l'hôtel.*, para a M8.4); procedência *Je viens des
       États-Unis, d'Italie* na nota da M8.1 (para a M8.2); pronominal no PC *Ce matin, je me suis levée tôt.* na nota da M9.4 (para a M9.6); +1 linha *je l'ai perdue* na
       A2 M2.3 e *-t-* na A2 M9.3. Os outros 44 ganchos foram conferidos: todos antes da gramática.
     - **M1.2**: a nota breve da negação (*Tu es française ? Non, je ne suis pas française.*) e o diálogo, que estavam só no `16`, entram no `08 v2`.
     - **Regra 14**: *en bois* sai da A2 M3.1 (pergunta 62 vira registro) e *se sentir* da lista da A2 M9.5 (só frase e nota); A2 com **427 cartões: 417 novos + 10 já
       publicados** (*récemment*, `A1-20` → A2 M2.5, também muda de nível, como a `A1-15` e *gentil*; tags e decks derivados valem para ela).
     - **Frases e notas fora do lugar**: *La main est blessée.* vai com a chave para a A2 M4.3; exemplo da nota *ne... plus* (A2 M1.4) sem *fumer*; 10 frases publicadas
       que ficaram antes do cartão ganham destino (M6.1 → M6.3 e M7.2; M2.3 e M4.1 → M5.4; M3.1 → M7.1; M2.5 → M8.1 e M8.3; A1 M9.4 → A2 M2.5; M7.1 e M6.5 → M7.5) e
       *Le vélo est plus rapide en ville.* é trocada (chave nova); exemplo da M3.7 *Je travaille toujours le matin.* (sem *lire*); M9.2 sem *prochain* nem *voir*; N43 e a
       fala *On ne sait pas encore !* da M9.1 sem *savoir* nem *pas encore* (fala nova *On sort ce week-end ?*; N43 com *Je peux pas*; a A2 M6.4 perde esse gancho);
       diálogo da A2 M4.1 só com dores e corpo (a consulta fica na M4.2); exemplos publicados da `A1-g3` e da `A1-g4` reescritos.
     - **Notas repetidas no A2**: opinião completa só na M3.5; M5.1 sem nota de opinião; M10.1 nota breve só com *je pense que*; M8.2 sem *chaque* (cartão do A1 M3.6).
     - **Progresso**: 19 lições publicadas perdem palavras (não 3), listadas na seção 5 do `08 v2` com o destino e o efeito no `STUDY_ITEM_GATE`; Desafios da `A1-16`
       (*gentille*, *pull rouge*, *Ça te va bien !*, *Ça te plaît ?*) entram na lista de reescrita da 132; tabela de re-hospedagem dos ditados por módulo (proposta, pergunta 55).
     - **Contagens e estado**: tempos dos cabeçalhos de M2 (3h25), M6 (3h05) e M9 (3h20) iguais à seção 1; linha das lições (M2.3 é aberto, M1.2 tem a lição de pronúncia);
       M8.2 e M8.3 descrevem o que muda; "Consigo" do M5 diz "reconhecer" celular e e-mail; gatilho da nota *courriel* sem o cartão *le mail*; `notification-cron`
       **v29 publicado em produção (2026-10-19, pela dona, painel)** em todo o `08 v2` e no `CLAUDE.md`.
137. **Pendências de decisão da dona** (da mesma auditoria; **todas respondidas em 2026-10-21 pelas decisões 138 a 146**, não são mais pendências; texto original abaixo, para o histórico):
     (1) regra 13 no A2 e exceções do A1 (M1.2, M2.3; M3.1, M3.3, M4.1 como "fechadas"); (2) *trouver* como cartão na M8.6 (pergunta 61); (3) nota da M6.3 com 15 e 112;
     (4) carga do A1 M1 e M3 (e M9) e do A2 M8 e M10 (pergunta 63); (5) conclusão com paywall: desbloqueio da unidade seguinte e Teste de Nível (pergunta 60). Também:
     M7.3 com dois conceitos, regra "palavra de frase", A2 M1.3 x M1.4, cadeado da gramática na trilha.

---

# Décima sétima rodada (2026-10-21): respostas da dona à auditoria da equidade

Base: `auditoria/2026-10-21-a1-a2-rodada-equidade.md` e as pendências da decisão 137. A dona aprovou **todas** as recomendações do relatório e do editor anterior.
Aplicado em `08-mapa-final-a1-a2-v2.md` (seções 1, 2.1, 3.1, 3.2, 4.2, 5, 6, 7 e 8), `15` (regras 12, 13 e 14), `16` e `00`. Nada aplicado ao site.

138. **Cadeia de desbloqueio com paywall: opção A** (completa a 125; responde a pergunta 60). Para o aluno gratuito, a unidade de gramática (Premium) é **pulada**
     automaticamente na cadeia de desbloqueio: ele passa dela para a unidade seguinte, a gramática aparece com **cadeado** e a trilha continua. Vai para a lista de
     implementação (`08 v2` seções 5 e 7): `markUnitCompleted` e o desbloqueio da próxima unidade (hoje só abre a `idx+1`), `moduleCompleted` / `levelCompleted` em
     função pura (`shared/core/`), `moduleProgressPct` sem a gramática para o gratuito, Ponto de verificação por plano (o Teste de Nível é montado com os Pontos de
     verificação, então fica resolvido por plano junto) e teste. **Não implementar nesta fase.**
139. **Regra 13 (limite de palavras), por nível.** **A1**: no máximo 10 por unidade aberta; exceções aceitas como conjuntos naturais: M1.2 (11, por causa de *le prénom*),
     M3.1 (12), M3.3 (11) e M4.1 (11); conjuntos fechados (números, dias, meses) continuam podendo passar de 10. **A M2.3 é cortada para 10**: *laid* e *brun* vão para a
     nota de vocabulário "Outros traços" (proposta a revisar pela dona; *brun* = cabelo escuro, junto de *châtain* e *roux*); a M2.3 passa a 3 lições + Revisão da unidade;
     M2 com 30 cartões e ~3h15. **A2**: limite de **12** por unidade; a A2 M1.3 "Descrever o caráter" cai de 13 para 12 (o excedente vai para nota de vocabulário).
     A2: **426 cartões** (416 novos + 10 publicados).
140. ***trouver* vira cartão na M8.6** "Pedir ajuda" (M8.6 com 10; M8 com 40 cartões, ~3h05). Responde a pergunta 61. Com a 139, o A1 fica com **343 cartões**
     (344 − 2 da M2.3 + 1).
141. **Números de emergência separados por função.** A nota da M6.3 "Lugares da cidade" fica **só com a cruz verde** da farmácia. **17 (polícia) e 112 (emergência
     europeia, geral)** vão para a A1 M8.6 "Pedir ajuda" (polícia); **15 (SAMU, urgência médica) e 18 (bombeiros)** vão para a A2 M4.3 "Emergências". Função de cada número:
     15 = SAMU (medicina de urgência), 17 = polícia, 18 = bombeiros, 112 = número europeu de emergência (geral, toda a União Europeia). A M8.6 não cita o 15; a A2 M4.3
     não cita o 17 e só cita o 112, sem reensinar. Corrige a 133 neste ponto (o 15 não vem mais do A1).
142. **Carga.** "Serviços e papelada" (`A2-25`) vai do A2 M8 para o **A2 M7**, que passa a **"Trabalho, dinheiro e papelada"** (5 unidades, 4 + 1, ~3h05), na ordem: Falar do
     trabalho; Procurar emprego; Gramática: discurso indireto no presente; Resolver no banco; Serviços e papelada. O A2 M8 fica com 6 unidades (4 + 2, ~3h30): Procurar
     moradia; Dividir apartamento e vizinhos; Gramática: pronome *y*; Trânsito e carro; Entender regras e avisos; Gramática: negação complexa. As palavras de "Serviços e
     papelada" são revistas para banco, trabalho e documentos (lista a revisar pela dona, confiança média: *le formulaire, remplir, signer, le dossier, envoyer, la file
     d'attente, le guichet, la carte d'identité, le permis de conduire, le titre de séjour, le justificatif de domicile, la pièce jointe*; saem *la lettre, le timbre*).
     O *aucun* por diálogo vem com ela (*Je n'ai aucun justificatif de domicile.*), ainda antes da negação complexa. Conferido: *y* (A1 M6.5 e M8.3) e negação complexa (A2 M1.4,
     M2.5, M5.1, M7.5, M8.2 e o anúncio ou a placa no M8) continuam com versão grátis antes, e a ordem nova não usa palavra antes de ensinada (*se garer* da M8.4 continua
     logo antes da M8.5). O A2 M10 fica como está (3h55, último módulo); o A1 M1 (3h35) e o M3 (3h25) ficam. Responde a pergunta 63.
143. **Regra "nota grátis nunca diz que a gramática já mostrou"** confirmada (regra 12 do `15`).
144. **Regra 14 (uma palavra, um cartão) vale também para a mesma forma com sentido novo** (*clair*, *le bureau*): confirmada.
145. **Registro.** As pendências da 137 estão todas respondidas (138 a 144) e saem das listas de pendências (seção 7 do `08 v2` e aqui). Ficam só como registro:
     (a) **M7.3 (g) com dois conceitos** (*il y a* e *c'est* + adjetivo), aceita pela regra 3 ("conceitos muito ligados") com uma tela de contraste (*Il y a un salon.
     C'est un grand salon.*), atendendo o pedido original da dona (decisão 103: gramática sobre *il y a* e *c'est* + adjetivo); (b) **"palavra de frase"** resolvida pela
     regra já existente "frases só com vocabulário visto": a frase com palavra que ainda não é cartão é trocada, sem regra nova.
146. **Próxima etapa.** O mapa A1 + A2 aguarda a **aprovação final da dona**. Depois: a implementação (Etapa 0b parte 2: `fr/scripts/curriculo_ops.js`, camadas por chave,
     operações de unidade que muda de nível, regra de conclusão e desbloqueio por plano) e a escrita do conteúdo **módulo a módulo** (notas grátis, diálogos, frases, telas),
     cada lote com pt-BR e en só depois de aprovado (decisão 81).
147. **A1 M2.3 com 11 cartões** (dona, 2026-10-21): *brun* volta como cartão e nenhuma outra palavra sai (exceção à regra 13); *laid* fica na nota "Outros traços". M2 passa a 31 cartões e o A1 a 344.
148. **Revisão do A2 módulo a módulo** (dona), com as listas de palavras trazidas no corpo da conversa, não por documento. Começa pelo M1.

---

# Décima oitava rodada (2026-10-21): ajustes do A1 e revisão do A2 M1

Base: respostas da dona no corpo da conversa (decisão 148). Aplicado em `08-mapa-final-a1-a2-v2.md` (seções 1, 3.1, 3.2, 4, 5, 6, 7 e 8), `15` (regras 13 e 14), `16` e `00`.
Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

149. **A1 M2.3 "Descrever a aparência"**: na nota de vocabulário "Outros traços" sai *les lunettes* e entra ***beau / belle*** (formas *beau, bel, belle*); *joli* continua
     cartão. A M2.3 continua com 11 cartões (decisão 147).
150. **Erro de digitação "une fois par *semana*"**: o certo é "une fois par ***semaine***" (francês). Conferido por busca em `08`, `12`, `15`, `16` e `00`: nenhuma
     ocorrência de "par semana"; todos os documentos já trazem *une fois par semaine* (o erro estava só na conversa).
151. **Nota nova na A1 M3.6 "Frequência"** sobre *chaque* e os intervalos (Exp, alta; fonte: a dona; faz parte da versão grátis de frequência): *chaque* = "cada" +
     substantivo no **singular** (*chaque jour* = *tous les jours*, *chaque semaine*); "a cada dois meses" = ***tous les deux mois*** (não *chaque deux mois*, que não é a
     formulação natural); "uma vez a cada dois meses" = *une fois tous les deux mois*; "duas vezes por mês" = *deux fois par mois*; a frequência usa *par* (*une fois par
     semaine*). O cartão *chaque* continua e a nota o acompanha. Texto só depois, aprovado pela dona.
152. ***le verre*** continua **um cartão só** (A1 M4.5, "copo"). O sentido "vidro" entra só em nota e frase na A1 M5.4 (*le verre* = vidro; *en verre*, dentro da nota
     *en* + material), sem cartão novo (regra 14).
153. **A2 M1.1 "Contar como era a infância"**: nota nova (Real, alta, breve, gancho *le copain / la copine*): *copain / copine* = amigo(a), mas *mon copain / ma copine*
     (e muitas vezes *un copain* falando de um casal) costuma indicar namorado(a), conforme o contexto; para ser claro, *mon petit ami / ma petite amie*; *mon ami(e)* é
     mais neutro. Texto só depois, aprovado. Na lista, *d'habitude* (já é cartão da A1 M3.6) dá lugar a ***le goûter*** (o lanche da tarde das crianças francesas), que
     fica registrado como candidato a nota cultural breve (Cult, alta).
154. **Ordem do A2 M1 (aceita)**: M1.1 Contar como era a infância; M1.2 Gramática: imperfeito; **M1.3 Comparar antes e agora** (`A2-2`, com a nota do *ne... plus*);
     **M1.4 Descrever o caráter (antes e hoje)** (`A2-35`, que já usa *avant, maintenant, à l'époque*, ensinados na M1.3); M1.5 Contar as fases da vida. Revisa a ordem
     da decisão 120. A versão grátis do *ne... plus* (para a negação complexa, A2 M8.6) passa da M1.4 para a M1.3; o caráter passa a ser a M1.4 em todas as referências
     (`08 v2`, `15`, `16`, `00`). Resolve o ponto "A2 M1.3 x M1.4" que ficara para a nova rodada da auditoria.
155. **Palavras do A2 M1.3 "Comparar antes e agora" (`A2-2`)**: *calme, bruyant, moderne, ancien* **não ganham cartão novo** (já são cartões da A1 M7.2, mesmo sentido;
     regra 14) e continuam nas frases e no diálogo (revisão natural). A unidade fica com 12: *la campagne, le village, le bruit, la vie, changer, avant, maintenant,
     à l'époque* + ***le quartier, la circulation, la nature, les gens*** (proposta a revisar pela dona; sem *tranquille*, sinônimo redundante de *calme*). Na conferência
     da regra 14 (seção 7 do `08 v2`), as três primeiras novas já estão nas listas do `04` de outras unidades do A2 (*le quartier* na M8.1, *la circulation* na M8.4,
     *la nature* na M10.4): achado para a dona decidir.
156. ***sérieux*** fica **só na A2 M1.4** (caráter); a A2 M7.2 "Procurar emprego" usa em frase, sem cartão (fica com 11). A2 M1.1 (com *le goûter*), M1.4 (caráter,
     lista de 12) e M1.5 **aprovadas como estão**. Totais: A2 com **425 cartões** (415 novos + 10 publicados); A1 com **344** (decisão 147); tempos do A2 M1 sem mudança
     (~3h05, 48 cartões). A conferência das demais listas do A2 contra o A1 e entre si (regra 14) ficou só como achados, sem decisão: `08 v2` seção 7, linha "Palavras
     repetidas no A2".

---

# Décima nona rodada (2026-10-22): palavras repetidas no A2 e revisão do A2 M2

Base: respostas da dona no corpo da conversa (decisão 148). Aplicado em `08-mapa-final-a1-a2-v2.md` (seções 1, 3.2, "Saúde", 7 e 8), `15` (regra 14) e `00`.
Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona. As palavras que entram no lugar das que saíram são **proposta a revisar pela dona**.

157. **Deduplicação de palavras (regra 14), aprovada.** O primeiro cartão fica; as demais unidades usam a palavra em frase (ou nota) e **cada unidade que perde um cartão
     ganha uma palavra nova no lugar** (proposta, a revisar pela dona, sem repetir cartões de outras unidades), então nenhuma conta muda:
     - *le quartier, la circulation, la nature* têm cartão na **A2 M1.3** (lista da M1.3 aprovada, decisão 160). Saem da A2 M8.1 "Procurar moradia" (entra *disponible*),
       da A2 M8.4 "Trânsito e carro" (entra *la vitesse*) e da A2 M10.4 "Meio ambiente" (entra *durable*).
     - *blessé / blessée* e *les pompiers* têm cartão na **A2 M2.5**; a A2 M4.3 "Emergências" só reusa em frase. O cartão da M4.3 era o par *se blesser / blessé*: sai inteiro
       (*se blesser* fica em frase, *Il s'est blessé à la jambe.*, por ser a mesma família de *blessé*; a confirmar pela dona) e entram *le malaise* (*faire un malaise*, o "mal
       súbito" do 15) e *saigner*. A nota dos números (15 e 18) continua na M4.3 e usa *les pompiers* já conhecido.
     - *propre* fica na **A1 M7.2**; sai da A2 M8.2 "Dividir apartamento e vizinhos" (entra *passer l'aspirateur*; *sale* continua e *propre* volta em frase).
     - *l'église* fica na **A1 M6.3**; sai da A2 M10.3 "Patrimônio e festas" (entra *le jour férié*).
     - *cher / chère* ("querido", no começo da carta) vira **nota** na A2 M9.3, sem cartão (o cartão *cher* = caro é do A1 M5.3); a M9.3 ganha *souhaiter* no lugar.
     - *la forme* ("forma", cartão da A2 M3.1) e *être en forme* ficam **sem cartão na A2 M4.5**: *être en forme* entra em nota ("estar em forma"; *la forme* da M3.1 com
       sentido novo); a M4.5 ganha *faire de l'exercice* e *grignoter* no lugar das duas.
     - *goûter* (verbo, provar, A2 M5.5) e *le goûter* (lanche, A2 M1.1) **ficam os dois cartões**: lexemas diferentes (verbo e substantivo).
     - Consequência: a frase publicada *La main est blessée.* (A2 M4.1) continua indo com a chave para a M4.3 (decisão 136), agora como reuso em frase (o cartão *blessé* já
       veio na M2.5); como a M2.5 vem antes da M4.1, ela também poderia ficar na M4.1 (a decidir ao escrever o A2 M4).
     - Fica pendente na seção 7 do `08 v2`: *en verre* (A2 M3.1, caso igual ao de *en bois*) e a lista "só para conferir".
158. **A2 M2 "Contar uma experiência": listas aprovadas.** M2.1 (`A2-4`): *le voyage, le séjour, l'avion, l'aéroport, le vol, le paysage, la visite, découvrir,
     inoubliable, rater, faire escale, le décalage horaire*. M2.3 (`A2-5`): *perdre, oublier, tomber en panne, être en retard, la grève, le problème, heureusement,
     malheureusement, soudain, tout à coup, réparer, se tromper*. M2.5 (`A2-6`): *l'accident, le portefeuille, voler, le voleur / la voleuse, le témoin, porter plainte,
     blessé / blessée, l'incendie, les pompiers, se passer, arriver, récemment* (12, com *récemment* publicado). *arriver* é um cartão com os dois sentidos (chegar e
     acontecer); *voler* é um cartão com os dois sentidos (roubar e voar); *le vol* na M2.1 continua só "voo". M2 com 36 cartões, tempo sem mudança (~3h15).
159. **Notas novas do A2 M2 (aprovadas; texto só depois).** M2.5: "*le vol* = voo ou roubo; *voler* = voar ou roubar" (Exp, alta, armadilha lexical; e *arriver* = chegar
     ou acontecer, se couber). M2.3: nota cultural breve sobre *la grève* (Cult, alta): greves de transporte fazem parte do cotidiano (*grève dans les transports*).
     Versões grátis confirmadas: *d'abord, ensuite, puis, enfin* e imperfeito x PC na M2.1; *donc, alors*, *-ment* e *Je l'ai perdue* (com concordância) na M2.3;
     *depuis / pendant* na M2.5.
160. **Revisão do A2 módulo a módulo**: M1 e M2 fechados (com a M1.3 aprovada com *le quartier, la circulation, la nature, les gens*); segue o **M3**.
161. **Contas e registro.** As trocas da 157 são uma por uma: A2 continua com **425 cartões** (415 novos + 10 publicados) e os tempos não mudam (~33h10). A seção 7 do
     `08 v2` fica só com o que ainda é pendência (*en verre* e a lista "só para conferir"); as listas novas que receberam palavras de substituição entram em "Listas de
     palavras a revisar pela dona".

---

# Vigésima rodada (2026-10-22): palavras da deduplicação aprovadas e revisão do A2 M3

Base: respostas da dona no corpo da conversa (decisão 148). Aplicado em `08-mapa-final-a1-a2-v2.md` (seções 1, 3.2, 4, 6, 7, 8 e Resumo), `15` (regra 14) e `00`.
Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

162. **Palavras novas da deduplicação (decisão 157) aprovadas**: A2 M4.3 *le malaise, saigner* (*se blesser* fica **só em frase**, *Il s'est blessé à la jambe.*);
     M4.5 *faire de l'exercice, grignoter*; M8.1 *disponible*; M8.2 *passer l'aspirateur*; M8.4 *la vitesse*; M9.3 *souhaiter* (*cher / chère* = querido em nota);
     M10.3 *le jour férié*; M10.4 *durable*. A frase publicada *La main est blessée.* (com a chave, vinda da A2 M4.1) **fica na M4.3** (fecha o "a decidir ao escrever o M4"
     da 157). O resto da lista da M4.3 se revisa com o A2 M4.
163. **A2 M3 "Objetos e consumo": listas aprovadas.**
     - M3.1 (`A2-7`, 10): *l'objet, la forme, rond / ronde, carré / carrée, le métal, le plastique, léger / légère, lourd / lourde, pratique, servir à*. *en métal* e
       *en plastique* viram frases com *en* + material; os cartões são *le métal* e *le plastique* (no A1 só aparecem na nota "Outros materiais", sem cartão). *en bois* e
       *en verre* só em frase (regra 14: *le bois* é cartão do A1 M5.4 e *le verre* do A1 M4.5; "vidro" e *en verre* em nota na A1 M5.4, decisão 152). **Fecha a pendência
       *en verre*** (seção 7 do `08 v2`) e tira *en métal, en plastique* da lista "só para conferir".
     - M3.3 (`A2-8`, 12): *la livraison, livrer, le colis, rembourser, le remboursement, échanger, le ticket de caisse, abîmé / abîmée, marcher* (funcionar),
       *la réclamation, le service client, cordialement* (*en ligne* vira frase).
     - M3.5 (`A2-9`, 12): *d'occasion, le vide-grenier, vendre, jeter, garder, utile, inutile, gaspiller, le gaspillage, la marque, la qualité, la mode*.
     - Conferido contra o A1 e as outras listas do A2 (regra 14): nenhuma dessas palavras já é cartão em outra unidade.
     - **Contas**: a M3.1 passa de 11 (12 do `04` menos *en bois*) para **10**; A2 com **424 cartões** (414 novos + 10 publicados); M3 com 34 cartões. O tempo não muda
       (a estimativa conta ~40 min por unidade de vocabulário de até 12 palavras): M3 continua ~3h15 e o A2 ~33h10.
164. **Ordem das gramáticas do A2 M3**: M3.1 Descrever um objeto; M3.2 Gramática: relativos *qui, que, où*; M3.3 Comprar on-line e reclamar; **M3.4 Gramática:
     pronomes demonstrativos e *lequel*** (versão grátis na M3.3, gancho *Je prends celui-ci*; a nota *ce, cette, ces* do A1 M5.3 é a base); M3.5 Opinar sobre o consumo;
     **M3.6 Gramática: superlativo** (versão grátis na M3.5, gancho *le meilleur rapport qualité-prix*; o comparativo do A1, nota grátis da M7.2 e gramática da M7.6, é a
     base). Os ids internos não mudam (`A2-g7` superlativo, `A2-g8` demonstrativos); só trocam as posições. Antes: superlativo na M3.4 (gancho *le moins cher*, M3.3) e
     demonstrativos na M3.6 (gancho *celui-ci ou celui-là ?*, M3.5).
165. **Notas culturais novas no A2 M3 (aprovadas; texto só depois)**: *les soldes* na M3.3 (Cult, alta): liquidações regulamentadas na França, duas por ano (inverno e
     verão); *le vide-grenier* na M3.5, junto do cartão (Cult, alta): feira popular de troca e venda de usados. A nota de opinião completa do A2 (*je trouve que, à mon
     avis*) **fica** na M3.5.
166. **Revisão do A2 módulo a módulo**: M1, M2 e M3 fechados; segue o **M4**.

---

# Vigésima primeira rodada (2026-10-22): revisão do A2 M4 "Saúde e bem-estar"

Base: respostas da dona no corpo da conversa (decisão 148). Aplicado em `08-mapa-final-a1-a2-v2.md` (seções 1, 3.2, "Saúde", 7 e Resumo), `15` (regra 14) e `00`.
Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

167. **A2 M4: listas aprovadas.**
     - M4.1 (`A1-15`, vinda do A1, 11): *la tête, le ventre, la main, le pied, malade, avoir mal, la fièvre, se sentir* (8 chaves publicadas) + *la gorge, la dent,
       se reposer* (3 chaves novas, decisão 130).
     - M4.2 "Na consulta" (`A2-10`, 12): *le rendez-vous, l'ordonnance, le médicament, le comprimé, la douleur, tousser, le rhume, la grippe, se faire mal, allergique,
       guérir, la carte Vitale*.
     - M4.3 "Emergências" (`A2-11`, 12): *le bras, la jambe, le dos, le cœur, se casser, grave, les urgences, l'ambulance, le SAMU, le pansement, le malaise, saigner*.
       *blessé / blessée* e *les pompiers* só em frase (cartões da A2 M2.5, decisão 157); *se blesser* só em frase (decisão 162); *le dentiste* fica fora das listas do M4
       (sem cartão; fecha o "destino a revisar" que estava na A2 M4.3 do `08 v2`).
     - Conferido (regra 14): nenhuma dessas palavras é cartão em outra unidade do A1 ou do A2. *la carte Vitale* continua na lista "só para conferir" da seção 7 do `08 v2`
       (expressão que contém o cartão *la carte* do A1, sem ser a mesma palavra-cartão).
168. **A2 M4.5 só hábitos saudáveis.** Saem *le match, l'équipe, gagner*: esporte de competição é lazer, e *gagner* repetiria o sentido de "ganhar dinheiro" do A2 M7.
     Entram ***se détendre*** e ***la santé***. Lista da M4.5: *courir, nager, la salle de sport, l'entraînement, le sommeil, le stress, équilibré / équilibrée, faire de
     l'exercice, grignoter, se détendre, la santé* (11) + **12ª palavra proposta: *l'alimentation*** (alimentação; *une alimentation équilibrée*, que junta com
     *équilibré* da própria lista; **a revisar pela dona**; se ela preferir, a unidade fica com 11). *être en forme* continua em nota (decisão 157).
     - Conferido (regra 14), no A1 e no A2 (`08 v2`, `04`, `08-revisao-por-funcao-comunicativa.md` e `fr/content.js`): *se détendre* e *l'alimentation* não aparecem em
       nenhuma lista nem no conteúdo publicado; *la santé* não é cartão em nenhuma unidade (cartão **só aqui**). *se reposer* (A2 M4.1) é outro verbo, sem conflito.
     - **Achado para a dona**: *la santé* já aparece em **2 frases publicadas do A1**, antes do cartão: *Les légumes sont bons pour la santé.* (`A1-11`, A1 M4.2) e
       *Le sport est bon pour la santé.* (`A1-19`, A1 M9.1). Pela regra "frases só com vocabulário visto" (regra 11 do `15`, decisão 145) elas seriam trocadas na
       reescrita do A1, ou aceitas como exceção (a frase vira revisão natural no A2). Fica na seção 7 do `08 v2` para decidir.
169. **Nota cultural nova na A2 M4.2** (Cult, alta; texto só depois, aprovado pela dona): a *carte Vitale* e o *médecin traitant* (o médico de família que a pessoa
     declara), como a consulta funciona na França (marcar *un rendez-vous*, pagar e ser reembolsado) e o reembolso pela *Sécurité sociale* com a *carte Vitale*.
     Vai junto do cartão *la carte Vitale*.
170. **A2 M4 fechado**; segue o **M5** (À mesa).
     - **Contas**: M4.1 11, M4.2 12, M4.3 12, M4.5 12 (com *l'alimentation*, proposta) = **47 cartões**; na M4.5 saem 3 e entram 2 + a 12ª proposta (a M4.2 e a M4.3
       já eram contadas com 12), então o A2 continua com **424 cartões** (414 novos + 10 publicados); se a dona ficar com 11 na M4.5, **423** (413 + 10). O tempo não muda:
       M4 ~3h30 (4 unidades de vocabulário × ~40 min + 2 gramáticas × ~25 min); A2 ~33h10.
     - **Versão grátis** (coluna do `08 v2`): M4.2 abriga a do COI (M4.4, gancho *Le médecin lui donne une ordonnance*); M4.5 abriga a do condicional (M4.6, gancho
       *Tu devrais dormir plus*). Sem mudança de posição.
     - Pendências limpas: a lista da A2 M4.3 sai de "Listas de palavras a revisar pela dona" (seção 7 do `08 v2`); entram lá só a 12ª palavra da M4.5 e o achado de
       *la santé* nas frases publicadas do A1.

---

# Vigésima segunda rodada (2026-10-22): *l'alimentation*, *pour la santé* e revisão do A2 M5 "À mesa"

Base: respostas da dona no corpo da conversa (decisão 148). Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.2, "Saúde", 7, 8 e Resumo), `15`
(regras 11 e 14) e `00`. Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

171. **A2 M4.5: *l'alimentation* aceita como 12ª palavra** (aprovada pela dona; fecha a proposta da decisão 168). A M4.5 fica com 12 e o A2 com **424 cartões** (414 novos
     + 10 publicados), que já contava com ela; some o "423 se a M4.5 ficar com 11". A unidade é **renomeada "Hábitos saudáveis"** (era "Esporte e hábitos saudáveis"):
     o título diz o que a unidade ensina depois da decisão 168 (sem esporte de competição).
     - ***pour la santé* nas frases publicadas do A1** (achado da decisão 168): *Les légumes sont bons pour la santé.* (`A1-11`, A1 M4.2) e *Le sport est bon pour la
       santé.* (`A1-19`, A1 M9.1) **ficam como estão**, com *pour la santé* tratado como **expressão fixa** (o aluno entende o bloco "faz bem à saúde" pela tradução da
       frase, sem cartão). O cartão *la santé* continua **só na A2 M4.5**, onde a palavra é ensinada e a expressão vira revisão natural.
     - É uma **exceção formal** à regra "frases só com vocabulário visto" (regra 11 do `15`, decisão 145): **expressão fixa aceita pela dona** pode aparecer em frase antes
       do cartão da palavra que a contém. Registrada no `15` dentro da regra 11 (sem regra nova solta). Vale só para expressão fixa com decisão da dona, caso a caso;
       palavra solta continua sendo trocada.
172. **A2 M5 "À mesa": listas aprovadas.**
     - M5.1 "Reservar e pedir no restaurante" (`A2-13`, 12): *la réservation, le plat du jour, la spécialité, saignant, à point, bien cuit, le pourboire, délicieux,
       fade, salé, sucré, épicé* (a lista do `04` 6.3, sem mudança).
     - M5.3 "Explicar uma receita" (`A2-14`, 12): *la recette, couper, mélanger, cuire, ajouter, faire bouillir, la poêle, le four, la casserole, la cuillère,
       l'ingrédient, la farine* (a lista do `04` 6.3, sem mudança).
     - M5.5 "Descrever sabores" (`A2-15`, 12): *le goût, goûter, l'odeur, sentir* (cheirar), *doux / douce, amer / amère, acide, croustillant / croustillante, moelleux /
       moelleuse, avoir l'air* + ***tendre*** e ***juteux*** (entram no lugar de *toucher* e *le parfum* do `04`: a unidade fica no gosto, na textura e no cheiro da comida).
     - **Conferência da regra 14** (A1 e A2, no `08 v2`, no `04`, no `08-revisao-por-funcao-comunicativa.md` e em `fr/content.js`):
       - *tendre* e *juteux*: não são cartão nem aparecem em nenhuma lista nem no conteúdo publicado (*tendre* só aparece dentro de *se détendre*, A2 M4.5, outro verbo).
         Sem conflito.
       - *sentir* (cheirar, A2 M5.5) x *se sentir* (sentir-se, cartão da A2 M4.1, chave publicada `A1-15-v9`): **mesma forma, verbos diferentes**, então ficam os dois
         cartões (como *goûter* e *le goûter*, decisão 157). Na M5.5 entra uma **nota** (Exp, alta, *nova*, *breve*): *Ça sent bon.* (cheira bem) x *Je me sens bien.*
         (eu me sinto bem); com o *se*, é como a pessoa está; sem o *se*, é o cheiro. A A2 M9.5 continua usando *se sentir* só em frase e nota (decisão 136).
       - Lexemas diferentes da mesma família, com os dois cartões (vão para a lista "só para conferir" da seção 7 do `08 v2`): *la réservation* (A2 M5.1) x *réserver*
         (A1 M8.3); *salé* x *le sel* e *sucré* x *le sucre* (A1 M4.2); *bien cuit* (ponto da carne, A2 M5.1) x *cuire* (A2 M5.3); *avoir l'air* (A2 M5.5) contém o
         cartão *avoir* do A1. *le plat du jour* já estava na lista (A1 *le plat*).
       - *trop* e *assez* (nota de intensidade da M5.1, decisão 173) não são cartão novo: os cartões do A1 são *trop de, assez de* + nome (A1 M4.3, quantidade); a nota
         mostra o uso com adjetivo (*trop salé*), que já aparece na frase publicada *Le pantalon est trop grand.* (`A1-10`, A1 M5.3).
     - **Achado para a dona** (palavras do A2 M5.1 em frases publicadas do A1, antes do cartão; mesmo caso da *la santé*, decisão 171): *délicieux* em *Le pain est
       délicieux.* (`A1-5`, A1 M4.1, onde também há a nota nova *c'est bon, c'est délicieux*) e *Le poulet est délicieux ce soir.* (`A1-11`, A1 M4.2); *sucrée* em
       *La pomme est rouge et sucrée.* (`A1-5`, vai com a chave para a A1 M5.4, decisão 136); *cuit* em *L'œuf est cuit.* (`A1-11`, A1 M4.2; o cartão do verbo é *cuire*,
       A2 M5.3). Opções: trocar as frases na reescrita do A1 (regra 11) ou aceitar como exceção da decisão 171 (só se a dona considerar *c'est délicieux* uma fórmula).
       Fica na seção 7 do `08 v2`, a decidir.
173. **Nota de intensidade (*assez, plutôt, trop*) vai da M5.5 para a M5.1** (Exp, n/r, *nova*): serve para reclamar do prato (*C'est trop salé.*, *C'est un peu fade.*),
     com as palavras da própria M5.1. Na M5.5 fica só a nota *de plus en plus de* + nome. A nota de intensidade não é versão grátis de nenhuma gramática (vem da `A2-g14`,
     que virou nota, decisão 136 e `10`); a coluna "Versão grátis" não muda: a M5.1 continua abrigando a versão grátis da M5.2 (*en*, gancho *J'en voudrais deux*) e da
     M8.6 (*ne... que*), a M5.3 a da M5.4 (gancho *Mélangez-les*) e a M5.5 nenhuma. **Ordem de aparição proposta na M5.1** (segue a cena do restaurante; a confirmar
     ao escrever as lições): reservar e pedir (*les points de cuisson*, decisão 174; *J'en voudrais deux*; *ne... que*), reclamar do prato (intensidade) e pagar (*le
     pourboire / service compris*, decisão 174).
174. **Notas culturais novas do A2 M5.1 (aprovadas; texto só depois, aprovado pela dona)**:
     - *le pourboire / service compris* (Cult, alta): na França a gorjeta é opcional; o serviço já vem incluído na conta (*service compris*). Junto do cartão *le pourboire*.
     - **os pontos da carne** *bleu, saignant, à point, bien cuit* (Exp, alta): como pedir a carne e o que cada ponto quer dizer (*bleu* = quase crua, só em nota: *bleu* já é
       cartão do A1 M2.3 como cor e aqui ganha sentido novo, regra 14; os três outros são cartões). Junto dos cartões *saignant, à point, bien cuit*.
     - Com elas, a M5.1 tem 4 notas: *ne... que*, intensidade, *pourboire* e pontos da carne.
175. **A2 M5 fechado**; segue o **M6** (Estudos e projetos).
     - **Contas**: M5.1 12, M5.3 12, M5.5 12 = **36 cartões** (as trocas da M5.5 são uma por uma); A2 com **424 cartões** (414 novos + 10 publicados), sem mudança. O tempo
       não muda: M5 ~2h50 (3 unidades de vocabulário × ~40 min + 2 gramáticas × ~25 min); A2 ~33h10.
     - Notas do A2: ~49 (+2 culturais da M5.1, decisão 174; +1 nota *sentir* x *se sentir* na M5.5, decisão 172; a intensidade só muda de unidade).
     - **Pendências limpas** (seção 7 do `08 v2`): sai a 12ª palavra da M4.5 de "Listas de palavras a revisar pela dona" (decisão 171); a linha "*la santé* em frases
       publicadas do A1" vira decidida (exceção da decisão 171, nada a trocar); entra o achado de *délicieux, sucrée, cuit* (decisão 172).

---

# Vigésima terceira rodada (2026-10-22): *délicieux, cuit, sucré* no A1 e revisão do A2 M6 "Estudos e projetos"

Base: respostas da dona no corpo da conversa (decisão 148), aprovadas em 2026-10-22. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.2, 7, 8 e
Resumo), `15` (regras 11 e 14) e `00`. O `16` não cita nada desta rodada. Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

176. ***délicieux, cuit, sucré* nas frases publicadas do A1 ficam como estão** (fecha o achado da decisão 172): *Le pain est délicieux.* (`A1-5`, A1 M4.1), *Le poulet est
     délicieux ce soir.* e *L'œuf est cuit.* (`A1-11`, A1 M4.2) e *La pomme est rouge et sucrée.* (`A1-5`, vai com a chave para a A1 M5.4, decisão 136) são aceitas pela
     **exceção formal da regra 11** do `15` (decisão 171), estendida pela dona a **adjetivo ou expressão de uso comum** que o aluno entende pela tradução da frase. Os cartões
     continuam no A2 (*délicieux, sucré* na A2 M5.1; *cuire* na A2 M5.3; *cuit* aparece no cartão *bien cuit*, A2 M5.1), onde a palavra é ensinada e a frase vira revisão
     natural. A nota nova *c'est bon, c'est délicieux* da A1 M4.1 fica. Vale caso a caso, com decisão da dona; palavra solta sem decisão continua sendo trocada. A pendência
     sai da seção 7 do `08 v2`.
177. **A2 M6 "Estudos e projetos": listas aprovadas.**
     - M6.1 "Contar a formação" (`A2-16`, 12): *les études, la fac, le lycée, le diplôme, l'examen, réussir, échouer, le stage, la formation, s'inscrire, la matière*
       (disciplina) + ***le bac*** (no lugar de *la note* do `04` 6.3; a nota escolar aparece **só em frase**, ex.: *J'ai eu une bonne note à l'examen.*).
     - M6.3 "Falar do aprendizado de línguas" (`A2-17`, 12): *apprendre, la langue étrangère, le cours, le niveau, le vocabulaire, la prononciation, l'accent, la faute,
       bilingue, l'échange, progresser, réviser* (a lista do `04` 6.3, sem mudança).
     - M6.5 "Projetos e sonhos" (`A2-18`, 12): *le projet, le rêve, rêver de, l'avenir, espérer, avoir envie de, un jour, plus tard, prochain / prochaine, décider de,
       réaliser, le but* (a lista do `04` 6.3, sem mudança).
     - **Conferência da regra 14** (A1 e A2, no `08 v2`, no `04`, no `08-revisao-por-funcao-comunicativa.md` e em `fr/content.js`): **nenhuma palavra sai**, então não há
       substituta a propor.
       - *prochain / prochaine*: **não é cartão do A1** em nenhuma unidade (decisão 136 já registrava "sem *prochain* nem *voir*, que não são cartão"); fica na M6.5.
         **Achado para a dona** (mesmo caso das decisões 171 e 176): a palavra aparece antes do cartão na frase publicada *La semaine prochaine, je pars en voyage.*
         (`A1-7-p5`, A1 M3.3; a frase também usa *partir*, cartão da A1 M8.1, e *en voyage*, com o cartão *le voyage* da A2 M2.1) e no quadro da gramática A1 M8.4
         (`A1-g20`, *demain, ce soir, la semaine prochaine*). Opções: aceitar *la semaine prochaine* como expressão fixa (exceção da regra 11) ou trocar a frase e o exemplo
         na reescrita do A1. Fica na seção 7 do `08 v2`, a decidir.
       - *s'inscrire*: cartão **só na A2 M6.1**. A A2 M7.5 "Serviços e papelada" (lista ainda a revisar pela dona) não tem *s'inscrire*; se precisar do verbo
         (inscrever-se num serviço), usa em frase.
       - *le stage*: não aparece em nenhuma outra lista (a A2 M7.2 tem *le CV, l'expérience, la compétence...*, sem *le stage*) nem no publicado. Sem conflito.
       - *la matière*: cartão só aqui, no sentido de **disciplina escolar**. A "matéria" da A2 M3.1 é só a função da unidade ("forma, matéria, função"), sem cartão
         *la matière*; os cartões de material de lá são *le métal, le plastique* (decisão 163). Mesma forma com outro sentido ("material"): se a M3.1 usar, é só em
         frase (regra 14). Sem conflito.
       - *réviser*: não aparece em nenhuma outra lista nem no publicado. Sem conflito.
       - Demais palavras do M6 (*le bac, l'examen, le lycée, la fac, le cours, le niveau, l'accent, la faute, le projet, le rêve, l'avenir, un jour, plus tard, le but*...):
         nenhuma é cartão em outra unidade nem aparece no publicado (só *Tu as des projets pour le week-end ?*, fala `A1-19-d0` da A1 M9.1, com *le projet* antes do
         cartão: frase de conversa comum, entra na mesma lista de achados da seção 7).
       - Lexemas diferentes da mesma família, com os dois cartões (vão para a lista "só para conferir" da seção 7 do `08 v2`): *les études* (A2 M6.1) x *l'étudiant /
         l'étudiante* (A1 M1.6); *l'échange* (intercâmbio, A2 M6.3) x *échanger* (trocar, A2 M3.3); *le rêve* x *rêver de* (os dois na A2 M6.5, como no `04`);
         *la langue étrangère* (A2 M6.3) contém *la langue*, que não é cartão no A1.
178. **Notas novas do A2 M6 (aprovadas; texto só depois, aprovado pela dona)**:
     - M6.1, nota cultural (Cult, alta): **o sistema escolar francês** (*le lycée, le bac, la fac, les grandes écoles*): o *lycée* termina com o *bac*, que dá acesso à
       *fac*; as *grandes écoles* são um caminho à parte, seletivo. Junto do cartão *le bac*.
     - M6.1, nota de realidade (Real, alta): ***la fac*** = a universidade, no registro informal (*Je suis à la fac.*; a forma completa é *la faculté* / *l'université*).
       Junto do cartão *la fac*.
     - M6.3, nota cultural (Cult, alta): **os níveis do Quadro Europeu (A1 a C2) e o DELF**: o que o aluno estuda aqui corresponde ao DELF A2. Junto do cartão *le niveau*.
     - Ficam as versões grátis do M6 (coluna "Versão grátis" do `08 v2`, sem mudança de posição): M6.1 abriga a da M6.2 (futuro simples, gancho *Je serai médecin*); M6.3
       a da M6.4 (*savoir* x *connaître*, gancho *Je sais parler anglais / Je connais Paris*); M6.5 a da M6.6 (*quand* e *si*, gancho *Si j'ai le temps, je...*), com as
       notas já previstas de desejo (*j'aimerais, j'espère que*) e verbo + *de* + infinitivo.
179. **A2 M6 fechado**; segue o **M7** (Trabalho, dinheiro e papelada).
     - **Contas**: M6.1 12, M6.3 12, M6.5 12 = **36 cartões** (a troca da M6.1 é uma por uma); A2 com **424 cartões** (414 novos + 10 publicados), sem mudança. O tempo
       não muda: M6 ~3h15 (3 unidades de vocabulário × ~40 min + 3 gramáticas × ~25 min); A2 ~33h10.
     - Notas do A2: ~52 (+3 da decisão 178: sistema escolar e *la fac* na M6.1, níveis e DELF na M6.3).
     - **Pendências limpas** (seção 7 do `08 v2`): sai o achado de *délicieux, sucrée, cuit* (decidido pela 176); em "Listas de palavras a revisar pela dona", o A2 M6 entra
       como aprovado; entra o achado de *prochain* e *le projet* em frases publicadas do A1 (decisão 177).

---

# Vigésima quarta rodada (2026-10-22): *prochain* e *le projet* no A1 e revisão do A2 M7 "Trabalho, dinheiro e papelada"

Base: respostas da dona no corpo da conversa (decisão 148), aprovadas em 2026-10-22. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.2, 6, 7, 8 e
Resumo), `15` (regras 11 e 14) e `00`. O `16` não cita nada desta rodada (a tabela de negação complexa do `08 v2` mantém *aucun* na M7.5). Nada aplicado ao site. Os textos
das notas novas só se escrevem depois, aprovados pela dona.

180. ***prochain* e *le projet* nas frases publicadas do A1 ficam** (fecha o achado da decisão 177): *La semaine prochaine, je pars en voyage.* (`A1-7-p5`, A1 M3.3), o
     quadro da gramática A1 M8.4 (`A1-g20`: *demain, ce soir, la semaine prochaine*) e a fala *Tu as des projets pour le week-end ?* (`A1-19-d0`, A1 M9.1) são aceitos
     como **expressão de uso comum** pela exceção formal da regra 11 do `15` (decisões 171 e 176, como *délicieux*). Os cartões *prochain / prochaine* e *le projet*
     continuam na A2 M6.5, onde as palavras são ensinadas e as frases viram revisão natural. A pendência sai da seção 7 do `08 v2`.
     - Fica registrado, sem decisão nova: a frase `A1-7-p5` também usa *partir* (cartão da A1 M8.1, depois da M3.3) e *en voyage* (o cartão *le voyage* é da A2 M2.1).
       A 180 trata só de *prochain*; esses dois pontos entram na auditoria pedagógica completa antes da implementação (regra 11), que decide trocar a frase ou levá-la.
181. **A2 M7 "Trabalho, dinheiro e papelada": listas aprovadas.**
     - M7.1 "Falar do trabalho" (`A2-19`, 12): *le / la collègue, le / la chef, le salaire, l'emploi, le poste, le contrat, la réunion, les congés, à temps plein,
       à temps partiel, le boulot, embaucher* (a lista do `04` 6.3, sem mudança). *les congés* tem a nota cultural *congés payés* (1936) na A1 M8.3: aqui **só o cartão**,
       sem nota nova.
     - M7.2 "Procurar emprego" (`A2-20`, 11): *le CV, la lettre de motivation, l'offre d'emploi, postuler, l'entretien, le candidat / la candidate, l'expérience,
       la compétence, motivé / motivée, le chômage, démissionner* (*sérieux* só em frase: o cartão é da A2 M1.4, decisão 156).
     - M7.4 "Resolver no banco" (`A2-22`, 12): *le compte, la carte bancaire, le distributeur, retirer, le code, le virement, dépenser, économiser, les économies, prêter,
       emprunter* + ***le RIB*** (12ª palavra nova; *la banque* só em frase, é cartão do A1 M6.3, decisão 133). *prêter* x *emprunter*: nota breve de contraste (decisão 182).
     - M7.5 "Serviços e papelada" (`A2-25`, 12): *le formulaire, remplir, signer, le dossier, envoyer, la file d'attente, le guichet, la carte d'identité, le permis de
       conduire, le titre de séjour, le justificatif de domicile, la pièce jointe* (a lista revista pela decisão 142, agora aprovada; *la poste, la mairie* só em frase,
       cartões do A1 M6.3; *s'inscrire* só em frase, cartão da A2 M6.1, decisão 177).
     - **Conferência da regra 14** (A1 e A2, no `08 v2`, no `04` e em `fr/content.js`; nenhuma das 47 palavras aparece no conteúdo publicado):
       - *la pièce jointe*: a 1ª unidade com cartão é a **A2 M7.5**. A A2 M9 (M9.3 "Escrever para convidar, recusar e agradecer" e M9.6 "Internet e redes", lista do `04`
         6.3: *le réseau social, publier, la publication, le commentaire, commenter, s'abonner, le lien, télécharger, le mot de passe, l'appli, l'écran, l'ordinateur*)
         **não tem *la pièce jointe* como cartão**: lá ela só aparece em frase (e-mail com anexo). Nenhuma unidade perde cartão.
       - *le permis de conduire*: a 1ª unidade com cartão é a **A2 M7.5**. A A2 M8.4 "Trânsito e carro" (lista aprovada pela decisão 162) **não tem *le permis de
         conduire***: lá ele só aparece em frase. Nenhuma unidade perde cartão. *le permis de conduire* x *conduire* (A2 M8.4) são lexemas diferentes (já estava na lista
         "só para conferir").
       - Como nenhuma unidade perde cartão, **não há palavra substituta a propor**.
       - *le poste* (cargo, A2 M7.1) x *la poste* (correio, cartão do A1 M6.3): gêneros e sentidos diferentes, dois cartões, com nota (decisão 182); já estava na lista
         "só para conferir".
       - *le code* (A2 M7.4, a senha do cartão) x *le code postal* (só em nota na A1 M7.1, sem cartão): sem conflito; vai para a lista "só para conferir".
       - *la carte bancaire, la carte d'identité* contêm o cartão *la carte* do A1 (já na lista "só para conferir", como *la carte Vitale*).
       - *le boulot* x *le travail* (cartão da A1 M1.6): palavras diferentes, dois cartões, com nota de registro (decisão 182).
       - Lexemas diferentes da mesma família, com os dois cartões (vão para a lista "só para conferir"): *l'emploi* x *l'offre d'emploi* (as duas na A2 M7, *l'offre
         d'emploi* contém *l'emploi*); *économiser* x *les économies* (os dois na A2 M7.4); *prêter* x *emprunter* (sentidos opostos, com nota).
182. **Notas novas do A2 M7 (aprovadas; texto só depois, aprovado pela dona)**:
     - M7.1, nota de realidade (Real, alta): ***le boulot*** = "trabalho", informal (*J'ai trouvé un boulot.*); o verbo informal é *bosser*; *le travail* é o neutro
       (cartão da A1 M1.6). Junto do cartão *le boulot*. Responde em parte a pergunta 46 do `08 v2` (gíria familiar a partir do A2).
     - M7.1, nota de explicação (Exp, alta): ***le poste* x *la poste***: *le poste* = cargo, vaga (*un poste de vendeur*); *la poste* = o correio (cartão do A1 M6.3);
       a mesma escrita com gênero diferente muda o sentido. Junto do cartão *le poste*.
     - M7.4, nota cultural (Cult, alta): ***le RIB* e a *carte bancaire***: como se paga e se recebe na França: o *RIB* (*relevé d'identité bancaire*, os dados da conta)
       é pedido para receber salário, pagar aluguel e contas; paga-se quase tudo com cartão de débito, muitas vezes *sans contact*; o cheque está em desuso. Junto do
       cartão *le RIB*.
     - M7.4, nota de explicação (Exp, alta, *breve*): ***prêter* x *emprunter***: *prêter* = emprestar a alguém (*Je te prête mon livre.*); *emprunter* = pegar
       emprestado (*J'emprunte de l'argent à la banque.*). Junto do 2º cartão do par.
     - M7.5, nota cultural (Cult, alta): ***le justificatif de domicile***: o comprovante de endereço, pedido em quase todo trâmite na França (abrir conta, título de
       residência, matrícula); normalmente uma conta de luz, água ou internet com menos de 3 meses; explica o que vai no *dossier*. Junto do cartão.
     - **Versões grátis mantidas** (coluna "Versão grátis" do `08 v2`, sem mudança de posição): a M7.2 abriga a da M7.3 (discurso indireto, gancho *Il dit que...*);
       a M7.5 abriga a de *aucun* da M8.6 (diálogo *Je n'ai aucun justificatif de domicile.*). A M7.1 e a M7.4 não abrigam nenhuma.
183. **A2 M7 fechado**; segue o **M8** (Moradia e cidade).
     - **Contas**: M7.1 12, M7.2 11, M7.4 12, M7.5 12 = **47 cartões** (+1 por *le RIB*: a M7.4 era contada com 11, sem *la banque*); A2 com **425 cartões** (415 novos
       + 10 publicados). O tempo não muda: M7 ~3h05 (4 unidades de vocabulário × ~40 min + 1 gramática × ~25 min); A2 ~33h10.
     - Notas do A2: ~57 (+5 da decisão 182).
     - **Pendências limpas** (seção 7 do `08 v2`): sai o achado de *prochain* e *le projet* (decidido pela 180); em "Listas de palavras a revisar pela dona", a A2 M7.5
       sai das abertas e o A2 M7 entra como aprovado; a lista "só para conferir" ganha *le code* x *le code postal*, *l'emploi* x *l'offre d'emploi*, *économiser* x
       *les économies*, *prêter* x *emprunter*, *le boulot* x *le travail*.

---

# Vigésima quinta rodada (2026-10-22): revisão do A2 M8 "Moradia e cidade"

Base: respostas da dona no corpo da conversa (decisão 148), aprovadas em 2026-10-22. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 3.2, 7, 8 e
Resumo), `15` (regra 14), `16` (item 4) e `00`. Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

184. **A2 M8 "Moradia e cidade": listas aprovadas.**
     - M8.1 "Procurar moradia" (`A2-23`, 12): *louer, le loyer, l'annonce, l'agence immobilière, meublé / meublée, les charges, la caution, le / la propriétaire,
       le / la locataire, lumineux / lumineuse, l'ascenseur, disponible* (com *disponible*, decisões 157 e 162; *le quartier* só em frase, cartão da A2 M1.3).
     - M8.2 "Dividir apartamento e vizinhos" (`A2-24`, 12): *la colocation, le / la colocataire, le voisin / la voisine, partager, faire le ménage, faire la vaisselle,
       sortir les poubelles, ranger, sale, déranger, se plaindre, passer l'aspirateur* (com *passer l'aspirateur*, decisões 157 e 162; *propre* só em frase, em contraste
       com *sale*, cartão da A1 M7.2).
     - M8.4 "Trânsito e carro" (`A2-26`, 12): *la route, l'autoroute, le bouchon, conduire, le feu, le carrefour, le parking, se garer, l'essence, le péage,
       le covoiturage, la vitesse* (com *la vitesse*, decisões 157 e 162; *la circulation* só em frase, cartão da A2 M1.3; *le permis de conduire* só em frase, cartão
       da A2 M7.5, decisão 181).
     - M8.5 "Entender regras e avisos" (`A2-21`, 12), **revista como cidade e aprovada** (sai o "a revisar"): *le panneau, l'avis, interdit / interdite,
       autorisé / autorisée, obligatoire, avoir le droit de, respecter, l'amende, fumer, traverser, le passage piéton, la pelouse*.
     - ***lumineux / lumineuse*** tem cartão **só na A2 M8.1**. **A A1 M7.2 "Descrever a moradia" fica como está** (*moderne, ancien, calme, bruyant, confortable,
       propre*, 6; *clair* = "iluminado" só em frase e nota, decisão 133): a dona aceitou a recomendação de **não acrescentar *lumineux*** lá, e ***spacieux* também não
       entra** (conferido: *spacieux* não aparece em nenhum documento do currículo nem em `fr/content.js`; *lumineux* só na A2 M8.1, no `04` e como exemplo de som do
       `06`, A2-S8 semivogais, no A2 m8).
     - **Conferência da regra 14** (A1 e A2, no `08 v2`, no `04` e em `fr/content.js`): **nenhuma das 48 palavras é cartão em outra unidade**, então nenhuma sai e não
       há substituta a propor. *fumer* tem cartão só aqui (o exemplo *Avant je fumais...* já tinha saído da A2 M1.3, decisão 136).
       - **Achado para a dona** (mesmo caso das decisões 171, 176 e 180): a frase publicada ***La voiture est garée devant la maison.*** (`A1-14`, vai com a chave para
         a A1 M7.5, decisão 136) usa *garée* antes do cartão *se garer* (A2 M8.4). Opções: aceitar como expressão de uso comum (exceção formal da regra 11 do `15`) ou
         trocar a frase na reescrita do A1. Fica na seção 7 do `08 v2`, a decidir. Nenhuma outra palavra do M8 aparece no conteúdo publicado.
       - Só para conferir (não é a mesma palavra-cartão; vão para a lista da seção 7 do `08 v2`): *l'avis* (aviso, A2 M8.5) x *à mon avis* (só nota da A2 M3.5, sem
         cartão); *louer, le loyer, le / la locataire* (os três na A2 M8.1) e *la colocation* x *le / la colocataire* (os dois na A2 M8.2): lexemas diferentes da mesma
         família; *faire le ménage, faire la vaisselle* (A1 *faire*), *avoir le droit de* (A1 *avoir*): expressões que contêm um cartão anterior; *sale* (sujo) x
         *la salle de bain* (A1 M7.1): palavras diferentes. *le feu* x *le feu d'artifice* e *sortir les poubelles* (A1 *sortir*) já estavam na lista.
185. **Nota nova de *ni... ni* na A2 M8.5** (Exp, alta, *nova*; texto só depois, aprovado pela dona; exemplos da dona: *Ni fumer ni manger ici*, *Ni cris ni musique après
     22h*): é a **versão grátis que faltava** da gramática de negação complexa (M8.6) para *ni... ni*. A coluna "Versão grátis" passa a dizer que a M8.5 abriga a versão
     grátis da M8.6 (*ni... ni*), e a tabela "Negação complexa: onde aparece antes" fica completa, na ordem da trilha: *ne... plus* M1.3; *rien* M2.5; *ne... que* M5.1;
     *aucun* M7.5; *personne* M8.2; *ni... ni* M8.5 (sai a proposta "M8.1, anúncio *Ni animaux ni fumeurs.*, ou M8.5"). A M8.5 passa a ter 3 notas (*il est interdit de*,
     *il ne faut pas*, *ni... ni*).
     - Ao escrever o texto: *le cri* não é cartão em nenhuma unidade; pela regra 11 do `15`, o exemplo *Ni cris ni musique après 22h* troca a palavra ou a dona aceita
       caso a caso (*fumer, manger, la musique* são cartões vistos antes).
186. **Notas culturais novas do A2 M8 (aprovadas; texto só depois, aprovado pela dona)**:
     - M8.1 (Cult, alta): ***la caution* e as *charges***: como funciona o aluguel na França: a caução, o aluguel com *charges comprises* ou não (condomínio, água,
       aquecimento) e o contrato de locação (*le bail*, só na nota). Junto do cartão *la caution*. Ponto para o texto (confiança alta): no uso comum *la caution* é o
       depósito; no contrato o nome oficial é *le dépôt de garantie*, e *la caution* também quer dizer o fiador (*se porter caution*).
     - M8.2 (Cult, **alta, fonte: a dona**): ***la fête des voisins***: festa anual dos vizinhos de prédio e de rua, criada em Paris em 1999, numa **sexta-feira no fim
       de maio; a data muda a cada ano** (2026: 29 de maio; 2027: 28 de maio, segundo a dona). **Não escrever "dia fixo".** Junto do cartão *le voisin / la voisine*.
     - Com elas, a M8.1 tem 1 nota (*la caution* e *charges*) e a M8.2 tem 3 (*tout, plusieurs, chacun*; *personne*, versão grátis; *la fête des voisins*).
187. **A2 M8 fechado**; segue o **M9** (Comunicar e se relacionar).
     - **Contas**: M8.1 12, M8.2 12, M8.4 12, M8.5 12 = **48 cartões** (as 4 listas já eram contadas com 12); A2 com **425 cartões** (415 novos + 10 publicados), sem
       mudança. O tempo não muda: M8 ~3h30 (4 unidades de vocabulário × ~40 min + 2 gramáticas × ~25 min); A2 ~33h10.
     - Notas do A2: ~60 (+3: *ni... ni* na M8.5, decisão 185; *la caution* e *charges* na M8.1 e *la fête des voisins* na M8.2, decisão 186).
     - **Pendências limpas** (seção 7 do `08 v2`): em "Listas de palavras a revisar pela dona", a A2 M8.5 sai das abertas e o A2 M8 entra como aprovado; entra o achado
       de *garée* na frase publicada do A1 (decisão 184); a lista "só para conferir" ganha os pares da decisão 184. A posição "*ni... ni* na M8.1 ou na M8.5" sai da tabela
       de negação complexa (decidida pela 185).

---

# Vigésima sexta rodada (2026-10-22): *garée*, *allô* e revisão do A2 M9 "Comunicar e se relacionar"

Base: respostas da dona no corpo da conversa, aprovadas em 2026-10-22. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 3.2, 4.2, 6, 7, 8 e Resumo),
`15` (regras 11 e 14), `16` (item 4) e `00`. Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

188. ***garée*, exemplo de *ni... ni* e a nota de *la caution*** (fecha o achado da decisão 184 e os pontos de texto das decisões 185 e 186):
     - A frase publicada ***La voiture est garée devant la maison.*** (`A1-14`, vai com a chave para a A1 M7.5, decisão 136) **fica**: *garée* é **expressão de uso
       comum** (exceção formal da regra 11 do `15`, como *prochain*, decisão 180); o cartão *se garer* continua na A2 M8.4. A pendência sai da seção 7 do `08 v2`.
     - O exemplo da nota de ***ni... ni*** (A2 M8.5, decisão 185) passa a ***Ni bruit ni musique après 22h*** (no lugar de *Ni cris ni musique après 22h*: *le cri*
       não é cartão; ***le bruit*** é cartão da A2 M1.3 e *la musique* do A1). O outro exemplo, *Ni fumer ni manger ici*, fica.
     - A nota cultural de ***la caution*** e das *charges* (A2 M8.1, decisão 186) diz: no uso comum, *la caution* é o **depósito**; no contrato, o nome oficial é
       ***le dépôt de garantie***; e *la caution* também quer dizer o **fiador** (*se porter caution*) (Cult, alta). Texto só depois, aprovado pela dona.
189. ***Allô* sem cartão.** *Allô* fica **só em frase** (já tem a nota *Allô ?* no A1 M5.1, decisão 114) e sai da lista da A2 M9.1, que passa a ter **11 palavras**:
     *rappeler, laisser un message, la messagerie, ne quittez pas, de la part de qui, décrocher, raccrocher, occupé / occupée, le répondeur, joindre, la ligne*
     (a lista do `04` 6.3 sem *allô*). Não entra palavra substituta (11 está dentro do limite do A2, regra 13). Sai da lista "só para conferir" da seção 7 do `08 v2`.
190. **A2 M9 "Comunicar e se relacionar": listas aprovadas.**
     - M9.1 "Telefonar e deixar recado" (`A2-27`, 11): a lista da decisão 189.
     - M9.3 "Escrever para convidar, recusar e agradecer" (`A2-28`, 12): *l'invitation, remercier, s'excuser, accepter, refuser, regretter, la réponse, amitiés,
       à très vite, je t'embrasse, souhaiter* + ***confirmer*** (*Je confirme ma présence.*), **proposta de substituição** de *bisous*, **a revisar pela dona**.
       *bisous* já tem nota no A1 M8.3 (*Bisous, grosses bises*) e fica **só em frase** aqui; *cordialement* é cartão da A2 M3.3 e *cher / chère* (querido) fica em nota
       (decisão 157). Conferência da regra 14 de *confirmer*: não aparece em nenhuma lista do A1 nem do A2 (`08 v2`, `04`, `08`) nem em `fr/content.js`: sem conflito.
     - M9.5 "Sentimentos e reações" (`A2-29`, 12): *content / contente, triste, fâché / fâchée, inquiet / inquiète, surpris / surprise, déçu / déçue, fier / fière,
       jaloux / jalouse, féliciter, consoler, félicitations, la nouvelle* (a lista do `04` 6.3; *se sentir* só em frase e nota: é cartão da A2 M4.1, decisão 136).
     - M9.6 "Internet e redes" (`A2-30`, 12): *le réseau social, publier, la publication, le commentaire, commenter, s'abonner, le lien, télécharger, le mot de passe,
       l'appli, l'écran, l'ordinateur* (a lista do `04` 6.3; *la pièce jointe* só em frase, cartão da A2 M7.5, decisão 181).
     - **Conferência da regra 14** (A1 e A2, no `08 v2`, no `04`, no `08` e em `fr/content.js`): ***l'ordinateur*** e ***l'écran*** **não são cartão em nenhuma outra
       unidade** (nem do A1 nem do A2) e não aparecem no conteúdo publicado: ficam na M9.6, **sem substituta**. Nenhuma das 47 palavras do M9 é cartão em outra
       unidade; nenhuma aparece em `fr/content.js`.
       - Só para conferir (não é a mesma palavra-cartão; vão para a lista da seção 7 do `08 v2`): *rappeler* (A2 M9.1) x *appeler* (A1 M8.6); *joindre* (A2 M9.1) x
         *la pièce jointe* (A2 M7.5); *la ligne* (A2 M9.1) x *en ligne* (só frase da A2 M3.3); *s'excuser* (A2 M9.3) x a nota *Excusez-moi* (A1 M9.3);
         *félicitations* x *féliciter* (os dois na A2 M9.5); *la publication* x *publier* e *le commentaire* x *commenter* (os dois pares na A2 M9.6); *la nouvelle*
         (notícia, A2 M9.5) x o adjetivo *nouveau / nouvelle* (sem cartão no mapa); *Bon courage !* (nota da A2 M9.5) x *courageux* (A2 M1.4).
191. **Notas novas do A2 M9 (aprovadas; texto só depois, aprovado pela dona)**:
     - M9.3, nota de realidade (Real, alta): **abertura e fecho de cartas e e-mails**: *Cher / Chère* abre carta ou e-mail, formal ou informal; *Salut* para amigo;
       fechos *Cordialement* x *Bien cordialement* x *Amicalement* (*cordialement* é cartão da A2 M3.3; aqui só a escolha do fecho conforme a relação).
     - M9.5, nota de realidade (Real, alta): ***Félicitations !* e *Bon courage !***: o que dizer numa boa notícia e numa fase difícil. Junto do cartão *félicitations*.
     - **Mantidas**: *Cher Paul, Chère Marie* na M9.3 (*cher / chère* = querido(a), Exp, alta, *breve*; o cartão *cher* = caro é do A1 M5.3); *se sentir* + adjetivo
       na M9.5 (Exp, n/r). **Versões grátis mantidas** (coluna "Versão grátis" do `08 v2`, sem mudança de posição): a M9.1 abriga a da M9.2 (gancho *Il vient de sortir*,
       avisando que não é "vir de"); a M9.3 abriga a da M9.4 (registro escrito *Pourriez-vous...*, com +1 linha da inversão com *-t-*). A M9.5 e a M9.6 não abrigam nenhuma.
     - Com elas, a M9.3 tem 3 notas (abertura e fecho; *Cher Paul, Chère Marie*; a versão grátis da M9.4) e a M9.5 tem 2 (*se sentir*; *Félicitations !* e *Bon courage !*).
192. **A2 M9 fechado**; segue o **M10** (Opinião, cultura e mundo).
     - **Contas**: M9.1 11, M9.3 12, M9.5 12, M9.6 12 = **47 cartões**; A2 com **424 cartões** (414 novos + 10 publicados; −1 por *allô*, decisão 189). O tempo não muda:
       M9 ~3h30 (4 unidades de vocabulário × ~40 min + 2 gramáticas × ~25 min; a M9.1 com 11 conta como unidade de até 12 palavras, como a A2 M3.1 com 10); A2 ~33h10.
     - Notas do A2: ~62 (+2 da decisão 191).
     - **Pendências limpas** (seção 7 do `08 v2`): sai o achado de *garée* (decidido pela 188); em "Listas de palavras a revisar pela dona", o A2 M9 entra como aprovado,
       com *confirmer* (M9.3) a revisar pela dona; a lista "só para conferir" perde *allô* e *bisous* (decididos pelas 189 e 190) e ganha os pares da decisão 190.

---

# Vigésima sétima rodada (2026-10-22): revisão do A2 M10 "Opinião, cultura e mundo" e mapa do A2 completo

Base: respostas da dona no corpo da conversa, aprovadas em 2026-10-22. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 3.2, 6, 7, 8 e Resumo),
`15` (regras 11 e 14) e `00`. O `16` não muda (o M10 não tem negação nova). Nada aplicado ao site. Os textos das notas novas só se escrevem depois, aprovados pela dona.

193. **A2 M10 "Opinião, cultura e mundo": listas aprovadas** (as quatro com 12, as listas do `04` 6.3 já com as trocas da decisão 157).
     - M10.1 "Apresentar um livro, filme ou exposição" (`A2-31`, 12): *le roman, l'auteur / l'autrice, le personnage, l'histoire, la bande dessinée, l'exposition,
       le tableau, le / la peintre, le spectacle, raconter, émouvant / émouvante, ennuyeux / ennuyeuse*.
     - M10.3 "Patrimônio e festas" (`A2-32`, 12): *le monument, le château, le patrimoine, la tradition, la fête nationale, le feu d'artifice, le défilé, célébrer,
       historique, le siècle, le roi / la reine, le jour férié* (*le jour férié* no lugar de *l'église*, decisões 157 e 162).
     - M10.4 "Meio ambiente" (`A2-33`, 12): *l'environnement, la planète, le climat, le réchauffement climatique, trier, recycler, les déchets, la pollution, polluer,
       l'énergie, protéger, durable* (*durable* no lugar de *la nature*, decisões 157 e 162).
     - M10.6 "Viajar pela francofonia" (`A2-34`, 12): *le nord, le sud, l'est, l'ouest, la côte, l'île, le fleuve, la forêt, le désert, la région, la frontière,
       francophone*.
     - **Conferência da regra 14** (A1 e A2 inteiros, no `08 v2`, no `04`, no `08` e em `fr/content.js`): **nenhuma das 48 palavras é cartão em outra unidade** e
       nenhuma aparece no conteúdo publicado (o único "roman" de `fr/content.js` é o id da nota N22, *dias-semana-deuses-romanos*). **Nenhuma troca, nenhuma substituta.**
       *l'histoire* é cartão só aqui, com os dois sentidos (história e estória; em inglês *story* e *history*), como *voler* (decisão 158); *le nord, le sud* e
       *la région* não são cartão em nenhuma outra unidade (o A1 M8 tem países e paisagens de férias, não pontos cardeais nem regiões). Ficam só em frase ou nota no
       M10: *l'église* (A1 M6.3) na M10.3; *la nature* (A2 M1.3) na M10.4; *le Canada, la Suisse, la Belgique* (A1 M8.1) e *la mer, la montagne, la plage*
       (A1 M8.3) na M10.6.
       - Só para conferir (não é a mesma palavra-cartão; vão para a lista de conferência do `08 v2`, seção 3.2): *l'histoire* x *historique* (M10.1 x M10.3);
         *le roi / la reine* (M10.3) x a nota *Galette des rois* (A1 M9.3, só nota); *l'autrice* (cartão da M10.1) x a nota "*Professeure, autrice*" (A1 M1.6, só
         nota); *le réchauffement climatique* x *le climat* e *la pollution* x *polluer* (os dois pares na M10.4); *l'est* (ponto cardeal, o *s* e o *t* soam) x *est*
         (de *être*, A1 M1.5), mesma escrita e pronúncia diferente; *la côte* (M10.6) x *à côté de* (A1 M7.5); *francophone* (M10.6) x *français / française*
         (A1 M1.2); *la région* (M10.6) x *le pays* (A1 M1.2). *la fête nationale* (A1 *la fête*) e *le feu d'artifice* x *le feu* (A2 M8.4) já estavam na lista.
194. **Notas culturais do A2 M10 (aprovadas; texto só depois, aprovado pela dona)**:
     - M10.6 (Cult, alta): **onde o francês é língua oficial ou falada** (França, Bélgica, Suíça, Canadá e Quebec, países da África, Caribe), ligando com os cartões
       *le Canada, la Suisse, la Belgique* do A1 M8.1. Junto do cartão *francophone*.
     - M10.6 (Cult, alta): **as variantes da francofonia**, ligando com *septante, huitante, nonante* (nota do A1 M5.1) e *déjeuner / dîner / souper* (nota do
       A1 M4.5) **sem repeti-las** (regra "nunca nota igual", `14`): só a ideia de que o francês muda de um país para outro, com uma ou duas formas novas.
     - M10.3 (Cult, alta): ***la fête nationale* do 14 de julho**: a data, a tomada da Bastilha (1789), o desfile (*le défilé*) e os fogos (*le feu d'artifice*);
       comparar com o 7 de setembro do Brasil. Junto do cartão *la fête nationale*.
       - **Ponto para o texto (proposta a confirmar pela dona)**: o A1 M3.5 já tem a nota cultural "14 de julho" (Cult, alta, gatilho *juillet*). Pela regra "nunca nota
         igual" (`14`), a proposta é a nota do A1 ficar **breve** (só "14 de julho é a festa nacional da França") e a história (Bastilha, desfile, fogos, 7 de setembro)
         ficar **só na A2 M10.3**, sem "você já viu".
     - M10.3 (Cult, alta), **se couber**: uma nota sobre ***le château*** (por exemplo, os castelos do Loire). Junto do cartão *le château*.
     - Com elas, a M10.6 tem 3 notas (francofonia, variantes, versão grátis do gerúndio) e a M10.3 tem 1 ou 2 (*la fête nationale*; *le château* se couber).
195. **A2 M10 mantido com 7 unidades (4 + 3) e ~3h55**: é o último módulo do A2 e fecha o nível (4 unidades de vocabulário × ~40 min + 3 gramáticas × ~25 min).
     As duas gramáticas finais **ficam** (M10.5 *Il faut que / je veux que*, subjuntivo só em fórmula; M10.7 gerúndio), e a M10.2 (causa, consequência e finalidade)
     também. **Versões grátis mantidas** (coluna "Versão grátis" do `08 v2`, sem mudança de posição): *à cause de / grâce à* na M10.1 (da M10.2); *Il faut qu'on recycle*
     na M10.4 (da M10.5); *en voyageant* na M10.6 (da M10.7). Responde a pergunta 42 do `08 v2`.
196. **Mapa do A2 completo** (M1 a M10 revistos módulo a módulo, decisões 148 a 195); **mapa do A1 também revisto**. **Próximo passo: auditoria final do A1 e do A2**
     pelo agente `auditor-curricular` (`.claude/agents/auditor-curricular.md`) **antes da aprovação final do mapa** (decisão 146) e da implementação (Etapa 0b parte 2).
     - **Contas do A2 refeitas pela soma das listas aprovadas**: M1 48, M2 36, M3 34, M4 47, M5 36, M6 36, M7 47, M8 48, M9 47, M10 48 = **427 cartões** (417 novos
       + 10 publicados: 8 da `A1-15`, *gentil* e *récemment*). A conta histórica dava **424** porque três subtrações da rodada de 2026-10-21 nunca foram desfeitas quando
       as unidades voltaram a 12: *la police* na A2 M2.5 (a lista aprovada, decisão 158, tem 12 com *le portefeuille* e *récemment*) e *la poste, la mairie* na A2 M7.5
       (a lista revista e aprovada, decisões 142 e 181, tem 12 com *le guichet, le titre de séjour, le justificatif de domicile, la pièce jointe*). Nenhuma lista muda;
       só a soma. **Vale 427** (`08 v2`, seção 8, conflito 62).
     - **Tempo**: A2 ~33h10 sem mudança (M1 3h05, M2 3h15, M3 3h15, M4 3h30, M5 2h50, M6 3h15, M7 3h05, M8 3h30, M9 3h30, M10 3h55).
       A1 sem mudança: 9 módulos, 56 unidades (33 + 23), 344 cartões, ~28h45.
     - **Notas do A2**: ~65 (+3 da decisão 194; +1 se couber a de *le château*).
     - **Pendências limpas** (seção 7 do `08 v2`): saem as linhas já decididas ("Pendências de decisão da 137", "*prochain*, *le projet* e *garée*", "Palavras repetidas
       no A2"); a lista "só para conferir" sai da seção 7 e vira a **lista de conferência da regra 14** na seção 3.2 (insumo da auditoria, não pendência); em "Listas de
       palavras a revisar pela dona" ficam só as que nunca tiveram aprovação explícita (A1 M3.6, A1 M8.6, os cortes da decisão 129 e *confirmer* na A2 M9.3); entram a
       nota do 14 de julho (decisão 194) e, na linha da auditoria, a frase `A1-7-p5` (*partir* e *en voyage* antes dos cartões).
     - **Status**: A2 M1 a M10 fechados; o mapa A1 + A2 **aguarda a auditoria final e a aprovação da dona**.

---

# Vigésima oitava rodada (2026-10-23): respostas à auditoria final do A1 e do A2

Base: auditoria `auditoria/2026-10-22-a1-a2-auditoria-final.md` (agente `auditor-curricular`) e respostas da dona, aprovadas em 2026-10-23. Aplicado em
`08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.1, 3.2, 4.1, 4.2, 5, 6, 7, 8 e Resumo), `15` (regras 11, 13, 14 e 15 nova), `16` e `00`. Nada aplicado ao site.

197. **Cartões para palavras muito comuns (aprovado, SEM os verbos irregulares; Bloqueia 1 da auditoria).** Entram como cartão, cada uma na unidade da função:
     *aimer* (A1 M4.1), *parler* (A1 M2.5), *l'enfant* (A1 M2.1; sai da A2 M1.1), *le jour* (A1 M3.3), *l'anniversaire* (A1 M3.5; **sai da A1 M9.3**, onde era cartão),
     *l'addition* (A1 M4.5), *acheter* (A1 M5.3), *voir* (A1 M9.1), *la saison* (A1 M8.5), *l'après-midi* (A1 M3.1) e ***l'ami / l'amie*** (A1 M9.3).
     - ***voir***: a mensagem da dona diz "A2 M9.1", mas a proposta da auditoria (aprovada) é a **A1 M9.1** "Falar de lazer" (*Quel film vous allez voir ?*, publicado; *voir* também
       é usado na A1 M3.3 e na A2 M2.5 *Je n'ai rien vu*); a A2 M9.1 é "Telefonar e deixar recado". **Aplicado na A1 M9.1; a confirmar pela dona.**
     - ***l'ami / l'amie*** (decisão do editor, pedida pela dona): **não cabe na A1 M2.1** (com *l'enfant* ela já passa do limite, ver abaixo). Vai para a **A1 M9.3** "Convidar",
       que fica com 10 porque *l'anniversaire* sai de lá para a M3.5 (convidar amigos: *Tu viens avec tes amis ?*). Fica no A1, onde é usada (`A1-g2`, `A1-19`, `A1-20`).
       *le copain / la copine* continua cartão da A2 M1.1 (lexema diferente: dois cartões, regra 14); a nota *copain / copine* fica com o cartão na A2 M1.1 e passa a citar
       *mon ami(e)* só em frase (é cartão do A1), sem "você já viu". A A2 M1.1 perde *l'enfant* e fica com **11**, sem palavra substituta (dentro do limite do A2, como a
       A2 M9.1, decisão 189).
     - **Limite da regra 13** (A1: 10, com as exceções aceitas M1.2 11, M3.1 12, M3.3 11, M4.1 11; conjunto fechado pode passar). Onde a unidade passou do limite, a palavra
       **menos importante que ainda não é cartão publicado** vai para uma **nota de vocabulário** na mesma unidade, **a revisar pela dona**:
       - A1 M4.1 (11 → 12): ***adorer*** vai para a nota "Mais gostos" (*adorer*, *aimer bien*); *aimer* e *détester* (publicado) ficam como cartões. Custo: as frases
         publicadas com *adorer* trocam (decisão 202).
       - A1 M2.5 (10 → 11): ***la ville*** vai para a nota de vocabulário "Onde moro" (os outros 8 são cartões publicados; *habiter* é a função e a base da reescrita da `A1-g3`).
         Custo: *Quel est le nom de la ville ?* (M1.2), *Le père travaille en ville.* (M2.1) e *En ville, je prends le vélo.* (M6.5, chave nova da decisão 136) e
         *centre-ville* (M6.1, M6.5) ficam sem cartão: trocar, ou a dona aceita a M2.5 com 11 como exceção (alternativa sem efeito em frase).
       - A1 M3.1 (12 → 13): ***se coucher*** vai para a nota "Mais rotina" (nenhum uso no conteúdo publicado; *tôt / tard* ficam juntos no diálogo novo da versão grátis da M3.4;
         a M3.4 continua com dois pronominais publicados como cartão, *se réveiller, se lever*).
       - A1 M4.5 (10 → 11): ***la boisson*** vai para a nota "Mais no restaurante" (nenhum uso no publicado; *l'entrée* fica pela fórmula *entrée, plat, dessert*).
       - A1 M5.3 (10 → 11): ***la chemise*** vai para a nota "Outras roupas" (com *la veste, le manteau, le sac*, que já aparecem em frases publicadas da `A1-10`).
     - **Sem palavra que possa sair** (todas as outras são cartões publicados ou do conjunto fechado): ficam acima do limite, como exceção **a revisar pela dona**:
       A1 M2.1 (**11**: os 10 publicados + *l'enfant*), A1 M3.3 (**12**: os dias são conjunto fechado e os outros 4 são publicados), A1 M8.5 (**11**: os 10 publicados +
       *la saison*), A1 M9.1 (**11**: os 10 publicados + *voir*). A A1 M3.5 vai a **16** (conjunto fechado dos meses, já com 4 lições + Revisão).
     - **Contas**: A1 com **349 cartões** (344 + 10 entradas, *l'anniversaire* só muda de unidade, − 5 que vão para nota): M1 60, M2 **32**, M3 **50**, M4 41, M5 30, M6 30,
       M7 34, M8 **41**, M9 **31**. A2 com **426** (**416 novos** + 10 publicados; −1 por *l'enfant*): A2 M1 **47**. **Tempo do A1 ~29h35** (+50 min): M2 3h15 → **3h35**
       (M2.1 e M2.3 com 4 lições, decisão 202), M3 3h25 → **3h35** (+1 palavra na M3.3 e na M3.5), M8 3h05 → **3h15** (M8.5 com 4 lições), M9 3h20 → **3h30** (M9.1 com
       4 lições); M4 e M5 sem mudança (troca uma por uma). M2 e M3 passam de 3h30 (a revisar pela dona; M1 3h35 e M3 já aceitos pela decisão 142). A2 sem mudança (~33h10).
       Lições do A1 ~143 (+4: M2.1, M2.3, M8.5, M9.1). Notas do A1 ~133 (127 recontadas pela auditoria + 6 de vocabulário: "Mais família", "Onde moro", "Mais rotina",
       "Mais gostos", "Mais no restaurante", "Outras roupas").
     - **A exceção "verbo de gramática em fórmula" para os irregulares NÃO foi aprovada** (ver 203).
198. **Diálogo publicado da A1 M1.3 "No parque"** (*Quel âge a ta fille ? ... Et ton fils ? Ils sont grands !*, `A1-3`): *la fille, le fils* (cartões da M2.1) e *grand* (M2.3)
     ficam como **exceção formal da regra 11** do `15` ("como entrada", já aceita no `09`), como *pour la santé* (decisão 171).
199. **A1 M2.1**: *les grands-parents* e *marié(e)* ficam numa **nota de vocabulário "Mais família"** (sem cartão; Exp, alta, *nova*; exemplos *mes grands-parents*, *je suis
     marié(e)*); *l'enfant* vira cartão (197), com a frase *J'ai deux enfants.* *marié* continua sem cartão (o cartão *se marier* é da A2 M1.5).
200. ***ne quittez pas*** (A2 M9.1) é só formal: entra ***Ne quitte pas !*** em frase do diálogo da M9.1, junto do cartão (regra 1, formal e informal juntos). O cartão não muda.
201. **Pontos de verificação depois das mudanças de currículo.** Todos os Pontos de verificação existentes (o da unidade, agora "Revisão da unidade", e o do módulo) são
     **revisados**: conteúdo regenerado ou conferido contra o mapa novo, por script, junto com a reorganização (lista de implementação na seção 5 do `08 v2`; regra 15 do `15`).
     **Pergunta aberta (a dona decide depois):** herdar ou não a aprovação já dada por alunos. Contexto para a decisão: os ids de módulo foram escolhidos por sobreposição de
     unidades (`08 v2`, seção 5); o `A1-m4` antigo e o novo "Na cidade" dividem só 1 unidade de 6 (`A1-14`) e a auditoria recomenda não herdar; o `A1-m3` divide 2 unidades com
     o novo M4 e 2 com o novo M5 (empate, falta um critério de desempate); os módulos novos `A1-m7`, `A1-m8`, `A1-m9` nunca foram aprovados por ninguém.
202. **Correções do editor (do relatório, sem perguntar)**, aplicadas no `08 v2`:
     - **Destino das ~60 frases publicadas sem destino** (seção 7 do `08 v2`, item 11 de "Conteúdo publicado que precisa de reescrita"), com a chave quando a frase serve na
       unidade de destino e chave nova quando é trocada: 6 das 11 da `A1-4`; as 4 frases de mês da `A1-7` com a chave para a M3.5 (e *Aujourd'hui, il fait beau.* com a chave para
       a M8.5); *Le train part à huit heures.* (M6.5) → *Le bus est à huit heures.*; *j'ai appris*, *j'ai visité*, *j'ai voyagé*, *au restaurant* (M9.4) trocados; *Il fait zéro
       degré dehors.* (M8.5) trocada; *dans* e *sur* antes da M7.5; as da M1.1, M1.2, M2.3, M3.1, M4.1 a M4.3, M5.3, M8.5, M9.1.
     - **Exercícios sem palavra ensinada**, reescritos na lista: `A1-g1` (*Ils ___ deux enfants.*, *Elle ___ faim.*), `A1-g2` (*mon amie*, *Son école est loin.*), `A1-g7`
       (*livre*, *chat*), `A1-g9` (*arrivés*, *visité*, *marché*).
     - **Ganchos**: A1 M8.1 sem *vacances* (*Je vais aux États-Unis, je pars en Italie*); A2 M2.1 *quand on est partis* no lugar de *arrivés*.
     - **Lista de conferência da regra 14**: + *à pied / le pied*, *la date de naissance / la naissance*, *la carte / la carte postale*, *tard / plus tard*, *vite / à très vite*,
       *inviter / l'invitation*, *urgent / les urgences*, *le vendeur / vendre*, *le séjour / le titre de séjour*, *se passer / passer l'aspirateur*, *tout droit / avoir le droit
       de*, *OK, ça marche / marcher*; e, desta rodada, *l'ami(e)* (A1 M9.3) x *le copain / la copine* (A2 M1.1), *l'enfant* x *l'enfance*, *le jour* x *un jour* e *le jour
       férié*, *acheter* x *vendre*.
     - **Contagens**: "416 novos" da seção 5 era 417 até a decisão 196 e volta a **416** com a 197; "M8.7" → **M8.6**; totais parciais antigos na coluna "Muda" do A2 (M3.1,
       M7.4, M9.1) tirados; notas do A2 **~74** (75 com *le château*); A1 M2.3 com 11 palavras = **4 lições + Revisão** (regra 13), M2 +10 min.
     - **Diálogos das 8 lições aposentadas** (seção 5): cada um entra na lição nova que fecha a unidade (a última lição de vocabulário antes da Revisão), com a fala trocada
       onde a decisão 202 manda.
     - **Notas**: N28 sem "(unidade anterior)"; N09: *huitante* é só de alguns cantões suíços (Vaud, Valais, Fribourg), a Bélgica diz *quatre-vingts* (confiança alta);
       regra 1: *Repose-toi !* junto de *Reposez-vous !* (A2 M4.1) e *Excuse-moi* junto de *Excusez-moi* (A1 M9.3).
     - **`16`**: *pourquoi / parce que* fica na A1 M9.3 (convites), como no `08 v2`; sai da lista da M6.6. (A mensagem da dona diz "M9.4"; no mapa, *pourquoi ? / parce que* é
       nota da M9.3, que é a posição aplicada.)
     - **Dependência de código** (Bloqueia 2): a ordem de desbloqueio vem do array `UNITS` (`unitsOfLevel`, `markUnitCompleted`, `isFirstOfLevel` em `fr/app.js`); se a `A1-15`
       só mudar de `level`, vira a 1ª unidade do A2 para o código (aberta para todos). Na seção 5 do `08 v2`: o `curriculo_ops.js` **reordena `UNITS` junto** com `level` e
       `unitIds`, com teste de `isFirstOfLevel` e da cadeia.
203. **PENDENTES (a dona pediu mais contexto; nada decidido)**, na seção 7 do `08 v2` com o contexto: (a) cartão dos verbos irregulares (*aller, faire, vouloir, pouvoir, devoir,
     savoir, connaître, dire, donner*) pelo primeiro uso na trilha livre, já que a exceção foi **recusada**; (b) a frase `A1-7-p5` *La semaine prochaine, je pars en voyage.*;
     (c) a nota do 14 de julho (A1 M3.5 x A2 M10.3); (d) as listas A1 M3.6 e M8.6, *laid* na nota da A1 M2.3 e os cortes da decisão 129, com *le portable* (A2 M9.1) e *le mail*
     (A2 M9.6, no lugar de *l'écran*). As listas dessas unidades ficam como estão.
     - **Status**: auditoria final feita e respondida (197 a 203); o mapa A1 + A2 aguarda as pendências da 203 e a aprovação final da dona.

---

# Vigésima nona rodada (2026-10-23): pendências da decisão 203

Respostas da dona às pendências da decisão 203, aprovadas em 2026-10-23. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.1, 3.2, 4.2, 5, 6, 7, 8 e
Resumo), `15` (regras 11, 13 e 14), `16` e `00`. Nada aplicado ao site. Continuam pendentes (seção 7 do `08 v2`, com contexto): verbos irregulares, frase `A1-7-p5` e *préférer*.

204. **Nota do 14 de julho (responde a 203 c).** Na A1 M3.5 fica **só uma nota curta**: 14 de julho é a Festa Nacional da França; diz-se *le quatorze juillet* (Cult, alta,
     *nova*). A história (tomada da Bastilha em 1789, desfile, fogos, comparação com o 7 de setembro do Brasil) fica **só na A2 M10.3**, junto do cartão *la fête nationale*,
     sem "você já viu" (regra "nunca nota igual", `14`). Fecha a proposta da decisão 194.
205. **Listas aprovadas (responde a 203 d, menos *le portable / le mail*, que é a 206).** Saem do "a revisar pela dona":
     - A1 M3.6 "Frequência" (`A1-35`, 10): *toujours, souvent, parfois, rarement, jamais, tous les jours, d'habitude, de temps en temps, une fois par semaine, chaque*.
     - A1 M8.6 "Pedir ajuda" (`A1-32`, 10): *au secours, appeler, avoir besoin de, urgent, vite, la police, perdu / perdue, le commissariat, l'aide, trouver*. As frases-modelo
       e o texto das notas continuam para escrever módulo a módulo, aprovados pela dona.
     - *laid* na nota de vocabulário "Outros traços" da A1 M2.3 (sem cartão).
     - Os cortes da decisão 129: M5.1 (*en espèces, le portable, le mail* na nota "Pagar e dar o contato"), M5.4 (*le cuir* na nota "Outros materiais"), M7.1 (*le studio,
       l'immeuble, le jardin* na nota "Outros tipos de moradia"), M8.1 (*le Japon* na nota "Outros países"). Responde a pergunta 64 do `08 v2`.
206. ***le portable* e *le mail* viram cartão no A2.** ***le portable*** entra na **A2 M9.1** "Telefonar e deixar recado" (11 → **12**, cabe no limite do A2). ***le mail***
     entra na **A2 M9.6** "Internet e redes" **no lugar de *l'écran*** (continua com 12); *l'écran* passa a frase e nota, sem cartão.
     - **Regra 14 conferida**: nenhuma das duas é cartão em outra unidade do A1 ou do A2; no A1 M5.1 elas ficam só na nota de vocabulário "Pagar e dar o contato" (com a
       nota *courriel* / *arobase*), o que não é cartão. *le portable* x *le numéro de téléphone* (A1 M5.1) e *le mail* x *la pièce jointe* (A2 M7.5) são palavras diferentes
       (dois cartões). *l'écran* não é cartão em nenhuma outra unidade: só sai da lista.
     - **Contas**: A2 M9 47 → **48**; A2 com **427 cartões (417 novos + 10 publicados)**. Tempo sem mudança (a M9.1 com 12 continua "unidade de até 12 palavras"; A2 ~33h10).
     - *confirmer* na A2 M9.3 continua "a revisar pela dona" (decisão 190); a ideia da auditoria de pôr *le mail* na M9.3 sai.
207. **A1 M2.5 fica com 11 palavras e *la ville* continua cartão** (revoga, só nesta parte, a decisão 197): *parler* entra como 11ª palavra e *la ville* não vai para nota.
     Exceção à regra 13 **aceita pela dona** (não é mais "a revisar"). Com 11 palavras, a M2.5 tem **4 lições + Revisão da unidade** (regra 13, decisão 202), +10 min no M2.
     - **Nota "Onde moro" sai** (ela só tinha *la ville*); notas do A1 ~133 → **~132**.
     - **Frases**: *centre-ville* (*La place est au centre-ville.*, M6.1; *Le train va au centre-ville.*, M6.5) e *En ville, je prends le vélo.* (M6.5, chave nova da decisão 136)
       **ficam**, porque *la ville* já é cartão (M2.5 vem antes do M6). *Quel est le nom de la ville ?* (publicada na M1.2, antes do cartão) deixa de ser trocada e **vai
       com a chave para a M2.5** (decisão do editor: a frase serve à função "onde moro" e assim a chave é preservada). *Le père travaille en ville.* (M2.1, antes do cartão)
       continua trocada, como na decisão 202.
     - **Contas**: A1 M2 32 → **33**, ~3h35 → **~3h45**; A1 com **350 cartões**, ~**29h45**, lições ~143 → **~144**.
208. ***l'ami / l'amie*** **fica na A1 M9.3** "Convidar" (confirma a decisão 197); *le copain / la copine* continua cartão na A2 M1.1 (lexemas diferentes, regra 14).
209. ***coûter*** **vira cartão na A1 M5.1** "Perguntar o preço e pagar". A M5.1 passaria a 11 (conjunto aberto, limite 10); das palavras não publicadas da unidade (*mille, le prix,
     payer, le numéro de téléphone*; as outras 6 são cartões publicados), a menos importante é ***le prix***, que vai para a nota de vocabulário "Pagar e dar o contato"
     (*Quel est le prix ?*), **a revisar pela dona**: *Ça coûte combien ?* já cobre "perguntar o preço"; *mille* está no "Consigo" (preços até 1000 €), *payer* é a função e
     *le numéro de téléphone* é o telefone da unidade. A M5.1 continua com **10**, sem mudar a conta nem o tempo do M5. Todas as frases publicadas com *coûter* (`A1-10`,
     `A1-g10`, `A1-14`, diálogo "Numa loja") vêm depois da M5.1 e ficam.
     - ***l'euro* NÃO vira cartão**: aparece só em frase (e no recurso "Na frase"), como unidade de preço junto dos números (*cinq euros*, *quarante euros*), inclusive na
       fala publicada *Voilà, ça fait cinq euros.* (A1 M4.1). Fica registrado como exceção da regra 11 decidida pela dona.
     - ***préférer* NÃO foi decidido**: continua pendência, com contexto na seção 7 do `08 v2` (a A1 M4.1 "Gostos" já está com 11 e não tem palavra livre para sair: as outras
       10 são cartões publicados ou *aimer*, decisão 197).
210. ***voir*** **fica na A1 M9.1** "Falar de lazer" (confirma a decisão 197; a mensagem que dizia "A2 M9.1" fica resolvida): a M9.1 fica com 11, exceção à regra 13 **a revisar
     pela dona**. ***pourquoi / parce que*** fica na **A1 M9.3** (convites), como no `08 v2` e no `16` (conferido: o `16` já diz M9.3 e tira da M6.6, decisão 202).
     - **Totais novos**: A1 com 9 módulos, 56 unidades (33 + 23), **350 cartões**, **~29h45** (M1 3h35, **M2 3h45**, M3 3h35, M4 3h15, M5 2h55, M6 3h05, M7 2h50, M8 3h15,
       M9 3h30), lições **~144**, notas **~132**; A2 com 10 módulos, 58 unidades (36 + 22), **427 cartões (417 novos + 10 publicados)**, ~33h10, notas ~74.
     - **Ainda pendentes (nada decidido; seção 7 do `08 v2`, com contexto para quem não conhece o assunto)**: (a) cartão dos verbos irregulares; (b) a frase `A1-7-p5`
       *La semaine prochaine, je pars en voyage.*; (c) *préférer*. E as que já estavam abertas: exceções à regra 13 a revisar (M2.1, M3.3, M8.5, M9.1 e as palavras que foram
       para nota: *adorer, se coucher, la boisson, la chemise, le prix*), *confirmer* (A2 M9.3), herança da aprovação dos Pontos de verificação (decisão 201).
     - **Status**: o mapa A1 + A2 aguarda as três pendências acima e a aprovação final da dona.

---

# Trigésima rodada (2026-10-23): frases "Na frase", *préférer*, A1 M5.3 e *le prix*

Respostas da dona em 2026-10-23. Aplicado em `08-mapa-final-a1-a2-v2.md` (cabeçalho, seções 1, 2.1, 3.1, 3.2, 4.2, 7, 8 e Resumo), `15` (regras 11, 13 e 14) e `00`.
Nada aplicado ao site. Continuam pendentes (seção 7 do `08 v2`, com contexto): verbos irregulares e o tamanho da A1 M5.1.

211. **Refinamento da regra 11 (aprovado): palavra nova pode aparecer nas frases "Na frase".** As frases de exemplo da unidade (chaves `-p`, recurso "Na frase") mostram
     a **tradução logo abaixo**, que dá ao aluno uma prévia do significado; a palavra é sistematizada depois, quando vira cartão. Por isso, nessas frases, palavra que ainda não
     é cartão **não obriga a trocar nem a mover a frase**. **Não vale** (continuam sob a regra 11) para **diálogos** (`-d`), **exercícios de gramática**, opções do "Você
     entendeu?" e exercícios de **produção ou escolha** que o aluno precisa resolver, nem para os ditados e os Desafios. Continua valendo a outra metade da regra 11: frase cujo
     **assunto** saiu da unidade (o cartão que ela ilustra foi para outra unidade, ou o tema é de outro módulo) acompanha o assunto.
     - **Frase `A1-7-p5`** *La semaine prochaine, je pars en voyage.* **fica na A1 M3.3** (decisão da dona: não mover). Fecha a pendência 203 b.
     - **Critério da triagem** (seção 7 do `08 v2`, "Conteúdo publicado que precisa de reescrita"): a frase "Na frase" fica na unidade de origem, com a chave, quando ilustra
       um cartão que continua nessa unidade; ela só muda de unidade quando o cartão que ilustra (ou o tema dela) foi para outra unidade, e aí vai com a chave para lá.
     - **Desfeito: movimentações que só se justificavam pela regra antiga** (a frase fica na unidade de origem, com a chave): da decisão 136, *La rue est très calme le soir.*
       (fica na M6.1, não vai para a M7.2), *La pomme est rouge et sucrée.* (fica na M4.1, não vai para a M5.4), *Le midi, je mange à la maison.* (fica na M3.1, não vai para a
       M7.1), *Je viens du Portugal.* e *La nationalité est écrite sur le passeport.* (ficam na M2.5, não vão para a M8.1 e a M8.3), *La salle de bain est à côté de la chambre.*
       (fica na M7.1, não vai para a M7.5), *La voiture est garée devant la maison.* (fica na M6.5, não vai para a M7.5; *garée* continua exceção, decisão 188); da decisão 132,
       *La cuisine est très propre.* e *Le salon est confortable.* (ficam na M7.1, não vão para a M7.2); da decisão 202, *Au revoir, à demain !* e *Un café, s'il vous plaît.*
       (ficam na M1.1), *Le Brésil est très grand.* (fica na M1.2), *Quel est le nom de la ville ?* (fica na M1.2: ilustra *le nom*; desfaz essa parte da decisão 207),
       *Le mari et la femme habitent à Paris.* e *Le fils et la fille aiment l'école.* (ficam na M2.1), *Il va se réveiller tôt demain.* (fica na M3.1), *Aujourd'hui, il fait
       beau.* (`A1-7-p4`, fica na M3.3: ilustra *aujourd'hui*), *Le sucre et le sel sont sur la table.* (fica na M4.2). São **18** frases.
     - **Desfeito: trocas (chave nova) que só se justificavam pela regra antiga** (a frase publicada fica, com a chave, e não vai para o arquivo de aposentados): *Le pays est
       magnifique.* (M1.2); *Le père travaille en ville.*, *La mère prépare le dîner.*, *Le frère et la sœur jouent ensemble.*, *Les parents adorent leurs enfants.* (M2.1);
       *J'aime la couleur bleue.*, *Le chien est petit.* (M2.3); *Le soir, je regarde la télé.*, *Il regarde l'heure sur son téléphone.*, *Je vais dormir maintenant.* (M3.1);
       *Le lait est dans le frigo.*, *Je vais détester ce plat, je pense.*, *Le café est très chaud.* (M4.1); *Le riz et les pâtes sont mes plats préférés.* (M4.2); *Il y a
       beaucoup de monde ici.* (M4.3); *Cette veste / Le manteau / Ce sac coûte...* (3 frases) e *Le magasin ferme à dix-neuf heures.* (M5.3); *Le vélo est plus rapide en
       ville.* (da decisão 136; a chave nova *En ville, je prends le vélo.* deixa de ser necessária) e *Le train part à huit heures.* (M6.5); *Le printemps est ma saison préférée.*
       (M8.5); *J'adore écouter de la musique.*, *Elle adore danser et chanter.*, *Le film commence à vingt heures.*, *Les enfants aiment jouer dehors.* (M9.1); *L'année
       dernière, j'ai appris le français.* e as frases com *j'ai visité* (2), *j'ai voyagé* e *au restaurant* (M9.4). São **31** frases.
     - **Só a troca é desfeita, a mudança de unidade fica** (2 frases): *La fenêtre donne sur le jardin.* vai com a chave para a M7.4 (o cartão *la fenêtre* foi para lá,
       decisão 113) sem troca; *Il fait zéro degré dehors.* vai com a chave para a M8.5 (decisão 115, da dona: frase de tempo) sem troca.
     - **Mantido (destino com sentido pedagógico: a frase acompanha o cartão ou o tema)**: as 4 frases de mês e data da `A1-7` (`p2`, `p6`, `p7`, `p8`) vão com a chave para a
       M3.5 (os meses saíram da M3.3); *Le pull est vert et jaune.* e as outras frases de cor da `A1-16` vão para a M5.4 (as cores saíram da M2.3); *L'hôpital est loin d'ici.*
       vai para a M6.3 (o cartão *l'hôpital* foi para lá); *La porte est fermée à clé.* e *La fenêtre donne sur le jardin.* vão para a M7.4 (cartões *la porte, la fenêtre*);
       *L'addition, s'il vous plaît.* vai para a M4.5 (cartão *l'addition* e função "pedir a conta"); *Récemment, j'ai changé de travail.* vai para a A2 M2.5 com o cartão
       *récemment*; *Il fait zéro degré dehors.* vai para a M8.5 (decisão 115); *La main est blessée.* vai para a A2 M4.3 (decisão 162); *Elle est très gentille.* continua a
       reescrever (o cartão *gentil* e o tema caráter saíram do A1 para a A2 M1.4).
     - **Continua na lista (diálogo, exercício, gramática, ditado, Desafio)**: o diálogo da M2.3 com *gentil / sympa* e a pergunta de checagem; o diálogo da M2.5 (*en
       Allemagne, au Portugal*) e a opção *Je suis d'Italie.*; a fala *On se voit quel jour ?* (M3.3); a fala *Qu'est-ce qu'on achète ?* (M4.2); a fala *Je cherche une robe*
       (M5.3); a fala *On ne sait pas encore !* (M9.1); a fala *Oui, je vais au cinéma avec des amis.* (vai com a chave para a M9.3) e a opção *Oui, avec des amis.*; o diálogo
       publicado da `A1-15`; os exercícios e exemplos de gramática (`A1-g1`, `g2`, `g3`, `g4`, `g6`, `g7`, `g9`); *Désolée, je suis rentrée tard hier* (exemplo da nota de
       passé composé, M9.3 → M9.4, sequência de gramática, decisão 132); os Desafios da `A1-16` e os ditados.
     - **Efeito da decisão 212**: com *préférer* cartão na M4.1, as falas *Tu préfères quelle saison ?* e *Je préfère l'été, il fait chaud.* do diálogo da M8.5 (`A1-13-d2`,
       `d3`) **deixam de ser trocadas** (o verbo já é cartão quando a M8.5 chega).
     - **Conta**: saem da lista de reescrita e movimentação **49 frases "Na frase"** (18 movimentações + 31 trocas desfeitas), mais 2 que só perdem a troca, mais a `A1-7-p5`
       que deixa de ser pendência; e **2 falas de diálogo** pela decisão 212. Antes de cada lote de conteúdo, o cruzamento "frase só com palavras vistas" (pergunta 25)
       confere só diálogos, exercícios, ditados e Desafios; nas frases "Na frase" confere só se a tradução está visível.
212. ***préférer*** **vira cartão na A1 M4.1** "Gostos e pedidos no café", que fica com **12** palavras: exceção à regra 13 **aceita pela dona** (a M4.1 já tinha 4 lições +
     Revisão com 11, então não ganha lição; +5 min). *préféré / préférée* aparece em frase (*mes plats préférés*, *ma saison préférée*), sem cartão próprio (mesmo lexema). Regra 14
     conferida: não é cartão em nenhuma outra unidade do A1 nem do A2. Fecha a pendência *préférer* (decisão 209). Contas: A1 M4 41 → **42**, ~3h15 → **~3h20**.
213. **A1 M5.3 "Comprar roupas" mantém *le pull, les chaussures, essayer, acheter*** (a dona não quer remover nenhuma); *la chemise* fica na nota "Outras roupas", como na decisão
     197 (sai do "a revisar"). Portanto ***pouvoir* NÃO entra na M5.3** e a candidata *les chaussures* sai da proposta dos verbos irregulares (seção 7 do `08 v2`).
214. ***le prix* continua cartão na A1 M5.1** "Perguntar o preço e pagar" (a dona recusou a ida para a nota "Pagar e dar o contato"; desfaz essa parte da decisão 209).
     Como *coûter* também é cartão (decisão 209), a M5.1 fica com **11**, **a confirmar**: a decisão está pendente na seção 7 do `08 v2`, com contexto: (a) a M5.1 fica com 11
     palavras, como exceção à regra 13 (4 lições + Revisão, +10 min); ou (b) outra palavra não publicada da M5.1 (*mille, payer, le numéro de téléphone*) vai para a nota.
     **Recomendação: (a)** (*mille* está no "Consigo", *payer* é a função da unidade e *le numéro de téléphone* é o telefone que o aluno dá; nenhuma sobra). Enquanto isso,
     o mapa conta a M5.1 com 11: A1 M5 30 → **31**, ~2h55 → **~3h05**.
     - **Totais novos**: A1 com 9 módulos, 56 unidades (33 + 23), **352 cartões** (350 + *préférer* + *le prix*), **~30h00** (M1 3h35, M2 3h45, M3 3h35, **M4 3h20**,
       **M5 3h05**, M6 3h05, M7 2h50, M8 3h15, M9 3h30), lições **~145** (+1: a M5.1 com 11 tem 4 lições + Revisão), notas **~132** (sem mudança: a nota "Pagar e dar o
       contato" continua com *en espèces, le portable, le mail*); A2 sem mudança: 10 módulos, 58 unidades (36 + 22), **427 cartões (417 novos + 10 publicados)**, ~33h10,
       notas ~74.
     - **Ainda pendentes (nada decidido; seção 7 do `08 v2`, com contexto)**: (a) **verbos irregulares**: a dona pediu as duas opções escritas, sem decidir: **opção A**,
       cartões espalhados pela unidade do primeiro uso, com exceções à regra 13; **opção B**, unidade nova **"Verbos muito usados"**, só de reconhecimento (cartão com o
       significado do infinitivo e 1 a 2 exemplos, sem tabela de conjugação e sem exercícios de produção, que ficam nas gramáticas Premium). Pergunta da dona: "essa unidade
       tira o privilégio do Premium de ter unidades dedicadas a esses verbos?" Resposta registrada: **não**: o Premium continua com o paradigma, as regras e a produção (as
       gramáticas de *être / avoir*, *faire / prendre*, modais, *aller* e as do A2), e a tabela de conjugação já é grátis fora da trilha, na aba Conjugação. (b) A1 M5.1 com 11 (decisão 214). E as que já
       estavam abertas: exceções à regra 13 a revisar (M2.1, M3.3, M8.5, M9.1 e as palavras que foram para nota: *adorer, se coucher, la boisson*), *confirmer* (A2 M9.3),
       herança da aprovação dos Pontos de verificação (decisão 201).
     - **Status**: o mapa A1 + A2 aguarda as duas pendências acima e a aprovação final da dona.
215. **A1 M5.1 "Perguntar o preço e pagar" fica com 11 palavras** (*soixante-dix, quatre-vingts, quatre-vingt-dix, cent, zéro, combien, mille, coûter, le prix, payer,
     le numéro de téléphone*): *coûter* e *le prix* ficam como cartões, **exceção à regra 13 aceita pela dona** (como a M2.5, decisão 207). 4 lições + Revisão da unidade
     (os +10 min já estavam contados no M5, ~3h05). Fecha a pendência da decisão 214 (sai da seção 7 do `08 v2`). Contas sem mudança.
216. **Verbos irregulares: opção B aprovada** (fecha a pendência das decisões 203 a, 210 e 214; a opção A, cartões espalhados com exceções à regra 13, fica descartada).
     - **A1: unidade nova de vocabulário "Verbos muito usados"** (id novo **`A1-36`**), só de **reconhecimento**: cartão do **infinitivo com o significado** e 1 ou 2
       exemplos "Na frase" (com a tradução visível, regra 11 refinada pela decisão 211), **sem tabela de conjugação e sem exercícios de produção**. Paradigma, regras e
       produção ficam nas gramáticas Premium; a Conjugação grátis continua fora da trilha. Cartões (6): *aller, faire, vouloir, pouvoir, devoir, voir*. ***voir* sai da A1 M9.1**,
       que volta a **10** palavras (todas publicadas), sem exceção à regra 13, e a 3 lições + Revisão (−10 min; a frase publicada *Quel film vous allez voir ?* fica na M9.1,
       com a chave: ilustra *le film*). Unidade nova (nasce aberta, não concluída, regra 2.10): 3 lições + Revisão da unidade, ~25 min.
     - **Posição: A1 M4.1, no começo do módulo "Comer e beber"**; as antigas M4.1 a M4.6 passam a **M4.2 a M4.7** (ids iguais; `UNITS` reordenado pelo `curriculo_ops.js`).
       Critério 1, **primeiro uso na trilha gratuita**: os verbos aparecem pela 1ª vez em diálogo no M4 (*Voilà, ça fait cinq euros.*, M4.2; *Tu veux un dessert ?*, M4.3;
       *Vous voulez combien de pommes ?*, M4.4; fórmulas *je voudrais, je vais prendre*, M4.2, e *je fais les courses*, M4.3); do M1 ao M3 nenhum diálogo publicado ou novo
       os usa (a fala *On se voit quel jour ?* da M3.3 já é trocada, decisão 202); antes só há a fórmula *vous pouvez répéter* (M1.1) e frases "Na frase" (*Il va se réveiller
       tôt demain.*, M3.1), permitidas. Critério 2, **carga** (teto de 3h45 por módulo): no fim do M2, o módulo iria de ~3h45 a ~4h10; no começo do M3 (ou no fim), de ~3h35 a
       ~4h00; no começo do M4, de ~3h20 a **~3h45**, dentro do teto. Os dois candidatos sugeridos (fim do M2, começo do M3) passariam do teto; o começo do M4 é o ponto mais
       cedo que respeita o teto e ainda vem antes de todos os diálogos que usam os verbos.
     - **Versão grátis ligada** (coluna "Versão grátis" do `08 v2`): *aller* → A1 M6.4 (g); *faire* → A1 M4.7 (g) *faire / prendre* (*prendre* fica só em fórmula); *vouloir,
       pouvoir, devoir* → A1 M9.2 (g) modais. Os exemplos da M9.2 podem voltar a usar *voir* (já é cartão).
     - **A2** (como já estava na tabela da opção B): ***savoir* e *connaître*** na A2 M6.3 (12 → 14 → 12: ***l'échange*** e ***la faute*** vão para a nota de vocabulário
       "Mais sobre aprender", **a revisar pela dona**); ***dire*** na A2 M7.2 (11 → 12); ***donner*** na A2 M4.2 (12 → 13 → 12: ***se faire mal*** vai para a nota de
       vocabulário "Mais na consulta", **a revisar pela dona**). Os ganchos grátis das gramáticas A2 M4.4 (COI, *Le médecin lui donne...*), A2 M6.4 (*savoir* x *connaître*)
       e A2 M7.3 (*Il dit que...*) passam a ter o verbo como cartão na unidade de vocabulário logo antes.
     - **Pergunta da dona: "a unidade grátis tira o privilégio do Premium?"** Resposta registrada: **não**. O grátis **reconhece** (significado, exemplos e revisão
       espaçada), o Premium **sistematiza e produz** (paradigma completo, regras de uso e exercícios de conjugar e completar nas gramáticas). É o mínimo da regra 12 (versão
       grátis antes da gramática); registrado na regra 12 do `15` e na seção 2.1 do `08 v2`.
     - **Regra 14 conferida**: os 10 verbos não são cartão em nenhuma outra unidade (as expressões com *faire*, como *faire escale* ou *faire le ménage*, e *au revoir* são
       expressões diferentes, com cartão próprio).
     - **Totais novos**: **A1** com 9 módulos, **57 unidades (34 + 23)**, **357 cartões** (352 + 6 − *voir*, que muda de unidade = +5; soma 60 + 33 + 50 + **48** + 31 + 30 +
       34 + 41 + **30**), **~30h15** (M1 3h35, M2 3h45, M3 3h35, **M4 3h45**, M5 3h05, M6 3h05, M7 2h50, M8 3h15, **M9 3h20**; nenhum módulo passa de 3h45), lições **~148**
       (+4 da M4.1, −1 da M9.1), notas ~132 (a M4.1 não tem nota prevista); **A2** com 10 módulos, 58 unidades (36 + 22), **428 cartões (418 novos + 10 publicados)** (427 + 4
       verbos − 3 que vão para nota; M7 47 → 48), ~33h10 (sem mudança), notas **~76** (+2 notas de vocabulário).
217. **Pendências da seção 7 do `08 v2` limpas**: saem as linhas dos verbos irregulares (decisão 216) e do tamanho da A1 M5.1 (decisão 215). Os itens "a revisar pela dona"
     que ficam dentro do mapa (exceções M2.1, M3.3, M8.5; *adorer, se coucher, la boisson* em nota; *confirmer*; *se faire mal, l'échange, la faute* em nota) são revistos
     **junto com a aprovação do mapa**, e a herança da aprovação dos Pontos de verificação (decisão 201) é escolha da implementação, não passo antes da aprovação.
     **Único próximo passo**: a **passada final do agente `auditor-curricular`** sobre o mapa com as decisões 215 e 216 (unidade nova `A1-36`, renumeração do A1 M4, *voir* fora
     da M9.1, cartões novos do A2, regra 11 nos diálogos do M4 e regra 14) e a **aprovação do mapa pela dona**; depois, a Etapa 0b parte 2 e o conteúdo módulo a módulo.
     Greps de posições obsoletas feitos no `08 v2`, `15`, `16` e `00` (M9.1 com *voir*, 352, ~30h00, M5.1 "a confirmar", A1 M4.1 a M4.6 da numeração antiga); nos trechos
     históricos (decisões até a 215, contas "Antes", seções 6 e 8 do `08 v2`), *A1 M4.1 a M4.6* = M4.2 a M4.7 de hoje.

---

# Trigésima primeira rodada (2026-10-23)

218. **"Só reconhecimento" (unidade nova "Verbos muito usados")** aprovado: um cartão só por verbo (francês → significado), sem produção na lição nem no Ponto de verificação.
219. ***l'enfant*** fica na unidade "Apresentar a família" (módulo "Família e pessoas próximas"): é conteúdo A1 e central na família.
220. ***le restaurant*** vira cartão na unidade "Pedir no restaurante" (módulo "Comer e beber").
221. **Como falar com a dona**: sempre o nome do módulo e da unidade, nunca só a posição ou o id; explicar termos internos; contexto completo (também no `auditor-curricular`).
222. **Revisão do cartão "Na frase" pedida**: antes de seguir com a decisão 211, repensar o que é o cartão "Na frase", onde as frases de exemplo são usadas (exemplo na ficha da palavra, cartão de Revisão e exercícios da lição) e o que cada uso pode conter.
223. **Nota de *excusez-moi* / *excuse-moi***: fica na unidade "Cumprimentar e se despedir" (módulo "Apresentar-se"), junto de *pardon* (e a menção a *désolé(e)*, que tem
     cartão em "Convidar, aceitar, recusar e se desculpar"); não se repete em "Perguntar e indicar o caminho". Confiança alta.
224. ***prendre*** continua com cartão em "Pegar transporte" (módulo "Na cidade"). Entram na lista fechada de expressões fixas ***je vais prendre*** e ***je voudrais*** (café e
     restaurante), que aparecem antes do cartão. "Verbos muito usados" fica com os seis verbos.
225. **"Vistas"**: as palavras de uma nota de vocabulário contam como vistas nos **diálogos** (com tradução); **não** contam em ditados nem em Desafios. A nota fica dentro da lição
     e não dá para pular no sistema; se o aluno escolhe não ler, o prejuízo é dele.
226. **"Na frase" com palavra nova (refina a 211 e a 222)**: a frase com palavra nova pode aparecer na ficha, na Revisão e nos exercícios da lição que **não pedem digitar**
     (reordenar, traduzir por blocos, cenário, completar tocando). Fica **fora do Ponto de verificação do módulo e do Teste de Nível** (onde o aluno digita a frase inteira ou
     escreve o que ouviu), **exceto** quando a frase é **essencial para a função comunicativa** da unidade (ex.: *L'addition, s'il vous plaît* em "Pedir no restaurante"):
     essa o aluno precisa saber usar, e pode ser cobrada. Cada frase "Na frase" tem então uma marca: **essencial** (cobrável em qualquer lugar) ou **só exemplo** (nunca no
     exame do módulo nem no Teste de Nível). A marca é decidida por frase, na revisão de texto abaixo, e a regra de exclusão é aplicada por função pura testável (não por `if` solto).
227. **Revisão de texto das frases "Na frase"**: passar por cada cartão do mapa, marcar cada frase como essencial ou só exemplo com esse critério, e reportar à dona por módulo
     e unidade. Faz parte da implementação do conteúdo (módulo a módulo), junto com a marca no código.

---

# Trigésima segunda rodada (2026-10-23): revisão geral das decisões e grade comum

Base: revisão de todas as decisões 1 a 227 pedida pela dona; ela aceitou **todos** os itens (N1 a N10 e T1 a T8). Vale desta decisão em diante.

228. **N1. Mapa em dados**: `docs/i18n/curriculo/mapa.json` (módulos, unidades com id estável, cartões, notas com tipo/confiança/gancho, gramática com "versão grátis em").
     Contagens, tempos e tabelas do `08` passam a ser **geradas** dele; ninguém digita total. [a fazer, por script com teste]
229. **N2. Nome e id em toda conversa e registro**: "M4.2" é só rótulo gerado da ordem; vale para qualquer documento (estende a 221).
230. **N3. Dividir o `12`**: decisões (o quê e o porquê, um parágrafo), exceções (dado, ver 232) e histórico de contas. Os padrões de tela (decisões 1 a 36) vão para
     `.claude/rules/`. [a fazer; nada se descarta, só se move]
231. **N4. Regra 13 simplificada**: A1 até **12** palavras por unidade aberta, com 4 lições + Revisão da unidade acima de 10; conjunto fechado pode passar; fim das exceções
     caso a caso. Não mexe nas unidades já aprovadas.
232. **N5. Registro de exceções em dado** (`excecoes.json`): expressões fixas aceitas, unidades acima do limite, "diálogo como entrada". Entrada nova só com o OK da dona;
     o `auditor-curricular` lê dali. O texto da regra 11 deixa de carregar a lista.
233. **N6. Validador "só palavras vistas"** em `tests/curriculo/` (diálogos, exercícios, ditados e Desafios contra cartões, notas vistas e exceções) e campo `papel` de cada
     frase "Na frase" (essencial / só exemplo, decisão 226), aplicado por função pura.
234. **N7. Modelo fixo de nota** (tipo, confiança, gancho, "versão grátis de qual gramática", texto); a dona aprova cada módulo numa página só, com as notas lado a lado.
235. **N8. Mapa congelado na aprovação**: depois dela, mudança só por pedido de mudança, com o auditor rodando.
236. **N9. Piloto de ponta a ponta antes dos outros módulos**: A1 "Apresentar-se", que já tem maquete; calibra esforço, modelo de nota e validador.
237. **N10. Bloqueios de código**: (a) **não herdar** a aprovação dos Pontos de verificação quando o módulo novo divide menos da metade das unidades com o antigo (resolve a 201;
     casos de borda vão para a dona); (b) o `curriculo_ops.js` reordena `UNITS` junto com o nível, com teste de `isFirstOfLevel` e da cadeia.
238. **T1 a T3 (grade comum)**: cada unidade tem um **id de função** que não muda entre idiomas (ex.: `pedir-no-restaurante`) e cada idioma liga o seu id estável a ele;
     a grade guarda **critérios** (campo, quantidade, conjunto fechado), não palavras; cada slot gramatical tem estado por idioma: **reusa, adapta ou omite/substitui**,
     com justificativa (pt, confiança média: partitivo e ligação omitem; *passé composé* adapta, pois no Brasil se fala o pretérito perfeito simples; *tu/vous* vira *você / o senhor*).
239. **T4 a T8**: notas de realidade/culturais não se reaproveitam, só o **slot**; exercícios, Pontos de verificação, Desafios, validadores e auditor valem para todos os
     idiomas; **gerador** `novo-idioma` cria o esqueleto a partir da grade (etapa E8); **ordem**: aprovar o mapa fr, extrair a grade por script, piloto no pt (`piloto-pt/`);
     o mandarim usa a mesma grade com slots próprios (escrita, tons, caracteres), sem forçar a grade latina.
240. **Correções que a revisão pediu** (aplicadas no `15`): regra 4 reescrita à luz da regra 12; pendências a conferir: contagem de "Pedir no restaurante" com *le restaurant*
     (220), *confirmer*, exceções M2.1/M3.3/M8.5/M9.1 e as palavras que foram para nota (*adorer, se coucher, la boisson, la chemise*).

241. **Exceções à regra 13 resolvidas pelo limite novo (decisão 231)**: "Apresentar a família" (11), "Dizer o dia e combinar" (12), "Falar do tempo e das estações" (11) e "Falar de lazer" (10) deixam
     de ser "a revisar pela dona"; "Falar de lazer" já tinha voltado a 10 com *voir* em "Verbos muito usados" (216).
242. ***le restaurant* em "Pedir no restaurante" (módulo "Comer e beber") sem estourar o teto de 3h45**: ***le menu* deixa de ser cartão** (continua ensinado pela nota "*le menu* x *la carte*");
     a unidade fica com 10 palavras (*le petit-déjeuner, le déjeuner, le dîner, la carte, l'entrée, le plat, commander, le verre, l'addition, le restaurant*). Conferido: *le menu* não aparece em `fr/content.js`
     (não é cartão publicado). Se a conferência no ledger `published_ids.json` achar o cartão, a unidade volta a 11 e o módulo a 3h55 (decisão a reabrir).
243. ***confirmer*** fica em "Escrever para convidar, recusar e agradecer" (módulo "Comunicar e se relacionar", A2).
244. **Palavras em nota continuam em nota**: *adorer* ("Mais gostos"), *se coucher* ("Mais rotina") e *la boisson* ("Mais no restaurante"). ***la chemise* volta a cartão** em "Comprar roupas" (módulo "Compras"),
     que fica com 11 (4 lições + Revisão, +10 min no módulo, que continua abaixo do teto); a nota "Outras roupas" perde *la chemise* e segue com *la veste, le manteau, le sac*.
245. **Título das notas de vocabulário: em discussão** (a dona propôs "Outras palavras de/na/sobre ...", "Mais sobre ..." ou "Indo além" sem tema). Até decidir, os títulos atuais ficam como provisórios.
246. **Título das notas de vocabulário (fecha a 245)**: dois formatos, escolhidos pela natureza da nota. **"Outras palavras de/em/sobre ..."** para lista de itens da mesma categoria
     (ex.: "Outras palavras de roupa", "de cor", "de material", "de traços", "de países", "de moradia"); **"Mais sobre ..."** para o resto (ex.: "Mais sobre família", "sobre rotina",
     "sobre gostos", "sobre o restaurante", "sobre a consulta", "sobre aprender"). "Indo além" não é usado. Os títulos provisórios do `08 v2` são padronizados no próximo lote do editor.
247. ***se faire mal*** fica na nota "Mais sobre a consulta" ("Na consulta", módulo "Saúde e bem-estar", A2); *avoir mal* e *la douleur* já cobrem a função; a expressão volta em frase "Na frase". Fecha o "a revisar".
248. ***l'échange*** e ***la faute*** ficam na nota "Mais sobre aprender" ("Falar do aprendizado de línguas", módulo "Estudos e projetos", A2): palavras de apoio, não da função da unidade. Fecha o "a revisar".
249. **Desculpa no presente com modal** (*Désolée, je ne peux pas, je dois travailler.*) aceita como exemplo de desculpa de "Convidar, aceitar, recusar e se desculpar" (módulo "Lazer, convites e passado", A1); o gratuito
     entende pela nota de "Falar de lazer". Fecha o "a revisar". A regra 4 da seção 2.1 do `08 v2` foi alinhada à do `15` (decisão 240).

# Trigésima terceira rodada (2026-10-26): respostas à passada final do auditor

Base: `auditoria/2026-10-26-a1-a2-passada-final.md`, seção 3. A dona aceitou D2 a D5 e respondeu parte da D6; a D1 (*prendre*) foi resolvida pela decisão 255.

250. **D2, fórmulas de diálogo**: aceitas como fórmula, sem cartão, no `excecoes.json` (232): *Ça te va ?* (vem de *ça va*), *Merci beaucoup*, *Parfait*, *Vous désirez ?*, *Autre chose ?*, *C'est tout*.
     **Trocadas nos diálogos**: *cinq minutes* ("Perguntar e indicar o caminho"), *la bonne direction* e *centre-ville* ("Pegar transporte"); as frases "Na frase" com *centre-ville* ficam.
251. **D3, palavras soltas com o limite de 12**: ***chercher*** vira cartão em "Comprar roupas" (módulo "Compras", 11 → 12, +5 min); ***le balcon*** entra na nota "Outras palavras de moradia"
     ("Tipos de moradia e cômodos"); ***la clé*** vira cartão em "Móveis e objetos da casa" (10 → 11, ao lado de *La porte est fermée à clé.*). Contagens e tempos recalculados no próximo lote do editor.
252. **D4, regra 16 no `15`**: teto de **3h45 por módulo**, com exceção registrada do último módulo de cada nível (A2 "Opinião, cultura e mundo", ~3h55).
253. **D5, "vistas"**: **toda nota que mostra a expressão com tradução** (vocabulário, explicação, realidade ou cultural) conta como vista **nos diálogos**; não conta em ditados nem em Desafios. O exemplo dentro de
     nota segue a regra das frases "Na frase" (226). Refina a 225.
254. **D6 (parcial)**: nota N33 de "Pegar transporte": ***à vélo*** é a forma tradicional e recomendada; ***en vélo*** é muito comum na fala (confiança média; fonte a dona); o texto não diz "incorreto".
     A nota ***très / super / hyper*** ("Tipos de moradia e cômodos") é **descartada** (notas do A1 −1). Falta responder: destino das frases `A1-3-p6` e `p7` (recomendação: *Quel est l'âge de ton père ?* fica em "Dizer a idade").
255. **D1, *prendre* como cartão em "Verbos muito usados"** (módulo "Comer e beber", logo no começo; opção a): o cartão publicado `A1-14-v6` muda de unidade com a mesma chave; a unidade fica com
     **7 verbos** (*aller, faire, vouloir, pouvoir, devoir, voir, prendre*), só reconhecimento (218). "Pegar transporte" (módulo "Na cidade") fica com 9 palavras, sem o rótulo "*prendre* (já visto)" como cartão
     próprio. Revoga a parte da decisão 224 que mantinha o cartão em "Pegar transporte" e a recusa de pôr *prendre* na unidade nova; *je vais prendre* e *je voudrais* continuam expressões fixas na lista.
     Não precisa trocar *je la prends*, o ditado `d3-p2` nem o Desafio `lt-a1m3-006` por causa de *prendre*. Se o tempo de "Comer e beber" passar de 3h45, a regra 16 (252) é revista ou o módulo reduz em outro ponto.
256. **D6, frases `A1-3-p6` e `p7`**: *Quel est l'âge de ton père ?* fica em "Dizer a idade"; a outra segue o destino definido na revisão geral. Fecha a D6.
257. **Teto de tempo sobe para 3h50 por módulo** (opção a; revê a 252): "Comer e beber" fica com ~3h50 depois do cartão *prendre* em "Verbos muito usados"; as estimativas têm confiança baixa (não medidas) e não se criam exceções por
     módulo. Mantida a exceção do último módulo de cada nível (A2 "Opinião, cultura e mundo", ~3h55). Regra 16 do `15` e linha 16 do `08 v2` atualizadas.
258. **Frase *J'ai deux frères et trois sœurs.*** (`A1-3-p6`) vai, com a chave, para "Apresentar a família" (módulo "Família e pessoas próximas"), como na revisão geral de 2026-10-23; *Quel est l'âge de ton père ?* fica em "Dizer a idade" (256).

# Trigésima quarta rodada (2026-10-26): aprovação do mapa

259. **MAPA A1 + A2 APROVADO PELA DONA E CONGELADO** (2026-10-26): A1 com 9 módulos, 57 unidades, **360 cartões**, ~30h40; A2 com 10 módulos, 58 unidades, **428 cartões** (418 novos + 10 publicados), ~33h10 (`08-mapa-final-a1-a2-v2.md`,
     decisões 1 a 258). Daqui em diante (decisão 235) o mapa só muda por **pedido de mudança**, com o `auditor-curricular` rodando. Próximos passos, sem tocar em produção nem em código do site: `mapa.json` e `excecoes.json`
     gerando as contas (228, 232), teste de coerência, depois implementação (reordenar `UNITS`, campo `papel`, validador "só palavras vistas") e o piloto "Apresentar-se"; cada passo que mexer em código ou dado em produção pede autorização própria.

260. **Respostas aos achados do `mapa.json`** (2026-10-26). **Versão grátis num lugar só**: vale o `versao_gratis_em` da gramática; a unidade de vocabulário **não** repete a ligação ("abriga a versão grátis de" deixa de existir
     no dado e vira função derivada `gramaticasAbrigadasPor`, com teste); a dona não vê necessidade de citar a unidade que abriga. ***l'euro*** vale **para o A1 inteiro** (exceção da 209, só em frase, sem cartão; `excecoes.json`).
261. **Tempo do A1 = número estimado e digitado** por módulo (`tempo_08_min`), sem fórmula inventada; o A2 segue a regra (40 min por vocabulário, 25 por gramática). Medir de verdade exige dados de uso reais (produção): só com autorização.
262. **Lições fora da regra mantidas como aprovadas**: "Dizer o nome e a nacionalidade" com 5 lições e "Corpo e dores" com 4 (`licoes_08` no dado), registradas como exceção.
263. **`id_funcao` das gramáticas é provisório** (alguns carregam palavra do francês); o nome do slot gramatical da grade comum se define na extração (T7).
264. **Notas**: a contagem do A1 passa a ser a do `mapa.json` (132) e a do A2 também (76); os "~131" e a interpretação das 76 do `08` ficam como histórico.
265. **Validador e papel (respostas às escolhas do agente)**: o Ponto de verificação da unidade ("Revisão da unidade") fica **fechado** para frases "só exemplo" (cobra produção); as notas que mostram a expressão com tradução contam como vistas
     **só nos diálogos**, não nos exercícios da lição (refina a 253). Para as notas de explicação, realidade e cultura contarem como vistas, falta um campo de palavras no `mapa.json` (pedido de mudança no mapa).
266. **Piloto de ponta a ponta**: começa pela unidade "Cumprimentar e se despedir" (A1-1) do módulo "Apresentar-se", em rascunho pt-BR em `docs/i18n/curriculo/piloto-m1/A1-1/` (JSON + leitura para a dona); en só depois da aprovação (81);
     nada entra em `fr/content.js` antes da aprovação da dona e da autorização para mexer em código.

# Trigésima quinta rodada (2026-10-27): respostas ao piloto da unidade "Cumprimentar e se despedir" (A1-1)

Base: `piloto-m1/A1-1/A1-1.md`. **Pedido de mudança ao mapa congelado (decisão 235)**: itens 270 e 271; aplicar em `mapa.json` e `08` e rodar o `auditor-curricular` antes de implementar.

267. **Nota "Ça va ? sobe, Ça va. desce" sai** do rascunho (a dona); some o risco do TTS (decisão 11 segue aberta só para o futuro). Nota nova sobre ***mademoiselle*** entra (Real, confiança alta): hoje é evitado (aposentado
     dos formulários oficiais em 2012); *madame* serve para qualquer mulher adulta. Notas do A1-1: 8; do A1: 132.
268. **Aceitos como propostos**: D1 (*Pardon ?* cobra "pedir para repetir"; *Pardon ? Vous pouvez répéter ?* só exemplo), D2 (*salut* e *au revoir* trocam de lição; lições 1 e 2 renomeadas), D3 (objetivo novo), D5 (V/F depois da nota "Letras mudas"),
     D8 (frase "Aqui o **s** de *plus* soa."), D11 (traduções no feminino). **D4**: tradução de *De rien, c'est normal.* = **"De nada, é normal."** (mais próxima, nível iniciante).
269. **D6**: ***bonne journée / bonne soirée*** vira **cartão em par** em A1-1 (despedida do dia, formal ou informal; não é Desafio); ***Ça marche !*** vai para os Desafios de Expressão do módulo "Lazer, convites e passado"
     ("Convidar, aceitar, recusar e se desculpar").
270. ***monsieur / madame*** vira **cartão em par** em A1-1 (regra 1; padrão de *bonjour / salut*) e há um **diálogo formal** novo, mais longo, além do informal de Léa e Hugo. A1-1 fica com **12 palavras**, 4 lições + Revisão da unidade;
     "Apresentar-se" vai a **~3h55** (+20 min). **Teto do tempo por módulo sobe para 3h55** para todos (revisa a 257): some a exceção do último módulo de cada nível. A1: **362 cartões**, 717 A/B, ~151 lições, ~31h00 (a recalcular no
     `mapa.json`). Rascunho do diálogo formal (a dona pediu mais fala): cena "À noite, na portaria do prédio: o Sr. Martin encontra a vizinha, Sra. Dubois." com *Bonsoir, madame.* / *Bonsoir, monsieur. Comment allez-vous ?* /
     *Très bien, merci. Et vous, madame ?* / *Très bien, merci.* / *Bonne soirée, madame !* / *Merci, monsieur. Au revoir !* / *Au revoir, madame !*
271. ***Comment allez-vous ?*** (formal) entra com ***ça va ?*** (informal) por regra 1: proposta de **par no mesmo cartão** (`A1-1-v8`, mesma chave, como a decisão 48); **aguarda OK da dona** (o validador acusa *allez* sem isso).
272. **D7**: pergunta e opções das Expressões dos Desafios ficam **no idioma do site, no site inteiro** (fr, zh e pt); em francês ficam só a expressão e os exemplos.
273. **D9** (campo `exampleK`: frase do cartão escolhida por nós) e **D10** (cenários das frases "só exemplo" recriados **dentro das lições**; a dona gosta dos cenários) aceitos; **ambos exigem código e entram na implementação**
     (autorização própria), sem perda dos cenários.
274. **Lacunas do modelo**: campo `palavras` das notas **gerado dos exemplos com tradução** da própria nota (não digitado); `licao` por cartão no `mapa.json`; `audios_previstos` na nota; `risco` **opcional** (só quando houver).
275. **Pronúncia no cartão e tradução literal (estilo Memrise) — respostas parciais, sem implementar**: tradução **literal só quando difere** da natural (expressões e fórmulas); campos na **ficha da palavra e no verso da Revisão** (não na frente);
     o campo cuida da **palavra**, e as **notas de pronúncia ficam só para fenômenos** que cruzam palavras (letras mudas, ligação, entonação, com lição própria quando houver conteúdo); respelling gerado por **script com tabela de regras +
     exceções escritas e revisadas** (confiança por item, `needs_review`), literais à mão; ficam na **camada do curso** (por idioma do site). **Em aberto**: como marcar os sons difíceis sem pôr texto extra no cartão (a dona não quer tirar foco da
     palavra + tradução). Grilling em andamento.
