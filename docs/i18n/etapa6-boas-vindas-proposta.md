# Etapa 6 do plano "Voz da Prof. Brune": boas-vindas na primeira lição (auditoria + proposta)

Data: 2026-10-23. Situação: auditoria e proposta (seções 1 a 6); **implementado em 2026-10-26** (A e B, decisões da dona, seção 7). Não publicado.
Grátis x Premium: **tudo grátis** (boas-vindas e explicações valem para qualquer conta).

Capturas e prévias (scratchpad desta sessão, fora do repositório):
`/tmp/claude-0/-home-user-mandarimdozero/3e41ab12-78b3-5f2b-964b-fef249117fbb/scratchpad/etapa6-boas-vindas/`
- `auditoria/<fr|zh>-<pt-BR|en>/NN-*.png` (celular 390px, claro) e `auditoria/fr-pt-BR-google/` (cadastro pelo Google);
  `auditoria/entrada-experiencia-*.png` (última tela da entrada). Ignorar `auditoria/_rodadas-antigas/`.
- `previa/opcao-<a|b>-<fr|zh>-<pt-BR|en>-<claro|escuro>-<390|1280>.png` e o HTML estático de cada uma em `previa/html/`.
- Scripts: `auditoria.js` (conta nova simulada, anda pela lição 1 respondendo certo e registra cada janela) e
  `previa/render.js` (injeta a prévia na tela real da lição, com as fontes e os tokens de cor reais de cada site).

## 1. Como foi feito

Conta nova simulada com Playwright (Supabase trocado por um stub: sessão ativa, progresso vazio, `progressAccountIsNew`),
chegando ao app do jeito que a entrada deixa: idioma do site já escolhido (`ui-language-gate`), curso escolhido, cadastro
por e-mail (o @ já foi gravado na entrada) ou pelo Google (o app pede o @). fr e zh, pt-BR e en, 390px.
Limites da simulação: o banco não responde de verdade (perfil, Decks, convites da professora, Mural), então o nome da
pessoa aparece como "Convidado" na frase da lição e a aba Revisão pode diferir da produção nos Decks (ver 2.3).

## 2. Auditoria: o que a pessoa vê, em ordem

### 2.1 Entrada (já feita nas etapas anteriores, só para contexto)
1. Entrar / "Crie sua conta grátis" → 2. Passo 1 de 3: "Eu falo..." + curso → 3. Passo 2: "Bonjour !"/"你好！" e
Google ou e-mail → 4. Passo 3: nome, @, e-mail, senha → 5. Código do e-mail → 6. **"Você já sabe algo de francês?"**
(Sou iniciante / Já sei o básico) → abre `/fr/` ou `/zh/`.

### 2.2 Primeiro acesso no app (sequência real, igual em fr e zh, pt-BR e en)
| # | Tela / janela | Captura |
|---|---|---|
| 1 | Trilha do curso, sem nenhuma janela por cima (cadastro por e-mail). Topo: 🔥 0, ⭐ 0, sino, bandeira. "Nível 1 · Débutant (A1)", "Unidades organizadas por objetivo comunicacional...", "Missões do dia" fechado, cartão **"Comece por aqui"** com Começar, lista da unidade 1. | `fr-pt-BR/01-trilha-chegada.png`, `zh-pt-BR/01-*` |
| 1b | Só no cadastro pelo Google: janela obrigatória **"Escolha seu nome e seu @"** (sem fechar) logo na chegada. | `fr-pt-BR-google/03-janela-0.png` |
| 2 | Lição 1, cartões de palavra (3): palavra, áudio, "Já sei?", "Na frase", "Próxima palavra →". O último botão diz **"Ver o que você aprendeu →"**. | `fr-pt-BR/04..06` |
| 3 | Nota "💡 Vale entender isso" (fr: "Bonjour" ou "Bonsoir"?). | `fr-pt-BR/07` |
| 4 | "🧠 Checagem rápida", 3 exercícios, cada um com painel de acerto/erro e Continuar. | `fr-pt-BR/08..17` |
| 5 | **"Lição concluída!"**: XP ganho (+8/+9 ⚡), pontuação, chip "Missão concluída: Mantenha sua sequência de dias viva hoje", vocabulário da lição, Continuar. | `fr-pt-BR/21-licao-concluida-sem-janela.png` |
| 6 | 0,5 s depois, **janela da sequência** por cima: "Você está em uma sequência de 1 dia! Volte amanhã para manter sua sequência." com os avisos "+1 XP" e "+4 XP" empilhados em cima da chama. | `fr-pt-BR/19-licao-concluida-com-janela.png` |
| 7 | Continuar → volta à Trilha: "Continue de onde parou · lição 2 de 4", 🔥 1. | `fr-pt-BR/23-trilha-depois.png` |
| 8 | (se a pessoa abrir) Revisão: "6 Novo · 0 Aprendendo · 0 Revisar", "Estudar tudo (6)" e, logo abaixo, "Nenhum Deck ainda. Conclua uma lição ou crie um Deck." | `fr-pt-BR/26-revisao-depois.png` |

