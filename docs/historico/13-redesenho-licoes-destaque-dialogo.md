# Histórico: redesenho das lições (Onda 0/5) e regra de destaque no diálogo

> Trazido da branch `claude/optimistic-ramanujan-tercxc` (ainda não mergeada na main) em 2026-10-07, texto original.

## Onda 0/5 do redesenho das lições -- atualização (2026-10-07)

- **Nunito**: o fr já carregava os 4 pesos locais (`shared/fonts/nunito-latin-*.woff2`); o zh agora também (antes era só `local('Nunito')`). Anton foi abandonada (não existe no código).
- **Pinyin acima do hanzi** (decisão da autora, vale para zh): balões do diálogo, opções e bolhas da micro-checagem agora põem `.dlg-py` antes de `.dlg-hz`.
- **"Ordene a frase" no zh** igual ao fr: modos alternados `translate` ("Traduza para o chinês", só o português) e `order` (tradução + áudio + dica), com dica própria no modo `translate`. CSS `.reorder-target`/`.reorder-wrap-hint`/`.prompt-translation` copiado para `zh/index.html`.
- Ondas 3 (família de opções) e 6 (conclusão) seguem sem decisão; testado visualmente só a unidade 3 (claro/escuro); as 18 unidades passam em teste automático de renderização.

## Regra do diálogo: palavras da unidade ficam em COR, nunca sublinhadas (todos os idiomas)

Decisão da autora (2026-10-07), vale para francês, chinês e qualquer idioma futuro.

- Nos balões de diálogo, as palavras do vocabulário da unidade são destacadas com **cor + negrito** (classe `.dlg-new`, cor `var(--seal-red-dark)`, a cor de destaque do idioma). **Nunca sublinhado.** Sublinhado fica reservado a "faltou pontuação" (ditado) e "bloco certo no lugar errado" (Ordene a frase).
- Se o idioma mostra uma transcrição (pinyin no chinês; romanização/furigana em idiomas futuros), a **transcrição das palavras destacadas também recebe o destaque** (`.dlg-new-py`, mesma cor), em vez de só o texto original. A transcrição vem agrupada por palavra, então o alinhamento é por busca da transcrição do vocabulário (ver `dlgHighlightPinyin` em `zh/app.js`), nunca por posição.
- A legenda abaixo do diálogo diz "As palavras coloridas são do vocabulário desta unidade. Toque numa delas para ver o significado."
- Toque numa palavra destacada continua mostrando o significado (`data-tr`). Contraste conferido em claro e escuro (a cor vem de token, não de hex fixo).
- Ao criar o diálogo de um idioma novo: reutilizar `.dlg-new`/`.dlg-new-py` do CSS, não criar outro estilo de destaque.

## Opções de resposta e painel "Errei" padronizados (2026-10-07)

- **Hover das opções (só desktop, `@media (hover:hover)`)**: dourado em todas as opções (múltipla escolha, cenário, speed review, pergunta da história no zh). Token `--hover-gold` nos 3 blocos de tema de fr e zh (fr não usa `--imperial-gold`, que lá é rosa); borda dourada + fundo `color-mix` 14%.
- **Múltipla escolha e cenário em grade 2×2** a partir de 600px; no celular continuam em lista.
- **Painel "Errei" com um padrão só** (decisão da autora: resposta certa + onde já viu + tradução abaixo da linha tracejada, como o "Complete a frase"): cenário (fr), vocabulário de palavra solta (fr/zh) e frase genérica (fr) passaram a usar `.feedback-correct-line` + `.feedback-phrase-trans`. Verdadeiro/falso continua com o `whyNote`.
- **Merge com a main (i18n)**: textos do redesenho passaram por `t()`; chaves novas em pt-BR/en: `lesson.step.dialogueCheck`, `lesson.vocabDots.aria`, `feedback.label.yourAnswer`, `zh.exercise.translateToChinese`, `zh.reorder.tapHint` (en confiança alta). `tests/i18n/test_i18n_unit.js` ganhou `PREV3` (ponta desta branch, 8631db5) e `MAIN3` (main no merge, a88d0d3): o HTML atual precisa ser o merge de 3 vias das duas pontas, com cada conflito resolvido como "nosso", "deles" ou os dois. Resolução: toast da main; CSS de reorder desta branch + CSS da Revisão da main; botão de tom do zh com 44px (desta branch).
- Testes: i18n unit 2107/2107; trilha UI 86/86, mobile shell 108/108, helpers 6/6, histórias zh 4/4; checkpoint zh 25/25. `tests/i18n/test_playwright.js` dá timeout também na main (pré-existente). Visual claro/escuro do hover/2×2/painel ainda não conferido no navegador.

