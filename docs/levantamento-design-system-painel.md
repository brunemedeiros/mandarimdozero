# Levantamento: Design System do painel interno

Documento de apoio à decisão. Nada aqui altera o site: é só o retrato do que existe hoje, o que cada caminho implica e as perguntas que só a autora pode responder. Preview comparativo: https://claude.ai/artifact/LVKZUBhegthKLwHbtiFGmG

## 1. O que já está decidido

- Fonte única (Nunito) em todos os idiomas e cursos. **Só a paleta de cores muda** entre francês e mandarim.
- Visual de referência: papel bege, tinta roxa ou marrom, cantos de 14px, sombras leves, selos em pílula, claro e escuro.
- Seis alternativas foram comparadas no preview: Pico CSS, daisyUI, Tabler, Open Props com CSS próprio, shadcn/ui e Material UI.
- Decisão pendente: qual delas, e se o painel passa por uma reescrita.

## 2. O que o código mostra hoje (conferido em 2026-10-12)

### O painel em números
- **11 telas de admin** (Alunos, Analytics, Badges, Registro de aulas, Flashcards, Notificações, Premium, Relatórios, Materiais de apoio, Tags e o menu do painel) e **3 telas do lado da professora** (Registro de aulas, Flashcards, Materiais).
- Cerca de **5.900 linhas** em 14 arquivos (`shared/admin-*.js`, `shared/teacher-*.js`, `shared/student-metrics.js`, `shared/support-materials-view.js`).
- As maiores: `admin-flashcards.js` (1.475 linhas) e `admin-analytics.js` (1.421). Depois vêm `admin-badges.js` (481), `admin-students.js` (453) e `admin-class-logs.js` (353).

### Como o painel é montado
- É **JS puro** e fica **dentro do app** fr e zh: as duas páginas carregam os mesmos arquivos de `shared/`. Uma reescrita atende os dois idiomas de uma vez.
- Depende de funções globais do app (`isAdminUser`, `showToast`, `t()` do i18n, `roles.js`). Cada tela monta o HTML como texto e injeta no navegador (`innerHTML`, cerca de 60 pontos).
- Todo texto visível já passa por `t()` (cerca de 590 chamadas). Isso ajuda qualquer migração.
- Navegação por `#` (hash), sem servidor. O site é publicado direto da `main`, **sem etapa de build** (`.github/workflows/deploy-pages.yml`).
- Existem 12 arquivos de teste que citam o painel, entre eles `tests/painel-alunos/` (unit, Playwright e SQL).

### O que isso muda na escolha
- **Trocar só o visual (Pico, daisyUI, Open Props)** não é só CSS: como as telas montam HTML em texto, os nomes de classe precisam ser trocados dentro desses `.js`, nos cerca de 60 pontos. É trabalho mecânico e gradual, sem mudar a estrutura.
- **Adotar React (shadcn ou Material UI)** exige reescrever as 5.900 linhas, criar uma etapa de build, mudar a publicação e adaptar os testes. É uma fase grande.
- Os tokens (cores, fonte, raio) podem ser **um único arquivo lido por todos os caminhos**. Isso já está provado no preview.

## 3. Os caminhos, lado a lado

| | Pico CSS | daisyUI | shadcn/ui |
|---|---|---|---|
| Etapa de build | Não | Recomendada (Tailwind) | Obrigatória (React) |
| Reescrever o painel | Não, só trocar classes | Não, só trocar classes | Sim, 100% |
| Componentes prontos | 9 + formulários e tabela | 61 | cerca de 60 |
| Catálogo visual | Enxuto (a confirmar) | Grande (a confirmar) | Grande, conferido |
| Gamificação pronta | Nenhuma | Peças parciais | Nenhuma |
| Mudança na publicação | Nenhuma | Pequena | Grande |
| Risco principal | Escrever mais peças à mão | Dependência do Tailwind | Tempo e manutenção de React |

Gamificação (sequência, XP, conquistas, meta, ranking) é à mão em qualquer um. Ela já existe no preview.

Ainda **não conferido**: os sites de documentação do Pico, daisyUI, Tabler, Open Props e Material UI estavam bloqueados no ambiente. Contagens e peças vêm dos pacotes oficiais; a existência de catálogo com exemplos ao vivo nesses cinco vem do conhecimento prévio.

## 4. Perguntas para a autora

Responda do seu jeito, em uma linha cada. "Não sei" também é resposta válida.

### A. Uso
1. Quais telas do painel você abre toda semana? (Alunos, Analytics, Badges, Registro de aulas, Flashcards, Notificações, Premium, Relatórios, Materiais de apoio, Tags)
2. Quais você evita ou acha confusas? O que atrapalha?
3. Você usa o painel mais no computador ou no celular?
4. Mais alguém usa o painel além de você? Pretende ter outras professoras?

### B. Incômodos de hoje
5. O que mais te incomoda no painel hoje? (aparência, telas diferentes entre si, difícil de achar as coisas, lento, outra coisa)
6. Já aconteceu de errar algo por causa de uma tela confusa? Qual?
7. Você quer que o painel pareça o site dos alunos ou uma "área de trabalho" claramente separada?

### C. Futuro
8. Você pretende levar o site dos alunos (trilha, revisão) para React algum dia, ou o JS puro serve?
9. Quem vai mexer no código daqui a um ano? (só você e o Claude, ou também um desenvolvedor)
10. A gamificação (sequência, XP, conquistas) deve aparecer também no painel da professora, ou só na área do aluno?
11. O painel vai precisar suportar o português (ptbr) quando o curso existir?

