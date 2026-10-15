# Arquitetura: cursos por par de idiomas, núcleo compartilhado e novos idiomas

Documento de arquitetura e plano de execução. Escrito em 2026-10-08 a partir das decisões da dona do projeto (Prof. Brune) na conversa sobre o site `/pt`.
Serve a dois usos: (1) guiar a execução por etapas neste repositório; (2) ser enviado a outro projeto, ou usado ao final como lista de verificação do que foi pedido.

Convenções deste arquivo:
- **D-xx** = decisão já tomada pela dona. Não reabrir sem pedido dela.
- **Q-xx** = decisão em aberto, com recomendação. Cada uma tem a etapa em que precisa ser respondida.
- **R-xx** = risco ou problema esperado, com a solução sugerida.
- **Divergência prevista** = ponto em que a estratégia que eu provavelmente seguirei na execução difere da sugerida. Fica explícito para você poder aprovar ou vetar antes.
- **V-xx** = item de verificação final (seção 12).
- Tamanhos: P (poucas horas de trabalho de agente), M (um dia), G (vários dias), GG (semanas, projeto próprio). Não são prazos, são ordens de grandeza.

---

## 1. Sumário (leitura de 2 minutos)

1. A plataforma ensina um **idioma estudado** (`fr`, `zh`, e agora `pt`) a pessoas que usam o site em um **idioma do site** (hoje `pt-BR` e `en`).
2. **Curso = idioma estudado × idioma do site** (D-01). Cada curso tem progresso próprio. Trocar o idioma do site troca o curso.
3. O **conteúdo estudado é único** por idioma (palavras, frases, áudio, ids). A **camada que depende do idioma do site é escrita de propósito para quem fala aquele idioma**, nunca apenas traduzida (D-04, o ponto mais importante do projeto).
4. O código deixa de ser copiado por idioma. Passa a haver um **núcleo compartilhado**, **famílias** (latina, caracteres) e uma **configuração mais regras próprias** por idioma (D-07).
5. Adicionar um idioma ou curso novo passa a ser: configuração + pasta de conteúdo + regras próprias + testes, seguindo um **gabarito gerado por script**, não uma cópia de pasta.
6. Estado de partida medido: interface 100% traduzida (2.142 textos, pt-BR e en, paridade total); banco já aceita `portugues`; mas `fr/app.js` (12,6 mil linhas) e `zh/app.js` (8,8 mil linhas) são duas bases divergentes, e há mapas fixos de fr/zh em `shared/`.
7. O plano tem 11 etapas (E0 a E10). As primeiras entregam fundação invisível ao aluno; o `/pt` aparece só na E7; o conteúdo do nível inicial do `/pt` é projeto próprio (E9), fora do escopo desta arquitetura.
8. Nada é aplicado em produção sem autorização explícita da dona, etapa por etapa.

---

## 2. Princípios (valem para qualquer projeto de múltiplos idiomas)

P1. **Separar três eixos que costumam ser confundidos**: idioma estudado, idioma da interface, idioma da explicação/ensino. Aqui o segundo e o terceiro são o mesmo (idioma do site), mas o código não deve presumir isso em lugar nenhum.
P2. **Uma verdade em um lugar só**. O que é igual para todos (a palavra em francês, o áudio) é corrigido uma vez. O que depende da língua de origem (explicação, contraste, armadilha) vive só no curso.
P3. **Sem fallback silencioso entre línguas de origem**. Um aluno de inglês nunca deve ver explicação escrita para falantes de português como se fosse sua. Quando faltar texto, a falha precisa ser visível para quem produz o conteúdo e inofensiva para o aluno (ver Q-03).
P4. **Dado persistido não usa o nome que o aluno vê**. Chaves internas e ids são estáveis; rótulos vêm do catálogo do idioma do site.
P5. **Adicionar idioma não pode exigir caçar `if` pelo código**. Tudo que varia por idioma entra em um registro único (config) ou em um ponto de extensão declarado.
P6. **Migração aditiva primeiro**. Dados existentes continuam funcionando sem reescrita; o formato novo convive com o antigo até a migração explícita e autorizada.
P7. **Cada etapa termina verde**: testes da área e regressão dos idiomas existentes rodando, números reais registrados.
P8. **Qualidade pedagógica é critério de pronto**, não só código funcionando: todo texto novo de ensino passa por revisão com nível de confiança.

---

## 3. Decisões já tomadas

| ID | Decisão | Origem |
|---|---|---|
| D-01 | Curso = idioma estudado × idioma do site. Trocar o idioma do site troca o curso, com progresso próprio. | Dona, 2026-10-06 e 2026-10-08. Detalhe de dados em `auditoria-progresso-por-curso.md`. |
| D-02 | URLs de idioma estudado: `/fr`, `/zh`, `/pt` e, no futuro, `/it`, `/es`, `/ja`. Japonês usa `ja` (código ISO), não `jp`. | Dona, 2026-10-08. |
| D-03 | O `/pt` usa a bandeira do Brasil, dialeto do português brasileiro no conteúdo e voz `pt-BR`. | Dona, 2026-10-08. |
| D-04 | O conteúdo estudado é sempre o mesmo. A camada que depende do idioma do site é escrita de propósito para falantes daquele idioma (notas, explicações, contrastes, armadilhas de pronúncia), não é tradução. "ABSOLUTAMENTE SIM... É O MAIS IMPORTANTE." | Dona, 2026-10-08. |
| D-05 | Idioma do site nunca é Premium. | Dona, anterior. |
| D-06 | Idiomas novos entram já com todos os idiomas de site que fizerem sentido (ver Q-04). Espanhol de interface segue congelado até decisão dela. | Dona, anterior. |
| D-07 | Premissa do projeto: "cada vez mais idiomas". A estrutura precisa tornar o idioma novo barato; copiar pasta de idioma não é aceitável como método. | Dona, 2026-10-08. |
| D-08 | A pasta nova de idioma é gerada por um gabarito (script), não é cópia do `fr/`. | Síntese da conversa (pergunta dela sobre `novo-idioma-template`; resposta: gabarito gerado, não pasta de código estática). |
| D-09 | Português do Brasil coloquial em todo texto de interface e notas; sem "--" nem "pra" em texto visível. | CLAUDE.md. |
| D-10 | Mudanças de dado em produção, migrations em produção e deploy só com autorização explícita da dona, por etapa. Staging antes de produção. | CLAUDE.md. |
| D-11 | Existe uma única professora (a Brune como Professora, não como Admin). Regra "um aluno, uma professora" fica revisável quando o papel Teacher puder ser dado a outras contas. | Dona, 2026-10-07. |

---

## 4. Estado de partida (fatos medidos, para não reabrir auditoria)

Medidos em 2026-10-08 por leitura do código; nenhum protótipo foi executado.

**Interface**
- `shared/i18n/pt-BR.js` e `en.js`: 2.142 chaves cada, paridade total. `es.js` congelado (54 linhas).
- Idioma do site: `t()` com fallback en, depois pt-BR, depois a própria chave. Conta guarda `progress.data._meta.uiLanguage`; convidado usa `localStorage['ui-language']`.
- HTML-fonte (`fr/index.html`, 5.020 linhas; `zh/index.html`, 4.341) escrito em português; o inglês entra por cima via `applyDomI18n`.

