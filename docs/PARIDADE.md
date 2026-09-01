# Checklist de paridade — migração pra plataforma multilíngue

Congelado antes de qualquer refatoração (etapa 1 da migração). Cada item marcado
`[ ]` precisa ser reverificado manualmente nos dois idiomas depois que a
funcionalidade for extraída pra `shared/` — só marca `[x]` quando confirmado
funcionando nos dois, não quando o código só "parece certo".

## Compartilhado (hoje duplicado entre os dois `app.js`, alvo de `shared/`)

- [x] Autenticação: Google OAuth — extraído pra `shared/auth.js` (2025-09-01)
- [x] Autenticação: e-mail/senha (login + cadastro + esqueci a senha) — idem
- [x] Modo convidado — idem
- [x] Logout — idem
- [x] Persistência de progresso (tabela `progress`, isolada por idioma) — `shared/auth.js` (saveState/loadState) + `shared/supabase-client.js`. Achado no caminho: o chinês tinha um fallback pra formato de dado salvo ANTES do namespacing por idioma existir (progresso de contas antigas) que o francês nunca teve — preservado via hook opcional `loadLegacyState()`, testado explicitamente pra não regredir.
- [x] Tema claro/escuro (persistido, sem piscar no load) — extraído pra `shared/theme.js`, testado nos dois idiomas (2025-09-01)
- [x] PWA: registro do service worker — extraído pra `shared/pwa.js` (2025-09-01). Manifest e o service worker em si continuam por idioma (cache list diferente), como esperado.
- [x] Wizard de plano de estudo (meta diária) — extraído pra `shared/wizard.js`. O chinês ganhou a etapa de nível que só o francês tinha (pedido explícito, 2025-09-01): `LEVELS`/`LEVEL_DESCRIPTIONS` novos em `content.js`/`app.js` do chinês, hoje com 1 único nível (HSK1 · "Nível 1 · Iniciante"), pronto pra crescer quando os próximos níveis do HSK forem adicionados -- sem tocar em `shared/wizard.js`. Meta/minutos continuam 100% por idioma (cada um com seu `STATE.studyGoal` isolado, nunca somado entre idiomas). Testado nos dois com o fluxo completo do wizard (5 etapas) até salvar e ver o card de progresso.
- [x] Motor de repetição espaçada (Revisão: Errei/Difícil/Bom/Fácil) — extraído pra `shared/srs.js` (SM-2, XP_PER_GRADE, todayStr/dateStrDaysAgo), testado nos dois idiomas com progressão determinística (2025-09-01)
- [x] Export pra Anki (.apkg via JSZip + sql.js) — motor extraído pra `shared/anki-export.js` (schema do Anki, empacotamento .apkg, download). O que muda por idioma (campos do card, template pergunta/resposta, nome do baralho/arquivo, prefixo do guid, filtro/label das unidades no seletor) fica num `config` que cada `app.js` monta (`ANKI_EXPORT_CONFIG`) e passa pras funções compartilhadas. Testado nos dois: modal abre/fecha (X e clique fora), seletor de baralho lista as unidades certas e destaca a selecionada, e todo campo do `config` (nome do modelo, campos, template, deck/nome de arquivo, prefixo do guid, `noteFields`/`sortField` por card) bate exatamente com o valor hard-coded que existia antes da extração. A geração do `.apkg` em si (via sql.js/wasm) não pôde ser exercitada de ponta a ponta neste ambiente de teste porque o CDN do sql.js é bloqueado pela política de rede do sandbox (bloqueio de infraestrutura do ambiente, não do app) — o código da engine em si não foi alterado, só parametrizado; recomenda-se um teste manual de geração+importação real num navegador comum antes de considerar 100% fechado (2026-09-01).
- [x] Toast (erros e confirmações, ex: falha ao salvar progresso, +XP) — extraído pra `shared/toast.js`, testado nos dois idiomas (2025-09-01)
- [x] Bandeira de link cruzado pro outro idioma (topbar) — as duas bandeiras (tela de login e topbar do app) ainda apontavam pros endereços antigos e separados (Netlify do chinês, repositório `francais-avec-prof-brune` do francês), sobra de antes da unificação. Trocadas nos dois idiomas pra apontar pra página de seleção de idioma unificada (`../../index.html`), testado com Playwright (2026-09-01).
- [x] Pills de estatística (streak, XP) — `renderTopbarStats()` era byte-idêntica nos dois idiomas; extraída pra `shared/topbar-stats.js` sem alteração de comportamento, testado nos dois (2026-09-01).
- [x] Navegação por abas — o "corpo" comum (ativar `.tab-btn`/`.view`, o bloco de Revisão com/sem `reviewSessionUnitFilter`) extraído pra `shared/tabs.js` (`createTabSwitcher`); o que varia por idioma (quais efeitos colaterais parar ao trocar de aba, quais abas próprias existem e o que renderizar nelas) fica num objeto de config que cada `app.js` passa. Testado nos dois: toda aba própria de cada idioma navega pra view certa (inclusive `progress`, que não tem `.tab-btn` — é acionada só programaticamente), o filtro de unidade da Revisão continua funcionando, e os `stopXxx()` específicos de cada idioma (`stopMatchTimer`/`stopDictationAudio` só existem no francês) continuam sendo chamados nos momentos certos (2026-09-01).

