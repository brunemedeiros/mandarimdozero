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
- **Paridade entre sites** (pedido da autora, 2026-10-23): o fr recebe mais pedidos, mas peça usada por mais de um site
  (CSS/HTML de componente de `shared/`, lição, Revisão, metas) muda em TODOS no mesmo PR, de preferência em `shared/`. O que
  fica só num site precisa estar classificado em `docs/auditoria-paridade-fr-zh.md`. Guarda: `tests/paridade-sites/`.
- **Português do Brasil coloquial** em todo texto de interface e notas (ex.: "pechinchar", não "regatear");
  sem "--" e sem "pra" em texto visível.
- **Terminologia**: "aluno/aluna" = vínculo ativo em `teacher_students`; "usuário/conta" = qualquer perfil.
- **Cor de botão**: trocar `background` sempre junto com `color`, usando tokens `--on-*` do próprio arquivo;
  validar fr/zh × claro/escuro (ver `.claude/rules/frontend-fr-zh.md`).
- **Caixas da marca com texto** (botão, aba/chip selecionado, contador; decisão da autora, 2026-10-19, PR 370): fundo
  `var(--brand-fill)` (azul no fr, vermelho no zh) e texto `var(--on-brand-fill)` (branco), igual nos dois temas. Nunca
  `--seal-red` com texto, nem `#fff`/azul fixo. Verde de sucesso (✓, "Continuar" do acerto, selo ok; PR 383, 2026-10-22):
  `var(--success-fill)` com `var(--on-success-fill)` (branco); nunca `--jade` com texto. Guarda: `tests/cores-marca/`.
- **Conteúdo nasce traduzido** (decisão da autora, 2026-10-19): todo conteúdo novo ou alterado (trilha, notas, diálogos,
  Desafios, ditados) já sai com a versão para CADA idioma de site do curso (hoje pt-BR e en), no mesmo lote e na mesma
  revisão; lote sem todas as traduções não é importado nem publicado. Como fazer: `.claude/rules/conteudo-trilha.md`.
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
- App de português (`pt`, curso `portugues@en`): decisões e ordem em `docs/i18n/auditoria-app-portugues.md` (piloto de 1 unidade, só depois da E5 e do mínimo da E6; módulos do começo: trilha, revisão, conjugação, decks). Pronto: regras de texto falado, comparador en adversarial, módulo da família latina (fases 1 e 2: o fr já usa `shared/core/familias/latina.js`), catálogo de erros (com verificação externa), rascunho da unidade 1 (`docs/i18n/piloto-pt/`, aguarda revisão da dona), auditoria do servidor (`docs/i18n/e6-minimo-servidor-pt.md`). Banco (2026-10-15): modelos de aviso do pt em inglês (106) aplicados e ATIVOS na produção; servidor mínimo (105, aplicado como `105b_pt_server_minimum`) e sino da professora (108, avisos antigos conferidos por hash) na produção; no Staging: 105b, 108 e a coluna `ui_language` de `notification_templates` (migration `056a`, só a coluna; a semente em inglês da 056 não entrou); `notification-cron` v25 publicado na produção (plataforma v28); PR 338 mesclado. `tts-generate` publicada na produção com as regras pt v3 (plataforma v10; escolhas da dona no laboratório, ver `docs/pt-tts-revisao.md` 4.x; PR 340 mesclado). Falta: e-mails bilíngues do Supabase Auth (colar no painel), 107 (Mural, SQL Editor, opcional) e `report-reply-send`. Migrations pt: 105 servidor mínimo, 106 modelos de aviso, 107 Mural, 108 sino da professora. Laboratório de áudio pt: `docs/pt-audio-laboratorio.md`.
- Paywall dos Desafios desligado (`CHALLENGE_PAYWALL_ENABLED=false`, `CHALLENGES_SERVER_GATING=false`) e dos Jogos da
  Conjugação também (`CONJ_GAMES_PAYWALL_ENABLED=false`: Jogos são Premium, com cadeado; a prática da Conjugação é grátis).