**Código por idioma (cópias divergentes)**
- `fr/app.js` 12.604 linhas, `zh/app.js` 8.834, mais `fr/conjugation-data.js` 16.898 e `zh/hanzi-data.js`, `zh/stories.js`.
- Comparação por função (tamanho de código do `fr/app.js`): 17% idêntico ao `zh`; 24% quase igual (80% ou mais parecido); 14% com o mesmo nome mas divergente; 45% só existe no francês (conjugação, Desafios, Ditados, checkpoint etc.). Método: nome da função + similaridade textual; não é análise semântica.
- Cada idioma tem service worker, manifest, ícones, pasta de áudio e `audio-manifest.js` próprios.

**Mapas fixos de fr/zh no código compartilhado** (a eliminar na E1): `STUDY_LANG_FOR_APP_KEY` (`shared/flashcard-model.js:32`), `APP_KEY_TO_LANG_ID` (`shared/language-pref.js:17`), `PUBLIC_DECK_LANG_FOLDERS` (`shared/public-deck.js:32`), `FLASHCARD_DIRECTION_LANGUAGE_LABELS` (`shared/admin-students.js:56`), nacionalidade em `shared/profile-placeholders.js`, pares `'fr'/'pt-BR'` em `shared/study-trail-model.js` (`studyNoteRowForWord`, função de frases), opções de idioma de campo em `shared/flashcard-field-editor.js`.

**Banco**
- `'portugues'` já está nos CHECK de `teacher_students`, `teacher_flashcards`, `own_flashcards`, `teacher_class_logs`, `teacher_support_materials`, `decks` e nas funções `ensure_user_decks`, `ensure_course_decks`, `ensure_teacher_decks`. Lista fixa de 3 valores: idioma novo exige migration (ver Q-06).
- `weekly_xp`, `notification_templates` e `earned_badges` usam `language_app_key` como texto livre.
- Progresso: uma linha por conta em `progress.data`, bloco por idioma (`data.frances`, `data.mandarim`) e `_meta`.
- Nenhum modelo de notificação existe para `portugues`.

**Conteúdo**
- `fr/content.js` e `zh/content.js` têm o português embutido como texto-base (`t`, títulos, metas, notas, "verdadeiro ou falso"); o inglês é uma camada por cima (`content.en.js`, gerada de `docs/i18n/content-en/*.json` por `scripts/build-content-overlay.js`), que **só traduz**: não acrescenta nem substitui nota.
- Aviso de limite: a camada em inglês atual é tradução do português, o oposto de D-04. Precisa ser reescrita em E9.

**Áudio e correção**
- TTS por Field: Edge Function `tts-generate` (Google Chirp 3 HD), voz `pt-BR` já mapeada; regras de "texto falado" existem para fr (v4) e pt.
- Comparador de "Ouça e traduza" é gramática do português e sem testes para outras línguas de origem.

---

## 5. Arquitetura-alvo

### 5.1 Entidades

```
IdiomaEstudado   (fr, zh, pt, it, es, ja ...)           -> configuração + base de conteúdo + regras próprias
IdiomaDoSite     (pt-BR, en, es ...)                    -> catálogo de interface + regras de correção da língua de origem
Curso            (IdiomaEstudado x IdiomaDoSite)        -> camada pedagógica + progresso + status (rascunho, beta, publicado)
Família          (latina, caracteres)                   -> módulo de comportamento comum a vários idiomas estudados
```

### 5.2 Camadas de código

```
shared/core/            núcleo: revisão, Decks, cartões, perfil, auth, notificações, painel, motor de Note/CardType
shared/families/latin/  acentos, normalização, teclado, ditado, acentuação, pronúncia latina
shared/families/cjk/    caracteres, leitura (pinyin, furigana), tons, traços
shared/i18n/            catálogos de interface por idioma do site (já existe)
languages/registry.js   registro único de idiomas estudados e cursos (substitui todos os mapas fixos)
<idioma>/               config.js + content/ (base) + rules.js (regras próprias) + assets (áudio, ícones) + index.html fino
courses/<estudado>-<site>/   camada do curso: traduções + notas escritas para a língua de origem + regras de correção
```

Observações:
- `<idioma>/index.html` fica fino: casca de página que carrega núcleo + família + config. A duplicação de 5 mil linhas de HTML por idioma acaba.
- A **camada do curso** é a única parte que tem autoria humana por par. Ela pode **acrescentar e substituir**, não só traduzir (D-04).
- `fr/app.js` e `zh/app.js` não são apagados de uma vez: migram por áreas (E4), com a regressão rodando a cada passo.

### 5.3 Identidade e chaves

- **URL / pasta**: `fr`, `zh`, `pt` (D-02). É o que a pessoa vê.
- **Chave interna do idioma estudado** (`appKey`): `frances`, `mandarim`, `portugues`; novos ganham chave nova. Fica no banco; nunca aparece para o aluno.
- **Curso**: `courseId = "<appKey>@<idiomaDoSite>"` (ex.: `frances@pt-BR`, `frances@en`, `portugues@en`).
- **Armazenamento do progresso** (proposta B de `auditoria-progresso-por-curso.md`): os dois cursos que já existem continuam em `data.frances` e `data.mandarim` (são `frances@pt-BR` e `mandarim@pt-BR`, sem migração das contas); cursos novos usam a própria chave (`data["frances@en"]`). Um registro em `_meta.courses` diz qual chave guarda cada curso; a regra "pt-BR usa a chave sem sufixo" não é deduzida no código.
- **Streak por conta**: sai do bloco de curso e vai para um bloco de conta; conquistas viram da conta ou do curso conforme definido na E3.

### 5.4 Conteúdo: base e camada

Base do idioma estudado (única, corrigida uma vez): texto no idioma estudado (`f`, `blocks`, hanzi/pinyin), estrutura de níveis/módulos/unidades/lições, ids estáveis, tipos de exercício e respostas no idioma estudado, referências de áudio.

Camada do curso (por par): títulos, metas, tradução de vocabulário/frases/diálogos, cenários, notas de realidade e culturais comparadas à língua de origem, explicações de gramática, "verdadeiro ou falso" e a nota de cada afirmação, dicas, armadilhas de pronúncia da língua de origem, frases-modelo localizadas (ex.: "Je suis américaine" no curso em inglês), traduções de referência dos Desafios, mp3 de introdução dos ditados.

Regra de resolução: `valor = camadaDoCurso[campo] ?? <falha visível>` (ver Q-03). Não existe fallback para a camada de outro curso.

### 5.5 Status de curso

`rascunho` (só admin/professora vê) → `beta` (visível, avisa que é preliminar) → `publicado`. Publicar exige que todos os campos obrigatórios da camada estejam preenchidos (verificado por script). Os cursos em inglês que existem hoje (tradução, não autoria) entram como `beta`.

### 5.6 Gabarito de novo idioma/curso (D-08)

Script `scripts/novo-idioma.js` (nome provisório) gera: entrada no registro, `<idioma>/config.js`, esqueleto de `content/` com os campos obrigatórios vazios, `rules.js` com os pontos de extensão declarados, pasta `courses/...`, stubs de teste em `tests/<idioma>/` e a lista de tarefas (checklist) do idioma. Mais a skill `novo-idioma-ou-curso` com o passo a passo. O gabarito **gera** a partir do estado atual do núcleo, então não envelhece como uma pasta-cópia.

---

## 6. Mapa das etapas