## Específico do francês (fica em `languages/fr/`)

- [ ] Aba Conjugação (motor de conjugação verbal)
- [ ] Aba Ditados
- [ ] Desafios: Expressões (pergunta/feedback, 2 exemplos com áudio, microatividade)
- [ ] Desafios: Ouça e traduza (heurística de concordância de pessoa gramatical)
- [ ] Desafios: Acentuação
- [ ] Fila de exercício único por nível (Ouça e traduza / Acentuação)
- [ ] Seções colapsáveis por nível A1/A2/B1/B2 (Expressões)
- [ ] Painel admin: revisão, edição, aprovação, publicação, despublicação
- [ ] Painel admin: pré-visualização "versão do aluno"
- [ ] Painel admin: busca, filtros (categoria/nível), paginação
- [ ] Painel admin: aprovação em lote
- [ ] Painel admin: importação via JSON
- [ ] Checklist de qualidade antes de aprovar
- [ ] Curadoria de recursos externos (artigo/YouGlish/dicionário)
- [ ] TTS offline (pipeline Python: Vertex AI + Google TTS + STT de validação)
- [ ] Skip link + labels de acessibilidade + contraste AA

## Específico do chinês (fica em `languages/zh/`)

- [x] Aba 汉字 (Hanzi) com `hanzi-writer` (ordem de traços)
- [x] Pinyin e tons
- [x] Pool de metas diárias / desafios diários (fácil / revisão de hanzi / geral)
- [x] Exercício "digite o que ouviu" embutido (modo `type` do cloze)
- [x] TTS ao vivo via Web Speech API do navegador

### Migração do site chinês antigo (zip 26/08, dev paralelo fora do Claude Code) — 2026-09-01

Auditoria de paridade completa entre o `main` e um zip do dia 26/08 enviado pela
professora (o site chinês antigo/Netlify era mantido numa conversa separada do
Claude, não Claude Code, com deploy manual — sem git, então essa era a única
forma de auditar o que existia lá). Resultado: quase tudo já estava presente
(pinyin, TTS, painel admin, "Por que errei?", etc. — só chegaram ao `main` por
um histórico de commits diferente do zip). 4 gaps reais confirmados e migrados:

