# Histórico: Design System do painel (Pico CSS)

Decisão e levantamento: `docs/levantamento-design-system-painel.md` (seções 6 a 8). Prévia comparativa das seis
alternativas: `docs/design-system-previa/` (README). Autora autorizou a Fase 1 em 2026-10-12.

## Fase 1: fundação (entregue em 2026-10-12, nenhuma tela alterada)

### O que foi criado
- `shared/painel/vendor/pico.painel.css`: Pico CSS 2.1.1 oficial, sem edição, com todo seletor limitado a `.painel`
  (705 seletores, 0 vazando). Gerado por `scripts/painel-ds/escopar-pico.mjs` (postcss). Licença MIT em `vendor/LICENSE-pico.md`.
- `shared/painel/painel-tokens.css`: tokens `--p-*` que leem os tokens que o site JÁ define (`--seal-red`, `--paper`, `--ink`...) e
  ligam as 101 variáveis de cor do Pico (`--pico-*`). Curso (fr/zh) e tema (claro/escuro) chegam sozinhos. Fonte sempre
  `--font-body` (Nunito); o painel não usa `--font-display`. Única cor nova: `--p-elevado` (3 blocos de tema).
- `shared/painel/painel-componentes.css`: o que o Pico não traz, prefixo `p-`: selo, alerta, abas, avatar, indicador e os
  padrões de página (página, cabeçalho, faixa de resumo, grades, ferramentas, tabela, lista, estado vazio).
- `shared/painel/guia-de-estilo.html` (+ `guia-paletas.css`): catálogo vivo, cada peça renderizada e com o HTML para copiar,
  com troca de curso e tema. Texto fixo em português (documentação de desenvolvimento, não passa por `t()`).
- `tests/painel-ds/` (`run.sh`): escopo, tokens, contraste e navegador.

### Decisões e achados
- **O `$parent-selector` do Pico não isola tudo**: a base (`a`, `h1`, `*`, `:root`, `body`) continua global. Por isso o
  CSS oficial é prefixado por script, em vez de usar a opção de SCSS.
- **Dark do Pico preservado** só para os ícones (setas, checks), nos seletores `:root[data-theme="dark"] .painel` e
  `:root:not([data-theme="light"]) .painel` (padrão do site). As cores vêm dos tokens do site.
- **zh não define `--error-red`** (usa `--grade-again-bg`): `--p-erro: var(--error-red, var(--grade-again-bg))`.
- **Contraste**: texto 4,5:1 e elementos de interface 3:1 nos 4 cenários. Corrigidos no processo: barra de progresso e
  interruptor ligado passaram a usar a marca escura (no francês claro a marca dava 2,2:1 e 2,9:1); borda de campo e
  interruptor desligado usam mistura de linha com tinta suave a 60% (era 1,0 a 1,4:1).
- **Achado fora do escopo**: o site declara Nunito (`--font-body`, `@font-face { src: local('Nunito') }`) mas **nunca a
  carrega da web** (sem `<link>` do Google Fonts nem arquivo `.woff`). Quem não tem Nunito instalada vê a fonte do
  sistema. O painel herda esse comportamento. Decisão pendente da autora (hospedar a fonte no repositório).
- Painel e site dos alunos seguem separados: gamificação (sequência, XP, conquistas) é só do aluno e não entrou no painel.

### Testes (rodados em 2026-10-12, `bash tests/painel-ds/run.sh`)
- escopo 9/9, tokens 87/87, contraste 121/121, navegador 103/103 (fr e zh x claro e escuro x 1280px e 390px, 0 pageerrors).
- Prova principal: com e sem o CSS do painel, elementos FORA de `.painel` ficam idênticos (h1, botão, link, campo, tabela,
  `box-sizing`, corpo, `html`). Verificado por mutação: uma regra solta injetada no Pico reprova escopo e navegador.
