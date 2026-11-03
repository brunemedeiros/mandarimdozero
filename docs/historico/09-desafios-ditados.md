# Histórico: Desafios e Ditados (fr)

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Desafios do Módulo (Premium) na trilha -- piloto Módulo 1 do A1 (2026-10-03)

**Decisões da autora**: a aba Desafios continua aberta a todos; desafios COM `moduleId` aparecem trancados (cadeado + aviso de Premium, estilo lingua.com) para conta Free, desafios sem `moduleId` seguem abertos. Cada módulo da trilha ganha uma unidade opcional "Desafios do Módulo N" no fim (depois do Ponto de verificação), liberada junto com o módulo para Premium. Tatoeba descartado para o A1 (não alcançável do sandbox e genérico demais; a fonte é o vocabulário da própria trilha).

**Dado**: `moduleId`/`unitId`/`theme` são campos extras dentro de `challenges.data` (jsonb) -- sem migration. Conteúdo do pilot: `fr/scripts/challenges_import/modulo-a1-m1-content.json` -> `build_modulo.py` -> `lote-a1-m1.json` (22 desafios: 8 Ouça e traduza, 9 Acentuação, 5 Expressões -- o número antigo, 48, foi reduzido na revisão de densidade; áudio via Actions "Áudio TTS", modo `desafios-a1-m1`). O builder avisa palavras fora do vocabulário do módulo (teto de vocabulário) e evita duplicar o que já está no banco.

**Código (só `fr/app.js` + `fr/index.html`; zh não tem Desafios)**: `challengesPremiumUnlocked()` (= `isPremium()` ou admin), `isChallengeLocked(c)`, `listedChallenges()`/`playableChallenges()`, `openModuleChallenges(moduleId)` (recorta a aba Desafios por módulo via `challengesModuleFilter`), `fillModuleChallengeRows()`/`buildModuleChallengesRow()` (a linha só aparece para módulos com desafios publicados; carrega os desafios do banco sob demanda), modal `#premium-challenges-modal` (aviso + contato, sem checkout: o app ainda não tem pagamento). Ditados: já têm `moduleId` e `free`; os atuais (`free:true`) continuam abertos a todos, `free:false` passaria a trancar.

**Limitação**: trava só de UI -- os desafios publicados continuam legíveis via API do Supabase (mesmo nível de rigor de outros limites de UX). Teste: `tests/desafios-modulo/test_playwright.js` (30/30).

## Regra de Desafios ao criar conteúdo novo (qualquer idioma, 2026-10-03)

Pedido da autora, verbatim: "ao criar um novo nível, módulo, unidade ou lição de QUALQUER idioma (atual e futuro) verificar quais desafios (em cada categoria) podem ser criados estabelecendo uma diferenciação entre: desafios que vão para a trilha de estudos e desafios que serão apenas acessíveis aos usuários premium."

