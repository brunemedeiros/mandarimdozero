-- Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md, grillado
-- em 3 rodadas antes de codar) -- primeira coluna real de assinatura no
-- produto. Não existe checkout Stripe nesta entrega (escopo explicitamente
-- travado como "só infraestrutura por enquanto") -- plan_tier é ativado só
-- manualmente, via um botão no Painel de Admin, até um checkout real
-- existir.
--
-- Decisões do grilling, já refletidas aqui:
-- - Cliente pagante = QUALQUER conta registrada (não só as vinculadas a uma
--   professora como aluno formal) -- por isso a coluna vive em `profiles`,
--   não em `teacher_students`.
-- - Um único nível pago (binário free/premium), não múltiplos tiers.
-- - Todo mundo nasce 'free' -- nenhuma conta existente muda de
--   comportamento com esta migration (aditiva/default seguro, mesmo padrão
--   de profiles.role na migration 024).
alter table public.profiles
  add column if not exists plan_tier text not null default 'free' check (plan_tier in ('free', 'premium'));
