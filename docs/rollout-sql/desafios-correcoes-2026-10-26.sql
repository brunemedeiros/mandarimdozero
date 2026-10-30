-- Correções de português/francês em Desafios publicados (aprovadas pela dona em 2026-10-26).
-- PRODUÇÃO (eigjocalzwamisgqilhg), tabela public.challenges. Colar no SQL Editor e rodar tudo de uma vez.
-- Cada UPDATE muda UM campo e só acontece se o valor antigo ainda for o esperado (senão muda 0 linha).
-- No fim, um bloco confere o estado final e, se algo não bater, dá erro e desfaz TUDO (rollback da transação).
-- Retrato dos textos novos no repositório: docs/i18n/challenges-producao-sem-fonte.json.
--
-- O que muda, id por id:
--   expr-b2-001   meaning.pt: "aspetos" (Portugal) -> "aspectos"
--   lt-a1-001     referenceTranslations[2]: "Eu estou a comer uma maçã." (Portugal) -> "Eu estou comendo uma maçã."
--   lt-b2-001     referenceTranslations[2]: "Conquanto o projeto..." -> "Embora o projeto..." (a explicação não tem "Conquanto")
--   accent-b2-001 explanation: frase repetida -> 'Os dois primeiros "e" têm acento agudo: pré-fé-rer.'
--   expr-a2-001   explanation (francês): tira a definição circular
--   expr-a1-003   options[2] e correctAnswer: "Avoir la bonne opinion" -> "Ne pas se tromper"
--   expr-b2-002   secondExample.text: exemplo novo; secondExample.audioFile REMOVIDO (o mp3 antigo 8161a79d42ec.mp3 lia a
--                 frase antiga). Depois de gerar o mp3 novo (fda7a771ac1c.mp3), rodar o UPDATE comentado no fim.
-- Formas de Portugal nas traduções aceitas do Ouça e traduza (varredura de TODOS os listen_translate da produção, 49,
-- e dos lotes do repositório): só a do lt-a1-001 (coberta acima). "tu/teu" (lt-a1m1-003, lt-a1m2-002, lt-a1m3-003,
-- lt-a1m3-008) não conta pela regra da dona; "Aos fins de semana" (lt-a1m6-001) é usado também no Brasil e fica.

-- 1) BACKUP: guarde o resultado deste SELECT antes de rodar o resto.
select id, data from public.challenges
where id in ('expr-b2-001','lt-a1-001','lt-b2-001','accent-b2-001','expr-a2-001','expr-a1-003','expr-b2-002')
order by id;

begin;

-- (1) expr-b2-001: aspetos -> aspectos
update public.challenges
set data = jsonb_set(data, '{meaning,pt}', to_jsonb($t$Esclarecer todos os detalhes, ser preciso sobre todos os aspectos de uma situação ou acordo.$t$::text))
where id = 'expr-b2-001'
  and data #>> '{meaning,pt}' = $t$Esclarecer todos os detalhes, ser preciso sobre todos os aspetos de uma situação ou acordo.$t$;

-- (2) lt-a1-001: tira a forma de Portugal (fica "Eu como", "Estou comendo" e "Eu estou comendo")
update public.challenges
set data = jsonb_set(data, '{referenceTranslations,2}', to_jsonb($t$Eu estou comendo uma maçã.$t$::text))
where id = 'lt-a1-001'
  and data #>> '{referenceTranslations,2}' = $t$Eu estou a comer uma maçã.$t$;

-- (3) lt-b2-001: Conquanto -> Embora
update public.challenges
set data = jsonb_set(data, '{referenceTranslations,2}', to_jsonb($t$Embora o projeto seja ambicioso, estamos certos de que o finalizaremos com êxito pela colaboração geral.$t$::text))
where id = 'lt-b2-001'
  and data #>> '{referenceTranslations,2}' = $t$Conquanto o projeto seja ambicioso, estamos certos de que o finalizaremos com êxito pela colaboração geral.$t$;

-- (4) accent-b2-001: explicação repetida
update public.challenges
set data = jsonb_set(data, '{explanation}', to_jsonb($t$Os dois primeiros "e" têm acento agudo: pré-fé-rer.$t$::text))
where id = 'accent-b2-001'
  and data #>> '{explanation}' = $t$"e" tem acento agudo, "e" tem acento agudo.$t$;

