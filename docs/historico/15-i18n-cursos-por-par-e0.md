# Histórico: i18n por cursos (idioma estudado × idioma do site)

## E0, contratos e inventário (2026-10-12)

Só documentação; nenhum código do app alterado, nada em produção, sem testes de código (não há o que testar).

Entregue em `docs/i18n/`:
- `contratos-registro-e-camada-do-curso.md` (revisão 2): registro de idiomas estudados, registro de idiomas do site,
  camada do curso, conta/progresso, relatório de confiança, mapa de pontos para etapas, Q-01 a Q-06 provisórias e Q-24.
- `inventario-pontos-de-variacao.md`: ~166 linhas classificadas em núcleo, família, idioma, curso (ordem de grandeza).

Revisão do `plan-reviewer` (5 bloqueantes, todos tratados no contrato): registro em `registry.json` lido por navegador,
Deno e scripts, com cópias (SQL, workflows) declaradas; campos faltantes (`fieldLang`, `flagSvg`, `names`, `brand`,
`modules`); camada com `goal`, lições, `overrides` de item da base e `index.js` com títulos; exceção `legacyFallback`
até a E9; relação `uiLanguage` x `currentCourse`. Também: dono de cada ponto do inventário, tabela por tabela do servidor
a decidir na E3, TTS migra byte a byte.

Pendente da autora: aprovar o contrato e responder Q-01 a Q-06 e Q-24 (provisórias seguem a recomendação). A E1 não foi iniciada.

## E1, registro de idiomas e cursos (2026-10-12)

Sem migration, sem Edge Function, nada em produção. Só front-end estático; vale após o deploy normal do Pages.

- `languages/registry.json` é a fonte única (fr, zh e `pt` com `enabled:false`); `languages/registry-api.js` tem as funções
  (`studyLangOf`, `folderOf`, `isCjk`, `layerDir`...); `scripts/build-registry.js` gera `languages/registry.js` (`--check` no teste).
  `AVAILABLE_LANGUAGES` continua com o mesmo formato (sem `pt`). `scripts/generate_pwa_assets.py` passou a ler o JSON.
- Mapas fixos de `shared/` agora derivados do registro: `STUDY_LANG_FOR_APP_KEY`, `APP_KEY_TO_LANG_ID`, `PUBLIC_DECK_LANG_*`,
  versões de TTS por idioma, e as checagens `=== 'mandarim'` (viraram `isCjk`). Os nomes antigos continuam existindo (R-04).
- `registry.js` carrega antes de `languages/index.js` em `index.html`, `fr/` e `zh/`; testes com sandbox VM ganharam o arquivo.
- Cópias que ficam fora do registro, cada uma com o teste ou motivo: `docs/i18n/copias-do-registro.md`.
- Divergência aberta (não mexida de propósito, para não invalidar áudio): `SPOKEN_RULES_VERSION` do Python é 5 e o TS tem `fr: 4`.
- Lint novo em `tests/registro/test_registry.js` (89/89): nenhum literal de appKey em `shared/` fora das exceções declaradas.

Testes: 76 de 92 suítes locais passam; as 16 que falham também falham na cópia limpa do HEAD anterior (mesmo erro):
desafios-progresso, fase-i/tags_unit (63/67), fase-identity, fase-public-deck/legacy_parity (precisa de Postgres local),
i18n/card_variants_browser, i18n/test_playwright (timeout), k2c, k2f (2), k2h, k2i, painel-alunos unit, trilha-tags, trilha,
tts-google. `i18n/ui_language_confirm_browser` falhou uma vez no lote e passou 16/16 em duas rodadas isoladas (instabilidade).
Ignoradas por exigirem Postgres/Supabase real: `run.sh` e `.sql` de amigos, painel-alunos, profile-private, fase-grants,
fase-public-deck, fase-identity, fase-k6. `test_i18n_unit` 2104/2104, `deck-browser` 208/208.
Teste alterado de propósito: `tts-google` agora compara a cópia do Deno com o registro; `test_i18n_unit` ignora o novo `<script>`.

## E2, separar conteúdo-base da camada do curso (2026-10-12)

Decisão da dona (2026-10-12): regravar a base por script, sem texto em português, e guardar o original com os comentários em `docs/`.
Só front-end estático e scripts; sem migration, sem Edge Function, nada em produção. Vale após o deploy normal do Pages.

O que mudou
- `shared/course-layer.js`: `extract`, `strip`, `apply` (puras). A camada usa o formato do overlay de inglês mais `dialogue.speakers`;
  a tabela de conjugação vira colunas por índice na base e a camada recria os rótulos.
