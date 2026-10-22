# Etapa 5 do plano "Voz da Prof. Brune": auditoria de Premium e do limite do plano grátis

Data: 2026-10-19. Só leitura: código da `main` (commit `33e1897f`) e produção (`eigjocalzwamisgqilhg`, só SELECT).
Nada foi alterado no código nem no banco.

Resumo em 4 linhas:
- Existem **duas fontes de verdade que não conversam**: a tabela "O que cada plano libera" (Admin > Planos,
  `role_permissions`) e o código, que quase sempre lê `profiles.plan_tier` (espelho: `premium` só para Premium Basic/Pro,
  Professora e admin) ou o vínculo com a professora. Mexer na tabela do Admin só muda 4 coisas de verdade.
- O **aluno vinculado** é o caso mais divergente: a tabela diz que ele tem tudo do Premium Basic (formatos ricos, áudio
  automático, Desafios Premium, importar Deck público), mas o código só lhe dá cartões ilimitados, Minhas aulas,
  Material de apoio e o contador de cópias do Deck.
- Bloqueios **ligados hoje**: limite de 20 cartões (só na tela), formatos ricos e áudio automático (só na tela),
  Decks públicos (no servidor), contador de cópias (no servidor), papel Professora e Banco de Revisão (no servidor).
  **Desligados**: Desafios do Módulo, Ditados Premium, Jogos da Conjugação, pular unidades.
- Produção: 29 contas; só 1 tem Premium (a autora: admin + Professora + Premium Basic); 14 alunos vinculados
  (12 francês, 2 português), todos com `plan_tier = 'free'`; nenhum Premium Pro; nenhum plano com validade.

---

## 1. O que o código faz hoje

Legenda: ✅ libera, ❌ não libera, "tela" = trava só no navegador, "servidor" = RLS/RPC barra.
"Premium" = `isPremium()` (`shared/roles.js:164`), que lê `profiles.plan_tier` via `effectivePlanTier()`
(`shared/roles.js:151`). O espelho `plan_tier` é gravado por `_sync_profile_mirror` (075, `shared/supabase_migrations/075_account_roles_and_permissions.sql:164-172`):
vira `premium` para admin, Premium Basic, Premium Pro **e Professora**; aluno vinculado continua `free`.
A admin, com Admin Mode desligado, vê a interface como grátis (`shared/roles.js:152-155`); o servidor continua a tratando como Premium.

