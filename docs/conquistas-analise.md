# Conquistas: análise do que existe (2026-10-13)

Base para a autora definir o critério das conquistas (o que fica, muda ou sai) e o critério de quais recebem
"Parabenizar". Nada foi alterado ainda. Números da produção em 2026-10-13: 33 contas com progresso salvo.

Fontes no código: `BADGES` em `fr/app.js` (~linha 1776) e `zh/app.js` (~linha 1869); textos em
`shared/i18n/pt-BR.js` (`badge.*`); especiais em `shared/profile.js` (`SPECIAL_BADGES`) e na tabela
`badge_catalog` (concedidas à mão). Conquista ganha fica em `earned_badges` (uma linha por pessoa, idioma e
conquista): **nenhuma conquista se repete**; cada uma é ganha uma vez por idioma.

## 1. Nos dois sites (mesmo id, mesma regra)

| Conquista | Regra | fr (pessoas) | zh (pessoas) | Observação |
|---|---|---|---|---|
| 🌱 Primeiro Passo | 1ª revisão de cartão | 10 | 2 | quase todo mundo ganha no 1º dia |
| 🔥 3 Dias Seguidos | sequência ≥ 3 | 4 | 1 | sequência agora é da conta (075 de outra conversa), mas a conquista é por idioma |
| 🥐/⛩️ Uma Semana! | sequência ≥ 7 | 0 | 0 | ninguém tem ainda; ícone diferente por site |
| ⭐ 100 XP | XP total ≥ 100 | 12 | 3 | a mais comum |
| 🌟 500 XP | XP total ≥ 500 | 11 | 3 | quase tão comum quanto a de 100 |
| 💪 100 Revisões | 100 revisões | 1 | 1 | rara hoje |
| 🧭 Exploradora | usou revisão, revisão rápida e jogo da memória | 3 | 1 | nome só no feminino (o catálogo do banco usa "Pioneiro/a") |
| 🎧 Ouvido Treinado | tocou áudio 100 vezes | 11 | 2 | comum; mede clique, não aprendizado |
| 🔄 De Volta ao Jogo | voltou a estudar 2 a 4 dias depois de parar | 6 | 2 | premia ter parado; regra por idioma |
| 🧩 Multitarefa | 5 formatos de exercício no mesmo dia | 11 | 3 | comum (uma lição já passa por vários formatos) |
| 🌙 Fim de Semana | estudou sábado e domingo seguidos (últimas 2 semanas) | 1 | 0 | |

## 2. Só no francês (ou com regra diferente no francês)

| Conquista | Regra no fr | Pessoas | Diferença para o zh |
|---|---|---|---|
| 📖 Unidade 1 Completa | unidade A1-1 concluída **pelas lições** (pular pelo ponto de verificação não conta) | 12 | no zh conta de qualquer jeito |
| 🗼 Metade do Caminho (`unit_half`) | metade das unidades do A1 pelas lições | 4 | no zh é outro id (`unit_7`) e conta qualquer conclusão |
| 🇫🇷 Nível A1 Completo (`unit_all`) | todas as unidades do A1 pelas lições | 1 | no zh é `unit_14` |

Desafios e Ditados só existem no francês e hoje não dão nenhuma conquista.

## 3. Só no chinês (ou com regra diferente no chinês)

| Conquista | Regra no zh | Pessoas | Diferença para o fr |
|---|---|---|---|
| 📖 Unidade 1 Completa | unidade 1 concluída (qualquer forma) | 3 | fr exige as lições |
| 🏮 Metade do Caminho (`unit_7`) | metade de **todas** as unidades do curso (hoje = HSK 1) | 1 | id e regra diferentes; quando entrar o HSK 2, "metade" passa a ser de tudo, não do HSK 1 |
| 🐉 HSK 1 Completo (`unit_14`) | **todas** as unidades do curso | 0 | mesmo problema: com HSK 2, o nome "HSK 1 Completo" fica errado |

## 4. Especiais (não vêm de estudo)

- No código (`SPECIAL_BADGES`): 👑 Fundadora, 🧪 Beta Tester.
- No banco (`badge_catalog`, concedidas pela autora/professora): 📣 Embaixador/a, 🌱 Pioneiro/a, 🎓 Aluno/a da Prof. Brune.
- A migration 077 (outra conversa) acrescenta conquistas criadas por professoras.

## Achados para a decisão

1. **Nada se repete**: o critério de parabéns tem de ser raridade/esforço, não repetição.
2. **Comuns demais**: 100 XP, 500 XP, Ouvido Treinado, Multitarefa, Unidade 1 e Primeiro Passo estão com 10 a 12 das
   33 contas no francês. São boas para começar, mas não marcam esforço.
3. **Mesma ideia, ids e regras diferentes**: Metade do Caminho e nível completo (`unit_half/unit_all` x `unit_7/unit_14`),
   e Unidade 1 (lições x qualquer forma). Os textos de uma conquista também mudam por site.
4. **Sequência**: virou da conta, mas 3 Dias, Uma Semana, De Volta ao Jogo e Fim de Semana continuam por idioma, e se
   sobrepõem aos novos marcos de sequência (5, 10, 15... 365).
5. **Nome com gênero fixo**: "Exploradora" (o banco já usa "/a").
6. **Chinês e níveis futuros**: "HSK 1 Completo" e "Metade do Caminho" contam o curso inteiro, não o HSK 1.
