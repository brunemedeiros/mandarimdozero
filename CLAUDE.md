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

**Migrações já aplicadas ao vivo por uma sessão (via MCP Supabase), não
"pendentes":** `023_add_admin_mode_to_profiles.sql` (Admin Mode ON/OFF,
2026-09-14) -- coluna `profiles.admin_mode boolean not null default true`,
aditiva/sem risco, aplicada diretamente via `mcp__Supabase__apply_migration`
no projeto `eigjocalzwamisgqilhg` na mesma sessão que a criou. Nenhuma ação
manual da autora é necessária pra essa. Sempre que uma sessão futura tiver
acesso ao MCP do Supabase e a migration for aditiva/de baixo risco (nova
coluna com default, nova tabela), preferir aplicar direto e registrar aqui
como feito, em vez de deixar como pendência pra autora rodar manualmente.

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

**Achado adicional na mesma data, mesmo princípio em outra camada:** infra
(Resend) e código (`notification-cron`) prontos NÃO significam que os
DADOS que o código depende também estavam lá. `select channel, count(*)
from notification_templates group by channel` no banco real mostrou
**zero linhas `channel='email'`** -- a migration `015_seed_reengagement_
email_templates.sql` (dias 9/15/20/30 de inatividade) nunca tinha sido
aplicada de fato (`list_migrations` também vinha vazio). Sem essas linhas,
`pickEmailTemplate()` nunca encontrava nada, `sendEmailToUser()` nunca era
chamada -- o cron rodava todo dia (`cron.job` confirma agendado, ativo, às
22h UTC) sem jamais mandar um e-mail, silenciosamente. Aplicada agora
(2026-09-14) e testada com o conteúdo REAL do template `user_inactive_9`
(não texto genérico), entregue em `brunemed1310@gmail.com`.

**IMPORTANTE -- o que continua sem e-mail:** `streak_at_risk`,
`streak_completed`, `achievement_unlocked`, `xp_earned` e todos os outros
event_types (ranking, missões do dia etc.) só têm `channel='in_app'` --
**nunca existiu conteúdo de e-mail escrito pra eles**, nem no repositório.
Só a faixa de reengajamento (`user_inactive_9/15/20/30`) tem e-mail hoje.
Se pedirem pra "testar o e-mail de streak/badge", isso não é reativação --
é uma feature nova (escrever o texto, inserir na tabela), não presumir que
já existe só porque o canal 'email' existe no schema.

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

## Tokens de cor de marca vs. semânticos: `color` some junto com `background`

Ao sobrescrever a cor de um botão (ou qualquer elemento) que herda estilo
de uma classe base como `.btn-primary`, **sempre revise/sobrescreva a cor
do TEXTO junto com a do fundo, nunca só uma das duas** — e valide o
contraste resultante nos dois temas (claro e escuro), não só num deles.

Caso concreto que motivou esta regra: ao dar cor própria (vermelho/verde)
para os botões "Continuar" dos painéis de acerto/erro de exercício, só o
`background` foi sobrescrito (`background: var(--error-red)` /
`background: var(--jade)`). A cor do texto continuou herdada de
`.btn-primary{ color: var(--on-seal-red) }`. Em `zh/index.html`,
`--seal-red` é vermelho de verdade e `--on-seal-red` é branco no tema
claro — por coincidência funcionava bem em cima do vermelho/verde. Mas em
`fr/index.html`, `--seal-red` é a cor de marca AZUL (`#3498D6`, não
vermelha — reaproveita o nome da variável zh só por conveniência de código
compartilhado) e `--on-seal-red` no claro é `#201335` (quase preto,
calibrado pra ler bem sobre azul claro) — texto quase ilegível sobre o
vermelho/verde escuros do painel. Bug real de contraste, não intencional,
só notado porque a autora testou visualmente e perguntou "isso é
intencional?" (ver commit `fea1d62`).

**Token certo pra esse caso, já existente no código:** `--on-vivid`. Ele é
definido especificamente pra texto sobre `--error-red`/`--jade` (as duas
cores "vívidas"/semânticas do app, que existem idênticas em fr e zh) e já
inverte corretamente entre os temas: branco no claro (porque error-red/jade
são escuros no claro) e escuro no escuro (porque ficam mais claros/pastel
no tema escuro) — ao contrário de `--on-seal-red`, que acompanha a
luminosidade da cor de MARCA (`--seal-red`), não a de erro/sucesso. Já
usado em `.grade-again`/`.grade-easy` nos dois idiomas.

