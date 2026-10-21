# Regras do currículo (vivas)

Regras de conteúdo e de sequência decididas pela dona. Cada regra vale para fr, zh e pt, salvo nota. Atualizar a cada decisão nova.

1. **Formal e informal juntos.** Nunca ensinar só a forma formal ou só a informal de uma mesma coisa (ex.: *s'il vous plaît* e *s'il te plaît*). No mesmo cartão (par) ou em
   dois cartões seguidos. (2026-10-18)
2. **Unidades por função comunicativa**, não por tema nem por ordem de criação (`08`).
3. **Gramática**: uma unidade de gramática = um conceito (ou conceitos muito ligados); conteúdo pequeno ligado ao vocabulário vira nota; um tópico pode aparecer informal cedo e ser
   sistematizado depois (espiral); o aluno nunca volta a lição anterior (`10`).
4. **Notas**: uma ideia por nota, curtas, sem teto de tamanho nem de quantidade; na primeira aparição só uma nota breve da frase que acabou de aparecer; a explicação completa vive na unidade
   de gramática; mesmo conceito com outro conteúdo ou estrutura mais difícil = nota nova mais breve; V/F depois da nota (sem pular, sem XP); o Ponto de verificação não usa notas (`14`).
5. **Feedback dos exercícios**: padrão único com frase correta + tradução + áudio; erro de digitação marca letras (`13`).
6. **Pronúncia**: a prática vem logo depois da lição que introduz o fenômeno, nunca como atalho que tire o aluno da lição; sempre que o texto disser que dois sons são iguais ou
   diferentes, mostrar os dois lados com áudio (`12`).
7. **Sem IPA** para o aluno (pt); respelling por idioma do site quando preciso.
8. **Pronúncia: lição só com conteúdo suficiente; com uma ou duas frases é nota de pronúncia** (ex.: *Ça va ?* x *Ça va.*), na mesma caixa das demais notas. Tipos de nota: explicação, realidade, cultural e pronúncia. (2026-10-18)
9. **Pronomes tônicos** entram cedo, junto do formal e do informal (*moi, toi, vous* na M1.2) e são ampliados depois (*lui, elle*, M1.4; com preposições mais adiante). (2026-10-18)

10. **Título das unidades de gramática** (dona, 2026-10-19): sempre "Gramática: <assunto curto>", em todos os níveis e em todos os cursos (fr, zh, pt), sem subtítulo explicativo. O assunto fica no título; o que a unidade ensina fica no "Consigo...".

11. **Mudou ordem, tema, módulo, nível ou conteúdo de um item? Revisar o que ele ensina e rodar o `auditor-curricular`** (dona, 2026-10-19): ao mover uma unidade, as palavras, frases, diálogos, notas e exercícios dela são reavaliados para a nova posição (nada de usar palavra ainda não ensinada, nada do tema antigo sobrando) e o agente `.claude/agents/auditor-curricular.md` confere em paralelo. Além disso, **uma auditoria pedagógica completa do A1 e do A2 antes da implementação real**.

12. **Nota (grátis) x unidade de gramática (Premium): equidade para quem não paga** (dona, 2026-10-19). As **notas**, breves ou longas, ficam dentro das lições e são **sempre gratuitas**. As **unidades de gramática são Premium por natureza**.
    - Nota breve: ensina pontualmente uma regra ou pequena novidade sem pesar a lição; **não gera cartão de revisão nem entra nos Pontos de verificação** (não garante fixação).
    - Unidade de gramática: mais robusta, com **reconhecimento, sistematização e produção** das variantes e regras, e com efeito mais forte para o Premium.
    - **Consequência de projeto:** nunca tirar um conceito das notas e deixá-lo SÓ numa unidade de gramática. Todo conceito de uma gramática precisa ter antes a sua **versão gratuita** (nota breve ou formulação clara dentro de uma lição de vocabulário) para o aluno gratuito conseguir seguir a trilha; a gramática Premium **sistematiza e treina**, não é a única porta de entrada. Ao decidir "vira nota" ou "vira gramática", considerar sempre o usuário gratuito.
    - **Conclusão com paywall ligado: opção A** (dona, decisão 125, revisa a 46): o aluno gratuito conclui módulo e nível **sem** as unidades de gramática; o Ponto de
      verificação do módulo cobra dele só o que pôde estudar (palavras, frases, escuta) e, do Premium, também a gramática. Falta implementar (`moduleCompleted`,
      `levelCompleted`, Ponto de verificação e teste; `08 v2` seções 5 e 7).
    - **Coluna "Versão grátis"** no mapa (decisões 126 e 134): cada gramática do A1 e do A2 mostra onde está a sua versão gratuita (posição + gancho). Nota grátis nunca diz que
      "a gramática já mostrou" (o gratuito não viu). O texto das notas novas só se escreve módulo a módulo, aprovado pela dona.
    - Hoje não há bloqueio de gramática no código (auditoria de 2026-10-19): tratar isto como regra de produto até a implementação.

13. **Conjunto aberto: no máximo 10 palavras por unidade** (dona, 2026-10-19/21, decisões 45 e 129). O excedente vira **nota de vocabulário** na mesma unidade (como "Outros
    materiais"). Só conjunto fechado (números, dias, meses, horas) passa de 10, com 4 lições + Revisão da unidade. Em aberto com a dona (decisão 137): se vale para o A2
    e as exceções do A1 (M1.2 11, M2.3 12; M3.1, M3.3 e M4.1 chamadas de "fechadas").

14. **Uma palavra, um cartão** (dona, decisão 133): palavra que já é cartão numa unidade aparece nas outras só em frase ou nota, também entre A1 e A2 (o A2 não reensina
    *la poste, la mairie, la banque, la police* nem os números 15, 17 e 112). Mesma forma com sentido novo (*le bureau*: escritório x escrivaninha; *clair*: cor x iluminado)
    entra como frase e nota na 2ª unidade, sem cartão novo, salvo decisão da dona. Aplicações sem decisão nova (decisão 136): *en bois* no A2 M3.1 (*le bois* é do A1 M5.4) e
    *se sentir* no A2 M9.5 (cartão da A2 M4.1) ficam só em frase e nota.