| Etapa | Nome | Tamanho | Depende de | Visível ao aluno? |
|---|---|---|---|---|
| E0 | Contratos e inventário | P | - | não |
| E1 | Registro de idiomas e cursos (fim dos mapas fixos) | M | E0 | não |
| E2 | Separar conteúdo-base da camada do curso | G | E1 | não (deve ficar idêntico) |
| E3 | Progresso por curso e dados da conta | G | E1 | pouco (troca de curso) |
| E4 | Extração do núcleo compartilhado do código | GG | E1 (parte em paralelo com E2/E3) | não |
| E5 | Regras que dependem de idioma (família e língua de origem) | G | E4 parcial | pouco |
| E6 | Servidor: notificações, painel da professora, bancos e funções | M | E1, E3 | pouco |
| E7 | O site `/pt` (infraestrutura e unidade-piloto) | G | E1-E6 | sim |
| E8 | Gabarito e skill para idiomas/cursos futuros | M | E7 | não |
| E9 | Autoria das camadas dos cursos (nível inicial `/pt` e reescrita dos cursos em inglês) | GG | E2, E5 | sim |
| E10 | Verificação final e fechamento | M | todas | - |

Regra de avanço: **não começar a etapa seguinte sem autorização da dona** (CLAUDE.md, "Processo"). Cada etapa começa com o plano detalhado (agente de planejamento), termina com o relatório registrado e a verificação do critério de pronto.

Agentes disponíveis no projeto e como são usados:
- `Explore` / `general-purpose`: levantamentos de leitura, mapas de impacto.
- `Plan` e `plan-reviewer`: plano da etapa antes de executar, revisão do plano.
- `refactor-planner`: planos de extração (E4).
- `code-refactor-master`: execução de extrações (E4).
- `principal-engineer` e `code-architecture-reviewer`: revisão de arquitetura no fim de etapas de risco (E1, E2, E3, E4).
- `regressao` (modelo pequeno): roda todas as suítes do gate e devolve números.
- `revisor-conteudo` (modelo grande): revisão pedagógica e linguística, sempre com nível de confiança.
- `documentation-architect`: documento e skill da E8, relatório final da E10.
- `web-research-specialist`: pesquisa externa (erros típicos de falantes de inglês no português, vozes e custos de TTS, normas de acentuação).
- `auto-error-resolver`: só se uma etapa de Edge Function/TypeScript quebrar na compilação.
- Skills: `migration-supabase`, `teste-navegador`, `audio-tts`, `notas-de-realidade`, `criar-desafios`, `registrar-entrega`, `grilling` (decisões).

---

## 7. Etapas em detalhe

### E0. Contratos e inventário (P)

**Objetivo.** Congelar o vocabulário, os contratos de dados e a lista de pontos de variação antes de tocar em código, e responder as decisões que travam as etapas seguintes.

**Subtarefas**
1. Inventário completo de "o que varia por idioma estudado" e "o que varia por idioma do site" (`Explore`): arquivos, funções, constantes, tabelas, listas fixas do servidor.
2. Escrever o contrato do registro de idiomas/cursos (campos, tipos, exemplos de fr, zh, pt).
3. Escrever o contrato da camada do curso (campos obrigatórios por unidade, por tipo de unidade; o que pode ser substituído).
4. Definir o formato do relatório de confiança por item (alta/média/baixa, quem revisou, data).
5. Rodar o `grilling` das decisões Q-01 a Q-06.
6. Revisão do plano (`plan-reviewer`).

**Agentes.** `Explore` (1), `documentation-architect` (2-4), `plan-reviewer` (6). Skill `grilling` (5).

**Problemas esperados**
- R-01. O inventário revela mais pontos de variação do que o previsto. *Solução:* classificar cada ponto em núcleo, família, idioma, curso; os que não couberem viram débito explícito, não bloqueio.
- R-02. Decisões demoram. *Solução:* cada Q traz recomendação; se a dona não decidir, executa-se a recomendação e registra-se como "provisória".

**Decisões desta etapa**
- Q-01. *Onde mora o registro de cursos?* Recomendação: arquivo estático `languages/registry.js` para idiomas e cursos (conteúdo não muda sem deploy), mais `_meta.courses` na conta para o que a pessoa já iniciou.
- Q-02. *Formato da camada do curso:* um arquivo por curso e por unidade (`courses/fr-en/units/A1-1.js`) ou um arquivo grande por curso? Recomendação: um arquivo por unidade, carregado sob demanda; facilita revisão por unidade e reduz peso.
- Q-03. *O que acontece quando falta texto na camada de um curso?* Recomendação: curso só vai a `publicado` com camada completa; em `beta`, campo ausente mostra o texto-base no idioma estudado (nunca o texto de outra língua de origem) mais um aviso discreto; em `rascunho`, só admin vê e o painel lista o que falta. *Divergência prevista:* se a camada em inglês existente (tradução) for tratada como `beta`, durante a E2 manterei o comportamento visual atual (texto em inglês traduzido) sem aviso novo, para não piorar o curso antes de a E9 reescrevê-lo.
- Q-04. *Idiomas de site oferecidos em cada idioma estudado:* recomendação: todos, exceto o próprio idioma estudado (não há curso de português para quem usa o site em português). `/pt` oferece `en` e futuros; `/fr` e `/zh` oferecem `pt-BR`, `en` e futuros.
- Q-05. *Nomes de pasta:* pasta por idioma estudado (`fr`, `zh`, `pt`) e `courses/<estudado>-<site>` para a camada. Recomendação: manter.
- Q-06. *Lista fixa de idiomas no banco:* trocar o CHECK por regra aberta (`language_app_key ~ '^[a-z]+$'`) numa migration única. Recomendação: sim, uma vez, em E6; até lá, `portugues` já passa.

**Pronto quando**
- Documento de contratos aprovado pela dona e commitado em `docs/i18n/`.
- Inventário versionado (`docs/i18n/inventario-pontos-de-variacao.md`) com cada ponto classificado.
- Q-01 a Q-06 respondidas ou com recomendação aceita como provisória, registradas.

---

### E1. Registro de idiomas e cursos (M)

**Objetivo.** Existir um único lugar onde se declara o que é um idioma estudado e um curso; eliminar mapas fixos de fr/zh no código compartilhado; preparar a entrada do `pt` sem ainda exibi-lo.

**Subtarefas**
1. Criar `languages/registry.js` com `fr`, `zh` e `pt` (este último com `enabled:false`). Campos: `id` (URL), `appKey`, nomes (por idioma do site), bandeira, voz TTS, locale, ícone, `family`, `hasLevelTest`, idiomas de site permitidos.
2. Substituir os mapas fixos (seção 4) por leituras do registro: `STUDY_LANG_FOR_APP_KEY`, `APP_KEY_TO_LANG_ID`, `PUBLIC_DECK_LANG_FOLDERS`, rótulos de direção, nacionalidade, pares de campos da trilha, opções de idioma do editor de campos.
3. Derivar `languages/index.js` (lista exibida na tela de escolha) do registro; manter a API atual para o que já consome.
4. Trava de idioma do site por idioma estudado (Q-04): ao entrar em `/pt`, o seletor oferece só os idiomas permitidos; texto ausente no catálogo vira erro de teste, não fallback silencioso.
5. Lint: teste que falha se aparecer `'frances'`, `'mandarim'`, `'fr'`, `'zh'` como literal no `shared/` fora do registro e de listas de exceção declaradas.
6. Testes unitários do registro e regressão completa.

