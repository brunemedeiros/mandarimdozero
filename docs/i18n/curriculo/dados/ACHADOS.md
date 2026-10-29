# Achados ao passar o mapa para dados (2026-10-26)

Fonte: `docs/i18n/curriculo/08-mapa-final-a1-a2-v2.md` (aprovado e congelado, decisão 259). Dados: `mapa.json` e `excecoes.json` desta pasta.
Contas: `node fr/scripts/curriculo_mapa.js --tabela` e `--conferir`. Teste: `node tests/curriculo/test_mapa_totais.js`.
Nada do json foi ajustado para "bater": onde o 08 é ambíguo ou o número diverge, está aqui. Nenhum item muda o mapa aprovado; os que pedem
decisão estão marcados **(para a dona)**.

## 1. O que bate com o 08

- A1: 9 módulos, 57 unidades (34 + 23), 366 cartões, 725 A/B, cartões por módulo 66/33/50/49/33/29/35/41/30, ~151 lições
  (24/15/19/21/14/12/17/17/12), 133 notas, ~31h00 (depois das decisões 311 a 314, 2026-10-29: "Cumprimentar e se despedir" com 16 cartões; antes 362, 717,
  62 no M1; antes do pedido de mudança das decisões 267 a 279, 360, 713, ~150, 132 e ~30h40).
- A2: 10 módulos, 58 unidades (36 + 22), 428 cartões (418 novos + 10 publicados), 852 A/B, cartões por módulo 47/36/34/47/36/36/48/48/48/48,
  ~33h10 (a regra "40 min por unidade de vocabulário, 25 por gramática" reproduz os 10 tempos do 08), ~76 notas (77 com *le château*).
- Os 204 cartões de palavra publicados estão todos no mapa (200 como chave + 4 fundidos); as 30 unidades publicadas também.
- Regra 14 (nenhuma palavra é cartão em duas unidades), regra 13 (até 12, fora os conjuntos fechados e "Cumprimentar e se despedir", liberada pela decisão 308), regra 12 (versão grátis antes de cada
  gramática), regra 16 (até 3h55 para todos os módulos, sem exceção, decisão 270) e títulos das notas de vocabulário (decisão 246): sem problema.

## 2. Divergências e ambiguidades