- **Quando**: sempre que um nível, módulo, unidade ou lição novo for criado, em fr, zh ou idioma futuro. Faz parte de "pronto", como a nota de realidade e o plano grátis x premium.
- **O que fazer**: passar pelo checklist de `shared/challenge-policy.js` (`challengeChecklist(idioma, escopo)`) e, para CADA categoria (Ditado, Ouça e traduza, Acentuação/tons, Expressões, e as que surgirem), registrar uma decisão: `trail` (aberto a todos, dentro da trilha), `premium` (só Premium) ou `n/a` com motivo. Não deixar em branco.
- **Padrão atual**: Ditado = trail (free); Ouça e traduza, Acentuação/tons e Expressões = premium, agrupados na unidade opcional "Desafios do Módulo N" no fim do módulo (cadeado para Free).
- **Critério de conteúdo** (aprendido no piloto do A1): leve, não um tipo em excesso. Ouça e traduza ~2 por unidade (nunca 32 de uma vez); Expressões ~5 por módulo; Acentuação só com acentos reais (fr: ´ ` ^ ~ ¨, "ç" NÃO é acento; zh: tons do pinyin); frases só com vocabulário já visto no módulo.
- **Todo lote vem informativo**: o builder gera, além do JSON importável, um `.md` com TODO o conteúdo para revisão (ex.: `fr/scripts/challenges_import/lote-a1-m1.md`). A autora revisa o `.md` antes de áudio/importação. Desafios entram como `needs_review`; a unidade na trilha só aparece para desafios PUBLICADOS.
- **Estado por idioma**: francês tem a aba Desafios e os lotes A1 (módulos 1 a 6). Chinês ainda NÃO tem aba Desafios nem módulos (18 unidades soltas do HSK1; os "desafios" do zh são missões do dia) -- a regra vale, mas os desafios do chinês dependem de decidir módulos e criar a aba (tarefa à parte).

### Ditados (fr) -- estrutura atual (2026-10-03)
- `fr/dictations.js`: por módulo, 1 ditado Free (`free:true`, aparece também em Desafios > Ditados) + 2 Premium (`free:false`, só na unidade "Desafios do Módulo N"; nunca no menu geral nem na trilha). Texto = mini-história coerente (uma pessoa/situação), só com vocabulário até o módulo (`python3 fr/scripts/check_dictation_vocab.py`).
- "Revisão do A1": 3 ditados `moduleId:"A1-revisao"` (r1 Free, r2/r3 Premium) juntando 2 módulos cada, em unidade própria no fim do nível. Campo `opening` troca o anúncio falado.
- Paywall desligado (`CHALLENGE_PAYWALL_ENABLED=false` em `fr/app.js`): tudo abre, só há selos Free/Premium. Bloqueio, paywall e Stripe vêm depois.
- Áudio: Actions > "Áudio TTS" > modo `ditados` refaz todos (abertura fr + instruções em pt-BR + corpo fr). Limite de 5000 bytes de SSML por pedido.


## Desafios (fr) -- decisões da avaliação de 04/10/2026 (Free x Premium, conclusão, idioma da interface)

Avaliação completa (UX/UI, pedagogia, técnica) concluiu que a aba NÃO está perfeita: base técnica e Ditado fortes; pontos fracos = correção de "Ouça e traduza" (aceita negação/antônimo: "Hoje não está chovendo" passa como "Hoje está chovendo", similaridade 0,67 contra corte 0,55), "Concluído" binário que conta até com erro, variedade de habilidades, progresso invisível por categoria. Decisões da autora, a aplicar por fases (plano 0-8 combinado no chat):

- **Free x Premium (decisão registrada, paywall ainda DESLIGADO -- `CHALLENGE_PAYWALL_ENABLED=false`)**: o plano grátis tem **1 atividade por categoria, no total** (Ditado, Ouça e traduza, Acentuação, Expressões e as que surgirem), de preferência a do **primeiro módulo** (dá um "gostinho" do Premium). O resto é Premium. Isto SUBSTITUI o "1 ditado Free por módulo" atual quando o paywall for ligado (o Free do Ditado cai de 6 para 1). Quem for ligar o paywall (outra conversa decide a matriz Free/Premium do app inteiro) deve ler esta regra; ao ligar, o conteúdo Premium precisa sair de uma API com checagem de plano, porque a RLS atual (`challenges_public_read_published`) deixa qualquer um ler tudo que está publicado.
- **Conclusão do desafio**: conta como concluído com **acerto ou erro leve**. Erro total NÃO conclui: mostra "Tentar de novo" e "Tentar mais tarde" (sai sem concluir; continua pendente). Em "Ouça e traduza": similaridade > 0,8 sem alerta = acerto; entre 0,55 e 0,8, ou com alerta de negação/número, = erro leve (conclui, com explicação); < 0,55 = erro total. Acentuação: acento certo conclui; acento trocado/faltando = erro leve. Expressões (múltipla escolha) é binário: errar = erro total.
- **Idioma das instruções**: todo texto de interface dos desafios (botões, dicas, feedback: "Verificar", "Mostrar dica", "Quase lá"...) vem do idioma da interface (hoje só pt-BR; outra conversa está separando as chaves de tradução e implementando inglês). O conteúdo em francês continua em francês. Criar as chaves dentro do módulo de Desafios e ligar ao mecanismo da outra conversa quando ele estiver na `main`.
- **Feito (Fase 1)**: selo Free/Premium não estica mais no card; Ditado ganhou emoji 📝 (não repete o 🎧 de Ouça e traduza); erro de carga tem botão "Tentar de novo"; cache em memória de 5 min dos desafios (`challengesLoadedAt`, invalidado em `persistChallenge` e ignorado no painel admin).
- **Pendente (fases 2-8)**: regra de conclusão e botões; correção melhor de Ouça e traduza (`mustInclude`/`mustExclude`, negação, número, diferença palavra a palavra); chaves de tradução; correções de conteúdo (`lt-a1m5-005` "lâmpada" para *lampe*; `lt-a1m2-005` "Hoje estamos em terça-feira"; ditado d3 com "loin" e "très près"; vocabulário fora do módulo em d1/d2/d3; personagem Sophie inconsistente entre d1 e r1; `explanation` vazio em Ouça e traduza; Acentuação só com palavra solta; módulo 6 magro; lote `lote-expressoes-80` sem módulo); progresso por categoria e revisão espaçada dos erros; tipos novos (passé composé, cloze de gramática, leitura); paywall.

**Fase 2 dos Desafios (fr) feita (2026-10-05)**: regra de conclusão em `fr/app.js`. `challengeFeedbackWrapperHTML(..., outcome)` aceita `ok`/`partial`/`fail`; `fail` mostra "Tentar de novo" (reabre o desafio) e "Tentar mais tarde" (volta à lista sem concluir); `ok`/`partial` mostram "Concluir". Lógica pura: `listenTranslateOutcome` (bloco `challenge-translation-logic`: >=0,8 sem alerta = ok; 0,55-0,8 ou alerta de concordância = partial; <0,55/vazio = fail) e `accentAnswerOutcome` (só acento/cedilha difere = partial). Expressões continua binário (errar = fail). CSS `.partial` (âmbar) nos 3 feedbacks. Testes: `fr/scripts/test_answer_validation.js` (97) e `tests/desafios-conclusao/test_playwright.js` (19); Desafios do Módulo 75/75 e Ditado 58/58 sem regressão. Fase 3 (correção melhor de Ouça e traduza: negação/número/mustInclude) ainda pendente.

**Fase 3 dos Desafios (fr) feita (2026-10-05)**: "Ouça e traduza" ganhou `analyzeTranslation` (bloco `challenge-translation-logic` em `fr/app.js`): alerta de negação ("não/nunca/nada" só de um lado), de número (palavra ou dígito; "um/uma/1" ignorados por serem artigo) e suporte a `mustInclude` (grupos de alternativas) e `mustExclude` no dado do desafio (campos opcionais, ainda não usados nos lotes). Qualquer alerta vira erro leve (conclui, com aviso); o feedback lista "Palavras que faltaram". Corrigidos 3 falsos positivos antigos de concordância achados ao testar as 118 respostas de referência reais (todas dão `ok` agora): "a gente" é 3ª pessoa, terminação genérica -as/-es removida, stopwords (artigo "as") ignoradas. Testes: `test_answer_validation.js` 109/109, Desafios 19/19 + 75/75, Ditado 58/58. Pendente: Fase 4 (i18n) em diante.


**Fases 4 a 8 dos Desafios (fr) feitas (2026-10-05, piloto automático)**:
- **Fase 4 (i18n)**: `CHALLENGE_I18N['pt-BR']` (~130 chaves) + `chT(key, vars)` + `applyChallengeI18n()` (`data-ch-i18n` no HTML) em `fr/app.js`; idioma via `window.UI_LANG`, fallback pt-BR. Quando o mecanismo global da outra conversa chegar na `main`, ligar `chT` a ele (só trocar a leitura do idioma). Blocos `*-logic` testados e `dictationLightNoteText` ficaram fora.
- **Fase 5 (conteúdo)**: `lt-a1m5-005`/`lt-a1m2-005` corrigidos; `explanation` preenchido nos 41 itens; ditados d1/d2/d3/r1 reescritos (r1 usa Julie). **Áudio novo necessário** (Actions > Áudio TTS): modo `ditados` (d1, d2, d3, r1) e `desafios-a1-m6` (2 frases + "été"/"préféré" novos). Sugestões de módulo para o `lote-expressoes-80` estão no relatório do piloto (não vinculadas). Lotes seguem `needs_review`.
- **Fase 6**: progresso "X de Y" por categoria/Ditados, selos nos níveis, revisão espaçada Leitner (1/3/7/14 dias) em `STATE.challengeReviews` + cartão "Revisar erros (N)"; bloco `challenge-review-logic`. Ditados não entram na revisão; contam como feitos com qualquer tentativa.
- **Fase 7**: tipo `cloze_grammar` ("Complete a frase", 🧠, Premium por módulo) + 6 itens de passé composé (`lote-a1-m6-cloze.*`, needs_review, sem áudio). **Migration `fr/scripts/supabase_migrations/007_allow_cloze_grammar_type.sql` NÃO aplicada**: sem ela a importação do tipo falha (CHECK em `challenges.type`). Tem DROP: SQL Editor, Staging antes da produção.
- **Fase 8 (preparada, DESLIGADA)**: `008_challenges_server_side_premium_gating.sql` (NÃO aplicada; testada em Postgres local) cria `is_challenges_premium()` e `get_published_challenges()` (Free recebe só esqueleto dos Premium) e, no passo 3, restringe a policy de leitura pública. No cliente, `CHALLENGES_SERVER_GATING=false` e `CHALLENGE_PAYWALL_ENABLED=false`. Para ligar: aplicar 008 passos 1-2, publicar o código com a flag true, só então o passo 3. Sem Stripe/checkout (não existe).


## Desafios (fr) -- passada de design visual (2026-10-06)
Só CSS (bloco "Desafios: passada de design" em `fr/index.html`, logo depois de `.challenge-retry-actions`) + 2 ajustes pequenos em `fr/app.js`. Mesma linguagem da trilha/mapa aprovada pela autora: título em fonte de exibição sem caixa alta, estado com anel/borda (nunca opacidade), tons por `color-mix` que seguem o tema, alvos de toque >= 44px, foco visível; sem roxo novo, sem Anton, sem os prints do "teste de marca" (não aprovado).
- Tela principal: uma linha por categoria; o progresso virou anel em volta do ícone (`--p` 0-100, definido em `renderChallengeCategories`; `data-complete` troca o anel para `--jade`). 2 colunas em >= 760px.
- Listas (Desafios e Ditados): nível em etiqueta, expressão em destaque, concluído = fundo/borda `--jade` + círculo com ✓ (antes: opacidade .55 + emoji), cadeado mantido. Etiqueta Free/Premium sem caixa alta.
- Atividades: áudio como ação principal (azul), alternativas de 54px com ✓/✕, devolutiva com barra de cor à esquerda (jade/`--error-red`/âmbar) e rótulos sem caixa alta; Complete a frase com lacuna tintada; campos com foco em anel; botões de verificar em largura total.
- Correção de conteúdo na devolutiva de Expressões: o ponto final duplicado ("formais..") vinha de o dado já terminar em ponto e o texto acrescentar outro; agora o ponto final do dado é removido antes.
- Não feito (fora do escopo): carregar a Nunito de verdade (continua `src: local('Nunito')`), zh (não tem Desafios), mudança de comportamento/regra de conclusão.
- Teste: `tests/desafios-modulo` 75/75, `tests/desafios-conclusao` 19/19, `fr/scripts/test_answer_validation.js` 148/148; `tests/ditado` 56/58 (as mesmas 2 falhas que o `main` já tem).

## Desafios (fr) -- devolutiva ousada e lista (2026-10-07)
Implementa a maquete aprovada pela autora (só fr). `challengeFeedbackWrapperHTML` (fr/app.js) agora gera `.fb-ico` (círculo com ✓ / ~ / ✕) + `.fb-title` (o emoji inicial do texto é removido; textos continuam vindo de `chT`). CSS no bloco "Devolutiva ousada" de `fr/index.html`: cor da caixa pela variável `--c` (`--jade` / âmbar `#B7791F` claro, `#E0A93B` escuro / `--error-red`), ícone com `--on-vivid`, linhas "Você escreveu"/"Resposta certa"/explicação em caixas, botões de 52px, "Tentar mais tarde" como contorno. Lista de desafios/ditados: concluído sólido (`--jade`), pendente tracejado, Premium trancado em `--paper-warm`; `prefers-reduced-motion` respeitado. Regras de conclusão não mudaram.
Testes: desafios-modulo 75/75, desafios-conclusao 19/19, test_answer_validation 148/148; ditado 56/58 (as mesmas 2 falhas já existentes). Em "Ouça e traduza", "Você escreveu" x "Resposta certa" ficam lado a lado (`.fb-cmp`, 1 coluna abaixo de 340px). Screenshots reais (fr claro/escuro, 390px) conferidos; zh não tem Desafios. NÃO feito: filtros/busca/anel de progresso por grupo na lista (só estilo dos cards).

## Desafios (fr) -- marcação de palavras e lista de Expressões (2026-10-07)
- "Ouça e traduza": no erro leve/total, "Você escreveu" e "Resposta certa" (a referência de melhor similaridade) marcam palavra a palavra (`markTranslationWords`, bloco `challenge-translation-logic`): errada (`.tw-bad`, ondulado vermelho), quase certa (`.tw-near`, pontilhado âmbar; mesma raiz/pequena diferença, ex. comprou x comprei) e a que faltou (`.tw-miss`, tracejado verde). Sublinhado + fundo tintado, nunca só cor; legenda abaixo. Palavras de ligação sobrando ficam neutras. Acerto total não marca.
- Lista de Expressões: busca (`#challenges-search`), filtros Todas/Pendentes/Concluídas e anel de progresso por nível (sempre do nível inteiro, não do filtrado). Só Expressões; as outras categorias seguem em fila por nível.
- Testes: `fr/scripts/test_answer_validation.js` 154, desafios-modulo 75, desafios-conclusao 19. NÃO feita conferência visual por screenshot (claro/escuro, 390px) nesta entrega.


## Expressões: álbum + expressão de hoje + registro como campo (2026-10-12)
- Pedido da autora: a lista de Expressões estava "sem graça". Escolha dela entre 3 propostas: álbum de figurinhas + "Expressão de hoje". Redesenho só visual; Grátis/Premium continua como está (paywall ainda desligado).
- **Registro virou campo próprio** `register` em `challenges.data` (`formal` / `neutral` / `familiar` / `slang` / `vulgar`; rótulos Formal, Dia a dia, Entre amigos, Gíria, Pode ofender). Produção atualizada pela sessão com autorização da autora: 122 expressões (50 neutral, 51 familiar, 11 slang, 10 vulgar); hash do resto do `data` idêntico antes/depois. Staging não tem desafios. O aviso "Registro: ..." dentro de `meaning.pt`/`explanation` foi mantido (o cartão do álbum esconde esse trecho).
- Origem do registro: conteúdo-fonte (`neutre`/`familier`/`très familier`/`vulgaire`, convertido por `REGISTER_KEY` em `build_lote_expressoes.py`); as 12 expressões antigas (migrations 002/005) foram classificadas à mão: familiar = avoir la gueule de bois, casser les pieds, poser un lapin, coup de main, avoir un poil dans la main, ne pas y aller de main morte; neutral = avoir faim/soif/raison, avoir le trac, faire la grasse matinée, mettre les points sur les i (confiança média nas de fronteira: coup de main, main morte; a autora confirmou `familiar` nas duas em 2026-10-13).
- "Il pleut des cordes": a autora decidiu `familiar` (Entre amigos) também no A1-m4 (expr-a1m4-001), igual ao expr-lote4-016; conteúdo-fonte e lote regenerados em 2026-10-12; banco de produção atualizado pela autora no SQL Editor e conferido em 2026-10-13.
- **Regra nova**: toda expressão nova precisa de registro. `build_lote_expressoes.py` falha sem ele; a importação do painel (`importChallengesFromJSON`) pula expressão sem registro válido; skill `criar-desafios` e `shared/challenge-policy.js` atualizados. Resumos `lote-a1-m*.md` ganharam a coluna Registro.
- **App (fr)**: `expressionCardHTML` (cartão álbum: pendente tracejada com "O que será que significa?", concluída com o sentido e selo "no álbum", etiqueta de registro, Free/Premium, botão ▶ fora do botão do cartão), `expressionTodayHTML`/`expressionOfTheDay` (pendente não trancada do nível mais baixo, sorteada pelo dia; "Pode ofender" só se não houver outra; concluir a do dia mostra a próxima), etiqueta de registro também na tela da pergunta. CSS no bloco "Expressões: álbum de figurinhas" de `fr/index.html` (só tokens existentes). Textos em `CHALLENGE_I18N` pt-BR e en.
- Testes: `tests/desafios-album/test_playwright.js` 62/62 (claro/escuro × 1200/390, en, importação); regressão desafios-modulo 75/75, desafios-conclusao 19/19, ditado 58/58, test_answer_validation 154/154, i18n unit 2104/2104 (chave nova liberada em NEW_KEYS). Prints conferidos nos 4 cenários; zh não tem Desafios.

## Repetições nos Desafios (produção, 2026-10-19)
- Varredura de todos os desafios da produção (expressão por `canonicalExpression` e sentido; Ouça e traduza e Acentuação pelo
  texto). Repetição exata de Expressão: só "Il pleut des cordes" (A1 `expr-a1m4-001` e B2 `expr-lote4-016`).
- Pedido da autora: deixar só no B2. `expr-a1m4-001` tirado do ar como o painel faz (`status='approved'`, `unpublished_at`,
  `unpublished_by`); nada apagado, progresso de quem já fez fica guardado; reimportar o lote não o traz de volta (a importação
  pula ids existentes). Para voltar: publicar de novo pelo painel de Desafios.
- Também repetidos (A1, Acentuação, aguardam decisão da autora): "très" (`accent-a1m3-008` e `accent-a1m5-001`) e "été"
  (`accent-a1m4-001` e `accent-a1m6-006`). Sinônimos em níveis diferentes, para a autora avaliar: casser les pieds x casser
  les bonbons (B1), tu te fous de moi (B1) x se foutre de la gueule de quelqu'un (B2), coûter les yeux de la tête (B1) x
  coûter la peau des fesses (B2), avoir du bol x pas de bol (B1).
- Decisão da autora (2026-10-19): "été" fica na A1-19 (passé composé) e "très" na A1-12 (com peu/beaucoup/assez/trop; a
  autora pediu "a que tem advérbios junto"); tirados do ar `accent-a1m4-001` (A1-13) e `accent-a1m5-001` (A1-16), do
  mesmo jeito do painel. Sinônimos em níveis diferentes: mantidos.
- Lista de Expressões (2026-10-19): os níveis encostavam (o gap estava no contêiner de fora, não em
  `#challenges-level-sections-inner`) e o anel do nível invadia o último cartão de cima; corrigido. Cartão compacto: sem
  "O que será que significa?" e sem etiqueta de nível, 2 por linha no celular e 3 ou mais no computador, som no canto de
  baixo. Lista inteira de 6891px para 4256px de altura (1200px) e de 12897px para 5898px (390px).
  `tests/desafios-album` 66/66, desafios-modulo 75/75, desafios-conclusao 19/19.

## Inglês dos 16 da primeira leva, correções de texto e regra do português de Portugal (2026-10-26)
- **Inglês**: os 16 Desafios publicados só na produção, sem fonte no repositório (accent-a1/a2/b2-001, expr-a1/a2/b2-001..003,
  lt-a1/a2/b1/b2-001), ganharam a tradução em inglês aprovada pela dona (`docs/i18n/challenges-en.json`, overlay
  `fr/challenges.en.js` regerado). Retrato da produção em `docs/i18n/challenges-producao-sem-fonte.json` (o validador usa
  como fonte, igual ao do A1-m3). Voltam a aparecer e abrir no site em inglês (`tests/desafios-idioma-site` 41/41).
- **Correções na produção** (SQL para a autora aplicar: `docs/rollout-sql/desafios-correcoes-2026-10-26.sql`, com backup,
  conferência do valor antigo e checagem final que desfaz tudo; testado num Postgres local): expr-b2-001 "aspetos" ->
  "aspectos"; lt-a1-001 "Eu estou a comer" -> "Eu estou comendo"; lt-b2-001 "Conquanto" -> "Embora"; accent-b2-001
  explicação nova; expr-a2-001 explicação em francês sem definição circular; expr-a1-003 opção certa "Ne pas se tromper"
  (no lugar de "Avoir la bonne opinion"); expr-b2-002 2º exemplo "Mon colocataire a vraiment un poil dans la main : il ne
  fait jamais la vaisselle." (o SQL tira o `audioFile` antigo 8161a79d42ec.mp3; o mp3 novo seria fda7a771ac1c.mp3, ainda
  NÃO gerado). O retrato no repositório já tem os textos novos.