**Agentes.** `Plan`/`plan-reviewer` (plano), `code-refactor-master` (2), `principal-engineer` (revisão), `regressao` (gate), skill `teste-navegador` (UI).

**Problemas esperados**
- R-03. Literais `'fr'`/`'zh'` espalhados em `shared/` com significados diferentes (idioma de campo de cartão x pasta x chave). *Solução:* o registro expõe funções com nome do significado (`studyLangOf(appKey)`, `folderOf(appKey)`), não um mapa genérico.
- R-04. Código antigo lê as listas por nome global. *Solução:* manter os nomes antigos como cópias derivadas do registro (somente leitura) até a E4 terminar; remover depois.
- R-05. Cache do service worker serve arquivo velho no meio da troca. *Solução:* versionar o `CACHE_NAME` junto com a mudança e testar no navegador com cache.

**Decisões**
- Q-07. *Onde fica o código de família (`family`)?* Recomendação: campo textual no registro, os módulos de família só são criados na E4/E5.

**Pronto quando**
- Nenhum literal de idioma fora do registro em `shared/` (V-02, comando de verificação na seção 12).
- `languages/index.js` e a tela de escolha funcionam como antes, com o `pt` oculto.
- Regressão fr/zh igual à de antes (números iguais ou melhores), registrada.

---

### E2. Separar conteúdo-base da camada do curso (G)

**Objetivo.** O texto em português deixa de ser a base embutida em `content.js` e passa a ser a camada do curso `*@pt-BR`, igual ao inglês. A base fica só com o idioma estudado. Visualmente nada muda.

**Subtarefas**
1. Definir o carregador de camada de curso (substitui/estende `shared/content-i18n.js`): aceita traduzir, acrescentar e substituir campos (D-04).
2. Extrair de `fr/content.js` e `zh/content.js` tudo que é língua de origem para `courses/fr-pt-BR/` e `courses/zh-pt-BR/`; deixar na base só o idioma estudado, ids e estrutura.
3. Mover o inglês atual (`content.en.js`) para `courses/fr-en/` e `courses/zh-en/`, marcados como `beta` (Q-03).
4. Script de verificação de camada: lista, por curso, campos obrigatórios ausentes; usado como critério de publicação.
5. Ajustar consumidores: trilha, revisão (`unitTitle`), Desafios, checkpoint, cartões da trilha.
6. Teste de equivalência: para cada unidade, o objeto resultante no curso `*@pt-BR` e `*@en` atual é **igual** ao de antes (comparação por hash por unidade).

**Agentes.** `refactor-planner` (plano), `code-refactor-master` (2, 3, 5), `revisor-conteudo` (amostra de unidades para garantir que nada se perdeu), `principal-engineer` (revisão), `regressao`.

**Problemas esperados**
- R-06. Texto de língua de origem misturado no meio de campos do idioma estudado (ex.: notas de gramática que citam exemplos em francês). *Solução:* campos compostos viram dois campos (exemplo na base, explicação na camada) com mesma chave; casos duros listados à parte e resolvidos um a um.
- R-07. Ids e índices usados como chave nas camadas (`vocab:{"8":...}`) quebram quando a base muda. *Solução:* camada referencia por id estável de item, não por índice. *Divergência prevista:* a E2 migra o formato por índice atual para ids estáveis só onde houver risco real; o resto fica por índice com teste de consistência até a E9.
- R-08. Peso de carregar duas camadas. *Solução:* carregar base e camada da unidade sob demanda.
- R-09. Progresso e cartões já salvos referenciam textos por conteúdo. *Solução:* o hash de equivalência prova que o conteúdo resolvido não mudou; ids de cartão não mudam.

**Decisões**
- Q-08. *Chave de referência da camada:* id estável por item (recomendado) ou índice. Recomendação: id estável, gerado pelo script uma vez e guardado na base.
- Q-09. *O que é "obrigatório" na camada para publicar?* Recomendação inicial: título, meta, tradução de todo item, diálogo traduzido, e pelo menos a nota de realidade/cultural onde a base marcar que existe (a base declara o "lugar" da nota; o curso preenche).

**Pronto quando**
- Hash de equivalência igual em todas as unidades fr e zh, nos cursos `pt-BR` e `en`.
- `content.js` da base sem texto de língua de origem (V-05: busca por campos de tradução retorna zero).
- Script de camada reportando 100% no `pt-BR` e a lista de lacunas conhecida no `en` (`beta`).
- Regressão fr/zh igual.

---

### E3. Progresso por curso e dados da conta (G)

**Objetivo.** Cada curso tem progresso próprio sem migrar as contas existentes; o que é da conta (streak, ranking, conquistas) sai do bloco de curso.

**Subtarefas**
1. Implementar `courseStorageKey(courseId)` consultando `_meta.courses`; ligar `shared/auth.js` (3 pontos de `APP_KEY`) a ela.
2. Registro `_meta.courses` e `_meta.currentCourse`, gravado com o merge seguro já existente.
3. Streak/`lastStudyDay`/`activityLog` por conta: criar bloco de conta, migrar com cálculo pela união dos `activityLog` (conforme a auditoria), com ensaio em cópia antes.
4. XP por curso (já é o formato atual) e ranking somando a aba "Todos".
5. Conquistas: classificar cada uma em "da conta" ou "do curso"; migrar `earned_badges` se preciso.
6. Troca de curso na interface (seletor de idioma do site e de idioma estudado) coerente com D-01, com aviso claro de que "este curso tem progresso próprio".
7. Convidado: corrigir o texto do portão (hoje afirma salvar no navegador, o que o código não faz).
8. Testes de integração com contas fictícias, inclusive uma conta antiga sem `_meta.courses`.

**Agentes.** `principal-engineer` (modelo de dados), skill `migration-supabase`, `code-architecture-reviewer`, `regressao`, skill `teste-navegador`.

**Problemas esperados**
- R-10. Corrida ao gravar `_meta` junto com o salvar do progresso (já registrada no roadmap). *Solução:* `_meta` só passa por `mergeProgressMeta`, nunca por `serializeState`; teste de concorrência.
- R-11. Perda de streak na migração por conta. *Solução:* calcular em cópia, comparar com o valor atual de todas as contas, só aplicar se a diferença for zero; migração em produção só com autorização.
- R-12. Guard-rail de progresso monotônico (`xp` não pode diminuir) falha ao trocar de bloco. *Solução:* o guard compara dentro do mesmo bloco de curso, como já ocorre.
- R-13. Tamanho da linha de `progress` cresce por curso. *Solução:* medir com 3 cursos; se passar de um limite combinado, dividir o armazenamento (decisão futura, não bloqueante).

**Decisões**
- Q-10. *Quais conquistas são da conta?* Recomendação: de sequência, de amizade e de perfil são da conta; de conteúdo (unidade concluída, ditados) são do curso.
- Q-11. *Cartões próprios (`own_flashcards`) pertencem ao idioma estudado ou ao curso?* Recomendação: ao idioma estudado (o cartão é do aluno, não depende da língua de origem), com o campo de tradução marcando a língua em que foi escrito.
- Q-12. *Decks de curso (Course Decks) pertencem a qual dos dois?* Recomendação: estrutura por idioma estudado (unidades iguais), títulos resolvidos pela camada do curso em tempo de exibição, não gravados em português no banco.

