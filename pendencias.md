# Pendências da revisão diária

Memória da tarefa "Revisão diária do trabalho (madrugada)". Só a rotina grava aqui; nada daqui vai para a `main` nem para o site.
Cada pendência fica embaixo da conversa que precisa resolvê-la. Toda noite a rotina confere na `main` (e na produção, só leitura)
quais foram resolvidas, move essas para "Resolvidas" e acrescenta as novas.

Formato de cada linha: `- [P-NNN] [desde DD/MM] [Severo já no ar | Severo corrigir antes de ligar | Médio | Leve] #PR · o problema · onde (arquivo:linha) · como conferir que foi resolvido`

Atualizado em: 25/11 (ponto de partida, montado a partir da revisão de 25/11)

## Conversa "Banco de Revisão" · https://claude.ai/code/session_01MbTyCoU1yEuwCeRkWS9maB
- [P-001] [desde 25/11] [Severo já no ar] #508/#511 · o link "Parar de receber" do e-mail de cartões abre como texto cru (o Supabase devolve text/plain no GET em *.supabase.co); quem clica no rodapé não consegue sair · `supabase/functions/teacher-cards-digest/index.ts` · resolvido quando o link apontar para uma página do site (app.profbrune.com.br) que faz o POST, ou quando o GET voltar a gravar a saída
- [P-002] [desde 25/11] [Leve] #518 · o "Estado atual" do `CLAUDE.md` não registra a migration 145 nem a `review-bank-agent` v17 (ainda diz v10) · `CLAUDE.md` · resolvido quando a linha do Banco citar a 145 e a versão atual da função
- [P-003] [desde 25/11] [Leve] #518 · ao juntar fichas, o pedido repetido recusado ganha uma marca dentro do texto que a aluna escreveu · `shared/supabase_migrations/145_review_bank_merge_keep_history.sql:175` · resolvido quando o texto da aluna ficar intacto (a marca em outro campo)

## Conversa "Central de Controle plano" · https://claude.ai/code/session_01W7mkF6UAWsrJCnTY3YddXY
- [P-004] [desde 25/11] [Leve] #517 · a contagem "Na aula" de turma ignora a data em que a aluna entrou na turma · `shared/supabase_migrations/146_admin_overview.sql` · resolvido quando a contagem só considerar aulas a partir da entrada da aluna

## Conversa "Auditoria de segurança Cloudflare" · https://claude.ai/code/session_01W7mkF892tX2Tp3R8Ti9E7E
- [P-005] [desde 25/11] [Médio] #492/#504 · a chave nova `admin.reports.detail.screenshotError` ficou fora da lista NEW_KEYS e `tests/i18n/test_i18n_unit.js` passou de 4 para 5 falhas · `tests/i18n/test_i18n_unit.js` · resolvido quando o teste voltar a 4 falhas (ou menos)

## Conversa "Parte visual" · https://claude.ai/code/session_019LkmMEe9QHUpJmR6yAr7Rr
- [P-006] [desde 25/11] [Médio] #516 · no "Esqueci a senha", qualquer erro 429 vira "Link a caminho"; no limite geral nenhum e-mail sai e a aluna espera à toa · tela do portão (Esqueci a senha) · resolvido quando só o 429 com "after N seconds" mostrar "Link a caminho"

## Conversa "Google Analytics" · https://claude.ai/code/session_01W7mkF7qKGxhhZKCmUoXrcy
- [P-007] [desde 25/11] [Severo corrigir antes de ligar] #515 (aberto) · a página `/aulas/` carrega o Google Forms (data de nascimento, LGBTQIA+) antes da escolha de cookies, e é só em português · `aulas/` · resolvido quando o Forms só carregar depois do "Aceitar" (ou virar link) e a autora decidir sobre o idioma

## Perguntas para a autora (não são de nenhuma conversa)
- [P-008] [desde 25/11] Alguma ficha foi juntada no Banco entre 16/11 e 25/11 (antes da migration 145)? Se sim, as respostas dos itens repetidos podem ter sido apagadas.

## Resolvidas (ficam 7 dias e saem)
- [P-000] resolvida em 25/11 · #517 · migration da Central de Controle renumerada de 145 para 146 (as duas estão na produção sem conflito)
