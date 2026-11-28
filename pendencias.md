# Pendências da revisão diária

Memória da tarefa "Revisão diária do trabalho (madrugada)". Só a rotina grava aqui; nada daqui vai para a `main` nem para o site.
Cada pendência fica embaixo da conversa que precisa resolvê-la. Toda noite a rotina confere na `main` (e na produção, só leitura)
quais foram resolvidas, move essas para "Resolvidas" e acrescenta as novas.

Formato de cada linha: `- [P-NNN] [desde DD/MM] [Severo já no ar | Severo corrigir antes de ligar | Médio | Leve] #PR · o problema · onde (arquivo:linha) · como conferir que foi resolvido`

Atualizado em: 28/11

## Conversa "Banco de Revisão" · https://claude.ai/code/session_01MbTyCoU1yEuwCeRkWS9maB
- [P-002] [desde 25/11] [Leve] #518 · o "Estado atual" do `CLAUDE.md` cita a migration 145 (feito no #524), mas ainda não registra a `review-bank-agent` v17 na produção (nenhuma "v17" no arquivo) · `CLAUDE.md` · resolvido quando a linha do Banco citar a versão atual da função
- [P-003] [desde 25/11] [Leve] #518 · ao juntar fichas, o pedido repetido recusado ganha uma marca dentro do texto que a aluna escreveu · `shared/supabase_migrations/145_review_bank_merge_keep_history.sql:70` · resolvido quando o texto da aluna ficar intacto (a marca em outro campo)
- [P-016] [desde 26/11] [Leve] #523 · `sair-cartoes/` nasce com `lang="pt-BR"` e `<title>` em português até o JS rodar; no site em inglês pisca português e, sem JS, fica em branco · `sair-cartoes/index.html:2` e `:27` · resolvido quando o título inicial for neutro e houver `<noscript>` nas duas línguas (ainda aberto em 28/11)
- [P-026] [desde 27/11] [Severo já no ar] #546 · o #546 não fechou o anonimato: `cards_digest_exit_answers` guarda as respostas na ordem de entrada e a mesma saída grava `notification_preferences.updated_at` com a hora exata; ordenando as contas que ficaram com `cartoes_professora` vazio, a ordem bate 1 a 1 com a das respostas; com poucas alunas (e `action`/`lang` que apontam para um grupo) dá para saber quem respondeu, e o texto `admin.overview.exit.note` promete "não dá para saber quem respondeu" · `shared/supabase_migrations/155_cards_digest_anonymous_answers.sql:141-148`, `supabase/functions/teacher-cards-digest/index.ts:79-81` · resolvido quando as respostas forem agregadas (contador por semana/motivo/ação) ou o texto prometer só o que o código cumpre
- [P-032] [desde 28/11] [Leve] #546 · ligar o botão geral de e-mails nas Configurações troca o resumo semanal pelo diário sem avisar (`setAllCategoriesChannel` chama `notifPrefExclusiveDigest` sem `prefer`) · `shared/notification-preferences.js:282-288` · resolvido quando o semanal escolhido for mantido
- [P-033] [desde 28/11] [Leve] #546 · a 155 copia os motivos antigos mas não passa `teacher_cards_digest_prefs.frequency='semanal'` para `channels.cartoes_professora_semanal`: quem escolheu o semanal entre 26 e 27/11 pode ter perdido a escolha; não conferido na produção (CLAUDE.md diz que as tabelas antigas estão vazias) · `shared/supabase_migrations/155_cards_digest_anonymous_answers.sql:152-155` · resolvido quando a produção confirmar 0 linhas semanais
- [P-027] [desde 27/11] [Leve] #532 · botões rosa da página com texto branco `#fff` sobre `#E36BCA` (contraste ~2,9:1) e fora do `docs/email/PADRAO-EMAIL.md:15` (texto escuro); o título do PR sugere que foi pedido da autora, confirmar · `sair-cartoes/index.html:87` e `:94` · resolvido quando a autora confirmar a cor ou o contraste chegar a 4,5:1
- [P-028] [desde 27/11] [Leve] #532 · documentação desatualizada: `docs/email-cartoes-professora-proposta.md:61` ainda diz "produção pendente" para a 149 (já aplicada) e a prévia `docs/email/previas/sair-cartoes-previa.html` citada no CLAUDE.md não está na `main` · `docs/email-cartoes-professora-proposta.md`, `CLAUDE.md` · resolvido quando as duas frases forem corrigidas

