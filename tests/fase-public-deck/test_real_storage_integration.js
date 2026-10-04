// REQUIRES REAL STORAGE / SUPABASE INTEGRATION -- NÃO roda no sandbox e NÃO é simulado.
// Executar contra um projeto Supabase de STAGING (nunca produção) ANTES de aplicar as migrations 059-061
// em produção. Sem as variáveis abaixo o teste sai com "SKIPPED" (código 0) e NÃO conta como validado.
//
//   PD_SUPABASE_URL=https://<staging>.supabase.co  PD_ANON_KEY=<anon>
//   PD_A_EMAIL / PD_A_PASSWORD   (autor, qualquer plano)
//   PD_B_EMAIL / PD_B_PASSWORD   (copiador)
//   node tests/fase-public-deck/test_real_storage_integration.js
//
// Valida o que SQL/stub NÃO reproduzem: policies reais de storage.objects, JWT real,
// storage.copy (precisa SELECT na origem + INSERT no destino), uid == 1º segmento do path.
const { PD_SUPABASE_URL: URL_, PD_ANON_KEY: KEY } = process.env;
if (!URL_ || !KEY || !process.env.PD_A_EMAIL || !process.env.PD_B_EMAIL){
  console.log('SKIPPED: requires real Storage/Supabase integration (defina PD_SUPABASE_URL, PD_ANON_KEY, PD_A_*, PD_B_*).');
  process.exit(0);
}
const B = 'flashcard-media';
const login = async (email, password) => {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error('login falhou ' + email);
  return { jwt: j.access_token, uid: j.user.id };
};
const api = (jwt) => ({ apikey: KEY, authorization: 'Bearer ' + (jwt || KEY) });
const upload = (jwt, path, body) => fetch(`${URL_}/storage/v1/object/${B}/${path}`, { method: 'POST', headers: { ...api(jwt), 'content-type': 'audio/mpeg' }, body });
const copy = (jwt, src, dest) => fetch(`${URL_}/storage/v1/object/copy`, { method: 'POST', headers: { ...api(jwt), 'content-type': 'application/json' }, body: JSON.stringify({ bucketId: B, sourceKey: src, destinationKey: dest }) });
const del = (jwt, path) => fetch(`${URL_}/storage/v1/object/${B}/${path}`, { method: 'DELETE', headers: api(jwt) });
const pub = (path) => fetch(`${URL_}/storage/v1/object/public/${B}/${path}`);
let fails = 0; const L = (n, c, i) => { console.log((c ? 'ok   ' : 'FALHOU ') + n + (c ? '' : ' ' + JSON.stringify(i))); if (!c) fails++; };
(async () => {
  const A = await login(process.env.PD_A_EMAIL, process.env.PD_A_PASSWORD), Bu = await login(process.env.PD_B_EMAIL, process.env.PD_B_PASSWORD);
  const t = Date.now(), src = `${A.uid}/hardening-${t}.mp3`, dst = `${Bu.uid}/pubcopy-${t}.mp3`, evil = `${A.uid}/evil-${t}.mp3`, anonDst = `${Bu.uid}/anon-${t}.mp3`;
  const bytes = Buffer.from('ID3-hardening-test');
  L('A sobe na própria pasta', (await upload(A.jwt, src, bytes)).ok);
  L('A NÃO sobe na pasta de B (1º segmento != auth.uid())', !(await upload(A.jwt, `${Bu.uid}/x-${t}.mp3`, bytes)).ok);
  L('B copia origem de A para a PRÓPRIA pasta (storage.copy)', (await copy(Bu.jwt, src, dst)).ok);
  L('B NÃO copia para a pasta de A', !(await copy(Bu.jwt, src, evil)).ok);
  L('anon NÃO copia', !(await copy(null, src, anonDst)).ok);
  L('copiar sobre destino existente falha (sem upsert)', !(await copy(Bu.jwt, src, dst)).ok);
  await del(Bu.jwt, src);
  L('B NÃO apaga o objeto de A (continua existindo)', (await pub(src)).ok);
  L('A apaga o original', (await del(A.jwt, src)).ok);
  L('a cópia de B sobrevive (objeto físico independente)', (await pub(dst)).ok);
  L('limpeza: B remove a própria cópia', (await del(Bu.jwt, dst)).ok);
  console.log(fails ? `${fails} FALHA(S)` : 'OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
