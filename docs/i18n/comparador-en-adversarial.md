# Comparador de "Ouça e traduza" em inglês: auditoria adversarial

Arquivos: `shared/translation-compare.js` (comparador), `tests/i18n/test_translation_compare_en_adversarial.js` (200 casos),
`tests/i18n/test_translation_compare.js` (18 checks antigos). O veredito da suíte é o do app (`fr/app.js`): aceita só se
`!personMismatch && isAcceptable`. O "esperado" de cada caso é a verdade linguística, não o que o código faz.

## 1. O que o comparador de inglês fazia antes

Tirava contrações ("don't" vira "do not"), pontuação e caixa; descartava palavras funcionais (artigos, preposições curtas,
pronomes, be/have/do, will/would); e aceitava se alguma referência tivesse sobreposição de palavras de conteúdo
(`acertos / max(tokens)`) de pelo menos 0,55. À parte, `personMismatch` pegava pronome + forma errada de be/have/do
logo depois ("I is", "he have"), ignorando frases com "?". Consequência: "not", "no", "never" e todos os números eram
tratados como palavras comuns, e uma troca de UMA palavra numa frase de 3 tokens ainda dava 2/3 e passava.

## 2. Resultado da suíte

| | Antes | Depois |
|---|---|---|
| Casos que passam | 131/200 | 159/200 |
| Falhas | 69 | 0 reais + 41 limites conhecidos (listados na suíte) |
| `test_translation_compare.js` | 18/18 | 18/18 |
| `test_i18n_unit.js` | não rodado | 2032/2032 |
| Pares de referências reais (`fr/challenges.en.js`, 43 desafios, 258 pares + 128 autoaceitações) que mudaram de aceitar para rejeitar | n/a | 0 |

`fr/scripts/test_answer_validation.js` já falha antes de qualquer mudança (`ReferenceError: acceptedForms is not defined`,
verificado na árvore limpa) e não usa o comparador: pré-existente, não tocado.

## 3. Correções feitas (pequenas, só no inglês, pt-BR byte a byte igual)

1. **Negação liga/desliga**: se a resposta tem not/no/never/nobody/nothing/none/neither/nor/nowhere e a referência não (ou o
   contrário), rejeita. Pegou "I eat meat" x "I do not eat meat", "but not" x "and", "there is no water".
2. **Números**: dígitos de 0 a 100 viram palavras (15 = fifteen), "a hundred" = "one hundred"; o conjunto de números tem de
   ser igual (two x three, fifteen x fifty, 15 x 50). "one" fica fora da conta porque "a coffee" = "one coffee" (os lotes
   reais têm as duas formas; sem essa exceção, 10 pares reais passavam a ser rejeitados).
3. **Pronome-sujeito em conflito**: se resposta e referência têm pronomes I/you/he/she/we/they e nenhum em comum, rejeita
   (he x she, we x they, I x you). Pronome só de um lado não rejeita.
4. **Americano x britânico**: lista de ~45 grafias (colour, favourite, theatre, grey, practise, travelled...) normalizada
   para o americano. Vocabulário diferente (flat/apartment, football/soccer) NÃO entra.
5. **Hífen e travessão** viram espaço ("train-station").
6. **Frase só de palavras funcionais** ("Is it you?"): sem tokens de conteúdo, compara o texto inteiro (antes dava 0 e
   reprovava resposta idêntica).
7. **Falsos erros de concordância**: sujeito composto ("You and I are", "He and I are late") não dispara mais. Custo
   assumido: "I am tired and he are happy" deixou de ser pego (agr-08, limite).
8. **Advérbio entre sujeito e verbo** ("he never have", "she always are") agora é pego.

## 4. Propostas NÃO implementadas (arriscadas)

