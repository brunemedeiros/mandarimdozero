// Extras da Revisão para cartões da professora (Banco de Revisão):
//  - reviewObservationHTML(card): a "Observação" da professora, mostrada ao aluno DEPOIS de responder
//    (nunca antes: pode conter a resposta). Só cartões da professora (origin 'teacher') com texto.
//  - typedAnswerVerdict(typed, forms): 'ok' | 'quase' | 'errou' para "Digite a resposta"/Cloze do francês.
//    quase = só faltou acento, "oe" no lugar de "œ", ou uma letra a mais/a menos em palavra de 5+ letras. Vira nota Difícil.
// Depende de (globais da página): escapeHTML, t. Os dois são puros fora isso (testados em
// tests/banco-revisao/test_answer_extras.js).

function reviewObservationHTML(card){
  if (!card || card.origin !== 'teacher') return '';
  const text = String(card.teacherNote == null ? '' : card.teacherNote).trim();
  if (!text) return '';
  return `<div class="review-observation"><strong>${escapeHTML(t('review.observation'))}</strong><span>${escapeHTML(text)}</span></div>`;
}

function _answerStrictForm(s){
  return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/[.,!?;:'"’]/g, '').replace(/\s+/g, ' ').trim();
}
function _answerLooseForm(s){
  return _answerStrictForm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function _oneEditAway(a, b){
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// opts.semAproximar: só igual / sem acento / ligadura (sem a tolerância de uma letra errada) -- usado no texto
// inteiro de um cartão com duas formas, para "allemand / allemand" não virar "quase".
function typedAnswerVerdict(typed, forms, opts){
  const list = (forms || []).filter(Boolean);
  const strict = _answerStrictForm(typed);
  if (!strict) return 'errou';
  if (list.some(f => _answerStrictForm(f) === strict)) return 'ok';
  const loose = _answerLooseForm(typed);
  if (list.some(f => _answerLooseForm(f) === loose)) return 'quase';
  // "soeur" por "sœur", "coeur" por "cœur": ligadura escrita com duas letras = quase (mesma regra da trilha).
  const lig = _answerLigatureFold(loose);
  if (list.some(f => _answerLigatureFold(_answerLooseForm(f)) === lig)) return 'quase';
  if (opts && opts.semAproximar) return 'errou';
  if (list.some(f => { const lf = _answerLooseForm(f); return lf.length >= 5 && _oneEditAway(lf, loose); })) return 'quase';
  return 'errou';
}
function _answerLigatureFold(s){
  return s.replace(/œ/g, 'oe').replace(/æ/g, 'ae');
}

// Cartão com duas formas ("allemand / allemande"): vale uma forma só OU o texto inteiro (barra com ou sem espaço,
// ou vírgula no lugar da barra), na ordem do cartão. A tolerância de uma letra errada vale só para cada forma
// sozinha, nunca para o texto inteiro.
function typedAnswerVerdictForExpected(typed, expected){
  const forms = acceptedForms(expected);
  const raw = String(typed == null ? '' : typed);
  const variants = [raw, raw.replace(/\s*\/\s*/g, ' / ')];
  if (forms.length > 1 && raw.indexOf(',') !== -1) variants.push(raw.replace(/,/g, ' / ').replace(/\s*\/\s*/g, ' / '));
  const rank = { ok: 2, quase: 1, errou: 0 };
  let best = 'errou';
  variants.forEach(v => {
    let r = typedAnswerVerdict(v, forms);
    if (forms.length > 1){
      const w = typedAnswerVerdict(v, [forms.join(' / '), String(expected).trim()], { semAproximar: true });
      if (rank[w] > rank[r]) r = w;
    }
    if (rank[r] > rank[best]) best = r;
  });
  return best;
}

// Nota FSRS de uma resposta digitada: Errei 0, Difícil 1 (quase lá), Bom 2.
function typedAnswerGrade(verdict){
  return verdict === 'ok' ? 2 : verdict === 'quase' ? 1 : 0;
}

// Por que foi "quase": 'accent' (só acento a mais ou a menos) ou 'letter' (uma letra a mais, a menos ou trocada).
function typedAlmostKind(typed, forms){
  const list = (forms || []).filter(Boolean);
  const cands = list.concat(list.length > 1 ? [list.join(' / ')] : []).map(f => _answerLigatureFold(_answerLooseForm(f)));
  const raw = String(typed == null ? '' : typed);
  const variants = [raw, raw.replace(/\s*\/\s*/g, ' / '), raw.replace(/,/g, ' / ').replace(/\s*\/\s*/g, ' / ')];
  const sameLoose = variants.some(v => cands.indexOf(_answerLigatureFold(_answerLooseForm(v))) !== -1);
  return sameLoose ? 'accent' : 'letter';
}

function reviewAlmostHTML(localState){
  if (!localState || !localState.almost) return '';
  const key = localState.almostKind === 'accent' ? 'review.almost.accent' : localState.almostKind === 'letter' ? 'review.almost.letter' : 'review.almost';
  return `<div class="review-almost">${escapeHTML(t(key))}</div>`;
}

// Resultado de uma resposta digitada (Digite a resposta e Completar): errou = Errei e quase = Difícil são automáticos
// (botão Continuar); acertou em cheio = a pessoa escolhe Bom ou Fácil, com o intervalo de cada um, nas cores da Revisão.
function typedResultActionsHTML(card, localState){
  if (localState && localState.wasCorrect && !localState.almost){
    const now = Date.now();
    return `<div class="grade-buttons typed-grade">${[[2, 'good'], [3, 'easy']].map(([g, k]) =>
      `<button class="grade-btn grade-${k}" data-grade="${g}">${escapeHTML(t('review.grade.' + k))}<small>${escapeHTML(formatReviewInterval(previewNextIntervalDays(card, g, now)))}</small></button>`).join('')}</div>`;
  }
  return `<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${escapeHTML(t('common.continue'))}</button>`;
}
// autoGrade = nota do Continuar (Errei ou Difícil). Bom/Fácil vêm do botão clicado.
function wireTypedResultActions(mountEl, callbacks, localState, autoGrade){
  mountEl.querySelectorAll('.typed-grade .grade-btn').forEach(b => b.addEventListener('click', () => callbacks.onAnswered(localState.wasCorrect, Number(b.dataset.grade))));
  const cont = mountEl.querySelector('#cloze-continue-btn');
  if (cont) cont.addEventListener('click', () => callbacks.onAnswered(localState.wasCorrect, autoGrade));
}
