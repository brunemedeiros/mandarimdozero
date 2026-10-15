// Node/VM -- peças de tela da aba Cartões (shared/teacher-cards-ui.js): tipo do cartão, resumo, filtros, paginação, linha da lista,
// chips, rótulo do botão e escape de texto vindo de pessoas. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-cartoes/test_cards_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, isNaN, Promise, Intl, APP_KEY: 'frances',
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx);
ctx.fmtDate = (d) => new Intl.DateTimeFormat('pt-BR').format(new Date(d));
vm.createContext(ctx);
vm.runInContext(`var CARD_TYPE_UI_META = [
  { id: 'normal', get label(){ return t('admin.flashcards.cardType.normal'); } },
  { id: 'normal_reversed', get label(){ return t('admin.flashcards.cardType.normalReversed'); } },
  { id: 'multiple_choice', get label(){ return t('admin.flashcards.cardType.multipleChoice'); } },
  { id: 'type_answer', get label(){ return t('admin.flashcards.cardType.typeAnswer'); } },
  { id: 'cloze', get label(){ return t('admin.flashcards.cardType.cloze'); } }];`, ctx);
for (const f of ['shared/srs.js', 'shared/admin-students.js', 'shared/teacher-students-ui.js', 'shared/teacher-cards-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const card = (id, o) => Object.assign({ id, student_id: 's1', status: 'active', front: 'le chat', back_trans: 'o gato', tags: [], created_at: '2026-10-01T12:00:00Z' }, o || {});

// ---- tipo do cartão ----
check('tipo: modo nativo vale', run('tccCardType(c)', { c: card(1, { card_generation_mode: 'normal_reversed' }) }) === 'normal_reversed');
check('tipo: legado com lacuna é cloze', run('tccCardType(c)', { c: card(1, { cloze_sentence: 'Je ___' }) }) === 'cloze');
check('tipo: legado com alternativas é múltipla escolha', run('tccCardType(c)', { c: card(1, { choices: ['a', 'b'] }) }) === 'multiple_choice');
check('tipo: legado simples é normal', run('tccCardType(c)', { c: card(1) }) === 'normal');

// ---- resumo ----
check('resumo: frente e verso', JSON.stringify(run('tccSummary(c)', { c: card(1) })) === '{"front":"le chat","back":"o gato"}');
check('resumo: pinyin entre parênteses', run('tccSummary(c)', { c: card(1, { front: '猫', front_pinyin: 'māo' }) }).front === '猫 (māo)');
check('resumo: lacuna legada mostra a resposta entre colchetes', run('tccSummary(c)', { c: card(1, { front: '', cloze_sentence: 'Je ___ français', cloze_answer: 'parle' }) }).front === 'Je [parle] français');

// ---- mídia ----
check('mídia: áudio em coluna antiga', run('tccHasMedia(c, "audio")', { c: card(1, { audio_url: 'x.mp3' }) }) === true);
check('mídia: imagem num Field', run('tccHasMedia(c, "image")', { c: card(1, { fields: [{ image: { url: 'a.png' } }] }) }) === true);
check('mídia: sem nada', run('tccHasMedia(c, "audio")', { c: card(1) }) === false);

// ---- filtros ----
const lista = [card(1), card(2, { student_id: 's2', front: 'la maison', back_trans: 'a casa', tags: ['casa'] }), card(3, { status: 'archived', front: 'vieux' }), card(4, { front: 'Été', back_trans: 'verão', __student: { display_name: 'Marina', username: 'mari' } })];
const ids = f => run('tccFilterCards(L, f).map(c => c.id).join()', { L: lista, f });
check('filtro: ativos por padrão', ids({ status: 'active' }) === '1,2,4');
check('filtro: arquivados', ids({ status: 'archived' }) === '3');
check('filtro: por aluno', ids({ status: 'active', aluno: 's2' }) === '2');
check('filtro: busca sem acento e sem maiúscula', ids({ status: 'active', busca: 'ete' }) === '4');
check('filtro: busca por tag', ids({ status: 'active', busca: 'casa' }) === '2');
check('filtro: busca pelo nome da pessoa', ids({ status: 'active', busca: 'marina' }) === '4');
check('filtro: busca sem resultado', ids({ status: 'active', busca: 'zzz' }) === '');

// ---- paginação ----
check('páginas: poucas mostram todas', JSON.stringify(run('tccPageList(2, 3)')) === '[1,2,3]');
check('páginas: reticências nos buracos', JSON.stringify(run('tccPageList(5, 10)')) === '[1,"…",4,5,6,"…",10]');
check('páginas: início sem reticência à esquerda', JSON.stringify(run('tccPageList(1, 10)')) === '[1,2,"…",10]');
check('paginação: uma página só não desenha nada', run('tccPaginationHTML(10, 1)') === '');
const pg = run('tccPaginationHTML(25, 2)');
check('paginação: faixa do total (11 a 20 de 25)', pg.includes('11') && pg.includes('20') && pg.includes('25'));
check('paginação: página atual marcada', pg.includes('aria-current="page">2<'));
check('paginação: anterior habilitado e próximo habilitado no meio', !/p-pag-ant[^>]*aria-disabled/.test(pg) && !/p-pag-prox[^>]*aria-disabled/.test(pg));
check('paginação: na última o próximo fica desligado', /p-pag-prox[^>]*aria-disabled="true"/.test(run('tccPaginationHTML(25, 3)')));

// ---- rótulo do botão e chips ----
check('botão: uma pessoa', run('tccSubmitLabel(1)') === 'Criar cartão');
check('botão: várias pessoas diz quantas', run('tccSubmitLabel(3)').includes('3 alunos'));
check('chips: ninguém escolhido', run('tccChipsHTML([])').includes('Ninguém escolhido'));
const chips = run('tccChipsHTML(S)', { S: [{ student_id: 's1', display_name: '<b>Ana</b>', username: 'ana', language_app_key: 'frances' }] });
check('chips: nome escapado, sem tag solta', !chips.includes('<b>Ana') && chips.includes('&lt;b&gt;Ana'));
check('chips: botão de tirar com o id', chips.includes('data-tirar-aluno="s1"'));

// ---- abas ----
const abas = run('tccTabsHTML("lista", 7)');
check('abas: 2 abas, lista marcada com a contagem', (abas.match(/data-cards-tab=/g) || []).length === 2 && /data-cards-tab="lista" aria-current="page"/.test(abas) && abas.includes('(7)'));
check('abas: sem contagem quando ainda carrega', !run('tccTabsHTML("criar", null)').includes('('));
const casco = run('tccShellHTML("lista", 7, { criar: "<i>c</i>", lista: "<i>l</i>" })');
check('quadro: só a aba atual visível', /data-cards-pane="criar" hidden/.test(casco) && !/data-cards-pane="lista" hidden/.test(casco));

// ---- linha e lista ----
const ctxLista = { canMove: c => c.id === 1, deckLabel: c => 'Deck <x>' };
const linha = run('tccRowHTML(c, k)', { c: card(1, { front: '<img src=x onerror=1>', tags: ['a"b'], status: 'archived' }), k: ctxLista });
check('linha: texto do cartão escapado', !linha.includes('<img') && linha.includes('&lt;img'));
check('linha: tag escapada em atributo', linha.includes('data-tag="a&quot;b"'));
check('linha: Deck escapado', linha.includes('Deck &lt;x&gt;'));
check('linha: cartão arquivado tem Reativar', linha.includes('data-toggle-flashcard="1"'));
check('linha: Mover só quando pode', linha.includes('data-move-flashcard') && !run('tccRowHTML(c, k)', { c: card(2), k: ctxLista }).includes('data-move-flashcard'));
check('linha: ativo não tem Reativar', !run('tccRowHTML(c, k)', { c: card(2), k: ctxLista }).includes('data-toggle-flashcard'));
const corpo = run('tccListBodyHTML(L, f, L.length, 1, k)', { L: lista, f: { status: 'active' }, k: ctxLista });
check('lista: 3 linhas ativas', (corpo.match(/data-card-row=/g) || []).length === 3);
check('lista: sem cartões nenhum convida a criar', run('tccListBodyHTML([], f, 0, 1, k)', { f: { status: 'active' }, k: ctxLista }).includes('data-cards-tab="criar"'));
check('lista: filtro sem resultado só avisa', !run('tccListBodyHTML(L, f, L.length, 1, k)', { L: lista, f: { status: 'active', busca: 'zzz' }, k: ctxLista }).includes('data-cards-tab="criar"'));
const muitos = Array.from({ length: 25 }, (_, i) => card(100 + i));
check('lista: 10 por página, página 3 tem 5', (run('tccListBodyHTML(L, f, 25, 3, k)', { L: muitos, f: { status: 'active' }, k: ctxLista }).match(/data-card-row=/g) || []).length === 5);
check('lista: página fora do limite volta para a última', (run('tccListBodyHTML(L, f, 25, 99, k)', { L: muitos, f: { status: 'active' }, k: ctxLista }).match(/data-card-row=/g) || []).length === 5);

// ---- diálogos ----
const mv = run('tccMoveDialogHTML(c, "<option value=\\"9\\">Verbos</option>")', { c: card(5) });
check('mover: janela com o id do cartão e a opção', mv.includes('data-card-id="5"') && mv.includes('Verbos') && mv.includes('id="mover-cartao-deck"'));

console.log(`painel-cartoes (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
