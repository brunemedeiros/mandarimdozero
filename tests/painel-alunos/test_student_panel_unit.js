// Node/VM -- helpers de render do Painel do aluno ampliado (070) em
// shared/admin-students.js + trackReviewAnswer (shared/analytics.js).
// Uso: node tests/painel-alunos/test_student_panel_unit.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

let pass = 0, fail = 0;
function check(name, cond){
  if (cond){ pass++; } else { fail++; console.log('FALHA:', name); }
}

function makeCtx(appKey){
  const ctx = {
    console, Date, Math, JSON, Number, String, Array, Object, isNaN, Promise,
    APP_KEY: appKey,
    escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/srs.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-students.js'), 'utf8'), ctx);
  return ctx;
}

const fr = makeCtx('frances');
vm.runInContext(`var UNITS = [{id:'A1-1', title:'Cumprimentar'}, {id:'A1-2', title:'Apresentar-se'}];
var MODULES = [{id:'A1-m1', title:'Primeiros contatos'}];`, fr);
const today = vm.runInContext('todayStr()', fr);
const d = n => vm.runInContext(`dateStrDaysAgo(${n})`, fr);

// 1. Dados vazios
{
  const html = fr.renderStudentPanelHTML(null, null);
  check('overview null -> aviso', html.includes('Não foi possível carregar a visão geral'));
  check('metrics null -> aviso', html.includes('Não foi possível carregar as métricas'));
  const h2 = fr.renderStudentPanelHTML({ linkedLanguage: 'frances', languages: [], timeline: [], answers: {}, lessonScores: {} }, null);
  check('sem progresso -> mensagem', h2.includes('Ainda não há progresso salvo'));
  check('sem acertos -> data de início', h2.includes('começa a ser registrado a partir de'));
  check('timeline vazia', h2.includes('Nenhuma atividade registrada'));
}

// 2. 0 cartões da professora ainda mostra última atividade
{
  const m = { lastStudyDay: today, contentsTotal: 0, archivedNotes: 0 };
  const html = fr.renderStudentMetricsHTML(m);
  check('0 cartões: mostra última atividade', html.includes('Última atividade geral da conta') && html.includes('hoje'));
  check('0 cartões: mostra dica de criar', html.includes('ainda não criou nenhum cartão'));
  const m2 = { lastStudyDay: d(3), contentsTotal: 2, contentsStudied: 1, contentsNotStarted: 1, contentsStrengthNotStarted: 1,
    contentsStrengthWeak: 0, contentsStrengthMedium: 1, contentsStrengthStrong: 0, cardsTotal: 3, cardsNew: 1, cardsLearning: 1,
    cardsReview: 1, cardsDue: 1, archivedNotes: 0 };
  const h2 = fr.renderStudentMetricsHTML(m2);
  check('com cartões: bloco completo', h2.includes('3 dias atrás') && h2.includes('Cartões gerados desses conteúdos'));
}

// 3. Idioma completo, streak vivo/congelado, títulos de unidade
const frLang = {
  key: 'frances', lastStudyDay: today, streak: 5, xp: 321, totalReviews: 17,
  progressSummary: { levelLabel: 'A1', pct: 12 },
  unitsCompleted: ['A1-1'], unitsStarted: 2,
  checkpoints: { 'A1-m1': { completed: true, bestScore: 85 } },
  activityDays: { [today]: 3, [d(2)]: 1, [d(20)]: 2 },
  dailyLessons: { [today]: 2 },
  dictations: [{ id: 'a1-m1-1', bestScore: 90, attempts: 2 }],
  challengesCompleted: 4,
  queue: { total: 6, new: 2, learning: 2, review: 2, due: 3, weak: 1 },
  ownCardsActive: 7,
};
{
  const ov = { linkedLanguage: 'frances', languages: [frLang],
    timeline: [{ at: new Date().toISOString(), type: 'lesson_complete', name: 'vocab_lesson', lang: 'frances', meta: { unitId: 'A1-1', scorePct: 80 } },
               { at: new Date().toISOString(), type: 'tab_switch', name: 'review', lang: 'frances', meta: {} }],
    answers: { allTotal: 10, last7Total: 4, last7Correct: 3, last30Total: 10, last30Correct: 7 },
    lessonScores: { last30Count: 2, last30AvgPct: 70 } };
  const html = fr.renderStudentPanelHTML(ov, null);
  check('streak vivo 5', html.includes('🔥 5'));
  check('XP', html.includes('321'));
  check('nível', html.includes('A1 · 12%'));
  check('unidades concluídas: título do site', html.includes('A1-1 · Cumprimentar'));
  check('checkpoint com título do módulo', html.includes('Primeiros contatos') && html.includes('85%'));
  check('dias ativos 7 = 2', html.includes('2 nos últimos 7'));
  check('dias ativos 30 = 3', html.includes('3 dias ativos'));
  check('fila', html.includes('3 devidos') && html.includes('1 fracos'));
  check('cartões próprios só contagem', html.includes('Cartões próprios do aluno: <strong>7</strong>'));
  check('acertos 7 dias 75%', html.includes('75%'));
  check('acertos 30 dias 70%', html.includes('>70%<'));
  check('média de lições', html.includes('média <strong>70%</strong>'));
  check('timeline: concluiu lição com unidade', html.includes('Concluiu lição da trilha (A1-1 · Cumprimentar) -- 80%'));
  check('timeline: aba', html.includes('Abriu a aba Revisão'));
  check('detalhes expansíveis', (html.match(/<details/g) || []).length === 6);
  check('faixa de 30 dias', (html.match(/var\(--jade\)/g) || []).length === 3);
  check('ditados/desafios', html.includes('a1-m1-1') && html.includes('Desafios concluídos: <strong>4</strong>'));
  check('único idioma vinculado: sem cabeçalho de idioma', !html.includes('(idioma do vínculo)'));

  const frozen = Object.assign({}, frLang, { lastStudyDay: d(5), streak: 9 });
  const h2 = fr.renderStudentPanelHTML({ linkedLanguage: 'frances', languages: [frozen], timeline: [], answers: {}, lessonScores: {} }, null);
  check('streak congelado vira 0', h2.includes('🔥 0') && h2.includes('5 dias atrás'));
}

// 4. Multi-idioma e vínculo 'portugues' sem progresso em portugues
{
  const zhLang = { key: 'mandarim', lastStudyDay: d(40), streak: 2, xp: 10, unitsCompleted: ['1'], queue: {} };
  const html = fr.renderStudentPanelHTML({ linkedLanguage: 'frances', languages: [frLang, zhLang], timeline: [], answers: {}, lessonScores: {} }, null);
  check('multi: cabeçalho de cada idioma', html.includes('Francês (idioma do vínculo)') && html.includes('Chinês'));
  check('multi: unidade de outro idioma mostra id', html.includes('<li>1</li>'));
  const pt = fr.renderStudentPanelHTML({ linkedLanguage: 'portugues', languages: [frLang], timeline: [], answers: {}, lessonScores: {} }, null);
  check('vínculo portugues: nota explicativa', pt.includes('Sem progresso em Português -- estudando no site de Francês'));
  check('vínculo portugues: mostra dados do francês', pt.includes('321') && pt.includes('>Francês<'));
}

// 5. Escape de HTML
{
  const evil = '<img src=x onerror=alert(1)>';
  const lang = Object.assign({}, frLang, { unitsCompleted: [evil], dictations: [{ id: evil, bestScore: 1 }],
    progressSummary: { levelLabel: evil, pct: 1 }, checkpoints: { [evil]: { bestScore: 1 } } });
  const ov = { linkedLanguage: 'frances', languages: [lang],
    timeline: [{ at: 'x', type: 'tab_switch', name: evil, lang: 'frances', meta: {} },
               { at: 'x', type: 'lesson_complete', name: evil, lang: 'frances', meta: { unitId: evil } }],
    answers: {}, lessonScores: {} };
  const html = fr.renderStudentPanelHTML(ov, null);
  check('nenhum <img cru', !html.includes('<img'));
  check('escapado', html.includes('&lt;img'));
  const zh = makeCtx('frances');
  const h2 = zh.renderStudentPanelHTML({ linkedLanguage: '<b>x</b>', languages: [Object.assign({}, frLang, { key: '<b>k</b>' })], timeline: [], answers: {}, lessonScores: {} }, null);
  check('chave de idioma desconhecida escapada', !h2.includes('<b>'));
}

// 6. trackReviewAnswer: pula preview, grava 1 linha por cartão
{
  const ctx = { console, Number, crypto: { randomUUID: () => 'u' }, navigator: { userAgent: '' } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/analytics.js'), 'utf8'), ctx);
  const calls = [];
  ctx.trackEvent = (t, n, m) => calls.push([t, n, m]);
  vm.runInContext('trackReviewAnswer', ctx); // existe
  ctx.trackReviewAnswer('flashcard', { origin: 'teacher', cardInstance: { cardTypeId: 'cloze' } }, 0);
  ctx.trackReviewAnswer('flashcard', { __isPreviewCard: true }, 2);
  ctx.trackReviewAnswer('speed_review', {}, 2);
  ctx.trackReviewAnswer('flashcard', null, 2);
  check('2 eventos (preview e null pulados)', calls.length === 2);
  check('errei = correct false', calls[0][0] === 'review_answer' && calls[0][2].correct === false && calls[0][2].cardOrigin === 'teacher' && calls[0][2].cardTypeId === 'cloze');
  check('bom = correct true, origem padrão study', calls[1][2].correct === true && calls[1][2].cardOrigin === 'study' && calls[1][1] === 'speed_review');
}

console.log(`${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
