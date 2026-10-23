# Etapa 6 do plano "Voz da Prof. Brune": boas-vindas na primeira lição (auditoria + proposta)

Data: 2026-10-23. Situação: **só auditoria e proposta, nada foi mudado no site.** Aguarda a escolha da dona.
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