- Os testes de tokens falham se a cópia de paletas do guia divergir de `fr/index.html` ou `zh/index.html` (verificado por mutação).
- Validação visual olhada nos 4 cenários e no celular.
- `fr/index.html`, `zh/index.html` e `index.html` não foram tocados (teste confere que não carregam o CSS do painel).

### Passos manuais
Nenhum (sem migration, secret ou deploy de função). O guia ficará acessível em
`/shared/painel/guia-de-estilo.html` quando a `main` for publicada (só dados de exemplo).

### Próximas fases (precisam de autorização)
- **Fase 2**: área da Professora (Alunos, Flashcards, Aulas) já no sistema novo, com a função nova de Flashcards.
- **Fase 3**: Admin refeito numa única entrega, depois de conversar com a autora sobre Analytics, Notificações e Badges.

## Fase 2: auditoria e desenho (2026-10-12, nenhum código de tela alterado)
Auditoria em `docs/fase-2-professora/auditoria.md`, desenho em `docs/fase-2-professora/desenho.html` (+ `antes-*.jpg`).
- Achado: o painel é uma tela só com 10 abas (primeira: Badges); Professora e Admin não são separados; as telas são os `admin-*.js`
  (os `teacher-*.js` só acessam dados). O levantamento dizia "3 telas do lado da professora": corrigido.
- Achado: criar cartão exige ser admin por regra do banco (migration 026). Fora do escopo; vira trabalho quando houver outras professoras.
- Guia de estilo e desenho publicados como Artefato por `scripts/painel-ds/preparar-artefato.mjs` (a visualização de código do app
  não carrega o CSS vizinho e mostra a página quebrada).

## Peças do shadcn e fonte hospedada (2026-10-12, Fase 1 estendida)
- Nunito passou a ser hospedada em `shared/fonts/` (latin e latin-ext, licença OFL); `fr/`, `zh/` e `index.html` trocaram `local('Nunito')` por `<link>` + preload. Resolve o achado acima e muda o visual do site inteiro para quem não tinha a fonte instalada.
- Botões do painel: pílula, peso 800, fundo da marca e texto branco, como as abas do Ranking. Dados da tabela centralizados (primeira coluna à esquerda).
- Peças pedidas pela autora (HTML + CSS + JS simples, sem React): Breadcrumb, Tooltip, Toast, Spinner, Separator, Select, Scroll area, Resizable, Questionnaire, Popover, Pagination, Navigation menu, Native select, Message e Message scroller, Menubar, Label, Field, Item, Input OTP, Input Group, Input, Hover card, Empty, Dropdown menu, KBD, Dialog, Date Picker, Context Menu, Combobox, Collapsible, Bubble, Attachment, Alert Dialog, Alert.
- Regra de situação aprovada: Em dia = estudou nos últimos 3 dias; Atenção = 4 a 6; Parado = 7 ou mais.
- Testes em 2026-10-12: escopo 9/9, tokens 87/87, contraste 127/127, navegador 192/192, interação (`test_ui.js`) 274/274. Contraste: texto branco sobre o azul claro do francês = 3,2:1 (exceção documentada).
- Bugs achados e corrigidos nos testes: spinner do Pico (`aria-busy`) aparecia solto ao lado do anexo em envio; barra de progresso do anexo sem largura (item em flex); clicar no campo já focado não reabria o combobox.

## Fase 2, tela Alunos entregue (2026-10-12, branch `claude/epic-fermat-ulyw5j`, nada publicado)
Autorização da autora: desenho aprovado, botão primário no azul atual (igual ao Ranking, 3,2:1 no francês claro; exceção documentada).
- **Tela nova** (aba Alunos do painel da professora, fr e zh): quadro geral (alerta de parados, 4 indicadores, busca, filtro de curso e de atenção,
  tabela com situação) e ficha do aluno em página própria (trilha, cabeçalho, 4 indicadores, progresso, atividade de 30 dias, fila de revisão,
  cartões criados, últimas atividades, acertos, aulas recentes, troca de idioma quando há progresso em mais de um). Vincular aluno virou janela (só admin),
  remover vínculo usa a confirmação do painel (antes `confirm()` do navegador).
