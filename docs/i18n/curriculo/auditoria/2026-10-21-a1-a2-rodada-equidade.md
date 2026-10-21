# Auditoria do mapa A1 (9 módulos) e A2 (10 módulos): rodada da equidade

Data: 2026-10-21 (depois das decisões 125 a 135 do `12` e das regras 1 a 14 do `15`). Agente: `auditor-curricular`. **Só relata: nada foi editado no mapa nem no código.**
Rodada anterior (histórico): `2026-10-19-a1-a2-rodada-saude-modais.md`.
Fontes conferidas: `08-mapa-final-a1-a2-v2.md` (inteiro), `12` (decisões 73 a 135), `15`, `16`, `00`, `.claude/rules/conteudo-trilha.md`; conteúdo publicado por script
(`scripts/lib/course-content.js`, `load('fr')`): vocabulário, lições (`vocabIdx`), frases, diálogos, notas e gramáticas das 30 unidades; `fr/dictations.js`;
`fr/scripts/challenges_import/*.json` (por `unitId` e `moduleId`); `fr/app.js` (`moduleUnlocked`, `moduleCompleted`, `levelCompleted`, `markUnitCompleted`, `buildLevelTestQueue`).

Cada achado diz **quem resolve**: **[dona]** precisa de decisão; **[editor]** o editor do mapa corrige sem perguntar (aplica regra ou decisão já tomada).

---

## 1. O que bloqueava na rodada anterior: resolvido?

| Achado de 2026-10-19 | Situação hoje | Resta |
|---|---|---|
| B1 Conclusão com paywall | decidido (opção A, decisão 125); lista do que implementar na seção 5 do `08` | **incompleta**: falta o desbloqueio da unidade seguinte (Bloqueia 1) |
| B2 Versões grátis | coluna "Versão grátis" em todas as 45 gramáticas, todas com gancho antes da gramática | 1 rótulo que aponta um gancho depois (A2 M4.1), partes de conceito sem gancho (Atenção 1 a 4) |
| B3 Decisão 113 nas tabelas | resolvido: M7.1 10, M7.4 10, M7 34, A1 344 (soma conferida) | nada |
| B4 Nota e frases antes do cartão (`A1-17`) | resolvido para a nota *la fenêtre* e as 4 frases | *La salle de bain est à côté de la chambre.* fica na M7.1 e *à côté de* só é cartão na M7.5 (Atenção 9) |
| B5 `A1-15` "mesmas chaves, 11 cartões" | resolvido (8 + 3, 3 lições + a final, duas refeitas; A2 428) | a unidade fica com 11 cartões num conjunto aberto (Bloqueia 2) |
| B6 "Pedir ajuda" com PC | resolvido: M8.6 no presente, PC só do M9 em diante (decisão 128) | *trouver* (pergunta 61) |
| M6.4 contrações | resolvido: "ensinadas por completo pela 1ª vez" na M6.4, nota grátis na M6.3; espiral (linha 459) e 4.1 coerentes | nada |
| Frequência M3.6/M3.7 | resolvido: unidade nova antes da gramática, A1 56 unidades | o próprio mapa ainda usa *Je lis toujours le soir* na M3.7 (*lire* só na M9.1) (Atenção 6) |
| Cortes para 10 | resolvido nas 4 unidades (M5.1, M5.4, M7.1, M8.1) | efeitos colaterais (Atenção 10) e 3 unidades abertas que ninguém cortou (Bloqueia 2) |

---

## Bloqueia

