-- 106 (SQL Editor) -- Avisos do Mural e do convite em inglês: acabamento da 104 (2026-10-15).
--
-- POR QUE ESTE ARQUIVO NÃO RECRIA mural_create_post, mural_add_comment, join_classroom_code NEM mural_set_classroom_members
-- (achado T2 de docs/i18n/e6-minimo-servidor-pt.md): a 104 (aplicada no Staging e na produção em 2026-10-15) já resolveu o
-- problema um nível acima. _mural_notify e _teacher_notify reconhecem as frases em português e gravam a versão em inglês
-- quando quem RECEBE usa o site em inglês, e isso vale para o idioma `portugues` também (todo aluno de português usa o site em
-- inglês). Recriar as quatro funções (a mural_set_classroom_members tem DELETE, por isso este arquivo iria pelo SQL Editor)
-- obrigaria a copiar ~150 linhas da 087 e pisar em qualquer ajuste posterior de outra conversa, sem ganho de comportamento.
-- Conferido no teste local (tests/avisos-idioma/test_106.sql): aviso do Mural de turma de português chega em inglês.
--
-- O que sobra e este arquivo corrige: quando o perfil de quem age não tem nome nem @, _teacher_display_name devolve a palavra
-- 'Professora', e a 104 deixava essa palavra solta na frase em inglês ("Professora posted on the board"). Agora ela vira
-- "Your teacher" (quando quem age é a professora) ou "A student" (quando quem age é o aluno). Só troca _notif_text_en
-- (create or replace, mesma assinatura e mesmos grants); nenhuma linha existente muda; sem DROP e sem DELETE, então a
-- ferramenta de migration também aplicaria, mas a dona pode colar aqui mesmo (Staging primeiro). Pode rodar de novo.
-- ROLLBACK: colar de novo a definição de _notif_text_en da 104 e fazer drop function public._who_en(text, text).

begin;

create or replace function public._who_en(p_name text, p_generic text)
returns text
language sql
immutable
set search_path = public
as $$ select case when p_name = 'Professora' then p_generic else p_name end $$;
revoke all on function public._who_en(text, text) from public, anon, authenticated;

-- Frase pronta em português -> inglês. null = frase desconhecida.
create or replace function public._notif_text_en(p_event text, p_body text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  m text[];
  b text := coalesce(p_body, '');
  n text;
begin
  if p_event = 'mural_post' then
    m := regexp_match(b, '^📌 (.+?) postou no mural(?: \(turma (.+?)\))?: (.*)$', 's');
    if m is not null then
      return '📌 ' || public._who_en(m[1], 'Your teacher') || ' posted on the board' || coalesce(' (class ' || m[2] || ')', '') || ': ' || m[3];
    end if;
  elsif p_event = 'mural_comment' then
    m := regexp_match(b, '^💬 (.+?) comentou no mural: (.*)$', 's');
    if m is not null then return '💬 ' || public._who_en(m[1], 'Your teacher') || ' commented on the board: ' || m[2]; end if;
  elsif p_event = 'mural_classroom' then
    m := regexp_match(b, '^🏫 (.+?) colocou você na turma (.*)\.$', 's');
    if m is not null then return '🏫 ' || public._who_en(m[1], 'Your teacher') || ' added you to the class ' || m[2] || '.'; end if;
  elsif p_event = 'mural_classroom_join' then
    m := regexp_match(b, '^🏫 (.+?) entrou pelo link na turma (.+?)(?: e agora é seu aluno/a de (francês|chinês|português))? 🎉$', 's');
    if m is not null then
      return '🏫 ' || public._who_en(m[1], 'A student') || ' joined the class ' || m[2] || ' through your link'
        || coalesce(' and is now your ' || _lang_label_en(m[3]) || ' student', '') || ' 🎉';
    end if;
  elsif p_event = 'teacher_invite_accepted' then
    m := regexp_match(b, '^(.+?) entrou pelo seu link e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return public._who_en(m[1], 'A student') || ' joined through your link and is now your ' || _lang_label_en(m[2]) || ' student 🎉'; end if;
    m := regexp_match(b, '^(.+?) aceitou seu convite e agora é seu aluno/a de (francês|chinês|português) 🎉$', 's');
    if m is not null then return public._who_en(m[1], 'A student') || ' accepted your invitation and is now your ' || _lang_label_en(m[2]) || ' student 🎉'; end if;
  elsif p_event = 'teacher_invite_declined' then
    m := regexp_match(b, '^(.+?) recusou o convite para as aulas de (francês|chinês|português)\.$', 's');
    if m is not null then return public._who_en(m[1], 'A student') || ' declined the invitation to ' || _lang_label_en(m[2]) || ' classes.'; end if;
  elsif p_event = 'teacher_invite' then
    m := regexp_match(b, '^(.+?) te convidou para ser aluno/a de (francês|chinês|português) 🎓$', 's');
    if m is not null then
      -- _teacher_display_name usa 'Professora' quando a conta não tem nome nem @
      n := case when m[1] = 'Professora' then 'Your teacher' else m[1] end;
      return n || ' invited you to be their ' || _lang_label_en(m[2]) || ' student 🎓';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public._notif_text_en(text, text) from public, anon, authenticated;

commit;
