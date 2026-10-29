# Relatório "só palavras vistas" (gerado)

Gerado por `node fr/scripts/curriculo_palavras_vistas.js --relatorio` em 2026-10-29. **Não editar à mão.**
Só informativo (decisão 233): é a lista de reescrita ao vivo do conteúdo publicado medido na posição do mapa NOVO (`mapa.json`). O site ainda
segue a ordem antiga, então muita coisa aparece aqui sem ser erro no site de hoje. Regras e limitações: `fr/scripts/curriculo_palavras_vistas.js`
e `docs/guia-do-desenvolvedor.md`.

- **Não vista**: a forma não é cartão anterior (nem da própria unidade), nem nota com tradução (só diálogos), nem exceção de `excecoes.json`, nem palavra funcional.
- **Incerta**: começa com o radical de um verbo já visto, mas a forma não foi gerada (verbo irregular). Conferir à mão ou acrescentar em `dados/formas_extras.json`.
- **Frases "Na frase"** são medidas como se fossem *essenciais* (contexto exame do módulo): com palavra não vista, a frase só pode ficar como *só exemplo* (decisão 226) ou ser trocada.
- Ditados ficam na última unidade (na ordem nova) do módulo antigo a que pertencem; Desafios do A1, na unidade do `unitId`; Desafios de `fr/challenges.js` do A2, no fim do A2.

## Resumo

| Seção | Textos | Com achado | Não vistas | Incertas |
|---|---:|---:|---:|---:|
| Diálogos | 87 | 14 | 16 | 0 |
| Opções do "Você entendeu?" | 80 | 16 | 17 | 0 |
| Verdadeiro ou falso | 8 | 3 | 3 | 0 |
| Frases "Na frase" (como se fossem essenciais) | 182 | 97 | 134 | 1 |
| Gramáticas: telas | 62 | 29 | 37 | 0 |
| Gramáticas: exercícios | 64 | 30 | 41 | 0 |
| Ditados | 21 | 8 | 9 | 0 |
| Desafios: texto da tarefa | 123 | 45 | 83 | 0 |
| Desafios: enunciado em francês | 30 | 30 | 187 | 0 |
| **Total** | 657 | 272 | 527 | 1 |

Palavras não vistas diferentes: 271 (165 viram cartão ou nota mais adiante no mapa; 106 não estão no mapa).

**As 10 palavras não vistas mais frequentes** (textos em que aparecem; onde o mapa ensina):

1. *dire*: 18 (cartão em "Procurar emprego" (A2-20))
2. *dit*: 15 (cartão em "Procurar emprego" (A2-20))
3. *bon*: 10 (sem cartão no mapa)
4. *quelqu'un*: 7 (sem cartão no mapa)
5. *veut*: 7 (cartão em "Verbos muito usados" (A1-36))
6. *faim*: 6 (sem cartão no mapa)
7. *tout*: 6 (cartão em "Perguntar e indicar o caminho" (A1-8))
8. *autre*: 5 (sem cartão no mapa)
9. *demande*: 5 (sem cartão no mapa)
10. *ensemble*: 5 (sem cartão no mapa)

**As 10 incertas mais frequentes:**

1. *bons*: 1

**Fora do mapa (não medidos):** 9: Desafio expr-001 (nível B1, fora do mapa A1/A2); Desafio expr-002 (nível B1, fora do mapa A1/A2); Desafio expr-003 (nível B1, fora do mapa A1/A2); Desafio accent-auto-001 (nível B1, fora do mapa A1/A2); Desafio accent-auto-002 (nível B1, fora do mapa A1/A2); Desafio accent-auto-003 (nível B1, fora do mapa A1/A2); Desafio accent-auto-004 (nível B1, fora do mapa A1/A2); Desafio accent-auto-005 (nível B1, fora do mapa A1/A2); Desafio accent-auto-006 (nível B1, fora do mapa A1/A2).

## Achados por módulo e unidade (ordem do mapa novo)

### A1 M1 "Apresentar-se"

#### M1.1 "Cumprimentar e se despedir" (A1-1)

- Verdadeiro ou falso, `A1-1 V/F 1`: "Merci beaucoup !". não vistas: *beaucoup* (cartão em "Pedir quantidades na feira" (A1-12)).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p0`: "Bonjour ! Je m'appelle {nome}.". não vistas: *appelle* (cartão em "Dizer o nome e a nacionalidade" (A1-2)).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p1`: "Merci beaucoup !". não vistas: *beaucoup* (cartão em "Pedir quantidades na feira" (A1-12)).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p2`: "Pardon, je ne comprends pas.". não vistas: *comprends* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p4`: "Bonsoir ! Comment allez-vous ?". não vistas: *allez-vous* (nota em "Cumprimentar e se despedir" (A1-1)).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p5`: "Au revoir, à demain !". não vistas: *demain* (cartão em "Dizer o dia e combinar" (A1-7)).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p7`: "De rien, c'est normal.". não vistas: *est* (cartão em "Dizer o nome e a nacionalidade" (A1-2)), *normal* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-1-p8`: "Un café, s'il vous plaît.". não vistas: *café* (cartão em "Gostos e pedidos no café" (A1-5)).
- Desafios: texto da tarefa, `lt-a1m1-002 (listen_translate)`: "Un café, s'il vous plaît.". não vistas: *café* (cartão em "Gostos e pedidos no café" (A1-5)).
- Desafios: texto da tarefa, `expr-a1m1-002 (expression)`: "Comme ci, comme ça / Ça va ? — Comme ci, comme ça. / Mon français ? Comme ci, comme ça. / Ça va ? — comme ci, comme ça.". não vistas: *ci* (sem cartão no mapa), *français* (cartão em "Dizer o nome e a nacionalidade" (A1-2)).
- Desafios: enunciado em francês, `expr-a1m1-002 (expression)`: "Que veut dire « comme ci, comme ça » ? / Moyen, ni bien ni mal / Très bien / Très mal / Tout de suite / Ni bien ni mal ; moyen.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *ci* (sem cartão no mapa), *moyen* (sem cartão no mapa), *mal* (nota em "Cumprimentar e se despedir" (A1-1)), *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)), *suite* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m1-003 (expression)`: "Pas mal / Ça va ? — Pas mal, merci ! / Ce café est pas mal. / Ça va ? — pas mal, merci !". não vistas: *mal* (nota em "Cumprimentar e se despedir" (A1-1)), *café* (cartão em "Gostos e pedidos no café" (A1-5)), *est* (cartão em "Dizer o nome e a nacionalidade" (A1-2)).
- Desafios: enunciado em francês, `expr-a1m1-003 (expression)`: "Que veut dire « pas mal » ? / Plutôt bien / Très mauvais / Très cher / Très tard / Plutôt bien.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *mal* (nota em "Cumprimentar e se despedir" (A1-1)), *plutôt* (sem cartão no mapa), *mauvais* (sem cartão no mapa), *cher* (cartão em "Comprar roupas" (A1-10)), *tard* (cartão em "Dizer as horas e a rotina" (A1-6)).
- Desafios: texto da tarefa, `expr-a1m1-004 (expression)`: "Ça marche ! / Un café ensemble ? — Ça marche ! / Je t'appelle ce soir. — Ça marche ! / Un café ? — Ça marche !". não vistas: *marche* (cartão em "Comprar on-line e reclamar" (A2-8)), *café* (cartão em "Gostos e pedidos no café" (A1-5)), *ensemble* (sem cartão no mapa), *appelle* (cartão em "Dizer o nome e a nacionalidade" (A1-2)), *soir* (cartão em "Dizer as horas e a rotina" (A1-6)).
- Desafios: enunciado em francês, `expr-a1m1-004 (expression)`: "Que veut dire « Ça marche ! » ? / D'accord, c'est bon / Je ne comprends pas / J'ai faim / Au revoir / D'accord ; c'est bon.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *marche* (cartão em "Comprar on-line e reclamar" (A2-8)), *d'accord* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)), *est* (cartão em "Dizer o nome e a nacionalidade" (A1-2)), *bon* (sem cartão no mapa), *comprends* (sem cartão no mapa), *ai* (cartão em "Dizer a idade: de 1 a 29" (A1-3)), *faim* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m1-005 (expression)`: "Pas de problème ! / Pardon ! — Pas de problème ! / Tu peux m'aider ? — Pas de problème. / Pardon ! — Pas de problème !". não vistas: *problème* (cartão em "Contar um imprevisto" (A2-5)), *peux* (cartão em "Verbos muito usados" (A1-36)), *aider* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m1-005 (expression)`: "Que veut dire « Pas de problème ! » ? / Ce n'est pas grave / C'est très difficile / Je suis fatigué / Je ne sais pas / Ce n'est pas grave ; d'accord.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *problème* (cartão em "Contar um imprevisto" (A2-5)), *est* (cartão em "Dizer o nome e a nacionalidade" (A1-2)), *grave* (cartão em "Emergências" (A2-11)), *difficile* (sem cartão no mapa), *suis* (cartão em "Dizer o nome e a nacionalidade" (A1-2)), *fatigué* (sem cartão no mapa), *sais* (cartão em "Falar do aprendizado de línguas" (A2-17)), *d'accord* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).