1. **Opção A tranca o aluno gratuito na 1ª gramática (M1.5) [editor, na lista de implementação].** O desbloqueio é linear por nível: `markUnitCompleted` (`fr/app.js:4519`)
   só abre a unidade `idx+1` quando a anterior é concluída. Se o gratuito não pode fazer a M1.5 (`A1-g1`), a M1.6 nunca abre, e o mesmo em todas as 45 gramáticas. A seção 5 do
   `08` (linha "Conclusão com paywall ligado") só fala de `moduleCompleted`, `levelCompleted` e Ponto de verificação. **Recomendação:** acrescentar o item "(0) a unidade de
   gramática não trava a seguinte para quem não é Premium" na mesma função pura, com teste. Pergunta 60 (Teste de Nível): o `buildLevelTestQueue` monta a prova a partir do
   `buildCheckpointQueue` de cada módulo (`fr/app.js:4739`), então um Ponto de verificação por plano já leva o Teste de Nível junto; o "módulo seguinte" é só a próxima unidade,
   ou seja, é este mesmo item. *Recomendo sim à 60*, sem regra nova.
2. **Regra 13 (conjunto aberto: no máximo 10) x o mapa [dona].**
   - A1 com conjuntos abertos acima de 10 que nenhuma decisão cobre: **M1.2 (`A1-2`) 11** (*le prénom* entrou depois da regra 32, decisão 108) e **M2.3 (`A1-16`) 12**
     (aparência não é conjunto fechado; a linha 49 do `08` a chama de fechada). A decisão 129 chama de "fechados conforme o mapa" M3.1 (12, rotina), M3.3 (11) e M4.1 (11,
     comida), que pela definição da própria regra 13 ("números, dias, meses, horas") não são fechados.
   - **A2 inteiro** foi contado com 12 palavras por unidade (linha 53: "12 por unidade + 13 em *Descrever o caráter*"); M1.3 (12 a 14), M4.3 (12) e M8.6 (12) têm listas de 12;
     a A2 M4.1 (`A1-15`) fica com 11. A regra 13 não diz que vale só para o A1.
   - **Recomendação:** a dona diz se a regra 13 vale para o A2 (se valer: ~360 cartões em vez de 428, e o tempo cai ~5 min por unidade, o que resolve parte da carga do M8 e do M10)
     e confirma por escrito as exceções do A1 (M1.2, M2.3, M3.1, M3.3, M4.1) ou corta.
3. **Exercícios e exemplos publicados com palavra depois do cartão, por causa da nova ordem, que o mapa não lista [editor].** A seção 5 (linha 499) e a seção 7 subestimam:
   - **M3.2 (`A1-g3`)**: *Tu manges à midi.*, *Nous mangeons...*, *Vous mangez du pain.*, *Vous ___ le fromage ?* e a regra *manger → mangeons*: *manger, le pain, le fromage*
     agora são cartões da M4.1 (a `A1-5` foi do M2 para o M4, depois da rotina). O mapa diz "1 exercício reescrito". *Tu te réveilles tôt ?* e *Je me lève...* (pronominais)
     estão numa gramática que não tem mais pronominais.
   - **M8.2 (`A1-g4`)**: "nada muda nesta rodada", mas os exemplos e exercícios publicados usam *Elle voyage à Tokyo*, *aux Pays-Bas* (2 vezes), *Ils vivent*, *Londres*: nada
     disso é cartão; *voyager, vivre, les Pays-Bas* não existem no A1. Trocar por *aller, habiter* e os 10 países da M8.1 (*aux États-Unis*).
   - **M3.7 (`A1-g8`)**: todos os exemplos e exercícios são de lazer (*lire, jouer, sortir, chanter, danser*, M9.1); o mapa já manda reescrever, mas o próprio exemplo novo do
     mapa (*Je lis toujours le soir.*) repete o erro.

---

## Atenção

**Versão grátis (pergunta 2 do pedido)**

1. **Gancho depois da gramática: A2 M4.1 (`A1-15`)** diz "abriga a versão grátis de M2.6 (*depuis*)", mas a M2.6 (`A2-g5`) vem antes; a decisão 134 põe a versão grátis na
   M2.5. [editor] Trocar para "abriga a versão grátis de M4.4 (parte), M5.4 (parte)"; a nota *depuis* fica como retomada, sem dizer que é a porta de entrada.
