#!/usr/bin/env node
// P8.1 / P8.2 / P8.5 -- teste E2E REAL do Public Deck contra o STAGING (Auth + PostgREST + Storage).
//
// Uso (no SEU terminal, nunca nesta sessão de IA):
//     node tests/fase-public-deck/staging_storage_test.js
//
// Segurança:
//   * Alvo FIXO: projeto Staging ilfjzizjfcmhibkhwber. Produção (eigjocalzwamisgqilhg) nunca é usada;
//     o script aborta se encontrar qualquer ambiguidade de alvo.
//   * Só a chave PUBLICÁVEL do Staging (a mesma que o navegador usa; não é segredo). Nada de
//     service_role, secret key, alteração de RLS/policies/schema/migrations.
//   * Senhas pedidas por prompt oculto; existem só na memória deste processo. Tokens nunca são
//     impressos (só um hash curto do session_id, para provar que as sessões são distintas).
//   * Escrita só em dados criados por ESTE teste (identificados pelo RUN id, por ids retornados e
//     pela tag de execução). A limpeza apaga somente esses itens, por id/caminho exato.
//
// Contas (as mesmas do teste real da 066):
//   autor   = staging-free@idiomas.test     (publica; Free basta)
//   copiador= staging-premium@idiomas.test  (importa; Premium exigido) -- 2 logins = 2 sessões
//   opcional: uma 2ª conta Premium para o caso de usuários distintos em paralelo (P8.2b)
'use strict';
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const STAGING_REF = 'ilfjzizjfcmhibkhwber';
const PROD_REF = 'eigjocalzwamisgqilhg';
const SB_URL = `https://${STAGING_REF}.supabase.co`;
const PUBLISHABLE_KEY = 'sb_publishable_dj4ZuaQsArPDc2BmCQa-pw_k_fJZSt6';
const BUCKET = 'flashcard-media';
const LANG = 'frances';
const DEFAULT_AUTHOR = 'staging-free@idiomas.test';
const DEFAULT_COPIER = 'staging-premium@idiomas.test';

const RUN = 'p8' + new Date().toISOString().replace(/[^0-9]/g, '').slice(2, 14) + crypto.randomBytes(2).toString('hex');
const RUN_TAG = 'p8t-' + RUN;           // tag canônica gravada em toda Note criada pelo teste
const P8_TAG = 'p8-homologacao';

// ============================================================================
// Trava de alvo
// ============================================================================
function assertTarget(){
  const host = new URL(SB_URL).hostname;
  const bad = host !== `${STAGING_REF}.supabase.co` || SB_URL.includes(PROD_REF) || PUBLISHABLE_KEY.includes(PROD_REF);
  if (bad){ console.error('ABORTADO: o alvo não é exclusivamente o Staging.'); process.exit(2); }
  for (const v of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'PD_SUPABASE_URL', 'PD_ANON_KEY']){
    if (process.env[v]){ console.error(`ABORTADO: variável ${v} definida no ambiente (ambiguidade de alvo/credencial).`); process.exit(2); }
  }
  if (typeof fetch !== 'function'){ console.error('ABORTADO: precisa de Node 18+ (fetch nativo).'); process.exit(2); }
  console.log('============================================================');
  console.log(' PROJETO ALVO (project_ref): ' + STAGING_REF + '   [STAGING]');
  console.log(' URL: ' + SB_URL);
  console.log(' Produção (' + PROD_REF + ') NÃO é usada por este script.');
  console.log(' Este script NÃO executa migrations e NÃO altera schema/RLS/policies.');
  console.log(' RUN id: ' + RUN + '   (tag das Notes criadas: ' + RUN_TAG + ')');
  console.log('============================================================');
}