## Pendências fechadas (2026-10-12)

- **Dourado nas opções de múltipla escolha da lição**: `.exercise-option` (o formato mais comum) ainda usava
  `--imperial-gold` (rosa no fr) e valia no toque. Agora usa `--hover-gold` só com `@media (hover:hover)`, como cenário,
  speed review e cartão; opção respondida não reage ao mouse. Regra no bloco do fim do `<style>` (fr/zh).
- **Conferência visual** (fr/zh × claro/escuro + 390px): dourado ao passar o mouse, grade 2×2 (múltipla escolha e cenário)
  e painel "Errei" (resposta certa + tradução abaixo da linha tracejada + "Onde você já viu isso") OK. zh não tem cenário.
- Texto `toast.audioTapSpeaker`: "pra ouvir" virou "para ouvir" (regra do projeto; em `DELIBERATE_PT_CHANGES`).
- `tests/trilha/test_trail_state_model.js`: o sandbox ganhou `t` (só monta o texto do aviso, que é stub). 37/37.
- `tests/i18n/test_playwright.js`: "Meus Cartões" virou a janela Adicionar; o teste abre a janela (`openAddCardModal`) e,
  como hoje Premium não tem teto, força o caminho do teto para conferir só o texto. Achado e corrigido um bug real:
  `openFlashcardLimitModal` guardava o título/corpo do 1º uso e, depois de trocar o site para inglês, reabria em português;
  agora monta o texto padrão com `t()` a cada abertura. 209/209.
- `tests/k2h/test_playwright.js`: falhava também na main. Sair de uma sessão iniciada por um Deck volta para a tela
  daquele Deck (mudança deliberada, como no Anki), não para a tela de modos; asserção atualizada (escopo limpo, sessão
  escondida, tela do Deck aberta). 30/30.
- Regressão: trilha UI 86/86, celular 108/108, checkpoint zh 25/25, i18n unit 2107/2107, limite-corte 30/30 + 26/26,
  fase-f 50/50, deck-browser 206/206.

## Passada de design na Conjugação (fr, 2026-10-13)

Só CSS, num bloco "Conjugação: passada de design" no fim do `<style>` de `fr/index.html` (zh não tem Conjugação).

- Prática como página de livro de conjugação: pronome à esquerda do campo (itálico, alinhado à direita), singular
  (je, tu, il) numa coluna e plural (nous, vous, ils) na outra (`grid-auto-flow: column`; a ordem do DOM e do Tab não
  muda). Um tempo só ocupa a largura toda. A correção embaixo de um campo errado não desalinha a linha vizinha.
  No celular, uma coluna só (je ... ils).
- Verbo atual em destaque (32px, "Regular/Irregular" como selo); "Próximo verbo" vira cartão tracejado e leve.
- Escolha: tempos e grupos de verbos em listas agrupadas num painel (linhas de 44px, marcado com fundo leve),
  títulos sem caixa alta.
- Resultado da sessão num cartão.
- Teste novo `tests/conjugacao/test_playwright.js` (22/22; 8/22 sem a mudança). Regressão: trilha UI 86/86,
  celular 108/108, deck-browser 206/206, amigos 158/158, i18n navegador 209/209.
