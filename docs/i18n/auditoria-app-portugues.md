# Auditoria do app de português (`/pt`), 2026-10-15

Só leitura: nada de código mudou. Base: `languages/registry.json`, `docs/i18n/arquitetura-multi-idioma-cursos.md`, `fr/` e `zh/`, `docs/pt-tts-*.md`.

## 1. Nome: `pt`, não `ptbr`
- No código o idioma é `pt` (id e pasta `pt/`), chave de armazenamento/banco `portugues`, `locale: "pt-BR"`, voz `pt-BR`. O texto "ptbr" só existia em prosa do `CLAUDE.md` (corrigido).
- O português do Brasil é uma **propriedade** do idioma (`locale`), não outro idioma. Se um dia houver português de Portugal, entra como entrada separada (`pt-pt`), sem mexer no `pt`.
- Não confundir com o `pt-BR` do idioma do SITE: são dois eixos (curso `portugues@en` = estuda português com o site em inglês).

## 2. Onde estamos no plano (e uma correção minha)
Etapas da `arquitetura-multi-idioma-cursos.md`: E5 regras por família e por língua de origem; E6 servidor; **E7 o site `/pt` (infraestrutura + unidade-piloto)**; E8 gabarito para idiomas futuros; **E9 autoria do conteúdo**. Eu havia chamado o app de português de "E5": o certo é E5 (pré-requisito, regras) e depois E7 + E9.

## 3. O que já existe
- Registro: `pt` já declarado, `enabled: false`, família `latin`, bandeira, `siteLanguages: ["en"]`, curso `en` em `rascunho`, `modules: []`, sem teste de nível.
- Banco de Revisão e decks já reconhecem `portugues` (`review-bank-model.js`, `study-trail-model.js`); CHECK do banco já aceita.
- Regras de texto falado (TTS) do português: proposta e revisão prontas (`docs/pt-tts-proposta.md`, `pt-tts-revisao.md`); decisão do plano: seguir sem reabrir. O `tts_core.mjs` ainda só trata `fr-FR` (a paridade Python x JS já está quebrada no fr, achado da revisão).
- Núcleo compartilhado (E4): mais de 180 funções em `shared/core/` + ganchos `LANG_HOOKS`. Faltam 23 quase iguais (exercícios grandes e estrutura de lição), que a decisão de famílias manda resolver junto com o português.

## 4. O que NÃO existe (tamanho do trabalho)
Referência, o francês: 30 unidades (20 de vocabulário + 10 de gramática), 204 palavras, 20 diálogos com notas, 898 áudios, módulos Desafios, Conjugação e Ditados; `content.js` 97 KB + camada de pt-BR 115 KB; `app.js` 491 KB (hoje com o núcleo já extraído).
- Pasta `pt/` inteira (index, app, manifest, service worker, ícones), via gabarito (E8, hoje só plano).
- Conteúdo: níveis, módulos, unidades, notas de realidade e culturais do Brasil, **escritos para falantes de inglês** (a camada em inglês de hoje é tradução; para o pt tem que ser autoria própria, D-04).
- Áudio com voz `pt-BR` (hoje não há manifest de pt) e regras de texto falado.
- Comparador do "Ouça e traduza" para inglês (hoje é gramática do português, sem testes): E5.
- Interface do `/pt` em inglês sem NADA em português (regra do projeto; teste estrito).
- Desafios, Ditados e Conjugação do português: Conjugação do francês tem 318 KB de dados; o português precisaria do seu próprio conjunto (decidir se entra no começo).

## 5. Riscos
1. O `/pt` vai revelar pontos que ainda supõem fr/zh: cada achado se corrige no núcleo, nunca com remendo em `pt/`.
2. Copiar regra do francês que "parece servir" (acentos, cedilha, til, crase, contrações `de+a=da`): cada regra nasce de exemplos reais do português.
3. Autoria de conteúdo é o gargalo (E9), não o código.
4. Urgência: 13 dos 24 alunos estudam português, mas hoje eles já estão no Banco de Revisão; o app é para a trilha.

## 6. Perguntas para a dona (antes de planejar)
1. **Primeira entrega:** a unidade-piloto do plano (1 unidade completa + estrutura) ou algo maior para os 13 alunos já começarem a usar (ex.: nível A1 inteiro)?
2. **Quem escreve o conteúdo:** você, eu com rascunho e a sua revisão, ou usar as aulas do Notion já importadas como base?
3. **Idioma do site do `/pt`:** só inglês (como no registro) ou também outros (espanhol, francês...)?
4. **Módulos do começo:** Desafios, Ditados e Conjugação entram já, ou só trilha, revisão e decks?
5. **Nome da marca:** "Portuguese with Prof. Brune" (recomendado no plano) ou outro?
6. **Ordem:** fazer a E5 (regras de acento, comparador em inglês, TTS) antes da E7, ou o mínimo dela junto com o piloto?
