// Tag da unidade (`unidade-<slug>`) não muda com o idioma do site.
// Bug antigo (Etapa 3, item 6): o overlay content.en.js troca `unit.title` no próprio
// objeto, e studyTrailUnitTag montava o slug de `unit.title` -- no site em inglês o slug
// saía do título em inglês e filtros de tag salvos deixavam de casar.
// Prova, em fr e zh, com o código REAL (content.js, content.en.js, content-i18n.js,
// study-trail-model.js): mesmo slug em pt-BR e en, e igual ao slug do título original.
// Rodar: node tests/trilha-tags/test_slug_idioma.js
const vm = require('vm');
const { loadLang, read, check, summary } = require('../fase-e/harness');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = (c, f) => vm.runInContext(c, ctx, { filename: f });
  run(read('shared/content-i18n.js'), 'shared/content-i18n.js');
  run(read(lang + '/content.en.js'), lang + '/content.en.js');
  // Títulos originais (português), lidos ANTES de qualquer overlay.
  const ptTitles = new Map(ctx.UNITS.map(u => [String(u.id), u.title]));
  const MAXLEN = run('TAG_MAX_LENGTH', 'max');
  const expected = new Map(ctx.UNITS.map(u => {
    const s = 'unidade-' + ctx.normalizeTagSlug(u.title);
    return [String(u.id), (s !== 'unidade-' && s.length <= MAXLEN) ? s : 'unidade-' + ctx.normalizeTagSlug(u.id)];
  }));
  const ci = run('ContentI18n.create({ units: UNITS, overlayUrl: () => "", getLang: () => "pt-BR" })', 'create');
  const unitTags = (cards) => {
    const m = new Map();
    cards.forEach(c => { const t = (c.tags || []).find(x => /^unidade-/.test(x)); if (t) m.set(String(c.unitId), t); });
    return m;
  };

  ci.apply('pt-BR');
  const tagsPt = unitTags(ctx.buildCardsFromUnits(ctx.UNITS));
  const unitTagPt = new Map(ctx.UNITS.map(u => [String(u.id), ctx.studyTrailUnitTag(u)]));

  ci.apply('en');
  const changed = ctx.UNITS.filter(u => u.title !== ptTitles.get(String(u.id)));
  check(lang + ' o overlay en troca o título de várias unidades (pré-condição do bug)', changed.length > 5, changed.length);
  const oldWayDiffers = changed.filter(u => ('unidade-' + ctx.normalizeTagSlug(u.title)) !== expected.get(String(u.id))).length;
  check(lang + ' pelo jeito antigo (unit.title) o slug em en sairia diferente', oldWayDiffers > 0, oldWayDiffers);
  const tagsEn = unitTags(ctx.buildCardsFromUnits(ctx.UNITS));
  const unitTagEn = new Map(ctx.UNITS.map(u => [String(u.id), ctx.studyTrailUnitTag(u)]));

  ci.apply('pt-BR');
  const tagsPt2 = unitTags(ctx.buildCardsFromUnits(ctx.UNITS));

  const ids = ctx.UNITS.map(u => String(u.id));
  check(lang + ' studyTrailUnitTag: pt-BR == en em todas as unidades', ids.every(id => unitTagPt.get(id) === unitTagEn.get(id)),
    ids.filter(id => unitTagPt.get(id) !== unitTagEn.get(id)).slice(0, 5).map(id => [id, unitTagPt.get(id), unitTagEn.get(id)]));
  check(lang + ' studyTrailUnitTag em pt-BR == slug do título original (nenhum slug de hoje muda)', ids.every(id => unitTagPt.get(id) === expected.get(id)));
  check(lang + ' cartões da trilha: tag unidade-* igual em pt-BR e en', tagsPt.size > 0 && tagsPt.size === tagsEn.size && [...tagsPt].every(([id, t]) => tagsEn.get(id) === t),
    [...tagsPt].filter(([id, t]) => tagsEn.get(id) !== t).slice(0, 5));
  check(lang + ' voltar para pt-BR mantém as mesmas tags', [...tagsPt].every(([id, t]) => tagsPt2.get(id) === t));
  check(lang + ' _originalTitle não é enumerável (não vai para JSON)', ctx.UNITS.every(u => !Object.keys(u).includes('_originalTitle') && !JSON.stringify(u).includes('_originalTitle')));
  check(lang + ' título exibido continua seguindo o idioma (en aplicado troca, pt-BR restaura)', ctx.UNITS.every(u => u.title === ptTitles.get(String(u.id))));
  // Unidade sem ContentI18n (objeto solto, ex.: testes antigos/servidor): continua usando unit.title.
  check(lang + ' unidade sem _originalTitle usa unit.title (como antes)', ctx.studyTrailUnitTag({ id: 'x', title: 'Olá mundo' }) === 'unidade-' + ctx.normalizeTagSlug('Olá mundo'));
}
summary('Tag da unidade igual em pt-BR e en');
