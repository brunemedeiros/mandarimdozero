---
paths:
  - "fr/content*.js"
  - "zh/content*.js"
  - "courses/**"
  - "shared/course-layer.js"
  - "fr/dictations.js"
  - "fr/scripts/challenges_import/**"
  - "fr/conj-games.js"
  - "shared/challenge-policy.js"
  - "shared/profile-placeholders.js"
---

# Conteúdo da trilha, notas e desafios

- **Base x camada (E2)**: `fr/content.js` e `zh/content.js` são só o idioma estudado (ids, frases, hanzi/pinyin, respostas, estrutura).
  Vale também para `zh/stories.js`, `zh/hanzi-data.js`, `fr/dictations.js` e o cabeçalho de `fr/conjugation-data.js`. Texto em português (título, meta, tradução, notas, cenários, rótulos, nomes de personagem, significado de hanzi, tarefa de ditado) mora em `courses/<fr|zh>-pt-BR/layer.js`
  (mesma unidade pelo `id`). Comentários de autoria antigos: `docs/historico/conteudo-original/`. Scripts que precisam do texto
  em português usam `scripts/lib/course-content.js`; `tests/camada-curso` prova base + camada == original.

Skills: `notas-de-realidade` (notas de realidade/culturais) e `criar-desafios`. Histórico: `docs/historico/01-*`, `09-*`.

- fr: níveis A1..., unidades `A1-N` e unidades `type:"grammar"` (sem vocab, sem notas). zh: HSK1 Unit 1..18 (sem módulos).
- Todos os sites (fr, zh e os próximos): o cartão é do ITEM, nunca do lugar: cada palavra/frase/fala tem `k` congelado (nunca
  mudar nem reaproveitar; item novo: `node scripts/congelar_chaves.js <site>`; mesmo sentido mantém `k`, sentido novo = `k` novo).
  Fundir/excluir só via `<site>/curriculum-changes.js`; antes de publicar conteúdo, `node scripts/ids_publicados.js` (livro-razão
  `<site>/published_ids.json`; os scripts descobrem os sites sozinhos). Site novo nasce com os três arquivos.
  Hanzi do zh também têm `k` (`zh/hanzi-data.js`, id `h<k>`, no livro-razão; excluir só com `HANZI_RETIRED_KEYS`).
- Mudou palavra, lição ou unidade (fr ou zh): `node scripts/gerar_mapa_cron.js` (mapa `STUDY_ITEM_GATE` do
  `notification-cron` e da cópia do painel) e novo deploy do cron. Unidade inserida atrás do aluno abre sozinha (2.10).
- Notas ficam em `concepts` com `kind:'reality'|'culture'` + `category`; nunca forçar nota sem relação com a palavra
  ensinada naquele momento; sem teto/mínimo por unidade. `familiar-giria` só a partir de A2/HSK2.
- Placeholders de perfil: `{nome}`, `{primeiro_nome}`, `{nacionalidade}`, `{nacionalidade_p}`, `{nacionalidade_t}`
  (quando o falante é o próprio aluno). Texto resolvido quase nunca bate `AUDIO_MANIFEST` (cai no Web Speech).
- Frases só com vocabulário já visto (ditados: `python3 fr/scripts/check_dictation_vocab.py`).
- **Conteúdo nasce traduzido** (regra da autora, 2026-10-19): o lote só está pronto quando tem a versão de cada idioma de site.
  Trilha: texto pt na camada `courses/<fr|zh>-pt-BR/layer.js` + en em `docs/i18n/content-en/` ou `content-zh-en/` (inclui
  `dialogue.scene` e `dialogue.check`) → `node scripts/build-content-overlay.js` e `node scripts/validate-content-overlay.js`.
  Desafios/ditados: en em `docs/i18n/challenges-en.json`/`dictations-en.json` → `node scripts/build-challenges-overlay.js en`
  e `node scripts/validate-challenges-en.js`. Explicação traduzida explica para quem fala aquele idioma (não "em português...").
  Mudou o pt de um item já traduzido: mudar o en junto. Guarda final: `node tests/i18n/test_sem_portugues_en.js` (0/0).
  Antes de traduzir Desafios, conferir que o lote do repositório bate com a tabela `challenges` da produção.
- Desafios entram como `needs_review` com um `.md` de revisão para a autora; só publicados aparecem na trilha.
- Mudou texto com áudio pré-gerado → regenerar mp3 (skill `audio-tts`).
- **Jogos da Conjugação** (`fr/conj-games.js`): todo trecho em francês dentro do texto em português/inglês (título,
  apresentação, regra `tl` e explicação `why`) vai entre {chaves}, que o motor pinta de azul (decisão da autora,
  2026-10-19). Toda explicação nova tem pelo menos um trecho marcado; `tests/conjugacao/test_playwright.js` barra a que não tiver.