**Pronto quando**
- Conta antiga abre `frances@pt-BR` e `mandarim@pt-BR` com progresso idêntico ao anterior (V-06).
- Conta nova de teste faz um curso `@en` e o progresso fica em chave própria.
- Streak calculado igual ao anterior em todas as contas do ensaio.
- Testes de concorrência de `_meta` verdes.

---

### E4. Extração do núcleo compartilhado do código (GG)

**Objetivo.** Reduzir a duplicação entre `fr/app.js` e `zh/app.js` movendo o que é comum para `shared/core/` e `shared/families/`, sem reescrever tudo de uma vez e sem regressão.

**Subtarefas** (cada uma é um passo com gate próprio; ordem do menos arriscado ao mais arriscado)
1. Levantamento por função (`Explore` + script): classificar as 457 funções do `fr` e 287 do `zh` em idêntica, quase igual, divergente, só de um idioma; relatório versionado.
2. Plano de extração por área (`refactor-planner`): estado/persistência, Revisão e Decks (já em `shared/`), exercícios de lição, mapa da trilha, Desafios/Ditados, checkpoint, conjugação.
3. Extrair funções idênticas (17%) primeiro; teste por função.
4. Extrair as quase iguais (24%) com ponto de extensão declarado (parâmetros ou hooks no registro), ex.: nome do falante, função de fala, teclado.
5. Tratar as divergentes (14%) uma a uma: ou unificar, ou assumir que são regra da família/idioma e ir para E5.
6. Peças só do francês (45%) classificadas: conjugação e Desafios viram **módulos opcionais por idioma** (o registro declara quais módulos o idioma tem).
7. Reduzir `index.html` por idioma a uma casca (`<idioma>/index.html` fino) com o corpo compartilhado gerado ou carregado.
8. A cada passo: regressão fr/zh completa, comparação de capturas de tela claro/escuro (skill `teste-navegador`), registro.

**Agentes.** `Explore`, `refactor-planner`, `code-refactor-master` (execução), `principal-engineer` e `code-architecture-reviewer` (fim de cada área), `regressao` (cada passo), `plan-reviewer` (plano).

**Problemas esperados**
- R-14. Funções com o mesmo nome e comportamento sutilmente diferente (ex.: `renderNormalCard`, 50% parecidas). *Solução:* não unificar por nome; ler, escrever teste de comportamento nos dois idiomas, só então unificar.
- R-15. Variáveis globais compartilhadas entre arquivos (estilo `<script>` global) tornam a extração frágil. *Solução:* introduzir um namespace do núcleo e migrar por área; manter nomes antigos como alias até o fim.
- R-16. Regressão visual sutil (CSS por idioma, tokens de cor). *Solução:* os 4 cenários obrigatórios (fr/zh × claro/escuro) por mudança de UI, conforme regra do projeto.
- R-17. Outras conversas editam `fr/app.js` e `zh/app.js` em paralelo. *Solução:* extrair em PRs pequenos, mergear a `main` com frequência, em conflito manter os dois lados; avisar a dona antes de uma área grande.
- R-18. A etapa nunca "termina" (perfeccionismo). *Solução:* critério de pronto objetivo (abaixo); o que sobrar vira lista de débito, não bloqueia o `/pt`.

**Decisões**
- Q-13. *Estratégia: extração incremental (recomendada) ou reescrita do núcleo.* Recomendação: incremental. *Divergência prevista:* para o `/pt` poderei usar o núcleo **já extraído até o ponto da E4 que estiver pronto**, completando o restante depois; a E7 não espera a E4 inteira, espera só as áreas que o `/pt` usa (trilha, revisão, exercícios básicos).
- Q-14. *Formato do módulo compartilhado:* continuar com `<script>` globais (como hoje) ou passar a módulos ES? Recomendação: manter `<script>` globais com namespace; módulos ES só com decisão de build, pois o site é estático sem build e não vale introduzi-lo agora.

**Pronto quando**
- Relatório de classificação por função versionado e atualizado (V-07).
- Metas mensuráveis: duplicação entre `fr/app.js` e `zh/app.js` cai para o limite combinado (sugestão: abaixo de 30% do tamanho atual das duas); `index.html` por idioma abaixo de 800 linhas.
- Regressão fr/zh e capturas dos 4 cenários iguais às anteriores em cada área extraída.
- Lista de débito do que não foi extraído, com motivo.

---

### E5. Regras que dependem de idioma (família e língua de origem) (G)

**Objetivo.** Isolar e entregar as regras que **não** devem ser unificadas: o que muda por família de idioma estudado e o que muda por língua de origem (idioma do site).

**Subtarefas**
1. Família latina: acentos e cedilha, teclado de acentos, normalização, "Acentuação", Ditado (marcação, tolerância a acento, números), pronúncia/TTS (regras de texto falado por idioma, já existem para fr e pt).
2. Família de caracteres: tons e pinyin (e preparo para furigana), teclado de tom, traços, histórias.
3. Português como idioma estudado: acentuação, cedilha, til, crase, contrações (`de+a=da`, `em+o=no`), artigos e gêneros, plural, nasalização; regra de "texto falado" do português já existe, estender o que faltar.
4. Língua de origem do site: **comparador de "Ouça e traduza" por língua de origem** (hoje é gramática do português, sem testes): inglês primeiro; negação, número, `mustInclude`/`mustExclude`, concordância própria do inglês; suíte de teste por língua.
5. Instruções de áudio dos ditados na língua do site (mp3 de introdução) via Actions.
6. Catálogo de erros típicos por par (insumo para a E9): armadilhas de falantes de inglês no português; de português no francês; etc.
7. Contratos de teste para cada regra (casos felizes, limites, casos reais).

**Agentes.** `web-research-specialist` (6, normas e erros típicos), `revisor-conteudo` (3, 4, 6), `code-refactor-master`, `regressao`, skills `audio-tts` e `teste-navegador`.

**Problemas esperados**
- R-19. Regra copiada do francês que parece servir ao português mas não serve (ex.: `œ`, `ç`, hífen). *Solução:* cada regra nova nasce com testes escritos a partir de exemplos reais do idioma, não adaptados do francês.
- R-20. Comparador em inglês aceita erro de sentido (negação). *Solução:* testes adversariais específicos de sentido (já feitos para o português; replicar).
- R-21. Voz TTS lê mal um trecho (siglas, números, nomes). *Solução:* regras de texto falado por idioma, com laboratório de variantes para decidir ouvindo, como foi feito para o francês.

**Decisões**
- Q-15. *O japonês e outros entram agora?* Recomendação: não; a E5 prepara os pontos de extensão (furigana, kanji) mas só entrega fr, zh, pt.
- Q-16. *Regras de pronúncia em português: seguir `docs/pt-tts-proposta.md`/`pt-tts-revisao.md` (já aprovadas).* Recomendação: sim, sem reabrir.

**Pronto quando**
- Cada regra declarada no ponto de extensão de sua família/idioma/língua de origem, com teste (V-08).
- Suíte do comparador em inglês verde com casos adversariais.
- Nenhuma regra de família duplicada dentro de `fr/` ou `pt/`.

---

### E6. Servidor: notificações, painel da professora, bancos e funções (M)

**Objetivo.** O servidor entender cursos e o idioma `pt`, sem quebrar o que existe.