Não aparecem no primeiro acesso: "Eu falo..." do app (a entrada já respondeu), assistente de metas (fica em Perfil > Metas,
só abre pelo botão), convite de notificações (só em Amigos e no 1º amigo), lembrete de revisão do rodapé (não aparece em lição).
Convite da professora e Mural só aparecem para quem tem convite/turma (não simulado).

### 2.3 Achados
**Repetido**
- A sequência é anunciada três vezes no mesmo minuto: chip "Missão concluída: Mantenha sua sequência...", janela da
  sequência e o 🔥 do topo. A janela ainda cobre a tela de conclusão (que é o resumo da lição).
- Avisos "+1 XP"/"+4 XP" aparecem por cima da janela da sequência, depois de a tela já ter mostrado "+9 XP ganho".

**Confuso**
- XP tem dois ícones: ⭐ no topo e ⚡ na tela de conclusão. Nenhum lugar diz o que é XP nem para que serve.
- "Ver o que você aprendeu →" (último cartão de palavra) leva à nota "Vale entender isso", não a um resumo.
- zh: "Você já sabe algo de chinês?" tem **uma opção só** ("Sou iniciante"), porque o zh não tem Teste de Nível
  (`hasLevelTest: false`). Pergunta com uma resposta só: pular a tela no zh (proposta fora do escopo desta etapa).
- Revisão depois da lição 1: "Estudar tudo (6)" ao lado de "Nenhum Deck ainda. Conclua uma lição" (a pessoa acabou de
  concluir uma). **Conferir na produção**: pode ser efeito do stub (Decks vêm do banco). As 3 palavras viram 6 cartões
  (ida e volta), o que também não é explicado.
- Topo: zh mostra "⭐ 0 XP", fr mostra "⭐ 0" (paridade, pequeno).
- Ícones sem nome na lição (⚑, ⌨️ e, no zh, "abc") e o texto da trilha "organizadas por objetivo comunicacional" são
  jargão para quem acabou de chegar.
- Nota do fr com travessão ("— é a saudação padrão do dia", "— nunca com desconhecidos"): conteúdo, não interface; registrar
  para a revisão de conteúdo.

**Falta para a pessoa entender**
- Quem é a Prof. Brune: o app nunca se apresenta com a voz dela (só a logo).
- O que é uma lição (quantas palavras, quanto tempo, que errar não tira nada).
- Que as palavras vão para a **Revisão** e por que voltar lá: a tela de conclusão não diz nada (a linha "N cartões esperando"
  só conta cartões vencidos não novos, então na lição 1 nunca aparece).
- O que é XP. A sequência só é explicada pela janela ("Volte amanhã...").

