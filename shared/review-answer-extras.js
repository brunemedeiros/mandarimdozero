// Extras da Revisão para cartões da professora (Banco de Revisão):
//  - reviewObservationHTML(card): a "Observação" da professora, mostrada ao aluno DEPOIS de responder
//    (nunca antes: pode conter a resposta). Só cartões da professora (origin 'teacher') com texto.
//  - typedAnswerVerdict(typed, forms): 'ok' | 'quase' | 'errou' para "Digite a resposta"/Cloze do francês.
//    quase = só faltou acento, ou uma letra a mais/a menos em palavra de 5+ letras. Vira nota Difícil.
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

function typedAnswerVerdict(typed, forms){
  const list = (forms || []).filter(Boolean);
  const strict = _answerStrictForm(typed);
  if (!strict) return 'errou';
  if (list.some(f => _answerStrictForm(f) === strict)) return 'ok';
  const loose = _answerLooseForm(typed);
  if (list.some(f => _answerLooseForm(f) === loose)) return 'quase';
  if (list.some(f => { const lf = _answerLooseForm(f); return lf.length >= 5 && _oneEditAway(lf, loose); })) return 'quase';
  return 'errou';
}

// Cartão com duas formas ("allemand / allemande"): vale digitar uma só OU o texto inteiro (barra com ou sem espaço).
function typedAnswerVerdictForExpected(typed, expected){
  const forms = acceptedForms(expected);
  const whole = forms.length > 1 ? forms.concat(forms.join(' / ')) : forms;
  return typedAnswerVerdict(String(typed == null ? '' : typed).replace(/\s*\/\s*/g, ' / '), whole);
}

// Nota FSRS de uma resposta digitada: Errei 0, Difícil 1 (quase lá), Bom 2.
function typedAnswerGrade(verdict){
  return verdict === 'ok' ? 2 : verdict === 'quase' ? 1 : 0;
}

function reviewAlmostHTML(localState){
  return localState && localState.almost ? `<div class="review-almost">${escapeHTML(t('review.almost'))}</div>` : '';
}
