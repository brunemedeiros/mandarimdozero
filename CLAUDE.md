# Idiomas com Prof. Brune -- regras do repositório

Site de estudo de idiomas (francês em `fr/`, mandarim em `zh/`, futuro português em `pt/`, id `pt`, chave `portugues`), estático no
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
- **Site em inglês não tem NADA em português** (decisão da autora, 2026-10-15): inclui avisos gravados pelo banco, push e
  e-mail; texto montado no servidor sai no idioma do site de quem recebe (`_ui_lang`, ver `.claude/rules/i18n.md`).
- **Decisão vale para todos os sites** (fr, zh, pt e futuros), como padrão (2026-10-15): regra de produto decidida aqui (XP, missões, regras de Revisão...)
  não é só de fr/zh. Código em `shared/` já vale para todos; site novo herda o molde. Exceção só com a autora aprovando. XP: `.claude/rules/xp.md`.
- **Português do Brasil coloquial** em todo texto de interface e notas (ex.: "pechinchar", não "regatear");
  sem "--" e sem "pra" em texto visível.
- **Terminologia**: "aluno/aluna" = vínculo ativo em `teacher_students`; "usuário/conta" = qualquer perfil.
- **Cor de botão**: trocar `background` sempre junto com `color`, usando tokens `--on-*` do próprio arquivo;
  validar fr/zh × claro/escuro (ver `.claude/rules/frontend-fr-zh.md`).
- **Notas de realidade/culturais**: toda nota nova ou editada é reportada no chat com nível de confiança
  (alta/média/baixa). Procedimento na skill `notas-de-realidade`.
- **Conteúdo novo (nível/módulo/unidade)**: decidir os Desafios por categoria (skill `criar-desafios`).
- **E-mails**: todo e-mail do site (Supabase Auth, Edge Functions, Resend) segue o padrão Prof Brune
  (`docs/email/PADRAO-EMAIL.md`, modelo `docs/email/supabase/confirmar-conta.html`; detalhes em `.claude/rules/email.md`).

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
  supabase, i18n, conteudo-trilha, audio-tts, testes, admin-professora, painel-design-system, email, xp.
- Skills do projeto: `migration-supabase`, `notas-de-realidade`, `criar-desafios`, `audio-tts`,
  `teste-navegador`, `registrar-entrega`.
- Agentes (`.claude/agents/`, `model:` pela dificuldade): `regressao` (haiku, roda testes),
  `revisor-conteudo` (opus, revisa notas/traduções), `code-architecture-reviewer`/`principal-engineer`/
  `plan-reviewer`/`refactor-planner` (opus), `code-refactor-master`/`documentation-architect`/
  `web-research-specialist`/`auto-error-resolver` (sonnet).
- Histórico completo (texto original, só leitura sob demanda): `docs/historico/01..15-*.md`.
  Comentários no código que citam "seção X do CLAUDE.md" apontam para esse texto: buscar com `grep -rn` em `docs/historico/`.

## Estado atual (1 linha por item; apagar ao fechar)

- Migrations com número repetido no repo: `072_add_country_to_profiles` (NÃO aplicada) e
  `072_flashcard_media_allow_images` (aplicada); `073_create_profile_private` e `073_friends_and_friend_ranking`
  (ambas aplicadas). 074 aplicada no Staging e na produção.
- Desafios: `fr/scripts/supabase_migrations/007` (`cloze_grammar`) aplicada pela autora em 2026-10-07; `008` (gating
  Premium) NÃO aplicar antes do paywall. Lista do que fazer ao ligar o paywall: `docs/historico/14-pendencias-pos-paywall-e-decks.md`.
