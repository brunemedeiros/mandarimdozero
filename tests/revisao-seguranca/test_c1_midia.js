// C1: URL de imagem/áudio do cartão nunca vira atributo novo no HTML (XSS entre contas pelo Deck público).
// Falha na origin/main (o onerror roda), passa com shared/core/midia-segura.js. fr e zh.
// Rodar: node tests/revisao-seguranca/test_c1_midia.js   (REPO_ROOT=<worktree> para rodar contra outra árvore)
const { withPage, realErrors, close, check, summary } = require('./harness');

const EVIL_IMG = 'https://x.invalid/a.png" onerror="window.__pwned++';
const EVIL_AUDIO = 'x" onfocus="window.__pwned+=100" autofocus="';
const GOOD_IMG = 'https://abc.supabase.co/storage/v1/object/public/flashcard-media/u1/a.png?x=1&y=2';
const GOOD_AUDIO = 'https://abc.supabase.co/storage/v1/object/public/flashcard-media/u1/a.mp3';

(async () => {
  for (const site of ['fr', 'zh']){
    console.log(`\n[${site}]`);
    const r = await withPage(site, async (page, errs) => {
      const out = await page.evaluate(async ({ EVIL_IMG, EVIL_AUDIO, GOOD_IMG, GOOD_AUDIO }) => {
        const lang = APP_KEY === 'mandarim' ? 'zh' : 'fr';
        const mk = (img, aud, mode, extra) => ({ id: 'pd-' + Math.random(), language_app_key: APP_KEY, status: 'active', card_generation_mode: mode || 'normal', tags: [], revision: 0,
          fields: [
            { id: 'f0', lang, role: mode === 'multiple_choice' ? 'prompt' : null, content: { value: lang === 'zh' ? '你好' : 'bonjour' }, audio: null, image: img ? { url: img } : null, pinyinFieldId: null },
            { id: 'f1', lang: 'pt-BR', role: mode === 'multiple_choice' ? 'answer' : null, content: { value: 'olá' }, audio: aud ? { type: 'url', url: aud } : null, image: img ? { url: img } : null, pinyinFieldId: null },
            ...(extra || []) ] });
        window.__pwned = 0;
        const res = {};
        // Normal (frente com imagem; verso com áudio e imagem, revelado)
        try { openFlashcardPreviewFromRow(mk(EVIL_IMG, EVIL_AUDIO), { origin: 'self', appKey: APP_KEY }); } catch (e) { res.err = e.message; }
        await new Promise(r => setTimeout(r, 400));
        document.querySelector('#flashcard')?.click();
        await new Promise(r => setTimeout(r, 600));
        res.normalImgAttrs = [...document.querySelectorAll('.flashcard-image')].map(i => i.getAttributeNames().sort().join(','));
        res.audioBtnAttrs = [...document.querySelectorAll('.custom-audio-btn')].map(b => b.getAttributeNames().sort().join(','));
        // Múltipla escolha e Digitar a resposta (os outros renderers com imagem)
        const mc = mk(EVIL_IMG, null, 'multiple_choice', [{ id: 'f2', lang: 'pt-BR', role: 'distractor', content: { value: 'tchau' }, audio: null, image: null, pinyinFieldId: null }]);
        try { openFlashcardPreviewFromRow(mc, { origin: 'self', appKey: APP_KEY }); } catch (e) { res.errMc = e.message; }
        await new Promise(r => setTimeout(r, 400));
        try { openFlashcardPreviewFromRow(mk(EVIL_IMG, null, 'type_answer'), { origin: 'self', appKey: APP_KEY }); } catch (e) { res.errTa = e.message; }
        await new Promise(r => setTimeout(r, 400));
        // Unidade: customAudioBtnHTML/flashcardImageHTML direto
        const div = document.createElement('div');
        div.innerHTML = customAudioBtnHTML(EVIL_AUDIO) + customAudioBtnHTML('javascript:alert(1)');
        res.directAudioBtns = div.querySelectorAll('button').length;
        res.directAudioAttrs = [...div.querySelectorAll('button')].map(b => b.getAttributeNames().sort().join(','));
        // URL legítima: mesma marcação e mesma URL de antes
        div.innerHTML = customAudioBtnHTML(GOOD_AUDIO);
        res.goodAudioUrl = div.querySelector('button')?.dataset.audioUrl;
        try { openFlashcardPreviewFromRow(mk(GOOD_IMG, GOOD_AUDIO), { origin: 'self', appKey: APP_KEY }); } catch (e) { res.errGood = e.message; }
        await new Promise(r => setTimeout(r, 400));
        document.querySelector('#flashcard')?.click();
        await new Promise(r => setTimeout(r, 400));
        res.goodImgSrc = document.querySelector('.flashcard-image')?.getAttribute('src');
        res.goodImgCount = document.querySelectorAll('.flashcard-image').length;
        res.goodAudioBtn = document.querySelector('.custom-audio-btn')?.dataset.audioUrl;
        res.pwned = window.__pwned;
        return res;
      }, { EVIL_IMG, EVIL_AUDIO, GOOD_IMG, GOOD_AUDIO });
      out.errors = realErrors(errs);
      return out;
    });
    check(`${site}: nenhum script roda pela URL de mídia (pwned=0)`, r.pwned === 0, r.pwned);
    check(`${site}: <img> do cartão só tem alt/class/src`, r.normalImgAttrs.every(a => a === 'alt,class,src'), r.normalImgAttrs);
    check(`${site}: botão de áudio com URL suspeita não ganha atributo novo`, r.audioBtnAttrs.every(a => !/onfocus|autofocus/.test(a)), r.audioBtnAttrs);
    check(`${site}: customAudioBtnHTML recusa URL com aspas e javascript:`, r.directAudioBtns === 0, r.directAudioAttrs);
    check(`${site}: URL legítima de áudio continua igual`, r.goodAudioUrl === GOOD_AUDIO, r.goodAudioUrl);
    check(`${site}: URL legítima de imagem continua igual (com & na query)`, r.goodImgSrc === GOOD_IMG, r.goodImgSrc);
    check(`${site}: cartão legítimo mostra imagem e áudio`, r.goodImgCount >= 1 && r.goodAudioBtn === GOOD_AUDIO, { n: r.goodImgCount, a: r.goodAudioBtn });
    check(`${site}: sem erro de página`, !r.err && !r.errMc && !r.errTa && !r.errGood && r.errors.length === 0, [r.err, r.errMc, r.errTa, r.errGood, r.errors]);
  }
  await close();
  summary('C1 mídia');
})().catch(async e => { console.error(e); await close(); process.exit(1); });
