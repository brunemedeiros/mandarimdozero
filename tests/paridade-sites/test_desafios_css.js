// Paridade 5c (docs/historico/29-paridade-desafios.md): as regras dos Desafios saíram do <style> do fr/index.html para
// shared/desafios.css (carregado logo depois do <style>). Mudar uma regra de lugar só muda o que a aluna vê quando ela
// "empata" com outra regra (mesma especificidade, mesma propriedade, valor diferente) que pega o MESMO elemento e cuja
// ordem relativa trocou. Este teste confere isso em todos os pares, no navegador:
//  1. lista todas as regras da página (cada seletor da lista em separado, com @media) no fr de REF e no fr de agora;
//  2. confere que são as MESMAS regras (nenhuma sumiu, nenhuma apareceu, nenhum valor mudou);
//  3. para cada par cuja ordem trocou, com a mesma especificidade e alguma propriedade com valor diferente, procura um
//     elemento que case com os dois seletores (sem os :hover/:focus/::before, para pegar todos os estados) nas telas dos
//     Desafios (categorias, listas, álbum, cada player em pergunta e devolutiva, fila, revisão, trilha, janelas, admin,
//     prévia, importação), claro e escuro, 390 e 1200px. Nenhum par assim = nada muda na cascata.
// Rodar: node tests/paridade-sites/test_desafios_css.js   (REF padrão 3035549c; PARIDADE_5C_REF=<commit> para outro)
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const H = require('./desafios-harness.js');
const ROOT = H.ROOT;
const REF = process.env.PARIDADE_5C_REF || '3035549c';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 1500) : ''); } };

// Coleta as regras na ordem da cascata (folhas na ordem do documento; @media por dentro).
const COLLECT = () => {
  const out = [];
  const spec = (sel) => {
    let s = sel.replace(/:where\([^)]*\)/g, '');
    let a = 0, b = 0, c = 0;
    s = s.replace(/:(not|is|has)\(([^()]*)\)/g, (m, f, inner) => { const ss = inner.split(',').map(x => x.trim()).filter(Boolean);
      let best = [0, 0, 0]; ss.forEach(x => { const r = specOf(x); if (r[0] > best[0] || (r[0] === best[0] && (r[1] > best[1] || (r[1] === best[1] && r[2] > best[2])))) best = r; });
      a += best[0]; b += best[1]; c += best[2]; return ' '; });
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(\([^)]*\))?/g) || []).length;
    c += (s.match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) || []).length + (s.match(/::[\w-]+/g) || []).length;
    return [a, b, c];
  };
  function specOf(x){ return spec(x); }
  const splitSel = (p) => { const r = []; let d = 0, cur = ''; for (const ch of p){ if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d){ r.push(cur.trim()); cur = ''; } else cur += ch; } r.push(cur.trim()); return r; };
  const walk = (rules, media, sheet) => {
    for (const r of rules){
      if (r.type === 1){
        const props = {};
        for (let i = 0; i < r.style.length; i++){ const p = r.style[i]; props[p] = r.style.getPropertyValue(p) + (r.style.getPropertyPriority(p) ? '!' : ''); }
        splitSel(r.selectorText).forEach(sel => out.push({ sel, spec: spec(sel).join(','), props, media, sheet }));
      } else if (r.cssRules && (r.type === 4 || r.type === 12)) walk(r.cssRules, media + '@' + (r.conditionText || r.media && r.media.mediaText), sheet);
    }
  };
  [...document.styleSheets].forEach(sh => { let rules; try { rules = sh.cssRules; } catch (e) { return; } walk(rules, '', (sh.href || 'inline').replace(/^https?:\/\/[^/]+/, '')); });
  return out;
};

