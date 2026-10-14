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

## Implementado (2026-10-14, autorizado pela autora: "pode fazer")

- `shared/emoji-icons.js` (fr, zh e página inicial): troca, na hora de mostrar, cada emoji do mapa por
  `<span class="emo" role="img" aria-label="🔥">🔥</span>`, com o SVG de fundo e o caractere transparente. Por isso
  textos, i18n e conteúdo continuam escritos com emoji, e textContent, copiar/colar e leitor de tela não mudam.
  Também vale para o que aparece depois (avisos, telas novas), por MutationObserver.
  - Não mexe em campo de texto, `<code>`/`<pre>`, `<svg>`, title/placeholder/aria, push do celular e e-mail.
  - Emoji fora do mapa fica como está. Para desligar num trecho: `data-no-emoji-icons`.
- Arquivos: `shared/icons/fluent/` (200 SVGs, cerca de 3,5 MB, cada um baixa só quando aparece; LICENSE MIT) e bandeiras
  próprias em `shared/icons/flags/` (fr, br, pt, cn, us).
- Menus do celular, lateral e abas do topo: imagens do Fluent. Ficaram como estavam o "Mais" (três pontinhos) e o
  botão de recolher a barra.
  - Ícones: Estudo 📚, Revisão 📇, Conjugação ✍️, Desafios 🎯, Hanzi 🀄, Perfil 🧑, Ranking 🏆,
    Configurações ⚙️, Aluno 🎒, Professora 🧑‍🏫, Admin 🛠️.
- Ajustes sobre a auditoria:
  - 👤 (silhueta, cinza escuro) virou 🧑 (Pessoa), porque sumia no tema escuro;
  - 🈺 virou 🀄 nas lições de Hanzi;
  - a coroa da Fundadora virou a do Fluent.
- Dado: `badge_catalog.icon` do Pioneiro/a mudou de 🌱 para 🚀 na produção (2026-10-14; no Staging essa linha não existe).
- Testes: `tests/icones/test_playwright.js`.
- Falta: em Admin › Conquistas, trocar o campo livre de emoji por um seletor só com os ícones do mapa.