**Regra geral de tokens de cor neste repo** (vale além deste caso
específico): variáveis com nomes que soam "genéricos" ou "de marca"
(`--seal-red`, `--imperial-gold` etc.) podem ter valores **diferentes e
semanticamente distintos entre fr e zh** — fr reaproveita nomes de
variável do zh por conveniência de código compartilhado, não porque o
significado é o mesmo. Antes de usar uma variável de cor num idioma,
**leia a definição dela no `:root` daquele arquivo específico**, não
assuma que o nome descreve a cor. Ao adicionar cor customizada a um
elemento que herda de uma classe base, trate `background` e `color` como
um par que precisa ser revisado junto, e prefira reaproveitar um token
"on-*" que já existe no arquivo (ex: `--on-vivid`, `--on-seal-red`) em vez
de cravar `white`/`black`/hex fixo, que quebra em um dos dois temas.

Na prática: qualquer PR que adicione uma cor de fundo customizada a um
componente (botão, badge, chip etc.) deve, antes de ser dado como pronto,
ser validado visualmente (screenshot Playwright é suficiente) nos 4
cenários: fr claro, fr escuro, zh claro, zh escuro — não só um idioma ou
só um tema, mesmo que a mudança "pareça" só visual/de posição.

## Edge Functions: um fix no código só vale em produção depois de um novo deploy

Diferente de front-end (fr/zh, `shared/*.js` — servidos estático, refletem
o commit assim que o GitHub Pages publica), uma Edge Function do Supabase
só passa a rodar com o código novo depois de um `deploy_edge_function`
(ou `supabase functions deploy` manual) — commitar/mergear sozinho não
basta, a versão antiga continua ativa e sendo invocada pelo cron/trigger
normalmente. Mesmo princípio da regra "código pronto não prova
infraestrutura ativa" acima, aplicado a uma correção, não só a uma
feature nova.

Caso concreto: `notification-cron` estava contando revisão atrasada
(`computeReviewOverdueCount`) sem respeitar o mesmo gate de "lição
concluída" que a tela Revisão já aplica (`isCardLessonCompleted`,
fr/zh `app.js`) — um cartão praticado dentro da própria lição em
andamento (reps>0, due vencido) gerava a notificação "N palavras prontas
pra revisar" mesmo com a tela mostrando 0. Relatado pela autora
(2026-09-15, print da tela real). Corrigido replicando o gate no servidor
via `LESSON_VOCAB_MAP`/`isCardLessonCompletedServer` (mesmo espírito de
duplicação do `MISSION_POOLS` já existente no arquivo — `content.js` não
é importável no runtime da function). **Deploy feito ao vivo nesta
mesma sessão** via `mcp__Supabase__deploy_edge_function` no projeto
`eigjocalzwamisgqilhg` (`notification-cron` v13→v14, mesmo `verify_jwt`) —
não é um passo manual pendente pra essa correção específica.

Na prática: sempre que uma sessão futura corrigir um bug de LÓGICA (não
só de schema) numa Edge Function já ativa em produção, o commit sozinho
não é o fim da tarefa — ou faz o deploy direto (se tiver acesso MCP ao
Supabase, como neste caso, e a mudança for um fix comportamental
razoavelmente contido, não uma mudança arquitetural grande) e registra
aqui como feito, ou deixa claríssimo pra autora que o deploy ainda está
pendente e é o que falta pra corrigir isso em produção — nunca deixar
implícito que "meu código corrige, então já era".

**Segundo caso registrado (2026-09-16), mesmo princípio:** grilling
"missões do dia" (reviews15/overdue3/matchGame1/speedReview1 podiam
sortear metas impossíveis de cumprir contra o estoque real de revisão,
ex. "Revise 15 cartões" com só 10 disponíveis) mudou `notification-cron`
pra parar de resortear as missões com sua própria cópia de
MISSION_POOLS/dailySeed/pickDailyFromPool e passar a ler a atribuição já
congelada pelo cliente em `state.daily.missions`. **Deploy feito ao vivo
nesta mesma sessão** via `mcp__Supabase__deploy_edge_function`
(`notification-cron` v14→v15, mesmo `verify_jwt:true`) — não é um passo
manual pendente pra essa correção.