- `fr/content.js` e `zh/content.js` agora são a BASE (ids, frases em francês/hanzi/pinyin, respostas, estrutura) e não exibem nada sozinhos.
- `courses/fr-pt-BR/layer.js` e `courses/zh-pt-BR/layer.js`: o texto em português. Carregam logo depois do `content.js` nos dois `index.html`,
  junto com `course-layer.js`, e se aplicam sozinhos sobre `LEVELS`, `UNITS`, `MODULES` e `LEVEL_TESTS`. O `ContentI18n` e o overlay de inglês
  continuam como estavam (veem o português já aplicado, como antes).
- Original com todos os comentários de autoria: `docs/historico/conteudo-original/{fr,zh}-content.js.txt`. A migração única está em
  `scripts/split-course-content.js` (já executada; relê o original guardado).
- `scripts/lib/course-content.js` (`composedSource`, `load`): carrega base + camada em Node; foi ligado aos consumidores que precisam do texto em
  português: testes (fase-e, placeholders, trilha, i18n/content_src), `check_grammar_input.js`, `validate-content-overlay.js`, `build_modulo.py`, `build_cloze.py`.

Como editar daqui para frente: texto em português (título, meta, tradução, nota) em `courses/<par>/layer.js`; frase em francês/hanzi, ids e ordem em `<lang>/content.js`.

Provas
- `tests/camada-curso/test_equivalence.js` (72): para as 48 unidades (30 fr, 18 zh) e para os arquivos REAIS em disco, base + camada == original por hash
  por unidade e total, ordem das colunas das tabelas inclusive; base sem `title`/`goal`/traduções; aplicar a camada duas vezes dá o mesmo resultado.
- Tokens que os scripts de desafio usam por módulo (`build_modulo`/`build_cloze`) idênticos ao original.

Divergências e lacunas (de propósito)
- Dv-7: a camada é UM arquivo por curso, não um por unidade (o app lê `UNITS` de forma síncrona); por unidade só com loader assíncrono (E4).
- Camada `en` continua o overlay atual (`content.en.js`), ainda não movido para `courses/<par>-en/` (a E2 só prepara o terreno; mover é cosmético e fica com a E9).
- Fora desta rodada, mesmo padrão a aplicar: `zh/stories.js`, `zh/hanzi-data.js`, `fr/challenges.js`, `fr/dictations.js`, `fr/conjugation-data.js`.
- Lacuna existente confirmada: nomes de personagem em português no zh ("Garçom", "Vendedor") nunca foram traduzidos no inglês; a camada já carrega `speakers`.
- V-05 (busca por campos de tradução retorna zero) vale para `content.js` de fr e zh; ainda não para os arquivos acima.

Testes da E2: 77 de 93 suítes locais passam (92 da lista da E1 + `camada-curso`, 72/72). As 16 que falham são as mesmas da E1, com a mesma lista exata de checks
(desafios-progresso, fase-i/tags_unit, fase-identity, fase-public-deck/legacy_parity, i18n/card_variants_browser, i18n/test_playwright, k2c, k2f x2, k2h, k2i,
painel-alunos unit, trilha-tags, trilha/trail_state_model, tts-google); mais `fase-j/test_playwright`, instável, que falhou no lote e passou 76/76 isolado.
Passam: `test_i18n_unit` 2104/2104, `deck-browser` 208/208, `fase-e` playwright 38/38, `trilha/trail_ui` 86/86, `i18n/content_en` 30/30, `content_zh_en` 16/16,
`registro` 89/89. Testes ajustados por causa da E2: `fase-e/harness`, `placeholders`, `trilha/checkpoint_exam`, `trilha/trail_state_model`, `i18n/content_src`
(passam a ler base + camada) e `i18n/test_i18n_unit` (ignora os 2 `<script>` novos).

### E2, segunda rodada (2026-10-12): histórias, hanzi, ditados e conjugação

Mesmo padrão da primeira rodada, autorizado pela dona. Sem migration, sem Edge Function, nada em produção; vale após o deploy do Pages.
- zh: `stories.js` (título, subtítulo, falas `t`, pergunta e opções) e `hanzi-data.js` (significado, mnemônico, significado dos radicais) regravados só com hanzi, pinyin,
  radicais (`r`), falantes e `correctIndex`. fr: `dictations.js` sem `task`; `conjugation-data.js` com o trecho de rótulos de grupo e `VERB_TRANSLATIONS` esvaziado,
  e as formas conjugadas (`CONJUGATION_VERBS`) byte a byte iguais ao original.
