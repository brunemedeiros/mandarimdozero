# Passada final do mapa A1 + A2 antes da aprovação (2026-10-26)

Agente: `auditor-curricular`. Base: `08-mapa-final-a1-a2-v2.md` (seções 1 a 7 e Resumo), `12` (decisões 197 a 249), `15`, `16`, `00`, a revisão geral
`auditoria/2026-10-23-revisao-geral-a1-a2.md` e o conteúdo publicado (`load('fr')`, `fr/dictations.js`, `fr/scripts/challenges_import/lote-a1-*.json`,
`fr/published_ids.json`). **Só relata: nada foi editado no mapa nem no código.**

Como ler: "cartão" = palavra com ficha e revisão espaçada; "Na frase" = frase de exemplo com tradução logo abaixo (pode ter palavra nova, decisão 211);
"vista" = palavra que o aluno já encontrou (cartão ou nota de vocabulário, decisão 225); "versão grátis" = onde o aluno sem Premium aprende o conceito antes da
gramática (regra 12). Por que isto importa agora: a decisão 235 congela o mapa na aprovação; o que ficar errado depois só muda por pedido de mudança.

Resposta curta: **as contas batem** (A1 358 cartões, 57 unidades, ~149 lições, ~30h25; A2 428 cartões, 58 unidades, ~33h10), **a regra 14 está limpa** e **toda
gramática tem versão grátis antes**. O que falta é (a) fechar uma família de falhas da regra 11 em torno de *prendre* e das fórmulas de diálogo, (b) incorporar no
mapa as correções que a revisão de 2026-10-23 pediu ao editor e que não entraram, e (c) limpar textos que ainda dizem "a revisar" depois das decisões 247 a 249.

---

## 1. Bloqueia a aprovação

1. ***prendre* conjugado antes do cartão, fora da lista de expressões fixas** (unidade "Comprar roupas", módulo "Compras"; e as unidades "Fazer a lista do mercado"
   e "Pedir quantidades na feira", módulo "Comer e beber").
   Contexto: a decisão 224 manteve o cartão *prendre* em "Pegar transporte" (módulo "Na cidade") e liberou antes dele só ***je vais prendre*** e ***je voudrais***.
   Evidência: o diálogo publicado de "Comprar roupas" (`A1-10-d4`, *Parfait, je la prends !*, e as opções do diálogo) usa *je la prends*, que o próprio mapa lista
   como "fórmula" da unidade e como versão grátis do pronome COD do A2 ("Gramática: pronomes COD", módulo "Contar uma experiência"); o ditado `d3-p2`
   (*Je prends la robe*), que o mapa manda para o módulo "Compras", e o Desafio `lt-a1m3-006` (*Je prends un kilo de pommes.*, "Pedir quantidades na feira")
   também. Diálogo, ditado e Desafio continuam sob a regra 11 (decisão 211).
   Recomendação: ver decisão D1 abaixo (pôr *je la prends* na lista fechada e trocar o ditado e o Desafio por *je voudrais*).
