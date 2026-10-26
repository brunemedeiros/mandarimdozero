# Auditoria das telas de exercício x molde da trilha (2026-10-23)

Só leitura, feita por 3 agentes a partir do código (nada rodado no navegador). Regra decidida pela autora no mesmo dia:
`.claude/rules/frontend-fr-zh.md` ("Telas de exercício seguem o molde da trilha").

## Molde da trilha (referência)
- Barra do topo `.lesson-focus-bar` (`fr/index.html:5724-5731`): progresso, ⚑, ⌨️ (Atalhos), ✕.
- Comando = rótulo pequeno `t('fr.exercise.whatMeans')` acima do cartão do item (`fr/app.js:3157`).
- Opções com badge 1-4 e teclas (`wireKeyboardOptions`, `shared/core/exercicios-licao.js:313-348`; teclado global `fr/app.js:2906`).
- "Não sei" (`.exercise-dontknow`), painel de feedback com "Continuar →", Enter avança (`findEnterAdvanceTarget`, `fr/app.js:2891`).

## Diferenças por área
| Item | Jogos | Prática conj. | Expressões | Ouça e traduza | Acentuação | Complete a frase | Ditados | Revisão |
|---|---|---|---|---|---|---|---|---|
| Saída | link "← Voltar", sem X | link, sem X | link, sem X | idem | idem | idem | link, sem ⚑, sem modo foco | link, sem X |
| Progresso no topo | não (barra 6px dentro) | não | não | não | não | não | só do áudio | dentro do cartão |
| ⌨️ Atalhos | não | não | não | não | não | não | não | não |
| Badge 1-N e teclas | teclas 1/2 invisíveis | n/a | não | n/a | n/a | não | n/a | não |
| "Não sei" | não | só dica | não | só dica | não | não | não | não (intencional: autoavaliação) |
| Fim do feedback | "Próxima frase" | "Próximo verbo →" | "Concluir" | "Concluir" | "Concluir" | "Concluir" | "Tentar de novo" | "Continuar" |
| Comando no idioma do site | ok | ok | NÃO: `c.question` em francês (`fr/app.js:8043`) | rótulo UI, sem cartão | rótulo UI | frase longa UI | `task` do conteúdo | sem comando |

Outros achados:
- Expressões: opções borradas atrás de "Ver as respostas" (`.challenge-choices.blurred`, `fr/index.html:2876`) e tela de feedback única e longa
  (explicação, 2 exemplos, "Sua vez" que só revela, links). Em nenhuma outra tela é assim.
- Conteúdo cru em francês/português sem overlay em en: `question`, `hintText`, `explanation`, `microActivity` (Expressões); `task` dos Ditados;
  `meaning.pt`/`explanation` sem overlay aparecem em português no site em inglês.
- `ch.verify` = "Vérifier" nos dois idiomas (`fr/app.js:6930, 7108`): francês fixo no botão.
- Hardcoded em português: `fr/app.js:3564` (ordenar), `3933` ("pts" no Speed), `shared/core/estado-trilha-desafios.js:872` ("Combo x"), `aria-label="Fechar"` em `fr/index.html:6337`.
- Enter global não conhece `challenge-complete-btn`, `mc-continue-btn`, `cloze-continue-btn`, `cg-next`.
- Checkpoint de módulo e Teste de Nível usam a moldura da trilha mas outro formato (sem "Não sei", sem painel, "Próxima →").
- Jogos: sem `lesson_complete` nem registro de estudo do dia ao terminar; handler 1/2 não respeita modal aberto. Prática: barra mede verbos corrigidos.
- Intencional (não mexer sem a autora): sem XP nos Jogos; Errei/Difícil/Bom/Fácil da Revisão; Modo aula do Banco (ferramenta da professora).

## Plano em etapas (cada uma só com aprovação da autora)
- A: comando no idioma do site (rótulo `fr.exercise.whatMeans` em Expressões; revisar rótulos dos outros Desafios e `ch.verify`).
- B: padronizar Jogos (X + barra no topo, ⌨️, badge 1-2, "Não sei", Enter).
- C: revisão do Expressões (auditoria + protótipo antes de codar).
- D (a decidir): Desafios restantes, Ditados e Revisão.

## Entregue (branch `claude/peaceful-hypatia-a9vfca`, sem PR até 2026-10-26)
- **Revisar erros**: categorias não ficam mais junto do player (`openChallengePlayer`). Teste `tests/desafios-revisar-erros/`.
- **A** (comando no idioma do site): Expressões usa o rótulo `fr.exercise.whatMeans`; `ch.verify` = Verificar/Check; dica do ordenar e pontos do Speed via `t()`.
  Teste `tests/desafios-comando-idioma/`. "Combo x" ficou (palavra igual em pt e en). `zh/app.js` ainda tem "pts" fixo.
- **B** (Jogos) e **B2** (Prática da Conjugação): topo no molde da trilha (cabeçalho, depois a barra com progresso, ⚑, ⌨️, ✕; helpers
  `activityBarGrab/Mount/Progress` em `shared/activity-focus.js`), respostas 1/2, "Não sei", "Continuar →", som e tremida no erro, dia de estudo
  contado ao terminar (sem XP). Testes `tests/jogos-padrao-trilha/`, `tests/conjugacao/`, `tests/modo-foco/`.
- **C** (Expressões em passos, variante B "Meu palpite" sem correção): pergunta -> resposta (painel curto) -> "Veja em frases" -> "Sua vez"
  (digitar, "Quase" da trilha, `microActivity.alsoAccept` opcional para variações escritas pelo autor, XP só na 1ª conclusão) -> final
  (Ir além + Concluir/Tentar de novo). Barra do topo só nas Expressões (`data-lesson-bar`). Teste `tests/desafios-expressoes-passos/`.
  Protótipos: `docs/prototipos/expressoes/`.
- Falta: "Veja em frases" mais rico (a autora pediu sugestões), outros tipos de Desafios, Ditados e Revisão (a autoavaliação e o Modo aula não mudam),
  traduzir os campos de conteúdo (explicação, exemplos, microatividade) para o site em inglês.

## Não verificado
Layout real no navegador, quantidade de desafios sem overlay em en, banco Supabase, `zh/` (Desafios e Jogos só existem no fr).
