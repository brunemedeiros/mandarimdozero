# Pipeline de curadoria automática — Desafios → Expressões

Gera desafios completos de expressões idiomáticas francesas: exemplo em
contexto (com áudio TTS), pergunta, 4 alternativas, explicação, segundo
exemplo flexionado (com áudio) e microatividade. Tudo sai com
`status: "needs_review"` pra revisão humana — nunca publica sozinho.

## Decisão de produto: o vídeo do YouTube não é mais o núcleo do desafio

Uma versão anterior deste pipeline usava o Gemini pra assistir vídeos reais
do YouTube e confirmar uma ocorrência autêntica da expressão. Essa
abordagem foi **substituída** por uma decisão de produto: o desafio agora é
construído inteiramente por texto gerado + TTS, controlado pelo site — o
aluno não depende de vídeo nenhum pra completar a atividade. Um vídeo do
YouTube (ou outro link) pode aparecer só como um recurso opcional de
aprofundamento ("Pour aller plus loin"), buscado automaticamente mas nunca
necessário pra resolver o desafio.

## Como funciona

1. `content_generator.py` faz **uma chamada de texto** ao Gemini (Vertex
   AI) pedindo, num JSON estruturado: frase de exemplo, significado (FR/PT),
   pergunta, 4 alternativas + a correta, explicação curta, um segundo
   exemplo (flexionado, diferente do primeiro) e uma microatividade de
   completar lacuna. A dificuldade das frases é controlada pelo nível CEFR
   pedido (A1/A2/B1/B2 têm instruções diferentes de complexidade).
2. `tts.py` sintetiza o áudio dos dois exemplos via Google Cloud
   Text-to-Speech (mesma voz usada no resto do site), salvando em
   `frances-do-zero/audio/challenges/`.
3. `external_resources.py` busca (opcionalmente) vídeos do YouTube que
   *expliquem* a expressão — ao contrário da versão anterior, aqui é
   desejável que o conteúdo seja didático, já que ele só aparece depois do
   aluno já ter respondido. Usa uma chamada de texto barata ao Gemini pra
   avaliar título/canal e escolher o melhor resultado. Nunca baixa/analisa
   vídeo — só metadados da YouTube Data API v3. Se a busca falhar ou não
   achar nada bom, o desafio principal continua funcionando normalmente
   (`externalResources: []`).
4. `generate_challenges.py` orquestra os três passos acima pra cada
   expressão pedida e escreve o resultado num JSON (`--out`) com dois
   grupos: `accepted` (candidatos `needs_review`) e `rejected` (expressões
   que falharam na geração, com o motivo).

## Configuração

Variáveis de ambiente (nenhuma credencial fica hardcoded no código):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | não (tem default) | Caminho pro JSON da service account (Vertex AI). Default: `/home/user/.gcp/prof-brune-vertex-ai.json` |
| `GCP_PROJECT_ID` | não (default `prof-brune`) | Projeto do Google Cloud |
| `GCP_LOCATION` | não (default `us-central1`) | Região do Vertex AI |
| `GCP_TTS_KEY` | **sim** | API key da Text-to-Speech API (mesma usada no resto do TTS do site) |
| `YOUTUBE_API_KEY` | não (só afeta "Pour aller plus loin") | Chave da YouTube Data API v3 |

**A chave da service account (`.json`) NUNCA deve ir pro git.** Ela fica
fora do repositório, em `/home/user/.gcp/`.

## Rodando

```bash
export GCP_TTS_KEY="..."
export YOUTUBE_API_KEY="..."   # opcional, só pra "Pour aller plus loin"
cd frances-do-zero/scripts
python3 -m challenges_pipeline.generate_challenges --level B1 \
  "avoir la gueule de bois" "casser les pieds" "poser un lapin" \
  --out /tmp/challenges_poc.json
```

O console imprime um resumo honesto no final (quantos pedidos, quantos
gerados, quantos falharam e por quê, custo aproximado). O JSON de saída
deve ser revisado manualmente antes de qualquer entrada ser copiada pra
`challenges.js` — nada aqui publica direto pro site.

## Log de custo

`.cache/cost_log.jsonl` registra cada chamada ao Gemini (modelo, tokens,
custo aproximado) pra observabilidade — a pasta `.cache/` não vai pro git.