**Subtarefas**
1. Migration única trocando as listas fixas de `language_app_key` por regra aberta (Q-06), com ensaio no Staging.
2. `notification_templates.ui_language` (hoje escolhe por idioma estudado): modelos para `portugues` e para o idioma do site; `notification-cron` com novo deploy.
3. Funções `059` e `070` (painel do aluno) e `037` (perfil público): ler o curso ativo e cursos novos (hoje têm listas fixas).
4. `ensure_course_decks` com a lista de unidades do idioma novo; títulos por camada do curso (Q-12).
5. E-mails de reengajamento no idioma do site (hoje só existem os de `user_inactive_*` em português).
6. Testes SQL com ROLLBACK, simulando contas e vínculos.

**Agentes.** skill `migration-supabase`, `principal-engineer` (revisão de RLS/funções), `regressao`; `auto-error-resolver` se a Edge Function falhar na compilação.

**Problemas esperados**
- R-22. Edge Function só muda em produção após deploy (regra do projeto). *Solução:* o relatório da etapa registra deploy feito ou pendente, nunca implícito.
- R-23. `DROP` não passa pela ferramenta de migrations. *Solução:* arquivos para o SQL Editor da dona, conforme a skill.
- R-24. Texto de notificação em outra língua com tom errado. *Solução:* mesma regra D-04: modelos escritos para o público, revisados com confiança.

**Decisões**
- Q-17. *Notificações do curso em inglês começam em quais categorias?* Recomendação: lembrete de estudo e sequência primeiro; ranking e missões depois.

**Pronto quando**
- Migration aplicada no Staging e testada; registro de aplicação em produção só com autorização (V-09).
- Painel da professora mostra aluno com vínculo `portugues` sem erro.
- Modelos de notificação existem para `portugues` e `en`.

---

### E7. O site `/pt` (infraestrutura e unidade-piloto) (G)

**Objetivo.** O `/pt` abre, funciona de ponta a ponta com o site em inglês, e roda uma **unidade-piloto**; o conteúdo completo do nível inicial fica para a E9.

**Subtarefas**
1. Gerar a estrutura pelo gabarito (mesmo que o script da E8 seja só rascunho: o `/pt` é o primeiro usuário real do núcleo).
2. Registro: `pt` habilitado, bandeira do Brasil, `appKey: portugues`, voz `pt-BR`, família latina, idiomas de site permitidos (Q-04: `en`).
3. Base de conteúdo `pt` com o esqueleto de níveis/módulos e uma unidade-piloto completa (vocabulário, frases, diálogo, exercícios).
4. Curso `portugues@en`: camada da unidade-piloto escrita para falantes de inglês (D-04), com notas de realidade e culturais do Brasil.
5. Áudio da unidade-piloto: geração via Actions (skill `audio-tts`), voz `pt-BR`.
6. Desafios da unidade-piloto: aplicar a regra de decisão por categoria (skill `criar-desafios`).
7. Service worker, manifest, ícones, tela de escolha de idioma, rota `/pt`.
8. Perfil, Decks, Revisão, cartões próprios, Anki, painel da professora funcionando com `portugues`.
9. Teste ponta a ponta no navegador (conta nova, conta antiga, convidado), claro/escuro, celular.

**Agentes.** `Plan`, `code-refactor-master`, `revisor-conteudo` (camada da unidade-piloto), `regressao`, `code-architecture-reviewer`, skills `teste-navegador`, `audio-tts`, `criar-desafios`, `notas-de-realidade`.

**Problemas esperados**
- R-25. O `/pt` revela pontos que ainda assumem fr/zh. *Solução:* cada achado vira correção no núcleo (não no `pt/`); o `pt/` não pode ter remendo local.
- R-26. Aluno vê português onde só devia ver inglês. *Solução:* o catálogo de interface do `/pt` roda em modo estrito (chave ausente = erro de teste); varredura de texto em português no DOM do `/pt` como teste.
- R-27. Marca/identidade (nome do site no `/pt`, ex.: "Português com Prof. Brune"). *Solução:* campo do registro por idioma do site; decisão Q-18.

**Decisões**
- Q-18. *Nome de marca por curso.* Recomendação: "Português com Prof. Brune" no site em português e equivalente em inglês ("Portuguese with Prof. Brune"), vindo do registro.
- Q-19. *Quantas unidades no piloto?* Recomendação: 1 unidade completa (a primeira) + esqueleto; suficiente para testar tudo sem custo alto de autoria.

**Pronto quando**
- `/pt` abre, aluno em inglês completa a unidade-piloto, revisa cartões, usa Decks e Desafios do piloto (V-10).
- Zero texto em português na interface do `/pt` com o site em inglês (teste automatizado).
- Regressão fr/zh igual.
- Nenhum código específico do `pt` fora de `pt/`, do registro e das regras próprias.

---

### E8. Gabarito e skill para idiomas e cursos futuros (M)

**Objetivo.** Transformar o aprendizado do `/pt` em processo repetível: criar `it`, `es`, `ja` ou um curso novo (ex.: `fr-es`) com checklist e script, sem reaprender a arquitetura.

**Subtarefas**
1. Script `scripts/novo-idioma.js` e `scripts/novo-curso.js` (nomes provisórios) que geram estrutura, registro, stubs de teste, checklist e relatório de lacunas.
2. Skill `novo-idioma-ou-curso` com o passo a passo, decisões obrigatórias, perguntas a fazer à dona, lista de armadilhas.
3. Documentar o "contrato de extensão": quais funções cada idioma/família deve fornecer (fala, teclado, normalização, comparador).
4. Checklist de idioma novo (acentos/escrita, TTS, voz, banco, notificações, Desafios por categoria, conteúdo, camada por curso, revisão).
5. Teste de gabarito: gerar um idioma fictício em diretório temporário e rodar os testes de contrato.

**Agentes.** `documentation-architect`, `principal-engineer` (revisão do contrato), `regressao`.

**Problemas esperados**
- R-28. O gabarito envelhece quando o núcleo muda. *Solução:* ele **gera** a partir de templates versionados e o teste de gabarito roda na regressão geral; se o núcleo mudar e o gabarito quebrar, a regressão falha.
- R-29. O script presume coisas do `pt`. *Solução:* teste com idioma fictício de família diferente (ex.: `ja` de mentira) para provar que não presume latim.

**Decisões**
- Q-20. *Escopo do gabarito: só estrutura ou também conteúdo de exemplo?* Recomendação: estrutura mais uma unidade-fantasma de exemplo para os testes.

**Pronto quando**
- Um idioma fictício é gerado e passa nos testes de contrato (V-11).
- A skill existe e está listada em `CLAUDE.md` (índice).

---

### E9. Autoria das camadas dos cursos (GG, projeto contínuo)

**Objetivo.** Escrever, para cada curso, a camada pedagógica **feita para falantes daquela língua** (D-04). É o trabalho mais caro e o mais importante.

**Subtarefas**
1. Nível inicial do `/pt` (`portugues@en`): tradução, notas, armadilhas de pronúncia (ênfase em sons que o inglês não tem: nasais, `lh`, `nh`, `r` forte), comparações (falsos cognatos), notas culturais do Brasil, explicações de gramática pensadas para quem fala inglês.
2. Reescrever os cursos em inglês de francês e mandarim: sair de "tradução" para "escrita para falantes de inglês" (ex.: gênero e nasais explicados a partir do inglês; tons do mandarim comparados à entonação do inglês).
3. Para cada curso: Desafios por categoria seguindo `shared/challenge-policy.js`; ditados; traduções de referência de "Ouça e traduza".
4. Fluxo de revisão: cada item entra `needs_review` com nível de confiança; a dona aprova; ficam os links de consulta usados.
5. Painel de lacunas por curso (script da E2) como termômetro de progresso.
6. Publicação do curso: `rascunho` → `beta` → `publicado` (seção 5.5), cada passo com autorização da dona.

