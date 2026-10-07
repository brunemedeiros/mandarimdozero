# Revisão: regras de "texto falado" pt-BR

Base: proposta `pt-tts-proposta.md`, `spoken_text.py` (fr: 4 regras + overrides + `_tidy`) e
`tts_core.mjs` (`toSpokenTextForTts`: só fr-FR, 2 regras, sem overrides e sem `_tidy`).

## 0. Achados transversais (antes das regras)
1. **Paridade já está quebrada hoje no fr.** O JS não tem `fr.oe-ligature-elision`, `fr.age-elision`,
   os overrides nem o `_tidy` do Python. Um cartão de campo com "l'œuf" gera TTS lido errado. Antes de
   pôr pt, corrigir isso. Melhor: uma tabela única de dados (`spoken_rules.json`: id, lang, regex, troca,
   ordem) lida pelo Python e embutida/copiada no JS, + teste que roda TODAS as entradas do manifest fr
   (não só 12) nos dois lados.
2. **`\w` e Unicode.** Python `re` casa letras acentuadas em `\w`; JS sem flag `u` não (`\w` = ASCII).
   "bem-vindo(a)", "você", "alemão" divergem. No JS usar `\p{L}` com flag `u`; no Python usar
   `[^\W\d_]` ou o mesmo conjunto explícito. Fazer o teste de paridade incluir palavras acentuadas.
3. **Códigos de idioma diferentes**: Python `"pt"`, JS `"pt-BR"`. Documentar o mapa num lugar só.
4. **`TTS_CONFIG_VERSION` é global.** Subir para pt marca como "desatualizado" todo TTS de campo em fr
   e zh também (aviso falso para a professora). Sugestão: chave por idioma, ex.
   `configVersion = "1:fr4:pt1:zh0"` → hoje uma única troca, depois só o idioma mexido invalida.
   Fazer isso UMA vez, junto com a 1ª regra de pt.
5. **Texto exibido / generationKey**: ok como proposto (só o enviado muda). Lembrar que o STT de
   validação do pipeline (se usado para pt) compara com o texto FALADO.

## 1. Regras da proposta

### pt.slash-alternatives — MANTER
Igual ao fr, baixo risco, barra sem espaço intacta. Só acrescentar teste com "e/ou" e "24/7".

### pt.gender-parenthetical — AJUSTAR (é a mais arriscada, não a mais simples)
Problemas não cobertos:
- **Vários marcadores na mesma frase**: "o(a) aluno(a)" vira "o, a aluno, aluna" — ruim.
  "Caro(a) professor(a)" idem. Leitura natural: "o aluno ou a aluna". Proposta: se a frase tem 2+
  marcadores, gerar frase masculina inteira + ", " + frase feminina inteira ("o aluno, a aluna");
  com 1 marcador, "obrigado, obrigada". Ouvir as duas opções no lab, incluindo a opção "ler só a
  forma masculina" (mais simples e talvez preferida pela autora).
- **Terminações que a troca ingênua estraga**: "inglês(a)" → "inglêsa" (é "inglesa", sem acento);
  "português(a)", "alemão(ã)", "ator(triz)". Restringir a regra automática a **-o(a)** e **-or(a)**;
  todo o resto vai para override (ou fica cru e o lab diz).
- **Plural**: "(s)" só depois de vogal ("livro(s)"). Depois de consoante o certo é "(es)":
  "professor(es)" → "professor, professores"; "flor(s)" é erro de digitação, não tratar.
  Incluir "(es)" e "o(s)/os(as)" na mesma lógica de frase inteira acima.
- **"Sr.(a)" / "Sr(a)."** não casam (o marcador vem depois de ponto). Tratar na regra de títulos
  (abaixo), que precisa rodar ANTES desta.
- **Ordem crítica**: a regex da partícula (`\s*\(`) aceita zero espaço — "obrigado(a)" viraria
  "obrigado a…" se a partícula rodasse antes. Esta regra tem de rodar antes, E a partícula deve exigir
  espaço (ver abaixo).
- Implementação: precisa de função de troca (não só string de `re.sub`); garantir callback igual no JS.
Status: lab, mas é a regra que mais precisa de exemplos reais do conteúdo antes de escrever.

