import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { createDeleter } from './core.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { ok: false, error: 'unauthorized' });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u || !u.user) return json(401, { ok: false, error: 'unauthorized' });

  let body: unknown = {};
  try { body = JSON.parse(await req.text()); } catch (_) { return json(400, { ok: false, error: 'invalid_json' }); }

  const ok = <T>(r: { data: T | null; error: any }): T => { if (r.error) throw r.error; return r.data as T; };
  const db = {
    getRoleInfo: async (uid: string) => {
      const roles = ok(await sb.from('account_roles').select('role').eq('user_id', uid)) as any[];
      const prof = ok(await sb.from('profiles').select('role').eq('user_id', uid).maybeSingle()) as any;
      return { roles: (roles || []).map((r) => r.role), profileRole: prof ? prof.role : null };
    },
    countTeacherLinks: async (uid: string) => {
      const r = await sb.from('teacher_students').select('student_id', { count: 'exact', head: true }).eq('teacher_id', uid);
      if (r.error) throw r.error;
      return r.count || 0;
    },
    teachersOf: async (uid: string) => ((ok(await sb.from('teacher_students').select('teacher_id').eq('student_id', uid)) as any[]) || []).map((r) => r.teacher_id),
    listFiles: async (bucket: string, prefix: string) => {
      const r = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
      if (r.error) throw r.error;
      return (r.data || []).filter((f: any) => f.id).map((f: any) => `${prefix}/${f.name}`);
    },
    reportsOf: async (uid: string) => (ok(await sb.from('reports').select('id,screenshot_url').eq('user_id', uid)) as any[]) || [],
    removeFiles: async (bucket: string, paths: string[]) => { const r = await sb.storage.from(bucket).remove(paths); if (r.error) throw r.error; },
    clearReport: async (id: string) => { ok(await sb.from('reports').update({ screenshot_url: null, reporter_email: null }).eq('id', id)); },
    deleteMaterialsFor: async (uid: string) => { ok(await sb.from('teacher_support_materials').delete().eq('student_id', uid)); },
    deleteBankStudentsLinkedTo: async (uid: string) => { ok(await sb.from('review_bank_students').delete().eq('linked_student_id', uid)); },
    deleteUser: async (uid: string) => { const r = await sb.auth.admin.deleteUser(uid); if (r.error) throw r.error; },
  };
  const r = await createDeleter({ db })({ user: { id: u.user.id, email: u.user.email }, body });
  return json(r.status, r.json);
});