## Conversa "Parte visual (Banco)" · https://claude.ai/code/session_019LkmMEe9QHUpJmR6yAr7Rr
- [P-034] [desde 28/11] [Leve] #550 · o botão "Ver item" coloca a pergunta inteira na busca e não limpa; `rbMissStreak` usa só as últimas 1000 respostas; o CLAUDE.md já diz "publicada em 2026-11-28" · `shared/review-bank.js:~853` e `:80` · resolvido quando a busca for limpa ao voltar

## Conversa "Central de Controle plano" · https://claude.ai/code/session_01W7mkF6UAWsrJCnTY3YddXY
- [P-004] [desde 25/11] [Leve] #517 · a contagem "Na aula" de turma ignora a data em que a aluna entrou na turma · `shared/supabase_migrations/146_admin_overview.sql` · resolvido quando a contagem só considerar aulas a partir da entrada da aluna
- [P-009] [desde 26/11] [Médio] #517 · com o filtro Francês, a aluna que estuda português (vínculo só em `portugues`, eventos em `frances`) cai em "Outras contas" e some de "Meus alunos"; contraria a decisão 5.6 do plano · `shared/supabase_migrations/146_admin_overview.sql:32-38` · resolvido quando "Meus alunos" considerar o vínculo ativo da admin em qualquer idioma
- [P-010] [desde 26/11] [Leve] #517 · com o filtro Português os blocos se contradizem (Situação "Em dia", Engajamento e "Em casa" zerados, "Na aula" com números) · `shared/admin-overview.js:50` · resolvido quando houver nota na tela ou a autora decidir o comportamento
- [P-011] [desde 26/11] [Leve] #517 · "Na aula" de aluno individual usa `r.student_id`; revisões do Modo aula feitas antes de a ficha ter conta ligada (student_id nulo) não entram · `shared/supabase_migrations/146_admin_overview.sql:150-157` · resolvido quando usar o `linked_student_id` da ficha
- [P-012] [desde 26/11] [Leve] #517 · o número "Alunos" conta contas e a Situação conta vínculos (aluna com 2 idiomas vale 2); o plano 5.5 pede que a Situação bata 15/15 com a aba Alunos e isso não foi registrado como conferido · `shared/admin-overview.js` · resolvido quando a conferência na produção estiver registrada
- [P-013] [desde 26/11] [Leve] #517 · o plano ainda diz "Nada foi implementado ainda" · `docs/central-de-controle-plano.md:5` · resolvido quando a frase for trocada
- [P-014] [desde 26/11] [Leve] #517 · texto "horário de Londres (UTC)" impreciso (Londres muda no verão) · `shared/i18n/pt-BR.js:2803` e chave `admin.overview.foot.tz` em en · resolvido quando disser só "UTC"

## Conversa "Auditoria de segurança Cloudflare" · https://claude.ai/code/session_01W7mkF892tX2Tp3R8Ti9E7E
- [P-018] [desde 26/11] [Médio] #520 · a CSP só libera `googletagmanager.com`, `*.google-analytics.com` e `*.analytics.google.com` em `connect-src`; o GA4 pode precisar de `www.google.com/ccm/collect` ou `stats.g.doubleclick.net`, e então ficaria bloqueado (a confirmar) · `scripts/csp-atualizar.js` · resolvido quando a autora aceitar os cookies no site no ar, o console não mostrar "Refused to connect" e o "Tempo real" do GA4 mostrar a visita