- A camada pt-BR de cada curso (`courses/<fr|zh>-pt-BR/layer.js`) ganhou `stories`, `hanzi`, `dictations` e `conjugation`. Agora ela carrega DEPOIS de todos os arquivos
  de dados (fr: depois de `dictations.js`; zh: depois de `hanzi-data.js`) e se aplica sobre o que existir na página.
- `shared/course-layer.js` ganhou os extras; `scripts/lib/course-content.js` concatena os arquivos de dados de cada idioma. Originais com comentários em
  `docs/historico/conteudo-original/` (6 arquivos de fr e zh, ao todo 8 com o `content.js`).
- `fr/challenges.js` ficou de fora de propósito: o site não o carrega mais (os desafios vêm da tabela do Supabase); o português dos desafios mora no banco e entra no
  desenho da camada quando a E9 tratar Desafios.
- Prova: `tests/camada-curso` agora com 75 verificações; fr e zh: base + camada, pelos arquivos em disco, idênticos ao original (histórias, hanzi, ditados e conjugação
  incluídos). Validadores `validate-content-overlay.js` e `validate-challenges-en.js` com a mesma saída de antes.
Testes da segunda rodada: 77 de 93 suítes locais passam (inclui `camada-curso` 75/75, `registro` 89/89, `test_i18n_unit` 2104/2104, `deck-browser`, `ditado` e
`desafios-modulo`). As 16 que falham são exatamente as mesmas da E1 e da primeira rodada, com os mesmos checks; nenhuma nova. `fase-j/test_playwright` é instável
(timeout intermitente em `[data-tag-manager-retry]`, já visto no baseline): falhou no lote e passou 76/76 em três rodadas isoladas seguidas.

## E3, auditoria (2026-10-12)

Só leitura: nenhum código, banco ou migration alterados. Documento: `docs/i18n/auditoria-e3-progresso-por-curso.md` (atualiza `auditoria-progresso-por-curso.md` de 2026-10-06).
Produção consultada só com agregados (sem dados individuais). Principais achados: nenhuma conta precisa de migração de progresso; streak e `activityLog` seguros para ir à conta;
gaveta `cardVariants` já está na `main` mas vazia em produção; `zh` grava e não restaura `hanziCards` (provável bug atual, a confirmar em navegador, passo C0);
`weekly_xp` seria sobrescrito entre dois cursos do mesmo idioma (gravar a soma); próxima migration livre é a 075. Plano em passos C0 a C6, tudo grátis.
Pendente da dona: responder Q-10, Q-11, Q-12 e as perguntas P1 a P8 (cada uma com recomendação) e autorizar o início do C0.

## E3, passo C0 (2026-10-12): hanzi do zh e texto do convidado

Só front-end estático; nenhuma migration, nenhuma mudança em produção além do deploy normal do Pages. Autorizado pela dona ("execute o C0").
- **Bug confirmado em navegador e corrigido**: o zh gravava `hanziCards` no save mas não os restaurava ao carregar (restauração removida na K2-C, commit `49692ff`, 2026-09-30).
  O teste novo reproduziu: cartão estudado voltava zerado (reps 0, estado `new`). Correção: `mergeSavedHanziCards` em `shared/study-trail-model.js` (só a lista de campos de progresso,
  igual à da trilha; o texto vem da camada do curso) e chamada em `applySerializedState` (`zh/app.js`). O formato do save não mudou.
- **Texto do portão**: `index.html` dizia "seu progresso fica salvo só neste navegador"; o código nunca salvou o progresso do convidado. Agora: "Como convidado(a), seu progresso não é salvo: ao
  fechar a aba ele se perde. Entre com uma conta para guardar seu avanço."
- Teste: `tests/curso-progresso/test_hanzi_restore.js` (Playwright, zh em modo convidado): 6/10 antes da correção, 10/10 depois (progresso FSRS e SM-2 de 2 cartões volta, cartão não estudado continua novo,
  texto dos hanzi continua o da camada, 198 cartões, sem erros de página, texto do portão).
- Regressão: 79 de 94 suítes locais passam; as 15 que falham são as mesmas de antes com os mesmos checks (fase-j, instável, passou desta vez).
- Efeito em produção após o deploy: as 5 contas de mandarim têm `hanziCards` gravados com progresso zero (nenhum com histórico), então nada muda para elas ao carregar; quem estudar hanzi daqui para frente
  passa a ter o progresso preservado. O progresso de hanzi estudado ANTES do deploy já se perdeu (foi regravado como zero) e não é recuperável.
