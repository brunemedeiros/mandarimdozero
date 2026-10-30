// Paridade fr x zh (2026-10-23, itens C2, C3 e C4 de docs/auditoria-paridade-fr-zh.md): o retorno de erro dos
// exercícios de lição que era só do fr virou código comum. Vale para todos os sites (fr, zh, pt e os próximos);
// o que muda por idioma vem de LANG_HOOKS (typedAttemptForm, trueFalseHintKeys).

// Alinhamento letra a letra (distância de edição + operações), para marcar as letras erradas.
// Era FamiliaLatina.alinharLetras (shared/core/familias/latina.js), mas não tem nada de latino: serve a qualquer idioma.
// Compara sem diferenciar maiúscula; ops: same (igual), sub (letra trocada), extra (letra a mais), missing (faltou).
function alinharLetras(a, b){
  const A = Array.from(a || ''), B = Array.from(b || '');
  const la = A.map(c => c.toLowerCase()), lb = B.map(c => c.toLowerCase());
  const n = A.length, m = B.length, d = [];
  for (let x0 = 0; x0 <= n; x0++) d.push(new Array(m + 1).fill(0));
  for (let x = 0; x <= n; x++) d[x][0] = x;
  for (let y = 0; y <= m; y++) d[0][y] = y;
  for (let x = 1; x <= n; x++) for (let y = 1; y <= m; y++)
    d[x][y] = Math.min(d[x - 1][y - 1] + (la[x - 1] === lb[y - 1] ? 0 : 1), d[x - 1][y] + 1, d[x][y - 1] + 1);
  const ops = [];
  let x = n, y = m;
  while (x > 0 || y > 0){
    if (x > 0 && y > 0 && d[x][y] === d[x - 1][y - 1] + (la[x - 1] === lb[y - 1] ? 0 : 1)){
      ops.push({ t: la[x - 1] === lb[y - 1] ? 'same' : 'sub', a: A[x - 1] }); x--; y--;
    } else if (x > 0 && d[x][y] === d[x - 1][y] + 1){
      ops.push({ t: 'extra', a: A[x - 1] }); x--;
    } else {
      ops.push({ t: 'missing' }); y--;
    }
  }
  return { ops: ops.reverse(), cost: d[n][m] };
}

// As operações do alinhamento em HTML: letra errada em vermelho (.conj-x), traço onde faltou letra (.conj-gap).
function alinhamentoHTML(ops){
  return ops.map(o =>
    o.t === 'same' ? escapeHTML(o.a)
    : o.t === 'missing' ? '<span class="conj-gap"></span>'
    : `<span class="conj-x">${escapeHTML(o.a)}</span>`).join('');
}

// "Sua resposta" dos exercícios de digitar da trilha: o que a pessoa digitou, com as letras erradas em
// vermelho e um traço onde faltou letra (mesmo alinhamento da Conjugação). Cartão com duas formas
// ("allemand / allemande"): compara com a forma mais parecida, ou com o texto inteiro se ela digitou a barra.
// LANG_HOOKS.typedAttemptForm (opcional): a forma em que o idioma COMPARA a resposta para dar o veredito, aplicada
// ao que foi digitado e a cada forma certa, para a marcação concordar com o veredito (zh: pinyin numerado convertido
// para marca de tom, minúsculas, sem pontuação). Sem o gancho (fr), compara o texto como foi digitado.
// Português de Portugal em resposta digitada (regra da dona, 2026-10-29; vale para TODO exercício com resposta em português).
// Só age quando o site declara LANG_HOOKS.typedAnswerLang = 'pt-BR' (o site de português); fr e zh: devolve null sem olhar
// a resposta. aceita(texto) -> boolean = o veredito do próprio exercício ("este texto seria aceito?"). Devolve null ou
// { verdict: 'almost', pairs: [{ pt, br }], text } (shared/core/familias/portugues-variantes.js).
function typedPtBrAdjust(typed, aceita){
  if (typeof LANG_HOOKS === 'undefined' || !LANG_HOOKS || LANG_HOOKS.typedAnswerLang !== 'pt-BR') return null;
  const pv = typeof PortuguesVariantes !== 'undefined' ? PortuguesVariantes : (typeof globalThis !== 'undefined' ? globalThis.PortuguesVariantes : null);
  if (!pv) return null;
  return pv.ptBrVerdictAdjust(typed, null, { aceita: (texto) => !!aceita(texto) });
}
// Devolutiva do "Quase" de Portugal: "Quase! Essa forma é de Portugal. No Brasil se diz: <strong>estou comendo</strong> (em vez de "estou a comer")."
function typedPtBrNoteHTML(adj){
  if (!adj || typeof PortuguesVariantes === 'undefined') return '';
  return PortuguesVariantes.ptBrFeedbackHTML(adj.pairs, { t, esc: escapeHTML, lead: t('answer.ptpt.almost') });
}

function typedAttemptHTML(typed, expected){
  const form = (typeof LANG_HOOKS !== 'undefined' && LANG_HOOKS.typedAttemptForm) || (s => s);
  const given = form(String(typed == null ? '' : typed).replace(/\s*\/\s*/g, ' / ').trim());
  if (!given) return '';
  const forms = acceptedForms(expected).map(form);
  const alvos = (given.includes('/') && forms.length > 1) ? [forms.join(' / ')] : (forms.length ? forms : [form(String(expected || ''))]);
  let best = null;
  alvos.forEach(a => { const r = alinharLetras(given, a); if (!best || r.cost < best.cost) best = r; });
  return `<div class="typed-attempt">${alinhamentoHTML(best.ops)}</div>`;
}

// Dica do Verdadeiro ou Falso: cita a explicação (conceito) que a aluna já viu nesta lição; senão, a dica geral.
// LANG_HOOKS.trueFalseHintKeys = { seen, generic } (chaves de texto de cada site; o texto é o mesmo).
function trueFalseHint(unit){
  const keys = LANG_HOOKS.trueFalseHintKeys;
  const shown = unit && unit.concepts && unit.concepts.find(c => STEP_STATE.conceptsShown.has(c.id));
  return shown
    ? t(keys.seen, { title: shown.blocks[0].title })
    : t(keys.generic);
}

// Ordenar frase: estado de cada bloco da resposta montada. 'ok' = no lugar certo; 'near' = pertence à frase, mas
// está em outro lugar; 'bad' = não pertence à frase (isca).
function reorderBlockStatus(block, pos, correctOrder){
  return block === correctOrder[pos] ? 'ok' : (correctOrder.includes(block) ? 'near' : 'bad');
}

// Ordenar frase, ao responder: acerto = tudo verde; erro = só os blocos fora do lugar ficam vermelhos, os que já
// estavam na posição certa ficam verdes (dica de onde errou).
function markReorderSlots(slotsEl, chosenSequence, shuffledBlocks, correctOrder, isCorrect){
  slotsEl.querySelectorAll('.reorder-slot').forEach((slot, pos) => {
    const here = shuffledBlocks[chosenSequence[pos]] === correctOrder[pos];
    slot.classList.add(isCorrect || here ? 'correct' : 'incorrect');
  });
}
