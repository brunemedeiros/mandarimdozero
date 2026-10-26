// M2 da revisão do código compartilhado (docs/revisao-codigo-compartilhado-erros.md): a nova tentativa da voz do navegador
// (shared/core/voz.js, 800 ms sem onstart) não podia ser cancelada e cortava o áudio do cartão seguinte, falando a palavra
// ANTERIOR. Este teste usa uma voz de mentira que "engasga" (nunca dispara onstart) para o texto A e funciona para o B, nos
// dois sites, com o relógio falso:
//   1. controle: engasgou e nada mais aconteceu -> a nova tentativa fala A de novo (comportamento que deve continuar);
//   2. engasgou e a aluna tocou outro áudio (B, voz) antes de 800 ms -> A não volta depois de B;
//   3. engasgou e tocou um mp3 (outro cartão) -> nenhuma fala de A depois, o mp3 não é pausado;
//   4. engasgou e a tela trocou de cartão (stopExerciseAudio, o que os renderers chamam) -> nada de A;
//   5. engasgou e trocou de aba (switchTab) -> nada de A;
//   6. engasgou e o botão saiu da tela (isConnected = false) -> nada de A;
//   7. controle: as duas tentativas engasgam -> aviso de falha (igual a antes).
// REPO_ROOT=<worktree> roda contra outra árvore (na origin/main os cenários 2 a 6 falham).
// Rodar: node tests/revisao-seguranca/test_m2_voz_cancelar.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const path = require('path');
const H = require('../paridade-sites/quase-iguais-harness.js');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

async function rodar(browser, site){
  const server = H.serve(ROOT);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { ctx, page, errors } = await H.abrir(browser, server.address().port, site, { lang: 'pt-BR' });
  await page.evaluate((site) => {
    const L = site === 'fr' ? 'French' : 'Chinese';
    window.__speak = window['speak' + L];
    window.__log = [];
    window.__engasga = new Set();
    window.SpeechSynthesisUtterance = function(text){ this.text = text; };
    const V = { name: 'Exata', lang: site === 'fr' ? 'fr-FR' : 'zh-CN', localService: true, default: false, voiceURI: 'Exata' };
    window.speechSynthesis.getVoices = () => [V];
    window.speechSynthesis.speak = (u) => { window.__log.push(u.text); if (!window.__engasga.has(u.text) && u.onstart) u.onstart(); };
    window.speechSynthesis.cancel = () => { window.__log.push('<cancel>'); };
    Object.defineProperty(window.speechSynthesis, 'speaking', { configurable: true, get: () => true });
    window['load' + L + 'Voice']();
    window.__toasts = () => [...document.querySelectorAll('#toast-layer .toast')].map(e => e.textContent);
  }, site);
  const A = site === 'fr' ? 'Mot A sans mp3' : '甲没有录音';
  const B = site === 'fr' ? 'Mot B sans mp3' : '乙没有录音';
  const cenario = async (nome, depois) => {
    const r = await page.evaluate(({ A, nome }) => {
      window.__log.length = 0; window.__audio.length = 0;
      window.__engasga = new Set(nome === 'falha' ? [A] : [A]);
      document.querySelectorAll('#toast-layer .toast').forEach(t => t.remove());
      const btn = document.createElement('button'); btn.className = 'audio-btn'; document.body.appendChild(btn);
      window.__btn = btn;
      window.__speak(A, btn, false);
      return null;
    }, { A, nome });
    await page.clock.runFor(300);
    await page.evaluate(depois, { A, B });
    await page.clock.runFor(2500);
    return page.evaluate(() => ({ log: window.__log.filter(x => x !== '<cancel>'), audio: window.__audio.slice(), toasts: window.__toasts() }));
  };
  const out = {};
  out.controle = await cenario('controle', () => {});
  out.outroAudio = await cenario('outroAudio', ({ B }) => { window.__speak(B, null, false); });
  out.mp3 = await cenario('mp3', () => { window.__speak(Object.keys(AUDIO_MANIFEST)[0], null, false); });
  out.trocaCartao = await cenario('trocaCartao', () => { stopExerciseAudio(); });
  out.trocaAba = await cenario('trocaAba', () => { switchTab('progress'); });
  await page.evaluate(() => switchTab('path'));
  out.botaoSaiu = await cenario('botaoSaiu', () => { window.__btn.remove(); });
  // as duas tentativas engasgam: aviso (A também na 2ª)
  out.falha = await cenario('falha', () => {});
  await ctx.close(); server.close();
  const realErrors = errors.filter(e => !/ERR_TUNNEL|supabase/i.test(e));
  return { out, A, B, realErrors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const site of ['fr', 'zh']){
      const { out, A, B, realErrors } = await rodar(browser, site);
      const so = (log, x) => log.filter(t => t === x).length;
      check(`${site}: controle: sem nada no meio, a nova tentativa fala A de novo`, so(out.controle.log, A) === 2, out.controle);
      check(`${site}: tocou outro áudio (voz B): A não volta depois de B`, JSON.stringify(out.outroAudio.log) === JSON.stringify([A, B]), out.outroAudio);
      check(`${site}: tocou um mp3: A não volta e o mp3 tocou`, so(out.mp3.log, A) === 1 && out.mp3.audio.length === 1, out.mp3);
      check(`${site}: trocou de cartão (stopExerciseAudio): A não volta, sem aviso`, so(out.trocaCartao.log, A) === 1 && !out.trocaCartao.toasts.length, out.trocaCartao);
      check(`${site}: trocou de aba: A não volta`, so(out.trocaAba.log, A) === 1, out.trocaAba);
      check(`${site}: o botão saiu da tela: A não volta`, so(out.botaoSaiu.log, A) === 1, out.botaoSaiu);
      check(`${site}: as duas tentativas engasgam: aviso de falha`, so(out.falha.log, A) === 2 && out.falha.toasts.length === 1, out.falha);
      check(`${site}: sem erro de página`, realErrors.length === 0, realErrors);
    }
  } finally { await browser.close(); }
  console.log(`M2 voz cancelável: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