| Recurso | Grátis | Premium Basic | Premium Pro | Aluno vinculado | Professora / admin | Bloqueio hoje | Onde está a regra |
|---|---|---|---|---|---|---|---|
| Cartões próprios: quantidade | 20 CardInstances ativas **por curso** (fr e zh contam separado) | ilimitado | ilimitado | ilimitado | ilimitado | LIGADO, só tela (2 abas passam de 20; nada no banco) | `shared/my-flashcards.js:34` (`FREE_OWN_FLASHCARD_LIMIT = 20`), `:249-264`; `shared/roles.js:124-133` (vínculo), `:173-176` (`hasUnlimitedOwnCards`); `shared/deck-engine.js:261` (conta CardInstances); `shared/own-flashcards.js:28` (por idioma); RLS `own_flashcards_owner_all` só confere o dono |
| Importação (arquivo/link, Anki, copiar do perfil público) | corta no teto de 20 e avisa | sem corte | sem corte | sem corte | sem corte | LIGADO, só tela | `shared/my-flashcards.js:1154,1181`; `shared/anki-import-ui.js:128,364,461`; `shared/public-profile.js:467,597,610` |
| Tipos de cartão (Normal com reverso, Múltipla escolha, Digite a resposta, Completar a frase) | só Normal | ✅ | ✅ | **❌ (só Normal)** | ✅ (Professora pelo espelho; painel da professora não tem trava) | LIGADO, só tela | `shared/admin-flashcards.js:278` (`cardTypeUIMetaForEntitlement`); `shared/my-flashcards.js:255,309,639` |
| Áudio por campo: gerar por texto (TTS) e gravar no microfone | só upload e link | ✅ (cota 300/mês) | ✅ (300/mês) | **❌** | ✅ (admin sem cota) | LIGADO, só tela. O servidor (`tts-generate`) não confere plano: só dono da linha + cota `TTS_MONTHLY_LIMIT` (padrão 300) para qualquer conta | `shared/my-flashcards.js:674,778` (`allowedAudioOrigins`); `supabase/functions/tts-generate/index.ts:296-360`; `tts_core.mjs:252` |
| Imagem/áudio por upload ou link | ✅ | ✅ | ✅ | ✅ | ✅ | sem bloqueio | `shared/my-flashcards.js:674` |
| Desafios do Módulo (Ouça e traduza, Acentuação, Expressões, Complete a frase), só fr | ✅ (rotulado Premium) | ✅ | ✅ | ✅ | ✅ | DESLIGADO (`CHALLENGE_PAYWALL_ENABLED = false`, `CHALLENGES_SERVER_GATING = false`). Se ligar: só `plan_tier='premium'` ou admin; **aluno vinculado perderia** | `fr/app.js:7179-7205`; `shared/challenge-policy.js:22-25`; RLS `challenges_public_read_published` deixa qualquer um ler |
| Ditados Premium (`free: false`), só fr | ✅ (rotulado Premium) | ✅ | ✅ | ✅ | ✅ | DESLIGADO (mesma flag); se ligar, aluno vinculado perderia | `fr/app.js:7192,7198-7206`, `fr/dictations.js` (campo `free`) |
| Jogos da Conjugação, só fr | ✅ (com cadeado 🔒 Premium no cartão) | ✅ | ✅ | ✅ | ✅ | DESLIGADO (`CONJ_GAMES_PAYWALL_ENABLED = false`); se ligar, aluno vinculado perderia e a janela que abre é a dos **Desafios do Módulo** | `fr/app.js:5617-5621`; `shared/conj-games.js:34,49-50` |
| Prática da Conjugação | ✅ | ✅ | ✅ | ✅ | ✅ | grátis por decisão | `docs/historico/14-*` item 11 |
| Pular unidades (Ponto de verificação), só fr | ✅ | ✅ | ✅ | ✅ | ✅ | DESLIGADO (`TRAIL_SKIP_PAYWALL_ENABLED = false`). Se ligar: Premium **ou** aluno vinculado ou admin | `fr/app.js:4576-4593,4639,4791,1186,1347-1353`. zh não tem Ponto de verificação (`zh/app.js:1326` nunca chega a chamar a função, `moduleId` é sempre `null`) |
| Abrir / importar Deck público | ❌ | ✅ | ✅ | **❌** | ✅ | LIGADO, servidor (RPCs leem `plan_tier = 'premium'`) | produção: `get_public_deck`, `get_public_deck_notes`, `get_public_deck_media_manifest`, `check_public_deck_duplicates`, `copy_public_deck`; arquivo `shared/supabase_migrations/079_public_deck_copies.sql:69`; tela `shared/public-deck.js:262,332,416` |
| Publicar Deck / perfil público | ✅ | ✅ | ✅ | ✅ | ✅ | grátis | `docs/plano-professora-privacidade.md:227,254` |
| Ver quantas pessoas copiaram meu Deck | ❌ | ✅ | ✅ | ✅ | ✅ | LIGADO, servidor (único recurso de aluno que segue a tabela) | `get_public_deck_copy_count` usa `has_permission('public_deck_copy_count')` (`079_public_deck_copies.sql:285`); `shared/public-deck.js:622` |
| Minhas aulas / Material de apoio / Mural | ❌ | ❌ | ❌ | ✅ | (são da professora) | LIGADO, servidor (vínculo) + tela (`hasPermission`) | `shared/teacher-panel.js:305-306`; RPCs `get_my_class_log_entries`, `mural_*` |
| Painel da professora, convidar aluno, Aulas, Mural da turma | ❌ | ❌ | ❌ | ❌ | ✅ | LIGADO, servidor pelo **papel** `teacher` (`is_teacher()`), não pela tabela | `shared/permissions.js:40-43` (`isTeacherUser`); 076 |
| Banco de Revisão | ❌ | ❌ | ❌ | ❌ | ✅ | LIGADO, servidor (`is_teacher()` **e** `has_permission('review_bank')`) | `shared/review-bank.js:97`; `shared/teacher-panel.js:32`; 081/082/096 |
| Idioma do site, perfil privado, amigos, ranking, conquistas | ✅ | ✅ | ✅ | ✅ | ✅ | grátis | `.claude/rules/i18n.md`; `docs/plano-professora-privacidade.md:50` |

Observações:
- Premium Pro existe no banco e na tela de Planos, mas o código não o distingue de Basic em lugar nenhum.
- Professora já ganha tudo do Premium pelo espelho `plan_tier` (decisão de 2026-10-07: "Professora é Premium automaticamente").
- Não existe como a pessoa pedir Premium dentro do site: só a admin dá o plano em Admin > Planos (`admin_grant_role`).

## 2. Produção (só SELECT, 2026-10-19)

Contas e planos:

| O quê | Quantas |
|---|---|
| Contas (`profiles`) | 29 |
| `plan_tier = 'premium'` | 1 (a autora) |
| `plan_tier = 'free'` | 28 |
| `account_roles`: admin / teacher / premium_basic / premium_pro | 1 / 1 / 1 / 0 (as três da autora; nenhuma com validade) |
| Alunos com vínculo ativo | 14 (12 francês, 2 português); nenhum tem Premium |

Tabela de permissões (`role_permissions`, a mesma da tela Admin > Planos; "on" = ligado sem limite):