- Todos os cartões antigos já têm Deck (migração de 2026-10-07).
- Cursos por par (idioma estudado × idioma do site), notas escritas para cada língua de origem, URLs `/fr` `/zh` `/pt`: `docs/i18n/decisao-cursos-por-par.md`; plano em etapas E0 a E10: `docs/i18n/arquitetura-multi-idioma-cursos.md`. E0 a E3 e C0 a C6 entregues e **mesclados na main (PR 309, 2026-10-13)** com a flag `COURSE_PROGRESS_PER_SITE_LANGUAGE = true` (curso por idioma do site, menu da bandeira, portão "Eu falo..."); migration 075 e `notification-cron` v24 em produção; chave de emergência `localStorage['courses-per-site-language']='0'`. E4: passos 1 e 2 (levantamento e plano em `docs/i18n/e4-*.md`) e lote 1 (22 funções para `shared/core/`, PR 311) mesclados; lote 2 (42 funções de revisão e decks, PR 314) mesclado; lote 3 (39 funções de exercícios de lição, PR 317) mesclado; lote 4 (58 funções de estado, trilha, checkpoint e desafios, PR 321, com teste de ida e volta do progresso e capturas antes x depois) mesclado: as funções idênticas acabaram (restam 3 de Configurações/admin, de outras sessões); lote 5a (12 quase iguais simples, ganchos `LANG_HOOKS`, PR 324) mesclado. lote 5b (5 funções de toast/plural e recapitulação com pinyin, PR 327) mesclado; lote 5c (10 funções de chave de texto/valor por idioma, PR 330) mesclado. lote 5d (3 com pinyin, PR 332) mesclado; lote 5e (2 do grupo C: missões e contadores do dia, PR 334) mesclado; restam 23 quase iguais. Decisão: grupo D por FAMÍLIA de idiomas (latina: molde fr, junto com o app de português; logográfica: zh), ver `docs/i18n/e4-plano-de-extracao.md` seção 10 (levantamento em `docs/i18n/e4-plano-de-extracao.md`, seção 9) (pontos de extensão), só com a autorização da dona; Q-10 a Q-14 a dona já respondeu em outra sessão. Próximas: E4 em diante (Banco de Revisão e `teacher-invites.js` com lista de idiomas fixa: tratados em outra sessão); Q-11 e P1 a P8 respondidas, Q-10 resolvida pelas conquistas com níveis, Q-13/Q-14 seguindo a recomendação; Q-12 aprovada pela dona em 2026-10-14 (Course Decks com estrutura por idioma estudado e títulos resolvidos pela camada do curso na exibição). Histórico: `docs/historico/15-i18n-cursos-por-par-e0.md`.
- App de português (`pt`, curso `portugues@en`): decisões e ordem em `docs/i18n/auditoria-app-portugues.md` (piloto de 1 unidade, só depois da E5 e do mínimo da E6; módulos do começo: trilha, revisão, conjugação, decks). Pronto: regras de texto falado, comparador en adversarial, módulo da família latina (fases 1 e 2: o fr já usa `shared/core/familias/latina.js`), catálogo de erros (com verificação externa), rascunho da unidade 1 (`docs/i18n/piloto-pt/`, aguarda revisão da dona), auditoria do servidor (`docs/i18n/e6-minimo-servidor-pt.md`). Banco (2026-10-15): modelos de aviso do pt em inglês (106) aplicados e ATIVOS na produção; servidor mínimo (105, aplicado como `105b_pt_server_minimum`) e sino da professora (108, avisos antigos conferidos por hash) na produção; no Staging: 105b, 108 e a coluna `ui_language` de `notification_templates` (migration `056a`, só a coluna; a semente em inglês da 056 não entrou); `notification-cron` v25 publicado na produção (plataforma v28); PR 338 mesclado. `tts-generate` publicada na produção com as regras pt v3 (plataforma v10; escolhas da dona no laboratório, ver `docs/pt-tts-revisao.md` 4.x; falta mesclar a branch). Falta: e-mails bilíngues do Supabase Auth (colar no painel), 107 (Mural, SQL Editor, opcional) e `report-reply-send`. Migrations pt: 105 servidor mínimo, 106 modelos de aviso, 107 Mural, 108 sino da professora. Laboratório de áudio pt: `docs/pt-audio-laboratorio.md`.
- Paywall dos Desafios desligado (`CHALLENGE_PAYWALL_ENABLED=false`, `CHALLENGES_SERVER_GATING=false`) e dos Jogos da
  Conjugação também (`CONJ_GAMES_PAYWALL_ENABLED=false`: Jogos são Premium, com cadeado; a prática da Conjugação é grátis).
- Conjugação (fr) publicada pelo PR #318 (2026-10-14): prática revisada, busca de verbos, aba Jogos ("Passé composé ou
  Imparfait?") e modo foco na Conjugação/Revisão/Desafios. Ideia em espera: "Adicionar à Revisão" (versão enxuta só na
  tela final). Registro: `docs/historico/13-redesenho-licoes-destaque-dialogo.md`.