- `tests/i18n/test_i18n_unit.js` está 2090/2273 na main (chaves `rb.*` do Banco de Revisão sem registro no teste e
  comparação do HTML), igual sem esta mudança.

## Conjugação, fase 1 pedagógica (fr, 2026-10-13)

Decisões da autora: ordem dos tempos por modo (Présent, Passé composé, Imparfait, Plus-que-parfait, Futur simple,
Conditionnel présent, Subjonctif présent, Impératif), sem futur proche, sem o cartão "Próximo verbo", sem selo de
nível. Mapa da francofonia descartado. Jogos e busca de verbo ficam para as próximas fases.

- Correção (bug): passé composé e plus-que-parfait com être aceitam a concordância (allée, allés, allées); a correção
  mostra "allé(e)" / "allé(e)s" / "allé(e)(s)" (`conjExpectedInfo`). il/elle/on e vous aceitam as quatro formas.
- Subjonctif com "que": que je / que j' / que tu / qu'il / qu'elle / qu'on / que nous / que vous / qu'ils / qu'elles.
- Dado corrigido: s'asseoir tinha "assiss" no plural (`fr/conjugation-data.js`).
- Letras erradas em vermelho: depois de corrigir, o campo errado mostra o que foi digitado com só as letras erradas
  marcadas e um traço onde faltou letra (alinhamento por distância de edição, `conjAlign`, como no Jogo de Conjugações);
  a forma certa continua embaixo. Campo vazio mostra "—".
- Áudio em cada forma depois de corrigir, com o pronome ("nous parlons").
- Teclas de acento (as mesmas das lições) escrevem no campo com o cursor; Enter passa para o próximo campo e, no
  último, corrige; depois de corrigir, o foco vai para "Próximo verbo".
- Tamanho da sessão: 3, 5, 8 ou 12 verbos (8 marcado), com "≈ N formas para preencher". Barra de progresso ao lado de
  "Verbo i de N" (avança a cada verbo corrigido).
- Fim da sessão: "Formas para revisar (N)" com o que foi digitado (letras marcadas) e a forma certa, e
  "Praticar só os que errei" (só esses verbos, só esses tempos).
- Um tempo por linha (com vários tempos, duas tabelas lado a lado ficavam ilegíveis).
- A correção virou uma função só (`conjEvaluate`), usada ao corrigir e ao voltar a um verbo já corrigido.
- Textos novos (pt/en): `fr.conj.sessionSize`, `sessionForms`, `reviewTitle`, `practiceMistakes`.
- Testes: `tests/conjugacao/test_playwright.js` 37/37 (15 novos), `fr/scripts/test_answer_validation.js` 154/154,
  i18n unit 2040/2040, i18n navegador 209/209, celular 108/108.
- "Radical | terminação" em destaque: a autora viu a prévia comparativa e decidiu NÃO adotar.

## Conjugação: correção vertical e regra do "Quase" (fr, 2026-10-13)

- As 6 pessoas ficam em coluna (rótulo | resposta | áudio). Cada tempo é uma caixa de 340 a 480px, centralizada
  (vários tempos lado a lado só quando cabem). Substitui o "Um tempo por linha" da fase 1.
- Depois de corrigir: certo = caixa verde + ✓ + alto-falante; quase = caixa amarela + "~" e etiqueta "Quase",
  com "→ forma certa" + áudio embaixo; errado = caixa vermelha com as letras erradas marcadas + ✕, com
  "→ forma certa" + áudio embaixo.
- Cor do "Quase": o mesmo amarelo escuro do "parcial" dos Desafios (`--conj-quase`: #B7791F no claro, #E0A93B no
  escuro), no lugar do rosa `--imperial-gold`. As lições (`.gram-exercise.almost`) seguem em rosa (fora do escopo).