- **Situação (aprovada):** Em dia = estudou nos últimos 3 dias (0 a 3); Atenção = 4 a 6; Parado = 7 ou mais; sem estudo registrado = "Sem estudo" (neutro, não conta
  como parado); consulta que falhou = "—" e aviso (nunca vira "Parado").
- **Sem migration e sem dado novo:** usa as RPCs de hoje (`get_teacher_student_overview`, `get_teacher_student_metrics`), até 5 consultas ao mesmo tempo, cache por vínculo
  na sessão e botão "Atualizar dados". Para turmas grandes (centenas) uma consulta única no banco exigiria migration (decisão futura).
- **Arquivos:** `shared/teacher-students-ui.js` (HTML puro, testável), `shared/admin-students.js` (dados, eventos, diálogos; renderizadores antigos em texto removidos),
  `shared/painel/` (peças novas: `p-atividade`, `p-pilha`, `p-legenda`, `p-pequeno`, `p-so-leitor`, `p-oculta-movel`; no guia: "Atividade e fila"), `fr/index.html` e `zh/index.html`
  (carregam o CSS do painel e `painel-ui.js`; painel da professora em tela cheia, sem Ranking/Status/Missões ao lado; fundo transparente dentro do app).
- **i18n:** 141 chaves novas `students.*` (pt-BR e en, todas com confiança ALTA, traduções simples de interface). Rótulos da linha do tempo (antes fixos em português) agora passam por `t()`.
- **Testes** (rodados em 2026-10-12): `tests/painel-alunos/test_students_ui_unit.js` 61/61 (regra de situação nos limites 3/4/6/7, filtros, ficha, escape de HTML, plural com zero),
  `test_playwright.js` 202/202 (fr e zh x claro e escuro, tela cheia, filtros sem refazer o campo de busca, cache, remover, vincular, professora x admin, falha de consulta, celular sem rolagem horizontal),
  `tests/fase-k6` 28/28 (métricas dos cartões criados, portado para a ficha), `tests/painel-professora` 162/162, `tests/painel-ds` 9+87+131+194+284 checks.
  `tests/i18n/test_i18n_unit.js` e `test_playwright.js` dependem de um commit antigo (`e88fabb`) que não existe neste clone: não rodam aqui (já era assim); a paridade pt-BR x en foi conferida à parte.
- **Grátis x Premium:** tudo grátis (painel da professora; sem checkout).
- **Fica para depois:** Cartões (Flashcards) e Aulas na nova linguagem; "Registrar aula" e "Criar cartão" da ficha abrem as abas atuais sem pré-selecionar o aluno;
  Banco de Revisão; Material de apoio; função nova de Flashcards (a autora ainda vai descrever).

## Fase 2, tela Aulas entregue (2026-10-12, branch `claude/epic-fermat-ulyw5j`, nada publicado)
Autorização da autora: "pode seguir para Aulas". Mesmo método de Alunos (desenho aprovado, sem migration, sem dado novo).
- **Tela nova** (aba Aulas do painel da professora, fr e zh): lista por mês com a data em destaque, filtros (aluno, curso) e busca (tópico, lição de casa,
  observações, anotações e nomes), e o formulário "Registrar aula" ao lado (fixo ao rolar; no celular vai para baixo da lista). Escolher pessoas por chips
  (busca + caixas), registrar para uma ou várias pessoas, editar em janela, apagar com a confirmação do painel (antes `confirm()` do navegador).
- **Aula em grupo:** continua sendo uma linha por aluno em `teacher_class_logs` (migration 031, sem mudança). Na tela volta a ser UMA aula com vários avatares:
  mesmo conteúdo e criação com até 10 segundos de diferença (as linhas saem juntas do mesmo envio). Editar e apagar valem para o grupo todo (a janela avisa quantas pessoas).
  Limite conhecido: duas aulas idênticas registradas no mesmo instante para o mesmo grupo viram uma só na tela.