2. **M2.6 (`A1-g22`) ensina *combien de* sem versão grátis.** A coluna diz "já existe: diálogos de M1 e M2", mas *combien* saiu da M1.3 para a M5.1 e nenhum diálogo de M1
   ou M2 tem *combien de*. [editor] Tirar *combien de* da `A1-g22` (a `A1-g23`, M6.6, já o tem, depois da M5.1) ou pôr *Tu as combien de frères ?* no diálogo novo da M2.1.
3. **Telas de negação "por diálogo" sem diálogo posicionado**: M3.4 (*ne* antes do pronome), M6.2 (imperativo negativo), M8.4 (futuro negativo). O `16` diz "M3.1 ou M3.3, a
   escrever", "M6.1", "M8.3"; as linhas dessas unidades no `08` não registram o diálogo novo (a M8.3 ainda diz "nada muda nesta rodada"). [editor] Pôr o diálogo na coluna
   "Muda" das três unidades.
4. **Partes de gramática sem versão grátis** (menores): procedência *des / d'* na M8.2 (a nota da M8.1 só fala de *aller en, au, aux, à*; +1 linha *Je viens des États-Unis,
   d'Italie*); pronominais no PC da M9.6 (*Je me suis levé(e)*; +1 exemplo na nota da M9.4); A2 M2.4 concordância do particípio (*je l'ai perdue*); A2 M9.4 inversão com *-t-*;
   A2 M8.7 *aucun* e *ni... ni* só por diálogo e anúncio (aceitável pela decisão 64). [editor]
5. **M1.2 (`A1-2`) sem a nota de negação.** O `16` diz que a M1.2 tem "a única nota de primeira aparição" (*Tu es française ? Non, je ne suis pas française.*), e o resumo do
   `16` conta 6 notas com ela; a linha da M1.2 no `08` não lista nem a nota nem o diálogo. [editor] Acrescentar na M1.2.

**Palavra antes do cartão (pergunta 3 do pedido e o que a nova ordem criou)**