### D. Limites
12. Você prefere uma melhoria rápida de visual agora (semanas) ou uma reconstrução planejada (meses)?
13. Tudo bem passar a ter Node e uma etapa de build no repositório?
14. Pode haver um período em que o painel antigo e o novo convivem, tela por tela?

## 5. Como as respostas decidem

| Se você responder | Caminho que eu indicaria |
|---|---|
| Quero melhoria rápida, sem mudar a forma de trabalhar (12, 13) | Pico CSS |
| Quero catálogo grande de componentes, mas sem React (12, 13) | daisyUI |
| Vou levar o site inteiro para React (8) | shadcn/ui |
| Um desenvolvedor vai assumir (9) | shadcn/ui, pela quantidade de pessoas que dominam React |
| Só eu e o Claude mantemos (9) e não quero build (13) | Pico CSS |
| Quero que o painel seja bem separado do site dos alunos (7) | Tabler ou shadcn/ui |
| Pretendo ter outras professoras (4) | Qualquer um, mas priorizar o que facilita testes e acessibilidade: shadcn/ui ou Material UI |

Respostas contraditórias entre si (por exemplo, "melhoria rápida" e "vou migrar tudo") valem uma conversa, não uma regra.

## 6. Respostas da autora (2026-10-12)

1. Mais usado no site: Estudo, Revisão, Ranking e Desafios. No painel, a área da professora está sendo separada da de Admin. A nova função importante virá em Flashcards, com três telas para a professora: Alunos, Flashcards e Aulas.
2. Evita Analytics, Notificações e Badges: informação demais, sem forma legível para leigos.
3. Usa mais no computador.
4. Quer outras professoras no futuro; por enquanto só ela.
5. Incômodo principal: telas muito diferentes entre si, sem padrão, e informação como sequência de linhas de texto, sem hierarquia nem blocos definidos. Não é problema de velocidade.
6. Nunca errou por tela confusa, mas já evitou Analytics e Badges por isso.
7. O painel da professora mostra o aluno individualmente e o quadro geral da turma. É uma área claramente separada e mais densa que o resto do site, que leva o aluno a uma tarefa por vez.
8. Não sabe o que é React.
9. Pode entrar um desenvolvedor em breve: ela chegou a um limite técnico.
10. Gamificação é do aluno, não do painel.
11. O painel precisa atender todos os cursos, porque todo curso poderá ter professor.
12. Prefere melhoria rápida de visual agora, e as funções novas já nascerem no novo sistema visual.
13. Não sabe o que é build.
14. Não quer painel antigo e novo convivendo.

## 7. Decisão: Pico CSS, sem React e sem build

Motivos, ligados às respostas:
- **8 e 13:** não há plano de React, e etapa de build seria um peso novo que a autora não pediu. Fica fora shadcn, Material UI e o Tailwind do daisyUI.
- **12:** a melhoria é de visual e de organização, não de tecnologia. O Pico entra com um link no HTML e se apoia nos tokens que já existem.
- **5:** o incômodo é de **padrão e hierarquia**, e não de componentes que faltam. A solução é um conjunto de padrões de página (cabeçalho, bloco com título, faixa de resumo, tabela, estado vazio), que o Pico não traz e a gente escreve.
- **2:** as telas densas (Analytics, Notificações, Badges) pedem "resumo primeiro, detalhe sob demanda". Isso é desenho de informação, vale para qualquer biblioteca.
- **9:** um desenvolvedor novo entende HTML e CSS com um guia de estilo documentado. Como os tokens ficam num arquivo único, uma migração futura para React continua possível.
- **10:** a gamificação do aluno fica no site dos alunos. O painel só mostra os números dela (sequência, XP) como informação, sem peças de jogo.
- **11:** os tokens por curso já existem (azul no francês, vermelho no mandarim). Um curso novo entra com um bloco de cores novo, sem mexer nos componentes.

### Pontos de desenho que as respostas levantam
- **Duas áreas, dois propósitos:** Professora (alunos, flashcards, aulas) e Admin (analytics, notificações, badges, premium, relatórios, tags, materiais). Mesmo sistema visual, navegação separada.
- **Professora vê o individual e o geral:** a tela "Detalhe do aluno" do preview é o ponto de partida, e a faixa de resumo da turma é o geral.
- **Telas de Analytics, Notificações e Badges:** antes de redesenhar, uma conversa com a autora sobre o que ela queria saber ali. Sem isso, o visual novo repete a confusão.
- **Computador primeiro.** O celular só precisa não quebrar.

### Ponto aberto: convivência do antigo com o novo
A autora não quer painel antigo e novo convivendo, mas também quer rapidez. As duas coisas se conciliam assim: a área da **Professora é nova** (está sendo separada do Admin), então já nasce no sistema novo. O **Admin** é refeito de uma vez, numa só entrega, e só vai ao ar completo. Nenhuma tela individual fica metade de um jeito, metade de outro. Falta a autora confirmar.

## 8. Próximos passos (só com autorização da autora)

1. **Fase 1, fundação:** arquivo de tokens compartilhado em `shared/`, Pico CSS copiado para o repositório (sem depender de CDN), os componentes próprios (selo, alerta, abas, avatar, indicador), os padrões de página e a página de guia de estilo. Nenhuma tela existente é alterada.
2. **Fase 2, área da Professora:** Alunos, Flashcards e Aulas já no sistema novo, com a função nova de Flashcards construída nele.
3. **Fase 3, Admin:** conversa sobre Analytics, Notificações e Badges, depois o redesenho de todas as telas numa única entrega.
4. Cada fase com a regressão da área, o teste visual nos quatro cenários (fr e zh, claro e escuro) e o registro em `docs/historico/`.

Nada deste documento foi aplicado ao site.
