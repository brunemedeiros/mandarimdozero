# Decisões sobre as notas da trilha (grilling, rodadas 1 e 2; dona, 2026-10-18)

Base de fatos: `11-inventario-notas.md`. Sequência: rodada 1 (tipos, onde aparecem, V/F, notas curtas), rodada 2 (plano de repetição, lâmpada, texto).
Cada item vale como regra de conteúdo/interface, até a dona mudar.

## Tipos e função
- Três tipos: **explicação** (ensina regra), **realidade** (forma ensinada x forma real) e **cultural** (fato isolado). Uma ideia por nota; só entra se
  responde à palavra ensinada naquele momento. "Nota de gramática" = nota de explicação.
- **Notas curtas por preferência, sem teto de tamanho.** Referência de estilo: telas de "síntese" do Busuu (a dona pode mandar o exemplo).
- **Sem teto de quantidade por lição** (decisão da dona; o limite tornaria a posição e a ordem das notas não naturais). Em vez de teto, um **padrão**:
  a nota aparece no ponto exato do fluxo em que o conceito surge e o texto traz só o necessário, para não entregar informação demais de uma vez.
  O popover da lâmpada tem **scroll**.

## Repetição (a regra da dona, que corrige a proposta anterior)
- Não existe nota igual duas vezes. Um conceito que volta com **outro conteúdo ou estrutura mais difícil** ganha **nota nova, mais breve**.
- **Não há nota completa no começo.** Na primeira aparição de um conceito, a nota é **breve e fala só da frase que acabou de aparecer**: o aluno ainda
  não viu o conteúdo todo. A explicação **completa** vive na **unidade de gramática** do assunto. (Ex.: a pergunta com a palavra no fim, *in situ*:
  nota breve na M1.2 sobre *Tu t'appelles comment ?*; a sistematização fica na unidade de pergunta e negação.)
- Formato da nota breve: título que mostra a forma real + poucas palavras + 1 exemplo com áudio; sem "você já viu na unidade X".
- Cortes e movimentos propostos no `11` (N30 e N36 cortadas; N09 vai para M5.1) seguem aprovados, agora lidos como "nota breve ou absorvida".

## Verdadeiro/falso depois da nota
- Para notas de **explicação e de realidade** (cultural não leva). É um **mini-passo da lição**, **sem pular**, sem XP e sem efeito na memória; certa ou errada,
  a resposta mostra a **mesma explicação resumida**. Nas notas de gramática coloquial a afirmação só pede para **reconhecer** a forma, nunca produzi-la.
- Não vira cartão e não entra no FSRS. O Ponto de verificação **não** puxa conteúdo das notas.
- Tudo **grátis** (notas, lâmpada e V/F fazem parte da trilha).

## Lâmpada 💡
- Fica na barra do topo da lição, ao lado da ⚑ de report. Mostra **somente as notas da lição atual**; nunca de outra lição ou unidade já vistas.
  No **Ponto de verificação** (lição sem nota), mostra as notas **da unidade**. Na **revisão de lição**, uma nota já vista não reabre no fluxo: fica só na lâmpada.
- O contador some depois do 1º clique; nota nova (ou ainda não vista) acende de novo. Em **unidade já concluída**, nota nova aparece com sinal "nova", sem refazer lição.
- "Nota vista" é guardada no progresso (global por id da nota, com data, sem migration). Isso só registra **que** a nota foi vista: o filtro da lâmpada continua por lição.

## Âncora e gatilhos
- Gatilho por **chave estável** (`afterKey`) no fr, convertido por script na Etapa 0b-parte 2; zh como está. Corrigir os 3 gatilhos errados (N21, N23, N38) e a ordem de exibição (N36 antes de N37).

## Texto
- Trocar "pra" por "para" nas 21 notas e nos 4 V/F, e os ajustes pontuais N19, N31, N44, N15, N17, N09: **aprovados em lote**, com lista antes e depois para conferência.
- Nota nova da M1.1: "Letras que ficam **mudas** no fim" (não "caladas").
- **N33 (*à vélo*):** a forma correta é **à vélo**; *en vélo* é comum na fala, mas considerado incorreto, porque *en* se reserva a veículos fechados ou nos
  quais a pessoa se instala no interior. Nota de realidade; fonte: a dona (confiança **alta**).
- **Nota da M1.3 (liaison):** corrigir para o **x** de *deux* (o x faz o som [z] na ligação: *deux‿ans*), não "s".
- N02: meia frase sobre *tu* antes da M1.2 (a confirmar na rodada 3).

## Pendente (rodada 3)
- Notas do A2 (quantidade, tipos; gíria familiar só do A2 em diante), quem escreve e revisa os V/F de cada nota nova, e como as notas entram no mapa final.