**Onde cabe uma boas-vindas sem empilhar janela**
- Na chegada não há nenhuma janela (e-mail) ou há uma obrigatória (Google): **não** colocar outra ali.
- Dentro da lição, como um passo antes da 1ª palavra (opção A): é a tela inteira da lição, não é janela.
- Na tela "Lição concluída!" da 1ª lição (opção B): **trocando** a janela da sequência por um bloco na própria tela.

## 3. Proposta: duas opções

Regras comuns às duas:
- **Uma vez só por conta**: aparece só se a conta não concluiu nenhuma lição em nenhum curso. Guardado no progresso da
  conta em `progress.data._meta.welcome` (ex.: `{ "firstLesson": "2026-10-23" }`), no mesmo caminho do `_meta.uiLanguage`
  (`shared/auth.js`). Conta antiga nunca vê; segundo curso da mesma conta não vê de novo. Sem migration (é um campo do JSON).
- Texto pelo catálogo (`t()`, chaves novas `welcome.*` em pt-BR e en; en sem nada em português). Nome = primeiro nome do
  perfil; sem nome, "Oi!" sem vírgula e nome.
- Acessibilidade: não é janela (sem foco preso); ao aparecer, o foco vai para o título (`tabindex="-1"`), o botão principal é
  o `#step-next-btn` de sempre (44px no celular, Enter avança), Esc/✕ fecham a lição como hoje, `prefers-reduced-motion`
  respeitado, ícones `aria-hidden`, foto com `alt=""` (o nome está escrito ao lado).
- Cores só com tokens do site (`--brand-fill`, `--paper-warm`, `--paper-line`, `--ink`, `--ink-soft`, `--seal-red-dark`),
  ícones Fluent (📖 🧠 🔁 ⏱ 🔥 ⭐ já estão no MAP). Foto: `icons/brune-email.jpg` (a mesma dos e-mails; é na Torre Eiffel,
  ver pergunta 3).

### Opção A: cartão de boas-vindas no começo da lição 1
**Quando**: ao abrir a 1ª lição da conta, como passo 0 da lição (antes do 1º cartão de palavra; barra de progresso em 0).
**Como some**: "Começar a lição →" segue para o 1º cartão e grava `_meta.welcome.firstLesson`. Sair pelo ✕ também grava
(não reaparece na próxima vez). Voltar (←) do 1º cartão não volta para ele.
**O que NÃO aparece junto**: nenhuma janela; as fases da lição ("Checagem rápida") começam só depois.

pt-BR:
> SUA PRIMEIRA LIÇÃO · Prof. Brune
> **Oi, Ana! Que bom ter você aqui.**
> Eu vou te acompanhar no francês, uma lição curtinha por vez. Nesta primeira, é assim:
> 📖 **3 palavras novas** · Com áudio e uma frase de exemplo. Toque no 🔊 quantas vezes quiser.
> (zh: Com hanzi, pinyin e áudio. Toque no 🔊 quantas vezes quiser.)
> 🧠 **Uma checagem rápida** · Cada acerto vale XP. Errou? Faz parte: você vê a resposta e segue.
> 🔁 **Depois, a Revisão** · As palavras vão para a sua Revisão e voltam na hora certa, para você não esquecer.
> ⏱ Leva uns 3 minutos.
> [Começar a lição →]

en:
> YOUR FIRST LESSON · Prof. Brune
> **Hi, Ana! So glad you're here.**
> I'll be with you as you learn French, one short lesson at a time. Here's how this first one works:
> 📖 **3 new words** · With audio and an example sentence. Tap 🔊 as often as you like.
> (zh: With hanzi, pinyin and audio. Tap 🔊 as often as you like.)
> 🧠 **A quick check** · Every right answer earns XP. Got one wrong? That's part of it: you see the answer and keep going.
> 🔁 **Then, Review** · The words go to your Review and come back at the right time, so they stick.
> ⏱ Takes about 3 minutes.
> [Start the lesson →]