#### M1.2 "Dizer o nome e a nacionalidade" (A1-2)

- Frases "Na frase" (como se fossem essenciais), `A1-2-p4`: "Quel est le nom de la ville ?". não vistas: *ville* (cartão em "Dizer de onde é e onde mora" (A1-9)).
- Frases "Na frase" (como se fossem essenciais), `A1-2-p5`: "J'aime la France.". não vistas: *aime* (cartão em "Gostos e pedidos no café" (A1-5)).
- Frases "Na frase" (como se fossem essenciais), `A1-2-p6`: "Le Brésil est très grand.". não vistas: *grand* (cartão em "Descrever a aparência" (A1-16)).
- Frases "Na frase" (como se fossem essenciais), `A1-2-p7`: "Le pays est magnifique.". não vistas: *magnifique* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m1-001 (expression)`: "Enchanté ! / Bonjour, je m'appelle Léo. — Enchanté ! / Je suis Ana. Enchantée ! / Bonjour, je m'appelle Ana. — Enchanté !". não vistas: *enchanté* (sem cartão no mapa), *enchantée* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m1-001 (expression)`: "Quand dit-on « Enchanté ! » ? / Quand on rencontre quelqu'un / Quand on dit au revoir / Quand on a faim / Quand on est fatigué / On le dit quand on rencontre quelqu'un pour la première fois.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *enchanté* (sem cartão no mapa), *rencontre* (sem cartão no mapa), *quelqu'un* (sem cartão no mapa), *a* (nota em "Cumprimentar e se despedir" (A1-1)), *faim* (sem cartão no mapa), *fatigué* (sem cartão no mapa), *première* (sem cartão no mapa), *fois* (cartão em "Frequência" (A1-35)).

#### M1.3 "Dizer a idade: de 1 a 29" (A1-3)

- Frases "Na frase" (como se fossem essenciais), `A1-3-p4`: "Combien ça coûte ?". não vistas: *combien* (cartão em "Perguntar o preço e pagar" (A1-28)), *coûte* (cartão em "Perguntar o preço e pagar" (A1-28)).
- Frases "Na frase" (como se fossem essenciais), `A1-3-p5`: "Il fait zéro degré dehors.". não vistas: *fait* (cartão em "Verbos muito usados" (A1-36)), *zéro* (cartão em "Perguntar o preço e pagar" (A1-28)), *degré* (sem cartão no mapa), *dehors* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-3-p6`: "J'ai deux frères et trois sœurs.". não vistas: *frères* (cartão em "Apresentar a família" (A1-4)), *sœurs* (cartão em "Apresentar a família" (A1-4)).
- Frases "Na frase" (como se fossem essenciais), `A1-3-p7`: "Quel est l'âge de ton père ?". não vistas: *père* (cartão em "Apresentar a família" (A1-4)).
- Desafios: texto da tarefa, `accent-a1m1-005 (accent)`: "zéro". não vistas: *zéro* (cartão em "Perguntar o preço e pagar" (A1-28)).

#### M1.5 "Gramática: être e avoir" (A1-g1)

- Gramáticas: telas, `A1-g1 tela 2 ex. 2`: "Elle est ma sœur.". não vistas: *sœur* (cartão em "Apresentar a família" (A1-4)).
- Gramáticas: telas, `A1-g1 tela 3 ex. 1`: "J'ai faim.". não vistas: *faim* (sem cartão no mapa).
- Gramáticas: telas, `A1-g1 tela 3 ex. 2`: "Elle a raison.". não vistas: *raison* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g1 exercício 1`: "Je suis étudiante.". não vistas: *étudiante* (cartão em "Dizer a profissão" (A1-22)).
- Gramáticas: exercícios, `A1-g1 exercício 4`: "Ils ont deux enfants.". não vistas: *enfants* (cartão em "Apresentar a família" (A1-4)).
- Gramáticas: exercícios, `A1-g1 exercício 6`: "Elle a faim.". não vistas: *faim* (sem cartão no mapa).

### A1 M2 "Família e pessoas próximas"

#### M2.1 "Apresentar a família" (A1-4)

- Frases "Na frase" (como se fossem essenciais), `A1-4-p4`: "La famille est très importante.". não vistas: *importante* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p5`: "Le père travaille en ville.". não vistas: *travaille* (cartão em "Dizer as horas e a rotina" (A1-6)), *ville* (cartão em "Dizer de onde é e onde mora" (A1-9)).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p6`: "La mère prépare le dîner.". não vistas: *prépare* (sem cartão no mapa), *dîner* (cartão em "Pedir no restaurante" (A1-25)).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p7`: "Le frère et la sœur jouent ensemble.". não vistas: *jouent* (cartão em "Falar de lazer" (A1-19)), *ensemble* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p8`: "Les parents adorent leurs enfants.". não vistas: *adorent* (nota em "Gostos e pedidos no café" (A1-5)).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p9`: "Le fils et la fille aiment l'école.". não vistas: *aiment* (cartão em "Gostos e pedidos no café" (A1-5)), *l'école* (cartão em "Lugares da cidade" (A1-30)).
- Frases "Na frase" (como se fossem essenciais), `A1-4-p10`: "Le mari et la femme habitent à Paris.". não vistas: *habitent* (cartão em "Dizer de onde é e onde mora" (A1-9)).

#### M2.3 "Descrever a aparência" (A1-16)

- Diálogos, `A1-16-d2`: "Il est sympa ?". não vistas: *sympa* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Diálogos, `A1-16-d3`: "Oui, il est très gentil !". não vistas: *gentil* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Opções do "Você entendeu?", `A1-16 check listen opção 1`: "Oui, il est très gentil !". não vistas: *gentil* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Opções do "Você entendeu?", `A1-16 check listen opção 2`: "Il est sympa ?". não vistas: *sympa* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p0`: "J'aime la couleur bleue.". não vistas: *aime* (cartão em "Gostos e pedidos no café" (A1-5)), *couleur* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p1`: "Elle est très gentille.". não vistas: *gentille* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p2`: "Mon chat est noir et blanc.". não vistas: *chat* (sem cartão no mapa), *blanc* (cartão em "Cores e materiais" (A1-29)).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p3`: "C'est une jolie robe rouge.". não vistas: *robe* (cartão em "Comprar roupas" (A1-10)), *rouge* (cartão em "Cores e materiais" (A1-29)).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p4`: "Le pull est vert et jaune.". não vistas: *pull* (cartão em "Comprar roupas" (A1-10)), *jaune* (cartão em "Cores e materiais" (A1-29)).
- Frases "Na frase" (como se fossem essenciais), `A1-16-p5`: "Le chien est petit.". não vistas: *chien* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-a1m5-001 (listen_translate)`: "Ma sœur est grande et gentille.". não vistas: *gentille* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-a1m5-002 (listen_translate)`: "Son pull est rouge.". não vistas: *pull* (cartão em "Comprar roupas" (A1-10)), *rouge* (cartão em "Cores e materiais" (A1-29)).
- Desafios: texto da tarefa, `expr-a1m5-004 (expression)`: "Ça te va bien ! / Cette robe rouge, ça te va bien ! / Ça te va bien, le bleu. / Ce pull vert, ça te va bien !". não vistas: *robe* (cartão em "Comprar roupas" (A1-10)), *rouge* (cartão em "Cores e materiais" (A1-29)), *pull* (cartão em "Comprar roupas" (A1-10)).
- Desafios: enunciado em francês, `expr-a1m5-004 (expression)`: "Que veut dire « Ça te va bien ! » ? / C'est joli sur toi / C'est trop petit / C'est trop cher / C'est sale / Ce vêtement ou cette couleur te va bien.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *sur* (cartão em "Dizer onde as coisas estão" (A1-18)), *trop* (cartão em "Pedir quantidades na feira" (A1-12)), *cher* (cartão em "Comprar roupas" (A1-10)), *sale* (cartão em "Dividir apartamento e vizinhos" (A2-24)), *vêtement* (sem cartão no mapa), *couleur* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m5-005 (expression)`: "Ça te plaît ? / Ma nouvelle maison, ça te plaît ? / Ça te plaît, cette couleur ? / Cette robe, ça te plaît ?". não vistas: *nouvelle* (cartão em "Sentimentos e reações" (A2-29)), *maison* (cartão em "Tipos de moradia e cômodos" (A1-17)), *couleur* (sem cartão no mapa), *robe* (cartão em "Comprar roupas" (A1-10)).
- Desafios: enunciado em francês, `expr-a1m5-005 (expression)`: "Que veut dire « Ça te plaît ? » ? / Tu aimes ça ? / Tu as faim ? / Tu es fatigué ? / Tu viens ? / On demande si quelqu'un aime quelque chose.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *aimes* (cartão em "Gostos e pedidos no café" (A1-5)), *faim* (sem cartão no mapa), *fatigué* (sem cartão no mapa), *viens* (cartão em "Dizer de onde é e onde mora" (A1-9)), *demande* (sem cartão no mapa), *quelqu'un* (sem cartão no mapa), *aime* (cartão em "Gostos e pedidos no café" (A1-5)), *quelque* (sem cartão no mapa), *chose* (sem cartão no mapa).

