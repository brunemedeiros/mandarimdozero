-- Banco de Revisão, parte 5: marca de conteúdo sensível (pessoal ou linguagem livre). No Banco antigo era
-- `revisao: "sensivel"`, com a dúvida "Decida se entra na revisão". Item sensível nunca vira cartão sozinho
-- (geração automática e "Gerar cartões" pulam); aprovar de propósito, item a item, continua possível.
-- Aditiva e idempotente; nenhum DROP.
alter table public.review_bank_items add column if not exists sensitive boolean not null default false;
