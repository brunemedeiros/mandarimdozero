# Decisões da dona depois de ver a maquete do módulo 1 (2026-10-18)

Fonte: retorno da dona sobre a maquete (`maquete-m1/`, artifact privado) e sobre o preview (`09`). Itens marcados **[a fazer]** entram na
maquete v2; **[padrão]** viram regra de interface; **[pendência]** ficam registrados no `CLAUDE.md` ("Pendências da autora").

## Diálogo
1. **Proposta aprovada:** balão neutro à esquerda (mensagem recebida), azul à direita (enviada), nome colorido acima do balão da esquerda.
2. **Botões por fala:** 🔊 e 🌐 (44 px) abaixo do balão, **mantendo** "Ouvir tudo" e "Mostrar traduções" no alto.
3. **SEM seletor "quem fica à direita".** O diálogo é entre duas pessoas que não são o aluno; o falante A fica sempre à esquerda e o B à direita.
   Só se o aluno participar do diálogo (ideia futura) ele ficaria à direita, sem seletor. (A ideia do seletor era minha e foi retirada.)
4. **Palavra nova no diálogo:** no desktop, **hover** (em vez de aviso ao tocar), e o balão com o significado **fica fixo** até o aluno clicar em
   outra parte da tela. No celular, toque abre o mesmo balão. [a fazer]

## Lâmpada 💡
5. O **contador some depois do primeiro clique**, mas a lâmpada continua abrindo as notas (só não fica o contador distraindo). Uma nota nova
   (ou ainda não vista) volta a acender o contador. [a fazer]

## Padrão de feedback dos exercícios (referência: Busuu, captura enviada pela dona)
6. **[padrão]** Em TODO exercício (digitar, clicar, ouvir, conjugar), depois da resposta, certa **ou** errada, o painel de resposta mostra: estado
   ("Bom trabalho!", "Quase", "Resposta correta"), a **frase correta em francês com áudio** e a **tradução** logo abaixo. Hoje isso só acontece no
   "Ponto de verificação: a frase nova"; deve valer em "Praticando: digite o que ouviu", em "Você entendeu?" (3 checagens), nos exercícios de digitar
   das gramáticas e nos demais. Digitar a resposta certa não prova que o aluno sabe o significado: a tradução precisa estar sempre visível.
7. **[padrão]** Erro de digitação ou de conjugação: além da caixa vermelha com a resposta, **marcar em vermelho as letras erradas ou o que faltou**
   (diferença letra a letra), como o ditado já faz palavra a palavra.
8. Estudo do código e proposta do componente único: `13-padrao-feedback-exercicios.md` (em andamento).

## Som
9. **Remover o selo de som na palavra** (clicar nele tirava o aluno da lição e o jogava numa lição de som). No lugar, uma **nota curta logo depois
   da palavra** (ex.: depois de *ans*, a nota da ligação *deux‿ans*, *trois‿ans*). [a fazer]
10. A lição/exercício de som vem **logo depois da lição em andamento, na ordem da trilha**; nunca um atalho que tire o aluno de uma lição. [padrão]
11. **Áudio da pergunta que sobe e da afirmação que desce:** na maquete as duas saíram iguais (voz do navegador, não o áudio real). Risco real: o TTS
    (Chirp 3 HD) pode não variar a entonação. Antes de publicar, **testar** "Ça va ?" x "Ça va." no laboratório de áudio do fr e, se não variar,
    usar frases-modelo gravadas/ajustadas. [pendência técnica]
12. Nos exercícios do "Som do módulo" que dizem "ouça as duas em seguida", **faltou o botão de áudio** (erro da maquete). [a fazer]
13. **"Grave e compare":** implementar já de forma básica, **sem correção** (o aluno grava, ouve a si mesmo e o modelo). No futuro, uma API de
    avaliação de pronúncia. Observação minha: a avaliação de pronúncia com nota por som que encontrei é a do **Azure** (fr-FR); não confirmei
    que o Google ofereça equivalente, só reconhecimento de fala (confiança **média**). Decidir quando chegar a hora (custo e Premium).