Próximo: C1 (`courseStorageKey` puro e uso nos 3 pontos de `shared/auth.js`), aguardando autorização e as respostas das perguntas da auditoria.

## E3, passo C1 (2026-10-12): chave do bloco de progresso por curso

Só front-end estático; nenhuma migration, nada em produção além do deploy normal do Pages. Autorizado pela dona ("execute o C1"). **Comportamento idêntico para todas as contas atuais.**
- `shared/course-storage.js` (novo, funções puras): `courseStorageKey(courseId, _meta.courses)`, `activeCourseId`, `courseStorageKeyFor`. `_meta.courses[courseId].storageKey` tem prioridade;
  senão, cursos legados usam a chave sem sufixo (`frances`, `mandarim`); cursos novos usam o próprio `courseId` (`frances@en`, `portugues@en`).
  A regra do legado vem do registro de idiomas (campo novo `legacyStorage: ["pt-BR"]` em fr e zh, vazio em pt), não é deduzida no código.
- Flag `COURSE_PROGRESS_PER_SITE_LANGUAGE = false`: enquanto desligada, a página usa sempre o curso legado (`appKey@pt-BR`), qualquer que seja o idioma do site. O passo C5 liga a flag.
- `shared/auth.js`: `progressBlockKey()` usada nos 3 pontos de antes (guard-rail do salvar, merge do salvar, load). `<script>` novo nos `index.html` de fr e zh.
- Nada grava `_meta.courses` ainda (isso é do C5).
- Teste `tests/curso-progresso/test_course_storage.js` (105 verificações): função pura (legado, registro, cursos novos, `portugues@en`); **diferencial** `auth.js` de antes (congelado em
  `tests/curso-progresso/fixtures/auth.antes-do-c1.js`) contra o novo em 28 cenários (7 tipos de conta, inclusive sem `_meta`, formato legado do zh e conta nova, x fr/zh x pt-BR/en): o que o app
  recebe ao carregar, a linha gravada e o XP semanal saem idênticos; guard-rail monotônico igual nos dois; com a flag ligada o curso novo grava em `data["frances@en"]` sem tocar em `frances`, `mandarim` e
  `_meta`, recarregar traz o curso novo e voltar para pt-BR traz o progresso antigo.
- Regressão: 80 de 95 suítes locais passam; as 15 que falham são as mesmas de antes, com os mesmos checks.
Próximo: C2 (bloco `_account` com streak e `activityLog`), aguardando autorização.

## E3, passo C2 (2026-10-12): progresso da conta em `_account`

Só front-end estático; nenhuma migration; nada em produção além do deploy normal do Pages. Autorizado pela dona ("execute o C2").
- `shared/account-progress.js` (puro): `progress.data._account` guarda `streak`, `lastStudyDay`, `activityLog`, `hadStreakComeback`, `dailyLessonsLog` e `lastReviewReminderDay`, somados entre
  todos os blocos de curso e o formato antigo do zh na raiz da linha. Regras: último dia = o maior; logs = união com o maior valor por dia; comeback = OU; streak = maior entre os dias seguidos do log
  terminando no último dia e os streaks vivos que terminam nesse mesmo dia. `shared/auth.js`: o carregamento aplica a conta no STATE, o salvar grava `_account`, e `progressAccountIsNew` ignora `_account`.
  Os blocos continuam gravando os mesmos campos (espelho), então 037, 059, 070 e o cron seguem lendo como antes até o C3.
- **Fora do C2 de propósito**: `studyGoal` (objetivo e níveis são por idioma; hora do lembrete espera a decisão P2) e `dailyMinutesLog` (legado sem leitor).
- Achado novo na leitura de produção: 6 linhas ainda estão no formato antigo do chinês (progresso na raiz, sem bloco `mandarim`); a regra trata a raiz como mais uma fonte, senão a sequência delas se perderia.
- Ensaio em produção, **somente leitura** (`tests/curso-progresso/ensaio_streak_conta.sql`, só contagens): 33 linhas, 26 contas com progresso, 22 blocos comparados; 19 iguais, 2 sobem (a conta com os dois
  idiomas, em que o outro idioma estudou depois: efeito desejado), **0 diminuem, 0 dias do log perdidos**.
- Testes: `tests/curso-progresso/test_account_progress.js` (37): regras, 5 propriedades com 300 casos aleatórios (nenhum dia se perde, idempotente, independente da ordem, último dia nunca diminui, streak nunca menor que um
  streak vivo do mesmo dia), e integração com `auth.js` (1 idioma, 2 idiomas, formato antigo, conta nova, duas abas salvando ao mesmo tempo).
