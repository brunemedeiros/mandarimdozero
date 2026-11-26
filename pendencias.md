# Pendências da revisão diária

Memória da tarefa "Revisão diária do trabalho (madrugada)". Só a rotina grava aqui; nada daqui vai para a `main` nem para o site.
Cada pendência fica embaixo da conversa que precisa resolvê-la. Toda noite a rotina confere na `main` (e na produção, só leitura)
quais foram resolvidas, move essas para "Resolvidas" e acrescenta as novas.

Formato de cada linha: `- [P-NNN] [desde DD/MM] [Severo já no ar | Severo corrigir antes de ligar | Médio | Leve] #PR · o problema · onde (arquivo:linha) · como conferir que foi resolvido`

Atualizado em: 26/11

## Conversa "Banco de Revisão" · https://claude.ai/code/session_01MbTyCoU1yEuwCeRkWS9maB
- [P-002] [desde 25/11] [Leve] #518 · o "Estado atual" do `CLAUDE.md` cita a migration 145 (feito no #524), mas ainda não registra a `review-bank-agent` v17 na produção (nenhuma "v17" no arquivo) · `CLAUDE.md` · resolvido quando a linha do Banco citar a versão atual da função
- [P-003] [desde 25/11] [Leve] #518 · ao juntar fichas, o pedido repetido recusado ganha uma marca dentro do texto que a aluna escreveu · `shared/supabase_migrations/145_review_bank_merge_keep_history.sql:70` · resolvido quando o texto da aluna ficar intacto (a marca em outro campo)
- [P-015] [desde 26/11] [Leve] #523 · a página nova `sair-cartoes/` não carrega `shared/anti-moldura.js` e não entra na lista de `tests/anti-moldura/test_playwright.js` (regra em `.claude/rules/frontend-fr-zh.md:104`) · `sair-cartoes/index.html` · resolvido quando a página carregar o script e o teste a listar
- [P-016] [desde 26/11] [Leve] #523 · `sair-cartoes/` nasce com `lang="pt-BR"` e `<title>` em português até o JS rodar; no site em inglês pisca português e, sem JS, fica em branco · `sair-cartoes/index.html:2` e `:27` · resolvido quando o título inicial for neutro e houver `<noscript>` nas duas línguas

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
- [P-006] [desde 25/11] [Médio] #516 · no "Esqueci a senha", qualquer erro 429 vira "Link a caminho"; no limite geral nenhum e-mail sai e a aluna espera à toa · `index.html:919-924` (`gateForgotWaitSeconds`) · resolvido quando só o 429 com "after N seconds" mostrar "Link a caminho"

## Conversa "Google Analytics" · https://claude.ai/code/session_01W7mkF7qKGxhhZKCmUoXrcy
- [P-007] [desde 25/11] [Severo corrigir antes de ligar] #515 (aberto) · a página `/aulas/` carrega o Google Forms (data de nascimento, LGBTQIA+) antes da escolha de cookies, e é só em português · `aulas/` · resolvido quando o Forms só carregar depois do "Aceitar" (ou virar link) e a autora decidir sobre o idioma

## Conversa "Animações" · https://claude.ai/code/session_01W7mkF6x9GYvaRVyMK1zWSi
- [P-021] [desde 26/11] [Leve] #521 · a cópia "fantasma" de janela fechada mantém `.app-modal-overlay` e `display:flex` por 170 ms: atalhos do teclado (1-4, r, Enter) ficam bloqueados e o aviso de idade/escolha de @ pode atrasar · `shared/janelas-movimento.js:28-37` · resolvido quando a cópia não contar como modal aberto
- [P-022] [desde 26/11] [Leve] #521 · rolagem automática para a unidade recém-liberada, sem o aluno pedir (confirmar com a dona) · `shared/core/trilha-licao.js:~95-105` · resolvido quando a dona confirmar ou o comportamento mudar

## Conversa "Passaporte e selos" · https://claude.ai/code/session_01W7mkF561UhmK9d3RKazEz5
- [P-023] [desde 26/11] [Severo já no ar] #522 · o perfil de conta PRIVADA agora mostra a data de cada conquista (`earned_at`), o que revela quando a pessoa estudou; a leitura de `earned_badges` é aberta a qualquer logado (080_private_profile.sql:104); RLS atual não conferida · `shared/leaderboard.js:339-348`, `shared/public-profile.js:259-266` · resolvido quando a data só aparecer com `isPublic` ou a autora decidir que pode (Severo pela regra da autora: dado de conta privada exposto)

## Conversa branch `claude/relaxed-sagan-7lyu9c` · https://claude.ai/code/session_01W7mkF4iqmJot9jd8prH5xV
- [P-024] [desde 26/11] [Médio] sem PR · migrations 147 (`reports_insert_own`) e 148 (`push_subscriptions_owner_update`) e `push-send` v13 já estão na produção (e 147/148 no Staging), mas o código só existe nessa branch, fora da `main`; o "Estado atual" não registra · branch `claude/relaxed-sagan-7lyu9c` · resolvido quando a branch for mesclada (arquivos 147/148 na `main`)

## Perguntas para a autora (não são de nenhuma conversa)
- [P-020] [desde 26/11] [Leve] `tests/paridade-sites/test_quase_iguais.js` passou de 2770/2770 para 2764/2770: 6 cenas de Configurações no site em inglês (fr e zh) mostram o seletor de exportar em inglês ("Unit", "All units") e a referência do teste tem "Unidade"/"Todas as unidades". O inglês ESTÁ CERTO (a chave `settings.export.allUnits` = "All units" existe em `shared/i18n/en.js:199`); muito provavelmente antes vazava português ali e alguém consertou. NÃO mexer no texto do site: só atualizar a referência do teste (conferido pelo Claude em 26/11) · `tests/paridade-sites/test_quase_iguais.js` · resolvido quando o teste voltar a 2770/2770 sem português no site em inglês

## Resolvidas (ficam 7 dias e saem)
- [P-008] resolvida em 26/11 · a autora confirmou que não usou o "Juntar" entre 16/11 e 25/11: nenhuma resposta foi perdida antes da migration 145
- [P-000] resolvida em 25/11 · #517 · migration da Central de Controle renumerada de 145 para 146 (as duas estão na produção sem conflito)
- [P-001] resolvida em 26/11 · #523 · "Parar de receber" agora abre a página `sair-cartoes/` do site (200 no ar), função `teacher-cards-digest` v5 na produção sem JWT
- [P-005] resolvida em 26/11 · #509/#527 · `tests/i18n/test_i18n_unit.js` voltou a passar 2333/2333
