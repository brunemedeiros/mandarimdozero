// Rotina automática do Banco (Edge Function review-bank-agent): lógica de core.mjs com um banco falso em memória.
// Rodar: node tests/banco-revisao/test_agent_core.js
const path = require('path');
const { check, summary } = require('../fase-h/harness');
const DIR = path.join(__dirname, '../../supabase/functions/review-bank-agent');

(async () => {
  const { spawnSync } = require('child_process');
  const sync = spawnSync('node', [path.join(__dirname, '../../scripts/build-review-bank-agent.js'), '--check'], { encoding: 'utf8' });
  check('engine.generated.mjs em dia com shared/*.js (rode scripts/build-review-bank-agent.js se falhar)', sync.status === 0, sync.stderr);
  const engine = await import(path.join(DIR, 'engine.generated.mjs'));
  const { createAgent, itemKey } = await import(path.join(DIR, 'core.mjs'));
  const T = 'teacher-1', TODAY = '2026-10-14';
  let seq = 0; const id = (p) => p + (++seq);
  const mk = () => {
    const d = { students: [], items: [], recaps: [], runs: [], cards: [], mutations: 0, settings: { auto_generate: true, manual_markdown: '# Manual' } };
    d.students.push({ id: 'sA', teacher_id: T, name: 'Ana', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', agent_managed: true, linked_student_id: 'uA', notebook_id: 'nbA', agenda_names: ['Ana'], lesson_dates: ['2026-10-01', '2026-10-15'], last_entry_read: '2026-10-10', started_on: '2026-06-01' });
    d.students.push({ id: 'sB', teacher_id: T, name: 'Bia', language_app_key: 'portugues', reference_language: 'en', status: 'ativo', agent_managed: true, linked_student_id: null, agenda_names: [], lesson_dates: [] });
    d.students.push({ id: 'sC', teacher_id: T, name: 'Caio', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', agent_managed: false, linked_student_id: 'uC', lesson_dates: [] });
    d.items.push({ id: 'i0', teacher_id: T, bank_student_id: 'sA', import_key: 'c001', item_type: 'vocabulario', question: 'to run', answer: 'courir', status: 'aprovado', level: 1, due_date: '2026-10-12', last_result: 'errou', teacher_flashcard_id: 77, class_date: '2026-10-01', explanation: null, check_note: null, sensitive: false, proposal: null, wrong_form: null, gap_word: null });
    const db = {
      listManagedStudents: async (t) => d.students.filter(s => s.teacher_id === t && s.agent_managed),
      getSettings: async () => d.settings,
      listItems: async (sid) => d.items.filter(i => i.bank_student_id === sid),
      getRecap: async (sid, date) => d.recaps.find(r => r.bank_student_id === sid && r.class_date === date) || null,
      updateStudent: async (sid, cols) => { Object.assign(d.students.find(s => s.id === sid), cols); },
      insertItems: async (rows) => { rows.forEach(r => { if (!d.items.some(i => i.bank_student_id === r.bank_student_id && i.import_key === r.import_key)) d.items.push(Object.assign({ id: id('n'), teacher_flashcard_id: null }, r)); }); },
      insertRecap: async (row) => { d.recaps.push(row); },
      approveCard: async (t, itemId, c) => { const it = d.items.find(i => i.id === itemId); if (it.teacher_flashcard_id) return; it.teacher_flashcard_id = 900 + d.cards.length; it.status = 'aprovado'; d.cards.push({ itemId, ...c }); },
      getUserEmail: async (u) => u + '@aluno.test',
      findStudentByName: async (t, name, lang) => d.students.find(s => s.teacher_id === t && s.language_app_key === lang && s.name.toLowerCase() === name.toLowerCase()) || null,
      insertStudent: async (row) => { const s = Object.assign({ id: id('s') }, row); d.students.push(s); return s; },
      insertRun: async (row) => { d.runs.push(row); },
    };
    return { d, agent: createAgent({ engine, db, teacherId: T, now: () => TODAY }) };
  };
  const call = (agent, body) => agent.handle(body);

  // --- ping e state
  let { d, agent } = mk();
  let r = await call(agent, { action: 'ping' });
  check('ping: ok e só conta alunos gerenciados', r.status === 200 && r.json.ok && r.json.managed_students === 2, JSON.stringify(r.json));
  r = await call(agent, { action: 'state' });
  const st = r.json;
  check('state: só alunos gerenciados e ativos (Caio, do artifact, não aparece)', st.students.map(s => s.name).join() === 'Ana,Bia');
  check('state: traz e-mail da conta vinculada, manual e itens compactos', st.students[0].linked_email === 'uA@aluno.test' && st.manual_markdown === '# Manual' && st.students[0].items[0].key === 'c001' && st.students[0].items[0].has_card === true && st.students[1].linked_email === null);
  check('state: não vaza campos internos do aluno vinculado', !('linked_student_id' in st.students[0]) && !('teacher_id' in st.students[0]));
  check('ação desconhecida e corpo inválido são recusados', (await call(agent, { action: 'apagar' })).status === 400 && (await call(agent, null)).status === 400);

  // --- ingest: aluno vinculado
  const itemsA = [
    { type: 'vocabulario', q: 'to run', a: 'courir' },                                            // duplicado por conteúdo de c001
    { type: 'vocabulario', q: 'the door', a: 'la porte', note: 'Fem.', status: 'cortado' },                           // pronto: vira cartão
    { type: 'erro', q: 'I went', wrong: 'Je suis allé hier soir', a: 'Je suis allé(e) hier soir', note: 'concordância', status: 'aprovado' },
    { type: 'estrutura', q: 'Besides being cheap', a: 'En plus d\'être bon marché, c\'est rapide', gap: 'En plus de', doubt: 'Conferir a lacuna.', status: 'pendente' },
    { type: 'vocabulario', q: 'dick', a: 'bite', doubt: 'Linguagem livre: palavrão. Decida se entra na revisão.', status: 'pendente', sensitive: true },
    { type: 'vocabulario', q: '', a: 'sem pergunta' },                                              // inválido
    { type: 'vocabulario', q: 'the window', a: 'la fenêtre', key: 'c001' },                        // chave repetida
  ];
  r = await call(agent, { action: 'ingest', students: [{ student_id: 'sA', items: itemsA, lesson_dates: ['2026-10-14', '2026-10-17'], last_entry_read: '2026-10-13', recap_date: TODAY }] });
  const a = r.json.summary.students[0];
  check('ingest: conta itens novos, duplicados e inválidos', r.status === 200 && a.new_items === 4 && a.skipped_duplicates === 2 && a.skipped_invalid === 1, JSON.stringify(a));
  check('ingest: pendentes e sensíveis contados', a.pending === 2 && a.sensitive === 1, JSON.stringify(a));
  check('ingest: só os prontos viram cartão (sem dúvida, não sensível)', a.cards_created === 2 && d.cards.length === 2 && a.card_errors.length === 0, JSON.stringify(a));
  check('ingest: item com dúvida e item sensível seguem pendentes sem cartão', d.items.filter(i => i.status === 'pendente' && !i.teacher_flashcard_id).length === 2);
  const erroCard = d.cards.find(c => c.mode === 'type_answer');
  check('cartão de erro sai como digitar, com observação para o aluno', !!erroCard && erroCard.note === 'concordância' && erroCard.fields.length === 2, JSON.stringify(erroCard && erroCard.mode));
  const direct = engine.rbBuildCard(d.items.find(i => i.question === 'the door'), d.students[0]);
  const viaAgent = d.cards.find(c => c.itemId === d.items.find(i => i.question === 'the door').id);
  check('cartão da rotina = cartão do motor do site (mesmos campos e modo)', direct.ok && viaAgent.mode === direct.mode && viaAgent.front === direct.front && viaAgent.back_trans === direct.back_trans && JSON.stringify(viaAgent.tags) === JSON.stringify(direct.tags));
  check('a rotina nunca corta nem aprova por conta própria: o status vem da regra (dúvida/sensível/sugestão => pendente)', d.items.find(i => i.question === 'the door').status === 'aprovado' && d.items.find(i => i.question === 'dick').status === 'pendente');
  check('item novo nasce com nível 0 e vence hoje', d.items.filter(i => i.import_key !== 'c001').every(i => i.level === 0 && i.due_date === TODAY));
  check('o item antigo (c001) não foi tocado', JSON.stringify(d.items[0]) === JSON.stringify(mk().d.items[0]));
  check('datas de aula: mantém passadas, troca as futuras', JSON.stringify(d.students[0].lesson_dates) === JSON.stringify(['2026-10-01', '2026-10-14', '2026-10-17']), JSON.stringify(d.students[0].lesson_dates));
  check('última entrada lida só avança', d.students[0].last_entry_read === '2026-10-13');
  check('recap da aula criado só com aprovados vencidos', a.recap_created && d.recaps.length === 1 && d.recaps[0].item_ids.length === 3 && d.recaps[0].class_date === TODAY && d.recaps[0].student_id === 'uA', JSON.stringify(d.recaps[0]));
  check('rodada registrada para auditoria', d.runs.length === 1 && d.runs[0].teacher_id === T);

  // --- idempotência
  const before = JSON.stringify(d.items);
  r = await call(agent, { action: 'ingest', students: [{ student_id: 'sA', items: itemsA, recap_date: TODAY, last_entry_read: '2026-10-01' }] });
  const a2 = r.json.summary.students[0];
  check('repetir a mesma entrega: nada novo, nenhum cartão, recap não é refeito', a2.new_items === 0 && a2.cards_created === 0 && !a2.recap_created && JSON.stringify(d.items) === before && d.recaps.length === 1, JSON.stringify(a2));
  check('última entrada lida nunca volta para trás', d.students[0].last_entry_read === '2026-10-13');

  // --- aluno sem conta: aprovado sem cartão
  r = await call(agent, { action: 'ingest', students: [{ student_id: 'sB', items: [{ type: 'vocabulario', q: 'traffic', a: 'o trânsito' }] }] });
  const b = r.json.summary.students[0];
  check('aluno sem conta: item entra aprovado e NÃO gera cartão', b.new_items === 1 && b.cards_created === 0 && d.items.find(i => i.question === 'traffic').status === 'aprovado' && !d.items.find(i => i.question === 'traffic').teacher_flashcard_id);

  // --- fronteiras
  r = await call(agent, { action: 'ingest', students: [{ student_id: 'sC', items: [{ type: 'vocabulario', q: 'x', a: 'y' }] }, { student_id: 'nao-existe', items: [] }] });
  check('aluno que ainda é do artifact (agent_managed=false) e aluno inexistente são rejeitados', r.json.summary.rejected.length === 2 && r.json.summary.students.length === 0 && !d.items.some(i => i.bank_student_id === 'sC'));
  check('payload sem lista de alunos é recusado; lista enorme também', (await call(agent, { action: 'ingest' })).status === 400 && (await call(agent, { action: 'ingest', students: new Array(81).fill({}) })).status === 413);
  d.settings.auto_generate = false;
  r = await call(agent, { action: 'ingest', students: [{ student_id: 'sA', items: [{ type: 'vocabulario', q: 'the wall', a: 'le mur' }] }] });
  check('geração automática desligada: item pendente não vira cartão', r.json.summary.students[0].cards_created === 0 || d.items.find(i => i.question === 'the wall').status === 'aprovado', JSON.stringify(r.json.summary.students[0]));
  check('chave determinística: mesma entrada, mesma chave', itemKey({ type: 'Verbo', q: 'Ir ', a: 'Aller' }) === itemKey({ type: 'verbo', q: 'ir', a: 'aller' }));

  // --- cadastrar aluno novo
  r = await call(agent, { action: 'register_student', name: 'Dora', language: 'portugues', reference: 'en', agenda_names: ['Dora S.'], notebook_id: 'nbD' });
  check('cadastrar aluno novo: nasce gerenciado, sem vínculo, com agenda', r.json.created && d.students.find(s => s.name === 'Dora').agent_managed === true && d.students.find(s => s.name === 'Dora').linked_student_id === undefined);
  r = await call(agent, { action: 'register_student', name: 'dora', language: 'portugues' });
  check('cadastrar de novo o mesmo aluno não duplica', r.json.created === false && d.students.filter(s => /dora/i.test(s.name)).length === 1);
  check('cadastro com idioma inválido é recusado', (await call(agent, { action: 'register_student', name: 'X', language: 'klingon' })).status === 400);
  summary('Banco de Revisão: rotina automática (core)');
})().catch(e => { console.error(e); process.exit(1); });