- **Dados:** uma consulta só (`fetchAllClassLogs`, até 1000 linhas, RLS da professora) em vez de uma por aluno; agrupa e filtra no navegador.
- **Atalhos da ficha:** "Registrar aula" e "Ver todas as aulas" da ficha do aluno abrem Aulas já filtrada nele e com ele escolhido.
- **Privacidade:** nada muda para o aluno; "Minhas aulas" continua pela RPC `get_my_class_logs` (sem as anotações privadas).
- **Arquivos:** `shared/teacher-classlogs-ui.js` (HTML puro), `shared/admin-class-logs.js` (reescrito: dados, eventos, diálogos), `shared/teacher-class-logs.js` (+`fetchAllClassLogs`),
  `shared/painel/` (peças novas: `p-aula`, `p-mes`, `p-chips`, `p-avatares`, `p-grade-2--larga`, `p-lateral`; no guia: "Aula no diário"), `fr/index.html` e `zh/index.html` (script novo).
- **Correções no Design System achadas pelos testes:** `PainelUI.confirmar` e `PainelUI.toast` agora entram no primeiro `.painel` visível (no app há um por aba, os das abas fechadas ficam escondidos e o diálogo sumia);
  diálogo com formulário dentro do `article` (X no canto, rodapé lado a lado); botão de envio dentro de `.p-acoes` não ocupa a linha toda; o X do diálogo de vincular aluno (tela Alunos) tinha o mesmo defeito e foi corrigido.
- **i18n:** 48 chaves novas `classlogs.*` (pt-BR e en, confiança ALTA). Chaves antigas `admin.classLogs.*` que a tela nova não usa mais ficaram no catálogo (inofensivas; limpeza futura).
- **Testes** (2026-10-12): `tests/painel-aulas/test_classlogs_ui_unit.js` 33/33 (agrupamento, filtros, meses, escape de HTML), `tests/painel-aulas/test_playwright.js` 162/162
  (fr e zh x claro e escuro: lista, filtros sem refazer o formulário, chips, registrar para 1 e para 2, validação, editar e apagar em grupo, atalho da ficha, vazios, celular, professora x admin),
  regressão: painel-alunos 206/206 e 61/61, painel-professora 162/162, fase-k6 28/28, painel-ds 9+87+131+194+288.
- **Grátis x Premium:** tudo grátis. Passo manual da autora: nenhum.
- **Fica para depois:** Cartões (Flashcards) na nova linguagem; "Criar cartão" da ficha ainda abre a aba atual sem pré-selecionar o aluno; Material de apoio.

## Fase 2, tela Cartões entregue (2026-10-12, branch `claude/epic-fermat-ulyw5j`, nada publicado)
Autorização da autora: "pode seguir para Cartões". Sem migration, sem dado novo; Grátis x Premium: tudo grátis (é ferramenta da professora).
- **Tela nova** (fr e zh): 3 abas. **Criar cartão** (1 Para quem: seletor de pessoas com chips, destino por aluno com Deck/subdeck e árvore; 2 Tipo de cartão em 5 opções com descrição; 3 Conteúdo: editor de campos nativo, tags, nota; resumo e botão ao lado). **Cartões criados**: tabela com filtros (aluno, ativos/arquivados, busca), 10 por página, menu por linha (visualizar, editar, mover, reativar, apagar). **Banco de Revisão**: só um aviso de que ainda não está ativa.
- Arquivos: `shared/teacher-cards-ui.js` (HTML), `shared/admin-flashcards.js` (reescrito; mesmos ganchos `data-*` e exports usados por `my-flashcards.js`), `fetchAllTeacherFlashcards` em `teacher-flashcards.js`, 78 chaves `cards.*` (pt-BR/en).
- Regras mantidas: editar conteúdo reinicia o progresso (confirma antes), Deck só do próprio aluno/idioma, trocar de idioma zera a seleção, Deck com cartão não se apaga, histórico sem Deck intacto.
- Testes: `tests/painel-cartoes/` (46 de peças de tela, 256 no navegador); testes antigos fase-g (68), fase-h (68), fase-i (48) portados para a tela nova via `tests/painel-cartoes/helpers.js` (seletor de alunos abre/fecha, tipo por botão, mover por janela na lista, apagar Deck com confirmação do painel). Regressão: painel-ds 9/87/131/194/288, painel-alunos 61+206, painel-aulas 33+162, painel-professora 162, fase-k6 28, fase-h unit 78.
- **Banco de Revisão (função nova, geração automática de cartões a partir do Google Docs de cada aluno): NÃO implementado.** Precisa de auditoria antes: ver `docs/fase-2-professora/banco-de-revisao-auditoria.md`.