- Critério do "Quase": a resposta só difere da certa em acento, cedilha ou maiúscula (`normalizeLoose`). Vale meio
  ponto e não dá XP. Regra nova: se a palavra que difere é outra forma do mesmo verbo (ex.: "a parle", "avez parle"),
  é erro, com a nota '"parle" é do Présent.' (`conjOtherFormOf`, procura em todos os tempos na ordem do curso).
- Textos novos (pt/en): `fr.conj.almost`, `fr.conj.otherForm`.
- Conjugação é grátis (tudo).
- Testes: `tests/conjugacao/test_playwright.js` 40/40, `fr/scripts/test_answer_validation.js` 154/154, i18n unit
  2040/2040. Screenshots fr claro, escuro e celular (390px) conferidos.

## Conjugação, fase 2: tela de escolha nova (fr, 2026-10-13)

- Ordem da tela: bloco "Verbos" em cima (busca, chips, filtros) e "Tempos verbais" embaixo, em cartões com frase de
  exemplo (verbo em cor + negrito) e tradução. Por último vêm "≈ N formas para preencher" e "Começar prática".
- Busca com autocompletar (`conjSearchVerbs`): pelo infinitivo ou pela tradução, sem acento ("etre" acha être,
  "comer" acha manger). Ordem dos resultados: igual, depois começa com, depois contém, desempate pela frequência. Cada
  resultado mostra a bandeira do idioma da palavra achada: França para o infinitivo, Brasil para o português (SVG de
  `SCENARIO_FLAG_SVG`). Funciona pelo teclado: setas, Enter, Esc, e Backspace com o campo vazio tira o último chip.
  Tem ARIA de combobox.
- Verbos escolhidos viram chips (até 12). Com chips, a sessão usa só esses verbos, na ordem escolhida, e os filtros
  (tamanho, top N, regulares/irregulares, grupos) ficam esmaecidos e desligados.
- Frases de exemplo: as frases em francês ficam na base (`CONJ_TENSE_EXAMPLES` em `fr/conjugation-data.js`) e as
  traduções na camada `courses/fr-pt-BR/layer.js` (`conjugation.tenseExamples`). `shared/course-layer.js` passou a
  extrair, limpar e aplicar esse campo. Frases aprovadas pela autora em 2026-10-14, com a tradução no registro da
  gramática ("irei", "gostaria de", "Leve"); "petit" fica. Fora do site em português a tradução não aparece.
- Texto alterado: `ui.conj.sub` ("Escolha os verbos e os tempos verbais."; a autora tirou "Você sempre pratica as 6 pessoas"). Textos novos: `fr.conj.sel.*`. Os
  títulos "Verbos"/"Tempos verbais" e os interruptores passaram a ter i18n (antes ficavam em português no inglês).
- `tests/camada-curso/test_equivalence.js` agora aceita a correção deliberada "assiss" → "assis" (falhava desde a fase 1).
- Grátis x Premium: tudo grátis.
- Pendente (decisão da autora, 2026-10-14): o curso em inglês não deve ter nada em português; hoje a busca acha pela
  tradução em português e a tradução dos verbos aparece em português no site em inglês. Será consertado.
- Testes: conjugação 52/52 (12 novos), i18n unit 2040/2040, i18n navegador 209/209, camada do curso 75/75,
  celular 108/108, validação de respostas 154/154. Screenshots fr claro, escuro e 390px conferidos.

## Modo foco na Conjugação, na Revisão e nos Desafios (fr e zh, 2026-10-14)

- `shared/activity-focus.js` (carregado nos dois sites, depois de `tabs.js`): quando a sessão aparece
  (`#conj-practice-wrap`, `#review-session-wrap`, `#challenge-player-wrap`) com a aba dela ativa, liga o modo foco
  das lições (`setLessonFocusMode`). Topo, menu lateral, cartões da direita e barra de baixo somem. Usa um
  MutationObserver nos wrappers e na aba ativa, então cobre todas as entradas (modos da Revisão, Deck, marco da
  trilha, rota restaurada) sem mexer em cada uma. Marca `body[data-activity-focus]` e só desliga o foco que ele
  mesmo ligou: uma lição aberta na trilha continua dona do foco dela.