#### M2.4 "Gramática: possessivos" (A1-g2)

- Gramáticas: telas, `A1-g2 tela 3 ex. 1`: "C'est mon amie Sophie.". não vistas: *amie* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).
- Gramáticas: telas, `A1-g2 tela 3 ex. 2`: "Son école est loin.". não vistas: *école* (cartão em "Lugares da cidade" (A1-30)), *loin* (cartão em "Perguntar e indicar o caminho" (A1-8)).
- Gramáticas: exercícios, `A1-g2 exercício 6`: "C'est mon amie.". não vistas: *amie* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).
- Ditados, `ditado d1-p1 (A1-m1)`: "Bonsoir ! Je m'appelle Marc. Je suis français et j'ai vingt-deux ans. Mon amie s'appelle Julie. Elle est brésilienne. Au revoir, à bientôt !". não vistas: *amie* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).

#### M2.5 "Dizer de onde é e onde mora" (A1-9)

- Diálogos, `A1-9-d3`: "Tu habites en Allemagne ?". não vistas: *allemagne* (cartão em "Países e cidades" (A1-31)).
- Diálogos, `A1-9-d4`: "Non, j'habite au Portugal maintenant.". não vistas: *portugal* (cartão em "Países e cidades" (A1-31)), *maintenant* (cartão em "Comparar antes e agora" (A2-2)).
- Opções do "Você entendeu?", `A1-9 check fill opção 2`: "Je suis d'Italie.". não vistas: *italie* (cartão em "Países e cidades" (A1-31)).
- Opções do "Você entendeu?", `A1-9 check listen opção 2`: "Non, j'habite au Portugal.". não vistas: *portugal* (cartão em "Países e cidades" (A1-31)).
- Frases "Na frase" (como se fossem essenciais), `A1-9-p3`: "Je viens du Portugal.". não vistas: *portugal* (cartão em "Países e cidades" (A1-31)).
- Frases "Na frase" (como se fossem essenciais), `A1-9-p4`: "La nationalité est écrite sur le passeport.". não vistas: *sur* (cartão em "Dizer onde as coisas estão" (A1-18)), *passeport* (cartão em "Férias e hotel" (A1-26)).

### A1 M3 "Rotina e calendário"

#### M3.1 "Dizer as horas e a rotina" (A1-6)

