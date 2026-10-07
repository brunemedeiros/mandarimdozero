# Histórico: pendências pós-paywall e migração de Decks antigos

> Trazido da branch `claude/pendencias-pos-paywall` (ainda não mergeada na main) em 2026-10-07, texto original.

## ⏰ LEMBRETE: pendências para DEPOIS que o paywall for ligado (registrado em 2026-10-07)
Pedido da autora: guardar aqui o que só faz sentido (ou só é seguro) depois de ligar o paywall, para ela lembrar. Quando o paywall for ligado, rodar esta lista na ordem.

**Desafios (fr)**
1. Migration `fr/scripts/supabase_migrations/007_allow_cloze_grammar_type.sql`: **já aplicada pela autora** (2026-10-07).
2. Migration `008_challenges_server_side_premium_gating.sql`: **NÃO aplicar antes do paywall.** Ordem: aplicar os passos 1-2 -> publicar o código com `CHALLENGES_SERVER_GATING=true` e `CHALLENGE_PAYWALL_ENABLED=true` (`fr/app.js`) -> só então o passo 3 (restringe a leitura pública de `challenges`). Aplicar primeiro no Staging; sem `DROP` no passo 1-2 deve ir pela ferramenta, o passo 3 conferir antes.
3. Regra Free dos Desafios: **1 atividade por categoria, no total** (de preferência a do 1º módulo). Isso substitui o "1 ditado Free por módulo" (o Free do Ditado cai de 6 para 1): ajustar o campo `free` em `fr/dictations.js` e nos lotes de Desafios.
4. Desafios do chinês: o zh não tem aba de Desafios nem módulos; decidir os módulos e criar a aba antes de aplicar a regra Free x Premium ao zh.

**Premium / cobrança (nada disto existe ainda)**
5. Não há Stripe nem checkout: o modal de aviso Premium só convida a entrar em contato. Decidir o fluxo de pagamento junto do paywall.
6. TTS por Field (Google) é só Premium e tem cota de 300/mês por conta: conferir se a cota combina com o preço do plano.
7. Limite de 20 cartões do plano grátis é só trava de tela (duas abas abertas ao mesmo tempo podem passar de 20). Se virar argumento de venda, impor no banco (trigger em `own_flashcards`).
8. Premium tem cartões ilimitados e formatos ricos (imagem/áudio/múltipla escolha/completar frase); o grátis só Normal + upload/link. Rever essa matriz quando definir os preços.

**Conferir no dia de ligar**
9. Com o paywall ligado, testar com uma conta Free e outra Premium: lista de Desafios (cadeado), Ditados, Decks públicos (importar é Premium), Meus Cartões (formatos), TTS.
10. A RLS atual (`challenges_public_read_published`) deixa qualquer um ler todos os desafios publicados pela API: só fecha com o passo 3 da 008.

## Decks: migração dos cartões antigos e regra de 1 professora por aluno (2026-10-07)
- **Migração feita em produção (autorizada pela autora)**: os 5 `own_flashcards` e os 5 `teacher_flashcards` com `deck_id` NULL foram colocados no `personal_root` do dono / `teacher_root` do aluno (criados antes com `ensure_user_decks`/`ensure_teacher_decks`). Um único bloco transacional, só `deck_id` mudou: hash de id/front/back/fields/modo/tags/revision/status idêntico antes e depois; hoje 0 cartões sem Deck.
- **Decisão de produto: um aluno não pode ter duas professoras** (por idioma). Hoje não existe nenhum caso (0 alunos com 2 vínculos ativos no mesmo idioma), então não há raízes "Cartões da professora" duplicadas. Ainda NÃO imposto no banco; se for impor, índice único parcial em `teacher_students (student_id, language_app_key) where status='active'` (migration nova, com autorização).
