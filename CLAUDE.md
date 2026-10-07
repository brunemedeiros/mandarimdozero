# Idiomas com Prof. Brune -- regras do repositório

Site de estudo de idiomas (francês em `fr/`, mandarim em `zh/`, futuro português em `ptbr`), estático no
GitHub Pages (publicado a partir da `main`), com Supabase (banco, Auth, Storage, Edge Functions).
A dona do projeto é a professora Brune (conta admin `brunemed1310@gmail.com`). Responda em português do Brasil.

## Onde registrar decisões (MEMÓRIA -- vale para toda sessão daqui pra frente)

Este arquivo é carregado em TODA sessão e em todo subagente. Ele já chegou a 1,1 MB e estourou o contexto.
Por isso, **não acrescente relatórios de fase, logs de teste nem histórico aqui**. Use o lugar certo:

| O que é | Onde vai |
|---|---|
| Regra que vale para o projeto inteiro, curta | Este arquivo (1 a 3 linhas por regra) |
| Regra que só importa ao mexer numa pasta/tipo de arquivo | `.claude/rules/<tema>.md` com `paths:` (carrega só quando um arquivo daquela área é lido) |
| Procedimento passo a passo que se repete (migration, notas, desafios, TTS, teste visual) | Skill em `.claude/skills/<nome>/SKILL.md` |
| Tarefa delegável a um subagente | `.claude/agents/<nome>.md`, com `model:` pela dificuldade |
| Relatório de entrega, testes rodados, decisões de uma fase, achados | `docs/historico/` (arquivo do tema, ou um novo `NN-tema.md`) |
| Contrato/arquitetura longa | `docs/` (ex.: `docs/arquitetura-total-decks-tags-painel.md`) |
| Estado vivo (migration aplicada, pendência aberta) | Seção "Estado atual" abaixo, 1 linha por item; ao fechar, apagar a linha |

Antes de escrever em qualquer um deles, procure se já existe uma regra igual e atualize-a em vez de duplicar.
Se uma regra deste arquivo ficar específica de uma pasta, mova-a para `.claude/rules/`.

## Regras do projeto inteiro

- **Coerência pedagógica**: só reaproveitar conteúdo/explicação de outro lugar se responder à pergunta que o aluno
  vê na tela, não só por estar no mesmo arquivo/unidade.
- **Passos manuais vêm junto com a entrega**: se a autora precisa fazer algo (migration no SQL Editor, secret,
  deploy, configuração), o link/arquivo e a instrução vão na mesma mensagem. Relistar pendências acumuladas.
- **Grátis x Premium**: toda feature nova responde explicitamente "o que é grátis, o que é Premium" (mesmo que
  seja "tudo grátis"). Não existe checkout/Stripe; o paywall dos Desafios está desligado.
- **Código pronto não prova infraestrutura ativa**: nunca presumir que serviço externo/secret/cron/dado está ativo em
  produção; conferir ao vivo (MCP Supabase/Resend) ou dizer que está pendente.
- **Edge Function só muda em produção após novo deploy**; deploy feito = registrar; não feito = avisar.
- **Nunca apagar progresso de memória (FSRS) por engano**; mudanças de dado em produção só com autorização explícita.
- **Português do Brasil coloquial** em todo texto de interface e notas (ex.: "pechinchar", não "regatear");
  sem "--" e sem "pra" em texto visível.
- **Terminologia**: "aluno/aluna" = vínculo ativo em `teacher_students`; "usuário/conta" = qualquer perfil.
- **Cor de botão**: trocar `background` sempre junto com `color`, usando tokens `--on-*` do próprio arquivo;
  validar fr/zh × claro/escuro (ver `.claude/rules/frontend-fr-zh.md`).
- **Notas de realidade/culturais**: toda nota nova ou editada é reportada no chat com nível de confiança
  (alta/média/baixa). Procedimento na skill `notas-de-realidade`.
- **Conteúdo novo (nível/módulo/unidade)**: decidir os Desafios por categoria (skill `criar-desafios`).

## Processo

- Fases grandes: auditoria/grilling antes de codar; não avançar de fase sem autorização da autora.
- Não abrir PR, mergear ou publicar sem pedido explícito. Outras conversas editam o mesmo repo em paralelo:
  em conflito, manter os dois lados (nunca descartar o trabalho da outra conversa).