| Proposta | Por que não entrou |
|---|---|
| Comparar tempo verbal (was/were/will/would/had/have/been) | "We will go" = "We are going to go" = "We're going"; "I'd like" = "I want". Rejeitaria paráfrase válida. Só com lista de equivalências por desafio, ou a autora marcar `mustInclude` em cada referência. |
| Possessivos (his x her, their x our) e objetos (him x her) | "her" é possessivo e objeto; "their" singular ("their book" para uma pessoa) existe. Exigiria etiquetagem gramatical. |
| Subir o limiar de 0,55 ou exigir cobertura da referência (pega omissão de "every morning", "big") | Mexe em todas as respostas aceitas hoje, incluindo sinônimos. Calibrar com o corpus real (`fr/challenges.en.js`: 43 desafios) antes: medir quantas respostas boas de alunas viram "erro". |
| Sinônimos/antônimos por desafio (`synonyms` ou `mustInclude`), como já existe no caminho pt-BR | É o único jeito de pegar tea x coffee ou cheap x expensive sem falso erro; custa trabalho de autoria (sugerido: lista curta só nos desafios de alto risco, como preços, horas e cores). |
| `does/did` + verbo flexionado ("doesn't likes"), "am agree", "I have 20 years" (decalques) | Regras de aviso (não de reprovação) por padrão: "do/does/did/not + verbo com -s", "am/is/are + agree", "have + número + years". Bom candidato a dica pedagógica no feedback, sem reprovar. |
| Concordância em perguntas ("How is you?") | Inversão torna "pronome + verbo" ambíguo; hoje frases com "?" são ignoradas de propósito. |

## 5. Tabela de casos (200)

Legenda: A = deve aceitar, R = deve rejeitar. "Hoje" = resultado depois das correções. LIMITE = falha conhecida e tolerada pela
suíte. A lista completa com todas as frases, referências e justificativas está no próprio arquivo de teste (array `C`); abaixo,
o resumo por categoria e todos os casos que NÃO passam.

| Categoria | Casos | Passam | Exemplos que passam |
|---|---|---|---|
| negação | 13 | 13 | "I eat meat" x "I do not eat meat" (R); "I don't eat meat" (A); nobody x somebody (R); never x always (R) |
| número | 14 | 14 | two x three (R); fifteen x fifty (R); 15 euros = fifteen euros (A); 15 x 50 em dígitos (R) |
| sujeito/verbo | 11 | 9 | he is x they are (R); she x he (R); we x they (R); you x I (R) |
| tempo verbal | 10 | 4 | "She will be at home" x "was" (R) passa pela diferença de palavras; os demais são LIMITE |
| omissão | 8 | 4 | "My name is" (R); "Marie" (R); "The restaurant is cheap" (R); "I want a coffee" (A) |
| troca de palavra | 9 | 2 | seven x eight (R, pelo número); how x where (R) |
| sinônimo | 15 | 15 | inexpensive, large, wake up, purchase, really, may x can (A) |
| contração | 13 | 11 | I'm, we're, it's, apóstrofo tipográfico (A); isn't he x is he (R); don't you x do you (R) |
| ordem | 7 | 4 | "Tomorrow we are going..." (A); "Marie is my name" (A) |
| pontuação/caixa | 12 | 12 | caixa alta, espaços, travessão, vírgula sem espaço, hífen (A); vazio e "...?!" (R) |
| americano/britânico | 8 | 6 | colour/color, favourite, theatre, grey, practise (A) |
| pergunta | 7 | 4 | "Do you speak German?" x French (R) |
| falso erro (concordância) | 43 | 43 | sujeito composto, subjuntivo, perguntas sem "?", relativas, I was/you were (A) |
| concordância errada | 16 | 12 | you is, we is, she do, he have, it are, I has, "he never have" (R) |
| palavra funcional | 14 | 6 | "I do not want a coffee" x "I would like..." (R) |

### Os 41 casos que ainda falham (LIMITE)

