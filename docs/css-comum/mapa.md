# Mapa dos trechos de CSS iguais entre fr e zh

Gerado por `node scripts/css-comum-mapa.js 30` em 2026-11-24 (só leitura). Plano: `docs/css-comum/plano.md`.
As linhas mudam toda semana: gerar de novo no começo de cada etapa.

- Blocos de estilo (regra, `@media` inteiro...): fr 2215, zh 2387; **2044 iguais e na mesma ordem**
  (92.3% do fr).
- Trechos contínuos iguais: 59; com 30 linhas ou mais: **20**, somando 3236 linhas do fr
  (o resto são trechos curtos entre regras que só existem num site).

| # | fr (linhas) | zh (linhas) | Blocos | Linhas | Seções |
|---|---|---|---|---|---|
| 1 | 283-327 (`<style>` 1) | 253-293 (`<style>` 1) | 3 | 45 | Header / topbar |
| 2 | 368-412 (`<style>` 1) | 354-398 (`<style>` 1) | 15 | 45 | Bandeiras (ícones de idioma) — convenção padrão · Nav tabs |
| 3 | 483-643 (`<style>` 1) | 431-591 (`<style>` 1) | 16 | 161 | Barra de navegação inferior (mobile, Fase 6) · Shell desktop: sidebar + cards (decisão #1/#5, ver artefato de |
| 4 | 657-711 (`<style>` 1) | 798-852 (`<style>` 1) | 23 | 55 | Bloco de Unidade: lista vertical, peso próprio · Fase 2 da trilha: estados (atual/disponível/pulada), selos e "Continuar" |
| 5 | 731-762 (`<style>` 1) | 877-908 (`<style>` 1) | 21 | 32 | Fase 7 da trilha: alternador Trilha/Mapa e modo Mapa |
| 6 | 766-817 (`<style>` 1) | 910-961 (`<style>` 1) | 29 | 52 | (sem título de seção) |
| 7 | 933-1017 (`<style>` 1) | 1123-1207 (`<style>` 1) | 67 | 85 | Diálogo em balões (estilo conversa) |
| 8 | 1083-1121 (`<style>` 1) | 1310-1344 (`<style>` 1) | 13 | 39 | (sem título de seção) |
| 9 | 1159-1193 (`<style>` 2) | 1358-1392 (`<style>` 2) | 16 | 35 | Fase 8a: imagem/múltipla escolha no flashcard (ver CLAUDE.md) · Fase 6D.5: editor visual de Cloze nativo (ver CLAUDE.md) |
| 10 | 1221-1276 (`<style>` 2) | 1445-1503 (`<style>` 2) | 13 | 56 | (sem título de seção) |
| 11 | 1385-1417 (`<style>` 3) | 1637-1669 (`<style>` 3) | 15 | 33 | (sem título de seção) |
| 12 | 1428-1502 (`<style>` 3) | 1779-1853 (`<style>` 3) | 40 | 75 | Desafios de hoje (estilo Busuu/Duolingo) |
| 13 | 1611-1737 (`<style>` 3) | 1913-2039 (`<style>` 3) | 59 | 127 | Bloco hero + filtro de fila (Fase 12, reformulado 4x após · Acesso a "Configurar sessão" (5ª rodada de grilling): saiu · "Suas palavras" (resumo fracas/medianas/fortes) |
| 14 | 1819-2488 (`<style>` 3) | 2071-2728 (`<style>` 3) | 384 | 670 | Progress / gamification view · Meu Perfil · Amigos (Perfil > Amigos) + selo "+N" + ranking de amigos · Ranking (Leaderboard) |
| 15 | 2578-2777 (`<style>` 3) | 2787-2988 (`<style>` 3) | 102 | 200 | Tela de sequência de streak (estilo Duolingo) · Plano de estudo com meta diária (estilo Busuu) · Assistente de meta de estudo (wizard multi-tela) · Lembrete de revisão acumulada (pop-up de rodapé) |
| 16 | 2786-2894 (`<style>` 3) | 3018-3125 (`<style>` 3) | 40 | 109 | (sem título de seção) |
| 17 | 2930-2977 (`<style>` 3) | 3163-3210 (`<style>` 3) | 20 | 48 | User pill / dropdown |
| 18 | 2979-3078 (`<style>` 3) | 3240-3339 (`<style>` 3) | 30 | 100 | Sino de notificações (Fase 1) · Reportar (Fase 2 -- projeto "Report global") · Fase 3 (mobile): alvos de toque de 44px e "Prática" promovida |
| 19 | 3129-4109 (`<style>` 3) | 3390-4369 (`<style>` 3) | 744 | 981 | Janelas da Revisão (Adicionar, Painel, Configurar, Exportar) · Janelas da Revisão no Design System do painel (Pico escopado em .painel, 2026-10 · Janelas pequenas no Design System do painel (Pico escopado em .painel, 2026-10-1 · Estética "janela rica" (padrão aprovado pela autora em 2026-10-18) |
| 20 | 4112-4399 (`<style>` 3) | 4372-4658 (`<style>` 3) | 219 | 288 | Cara de jogo: telas (passo 4, docs/historico/15) · Conquistas com níveis (shared/badge-tracks-app.js, docs/conquistas-proposta-nive · Sugestões de amigos (095, shared/friends.js loadFriendsSuggestions) · Convite para ativar as notificações (102, shared/friends.js loadFriendsPushInvit |
