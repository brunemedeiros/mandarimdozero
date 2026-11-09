# Auditoria: ordem nova dos módulos "Apresentar-se" e "Família e pessoas próximas" e as duas notas de "Países e cidades" (2026-11-09)

Auditoria curta do pedido de mudança das decisões 333 a 335 do `12` (regras 11 e 12 do `15`). Só relato: o que está aqui não foi aplicado ao `fr/content.js`.

**O que mudou.** "Apresentar-se" (módulo 1): Cumprimentar e se despedir · Dizer o nome e a nacionalidade · Dizer de onde é, onde mora e que línguas fala ·
**Gramática: perguntar sim ou não** (vem do módulo 2) · Dizer a idade: de 1 a 29 · Gramática: *être* e *avoir* · Dizer a profissão · Gramática: masculino e feminino.
"Família e pessoas próximas" (módulo 2): Apresentar a família · Gramática: artigos e plural · **Perguntar a idade dos outros: até 69** (vem do módulo 1) ·
Gramática: possessivos · Descrever a aparência · Gramática: palavras interrogativas (pessoas). Mesmos ids e chaves. Em "Países e cidades" (módulo "Viagem e férias"),
a nota de ida e procedência virou duas notas breves (depois de *partir* e depois de *venir de*).

**Termos.** "Gatilho" = o cartão ou a frase logo antes de uma nota ou gramática, que mostra a forma explicada. "Versão grátis" = a nota ou lição gratuita que ensina
o conceito antes da gramática Premium (regra 12). "Palavra não vista" = palavra que ainda não foi cartão (nem nota com tradução, nos diálogos) naquela posição (regra 11).

**Como foi conferido.** O relatório "só palavras vistas" (`fr/scripts/curriculo_palavras_vistas_relatorio.js`, sem gravar) rodou sobre o conteúdo **publicado**
(`fr/content.js` com a camada pt-BR, ditados, Desafios publicados e lotes do A1) com o mapa de antes e com o mapa de depois, e as duas saídas foram comparadas.
"Perguntar a idade dos outros", a "Gramática: perguntar sim ou não", "Dizer a profissão" e a "Gramática: masculino e feminino" são unidades novas, sem conteúdo
publicado; para elas, foi lido o desenho do `08 v2` e do `10`.

**Números.** Relatório: 657 textos medidos; textos com palavra não vista: **275 antes, 277 depois** (+2, os dois de "Apresentar a família", item 1); nenhuma palavra
nova não vista nos ditados, nos Desafios publicados, nas gramáticas publicadas nem em "Dizer a idade: de 1 a 29". Mapa: `curriculo_mapa.js --conferir` tudo ok
(regra 12 inclusive). `tests/curriculo`: 104/104, 50/50, 18/18. `validar.js`: "Cumprimentar e se despedir" 118 textos, 0 falhas; "Dizer o nome e a nacionalidade"
79 textos, 0 falhas. `tests/curriculo-ids`: 111/111, 19/19, 29/29, 9/9, 12/12, 38/38, navegador 10/10 e 23/23.

---

## Bloqueia

Nada bloqueia o mapa. As ressalvas abaixo valem para a **implementação** (quando o conteúdo de cada unidade for escrito ou reescrito), não para a aprovação da ordem.

## Atenção: o editor corrige (sem decisão nova)

1. **"Apresentar a família": *Il a quinze ans.* (achado novo desta ordem).** O diálogo publicado tem a fala `A1-4-d4` *Il a quinze ans.* e a mesma frase é opção do
   "Você entendeu?". Com "Perguntar a idade dos outros" depois de "Apresentar a família", *quinze* ainda não é cartão ali. Na reescrita da unidade, trocar por uma idade
   até 29 (ex.: *Il a vingt ans.*), com chave nova para a fala trocada (como nas decisões 320 e 326).
2. **Exercícios da "Gramática: perguntar sim ou não" só com o vocabulário até "Dizer de onde é, onde mora e que línguas fala".** O desenho antigo do `10` (Passo 1 a 5)
   usa *Tu as des frères ?*, *enfants*, *sœur*, *père*, *marié*, *médecin*, *Elle n'a pas vingt ans* e *pas de*: nada disso está disponível na nova posição (família e
   *marié* vêm no módulo 2, *médecin* em "Dizer a profissão", *avoir* e os números a partir de 4 em "Dizer a idade: de 1 a 29"). O `08 v2` já diz "sem negação"
   (o *pas de* foi para a "Gramática: artigos e plural"). Escrever as telas e os 8 exercícios com *être, s'appeler, habiter, parler*, nacionalidades, *la France,
   le Brésil, les États-Unis, la ville* e *où* (ex.: *Tu parles anglais ?* / *Est-ce que tu parles anglais ?*; *Tu habites à Paris ?* / *Est-ce que tu habites à Paris ?*;
   *Tu es brésilienne ?*; "Na rua": *Tu habites où ?*). Registrado na linha da M1.4 do `08 v2`.
