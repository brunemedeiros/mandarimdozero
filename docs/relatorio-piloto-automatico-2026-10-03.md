# Relatório do piloto automático — 03/10/2026

## 1. Resumo
Implementei as Fatias 2 e 3 dos Ditados (francês), na branch `claude/friendly-hamilton-u4ssl2`.
- **Fatia 2:** o app salva melhor nota, tentativas e palavras para revisar de cada ditado, e explica o tipo de erro em português.
- **Fatia 3:** o app tem um botão "ouvir frase" para cada frase na correção. Também há o script e o modo do workflow para gerar os mp3 por frase.
- Um verificador independente aprovou o trabalho. Corrigi o achado médio e dois baixos.
- **Os mp3 por frase ainda não existem.** Gerá-los usa a chave do Google e depende de você (ver Pendências). Enquanto isso, o botão usa a voz do navegador.

Interpretação adotada: "próximas etapas" = as Fatias 2 e 3 listadas no CLAUDE.md. Critério de pronto: testes passando, sem regressão da Fatia 1, app funcionando sem os mp3 por frase, nada que gere custo executado.

## 2. Decisões que tomei por você
| Pergunta | Escolha | Motivo | Como reverter |
|---|---|---|---|
| Quais erros explicar? | Só 3 tipos: homófonos conhecidos, concordância (mesmo radical, só muda -e/-s/-es/-x) e "outro" | Evitar explicação gramatical errada | Editar `DICT_HOMOPHONE_GROUPS` e `classifyDictationError` em `fr/app.js` |
| Erro de digitação parecido com concordância (pase/pas) | Texto com ressalva ("pode ser só um deslize de digitação"); nomes próprios (maiúscula) não entram | Apontado pelo verificador | Reverter o último commit |
| `wrongWords` inclui acento/hífen leves? | Sim, além de trocas e faltas | O aluno também deve revisar essas palavras | Remover o ramo `x.light` em `dictationWrongWords` |
| Onde guardar o progresso | `STATE.dictations` dentro do jsonb `progress.data`, sem migration | Mesmo padrão de `checkpointProgress` | Apagar o campo; saves antigos continuam válidos |
| Nome do mp3 por frase | `dictation-<id>-s<N>.mp3` (posição) | Simples e igual ao padrão do guiado | Ver pendência de hash |
| Se o mp3 por frase falta | Cai para a voz do navegador; sem voz, botão desabilitado | O app não pode quebrar antes de gerar os arquivos | Remover a seção "Ouça frase por frase" em `renderDictationResult` |
| Regra de dividir frases | Mesma regra em Python e JS, comparadas nos 21 ditados e em textos extras | Evitar que o botão toque a frase errada | — |

## 3. Pendências que precisam de você
1. **Gerar os áudios por frase** (95 frases, 2.960 caracteres, cerca de 0,3% da cota grátis de 1M/mês): Actions > "Áudio TTS" > modo `ditados-frases`. Não rodei por usar a chave `GCP_TTS_KEY` e gerar custo. Ele refaz todas as frases (usa `DICTATION_FORCE=1`).
2. **Abrir o PR e fazer o merge**, se aprovar. Não abri por iniciativa própria (regra do projeto).
3. **Rotacionar a chave de TTS** (pendência antiga do CLAUDE.md: a chave foi colada em chat).
4. Depois de gerar os mp3, conferir ouvindo uma frase no celular. O caso "mp3 existe e toca" só pode ser testado após a geração.

## 4. O que foi alterado
- `fr/app.js`: `classifyDictationError`, `updateDictationRecord`, `sanitizeDictationRecord`, `dictationWrongWords`, `splitDictationSentences`, `dictationSentenceErrorFlags`, player de frase, persistência em `STATE.dictations`.
- `fr/index.html`: CSS novo (só tokens de cor que já existiam).
- `fr/scripts/dictation_sentences.py`, `gen_dictation_sentence_audio.py`, `test_dictation_sentences.py` (novos).
- `.github/workflows/audio-tts.yml`: modo `ditados-frases`.
- `fr/scripts/test_answer_validation.js` e `tests/ditado/test_playwright.js`: testes novos; o cabeçalho copiado do teste de desafios foi corrigido.
- Commits: `f3d44f4`, `f89d3e2`, `a7fd3ed` e o commit de correções do verificador. Nenhuma migration; `zh/`, `shared/` e `dictations.js` não foram tocados.

## 5. Problemas encontrados
- O teste Playwright gravava screenshot em `/dev/null` e quebrava; agora só salva com `SHOT_DIR`.
- Pausar o áudio guiado ao tocar uma frase: usar `stopDictationAudio()` quebraria o player, então só pausa.
- Achados baixos **não corrigidos** (aceitos): a mesma palavra errada em dois lugares gera duas notas (já era assim); erro de rede passageiro no mp3 vale até o fim da sessão; o mp3 é nomeado pela posição, então se um ditado for editado é preciso regenerar (o workflow já usa FORCE; um hash no nome seria o ideal no futuro); duas abas salvando ao mesmo tempo podem sobrescrever o progresso, como no resto do app.
- Corrigidos: chave `__proto__` no save, voz do navegador tocando junto com o áudio guiado, explicação de concordância errada para erros de digitação.

## 6. Divisão do trabalho
- sonnet: mapear o código dos Ditados.
- opus: Fatia 2 em `fr/app.js`.
- sonnet: script de áudio por frase, modo do workflow e testes Python.
- opus: interface do áudio por frase.
- opus: verificação independente (aprovou).
- Eu: orquestração, correções finais, commits e este relatório.

## Testes finais
`test_answer_validation.js` 86/86; `test_dictation_sentences.py` 202/202; `test_spoken_text.py` 35/35; Playwright dos ditados 56/56.