- **Regra da dona (vale para todo Ouça e traduza em pt-BR, hoje e os próximos)**: resposta em português de Portugal não é
  "certa": é "Quase", e a devolutiva mostra a forma do Brasil ("🟡 Quase! Essa forma é de Portugal." + "No Brasil se diz:
  **estou comendo** (em vez de "estou a comer")."; chaves `ch.lt.partialPtPt`, `ch.lt.ptpt`, `ch.lt.ptpt.pair`). Código:
  `ptEuropeanToBrazilian` + `listenTranslateVerdict` no bloco `challenge-translation-logic` de `shared/desafios.js`
  (`listenTranslateOutcome` passa por ele); tela em `shared/desafios-telas.js`. Marcas: estar/andar/ficar + "a" +
  infinitivo (vira gerúndio); telemóvel, autocarro, comboio, pequeno-almoço, casa de banho, facto, contacto/contactar, ecrã,
  frigorífico, rapariga, sumo (só como substantivo), apanhar + meio de transporte (vira pegar); plurais incluídos. "tu" + 2ª
  pessoa NÃO conta. No site em inglês não se aplica (comparador próprio). Varredura: na produção só o lt-a1-001 tinha forma
  de Portugal; nos lotes do repositório nenhuma.
- Testes: `tests/desafios-ptpt/test_ptpt.js` 282/282 (PT-PT -> Quase, Brasil -> certo, falsos positivos, varredura de 163
  traduções aceitas do repositório), `tests/desafios-ptpt/test_playwright.js` 8/8 (tela pt-BR e en).

## Português de Portugal = Quase em toda resposta em português (2026-10-29)
- **Decisão da dona**: a regra de 2026-10-26 (resposta em português de Portugal não é "certa", é "Quase", com a forma do Brasil
  na devolutiva) vale para QUALQUER resposta escrita em português, não só para o Ouça e traduza.
- **Código comum**: a detecção/troca saiu de `shared/desafios.js` para `shared/core/familias/portugues-variantes.js`
  (`PortuguesVariantes`: `paraBrasil` = antigo `ptEuropeanToBrazilian`, `ptBrVerdictAdjust(resposta, aceitas, { aceita })` ->
  `{ verdict: 'almost', pairs: [{ pt, br }], text }` ou null, `ptBrFeedbackHTML(pairs, { t, keys, esc, tag, cls, lead })`),
  carregado por fr e zh antes de `licao-feedback.js` e `desafios.js`. O Ouça e traduza chama a função comum
  (`listenTranslateVerdict` e a tela em `shared/desafios-telas.js`), com o mesmo resultado.
- **Gancho para o site de português**: `LANG_HOOKS.typedAnswerLang` (opcional, no contrato `shared/core/lang-hooks-contrato.js`).
  Com `'pt-BR'`, `typedPtBrAdjust`/`typedPtBrNoteHTML` (`shared/core/licao-feedback.js`) entram em: "Digite o que ouviu" e lacuna
  digitada (`typedVerdictPtBr`, `shared/core/licao-exercicios.js`; meio ponto e `EXERCISE_XP_ALMOST`), Revisão Digite a
  resposta/Cloze, também os cartões do Banco (`reviewTypedCheckPtBr`, `shared/core/revisao-cartoes.js`; nota Difícil pelo
  `wrongGrade` do site), gramática (`shared/core/gramatica-cenario.js`; meio ponto) e Conjugação (`conjEvaluate`,
  `shared/conjugacao.js`; "quase"). Devolutiva: "Quase! Essa forma é de Portugal. No Brasil se diz: **estou comendo** (em vez de
  "estou a comer")." (chaves `answer.ptpt.almost/line/pair` em pt-BR e en, mesmos textos dos Desafios). fr e zh não declaram o
  gancho: nada muda. O Modo aula do Banco não tem resposta digitada (a professora dá a nota).
- **Testes**: `tests/desafios-ptpt` 282/282 e 8/8 (iguais a antes); `tests/respostas-ptbr/test_api.js` 12/12;
  `tests/respostas-ptbr/test_playwright.js` 30/30 (site de mentira 'pt' na página do fr: "estou a comer" -> Quase e
  "estou comendo" -> certo na lição, lacuna, gramática, Revisão e Conjugação; fr e zh julgam igual a antes em todo o
  content.js; todo site carrega o módulo). Guardas atualizadas para a chamada nova: `tests/respostas-digitadas/test_guarda.js`,
  `tests/familia-latina/extrair-fr.js`, `tests/i18n/test_i18n_unit.js` (chaves `answer.ptpt.*` novas).

