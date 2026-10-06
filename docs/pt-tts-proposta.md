# Proposta: regras de "texto falado" para português (pt-BR)

Só proposta. Nenhum arquivo do repositório foi alterado.

## Contexto lido
- `fr/scripts/challenges_pipeline/spoken_text.py`: `RULES_BY_LANG` (fr com 4 regras, zh vazio), `SPOKEN_OVERRIDES` (vence as regras), `SPOKEN_RULES_VERSION = 4`, `explain_spoken_text`/`report_affected_entries`. Testes em `fr/scripts/test_spoken_text.py`.
- `supabase/functions/tts-generate/tts_core.mjs`: `toSpokenTextForTts` só trata `fr-FR` (2 regras: parêntese e barra). Para `pt-BR` o texto vai cru para a voz `pt-BR-Chirp3-HD-Achernar` (voz ainda não confirmada ao vivo, segundo o CLAUDE.md).
- Regra que continua valendo: só o texto ENVIADO ao TTS muda. Texto exibido, chave do manifest e `generationKey` usam o original.

## Onde entraria
1. `spoken_text.py`: nova lista `_PT_RULES`, chave `"pt"` em `RULES_BY_LANG` e em `SPOKEN_OVERRIDES`. Nada misturado com fr.
2. `tts_core.mjs`: ramo `languageCode === 'pt-BR'` em `toSpokenTextForTts`, com as MESMAS regex e a MESMA ordem (teste de paridade, como já existe para fr).
3. Subir `SPOKEN_RULES_VERSION` (5) e `TTS_CONFIG_VERSION` (index.ts e shared/flashcard-model.js). Hoje não existe manifest de pt, então não há mp3 a regenerar. Áudios TTS por campo em pt já gerados (provavelmente nenhum) ficariam "desatualizados", que é o comportamento certo.

Ordem sugerida das regras: overrides > gênero entre parênteses > parêntese genérico > barra > abreviações > ordinais.

Legenda de status: "aprovar" = depende só de decisão da autora; "lab" = depende de OUVIR antes (usar `audio_lab.py` com variantes, como foi feito em fr).

## (a) Recomendado agora

### pt.slash-alternatives
- Problema: "o / a", "bonito / bonita", "meu / minha". O TTS pode ler "barra", pular a barra ou emendar as duas formas sem pausa (suposição; em fr o gerador antigo lia só a 1ª forma).
- Transformação: ` / ` (com espaços) -> `, `. Igual ao fr.
- Exemplos: `bonito / bonita` -> `bonito, bonita`; `o / a aluno` -> `o, a aluno` (aceitável, é o que está escrito).
- Falso positivo: baixo. Barra SEM espaços fica igual (`km/h`, `e/ou`, `24/7`, datas `05/10`).
- Status: aprovar (mesma decisão já tomada em fr).

### pt.gender-parenthetical
- Problema: forma de material de PLE `obrigado(a)`, `professor(a)`, `aluno(a)`, `bem-vindo(a)`. Lido cru vira "obrigado a" ou "obrigado parêntese a" (suposição a confirmar).
- Transformação (estreita): palavra terminada em `o` + `(a)` -> `palavra, palavr+a` trocando o `o` final; palavra terminada em consoante + `(a)` -> `palavra, palavra+a`. Também `(s)` -> `palavra, palavras` e `(as)` em `o(as)`? NÃO: só `(a)` e `(s)`; qualquer outra coisa vai para override.
- Exemplos: `obrigado(a)` -> `obrigado, obrigada`; `professor(a)` -> `professor, professora`; `bem-vindo(a)` -> `bem-vindo, bem-vinda`; `livro(s)` -> `livro, livros`.
- Falso positivo: médio. `alemão(ã)`, `ator(atriz)` não casam (padrão só aceita `(a)`/`(s)` colados) e ficam para a regra genérica abaixo ou override. Exige ouvir se "obrigado, obrigada" soa natural ou se a autora prefere ler só a 1ª forma.
- Status: lab.