- Diálogos, `A1-6-d1`: "Je me lève à six heures et demie.". não vistas: *demie* (cartão em "Pedir quantidades na feira" (A1-12)).
- Opções do "Você entendeu?", `A1-6 check fill opção 1`: "Je me lève à six heures et demie.". não vistas: *demie* (cartão em "Pedir quantidades na feira" (A1-12)).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p3`: "Le soir, je regarde la télé.". não vistas: *regarde* (sem cartão no mapa), *télé* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p4`: "Il regarde l'heure sur son téléphone.". não vistas: *regarde* (sem cartão no mapa), *sur* (cartão em "Dizer onde as coisas estão" (A1-18)), *téléphone* (cartão em "Perguntar o preço e pagar" (A1-28)).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p5`: "Le midi, je mange à la maison.". não vistas: *mange* (cartão em "Gostos e pedidos no café" (A1-5)), *maison* (cartão em "Tipos de moradia e cômodos" (A1-17)).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p6`: "Il va se réveiller tôt demain.". não vistas: *demain* (cartão em "Dizer o dia e combinar" (A1-7)).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p8`: "Il doit travailler jusqu'à minuit.". não vistas: *doit* (cartão em "Verbos muito usados" (A1-36)).
- Frases "Na frase" (como se fossem essenciais), `A1-6-p9`: "Je vais dormir maintenant.". não vistas: *maintenant* (cartão em "Comparar antes e agora" (A2-2)).
- Desafios: texto da tarefa, `expr-a1m2-003 (expression)`: "À tout à l'heure ! / Je vais au marché. — À tout à l'heure ! / Je pars à midi. À tout à l'heure ! / Je pars au travail. — À tout à l'heure !". não vistas: *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)), *marché* (cartão em "Comprar on-line e reclamar" (A2-8)), *pars* (cartão em "Países e cidades" (A1-31)).
- Desafios: enunciado em francês, `expr-a1m2-003 (expression)`: "Quand dit-on « À tout à l'heure ! » ? / Quand on va se revoir bientôt / Quand on ne se revoit jamais / Quand on se voit la semaine prochaine / Quand on arrive / Au revoir, on se voit bientôt dans la journée.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)), *jamais* (cartão em "Frequência" (A1-35)), *voit* (cartão em "Verbos muito usados" (A1-36)), *semaine* (cartão em "Dizer o dia e combinar" (A1-7)), *prochaine* (cartão em "Projetos e sonhos" (A2-18)), *arrive* (cartão em "Contar um acontecimento" (A2-6)), *dans* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Desafios: texto da tarefa, `expr-a1m2-004 (expression)`: "Tout de suite / Tu viens ? — Oui, tout de suite ! / Je viens tout de suite. / Tu viens manger ? — Oui, tout de suite !". não vistas: *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)), *suite* (sem cartão no mapa), *manger* (cartão em "Gostos e pedidos no café" (A1-5)).
- Desafios: enunciado em francês, `expr-a1m2-004 (expression)`: "Que veut dire « tout de suite » ? / Immédiatement / Beaucoup plus tard / Jamais / Le soir / Immédiatement, sans attendre.". não vistas: *veut* (cartão em "Verbos muito usados" (A1-36)), *dire* (cartão em "Procurar emprego" (A2-20)), *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)), *suite* (sem cartão no mapa), *immédiatement* (sem cartão no mapa), *beaucoup* (cartão em "Pedir quantidades na feira" (A1-12)), *jamais* (cartão em "Frequência" (A1-35)), *attendre* (sem cartão no mapa).

#### M3.2 "Gramática: verbos em -er" (A1-g3)

- Gramáticas: telas, `A1-g3 tela 1 ex. 2`: "Tu manges à midi.". não vistas: *manges* (cartão em "Gostos e pedidos no café" (A1-5)).
- Gramáticas: telas, `A1-g3 tela 2 ex. 1`: "Nous mangeons à sept heures.". não vistas: *mangeons* (cartão em "Gostos e pedidos no café" (A1-5)).
- Gramáticas: telas, `A1-g3 tela 2 ex. 2`: "Vous mangez du pain.". não vistas: *mangez* (cartão em "Gostos e pedidos no café" (A1-5)), *pain* (cartão em "Gostos e pedidos no café" (A1-5)).
- Gramáticas: exercícios, `A1-g3 exercício 3`: "Nous mangeons à midi.". não vistas: *mangeons* (cartão em "Gostos e pedidos no café" (A1-5)).
- Gramáticas: exercícios, `A1-g3 exercício 5`: "Vous aimez le fromage ?". não vistas: *aimez* (cartão em "Gostos e pedidos no café" (A1-5)), *fromage* (cartão em "Gostos e pedidos no café" (A1-5)).

#### M3.3 "Dizer o dia e combinar" (A1-7)

- Diálogos, `A1-7-d0`: "On se voit quel jour ?". não vistas: *voit* (cartão em "Verbos muito usados" (A1-36)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p2`: "Mon anniversaire est en mars.". não vistas: *anniversaire* (cartão em "Dizer a data e o aniversário" (A1-24)), *mars* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p4`: "Aujourd'hui, il fait beau.". não vistas: *fait* (cartão em "Verbos muito usados" (A1-36)), *beau* (nota em "Descrever a aparência" (A1-16)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p5`: "La semaine prochaine, je pars en voyage.". não vistas: *pars* (cartão em "Países e cidades" (A1-31)), *voyage* (cartão em "Contar uma viagem" (A2-4)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p6`: "Le mois de janvier est très froid.". não vistas: *janvier* (cartão em "Dizer a data e o aniversário" (A1-24)), *froid* (cartão em "Falar do tempo e das estações" (A1-13)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p7`: "Mon anniversaire est en décembre.". não vistas: *anniversaire* (cartão em "Dizer a data e o aniversário" (A1-24)), *décembre* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Frases "Na frase" (como se fossem essenciais), `A1-7-p8`: "Quelle est la date aujourd'hui ?". não vistas: *date* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Desafios: texto da tarefa, `accent-a1m2-005 (accent)`: "décembre". não vistas: *décembre* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Desafios: texto da tarefa, `accent-a1m2-006 (accent)`: "février". não vistas: *février* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Desafios: texto da tarefa, `accent-a1m2-007 (accent)`: "août". não vistas: *août* (cartão em "Dizer a data e o aniversário" (A1-24)).
- Desafios: enunciado em francês, `expr-a1m2-005 (expression)`: "Quand dit-on « Bonne journée ! » ? / En se quittant le matin ou l'après-midi / En se couchant / Avant de manger / En arrivant / On le dit pour se quitter pendant la journée.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *quittant* (sem cartão no mapa), *couchant* (nota em "Dizer as horas e a rotina" (A1-6)), *avant* (cartão em "Contar o que você fez" (A1-20)), *manger* (cartão em "Gostos e pedidos no café" (A1-5)), *arrivant* (cartão em "Contar um acontecimento" (A2-6)), *quitter* (sem cartão no mapa).

#### M3.7 "Gramática: advérbios de frequência" (A1-g8)

- Gramáticas: telas, `A1-g8 tela 1 ex. 1`: "Je lis toujours le soir.". não vistas: *lis* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: telas, `A1-g8 tela 1 ex. 2`: "Elle joue parfois de la guitare.". não vistas: *joue* (cartão em "Falar de lazer" (A1-19)), *guitare* (sem cartão no mapa).
- Gramáticas: telas, `A1-g8 tela 2 ex. 1`: "Nous sortons souvent le week-end.". não vistas: *sortons* (cartão em "Falar de lazer" (A1-19)), *week-end* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: telas, `A1-g8 tela 2 ex. 2`: "Il chante rarement.". não vistas: *chante* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: telas, `A1-g8 tela 3 ex. 1`: "Je ne danse jamais.". não vistas: *danse* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Gramáticas: telas, `A1-g8 tela 3 ex. 2`: "Il ne sort jamais le lundi.". não vistas: *sort* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g8 exercício 1`: "Je vais toujours au cinéma le week-end.". não vistas: *cinéma* (cartão em "Falar de lazer" (A1-19)), *week-end* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g8 exercício 2`: "Il joue parfois de la guitare.". não vistas: *joue* (cartão em "Falar de lazer" (A1-19)), *guitare* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g8 exercício 3`: "Nous sortons souvent le dimanche.". não vistas: *sortons* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g8 exercício 4`: "Elle ne chante jamais.". não vistas: *chante* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g8 exercício 5`: "Tu lis rarement des livres ?". não vistas: *lis* (cartão em "Falar de lazer" (A1-19)), *livres* (cartão em "Comprar on-line e reclamar" (A2-8)).
- Gramáticas: exercícios, `A1-g8 exercício 6`: "Vous dansez toujours !". não vistas: *dansez* (cartão em "Falar de lazer" (A1-19)).

### A1 M4 "Comer e beber"

#### M4.2 "Gostos e pedidos no café" (A1-5)

- Diálogos, `A1-5-d1`: "Un café et un croissant, s'il vous plaît.". não vistas: *croissant* (sem cartão no mapa).
- Verdadeiro ou falso, `A1-5 V/F 1`: "L'addition, s'il vous plaît.". não vistas: *l'addition* (cartão em "Pedir no restaurante" (A1-25)).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p3`: "L'addition, s'il vous plaît.". não vistas: *l'addition* (cartão em "Pedir no restaurante" (A1-25)).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p6`: "Le café est très chaud.". não vistas: *chaud* (cartão em "Falar do tempo e das estações" (A1-13)).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p7`: "Le lait est dans le frigo.". não vistas: *dans* (cartão em "Dizer onde as coisas estão" (A1-18)), *frigo* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p8`: "La pomme est rouge et sucrée.". não vistas: *rouge* (cartão em "Cores e materiais" (A1-29)).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p10`: "Tu veux boire quelque chose ?". não vistas: *quelque* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-5-p11`: "Je vais détester ce plat, je pense.". não vistas: *plat* (cartão em "Pedir no restaurante" (A1-25)), *pense* (sem cartão no mapa).
- Ditados, `ditado d2 (A1-m2)`: "Il est huit heures du matin. Bonjour, je voudrais du pain, s'il vous plaît, et un croissant. C'est combien ? Merci, au revoir !". não vistas: *croissant* (sem cartão no mapa), *combien* (cartão em "Perguntar o preço e pagar" (A1-28)).
- Ditados, `ditado d2-p2 (A1-m2)`: "Le matin, je me lève à sept heures. Je bois du café et je mange du pain. À midi, je mange du fromage. Il est sept heures du soir, c'est l'heure du dîner.". não vistas: *dîner* (cartão em "Pedir no restaurante" (A1-25)).
- Desafios: texto da tarefa, `expr-a1m2-001 (expression)`: "Bon appétit ! / Voilà ton plat. — Bon appétit ! / Bon appétit, tout le monde ! / Le dîner est prêt. — Bon appétit !". não vistas: *bon* (sem cartão no mapa), *appétit* (sem cartão no mapa), *plat* (cartão em "Pedir no restaurante" (A1-25)), *monde* (sem cartão no mapa), *dîner* (cartão em "Pedir no restaurante" (A1-25)), *prêt* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m2-001 (expression)`: "Quand dit-on « Bon appétit ! » ? / Avant de manger / En se réveillant / En quittant la maison / Quand on est malade / On le dit avant de manger.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *bon* (sem cartão no mapa), *appétit* (sem cartão no mapa), *avant* (cartão em "Contar o que você fez" (A1-20)), *quittant* (sem cartão no mapa), *maison* (cartão em "Tipos de moradia e cômodos" (A1-17)), *malade* (cartão em "Corpo e dores" (A1-15)).
- Desafios: texto da tarefa, `expr-a1m2-002 (expression)`: "À table ! / Les enfants, à table ! / À table ! Le dîner est prêt. / Maman appelle : « À table ! »". não vistas: *table* (cartão em "Móveis e objetos da casa" (A1-34)), *dîner* (cartão em "Pedir no restaurante" (A1-25)), *prêt* (sem cartão no mapa), *maman* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m2-002 (expression)`: "Que veut dire « À table ! » ? / Venez manger / Allez dormir / Allez travailler / Rangez la table / On appelle tout le monde pour manger.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *table* (cartão em "Móveis e objetos da casa" (A1-34)), *rangez* (cartão em "Dividir apartamento e vizinhos" (A2-24)), *monde* (sem cartão no mapa).

#### M4.3 "Fazer a lista do mercado" (A1-11)

- Diálogos, `A1-11-d0`: "Qu'est-ce qu'on achète ?". não vistas: *achète* (cartão em "Comprar roupas" (A1-10)).
- Opções do "Você entendeu?", `A1-11 check listen opção 2`: "Qu'est-ce qu'on achète ?". não vistas: *achète* (cartão em "Comprar roupas" (A1-10)).
- Frases "Na frase" (como se fossem essenciais), `A1-11-p5`: "Les légumes sont bons pour la santé.". incertas: *bons* (bonsoir?).
- Frases "Na frase" (como se fossem essenciais), `A1-11-p6`: "La salade est fraîche.". não vistas: *fraîche* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-11-p7`: "Le riz et les pâtes sont mes plats préférés.". não vistas: *plats* (cartão em "Pedir no restaurante" (A1-25)).
- Frases "Na frase" (como se fossem essenciais), `A1-11-p8`: "Le sucre et le sel sont sur la table.". não vistas: *sur* (cartão em "Dizer onde as coisas estão" (A1-18)), *table* (cartão em "Móveis e objetos da casa" (A1-34)).
- Frases "Na frase" (como se fossem essenciais), `A1-11-p10`: "Le dessert est prêt.". não vistas: *prêt* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-a1m3-005 (listen_translate)`: "J'achète des légumes et du riz.". não vistas: *achète* (cartão em "Comprar roupas" (A1-10)).

#### M4.4 "Pedir quantidades na feira" (A1-12)

- Diálogos, `A1-12-d0`: "Vous voulez combien de pommes ?". não vistas: *combien* (cartão em "Perguntar o preço e pagar" (A1-28)).
- Opções do "Você entendeu?", `A1-12 check listen opção 2`: "Vous voulez combien de pommes ?". não vistas: *combien* (cartão em "Perguntar o preço e pagar" (A1-28)).
- Frases "Na frase" (como se fossem essenciais), `A1-12-p5`: "Il y a beaucoup de monde ici.". não vistas: *monde* (sem cartão no mapa), *ici* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m3-005 (expression)`: "Qui dit « Et avec ça ? » ? / Le vendeur / Le client / Le médecin / Le professeur / Le vendeur demande si vous voulez autre chose.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *client* (cartão em "Comprar on-line e reclamar" (A2-8)), *demande* (sem cartão no mapa), *autre* (sem cartão no mapa), *chose* (sem cartão no mapa).

#### M4.7 "Gramática: faire e prendre" (A1-g5)

- Gramáticas: telas, `A1-g5 tela 1 ex. 1`: "Il fait 30 degrés aujourd'hui.". não vistas: *degrés* (sem cartão no mapa).
- Gramáticas: telas, `A1-g5 tela 2 ex. 1`: "Je prends souvent le métro.". não vistas: *métro* (cartão em "Pegar transporte" (A1-14)).
- Gramáticas: telas, `A1-g5 tela 3 ex. 1`: "Nous prenons le bus ensemble.". não vistas: *bus* (cartão em "Pegar transporte" (A1-14)), *ensemble* (sem cartão no mapa).
- Gramáticas: telas, `A1-g5 tela 3 ex. 2`: "Vous faites quoi ce week-end ?". não vistas: *week-end* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g5 exercício 1`: "Il fait chaud aujourd'hui.". não vistas: *chaud* (cartão em "Falar do tempo e das estações" (A1-13)).
- Gramáticas: exercícios, `A1-g5 exercício 2`: "Je prends le métro tous les jours.". não vistas: *métro* (cartão em "Pegar transporte" (A1-14)).
- Gramáticas: exercícios, `A1-g5 exercício 3`: "Nous faisons du sport le week-end.". não vistas: *sport* (cartão em "Falar de lazer" (A1-19)), *week-end* (cartão em "Falar de lazer" (A1-19)).
- Gramáticas: exercícios, `A1-g5 exercício 5`: "Elles prennent le train ensemble.". não vistas: *train* (cartão em "Pegar transporte" (A1-14)), *ensemble* (sem cartão no mapa).

### A1 M5 "Compras"

#### M5.2 "Gramática: números de 70 a 99" (A1-g10)

- Gramáticas: telas, `A1-g10 tela 3 ex. 2`: "Il y a quatre-vingt-trois personnes.". não vistas: *personnes* (sem cartão no mapa).

#### M5.3 "Comprar roupas" (A1-10)

- Frases "Na frase" (como se fossem essenciais), `A1-10-p6`: "Ce n'est pas cher du tout.". não vistas: *tout* (cartão em "Perguntar e indicar o caminho" (A1-8)).
- Frases "Na frase" (como se fossem essenciais), `A1-10-p8`: "Le magasin ferme à dix-neuf heures.". não vistas: *ferme* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-10-p9`: "Cette veste coûte trente euros.". não vistas: *veste* (nota em "Comprar roupas" (A1-10)).
- Frases "Na frase" (como se fossem essenciais), `A1-10-p11`: "Le manteau coûte soixante-dix euros.". não vistas: *manteau* (nota em "Comprar roupas" (A1-10)).
- Frases "Na frase" (como se fossem essenciais), `A1-10-p13`: "Ce sac coûte quatre-vingt-dix euros.". não vistas: *sac* (nota em "Comprar roupas" (A1-10)).
- Desafios: enunciado em francês, `expr-a1m3-003 (expression)`: "Que veut dire « Ça fait combien ? » ? / Quel est le prix ? / Quelle heure est-il ? / Où est-ce ? / Qui est-ce ? / On demande le prix total.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *demande* (sem cartão no mapa), *total* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m3-004 (expression)`: "C'est trop cher ! / Cent euros ? C'est trop cher ! / Ce sac est joli, mais c'est trop cher. / Quatre-vingts euros ? C'est trop cher !". não vistas: *sac* (nota em "Comprar roupas" (A1-10)).
- Desafios: enunciado em francês, `expr-a1m3-004 (expression)`: "Que veut dire « C'est trop cher ! » ? / Le prix est trop élevé / Le prix est parfait / C'est gratuit / C'est très petit / Le prix est trop élevé.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *élevé* (sem cartão no mapa), *gratuit* (sem cartão no mapa).

### A1 M6 "Na cidade"

#### M6.1 "Perguntar e indicar o caminho" (A1-8)

- Diálogos, `A1-8-d3`: "Non, c'est à cinq minutes.". não vistas: *minutes* (sem cartão no mapa).
- Opções do "Você entendeu?", `A1-8 check listen opção 1`: "Non, c'est à cinq minutes.". não vistas: *minutes* (sem cartão no mapa).
- Verdadeiro ou falso, `A1-8 V/F 1`: "C'est loin d'ici ?". não vistas: *ici* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-8-p3`: "C'est loin d'ici ?". não vistas: *ici* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-8-p4`: "La rue est très calme le soir.". não vistas: *calme* (cartão em "Descrever a moradia" (A1-33)).
- Frases "Na frase" (como se fossem essenciais), `A1-8-p5`: "La place est au centre-ville.". não vistas: *centre* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-8-p6`: "L'hôpital est loin d'ici.". não vistas: *l'hôpital* (cartão em "Lugares da cidade" (A1-30)), *ici* (sem cartão no mapa).
- Desafios: texto da tarefa, `accent-a1m3-002 (accent)`: "hôpital". não vistas: *hôpital* (cartão em "Lugares da cidade" (A1-30)).
- Desafios: texto da tarefa, `expr-a1m3-001 (expression)`: "Excusez-moi ! / Excusez-moi, où est la gare ? / Excusez-moi, je suis en retard. / Excusez-moi, où est le musée ?". não vistas: *retard* (cartão em "Contar um imprevisto" (A2-5)).
- Desafios: enunciado em francês, `expr-a1m3-001 (expression)`: "Quand dit-on « Excusez-moi ! » ? / Pour attirer l'attention poliment / Pour dire au revoir / Pour remercier / Pour refuser / On l'utilise pour attirer l'attention ou s'excuser poliment.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *attirer* (sem cartão no mapa), *attention* (sem cartão no mapa), *poliment* (sem cartão no mapa), *dire* (cartão em "Procurar emprego" (A2-20)), *remercier* (cartão em "Escrever para convidar, recusar e agradecer" (A2-28)), *refuser* (cartão em "Escrever para convidar, recusar e agradecer" (A2-28)), *utilise* (sem cartão no mapa), *s'excuser* (cartão em "Escrever para convidar, recusar e agradecer" (A2-28)).
- Desafios: texto da tarefa, `expr-a1m3-002 (expression)`: "Je vous en prie / Merci beaucoup ! — Je vous en prie. / Je vous en prie, entrez. / Merci ! — Je vous en prie.". não vistas: *prie* (sem cartão no mapa), *entrez* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m3-002 (expression)`: "Que veut dire « Je vous en prie » après « Merci » ? / De rien / Au revoir / Je ne sais pas / Pardon / C'est la réponse polie à « merci » (« de rien », en plus formel).". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *prie* (sem cartão no mapa), *sais* (cartão em "Falar do aprendizado de línguas" (A2-17)), *réponse* (cartão em "Escrever para convidar, recusar e agradecer" (A2-28)), *polie* (sem cartão no mapa), *formel* (sem cartão no mapa).

#### M6.5 "Pegar transporte" (A1-14)

- Diálogos, `A1-14-d0`: "Excusez-moi, ce train va au centre-ville ?". não vistas: *centre* (sem cartão no mapa).
- Diálogos, `A1-14-d1`: "Oui, c'est la bonne direction.". não vistas: *direction* (sem cartão no mapa).
- Opções do "Você entendeu?", `A1-14 check fill opção 1`: "Oui, c'est la bonne direction.". não vistas: *direction* (sem cartão no mapa).
- Opções do "Você entendeu?", `A1-14 check fill opção 2`: "Le train va au centre-ville.". não vistas: *centre* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-14-p5`: "Le train part à huit heures.". não vistas: *part* (cartão em "Países e cidades" (A1-31)).
- Frases "Na frase" (como se fossem essenciais), `A1-14-p6`: "La voiture est garée devant la maison.". não vistas: *devant* (cartão em "Dizer onde as coisas estão" (A1-18)), *maison* (cartão em "Tipos de moradia e cômodos" (A1-17)).
- Frases "Na frase" (como se fossem essenciais), `A1-14-p7`: "Le vélo est plus rapide en ville.". não vistas: *rapide* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-14-p8`: "La station est fermée aujourd'hui.". não vistas: *fermée* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m4-002 (expression)`: "Bon voyage ! / Tu pars demain ? Bon voyage ! / Bon voyage et à bientôt ! / Au revoir, bon voyage !". não vistas: *bon* (sem cartão no mapa), *voyage* (cartão em "Contar uma viagem" (A2-4)), *pars* (cartão em "Países e cidades" (A1-31)).
- Desafios: enunciado em francês, `expr-a1m4-002 (expression)`: "Quand dit-on « Bon voyage ! » ? / À quelqu'un qui part / À quelqu'un qui arrive / À quelqu'un qui mange / À quelqu'un qui dort / On le dit à quelqu'un qui part en voyage.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *bon* (sem cartão no mapa), *voyage* (cartão em "Contar uma viagem" (A2-4)), *quelqu'un* (sem cartão no mapa), *part* (cartão em "Países e cidades" (A1-31)), *arrive* (cartão em "Contar um acontecimento" (A2-6)).

### A1 M7 "Casa e moradia"

#### M7.1 "Tipos de moradia e cômodos" (A1-17)

- Opções do "Você entendeu?", `A1-17 check fill opção 1`: "Oui, il y a un balcon.". não vistas: *balcon* (nota em "Tipos de moradia e cômodos" (A1-17)).
- Opções do "Você entendeu?", `A1-17 check listen opção 1`: "Non, il n'y a pas de balcon.". não vistas: *balcon* (nota em "Tipos de moradia e cômodos" (A1-17)).
- Opções do "Você entendeu?", `A1-17 check listen opção 2`: "Il y a un beau salon.". não vistas: *beau* (nota em "Descrever a aparência" (A1-16)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p2`: "Il n'y a pas de jardin.". não vistas: *jardin* (nota em "Tipos de moradia e cômodos" (A1-17)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p6`: "La chambre est au premier étage.". não vistas: *premier* (sem cartão no mapa), *étage* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p7`: "La cuisine est très propre.". não vistas: *propre* (cartão em "Descrever a moradia" (A1-33)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p8`: "La salle de bain est à côté de la chambre.". não vistas: *côté* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p9`: "Le salon est confortable.". não vistas: *confortable* (cartão em "Descrever a moradia" (A1-33)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p10`: "La porte est fermée à clé.". não vistas: *porte* (cartão em "Móveis e objetos da casa" (A1-34)), *fermée* (sem cartão no mapa), *clé* (cartão em "Móveis e objetos da casa" (A1-34)).
- Frases "Na frase" (como se fossem essenciais), `A1-17-p11`: "La fenêtre donne sur le jardin.". não vistas: *fenêtre* (cartão em "Móveis e objetos da casa" (A1-34)), *donne* (cartão em "Na consulta" (A2-10)), *sur* (cartão em "Dizer onde as coisas estão" (A1-18)), *jardin* (nota em "Tipos de moradia e cômodos" (A1-17)).
- Desafios: texto da tarefa, `lt-a1m5-003 (listen_translate)`: "La cuisine est à côté du salon.". não vistas: *côté* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Desafios: texto da tarefa, `lt-a1m5-004 (listen_translate)`: "Il y a une fenêtre dans la chambre.". não vistas: *fenêtre* (cartão em "Móveis e objetos da casa" (A1-34)), *dans* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Desafios: texto da tarefa, `accent-a1m5-002 (accent)`: "fenêtre". não vistas: *fenêtre* (cartão em "Móveis e objetos da casa" (A1-34)).
- Desafios: texto da tarefa, `accent-a1m5-003 (accent)`: "étage". não vistas: *étage* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m5-001 (expression)`: "Fais comme chez toi / Entre, fais comme chez toi ! / Voilà le salon. Fais comme chez toi. / Entre ! Fais comme chez toi !". não vistas: *entre* (cartão em "Dizer onde as coisas estão" (A1-18)).
- Desafios: enunciado em francês, `expr-a1m5-001 (expression)`: "Quand dit-on « Fais comme chez toi » ? / À un invité, pour qu'il soit à l'aise / À un voisin qui part / À un ami malade / À un client / On dit à un invité de se sentir à l'aise.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *invité* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)), *aise* (sem cartão no mapa), *voisin* (cartão em "Dividir apartamento e vizinhos" (A2-24)), *part* (cartão em "Países e cidades" (A1-31)), *ami* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)), *malade* (cartão em "Corpo e dores" (A1-15)), *client* (cartão em "Comprar on-line e reclamar" (A2-8)), *sentir* (cartão em "Corpo e dores" (A1-15)).
- Desafios: enunciado em francês, `expr-a1m5-002 (expression)`: "Que veut dire « chez moi » ? / Dans ma maison / Dans ton école / Au restaurant / À la gare / À la maison ; dans mon logement.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *dans* (cartão em "Dizer onde as coisas estão" (A1-18)), *logement* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m5-003 (expression)`: "Bienvenue ! / Bienvenue chez moi ! / Bienvenue à Paris ! / Bienvenue chez moi !". não vistas: *bienvenue* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m5-003 (expression)`: "Quand dit-on « Bienvenue ! » ? / Quand on accueille quelqu'un / Quand on part / Quand on mange / Quand on dort / On accueille quelqu'un.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *bienvenue* (sem cartão no mapa), *accueille* (sem cartão no mapa), *quelqu'un* (sem cartão no mapa), *part* (cartão em "Países e cidades" (A1-31)).

#### M7.5 "Dizer onde as coisas estão" (A1-18)

- Opções do "Você entendeu?", `A1-18 check listen opção 2`: "Où est mon sac ?". não vistas: *sac* (nota em "Comprar roupas" (A1-10)).
- Frases "Na frase" (como se fossem essenciais), `A1-18-p2`: "Le chat est sous le canapé.". não vistas: *chat* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-18-p4`: "Le chat est derrière la chaise.". não vistas: *chat* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-a1m5-006 (listen_translate)`: "Le sac est sous la chaise.". não vistas: *sac* (nota em "Comprar roupas" (A1-10)).

#### M7.6 "Gramática: comparativos" (A1-g7)

- Gramáticas: telas, `A1-g7 tela 1 ex. 2`: "Cette robe est plus jolie que l'autre.". não vistas: *autre* (sem cartão no mapa).
- Gramáticas: telas, `A1-g7 tela 2 ex. 2`: "Il est aussi gentil que son frère.". não vistas: *gentil* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Gramáticas: telas, `A1-g7 tela 3 ex. 1`: "Ce gâteau est meilleur que l'autre.". não vistas: *gâteau* (sem cartão no mapa), *meilleur* (sem cartão no mapa), *autre* (sem cartão no mapa).
- Gramáticas: telas, `A1-g7 tela 3 ex. 2`: "Elle chante mieux que moi.". não vistas: *chante* (cartão em "Falar de lazer" (A1-19)), *mieux* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g7 exercício 2`: "Cette maison est moins petite que l'autre.". não vistas: *autre* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g7 exercício 3`: "Il est aussi gentil que sa sœur.". não vistas: *gentil* (cartão em "Descrever o caráter (antes e hoje)" (A2-35)).
- Gramáticas: exercícios, `A1-g7 exercício 4`: "Ce livre est meilleur que l'autre.". não vistas: *livre* (cartão em "Comprar on-line e reclamar" (A2-8)), *meilleur* (sem cartão no mapa), *autre* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g7 exercício 6`: "Ton chat est moins grand que le mien.". não vistas: *chat* (sem cartão no mapa), *mien* (sem cartão no mapa).
- Ditados, `ditado d5 (A1-m5)`: "Ma sœur s'appelle Clara. Elle est grande et gentille. Son appartement est petit. Dans sa chambre, il y a un lit, une table et une lampe.". não vistas: *gentille* (sem cartão no mapa).
- Ditados, `ditado d5-p2 (A1-m5)`: "Dans ma chambre, il y a un lit et une table. La lampe est sur la table. Mon sac est sous la chaise. Mon pull est rouge.". não vistas: *sac* (nota em "Comprar roupas" (A1-10)).

### A1 M8 "Viagem e férias"

#### M8.2 "Gramática: preposições com cidades e países" (A1-g4)

- Gramáticas: telas, `A1-g4 tela 1 ex. 2`: "Elle voyage à Tokyo.". não vistas: *voyage* (cartão em "Contar uma viagem" (A2-4)).
- Gramáticas: exercícios, `A1-g4 exercício 3`: "Elle voyage en Espagne.". não vistas: *voyage* (cartão em "Contar uma viagem" (A2-4)).
- Gramáticas: exercícios, `A1-g4 exercício 4`: "Ils vivent aux Pays-Bas.". não vistas: *vivent* (sem cartão no mapa).
- Ditados, `ditado d3 (A1-m3)`: "Le musée est loin d'ici. Tournez à droite, puis allez tout droit. Le musée est à gauche, c'est très près.". não vistas: *ici* (sem cartão no mapa).

#### M8.5 "Falar do tempo e das estações" (A1-13)

- Frases "Na frase" (como se fossem essenciais), `A1-13-p5`: "Le soleil brille aujourd'hui.". não vistas: *brille* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-13-p7`: "L'automne est très coloré.". não vistas: *coloré* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m4-001 (expression)`: "Il pleut des cordes / Prends un parapluie, il pleut des cordes ! / Il pleut des cordes depuis ce matin. / Dehors, il pleut des cordes !". não vistas: *cordes* (sem cartão no mapa), *parapluie* (sem cartão no mapa), *dehors* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m4-001 (expression)`: "Que veut dire « Il pleut des cordes » ? / Il pleut très fort / Il ne pleut pas / Il neige / Il fait beau / Il pleut très fort.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *cordes* (sem cartão no mapa), *fort* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m4-005 (expression)`: "Quel temps ! / Quel temps ! Il pleut encore. / Quel temps ! Il fait très froid. / Quel temps ! Il neige !". não vistas: *encore* (cartão em "Contar o que você fez" (A1-20)).
- Desafios: enunciado em francês, `expr-a1m4-005 (expression)`: "Que veut dire « Quel temps ! » ? / On commente le temps qu'il fait / On demande l'heure / On dit au revoir / On remercie / On commente le temps qu'il fait (souvent pour se plaindre).". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *commente* (cartão em "Internet e redes" (A2-30)), *demande* (sem cartão no mapa), *dit* (cartão em "Procurar emprego" (A2-20)), *remercie* (cartão em "Escrever para convidar, recusar e agradecer" (A2-28)), *plaindre* (cartão em "Dividir apartamento e vizinhos" (A2-24)).

### A1 M9 "Lazer, convites e passado"

#### M9.1 "Falar de lazer" (A1-19)

- Diálogos, `A1-19-d1`: "Oui, je vais au cinéma avec des amis.". não vistas: *amis* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).
- Diálogos, `A1-19-d3`: "On ne sait pas encore !". não vistas: *sait* (cartão em "Falar do aprendizado de línguas" (A2-17)), *encore* (cartão em "Contar o que você fez" (A1-20)).
- Opções do "Você entendeu?", `A1-19 check fill opção 1`: "Oui, avec des amis.". não vistas: *amis* (cartão em "Convidar, aceitar, recusar e se desculpar" (A1-27)).
- Opções do "Você entendeu?", `A1-19 check listen opção 1`: "On ne sait pas encore !". não vistas: *sait* (cartão em "Falar do aprendizado de línguas" (A2-17)), *encore* (cartão em "Contar o que você fez" (A1-20)).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p1`: "J'aime lire des livres.". não vistas: *livres* (cartão em "Comprar on-line e reclamar" (A2-8)).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p3`: "Il joue de la guitare.". não vistas: *guitare* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p4`: "Le cinéma est fermé ce soir.". não vistas: *fermé* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p5`: "J'adore écouter de la musique.". não vistas: *adore* (nota em "Gostos e pedidos no café" (A1-5)), *écouter* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p6`: "Le sport est bon pour la santé.". não vistas: *bon* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p7`: "Les enfants aiment jouer dehors.". não vistas: *dehors* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p8`: "Elle adore danser et chanter.". não vistas: *adore* (nota em "Gostos e pedidos no café" (A1-5)).
- Frases "Na frase" (como se fossem essenciais), `A1-19-p10`: "Le film commence à vingt heures.". não vistas: *commence* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-a1m6-005 (listen_translate)`: "J'aime écouter de la musique.". não vistas: *écouter* (sem cartão no mapa).
- Desafios: texto da tarefa, `accent-a1m6-002 (accent)`: "écouter". não vistas: *écouter* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m6-001 (expression)`: "Bon week-end ! / Au revoir, bon week-end ! / Merci, bon week-end à toi aussi ! / À lundi ! Bon week-end !". não vistas: *bon* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m6-001 (expression)`: "Quand dit-on « Bon week-end ! » ? / Avant le week-end / Le lundi matin / Le soir de Noël / À l'anniversaire / On le dit pour se quitter avant le week-end.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *bon* (sem cartão no mapa), *avant* (cartão em "Contar o que você fez" (A1-20)), *quitter* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m6-002 (expression)`: "Quand dit-on « Bonne soirée ! » ? / Le soir, en se quittant / Le matin, en arrivant / À midi, avant de manger / À minuit, en se réveillant / On le dit pour se quitter le soir.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *quittant* (sem cartão no mapa), *arrivant* (cartão em "Contar um acontecimento" (A2-6)), *avant* (cartão em "Contar o que você fez" (A1-20)), *quitter* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m6-003 (expression)`: "C'est parti ! / Le film commence. C'est parti ! / On a tout ? Alors, c'est parti ! / 3, 2, 1... C'est parti !". não vistas: *commence* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m6-003 (expression)`: "Que veut dire « C'est parti ! » ? / On commence / On arrête / On rentre / On dort / On commence quelque chose.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *commence* (sem cartão no mapa), *rentre* (sem cartão no mapa), *quelque* (sem cartão no mapa), *chose* (sem cartão no mapa).

#### M9.2 "Gramática: modais e il faut" (A1-g6)

- Gramáticas: telas, `A1-g6 tela 2 ex. 1`: "Vous devez vous reposer.". não vistas: *reposer* (cartão em "Corpo e dores" (A1-15)).
- Gramáticas: telas, `A1-g6 tela 2 ex. 2`: "Je sais parler français.". não vistas: *sais* (cartão em "Falar do aprendizado de línguas" (A2-17)).
- Gramáticas: telas, `A1-g6 tela 3 ex. 1`: "Il faut dormir huit heures.". não vistas: *faut* (sem cartão no mapa).
- Gramáticas: telas, `A1-g6 tela 3 ex. 2`: "Tu dois te reposer.". não vistas: *reposer* (cartão em "Corpo e dores" (A1-15)).
- Gramáticas: exercícios, `A1-g6 exercício 3`: "Nous devons nous reposer.". não vistas: *reposer* (cartão em "Corpo e dores" (A1-15)).
- Gramáticas: exercícios, `A1-g6 exercício 4`: "Elle sait parler trois langues.". não vistas: *sait* (cartão em "Falar do aprendizado de línguas" (A2-17)), *langues* (cartão em "Falar do aprendizado de línguas" (A2-17)).
- Gramáticas: exercícios, `A1-g6 exercício 5`: "Il faut manger des légumes tous les jours.". não vistas: *faut* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g6 exercício 8`: "Je sais nager.". não vistas: *sais* (cartão em "Falar do aprendizado de línguas" (A2-17)), *nager* (cartão em "Hábitos saudáveis" (A2-12)).

#### M9.4 "Contar o que você fez" (A1-20)

- Frases "Na frase" (como se fossem essenciais), `A1-20-p0`: "Hier, j'ai visité un musée.". não vistas: *visité* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p2`: "Le week-end dernier, il a plu.". não vistas: *plu* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p3`: "Tu as déjà visité Paris ?". não vistas: *visité* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p4`: "Avant-hier, j'ai visité Paris.". não vistas: *visité* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p5`: "Le mois dernier, j'ai voyagé en France.". não vistas: *voyagé* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p6`: "L'année dernière, j'ai appris le français.". não vistas: *appris* (cartão em "Falar do aprendizado de línguas" (A2-17)).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p7`: "Il y a deux jours, il a plu.". não vistas: *plu* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-20-p9`: "Récemment, j'ai changé de travail.". não vistas: *récemment* (cartão em "Contar um acontecimento" (A2-6)), *changé* (cartão em "Comparar antes e agora" (A2-2)).
- Desafios: texto da tarefa, `accent-a1m6-004 (accent)`: "récemment". não vistas: *récemment* (cartão em "Contar um acontecimento" (A2-6)).
- Desafios: enunciado em francês, `expr-a1m6-004 (expression)`: "Que veut dire « Quoi de neuf ? » ? / Il y a des nouvelles ? / Il est quelle heure ? / Tu viens d'où ? / Tu as quel âge ? / On demande des nouvelles récentes à un ami.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *nouvelles* (cartão em "Sentimentos e reações" (A2-29)), *demande* (sem cartão no mapa), *récentes* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m6-005 (expression)`: "Ça fait longtemps ! / Salut Marc ! Ça fait longtemps ! / Ça fait longtemps que je ne t'ai pas vu ! / Salut ! Ça fait longtemps !". não vistas: *longtemps* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m6-005 (expression)`: "Que veut dire « Ça fait longtemps ! » ? / On ne s'est pas vus depuis longtemps / On se voit demain / On est en retard / On a faim / On dit à quelqu'un qu'on ne l'a pas vu depuis longtemps.". não vistas: *dire* (cartão em "Procurar emprego" (A2-20)), *longtemps* (sem cartão no mapa), *vus* (sem cartão no mapa), *retard* (cartão em "Contar um imprevisto" (A2-5)), *faim* (sem cartão no mapa), *dit* (cartão em "Procurar emprego" (A2-20)), *quelqu'un* (sem cartão no mapa).

#### M9.5 "Gramática: passé composé com avoir" (A1-g9)

- Gramáticas: telas, `A1-g9 tela 3 ex. 1`: "Elle est allée au marché.". não vistas: *marché* (cartão em "Comprar on-line e reclamar" (A2-8)).
- Gramáticas: exercícios, `A1-g9 exercício 4`: "Nous avons travaillé ensemble.". não vistas: *ensemble* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g9 exercício 5`: "Elle est allée au marché.". não vistas: *marché* (cartão em "Comprar on-line e reclamar" (A2-8)).
- Gramáticas: exercícios, `A1-g9 exercício 7`: "Ils ont visité Paris.". não vistas: *visité* (sem cartão no mapa).
- Gramáticas: exercícios, `A1-g9 exercício 8`: "Vous êtes arrivés à quelle heure ?". não vistas: *arrivés* (cartão em "Contar um acontecimento" (A2-6)).
- Ditados, `ditado d6 (A1-m6)`: "Le week-end, j'aime lire. Samedi matin, je vais au marché. Samedi soir, on va au cinéma. Dimanche, je mange au restaurant avec ma sœur.". não vistas: *marché* (cartão em "Comprar on-line e reclamar" (A2-8)).
- Ditados, `ditado d6-p2 (A1-m6)`: "Samedi soir, on va au cinéma avec Paul. Le week-end, j'aime le cinéma et j'aime lire. Dimanche, je mange au restaurant. J'adore le week-end !". não vistas: *adore* (nota em "Gostos e pedidos no café" (A1-5)).
- Desafios: texto da tarefa, `cloze-a1m6-004 (cloze_grammar)`: "Ce matin, Sophie est allée au marché.". não vistas: *marché* (cartão em "Comprar on-line e reclamar" (A2-8)).

### A2 M4 "Saúde e bem-estar"

#### M4.1 "Corpo e dores" (A1-15)

- Frases "Na frase" (como se fossem essenciais), `A1-15-p1`: "Je me sens malade.". não vistas: *sens* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-15-p7`: "Le médecin arrive dans dix minutes.". não vistas: *minutes* (sem cartão no mapa).
- Frases "Na frase" (como se fossem essenciais), `A1-15-p8`: "Je vais avoir mal à la tête si ça continue.". não vistas: *continue* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m4-003 (expression)`: "Bon rétablissement ! / Tu es malade ? Bon rétablissement ! / Bon rétablissement, à bientôt ! / Il a de la fièvre. — Bon rétablissement !". não vistas: *bon* (sem cartão no mapa), *rétablissement* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m4-003 (expression)`: "À qui dit-on « Bon rétablissement ! » ? / À une personne malade / À une personne en vacances / À une personne qui part / À une personne qui mange / On le dit à quelqu'un de malade.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *bon* (sem cartão no mapa), *rétablissement* (sem cartão no mapa), *personne* (sem cartão no mapa), *quelqu'un* (sem cartão no mapa).
- Desafios: texto da tarefa, `expr-a1m4-004 (expression)`: "À tes souhaits ! / Atchoum ! — À tes souhaits ! / À vos souhaits, madame ! / Atchoum ! — À tes souhaits !". não vistas: *souhaits* (sem cartão no mapa), *atchoum* (sem cartão no mapa).
- Desafios: enunciado em francês, `expr-a1m4-004 (expression)`: "Quand dit-on « À tes souhaits ! » ? / Quand quelqu'un éternue / Quand quelqu'un mange / Quand quelqu'un part / Quand quelqu'un arrive / On le dit quand quelqu'un éternue.". não vistas: *dit* (cartão em "Procurar emprego" (A2-20)), *souhaits* (sem cartão no mapa), *quelqu'un* (sem cartão no mapa), *éternue* (sem cartão no mapa).

### A2 M10 "Opinião, cultura e mundo"

#### M10.7 "Gramática: gerúndio" (A2-g25)

- Desafios: texto da tarefa, `lt-auto-001 (listen_translate)`: "J'ai acheté un nouveau livre hier et je l'ai déjà fini.". não vistas: *nouveau* (sem cartão no mapa), *fini* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-auto-002 (listen_translate)`: "Ce week-end, nous allons visiter un musée dans le centre-ville.". não vistas: *visiter* (sem cartão no mapa), *centre* (sem cartão no mapa).
- Desafios: texto da tarefa, `lt-auto-003 (listen_translate)`: "Elle est un peu fatiguée parce qu'elle a beaucoup travaillé aujourd'hui.". não vistas: *fatiguée* (sem cartão no mapa).

