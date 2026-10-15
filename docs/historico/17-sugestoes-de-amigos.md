# Sugestões de amigos e QR code do convite (2026-10-15)

Decisão da autora (2026-10-14, `docs/amigos-seguir-x-amizade.md`): manter amizade com pedido e aceite e sugerir
amigos sem usar a agenda do celular. Pedido: "começar pelas sugestões de amigos".

## O que entrou

- **Migration `095_friend_suggestions.sql`**:
  - `friend_suggestions(p_limit)`: uma linha por pessoa, com o motivo mais forte. Ordem dos motivos:
    1. `invite` (entrou pelo seu convite) ou `invited_by` (te convidou);
    2. `classmate` (mesma professora com vínculo ativo, ou mesma turma do Mural);
    3. `mutual` ("N amigos em comum");
    4. `partner` (estudou o mesmo idioma nesta semana ou na anterior; só perfil público);
    5. `ranking` (XP da semana perto do seu, até 30% ou 50 XP de diferença; só perfil público).
  - Ficam de fora:
    - eu mesma, amigos e pedidos abertos;
    - quem recusou meu pedido nos últimos 30 dias;
    - quem não aceita pedidos, ou desligou "aparecer nas sugestões" (exceto no convite);
    - professora e aluno entre si;
    - quem eu dispensei no X.
  - Foto só de perfil público (ou com acesso completo, regra da 080).
  - `dismiss_friend_suggestion(p_user)`: o X do cartão (tabela `friend_suggestion_dismissals`).
  - `record_friend_invite(p_username)`: quem abre o link `?amigo=usuario` já logado grava de quem veio (tabela
    `friend_invites`).
  - `friend_settings.suggest_me` (padrão: ligado), em Configurações > Notificações > Amigos.
- **Tela (`shared/friends.js`)**:
  - Seção "Sugestões de amigos" na aba Amigos: cartões com rolagem lateral, nome, motivo, Adicionar e X, como no
    Duolingo. O X fica como texto cinza (`data-no-emoji-icons`).
  - Sem sugestões, ou sem a 095 no banco, a seção não aparece.
- **QR code do convite**:
  - O botão "Mostrar QR code" abre um modal com o QR do mesmo link de convite.
  - Biblioteca `shared/vendor/qrcode-generator.js` (MIT, Kazuhiko Arase), carregada só ao abrir o QR.
- **Grátis x Premium**: tudo grátis.

## Testes (2026-10-15)

| Teste | Resultado |
|---|---|
| `tests/amigos-sugestoes/run.sh` (Postgres local; todas as regras de entrada e saída) | 31/31 |
| `tests/amigos-sugestoes/test_playwright.js` (fr/zh, claro/escuro, 1280 e 390 px) | 58/58 |
| `tests/amigos/test_playwright.js` | 210/210 |
| SQL de Amigos | 0 falhas |
| i18n | 2032/2032 |
| i18n no navegador | 209/209 |
| Ícones | 43/43 |

- `tests/amigos/test_playwright.js` foi atualizado de propósito: as preferências passam de 5 para 6 interruptores.
- O runner local aplica só as tabelas de turma da 087, porque a 087 inteira depende do Storage do Supabase.

## Banco

- Staging: 095 aplicada em 2026-10-15 (`095_friend_suggestions`) e, em seguida, `095b_friend_suggestions_invited_by`
  (mesma função, já separando "te convidou").
- Produção: pendente de autorização. O arquivo do repositório já é a versão final.