### pt.parenthetical-particle — AJUSTAR
A regex genérica do fr lê qualquer parêntese ("você (informal)" → "você informal…", "casa (lar)").
Em pt o material de PLE usa muito parêntese explicativo. Usar **lista fechada**: `\s+\((de|em|a|com|
por|para|do|da|no|na)\)` (com espaço obrigatório antes) → ` \1…`. Resto fica cru ou override.
"(a/para)" → só se a autora quiser; senão override. Status: lab.

### pt.title-abbreviations — AJUSTAR e SUBIR de prioridade (antes do gênero)
- Exigir maiúscula depois perde casos comuns: "Obrigado, Sra." (fim de frase), "a Sra. é...",
  "Sr. e Sra. Silva". Títulos com ponto são inequívocos: expandir sempre que seguidos de espaço,
  pontuação ou fim do texto; se for fim do texto, manter o ponto: "Obrigado, Senhora."
- Acrescentar: **"Sr.(a)" / "Sr(a)."** → "Senhor ou Senhora" (ou "Senhor, Senhora", ouvir);
  plurais "Srs.", "Sras.", "Drs.", "Dras."; formas com ª: "Sr.ª", "Dr.ª", "Prof.ª", "Profª";
  sem ponto "Dr", "Sr" antes de nome maiúsculo (comum em mensagem informal).
- `D.` fora: concordo. Usar limite de palavra (`\b`) para não pegar "SrA." dentro de outra palavra.
Status: aprovar após ouvir 2 casos.

### pt.ordinal-indicators — AJUSTAR
- Tabela 1–20 é arbitrária: "21º andar", "25ª edição", "100º" ficam crus logo ao lado de "20º"
  convertido — inconsistente. Gerar por composição (dezenas + unidades) de 1 a 99 (+ "centésimo"),
  com concordância º/ª: "vigésimo primeiro", "vigésima quinta". Testar "1.º", "1.ª", "1º", "1ª".
- Plural "1ºs/1as" raro: deixar cru.
- **"°" (grau) digitado no lugar de "º"** é muito comum ("1° andar") mas também é temperatura
  ("20°C"). Não converter "°"; só registrar.
- Acrescentar **"nº", "n.º", "Nº"** → "número" (aparece em endereço, formulário, PLE de serviços).
Status: lab (se o Chirp já lê bem, desligar; mas manter o código para "nº").

### Opcionais (b)
- **pt.time-24h**: manter adiado; é decisão de conteúdo. Atenção a "14:30" (pode ser placar/razão).
- **pt.currency-brl**: manter adiado; o Google costuma ler "R$ 5,00". Se mexer, cuidar de "R$ 1,50"
  ("um real e cinquenta centavos") e de "R$ 1.200,00" (ponto de milhar).
- **pt.common-abbreviations**: manter adiado; concordo com override para "vc/tb" (pode ser o objeto
  de ensino). "etc." pode ficar, o Google lê.
- **pt.strip-symbols**: SUBIR um pouco — emoji e setas aparecem de fato em cartão autoral (o editor
  aceita qualquer texto). Remover só símbolos de lista (`•`, `→`, `✓`, `*` isolado) e emoji. Barato.
- **pt.ellipsis-normalize**: DESCARTAR. Não muda leitura; só aumenta o número de regras e a chance de
  disparar "desatualizado" à toa.

### (c) Não fazer — concordo com todos
Sandhi, hífen de pronome, entonação, siglas (override caso a caso), números, variação regional,
acentos. Acrescento: **não converter números por extenso** (o Ditado do fr faz isso para correção,
não para leitura) e **não reescrever caixa alta** ("NÃO" vira ênfase na voz, é intencional).

## 2. Ordem final sugerida
overrides > títulos (inclui Sr.(a)) > nº > gênero/plural entre parênteses > partícula (lista fechada,
com espaço) > barra > ordinais > símbolos > tidy (colapsar espaços, igual nos dois lados).

## 3. Testes a acrescentar
"o(a) aluno(a)", "Caro(a) professor(a)", "professor(es)", "inglês(a)" (fica cru), "Sr.(a) Silva",
"Obrigado, Sra." → "Obrigado, Senhora.", "Sr. e Sra. Silva", "Prof.ª Ana", "21º andar",
"1.º de maio", "1° andar" (cru), "nº 5", "você (informal)" (cru), "gostar (de)", "e/ou" (cru),
"bem-vindo(a)" e "você" no teste de paridade JS (Unicode), fr "l'œuf" e "l'âge" na paridade JS.