## Fase 2, tela Material de apoio entregue (2026-10-12, branch `claude/epic-fermat-ulyw5j`, nada publicado)
Autorização da autora: "pode seguir para Material de apoio" (o Banco de Revisão ficou com outra sessão). Sem migration; Grátis x Premium: tudo grátis (ferramenta da professora; a aluna vinculada já vê o que recebe).
- **Tela nova** (fr e zh): lista por mês de envio (data do envio em destaque, avatares, descrição, selos de link e de arquivo), filtros (aluno, curso) e busca (título, descrição, link, nome do arquivo, pessoas), formulário "Enviar material" ao lado (chips de pessoas, título, descrição, link, arquivo com anexo e X). Menu por material: editar (janela) e apagar (confirmação do painel).
- Envio a várias pessoas = 1 linha por aluno em `teacher_support_materials`; a tela junta de volta em 1 material (mesmo conteúdo e criação em até 10 s), como nas Aulas. O arquivo sobe uma vez só.
- Regras mantidas: editar não troca o arquivo; apagar não remove o arquivo do Storage; a aluna segue vendo só o que foi enviado a ela (`support-materials-view.js`).
- **Correção de segurança pequena:** link só é aceito e só vira href se começar com http:// ou https:// (criar, editar, tela da professora e vista da aluna); antes um `javascript:` digitado virava link clicável para a aluna. Limite de 50 MB no arquivo, avisado antes de subir.
- Arquivos: `shared/teacher-materials-ui.js` (HTML), `shared/admin-support-materials.js` (reescrito), `fetchAllSupportMaterials` e `isHttpUrl` em `teacher-support-materials.js`, 47 chaves `materials.*` + `teacherMaterials.err.badLink` (pt-BR/en), 3 regras CSS `p-material-*`.
- Testes: `tests/painel-materiais/` (42 de peças de tela, 210 no navegador). Regressão: painel-ds 9/87/131/194/288, painel-alunos 61+206, painel-aulas 33+162, painel-cartoes 46+256, painel-professora 162, fase-k6 28, fase-g 68, fase-h 68 (+78 unit), fase-i 48.