- Regressão: 81 de 96 suítes passam; as 15 que falham são as mesmas de antes, com os mesmos checks.
- Efeito visível: a sequência de dias passa a ser da conta. Quem estuda os dois idiomas vê a mesma sequência nos dois (hoje 1 conta em produção muda: no chinês passa de 1 para 2).

## E3, passo C3 (2026-10-12): servidor entende chaves de curso e a sequência da conta

**Estado de entrega**: código e migration prontos e testados; **Staging: migration 075 aplicada**; **produção: NADA aplicado e a Edge Function NÃO foi redeployada** (aguardam autorização da dona).
- **Migration `075_course_keys_and_account_streak_readers.sql`** (só `CREATE OR REPLACE`, sem DROP, sem tabela/coluna/política nova), mesmas assinaturas e grants:
  `get_teacher_student_overview` (070) e `get_public_profile_stats` (037) aceitam chaves de curso (`frances@en`...), devolvem `languageAppKey` (idioma estudado) e `courseId` além de `key`,
  e leem `streak`/`lastStudyDay` de `progress.data._account` quando existir e não estiver atrás do bloco; cartões próprios e ordenação usam o idioma estudado. Para as contas de hoje o resultado
  é o mesmo, só com os dois campos novos. `get_teacher_student_metrics` (059) não mudou (lê o bloco do idioma pedido; FSRS dos cartões da professora por idioma estudado é do C5, decisão P1).
- **`notification-cron`**: com `_account`, `streak_at_risk`, meta do dia e reengajamento usam a sequência e as lições da conta e saem **uma vez só**, pelo idioma principal (idioma atual da conta, senão o
  estudado mais recentemente). Sem `_account`, tudo como antes (um por idioma). Revisão atrasada e missões continuam por idioma. Blocos de curso (`@`) ainda não são lidos pelo cron (fica para o C5, quando existirem).
- **Correção no C2 descoberta ao revisar o cron**: o STATE carrega a UNIÃO dos dias de todos os idiomas, então o espelho gravado no bloco de um idioma passaria a conter dias estudados no outro e
  mascararia o painel da professora e o alerta de infrequência (que leem por idioma). Agora `AccountProgress.snapshotBase/mirrorForBlock` fazem o bloco guardar só os dias do próprio idioma
  (o que tinha ao carregar mais o que mudou na sessão), e a união fica em `_account`. Alerta de infrequência da professora, por idioma, não mudou.
- **Testes**: Postgres local (criado em `/tmp/pg`, porta 54329, com os papéis anon, authenticated, service_role e postgres): o teste antigo `tests/painel-alunos/test_rpc.sql` passa 25/25 COM a 075 aplicada e o novo
  `tests/curso-progresso/test_075_rpc.sql` 19/19 (`bash tests/curso-progresso/run_075.sh`); **Staging**: o mesmo SQL novo, 19/19 em transação com ROLLBACK, e zero resíduo conferido; cron
  `tests/curso-progresso/test_cron_account.js` 21/21 (e `k2b` 60/60); conta `test_account_progress.js` agora 47/47 (10 verificações novas do espelho por idioma).
- Regressão: 81 de 97 suítes locais passam; as 15 que falham são as mesmas de antes, com os mesmos checks (`fase-j`, instável, falhou no lote e passou 76/76 em duas rodadas isoladas).
- **Passos manuais que dependem da dona**: (1) aplicar a 075 em produção (não tem DROP, então pode ir pelo MCP ou pelo SQL Editor; ordem: antes do cliente do C2 chegar às contas); (2) redeployar a Edge
  Function `notification-cron` com o `index.ts` novo. Sem o passo 2 o cron segue com o comportamento de antes (um aviso por idioma, lendo os blocos), que continua correto porque o espelho do bloco mantém os mesmos campos.
Próximo: C4 (conquistas da conta, só tela), aguardando as respostas Q-10 a P8 e autorização.

### C3: aplicado em produção (2026-10-12, autorizado pela dona)

- **Migration 075 aplicada em produção** (e no Staging) pelo MCP, sem passo manual da dona. Prova de zero regressão com dados reais: 27 perfis públicos e 13 visões de professora, antes e depois, 0 erros e hashes idênticos.
- **`notification-cron` redeployada em produção (versão 22)**: partiu da versão que estava no ar mais o delta do C3. O `index.ts` do repositório está à frente (suporte a `ui_language`) e esse
  trecho **NÃO foi para produção**: é decisão separada.

