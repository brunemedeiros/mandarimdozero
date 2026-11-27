# Esqueceu a senha (2026-11-16, publicado pelo PR #516 em 2026-11-24)

Relato da dona: sem tela de confirmação, ela clicou várias vezes; o Supabase aceita 1 pedido por minuto (429) e o erro
apagava o aviso de envio (registros: 1º pedido ok, 4 com 429).

- Versão A (`esqueci-*.png`, primeira entrega): tela só com o e-mail e "Confira seu e-mail" no estilo da tela do código.
  A dona achou básica demais.
- Versão B (`versao-b.html`, `b-*.png`): carta com selo e carimbo, mas com as cores da Central/artefatos (Design System
  do claude.ai), diferente do site.
- **Versão C (escolhida, `versao-c.html`, `c-*.png`, `portao-c-*.png`)**: a carta da B no visual do portão do site. Faixa de
  correio aéreo azul e vermelha só no envelope do passo 2; ícone ✉️ do Fluent (envelope sem @, `shared/icons/fluent/2709.svg`).
  Código em `index.html` (`gate-forgot`, `gate-forgot-sent`, classes `fp-*`); teste `tests/login-obrigatorio/test_esqueci_senha.js`.
