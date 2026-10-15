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
ok(core.toSpokenTextForTts("l'œuf", 'fr-FR') === "l'oeuf", 'fr œuf (paridade completa com o Python)');
ok(core.toSpokenTextForTts("l'âge", 'fr-FR') === "l'age", 'fr l\'âge');
ok(core.toSpokenTextForTts('une bouteille (de)', 'fr-FR') === 'une bouteille (de)', 'fr override');
ok(core.toSpokenTextForTts('bonito / bonita', 'pt-BR') === 'bonito, bonita', 'pt barra');
ok(core.toSpokenTextForTts('o(a) aluno(a)', 'pt-BR') === 'o aluno, a aluna', 'pt gênero (vários)');
ok(core.toSpokenTextForTts('Obrigado, Sra.', 'pt-BR') === 'Obrigado, Senhora.', 'pt título no fim');
ok(core.toSpokenTextForTts('21º andar', 'pt-BR') === '21º andar', 'pt ordinal fica como está (a voz lê bem)');
ok(core.toSpokenTextForTts('obrigado(a)', 'cmn-CN') === 'obrigado(a)', 'zh sem regras de pt');
// Paridade com spoken_text.py: TODAS as entradas do manifest fr e zh + os casos de pt.
try {
  const readKeys = (rel) => [...fs.readFileSync(path.join(root, rel), 'utf8').matchAll(/^ "((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => JSON.parse('"' + m[1] + '"'));
  const frKeys = readKeys('fr/audio-manifest.js');
  const zhKeys = readKeys('zh/audio-manifest.js');
  const ptKeys = ['bonito / bonita', 'km/h', 'e/ou', '24/7', 'obrigado(a)', 'Muito obrigado(a)!', 'professor(a)',
    'bem-vindo(a)', 'livro(s)', 'o(a) aluno(a)', 'Caro(a) professor(a), bom dia.', 'professor(es)', 'os(as) alunos(as)',
    'inglês(a)', 'alemão(ã)', 'gostar (de)', 'você (informal)', 'Bom dia, Sra. Silva!', 'Obrigado, Sra.', 'Sr. e Sra. Silva',
    'Sr.(a) Silva', 'Sr(a).', 'Prof.ª Ana', 'Profª Maria', 'Dr Paulo chegou', 'Drs. Ana e Rui', 'a Sra. é daqui',
    '1º andar', 'a 2ª aula', '21º andar', '1.º de maio', '25ª edição', '100º', '101º', '0º', '1° andar', 'nº 5', 'n.º 12',
    'Nº 3', 'Oi 👋 → tudo ✓', '* item', '• um • dois', 'Os carros azuis.', 'Vou chamá-lo amanhã.', 'Tudo bem?',
    'Moro nos EUA.', 'Tenho 25 anos.', 'você', 'R$ 5,00', '14h30', 'NÃO!', 'É a 3ª vez, Sra. Lima: o(a) aluno(a) / a turma (de) hoje',
    // Português real, com acentos/cedilha/til (\w ASCII x \p{L}): frases de PLE para falantes de inglês.
    'Sr. Gonçalves, o(a) senhor(a) é brasileiro(a)?', 'Eu sou do Brasil / de Portugal', 'coração', 'Ação e reação, são três.',
    'Pão(ães)', 'João e Maria são irmão(ã)s', 'Bem-vindo(a) à nossa casa!', 'Moro no 3º andar, apartamento nº 12.',
    'Preciso (de) ajuda e gosto (de) café / chá', 'Olá! Tudo bem com você(s)?', 'A Dra. Ângela é médica.', 'Prof. Álvaro, bom dia.',
    'Ele é o 2º / ela é a 2ª', 'à vista (informal)', 'ônibus nº 8 → Centro',
    // horas 24h, moeda e abreviações (2026-10-15)
    '14h30', 'Chego às 14h30.', '14h00', '14h', '9h00', '9h', '09h', '1h', '1h30', '0h', '00h', '00h30', '14h01', '24h',
    'O banco abre às 8h e fecha às 17h.', '14:30', '9:05', '00:00', '23:59', 'A aula é às 19:30h.', 'Fiz uma viagem de 5h de ônibus',
    'placar 2:1', 'O jogo terminou 3:0.', '24:30', '14:75', '14h75', '25h30', '30h de estudo', '10:30:15', '1,5h',
    'km2h', '14 h', '9h5', 'OK 14hs', 'Às 9h, às 10:15 e às 18h45 há aula.',
    'R$ 5,50', 'R$5,50', 'R$ 1,00', 'R$ 12,00', 'R$ 0,50', 'R$ 1,01', 'R$ 1.250,00', 'R$ 5', 'R$ 1', 'R$ 0,00', 'R$ 1.250,75',
    'R$ 2,05', 'Custa R$ 5,50 o quilo.', 'De R$ 3,00 a R$ 4,50', 'R$', 'Quanto custa em R$?', 'R$ abc', 'US$ 5,00', 'R$ 5,5',
    'R$ 5 mil', 'R$ 2 milhões', 'Almoço: R$ 25,90 às 12h30 (p.ex. feijoada, etc.).',
    'p.ex. café', 'P.ex. café', 'p. ex. chá', 'Frutas, p.ex. maçã.', 'Tenho livros, canetas, etc.', 'Compro pão, leite, etc. e vou embora',
    'livros, etc., e mais', '(maçã, uva, etc.)', 'Compro pão, etc. Depois volto.', 'Etc.', 'etc', 'o etcetera', 'Obs.: traga o livro',
    'obs. importante', 'Veja a obs.', 'Obs. Chegue cedo', 'vc tb vai? blz', 'site.etc.br', 'inobs.', 'Ação às 14h, é útil p.ex. em São João.'];
  const groups = [['fr', 'fr-FR', frKeys], ['zh', 'cmn-CN', zhKeys], ['pt', 'pt-BR', ptKeys]];
  const py = `import sys,json; sys.path.insert(0, ${JSON.stringify(path.join(root, 'fr/scripts/challenges_pipeline'))})\nfrom spoken_text import to_spoken_text\nd=json.load(sys.stdin)\nprint(json.dumps({k:[to_spoken_text(t,k) for t in v] for k,v in d.items()}))`;
  const out = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(Object.fromEntries(groups.map(([k, , v]) => [k, v]))) }).toString());
  for (const [k, code, keys] of groups) {
    const mism = keys.filter((t, i) => core.toSpokenTextForTts(t, code) !== out[k][i]);
    ok(keys.length > 0 && mism.length === 0, `paridade ${k} com spoken_text.py (${keys.length} entradas; divergências: ${JSON.stringify(mism)})`);
    console.log(`paridade spoken_text.py ${k}: ${keys.length} entradas comparadas`);
  }
} catch (e) { ok(false, 'paridade spoken_text.py: ' + e.message); }