## E3, passo C4 (2026-10-12): conquistas da conta

Só front-end estático; **nenhuma migration**; `earned_badges` não mudou. Autorizado pela dona ("execute o C4"). Grátis x Premium: tudo grátis.
- Classificação (recomendação Q-10, ainda sem resposta da dona): **da conta** (valem em qualquer idioma) = `first_step`, `streak_3`, `streak_7`, `xp_100`, `xp_500`, `reviews_100`, `comeback`, `weekend`;
  **de curso** (continuam por idioma) = `unit_1`, `unit_half`, `unit_all`, `explorer`, `trained_ear`, `multitasker`. Lista em `AccountProgress.ACCOUNT_BADGE_IDS` (`shared/account-progress.js`).
- Como funciona: a conquista da conta ganha em um idioma aparece como ganha nos outros, **sem celebrar de novo**. A união é feita na leitura (`loadAccountEarnedBadges` e `badgeEarnedNow` em `shared/auth.js`;
  `seedEarnedBadges` e a grade em `fr/app.js` e `zh/app.js`); o idioma atual também grava a linha dele em `earned_badges`, então rankings e `friends_activity` (que filtram por idioma) continuam coerentes.
  O perfil de outra pessoa (`fetchUserEarnedBadges`, `shared/leaderboard.js`) mostra conquista de curso só do idioma aberto e conquista da conta de qualquer idioma.
- Garantias: nada que já estava ganho some (a união só acrescenta; falha de rede mantém o que havia); sem conta, o idioma atual segue calculando sozinho.
- Teste: `tests/curso-progresso/test_conquistas_conta.js` (43 verificações: catálogo real de fr e zh classificado sem sobra, união, propriedade com 300 casos, sandbox do `auth.js`, perfil público, nenhuma migration nova).
- Regressão: 82 de 97 suítes passam; as 15 que falham são as mesmas de antes, com a mesma lista (`fase-j`, instável, passou desta vez). O teste novo roda à parte e passa 43/43.

## E3, passo C5 (2026-10-12): curso por idioma do site atrás de flag

Só front-end estático; **nenhuma migration**; nada em produção além do deploy normal do Pages, e **a flag segue DESLIGADA para todos** (`COURSE_PROGRESS_PER_SITE_LANGUAGE = false`), então o comportamento de hoje não muda. Autorizado pela dona ("execute o C5 e pode seguir as recomendações": P1 a P8 e Q-10 a Q-12 como recomendados). Grátis x Premium: tudo grátis.
- **Como testar sem afetar ninguém**: no navegador da dona, `localStorage['courses-per-site-language'] = '1'` liga a flag só ali. Ligar para todos = trocar a constante em `shared/course-storage.js` (decisão da dona, depois das pendências abaixo).
- **Com a flag ligada**: o curso da página é `<idioma estudado>@<idioma do site da conta>` e é **fixado no carregamento** (`pageSiteLanguage` em `shared/auth.js`; `?ui=` na URL vale para a aba). Outra aba mudando o idioma da conta não desvia a gravação. Curso novo sem bloco começa do zero e nunca empresta o progresso do outro; o formato antigo do zh na raiz só é lido no curso legado (pt-BR).
- **Registro**: `_meta.courses[courseId] = { storageKey, startedAt }` (só acrescenta; `startedAt: null` para bloco que já existia) e `_meta.currentCourse`.
- **XP semanal**: `weekly_xp` grava a **soma** dos blocos do idioma na semana (`weeklyXpForLanguage`), então `frances@pt-BR` e `frances@en` não se sobrescrevem. Idiomas diferentes e semanas diferentes não somam.
- **"Meus cursos"** (`shared/my-courses.js`, em Configurações, só com a flag ligada): lista idioma estudado x idioma do site, marca o atual, "em teste" para beta, rascunho só para admin/professora (P4). Trocar mostra o aviso novo (P8, texto a revisar pela dona: `courses.confirm.body`), salva o curso atual, grava o idioma do site na conta e **recarrega** (P7); curso de outro idioma estudado abre a página dele. O seletor "Idioma da interface" passa pelo mesmo caminho quando a flag está ligada.
- Perfil: o resumo do outro idioma lê o bloco do curso do idioma do site atual (`CourseStorage.blockFor`).
- **Gaveta (`cardVariants`) NÃO foi removida**: com a flag desligada ela ainda protege o FSRS ao trocar o idioma do site. Remover só no mesmo passo que ligar a flag para todos (item abaixo).
- **Pendências antes de ligar a flag para todos** (nada disso quebra hoje): (1) `notification-cron` e o servidor ainda não leem blocos `@` para revisão atrasada e missões (a 075 já entende as chaves nas RPCs); (2) remover a gaveta e o aviso antigo de troca de idioma; (3) conferir `friends_*`/ranking com dois cursos do mesmo idioma; (4) a dona revisar o texto do aviso e os nomes dos cursos.
- **Testes**: `tests/curso-progresso/test_course_storage.js` 124 (19 novos: soma do XP, registro, trocar e voltar preservando os dois progressos, aba antiga, zh legado, semanas e idiomas, lista de cursos), `tests/curso-progresso/test_meus_cursos_browser.js` 24 (fr/zh x flag desligada/ligada, 390px, claro e escuro com captura de tela, aviso, cancelar), i18n 2104/2104.
- Regressão do C5: 82 de 97 suítes passam; as 15 que falham são as mesmas de antes, com a mesma lista. Os testes novos (`test_course_storage.js` 124, `test_meus_cursos_browser.js` 24) rodam à parte e passam.

