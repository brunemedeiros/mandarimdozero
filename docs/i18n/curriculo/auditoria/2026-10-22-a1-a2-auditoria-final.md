# Auditoria final do mapa A1 (9 módulos) e A2 (10 módulos)

Data: 2026-10-22 (depois das decisões 1 a 196 do `12` e das regras 1 a 14 do `15`). Agente: `auditor-curricular`. **Só relata: nada foi editado no mapa nem no código.**
Rodadas anteriores (histórico): `2026-10-19-a1-a2-rodada-saude-modais.md` e `2026-10-21-a1-a2-rodada-equidade.md`.

Fontes conferidas: `08-mapa-final-a1-a2-v2.md` (inteiro), `12` (decisões 136 a 196), `15`, `16`, `00`, `09` (A.3 e A.5); conteúdo publicado por script
(`scripts/lib/course-content.js`, `load('fr')`): vocabulário, frases, diálogos (falas e opções do "Você entendeu?"), exemplos das notas, telas e exercícios das 10 gramáticas
publicadas, lições (`vocabIdx`, `includesDialogue`); `fr/scripts/challenges_import/*.json`; `fr/curriculum-changes.js`; `fr/app.js` (`moduleUnlocked`, `markUnitCompleted`,
`isFirstOfLevel`, `unitsOfLevel`, `moduleProgressPct`, `moduleCompleted`, `levelCompleted`).

Método da parte 1: as listas de cartões do `08 v2` foram montadas por posição (A1 M1.1 a A2 M10.7) e cada frase, fala, opção, exemplo e exercício publicado foi
comparado com o que já é cartão **na posição nova** (inclusive as frases que mudam de unidade com a chave). Palavra funcional, número e forma conjugada de verbo
já ensinado não contam. Lista bruta: 314 ocorrências; abaixo, só o que importa.

Cada achado diz **quem resolve**: **[dona]** precisa de decisão; **[editor]** o editor do mapa corrige sem perguntar (aplica regra ou decisão já tomada).

---

## 0. A rodada anterior (2026-10-21): o que foi resolvido

Resolvido: B1 desbloqueio (decisão 138, falta implementar, como previsto); B2 regra 13 (decisão 139); B3 exercícios publicados de `A1-g3`, `A1-g4`, `A1-g8` (listados
na M3.2, M8.2 e M3.7); Atenção 1 a 14 (gancho da A2 M4.1, *combien de* na M2.1, diálogos negativos da M3.1, M6.1 e M8.3, nota de negação da M1.2, *trouver*, *en bois*,
números de emergência, frases publicadas com destino, 19 lições, Desafios da `A1-16`, tabela de ditados); 17 (diálogo da A2 M4.1, notas de opinião, *chaque*, A2 M1.3 x M1.4);
18 a 21 (tempos, cron v29). Carga do A1 M1, A1 M3, A2 M8 e A2 M10: aceita pelas decisões 142 e 195.

Continua: a Sugestão 2 ("palavra de frase") foi **recusada** pela decisão 145 ("a frase com palavra que ainda não é cartão é trocada"). Esta rodada mostra o custo
dessa escolha (Bloqueia 1): há palavras de altíssima frequência que **nunca** viram cartão no A1 nem no A2.

---

## Bloqueia

