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
