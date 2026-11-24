// Tela de conclusão ÚNICA (decisão da autora, 2026-11-10; vale para todos os sites). Visual em shared/conclusao.css
// (.lesson-complete + partes opcionais). Todo texto passado aqui é HTML confiável (vem de t()/chT() ou de escapeHTML).
//   conclusaoHTML({ icon, title, sub, stats: [{ label, value }], body, actions: [{ id, label, secondary }], cls, pop })
// - icon: emoji (✅ exercício, 🎉 revisão/sessão, 💪 quase lá, 🏆 recorde); sub: linha de apoio; stats: cartões de resultado (XP ganho, acertos, pontos);
// - body: corpo livre (listas de erros, recapitulação), alinhado à esquerda; actions: 1 ou 2 botões (secondary = botão claro);
// - cls: classe-marcador da tela (ex.: 'conj-session-result'), sem estilo próprio, para testes e para o toast.
function conclusaoHTML(o){
  o = o || {};
  const stats = (o.stats || []).filter(Boolean);
  const acts = (o.actions || []).filter(Boolean);
  return `<div class="lesson-complete conclusao${o.cls ? ' ' + o.cls : ''}" data-completion-screen>
    <div class="lesson-complete-icon${o.pop ? ' tier-pop' : ''}">${o.icon || '✅'}</div>
    <h2>${o.title || ''}</h2>
    ${o.sub ? `<p class="lesson-boundary-title">${o.sub}</p>` : ''}
    ${stats.length ? `<div class="lesson-complete-stats">${stats.map(s => `<div class="lc-stat"><div class="lc-stat-label">${s.label}</div><div class="lc-stat-value">${s.value}</div></div>`).join('')}</div>` : ''}
    ${o.body ? `<div class="conclusao-body">${o.body}</div>` : ''}
    ${acts.length ? `<div class="conclusao-actions${acts.length === 1 ? ' is-single' : ''}">${acts.map(a => `<button type="button" class="btn ${a.secondary ? 'btn-secondary' : 'btn-primary'}"${a.id ? ` id="${a.id}"` : ''}>${a.label}</button>`).join('')}</div>` : ''}
  </div>`;
}
