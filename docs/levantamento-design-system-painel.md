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

## 6. Próximos passos (só com autorização da autora)

1. Você responde as perguntas da seção 4.
2. Eu fecho a recomendação com base nelas.
3. Se o caminho for o Pico ou o daisyUI: criar o arquivo de tokens e a página de guia de estilo no repositório, sem mexer em nenhuma tela existente.
4. Depois, migrar uma tela por vez, começando por Alunos, validada em fr e zh, claro e escuro.
5. Se o caminho for o shadcn: antes de qualquer código, uma auditoria própria da migração (rotas, autenticação, testes e publicação), como o projeto exige para fases grandes.

Nada deste documento foi aplicado ao site, e nada foi commitado.