## E3, passo C6 (2026-10-12): portão "Eu falo..." com escolha de curso

Só front-end estático; **nenhuma migration**; **flag desligada para todos**: sem a flag o portão do primeiro acesso é o de antes (só pergunta o idioma do site). Autorizado ("execute o C6 e pode seguir as recomendações"). Grátis x Premium: tudo grátis.
- Com a flag ligada, depois de "Eu falo..." (idioma do site, sugestão pelo navegador) a conta **nova** vê "Qual curso você quer começar?" com os cursos disponíveis para esse idioma (rascunho escondido; beta marcado), o do idioma estudado da página primeiro. Escolher o desta página recarrega só se o idioma do site mudou; escolher o de outro idioma estudado abre a página dele. Conta com progresso ou idioma já guardado **entra direto** (a condição do portão não mudou). Sem progresso a perder, nada é salvo antes de recarregar.
- Achado ao testar: o texto do portão saía em português depois de escolher inglês (o catálogo ainda carregava); agora espera o `setUiLang`.
- Atalho para a dona testar: abrir qualquer página com `?cursos=1` liga a flag só naquele navegador (`?cursos=0` desliga). Substitui o console do navegador.
- Textos novos (confiança alta; a redação é da dona): `courses.first.title`, `courses.first.sub`. Código: `showFirstCoursePick` em `shared/my-courses.js`; gancho em `askUiLanguageOnFirstAccess` (`shared/auth.js`).
- Teste: `tests/curso-progresso/test_portao_cursos_browser.js` (21: fr/zh x flag desligada/ligada, 390px, capturas claro/escuro, recarregar, atalho `?cursos=`).
- Regressão do C6: 81 de 97 no lote; as 15 de sempre mais `tests/i18n/test_ui_language_confirm_browser.js` (1 check de temporização do aviso em inglês, falhou só no lote e passou 16/16 em duas rodadas isoladas; instável sob carga, como o `fase-j`). Teste novo `test_portao_cursos_browser.js` 21/21.

### Ajuste pós-C6 (2026-10-12, pedido da dona)
- Nome do curso = só o nome do idioma estudado na língua do curso: Francês, French, Chinês, Chinese (`LanguageRegistry.shortName`); saíram as chaves `courses.name` e `courses.siteLang.*`.
- Aviso de troca (`courses.confirm.body`) agora diz que é um **curso novo, com progresso próprio** (começa do zero se nunca estudou nele). Vale só com a flag ligada. **Em produção continua o aviso antigo** ("Seu progresso continua salvo"), que descreve o comportamento de hoje (mesmo progresso, só muda o idioma da interface).
- Lista de cursos separada por grupo: "Cursos para falantes de português" (Francês, Chinês) e "Cursos para falantes de inglês" (French, Chinese).