- Saída: o link que já existia (Voltar à seleção / aos modos / aos desafios). Trocar de aba por fora (rota)
  também desliga. Ao lado do link entra a ⚑ de report (`data-report-flag`), porque a ⚑ da topbar some no foco.
- No foco, a sessão fica numa coluna centralizada (Revisão e Desafios 760px, Conjugação 1040px; os botões da
  Conjugação, 640px).
- Grátis x Premium: tudo grátis (não muda acesso a nada).
- Testes: `tests/modo-foco/test_playwright.js` 19/19 (novo; fr Conjugação/Revisão/Desafios, zh Revisão, trilha
  intacta, celular), conjugação 52/52, deck-browser 208/208, banco de revisão 387/387, trilha UI 86/86,
  celular 108/108, Desafios (cloze 38/38, conclusão 19/19, álbum 62/62, módulo 75/75), ditado 58/58, i18n unit
  2040/2040, i18n navegador 209/209. `desafios-progresso` 22/23 ("barra existe") falha igual sem esta mudança
  (pré-existente). Screenshots fr claro/escuro/celular e zh claro/escuro conferidos.

## Conjugação: aba Jogos e "Passé composé ou Imparfait?" (fr, 2026-10-14)

- Conjugação ganhou abas "Praticar | Jogos" (`#conj-mode-practice` / `#conj-mode-games`, setas trocam de aba).
- Motor comum (`shared/conj-games.js`, `createConjGames`): jogo de escolha entre duas formas, no formato do Jogo de
  Conjugações da autora (frase com lacuna; depois da resposta, a forma certa entra na lacuna, a pista fica marcada,
  aparecem o desenho da linha do tempo (ponto/linha), a explicação, a tradução e o áudio da frase). Teclas 1 e 2
  escolhem; o foco vai para "Próxima frase". Fim: placar, "Frases para revisar", "Praticar só os que errei",
  "Jogar de novo". Entra no modo foco (área nova em `shared/activity-focus.js`). Sem XP (prática livre).
