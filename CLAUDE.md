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
