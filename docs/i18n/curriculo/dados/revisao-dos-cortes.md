# Revisão dos cortes (decisão 308), A1 e A2 do francês

Data: 2026-10-31. Pedido da dona (decisão 308): listar cada item que foi cortado, rebaixado para nota de vocabulário, deixado "só em frase" ou movido
para Desafio **por causa do limite de palavras por unidade (regra 13 antiga) ou do teto de tempo por módulo (regra 16)**, para ela decidir se volta a
ser cartão. Critério novo (decisão 319): **de 3 a 5 cartões novos por lição**; o objetivo comunicativo decide o tamanho da unidade; mais de ~18 cartões
é só aviso. Nada foi mudado no mapa: este arquivo é só insumo para a decisão. Se a dona aprovar alguma volta, é **pedido de mudança** ao mapa congelado
(decisão 235): `mapa.json` e `08 v2`, `node fr/scripts/curriculo_mapa.js --conferir` e o `auditor-curricular`.

Fontes: `12-decisoes-apos-maquete-m1.md` (decisões 45, 85, 89, 91, 129, 139, 147, 149, 157, 163, 177, 197, 199, 205 a 216, 241 a 248, 251, 257, 270, 276,
290, 308, 313, 319), `15-regras-do-curriculo.md` (regras 13, 14 e 16), `08-mapa-final-a1-a2-v2.md` (colunas Palavras, Notas e Muda; seção 4, tabela
"Palavras que viram nota de vocabulário por passar do limite"), `dados/mapa.json` (notas de vocabulário com `palavras`), `dados/ACHADOS.md`, e as listas
de origem do `04-lacunas-e-propostas-fr.md` e do `08-revisao-por-funcao-comunicativa.md` (para achar o que saiu do A2 sem motivo escrito).

## Como ler

- **Motivo "limite" ou "tempo" (explícito)**: a decisão diz que o item saiu para caber no limite ou no teto. É **candidato a voltar**.
- **Motivo implícito**: a decisão não diz o porquê, mas o item saiu numa troca "uma por uma" para a unidade ficar em 12, ou nasceu numa nota de
  vocabulário criada para a unidade não crescer. Também é candidato, com menos certeza sobre o motivo.
- **Outro motivo** (regra 14 "uma palavra, um cartão", registro, desuso, foco pedagógico): **não é candidato**; vai na lista à parte, no fim.
- **Utilidade**: estimativa minha (alta, média, baixa), pelo uso no dia a dia e no DELF A1/A2, **sem corpus de frequência consultado** (confiança média).
- **Efeito na lição**: quantos cartões a unidade passa a ter e como cabem em lições de 3 a 5. Hoje o código dá 3 lições para até 10 palavras e 4 acima
  disso (`licoesPelaRegra`); pela regra nova, 13 a 15 cartões cabem em 3 lições de 4 a 5, e 12 cabem em 3 lições de 4.
- **Efeito na Revisão**: cada cartão de palavra gera 2 itens de Revisão (francês → significado e o inverso; os "só reconhecimento" geram 1). Pela
  medição real (decisão 297), uma lição leva ~108 s para 3 a 4 cartões (~30 s por cartão novo) e a Revisão da unidade ~159 s para ~11 cartões (~15 s por
  cartão). **Cada cartão que volta custa ~45 s na trilha** (estimativa, amostra pequena, confiança baixa). Nenhum módulo muda de forma visível.

---

## A1

### Módulo "Apresentar-se"

Nenhum item saiu por limite ou tempo que ainda esteja de pé. Na unidade "Cumprimentar e se despedir", *Comment vas-tu ? / Comment allez-vous ?* foi
para nota pelo limite (decisão 276), mas a dona voltou ao assunto depois de o limite cair e manteve a nota (decisão 313); entra na lista "fora da revisão".

### Módulo "Família e pessoas próximas"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *les grands-parents* | "Apresentar a família" | nota de vocabulário "Mais sobre família" | 199 (com 197): a unidade já passava do limite com *l'enfant*; o `08` (seção 4) põe na tabela "por passar do limite". **Limite** | **alta**: "apresentar a família" sem avós fica incompleto; DELF A1 (falar de si e da família) | **voltar a cartão**. Unidade 11 → 13 (com *marié*) |
| *marié / mariée* | "Apresentar a família" | mesma nota | 199, mesmo motivo. **Limite** | **alta**: estado civil (*Je suis marié(e)*, *Vous êtes marié ?*) aparece em ficha e apresentação | **voltar a cartão**, com uma decisão de regra 14: *se marier* é cartão de "Contar as fases da vida" (A2). Precedente contra: *blessé* x *se blesser* ficou um cartão só (162). Precedente a favor: *goûter* x *le goûter* (157). Sugiro os dois (estado no A1, ação no A2). Com as duas voltas: 13 cartões em 3 lições (5, 4, 4) ou 4 (4, 3, 3, 3); a nota "Mais sobre família" some; Revisão +4 itens |
| *laid* | "Descrever a aparência" | nota "Outras palavras de traços" | 139 (corte para 10) e 147 (*brun* voltou, *laid* ficou). **Limite** | **baixa**: dizer que alguém é feio é raro e soa grosseiro | **manter na nota** |

