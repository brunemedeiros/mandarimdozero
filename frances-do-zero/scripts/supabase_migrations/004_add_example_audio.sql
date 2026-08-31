-- Adiciona o áudio do Exemple 1 aos 3 desafios de expressão já existentes
-- (expr-001/002/003) -- antes só o Exemple 2 tinha áudio; a tela de
-- feedback agora mostra os dois juntos, então os dois precisam.
--
-- Áudios gerados e commitados em audio/challenges/ (mesmo pipeline TTS
-- validado do resto do site). Seguro rodar mais de uma vez -- jsonb_set
-- sempre escreve o mesmo valor.
update public.challenges
set data = jsonb_set(data, '{example,audioFile}', '"762913bfed75.mp3"'::jsonb)
where id = 'expr-001';

update public.challenges
set data = jsonb_set(data, '{example,audioFile}', '"28f231d74669.mp3"'::jsonb)
where id = 'expr-002';

update public.challenges
set data = jsonb_set(data, '{example,audioFile}', '"7cce197a5106.mp3"'::jsonb)
where id = 'expr-003';