// ============================================================================
// Entrada
// ============================================================================
let STDIN_LINES = null;
function readPipedLine(){
  if (!STDIN_LINES){ const buf = fs.readFileSync(0, 'utf8'); STDIN_LINES = buf.split(/\r?\n/); }
  return STDIN_LINES.length ? STDIN_LINES.shift() : '';
}
function ask(label){
  if (!process.stdin.isTTY){ process.stdout.write(label + '\n'); return Promise.resolve(readPipedLine()); }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(label, (a) => { rl.close(); resolve(a); });
  });
}
function askHidden(label){
  if (!process.stdin.isTTY){ process.stdout.write(label + '\n'); return Promise.resolve(readPipedLine()); }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (s){ if (s.includes(label)) rl.output.write(label); };
    rl.question(label, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

// ============================================================================
// HTTP (nunca imprime cabeçalhos; erros mostram só status + corpo do servidor)
// ============================================================================
function jwtClaims(token){
  try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8')); } catch (e){ return {}; }
}
const shortHash = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 10);

async function signIn(email, password){
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = null; try { j = await r.json(); } catch (e){}
  if (!r.ok || !j || !j.access_token) throw new Error(`login falhou (${email}): ${(j && (j.error_description || j.msg || j.error)) || r.status}`);
  const c = jwtClaims(j.access_token);
  const user = j.user || {};
  if (user.email && user.email.toLowerCase() !== email.toLowerCase()) throw new Error('e-mail da sessão não confere');
  if (!c.sub || c.sub !== user.id) throw new Error('JWT sem sub coerente');
  if (c.iss && !String(c.iss).includes(STAGING_REF)) throw new Error('JWT emitido por outro projeto (iss) -- abortado');
  return { token: j.access_token, id: c.sub, email, sessionTag: shortHash(c.session_id || j.access_token) };
}

const H = (s, extra) => Object.assign({ apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + (s ? s.token : PUBLISHABLE_KEY) }, extra || {});
async function readBody(r){ const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch (e){ return t; } }

async function rest(method, pathQ, s, body, prefer){
  const headers = H(s, { 'Content-Type': 'application/json' });
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${pathQ}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, ok: r.ok, body: await readBody(r), headers: r.headers };
}
async function rpc(fn, args, s){ return rest('POST', `rpc/${fn}`, s, args || {}); }
async function countRows(table, filter, s){
  const r = await fetch(`${SB_URL}/rest/v1/${table}?select=id&${filter}`, { headers: H(s, { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' }) });
  await r.text();
  const cr = r.headers.get('content-range') || '';
  const n = Number(cr.split('/')[1]);
  if (!Number.isFinite(n)) throw new Error(`contagem falhou em ${table}: HTTP ${r.status}`);
  return n;
}
const inList = (ids) => `in.(${ids.map(Number).join(',')})`;

// Storage
const objPath = (p) => p.split('/').map(encodeURIComponent).join('/');
const publicUrl = (p) => `${SB_URL}/storage/v1/object/public/${BUCKET}/${p}`;
async function upload(s, p, bytes, contentType){
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${objPath(p)}`, {
    method: 'POST', headers: H(s, { 'Content-Type': contentType || 'audio/mpeg', 'x-upsert': 'false' }), body: bytes });
  return { status: r.status, ok: r.ok, body: await readBody(r) };
}
async function storageCopy(s, src, dst){
  const r = await fetch(`${SB_URL}/storage/v1/object/copy`, {
    method: 'POST', headers: H(s, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: src, destinationKey: dst }) });
  return { status: r.status, ok: r.ok, body: await readBody(r) };
}
async function storageRemove(s, paths){
  if (!paths.length) return { ok: true, removed: [] };
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: H(s, { 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: paths }) });
  const b = await readBody(r);
  return { ok: r.ok, status: r.status, removed: Array.isArray(b) ? b.map(o => o.name) : [], body: b };
}
async function publicGet(p){
  const r = await fetch(publicUrl(p));
  const buf = Buffer.from(await r.arrayBuffer());
  return { ok: r.ok, status: r.status, bytes: buf };
}
async function listFolder(s, uid){
  const out = new Set();
  for (let offset = 0; ; offset += 1000){
    const r = await fetch(`${SB_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers: H(s, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: uid, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    const b = await readBody(r);
    if (!r.ok || !Array.isArray(b)) throw new Error(`listagem do Storage falhou (HTTP ${r.status})`);
    b.filter(o => o && o.id).forEach(o => out.add(`${uid}/${o.name}`));
    if (b.length < 1000) break;
  }
  return out;
}
// Existência de UM objeto SEM depender do cache HTTP do link público: a listagem do Storage
// (POST /object/list) lê a tabela storage.objects. O link público pode continuar servindo um
// objeto já apagado por um tempo (cache) — por isso NUNCA é usado para decidir existência.
async function storageStat(s, p){
  const i = p.lastIndexOf('/'); const dir = p.slice(0, i), name = p.slice(i + 1);
  const r = await fetch(`${SB_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST', headers: H(s, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix: dir, search: name, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } }) });
  const b = await readBody(r);
  if (!r.ok || !Array.isArray(b)) throw new Error(`consulta ao Storage falhou (HTTP ${r.status})`);
  const o = b.find(x => x && x.id && x.name === name);
  if (!o) return { exists: false };
  const md = o.metadata || {};
  return { exists: true, etag: md.eTag || null, size: md.size == null ? null : md.size, updated: o.updated_at || null };
}
const storageExists = async (s, p) => (await storageStat(s, p)).exists;
// Diagnóstico (não decide nada): objeto inexistente no Storage cujo link público ainda responde.
async function noteIfCached(s, p){
  if (await storageExists(s, p)) return;
  if ((await publicGet(p)).ok) note(`diagnóstico: ${path.basename(p)} já não existe no Storage, mas o link público ainda é servido (cache HTTP).`);
}

// ============================================================================
// Cliente REAL do app (shared/public-deck.js) sobre um supabaseClient mínimo via fetch.
// Cada contexto = uma "aba" independente (Set de imports em andamento próprio).
// ============================================================================
const PUBLIC_DECK_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'public-deck.js'), 'utf8');
function makeSupabaseClient(s, log){
  const err = (status, b) => ({ message: (b && (b.message || b.error || b.msg)) || (typeof b === 'string' ? b : 'HTTP ' + status), code: (b && b.code) || '', status });
  return {
    rpc: async (fn, args) => {
      const t0 = Date.now();
      const r = await rpc(fn, args, s);
      if (log) log.push({ fn, t0, t1: Date.now(), ok: r.ok });
      return r.ok ? { data: r.body, error: null } : { data: null, error: err(r.status, r.body) };
    },
    storage: {
      from: (bucket) => ({
        copy: async (from, to) => {
          if (bucket !== BUCKET) throw new Error('bucket inesperado');
          const r = await storageCopy(s, from, to);
          return r.ok ? { data: { path: to }, error: null } : { data: null, error: err(r.status, r.body) };
        },
        remove: async (paths) => {
          const r = await storageRemove(s, paths);
          return r.ok ? { data: r.body, error: null } : { data: null, error: err(r.status, r.body) };
        },
        getPublicUrl: (p) => ({ data: { publicUrl: publicUrl(p) } }),
      }),
    },
  };
}
function makeAppContext(s, log){
  const ctx = vm.createContext({
    console: { log(){}, warn(){}, error(){} }, // o app loga erros de compensação; aqui o teste verifica o efeito
    setTimeout, clearTimeout, Date, Math, JSON, URL, Promise,
    document: { getElementById: () => null },
    window: { location: { hash: '', href: 'http://localhost/fr/' } },
    supabaseClient: makeSupabaseClient(s, log),
    CURRENT_USER: { id: s.id },
  });
  vm.runInContext(PUBLIC_DECK_SRC, ctx, { filename: 'shared/public-deck.js' });
  const call = (fn, ...args) => { ctx.__args = args; return vm.runInContext(`${fn}(...__args)`, ctx); };
  return { call };
}

// ============================================================================
// Relatório
// ============================================================================
const SECTIONS = {};
let current = null;
function section(id, title){ current = id; SECTIONS[id] = { title, checks: [], status: null, notes: [] }; console.log(`\n================ ${id} — ${title} ================`); }
function check(name, cond, info){
  const ok = !!cond;
  SECTIONS[current].checks.push({ name, ok });
  console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${name}${ok || info === undefined ? '' : '  -> ' + safe(info)}`);
  return ok;
}
function note(msg){ SECTIONS[current].notes.push(msg); console.log('  · ' + msg); }
function block(id, reason){ SECTIONS[id] = SECTIONS[id] || { title: id, checks: [], notes: [] }; SECTIONS[id].status = 'BLOCKED'; SECTIONS[id].notes.push(reason); }
function safe(x){ const t = typeof x === 'string' ? x : JSON.stringify(x); return (t || '').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt>').slice(0, 400); }
const errCode = (r) => { const m = /(premium_required|unavailable|duplicates_changed|invalid_selection|deck_too_large|deck_media_too_large|cannot_copy_own_deck|invalid_destination|media_map_incomplete|invalid_media_map)/.exec(JSON.stringify(r && r.body || '')); return m ? m[1] : null; };

// ============================================================================
// Registro do que o teste cria (a limpeza só toca nisto)
// ============================================================================
const REG = { accounts: new Map() };
function acct(s){
  if (!REG.accounts.has(s.id)) REG.accounts.set(s.id, { session: s, label: s.label, decks: new Set(), copiedRoots: new Set(), objects: new Set(), published: new Set(), baseline: null });
  return REG.accounts.get(s.id);
}
async function snapshot(s){
  const decks = await rest('GET', `decks?select=id,kind&owner_id=eq.${s.id}`, s);
  if (!decks.ok) throw new Error('não foi possível ler os Decks da conta ' + s.label);
  return {
    deckIds: new Set(decks.body.map(d => d.id)),
    roots: decks.body.filter(d => d.kind === 'root' || d.kind === 'personal_root').length,
    notes: await countRows('own_flashcards', `owner_id=eq.${s.id}`, s),
    objects: await listFolder(s, s.id),
  };
}

// ============================================================================
// Fixtures (Notes nativas no formato do editor)
// ============================================================================
let fid = 0;
const fieldId = () => `f-${RUN}-${++fid}`;
function F(lang, value, extra){ return Object.assign({ id: fieldId(), lang, role: null, content: { value }, audio: null, image: null, pinyinFieldId: null }, extra || {}); }
function uploadAudio(url, extra){ return Object.assign({ type: 'upload', url, uploadedAt: new Date().toISOString(), mimeType: 'audio/mpeg' }, extra || {}); }
const noteRow = (uid, deckId, mode, fields, front, back) => ({
  owner_id: uid, language_app_key: LANG, deck_id: deckId, fields, card_generation_mode: mode,
  front: front == null ? null : front, back_trans: back, tags: [P8_TAG, RUN_TAG], status: 'active',
  note: 'nota-privada-p8-nunca-publica',
});
const audioBytes = (label) => Buffer.from(`ID3\u0003\u0000\u0000\u0000\u0000\u0000\u0000p8-${RUN}-${label}-` + crypto.randomBytes(16).toString('hex'));

async function authorDeck(A, name, parentId){
  const r = await rest('POST', 'decks?select=id,name', A, { owner_id: A.id, kind: 'personal', name, language_app_key: LANG, parent_deck_id: parentId }, 'return=representation');
  if (!r.ok || !r.body || !r.body[0]) throw new Error('criar Deck do autor falhou: ' + safe(r.body));
  acct(A).decks.add(r.body[0].id);
  return r.body[0].id;
}
async function authorNotes(A, rows){
  const ids = [];
  for (let i = 0; i < rows.length; i += 200){
    const r = await rest('POST', 'own_flashcards?select=id', A, rows.slice(i, i + 200), 'return=representation');
    if (!r.ok) throw new Error('criar Notes do autor falhou: ' + safe(r.body));
    r.body.forEach(x => ids.push(x.id));
  }
  return ids;
}
async function authorUpload(A, label){
  const p = `${A.id}/p8test-${RUN}-${label}.mp3`;
  const bytes = audioBytes(label);
  const r = await upload(A, p, bytes, 'audio/mpeg');
  if (!r.ok) throw new Error(`upload do autor falhou (${label}): HTTP ${r.status} ${safe(r.body)}`);
  acct(A).objects.add(p);
  return { path: p, url: publicUrl(p), bytes };
}
async function publish(A, deckId){
  const r = await rpc('publish_deck', { p_deck_id: deckId, p_description: 'P8 homologação ' + RUN, p_icon: 'star', p_color: 'teal' }, A);
  if (!r.ok) throw new Error('publish_deck falhou: ' + safe(r.body));
  acct(A).published.add(deckId);
  return r.body;
}
function simpleNotes(uid, deckId, n, label, audioByIndex){
  const rows = [];
  for (let i = 0; i < n; i++){
    const a = audioByIndex && audioByIndex[i];
    rows.push(noteRow(uid, deckId, 'normal', [
      F('fr', `${label}-${RUN}-mot-${i}`, a ? { audio: uploadAudio(a.url) } : {}),
      F('pt-BR', `${label}-${RUN}-palavra-${i}`),
    ], `${label}-${RUN}-mot-${i}`, `${label}-${RUN}-palavra-${i}`));
  }
  return rows;
}

// ============================================================================
// Coleta de mídia de Fields
// ============================================================================
function mediaUrlsOf(fields){
  const out = [];
  (fields || []).forEach(f => ['audio', 'image'].forEach(k => {
    const o = f && f[k];
    if (o && typeof o === 'object'){ if (o.url) out.push(o.url); if (o.generatedUrl) out.push(o.generatedUrl); }
  }));
  return out;
}
function mediaHasPrivateKeys(fields){
  return (fields || []).some(f => ['audio', 'image'].some(k => f && f[k] && typeof f[k] === 'object' && ('storagePath' in f[k] || 'generationKey' in f[k])));
}
const pathFromUrl = (u) => { const m = /\/storage\/v1\/object\/public\/flashcard-media\/([^?#]+)$/.exec(String(u || '')); return m ? decodeURIComponent(m[1]) : null; };

async function copierNotesByRunTag(s){
  const r = await rest('GET', `own_flashcards?select=id,deck_id,fields,tags,note,card_generation_mode&owner_id=eq.${s.id}&tags=cs.{${RUN_TAG}}&order=id`, s);
  if (!r.ok) throw new Error('leitura das Notes copiadas falhou');
  return r.body;
}
async function deckSubtree(s, rootId){
  const ids = [rootId];
  for (let i = 0; i < ids.length && ids.length < 500; i++){
    const r = await rest('GET', `decks?select=id&owner_id=eq.${s.id}&parent_deck_id=eq.${ids[i]}`, s);
    if (r.ok) r.body.forEach(d => { if (!ids.includes(d.id)) ids.push(d.id); });
  }
  return ids;
}
function registerCopy(s, result){ if (result && result.deck_id) acct(s).copiedRoots.add(result.deck_id); }
async function registerNewCopierObjects(s){
  const a = acct(s);
  const now = await listFolder(s, s.id);
  for (const p of now) if (!a.baseline.objects.has(p) && /\/pubcopy-|\/p8test-/.test(p)) a.objects.add(p);
  return now;
}

// ============================================================================
// Direct-RPC helpers (para casos de falha que o cliente nunca produziria)
// ============================================================================
async function planFor(s, publicId){
  const r = await rpc('check_public_deck_duplicates', { p_public_id: publicId, p_dest_deck_id: null }, s);
  if (!r.ok) throw new Error('check_public_deck_duplicates falhou: ' + safe(r.body));
  return r.body;
}
const selectionOf = (plan) => (plan.notes || []).filter(n => n.selectable && n.selected_default).map(n => ({ sig: n.sig, cls: n.cls }));
async function copyMediaForManifest(s, items, tag){
  const map = {}; const created = [];
  let i = 0;
  for (const it of items){
    const dest = `${s.id}/pubcopy-p8test-${RUN}-${tag}-${i++}.mp3`;
    const r = await storageCopy(s, it.path, dest);
    if (!r.ok) throw new Error(`storage.copy falhou (${tag}): HTTP ${r.status} ${safe(r.body)}`);
    acct(s).objects.add(dest); created.push(dest);
    map[it.url] = publicUrl(dest);
  }
  return { map, created };
}

// ============================================================================
// P8.1 — Storage real
// ============================================================================
async function p81(A, B1){
  section('P8.1', 'Storage real (policies, storage.copy, independência física)');
  const t = `${RUN}-p81`;
  const src = `${A.id}/p8test-${t}-src.mp3`, dst = `${B1.id}/pubcopy-p8test-${t}-dst.mp3`;
  const bytes = audioBytes('p81');
  const up = await upload(A, src, bytes, 'audio/mpeg');
  if (up.ok) acct(A).objects.add(src);
  check('autor sobe arquivo na PRÓPRIA pasta', up.ok, up);

  const cross = `${B1.id}/p8test-${t}-intruso.mp3`;
  const upX = await upload(A, cross, bytes, 'audio/mpeg');
  if (upX.ok) acct(B1).objects.add(cross);    // se a policy falhasse, ainda assim limpamos (pelo dono da pasta)
  check('autor NÃO sobe na pasta do copiador (1º segmento ≠ auth.uid())', !upX.ok, upX);

  const anonUp = await upload(null, `${A.id}/p8test-${t}-anon.mp3`, bytes, 'audio/mpeg');
  if (anonUp.ok) acct(A).objects.add(`${A.id}/p8test-${t}-anon.mp3`);
  check('anônimo NÃO sobe no bucket', !anonUp.ok, anonUp);

  const badMime = `${A.id}/p8test-${t}-mime.txt`;
  const upM = await upload(A, badMime, Buffer.from('texto'), 'text/plain');
  if (upM.ok) acct(A).objects.add(badMime);
  check('bucket recusa MIME fora da lista (text/plain) — migration 046', !upM.ok, upM);

  const big = `${A.id}/p8test-${t}-big.mp3`;
  const upB = await upload(A, big, Buffer.alloc(5 * 1024 * 1024 + 1024, 0x41), 'audio/mpeg');
  if (upB.ok) acct(A).objects.add(big);
  check('bucket recusa arquivo > 5 MiB — migration 046', !upB.ok, { status: upB.status });

  const cp = await storageCopy(B1, src, dst);
  if (cp.ok) acct(B1).objects.add(dst);
  check('copiador faz storage.copy da origem do autor para a PRÓPRIA pasta', cp.ok, cp);

  const evil = `${A.id}/p8test-${t}-evil.mp3`;
  const cpE = await storageCopy(B1, src, evil);
  if (cpE.ok) acct(A).objects.add(evil);
  check('copiador NÃO copia para a pasta do autor', !cpE.ok, cpE);

  const anonDst = `${B1.id}/pubcopy-p8test-${t}-anon.mp3`;
  const cpA = await storageCopy(null, src, anonDst);
  if (cpA.ok) acct(B1).objects.add(anonDst);
  check('anônimo NÃO faz storage.copy', !cpA.ok, cpA);

  const cpO = await storageCopy(B1, src, dst);
  check('storage.copy sobre destino existente falha (sem upsert)', !cpO.ok, cpO);

  const g = await publicGet(dst);
  check('cópia física tem o MESMO conteúdo da origem', g.ok && Buffer.compare(g.bytes, bytes) === 0, { status: g.status });

  // Existência sempre pela listagem do Storage (storageStat), nunca pelo link público em cache.
  check('pré-condição: origem e cópia existem no Storage', (await storageExists(A, src)) && (await storageExists(B1, dst)));
  await storageRemove(B1, [src]);
  check('copiador NÃO apaga objeto do autor (continua existindo no Storage)', await storageExists(A, src));
  await storageRemove(A, [dst]);
  check('autor NÃO apaga objeto do copiador (continua existindo no Storage)', await storageExists(B1, dst));
  const st0 = await storageStat(B1, dst);
  const ow = await upload(A, dst, Buffer.from('sobrescrita'), 'audio/mpeg');
  const st1 = await storageStat(B1, dst);
  check('autor NÃO sobrescreve objeto do copiador (eTag/updated_at inalterados no Storage)', !ow.ok && st1.exists && st1.etag === st0.etag && st1.updated === st0.updated, { ow, antes: st0, depois: st1 });

  const delSrc = await storageRemove(A, [src]);
  const gone = !(await storageExists(A, src));
  if (gone) acct(A).objects.delete(src);
  check('autor apaga o PRÓPRIO original (inexistente no Storage)', delSrc.ok && gone, delSrc);
  await noteIfCached(A, src);
  const surv = await publicGet(dst);
  check('a cópia do copiador sobrevive à remoção do original (objeto físico independente)', (await storageExists(B1, dst)) && surv.ok && Buffer.compare(surv.bytes, bytes) === 0, { status: surv.status });
  note('Leitura do bucket é pública por desenho (032): o autor pode LER a URL do copiador; o que se exige é que não possa escrever/apagar — verificado acima.');
}

// ============================================================================
// P8.5 — Mídia ponta a ponta (manifest → storage.copy real → copy_public_deck)
// ============================================================================
async function p85(A, B1, authorUsername){
  section('P8.5', 'Mídia ponta a ponta com Storage real (cliente real do app)');
  const a = acct(A);
  // --- fixtures do autor: árvore Raiz(pública) -> Sub(pública) ---
  const mA = await authorUpload(A, 'e2e-a');   // compartilhado por 2 Notes (dedup)
  const mB = await authorUpload(A, 'e2e-b');
  const mT = await authorUpload(A, 'e2e-tts'); // generatedUrl de TTS
  const mI = await authorUpload(A, 'e2e-img'); // referenciado como image.url
  const pr = (await rest('GET', `decks?select=id&owner_id=eq.${A.id}&kind=eq.personal_root&language_app_key=eq.${LANG}`, A)).body[0].id;
  const root = await authorDeck(A, `P8 E2E ${RUN}`, pr);
  const sub = await authorDeck(A, `P8 E2E Sub ${RUN}`, root);
  const L = `e2e`;
  const rows = [
    noteRow(A.id, root, 'normal', [F('fr', `${L}-${RUN}-bonjour`, { audio: uploadAudio(mA.url, { storagePath: mA.path, generationKey: 'gk-autor-secreta' }) }), F('pt-BR', `${L}-${RUN}-olá`)], `${L}-${RUN}-bonjour`, `${L}-${RUN}-olá`),
    noteRow(A.id, root, 'normal_reversed', [F('fr', `${L}-${RUN}-merci`, { audio: { type: 'tts', text: null, language: 'fr-FR', voiceId: null, rate: null, generationKey: 'gk-tts-autor', generatedUrl: mT.url, generatedAt: new Date().toISOString(), storagePath: mT.path } }), F('pt-BR', `${L}-${RUN}-obrigado`)], `${L}-${RUN}-merci`, `${L}-${RUN}-obrigado`),
    noteRow(A.id, root, 'cloze', [F('fr', `${L}-${RUN} {{c1::je}} {{c2::suis}} là`), F('pt-BR', `${L}-${RUN}-eu estou aqui`)], null, `${L}-${RUN}-eu estou aqui`),
    noteRow(A.id, root, 'type_answer', [F('pt-BR', `${L}-${RUN}-casa`), F('fr', `${L}-${RUN}-maison`, { image: { url: mI.url, storagePath: mI.path } })], `${L}-${RUN}-casa`, `${L}-${RUN}-maison`),
    noteRow(A.id, root, 'multiple_choice', [F('fr', `${L}-${RUN}-chat`, { role: 'prompt' }), F('pt-BR', `${L}-${RUN}-gato`, { role: 'answer' }), F('pt-BR', `${L}-${RUN}-cão`, { role: 'distractor' })], `${L}-${RUN}-chat`, `${L}-${RUN}-gato`),
    noteRow(A.id, root, 'normal', [F('fr', `${L}-${RUN}-externe`, { audio: { type: 'url', url: 'https://example.com/p8-externo.mp3' } }), F('pt-BR', `${L}-${RUN}-externo`)], `${L}-${RUN}-externe`, `${L}-${RUN}-externo`),
    noteRow(A.id, sub, 'normal', [F('fr', `${L}-${RUN}-pain`, { audio: uploadAudio(mA.url) }), F('pt-BR', `${L}-${RUN}-pão`)], `${L}-${RUN}-pain`, `${L}-${RUN}-pão`),
    noteRow(A.id, sub, 'normal', [F('fr', `${L}-${RUN}-eau`, { audio: uploadAudio(mB.url) }), F('pt-BR', `${L}-${RUN}-água`)], `${L}-${RUN}-eau`, `${L}-${RUN}-água`),
  ];
  await authorNotes(A, rows);
  const pubRoot = await publish(A, root);
  await publish(A, sub);
  const PUBID = pubRoot.public_id;
  check('Deck publicado e visível no perfil (public_profile do autor)', !!PUBID && pubRoot.visible_on_profile === true, pubRoot);
  if (!pubRoot.visible_on_profile){ note('BLOCKED: o perfil do autor não é público; sem isso o Deck fica "unavailable". O teste não altera o perfil.'); SECTIONS['P8.5'].status = 'BLOCKED'; return null; }

  // 1. conteúdo público, visto pelo copiador
  const meta = await rpc('get_public_deck', { p_public_id: PUBID }, B1);
  check('get_public_deck (copiador Premium) devolve o Deck', meta.ok && meta.body && !meta.body.error, meta.body);
  const pn = await rpc('get_public_deck_notes', { p_public_id: PUBID }, B1);
  const pnotes = (pn.body && pn.body.notes) || [];
  check('get_public_deck_notes: 6 Notes da raiz', pn.ok && pnotes.length === 6, { n: pnotes.length });
  check('conteúdo público sem nota privada / ids / FSRS', pn.ok && !JSON.stringify(pn.body).includes('nota-privada-p8') && pnotes.every(n => !('id' in n) && !('owner_id' in n) && !('note' in n)));
  check('conteúdo público sem storagePath/generationKey em áudio', pnotes.every(n => (n.fields || []).every(f => !(f.audio && typeof f.audio === 'object' && ('storagePath' in f.audio || 'generationKey' in f.audio)))));
  const imgLeak = pnotes.some(n => (n.fields || []).some(f => f.image && typeof f.image === 'object' && 'storagePath' in f.image));
  note(`observação: storagePath em image no conteúdo público: ${imgLeak ? 'PRESENTE (public_note_native só remove de audio)' : 'ausente'}`);

  // 2. origens existem fisicamente
  for (const m of [mA, mB, mT, mI]) check(`origem existe no Storage: ${path.basename(m.path)}`, await storageExists(A, m.path));

  // ---- falhas ANTES do caminho feliz (cada uma não pode deixar nada) ----
  // Cada cenário tem a SUA linha de base, tirada imediatamente antes dele: um órfão deixado por um
  // cenário reprova ESSE cenário e não contamina a contagem do seguinte. A limpeza final remove os
  // órfãos (registrados abaixo), mas isso nunca transforma em PASS o cenário que os deixou.
  const app = makeAppContext(B1);
  const copierState = async () => ({ notes: await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1), decks: (await rest('GET', `decks?select=id&owner_id=eq.${B1.id}`, B1)).body.length, objs: await listFolder(B1, B1.id) });
  const unchanged = async (label, base) => {
    const n = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1);
    const d = (await rest('GET', `decks?select=id&owner_id=eq.${B1.id}`, B1)).body.length;
    const o = await listFolder(B1, B1.id);
    const extra = [...o].filter(p => !base.objs.has(p));
    extra.forEach(p => { if (/\/pubcopy-/.test(p)) acct(B1).objects.add(p); });
    check(`${label}: copiador sem Note/Deck novo (atomicidade)`, n === base.notes && d === base.decks, { notes: n - base.notes, decks: d - base.decks });
    check(`${label}: nenhum objeto órfão deixado na pasta do copiador (só o que ESTE cenário criou)`, extra.length === 0, extra);
    if (extra.length) note(`${label} deixou ${extra.length} objeto(s) órfão(s); a limpeza final os remove, mas este cenário continua reprovado.`);
  };

  const plan = await app.call('fetchPublicDeckImportPlan', PUBID, null);
  check('plano (check_public_deck_duplicates) via cliente real', plan.ok && plan.plan.notes.length === 8, plan.ok ? { n: plan.plan.notes.length, counts: plan.plan.counts } : plan);
  const checked = plan.plan.notes.filter(n => n.selected_default).map(n => n.sig);
  const selection = await app.call('publicDeckPlanSelection', plan.plan, checked);
  check('todas as 8 Notes são NONE e selecionáveis', selection.length === 8 && plan.plan.notes.every(n => n.cls === 'none'), plan.plan.counts);

  const man = await app.call('fetchPublicDeckMediaManifest', PUBID, selection);
  const expUrls = new Set([mA.url, mB.url, mT.url, mI.url]);
  const manUrls = new Set((man.items || []).map(i => i.url));
  check('manifest: exatamente as 4 URLs distintas do bucket (dedup; link externo fora)', man.ok && manUrls.size === 4 && [...expUrls].every(u => manUrls.has(u)) && man.items.length === 4, man.items);

  // F1: RPC com mapa vazio -> media_map_incomplete
  const b1 = await copierState();
  const f1 = await rpc('copy_public_deck', { p_public_id: PUBID, p_dest_deck_id: null, p_media_map: {}, p_selection: selection }, B1);
  check('F1 mapa vazio → media_map_incomplete', !f1.ok && errCode(f1) === 'media_map_incomplete', f1.body);
  await unchanged('F1', b1);

  // F2: destino inexistente na pasta do copiador -> invalid_media_map
  const ghost = {}; for (const u of manUrls) ghost[u] = publicUrl(`${B1.id}/pubcopy-p8test-${RUN}-nao-existe-${shortHash(u)}.mp3`);
  const b2 = await copierState();
  const f2 = await rpc('copy_public_deck', { p_public_id: PUBID, p_dest_deck_id: null, p_media_map: ghost, p_selection: selection }, B1);
  check('F2 destino inexistente → invalid_media_map', !f2.ok && errCode(f2) === 'invalid_media_map', f2.body);
  await unchanged('F2', b2);

  // F3: destino na pasta do AUTOR (objeto real) -> invalid_media_map
  const steal = {}; for (const u of manUrls) steal[u] = mB.url;
  const b3 = await copierState();
  const f3 = await rpc('copy_public_deck', { p_public_id: PUBID, p_dest_deck_id: null, p_media_map: steal, p_selection: selection }, B1);
  check('F3 destino na pasta do autor → invalid_media_map (cópia nunca aponta para o autor)', !f3.ok && errCode(f3) === 'invalid_media_map', f3.body);
  await unchanged('F3', b3);

  // F4: fluxo do cliente real com falha DEFINITIVA da RPC depois da mídia copiada -> compensação
  const badSel = selection.map((x, i) => i === 0 ? { sig: x.sig, cls: 'variant' } : x);
  const b4 = await copierState();
  const f4 = await app.call('copyPublicDeckWithMedia', PUBID, null, null, badSel);
  check('F4 cliente real: RPC falha (duplicates_changed) depois do storage.copy', !f4.ok && f4.code === 'duplicates_changed', f4);
  await unchanged('F4 (compensação do cliente removeu as cópias)', b4);

  // F5: Deck com mídia de origem AUSENTE -> storage.copy falha no cliente, nada criado
  const missDeck = await authorDeck(A, `P8 E2E Ausente ${RUN}`, pr);
  const mOk = await authorUpload(A, 'e2e-miss-ok');
  const missingUrl = publicUrl(`${A.id}/p8test-${RUN}-nunca-enviado.mp3`);
  await authorNotes(A, [
    noteRow(A.id, missDeck, 'normal', [F('fr', `miss-${RUN}-un`, { audio: uploadAudio(mOk.url) }), F('pt-BR', `miss-${RUN}-um`)], `miss-${RUN}-un`, `miss-${RUN}-um`),
    noteRow(A.id, missDeck, 'normal', [F('fr', `miss-${RUN}-deux`, { audio: uploadAudio(missingUrl) }), F('pt-BR', `miss-${RUN}-dois`)], `miss-${RUN}-deux`, `miss-${RUN}-dois`),
  ]);
  const missPub = await publish(A, missDeck);
  const b5 = await copierState();
  const f5 = await app.call('copyPublicDeckWithMedia', missPub.public_id, null, null, null);
  check('F5 mídia de origem ausente → cliente aborta antes da RPC', !f5.ok, f5);
  await unchanged('F5', b5);

  // ---- caminho feliz ----
  const bOk = await copierState();
  const res = await app.call('copyPublicDeckWithMedia', PUBID, null, null, selection);
  registerCopy(B1, res.ok && res.result);
  check('cópia real (manifest → storage.copy → copy_public_deck) concluída', res.ok, res);
  if (!res.ok){ await registerNewCopierObjects(B1); return null; }
  const R = res.result;
  check('resultado: 8 Notes, 2 Decks, 5 referências de mídia remapeadas', R.notes_copied === 8 && R.decks_created === 2 && R.media_remapped === 5, R);
  const nowObjs = await registerNewCopierObjects(B1);
  const newObjs = [...nowObjs].filter(p => !bOk.objs.has(p));
  check('exatamente 4 objetos novos na pasta do copiador (1 por mídia distinta)', newObjs.length === 4, newObjs);

  const copied = await copierNotesByRunTag(B1);
  const sub2 = await deckSubtree(B1, R.deck_id);
  check('Notes copiadas: 8, todas nos Decks criados', copied.length === 8 && copied.every(n => sub2.includes(n.deck_id)), { n: copied.length });
  const urls = copied.flatMap(n => mediaUrlsOf(n.fields));
  const bucketUrls = urls.filter(u => pathFromUrl(u));
  check('toda URL do bucket na cópia está na pasta do COPIADOR', bucketUrls.length === 5 && bucketUrls.every(u => pathFromUrl(u).startsWith(B1.id + '/')), bucketUrls);
  check('nenhuma URL da cópia aponta para a pasta do autor', !urls.some(u => u.includes(A.id)));
  check('link externo preservado sem cópia', urls.includes('https://example.com/p8-externo.mp3'));
  check('storagePath/generationKey removidos de audio/image na cópia', copied.every(n => !mediaHasPrivateKeys(n.fields)));
  check('nota privada nunca copiada', copied.every(n => n.note == null));
  const expectAttr = 'criado-por-' + String(authorUsername || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  check(`atribuição permanente ${expectAttr} em todas as Notes`, copied.every(n => (n.tags || []).includes(expectAttr)), copied.map(n => n.tags));
  const same = new Map(); copied.forEach(n => mediaUrlsOf(n.fields).forEach(u => { if (pathFromUrl(u)) same.set(u, (same.get(u) || 0) + 1); }));
  check('mídia compartilhada pelo autor (2 Notes) vira UM objeto reutilizado na cópia', [...same.values()].some(c => c === 2));
  const srcByDest = {};
  for (const u of bucketUrls){
    const g = await publicGet(pathFromUrl(u));
    srcByDest[u] = g;
  }
  const destExist = await Promise.all(bucketUrls.map(u => storageExists(B1, pathFromUrl(u))));
  check('todo objeto referenciado pela cópia existe fisicamente (Storage)', destExist.every(Boolean) && Object.values(srcByDest).every(g => g.ok));
  const srcBytes = new Set([mA, mB, mT, mI].map(m => m.bytes.toString('hex')));
  check('conteúdo dos objetos copiados = conteúdo das origens', Object.values(srcByDest).every(g => srcBytes.has(g.bytes.toString('hex'))));

  // RLS / acesso cruzado
  const peek = await rest('GET', `own_flashcards?select=id&id=${inList(copied.map(n => n.id))}`, A);
  check('autor NÃO lê as Notes do copiador (RLS)', peek.ok && peek.body.length === 0, peek.body);
  const someDest = pathFromUrl(bucketUrls[0]);
  await storageRemove(A, [someDest]);
  check('autor NÃO apaga mídia do copiador (continua existindo no Storage)', await storageExists(B1, someDest));

  // independência física: autor apaga as origens; a cópia continua tocável
  const origins = [mA.path, mB.path, mT.path, mI.path];
  const del = await storageRemove(A, origins);
  const allGone = (await Promise.all(origins.map(p => storageExists(A, p)))).every(e => !e);
  if (allGone) origins.forEach(p => a.objects.delete(p));
  check('autor apaga as origens (inexistentes no Storage)', del.ok && allGone, del);
  for (const p of origins) await noteIfCached(A, p);
  const afterExist = await Promise.all(bucketUrls.map(u => storageExists(B1, pathFromUrl(u))));
  const after = await Promise.all(bucketUrls.map(u => publicGet(pathFromUrl(u))));
  check('depois de apagadas as origens, toda mídia da cópia continua existindo e acessível', afterExist.every(Boolean) && after.every(g => g.ok));
  return { PUBID };
}

// ============================================================================
// P8.2 — Concorrência real
// ============================================================================
async function p82(A, B1, B2, C2){
  section('P8.2', 'Concorrência real (duas sessões)');
  check('as duas sessões do copiador são distintas (session_id diferente)', B1.sessionTag !== B2.sessionTag && B1.id === B2.id, { s1: B1.sessionTag, s2: B2.sessionTag });
  note(`sessão 1 = ${B1.sessionTag}, sessão 2 = ${B2.sessionTag} (hash do session_id; tokens nunca impressos)`);
  note('O advisory lock do contrato é POR COPIADOR (mesmo usuário). Por isso o caso que exercita o lock usa 2 sessões do MESMO usuário Premium; usuários distintos são o caso P8.2b.');
  const pr = (await rest('GET', `decks?select=id&owner_id=eq.${A.id}&kind=eq.personal_root&language_app_key=eq.${LANG}`, A)).body[0].id;

  // ---- P8.2a: duas RPCs simultâneas, mesma origem, mesma seleção ----
  const N = 400;
  const m1 = await authorUpload(A, 'conc-a1'), m2 = await authorUpload(A, 'conc-a2'), m3 = await authorUpload(A, 'conc-a3');
  const dA = await authorDeck(A, `P8 Conc A ${RUN}`, pr);
  await authorNotes(A, simpleNotes(A.id, dA, N, 'conca', { 0: m1, 1: m2, 2: m3 }));
  const pubA = (await publish(A, dA)).public_id;
  const before = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1);
  const planA1 = await planFor(B1, pubA), planA2 = await planFor(B2, pubA);
  const selA1 = selectionOf(planA1), selA2 = selectionOf(planA2);
  check('as duas sessões viram o mesmo plano (N NONE)', selA1.length === N && JSON.stringify(selA1) === JSON.stringify(selA2), { n1: selA1.length, n2: selA2.length });
  const manA1 = await rpc('get_public_deck_media_manifest', { p_public_id: pubA, p_selection: selA1 }, B1);
  const manA2 = await rpc('get_public_deck_media_manifest', { p_public_id: pubA, p_selection: selA2 }, B2);
  const cm1 = await copyMediaForManifest(B1, manA1.body.items, 'concA-s1');
  const cm2 = await copyMediaForManifest(B2, manA2.body.items, 'concA-s2');
  const t = [];
  const fire = async (s, map, sel, k) => { const t0 = Date.now(); const r = await rpc('copy_public_deck', { p_public_id: pubA, p_dest_deck_id: null, p_media_map: map, p_selection: sel }, s); t[k] = { t0, t1: Date.now() }; return r; };
  const [r1, r2] = await Promise.all([fire(B1, cm1.map, selA1, 0), fire(B2, cm2.map, selA2, 1)]);
  [r1, r2].forEach((r, i) => { if (r.ok) registerCopy(B1, r.body); });
  const wins = [r1, r2].filter(r => r.ok), loses = [r1, r2].filter(r => !r.ok);
  const overlap = t[0].t0 < t[1].t1 && t[1].t0 < t[0].t1;
  note(`tempos: s1 ${t[0].t1 - t[0].t0} ms, s2 ${t[1].t1 - t[1].t0} ms; requisições sobrepostas: ${overlap ? 'sim' : 'NÃO'}`);
  check('P8.2a exatamente uma importação vence com N Notes', wins.length === 1 && wins[0].body.notes_copied === N, [r1.body, r2.body].map(safe));
  check('P8.2a a outra recebe duplicates_changed (recálculo sob o lock) e nada cria', loses.length === 1 && errCode(loses[0]) === 'duplicates_changed', loses.map(l => l.body));
  const afterA = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1);
  check('P8.2a copiador ganhou exatamente N Notes (sem duplicação pela corrida)', afterA - before === N, { delta: afterA - before });
  check('P8.2a as requisições se sobrepuseram (a disputa pelo lock aconteceu de fato)', overlap, t);
  const winnerMap = wins.length ? (wins[0] === r1 ? cm1 : cm2) : null, loserMap = wins.length ? (wins[0] === r1 ? cm2 : cm1) : null;
  if (winnerMap){
    const copied = await copierNotesByRunTag(B1);
    const used = new Set(copied.flatMap(n => mediaUrlsOf(n.fields)).map(pathFromUrl).filter(Boolean));
    check('P8.2a a cópia vencedora usa só os objetos da sessão vencedora', winnerMap.created.every(p => used.has(p)) && loserMap.created.every(p => !used.has(p)));
    // a compensação de mídia deste caso direto-RPC é do script (o cliente real é testado em P8.2c)
    const rm = await storageRemove(B1, loserMap.created);
    check('P8.2a objetos da sessão perdedora removidos (compensação)', rm.ok);
    const removedOk = (await Promise.all(loserMap.created.map(p => storageExists(B1, p)))).every(e => !e);
    check('P8.2a objetos da sessão perdedora inexistentes no Storage', removedOk);
    if (removedOk) loserMap.created.forEach(p => acct(B1).objects.delete(p));
  }

  // ---- P8.2c: dois "tabs" do app (cliente real) ao mesmo tempo ----
  const M = 120;
  const n1 = await authorUpload(A, 'conc-c1'), n2 = await authorUpload(A, 'conc-c2');
  const dC = await authorDeck(A, `P8 Conc C ${RUN}`, pr);
  await authorNotes(A, simpleNotes(A.id, dC, M, 'concc', { 0: n1, 1: n2 }));
  const pubC = (await publish(A, dC)).public_id;
  const objsBefore = await listFolder(B1, B1.id);
  const beforeC = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1);
  const log1 = [], log2 = [];
  const tab1 = makeAppContext(B1, log1), tab2 = makeAppContext(B2, log2);
  const p1 = await tab1.call('fetchPublicDeckImportPlan', pubC, null), p2 = await tab2.call('fetchPublicDeckImportPlan', pubC, null);
  const s1 = await tab1.call('publicDeckPlanSelection', p1.plan, p1.plan.notes.filter(n => n.selected_default).map(n => n.sig));
  const s2 = await tab2.call('publicDeckPlanSelection', p2.plan, p2.plan.notes.filter(n => n.selected_default).map(n => n.sig));
  const [c1, c2] = await Promise.all([tab1.call('copyPublicDeckWithMedia', pubC, null, null, s1), tab2.call('copyPublicDeckWithMedia', pubC, null, null, s2)]);
  [c1, c2].forEach(r => { if (r.ok) registerCopy(B1, r.result); });
  const cw = [c1, c2].filter(r => r.ok), cl = [c1, c2].filter(r => !r.ok);
  check('P8.2c (cliente real) exatamente um tab importa M Notes', cw.length === 1 && cw[0].result.notes_copied === M, [c1, c2]);
  check('P8.2c o outro tab recebe duplicates_changed', cl.length === 1 && cl[0].code === 'duplicates_changed', cl);
  const afterC = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1);
  check('P8.2c copiador ganhou exatamente M Notes', afterC - beforeC === M, { delta: afterC - beforeC });
  const objsAfter = await registerNewCopierObjects(B1);
  const newC = [...objsAfter].filter(p => !objsBefore.has(p));
  const copiedAll = await copierNotesByRunTag(B1);
  const usedAll = new Set(copiedAll.flatMap(n => mediaUrlsOf(n.fields)).map(pathFromUrl).filter(Boolean));
  check('P8.2c compensação do tab perdedor: só sobram os 2 objetos usados pelo vencedor', newC.length === 2 && newC.every(p => usedAll.has(p)), newC);
  const rpc1 = log1.find(x => x.fn === 'copy_public_deck'), rpc2 = log2.find(x => x.fn === 'copy_public_deck');
  if (rpc1 && rpc2) note(`P8.2c sobreposição das RPCs de cópia: ${rpc1.t0 < rpc2.t1 && rpc2.t0 < rpc1.t1 ? 'sim' : 'não (resultado ainda correto: o 2º recalculou e recusou)'}`);

  // ---- P8.2b: usuários distintos em paralelo (opcional) ----
  if (!C2){ note('P8.2b (dois usuários Premium distintos em paralelo): NÃO EXECUTADO — exige uma 2ª conta Premium.'); return 'partial'; }
  const K = 80;
  const k1 = await authorUpload(A, 'conc-b1');
  const dB = await authorDeck(A, `P8 Conc B ${RUN}`, pr);
  await authorNotes(A, simpleNotes(A.id, dB, K, 'concb', { 0: k1 }));
  const pubB = (await publish(A, dB)).public_id;
  const u1 = makeAppContext(B1), u2 = makeAppContext(C2);
  const q1 = await u1.call('fetchPublicDeckImportPlan', pubB, null), q2 = await u2.call('fetchPublicDeckImportPlan', pubB, null);
  const z1 = await u1.call('publicDeckPlanSelection', q1.plan, q1.plan.notes.filter(n => n.selected_default).map(n => n.sig));
  const z2 = await u2.call('publicDeckPlanSelection', q2.plan, q2.plan.notes.filter(n => n.selected_default).map(n => n.sig));
  const bc1 = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1), bc2 = await countRows('own_flashcards', `owner_id=eq.${C2.id}`, C2);
  const [x1, x2] = await Promise.all([u1.call('copyPublicDeckWithMedia', pubB, null, null, z1), u2.call('copyPublicDeckWithMedia', pubB, null, null, z2)]);
  if (x1.ok) registerCopy(B1, x1.result); if (x2.ok) registerCopy(C2, x2.result);
  check('P8.2b os dois usuários importam em paralelo (lock não bloqueia outro usuário)', x1.ok && x2.ok && x1.result.notes_copied === K && x2.result.notes_copied === K, [x1, x2]);
  const ac1 = await countRows('own_flashcards', `owner_id=eq.${B1.id}`, B1), ac2 = await countRows('own_flashcards', `owner_id=eq.${C2.id}`, C2);
  check('P8.2b cada um ganhou exatamente K Notes', ac1 - bc1 === K && ac2 - bc2 === K, { d1: ac1 - bc1, d2: ac2 - bc2 });
  await registerNewCopierObjects(B1); await registerNewCopierObjects(C2);
  const cc2 = await copierNotesByRunTag(C2);
  const u2urls = cc2.flatMap(n => mediaUrlsOf(n.fields)).filter(pathFromUrl);
  check('P8.2b mídia do 2º usuário só na pasta dele', u2urls.length > 0 && u2urls.every(u => pathFromUrl(u).startsWith(C2.id + '/')));
  return 'full';
}

// ============================================================================
// Limpeza (somente o que este teste criou)
// ============================================================================
async function cleanup(){
  section('LIMPEZA', 'Remoção somente do que este teste criou');
  const accounts = [...REG.accounts.values()];
  // 1. Notes de cópia (tag da execução) e Decks de cópia, por conta copiadora
  for (const a of accounts){
    const s = a.session;
    try {
      const del = await rest('DELETE', `own_flashcards?owner_id=eq.${s.id}&tags=cs.{${RUN_TAG}}`, s, undefined, 'return=representation');
      if (del.ok && del.body.length) note(`${a.label}: ${del.body.length} Notes removidas (tag ${RUN_TAG})`);
      check(`${a.label}: Notes do teste removidas`, del.ok, { status: del.status });
      const decks = new Set(a.decks);
      for (const r of a.copiedRoots) (await deckSubtree(s, r)).forEach(id => decks.add(id));
      // filhos antes dos pais
      const all = [...decks];
      for (let pass = 0; pass < 10 && all.length; pass++){
        for (const id of [...all]){
          const kids = await rest('GET', `decks?select=id&parent_deck_id=eq.${id}&owner_id=eq.${s.id}`, s);
          if (kids.ok && kids.body.length) continue;
          if (a.published.has(id)) await rpc('unpublish_deck', { p_deck_id: id }, s);
          const d = await rest('DELETE', `decks?id=eq.${id}&owner_id=eq.${s.id}&kind=eq.personal`, s, undefined, 'return=representation');
          if (d.ok) all.splice(all.indexOf(id), 1);
        }
      }
      check(`${a.label}: ${decks.size} Deck(s) do teste removidos`, all.length === 0, all);
      const objs = [...a.objects];
      if (objs.length){
        const rm = await storageRemove(s, objs);
        const left = [];
        for (const p of objs) if (await storageExists(s, p)) left.push(p);   // listagem do Storage, não o link público (cache)
        check(`${a.label}: ${objs.length} objeto(s) do teste removidos do Storage`, rm.ok && left.length === 0, { status: rm.status, restantes: left });
      }
    } catch (e){ check(`${a.label}: limpeza sem erro`, false, e.message); }
  }
  // 2. Conferência contra o estado inicial
  for (const a of accounts){
    if (!a.baseline) continue;
    const s = a.session;
    try {
      const now = await snapshot(s);
      const extraDecks = [...now.deckIds].filter(id => !a.baseline.deckIds.has(id));
      const missingDecks = [...a.baseline.deckIds].filter(id => !now.deckIds.has(id));
      const extraObjs = [...now.objects].filter(p => !a.baseline.objects.has(p));
      const missingObjs = [...a.baseline.objects].filter(p => !now.objects.has(p));
      check(`${a.label}: Notes = estado inicial (${a.baseline.notes})`, now.notes === a.baseline.notes, { agora: now.notes });
      check(`${a.label}: nenhum Deck pré-existente removido`, missingDecks.length === 0, missingDecks);
      check(`${a.label}: nenhum objeto pré-existente removido`, missingObjs.length === 0, missingObjs);
      check(`${a.label}: nenhum objeto novo restante`, extraObjs.length === 0, extraObjs);
      const extraRoots = now.roots - a.baseline.roots;
      if (extraDecks.length && extraRoots === extraDecks.length){
        note(`${a.label}: restam ${extraRoots} Deck(s) estrutural(is) (raiz/"Meus Decks") criados pelo bootstrap ensure_user_decks — não removíveis por RLS de usuário; inofensivos (o app cria os mesmos no 1º uso). ids: ${extraDecks.join(',')}`);
      } else {
        check(`${a.label}: nenhum Deck novo restante`, extraDecks.length === 0, extraDecks);
      }
    } catch (e){ check(`${a.label}: conferência com o estado inicial`, false, e.message); }
  }
}

// ============================================================================
// Main
// ============================================================================
let cleaning = false;
async function main(){
  assertTarget();
  const authorEmail = (await ask(`E-mail do AUTOR [${DEFAULT_AUTHOR}]: `)).trim() || DEFAULT_AUTHOR;
  const authorPass = await askHidden(`Senha de ${authorEmail}: `);
  const copierEmail = (await ask(`E-mail do COPIADOR Premium [${DEFAULT_COPIER}]: `)).trim() || DEFAULT_COPIER;
  const copierPass = await askHidden(`Senha de ${copierEmail}: `);
  const extraEmail = (await ask('(Opcional, P8.2b) e-mail de uma 2ª conta Premium DIFERENTE — Enter para pular: ')).trim();
  const extraPass = extraEmail ? await askHidden(`Senha de ${extraEmail}: `) : null;

  const A = await signIn(authorEmail, authorPass); A.label = 'autor';
  const B1 = await signIn(copierEmail, copierPass); B1.label = 'copiador';
  const B2 = await signIn(copierEmail, copierPass); B2.label = 'copiador (2ª sessão)';
  const C2 = extraEmail ? await signIn(extraEmail, extraPass) : null;
  if (C2) C2.label = 'copiador-2';
  if (A.id === B1.id) throw new Error('autor e copiador precisam ser contas diferentes');
  if (C2 && (C2.id === A.id || C2.id === B1.id)) throw new Error('a 2ª conta Premium precisa ser diferente do autor e do copiador');
  console.log(`\nlogins ok — autor ${A.id.slice(0, 8)}…, copiador ${B1.id.slice(0, 8)}… (2 sessões)${C2 ? `, copiador-2 ${C2.id.slice(0, 8)}…` : ''}`);

  const prof = async (s) => ((await rest('GET', `profiles?select=user_id,username,plan_tier,public_profile&user_id=eq.${s.id}`, s)).body || [])[0];
  const pA = await prof(A), pB = await prof(B1), pC = C2 ? await prof(C2) : null;
  console.log('perfil autor:', JSON.stringify({ username: pA && pA.username, plan: pA && pA.plan_tier, public_profile: pA && pA.public_profile }));
  console.log('perfil copiador:', JSON.stringify({ plan: pB && pB.plan_tier }));
  const pre = [];
  if (!pA || !pA.username) pre.push('autor sem perfil/username');
  if (!pA || pA.public_profile !== true) pre.push('perfil do autor não é público (Deck público ficaria "unavailable"); o teste NÃO altera perfis');
  if (!pB || pB.plan_tier !== 'premium') pre.push('copiador não é Premium');
  if (C2 && (!pC || pC.plan_tier !== 'premium')) pre.push('2ª conta não é Premium');
  if (pre.length){
    ['P8.1', 'P8.2', 'P8.5'].forEach(id => block(id, 'pré-condição: ' + pre.join('; ')));
    printSummary(); return;
  }

  console.log(`\nO teste vai CRIAR, só nestas contas de teste e identificado por "${RUN}":`);
  console.log('  • Decks pessoais e Notes no autor (publicados temporariamente) e objetos de áudio pequenos (+1 de 5 MiB, recusado);');
  console.log('  • cópias de Public Deck no copiador (Decks, Notes, objetos "pubcopy-…").');
  console.log('Ao final, REMOVE exatamente esses itens (por id/caminho) e confere contra o estado inicial.');
  const ok = (await ask('Prosseguir? [digite SIM]: ')).trim();
  if (ok !== 'SIM'){ console.log('Cancelado. Nada foi criado.'); return; }

  for (const s of [A, B1].concat(C2 ? [C2] : [])) acct(s).baseline = await snapshot(s);
  const ens = await rpc('ensure_user_decks', { p_owner_id: A.id, p_language_app_key: LANG }, A);
  if (!ens.ok) throw new Error('ensure_user_decks (autor) falhou: ' + safe(ens.body));

  process.on('SIGINT', async () => { if (cleaning) return; console.log('\nInterrompido: limpando antes de sair…'); cleaning = true; await cleanup(); printSummary(); process.exit(130); });

  const runStep = async (id, fn) => {
    try { const r = await fn(); return r; }
    catch (e){ SECTIONS[id] = SECTIONS[id] || { title: id, checks: [], notes: [] }; current = id; check(`${id}: execução sem exceção`, false, e.message); return null; }
  };
  try {
    await runStep('P8.1', () => p81(A, B1));
    await runStep('P8.5', () => p85(A, B1, pA.username));
    const r82 = await runStep('P8.2', () => p82(A, B1, B2, C2));
    if (r82 === 'partial') SECTIONS['P8.2'].partial = true;
  } finally {
    cleaning = true;
    await cleanup();
  }
  printSummary();
}

function printSummary(){
  console.log('\n======================= RESUMO =======================');
  console.log(`Projeto: ${STAGING_REF} (Staging) — produção ${PROD_REF} não foi usada. Nenhuma migration executada. RUN ${RUN}`);
  for (const id of ['P8.1', 'P8.2', 'P8.5', 'LIMPEZA']){
    const s = SECTIONS[id];
    if (!s){ console.log(`${id} — NÃO EXECUTADO`); continue; }
    const fails = s.checks.filter(c => !c.ok);
    let st = s.status || (fails.length ? 'FAIL' : (s.partial ? 'PASS (parcial: P8.2b não executado)' : 'PASS'));
    if (!s.checks.length && !s.status) st = 'NÃO EXECUTADO';
    console.log(`${id} — ${st}  (${s.checks.length - fails.length}/${s.checks.length} verificações)`);
    fails.forEach(f => console.log('     ✘ ' + f.name));
    s.notes.filter(n => /BLOCKED|NÃO EXECUTADO|pré-condição|RESTANTES|Deck\(s\) estrutural|não removidos|erro/.test(n)).forEach(n => console.log('     · ' + n));
  }
  console.log('Cole esta saída inteira na conversa (não contém senhas nem tokens).');
}

main().catch(async (e) => {
  console.error('ERRO:', safe(e.message));
  if (!cleaning && REG.accounts.size){ cleaning = true; try { await cleanup(); } catch (x){} }
  printSummary();
  process.exit(1);
});