### Pendências da flag (2026-10-12): o que foi fechado e o que falta
- **Cron (repo)**: `notification-cron/index.ts` agora lê blocos de curso (`blockForLanguage`: curso aberto por último, senão o legado, senão o primeiro `@`), um por idioma; `test_cron_account.js` 28/28. **Não deployado** (precisa de autorização da dona; o `index.ts` do repo também traz o suporte a `ui_language`, que nunca foi para produção).
- **Gaveta (`cardVariants`) FICA**: além do idioma do site ela faz o progresso seguir a PALAVRA quando o vocabulário muda por aluno (país de origem, placeholders de perfil), caso que continua existindo com cursos separados. A auditoria estava incompleta ao tratá-la só como ponte do idioma do site.
- **Ranking e amigos**: `friends_*`, `weekly_xp` e `earned_badges` usam o idioma estudado (não o curso) e o XP é somado: sem mudança necessária.
- **Flag NÃO ligada**: a dona escolheu "o seletor Idioma da interface vira troca de curso, sem ?cursos=1"; ligar `COURSE_PROGRESS_PER_SITE_LANGUAGE = true` para todos é decisão com efeito em produção e aguarda a autorização explícita dela. Efeito a avisar: quem hoje usa o site em inglês (1 conta com `uiLanguage = en`) abriria um curso novo vazio; o progresso antigo continua intacto no curso em português.

### Menu da bandeira estilo Duolingo (2026-10-12, pedido da dona; atrás da flag, desligada)
- Com a flag ligada, **passar o mouse na bandeira do topo** abre "Meus cursos" (o atual com ✓ e os que a conta já iniciou, nome direto: Francês, French...) e "+ Adicionar curso" (celular: toque; Esc e clique fora fecham). Sem a flag o menu é o de antes.
- **Adicionar curso** abre uma tela com o seletor "Eu falo português / Eu falo inglês" (I speak ...) e a grade de cursos disponíveis para esse idioma (bandeira, nome, "em teste" no beta, ✓ nos já iniciados). Escolher abre o aviso de curso novo e troca (salva o curso atual, grava idioma do site e idioma atual da conta, recarrega ou abre a página do outro idioma estudado).
- Código: `paintCourseMenu`, `openAddCourse` em `shared/my-courses.js`; ganchos em `shared/language-switcher.js`. Textos novos `courseMenu.*` (confiança alta).
- Teste: `tests/curso-progresso/test_menu_cursos_browser.js` (24: fr/zh x flag desligada/ligada, hover, fechar, tela, troca do "Eu falo", aviso, 390px sem rolagem horizontal e alvos >= 44px, capturas claro/escuro).

### Flag LIGADA para todos (2026-10-12, autorizada pela dona: "então pode ligar")
- `COURSE_PROGRESS_PER_SITE_LANGUAGE = true` em `shared/course-storage.js`. O atalho `?cursos=` foi removido; fica só a chave de emergência `localStorage['courses-per-site-language'] = '0'` (desliga num navegador; usada por testes do comportamento antigo). **Só vale para as alunas depois do merge na `main`** (nada foi mesclado).
- Conferido no banco (só contagens): 1 conta com `uiLanguage = en`, não é da dona, 0 XP; nada a perder.
- **Deploy do `notification-cron` (autorizado) FALHOU**: erro interno do Supabase ao publicar e ao ler o bundle de qualquer função; versão 22 segue no ar, sem mudança. Versão pronta (v22 + `blockForLanguage` + alerta de infrequência) em `/tmp/cron-deploy/index.ts` (temporário; a fonte é o repo + o delta descrito aqui). **Não mesclar na `main` antes do deploy.**
- Regressão: 82 de 97 suítes; as 15 de sempre. Duas suítes do i18n (`test_ui_language_confirm_browser`, `test_ui_language_first_access_browser`) testam o comportamento antigo e passaram a rodar com a chave de emergência; o comportamento novo está nos testes `*_cursos_browser`. Corrida de temporização no teste do aviso em inglês corrigida (esperava o catálogo).

### Troca de curso só pela bandeira (2026-10-13, pedido da dona)
- A troca/adição de curso mora **só no menu da bandeira do topo** (como no Duolingo). Com a flag ligada, Configurações **não** tem mais o seletor "Idioma da interface" nem a lista "Meus cursos" (`renderMyCourses` esconde os dois; o seletor volta só com a chave de emergência `courses-per-site-language = 0`). Saíram as chaves `courses.title`, `courses.sub`, `courses.current`.
- Subtítulo do portão: "Você pode trocar ou adicionar cursos depois, na bandeira no topo da tela. O progresso de cada curso é separado." (sem citar Configurações).
- Teste `test_meus_cursos_browser.js` reescrito (12): Configurações sem seletor nem lista. Menu 24 e portão 21 seguem verdes; i18n 2104/2104.
- Deploy do `notification-cron` tentado de novo e falhou igual (erro interno do Supabase). Arquivo pronto para colar no painel: `docs/deploy/notification-cron-para-colar-no-painel.ts` (v22 + `blockForLanguage` + alerta de infrequência).
