# Fase 2: auditoria da área da Professora (Alunos, Flashcards, Aulas)

Auditoria feita em 2026-10-12, antes de qualquer código, como o projeto exige para fases grandes. Desenho proposto:
`docs/fase-2-professora/desenho.html` (página ao vivo, mesma proposta). Fotos das telas de hoje: `antes-*.jpg` nesta pasta
(app real com dados de exemplo, nada de produção).

## 1. Onde isso mora hoje
- Tudo é o **Painel de Admin**, uma tela com **10 abas** (`fr/index.html:4287-4296`): Badges, Analytics, Notificações, Reports,
  Alunos, Flashcards, Aulas, Material de apoio, Premium, Tags. A aba aberta por padrão é Badges (`ADMIN_PANEL_STATE`, `shared/admin-analytics.js:47`).
- As telas são os `shared/admin-*.js`. Os `shared/teacher-*.js` só acessam dados (Supabase) e não têm tela.
- Professora e Admin **não são separados**: a aba, a tela e a regra do banco (`teacher_flashcards_admin_write`, migration 026) exigem ser admin.
  Foi decisão intencional (`docs/historico/07-*`).
- O painel ocupa só a coluna central do app; ranking e missões do dia (que são do aluno) ficam ao lado.

## 2. Alunos (`shared/admin-students.js`, `renderAdminStudentsView`)
- **Hoje:** formulário "Vincular aluno" (conta + curso) no topo; abaixo "Seus alunos (N)", cada um uma linha com `@usuário — nome`,
  curso e data do vínculo, um botão 📊 e um ✕ (remover com `confirm()` do navegador). O 📊 abre, na própria linha, 8 linhas de texto
  (último acesso, estudo, sequência, XP, nível, dias ativos, fila, cartões próprios) e 6 itens recolhidos (unidades, pontos de
  verificação, atividade 30 dias, ditados, histórico de acertos, linha do tempo), mais "Cartões que você criou".
- **Dados:** RPC `get_teacher_student_overview` (migration 070) e `get_teacher_student_metrics` (059), uma aluna por vez; cache por sessão.
- **Problemas:** não há quadro geral da turma; o detalhe é texto corrido sem hierarquia; o formulário de vínculo ocupa o topo mesmo
  quando a ação é rara; remover usa `confirm()`; o termo "vínculo" não é explicado.
- **Desenho:** quadro geral (indicadores, alerta, busca, tabela com situação) e ficha da aluna em página própria (cabeçalho, abas,
  indicadores, blocos). Vincular vira janela. **Nenhum dado novo para a ficha**; o quadro geral precisa dos mesmos dados de todas as alunas.

## 3. Flashcards (`shared/admin-flashcards.js`, `renderAdminFlashcardsView`, mapeado por subagente e conferido na tela)
- **Hoje, quatro blocos numa página:** Alunos (checkboxes, busca, abas de curso), Destino (um bloco por aluna: deck, subdeck, árvore),
  Novo cartão (tipo, campos com áudio e imagem, tags, pré-visualizar, nota privada, criar) e Cartões ativos/arquivados (cada linha:
  frente → verso, deck, nota, data, selos, tags, um select "mover para…" e 4 ou 5 ícones sem texto).
- **Fluxos:** criar cria uma linha por aluna, em paralelo, com sucesso parcial possível. Editar troca a linha por formulário; se o
  conteúdo mudar, a aluna perde o progresso e o aviso só aparece ao salvar. Apagar é físico (`confirm()`), sem desfazer.
- **Problemas:** a lista de cartões fica depois do formulário inteiro; Destino repete um bloco por aluna; texto técnico na tela
  ("árvore de Decks", "subdeck", dica de `fields/card_generation_mode`); "Normal com reverso" e "Digite a resposta" sem explicação;
  nota privada longe dos campos; dois editores de edição (nativo e legado) com visuais diferentes; texto fixo em português fora do i18n
  em `my-flashcards.js` (lado da aluna).
- **Desenho:** duas abas ("Criar cartão" e "Cartões criados") em vez de uma página só; criar em 3 passos visíveis (para quem, tipo,
  conteúdo) com a pré-visualização ao lado e o aviso de reinício de progresso logo de início; lista como tabela com menu "Ações" com texto.
- **Função nova:** não há TODO nem texto no código ou nos documentos. Precisa ser descrita pela autora.

## 4. Aulas (`shared/admin-class-logs.js`, `shared/teacher-class-logs.js`)
- **Hoje:** escolher alunos (checkboxes com busca e filtro de curso, mesmo padrão de Flashcards e Material), depois um formulário
  (data, tópico, lição de casa, observações, anotações; pelo menos um preenchido), depois a lista das aulas dos alunos marcados.
  Aula em grupo cria uma linha por aluno (`teacher_class_logs`). Privado da professora (RLS, migration 031).
- **Problemas:** a lista (o que a professora mais consulta) fica no fim; escolher alunos antes de ver qualquer aula; campos sem hierarquia.
- **Desenho:** lista agrupada por mês com a data em destaque, filtros no topo, e o formulário "Registrar aula" ao lado, com chips para
  quem teve a aula. Mesma lista aparece na aba Aulas da ficha da aluna.

## 5. Navegação
- Seletor Professora | Admin ao lado das abas. Professora: Alunos, Flashcards, Aulas, Material de apoio (Material fica como está
  até a vez dele). Admin: as outras seis, refeitas na Fase 3. A área abre em Professora > Alunos.
- Painel em tela cheia, sem ranking e missões do aluno ao lado.

## 6. O que precisa de backend e o que não precisa
- **Sem migration:** a ficha da aluna, Flashcards (criar e listar) e Aulas usam os dados e as regras de hoje.
- **Quadro geral dos alunos:** pode usar a mesma RPC por aluna, em paralelo ao abrir a tela (serve para 6 a 20 alunos). Para turmas
  maiores, uma consulta única no banco exigiria migration (rodada pela autora no SQL Editor, Staging antes da produção).
- **Outras professoras no futuro:** a regra de escrita de `teacher_flashcards` é só admin. Com mais professoras, essa regra e o acesso
  ao painel precisam mudar. Fora desta fase.

## 7. Decisões pendentes da autora
1. O que faz a função nova de Flashcards?
2. Regra de situação do aluno (Em dia até 3 dias, Atenção 4 a 6, Parado 7 ou mais) serve?
3. Quais peças de referência do shadcn entram (tabela no desenho; as de "Só CSS" entram sem custo).
4. Material de apoio fica fora da Fase 2?

## 8. Ordem sugerida de construção (depois da aprovação)
Alunos (quadro geral, depois ficha) → Aulas → Flashcards (criar, depois listar). Cada tela com regressão da área, teste visual nos
4 cenários, e `shared/painel/` como única fonte de estilo. Textos novos passam por `t()` (regra do i18n).

## 9. Andamento
- 2026-10-12: desenho aprovado pela autora, botão primário no azul atual. **Alunos entregue** na branch (quadro geral e ficha); fotos em `depois-alunos-*.jpg`; relatório em `docs/historico/15-*`. Próximo: Aulas, depois Cartões.
- 2026-10-12: **Aulas entregue** na branch; fotos em `depois-aulas-*.jpg`; relatório em `docs/historico/15-*`. Próximo: Cartões.
