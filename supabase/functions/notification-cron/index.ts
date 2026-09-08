// ---------- Notification Cron (Fase 0 -- infraestrutura mínima) ----------
//
// A peça que hoje simplesmente não existe na plataforma: código rodando
// FORA do navegador de qualquer aluno, com acesso de service role ao
// Supabase. Sem isso, nenhuma notificação "de ausência" (streak em risco,
// revisão atrasada, reengajamento) é possível -- o app só roda quando
// alguém abre a aba, e ninguém abre a aba pra ser avisado que devia abrir
// a aba (ver seção 3 da arquitetura aprovada, "por que hoje não escala").
//
// ESCOPO DESTA FASE (0): só provar que o encanamento funciona -- deploy,
// invocação (manual ou por cron agendado), leitura das tabelas novas com
// service role (ignora RLS). NENHUMA lógica de negócio ainda: não decide
// quem está inativo, não gera notificação nenhuma. Isso é Fase 2
// (revisão atrasada/streak em risco/início do calendário de
// reengajamento) e Fase 4 (ranking/desafios) -- ver seção 18.
//
// Quando a Fase 2 chegar, o mesmo arquivo ganha a lógica real: ler
// `progress`/`weekly_xp`, comparar `lastStudyDay`/`cardsDueNow` calculado
// no servidor contra `notification_rules.schedule_days`, escolher uma
// variante ativa de `notification_templates` (sorteio simples), montar o
// texto substituindo os placeholders ({{word}}, {{days}}...) e inserir em
// `notifications` (in-app) + `notification_queue` (push/e-mail, quando
// essas tabelas existirem).
//
// Deploy + agendamento são passos manuais (ver PR): a autora roda
// `supabase functions deploy notification-cron` e agenda a invocação
// diária pelo painel do Supabase (Edge Functions > Cron) ou via pg_cron.

import { createClient } from 'npm:@supabase/supabase-js@2';

// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente
// pelo runtime de Edge Functions do Supabase -- não precisam ser
// configurados manualmente como secret (diferente de uma chave de
// terceiro, tipo um provedor de push/e-mail nas fases seguintes).
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: rules, error } = await supabase
    .from('notification_rules')
    .select('category, active, priority, cooldown_minutes, daily_cap, schedule_days')
    .order('category');

  if (error) {
    console.error('notification-cron: falha ao ler notification_rules', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const reengajamento = rules?.find((r) => r.category === 'reengajamento');

  const summary = {
    ok: true,
    ranAt: new Date().toISOString(),
    phase: 'Fase 0 -- sem lógica de negócio ainda, só verificação de encanamento',
    categoriesFound: rules?.length ?? 0,
    activeCategories: rules?.filter((r) => r.active).map((r) => r.category) ?? [],
    reengajamentoScheduleDays: reengajamento?.schedule_days ?? null,
  };

  console.log('notification-cron heartbeat:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