| Permissão | Grátis | Aluno | Premium Basic | Premium Pro | Professora | O código respeita? |
|---|---|---|---|---|---|---|
| Cartões próprios (quantidade) | 20 | on | on | on | on | **Não**: o 20 está fixo no código; mudar o número na tela não muda nada |
| Formatos ricos | off | on | on | on | on | **Não**: código usa `plan_tier`; aluno fica sem |
| Áudio automático por campo (por mês) | off | 300 | 300 | 300 | 300 | **Não**: tela usa `plan_tier`; servidor usa `TTS_MONTHLY_LIMIT` igual para todos |
| Importar Deck público | off | on | on | on | on | **Não**: servidor usa `plan_tier`; aluno é barrado |
| Ver quantas pessoas copiaram meu Deck | off | on | on | on | on | Sim (servidor) |
| Desafios Premium | off | on | on | on | on | **Não**: código usa `plan_tier` (e o bloqueio está desligado); a 008 também usaria `plan_tier` |
| Pular lições da trilha | off | on | off | off | off | **Não**: código deixa Premium pular (e o bloqueio está desligado) |
| Ver Minhas aulas | off | on | off | off | off | Sim (tela; servidor pelo vínculo) |
| Ver Material de apoio | off | on | off | off | off | Sim (tela; servidor pelo vínculo) |
| Painel da professora | off | off | off | off | on | Não lê a célula: decide pelo papel `teacher` |
| Analytics do aluno | off | off | off | off | on | Não lê a célula: decide pelo papel/vínculo |
| Mural para a turma | off | off | off | off | on | Não lê a célula: RPCs `mural_*` pelo papel |
| Banco de Revisão | off | off | off | off | on | Sim (servidor) |

## 3. Divergências (tabela do Admin x código x textos)

1. **Aluno vinculado**: a tabela promete formatos ricos, áudio automático, importar Deck público e Desafios Premium;
   o código não dá nenhum dos quatro (todos leem `plan_tier`). Quando o paywall dos Desafios/Jogos for ligado, os 14
   alunos perdem o acesso, contra a decisão de 2026-10-08 ("alunos ganham só o nível Premium Basic").
2. **Pular unidades**: tabela = só aluno; código = Premium ou aluno; textos = "Premium (ou alunos da professora)".
3. **Células que não fazem nada**: own_cards_limit (número), rich_card_formats, tts_monthly_quota, public_deck_import,
   challenges_premium, trail_skip_locked, teacher_panel, teacher_student_analytics, teacher_board. A tela diz
   "A mudança vale na hora" (`plans.sub`, pt-BR:2621), o que só é verdade para 4 das 13 linhas.
4. **Rótulo da tabela** "Formatos ricos (imagem, áudio, múltipla escolha, completar frase)": imagem e áudio por upload
   são grátis; o que é Premium é o tipo de cartão, o áudio gerado por texto e a gravação no microfone.
5. **Premium Pro**: aparece como plano, igual ao Basic em tudo; ninguém tem.
6. **Jogos da Conjugação**, quando ligar: abre a janela "Desafios do Módulo" (texto de outro recurso).
7. **Migration 008 (gating dos Desafios no servidor)**: `is_challenges_premium()` usa `p.id = auth.uid()`, mas
   `profiles` não tem coluna `id` (tem `user_id`): do jeito que está, a migration falha ao ser aplicada. Também ignora
   aluno vinculado. Corrigir antes de ligar o paywall.
8. **"profbrune"**: os avisos mandam falar com "a administração (profbrune)", mas o @ da autora é `prof.brune`; não
   existe conta `profbrune` e não há link, e-mail nem botão de contato.
9. **"Plano grátis" mostrado ao aluno vinculado**: o aviso dos tipos de cartão (`myFlashcards.free.hint`) aparece para
   o aluno (que não tem `plan_tier` Premium), falando de "plano grátis".
10. Limite de 20 é **por curso** (fr e zh contam separado), mas o texto diz "sua conta pode possuir apenas 20".
11. Rótulo `perm.review_bank` não existe no catálogo: no site em inglês a tela de Planos mostra "Banco de Revisão (...)"
    em português (só a admin vê).
12. Cópias antigas do catálogo sem uso: `premium.challenges.*` (pt-BR:74-76, en:63-65), `fr.challenges.lockedModuleChallenges`,
    `fr.challenges.lockedPremiumBtn`, `myFlashcards.badge.premium`, `admin.premium.title/hint/make/...` (pt-BR:1401-1411).
    A janela usa as chaves do `CHALLENGE_I18N` (`prem.modal.*`).

## 4. Textos visíveis ao aluno sobre Premium e limite grátis

"Aparece hoje?" considera os bloqueios atuais. Veredito: VERDADEIRO / FALSO / DEPENDE (de decisão da Etapa 1) / SELO
(rótulo de regra já decidida, sem bloqueio; a Etapa 5 manda manter).

