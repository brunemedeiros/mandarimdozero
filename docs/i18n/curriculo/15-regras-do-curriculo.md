# Regras do currículo (vivas)

Regras de conteúdo e de sequência decididas pela dona. Cada regra vale para fr, zh e pt, salvo nota. Atualizar a cada decisão nova.

1. **Formal e informal juntos.** Nunca ensinar só a forma formal ou só a informal de uma mesma coisa (ex.: *s'il vous plaît* e *s'il te plaît*). No mesmo cartão (par) ou em
   dois cartões seguidos. (2026-10-18)
2. **Unidades por função comunicativa**, não por tema nem por ordem de criação (`08`).
3. **Gramática**: uma unidade de gramática = um conceito (ou conceitos muito ligados); conteúdo pequeno ligado ao vocabulário vira nota; um tópico pode aparecer informal cedo e ser
   sistematizado depois (espiral); o aluno nunca volta a lição anterior (`10`). Exemplo de "conceitos muito ligados": a M7.3 (g) *il y a* e *c'est* + adjetivo, com uma tela
   de contraste (*Il y a un salon. C'est un grand salon.*) (decisão 145).
4. **Notas**: uma ideia por nota, curtas, sem teto de tamanho nem de quantidade; na primeira aparição só uma nota breve da frase que acabou de aparecer; a explicação completa vive na unidade
   de gramática; mesmo conceito com outro conteúdo ou estrutura mais difícil = nota nova mais breve; V/F depois da nota (sem pular, sem XP); o Ponto de verificação não usa notas (`14`).
5. **Feedback dos exercícios**: padrão único com frase correta + tradução + áudio; erro de digitação marca letras (`13`).
6. **Pronúncia**: a prática vem logo depois da lição que introduz o fenômeno, nunca como atalho que tire o aluno da lição; sempre que o texto disser que dois sons são iguais ou
   diferentes, mostrar os dois lados com áudio (`12`).
7. **Sem IPA** para o aluno (pt); respelling por idioma do site quando preciso.
8. **Pronúncia: lição só com conteúdo suficiente; com uma ou duas frases é nota de pronúncia** (ex.: *Ça va ?* x *Ça va.*), na mesma caixa das demais notas. Tipos de nota: explicação, realidade, cultural e pronúncia. (2026-10-18)
9. **Pronomes tônicos** entram cedo, junto do formal e do informal (*moi, toi, vous* na M1.2) e são ampliados depois (*lui, elle*, M1.4; com preposições mais adiante). (2026-10-18)

10. **Título das unidades de gramática** (dona, 2026-10-19): sempre "Gramática: <assunto curto>", em todos os níveis e em todos os cursos (fr, zh, pt), sem subtítulo explicativo. O assunto fica no título; o que a unidade ensina fica no "Consigo...".

11. **Mudou ordem, tema, módulo, nível ou conteúdo de um item? Revisar o que ele ensina e rodar o `auditor-curricular`** (dona, 2026-10-19): ao mover uma unidade, as palavras, frases, diálogos, notas e exercícios dela são reavaliados para a nova posição (nada de usar palavra ainda não ensinada, nada do tema antigo sobrando) e o agente `.claude/agents/auditor-curricular.md` confere em paralelo. Frase com palavra que ainda não é cartão naquela posição é **trocada** (regra "frases só com vocabulário visto"; sem lista de "palavra de frase", decisão 145). **Exceção formal: expressão fixa aceita pela dona** (decisão 171): uma expressão fixa pode ficar em frase antes do cartão da palavra que a contém, entendida como bloco pela tradução da frase (*pour la santé* nas frases publicadas do A1, `A1-11` e `A1-19`; o cartão *la santé* vem na A2 M4.5). A dona estendeu a exceção a **adjetivo ou expressão de uso comum** (decisão 176): *délicieux, cuit, sucrée* nas frases publicadas do A1 (*Le pain est délicieux.*, *Le poulet est délicieux ce soir.*, *L'œuf est cuit.*, *La pomme est rouge et sucrée.*) ficam; os cartões vêm no A2 M5 (*délicieux, sucré, bien cuit* na M5.1; *cuire* na M5.3). Também *prochain* (*La semaine prochaine, je pars en voyage.*, A1 M3.3, e o quadro da gramática A1 M8.4) e *le projet* (*Tu as des projets pour le week-end ?*, A1 M9.1) ficam como expressão de uso comum (decisão 180); os cartões vêm na A2 M6.5. E *garée* (*La voiture est garée devant la maison.*, frase publicada que vai para a A1 M7.5) fica como expressão de uso comum (decisão 188); o cartão *se garer* vem na A2 M8.4. Vale caso a caso, com decisão da dona; palavra solta continua sendo trocada. Além disso, **uma auditoria pedagógica completa do A1 e do A2 antes da implementação real**.

12. **Nota (grátis) x unidade de gramática (Premium): equidade para quem não paga** (dona, 2026-10-19). As **notas**, breves ou longas, ficam dentro das lições e são **sempre gratuitas**. As **unidades de gramática são Premium por natureza**.
    - Nota breve: ensina pontualmente uma regra ou pequena novidade sem pesar a lição; **não gera cartão de revisão nem entra nos Pontos de verificação** (não garante fixação).
    - Unidade de gramática: mais robusta, com **reconhecimento, sistematização e produção** das variantes e regras, e com efeito mais forte para o Premium.
    - **Consequência de projeto:** nunca tirar um conceito das notas e deixá-lo SÓ numa unidade de gramática. Todo conceito de uma gramática precisa ter antes a sua **versão gratuita** (nota breve ou formulação clara dentro de uma lição de vocabulário) para o aluno gratuito conseguir seguir a trilha; a gramática Premium **sistematiza e treina**, não é a única porta de entrada. Ao decidir "vira nota" ou "vira gramática", considerar sempre o usuário gratuito.
    - **Conclusão com paywall ligado: opção A** (dona, decisão 125, revisa a 46): o aluno gratuito conclui módulo e nível **sem** as unidades de gramática; o Ponto de
      verificação do módulo cobra dele só o que pôde estudar (palavras, frases, escuta) e, do Premium, também a gramática. Falta implementar (`moduleCompleted`,
      `levelCompleted`, Ponto de verificação e teste; `08 v2` seções 5 e 7).
    - **Desbloqueio com paywall ligado** (dona, decisão 138): para o gratuito, a unidade de gramática é **pulada** na cadeia de desbloqueio (a seguinte abre), aparece com
      cadeado e a trilha continua; o Teste de Nível segue os Pontos de verificação por plano. Falta implementar (`markUnitCompleted`, `moduleProgressPct`; `08 v2` seção 5).
    - **Coluna "Versão grátis"** no mapa (decisões 126 e 134): cada gramática do A1 e do A2 mostra onde está a sua versão gratuita (posição + gancho). Nota grátis nunca diz que
      "a gramática já mostrou" (o gratuito não viu; confirmada pela dona, decisão 143). O texto das notas novas só se escreve módulo a módulo, aprovado pela dona.
    - Hoje não há bloqueio de gramática no código (auditoria de 2026-10-19): tratar isto como regra de produto até a implementação.

13. **Limite de palavras por unidade** (dona, decisões 45, 129 e 139). O excedente vira **nota de vocabulário** na mesma unidade (como "Outros materiais").
    - **A1**: conjunto aberto com **no máximo 10** palavras. Exceções aceitas como conjuntos naturais (decisão 139): M1.2 (11, por causa de *le prénom*), M3.1 (12, rotina),
      M3.3 (11, dias) e M4.1 (11, comida). Conjunto fechado (números, dias, meses, horas) pode passar de 10, com 4 lições + Revisão da unidade. A M2.3 (aparência) foi
      cortada para 10 (*laid, brun* em nota) e voltou a **11** com *brun* (decisão 147, exceção aceita pela dona; *laid* fica na nota).
    - **A2**: **no máximo 12** palavras por unidade (a "Descrever o caráter", hoje M1.4 pela decisão 154, caiu de 13 para 12).

14. **Uma palavra, um cartão** (dona, decisão 133): palavra que já é cartão numa unidade aparece nas outras só em frase ou nota, também entre A1 e A2 (o A2 não reensina
    *la poste, la mairie, la banque, la police* nem os números 17 e 112; o 15 e o 18 só entram no A2 M4.3, decisão 141). Mesma forma com sentido novo (*le bureau*: escritório x escrivaninha; *clair*: cor x iluminado)
    entra como frase e nota na 2ª unidade, sem cartão novo, salvo decisão da dona (confirmado pela dona, decisão 144). Aplicações sem decisão nova (decisão 136): *en bois* no A2 M3.1 (*le bois* é do A1 M5.4) e
    *se sentir* no A2 M9.5 (cartão da A2 M4.1) ficam só em frase e nota. Decisões 152 a 156 (2026-10-21): *le verre* tem um cartão só (A1 M4.5, "copo"; "vidro" e
    *en verre* em nota e frase na A1 M5.4); *d'habitude* (A1 M3.6) sai da A2 M1.1 (entra *le goûter*); *calme, bruyant, moderne, ancien* (A1 M7.2) não ganham cartão
    na A2 M1.3, só frase e diálogo; *sérieux* tem cartão só na A2 M1.4 (a A2 M7.2 usa em frase).
    **Deduplicação do A2** (decisão 157, 2026-10-22): o **primeiro cartão fica**, as outras unidades usam em frase ou nota e **cada unidade que perde um cartão ganha uma
    palavra nova no lugar** (sem repetir cartão de outra unidade; as palavras novas foram aprovadas pela dona, decisão 162): *le quartier, la circulation, la nature* (A2 M1.3), *blessé / blessée* e
    *les pompiers* (A2 M2.5), *propre* (A1 M7.2), *l'église* (A1 M6.3); *cher / chère* (querido) só em nota na A2 M9.3; *la forme* e *être en forme* sem cartão na A2 M4.5
    (nota). Lexemas diferentes com a mesma raiz ficam com os dois cartões (*goûter*, verbo, A2 M5.5; *le goûter*, lanche, A2 M1.1). Uma palavra com dois sentidos pode ser um
    cartão só com os dois (*voler*: roubar e voar; *arriver*: chegar e acontecer, A2 M2.5; decisão 158). *en bois* e *en verre* ficam só em frase na A2 M3.1 (*le bois* e *le verre* são cartões do A1); os cartões de material da M3.1 são *le métal* e *le plastique*, com
    *en métal, en plastique* em frase (decisão 163, fecha a pendência *en verre*).
    A2 M4 (decisões 167, 168 e 171): *la santé* e *se détendre* têm cartão só na A2 M4.5 (*la santé* aparece antes só na expressão fixa *pour la santé*, em 2 frases publicadas do A1: exceção da regra 11, decisão 171);
    *gagner* fica fora da M4.5 (repetiria o sentido de "ganhar dinheiro" do A2 M7); *la carte Vitale* (A2 M4.2) contém o cartão *la carte* do A1 sem ser a mesma palavra.
    A2 M5 (decisão 172): *sentir* (cheirar, A2 M5.5) e *se sentir* (sentir-se, A2 M4.1) são verbos diferentes com a mesma forma e ficam com os dois cartões, com nota na
    M5.5; *la réservation* x *réserver*, *salé* x *le sel*, *sucré* x *le sucre*, *bien cuit* x *cuire* são lexemas diferentes (dois cartões); *bleu* (ponto da carne) só em nota
    na A2 M5.1 (o cartão é a cor, A1 M2.3); *trop, assez* + adjetivo só em nota na A2 M5.1 (os cartões do A1 M4.3 são *trop de, assez de*).
    A2 M6 (decisão 177): *le bac* entra no lugar de *la note* (a nota escolar só em frase); *s'inscrire* tem cartão só na A2 M6.1 (a A2 M7.5 usa em frase); *la matière*
    (disciplina, A2 M6.1) é o único cartão da forma (a "matéria" da A2 M3.1 é só a função da unidade); *prochain* não é cartão do A1 e fica na A2 M6.5; *l'échange*
    (A2 M6.3) x *échanger* (A2 M3.3) e *les études* (A2 M6.1) x *l'étudiant* (A1 M1.6) são lexemas diferentes (dois cartões).
    A2 M7 (decisão 181): *la pièce jointe* e *le permis de conduire* têm cartão só na A2 M7.5 (a A2 M9 e a A2 M8.4 usam em frase; nenhuma delas os tinha como cartão,
    então ninguém perde palavra); *la banque, la poste, la mairie* (A1 M6.3) e *s'inscrire* (A2 M6.1) só em frase no M7; *les congés* é cartão da A2 M7.1 e a nota cultural
    *congés payés* fica na A1 M8.3; *le poste* (cargo) x *la poste* (correio), *le boulot* x *le travail* (A1 M1.6), *le code* (senha) x *le code postal* (só nota da A1 M7.1),
    *prêter* x *emprunter* e *économiser* x *les économies* são palavras ou lexemas diferentes (dois cartões).
    A2 M8 (decisão 184): nenhuma das 48 palavras é cartão em outra unidade (nenhuma troca); *lumineux* tem cartão só na A2 M8.1 e a A1 M7.2 fica sem *lumineux* e sem
    *spacieux* (*clair* = "iluminado" segue só em frase e nota lá); *l'avis* (aviso, A2 M8.5) x *à mon avis* (só nota da A2 M3.5) e *sale* x *la salle de bain* são palavras
    diferentes; *fumer* tem cartão só na A2 M8.5.
    A2 M9 (decisões 189 e 190): *allô* e *bisous* não têm cartão no A2 (já têm nota no A1 M5.1 e M8.3) e ficam só em frase; a A2 M9.1 fica com 11 e a A2 M9.3
    ganha *confirmer* no lugar de *bisous* (a revisar pela dona); *l'ordinateur* e *l'écran* têm cartão só na A2 M9.6 (nenhuma outra unidade os tem); *cordialement* (A2 M3.3),
    *se sentir* (A2 M4.1) e *la pièce jointe* (A2 M7.5) só em frase ou nota no M9; *rappeler* x *appeler* (A1 M8.6), *joindre* x *la pièce jointe*, *félicitations* x
    *féliciter* e *la publication* x *publier* são lexemas diferentes (dois cartões).
