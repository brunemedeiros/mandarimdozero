# Medição do tempo real das lições (produção, leitura agregada, 2026-10-29)

Autorização da dona: opção a) ("medir antes de decidir"), 2026-10-29. Leitura **só de contagens e medianas**, sem identificar ninguém, de `usage_events` (produção `eigjocalzwamisgqilhg`), eventos `lesson_complete` / `vocab_lesson` de contas
com `actor_type='user'` (a conta admin fica fora). Nenhuma escrita.

Método: a duração de uma lição é a **diferença de horário entre dois `lesson_complete` seguidos da mesma conta, da mesma sessão e da mesma unidade**, entre 20 s e 30 min (acima disso é pausa). A 1ª lição de cada sessão não tem como ser medida.

## Resultado geral (101 pares válidos; 5 pares acima de 30 min descartados)
| Mediana | p25 | p75 | p90 |
|---|---|---|---|
| **108 s (1 min 48 s)** | 79 s | 187 s | 285 s |

## Por unidade e lição (só combinações com 3 pares ou mais; `lidx` = índice da lição concluída)
Mediana típica de **1 a 3 minutos** por lição (50 a 196 s); a de maior mediana foi "Cumprimentar e se despedir" (`A1-1`) lição 2 (196 s) e `A1-6` lição 2 (196 s). Amostras de 3 a 5 pares por combinação: indicativo, não conclusivo.

## Leitura e limites
- Mediana de ~1 min 50 s por lição de vocabulário; p75 de ~3 min. O código previa de 1,2 a 3,9 min (lições 1 e 2) e 3 a 9 min (a lição com diálogo): **bate com o piso e o meio da faixa**, longe dos ~7 a 10 min por lição implícitos nos tempos do mapa.
- Não mede: Revisão da unidade, gramática, Ponto de verificação do módulo (sem evento hoje), refazer lição, e a 1ª lição de cada sessão. Quem aparece aqui continua estudando na sessão (viés de quem não desiste).
- Amostra pequena: 43 contas com progresso, 26 com francês.
