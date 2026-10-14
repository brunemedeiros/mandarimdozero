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

## 7. Registro dos lotes

### Lote 1 (2026-10-14): feito, na branch, **sem PR**
- 22 funções idênticas: `shared/core/audio-fala.js` (8: som de acerto/erro, aquecimento do TTS, botões de áudio) e `shared/core/gamificacao.js` (14: conquistas, celebração de sequência, missões do dia). Cerca de 250 linhas a menos em cada `app.js`.
- Ficaram de fora de propósito `renderSettingsView`, `switchSettingsSection` e `isAdminUser` (Configurações e painel estão sendo editados por outras sessões) e as constantes/`let` idênticas (só funções neste lote).
- Ferramenta: `scripts/e4-extract.js` (copia o texto exato; se o comentário difere entre fr e zh, fica o mais longo; aborta se o texto de uma função diferir ou se o conjunto de declarações de topo não bater).
- Bateria completa (115 suítes) antes e depois: as mesmas 14 falhas de antes; a `test_i18n_unit` precisou ignorar os `<script>` novos na comparação de HTML (ajustado); `fase-j` falhou uma vez no lote e passou 62/62 em duas rodadas isoladas (instável).

### Lote 2 (2026-10-14): feito, na branch, **sem PR**
- 42 funções idênticas de revisão e decks (fila de revisão, sessão, resumos, filtros por tag e origem, humor/ajuda de cartão, missões de revisão, cartões de professora e próprios) para `shared/core/revisao-decks.js` (cerca de 800 linhas com comentários). Em 13 funções o comentário diferia entre fr e zh; ficou o mais longo (o outro está no histórico do git).
- Os testes que extraem funções do TEXTO do `app.js` (12 arquivos, harness e unitários) passaram a usar `tests/e4/app-source.js` (`withCore`), que acrescenta `shared/core/*.js` ao texto. Novo `tests/e4/test_core_carregado.js`: o core está carregado antes do `app.js`, todas as funções existem como função global em fr e zh e nenhuma foi repetida no `app.js`.
- Bateria completa (119 suítes) antes: 15 falhas. Depois do lote, 23 suítes novas falharam só por lerem o `app.js` sem o core; depois do ajuste, as falhas voltaram às mesmas 15 de antes (nenhuma nova).

### Lote 3 (2026-10-14): feito, na branch, **sem PR**
- 39 funções idênticas de exercícios de lição (reconhecimento, jogo de pares, rodada de velocidade, conceitos, foco da lição, frases de feedback, modo de digitar, diálogo) para `shared/core/exercicios-licao.js` (569 linhas com comentários). Em 10 funções o comentário diferia entre fr e zh; ficou o mais longo.
- Bateria completa (119 suítes) antes e depois: as mesmas falhas de antes, **nenhuma nova**; `test_ui_language_confirm_browser` (instável) passou desta vez. `tests/e4/test_core_carregado.js` 15/15. Os testes já leem o core via `tests/e4/app-source.js`, então este lote não precisou mexer em teste nenhum.
- Capturas de tela fr/zh claro/escuro: não refeitas (o lote só move código; as telas de lição são exercitadas pelos testes Playwright da bateria).
