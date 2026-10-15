// ---------- review-bank-agent: porta de entrada da rotina automática do Banco de Revisão ----------
//
// A tarefa agendada do Claude (madrugada) lê o caderno e a agenda e entrega aqui os itens novos e as datas de aula.
// A função grava SÓ no Banco da professora e gera os cartões dos alunos vinculados, com o mesmo motor do site
// (engine.generated.mjs, gerado de shared/*.js por scripts/build-review-bank-agent.js). A lógica está em core.mjs.
//
// Autenticação: o gateway do Supabase exige um JWT válido (verify_jwt = true: a chave anon pública serve), e ALÉM
// disso o cabeçalho `x-agent-token` precisa bater com o secret REVIEW_BANK_AGENT_TOKEN. A professora dona dos dados vem do
// secret REVIEW_BANK_AGENT_TEACHER_ID (nunca do corpo da requisição). Usa service role, por isso toda consulta aqui
// é filtrada por teacher_id; sem token ou sem secrets configurados a função recusa tudo.
//
// Ações: ping, state, register_student, ingest, process_inbox (caixa de entrada, plano B), nightly (recap e cartões sem a tarefa).
// Secrets: REVIEW_BANK_AGENT_TOKEN, REVIEW_BANK_AGENT_TEACHER_ID (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import * as engine from './engine.generated.mjs';
import { createAgent } from './core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-agent-token, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

async function fetchAll(build: (from: number, to: number) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const token = Deno.env.get('REVIEW_BANK_AGENT_TOKEN') || '';
  const teacherId = Deno.env.get('REVIEW_BANK_AGENT_TEACHER_ID') || '';
  if (token.length < 24 || !teacherId) {
    // só os NOMES do que falta (nunca valores): ajuda a achar secret digitado no projeto errado ou com nome diferente
    const missing = [token.length < 24 ? (token ? 'REVIEW_BANK_AGENT_TOKEN (menos de 24 caracteres)' : 'REVIEW_BANK_AGENT_TOKEN') : null, !teacherId ? 'REVIEW_BANK_AGENT_TEACHER_ID' : null].filter(Boolean);
    return json(503, { ok: false, error: 'not_configured', missing });
  }
  const sent = req.headers.get('x-agent-token') || '';
  if (!safeEqual(sent, token)) return json(401, { ok: false, error: 'unauthorized' });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 4_000_000) return json(413, { ok: false, error: 'payload_too_large' });
    body = JSON.parse(text);
  } catch (_) { return json(400, { ok: false, error: 'invalid_json' }); }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ok = <T>(r: { data: T | null; error: any }): T => { if (r.error) throw r.error; return r.data as T; };

  const db = {
    listManagedStudents: async (t: string) => ok(await sb.from('review_bank_students').select('*').eq('teacher_id', t).eq('agent_managed', true).order('name')) || [],
    getSettings: async (t: string) => ok(await sb.from('review_bank_settings').select('*').eq('teacher_id', t).maybeSingle()),
    listItems: (studentId: string) => fetchAll((a, b) => sb.from('review_bank_items').select('*').eq('teacher_id', teacherId).eq('bank_student_id', studentId).order('created_at').range(a, b)),
    getRecap: async (studentId: string, date: string) => ok(await sb.from('review_bank_recaps').select('id').eq('teacher_id', teacherId).eq('bank_student_id', studentId).eq('class_date', date).maybeSingle()),
    updateStudent: async (id: string, cols: Record<string, unknown>) => { ok(await sb.from('review_bank_students').update(cols).eq('id', id).eq('teacher_id', teacherId)); },
    insertItems: async (rows: unknown[]) => { for (let i = 0; i < rows.length; i += 150) ok(await sb.from('review_bank_items').upsert(rows.slice(i, i + 150), { onConflict: 'bank_student_id,import_key', ignoreDuplicates: true })); },
    insertRecap: async (row: unknown) => { ok(await sb.from('review_bank_recaps').upsert(row, { onConflict: 'bank_student_id,class_date', ignoreDuplicates: true })); },
    approveCard: async (t: string, itemId: string, c: any) => {
      ok(await sb.rpc('agent_approve_review_bank_item', { p_teacher: t, p_item_id: itemId, p_front: c.front, p_back_trans: c.back_trans, p_fields: c.fields, p_mode: c.mode, p_tags: c.tags, p_note: c.note }));
    },
    getUserEmail: async (userId: string) => { const r = await sb.auth.admin.getUserById(userId); return (r && r.data && r.data.user && r.data.user.email) || null; },
    findStudent: async (t: string, name: string, lang: string, notebook: string | null, agenda: string[]) => {
      const base = () => sb.from('review_bank_students').select('id,agent_managed,status').eq('teacher_id', t);
      if (notebook) { const r = ok(await base().eq('notebook_id', notebook).limit(1)) as any[]; if (r && r.length) return r[0]; }
      const byName = ok(await base().eq('language_app_key', lang).ilike('name', name.replace(/[\\%_]/g, '\\$&')).limit(1)) as any[];
      if (byName && byName.length) return byName[0];
      for (const n of [name, ...agenda]) {
        const r = ok(await base().eq('language_app_key', lang).contains('agenda_names', [n]).limit(1)) as any[];
        if (r && r.length) return r[0];
      }
      return null;
    },
    insertStudent: async (row: unknown) => ok(await sb.from('review_bank_students').insert(row).select('id').single()),
    insertRun: async (row: unknown) => { ok(await sb.from('review_bank_agent_runs').insert(row)); },
    claimInbox: async (t: string, id: string | null) => ok(await sb.rpc('agent_inbox_claim', { p_teacher: t, p_id: id })) || [],
    finishInbox: async (id: string, status: string, result: unknown, error: string | null) => {
      ok(await sb.from('review_bank_agent_inbox').update({ status, result, error, processed_at: new Date().toISOString() }).eq('id', id).eq('teacher_id', teacherId));
    },
  };

  try {
    const agent = createAgent({ engine, db, teacherId });
    const r = await agent.handle(body);
    return json(r.status, r.json);
  } catch (e) {
    console.error('review-bank-agent', (e as Error)?.message);
    return json(500, { ok: false, error: 'internal', detail: String((e as Error)?.message || e).slice(0, 200) });
  }
});
