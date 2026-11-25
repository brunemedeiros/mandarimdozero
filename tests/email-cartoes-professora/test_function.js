// Edge Function teacher-cards-digest (index.ts) rodando em Node com um Supabase e um Resend de mentira (banco em memória).
// Confere: modo desligado/teste/todos, 1 por dia, preferência, "novos" x "lembrete", sem e-mail, rota de sair, senha, e-mail de teste.
// Rodar: node tests/email-cartoes-professora/test_function.js
const fs = require('fs'), path = require('path'), os = require('os');
const ts = require('typescript');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tcd-'));
  const coreSrc = path.join(ROOT, 'supabase/functions/teacher-cards-digest/core.mjs');
  const code = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'supabase/functions/teacher-cards-digest/index.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace("'npm:@supabase/supabase-js@2'", `'${path.join(tmp, 'fake.mjs')}'`).replace("'./core.mjs'", `'${coreSrc}'`);
  fs.writeFileSync(path.join(tmp, 'index.mjs'), code);
  fs.writeFileSync(path.join(tmp, 'fake.mjs'), `export const createClient = () => globalThis.__sb;`);

  // ---- banco em memória (só o que a função usa) ----
  const DB = {};
  let uidCounter = 0;
  const builder = (table) => {
    const st = { f: [], op: null, pl: null, ord: null, lim: null, single: false, notNull: [] };
    const rows = () => (DB[table] = DB[table] || []);
    const match = r => st.f.every(([k, v]) => r[k] === v) && st.notNull.every(k => r[k] != null);
    const run = () => {
      if (st.op === 'insert'){
        const row = Object.assign({ id: ++uidCounter, created_at: new Date().toISOString() }, st.pl);
        if (table === 'teacher_cards_digest_log' && rows().some(x => x.student_id === row.student_id && x.sent_on === row.sent_on)) return { data: null, error: { message: 'duplicate key' } };
        rows().push(row); return { data: row, error: null };
      }
      if (st.op === 'update'){ rows().filter(match).forEach(r => Object.assign(r, st.pl)); return { data: null, error: null }; }
      if (st.op === 'upsert'){ const ex = rows().find(r => r.user_id === st.pl.user_id); if (ex) Object.assign(ex, st.pl); else rows().push(Object.assign({}, st.pl)); return { data: null, error: null }; }
      let out = rows().filter(match);
      if (st.ord) out = out.slice().sort((a, b) => (a[st.ord.k] < b[st.ord.k] ? 1 : -1) * (st.ord.asc ? -1 : 1));
      if (st.lim != null) out = out.slice(0, st.lim);
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'select') return () => b;
      if (p === 'eq') return (k, v) => { st.f.push([k, v]); return b; };
      if (p === 'not') return (k) => { st.notNull.push(k); return b; };
      if (p === 'order') return (k, o) => { st.ord = { k, asc: !!(o && o.ascending) }; return b; };
      if (p === 'limit') return (n) => { st.lim = n; return b; };
      if (p === 'maybeSingle') return () => { st.single = true; return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.pl = pl; return b; };
      if (p === 'update') return (pl) => { st.op = 'update'; st.pl = pl; return b; };
      if (p === 'upsert') return (pl) => { st.op = 'upsert'; st.pl = pl; return b; };
      return () => b;
    } });
    return b;
  };
  const EMAILS = {};
  const SIGKEY = 'chave-propria-da-assinatura-com-mais-de-32-caracteres';
  globalThis.__sb = { from: builder, rpc: async (name) => (name === 'cards_digest_signing_key' ? { data: SIGKEY, error: null } : { data: null, error: { message: 'rpc?' } }), auth: { admin: { getUserById: async (id) => ({ data: { user: EMAILS[id] ? { email: EMAILS[id] } : null }, error: null }) } } };

  const SECRET = 'segredo-de-teste-com-mais-de-24-caracteres';
  const sent = [];
  globalThis.fetch = async (url, init) => { const b = JSON.parse(init.body); sent.push(b); return { ok: true, status: 200, text: async () => '' }; };
  let handler;
  globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv', NOTIFICATION_CRON_TOKEN: SECRET, RESEND_API_KEY: 're_x', RESEND_FROM_EMAIL: 'Prof Brune <nao-responda@profbrune.com.br>' }[k]) }, serve: (h) => { handler = h; } };
  await import(path.join(tmp, 'index.mjs'));

  const post = (body, token = SECRET) => handler(new Request('https://p.supabase.co/functions/v1/teacher-cards-digest', { method: 'POST', headers: { 'x-cron-token': token, 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }));
  const T = 'teacher-1', today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  const reset = () => { Object.keys(DB).forEach(k => delete DB[k]); sent.length = 0; };
  const seed = () => {
    reset();
    DB.teacher_cards_digest_settings = [{ teacher_id: T, mode: 'desligado', test_student_ids: ['ativa', 'parada'] }];
    DB.teacher_students = ['ativa', 'parada', 'outra', 'semmail'].map(s => ({ teacher_id: T, student_id: s, status: 'active' })).concat([{ teacher_id: T, student_id: 'saiu', status: 'removed' }]);
    DB.profiles = [{ user_id: 'ativa', display_name: 'Ana Silva' }, { user_id: 'parada', display_name: 'Carol' }, { user_id: 'outra', display_name: 'Bia' }, { user_id: 'semmail', display_name: 'Duda' }];
    DB.progress = [{ user_id: 'outra', data: { _meta: { uiLanguage: 'en' } } }];
    Object.assign(EMAILS, { ativa: 'ana@x.test', parada: 'carol@x.test', outra: 'bia@x.test' });
    const card = (s, d) => ({ student_id: s, teacher_id: T, status: 'active', bank_item_id: 'b', created_at: iso(d) });
    DB.teacher_flashcards = [card('ativa', 0), card('ativa', 0), card('ativa', 9), card('parada', 20), card('parada', 20), card('outra', 1), card('semmail', 0), card('saiu', 0)];
    DB.usage_events = [{ user_id: 'ativa', created_at: iso(0) }, { user_id: 'parada', created_at: iso(15) }, { user_id: 'outra', created_at: iso(0) }];
  };
  const run = async (body) => (await post(body)).json();
  const by = (r, id) => r.summary.find(x => x.student === id) || {};

  // senha e método
  seed();
  check('sem senha: recusa (401)', (await post({}, 'errada')).status === 401);
  check('GET sem parâmetros: 405', (await handler(new Request('https://p.supabase.co/functions/v1/teacher-cards-digest'))).status === 405);

  // desligado: não envia nada
  let r = await run({});
  check('modo desligado: não envia nada', sent.length === 0 && r.summary[0].skipped === 'desligado' && !(DB.teacher_cards_digest_log || []).length, r);

  // teste: só as 2 alunas da lista; novos para a ativa, lembrete para a parada; "outra" e "semmail" ficam de fora
  DB.teacher_cards_digest_settings[0].mode = 'teste';
  r = await run({ dry_run: true });
  check('dry_run: planeja sem enviar e sem gravar (parada há dias mas sem cartões novos: nada, o lembrete saiu)', sent.length === 0 && !(DB.teacher_cards_digest_log || []).length && by(r, 'ativa').kind === 'novos' && by(r, 'ativa').n === 2 && by(r, 'parada').skipped === 'nada_a_avisar', r);
  check('modo teste: só entra quem está na lista de teste', !by(r, 'outra').student && !by(r, 'semmail').student && !by(r, 'saiu').student, r);
  r = await run({});
  check('modo teste: envia 1 e-mail (só a ativa, que tem cartões novos); a parada fica sem e-mail', sent.length === 1 && sent[0].to === 'ana@x.test', sent.map(m => m.to));
  const mAtiva = sent.find(m => m.to === 'ana@x.test');
  check('e-mail: o link "Parar de receber" (html e texto) aponta para a página do SITE; o cabeçalho de 1 clique continua na função', mAtiva.html.includes('https://app.profbrune.com.br/sair-cartoes/?u=ativa&amp;t=') || mAtiva.html.includes('https://app.profbrune.com.br/sair-cartoes/?u=ativa&t='), mAtiva.html.match(/href="[^"]*sair[^"]*"/));
  check('e-mail: texto puro também leva o link do site', /app\.profbrune\.com\.br\/sair-cartoes\/\?u=ativa&t=[0-9a-f]{64}&l=pt/.test(mAtiva.text));
  check('e-mail: botão "abrir o site" com UTM cartoes_novos (html e texto)', mAtiva.html.includes('href="https://app.profbrune.com.br/?utm_source=email&amp;utm_medium=email&amp;utm_campaign=cartoes_novos"') && mAtiva.text.includes('?utm_source=email&utm_medium=email&utm_campaign=cartoes_novos'));
  const tokAtiva = (/[?&]t=([0-9a-f]{64})/.exec(mAtiva.headers['List-Unsubscribe']) || [])[1];
  const corex = await import(coreSrc);
  check('link de sair do e-mail é assinado com a chave PRÓPRIA (não com a senha do agendamento)', !!tokAtiva && await corex.verifyUnsubscribe(SIGKEY, 'ativa', tokAtiva) === true && await corex.verifyUnsubscribe(SECRET, 'ativa', tokAtiva) === false);
  check('e-mail da ativa: "novos" com 2 cartões, nome, de remetente certo, texto puro e cabeçalhos de sair em 1 clique', mAtiva.subject === 'Você tem 2 cartões novos da sua professora' && mAtiva.html.includes('Oi, Ana!') && mAtiva.text.length > 20 && mAtiva.from.startsWith('Prof Brune') && mAtiva.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click' && /teacher-cards-digest\?u=ativa&t=[0-9a-f]{64}&l=pt/.test(mAtiva.headers['List-Unsubscribe']), mAtiva.headers);
  const log = DB.teacher_cards_digest_log;
  check('registro: 1 linha (a ativa), enviada', log.length === 1 && log.every(l => l.status === 'sent' && l.sent_on === today), log);
  r = await run({});
  check('mesmo dia de novo: não envia de novo (1 por dia)', sent.length === 1 && by(r, 'ativa').skipped === 'ja_enviado_hoje', r);

  // dia seguinte: lembrete só depois de 7 dias; "novos" só com cartão entregue depois do último "novos"
  DB.teacher_cards_digest_log.forEach(l => { l.sent_on = '2000-01-01'; l.created_at = new Date(Date.now() + 1000).toISOString(); });
  r = await run({});
  check('dia seguinte: nada novo: não envia', sent.length === 1 && by(r, 'ativa').skipped === 'nada_a_avisar' && by(r, 'parada').skipped === 'nada_a_avisar', r);
  DB.teacher_flashcards.push({ student_id: 'ativa', teacher_id: T, status: 'active', bank_item_id: 'b', created_at: new Date(Date.now() + 5000).toISOString() });
  r = await run({});
  check('cartão entregue depois do último e-mail: novo "novos" com 1 cartão', sent.length === 2 && sent[1].subject === 'Você tem 1 cartão novo da sua professora', sent.map(m => m.subject));

  // todos: inclui inglês, sem e-mail e vínculo removido; respeita "parar de receber"
  seed(); DB.teacher_cards_digest_settings[0].mode = 'todos';
  DB.notification_preferences = [{ user_id: 'ativa', channels: { cartoes_professora: [] } }];
  r = await run({});
  check('modo todos: quem desligou não recebe; sem e-mail e vínculo removido ficam de fora', by(r, 'ativa').skipped === 'desligou' && by(r, 'semmail').skipped === 'sem_email' && !by(r, 'saiu').student, r);
  const bia = sent.find(m => m.to === 'bia@x.test');
  check('site em inglês: e-mail em inglês, sem português', bia && bia.subject === 'You have 1 new card from your teacher' && !/você|cartão|Revisão/i.test(bia.html.replace(/<style[\s\S]*?<\/style>/, '')) && /&l=en/.test(bia.headers['List-Unsubscribe']), bia && bia.subject);
  check('modo todos: só recebe quem tem cartão novo e não desligou (a desligou e a parada sem cartões novos ficam de fora)', sent.length === 1 && sent[0].to === 'bia@x.test');

  // sair: GET só confirma, POST grava; chave própria; link antigo (senha do agendamento) continua valendo
  seed();
  const core = await import(coreSrc);
  const tk = await core.signUnsubscribe(SIGKEY, 'ativa'), tkOld = await core.signUnsubscribe(SECRET, 'ativa');
  const U = 'https://p.supabase.co/functions/v1/teacher-cards-digest';
  const g = await handler(new Request(`${U}?u=ativa&t=${tk}&l=pt`), );
  check('sair: GET redireciona (302) para a página do SITE com u, t e l, e NÃO grava nada (o Supabase mostraria HTML como texto cru)', g.status === 302 && g.headers.get('location') === `https://app.profbrune.com.br/sair-cartoes/?u=ativa&t=${tk}&l=pt` && !(DB.notification_preferences || []).length, g.headers.get('location'));
  const gEn = await handler(new Request(`${U}?u=ativa&t=${tk}&l=en`));
  check('sair: GET em inglês leva l=en', gEn.status === 302 && /&l=en$/.test(gEn.headers.get('location')));
  const ok = await handler(new Request(`${U}?u=ativa&t=${tk}&l=pt`, { method: 'POST' }));
  const okJ = await ok.json();
  check('sair: POST válido desliga só a categoria e responde JSON ok (a página do site mostra "Pronto!")', ok.status === 200 && okJ.ok === true && /json/.test(ok.headers.get('content-type')) && ok.headers.get('access-control-allow-origin') === '*' && JSON.stringify(DB.notification_preferences) === JSON.stringify([{ user_id: 'ativa', channels: { cartoes_professora: [] } }]), DB.notification_preferences);
  DB.notification_preferences[0].channels.estudo = ['email']; DB.notification_preferences[0].channels.cartoes_professora = ['email'];
  const ok2 = await handler(new Request(`${U}?u=ativa&t=${tk}&l=en`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }));
  check('sair por POST de 1 clique (Gmail) sem apagar as outras preferências', ok2.status === 200 && DB.notification_preferences[0].channels.estudo[0] === 'email' && Array.isArray(DB.notification_preferences[0].channels.cartoes_professora) && DB.notification_preferences[0].channels.cartoes_professora.length === 0);
  DB.notification_preferences[0].channels.cartoes_professora = ['email'];
  const okOld = await handler(new Request(`${U}?u=ativa&t=${tkOld}&l=pt`, { method: 'POST' }));
  check('link antigo (assinado com a senha do agendamento) ainda vale no POST', okOld.status === 200 && DB.notification_preferences[0].channels.cartoes_professora.length === 0);
  DB.notification_preferences[0].channels.cartoes_professora = ['email'];
  const bad = await handler(new Request(`${U}?u=outra&t=${tk}`, { method: 'POST' }));
    check('sair: assinatura de outra conta é recusada no POST (400, JSON) e nada muda', bad.status === 400 && (await bad.json()).error === 'invalid_link' && DB.notification_preferences[0].channels.cartoes_professora[0] === 'email');

  // e-mail de teste para a dona
  sent.length = 0;
  const tr = await post({ test_to: 'dona@x.test', test_lang: 'en', test_name: 'Marina', test_n: 5 });
  check('e-mail de teste: vai só para o endereço pedido, com TEST no assunto', tr.status === 200 && sent.length === 1 && sent[0].to === 'dona@x.test' && sent[0].subject.startsWith('TEST: ') && !(DB.teacher_cards_digest_log || []).length, sent);

  console.log(`Função teacher-cards-digest: ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})();
