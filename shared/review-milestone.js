// Fase 5 da trilha (06/10/2026): marco de "Revisão" do módulo. PURO -- sem DOM,
// sem STATE, sem rede. A sessão em si continua sendo a Revisão EXISTENTE
// (fr/app.js usa renderReviewView); este módulo só decide QUAIS cartões entram
// e POR QUÊ. Decisões da professora: opcional (nunca bloqueia), 1 sessão,
// teto de 20, "sessão concluída" basta (sem nota mínima), vale para convidado,
// unidade sem cartões (gramática) simplesmente não contribui.
//
// Prioridade (necessidade, não ordem do currículo):
//   1. learning  -- cartões em aprendizagem/reaprendizagem (erros recentes)
//   2. due       -- já estudados e vencidos
//   3. weak      -- já estudados, não vencidos, menor estabilidade primeiro
//   4. fresh     -- nunca estudados (ex.: unidade pulada) só para completar
const MILESTONE_CAP = 20;

// Cartões do marco: pertencem a uma das unidades do módulo (unitId, nunca
// deckId) e já são elegíveis para a Revisão (isEligible = isCardLessonCompleted).
function milestonePool(cards, unitIds, isEligible){
  const set = unitIds instanceof Set ? unitIds : new Set(unitIds || []);
  return (cards || []).filter(c => c && c.unitId != null && set.has(c.unitId) && (!isEligible || isEligible(c)));
}

function milestoneTier(card, now){
  const state = card.state || 'new';
  if (state === 'learning' || state === 'relearning') return 'learning';
  if (state === 'review') return card.due <= now ? 'due' : 'weak';
  return card.reps > 0 ? 'learning' : 'fresh';
}

// Devolve { cards, reasons:{learning,due,weak,fresh}, available }.
// `available` = tamanho do pool (para "há N cartões neste módulo").
function selectMilestoneCards(pool, opts){
  const now = (opts && opts.now) || Date.now();
  const cap = (opts && opts.cap) || MILESTONE_CAP;
  const tiers = { learning: [], due: [], weak: [], fresh: [] };
  (pool || []).forEach(c => tiers[milestoneTier(c, now)].push(c));
  tiers.learning.sort((a, b) => ((b.lapses || 0) - (a.lapses || 0)) || ((a.due || 0) - (b.due || 0)));
  tiers.due.sort((a, b) => (a.due || 0) - (b.due || 0));
  tiers.weak.sort((a, b) => ((a.stability || 0) - (b.stability || 0)) || ((a.due || 0) - (b.due || 0)));
  const cards = [], reasons = { learning: 0, due: 0, weak: 0, fresh: 0 };
  for (const k of ['learning', 'due', 'weak', 'fresh']){
    for (const c of tiers[k]){
      if (cards.length >= cap) break;
      cards.push(c); reasons[k]++;
    }
  }
  return { cards, reasons, available: (pool || []).length };
}

// "12 itens: 7 com erros recentes, 5 vencendo hoje"
function milestoneReasonText(sel){
  const n = sel.cards.length;
  if (!n) return '';
  const parts = [];
  if (sel.reasons.learning) parts.push(`${sel.reasons.learning} com erros recentes`);
  if (sel.reasons.due) parts.push(`${sel.reasons.due} vencendo hoje`);
  if (sel.reasons.weak) parts.push(`${sel.reasons.weak} com memória mais fraca`);
  if (sel.reasons.fresh) parts.push(`${sel.reasons.fresh} ${sel.reasons.fresh === 1 ? 'novo' : 'novos'}`);
  return `${n} ${n === 1 ? 'item' : 'itens'}: ${parts.join(', ')}`;
}

// Estado do marco para a UI: 'empty' (nenhum cartão elegível), 'ready' (nunca
// feita) ou 'done' (já houve uma sessão concluída; reabrível). Nunca 'locked':
// o marco é opcional e nunca bloqueia nada.
function milestoneState(availableCount, record){
  if (!availableCount) return 'empty';
  return record && record.lastDate ? 'done' : 'ready';
}