- [x] Histórias-checkpoint (revisão narrativa a cada 5 unidades, `stories.js`, 4 histórias)
- [x] Índice de radicais (navegação por radical dos caracteres já estudados, dados já existiam em `hanzi-data.js`)
- [x] Busca (pinyin sem tom / hanzi / tradução) — adaptada pra modal no topbar em vez de reviver a aba "Manual" (removida deliberadamente antes)
- [x] Exercício "frase completa" (PT → escolher entre 4 frases em hanzi, geração de distratores gramaticais)

Todas testadas com Playwright e integradas na arquitetura atual (sem duplicar
código, reaproveitando `showCorrectReorderPanel`/`showWrongAnswerPanel`/`HANZI_ALL`/etc. já existentes).

## Troca de idioma (teste específico da unificação)

**Reformulado em 2026-09-01** (pedido explícito da professora, modelo Busuu): o
idioma deixou de ser uma escolha de entrada pré-login e virou uma propriedade
da conta (`currentLearningLanguage`), trocável de dentro da plataforma. A
versão anterior deste item (página `/` como seletor de idioma antes do login)
foi substituída — ver decisões abaixo.

- [x] `/index.html` virou portão de autenticação, não seletor de idioma — mostra tela de login (Google/e-mail/convidado) pra quem não tem sessão; nunca mostra escolha de idioma antes do login.
- [x] `currentLearningLanguage` gravado no Supabase (`progress.data._meta.currentLearningLanguage`), mesma linha/tabela de sempre — não é só localStorage, fonte de verdade é a conta. `shared/language-pref.js` (`getCurrentLearningLanguage`/`setCurrentLearningLanguage`).
- [x] Primeiro login (sem `currentLearningLanguage` e sem progresso em nenhum idioma) → mostra "Qual idioma você quer aprender?" uma única vez, salva a escolha, entra no app.
- [x] Contas que já existiam antes desta feature (progresso salvo, mas sem `_meta`) → idioma é **inferido** a partir de qual progresso já existe, não pede escolha de novo (migração sem perda de dado, item 23 do pedido).
- [x] Retorno (já tem `currentLearningLanguage`) → login abre direto no último idioma estudado, sem tela de escolha.
- [x] Seletor de idioma dentro do app (bandeira no topbar, `shared/language-switcher.js`) — mostra o idioma atual, menu com os outros idiomas disponíveis, aria-label/aria-expanded/Escape pra acessibilidade.
- [x] Trocar de idioma pelo seletor NÃO faz logout, não pede login de novo — sessão do Supabase é a mesma origem/navegador, sobrevive à navegação entre `languages/fr/` e `languages/zh/`. Testado com Playwright interceptando a navegação real entre os três arquivos.
- [x] Convidado (sem conta) também troca de idioma sem precisar re-selecionar "continuar sem conta" — usa a mesma `sessionStorage` (sobrevive à navegação na mesma aba).
- [x] Idioma ativo permanece após F5 — trivial hoje, cada idioma é seu próprio `index.html` (a URL já é o estado).
- [x] Progresso/streak/XP de cada idioma permanece isolado — inalterado desta migração, `data[APP_KEY]` por idioma como já era.
- [x] Conteúdo/áudio do idioma errado nunca aparece — inalterado, apps continuam fisicamente separados em `languages/fr/` e `languages/zh/`.
- [x] Painel admin do francês, TTS, exercícios — nada tocado nesta mudança (só topbar + raiz + 2 arquivos novos em `shared/`), regressão testada com Playwright navegando pelas abas Estudo/Revisão/Conjugação/Ditados/Desafios.
- **Decisão consciente, não pendência:** a troca continua sendo por navegação de página real (`languages/<lang>/index.html`), não um shell único em runtime sem reload. Os dois apps têm conteúdo/exercícios genuinamente diferentes e uma reescrita pra SPA sem reload teria risco alto de regressão sem ganho perceptível pro usuário — a sessão já não se perde na troca, que era o problema real relatado. `URL reflete o idioma ativo` já é verdade (o path *é* o idioma), então `?lang=` não é necessário.