**Agentes.** `revisor-conteudo` (todas as camadas), `web-research-specialist` (normas, erros típicos), `Explore` (lacunas), skills `notas-de-realidade`, `criar-desafios`, `audio-tts`.

**Problemas esperados**
- R-30. Custo e tempo de autoria. *Solução:* publicar por unidade/módulo; o curso `beta` mostra o que já está pronto; priorizar módulos pela ordem de uso.
- R-31. Qualidade irregular (parece tradução). *Solução:* cada nota carrega a pergunta "isto existe porque este aluno vê isto na tela, na língua dele?"; `revisor-conteudo` reprova nota que só traduz.
- R-32. Quem revisa inglês nativo? *Solução:* a dona decide; enquanto isso, confiança "média" no máximo para texto sem revisão de falante nativo; nada vai a `publicado` sem a aprovação dela (D-10).
- R-33. Fadiga de decisão da dona. *Solução:* lotes pequenos, relatório curto por unidade, lista "revisar só isto".

**Decisões**
- Q-21. *Ordem de autoria:* recomendação: primeiro `portugues@en` (curso novo, sem herança), depois `frances@en`, por último `mandarim@en`.
- Q-22. *Quem escreve notas "feitas para falantes de inglês"?* Decisão dela; recomendação: rascunho por mim com pesquisa, revisão de falante nativo de inglês que seja também fluente em português, antes de `publicado`.

**Pronto quando** (por curso)
- Painel de lacunas 100% nos campos obrigatórios (V-12).
- Todas as notas com confiança registrada e aprovação da dona.
- Áudio e Desafios do curso decididos por categoria.
- Curso em `publicado`.

---

### E10. Verificação final e fechamento (M)

**Objetivo.** Provar, item a item, que a arquitetura foi seguida, e deixar o projeto reutilizável.

**Subtarefas**
1. Rodar a lista de verificação (seção 12) com evidências (comando, saída, link para arquivo).
2. Regressão completa (todas as suítes) com números reais, separando falhas pré-existentes das novas.
3. Revisão independente (`code-architecture-reviewer` e `principal-engineer`) contra este documento.
4. Atualizar este documento com o que foi feito diferente do previsto (as "Divergências previstas" confirmadas ou revertidas).
5. Registro final (skill `registrar-entrega`), atualização do `CLAUDE.md` (linhas curtas), arquivo de histórico em `docs/historico/`.
6. Entregar o `.md` final e o pacote de portabilidade (seção 13).

**Agentes.** `documentation-architect`, `code-architecture-reviewer`, `principal-engineer`, `regressao`.

**Pronto quando**
- Todos os V-xx marcados com evidência; qualquer exceção listada com motivo e aprovação.
- A dona aprovou o fechamento.

---

## 8. Registro de decisões em aberto (resumo)

| ID | Etapa | Pergunta | Recomendação |
|---|---|---|---|
| Q-01 | E0 | Onde mora o registro de cursos | `languages/registry.js` + `_meta.courses` |
| Q-02 | E0 | Formato da camada do curso | Um arquivo por unidade, sob demanda |
| Q-03 | E0/E2 | Falta de texto na camada | Só publica completo; `beta` mostra base com aviso; nunca fallback de outro curso |
| Q-04 | E0 | Idiomas de site por idioma estudado | Todos, exceto o próprio idioma estudado |
| Q-05 | E0 | Nomes de pasta | Idioma estudado + `courses/<est>-<site>` |
| Q-06 | E6 | Lista fixa de idiomas no banco | Regra aberta, uma migration |
| Q-07 | E1 | Campo `family` | No registro; módulos nas etapas seguintes |
| Q-08 | E2 | Chave de referência da camada | Id estável |
| Q-09 | E2 | Campos obrigatórios | Título, meta, tradução, diálogo, notas marcadas pela base |
| Q-10 | E3 | Conquistas da conta x do curso | Sequência, amizade, perfil = conta; conteúdo = curso |
| Q-11 | E3 | Cartões próprios | Do idioma estudado |
| Q-12 | E3/E6 | Course Decks | Estrutura por idioma estudado, título pela camada |
| Q-13 | E4 | Extração incremental ou reescrita | Incremental |
| Q-14 | E4 | `<script>` globais ou módulos ES | Globais com namespace |
| Q-15 | E5 | Japonês e outros agora | Não; só pontos de extensão |
| Q-16 | E5 | Regras de pronúncia do português | Seguir propostas já aprovadas |
| Q-17 | E6 | Notificações do inglês | Lembrete e sequência primeiro |
| Q-18 | E7 | Nome de marca no `/pt` | "Português com Prof. Brune" / "Portuguese with Prof. Brune" |
| Q-19 | E7 | Unidades no piloto | Uma completa |
| Q-20 | E8 | Gabarito só estrutura? | Estrutura + unidade-fantasma de exemplo |
| Q-21 | E9 | Ordem de autoria | `portugues@en`, `frances@en`, `mandarim@en` |
| Q-22 | E9 | Quem escreve/revisa notas em inglês | Rascunho meu + revisão de nativo antes de publicar |

---

## 9. Riscos transversais e respostas

- RT-1. **Regressão silenciosa nos cursos atuais.** Resposta: cada etapa fecha com regressão fr/zh e, em UI, os 4 cenários (claro/escuro × fr/zh); hash de equivalência de conteúdo na E2.
- RT-2. **Trabalho paralelo de outras conversas na mesma base.** Resposta: PRs pequenos, merge frequente da `main`, em conflito manter os dois lados; avisar a dona antes de mexer em área grande.
- RT-3. **Escopo infinito.** Resposta: critério de pronto objetivo por etapa; o que sobrar vira débito listado; o `/pt` não espera E4 inteira (Q-13).
- RT-4. **Dados de produção.** Resposta: nada de migração/backfill/deploy sem autorização (D-10); ensaio em cópia ou Staging; relatório "antes e depois" por hash.
- RT-5. **Custo de serviços externos** (TTS, tradução). Resposta: cotas por conta, orçamento com alerta, regeneração só do afetado; custo estimado registrado no relatório da etapa.
- RT-6. **Qualidade pedagógica irregular.** Resposta: D-04 como critério de pronto; `revisor-conteudo` reprova "só tradução"; nada `publicado` sem aprovação.
- RT-7. **Fadiga de decisões da dona.** Resposta: cada Q tem recomendação; lotes pequenos; relatório de decisões curto no início de cada etapa.
- RT-8. **Dependência de uma só pessoa para revisar línguas.** Resposta: confiança explícita por item; enquanto sem revisor nativo, confiança máxima "média".

---

## 10. Divergências previstas (onde posso fugir da estratégia sugerida)