- Confirmar o estado real (`git log`, código, `list_migrations`) antes de reimplementar algo que uma instrução
  diz "não existir" -- o histórico/instrução pode estar desatualizado.
- Testes ficam versionados em `tests/<tema>/`. Sempre rodar a regressão da área tocada e relatar números reais.
- Commit sem identificador de modelo; PR/merge só a pedido.
- Branch antiga que ainda acrescenta seções no fim do `CLAUDE.md`: no conflito, ficar com o `CLAUDE.md` da `main` e
  mover o texto novo para `docs/historico/` (e as regras curtas para `.claude/rules/` ou para cá). Nada se descarta.

## Arquitetura em uma tela (detalhes nas regras por pasta)

- Cartão = **Note** (Fields + `card_generation_mode`) → **Card Type** → **CardInstances** derivadas em runtime
  (nunca persistidas). Normal com reverso = 2, Cloze = 1 por marca `{{cN::...}}`. FSRS é por CardInstance, global.
- Origens: `study` (trilha, de `content.js`), `teacher` (`teacher_flashcards`), `self` (`own_flashcards`).
- Deck e Tags pertencem à **Note**. Fonte de verdade de Decks/Tags/Painel/Review:
  `docs/arquitetura-total-decks-tags-painel.md`.
- Idioma estudado (`/fr`, `/zh`) x idioma do site (`uiLanguage`, `shared/i18n/`): dois eixos só.

## Supabase

- Produção: `eigjocalzwamisgqilhg`. Staging: `ilfjzizjfcmhibkhwber`. Sempre Staging antes da produção.
- Migrations: skill `migration-supabase` (inclui por que SQL com `DROP` vai pelo SQL Editor da autora).
- Registro de migrations aplicadas e mapa número → versão: `docs/historico/08-public-deck-migrations-rollout-059-069.md`
  e o `list_migrations` ao vivo (fonte de verdade).

## Índice

- Regras por área (carregam sozinhas): `.claude/rules/` -- frontend-fr-zh, flashcards-motor, decks-review,
  supabase, i18n, conteudo-trilha, audio-tts, testes, admin-professora.
- Skills do projeto: `migration-supabase`, `notas-de-realidade`, `criar-desafios`, `audio-tts`,
  `teste-navegador`, `registrar-entrega`.
- Agentes (`.claude/agents/`, `model:` pela dificuldade): `regressao` (haiku, roda testes),
  `revisor-conteudo` (opus, revisa notas/traduções), `code-architecture-reviewer`/`principal-engineer`/
  `plan-reviewer`/`refactor-planner` (opus), `code-refactor-master`/`documentation-architect`/
  `web-research-specialist`/`auto-error-resolver` (sonnet).
- Histórico completo (texto original, só leitura sob demanda): `docs/historico/01..14-*.md`.
  Comentários no código que citam "seção X do CLAUDE.md" apontam para esse texto: buscar com `grep -rn` em `docs/historico/`.

## Estado atual (1 linha por item; apagar ao fechar)

- Migrations com número repetido no repo: `072_add_country_to_profiles` (NÃO aplicada) e
  `072_flashcard_media_allow_images` (aplicada); `073_create_profile_private` e `073_friends_and_friend_ranking`
  (ambas aplicadas). 074 aplicada no Staging e na produção.
- Desafios: `fr/scripts/supabase_migrations/007` (`cloze_grammar`) aplicada pela autora em 2026-10-07; `008` (gating
  Premium) NÃO aplicar antes do paywall. Lista do que fazer ao ligar o paywall: `docs/historico/14-pendencias-pos-paywall-e-decks.md`.
- Todos os cartões antigos já têm Deck (migração de 2026-10-07). Regra "1 professora por aluno por idioma" ainda não imposta no banco.
- Paywall dos Desafios desligado (`CHALLENGE_PAYWALL_ENABLED=false`, `CHALLENGES_SERVER_GATING=false`).
- Plano aprovado (não iniciado): 1) papel Professora, 2) Fase K final, 3) perfil privado, 4) mural da professora -- `docs/plano-professora-privacidade.md`.
- Pendências da autora: layout do áudio nas opções do checkpoint do zh; módulos/aba de Desafios do chinês;
  diálogos com personagens nomeados e preenchimento de país dos alunos (placeholders de perfil); Stripe.
