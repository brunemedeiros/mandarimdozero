// Etapa 5: o site obedece à tabela Admin > Planos. Navegador real (fr e zh), uma conta de cada tipo:
// grátis, aluno, Premium Basic e professora (my_permissions simulado com os valores do banco depois da 116,
// tests/planos-permissoes/fixtures.js). Confere o que cada uma vê e abre: tipos de cartão, áudio por texto,
// limite de cartões (por conta), Deck público, pular unidades, Desafios, selos dos Jogos e o botão de e-mail.
// Capturas (SHOT_DIR=pasta): selo dos Jogos, aviso de limite com o botão e Admin > Planos, fr/zh x claro/escuro, 390px.
// Rodar: node tests/planos-permissoes/test_playwright.js
const path = require('path');
const { server, bootPage, chromium } = require('../anki-destino/pw_harness');
const { abrirAdmin } = require('../painel-admin/harness.js');
const { permsFor, TABLE } = require('./fixtures');
const OUT = process.env.SHOT_DIR || null;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };

const KINDS = ['free', 'student', 'premium', 'teacher'];
// O que cada conta deve ter (tabela da dona de 2026-10-22 + 116).
const EXPECT = {
  free:    { types: 1, tts: false, unlimited: false, deck: false, skip: false, challenges: false, games: false, badge: 'Plano grátis — 0/20 cartões' },
  student: { types: 5, tts: true,  unlimited: true,  deck: true,  skip: true,  challenges: true,  games: true,  badge: 'Aluno vinculado — cartões ilimitados' },
  premium: { types: 5, tts: true,  unlimited: true,  deck: true,  skip: true,  challenges: true,  games: true,  badge: 'Premium — cartões ilimitados' },
  teacher: { types: 5, tts: true,  unlimited: true,  deck: true,  skip: false, challenges: true,  games: true,  badge: 'Premium — cartões ilimitados' },
};