## Conversa "Parte visual" · https://claude.ai/code/session_019LkmMEe9QHUpJmR6yAr7Rr

## Conversa "Google Analytics" · https://claude.ai/code/session_01W7mkF7qKGxhhZKCmUoXrcy
- [P-007] [desde 25/11] [Severo corrigir antes de ligar] #515 (aberto) · a página `/aulas/` carrega o Google Forms (data de nascimento, LGBTQIA+) antes da escolha de cookies, e é só em português · `aulas/` · resolvido quando o Forms só carregar depois do "Aceitar" (ou virar link) e a autora decidir sobre o idioma

## Conversa "Animações" · https://claude.ai/code/session_01W7mkF6x9GYvaRVyMK1zWSi
- [P-021] [desde 26/11] [Leve] #521 · a cópia "fantasma" de janela fechada mantém `.app-modal-overlay` e `display:flex` por 170 ms: atalhos do teclado (1-4, r, Enter) ficam bloqueados e o aviso de idade/escolha de @ pode atrasar · `shared/janelas-movimento.js:28-37` · resolvido quando a cópia não contar como modal aberto
- [P-022] [desde 26/11] [Leve] #521 · rolagem automática para a unidade recém-liberada, sem o aluno pedir (confirmar com a dona) · `shared/core/trilha-licao.js:~95-105` · resolvido quando a dona confirmar ou o comportamento mudar

## Conversa "Revisão rápida e testes" · https://claude.ai/code/session_01W7mkF892tX2Tp3R8Ti9E7E
- [P-035] [desde 28/11] [Médio] #551 · na Revisão rápida o conserto do verde tira o número do atalho com `replace`, que remove a PRIMEIRA ocorrência; o número fica no FIM do botão: opção "12 ans" + atalho "1" vira "2 ans1" e a certa não fica verde (e o acerto aparece vermelho); o teste repete a mesma lógica · `shared/core/quase-iguais-textos.js:63-65`, `tests/revisao-seguranca/test_a1_texto.js:55-58` · resolvido quando tirar só o sufixo (`slice(0,-hint.textContent.length)`) e o teste tiver opção com dígito igual ao atalho
- [P-036] [desde 28/11] [Leve] #552 · `pickUnique` descarta texto vazio e pode deixar o Complete a frase com menos de 4 opções, sem fallback · `shared/core/licao-exercicios.js` · resolvido quando houver fallback ou teste
- [P-037] [desde 28/11] [Leve] #552 · `docs/deploy/notification-cron-para-colar-no-painel.ts` não é mais comparado pelo teste; apagar ou marcar como arquivo antigo · `tests/pt-servidor/test_cron_pt.js` · resolvido quando o arquivo sair
- [P-038] [desde 28/11] [Leve] #545 · o cartão de Revisão desativado só apaga o conteúdo (fundo e borda ficam ligados) e o `--disabled-fill` não existe no `guia-de-estilo.html` · `fr/index.html:~1804`, `zh/index.html:~2093`, `shared/painel/painel-componentes.css` · resolvido quando a autora aprovar a prévia

## Conversa "Abertura e missões animadas" · https://claude.ai/code/session_01W7mkF5YMW3jR8UcQjjYedq
- [P-039] [desde 28/11] [Leve] #540 · a foto de progresso das Missões não é limpa se a lição é abandonada (pode animar de valor velho) e o "✓ Concluída!" não tem `aria-live` · `shared/core/trilha-licao.js:239` · resolvido quando a foto for limpa
- [P-040] [desde 28/11] [Médio] #534 · o ganho de ~30 s para ~6 s não foi medido em celular real (Chrome, Firefox, Safari/iOS com 176 preloads) e não se conferiu o cache do HTML novo ao vivo · `fr/index.html`, `zh/index.html` · resolvido quando a autora confirmar a abertura no celular

