# Auditoria do pedido de mudança na unidade "Cumprimentar e se despedir" (2026-10-27)

Escopo: só o impacto das decisões 267 a 279 (`12-decisoes-apos-maquete-m1.md`) sobre o mapa congelado (decisão 235). Unidade mexida: "Cumprimentar e se despedir"
(`A1-1`), 1ª unidade do módulo "Apresentar-se". Fontes conferidas: `08-mapa-final-a1-a2-v2.md`, `12`, `15`, `00`, `dados/mapa.json`, `dados/ACHADOS.md`,
`dados/palavras_funcionais.json`, `piloto-m1/A1-1/`, `fr/content.js` (pelo `load('fr')`) e os lotes de Desafios em `fr/scripts/challenges_import/`.
Nada foi editado no mapa nem no código.

Comandos rodados: `node fr/scripts/curriculo_mapa.js --tabela` e `--conferir` (todas as regras "ok"), `node tests/curriculo/test_mapa_totais.js` (50/50),
`node docs/i18n/curriculo/piloto-m1/A1-1/validar.js` (96 textos, 0 falhas obrigatórias, mas sobre o rascunho ANTIGO, ver A4).

Glossário rápido: **cartão em par** = um cartão só com duas formas (como *s'il vous plaît / s'il te plaît*); **regra 11** = nada de palavra antes de ser
ensinada; **regra 12** = toda gramática (Premium) tem antes uma versão grátis em nota ou lição; **regra 14** = uma palavra, um cartão; **regra 16** = teto de
tempo por módulo; **Desafios** = aba Premium com Expressões, Ouça e traduza etc., presos a um módulo pelo campo `moduleId`.

## 1. Bloqueia

Nada bloqueia a mudança no mapa. As contas fecham e as regras 13, 14 e 16 passam. Os itens abaixo bloqueiam só a **implementação** do piloto se ficarem sem resposta.

## 2. Editor corrige (sem decisão nova)

| # | Onde | Evidência | Recomendação |
|---|---|---|---|
| E1 | `mapa.json`, gramática "Gramática: perguntar sim ou não" (`A1-g12`, módulo "Família e pessoas próximas") | `versao_gratis_texto` ainda diz "nota *Ça va ?* sobe (M1.1)", nota que saiu pela decisão 267 | trocar o texto assim que a dona responder D1; até lá, marcar como "a decidir" |
| E2 | `08`, seção 2.2 (linha "Pronúncia") | "entonação de pergunta e afirmação é nota na M1.1" | reescrever: "nota de entonação da unidade 'Cumprimentar e se despedir' saiu (decisão 267); fica para uma lição de som futura" |
| E3 | `16-negacao-e-perguntas-no-a1.md`, linha 78 | versão grátis de *est-ce que* e entonação = "nota *Ça va ?* sobe (M1.1)" | alinhar com a resposta de D1 |
| E4 | `15`, regra 8 | exemplo "(ex.: *Ça va ?* x *Ça va.*)" cita nota que não existe mais | manter como exemplo genérico, com "(nota retirada do piloto, decisão 267)" |
| E5 | `08`, cabeçalho do módulo "Comer e beber" (linha 207) | ainda diz "passa do teto de 3h45 da regra 16 ... pendente da dona" | trocar por "dentro do teto de 3h55 (decisões 257 e 270)"; idem "abaixo do teto de 3h45" no cabeçalho de "Compras" (linha 223) |
| E6 | `08`, seção 5, risco "Palavras novas em unidade já concluída" | não cita *monsieur / madame* e *bonne journée / bonne soirée*, que entram numa unidade que TODO aluno atual já concluiu | acrescentar os dois cartões à lista (tela "Novidades desta unidade", decisão 50) |
| E7 | `08`, seção 5, risco "Desafios com `moduleId` antigo" | não cita o Desafio *Ça marche !* (`expr-a1m1-004`), que passa de `A1-m1` / `A1-1` para `A1-m6` / `A1-27` | acrescentar a linha; se já foi importado no banco, entra como item novo e o antigo é arquivado (conferir ao vivo) |
| E8 | `08`, seção 3.2 (pares de lexemas diferentes) | *bonne soirée* x *le soir* ("Dizer as horas e a rotina", módulo "Rotina e calendário") e *bonne journée* x *le jour* ("Dizer o dia e combinar") e *toute la journée* (exemplo publicado de "O passé composé") não estão na lista | registrar como lexemas diferentes, dois cartões, sem troca |
| E9 | Desafio *Ça marche !* (`expr-a1m1-004`) na posição nova | 1º exemplo *Un café ensemble ? — Ça marche !*: *ensemble* nunca é cartão no A1 (regra 11). O 2º, *Je t'appelle ce soir.*, passa (*appeler* é cartão em "Pedir ajuda", módulo "Viagem e férias", antes) | reescrever o 1º exemplo com palavra da unidade, ex.: *On va à la fête ? — Ça marche !*; pergunta e opções no idioma do site (decisão 272) |
| E10 | `dados/ACHADOS.md`, item 3 | notas por módulo "23, 15, ..." e "132" | marcar como histórico; hoje o M1 tem 24 e o A1 133 (tabela do script) |
| E11 | `12`, decisão 267 | diz "Notas do A1-1: 8; do A1: 132", superado pelas 276 e 278 (9 e 133) | acrescentar "(superado pela 278)" para quem lê só a 267 |