O número de palavras vem da lição (`lesson.vocabIdx.length`, 3 no fr e no zh). "Uns 3 minutos" é estimativa (14 passos
na lição 1); medir com os dados de uso antes de publicar ou trocar por "Leva poucos minutos".

### Opção B: a tela "Lição concluída!" da 1ª lição comemora e explica
**Quando**: na conclusão da 1ª lição da conta (não no Ponto de verificação).
**Como some**: é parte da tela; Continuar segue como hoje e grava `_meta.welcome.firstLesson`. Nas lições seguintes a tela
volta a ser a de sempre.
**O que NÃO aparece junto**: a janela da sequência (o bloco já diz "Sequência: 1 dia"; a janela volta a valer a partir do
2º dia), os avisos "+N XP" desta conclusão e o chip "Missão concluída: Mantenha sua sequência..." (o bloco cobre os dois).
Também usa ⭐ no "XP ganho", igual ao topo.

pt-BR:
> ✅ **Lição concluída!** · Dizer olá e até logo · XP ganho +9 ⭐ · Pontuação 83%
> RECADO DA PROF. BRUNE
> **Mandou bem, Ana! Suas primeiras palavras em francês já são suas.**
> 🔥 **Sequência: 1 dia** · Hoje já contou. Estude um pouquinho amanhã e ela vira 2 dias.
> 🔁 **Revisão** · As 3 palavras foram para a sua Revisão. Uns minutinhos por dia é o que faz elas ficarem.
> ⭐ **9 XP** · Lições e revisões somam XP para as Missões do dia e o Ranking.
> Vocabulário desta lição (como hoje) · [Continuar →]

en:
> ✅ **Lesson completed!** · XP earned +9 ⭐ · Score 83%
> A NOTE FROM PROF. BRUNE
> **Nice work, Ana! Your first French words are yours now.**
> 🔥 **Streak: 1 day** · Today counts. Study a little tomorrow and it becomes 2 days.
> 🔁 **Review** · Your 3 words are now in Review. A few minutes a day is what makes them stick.
> ⭐ **9 XP** · Lessons and reviews add XP to your Daily Missions and the Leaderboard.
> Vocabulary from this lesson · [Continue →]

Confiança das traduções: alta (texto curto, termos já usados no catálogo: "Review", "Daily Missions", "Leaderboard", "streak").

## 4. Recomendação

**Opção B**, com um ajuste opcional pequeno da A.
- B explica Revisão, sequência e XP no momento em que eles acontecem (a pessoa acabou de ganhar os três), e **diminui** o que
  aparece: troca a janela da sequência, os avisos de XP e o chip da missão por um bloco só, na voz da Prof. Brune.
- A acrescenta um passo antes de a pessoa aprender qualquer coisa; a lição 1 já se explica sozinha (cartão com áudio,
  "Na frase", Próxima palavra). O que a A tem de melhor (apresentar a Prof. Brune e "Leva uns 3 minutos") pode ir, se a dona
  quiser, como uma linha no cartão "Comece por aqui" da trilha (ex.: "Oi, Ana! Sua primeira lição leva uns 3 minutos."), sem janela.
- Corrigir junto (pequeno, mesma área): "Ver o que você aprendeu →" no último cartão de palavra, ⭐/⚡ do XP, e pular
  "Você já sabe algo de chinês?" no zh.

## 5. Perguntas para a dona
1. A ou B (ou B + a linha no "Comece por aqui")?
2. Na B, tirar a janela da sequência só na 1ª lição está bem? (Ela volta normal no 2º dia.)
3. Foto: a mesma dos e-mails (Torre Eiffel) também no chinês, ou uma foto neutra para todos os cursos?
4. "Leva uns 3 minutos": manter (estimativa) ou "Leva poucos minutos"?

## 6. Validação das prévias
Prévias renderizadas dentro da tela real da lição (`fr/index.html`, `zh/index.html`), claro e escuro, 390px e 1280px, pt-BR
(e en em fr claro e zh escuro): 20 imagens, 0 erros de página, 0 rolagem horizontal em 390px, botão principal 44px.

