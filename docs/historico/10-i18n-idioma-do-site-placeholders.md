# Histórico: Idioma do site, variantes, placeholders de perfil, revisão em inglês

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Idioma do site (interface + conteúdo) -- decisões da dona do projeto (2026-10-04)

Plano completo: `docs/i18n/roadmap-i18n-l1.md`. Núcleo em `shared/i18n/` (`t()`, `tp()`, catálogos `pt-BR`/`en`; `es` congelado).

- **Dois eixos só**: idioma estudado (`/fr`, `/zh`, futuro `/ptbr`) e **idioma do site** (`uiLanguage`). Não existe "L1" separada: o idioma do site é a língua pela qual o aluno aprende, e vale para botões, avisos, traduções, explicações e correção de respostas. Ex.: aluno russo estuda francês com o site em inglês.
- **Conteúdo também migra** para o idioma do site (não só a interface). Ordem: francês inteiro, depois mandarim. Fallback para português enquanto não houver tradução.
- **Idioma do site nunca é Premium.** Futuro (não decidido, sem infraestrutura): planos por idioma estudado (Free = 1 idioma; Basic = premium em 1; Pro = premium em todos).
- **Novos idiomas estudados entram já com todos os idiomas de site disponíveis.** `/ptbr` = português para falantes de inglês (projeto próprio, depois das fases de conteúdo).
- Guardar o idioma na conta em `progress.data._meta.uiLanguage` (nunca em `serializeState()`), com `localStorage['ui-language']` para convidado.
- Regra de ouro: texto em português não muda byte a byte; só muda com aprovação explícita (testes têm a lista `DELIBERATE_PT_CHANGES`). O aviso de limite de cartões diz "apague" (a ação real; arquivar foi removido na CONSOLIDAÇÃO-3).
- Toda tradução nova relatada com nível de confiança (alta/média/baixa) e entra como `needs_review` até a dona aprovar. Espanhol segue congelado.
- Bloqueios antes de traduzir conteúdo: texto em português usado como lógica (nomes de campo do Anki "Caractere"/"Tradução", `unitTitle` no cartão, `lang:'pt-BR'` em `shared/flashcard-model.js`, títulos de Course Deck em PT no banco, comparador de "Ouça e traduza" sem testes).
### Ditados (fr) -- correção do campo de digitar (Fatia 1, 2026-10-03)
- Lógica pura em `fr/app.js`, bloco `dictation-answer-logic` (`evaluateDictation`), testada por `fr/scripts/test_answer_validation.js` (44 casos) e `tests/ditado/test_playwright.js`.
- Nota: acerto exato = 1; erro leve (falta de acento, hífen, apóstrofo, `œ` como `oe`) = 0,5 e vira "quase" com explicação; palavra a mais (não troca) = -0,5. Colar o texto 2 vezes não dá mais 100.
- Pontuação NÃO desconta: o que faltou é marcado (sublinhado) com aviso. Se o aluno escreve "virgule"/"point" por extenso, é erro leve (-0,5) e o sinal é mostrado.
- Número em dígito ("25") é aceito sem erro; a resposta sempre mostra a escrita por extenso (`frenchNumberWords`, 0 a 100).
- Pré-limpeza do texto do aluno: apóstrofos/hífens do celular, espaços invisíveis, "j' ai", ponto sem espaço depois.
- Campo sem autocorreção/capitalização, com `maxlength` e `aria-label`; teclas de acento não roubam o foco e quebram linha; Verificar vazio não corrige; mp3 ausente desabilita o botão; o resultado rola até a tela.
- Fica para as Fatias 2 e 3: salvar melhor nota/palavras erradas, explicar tipo de erro (concordância, homófonos), áudio por frase, versionar mp3 por hash, trava Premium dentro do player, chinês.


## Variantes de palavra por idioma do site (decisão 2026-10-06)
Projeto e auditoria (Fase 0) em `docs/i18n/projeto-variantes-por-idioma.md`. Decisões: o seletor da variante é só o idioma do site; a chave é o IDIOMA (mesma palavra em dois idiomas = cartões e históricos separados, pois o áudio difere); categorias que crescem em A2/B1 (país, nacionalidade, moeda, cidade, exemplos e notas culturais) devem ser registradas por slot ao criar conteúdo novo. Até haver 3 idiomas de site, vale a gaveta (`shared/card-variants.js`). Risco principal achado: `studyWordCardsFor` (K2) e as RPCs 059/070 leem cartões da trilha sem passar por `isCardLessonCompleted`.