## 3. Precisa de decisão da dona

**D1. Versão grátis de "Gramática: perguntar sim ou não" depois que a nota de entonação saiu.**
Contexto: a gramática "Gramática: perguntar sim ou não" (módulo "Família e pessoas próximas") é Premium. Pela regra 12, o aluno gratuito precisa ter visto
antes, de graça, os conceitos dela: (a) pergunta só com a voz subindo, (b) *est-ce que*. O mapa apontava para duas notas: "*Ça va ?* sobe, *Ça va.* desce"
(em "Cumprimentar e se despedir") e a nota de *est-ce que* em "Dizer de onde é e onde mora" (mesmo módulo, antes da gramática). A primeira saiu (decisão 267).
O validador ainda passa porque "Dizer de onde é e onde mora" continua na lista, mas aquela nota ensina *est-ce que*, e só mostra a pergunta pela entonação
(*Tu parles anglais ?*) sem dizer que é a voz que faz a pergunta. A nota nova "Como perguntar 'tudo bem?'" mostra *Ça va ?* como pergunta, mas não fala de
entonação. O único lugar grátis que fala de voz subindo hoje é a nota "*Pardon* x *Excusez-moi* e *Excuse-moi*" ("com a voz subindo, para pedir que a pessoa
repita: *Pardon ?*").
Opções: (a) tirar "Cumprimentar e se despedir" da lista e pôr uma linha na nota de *est-ce que* de "Dizer de onde é e onde mora": "sem *est-ce que*, só
com a voz subindo, também é pergunta"; (b) manter "Cumprimentar e se despedir" apontando para a nota de *pardon*.
**Recomendo (a)**: a regra fica clara num lugar só, logo antes da gramática, e não depende do áudio de *Pardon ?*. Atenção nos dois casos: qualquer texto que diga
"a voz sobe" traz de volta o risco do TTS (decisão 11; regra 6 pede os dois lados com áudio). Na opção (a) o par *Tu parles anglais ?* x *Est-ce que tu parles
anglais ?* não depende da subida da voz para ser entendido.

**D2. Desafios já escritos de *Bonne journée !* e *Bonne soirée !* em outros módulos.**
Contexto: a decisão 269 tirou *Bonne journée !* dos Desafios de "Cumprimentar e se despedir" porque virou cartão. Mas os lotes já escritos (status
`needs_review`) têm mais dois Desafios de Expressão com as mesmas formas: *Bonne journée !* (`expr-a1m2-005`, módulo "Rotina e calendário", unidade "Dizer o
dia e combinar") e *Bonne soirée !* (`expr-a1m6-002`, módulo "Lazer, convites e passado", unidade "Falar de lazer"). Antes eram palavras novas; agora repetem
um cartão do módulo "Apresentar-se". Não quebra a regra 14 (que é sobre cartões), mas vai contra o motivo da 269 e gasta duas das ~5 Expressões por módulo
(skill `criar-desafios`) com algo que o aluno já revisa no cartão.
**Recomendo trocar as duas por expressões novas do tema** (ex.: *Bonne nuit !*, *Bonne chance !*, *À tout de suite !*), arquivando as antigas se já estiverem no banco.
Alternativa: manter como reforço e reescrever só a pergunta para o idioma do site (272).

**D3. Em qual lição entram os dois diálogos e como fica a lição nova.**
Contexto: com 12 palavras a unidade passa de 3 para 4 lições + Revisão da unidade. O diálogo informal "Encontro na rua" (Léa e Hugo) usa *ça va* e *à bientôt*,
que agora ficam na lição 4; o diálogo formal novo usa *monsieur / madame*, *bonne soirée* e *Comment allez-vous ?* (da nota "Como perguntar 'tudo bem?'", que
fica depois do cartão *ça va*). Então os **dois** diálogos só cabem na lição 4, que terá 2 cartões, 2 diálogos e ao menos 2 notas, enquanto a lição 3 fica sem
diálogo. Também falta dizer qual lição herda o id publicado `cortesia-e-como-vai` (o progresso segue o id; a outra nasce nova, aberta e não concluída, regra 2.10).
**Recomendo**: lição 4 mantém o id `cortesia-e-como-vai` (onde o diálogo informal já está); o diálogo formal entra na lição 4 também, depois da nota "Como
perguntar"; títulos das lições 3 e 4 propostos no rascunho (já pedido em `ACHADOS.md` item 22).

**D4. Realismo da nota "Como perguntar 'tudo bem?'".**
Contexto: a nota põe *Comment vas-tu ?* como a forma informal (regra 1, par *tu* / *vous*). Na fala real, entre amigos, *Comment vas-tu ?* soa um pouco formal
ou escrito; o que se ouve é *Ça va ?*, *Tu vas bien ?* ou *Comment ça va ?* (confiança alta). **Recomendo** uma frase curta na nota: "*Comment vas-tu ?* existe,
mas entre amigos o mais comum é *Ça va ?*". Sem isso, o aluno pode usar *Comment vas-tu ?* com amigos e soar engessado.

## 4. Atenção

| # | Unidade | Evidência | Recomendação |
|---|---|---|---|
| A1 | módulo "Apresentar-se" | 3h55, exatamente no teto novo; nenhuma folga | qualquer acréscimo nas outras 6 unidades do módulo (pilotos seguintes) exige tirar algo em outro lugar; avisar a dona antes de cada piloto |
| A2 | "Cumprimentar e se despedir": diálogo formal | *Comment allez-vous ?* só passa no validador se as palavras da nota contarem (253 e 265); o `mapa.json` ainda não tem o campo `palavras` nas notas (decisão 274, gerado dos exemplos) e *allez* é forma de *aller*, que só vira cartão em "Verbos muito usados" (módulo "Comer e beber") | implementar o campo `palavras` antes de validar o diálogo; até lá o validador vai acusar *allez* |
| A3 | "Cumprimentar e se despedir" | 9 notas em 4 lições para quem está no primeiro dia | conferir no rascunho que nenhuma lição fique com mais de 2 ou 3 notas seguidas; a regra 4 não tem teto, mas pede "breve na 1ª vez" |
| A4 | `piloto-m1/A1-1/` | o rascunho (`A1-1.md`, `A1-1.json`) ainda está no estado anterior: 10 cartões, 8 notas com a de entonação, Desafio *Bonne journée !* e *Ça marche !* "sai" sem destino; a validação de 96 textos é desse estado | refazer o rascunho e rodar `validar.js` de novo com o diálogo formal e os dois cartões novos |
| A5 | cartão em par *bonne journée / bonne soirée* | *bonjour* e *bonsoir* são dois cartões; *bonne journée / bonne soirée* é um só. O par aqui não é formal/informal (regra 1) nem masculino/feminino | aceitável (é despedida, decisão 269), mas o verso B precisa aceitar as duas respostas e a nota N01 "*Bonjour* ou *Bonsoir*?" deveria dizer em uma linha: *bonsoir* ao chegar, *bonne soirée* ao sair (erro clássico do brasileiro) |
| A6 | Desafio *Ça marche !* em "Convidar, aceitar, recusar e se desculpar" | a unidade é nova (não publicada) e o módulo "Lazer, convites e passado" passa a 6 Expressões (padrão ~5); "Apresentar-se" cai para 4 | não importar o Desafio antes de a unidade existir no site; se D2 trocar *Bonne soirée !*, o módulo volta a 6 com tema melhor |
| A7 | "Cumprimentar e se despedir" | a lição nova e os 2 cartões novos mudam a ordem das palavras nas lições | rodar `node scripts/gerar_mapa_cron.js` e pedir novo deploy do `notification-cron` (portão `STUDY_ITEM_GATE`) na implementação; chaves novas pelo `congelar_chaves.js` |

## 5. Ok

- **Contas** (pelas listas, script e teste): A1 com 9 módulos, 57 unidades (34 + 23), **362 cartões, 717 A/B** (362 × 2 − 7), **~151 lições** (M1 24),
  **133 notas** (M1 24), **~31h00** (soma 3h55 + 3h45 + 3h35 + 3h50 + 3h20 + 3h00 + 3h00 + 3h15 + 3h20 = 1860 min). "Apresentar-se" com 62 cartões. A2 sem
  mudança: 428 (418 + 10), 852 A/B, 76 notas, ~33h10. `08` (seção 1 e 3.1), `00` (status) e `ACHADOS.md` (item 1) batem com o `mapa.json`.
- **Regra 14**: *monsieur / madame*, *bonne journée / bonne soirée* e *mademoiselle* não são cartão em nenhuma outra unidade do A1 nem do A2 (busca no `mapa.json` e
  no texto do `08`). Nenhum conteúdo publicado depois de "Cumprimentar e se despedir" usa *monsieur*, *madame* ou *vas*; os *allez* publicados ("Falar de lazer", ditado
  de "Na cidade") vêm depois de "Verbos muito usados".
- **Regra 12, demais gramáticas**: todas têm versão grátis em unidade anterior (`--conferir`: versaoGratis ok). "Gramática: modais e *il faut*" usa *vous pouvez* de
  "Cumprimentar e se despedir" (frase só exemplo, decisão 268) e continua com *je voudrais* e "Verbos muito usados" antes.
- **Regra 13 e 16**: unidade com 12 palavras (limite), 4 lições + Revisão; nenhum módulo do A1 ou do A2 acima de 3h55 (maiores: "Apresentar-se" e "Opinião,
  cultura e mundo", 3h55).
- **Nota *OK, ça marche* x Desafio *Ça marche !*** (mesma unidade "Convidar, aceitar, recusar e se desculpar"): não é sobreposição ruim; é o desenho da regra 12
  (a nota grátis ensina, o Desafio Premium treina). Registro igual nos dois (informal / *familier*). Lexema diferente do cartão *marcher* do A2 ("Comprar on-line e
  reclamar"), já registrado na seção 3.2 do `08`.
- **Chaves**: os cartões publicados de "Cumprimentar e se despedir" mantêm as chaves (`A1-1-v0` a `A1-1-v9`); só dois cartões novos.

## 6. Sugestões (sem decidir)

1. **Usar *monsieur / madame* em espiral**: hoje nenhum diálogo depois do módulo "Apresentar-se" usa as duas palavras. Cabem naturalmente em "Gostos e pedidos no
   café" e "Pedir no restaurante" (*Vous désirez, madame ?*) e em "Comprar roupas"; e a nota de abertura de e-mail do A2 ("Escrever para convidar, recusar e
   agradecer") pode retomar *Madame, Monsieur,*.
2. **Lição de som da entonação**: quando o teste do TTS (decisão 11) passar, *Ça va ?* x *Ça va.* volta como exercício de pronúncia, não como nota, e pode virar a
   versão grátis "de verdade" da entonação.
3. **Folga no módulo "Apresentar-se"**: medir o tempo real das lições do piloto (sem dado de produção, só no teste local) antes de escrever o resto do módulo, para
   saber se os 3h55 estimados são reais.
