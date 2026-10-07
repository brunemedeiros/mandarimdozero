// Fase 6 da trilha (06/10/2026): prova do Ponto de verificação (módulo e Teste de
// Nível), PURA. Antes era só "Como se diz X em francês?" com palavra isolada; a
// decisão da professora é medir também frases e compreensão auditiva. Sem DOM,
// sem STATE: quem chama injeta shuffle() e canSpeak().
//
// Tipos de item:
//   word    -- palavra isolada a partir do sentido (já existia)
//   phrase  -- frase inteira a partir do sentido (produção em frase)
//   listen  -- ouvir a frase e escrever o que ouviu (compreensão auditiva)
//   grammar -- exercício de gramática da unidade (já existia)
const CHECKPOINT_EXAM_SIZE = 12;
const CHECKPOINT_EXAM_QUOTAS = { listen: 3, phrase: 3, grammar: 2 }; // o resto é palavra

// i18n: usa t() quando existe (navegador); sem ele (testes em Node) cai no português.
function _ckT(key, params, fallback){
  if (typeof t === 'function'){
    const v = t(key, params);
    if (v && v !== key) return v;
  }
  return fallback.replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? params[k] : m));
}

function buildCheckpointExamQueue(units, opts){
  opts = opts || {};
  const shuffleFn = opts.shuffle || (a => a.slice());
  const canSpeak = opts.canSpeak || (() => false);
  const total = opts.total || CHECKPOINT_EXAM_SIZE;
  const pools = { word: [], phrase: [], listen: [], grammar: [] };
  const seenAnswers = new Set();
  const take = (kind, item) => { const k = kind + '|' + item.answer; if (seenAnswers.has(k)) return; seenAnswers.add(k); pools[kind].push(item); };
  (units || []).forEach(u => {
    if (u.type === 'grammar'){
      ((u.grammar && u.grammar.exercises) || []).forEach(ex => take('grammar', { kind: 'grammar', prompt: ex.prompt, hint: ex.hint || null, answer: ex.answer }));
      return;
    }
    // Forma dupla ("français / française") não dá para cobrar por digitação exata.
    (u.vocab || []).filter(v => v.f && !v.f.includes(' / ')).forEach(v =>
      take('word', { kind: 'word', prompt: _ckT('fr.checkpoint.exam.word', { w: v.t }, 'Como se diz "{w}" em francês?'), hint: null, answer: v.f }));
    (u.phrases || []).filter(p => p.f && p.t && !p.f.includes(' / ')).forEach(p => {
      take('phrase', { kind: 'phrase', prompt: _ckT('fr.checkpoint.exam.phrase', { p: p.t }, 'Escreva em francês: "{p}"'), hint: null, answer: p.f });
      if (canSpeak(p.f)) take('listen', { kind: 'listen', prompt: _ckT('fr.checkpoint.exam.listen', null, 'Ouça e escreva o que você ouviu'), hint: null, answer: p.f, audioText: p.f });
    });
  });
  Object.keys(pools).forEach(k => { pools[k] = shuffleFn(pools[k]); });
  const want = { listen: CHECKPOINT_EXAM_QUOTAS.listen, phrase: CHECKPOINT_EXAM_QUOTAS.phrase, grammar: pools.grammar.length ? CHECKPOINT_EXAM_QUOTAS.grammar : 0 };
  want.word = Math.max(0, total - want.listen - want.phrase - want.grammar);
  const picked = [];
  const used = new Set();
  ['word', 'phrase', 'listen', 'grammar'].forEach(k => pools[k].slice(0, want[k]).forEach(it => { picked.push(it); used.add(it); }));
  // Faltou item em alguma faixa (módulo sem frases, sem áudio...): completa com o que sobrou.
  if (picked.length < total){
    const rest = shuffleFn(['word', 'phrase', 'listen', 'grammar'].flatMap(k => pools[k]).filter(it => !used.has(it)));
    rest.slice(0, total - picked.length).forEach(it => picked.push(it));
  }
  return shuffleFn(picked).slice(0, total);
}

// Pontuação de uma resposta digitada. Devolve { score: 0|0.5|1, status: 'ok'|'almost'|'wrong' }.
// word/grammar: exato = 1; só acento/maiúscula diferente = 0,5 (regra que já existia).
// phrase/listen: pontuação e maiúscula não descontam; acento faltando = 0,5.
function _ckStripAccents(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function _ckPlain(s){
  return s.replace(/[’‘`´]/g, "'").toLowerCase().replace(/[.,;:!?¿¡"«»()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim();
}
function scoreCheckpointAnswer(given, expected, kind){
  const g = String(given == null ? '' : given), e = String(expected == null ? '' : expected);
  if (g.trim() === e.trim()) return { score: 1, status: 'ok' };
  if (kind === 'phrase' || kind === 'listen'){
    const pg = _ckPlain(g), pe = _ckPlain(e);
    if (pg && pg === pe) return { score: 1, status: 'ok' };
    if (pg && _ckStripAccents(pg) === _ckStripAccents(pe)) return { score: 0.5, status: 'almost' };
    return { score: 0, status: 'wrong' };
  }
  if (_ckStripAccents(g).toLowerCase().trim() === _ckStripAccents(e).toLowerCase().trim()) return { score: 0.5, status: 'almost' };
  return { score: 0, status: 'wrong' };
}
