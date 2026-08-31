// ---------- Desafios: Expressões francesas com contexto em vídeo ----------
// Cada desafio segue: expressão -> vídeo autêntico do YouTube -> hipótese ->
// alternativas -> feedback -> segundo exemplo (flexionado, com TTS) ->
// microatividade. Ver a especificação completa da funcionalidade.
//
// `canonicalExpression` é a forma lexical que o aluno está aprendendo;
// `videoOccurrence` é a forma efetivamente pronunciada no vídeo — nunca a
// mesma coisa quando o vídeo usa uma forma flexionada. Nunca alterar uma
// pra parecer a outra.
//
// `status`:
//   needs_review — gerado automaticamente, ainda não confirmado por um humano
//   approved     — confirmado, mas ainda não visível pro aluno
//   published    — visível pro aluno
//   rejected     — descartado
//
// Só desafios com status "published" aparecem pro aluno.
const CHALLENGES = [
  {
    id: "expr-001",
    type: "expression",
    canonicalExpression: "avoir la gueule de bois",
    level: "B1",
    meaning: {
      fr: "être mal après avoir trop bu de l'alcool",
      pt: "estar de ressaca"
    },
    video: {
      youtubeId: null, // ainda não verificado — ver texto acima
      startTime: null,
      endTime: null,
      spokenOccurrence: null, // forma efetivamente pronunciada no vídeo (diferente de canonicalExpression)
      transcript: null,       // só o trecho relevante, nunca a transcrição inteira do vídeo
      confidence: null,       // 0-1, estimativa do Gemini de que a expressão foi mesmo dita ali
      audioClarity: null,     // "high" | "medium" | "low"
      contextQuality: null,   // "high" | "medium" | "low"
      notes: null             // observação curta do Gemini sobre o trecho
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
      { text: "être très fatigué après un long voyage", correct: false },
      { text: "être mal après avoir trop bu de l'alcool", correct: true },
      { text: "avoir peur de quelque chose", correct: false },
      { text: "être très content d'une bonne nouvelle", correct: false }
    ],
    explanation: "\"Avoir la gueule de bois\" décrit le malaise physique (mal de tête, nausée...) ressenti le lendemain d'avoir trop bu d'alcool.",
    secondExample: {
      text: "Après la fête de samedi, j'avais une énorme gueule de bois le lendemain.",
      audioFile: "e919fd777a3a.mp3"
    },
    microActivity: {
      prompt: "Hier soir, j'ai beaucoup trop bu. Ce matin, j'__________.",
      answer: "j'ai la gueule de bois"
    },
    status: "needs_review"
  }
];