- Dados: `fr/conj-games.js` (`CONJ_GAMES`). 22 frases aprovadas pela autora em 2026-10-14 (11 pares, 11 de cada
  resposta), 10 sorteadas por partida. Com "je", o pronome vai dentro da opção (j'ai croisé / je croisais).
  Tradução e explicação por idioma do site no próprio item (`text['pt-BR']`, `text.en`); inglês escrito por
  mim (confiança alta). Decisão: jogo novo traz o texto dos idiomas do site junto, para servir a qualquer curso;
  o curso em inglês não mostra português (o pt-BR só entra se faltar a chave).
- Textos novos: `games.*` (pt/en).
- Grátis x Premium: Jogos são Premium (decisão da autora, 2026-10-14), com cadeado na aba e no cartão; paywall desligado
  (`CONJ_GAMES_PAYWALL_ENABLED=false`, item 11 de `14-pendencias-pos-paywall-e-decks.md`). A Conjugação normal é grátis.
- Testes: conjugação 62/62 (10 novos do jogo, inclusive o site em inglês), modo foco 19/19, i18n unit 2040/2040,
  i18n navegador 209/209, celular 108/108. Screenshots fr claro, escuro e 390px conferidos.

## Ideia em espera: "Adicionar à Revisão" a partir de Jogos, Desafios e Conjugação (2026-10-14)

A autora pensou em aposentar a ideia ("estamos criando coisas demais"). Nada foi implementado. Se voltar:
- Já decidido: entra no limite de 20 cartões do grátis; Deck automático por origem (pode mover depois); cópia
  independente e editável.
- Prévia feita com o renderizador real (5 cartões). Correções da autora: Expressões com reverso não pode ter o exemplo
  traduzido no lado em português; Acentuação = "Ouça e escreva com os acentos" + alto-falante, digitar "cinéma" sem
  mostrar a palavra sem acento; Ouça e traduza = "Ouça e traduza" + alto-falante (Normal ou Digitar).
- Achado: um Field com texto e áudio anexado mostra dois botões (🔊 lê o texto em voz sintética, 🎧 toca o áudio
  anexado); nos cartões só de áudio isso confunde.
- Conjugação: botão só na tela final ("Formas para revisar"), nunca um por forma durante a prática. A autora concordou
  (2026-10-14) que, se voltar, começa enxuta: só "Adicionar estas N formas à Revisão" na tela final da Conjugação e do
  Jogo, com o que a pessoa errou, sem mexer nos Desafios.
- Os dois botões de áudio num mesmo Field (🔊 + 🎧) foram considerados "realmente muito confusos" pela autora.

## Painel de Notificações (fr e zh, 2026-10-15)

- Bug: avisos de Amigos são gravados uma vez por site (`_friends_notify`, 102: `frances` e `mandarim`) e o painel não
  filtrava pelo idioma, então cada pedido de amizade aparecia duas vezes (produção, 7 dias: 4 + 4). Lembretes de
  sequência/revisão do chinês também apareciam no site de francês. Agora a lista, o contador do sino e "Ler todas"
  filtram por `language_app_key = APP_KEY`; abrir um aviso de Amigos marca a cópia do outro site como lida.
- Visual: grupos Hoje/Ontem/Antes; ícone num círculo; não lido = fundo leve na cor da marca + ponto (antes tudo ficava
  rosa com `rgba` fixo); lido = texto mais apagado; cabeçalho fixo ao rolar; o emoji do começo do texto ("📌 Fulana
  postou...") sai porque o ícone já está à esquerda. "Ler todas" passou a ter i18n (`notif.markAll`).
- Ícones: todos os emojis dos avisos estão no mapa do Fluent (`shared/emoji-icons.js`); conferido no teste.
- A bolinha de não lido é um botão (`notification-unread-dot`, "Marcar como lida"): marca só aquele aviso, sem abrir nem fechar
  o painel (área de toque de 44px no celular). O menu Professora não tem lista própria: o sino é o mesmo em todo o site.
- Decisão da autora (2026-10-15): versão B, Design System do painel (Pico, já na `main` pelo PR #319). O sino do topo
  (`#notifications-dropdown.painel`) e o "Avisos dos alunos" do menu Professora (`.tbell-panel.painel`,
  `shared/teacher-panel.js`, de outra sessão: 105/108) usam `p-itens`/`p-item` (não lido = `p-item--suave`), grupos
  Hoje/Ontem/Antes e o selo "Nova"/"Novo" (`p-selo--info`) que marca só aquele aviso como lido (área de toque ampliada
  por `::before`). O sino da professora continua mostrando todos os idiomas (com o selo do idioma); o do topo só o site aberto.
- `tests/sino-professora`: as 16 verificações "sem a 108" esperavam o sino do topo com avisos de todos os idiomas;
  atualizadas para o filtro por site (fr: 3 avisos, 2 não lidos; zh: 3 e 3).
- A autora pediu para descobrir o que mais pode ganhar o Pico: levantamento entregue no chat em 2026-10-15.
- Grátis x Premium: tudo grátis.
- Testes: `tests/notificacoes/test_playwright.js` 36/36, `tests/sino-professora` 272/272, painel-alunos 256/256, painel-cartoes 264/264 (novo; fr/zh, claro/escuro, celular), i18n 2032/2032 e 209/209,
  celular 108/108, ícones 43/43, amigos 210/210, modo foco 19/19. `registro` 88/89 igual na `main` (pré-existente).

## Ajustes pedidos pela autora (2026-10-16)

- Conjugação: teclas de acento do mesmo tamanho das da lição (o contêiner `.conj-accents` em flex encolhia a grade até a
  largura da letra; `.fr-accent-picker` ganhou `width:100%; max-width:360px` dentro dele).
- Busca de verbos: a tradução vem logo depois do verbo, entre parênteses ("morar (habiter)"), em vez de encostada à direita.
- Check: o ✓ voltou a ser texto (branco nos círculos verdes); ver `docs/icones-fluent.md`.
- Testes: Conjugação Playwright 64/66 (2 novas: teclas com largura de toque; busca "comer (manger)" atualizada). As 2 falhas
  ("resposta: forma certa na lacuna..." e "site em inglês: tradução...") já falhavam antes. "corrigir: erro mostra a forma
  certa" falha às vezes, conforme o verbo sorteado (ex.: "pouvoir" tem "peux/puis"). Ícones 43/43 (o ✓ deixou de virar ícone).
- Teclado da Conjugação (decisão da autora, 2026-10-16): só as letras que aparecem nas formas dos verbos da lista, calculadas
  da própria `CONJUGATION_VERBS` (`conjAccentLetters`), na ordem do teclado das lições e numa fileira só. Hoje são 7
  (â ç é è ê î û); verbo novo com outra letra entra sozinho. As lições seguem com as 14 (nenhuma faltando no francês do dia a
  dia; ÿ e æ ficaram de fora por serem raríssimas). Conjugação Playwright 66/68 (as 2 de sempre).

## Configurações no Design System do painel (fr e zh, 2026-10-17)

Prévia A (como estava) x B (Pico) aprovada pela autora: "aprovo o B, pode usar o campo de escolha".

- Tela inteira dentro de `.painel` (`#view-settings > .painel > .p-pagina.cfg-pagina`): cabeçalho `p-cabecalho`, abas
  Geral/Notificações/Exportar em `.p-seg` (`aria-pressed`, `switchSettingsSection` marca também a classe `active`),
  cada grupo num `<article>` com título.
- Interruptores viraram `input[type=checkbox][role=switch]` (tema, cloze, som, os 3 de Notificações e os 9 de Amigos).
  A linha inteira é um `<label>` (clicar no texto liga/desliga; alvo de toque grande no celular). Eventos passaram de
  `click` para `change`; `updateThemePrefSwitch`/`updateClozeModeSwitch`/`updateFeedbackSoundSwitch` usam `.checked`.
  Push que falha desmarca o interruptor de volta.
- Notificações: "Personalizar por categoria" virou tabela (`.cfg-matriz`, rola para o lado se precisar; caixinhas
  com nome acessível "Categoria: Canal"). Horário silencioso desce para baixo do texto no celular.
- Exportar: a grade de unidades virou um campo de escolha (`#export-unit-select`, `shared/anki-export.js`).
  "Todas as unidades" estava escrito direto no código e aparecia em português no site em inglês: agora é
  `settings.export.allUnits` ("All units"), e o rótulo é `settings.export.unit`.
- Classes antigas (`pref-row`, `pref-row-title`, `friends-pref-row`) ficaram no HTML porque o JS e os testes as usam;
  o CSS da tela (`#view-settings ...`, bloco "Configurações no Design System do painel") desenha por cima.
  A nota "Mais opções de conta em breve" (já escondida) saiu do HTML.
- Grátis x Premium: só visual, tudo continua grátis.
- Testes: `tests/configuracoes/test_playwright.js` novo (25/25); amigos 210/210, amigos-sugestoes 58/58, amigos-dupla
  255/255, curso-progresso 12/12, i18n confirmação 16/16, i18n navegador 209/209, i18n persistência 39/39,
  notificações 36/36, k2f 34/34 e 32/32 (export Anki), deck-browser 208/208; i18n unit 2232/2459, as mesmas falhas
  antigas da `main` (o teste agora acha o bloco do seletor de idioma com qualquer recuo).