-- (5) expr-a2-001: explicação em francês sem definição circular
update public.challenges
set data = jsonb_set(data, '{explanation}', to_jsonb($t$C'est une expression familière pour demander ou proposer de l'aide. Donner un coup de main à quelqu'un, c'est l'aider un peu.$t$::text))
where id = 'expr-a2-001'
  and data #>> '{explanation}' = $t$C'est une expression pour demander ou offrir de l'aide. Ça veut dire donner un coup de main.$t$;

-- (6) expr-a1-003: opção certa natural (a opção e a resposta certa mudam juntas)
update public.challenges
set data = jsonb_set(data, '{options,2}', to_jsonb($t$Ne pas se tromper$t$::text))
where id = 'expr-a1-003'
  and data #>> '{options,2}' = $t$Avoir la bonne opinion$t$;
update public.challenges
set data = jsonb_set(data, '{correctAnswer}', to_jsonb($t$Ne pas se tromper$t$::text))
where id = 'expr-a1-003'
  and data #>> '{correctAnswer}' = $t$Avoir la bonne opinion$t$;

-- (7) expr-b2-002: 2º exemplo natural; tira o áudio antigo (lia a frase antiga) até o mp3 novo existir
update public.challenges
set data = jsonb_set(data, '{secondExample,text}', to_jsonb($t$Mon colocataire a vraiment un poil dans la main : il ne fait jamais la vaisselle.$t$::text))
where id = 'expr-b2-002'
  and data #>> '{secondExample,text}' = $t$Malgré les critiques, elle n'a jamais eu un poil dans la main pour défendre ses idées.$t$;
update public.challenges
set data = data #- '{secondExample,audioFile}'
where id = 'expr-b2-002'
  and data #>> '{secondExample,audioFile}' = '8161a79d42ec.mp3';

-- Conferência: se qualquer campo não ficou como o esperado, erro e nada é gravado.
do $$
declare bad text := '';
begin
  if (select data #>> '{meaning,pt}' from public.challenges where id = 'expr-b2-001') <> $t$Esclarecer todos os detalhes, ser preciso sobre todos os aspectos de uma situação ou acordo.$t$ then bad := bad || ' expr-b2-001'; end if;
  if (select data #>> '{referenceTranslations,2}' from public.challenges where id = 'lt-a1-001') <> $t$Eu estou comendo uma maçã.$t$ then bad := bad || ' lt-a1-001'; end if;
  if (select data #>> '{referenceTranslations,2}' from public.challenges where id = 'lt-b2-001') not like 'Embora %' then bad := bad || ' lt-b2-001'; end if;
  if (select data::text from public.challenges where id = 'lt-b2-001') like '%Conquanto%' then bad := bad || ' lt-b2-001(Conquanto)'; end if;
  if (select data #>> '{explanation}' from public.challenges where id = 'accent-b2-001') <> $t$Os dois primeiros "e" têm acento agudo: pré-fé-rer.$t$ then bad := bad || ' accent-b2-001'; end if;
  if (select data #>> '{explanation}' from public.challenges where id = 'expr-a2-001') not like $t$%c'est l'aider un peu.$t$ then bad := bad || ' expr-a2-001'; end if;
  if (select (data #>> '{correctAnswer}') <> 'Ne pas se tromper' or not (data -> 'options') ? 'Ne pas se tromper' or (data -> 'options') ? 'Avoir la bonne opinion'
      from public.challenges where id = 'expr-a1-003') then bad := bad || ' expr-a1-003'; end if;
  if (select (data #>> '{secondExample,text}') not like 'Mon colocataire%' or (data #> '{secondExample}') ? 'audioFile'
      from public.challenges where id = 'expr-b2-002') then bad := bad || ' expr-b2-002'; end if;
  if exists (select 1 from public.challenges where type = 'listen_translate' and data::text ~* '\m(estou|está|estava|estamos|estão) a [a-zà-ú]+(ar|er|ir)\M') then bad := bad || ' ainda-ha-a+infinitivo'; end if;
  if bad <> '' then raise exception 'Correções não bateram:%', bad; end if;
end $$;

commit;

-- Depois: conferir
select id, data #>> '{meaning,pt}' as meaning_pt, data #>> '{explanation}' as explanation, data -> 'referenceTranslations' as refs,
       data #>> '{correctAnswer}' as correct, data -> 'options' as options, data -> 'secondExample' as second_example
from public.challenges
where id in ('expr-b2-001','lt-a1-001','lt-b2-001','accent-b2-001','expr-a2-001','expr-a1-003','expr-b2-002')
order by id;

-- SÓ DEPOIS de o mp3 novo existir em fr/audio/challenges/fda7a771ac1c.mp3 (publicado na main):
-- update public.challenges
-- set data = jsonb_set(data, '{secondExample,audioFile}', to_jsonb('fda7a771ac1c.mp3'::text))
-- where id = 'expr-b2-002' and not (data #> '{secondExample}') ? 'audioFile';
