// Node/VM -- peças de tela da aba Alunos (shared/teacher-students-ui.js) + helpers de shared/admin-students.js
// + trackReviewAnswer (shared/analytics.js). Textos vêm do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-alunos/test_students_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

function makeCtx(appKey){
  const ctx = { console, Date, Math, JSON, Number, String, Array, Object, isNaN, Promise, Intl, APP_KEY: appKey,
    escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
  installT(ctx);
  vm.createContext(ctx);
  for (const f of ['shared/srs.js', 'shared/admin-students.js', 'shared/teacher-students-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  return ctx;
}
const fr = makeCtx('frances');
vm.runInContext(`var UNITS = [{id:'A1-1', title:'Cumprimentar'}, {id:'A1-2', title:'Apresentar-se'}]; var MODULES = [{id:'A1-m1', title:'Primeiros contatos'}];`, fr);
const d = n => vm.runInContext(`dateStrDaysAgo(${n})`, fr);
const today = d(0);

// ---- 1. Regra de situação (aprovada pela autora): 0 a 3 dias em dia, 4 a 6 atenção, 7+ parado, sem registro neutro ----
{
  const S = fr.tsuSituation;
  check('0 dias = ok', S(0) === 'ok'); check('3 dias = ok (limite)', S(3) === 'ok');
  check('4 dias = atenção (limite)', S(4) === 'warn'); check('6 dias = atenção', S(6) === 'warn');
  check('7 dias = parado (limite)', S(7) === 'stopped'); check('40 dias = parado', S(40) === 'stopped');
  check('sem registro = neutro (nunca "parado")', S(null) === 'none' && S(undefined) === 'none');
  check('dias desde: hoje 0, ontem 1, 9 atrás 9', fr.tsuDaysSince(today) === 0 && fr.tsuDaysSince(d(1)) === 1 && fr.tsuDaysSince(d(9)) === 9);
  check('dias desde: data ruim = null', fr.tsuDaysSince('lixo') === null && fr.tsuDaysSince(null) === null && fr.tsuDaysSince('2026-1-1') === null);
  check('rótulos de dias', fr.tsuDaysLabel(0) === 'hoje' && fr.tsuDaysLabel(1) === 'ontem' && fr.tsuDaysLabel(5) === '5 dias atrás' && fr.tsuDaysLabel(null) === 'sem registro');
}

// ---- 2. Linhas, resumo e filtros do quadro geral ----
const lang = (extra) => Object.assign({ key: 'frances', lastStudyDay: today, streak: 5, xp: 321, totalReviews: 17, progressSummary: { levelLabel: 'A1', pct: 12 },
  unitsCompleted: ['A1-1'], unitsStarted: 2, checkpoints: { 'A1-m1': { completed: true, bestScore: 85 } }, activityDays: { [today]: 3, [d(2)]: 1, [d(20)]: 2 },
  dailyLessons: { [today]: 2 }, dictations: [], challengesCompleted: 4, queue: { total: 6, new: 2, learning: 2, review: 2, due: 3, weak: 1 }, ownCardsActive: 7 }, extra || {});
const ovOf = (l) => ({ linkedLanguage: 'frances', languages: [l], timeline: [], answers: {}, lessonScores: {} });
const link = (id, user, name, key) => ({ id, student_id: 's' + id, username: user, display_name: name, language_app_key: key || 'frances', status: 'active', created_at: '2026-10-01T12:00:00Z' });
{
  const rows = [
    fr.tsuRowData(link(1, 'ana', 'Ana Paula', 'frances'), ovOf(lang())),
    fr.tsuRowData(link(2, 'bia', 'Bia Lima', 'frances'), ovOf(lang({ lastStudyDay: d(5), queue: { due: 10 } }))),
    fr.tsuRowData(link(3, 'caio', 'Caio Prado', 'frances'), ovOf(lang({ lastStudyDay: d(8), queue: { due: 4 } }))),
    fr.tsuRowData(link(4, 'duda', 'Duda', 'mandarim'), ovOf(lang({ key: 'mandarim', lastStudyDay: d(30), queue: { due: 1 } }))),
    fr.tsuRowData(link(5, 'edu', 'Edu', 'frances'), { linkedLanguage: 'frances', languages: [], timeline: [] }),
    fr.tsuRowData(link(6, 'fabi', 'Fabi', 'frances'), null),
  ];
  check('situações das linhas', rows.map(r => r.situation).join() === 'ok,warn,stopped,stopped,none,none', rows.map(r => r.situation));
  check('overview que falhou fica marcado e não vira "parado"', rows[5].failed === true && rows[5].situation === 'none' && rows[5].due === null);
  check('streak congelado vira 0 (parou há 8 dias)', rows[2].streak === 0 && rows[0].streak === 5);
  const s = fr.tsuSummary(rows);
  check('resumo: total, hoje, vencidos, parados, atenção, falhas', s.total === 6 && s.studiedToday === 1 && s.due === 3 + 10 + 4 + 1 && s.stopped === 2 && s.warn === 1 && s.failed === 1, s);
  check('resumo por curso', s.byLang.frances === 5 && s.byLang.mandarim === 1, s.byLang);
  const F = (f) => fr.tsuFilterRows(rows, Object.assign({ busca: '', curso: '', soAtencao: false }, f)).map(r => r.link.id).join();
  check('filtro vazio: todos', F({}) === '1,2,3,4,5,6');
  check('filtro só atenção = atenção + parados', F({ soAtencao: true }) === '2,3,4');
  check('filtro por curso', F({ curso: 'mandarim' }) === '4');
  check('busca por nome sem acento e sem maiúscula', F({ busca: 'PAULA' }) === '1' && F({ busca: 'bia' }) === '2');
  check('busca por @usuário', F({ busca: '@caio' }) === '3');
  check('busca + curso combinam', F({ busca: 'duda', curso: 'frances' }) === '');
  const html = fr.tsuGeralHTML(rows, { busca: '', curso: '', soAtencao: false }, true, { options: '<option>x</option>', languages: '<option>y</option>' });
  check('geral: título, contagem, alerta de parados no plural', html.includes('>Alunos<') && html.includes('6 alunos ativos') && html.includes('2 alunos estão há 7 dias ou mais sem estudar.'));
  check('geral: 4 indicadores', (html.match(/class="p-indicador"/g) || []).length === 4);
  check('geral: seletor de curso só com mais de um curso', html.includes('data-filtro-curso') && !fr.tsuGeralHTML(rows.slice(0, 1), { busca: '', curso: '', soAtencao: false }, true, null).includes('data-filtro-curso'));
  check('geral: botão Abrir por aluno', (html.match(/data-abrir-aluno=/g) || []).length === 6);
  check('geral: colunas secundárias somem no celular', (html.match(/p-oculta-movel/g) || []).length >= 6);
  check('geral: admin vê Vincular aluno e o diálogo; professora não vê o diálogo e recebe a seção de convite pronta', html.includes('data-abrir-dialogo="dlg-vincular-aluno"') && html.includes('id="dlg-vincular-aluno"')
    && !fr.tsuGeralHTML(rows, { busca: '', curso: '', soAtencao: false }, false, null).includes('dlg-vincular-aluno') && fr.tsuGeralHTML(rows, { busca: '', curso: '', soAtencao: false }, false, null, '<article data-tinv-secao>X</article>').includes('data-tinv-secao') && !fr.tsuGeralHTML(rows, { busca: '', curso: '', soAtencao: false }, false, null).includes('data-tinv-secao'));
  check('geral: aviso de falha parcial', html.includes('Não foi possível carregar os dados de 1 aluno.'));
  const um = fr.tsuGeralHTML(rows.slice(0, 1), { busca: '', curso: '', soAtencao: false }, true, null);
  check('singular: 1 aluno ativo', um.includes('1 aluno ativo') && !um.includes('estão há 7 dias'));
  const vazio = fr.tsuGeralHTML([], { busca: '', curso: '', soAtencao: false }, true, null);
  check('turma vazia: estado vazio com explicação', vazio.includes('Nenhum aluno vinculado ainda') && vazio.includes('o progresso dela aparece aqui'));
  check('filtro sem resultado: mensagem própria', fr.tsuTableHTML([], { busca: 'zzz', curso: '', soAtencao: false }).includes('Nenhum aluno com esses filtros.'));
  check('situações aparecem como texto (não só cor)', html.includes('>Em dia<') && html.includes('>Atenção<') && html.includes('>Parado<') && html.includes('>Sem estudo<'));
}

// ---- 3. Ficha do aluno ----
{
  const l = link(1, 'ana', 'Ana Paula');
  const ov = { linkedLanguage: 'frances', languages: [lang()],
    timeline: [{ at: new Date().toISOString(), type: 'lesson_complete', name: 'vocab_lesson', lang: 'frances', meta: { unitId: 'A1-1', scorePct: 80 } },
               { at: new Date().toISOString(), type: 'tab_switch', name: 'review', lang: 'frances', meta: {} }],
    answers: { allTotal: 10, last7Total: 4, last7Correct: 3, last30Total: 10, last30Correct: 7 }, lessonScores: { last30Count: 2, last30AvgPct: 70 } };
  const html = fr.tsuFichaHTML({ link: l, overview: ov, metrics: undefined, logs: undefined, langKey: null }, true);
  check('ficha: trilha, nome, @usuário e nível', html.includes('data-voltar-alunos') && html.includes('<h2>Ana Paula</h2>') && html.includes('@ana') && html.includes('Nível A1 · 12%'));
  check('ficha: último estudo hoje e sequência 5 dias', html.includes('>hoje<') && html.includes('5 dias'));
  check('ficha: vencidos 3 de 6; acerto 75% em 4 cartões', html.includes('de 6 na fila') && html.includes('75%') && html.includes('em 4 cartões revisados'));
  check('ficha: 3 dias ativos e 30 quadradinhos', html.includes('3 dias ativos nos últimos 30') && (() => { const a = html.match(/class="p-atividade"[^>]*>(.*?)<\/div>/)[1]; return (a.match(/<i[ >]/g) || []).length === 30 && (a.match(/class="on"/g) || []).length === 3; })());
  check('ficha: unidades, pontos de verificação, desafios e média das lições', html.includes('2') && html.includes('Primeiros contatos: melhor nota 85%') && html.includes('Desafios concluídos') && html.includes('70%'));
  check('ficha: fila empilhada com os 3 estados e fracos', html.includes('p-pilha') && html.includes('2</b> novos') && html.includes('4 fracos') === false && html.includes('1</b> fracos (errados 2+ vezes)'));
  check('ficha: linha do tempo com unidade e nota', html.includes('Concluiu lição da trilha (A1-1 · Cumprimentar) · acerto 80%') && html.includes('Abriu a aba Revisão'));
  check('ficha: cartões criados e aulas começam carregando', (html.match(/p-spinner/g) || []).length === 2);
  check('ficha: admin/professora com vínculo vê Remover (menu de risco)', html.includes('data-remover-vinculo="1"') && html.includes('p-menu-item--perigo'));
  check('ficha: sem remoção quando canRemove=false', !fr.tsuFichaHTML({ link: l, overview: ov, langKey: null }, false).includes('data-remover-vinculo'));
  check('ficha: lição singular', html.includes('2 lições concluídas') && fr.tsuFichaHTML({ link: l, overview: ovOf(lang({ dailyLessons: { [today]: 1 } })), langKey: null }, true).includes('1 lição concluída'));
  // streak congelado
  const frozen = fr.tsuFichaHTML({ link: l, overview: ovOf(lang({ lastStudyDay: d(5), streak: 9 })), langKey: null }, true);
  check('ficha: streak congelado vira 0 e "5 dias atrás"', frozen.includes('5 dias atrás') && frozen.includes('>0 dias<'));
  // sem progresso
  check('ficha: overview sem idiomas', fr.tsuFichaHTML({ link: l, overview: { linkedLanguage: 'frances', languages: [], timeline: [] }, langKey: null }, true).includes('Ainda não há progresso salvo nesta conta.'));
  check('ficha: overview que falhou mostra erro e ainda mostra o bloco de cartões', (() => { const h = fr.tsuFichaHTML({ link: l, overview: null, metrics: undefined }, true); return h.includes('Não foi possível carregar os dados deste aluno agora.') && h.includes('data-bloco-criados'); })());
  // sem acertos: data de início
  check('ficha: sem acertos mostra a data de início do registro', fr.tsuFichaHTML({ link: l, overview: Object.assign({}, ov, { answers: { allTotal: 0 } }), langKey: null }, true).includes('começa a ser registrado a partir de') && fr.tsuFichaHTML({ link: l, overview: Object.assign({}, ov, { answers: { allTotal: 0 } }), langKey: null }, true).includes('sem revisões ainda'));
  // vários idiomas
  const zhLang = lang({ key: 'mandarim', lastStudyDay: d(40), streak: 2, unitsCompleted: ['1'], queue: {} });
  const multi = fr.tsuFichaHTML({ link: l, overview: { linkedLanguage: 'frances', languages: [lang(), zhLang], timeline: [], answers: {}, lessonScores: {} }, langKey: null }, true);
  check('multi-idioma: seletor com 2 botões e o do vínculo marcado', (multi.match(/data-ficha-idioma=/g) || []).length === 2 && /data-ficha-idioma="frances" aria-pressed="true"/.test(multi));
  const multiZh = fr.tsuFichaHTML({ link: l, overview: { linkedLanguage: 'frances', languages: [lang(), zhLang], timeline: [], answers: {}, lessonScores: {} }, langKey: 'mandarim' }, true);
  check('multi-idioma: trocar para o chinês mostra os dados dele (40 dias atrás)', multiZh.includes('40 dias atrás') && /data-ficha-idioma="mandarim" aria-pressed="true"/.test(multiZh));
  const pt = fr.tsuFichaHTML({ link: link(9, 'x', 'X', 'portugues'), overview: { linkedLanguage: 'portugues', languages: [lang()], timeline: [] }, langKey: null }, true);
  check('vínculo em português sem progresso nele: nota e dados do francês', pt.includes('Sem progresso em Português') && pt.includes('estudando no site de Francês') && pt.includes('>hoje<'));
  // cartões criados
  const C = (m) => fr.tsuCreatedHTML(m, 'Ana');
  check('criados: carregando / falhou / vazio', C(undefined).includes('p-spinner') && C(null).includes('Não foi possível carregar os cartões') && C({ contentsTotal: 0, archivedNotes: 0 }).includes('Nenhum cartão criado para Ana ainda'));
  const m = { contentsTotal: 3, contentsStudied: 2, contentsNotStarted: 1, contentsStrengthNotStarted: 1, contentsStrengthWeak: 0, contentsStrengthMedium: 1, contentsStrengthStrong: 1, cardsTotal: 6, cardsNew: 4, cardsLearning: 1, cardsReview: 1, cardsDue: 2, archivedNotes: 1, archivedCards: 2 };
  const ch = C(m);
  check('criados: conteúdos x cartões, força sem misturar não iniciados com fracos', ch.includes('2 de 3 (1 não iniciados)') && ch.includes('1 não iniciados · 0 fracos · 1 médios · 1 fortes') && ch.includes('6 (4 novos · 1 aprendendo · 1 para revisar · 2 vencidos)') && ch.includes('1 conteúdo · 2 cartões'));
  // aulas
  check('aulas: carregando / vazio / lista com data e tópico', fr.tsuClassesHTML(undefined).includes('p-spinner') && fr.tsuClassesHTML([]).includes('Nenhuma aula registrada para este aluno.')
    && (() => { const h = fr.tsuClassesHTML([{ class_date: '2026-10-09', topic: 'Passé composé' }]); return h.includes('09/10') && h.includes('Passé composé') && h.includes('data-ir-secao="classlogs"'); })());
}

// ---- 4. Escape de HTML (tudo que vem do banco) ----
{
  const evil = '<img src=x onerror=alert(1)>';
  const l = link(1, evil, evil, 'frances');
  const lg = lang({ unitsCompleted: [evil], progressSummary: { levelLabel: evil, pct: 1 }, checkpoints: { [evil]: { bestScore: 1 } } });
  const ov = { linkedLanguage: 'frances', languages: [lg], timeline: [{ at: 'x', type: 'tab_switch', name: evil, lang: 'frances', meta: {} }, { at: 'x', type: 'lesson_complete', name: evil, lang: 'frances', meta: { unitId: evil } }], answers: {}, lessonScores: {} };
  const html = fr.tsuFichaHTML({ link: l, overview: ov, metrics: { contentsTotal: 0, archivedNotes: 0 }, logs: [{ class_date: '2026-10-09', topic: evil }], langKey: null }, true);
  check('ficha: nenhum <img cru', !html.includes('<img'), html.match(/<img[^>]*>/));
  const rows = [fr.tsuRowData(l, ov)];
  const g = fr.tsuGeralHTML(rows, { busca: evil, curso: '', soAtencao: false }, true, null);
  check('geral: nenhum <img cru (nome, usuário, busca)', !g.includes('<img'), g.match(/<img[^>]*>/));
  check('geral: aspas do valor da busca escapadas', fr.tsuGeralHTML(rows, { busca: '"><script>', curso: '', soAtencao: false }, true, null).includes('value="&quot;&gt;&lt;script&gt;"'));
  check('classes de aula escapam o tópico', !fr.tsuClassesHTML([{ class_date: '2026-10-09', topic: evil }]).includes('<img'));
}

// ---- 5. Iniciais ----
check('iniciais', fr.tsuInitials('Marina Alves') === 'MA' && fr.tsuInitials('Madonna') === 'MA' && fr.tsuInitials('@rafa.costa') === 'RC' && fr.tsuInitials('') === '?');

// ---- 6. trackReviewAnswer: pula preview, grava 1 linha por cartão ----
{
  const ctx = { console, Number, crypto: { randomUUID: () => 'u' }, navigator: { userAgent: '' } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/analytics.js'), 'utf8'), ctx);
  const calls = [];
  ctx.trackEvent = (t, n, m) => calls.push([t, n, m]);
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
