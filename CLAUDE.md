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

## Camada de "notas de realidade" (sociolinguística) -- proposta grillada, taxonomia travada em código, conteúdo ainda não escrito

Grilling completo (2026-09-17) sobre uma proposta de mostrar ao aluno o
contraste "forma ensinada vs. forma real" (registro cotidiano, gíria,
variação regional, desvio gramatical coloquial aceito na fala) — ex:
"Comment allez-vous ?" ensinado vs. "Ça va ?" no dia a dia; "早上好"
ensinado vs. "早" sozinho entre conhecidos; "pain au chocolat" no norte
da França vs. "chocolatine" no sudoeste/Canadá francófono; "Je ne sais
pas" (padrão) vs. "Je sais pas" (queda do "ne" na fala informal).

**Decisões do grilling, já travadas em código** (`REALITY_NOTE_CATEGORY`/
`REALITY_NOTE_LEVEL_GUIDANCE`/`isRealityNoteCategoryAllowedAtLevel` em
`fr/app.js` e `zh/app.js`, logo antes de `// ---------- Estado global`):

- **Onde mora o conteúdo**: dentro de `concepts` (já existe, já funciona,
  já tem gatilho de inserção mid-lição — `trigger: {afterVocabIdx}` ou
  `{after:'dialogue'}`), com um discriminador `kind`, não um sistema novo
  com fluxo de revisão tipo `challenges` (que hoje só existe em francês —
  construir a contraparte em chinês do zero seria caro demais pro MVP).
  **Sem gate de revisão editorial hoje** — risco de qualidade conhecido e
  aceito conscientemente, não esquecido: conteúdo sociolinguístico é
  fácil de generalizar/exagerar errado (registro varia por região/geração/
  contexto) e ninguém revisa antes de publicar, diferente do fluxo
  `needs_review→approved` do `challenges`.
- **MVP = card passivo, não exercício interativo.** A seção "exercício de
  reconhecimento" (`testableInExercise`) fica adiada pra uma fase 2
  explícita — é engenharia real e separada (novo formato de exercício,
  `trueFalseExercises`/`whyNote` confirmado NÃO reaproveitável pra isso,
  é binário verdadeiro/falso, não escolha entre opções).
- **Gratuito x Premium**: tudo grátis por enquanto (conteúdo sem custo
  marginal). Se o exercício interativo da fase 2 sair do papel, reavaliar
  se ELE vira premium (é uma modalidade de prática nova, diferente do card
  informativo) — não travado em código, só registrado aqui como pergunta
  em aberto quando chegar a hora.
- **Piloto, não currículo inteiro**: começar em poucas unidades antes de
  espalhar — autoria de nota sociolinguística de qualidade por item é
  trabalho real, ainda mais sem revisão formal.
- **4 categorias fechadas** (não string livre — precisa de badge/cor
  consistente na UI quando isso for implementado):
  - `informal` — registro cotidiano ainda reconhecível como a mesma forma,
    só mais casual.
  - `familiar-giria` — registro marcado (meuf/mec), exige mais cuidado
    social que `informal`, badge/cor OBRIGATORIAMENTE diferente (mesmo
    princípio já registrado acima sobre `--on-vivid` vs `--on-seal-red`:
    reaproveitar o badge de `informal` pra isto seria o mesmo tipo de erro).
  - `regional` — variação lexical por lugar, **sem forma "oficial"**
    (`variants: [{region, form}, ...]`, nunca um par `learned`/`everyday`
    — pode ter 2+ opções, todas igualmente corretas, cada uma com o lugar
    onde é ouvida; não se limita a um par).
  - `gramatica-coloquial` — desvio GRAMATICAL real (não só léxico) já
    aceito na fala, ex. queda do "ne". Diferente das outras 3: esta é a
    única categoria com um caminho pensado pra ATRAVESSAR pra dentro da
    correção de exercícios comuns — se o aluno digitar a forma coloquial
    num exercício normal de digitar, a ideia é aceitar como correta MAS
    mostrar a forma padrão ao lado (mesmo espírito do status "quase"/
    "almost" que já existe na correção de conjugação — só que o tom aqui é
    "correto, isto é a forma padrão", não "quase errado"). **Isso NÃO foi
    implementado** — decidir onde a nota mora por item e alterar
    `finish()`/painéis de feedback dos exercícios digitados é o próximo
    passo explícito antes de tocar em correção de verdade, não decidir
    de improviso numa sessão futura.
- **4 eixos de "profundidade" por nível, travados em código como
  parâmetros prontos, só o eixo 1 realmente em uso hoje**: hoje só existe
  conteúdo no nível inicial (`A1` no francês, 20 unidades/6 módulos;
  `HSK1` no chinês — **chaves diferentes entre os dois arquivos, de
  propósito, porque são os valores reais que `content.js` usa** — copiar
  a chave "A1" pro chinês sem checar seria exatamente o tipo de erro que
  motivou a sessão de grilling anterior sobre o tom do pinyin, ver seção
  acima). Os 3 eixos abaixo além do primeiro são hipotéticos até A2/HSK2+
  existir de verdade:
  1. `explanationDepth` (curta/média/alta) — quanto escrever por nota. Só
     eixo aplicado hoje (A1/HSK1 = curta). Decisão editorial, não
     enforçada em código (não há linter de tamanho de texto neste repo).
  2. `testableInExercise` (bool) — se a categoria pode virar exercício de
     reconhecimento (fase 2 acima). `false` em A1/HSK1 e A2/HSK2, `true` a
     partir de B1/HSK3.
  3. `categoriesAllowed` — quais das 4 categorias cada nível já usa.
     `familiar-giria` só a partir de A2/HSK2 (não A1/HSK1) — é a categoria
     de registro mais marcado, faz sentido só depois que o aluno já
     entende a distinção básica padrão/informal.
  4. `densityPerUnit` ({min,max} numérico, não string — pensado pra um
     futuro script de auditoria de conteúdo poder checar isso sem precisar
     mudar o shape de novo).
- Função `isRealityNoteCategoryAllowedAtLevel(category, level)` é o único
  ponto de checagem pretendido pra "esta categoria pode aparecer neste
  nível" — qualquer código futuro que filtre por nível deve chamar isto,
  não reimplementar a lógica solta em outro lugar.

**Nada disso está wireado em nenhum render/exercício ainda** — é
taxonomia + parâmetros de nível travados, zero nota de realidade
escrita, zero mudança de comportamento visível pro aluno. O próximo passo
de uma sessão futura que retomar isto é: (1) escrever o piloto de
conteúdo pra algumas unidades A1/HSK1 usando essa taxonomia, (2) decidir
o shape exato de onde a nota mora dentro de `concepts` (novo `kind` no
item existente, ver acima), (3) só depois disso considerar a fase 2
(exercício testável) e a integração de `gramatica-coloquial` na correção.

**Atualização (2026-09-17): piloto de conteúdo escrito, itens (1) e (2)
acima resolvidos.** Item de `concepts` ganhou `kind: 'reality'` +
`category` (uma das 4 da taxonomia) + `variants: [{region, form}]` opcional
(só pra `regional`, alternativa a `examples` já que essa categoria não tem
forma "oficial"). `renderConceptStep()` (fr/app.js e zh/app.js) passou a
trocar o texto do `.acq-phase-banner` conforme a categoria
(`REALITY_NOTE_BANNER_TEXT`, logo depois de `isRealityNoteCategoryAllowedAtLevel`
nos dois arquivos) e a renderizar `variants` como lista simples
(`.gram-block-variants`, nova regra CSS nos dois `index.html`, reaproveita
`var(--ink)` — mesmo token já usado por `.gram-block-body`, então não há
risco de contraste novo por tema/idioma, ao contrário do caso do botão
Continuar registrado na seção de tokens de cor acima). Sem badge/cor por
categoria ainda (MVP = só texto+emoji no banner, ver decisão travada
acima) — só vira obrigatório quando `familiar-giria` ganhar conteúdo de
verdade (ainda não tem, ver abaixo).

Conteúdo escrito, 5 notas ao todo:
- **fr** (3 unidades, as 3 categorias não-`familiar-giria` usadas, uma vez
  cada): A1-1 `informal` ("s'il vous plaît" → "s'il te plaît"/STP, ligado
  ao vocabulário da própria lição); A1-2 `gramatica-coloquial` ("tu es" →
  "t'es", disparado depois do diálogo que tem exatamente essa frase); A1-3
  `regional` (o "vingt" recém-ensinado é a base de quatre-vingts/80 na
  França — variantes: septante/huitante/nonante na Bélgica e Suíça).
- **zh** (2 unidades, só `informal` e `gramatica-coloquial` — ver abaixo
  por que `regional` ficou de fora): Unit 1 `informal` (早上好 → 早, o
  próprio caso concreto citado na proposta original da feature); Unit 2
  `gramatica-coloquial` (我是巴西人 → 我巴西人 sem o 是 na fala casual,
  disparado depois do diálogo).

**Por que zh não tem uma nota `regional` no piloto:** procurei um exemplo
genuíno (variação lexical por região, tipo pain au chocolat/chocolatine)
ligado ao vocabulário de fato ensinado nas Units 1-3 (saudações,
nome/nacionalidade, números/idade) e não achei nada em que eu tivesse
confiança alta — o candidato mais próximo (perguntar 你是哪国人 vs 你是哪里人)
não é uma variação regional da MESMA forma, é uma pergunta diferente. Forçar
um exemplo fraco só pra ter as 3 categorias representadas nos dois idiomas
teria sido exatamente o erro que esta seção inteira existe pra evitar (ver
"coerência pedagógica" no topo deste arquivo). O candidato mais forte que
encontrei (variação de nome de comida, ex. 土豆/马铃薯 pra "batata" ou
西红柿/番茄 pra "tomate") precisa de uma unidade que ensine vocabulário de
comida — Unit 5 ("Comida e bebida") existe mas nenhuma palavra ensinada lá
(吃/喝/米饭/面/水/茶/咖啡) tem uma variante regional bem documentada. Quando uma
unidade futura ensinar um substantivo concreto com variação regional
conhecida, esse é o lugar certo pra a primeira nota `regional` do zh — o
código (`variants`, render) já está pronto, só falta o exemplo.

**Ainda não implementado** (é o próximo passo explicitamente pedido em
seguida, ainda não iniciado): a integração de `gramatica-coloquial` na
correção de exercícios digitados (aceitar "t'es"/"我巴西人" como certo e
mostrar a forma padrão ao lado, no espírito do "Quase!" que já existe na
correção de conjugação). As duas notas `gramatica-coloquial` escritas acima
já avisam o aluno, no próprio texto, que os exercícios de hoje ainda
exigem a forma padrão — não prometem um comportamento que o código não tem.

**Grilling sobre a integração acima (2026-09-17): adiada de propósito,
não esquecida.** Antes de perguntar, mapeei os exercícios digitados que
existem hoje (`renderVocabTypeExercise`, `renderClozeExercise`, o campo
de conjugação onde `'almost'`/"Quase!" já vive) e achei um fato que muda a
pergunta: **nenhum deles consegue testar uma frase inteira digitada
livremente hoje**. `renderVocabTypeExercise` é "digite o que ouviu"
(transcrição literal de UM item de `vocab[]`, não de frase). O cloze
(`renderClozeExercise`) esconde só um `block` de uma `phrase.blocks[]] já
existente, e o gerador (`fr/app.js` por volta da linha 3782) nunca deixa o
blank cair no bloco 0 quando há 3+ blocos — pra "Tu es de quel pays ?"
(`blocks: ["Tu","es de","quel pays ?"]`), "Tu" fica sempre fixo, nunca
digitável. Ou seja: a contração "t'es" (que funde "Tu"+"es") **não tem
como ser representada** no cloze de hoje — não existe um blank cujo
preenchimento algum dia seria igual a "t'es". Mesma conclusão pro par
我是巴西人/我巴西人 do zh. As 2 notas `gramatica-coloquial` escritas no
piloto acima não têm, hoje, NENHUM exercício digitado que algum dia as
teste.

Decisões do grilling, dado esse achado:

- **Não construir a integração agora.** Só 2 itens existem no app
  inteiro; forçar isso agora significa (a) inventar um tipo de exercício
  novo do zero pra 2 pontos de dado, ou (b) reestruturar `phrase.blocks`
  pra encaixar o bloco 0, o que também muda o exercício de reorder (que
  reaproveita os mesmos `blocks`) como efeito colateral. **Quando o
  próximo item `gramatica-coloquial` for autorado**, desenhar o exercício
  JUNTO com o item (escolher/ajustar os `blocks` da frase pra que a forma
  coloquial caiba como um blank isolado), em vez de tentar encaixar
  retroativamente. Até lá, as notas continuam card passivo + aviso no
  texto ("continue escrevendo a forma padrão") — comportamento real, não
  promessa vazia.
- **Quando construída, o aceite deve ser global, não só na lição em que
  a nota apareceu.** O dado mora anexado à própria frase/resposta (não ao
  `trigger` da nota, que é efêmero) — o valor real está na revisão
  espaçada dias depois, quando o aluno já esqueceu a nota; escopar só à
  lição imediata joga fora a maior parte do valor.
- **Quando construída, usar um `statusClass` novo (ex. `'colloquial-ok'`),
  não reaproveitar `'almost'`.** `'almost'` hoje significa "grafia quase
  certa" — semanticamente incompleto/próximo do erro. Um acerto coloquial
  é semanticamente diferente (certo, só que num registro diferente) e o
  tom já travado acima ("correto, isto é a forma padrão", não "quase
  errado") depende de não herdar a conotação de `'almost'`.

Nenhuma dessas três decisões virou código nesta sessão — de propósito,
mesmo espírito do restante desta seção: são parâmetros de design pra
quando o próximo item existir, não trabalho pra fazer hoje sem um
call site real pra testar contra.

**Atualização (2026-09-17, mesmo dia): densidade revista via novo
grilling — sem teto/mínimo, revisão manual da autora é o controle de
qualidade daqui pra frente.** A autora leu o resumo do piloto de 5 notas
e achou pouco: a intenção dela não é "aumentar aos poucos por nível", é
"notas de realidade serem uma feature MUITO presente desde já" — o
objetivo do produto passou a ser ensinar o conteúdo REAL do idioma, não
só o mais fácil, e isso vale desde o A1/HSK1, não só em níveis avançados.

Decisões do 2º grilling (Q1-Q4), já aplicadas:

- **`densityPerUnit` (eixo 4 da taxonomia) foi REMOVIDO do código.**
  Existia como `{min,max}` em `REALITY_NOTE_LEVEL_GUIDANCE` (fr/app.js e
  zh/app.js, ambos atualizados). Não há mais nenhum limite numérico, nem
  piso nem teto, por unidade ou por nível — pode haver 0, 1, 2 ou mais
  notas na mesma lição, o único critério é a mesma regra de sempre
  ("Coerência pedagógica entre funcionalidades", topo deste arquivo): a
  nota só entra se responder a uma palavra/expressão que a lição está
  ensinando NAQUELE momento. "Não force notas desnecessárias ou irreais"
  — verbatim da autora — continua valendo tanto quanto antes; o que mudou
  é que agora também não se pode limitar/segurar uma nota genuína só
  porque "já teve uma nessa lição".
- **Sem progressão de densidade por nível também** (Q2, opção "não
  aumentar por nível" da autora) — os outros 2 eixos que ainda existem
  (`explanationDepth`, `testableInExercise`, `categoriesAllowed`)
  continuam progredindo como já estava travado (A1/HSK1 mais raso, B1+
  testável, familiar-giria só A2+) — só a QUANTIDADE de notas deixou de
  escalar por nível, não a profundidade/testabilidade.
- **Retroagiu nas 5 unidades já pilotadas** — completadas nesta mesma
  sessão pra 2-3 notas cada (ver lista completa abaixo), em vez de deixar
  as primeiras unidades que o aluno vê com menos notas que as futuras.
- **Novo processo de revisão obrigatório pra TODA sessão futura que
  escrever nota de realidade, em qualquer idioma**: nenhum gate de
  aprovação dentro do app (a autora não quer isso), mas toda nota
  adicionada — nova ou já existente — deve ser reportada a ela NO CHAT
  com um nível de confiança explícito (alta/média/baixa), pra ela
  verificar em outras fontes antes de confiar. Regra motivadora,
  verbatim: "Para todos os idiomas, indique o nível de confiança naquela
  nota quando estiver me enviando pois irei verificar em outras fontes e
  tomarei uma 'confiança alta' com menos tensão na hora da revisão." Na
  prática: qualquer sessão que adicionar/editar uma nota de realidade
  precisa terminar a entrega com uma lista de TODAS as notas do app
  (não só as novas) e o nível de confiança de cada uma — não é opcional,
  nem só pras novas.

**Lista completa das 10 notas de realidade existentes depois desta
atualização** (nível de confiança de cada uma, pra revisão da autora):

fr:
1. A1-1 `svp-informal` — "s'il vous plaît" → "s'il te plaît"/STP — **alta**
2. A1-1 `a-bientot-informal` — "à bientôt" → "à plus"/A+ — **alta**
3. A1-2 `tu-es-contraction` — "tu es" → "t'es" — **alta**
4. A1-2 `comment-tappelles-wh-in-situ` — "comment tu t'appelles ?" → "tu t'appelles comment ?" (wh-in-situ) — **alta**
5. A1-3 `vingt-to-quatrevingts` — base de quatre-vingts (regional: França vs. Bélgica/Suíça) — **alta**
6. A1-3 `quel-age-wh-in-situ` — "quel âge as-tu ?" → "t'as quel âge ?" (wh-in-situ + elisão) — **alta**

zh:
7. Unit 1 `zaijian-baibai` — 再见 → 拜拜 — **alta**
8. Unit 1 `duibuqi-buhaoyisi` — 对不起 → 不好意思 (desculpa leve) — **alta**
9. Unit 2 `shi-drop-casual` — 我是巴西人 → 我巴西人 (queda do 是) — **alta**
10. Unit 1 `zaoshang-hao-zao` — 早上好 → 早 — **alta**

Nenhuma nota nova entrou em confiança média/baixa nesta rodada — os
candidatos que ficaram abaixo da barra de confiança (ex: "你叫什么名字？" →
"你叫什么？" no zh Unit 2, cortando 名字) foram deliberadamente DEIXADOS DE
FORA do código em vez de shipados com aviso de baixa confiança, pra não
arriscar conteúdo sociolinguístico errado indo ao ar antes da revisão.
Se uma sessão futura tiver confiança alta o bastante pra completar esses
candidatos, adicionar seguindo a mesma regra de report acima.

**Ainda sem nenhuma nota `regional` no zh** — mesma razão já registrada
acima (nenhum vocabulário concreto com variação regional bem documentada
foi ensinado ainda nas unidades revisadas). Continua sendo o lugar certo
pra completar quando uma unidade de comida/objetos concretos aparecer.

**Atualização (2026-09-17, mesmo dia): varredura completa do currículo
A1/HSK1.** A autora perguntou se as 5 unidades do piloto eram todo o
conteúdo pretendido — não eram. Ela pediu pra continuar por todas as
unidades restantes agora, na mesma sessão: fr tem 20 unidades A1
(A1-1..A1-20, mais 10 unidades `type:"grammar"` intercaladas que **não**
recebem nota de realidade — não têm `concepts`/vocabulário próprio, só
`grammar.blocks`), zh tem 18 unidades HSK1 (Unit 1..18, sem unidades
"grammar" separadas). Passei por TODAS as unidades restantes, não só uma
amostra, seguindo a mesma regra da atualização anterior: sem teto, sem
forçar, só onde a relação pedagógica é genuína.

**Achado ao revisar o currículo inteiro do zh**: a densidade natural é
bem mais baixa que a do fr. Muitos dos `concepts` de GRAMÁTICA do zh já
fazem o trabalho de uma nota de realidade em si (ex: jǐ suì vs. duō dà
pra idade de criança/adulto, tóu téng vs. bù shūfu pra dor específica vs.
mal-estar geral, dǎsuàn vs. yào pra plano pensado vs. intenção imediata) —
são nuances de REGISTRO/USO real, só que já vêm integradas ao ensino de
gramática em vez de separadas como "nota de realidade". Adicionar uma
segunda nota cobrindo a mesma distinção seria redundante, não aditivo —
por isso várias unidades do zh (3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 18)
não ganharam nota nova: não por preguiça, mas porque não achei uma
relação genuína e NÃO REDUNDANTE além do que a gramática já cobre.

**Achado recorrente no fr, vale registrar pra não parecer coincidência**:
várias unidades já tinham a frase coloquial "escondida" no próprio
diálogo, contrastando com a forma ensinada nas frases — não precisei
inventar nada, só tornar explícito o que já estava lá (A1-9 "Tu es d'où ?"
vs. "D'où viens-tu ?"; A1-10 "Ça coûte combien ?" vs. "Combien ça coûte ?";
A1-16 "Il est sympa ?" vs. "gentil"; A1-19 "On ne sait pas encore !",
perfeito pra mostrar a queda do "ne" — o próprio exemplo motivador da
categoria `gramatica-coloquial`). Essas notas têm confiança mais alta
ainda por causa disso: o diálogo real do app já demonstrava o fenômeno.

**Mecanismo "wh-in-situ" (manter a ordem sujeito-verbo e jogar a palavra
de pergunta pro fim) aparece 5 vezes no fr** (A1-2, A1-3, A1-9, A1-10,
A1-20) — registrado aqui pra não parecer duplicação acidental: é
deliberado, cada uma ligada a uma pergunta REALMENTE ensinada naquela
unidade especificamente, não a mesma nota copiada. É genuinamente um dos
fenômenos mais centrais do francês falado, por isso aparece tantas vezes.

**Novo padrão descoberto no zh: par "falado" vs. "escrito"** (block/毛 vs.
元/角 na Unidade 8; 号 vs. 日 na Unidade 16) — diferente do padrão
"informal vs. ensinado" do resto das notas, aqui é o oposto: a forma
ensinada NO APP já é a coloquial/falada (porque é isso que o aluno vai
usar), e a nota de realidade revela a forma ESCRITA/formal que ele vai
encontrar em preços impressos, recibos, documentos. Mesma categoria
`informal` (ainda reconhecível como a mesma forma), só que a direção do
contraste é invertida — vale ter isso em mente ao ler a lista abaixo.

**Lista COMPLETA e final de todas as 23 notas de realidade no app**
(nível de confiança de cada uma, por idioma/unidade, pra revisão manual
da autora — regra travada nesta seção):

fr (15 notas, unidades A1-1 a A1-20):
1. A1-1 `svp-informal` — s'il vous plaît → s'il te plaît/STP — **alta**
2. A1-1 `a-bientot-informal` — à bientôt → à plus/A+ — **alta**
3. A1-2 `tu-es-contraction` — tu es → t'es — **alta**
4. A1-2 `comment-tappelles-wh-in-situ` — comment tu t'appelles ? → tu t'appelles comment ? — **alta**
5. A1-3 `vingt-to-quatrevingts` — base de quatre-vingts (regional: França vs. Bélgica/Suíça) — **alta**
6. A1-3 `quel-age-wh-in-situ` — quel âge as-tu ? → t'as quel âge ? — **alta**
7. A1-4 `pere-mere-papa-maman` — le père/la mère → papa/maman — **alta**
8. A1-7 `nous-sommes-on-est` — nous sommes → on est (nous → on) — **alta**
9. A1-9 `dou-viens-tu-wh-in-situ` — d'où viens-tu ? → tu es d'où ? (já no diálogo) — **alta**
10. A1-10 `combien-ca-coute-wh-in-situ` — combien ça coûte ? → ça coûte combien ? (já no diálogo) — **alta**
11. A1-15 `quest-ce-qui-ne-va-pas-ca-va-pas` — qu'est-ce qui ne va pas ? → ça va pas ? — **alta**
12. A1-16 `gentil-sympa` — gentil → sympa (já no diálogo) — **alta**
13. A1-17 `il-y-a-ya` — il y a → y'a — **alta**
14. A1-19 `ne-drop-on-sait-pas` — on ne sait pas → on sait pas (queda do "ne", já no diálogo) — **alta**
15. A1-20 `quest-ce-que-tu-as-fait-wh-in-situ` — qu'est-ce que tu as fait ? → t'as fait quoi ? (já no diálogo) — **alta**

zh (8 notas, Unit 1 a Unit 17):
16. Unit 1 `zaijian-baibai` — 再见 → 拜拜 — **alta**
17. Unit 1 `duibuqi-buhaoyisi` — 对不起 → 不好意思 (desculpa leve) — **alta**
18. Unit 1 `zaoshang-hao-zao` — 早上好 → 早 — **alta**
19. Unit 2 `shi-drop-casual` — 我是巴西人 → 我巴西人 (queda do 是) — **alta**
20. Unit 8 `kuai-mao-yuan-jiao` — 块/毛 (falado) vs. 元/角 (escrito/formal) — **alta**
21. Unit 10 `zuo-chuzuche-dache` — 坐出租车 → 打车 (verbo cotidiano) — **alta**
22. Unit 16 `hao-vs-ri` — 号 (falado) vs. 日 (escrito/formal) — **alta**
23. Unit 17 `chifanle-greeting` — 你吃了吗？ como cumprimento tradicional, não pergunta literal — **alta**

Nenhuma nota nova entrou em confiança média/baixa nesta varredura
também — candidatos onde a confiança não era alta (ex: "你叫什么名字？" →
"你叫什么？" cortando 名字, no zh Unit 2) continuam de fora do código,
mesmo critério da atualização anterior.

**Cobertura**: das 20 unidades A1 do fr (excluindo as 10 `type:"grammar"`
sem `concepts`), 9 têm nota de realidade — as outras 11 (A1-1 parcial,
A1-5, A1-6, A1-8, A1-11, A1-12, A1-13, A1-14, A1-18) não tinham candidato
com confiança alta o bastante quando revisadas. Das 18 unidades HSK1 do
zh, 6 têm nota de realidade (Unit 1, 2, 8, 10, 16, 17) — as outras 12 não
tinham candidato genuíno e não-redundante com a gramática já ensinada.
Isso não significa que essas unidades nunca vão ter uma nota — significa
que, nesta revisão, não achei nada que passasse na barra de "relação
pedagógica real" sem forçar. Uma sessão futura pode achar algo que eu não
vi.

## Camada de "notas culturais" -- irmã das notas de realidade, fato isolado sem contraste de forma

Proposta da autora (2026-09-17, mesmo dia da varredura completa acima):
"eu adoraria uma camada de notas culturais também — curiosidades/fatos
divertidos sobre a cultura e a língua, sem nenhum exercício". Grillada
antes de implementar (5 perguntas, todas aprovadas).

**Diferença fundamental em relação a `reality`** (não é a mesma coisa com
nome diferente): `reality` é especificamente um CONTRASTE DE FORMA
(ensinado vs. real, mesma ideia dita diferente — "s'il vous plaît" vs.
"s'il te plaît"). `culture` é um FATO ISOLADO — história de uma palavra,
costume, festividade — sem nenhum contraste de forma envolvido. As duas
camadas são irmãs, usam o mesmo mecanismo de `concepts`/`trigger`
(`kind` diferente: `'reality'` vs. `'culture'`), mas nunca a mesma nota
tentando fazer as duas coisas — se uma nota tem um contraste "ensinado
vs. real", ela é `reality`; se é só um fato, ela é `culture`.

**Decisões do grilling, já travadas em código** (`CULTURE_NOTE_CATEGORY`/
`CULTURE_NOTE_BANNER_TEXT` em `fr/app.js` e `zh/app.js`, logo depois de
`REALITY_NOTE_BANNER_TEXT`; `renderConceptStep()` nos dois arquivos
estendido com um terceiro ramo `isCulture` ao lado de `isReality`):

- **3 categorias** (mais simples que as 4 de `reality`, porque "cultura" é
  um balde mais amplo que "registro linguístico" — 4 categorias fechadas
  não caberiam bem):
  - `historia` — origem/etimologia de uma palavra ou expressão (ex: dias
    da semana vêm dos deuses romanos).
  - `costume` — etiqueta ou tradição social do dia a dia (ex: hábito à
    mesa, regra social não escrita).
  - `festividade` — feriado, celebração, data especial (ex: como funciona
    o Ano Novo Chinês).
- **Banner por categoria, tom leve/"curiosidade"** (diferente do tom de
  `reality`, que soa mais "cuidado, isso pode te confundir" — aqui não há
  contraste nenhum pra alertar): `historia` → "📜 Você sabia?", `costume`
  → "🎭 Costume real", `festividade` → "🎉 Data especial".
- **Gratuito por enquanto** — mesmo raciocínio de `reality` (conteúdo
  estático, sem custo marginal de servir). Reavaliar só se cada nota um
  dia ganhar mídia própria (imagem/ilustração), aí o cálculo muda.
- **Herda as regras de densidade/revisão de `reality`** (já travadas
  acima, não reinventadas aqui): sem teto numérico, só entra se a relação
  pedagógica com a palavra/frase ensinada for genuína, toda nota nova
  reportada no chat com nível de confiança pra revisão manual da autora.
  Mesma regra de "não force, mas não limite".
- **Sem exercício, ponto final** — diferente de `reality` (que tem uma
  categoria, `gramatica-coloquial`, com um caminho pensado pra virar
  testável dentro da correção), `culture` não tem nenhuma ambição de virar
  interativo. É card passivo por definição do próprio conceito, não um
  MVP que pode crescer depois.

**Piloto escrito, 5 notas** (mesma lógica de "escrever antes de varrer o
currículo inteiro" usada em `reality`):

fr:
1. A1-5 `croissant-nao-e-diario` (`costume`) — croissant não é hábito
   diário pra maioria dos franceses (mito comum) — ligado ao "croissant"
   que aparece no diálogo desta lição — **confiança alta**
2. A1-7 `dias-semana-deuses-romanos` (`historia`) — lundi/mardi vêm da
   Lua/Marte romanos — ligado ao vocabulário desta lição — **confiança
   alta**
3. A1-16 `bandeira-tricolor-historia` (`historia`) — origem das 3 cores
   da bandeira francesa (Revolução Francesa) — ligado às 3 cores
   ensinadas nesta lição (rouge/bleu/blanc) — **confiança alta**

zh:
4. Unit 3 `xusui-ano-novo` (`festividade`) — sistema tradicional de idade
   nominal (虚岁), muda no Ano Novo Chinês, não no aniversário — ligado ao
   岁 (suì) desta lição — **confiança alta**
5. Unit 5 `cha-origem-china` (`historia`) — China é o berço do chá — ligado
   ao 茶 (chá) desta lição — **confiança alta**

Todas as 5 validadas via `renderConceptStep()` contra o app real (banner
certo por categoria, título/corpo renderizando). Nenhuma entrou em
confiança média/baixa nesta rodada.

**Atualização (2026-09-18): varredura completa do currículo, mesmo dia da
varredura completa de `reality`.** A autora pediu "implemente tudo" depois
de ver o piloto de 5 notas — mesma dinâmica já usada em `reality` (piloto
pequeno primeiro, currículo inteiro só depois de aprovação). Passei pelas
20 unidades A1 do fr (excluindo as 10 `type:"grammar"`) e pelas 18 unidades
HSK1 do zh procurando fatos culturais genuinamente ligados ao vocabulário
de cada lição, sem forçar. 13 notas novas entraram (7 fr + 6 zh), todas
confiança alta — nenhum candidato de confiança média/baixa foi shipado
(mesmo critério usado em `reality`: fora do código até virar alta
confiança).

**Lista COMPLETA e final das 18 notas culturais no app** (nível de
confiança de cada uma, por idioma/unidade, pra revisão manual da autora —
mesma regra de report travada na seção de `reality` acima):

fr (10 notas, unidades A1-1 a A1-19):
1. A1-1 `la-bise-cumprimento` (`costume`) — cumprimento com beijinhos no
   rosto (número varia por região) — ligado ao diálogo de cumprimento
   desta lição — **alta**
2. A1-4 `repas-dominical` (`costume`) — o almoço de domingo em família,
   longo e em várias etapas — ligado ao vocabulário de família desta
   lição — **alta**
3. A1-5 `croissant-nao-e-diario` (`costume`) — croissant não é hábito
   diário pra maioria dos franceses (mito comum) — **alta**
4. A1-6 `le-midi-almoco-longo` (`costume`) — o almoço francês como pausa
   de verdade (45min-1h, refeição completa) — ligado a "le midi" desta
   lição — **alta**
5. A1-7 `dias-semana-deuses-romanos` (`historia`) — lundi/mardi vêm da
   Lua/Marte romanos — **alta**
6. A1-11 `le-marche-tradicao` (`costume`) — a feira ao ar livre (marché)
   além do supermercado — ligado ao tema de compras de mercado desta
   lição — **alta**
7. A1-14 `metro-paris-historia` (`historia`) — o metrô de Paris abriu em
   1900 pra Exposição Universal — ligado a "le métro" desta lição —
   **alta**
8. A1-16 `bandeira-tricolor-historia` (`historia`) — origem das 3 cores
   da bandeira francesa (Revolução Francesa) — **alta**
9. A1-17 `andar-terreo-premier-etage` (`costume`) — rez-de-chaussée
   (térreo) é separado de "1er étage" (o que seria "2º andar" no Brasil)
   — ligado ao vocabulário de cômodos/andares desta lição, inclusive à
   frase "La chambre est au premier étage" já usada nas phrases —
   **alta**
10. A1-19 `cinema-nasceu-na-franca` (`historia`) — 1ª exibição pública
    paga de cinema, irmãos Lumière, Paris 1895 — ligado a "le cinéma"
    desta lição — **alta**

zh (8 notas, Unit 2 a Unit 12):
11. Unit 2 `ordem-nomes-sobrenome-primeiro` (`costume`) — sobrenome vem
    antes do nome próprio — ligado ao "小李" (Xiǎo Lǐ) que já aparece no
    diálogo desta lição — **alta**
12. Unit 3 `xusui-ano-novo` (`festividade`) — sistema tradicional de
    idade nominal (虚岁) — **alta**
13. Unit 3 `si-numero-azarado` (`costume`) — 四 (sì, "quatro") soa como
    死 (sǐ, "morte"), número evitado — ligado ao 四 desta lição — **alta**
14. Unit 4 `politica-filho-unico-historia` (`historia`) — política do
    filho único (1979-2015/16) — ligado a 孩子 (háizi) desta lição —
    **alta**
15. Unit 5 `cha-origem-china` (`historia`) — China é o berço do chá —
    **alta**
16. Unit 6 `fuso-horario-unico` (`historia`) — China inteira usa o
    horário de Pequim, apesar da extensão geográfica — ligado a 点 (diǎn)
    desta lição — **alta**
17. Unit 8 `pechinchar-mercado` (`costume`) — pechinchar é normal em
    mercados/feiras, não em lojas de preço fixo — ligado ao próprio
    diálogo desta lição, que já mostra o preço caindo de 30 pra 25 kuài —
    **alta**
18. Unit 12 `guangchangwu-danca-praca` (`costume`) — dança de praça
    (广场舞), tradição social chinesa — ligado a 跳舞 (tiàowǔ) desta lição —
    **alta**

Todas as 13 notas novas validadas via `renderConceptStep()` contra o app
real (banner certo por categoria, título renderizando). Nenhuma entrou em
confiança média/baixa nesta varredura.

**Cobertura**: das 20 unidades A1 do fr (excluindo as 10 `type:"grammar"`),
10 têm nota cultural — as outras 10 não tinham candidato com confiança
alta o bastante quando revisadas (mesmo critério de `reality`: não força).
Das 18 unidades HSK1 do zh, 7 têm nota cultural (Unit 2, 3, 4, 5, 6, 8, 12
— Unit 3 tem 2) — as outras 11 não tinham candidato genuíno. Isso não
significa que essas unidades nunca vão ter uma nota — uma sessão futura
pode achar algo que eu não vi, mesmo texto de fechamento já usado na
varredura de `reality`.

**Correção de registro pós-entrega (2026-09-18, mesmo dia): "regatear" não
é português coloquial do Brasil.** A autora apontou que a nota `zh` da
Unit 8 (item 17 acima) usava "regatear"/"regateio" — verbo comum em
espanhol e em português europeu, mas não uma palavra do dia a dia do
português brasileiro. A palavra realmente usada no Brasil é
**"pechinchar"**. Corrigido: `id` do concept renomeado de
`regatear-mercado` para `pechinchar-mercado` em `zh/content.js`, título e
corpo reescritos trocando "regatear"/"regateio" por "pechinchar"/"quem
está pechinchando". Nenhum outro arquivo referenciava o `id` antigo
(checado via grep antes de renomear), então a mudança foi segura sem
quebrar nada.

**Por que isso importa mais que um simples erro de palavra**: o objetivo
do produto (registrado em outras seções deste arquivo — camada de notas
de realidade, ver acima) é ensinar aos alunos o idioma estrangeiro
REALMENTE falado no dia a dia, com o português brasileiro como idioma de
interface/tradução. Um erro desse tipo é uma inconsistência de registro
na própria camada de tradução (PT-BR), não no conteúdo do idioma
estrangeiro ensinado — mas mina a mesma promessa do produto (linguagem
autêntica e coloquial) se o texto de apoio em português soar
"traduzido"/estrangeiro em vez de natural. Ao escrever ou revisar
qualquer nota de `reality`/`culture` (ou qualquer texto de interface),
uma sessão futura deve considerar explicitamente se o português usado é
o que um brasileiro diria no dia a dia, não só se a tradução está
gramaticalmente correta — o mesmo padrão de cuidado já aplicado à
"coerência pedagógica" (ver topo deste arquivo), agora estendido ao
REGISTRO da própria língua de interface.

## Streak (🔥) no topbar/perfil ficava CONGELADO em vez de zerar quando a sequência quebra

Bug relatado pela autora (2026-09-18, print da tela real): notificação
`user_inactive_3` ("3 dias sem aparecer") batendo, ao mesmo tempo, com o
flame do topbar mostrando "3" — parecendo contradição (como sumir 3 dias
E estar com sequência de 3 dias ativa?). Não é contradição no dado, é bug
de exibição: a notificação estava CERTA (calculada no
`notification-cron`, servidor, a partir de `daysSince(lastStudyDay)`); o
flame do topbar é que estava mostrando um valor ERRADO.

**Causa raiz**: `STATE.streak` só é recalculado dentro de
`registerStudyToday()` (fr/zh `app.js`) — ou seja, só muda quando a
pessoa efetivamente estuda. Se ela some por alguns dias, nada zera o
valor nesse meio tempo: o número fica CONGELADO no último streak
alcançado (ex: "3", de 3 dias atrás) em vez de refletir que a sequência
já quebrou. `renderTopbarStats()` (`shared/topbar-stats.js`) e outros 3
pontos de exibição liam `STATE.streak` direto, sem checar se ele ainda
estava "vivo".

**Fix**: nova função `effectiveStreak()` em `shared/srs.js` (perto de
`todayStr()`/`dateStrDaysAgo()`, que ela usa) — mesma regra de gap que
`registerStudyToday()` já aplica pra decidir se incrementa ou zera a
sequência (`lastStudyDay` é hoje ou ontem → sequência viva, retorna
`STATE.streak`; qualquer coisa mais antiga → sequência quebrada, retorna
`0`). Substituído `STATE.streak` por `effectiveStreak()` nos 4 pontos que
exibem o streak como "status atual" pro aluno:
`shared/topbar-stats.js` (pill principal + card da sidebar desktop),
`shared/profile.js` (card "dias seguidos" da tela de Perfil), e
`fr/app.js`/`zh/app.js` (stat-card "Dias seguidos" da tela de
estatísticas completas).

**O que NÃO foi tocado, de propósito** (não é o mesmo tipo de exibição):
- `streak-days-num` (tela de comemoração de sequência, que aparece logo
  depois de `registerStudyToday()` completar) — nesse call site
  `STATE.streak` está sempre correto no momento em que é lido, porque
  acabou de ser recalculado.
- Checks de badge (`streak_3`/`streak_7` em `BADGES`, `check: s =>
  s.streak >= 3`) — são conquistas "já alcançou alguma vez", não status
  atual; usar o valor bruto no momento do check (logo após estudar) é o
  comportamento certo, uma vez desbloqueado o badge fica permanente.
- `notification-cron` (server-side) — já fazia a conta certa
  (`daysSince(state.lastStudyDay)`/`state.lastStudyDay !== today`) desde
  antes; não precisou de mudança.
- `analyticsLongestStreak()` (`shared/admin-analytics.js`) — já documentado
  no próprio código como aproximação separada, não lê `STATE.streak`.

Validado via Playwright: `effectiveStreak()` retorna `0` quando
`lastStudyDay` tem 3+ dias, retorna o streak normal quando é hoje ou
ontem; `renderTopbarStats()` reflete isso no DOM (`#streak-count`) nos 3
cenários. Regressão completa (11+31 testes) sem quebras.

## Sistema de alunas particulares + conteúdo personalizado -- Fase 0/1 (2026-09-19/20)

Feature nova, grande, entregue em fases travadas por autorização explícita
da autora a cada etapa (não pular fase, não implementar funcionalidade de
fase futura adiantado). Princípio arquitetural central, definido no
prompt-mestre que abriu esta feature e que continua valendo pra todas as
fases futuras (flashcards de professora, criação de cartão pela própria
aluna, histórico de aula etc.): **uma só biblioteca de flashcards por
aluna, um só motor de revisão/memória** -- nunca construir um sistema de
revisão paralelo pra cartão de trilha vs. cartão de professora vs. cartão
próprio. "Origem" do cartão (`study`/`teacher`/`self`) é sempre metadado
de UM sistema, nunca vira sistema novo. Distinguir DONO do cartão
(biblioteca de quem) de ORIGEM (quem criou/recomendou) desde o desenho.

**Fase 0 (auditoria, só leitura, já concluída antes desta entrega)**
mapeou a arquitetura atual do app e identificou o bloqueio real pra
flashcards de professora existir no futuro: `STATE.cards` hoje NÃO é uma
entidade independente -- é reconstruído do zero a partir de `content.js`
(`UNITS`) a cada carregamento via `buildCardsFromUnits()`, com esquema de
id `u${unitId}-v${idx}`; `applySerializedState()` descarta silenciosamente
qualquer cartão salvo cujo id não bate mais com essa reconstrução. Isso
significa que um cartão "solto" (atribuído por uma professora, sem
unidade/índice correspondente em `content.js`) simplesmente desapareceria
do estado salvo hoje -- é o problema real que a Fase 2 (flashcards) vai
ter que resolver, registrado aqui pra não virar surpresa nessa hora.

**Fase 1 (modelo de dados aluna/papel, esta entrega) -- o que foi feito:**

- **Migration `024_add_role_to_profiles.sql`** -- coluna `profiles.role
  text not null default 'student' check (role in ('student', 'teacher',
  'admin'))`, aditiva/sem risco. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` (não
  é passo manual pendente pra autora). A mesma migration promove pra
  `role = 'admin'` a conta cujo e-mail é `brunemed1310@gmail.com` (a
  única `role` !== `'student'` hoje). Confirmado ao vivo: 1 admin, 21
  alunas.
- **Migration `025_create_teacher_students_table.sql`** -- tabela nova
  `teacher_students` (`teacher_id`, `student_id` -- ambos `auth.users`,
  `language_app_key` obrigatório em `('frances','mandarim','portugues')`,
  `status` em `('active','invited','removed')`, `unique(teacher_id,
  student_id, language_app_key)`), RLS com policies de leitura pra
  professora e pra aluna (cada uma só vê seus próprios vínculos) e de
  escrita só pro e-mail admin (mesmo padrão de `023`). Aplicada AO VIVO
  via MCP na mesma sessão -- não é passo manual pendente.
  `language_app_key` é obrigatório (não um vínculo "geral" de conta)
  porque a autora confirmou explicitamente: **"cada aluno vale para
  apenas 1 idioma"** -- ela pode ter uma Sandra de francês e uma Sandra de
  chinês como duas alunas DIFERENTES, cada vínculo escopado a um idioma.
- **`'portugues'` já é um valor aceito no enum de `language_app_key`**,
  decisão explícita da autora (via `AskUserQuestion`, opção "só o schema
  fica pronto"): ela é professora de Francês e de Português para
  Estrangeiros hoje, o Português ainda não existe como idioma no site.
  Isso é PURAMENTE de schema -- `languages/index.js` (`AVAILABLE_LANGUAGES`)
  não ganhou nenhuma entrada nova, nem "em breve"/desabilitada; zero
  mudança visual em qualquer lugar do site pra aluna/visitante comum.
  Só a tela nova de admin (`shared/admin-students.js`,
  `STUDENT_LANGUAGE_LABELS`) já lista "Português (em breve)" como opção
  de atribuição -- é justamente o "anexar a possibilidade" que a autora
  pediu, sem prometer um curso que ainda não existe.
- **`shared/roles.js`** (novo) -- só LÊ o papel novo, não substitui
  `isAdminUser()` em nenhum call site existente (decisão explícita, fora
  do escopo desta fase): `fetchMyRole()` (usa o `select('*')` que
  `ensureProfileLoaded()` já fazia, sem round-trip extra),
  `isTeacherOrAdmin()`, `fetchMyStudents()` (join manual em JS entre
  `teacher_students` e `profiles`, mesmo padrão de
  `fetchAllGrantsWithUsernames()` em `admin-badges.js`),
  `assignStudentToTeacher(username, languageAppKey)` (resolve @username
  via `resolveProfileByUsername()` reaproveitado de `admin-badges.js`,
  rejeita auto-atribuição, trata violação de unicidade -- `error.code ===
  '23505'` -- como "já é sua aluna nesse idioma" em vez de erro genérico),
  `removeStudentLink(linkId)` (delete simples -- ver nota abaixo sobre o
  que isso NÃO apaga).
- **`shared/admin-students.js`** (novo) + nova subseção "🎓 Alunos" no
  Painel de Admin (`fr/index.html`+`zh/index.html`, `#admin-students-content`,
  fiado em `switchAdminPanelSection()` de `shared/admin-analytics.js`,
  mesmo padrão de toggle das outras 4 subseções -- badges/analytics/
  notificações/reports). Form "Vincular aluna" (username com
  `<datalist>` de autocomplete + select de idioma) + lista "Suas alunas
  (N)" com botão de remover por vínculo. Gate-check de `isAdminUser()`
  no topo de `renderAdminStudentsView()`, mesmo padrão de toda tela de
  admin existente.

**Decisões arquiteturais tomadas nesta fase:**
1. Papel (`profiles.role`) é uma peça de dado NOVA e SEPARADA da
   identidade admin atual (`isAdminUser()`, e-mail hardcoded) -- nenhum
   call site existente foi migrado pra ler `role` em vez do e-mail. Os
   dois vão conviver até uma fase futura explícita decidir unificar (fora
   do escopo desta entrega, não decidido ainda).
2. Vínculo professora-aluna mora em tabela própria (`teacher_students`),
   não em coluna solta em `profiles` (ex: `profiles.teacher_id`) -- deixa
   aberto pra um dia uma aluna ter mais de uma professora, sem migração
   de schema nova quando isso acontecer.
3. `remover vínculo` (`removeStudentLink`) é `delete` na linha de
   `teacher_students` -- NÃO apaga nada de `profiles`/`progress` da
   aluna, nem histórico dela em nenhuma tabela. A aluna só some da lista
   "Suas alunas" da professora; o progresso dela continua intacto (regra
   geral do prompt-mestre desta feature: nunca apagar histórico/dado ao
   remover associação). O texto de confirmação no `confirm()` já deixa
   isso explícito pra autora no momento do clique.
4. Nenhuma tela nova é alcançável por conta comum -- só o Painel de Admin
   (que já é 100% gate-checked por `isAdminUser()`) ganhou a subseção
   nova. Uma aluna sendo vinculada não ganha nenhuma UI nova ainda (isso
   é fase futura -- ela nem fica sabendo que foi vinculada, por design
   desta fase específica).

**Gratuito x Premium (avaliado, não implementado):** feature inteira hoje
é ferramenta de gestão pra própria autora (professora/admin) sobre suas
próprias alunas -- não há conceito de "aluna paga por isso" nesta fase.
A pergunta relevante fica pra quando a Fase 2+ (flashcards de professora)
entrar: cada professora poder gerenciar SUAS PRÓPRIAS alunas é plano
core do produto (a autora É a professora), então não faz sentido premium
nesta ponta; o que pode virar premium mais adiante é limite de nº de
alunas simultâneas por professora, se a plataforma um dia tiver mais de
uma professora usando o sistema -- não travado em código, só registrado
aqui como pergunta em aberto pro dia em que isso for relevante.

**Testes realizados:** `node --check` em todos os arquivos JS tocados
(sem erro de sintaxe); suíte de regressão de respostas (11+31 testes)
sem quebras (não exercita este código, mas confirma que nada existente
quebrou). Validação funcional via Playwright (fr+zh) com stub de
`window.supabase.createClient()` (CDN do Supabase é bloqueado pelo proxy
de saída deste ambiente sandbox -- ver padrão já registrado em sessões
anteriores) simulando uma sessão logada como a conta admin: confirmado
`isAdminUser()===true`, `fetchMyRole()==='admin'`,
`isTeacherOrAdmin()===true`, `fetchMyStudents()` retorna o vínculo
semeado corretamente, `renderAdminStudentsView()` desenha form + lista,
fluxo de vincular nova aluna funciona (contagem sobe no banco fake e no
DOM), rejeição de duplicata/@username inexistente/auto-atribuição todas
retornam `ok:false` como esperado, fluxo de remover vínculo funciona
(contagem cai no banco fake e no DOM), e o gate de "não-admin" mostra a
mensagem de bloqueio em vez do form. Testado nos dois idiomas (fr/zh),
sem erro de console novo atribuível a este código (o único `pageerror`
capturado durante a validação -- `.is is not a function` -- vem de
`shared/notifications.js`, código pré-existente não tocado por esta
fase, e é uma limitação do mock de teste, não um bug real do app).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma UI de flashcard, revisão ou "cartão atribuído" -- isso é Fase 2.
- Nenhuma mudança em `getStudyQueue()`, FSRS ou qualquer motor de
  revisão -- Fase 3.
- Nenhum filtro por origem de cartão (`study`/`teacher`/`self`) -- Fase 4.
- Aluna não tem nenhuma tela nova pra ver que foi vinculada a uma
  professora, nem pra ver "minha professora" -- fora do escopo desta
  fase (a tela existe só do lado da professora/admin).
- `fake_supabase.js`: o histórico de tarefas de sessões anteriores
  registrado no ambiente menciona esse arquivo várias vezes (ex.
  "Perfil 7.4: Update fake_supabase.js mock", "AdminMode 5: fake_supabase.js
  mock default admin_mode:true"), mas uma busca (`grep -rl
  "fake_supabase"`) neste checkout real do repositório não encontra
  nenhuma ocorrência -- o arquivo não existe aqui. Não recriei/inventei
  esse arquivo; a validação desta fase usou um stub Playwright ad-hoc em
  vez disso (ver "Testes realizados" acima). Uma sessão futura que
  encontrar essa mesma discrepância deve considerar isso um artefato de
  histórico de tarefas de sessões anteriores não aplicável a este
  checkout, não recriar o arquivo às cegas.

Próxima fase (2 -- flashcards) só começa depois de autorização explícita
da autora, com o relatório acima já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-20), "Pode seguir para a
fase 1" seguida depois por "Sim, e depois passe pra próxima fase" (após
aprovar abrir/mergear os PRs da Fase 1 e de um fix de streak em
paralelo).**

## Fase 2 (flashcards autorados por professora) -- só o modelo de dados + autoria, sem revisão ainda

**Escopo explicitamente restrito**, mesmo princípio de todas as fases
anteriores desta feature: Fase 2 no prompt-mestre é "flashcards", Fase 3
é "integração com revisão" -- são fases SEPARADAS de propósito. Esta
entrega cobre só a professora poder AUTORAR um cartão e atribuí-lo a uma
aluna específica; o cartão criado aqui **não entra em `STATE.cards`, não
participa de `getStudyQueue()`/FSRS, e a aluna não tem nenhuma tela que
leia isto ainda** -- isso é explicitamente Fase 3, ainda não iniciada.

**O bloqueio identificado na Fase 0** (`STATE.cards` reconstruído do zero
via `buildCardsFromUnits()` a cada carregamento; `applySerializedState()`
só faz `Object.assign` nos cartões que já existem nessa lista fresca,
então um cartão salvo sem correspondência em `content.js` é descartado
silenciosamente -- confirmado lendo o código de novo nesta fase,
`fr/app.js` linha ~813) **continua sem solução nesta entrega, de
propósito** -- resolver isso é justamente o primeiro passo da Fase 3
(fazer os cartões desta tabela sobreviverem ao ciclo save/load), não
desta.

**O que foi feito:**

- **Migration `026_create_teacher_flashcards_table.sql`** -- tabela
  `teacher_flashcards` (`teacher_id`, `student_id`, `language_app_key`
  -- mesmo par que `teacher_students` já usa --, `front`, `back_trans`,
  `note` opcional, `status` em `('active','archived')`). RLS: professora
  lê o que ela criou, aluna lê o que foi atribuído a ela (schema já
  pronto pra Fase 3 poder ler do lado da aluna, mesmo sem nenhuma tela
  hoje), escrita só pra administração (mesmo padrão de `023`/`025`).
  Aplicada AO VIVO nesta sessão via `mcp__Supabase__apply_migration` --
  não é passo manual pendente.
- **`status:'archived'` em vez de delete físico** -- mesmo princípio
  geral do prompt-mestre ("nunca apagar histórico/dado ao remover
  associação"), aplicado por precaução aqui: quando a Fase 3 ligar isto
  à revisão, um cartão arquivado não deveria levar embora nenhum estado
  de memória que a aluna já tenha acumulado nele.
- **`shared/teacher-flashcards.js`** (novo) -- `fetchFlashcardsForStudent`,
  `createFlashcard` (valida front/back não-vazios antes de gravar),
  `setFlashcardStatus` (usado tanto pra arquivar quanto pra reativar).
- **`shared/admin-flashcards.js`** (novo) + nova subseção "📇 Flashcards"
  no Painel de Admin (fr+zh), ao lado de "🎓 Alunos": select de aluna
  (populado por `fetchMyStudents()`, já existente da Fase 1) + form de
  criar cartão (frente/verso/nota opcional) + lista de cartões ativos e
  arquivados, com botão de arquivar/reativar por cartão. Reaproveita as
  mesmas classes CSS de `admin-students.js` (`admin-badge-row` etc.) --
  zero CSS novo.

**Decisões arquiteturais tomadas nesta fase:**
1. `languageAppKey` do cartão vem do vínculo já existente em
   `teacher_students` (a aluna selecionada), não é escolhido de novo no
   form -- consistente com "cada aluna vale pra 1 idioma" (Fase 1).
2. Tela de admin exige que já exista pelo menos uma aluna vinculada
   (aponta pra aba "🎓 Alunos" se não houver nenhuma) -- não duplica
   nenhuma lógica de vínculo aqui, só consome `fetchMyStudents()`.
3. Card "pertence" à aluna (biblioteca dela, quando a Fase 3 existir) mas
   tem ORIGEM na professora -- distinção já registrada no topo desta
   seção do CLAUDE.md, mantida consistente: `teacher_flashcards` é
   metadado de origem, não um sistema de revisão paralelo (que nunca vai
   existir, por princípio arquitetural central desta feature).

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão da
Fase 1 -- ferramenta de gestão da própria professora/admin sobre suas
próprias alunas, sem conceito de cobrança nesta ponta. Fica a mesma
pergunta em aberto pra quando existir mais de uma professora na
plataforma (ex: limite de cartões/alunas simultâneas por professora no
plano gratuito) -- não travado em código.

**Testes realizados:** `node --check` nos arquivos tocados, sem erro.
Validação funcional via Playwright (fr+zh), mesmo padrão de stub de
`window.supabase.createClient()` da Fase 1: seleção de aluna renderiza
corretamente, criação de cartão sobe a contagem no banco fake e no DOM,
rejeição de frente/verso vazio confirmada (`emptyFrontRejected===true`),
arquivar um cartão move ele pra seção "Arquivados" (`status` muda,
re-render reflete), gate de não-admin bloqueia com a mesma mensagem já
usada em "🎓 Alunos". Sem erro de console novo atribuível a este código
(mesmo `pageerror` pré-existente de `shared/notifications.js`/`.is()` já
registrado como limitação do mock na entrega da Fase 1, não bug real).

**O que ainda falta / não foi feito nesta fase (de propósito, é a Fase
3):**
- Cartão criado aqui não aparece em nenhuma tela da aluna, não entra em
  `STATE.cards`, não é revisável (FSRS/`getStudyQueue()`).
- O bloqueio arquitetural da Fase 0 (`applySerializedState()` descarta
  cartão sem correspondência em `content.js`) não foi tocado -- é
  trabalho da Fase 3, não desta.
- Nenhum filtro por origem (`study`/`teacher`/`self`) em nenhuma tela --
  Fase 4.
- Edição de um cartão já criado (só front/back/note, não status) não foi
  implementada -- só criar e arquivar/reativar. Se isso for necessário
  antes da Fase 3, é um adendo pequeno e contido a esta fase, não
  Fase 3 em si.

Próxima fase (3 -- integração com revisão) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-20), no mesmo pedido que
corrigiu o campo @username de "Alunos" pra virar `<select>` -- "Faça o
campo... Em seguida, continue para a fase 3".**

## Fase 3 (integração com revisão) -- resolve o bloqueio da Fase 0, cartão de professora vira revisável de verdade

**Isto é o núcleo arquitetural da feature inteira** -- as fases 0-2 só
prepararam o terreno (auditoria, modelo de dados, autoria). Esta fase
resolve o bloqueio identificado desde a Fase 0 e faz o cartão de
professora entrar no MESMO motor de memória/revisão que a trilha sempre
usou, sem criar um sistema paralelo (princípio central desta feature,
ver topo da seção anterior).

**O bloqueio, resolvido:** `STATE.cards` era reconstruído do zero a cada
carregamento via `buildCardsFromUnits()`, e `applySerializedState()` só
faz `Object.assign` nos cartões que JÁ existem nessa lista fresca --
qualquer cartão salvo sem correspondência era descartado em silêncio. A
fase anterior identificou isso; esta resolve **sem mudar o mecanismo de
merge em si** -- só passa a colocar os cartões de professora na lista
fresca também, antes do merge rodar:

- **`buildCardFromTeacherFlashcard(row)`** (novo, fr/zh `app.js`) --
  constrói um card com o MESMO shape que `buildCardsFromUnits()` produz
  (mesmos campos de FSRS: `ef`/`interval`/`reps`/`due`/`lapses`/
  `stability`/`difficulty`/`state`/`lastReview`/`fsrsReps`/`fsrsLapses`),
  id `t${row.id}` (namespace separado de `u${unitId}-v${idx}`, nunca
  colide), `origin: 'teacher'`, `unitId`/`vocabIdx: null` (não pertence a
  nenhuma unidade), `flashcardStatus` espelhando `status` da linha.
- **`mergeTeacherFlashcardsIntoState()`** (novo) -- busca os flashcards da
  aluna logada (`fetchFlashcardsForCurrentStudent`, novo em
  `shared/teacher-flashcards.js`, RLS já existente desde a migration 026:
  `student_id = auth.uid()`) e empurra pra `STATE.cards`. **Busca TODOS os
  status (ativo E arquivado) de propósito** -- arquivar não pode apagar
  progresso de memória já acumulado, só tirar da fila de revisão (ver
  abaixo). Chamado logo no INÍCIO de `loadStateAndRender()`, ANTES de
  `loadState()` -- exatamente pra que a lista fresca já contenha esses
  ids quando `applySerializedState()` rodar o merge por id. Idempotente
  dentro da sessão (não duplica se chamado 2x).
- **`isCardLessonCompleted(card)`** ganhou um caso à parte pro
  `origin==='teacher'`: em vez do gate de "lição concluída" (que não faz
  sentido pra um cartão que não pertence a nenhuma unidade), a
  elegibilidade é `flashcardStatus === 'active'`. Isso é o único ponto de
  checagem no app inteiro pra "este cartão entra hoje na fila de
  revisão" -- `eligibleReviewPool()`, `getStudyQueue()` e os 4 pontos de
  entrada de revisão (Flashcard/Palavras Difíceis/Speed Review/Combinar)
  já delegam pra cá, então nenhum deles precisou de mudança própria --
  a arquitetura de seleção centralizada da Fase 4 do projeto de motor de
  memória (ver seção "Fase4.1: projetar getStudyQueue() central" no
  histórico) já pagava esse dividendo.
- **Cartão de trilha também ganhou `origin: 'study'`** (antes não tinha
  campo de origem nenhum) -- explícito agora, mesmo princípio "dono x
  origem" travado no topo desta seção do CLAUDE.md.
- **Achado específico do zh, resolvido antes de mesclar**: diferente do
  fr (um único campo `front`), o cartão de revisão do zh exige hanzi e
  pinyin em campos SEPARADOS (`front_pinyin`/`back_hanzi` -- a tela
  sempre mostra os dois juntos, nunca um sozinho). `teacher_flashcards`
  (migration 026) só tinha `front`/`back_trans`/`note` -- suficiente pro
  fr, mas um cartão de mandarim sem pinyin mostraria a string literal
  "undefined" onde o pinyin deveria estar. **Migration
  `027_add_pinyin_to_teacher_flashcards.sql`** -- coluna opcional
  `front_pinyin`, aditiva/sem risco, aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` (não é passo manual pendente). UI de
  admin (`shared/admin-flashcards.js`) mostra o campo "Pinyin" só quando
  a aluna selecionada é de mandarim (progressive disclosure -- zero
  mudança visual pra quem só cria cartão de francês).

**Decisões arquiteturais tomadas nesta fase:**
1. Card arquivado continua em `STATE.cards` (nunca removido) -- só sai da
   fila de revisão. Preserva qualquer progresso de memória (`stability`/
   `reps`/etc.) que a aluna já tenha acumulado nele, caso a professora
   reative depois. Sem isso, arquivar apagaria dado histórico do próximo
   save -- contra a regra geral desta feature ("nunca apagar histórico/
   dado ao remover associação").
2. Nenhum `getStudyQueue()`/FSRS precisou de mudança -- só
   `isCardLessonCompleted()` (o único filtro que já existia especificamente
   pra "cartão pertence a uma unidade") ganhou o caso `origin==='teacher'`.
   Confirma que a arquitetura "um motor, uma fila central" das fases
   anteriores realmente absorve uma origem nova sem duplicar lógica --
   era a aposta arquitetural do prompt-mestre, validada na prática agora.
3. `unitTitle: 'Da sua professora'` (em vez de deixar `undefined`) --
   único texto novo visível pra aluna nesta fase: o "flashcard-tag" que já
   existia (mostra o nome da unidade em todo cartão de trilha) agora
   mostra essa string pro cartão de professora. Não é um filtro por
   origem (isso é Fase 4) -- é só o mesmo espaço de UI já preenchido com
   um valor que faz sentido em vez de vazar `undefined` pra tela.
4. `buildSpeedOptions()` (distratores de múltipla escolha do Speed
   Review) já tinha fallback pra quando a "unidade" de um cartão não tem
   3 outras cartas (`c.unitId === card.unitId` -- pra cartões de
   professora, todos compartilham `unitId: null`, então esse agrupamento
   os trata como "mesma unidade" entre si, com fallback pra
   `eligibleReviewPool()` geral quando insuficientes) -- não precisou de
   nenhuma mudança, o fallback já existente cobre o caso.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
Fases 1/2 -- o cartão em si é conteúdo autorado pela própria professora,
sem custo marginal de servir; a pergunta de premium continua em aberto
pra quando houver mais de uma professora na plataforma (ex: limite de
cartões ativos simultâneos), não travada em código.

**Testes realizados:** `node --check` sem erro nos arquivos tocados.
Validação funcional via Playwright (fr+zh), login como CONTA ALUNA
(diferente das fases anteriores, que validavam do lado admin) com
`teacher_flashcards` semeado (1 ativo + 1 arquivado no fr, 1 ativo com
pinyin no zh): confirmado `STATE.cards` ganha os cartões corretos
(`origin:'teacher'`, `flashcardStatus` espelhando o status),
`isCardLessonCompleted()` retorna `true` pro ativo e `false` pro
arquivado, `eligibleReviewPool()` inclui o ativo e exclui o arquivado,
`getStudyQueue(scope:'due')` inclui o cartão ativo (fila central
funciona ponta a ponta), cartão de trilha confirmado com `origin:'study'`.
Validação adicional só no fr: sessão de revisão real
(`startReviewSession()`/`renderReviewView()`) renderizada de ponta a
ponta pro cartão de professora -- tag "Da sua professora", frente "la
bibliothèque" com botão de áudio, verso "a biblioteca" após virar o
cartão, sem nenhum "undefined" na tela e sem erro de console novo
atribuível a este código (os `pageerror`/`insert`/`upsert`/`.is` vistos
nos logs são limitações do mock minimalista deste teste em chamadas de
fundo não relacionadas -- analytics/badges/notificações -- mesmo padrão
já registrado nas fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum filtro por origem (`study`/`teacher`/`self`) em nenhuma tela --
  isso é Fase 4 explicitamente. A aluna vê o cartão de professora
  misturado com os de trilha na mesma fila, sem indicação visual além da
  tag "Da sua professora" já existente no espaço que todo cartão usa.
- A aluna ainda não tem NENHUMA tela dedicada pra ver "meus cartões da
  professora" separadamente, nem sabe que foi vinculada a uma professora
  -- só vê os cartões aparecendo naturalmente na revisão normal.
- Edição de um cartão já criado pela professora não foi implementada
  nesta fase nem na anterior (só criar/arquivar/reativar).

Próxima fase (4 -- filtros por origem) só começa depois de autorização
explícita da autora, com este relatório já entregue antes de pedir luz
verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 4".**

## Fase 4 (filtro por origem) -- aluna pode escolher revisar só trilha ou só cartões da professora

**Escopo**: filtro puramente de UI/seleção, sem migração nenhuma --
`origin` já existia em todo cartão desde a Fase 3. A ideia é simples:
deixar a aluna escolher, na tela Revisão, se quer ver TODOS os cartões
(padrão), só os DA TRILHA, ou só os DA PROFESSORA.

**Onde entrou:** `eligibleReviewPool()` -- o único pool base que toda tela
de revisão/prática já usava (Flashcard, Palavras Difíceis, Speed Review,
Combinar, hero widget "Revisões pendentes", mode-select) -- ganhou mais um
`.filter()` (`matchesReviewOriginFilter`), na frente de
`STATE.studySettings.reviewOriginFilter` (`'all'` padrão | `'study'` |
`'teacher'`). Como era o único pool que todo mundo já usava (herança das
Fases 4/7 do projeto de motor de memória, ver histórico), bastou mexer
num lugar só pro filtro valer em toda tela -- mesma vitória arquitetural
já registrada como "aposta validada" na entrega da Fase 3.

**Achado durante a implementação, corrigido antes de finalizar:**
`startReviewSession()` (a função que de fato monta a fila jogada na tela
de Flashcard) tinha sua PRÓPRIA cópia inline do filtro
(`STATE.cards.filter(isCardLessonCompleted)`), sem passar por
`eligibleReviewPool()`. Se eu só tivesse mexido em `eligibleReviewPool()`,
o painel de configurações mostraria contagens filtradas corretamente mas
a sessão de revisão de verdade ignoraria o filtro -- a prévia mentiria
sobre o que a aluna ia receber. Corrigido trocando essa cópia por
`eligibleReviewPool()` também (só no ramo de revisão geral -- estudar
uma unidade específica da trilha, `STATE.reviewSessionUnitFilter`,
continua fora do filtro de origem de propósito: cartão de professora
nunca pertence a uma unidade mesmo, então nunca entraria ali de
qualquer forma).

**UI**: novo `<select id="review-origin-select">` no painel "⚙️
Configurar sessão" (mesmo painel de Filtro de fila/Frequência/Palavras
novas/Intensidade), com contagem entre parênteses em cada opção (mesmo
padrão do filtro de fila existente). **Só aparece pra quem TEM pelo
menos um cartão de origem `'teacher'`** (`review-origin-select-wrap`
com `hidden` controlado em `renderReviewSettingsView()`) -- pra
99%+ das alunas (sem professora vinculada ainda) esse controle seria
ruído puro, uma escolha sem nenhum efeito. Replicado fr+zh, mesma
estrutura de HTML/JS nos dois.

**Decisões arquiteturais tomadas nesta fase:**
1. Filtro é um `STATE.studySettings` normal (mesmo padrão de
   `reviewFilter`/`reviewFrequency`/etc.) -- persiste em
   `serializeState()`/`applySerializedState()` sem nenhuma mudança
   nelas (já serializam `studySettings` inteiro).
2. `matchesReviewOriginFilter()` é função própria (não inline dentro de
   `eligibleReviewPool()`) só pra manter o padrão de nomear cada
   critério de filtro isoladamente, mesmo espírito de
   `isCardLessonCompleted()`.
3. Contagens do filtro de fila (Todas/Mais difíceis primeiro/Mais
   antigas primeiro) dentro do painel de config JÁ herdam o filtro de
   origem automaticamente, porque todas elas partem de
   `eligibleReviewPool()` -- não precisou de nenhum ajuste adicional
   pra manter os dois filtros consistentes entre si.

**Gratuito x Premium (avaliado, não implementado):** filtro de
visualização puro, sem custo marginal -- mesma conclusão das fases
anteriores, nenhuma razão pra diferenciar por plano.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh), 2
cenários por idioma -- aluna COM cartão de professora e aluna SEM
nenhum: confirmado que o `<select>` fica oculto quando não há cartão de
professora (`originWrapHidden===true`) e visível com as 3 opções
corretas quando há (`"Todas (N)"`/`"Da trilha (N)"`/`"Da professora
(N)"`); filtrar por `'teacher'` retorna só cartões `origin==='teacher'`,
filtrar por `'study'` só `origin==='study'`, e a soma dos dois bate com
o total sem filtro (`sumMatches===true`); confirmado que
`startReviewSession()` (não só `eligibleReviewPool()`) respeita o
filtro -- a fila de revisão de verdade só contém cartões de professora
quando o filtro está em `'teacher'`. Sem erro de console novo atribuível
a este código (mesmo `pageerror` pré-existente de
`shared/notifications.js`/`.is()` já registrado nas fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma indicação de origem fora da tela de Revisão -- "Suas palavras"
  (fracas/medianas/fortes) e outros widgets continuam agregando as duas
  origens juntas, sem quebra por origem. Não foi pedido nesta fase.
- Filtro por origem só existe pra REVISÃO -- não afeta "Trilha"/Estudo
  normal (que nunca mostra cartão de professora mesmo, só vocabulário de
  unidade).
- Aluna continua sem nenhuma tela dedicada "meus cartões da professora"
  fora da fila de revisão normal -- a única forma de isolar é usar este
  filtro, não existe uma lista/galeria separada.

Próxima fase (5 -- criação de cartão pela própria aluna) só começa
depois de autorização explícita da autora, com este relatório já
entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 5".**

## Fase 5 (criação de cartão pela própria aluna) -- terceira origem no mesmo motor, "Meus Cartões" pra toda conta

**Escopo**: dar à ALUNA (qualquer conta logada, não só quem tem professora
vinculada) a possibilidade de autorar seus próprios flashcards -- palavras/
frases que ela quer memorizar mesmo que não estejam na trilha nem tenham
sido atribuídas por uma professora. Mesmo princípio arquitetural central de
toda a feature (topo da seção "Sistema de alunas particulares" acima): uma
terceira origem (`origin: 'self'`) no MESMO motor de cartão/revisão, nunca
um sistema paralelo -- irmã de `origin: 'teacher'` (Fase 2/3), não uma
reinvenção.

**O que foi feito:**

- **Migration `028_create_student_flashcards_table.sql`** -- tabela nova
  `student_flashcards` (`student_id`, `language_app_key`, `front`,
  `front_pinyin` opcional, `back_trans`, `note` opcional, `status` em
  `('active','archived')`). Diferente de `teacher_flashcards` (escrita só
  admin), aqui quem autora e quem é dona do cartão são a MESMA pessoa --
  RLS de uma linha só (`student_flashcards_owner_all`, `for all using/with
  check auth.uid() = student_id`), sem distinção leitura/escrita
  professora/aluna. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/student-flashcards.js`** (novo) -- irmão de
  `shared/teacher-flashcards.js`: `fetchMyOwnFlashcards` (todos os status,
  mesmo motivo de `fetchFlashcardsForCurrentStudent` -- preservar progresso
  de memória de cartão arquivado), `createOwnFlashcard` (mesma validação
  front/back não-vazios), `setOwnFlashcardStatus`.
- **`shared/my-flashcards.js`** (novo) -- tela "Meus Cartões"
  (`renderMyFlashcardsView`), irmã de `shared/admin-flashcards.js` mas SEM
  gate de admin e sem seletor de aluna/idioma (o idioma é sempre o do site
  em que a conta está, `APP_KEY` -- a aluna não escolhe pra quem é o
  cartão, é sempre pra ela mesma). Campo Pinyin só aparece quando
  `APP_KEY==='mandarim'` (mesmo padrão progressivo de
  `admin-flashcards.js`). Reaproveita as mesmas classes CSS
  (`admin-badge-row`/`profile-section`) -- zero CSS novo, mesmo padrão já
  usado em `admin-students.js`/`admin-flashcards.js`.
- **Nova entrada "📇 Meus cartões" no menu do avatar** (`#user-menu-dropdown`,
  fr+zh), entre "🏆 Ranking" e "⚙️ Configurações" -- SEM a classe
  `admin-only-nav` (diferente de "🛠️ Painel de Admin" logo abaixo), porque
  é uma feature pra QUALQUER conta, não só professora/admin. Nova
  `<div class="view" id="view-my-flashcards">` (fr+zh `index.html`), aba
  registrada em `tabHandlers` (`shared/tabs.js`/`createTabSwitcher`) como
  `'my-flashcards': renderMyFlashcardsView`.
- **`buildCardFromSelfFlashcard(row)`** (novo, fr/zh `app.js`) -- terceiro
  builder de card, ao lado de `buildCardsFromUnits()` (`origin:'study'`) e
  `buildCardFromTeacherFlashcard()` (`origin:'teacher'`). Mesmo shape
  completo de FSRS, `origin:'self'`, `unitId`/`vocabIdx: null`,
  `unitTitle: 'Meus cartões'`. id `s${row.id}` -- terceiro namespace,
  nunca colide com `u${unitId}-v${idx}` (trilha) nem `t${row.id}`
  (professora, tabela DIFERENTE -- ids numéricos podem coincidir entre as
  duas tabelas sem problema, o prefixo já resolve). No zh, mesmo
  mapeamento hanzi/pinyin separado já usado no cartão de professora
  (`front_pinyin`/`back_hanzi`, `|| ''` pra nunca renderizar "undefined").
- **`mergeSelfFlashcardsIntoState()`** (novo) -- busca os cartões da conta
  logada e mescla em `STATE.cards`, chamada logo depois de
  `mergeTeacherFlashcardsIntoState()` em `loadStateAndRender()`, ANTES de
  `loadState()` -- exatamente o mesmo mecanismo da Fase 3 (o merge por id
  de `applySerializedState()` só preserva progresso de cartão cuja id já
  esteja na lista fresca).
- **`isCardLessonCompleted(card)`** ganhou `origin==='self'` no MESMO
  `if` que já tratava `origin==='teacher'` (`return card.flashcardStatus
  === 'active'`) -- não um `else if` novo, o critério é idêntico pras
  duas origens (nenhuma pertence a unidade, elegibilidade = não estar
  arquivado). Confirma de novo a aposta arquitetural da Fase 3: uma
  origem nova só precisou tocar este ÚNICO ponto de checagem pra
  propagar corretamente a `eligibleReviewPool()`/`getStudyQueue()`/os 4
  pontos de entrada de revisão -- nenhum deles precisou de mudança
  própria.
- **`addSelfFlashcardToState(row)` / `updateSelfFlashcardStatusInState(id,
  status)`** (novos) -- diferença importante em relação à Fase 2/3: lá,
  quem cria/arquiva o cartão de professora é a PROFESSORA (outra sessão
  de navegador, sem `STATE.cards` da aluna carregado ali). Aqui, quem
  cria/arquiva é a PRÓPRIA aluna, na MESMA sessão de navegador que já tem
  `STATE.cards` carregado -- sem essas duas funções, o cartão recém-criado
  só entraria na fila de revisão (ou um arquivamento só sairia dela) no
  PRÓXIMO carregamento do app (`mergeSelfFlashcardsIntoState()` só roda no
  boot), fazendo o toast "já entra na sua fila de revisão" ser uma
  promessa vazia até a aluna recarregar a página. Chamadas direto de
  `shared/my-flashcards.js` depois de `createOwnFlashcard`/
  `setOwnFlashcardStatus` bem-sucedidos.
- **Filtro de origem da Fase 4 estendido pra 3 origens** -- `<option
  value="self">` no `#review-origin-select`, `REVIEW_ORIGIN_LABELS.self =
  'Meus cartões'`. Diferente da Fase 4 original (só 2 origens possíveis
  além de "Todas", sempre mostradas juntas quando `hasTeacherCards`), com
  3 origens possíveis mostrar uma opção sempre-zero seria confuso --
  `renderReviewSettingsView()` agora só inclui `<option value="teacher">`
  quando `hasTeacherCards` e `<option value="self">` quando
  `hasSelfCards`, independentemente uma da outra (uma aluna pode ter só
  cartão próprio, só de professora, os dois, ou nenhum). O wrap
  (`#review-origin-select-wrap`) fica visível se QUALQUER uma das duas
  origens especiais existir. `matchesReviewOriginFilter()` e
  `eligibleReviewPool()` (Fase 4) não precisaram de NENHUMA mudança --
  já eram genéricos (`card.origin === filter`), só passaram a valer pra
  um terceiro valor possível de origem automaticamente.

**Decisões arquiteturais tomadas nesta fase:**
1. `student_flashcards` é tabela PRÓPRIA, não uma extensão de
   `teacher_flashcards` com `teacher_id` nulo -- mantém a distinção clara
   de responsabilidade/RLS (uma tabela é "conteúdo que uma professora dá
   pra uma aluna administrar", a outra é "conteúdo que a aluna administra
   sozinha"), mesmo que o *shape* de card resultante em `STATE.cards`
   seja quase idêntico (reflexo do princípio "dono x origem": tabelas de
   origem podem ser plurais, o motor de revisão que consome o resultado é
   um só).
2. Sem seleção de idioma no formulário de "Meus Cartões" -- diferente do
   form de admin (`admin-flashcards.js`, onde a professora escolhe entre
   várias alunas de idiomas potencialmente diferentes), aqui a conta só
   tem UM idioma relevante no momento: o do site em que está (`APP_KEY`).
   Se a mesma pessoa estuda francês E mandarim (duas contas/perfis
   separados hoje, sem conceito de conta multi-idioma no app), cada
   cartão próprio criado em `fr/` ou `zh/` fica automaticamente escopado
   ao `language_app_key` certo, sem pergunta extra.
3. `addSelfFlashcardToState`/`updateSelfFlashcardStatusInState` só
   existem pro lado "self" (não pro lado "teacher") porque só aqui
   criador e "dona da sessão aberta" são a mesma pessoa -- reforça que
   Fase 2/3 não precisava disso: a professora nunca tem o `STATE.cards`
   da aluna carregado na própria sessão.

**Gratuito x Premium (avaliado, não implementado):** primeira vez nesta
feature em que a pergunta toca uma conta comum diretamente (não só
professora/admin) -- avaliada explicitamente, não pulada. Conclusão: sem
custo marginal de servir (é conteúdo escrito pela própria aluna, mesmo
raciocínio das fases anteriores), então tudo grátis por enquanto faz
sentido como padrão -- mas esta é a primeira peça da feature onde um
LIMITE por conta (ex: nº máximo de cartões próprios simultâneos no plano
gratuito, com um teto maior ou ilimitado no premium) seria uma alavanca de
monetização natural e direta, diferente das fases anteriores (onde o
"produto" ainda era só ferramenta de gestão da professora). Não travado em
código nesta entrega -- fica registrado aqui como a pergunta mais concreta
até agora pra quando a infraestrutura de assinatura (ainda inexistente,
ver seção "Considerar plano gratuito x premium" no topo deste arquivo)
existir de verdade.

**Testes realizados:** `node --check` sem erro em todos os arquivos
tocados/novos. Validação funcional via Playwright (fr+zh), login como
CONTA ALUNA com `student_flashcards` semeado (2 cartões no fr -- 1 ativo +
1 arquivado --, 1 cartão ativo com pinyin no zh): confirmado `STATE.cards`
ganha os cartões corretos (`origin:'self'`, `flashcardStatus` espelhando o
status), `isCardLessonCompleted()` concorda com `flashcardStatus` nos
dois casos. Fluxo de CRIAÇÃO AO VIVO testado de ponta a ponta: preencher o
formulário "Meus Cartões" e submeter sobe a contagem no banco fake E no
DOM, e -- ponto crítico desta fase -- o cartão novo já aparece em
`eligibleReviewPool()` IMEDIATAMENTE, sem precisar recarregar a página
(`addSelfFlashcardToState` confirmado funcionando, não só teórico).
Arquivar via UI confirmado atualizando `status` no banco E
`flashcardStatus` no `STATE.cards` já carregado na mesma sessão
(`updateSelfFlashcardStatusInState`), com o cartão saindo de
`isCardLessonCompleted()`/elegibilidade imediatamente, mesma lógica
"nunca some de `STATE.cards`, só sai da fila" das fases anteriores.
Filtro de origem confirmado mostrando a opção "Meus cartões" (não
"Da professora", que não existia neste cenário) quando só há cartão
próprio, com contagem correta. Testado nos dois idiomas (fr+zh), campo
Pinyin confirmado ausente no fr e presente no zh. Sem erro de console novo
atribuível a este código (mesmos dois `pageerror` pré-existentes de
`shared/notifications.js`/`.is()` e `shared/analytics.js`/`.upsert()` já
registrados como limitação do mock em todas as fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Edição de um cartão próprio já criado (só front/back/note/pinyin, não
  status) não foi implementada -- só criar e arquivar/reativar, mesmo
  escopo que `teacher_flashcards` ficou nas Fases 2/3.
- Nenhum limite de quantidade de cartões próprios por conta -- ver
  "Gratuito x Premium" acima, pergunta em aberto, não travada em código.
  **Resolvido logo em seguida, ver Fase 5.1 abaixo.**
- Filtro por origem (Fase 4) continua só na tela de Revisão -- "Meus
  Cartões" é uma tela de GESTÃO (criar/arquivar), não de revisão em si; a
  aluna revisa o cartão próprio misturado com os outros na fila normal,
  ou isolado via o filtro de origem já existente.
- Fase 6 do prompt-mestre original (supervisão da professora/métricas) e
  Fase 7 (histórico de "Aula") continuam não iniciadas.

## Fase 5.1 (limite de cartões próprios) -- grillada explicitamente, teto pro plano grátis em vez de bloqueio total

A autora pediu, logo após a entrega da Fase 5: "grave no código: criar
cartões próprios é uma feature premium ou de alunos... deve haver algum
ícone/stamp/selo e aviso pop up... ou acha melhor apenas limitar o número
de cartões próprios?" Antes de implementar, grillei 2 perguntas (via
`AskUserQuestion`) porque a resposta óbvia entraria em conflito direto com
a regra "não presumir infraestrutura ativa" (topo deste arquivo): não
existe Stripe/tabela de planos/checagem de tier em nenhum lugar do código
-- nenhuma das 21 contas reais é "premium" hoje, porque não há COMO uma
conta virar premium ainda.

**Perguntas e respostas da autora:**
1. *O que define "aluno" pra esse gate, já que toda conta nasce com
   `role='student'` por padrão?* → **Ter vínculo ativo com uma professora**
   (`teacher_students`, `status='active'`) -- reaproveita dado real já
   existente desde a Fase 1, não um conceito novo.
2. *Como aplicar a parte "premium" agora, sem assinatura real?* → **Só
   limite de quantidade, sem bloqueio total** -- rejeitou a opção de selo
   + popup bloqueando de vez (que, checada explicitamente na pergunta,
   deixaria "Meus Cartões" inutilizável pra praticamente todas as contas
   reais hoje, revertendo na prática o que a Fase 5 acabou de entregar).

**Síntese implementada, combinando as duas respostas:** `FREE_OWN_
FLASHCARD_LIMIT = 20` (`shared/my-flashcards.js`) -- teto de cartões
PRÓPRIOS ATIVOS pro plano grátis (a maioria das contas hoje). Uma aluna
com vínculo ativo com QUALQUER professora (`hasActiveTeacherLink()`, novo
em `shared/roles.js`, checa `teacher_students` onde `student_id=auth.uid()`
e `status='active'`) fica ISENTA do teto -- cartões ilimitados. Nenhuma
conta é bloqueada de usar a feature; só quem não tem vínculo e já criou 20
cartões ativos não consegue criar o 21º até arquivar algum ou vincular com
uma professora.

**O que foi feito:**

- **`hasActiveTeacherLink()`** (novo, `shared/roles.js`) -- único ponto de
  checagem pra "esta conta está isenta do teto". Eixo DIFERENTE de
  `fetchMyRole()`/`isTeacherOrAdmin()` (aqueles leem `profiles.role`; este
  lê o vínculo em `teacher_students` do lado da aluna).
- **Selo de tier** (não "premium" -- só comunica o que já é real hoje):
  `renderMyFlashcardsView()` mostra `✨ Aluna vinculada — cartões
  ilimitados` (reaproveita `.pill`, já existe no CSS pro streak/XP do
  topbar, zero CSS novo) quando `hasActiveTeacherLink()===true`, ou
  `🔒 Plano grátis — N/20 cartões` quando `false`.
- **Botão desabilitado + texto muda pra "Limite atingido"** quando
  `!hasLink && activeCards.length >= 20` -- feedback já visível antes de
  tentar submeter, não só no popup.
- **Popup de aviso** (`#flashcard-limit-modal`, novo em fr+zh
  `index.html`, mesmo padrão HTML/JS de todo modal existente no app --
  `.app-modal-overlay`/`.app-modal`, abrir com `style.display='flex'`,
  fechar via botão `✕` ou clique no fundo) -- aberto pelo handler de
  submit do formulário como checagem de verdade (não só o `disabled` do
  botão, que cobre o caminho normal mas não é a fonte da verdade). Texto
  explica o teto E a saída (arquivar um cartão, ou vínculo com professora
  remove o limite) -- nunca promete "upgrade pra premium" porque essa
  opção não existe no produto ainda.
- **Nada em `student_flashcards`/RLS mudou** -- o limite é checado só no
  cliente (client-side gate, mesmo nível de confiança de outros limites
  de UI no app hoje, ex: `newCardsPerDay` do motor de revisão). Não é uma
  fronteira de segurança (uma aluna tecnicamente poderia inserir na tabela
  direto via API) -- aceitável pro escopo desta feature (não é dado
  sensível, é o próprio conteúdo dela), mesmo nível de rigor de outros
  limites de UX já existentes no app.

**Gratuito x Premium (resolvido nesta entrega, substitui a pergunta em
aberto da Fase 5):** com a resposta da autora, "premium" nesta feature
específica não existe ainda como conceito formal -- o que existe é
"aluna vinculada a uma professora" vs. "conta sem vínculo", e o teto de
20 é hoje o único comportamento que distingue os dois. Quando a
plataforma tiver assinatura de verdade, este é o ponto exato a
substituir/estender (`hasActiveTeacherLink()` → checagem de tier real,
ou um segundo eixo além do vínculo) -- não reinventar do zero.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh), 4
cenários: (1) sem vínculo, poucos cartões -- badge mostra contagem,
criação funciona normalmente; (2) sem vínculo, EXATAMENTE no teto (20
ativos) -- badge `20/20`, botão desabilitado com texto "Limite atingido",
tentativa de submit não grava no banco (`dbCountDelta===0`) e abre o
popup (`limitModalVisible===true`), popup fecha corretamente pelo botão
✕; (3) COM vínculo ativo, 25 cartões (acima do teto) -- badge mostra
"ilimitado", criação funciona normalmente mesmo acima de 20
(`dbCountDelta===1`); (4) zh no cenário do teto, mesmo resultado do fr.
Sem erro de console novo atribuível a este código (mesmos dois
`pageerror` pré-existentes de mock já registrados na Fase 5).

Próxima fase (6 -- supervisão da professora/métricas, conforme o
prompt-mestre original) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 6" +
grilling de escopo (o nome "supervisão da professora/métricas" nunca
tinha sido detalhado no prompt-mestre original) + segunda confirmação
explícita antes de tocar em dado sensível (ver abaixo).**

## Fase 6a (painel de métricas por aluna) -- primeira vez que uma professora lê dado de progresso de uma aluna

**Escopo, grillado em 2 rodadas antes de codar:** a Fase 6 nunca teve
descrição além do nome no prompt-mestre original. Perguntei explicitamente
o que ela deveria cobrir -- a autora escolheu a opção maior
("Painel + alertas de infrequência"), mas eu já tinha sinalizado na
própria pergunta que isso provavelmente merecia virar duas entregas
separadas. Auditando (só leitura) antes de codar, achei um motivo
CONCRETO pra isso, não só disciplina de escopo: o "painel" esbarra num
bloqueio de dados real que o "alerta" não esbarra (alerta cruza pro
`notification-cron`, sistema já existente, sem essa questão). Por isso
esta entrega é só o painel (**Fase 6a**) -- alertas de infrequência ficam
pra uma **Fase 6b** explicitamente separada, só depois de autorização de
novo.

**O bloqueio encontrado (auditoria ao vivo via Supabase MCP, antes de
qualquer código):** `progress` é uma tabela de UMA linha por conta
(`user_id`, `data` jsonb, `updated_at`) -- `data` é o `STATE` inteiro
serializado, namespaced por idioma (`{ frances: {...}, mandarim: {...} }`,
confirmado lendo `shared/auth.js` `saveState()`/`loadState()`). RLS de
`progress` hoje: só `auth.uid() = user_id`, pra leitura E escrita --
**nenhuma professora, vinculada ou não, tinha (ou tem agora, ver abaixo)
acesso a ler o progresso de nenhuma aluna.** Isso significa que "painel
de métricas" não é só UI -- é a PRIMEIRA vez nesta feature (e no app
inteiro) que uma conta passaria a enxergar dado de progresso de outra
conta. Reconheci isso como uma fronteira de privacidade nova, não uma
feature de UI comum, e voltei pra autora com uma segunda confirmação
explícita antes de tocar em RLS/dado sensível -- ela confirmou
"Sim, com o escopo mínimo".

**Decisão de design pra manter o escopo mínimo prometido:** em vez de uma
RLS policy de `SELECT` direta em `progress` (que exporia a linha INTEIRA
-- os dois idiomas juntos, todas as respostas/histórico granular,
inclusive os cartões que a ALUNA criou sozinha, que não são da
professora), o único ponto de acesso é uma **function `SECURITY DEFINER`**
(`get_teacher_student_metrics(p_student_id, p_language_app_key)`,
migration `029_create_teacher_student_metrics_function.sql`) que:
1. Checa o vínculo ativo (`teacher_students`, `status='active'`,
   `teacher_id = auth.uid()`) ELA MESMA, antes de tocar em qualquer dado
   -- se não autorizada, devolve `{"error": "not_authorized"}`, nunca a
   linha. **Testado ao vivo**: chamando a function pra um par
   aluna/idioma qualquer sem contexto de professora autenticada, o
   retorno foi exatamente `{"error":"not_authorized"}` -- confirma que o
   bloqueio é real, não só teórico.
2. Escopa ao idioma do vínculo (`data -> p_language_app_key`), nunca ao
   outro idioma que a mesma conta possa ter.
3. Filtra `cards[]` só pelos ids que pertencem a `teacher_flashcards`
   DESTA professora especificamente pra ESTA aluna (`id = 't' ||
   teacher_flashcards.id`) -- nunca cartão de trilha (`origin:'study'`)
   nem auto-criado pela aluna (`origin:'self'`, Fase 5).
4. Devolve só AGREGADOS (contagens) -- nunca a frente/verso de um cartão
   específico, nunca uma resposta/histórico granular: `lastStudyDay`,
   `teacherCardsTotal/Active/Archived/NeverReviewed`, e uma classificação
   `Weak/Medium/Strong` que reaproveita **a mesma regra exata** de
   `vocabStrengthBuckets()` (fr/zh `app.js`: `reps===0||lapses>=2` =
   fraca, `reps>0&&lapses<2&&interval>=60` = forte, resto = mediana) --
   não inventei um critério novo.
- RLS de `progress` continua **sem nenhuma policy nova** -- toda a
  autorização mora dentro da function, não na tabela.
- Migration aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente.

**O que foi feito no cliente:**
- **`shared/student-metrics.js`** (novo) -- `fetchTeacherStudentMetrics(studentId,
  languageAppKey)`, único call site que chama a RPC. Trata `data.error`
  (não-autorizado) e erro de rede da mesma forma -- devolve `null`, UI
  mostra fallback genérico em vez de vazar qual dos dois aconteceu.
- **`shared/admin-students.js`** estendido -- cada linha de "Suas alunas"
  (aba "🎓 Alunos") ganhou um botão "📊" que expande/recolhe um painel
  inline logo abaixo da própria linha (mesmo padrão visual de
  `admin-badge-row`, zero CSS novo). Busca via RPC só na PRIMEIRA vez que
  aquele vínculo é aberto na sessão (`STUDENT_METRICS_CACHE`, chave =
  id do vínculo, não do aluno -- evita colisão se a mesma aluna tiver mais
  de um vínculo/idioma) -- clique de fechar/abrir depois disso é só
  toggle de `display`, sem nova chamada de rede.
- 3 estados de exibição tratados explicitamente: com dado (contagens
  reais), sem nenhum cartão da professora ainda pra essa aluna (aponta
  pra aba "📇 Flashcards"), e falha/não-autorizado (mensagem genérica).

**Decisões arquiteturais tomadas nesta fase:**
1. Métricas escopadas SÓ aos cartões que a PRÓPRIA professora autorou --
   não é um "raio-x" da conta inteira da aluna (que incluiria trilha e
   cartões próprios da Fase 5). Reflexo direto do "escopo mínimo"
   aprovado: a professora só precisa saber como ESTÁ INDO O QUE ELA
   ENSINOU, não vigiar tudo que a aluna faz no app.
2. `lastStudyDay`/"última atividade geral" É a única informação que sai
   do escopo "só cartões da professora" -- decisão deliberada: sem saber
   se a aluna ainda está ativa no app, os números de "fracas/medianas/
   fortes" ficam sem contexto (uma aluna com 0 "fracas" porque sumiu há 3
   semanas não é a mesma coisa que uma com 0 fracas porque está
   estudando bem). Não expõe streak (`STATE.streak`, hoje sabidamente
   "congelável", ver seção anterior deste arquivo) nem XP nem nenhum
   outro campo de `data`.
3. `SECURITY DEFINER` + checagem de autorização DENTRO da function (não
   uma RLS policy declarativa) foi escolha deliberada, não atalho -- uma
   RLS policy em `progress` só consegue controlar acesso por LINHA
   inteira; o requisito de "só o idioma do vínculo, só agregado, nunca o
   cartão auto-criado" precisa de lógica além do que `USING`/`WITH CHECK`
   conseguem expressar sozinhos.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
Fases 1-3 -- ferramenta de gestão da própria professora sobre suas
próprias alunas, sem conceito de cobrança nesta ponta (a professora É a
autora/admin hoje). Fica a mesma pergunta em aberto já registrada nas
fases anteriores pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `node --check` sem erro. Verificação ao vivo da
function no banco real (`mcp__Supabase__execute_sql`) confirmando que uma
chamada sem professora autenticada retorna `{"error":"not_authorized"}`
-- a fronteira de segurança é real, testada contra o Postgres de
produção, não só assumida pela leitura do SQL. Validação funcional via
Playwright (fr), 3 cenários mockando a resposta da RPC: (1) com dado
completo -- painel mostra "2 dias atrás"/"4 ativos, 1 arquivados"/
"2 nunca revisados"/"3 fracas · 1 medianas · 1 forte", todos os números
batendo com o mock; (2) resposta `not_authorized` -- painel mostra a
mensagem de fallback genérica, sem crash; (3) zero cartões da professora
ainda -- painel mostra o estado vazio apontando pra "📇 Flashcards".
Toggle abrir/fechar confirmado nos 3 cenários. Sem erro de console novo
atribuível a este código (mesmo `pageerror` de `.maybeSingle` já
registrado em fases anteriores como limitação do mock, não deste código).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- **Fase 6b (alertas de infrequência)** -- a metade que a autora também
  pediu, mas que cruza pro `notification-cron` (Edge Function já em
  produção) em vez de só UI/RLS -- escopo e mecanismo (novo tipo de
  notificação pra professora? novo `event_type`? dispara quando?) ainda
  não desenhados, só nomeados. Próxima entrega explícita, não começada.
- Painel só mostra métricas dos cartões DA PROFESSORA -- nenhuma
  visibilidade sobre progresso geral da trilha ou cartões próprios da
  aluna (Fase 5), decisão deliberada (ver acima), não esquecimento.
- Nenhuma exportação/histórico ao longo do tempo -- é um snapshot do
  estado atual, sem gráfico de evolução.
- zh não foi validado separadamente nesta entrega (só fr) -- a tela
  "🎓 Alunos"/painel de métricas é 100% compartilhada entre os dois
  idiomas (mesmo `shared/admin-students.js`, sem nenhum branch por
  idioma), então o risco de regressão zh-específica é baixo, mas registrar
  aqui por completude -- mesmo padrão de honestidade já usado quando uma
  fase anterior valida só um idioma.

Próxima fase (6b -- alertas de infrequência pra professora) só começa
depois de autorização explícita da autora, com este relatório já
entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Pode seguir".**

## Fase 6b (alerta de infrequência pra professora) -- segundo evento cruzando pra `notification-cron`, primeiro com destinatário ≠ sujeito

**Escopo**: avisar a professora quando uma aluna vinculada some por um
número de dias, dentro do `notification-cron` (Edge Function já em
produção) -- diferente da Fase 6a (painel puxado sob demanda pela
professora), aqui é a plataforma que avisa PROATIVAMENTE, mesmo mecanismo
de `review_overdue`/`streak_at_risk`/reengajamento já existentes, só que o
DESTINATÁRIO da notificação não é o SUJEITO do dado -- primeira vez que
isso acontece no arquivo inteiro. Antes de codar, reli `maybeNotify()`
(a função central de disparo) e confirmei que ela já era agnóstica quanto
a isso -- `userId` é só "pra quem grava/envia", nunca presumido como "de
quem é o progresso lido" -- então nenhuma mudança de mecanismo foi
necessária, só uma categoria nova + um processador novo que lê o progresso
de UMA conta (aluna) e notifica OUTRA (professora).

**O que foi feito:**

- **Migration `030_add_teacher_supervisao_notification.sql`** -- nova
  linha em `notification_rules` (categoria `supervisao`, `priority:3`,
  `cooldown_minutes:1440`/`daily_cap:1` -- mesmo padrão de
  `reengajamento`, no máximo 1 aviso por professora por dia, ver abaixo
  por quê basta) + 4 linhas em `notification_templates`
  (`event_type:'student_inactive_alert'`, só canal `in_app`, 2 variantes
  x 2 `language_app_key`). `schedule_days: [3,7,14]` -- reaproveita o
  MESMO mecanismo de marco de dias do calendário de reengajamento (só
  dispara quando `daysSince(lastStudyDay)` bate EXATAMENTE um desses
  números, não em todo dia depois disso) -- marcos mais curtos que o
  autorreengajamento da própria aluna (1..30), porque aqui quem decide
  agir é a professora, faz sentido ela saber mais cedo. **Números
  escolhidos por mim, não confirmados com a autora** -- são um parâmetro
  de UMA linha (`UPDATE notification_rules SET schedule_days=... WHERE
  category='supervisao'`), ajustável a qualquer momento sem deploy de
  código novo; sinalizando aqui pra ela poder pedir outro valor se achar
  os marcos muito cedo/tarde. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente.
- **`processTeacherStudentAlerts()`** (novo, `supabase/functions/
  notification-cron/index.ts`) -- roda 1x por invocação (mesmo padrão de
  `processWeeklyRankingResults`/`processFeaturedBadgeReminders`, não por
  usuário/idioma como `processUserLanguage`): lê todos os vínculos ativos
  de `teacher_students`, agrupa por `(teacher_id, language_app_key)`, e
  pra cada aluna do grupo cujo `daysSince(lastStudyDay)` bate um marco de
  `schedule_days`, acumula um "hit". Se o grupo tiver pelo menos 1 hit,
  busca os nomes em `profiles` (join manual em JS, mesmo padrão de
  `fetchMyStudents()`/`admin-badges.js`) e dispara UMA ÚNICA
  `maybeNotify()` pro grupo inteiro, com `studentList` já formatado
  ("Nome (N dias)", separado por vírgula quando há mais de uma). **Por
  que agrupar em vez de 1 notificação por aluna**: evita que uma
  professora com várias alunas sumindo no mesmo dia estoure o
  `daily_cap` da categoria e perca avisos -- e evita spam mesmo dentro do
  cap. `actionTab: 'admin-badges'` -- mesmo id de aba que "🛠️ Painel de
  Admin" usa (`renderAdminPanelView`, que já mostra a subseção "🎓 Alunos"
  quando é essa a selecionada); não existe deep-link pra uma subseção
  específica do painel hoje, então cai na mesma aba que os outros eventos
  de admin (`featured_badge_reminder` usa `'profile-edit'` por um motivo
  parecido -- entra na aba mais próxima que já existe, sem inventar
  roteamento novo).
- **`NOTIFICATION_CATEGORY_ICON.supervisao = '🎓'`** (`shared/
  notifications.js`) -- ícone de fallback no sino/dropdown quando o
  template não tiver um `icon` próprio (mesmo emoji já usado na aba "🎓
  Alunos", consistência visual).
- **`'supervisao'` de propósito NÃO entrou em `NOTIFICATION_PREF_
  CATEGORIES`** (`shared/notification-preferences.js`) -- mesmo
  precedente já usado por `'perfil'` (lembrete de badge em destaque):
  categoria de baixíssimo volume, só afeta contas professora/admin,
  `categoryAllowsInApp()` já retorna `true` por padrão quando não há
  preferência salva pra ela, então funciona sem exigir um toggle
  dedicado nesta fase. Sem variante de e-mail também (só `in_app`) --
  mesmo critério de várias outras categorias que não têm pool de e-mail
  próprio ainda.

**Deploy da Edge Function**: feito AO VIVO nesta sessão via
`mcp__Supabase__deploy_edge_function` (`notification-cron` v15→v16,
mesmo `verify_jwt:true`) -- não é passo manual pendente pra esta
correção, mesmo princípio já registrado na seção "Edge Functions: um fix
no código só vale em produção depois de um novo deploy" acima (aqui é
feature nova, não fix, mas o mesmo raciocínio de deploy-é-parte-da-
entrega se aplica).

**Achado durante a validação, FORA do escopo desta fase, reportado sem
corrigir:** invoquei a function v16 ao vivo (`curl` direto contra a URL
de produção, com a anon key só pra passar o `verify_jwt`) pra confirmar
que `processTeacherStudentAlerts()` não quebra o resto do cron.
`usersScanned:18`, sem erro atribuível ao código novo (a função rodou e
devolveu `notificationsCreated:0` pra essa parte, correto -- confirmei
com `select count(*) from teacher_students where status='active'` que
existem 11 vínculos reais ativos hoje, nenhum deles bateu exatamente nos
marcos 3/7/14 no momento do teste, o que é esperado, não um bug). Mas a
resposta trouxe **3 erros PRÉ-EXISTENTES, não relacionados a esta fase**:
`TypeError: Cannot read properties of undefined (reading 'split')` pra 3
contas distintas, sempre em `frances`. Rastreei a origem sem alterar
nada: `computeMissionProgress()` → `missionCurrent()` →
`getFieldValue(daily, def.field!)` -- quando `state.daily.missions`
contém um `id` de missão que não existe em `MISSION_FIELD_BY_ID` (o mapa
duplicado server-side, ver comentário já existente no arquivo sobre essa
duplicação), `def` vira `{}`, `def.field` vira `undefined`, e
`field.split('.')` quebra. Isso derruba a "Missão 5" (`daily_missions_
reminder`) pra essas 3 contas/idioma a cada execução -- não afeta os
passos 1-4 de `processUserLanguage` (já rodaram e já gravaram suas
notificações antes do crash no passo 5), então não é um bloqueio total,
mas é uma notificação real perdida silenciosamente pra 3 contas, todo
dia, desde antes desta sessão (não introduzi isso -- não toquei em
nenhuma dessas 3 funções). **Não corrigi** por disciplina de escopo desta
fase (é um bug de outra feature -- missões do dia -- não de alertas de
infrequência); registrando aqui pra uma sessão futura investigar qual
`id` de missão está desalinhado entre o cliente e
`MISSION_FIELD_BY_ID`.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
fases 1-6a -- alerta sobre as PRÓPRIAS alunas da professora/admin, sem
conceito de cobrança nesta ponta. Mesma pergunta em aberto já registrada
repetidamente pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `npx tsc --noEmit` sobre o arquivo editado
confirmou zero erro de sintaxe/tipo novo (só os erros pré-existentes de
`Cannot find name 'Deno'`, esperados sem as ambient types do Deno
carregadas -- mesmos erros que o arquivo já tinha antes desta edição).
Invocação real da function v16 em produção (ver "Achado" acima) confirma
que o código novo roda sem lançar exceção e não interfere no resto do
cron. **Não testei o caminho "notificação realmente disparada"
ponta-a-ponta** (nenhuma aluna real bateu um marco de `schedule_days` no
momento do teste) -- a lógica foi validada por leitura + tipo-checagem +
execução real sem erro, não por uma notificação de fato criada e vista no
sino. Uma sessão futura que quiser confirmar o caminho feliz pode
temporariamente ajustar `lastStudyDay` de uma conta de teste pra bater um
marco, invocar a function, e checar a tabela `notifications`.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum canal de e-mail/push pra `supervisao` -- só in-app.
- Marcos de dias (3/7/14) são um palpite meu, não confirmados com a
  autora -- ver nota acima, ajustável com um UPDATE simples.
- Bug pré-existente de `computeMissionProgress` (3 contas, categoria
  `desafios`) encontrado mas não corrigido, ver "Achado" acima --
  trabalho de outra fase.
- Fase 7 (histórico de "Aula") e Fase 8 (outros tipos de conteúdo) do
  prompt-mestre original continuam não iniciadas.

Próxima fase (7 -- histórico de "Aula", conforme o prompt-mestre
original) só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 7" +
grilling de escopo prévio (3 perguntas, ver abaixo).**

## Fase 7 (histórico de "Aula") -- diário de bordo da professora, fora do motor de cartões/revisão

**Escopo, grillado em 1 rodada antes de codar:** a Fase 7 nunca teve
descrição além do nome ("histórico de Aula") no prompt-mestre original --
mesma situação da Fase 6 antes do grilling daquela vez. 3 perguntas via
`AskUserQuestion`:

1. *O que a professora registra por aula?* → **opções 1+2 combinadas**
   (texto livre + campos estruturados), mas com uma correção importante
   da autora sobre a Opção 1: **só DATA, sem hora automática** -- ela
   registra várias aulas juntas no fim do dia, então uma hora "de
   criação" gravada automaticamente ficaria errada pra todas as entradas
   de um mesmo lote (ex: 3 aulas de manhãs diferentes, todas ganhando a
   hora de quando ela sentou pra digitar à noite). Os 4 campos de
   conteúdo (tópico/lição de casa/observações/texto livre) são todos
   opcionais INDIVIDUALMENTE -- exemplo dado por ela: aula de passé
   composé → tópico="passé composé", lição de casa=se houver, observações
   =material/página usada, texto livre=vocabulário e gramática
   trabalhados.
2. *Quem vê?* → **só a professora** (mesmo escopo mínimo já usado no
   painel de métricas da Fase 6a) -- não existe NENHUM caminho pra aluna
   ver isto, diferente de "🎓 Alunos"/"📇 Flashcards".
3. *Editar/apagar?* → **desde já**, diferente de teacher_flashcards/
   student_flashcards (que usam `status:'archived'`, nunca deletam, pra
   preservar progresso de memória FSRS acumulado): uma entrada de aula
   não tem NENHUM estado de memória dependente dela, então DELETE físico
   é seguro aqui -- primeira vez nesta feature que uma tabela usa delete
   de verdade em vez do padrão de arquivamento.

**O que foi feito:**

- **Migration `031_create_teacher_class_logs_table.sql`** -- tabela nova
  `teacher_class_logs` (`teacher_id`, `student_id`, `language_app_key` --
  mesmo trio que `teacher_students`/`teacher_flashcards` já usam --,
  `class_date` DATE (não timestamptz, ver decisão 1 acima, default
  `current_date`), `topic`/`homework`/`observations`/`notes` todos
  nullable). RLS de UMA política só (`teacher_class_logs_owner_all`, `for
  all using/with check auth.uid() = teacher_id`) -- mesmo padrão "dono
  único" de `student_flashcards`, mas aqui o dono é a PROFESSORA, não a
  aluna (que não tem NENHUMA policy de leitura nesta tabela, ver decisão
  2). Aplicada AO VIVO nesta sessão via `mcp__Supabase__apply_migration`
  -- não é passo manual pendente.
- **`shared/teacher-class-logs.js`** (novo) -- `fetchClassLogs`,
  `createClassLog` (valida que pelo menos 1 dos 4 campos de conteúdo
  esteja preenchido, senão rejeita com mensagem explícita -- nenhum CHECK
  constraint no banco pra isso, mesmo nível de rigor de outras validações
  de conteúdo já existentes no app), `updateClassLog` (mesma validação),
  `deleteClassLog` (DELETE físico, ver decisão 3).
- **`shared/admin-class-logs.js`** (novo) + nova subseção "📝 Aulas" no
  Painel de Admin (fr+zh), ao lado de "📇 Flashcards": select de aluna
  (populado por `fetchMyStudents()`, já existente da Fase 1) + form de
  nova aula (data pré-preenchida com hoje, editável; tópico/lição de
  casa/observações/notas) + lista de aulas já registradas, mais recente
  primeiro, cada uma com botões Editar (abre um form inline no lugar da
  própria linha, com Salvar/Cancelar) e Apagar (com `confirm()`).
  Reaproveita as mesmas classes CSS de `admin-flashcards.js`
  (`admin-badge-row`/`profile-section`) -- zero CSS novo.

**Decisões arquiteturais tomadas nesta fase:**
1. `teacher_class_logs` é **completamente desconectado** de
   `STATE.cards`/FSRS/`getStudyQueue()` -- nenhum builder de card, nenhum
   merge no boot do app, nenhuma origem nova (`study`/`teacher`/`self`
   continuam sendo as únicas 3). É puramente um diário de bordo da
   professora sobre suas próprias aulas -- diferente de TODAS as fases
   anteriores desta feature (1 a 6), que sempre giravam em torno do motor
   único de cartão/revisão. Fase 7 é a primeira peça da feature que vive
   inteiramente fora dele, por natureza (não é conteúdo revisável pela
   aluna).
2. **Primeira tabela desta feature com DELETE físico de verdade** (ver
   decisão 3 do grilling) -- todas as anteriores (`teacher_flashcards`,
   `student_flashcards`) usam `status:'archived'` porque têm progresso de
   memória FSRS acumulado dependente da linha continuar existindo. Uma
   entrada de aula não tem essa dependência, então a regra geral do
   prompt-mestre ("nunca apagar histórico/dado ao remover associação")
   não se aplica aqui -- ela existe pra proteger PROGRESSO DE MEMÓRIA da
   aluna, não qualquer linha de qualquer tabela; a autora confirmou
   explicitamente que quer edição/exclusão reais pra este diário
   específico.
3. `class_date` é DATE puro (sem hora), default `current_date`, mas
   EDITÁVEL no formulário -- não travado como "hoje" imutável. Permite a
   professora registrar uma aula de um dia anterior (ela relatou que
   registra em lote no fim do dia, o que sugere que pode querer voltar
   uma aula pro dia real em que aconteceu).
4. Edição é inline (troca a própria linha por um form, não um modal) --
   mesmo padrão de "editar no lugar" já visto em outras telas simples do
   Painel de Admin, sem introduzir um componente de modal novo pra isso.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
fases 1-6b -- ferramenta de gestão da própria professora sobre as
próprias aulas, sem conceito de cobrança nesta ponta (a professora É a
autora/admin hoje). Mesma pergunta em aberto já registrada repetidamente
pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `node --check` sem erro em `shared/teacher-class-
logs.js`, `shared/admin-class-logs.js` e `shared/admin-analytics.js`
(editado pra rotear a nova seção). Validação funcional via Playwright
(fr+zh), stub de `window.supabase.createClient()` no mesmo padrão das
fases anteriores: gate de não-admin bloqueia com a mensagem padrão;
validação de "pelo menos 1 campo preenchido" rejeita uma tentativa
totalmente vazia sem gravar no banco; criar uma aula pelo formulário sobe
a contagem no banco fake E aparece na lista imediatamente, com a data
pré-preenchida em hoje; editar (abrir form inline, mudar o tópico, salvar)
atualiza o banco E a exibição, fechando o form de edição; cancelar a
edição fecha o form sem gravar; apagar remove do banco E da lista,
voltando ao estado vazio. **Achado durante a validação, só no harness de
teste (não no código do app)**: o mock minimalista usado nesta sessão
tinha um `update()` que não encadeava `.eq()` corretamente (bug só do
script de teste, replicado do template usado em fases anteriores que
nunca tinha exercitado `.update().eq()` numa tabela nova) -- corrigido no
script de validação antes de reportar os resultados acima; **não é um bug
no código de produção**, `shared/teacher-class-logs.js` sempre usou o
mesmo padrão `.update(payload).eq('id', id)` já usado em
`setFlashcardStatus` (Fase 2), que é a forma correta de chamar o
Supabase real. Sem erro de console novo atribuível a este código (mesmo
`pageerror` de `.is()` já registrado em fases anteriores como limitação
do mock, não deste código).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma exportação/impressão do histórico de aulas -- é só uma lista na
  tela, sem PDF/CSV.
- Nenhuma busca/filtro por tópico ou período dentro da lista de aulas de
  uma aluna -- lista simples ordenada por data, mais recente primeiro.
- Nenhuma contagem/resumo de aulas no painel de métricas da Fase 6a --
  são features irmãs mas não integradas uma à outra; a professora não vê
  "N aulas registradas" no card de métricas expandido de uma aluna.
- Fase 8 (outros tipos de conteúdo, conforme o prompt-mestre original)
  continua não iniciada.

Próxima fase (8) só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-22), "Siga para a fase 8" +
grilling de escopo em 2 rodadas (ver Fase 8a abaixo).**

## Fase 8 (outros tipos de conteúdo) -- grillada em 2 rodadas, escopo travado antes de codar

A Fase 8 nunca teve descrição além do nome ("outros tipos de conteúdo") no
prompt-mestre original -- mesma situação já registrada nas Fases 6 e 7
antes do grilling daquela vez. 2 rodadas via `AskUserQuestion`:

1. *O que "outros tipos de conteúdo" deve cobrir concretamente?* -- a
   autora selecionou as **3 opções** oferecidas (multiSelect): novos
   formatos de flashcard, material de apoio não-revisável, exercício
   interativo novo.
2. *Em que ordem, e qual o escopo do primeiro sub-passo?* -- ordem
   confirmada **formatos de flashcard → material de apoio →
   exercício interativo**; pro primeiro sub-passo (Fase 8a), a autora
   selecionou os **3 formatos** oferecidos (multiSelect): imagem, áudio,
   múltipla escolha.

Como "múltipla escolha" muda MECÂNICA de revisão (não só conteúdo
passivo como imagem/áudio), rodei uma 3ª pergunta focada só nisso antes
de codar (ver Fase 8a abaixo) -- disciplina já usada nas fases 6/7: nunca
presumir o design de uma peça que muda comportamento, mesmo com a opção
já selecionada num round anterior.

Fase 8 inteira segue fatiada em sub-fases próprias (8a/8b/8c), cada uma
com seu próprio relatório e autorização antes da próxima -- mesmo
princípio de todo o resto desta feature.

## Fase 8a (novos formatos de flashcard: imagem, áudio, múltipla escolha)

**Escopo confirmado num 3º grilling, focado só na múltipla escolha** (a
única peça das 3 que muda mecânica, não só conteúdo):

1. *Em que modo de revisão o cartão de múltipla escolha aparece?* --
   **sempre múltipla escolha, em qualquer modo** (não só Speed Review) --
   a autora rejeitou a opção mais conservadora (só Speed Review, que já é
   nativamente múltipla escolha) em favor de fazer o cartão virar quiz
   onde quer que ele apareça (Flashcard, Palavras Difíceis, inclusive).
2. *Como mapear acerto/erro pra nota FSRS?* -- **acerto = Bom (grade 2),
   erro = Errei (grade 0)** (recomendado) -- reaproveita a mesma escala
   de graus já usada em toda a revisão, sem inventar um 5º grau.

**Escopo explicitamente restrito a `teacher_flashcards`** -- não
`student_flashcards` (Fase 5). A pergunta original que abriu a Fase 8
falou em "novos formatos de flashcard" no genérico, mas cada fase desta
feature trabalha num ponto de dado por vez; estender os 3 formatos novos
pro cartão que a PRÓPRIA aluna cria é trabalho natural de uma fase futura
(o dado seria praticamente idêntico -- `image_url`/`audio_url`/`choices`
em `student_flashcards` também), mas não decidido nem começado aqui.

**O que foi feito:**

- **Migration `032_add_flashcard_media_and_choices.sql`** -- 3 colunas
  novas em `teacher_flashcards` (`image_url`, `audio_url`, `choices`
  jsonb -- array de 1-3 respostas ERRADAS; a certa continua sendo
  `back_trans`, nunca duplicada) + bucket de Storage novo
  `flashcard-media` (público pra leitura, escrita restrita à pasta do
  próprio `auth.uid()` -- mesmo padrão RLS do bucket `avatars`, Fase
  Perfil 7.1 -- mas com path com componente aleatório, mesmo padrão do
  bucket `report-screenshots`, não path fixo/upsert, porque um cartão
  pode ter sua própria mídia sem sobrescrever a de outro). Aplicada AO
  VIVO nesta sessão via `mcp__Supabase__apply_migration` -- não é passo
  manual pendente pra autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()` estendido com
  `imageUrl`/`audioUrl`/`choices` (todos opcionais e independentes entre
  si -- um cartão pode ter imagem sem ser múltipla escolha, ou múltipla
  escolha sem imagem). Nova `uploadFlashcardMedia(file, kind)` -- sobe
  pro bucket `flashcard-media` e devolve a URL pública já pronta pra
  gravar junto no `createFlashcard()`; não grava nada no banco sozinha.
- **`shared/admin-flashcards.js`** -- form ganhou 2 campos de arquivo
  (`<input type="file">` pra imagem/áudio) + um checkbox "Múltipla
  escolha" que revela 3 campos de texto (1 obrigatório, 2 opcionais) pra
  digitar respostas erradas. Submit faz upload de imagem/áudio ANTES de
  criar o cartão (aborta com erro se um upload falhar, sem criar cartão
  pela metade) e valida que pelo menos 1 opção errada esteja preenchida
  quando o checkbox de múltipla escolha está marcado. Lista de cartões
  ganhou badges curtos (`🖼️ imagem`/`🎧 áudio`/`🔤 múltipla escolha`) só
  quando o formato está presente -- cartão comum não ganha nenhum badge
  novo.
- **`fr/app.js`/`zh/app.js`** (mudanças espelhadas nos dois, com o
  ajuste zh de sempre pro shape hanzi/pinyin):
  - `buildCardFromTeacherFlashcard(row)` ganhou `imageUrl`/`audioUrl`/
    `choices` no card construído.
  - `customAudioBtnHTML()`/`wireCustomAudioButtons()` (novo) -- botão
    🎧 separado do botão de pronúncia automática (TTS) que o app já
    tinha -- áudio próprio da professora é um arquivo real tocado via
    `new Audio(url).play()`, não geração de voz.
  - `buildSpeedOptions(card)` ganhou um branch no topo: se o cartão tem
    `choices`, devolve as opções AUTORADAS pela professora em vez de
    calcular distratores de cartões-irmãos -- Speed Review (que já era
    nativamente múltipla escolha) simplesmente passou a preferir o
    conteúdo autorado quando ele existe, zero mudança na mecânica do
    Speed Review em si.
  - `renderReviewView()` ganhou um branch logo no início: se
    `card.choices` existe, desvia pra `renderMultipleChoiceReviewCard(card)`
    em vez do fluxo de virar cartão -- vale em QUALQUER lugar que passa
    por esta função (Flashcard e Palavras Difíceis, que compartilham a
    mesma tela -- grillado, decisão 1 acima). **Fora do escopo,
    deliberadamente: Combinar** (jogo de pareamento, arquitetura
    incompatível com "1 pergunta, N opções" -- não foi perguntado à
    autora explicitamente se Combinar deveria tentar suportar múltipla
    escolha de alguma forma; ficou de fora por não caber na mecânica do
    jogo, não por decisão consciente dela).
  - `renderMultipleChoiceReviewCard(card)` (novo) -- reaproveita
    `gradeCurrentCard(wasCorrect ? 2 : 0)` pra aplicar a nota FSRS depois
    que a aluna clica "Continuar", herdando de graça toda a plumbing já
    existente (XP, streak, requeue-em-erro, save, avanço de índice) sem
    reimplementar nada disso -- mesma disciplina de "um motor só" já
    usada em toda a feature. As opções (`card.mcOptions`) são embaralhadas
    1x e cacheadas no próprio cartão -- embaralhar de novo a cada
    re-render (ex: depois de clicar) trocaria a posição dos botões debaixo
    do dedo da aluna.
  - Flip-mode do flashcard tradicional ganhou `<img class="flashcard-image">`
    (quando `card.imageUrl` existe) e o botão de áudio próprio (quando
    `card.audioUrl` existe) -- um cartão pode ter imagem/áudio SEM ser
    múltipla escolha, e continua virando normalmente.
- **`fr/index.html`/`zh/index.html`** -- CSS novo pra `.flashcard-image`,
  `.mc-options`/`.mc-option` (+ estados `.correct`/`.incorrect`/
  `.disabled`) e `.mc-continue-btn`; seletor `.audio-btn` estendido pra
  `.audio-btn, .custom-audio-btn` (mesmo estilo visual, dois botões
  physicamente diferentes na tela quando os dois existem).

**Erro de token de cor pego e corrigido durante a própria implementação
(auto-detectado, não reportado pela autora)** -- mesmo tipo de erro já
registrado na seção "Tokens de cor de marca vs. semânticos" no topo
deste arquivo: a primeira versão de `.mc-option.correct`/`.incorrect`
usava `color: var(--on-vivid)` (calibrado especificamente pra texto
sobre as cores SÓLIDAS `--jade`/`--error-red`) só que aplicado sobre um
FUNDO CLARO com tinta rgba dessas mesmas cores (`rgba(58,115,89,0.12)`/
`rgba(214,38,25,0.1)`) -- contraste incorreto no caso geral, mesmo que
não tenha chegado a virar screenshot ilegível de fato porque `--ink` e
`--on-vivid` coincidem em alguns temas. Corrigido pra `color: var(--ink)`
nos dois arquivos, igualando o idioma visual já usado por
`.gram-exercise.ok`/`.wrong` (borda + tinta clara + texto `--ink` simples,
sem token de contraste especial) que já existia nos mesmos arquivos.
Validado nos 4 cenários obrigatórios (ver Testes abaixo) antes de
reportar como pronto.

**Decisões arquiteturais tomadas nesta fase:**
1. `choices` é array de respostas ERRADAS apenas (1-3) -- a resposta
   certa nunca é duplicada, continua sendo `back_trans` (a mesma fonte
   que o cartão tradicional já usa pro verso). Evita os dois campos
   discordarem se um dia só um dos dois for editado.
2. Upload de mídia acontece ANTES do insert do cartão (2 chamadas de
   rede sequenciais quando os dois arquivos estão presentes) -- mantém
   `createFlashcard()` simples (só grava URLs já prontas, nunca lida com
   `File`), e a UI aborta cedo com erro claro se um upload falhar, em vez
   de criar um cartão com mídia quebrada.
3. Botão de áudio próprio (`.custom-audio-btn`, 🎧) é visualmente
   distinto do botão de pronúncia automática (`.audio-btn`, alto-falante)
   quando os dois aparecem juntos -- são fontes de áudio semanticamente
   diferentes (voz real da professora/gravação vs. TTS do navegador), a
   aluna não deveria confundir qual é qual.
4. Nenhuma mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS --
   múltipla escolha é só uma forma de APRESENTAR e RESPONDER o cartão
   (a fila que decide QUAIS cartões aparecem continua idêntica); a
   integração inteira ficou contida em `renderReviewView()` (desvio de
   render) + `renderMultipleChoiceReviewCard()` (chama
   `gradeCurrentCard()` como qualquer outro fluxo).

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a Fase 2 em diante -- conteúdo autorado pela própria professora pras
próprias alunas, sem custo marginal de servir (mídia é hospedada no
Storage do próprio Supabase, sem serviço pago de terceiros envolvido).
Mesma pergunta em aberto já registrada repetidamente pra quando houver
mais de uma professora na plataforma (aqui, especificamente, um limite de
espaço de Storage usado por professora seria a alavanca mais natural, já
que mídia ocupa espaço de forma que texto não ocupa) -- não travada em
código.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão
de stub de `window.supabase.createClient()` das fases anteriores,
estendido com um stub de `storage.from(bucket).upload()`/`getPublicUrl()`
que grava as chamadas de upload num array pra inspeção: (1) fluxo de
CRIAÇÃO no admin -- upload de imagem+áudio confirmado chamando o bucket
certo (`uploadCallsCount:2`, `uploadBuckets:['flashcard-media',
'flashcard-media']`), URLs gravadas no cartão criado
(`plainCardHasImageUrl`/`plainCardHasAudioUrl:true`), badges de formato
aparecendo na lista (`🖼️ imagem · 🎧 áudio`); (2) toggle de múltipla
escolha -- campos escondidos por padrão, revelados ao marcar o checkbox;
submeter com o checkbox marcado e todas as 3 opções vazias é REJEITADO
com mensagem clara, sem gravar no banco (`dbCountAfterEmptyChoicesReject:0`);
preencher 1-2 opções e submeter cria o cartão com `choices` correto; (3)
lado da aluna -- cartão com `choices` confirmado desviando pra
`renderMultipleChoiceReviewCard()` em vez de virar
(`mcOptionsRendered:3`, imagem e botão de áudio próprio renderizados
junto do quiz), clicar a opção certa aplica a classe `.correct` e
desabilita todas as opções, botão "Continuar" aparece só depois de
responder, clicar "Continuar" chama `gradeCurrentCard()` de verdade
(`dueChangedAfterGrading`/`repsIncremented:true`, sessão avança); (4)
cartão de professora SEM `choices` (mas com imagem/áudio) confirmado
continuando a virar normalmente, com imagem e botão de áudio próprio
presentes no flip tradicional; (5) `buildSpeedOptions()` confirmado
preferindo `card.choices` autorados em vez de calcular distratores de
cartões-irmãos quando `choices` existe. Testado nos dois idiomas (fr+zh),
incluindo o shape hanzi/pinyin específico do zh no card de múltipla
escolha. Sem erro de console novo atribuível a este código (os 2
`pageerror` vistos na fase de admin -- `.is()`/`.upsert()` -- são a mesma
limitação de mock já registrada em todas as fases anteriores, não deste
código; a fase de revisão do lado da aluna não teve NENHUM erro de
console).

**Validação visual dos 4 cenários obrigatórios** (regra explícita deste
arquivo pra qualquer cor de fundo customizada nova, ver seção "Tokens de
cor de marca vs. semânticos" no topo): screenshot Playwright de
`.mc-option.correct` (fundo verde-claro/`--jade` tintado + texto `--ink`)
em fr-claro, fr-escuro, zh-claro, zh-escuro -- texto legível nos 4,
nenhum problema de contraste encontrado (foi exatamente essa verificação
que pegou o erro de `--on-vivid` descrito acima, antes de reportar como
pronto).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não ganhou
  nenhum dos 3 formatos novos -- decisão de escopo, não esquecimento (ver
  "Escopo" acima).
- Combinar (jogo de pareamento) não tenta suportar múltipla escolha de
  forma alguma -- arquitetura incompatível, fora do escopo grillado.
- Edição de um cartão já criado com imagem/áudio/múltipla escolha (só
  trocar/remover a mídia, ou editar as opções) não foi implementada --
  mesmo escopo que `teacher_flashcards` já tinha desde as Fases 2/3 (só
  criar e arquivar/reativar, sem editar o conteúdo em si).
- Nenhum limite de tamanho de arquivo de upload aplicado no cliente --
  confia no limite que o próprio bucket do Supabase Storage aplica, sem
  validação adicional de tamanho/dimensão antes do upload.
- Fase 8b (material de apoio não-revisável) e Fase 8c (exercício
  interativo novo) continuam não iniciadas -- ordem já travada no
  grilling acima.

Próxima fase (8b -- material de apoio não-revisável) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização (2026-09-22, mesmo dia): campo "Aluna" virou multi-seleção,
pedido direto da autora logo após a entrega acima.** "Ao criar um
flashcard, quero poder atribuir a mais pessoas ao mesmo tempo. O campo
'Aluna' no menu de criação Flashcards, podia ter um multiselect ao invés
de select individual." -- pequeno adendo de UX à Fase 8a (não uma fase
nova, não mexeu em schema).

`shared/admin-flashcards.js`: o `<select>` único virou uma lista de
checkboxes (`ADMIN_FLASHCARDS_STATE.studentId` → `.studentIds` um `Set`),
com links "Selecionar todas"/"Limpar seleção". Ao submeter, cria **uma
linha em `teacher_flashcards` por aluna marcada** (mesmo front/back/nota/
imagem/áudio/choices), cada uma com o `language_app_key` da PRÓPRIA aluna
-- uma seleção pode misturar francês e mandarim na mesma turma sem
problema (testado explicitamente: 2 alunas fr + 1 aluna zh na mesma
seleção → 3 linhas, cada uma no idioma certo). Upload de imagem/áudio
acontece só 1 vez (mesmo arquivo reaproveitado pras N linhas, não
reenviado por aluna). O campo Pinyin (visível quando QUALQUER aluna
selecionada é de mandarim) só é gravado nas linhas cujo `language_app_key`
é `'mandarim'` -- nunca em linha de francês, pra não sujar dado que o fr
nunca lê.

A lista de cartões abaixo do formulário também passou a agregar as
alunas selecionadas (antes só mostrava a aluna do `<select>` único) --
com `@username` prefixado em cada linha só quando há MAIS de uma aluna
selecionada (evita ruído visual no caso comum de 1 só). Nunca deixa a
seleção ficar vazia (recai pra 1ª aluna se `studentIds` esvaziar) -- sem
isso, "Limpar seleção" deixaria o formulário sem alvo válido pra criar
cartão nenhum.

**Testado (Playwright, fr+zh):** seleção múltipla mista fr+zh confirmada
criando 3 linhas com `language_app_key` corretos cada, pinyin só na linha
zh, prefixo `@username` aparecendo nas 3 linhas da lista quando 3
selecionadas e sumindo quando volta pra 1 só, "Limpar seleção" nunca
zera de verdade (sempre sobra ≥1 marcada), "Selecionar todas" marca as 3.
Sem erro de console novo (mesmos 2 `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a Fase 8a). `node --check` sem
erro. Nenhuma mudança em `shared/teacher-flashcards.js`/migration/schema
-- só orquestração no cliente, reaproveitando `createFlashcard()` como já
era chamado.

## Fase 8b (material de apoio não-revisável) -- terceiro tipo de conteúdo, primeiro visível pra aluna que ela não cria

**Escopo grillado em 1 rodada (4 perguntas) antes de codar** -- mesma
disciplina das Fases 6/7/8 (nome sem descrição no prompt-mestre original):

1. *Que forma o material deve ter?* -- **texto + link + arquivo, todos
   opcionais individualmente** (recomendado) -- a professora usa o que
   fizer sentido pra cada material, sem formato único forçado.
2. *Quem vê, e onde?* -- **aluna vê numa tela nova dedicada** (recomendado)
   -- "📚 Material de apoio" no menu do avatar, mesma visibilidade de
   "📇 Meus Cartões" (Fase 5).
3. *Multi-atribuição desde já?* -- **sim** (recomendado) -- mesmo padrão
   recém-adicionado aos flashcards (ver adendo da Fase 8a acima): a
   professora marca 1+ alunas, o mesmo material vai pra todas de uma vez.
4. *Editar/apagar?* -- **de verdade, desde já** (recomendado) -- mesmo
   raciocínio da Fase 7 (`teacher_class_logs`): sem estado de memória FSRS
   dependente da linha, DELETE físico é seguro.

**"Não-revisável" ≠ "só a professora vê"** -- diferença importante em
relação à Fase 7 ("📝 Aulas", só professora): aqui a aluna TEM uma tela
pra ver o material (grillado, pergunta 2 acima). "Não-revisável" significa
só que o conteúdo NUNCA entra em `STATE.cards`/FSRS/`getStudyQueue()` --
é conteúdo passivo compartilhado, não algo que a aluna precisa memorizar
num ciclo de repetição espaçada. Primeira peça desta feature que é ao
mesmo tempo (a) visível pra aluna e (b) completamente fora do motor de
revisão -- `teacher_flashcards`/`student_flashcards` são (a)+dentro do
motor, `teacher_class_logs` é fora do motor mas não-(a).

**O que foi feito:**

- **Migration `033_create_teacher_support_materials.sql`** -- tabela nova
  `teacher_support_materials` (`teacher_id`, `student_id`,
  `language_app_key` -- mesmo trio de sempre --, `title` obrigatório,
  `description`/`link_url`/`file_url`/`file_name` todos opcionais). RLS:
  professora gerencia tudo que criou (`for all`, mesmo padrão "dono
  único" de `teacher_class_logs`), aluna só LÊ o que foi atribuído a ela
  (`for select`, `auth.uid() = student_id`). Bucket de Storage novo
  `support-materials` (leitura pública, escrita restrita à pasta do
  próprio `auth.uid()`, path aleatório -- mesmo padrão RLS do bucket
  `flashcard-media`, Fase 8a). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente pra
  autora.
- **`shared/teacher-support-materials.js`** (novo) --
  `fetchSupportMaterialsForStudent`/`fetchSupportMaterialsForCurrentStudent`
  (lado professora/lado aluna, mesmo par de sempre), `uploadSupportMaterialFile`
  (bucket `support-materials`, sem restrição de tipo -- PDF/imagem/doc,
  guarda o `fileName` original porque a URL pública é um path opaco),
  `createSupportMaterial` (título obrigatório + pelo menos 1 de
  descrição/link/arquivo, mesmo rigor de `createClassLog`),
  `updateSupportMaterial` (título/descrição/link -- não o arquivo, mesmo
  escopo restrito de edição que `teacher_flashcards` já tinha),
  `deleteSupportMaterial` (DELETE físico, grillado).
- **`shared/admin-support-materials.js`** (novo) + nova subseção "📚
  Material de apoio" no Painel de Admin (fr+zh), ao lado de "📝 Aulas":
  combina o multi-select de checkboxes recém-adicionado aos flashcards
  (adendo da Fase 8a acima) com o padrão de edição inline + apagar da
  Fase 7 (`admin-class-logs.js`) -- primeira tela desta feature a herdar
  os dois padrões ao mesmo tempo. Cria uma linha por aluna selecionada
  (mesmo arquivo/conteúdo, upload feito 1 vez só), lista agregada com
  `@username` prefixado quando >1 selecionada.
- **`shared/support-materials-view.js`** (novo) -- tela SÓ LEITURA pro
  lado da aluna (`renderSupportMaterialsView`), sem nenhum controle de
  edição/exclusão (esses ficam só no Painel de Admin). Card por material:
  título, descrição, link clicável (`target="_blank"`), arquivo como link
  de download (nome original ou "Baixar arquivo" como fallback), data.
- **Nova entrada "📚 Material de apoio" no menu do avatar** (fr+zh,
  `#support-materials-btn`), entre "📇 Meus cartões" e "⚙️
  Configurações" -- SEM `admin-only-nav`, mesma visibilidade de "Meus
  Cartões" (qualquer conta). Nova `<div class="view"
  id="view-support-materials">`, aba registrada em `tabHandlers` como
  `'support-materials': renderSupportMaterialsView`.

**Decisões arquiteturais tomadas nesta fase:**
1. `teacher_support_materials` é **completamente desconectada** de
   `STATE.cards`/FSRS -- nenhum builder de card, nenhum merge no boot,
   nenhuma origem nova (`study`/`teacher`/`self` continuam sendo as
   únicas 3) -- mesmo princípio da Fase 7, mas com uma tela nova pro
   lado da aluna (diferença chave já registrada acima).
2. Entrada de menu "📚 Material de apoio" fica **sempre visível**, mesmo
   pra quem nunca vai ter nada lá (maioria das contas sem professora
   vinculada) -- mesmo raciocínio já usado em "📇 Meus Cartões" (Fase 5),
   não o raciocínio de "esconder quando irrelevante" já usado no filtro
   de origem da Fase 4. Decisão deliberada: gastar uma chamada de rede
   extra no BOOT do app só pra decidir se esconde um item de menu não
   valeria a pena pelo ganho de UX -- o estado vazio já é claro o
   suficiente ("sua professora ainda não enviou nada").
3. Edição de material cobre título/descrição/link, não o arquivo anexado
   -- trocar/remover mídia de um material já criado não foi pedido no
   grilling; mesmo escopo restrito que `teacher_flashcards` já tinha
   desde as Fases 2/3 (criar não-vazio + editar campos de texto, nunca
   trocar mídia já enviada).
4. Upload de arquivo não distingue tipo (imagem/áudio/PDF/doc) -- ao
   contrário de `uploadFlashcardMedia` (Fase 8a, que separa `image`/
   `audio` só pra nomear o path), aqui é sempre "um arquivo anexo
   genérico", sem necessidade de diferenciação.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a feature desde a Fase 2 -- conteúdo autorado pela própria
professora pras próprias alunas, sem custo marginal de servir (Storage
do próprio Supabase). Mesma pergunta em aberto já registrada
repetidamente pra quando houver mais de uma professora na plataforma
(aqui, de novo, um limite de espaço de Storage por professora seria a
alavanca mais natural) -- não travada em código.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-support-materials.js`, `shared/admin-support-materials.js`,
`shared/support-materials-view.js`, `shared/admin-analytics.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh pro lado admin,
fr pro lado aluna -- ver nota de cobertura abaixo), mesmo padrão de stub
de `window.supabase.createClient()` já usado em toda a feature: (1)
multi-seleção de 2 alunas confirmada criando 2 linhas
(`createdStudentIds` batendo com as 2 alunas selecionadas), submeter só
com título (sem descrição/link/arquivo) é REJEITADO sem gravar no banco
(`dbCountAfterEmptyReject:0`), lista mostra `@username` prefixado nas 2
linhas quando 2 selecionadas e some quando volta pra 1 só; (2) edição
inline confirmada atualizando o título no banco de verdade
(`editedTitleInDb` reflete o valor editado); (3) apagar confirmado
removendo do banco (`stillInDbAfterDelete:false`); (4) lado da aluna --
`fetchSupportMaterialsForCurrentStudent` confirmado retornando os 2
materiais semeados, título/link/arquivo renderizados corretamente na
tela (`linkRendered`/`fileLinkRendered:true`), nenhum botão de
editar/apagar presente (`noEditOrDeleteButtons:true`, confirma que é
mesmo só-leitura), estado vazio mostrando a mensagem certa quando a
aluna não tem nenhum material. Sem erro de console novo atribuível a
este código (mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature; o lado da aluna não teve NENHUM erro de
console). **Achado de harness, não de produção**: o mock desta sessão
tinha o mesmo bug já documentado na Fase 7 (`.update().eq()` exigindo 2
chamadas encadeadas em vez de 1) -- corrigido no script de validação
antes de reportar os resultados acima; `updateSupportMaterial` sempre
usou o padrão `.update(payload).eq('id', id)` correto, mesmo já usado em
`setFlashcardStatus`/`updateClassLog`.

**Nota de cobertura**: validação do lado da aluna rodou só em fr (não
zh) -- `shared/support-materials-view.js` é 100% compartilhado entre os
dois idiomas, sem nenhum branch por idioma, então o risco de regressão
zh-específica é baixo, mas registrando aqui por completude, mesmo padrão
de honestidade já usado quando a Fase 6a validou só fr.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum limite de tamanho/tipo de arquivo aplicado no cliente -- confia
  no limite que o bucket do Supabase Storage aplica, mesmo critério já
  registrado na Fase 8a.
- Nenhuma contagem/resumo de materiais no painel de métricas da Fase 6a
  -- são features irmãs mas não integradas, mesmo padrão já registrado
  quando a Fase 7 (Aulas) fez a mesma observação.
- Fase 8c (exercício interativo novo) continua não iniciada -- último
  sub-passo da Fase 8, ordem já travada no grilling da Fase 8 original.

Próxima fase (8c -- exercício interativo novo) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-22, mesmo dia), "Siga para
a fase 8c" + grilling de 4 perguntas antes de codar (ver Fase 8c abaixo);
seguida no mesmo dia por um pedido de reorganização visual da própria
tela de Flashcards (crítica detalhada com print real, ver "UX-fix:
formulário de flashcard" logo depois da Fase 8c).**

**Atualização: autorizada e entregue (2026-09-22, mesmo dia), "Siga para
a fase 8c" + grilling de 4 perguntas antes de codar (ver Fase 8c
abaixo).**

## Fase 8c (exercício interativo novo: "completar a frase") -- último sub-passo da Fase 8

**Escopo grillado em 1 rodada (4 perguntas) antes de codar**, mesma
disciplina de toda a Fase 8:

1. *Que tipo de exercício?* -- **Completar a frase (recomendado)** --
   professora escreve uma frase com uma lacuna (`___`), a aluna digita a
   palavra que falta.
2. *Arquitetura de dado?* -- **Estender `teacher_flashcards`
   (recomendado)** -- colunas novas opcionais, nunca uma tabela nova,
   mesmo padrão aditivo de imagem/áudio/múltipla escolha (Fase 8a).
3. *Integração com revisão/FSRS?* -- **Mesma fila/FSRS (recomendado)** --
   acerto=Bom(2), erro=Errei(0), mesma convenção da múltipla escolha
   (Fase 8a), reaproveitando `gradeCurrentCard()`.
4. *Multi-atribuição?* -- **Sim (recomendado)** -- mesmo padrão de
   checkboxes multi-select já usado em flashcards (adendo da Fase 8a) e
   material de apoio (Fase 8b).

**Quarto formato de `teacher_flashcards`, mutuamente exclusivo com
`choices` (múltipla escolha)** -- os dois mudam a MECÂNICA de revisão do
cartão (como o aluno responde), então não fazem sentido coexistindo no
mesmo cartão; imagem/áudio continuam livres pra combinar com qualquer um
dos dois (ou nenhum), por não mudarem mecânica nenhuma.

**O que foi feito:**

- **Migration `034_add_cloze_to_teacher_flashcards.sql`** -- 3 colunas
  novas em `teacher_flashcards`: `cloze_sentence` (a frase com a lacuna
  marcada literalmente como `___`, 3 underscores), `cloze_answer` (a
  resposta certa -- aceita "/" pra mais de uma forma, mesma convenção de
  `acceptedForms()` já usada pelos exercícios digitados da trilha),
  `cloze_answer_pinyin` (só relevante pro zh -- o que a aluna
  efetivamente DIGITA; teclado latino não digita hanzi, mesmo motivo
  pelo qual o cloze da trilha em zh já pede pinyin, não hanzi -- fica
  sempre `null` no fr). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente pra
  autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()` estendido com
  `clozeSentence`/`clozeAnswer`/`clozeAnswerPinyin` (todos opcionais,
  vazio = cartão sem esse formato). Validação: se `clozeSentence` foi
  preenchida, precisa conter EXATAMENTE um `___` (senão não há onde a
  aluna digitar, ou é ambíguo qual lacuna é a certa), `clozeAnswer` não
  pode ficar vazia, e -- só quando `languageAppKey==='mandarim'` --
  `clozeAnswerPinyin` também é obrigatório (sem ele o cartão não teria
  como ser comparado contra o que a aluna digita).
- **`shared/admin-flashcards.js`** -- checkbox "Completar a frase" no
  formulário, ao lado do de múltipla escolha (Fase 8a), revelando 2-3
  campos (frase com `___`, resposta certa, +pinyin só quando alguma aluna
  selecionada é de mandarim). **Mutuamente exclusivo na própria UI, não
  só na validação do submit** -- marcar "Múltipla escolha" desmarca e
  esconde "Completar a frase" automaticamente, e vice-versa (mesmo
  raciocínio de UX já usado em outras exclusividades do app: melhor
  impedir o estado ambíguo de existir do que só rejeitar no fim). Badge
  novo na lista de cartões (`📝 completar frase`) ao lado dos já
  existentes de imagem/áudio/múltipla escolha. Submit handler estendido
  pra ler os 3 campos e passá-los em cada chamada de `createFlashcard()`
  do loop multi-aluna (mesmo padrão de `frontPinyin`: `clozeAnswerPinyin`
  só vai junto nas linhas cujo idioma é mandarim).
- **`fr/app.js`/`zh/app.js`**:
  - `buildCardFromTeacherFlashcard(row)` ganhou `clozeSentence`/
    `clozeAnswer` (+ `clozeAnswerPinyin` só no zh) no card construído.
  - `startReviewSession()` ganhou `STATE.reviewClozeAnswered = null;`,
    mesmo espírito do reset de `STATE.reviewMCPicked`/`reviewMCCorrect`
    já existente (zera estado transitório de uma pergunta que possa ter
    ficado "respondida, aguardando Continuar" de uma sessão anterior
    interrompida no meio).
  - `renderReviewView()` ganhou um novo desvio, logo depois do de
    `card.choices` (múltipla escolha): se `card.clozeSentence &&
    card.clozeAnswer`, chama `renderClozeReviewCard(card)` em vez do
    flip tradicional -- nunca coexistem (garantido na criação).
  - **`renderClozeReviewCard(card)`** (nova função, fr+zh) -- reaproveita
    100% do idioma visual já existente do cloze da trilha
    (`.cloze-sentence`/`.cloze-blank`/`.cloze-type-wrap`,
    `frAccentPickerHTML()`/`pinyinTonePickerHTML()`) dentro do wrapper
    `.flashcard` já usado por todo cartão de revisão (mesma tag "Da sua
    professora", imagem/áudio próprio quando presentes, igual à Fase
    8a). Estado não respondido: input de texto + teclinha de
    acento/tom + botão "Verificar". Ao verificar, compara o texto
    digitado (normalizado -- `normalizeLoose()` no fr,
    `normalizePinyinAnswer()` no zh -- e sem pontuação, mesma função
    `strip()` já usada pelo cloze da trilha) contra
    `acceptedForms(card.clozeAnswer)` no fr ou
    `acceptedForms(card.clozeAnswerPinyin)` no zh (a aluna SEMPRE digita
    pinyin no zh, nunca hanzi -- mesmo motivo do cloze da trilha).
    Estado respondido: revela a resposta certa dentro do próprio espaço
    da lacuna (`.cloze-blank.correct`/`.incorrect`, reaproveitando as
    MESMAS classes CSS -- já calibradas -- do cloze da trilha, zero CSS
    novo), mostra a tradução, e troca pro botão "Continuar"
    (`.mc-continue-btn`, reaproveitado da Fase 8a) que chama
    `gradeCurrentCard(wasCorrect ? 2 : 0)` -- herda de graça toda a
    plumbing já existente (XP, streak, requeue-em-erro, save, avanço de
    índice), mesma disciplina de "um motor só" de toda a feature.
  - `buildSpeedOptions()` **não precisou de nenhuma mudança** -- um
    cartão só-cloze (sem `choices`) continua caindo no mesmo fallback de
    distratores computados que já existia antes da Fase 8a pra cartão
    de professora sem múltipla escolha própria; o desvio pra
    "completar a frase" só existe dentro de `renderReviewView()`
    (Flashcard/Palavras Difíceis), nunca no Speed Review -- mesmo escopo
    que a múltipla escolha já teve (grillado na Fase 8a, não reaberto
    aqui).
- **Zero CSS novo** -- `.cloze-sentence`/`.cloze-hanzi`/`.cloze-pinyin`/
  `.cloze-blank`/`.cloze-type-wrap`/`.pinyin-tone-picker` já existiam nos
  dois `index.html` (do cloze da trilha) e o botão "Continuar" reaproveita
  `.mc-continue-btn` (Fase 8a) -- confirmado por leitura antes de
  escrever qualquer linha de CSS (regra deste arquivo sobre reaproveitar
  tokens/classes existentes em vez de duplicar).

**Decisões arquiteturais tomadas nesta fase:**
1. `cloze_sentence`/`cloze_answer` são a fonte de verdade do formato --
   `front`/`back_trans` continuam obrigatórios e sempre presentes (regra
   de schema desde a Fase 2), então um cartão cloze também tem um
   front/back "normal" por baixo, só que a tela de revisão nunca mostra
   esse par quando o cloze está presente (mesmo princípio já usado pela
   múltipla escolha, que também não descarta `back_trans` -- ele vira a
   opção certa dentro de `card.mcOptions`).
2. Mutuamente exclusivo com `choices` decidido e IMPOSTO NA UI (toggle
   exclusivo), não só documentado como convenção -- mesma escolha de
   design já tomada pela Fase 8a entre si e agora estendida ao par
   MC/cloze, evitando um estado ambíguo (as duas mudam a mesma coisa:
   como a aluna responde) chegar a existir no banco.
3. zh compara contra pinyin (`clozeAnswerPinyin`), nunca hanzi
   (`clozeAnswer`) -- decisão derivada diretamente de como o cloze da
   trilha já funciona (`normalizePinyinAnswer`/teclado latino), não uma
   escolha nova; `clozeAnswer` (hanzi) só é usado pra REVELAR a resposta
   depois de julgada, nunca pra comparação.
4. Nenhuma mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS --
   mesma conclusão já validada pela múltipla escolha na Fase 8a: um
   formato novo de APRESENTAÇÃO/RESPOSTA não precisa tocar a fila que
   decide QUAIS cartões aparecem, só o ponto de RENDER
   (`renderReviewView()`) e o motor de nota permanece
   `gradeCurrentCard()` de sempre.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a Fase 2 em diante -- conteúdo autorado pela própria professora pras
próprias alunas, sem custo marginal de servir. Mesma pergunta em aberto
já registrada repetidamente pra quando houver mais de uma professora na
plataforma -- nada específico a este formato (texto puro, sem mídia) que
mudasse essa conclusão.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão
de stub de `window.supabase.createClient()` de toda a feature: (1) toggle
"Completar a frase" revela os campos certos e é mutuamente exclusivo com
"Múltipla escolha" nos dois sentidos (marcar um desmarca e esconde o
outro); (2) validação rejeita frase sem `___`, frase com `___` mas sem
resposta, e (zh) resposta sem pinyin -- nenhum dos 3 grava no banco
(`dbCountAfter*Reject:0` em todos os casos); (3) submit válido cria o
cartão com `cloze_sentence`/`cloze_answer`/`cloze_answer_pinyin`
corretos e sem `choices`, badge "📝 completar frase" aparece na lista;
(4) lado da aluna -- cartão com `clozeSentence`+`clozeAnswer` confirmado
desviando pra `renderClozeReviewCard()` (nunca vira card normal, nunca
mostra `.mc-option`), sentença renderiza com a lacuna como `___`; digitar
uma resposta ERRADA aplica `.cloze-blank.incorrect`, revela a resposta
certa no próprio espaço da lacuna, `gradeCurrentCard(0)` confirmado
disparando de verdade (`due`/`reps` do cartão mudam); digitar a resposta
CERTA (fr: a palavra; zh: o pinyin) aplica `.cloze-blank.correct`,
`gradeCurrentCard(2)` confirmado (`due`/`reps` mudam); `buildSpeedOptions()`
confirmado continuando a funcionar normalmente pra um cartão só-cloze
(sem `choices`), sem erro. Testado nos dois idiomas (fr+zh). Sem erro de
console novo atribuível a este código (mesmos 2 `pageerror` de mock --
`.is()`/`.upsert()` -- já registrados em toda a feature).

**Validação visual das 4 combinações obrigatórias** (regra deste arquivo
pra qualquer elemento com cor de fundo customizada, ver seção "Tokens de
cor de marca vs. semânticos" -- aplicada aqui mesmo sem CSS novo, por
prudência, já que o contexto visual -- dentro do wrapper `.flashcard` --
era novo mesmo reaproveitando classes antigas): screenshot Playwright de
fr-claro, fr-escuro, zh-claro, zh-escuro, nos 3 estados (não respondido /
resposta errada / resposta certa) -- texto legível em todos, nenhum
problema de contraste encontrado; `.cloze-blank.correct`/`.incorrect`
herdam as MESMAS cores já calibradas pelo cloze da trilha (nunca
recalculadas aqui), então o risco que motivou aquela seção do arquivo
(sobrescrever só `background` sem revisar `color` junto) não se aplica --
nenhum dos dois foi tocado nesta fase.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não ganhou o
  formato cloze -- mesma decisão de escopo já tomada na Fase 8a pros
  outros 3 formatos (imagem/áudio/múltipla escolha): estender pro cartão
  auto-criado é trabalho natural de uma fase futura, não decidido nem
  começado aqui.
- Combinar (jogo de pareamento) não tenta suportar cloze de forma
  alguma -- mesma exclusão já registrada na Fase 8a pra múltipla escolha,
  mesmo motivo (arquitetura incompatível com "1 pergunta, 1 resposta
  digitada" dentro de um jogo de pares).
- Edição de um cartão já criado com cloze (só trocar a frase/resposta)
  não foi implementada -- mesmo escopo restrito que todo o resto de
  `teacher_flashcards` já tem desde as Fases 2/3 (só criar e
  arquivar/reativar).
- **Esta era a última sub-fase nomeada no grilling original da Fase 8**
  (8a formatos de flashcard → 8b material de apoio → 8c exercício
  interativo, ordem travada e cumprida). Com 8c entregue, a Fase 8 do
  prompt-mestre original ("outros tipos de conteúdo") está com todo o
  escopo grillado até aqui completo -- qualquer trabalho além disso
  (estender cloze/MC/mídia pra `student_flashcards`, editar conteúdo já
  criado, integrar `gramatica-coloquial` das notas de realidade à
  correção de exercícios digitados, Fase 6b/7 já entregues mas com itens
  em aberto próprios) é fora do prompt-mestre original desta feature e
  precisa de autorização/escopo explícitos numa sessão futura, não
  presumido como próximo passo automático.

## UX-fix: formulário de "Novo flashcard" -- bug de seleção nunca-vazia + hierarquia visual

Mesmo dia da entrega da Fase 8c, a autora revisou a tela real (print
anexado) e mandou uma crítica de UX detalhada, ponto a ponto (17 itens).
Não é uma fase nova do prompt-mestre da feature "alunas particulares" --
é uma correção pontual de UX na tela de admin que a Fase 8a/8c já tinham
construído, motivada por um problema real que ela identificou, não só
preferência estética.

**O achado principal, tratado como bug real, não só gosto**: desde a
Fase 8a, a seleção de alunas (checkboxes multi-seleção) nunca podia ficar
genuinamente vazia -- o código caía de volta pra "a primeira aluna já
vem marcada" toda vez que o `Set` esvaziava, inclusive imediatamente
depois de clicar "Limpar seleção". A autora identificou exatamente o
risco: um erro do tipo "selecionar outra pessoa e esquecer que a
primeira continuou marcada" é especialmente perigoso numa ferramenta
administrativa (criar um cartão pra aluna errada por engano). Como ela
descreveu: "o estado inicial deve representar zero destinatários
selecionados" -- e "Limpar seleção" deve sempre resultar em exatamente
zero, nunca reverter pra ninguém.

**Decisões tomadas, sem nova rodada de grilling** (a crítica da autora já
veio com 17 pontos concretos e justificados; distingui os que eram bug
real/pedido direto dos que eram sugestão especulativa antes de
implementar, sem devolver pergunta pra ela sobre cada um):

1. **Corrigido nos 2 lugares onde o mesmo padrão existia**
   (`shared/admin-flashcards.js` e `shared/admin-support-materials.js`,
   ambos documentados desde a Fase 8b/8a addendum como "mesmo padrão
   copiado de propósito"): removida a linha que recaía pra "primeira
   aluna" quando o Set esvaziava. Seleção vazia agora é um estado válido
   e persistente. Botão "Criar cartão"/"Enviar material" fica
   `disabled` nesse estado (com contador visível acima do form: "Nenhuma
   aluna selecionada" / "N aluna(s) selecionada(s)"), e a validação de
   submit já existente continua como cinto-de-segurança extra caso o
   `disabled` seja contornado de algum jeito.
2. **Hierarquia visual em `admin-flashcards.js`** (única tela que a
   autora efetivamente screenshotou e criticou em detalhe -- a de
   Material de apoio só recebeu o fix de bug acima, não o redesenho
   completo, por não ter sido a tela mostrada): reorganizado em 3 blocos
   rotulados -- "Destinatários" (fora do `<form>`, como já era) →
   "Conteúdo" (com um sub-rótulo "Recursos opcionais" agrupando nota/
   imagem/áudio) → "Modo de prática" (dentro do mesmo `<form>`, agora
   como um **radio group nativo** `name="admin-flashcard-mode"` com 3
   opções -- Flashcard normal / Múltipla escolha / Completar a frase --
   em vez dos 2 checkboxes independentes da Fase 8c que precisavam de JS
   forçando a exclusividade um no outro. A exclusividade MC/cloze
   (decidida na Fase 8c) agora é o próprio HTML, não uma regra imposta
   por cima. Reaproveita `.section-label` (já existente no CSS, usado
   como cabeçalho de `.profile-section`) como cabeçalho de cada
   sub-bloco dentro do mesmo painel -- **zero CSS novo**.

**Pontos da crítica da autora explicitamente NÃO implementados, com
justificativa registrada aqui pra não parecer esquecimento:**
- **Renomear "Alunas" → "Alunos"**: ela sugeriu isso pra neutralidade de
  gênero futura. Não implementado -- "aluna"/"alunas" é usado
  consistentemente em dezenas de arquivos desta feature desde a Fase 1
  (reflete o roster real e 100% feminino da autora hoje, confirmado ao
  vivo: "1 admin, 21 alunas"). É uma mudança de terminologia grande e
  transversal ao produto inteiro, não uma correção de UX pontual --
  fica pra decisão explícita futura, não presumida numa sessão que
  estava corrigindo outra coisa.
- **Bloquear seleção de alunas com idiomas diferentes na mesma
  criação**: a crítica presumia que isso já era um bug ("isso não pode
  ser atribuído aos dois"). Investigado e confirmado que NÃO é um bug --
  desde o adendo da Fase 8a, o código já cria uma linha por aluna no
  idioma DELA (`language_app_key` de cada uma, nunca misturado), testado
  explicitamente com seleção mista fr+zh na época. Bloquear seria
  remover uma feature que já foi pedida e testada, não corrigir algo
  quebrado -- por isso não implementado. O título "Novo flashcard --
  Português (em breve)" do print da autora só mostra o idioma quando
  EXATAMENTE 1 aluna está selecionada (comportamento correto); com 2+,
  já mostrava "N alunas selecionadas" sem citar idioma nenhum.
- **Busca/paginação na lista de alunas**: prematuro com ~22 alunas reais
  hoje (a lista já tem scroll interno de 180px). Fica pra quando o
  volume justificar.
- **Largura/alinhamento do botão "Criar cartão"**: ela sugeriu
  encurtar/alinhar à direita. Não alterado -- `btn btn-primary
  btn-block` (largura total) é a convenção usada em TODO submit
  primário desta feature inteira (Fases 2 a 8b, dezenas de forms);
  mudar só este botão quebraria a consistência visual do Painel de
  Admin como um todo, não seria uma melhoria isolada.
- **Copy do rótulo de "Áudio próprio"**: ela sugeriu encurtar. Mantido o
  texto original ("Áudio próprio (além da pronúncia automática)") --
  confirmado no código que o áudio próprio TOCA JUNTO com a pronúncia
  automática (TTS), não a substitui, então o texto já descreve o
  comportamento real; risco de simplificar demais e a frase parar de
  ser precisa.

**Testes realizados:** `node --check` sem erro nos 2 arquivos tocados.
Validação funcional via Playwright (fr), cobrindo especificamente o bug
relatado: estado inicial com 0 alunas marcadas, contador "Nenhuma aluna
selecionada", botão desabilitado; selecionar 1 aluna atualiza o
contador e habilita o botão; "Selecionar todas" marca todas; "Limpar
seleção" zera de verdade (`checkedCountAfterClear:0`); selecionar uma
aluna DIFERENTE logo depois de limpar resulta SÓ nela marcada
(`pickedIsSecondOnly:true` -- o cenário exato que a autora descreveu como
perigoso, confirmado corrigido); radio group testado nos 3 sentidos
(flip→mc→cloze→flip, campos certos aparecendo/escondendo, exclusividade
nativa sem JS extra); fluxo de criação completo ainda funciona
(`cardCreated:true`, atribuído à aluna certa). Mesmo fix replicado e
testado em "📚 Material de apoio". Sem erro de console novo atribuível a
este código (mesmos 2 `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature). Validação visual (screenshot Playwright,
fr claro + escuro, estado vazio e estado com seleção mista fr+zh em modo
múltipla escolha) confirma a hierarquia nova legível nos dois temas --
esperado, já que reaproveita só classes CSS já calibradas, nenhuma cor
nova introduzida.

**Escopo**: só `shared/admin-flashcards.js` (redesenho completo) e
`shared/admin-support-materials.js` (só o fix de bug, sem redesenho --
não foi a tela criticada). `shared/admin-class-logs.js` ("📝 Aulas") não
tem o mesmo padrão -- usa um `<select>` de aluna única, que sempre tem um
valor por natureza do próprio elemento HTML, não o mesmo bug.

## UX-fix 3: "aluna"→"aluno" em todo texto visível + busca por @usuário na seleção de destinatários

Mesmo dia da UX-fix 2 acima, 3 instruções diretas e curtas da autora, sem
grilling (eram claras o bastante pra não precisar de rodada de perguntas):
"Siga para a próxima aba que você quiser ajustar.", "Mude aluna para
alunos.", "Busca é mais interessante do que paginação." -- a 3ª reabre e
inverte explicitamente minha própria decisão anterior (UX-fix 2 registrada
acima) de adiar busca/paginação como "prematuro".

**Escopo do rename "aluna"→"aluno", decisão minha não detalhada pela
autora, registrada aqui pra ficar auditável**: só texto VISÍVEL (labels,
hints, placeholders, botões, toasts, mensagens de erro, `title`/tooltip,
texto de modal) -- comentários de código e todo o histórico já escrito
neste CLAUDE.md (inclusive as seções acima, que usam "aluna"/"alunas"
consistentemente desde a Fase 1) foram deixados como estão. Motivo: são
registro histórico de como a decisão foi tomada, não UI que a professora
ou a aluno vê -- reescrever retroativamente o histórico deste arquivo
apagaria o contexto real de quando/por que cada escolha foi feita. Seções
NOVAS daqui pra frente (como esta) já nascem usando "aluno"/"alunos" como
termo corrente.

Arquivos com texto visível corrigido: `shared/admin-flashcards.js`,
`shared/admin-support-materials.js`, `shared/admin-class-logs.js`,
`shared/admin-students.js`, `shared/admin-analytics.js` (pill de Admin
Mode: descrição + toast), `shared/my-flashcards.js` (pill "Aluno
vinculado"), `shared/teacher-flashcards.js` (erro de validação de
pinyin), `shared/auth.js` (toast de Admin Mode), `fr/index.html`+
`zh/index.html` (`title` do botão de Admin Mode + texto do modal de
limite de cartões, Fase 5.1). Cada troca revisada pra concordância de
gênero nas palavras vizinhas (`vinculada`→`vinculado`,
`nenhuma`→`nenhum`, `esta`→`este`, `ela`→`ele`, `selecionada(s)`→
`selecionado(s)`, etc.) -- nunca find-replace cego. Conferido por grep
completo no fim: todas as ocorrências restantes de "aluna" no
repositório são comentário de código, HTML `<!-- -->`/CSS `/* */`, ou
texto histórico deste arquivo -- nenhuma some de tela nenhuma.

**Achado incidental, corrigido de graça pelo rename**: o texto de estado
vazio de `admin-flashcards.js` tinha um bug de português pré-existente
(`` `Nenhum cartão ainda pra${n>1 ? 's essas alunas' : ...}` ``, que
concatenava pra "pras essas alunas" -- duplo artigo errado, "para as
essas alunas"). A troca pro texto novo (`' esses alunos'`) já corrige
isso de passagem, não foi um fix buscado deliberadamente.

**"Próxima aba" escolhida por mim (escopo aberto na instrução da
autora, sem ela nomear qual)**: "📚 Material de apoio" -- estruturalmente
quase idêntica a "📇 Flashcards" (mesmo padrão de checkboxes
multi-seleção + formulário único), por isso foi a candidata natural pra
herdar a mesma melhoria de hierarquia/busca sem trabalho de design novo.
"📝 Aulas" ficou de fora de propósito -- usa um `<select>` de aluno único,
que por natureza do próprio elemento HTML nunca fica "vazio sem querer"
e não tem lista pra buscar, então não se beneficia do mesmo fix.
Registrando aqui explicitamente porque foi decisão minha sobre uma
instrução aberta ("a próxima aba que você quiser") -- se a intenção era
outra aba, é só redirecionar.

**Busca por @usuário, adicionada em `admin-flashcards.js` E
`admin-support-materials.js`** (as duas telas com lista de checkboxes de
alunos): `<input type="text">` (reaproveita `.profile-edit-input`, zero
CSS novo) que filtra as linhas via `style.display` direto no DOM
(`row.style.display = !q || username.includes(q) ? '' : 'none'`), SEM
re-renderizar a view inteira -- decisão técnica deliberada: as funções de
render são `async` e mostram um estado de loading antes de resolver a
busca de rede, então re-renderizar a cada tecla digitada perderia o foco
do campo de busca (o cursor "sumiria" do input a cada letra). Filtro
puro client-side sobre a lista já carregada, sem chamada de rede nova.

**Testes realizados**: `node --check` sem erro em todos os arquivos
tocados. Playwright (fr): confirmado texto "Selecione os alunos..." (não
"alunas"), contador "Nenhum aluno selecionado"/"N alunos selecionados"
(singular/plural corretos), "Selecionar todos"/"Vincular aluno"/"Seus
alunos (N)" nas 3 abas (Flashcards/Alunos/Material de apoio); busca
digitando "joa" filtra pra só a linha de @joao (`visibleAfterSearch`),
foco do input preservado durante a filtragem (`focusRetained:true`),
limpar a busca restaura todas as linhas; mesmo padrão replicado e
validado em "📚 Material de apoio" (busca por "marc" filtra pra só
@marconi). Screenshot (fr, tema claro) confirma visualmente a seção
"DESTINATÁRIOS" com busca funcionando (digitado "li", só `@li_wei --
Chinês` visível) sem defeito de layout. Sem erro de console novo
atribuível a este código (mesmos `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a feature). **Não foi tirado
screenshot de tema escuro nesta rodada** -- risco considerado baixo
porque nenhuma cor/CSS nova foi introduzida (só texto e um `<input>`
reaproveitando classe já calibrada nos dois temas), mas registrando aqui
por completude/honestidade, mesmo padrão já usado quando outras entregas
desta feature validaram só um cenário.

**O que ainda falta / não foi feito nesta rodada (de propósito)**:
- Nenhuma migração de schema -- mudança 100% client-side (texto + filtro
  DOM).
- "📝 Aulas" não ganhou busca (ver justificativa acima -- `<select>` não
  se beneficia do mesmo padrão).
- Nenhum passo manual pendente pra autora nesta entrega.

## UX-fix 4: "Aulas" ganha o mesmo multi-select das outras 2 telas + rótulo "Alunos" unificado nas 3

A autora testou a entrega da UX-fix 3 acima e voltou com 2 pontos: (1)
"Aulas" deveria ter o mesmo multi-select de Flashcards/Material de apoio
-- a justificativa da UX-fix 3 ("`<select>` não se beneficia do mesmo
padrão") tratava só a ausência de busca, não considerou que a autora
queria a MESMA MECÂNICA de seleção (múltiplos alunos de uma vez) nas 3
telas, não só em 2; (2) unificar "Alunos"/"Destinatários" como "Alunos"
nas 3 telas -- eram 2 rótulos diferentes pro mesmo bloco (Flashcards/
Material de apoio diziam "Destinatários", Aulas dizia "Aluno"); (3) ela
relatou não estar vendo a caixa de busca em Flashcards/Material de apoio.

**Investigação do ponto 3 antes de mudar qualquer coisa**: reli
`shared/admin-flashcards.js` e `shared/admin-support-materials.js` -- a
caixa de busca (`#admin-flashcard-search`/`#admin-material-search`) já
estava no código desde a UX-fix 3, corretamente wireada. Validado ao vivo
via Playwright (`offsetParent !== null`, ou seja renderizada e visível no
DOM, não `display:none`) nos dois arquivos -- a busca funciona no código
atual. A explicação mais provável é a autora ter testado antes do cache
do navegador/service worker pegar o deploy mais recente (o app já tem um
fix de auto-reload em atualização de service worker, mas pode haver uma
janela entre o merge e o primeiro carregamento novo) -- não um bug
reintroduzido. Se ela continuar sem ver a busca depois de um F5/recarregar
forçado, é uma regressão real e vale investigar de novo com mais detalhe
(print da tela, inspecionar o DOM ao vivo).

**O que foi feito pros pontos 1 e 2:**

- **`shared/admin-class-logs.js` reescrito** pro mesmo padrão de
  `ADMIN_FLASHCARDS_STATE`/`ADMIN_MATERIALS_STATE`: `ADMIN_CLASS_LOGS_
  STATE.studentId` (único) virou `.studentIds` (`Set`), com checkboxes +
  busca por `@usuário` + "Selecionar todos"/"Limpar seleção" + contador
  ("Nenhum aluno selecionado"/"N aluno(s) selecionado(s)"), idêntico ao
  bloco já usado nas outras 2 telas. Registrar uma aula com vários alunos
  marcados cria **uma linha em `teacher_class_logs` por aluno selecionado**
  (mesmo conteúdo pra todos) -- mesmo padrão já usado em
  `teacher_flashcards`/`teacher_support_materials`, e faz sentido aqui
  também: uma aula em grupo tem o mesmo tópico/lição de casa pra todo
  mundo. A lista "Aulas registradas" agora agrega os logs de TODOS os
  alunos selecionados (antes só o do `<select>` único), com `@username`
  prefixado quando há mais de um selecionado -- mesmo critério visual já
  usado nas outras 2 telas.
- **Rótulo unificado como "Alunos"** (era "Destinatários" em Flashcards/
  Material de apoio, "Aluno" em Aulas) -- as 3 seções agora dizem só
  "Alunos", texto de hint específico por tela continua diferente ("...que
  vão receber este cartão"/"...este material"/"...desta aula").
- **`shared/teacher-class-logs.js` não precisou de NENHUMA mudança** --
  `createClassLog({studentId, ...})` já aceitava um `studentId` por
  chamada; a tela de admin só passou a chamá-la em `Promise.all()` uma
  vez por aluno selecionado, mesmo padrão já usado em `createFlashcard`/
  `createSupportMaterial`.
- Edição/exclusão de uma aula já registrada continuam operando em UMA
  linha por vez (por `id`), sem relação com a seleção multi-aluno do
  formulário "Nova aula" -- não precisou de mudança, `updateClassLog`/
  `deleteClassLog` já recebiam só o `id`.

**Testado (Playwright, fr, mesmo padrão de stub das entregas
anteriores):** as 3 telas mostram "Alunos" como rótulo; busca confirmada
presente E VISÍVEL (`offsetParent !== null`) em Flashcards e Material de
apoio; em Aulas -- checkboxes presentes (`classLogsCheckboxCount:3`),
contador "Nenhum aluno selecionado" no estado vazio, botão desabilitado;
selecionar 2 alunos (clique sequencial, aguardando o re-render entre um
clique e outro -- clicar os dois sem esperar bate num nó já substituído
pelo re-render anterior, artefato só do script de teste, não do app real)
confirma contador "2 alunos selecionados" e texto do botão "Registrar
aula pra 2 alunos"; submeter cria 2 linhas no banco
(`dbCountAfterCreate:2`), lista mostra as 2 com `@sandra`/`@joao`
prefixados; "Limpar seleção" zera de verdade; busca por "pri" filtra pra
só `@priscila`. Screenshot (fr, claro E escuro) confirma a tela
renderizando corretamente nos dois temas, sem quebra visual -- validado
mesmo sem CSS novo (reaproveita 100% as classes já calibradas de
Flashcards/Material de apoio). Sem erro de console novo atribuível a
este código (mesmos 2 `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature). `node --check` sem erro.

**Achado incidental, não corrigido nesta entrega (fora do pedido)**: os
links "Selecionar todos"/"Limpar seleção" (`<a href="#">` sem cor
customizada, herdando a cor padrão de link do navegador) ficam com
contraste baixo no tema escuro -- visível no screenshot desta entrega,
mas é o MESMO markup já usado em Flashcards/Material de apoio desde a
UX-fix 3 (não introduzido por esta mudança), e aquela entrega não tinha
validado tema escuro (registrado lá como pendência). Não corrigido aqui
por estar fora do escopo do pedido desta rodada -- registrando pra uma
sessão futura tratar como um ajuste de contraste pontual nas 3 telas
juntas (reaproveitar um token `--link`/similar em vez de cor padrão do
navegador), não uma urgência.

**Escopo**: só `shared/admin-class-logs.js` foi reescrito. Nenhuma
migração, nenhum passo manual pendente pra autora.

## UX-fix 5: bug crítico -- digitar no formulário e marcar mais um aluno APAGAVA o texto digitado

A autora reportou um bug sério, testando a entrega da UX-fix 4: "As soon
as I start to type in the field boxes, when I check one student (or one
more student if one was already selected) it ERASES what I had been
writing!!" -- confirmado real ao reler o código, não uma percepção errada.

**Causa raiz**: nas 3 telas (Flashcards/Material de apoio/Aulas), TODA
mudança de seleção de aluno (marcar/desmarcar checkbox, "Selecionar
todos", "Limpar seleção") chamava a função de render COMPLETA de novo
(`renderAdminFlashcardsView()` etc.), que reconstrói `wrap.innerHTML`
inteiro -- inclusive o `<form>` de "Novo cartão"/"Novo material"/"Nova
aula" que estava logo ao lado, com qualquer texto que a professora já
tivesse digitado nele. Existia desde a Fase 8a (quando o `<select>` de
aluno único virou checkboxes multi-seleção) -- um `<select>` só muda de
valor numa ação isolada (clicar a opção nova), então o mesmo padrão de
"toda mudança = re-render completo" nunca tinha causado esse problema
antes; com checkboxes, marcar MAIS de um aluno é o fluxo normal, e cada
clique adicional apagava o formulário.

**Fix, mesmo princípio nas 3 telas**: reestruturado o render em CAIXAS
independentes dentro do mesmo `wrap` -- "Alunos" (busca+checkboxes),
"Conteúdo"/form (nunca mais recriado por causa de seleção), e a lista de
itens existentes (cartões/materiais/aulas, numa caixa própria). Mudar a
seleção agora chama uma função nova
(`updateFlashcardsSelectionDependentUI()`/`updateMaterialsSelectionDependentUI()`/
`updateClassLogsSelectionDependentUI()`) que atualiza SÓ o que realmente
depende da seleção -- contador, subtítulo, visibilidade do campo pinyin
(flashcards), texto/disabled do botão de submit, e a lista de itens
existentes (essa sim precisa ser re-buscada, mas vive numa caixa
separada do form, então recriar SÓ ela nunca toca no texto digitado) --
tudo via manipulação direta do DOM (`textContent`/`style.display`/
`.disabled`/`.placeholder`), nunca via `innerHTML =` no `<form>`. O
`<form>` em si só é recriado (e portanto só "limpa") em 2 momentos
intencionais: o carregamento inicial da aba, e depois de um submit bem
sucedido (aí sim o formulário deve mesmo esvaziar). `ADMIN_*_STATE.
_studentsCache` guarda a lista de alunos entre esses updates
incrementais -- evita um round-trip de rede (`fetchMyStudents()`) a cada
clique de checkbox, já que a lista de alunos em si não muda nesse meio
tempo (só a seleção muda).

**Decisão de arquitetura, registrada explicitamente**: o hook desta
sessão recomendou o subagent "code architecture reviewer" pra esta
tarefa. Optei por implementar diretamente em vez de delegar -- o
histórico completo de decisões destas 3 telas (por que cada campo existe,
por que certas exclusões foram feitas, etc.) está só nesta conversa/neste
CLAUDE.md, e um subagent novo perderia esse contexto. Mantive também a
convenção já estabelecida no resto desta feature (Fases 2-8): as 3 telas
continuam com lógica DUPLICADA de propósito (cada uma com seu próprio
`ADMIN_*_STATE`, sua própria função de render, seu próprio conjunto de
funções incrementais) em vez de extrair um módulo compartilhado novo --
consistente com o padrão já usado em toda a feature até aqui (nunca
houve uma tentativa de abstrair as 3 telas num componente genérico, e
introduzir isso só agora, no meio de um fix de bug, seria uma mudança
arquitetural maior do que o pedido em si).

## Pedidos relacionados, mesma entrega: busca por nome + filtro por idioma

A mesma mensagem trouxe 2 pedidos de UX adicionais, tratados na mesma
entrega por tocarem o mesmo código:

1. **Busca agora casa por NOME, não só por @usuário** -- a autora decora
   o nome das alunas, não o username. Cada linha de checkbox ganhou
   `data-searchtext` (nome + username, minúsculo, combinados) em vez de
   só `data-username`; o filtro de busca (mesmo mecanismo de DOM já
   existente, `style.display`, sem re-render) passou a casar contra essa
   string combinada. O rótulo do checkbox também mudou de "@usuário" pra
   "Nome (@usuário)" (com fallback pro @usuário sozinho quando não há
   `display_name` cadastrado) -- exatamente o formato "nome com o usuário
   entre parênteses" que ela pediu.
2. **Filtro por idioma** (pills reaproveitando `.leaderboard-tab`/
   `.active` -- mesma classe já usada nas sub-abas do Painel de Admin,
   zero CSS novo) nas 3 telas. **Construído dinamicamente a partir dos
   idiomas REALMENTE presentes na lista de alunos da professora**, nunca
   hardcoded fr/pt -- a autora pediu especificamente "francês" e
   "português" como exemplo, mas hardcodear só esses dois teria sido o
   mesmo tipo de erro genérico já evitado em outras partes desta feature
   (ex: `STUDENT_LANGUAGE_LABELS` já cobre os 3 valores do enum). As
   pills só aparecem quando há mais de 1 idioma presente (ruído puro com
   só 1) -- hoje, com o roster real dela (só fr, sem pt/mandarim ainda),
   elas não apareceriam; passam a aparecer sozinhas assim que ela vincular
   a primeira aluna de português. Filtro de idioma e busca combinam (E
   lógico) via o mesmo mecanismo puro de DOM, sem re-render.

**Confirmação pedida pela autora, verificada no código antes de
responder**: ela perguntou explicitamente se o campo de seleção de
aluno (que só cobre francês/português, nunca mandarim, por ela nunca ter
aluna de mandarim) bloquearia usuários de QUALQUER idioma -- inclusive
mandarim -- de criar os PRÓPRIOS flashcards. **Não bloqueia, confirmado
lendo `shared/my-flashcards.js`**: "📇 Meus Cartões" (Fase 5) é uma
feature completamente separada da gestão de alunas da professora --
`renderMyFlashcardsView()` não chama `fetchMyStudents()`/`teacher_
students` em nenhum momento, é escopada só por `APP_KEY` (o idioma do
site em que a conta está logada, `fr`/`zh`/futuramente `pt`) e por
`CURRENT_USER`. Qualquer conta logada em `zh/index.html` continua
podendo criar seus próprios cartões de mandarim normalmente, vinculada
ou não a alguma professora -- `hasActiveTeacherLink()` (Fase 5.1) só
decide se o TETO de 20 cartões se aplica, nunca se a feature em si está
disponível. O filtro de idioma desta entrega vive só dentro do Painel de
Admin (ferramenta de gestão da professora sobre SUAS alunas vinculadas),
nunca na tela "Meus Cartões" (que nem tem seleção de aluno pra começo de
conversa -- ver Fase 5 acima).

**Testes realizados**: `node --check` sem erro nos 3 arquivos. Playwright
(fr), cobrindo especificamente o bug relatado: digitar frente/verso/nota
no formulário de Flashcards, depois marcar um SEGUNDO aluno -- texto
confirmado intacto (`frontSurvived`/`backSurvived`/`noteSurvived` batendo
com o digitado); desmarcar um aluno depois -- texto ainda intacto; buscar
por nome ("joão", casando com "João Pereira") -- texto ainda intacto;
aplicar o filtro de idioma (Português) -- texto ainda intacto; "Limpar
seleção" -- texto ainda intacto, botão fica desabilitado; re-selecionar e
submeter -- cartão criado de verdade no banco (`dbCountAfterSubmit:1`) E
o formulário reseta (`frontValueAfterSubmit:''`, correto e intencional --
só um submit bem-sucedido deve limpar). Mesmo teste do bug crítico
replicado e confirmado em Material de apoio (`materialsTitleSurvived`) e
Aulas (`classLogTopicSurvived`). Pills de idioma confirmadas aparecendo
com contagem certa (`"Todos (3)"`/`"Francês (2)"`/`"Português (em breve)
(1)"`) e filtrando corretamente nas 3 telas quando o roster de teste
mistura fr+pt. Screenshot (fr, claro e escuro) confirma a hierarquia
nova (pills + rótulo "Nome (@usuário)") legível nos dois temas -- zero
CSS novo, reaproveita `.leaderboard-tab` já calibrada. Sem erro de
console novo atribuível a este código (mesmos 2 `pageerror` de mock já
registrados em toda a feature).

**Escopo**: `shared/admin-flashcards.js`, `shared/admin-support-
materials.js`, `shared/admin-class-logs.js` reescritos com a mesma
estrutura incremental. Nenhuma migração, nenhuma mudança de schema,
nenhum passo manual pendente pra autora.

## UX-fix 6: bug de layout -- checkboxes de aluno aparecendo lado a lado em vez de lista vertical

A autora mandou um print (`ALUNOS`, aba Flashcards) mostrando os
checkboxes de aluno quebrando como texto corrido -- lado a lado,
"wrapando" na linha de baixo -- em vez de uma linha por aluno. Pedido:
"fix the problem where (in both languages) students are shown side by
side instead of a vertical list".

**Não consegui reproduzir o bug localmente, registrado aqui com
honestidade em vez de inflar certeza**: rodei 2 tentativas via
Playwright/`getComputedStyle()`/`getBoundingClientRect()` -- a primeira
com 3 alunos fake, a segunda com 11 alunos fake usando os MESMOS nomes/
@usuários do print real dela (Virgínia Veneri, Priscila de Mello,
Marconi Patterson etc.). Nas duas, `display:flex` já calculava
corretamente em cada `<label>` e as linhas já apareciam empilhadas
verticalmente (`top` crescente, mesmo `left`/`width`) -- o bug não se
manifestou no meu ambiente de teste com o código então já mergeado (PR
#253). Tentei checar a produção real (`app.profbrune.com.br`) direto via
`curl`, mas o proxy de saída deste sandbox bloqueia domínios externos
(mesma limitação já documentada neste arquivo pro CDN do Supabase) --
não consegui confirmar o que está de fato servido lá.

**Fix aplicado mesmo sem causa raiz confirmada**: em vez de continuar
tentando reproduzir uma discrepância que não bati, apliquei um fix
estrutural defensivo nos 3 arquivos (`shared/admin-flashcards.js`,
`shared/admin-support-materials.js`, `shared/admin-class-logs.js`) --
mesmo padrão nos 3: o container da lista de checkboxes (`<div
class="profile-edit-input" style="...">`) tinha só `display:block;`
(deixando o empilhamento vertical depender de cada `<label>` filho
calcular block-level sozinho); trocado pra `display:flex;
flex-direction:column;` explícito -- isso torna o empilhamento vertical
uma GARANTIA estrutural do container flex (itens de um
`flex-direction:column` sem `flex-wrap` não podem ficar lado a lado, por
definição), independente de qualquer causa que eu não consegui isolar.
Also adicionado `width:100%; box-sizing:border-box;` em cada `<label
data-student-row>` -- reforço extra, garante que cada linha ocupa a
largura inteira do container mesmo que algum navegador/cascade calcule o
`width` do `<label>` de um jeito que eu não previ.

**Testado (Playwright, fr+zh, mesmo roster de 11 alunos do print real da
autora)**: nas 3 telas (Flashcards/Material de apoio/Aulas) x 2 idiomas
(6 combinações), confirmado via `getBoundingClientRect()` que as 11
linhas ficam empilhadas verticalmente (`top` estritamente crescente,
mesmo `left`/`width` em todas) -- nenhuma lado a lado. Screenshot
(fr, claro e escuro) confirma visualmente a lista vertical limpa nos
dois temas. `node --check` sem erro nos 3 arquivos. Sem erro de console
novo atribuível a este código.

**Honestidade sobre o que isso significa**: o fix é estruturalmente
sólido (elimina essa CLASSE inteira de bug, não só um sintoma pontual),
mas como não reproduzi o bug original, não posso confirmar com certeza
que era exatamente essa a causa do que a autora viu. Se ela continuar
vendo o mesmo problema depois de um recarregamento forçado (F5/hard
refresh, pra garantir que não é cache do navegador/service worker
servindo a versão anterior), é sinal de que a causa real é outra e
precisa de mais investigação -- print novo + inspeção do DOM ao vivo
seria o próximo passo, não repetir o mesmo fix.

**Escopo**: só os 3 arquivos já citados. Nenhuma migração, nenhum passo
manual pendente pra autora.

## Perguntas de acompanhamento na tela de Revisão + bug real de contraste nos botões de grau (fr)

Mesma sessão da UX-fix 6 acima, 3 perguntas/pedidos da autora sobre 2
prints diferentes da tela de Revisão:

**1. "Onde fica Meus cartões?"** -- confirmado ao vivo (Playwright,
`#my-flashcards-btn` dentro de `#user-menu-dropdown`): fica no menu do
avatar/nome (canto superior direito), entre "🏆 Ranking" e "⚙️
Configurações" -- exatamente como a Fase 5 entregou, nada mudou.

**2. "Filtro de fila não devia ter mudado?"** -- JÁ MUDOU, confirmado
lendo o código (comentários "3ª rodada"/"4ª rodada de grilling" em
`fr/index.html`, por volta da linha 1436): o botão "⚙️ Configurar
sessão" saiu de solto no meio da tela pra um ícone circular ao lado do
título "Revisão" (`.review-header-settings-btn`, dentro de
`.review-path-header-row` -- confirmado ao vivo no DOM); "Filtro de
fila" entrou como 1º controle DENTRO desse painel (junto de "Novas
palavras por dia" -- renome de "Frequência de revisão" numa rodada
anterior -- e "Intensidade da sessão"); a legenda redundante "N palavras
prontas pra revisar" virou um rótulo estático sem número. O print que a
autora mandou (`FILTRO DE FILA`/`NOVAS PALAVRAS POR DIA`/`INTENSIDADE DA
SESSÃO` dentro do mesmo painel) já É o resultado dessas mudanças -- não
uma tela desatualizada esperando a mudança acontecer.

**3. "Por que tem 2 botões com contraste diferente dos outros? É bug?
Fix it."** -- confirmado bug real, mas só de CONSISTÊNCIA (não de
acessibilidade -- os 2 botões "diferentes" já passavam WCAG AA antes,
verificado por cálculo: 5.48:1/6.76:1 claro/escuro pro "Bom", 7.94:1 pro
"Difícil"). O problema real: no tema CLARO, "Errei"/"Fácil" usavam texto
branco (`--on-vivid`) enquanto "Difícil"/"Bom" usavam texto escuro
(`--on-seal-red`, fixo nos 2 temas) -- 2 estilos visuais diferentes nos 4
botões da mesma linha, exatamente o que a autora viu no print (fr,
`.grade-hard`/`.grade-good` em `fr/index.html`).

**Causa raiz**: `.grade-hard` usava um hex solto (`#E0A526`, ouro) e
`.grade-good` reaproveitava `var(--seal-red)` -- a cor de MARCA (azul em
fr, ver seção "Tokens de cor de marca vs. semânticos" acima) -- os dois
pareados com `--on-seal-red` (texto escuro FIXO nos 2 temas, calibrado
especificamente pra ler bem sobre a cor de marca). Já `.grade-again`/
`.grade-easy` usam `var(--error-red)`/`var(--jade)` + `--on-vivid` (texto
que ALTERNA branco/escuro conforme o tema, porque essas 2 cores clareiam
no escuro). Resultado: no claro, 2 brancos + 2 escuros lado a lado; por
coincidência, no escuro os 4 já convergiam pra texto escuro (--on-vivid
escuro + --on-seal-red sempre escuro) -- só o tema claro tinha o defeito
visível, o que bate com o print da autora ser claro.

**Fix**: `.grade-hard`/`.grade-good` ganharam cor PRÓPRIA
(`--grade-hard-bg`/`--grade-good-bg`, novas variáveis no `:root` claro E
nos 2 blocos de tema escuro de `fr/index.html`, mesmo padrão de 3
declarações já usado por `--seal-red`/`--jade`/etc.) -- não reaproveitam
mais `--seal-red` (marca) nem um hex solto -- e passaram a usar
`var(--on-vivid)` como os outros 2, em vez de `--on-seal-red`. Valores
calculados (não chutados) pra manter >=4.5:1 nos 2 sentidos: claro
`#8C5F0E`/`#1D5A82` vs branco = 5.59:1/7.42:1; escuro `#C9973A`/`#5FA8D3`
vs `--on-vivid` escuro (`#201335`) = 6.61:1/6.65:1. Resultado: os 4
botões concordam agora nos 2 temas -- texto branco no claro, texto
escuro no escuro -- em vez de 2 fixos + 2 que alternavam.

**zh não tem esse bug** -- checado antes de mexer em fr: `zh/index.html`
usa uma abordagem totalmente diferente e já consistente pros 4 botões
(`.grade-btn{ color:white; }` uma vez só, cores de fundo fixas e
propositalmente escuras nos 4 -- `#A83A2E`/`#C07A1F`/`var(--jade)`/
`#2E7D4F` -- nunca clareiam por tema). zh não foi tocado nesta entrega.

**Testes realizados**: contraste calculado manualmente (fórmula WCAG,
luminância relativa) pros 4 botões nos 2 temas antes de escrever
qualquer cor nova -- não chutado. Playwright (fr, claro+escuro):
`getComputedStyle()` confirma as 4 cores de fundo/texto computadas
batendo com o esperado (`rgb(255,255,255)` texto nos 4 no claro,
`rgb(32,19,53)` nos 4 no escuro); screenshot dos 4 botões nos 2 temas
confirma visualmente a paleta unificada, sem quebra de layout. Não
validado em zh porque zh não foi tocado (já estava correto).

**Escopo**: só `fr/index.html` (3 blocos de variáveis CSS + 2 regras de
classe). Nenhuma migração, nenhum arquivo JS tocado, nenhum passo manual
pendente pra autora.

## Filtro de aluno já vinculado no select + achado real por trás do menu do avatar "gigante"

Mesma sessão da entrega acima, 2 pedidos/perguntas sobre 2 prints
diferentes da tela "🎓 Alunos" e do menu do avatar (canto superior
direito):

**1. "Tem como tirar do select quem já é 'Seus alunos', pra saber quem
falta adicionar?"** -- pedido concreto, implementado. `renderAdminStudentsView()`
(`shared/admin-students.js`) montava a lista `usernameOptionsHTML` a
partir de TODOS os `profiles`, sem checar contra `students` (já
vinculados) -- sempre mostrava a lista inteira, obrigando a autora a
lembrar de cor quem já tinha vinculado. Corrigido com um cuidado
importante: o filtro não pode ser "sumir de vez" -- "cada aluno vale pra
1 idioma" (Fase 1) significa que a MESMA conta pode ser vinculada de
novo, legitimamente, pra um idioma DIFERENTE (ex: Sandra de francês +
Sandra de mandarim como 2 vínculos separados). Por isso o filtro
(`linkedUsernamesByLang`, novo) é por IDIOMA -- reconstrói a lista de
contas disponíveis a cada troca do `<select>` de idioma (`change`
listener novo), excluindo só quem já está vinculado NAQUELE idioma
específico, nunca uma exclusão global de "quem já é aluno em qualquer
idioma".

**2. "Por que esse menu abriu tão grande???"** -- não era bug de CSS (já
descartei isso investigando a UX-fix 6 anterior, nesta mesma sessão) --
era uma REGRESSÃO real de arquitetura de navegação, achada ao comparar o
dropdown do avatar com a sidebar de desktop lado a lado. `#user-menu-dropdown`
tem uma regra já existente e comentada (`.mais-extra-tab{ display:none }`
só em `@media (min-width:900px)`) que esconde do dropdown, no desktop,
qualquer item que a sidebar já cobre -- hoje só aplicada a
Conjugação/Desafios (fr) / 汉字 (zh). Mas 4 outros itens do MESMO dropdown
-- "👤 Meu perfil", "🏆 Ranking", "⚙️ Configurações", "🛠️ Painel de
Admin" -- são 100% redundantes com `data-tab="profile"/"leaderboard"/
"settings"/"admin-badges"` que a sidebar (`.sidebar-nav-secondary`) JÁ
tem, e disparam exatamente o mesmo `switchTab(...)` (confirmado lendo
`fr/app.js` linhas 914-943) -- só que ninguém tinha aplicado a mesma
classe `mais-extra-tab` a eles. Resultado: no desktop, a autora via 8
itens no dropdown quando só 4 (Meus cartões/Material de apoio/Reportar
problema/Sair) não existem em lugar nenhum da sidebar -- os outros 4
eram puro ruído duplicado, um acúmulo silencioso de fases anteriores
(Fase 5/8b adicionaram Meus Cartões/Material de apoio ao dropdown sem
ninguém reconferir se os itens PRÉ-EXISTENTES continuavam justificados
ali).

**Fix**: adicionada a classe `mais-extra-tab` a `#user-profile-btn`/
`#leaderboard-btn`/`#user-settings-btn`/`#admin-badges-btn`, em
`fr/index.html` E `zh/index.html` -- zero CSS novo, reaproveita a regra
já existente. No MOBILE nada muda (Perfil já tinha seu próprio
`#user-profile-btn{display:none}` específico ali, por ter aba fixa
própria na barra inferior; os outros 3 continuam alcançáveis via "Mais",
que é exatamente pra isso -- itens sem aba fixa/sidebar equivalente).

**Testado (Playwright, fr+zh)**: filtro do select -- vincular em
"Francês" exclui quem já está vinculado em francês mas mantém quem só
tem vínculo em outro idioma; trocar pra "Mandarim" (idioma sem
ninguém vinculado no cenário de teste) mostra a lista cheia de novo;
trocar pra "Português" exclui só quem tem vínculo EM português.
Dropdown do avatar -- desktop (1400px): confirmado só 4 itens visíveis
(`my-flashcards-btn`/`support-materials-btn`/`report-menu-btn`/
`logout-btn`), altura caiu de ~380px pra 203px; mobile (480px):
confirmado que TODOS os 8-9 itens continuam visíveis ali (nada
regrediu no "Mais"). Screenshot do dropdown desktop confirma visualmente
o menu compacto, sidebar ao lado mostrando os mesmos 4 itens que
sumiram do dropdown. `node --check` sem erro em `shared/admin-students.js`.

**Escopo**: `shared/admin-students.js` + `fr/index.html` + `zh/index.html`
(só classe CSS adicionada em 4 botões existentes, zero CSS novo).
Nenhuma migração, nenhum passo manual pendente pra autora.

## Prompt-mestre "reestruturação do formulário de flashcards do admin" -- Fase 0 (auditoria) + Fase 1 (Modo de prática antes de Conteúdo, front deixa de ser obrigatório no cloze)

Prompt-mestre grande, fatiado em fases próprias travadas por autorização
explícita a cada etapa (mesmo padrão já usado em toda a feature de alunas
particulares) -- o comando de ativação exigia rodar SÓ a Fase 0 (auditoria
de leitura, sem código) e esperar autorização explícita antes de tocar em
qualquer arquivo.

**Fase 0 (auditoria) -- achado central, reportado antes de codar**: a
tela de admin (`shared/admin-flashcards.js`) já tinha Frente/Verso/
Recursos opcionais ANTES de Modo de prática no HTML/DOM -- ordem oposta à
pedida no prompt-mestre. Mais importante: Frente/Verso eram lidos e
gravados INCONDICIONALMENTE em todo modo, inclusive Completar a frase --
mas `renderClozeReviewCard` (fr/zh `app.js`) nunca lê `card.front`/
`card.back_hanzi` em NENHUMA tela de revisão pra esse modo. Ou seja: todo
cartão cloze já criado tinha um `front` gravado no banco que nunca era
mostrado a ninguém -- dado morto só pra satisfazer a constraint `not null`
de `teacher_flashcards.front` (migration 026). Reportado como decisão em
aberto antes de tocar em schema: opção (a) copiar algo pra `front`
automaticamente, ou (b) relaxar a constraint e não exigir mais o campo
nesse modo. A autora escolheu explicitamente a opção (b), com instrução
verbatim de NÃO inventar valor substituto nenhum ("Isso criaria dado
redundante/artificial").

**Checklist de verificação pedido pela autora antes de tocar em
`teacher-flashcards.js`** (respondido com leitura real do código, não
suposição, antes de escrever qualquer linha):
1. `front` aceitava NULL no banco? Não -- `not null` desde a migration
   026, nunca relaxado.
2. Todos os locais que leem `front` de `teacher_flashcards`? Mapeados via
   grep: `shared/admin-flashcards.js` (lista "Cartões ativos"),
   `fr/app.js`+`zh/app.js` (`buildCardFromTeacherFlashcard`, Combinar --
   `MATCH_STATE.pairs`, Speed Review -- `buildSpeedQueue`/render, export
   Anki -- `ANKI_EXPORT_CONFIG`), `shared/reports.js` (contexto de
   report, já tinha fallback `card.front || card.back_hanzi || null`,
   sem risco). `renderClozeReviewCard` -- o único que NUNCA lê `front` --
   confirmado por leitura direta do código.
3. `buildFlashcardsCardsBoxHTML` depende de `front`? Sim, via
   `flashcardCardRowHTML` -- ajustado (ver abaixo).
4. Edição/exclusão/filtros administrativos dependem de `front`? Edição de
   cartão já criado nunca foi implementada (nem nesta fase nem nas
   anteriores -- só criar/arquivar), então não há UI de edição pra
   ajustar. Exclusão (`setFlashcardStatus`) e filtros (busca/idioma de
   ALUNO, não de cartão) não tocam `front`.
5. Outro consumidor além de `renderClozeReviewCard`? Sim, achados
   CRÍTICOS não óbvios à primeira vista: **Combinar** (jogo de
   pareamento) e **Speed Review** nunca sabem o que é "cloze" -- os dois
   pressupõem um par frente/verso simples e leem `card.front`/
   `card.back_hanzi` sem checar `clozeSentence`. Um cartão cloze SEM
   `front` quebraria a exibição deles (tile/prompt em branco). Mesmo
   achado na exportação de baralho Anki (`ANKI_EXPORT_CONFIG.noteFields`)
   -- um cartão sem front geraria uma nota do Anki com a frente vazia.
6. Cartões cloze já existentes continuam funcionando sem alteração?
   Sim, confirmado -- nenhuma migração de dado, nenhum backfill; a
   migration só relaxa a constraint, cartões antigos mantêm `front`
   preenchido como sempre, e o filtro novo (ver abaixo) só passa a
   excluir cartões NOVOS sem front dos poucos lugares que dependem dele.
7. Interface de edição de cartões cloze precisaria respeitar a regra?
   Não se aplica -- não existe edição de conteúdo de cartão já criado em
   nenhuma fase desta feature até aqui (só criar/arquivar/reativar).

**O que foi feito:**

- **Migration `035_allow_null_front_teacher_flashcards.sql`** --
  `alter table teacher_flashcards alter column front drop not null`.
  Aditiva/sem risco (só relaxa uma constraint, não migra nenhuma linha
  existente). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()`: `front` só é
  exigido quando NÃO é um cartão cloze (`isCloze = !!cleanClozeSentence`).
  `back_trans` continua obrigatório em TODO modo, sem exceção (é o que
  `renderClozeReviewCard` mostra como tradução depois de responder, além
  de ser o verso normal/opção certa nos outros 2 modos). Insert grava
  `front: cleanFront || null` -- nunca um valor substituto, gravação real
  de `NULL` quando o modo é cloze.
- **`shared/admin-flashcards.js` reestruturado** -- ordem visual agora é
  Destinatários (Alunos) → Modo de prática (radios) → Conteúdo →
  Recursos opcionais → Criar cartão → Cartões ativos, exatamente a ordem
  pedida. "Conteúdo" virou 2 blocos MUTUAMENTE EXCLUSIVOS (nunca os dois
  visíveis juntos, controlados pelo `change` do radio "Modo de prática"):
  - `#admin-flashcard-content-main` -- Frente + pinyin (mandarim) +
    Verso, reaproveitado tanto por "Flashcard normal" quanto por
    "Múltipla escolha" (só os RÓTULOS trocam entre os 2 -- "Frente"/
    "Verso" vira "Pergunta/termo"/"Resposta correta" no modo mc, via
    `textContent` nos 2 `<label>` com id próprio). "Outras opções"
    (`choices`) fica dentro deste bloco, visível só no modo mc.
  - `#admin-flashcard-content-cloze` -- Frase com lacuna + Resposta
    certa + pinyin da resposta (mandarim) + **Tradução** (campo NOVO,
    `#admin-flashcard-cloze-trans`, mapeado pra `back_trans` no submit).
    Campo de Tradução foi inferência minha, não estava explícito na
    lista de campos por modo que a autora mandou (que listava só "Frase
    com lacuna"/"Resposta correta" pro modo cloze) -- mas a MESMA
    mensagem dela, 2 linhas acima dessa lista, travava explicitamente
    "Completar a frase → cloze_sentence + cloze_answer + **back_trans**"
    como a semântica de dado certa do modo, e `back_trans` continua
    hard-obrigatório no banco (é o que a tela de revisão mostra como
    tradução ao aluno). Resolvi a aparente omissão a favor da frase mais
    precisa (a semântica de dado), não deixei o campo de fora -- sinalizando
    aqui explicitamente pra revisão da autora, caso a intenção real fosse
    outra.
  - Campos que não pertencem ao modo selecionado ficam GENUINAMENTE
    escondidos (`display:none` no bloco inteiro), não só reordenados --
    no modo cloze, nem o campo Frente existe na tela.
- **`flashcardFrontSummaryHTML()`** (novo, `shared/admin-flashcards.js`)
  -- a lista "Cartões ativos" mostrava `c.front` cru; agora cai pra
  mostrar a frase-cloze resolvida (`"Je [viens] de Paris."`, resposta
  certa entre colchetes) quando `front` é `null`. Cartões cloze com
  `front` preenchido (todos os já existentes) continuam mostrando o
  front normalmente, ZERO mudança visual pra eles -- o fallback só entra
  pra cartões novos sem front.
- **`hasPlainFrontBack(card)`** (novo, fr+zh `app.js`, mesma função
  espelhada com a adaptação de idioma de sempre -- checa `card.front` no
  fr, `card.back_hanzi` no zh) -- exclui um cartão cloze SEM front dos 3
  consumidores que nunca entendem cloze: `buildSpeedQueue()` (Speed
  Review), `startMatchGame()` (Combinar) e `ANKI_EXPORT_CONFIG.cards()`
  (exportação de baralho). **`eligibleReviewPool()` em si NÃO leva esse
  filtro** -- Revisão (Flashcard/Palavras Difíceis) é o lugar CERTO pro
  cartão cloze aparecer, com ou sem front; só os 3 consumidores que
  pressupõem par frente/verso simples precisavam do filtro. Cartões
  cloze já existentes (front preenchido) continuam elegíveis nos 3
  lugares, sem mudança de comportamento.

**Decisões arquiteturais tomadas nesta fase:**
1. `front` nullable é específico ao modo cloze -- não virou opcional pros
   outros 2 modos (flip/mc continuam exigindo Frente, mesmo
   comportamento de sempre).
2. Reaproveitar os MESMOS inputs de Frente/Verso entre Flashcard normal
   e Múltipla escolha (só trocando rótulo) em vez de duplicar campos --
   evita 2 fontes de verdade pro mesmo dado e é consistente com o motor
   de dado já existente (MC já usava `front`/`back_trans` como
   pergunta/resposta certa desde a Fase 8a, só a UI não deixava isso
   claro visualmente).
3. Tradução do modo cloze ganhou input PRÓPRIO
   (`#admin-flashcard-cloze-trans`) em vez de tentar reaproveitar
   `#admin-flashcard-back` via reparenting/DOM move -- mantém o padrão já
   estabelecido no arquivo (MC e cloze já tinham cada um seus próprios
   sub-campos, ex: `admin-flashcard-mc-1/2/3`), sem introduzir
   complexidade de mover elementos de lugar no DOM.
4. Filtro de "front ausente" (`hasPlainFrontBack`) ficou fora de
   `eligibleReviewPool()` de propósito -- aplicar lá excluiria cartão
   cloze inteiro da Revisão, que é exatamente o lugar onde ele DEVE
   aparecer; o filtro só pertence aos 3 consumidores que não entendem
   cloze mecanicamente.

**Gratuito x Premium (avaliado, não implementado):** nenhuma mudança de
conceito nesta fase -- é reorganização de UI + relaxamento de constraint,
sem nova superfície de produto. Mesma conclusão de todas as fases
anteriores desta feature.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`,
`zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão de
stub de sempre: (1) ordem visual confirmada via
`compareDocumentPosition` -- "Modo de prática" vem antes de "Conteúdo" no
DOM; (2) troca de modo confirmada via `getComputedStyle().display` --
flip mostra bloco principal com rótulos "Frente"/"Verso", mc mostra o
MESMO bloco com rótulos "Pergunta/termo"/"Resposta correta" + "Outras
opções" visível, cloze esconde o bloco principal inteiro e mostra só
Frase/Resposta/Pinyin(mandarim)/Tradução; (3) submit cloze sem tradução
rejeitado (`dbDelta:0`, erro "Digite a tradução..."); sem `___`
rejeitado; zh sem pinyin da resposta rejeitado; (4) submit cloze válido
sem preencher Frente confirma `front === null` gravado de verdade no
banco (`frontIsNull:true`), nunca um valor inventado; (5) lista "Cartões
ativos" confirmada mostrando o cartão cloze legado (front preenchido,
"Tu es → ...") normalmente E o cartão novo sem front como
"Je [viens] de Paris. → Eu venho de Paris." (fallback funcionando); (6)
`hasPlainFrontBack()` chamada diretamente confirma `true` pro cartão
cloze legado (front preenchido), `false` pro cartão novo sem front,
`true` pro cartão flip comum -- nos dois idiomas; (7) do lado da ALUNA
(sessão separada, `mergeTeacherFlashcardsIntoState` real): confirmado
`eligibleReviewPool()` inclui os DOIS cartões cloze (legado e sem front),
enquanto `eligibleReviewPool().filter(hasPlainFrontBack)` (Speed/
Combinar) exclui só o sem front; sessão de revisão real
(`renderReviewView`/`renderClozeReviewCard`/`gradeCurrentCard`) rodada
de ponta a ponta pro cartão SEM front -- lacuna renderiza, resposta
errada aplica `.incorrect` e revela a resposta certa, `gradeCurrentCard`
dispara de verdade (`reps`/`due` mudam); (8) regressão de Múltipla
escolha confirmada -- criar cartão mc com front/back/choices continua
funcionando sem nenhuma mudança de comportamento. Validação visual
(screenshot Playwright, fr, claro+escuro) dos 3 modos confirma a nova
hierarquia legível nos dois temas, zero CSS novo (reaproveita classes já
calibradas). Sem erro de console novo atribuível a este código (mesmos
`pageerror` de mock -- `.is()`/`.upsert()`/`insert().then()` -- já
registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito, é escopo
de fase futura se pedido):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não foi tocado
  -- a reestruturação e o relaxamento de `front` são só pra
  `teacher_flashcards`, mesmo escopo restrito já usado em toda a Fase 8.
- Edição de conteúdo de um cartão já criado continua não implementada --
  fora do escopo desta fase (era sobre reestruturar CRIAÇÃO, não
  adicionar edição).
- `shared/admin-support-materials.js`/`admin-class-logs.js` não foram
  tocados -- não têm o conceito de "modo de prática", fora do escopo
  deste prompt-mestre específico.

Esta é a Fase 1 de um prompt-mestre que travou explicitamente "não avance
automaticamente" após cada fase. Próxima fase só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23), "Siga para a fase 2".**
Não tinha o texto literal das Fases 2+ do prompt-mestre original salvo
nesta sessão (só um resumo genérico sobrevive de sessões anteriores) --
em vez de adivinhar o escopo numa tela administrativa já corrigida
várias vezes por bug real, perguntei à autora via `AskUserQuestion` com 3
opções concretas + "outra coisa". Ela escolheu **"Validação contextual
mais rica / mensagens de erro por campo"**.

## Fase 2 (validação contextual por campo) -- borda + mensagem específica embaixo de cada campo, tempo real no blur

**O que foi feito**, só em `shared/admin-flashcards.js` +
`fr/index.html`/`zh/index.html` (CSS):

- **`.field-invalid`** (novo, fr+zh `index.html`) -- reaproveita o MESMO
  par `border-color: var(--error-red)` + `background: rgba(214,38,25,
  0.08)` já usado em `.gram-exercise.wrong input`/`.conj-field.wrong
  input` (fr) e `.mc-option.incorrect` (fr+zh) -- zero cor nova, mesmo
  princípio de reaproveitar tokens já calibrados em vez de inventar.
  `.profile-edit-field-error` (novo) -- mesma cor/tamanho de
  `.profile-edit-error` (rodapé), só menor/mais próximo do campo.
- **`<p class="profile-edit-field-error">` embaixo de cada campo
  obrigatório** (Frente/Verso/1ª opção errada MC/Frase-cloze/Resposta-
  cloze/Pinyin-cloze/Tradução-cloze) -- vazio por padrão, populado só
  quando aquele campo específico falha.
- **`validateFlashcardForm(wrap)`** -- validação completa/definitiva,
  rodada no SUBMIT, ANTES do upload de mídia (evita subir imagem/áudio à
  toa se o resto do formulário ainda está inválido -- melhoria real, não
  só cosmética). Só valida os campos que pertencem ao MODO atualmente
  selecionado -- nunca marca "Frente" como inválida no modo cloze
  (esse campo nem existe pra esse modo, ver Fase 1 acima). Foca o
  primeiro campo inválido automaticamente.
- **`wireFlashcardFieldValidation(wrap)`** -- validação em TEMPO REAL:
  cada campo obrigatório valida no `blur` (assim que a professora sai
  dele, não só no clique de "Criar cartão") e limpa o próprio erro
  assim que ela volta a digitar (`input`). Pedido explícito da autora
  ("validação em tempo real... em vez de só no clique") -- antes disso,
  só existia uma frase genérica no rodapé, só depois do clique.
- **`clearAllFlashcardFieldErrors()`** chamada em 2 pontos extras, pra
  nenhum erro ficar "preso" num estado que não faz mais sentido: (1) ao
  trocar de "Modo de prática" (um campo que estava marcado inválido no
  modo anterior pode nem existir mais no modo novo -- ex: trocar de flip
  pra cloze escondendo "Frente" com erro ainda visível seria confuso);
  (2) em `updateFlashcardsSelectionDependentUI()`, ao mudar a seleção de
  alunos -- desmarcar o único aluno de mandarim da seleção deveria
  limpar um erro "Pinyin obrigatório pra aluno(s) de mandarim" que não
  se aplica mais.
- **Mensagens específicas por tipo de falha**, não uma genérica pra
  tudo: "Obrigatório." pros campos vazios simples; "Precisa ter
  exatamente um espaço marcado com ___." quando a frase-cloze não tem
  a lacuna certa (distinto de "vazio"); "Digite pelo menos 1 opção
  errada." pro grupo de múltipla escolha; "Obrigatório pra aluno(s) de
  mandarim." pro pinyin-cloze quando a seleção inclui mandarim.
- **Removido o check redundante pós-upload** de "múltipla escolha sem
  nenhuma opção errada" que existia desde a Fase 8a -- já coberto por
  `validateFlashcardForm()` ANTES do upload agora, então rodar de novo
  depois seria trabalho morto (e a validação nova já roda mais cedo,
  então esse caminho de código nunca mais seria alcançado com choices
  vazio).

**Decisões arquiteturais tomadas nesta fase:**
1. `createFlashcard()` (`shared/teacher-flashcards.js`) NÃO foi tocado --
   continua sendo a fonte de verdade da validação (mesma validação
   server-side de antes). A validação de campo desta fase é só uma
   camada de UX na frente, mesmo nível de confiança de outros gates de
   UI já existentes no app (ex: teto de 20 cartões da Fase 5.1) -- não
   uma fronteira de segurança nova.
2. Validação em tempo real É por campo individual (blur/input), não uma
   chamada de `validateFlashcardForm()` completa a cada tecla -- rodar a
   validação completa a cada blur marcaria campos que a professora ainda
   nem chegou a preencher (ex: sair do campo Frente já marcaria "Verso"
   vazio como erro, antes dela sequer ter chance de preenchê-lo). Cada
   campo só valida a SI MESMO no seu próprio blur.
3. Mensagem do rodapé (`#admin-create-flashcard-error`) não sumiu --
   agora mostra um resumo genérico ("Corrija os campos destacados
   acima.") só quando `validateFlashcardForm()` falha no submit, servindo
   de âncora visual pra quem não notar os campos individuais de cara.

**Gratuito x Premium (avaliado, não implementado):** validação de UI
pura, sem custo marginal -- mesma conclusão de toda a Fase 1 e de todo o
resto desta feature, nenhuma razão pra diferenciar por plano.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh),
mesmo padrão de stub de sempre: (1) blur num campo vazio marca
`.field-invalid` + mensagem "Obrigatório.", digitar limpa os dois
imediatamente; (2) submeter com Frente preenchida mas Verso vazio marca
SÓ o Verso (Frente permanece sem erro), foca o Verso, mostra o resumo no
rodapé, `dbDelta:0`; (3) trocar de modo (flip→mc) confirma que o erro de
Frente não persiste (`frontStillInvalid:false`), e que o campo de
múltipla escolha (1ª opção errada) valida corretamente no blur e limpa
ao corrigir; (4) modo cloze -- frase sem `___` recebe a mensagem
ESPECÍFICA ("Precisa ter exatamente um..."), não a genérica
"Obrigatório.", enquanto Resposta/Tradução (ainda vazias mas não
tocadas nesse teste) não são marcadas incorretamente; (5) submit
completo e válido em cloze cria o cartão de verdade (`dbDelta:1`) nos
dois idiomas -- no zh, confirmado que o pinyin-cloze É exigido (aluno
mandarim selecionado) e barra o submit até ser preenchido
(`pinyinInvalidBeforeFill:true`), depois passa. Validação visual
(screenshot Playwright, fr, claro+escuro) do estado de 2 campos
inválidos ao mesmo tempo (Frente+Verso) confirma legibilidade nos dois
temas -- esperado, já que reaproveita só o par border-color/background
já calibrado em `.gram-exercise.wrong input`/`.mc-option.incorrect`,
nenhuma cor nova. Sem erro de console novo atribuível a este código
(mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já registrados em
toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito, é escopo
de fase futura se pedido):**
- Nenhuma validação client-side de formato de arquivo/tamanho de
  imagem/áudio antes do upload -- fora do escopo desta fase (era sobre
  campos de texto/seleção).
- `student_flashcards`/`admin-support-materials.js`/`admin-class-logs.js`
  não ganharam o mesmo padrão de validação por campo -- fora do escopo
  deste prompt-mestre específico (que é só o formulário de flashcards do
  admin).
- Não foi confirmado com a autora se as 3 outras opções descartadas na
  pergunta inicial (reestruturar Destinatários visualmente; Recursos
  opcionais contextual por modo) fazem parte de uma Fase 3 futura --
  ficam como candidatas, não decididas.

Próxima fase só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para
a fase 3: reestruturar Destinatários visualmente" -- escopo já vinha
explícito na própria instrução, sem precisar de outra rodada de
`AskUserQuestion`.**

## Fase 3 (reestruturar Destinatários visualmente) -- contador vira pill no topo, corrige de passagem contraste dos links "Selecionar todos/Limpar seleção"

**O que foi feito**, só em `shared/admin-flashcards.js` +
`fr/index.html`/`zh/index.html` (CSS):

- **Contador de seleção virou `.pill`** (classe já existente, reaproveitada
  do streak/XP da topbar e do selo "Aluno vinculado" de `my-flashcards.js`
  -- zero CSS novo pro chip em si) e **subiu pro TOPO do bloco "Alunos"**,
  logo abaixo do hint -- antes era um `<p>` de texto solto embaixo da
  lista rolável de checkboxes, obrigando a rolar até o fim pra saber
  quantos alunos estavam marcados.
- **"Selecionar todos"/"Limpar seleção" viraram uma linha (`.admin-
  recipients-actions`) ao lado do pill**, dentro do mesmo toolbar
  (`.admin-recipients-summary`, `display:flex; justify-content:space-
  between; flex-wrap:wrap` -- quebra pra 2 linhas em telas estreitas sem
  overflow, confirmado no screenshot) -- antes ficavam soltos entre a
  busca e a lista, sem relação visual com o contador.
- **`.admin-select-link`** (novo, fr+zh `index.html`) -- reaproveita
  `--seal-red-dark`, o MESMO token já usado por `.side-card-link` ("Ver
  ranking completo →") -- corrige de passagem um contraste baixo real: os
  2 links não tinham cor própria antes, herdavam o azul padrão do
  navegador, que ficava pouco legível no tema escuro -- pendência já
  registrada na UX-fix 4/5 ("achado incidental, não corrigido... registrar
  pra sessão futura tratar"). Só aplicado em `shared/admin-flashcards.js`
  -- `admin-support-materials.js`/`admin-class-logs.js` têm o MESMO
  markup sem cor própria, mas não foram tocados aqui (fora do escopo
  desta fase -- só a tela de Flashcards é o alvo deste prompt-mestre,
  mesmo princípio já usado desde a Fase 1).

**Decisões arquiteturais tomadas nesta fase:**
1. Nenhuma mudança em `updateFlashcardsSelectionDependentUI()` --
   `counterEl.textContent = ...` já funcionava independente da tag/classe
   do elemento, então trocar `<p class="profile-edit-hint">` por `<span
   class="pill">` não exigiu nenhuma mudança de lógica, só de template.
2. Fixar o contraste dos 2 links foi decisão minha, não pedida
   explicitamente nesta instrução -- mas diretamente adjacente ao que
   estava sendo tocado (os mesmos 2 elementos, movidos de posição) e já
   estava registrado como pendência conhecida no CLAUDE.md; corrigir
   enquanto mexia no mesmo HTML foi mais barato que deixar pra depois.
   Escopo explicitamente NÃO estendido às outras 2 telas com o mesmo
   markup (ver acima).

**Gratuito x Premium (avaliado, não implementado):** reorganização de UI
pura, sem custo marginal -- mesma conclusão de toda a Fase 1/2.

**Testes realizados:** `node --check` sem erro. Playwright (fr): ordem
confirmada via `compareDocumentPosition` (toolbar de contador+ações vem
ANTES da lista de checkboxes no DOM); contador é `<span class="pill">` de
verdade; `.admin-select-link` aplicado com cor computada `rgb(29,90,130)`
(fr, claro -- bate com `--seal-red-dark` já calibrado, mesmo valor usado
na correção dos botões de grau registrada anteriormente neste arquivo);
contador atualiza corretamente em 3 cenários (selecionar 1, "Selecionar
todos", "Limpar seleção"); fluxo de submit completo (criar cartão)
confirmado continuando a funcionar sem nenhuma regressão
(`dbDelta:1`) depois da reestruturação. Validação visual (screenshot
Playwright, fr+zh, claro+escuro) confirma o toolbar novo legível nos 4
cenários -- destaque pro tema escuro, onde os 2 links agora usam a cor
calibrada certa em vez do azul padrão do navegador (fr) / ficam no tom
vermelho de marca do zh, ambos claramente legíveis, confirmando visualmente
a correção do contraste. Sem erro de console novo atribuível a este
código (mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `admin-support-materials.js`/`admin-class-logs.js` continuam com os
  mesmos 2 links sem cor própria (baixo contraste no escuro) -- a classe
  `.admin-select-link` já existe e está pronta pra ser aplicada lá também
  quando/se uma sessão futura for autorizada a tocar essas 2 telas.
- Nenhuma outra mudança visual no bloco "Alunos" além do reposicionamento
  do contador/ações -- pills de filtro de idioma, busca e lista de
  checkboxes continuam com o mesmo layout de antes (não fizeram parte do
  pedido).

Próxima fase só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para:
Recursos opcionais contextual por modo" -- investigação prévia invalidou a
leitura literal do pedido (ver Fase 4 abaixo), resolvida com uma pergunta
antes de codar (`AskUserQuestion`).**

## Fase 4 (Recursos opcionais contextual por modo) -- investigação invalida a leitura literal, texto de apoio muda por modo

**Investigação antes de codar** (mesma disciplina de "investigação antes de
mudar qualquer coisa" já usada em UX-fix 4/6 deste arquivo): antes de tocar
em qualquer campo do bloco "Recursos opcionais" (Nota/Imagem/Áudio, hoje
mode-independente, sempre visível nos 3 modos), confirmei por leitura direta
do código de revisão (fr/zh `app.js`) se algum dos 3 campos realmente varia
por modo hoje:
- **Imagem/Áudio** (`card.imageUrl`/`card.audioUrl`) já renderizam
  corretamente nos 3 modos -- `renderReviewView()` (flip),
  `renderMultipleChoiceReviewCard()` (mc) e `renderClozeReviewCard()`
  (cloze), fr+zh, todos mostram os dois quando presentes. Escondê-los por
  modo seria REGRESSÃO contra comportamento que já funciona, não uma
  melhoria.
- **Nota** (`card.note`/`teacherNote`) nunca aparece pro aluno em NENHUM
  modo -- mas não é um bug de modo: o único ponto de leitura confirmado
  (`grep` em `shared/admin-flashcards.js:187`) é a própria lista "Cartões
  ativos" da PROFESSORA -- um lembrete privado dela, nunca destinado ao
  aluno. Funciona como projetado, uniformemente nos 3 modos.

Ou seja: nenhum dos 3 campos genuinamente varia por modo hoje -- a premissa
literal por trás de "Recursos opcionais contextual por modo" (esconder
algo dependendo do modo) não se sustenta contra o código real. Implementá-la
ao pé da letra arriscaria esconder Imagem/Áudio, que já funcionam
corretamente nos 3 modos.

**Resolvido com uma pergunta à autora** (`AskUserQuestion`, 3 opções: só
texto de apoio contextual / nada a fazer / outra ideia), reportando o
achado acima antes de propor qualquer mudança. Resposta: **"Só texto de
apoio contextual"** -- manter os 3 campos sempre visíveis nos 3 modos
(comportamento atual, correto), mas trocar o texto de hint da seção
conforme o modo selecionado, explicando ONDE cada recurso aparece
NAQUELE modo especificamente. Nenhuma mudança funcional.

**O que foi feito**, só em `shared/admin-flashcards.js`:

- **`FLASHCARD_RESOURCES_HINT`** (novo, objeto com uma entrada por modo:
  `flip`/`mc`/`cloze`) -- 3 textos, cada um descrevendo onde Imagem/Áudio
  aparecem NAQUELE modo (ex: "junto da pergunta, acima das opções de
  múltipla escolha" no modo mc) e reafirmando que Nota é um lembrete
  privado que o aluno nunca vê, nos 3.
- **`<p class="profile-edit-hint" id="admin-flashcard-resources-hint">`**
  (novo) logo abaixo do rótulo "Recursos opcionais", inicializado com o
  texto do modo padrão (`flip`, já `checked` por padrão no radio group).
- **Listener de `change` do radio "Modo de prática"** (já existente desde
  a Fase 1, mesmo bloco que troca rótulos Frente/Verso e visibilidade dos
  blocos de Conteúdo) ganhou mais uma linha: atualiza
  `#admin-flashcard-resources-hint` com `FLASHCARD_RESOURCES_HINT[mode]` --
  reaproveita o mesmo mecanismo já existente, não um listener novo.

**Decisões arquiteturais tomadas nesta fase:**
1. Zero mudança de visibilidade/comportamento dos 3 campos -- eles
   continuam sempre presentes nos 3 modos, exatamente como confirmado
   correto na investigação. "Contextual" aqui é estritamente sobre texto
   explicativo, não sobre esconder/mostrar.
2. Nenhuma mudança em `createFlashcard()`/schema/migração -- é uma
   mudança 100% de UI (um texto que troca de conteúdo), sem novo dado
   sendo capturado ou persistido.
3. Reaproveita a classe `.profile-edit-hint` já usada por todo hint do
   formulário (zero CSS novo), e o mesmo listener de `change` do radio
   group já existente desde a Fase 1 -- não um sistema de hint contextual
   novo, só mais uma linha nesse listener.

**Gratuito x Premium (avaliado, não implementado):** mudança de texto de
UI pura, sem custo marginal -- mesma conclusão de toda a Fase 1/2/3.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh): hint
inicial confirmado batendo com o modo `flip` (padrão `checked`); trocar
pra `mc` e depois `cloze` confirma o texto mudando pra cada um; voltar pra
`flip` confirma o texto original restaurado (`===` com o inicial); os 3
campos (Nota/Imagem/Áudio) confirmados **continuando visíveis
(`offsetParent !== null`) nos 3 modos** -- a checagem específica pra
garantir que a regressão que esta investigação identificou como risco não
foi introduzida; fluxo de submit completo (criar cartão) confirmado
continuando a funcionar sem nenhuma regressão (`dbDelta:1`) depois da
mudança, nos dois idiomas. Validação visual (screenshot Playwright, fr,
claro+escuro, modo múltipla escolha) confirma o hint novo legível nos dois
temas -- esperado, já que reaproveita só a classe `.profile-edit-hint` já
calibrada, nenhuma cor nova introduzida. Sem erro de console novo
atribuível a este código (mesmos `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma mudança nos 3 campos em si (Nota/Imagem/Áudio) -- só o texto de
  apoio acima deles.
- `admin-support-materials.js`/`admin-class-logs.js` não têm o conceito
  de "Modo de prática" (não se aplica -- fora do escopo deste
  prompt-mestre, que é só o formulário de flashcards do admin).
- **Este era o último dos 3 candidatos oferecidos na pergunta que abriu a
  Fase 2** (reestruturar Destinatários -> Fase 3; validação por campo ->
  Fase 2; Recursos opcionais contextual -> esta fase). Com os 3
  endereçados, não há mais nenhum item pendente conhecido deste
  prompt-mestre específico -- qualquer trabalho além disso precisa de
  escopo/autorização explícitos numa sessão futura, não presumido como
  próximo passo automático.

Próxima fase (se houver) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

## "7 propostas" -- grilling completo (15 perguntas) sobre feedback real de uso, todas implementadas numa sessão só

A autora testou o app de verdade (2 screenshots reais anexados -- tela de
revisão de múltipla escolha e formulário de criação de flashcard) e trouxe
7 propostas numeradas de uma vez, pedindo "faça um grilling dessas
propostas" antes de implementar -- mesma disciplina de toda sessão desta
feature. Grilling de 15 perguntas rodado (`AskUserQuestion`), respostas
resumidas abaixo por proposta; a autora fechou a rodada com "Todo o resto
foi aprovado, pode implementar", autorizando as 7 de uma vez (quebra do
padrão usual "1 fase por vez" desta feature, porque ela pediu
explicitamente).

**Prop 1+2 (áudio automático erra o idioma + rótulos fixos "no idioma
estudado"/"(tradução)", quer poder inverter):** grillado junto porque são
a mesma causa raiz -- o app sempre presumiu `front`=idioma estudado.
Decisão: campo novo `front_is_target_language` (boolean, default `true` --
zero regressão em cartão existente) em `teacher_flashcards` E
`student_flashcards` (migration `036_flashcard_direction_and_revision`,
aplicada AO VIVO via `mcp__Supabase__apply_migration`, projeto
`eigjocalzwamisgqilhg`). Decide (a) rótulo dos campos Frente/Verso na
tela de admin/Meus Cartões -- viraram "Frente"/"Verso" puros, sem
parênteses, porque agora dependem de um seletor visível ao lado ("Idioma
de cada lado"), não fixos; (b) qual lado recebe pronúncia automática
(TTS) no flip e no quiz de múltipla escolha.

**Achado arquitetural que restringiu o escopo, não presumido -- zh não
suporta inversão**: `fr` tem forma simétrica (`front`/`back_trans`, duas
strings soltas, qualquer uma pode ser o idioma estudado). `zh` é
ASSIMÉTRICO -- `front_pinyin`+`back_hanzi` são um par inseparável (hanzi
sempre mostrado junto do pinyin), `back_trans` é uma string solta sem
contraparte de pinyin. Não existe `back_pinyin` pra completar o par se a
direção invertesse. **Decisão: Prop 1+2 não se aplica ao zh** -- a coluna
`front_is_target_language` ainda é gravada nas linhas zh (consistência de
schema), mas `zh/app.js` NUNCA lê esse campo (sempre assume
`back_hanzi`=idioma estudado, mesmo comportamento hardcoded de sempre); o
seletor de direção fica genuinamente escondido na UI (admin e Meus
Cartões) sempre que a seleção envolve mandarim.

**Escopo da Prop 2 estendido pela autora no grilling** (Q2): eu recomendei
só o modo flip; ela pediu explicitamente que múltipla escolha TAMBÉM
tivesse seletor ("front em português pra tentar adivinhar a resposta
certa entre as opções em francês") -- implementado: quando invertido, a
pergunta do quiz mostra o texto NATIVO (`front`) e as opções (`back_trans`
+ `choices`) ficam no idioma estudado. **Sem áudio automático nenhum
quando invertido** (nem no front, nem em nenhuma opção) -- tocar a
pronúncia certa antes da aluna responder entregaria a resposta; decisão
minimalista, não inventei um botão de áudio por opção que não foi pedido.

**Prop 3 (mover "Meus Cartões" do menu do avatar pra dentro de
Revisão):** a autora relatou que ninguém clica no botão de perfil/avatar,
fica escondido demais. Grillado o local exato (Q5) -- ela pediu
explicitamente "um botão no topo dentro de Revisão, assim como
Badges/Notificações/Analytics dentro do Painel de Admin, ou Visão
Geral/Metas/Progresso no Perfil" (um pill de atalho, não um item de
sub-navegação). Implementado como `#review-my-flashcards-btn`
(`.leaderboard-tab`, reaproveitando a MESMA classe de pill já usada pra
essas sub-navegações -- zero CSS novo), logo abaixo do título "Revisão".
**Removido do dropdown do avatar** (Q6, override da minha recomendação de
manter os dois) -- ela pediu remoção explícita: "no momento eu quero até
remover esse menu do topbar já que ele já está na sidebar" (a parte da
sidebar não foi tocada nesta sessão -- fora do escopo desta proposta
específica, registrado só como contexto dela, não instrução de ação).

**Prop 4 (não dá pra editar/excluir cartão próprio, só arquivar --
autora quer editar de verdade E poder deletar):** a maior mudança
arquitetural das 7. Grilling em 3 perguntas (Q7-Q10):
- Q7 confirmou a leitura do bug: hoje só arquivar/reativar existe, sem
  editar/excluir, tanto pro cartão da PRÓPRIA aluna quanto pro cartão
  autorado pela professora.
- Q9 (quais campos editáveis + como avisar sobre reset de progresso): eu
  recomendei só texto (front/back/nota); ela pediu TODOS os campos
  editáveis (inclusive modo/mídia/direção), com um popup de confirmação
  EXATO: "Esta edição irá reiniciar o progresso de revisão deste cartão.
  Deseja continuar?" + botões "Sim"/"Descartar edições" -- texto
  implementado literal, novo `#flashcard-reset-confirm-modal`
  (compartilhado entre `admin-flashcards.js` e `my-flashcards.js`, mesmo
  padrão HTML/JS de todo modal do app).
- Q10 (arquivar não resolve o caso "adicionei um cartão errado por
  engano e só percebi depois" -- ela quer DELETE de verdade, mesmo com
  histórico de revisão): autorizado explicitamente perder o histórico
  FSRS nesse caso -- e ela mesma sugeriu, se fosse mais simples pro
  código, que EDITAR também resetasse o progresso (não só criar um
  "editar sem resetar" complexo).

**Mecanismo escolhido pra "editar reseta progresso" -- reaproveita
infraestrutura já existente, não inventa um reset novo**: coluna
`revision integer not null default 0` (mesma migration `036`) em
`teacher_flashcards`/`student_flashcards`. `flashcardIdForRow(prefix,
row)` (novo, fr+zh `app.js`) -- `row.revision > 0 ? '${prefix}${row.id}
-r${row.revision}' : '${prefix}${row.id}'`. Ou seja, o id do card SÓ MUDA
na primeira edição -- antes disso, comportamento idêntico a sempre (zero
regressão pra cartão nunca editado). Quando editado, o id novo não bate
com nenhum id salvo no `STATE` serializado, e o mecanismo de merge-por-id
de `applySerializedState()` (documentado desde a Fase 0 desta feature
inteira -- "cartão salvo sem correspondência na lista fresca é descartado
em silêncio") já faz o reset sozinho, sem nenhum código de "resetar
progresso" novo. `card.rowId` (novo campo) guarda o id numérico puro (sem
sufixo de revisão) pra `updateSelfFlashcardStatusInState`/
`removeSelfFlashcardFromState` conseguirem casar o cartão certo mesmo
depois de já ter sido editado uma vez.

**DELETE físico de verdade** -- `deleteFlashcardPermanently`
(`shared/teacher-flashcards.js`) e `deleteOwnFlashcardPermanently`
(`shared/student-flashcards.js`), botão 🗑 com `confirm()` nativo
("Isso vai apagar o cartão e todo o histórico de revisão permanentemente.
Não pode ser desfeito. Continuar?") nas duas telas (admin e Meus
Cartões). `removeSelfFlashcardFromState()` (novo) tira o cartão do
`STATE.cards` já carregado na MESMA sessão, mesmo motivo de sempre
(sem isso, o cartão só sumiria da fila no próximo boot).

**Prop 5 (remover "Filtro de fila", mover "Origem" pro topo da lista de
ajustes):** implementado como pedido -- `<select id="review-filter-
select">` removido inteiro do painel "⚙️ Configurar sessão" (fr+zh
`index.html`), bloco `#review-origin-select-wrap` movido pra ser o
PRIMEIRO filho do painel (antes de Frequência/Novas palavras/
Intensidade). **Autocorreção registrada durante a implementação, não
depois**: eu disse a ela no grilling (Q11) que o comportamento padrão
pós-remoção seria `'all'` (mostrar tudo). Ao implementar, percebi que
`'all'` IGNORA completamente "Intensidade da sessão" (não passa `limit`
pro `getStudyQueue()`), o que tornaria esse controle -- que continua
visível na tela -- um no-op silencioso pra sempre. Corrigi pra
hardcodar `'oldest'` em vez de `'all'` (`reviewFilterQueue()`,
`buildSpeedQueue()`, `startReviewSession()`, fr+zh `app.js`) -- é o
único dos 3 valores antigos do filtro que ainda respeita Intensidade,
e era o padrão real que a maioria das contas já usava de qualquer jeito.
**Registrando aqui explicitamente porque diverge do que falei pra ela
durante o grilling** -- 'oldest' (mais antigas primeiro) no lugar de
'all' (tudo, sem ordenação por intensidade).

**Prop 6 (exportar/importar cartões PRÓPRIOS entre alunos):** Q13
perguntou o mecanismo -- ela pediu OS DOIS ("pode ser um arquivo .json se
for mais fácil, mas gosto de ter um link de compartilhamento também"), não
só um. Implementado em `shared/my-flashcards.js`:
`myFlashcardsExportPayload(cards)` monta `{languageAppKey, cards:
[{front, frontPinyin, backTrans, note, frontIsTargetLanguage}, ...]}` --
nunca ids/timestamps/status (toda importação sempre cria linhas NOVAS na
conta de quem importa, nunca tenta sincronizar/sobrescrever). Modal de
exportação com 2 botões: "⬇️ Baixar .json" (`Blob`+`URL.createObjectURL`)
e "🔗 Copiar link" (mesmo payload em base64 no fragmento da URL,
`#import=...`, sem backend novo nenhum). Importação por 2 caminhos:
upload de arquivo (`<input type="file">`) OU auto-detecção do parâmetro
`#import=` na URL ao carregar a tela (`maybeAutoImportFromUrl()`) -- os
dois passam por `confirmAndImportMyFlashcards()`, que sempre pede
confirmação com a contagem ("Importar N cartão(ões) pra sua conta?") e
**rejeita explicitamente se `languageAppKey` do payload não bater com o
idioma do site atual** (`APP_KEY`) -- um cartão de mandarim não pode
entrar numa conta de francês e vice-versa, mensagem de erro clara em vez
de falha silenciosa.

**Prop 7 (não dá pra apertar Enter/quebrar linha num campo de
flashcard):** causa raiz óbvia -- Frente/Verso/Nota eram `<input
type="text">` (single-line por definição do próprio elemento HTML), não
`<textarea>`. Trocados pra `<textarea class="profile-edit-input
profile-edit-textarea" rows="2">` nos 2 formulários (admin e Meus
Cartões, criação E edição) -- `.profile-edit-input, .profile-edit-
textarea{...}` já era um seletor combinado no CSS (herda border/padding/
resize/min-height sem precisar de nenhuma regra nova).

**Achado incidental durante a investigação de Prop 7, confirmado com a
autora antes de corrigir (Q15, "confirmado")**: `card.front`/
`card.back_trans` (fr) e `card.back_hanzi`/`card.front_pinyin`/
`card.back_trans`/`card.clozeAnswerPinyin` (zh) eram interpolados SEM
`escapeHTML()` no render de flip e múltipla escolha -- um cartão com
`<img src=x onerror=...>` no front executaria HTML/JS arbitrário na tela
de revisão de QUALQUER aluno que revisasse aquele cartão (o professor
autora do cartão já é uma conta confiável hoje, mas o princípio de nunca
confiar em texto solto interpolado direto continua valendo, e cartões
PRÓPRIOS -- Fase 5 -- são autorados pela própria aluna sem revisão
nenhuma). Corrigido (`escapeHTML()` adicionado nos 2 pontos, fr+zh)
**deliberadamente NÃO estendido a `card.clozeSentence`** -- essa
interpolação já é antiga (pré-existente a esta sessão), fora do escopo
literal da Prop 7, e estruturalmente entrelaçada com HTML injetado pro
blank (`blankHTML`) -- um fix ingênuo ali arriscaria quebrar o
comportamento intencional em vez de só fechar um buraco de segurança;
registrado aqui como candidato pra uma sessão futura tratar isoladamente,
não esquecido.

**Bug real encontrado e corrigido durante a implementação, fora do que
foi pedido (auto-detectado, não reportado pela autora)**:
`MY_FLASHCARDS_STATE.editingCardId` (`shared/my-flashcards.js`) era
atribuído direto de `btn.dataset.editOwnFlashcard` (sempre STRING, por
natureza de todo `dataset`), mas comparado com `===` contra `c.id` (
SEMPRE NÚMERO, como o Supabase devolve uma coluna inteira) em 2 pontos
(`myFlashcardRowHTML()`/`renderMyFlashcardsView()`) -- comparação
`"1006" === 1006` é sempre `false` em JS, então o formulário de edição da
própria aluna NUNCA teria aparecido em produção (o botão ✏️ pareceria
simplesmente não fazer nada). `shared/admin-flashcards.js` já fazia
`Number(btn.dataset.editFlashcard)` corretamente desde que essa tela foi
escrita -- o mesmo padrão não tinha sido replicado no arquivo irmão.
Corrigido com `Number(...)` no ponto de atribuição, mesmo padrão do
arquivo admin. Achado via teste automatizado (Playwright com mock que
clona objetos por chamada, não compartilha referência -- ver "Testes
realizados" abaixo), não por inspeção visual.

**Segundo bug de robustez encontrado e corrigido, também via teste
automatizado**: `wireMyFlashcardEditForm()` computava `(c.revision ||
0) + 1` em DUAS expressões separadas (uma pro payload de
`updateOwnFlashcardContent`, outra pro payload de
`replaceSelfFlashcardInState`) -- funcionalmente correto em produção
(supabase-js real nunca muta o objeto JS local que foi lido antes),
mas frágil por definição: duas leituras separadas da mesma derivação,
sem garantia estrutural de que `c.revision` não muda entre elas.
Corrigido pra computar `nextRevision` UMA vez e reaproveitar nos dois
lugares -- mesmo princípio de `note`/`frontPinyinValue` (lidos do DOM
uma vez só, não relidos depois do `await`).

**Decisões arquiteturais desta sessão:**
1. `front_is_target_language`/`revision` são colunas genuinamente
   aditivas com default seguro -- nenhuma migração de dado, cartão já
   existente continua se comportando exatamente como antes (front=idioma
   estudado, id sem sufixo de revisão) até que alguém explicitamente
   inverta a direção ou edite o cartão pela primeira vez.
2. `flashcardIdForRow()` é a ÚNICA função que decide o id de um cartão de
   professora/aluna em todo o app -- reaproveitada nos 4 pontos que antes
   construíam a string manualmente (`buildCardFromTeacherFlashcard`,
   `buildCardFromSelfFlashcard`, `mergeTeacherFlashcardsIntoState`,
   `mergeSelfFlashcardsIntoState`, `addSelfFlashcardToState`) -- nunca
   duas fontes de verdade pro mesmo cálculo.
3. Direção (Prop 1+2) e formato de conteúdo (Fase 8a: imagem/áudio/MC/
   cloze) são eixos ORTOGONAIS -- um cartão cloze não tem seletor de
   direção (não existe noção de "frente"/"verso" numa lacuna), mas
   imagem/áudio continuam livres de combinar com qualquer coisa, mesmo
   comportamento de antes desta sessão.
4. `student_flashcards` (Fase 5) e `teacher_flashcards` (Fase 2+) ganharam
   as 7 propostas EM PARALELO, não uma de cada vez -- diferente do padrão
   normal desta feature (uma tabela por vez), porque as propostas da
   autora vieram sobre as duas telas juntas (ela usa as duas) e a maioria
   do código (validação, revisão, direção) já era espelhado entre elas
   desde antes.

**Gratuito x Premium (avaliado, não implementado):** nenhuma proposta
desta rodada muda o cálculo já registrado nas fases anteriores -- edição/
exclusão/direção são melhorias de UX sobre conteúdo que já existe (sem
custo marginal novo de servir); export/import é puramente client-side
(sem novo dado no servidor, só reorganiza o que já está lá). Mesma
pergunta em aberto já registrada repetidamente (limite por professora
quando houver mais de uma na plataforma) continua válida, sem mudança.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/student-flashcards.js`,
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, `fr/app.js`,
`zh/app.js`. Validação funcional via Playwright (fr+zh), mock
propositalmente mais rigoroso que o de fases anteriores -- linhas
retornadas por `select()` são CLONADAS (`{...r}`), não a mesma referência
do array interno do banco fake, replicando o comportamento real do
supabase-js (foi exatamente essa mudança no mock que expôs o bug de
dupla-leitura de `c.revision` acima, que um mock com referência
compartilhada mascarava). Cenários cobertos: (1) seletor de direção
visível só quando não-mandarim e não-cloze, escondido corretamente pro
zh e pro modo cloze; (2) rótulos "Frente"/"Verso" sem parênteses fixos;
(3) criação com direção invertida grava `front_is_target_language:false`
de verdade no banco; (4) lista de cartões do admin escapa HTML
corretamente (`<img src=x onerror=...>` nunca aparece cru no DOM); (5)
fluxo de edição -- modal de confirmação aparece, clicar "Sim" salva e
incrementa `revision` pra 1; (6) delete físico remove a linha do banco de
verdade; (7) lado da aluna -- seletor de direção presente em fr/ausente
em zh, criação com quebra de linha preservada, edição com o MESMO fluxo
de confirmação + `STATE.cards` refletindo o novo id com sufixo `-r1`
IMEDIATAMENTE (sem esperar reload), delete removendo de `STATE.cards`
também; (8) export/import roundtrip -- payload exportado de N cartões
importa de volta N cartões novos; import com `languageAppKey` errado
rejeitado sem gravar nada; (9) painel "⚙️ Configurar sessão" -- confirmado
sem `#review-filter-select`, botão "📇 Meus Cartões" presente dentro de
Revisão e AUSENTE do dropdown do avatar, clique navega pra "Meus
Cartões" de verdade. Validação adicional isolada da tela de Revisão
(cartão semeado direto em `STATE.cards`, sem passar pelo formulário):
modo flip invertido mostra o texto-alvo (`la bibliothèque`) com botão de
áudio e o texto nativo (`a biblioteca`) sem áudio, sem nenhuma chamada de
`speakFrench()` automática; modo múltipla escolha invertido mostra a
PERGUNTA em português (`a biblioteca`), SEM botão de áudio ao lado dela,
opções embaralhadas no idioma estudado incluindo a resposta certa, sem
nenhuma chamada de TTS automática (confirmando que a resposta nunca
vaza por áudio antes da aluna responder). Validação visual (screenshot
Playwright, fr, claro) do formulário de admin com o seletor de direção +
textareas + rótulos corrigidos -- layout limpo, sem quebra visual; zero
CSS novo introduzido nesta sessão inteira (radio group/textarea/pill
reaproveitam classes já calibradas em fases anteriores), então o risco de
regressão de contraste tema escuro é baixo, mas não foi comparado
lado-a-lado explicitamente nos 4 cenários (claro/escuro x fr/zh) desta
vez -- registrando por completude, mesmo padrão de honestidade já usado
quando outras entregas validaram só um subconjunto.

**O que ainda falta / não foi feito nesta rodada (de propósito):**
- `card.clozeSentence` continua sem `escapeHTML()` -- achado registrado
  acima, fora do escopo literal da Prop 7, candidato pra sessão futura.
- Nenhuma migração de dado pros cartões já existentes -- todos continuam
  com `front_is_target_language=true`/`revision=0` (comportamento
  idêntico a antes desta sessão).
- Export/import (Prop 6) é só pra `student_flashcards` (Meus Cartões) --
  não existe um export equivalente pro lado da professora
  (`teacher_flashcards`), não foi pedido.
- Nenhuma validação de tema escuro lado-a-lado nos 4 cenários
  obrigatórios (fr/zh x claro/escuro) -- risco considerado baixo (zero
  CSS novo), mas não confirmado visualmente desta vez.

Nenhuma migração pendente de passo manual -- a `036_flashcard_direction_
and_revision.sql` foi aplicada ao vivo nesta sessão via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg`.

## Prompt-mestre "perfil público / flashcards públicos" -- Fase 1 (identidade + progresso por idioma, sem lista de cartões ainda)

Pedido original da autora, verbatim: "Opção de tornar os flashcards
criados por você públicos ou privados no seu perfil. Quando forem
públicos, as pessoas podem adicionar os flashcards que você criou na
conta/deck delas. (privados por default) Como alguém pode entrar no seu
perfil? Clicando no seu nome no ranking. Verificar como haver no site um
/user/username para que as pessoas possam compartilhar seus perfis e,
consequentemente, disponibilizar seus flashcards. Uma espécie de 'quero
compartilhar meus flashcards com você, entre aqui no meu perfil e
adicione nos seus: Link do perfil'" -- pedido explicitamente pra "fazer
um grilling dessas propostas" antes de codar, mesma disciplina de toda
esta feature/repositório.

**Grilling completo, 2 rodadas (12 perguntas), cada uma precedida de
investigação real no código -- nunca perguntado o que já dava pra
responder lendo o repositório.** Achados relevantes ANTES de perguntar:

- `/user/username` como PATH de servidor é literalmente impossível neste
  site (GitHub Pages estático, sem rewrite) -- a única forma real é
  hash-based, `fr/#/user/username`, mesmo padrão já usado por toda a
  navegação interna (`shared/router.js`). Confirmado com a autora e
  aprovado (Q2).
- **Achado que reduziu MUITO o escopo real desta fase**: `profiles` já
  tem `profiles_public_read` (`to anon, authenticated using (true)`)
  desde a migration 001 -- ou seja, nome/@usuário/bio/avatar JÁ eram
  publicamente legíveis, inclusive sem login, desde o início do projeto
  (o comentário da própria migration 001 já antecipava essa feature
  futura). O mesmo vale pra `badge_grants`/`badge_catalog`/`earned_badges`
  (migrations 002/003/017). O modal de perfil público que abre ao clicar
  num nome no Ranking (Rank1-4, já existia) já mostrava tudo isso pra
  QUALQUER linha do ranking, sem checar nada. Ou seja: identidade e
  badges não precisavam de NENHUMA peça de segurança nova -- só
  progresso/XP/streak (que vive em `progress`, RLS owner-only) exigia
  algo novo.
- `STATE.xp`/`STATE.streak`/`STATE.lastStudyDay` são escopados POR SITE
  (cada idioma lê/grava seu próprio namespace em `progress.data[langKey]`)
  -- nunca somados entre francês e mandarim. Isso mudou o desenho final
  do perfil público: um card POR IDIOMA (com sua própria barra/XP/streak),
  nunca um número único combinado.

**Perguntas e respostas do grilling (resumo -- as 12 completas, com a
recomendação numerada de cada uma, estão no histórico desta sessão):**
1. Interruptor de privacidade: **conta inteira** (`profiles.public_profile`,
   default `false` -- privado por padrão) + **cada cartão próprio** ganha
   um botão de esconder individual, no lugar onde já fica o botão de
   Arquivar. Cascata: conta privada = todo cartão implicitamente escondido;
   conta pública = todo cartão público, EXCETO os marcados
   individualmente como escondidos. Nunca o contrário.
2. Conteúdo do perfil público: foto, nome, conquistas (já existia via
   Rank1-4) + **XP ACUMULADO** (trocado de "XP da semana", que já dá pra
   ver no Ranking) + **progresso e streak por idioma** (novo).
3. Ver/adicionar cartões de alguém exige login -- "Faça o login pra ver
   os cartões e adicionar ao seu perfil" com fundo embaçado. **Não
   implementado nesta fase** (ver "O que fica pra Fase 2" abaixo).
4. Reaproveitar o mesmo modal/página do perfil público com um botão "Ver
   cartões criados pelo usuário", multi-select com Selecionar
   todos/Limpar seleção pra importar. **Não implementado nesta fase**
   (mesma razão do item 3).
5. Popup de limite ao tentar importar acima do teto do plano grátis, com
   link pra uma pág de upgrade (Stripe/pagamento) que ainda não existe --
   "vamos adicionar isso agora após essa tarefa". **Fica pra uma Fase 3
   futura, explicitamente fora desta entrega** -- não presumir que
   infraestrutura de pagamento existe (ver seção "Considerar plano
   gratuito x premium" no topo deste arquivo).
6. Botão de reportar problema no perfil público de alguém: aprovado,
   **não implementado nesta fase** (cai na mesma Fase 2 da lista de
   cartões, já que reportar é sobre um cartão específico da lista).
7. Cartão importado guarda só uma REFERÊNCIA-cópia -- editar o cartão
   original depois de já ter sido importado NÃO altera a cópia já salva
   na conta de quem importou (vira, na prática, um cartão novo e
   independente a partir da importação). Decisão de design confirmada,
   implementação fica pra Fase 2.
8. XP/streak no perfil público: **por idioma**, nunca somado -- confirma
   o achado técnico acima.
9. Card de idioma só aparece se `pct > 0` -- "se a pessoa só estuda
   francês, mostrar só a barra de francês". Confirmado explicitamente
   depois que eu sinalizei a diferença entre isso e o layout ATUAL do
   perfil privado (que separa streak+XP combinados de uma lista de barras
   por idioma) -- a autora aprovou o design novo e mais coerente ("esconda
   o XP e streak de idiomas com progresso zero; se houver progresso, esse
   idioma ganha seu cartão com barra + XP + streak").
10-12. Detalhes de UI adicionais do botão "ver cartão como se fosse
   editar, sem poder editar" (Q11) -- fica pra Fase 2 (é sobre a LISTA de
   cartões, não implementada ainda).

**Fatiamento em 3 fases proposto e autorizado ("Pode seguir para a fase
1")**: Fase 1 = modelo de dados + identidade/progresso público (esta
entrega). Fase 2 = lista de cartões + importação + gate de login + popup
de reportar. Fase 3 = integração com pagamento/Stripe quando essa
infraestrutura existir. Mesmo padrão de fatiamento por autorização
explícita já usado em toda a feature de alunas particulares.

**O que foi feito (Fase 1):**

- **Migration `037_public_profile.sql`** -- `profiles.public_profile
  boolean not null default false` (interruptor mestre, grillado como
  privado por padrão) + `student_flashcards.hidden_from_profile boolean
  not null default false` (exceção por cartão, só tem efeito quando a
  conta já é pública) + function `get_public_profile_stats(p_username)`
  SECURITY DEFINER, mesmo padrão de `get_teacher_student_metrics`
  (migration 029, Fase 6a da feature de alunas particulares): checa
  `public_profile=true` ELA MESMA antes de tocar em qualquer dado,
  devolve só agregados (`pct`/`levelLabel`/`xp`/`streak`/`lastStudyDay`
  por idioma, nunca resposta/histórico granular), só inclui um idioma se
  `pct>0`. Reaproveita o campo `progressSummary` que `serializeState()`
  já grava em todo save (não recalcula % em SQL). **Diferença chave em
  relação a `get_teacher_student_metrics`**: esta é a única function
  SECURITY DEFINER da plataforma concedida também a `anon` (`grant
  execute ... to anon, authenticated`) -- precisa funcionar SEM login,
  já que a página em si funciona sem login (ver abaixo). RLS de
  `progress` continua sem nenhuma policy nova. Aplicada AO VIVO nesta
  sessão via `mcp__Supabase__apply_migration`, projeto
  `eigjocalzwamisgqilhg` -- não é passo manual pendente pra autora.
- **`shared/srs.js`** -- `effectiveStreak()` refatorado em
  `effectiveStreakFor(streak, lastStudyDay)` (mesma regra de "streak
  vivo" -- hoje ou ontem = vivo, senão 0 -- já usada pro streak da
  própria conta desde o bugfix registrado na seção "Streak (🔥)...
  ficava CONGELADO" acima) + `effectiveStreak()` que chama a nova função
  com `STATE.streak/STATE.lastStudyDay`. Reaproveitada agora também pro
  streak de OUTRA conta (par bruto devolvido pela RPC) -- nunca duplicar
  a mesma data-math em dois lugares.
- **`shared/public-profile.js`** (novo) -- `fetchPublicProfileByUsername(username)`
  (busca `profiles` + badges de identidade/gameplay via as funções já
  existentes em `shared/leaderboard.js`/`shared/profile.js` + a RPC de
  stats), `renderPublicProfileInto(bodyEl, username)` (container-agnóstico
  -- preenche TANTO o modal (`#public-profile-modal-body`) QUANTO a
  página standalone (`#public-profile-page-body`), nunca duas
  implementações de render), `openPublicProfileModalForUsername(username)`
  (usada de dentro do app, logada ou convidada) e
  `renderStandalonePublicProfile(username)` (usada quando NÃO há sessão
  nem modo convidado). `publicProfileUsernameFromHash()` extrai o
  username de `#/user/<username>`. Token de corrida por container
  (`WeakMap`, um por `bodyEl`) -- clicar rápido em 2 nomes diferentes no
  Ranking não deixa a resposta do primeiro sobrescrever o conteúdo do
  segundo.
- **`shared/auth.js`** -- `initAuth()` ganhou um desvio, só no ramo "sem
  sessão E sem modo convidado": se o hash bate `#/user/username`, chama
  `renderStandalonePublicProfile()` em vez de `goToNeutralGate()`.
  Primeira vez que qualquer tela deste app precisa funcionar pra um
  visitante totalmente anônimo (sem conta, sem modo convidado) -- link de
  perfil compartilhado por outra pessoa. Qualquer outra rota interna
  continua exigindo login/convidado como sempre.
- **`shared/router.js`** -- rota nova `{type:'publicProfile', username}`
  (`#/user/<username>` ↔ hash), mesma estrutura de `unit`/`unitResult` já
  existentes. `renderRoute()` chama `openPublicProfilePage(username)`
  (shared/public-profile.js) -- que hoje só abre o MESMO modal do Ranking
  por cima do que já estava na tela (nunca troca de aba por baixo), pra
  um F5 em cima de `#/user/x` com sessão ativa restaurar corretamente.
- **`fr/index.html`+`zh/index.html`** -- `#public-profile-standalone`
  (novo, FORA de `#app`, ao lado de `#login-screen`) com
  `#public-profile-page-body` + um rodapé "Criar minha conta →". CSS
  novo: `.public-profile-lang-card`/`.public-profile-lang-stats` (card
  por idioma, estende `.profile-lang-card`/etc. já existentes com
  XP+streak embutidos) e `.public-profile-page`/`.public-profile-page-inner`/
  `.public-profile-page-footer` (moldura da página standalone) --
  zero token de cor novo, só `var(--paper)`/`var(--paper-warm)`/
  `var(--paper-line)`/`var(--ink-soft)`/`var(--seal-red-dark)`/
  `var(--shadow-lift)`/`var(--radius)` já calibrados. Script tag de
  `shared/public-profile.js` adicionado logo depois de
  `shared/leaderboard.js` (de quem depende) e antes de `shared/auth.js`
  (que o chama).
- **`shared/leaderboard.js`** -- o modal antigo (`openPublicProfileModal(row,
  catalog)`, mostrava posição+XP da semana do Ranking) foi REMOVIDO --
  substituído por uma chamada a `openPublicProfileModalForUsername(username)`
  no clique da linha (agora com identidade+badges+progresso/XP
  acumulado/streak por idioma, conforme Q2 do grilling). `PUBLIC_PROFILE_MODAL_TOKEN`
  (guard de corrida antigo) também removido -- o guard equivalente agora
  vive dentro de `renderPublicProfileInto` (WeakMap por container, ver
  acima).
- **`shared/profile.js`** -- `saveProfileEdits()` ganhou o parâmetro
  `publicProfile`, gravado como `profiles.public_profile`.
  `openEditProfileModal()` inicializa um novo `.pref-switch` ("Perfil
  público", mesma classe já usada por Modo escuro/Cloze/Som -- zero CSS
  novo) a partir de `p?.public_profile`. O switch só ALTERA visualmente
  (`aria-checked`) no clique -- só é lido e persistido junto com nome/
  username/bio no Salvar do formulário, mesmo padrão dos outros campos
  deste modal (diferente de Modo escuro/Admin Mode, que salvam na hora,
  fora de um form).
- **`shared/student-flashcards.js`** -- `setOwnFlashcardHidden(id, hidden)`
  (novo), grava `student_flashcards.hidden_from_profile`. Eixo
  DELIBERADAMENTE separado de `status` (active/archived, que decide fila
  de revisão) -- um cartão pode estar ativo na revisão mas escondido do
  perfil, ou arquivado mas ainda visível no perfil, os dois nunca se
  misturam.
- **`shared/my-flashcards.js`** -- botão de olho (👁️ visível / 🙈
  escondido) adicionado na linha de cada cartão, **ao lado do botão de
  Arquivar** (posição pedida explicitamente no grilling Q1, não em cima
  dele). Nenhuma atualização em `STATE.cards` precisa acontecer ao
  clicar -- diferente de arquivar/apagar/criar (que afetam a fila de
  revisão via `addSelfFlashcardToState`/etc.), esconder do perfil não
  toca em FSRS/revisão de forma alguma, só no dado que
  `renderPublicProfileInto` vai ler quando a Fase 2 existir.

**Decisões arquiteturais desta fase:**
1. Identidade (nome/@usuário/bio/avatar) e badges continuam SEMPRE
   públicos pra qualquer username existente, independente de
   `public_profile` -- não é uma peça nova desta fase, é um fato do RLS
   desde o dia 1 (ver achado acima), só agora reaproveitado numa tela
   nova. Só progresso/XP/streak fica atrás do interruptor.
2. `get_public_profile_stats` é a ÚNICA porta de leitura de `progress`
   pra outra conta -- nenhuma RLS policy declarativa nova na tabela (ela
   continua absolutamente owner-only), mesmo princípio já validado na
   Fase 6a da feature de alunas particulares.
3. O modal do Ranking (Rank1-4) e a página standalone (`#/user/username`
   sem sessão) renderizam o MESMO conteúdo através da MESMA função
   (`renderPublicProfileInto`) -- nunca duas implementações divergentes
   do "perfil público" dentro do mesmo app.
4. `hidden_from_profile` é um eixo NOVO e INDEPENDENTE de `status`
   (Fase 2/3/5 do sistema de alunas particulares) -- reforça o padrão já
   estabelecido nesta feature inteira de nunca misturar dois conceitos
   diferentes numa coluna só.

**Gratuito x Premium (avaliado, não implementado):** a pergunta mais
concreta já registrada é a do próprio grilling (item 5 acima) -- teto de
importação de cartões alheios acima de um limite do plano grátis, com
link pra uma futura página de upgrade/Stripe. **Não implementado nesta
fase** de propósito -- não existe infraestrutura de pagamento nenhuma no
código ainda (mesma regra do topo deste arquivo), e a própria lista de
cartões pra importar (onde esse limite se aplicaria) é Fase 2, não Fase
1. A visibilidade do perfil em si (público/privado) não tem nenhuma razão
pra virar premium -- é controle de privacidade, não uma feature paga.

**Testes realizados:** `node --check` sem erro em todos os arquivos
tocados (`shared/srs.js`, `shared/public-profile.js`, `shared/router.js`,
`shared/auth.js`, `shared/leaderboard.js`, `shared/profile.js`,
`shared/my-flashcards.js`, `shared/student-flashcards.js`). Validação
funcional via Playwright (fr+zh), stub de `window.supabase.createClient()`
mesmo padrão de toda a feature: (1) **visitante anônimo, perfil público
com progresso** -- `#public-profile-standalone` visível,
`#login-screen` escondido, nome/@usuário renderizados, card de francês
com `A1 · 42%`/`🔥 3`/`120` XP batendo com o mock; (2) **visitante
anônimo, perfil PRIVADO** -- mensagem "optou por manter o progresso
privado" mostrada, ZERO card de idioma renderizado, e confirmado que o
XP/streak reais daquela conta (999/99, propositalmente distintos no
mock) NUNCA aparecem em lugar nenhum do DOM -- a barreira de segurança
é real, não só teórica; (3) **username inexistente** -- "Perfil não
encontrado"; (4) mesmo cenário (1) validado em zh também; (5) **logada,
clique equivalente ao do Ranking** -- `openPublicProfileModalForUsername()`
abre o modal com o mesmo conteúdo (identidade+progresso), fecha
corretamente; (6) **toggle "Perfil público" no Editar Perfil** -- estado
inicial `false`, clique muda visualmente pra `true`, salvar grava
`public_profile:true` de verdade no banco fake, reabrir o modal confirma
o estado persistido (leu de `PROFILE_CACHE` atualizado); (7) **botão de
olho em Meus Cartões** -- ícone inicial 👁️, clique grava
`hidden_from_profile:true` no banco e troca o ícone pra 🙈, clique de
novo reverte os dois. Sem erro de console novo atribuível a este código
(mesmo `pageerror` de `.is()` já registrado repetidas vezes nesta feature
como limitação de mock em chamadas de fundo não relacionadas --
notificações --, não deste código). Validação visual (screenshot
Playwright, claro+escuro) da página standalone confirma legibilidade nos
dois temas -- esperado, zero cor nova introduzida, só tokens já
calibrados.

**O que ainda falta / não foi feito nesta fase (de propósito, é Fase 2
ou 3):**
- **Fase 2 inteira**: lista de cartões públicos de alguém, gate de login
  pra ver/importar (fundo embaçado + "Faça login pra ver os cartões"),
  multi-select com Selecionar todos/Limpar seleção pra importar, botão
  de reportar um cartão específico, botão "ver como se fosse editar,
  sem poder editar". `hidden_from_profile` já existe no schema e já tem
  UI pra marcar (esta fase), mas nada ainda LÊ esse campo pra filtrar
  uma lista -- porque a lista em si não existe ainda.
- **Fase 3**: popup de limite de importação + link de upgrade/Stripe --
  não existe conceito de plano pago no código ainda, nem faria sentido
  antes da Fase 2 existir (não há o que importar em excesso sem a lista).
- Nenhuma mudança em `STATE.cards`/FSRS/fila de revisão -- confirmado
  intacto, esta fase inteira é sobre identidade/visibilidade, não
  conteúdo de estudo.

Nenhum passo manual pendente pra autora nesta entrega -- as duas
migrations desta sessão (`036` reconstruída/salva no repo, `037` nova)
já foram aplicadas ao vivo via `mcp__Supabase__apply_migration`.

Próxima fase (2 -- lista de cartões + importação) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para
a próxima fase".**

## Fase 2 (lista de flashcards públicos + importação, gate de login, preview, report)

Cobre os itens explicitamente adiados na Fase 1: lista de cartões
PRÓPRIOS (`student_flashcards`, `origin:'self'`) de um perfil público,
atrás de um gate de login (Q3), multi-select com Selecionar todos/Limpar
seleção (Q4), importação como cópia independente (Q7), botão de
pré-visualizar sem editar (Q11) e botão de reportar (Q6). Fase 3 (popup
de limite com link de upgrade/Stripe) continua fora do escopo -- sem
infraestrutura de pagamento no código ainda.

**O que foi feito:**

- **Migration `038_public_profile_flashcards.sql`** -- function
  `get_public_flashcards(p_username, p_language_app_key)`, mesmo padrão
  SECURITY DEFINER de `get_public_profile_stats` (Fase 1)/
  `get_teacher_student_metrics` (Fase 6a da feature de alunas
  particulares): checa `public_profile=true` ela mesma antes de tocar em
  qualquer linha, devolve só os campos necessários pra exibir/importar um
  cartão (`front`/`frontPinyin`/`backTrans`/`note`/
  `frontIsTargetLanguage`), nunca a linha inteira. Filtra
  `status='active'` e `hidden_from_profile=false` (cascata da Fase 1: só
  o que a própria dona não escondeu individualmente) e por
  `language_app_key` -- um visitante em `fr/#/user/x` só pode ver/
  importar cartões de francês daquela pessoa, nunca os de mandarim que
  ela possa ter em outra conta/site (mesma regra que a importação manual
  via arquivo/link, Prop 6 do prompt-mestre "7 propostas", já aplicava).
  Concedida a `anon` também (mesmo motivo da 037 -- a página standalone
  chama o mesmo código, mesmo que na prática o cliente só invoque isto
  depois de confirmar login). RLS de `student_flashcards` continua
  intocada (owner-only, migration 028). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/public-profile.js`** estendido -- `renderPublicProfileInto()`
  ganhou uma seção "Flashcards" (só quando `isPublic===true`, mesmo
  raciocínio da seção de Progresso: conta privada esconde tudo, não só
  as estatísticas) com um botão "📇 Ver cartões criados por @username"
  que expande uma caixa carregada sob demanda (busca só na primeira
  abertura, mesmo padrão de custo de rede já usado no painel de métricas
  da Fase 6a).
  - **Gate de login (Q3)**: `!CURRENT_USER` cobre os 3 estados possíveis
    dessa variável (`null` na página standalone, `false` em modo
    convidado, objeto quando logada de verdade) com uma única checagem --
    tanto visitante anônimo quanto convidado caem no gate, porque nenhum
    dos dois tem uma conta real em que gravar a cópia importada. Mostra
    linhas fictícias borradas (`filter:blur`) atrás de um cartão
    centralizado "🔒 Faça login para ver os cartões e adicionar ao seu
    perfil" + link `../` (mesmo link já usado no rodapé "Criar minha
    conta" da Fase 1). **Nenhuma chamada de rede acontece nesse caminho**
    -- a checagem é 100% client-side, antes de `fetchPublicFlashcardsByUsername`
    ser sequer chamada (confirmado no teste: `get_public_flashcards`
    nunca aparece nas chamadas de RPC quando o gate está ativo).
  - **Multi-select (Q4)**: reaproveita 100% o par
    `.admin-recipients-summary`/`.admin-recipients-actions`/
    `.admin-select-link` já calibrado em `shared/admin-flashcards.js`
    (Fase 3 do prompt-mestre "reestruturação do formulário de
    flashcards") -- zero CSS novo pro toolbar. Contador
    ("Nenhum cartão selecionado"/"N cartão(ões) selecionado(s)"),
    "Selecionar todos"/"Limpar seleção", botão de importar desabilitado
    com 0 selecionados.
  - **Importação (Q7)**: `importSelectedPublicFlashcards()` chama
    `createOwnFlashcard()` (já existente desde a Fase 5 do sistema de
    alunas particulares) uma vez por cartão selecionado -- sempre cria
    uma linha NOVA e independente na conta de quem importa, nunca uma
    referência viva ao cartão original (confirmado no grilling: editar o
    original depois não altera a cópia). `addSelfFlashcardToState()`
    chamado a cada sucesso, mesmo motivo de sempre -- sem isso o cartão
    só entraria na fila de revisão no próximo carregamento do app, não
    nesta mesma sessão.
  - **Teto de 20 cartões (Fase 5.1) respeitado na importação** -- decisão
    minha, não pedida explicitamente no grilling da Fase 1 (que só falou
    do popup de upgrade, adiado pra Fase 3), mas necessária por
    coerência: importar é só mais uma forma de CRIAR um cartão próprio,
    então precisa respeitar o MESMO limite que criar manualmente em
    "Meus Cartões" já respeita (`FREE_OWN_FLASHCARD_LIMIT`/
    `hasActiveTeacherLink()`, ambos reaproveitados sem nenhuma mudança).
    Se a seleção excede o espaço restante, a importação inteira é
    bloqueada ANTES de criar qualquer cartão (nunca uma importação
    parcial) e reabre o MESMO popup `#flashcard-limit-modal` já usado em
    Meus Cartões -- nenhum popup novo, nenhuma menção a upgrade/Stripe
    (esse texto mais rico fica pra Fase 3, quando essa infraestrutura
    existir).
  - **Preview sem editar (Q11)**: `openPublicFlashcardPreview()`, modal
    novo (`#public-flashcard-preview-modal`, fr+zh `index.html`) com
    campos totalmente estáticos (`<p>`, nunca `<input>`/`<textarea>`) --
    Frente, Pinyin (só quando existe), Verso, Nota (só quando existe),
    Direção. Reaproveita `.profile-edit-label` como rótulo, zero CSS
    novo.
  - **Reportar (Q6)**: `reportPublicFlashcard()` chama
    `openReportModal({source:'public_profile_flashcard',
    flashcard_owner_username, flashcard_front, flashcard_back})` --
    reaproveita o sistema de report global já existente
    (`shared/reports.js`) sem NENHUMA mudança lá, só um `source` novo e
    o conteúdo do cartão como contexto extra (o mecanismo já suporta
    isso via `Object.assign` no `extraContext`, desenhado desde o
    "projeto Report global" justamente pra aceitar contexto arbitrário
    do chamador).

**Decisões arquiteturais desta fase:**
1. `public_profile` continua sendo o ÚNICO interruptor -- não criei um
   segundo campo tipo "cartões públicos" separado de "perfil público".
   A cascata já travada na Fase 1 (conta pública = tudo público exceto o
   marcado individualmente como escondido) vale igual pra identidade,
   progresso E cartões.
2. `get_public_flashcards` nunca devolve `id` como algo sensível (é só
   um inteiro sequencial, sem valor de exploração), mas devolve só os
   campos que a UI realmente precisa pra exibir/copiar um cartão -- nunca
   `student_id`/`created_at`/`status`/`hidden_from_profile` (esses
   últimos dois, inclusive, são exatamente os campos que decidem se o
   cartão aparece ali pra começo de conversa -- não fazia sentido
   devolvê-los de novo pro cliente).
3. O botão "Ver cartões" e toda a seção só existem quando `isPublic`
   (calculado a partir da MESMA resposta de `get_public_profile_stats`
   já buscada pra seção de Progresso) -- evita uma consulta extra
   (`get_public_flashcards`) a um perfil que já se sabe ser privado, e
   mantém as duas seções (Progresso/Flashcards) sempre consistentes
   entre si sem duas fontes de verdade sobre "este perfil é público?".
4. Teto de 20 cartões (ver acima) tratado como parte natural desta fase,
   não como a Fase 3 antecipada -- Fase 3 é especificamente sobre a
   PARTE PAGA (link de upgrade, texto sobre plano), o limite em si já
   existia desde a Fase 5.1 e só precisava ser respeitado neste novo
   caminho de criação de cartão.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão da
Fase 1 -- nenhuma peça nova desta fase muda o cálculo. A única
alavanca concreta continua sendo o teto de cartões próprios (já
existente desde a Fase 5.1, só estendido pra este novo caminho, ver
acima) -- a Fase 3 (popup com link de upgrade/Stripe) é onde essa
alavanca ganharia uma saída de monetização de verdade, ainda sem
infraestrutura de pagamento no código.

**Testes realizados:** `node --check` sem erro em
`shared/public-profile.js`. Validação funcional via Playwright (fr+zh),
mesmo padrão de stub de `window.supabase.createClient()` de toda a
feature, estendido com um mock de `get_public_flashcards`: (1)
**visitante anônimo (página standalone)** -- gate mostrado com fundo
embaçado + link de login, e confirmado que `get_public_flashcards`
NUNCA é chamada nesse caminho (`A_noCardsRpcCalled`); (2) **logada,
lista filtrada corretamente** -- de 4 cartões semeados (2 visíveis, 1
`hidden_from_profile:true`, 1 `status:'archived'`), só os 2 corretos
aparecem no DOM, os outros 2 confirmados ausentes
(`B_hiddenRowAbsent`/`B_archivedRowAbsent`); "Selecionar todos"/"Limpar
seleção" atualizam contador e estado do botão de importar
corretamente; (3) **preview (Q11)** -- modal mostra frente/nota
corretos, fecha corretamente; (4) **reportar (Q6)** -- modal de report
abre com `source:'public_profile_flashcard'` e o front do cartão certo
no contexto; (5) **importação bem-sucedida** -- 1 cartão selecionado e
importado grava de verdade no banco fake
(`E_dbCountAfterImport===1`) E entra em `STATE.cards` imediatamente
com `origin:'self'` (`E_stateCardsHasImported`), sem esperar reload;
(6) **teto de 20 respeitado** -- com 19 cartões próprios ativos já
existentes, selecionar 2 cartões públicos (19+2=21>20) abre o popup de
limite e NÃO grava nada (`F_dbCountUnchanged`); reduzir a seleção pra 1
(19+1=20) permite a importação, banco confirma 20 cartões depois
(`F_dbCountAfterAllowedImport`); (7) **vínculo com professora = sem
teto** -- com 25 cartões próprios já existentes e vínculo ativo,
importar 2 cartões funciona normalmente e o popup de limite nunca abre
(`G_dbCountAfterImport===27`, `G_limitModalStayedHidden`); (8)
**perfil privado -- nem o botão aparece** -- confirmado
`#public-profile-cards-toggle-btn` ausente do DOM quando
`public_profile=false` (`H_noCardsButton`). Testado nos dois idiomas
(fr completo, zh com o cenário núcleo -- botão + gate -- confirmado sem
erro de console). Sem erro de console novo atribuível a este código
(mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já registrados
repetidas vezes nesta feature, chamadas de fundo não relacionadas).
Validação visual (screenshot Playwright, fr, claro+escuro) do estado de
gate (fundo embaçado + cartão de login) confirma legibilidade nos dois
temas -- esperado, zero cor nova introduzida (`--paper`/`--paper-line`/
`--shadow-lift`/`--ink`, todos já calibrados).

**O que ainda falta / não foi feito nesta fase (de propósito, é Fase 3
ou fora do escopo original):**
- **Fase 3**: popup de limite com link de upgrade/Stripe -- continua
  reaproveitando o popup genérico já existente (Fase 5.1), sem menção a
  pagamento, porque essa infraestrutura não existe no código ainda.
- Edição/exclusão de um cartão IMPORTADO segue as mesmas regras que
  qualquer outro cartão próprio em "Meus Cartões" (Prop 4 do
  prompt-mestre "7 propostas") -- nada novo criado aqui, a cópia
  importada é indistinguível de um cartão criado manualmente depois que
  a importação termina.
- Nenhuma notificação/aviso pro dono original do cartão avisando que
  alguém importou uma cópia dele -- não foi pedido, e o design de
  "cópia independente" (Q7) nem precisaria disso pra funcionar
  corretamente.
- `note` é copiado junto na importação (mesmo campo que `createOwnFlashcard`
  já aceita) -- decisão minha, não detalhada no grilling, mas
  consistente com o que Prop 6 (export/import manual via arquivo/link)
  já fazia antes desta fase.

Nenhum passo manual pendente pra autora nesta entrega -- a migration
`038` já foi aplicada ao vivo via `mcp__Supabase__apply_migration`.

Com a Fase 2 entregue, o prompt-mestre "perfil público / flashcards
públicos" original está com todo o escopo grillado (Fases 1 e 2)
completo -- só a Fase 3 (integração com pagamento/Stripe) continua em
aberto, explicitamente bloqueada até essa infraestrutura existir de
verdade no produto, não porque falta trabalho de UI.

## Prompt-mestre "reformulação gratuito x premium" -- infraestrutura de plano
(sem cobrança real), valor concreto = formatos ricos em cartão próprio

Pedido da autora: "Confirme se está tudo funcionando na produção e siga
para a fase 3" -- referência à Fase 3 do prompt-mestre "perfil público"
(pagamento/Stripe, registrada acima como explicitamente bloqueada até
existir infraestrutura de assinatura). Antes de tocar em código de
pagamento, grillado em 3 rodadas (`AskUserQuestion`) porque essa fase
cruza uma linha que nenhuma anterior cruzou -- é a primeira vez que este
produto toca dinheiro de verdade, e o CLAUDE.md já travava explicitamente
"não presumir infraestrutura de assinatura/pagamento" (ver seção
"Considerar plano gratuito x premium" no topo deste arquivo).

**Confirmação de produção, feita antes do grilling**: deploy do commit
mais recente (`07bee67`, Fase 2 do perfil público) confirmado com
`conclusion:"success"` no workflow "Deploy to GitHub Pages" (GitHub
Actions) + migrations `037`/`038` confirmadas ao vivo no Supabase
(`list_migrations`) + colunas/functions novas confirmadas existindo de
verdade no banco real (`execute_sql`). Curl direto em
`app.profbrune.com.br` continua bloqueado pelo proxy de saída deste
sandbox (mesma limitação já documentada neste arquivo pra domínios
externos) -- as duas confirmações acima (Actions + Supabase) são o
substituto real dessa vez.

**Rodada 1 do grilling -- decisões**: Stripe como provedor (quando
integração real existir); "redesenhar do zero" o desenho de gratuito x
premium em vez de só remendar o teto de 20 cartões já existente (Fase
5.1); só infraestrutura nesta entrega, **nenhuma cobrança real ainda**.

**Rodada 2 -- decisões**: cliente pagante = **qualquer conta registrada**
(não só quem tem vínculo pedagógico formal com uma professora -- hoje 11
pessoas vinculadas via "🎓 Alunos", de um total maior de contas
registradas no app; a autora corrigiu explicitamente uma confusão minha
de terminologia aqui, ver abaixo); auditoria completa feature por
feature antes de fixar a alavanca (conclusão: só a categoria de AUTORIA/
CAPACIDADE PESSOAL de conteúdo -- "Meus Cartões", Fase 5 -- tem uma razão
real pra virar alavanca de monetização; todo o núcleo pedagógico --
trilha, FSRS, notas de realidade/cultura, badges, ranking -- fica sempre
grátis, e ferramentas do lado da professora ficam fora do escopo desta
fase, que é especificamente o eixo "aluno individual", não o eixo
hipotético "professora-inquilina/multi-tenant"); um único nível pago
(binário free/premium, sem tiers).

**Correção de terminologia da autora, registrada explicitamente porque
quase contaminou o desenho inteiro**: eu usei "21 alunas" pra descrever o
universo de contas na Rodada 2, misturando dois conceitos que o CLAUDE.md
já distinguia em seções anteriores (migration 024) mas que eu mesmo
confundi na hora de perguntar -- "aluna" no sentido da feature de alunas
particulares é só quem está EXPLICITAMENTE vinculada no Painel de Admin
("🎓 Alunos", `teacher_students`, vínculo ativo -- **11 pessoas hoje**,
confirmado pela autora); "usuária"/conta registrada é qualquer perfil no
app (`profiles`, nasce com `role='student'` só pra dizer "não é admin",
sem nenhuma relação com vínculo pedagógico -- o "21" que citei era esse
número). A resposta da Rodada 1 ("aluno individual paga por si mesma") já
implicava a resposta certa (qualquer conta, não só as 11 vinculadas), mas
a pergunta como formulada por mim poderia ter travado o desenho errado se
ela não tivesse corrigido -- registrado aqui pra não se repetir.

**Rodada 3 -- decisões**: vínculo com professora continua isentando do
TETO DE QUANTIDADE de cartões próprios (Fase 5.1, ninguém perde o que já
tem hoje) -- Premium é um eixo NOVO e SEPARADO cujo valor real é
desbloquear FORMATOS RICOS (imagem/áudio/múltipla escolha/completar
frase) em cartão próprio, algo que nenhuma conta tem hoje mesmo com
vínculo; ativação manual via botão no Painel de Admin (sem checkout
Stripe ainda); todas as contas existentes começam `'free'` por padrão,
sem grandfathering.

**O que foi feito:**

- **Migration `039_add_plan_tier_to_profiles.sql`** -- `profiles.plan_tier
  text not null default 'free' check (plan_tier in ('free','premium'))`.
  Aditiva/sem risco, mesmo padrão de `profiles.role` (migration 024) --
  nenhuma conta muda de comportamento com esta migration. Aplicada AO
  VIVO nesta sessão via `mcp__Supabase__apply_migration`, projeto
  `eigjocalzwamisgqilhg` -- não é passo manual pendente pra autora.
- **Migration `040_student_flashcards_rich_formats.sql`** -- as mesmas
  colunas que `teacher_flashcards` já tinha desde a Fase 8a/8c
  (`image_url`/`audio_url`/`choices`/`cloze_sentence`/`cloze_answer`/
  `cloze_answer_pinyin`) replicadas em `student_flashcards` (que nunca
  tinha ganho esses formatos -- Fase 8a/8c registraram isso
  explicitamente como "fora do escopo, fase futura"), + `front` vira
  nullable (mesmo motivo/mesma migration-irmã de
  `allow_null_front_teacher_flashcards`, 035 -- cartão cloze não tem
  front tradicional). Aplicada AO VIVO nesta sessão -- não é passo manual
  pendente.
- **`shared/roles.js`** -- `fetchMyPlanTier()`/`isPremium()` (eixo NOVO,
  separado de `hasActiveTeacherLink()` -- ver Rodada 3 acima, os dois
  podem coexistir independentemente numa mesma conta), `setPlanTier(userId,
  tier)` (ativação/remoção manual, só chamada do Painel de Admin),
  `searchAnyProfileByUsername(username)` (busca QUALQUER conta por
  @username, com select próprio incluindo `plan_tier` -- diferente de
  `resolveProfileByUsername()` de `admin-badges.js`, que os outros
  chamadores não precisam desse campo extra).
- **`shared/student-flashcards.js`** -- `createOwnFlashcard()` estendido
  com `imageUrl`/`audioUrl`/`choices`/`clozeSentence`/`clozeAnswer`/
  `clozeAnswerPinyin` (mesma validação de `_validateFlashcardContent` de
  `teacher-flashcards.js`, copiada aqui de propósito -- mesmo padrão de
  duplicação intencional já usado nas telas de admin, não uma tentativa
  de compartilhar módulo novo). Nova `uploadOwnFlashcardMedia(file,
  kind)` -- reaproveita o MESMO bucket `flashcard-media` (migration 032)
  que já era "qualquer autenticado, restrito à própria pasta" -- nunca
  escopado a professora --, então funcionou pra cartão próprio sem
  nenhuma migração de Storage nova, só um prefixo `self-` no path pra
  facilitar auditoria manual do bucket.
- **`shared/my-flashcards.js`** -- formulário "Meus Cartões" ganhou o
  radio group "Modo de prática" (flip/mc/cloze) + campos de imagem/áudio,
  só renderizados quando `isPremium()===true`; conta free vê uma única
  linha de aviso honesto ("🔒 Premium desbloqueia imagem, áudio, múltipla
  escolha e completar a frase... Fale com a administração pra ativar" --
  nunca promete um checkout que não existe) no lugar dos controles, sem
  nenhuma mudança no formulário básico que já tinha (frente/verso/nota
  continuam funcionando exatamente como antes pra qualquer conta). Escopo
  deliberadamente mais simples que `shared/admin-flashcards.js`
  (destinatário-múltiplo, validação por campo com blur) -- aqui é sempre
  "pra mim mesma", então a validação roda só no submit, mesmo nível de
  rigor de `createOwnFlashcard()` server-side.
- **`fr/app.js`/`zh/app.js`** -- `buildCardFromSelfFlashcard()` ganhou os
  mesmos 4-5 campos que `buildCardFromTeacherFlashcard()` já tinha desde
  a Fase 8a/8c. **Nenhuma mudança no motor de revisão** --
  `renderReviewView()`/`buildSpeedOptions()`/`hasPlainFrontBack()` já
  eram origin-agnósticos (checam `card.choices`/`card.clozeSentence`
  direto, nunca `card.origin`), confirmado por leitura antes de escrever
  qualquer linha nova -- a mesma aposta arquitetural "um motor só"
  validada em cada fase anterior desta feature (alunas particulares)
  paga o dividendo de novo aqui, dessa vez pra origem `'self'`.
- **`shared/admin-premium.js`** (novo) + nova subseção "⭐ Premium" no
  Painel de Admin (fr+zh, ao lado de "📚 Material de apoio"): busca por
  @username (`searchAnyProfileByUsername` -- funciona pra QUALQUER
  conta, vinculada ou não, diferente de "🎓 Alunos" que só lista quem já
  tem vínculo formal) + botão "Tornar Premium"/"Remover Premium". Sem
  listagem de "todas as contas" -- não existe isso em nenhum lugar do
  admin hoje e construir um navegador de usuários seria escopo maior que
  o pedido ("botão no Painel de Admin", não um CRM de usuários).

**Decisões arquiteturais desta fase:**
1. `plan_tier` e `hasActiveTeacherLink()` (vínculo) são dois eixos
   ORTOGONAIS que ambos podem "desbloquear coisa" em Meus Cartões, mas
   nunca a MESMA coisa -- vínculo isenta do teto de QUANTIDADE (Fase
   5.1, inalterado), Premium desbloqueia FORMATOS (novo). Uma conta pode
   ter os dois, um só, ou nenhum -- os dois selos aparecem juntos quando
   aplicável (`tierBadgeHTML` em `my-flashcards.js`).
2. Reaproveitar o bucket `flashcard-media` já existente (em vez de criar
   um novo escopado a "cartão próprio") funcionou porque a RLS dele já
   era "qualquer autenticado, pasta própria" desde a Fase 8a -- nunca
   dependeu de papel de professora, só de dono da pasta (`auth.uid()`).
   Confirmado por leitura da migration 032 antes de decidir, não
   assumido.
3. `searchAnyProfileByUsername()` tem select PRÓPRIO (não reaproveita
   `resolveProfileByUsername()` de `admin-badges.js`) só pra poder trazer
   `plan_tier` junto -- evita carregar esse campo extra em todos os
   outros lugares que já usam a função original e não precisam dele.
4. Ativação de Premium é 100% manual (SQL via este botão de admin) até
   Stripe existir -- nenhuma tentativa de simular checkout, trial, ou
   qualquer fluxo de autoatendimento que sugira que pagamento real já
   funciona. Mesmo princípio de honestidade já usado no teto de 20
   cartões (Fase 5.1): a UI nunca promete infraestrutura que não existe.

**Gratuito x Premium (é o assunto desta fase inteira, não uma nota à
margem)**: núcleo pedagógico (trilha, exercícios, FSRS, notas de
realidade/cultura, badges, ranking, notificações) fica **sempre grátis**
pra qualquer conta -- gatear isso contradiria a missão do produto já
registrada neste arquivo ("ensinar o idioma real"). Ferramentas do lado
da professora (Fases 1-3/6a/6b/7/8 do sistema de alunas particulares)
ficam **fora do escopo desta fase** -- são o eixo hipotético "professora-
inquilina/multi-tenant" já registrado repetidamente como pergunta em
aberto, e hoje só existe 1 professora real (a autora) usando essas
ferramentas, então não geraria receita ainda. A única alavanca real
nesta entrega é a capacidade de AUTORIA PESSOAL em "Meus Cartões":
quantidade (já existia, Fase 5.1) e agora formatos ricos (novo). Preço/
moeda/período de cobrança **não foram definidos** -- essa é
explicitamente a Fase 3 de verdade (checkout Stripe), ainda bloqueada
até a autora decidir ativar.

**Testes realizados:** `node --check` sem erro em
`shared/roles.js`/`shared/student-flashcards.js`/`shared/my-flashcards.js`/
`shared/admin-premium.js`/`shared/admin-analytics.js`/`fr/app.js`/
`zh/app.js`. Validação funcional via Playwright (fr+zh), boot completo do
app (não só chamada isolada de função) com `getSession()` mockada
devolvendo uma sessão real -- mesmo padrão de fidelidade mais alto já
usado em fases anteriores desta feature: (1) **conta free** -- sem radio
de "Modo de prática", sem campo de imagem, aviso de upsell presente,
criação de cartão comum (sem campos ricos) continua funcionando
normalmente (`dbCount:1`); (2) **conta premium, fr** -- radios presentes,
cartão de múltipla escolha criado com 2 opções erradas gravadas
corretamente, cartão cloze criado com `front:null` confirmado no banco
(nunca um valor inventado, mesmo princípio da migration 035),
`buildCardFromSelfFlashcard()` confirmado populando `choices`/
`clozeSentence` corretamente e com `origin:'self'` preservado,
`hasPlainFrontBack()` confirmado `true` pro cartão MC (tem front) e
`false` pro cloze (sem front) -- a mesma exclusão de Speed Review/
Combinar/Anki export que já protegia cartão de professora sem front
agora protege cartão próprio também, sem nenhuma mudança de código
nessas 3 funções; upload de imagem confirmado batendo no bucket
`flashcard-media` com path prefixado `self-`; (3) **zh premium** --
cloze sem pinyin da resposta REJEITADO (`dbCount:0`, mensagem específica
"Digite o pinyin da resposta..."), com pinyin ACEITO e gravado
corretamente; (4) **Painel de Admin, "⭐ Premium"** -- busca por
@username encontra a conta certa mostrando o plano atual, clique em
"Tornar Premium" grava `plan_tier:'premium'` de verdade no banco e o
botão vira "Remover Premium". Sem erro de console novo atribuível a
este código nos cenários premium/admin; o cenário free só mostrou os
`ERR_TUNNEL_CONNECTION_FAILED` já esperados (CDN do Supabase bloqueado
pelo proxy de saída deste sandbox, mesma limitação documentada em
sessões anteriores). Não foi feita validação visual de tema
claro/escuro nesta entrega -- zero CSS novo introduzido (reaproveita
`.pill`/`.profile-edit-*`/`.btn-*` já calibrados em todas as fases
anteriores de flashcards), risco considerado baixo mas registrando por
completude, mesmo padrão de honestidade já usado quando outras entregas
validaram só um subconjunto.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- **Checkout Stripe real / cobrança de verdade** -- continua
  explicitamente fora do escopo, é a Fase 3 de verdade do prompt-mestre
  original, só desbloqueada quando a autora decidir ativar (precisa de
  conta Stripe, preço definido, e provavelmente uma Edge Function nova
  pro webhook, no mesmo padrão já usado pra Resend).
- **Eixo "professora-inquilina" (multi-tenant)** -- pergunta em aberto
  registrada repetidamente nas fases anteriores (limite de alunas/
  Storage por professora quando houver mais de uma na plataforma) --
  não tocado aqui, fora do escopo desta fase de propósito.
- **Formatos ricos em cartão próprio não têm edição** -- só criar; editar
  um cartão próprio já criado (Prop 4, "7 propostas") continua limitado a
  front/back/note/direção, não ganhou os campos novos nesta entrega
  (mesmo escopo restrito que `teacher_flashcards` teve entre as Fases
  8a/8c e a integração de edição -- que lá também não cobriu modo/mídia
  além do que já existia quando a edição foi implementada).
- Nenhuma listagem/navegador de "todas as contas registradas" no admin --
  só busca pontual por @username, suficiente pro pedido ("botão", não um
  CRM).
- Nenhuma notificação avisando a conta quando ela vira Premium -- não foi
  pedido.

Nenhum passo manual pendente pra autora nesta entrega -- as duas
migrations (`039`/`040`) já foram aplicadas ao vivo via
`mcp__Supabase__apply_migration`.

## UX-fix: rótulo do seletor de direção do cartão ("Idioma de cada lado")
ganha o nome real do idioma em vez de "idioma estudado"/"tradução" genéricos

Pedido da autora, com print da tela (antes de mergear o PR #264): trocar
"Frente no idioma estudado, verso na tradução (padrão)" / "Frente na
tradução, verso no idioma estudado" por texto com o nome real do idioma
-- ex: "Frente em francês (com áudio), verso com tradução em português".
Ela também perguntou explicitamente se os rótulos precisariam mudar
conforme o aluno selecionado -- grillado em 4 perguntas antes de codar,
porque a resposta é DIFERENTE em cada tela que usa este seletor.

**Achado antes de perguntar**: "Meus Cartões" (`shared/my-flashcards.js`)
só mostra este bloco quando `!isMandarim` -- ou seja, sempre
francês↔português, sem ambiguidade, texto fixo sem lógica nenhuma.
"Flashcards" do admin (`shared/admin-flashcards.js`, a tela do print)
tem seletor de MÚLTIPLOS alunos, que pode incluir um vinculado em
`portugues` (aceito no schema desde a Fase 1, mesmo sem site próprio
ainda) -- é aí que mora a complexidade real: o que mostrar se a seleção
tiver alunos de idiomas diferentes, ou nenhum selecionado ainda?

**Decisões do grilling:**
1. As duas telas recebem a mudança.
2. Idioma nativo pareado com `portugues` -- **"inglês", decisão explícita
   da autora**, mesmo sem confirmação nenhuma no código (eu recomendei
   esconder o seletor pra português até o site existir de verdade, mesmo
   princípio de "não presumir infraestrutura" já travado neste arquivo --
   ela optou por travar "inglês" já, sabendo que pode mudar quando o site
   de português existir). Registrado aqui pra não parecer suposição minha.
3. Sem seleção nenhuma no admin -> texto genérico de sempre, como
   fallback (não esconde o bloco).
4. Formato exato: "Frente em {idioma} (com áudio), verso com tradução em
   {nativo}" / "Frente na tradução em {nativo}, verso em {idioma} (com
   áudio)".

**Decisão minha, não coberta explicitamente no grilling**: quando a
seleção do admin é MISTA entre 2+ idiomas elegíveis (hoje só
possível entre francês e português, já que mandarim já esconde o bloco
inteiro por conta própria) -- caiu pro MESMO fallback genérico do "sem
seleção" (regra 3 acima), em vez de mostrar um rótulo ambíguo ou inventar
um formato novo pra esse caso. Funcionalmente nada muda (o campo
`frontIsTargetLanguage` já era um booleano único aplicado por linha,
cada linha resolve "alvo" a partir do PRÓPRIO `language_app_key`,
correto mesmo com seleção mista) -- só o rótulo mostrado fica genérico
nesse caso raro.

**O que foi feito:**

- **`FLASHCARD_DIRECTION_LANGUAGE_LABELS`** (novo, `shared/admin-
  students.js`, ao lado de `STUDENT_LANGUAGE_LABELS` já existente) --
  `{ frances: {target:'francês', native:'português'}, portugues:
  {target:'português', native:'inglês'} }`. `mandarim` deliberadamente
  fora do mapa (nunca precisa de rótulo, o bloco já não se aplica a ele).
- **`shared/my-flashcards.js`** -- `myFlashcardDirectionLabels()` (novo)
  usa `FLASHCARD_DIRECTION_LANGUAGE_LABELS[APP_KEY]` direto (site fixo =
  1 idioma só) nos 2 radios do formulário de criação E nos 2 do formulário
  de edição -- 4 pontos no total, todos trocados.
- **`shared/admin-flashcards.js`** -- `adminFlashcardDirectionLabels
  (selectedStudents)` (novo) calcula o conjunto de idiomas elegíveis
  presentes na seleção (`language_app_key` filtrado pelo mapa acima);
  só devolve rótulo concreto quando esse conjunto tem exatamente 1
  idioma, senão cai pro texto genérico (regras 3+4 acima). Usado em 3
  pontos: o `<span>` com id próprio no render inicial (recalculado
  também em `updateFlashcardsSelectionDependentUI()` a cada mudança de
  seleção, sem re-render do form inteiro -- mesmo padrão incremental já
  usado nesta tela desde a UX-fix 5), e o formulário de EDIÇÃO de um
  cartão já existente (`flashcardEditFormHTML(c)`, que edita 1 cartão só
  -- usa `adminFlashcardDirectionLabels([c])`, sempre um idioma único e
  concreto, nunca cai no fallback genérico).

**Gratuito x Premium**: não se aplica -- é só texto de rótulo, sem mudança
de comportamento/dado.

**Testes realizados:** `node --check` sem erro em `shared/admin-
students.js`/`shared/admin-flashcards.js`/`shared/my-flashcards.js`.
Validação via Playwright (fr): "Meus Cartões" (conta premium) confirmado
mostrando os 2 rótulos exatos ("Frente em francês (com áudio), verso com
tradução em português" / "Frente na tradução em português, verso em
francês (com áudio)"). `adminFlashcardDirectionLabels()` chamada
diretamente com 5 cenários -- sem seleção (genérico), só francês
(dinâmico), só português (dinâmico, "inglês" confirmado), francês+
português misto (genérico, decisão registrada acima), francês+mandarim
misto (mostra o rótulo de francês -- correto, ainda que essa combinação
nunca fique visível de fato porque `anyMandarim` já esconde o bloco
inteiro por outro caminho). Não foi feita validação end-to-end da tela
completa do admin (checkboxes clicados de verdade) nem de zh -- o
seletor não existe em zh (mandarim sempre exclui o bloco) e a lógica do
admin foi validada como função pura, risco considerado baixo dado que
`updateFlashcardsSelectionDependentUI()`/render inicial não foram
alterados estruturalmente, só ganharam 2 linhas a mais escrevendo
`textContent`.

**O que ainda falta / não foi feito (de propósito):** nada pendente --
escopo pontual de texto, sem migração, sem passo manual.

## Badge "Aluno/a da Prof. Brune" concedido automaticamente ao vincular

Pedido da autora: "Tem como atribuir o Badge de aluno automaticamente
para todo aluno vinculado por mim?" -- confirmado que o badge já existia
(`badge_catalog`, id `student`, "Aluno/a da Prof. Brune" 🎓, criado numa
sessão anterior) mas era só concedido manualmente via "🎖️ Badges". Ao
conferir o estado real (`badge_grants` x `teacher_students` ativos): 10
dos 11 vínculos ativos já tinham o badge (concedido manualmente antes),
só `@hirschbarae` estava sem -- **concedido agora, ao vivo, via SQL**
(`mcp__Supabase__execute_sql`, mesmo padrão de "aplicar direto quando é
aditivo/baixo risco" já usado neste arquivo pra migrations).

**O que foi feito**: `assignStudentToTeacher()` (`shared/roles.js`)
ganhou um segundo insert, logo depois do insert em `teacher_students` ter
sucesso -- concede o badge `student` pro `target.user_id` automaticamente,
toda vez que a autora vincular alguém como aluno(a) daqui pra frente
(qualquer tela que chame essa função -- hoje só "🎓 Alunos"). Erro
`23505` (já tem o badge -- ex: a mesma pessoa sendo vinculada num
SEGUNDO idioma) é esperado e ignorado, não reportado como falha. Um erro
de qualquer outro tipo no badge é logado no console mas **nunca desfaz
nem reporta falha no vínculo em si** -- a aluna já foi vinculada com
sucesso antes dessa linha rodar, um problema no badge é secundário.

**Decisão arquitetural**: nenhuma tabela/coluna nova -- reaproveita
`badge_grants` (migration 002) e o badge `student` já existente no
catálogo, só automatiza a concessão que já existia manualmente.

**Testes**: `node --check` sem erro em `shared/roles.js`. Não testado via
Playwright nesta entrega (mudança pequena e direta, mesmo padrão de
código já usado em `grantBadgeByUsername`/`admin-badges.js`, risco baixo)
-- confirmado ao vivo que o backfill retroativo funcionou (10/11 já
tinham, o 11º recebeu agora).

## Perfil público virou o padrão -- reversão explícita e confirmada da
decisão de privacidade original, INCLUSIVE retroativa

A autora perguntou: "Tem como tornar todo perfil público (cartões,
progresso, conquistas etc) dos usuários por default ao invés de
privado por default?" -- reverte uma decisão de privacidade que tinha
sido grillada explicitamente (Fase 1 do prompt-mestre "perfil público /
flashcards públicos", ver seção acima -- "privados por default" foi
resposta a uma pergunta direta do grilling na época, não um default
arbitrário), então antes de tocar em qualquer coisa perguntei o escopo
exato: só contas NOVAS, ou também as 23 já registradas (que nunca
opinaram sobre isso, sem nenhum canal de notificação existente pra
avisá-las). **Ela confirmou explicitamente: também as 23 já
existentes.**

**Executado ao vivo, migration `041_public_profile_default_true.sql`**
(`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg`): (1)
`alter column public_profile set default true` -- toda conta nova a
partir de agora já nasce pública; (2) `update profiles set
public_profile = true where public_profile = false` -- as 23 contas já
existentes na época (inclusive as 11 alunas formalmente vinculadas)
viraram públicas na mesma migration. Confirmado ao vivo depois:
`23 total, 23 now_public`.

**Nenhuma mudança de código foi necessária** -- toda a UI/lógica de
perfil público (Fase 1/2 do prompt-mestre) já lia `profiles.
public_profile` dinamicamente desde que foi construída, sem nenhum
hardcode assumindo "privado" (conferido antes de rodar a migration:
`shared/profile.js`/`fr/index.html`/`zh/index.html`, o toggle e o texto
de apoio já refletem o valor real da conta, nunca um texto estático
"privado por padrão"). Só o DADO mudou.

**O que continua igual, de propósito**: `student_flashcards.hidden_from_profile`
(o botão de olho por cartão, Fase 1 do perfil público) não foi tocado --
uma aluna que já tinha marcado algum cartão como escondido continua com
ele escondido mesmo agora que a conta inteira é pública por padrão; os
dois eixos continuam independentes, exatamente como desenhado.

**Sem passo manual pendente** -- migration já aplicada ao vivo. Nenhuma
das 23 contas foi notificada sobre a mudança (não existe canal pra isso
hoje) -- risco reconhecido e aceito explicitamente pela autora ao
confirmar o escopo "também as já existentes".

## Auditoria de terminologia "aluno/student" x "usuário/user" (2026-09-24)

Pedido da autora, depois do mal-entendido registrado na entrega anterior
("Fase 3", onde confundi "aluna" com "usuária" numa pergunta de
grilling): mapear onde o código usa cada termo, pra confirmar que os dois
conceitos continuam bem separados. Feito só como auditoria de leitura
(grep + inspeção), sem nenhuma mudança de código.

**Os dois conceitos, e onde cada um mora:**
- **"Aluno/a"** = vínculo FORMAL numa linha ativa de `teacher_students`
  (quem a autora vinculou explicitamente em "🎓 Alunos"). Funções-chave:
  `fetchMyStudents()`, `assignStudentToTeacher()`, `removeStudentLink()`,
  `hasActiveTeacherLink()` (todas em `shared/roles.js`). Telas que usam
  esse termo na UI, sempre nesse sentido correto: "🎓 Alunos"
  (`admin-students.js`), "Flashcards"/"Aulas"/"Material de apoio" do
  admin (`admin-flashcards.js`/`admin-class-logs.js`/
  `admin-support-materials.js` -- os 3 seletores de destinatário "Nenhum
  aluno selecionado"/"N alunos selecionados"), e o selo "Aluno vinculado"
  em "Meus Cartões" (`my-flashcards.js`, referindo-se à PRÓPRIA aluna
  logada, sempre correto).
- **"Usuário/conta"** = QUALQUER perfil registrado (`profiles`), sem
  nenhuma relação com vínculo pedagógico. Funções-chave:
  `fetchAllProfiles()` (`admin-badges.js`), `fetchMyRole()`,
  `fetchMyPlanTier()`/`isPremium()`/`setPlanTier()`/
  `searchAnyProfileByUsername()` (todas em `shared/roles.js`, Fase
  "reformulação gratuito x premium"). UI: "Nome de usuário" (campo de
  perfil), "Conta"/"Sua conta"/"Sair da conta" (menu de Configurações) --
  todos genéricos, sem confusão com vínculo pedagógico.

**Conferido, nenhuma inconsistência encontrada**: busquei especificamente
por texto visível na UI (`grep` em `fr/index.html`/`zh/index.html` e nos
template strings de `shared/*.js`) que dissesse "aluno" fora de um
contexto de vínculo formal, ou "usuário"/"conta" num contexto que na
verdade devesse dizer "aluno vinculado" -- não achei nenhum. A confusão
da entrega anterior aconteceu numa PERGUNTA MINHA de grilling (texto que
eu escrevi na hora, não um bug em código já existente) -- não há
equivalente disso "gravado" no código pra corrigir. Registrando aqui como
auditoria concluída, não como lista de bugs -- nada foi mudado.

**O que fica pra próximas sessões evitarem o mesmo erro**: ao escrever
qualquer pergunta de grilling ou texto novo que precise se referir a "os
alunos"/"as contas" da autora, checar explicitamente qual dos dois
conceitos acima é o pretendido antes de escrever a frase -- "aluno" sem
qualificação sempre significa vínculo formal em `teacher_students`, nunca
"toda conta registrada".

## Fix: seleção mista de idiomas em "📇 Flashcards" causava pronúncia errada (TTS)

Pedido da autora: impedir que a seleção de destinatários em "📇
Flashcards" (Painel de Admin) misture alunos de idiomas diferentes (ex:
francês + português) na mesma criação de cartão -- um cartão tem UM
idioma-alvo só (Prop 1+2, "7 propostas", ver seção acima: direção +
pronúncia automática/TTS dependem de qual lado é o idioma estudado), então
uma seleção mista faz o TTS tocar no idioma errado pra quem não é do
idioma escolhido. Pedido concreto: remover a pill "Todos" do filtro de
idioma e manter só as pills por idioma.

**Achado antes de mexer**: o filtro de idioma (`ADMIN_FLASHCARDS_STATE.langFilter`,
introduzido na Fase "5.1"/"reformulação gratuito x premium" da tela) já
existia, mas era só uma LENTE DE VISUALIZAÇÃO -- trocar de pill escondia
linhas via `style.display`, mas nunca tocava em `studentIds`. Um aluno
marcado enquanto o filtro estava em "Francês" continuava marcado (só
invisível) depois de trocar pra "Português" -- ou seja, mesmo com a pill
"Todos" removida, a seleção mista continuaria possível pela combinação
marcar→trocar de pill→marcar de novo. Corrigir só a pill sem tocar nisso
teria resolvido a superfície mas não a causa raiz.

**O que foi feito**, só em `shared/admin-flashcards.js` (linhas da função
`renderAdminFlashcardsView`, mesma tela; `admin-class-logs.js`/
`admin-support-materials.js` têm o mesmo padrão de pills mas nenhuma
lógica de TTS/direção -- fora do escopo, forçar a mesma trava lá removeria
funcionalidade que já funciona sem corrigir nada):

1. Pill "Todos" removida de `langFilterHTML` -- só pills por idioma
   restam quando há 2+ idiomas presentes entre os alunos da professora.
2. `ADMIN_FLASHCARDS_STATE.langFilter` deixa de poder ficar em `'all'`
   quando há 2+ idiomas -- se o valor guardado não está mais na lista de
   idiomas presentes (primeiro carregamento, ou uma sessão anterior que
   ainda tinha `'all'`), a tela auto-corrige pro primeiro idioma da lista.
3. **Trocar de pill agora zera `studentIds` de verdade** (e desmarca os
   checkboxes no DOM) -- é isto que garante a invariante, não só a
   ausência da pill "Todos". Clicar na MESMA pill já ativa é no-op
   (não reseta a seleção à toa).
4. **"Selecionar todos" passou a respeitar o filtro de idioma ativo** --
   achado durante a implementação, não pedido explicitamente: sem isso,
   marcar "Selecionar todos" ainda juntaria alunos de idiomas diferentes
   pela porta dos fundos (a função selecionava `students` inteiro, sem
   filtrar por `langFilter`). Agora, com 2+ idiomas presentes, só marca
   quem pertence ao idioma da pill ativa no momento do clique.

**Decisão de escopo**: nenhuma mudança em `createFlashcard()`/schema --
é 100% client-side (estado de seleção + filtro de DOM), mesmo nível de
"trava de UI, não fronteira de segurança" já usado noutros limites desta
feature (ex: teto de 20 cartões da Fase 5.1). A trava evita o erro por
acidente na UI normal; não impede alguém de inserir direto via API (fora
do modelo de ameaça desta tela, que é ferramenta interna da própria
professora/admin).

**Testes realizados:** `node --check` sem erro. Playwright (fr, roster
misto 2 francês + 1 mandarim): confirmado só 2 pills (sem "Todos"), pill
padrão já ativa no primeiro idioma presente (`frances`); marcar uma aluna
de francês e trocar pra pill de mandarim zera a seleção
(`afterSwitchToZhCount: "Nenhum aluno selecionado"`, checkbox
desmarcado); "Selecionar todos" com o filtro em mandarim marca só o aluno
de mandarim (não o de francês, mesmo ele estando escondido pelo filtro);
trocar de volta pra francês e "Selecionar todos" marca os 2 alunos de
francês, sem incluir o de mandarim; clicar na pill já ativa não reseta
uma seleção em andamento. Não validado em zh nem tema escuro nesta
entrega -- mudança é 100% JS de estado/filtro, zero CSS novo e zero
diferença de idioma na lógica (o arquivo é compartilhado sem branch por
idioma), risco considerado baixo, registrando por completude mesmo
padrão de honestidade já usado quando outras entregas validaram só um
subconjunto.

**Escopo**: só `shared/admin-flashcards.js`. Nenhuma migração, nenhum
passo manual pendente pra autora.

## Rename `profiles.role`: `'student'` → `'user'` (schema, não texto de UI)

A autora perguntou se o default `'student'` de `profiles.role` (migration
024) não era exatamente o mesmo tipo de colisão de terminologia já
auditado na entrega anterior ("aluno/a" = vínculo formal em
`teacher_students`, nunca "toda conta registrada"). Confirmado que sim,
lendo a migration 024 de novo: o próprio comentário dela dizia "toda
conta existente hoje já é implicitamente aluna", reusando a mesma palavra
que o resto do código reserva estritamente pro vínculo formal. **Sem bug
funcional** -- grep confirmou que nenhum call site fazia `role ===
'student'` pra decidir vínculo (isso sempre leu `teacher_students`/
`hasActiveTeacherLink()`) -- mas a colisão de NOME era real e podia
confundir uma sessão futura, exatamente o risco que a auditoria anterior
existia pra prevenir. Pedido direto da autora: "Rename it, run the
migration. From 'student' to 'user'".

**Migration `042_rename_role_student_to_user.sql`** -- `profiles.role`:
constraint antiga (`profiles_role_check`, confirmada ao vivo via
`pg_constraint` antes de escrever a migration) trocada por `role in
('user','teacher','admin')`; `update ... set role='user' where
role='student'` (22 linhas migradas, confirmado ao vivo -- as mesmas 22
contas que eram `'student'`, 1 admin intacta); `default` da coluna
também trocado pra `'user'`. Aplicada AO VIVO via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg` -- não é
passo manual pendente pra autora. `shared/roles.js` (`fetchMyRole()`)
ajustado pro mesmo fallback (`|| 'user'`).

**Escopo explicitamente NÃO estendido a 2 outras ocorrências de
`'student'` no código, confirmadas como sistemas DIFERENTES antes de
decidir não tocar**:
- `badge_catalog.badge_id`/`badge_grants.badge_id = 'student'` -- é o id
  do badge "Aluno/a da Prof. Brune" (`shared/roles.js`,
  `assignStudentToTeacher()`), uma tabela e conceito totalmente
  diferentes de `profiles.role`. Renomear isto seria uma migração de
  dado separada e mais arriscada (referenciado por linhas já existentes
  de `badge_grants`), não pedida.
- `usage_events.actor_type = 'student'` (`shared/analytics.js`/
  `shared/admin-analytics.js`) -- classificação de analytics
  ("atividade real" vs. `'admin'`, quando `isAdminUser()===true`), outra
  coluna/tabela sem relação nenhuma com `profiles.role`.

Nenhuma mudança de UI/texto visível nesta entrega -- é puramente uma
correção de nome de valor de enum no schema, sem efeito em nenhuma tela.

**Testes**: `node --check` sem erro em `shared/roles.js`. Verificação ao
vivo pós-migration confirma as 3 partes -- `select role, count(*) ...`
mostra `admin:1, user:22` (nenhuma linha ficou em `'student'`);
`pg_get_constraintdef` confirma a nova constraint;
`information_schema.columns` confirma `column_default = 'user'::text`.

**Escopo**: `shared/supabase_migrations/042_rename_role_student_to_user.sql`
(nova) + `shared/roles.js`. Nenhum passo manual pendente pra autora --
migration já aplicada ao vivo.

## Mesmo tratamento nos 2 outros "student" que não eram vínculo formal
(`usage_events.actor_type` e a tabela `student_flashcards`)

A entrega anterior (rename de `profiles.role`) já tinha identificado e
deliberadamente deixado de fora 2 outras ocorrências de `'student'` no
schema. A autora perguntou explicitamente se essas duas também deveriam
seguir "o mesmo raciocínio" -- e apontou o contraste que já estava
implícito: o badge automático concedido em `assignStudentToTeacher()`
(`badge_catalog`/`badge_grants`, id `'student'`) está certo do jeito que
está, porque só é concedido quando alguém é vinculada de verdade em
"🎓 Alunos" (vínculo formal em `teacher_students`) -- não é a mesma
colisão de nome. As duas ocorrências restantes, porém, eram exatamente
esse tipo de colisão: usar "student" pra rotular QUALQUER conta, não só
quem tem vínculo formal.

Como a pergunta envolvia 2 mudanças técnicas (uma tabela inteira sendo
renomeada, não só um valor de enum), perguntei antes de executar (pedido
explícito da autora: "não entendi direito, mas explique de um jeito que
não-desenvolvedores entendam") -- resposta: **"Both"**, fazer as duas.

**1) `usage_events.actor_type`** -- coluna que classifica cada linha de
analytics como `'admin'` (quando `isAdminUser()===true`) ou `'student'`
(qualquer outra conta, mesmo sem vínculo formal nenhum -- a MESMA colisão
de nome já corrigida em `profiles.role`, só que numa tabela diferente).
**Migration `044_rename_actor_type_student_to_user.sql`** -- `alter
column actor_type set default 'user'` + `update ... set
actor_type='user' where actor_type='student'`. Aditiva/sem risco, mesmo
padrão de sempre. Aplicada AO VIVO via `mcp__Supabase__apply_migration`,
projeto `eigjocalzwamisgqilhg` -- confirmado depois: `admin:183,
user:939` (era `admin:183, student:939`). Nenhuma mudança de código
necessária -- `shared/analytics.js`/`shared/admin-analytics.js` nunca
comparavam contra a string `'student'` (só contra `'admin'`), então o
valor no outro ramo era só o que sobrava no banco, sem lógica
dependendo do nome exato.

**2) Tabela `student_flashcards` (Fase 5 do sistema de alunas
particulares, "Meus Cartões")** -- essa era a colisão mais séria: uma
tabela INTEIRA, com uma coluna `student_id`, usada pra guardar os
cartões que a PRÓPRIA CONTA cria pra si mesma -- sem nenhuma relação com
vínculo formal de professora (qualquer conta, vinculada ou não, sempre
pôde usar "Meus Cartões" desde a Fase 5, confirmado de novo nesta
sessão: `shared/my-flashcards.js` nunca chama `fetchMyStudents()`/
`teacher_students`). Diferente de `teacher_flashcards` (que SIM é
"cartão que uma professora atribui a uma aluna vinculada" -- esse nome
está certo e não foi tocado).

**Migration `043_rename_student_flashcards_to_own_flashcards.sql`** --
`alter table student_flashcards rename to own_flashcards` + `alter table
own_flashcards rename column student_id to owner_id` + as 4 constraints
+ a policy RLS (`student_flashcards_owner_all` →
`own_flashcards_owner_all`) renomeadas junto. **Achado técnico
importante, verificado ao vivo antes de escrever a migration**: um
`RENAME TABLE`/`RENAME COLUMN` no Postgres atualiza sozinho tudo que
referencia por OID (constraints, índices, policies) -- mas NÃO atualiza o
corpo de uma function PL/pgSQL, que é guardado como texto literal. A
function `get_public_flashcards()` (migration 038, usada pelo perfil
público) tinha `from student_flashcards where student_id = ...` escrito
no corpo -- precisou de um `CREATE OR REPLACE FUNCTION` explícito dentro
da mesma migration, ou teria continuado apontando pro nome antigo (que
não existiria mais) e quebrado em produção. Aplicada AO VIVO via
`mcp__Supabase__apply_migration` -- verificado depois: 3 linhas
preservadas, constraints/policy renomeadas, function chamável e
devolvendo o erro `not_authorized`/`not_found` esperado pra um username
inexistente.

**Lado do cliente**: `shared/student-flashcards.js` (8 funções --
`fetchMyOwnFlashcards`, `createOwnFlashcard`, `uploadOwnFlashcardMedia`,
`setOwnFlashcardStatus`, `setOwnFlashcardHidden`,
`updateOwnFlashcardContent`, `deleteOwnFlashcardPermanently` + validação
interna) apagado e recriado como **`shared/own-flashcards.js`** -- mesma
lógica exata, só trocando `.from('student_flashcards')`→
`.from('own_flashcards')` e `student_id`→`owner_id` em todo lugar (nomes
de FUNÇÃO nunca mudaram -- só o arquivo/tabela/coluna por baixo -- então
nenhum call site em `shared/my-flashcards.js` precisou de nenhuma
mudança, só os 2 comentários que citavam o nome antigo do arquivo).
`fr/index.html`/`zh/index.html`: tag `<script src="../shared/
student-flashcards.js">` → `own-flashcards.js`. Comentários corrigidos
(sem mudança funcional) em `fr/app.js`, `zh/app.js` (2 blocos cada, perto
de `buildCardFromSelfFlashcard`/`isCardLessonCompleted`),
`shared/teacher-class-logs.js` e `shared/public-profile.js`.

**O que ficou de fora, de propósito** (mesmo critério da entrega
anterior -- migrar o arquivo histórico da migration quebraria o registro
do que rodou de verdade naquela data): as migrations antigas
(`028`/`031`/`032`/`033`/`036`/`037`/`038`/`040`) continuam com
`student_flashcards`/`student_id` no texto SQL -- são o registro real do
que foi executado então, nunca reescritas.

**Testes realizados**: `node --check` sem erro em todos os arquivos
tocados. Grep completo do repositório (fora das migrations antigas)
confirma zero referência sobrando a `student_flashcards`/
`student-flashcards.js`. Validação funcional via Playwright: carreguei
`shared/own-flashcards.js` isolado num browser real (Chromium) com um
`supabaseClient` fake que registra cada chamada -- confirmado que as 7
funções exportadas existem e que `fetchMyOwnFlashcards`/
`createOwnFlashcard`/`setOwnFlashcardStatus`/`setOwnFlashcardHidden`/
`deleteOwnFlashcardPermanently` todas chamam `.from('own_flashcards')`
e filtram/gravam por `owner_id` (nunca `student_id`), inclusive o
`insert()` de `createOwnFlashcard` confirmado gravando `owner_id`
corretamente no payload. Não foi possível validar a tela completa "Meus
Cartões" ponta-a-ponta neste ambiente porque carregar `fr/index.html`/
`zh/index.html` direto (sem passar pela seleção de idioma da raiz do
site) dispara um redirect da própria arquitetura do app (não relacionado
a esta mudança) -- a validação isolada do módulo (acima) cobre o risco
real desta entrega, que é 100% renomeação mecânica sem lógica nova.

**Escopo**: `shared/supabase_migrations/043_rename_student_flashcards_to_own_flashcards.sql`
+ `044_rename_actor_type_student_to_user.sql` (novas) +
`shared/own-flashcards.js` (novo, substitui `shared/student-flashcards.js`,
apagado) + `fr/index.html`/`zh/index.html`/`fr/app.js`/`zh/app.js`/
`shared/teacher-class-logs.js`/`shared/public-profile.js` (só
referências/comentários). Nenhum passo manual pendente pra autora --
as duas migrations já foram aplicadas ao vivo via
`mcp__Supabase__apply_migration`.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 4
(motor de tipos/templates): a ponte legada é REALMENTE eliminada

Prompt-mestre grande, fatiado em fases próprias travadas por autorização
explícita a cada etapa (Fase 1: auditoria só-leitura; Fase 2: modelo
Note/Field/CardType/CardInstance + `interpretNoteFromRow()`; Fase 3:
camada de compatibilidade -- `bridgeNoteCardsToLegacyShape()`, adapter
temporário pros renderizadores antigos continuarem funcionando sem
reescrever tudo de uma vez). A autora aprovou a Fase 3 só depois de um
smoke test real de navegador (Playwright, fr+zh, adapter carregado,
`buildCardFromTeacherFlashcard()` funcionando via adapter, os 4 formatos
existentes confirmados -- normal/normal-invertido/múltipla-escolha/cloze
com e sem áudio próprio, Speed Review/Combinar continuando elegíveis) --
e avisou, ao aprovar, que a Fase 4 NÃO poderia simplesmente empilhar mais
funcionalidade em cima da ponte: "o `bridgeNoteCardsToLegacyShape()` é
uma ponte temporária, não parte da arquitetura final... esse é
provavelmente o principal risco de a implementação 'funcionar' e o
Claude depois ficar tentado a manter a ponte indefinidamente."

**Autorização da Fase 4, 8 restrições obrigatórias, travadas ANTES de
codar (verbatim resumido, todas cumpridas nesta entrega):**
1. **OPÇÃO B** -- a ponte devia ser REALMENTE eliminada ao final da Fase
   4, não substituída por um helper equivalente que reconstrói o shape
   antigo. Fluxo final exigido: `Note + CardInstance → resolveCardField()
   → renderer/feature`, nunca `Note + CardInstance → shape intermediário
   → renderer/feature`. Isso exigia migrar Speed Review, Combinar e
   exportação Anki também, não só os 3 renderizadores de revisão.
2. **"Normal com reverso" = 2 CardInstances independentes** (direções
   opostas, cada um com seu próprio FSRS/histórico, ambos derivados da
   mesma Note) -- nunca um toggle de direção em nível de sessão.
3. **`isReverse`/`nextCardDirection()` não podiam continuar como
   mecanismo estrutural de direção**, nem dentro do tipo `normal` --
   direção decidida pelo próprio CardInstance via os campos que ele
   referencia (`frontFieldIndex`/`backFieldIndex`), nunca pela sessão de
   revisão escolhendo/alternando.
4. `fieldOrder` continua sendo só a ordem de campos no editor -- nunca
   usado pra decidir direção de revisão.
5. `lang` continua propriedade do Field -- nunca usado pra decidir
   automaticamente qual lado é front/back, se deve haver áudio, ou qual
   template usar.
6. Checkpoint técnico obrigatório depois da Fase 4a (motor aditivo),
   ANTES de tocar em qualquer renderizador -- entregue e reportado nesta
   mesma sessão, sem correção da autora (só um lembrete automático de
   commit) -- prossegui pra 4b→4d sem pedir nova autorização, conforme a
   própria instrução dela ("desde que o modelo continue exatamente
   dentro das decisões acima").
7. Não implementar nesta fase: novo editor; TTS/AwesomeTTS; templates
   customizáveis pelo usuário; novos recursos de criação; mudanças no
   FSRS; customização de Card Types. **Nada disso foi tocado.**
8. Manter compatibilidade com dados existentes -- não alterar IDs/
   histórico/FSRS já existentes sem necessidade.

**O que foi feito, por subfase:**

- **4a (aditiva, checkpoint entregue)** -- `shared/flashcard-model.js`
  ganhou, sem tocar em nada pré-existente: `CARD_TYPE_IDS` (`normal`,
  `type_answer`, `cloze`, `multiple_choice` -- só 4 `cardTypeId`
  distintos; "Normal com reverso" de propósito NÃO tem `cardTypeId`
  próprio, reaproveita `'normal'` duas vezes -- mesmo espírito do Anki
  real, cujo note type "Basic and reversed card" usa o MESMO template
  "Card" pros dois lados); `resolveCardField(note, fieldIndex)` (ponto
  único de projeção Field→exibição, nunca decide direção, resolve pinyin
  automaticamente via `field.pinyinFieldIndex`); `resolveNormalCardView`/
  `resolveMultipleChoiceCardView`/`resolveTypeAnswerCardView`/
  `resolveClozeCardView` (um resolver por Card Type);
  `buildReversedCardInstancePair(noteId, frontFieldIndex, backFieldIndex)`
  (utilitário puro, ainda não wireado em `interpretNoteFromRow()` --
  nenhuma coluna legada pede "reversível" hoje -- retorna 2
  CardInstances com ids `noteId`/`${noteId}-b`, cada um com seu PRÓPRIO
  bloco `FLASHCARD_MODEL_FSRS_DEFAULTS` completo, testado que mutar um
  nunca vaza pro outro).
- **4b** -- `buildEngineCardsFromRow(row, opts)` (caminho de construção
  real: chama `interpretNoteFromRow()`, DESTRÓI os campos FSRS de cada
  CardInstance cru antes de guardá-lo em `card.cardInstance` -- evita uma
  segunda cópia defasada de FSRS depois que `shared/fsrs.js` começa a
  mutar só o card top-level, testado explicitamente que mutar o FSRS
  top-level nunca vaza pro `cardInstance` guardado); `resolveCardContentView(card)`
  (dispatcher único por `card.cardInstance.cardTypeId` -- o ponto que
  TODO consumidor devia chamar, satisfazendo a restrição 1).
- **4c** -- migração de fato dos consumidores, nos dois idiomas:
  `buildCardFromTeacherFlashcard`/`buildCardFromSelfFlashcard` →
  `buildEngineCardsFromRow`; `hasPlainFrontBack` reescrito (`normal`/
  `multiple_choice` = par curto exportável/comparável, `cloze`/
  `type_answer` ficam de fora -- resposta aberta, sem texto curto fixo);
  novas `cardPromptText`/`cardAnswerText` (+ `cardPromptPinyinText` no
  zh) -- ponto único que Speed Review/Combinar/export Anki usam pra
  extrair texto de QUALQUER card (trilha OU nativo OU pseudo-objeto de
  opção errada de MC); `renderMultipleChoiceReviewCard`/
  `renderClozeReviewCard` reescritos pra `resolveCardContentView()`;
  `renderTypeAnswerReviewCard` (NOVO -- "digite a resposta", 4º Card
  Type que nenhum dado legado nunca gerou, mas o motor já suporta);
  `renderReviewView()` dispatcher reescrito (`cardInstance.cardTypeId` →
  renderizador certo; corpo de flip usa `resolveNormalCardView()` quando
  `card.cardInstance` existe, preserva o mecanismo antigo `isReverse`/
  `card.reviewDirection` **só no ramo `else` de trilha**, que nunca
  passou pelo modelo Note/CardInstance); `startReviewSession()`:
  `queue.forEach(c => { if (!c.cardInstance) c.reviewDirection =
  nextCardDirection(c); })` -- cartão nativo NUNCA recebe
  `reviewDirection` (restrição 3 cumprida: a sessão não escolhe/alterna
  direção de cartão nativo, só de trilha); `buildSpeedOptions`/
  `startMatchGame`/`ANKI_EXPORT_CONFIG.noteFields`/`.sortField`
  migrados pra `resolveCardContentView()`/`cardPromptText`/
  `cardAnswerText` (restrição 1, Speed Review/Combinar/Anki também
  migrados, não só os 3 renderizadores).
- **4d** -- `legacyRaw` removido de `interpretNoteFromRow()` (não
  existe mais objeto legado intermediário nenhum); `bridgeNoteCardsToLegacyShape()`
  e `legacyFlashcardRowToCard()` **DELETADOS por completo** (confirmado
  via grep, antes de apagar, que zero call site restante dependia
  deles). `bridgeNoteCardsToLegacyShape`/`legacyRaw` não existem mais em
  lugar nenhum do repositório -- restrição 1 cumprida de verdade, não só
  nominalmente.

**Mudança de comportamento real, visível pra quem usa o app hoje --
disclosed explicitamente, não só uma nota técnica**: antes desta fase,
um cartão nativo "Normal" da professora/aluna alternava front↔back de
sessão pra sessão (mesmo mecanismo `isReverse`/`nextCardDirection` que a
trilha sempre usou). A restrição 3 da própria autora proíbe exatamente
esse mecanismo pra cartão nativo -- a direção agora é decidida pelo
CardInstance (`frontFieldIndex`/`backFieldIndex`), nunca pela sessão. Como
nenhum dado legado hoje gera um par "normal com reverso" (isso exigiria
um editor que ainda não existe -- explicitamente fora do escopo desta
fase, restrição 7), **todo cartão "Normal" já existente passou a mostrar
sempre na MESMA direção fixa** (a que o `front_is_target_language`
daquela linha já codificava), perdendo a variedade de sessão que tinha
antes. É consequência direta e deliberada da restrição 3, não um bug --
mas muda o que a professora/aluna realmente vê hoje, então precisa ficar
registrado aqui, não só nos comentários do código. Quando um editor
futuro permitir autorar "normal com reverso" de propósito, a variedade
volta -- só que agora como 2 cartões genuinamente independentes (2 FSRS,
2 históricos), não um toggle raso.

**Bug real encontrado e corrigido durante a validação desta fase (não
reportado pela autora -- achado no smoke test de browser real, ver
abaixo):** `buildSpeedOptions()` (Speed Review) tinha um fallback de
distratores por "cartões da mesma unidade" (`STATE.cards.filter(c => c
!== card && c.unitId === card.unitId)`) que nunca filtrava por
`hasPlainFrontBack()`. Cartões nativos SEMPRE compartilham `unitId:
null` entre si (não pertencem a nenhuma unidade) -- então esse
agrupamento tratava TODOS os cartões nativos como "mesma unidade",
inclusive um cloze/"digite a resposta" podendo ser sorteado como
distrator de um cartão 'normal'. Antes da Fase 4 isso nunca quebrava (a
ponte legada sempre populava `back_trans` plano em QUALQUER tipo,
inclusive cloze); depois de 4d, `resolveClozeCardView()`/
`resolveTypeAnswerCardView()` não têm campo `.back`, e `cardAnswerText()`
quebraria tentando ler `view.back.text` de um distrator desse tipo --
exatamente o que o smoke test capturou (TypeError real, não teórico).
Corrigido nos dois pontos de fallback de `buildSpeedOptions()` (pool
principal + extra de `eligibleReviewPool()`), fr+zh, acrescentando
`hasPlainFrontBack(c)` ao filtro -- mesmo critério que `buildSpeedQueue()`
e `startMatchGame()` já aplicavam no pool DE ENTRADA, só que faltava
também no fallback de distratores.

**Segundo achado, sem código pra corrigir (confirmado seguro por
leitura)**: `shared/reports.js` (contexto do modal "Reportar problema",
2 blocos -- modo Flashcard e modo Speed Review) lia `card.front`/
`card.back_hanzi`/`card.back_trans` direto -- campos que não existem
mais num card nativo pós-4d. Envolto em try/catch (nunca quebrava a
tela), mas degradava silenciosamente o contexto do report pra `null`/
`undefined` quando o report era feito durante a revisão de um cartão
nativo. Corrigido pra usar `cardPromptText`/`cardAnswerText` (com
fallback defensivo pro campo antigo, caso essas funções globais não
existam por algum motivo).

**Suítes de teste**: `test_fase4_engine.js` (novo, motor Fase 4a/4b --
`resolveCardField`/`fieldHasAudio`/os 4 resolvers/`buildReversedCardInstancePair`/
`buildEngineCardsFromRow`/`resolveCardContentView`, 32/32) +
`test_fase4d_regression.js` (novo, porta os MESMOS cenários de dado de
entrada de `test_flashcard_model.js` -- Fase 3, agora aposentada porque
testava `legacyFlashcardRowToCard()` que foi deliberadamente deletada --
validados contra a API real de hoje, 30/30). `test_flashcard_model.js`
(Fase 3) fica no disco só como histórico, não é mais executada -- chamar
`legacyFlashcardRowToCard` nela agora dá erro por desenho, não é
regressão. **Smoke test de navegador real** (Playwright, fr+zh, mesmo
padrão exigido pela autora na aprovação da Fase 3): boot em modo
convidado (evita mockar profiles/badges/notificações -- só a sessão
Supabase é stubada, CDN bloqueado neste sandbox) + injeção direta dos 5
Card Types em `STATE.cards` (normal, normal-invertido com áudio custom,
múltipla escolha, cloze, "digite a resposta" sintético -- nenhum dado
legado gera esse tipo hoje) + par "normal com reverso" via
`buildReversedCardInstancePair` + `startReviewSession()`/`renderReviewView()`
reais rodando ponta a ponta pra cada um. Confirmado: fila de revisão
inclui todos os cartões injetados; par invertido com 2 ids distintos e
FSRS genuinamente independente; nenhum "undefined" vazando em nenhum
HTML renderizado, nos 5 tipos, nos 2 idiomas; múltipla escolha renderiza
opções e o clique+"Continuar" dispara `gradeCurrentCard()` de verdade
(due/reps mudam); cloze renderiza a lacuna; áudio próprio aparece
corretamente no lado invertido (mesmo comportamento `||`-fallback que a
ponte antiga tinha, replicado de propósito); `hasPlainFrontBack` exclui
cloze/type_answer corretamente; `ANKI_EXPORT_CONFIG.cards('all')` exclui
cloze e inclui normal; `buildSpeedOptions()` não quebra mais com pool
misto (confirma o fix acima); mecanismo `nextCardDirection` continua
presente (trilha inalterada). **Zero erro de JavaScript no console em
nenhum dos dois idiomas** (só 2-3 avisos de rede `ERR_TUNNEL_CONNECTION_FAILED`,
mesma limitação de proxy de saída já documentada neste arquivo, não
relacionada ao código).

**Utilitário construído mas não usado no final, registrado por
transparência**: `fieldHasAudio()` (Fase 4a) foi pensado pra decidir
elegibilidade de pronúncia automática consultando `lang` -- mas os
renderizadores finais (4b/4c) acabaram reaproveitando `isStudyLanguageField()`
(já existente desde a Fase 2/3, já aprovada pela autora como "helper pra
regras que genuinamente dependem do idioma do app") em vez de
`fieldHasAudio()`, por operar sobre o mesmo shape `{lang}` com o mesmo
propósito. `fieldHasAudio()` continua no arquivo, testada (32 testes
cobrem ela), mas sem nenhum call site real hoje -- não removida por
enquanto (baixo custo de manter, pode ganhar um chamador quando um
próximo formato precisar da checagem "upload sempre conta, TTS só se
`lang` bate"), mas registrando aqui pra não parecer uma peça esquecida
por acidente.

**Compatibilidade com dados existentes (restrição 8)**: nenhuma
migração de schema, nenhum id/histórico/FSRS alterado. `serializeState()`/
`applySerializedState()` continuam fazendo merge raso por id --
confirmado que isso só depende dos NOMES dos campos FSRS (inalterados,
`shared/fsrs.js` não foi tocado), nunca do formato dos campos de
conteúdo -- o câmbio de shape (campos legados soltos → `note`+
`cardInstance`) é seguro pro progresso real já salvo no Supabase.

**Gratuito x Premium (avaliado, não implementado):** mudança
arquitetural pura, sem nova superfície de produto -- mesma conclusão de
toda fase de infraestrutura sem feature nova visível.

**O que ainda falta / não foi feito nesta fase (de propósito, restrição
7):** novo editor de cartão (é o que permitiria autorar "normal com
reverso"/"digite a resposta"/cloze de verdade pela UI -- hoje só
`buildReversedCardInstancePair`/`resolveTypeAnswerCardView` existem como
motor, sem nenhum formulário que os produza); TTS/AwesomeTTS; templates
customizáveis; novos recursos de criação; mudanças no FSRS; customização
de Card Type. `student_flashcards`/`teacher_flashcards` (as tabelas)
não ganharam nenhuma coluna nova -- é reestruturação do motor que já lê
as colunas existentes, não do schema.

Esta é a Fase 4 completa (4a→4d) de um prompt-mestre que travou
explicitamente "não avance automaticamente" após o checkpoint da 4a --
cumprido (prossegui só depois da própria autorização da autora dizer
"prossiga... sem pedir nova autorização"). Próxima fase só começa depois
de autorização explícita da autora, com este relatório já entregue antes
de pedir luz verde.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 5
(cartões gerados): normal_reversed e Cloze multi-marca atravessam o
pipeline real de geração

Fase 5 nunca teve descrição além do nome antes desta sessão -- travada
como "FASE 5 -- CARTÕES GERADOS: implementar Note → Card Type → Card
Instance(s), especialmente Normal→1 card / Normal com reverso→2 cards
independentes com FSRS próprio, e decidir/explicitar como Cloze gera
cartões quando houver c1/c2/c3 antes de implementar." Só depois de
`AskUserQuestion` (2 perguntas concretas, achados do código real embutidos
nas próprias opções) veio a autorização -- e mesmo assim a autora pediu um
PLANO por escrito (8 pontos + as duas decisões de sintaxe Cloze) antes de
qualquer código, aprovado com 7 ajustes explícitos antes de codar de
verdade.

**Os 7 ajustes da autora, travados antes de codar (cumpridos nesta
entrega):**
1. `cardGenerationMode` explícito tem prioridade sobre a inferência
   legada -- nunca o contrário. Sem coluna SQL definitiva nesta fase; o
   nome físico fica pra Fase 6.
2. Cloze múltiplo aprovado exatamente como proposto -- 1 Field de texto,
   múltiplos `cN` no mesmo Field, 1 CardInstance independente por `cN`,
   FSRS próprio, ids `${cardId}-${markId}`. Sintaxe interna
   `{{cN::texto}}`/`{{cN::texto|compareAnswer}}` -- a professora NUNCA
   digita isso à mão, é trabalho do editor visual da Fase 6.
3. Se o Field contiver marcação nativa `{{cN::...}}`, ela é a ÚNICA fonte
   de verdade -- nunca misturar com `cloze_answer`/`cloze_answer_pinyin`
   legados da mesma linha.
4. "Os dois formatos coexistem pra sempre" NÃO é requisito definitivo --
   só "preservar dado legado + não migrar destrutivamente nesta fase". Se
   um dia tudo migrar pro formato nativo, é decisão de uma fase futura,
   não travada aqui.
5. Teste de persistência precisa verificar explicitamente: ids diferentes
   pra c1/c2, FSRS próprio de cada um, mutar um não afeta o outro,
   reload preserva os dois separadamente.
6. `normal_reversed` precisa ser exercitado pelo caminho REAL
   (`interpretNoteFromRow()` → `buildReversedCardInstancePair()` → 2
   CardInstances) -- não só um teste direto da função isolada. Isso é o
   próprio objetivo da fase: provar que a informação de tipo atravessa o
   pipeline de geração inteiro.
7. Nada de editor, checkbox, seletor de tipo na UI, coluna SQL
   definitiva, rich text, botão Cloze, interface de pinyin, ou qualquer
   outra parte da Fase 6 -- só o motor de geração/persistência e os
   testes necessários.

**O que foi feito, tudo em `shared/flashcard-model.js` (único arquivo
tocado):**

- **`cardGenerationMode`** -- `interpretNoteFromRow()` ganhou uma checagem
  no topo: se `row.cardGenerationMode` for um dos 4 valores reconhecidos
  (`normal`/`normal_reversed`/`multiple_choice`/`cloze`), ele decide o
  tipo, sobre a inferência implícita de sempre (`cloze_sentence`
  populado→cloze, `choices` populado→mc, senão→normal). Nenhuma linha
  real hoje tem esse campo (não existe coluna SQL pra ele) -- 100% do
  dado legado cai sempre no caminho de inferência, comportamento
  idêntico a antes desta fase. `cloze`/`multiple_choice` já eram
  auto-descritivos pelos próprios dados (`cloze_sentence`/`choices`); é
  só `normal_reversed` quem genuinamente PRECISA do campo, porque nada
  no dado consegue sinalizar "sou reversível" sozinho.
- **`normal_reversed` wireado no caminho real** -- depois de montar
  `fields`/`frontFieldIndex`/`backFieldIndex` (mesmo código de sempre pro
  par normal/MC), se `explicitMode === 'normal_reversed'`,
  `interpretNoteFromRow()` chama `buildReversedCardInstancePair(cardId,
  frontFieldIndex, backFieldIndex)` (função já existente desde a Fase
  4a, agora finalmente invocada por dentro da função de produção, não
  isolada) e devolve os 2 CardInstances direto. Testado explicitamente
  via `buildEngineCardsFromRow()` (o caminho que STATE.cards de verdade
  usa): 2 cards no array, ids `t9020`/`t9020-b`, front/back trocados
  entre si, FSRS default idêntico nos 2 no nascimento, e mutar
  due/reps/stability de um confirmado NÃO vazando pro outro.
- **Cloze nativo multi-marca** -- detecção estrutural (não depende de
  `cardGenerationMode`): se `cloze_sentence` já contém `{{c\d+::`, é o
  caminho nativo -- gera 1 CardInstance por marca distinta encontrada via
  `parseClozeMarks()`, ids `${cardId}-${markId}` pra TODAS (mesmo com 1
  marca só -- formato novo, nunca colide com dado legado porque o schema
  antigo nunca produziu `{{c` em `cloze_sentence`). Sem `{{c`, cai no
  caminho legado de sempre (`___` + `cloze_answer`), byte a byte
  idêntico ao que já existia -- id sem sufixo, `markId:'c1'` fixo.
- **Sintaxe `{{cN::texto|compareAnswer}}`** -- `splitClozeMarkRaw()`
  (novo) separa, no `::`, o texto que fica embutido na frase (sempre
  mostrado ao revelar) do valor de comparação opcional depois do `|`
  (pinyin no zh). `parseClozeMarks()` agora devolve `{id, answer,
  compareAnswer}` por marca (`compareAnswer:null` quando não há `|`);
  `renderClozeText()` nunca deixa a parte pós-`|` vazar no texto
  renderizado (nem oculto nem revelado) -- só `answer`.
  `resolveClozeCardView()` ganhou a prioridade: `cardInstance.
  compareAnswer` explícito (caminho legado, `cloze_answer_pinyin`) vence
  se presente; senão cai pro `compareAnswer` da própria marca (caminho
  nativo); senão usa o próprio texto da marca (fr sem pinyin, nos dois
  caminhos) -- nunca mistura as duas fontes na mesma nota (ajuste 3).
- Mudança de shape em `parseClozeMarks()` (nova chave `compareAnswer` no
  objeto por marca) quebrou 2 asserções por igualdade estrita de JSON na
  suíte de regressão da Fase 4d (esperado, disclosed no plano antes de
  codar) -- atualizadas pra incluir `compareAnswer: null`, sem mudança
  de comportamento real (só o shape do teste).

**Achado relevante, reportado sem corrigir nesta fase**:
`buildCardFromTeacherFlashcard(row)`/`buildCardFromSelfFlashcard(row)`
(fr/zh `app.js`) chamam `buildEngineCardsFromRow(row, opts)[0]` --
pegam só o PRIMEIRO card do array, e `mergeTeacherFlashcardsIntoState()`/
`mergeSelfFlashcardsIntoState()` empurram só esse 1 card pra
`STATE.cards` por linha. Ou seja: o motor de geração (`shared/
flashcard-model.js`) já sabe produzir 2+ CardInstances por Note (provado
pelos testes desta fase), mas o ponto de consumo em `STATE.cards` ainda
trunca pro primeiro -- se uma linha real algum dia carregar
`cardGenerationMode:'normal_reversed'` ou `cloze_sentence` com 2+ marcas
nativas, só a 1ª CardInstance chegaria de fato à fila de revisão da
aluna, silenciosamente perdendo as demais. **Não é um bug ativo hoje**
(nenhuma linha real produz mais de 1 card, então `[0]` sempre pega tudo)
-- é um ponto de integração que só passa a importar quando o editor da
Fase 6 conseguir gravar essas linhas de verdade. Fora do escopo desta
fase por estar em `fr/app.js`/`zh/app.js`, não em `shared/flashcard-
model.js` (o único arquivo que as 7 restrições autorizavam tocar) --
registrando aqui explicitamente pra não virar surpresa na Fase 6: o
loop de merge vai precisar iterar o array inteiro (`.forEach`), não só
pegar `[0]`.

**Decisões arquiteturais desta fase:**
1. `cardGenerationMode` mora como propriedade normalizada do objeto de
   entrada (`row`), lida defensivamente -- não uma coluna SQL real ainda.
   Funciona hoje só com linhas construídas em teste; funcionará sem
   nenhuma mudança de código quando a Fase 6 escrever uma coluna real
   com esse nome (ou outro -- o nome físico é decisão da Fase 6, este
   código só lê `row.cardGenerationMode`, agnóstico à origem do campo).
2. Detecção de Cloze nativo é ESTRUTURAL (regex sobre o conteúdo), não
   via `cardGenerationMode` -- um texto com `{{c` já se autodescreve,
   não precisa de um campo extra dizendo "isto é cloze".
   `cardGenerationMode` só é load-bearing pra `normal_reversed`.
3. Zero mudança em `buildEngineCardsFromRow()`/`resolveCardContentView()`
   -- ambos já operavam sobre array de qualquer tamanho desde a Fase 4b,
   confirmando de novo a aposta arquitetural de "um motor só" (mesma
   conclusão já registrada em várias fases anteriores desta feature).
4. Nenhuma migração, nenhuma mudança de schema, nenhuma mudança em
   `fr/app.js`/`zh/app.js`/qualquer renderer -- 100% contido em
   `shared/flashcard-model.js`, exatamente como as 7 restrições pediam.

**Gratuito x Premium (avaliado, não implementado):** mudança de motor
pura, sem nova superfície de produto -- mesma conclusão de toda fase de
infraestrutura desta feature.

**Testes realizados:** `node --check` sem erro. Suíte nova
`test_fase5_generation.js` (43 cenários): `cardGenerationMode` ausente →
dado legado 100% inalterado (id, `cardTypeId`, `displayAnswerText`);
`cardGenerationMode` reconhecido vence a inferência mesmo quando os dados
"pareceriam" outro tipo (linha com `choices` forçada pra `normal`);
`cardGenerationMode` não reconhecido cai na inferência sem quebrar;
`normal_reversed` via `interpretNoteFromRow`+`buildEngineCardsFromRow`
reais -- 2 cards, ids corretos, front/back trocados, FSRS independente
(mutação testada nos dois sentidos); Cloze multi-marca fr (2 marcas sem
`|`) -- 2 CardInstances, ids `-c1`/`-c2`, `compareAnswerText` cai no
próprio texto, FSRS independente; Cloze nativo zh (1 marca com `|pinyin`)
-- `displayAnswerText` é o hanzi, `compareAnswerText` é o pinyin, e o
pinyin confirmado NUNCA vazando no texto que `renderClozeText()`
realmente produz (nem oculto nem revelado); marca nativa confirmada
ignorando `cloze_answer`/`cloze_answer_pinyin` legados da mesma linha
(ajuste 3, valores-sentinela no teste que nunca deveriam aparecer,
confirmados ausentes); teste de persistência dedicado (ajuste 5) --
serializa/reconstrói uma nota com 2 marcas simulando reload real via
merge-por-id (mesmo mecanismo de `applySerializedState()`), confirma
ids diferentes, progresso de c1 preservado (due/reps/stability), c2
continua intocado. Suítes anteriores re-executadas sem regressão:
`test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30 (2
asserções atualizadas pro novo shape de `parseClozeMarks`, disclosed
acima, sem mudança de comportamento real). Não foi feita validação de
navegador (Playwright) nesta fase -- não fazia sentido pro escopo (motor
puro, sem nenhum dado real ou caminho de UI capaz de produzir
`normal_reversed`/Cloze multi-marca hoje; o smoke test de browser da
Fase 4 já cobriu o caminho legado, que continua bit-a-bit idêntico).

**O que ficou de fora nesta entrega original (de propósito, restrição
7):** editor visual; checkbox/seletor de tipo em qualquer UI; coluna SQL
real pra `cardGenerationMode`; rich text; botão "Cloze" de
selecionar-texto; interface de definir pinyin sem expor sintaxe. O loop
de merge em `fr/app.js`/`zh/app.js` continuar truncando pro primeiro
card foi relatado como um achado a resolver -- a autora recusou
explicitamente deixar isso pra Fase 6, ver fechamento abaixo.

## Fase 5 (fechamento) -- `build...From...()` deixa de truncar pro
primeiro CardInstance, `STATE.cards` passa a carregar 1..N por nota

A autora aprovou o motor da Fase 5, mas recusou deixar pendente um ponto
que eu tinha relatado como "não é bug ativo hoje, mas é ponto de
integração da Fase 6": `buildCardFromTeacherFlashcard()`/
`buildCardFromSelfFlashcard()` (fr/zh `app.js`) ainda pegavam só
`array[0]` do resultado de `interpretNoteFromRow()`/
`buildEngineCardsFromRow()` -- o motor já sabia produzir `normal_reversed`
→ 2 CardInstances e Cloze multi-marca → 2+ CardInstances, mas o
consumidor real descartava tudo além do primeiro. Instrução literal:
"A Fase 5 deve terminar com o pipeline de geração capaz de transportar
1..N CardInstances até `STATE.cards`", com 9 restrições (não alterar a
arquitetura Note/CardInstance; não criar UI; não criar coluna SQL; não
alterar o editor; não alterar FSRS; não criar bridge/shape legado novo) e
o contrato-alvo explícito: `build...From...() → Card[]`, com o merge
fazendo o flatten apropriado pra `STATE.cards`.

**Contrato antes/depois, `fr/app.js` e `zh/app.js` (os dois espelhados,
idênticos na estrutura):**

```js
// ANTES -- truncava pro primeiro CardInstance
function buildCardFromTeacherFlashcard(row){
  return buildEngineCardsFromRow(row, { origin:'teacher', appKey:APP_KEY, idPrefix:'t' })[0];
}
// DEPOIS -- devolve o array completo, contrato build...() -> Card[]
function buildCardFromTeacherFlashcard(row){
  return buildEngineCardsFromRow(row, { origin:'teacher', appKey:APP_KEY, idPrefix:'t' });
}
```

Mesma mudança em `buildCardFromSelfFlashcard()`. As 4 funções que
consomem esses builders foram ajustadas pra lidar com array em vez de
card único:

- **`mergeTeacherFlashcardsIntoState()`/`mergeSelfFlashcardsIntoState()`**
  -- de checar 1 id "representante" por linha (`flashcardIdForRow`)
  contra `existingIds`, pra iterar CADA card devolvido pelo builder e
  checar/empurrar por id individual. Necessário porque o id
  "representante" de uma linha de Cloze nativo multi-marca
  (`t${row.id}`, sem sufixo) nunca corresponde a nenhum card real
  (todos os ids reais saem sufixados `-c1`/`-c2`) -- o check antigo nunca
  bateria, o que duplicaria cartões numa hipotética 2ª chamada de merge
  na mesma sessão.
- **`addSelfFlashcardToState(row)`** -- de 1 check + 1 `.push()` de um
  card único, pra iterar todos os cards do array e empurrar cada um
  individualmente. Sem este fix, a mudança de contrato faria este ponto
  empurrar o ARRAY INTEIRO como um único elemento corrompido de
  `STATE.cards` -- achado proativo, não pedido explicitamente pela
  autora, mas necessário pra a mudança de contrato não quebrar a criação
  de cartão na mesma sessão (Fase 5 do sistema de alunas particulares).
- **`updateSelfFlashcardStatusInState(rowId, status)`** -- de `.find()`
  (só atualiza o primeiro card que bate o `rowId`) pra `.forEach()`
  (atualiza TODOS os cards que compartilham aquele `rowId`). Necessário
  porque múltiplos CardInstances (as 2 metades de um `normal_reversed`,
  ou `c1`/`c2`/... de um Cloze multi-marca) agora compartilham o mesmo
  `rowId` -- `.find()` deixaria os cards seguintes com `flashcardStatus`
  desatualizado dentro da mesma sessão (autocorrigia no próximo reload,
  mas era uma inconsistência real enquanto isso).
- **`removeSelfFlashcardFromState(rowId)`** -- já usava `.filter()`,
  que lida corretamente com múltiplos cards do mesmo `rowId` sem
  nenhuma mudança.
- **`replaceSelfFlashcardInState(rowId, updatedRow)`** -- já chama
  `removeSelfFlashcardFromState` seguido de `addSelfFlashcardToState`,
  os dois já corrigidos -- nenhum fix separado necessário, a correção
  já cascateia.

**Testes realizados**, exatamente como a autora exigiu -- suíte Node
completa + testes de regressão + smoke test de navegador real, nos dois
idiomas:

- `node --check fr/app.js`/`zh/app.js` sem erro.
- Suíte Node completa re-executada, sem nenhuma regressão (esperado --
  as 3 suítes só exercitam `shared/flashcard-model.js`, não tocado nesta
  correção): `test_fase4_engine.js` 32/32, `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 43/43 -- **105/105**.
- **Smoke test de navegador real** (Playwright, fr+zh, modo convidado,
  CDN do Supabase stubado, `fetchFlashcardsForCurrentStudent`/
  `fetchMyOwnFlashcards` monkey-patchadas com fixtures sintéticas
  cobrindo os 6 cenários exigidos: normal→1, normal_reversed→2, cloze
  c1+c2→2, múltipla escolha→1, "digite a resposta"→1, cloze legado de
  uma lacuna só→1) -- resultados reais, capturados da execução:
  - **fr**: `teacherCardCount:7` (ids `t80001, t80002, t80002-b,
    t80003-c1, t80003-c2, t80004, t80005`) -- confirma normal(1) +
    normal_reversed(2) + cloze-multi(2) + mc(1) + cloze-legado(1) = 7;
    `teacherCardCountAfterSecondMerge:7` (idempotente, sem duplicar
    numa 2ª chamada de merge); `selfCardCount:7`;
    `totalCardCountAfterBothMerges:14`; `reversedBothPresent:true`,
    `reversedIdsDistinct:true`, `reversedFsrsIndependent:true`;
    `clozeMultiBothPresent:true`, `clozeMultiIdsDistinct:true`,
    `clozeMultiFsrsIndependent:true`; `normalSingleCard:1`,
    `mcSingleCard:1`, `legacyClozeSingleCard:1`,
    `legacyClozeIdUnsuffixed:true` (confirma que o legado continua sem
    sufixo, id idêntico a antes); **cartão pré-existente preservado**:
    `preExistingCardStillPresent:true`, `preExistingCardIdUnchanged:true`,
    `preExistingCardNotDuplicated:true`,
    `preExistingCardProgressPreserved:true` (due:33/reps:2 preservados
    exatamente -- nenhum cartão legado desaparece, muda de id ou perde
    progresso); `addSelfReversedCount:2`,
    `addSelfReversedIds:["s90002","s90002-b"]` (confirma o fix de
    `addSelfFlashcardToState` na mesma sessão, sem reload);
    `allArchivedAfterUpdate:true` (confirma o fix de
    `updateSelfFlashcardStatusInState`, as 2 metades arquivadas juntas).
    2 erros de console, ambos `ERR_TUNNEL_CONNECTION_FAILED`
    pré-existentes (proxy de saída deste sandbox, já documentado em
    toda a sessão, não deste código).
  - **zh**: mesmos resultados/flags, todos `true`, `teacherCardCount:5`
    (fixture zh sem mc/cloze-legado), `addSelfReversedIds:["s90002",
    "s90002-b"]`, `allArchivedAfterUpdate:true`. 3 erros de console,
    mesmo padrão pré-existente.

**Decisão arquitetural desta correção**: nenhuma bridge/shape legado
novo foi criada (restrição 9) -- o merge só passou a iterar o que o
motor já produzia desde a Fase 5 original; nenhuma mudança em
`shared/flashcard-model.js` (motor intocado); nenhuma UI, coluna SQL,
editor ou FSRS tocados (restrições 5-8). O mecanismo de persistência
(merge-por-id em `applySerializedState()`, já existente desde a Fase 0
do sistema de alunas particulares) não precisou de nenhuma mudança --
funciona automaticamente pra N cards por nota desde que cada
CardInstance tenha id estável e único, o que já era garantido pelo
motor da Fase 5 original.

Com esta correção, a Fase 5 está encerrada -- pipeline completo
(Note→CardType→CardInstance(s)→`STATE.cards`) capaz de transportar 1..N
cards por nota, sem nenhuma ponte/atalho temporário. Próxima fase (6 --
editor visual) só começa depois de autorização explícita da autora --
não avançar automaticamente.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 6A
(auditoria do editor atual, só leitura) + Fase 6B (Note nativa: fields +
card_generation_mode persistidos no motor, `type_answer` completo)

**Fase 6A (auditoria, sem código)** -- mapeamento completo do editor atual
(`shared/admin-flashcards.js`/`shared/my-flashcards.js`) contra o modelo
Note/Field/CardType pretendido. Achado central: o editor hoje nunca passa
por `shared/flashcard-model.js` -- escreve direto nas colunas legadas
(`front`/`back_trans`/`cloze_sentence`/`choices`/etc.) via
`createFlashcard()`/`createOwnFlashcard()`, sem nenhum conceito de Field/
CardType. O motor (Fase 4/5) já sabia interpretar `cardGenerationMode` e
Cloze nativo multi-marca, mas nada no editor podia produzir uma linha
assim -- motor e editor evoluíram em paralelo, sem se tocar. Relatório
completo (14 pontos: campos atuais, mapa pro modelo novo, UX por Card
Type, fluxo de Cloze visual, compareAnswer no zh, proposta de
persistência, compatibilidade, Preview, impacto em cada arquivo, riscos)
entregue e revisado pela autora, que corrigiu a arquitetura em 8 pontos
antes de autorizar código -- ver Fase 6B abaixo pra tudo que foi
efetivamente implementado.

**Escopo da Fase 6B, travado explicitamente pela autora**: só
`shared/flashcard-model.js` (camada de modelo/motor). Nada de editor,
UI, rich text, TTS, comportamento visual de áudio/imagem, Preview, ou
migration SQL executada nesta entrega -- confirmado no `git status` ao
final: **só `shared/flashcard-model.js` foi tocado**.

**O que foi feito:**

- **Note nativa: `fields` + `card_generation_mode`, sempre pareados** --
  `isNoteFieldsPresent(row)`/`isCardGenerationModePresent(row)` (novos)
  decidem se uma linha é nativa; `validateNativeNoteRow(row)` valida a
  estrutura inteira ANTES de qualquer geração (nunca confia só no CHECK
  constraint proposto pra migration, ainda não aplicada): pareamento
  ambos-ou-nenhum, `fields` array não vazio, `card_generation_mode`
  reconhecido, todo Field com `id`, ids únicos dentro da Note,
  `pinyinFieldId` sempre apontando pra um Field real da mesma Note, e
  (novo achado, ver abaixo) pelo menos 2 "slots" de conteúdo pros 4 modos
  posicionais. `interpretNoteFromRow()` chama essa validação e **lança um
  Error de verdade** pra Note nativa inválida (não degrada silenciosamente
  -- não existe hoje nenhum dado real que possa disparar isso, já que não
  há editor ainda, então falhar alto é seguro e correto nesta fase).
- **`role` NÃO decide direção** (correção explícita da autora em relação
  à minha proposta original da Fase 6A/6B-primeira-versão, que sugeria
  `role:'front'`/`'back'` como fallback) -- `normal`/`normal_reversed`/
  `type_answer`/`cloze` são **sempre posicionais** (nunca consultam
  `role`); só `multiple_choice` usa `role` (`'prompt'`/`'answer'`/
  `'distractor'`), porque é o único tipo com mais de 2 Fields
  semanticamente distintos -- posição sozinha não bastaria pra
  desambiguar prompt/answer/1-3 distratores.
- **Achado corrigido ANTES de escrever os testes, não depois**: a
  primeira versão do código posicional usava índices fixos `0`/`1` pra
  front/back -- funciona pra uma Note fr simples (2 Fields), mas quebra
  pra uma Note zh nativa de 3 Fields (hanzi+pinyin+tradução, mesmo
  formato que o caminho legado já usa) -- `back` cairia no Field de
  PINYIN (índice 1) em vez da tradução (índice 2). Corrigido com
  `contentFieldIndices(rawFields)` (novo) -- pula qualquer Field que seja
  alvo do `pinyinFieldId` de outro Field ao montar a lista de "slots" de
  conteúdo (mesmo espírito de `audio`/`image`: um Field de pinyin é
  satélite de outro Field, nunca uma posição própria). Pra uma Note fr de
  2 Fields (sem pinyin), `contentFieldIndices` devolve `[0,1]`,
  comportamento idêntico ao design original. Pra uma Note zh de 3 Fields,
  devolve `[0,2]` -- front=hanzi, back=tradução, pulando o pinyin do
  meio, igual ao legado. Testado explicitamente (normal zh 3-fields,
  normal_reversed zh confirmando que o pareamento hanzi/pinyin sobrevive
  à troca de lado -- metade B tem `back`=hanzi com pinyin resolvendo
  certo, não perde a informação).
- **`buildNativeRuntimeFields(rawFields)`** (novo) -- converte
  `row.fields` (persistido, `pinyinFieldId` por ID ESTÁVEL) pro shape
  runtime que `resolveCardField()` já consumia sem NENHUMA mudança
  (`pinyinFieldIndex` por índice) -- traduz id→índice uma vez, na
  leitura. Continua válido mesmo se a ordem dos Fields mudar no editor
  (testado explicitamente: pinyin ANTES do hanzi no array persistido,
  resolve corretamente do mesmo jeito).
- **5 Card Types gerados nativamente** (`interpretNativeNoteFromRow`,
  novo): `normal`, `normal_reversed` (via `buildReversedCardInstancePair`,
  já existente desde a Fase 4a, reaproveitada sem mudança), `cloze` (via
  Field nativo em vez da coluna `cloze_sentence` -- mesmo
  `parseClozeMarks`/`renderClozeText` da Fase 5, sem nenhuma mudança),
  `multiple_choice` (via `role`, com **validação de cardinalidade no
  motor, não só na UI** -- `validateMultipleChoiceFields()`: exatamente 1
  `role:'prompt'`, exatamente 1 `role:'answer'` nunca no mesmo Field, 1 a
  3 `role:'distractor'`), e **`type_answer`** (novo, ver abaixo).
- **`type_answer` completo, incluído nesta fase como a autora exigiu** --
  `cardGenerationMode:'type_answer'` → CardInstance (`promptFieldIndex`/
  `answerFieldIndex`) → `resolveTypeAnswerCardView()` (existente desde a
  Fase 4a, ganhou uma linha nova) → renderer já existente
  (`renderTypeAnswerReviewCard`, fr+zh, construído na Fase 4 mas nunca
  alcançável por dado real até agora). **compareAnswer pro zh reaproveita
  o MESMO pareamento hanzi/pinyin que Normal já usa via
  `pinyinFieldIndex`** -- não um canal de comparação novo: a cadeia de
  prioridade agora é `cardInstance.compareAnswer` explícito (mantido por
  compatibilidade com o teste da Fase 4a que já testava isso) → senão
  `answer.pinyinText` (novo) → senão `displayAnswerText`. Testado fr (sem
  pinyin, cai pro texto) e zh (com `pinyinFieldId`, resolve pro pinyin)
  como a autora pediu explicitamente ("faça testes específicos para os
  dois casos"). `type_answer` é 100% nativo -- nenhum dado legado jamais
  representou "digite a resposta", então não existe (nem precisa existir)
  um caso correspondente no ramo `else` (legado).
- **Imagem virou propriedade do Field** (decisão revisada explicitamente
  pela autora -- minha proposta original da rodada anterior mantinha
  imagem só no nível da Note; ela rejeitou: "o renderer atual poder
  tratar imagem como propriedade global é uma limitação do renderer
  legado, não uma razão pra perpetuar isso no modelo nativo").
  `buildNativeRuntimeFields()` carrega `field.image` através sem
  transformação (só modelagem/persistência, **nenhuma mudança de
  `resolveCardField()`/renderer** -- confirmado deliberadamente: estender
  `resolveCardField()` pra expor `imageUrl` quebraria várias asserções de
  shape exato já existentes em `test_fase4_engine.js`, e não era
  necessário pra "modelar e persistir corretamente" -- só pra uma
  lógica visual que é explicitamente Fase 6C/D). `note.image`
  (Note-level) continua existindo só pro caminho LEGADO, nunca populado
  pelo caminho nativo (`image: null` fixo em `interpretNativeNoteFromRow`).
  Testado que imagem/áudio ficam genuinamente independentes por Field
  (um Field com imagem e sem áudio, outro com áudio e sem imagem, nenhum
  vaza pro outro).
- **Áudio TTS explícito modelado, sem efeito de runtime novo** --
  `field.audio` (`{source:'upload',url,...}` ou `{source:'tts',enabled}`)
  é passado através sem transformação; `resolveCardField()` já lê `.url`
  defensivamente, então `source:'tts'` (sem url, porque é gerado em
  runtime) corretamente nunca produz `audioUrl` automático -- comportamento
  correto sem precisar de nenhuma mudança na função. Testado
  explicitamente.
- **Mecanismo `row.cardGenerationMode` (camelCase) da Fase 5 RETIRADO** --
  achado importante, não presumido: a Fase 5 permitia `normal_reversed`
  sobre colunas legadas SOLTAS (sem `fields`), via um campo camelCase que
  a própria Fase 5 já registrava como provisório ("o nome físico da
  coluna fica pra Fase 6"). A Fase 6B decide o nome real
  (`card_generation_mode`, snake_case) e trava que ele SEMPRE anda
  pareado com `fields` -- o estado que o mecanismo antigo produzia
  (`card_generation_mode` setado, `fields` ausente) virou EXPLICITAMENTE
  INVÁLIDO pela nova regra de pareamento. Manter os 2 mecanismos vivos ao
  mesmo tempo criaria duas fontes de verdade pro mesmo conceito -- por
  isso retirado do motor, não deixado como código morto. Nenhuma linha
  real jamais usou o campo camelCase (a própria Fase 5 já confirmava
  isso), então a retirada não tem impacto em produção. Os 2 cenários de
  teste da Fase 5 que exercitavam esse mecanismo
  (`test_fase5_generation.js`) foram **repropostos**, não só apagados --
  agora testam exatamente o novo estado inválido (`card_generation_mode`
  sem `fields`, e vice-versa) sendo rejeitado, que é um dos cenários que
  a autora pediu explicitamente pra esta fase.

**Testes realizados:**

- **`node --check shared/flashcard-model.js`** sem erro.
- **4 suítes Node, 169/169 passando**: `test_fase4_engine.js` 32/32,
  `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33
  (2 cenários repropostos, ver acima -- confirmando que nenhuma linha
  real jamais usava o mecanismo retirado), `test_fase6b_native_notes.js`
  74/74 (novo -- cobre TODOS os cenários pedidos explicitamente pela
  autora: pareamento fields/card_generation_mode nos dois sentidos
  rejeitado; normal nativo fr sem role e zh com pinyin 3-fields;
  normal_reversed nativo fr e zh -- este último confirmando que o
  pareamento pinyin sobrevive à troca de lado; múltipla escolha com 1, 2
  e 3 distractors válidos; múltipla escolha inválido -- sem prompt, sem
  answer, 0 distractors, 4 distractors, role conflitante -- todos os 5
  rejeitados pelo motor, não só pela UI; Cloze nativo marca única e
  multi-marca, fr e zh com compareAnswer embutido; type_answer fr e zh;
  pinyinFieldId válido, inválido, e sobrevivendo a uma reordenação física
  do array `fields`; imagem e áudio armazenados independentemente por
  Field, inclusive TTS explícito nunca produzindo `audioUrl` automático;
  regressão confirmando que dado legado continua 100% intocado).
- **Smoke test de navegador real** (Playwright, fr+zh, mesmo padrão de
  sempre -- modo convidado, CDN do Supabase stubado,
  `fetchFlashcardsForCurrentStudent` monkey-patchada com 5 linhas
  nativas sintéticas, uma por Card Type) -- prova que
  `mergeTeacherFlashcardsIntoState()`/`buildCardFromTeacherFlashcard()`
  (fr/zh `app.js`, **nenhuma mudança nesta fase**) absorvem o caminho
  nativo de graça, exatamente como o fechamento da Fase 5 previa:
  `STATE.cards` recebeu os 7 cards esperados (normal + 2×reversed + mc +
  2×cloze-multi + type_answer) nos dois idiomas, idempotente numa 2ª
  chamada de merge, `origin:'teacher'` em todos, conteúdo resolvido
  corretamente pra cada tipo (incluindo zh: front=hanzi correto, cloze
  revelando hanzi via compareAnswer=pinyin, type_answer
  displayAnswerText=hanzi/compareAnswerText=pinyin), e
  `hasPlainFrontBack()` (Fase 4b, intocada) continuando a incluir
  normal/mc e excluir cloze/type_answer corretamente também pro caminho
  nativo. Zero erro de console novo nos dois idiomas -- só os mesmos 2-3
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes (proxy de saída deste
  sandbox, documentado em toda a sessão, não relacionado a este código).

**Achado reportado, não corrigido nesta entrega (fora do escopo "só
`shared/flashcard-model.js`" que a autora travou)**: `mergeTeacherFlashcardsIntoState()`/
`mergeSelfFlashcardsIntoState()` (fr/zh `app.js`) chamam
`buildCardFromTeacherFlashcard(row)`/`buildCardFromSelfFlashcard(row)`
dentro de um `.forEach()` SEM `try/catch` -- como `interpretNoteFromRow()`
agora pode **lançar** pra uma Note nativa inválida (decisão desta fase,
ver acima), uma ÚNICA linha nativa malformada quebraria o `forEach`
inteiro, derrubando o carregamento de TODOS os cartões daquela
conta/idioma (nativos E legados) no boot do app -- não só o cartão
problemático. Hoje isso é inofensivo (nenhuma linha real tem `fields`
populado, nenhum editor existe ainda pra escrever uma nativa por engano),
mas vale endereçar antes do editor (Fase 6D) existir de verdade -- fica
como candidato explícito pra Fase 6C (que já vai mexer no caminho de
merge/renderer) ou uma fase própria, não corrigido agora porque exigiria
tocar em `fr/app.js`/`zh/app.js`, fora do escopo que a autora travou
("nesta entrega quero somente a camada de modelo/motor").

**O que ficou de fora nesta entrega, de propósito (restrição explícita da
autora):** editor visual; checkbox/seletor de tipo em qualquer UI; rich
text; TTS de verdade (só modelado, sem gerar áudio); novo comportamento
visual de áudio/imagem; Preview; migration SQL **não executada** (proposta
pronta, revisada e aprovada na rodada anterior, aguardando autorização
explícita pra rodar).

Antes de qualquer migration: pare. A autora pediu explicitamente relatório
+ parada antes de tocar no banco -- nenhuma chamada ao Supabase foi feita
nesta entrega.

Próxima etapa (rodar a migration `fields`/`card_generation_mode` +
CHECK constraints, conforme já revisada e aprovada na rodada anterior) só
acontece depois de autorização explícita da autora pra isso especificamente
-- distinta da autorização de código desta entrega.

**Atualização: migration `045` aprovada e aplicada (2026-09-25).** A
autora aprovou a proposta exatamente como revisada (`fields jsonb NULL` +
`card_generation_mode text NULL` nas duas tabelas, CHECK de pareamento,
CHECK fechado do enum de 5 valores, sem validação estrutural adicional em
SQL, sem backfill) e pediu execução com validação pós-migration em 7
pontos, usando transação/rollback pros testes de rejeição pra não deixar
dado de teste no banco -- e travou explicitamente "NÃO avance para a Fase
6C" depois.

**Migration aplicada AO VIVO** via `mcp__Supabase__apply_migration`,
projeto `eigjocalzwamisgqilhg`, arquivo
`shared/supabase_migrations/045_add_native_note_fields_to_flashcards.sql`
(já commitado antes, byte a byte igual ao que rodou). Snapshot antes:
`teacher_flashcards` 5 linhas (hash agregado `254729e4...`), `own_flashcards`
7 linhas (hash `34a7b80c...`).

**Validação pós-migration, os 7 pontos pedidos:**
1. Schema confirmado via `information_schema.columns` -- `fields`
   (jsonb, nullable) e `card_generation_mode` (text, nullable) presentes
   nas duas tabelas.
2. `NULL`/`NULL` continua válido pra todo registro legado -- 5/5 linhas
   de `teacher_flashcards` e 7/7 de `own_flashcards` com os dois campos
   `NULL`.
3. Note nativa válida persiste com sucesso -- insert de teste (2 Fields,
   `card_generation_mode:'normal'`) dentro de `BEGIN`/`ROLLBACK`: o
   `RETURNING` confirmou o insert passando pelas duas CHECK constraints
   (id 6 gerado), e a consulta pós-`ROLLBACK` confirmou zero linha
   remanescente (`total:5`, `leftover_test_rows:0`).
4. `fields` preenchido + `card_generation_mode NULL` -- rejeitado,
   `23514 check_violation` em `teacher_flashcards_fields_paired`, nada
   commitado.
5. `fields NULL` + `card_generation_mode` preenchido -- rejeitado, mesma
   constraint (`teacher_flashcards_fields_paired`), simétrico ao ponto 4.
6. `card_generation_mode` fora dos 5 valores (`'invalid_mode_xyz'`) --
   rejeitado por uma constraint DIFERENTE
   (`teacher_flashcards_card_generation_mode_check`), confirmando que as
   duas CHECKs disparam de forma independente e correta cada uma pro seu
   caso.
7. Nenhum registro existente foi alterado -- hash agregado + contagem
   pós-migration IDÊNTICOS ao snapshot pré-migration nas duas tabelas
   (`teacher_flashcards`: 5 linhas, hash `254729e4...`; `own_flashcards`:
   7 linhas, hash `34a7b80c...`), e varredura final confirma
   `leftover_test_rows:0` -- nenhum dos 4 inserts de teste (1 válido + 3
   de rejeição) deixou rastro.

**Testes do motor + smoke test, re-executados sem nenhuma mudança de
código**: as 4 suítes Node (`test_fase4_engine.js` 32/32,
`test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
`test_fase6b_native_notes.js` 74/74 -- **169/169**) e o smoke test de
navegador real (`fase6b_native_smoke.js`, Playwright fr+zh) -- resultados
idênticos à rodada anterior (7 cards cada idioma, ids/FSRS/conteúdo
corretos, `hasPlainFrontBack` correto, idempotência confirmada), mesmos
`ERR_TUNNEL_CONNECTION_FAILED` pré-existentes no console (proxy de saída
do sandbox), nenhum erro novo. Esperado -- a migration só torna a coluna
disponível no banco real, o motor/testes já validavam a lógica sobre
linhas construídas em memória desde a entrega anterior.

**Escopo desta entrega**: só a migration aplicada + validação -- nenhuma
alteração de código/UI (`git status` confirma árvore de trabalho limpa
antes e depois desta rodada, além do arquivo da migration já commitado
na rodada anterior).

Parando aqui conforme instrução explícita -- **Fase 6C (renderer +
Preview) NÃO iniciada**, aguardando autorização separada da autora.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 6C
(auditoria do renderer + proposta técnica de `localState`, AINDA NÃO
IMPLEMENTADA)

**Objetivo da fase, travado pela autora**: eliminar a dependência
estrutural do renderer atual em mecanismos legados e preparar um renderer
ÚNICO usado tanto pelo Review real quanto pelo Preview do editor (Fase
6D, ainda não iniciada) -- "Preview e Review devem usar o MESMO
renderer", nunca dois renderers/HTML/lógica de reveal/alternativas/áudio/
Cloze duplicados. Pedido explícito: só auditoria + proposta nesta rodada,
zero código alterado -- confirmado `git status` limpo nas duas entregas
que compõem esta fase (auditoria inicial e este refinamento).

### 1. Auditoria completa do Review atual

**Call graph mapeado:**
```
startReviewSession()                                    [SESSÃO]
  -- monta STATE.reviewQueue, decide reviewDirection SÓ pra cartão legado
  -- (nextCardDirection() só roda quando !c.cardInstance -- confirmado
  --  que cartão nativo NUNCA recebe reviewDirection, restrição da Fase 4
  --  continua 100% respeitada hoje, sem precisar de mudança)
  -> renderReviewView()                                  [DISPATCHER]
     -- estados vazios/fim-de-sessão: pura tela de status, session-owned
     -- dispatch por card.cardInstance.cardTypeId:
        multiple_choice -> renderMultipleChoiceReviewCard(card)
        type_answer     -> renderTypeAnswerReviewCard(card)
        cloze           -> renderClozeReviewCard(card)
        normal (default)-> bloco INLINE dentro do próprio renderReviewView()
                           (achado: "normal" não tem função própria hoje --
                            único tipo sem render dedicado)
     -> cada render*: resolveCardContentView(card) [MODEL, já limpo]
                    -> innerHTML em #review-content (id FIXO, 1 instância só)
                    -> lê/escreve STATE.review* pra saber "já respondeu?"
                    -> wireAudioButtons/wireCustomAudioButtons/speakFrench
                       [puros -- só tomam `container`/`text`/`btnEl` como
                        parâmetro, nunca leem STATE, já 100% reaproveitáveis]
                    -> on-confirm: chama gradeCurrentCard(grade) DIRETO
                                                          [pula pra SESSÃO]
```

`gradeCurrentCard()` é 100% motor de sessão, zero relevância pra Preview:
aplica FSRS (`applyMemoryGrade`), XP, streak, contador de atrasadas,
requeue em erro, avança `STATE.reviewIndex`, `saveState()`, re-renderiza.

**STATE lido/escrito direto dentro das funções de render (a acoplagem
real que bloqueava reuso, achado central desta auditoria)**:
- `STATE.reviewQueue`/`reviewIndex` -- % de progresso, card atual
- `STATE.reviewShowingAnswer` -- flip do tipo "normal"
- `STATE.reviewMCPicked`/`reviewMCCorrect` -- resposta transitória do MC
- `STATE.reviewClozeAnswered` -- **compartilhado entre Cloze E Type
  Answer** (mesmo boolean, reaproveitado só porque "os dois nunca
  coexistem no mesmo cartão" -- acoplamento por convenção, não por dois
  estados locais independentes)
- `card.mcOptions` -- shuffle cacheado *no próprio objeto do card*
  (também global, só que preso de outro jeito -- mutação direta de uma
  entrada de `STATE.cards`)
- `card.reviewDirection` -- confirmado exclusivo de `!card.cardInstance`
  (trilha legada), nunca setado pra cartão nativo.

### 2. CardInstance -> View Model -> Renderer -> DOM

```
CardInstance (card.cardInstance, ausente pra trilha)
    v resolveCardContentView(card)         [shared/flashcard-model.js -- LIMPO]
      view = {kind, front/back | prompt/correct/distractorTexts | rawSentenceText/markId/...}
    v render*ReviewCard() / bloco inline    [fr/zh app.js -- MISTURADO]
      mistura: (a) desenhar DOM a partir da view
               (b) guardar "já respondeu, o quê" em STATE global
               (c) decidir o que acontece ao confirmar = chamada
                   hardcoded a gradeCurrentCard()
    v innerHTML de #review-content (id fixo)
```

`resolveCardContentView`/os 4 resolvers já estão limpos (nunca tocam DOM,
nunca leem STATE) -- alvo real da Fase 6C é só a camada (b)+(c) acima.

**Achado paralelo, fora do escopo**: `openPublicFlashcardPreview()`
(`shared/public-profile.js`, Fase 2 do prompt-mestre "perfil público") já
é um "preview" -- mas de contexto totalmente diferente (cartão importável
de outra conta, campos legados soltos vindos de `get_public_flashcards()`,
nunca Note/CardInstance). Não usa e não deve usar o renderer unificado --
registrado só pra não confundir com o alvo real desta fase.

### 3. Contrato do renderer, aprovado

```
renderer(mountEl, card, localState, callbacks)
```
- `mountEl` -- substitui o id fixo `#review-content`, permite Review e
  Preview existirem na tela ao mesmo tempo.
- `card` -- mesmo shape de sempre.
- `localState` -- ver seção 4 abaixo (refinamento desta rodada).
- `callbacks` -- `{onAnswered(wasCorrect, grade)}`. Review's callback
  chama `gradeCurrentCard(grade)`; Preview's callback só re-renderiza
  mostrando o resultado, nunca grava nada. **O renderer nunca sabe em que
  contexto está** -- zero `if (isPreview)` dentro dele.

4 funções candidatas (sem sufixo "Review" no nome, já que passam a
servir os dois contextos): `renderNormalCard`/`renderMultipleChoiceCard`/
`renderClozeCard`/`renderTypeAnswerCard`. "Normal com reverso" continua
reaproveitando `renderNormalCard`, como já reaproveita
`resolveNormalCardView` hoje.

**O que muda**: assinatura das 4 funções (+mountEl/localState/callbacks);
`STATE.reviewMCPicked`/`reviewMCCorrect`/`reviewClozeAnswered` deixam de
ser campos globais lidos direto pelo renderer; `#review-content` vira
parâmetro; `gradeCurrentCard()` deixa de ser chamado hardcoded de dentro
do renderer.

**O que NÃO muda**: `resolveCardContentView`/resolvers; separação fr/zh
em arquivos próprios (Fase 6C não tenta unificar fr/zh, é outro projeto);
`reviewDirection`/`isReverse`/`nextCardDirection` (mecanismo intocado,
exclusivo de trilha); `gradeCurrentCard`/FSRS/XP/streak/`saveState`
(motor de sessão, fora do renderer); `getStudyQueue`/`eligibleReviewPool`/
`startReviewSession` (fila continua responsabilidade da sessão).

### 4. Refinamento do `localState` (esta rodada) -- ownership e ciclo de vida

A autora rejeitou explicitamente a versão implícita da proposta original
("substituir os 3 campos STATE.review* por 1 objeto global maior") --
"isso apenas mudaria o nome do acoplamento". A resposta correta não é
sobre QUANTOS campos existem, é sobre **granularidade, ownership e
ciclo de vida explícitos**, e sobre o `localState` nunca ser lido/escrito
pelo renderer via `STATE.*` direto -- só recebido como parâmetro.

**1. Quem é o dono do `localState` no Review?** A camada de SESSÃO
(as mesmas funções que já são donas de `STATE.reviewQueue`/`reviewIndex`
-- `renderReviewView()`/`gradeCurrentCard()`/`reviewMoreCurrentCard()`),
nunca o renderer. O renderer só recebe a referência como parâmetro e muta
campos NELA -- nunca sabe (nem precisa saber) que existe um `STATE` por
trás.

**2. Quem cria o `localState`?** `renderReviewView()`, e só ela --
único ponto de criação, mesmo espírito de `resolveCardContentView()` ser
o único ponto de leitura de conteúdo.

**3. Em que momento é criado?** No instante em que `STATE.reviewQueue[STATE.reviewIndex]`
aponta pra um card DIFERENTE do que o `localState` armazenado
representa (rastreado por uma pequena identidade -- ex:
`STATE.reviewCardState.forQueuePosition !== STATE.reviewIndex`) --
ANTES da primeira renderização daquele card. Re-renderizações do MESMO
card (ex: depois de marcar uma opção de MC) NUNCA recriam -- reaproveitam/
mutam o objeto já existente.

**4. Em que momento é descartado?** No instante em que `STATE.reviewIndex`
avança -- dentro de `gradeCurrentCard()` e de `reviewMoreCurrentCard()`,
que já são os 2 únicos pontos que mexem em `reviewIndex` hoje. Cada um
seta `STATE.reviewCardState = null` explicitamente antes de chamar
`renderReviewView()` de novo -- não é "deixar a próxima renderização
sobrescrever silenciosamente", é um descarte ativo e visível no código,
no mesmo lugar que já reseta `STATE.reviewShowingAnswer = false` hoje.

**5. Por CardInstance, por renderização, ou por sessão?** **Nenhum dos
3** -- é **por EXIBIÇÃO** (um "turno": o intervalo entre um card virar
`STATE.reviewQueue[STATE.reviewIndex]` e deixar de ser). Não pode ser
por CardInstance (identidade) porque o MESMO CardInstance pode aparecer
2x na mesma sessão (requeue de "Errei", `remaining>=3` em
`gradeCurrentCard`; ou "Rever mais",
`reviewMoreCurrentCard`) -- a 2ª aparição precisa nascer "não respondida"
de novo, então amarrar por identidade de CardInstance faria a 2ª
aparição herdar erroneamente o estado da 1ª. Não pode ser por
renderização (recriar a cada chamada da função de render) porque MC/
Cloze/TypeAnswer precisam SOBREVIVER a várias re-renderizações
intermediárias da mesma pergunta (marcar opção -> re-render pra mostrar
cor -> clicar Continuar). Não pode ser por sessão (1 objeto vivendo a
sessão inteira) porque é exatamente esse o erro já cometido por
`STATE.reviewClozeAnswered` (campo único reaproveitado entre 2 tipos
diferentes por convenção, nunca por desenho).

**6. Como o renderer é re-renderizado após cada interação?**
- **Multiple Choice**: clicar opção -> muta `localState.selectedIndex`/
  `answered`/`wasCorrect` -> o PRÓPRIO renderer se chama de novo
  (`rendererFn(mountEl, card, localState, callbacks)`, auto-recursão,
  **sem envolver a sessão** -- exatamente como `renderMultipleChoiceReviewCard(card)`
  já se autochama hoje) -> só ao clicar "Continuar" (interação FINAL) o
  renderer chama `callbacks.onAnswered(wasCorrect, 2|0)`.
- **Type Answer**: digitar não re-renderiza (input nativo captura o
  valor sozinho); clicar "Verificar" muta `localState` e o renderer se
  autochama pra mostrar revelado/colorido; clicar "Continuar" chama
  `callbacks.onAnswered`.
- **Cloze**: mesmo padrão exato de Type Answer.
- **Normal (reveal)**: clicar no flashcard -> muta `localState.revealed=true`
  -> renderer se autochama pra mostrar o verso + botões de grau; clicar
  um botão de grau chama `callbacks.onAnswered(null, grade)` direto --
  pra Normal não existe um veredito certo/errado calculado pelo
  renderer, a aluna autorrelata via o botão de grau clicado (mesmo
  comportamento de hoje, só formalizado no contrato).

  Ou seja: **re-renderização intermediária (dentro da mesma pergunta) é
  responsabilidade do renderer, via auto-chamada com os mesmos 4
  parâmetros** -- nunca pede pra sessão re-renderizar por ele. Só a
  transição FINAL (que dispara grade/avanço de fila/descarte de
  localState) sobe pra sessão via `callbacks.onAnswered`.

**7. Como o Review mantém esse estado sem colocá-lo no CardInstance?**
Um único slot ownado pela sessão -- `STATE.reviewCardState` -- criado/
lido/escrito só pelas 3 funções de sessão (seção 2-4 acima), NUNCA pelo
renderer via `STATE.*` direto. O renderer recebe a referência como
`localState` e muta campos nela; como é a MESMA referência que a sessão
guarda em `STATE.reviewCardState`, a mutação "persiste" sem o renderer
saber que `STATE` existe.

**8. Como o Preview terá seu próprio estado, independente do Review?**
Uma variável local PRÓPRIA do módulo/componente de Preview (Fase 6D,
`shared/admin-flashcards.js` -- ex: `let previewCardState = null;` no
escopo do editor, nunca um campo em `STATE`). Criada quando o Preview
monta um card sintético; **descartada e recriada sempre que o formulário
muda materialmente** (trocar Card Type, editar frase/opções) -- mesmo
princípio de "descarta e recria" do Review, só que o gatilho é edição do
formulário em vez de avanço de fila. Nenhuma leitura/escrita cruzada com
`STATE.reviewQueue`/`reviewIndex`/`reviewCardState` -- armazenamento
completamente disjunto do Review, ainda que a FORMA de cada tipo (seção
12) seja idêntica -- é o mesmo contrato de dados, nunca a mesma
instância.

**9. O que pertence ao `localState` (efêmero de interação) vs. outro
lugar?** Confirmado: SÓ estado efêmero de interação/exibição --
`revealed`/`typedAnswer`/`selectedIndex`/`answered`/`wasCorrect`/
opções embaralhadas. NUNCA dado durável (texto de front/back/opções em
si -- isso vem de `view` via `resolveCardContentView()`, recalculado do
zero a cada render, nunca copiado pro `localState`) e NUNCA
contabilidade de sessão (posição na fila, resultado FSRS já aplicado,
XP) -- isso continua ownado pela camada de sessão, fora do `localState`.

**10. `card.mcOptions` -- deve sair do card object?** **Sim,
explicitamente.** Hoje é mutação direta de uma entrada real de
`STATE.cards` (objeto durável, com id, potencialmente serializado se
alguém esquecer de limpar) -- mesma categoria de problema dos outros
campos `STATE.review*`, só escondida num objeto diferente. Vira
`localState.shuffledOptions`, com o MESMO ciclo de vida do resto do
`localState` (criado quando o card vira atual, descartado quando deixa
de ser) -- garante que (a) nunca vaza pro shape que `serializeState()`
salva de verdade, e (b) o Preview ganha seu próprio shuffle independente
sem nunca tocar um card real de `STATE.cards`.

**11. `reviewClozeAnswered` compartilhado entre Cloze e Type Answer --
estados independentes propostos.** Cada tipo ganha seu PRÓPRIO conjunto
de campos, no PRÓPRIO objeto de `localState` (nunca a mesma referência/
mesmo campo de `STATE` lido pelos 2 renderers) -- mesmo que a FORMA saia
igual (`answered`/`wasCorrect`/`typedAnswer`), o discriminador de tipo é
estrutural (o `kind` do próprio `localState`, batendo com
`card.cardInstance.cardTypeId`), nunca uma convenção implícita de "os
dois nunca coexistem no mesmo cartão". Um dia que um dos dois ganhar um
campo novo (ex: Cloze querer guardar "quantas tentativas"), o outro tipo
não corre risco nenhum de herdar isso por acidente.

**12. Exemplo concreto de `localState` por tipo:**

Normal:
```js
{
  kind: 'normal',
  revealed: false,       // flip -- verso já foi mostrado?
}
```

Multiple Choice:
```js
{
  kind: 'multiple_choice',
  shuffledOptions: null,   // [{text, correct}], gerado 1x na 1ª renderização
  selectedIndex: null,     // null = ainda não respondeu
  answered: false,
  wasCorrect: null,
}
```

Type Answer:
```js
{
  kind: 'type_answer',
  typedAnswer: '',
  answered: false,
  wasCorrect: null,
}
```

Cloze:
```js
{
  kind: 'cloze',
  typedAnswer: '',
  answered: false,
  wasCorrect: null,
}
```

**13. Diagrama conceitual:**

Review:
```
startReviewSession()
  -> monta STATE.reviewQueue/reviewIndex (sessão)
renderReviewView()
  -> card = STATE.reviewQueue[STATE.reviewIndex]
  -> se STATE.reviewCardState ausente OU não é deste card/posição:
       STATE.reviewCardState = createLocalStateFor(cardTypeId)  [fresh, tipado]
  -> view = resolveCardContentView(card)
  -> callbacks = { onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade) }
  -> renderer(mountEl, card, STATE.reviewCardState, callbacks)
       -- interação intermediária (ex: clicar opção MC): renderer muta
          STATE.reviewCardState e CHAMA A SI MESMO de novo (auto-render,
          sem envolver a sessão)
       -- interação final (Continuar/botão de grau): renderer chama
          callbacks.onAnswered(...)
gradeCurrentCard(grade)
  -> aplica FSRS/XP/streak/save (SESSÃO)
  -> STATE.reviewIndex += 1
  -> STATE.reviewCardState = null  (descarta -- próximo card começa do zero)
  -> renderReviewView()  (recria localState pro próximo card, ciclo reinicia)
```

Preview:
```
Editor (shared/admin-flashcards.js, Fase 6D, ainda não construída)
  -> monta card sintético via interpretNoteFromRow()/buildEngineCardsFromRow()
     sobre os dados atuais do formulário (nunca um objeto paralelo que só
     imita o shape real -- é a MESMA função de produção)
  -> previewCardState = createLocalStateFor(cardTypeId)  (variável local
     do módulo de preview, NUNCA STATE.review*, NUNCA STATE.cards)
  -> callbacks = { onAnswered: (wasCorrect) => { /* só re-renderiza
       mostrando o resultado -- SEM FSRS, SEM XP, SEM saveState */ } }
  -> renderer(previewMountEl, syntheticCard, previewCardState, callbacks)
       -- mesma função, mesmo contrato, comportamento idêntico -- o
          renderer não sabe (nem precisa saber) que está em Preview
  -> quando o formulário muda (trocar Card Type, editar frase/opções):
       previewCardState = createLocalStateFor(novoTipo)  (descarta e recria)
```

**Decisão em aberto, não travada nesta rodada**: onde mora fisicamente
`createLocalStateFor(cardTypeId)` -- candidata natural é
`shared/flashcard-model.js` (já é dono de `CARD_TYPE_IDS`, e a função é
pura -- só mapeia tipo -> shape inicial, sem DOM/STATE) versus morar
junto dos renderers em fr/zh `app.js` (que já são arquivos espelhados,
um por idioma). Decisão de implementação, não arquitetural -- fica pra
quando a Fase 6C for de fato autorizada a virar código.

**Nesta entrega (refinamento)**: zero código alterado, zero arquivo
tocado além deste `CLAUDE.md` -- `git status` confirma árvore limpa.

Aguardando autorização explícita da autora pra Fase 6C virar código
(extrair as 4 funções de renderer com o contrato acima + o ciclo de vida
de `localState` detalhado nesta seção).

## Fase 6C.1 -- extração do renderer de Normal (primeira das 4 funções,
escopo estrito)

Primeira subfase de código da Fase 6C, restrita EXPLICITAMENTE a extrair
só o renderer de "Normal" (inclusive as 2 metades de "Normal com
reverso") pro contrato aprovado -- MC/Cloze/TypeAnswer, editor, Preview,
FSRS, banco, Card Type e pipeline de geração ficaram fora de propósito,
sem nenhuma alteração.

**Arquivos alterados**: só `fr/app.js` + `zh/app.js` (`git diff --stat`:
137/138 linhas, +213/-62 no total). Nenhum outro arquivo tocado --
confirmado que `shared/admin-flashcards.js`/`shared/my-flashcards.js`/
`shared/public-profile.js`/`shared/flashcard-model.js` continuam
intactos.

**O que foi feito, nos dois idiomas (mudanças espelhadas):**

1. **`renderNormalCard(mountEl, card, localState, callbacks)`** (novo) --
   extraído do bloco que antes vivia inline dentro de `renderReviewView()`.
   Corpo idêntico ao original (mesma lógica de direção/HTML/áudio), só
   trocando `document.getElementById('review-content')`→`mountEl`,
   `STATE.reviewShowingAnswer`→`localState.revealed`, e as 2 chamadas
   diretas (`gradeCurrentCard(grade)`/`reviewMoreCurrentCard()`) por
   `callbacks.onAnswered(null, grade)`/`callbacks.onReviewMore()`.
2. **`STATE.reviewCardState`** (novo campo, substitui
   `STATE.reviewShowingAnswer` -- removido, confirmado por grep antes de
   apagar que era usado EXCLUSIVAMENTE dentro do bloco de Normal, nunca
   por MC/Cloze/TypeAnswer nem por `hanziReviewShowingAnswer` -- feature
   de revisão de hanzi do zh, totalmente separada, não tocada). Ciclo de
   vida exatamente como definido na seção anterior deste CLAUDE.md:
   criado preguiçosamente em `renderReviewView()` (só quando `null`,
   nunca recriado numa re-renderização do MESMO cartão), descartado
   (`= null`) nos 3 únicos pontos que avançam `STATE.reviewIndex` --
   `gradeCurrentCard()`, `reviewMoreCurrentCard()`, e os 2 pontos de
   início de sessão (`startReviewSession()`/`openReviewSession('hard')`).
3. **`callbacks.onReviewMore()`** -- extensão além do `onAnswered` único
   esboçado na auditoria da Fase 6C, necessária porque "Rever mais" é uma
   3ª transição que não grada nada (nunca é "resposta", só pedido de mais
   exposição) -- disclosed explicitamente no código e aqui, não decidida
   em silêncio.
4. **Direção**: nem `isReverse` nem `reviewDirection` nem
   `nextCardDirection()` foram reintroduzidos como mecanismo NATIVO --
   pra cartão com `card.cardInstance`, `isReverse` continua sempre
   `false` (a `resolveNormalCardView()` já devolve front/back na ordem
   certa); pra cartão legado (`!card.cardInstance`), `card.reviewDirection`
   (setado 1x em `startReviewSession()`) continua 100% intocado --
   mesmíssimo código, só movido pra dentro da função extraída.
5. **Progresso** (`STATE.reviewIndex`/`reviewQueue.length`): continua
   lido direto de `STATE` dentro de `renderNormalCard()` -- decisão
   deliberada, disclosed no código: é contabilidade de SESSÃO, não
   "estado efêmero de interação" (a restrição da Fase 6C é
   especificamente sobre não ler `STATE` pra saber "revelado?"/
   "respondido?"). Uniformizar isso fica pra quando os 4 renderers forem
   extraídos juntos, não resolvido isoladamente só pro Normal pra não
   introduzir um mecanismo (parâmetro de contexto de sessão) que os
   outros 3 ainda não teriam.

**Busca final por lógica paralela de Preview (pedida explicitamente)**:
`grep -n "function.*[Nn]ormal.*("` confirma **um único** `renderNormalCard`
por idioma (mais `resolveNormalCardView` no motor, já existente desde a
Fase 4a, intocado). `grep -rn "Preview"` em `fr/app.js`/`zh/app.js`
mostra só (a) os 3 comentários novos desta entrega citando o Preview
futuro (Fase 6D, sem código), e (b) `challengePreviewMode`/
`openChallengePreview` -- feature pré-existente e totalmente sem relação
(banner de preview de Desafios), não tocada. Nenhuma segunda
implementação de renderer criada.

**Testes realizados:**
- `node --check fr/app.js`/`zh/app.js` sem erro.
- 4 suítes Node re-executadas, **169/169 sem regressão** (esperado --
  exercitam só `shared/flashcard-model.js`, não tocado nesta subfase):
  `test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js` 74/74.
- **Suíte nova `test_fase6c1_normal_renderer.js`** (Playwright, fr+zh),
  cobrindo item a item o que a autora pediu:
  1. `reviewShowingAnswerRemoved:true` -- confirmado via
     `!Object.prototype.hasOwnProperty.call(STATE, 'reviewShowingAnswer')`
     (campo global removido de fato, não só sem uso).
  2. **Normal nativo**: `localStateCreated` (`{kind:'normal',
     revealed:false}` na primeira renderização), front visível, revelar
     -> `localState.revealed===true` E `card.due`/`card.reps`
     **inalterados** (confirma que revelar sozinho nunca aciona FSRS/XP
     por conta própria do renderer -- só o clique num botão de grau, via
     `callbacks.onAnswered`, chama `gradeCurrentCard` de verdade: `due`/
     `reps` mudam só DEPOIS desse clique), `STATE.reviewIndex` avança,
     `STATE.reviewCardState` descartado.
  3. **Normal reverso**: `resolveCardContentView()` das 2 metades
     confirma front/back trocados entre si; ids distintos; cada metade
     renderizada via `renderNormalCard()` (não uma função separada);
     graduar a 1ª metade NÃO muta `reps`/`due` da 2ª (FSRS genuinamente
     independente, mesma garantia já validada desde a Fase 4a, agora
     também através do renderer extraído).
  4. **Cartão legado** (`!card.cardInstance`, `reviewDirection:
     'back-to-front'`): confirmado caindo no mesmo `renderNormalCard()`
     (não um caminho separado), tradução aparece primeiro (direção
     legada respeitada), grau clicado grada de verdade (`reps`/`due`
     mudam).
  5. **Regressão MC** (não tocado nesta subfase): `.mc-option` continua
     renderizando, `STATE.reviewMCPicked` continua `null` no boot
     (campo próprio intocado, nunca leu/gravou `STATE.reviewCardState`).
  - Console: só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes
    (proxy de saída do sandbox), zero erro novo, nos dois idiomas.

**Problemas encontrados**: nenhum -- implementação direta a partir do
contrato já aprovado, sem surpresas durante a extração (o bloco original
já era isolável quase 1:1, confirmando que a auditoria da Fase 6C tinha
mapeado a fronteira certa).

**O que ainda falta / não foi feito nesta subfase (de propósito)**:
MC/Cloze/TypeAnswer continuam com `STATE.reviewMCPicked`/`reviewMCCorrect`/
`reviewClozeAnswered` sem tocar -- extração deles é subfase futura
(6C.2/6C.3/6C.4, não nomeadas/autorizadas ainda). Nenhum editor/Preview
construído -- `renderNormalCard()` está pronto pra ser chamado pelo
Preview quando a Fase 6D existir, mas nada chama ainda. `mountEl` ainda é
sempre `#review-content` fixo na chamada de dentro de `renderReviewView()`
-- o PARÂMETRO já existe e o renderer não hardcoda mais o id
internamente, mas o Review continua passando o mesmo elemento de sempre
(esperado, só o Preview vai passar um `mountEl` diferente).

Escopo estrito respeitado -- nenhuma 6C.2/6C.3 iniciada. Parando aqui,
aguardando revisão da autora antes de continuar.

## Fase 6C.2 -- extração dos renderers de Multiple Choice e Type Answer

Segunda subfase de código da Fase 6C, autorizada explicitamente pela
autora depois de revisar a 6C.1 ("A Fase 6C.1 foi revisada e aprovada. [...]
Agora implemente SOMENTE a Fase 6C.2"). Mesmo contrato aprovado na
auditoria da Fase 6C -- `renderer(mountEl, card, localState, callbacks)`
-- estendido agora pra Múltipla escolha e Digite a resposta, com uma
lista de 7 proibições explícitas dadas pela autora antes de codar (nunca
acessar `STATE` direto pra estado efêmero, nunca chamar
`gradeCurrentCard()`/`reviewMoreCurrentCard()` direto, nunca executar
FSRS/XP/save, nunca decidir direção de CardInstance) -- todas cumpridas,
ver detalhamento abaixo.

**Arquivos alterados**: só `fr/app.js` (+152/-63, confirmado por
`git diff --stat`) e `zh/app.js` (+149/-60). Nenhum outro arquivo tocado
-- `shared/flashcard-model.js`/`shared/admin-flashcards.js`/
`shared/my-flashcards.js`/`shared/public-profile.js` continuam intactos,
confirmado por `git status --short` mostrando só os 2 arquivos.

**O que foi feito, nos dois idiomas (mudanças espelhadas):**

1. **`renderMultipleChoiceCard(mountEl, card, localState, callbacks)`**
   (novo, substitui `renderMultipleChoiceReviewCard(card)`) -- mesmo
   corpo visual de sempre (opções embaralhadas, feedback certo/errado,
   botão "Continuar"), agora lendo/escrevendo tudo em `localState` em vez
   de `STATE.reviewMCPicked`/`STATE.reviewMCCorrect`/`card.mcOptions`
   (os 3 eliminados por completo -- confirmado via grep, sem sobrar
   nenhuma referência fora de comentário). `localState.shuffledOptions`
   é gerado 1x na 1ª renderização desta EXIBIÇÃO (nunca mais mutação
   direta de uma entrada real de `STATE.cards`) -- interação intermediária
   (marcar uma opção) muta `localState.selectedIndex`/`answered`/
   `wasCorrect` e o renderer se autochama com os mesmos 4 parâmetros, sem
   envolver a sessão; só o clique em "Continuar" chama
   `callbacks.onAnswered(wasCorrect, grade)`.
2. **`renderTypeAnswerCard(mountEl, card, localState, callbacks)`** (novo,
   substitui `renderTypeAnswerReviewCard(card)`) -- mesma lógica de
   comparação/revelação/confirmar de sempre (`acceptedForms`,
   `compareAnswerText`, teclinha de acento/tom), agora usando
   `localState.typedAnswer`/`answered`/`wasCorrect` em vez de
   `STATE.reviewClozeAnswered` -- a MESMA variável global que o Cloze usa,
   compartilhada só por convenção ("os dois nunca coexistem no mesmo
   cartão", nunca por desenho estrutural, ver auditoria da Fase 6C). Cloze
   (`renderClozeReviewCard`, fora do escopo desta subfase) continua
   intocado, usando `STATE.reviewClozeAnswered` exatamente como antes --
   confirmado por teste dedicado que o TypeAnswer NUNCA mais toca esse
   campo (ver Testes abaixo).
3. **`renderReviewView()`** -- dispatch de `multiple_choice`/`type_answer`
   passou a criar `STATE.reviewCardState` preguiçosamente (só quando
   ausente, tipado por `kind`) e passar `callbacks.onAnswered` que chama
   `gradeCurrentCard(grade)` -- exatamente o mesmo padrão já usado pro
   dispatch de `normal` desde a 6C.1. Cloze permanece com seu dispatch
   antigo (`renderClozeReviewCard(card)`, sem `localState`/`callbacks`).
4. **`startReviewSession()`** -- removidas as 2 linhas que inicializavam
   `STATE.reviewMCPicked`/`STATE.reviewMCCorrect` (não existem mais em
   lugar nenhum do código); `STATE.reviewClozeAnswered = null` continua
   (ainda usado pelo Cloze). Comentário da declaração de `STATE.reviewCardState`
   (no objeto default do estado) atualizado pra documentar os 3 shapes
   possíveis hoje.

**Ajuste ao shape documentado na auditoria, avisado antes de codar (pedido
explícito da autora, "se perceber que o shape precisa de um pequeno
ajuste, documente")**: nenhum ajuste foi necessário -- os 2 shapes
implementados batem exatamente com o que a auditoria da Fase 6C já tinha
travado:
```js
// Multiple Choice
{ kind: 'multiple_choice', shuffledOptions: null, selectedIndex: null, answered: false, wasCorrect: null }
// Type Answer
{ kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null }
```

**Decisões arquiteturais desta subfase:**
1. Mesmo padrão de auto-recursão da 6C.1 (Normal) -- interação
   intermediária nunca sobe pra sessão, o renderer se rechama sozinho com
   os mesmos 4 parâmetros. Confirma que o padrão estabelecido na 6C.1
   generaliza sem ajuste pros outros 2 tipos, não precisou de nenhum
   mecanismo novo.
2. `localState.typedAnswer` guarda o texto bruto digitado (não usado por
   nenhum consumidor hoje, mas parte do shape já travado na auditoria) --
   mantido por fidelidade ao contrato aprovado, não removido por não ter
   uso imediato.
3. `mountEl.querySelector(...)` substituiu `document.getElementById(...)`
   em toda função extraída (mesmo padrão já usado por `renderNormalCard`
   na 6C.1) -- necessário pro contrato valer de verdade quando o Preview
   (Fase 6D) passar um `mountEl` diferente de `#review-content`.

**Testes realizados** (os 15 itens pedidos, numerados):
1. **4 suítes Node completas** -- `test_fase4_engine.js` 32/32,
   `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
   `test_fase6b_native_notes.js` 74/74 (**169/169**, sem regressão --
   esperado, nenhuma exercita `fr/app.js`/`zh/app.js`).
2. **Smoke test de navegador real, FR+ZH** -- novo
   `test_fase6c2_mc_typeanswer_renderer.js` (Playwright), mesmo padrão de
   stub/boot da 6C.1.
3. **Múltipla escolha nativa** -- `STATE.reviewCardState` criado com
   `kind:'multiple_choice'` na 1ª renderização, confirmado nos 2 idiomas.
4. **1, 2 e 3 distratores** -- 3 cartões nativos com `role:'distractor'`
   variando de 1 a 3, contagem de `.mc-option` confirmada em 2/3/4
   (1 certa + N erradas) nos 2 idiomas.
5. **Seleção -> feedback -> grade** -- clicar uma opção marca
   `localState.answered`/`selectedIndex`/`wasCorrect`, aplica classe
   `.correct`/`.incorrect` no botão certo (reconsultado do DOM vivo pós
   auto-render, já que o clique original troca o `innerHTML`), revela o
   botão "Continuar"; clicar "Continuar" confirma `reps`/`due` mudando de
   verdade (FSRS aplicado via `gradeCurrentCard`).
6. **`shuffledOptions` fora de `card`/`STATE.cards`** -- confirmado
   `!('mcOptions' in card)` e `!('shuffledOptions' in card)` no
   CardInstance real após toda a interação, só `STATE.reviewCardState.
   shuffledOptions` existe.
7. **Type Answer em francês** -- prompt="Où habites-tu ?", resposta
   digitada comparada contra `compareAnswerText`, fluxo completo
   validado.
8. **Type Answer em chinês, `pinyinFieldId`** -- `compareAnswerText`
   resolve pro pinyin (`"nǐ zhù zài nǎlǐ?"`), `displayAnswerText`
   permanece hanzi (`"你住在哪里？"`) -- exatamente a distinção que o
   motor (`resolveTypeAnswerCardView`, Fase 4a/6B, intocado) já garantia;
   este teste confirma que o renderer extraído continua respeitando essa
   distinção.
9. **Resposta certa** -- MC (clicar a opção certa) e Type Answer (digitar
   o `compareAnswerText` exato) -- `wasCorrect:true`, classe `.correct`
   aplicada, `gradeCurrentCard(2)` disparado só após "Continuar".
10. **Resposta errada** -- MC (clicar opção errada) e Type Answer (digitar
    texto incorreto) -- `wasCorrect:false`, classe `.incorrect` aplicada,
    `lapses` incrementado após "Continuar".
11. **Revelação** -- Type Answer errado confirma que o texto certo
    (`displayAnswerText`) aparece na tela assim que `answered:true`, antes
    mesmo de "Continuar" ser clicado.
12. **Interação antes do grade não altera FSRS/XP** -- confirmado
    explicitamente nos 2 formatos: `due`/`reps` do CardInstance
    idênticos ANTES e DEPOIS de selecionar uma opção MC ou verificar uma
    resposta digitada (só mudam depois do clique em "Continuar").
13. **`gradeCurrentCard()` só alcançado via callback/sessão** --
    confirmado indiretamente pelo item 12 (nada muda até "Continuar") e
    diretamente pelo `STATE.reviewIndex` só avançando após esse clique,
    nunca na seleção/verificação em si.
14. **Nenhum renderer paralelo de Preview** -- confirmado
    `typeof renderMultipleChoiceReviewCard === 'undefined'` e
    `typeof renderTypeAnswerReviewCard === 'undefined'` (funções antigas
    removidas de verdade, não só substituídas por atalho) e que só existe
    UMA função `renderMultipleChoiceCard`/`renderTypeAnswerCard` por
    idioma (grep confirma, mesma disciplina da 6C.1).
15. **Normal sem regressão** -- fluxo completo (revelar + graduar) rodado
    de novo neste mesmo teste, `due`/`reps` mudando corretamente via
    `renderNormalCard` (6C.1, intocado nesta subfase).

Teste adicional, além dos 15 pedidos: confirmado que TypeAnswer NUNCA
mais toca `STATE.reviewClozeAnswered` (setado a `null` simulando o que
`startReviewSession()` faz, permanece `null` depois de 2 fluxos completos
de TypeAnswer, certo e errado) -- prova concreta de que a dependência
compartilhada por convenção com o Cloze (existente desde a Fase 4) foi
eliminada de vez deste lado.

Console: só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes
(proxy de saída deste sandbox bloqueando o CDN do Supabase, já
documentado em toda a sessão), zero erro novo atribuível a este código,
nos dois idiomas.

**O que ainda falta / não foi feito nesta subfase (de propósito, restrição
explícita da autora):** Cloze não foi tocado -- extração dele fica pra uma
Fase 6C.3 futura, ainda não autorizada. Nenhum editor/Preview construído
-- `renderMultipleChoiceCard`/`renderTypeAnswerCard` estão prontos pra
serem chamados pelo Preview quando a Fase 6D existir, mas nada os chama
ainda fora do Review. Áudio/imagem, banco/migration, Card Types e
geração de cartão não foram tocados.

Escopo estrito respeitado -- nenhuma 6C.3/Preview/editor iniciados.
Parando aqui, aguardando revisão da autora antes de continuar.

## Fase 6C.3 -- extração do renderer de Cloze

Terceira e última subfase de código da Fase 6C, autorizada explicitamente
pela autora depois de revisar a 6C.2 ("A Fase 6C.2 foi revisada e
aprovada. [...] Agora implemente SOMENTE a Fase 6C.3"). Mesmo contrato
`renderer(mountEl, card, localState, callbacks)` aprovado na auditoria da
Fase 6C, agora estendido pro último dos 4 Card Types em uso hoje --
Cloze -- com a mesma lista de proibições já cumpridas em 6C.1/6C.2 (nunca
acessar `STATE` pra estado efêmero, nunca chamar `gradeCurrentCard()`/
`reviewMoreCurrentCard()` direto, nunca executar FSRS/XP/save, nunca
decidir direção de CardInstance) e mais uma restrição nova, específica
desta subfase: não criar um boolean genérico compartilhado com Type
Answer -- cada Cloze precisa de estado identificado pelo `markId`.

**Leitura obrigatória feita antes de codar** (pedido explícito da
autora): reli o renderer atual de Cloze em `fr/app.js`/`zh/app.js`,
`resolveClozeCardView`/`parseClozeMarks`/`renderClozeText`/
`splitClozeMarkRaw` em `shared/flashcard-model.js`, a geração de
múltiplas CardInstances por Note na Fase 5 (`interpretNativeNoteFromRow`,
ramo `mode === 'cloze'`, e o caminho legado equivalente em
`interpretNoteFromRow`), e os relatórios da Fase 6C (auditoria) e das
6C.1/6C.2 no CLAUDE.md. Confirmado, não presumido: `resolveClozeCardView`
já devolve a view escopada a UMA marca (`cardInstance.markId`) -- mesmo
quando a Note tem 2+ marcas, cada CardInstance/posição de fila carrega
só a sua própria marca; o renderer nunca precisa (nem pode) "descobrir"
outras marcas da mesma Note.

**Arquivos alterados**: só `fr/app.js` (+82/-61, `git diff --numstat`) e
`zh/app.js` (+84/-66). Nenhum outro arquivo tocado --
`shared/flashcard-model.js` (parser/sintaxe Cloze, resolvers) continua
100% intocado, nenhum bug concreto foi encontrado que justificasse
alterá-lo nesta subfase.

**O que foi feito, nos dois idiomas (mudanças espelhadas, com as
particularidades reais de cada idioma preservadas -- zh mantém
`.cloze-hanzi`/`.cloze-pinyin`, `pinyinTonePickerHTML`,
`normalizePinyinAnswer`; fr mantém `frAccentPickerHTML`,
`normalizeLoose`; nenhuma tentativa de unificação):**

1. **`renderClozeCard(mountEl, card, localState, callbacks)`** (novo,
   substitui `renderClozeReviewCard(card)`) -- mesmo corpo visual de
   sempre (frase com lacuna via `renderClozeText`, feedback certo/errado
   no próprio espaço da lacuna, tradução revelada, áudio próprio quando
   existe, botão "Continuar"), agora lendo/escrevendo tudo em
   `localState` em vez de `STATE.reviewClozeAnswered` (eliminado por
   completo -- confirmado via grep, nenhuma atribuição restante em
   `fr/app.js`/`zh/app.js`, só comentários históricos). Interação
   intermediária (clicar "Verificar") muta `localState.typedAnswer`/
   `answered`/`wasCorrect` e o renderer se autochama com os mesmos 4
   parâmetros, sem envolver a sessão; só o clique em "Continuar" chama
   `callbacks.onAnswered(wasCorrect, grade)`.
2. **`renderReviewView()`** -- dispatch de `cloze` passou a criar
   `STATE.reviewCardState` preguiçosamente (só quando ausente, tipado por
   `kind:'cloze'`, com `markId: card.cardInstance.markId` já embutido na
   criação) e passar `callbacks.onAnswered` que chama
   `gradeCurrentCard(grade)` -- exatamente o mesmo padrão já usado pros
   outros 3 tipos desde 6C.1/6C.2. Não há mais nenhum `cardTypeId` com
   dispatch "antigo" -- os 4 tipos suportados hoje (normal/
   multiple_choice/type_answer/cloze) usam 100% o contrato novo.
3. **`startReviewSession()`** -- removida a linha que inicializava
   `STATE.reviewClozeAnswered = null` (não existe mais em lugar nenhum do
   código). Comentário da declaração de `STATE.reviewCardState` (objeto
   default do estado) atualizado pra documentar os 4 shapes possíveis
   hoje -- nenhum campo solto de tipo restante em `STATE`.

**Ajuste ao shape documentado na auditoria, avisado antes de codar**
(pedido explícito da autora): o shape que a auditoria da Fase 6C tinha
esboçado pra Cloze era campo-a-campo IDÊNTICO ao de Type Answer
(`{kind:'cloze', typedAnswer, answered, wasCorrect}`) -- literalmente o
"boolean genérico compartilhado" que esta subfase foi instruída a evitar,
mesmo sabendo que desde a 6C.2 os dois já são objetos/instâncias
estruturalmente distintos (nunca a mesma referência de `STATE.
reviewCardState`, `kind` sempre discrimina qual é qual). Adicionei
`markId` ao shape de Cloze:
```js
{ kind: 'cloze', markId, typedAnswer: '', answered: false, wasCorrect: null }
```
`markId` é preenchido no momento da criação (`card.cardInstance.markId`)
e identifica explicitamente a QUAL CardInstance/marca aquele estado
pertence -- mesmo sabendo que hoje só existe 1 markId por exibição (cada
`{{cN::...}}` de uma Note vira sua PRÓPRIA CardInstance/posição de fila
desde a Fase 5, nunca 2 marcas mostradas juntas na mesma tela). Sem essa
adição, o shape voltaria a ser estruturalmente idêntico ao de Type
Answer -- exatamente o risco que a instrução da autora apontava.

**Achado sobre lógica já pertencente ao resolver, não movida pro
renderer**: confirmado por leitura, não presumido -- `resolveClozeCardView`
já centraliza 100% da regra de comparação (`compareAnswerText`, com a
prioridade `cardInstance.compareAnswer` explícito > `mark.compareAnswer`
embutido no `{{cN::texto|compareAnswer}}` > texto puro da marca) e da
revelação (`displayAnswerText`). O renderer só CONSOME esses 2 campos
prontos -- nunca recalcula nada que o resolver já fornece. A única lógica
que continua no renderer (como já documentado desde a Fase 4b, e
preservada intocada aqui) é a decisão de OCULTAR/REVELAR a lacuna na
frase (`renderClozeText(view.rawSentenceText, view.markId, {reveal})`) --
decisão de APRESENTAÇÃO (o quê aparece na tela agora), não de
COMPARAÇÃO (se a resposta está certa) -- distinção que já estava correta
antes desta subfase, nenhuma mudança necessária.

**Áudio e imagem**: comportamento 100% preservado, nenhuma mudança de
arquitetura -- `card.imageUrl`/`view.audioUrl`/`customAudioBtnHTML`
continuam exatamente onde estavam, só com `mountEl` no lugar de
`document.getElementById('review-content')`.

**Decisões arquiteturais desta subfase:**
1. Mesmo padrão de auto-recursão de 6C.1/6C.2 -- interação intermediária
   (verificar resposta) nunca sobe pra sessão, o renderer se rechama
   sozinho com os mesmos 4 parâmetros. Terceira confirmação de que o
   padrão estabelecido na 6C.1 generaliza sem ajuste pra todos os 4 tipos.
2. `mountEl.querySelector(...)` substituiu `document.getElementById(...)`
   em toda a função extraída (mesmo padrão já usado por
   `renderNormalCard`/`renderMultipleChoiceCard`/`renderTypeAnswerCard`)
   -- necessário pro contrato valer de verdade quando o Preview (Fase 6D)
   passar um `mountEl` diferente de `#review-content`.
3. Comentários que citavam `renderClozeReviewCard`/`STATE.
   reviewClozeAnswered` em outros pontos do arquivo (não no renderer em
   si -- ex: comentário de `hasPlainFrontBack`/filtro de Speed Review/
   Combinar na Fase 8a, e o comentário do próprio `renderTypeAnswerCard`
   da 6C.2 que descrevia o campo compartilhado como "ainda em uso por
   Cloze") foram atualizados pra refletir o estado atual -- evita que uma
   sessão futura leia um comentário desatualizado e presuma que o campo
   antigo ainda existe.

**Testes realizados** (os 18 itens pedidos, numerados):
1. **4 suítes Node completas** -- `test_fase4_engine.js` 32/32,
   `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
   `test_fase6b_native_notes.js` 74/74 (**169/169**, sem regressão --
   esperado, nenhuma exercita `fr/app.js`/`zh/app.js`).
2. **Smoke test de navegador real, FR+ZH** -- novo
   `test_fase6c3_cloze_renderer.js` (Playwright), mesmo padrão de
   stub/boot das subfases anteriores.
3. **Cloze nativo simples em francês** -- "Je suis {{c1::brésilien}}."
   -> 1 CardInstance, `markId:'c1'`, lacuna oculta (`___`) na 1ª
   renderização, `localState` criado com `kind:'cloze'`/`markId`
   corretos.
4. **Cloze nativo com múltiplas marcas** -- "{{c1::Je}} {{c2::suis}}
   brésilienne." (fr) e "{{c1::你|nǐ}}{{c2::好|hǎo}}" (zh) -> 2
   CardInstances cada, ids e `markId` distintos confirmados.
5. **Cloze nativo em chinês** -- "我{{c1::是|shì}}巴西人。" ->
   `displayAnswerText` hanzi ("是"), `compareAnswerText` pinyin ("shì"),
   mesma distinção hanzi-revelado/pinyin-comparado de sempre, renderizada
   corretamente via `renderClozeCard`.
6. **Cloze com `compareAnswer`** -- confirmado por marca, não misturado:
   no cenário multi-marca zh, `compareAnswer0:"nǐ"`/`compareAnswer1:"hǎo"`,
   cada CardInstance resolvendo só o seu próprio `mark.compareAnswer`
   (extraído do `|` por `parseClozeMarks`, `shared/flashcard-model.js`
   intocado).
7. **Resposta correta** -- digitar o `compareAnswerText` exato marca
   `wasCorrect:true`, aplica classe `.correct` no espaço da lacuna,
   `gradeCurrentCard(2)` disparado só após "Continuar".
8. **Resposta incorreta** -- digitar texto errado marca
   `wasCorrect:false`, classe `.incorrect` aplicada, `lapses`
   incrementado após "Continuar".
9. **Reveal** -- confirmado que `displayAnswerText` (a forma REVELADA,
   nunca o texto digitado) aparece no espaço da lacuna assim que
   `answered:true`, antes mesmo de "Continuar" ser clicado.
10. **Re-render após resposta sem perder estado** -- chamada explícita a
    `renderReviewView()` de novo, SEM avançar `STATE.reviewIndex`,
    confirma que `answered`/`wasCorrect`/a revelação continuam
    exatamente como estavam (a mesma referência de `localState` é
    reaproveitada, nunca recriada por uma re-renderização do MESMO
    cartão).
11. **Estado de cada cloze independente** -- confirmado nos 2 níveis: (a)
    localState fresh e tipado com o `markId` certo ao entrar na 2ª marca
    (`answered:false` de novo, mesmo a 1ª tendo sido respondida); (b)
    FSRS -- graduar a 1ª marca não altera `due`/`reps` da 2ª (ainda em 0
    reps), e graduar a 2ª (errada) não desfaz o resultado já persistido
    da 1ª (continua em 1 rep) -- 2 CardInstances genuinamente
    independentes, mesma garantia já validada pra "Normal com reverso"
    na Fase 6C.1.
12. **`STATE.reviewClozeAnswered` não é mais usado** -- confirmado via
    `!Object.prototype.hasOwnProperty.call(STATE, 'reviewClozeAnswered')`
    em tempo real de navegador, nos 2 idiomas, E via a "busca final"
    (grep) descrita abaixo -- nenhuma atribuição restante no código,
    só comentários históricos explicando a migração.
13. **CardInstance não mutado pelo renderer** -- `JSON.stringify(card.
    cardInstance)` capturado antes de qualquer interação e comparado
    depois de responder (antes do grade): idêntico. Depois do grade (que
    SÓ muta os campos FSRS, via `applyMemoryGrade`, fora do renderer),
    o conjunto de CHAVES do CardInstance (`Object.keys`, excluindo
    valores) continua idêntico -- nenhuma propriedade nova (`typedAnswer`/
    `answered`/etc.) vazou pro objeto real de `STATE.cards`.
14. **FSRS/XP intocados antes do callback final** -- `due`/`reps`
    idênticos ANTES e DEPOIS de digitar+verificar uma resposta (certa ou
    errada), só mudam depois do clique em "Continuar".
15. **`gradeCurrentCard()` só alcançado pela sessão/callback** --
    confirmado indiretamente pelo item 14 (nada muda até "Continuar") e
    diretamente por `STATE.reviewIndex` só avançando após esse clique,
    nunca na verificação em si.
16. **Normal, Multiple Choice e Type Answer continuam funcionando** --
    fluxo completo de cada um rodado de novo neste mesmo teste (revelar+
    graduar Normal; renderizar MC com `localState.kind` correto;
    renderizar Type Answer com input presente) -- nenhuma regressão nos
    3 renderers das subfases anteriores.
17. **Nenhum renderer paralelo de Preview** -- confirmado
    `typeof renderClozeReviewCard === 'undefined'` (função antiga
    removida de verdade) e que só existe UMA função `renderClozeCard` por
    idioma (grep confirma, mesma disciplina de 6C.1/6C.2).
18. **Ausência de novos erros de console** -- só os mesmos
    `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes (proxy de saída deste
    sandbox bloqueando o CDN do Supabase, já documentado em toda a
    sessão), zero erro novo atribuível a este código, nos dois idiomas.

**Busca final** (pedida explicitamente, executada via grep sobre
`fr/app.js`/`zh/app.js` completos):
- `reviewClozeAnswered` -- 3 ocorrências restantes em cada arquivo, todas
  dentro de COMENTÁRIOS explicando a migração ("Fase 6C.2 eliminou...",
  "Fase 6C.3 eliminou..."), zero em código executável.
- Acessos a `STATE` dentro de `renderClozeCard` -- só
  `STATE.reviewIndex`/`STATE.reviewQueue.length` (2 ocorrências, pra
  calcular `pct`/contagem de progresso) -- mesma exceção documentada e já
  aceita desde a 6C.1 pra Normal/MC/TypeAnswer: é contabilidade de
  SESSÃO (posição na fila), não estado efêmero de interação -- a
  proibição da Fase 6C é especificamente sobre não ler `STATE` pra saber
  "respondido?"/"revelado?"/"o quê foi digitado?", nunca uma proibição
  geral de qualquer leitura. Nenhum outro campo de `STATE` acessado.
- Mutações de `card` feitas pelo renderer -- nenhuma encontrada (confirmado
  também pelo teste de snapshot do item 13 acima).
- Chamadas diretas a `gradeCurrentCard`/`reviewMoreCurrentCard` dentro do
  renderer -- nenhuma; só existe a chamada de `callbacks.onAnswered(...)`,
  que a SESSÃO (dentro de `renderReviewView()`) é quem mapeia pra
  `gradeCurrentCard(grade)`.
- `reviewDirection`/`nextCardDirection`/`isReverse` dentro do renderer --
  nenhuma ocorrência; Cloze nunca teve direção (não existe conceito de
  "frente"/"verso" numa lacuna), então esse mecanismo nunca foi relevante
  pra este tipo, nem antes nem depois da extração.

**O que ainda falta / não foi feito nesta subfase (de propósito,
restrição explícita da autora):** nenhum editor/Preview construído --
`renderClozeCard` está pronto pra ser chamado pelo Preview quando a Fase
6D existir, mas nada o chama ainda fora do Review. Banco/migration, Card
Types, FSRS, parser/sintaxe de Cloze (nenhum bug concreto encontrado que
justificasse mexer), rich text, e qualquer nova arquitetura de áudio/
imagem não foram tocados.

Com a extração de Cloze, os 4 Card Types em uso hoje (normal/
multiple_choice/type_answer/cloze) seguem 100% o mesmo contrato
`renderer(mountEl, card, localState, callbacks)` -- a Fase 6C (extração
dos renderers) está completa. Próxima etapa (Fase 6D -- Preview/editor,
ou qualquer outra) só começa depois de autorização explícita da autora,
com este relatório já entregue antes de pedir luz verde.

Escopo estrito respeitado -- nenhum Preview/editor/migração/mudança de
Card Type iniciados. Parando aqui, aguardando revisão da autora antes de
continuar.

## Fase 6D -- EDITOR: auditoria e especificação (só leitura, zero código)

Pedido explícito da autora, confirmando a Fase 6C concluída (`ee7b829`):
migrar o editor de flashcards (`shared/admin-flashcards.js`/
`shared/my-flashcards.js`) pra trabalhar nativamente com o modelo
Note/Fields já pronto no motor desde a Fase 6B, **sem implementar nada
nesta rodada** -- só ler, mapear e propor. `git status`/`git diff`
confirmados limpos do início ao fim desta auditoria -- nenhum arquivo de
implementação foi tocado.

### 1. Mapa do editor atual

`shared/admin-flashcards.js` (professora, ~1160 linhas) e
`shared/my-flashcards.js` (aluna, ~600 linhas) são **completamente
alheios ao modelo Note/Field** -- nenhum dos dois importa/chama nada de
`shared/flashcard-model.js`. Escrevem direto nas colunas legadas via
`createFlashcard()`/`updateFlashcardContent()`
(`shared/teacher-flashcards.js`) e `createOwnFlashcard()`/
`updateOwnFlashcardContent()` (`shared/own-flashcards.js`): `front`,
`front_pinyin`, `back_trans`, `front_is_target_language`, `choices`,
`cloze_sentence`, `cloze_answer`, `cloze_answer_pinyin`, `note`,
`image_url`, `audio_url`. O motor (`interpretNoteFromRow`) já sabe
INTERPRETAR essas colunas (ramo legado) E interpretar `fields`+
`card_generation_mode` (ramo nativo) -- só ninguém escreve o ramo nativo
ainda.

Estado do formulário: 2 objetos globais mutáveis,
`ADMIN_FLASHCARDS_STATE{studentIds:Set, langFilter, _studentsCache,
editingCardId, _cardsCache}` e `MY_FLASHCARDS_STATE{editingCardId,
_cardsCache}` -- sem nenhuma noção de Note/Field, só um "modo" solto
(`radio[name=admin-flashcard-mode]` com valores `flip`/`mc`/`cloze`,
UI-only, nunca persistido como tal) que decide quais blocos de HTML
aparecem. Criação: 1 `<form>` com blocos mutuamente exclusivos por modo
(`#admin-flashcard-content-main` pra flip/mc, `#admin-flashcard-content-
cloze` pro cloze) + "Recursos opcionais" (nota/imagem/áudio, sempre
visível) + radio de direção (`target-front`/`target-back`, escondido pra
zh/cloze). Edição: `flashcardEditFormHTML(c)`/`myFlashcardEditFormHTML(c)`
-- MESMA estrutura visual, ids próprios (`edit-flashcard-*`), reconstrói o
"modo" a partir dos dados (`isCloze = !!c.cloze_sentence`, `isMC =
!!(c.choices&&c.choices.length)`) porque não há campo que diga isso
explicitamente. Salvar: sempre grava TODAS as colunas de novo (não é um
PATCH parcial), incrementa `revision` (`(c.revision||0)+1`, calculado
pelo CHAMADOR) -- é o único "versionamento" que existe: um id novo
(`flashcardIdForRow`, fr/zh app.js) nunca bate com nenhum salvo em
`STATE.cards`, então o merge-por-id de `applySerializedState()` descarta
o progresso antigo sozinho, sem código de reset dedicado. Reset: não
existe um "reset" formal -- é a MESMA mecânica do revision acima.
Apagar/arquivar: `deleteFlashcardPermanently`/`setFlashcardStatus` (DELETE
físico vs. soft-status), sem relação com Note/Field.

`teacher_flashcards` (professora) vs. `own_flashcards` (aluna): mesmo
schema de colunas, 2 diferenças reais no editor -- (a) professora escolhe
1+ alunos via checkboxes multi-seleção (`buildFlashcardsCardsBoxHTML`
busca por vários `student_id`, cria 1 linha POR aluno selecionado,
mesmo conteúdo) e o idioma vem do vínculo da aluna (`s.language_app_key`,
nunca escolhido à mão); aluna sempre cria "pra si mesma", idioma é sempre
`APP_KEY` fixo do site. (b) `my-flashcards.js` só mostra modo/mídia/
múltipla escolha/cloze quando `fetchMyPlanTier()==='premium'` (gate
Premium, prompt-mestre "reformulação gratuito x premium") -- conta free
só cria flip simples. `admin-flashcards.js` não tem esse gate (é
ferramenta da própria professora/admin).

Como o editor distingue os 5 Card Types hoje: **não distingue 5, só 3**
-- `flip`/`mc`/`cloze` (radio group). "Normal com reverso" e "Digite a
resposta" não têm NENHUMA UI -- só existem no motor (Fase 4a/6B),
alcançáveis hoje só por teste direto (`buildReversedCardInstancePair`,
`cardGenerationMode:'type_answer'`), nunca por um clique real.

### 2. Mapa pro contrato nativo (Fase 6B)

O motor já define e valida (`validateNativeNoteRow`, `shared/flashcard-
model.js:148`) exatamente o shape que o editor precisa produzir --
nenhum campo novo precisa ser inventado, só popular o que já existe:

```
row.fields = [
  { id: <string estável>, lang: <string>, role: <'prompt'|'answer'|'distractor'|null>,
    content: { value: <string> }, audio: {url,source}|{source:'tts',enabled}|null,
    image: {url}|null, pinyinFieldId: <id de outro Field>|null },
  ...
]
row.card_generation_mode = 'normal'|'normal_reversed'|'multiple_choice'|'type_answer'|'cloze'
```

Regras já travadas e ENFORÇADAS pelo motor (não pela UI -- o editor só
precisa produzir dado que passa por elas, a validação de verdade já
existe): `fields`/`card_generation_mode` sempre pareados (`validateNativeNoteRow`);
todo Field com `id` único dentro da Note; `pinyinFieldId` sempre aponta
pra um `id` real da mesma Note; múltipla escolha exige exatamente 1
`role:'prompt'`, exatamente 1 `role:'answer'` (nunca o mesmo Field nos
dois), 1-3 `role:'distractor'` (`validateMultipleChoiceFields`); os
outros 4 modos são POSICIONAIS (`contentFieldIndices` -- slot 0/1, pulando
Fields que são satélite de `pinyinFieldId` de outro) e exigem pelo menos
2 slots de conteúdo. `fieldOrder` é só ordem de exibição no editor (nunca
lido pra decidir direção -- confirmado, ninguém no motor consulta esse
campo pra outra coisa).

### 3. Estrutura de campos por Card Type

- **Normal**: 2 Fields de conteúdo (mais 1 opcional de pinyin, satélite
  de um deles, no zh) -- `slots[0]`=front, `slots[1]`=back. A professora
  escolhe o IDIOMA de cada Field (não uma direção abstrata "estudado/
  nativo") -- é essa escolha que decide `lang` de cada Field; a Note não
  guarda "direção", guarda 2 Fields com `lang` próprio cada. Áudio/imagem
  já são propriedade de FIELD no schema (`field.audio`/`field.image`) --
  mas ver achado crítico na seção 6 abaixo: o pipeline de leitura ainda
  não expõe imagem por Field em lugar nenhum.
- **Normal com reverso**: **a Note é UMA SÓ** (mesmo par de 2 Fields do
  Normal) -- `card_generation_mode:'normal_reversed'` é o que diz ao
  motor "gere as 2 CardInstances" (`buildReversedCardInstancePair`, já
  pronta, nunca chamada por nenhum editor). O editor NUNCA duplica
  conteúdo -- é literalmente o MESMO formulário do Normal, só um modo
  diferente selecionado.
- **Múltipla escolha**: 1 Field `role:'prompt'`, 1 `role:'answer'`, 1-3
  `role:'distractor'` -- hoje o form já tem essa forma de fato (front=
  pergunta, back=resposta certa, mc-1/2/3=erradas), só falta gravar
  `role` explícito em vez de posição implícita (front/back) +
  `choices[]`. Validação de cardinalidade já existe no motor
  (`validateMultipleChoiceFields`) -- o editor não precisa reimplementar,
  só não pode contar só com a validação de tela (já é a postura atual,
  ver `validateFlashcardForm`, mas hoje ela valida contagem de
  `choices[]`, não Fields com role).
- **Digite a resposta**: `promptFieldIndex`/`answerFieldIndex`,
  estruturalmente idêntico ao Normal (2 slots posicionais) -- só o
  `card_generation_mode` muda. `pinyinFieldId` no Field de resposta
  decide o que a aluna zh compara contra (reaproveita o MESMO mecanismo
  hanzi/pinyin do Normal, não um canal próprio -- `resolveTypeAnswerCardView`).
  Nenhuma UI hoje pra este tipo -- seria um 4º radio.
- **Cloze**: **1 Field de texto só**, com marcação `{{cN::resposta}}` ou
  `{{cN::resposta|compareAnswer}}` embutida (`shared/flashcard-model.js`,
  `parseClozeMarks`/`splitClozeMarkRaw`) -- múltiplas marcas na MESMA
  frase geram automaticamente 1 CardInstance por `cN` distinto
  (`interpretNativeNoteFromRow`, ramo `cloze`). **A sintaxe é 100%
  interna** -- a professora nunca deveria digitar `{{c1::...}}` à mão
  (confirmado pela própria intenção documentada no motor, comentário em
  `interpretNativeNoteFromRow`). O editor precisa de um mecanismo de
  SELEÇÃO DE TEXTO ("selecione a palavra, clique 'Cloze'") que:
  (a) insere a marcação na string armazenada em `content.value` por
  baixo dos panos; (b) numera automaticamente `c1`/`c2`/... conforme
  marcas já existentes na frase; (c) permite editar uma marca já feita
  (trocar a palavra marcada, ou seu `compareAnswer`) sem reconstituir a
  frase inteira à mão; (d) permite REMOVER uma marca (reverter o trecho
  pra texto puro). O caso zh (`compareAnswer` = pinyin da resposta,
  diferente do hanzi revelado) precisa de um campo de entrada PRÓPRIO no
  momento de marcar o texto (não um campo solto como hoje
  `#admin-flashcard-cloze-pinyin`) -- ex: um popover/inline-editor que
  abre ao selecionar texto, com "Resposta" (preenchida com a seleção) +
  "Pinyin (o que a aluna digita)" quando o idioma é mandarim.

### 4. Direção -- ponto crítico

Achados, todos por leitura direta do código (nenhum presumido):

- `frontIsTargetLanguage`/`front_is_target_language`: existe SÓ no
  schema legado (`teacher_flashcards`/`own_flashcards`), lido pelo
  ADAPTER (`interpretNoteFromRow`, ramo legado) pra decidir `lang` de
  cada Field na hora de CONSTRUIR a Note a partir da linha antiga -- é
  puramente um mecanismo de INTERPRETAÇÃO de dado histórico. No modelo
  nativo esse campo **não existe e não deve existir** -- a professora
  escolhe o idioma de CADA Field diretamente (Field.lang), não um
  booleano de "qual lado está invertido".
- `isReverse`/`reviewDirection`/`nextCardDirection()`: confirmado (Fase
  4, restrição 3, já cumprida) que são exclusivos da TRILHA
  (`!card.cardInstance`) -- nenhum cartão nativo jamais recebe
  `reviewDirection`. O editor não precisa (nem pode) tocar nesse
  mecanismo -- ele simplesmente não existe pro que o editor produz.
- O editor ATUAL já não decide direção "por idioma" de forma automática
  -- o radio `target-front`/`target-back` é uma escolha EXPLÍCITA da
  professora, gravada em `front_is_target_language`. Isso é
  estruturalmente compatível com o modelo nativo: a única mudança é que,
  em vez de um booleano interpretado por um adapter, o editor nativo
  grava `lang` diretamente em cada Field (a escolha vira "qual Field é
  qual idioma", não "front é o estudado ou não").
- Pra `normal_reversed`: a autora escolhe o CARD TYPE explicitamente (o
  radio/seletor de modo) -- não uma "direção" à parte. Uma vez
  escolhido `normal_reversed`, não existe mais pergunta de "qual lado
  fica na frente" (as duas CardInstances cobrem as duas ordens).
- **O que precisa DESAPARECER do editor**: o radio `target-front`/
  `target-back` como está hoje (um booleano pós-hoc sobre 2 campos
  fixos "Frente"/"Verso"). **O que substitui**: um seletor de idioma por
  Field (ex: dropdown "francês"/"português" em cada campo de texto), sem
  nenhuma noção de "frente"/"verso" embutida no PRÓPRIO conceito de
  direção -- a UI pode continuar mostrando 2 caixas de texto lado a lado
  (isso é só posição na tela, `fieldOrder`), só que cada uma pergunta seu
  próprio idioma, e a ORDEM em que elas viram slot 0/1 é o que o motor lê
  como "front"/"back" (nunca o idioma decide isso).

### 5. Áudio -- auditoria, sem implementar nada novo

Hoje: `<input type="file" accept="audio/*">` -> upload real
(`uploadFlashcardMedia`/`uploadOwnFlashcardMedia`, bucket
`flashcard-media`) -> URL pública gravada em `audio_url` (coluna única,
nível de LINHA, não de campo). É **áudio próprio explícito** (gravação/
arquivo da professora), sempre um upload -- **não existe TTS gravado em
lugar nenhum do editor** (TTS é gerado em runtime pelo motor de
pronúncia já existente do app -- `speakFrench()`/`AUDIO_MANIFEST` --,
nunca uma URL persistida). O adapter legado (`interpretNoteFromRow`,
ramo `else`) vincula esse `audio_url` único ao Field cujo idioma é o
estudado via heurística (`isStudyLanguageField`) -- é dado histórico
reinterpretado, o editor nunca expressou essa escolha diretamente.

O modelo nativo (`field.audio: {url,source:'upload'}` ou
`{source:'tts',enabled:true}`) já é POR FIELD -- é estritamente mais
expressivo que a coluna única de hoje (poderia ter áudio em cada lado
separadamente, algo impossível hoje). O que precisa mudar no editor
(fase futura, não aqui): o campo de upload de áudio deixa de ser 1 input
solto no formulário e passa a viver DENTRO de cada Field (upload próprio
por campo de texto). Nenhuma mudança na mecânica de TTS em si -- resolver
"o áudio automático de pronúncia tenta este campo?" já é decidido por
`isStudyLanguageField(field, appKey)` no runtime (não no editor, não
precisa mudar).

### 6. Imagem -- achado crítico, não presumido

`image_url` legado é NOTE-level (`note.image = {url}`,
`buildEngineCardsFromRow`: `imageUrl: note.image ? note.image.url :
null`) -- confirmado que os 4 renderers (`renderNormalCard`/
`renderMultipleChoiceCard`/`renderTypeAnswerCard`/`renderClozeCard`, os 4
em fr+zh) leem `card.imageUrl` (card-level, vindo de `note.image`), nunca
por Field. A decisão da Fase 6B (CLAUDE.md, "Fase 6A/6B") foi
explicitamente que "imagem é propriedade do FIELD, não da Note" --
`buildNativeRuntimeFields` já ARMAZENA `field.image` por Field -- **mas
nada no pipeline de LEITURA (`resolveCardField`/`buildEngineCardsFromRow`)
resolve ou expõe esse dado**. Ou seja: o schema já suporta imagem por
Field, mas a via de consumo (resolver -> view -> renderer) continua 100%
Note-global, idêntica ao legado. **Isto é um gap real entre Fase 6B e o
que os renderers da Fase 6C de fato leem** -- registrado aqui, não
corrigido (fora do escopo desta auditoria E do que a autora autorizou
tocar: `shared/flashcard-model.js` e os renderers da Fase 6C estão
travados). Uma fase futura de "imagem por Field" precisaria: (a) estender
`resolveCardField()` pra incluir `imageUrl` na projeção de cada Field
resolvido; (b) decidir, por Card Type, qual Field(s) mostram imagem (ex:
Normal -- imagem do lado front? dos dois?); (c) só DEPOIS disso o editor
ganharia um upload de imagem por Field em vez do único solto de hoje.
Até lá, o editor nativo pode continuar oferecendo só 1 upload de imagem
por Note (grava em `note.image`, exatamente como o legado) sem
contradizer o schema -- só não realiza ainda a promessa "imagem é do
Field" que o schema já permite.

### 7. Rich text -- análise técnica, não implementado

`Field.content` hoje é `{value: <string>}` -- uma STRING PURA (nenhuma
marcação, nenhum range, nenhum nó). `resolveCardField()` devolve
`field.text` cru pra dentro de `escapeHTML()` nos renderers (fr/zh
app.js) -- ou seja, hoje o pipeline inteiro trata conteúdo como texto
puro, escapado como HTML por segurança (achado da sessão "7 propostas":
antes disso havia um XSS real por falta de `escapeHTML`, já corrigido).
Pra suportar negrito/itálico/sublinhado/tachado/cor/destaque/remover
formatação/imagem inline/áudio inline/Cloze dentro do texto, `content`
precisaria deixar de ser `{value:string}` e virar uma estrutura com
marcação -- 2 caminhos tecnicamente viáveis, nenhum decidido aqui:
(a) `content.value` continua string, mas passa a ser HTML sanitizado
(mais simples de integrar com o `escapeHTML()`/render atual, mas mistura
apresentação com dado, e formatação livre em HTML cru é risco de XSS se
o sanitizador tiver brecha); (b) `content` vira `{value: <doc
estruturado>}` (tipo ProseMirror/Slate JSON, ou um Markdown restrito) --
mais seguro e mais alinhado ao espírito "Field é dado, não HTML", mas
exige um renderer de rich text novo em CADA um dos 4 Card Type renderers
(fr+zh, 8 pontos de render) pra desenhar o texto formatado, além de
mudar `resolveCardField()` (hoje devolve `.text` cru). Cloze inteiro
dentro de rich text é o caso mais delicado: a marcação `{{cN::...}}`
hoje é regex sobre string plana -- se `content.value` virar um documento
estruturado, `parseClozeMarks`/`renderClozeText` precisariam operar
sobre esse documento (não mais regex), ou o texto cloze precisaria
continuar sendo string plana MESMO que outros Card Types ganhem rich
text (2 representações de `content` coexistindo por Card Type -- viável,
mas é uma decisão de design própria, não decidida aqui). **Nenhuma linha
de código foi escrita pra isso nesta auditoria** -- é puramente a análise
pedida.

### 8. Preview -- auditoria, distinção importante

Existe HOJE um "preview" (`openPublicFlashcardPreview`, `shared/public-
profile.js:465`) -- **confirmado que NÃO é o Preview-alvo da Fase 6C/6D**:
é uma modal read-only pro fluxo de "ver cartão público de outra conta
antes de importar" (prompt-mestre "perfil público"), que renderiza campos
LEGADOS soltos (`c.front`/`c.frontPinyin`/`c.backTrans`/`c.note`/
`c.frontIsTargetLanguage`) vindos direto da RPC `get_public_flashcards()`
-- nunca passa por Note/CardInstance, nunca chama `resolveCardContentView`,
nunca reaproveita nenhum renderer da Fase 6C. É puro texto estático em
`<p>` tags, sem interatividade nenhuma (nem vira/nem responde). **Duplica
conceito, não código** -- ele mostra "o que É o cartão" (metadado), nunca
"como seria estudar esse cartão" (o que os 4 renderers da Fase 6C fazem).
Não é candidato a virar a base do Preview do editor.

O Preview real (Fase 6C, decisão já travada: "Preview e Review devem
usar o MESMO renderer") **não existe ainda em nenhum lugar do código**.
O que os 4 renderers (`renderNormalCard`/`renderMultipleChoiceCard`/
`renderTypeAnswerCard`/`renderClozeCard`, fr+zh) já suportam, confirmado
na auditoria da Fase 6C (seção "3. Contrato do renderer" e "8. Como o
Preview terá seu próprio estado"): assinatura `renderer(mountEl, card,
localState, callbacks)`, mount explícito (não mais `#review-content`
fixo), `localState` que o CHAMADOR cria/descarta (não `STATE.reviewCardState`
-- pro Preview seria uma variável local do módulo do editor), `callbacks.
onAnswered` que o Preview implementaria como um NO-OP de gravação (só
re-renderiza mostrando o resultado, nunca `gradeCurrentCard`/FSRS/XP/
save). Adaptação necessária pro editor conseguir montar um Preview:
form -> `row` sintético (mesmo shape que `createFlashcard()` grava) ->
`buildEngineCardsFromRow(row, opts)` (a MESMA função de produção, sem
round-trip de rede -- o `row` é construído em memória a partir do estado
do formulário, nunca salvo primeiro) -> escolhe o card certo do array
(pra Normal-com-reverso/Cloze-multi-marca, o Preview mostraria só o
primeiro, ou um seletor entre eles -- decisão de UX pra fase futura) ->
`renderer(previewMountEl, card, previewLocalState, previewCallbacks)`.
Nenhuma chamada de rede nem gravação em nenhum ponto desse fluxo.

### 9. Persistência -- mapeamento

Onde o submit constrói o objeto: dentro do handler `submit` de
`#admin-create-flashcard-form`/`#my-create-flashcard-form`
(`admin-flashcards.js`/`my-flashcards.js`), lê cada `<input>`/`<textarea>`
por id, monta um objeto plano `{front, backTrans, note, frontPinyin,
imageUrl, audioUrl, choices, clozeSentence, clozeAnswer,
clozeAnswerPinyin, frontIsTargetLanguage}` passado direto pra
`createFlashcard()`/`createOwnFlashcard()`. Supabase é chamado só DENTRO
de `shared/teacher-flashcards.js`/`shared/own-flashcards.js` (nunca
direto do editor) -- `supabaseClient.from('teacher_flashcards'|
'own_flashcards').insert({...}).select().single()`. Colunas gravadas
hoje: as 12 legadas listadas na seção 1, mais `teacher_id`/`student_id`
(ou `owner_id`)/`language_app_key`/`status` (default `'active'`) -- `id`/
`created_at`/`revision` (default 0) são geridos pelo banco. `fields`/
`card_generation_mode` (migration 045, já aplicada ao vivo, ver seção
"Fase 6B" acima) existem na tabela mas NUNCA são escritos por nenhum
código cliente hoje -- só lidos pelo motor quando presentes (o schema
está pronto, o editor é quem falta escrever neles).

Quando `revision` incrementa: só em EDIÇÃO
(`updateFlashcardContent`/`updateOwnFlashcardContent`, chamador calcula
`(c.revision||0)+1`, nunca o servidor). Pra uma Note nativa, a mesma regra
vale -- qualquer alteração ESTRUTURAL (trocar Card Type, adicionar/
remover Field, mudar `pinyinFieldId`) precisa incrementar `revision`
exatamente como hoje, pelo MESMO motivo (id novo -> reset de progresso
via merge-por-id, sem código de reset dedicado). Uma edição que só
corrige um erro de digitação sem mudar estrutura poderia, em teoria, não
incrementar `revision` -- mas hoje o editor NÃO distingue "mudança de
conteúdo" de "mudança estrutural" (sempre incrementa) -- se isso deveria
mudar é uma decisão de UX pra fase futura, não decidida aqui.

Como uma edição deveria passar a gravar `fields`+`card_generation_mode`:
o submit do editor nativo montaria `row.fields` a partir dos Fields
editados na tela (cada um com `id` estável -- ver seção 10) e
`row.card_generation_mode` a partir do Card Type selecionado, em vez de
montar o objeto plano de 12 colunas de hoje. As 12 colunas legadas
continuariam existindo no schema (nunca removidas, ver seção 10), mas um
cartão criado/editado pelo editor NOVO gravaria `null` nelas (ou as
deixaria como estavam, se for uma edição de um cartão que já era legado
-- decisão da seção 10) e populares só `fields`/`card_generation_mode`.
Nenhuma execução de SQL/migration foi feita nesta auditoria.

### 10. Compatibilidade -- proposta, não implementada

- **Editor de cartão NOVO -> sempre nativo**: todo cartão criado do zero
  pelo editor migrado grava `fields`+`card_generation_mode` desde o
  primeiro save, nunca as 12 colunas legadas (exceto que elas continuam
  `NOT NULL`-livres pelo schema atual -- só `back_trans`/`front`
  parcialmente obrigatórios hoje, migration 035/040 já tornou `front`
  opcional; as demais já são nullable desde sempre).
- **Edição de um cartão LEGADO existente**: 2 estratégias possíveis, sem
  decisão travada aqui --
  (a) **conversão no OPEN**: ao abrir o form de edição, o editor já
  reconstrói `fields`/`card_generation_mode` EM MEMÓRIA a partir das
  colunas legadas (mesma lógica que `interpretNoteFromRow()` já faz no
  motor, só espelhada no client antes de mostrar o form) -- a professora
  edita já no modelo novo, mas o SAVE só grava de fato como nativo se ela
  confirmar (ou sempre, silenciosamente). Risco: se ela cancelar sem
  salvar, nada muda (bom); se salvar, o cartão "migra" de propósito.
  (b) **conversão no SAVE**: o form de edição continua mostrando/editando
  as colunas legadas como hoje (zero mudança de UX pra cartão antigo),
  e só ganha um botão explícito "Migrar pro editor novo" que, quando
  clicado, reconstrói e grava `fields`/`card_generation_mode` (mantendo
  as colunas legadas como estavam, só ADICIONANDO os campos novos) --
  edição posterior desse mesmo cartão já cai automaticamente no editor
  nativo (porque `fields` já está presente). Esta opção é mais
  conservadora (nunca migra sem ação explícita), mas duplica esforço de
  UI (2 editores convivendo por um tempo).
  Nenhuma das duas foi escolhida -- fica pra a autora decidir (ver seção
  "decisões pendentes" abaixo).
- **Nunca conversão AUTOMÁTICA em massa/silenciosa de todo o histórico**
  -- nenhuma migration de dado proposta aqui, consistente com o
  princípio geral já travado (Fase 6B: "nunca migrar destrutivamente").
- **Preservar IDs/histórico FSRS/origin/metadados**: a migração de UMA
  linha de legado pra nativo (seja (a) ou (b) acima) só populariza
  `fields`/`card_generation_mode` -- NUNCA muda `id` da linha, `teacher_id`/
  `student_id`/`owner_id`, `language_app_key`, `status`, `created_at`.
  Como `flashcardIdForRow()` (fr/zh app.js) deriva o id do CARD a partir
  de `row.id`+`row.revision` (nunca do conteúdo/`fields`), migrar uma
  linha pro shape nativo SEM incrementar `revision` preservaria o id do
  card e portanto o progresso FSRS -- só precisaria incrementar
  `revision` se a ESTRUTURA (não só a representação) mudar de fato (ex:
  virar Cloze multi-marca onde antes era mono-marca, mudando quantos
  CardInstances a linha produz). Migrar um Normal legado pra um Normal
  nativo com os MESMOS 2 campos, na MESMA ordem, não precisaria de
  `revision++` -- o card resultante teria o mesmo `id`/`unitTitle`/
  `frontFieldIndex`/`backFieldIndex` de antes.

### 11. Validações -- lista completa, por categoria

**Estrutural (Note/Field, universal a todo Card Type)**:
- `fields` não vazio.
- Todo Field com `id` único dentro da Note.
- `pinyinFieldId` (quando presente) aponta pra um `id` real da mesma Note.
- `card_generation_mode` é um dos 5 valores reconhecidos.
- `fields`/`card_generation_mode` sempre pareados (nunca só um).
- (Já ENFORÇADO pelo motor, `validateNativeNoteRow` -- o editor só
  precisa produzir dado que passa, não reimplementar a checagem, mas
  DEVE validar client-side também pra dar feedback rápido, mesmo nível
  de confiança já usado hoje: client valida por UX, servidor/motor é a
  fonte de verdade.)

**Por Card Type**:
- **Normal**: os 2 slots de conteúdo não-vazios; se algum Field tem
  `pinyinFieldId`, o Field alvo existe e tem conteúdo (senão pinyin
  aponta pra um campo vazio).
- **Normal com reverso**: mesma validação do Normal (é a mesma Note) --
  nenhuma validação adicional própria, o motor já trata os 2
  CardInstances como 2 Normals independentes.
- **Múltipla escolha**: exatamente 1 `prompt`, exatamente 1 `answer`
  (nunca o mesmo Field), 1-3 `distractor`, todos com conteúdo não-vazio
  (já enforçado no motor, `validateMultipleChoiceFields` -- o editor
  precisa mostrar essas mensagens ANTES do submit, mesmo padrão já
  usado hoje pra `choices[]`).
- **Type Answer**: prompt e answer não-vazios; se `languageAppKey===
  'mandarim'`, o Field de resposta precisa ter `pinyinFieldId` apontando
  pra um Field com conteúdo (senão a comparação zh não tem contra o que
  comparar -- mesma regra que Cloze já aplica pro zh hoje).
- **Cloze**: o texto do Field precisa conter pelo menos 1 marca
  `{{cN::...}}` válida (o editor NUNCA deixa o texto sem marca nenhuma
  chegar no submit, já que a marcação é feita via UI, não digitada);
  cada marca com `answer` não-vazio; se `languageAppKey==='mandarim'`,
  cada marca precisa de `compareAnswer` (pinyin) preenchido (mesma regra
  que `clozeAnswerPinyin` já aplica hoje, só que por MARCA em vez de por
  cartão inteiro -- diferença real: hoje só 1 marca por cartão existe,
  múltiplas marcas cada uma precisaria da própria checagem).
- `pinyinFieldId`: quando o idioma da Note é mandarim e um Field é
  `lang:'zh'`, o editor deveria pedir (não necessariamente EXIGIR) um
  Field de pinyin pareado -- hoje isso é implícito (front_pinyin sempre
  ao lado de front no zh); no editor nativo isso vira "adicionar Field
  de pinyin" como uma ação explícita por Field zh.

**UX (não bloqueiam o motor, mas evitam erro óbvio antes de gastar uma
chamada de rede)**: mesmo padrão já em uso hoje (`wireFlashcardFieldValidation`,
borda vermelha + mensagem no blur) -- replicar por Field em vez de por
input fixo; desabilitar "Criar"/"Salvar" enquanto a seleção de
destinatários (professora) ou Card Type está incompleto; avisar ANTES do
submit se um upload de mídia falhar (já existe, mantém).

### 12. FR e ZH -- comparação

**Compartilhável sem adaptação**: toda a ESTRUTURA de estado/orquestração
do editor (`ADMIN_FLASHCARDS_STATE`/multi-seleção de alunos/busca/filtro
de idioma/mecânica de re-render incremental) -- não depende de idioma
nenhum, já é escrita 1x e só existe em cada arquivo por causa da
convenção espelhada fr/zh do repo (`shared/admin-flashcards.js` já É
compartilhado entre os 2 sites -- confirmado no cabeçalho do arquivo:
"Depende de... languages/<lang>/app.js" -- é o `fr/app.js`/`zh/app.js`
que diferem, não o admin-flashcards.js em si). **Continua compartilhado
no editor nativo** sem mudança.

**Precisa ficar específico**: (a) o mecanismo de pinyin -- zh SEMPRE quer
um Field de pinyin pareado a qualquer Field `lang:'zh'` (via UI: "esse
campo é chinês? adicione o pinyin dele"), fr nunca tem esse conceito; (b)
o seletor de direção (seção 4) -- fr oferece a escolha de idioma por
Field livremente (`FLASHCARD_DIRECTION_LANGUAGE_LABELS.frances`), zh HOJE
esconde o bloco inteiro (hanzi+pinyin é par inseparável, sem forma de
"inverter" sem um `back_pinyin` que não existe) -- essa restrição
continua válida no modelo nativo: um Field zh com `pinyinFieldId` só faz
sentido como slot FIXO (não pode virar "back" com um pinyin correspondente
inexistente do outro lado), então a UI de "trocar qual Field é front/
back" precisa CONTINUAR desabilitada quando qualquer Field envolvido
tem `pinyinFieldId`/é alvo de um -- não é uma limitação nova, é a MESMA
que já existe hoje, só reexpressa em termos de Field em vez de
`front_is_target_language`.
`compareAnswer` (Cloze/Type Answer): entra igual nos 2 idiomas
estruturalmente (é sempre "o que a aluna digita, se for diferente do
texto revelado") -- só o zh tipicamente PRECISA dele (pinyin != hanzi),
fr tipicamente não (mesma string pros 2 papéis) -- o editor pode pedir o
campo sempre, mas só EXIGIR preenchido quando `languageAppKey===
'mandarim'` (mesma regra condicional já usada hoje).

### 13. Arquitetura proposta -- divisão em subfases

Estrutura sugerida pela autora, ajustada com achados desta auditoria (só
1 ajuste: 6D.4 dividido em 6D.4a/6D.4b porque "Múltipla escolha" e "Type
Answer" têm complexidade bem diferente -- MC já tem quase toda a UI
pronta hoje, Type Answer não tem NENHUMA):

- **6D.1 -- Estado/modelo do editor**: trocar o objeto de estado plano
  (`{front, backTrans, ...}`) por um objeto que já modela `{fields:[],
  cardGenerationMode}` na memória do formulário -- SEM mudar nenhuma UI
  visível ainda, só a representação interna. Menor risco possível,
  puramente refatoração de dado.
- **6D.2 -- Seleção de Card Type**: substitui o radio `flip/mc/cloze`
  por um seletor que cobre os 5 tipos reais (incluindo `normal_reversed`
  e `type_answer`, hoje sem UI nenhuma) -- ainda sem editor de Field
  completo, só a escolha + esqueleto de campos por tipo.
- **6D.3 -- Editor de Field**: componente reaproveitável "1 Field" (texto
  + seletor de idioma + upload de áudio próprio + upload de imagem +
  toggle de pinyin pareado) -- usado por Normal (2x)/Normal-reversed
  (2x, mesmo componente)/Type Answer (2x).
- **6D.4a -- Múltipla escolha**: adapta o componente de Field pra
  `role` (prompt/answer/distractor) em vez de posição -- menor esforço,
  UI já existe quase pronta hoje.
- **6D.4b -- Type Answer**: primeiro tipo 100% novo na UI -- reaproveita
  o componente de Field de 6D.3, sem UI própria significativa além de
  ligar `promptFieldIndex`/`answerFieldIndex`.
- **6D.5 -- Cloze visual**: o item mais grande/arriscado (seleção de
  texto + inserção de marca + numeração automática + editar/remover
  marca + popover de `compareAnswer` pro zh) -- merece ficar sozinho,
  sem competir com nenhuma outra mudança na mesma entrega.
- **6D.6 -- Persistência nativa**: submit passa a gravar `fields`+
  `card_generation_mode` de verdade (em vez de só simular em memória
  desde 6D.1) -- só DEPOIS que 6D.1-6D.5 já provaram a UI inteira contra
  dado em memória, reduz risco de gravar lixo no banco por um bug de UI
  ainda não pego.
- **6D.7 -- Preview**: monta `row` sintético a partir do estado do
  formulário (já no shape nativo desde 6D.1) e chama
  `buildEngineCardsFromRow`+o renderer certo (Fase 6C) num
  `previewMountEl` dedicado, com `callbacks.onAnswered` no-op -- só faz
  sentido depois que 6D.1-6D.5 garantem que o `row` sintético é
  representativo do que será salvo de verdade.
- **6D.8 -- Compatibilidade/migração de edição**: decide e implementa
  (a) ou (b) da seção 10 pra cartão legado sendo editado -- deliberadamente
  por ÚLTIMO, depois que o editor nativo já está provado em cartão NOVO;
  editar cartão antigo é o caminho de maior risco (dado real, histórico
  FSRS real).

### Decisões que precisam de aprovação explícita da autora antes de
qualquer código (nenhuma travada nesta auditoria)

1. **Imagem por Field** (seção 6): o schema já suporta, o pipeline de
   leitura não resolve ainda -- decidir se uma fase própria estende
   `resolveCardField()`/renderers ANTES do editor tentar oferecer upload
   de imagem por Field, ou se o editor nativo continua com 1 imagem por
   Note (como o legado) até essa fase existir.
2. **Rich text** (seção 7): qual dos 2 caminhos técnicos (HTML
   sanitizado vs. documento estruturado) -- ou se rich text fica de fora
   do escopo da Fase 6D inteira e vira uma Fase 9 própria mais adiante.
3. **Compatibilidade de edição de cartão legado** (seção 10): estratégia
   (a) conversão no open vs. (b) conversão explícita via botão -- ou uma
   terceira opção que a autora prefira.
4. **`revision` em edição não-estrutural** (seção 9): manter sempre
   incrementando (comportamento atual, simples) ou distinguir edição de
   conteúdo (não reseta progresso) de edição estrutural (reseta) -- mais
   fiel à intenção original do mecanismo, mas exige o editor saber
   classificar o tipo de mudança.
5. **Ordem/escopo das subfases** (seção 13): confirmar a divisão 6D.1-
   6D.8 acima, ou repriorizar (ex: `type_answer`/`normal_reversed` podem
   ficar pra depois se a prioridade real for só polir os 3 tipos que já
   têm UI hoje).
6. **Cloze multi-marca na UI** (seção 3): confirmar que o editor deve
   suportar MÚLTIPLAS marcas por frase desde já (o motor já suporta
   desde a Fase 5), ou se o MVP da 6D.5 cobre só 1 marca por frase
   (paridade com o legado) e multi-marca fica pra depois.

Nenhuma implementação foi feita nesta auditoria -- `git status` limpo do
início ao fim (confirmado). Próxima fase (6D.1, ou a ordem que a autora
preferir) só começa depois de autorização explícita sobre as 6 decisões
acima, com este relatório já entregue antes de pedir luz verde.

## Fase 6D.1 -- estado/modelo nativo do editor (fundação, zero UI nova)

Primeira subfase de código da Fase 6D, autorizada com 6 decisões já
travadas (ver mensagem completa): imagem é propriedade do Field (não do
Note); rich text explicitamente adiado, `Field.content` continua
`{value: string}`; cartão legado NUNCA convertido automaticamente (abrir
+ cancelar não pode gravar nada); `revision` incrementa em QUALQUER
alteração de conteúdo persistível (regra coarse, de propósito, mesma
disciplina do editor legado hoje); ordem 6D.1→6D.8 confirmada; Cloze
multi-marca faz parte do MVP da 6D.5 (fora do escopo desta subfase).

**Reauditoria antes de codar** (pedido explícito): reli
`shared/admin-flashcards.js`, `shared/my-flashcards.js`,
`shared/teacher-flashcards.js`, `shared/own-flashcards.js`, `fr/app.js`,
`zh/app.js` e `shared/flashcard-model.js` de novo -- confirmado que nada
mudou desde a auditoria da Fase 6D (mesma estrutura, mesmo achado
central: editor legado nunca toca `interpretNoteFromRow`/o modelo
Note/Field).

**O que foi feito -- um único arquivo novo, `shared/flashcard-editor-state.js`**
(script-global plano, mesma convenção de todo `shared/*.js` do repo --
sem IIFE/módulo, carregado logo depois de `shared/flashcard-model.js` em
`fr/index.html`/`zh/index.html`, ANTES de `shared/teacher-flashcards.js`).
**Nenhum call site real chama nada deste arquivo ainda** -- é fundação
pura, sem efeito em produção. Os 4 baldes pedidos, cada um com sua
própria seção no arquivo:

1. **Note editor state** (o que É persistível) -- `createFieldState()`
   (Field: `id`/`lang`/`role`/`content:{value}`/`audio`/`image`/
   `pinyinFieldId`, EXATAMENTE o shape que `validateNativeNoteRow`/
   `buildNativeRuntimeFields` do motor já consomem, nenhuma propriedade
   extra); `createNativeNoteEditorState()` (estado novo, do zero);
   `createNativeNoteEditorStateFromRow(row)` (a partir de uma linha JÁ
   nativa -- reaproveita `isNoteFieldsPresent`/`isCardGenerationModePresent`/
   `validateNativeNoteRow` do motor pra validar/rejeitar, nunca
   reimplementa a checagem).
2. **"Note" o conceito** (`fields`+`cardGenerationMode`) -- vive DENTRO
   do state acima, não confundido com o balde 3. `cardGenerationMode`
   validado contra `CARD_GENERATION_MODES` (mesma constante do motor,
   nunca uma cópia).
3. **Estado de UI efêmero** -- `createEditorUiState()`, objeto
   TOTALMENTE SEPARADO (nunca mesclado no Note editor state) --
   deliberadamente mínimo (`selectedFieldId`/`focusedFieldId`), reservado
   pras subfases 6D.2+. Testado explicitamente que mutar esse objeto
   nunca muda o snapshot do Note editor state (são objetos disjuntos, a
   garantia é estrutural, não uma convenção).
4. **Legacy row** -- `createLegacyNoteEditorStateFromRow(row)` embrulha
   as 10 colunas legadas relevantes (`front`/`back_trans`/
   `front_pinyin`/`front_is_target_language`/`note`/`image_url`/
   `audio_url`/`choices`/`cloze_sentence`/`cloze_answer`/
   `cloze_answer_pinyin`) num `{kind:'legacy', legacyRow:{...}}` --
   NUNCA converte pra native. Testado explicitamente: abrir (criar o
   estado) + clonar + descartar não muta nem o clone-original nem a
   linha (`row`) de origem, bit a bit.

**Dispatcher único** -- `createNoteEditorStateFromRow(row)` decide
native vs. legacy com o MESMO critério de pareamento que
`interpretNoteFromRow()` (motor) já usa; `isNativeNoteEditorState()`/
`isLegacyNoteEditorState()` são os únicos pontos de checagem do
discriminador `state.kind`.

**Clonagem/snapshot/comparação** -- `cloneNoteEditorState()` (round-trip
JSON, seguro porque todo state é dado 100% plano); `snapshotNoteEditorState()`
(string estável, NUNCA comparação por referência de objeto JS -- pedido
explícito da autora); `noteEditorStatesEqual()`/`noteEditorStateChanged()`/
`noteEditorStateRequiresNewRevision()` (as duas últimas hoje são
IDÊNTICAS de propósito -- regra coarse da decisão 4 -- expostas com
nomes próprios pra quando uma taxonomia mais fina existir, só essa função
mudar).

**Achado de design não trivial, resolvido antes de escrever os testes**:
a comparação de conteúdo (`noteEditorStateContentForComparison()`,
função interna) EXCLUI `noteId`/`revision`/`origin` do que é comparado --
são identidade/versão/proveniência, não conteúdo. Incluir `revision` na
comparação seria circular (o valor que se está decidindo se deve
incrementar já estaria dentro do critério que decide isso). Não estava
explícito no pedido, mas é necessário pra a API fazer sentido -- documentado
no código com essa justificativa.

**`noteEditorStateToRow(state, extra)`** -- transform de dado PURO
(nenhuma chamada de rede), devolve o shape de linha que
`interpretNoteFromRow()`/`buildEngineCardsFromRow()` (motor real) já
sabem interpretar. Preparação explícita pra 6D.6 (persistência)/6D.7
(Preview) -- usado nos testes desta subfase pra confirmar ROUND-TRIP
REAL contra o motor (não uma cópia/simulação): um estado construído por
este arquivo, convertido pra "linha", passado pelo `buildEngineCardsFromRow()`
de produção, produz o CardInstance certo.

**Decisões arquiteturais desta subfase:**
1. `Field.content` permanece `{value: string}` -- nenhum campo `type`
   especulativo adicionado (um teste de sessão anterior, Fase 6B, já
   usava `content:{type:'plain', value}` como convenção só de teste,
   nunca lida pelo motor -- decidido NÃO copiar essa convenção aqui, pra
   não fechar nem abrir a decisão de rich text ainda em aberto, ver
   seção 7 da auditoria da Fase 6D).
2. `privateNote` (nota privada da professora, coluna `note` legada)
   mora no Note editor state, não em nenhum Field -- não é conteúdo
   pedagógico do cartão. ENTRA na comparação de conteúdo/revision
   (decisão 4, coarse) -- editar só a nota privada hoje já reseta
   `revision` no editor legado (`updateFlashcardContent` sempre
   incrementa, não importa o campo), então incluir `privateNote` aqui
   mantém paridade com esse comportamento, não é uma regressão nova.
3. Um único arquivo compartilhado fr+zh (não duas cópias) -- a
   estrutura de estado não depende de idioma nenhum (confirmado na
   auditoria da Fase 6D, seção 12: "compartilhável sem adaptação"); as
   regras específicas de zh (pinyin sempre pareado, seletor de direção
   desabilitado) ficam pra quando a UI de fato existir (6D.2+), não
   precisam de nenhuma duplicação nesta camada de estado puro.
4. Nenhuma mutação de `CardInstance` em lugar nenhum do arquivo --
   confirmado por busca final (ver abaixo) -- CardInstances continuam
   100% derivados/não-persistidos, este arquivo nunca toca em `card.
   cardInstance`/`STATE.cards`.

**Testes realizados:**
- `node --check shared/flashcard-editor-state.js` sem erro.
- **Suíte Node nova, `test_fase6d1_editor_state.js`, 99/99** -- cobre
  TODOS os itens pedidos explicitamente (Field state/geração de id/
  normalização de content; criação native nova com múltiplos Fields/
  role/audio/image/pinyinFieldId; criação a partir de linha real pros 5
  Card Types -- `normal`/`normal_reversed`/`multiple_choice`/
  `type_answer`/`cloze` -- via `buildEngineCardsFromRow()`+
  `resolveCardContentView()` REAIS do motor, não simulados, inclusive
  `normal_reversed` com FSRS confirmadamente independente entre as 2
  metades e Cloze multi-marca gerando 2 CardInstances reais; legacy
  embrulhado sem converter, com teste dedicado de "abrir+clonar+descartar
  nunca muta a linha original"; dispatcher roteando native/legacy/
  pareamento-quebrado corretamente; UI efêmera comprovadamente disjunta
  do Note editor state; snapshot/comparação nos 8 tipos de alteração
  pedidos -- conteúdo, idioma, Field adicionado, Field removido, Card
  Type, áudio, imagem, `pinyinFieldId` -- mais o caso "só `noteId`/
  `revision` mudou não conta como mudança de conteúdo"; `noteEditorStateToRow`
  com round-trip real através do motor; varredura final confirmando
  ausência de `isReverse`/`reviewDirection`/`nextCardDirection` em
  qualquer estado gerado, e confirmando que `front_is_target_language`
  só existe dentro de `legacyRow` (nunca como mecanismo native).
- Suítes anteriores re-executadas sem nenhuma regressão (esperado --
  `shared/flashcard-model.js` não foi tocado): `test_fase4_engine.js`
  32/32, `test_fase4d_regression.js` 30/30, `test_fase5_generation.js`
  33/33, `test_fase6b_native_notes.js` 74/74 -- **169/169**.
- **Smoke test de navegador real, FR+ZH** (`test_fase6d1_browser_smoke.js`,
  Playwright, mesmo padrão de boot/stub de todas as subfases anteriores)
  -- confirma que introduzir o novo `<script>` (sem nenhum call site
  ainda) NÃO quebrou nada: as 15 funções do módulo novo acessíveis
  globalmente na página real (confirma ordem de `<script>` certa --
  `CARD_GENERATION_MODES` do motor acessível); o módulo novo funciona
  de ponta a ponta no contexto real da página (não só isolado em `vm`);
  `ADMIN_FLASHCARDS_STATE`/`MY_FLASHCARDS_STATE`/`flashcardIdForRow()`
  do editor ATUAL continuam com a mesma forma/comportamento de sempre;
  os 4 renderers da Fase 6C (`renderNormalCard`/`renderMultipleChoiceCard`/
  `renderTypeAnswerCard`/`renderClozeCard`) continuam presentes e
  `renderNormalCard()` chamado de verdade sobre um cartão legado real
  produz o HTML esperado (Review 100% intacto); cartão nativo (Fase 6B)
  continua gerável via `buildEngineCardsFromRow()`; e um estado
  construído por este arquivo a partir da MESMA linha nativa bate em
  contagem de Fields com o que o motor de fato lê -- nos dois idiomas,
  todos os checks `true`. Zero erro de console novo (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, já documentados em toda a sessão).
- **Busca final**: `isReverse`/`reviewDirection`/`nextCardDirection` --
  só 1 ocorrência no arquivo novo, dentro de um COMENTÁRIO listando o
  que é proibido, zero em código executável;
  `frontIsTargetLanguage`/`front_is_target_language` -- só na prosa do
  comentário e dentro do shape de `legacyRow` (exatamente onde deveria
  estar -- é a coluna legada real, preservada como está, nunca um
  mecanismo native); `note.audio`/`note.image`/`card.audio`/`card.image`
  -- só num comentário explicando que são intencionalmente ausentes,
  nunca criados de fato; nenhuma chamada `supabaseClient`/`.insert(`/
  `.update(`/`.from(` no arquivo novo (zero I/O, confirmado); `git diff`
  de `fr/index.html`/`zh/index.html` mostra EXATAMENTE as 2 linhas de
  `<script>` adicionadas, nada mais.

**Escopo respeitado**: só `shared/flashcard-editor-state.js` (novo) +
2 linhas de `<script>` em `fr/index.html`/`zh/index.html`. Nenhum
renderer da Fase 6C tocado, nenhum Review, FSRS, TTS, Preview, migration,
ou UI nova (seletor de Card Type/editor de Field/toolbar/Cloze visual/MC/
Type Answer/upload) implementados -- todos explicitamente reservados pra
6D.2+.

**O que fica pra 6D.2+ (nada disto foi feito aqui, de propósito):**
- Nenhum call site real (`admin-flashcards.js`/`my-flashcards.js`) chama
  `createNoteEditorStateFromRow`/`createNativeNoteEditorState`/etc.
  ainda -- o editor continua 100% no shape legado plano hoje.
- Nenhum mutador de Field (`addField`/`removeField`/`updateField`) --
  decisão consciente de não antecipar isso, pertence à 6D.3 (editor de
  Field reutilizável), que vai decidir a forma certa de mutar em cima de
  UI real, não adivinhada agora sem um call site.
- Nenhuma UI nova de nenhum tipo (seletor de Card Type, editor de Field,
  Cloze visual, upload de mídia, Preview) -- confirmado zero-CSS/zero-DOM
  novo nesta entrega.
- Persistência (INSERT/UPDATE gravando `fields`/`card_generation_mode`
  de verdade) -- `noteEditorStateToRow()` já existe como preparação, mas
  nada chama Supabase com ele ainda -- 6D.6.
- Estratégia de conversão legacy→native no editar (decisão (a) vs (b) da
  auditoria da Fase 6D, seção 10) -- ainda não escolhida, fica pra 6D.8.

Nenhum passo manual pendente pra autora -- zero migração/mudança de
schema nesta subfase. Próxima subfase (6D.2 -- seletor de Card Type) só
começa depois de autorização explícita, com este relatório já entregue
antes de pedir luz verde.