| # | Onde (pt / en) | Texto (pt) | Aparece hoje? | Veredito |
|---|---|---|---|---|
| 1 | `fr/index.html:6302,6306-6307`; `fr/app.js:6962-6964` (en 7144-7146) | "🔒 Recurso Premium" / "Os Desafios do Módulo reforçam cada tema da trilha com Expressões, Ouça e traduza, Acentuação e Ditados extras." / "Eles fazem parte do plano Premium. Para ativar, fale com a administração (profbrune)." | Não (só com bloqueio ligado) | Benefício: DEPENDE (regra "1 atividade grátis por categoria" e aluno). Como ativar: **FALSO** (não existe "profbrune", não há canal). Usado também pelos Jogos: **FALSO** para os Jogos |
| 2 | `fr/app.js:1411` (`trail.premiumBadge`, pt-BR:340) | selo "Premium" na unidade Desafios do Módulo | Não | SELO |
| 3 | `fr/app.js:1414,1447`; pt-BR:691-692, 775-776; en:675-676, 759-760 | "1 ditado Free · 5 ditados e 4 desafios Premium", "N ditados Premium" | **Sim** | SELO; "1 ditado Free" por módulo vira FALSO quando valer a regra "1 por categoria no total"; "Free" sem traduzir no site em português |
| 4 | `fr/app.js:6081,7650,7666` (`tier.premium`/`tier.free`, 6786-6787 / en 6967-6968) | selos "Premium" / "Free" nos cartões de Ditado e de Desafio | **Sim** | SELO ("Free" no site em português) |
| 5 | `fr/app.js:6872-6875,6929` (en 7050-7053, 7120) | "🔒 +N desafios de módulo no Premium", botão "🔒 Premium", "🔒 Premium" no álbum | Não | DEPENDE (aluno) |
| 6 | `shared/conj-games.js:34`; `games.premium` pt-BR:733 / en:717 | "🔒 Premium" em cada Jogo | **Sim** | **FALSO hoje**: cadeado em jogo que abre para todos (o selo pode ficar, o cadeado não) |
| 7 | `fr/app.js:1186,1353,4591-4592`; pt-BR:333, 3738 / en:317, 3723 | "Pular unidades é do plano Premium (ou de alunos da professora). Pelo plano grátis, siga as unidades em ordem. 🔒" | Não | **FALSO** contra a tabela do Admin (Premium não pula); DEPENDE de decidir quem pula |
| 8 | `fr/index.html:6315,6319`, `zh/index.html:5374,5378`; pt-BR:79-80 / en:67-68 | "🔒 Limite do plano grátis" / "Você atingiu o limite de 20 cartões próprios ativos do plano grátis. Para criar mais, apague algum cartão, ou peça para sua professora te vincular. Alunos vinculados a uma professora têm cartões próprios ilimitados." | Sim (no 20º cartão) | VERDADEIRO (não cita Premium; "peça para te vincular": hoje a professora convida e o aluno aceita) |
| 9 | pt-BR:83 / en:69; `shared/my-flashcards.js:862` (reserva em pt) | "Este cartão geraria N cartões de estudo, mas restam só R no plano grátis." | Sim | VERDADEIRO |
| 10 | pt-BR:571 / en:555; `shared/deck-engine.js:332` (reserva em pt) | "... sua conta pode possuir apenas 20 no plano grátis ..." | Sim (importação) | VERDADEIRO com ressalva: o limite é por curso |
| 11 | pt-BR:429 / en:413 | "O arquivo tem N cartões, mas só os primeiros K cabem no plano grátis. Importar esses K?" | Sim | VERDADEIRO |
| 12 | pt-BR:3847 / en:3832; `shared/my-flashcards.js:1217` | "🔒 Importação limitada pelo plano grátis" | Sim | VERDADEIRO |
| 13 | pt-BR:3848 / en:3833; `shared/my-flashcards.js:1212` | "⭐ Com o Premium, seus cartões próprios são ilimitados." | Sim | VERDADEIRO (falta citar aluno vinculado) |
| 14 | pt-BR:3849 / en:3834; `shared/my-flashcards.js:1213` | "Para ativar, fale com a administração (profbrune). Você também pode excluir cartões..." | Sim | **FALSO** no "como ativar" ("profbrune" não existe; sem canal) |
| 15 | pt-BR:372 / en:356 | "🔒 Plano grátis — 12/20 cartões" | Sim | VERDADEIRO |
| 16 | pt-BR:374 / en:358 | "⭐ Premium — cartões ilimitados" | Sim (Premium) | VERDADEIRO |
| 17 | pt-BR:371 / en:355 | "✨ Aluno vinculado — cartões ilimitados" | Sim (aluno) | VERDADEIRO |
| 18 | pt-BR:377 / en:361; `shared/my-flashcards.js:312` | "🔒 No plano grátis você cria cartões do tipo Normal ... Premium desbloqueia Normal com reverso, Múltipla escolha, Completar a frase, Digite a resposta, além de gerar áudio por texto e gravar áudio pelo microfone." | Sim (grátis e aluno) | VERDADEIRO pelo código; DEPENDE para o aluno (tabela diz que ele tem) |
| 19 | pt-BR:3902 / en:3887 | "Importar Decks públicos é um recurso Premium." | Sim (erro) | VERDADEIRO (aluno também é barrado, contra a tabela) |
| 20 | pt-BR:3920 / en:3905 | "🔒 Entre na sua conta para ver os cartões. Abrir e importar Decks públicos é um recurso Premium." | Sim (sem login) | VERDADEIRO |
| 21 | pt-BR:3921 / en:3906 | "🔒 Abrir e importar Decks públicos é um recurso Premium. Você pode ver as informações do Deck acima." | Sim | VERDADEIRO |
| 22 | pt-BR:3934 / en:3919 | "Abrir Decks públicos é um recurso Premium." | Sim | VERDADEIRO |
| 23 | pt-BR:3330 / en:3314; `shared/public-deck.js:622` | "🔒 Com o Premium você vê quantas pessoas adicionaram este Deck." | Sim (grátis) | VERDADEIRO (aluno também vê) |
| 24 | pt-BR:1468 / en:1452 | "Você atingiu o limite mensal de áudios gerados..." | Sim (cota) | VERDADEIRO (300/mês, todos iguais) |
| 25 | pt-BR:3209 / en:3193 | "O Banco de Revisão faz parte do plano Professora." | Só professora sem a permissão | VERDADEIRO |
| 26 | pt-BR:3564 / en:3548 | "Só quem tem o plano Professora pode convidar alunos." | Raro | VERDADEIRO (Professora hoje é concessão da admin, não assinatura) |
| 27 | pt-BR:3620-3621, 3692 | "Criar conta grátis", "É grátis." | Sim | VERDADEIRO |