async function scenes(page, visit){
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await visit('inicio');
  await ev(() => switchTab('challenges'));
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  await visit('categorias');
  for (const t of ['expression', 'listen_translate', 'accent', 'cloze_grammar']){ await ev((t) => renderChallengesList(t), t); await visit('lista-' + t); }
  await ev(() => { renderChallengesList('expression'); document.querySelector('.challenges-level-heading').click(); }); await visit('album-recolhido');
  const ids = await ev(() => { const by = {}; publishedChallenges().forEach(c => { (by[c.type] = by[c.type] || []).push(c.id); }); return Object.values(by).flatMap(l => l.slice(0, 4)); });
  for (const id of ids){
    await ev((id) => openChallengePlayer(id), id); await visit('q-' + id);
    for (let k = 0; k < 3; k++){
      await ev(([id, k]) => { openChallengePlayer(id); const c = CHALLENGES.find(x => x.id === id);
        if (c.type === 'expression'){ document.getElementById('challenge-reveal-btn').click(); const b = [...document.querySelectorAll('.challenge-choice-btn')]; (k === 0 ? b.find(x => x.textContent === c.correctAnswer) : b.find(x => x.textContent !== c.correctAnswer)).click(); const r = document.getElementById('challenge-reveal-answer-btn'); if (r && k === 2) r.click(); }
        else if (c.type === 'listen_translate'){ document.getElementById('lt-hint-btn').click(); document.getElementById('lt-answer-input').value = [c.referenceTranslations[0], c.referenceTranslations[0].split(' ').slice(1).join(' ') + ' não', 'xyz'][k]; document.getElementById('lt-verify-btn').click(); }
        else if (c.type === 'accent'){ document.getElementById('accent-answer-input').value = [c.targetText, c.targetText.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'zzz'][k]; document.getElementById('accent-verify-btn').click(); }
        else { if (k === 2){ document.getElementById('cloze-grammar-verify-btn').click(); return; } (c.blanks || []).forEach((b, i) => { [...document.querySelectorAll('.challenge-choice-btn[data-blank="' + i + '"]')].find(x => k === 0 ? x.dataset.value === b.answer : x.dataset.value !== b.answer).click(); }); document.getElementById('cloze-grammar-verify-btn').click(); } }, [id, k]);
      await visit('fb-' + id + '-' + k);
    }
  }
  await ev(() => { const c = publishedChallenges().find(x => x.type === 'accent'); challengeQueueContext = { type: 'accent', level: c.level }; openChallengePlayer(c.id); document.getElementById('accent-answer-input').value = c.targetText; document.getElementById('accent-verify-btn').click(); document.getElementById('challenge-complete-btn').click(); });
  await visit('fila-continuar');
  await ev(() => { const c = publishedChallenges().find(x => x.type === 'accent'); renderChallengeQueueLevelDoneScreen(c); }); await visit('fila-fim');
  await ev(() => renderChallengeReviewDoneScreen()); await visit('revisao-fim');
  await ev(() => { const base = Date.now(); publishedChallenges().slice(0, 3).forEach(c => { STATE.challengeReviews[c.id] = { id: c.id, lastErrorAt: base - 9 * 86400000, lastSeenAt: base - 9 * 86400000, box: 1 }; }); renderChallengeCategories(); });
  await page.waitForFunction(() => document.getElementById('challenges-review-card')); await visit('revisao-card');
  await ev(() => openModuleChallenges('A1-m1')); await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card')); await visit('modulo');
  await ev(() => { STATE.currentLevel = 'A1'; switchTab('path'); });
  await page.waitForFunction(() => document.querySelectorAll('.module-challenges-slot .unit-block').length > 0, null, { timeout: 10000 }).catch(() => {});
  await visit('trilha');
  await ev(() => openPremiumChallengesModal()); await visit('premium');
  await ev(() => { document.getElementById('premium-challenges-modal').style.display = 'none'; document.body.classList.add('x'); const a = document.getElementById('app'); if (a) a.classList.add('lesson-focus'); switchTab('challenges'); openChallengePlayer(publishedChallenges()[0].id); });
  await visit('foco');
  await ev(() => { const a = document.getElementById('app'); if (a) a.classList.remove('lesson-focus'); CURRENT_USER = { id: 'a', email: 'brunemed1310@gmail.com' }; challengesLoadedAt = 0; renderChallengeCategories(); });
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  await ev(() => renderChallengesAdmin()); await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
  await visit('admin');
  await ev(() => { const c = pendingChallenges()[0]; challengesAdminEditingId = c.id; renderChallengesAdminList(); }); await visit('admin-edit');
  await ev(() => { const cbs = document.querySelectorAll('.challenges-admin-select-checkbox'); cbs[0].checked = true; cbs[0].dispatchEvent(new Event('change')); }); await visit('admin-sel');
  await ev(() => openChallengePreview(pendingChallenges()[1])); await visit('admin-previa');
  await ev(() => { document.getElementById('challenges-import-modal').style.display = 'flex'; const st = document.getElementById('challenges-import-status'); st.className = 'challenges-import-status err'; st.textContent = 'x'; }); await visit('import-err');
  await ev(() => { document.getElementById('challenges-import-status').className = 'challenges-import-status ok'; }); await visit('import-ok');
}