1. **Lugar do arquivo.** A decisão 228 fala em `docs/i18n/curriculo/mapa.json`; o arquivo ficou em `docs/i18n/curriculo/dados/mapa.json`, como pedido na tarefa.
2. **Tempo do A1 sem regra absoluta (para a dona).** O 08 (seção 1, linha "A1: tempo de trilha") só dá regras de diferença ("+5 min por palavra e
   +10 min quando a unidade passa de 10 palavras"), aplicadas sobre estimativas feitas à mão. Não existe fórmula que gere os 9 tempos: "Na cidade"
   (3 vocabulário + 3 gramáticas, 29 cartões) tem 3h00 e "Lazer, convites e passado" (3 + 3, 30 cartões) tem 3h20. O json guarda o tempo do 08 por
   módulo (`tempo_08_min`) e o script usa esse valor no A1. Para o tempo ser gerado (decisão 228), falta a dona aprovar uma regra para o A1
   (a do A2 daria, por exemplo, 4h10 para "Apresentar-se", que hoje tem 3h35).
3. **Notas do A1: 132 no json x "~131" no 08** (seção 1, linha "A1: notas"). Contadas todas as notas da coluna "Notas", sem as cortadas (N30 e N36);
   por módulo: 23, 15, 16, 15, 17, 11, 12, 9, 14. Não achei qual nota o 08 deixa de fora (o número do 08 é aproximado).
4. **Lições de "Dizer o nome e a nacionalidade" (A1-2).** Com 11 palavras, a regra 13 daria 4 lições + Revisão, mais a lição do alfabeto = 6; o 08
   (seção 1, linha das lições) diz 3 lições + Pronúncia + Revisão = 5, e é com 5 que o M1 dá 23. O json guarda `licoes_08: 5` só nessa unidade.
5. **Lições de "Corpo e dores" (A1-15, agora A2).** 11 palavras (regra: 4 lições + Revisão = 5), mas o 08 diz "3 lições + a lição final" = 4
   (unidade publicada, decisão 130). O json guarda `licoes_08: 4`.
6. **Lições do A2 não desenhadas.** O 08 diz "~145 a 180"; pela regra do A1 dá 178. É estimativa, não desenho.
7. **Notas do A2 (como se chega a 76).** Entram: as da coluna "Notas", a candidata *le goûter* (A2-1), as duas notas breves **propostas** de *rien*
   (A2-6) e *personne* (A2-24) da tabela "Negação complexa", e as outras 20 versões grátis *(nota nova)* que a coluna "Versão grátis" das gramáticas põe
   numa unidade de vocabulário sem que a coluna "Notas" dela as liste (marcadas `origem_coluna: "versao_gratis"`). *le château* fica fora
   (`status: "se couber"`). Assim dá 76, como o 08; mas a interpretação é minha.
8. **[RESOLVIDO, decisão 260: um lugar só, `versao_gratis_em` na gramática; a unidade que abriga é derivada] Colunas de versão grátis que não dizem a mesma coisa (19 pares).** A linha da gramática cita a unidade, mas a linha da unidade de vocabulário
   não lista a gramática em "abriga a versão grátis de" (no json: `versao_gratis_em` x `abriga_versao_gratis_de`; lista completa em `--conferir`):
   - "Gramática: palavras interrogativas (pessoas)" (`A1-g22`) cita "Dizer o nome e a nacionalidade", "Dizer de onde é e onde mora" e "Apresentar a família";
   - "Gramática: perguntar sim ou não" (`A1-g12`) cita "Cumprimentar e se despedir" (nota *Ça va ?* sobe), que diz "(nenhuma)";
   - "Gramática: *faire* e *prendre*" (`A1-g5`) cita "Fazer a lista do mercado" (*je fais les courses*);
   - "Gramática: adjetivos" (`A1-g15`) cita "Dizer o nome e a nacionalidade" (nota do feminino);
   - "Gramática: o verbo *aller*" (`A1-g13`) cita "Dizer as horas e a rotina" (frases com *je vais*);
   - "Gramática: palavras interrogativas (lugar, hora e coisas)" (`A1-g23`) cita "Dizer as horas e a rotina" e "Perguntar o preço e pagar"
     (e "diálogos de M3, M4 e M6", sem unidade: guardei só as duas notas);
   - "Gramática: *il y a* e *c'est* + adjetivo" (`A1-g24`) cita "Apresentar a família" (nota *c'est*);
   - "Gramática: modais e *il faut*" (`A1-g6`) cita as fórmulas *vous pouvez* ("Cumprimentar e se despedir") e *je voudrais* ("Gostos e pedidos no
     café"); o 08 não diz a unidade das fórmulas, tirei da coluna "Gramática" dessas unidades;
   - no A2: "Gramática: marcar o tempo" (`A2-g5`) cita "Contar o que você fez" (A1); "Gramática: pronomes demonstrativos e *lequel*" (`A2-g8`) cita
     "Comprar roupas" (nota *ce, cette, ces*); "Gramática: superlativo" (`A2-g7`) cita "Descrever a moradia"; "Gramática: condicional dos conselhos"
     (`A2-g11`) cita *je voudrais* ("Gostos e pedidos no café"); "Gramática: pronome *y*" (`A2-g20`) cita "Pegar transporte" e "Férias e hotel";
     "Gramática: causa, consequência e finalidade" (`A2-g24`) cita "Convidar, aceitar, recusar e se desculpar" (*parce que*).
   Não é erro de regra (todas vêm antes da gramática); é a coluna da unidade que ficou incompleta no 08.
9. **Chaves.** O 08 não traz a chave de cada palavra (só `A1-14-v6` de *prendre* e as da `A1-15`). As chaves vieram de `fr/content.js` pelo texto
   exato da palavra, e o teste confere todas contra `fr/published_ids.json`. Nas 4 fusões, a chave sobrevivente seguiu a direção dita no 08
   ("*français, brésilien* → M1.2", "*manger* → M4.2", "*hier* → M3.3"): `A1-2-v7` (fundida `A1-9-v0`), `A1-2-v8` (`A1-9-v1`), `A1-5-v7` (`A1-6-v6`),
   `A1-7-v4` (`A1-20-v0`). Qual chave sobrevive em `STUDY_KEY_MERGES` ainda não foi registrado (Etapa 0b parte 2).
10. ***s'il vous plaît / s'il te plaît*** usa a chave publicada `A1-1-v6` (hoje o cartão é só *s'il vous plaît*); se o par virar dois cartões, o
    informal é item novo (pergunta 10 do 08). As nacionalidades ficaram na forma publicada ("*américain / américaine*"); o 08 escreve só o masculino
    com "(pares)".
11. **Tipo "pronúncia".** Nenhuma unidade do mapa é de pronúncia: a lição do alfabeto fica dentro de "Dizer o nome e a nacionalidade" (cartões
    *épeler* e *Ça s'écrit comment ?*, marcados `licao: "pronuncia"`; contam como cartão, não como palavra) e a prática "masculino ou feminino?"
    dentro de "Gramática: masculino e feminino". O campo `tipo` só tem `vocabulario` e `gramatica`.
12. **`id_funcao` das gramáticas (para a dona / grade comum).** Gerado em kebab-case do nome, como pedido; nas gramáticas ele carrega palavras do
    francês (`gramatica-etre-e-avoir`, `gramatica-faire-e-prendre`, `gramatica-savoir-x-connaitre`), o que não é independente do idioma
    (decisão 238). O nome do slot gramatical da grade comum ainda não foi definido.
13. **Confiança não registrada.** Ficaram `n/r` porque o 08 não dá a confiança: as notas de vocabulário "Mais sobre pagamento e contato",
    "Outras palavras de moradia", "Outras palavras de países" e "Outras palavras de caráter"; as notas *nova* com gancho de "Apresentar a família"
    (artigos, *son / sa*, *pas de*), "Dizer de onde é e onde mora" (*est-ce que*), "Dizer as horas e a rotina" (pronúncia de *travailler*, *se*),
    "Frequência" (*ne... jamais*), "Perguntar e indicar o caminho" (*Tourne / Tournez*), "Lugares da cidade" (*au*), "Férias e hotel" (*Je vais réserver*),
    "Falar de lazer" (*Tu veux sortir ?*), "Contar o que você fez" (*Tu as mangé ?*), a do *ne... pas* de "Dizer o nome e a nacionalidade" e as 20
    versões grátis do A2 do item 7, mais as notas propostas de *rien* e *personne*.
14. **Notas de vocabulário com lista aberta.** "Outras palavras de países" diz "*le Japon*..." e "Outras palavras de caráter" não lista palavras
    ("o que passar de 12"). O json guarda só o que o 08 escreve.
15. ***l'euro* (para a dona).** A exceção (decisão 209) é registrada no 08 nas linhas de "Perguntar o preço e pagar" e "Comprar roupas", mas as falas
    publicadas *Voilà, ça fait cinq euros.* (`A1-5-d4`, "Gostos e pedidos no café", antes) e *Ça coûte deux euros.* (`A1-14-d3`, "Pegar transporte")
    também usam *euros*. Falta dizer se a exceção vale para o A1 inteiro.
16. ***cuit***: o 08 diz "cartões no A2 M5"; no `excecoes.json` ficaram os dois candidatos, *bien cuit* ("Reservar e pedir no restaurante") e *cuire*
    ("Explicar uma receita").
17. **Função vazia.** O 08 não preenche a coluna "Função" em várias unidades do A2 ("Contar a formação", "Falar do trabalho", "Resolver no banco",
    "Procurar moradia", "Trânsito e carro", "Telefonar e deixar recado", "Escrever para convidar, recusar e agradecer", "Sentimentos e reações",
    "Internet e redes" e 7 gramáticas): `funcao: null`. O "consigo" dos módulos do A2 é a coluna "Função" da linha do módulo.
18. **Telas e exercícios.** Guardados só quando o 08 dá o número na linha; o A2 tem a regra geral "4 telas e 8 exercícios, salvo indicação", que o
    script não usa (não entra em nenhuma conta). "Gramática: *il y a* e *c'est* + adjetivo" está "a desenhar".
19. **Regra 14 por texto.** A conferência compara o texto do cartão; pares de lexemas diferentes (*le poste / la poste*, *le jour / un jour*,
    *goûter / le goûter*) não aparecem como repetição, de propósito. A conferência por lexema continua com o `auditor-curricular` (lista da seção 3.2 do 08).
20. **Teste de Nível.** "Teste de Nível A1" (`A1-final`) não é unidade: fica em `niveis[0].teste_de_nivel`. O 08 não tem linha de teste de nível do A2.
21. **[RESOLVIDO pelas decisões 285 e 313: a menção breve basta e *tu vas bien ? / vous allez bien ?* virou cartão de "Cumprimentar e se despedir", uma pergunta de sim ou não pela entonação; a `A1-1` fica no `versao_gratis_em`] Pedido de mudança 267 a 279 (2026-10-27): versão grátis de "Gramática: perguntar sim ou não" (`A1-g12`, módulo "Família e pessoas próximas") (para a dona).**
    O 08 dava como versão grátis a nota "*Ça va ?* sobe, *Ça va.* desce" de "Cumprimentar e se despedir" + a nota de *est-ce que* de "Dizer de onde é e onde mora".
    A nota de "Cumprimentar e se despedir" saiu (decisão 267). O `versao_gratis_em` da gramática continua com `A1-1` e `A1-9` (não mexi: fora do pedido); a regra 12
    continua atendida pela `A1-9`. Falta decidir se a `A1-1` sai da lista ou se a nota nova "Como perguntar 'tudo bem?'" (*Ça va ?*, *Comment vas-tu ?*,
    *Comment allez-vous ?*) passa a ser a parte grátis da M1.1.
22. **[RESOLVIDO pelas decisões 313 e 314: 4 lições por função, com id e título em `licoes` no `mapa.json`] Lições de "Cumprimentar e se despedir" (A1-1) no campo `licao`.** A regra 13 dá 4 lições + Revisão da unidade para 12 palavras. As lições 1 ("Dizer olá") e 2
    ("Agradecer e se despedir") seguem o pedido (4 cartões cada); a lição 3 do rascunho (`piloto-m1/A1-1/`, "Pedir por favor e perguntar como vai", 4 cartões) foi
    dividida em lição 3 (*s'il vous plaît / s'il te plaît, pardon*) e lição 4 (*ça va, à bientôt*). Títulos das lições 3 e 4 e a distribuição final: a decidir no
    rascunho, com a dona.
23. **"Cumprimentar e se despedir" polida pela dona (decisões 311 a 314, 2026-10-29).** Aplicada no `mapa.json` com três campos novos na unidade:
    `licoes` (número, id e título de cada lição; a Revisão da unidade não entra), `momento` em cada nota (lição e cartão depois do qual ela aparece) e
    `exemplos` em cada nota ({fr, pt-BR}). As palavras da nota que contam como vistas nos diálogos saem dos exemplos com tradução (`palavrasDaNota` em
    `fr/scripts/curriculo_mapa.js`, decisão 274); o campo `palavras` digitado só continua nas notas antigas de vocabulário, que não têm exemplo. Conferência
    nova: `conferirLicoesDaUnidade` (no `--conferir` e no teste). O json bate com o 08 atualizado: 366 cartões, 725 A/B, 66 no M1, ~151 lições, 133 notas,
    ~31h00. **Nenhum número diverge**; dois pontos para registro:
    - **Lições**: a tarefa previa "+1 lição", mas a unidade já tinha 4 lições + Revisão desde a decisão 270 (12 palavras); com 16 continua com 4 + Revisão, e o A1 fica em ~151.
    - **Tempo (para a dona)**: o "Apresentar-se" fica com o número digitado, 3h55 (decisões 300 e 308). Pela regra antiga de diferença (+5 min por palavra), os 4 cartões
      a mais dariam +20 min (4h15, acima do teto de 3h55 da regra 16). O teto só passa porque o tempo é digitado; quando a regra 16 for revista, este é o primeiro caso.
24. **Sobreposição com "Dizer o nome e a nacionalidade" (A1-2) (para a dona / auditor).** A nota "*Moi, je m'appelle Ana. Et toi ? Et vous ?*: *moi, toi, vous* são
    tônicos" agora vem depois do cartão *et toi ? / et vous ?* (A1-1). Não fere a regra 14 (nota não é cartão), mas o texto da nota pode partir do cartão já
    visto. Também: *je* e *tu* são cartões da A1-2, e a A1-1 já usa *je vais bien* e *tu vas bien ?* como expressões (fórmula, sem cartão próprio de *je* ou *tu*).
25. **Versão grátis do verbo *aller* (`A1-g13`).** *je vais bien* e *tu vas bien ? / vous allez bien ?* passam a ser uma menção breve de *aller* já na A1-1
    (decisão 285). O `versao_gratis_em` da gramática continua com "Dizer as horas e a rotina"; não mexi (fora do pedido).