1. **Palavras essenciais sem cartão em nenhum lugar do A1 e do A2, usadas desde o M1 [dona].** Com a regra 11 do jeito que está (decisão 145), toda frase com elas
   teria de ser trocada, o que não é possível: são as palavras que sustentam as próprias funções do mapa.
   - *aimer*: 9 frases publicadas (M1.2 *J'aime la France*, M2.1, M2.3, M4.1 ×2, M4.2, M8.5, M9.1 ×2), a nota N24 (*J'aime le café* x *je bois du café*) e o diálogo
     negativo do `16` na M4.1 (*Tu aimes le poisson ? Non, je n'aime pas le poisson.*). A M4.1 tem a função "gostos" e cartões *détester, adorer*, mas não *aimer*.
   - *parler*: gancho da versão grátis da M2.7 (*Est-ce que tu parles anglais ?*, M2.5), diálogo negativo do `16` na M2.5, A2 M6.3 *Je sais parler anglais*. A M2.5 promete
     "que línguas fala" sem o verbo.
   - *l'enfant*: cartão só na A2 M1.1, mas usado no A1 em *J'ai deux enfants* (frase nova prevista na M2.1), *Les parents adorent leurs enfants* (`A1-4`), *Les enfants
     aiment jouer dehors* (`A1-19`) e no exercício *Ils ___ deux enfants.* da `A1-g1` (M1.5). O `09` (A.5) diz que *enfants* "só vem na M2.1": não vem.
   - *le jour* (*Quel jour sommes-nous ?*, *On se voit quel jour ?*, M3.3, que tem a função "dizer o dia"), *l'anniversaire* (cartão só na M9.3, mas a M3.5 se chama "Dizer
     a data e o aniversário" e as frases publicadas *Mon anniversaire est en mars / en décembre* vão para lá), *l'addition* (o "Consigo" do M4 promete "pedir a conta"
     e a frase publicada *L'addition, s'il vous plaît.* está na M4.1; nenhuma unidade tem o cartão), *acheter* (*Qu'est-ce qu'on achète ?*, M4.2; o M5 "Compras" não tem o verbo),
     *voir* (A1 M3.3, M9.1; A2 M2.5 *Je n'ai rien vu*, versão grátis de *rien*), *la saison* (*Tu préfères quelle saison ?*, M8.5 "estações"), *l'après-midi* (M3.1 tem
     *le matin, le midi, le soir*, mas não *l'après-midi*, que está no diálogo publicado), *l'ami / l'amie* (`A1-g2`, `A1-19`, `A1-20`; nenhum cartão no A1 nem no A2).
   - Verbos que só existem em gramática (Premium) e na Conjugação: *aller* (M6.4), *faire* (M4.6), *vouloir, pouvoir, devoir* (M9.2), *savoir, connaître* (A2 M6.4),
     *dire* (A2 M7.3 *Il dit que*), *donner* (A2 M4.2 *Le médecin lui donne une ordonnance*, gancho da versão grátis). O gratuito nunca os tem como cartão.
   - **Recomendação:** decidir antes da aprovação uma das saídas: (a) uma lista curta de cartões que faltam, cada um na unidade da função (proposta: *aimer* M4.1,
     *parler* M2.5, *l'enfant* M2.1 (sai da A2 M1.1, que ganha uma palavra nova pela decisão 157), *le jour* M3.3, *l'anniversaire* M3.5, *l'addition* M4.5, *acheter* M5.3,
     *voir* M9.1, *la saison* M8.5, *l'après-midi* M3.1), aceitando +1 acima do limite onde precisar, como na M1.2; e (b) para os verbos irregulares ensinados em gramática
     e presentes na Conjugação grátis, uma exceção formal da regra 11 ("verbo de gramática em fórmula"), como já existe para *pour la santé*.
2. **A ordem da cadeia de desbloqueio vem do array `UNITS`, não dos módulos [editor, na lista de implementação da seção 5].** `unitsOfLevel` (`fr/app.js:979`) filtra
   `UNITS` pelo nível, `markUnitCompleted` (`:4519`) abre a unidade seguinte **nessa ordem**, e `isFirstOfLevel` (`:496`) abre de saída a 1ª unidade de cada nível na ordem
   do array. Consequências que o `08 v2` não registra:
   - a reorganização do A1 exige reordenar o array `UNITS` (ou mudar a cadeia para a ordem dos módulos); mover só o `unitIds` dos módulos deixa a cadeia na ordem antiga;
   - se a `A1-15` mudar só de `level` e ficar no lugar atual do array, ela passa a ser a **1ª unidade do A2** para o código: fica aberta para todo mundo, a `A2-1` deixa de
     abrir sozinha, e quem concluir a `A1-15` abre a unidade seguinte do A2 no array (a `A2-1` ou a `A2-10`), dentro do A1;
   - **Recomendação:** acrescentar à seção 5 (linha "Unidade publicada que muda de nível" e item "Falta implementar") que o `curriculo_ops.js` reordena `UNITS` junto com
     `level` e `unitIds`, com teste de `isFirstOfLevel` e da cadeia (A2 M4.1 só abre depois da A2 M3.6 para quem não fez a `A1-15`).

---

## Atenção

### Parte 1. Palavras usadas antes de ensinadas

**Exceções já aceitas pela dona (regra 11): conferidas, ficam.** *pour la santé* (`A1-11-p5` M4.2, `A1-19-p6` M9.1), *délicieux, cuit, sucrée* (`A1-5-p4`, `A1-11-p4`,
`A1-11-p9`, `A1-5-p8`), *prochain* (`A1-7-p5`, quadro da M8.4), *le projet* (`A1-19-d0`), *garée* (`A1-14-p6` na M7.5). Nada a mudar.

**`A1-7-p5` *La semaine prochaine, je pars en voyage.* (A1 M3.3) [dona].** Além de *prochain* (aceito), usa *partir* (cartão da A1 M8.1, cinco módulos depois; e *je pars*
é irregular) e *en voyage* (cartão *le voyage* na A2 M2.1, outro nível). Recomendação: mover com a chave para a **A1 M8.1** (função "para onde vai viajar", *partir* já é
cartão) e aceitar *en voyage* como expressão de uso comum, como *prochain*; na M3.3 entra uma frase nova só com dias (*La semaine prochaine, je travaille samedi.*).

**Casos graves (exercício ou opção sem tradução na tela, o aluno não tem como entender) [editor]:**
- M1.5 (`A1-g1`): exercícios *Ils ___ deux enfants.* (*l'enfant* é A2) e *Elle ___ faim.* (a tela "pegadinha" sai, pergunta 12; *avoir faim* só vem em nota na M4.1). O mapa só
  troca *Je ___ étudiante.*; trocar os dois (o `09` já propõe *Vous ___ quel âge ?*).
- M2.4 (`A1-g2`): exemplo *C'est mon amie Sophie.*, exercício *C'est mon amie.* (*ami* sem cartão) e exemplo *Son école est loin.* (*l'école* M6.3, *loin* M6.1). O mapa só
  diz "sem *c'est / il est*"; trocar por família (*C'est ma sœur.*, *Son père est grand.*).
- M7.6 (`A1-g7`): além do que o mapa já troca, *Ce livre est meilleur que l'autre.* (*le livre* sem cartão) e *Ton chat est moins grand...* (*le chat* sem cartão).
- M9.5 (`A1-g9`): *Vous êtes arrivés à quelle heure ?* (*arriver* é cartão da A2 M2.5), *Ils ont visité Paris.* (*visiter* sem cartão), *Elle est allée au marché.* (*le marché*
  só em nota da M4.2). Trocar por verbos com cartão (*sortir, rentrer* em frase, *partir*).
- M2.5 (`A1-9`): opção do "Você entendeu?" *Je suis d'Italie.* (*l'Italie* é cartão da M8.1): entra na reescrita do diálogo já decidida.

**Casos novos em frases e diálogos publicados de unidades que mudaram de lugar ou de conteúdo** (fora das listas da seção 7 do `08 v2`, item "Conteúdo publicado que
precisa de reescrita") [editor, salvo onde o Bloqueia 1 decide]:
- M1.2 (`A1-2`): *Quel est le nom de la ville ?* (*la ville* M2.5), *Le Brésil est très grand.* (*grand* M2.3), *Le pays est magnifique.*; M1.1 (`A1-1`): *Au revoir, à demain !*
  (*demain* M3.3), *Un café, s'il vous plaît.* (*le café* M4.1).
- M2.1 (`A1-4`, movida): 6 das 11 frases usam palavra posterior: *Le père travaille en ville.* (*travailler* M3.1, *la ville* M2.5), *La mère prépare le dîner.* (*le dîner* M4.5),
  *Le frère et la sœur jouent ensemble.* (*jouer* M9.1), *Les parents adorent leurs enfants.* (*adorer* M4.1, *l'enfant* A2), *Le fils et la fille aiment l'école.* (*l'école* M6.3),
  *Le mari et la femme habitent à Paris.* (*habiter* M2.5). As frases **novas** previstas pelo próprio mapa (*mes grands-parents, j'ai deux enfants, je suis marié(e)*) usam
  *les grands-parents* (sem cartão), *l'enfant* e *marié* (A2 M1.5 *se marier*) [dona: entra no Bloqueia 1].
- M3.1 (`A1-6`): *Le soir, je regarde la télé.*, *Il regarde l'heure sur son téléphone.* (*regarder* e *la télé* sem cartão, *le téléphone* M5.1, *sur* M7.5), *Il va se
  réveiller tôt demain.* (*demain* M3.3), *Je vais dormir maintenant.* (*maintenant* é cartão da A2 M1.3), diálogo com *l'après-midi*.
- M3.3 (`A1-7`): as frases de mês *Mon anniversaire est en mars.* (`p2`), *Le mois de janvier est très froid.* (`p6`), *Mon anniversaire est en décembre.* (`p7`) e *Quelle est
  la date aujourd'hui ?* (`p8`) **não têm destino** no mapa: os meses e *la date* vão para a M3.5 (`A1-24`); levar as quatro com a chave para a M3.5. *Aujourd'hui, il fait beau.*
  (`p4`: *il fait beau* M8.5) troca. Diálogo: *On se voit quel jour ?* (*voir*, *le jour*).
- M4.1 (`A1-5`): *Le lait est dans le frigo.* (*dans* M7.5), *Je vais détester ce plat, je pense.* (*le plat* M4.5, *penser* sem cartão), *Le café est très chaud.*, *L'addition,
  s'il vous plaît.*; M4.2 (`A1-11`): *Le riz et les pâtes sont mes plats préférés.* (*le plat* M4.5), *Le sucre et le sel sont sur la table.* (*sur* M7.5, *la table* M7.4),
  diálogo *Qu'est-ce qu'on achète ?*; M4.3 (`A1-12`): *Il y a beaucoup de monde ici.* (*il y a* é cartão da M7.1).
- M5.3 (`A1-10`): *Cette veste / Le manteau / Ce sac coûte...* (*la veste, le manteau, le sac* nunca foram cartão), *Le magasin ferme à dix-neuf heures.*, diálogo *Je cherche
  une robe*; *coûter* e *l'euro* (17 e 18 ocorrências no A1) não têm cartão [dona, com o Bloqueia 1].
- M6.5 (`A1-14`): *Le train part à huit heures.* (*partir* é cartão da M8.1, depois): trocar (*Le train arrive...* não serve: *arriver* é A2) por *Le bus est à huit heures.*
- M7.4 (`A1-34`): a frase que vem da M7.1 *La fenêtre donne sur le jardin.* continua antes do cartão *sur* (M7.5, logo depois) e usa *donner*; trocar ou levar para a M7.5.
- M8.5 (`A1-13`): a frase que vem da M1.3 *Il fait zéro degré dehors.* usa *le degré* e *dehors* (sem cartão); *Le printemps est ma saison préférée.*, *Je préfère l'été*
  (*préférer* sem cartão).
- M9.1 (`A1-19`): *J'adore écouter de la musique.* (*écouter* sem cartão), *Le film commence à vingt heures.*; M9.4 (`A1-20`): *L'année dernière, j'ai appris le français.*
  (*apprendre* é cartão da A2 M6.3), *j'ai visité*, *j'ai voyagé*, *au restaurant* (*le restaurant* sem cartão, embora a M4.5 seja "Pedir no restaurante").
- M2.3 (`A1-16`): ficam *J'aime la couleur bleue.* (*la couleur* sem cartão, nem na M5.4 "Cores") e *Le chien est petit.* (*le chien* sem cartão); a N15 usa *rouge* como
  exemplo (cartão da M5.4) e a N14 (bandeira, *bleu, blanc, rouge*) continua "a rever": levar para a M5.4.
- M1.3 (`A1-3`): o diálogo "No parque" (*Quel âge a ta fille ? ... Et ton fils ? Ils sont grands !*) usa *la fille, le fils* (M2.1) e *grand* (M2.3); o `09` aceitou "como
  entrada", mas não está na lista formal das exceções da regra 11 [dona: registrar como exceção ou trocar].

**No próprio mapa (frases e ganchos novos) [editor]:**
- A1 M8.1 (`A1-31`): a nota grátis se chama "*partir / aller en vacances en, au, aux, à*", mas *les vacances* é cartão da M8.3, depois; usar *Je vais aux États-Unis, je pars
  en Italie*.
- A2 M2.1 (`A2-4`): gancho da versão grátis da M2.2 *Il faisait beau quand on est arrivés* (*arriver* é cartão da M2.5); usar *quand on est partis*.
- A2 M6.6 (`A2-g16`): gancho *Si j'ai le temps* (*le temps* = tempo livre, sem cartão; só *de temps en temps* no A1). Aceitável como fórmula; registrar.

### Parte 2. Duplicatas de cartão (regra 14)

- Conferência por script de todas as listas (A1 344 + A2 427, mesmas formas e núcleos de expressão): **nenhuma duplicata real**. Todos os 204 cartões publicados estão
  nas listas novas (nenhum some).
- Pares que não estão na lista de conferência da seção 3.2 e deveriam estar, para fechar o registro [editor]: *à pied* (A1 M6.5) x *le pied* (A2 M4.1); *la date de naissance*
  (A1 M3.5) x *la naissance* (A2 M1.5); *la carte* (A1 M4.5) x *la carte postale* (A1 M8.3); *tard* (A1 M3.1) x *plus tard* (A2 M6.5); *vite* (A1 M8.6) x *à très vite*
  (A2 M9.3); *inviter* (A1 M9.3) x *l'invitation* (A2 M9.3); *urgent* (A1 M8.6) x *les urgences* (A2 M4.3); *le vendeur* (A1 M1.6) x *vendre* (A2 M3.5); *le séjour*
  (A2 M2.1) x *le titre de séjour* (A2 M7.5); *se passer* (A2 M2.5) x *passer l'aspirateur* (A2 M8.2); *tout droit* (A1 M6.1) x *avoir le droit de* (A2 M8.5); nota
  *OK, ça marche* (A1 M9.3) x cartão *marcher* (A2 M3.3). Todos são lexemas ou expressões diferentes: dois cartões, sem troca.

### Parte 3. Equidade grátis x Premium (regra 12)

- As 23 gramáticas do A1 e as 22 do A2 têm a versão grátis **antes** delas na ordem da trilha (conferido linha a linha). Nenhuma nota grátis do mapa diz "a gramática já mostrou".
- Ganchos que dependem de palavra sem cartão: M2.7 (*parler*), A2 M4.4 (*donner*), A2 M6.4 (*savoir, connaître, parler*), A2 M7.3 (*dire*), A2 M10.7 (*voyager*): resolvidos
  junto com o Bloqueia 1 [dona].
- Versões grátis "parcial e suficiente" (M1.5, M4.6, M6.4 e, na prática, M9.2) contam com a **Conjugação grátis** para a tabela completa; confirmar que *aller, faire,
  prendre, vouloir, pouvoir, devoir* estão na prática grátis da Conjugação [editor, conferir].
- M3.7 (`A1-g8`): a posição do advérbio (*Je travaille toujours le matin.*) não tem nota grátis, só as frases da M3.6; aceitável pela decisão 64 (frase mostra), registrar.

### Parte 4. Contagens

Recontadas do zero a partir das tabelas da seção 3:

| | Tabelas | Seção 1 | `00` | `12` |
|---|---|---|---|---|
| A1 módulos / unidades | 9 / 56 (33 + 23) | igual | igual | igual |
| A1 cartões | 60 + 31 + 48 + 41 + 30 + 30 + 34 + 40 + 30 = **344** | 344 | 344 | 344 |
| A1 tempo | soma dos cabeçalhos **28h45** | 28h45 | 28h45 | 28h45 |
| A2 módulos / unidades | 10 / 58 (36 + 22) | igual | igual | igual |
| A2 cartões | 48 + 36 + 34 + 47 + 36 + 36 + 47 + 48 + 47 + 48 = **427** (417 + 10) | 427 | 427 | 427 (196) |
| A2 tempo | 40 min por vocabulário + 25 por gramática = **33h10** | 33h10 | 33h10 | 33h10 |

Cada lista do A2 foi recontada palavra a palavra (M9.1 11, M7.2 11, M3.1 10, M4.1 11, as outras 12): bate. O que não bate [editor]:
- `08 v2` seção 5, linha "Seguro por construção": "10 cartões publicados no A2 (8 + 2) e **416** novos": são **417**.
- `08 v2` seção 4.1, linha "A2": "`A2-g21` ... passa para a **M8.7**": hoje é a M8.6.
- Coluna "Muda" da A2 M3.1 ("A2 424"), M7.4 ("A2 425") e M9.1 ("A2 424"): totais parciais de rodadas antigas; tirar ou marcar como histórico.
- **Notas do A2 "~65"**: contando unidade a unidade as notas da coluna "Notas" mais as versões grátis *(nota nova)* que moram nas unidades de vocabulário, dá **~74**
  (75 com *le château*). A conta "16 + 5 + 22 + acréscimos" mistura categorias. As notas do A1 (~125) batem com a contagem (~127).
- A1 M2.3 com 11 palavras: o cabeçalho do M2 diz "3 lições pela decisão 139, a confirmar com 11"; a regra 13 dá 4 lições + Revisão para quem passa de 10. Decidir e
  ajustar o tempo do M2 (hoje 3h15 com −10 min).

### Parte 5. Tema e carga

- Acima de 3h30: A1 M1 (3h35, alfabeto) e A2 M10 (3h55, fecha o nível): aceitos pelas decisões 142 e 195. No limite: A2 M4, M8 e M9 (3h30). Nenhum módulo abaixo de 2h30
  (os mais leves: A1 M7 2h50, A2 M5 2h50, A1 M5 2h55). Sem achado novo.
- Temas: um tema por módulo no A1. No A2, o M10 segue com dois (cultura em M10.1 e M10.3; mundo em M10.4 e M10.6), aceito pela decisão 195; o M7 junta trabalho, banco e
  papelada (decisão 142). A2 M9.5 "Sentimentos e reações" é o que mais se afasta de "Comunicar"; cabe em "se relacionar".
- A A2 estima ~40 min por unidade sem olhar o número de notas: A2 M4.1 e M5.1 têm 5 notas cada. Medir quando as lições forem desenhadas.

### Parte 6. Progresso dos alunos

- Chaves: todos os 204 cartões publicados têm destino com a mesma chave; *gentil*, *récemment* e 8 da `A1-15` mudam de nível (tags `nivel-A1` → `nivel-A2`). Ok.
- `fr/curriculum-changes.js` está vazio (`RETIRED_LESSON_IDS = []`, `UNIT_MERGES`, `MODULE_MERGES` vazios) e `fr/scripts/curriculo_ops.js` **não existe**: tudo da seção 5 ainda
  é a fazer, como o mapa diz.
- **Das 19 lições que saem ou são refeitas, 8 hospedam o diálogo da unidade** (`includesDialogue`): `A1-3/idade`, `A1-6/rotina-diaria`, `A1-7/meses-e-data`,
  `A1-10/numeros-90-100`, `A1-15/farmacia-dor-febre`, `A1-16/tamanho-e-personalidade`, `A1-17/porta-janela-tem-nao-tem`, `A1-20/dois-dias-atras-ja-recentemente`. Nas duas que
  "saem inteiras" (`A1-7/meses-e-data`, `A1-10/numeros-90-100`), o diálogo fica sem lição. [editor] Dizer na seção 5 em que lição nova cada diálogo entra.
- **Ponto de verificação herdado do `A1-m4`** [dona]: o antigo (`A1-13`, `A1-14`, `A1-g5`, `A1-15`, `A1-g6`) e o novo "Na cidade" (`A1-8`, `A1-g19`, `A1-30`, `A1-g13`, `A1-14`,
  `A1-g23`) dividem **uma** unidade (`A1-14`); o `A1-m3` divide duas com o novo M4 e duas com o novo M5 (empate). "Por sobreposição" quase não se sustenta aí. Recomendo
  não herdar a aprovação do `A1-m4` (o aluno refaz o Ponto de verificação de "Na cidade") e registrar o critério de desempate do `A1-m3`.
- Desafios: 34 linhas que mudam de `moduleId` + 7 da `A1-15` que mudam de nível: conferido nos lotes (bate com o mapa). A linha *Je vais à la pharmacie.* (`A1-15`) vai para o
  `A2-m4`, mas *la pharmacie* fica no A1 (M6.3): sem problema de vocabulário, só de tema (cabe).
- `STUDY_ITEM_GATE`: muda com cada lição aposentada ou refeita e com a `A1-15`; regenerar e publicar o `notification-cron` junto com a reorganização (já registrado).
- Conclusão e desbloqueio com paywall (decisões 125 e 138): nada implementado (correto para esta fase); some o Bloqueia 2 à mesma função pura, porque a cadeia por plano
  depende da mesma ordem de unidades.

### Parte 7. Notas

- **14 de julho** (A1 M3.5 x A2 M10.3) [dona]: confirmar a proposta da decisão 194 (A1 breve, só "é a festa nacional"; a história só na A2 M10.3). Recomendo sim.
- Nota publicada N28 (`A1-12`, M4.3): o texto diz "igual acontece depois de uma negação (**unidade anterior**)": é um "você já viu" disfarçado (`14`, conflito 11); tirar
  o parêntese [editor]. A N44 (`A1-20`, "que você já viu") já está marcada para sair.
- Regra 1 (formal e informal juntos) em notas e cartões novos [editor]: A2 M4.1 *Reposez-vous !* (acrescentar *Repose-toi !*); A1 M9.3 "*Désolé(e)* x *Pardon* x *Excusez-moi*"
  (acrescentar *Excuse-moi*, que o diálogo publicado da M6.1 já usa na forma *vous*); A2 M9.1 cartão *ne quittez pas* (só formal; a nota ou a frase mostra *ne quitte pas*) [dona confirma].
- Confiança: a única nota cultural com confiança **média** é a feminização das profissões (A1 M1.6), já marcada para revisão da dona. A nota de realidade *très / super / hyper*
  (A1 M7.1) está como n/r: precisa de confiança declarada. As ~25 notas novas de explicação do A1 sem confiança (M1.2 negação, M2.1 ×3, M2.5, M3.1, M3.6, M5.1, M6.1, M6.3,
  M7.2, M7.4, M8.3, M9.1, M9.4, M3.1 Pron) declaram ao escrever (skill `notas-de-realidade`).
- Culturais com fato verificável e sem fonte (todas "alta"): datas e números (*congés payés* 1936, 15/17/18/112, *fête des voisins* 1999 com fonte da dona, *les soldes*
  duas por ano) estão corretos pelo que sei (confiança alta). Um ajuste [editor]: a N09 (A1 M5.1) "*septante, huitante, nonante*": *huitante* é só de alguns cantões suíços
  (Vaud, Valais, Fribourg); a Bélgica diz *quatre-vingts* (confiança alta).

### Parte 8. Referências quebradas

- `16` item 2 (palavras interrogativas, M6.6) inclui *pourquoi / parce que*; o `08 v2` (M6.6) diz que *pourquoi* fica na M9.3 [editor: alinhar o `16`].
- `08 v2` seção 4.1 "M8.7" e seção 5 "416 novos" (Parte 4). O `12` é registro histórico: posições antigas nas decisões antigas não contam.
- `09` A.5 diz que *enfants* "só vem na M2.1": falso (A2 M1.1).
- `00`: as seções datadas de 2026-10-21 trazem 343, 426 e 425; estão marcadas como superadas ou datadas. Ok.

### Parte 9. Listas nunca aprovadas explicitamente [dona]

- **A1 M3.6 Frequência** (10): sem conflito de regra 13 nem 14 (*d'habitude* saiu do A2; *chaque* sem cartão no A2). Recomendo aprovar.
- **A1 M8.6 Pedir ajuda** (10, com *trouver*): sem conflito; *urgent* x *les urgences* e *vite* x *à très vite* são lexemas diferentes. Recomendo aprovar.
- **Cortes da decisão 129**: M5.1 (*en espèces, le portable, le mail* em nota), M5.4 (*le cuir*), M7.1 (*le studio, l'immeuble, le jardin*), M8.1 (*le Japon*). Conflito
  de cobertura: ***le portable* e *le mail* nunca viram cartão**, nem no A2 M9 "Comunicar" (telefone, e-mail, redes); *l'immeuble* e *le studio* também não no A2 M8.1
  "Procurar moradia". Recomendo aprovar os cortes e levar *le portable* para a A2 M9.1 (tem 11, cabe) e *le mail* para a A2 M9.3 (no lugar de *confirmer*, Sugestão 3).
- ***laid*** em nota na A1 M2.3: sem conflito. Recomendo aprovar.
- ***confirmer*** na A2 M9.3: sem conflito da regra 14, mas o exemplo *Je confirme ma présence* usa *la présence* (sem cartão). Ver Sugestão 3.

---

## Ok

- Totais do A1 e do A2, tempos e cabeçalhos de módulo batem com as tabelas (Parte 4), fora os quatro pontos listados.
- Nenhuma duplicata real de cartão entre A1 x A1, A1 x A2 e A2 x A2; os pares de lexemas diferentes da seção 3.2 estão certos.
- Os 204 cartões publicados têm destino com a chave; nenhum cartão apagado.
- Equidade: as 45 gramáticas têm versão grátis antes delas; o Teste de Nível sai por plano junto com os Pontos de verificação (decisão 138).
- Títulos das 45 gramáticas começam com "Gramática:" (regra 10).
- Exceções formais da regra 11 conferidas: cada uma está só nas frases citadas pela decisão.
- Saúde: nada de saúde sobra no A1 (M6.3 só a cruz verde; M8.6 polícia; `A1-g6` sem saúde; ditado `d4` com reescrita prevista).
- Negação: as seis formas da A2 M8.6 aparecem antes (M1.3, M2.5, M5.1, M7.5, M8.2, M8.5); as telas de negação do A1 têm versão grátis por diálogo (M3.1, M6.1, M8.3, M9.1, M9.4).
- Desafios (34 + 7 linhas) e ditados (21) conferem com as tabelas da seção 5.

---

## Sugestões (para a dona decidir)

1. **Uma rodada curta "cartões que faltam"** antes da aprovação (Bloqueia 1): 8 a 10 palavras de altíssima frequência no A1, cada uma na unidade da função, e a exceção
   formal "verbo de gramática em fórmula" para os irregulares que a Conjugação grátis já cobre. Sem isso, a regra 11 vai travar a escrita de todo módulo.
2. **Teste automático "frase só com palavras vistas"** (pergunta 25, aprovada e não feita): rodar o mesmo cruzamento desta auditoria a cada lote, com as exceções
   formais numa lista no código (não à mão). Esta rodada achou ~60 frases publicadas que nenhuma lista registrava.
3. **A2 M9.3**: trocar *confirmer* (a revisar) por ***le mail / l'e-mail*** (unidade de escrever e-mail; palavra cortada do A1 M5.1 e sem cartão em lugar nenhum) e levar
   ***le portable*** para a A2 M9.1 (11 → 12).
4. **`A1-m4` sem herança de Ponto de verificação** (sobreposição de 1 unidade em 6) e critério de desempate escrito para o `A1-m3`.
5. **Reordenar `UNITS` pela ordem da trilha** como parte da operação do `curriculo_ops.js`, com teste da cadeia e do `isFirstOfLevel` (Bloqueia 2).
6. **Diálogos das lições aposentadas**: decidir junto com a lista das 19 lições em que lição nova cada um dos 8 diálogos entra.
