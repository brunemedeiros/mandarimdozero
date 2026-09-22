-- Fase 8c do sistema de alunas particulares (ver CLAUDE.md) -- "completar
-- a frase": quarto formato opcional em teacher_flashcards, mesmo padrão
-- aditivo da Fase 8a (imagem/áudio/múltipla escolha) -- nunca uma tabela
-- nova, sempre uma extensão da MESMA biblioteca de cartões.
--
-- cloze_sentence: a frase com a lacuna marcada literalmente como "___"
-- (3 underscores), ex: "Je ___ de Paris.". cloze_answer: a(s) resposta(s)
-- certa(s) (aceita "/" pra mais de uma forma, mesma convenção de
-- acceptedForms() já usada nos exercícios digitados da trilha).
-- cloze_answer_pinyin: só relevante pro zh (mandarim) -- o que a aluna
-- efetivamente DIGITA (pinyin, não hanzi -- teclado latino não digita
-- hanzi, mesma razão pela qual os exercícios de digitar da trilha zh já
-- pedem pinyin, não hanzi). Pro fr, fica sempre null.
alter table teacher_flashcards
  add column if not exists cloze_sentence text,
  add column if not exists cloze_answer text,
  add column if not exists cloze_answer_pinyin text;
