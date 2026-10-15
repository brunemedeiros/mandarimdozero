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

## 4. Estado da implementação (2026-10-15)
- Já na `main` (commit 53c1037): regras de pt em `spoken_text.py` e `tts_core.mjs` (mesma ordem, `\p{L}` com flag u no JS e `[^\W\d_]` no Python), `fr.oe-ligature-elision` e `fr.age-elision` portadas ao JS (paridade fr fechada), versão por idioma (`TTS_SPOKEN_RULES_VERSION_BY_LANG`, hoje fr 4, pt 1, zh 0; `languages/registry.json`) e mapa 'pt' x 'pt-BR' em `spokenLangKey`.
- Testes: `fr/scripts/test_spoken_text.py` (90) e `tests/tts-google/test_tts_core.mjs` (73; paridade fr 781, zh 495, pt 67 entradas).
- PENDENTE (decisão da dona): (1) tabela única de dados `spoken_rules.json` lida por Python e JS: não feita, as regras com função (gênero, títulos, ordinais) não cabem numa tabela só de regex e exigiria reescrever o fr; a paridade testada cobre o risco hoje. (2) Segunda forma capitalizada quando o marcador de gênero abre a frase: "Bem-vindo(a) à casa" vira "Bem-vindo, Bem-vinda à casa" (o "B" maiúsculo é inofensivo para a voz, mas pode-se baixar a caixa); ouvir no laboratório. (3) Nada de áudio ouvido ainda: regras de partícula, ordinais e títulos continuam "lab" até a voz `pt-BR-Chirp3-HD-Achernar` ser confirmada ao vivo. (4) `pt.time-24h`, `pt.currency-brl`, `pt.common-abbreviations`: implementadas em 2026-10-15 (ver abaixo).

### Regras de hora, moeda e abreviações (2026-10-15, branch local, NÃO publicada)
Decisões da dona, implementadas em `spoken_text.py` e `tts_core.mjs` (mesma ordem, mesma regex; depois de `pt.ordinal-indicators` e antes de `pt.strip-symbols`). Versão do pt subiu de 1 para 2 (`TTS_SPOKEN_RULES_VERSION_BY_LANG` em `index.ts`, `languages/registry.json`, com `registry.js` e `engine.generated.mjs` regenerados): invalida só os áudios de pt já gerados por Field.
- `pt.time-24h`: lê só o número, nunca "duas e meia". "14h30" e "14:30" = "14 horas e 30 minutos"; "14h", "14h00" = "14 horas"; "1h" = "1 hora"; "9:05" = "9 horas e 5 minutos"; "5h de viagem" = "5 horas". Com minutos: hora 0 a 23, minutos 00 a 59 (dois pontos exige 2 dígitos). Sem minutos: 0 a 24. Fora disso fica igual ("25h30", "24:30", "14h75", "1,5h", "10:30:15", "2:1"). LIMITE CONHECIDO: "Mateus 3:16" ou razão "1:10" viram hora (indistinguíveis); se aparecer, usar `SPOKEN_OVERRIDES["pt"]`.
- `pt.currency-brl`: "R$ 5,50" = "5 reais e 50 centavos"; "R$ 1,00" = "1 real"; "R$ 0,50" = "50 centavos"; "R$ 1,01" = "1 real e 1 centavo"; "R$ 1.250,00" = "1.250 reais"; "R$ 5" e "R$5,50" também. "R$" sem número, "US$", "R$ 5,5" e "R$ 5 mil" ficam iguais.
- `pt.common-abbreviations`: só "p.ex." = "por exemplo", "etc." = "etcétera", "obs." = "observação". O ponto de "etc."/"obs." só fica se fechar a frase (fim do texto ou frase nova com maiúscula); "etc" sem ponto fica igual. Internetês (vc, tb, blz) NÃO tem regra global: usar `SPOKEN_OVERRIDES["pt"]` (texto exibido exato -> texto falado, em `spoken_text.py` e `tts_core.mjs`), subindo a versão do pt.
- Testes: `python3 fr/scripts/test_spoken_text.py` 91 -> 171; `node tests/tts-google/test_tts_core.mjs` 73 -> 107 (paridade fr 781, zh 495 sem divergência; pt 67 -> 144).
- PENDENTE: exige NOVO DEPLOY da Edge Function `tts-generate` (2 arquivos: `index.ts` e `tts_core.mjs`); sem deploy a produção segue com as regras antigas. Nenhum áudio foi gerado. Ouvir no `audio_lab` antes de gerar: "14 horas e 30 minutos", "1 hora", "0 horas"; "5 reais e 50 centavos", "1.250 reais" (milhar), "50 centavos"; "por exemplo", "etcétera." no fim de frase e "observação:".