Na mesma unidade, a nota "Outras palavras de traços" tem palavras que **nunca foram cartão** (motivo implícito: a nota de vocabulário foi o método para a
unidade não crescer; decisões 89 e 149):

| Palavra | O que é | Utilidade | Recomendação e efeito |
|---|---|---|---|
| *beau / belle* (*beau, bel, belle*) | entrou na nota no lugar de *les lunettes* (149) | **alta**: uma das palavras mais usadas para descrever pessoa, lugar e coisa; formas irregulares | **voltar a cartão** (par de formas, como *bonjour / salut*) |
| *long*, *court* | cabelo comprido e curto (89) | **alta** fora da unidade também (roupa, tempo: *trop court*) | **voltar a cartão** (dois cartões). Com *beau / belle*: unidade 11 → 14, 3 lições (5, 5, 4); Revisão +6 itens |
| *châtain, roux, bouclé, raide, la barbe* | outros traços (89) | média a baixa | **manter na nota** |

### Módulo "Rotina e calendário"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *se coucher* | "Dizer as horas e a rotina" | nota "Mais sobre rotina" | 197: palavra menos importante que não era cartão publicado; 244 manteve. **Limite** | **alta**: par natural de *se lever*; "contar o dia" (DELF A1) | **voltar a cartão**. Unidade 12 → 13, 3 lições (5, 4, 4) ou 4; a "Gramática: verbos pronominais" ganha um terceiro pronominal com cartão; a nota some; Revisão +2 itens |

### Módulo "Comer e beber"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *adorer* | "Gostos e pedidos no café" | nota "Mais sobre gostos" | 197 (a unidade ia a 12 com *aimer*); 244 manteve. **Limite** | **alta**: *J'adore !* é das reações mais comuns; já está em frase publicada (*Les parents adorent leurs enfants.*) | **voltar a cartão**. Unidade 12 → 13; *aimer bien* fica na nota (nuance, não função). Também dispensa trocar frases com *adorer* (o custo citado na 197). Revisão +2 |
| *la boisson* | "Pedir no restaurante" | nota "Mais sobre o restaurante" | 197; 244 manteve. **Limite** | **alta**: *Et comme boisson ?* é a pergunta-padrão do garçom | **voltar a cartão** |
| *le menu* | "Pedir no restaurante" | deixou de ser cartão; só na nota "*le menu* x *la carte*" | 242: entrou *le restaurant* e saiu *le menu* "para não passar do teto de 3h45". **Tempo** | **alta**: é o falso amigo da unidade (menu = prato do dia a preço fixo); quem pede no restaurante precisa saber usar | **voltar a cartão**, mantendo a nota de contraste (a nota esclarece, o cartão ensina: decisão 287). Com *la boisson*: unidade 10 → 12, 3 lições de 4 (o número de lições não muda); a nota "Mais sobre o restaurante" some; Revisão +4 |

### Módulo "Compras"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *en espèces* | "Perguntar o preço e pagar" | nota "Mais sobre pagamento e contato" | 129 (corte de 13 para 10), aprovado na 205. **Limite** | **média-alta**: *Vous payez en espèces ou par carte ?* é a pergunta do caixa | **voltar a cartão** |
| *le portable* | "Perguntar o preço e pagar" (hoje cartão em "Telefonar e deixar recado", A2) | nota no A1; cartão só no A2 | 129 (corte), depois 206 (virou cartão no A2 porque não cabia no A1). **Limite** | **alta**: dar o celular é conteúdo de A1 (ficha, contato) | **voltar a cartão no A1**; "Telefonar e deixar recado" (A2) usa em frase e fica com 11 (regra 14) |
| *le mail* | "Perguntar o preço e pagar" (hoje cartão em "Internet e redes", A2) | nota no A1; cartão só no A2, no lugar de *l'écran* | 129 e 206. **Limite** | **alta**: *mon adresse mail* é A1 | **voltar a cartão no A1**; em "Internet e redes" (A2) *le mail* passa a frase e *l'écran* volta (ver A2). Com as três voltas, a unidade vai de 11 a 14 e cabe em **3 lições** em vez de 4: números (*soixante-dix, quatre-vingts, quatre-vingt-dix, cent, mille*), preço e pagamento (*combien, coûter, le prix, payer, en espèces*), contato (*zéro, le numéro de téléphone, le portable, le mail*). A nota de vocabulário some; a nota *courriel / arobase* passa a vir depois do cartão *le mail*. Revisão +6 |
| *le cuir* | "Cores e materiais" | nota "Outras palavras de material" | 129 (corte de 11 para 10), aprovado na 205. **Limite** | média (*des chaussures en cuir*) | **manter na nota**: é item de uma categoria aberta, como *la laine* |