3. **Linhas do `10` e do `16` que ainda falam em "M2.7, Perguntar: sim ou não" ou em "ponte" entre as duas gramáticas de pergunta** ficam como texto histórico; as
   tabelas vivas do `16` (negação e palavras interrogativas) e a seção 3.1 do `08 v2` já usam a numeração nova. Nada a fazer além de não reaproveitar o desenho antigo.

## Precisa da dona

4. **Versão grátis da "Gramática: *être* e *avoir*".** Antes, a versão grátis era *je suis* (unidade 2), *J'ai vingt ans* (Dizer a idade) e *il a / elle a* (Perguntar
   a idade dos outros). Com "Perguntar a idade dos outros" depois da gramática, *il a / elle a* deixa de vir antes. O mapa ficou com *je suis, tu es* e *J'ai vingt ans*,
   mais a tabela da Conjugação (grátis). A regra 12 continua cumprida (o script confere), mas a dona confirma se isso continua "parcial e suficiente" ou se quer uma
   linha com *il a / elle a* (por exemplo, na nota *J'ai vingt ans: por que ai* de "Dizer a idade: de 1 a 29": *Tu as quel âge ? Il a vingt ans.*).
5. **Gatilho da "Gramática: perguntar sim ou não".** A decisão 335 dá como gatilho *Tu habites à Paris ?* e *Tu parles anglais ?*. Hoje nenhuma das duas existe no
   publicado de "Dizer de onde é, onde mora e que línguas fala" (o diálogo publicado tem *Tu habites en Allemagne ?*, que já está na lista de reescrita). No desenho
   das lições dessa unidade com a dona, as duas perguntas entram como frase ou fala, de preferência no fim da unidade, logo antes da gramática; a nota
   *Est-ce que tu parles anglais ?* (versão grátis) fica, mas passa a vir colada na gramática: pode ser bem curta.
6. **Diálogo "No parque" e frase `A1-3-p7`.** O diálogo publicado "No parque" (*Quel âge a ta fille ? ... Et ton fils ? Ils sont grands !*) hoje está em "Dizer a idade:
   de 1 a 29" como exceção formal da regra 11 (*fille, fils, grand*). Se for para "Perguntar a idade dos outros" (M2.3, como a dona sugeriu), *fille* e *fils* já são
   cartão ("Apresentar a família", M2.1) e a exceção fica só com *grand* ("Descrever a aparência", M2.5); o assunto (idade de terceiros) também combina mais. A frase
   `A1-3-p7` *Quel est l'âge de ton père ?* tem o mesmo caso (*père* não é cartão em "Dizer a idade") e pode ir junto, com a chave. Decidir no desenho de "Perguntar a
   idade dos outros".
7. **Tempo digitado dos dois módulos** (3h55 e 3h45) não foi recalculado: "Apresentar-se" perdeu 13 cartões e 5 lições e "Família e pessoas próximas" ganhou o mesmo
   (regra 16 suspensa, decisão 325). Fica para a nova medição.

## Conferido e sem problema

- **"Dizer a idade: de 1 a 29"** depois da gramática de perguntas: a nota *T'as quel âge ?* (pergunta só pela entonação) passa a vir depois da gramática que explica a
  entonação, o que ajuda. O relatório não acusou nada novo na unidade.
- **"Gramática: *être* e *avoir*"** sem "Perguntar a idade dos outros" antes: as telas e os exercícios publicados não usam números de 11 a 69 (o relatório não mudou);
  o exercício *Ils ___ deux enfants.* já estava na lista de reescrita (decisão 202).
- **Versão grátis (regra 12)** das 6 gramáticas dos dois módulos: todas com menção em unidade anterior de vocabulário ("perguntar sim ou não": "Cumprimentar e se
  despedir" e "Dizer de onde é, onde mora e que línguas fala"; "masculino e feminino": unidade 2 e "Dizer a profissão"; "artigos e plural" e "possessivos": "Apresentar
  a família"; "palavras interrogativas (pessoas)": unidade 2, "Dizer de onde é..." e "Apresentar a família").
- **Desafios publicados e ditados** dos dois módulos: nenhuma palavra nova não vista. O ditado `d1-p1` (*Mon amie s'appelle Julie.*) continua com *amie* não vista, como
  antes (fica na revisão do módulo).
- **"Países e cidades"**: as duas notas usam só cartões da própria unidade e de antes (*partir*, *venir de*, os países, *les États-Unis* da M1.3, *aller* de "Verbos muito
  usados"); a gramática de preposições vem logo depois e continua com a versão grátis completa.
- **Progresso**: as duas unidades que mudam de módulo são novas (sem chave publicada); a regra "quem já concluiu o módulo continua com ele concluído e com o Ponto de
  verificação aprovado" (decisão 330, item 4) ficou registrada nas duas (`progresso_modulo_concluido` no `mapa.json`) e no `08 v2`.
