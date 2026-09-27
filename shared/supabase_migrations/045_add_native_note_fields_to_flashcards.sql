-- Fase 6B do prompt-mestre "reestruturação Note/CardType/CardInstance"
-- (ver CLAUDE.md) -- persistência real da Note nativa que
-- shared/flashcard-model.js já sabe interpretar (interpretNoteFromRow /
-- validateNativeNoteRow / interpretNativeNoteFromRow), aplicada às duas
-- tabelas de flashcard (`teacher_flashcards` e `own_flashcards`).
--
-- Aditiva/sem risco, mesmo padrão de toda migration deste repo que só
-- adiciona coluna nullable: nenhuma linha existente muda de
-- comportamento. `fields`/`card_generation_mode` continuam NULL em toda
-- linha legada -- interpretNoteFromRow() só entra no caminho nativo
-- quando os DOIS estão presentes (isNoteFieldsPresent/
-- isCardGenerationModePresent), então uma linha legada cai exatamente no
-- mesmo ramo `else` de sempre, byte a byte idêntico.
--
-- `fields` (jsonb) -- array de Field, shape documentado em
-- shared/flashcard-model.js linha ~102:
--   { id, lang, role, content: {type:'plain', value}, audio, image, pinyinFieldId }
-- `id` é estável (não muda com reordenação no editor) e é o que
-- `pinyinFieldId` referencia -- nunca um índice de array.
--
-- `card_generation_mode` (text) -- um dos 5 Card Types que o motor sabe
-- gerar hoje: 'normal' | 'normal_reversed' | 'multiple_choice' | 'cloze' |
-- 'type_answer' (mesmo array CARD_GENERATION_MODES do motor).
--
-- Pareamento OBRIGATÓRIO (ambos presentes ou ambos ausentes, nunca só
-- um) -- reflete exatamente a checagem que validateNativeNoteRow() já faz
-- no motor (`hasFields !== hasMode` é rejeitado). A constraint aqui é
-- defesa em profundidade, não a única linha de defesa: o motor NUNCA
-- confia só nela (revalida tudo de novo em toda leitura, ver comentário
-- no topo da seção Fase 6B de shared/flashcard-model.js) -- mas ela evita
-- que um INSERT/UPDATE direto (fora do caminho normal de escrita) grave
-- um estado inválido no banco em primeiro lugar.
--
-- O CHECK de `card_generation_mode` (só quando não-nulo) é acréscimo meu
-- nesta rodada -- não estava no texto literal já revisado, mas segue o
-- mesmo padrão que `language_app_key`/`status` já usam nas duas tabelas
-- (enum fechado, validado no banco) e barra um valor não reconhecido
-- (typo, versão antiga do cliente) antes mesmo de chegar no motor.
--
-- O que esta migration NÃO faz, de propósito: nenhum backfill, nenhuma
-- constraint de estrutura interna do `fields` (array não-vazio, ids
-- únicos, pinyinFieldId válido, cardinalidade de multiple_choice) -- essa
-- validação estrutural mais rica já é feita inteiramente por
-- validateNativeNoteRow() no motor, e não faz sentido duplicá-la em SQL
-- puro (exigiria jsonb_array_length/jsonb_path_query, frágil e caro de
-- manter em sincronia com o motor). O motor é a fonte de verdade da
-- validação estrutural; o banco só garante que os dois campos nunca
-- fiquem "meio preenchidos".
alter table public.teacher_flashcards
  add column if not exists fields jsonb,
  add column if not exists card_generation_mode text;

alter table public.teacher_flashcards
  drop constraint if exists teacher_flashcards_fields_paired,
  add constraint teacher_flashcards_fields_paired
    check ((fields is null) = (card_generation_mode is null));

alter table public.teacher_flashcards
  drop constraint if exists teacher_flashcards_card_generation_mode_check,
  add constraint teacher_flashcards_card_generation_mode_check
    check (card_generation_mode is null or card_generation_mode in
      ('normal', 'normal_reversed', 'multiple_choice', 'cloze', 'type_answer'));

alter table public.own_flashcards
  add column if not exists fields jsonb,
  add column if not exists card_generation_mode text;

alter table public.own_flashcards
  drop constraint if exists own_flashcards_fields_paired,
  add constraint own_flashcards_fields_paired
    check ((fields is null) = (card_generation_mode is null));

alter table public.own_flashcards
  drop constraint if exists own_flashcards_card_generation_mode_check,
  add constraint own_flashcards_card_generation_mode_check
    check (card_generation_mode is null or card_generation_mode in
      ('normal', 'normal_reversed', 'multiple_choice', 'cloze', 'type_answer'));