Itens que **nunca foram cartão**, em notas criadas para a unidade não crescer (motivo implícito):

| Palavra | Unidade e nota | Utilidade | Recomendação |
|---|---|---|---|
| *la veste, le manteau, le sac* | "Comprar roupas", "Outras palavras de roupa" (nota criada pela 197, quando *la chemise* foi para lá; *la chemise* voltou na 244) | média (*le sac* alta fora da loja) | **manter na nota**; a unidade já tem 12 e roupa é categoria aberta |
| *la laine, le papier, la soie, la pierre* | "Cores e materiais", "Outras palavras de material" (85: "em vez de um cartão para cada") | média a baixa | **manter na nota** (*le plastique* e *le métal* são cartões de "Descrever um objeto", A2) |
| *violet, beige, doré, argenté* | "Cores e materiais", "Outras palavras de cor" (91) | baixa | **manter na nota** |

### Módulo "Na cidade"

Nenhum item saiu por limite ou tempo. (*cinq minutes, la bonne direction, centre-ville* foram trocados nos diálogos pela regra 11, decisão 250; não
eram cartão.)

### Módulo "Casa e moradia"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *le studio* | "Tipos de moradia e cômodos" | nota "Outras palavras de moradia" | 129 (8 publicados + 5 novos = 13, cortado para 10), aprovado na 205. **Limite** | **média-alta**: tipo de moradia comum (estudante, aluguel) | **voltar a cartão** |
| *l'immeuble* | idem | mesma nota | 129. **Limite** | **alta**: na França a maioria das pessoas na cidade mora em prédio; é "tipo de moradia", o título da unidade | **voltar a cartão** |
| *le jardin* | idem | mesma nota | 129. **Limite** | **alta**; já está em frase publicada (*La fenêtre donne sur le jardin.*, "Móveis e objetos da casa") | **voltar a cartão** |
| *le balcon* | idem | mesma nota | 251: "palavras soltas com o limite de 12"; está numa fala publicada. **Limite** | média | **voltar a cartão** (a fala publicada passa a ter cartão, sem depender da nota). Com as quatro voltas: unidade 10 → 14, 3 lições (tipos: *la maison, l'appartement, le studio, l'immeuble, l'adresse*; cômodos: *la chambre, la cuisine, la salle de bain, le salon, les toilettes*; partes e *il y a*: *le jardin, le balcon, il y a, il n'y a pas de*); a nota some; Revisão +8 |

### Módulo "Viagem e férias"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *le Japon* | "Países e cidades" | nota "Outras palavras de países" | 129 (de 11 para 10), aprovado na 205. **Limite** | baixa a média para o aluno brasileiro; os países masculinos da gramática já têm exemplos (*le Portugal, le Canada, le Brésil*) | **manter na nota**. Observação: a nota diz "*le Japon*..." (lista aberta, `ACHADOS` item 14); vale fechar a lista com países próximos do aluno (ex.: *l'Argentine, le Mexique, la Chine*), a decidir |

### Módulo "Lazer, convites e passado"

Nenhum item saiu por limite ou tempo que ainda esteja de pé (*voir* só mudou de unidade, para "Verbos muito usados", decisão 216).

---

## A2

### Módulo "Lembranças e fases da vida"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| excedente de "Descrever o caráter (antes e hoje)" | "Descrever o caráter (antes e hoje)" | nota "Outras palavras de caráter", **sem lista** | 139: a unidade caiu de 13 para 12 pelo limite do A2. **Limite**. Qual palavra saiu não está registrado (`ACHADOS` itens 13 e 14) | a lista de origem (`08-revisao-por-funcao-comunicativa.md`, seção 3.4) tinha *bavard, sociable, égoïste, paresseux, ambitieux*, que não estão na lista final | **voltar a cartão *bavard / bavarde* e *paresseux / paresseuse*** (alta: muito usados para descrever amigos, e fazem par com *généreux* e com o trabalho), e **pôr *sociable, égoïste, ambitieux* na nota** (média), que hoje está vazia. Unidade 12 → 14, 3 lições (5, 5, 4); Revisão +4 |

