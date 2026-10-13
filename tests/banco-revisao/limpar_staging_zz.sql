-- Limpa do STAGING os dados do teste ao vivo da rotina automática (alunos "ZZ ...", cartões, rodadas, deck e vínculo de teste).
-- Colar no SQL Editor do Staging (ilfjzizjfcmhibkhwber), NUNCA na produção. Só apaga linhas criadas pelo teste.
begin;
delete from public.teacher_flashcards where teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972' and bank_item_id is not null;
delete from public.review_bank_students where teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972' and name like 'ZZ %';
delete from public.review_bank_agent_runs where teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972';
delete from public.review_bank_settings where teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972';
delete from public.decks where kind = 'teacher_root' and teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972' and owner_id = '1403fbd4-d0f8-4127-84d7-2b72e68ba022';
delete from public.teacher_students where teacher_id = '02bd4956-c8f4-4705-84f3-7b2b18831972' and student_id = '1403fbd4-d0f8-4127-84d7-2b72e68ba022';
-- esperado depois: roster 0, itens 0, cartões 0, rodadas 0, settings 0, vínculos 0, decks 6
select (select count(*) from public.review_bank_students) roster, (select count(*) from public.review_bank_items) itens,
       (select count(*) from public.teacher_flashcards) cartoes, (select count(*) from public.review_bank_agent_runs) rodadas,
       (select count(*) from public.review_bank_settings) settings, (select count(*) from public.teacher_students) vinculos, (select count(*) from public.decks) decks;
commit;
