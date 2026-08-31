-- Corrige o "à vous de jouer" de expr-001 ("avoir la gueule de bois"): a
-- frase gerada automaticamente confundia "bu" (bebido) com "plu" (chovido)
-- -- sons parecidos, mas sem nexo semântico ("choveu, por isso hoje estou
-- de ressaca" não faz sentido).
--
-- Seguro rodar independente da ordem: se 002 ainda não rodou, este UPDATE
-- simplesmente não encontra a linha e não faz nada; se já rodou (com o
-- texto antigo), corrige o valor gravado.
update public.challenges
set data = jsonb_set(
  data,
  '{microActivity}',
  '{"prompt": "Hier soir, j''ai trop bu à la fête, alors ce matin, je __________ et je ne veux pas sortir.", "answer": "ai la gueule de bois"}'::jsonb
)
where id = 'expr-001';