## M1.5 (g) être e avoir
14. Hoje só algumas formas têm áudio (as que estavam em frases: *je suis, j'ai, il a, elle est*). **Botão 🔊 ao lado de cada conjugação (fora da caixa)**
    que toca pronome + verbo. Sugestão minha, a confirmar: um botão "Ouvir a conjugação toda" que toca as seis em sequência, destacando cada uma,
    porque depender de 6 cliques não ensina o ritmo. [a fazer]

## M1.6 / M1.7
15. **Nota cultural na M1.6 sobre *la féminisation des noms de métier***: *l'auteur / l'auteure / l'autrice*, *Madame le président / Madame la
    présidente*, etc. Estava citada de passagem na M1.7 e é relevante demais para isso. Nota nova, com **nível de confiança** declarado e
    revisão da dona antes de publicar (regra das notas de realidade). [a fazer]

## Défi de fim de módulo
16. **ARQUIVADO por enquanto**, com tudo o que foi produzido preservado: `07-atividades-finais-defi.md` e as telas do défi em `maquete-m1/` e no
    `09`. Motivo: não pode coincidir com as funções do **Ponto de verificação** e dos **Desafios**; deve ser algo mais claramente voltado ao
    **DELF**. Retomar depois. [pendência]
17. A ideia de **criar um diálogo e gravar uma apresentação** (ou **gravar uma habilidade exigida no fim de um módulo**) é interessante e **não deve
    ficar restrita a uma seção**: explorar depois como recurso geral. [pendência]

## Pendências registradas
- Retomar as atividades finais/défi, ligadas ao DELF, sem sobrepor Ponto de verificação e Desafios (arquivo `07` + maquete).
- Explorar gravação de apresentação/diálogo/habilidade como recurso geral de fim de módulo.
- Testar a entonação de pergunta x afirmação no TTS do francês antes de publicar a lição de som.
- Corretor de pronúncia (API) no "Grave e compare": avaliar custo e Premium no futuro.

---

# Segunda rodada de ajustes da maquete (2026-10-18, depois da maquete v2)

## Áudio e botões
18. **"Ouvir tudo" (diálogo) e "Ouvir a conjugação toda" (M1.5 g) precisam de botão de PAUSAR**, para o caso de o aluno clicar por acidente. [padrão]

## Diálogo
19. Manter o **nome dos personagens**: o nome fica **abaixo do avatar**, como já existia. Se o diálogo é para o aluno agir como ele mesmo, o lado direito mostra o avatar, ícone ou
    iniciais dele com **"Você"** (en: **"You"**) embaixo do avatar. [a fazer]

## Pronúncia (antes "Som")
20. A faixa e a lição **"Som" passam a se chamar "Pronúncia"** (en: **Pronunciation**), inclusive "Pronúncia do módulo". [a fazer]
21. A prática de pronúncia fica **só na M1.7 (g)**, com masculino e feminino das nacionalidades. Sai a linha curta de som que a maquete v2 pôs na M1.3. [a fazer]

## Painel de resposta
22. **[padrão] Regra geral: o painel de resposta fica preso ao pé da tela, mas nunca se sobrepõe a outro elemento nem os esconde.** Implementação: a área da lição reserva
    espaço embaixo igual à altura do painel (a rolagem chega até o último elemento, como o botão "← Voltar", sempre acima do painel). Com zoom alto ou tela baixa, o painel passa a
    fazer parte do fluxo (deixa de ser fixo). [a fazer na maquete; entra na especificação do componente do `13`]

## Notas
23. **Visual único para as notas curtas** ("Vale entender isso"): "Moi, je m'appelle Ana. Et toi ?" e "Et lui ? Et elle ?" estavam com visuais diferentes. Uma nota é um só
    componente visual, com variações só de tipo (explicação, realidade, cultural). [a fazer / padrão]

## M1.7 (g) masculino e feminino
24. A caixa "iguais, ou diferentes só na escrita" não faz sentido. Trocar por **"Escritas diferentes, mas sons iguais"**. [a fazer]
25. **Sempre que o texto disser que dois sons são iguais ou diferentes, mostrar os dois lados com áudio** (a versão masculina e a feminina lado a lado, cada uma com 🔊),
    para o aluno poder conferir. Hoje a tela não mostra o masculino para comparar. [padrão]

## Nota N02
26. **N02 fica COMO ESTÁ** (decisão da dona): o aluno precisa conhecer *s'il vous plaît* e também *s'il te plaît*, então a menção ao *tu* no parêntese faz sentido na M1.1.
    Observação de conteúdo: hoje o vocabulário da A1-1 só tem *s'il vous plaît*; *s'il te plaît* aparece só na nota. Pergunta aberta para a dona: pôr *s'il vous plaît / s'il te plaît*
    como cartão em par (formal / informal) no vocabulário da M1.1?