## 7. Implementação (2026-10-26, branch `claude/optimistic-ramanujan-tercxc`, sem commit)

Decisões da dona (2026-10-26): fazer **A e B**; boas-vindas **por curso** (não por conta); "Leva poucos minutos."; foto
`icons/brune-email.jpg` nos dois cursos (liberada também no chinês); nome = primeiro nome do perfil, sem nome a frase sai
sem nome. Junto, na mesma área: janela da sequência depois do Continuar, XP só com ⭐, fim das Estrelas, Ponto de verificação
sem caixa de recompensa, "Pulada" única, selo "⭐ Premium" no Mapa, botão do último cartão de palavra e pergunta do zh.
Grátis x Premium: tudo grátis.

### Regra "uma vez por curso"
- Aparece enquanto o **curso atual** não tem nenhuma lição concluída nem unidade pulada/concluída (`welcomeCourseFresh`:
  `unitProgress` sem `completed` e sem `lessonIdx > 0`; no zh também sem lição de hanzi concluída).
- Marca no progresso **desse curso**: `STATE.welcome = { a: 'AAAA-MM-DD', b: 'AAAA-MM-DD' }`, salvo no bloco do curso
  (`serializeState`/`applySerializedState`, `shared/core/estado-salvar.js`); nada vai para `_meta` da conta. A e B marcados
  separadamente (quem saiu pelo ✕ no cartão A ainda vê B na 1ª conclusão). Sem migration (campo do JSON).
- Resultado: conta nova vê; segundo curso da mesma conta vê de novo naquele curso; curso com progresso não vê; não repete
  no mesmo curso; zerar o curso traz de volta.

### O que mudou (tudo em `shared/`, vale para fr, zh e os próximos sites)
| Item | Onde |
|---|---|
| A: cartão antes da 1ª palavra (passo da lição, sem janela; foco no título; botão `#step-next-btn` "Começar a lição →"; Voltar da 1ª palavra não volta a ele; marca ao aparecer) | `shared/core/boas-vindas.js` (novo), `renderStep` em `shared/core/trilha-licao.js`, clique em `shared/core/app-comum.js` |
| B: bloco "Recado da Prof. Brune" na tela "Lição concluída!" da 1ª lição (sequência, Revisão, XP reais); sem o chip da missão nem avisos "+N XP" por cima | `finishCurrentLesson` (`shared/core/licao-base.js`), `renderLessonCompleteScreen` (`shared/core/quase-iguais-textos.js`) |
| CSS do cartão e do bloco (só tokens) | `shared/boas-vindas.css` (novo), ligado em `fr/index.html` e `zh/index.html` |
| Janela da sequência: nunca por cima das telas de conclusão (Lição, Unidade, Ponto de verificação do módulo, Teste de Nível, lição de hanzi do zh); aparece depois do Continuar, de volta à trilha (ou ao sair pelo ✕); avisos de XP que estavam na tela somem quando ela abre | `showDeferredStreakCelebration` em `shared/core/gamificacao.js`; chamadas em `app-comum.js`, `exitToPath` (`quase-iguais-simples.js`), `handleModuleStepNext` (`modulos-niveis.js`), `markUnitCompleted` (`trilha-licao.js`), `zh/app.js` (hanzi) |
| Na 1ª lição com o bloco B, a janela é **pulada**: diria a mesma coisa que o item "Sequência: 1 dia" do bloco ("Você está em uma sequência de 1 dia! Volte amanhã..." x "Hoje já contou. Estude um pouquinho amanhã e ela vira 2 dias."). A notificação do sino continua. | `showDeferredStreakCelebration` |
| XP só com ⭐: "XP ganho" de Lição/Unidade concluída e a missão "Ganhe 50 XP hoje" (fr e zh). ⚡ fica no Combo e no ícone da Revisão rápida (modo, não XP) | `quase-iguais-textos.js`, `fr/app.js`, `zh/app.js` |
| Estrelas aposentadas: a tela "Módulo concluído!" do Ponto de verificação/Teste de Nível mostra só a nota e "Agora você já sabe"; chave `fr.moduleDone.stars` removida. Conferido: pular não credita XP | `renderModuleCompleteScreen` (`modulos-niveis.js`) |
| "Pulada" única: na trilha, unidade pulada (vocabulário ou gramática) mostra só o selo "⏭ Pulada"; no Mapa, o painel não diz "N de N lições" | `buildUnitBlock` (`trilha-licao.js`), `mapUnitDescribe` (`modulos-niveis.js`) |
| Mapa: Ponto de verificação para quem não pode pular mostra o selo "⭐ Premium" (nó e painel, sem botão; leitor de tela ouve "Premium") | `renderModulesTrailMap` (`modulos-niveis.js`), `n.note` em `shared/trail-map.js`, `.tm-note-premium` em `shared/modulos-niveis.css` |
| Último cartão de palavra: "Ver o que você aprendeu →" virou "Continuar →" (o que vem depois varia: nota "Vale entender isso" ou "Checagem rápida"; o botão diz só o que faz). Chave `zh.path.seeWhatLearnedArrow` removida | `renderBlockIntroCard` (`trilha-licao.js`) |
| Entrada: curso sem Teste de Nível (hoje o zh) pula "Você já sabe algo de chinês?" e entra direto | `askExperienceThenProceed` (`index.html`) |
| `addXP(n, { quiet: true })`: soma igual, sem o aviso (só no +4 de fechar a 1ª lição, que o bloco B já mostra) | `shared/core/quase-iguais-textos.js`; registro em `docs/historico/21-auditoria-xp.md` |

