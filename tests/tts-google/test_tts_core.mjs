// Testes do núcleo puro da Edge Function tts-generate (provedor Google +
// cota mensal). Roda em Node puro: `node tests/tts-google/test_tts_core.mjs`.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as core from '../../supabase/functions/tts-generate/tts_core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log('FAIL', name); } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- voz ---
const fr = core.resolveTtsVoice('fr-FR', null);
ok(fr.ok && fr.name === 'fr-FR-Chirp3-HD-Achernar' && fr.languageCode === 'fr-FR', 'fr voz padrão');
const zh = core.resolveTtsVoice('zh-CN', '');
ok(zh.ok && zh.name === 'cmn-CN-Chirp3-HD-Achernar' && zh.languageCode === 'cmn-CN', 'zh-CN -> cmn-CN');
ok(core.resolveTtsVoice('cmn-CN').name === 'cmn-CN-Chirp3-HD-Achernar', 'cmn-CN aceito');
const pt = core.resolveTtsVoice('pt-BR');
ok(pt.ok && pt.name === 'pt-BR-Chirp3-HD-Achernar', 'pt-BR voz');
ok(core.resolveTtsVoice('fr', null).languageCode === 'fr-FR', 'alias fr');
ok(eq(core.resolveTtsVoice('de-DE'), { ok: false, error: 'unsupported_language' }), 'idioma não suportado');
ok(eq(core.resolveTtsVoice(null), { ok: false, error: 'unsupported_language' }), 'idioma ausente');
const custom = core.resolveTtsVoice('fr-FR', 'fr-FR-Chirp3-HD-Charon');
ok(custom.ok && custom.name === 'fr-FR-Chirp3-HD-Charon', 'voiceId respeitado');
ok(eq(core.resolveTtsVoice('fr-FR', 'en-US-Chirp3-HD-Charon'), { ok: false, error: 'invalid_voice' }), 'voz de outro idioma recusada');
ok(eq(core.resolveTtsVoice('fr-FR', '../x?key=1'), { ok: false, error: 'invalid_voice' }), 'voz malformada recusada');
ok(core.resolveTtsVoice('zh-CN', 'cmn-CN-Chirp3-HD-Kore').ok, 'voz cmn com zh-CN');

// --- velocidade ---
ok(core.resolveSpeakingRate(0.9, null) === 0.9, 'fr base 0.9');
ok(core.resolveSpeakingRate(0.85, 1) === 0.85, 'zh base 0.85');
ok(core.resolveSpeakingRate(1.0, undefined) === 1, 'pt base 1.0');
ok(core.resolveSpeakingRate(0.9, 0.8) === 0.72, 'lento relativo');
ok(core.resolveSpeakingRate(0.9, 1.2) === 1.08, 'rápido relativo');
ok(core.resolveSpeakingRate(0.9, 50) === 2, 'teto 2');
ok(core.resolveSpeakingRate(0.9, -1) === 0.9, 'inválido = base');
ok(core.resolveSpeakingRate(0.9, NaN) === 0.9, 'NaN = base');

// --- texto falado ---
ok(core.toSpokenTextForTts('un / une', 'fr-FR') === 'un, une', 'barra');
ok(core.toSpokenTextForTts('français / française', 'fr-FR') === 'français, française', 'barra 2');
ok(core.toSpokenTextForTts('un kilo (de)', 'fr-FR') === 'un kilo de…', 'parêntese');
ok(core.toSpokenTextForTts('un / une (de)', 'fr-FR') === 'un, une de…', 'as duas regras');
ok(core.toSpokenTextForTts('a/b', 'fr-FR') === 'a/b', 'barra sem espaço intacta');
ok(core.toSpokenTextForTts('你 / 好', 'cmn-CN') === '你 / 好', 'zh sem regras');
ok(core.toSpokenTextForTts('um / uma', 'pt-BR') === 'um / uma', 'pt sem regras');
// Paridade com spoken_text.py nas entradas fr que só usam essas 2 regras.
try {
  const manifest = fs.readFileSync(path.join(root, 'fr/audio-manifest.js'), 'utf8');
  const keys = [...manifest.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map(m => JSON.parse('"' + m[1] + '"'))
    .filter(k => (/ \/ |\(/.test(k)) && !/œ|âge/.test(k));
  const py = `import sys,json; sys.path.insert(0, ${JSON.stringify(path.join(root, 'fr/scripts/challenges_pipeline'))})\nfrom spoken_text import to_spoken_text, SPOKEN_OVERRIDES\nov=SPOKEN_OVERRIDES.get('fr',{})\nprint(json.dumps([None if t in ov else to_spoken_text(t,'fr') for t in json.load(sys.stdin)]))`;
  const out = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(keys) }).toString());
  // Overrides manuais por texto exato (ex.: "une bouteille (de)") ficam de fora: são escolhas do
  // manifest da trilha, não regras genéricas.
  const mism = keys.filter((k, i) => out[i] !== null && core.toSpokenTextForTts(k, 'fr-FR') !== out[i]);
  ok(keys.length > 0 && mism.length === 0, `paridade com spoken_text.py (${keys.length} entradas; divergências: ${JSON.stringify(mism)})`);
  console.log(`paridade spoken_text.py: ${keys.length} entradas comparadas`);
} catch (e) { ok(false, 'paridade spoken_text.py: ' + e.message); }

