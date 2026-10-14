# Ícones do site: troca de emoji por Microsoft Fluent Emoji (2026-10-14)

Decisão da autora (2026-10-14): unificar todos os ícones do site com o **Microsoft Fluent Emoji, versão Color, em SVG**
(github.com/microsoft/fluentui-emoji, licença MIT, sem crédito na tela; guardar o LICENSE junto dos arquivos).
Motivo: emoji muda de desenho em cada aparelho (no Windows a bandeira 🇫🇷 vira "FR").

Auditoria completa (visual, com o ícone novo ao lado de cada emoji): https://claude.ai/artifact/WykvDkJvCZYyTipszdAMcN

## Números da varredura

fr/, zh/, shared/ (inclui i18n pt-BR/en), páginas iniciais e modelos de notificação nas migrations; sem tests/ e docs/.
209 emojis diferentes, 1.671 usos. 187 têm o mesmo no Fluent; 10 trocam por outro; 5 são bandeiras; 4 setas viram CSS;
3 ficam emoji (só em push/e-mail).

## Achados

- O Fluent **não tem bandeiras de país** nem emoji de família: bandeiras continuam SVG próprio (falta a dos EUA);
  famílias viram "People hugging".
- 🈺 (japonês, "aberto para negócios") marca as lições de Hanzi no zh: trocar por 🀄 (Mahjong red dragon, 中).
- Conquistas: hoje 6 ícones diferentes para a mesma ideia de nível (📖 🗼 🇫🇷 🏮 🐉); Pioneiro/a usa o mesmo 🌱 de
  Primeiro Passo (sugestão: 🚀). Ícone por trilha, nível na moldura.
- Menus (celular e computador) usam SVGs coloridos desenhados à mão: entram na troca. Marca, logos, ícone do app,
  logo do Google, gráfico e fotos ficam.
- Push e assunto de e-mail são texto: lá o emoji fica. Reações do Parabéns e `badge_catalog.icon` estão gravados como
  emoji no banco: o site troca na hora de mostrar, sem mudar dado.

## Plano de implementação (não iniciado)

1. `shared/icons/fluent/` com os SVGs usados + LICENSE; `shared/icons.js` com o mapa emoji → arquivo e uma função que
   troca emoji por `<img>` ao renderizar (textos e conteúdo continuam escritos com emoji).
2. Trocar menus, conquistas e telas; seletor do Fluent em Admin › Conquistas no lugar do campo livre.
3. Service worker guarda os SVGs; validar fr/zh × claro/escuro. Grátis x Premium: tudo grátis.