| Id | Resposta | Esperado | Por que o comparador sem IA não pega |
|---|---|---|---|
| sub-08 | He live in Paris... | R | "live" x "lives": falta -s; só no detector de pronome+be/have/do, não cobre verbos lexicais |
| sub-11 | My brother is older than me (ref: sister) | R | brother x sister: 1 de 4 tokens; precisa de antônimo/par lexical |
| ten-01, 03, 04, 07, 08, 09 | She will be at home yesterday; He was at home...; She is at home yesterday; I have been tired | R | was/were/will/is/have/been são palavras funcionais ignoradas (proposta no item 4) |
| om-02, 03, 04 | I get up at seven; I live in a house; We buy bread | R | falta 1 a 2 palavras, mas 3 de 5 tokens bate 0,55 |
| om-08 | Thank you (ref "Thank you very much") | A | 1 de 3 tokens < 0,55; falso erro para omitir um intensificador |
| sw-01, 02, 03, 04, 07, 08, 09 | tea x coffee, red x blue, meat x bread, bus x train, night x morning, expensive x cheap, bad x good | R | 1 palavra trocada em 3 a 5 tokens passa; sem dicionário não há como saber que não são sinônimos |
| con-07 | He's lived in Paris (perfeito x simples) | R | tempo verbal |
| con-08 | I won't eat meat | R | will x do (ambos funcionais) |
| ord-03 | Going we are market the to tomorrow | R | sobreposição é um saco de palavras; ordem não conta |
| ord-04, 07 | The dog bites the man; I am older than my sister | R | papéis invertidos, mesmas palavras |
| am-05, 06 | flat = apartment; football = soccer | A | vocabulário, não ortografia; football é ambíguo |
| q-05 | Where are you at the train station? | R | mesmas palavras de conteúdo, sentido diferente |
| q-06 | How is you? | R | frase com "?" não passa pelo detector |
| q-07 | How are you? (ref "Hello, how are you?") | A | 1 de 2 tokens < 0,55 |
| agr-08 | I am tired and he are happy | R | efeito colateral aceito da correção do sujeito composto |
| agr-13, 14, 15 | doesn't likes; I am agree; I have 20 years | R | verbos lexicais e decalques do fr/pt |
| fn-03, 06, 07, 08, 09, 10, 11, 14 | must x may, her x his, their x our, him x her, have x had, am x was, will x would, and x or | R | todas são palavras funcionais ignoradas (proposta no item 4) |

## 6. Limites que um comparador sem IA nunca vai pegar

- **Sinonímia e antonímia**: sem dicionário ou modelo, "tea" e "coffee" são iguais a "big" e "large" (um troca de lugar com
  o outro). Aceitar sinônimos e rejeitar trocas são o mesmo problema, resolvido só com lista por desafio ou IA.
- **Sentido composicional**: papéis invertidos (the dog bites the man), escopo da negação, ironia, expressões idiomáticas
  ("it's raining cats and dogs").
- **Paráfrase estrutural** ("I like it" x "It pleases me", voz ativa x passiva).
- **Tempo verbal e modais** sem lista de equivalências por desafio, porque palavras funcionais precisam ser ignoradas para os
  sinônimos funcionarem.
- **Decalques do francês, mandarim e português** ("I have 20 years", "I am agree") só como aviso, não como veredito.
- **Registro e naturalidade** (a frase está certa, mas ninguém fala assim).
- **Erros de digitação x erros de conhecimento** (não há distância de edição: "tomorow" vira palavra desconhecida).
- **Mandarim**: tā é he/she; só a referência diz qual. O conflito he x she já é pego, mas nada protege quando a aluna usa
  "they" ou o nome.

## 7. Decisões pendentes para a dona

1. Aceita que o inglês também ganhe `mustInclude`/sinônimos por desafio (como o pt-BR), pelo menos nos desafios de preço, hora,
   cor e comida, para pegar trocas de uma palavra?
2. Quer avisos pedagógicos (sem reprovar) para decalques ("I have 20 years", "I am agree")? Seria texto novo em `t()`.
3. Subir o limiar de 0,55 e exigir cobertura da referência: só depois de medir com respostas reais das alunas; autoriza
   essa medição?
4. Tempo verbal: confirma que, por ora, "was x will be" só reprova quando houver advérbio de tempo ou palavra de conteúdo
   diferente (hoje não reprova sozinho).
5. Português do Brasil como idioma estudado ainda não tem referências em inglês: ao criar, a regra "sujeito composto"
   e "one = a" já estão cobertas, mas conferir "a gente" (we) e "você" (you) nas referências.