## Conversa "Notificações no celular (Segurança)" · https://claude.ai/code/session_01W7mkF4iqmJot9jd8prH5xV
- [P-041] [desde 28/11] [Leve] #541 · arquivo do Material de apoio sem extensão e com espaço/acento no nome fica com `file_url` codificado e a aluna não consegue abrir (a professora abre) · `shared/teacher-support-materials.js:72`, `shared/supabase_migrations/153_support_materials_private.sql:24` · resolvido quando a extensão for limpa no envio
- [P-042] [desde 28/11] [Leve] #549 · pendência OAuth vencida só perde o token quando alguém inicia nova ligação; sem limpeza agendada · `shared/supabase_migrations/156_oauth_confirm_same_session.sql:255` · resolvido quando houver cron de limpeza
- [P-043] [desde 28/11] [Leve] #537 · regras da admin com `is_admin()` sem `(select ...)` podem ficar lentas na leitura do Analytics · `shared/supabase_migrations/150_admin_policies_is_admin.sql:22` · resolvido quando trocar por `(select public.is_admin())`

## Conversa "Passaporte e selos" · https://claude.ai/code/session_01W7mkF561UhmK9d3RKazEz5
- [P-023] [desde 26/11] [Severo já no ar] #522 · o perfil de conta PRIVADA agora mostra a data de cada conquista (`earned_at`), o que revela quando a pessoa estudou; a leitura de `earned_badges` é aberta a qualquer logado (080_private_profile.sql:104); RLS atual não conferida · `shared/leaderboard.js:339-348`, `shared/public-profile.js:259-266` · resolvido quando a data só aparecer com `isPublic` ou a autora decidir que pode (Severo pela regra da autora: dado de conta privada exposto)

## Conversa "Notificações no celular" · https://claude.ai/code/session_01W7mkF4iqmJot9jd8prH5xV
- [P-030] [desde 27/11] [Leve] #530 · iPhone com o site na Tela de Início e alertas negados cai no texto "desktop" ("Clique no cadeado ao lado do endereço"), mas o app aberto pelo ícone não tem barra de endereço; o caminho certo é Ajustes do iPhone > Notificações · `shared/push-convite.js:298-305` · resolvido quando o texto do iPhone cobrir esse caso

## Perguntas para a autora (não são de nenhuma conversa)
- [P-029] [desde 27/11] [Leve] #532 · a leitura dos motivos de saída (migration 149, `149_cards_digest_weekly_reasons.sql:299`) é liberada a qualquer conta com papel `teacher`: existe outra professora cadastrada além da Brune? Não deu para conferir (sem SQL na revisão) · resolvido quando a autora confirmar que só ela tem o papel

## Resolvidas (ficam 7 dias e saem)
- [P-025] resolvida em 28/11 · #546 · Configurações enxerga o resumo semanal e o servidor só envia se o canal estiver marcado
- [P-006] resolvida em 28/11 · #538 · "Link a caminho" só com "after N seconds"
- [P-020] resolvida em 28/11 · `test_quase_iguais.js` voltou a 2770/2770
- [P-031] resolvida em 28/11 · CLAUDE.md não diz mais "aguardando a autora mesclar"
- [P-015] resolvida em 27/11 · #532 · `sair-cartoes/` agora carrega `anti-moldura.js` e está na lista do teste
- [P-024] resolvida em 27/11 · #530 · migrations 147 e 148 e `push-send` v13 agora estão na `main` (PR mesclado)
- [P-008] resolvida em 26/11 · a autora confirmou que não usou o "Juntar" entre 16/11 e 25/11: nenhuma resposta foi perdida antes da migration 145
- [P-000] resolvida em 25/11 · #517 · migration da Central de Controle renumerada de 145 para 146 (as duas estão na produção sem conflito)
- [P-001] resolvida em 26/11 · #523 · "Parar de receber" agora abre a página `sair-cartoes/` do site (200 no ar), função `teacher-cards-digest` v5 na produção sem JWT
- [P-005] resolvida em 26/11 · #509/#527 · `tests/i18n/test_i18n_unit.js` voltou a passar 2333/2333
