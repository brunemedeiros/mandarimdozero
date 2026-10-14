# E4, passo 2: plano de extração do núcleo compartilhado

Base: `docs/i18n/e4-levantamento-funcoes.md` (passo 1). Estratégia aprovada na arquitetura: **incremental** (Q-13), `<script>` globais, sem build (Q-14). Nada de código foi movido ainda.

## 1. O que o levantamento mostrou

- Funções de topo: 536 nomes distintos (fr 474, zh 299 declarações; 237 só do francês, 62 só do mandarim).
- **163 funções são idênticas** (1.971 linhas no fr, 21% das linhas de função; 30% no zh). **55 são quase iguais** (2.541 linhas). **19 divergem**.
- Se só as idênticas saírem, `fr/app.js` perde ~2.000 linhas e `zh/app.js` ~1.970; com as quase iguais, perto de 4.500 em cada. A conta da meta "duplicação abaixo de 30%" será refeita a cada área com o mesmo script.
- 43% do francês e 21% do mandarim são peças de um idioma só (Desafios, conjugação e ditados no francês; hanzi e traços no mandarim): viram módulos opcionais declarados no registro (passo 6), não duplicação.

## 2. Descoberta que simplifica o método

`<script>` clássicos compartilham o mesmo escopo global, inclusive `const`/`let` de topo (`STATE`, `UNITS`, `APP_KEY`...). Uma função idêntica movida para `shared/core/<área>.js` e carregada **antes** do `app.js` continua achando `STATE` e os outros nomes na hora da chamada, **sem mudar nenhuma chamada**. Por isso a proposta é **manter os nomes globais** nas extrações das idênticas (zero alias, zero risco de renomeação) e usar o namespace `Core` só em código novo e nas quase iguais que ganharem parâmetro. *Divergência em relação à arquitetura (que previa namespace e alias):* aguarda a aprovação da dona.

## 3. Mecânica de cada lote (mecânica e verificável)

1. Script `scripts/e4-extract.js` (a criar no lote 1): recebe a lista de funções, **copia o texto exato** (com comentários) de `fr/app.js` e `zh/app.js` para `shared/core/<área>.js`, apaga do `app.js` e adiciona o `<script>` nos dois `index.html` antes do `app.js`.
2. Gate automático antes de commitar: o conjunto de declarações de topo (fr + zh + shared/core) é o mesmo de antes; cada função extraída tem texto idêntico ao original; o levantamento gerado de novo mostra a diferença esperada.
3. Regressão completa da bateria (114 suítes) comparada com a da `main`; capturas dos 4 cenários (fr/zh x claro/escuro) para os lotes que mexem em tela.
4. Um PR pequeno por lote, com a `main` trazida antes (R-17: outras sessões editam `app.js`); em conflito, manter os dois lados. Aviso à dona antes de uma área grande.

## 4. Ordem proposta (menos arriscado primeiro)

| Lote | Conteúdo | Funções | Linhas (fr) | Risco |
|---|---|---:|---:|---|
| 1 | idênticas de **áudio e fala** e de **perfil, ranking e social** (conquistas, celebrações, missões) | 25 | ~220 | baixo |
| 2 | idênticas de **revisão e decks** | 42 | ~500 | médio (cartões e FSRS; regressão da Revisão) |
| 3 | idênticas de **exercícios de lição** | 39 | ~420 | médio (telas de lição) |
| 4 | idênticas de **estado e persistência**, **mapa da trilha**, **checkpoint**, **desafios**, **outros** | 57 | ~835 | médio/alto (salvar e carregar) |
| 5 | **quase iguais** (55), uma área por vez, com ponto de extensão (nome do falante, função de fala, teclado) | 55 | ~2.540 | alto |
| 6 | **divergentes** (19), uma a uma: unificar ou assumir como regra do idioma (E5) | 19 | ~730 | alto |
| 7 | **módulos opcionais** (conjugação, Desafios, ditados) declarados no registro; `index.html` por idioma vira casca | — | — | alto |

O lote 4 inclui o que toca salvar e carregar: só entra com teste de ida e volta do progresso (como o `test_course_storage`) e a bateria inteira.

## 5. O que fica de fora de propósito

- `challenges.js` e a conjugação (só francês): E9.
- Nada em CSS (a regra de cores e os 4 cenários continuam valendo).
- Nenhum nome de função muda nos lotes 1 a 4.

## 6. Perguntas para a dona

- **Q-13** (confirmar): extração incremental, por lotes pequenos.
- **Q-14** (confirmar): `<script>` globais, sem build, e **manter os nomes globais** nos lotes 1 a 4 (descoberta da seção 2).
- **Começar pelo lote 1?** Cada lote é um PR separado; nenhum PR é aberto sem pedido.