### pt.parenthetical-particle
- Problema: `gostar (de)`, `precisar (de)`, `pensar (em)`: parêntese vira aparte com pausa longa (foi o caso no fr com "(de)").
- Transformação: ` (x)` -> ` x…` (mesma regex do fr). Deve rodar DEPOIS da regra de gênero.
- Exemplos: `gostar (de)` -> `gostar de…`; `ir (a/para)` -> `ir a/para…` (a barra sem espaço fica; ver risco).
- Falso positivo: médio. Parêntese explicativo longo (`casa (lar)`, `você (informal)`) seria lido como se fosse parte da frase. Mitigação: limitar a 1 a 3 palavras curtas, ou usar só em vocabulário (não em frases). Em fr a autora escolheu ouvindo; repetir isso para pt.
- Status: lab.

### pt.title-abbreviations
- Problema: `Sr.`, `Sra.`, `Srta.`, `Dr.`, `Dra.`, `Prof.`, `Profa.`, `D.` (Dona). O TTS pode soletrar ou ler "s r" e o ponto pode gerar pausa de fim de frase (suposição; o Google costuma expandir alguns, confirmar).
- Transformação: com ponto e seguido de espaço + maiúscula: `Sr.` -> `Senhor`, `Sra.` -> `Senhora`, `Srta.` -> `Senhorita`, `Dr.` -> `Doutor`, `Dra.` -> `Doutora`, `Prof.` -> `Professor`, `Profa.` -> `Professora`. `D.` fica de fora (ambíguo com iniciais).
- Exemplos: `Bom dia, Sra. Silva!` -> `Bom dia, Senhora Silva!`; `O Dr. Paulo chegou.` -> `O Doutor Paulo chegou.`
- Falso positivo: baixo com a exigência de maiúscula depois (`Sr.` no fim da frase não casa, o que é aceitável).
- Status: aprovar, mas ouvir 2 casos antes (se o Google já expande certo, a regra só reduz risco).

### pt.ordinal-indicators
- Problema: `1º`, `2ª`, `3.º`, `1o` (o com letra comum). Risco de ler "um o", "dois a" ou "primeiro" no gênero errado (suposição a confirmar).
- Transformação: tabela fechada 1 a 20 (`primeiro/primeira` ... `vigésimo/vigésima`) aceitando `º`, `ª`, `.º`, `.ª`. NÃO converter `1o`/`2a` com letra comum (ambíguo).
- Exemplos: `1º andar` -> `primeiro andar`; `a 2ª aula` -> `a segunda aula`; `21º` -> sem regra (fica cru).
- Falso positivo: baixo (o caractere `º`/`ª` quase só aparece em ordinal).
- Status: lab (pode ser que o Chirp já leia bem; se ler, a regra não é necessária).

## (b) Opcional (depois, só se ouvir problema ou aparecer no conteúdo)

### pt.time-24h
- Problema: `14h30`, `9h`, `14:30`. Leitura possível "catorze agá trinta" (suposição).
- Decisão pedagógica antes de técnica: o curso ensina "duas e meia" ou "catorze e trinta"? Isso não é regra de texto, é escolha de conteúdo. Sugestão: `14h30` -> `catorze e trinta`, `9h` -> `nove horas`.
- Falso positivo: `5h de viagem` (duração) viraria hora certa; ainda é leitura correta. Status: depois, com decisão da autora.

### pt.currency-brl
- Problema: `R$ 5,00`, `R$ 12,50`. O Google pode ler "reais" certo ou "R cifrão cinco vírgula zero zero" (suposição a confirmar).
- Transformação: `R$ N,00` -> `N reais`; `R$ N,CC` -> `N reais e CC centavos`; `R$ 1,00` -> `um real`.
- Status: depois, só se o lab mostrar erro.

### pt.common-abbreviations
- `p.ex.` -> `por exemplo`; `etc.` -> `etcétera`; `obs.` -> `observação`; `tb`/`vc` (internetês) -> `também`/`você`.
- Risco: internetês às vezes é o próprio objeto de ensino (nota de realidade "vc"). Nesse caso a autora pode querer o áudio da forma falada, não da sigla. Usar override por texto em vez de regra global. Status: depois.

### pt.strip-symbols
- Setas, emoji, `*` e marcadores (`→`, `✓`, `•`) que podem ser lidos em voz alta ou gerar ruído. Remover só no texto falado. Status: depois, se aparecer em cartão real.