async function openAs(page, kind, seedCount = 0){
  await page.evaluate(([perms, seedCount]) => {
    CURRENT_USER = { id: 'u-f' };
    isAdminUser = () => false;
    if (typeof isChallengesAdmin === 'function') isChallengesAdmin = () => false;
    PROFILE_CACHE = { user_id: 'u-f', username: 'aluna.teste', plan_tier: 'free', admin_mode: true };
    ensureProfileLoaded = async () => PROFILE_CACHE;
    MY_PERMISSIONS = perms;
    window.__DB.own_flashcards = Array.from({ length: seedCount }, (_, i) => ({ id: 9000 + i, owner_id: 'u-f', language_app_key: APP_KEY, status: 'active', deck_id: null, front: 'a' + i, back_trans: 'b', fields: null, card_generation_mode: null, revision: 0, tags: [], created_at: new Date().toISOString() }));
    if (STATE.activeTab === 'my-flashcards' || document.getElementById('my-flashcard-deck')) switchTab('profile');
    switchTab('my-flashcards');
  }, [permsFor(kind), seedCount]);
  await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---- 0) a tabela simulada é a do banco (mesmos 15 itens do catálogo depois da 116)
  check('fixtures: 14 permissões do catálogo (com conj_games e review_bank)', Object.keys(TABLE).length === 14 && !!TABLE.conj_games && !!TABLE.review_bank, Object.keys(TABLE).length);

  for (const lang of ['fr', 'zh']){
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const course = lang === 'fr' ? 'Francês' : 'Mandarim';
    for (const kind of KINDS){
      const E = EXPECT[kind];
      const L = (n, c, x) => check(`${lang}/${kind}: ${n}`, c, x);
      await openAs(page, kind);
      const r = await ev(() => ({
        types: [...document.querySelectorAll('#my-flashcard-card-type-preview option')].map(o => o.value),
        audio: myAllowedAudioOrigins(),
        badge: ([...document.querySelectorAll('.pill')].map(e => e.textContent).find(x => /cartões/.test(x)) || '').replace(/^\S+\s*/, ''),
        hint: !!document.querySelector('#my-create-flashcard-form [data-premium-contact]'),
        unlimited: MY_FLASHCARDS_STATE._hasLink, limit: MY_FLASHCARDS_STATE._limit,
        deckCan: planCan('public_deck_import'),
        gate: publicDeckGateHTML({ authenticated: true, can_open: planCan('public_deck_import') }),
        copies: planCan('public_deck_copy_count'),
      }));
      L(`tipos de cartão (${E.types})`, r.types.length === E.types && r.types[0] === 'normal', r.types);
      L(`áudio por texto e gravação ${E.tts ? 'liberados' : 'só upload/link'}`, E.tts ? r.audio === undefined : JSON.stringify(r.audio) === '["none","upload","url"]', r.audio);
      L(`selo do limite: "${E.badge}"`, r.badge === E.badge, r.badge);
      L(`limite ${E.unlimited ? 'sem teto' : '20 por conta'}`, E.unlimited ? (r.unlimited === true && r.limit === null) || (r.unlimited === true) : (r.unlimited === false && r.limit === 20), r);
      L(`aviso dos tipos com o botão de e-mail ${E.types === 1 ? 'aparece' : 'não aparece'}`, r.hint === (E.types === 1), r.hint);
      L(`Deck público ${E.deck ? 'abre' : 'mostra o aviso com o botão'}`, r.deckCan === E.deck && (E.deck ? r.gate === '' : /data-premium-contact/.test(r.gate) && /mailto:brunemed1310@gmail\.com/.test(r.gate)), r.gate.slice(0, 200));
      L('ver quem copiou meu Deck segue a mesma linha', r.copies === E.deck);
      if (lang === 'fr'){
        const g = await ev(() => {
          const out = {};
          TRAIL_SKIP_PAYWALL_ENABLED = true; out.skip = trailSkipAllowed(); TRAIL_SKIP_PAYWALL_ENABLED = false; out.skipOff = trailSkipAllowed();
          out.challenges = challengesPremiumUnlocked();
          switchTab('conjugaison'); setConjMode('games');
          const seal = () => ({ card: (document.querySelector('.cg-card .cg-premium') || {}).textContent, tab: (document.querySelector('[data-conj-games-seal]') || {}).textContent });
          out.off = seal();
          CONJ_GAMES_PAYWALL_ENABLED = true; setConjMode('games'); out.on = seal(); out.locked = isConjGameLocked();
          CONJ_GAMES_PAYWALL_ENABLED = false; setConjMode('games');
          return out;
        });
        L(`pular unidades (bloqueio ligado): ${E.skip ? 'pode' : 'não pode'}`, g.skip === E.skip, g);
        L('pular unidades (bloqueio desligado, hoje): todos podem', g.skipOff === true);
        L(`Desafios do Módulo e Ditados extras: ${E.challenges ? 'liberados' : 'Premium'}`, g.challenges === E.challenges);
        L('Jogos com bloqueio desligado: só "⭐ Premium", sem cadeado', /⭐/.test(g.off.card) && /Premium/.test(g.off.card) && !/🔒/.test(g.off.card) && g.off.tab === '⭐', g.off);
        L(`Jogos com bloqueio ligado: ${E.games ? 'sem cadeado' : '⭐ Premium + cadeado'}`, E.games ? (!/🔒/.test(g.on.card) && g.on.tab === '⭐' && !g.locked) : (/⭐/.test(g.on.card) && /🔒/.test(g.on.card) && g.on.tab === '⭐🔒' && g.locked), g.on);
        await ev(() => switchTab('my-flashcards'));
        await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
      }
    }

    // ---- aviso de limite (conta grátis com 20) + botão de e-mail pt e en
    await openAs(page, 'free', 20);
    await page.waitForFunction(() => document.getElementById('my-create-flashcard-btn')?.disabled === true, null, { timeout: 8000 }).catch(() => {});
    const lim = await ev(() => { openFlashcardLimitModal(); const m = document.getElementById('flashcard-limit-modal'); const a = m.querySelector('a[data-premium-contact]');
      return { text: m.innerText, href: a && a.getAttribute('href'), btn: a && a.textContent, disabled: document.getElementById('my-create-flashcard-btn').disabled }; });
    const mail = decodeURIComponent(lim.href || '');
    check(`${lang}: no teto o botão Criar trava`, lim.disabled === true, lim);
    check(`${lang}: aviso de limite fala da conta e do Premium, sem "profbrune"`, /20 cartões próprios ativos/.test(lim.text) && /somando todos os cursos/.test(lim.text) && !/profbrune|administração/.test(lim.text), lim.text);
    check(`${lang}: botão "Fale com a Prof. Brune" abre o e-mail com assunto e texto preenchidos`, /Fale com a Prof\. Brune/.test(lim.btn) && mail.startsWith('mailto:brunemed1310@gmail.com?subject=Quero o Premium (' + course + ')') && mail.includes('Meu usuário: @aluna.teste') && mail.includes('Curso: ' + course), mail);
    if (OUT){
      await page.setViewportSize({ width: 390, height: 844 });
      for (const scheme of ['light', 'dark']){
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(OUT, `aviso-limite-${lang}-${scheme}-390.png`) });
      }
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1200, height: 1000 });
    }
    // en: botão e e-mail em inglês, nada de português
    await ev(() => setUiLang('en'));
    await page.waitForFunction(() => t('premiumContact.button') === 'Contact Prof. Brune', null, { timeout: 8000 });
    const en = await ev(() => { openFlashcardLimitModal(); const m = document.getElementById('flashcard-limit-modal'); const a = m.querySelector('a[data-premium-contact]'); return { text: m.innerText, href: a && a.getAttribute('href') }; });
    const mailEn = decodeURIComponent(en.href || '');
    check(`${lang}/en: aviso e botão em inglês`, /Contact Prof\. Brune/.test(en.text) && /on your account, counting all courses/.test(en.text) && !/Fale|conta|Premium:\s*com/.test(en.text), en.text);
    check(`${lang}/en: e-mail em inglês com @ e curso`, mailEn.includes("subject=I'd like Premium (" + (lang === 'fr' ? 'French' : 'Mandarin') + ')') && mailEn.includes('My username: @aluna.teste') && !/Olá|Meu usuário/.test(mailEn), mailEn);
    await ev(() => { document.getElementById('flashcard-limit-modal').style.display = 'none'; setUiLang('pt-BR'); });
    await page.waitForFunction(() => t('premiumContact.button') === 'Fale com a Prof. Brune', null, { timeout: 8000 });

    // ---- capturas do selo dos Jogos (só o francês tem Jogos)
    if (OUT && lang === 'fr'){
      await openAs(page, 'free');
      await ev(() => { switchTab('conjugaison'); setConjMode('games'); });
      await page.setViewportSize({ width: 390, height: 844 });
      for (const scheme of ['light', 'dark']){
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(OUT, `jogos-selo-sem-cadeado-fr-${scheme}-390.png`) });
      }
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1200, height: 1000 });
    }
    check(`${lang}: sem erros de JS na página`, errors.length === 0, errors);
    await ctx.close();
  }

  // ---- Admin > Planos: linhas da Professora só leitura; as outras editáveis (catálogo real depois da 116)
  const CAT = [['own_cards_limit', 'limit'], ['rich_card_formats', 'bool'], ['tts_monthly_quota', 'limit'], ['public_deck_import', 'bool'], ['public_deck_copy_count', 'bool'], ['challenges_premium', 'bool'], ['conj_games', 'bool'],
    ['trail_skip_locked', 'bool'], ['class_logs_view', 'bool'], ['support_materials_view', 'bool'], ['teacher_panel', 'bool'], ['teacher_student_analytics', 'bool'], ['teacher_board', 'bool'], ['review_bank', 'bool']];
  const ROLES = ['user', 'student', 'premium_basic', 'premium_pro', 'teacher'];
  const SEED = {
    permission_catalog: CAT.map(([key, kind], i) => ({ key, kind, label_pt: key, sort: i })),
    role_permissions: ROLES.flatMap(r => CAT.map(([k]) => { const v = (TABLE[k] || {})[r] || [false]; return { role: r, permission_key: k, enabled: !!v[0], limit_value: v[1] == null ? null : v[1] }; })),
    profiles: [{ user_id: 'A', username: 'brune', display_name: 'Brune', plan_tier: 'premium', role: 'admin' }],
  };
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const h = await abrirAdmin({ lang, scheme, width: 390, height: 844, aba: 'premium', seed: SEED });
    const p = h.page;
    await p.waitForSelector('[data-plano-matriz] tbody tr');
    const m = await p.evaluate(() => ({
      rows: document.querySelectorAll('[data-plano-matriz] tbody tr').length,
      ro: document.querySelectorAll('[data-plano-so-leitura] input:disabled').length,
      edit: document.querySelectorAll('[data-plano-celula] input[type="checkbox"]:not(:disabled)').length,
      sub: document.querySelector('[data-tpl="pagina"] .p-subtitulo').textContent,
      note: (document.querySelector('[data-plano-so-leitura-nota]') || {}).textContent || '',
      skipPremium: document.querySelector('[data-plano-celula][data-role="premium_basic"][data-key="trail_skip_locked"] input').checked,
      games: !!document.querySelector('[data-plano-celula][data-key="conj_games"]'),
      scroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
    }));
    const L = (n, c, x) => check(`Planos [${lang}/${scheme}]: ${n}`, c, x);
    L('14 permissões; 4 linhas da Professora só leitura (20 caixas) e 50 editáveis', m.rows === 14 && m.ro === 20 && m.edit === 50, m);
    L('subtítulo: vale na hora para Grátis, Aluno e Premium', m.sub.includes('Grátis, Aluno e Premium'), m.sub);
    L('explicação das linhas da Professora', m.note.includes('papel Professora'), m.note);
    L('Pular unidades ligado para Premium Basic; Jogos da Conjugação na tabela', m.skipPremium && m.games, m);
    if (OUT){
      await p.screenshot({ path: path.join(OUT, `admin-planos-${lang}-${scheme}-390.png`), fullPage: true });
    }
    await h.close();
  }

  await browser.close(); server.close();
  console.log(`Planos e permissões (Etapa 5) -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
