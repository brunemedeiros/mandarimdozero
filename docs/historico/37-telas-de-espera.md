# 37. Telas de espera: abertura com o logo animado e "carregando" que diz o que busca (2026-11-24)

Decisões da dona (2026-11-23/24). Valem para fr e zh (e o futuro pt). Nada no banco. Tudo grátis.

## O que havia
- **Abertura** (`#login-screen` de `fr/index.html` e `zh/index.html`): mostrava "Redirecionando..." toda vez que alguém abria o
  site, enquanto o login era conferido, mesmo sem redirecionar. O texto não passava pela tradução: o site em inglês mostrava
  português.
- **Carregando** (`loadingHTML`, `shared/utils.js`): 19 telas sorteavam uma frase genérica entre 6 ("Só um instante...",
  "Quase lá..."...). O sorteio ainda mexia no sorteio dos exercícios nos testes de paridade (PR #473).

## O que ficou
- **Abertura:** logo animado "duas cobrinhas" (versão 5 da prévia, escolhida pela dona; velocidade "devagar", repetindo até o
  site abrir). A cobrinha azul sobe a haste, faz a barriga de cima e chega ao topo; dali a rosa desce e fecha o "B", na mesma
  velocidade. Ciclo de 3,85 s (1,27 s azul, 1,33 s rosa, 0,9 s pronto, 0,35 s some). Animação embutida no próprio SVG (SMIL),
  sem script nem biblioteca, então aparece desde o primeiro instante. Com "menos movimento" no aparelho, o "B" fica pronto e
  parado (script curto logo depois do SVG). Leitor de tela ouve "Abrindo o site..." / "Opening the site..." (`loading.opening`).
- **Carregando:** cada tela diz o que busca (`loading.*`: mural, aulas, cartões, Notion, Google Agenda, link da agenda, Banco de
  Revisão, preferências, desempenho, opções de publicação; e as já existentes de ranking, notificações, materiais, aulas).
  Sem texto próprio: "Carregando...". As 5 frases do sorteio saíram dos catálogos.
- Mantido: "Redirecionando para o Google..." (no login com Google o site redireciona de verdade).

## Arquivos e prévias
- Logo animado para baixar: `docs/marca/logo-animado/` (só o "B" e o "B" com @prof.brune; SVG transparente, GIF e MP4 com
  fundo bege), gerador `scripts/gerar_logo_animado.py`, LEIA-ME com o passo a passo.
- Prévia das ideias (1 a 5): https://claude.ai/artifact/Q4xtZ8qZrtYSSsJQ3sQg9G (privada).

## Testes
CSS entre sites 5/5; i18n no navegador 209/209; paridade quase iguais 2770/2770; i18n unit com as 14 chaves novas na lista de
textos aprovados (as falhas que sobram já existiam na `main`). Prévia no celular: fr e zh, claro e escuro, e com menos movimento.

## O B abre pronto (2026-11-25)

A dona viu no celular só "@prof.brune" na abertura: a animação começava com o B vazio e, num aparelho rápido, o site abria
antes de o B se formar. Decisão dela (opção recomendada): a abertura começa com o B COMPLETO (relógio da animação parado em
2,9 s) e, depois de 0,4 s, a animação segue sozinha: o B some no fim do ciclo (~1 s depois de abrir) e volta a se desenhar,
repetindo. Com "menos movimento" no aparelho, continua pronto e parado. Mudou só o `<script>` solto logo depois do desenho, em
`fr/index.html` e `zh/index.html`; por causa da lista de segurança (CSP, `scripts/csp-atualizar.js`) as impressões digitais foram
recalculadas. A tela que o Android mostra ao abrir o app instalado (ícone + "Francês com Prof. Brune") é do sistema e não aceita
animação. Testes: simulação de celular fr e zh, com e sem "menos movimento" (14/14), e `tests/csp/` 12/12.
