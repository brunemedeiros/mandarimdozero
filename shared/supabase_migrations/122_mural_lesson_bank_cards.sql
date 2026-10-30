-- 122 -- Aviso da aula no Mural mostra quantos cartões do Banco de Revisão saíram daquela aula (decisão da autora, 2026-10-30).
-- O aluno vê "N cartões desta aula estão na sua Revisão" com o botão Revisar; a professora vê só o número.
-- Contagem ao vivo (como o resto do aviso): itens do Banco do mesmo aluno (ou da mesma turma), mesma professora, idioma e
-- data da aula, aprovados e com cartão ativo. A rotina da madrugada gera os cartões depois da aula; o número aparece sozinho.
-- Só troca _mural_ref (121). Aditiva, sem DROP e sem apagar dado.

create or replace function public._mural_ref(p_kind text, p_ref bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'lesson' then (select jsonb_build_object('id', l.id, 'class_date', l.class_date, 'start_time', l.start_time,
                                                  'topic', l.topic, 'homework', l.homework,
                                                  'bank_cards', (select count(*) from public.review_bank_items i
                                                                   join public.review_bank_students s on s.id = i.bank_student_id
                                                                  where s.teacher_id = l.teacher_id
                                                                    and s.language_app_key = l.language_app_key
                                                                    and (case when l.classroom_id is not null then s.classroom_id = l.classroom_id
                                                                              else s.linked_student_id = l.student_id end)
                                                                    and i.class_date = l.class_date
                                                                    and i.status = 'aprovado'
                                                                    and exists (select 1 from public.teacher_flashcards f
                                                                                 where f.bank_item_id = i.id and f.status = 'active')))
                          from public.teacher_class_logs l where l.id = p_ref)
    when 'material' then (select jsonb_build_object('id', m.id, 'title', m.title, 'description', m.description,
                                                    'link_url', m.link_url, 'has_file', m.file_url is not null, 'file_name', m.file_name)
                            from public.teacher_support_materials m where m.id = p_ref)
  end
$$;
revoke execute on function public._mural_ref(text, bigint) from public, anon, authenticated;