## Placeholders de perfil no conteúdo da trilha (2026-10-06)
- Decisão da dona: exemplos em que o falante é o próprio aluno usam o perfil, não o nome da autora. Marcadores: `{nome}`, `{primeiro_nome}`, `{nacionalidade}` (idioma estudado: fr "brésilienne", zh "巴西人"), `{nacionalidade_p}` (pinyin, zh) e `{nacionalidade_t}` (língua da tradução: pt "brasileira", en "Brazilian"; os dois últimos foram acrescentados por necessidade do conteúdo).
- `shared/profile-placeholders.js` (carregado depois de `profile.js` em fr/zh): `applyProfilePlaceholders()` reescreve as strings DENTRO de `UNITS` (guarda o modelo num WeakMap; reaplicável). Disparado por `onApplied` do ContentI18n (fr/zh `app.js`, cobre troca de idioma do site e convidado), por `ensureProfileLoaded()` e por `saveProfileEdits()`. Convidado/conta sem nome = "Convidado" (en: "Guest"); sem país = Brasil. Nome sanitizado (remove `<` `>` e controles). Gênero: o perfil não tem, então a nacionalidade usa o feminino que o conteúdo já usava (decisão pendente).
- Áudio: texto com placeholder resolvido quase nunca bate `AUDIO_MANIFEST` (chave = texto literal); `speakFrench`/`speakChinese` caem no Web Speech. Com nome "Brune"/país Brasil o texto volta idêntico ao do manifest.
- Perfil: campo "País de origem" (select) em Editar perfil; só aparece/é gravado se a coluna existir no perfil carregado. **Migration `072_add_country_to_profiles.sql` NÃO aplicada** (coluna `country text` nullable + CHECK `^[A-Z]{2}$`; sem ela o campo some e nada quebra). Atenção: `profiles_public_read` deixa o país legível como o nome.
- Convertido: fr A1-1 frase 0 (nome), A1-2 frase 1 e A1-9 frase 0 (nacionalidade, incl. `scenario` do A1-2); zh Unit 1 frase 0 (nome) e Unit 2 frase 1 (nacionalidade); overlays `fr/content.en.js` e `zh/content.en.js` só em "My name is {nome}".
- Ficou para decisão da dona: diálogos com personagens nomeados (fr A1-2 Ana/Léo; zh Unit 2 "B" = "Brune"; zh `spk:"Brune"` nas Units 5 e 8); exemplos de conceito/gramática ("Je suis brésilienne" em A1-g1 linha ~452; zh `shi` "我是巴西人"/"我叫Brune"); `scenarioEmoji` 🇧🇷; o overlay `src` do inglês continua fixando "américaine"/"美国人" (não usa o país do perfil); gênero da nacionalidade; preencher o país dos alunos existentes.
- Testes: `tests/placeholders/` (Node/VM 44, Playwright FR+ZH 28). `tests/i18n/test_i18n_unit.js` (NEW_KEYS + strip do bloco novo) e `test_content_en.js` (guest em en = "Guest") ajustados deliberadamente. `test_card_variants_browser.js` (2) e `tests/i18n/test_playwright.js` (timeout) já falhavam antes.
- **Gênero e nacionalidade neutra (2026-10-06)**: campo "Gênero" em Editar perfil (Masculino/Feminino/Outro/Prefiro não dizer, opcional), guardado em `profile_private` (migration 073, tabela privada com RLS só do dono; NUNCA em `profiles`, que é público). `loadProfilePrivate`/`saveProfileGender` em `shared/profile.js` (`PROFILE_PRIVATE_CACHE`/`PROFILE_PRIVATE_SUPPORTED`; sem a tabela o campo some). `{nacionalidade}` (fr) e `{nacionalidade_t}` (pt) seguem o gênero: masculino/feminino = forma própria; Outro/Prefiro não dizer/vazio/convidado = neutra "brésilien·ne"/"brasileiro·a" (en e zh sem gênero). Tabela `PROFILE_COUNTRIES` ganhou `frm`/`frn`/`ptm`/`ptn`. Áudio: `speakableProfileText` expande o neutro para as duas formas ("brésilien, brésilienne") só no Web Speech de `speakFrenchAudioOnly`; texto exibido e manifest não mudam. Efeito: quem não preencheu gênero passa a ver a forma neutra no lugar da feminina. **073 aplicada no Staging e na produção (2026-10-06).** Rótulos em inglês do gênero: Masculine/Feminine/Other/Prefer not to say. Testes: `tests/placeholders/` (Node/VM 70, Playwright 45), `tests/profile-private/run.sh` (Postgres local, 12). Detalhes em `docs/i18n/projeto-variantes-por-idioma.md` seção 11.


## Revisão em inglês (2026-10-07)
- Tela nova da Revisão (`shared/deck-browser.js`, `shared/review-extras.js`, faixa de hoje e recordes em fr/zh `app.js`, Configurar, Painel, Adicionar) passou para `t()`: 193 chaves `review.*` em pt-BR/en (es congelado). Português byte a byte igual.
- Plural feito com chaves `.one`/`.other` escolhidas por `n === 1` (como o código antigo), não `tp()`: em pt-BR o `Intl.PluralRules` trata 0 como singular.
- `tests/i18n/test_i18n_unit.js`: `PREV2 = '9969e3c'` cobre os arquivos convertidos; 2090/2090.
- Sobras traduzidas (2026-10-07): etiqueta "Na frase · <unidade>" (`studyPhraseCardTitle`, shared/study-trail-model.js; atualizada também por `refreshStudyCardTexts` ao trocar o idioma), erros de envio de áudio/imagem/link (`mediaErrorText` + chaves `media.*`, shared/flashcard-model.js; sem `t()` fica o português), título do topo (`brand.title.fr`/`brand.title.zh`, `brand.byline`) e a aba "Desafios" da barra de baixo (`nav.challenges`). "Já saíram da lista" já usava `review.records.leftList` desde cdd1156 (só não estava publicado).
