-- 154: as 20 funções que ainda não tinham "endereço fixo" (search_path) passam a ter (alerta function_search_path_mutable
-- do Supabase; achado 7 da auditoria de 2026-11-19, docs/historico/36-auditoria-seguranca-2026-11.md). Pedido da autora em 2026-11-27.
-- Nenhuma é security definer e nenhuma usa extensão (conferido no Staging e na produção): só public e funções nativas.
-- ALTER FUNCTION ... SET: não muda o que a função faz, só fixa onde ela procura tabelas e funções.

alter function public._lang_label(p_lang text) set search_path = public;
alter function public._mural_paths(p_list jsonb) set search_path = public;
alter function public._mural_snippet(p_body text) set search_path = public;
alter function public._note_field_component(p_fields jsonb, p_field jsonb) set search_path = public;
alter function public._note_norm(t text) set search_path = public;
alter function public._username_is_generated(p text) set search_path = public;
alter function public.attribution_tag_for_username(p_username text) set search_path = public;
alter function public.challenges_set_updated_at() set search_path = public;
alter function public.decks_validate_hierarchy() set search_path = public;
alter function public.is_attribution_tag(p_tag text) set search_path = public;
alter function public.note_tag_is_canonical(p_tag text) set search_path = public;
alter function public.note_tags_within_limits(p_tags text[]) set search_path = public;
alter function public.notification_preferences_set_updated_at() set search_path = public;
alter function public.notification_rules_set_updated_at() set search_path = public;
alter function public.notification_templates_set_updated_at() set search_path = public;
alter function public.own_flashcards_validate_deck() set search_path = public;
alter function public.profiles_set_updated_at() set search_path = public;
alter function public.reports_set_updated_at() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.teacher_flashcards_validate_deck() set search_path = public;

-- Voltar atrás: alter function <nome>(<args>) reset search_path; (para cada uma)
