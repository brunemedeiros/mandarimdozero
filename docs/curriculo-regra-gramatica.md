# Regra curricular: a gramática sistematiza o que o aluno já viu

Trilha de Estudo, Fase 4 (06/10/2026). Vale para qualquer idioma, atual e futuro.

## A regra
Uma unidade de gramática só pode **sistematizar** uma estrutura que o aluno já **ouviu ou leu** em unidades anteriores (input antes da regra). Se o texto da unidade diz "você já viu isso", precisa ser verdade.

## O que existe hoje
- **Francês (A1):** `node fr/scripts/check_grammar_input.js`
  - lê `fr/content.js` (ordem real dos módulos) e `fr/scripts/grammar_input_map.json`;
  - para cada unidade de gramática conta as formas-alvo nas unidades **anteriores** e **posteriores**;
  - **só avisa**, nunca falha o build (`--strict` sai com código 1, para uso manual);
  - avisos: sem entrada no mapa, pouco input antes (< 3), input só depois, forma-alvo com 0 ocorrências antes.
- É uma **triagem por heurística** (expressões regulares). Serve para apontar onde olhar, não para decidir pedagogia.
- Estado em 06/10/2026: 8 avisos em 10 unidades (g4 preposições, g6 savoir/il faut, g7 comparativos, g8 frequência, g9 être no passé composé…). Nada do conteúdo foi alterado; o que fazer com cada aviso (semear input antes, ajustar o texto, mover a unidade) é decisão da professora.

## Como usar ao criar conteúdo novo
1. Crie a unidade de gramática no `content.js`.
2. Acrescente a entrada dela em `grammar_input_map.json` (`structure` + `forms`).
3. Rode o validador e leia os avisos antes de publicar.
4. Reordenar unidades mexe em desbloqueio e progresso salvo: avaliar antes.

## Outros idiomas
- **Mandarim (HSK1):** a gramática vem embutida em `concepts` com gatilho, não em unidades separadas. O relatório da Fase 0 lista os casos (在+verbo, 不想…了, 是…的, 吗/呢…). Um validador equivalente exige metadado `{structureId, role}` nos `concepts` (proposta da Fase 0), ainda não criado.
- **Idioma novo:** crie o mapa de input do idioma e um script no mesmo formato; regras de idiomas não se misturam.
