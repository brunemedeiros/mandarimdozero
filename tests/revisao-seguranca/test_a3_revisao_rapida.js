// A3: depois que a aluna sai da Revisão rápida, nenhum cartão recebe nota (o setTimeout de 700 ms e o cronômetro
// morrem com a sessão). Falha na origin/main (cartões passam a "learning" com lapso), passa na branch. fr e zh.
// Saídas testadas: Voltar aos modos + outra aba; só outra aba; voltar para a própria Revisão (o Voltar do navegador
// passa por switchTab('review')). Controle: sem sair, a sessão continua normal (próxima pergunta aparece).
const { withPage, realErrors, close, check, summary } = require('./harness');

async function run(page, exit){
  return page.evaluate(async (exit) => {
    const lang = APP_KEY === 'mandarim' ? 'zh' : 'fr';
    for (let i = 0; i < 8; i++){
      addSelfFlashcardToState({ id: 800 + i, owner_id: 'u1', language_app_key: APP_KEY, status: 'active', revision: 0, note: null, tags: [], deck_id: null,
        fields: [{ id: 'a', lang, role: null, content: { value: 'mot' + i }, audio: null, image: null, pinyinFieldId: null },
                 { id: 'b', lang: 'pt-BR', role: null, content: { value: 'palavra' + i }, audio: null, image: null, pinyinFieldId: null }],
        card_generation_mode: 'normal' });
    }
    switchTab('review'); openReviewSession('speed');
    await new Promise(r => setTimeout(r, 300));
    const ids = SPEED_STATE.queue.map(c => c.id);
    const snap = () => ids.map(id => { const c = STATE.cards.find(x => x.id === id); return { id, state: c.state, lapses: c.fsrsLapses || 0, reps: c.fsrsReps || 0 }; });
    const daily0 = JSON.stringify(STATE.daily && STATE.daily.speedReviewSessions);
    const btn = [...document.querySelectorAll('.speed-option')].find(b => b.textContent === cardAnswerText(SPEED_STATE.queue[0]));
    btn.click();                       // acerta o 1o
    const before = snap();
    const index0 = SPEED_STATE.index;
    if (exit === 'back+tab'){ backToReviewModeSelect(); switchTab('path'); }
    else if (exit === 'tab'){ switchTab('path'); }
    else if (exit === 'review-tab'){ switchTab('review'); }
    await new Promise(r => setTimeout(r, 700 + SPEED_TIME_LIMIT + 1500));
    const after = snap();
    const changed = after.filter((a, i) => JSON.stringify(a) !== JSON.stringify(before[i])).map(a => a.id);
    return { exit, n: ids.length, changed, index0, index: SPEED_STATE.index, hearts: SPEED_STATE.hearts, active: SPEED_STATE.active,
      dailyChanged: JSON.stringify(STATE.daily && STATE.daily.speedReviewSessions) !== daily0,
      speedVisible: document.getElementById('speed-review-content').offsetParent !== null };
  }, exit);
}

(async () => {
  for (const site of ['fr', 'zh']){
    console.log(`\n[${site}]`);
    for (const exit of ['back+tab', 'tab', 'review-tab']){
      const r = await withPage(site, async (page, errs) => { const o = await run(page, exit); o.errors = realErrors(errs); return o; });
      check(`${site} (${exit}): nenhum cartão muda depois de sair`, r.n >= 4 && r.changed.length === 0, r);
      check(`${site} (${exit}): sessão encerrada e sem pergunta nova`, r.active === false && r.index === r.index0 && r.hearts === 3, r);
      check(`${site} (${exit}): estudo do dia não conta sessão que não houve`, !r.dailyChanged, r);
      check(`${site} (${exit}): sem erro de página`, r.errors.length === 0, r.errors);
    }
    // Controle: sem sair, o tempo esgota na 2a pergunta e ela leva Errei (comportamento normal mantido).
    const c = await withPage(site, async (page) => run(page, 'stay'));
    check(`${site} (controle, sem sair): a sessão segue e o tempo esgotado ainda conta`, c.active === true && c.index === c.index0 + 1 && c.hearts === 2 && c.changed.length === 1 && c.speedVisible, c);
  }
  await close();
  summary('A3 Revisão rápida');
})().catch(async e => { console.error(e); await close(); process.exit(1); });
