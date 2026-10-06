# Lote de 80 expressões (Desafios) — importação por JSON

Conteúdo: 80 expressões do francês cotidiano (A2–B2), com registro marcado
(familiar / muito familiar / vulgar) dentro de `meaning.pt` e `explanation`.
Seleção por frequência de uso (OpenSubtitles fr 2018) + valor pedagógico.

| Arquivo | O que é |
|---|---|
| `lote-expressoes-content.json` | Fonte editável (um objeto por expressão, com `register`, `lote`, textos). |
| `build_lote_expressoes.py` | Valida e gera o JSON importável. Sem rede. |
| `lote-expressoes-80.json` | JSON pronto para o painel admin. Tudo `needs_review`. |
| `generate_challenge_audio.py` | Gera os 240 mp3 (expressão + 2 exemplos) em `fr/audio/challenges/`. |

## Passo a passo
1. **Gerar o áudio** (GitHub > Actions > "Áudio TTS" > Run workflow, branch `main`,
   modo `desafios-expressoes`). Usa o Secret `GCP_TTS_KEY`, commita os mp3 e
   dispara o deploy. Textos que o Speech-to-Text recusar caem num fallback com
   checagem física do mp3; o que mesmo assim falhar aparece como "SEM ÁUDIO" no log.
2. **Ouvir** os áudios dos palavrões e interjeições (`ta gueule`, `putain`, `bordel`…).
3. **Importar**: painel de admin > Desafios > importar JSON > colar o conteúdo de
   `lote-expressoes-80.json`. Entra como `needs_review`; ids duplicados são recusados.
4. **Revisar e publicar** no painel (o checklist bloqueia item sem áudio).

Para mudar um texto: edite `lote-expressoes-content.json`, rode
`python3 fr/scripts/challenges_import/build_lote_expressoes.py` e gere o áudio de novo
(o nome do mp3 é o hash do texto; textos novos geram arquivos novos).

## Desafios do Módulo 1 (A1) -- trilha Premium

- Conteúdo-fonte: `modulo-a1-m1-content.json`. Montar o JSON importável: `python3 fr/scripts/challenges_import/build_modulo.py` (gera `lote-a1-m1.json` e o resumo legível `lote-a1-m1.md`, com todo o conteúdo: 8 Ouça e traduza, 9 Acentuação, 5 Expressões; teto por tipo no builder; "ç" não conta como acento, todos com `moduleId`/`unitId`/`theme`, status `needs_review`).
- Áudio: Actions > **Áudio TTS** > modo `desafios-a1-m1` (branch `main`).
- Importar: painel admin > Desafios > **📥 Importar JSON** (colar o conteúdo de `lote-a1-m1.json`), depois revisar e publicar.
- Na app: o módulo ganha a unidade opcional "Desafios do Módulo 1" (fim do módulo, depois do Ponto de verificação); contas Free veem o cadeado, contas Premium e o admin abrem os desafios do módulo.

### Módulos 2 a 6 (A1)

Mesmo formato do Módulo 1: `modulo-a1-mN-content.json` -> `python3 fr/scripts/challenges_import/build_modulo.py fr/scripts/challenges_import/modulo-a1-mN-content.json` gera `lote-a1-mN.json` + `lote-a1-mN.md` (resumo legível). Áudio de todos de uma vez: Actions > Áudio TTS > modo `desafios-a1-todos`.

### Complete a frase (gramática) -- type `cloze_grammar`

- Fonte: `modulo-a1-m6-cloze.json` (passé composé: auxiliar être/avoir e particípio). Montar: `python3 fr/scripts/challenges_import/build_cloze.py` -> `lote-a1-m6-cloze.json` (importável) + `lote-a1-m6-cloze.md` (revisão). Valida 2 a 4 opções por lacuna `___`, resposta entre as opções, explicação e tradução pt-BR obrigatórias, e avisa palavras fora do vocabulário visto ATÉ o módulo (cumulativo no nível). Sem áudio.
- **Antes de importar**: aplicar `fr/scripts/supabase_migrations/007_allow_cloze_grammar_type.sql` (amplia o CHECK de `type` da tabela `challenges`; tem DROP de constraint, então vai pelo SQL Editor, Staging e depois produção). Sem ela o INSERT falha.
