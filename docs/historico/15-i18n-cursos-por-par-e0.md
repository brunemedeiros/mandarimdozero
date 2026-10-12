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