### Textos novos (catálogo `welcome.*`, pt-BR e en; confiança das traduções: alta)
A: "Sua primeira lição" / "Your first lesson" · "Oi, {name}! Que bom ter você aqui." / "Hi, {name}! So glad you're here."
(sem nome: "Oi! Que bom ter você aqui." / "Hi! So glad you're here.") · "Eu vou te acompanhar no francês|chinês|português, uma
lição curtinha por vez. Nesta primeira, é assim:" / "I'll be with you as you learn French|Chinese|Portuguese, one short
lesson at a time. Here's how this first one works:" · "{n} palavras novas" (1 palavra nova) / "{n} new words" · "Com áudio e
uma frase de exemplo. Toque no 🔊 quantas vezes quiser." (zh: "Com hanzi, pinyin e áudio. ...") · "Uma checagem rápida" ·
"Cada acerto vale XP. Errou? Faz parte: você vê a resposta e segue." · "Depois, a Revisão" · "As palavras voltam na hora
certa, para você não esquecer." / "The words come back at the right time, so you don't forget them." · "⏱ Leva poucos
minutos." / "It only takes a few minutes." · botão "Começar a lição →" / "Start the lesson →".
B: "Recado da Prof. Brune" / "A note from Prof. Brune" · "Mandou bem, {name}! Suas primeiras palavras em francês já são
suas." / "Nice work, {name}! Your first French words are yours now." · "Sequência: 1 dia" (N dias) · "Hoje já contou. Estude
um pouquinho amanhã e ela vira {next} dias." · "Revisão" · "Suas {n} palavras novas já estão esperando na Revisão. Uns
minutinhos por dia é o que faz elas ficarem." (1: "Sua palavra nova já está esperando...") · "{n} XP" · "Lições e revisões
somam XP para as Missões do dia e o Ranking." / "... your Daily missions and the Leaderboard."
Para não repetir frase entre A e B, a Revisão do A fala do futuro ("voltam na hora certa") e a do B do agora ("já estão
esperando"); o teste confere que nenhuma frase se repete. Nenhum texto em português existente mudou (só duas chaves
apagadas por não serem mais usadas), então `DELIBERATE_PT_CHANGES` não precisou de par novo.

