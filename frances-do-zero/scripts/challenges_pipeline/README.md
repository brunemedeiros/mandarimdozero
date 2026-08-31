# Pipeline de curadoria automática — Desafios → Expressões

Descobre vídeos reais do YouTube onde uma expressão idiomática francesa é
efetivamente pronunciada, confirma a ocorrência via análise audiovisual do
Gemini (Vertex AI) e gera um rascunho de desafio pra revisão humana. Nunca
publica sozinho — tudo sai com `status: "needs_review"`.

## Como funciona (resumo)

1. `youtube_search.py` busca vídeos candidatos pra uma expressão (YouTube
   Data API v3 — só título/descrição/duração, nunca baixa vídeo/áudio nem
   tenta ler legendas).
2. `gemini_vertex_provider.py` analisa janelas curtas (até
   `CLIP_WINDOW_SECONDS` segundos, até `MAX_WINDOWS_PER_VIDEO` por vídeo) de
   cada candidato, passando a URL do YouTube direto pro Gemini via Vertex AI
   — o próprio Google processa o vídeo no servidor deles, este pipeline nunca
   acessa youtube.com diretamente. Usa `gemini-2.5-flash-lite` por padrão;
   se a confiança vier baixa, tenta de novo com `gemini-2.5-flash` antes de
   descartar o candidato.
3. Só quando uma ocorrência é confirmada com confiança suficiente,
   `pedagogical_generator.py` faz **uma segunda chamada, só de texto** (bem
   mais barata, sem vídeo) pra gerar pergunta, alternativas, explicação, 2º
   exemplo e microatividade.
4. Tudo isso sai num JSON (`--out`) com dois grupos: `accepted` (candidatos
   `needs_review`) e `rejected` (expressões que não atingiram o critério de
   confiança, com o motivo) — nunca preenche com conteúdo fraco pra "bater a
   meta" pedida.

O 2º exemplo (`secondExample.text`) sai sem áudio (`audioFile: null`) — a
geração do TTS continua sendo um passo separado, com o script
`gen_guided_dictation_audio.py` (ou variante), igual já é feito pros outros
áudios do site.

## Configuração

Variáveis de ambiente (nenhuma credencial fica hardcoded no código):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | não (tem default) | Caminho pro JSON da service account. Default: `/home/user/.gcp/prof-brune-vertex-ai.json` |
| `GCP_PROJECT_ID` | não (default `prof-brune`) | Projeto do Google Cloud |
| `GCP_LOCATION` | não (default `us-central1`) | Região do Vertex AI |
| `YOUTUBE_API_KEY` | **sim** | Chave da YouTube Data API v3 (mesmo projeto) |

**A chave da service account (`.json`) NUNCA deve ir pro git.** Ela fica
fora do repositório, em `/home/user/.gcp/`.

Ajustes de custo/qualidade ficam em `config.py` (tamanho da janela de
análise, quantas janelas por vídeo, limiares de confiança, duração máxima de
vídeo aceita).

## Rodando

```bash
export YOUTUBE_API_KEY="..."
cd frances-do-zero/scripts
python3 -m challenges_pipeline.generate_challenges --level B1 \
  "avoir la gueule de bois" "casser les pieds" "poser un lapin" \
  --out /tmp/challenges_poc.json
```

O console imprime um resumo honesto no final (quantos pedidos, quantos
gerados, quantos não atingiram o critério e por quê, custo aproximado). O
JSON de saída deve ser revisado manualmente antes de qualquer entrada ser
copiada pra `challenges.js` — nada aqui publica direto pro site.

## Cache e log de custo

`.cache/analysis_cache.json` evita reanalisar o mesmo trecho de vídeo pra
mesma expressão. `.cache/cost_log.jsonl` registra cada chamada ao Gemini
(modelo, tokens, custo aproximado) pra observabilidade — a pasta `.cache/`
não vai pro git.