### Módulo "Objetos e consumo"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *en ligne* | "Comprar on-line e reclamar" | só em frase | 163: "*en ligne* vira frase", na mesma lista em que entrou *cordialement*; motivo não escrito. **Implícito** (troca para ficar em 12) | **alta**: *acheter en ligne, payer en ligne*; é a palavra do título da unidade | **voltar a cartão**. Regra 14 já conferida (*la ligne*, "Telefonar e deixar recado", é outra palavra, decisão 190). Unidade 12 → 13; Revisão +2 |

### Módulo "Saúde e bem-estar"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *se faire mal* | "Na consulta" | nota "Mais sobre a consulta" | 216: saiu para *donner* entrar e a unidade ficar em 12. **Limite**. Depois a 247 confirmou pela função (*avoir mal* e *la douleur* já cobrem) | média | **manter na nota** (a dona já confirmou por motivo pedagógico) |
| *le dentiste* | estava na lista de "Emergências" (`04`); ficou fora de todas | sem cartão | 167: "fica fora das listas do M4", sem motivo escrito; a lista de "Emergências" ficou em 12. **Implícito** (provavelmente também por não ser emergência) | média: consulta comum para quem mora fora | **voltar a cartão em "Na consulta"** (não em "Emergências"). Unidade 12 → 13; Revisão +2 |

### Módulo "Estudos e projetos"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *la note* (nota escolar) | "Contar a formação" | só em frase (*J'ai eu une bonne note à l'examen.*) | 177: *le bac* entrou "no lugar de *la note*"; motivo não escrito. **Implícito** (troca para ficar em 12) | **alta**: falar de prova e de nota é central em "contar a formação" | **voltar a cartão**, mantendo *le bac*. Unidade 12 → 13; Revisão +2 |
| *la faute* | "Falar do aprendizado de línguas" | nota "Mais sobre aprender" | 216: saiu para *savoir* e *connaître* entrarem e a unidade ficar em 12. **Limite**. A 248 chamou de "palavra de apoio" | **alta** para quem aprende língua: *faire une faute*, *une faute d'orthographe* | **voltar a cartão**. Unidade 12 → 13 (os dois verbos são só reconhecimento, então a carga de Revisão é menor); Revisão +2 |
| *l'échange* | idem | mesma nota | 216 e 248, mesmo motivo. **Limite** | média (intercâmbio) | **manter na nota** |

### Módulo "Comunicar e se relacionar"

| Palavra | Unidade | O que aconteceu | Decisão e motivo | Utilidade | Recomendação e efeito |
|---|---|---|---|---|---|
| *l'écran* | "Internet e redes" | frase e nota, sem cartão | 206: saiu para *le mail* entrar com a unidade em 12. **Limite** | **alta**: *l'écran est cassé*, tela do celular e do computador | **voltar a cartão**. Se *le mail* voltar ao A1 (ver "Compras"), *l'écran* ocupa o lugar e a unidade continua com 12; se não, vai a 13. Revisão +2 |

Nos módulos "Contar uma experiência", "À mesa", "Trabalho, dinheiro e papelada", "Moradia e cidade" e "Opinião, cultura e mundo" nada saiu por limite ou
tempo (as saídas foram por regra 14 ou por foco da unidade; ver abaixo).

---

## Já voltaram (não precisam de decisão)

*brun* ("Descrever a aparência", 147), *la ville* ("Dizer de onde é e onde mora", 207), *le prix* ("Perguntar o preço e pagar", 214 e 215), *la chemise*
("Comprar roupas", 244). E *chercher* e *la clé* entraram pela 251.

## Decisão de posição tomada pelo teto (não é corte)

- **"Verbos muito usados" no começo de "Comer e beber"** (216): o fim de "Família e pessoas próximas" e o começo de "Rotina e calendário" foram
  recusados só porque passariam do teto de 3h45. O outro critério (primeiro uso em diálogo, que é no módulo "Comer e beber") continua valendo, então
  **recomendo manter a posição**; fica aqui só para a dona saber que o teto pesou.

## Fora da revisão (outro motivo; não são candidatos)