// --- corpo da requisição / erros ---
const body = core.buildGoogleSynthesizeBody({ text: 'Bonjour', languageCode: 'fr-FR', voiceName: 'fr-FR-Chirp3-HD-Achernar', speakingRate: 0.9 });
ok(eq(body, { input: { text: 'Bonjour' }, voice: { languageCode: 'fr-FR', name: 'fr-FR-Chirp3-HD-Achernar' }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 } }), 'corpo Google');
ok(core.mapGoogleTtsError(400) === 'provider_error' && core.mapGoogleTtsError(403) === 'provider_error', 'erro genérico');
ok(core.mapGoogleTtsError(429) === 'provider_rate_limited', 'erro 429');
ok(eq(Array.from(core.decodeBase64ToBytes(Buffer.from([0, 1, 255, 128]).toString('base64'))), [0, 1, 255, 128]), 'base64');

// --- cota mensal ---
ok(core.parseMonthlyLimit(undefined) === 300 && core.parseMonthlyLimit('') === 300, 'limite padrão 300');
ok(core.parseMonthlyLimit('50') === 50 && core.parseMonthlyLimit('0') === 0, 'env sobrescreve');
ok(core.parseMonthlyLimit('abc') === 300 && core.parseMonthlyLimit('-3') === 300 && core.parseMonthlyLimit('2.5') === 300, 'env inválida = padrão');
ok(core.startOfCurrentMonthUtcIso(new Date('2026-10-05T13:00:00Z')) === '2026-10-01T00:00:00.000Z', 'início do mês');
ok(core.startOfCurrentMonthUtcIso(new Date('2026-12-31T23:59:59Z')) === '2026-12-01T00:00:00.000Z', 'dezembro');
ok(core.startOfCurrentMonthUtcIso(new Date('2026-11-01T00:30:00+03:00')) === '2026-10-01T00:00:00.000Z', 'UTC, não fuso local');
ok(core.decideMonthlyQuota({ count: 299, limit: 300, isAdmin: false }).allowed, '299 passa');
ok(eq(core.decideMonthlyQuota({ count: 300, limit: 300, isAdmin: false }), { allowed: false, error: 'monthly_quota_exceeded' }), '300 bloqueia');
ok(core.decideMonthlyQuota({ count: 9999, limit: 300, isAdmin: true }).allowed, 'admin isento');
ok(!core.decideMonthlyQuota({ count: 0, limit: 0, isAdmin: false }).allowed, 'limite 0 bloqueia tudo');
ok(core.isTtsAdminEmail('BruneMed1310@gmail.com ') && !core.isTtsAdminEmail('x@y.com') && !core.isTtsAdminEmail(undefined), 'admin por e-mail');

// --- cliente e servidor concordam no generationKey ---
const idx = fs.readFileSync(path.join(root, 'supabase/functions/tts-generate/index.ts'), 'utf8');
const model = fs.readFileSync(path.join(root, 'shared/flashcard-model.js'), 'utf8');
const pick = (src, name) => (src.match(new RegExp(`const ${name} = ([^;]+);`)) || [])[1];
ok(pick(idx, 'TTS_PROVIDER_MODEL_ID') === "'google-chirp3-hd'" && pick(model, 'TTS_PROVIDER_MODEL_ID') === "'google-chirp3-hd'", 'model id nos 2 lados');
ok(pick(idx, 'TTS_CONFIG_VERSION') === pick(model, 'TTS_CONFIG_VERSION'), 'config version igual');
ok(pick(idx, 'TTS_TEXT_MAX_LENGTH') === pick(model, 'TTS_TEXT_MAX_LENGTH'), 'max length igual');
const ctx = { console, TextEncoder, crypto: globalThis.crypto };
vm.createContext(ctx);
vm.runInContext(model + '\n;globalThis.__k = computeTtsGenerationKey; globalThis.__labels = TTS_GENERATION_ERROR_LABELS;', ctx);
const clientKey = await ctx.__k('un / une', 'fr-FR', null, 1);
const parts = ['un / une', 'fr-FR', '', '1', 'google-chirp3-hd', '1'].map(encodeURIComponent).join('\u001F');
const serverKey = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts))).toString('hex');
ok(clientKey === serverKey, 'generationKey inclui google-chirp3-hd');
for (const code of ['monthly_quota_exceeded', 'provider_error', 'provider_rate_limited', 'provider_not_configured', 'quota_check_failed', 'unsupported_language', 'invalid_voice', 'rate_limited']) {
  ok(typeof ctx.__labels[code] === 'string' && ctx.__labels[code].length > 0, 'rótulo ' + code);
}
ok(ctx.__labels.monthly_quota_exceeded === 'Você atingiu o limite mensal de áudios gerados. Tente de novo no próximo mês.', 'texto do limite mensal');

// --- index.ts: invariantes estruturais ---
ok(!idx.includes('provider_not_implemented'), 'sem provider_not_implemented');
ok(idx.includes('texttospeech.googleapis.com/v1/text:synthesize?key='), 'endpoint Google');
ok(idx.indexOf('decideMonthlyQuota(') > 0 && idx.indexOf('decideMonthlyQuota(') < idx.indexOf('await generateTTS('), 'cota checada antes do provedor');
ok(idx.indexOf('>= TTS_RATE_LIMIT') > 0, 'limite curto mantido');
ok(!/console\.(error|warn|log)\([^)]*apiKey/.test(idx), 'chave nunca logada');
ok(idx.includes("TTS_MOCK_ENABLED') === 'true'"), 'mock mantido');

console.log(`tts_core: ${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