- Conjugação (fr) publicada pelo PR #318 (2026-10-14): prática revisada, busca de verbos, aba Jogos ("Passé composé ou
  Imparfait?") e modo foco na Conjugação/Revisão/Desafios. Ideia em espera: "Adicionar à Revisão" (versão enxuta só na
  tela final). Registro: `docs/historico/13-redesenho-licoes-destaque-dialogo.md`.
- 075/076 (papéis, permissões, regras da professora) na produção; telas (painéis Admin x Professora, Planos, Minhas aulas) publicadas pelo PR #302 (2026-10-12). Plano: 1) papel Professora, 2) Fase K final, 3) login obrigatório + perfil privado (077-080 na produção, telas pelo PR #304), 4) mural (087 no Staging e na produção, telas e painel Aluno publicados pelo PR #312 em 2026-10-14; aba Aluno > Revisão publicada pelo PR #316; 094 Presença/Competências/aula de turma no Staging e na produção (2026-10-14); Notion importado em 2026-10-15 (393 aulas; 62 para a autora revisar no bloco "Revisar do Notion", publicado pelo PR #326); calendário com 101 no Staging e na produção (2026-10-15), publicado; link de agenda (103 + função `class-calendar-feed`, aula sem horário = 7h) no Staging e na produção (2026-10-15); senha curta 107 no Staging e na produção (2026-10-15); domínio `agenda.profbrune.com.br` no ar pelo Netlify (2026-10-22, `docs/agenda-netlify-passo-a-passo.md`); Google Agenda → site em um sentido (117 + função `google-calendar` + cron `gcal-sync` no Staging e na produção, 2026-10-23; parte B aplicada; 118, 119 e 120 (caixa de revisão com Pulados e Fora do site) no Staging e na produção (2026-10-24); app do Google publicado e marca verificada (2026-10-25); PENDENTE da autora: vídeo da verificação do acesso à agenda (tira o aviso "não verificado"), roteiro em `docs/google-agenda/verificacao-google.md`); depois: avisos no Mural, aba Turma no Ranking só para quem tem turma) -- `docs/plano-professora-privacidade.md`.
- Banco de Revisão (migrations 081 a 085): aplicadas no Staging e na produção (2026-10-13; versões 20261013105651 a 105731, a 081 no Staging aparece como `080_review_bank`). Tela em Professora > Cartões publicada. Importação feita pela autora (produção, 2026-10-14: 24 alunos, 2076 itens, 8 vinculados, 635 cartões); 14 ativos ainda sem conta/vínculo. Banco ligado a Turma (plano `docs/banco-revisao-turmas-plano.md`): migration 096 no Staging e na produção (2026-10-15, SQL Editor); tela, opção 2 da autora (sem vínculo, cartões da professora somem do Aluno, progresso guardado) e motor da rotina regerado publicados pelo PR #337 (2026-10-15); Edge Function `review-bank-agent` v8 (motor do commit c57286f). "Sandra e Eduardo" vinculado à turma 3 (2026-10-22, autorizado; a Sandra recebe os cartões ao entrar na turma). App de português (`pt`) é urgente: 13 dos 24 alunos estudam português. Registro: `docs/historico/15-auditoria-banco-revisao.md`. Funcionamento (tipos de cartão, Récap, Última aula, Erros, Modo aula x aluno sozinho): `docs/banco-revisao-auditoria.md`; decisões da autora e propostas pendentes de aprovação (estudo em casa alimenta o Banco, tipos de item, botões com intervalo): `docs/banco-revisao-proposta-v2.md`.
- 086 (amigos: foguinho, marcos de sequência, parabéns) aplicada no Staging e na produção (2026-10-13). Conquistas com níveis
  aprovadas (2026-10-14) e publicadas (PR #313); 091 e 092 (Pódio) no Staging e na produção:
  `docs/historico/16-conquistas-com-niveis.md`. Ícones: troca geral para o Fluent Emoji feita na branch (`shared/emoji-icons.js`, `docs/icones-fluent.md`).
- App de loja (App Store/Google Play): antes de discutir, ler `docs/app-loja-lembretes.md` (agenda de contatos, telefone, LGPD).
- Amigos: sugestões de amigos + QR code (095 no Staging e na produção, 2026-10-15; `docs/historico/17-sugestoes-de-amigos.md`).
  Missão em dupla, sequência com amigo, cutucar e push de Amigos na hora (102 + Edge Function `push-dispatch`, Staging e produção,
  2026-10-15; `docs/historico/19-amigos-em-dupla.md`). Mural e convite da professora no idioma de quem recebe (104, Staging e produção);
  convite para ativar as notificações (faixa em Amigos + janela no 1º amigo) publicado (2026-10-15). Missão em dupla automática da semana (4 dias cada, rodízio, Missões do dia clicáveis): 109 no Staging e na produção (2026-10-15); se a 105 de português for para a produção, reaplicar a `_friends_notify_msg` da 109 depois.
- Conta sem perfil corrigida (110, produção, PR #349). Escolher nome e @ uma vez no primeiro acesso (111, só para @ aleatório; @ com ponto): Staging e produção (2026-10-17) (`docs/historico/08-*`, seção 111). Conferir o @ no cadastro sem login (113, `check_username_signup`): Staging e produção (2026-10-18); Entrar no estilo do Busuu e cadastro em 3 passos publicados pelo PR #362 (2026-10-19).
- Banco com agendamento único (FSRS no Modo aula + estudo em casa alimentando o Banco): migration 112 na produção (2026-10-19); teste local `tests/banco-revisao-compartilhado/run.sh` 26/26. Cliente (Modo aula com 4 botões, estudo em casa no Banco, Digitar com Bom/Fácil, Récap com descanso) **publicado na `main` pelo PR #347 (2026-10-20)**; `review-bank-agent` **v10** na produção (2026-10-20, autorizada; motor fixado no commit `54fae3f4` da `main`, core no `c57286f`; sem token = 401). Se o motor mudar de novo: `node scripts/build-review-bank-agent.js`, mesclar e re-fixar o commit. Decisões: `docs/banco-revisao-proposta-v2.md`.
- Pedidos da aluna sobre itens do Banco (cortar, sugerir correção, "parece errado"; professora decide; corte vale para todos, pausa só para quem pediu) e janela Editar no Modo aula (com Cortar dentro): migration `114_review_bank_requests` no Staging e na produção (2026-10-20; não confundir com a `114_etapa4_notification_templates_text`, de outra sessão); telas **publicadas** (PR #347; botão ⋯ na linha do progresso pelo PR #372, 2026-10-21); teste local `tests/banco-revisao-pedidos/run.sh` 27/27. Ainda sem nenhum pedido real. O bloco de estatísticas do aluno no Banco se chama "Desempenho (aula e casa)" e tem uma nota sobre Na aula x Em casa (PR #380, 2026-10-22; o estudo em casa só é gravado desde 19/10). Decisões: `docs/banco-revisao-proposta-v2.md`.
- Faixa "N cartões da sua professora para hoje" (decisão da autora, 2026-10-21, para a aba Aluno > Revisão deixar de ficar escondida): na Revisão (empilhada, acima do resumo) e no Estudo (ao lado do "Continue de onde parou"; no celular fica embaixo); some com 0 cartões; botão abre `startClassReviewSession()`; no celular as duas caixas do Estudo têm o botão embaixo; com a faixa visível o botão geral da Revisão vira "Estudar a trilha (N)". **Publicada na `main` pelo PR #374 (2026-10-21)**; teste `tests/banco-revisao/test_banner_professora.js` 51/51. Medida de adoção em 2026-10-21: das 9 alunas vinculadas, 4 revisaram algum cartão da professora e 0 revisaram 20 ou mais; comparação agendada para 2026-10-29 (aviso automático nesta conversa, `trig_01598QC55hmeqPUh45n1U9uC`).
- Excluir a própria conta (só alunas): Edge Function `delete-my-account` v1 na produção (2026-10-20, sem token = 401) e tela em Configurações publicada (PR #347). Professora/admin ficam bloqueadas. No Staging sobrou 1 report de teste (id 2, "ZZ teste de exclusão de conta").
- Privacidade: rascunho da política (só pt-BR; a versão em inglês está arquivada em `docs/historico/privacidade-rascunho-en-arquivado.json`) na aba temporária "Privacidade" do Painel de Admin (`shared/privacy-draft.js`), só admin vê; vai ao advogado; trechos [CONFIRMAR] pendentes. Quando o menu Mais > Ajuda existir, mover o texto para lá e remover a aba. Aba publicada (PR #347), 39 marcas [CONFIRMAR] pendentes. Ao remover a aba, tirar `privacy` das listas de abas do Admin em `tests/painel-professora/test_playwright.js` e `tests/painel-admin/*_playwright.js` (hoje esperam 6 abas).
- Rotina automática do Banco (tarefa da madrugada -> Edge Function `review-bank-agent`, caixa de entrada e cron; migrations 089, 090 e 097 a 100 na produção, função v10 (2026-10-20), Vault e cron criados em 2026-10-15, token conferido): tarefa agendada **`trig_01Ta2vz9PGZktySgX5qMxQj9`** (a que roda de verdade, com os conectores Supabase, Google Calendar e Google Drive; texto em `docs/rotina-banco/tarefa-nova-producao.txt`, colar de novo se mudar). A cópia `trig_015AkoX1hyDJuWs1MimQDTbE` (sem conectores, oculta na lista por ter sido criada pelo Claude) foi DESLIGADA em 2026-10-28: não editar essa. "Recap dos alunos" (`trig_01VZTHVUBYeczGJMteBYNG3e`) é a rotina ANTIGA do artifact e continua ativa (ainda atende os alunos que não migraram). Gerenciados e arquivados no artifact (2026-10-15): Carmen, Carol, Catharina, Francielly, Luana, Marconi, Rachel; primeira execução manual conferida (Luana: 14 itens, 12 cartões, Récap) e tarefa agendada às 01:50 America/Sao_Paulo (2026-10-15). Ao migrar cada outro aluno, marcar "Atualizar automaticamente" no formulário do aluno (Banco > Alunos > Editar aluno) e arquivá-lo no artifact. **Desde 2026-10-27 (autorizado) a tarefa lê o caderno de quem JÁ TEVE aula** (aula de hoje ou dos 7 dias anteriores, posterior a `last_entry_read`, e quem nunca foi lido), para a revisão ficar pronta no dia seguinte; texto em `docs/rotina-banco/tarefa-nova-producao.txt` igual ao da tarefa agendada (sincronizado com `other_students`). Maxi (Português, caderno próprio) cadastrada em 2026-10-26 e Jordan em 2026-10-23, ambos com atualização automática e sem conta vinculada. Justin (Português, caderno próprio) cadastrado em 2026-10-21 com atualização automática, sem conta vinculada; já lido pela rotina (2026-10-23: 44 itens, 16 pendentes para a autora conferir; 10 alunos gerenciados em 2026-10-27). Duplicatas "Luana Baionne" e "Makena Bento de Azevedo" arquivadas (apagar pelo SQL Editor). Detalhes: `docs/historico/18-rotina-automatica-banco.md`.
- Design System do painel: Pico CSS escopado, sem React e sem build (`shared/painel/`, guia em `shared/painel/guia-de-estilo.html`, ~40 peças + peças do Admin e de Alunos/Aulas). Nunito hospedada em `shared/fonts/`. **Publicado na `main` pelo PR 319 (2026-10-15)**: fundação, Alunos (convite e Decks do aluno), Cartões, Material de apoio e as 5 abas do Admin (Planos, Notificações, Badges, Reports, Analytics); registro em `docs/historico/15-design-system-painel-fase-1.md`. Fora do PR e pendente: tela nova de **Aulas** (Presença, Competências, turma, "Revisar do Notion"), guardada na branch `claude/aulas-design-system`; para trazer de volta precisa de prévia do calendário e do link de agenda, aprovação da autora e a sessão das Aulas (`claude/fervent-noether-9f1ya7`) sem mexer na tela ao mesmo tempo. Banco de Revisão e "Revisar do Notion" mantêm o visual antigo (prévia antes de qualquer mudança visual). Cores das caixas com texto: `--brand-fill` com branco (PR 370, 2026-10-20; azul no fr, vermelho no zh), ver a regra "Caixas da marca com texto" acima.
- Currículo fr, Etapa 0a e 0b parte 1 (mapa gerado do cron, unidade nova aberta, deck de unidade que saiu): `docs/historico/21-*`,
  `22-*`. `STUDY_ITEM_GATE` já no `notification-cron` publicado (v29 e v30).
- Etapa 2 do plano "Voz da Prof. Brune" publicada (PR #363, 2026-10-19): `notification-cron` v30 na produção (sequência em risco só na véspera), modelos de aviso do banco ajustados (`docs/historico/13-*`). Etapa 3 (nada em português no site em inglês) publicada pelo PR #367 (2026-10-19; `docs/historico/13-*`); Módulo 3 do Ouça e traduza: produção com 10, lote do repo com 6, decisão da dona pendente. Etapa 4 (padrão de escrita): migrations 114 e 115 no Staging e na produção, site publicado pelo PR #368 (2026-10-19; `docs/historico/13-*`). Etapa 5 (Premium): auditoria e decisões da dona em `docs/i18n/etapa5-auditoria-premium.md` (Etapa 1 nunca tinha sido feita); Premium Pro fica para o futuro (hoje igual ao Basic).
- Etapa 5 (Premium e limite pela tabela Admin > Planos): migration 116 no Staging e na produção (2026-10-22, prévia aprovada); site publicado pelo PR #382; `tts-generate` v11 na produção (2026-10-22, cota de áudio por texto pela tabela; conta grátis recebe plan_required); 008 corrigida, ainda NÃO aplicar. `docs/i18n/etapa5-auditoria-premium.md` seção 8.
- Telas de exercício no molde da trilha (decisão da autora, 2026-10-23; regra em `.claude/rules/frontend-fr-zh.md`): abertos em 2026-10-27, sem mesclar: PR #408 (a: Revisar erros + comando no idioma do site + Verificar traduzido, base `main`) e PR #409 (b: Jogos, Prática da Conjugação e Expressões em passos; base = branch do (a); depois de mesclar o #408, trocar a base do #409 para `main`). Falta: tradução dos exemplos das Expressões e destaque da expressão na frase (conteúdo das 121 no Supabase, lote à parte), barra e passos nos outros tipos de Desafios, Ditados e Revisão (autoavaliação e Modo aula não mudam). Registro: `docs/historico/23-auditoria-telas-de-exercicio.md`.
- Etapa 6 (boas-vindas por curso A e B, janela da sequência depois do Continuar, XP só ⭐, Pulada única, selo Premium no mapa) publicada pelo PR #413 (2026-10-29; `docs/i18n/etapa6-boas-vindas-proposta.md`). Próxima do plano: Etapa 7 (vocabulário), só com autorização.
- XP da semana no topo ("⭐ N XP", igual ao Ranking Geral) com janelinha das últimas semanas e XP total do curso; avisos +XP não cobrem telas de conclusão: PR #415 (2026-10-29; `.claude/rules/xp.md`).
- Recomeçar o curso (decisões da dona 2026-10-29, `docs/recomecar-curso-opcoes.md`): só "do zero" (zera trilha, FSRS da trilha, XP, Ranking, conquistas, Desafios), cópia por 30 dias, retomada guiada aos 60 dias parado. Conserto P1 (memória dos cartões da professora e próprios por idioma em `progress.data._lang`, espelho nos blocos) publicado pelo PR #415 (2026-10-29; `docs/p1-memoria-por-idioma.md`); o recomeço em si ainda não foi implementado e terá de zerar `_lang` e os blocos do idioma juntos.
- Pendências da autora: "Manual da unidade" (só o já visto, `unitSeenContent` em `shared/core/trilha-licao.js`) talvez no fr no futuro (2026-10-26; hoje só zh); layout do áudio nas opções do checkpoint do zh; módulos/aba de Desafios do chinês;
  diálogos com personagens nomeados (placeholders de perfil); Stripe. País dos alunos: já preenchido nos 13 alunos (conferido 2026-10-14).
