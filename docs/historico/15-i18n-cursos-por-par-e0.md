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
