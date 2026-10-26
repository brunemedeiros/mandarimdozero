// Paridade 5d, parte 7 (docs/historico/30-paridade-quase-iguais.md): a voz do idioma estudado saiu do fr/app.js e do zh/app.js
// para shared/core/voz.js. Este teste roda, na árvore de REF (main antes da etapa, worktree temporário) e nesta árvore, nos dois
// sites, a mesma sequência com uma voz do navegador de mentira (lista de vozes controlada, speak() que só registra):
// escolha da voz (exata, só do idioma, nenhuma), o que vai para a voz (texto, idioma, velocidade, voz), o mp3 pré-gravado
// (arquivo e velocidade), o aviso sem voz, o aviso de falha da 2ª tentativa, e o registro de áudio tocado (totalAudioPlays).
// Rodar: node tests/paridade-sites/test_voz.js   (REF padrão 2e229930; PARIDADE_5D_REF=<commit>)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const H = require('./quase-iguais-harness.js');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5D_REF || '2e229930';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };

async function rodar(browser, root, site){
  const server = H.serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { ctx, page } = await H.abrir(browser, server.address().port, site, { lang: 'pt-BR' });
  const out = await page.evaluate(async (site) => {
    const L = site === 'fr' ? 'French' : 'Chinese';
    const speak = window['speak' + L], load = window['load' + L + 'Voice'], can = window['canSpeak' + L], only = window['speak' + L + 'AudioOnly'];
    const log = [];
    const toasts = () => [...document.querySelectorAll('#toast-layer .toast')].map(e => e.textContent);
    let vozes = [];
    let comeca = true;
    window.SpeechSynthesisUtterance = function(text){ this.text = text; }; // o de verdade não aceita voz de mentira
    window.speechSynthesis.getVoices = () => vozes;
    window.speechSynthesis.speak = (u) => { log.push({ text: u.text, lang: u.lang, rate: u.rate, voice: u.voice && u.voice.name }); if (comeca && u.onstart) u.onstart(); };
    const V = (name, lang, local) => ({ name, lang, localService: !!local, default: false, voiceURI: name });
    const r = {};
    const semMp3 = site === 'fr' ? 'Texte sans mp3 brésilien·ne' : '没有录音的句子';
    const comMp3 = Object.keys(AUDIO_MANIFEST)[0];
    // escolha da voz
    vozes = [V('Outra', 'en-US'), V('Google fr', 'fr-CA'), V('Exata fr', 'fr-FR', true), V('Google zh', 'zh-TW'), V('Exata zh', 'zh-CN', true)];
    r.load1 = load(); r.voz1 = TTS.voice && TTS.voice.name;
    vozes = [V('Outra', 'en-US'), V('So idioma fr', 'fr-BE'), V('So idioma zh', 'zh-HK')];
    r.load2 = load(); r.voz2 = TTS.voice && TTS.voice.name;
    vozes = [V('Outra', 'en-US')];
    r.load3 = load(); r.voz3 = TTS.voice;
    r.can1 = can(semMp3); r.can2 = can(comMp3);
    // sem voz: aviso
    const xp0 = STATE.totalAudioPlays;
    speak(semMp3, null, false); r.toastSemVoz = toasts().slice(-1)[0];
    // com voz: utterance
    vozes = [V('Exata fr', 'fr-FR', true), V('Exata zh', 'zh-CN', true)]; load();
    const btn = document.createElement('button'); document.body.appendChild(btn);
    speak(semMp3, btn, false); r.utter = log.slice(-1)[0]; r.btnSpeaking = btn.classList.contains('speaking');
    // 2ª tentativa também falha: aviso
    comeca = false; speak(semMp3, btn, false);
    window.__voz = { r, log, toasts, only, comMp3, xp0 };
    return null;
  }, site);
  // a 2ª tentativa espera 800ms + 800ms no relógio (falso, parado): anda o relógio
  await page.clock.runFor(2000);
  const out2 = await page.evaluate(() => {
    const { r, log, toasts, only, comMp3, xp0 } = window.__voz;
    r.toastFalha = toasts().slice(-1)[0]; r.tentativas = log.length;
    window.__audio.length = 0; only(comMp3, null, false); r.mp3 = window.__audio.slice();
    r.plays = STATE.totalAudioPlays - xp0;
    return r;
  });
  await ctx.close(); server.close();
  return out2;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5d-voz-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    for (const site of ['fr', 'zh']){
      const a = await rodar(browser, wt, site), b = await rodar(browser, ROOT, site);
      for (const k of Object.keys(a)) check(`${site}: ${k} igual ao de antes`, JSON.stringify(a[k]) === JSON.stringify(b[k]), { antes: a[k], depois: b[k] });
      check(`${site}: a sequência pegou a voz exata, a do idioma e nenhuma`, /Exata/.test(b.voz1) && /So idioma/.test(b.voz2) && b.voz3 === null, b);
      check(`${site}: a fala saiu com idioma e velocidade do site`, b.utter && b.utter.lang === (site === 'fr' ? 'fr-FR' : 'zh-CN') && b.utter.rate === (site === 'fr' ? 0.9 : 0.85), b.utter);
      console.log(`  ${site}:`, JSON.stringify(b).slice(0, 400));
    }
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`voz (antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