## Fase 3, painel de Admin entregue (2026-10-13, branch `claude/epic-fermat-ulyw5j`, nada publicado)
Autorização da autora: "autorizado" (início da Fase 3) e "pode seguir com a ordem proposta" depois de responder as decisões da auditoria (`docs/fase-3-admin/auditoria.md`). Sem migration e sem dado novo. Grátis x Premium: nada muda (é ferramenta da admin).
Decisões da autora: janela do Design System para editar e ver detalhe; confirmação antes de enviar e-mail de resposta; Tags continua fora do Admin; Admin Mode em um lugar só.
- **Navegação** (`shared/admin-panel.js`, saiu de `admin-analytics.js`): `switchAdminPanelSection`, `renderAdminPanelView`, `ADMIN_PANEL_STATE`. Admin Mode só no botão 🔒 do topo (o interruptor de dentro do Analytics saiu). O Admin passa a ocupar a tela cheia (sem Ranking ao lado), como o painel da professora.
- **Planos** (`admin-plans-ui.js` + `admin-premium.js`): busca com teclado (combobox), ficha da conta com interruptores, matriz de permissões. Decisão minha, aguardando a autora confirmar: **tirar um plano e desligar uma permissão pedem confirmação; ligar não pede.**
- **Notificações** (`admin-notifications-ui.js`): lista agrupada por evento em ordem natural (1, 3, 15 dias), filtros, formulário "Nova variante" e regra do XP ao lado, janela de editar, ativar/desativar, apagar com confirmação.
- **Badges** (`admin-badges-ui.js`): catálogo em cartões, concessões em tabela com filtro, janela "Gerenciar pessoas" (com busca e nota), editar (trocar o id leva as concessões junto), apagar com confirmação que diz quantas pessoas perdem. Achado: **renomear já era seguro** (cria o novo, migra as concessões, só então apaga o antigo; se cair no meio não sobra concessão órfã), então NÃO precisou de função nova no banco. Apagar agora para se não conseguir apagar as concessões (antes apagava o catálogo mesmo assim).
- **Reports** (`admin-reports-ui.js`): tabela com status em cor, filtros do servidor + busca, janela de detalhe (contexto técnico recolhido), salvar status/prioridade/nota, responder por e-mail com confirmação ("Enviar a resposta para X?"). Link da captura só abre se for http(s) (antes entrava cru no href). Aviso quando a lista chega a 200.
- **Analytics** (`admin-analytics-calc.js` cálculos e rótulos puros; `admin-analytics-ui.js` HTML; `admin-analytics.js` busca e eventos): 10 sub-abas, indicadores com variação, barras, funil, tabelas. Nenhuma regra de cálculo mudou (fixadas por `test_analytics_calc_unit.js`). Novo: **aviso quando a consulta chega ao teto de 5000 eventos** (Resumo e demais, Retenção) ou 2000 (Tecnologia): "os números podem estar abaixo do real". Nomes de evento, navegador e sistema agora passam por escape (antes entravam crus). Resumir no servidor (RPC) para não depender do teto continua opcional e exigiria migration (Staging antes).
- Janelas: os 4 modais antigos (`#admin-manage-badge-modal`, `#admin-edit-badge-modal`, `#admin-edit-template-modal`, `#admin-report-detail-modal`) saíram do `fr/index.html` e `zh/index.html`; viraram `<dialog>` do painel montados pela própria tela.
- Testes: `tests/painel-admin/` (harness com banco em memória + Edge Function simulada). Peças de tela: planos 31, notificações 27, badges 29, reports 30, analytics (cálculos) 54 e (peças) 40. Navegador: planos 162, notificações 174, badges 188, reports 174, analytics 170. Teste antigo ajustado: `tests/fase-k0/test_actor_type.js` (carrega calc + controlador, porque as constantes se mudaram de arquivo) e `tests/painel-professora` (ganchos novos da aba Planos).
- Texto antigo que não mexi (precisa de aprovação da autora, regra "português não muda sem aprovação"): várias notas de Analytics usam "pra" e "--".

## Guia de estilo e antes e depois (2026-10-13)
- Guia (`shared/painel/guia-de-estilo.html`): seção nova "Peças do painel de Admin" com 9 exemplos (indicadores com variação, barras, funil, filtros em linha e interruptor, busca de conta e ficha, matriz de permissões, cartão de badge, variante/material com ícone, detalhe de report). Artifact do guia republicado (mesma URL).
- Páginas antes e depois: `docs/fase-2-professora/cartoes-antes-depois.html`, `material-antes-depois.html`, `docs/fase-3-admin/admin-antes-depois.html` (cada aba, Francês claro e Mandarim escuro). As capturas "antes" foram geradas de worktrees dos commits anteriores (92056f7 para o Admin, 8513499 para o Material) com os mesmos dados de exemplo.

## Ajustes pós-Fase 3 (2026-10-14)