2. **Falhas da regra 11 que a revisão de 2026-10-23 achou e que não estão na lista de reescrita do mapa** (seção 7, linha "Conteúdo publicado que precisa de
   reescrita"). Nenhuma das decisões 218 a 249 as resolveu, e o mapa congelado ficaria sem destino para elas:
   - V/F `A1-5-tf0` *L'addition, s'il vous plaît.* continua na unidade "Gostos e pedidos no café", e o cartão *l'addition* está em "Pedir no restaurante" (as duas no
     módulo "Comer e beber"). **[editor]**: vai com a chave para "Pedir no restaurante", junto da frase.
   - Desafios fora da posição: `lt-a1m1-002` (*Un café*, no módulo "Apresentar-se"), `lt-a1m3-005` (*J'achète*), `lt-a1m3-004` (*Je cherche une robe.*),
     `lt-a1m5-003` e `lt-a1m5-004` (`unitId` antigo), `lt-a1m5-006` (*le sac*), `lt-a1m6-005` (*écouter*), `cloze-a1m6-004` (*le marché*), `expr-a1m3-001`
     (2º exemplo *je suis en retard*, cartão do A2) e `expr-a1m4-001` (*Il pleut des cordes*, ligado à `A1-13`, mas com `moduleId` de "Na cidade", antes do
     tempo). **[editor]**: entram na lista de reescrita.
   - Ditados fora da tabela "Ditados: para onde vão": `d1-p1` (*Mon amie*), `d2` (*un croissant*), `d3-p1`, `d3-p2`, `r2` (*je cherche*), `d6` (*au marché*),
     `d5-p2` (*Mon sac*: em ditado nota não conta, decisão 225), `d6-p2` (*J'adore*). **[editor]**: entram na tabela.
   - Falas sem cartão nem nota: `A1-7-d1` *Mardi, ça te va ?* e `A1-7-d3` *Parfait, à mercredi alors !* ("Dizer o dia e combinar"); `A1-5` *Vous désirez ?*,
     *un croissant*, *Autre chose ?*, *c'est tout* ("Gostos e pedidos no café"); `A1-8-d4` *Merci beaucoup* e `A1-8-d3` *cinq minutes* ("Perguntar e indicar o
     caminho"); `A1-14-d0` e `d1` *centre-ville*, *la bonne direction* ("Pegar transporte"); `A1-17` *le balcon* ("Tipos de moradia e cômodos"); `A1-18`
     *mes clés* ("Dizer onde as coisas estão"). Precisa de decisão (D2 e D3).

---

## 2. O editor corrige sem perguntar (aplica decisão já tomada)

1. **Textos que ainda dizem "a revisar" depois das decisões 247 e 248**: `08 v2` seção 7, linha "Itens a revisar pela dona" (*se faire mal*, *l'échange, la faute*);
   `00`, atualização de 2026-10-26, "Status". As duas notas ("Mais sobre a consulta", unidade "Na consulta", e "Mais sobre aprender", unidade "Falar do aprendizado
   de línguas") estão aceitas.
2. **"Decisões 218 a 246"** no cabeçalho do `08 v2`, no Resumo e no `00`: o mapa já aplica a 247, a 248 e a 249 (desculpa com modal em "Convidar, aceitar, recusar
   e se desculpar"). Trocar por "218 a 249".
3. **Nomes de rodada repetidos no `12`**: "Décima oitava rodada (2026-10-23)" e "Décima nona rodada (2026-10-23)" repetem rodadas de 2026-10-21 e 2026-10-22. Renomear para
   "Trigésima primeira" e "Trigésima segunda".
4. **Cartões A/B do A1**: a seção 1 diz "358 (716)", mas a decisão 218 dá **um cartão só** a cada verbo de "Verbos muito usados": são **710** (358 × 2 − 6). Se *savoir,
   connaître, dire, donner* também forem só reconhecimento (regra 12 do `15` diz que sim), o A2 tem 852 cartões A/B, não 856.
5. **Teto de tempo citado com a decisão errada**: os cabeçalhos dos módulos "Família e pessoas próximas" e "Rotina e calendário" dizem "teto de 3h45, decisão 242"; a 242
   só usa o teto (ele aparece na 216, sem decisão própria; ver D4).
6. **Posições velhas fora dos trechos históricos**: seção 4.1, linha `A1-g1`: "*avoir faim* vira nota M4.1" → a unidade "Gostos e pedidos no café" (M4.2); seção 3.2,
   lista da regra 14: "*s'excuser* x a nota *Excusez-moi* (A1 M9.3)" → a nota agora é de "Cumprimentar e se despedir" (decisão 223).
7. **Nota que falta na tabela**: a unidade "Comprar roupas" não lista a nota de realidade *Ce n'est pas cher* → *C'est pas cher* (o *ne* cai na fala), que o `16` prevê e
   que a nota N43 de "Falar de lazer" cita como "1ª aparição". Acrescentar na coluna "Notas".
8. **`16`**: "*parce que* é vocabulário do M9.3" (linhas da tabela de perguntas e da recomendação): não é cartão; é fórmula e nota em "Convidar, aceitar, recusar e se
   desculpar". Ajustar o texto.
9. **Regra 13 do `15`**: o subitem "A1: conjunto aberto com no máximo 10 palavras. Exceções aceitas..." está escrito como regra vigente; marcar "Histórico (até a decisão 231)".
10. **Seção 7, linha "Auditoria pedagógica completa"**: ainda manda "nas frases Na frase, conferir que a tradução está visível (decisão 211)"; depois da 226 o que se confere é a
    marca **essencial / só exemplo**.
11. **Seção 5, lista de implementação**: faltam (a) cartão só de reconhecimento (decisão 218: sem cartão B, sem produção na lição nem no Ponto de verificação); (b) campo
    `papel` essencial / só exemplo e a regra por função pura (226, 233); (c) `excecoes.json` e o validador "só palavras vistas" (232, 233); (d) `mapa.json` gerando as contas
    (228). Hoje só a seção 7 cita parte disso. Nenhum desses arquivos existe ainda.
12. **"Palavras novas em unidade já concluída"** (seção 5): a linha só cita *quatre... neuf*. Faltam os cartões novos em unidades publicadas: *l'enfant* ("Apresentar a
    família"), *l'après-midi, tôt, tard* ("Dizer as horas e a rotina"), *le jour* ("Dizer o dia e combinar"), *aimer, préférer* ("Gostos e pedidos no café"), *acheter,
    la chemise, le pull*... ("Comprar roupas"), *la saison* ("Falar do tempo e das estações"), *parler, la ville* ("Dizer de onde é e onde mora"), *dans, entre, en face de*
    ("Dizer onde as coisas estão"), *les toilettes, l'adresse* ("Tipos de moradia e cômodos"), *le prénom* ("Dizer o nome e a nacionalidade"). A tela "Novidades desta
    unidade" (decisão 50) não está implementada.
13. **Exemplo da nota "Mais sobre a consulta"** (unidade "Na consulta", módulo "Saúde e bem-estar"): *Je me suis fait mal au dos.* usa *le dos*, cartão da unidade seguinte
    ("Emergências"). Trocar por *Je me suis fait mal à la main.* (*la main* é cartão de "Corpo e dores", antes).

---

## 3. Precisa de decisão da dona (com contexto e recomendação)

**D1. *prendre* antes do cartão.** Contexto: o cartão *prendre* fica em "Pegar transporte" (módulo "Na cidade", decisão 224), mas a gramática Premium "Gramática: *faire* e
*prendre*" vem antes, no fim de "Comer e beber", e o verbo aparece conjugado em "Comprar roupas" (*je la prends*, diálogo publicado), num ditado e num Desafio. Opções:
(a) pôr ***je la prends*** na lista fechada de expressões fixas (como *je vais prendre*) e trocar o ditado `d3-p2` e o Desafio `lt-a1m3-006` por *je voudrais*; (b) levar
o cartão publicado *prendre* (`A1-14-v6`, mesma chave) para "Verbos muito usados" (7 verbos), o que resolve tudo, mas leva "Comer e beber" a ~3h50, acima do teto de 3h45.
**Recomendação: (a)**, que respeita a decisão 224 e o teto; custo: 1 entrada na lista e 2 trocas.

**D2. Fórmulas de diálogo sem cartão.** Contexto: diálogos publicados usam expressões que não são cartão nem nota (lista no Bloqueia 2). A decisão 232 manda guardar
as exceções em `excecoes.json`, mas entrada nova só com o seu OK. Recomendação: **aceitar como fórmula** *Ça te va ?* (vem do cartão *ça va*), *Merci beaucoup*,
*Parfait*, *Vous désirez ?*, *Autre chose ?*, *C'est tout*; **trocar** *cinq minutes*, *la bonne direction* e *centre-ville* nos diálogos (as frases "Na frase" com
*centre-ville* ficam).

**D3. Palavras soltas que dá para resolver com o limite novo de 12** (regra 13, decisão 231). Contexto: unidades abaixo de 12 podem ganhar 1 cartão sem exceção.
- ***chercher*** (não é cartão em lugar nenhum do A1 nem do A2, nem em "Procurar emprego"): cartão em "Comprar roupas" (11 → 12, +5 min, módulo "Compras" a ~3h20).
  Resolve sem troca a fala *Je cherche une robe*, os ditados `d3-p1`, `d3-p2`, `r2` e o Desafio `lt-a1m3-004`. **Recomendação: sim** (verbo de altíssima frequência).
- ***le balcon***: entrar na nota de vocabulário "Outras palavras de moradia" ("Tipos de moradia e cômodos"); pela decisão 225 a fala publicada passa a ser válida.
  **Recomendação: sim.**
- ***la clé***: cartão em "Móveis e objetos da casa" (10 → 11) ou troca da fala *mes clés*. **Recomendação: cartão** (a frase publicada *La porte est fermée à clé.* já
  está nessa unidade).

**D4. Teto de tempo por módulo.** Contexto: as decisões 216, 242 e 244 usam "teto de 3h45", mas nenhuma regra do `15` o fixa; o módulo "Opinião, cultura e mundo" (A2)
tem ~3h55 (decisão 195, anterior ao teto) e "Comer e beber" e "Família e pessoas próximas" estão exatamente em 3h45 (qualquer nota a mais passa). Recomendação: **regra
16 no `15`**: teto de 3h45 por módulo, com a exceção registrada do último módulo de cada nível.

**D5. "Vista" vale só para nota de vocabulário?** Contexto: a decisão 225 fala de nota de **vocabulário**, mas diálogos se apoiam em notas de explicação e de realidade
(*Excusez-moi*, agora na nota de "Cumprimentar e se despedir"; *pourquoi / parce que*; *moi aussi*; *avoir faim*; *un croissant* da nota cultural). E o exemplo de nota
(ex.: *Je me suis fait mal au dos.*) segue qual regra? Recomendação: **toda nota que mostra a expressão com tradução conta como vista nos diálogos** (não em ditados nem
Desafios), e exemplo de nota segue a regra das frases "Na frase".

**D6. Pendências da revisão de 2026-10-23 que ninguém respondeu**: texto da nota N33 (*à vélo* x *en vélo*, "Pegar transporte": "*en vélo* é considerado incorreto" é forte
demais; sugerido "a forma recomendada é *à vélo*; *en vélo* é muito comum na fala", confiança média); confiança da nota *très / super / hyper* ("Tipos de moradia e
cômodos", hoje sem registro); destino das frases `A1-3-p6` e `p7` (recomendação: *Quel est l'âge de ton père ?* fica em "Dizer a idade"). Podem ser revistas junto com
a aprovação.

---

## 4. Ok (conferido)

- **Contagens pelas listas da seção 3**: A1 60 + 33 + 50 + 48 + 32 + 30 + 34 + 41 + 30 = **358**; 57 unidades (34 + 23); lições 23 + 15 + 19 + 21 + 14 + 12 + 16 + 17 + 12 = **149**;
  tempo 3h35 + 3h45 + 3h35 + 3h45 + 3h15 + 3h05 + 2h50 + 3h15 + 3h20 = **30h25**. A2 47 + 36 + 34 + 47 + 36 + 36 + 48 + 48 + 48 + 48 = **428** (418 + 10), 58 unidades (36 + 22),
  ~33h10. Cada lista foi contada palavra a palavra (ex.: "Pedir no restaurante" 10, "Comprar roupas" 11, "Na consulta" 12, "Falar do aprendizado de línguas" 12,
  "Procurar emprego" 12). `00`, `08 v2` (seção 1, cabeçalhos, Resumo) e `15` batem. Nenhum módulo abaixo de 1h30.
- **Regra 14**: *le restaurant* é cartão só em "Pedir no restaurante" (depois aparece em frases do passado e no Desafio do módulo "Lazer, convites e passado", depois do
  cartão); *le menu* não existe em `fr/content.js` nem na camada en (a condição da decisão 242 está satisfeita); *la chemise* só em "Comprar roupas" e fora da nota
  "Outras palavras de roupa"; *aller, faire, vouloir, pouvoir, devoir, voir* só em "Verbos muito usados"; *savoir, connaître* só em "Falar do aprendizado de línguas",
  *dire* só em "Procurar emprego", *donner* só em "Na consulta"; *prendre* só em "Pegar transporte". No publicado, *savoir* só aparece em itens que já saem
  (tela de *savoir* da gramática de modais e a fala *On ne sait pas encore !*); *donner* só em *La fenêtre donne sur le jardin.* ("Móveis e objetos da casa", "Na frase",
  outro sentido: marcar como só exemplo).
- **Regra 12 (versão grátis antes)**: as 23 gramáticas do A1 e as 22 do A2 têm a versão grátis numa unidade anterior, na posição certa depois da renumeração (ex.: "Verbos muito
  usados" antes de "Gramática: *faire* e *prendre*", de "Gramática: o verbo *aller*" e de "Gramática: modais e *il faut*"; "Na consulta" com *donner* antes de "Gramática:
  pronomes COI"). Ponto fraco: *prendre* (D1) e o pronome *y* do A2 ("Gramática: pronome *y*", módulo "Moradia e cidade"), cuja versão grátis só existe no A1.
- **Regra 11, itens das decisões 218 a 249**: a nota de *excusez-moi* em "Cumprimentar e se despedir" torna válidas as falas *Excusez-moi* de "Perguntar e indicar o
  caminho" e "Pegar transporte" (se D5 for aceita); pela decisão 225, *beau* (nota "Outras palavras de traços") no diálogo de "Tipos de moradia e cômodos" e *mon sac*
  (nota "Outras palavras de roupa") no diálogo de "Dizer onde as coisas estão" passam a valer; as frases com *coûter*, *vouloir*, *faire* nos diálogos do M4 e do M5
  vêm depois dos cartões.
- **Títulos das notas de vocabulário (decisão 246)**: todos os títulos das tabelas seguem o padrão ("Mais sobre família", "Outras palavras de traços", "Mais sobre
  rotina", "Mais sobre gostos", "Mais sobre o restaurante", "Mais sobre pagamento e contato", "Outras palavras de roupa", "de material", "de cor", "de moradia",
  "de países", "de caráter", "Mais sobre a consulta", "Mais sobre aprender"); os nomes antigos só aparecem nos trechos históricos, e a caixa "Como ler" traduz.
- **Progresso**: nenhum cartão publicado muda de nível por estas decisões; *la chemise*, *le restaurant* e os 6 verbos são chaves novas; `A1-36` não colide com nada em
  `fr/published_ids.json` nem em `fr/curriculum-changes.js`.
- Títulos das gramáticas no formato "Gramática: ..." (regra 10) em todo o A1 e o A2.

---

## 5. Sugestões (nada decidido)

1. Nota "Outras palavras de roupa" tem *le sac* (acessório) e "Outras palavras de moradia" tem *le jardin* (não é tipo de moradia): pelo critério da 246, "Outras palavras de
   roupa e acessórios" e "Mais sobre moradia".
2. A unidade "Cumprimentar e se despedir" passa a ter 8 notas para 10 palavras e não tem frase com *Excusez-moi*; para a nota ter gancho (regra 4: nota breve da frase que
   acabou de aparecer), acrescentar a frase *Excusez-moi !* ou ligar a nota à frase *Pardon ? Vous pouvez répéter ?*.
3. Gerar o `mapa.json` (decisão 228) como **primeiro passo depois da aprovação**, com um teste que trave 358 / 428 cartões e os tempos por módulo: assim a próxima conta não é
   digitada.
4. Versão grátis do pronome *y* no A2: uma linha em nota em "Procurar moradia" ou "Dividir apartamento e vizinhos" (*On y va ?*, *J'y habite depuis...*), antes da gramática.