### pt.ellipsis-normalize
- `...` (3 pontos) -> `…`. Só por consistência com a regra do parêntese. Status: depois; provavelmente desnecessário.

## (c) Não fazer (não é regra de texto)

- **Sandhi / ligação** (`os carros azuis` -> "osh carros azuis", "uz azuis"; `mas é` -> "maz é"): a voz já faz. Reescrever ortografia para forçar sotaque pioraria e quebraria a comparação. Fica com a voz.
- **Hífen de pronome** (`chamá-lo`, `dá-me`, `vê-la`, mesóclise `dir-te-ei`): escrita correta; mexer no hífen muda a leitura. Só override pontual se o lab mostrar erro.
- **Entonação de pergunta solta** (`Tudo bem?`, `Né?`): a voz decide pelo `?`. Não trocar pontuação nem usar SSML (o projeto não usa SSML no TTS por campo).
- **Siglas** (`EUA`, `ONU`, `CPF`, `SUS`): se é soletrada ou lida como palavra varia por sigla. Regra global erraria uma parte; usar `SPOKEN_OVERRIDES["pt"]` caso a caso.
- **Números e decimais comuns** (`25 anos`, `1,5 kg`, `2026`): a voz pt-BR deve ler (suposição; confirmar `1,5` com vírgula decimal). Só regra se o lab mostrar erro.
- **Variação regional** (`você`/`tu`, "dia" carioca vs paulista): é a voz/sotaque, não texto. Nota de realidade cuida disso no conteúdo.
- **Acentos e crase** (`à`, `você`, `pão`): nunca remover. O truque do fr (`œuf` -> `oeuf`) foi para um defeito específico ouvido; não generalizar.

## Esboço de testes (`fr/scripts/test_spoken_text.py` ou arquivo próprio)

```python
L = "pt"
check("barra", st.to_spoken_text("bonito / bonita", L) == "bonito, bonita")
check("barra sem espaço intacta", st.to_spoken_text("km/h", L) == "km/h")
check("gênero -o(a)", st.to_spoken_text("obrigado(a)", L) == "obrigado, obrigada")
check("gênero consoante", st.to_spoken_text("professor(a)", L) == "professor, professora")
check("gênero com hífen", st.to_spoken_text("bem-vindo(a)", L) == "bem-vindo, bem-vinda")
check("plural (s)", st.to_spoken_text("livro(s)", L) == "livro, livros")
check("partícula", st.to_spoken_text("gostar (de)", L) == "gostar de…")
check("título", st.to_spoken_text("Bom dia, Sra. Silva!", L) == "Bom dia, Senhora Silva!")
check("Sr. no fim fica", st.to_spoken_text("Obrigado, Sr.", L) == "Obrigado, Sr.")
check("ordinal masc", st.to_spoken_text("1º andar", L) == "primeiro andar")
check("ordinal fem", st.to_spoken_text("a 2ª aula", L) == "a segunda aula")
check("ordinal fora da tabela intacto", st.to_spoken_text("21º", L) == "21º")
for t in ["Os carros azuis.", "Vou chamá-lo amanhã.", "Tudo bem?", "Moro nos EUA.", "Tenho 25 anos."]:
    check(f"intacto: {t}", st.to_spoken_text(t, L) == t)
check("fr não é afetado por pt", st.to_spoken_text("obrigado(a)", "fr") == "obrigado(a)")
check("pt não é afetado por fr", st.to_spoken_text("l'œuf", "pt") == "l'œuf")
check("explain lista as regras", st.explain_spoken_text("obrigado(a)", L) == ["pt.gender-parenthetical"])
```

Paridade Node (`tests/tts-google/test_tts_core.mjs`): para cada entrada acima, `toSpokenTextForTts(t, 'pt-BR') === to_spoken_text(t, 'pt')` (gerar a lista a partir do Python e conferir no Node, como já é feito para fr).

## Antes de ligar qualquer regra
1. Confirmar que a voz `pt-BR-Chirp3-HD-Achernar` existe (o CLAUDE.md registra isso como não confirmado).
2. Rodar o laboratório com 10 a 15 frases de teste (barra, gênero, parêntese, títulos, ordinais, horas, dinheiro, siglas, `1,5`) e ouvir a versão crua e a transformada. Só ligar o que o ouvido confirmar.
