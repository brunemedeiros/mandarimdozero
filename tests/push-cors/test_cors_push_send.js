// Teste do CORS do push-send (2026-11-25, docs/historico/36-auditoria-seguranca-2026-11.md).
// Abre um Chromium de verdade numa página com a origem do site (https://app.profbrune.com.br, servida
// pelo próprio teste) e faz a MESMA chamada de shared/notifications.js (POST JSON + Authorization).
// Usa só a chave PÚBLICA (anon), que não é ninguém: a RLS devolve 0 aparelhos, nenhum push sai.
//
//   node tests/push-cors/test_cors_push_send.js staging   (padrão)
//   node tests/push-cors/test_cors_push_send.js producao
//
// Passa se o navegador NÃO bloquear a chamada (qualquer resposta HTTP serve: no Staging, sem as
// chaves VAPID, a função responde 503 vapid_missing; na produção, 200 com sent:0).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const jwt = (txt) => (txt.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/) || [])[0];
const env = (process.argv[2] || 'staging').toLowerCase();
const cfg = env.startsWith('prod')
  ? { ref: 'eigjocalzwamisgqilhg', key: jwt(fs.readFileSync(path.join(root, 'shared/supabase-client.js'), 'utf8')) }
  : { ref: 'ilfjzizjfcmhibkhwber', key: jwt(fs.readFileSync(path.join(root, 'docs/rotina-banco/teste-de-rede.md'), 'utf8')) };
let falhas = 0, ok = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
(async () => {
  const url = `https://${cfg.ref}.supabase.co/functions/v1/push-send`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('https://app.profbrune.com.br/zz-teste-cors', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>t</title>' }));
  await page.goto('https://app.profbrune.com.br/zz-teste-cors');
  const res = await page.evaluate(async ({ url, key }) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, apikey: key }, body: JSON.stringify({ title: 'teste', body: 'teste de CORS' }) });
      return { status: r.status, body: await r.text() };
    } catch (e) { return { blocked: String(e.message || e) }; }
  }, { url, key: cfg.key });
  console.log(`push-send (${env}):`, JSON.stringify(res).slice(0, 160));
  check(!res.blocked, 'o navegador deixa a chamada do site chegar (pergunta prévia OPTIONS respondida)');
  check(res.status !== 401 && res.status !== 403, 'a chave pública passa pelo portão (sem dar acesso a aparelho de ninguém)');
  if (res.status === 200) check(/"sent":0/.test(res.body), 'chave pública enxerga 0 aparelhos (RLS)');
  const semLogin = await page.evaluate(async (url) => {
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return r.status; }
    catch (e) { return 'bloqueado'; }
  }, url);
  check(semLogin === 401, `sem login continua recusado (${semLogin})`);
  await browser.close();
  console.log(`\n${ok}/${ok + falhas}`);
  process.exit(falhas ? 1 : 0);
})();