| # | Sugestão do documento | Estratégia que provavelmente seguirei | Por quê |
|---|---|---|---|
| Dv-1 | E4 completa antes do `/pt` | `/pt` usa o núcleo já extraído nas áreas que ele precisa; o resto da E4 segue em paralelo | Evita parar o produto por meses; os problemas do `/pt` orientam a extração |
| Dv-2 | Camada por id estável em tudo (Q-08) | Migrar para id estável só onde houver risco; índice com teste de consistência no resto até a E9 | Reduz custo e risco na E2 |
| Dv-3 | Curso em inglês `beta` com aviso (Q-03) | Na E2 mantenho o texto traduzido atual sem aviso novo; o aviso entra quando a E9 começar a substituir | Não piorar a experiência atual no meio da refatoração |
| Dv-4 | Migração do CHECK de idioma só na E6 | `portugues` já passa; só crio a migration quando o primeiro idioma novo além de `pt` for implementado, se não houver motivo antes | Menos migrations em produção sem necessidade |
| Dv-5 | Script de gabarito na E8 | Um rascunho do script nasce já na E7, porque o `/pt` é o primeiro usuário | Reduz retrabalho |
| Dv-6 | Streak por conta (E3) em produção na mesma etapa | Prepara e ensaia na E3; aplicação em produção só quando a dona autorizar, possivelmente separada do resto da etapa | Mudança de dado em produção exige autorização própria |

---

## 11. Problemas já identificados e soluções (lista consolidada)

| Problema | Onde aparece | Solução sugerida | Estratégia real, se diferente |
|---|---|---|---|
| Duas bases de código divergentes (fr/zh) | `app.js`, `index.html` | Extração incremental por áreas, com teste por função | Igual (Dv-1 sobre o ritmo) |
| Mapas fixos fr/zh em `shared/` | seção 4 | Registro único, lint de literais | Igual |
| Português embutido como base de conteúdo | `content.js` | Camada de curso `*@pt-BR` (E2) | Igual |
| Camada em inglês é tradução, não autoria | `content.en.js` | Reescrita na E9; marca `beta` | Dv-3 |
| Fallback de interface cai no português | `t()` | Modo estrito no `/pt`, teste de varredura | Igual |
| Comparador de "Ouça e traduza" só para português | Desafios | Comparador por língua de origem com testes | Igual |
| `back_trans`/`lang:'pt-BR'` fixo | cartões, trilha | Língua da tradução vem do curso/registro | Igual |
| Títulos de Course Deck em português no banco | `decks` | Título resolvido pela camada; coluna vira apelido técnico | Igual |
| Lista fixa de idiomas no CHECK | banco | Regra aberta | Dv-4 |
| Notificações só para fr/zh | cron | Modelos por idioma do site e `portugues` | Igual |
| Texto do portão diz salvar o convidado no navegador | `index.html` | Corrigir o texto | Igual |
| Streak por idioma, não por conta | `serializeState` | Bloco de conta, migração ensaiada | Dv-6 |
| Peso de `progress` por curso | `auth.js` | Medir; dividir só se necessário | Igual |
| Duplicação da casca HTML por idioma | `index.html` | Casca fina compartilhada | Igual |
| Gabarito que envelhece | E8 | Gera de templates versionados, teste na regressão | Igual |

---

## 12. Lista de verificação final (E10)

Cada item precisa de evidência (comando e saída, ou arquivo). Marque quando conferido.

- [ ] V-01. `languages/registry.js` existe e declara `fr`, `zh`, `pt` com os campos do contrato.
- [ ] V-02. Nenhum literal `'frances'`, `'mandarim'`, `'fr'`, `'zh'` em `shared/` fora do registro e das exceções declaradas. Comando: `grep -rnE "'frances'|'mandarim'|\"frances\"|\"mandarim\"" shared/ --include=*.js` (resultado esperado: só o registro e a lista de exceção).
- [ ] V-03. URLs `/fr`, `/zh`, `/pt` funcionam; `/pt` usa a bandeira do Brasil e a voz `pt-BR` (D-02, D-03).
- [ ] V-04. Idiomas de site oferecidos por idioma estudado seguem Q-04; o `/pt` não oferece português do Brasil.
- [ ] V-05. `fr/content.js`, `zh/content.js` e a base do `pt` não têm texto de língua de origem; a camada vive em `courses/`.
- [ ] V-06. Conta antiga abre `frances@pt-BR` e `mandarim@pt-BR` com progresso idêntico ao de antes (relatório de hash).
- [ ] V-07. Relatório de classificação por função (idêntica, quase igual, divergente, só de um idioma) existe e a duplicação caiu para a meta combinada.
- [ ] V-08. Cada regra dependente de idioma está num ponto de extensão com teste (família, idioma, língua de origem).
- [ ] V-09. Migrations aplicadas e registradas (Staging e, com autorização, produção); funções e Edge Functions com deploy confirmado.
- [ ] V-10. Teste ponta a ponta do `/pt` com o site em inglês: conta nova, conta antiga, convidado; sem texto em português na interface.
- [ ] V-11. Gabarito gera um idioma fictício que passa nos testes de contrato.
- [ ] V-12. Painel de lacunas de cada curso `publicado` em 100% dos campos obrigatórios.
- [ ] V-13. Toda nota/explicação de curso novo carrega nível de confiança e aprovação da dona (D-04, P8).
- [ ] V-14. Nenhuma nota nova é apenas tradução de outra língua de origem (amostra revisada por `revisor-conteudo`).
- [ ] V-15. Regressão fr/zh completa com números reais; falhas pré-existentes separadas das novas.
- [ ] V-16. Os 4 cenários visuais (fr/zh × claro/escuro) conferidos nas áreas de UI alteradas.
- [ ] V-17. Nenhuma mudança em produção sem autorização registrada (D-10).
- [ ] V-18. Idioma do site nunca é Premium (D-05); nada na arquitetura o torna.
- [ ] V-19. `CLAUDE.md` com linhas curtas atualizadas; relatório em `docs/historico/`; este documento atualizado com as divergências reais.
- [ ] V-20. Cada decisão Q-xx está registrada como respondida (ou provisória) e as Dv-x confirmadas ou revertidas.

---

## 13. Portabilidade: usar este documento em outro projeto

Para reaproveitar em outro projeto de múltiplos idiomas, mantenha as seções 2 (princípios), 5 (arquitetura-alvo), 6 (etapas), 7 (etapas em detalhe, trocando nomes de arquivos), 9 (riscos), 11 (problemas), 12 (verificação) e 14 (como pedir). Substitua o conteúdo do projeto atual: seção 3 (decisões), seção 4 (estado de partida) e os caminhos. As perguntas mais úteis a levar:

1. O que varia por idioma estudado e o que varia por idioma do ensino? Estão separados no dado?
2. Há fallback silencioso entre línguas de origem? Se há, é aceitável pedagogicamente?
3. Quem escreve a camada do curso, quem revisa, e como se registra a confiança?
4. Quanto do código é cópia entre idiomas? O que é comum, o que é de família, o que é do idioma?
5. Um idioma novo exige quantos arquivos novos e quantos `if` novos? A meta é zero `if` novo.

---

## 14. Como pedir cada etapa (modelo de instrução)

Para iniciar uma etapa, a dona (ou outro projeto) pode usar:

> Execute a etapa **E<n>** de `docs/i18n/arquitetura-multi-idioma-cursos.md`. Comece pelo plano detalhado (agente de planejamento) e me mostre antes de codar. Responda as decisões Q da etapa usando as recomendações, exceto: <exceções>. Ao terminar, rode a regressão, registre o relatório pela skill `registrar-entrega`, marque os V-xx atendidos e pare. Não avance de etapa sem minha autorização.

---

## 15. Histórico deste documento

- 2026-10-08: versão inicial, a partir das decisões D-01 a D-11.