- 075/076 (papéis, permissões, regras da professora) na produção; telas (painéis Admin x Professora, Planos, Minhas aulas) publicadas pelo PR #302 (2026-10-12). Plano: 1) papel Professora, 2) Fase K final, 3) login obrigatório + perfil privado (077-080 na produção, telas pelo PR #304), 4) mural (087 no Staging e na produção, telas e painel Aluno publicados pelo PR #312 em 2026-10-14; aba Aluno > Revisão publicada pelo PR #316; 094 Presença/Competências/aula de turma no Staging e na produção (2026-10-14); Notion importado em 2026-10-15 (393 aulas; 62 para a autora revisar no bloco "Revisar do Notion", publicado pelo PR #326); calendário com 101 no Staging e na produção (2026-10-15), publicado; link de agenda (103 + função `class-calendar-feed`, aula sem horário = 7h) no Staging e na produção (2026-10-15); senha curta 107 no Staging e na produção (2026-10-15); domínio `agenda` (Netlify, `docs/agenda-netlify-passo-a-passo.md`) pendentes; depois: avisos no Mural, aba Turma no Ranking só para quem tem turma) -- `docs/plano-professora-privacidade.md`.
- Banco de Revisão (migrations 081 a 085): aplicadas no Staging e na produção (2026-10-13; versões 20261013105651 a 105731, a 081 no Staging aparece como `080_review_bank`). Tela em Professora > Cartões publicada. Importação feita pela autora (produção, 2026-10-14: 24 alunos, 2076 itens, 8 vinculados, 635 cartões); 14 ativos ainda sem conta/vínculo. Banco ligado a Turma (plano `docs/banco-revisao-turmas-plano.md`): migration 096 no Staging e na produção (2026-10-15, SQL Editor); tela, opção 2 da autora (sem vínculo, cartões da professora somem do Aluno, progresso guardado) e motor da rotina regerado publicados pela branch `claude/friendly-hamilton-u4ssl2`. App de português (`pt`) é urgente: 13 dos 24 alunos estudam português. Registro: `docs/historico/15-auditoria-banco-revisao.md`.
- 086 (amigos: foguinho, marcos de sequência, parabéns) aplicada no Staging e na produção (2026-10-13). Conquistas com níveis
  aprovadas (2026-10-14) e publicadas (PR #313); 091 e 092 (Pódio) no Staging e na produção:
  `docs/historico/16-conquistas-com-niveis.md`. Ícones: troca geral para o Fluent Emoji feita na branch (`shared/emoji-icons.js`, `docs/icones-fluent.md`).
- App de loja (App Store/Google Play): antes de discutir, ler `docs/app-loja-lembretes.md` (agenda de contatos, telefone, LGPD).
- Amigos: sugestões de amigos + QR code (095 no Staging e na produção, 2026-10-15; `docs/historico/17-sugestoes-de-amigos.md`).
  Missão em dupla, sequência com amigo, cutucar e push de Amigos na hora (102 + Edge Function `push-dispatch`, Staging e produção,
  2026-10-15; `docs/historico/19-amigos-em-dupla.md`). Mural e convite da professora no idioma de quem recebe (104, Staging e produção);
  convite para ativar as notificações (faixa em Amigos + janela no 1º amigo) publicado (2026-10-15). Missão em dupla automática da semana (4 dias cada, rodízio, Missões do dia clicáveis): 109 no Staging e na produção (2026-10-15); se a 105 de português for para a produção, reaplicar a `_friends_notify_msg` da 109 depois.
- Rotina automática do Banco (tarefa da madrugada -> Edge Function `review-bank-agent`, caixa de entrada e cron; migrations 089, 090 e 097 a 100 na produção, função v7 alinhada ao motor atual em 2026-10-15 (ping 200), Vault e cron criados em 2026-10-15, token conferido): tarefa nova `trig_015AkoX1hyDJuWs1MimQDTbE` (texto em `docs/rotina-banco/tarefa-nova-producao.txt`, colar de novo se mudar). Gerenciados e arquivados no artifact (2026-10-15): Carmen, Carol, Catharina, Francielly, Luana, Marconi, Rachel; primeira execução manual conferida (Luana: 14 itens, 12 cartões, Récap) e tarefa agendada às 01:50 America/Sao_Paulo (2026-10-15). Ao migrar cada outro aluno, marcar "Atualizar automaticamente" no formulário do aluno (Banco > Alunos > Editar aluno) e arquivá-lo no artifact. Duplicatas "Luana Baionne" e "Makena Bento de Azevedo" arquivadas (apagar pelo SQL Editor). Detalhes: `docs/historico/18-rotina-automatica-banco.md`.
- Design System do painel: Pico CSS escopado, sem React e sem build (`shared/painel/`, guia em `shared/painel/guia-de-estilo.html`, ~40 peças inspiradas no shadcn). Nunito hospedada em `shared/fonts/`. Fase 2 (área da Professora): **telas Alunos, Cartões e Material de apoio prontas na branch (Aulas nova fica na branch `claude/aulas-design-system`, PR separado)** (fr e zh, testadas; `docs/historico/15-*`), nada publicado na `main`; Banco de Revisão continua com o visual antigo, na sub-navegação "Cartões | Banco de Revisão" (tratado em outra sessão). Botão primário fica no azul atual (igual ao Ranking). Admin (Fase 3): **5 abas prontas na branch** (Planos, Notificações, Badges, Reports, Analytics; `docs/historico/15-*`, auditoria em `docs/fase-3-admin/auditoria.md`), PR 319 aberto, mesclado com a `main` de 2026-10-15 (convites, Decks do aluno e Decks públicos integrados nas telas novas; Aulas ficam com a tela da `main`; `docs/historico/15-*`); guia de estilo com as peças novas e páginas antes e depois (Cartões, Material, Admin) já publicadas como artifacts; confirmações de Planos aprovadas pela autora. Analytics busca em páginas de 1000 (teto 50000 eventos, 10000 técnicos), sem migration.
- Pendências da autora: layout do áudio nas opções do checkpoint do zh; módulos/aba de Desafios do chinês;
  diálogos com personagens nomeados (placeholders de perfil); Stripe. País dos alunos: já preenchido nos 13 alunos (conferido 2026-10-14).