// --- regras novas do pt: valores esperados explícitos (o Python tem os mesmos em test_spoken_text.py) ---
{
  const PT_EXPECT = {
    '14h30': '14h30', '14h00': '14 horas', '9h': '9 horas', '1h': '1 hora', '1h30': '1h30',
    '00h': '0 horas', '14:30': '14h30', '9:05': '9h05', 'A aula é às 19:30h.': 'A aula é às 19h30.',
    'Fiz uma viagem de 5h de ônibus': 'Fiz uma viagem de 5 horas de ônibus',
    'placar 2:1': 'placar 2:1', '24:30': '24:30', '14h75': '14h75', '1,5h': '1,5h', '10:30:15': '10:30:15',
    'R$ 5,50': '5 reais e 50 centavos', 'R$5,50': '5 reais e 50 centavos', 'R$ 1,00': '1 real', 'R$ 12,00': '12 reais',
    'R$ 0,50': '50 centavos', 'R$ 1,01': '1 real e 1 centavo', 'R$ 1.250,00': '1.250 reais', 'R$ 5': '5 reais', 'R$': 'R$',
    'R$ abc': 'R$ abc', 'R$ 5 mil': 'R$ 5 mil',
    'p.ex. café': 'por exemplo café', 'Tenho livros, canetas, etc.': 'Tenho livros, canetas, etc.',
    'Compro pão, leite, etc. e vou embora': 'Compro pão, leite, etc. e vou embora', 'etc': 'etc',
    'Obs.: traga o livro': 'Observação: traga o livro', 'vc tb vai? blz': 'vc tb vai? blz',
    'Almoço: R$ 25,90 às 12h30 (p.ex. feijoada, etc.).': 'Almoço: 25 reais e 90 centavos às 12h30 (por exemplo feijoada, etc.).',
  };
  for (const [src, want] of Object.entries(PT_EXPECT)) {
    const got = core.toSpokenTextForTts(src, 'pt-BR');
    ok(got === want, `pt JS: ${JSON.stringify(src)} -> ${JSON.stringify(want)} (veio ${JSON.stringify(got)})`);
  }
  ok(core.toSpokenTextForTts('14h30 R$ 5,50 etc.', 'fr-FR') === '14h30 R$ 5,50 etc.' && core.toSpokenTextForTts('14h30 R$ 5,50 etc.', 'cmn-CN') === '14h30 R$ 5,50 etc.', 'hora/moeda/abreviação não vazam para fr e zh');
}

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
// A cópia do Deno (index.ts) precisa bater com languages/registry.json (tts.spokenRulesVersion); o cliente lê o registro.
const regJson = JSON.parse(fs.readFileSync(path.join(root, 'languages/registry.json'), 'utf8'));
const regVersions = Object.fromEntries(regJson.languages.map(l => [l.fieldLang, l.tts.spokenRulesVersion]));
const tsVersions = Object.fromEntries([...(pick(idx, 'TTS_SPOKEN_RULES_VERSION_BY_LANG: Record<string, number>') || '').matchAll(/(\w+):\s*(\d+)/g)].map(m => [m[1], Number(m[2])]));
ok(JSON.stringify(Object.entries(regVersions).sort()) === JSON.stringify(Object.entries(tsVersions).sort()), 'versão das regras por idioma: Deno == registro');
ok(pick(idx, 'TTS_TEXT_MAX_LENGTH') === pick(model, 'TTS_TEXT_MAX_LENGTH'), 'max length igual');
const ctx = { console, TextEncoder, crypto: globalThis.crypto, t: (k) => { const m = fs.readFileSync(path.join(root, 'shared/i18n/pt-BR.js'), 'utf8').match(new RegExp("'" + k.replace(/\./g, '\\.') + "': '((?:[^'\\\\]|\\\\.)*)'")); return m ? m[1] : k; } }; // t() do i18n: lê o texto de pt-BR.js
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'languages/registry.js'), 'utf8'), ctx);
vm.runInContext(model + '\n;globalThis.__k = computeTtsGenerationKey; globalThis.__labels = TTS_GENERATION_ERROR_LABELS;', ctx);
const clientKey = await ctx.__k('un / une', 'fr-FR', null, 1);
const parts = ['un / une', 'fr-FR', '', '1', 'google-chirp3-hd', '2:fr4'].map(encodeURIComponent).join('\u001F');
const serverKey = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts))).toString('hex');
ok(clientKey === serverKey, 'generationKey inclui google-chirp3-hd e a versão por idioma');
const ptKey = await ctx.__k('obrigado(a)', 'pt-BR', null, 1);
const zhKey = await ctx.__k('obrigado(a)', 'zh-CN', null, 1);
const ptParts = ['obrigado(a)', 'pt-BR', '', '1', 'google-chirp3-hd', '2:pt2'].map(encodeURIComponent).join('\u001F');
ok(ptKey === Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ptParts))).toString('hex'), 'pt usa 2:pt2');
ok(ptKey !== zhKey, 'versão por idioma separa pt de zh');
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