### Testes
- Novo: `tests/boas-vindas/test_playwright.js` (fr e zh, pt-BR e en, claro; `BV_THEME=dark` no escuro): 190/190 nos dois
  temas. No zh, o Ponto de verificação e o "Pulada" usam módulos falsos injetados na página (o zh de hoje não tem módulos),
  igual a `tests/paridade-sites/test_modulos_niveis_zh_playwright.js`.
- Regressão antes x depois (antes = `072787ad`, num clone à parte): iguais nos dois lados: i18n (unit 2343/2343 -> 2341/2341,
  2 chaves apagadas; playwright 209/209; sem português no en 6/6; trilha repinta 26/26), acessibilidade 60/60, trilha
  (trail_ui 86, trail_map 61, skip_checkpoint_ui 19, checkpoint_exam 43, state_model 37, zh_map_stories 4, helpers 6,
  mobile_shell 108, review_milestone_ui 34), checkpoint-zh 25, notificações 36 e 8, sino-professora 280/280, conquistas 76 e
  66, XP 10, 19, 10, 9, metas 18, modo foco 19, ícones 43, lembrete 26, login-obrigatório (entrada 153/153, cadastro 121/121),
  cores-marca 20, 6, 26, paridade (atalhos 92/92, quase iguais 2768/2768, módulos 90/90 e zh 95/95, ditados 828, gramática 46
  e 54, lição 43 e 16, CSS 5/5, voz 34, motores 45, 49, 41, 5d 4). Falhas que já existiam antes e continuam iguais:
  `test_desafios` 2, `test_desafios_css` 4 (`.gcal-review-bar`), `test_conjugacao` (antes 17, depois 1; varia de rodada
  para rodada).
- Testes antigos atualizados de propósito: `tests/i18n/test_i18n_unit.js` (chaves `welcome.*` são novas; "{n} XP" igual nos
  dois idiomas), `tests/xp/test_trilha_xp.js` (`addXP(LESSON_CLOSE_XP` pode levar `{ quiet: true }`),
  `tests/login-obrigatorio/test_entrada_idioma.js` (zh sem a pergunta de experiência), `tests/paridade-sites/test_atalhos.js`,
  `test_quase_iguais.js` e `test_modulos_niveis.js` (comparam com a árvore antiga: aplicam ao "antes" o botão "Continuar →",
  o ⭐ do XP, a tela sem Estrelas, o "Pulada" único e os avisos limpos pela janela da sequência) e
  `test_modulos_niveis_zh_playwright.js` (tela de módulo concluído sem Estrelas).

### Capturas (390px, fr e zh, claro e escuro; scratchpad da sessão, fora do repo)
`/tmp/claude-0/-home-user-mandarimdozero/3e41ab12-78b3-5f2b-964b-fef249117fbb/scratchpad/etapa6-impl/{claro,escuro}/`:
`A-<fr|zh>-<pt-BR|en>.png`, `B-*.png`, `conclusao-sem-janela-*.png`, `janela-depois-continuar-*.png`,
`checkpoint-aprovado-*.png`, `trilha-pulada-*.png`, `mapa-premium-*.png`.

### Pendências
- Publicar (PR) só a pedido da dona. Nada no Supabase (sem migration, sem Edge Function).
- Medir o tempo real da lição 1 com os dados de uso (o cartão diz "Leva poucos minutos.").
- Fora do escopo, anotado: o topo do zh mostra "⭐ 0 XP" e o do fr "⭐ 0" (paridade pequena); a Revisão rápida usa ⚡ como
  ícone do modo (não é XP); nas lições comuns, avisos "+1 XP" do último exercício podem aparecer por cima do título da tela
  de conclusão por uns segundos (só a 1ª lição, com o bloco B, limpa os avisos).
