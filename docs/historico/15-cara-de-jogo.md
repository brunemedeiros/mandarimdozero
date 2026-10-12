# Histórico: cara de jogo (identidade visual gamificada)

Pedido da autora (2026-10-12), depois da auditoria da aba Perfil > Amigos: o visual parecia "documento do Word",
com escrita em formato de tabela, pouca hierarquia e nada divertido. Ela quer a "cara de jogo" no site todo.
A maquete aprovada como direção é o artifact "Amigos com cara de jogo" (claude.ai/artifact/5823d1MdcerBBw7Pjo9xkn).

## Ordem combinada

1. Fonte Nunito de verdade e bug do título da atividade de Amigos. **Feito.**
2. Base visual compartilhada: botão com volume e títulos sem caixa alta **(feito)**; cartão, estado vazio e selo
   entram junto com a primeira tela que usar cada um (passo 3).
3. Aba Amigos redesenhada conforme a maquete (fecha os achados da auditoria).
4. Outras telas: Perfil (Visão geral, Metas, Progresso) e Ranking (estética antiga); Configurações (metade);
   ajuste fino em Desafios, Revisão e Trilha.
5. Dados novos: sequência e idioma por amigo no `friends_leaderboard` (migration), sequência como evento na
   atividade, botão "Parabenizar" (proposta: grátis).

Grátis x Premium: passos 1 a 4 são visuais, tudo grátis.

## Passos 1 e 2 (commit ab4fb8d, 2026-10-12)

- Causa do "visual de Word": `@font-face{ src: local('Nunito') }` só usava a Nunito se estivesse instalada no
  aparelho; quase todos caíam em Arial/Segoe. Agora `fr/index.html`, `zh/index.html` e `index.html` carregam a
  Nunito (400 a 900) do Google Fonts com `display=swap`. O Service Worker ignora outra origem, então offline fica a
  fonte do sistema. Hanzi continua na fonte CJK do sistema (a Nunito não tem esses caracteres).
- Botões: `.btn-primary`/`.btn-gold` ganham sombra sólida embaixo `color-mix(in srgb, <cor> 62-65%, #000)`
  (com fallback rgba antes), `.btn-secondary` usa `--paper-line`; ao apertar o botão desce 2px. Tokens
  `--btn-depth` (4px) e `--btn-depth-sm` (3px); `.btn-sm` (só fr) usa 3px/2px. Raio 14px.
- Títulos: `.section-label`, `.side-card-title`, `#side-missions-body .dcs-caption` e `.module-label .ml-text` (só
  fr) viraram frase normal, 15px, peso 900, `--ink`. Usam `--font-body`, porque no zh `--font-display` é serifada.
  Etiquetas pequenas ("COMECE POR AQUI", "GRAMÁTICA", cabeçalhos de tabela admin) ficaram em caixa alta de propósito;
  revisar tela a tela no passo 4.
- Bug: a section da atividade de Amigos e o div interno tinham o id `friends-activity`; o loader sobrescrevia a
  section e apagava o título. A section virou `friends-activity-section`.
- Validação: prints antes/depois em fr claro/escuro/celular, zh claro/escuro (Amigos, Trilha, Revisão,
  Configurações, Perfil). O "antes" foi simulado com Arimo, porque o sandbox tem a Nunito instalada.
- Regressão Playwright: amigos 158/158, revisao-ajustes 48/48, deck-browser 206/206, desafios-conclusao 19/19,
  desafios-modulo 75/75, placeholders 45/45, ditado 58/58, checkpoint-zh 25/25. i18n trava em
  `triggerWouldGenerate` (`#flashcard-limit-modal`), igual sem as mudanças (pré-existente, não investigado).