Textos da admin (não vistos pelo aluno): `plans.sub` "A mudança vale na hora" (só vale para 4 de 13 linhas, ver
divergência 3); `plans.grant.hint` "Sem cobrança por enquanto: o plano fica ativo até você tirar" (verdadeiro).

**Contagem**: dos textos que o aluno vê hoje, **2 prometem algo falso**: o cadeado "🔒 Premium" nos Jogos, que abrem
para todos (#6), e "Para ativar, fale com a administração (profbrune)" no aviso de importação cortada (#14). Outros
**3 falsos estão escondidos** e voltam quando os bloqueios forem ligados: o mesmo "profbrune" na janela Premium (#1), essa
janela aberta pelos Jogos com o texto dos Desafios do Módulo (#1) e "Pular unidades é do plano Premium" (#7), que
contradiz a tabela do Admin. Em todos os avisos, a única forma de ativar é "fale com a administração (profbrune)" (pt),
que em inglês aparece de dois jeitos: "contact the administrator (profbrune)" e "contact the admin (profbrune)".

## 5. Decisões já registradas (docs e git)

- 2026-09-08 (`05aebf6b`): toda feature nova responde "grátis x Premium"; sem infraestrutura de pagamento.
- 2026-09-23 (`e50b8d86`) e CONSOLIDAÇÃO-0: grátis cria só Normal + upload/link; Premium tem os outros 4 tipos, TTS e gravação.
- Fase 5.1 (`docs/historico/02-*`, ~linha 729): aluno vinculado não tem teto de cartões.
- 2026-10-01/02 (Decks públicos, 061-068): abrir/importar Deck de outra pessoa é Premium; publicar é grátis
  (reafirmado em `docs/plano-professora-privacidade.md:227,254`).
- 2026-10-04 (`docs/historico/09-desafios-ditados.md:37`): grátis tem **1 atividade por categoria no total** (de preferência
  do 1º módulo); o resto é Premium. Substitui "1 ditado Free por módulo" quando o paywall ligar.
- 2026-10-05 (`1e03efe0`, `c8b36355`): Premium sem teto de 20; Admin Mode ligado = Premium na interface.
- 2026-10-06 (`14413340`, `fr/app.js:4576`): "Free tem progressão linear; Premium e aluno vinculado podem pular" (flag desligada).
- 2026-10-07 (`docs/plano-professora-privacidade.md:26,96-107`): Professora é Premium automaticamente; permissões =
  soma dos papéis; "Premium" é o nome geral, Basic e Pro são faixas; matriz editável na aba de planos.
- 2026-10-08 (mesmo doc, 112-113): **alunos ganham só o nível Premium Basic** (upsell para Pro); Professora também é
  plano (assinatura ou concessão); o Premium de hoje vira Premium Basic.
- 2026-10-07 (`docs/historico/14-*`): sem Stripe; "o modal de aviso Premium só convida a entrar em contato"; decidir
  pagamento junto do paywall; cota TTS 300/mês a conferir com o preço; limite de 20 só de tela.
- 2026-10-14 (`aa068516`, `docs/historico/14-*` item 11): Jogos da Conjugação são Premium; a prática é grátis.
- 2026-10-18 (`.claude/rules/painel-design-system.md:30-38`): avisos Premium/Limite na estética "janela rica",
  "texto e ícones só com o que o produto faz de verdade".
- **Não achei** registro da Etapa 1 do plano "Voz da Prof. Brune" (nem em `docs/` nem no `git log --all`): não há
  decisão sobre o canal para pedir Premium, sobre a regra de pular para Premium, nem sobre alinhar a tabela ao código.

## 6. Perguntas para a dona (o que falta para a Etapa 1)

1. **Aluno vinculado tem tudo do Premium Basic?** A tabela e a decisão de 2026-10-08 dizem que sim; o código não.
   *Recomendação*: sim. Fazer o código ler a permissão (`my_permissions`/`has_permission`) em vez de `plan_tier`
   (tipos de cartão, áudio automático, Desafios, Jogos, Decks públicos), antes de qualquer bloqueio ser ligado.
   Assim os 14 alunos não perdem nada quando o paywall ligar.
2. **Quem pode pular unidades?** Tabela: só aluno. Código e textos: Premium ou aluno.
   *Recomendação*: Premium e aluno (é o que o texto já promete e é um benefício fácil de explicar); ligar a célula
   "Pular lições da trilha" para Premium Basic/Pro/Professora.
3. **Como a pessoa pede o Premium hoje?** "profbrune" não leva a lugar nenhum.
   *Recomendação*: um botão "Quero o Premium" na janela que abre o e-mail da professora (ou o WhatsApp), com o @ da
   pessoa já no texto; trocar "fale com a administração (profbrune)" por "Fale com a Prof. Brune" + o botão. Mesma
   frase nos dois idiomas e em todos os avisos.
4. **Premium Pro fica?** Hoje é igual ao Basic.
   *Recomendação*: esconder o Pro da tela de Planos até existir algo só dele; manter no banco.
5. **O limite de 20 é por curso ou por conta?** Hoje é por curso.
   *Recomendação*: manter por curso e dizer isso no texto ("20 cartões neste curso").
6. **Ao ligar os Desafios: vale "1 atividade grátis por categoria no total" (decisão de 2026-10-04)?**
   *Recomendação*: sim; até ligar, o selo diz só "Premium"/"Grátis" (trocar "Free" por "Grátis" no site em português)
   e não mostra a contagem "1 ditado Free" que vai mudar.
7. **Selo com cadeado em recurso aberto?** Jogos mostram "🔒 Premium" e abrem.
   *Recomendação*: com o bloqueio desligado, selo "⭐ Premium" sem cadeado; cadeado só quando bloquear de verdade.
   A janela dos Jogos ganha texto próprio (não o dos Desafios do Módulo).
8. **A tabela do Admin deve mandar no site?** Hoje 9 das 13 linhas não fazem nada.
   *Recomendação*: sim para as linhas de aluno/Premium (pergunta 1), com o número do limite lido do banco; as 3 linhas
   da professora (painel, analytics, mural) saem da tabela ou ficam só leitura ("vem do papel Professora"), e o
   subtítulo para de dizer "vale na hora" para o que não vale.
9. **Os benefícios que os avisos podem citar (Etapa 5)**, se as respostas acima forem as recomendadas: cartões
   próprios ilimitados; todos os tipos de cartão; áudio gerado por texto (300 por mês) e gravação pelo microfone;
   abrir e importar Decks públicos; ver quem copiou seu Deck; Desafios do Módulo e Ditados extras; Jogos da Conjugação;
   pular unidades pelo Ponto de verificação.
   *Recomendação*: aprovar exatamente essa lista e nenhum outro benefício nos cartões Premium e Limite.

Fora do escopo, mas para não esquecer antes do paywall: corrigir a 008 (`p.id` → `p.user_id`, e aceitar aluno);
limite de 20 e TTS sem trava no servidor (`docs/historico/14-*` itens 6 e 7).

## 7. Decisões da dona (2026-10-22)

1. **Aluno vinculado**: tem a versão mais básica do Premium, ainda a definir, e isso pode mudar (ex.: no futuro o aluno
   pode ter só a seção Aluno com os cartões da professora). Por isso a regra do aluno precisa ser fácil de mudar.
2. **Pular unidades**: Premium e aluno.
3. **Como pedir o Premium**: só por e-mail ("Fale com a Prof. Brune").
4. **Premium Pro**: fica para o futuro (lembrete: será implementado depois; hoje é igual ao Basic).
5. **Limite de cartões próprios**: 20 **por conta** (hoje o código conta por curso: mudar).
6. **Selo e cadeado**: perguntado se, com bloqueio ligado, é selo Premium + cadeado (resposta pendente; recomendação abaixo).
7. **Tabela do Admin mandar no site**: a dona pediu explicação antes de decidir.
8. **Benefícios citáveis nos avisos Premium** (por enquanto, a explorar depois): cartões ilimitados, todos os tipos de
   cartão, áudio por texto e gravação, Decks públicos, ver quem copiou seu Deck, Desafios do Módulo e Ditados extras,
   Jogos da Conjugação, pular unidades.

Decisões finais da dona (2026-10-22, aprovadas para implementação): (1) o site obedece à tabela Admin > Planos para
Grátis, Aluno, Premium Basic e Premium Pro; as linhas da Professora ficam pelo papel e só leitura na tela; (2) o Aluno
tem a versão básica do Premium, lida da coluna Aluno (nada fixo no código); (3) pular unidades: Premium e Aluno;
(4) limite de cartões próprios lido da tabela e contado por conta; (5) Premium Pro fica (igual ao Basic); (6) pedir o
Premium = botão "Fale com a Prof. Brune" (e-mail preenchido); (7) selo sem cadeado com bloqueio desligado; selo + cadeado
com bloqueio ligado; Jogos com janela própria; (8) benefícios citáveis: os da lista do item 8 acima.

## 8. Implementação (2026-10-22, branch `claude/optimistic-ramanujan-tercxc`)

### O que mudou

- **Fonte única**: `my_permissions()` (075) já somava os papéis (account_roles com validade + Aluno pelo vínculo ativo)
  e devolvia o valor mais permissivo; foi reaproveitada (não há função paralela). A 116 só acrescenta `free` (linha
  Grátis pura, para a admin com o Admin Mode desligado ver o site como conta grátis).
- **Site** (`shared/permissions.js`): `planCan(chave)` e `planLimit(chave)` respondem pela tabela; antes de carregar ou
  com o RPC fora do ar ninguém ganha nada (limite de reserva = 20). `shared/roles.js`: `myPlanKind()` (só para o texto
  do selo), `fetchMyOwnCardsQuota()` (limite da célula "Cartões próprios", contando os cartões ativos de TODOS os
  cursos), `isPremium()` deixou de decidir acesso; `hasUnlimitedOwnCards()` lê a tabela.
- Trocas de `plan_tier`/vínculo fixo pela permissão:
  | Recurso | Antes | Agora |
  |---|---|---|
  | Tipos de cartão (Meus cartões e janela Adicionar) | `plan_tier` | `planCan('rich_card_formats')` |
  | Áudio por texto e gravação | `plan_tier` | `planLimit('tts_monthly_quota')` > 0 ou sem limite |
  | Limite de cartões (criar, importar arquivo/link, Anki, perfil público) | 20 fixo, por curso; isento = Premium ou vínculo | célula `own_cards_limit`, por conta |
  | Abrir/importar Deck público (servidor, 5 RPCs) | `plan_tier = 'premium'` | `_has_permission(uid, 'public_deck_import')` (116) |
  | Desafios do Módulo e Ditados extras | `isPremium()` | `planCan('challenges_premium')` |
  | Jogos da Conjugação | `isPremium()` (via Desafios) | `planCan('conj_games')` (permissão nova, 116) |
  | Pular unidades | `isPremium()` ou vínculo | `planCan('trail_skip_locked')` |
  | Cota do `tts-generate` (Edge Function) | `TTS_MONTHLY_LIMIT` igual para todos | `permission_limit('tts_monthly_quota')`; 0 = `plan_required`; RPC fora = env |
- Bloqueios continuam como estavam: `CHALLENGE_PAYWALL_ENABLED`, `CHALLENGES_SERVER_GATING`, `CONJ_GAMES_PAYWALL_ENABLED`
  e `TRAIL_SKIP_PAYWALL_ENABLED` = false. Os dois últimos viraram `let` (os testes ligam).
- **Selos (regra 7)**: Jogos mostram "⭐ Premium" sem cadeado (cartão e aba) com o bloqueio desligado; com o bloqueio
  ligado, só quem não tem `conj_games` vê "⭐ Premium" + 🔒 e, ao tocar, a janela própria `#premium-games-modal`.
- **"Fale com a Prof. Brune"** (`premiumContactMailto`/`premiumContactButtonHTML`): `mailto:brunemed1310@gmail.com` com
  assunto e texto no idioma do site (@ da pessoa + curso). Está na janela de limite (padrão e corte), na janela dos
  Desafios do Módulo, na janela dos Jogos, no aviso dos tipos de cartão e no aviso de Deck público. Nenhum texto cita
  mais "administração (profbrune)".
- **Admin > Planos**: linhas Painel da professora, Analytics do aluno, Mural e Banco de Revisão só leitura (decididas
  pelo papel), com explicação; subtítulo "A mudança vale na hora para Grátis, Aluno e Premium"; rótulos novos
  (Todos os tipos de cartão; Áudio por texto e gravação; Pular unidades; Cartões próprios somando todos os cursos;
  Jogos da Conjugação; Banco de Revisão em inglês, que antes aparecia em português).
- **Ninguém perde cartão**: quem já passou do limite mantém todos os cartões ativos; só o botão Criar trava e as
  importações cortam e avisam (regra "limite corta e avisa"; teste `tests/limite-corte`, casos G e H).
- **008** (`fr/scripts/supabase_migrations/008_...`): `is_challenges_premium()` corrigida (`_has_permission(auth.uid(),
  'challenges_premium')`, sem `p.id` nem `plan_tier`, Aluno incluído). Continua **não aplicada** (espera o paywall);
  testada localmente dentro de `begin ... rollback` (`tests/planos-permissoes/test_008.sql`).

### Migrations

| Nº | Arquivo | Staging | Produção |
|---|---|---|---|
| 116 | `shared/supabase_migrations/116_plan_permissions_effective.sql` | aplicada em 2026-10-22, versão `20261022013043` | **pendente** (só depois da prévia aprovada) |

Conferido no Staging depois: as 5 RPCs de Deck público sem `plan_tier`, `security definer` + `search_path=public`,
hash igual ao do teste local; `my_permissions`/`copy_public_deck` sem EXECUTE para `anon`; `account_roles` com o mesmo
hash; `role_permissions` 65 → 70 linhas (5 de `conj_games`); `trail_skip_locked` ligado para Premium Basic/Pro e Aluno.
A 116 não tem DROP nem DELETE (vai pelo `apply_migration`). As 5 RPCs da produção têm o mesmo hash das do Staging
(conferido por SELECT), então o `replace` da 116 casa nas duas.

Desfazer a 116 (SQL Editor, tem DELETE): rodar o mesmo bloco `do $mig$` trocando as duas linhas de lugar; recriar
`my_permissions()` da 075; `update role_permissions set enabled = false where permission_key = 'trail_skip_locked' and
role in ('premium_basic','premium_pro')`; `delete from role_permissions where permission_key = 'conj_games'; delete from
permission_catalog where key = 'conj_games'` (e voltar a versão anterior do site, que não conhece `conj_games`).

### O que cada conta passa a ter (tabela de 2026-10-22 + 116)

| Recurso | Grátis | Aluno | Premium Basic | Premium Pro | Professora | Admin (Admin Mode ligado) |
|---|---|---|---|---|---|---|
| Cartões próprios | 20 na conta (todos os cursos) | sem limite | sem limite | sem limite | sem limite | sem limite |
| Tipos de cartão | só Normal | todos | todos | todos | todos | todos |
| Áudio por texto e gravação | não (upload e link sim) | 300/mês | 300/mês | 300/mês | 300/mês | sem cota |
| Abrir e importar Deck público | não | **sim (novo)** | sim | sim | sim | sim |
| Ver quem copiou meu Deck | não | sim | sim | sim | sim | sim |
| Desafios do Módulo e Ditados extras (bloqueio desligado: todos abrem) | não, ao ligar | sim | sim | sim | sim | sim |
| Jogos da Conjugação (bloqueio desligado: todos abrem) | não, ao ligar | sim | sim | sim | sim | sim |
| Pular unidades (bloqueio desligado: todos pulam) | não, ao ligar | sim | **sim (novo)** | **sim (novo)** | não (célula desligada) | sim |
| Minhas aulas / Material de apoio | não | sim | não | não | não | sim |

Admin com o Admin Mode desligado vê a coluna Grátis (só na interface; o servidor continua a tratando como admin).

### Testes (números reais em 2026-10-22)

- `tests/planos-permissoes/run.sh` (Postgres local, migrations 001 a 115 + 116 duas vezes): 116 142/142 (8 contas:
  grátis, aluno, ex-aluno, Premium Basic, Premium Pro, Premium vencido, professora, admin; 5 RPCs de Deck público; a
  tabela manda na hora) e 008 corrigida 14/14.
- `tests/planos-permissoes/test_playwright.js` (fr e zh; grátis, aluno, Premium Basic, professora; Planos fr/zh x
  claro/escuro em 390px): 105/105.
- `tests/tts-google/test_tts_core.mjs`: 114/114 (cota pela tabela).
- Regressão (antes = commit `bdde8d21`, depois = esta branch): i18n unit 2344 → 2343/2343 (2 checagens a menos: o `<p>` da
  janela de limite deixou de usar `data-i18n-html`, porque o texto tem `{limit}`; 1 a mais pela `plan_required`), i18n
  navegador 209/209, sem português no site em inglês 6/6, limite-corte 26 → 38/38 e unit 30/30, painel-admin Planos
  162/162 e peças 31 → 35/35, plano-admin 26/26, conjugação 80/80, trilha (skip/checkpoint 19/19 e demais iguais),
  desafios-* iguais, fase-f/g/i/j iguais, Deck público navegador 152, k2* iguais, acessibilidade 60/60, anki-destino 38/38.
  Falhas que já existiam antes e continuam iguais: `scan_pt_literais` (privacy-draft), `test_card_variants_browser`
  14/16, `test_content_en` 29/30, desafios-progresso 22/23, fase-h 76/78 (unit) e navegador zh H5, k2c 12/14, k2i,
  painel-cartoes 256/264, painel-professora 565/571, `test_legacy_parity` (precisa do banco `pubdeck` do `run.sh`).
- Testes antigos mudados de propósito (comportamento novo): `tests/trilha/test_skip_checkpoint_ui.js`,
  `tests/plano-admin/test_playwright.js`, `tests/conjugacao/test_playwright.js` (selo sem cadeado e janela própria),
  `tests/limite-corte/test_playwright.js` (botão de e-mail; casos G e H novos), `tests/painel-admin/*` (rótulos),
  `tests/i18n/*` (textos aprovados), e os harness `tests/anki-destino/pw_harness.js`, `tests/fase-f`, `tests/fase-g`
  (Premium simulado por `my_permissions`, `tests/planos-permissoes/fixtures.js`).

### O que falta para a produção (nesta ordem)

1. Dona aprova a prévia (capturas do selo dos Jogos, do aviso de limite com o botão e de Admin > Planos).
2. Aplicar a 116 na produção (`apply_migration`, sem DROP) e conferir: 5 RPCs sem `plan_tier`, grants, `role_permissions`
   65 → 70, `account_roles` com o mesmo hash, `trail_skip_locked` ligado para Premium Basic/Pro.
3. Publicar o site (PR desta branch). A ordem importa pouco: o site novo com o banco antigo funciona (sem `free`, a
   admin com Admin Mode desligado vê limite de reserva 20; sem `conj_games`, os Jogos só mudam quando o bloqueio ligar);
   o banco novo com o site antigo também (o aluno passa a abrir Deck público pelo servidor).
4. `tts-generate`: o código novo (cota pela tabela) não foi publicado em lugar nenhum (a função não existe no Staging).
   Depois do PR, novo deploy na produção; até lá vale `TTS_MONTHLY_LIMIT` (300) para quem chamar a função.
5. 008: continua esperando o paywall (lista em `docs/historico/14-pendencias-pos-paywall-e-decks.md`).
6. Pergunta aberta para a dona: a Professora (sem ser admin) pode pular unidades? Hoje a célula está desligada (a decisão
   2 citou só Premium e Aluno); a dona liga em Admin > Planos se quiser, sem código.