- **Decisões recentes da dona, já tomadas depois de o limite cair**: *Comment vas-tu ? / Comment allez-vous ?* na nota (313); *très bien, bof, pas mal*
  só na nota "Como responder" (313, 314); *moi aussi* fora de "Cumprimentar e se despedir" (320); *Comme ci, comme ça* (desuso, 290); notas "Bienvenue no
  Quebec" e da *bise* (311).
- ***Ça marche !***: nunca foi cartão; é Desafio de Expressão e só mudou de módulo, para "Convidar, aceitar, recusar e se desculpar" (269, motivo de
  lugar). Observação: é muito usado para aceitar convite; se a dona quiser, pode virar cartão nessa unidade (hoje com 10), mas isso é proposta nova, não
  volta de corte.
- **Regra 14 (uma palavra, um cartão)**: *le verre* = vidro (só nota em "Cores e materiais"); *lumineux* e *spacieux* fora de "Descrever a moradia" (184);
  no A2, *l'enfant* e *d'habitude* ("Contar como era a infância"), *calme, bruyant, moderne, ancien* ("Comparar antes e agora"), *la police* ("Contar um
  acontecimento"), *en bois, en verre* ("Descrever um objeto"), *les yeux* e *se blesser* ("Emergências"), *la forme, être en forme* ("Hábitos saudáveis"),
  *sérieux* ("Procurar emprego"), *la banque, la poste, la mairie*, *le quartier, la circulation, la nature, propre, l'église*, *allô, bisous, cher / chère*.
- **Foco ou nível da unidade (pedagógico)**: *gentil, sympa, timide* para "Descrever o caráter" (89, 120); *l'ambulance* para "Emergências" (117);
  *savoir* para o A2, contraste com *connaître* (95); *récemment* para o A2 (74); *le match, l'équipe, gagner* fora de "Hábitos saudáveis" (168);
  *toucher, le parfum* fora de "Descrever sabores" (172); *la lettre, le timbre* fora de "Serviços e papelada" (142); *le règlement, permettre, défendre,
  stationner* fora de "Entender regras e avisos", revista para a cidade (121, 184); *tranquille* fora de "Comparar antes e agora" (sinônimo de *calme*, 155);
  *les lunettes* fora da nota de traços (149); *l'euro* só em frase no A1 inteiro (209, 260).

---

## Resumo

- **Candidatos: 48 palavras.** 25 com motivo explícito de limite ou tempo (16 no A1, 9 no A2, contando as 5 palavras de origem do excedente de
  "Descrever o caráter") e 23 com motivo implícito (20 no A1, todas em notas de vocabulário que nunca foram cartão; 3 no A2, trocas para ficar em 12).
- **Recomendo voltar 23**: 16 no A1 (*les grands-parents, marié / mariée, beau / belle, long, court, se coucher, adorer, la boisson, le menu, en espèces,
  le portable, le mail, le studio, l'immeuble, le jardin, le balcon*) e 7 no A2 (*bavard, paresseux, en ligne, le dentiste, la note, la faute, l'écran*).
  *le portable* e *le mail* saem do A2 (viram frase lá) e *l'écran* volta no lugar de *le mail*.
- **Efeito**: A1 +16 cartões (de 366 para 382), A2 +5 (de 428 para 433). Nenhuma unidade passa de ~18 cartões (as maiores ficam com 14) e todas cabem em
  3 ou 4 lições de 3 a 5 cartões; "Perguntar o preço e pagar" e "Tipos de moradia e cômodos" até podem cair para 3 lições. Somem 5 notas de vocabulário do A1
  ("Mais sobre família", "Mais sobre rotina", "Mais sobre o restaurante", "Mais sobre pagamento e contato", "Outras palavras de moradia"); no A2 nenhuma
  some, e "Outras palavras de caráter" ganha lista, o que também segue a decisão 287 (nota não carrega o que o aluno precisa saber usar). Pela medição
  real, ~45 s a mais por cartão na trilha (~12 min no A1 inteiro), confiança baixa.
- **As 10 mais importantes**: (1) *se coucher*, (2) *adorer*, (3) *la boisson*, (4) *le menu*, (5) *les grands-parents*, (6) *marié / mariée*,
  (7) *beau / belle*, (8) *le portable*, (9) *l'immeuble*, (10) *la faute*.
- **Decisões que dependem da dona além do "volta ou não"**: *marié / mariée* x *se marier* (regra 14); *le portable* e *le mail* saindo do A2; a lista da
  nota "Outras palavras de caráter" (hoje vazia); a lista fechada de "Outras palavras de países".