6. **M3.7 (`A1-g8`)**: exemplo do mapa *Je lis toujours le soir.* (ver Bloqueia 3). [editor] Exemplo com rotina: *Je me lève toujours tôt.*
7. **Pendências que o editor deixou, uma a uma:**
   - ***trouver* na M8.6 (`A1-32`)**: pergunta 61 aberta. *Recomendo cartão* (a M8.6 tem 9; fica com 10; A1 345). [dona]
   - ***en bois* no A2 M3.1 (`A2-7`)**: a regra 14 já decide (o A1 M5.4 tem *le bois* e a nota "*en* + material"). [editor] Tirar da lista; A2 427; a pergunta 62 vira só registro.
   - **Nota da M6.3 (`A1-30`) "farmácia: cruz verde, 15 e 112"**: 15 (SAMU) e 112 não têm a ver com farmácia nem com "Lugares da cidade", e o 112 volta na M8.6. [dona] *Recomendo*
     M6.3 só a cruz verde (e, se quiser, a *pharmacie de garde*); 17 e 112 na M8.6; 15 e 18 no A2 M4.3 (corrigir a linha da A2 M4.3, que diz que o 15 "já veio no A1").
   - ***L'hôpital est loin d'ici.*** (frase publicada da `A1-8`, M6.1): *l'hôpital* é cartão só na M6.3. [editor] A frase vai com a chave para a `A1-30` (cabe no tema) ou troca
     para *La gare est loin d'ici.*; registrar na seção 7. Na mesma unidade: *La rue est très calme le soir.* usa *calme* (cartão da M7.2); aceitar ou trocar por *La rue est très grande.*
   - **M7.3 (`A1-g24`) com dois conceitos**: *il y a* (existência) e *c'est* + adjetivo (avaliação) são estruturas diferentes, mas os livros as ensinam juntas para descrever
     um lugar, e a dona pediu (decisão 103). *Aceitável pela regra 3* ("conceitos muito ligados") se tiver uma tela de contraste (*Il y a un salon. C'est un grand salon.*) e
     ficar em 4 a 5 telas. [dona confirma]
   - ***blessé* no A2 M4.3 (`A2-11`)**: a frase publicada *La main est blessée.* (`A1-15`, A2 M4.1) vem antes do cartão. [editor] A frase vai com a chave para a M4.3 ou vira
     *J'ai mal à la main.* (mesmo sentido? não: chave nova).
   - ***se sentir* no A2 M9.5 (`A2-29`)**: a linha diz "+ *se sentir*" na lista e "+ *se sentir* + adjetivo" no "Muda"; já é cartão da A2 M4.1. [editor] Regra 14: só frase e
     nota (*Je me sens triste*), fora da lista.
   - ***fumer* na nota da A2 M1.4 (`A2-2`)**: o exemplo *Avant je fumais...* usa *fumer*, cartão da A2 M8.6, e puxa o tema saúde para "Lembranças". [editor] Trocar por um exemplo
     com as palavras da própria unidade: *Avant, j'habitais à la campagne ; maintenant, je n'habite plus là.*
   - **N43 da M9.1 (`A1-19`)**: a fala publicada *On ne sait pas encore !* usa *savoir* (saiu do A1, A2 M6.4) e *pas encore* (cartão só na M9.4, depois). E a queda do *ne* já
     tem nota antes, na M5.3 (*C'est pas cher*, `16`): a N43 hoje se apresenta como 1ª vez ("a simplificação mais comum...") e usa a forma abreviada de "para" no texto. [dona] *Recomendo* reescrever a
     fala (*On regarde ce soir !*, chave nova) e passar a nota de queda do *ne* (breve, 2ª aparição) para a nota grátis dos modais da mesma unidade (*Je peux pas* = *je ne peux
     pas*); o gancho "N43" da versão grátis da A2 M6.4 sai (a M6.3 já tem o dela).
   - **Exemplos da M9.2 (`A1-g6`) com *prochain* e *voir***: *prochain* só aparece na M8.4 (Premium; quem faz a M9.2 é Premium e já viu) e numa frase publicada da M3.3
     (*La semaine prochaine, je pars en voyage*); *voir* já aparece no diálogo publicado da M9.1 (*Quel film vous allez voir ?*). Os dois têm exposição antes, nenhum tem cartão.
     [dona] É o caso geral da sugestão 2 ("palavra de frase"); sem essa regra, trocar *voir* por *Tu dois regarder ce film !* também não resolve (*regarder* não é cartão).
   - **Exemplos publicados da `A1-g4`**: ver Bloqueia 3. [editor]
8. **Frases publicadas que a troca de ordem deixou antes do cartão e não estão na seção 7** [editor, acrescentar à lista do `12` 132]:
   - M2.3 (`A1-16`): *Le pull est vert et jaune.* (*le pull* M5.3, *jaune* M5.4): só *Mon chat est noir et blanc.* e *C'est une jolie robe rouge.* foram para a M5.4.
   - M4.1 (`A1-5`): *La pomme est rouge et sucrée.* (*rouge* passou da M2.3 para a M5.4, depois).
   - M3.1 (`A1-6`): *Le midi, je mange à la maison.* (*manger* vai para a M4.1 pela fusão; *la maison* M7.1).
   - M2.5 (`A1-9`): *Je viens du Portugal.* (Portugal só na M8.1; a decisão 109 limita a nota a França e Brasil) e *La nationalité est écrite sur le passeport.* (M8.3).
   - M9.4 (`A1-20`): *Récemment, j'ai changé de travail.* (o cartão *récemment* vai para o A2 M2.5; a frase vai junto ou sai).
   - M6.5 (`A1-14`): *Le vélo est plus rapide en ville.* (comparativo antes da nota grátis da M7.2) e *La voiture est garée devant la maison.* (*devant* M7.5, *la maison* M7.1).
9. **M7.1 (`A1-17`)**: *La salle de bain est à côté de la chambre.* fica na M7.1; *à côté de* é cartão da M7.5. [editor] Ir para a M7.5 ou trocar (*La salle de bain est petite.*).
10. **Efeitos dos cortes para 10 (decisão 129)**:
    - M5.1 (`A1-28`): a nota *courriel / arobase* tinha gatilho no cartão *le mail*, que virou nota de vocabulário; precisa de outro gatilho (`afterKey`). [editor]
    - M5: o "Consigo" promete "dar meu número de telefone, **celular e e-mail**", mas *le portable, le mail* agora são nota, e o Ponto de verificação não usa notas (regra 4):
      o gratuito não é avaliado nisso. [dona] Aceitar ("Consigo" = exposição) ou tirar celular e e-mail do "Consigo".

**Progresso dos alunos**

11. **`récemment` também muda de nível** (A1 `A1-20` → A2 M2.5, `A2-6`), como a `A1-15` e *gentil*: a seção 5 diz "O A2 é inédito, menos a `A1-15` e o cartão *gentil*" e a contagem
    diz "9 já publicadas (8 + *gentil*)". [editor] São **10 publicadas e 418 novas** (o total 428 não muda) e a tag `nivel-A1` → `nivel-A2` (item 4 do risco) vale para ela também.
12. **Lições publicadas que perdem palavras: a seção 5 lista 3, são pelo menos 19** (conferido pelos `vocabIdx`): `A1-3` `primeiros-numeros` e `idade` (*zéro, combien*);
    `A1-6` `rotina-diaria` (*manger*); `A1-7` `meses-e-data` (sai inteira para a M3.5); `A1-8` `hospital-estacao-em-frente` (*l'hôpital*); `A1-9` `nacionalidades-1` (*français,
    brésilien*); `A1-10` `numeros-30-50`, `numeros-60-80`, `numeros-90-100` (saem inteiras); `A1-16` as 3 (cores e *gentil*); `A1-18` `cama-mesa-cadeira` (sai inteira) e
    `sofa-luminaria-em-cima`; `A1-20` `ontem-anteontem-semana-passada` (*hier*) e `dois-dias-atras-ja-recentemente` (*récemment*); além das 3 já listadas (`A1-15` 2, `A1-17` 1): 16 a mais.
    [editor] Listar todas na seção 5 com o destino (`RETIRED_LESSON_IDS` ou lição refeita) e o efeito no `STUDY_ITEM_GATE`; melhor ainda, o `curriculo_ops.js` gerar essa lista.
13. **Desafios publicados com palavra fora do lugar, que o mapa não cita** (`lote-a1-m5.json`, `unitId: "A1-16"`, vão para o `A1-m7`, Família): *Ma sœur est grande et
    gentille.* (*gentil* saiu do A1), *Son pull est rouge.* (M5.3 e M5.4) e as expressões de roupa *Ça te va bien !* e *Ça te plaît ?* (tema de compras, não de aparência).
    [dona, dado de produção, pergunta 55] Reescrever ou passar para o `A1-m8` (Compras).
14. **Ditados com o `moduleId` antigo caem em módulo de outro tema**: pelos ids por sobreposição, `d3` (caminho) e `d3-p2` (roupas) ficam no `A1-m3`, que agora é "Comer e
    beber"; `d2` (padaria) fica no `A1-m2`, "Rotina e calendário"; `d5-p2` termina com *Mon pull est rouge.* no `A1-m5` (Casa). A linha 503 manda "re-hospedar", mas sem destino.
    [editor] Tabela ditado → módulo novo, para a dona aprovar junto com a pergunta 55.

**Carga (pergunta 4 do pedido)**

15. **A1 M1 com ~3h35** passa de 3h30 e ninguém citou; **A1 M3** com 7 unidades, 48 cartões e 3 gramáticas (~3h25) e **A1 M9** com 3 gramáticas (~3h20) estão no limite. [dona] Opções na Sugestão 4.
16. **A2 M8 (~4h10) e M10 (~3h55)**: além do tempo, os dois têm **dois temas** (ver 17). [dona] Opções na Sugestão 5.

**Tema deslocado no A2 (pergunta 6 do pedido)**

17. - **A2 M8 "Moradia e cidade"**: moradia (M8.1, M8.2), burocracia (M8.4) e circular pela cidade (M8.5, M8.6) são três funções; o "Consigo" também não diz "negar com *rien,
      personne...*", que é a M8.7.
    - **A2 M10 "Opinião, cultura e mundo"**: cultura (M10.1, M10.3) e mundo (M10.4 meio ambiente, M10.6 francofonia) são dois temas com três gramáticas.
    - **A2 M1.3 x M1.4**: duas unidades seguidas com a função "antes e agora" (achado da rodada anterior, sem resposta). [dona]
    - **A2 M4.1 x M4.2**: o diálogo publicado da `A1-15` já é uma consulta (Dr. Martin, *Qu'est-ce qui ne va pas ?*), e a M4.2 é "Na consulta". [dona] *Recomendo* reescrever o
      diálogo da M4.1 entre amigos (*Ça va pas ?*, a N35 encaixa melhor) e deixar a consulta para a M4.2.
    - **Notas repetidas no A2**: opinião em três lugares (M3.5 *je trouve que, à mon avis*; M5.1 "opinião em fórmula"; M10.1 *je pense que, à mon avis*), contra "nunca nota
      igual"; a M8.2 *tout, chaque, plusieurs, chacun* reensina *chaque* (cartão do A1 M3.6). [editor] M10.1 só *je pense que*, breve; M5.1 sem nota de opinião; M8.2 sem *chaque*.

**Contagens e referências (pergunta 5 do pedido)**

18. [editor] Tempos dos cabeçalhos x linha 51 do `08`: M2 "~3h20" x 3h25, M6 "~3h" x 3h05, M9 "~3h15" x 3h20 (a soma dos cabeçalhos dá 28h35, não 28h50).
19. [editor] Linha 49 do `08`: põe M2.3 (aberto) entre os de 4 lições e deixa fora a M1.2 (11, com a lição de pronúncia).
20. [editor] Deploy do `notification-cron`: as linhas 477, 504 e 645 do `08` dizem "feito (v29)"; a linha 706 (Resumo) ainda lista "o deploy do cron" entre o que falta, e o
    `CLAUDE.md` (Estado atual) diz "Pendente: deploy do `notification-cron` com o `STUDY_ITEM_GATE`". Conferir ao vivo e acertar os dois (não conferido nesta auditoria).
21. [editor] M8.2 e M8.3 dizem "nada muda nesta rodada", mas a M8.2 precisa reescrever os exemplos (Bloqueia 3) e a M8.3 ganha nota grátis e diálogo negativo (Atenção 3).
22. [editor] A2: se a pergunta 62 e a Atenção 7 (*se sentir*) forem aplicadas, 428 → 427; com a Atenção 11, "418 novas + 10 publicadas". `00`, `12` 133 e as linhas 53 e 702 do `08` juntos.

---

## Ok

- Totais do A1 conferidos pela soma das tabelas: 9 módulos, 56 unidades (33 + 23), 344 cartões (60 + 32 + 48 + 41 + 30 + 30 + 34 + 39 + 30); soma dos tempos da linha 51 = 28h50.
- A2: 10 módulos, 58 unidades (36 + 22, contadas módulo a módulo); soma dos tempos = 33h10; M8 = 5 × 40 + 2 × 25 = 4h10 e M10 = 4 × 40 + 3 × 25 = 3h55 (cálculo do mapa conferido).
- `00`, `15` (regras 12 a 14), `16` e `12` 125 a 135 batem com o `08` nos totais e nas posições (fora os itens 5, 18 a 22).
- Coluna "Versão grátis": nas 23 gramáticas do A1 e nas 22 do A2 o gancho vem **antes** da gramática, fora a A2 M4.1 (Atenção 1). Nenhuma nota grátis diz "a gramática já
  mostrou" (a A2 M8.6 foi corrigida).
- Desafios: as 34 linhas que mudam de `moduleId` + 7 da `A1-15` conferem com os lotes (`A1-4` 5, `A1-5` 6, `A1-8` 5, `A1-9` 3, `A1-10` 5, `A1-13` 5, `A1-16` 5).
- O Teste de Nível já é montado dos Pontos de verificação dos módulos: Ponto de verificação por plano resolve o Teste de Nível sem código à parte.
- *perdu / perdue* na M8.6 como adjetivo e *perdre* no A2 M2.3 são itens diferentes (regra 14 não se aplica); *appeler* (M8.6) não é o mesmo item de *s'appeler* (M1.2).
- *prochain* e *voir* na M9.2 têm exposição antes (frase da M3.3, diálogo da M9.1); o problema é só a falta de regra para "palavra de frase" (Sugestão 2).
- Tema do A1: cada módulo com um tema; a saúde não sobra em unidade de viagem; o único resto de saúde no A1 é a nota da M6.3 (Atenção 7).

---

## Sugestões (para a dona decidir)

1. **Regra 13 no A2**: vale (10 por conjunto aberto, ~360 cartões) ou o A2 tem teto próprio (12)? Decidir antes de desenhar o A2 lição por lição.
2. **Regra "palavra de frase"**: verbos e nomes frequentes que aparecem só em frase ou diálogo com tradução (*voir, regarder, visiter, trouver, prochain, la maison...*) ficam
   numa lista por unidade, com teto (ex.: 2 por frase), e o teste automático "palavra antes do cartão" (sugestão 5 da rodada anterior, ainda não feita) passa a ignorar essa
   lista. Sem isso, cada rodada acha as mesmas dezenas de frases publicadas.
3. **Como a gramática Premium aparece para o gratuito na trilha**: cadeado na linha, unidade seguinte já aberta, e a gramática não conta na porcentagem do módulo dele (hoje
   `moduleProgressPct` conta todas as unidades).
4. **A1 M1, M3 e M9**: (a) aceitar M1 com 3h35 como exceção do 1º módulo (alfabeto); (b) no M3, a `A1-g8` virar nota da M3.6 (posição do advérbio + *ne... jamais* é pequeno
   e preso às palavras, critério do `10`; gramática publicada, sem cartão, sem risco de FSRS) e o M3 cair para ~3h; (c) M9 fica, mas não recebe mais nada.
5. **A2 M8 e M10**: (a) "Serviços e papelada" (M8.4) vai para o M7 "Trabalho e dinheiro" (junto do banco, "resolver a vida prática"): M7 ~3h05, M8 ~3h30; (b) dividir o M8 em
   "Morar" (M8.1, M8.2, M8.4) e "Circular pela cidade" (M8.5, M8.6, *y*, negação complexa), com 11 módulos; (c) dividir o M10 em "Cultura e opinião" (M10.1, `A2-g24`, M10.3) e
   "Meio ambiente e francofonia" (M10.4, `A2-g26`, M10.6, `A2-g25`); (d) aplicar a regra 13 ao A2, que tira ~25 min de cada um.
6. **Lista de lições que perdem palavras gerada pelo `curriculo_ops.js`** (não à mão), com o destino de cada `lessonId` e o efeito no `STUDY_ITEM_GATE`.
7. **Queda do *ne***: 1ª aparição na M5.3 (*C'est pas cher*), 2ª breve na M9.1 (*Je peux pas*); a N43 publicada sai (Atenção 7).
8. **A2 M4.1 com diálogo entre amigos** e a consulta só na M4.2 (Atenção 17).