(async () => {
  let wt = null;
  const browser = await H.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5c-css-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    let totalFlagged = 0, totalPairs = 0, totalScenes = 0;
    const THEMES = (process.env.TEMAS || 'light,dark').split(','), WIDTHS = (process.env.LARGURAS || '390,1200').split(',').map(Number);
    for (const theme of THEMES) for (const width of WIDTHS){
      const t0 = Date.now();
      const A = await H.boot(browser, wt, { theme, viewport: { width, height: 844 } });
      const B = await H.boot(browser, ROOT, { theme, viewport: { width, height: 844 } });
      const ra = await A.page.evaluate(COLLECT), rb = await B.page.evaluate(COLLECT);
      const key = (r) => r.sel + '|' + r.media + '|' + JSON.stringify(r.props);
      // 2. mesmas regras
      const cnt = (list) => { const m = new Map(); list.forEach(r => m.set(key(r), (m.get(key(r)) || 0) + 1)); return m; };
      const ca = cnt(ra), cb = cnt(rb);
      const sumiu = [...ca].filter(([k, n]) => (cb.get(k) || 0) < n).map(([k]) => k);
      const apareceu = [...cb].filter(([k, n]) => (ca.get(k) || 0) < n).map(([k]) => k);
      check(`${theme} ${width}: mesmas regras (${ra.length})`, ra.length === rb.length && !sumiu.length && !apareceu.length, { sumiu: sumiu.slice(0, 5), apareceu: apareceu.slice(0, 5) });
      const moved = rb.filter(r => /desafios\.css$/.test(r.sheet));
      if (theme === 'light' && width === 390) check('o desafios.css tem regras', moved.length > 300, moved.length);
      // posições (k-ésima ocorrência da mesma chave)
      const pos = (list) => { const seen = new Map(); return list.map(r => { const k = key(r); const n = seen.get(k) || 0; seen.set(k, n + 1); return k + '#' + n; }); };
      const pa = pos(ra), pb = pos(rb);
      const ia = new Map(pa.map((k, i) => [k, i])), ib = new Map(pb.map((k, i) => [k, i]));
      // 3. pares com a ordem trocada que empatam
      const cands = [];
      const movedIdx = rb.map((r, i) => /desafios\.css$/.test(r.sheet) ? i : -1).filter(i => i >= 0);
      for (const i of movedIdx){
        const R = rb[i], kR = pb[i], oR = ia.get(kR);
        for (let j = 0; j < rb.length; j++){
          if (j === i) continue;
          const S = rb[j]; if (S.spec !== R.spec) continue;
          const oS = ia.get(pb[j]);
          if (!process.env.CONTROLE && (oS > oR) === (j > i)) continue; // CONTROLE=1: todos os pares (prova que a busca acha empates)
          const diff = Object.keys(R.props).filter(p => p in S.props && S.props[p] !== R.props[p]);
          if (!diff.length) continue;
          cands.push({ a: R.sel, b: S.sel, ma: R.media, mb: S.media, props: diff });
        }
      }
      totalPairs += cands.length;
      // elemento que casa com os dois (sem pseudo-classes de estado e pseudo-elementos)
      const strip = (sel) => { // tira :hover, :not(...), :has(...), ::before... (parênteses equilibrados)
        const NAMES = /^::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|disabled|checked|first-child|last-child|not|has|nth-child|nth-of-type|-webkit-[\w-]+|-moz-[\w-]+|marker|selection)/;
        let out = '', k = 0;
        while (k < sel.length){
          const m = sel[k] === ':' && NAMES.exec(sel.slice(k));
          if (m){ k += m[0].length; if (sel[k] === '('){ let d = 0; do { if (sel[k] === '(') d++; else if (sel[k] === ')') d--; k++; } while (k < sel.length && d); } continue; }
          out += sel[k++];
        }
        return out.trim() || '*';
      };
      // pares iguais depois de tirar os estados viram um só
      const uniq = new Map();
      cands.forEach(c => { const k = strip(c.a) + '\u0000' + strip(c.b); if (!uniq.has(k)) uniq.set(k, c); });
      const ucands = [...uniq.values()];
      const flagged = new Map();
      let sc = 0; const seenA = new Set(), badSel = new Set();
      await scenes(B.page, async () => {
        sc++;
        const hits = await B.page.evaluate(([strippedA, strippedB]) => {
          const r = [], seenA = [], bad = []; const cache = new Map();
          const q = (s) => { if (!cache.has(s)){ let l; try { l = new Set(document.querySelectorAll(s)); } catch (e) { l = new Set(); bad.push(s); } cache.set(s, l); } return cache.get(s); };
          strippedA.forEach((sa, i) => { const la = q(sa); if (!la.size) return; seenA.push(i); const lb = q(strippedB[i]); for (const el of la) if (lb.has(el)){ r.push(i); break; } });
          return { r, seenA, bad };
        }, [ucands.map(c => strip(c.a)), ucands.map(c => strip(c.b))]);
        hits.r.forEach(i => flagged.set(i, ucands[i]));
        hits.seenA.forEach(i => seenA.add(i)); hits.bad.forEach(x => badSel.add(x));
      });
      totalScenes += sc;
      // sanidade: as telas têm de fato os elementos das regras movidas, e todo seletor (sem os estados) é válido
      check(`${theme} ${width}: as telas mostram os elementos das regras movidas (${seenA.size} de ${ucands.length} pares com elemento)`, seenA.size > ucands.length / 3, seenA.size);
      check(`${theme} ${width}: seletores válidos depois de tirar os estados`, badSel.size === 0, [...badSel].slice(0, 5));
      totalFlagged += flagged.size;
      check(`${theme} ${width}: nenhum empate trocado de ordem pega um elemento das telas (${cands.length} pares candidatos, ${ucands.length} sem os estados, ${sc} cenas)`, flagged.size === 0, [...flagged.values()].slice(0, 8));
      console.log(`  ${theme} ${width}: ${Math.round((Date.now() - t0) / 1000)} s`);
      for (const X of [A, B]){ check(`${theme} ${width}: sem erro de página`, X.errors.length === 0, X.errors); await X.ctx.close(); X.server.close(); }
    }
    console.log(`  pares de regras com ordem trocada e empate de especificidade/propriedade: ${totalPairs}; casam com um mesmo elemento: ${totalFlagged} (${totalScenes} cenas)`);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`Desafios, cascata do CSS (fr antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
