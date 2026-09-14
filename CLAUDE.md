# Diretrizes para trabalho neste repositório

## Coerência pedagógica entre funcionalidades

Antes de ativar, unir ou reaproveitar duas funcionalidades/dados (ex: usar a
nota gramatical de uma unidade como explicação de um exercício específico,
ou reaproveitar um componente de outro contexto), **verifique se existe uma
relação pedagógica real entre os dois**, não só uma relação estrutural de
código (mesma unidade, mesmo arquivo, mesmo tipo de dado).

Caso concreto que motivou esta regra: o painel "Por que errei?" do
Verdadeiro/Falso usava a nota gramatical genérica da unidade (primeiro item
de `usageNote`/`GRAMMAR_NOTES`) como explicação, só porque os dois viviam na
mesma unidade — mas em vários casos reais a nota falava de um assunto
totalmente diferente da afirmação testada (ex: claim sobre "谢谢/obrigado"
mostrando explicação sobre o verbo 是). Corrigido dando a cada item de
`trueFalseExercises` um `whyNote` autorado especificamente para aquela
afirmação (ver PRs #74/#75).

Ao revisar ou construir algo assim, pergunte: "essa explicação/conteúdo
reutilizado realmente responde à pergunta específica que o aluno está vendo
na tela, ou só está ali porque estava disponível/próximo no código?"

## Passos manuais (migrações Supabase etc.) sempre entregues junto

Sempre que um PR exigir uma ação manual da autora (rodar uma migration SQL no
Supabase, configurar algo no dashboard, etc.), o link/instrução correspondente
deve ser entregue **junto com o aviso de que o passo é necessário** — no mesmo
resumo de entrega do PR/feature — nunca só depois que ela perguntar por ele.

Regra motivadora, verbatim: "Lembre que se eu tiver que fazer alguma
alteração manual, não quero ter que pedir por algo que poderia ter sido
enviado anteriormente."

Na prática: ao terminar de mergear um PR que criou uma migration nova (ou
qualquer outro passo manual), o link direto do arquivo já deve estar na
mensagem final, não só a menção de que "uma migração é necessária". Se várias
migrações pendentes se acumularem (ainda não confirmadas como rodadas),
relistar todas com seus links a cada entrega nova, não só a mais recente.

## Considerar plano gratuito x premium em toda funcionalidade nova

O objetivo do produto deixou de ser só estudo pessoal: a direção agora é
crescer a plataforma e planejar funcionalidades premium oferecidas dentro de
um plano de assinatura pago. Ao planejar ou implementar qualquer
funcionalidade nova, **avalie explicitamente se faz sentido diferenciar
comportamento entre conta do plano gratuito e conta premium** — nem toda
feature precisa de uma versão paga, mas a pergunta precisa ser levantada, não
ignorada por padrão.

Regra motivadora, verbatim (dita durante o planejamento do sistema de
notificações): "esse produto deixou de ser apenas para estudo pessoal há
muito tempo. Registre que o objetivo agora em mente é dilapidá-lo e planejar
funções premium que serão ofertadas dentro de um plano de assinatura. Cada
nova funcionalidade deve levar isso em consideração, se for relevante,
distinguir entre usuário do plano gratuito e do premium."

Na prática: qualquer auditoria/proposta de arquitetura pra uma feature nova
(como a do sistema de notificações em andamento) deve incluir explicitamente
uma seção sobre o que seria gratuito vs. premium naquela feature, mesmo que a
resposta provisória seja "tudo grátis por enquanto" — não pular essa
pergunta. Hoje **não existe nenhuma infraestrutura de assinatura/pagamento no
código** (sem Stripe, sem tabela de planos, sem checagem de tier em lugar
nenhum) — não presumir que algo disso já existe; auditar antes de propor,
mesmo princípio já usado na auditoria do sistema de notificações.

## Código pronto no repositório não prova que a infraestrutura está ativa em produção

**Atualização (2026-09-14): o Resend FOI ativado.** Confirmado ao vivo nesta
data — domínio `profbrune.com.br` verificado no Resend (DKIM/SPF ok), API key
`supabase-producao` criada e colada pela autora nos Secrets do Supabase
(`RESEND_API_KEY`), `RESEND_FROM_EMAIL` definido como
`notificacoes@profbrune.com.br`, e um e-mail de teste enviado de verdade
(via `mcp__Resend__send-email`) chegou em `brunemed1310@gmail.com`. A partir
de agora, `notification-cron` e `report-reply-send` podem ser tratados como
realmente ativos em produção — não mais como "código escrito, nunca
testado". Se uma sessão futura encontrar erro `email_not_configured` ou
e-mails não chegando, é uma REGRESSÃO (secret removido/expirado, domínio
perdeu verificação, etc.), não o estado original "nunca configurado".

O histórico de tarefas registrava "Fase5.4: cron ganha envio de e-mail (via
Resend)" e "Fase5.7: validar e entregar" como concluídas, mas isso descrevia
só o CÓDIGO ter sido escrito/mergeado — não que o envio de e-mail estivesse
de fato configurado e funcionando no projeto Supabase real. Por um bom
tempo, **o envio de e-mail via Resend não chegou a ser implementado/ativado
de verdade**: sem conta Resend configurada, sem domínio de envio verificado,
sem as secrets `RESEND_API_KEY`/`RESEND_FROM_EMAIL` definidas em Edge
Functions > Secrets. Isso só mudou na data acima.

Regra motivadora, verbatim: "A função do email foi pausada e nós não
adicionamos ainda no documento, como você não percebeu isso?" — motivado por
eu ter presumido (ao construir a Edge Function report-reply-send, PR #183)
que o Resend já estava ativo em produção só porque o código do
notification-cron existia e o histórico de tarefas marcava a fase como
concluída.

Na prática: nenhuma sessão de trabalho aqui tem visibilidade do estado ao
vivo do projeto Supabase (secrets configuradas, functions pausadas/ativas,
crons agendados, contas de serviços externos) — só o que está no
repositório Git, a menos que ferramentas MCP com acesso direto (Resend,
Supabase) estejam disponíveis na sessão e sejam usadas pra checar o estado
ao vivo antes de presumir qualquer coisa (foi assim que a ativação do
Resend acima foi confirmada, não por dedução). **Nunca presumir que uma
peça de infraestrutura externa (push, pagamento, um serviço externo novo
etc.) está ativa em produção só porque o código dela existe e uma tarefa
anterior foi marcada como concluída** — isso prova só que o código foi
escrito, nunca que o serviço externo por trás dele foi de fato
configurado/testado ao vivo, exceto quando (como o Resend agora) uma sessão
já verificou isso ao vivo e registrou aqui. Qualquer feature nova que
dependa de um serviço externo ainda não confirmado ao vivo deve deixar
claro que essa confirmação está pendente, e que configurar/ativar esse
serviço é um passo manual pendente adicional, entregue junto (ver regra
acima de "Passos manuais").
