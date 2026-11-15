-- Corrige "je ai" nas frases da "Sua vez" das Expressões (2026-11-10, pedido da autora).
-- A frase montada saía "je ai soif" / "je ai la gueule de bois" (faltava a elisão j'ai). Agora o espaço em branco
-- vem ANTES do "je" e a resposta é "j'ai ...". Só mexe em microActivity.prompt e .answer; com guarda (só atualiza se
-- ainda estiver o valor antigo), então rodar duas vezes não faz nada.
-- Valores antigos (para desfazer):
--   expr-001    prompt "Hier soir, j'ai trop bu à la fête, alors ce matin, je __________ et je ne veux pas sortir." | answer "ai la gueule de bois"
--   expr-a1-002 prompt "J'ai couru 5 kilomètres, maintenant je __________."                                          | answer "ai soif"
update public.challenges
set data = jsonb_set(jsonb_set(data, '{microActivity,prompt}', to_jsonb('Hier soir, j''ai trop bu à la fête, alors ce matin, __________ et je ne veux pas sortir.'::text)),
                     '{microActivity,answer}', to_jsonb('j''ai la gueule de bois'::text))
where id = 'expr-001' and data->'microActivity'->>'answer' = 'ai la gueule de bois';

update public.challenges
set data = jsonb_set(jsonb_set(data, '{microActivity,prompt}', to_jsonb('J''ai couru 5 kilomètres, maintenant __________.'::text)),
                     '{microActivity,answer}', to_jsonb('j''ai soif'::text))
where id = 'expr-a1-002' and data->'microActivity'->>'answer' = 'ai soif';
