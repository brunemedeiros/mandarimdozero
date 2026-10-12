---
paths:
  - "fr/content*.js"
  - "zh/content*.js"
  - "courses/**"
  - "shared/course-layer.js"
  - "fr/dictations.js"
  - "fr/scripts/challenges_import/**"
  - "shared/challenge-policy.js"
  - "shared/profile-placeholders.js"
---

# Conteúdo da trilha, notas e desafios

- **Base x camada (E2)**: `fr/content.js` e `zh/content.js` são só o idioma estudado (ids, frases, hanzi/pinyin, respostas, estrutura).
  Texto em português (título, meta, tradução, notas, cenários, rótulos, nomes de personagem) mora em `courses/<fr|zh>-pt-BR/layer.js`
  (mesma unidade pelo `id`). Comentários de autoria antigos: `docs/historico/conteudo-original/`. Scripts que precisam do texto
  em português usam `scripts/lib/course-content.js`; `tests/camada-curso` prova base + camada == original.

Skills: `notas-de-realidade` (notas de realidade/culturais) e `criar-desafios`. Histórico: `docs/historico/01-*`, `09-*`.

- fr: níveis A1..., unidades `A1-N` e unidades `type:"grammar"` (sem vocab, sem notas). zh: HSK1 Unit 1..18 (sem módulos).
- Notas ficam em `concepts` com `kind:'reality'|'culture'` + `category`; nunca forçar nota sem relação com a palavra
  ensinada naquele momento; sem teto/mínimo por unidade. `familiar-giria` só a partir de A2/HSK2.
- Placeholders de perfil: `{nome}`, `{primeiro_nome}`, `{nacionalidade}`, `{nacionalidade_p}`, `{nacionalidade_t}`
  (quando o falante é o próprio aluno). Texto resolvido quase nunca bate `AUDIO_MANIFEST` (cai no Web Speech).
- Frases só com vocabulário já visto (ditados: `python3 fr/scripts/check_dictation_vocab.py`).
- Desafios entram como `needs_review` com um `.md` de revisão para a autora; só publicados aparecem na trilha.
- Mudou texto com áudio pré-gerado → regenerar mp3 (skill `audio-tts`).
