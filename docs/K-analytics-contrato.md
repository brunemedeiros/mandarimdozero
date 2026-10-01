# Fase K — Analytics: contrato implementado (K.2)

Implementação: `shared/analytics-metrics.js` (puro, sem UI/rede/estado, ainda
não carregado nas páginas — a UI vem em K.3+). Testes: `tests/k2/test_analytics_metrics.js`.

## Unidades
- **CardInstance** = unidade estrutural (estudo, revisão, FSRS, contagens N/L/R/Devido).
  Reverso = 2 cartões; Cloze com N marcas = N cartões. A UI chama isto de "cartão".
- **Note** = unidade pedagógica (conteúdo, estudado, força). Irmãs pertencem ao mesmo
  conteúdo. Na Study Trail a Note é a "palavra".
- **Deck** = organização/escopo; esta camada não cria semântica paralela.
- A CardInstance tem identidade e estado FSRS persistido (em `progress`, por id); sua
  estrutura (Note, direção, Deck) é reconstruída a cada carga.

## Identidade da Note (nunca por sufixo de id nem por direção)
study = `unitId:vocabIdx`; teacher/self = `rowId`. Sem esses campos o card vira Note
própria (não funde por sufixo). Ids `-b`, `-cN`, `-rN` não participam.

## Métricas
| Métrica | Unidade | Função |
|---|---|---|
| Cartões, Novos, Aprendendo, Review (estado), Para revisar (Review vencido), Devidos (não-New vencido) | CardInstance | `structuralCounts` |
| Conteúdos, Estudados, Não iniciados | Note | `contentMetrics` |
| Força (não iniciada/fraca/medium/forte) | Note | `noteStrengthBucket` |
| Palavras aprendidas | Note, só Study Trail | `studyTrailWordProgress` |
| Conteúdos estudados | Note, Teacher **ou** Self | `ownContentProgress` |
| Arquivados (informativo) | CardInstance e Note | `archivedCounts` |
| Resumo por origem | ambas, isoladas por origem | `analyticsSummaryByOrigin` |

## Regras
- N/L/R vêm de `cardStudyBucket` (K1, fonte única). New = sem histórico (`reps===0`);
  Learning = learning+relearning; "Review" é estado, **não** sinônimo de Devido.
- Devido = não-New com `due <= agora`; New nunca é devido por `due=0`.
- 48h é regra de notificação do cron (K.0-C), não existe nesta camada.
- Estudado = alguma irmã com `reps>0`. Força = mais fraca entre as irmãs **estudadas**;
  nenhuma estudada = `not_started` (nunca "fraca"). Irmã New não rebaixa.
- Palavras aprendidas: denominador = curso inteiro (ou `courseWordTotal`), só Study Trail.
- Arquivados Teacher/Self ficam fora de numeradores/denominadores ativos.
- Sem total unificado da conta; cada origem é calculada isoladamente.
- Elegibilidade: o chamador passa o universo elegível; esta camada só exclui Teacher/Self
  arquivados e escopa por origem (não reimplementa o gate de lição).

## Fora desta fase
- Histórico por Note e "última atividade" (`firstLearnedDate`/`lastReview` são por
  CardInstance; `lastReview` de cartões migrados é aproximado).
- Rótulos de UI ("Pendentes agora" etc.) e uso nas telas: K.3+.
- `vocabStrengthBuckets`/`wordLevelStrengthBuckets` (K2-E) permanecem inalteradas:
  ainda mapeiam "nenhuma estudada" para fraca; migrar para `not_started` é K.3.