- **Alinhamento:** no guia, o link "Ranking" do menu com painéis ficava 6px acima de Professora/Admin (o Pico dá margem embaixo ao `details`), e o campo de busca da barra de ferramentas ficava 6px acima do seletor (margem embaixo do `input`). Corrigido em `painel-componentes.css`; teste `tests/painel-ds/test_alinhamento.js` (falhava antes, 4/4 depois).
- **Analytics sem corte:** o Supabase devolve no máximo 1000 linhas por pedido, então o teto antigo de 5000 podia cortar em 1000 sem avisar. Agora `analyticsFetchPaged` busca páginas de 1000 até o teto de 50000 (técnicos 10000) e só então mostra o aviso. Decisão: sem migration/RPC; um resumo em SQL exigiria reescrever os cálculos testados e só vale se o volume passar do teto.
- Textos do Analytics em pt-BR conferidos: não há "pra" nem "--" (só no en.js, em inglês), nada a trocar.

## Integração com a main (2026-10-15, PR 319)

Depois do PR aberto, a `main` recebeu trabalho de outras sessões nas mesmas telas (PRs 317, 318 e 320). A branch mesclou a `main` mantendo os dois lados e recriou as funções novas nas telas do Design System. A prévia aprovada pela autora: `docs/fase-4-integracao/previa-integracao.html`.

- **Aulas (094):** Presença em rótulos coloridos no estilo do Notion (escolher, criar digitando, ⋯ para nome, cor e arquivar), Competências, aula de turma (1 linha com `classroom_id`, escolhida no bloco "Turmas" da janela de pessoas), selos na lista e na edição. Usa as classes do site (`.att-pill`, `.skill-toggle`, `.skill-chip`) para ficar igual à tela da aluna. Bloco "Revisar do Notion" mantido com o visual antigo (prévia no Design System ainda não aprovada). Testes: `tests/painel-aulas/` (57 + 262).
- **Alunos:** seção "Convidar aluno" (idioma, busca de conta, link, pendentes) no lugar do aviso "só a admin vincula"; confirmações pelo `PainelUI.confirmar`; Decks do aluno em árvore na ficha; `fetchStudentPanelData` e `renderStudentPanelHTML` voltaram (o botão Analytics do perfil público usa). Testes: `tests/painel-alunos/` (61 + 256), `tests/k10/`.
- **Analytics:** aba "Decks públicos" (11 sub-abas).
- **Cartões:** o Banco de Revisão volta a ser a sub-navegação "Cartões | Banco de Revisão" do painel, com a aparência atual (a aba-aviso da tela nova saiu). A parte do aluno (`review-bank-student.js`) fica para depois.
- **Notificações:** bandeira do idioma pelo registro; **Badges:** ícone dos badges automáticos agora é `<img>` (Fluent); **idiomas:** `LanguageRegistry` no lugar de `frances`/`mandarim` escritos nas peças novas (teste `tests/registro`).
- **Testes que mudaram de propósito:** painel-ds (zh passou a definir `--error-red`), fase-k0 (stub com `.range`), k10 (ficha nova), notificações (cabeçalho com ícone Fluent), vm-t (registro de idiomas).
- **Já falhavam na `main`** (conferido num checkout da `main`): fase-identity, fase-public-deck, desafios-progresso, i18n (card_variants, content_en, playwright), conjugacao, k2c, k2f (2), k2i, trilha-tags, tts-google, fase-j e o lint de `mural.js` em `tests/registro`.

### Decisão de 2026-10-15 (opção 1): Aulas ficam fora do PR 319

A sessão das Aulas (calendário, horário e duração, repetir toda semana, visão do mês, link de agenda ICS) continuou mexendo na tela enquanto o PR esperava. Para o PR ficar mergeável, `admin-class-logs.js` e `teacher-class-logs.js` voltaram à versão da `main`, e a tela nova de Aulas (com Presença, Competências, turma e "Revisar do Notion", 57 + 262 testes) ficou na branch `claude/aulas-design-system`. Para trazê-la de volta: prévia do calendário e do link de agenda, aprovação da autora e integração, sem outra sessão mexendo na tela ao mesmo tempo.
