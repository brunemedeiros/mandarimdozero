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
