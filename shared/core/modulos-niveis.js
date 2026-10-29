// Paridade B2 (docs/auditoria-paridade-fr-zh.md, etapa 4 do pedido da dona de 2026-10-23): o SISTEMA DE MÓDULOS E
// NÍVEIS, que antes morava só no fr/app.js, em código comum a todos os sites (fr, zh, pt e os próximos).
// Registro: docs/historico/26-paridade-b2-modulos-niveis.md.
//
// O que tem aqui: helpers de nível e módulo, seletor de nível, linhas da trilha (rótulo do módulo, Revisão do módulo,
// Ponto de verificação, cartão do Teste de Nível), modo Mapa por módulos, Ponto de verificação do módulo (e o pulo das
// unidades), Revisão do módulo, Teste de Nível e a tela de módulo/nível concluído (com as estrelas).
// A prova (fila e nota) é a de shared/checkpoint-exam.js e a seleção da Revisão do módulo é a de
// shared/review-milestone.js, já comuns.
//
// Funciona SEM MODULES/LEVEL_TESTS (o zh hoje): trailModules()/trailLevelTests() devolvem [] e nada aparece.
// O que muda por idioma vem de LANG_HOOKS (<site>/lang-hooks.js):
//   canSpeak(texto), speak(texto, botão, autoplay)       voz do idioma (já existiam)
//   checkpointExam (obrigatório com módulos)              como montar a prova: keys (chaves do enunciado) e, para outra
//                                                         escrita (zh), word/phrase; o fr declara só as keys
//   checkpointScore(digitado, item) (opcional)            nota de uma resposta; sem o gancho, scoreCheckpointAnswer
//   grammarInputExtraHTML / wireGrammarInputExtra         teclado extra no campo (zh: tons do pinyin; já existiam)
//   levelTestKeys (obrigatório com Teste de Nível)        chaves do texto do Teste de Nível que citam o idioma
//   examScreenOpened() (opcional)                         a prova abriu na tela da lição (zh: esconde o "Manual da unidade")
// Grátis x Premium: igual ao fr de antes (pular unidades pelo Ponto de verificação/Teste de Nível é Premium só quando
// TRAIL_SKIP_PAYWALL_ENABLED for ligado; hoje está desligado e todo mundo pode pular; o resto é grátis).

// Módulos e testes de nível do curso (content.js). Sites sem módulos (zh hoje) não declaram as constantes.
function trailModules(){
  return (typeof MODULES !== 'undefined' && Array.isArray(MODULES)) ? MODULES : [];
}
function trailLevelTests(){
  return (typeof LEVEL_TESTS !== 'undefined' && Array.isArray(LEVEL_TESTS)) ? LEVEL_TESTS : [];
}
function trailHasModules(){
  return trailModules().length > 0;
}

// Cada nível é acessível livremente (o aluno escolhe o nível quando quiser);
// dentro de um nível, o desbloqueio continua sequencial unidade por unidade —
// então só a PRIMEIRA unidade de cada nível já nasce destravada.
function isFirstOfLevel(u){
  return UNITS.find(x => x.level === u.level) === u;
}

// Progresso do Ponto de verificação, da Revisão do módulo e do Teste de Nível no STATE (um registro por módulo/teste).
// O fr já declara os três objetos no STATE; site que não declara (zh) ganha os três aqui.
function initModuleProgressState(){
  if (!STATE.checkpointProgress) STATE.checkpointProgress = {};
  if (!STATE.reviewMilestones) STATE.reviewMilestones = {};
  if (!STATE.levelTestProgress) STATE.levelTestProgress = {};
  trailModules().forEach((m) => {
    STATE.checkpointProgress[m.id] = { completed: false, bestScore: 0 };
  });
  trailLevelTests().forEach((t) => {
    STATE.levelTestProgress[t.id] = { completed: false, bestScore: 0 };
  });
}

// Salvar/carregar o progresso de módulos para sites que ainda não têm esses campos no serializeState (zh): sem
// módulos não grava nada (o save fica igual ao de antes). O fr grava os três campos direto no serializeState.
function moduleSaveFields(){
  if (!trailHasModules() && !trailLevelTests().length) return {};
  return {
    checkpointProgress: STATE.checkpointProgress,
    reviewMilestones: STATE.reviewMilestones,
    levelTestProgress: STATE.levelTestProgress,
  };
}
function moduleLoadApply(data, checkpointProgress){
  if (!data) return;
  if (data.checkpointProgress) Object.assign(STATE.checkpointProgress, checkpointProgress || data.checkpointProgress);
  if (data.reviewMilestones) Object.assign(STATE.reviewMilestones, data.reviewMilestones);
  if (data.levelTestProgress) Object.assign(STATE.levelTestProgress, data.levelTestProgress);
}


// Unidades de um nível, na ordem — usado tanto pro desbloqueio sequencial
// quanto pra numeração relativa exibida ("Unidade 2 de 16" dentro do nível).
function unitsOfLevel(level){
  return UNITS.filter(u => u.level === level);
}

// Unidades de gramática têm sua própria numeração, separada da sequência
// comunicacional — "Unidade 4" (comunicativa) e "Unidade de gramática 1" não
// competem pelo mesmo número. Retorna a posição de "u" dentro do seu próprio
// tipo (comunicativa ou gramática) e o total desse tipo no nível.
function unitOrdinalInfo(u, levelUnits){
  const isGrammar = u.type === 'grammar';
  const sameType = levelUnits.filter(x => (x.type === 'grammar') === isGrammar);
  const num = sameType.findIndex(x => x.id === u.id) + 1;
  return { num, total: sameType.length };
}

// ---------- Seletor de nível (toggle + modal, estilo Busuu) ----------
// Só existe na tela de quem tem o seletor (#path-level-title, #level-modal: hoje o fr).
function renderLevelSelect(){
  const titleEl = document.getElementById('path-level-title');
  if (!titleEl) return;
  const currentLevelInfo = LEVELS.find(l => l.id === STATE.currentLevel);
  // "Tratamento de honra" (Opção D): nível concluído reaproveita o mesmo
  // selo de check, só que dourado -- é a camada mais rara, não precisa de
  // um símbolo novo, só de um sinal de que é excepcional.
  const doneBadge = levelCompleted(STATE.currentLevel)
    ? ` <span style="color:var(--imperial-gold);">✓</span>` : '';
  titleEl.innerHTML =
    `${currentLevelInfo.label} <span style="color:var(--ink-soft); font-weight:600; font-size:14px;">(${currentLevelInfo.id})</span>${doneBadge}`;
}

function renderLevelModalList(){
  const wrap = document.getElementById('level-modal-list');
  if (!wrap) return;
  wrap.innerHTML = LEVELS.map(lvl => {
    const moduleCount = modulesOfLevel(lvl.id).length;
    const sub = moduleCount ? tp('trail.moduleCount', moduleCount) : t('trail.comingSoon');
    // Se existe um teste de nível que credita ESTE nível ao ser aprovado
    // (ex: o Teste de Nível A1 libera o A2), mostra um chip de atalho embutido
    // na própria linha do nível, pra quem quer pular direto sem passar pelo
    // nível anterior.
    const skipTest = trailLevelTests().find(t => t.nextLevel === lvl.id);
    const skipHTML = skipTest ? `
      <button class="level-skip-chip" data-test="${skipTest.id}" title="${skipTest.title}">${t('trail.skipChip')}</button>
    ` : '';
    return `
      <div class="level-list-row">
        <button class="level-list-item ${STATE.currentLevel === lvl.id ? 'active' : ''}" data-level="${lvl.id}">
          <div class="level-list-badge">${lvl.id}</div>
          <div>
            <div class="level-list-title">${lvl.label}</div>
            <div class="level-list-sub">${sub}</div>
          </div>
        </button>
        ${skipHTML}
      </div>
    `;
  }).join('');
  wrap.querySelectorAll('.level-list-item').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.currentLevel = btn.dataset.level;
      STATE.levelUserPicked = true;
      document.getElementById('level-modal').style.display = 'none';
      renderUnitsGrid();
    });
  });
  wrap.querySelectorAll('.level-skip-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('level-modal').style.display = 'none';
      openLevelTest(btn.dataset.test);
    });
  });
}

// Liga o botão do seletor e a janela de níveis (chamado uma vez pelo app.js do site que tem o seletor).
function wireLevelSelector(){
  const toggle = document.getElementById('level-toggle-btn');
  const modal = document.getElementById('level-modal');
  if (!toggle || !modal) return;
  toggle.addEventListener('click', () => {
    renderLevelModalList();
    document.getElementById('level-modal').style.display = 'flex';
  });
  document.getElementById('level-modal-close').addEventListener('click', () => {
    document.getElementById('level-modal').style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'level-modal'){
      document.getElementById('level-modal').style.display = 'none';
    }
  });
}

// ---------- Módulos (estilo Busuu): agrupam unidades em blocos menores ----------
function modulesOfLevel(level){
  return trailModules().filter(m => m.level === level);
}
function moduleUnlocked(module){
  return !!STATE.unitProgress[module.unitIds[0]]?.unlocked;
}

function moduleProgressPct(module){
  const sum = module.unitIds.reduce((acc, id) => acc + unitProgressFraction(UNITS.find(u => u.id === id)), 0);
  return Math.round((sum / module.unitIds.length) * 100);
}
function moduleCompleted(module){
  return module.unitIds.every(id => STATE.unitProgress[id]?.completed);
}
function levelCompleted(levelId){
  const mods = modulesOfLevel(levelId);
  return mods.length > 0 && mods.every(moduleCompleted);
}

function levelTestsOfLevel(level){
  return trailLevelTests().filter(t => t.level === level);
}

// Módulo de uma unidade (ou null): o modo Mapa e o painel da unidade usam para oferecer o pulo.
function moduleOfUnit(unitId){
  return trailModules().find(m => m.unitIds.includes(unitId)) || null;
}


// ---------- Fase 7 da trilha: modo Mapa ----------
// DOM/seleção/painel em shared/trail-map.js; aqui só o modelo (estados reais) e o que cada botão faz.
// moduleId: módulo da unidade (null em site sem módulos: aí nunca oferece o pulo).
function mapUnitDescribe(u, moduleId){
  const st = unitBlockState(u);
  const hasLessons = isLessonUnit(u) && u.lessons.length > 0;
  const lines = [];
  // Unidade pulada (Etapa 6): o painel diz só "Pulada" (status), sem "N de N lições concluídas".
  if (hasLessons && st !== 'skipped'){
    const done = st === 'done' ? u.lessons.length : currentLessonIdx(u.id);
    lines.push(tp('trail.lessonsCompleted', u.lessons.length === 1 ? 1 : 2, { done, total: u.lessons.length }));
  }
  const { dueForReview } = unitCardCounts(u.id);
  if (dueForReview > 0) lines.push(t('trail.map.unit.toReview', { n: dueForReview }));
  const actions = [];
  if (st === 'locked'){
    lines.push(t('trail.map.unit.lockedHint'));
    const modOpen = moduleId && moduleUnlocked(trailModules().find(m => m.id === moduleId));
    if (modOpen && trailSkipAllowed()) actions.push({ label: t('trail.map.unit.skipCta'), primary: false, onClick: () => openCheckpoint(moduleId) });
    else if (modOpen) lines.push(t('trail.checkpoint.skipLocked'));
  } else if (st === 'done' || st === 'skipped'){
    actions.push({ label: t('trail.map.unit.openAgain'), primary: false, onClick: () => openUnitDetail(u.id) });
  } else {
    const started = !!(STATE.unitProgress[u.id] && STATE.unitProgress[u.id].started);
    actions.push({ label: started ? t('common.continue') : t('common.start'), primary: true, onClick: () => openUnitDetail(u.id) });
  }
  return { eyebrow: unitTypeOf(u) === 'grammar' ? t('trail.eyebrow.grammar') : t('trail.map.unit.eyebrow'), title: u.title, status: TRAIL_MAP_STATE_LABEL[st], goal: u.goal || '', lines, actions };
}

// Mapa da trilha por módulos (uma seção por módulo: unidades, Revisão do módulo e Ponto de verificação).
// opts (opcional, para o site acrescentar marcos próprios logo depois de uma unidade, ex.: histórias do zh):
//   afterUnitNodes(u) -> [nós]      describeExtra(key) -> descrição ou null (para as chaves desses nós)
function renderModulesTrailMap(container, levelModules, opts){
  opts = opts || {};
  const sections = levelModules.map((module, mIdx) => {
    const nodes = [];
    module.unitIds.forEach(id => {
      const u = UNITS.find(x => x.id === id);
      const st = unitBlockState(u);
      nodes.push({ key: 'u:' + id, kind: 'unit', icon: UNIT_ICONS[id] || '📖', label: u.title, state: st, current: st === 'current',
        aria: `${u.title}, ${TRAIL_MAP_STATE_LABEL[st]}${unitTypeOf(u) === 'grammar' ? t('trail.map.aria.grammarSuffix') : ''}` });
      if (opts.afterUnitNodes) (opts.afterUnitNodes(u) || []).forEach(n => nodes.push(n));
    });
    const sel = moduleReviewSelection(module);
    const rst = milestoneState(sel.available, STATE.reviewMilestones[module.id]);
    nodes.push({ key: 'r:' + module.id, kind: 'review', icon: '🔁', label: t('trail.moduleReview.chip'), state: !moduleUnlocked(module) ? 'locked' : (rst === 'empty' ? 'empty' : (rst === 'done' ? 'done' : 'available')),
      aria: t('trail.map.aria.review', { n: mIdx + 1 }) + (rst === 'empty' ? t('trail.map.aria.reviewEmptySuffix') : '') });
    const cp = STATE.checkpointProgress[module.id];
    // Etapa 6: quem não tem o recurso (pular unidades) vê o selo "⭐ Premium" em vez de "Disponível" (regra 7 dos selos:
    // selo sem botão; o cadeado só aparece na trilha em lista, que já tem o seu).
    const cpPremium = !cp.completed && moduleUnlocked(module) && !trailSkipAllowed();
    nodes.push({ key: 'c:' + module.id, kind: 'checkpoint', icon: '🏆', label: t('trail.map.checkpointShort'), state: cp.completed ? 'done' : (moduleUnlocked(module) ? 'available' : 'locked'),
      note: cpPremium ? '⭐ ' + t('trail.premiumBadge') : undefined, noteClass: cpPremium ? 'tm-note-premium' : undefined,
      aria: t('trail.map.aria.checkpoint', { n: mIdx + 1 }) + (cpPremium ? ', ' + t('trail.premiumBadge') : '') });
    return { title: t('trail.module.label', { n: mIdx + 1, title: module.title }), nodes };
  });
  const find = key => { const [k, id] = [key.slice(0, 1), key.slice(2)]; return { k, id }; };
  const describe = (key) => {
    if (opts.describeExtra){
      const extra = opts.describeExtra(key);
      if (extra) return extra;
    }
    const { k, id } = find(key);
    if (k === 'u'){
      const mod = trailModules().find(m => m.unitIds.some(x => String(x) === id));
      return mapUnitDescribe(UNITS.find(u => String(u.id) === id), mod && mod.id);
    }
    const module = trailModules().find(m => m.id === id);
    if (k === 'r'){
      const sel = moduleReviewSelection(module);
      const rec = STATE.reviewMilestones[module.id];
      const st = milestoneState(sel.available, rec);
      const why = milestoneReasonText(sel);
      return { eyebrow: t('trail.moduleReview.chip'), title: t('trail.moduleReview.title'), status: st === 'done' ? t('trail.map.review.statusDone') : (st === 'empty' ? t('trail.map.state.empty') : t('trail.map.review.statusReady')),
        goal: t('trail.map.review.goal'),
        lines: st === 'empty' ? [t('trail.moduleReview.empty')] : [why].concat(rec && rec.lastDate ? [t('trail.map.review.lastSession', { date: milestoneDateLabel(rec.lastDate) })] : []),
        actions: (st === 'empty' || !moduleUnlocked(module)) ? [] : [{ label: t('trail.map.review.cta'), primary: true, onClick: () => startModuleReviewSession(module.id) }] };
    }
    const cp = STATE.checkpointProgress[module.id];
    const lines = [];
    const actions = [];
    if (!moduleUnlocked(module)) lines.push(t('trail.map.checkpoint.lockedHint'));
    else if (!trailSkipAllowed()) lines.push(t('trail.checkpoint.skipLocked'));
    else actions.push({ label: cp.completed ? t('trail.map.checkpoint.redo') : t('trail.map.checkpoint.take'), primary: !cp.completed, onClick: () => openCheckpoint(module.id) });
    const cpStatus = cp.completed ? t('trail.map.checkpoint.passed', { score: cp.bestScore || 0 })
      : (!moduleUnlocked(module) ? t('trail.map.checkpoint.locked') : (trailSkipAllowed() ? t('trail.map.state.available') : '⭐ ' + t('trail.premiumBadge')));
    return { eyebrow: t('trail.checkpoint.title'), title: module.title, status: cpStatus,
      goal: t('trail.map.checkpoint.goal'), lines, actions };
  };
  renderTrailMap(container, { sections }, describe);
}

// Melhoria 2 (2026-10-26): sem padrão em francês. Site com Teste de Nível declara LANG_HOOKS.levelTestKeys (o contrato
// cobra); se faltar, o texto fica vazio e o console avisa (melhor que mostrar "French" no site de outro idioma).
function levelTestKey(name){
  const keys = (typeof LANG_HOOKS !== 'undefined' && LANG_HOOKS.levelTestKeys) || null;
  if (keys && keys[name]) return keys[name];
  if (typeof console !== 'undefined') console.error('[LANG_HOOKS] falta levelTestKeys.' + name + ' (shared/core/lang-hooks-contrato.js)');
  return '';
}

function buildLevelTestCard(test){
  const lt = STATE.levelTestProgress[test.id];
  const card = document.createElement('button');
  card.className = 'level-test-card' + (lt.completed ? ' done' : '');
  card.innerHTML = `
    <div class="level-test-icon">🎓</div>
    <div class="level-test-body">
      <div class="level-test-title">${test.title}${lt.completed ? ` <span class="level-test-done-pill">${t('trail.levelTest.donePill')}</span>` : ''}</div>
      <div class="level-test-sub">${t(levelTestKey('sub'), { level: test.level, next: test.nextLevel })}</div>
    </div>
    <div class="level-test-cta">${lt.completed ? t('trail.levelTest.redo') : t('trail.levelTest.start')}</div>
  `;
  card.addEventListener('click', () => openLevelTest(test.id));
  return card;
}

function buildCheckpointRow(module, unlocked){
  const cp = STATE.checkpointProgress[module.id];
  const block = document.createElement('div');
  const skipLocked = !trailSkipAllowed();
  block.className = 'unit-block checkpoint' + (!unlocked ? ' locked' : '') + (cp.completed ? ' done' : '') + (skipLocked ? ' skip-locked' : '');
  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">🏆</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${t('trail.checkpoint.title')}</span>${cp.completed ? `<span class="ub-badge">✓</span>` : ''}${skipLocked ? '<span class="ub-badge" title="Premium">🔒</span>' : ''}</div>
        <div class="ub-goal">${skipLocked ? t('trail.checkpoint.skipLocked') : t('trail.checkpoint.goal')}</div>
      </div>
    </div>
  `;
  if (unlocked){
    wireHeaderActivation(block.querySelector('.ub-header'), () => openCheckpoint(module.id)); // openCheckpoint já avisa se pular for Premium
  }
  return block;
}

// Trilha em lista, por módulos: rótulo do módulo + unidades + Revisão do módulo + Ponto de verificação.
// opts (opcional): afterUnit(u, list) acrescenta algo logo depois de uma unidade (ex.: história do zh);
// afterModule(module, list) acrescenta algo no fim do módulo (ex.: os Desafios do Módulo do fr).
function renderModuleTrailList(grid, levelModules, opts){
  opts = opts || {};
  levelModules.forEach((module, mIdx) => {
    const unlocked = moduleUnlocked(module);
    const pct = moduleProgressPct(module);

    // O Módulo vira um rótulo fino de seção -- organiza a trilha em
    // capítulos sem competir visualmente com a Unidade, que é quem carrega
    // o peso real da decisão do aluno ("Hierarquia da Trilha", seção 6). O
    // check quando concluído (Opção D) é só isso -- um selo, sem tom de
    // fundo: o rótulo é fino demais pra um "wash" parecer uma linha, não um
    // banner colorido brigando com o resto da trilha.
    const doneBadge = moduleCompleted(module) ? `<span class="ml-badge">✓</span>` : '';
    const label = document.createElement('div');
    label.className = 'module-label';
    label.innerHTML = `
      <span class="ml-text">${t('trail.module.label', { n: mIdx + 1, title: module.title })}</span>
      ${doneBadge}
      <div class="ml-track"><div class="ml-fill" style="width:${pct}%"></div></div>
    `;
    grid.appendChild(label);

    const list = document.createElement('div');
    list.className = 'module-units-list' + (unlocked ? '' : ' locked');
    module.unitIds.forEach(id => {
      const u = UNITS.find(x => x.id === id);
      list.appendChild(buildUnitBlock(u));
      if (opts.afterUnit) opts.afterUnit(u, list);
    });
    list.appendChild(buildModuleReviewRow(module, unlocked));
    list.appendChild(buildCheckpointRow(module, unlocked));
    if (opts.afterModule) opts.afterModule(module, list);
    grid.appendChild(list);
  });
}


// Etapa 6 (2026-10-26): as estrelas foram aposentadas (trocadas por XP) e nenhuma tela mostra mais esta conta; a função
// fica só porque o teste de paridade (tests/paridade-sites/test_modulos_niveis.js) ainda a compara. Texto antigo:
// Ainda usada por markUnitCompleted (registerDailyStars) -- retirar o
// sistema de estrelas por completo é uma fase à parte (não autorizada
// ainda), esta função em si não é o problema; o problema era ela alimentar
// a tela de "Lição concluída" como se estrelas fossem o XP real (corrigido
// -- ver renderLessonCompleteScreen).
// (Paridade B2: hoje só a tela de módulo/nível concluído usa; veio do fr/app.js junto com ela.)
function lessonStars(pct){
  return Math.max(1, Math.round((pct / 100) * 5));
}

// Fase 6 da tarefa de conclusão de lição/unidade: retirada do desafio
// diário 'stars40' (GENERAL_CHALLENGES) removeu o ÚNICO chamador desta
// função que vinha de markUnitCompleted (unidade Modelo B). Esta função em
// si NÃO foi removida porque completeModuleUnits (Ponto de verificação de
// MÓDULO, sistema fr-only, ver "---------- Ponto de verificação (checkpoint)
// de cada módulo ----------") ainda a chama de verdade, e
// renderModuleCompleteScreen (Tier 4/6) ainda mostra esse número na própria
// tela -- feature separada, fora do escopo desta tarefa, nunca mencionada
// pela autora como confusa. Não remover sem essa mesma auditoria.
// (Paridade B2, 2026-10-23: conferido que hoje nenhum código chama esta função; veio do fr/app.js como estava.)
function registerDailyStars(amount){
  ensureDailyBucket();
  STATE.daily.stars += amount;
}


// ---------- Tela de conclusão de módulo/nível (checkpoint e teste de nível) ----------
// Diferente da tela de fim de lição normal: não repete vocabulário isolado,
// foca no que o aluno já é capaz de fazer na vida real com o que aprendeu
// (usa o campo `goal` de cada unidade do módulo/nível).
// Etapa 6 (decisão da dona, 2026-10-26): pular pelo Ponto de verificação/Teste de Nível NÃO dá XP nem estrelas, então a
// tela de aprovado não tem caixa de recompensa: mostra só a nota e o que a pessoa já sabe. A janela da sequência fica
// para depois do Continuar (handleModuleStepNext -> showDeferredStreakCelebration).
function renderModuleCompleteScreen(contentEl, nextBtn, { passed, title, subtitle, units, scorePct, passThreshold, nextLabel, tier = 'module' }){
  if (!passed){
    contentEl.innerHTML = `
      <div class="lesson-complete">
        <div class="lesson-complete-icon">💪</div>
        <h2>${t('fr.moduleDone.almostThere')}</h2>
        <p class="module-complete-sub">${subtitle}</p>
        <div class="lesson-complete-stats">
          <div class="lc-stat"><div class="lc-stat-label">${t('zh.path.lessonDone.score')}</div><div class="lc-stat-value">${scorePct}%</div></div>
        </div>
        <p class="module-retry-note">${t('fr.moduleDone.retryNote', { pct: passThreshold })}</p>
      </div>
    `;
    nextBtn.textContent = nextLabel || t('trail.backToTrail');
    nextBtn.style.display = 'flex';
    return;
  }

  const goals = units.map(u => u.goal).filter(Boolean);

  contentEl.innerHTML = `
    <div class="module-complete tier-bounce">
      <div class="module-complete-icon tier-stamp">🏆</div>
      <h2>${title}</h2>
      <p class="module-complete-sub">${subtitle}</p>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">${t('zh.path.lessonDone.score')}</div><div class="lc-stat-value" id="lc-stat-pct">0%</div></div>
      </div>
      <div class="module-skills">
        <div class="module-skills-label">${t('fr.moduleDone.nowYouKnow')}</div>
        ${goals.map(g => `
          <div class="module-skill-item"><span class="module-skill-check">✓</span><span>${g}</span></div>
        `).join('')}
      </div>
    </div>
  `;
  // Tier 4 (módulo) vs tier 6 (nível): mesma tela, mas o nível -- o marco
  // mais raro da hierarquia -- ganha confete mais denso e sustentado, sem
  // precisar de uma tela totalmente diferente pra isso.
  const isLevel = tier === 'level';
  spawnConfetti(isLevel ? 34 : 24, isLevel ? 2600 : 2000);
  animateCount(document.getElementById('lc-stat-pct'), scorePct, { suffix: '%', duration: isLevel ? 900 : 750 });
  nextBtn.textContent = nextLabel || t('common.continueArrow');
  nextBtn.style.display = 'flex';
}


// ---------- Fase 5 da trilha: marco de Revisão do módulo ----------
// Seleção/ordem/teto em shared/review-milestone.js (puro). Aqui só liga à
// Revisão existente (renderReviewView) e guarda a data da última sessão.
function moduleReviewSelection(module){
  const pool = milestonePool(STATE.cards, module.unitIds, isCardLessonCompleted);
  return selectMilestoneCards(pool);
}

function recordModuleReviewDone(moduleId, count){
  STATE.reviewMilestones[moduleId] = { lastDate: todayStr(), lastCount: count };
  saveState();
}

function startModuleReviewSession(moduleId){
  const module = trailModules().find(m => m.id === moduleId);
  if (!module) return;
  const sel = moduleReviewSelection(module);
  if (!sel.cards.length) return;
  trackEvent('lesson_start', 'flashcard_review', { moduleId });
  STATE.reviewSessionUnitFilter = null;
  STATE.reviewSessionDeckId = null;
  STATE.reviewSessionMilestone = { moduleId, unitIds: module.unitIds.slice() };
  STATE.reviewActiveMode = 'flashcard';
  STATE.reviewQueue = shuffle(sel.cards);
  STATE.reviewIndex = 0;
  STATE.reviewCardState = null;
  if (typeof switchTab === 'function') switchTab('review');
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = 'block';
  document.getElementById('speed-review-content').style.display = 'none';
  document.getElementById('match-review-content').style.display = 'none';
  renderReviewView();
}

function buildModuleReviewRow(module, unlocked){
  const sel = moduleReviewSelection(module);
  const rec = STATE.reviewMilestones[module.id];
  const st = milestoneState(sel.available, rec);
  const why = milestoneReasonText(sel);
  const dateLabel = rec && rec.lastDate ? milestoneDateLabel(rec.lastDate) : '';
  let goal;
  if (unlocked === false) goal = t('trail.moduleReview.locked');
  else if (st === 'empty') goal = t('trail.moduleReview.empty');
  else if (st === 'done') goal = why ? t('trail.moduleReview.doneOnAgain', { date: dateLabel, why }) : t('trail.moduleReview.doneOn', { date: dateLabel });
  else goal = t('trail.moduleReview.recommended') + (why ? ' · ' + why : '');
  const block = document.createElement('div');
  block.className = 'unit-block review-milestone' + (unlocked === false ? ' locked' : '') + (st === 'empty' ? ' empty' : '') + (st === 'done' ? ' done' : '');
  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">🔁</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${t('trail.moduleReview.title')}</span><span class="ub-type-chip review">${t('trail.moduleReview.chip')}</span>${st === 'done' ? '<span class="ub-badge">✓</span>' : ''}</div>
        <div class="ub-goal">${goal}</div>
      </div>
    </div>
  `;
  if (unlocked !== false && st !== 'empty') wireHeaderActivation(block.querySelector('.ub-header'), () => startModuleReviewSession(module.id));
  return block;
}


// ---------- Ponto de verificação (checkpoint) de cada módulo ----------
// Pode ser feito a qualquer momento, mesmo sem ter aberto nenhuma unidade do
// módulo ainda. Se aprovado (nota >= CHECKPOINT_PASS_THRESHOLD), marca todas
// as unidades do módulo como concluídas de uma vez — um jeito do aluno que já
// sabe o conteúdo "pular" o módulo sem precisar abrir unidade por unidade.
const CHECKPOINT_PASS_THRESHOLD = 70;

// ---------- Fase 6: quem pode PULAR (Ponto de verificação / Teste de Nível) ----------
// Decisão da professora: Free tem progressão linear; quem pula é decidido pela tabela Admin > Planos
// (célula "Pular unidades", trail_skip_locked: Premium e Aluno desde a 116, decisão da dona de 2026-10-22).
// Fica DESLIGADO por enquanto (mesmo padrão de CHALLENGE_PAYWALL_ENABLED):
// hoje todos continuam podendo pular; ao ligar a flag a regra vale sem mexer em mais nada.
// Trava só no cliente (decisão 10): o servidor não valida plano.
let TRAIL_SKIP_PAYWALL_ENABLED = false; // let: os testes ligam a flag
let TRAIL_PERMS_REQUESTED = false;
function trailSkipAllowed(){
  if (!TRAIL_SKIP_PAYWALL_ENABLED) return true;
  return (typeof planCan === 'function' && planCan('trail_skip_locked')) || (typeof isChallengesAdmin === 'function' && isChallengesAdmin());
}
// Com a flag ligada, garante que a tabela de permissões chegou e redesenha a trilha quando chegar.
function ensureTrailTeacherLink(){
  if (!TRAIL_SKIP_PAYWALL_ENABLED || TRAIL_PERMS_REQUESTED || !CURRENT_USER || typeof loadMyPermissions !== 'function') return;
  TRAIL_PERMS_REQUESTED = true;
  loadMyPermissions().then(() => { if (trailSkipAllowed()) renderUnitsGrid(); }).catch(() => {});
}
function showTrailSkipLocked(){
  showToast(t('trail.checkpoint.skipLockedToast'));
}


const CHECKPOINT_STATE = {
  moduleId: null,
  queue: [],
  index: 0,
  score: 0,
  lastPct: 0
};

function buildCheckpointQueue(module){
  // Fase 6: palavra + frase + escuta + gramática (shared/checkpoint-exam.js, puro).
  // O site diz as chaves do enunciado (LANG_HOOKS.checkpointExam.keys, obrigatório com módulos) e, se a escrita não é a
  // do campo `f` (zh), como virar palavra/frase em item da prova (checkpointExam.word/phrase; o fr não declara: usa `f`).
  const moduleUnits = module.unitIds.map(id => UNITS.find(u => u.id === id));
  const exam = (typeof LANG_HOOKS !== 'undefined' && LANG_HOOKS.checkpointExam) || null;
  const opts = { shuffle, canSpeak: LANG_HOOKS.canSpeak };
  if (exam) Object.assign(opts, { item: (exam.word || exam.phrase) ? exam : null, keys: exam.keys });
  return buildCheckpointExamQueue(moduleUnits, opts);
}

// Nota de uma resposta da prova: { score, status }. O site pode trocar a regra (zh: pinyin e tom).
function checkpointAnswerScore(given, ex){
  if (typeof LANG_HOOKS !== 'undefined' && typeof LANG_HOOKS.checkpointScore === 'function') return LANG_HOOKS.checkpointScore(given, ex);
  return scoreCheckpointAnswer(given, ex.answer, ex.kind);
}

function recordCheckpointAttempt(module, scorePct){
  const cp = STATE.checkpointProgress[module.id];
  cp.bestScore = Math.max(cp.bestScore || 0, scorePct);
  saveState();
}

function completeModuleUnits(module, scorePct){
  // Fase 6 (decisões da professora, 06/10/2026): passar no Ponto de verificação
  // PULA as unidades que ainda não estavam concluídas. Pulada libera a próxima
  // unidade e conta para o módulo/nível, mas NÃO dá XP, estrelas nem selos de
  // unidade, e NÃO inventa evidência de estudo: nenhum cartão recebe nota "Bom"
  // no FSRS (ficam New de verdade e entram pela cota de novas por sessão; a
  // elegibilidade vem de prog.completed, ver isCardLessonCompleted). Refazer o
  // ponto nunca reclassifica uma unidade já concluída estudando.
  module.unitIds.forEach(id => {
    if (!STATE.unitProgress[id].completed) stampUnitCompletion(STATE.unitProgress[id], 'skip_test', todayStr());
    STATE.unitProgress[id].started = true;
    STATE.unitProgress[id].completed = true;
  });
  const alreadyCompleted = STATE.checkpointProgress[module.id].completed;
  STATE.checkpointProgress[module.id].completed = true;
  STATE.checkpointProgress[module.id].bestScore = Math.max(STATE.checkpointProgress[module.id].bestScore || 0, scorePct);
  if (!alreadyCompleted) registerStudyToday();
  recalculateUnlockedUnits();
  showToast(t('toast.checkpointPassed'));
  saveState();
}

function openCheckpoint(moduleId){
  if (!trailSkipAllowed()){ showTrailSkipLocked(); return; }
  const module = trailModules().find(m => m.id === moduleId);
  if (!module || !moduleUnlocked(module)) return;
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = moduleId;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-back-btn').style.display = 'none';

  document.getElementById('ud-eyebrow').textContent = t('trail.checkpoint.title');
  document.getElementById('ud-title').textContent = module.title;
  document.getElementById('ud-goal').textContent = t('trail.checkpoint.intro');

  examScreenOpened();

  CHECKPOINT_STATE.moduleId = moduleId;
  CHECKPOINT_STATE.queue = buildCheckpointQueue(module);
  CHECKPOINT_STATE.index = 0;
  CHECKPOINT_STATE.score = 0;
  CHECKPOINT_STATE.lastPct = 0;
  renderCheckpointQuizStep();

  renderTopbarStats();
}

// A prova abriu na tela da lição: o site esconde o que é só da lição (zh: o botão "Manual da unidade").
function examScreenOpened(){
  if (typeof LANG_HOOKS !== 'undefined' && typeof LANG_HOOKS.examScreenOpened === 'function') LANG_HOOKS.examScreenOpened();
}

// Uma pergunta da prova (Ponto de verificação e Teste de Nível usam a mesma tela; só os ids mudam).
// prefix: 'checkpoint' | 'leveltest'. onNext: avança para a próxima pergunta.
function renderExamQuestion(contentEl, ex, index, total, prefix, onScore, onNext){
  const isListen = ex.kind === 'listen';
  const extraHTML = (typeof LANG_HOOKS !== 'undefined' && typeof LANG_HOOKS.grammarInputExtraHTML === 'function') ? LANG_HOOKS.grammarInputExtraHTML() : '';
  contentEl.innerHTML = `
    <div class="conj-progress">${t('fr.checkpoint.question', { i: index + 1, n: total })}</div>
    <div class="gram-exercise">
      <div class="gram-exercise-prompt">${ex.prompt}${isListen ? ' ' + audioBtnHTML(ex.audioText) : ''}</div>
      ${ex.hint ? `<div class="gram-exercise-hint">${ex.hint}</div>` : ''}
      <input type="text" id="${prefix}-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${isListen ? t('review.listen.placeholder') : t('review.typeAnswer.placeholder')}">
      ${extraHTML}<div class="expected" id="${prefix}-expected"></div>
    </div>
    <button class="btn btn-primary btn-block" id="${prefix}-verify-btn">${t('common.verify')}</button>
  `;
  if (isListen){
    wireAudioButtons(contentEl);
    LANG_HOOKS.speak(ex.audioText, contentEl.querySelector('.audio-btn'), true);
  }

  const inputEl = document.getElementById(prefix + '-input');
  if (extraHTML && typeof LANG_HOOKS.wireGrammarInputExtra === 'function') LANG_HOOKS.wireGrammarInputExtra(contentEl.querySelector('.gram-exercise'), inputEl);
  inputEl.focus();
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(prefix + '-verify-btn').click();
  });

  document.getElementById(prefix + '-verify-btn').addEventListener('click', () => {
    // O que aparece como resposta certa: a resposta (fr) ou a forma completa do item (zh: hanzi + pinyin).
    const expected = ex.shown || ex.answer;
    const wrapEl = contentEl.querySelector('.gram-exercise');
    const expectedEl = document.getElementById(prefix + '-expected');
    inputEl.disabled = true;

    const res = checkpointAnswerScore(inputEl.value, ex);
    onScore(res.score);
    wrapEl.classList.add(res.status);
    if (res.status === 'almost') expectedEl.textContent = t('feedback.almostArrow', { expected });
    else if (res.status === 'wrong') expectedEl.textContent = `→ ${expected}`;
    // "almost" (grafia quase certa, sem acento etc.) já dá 0.5 ponto -- toca
    // o mesmo som de acerto do "ok", só "wrong" de verdade toca o de erro.
    playFeedbackSound(res.status !== 'wrong');

    document.getElementById(prefix + '-verify-btn').style.display = 'none';
    const goNextBtn = document.createElement('button');
    goNextBtn.className = 'btn btn-secondary btn-block';
    goNextBtn.textContent = index < total - 1 ? t('common.nextArrow') : t('common.seeResultArrow');
    goNextBtn.addEventListener('click', onNext);
    contentEl.appendChild(goNextBtn);
  });
}

function renderCheckpointQuizStep(){
  stopExerciseAudio();
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const module = trailModules().find(m => m.id === CHECKPOINT_STATE.moduleId);
  const total = CHECKPOINT_STATE.queue.length;
  document.getElementById('step-progress-fill').style.width = `${total ? Math.round((CHECKPOINT_STATE.index / total) * 100) : 0}%`;

  if (CHECKPOINT_STATE.index >= total){
    const pct = total ? Math.round((CHECKPOINT_STATE.score / total) * 100) : 0;
    CHECKPOINT_STATE.lastPct = pct;
    recordCheckpointAttempt(module, pct);
    const passed = pct >= CHECKPOINT_PASS_THRESHOLD;
    const moduleUnits = module.unitIds.map(id => UNITS.find(u => u.id === id));
    renderModuleCompleteScreen(contentEl, nextBtn, {
      passed,
      title: t('fr.checkpoint.moduleDone'),
      subtitle: module.title,
      units: moduleUnits,
      scorePct: pct,
      passThreshold: CHECKPOINT_PASS_THRESHOLD,
      nextLabel: passed ? t('fr.checkpoint.finishSection') : t('trail.backToTrail'),
      tier: 'module'
    });
    return;
  }

  const ex = CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index];
  nextBtn.style.display = 'none';
  renderExamQuestion(contentEl, ex, CHECKPOINT_STATE.index, total, 'checkpoint',
    (score) => { CHECKPOINT_STATE.score += score; },
    () => { CHECKPOINT_STATE.index += 1; renderCheckpointQuizStep(); });
}

// ---------- Teste de Nível (prova final, cobre o nível inteiro) ----------
// Diferente do checkpoint de módulo (que cobre só um bloco temático), o
// teste de nível amostra de TODOS os módulos do nível — sempre desbloqueado,
// desde o primeiro acesso, pra quem já sabe o conteúdo pular direto pro
// próximo nível sem passar por nenhuma unidade.
const LEVEL_TEST_PASS_THRESHOLD = 75;
const LEVEL_TEST_QUESTIONS_PER_MODULE = 5;

const LEVEL_TEST_STATE = {
  testId: null,
  queue: [],
  index: 0,
  score: 0,
  lastPct: 0
};

function buildLevelTestQueue(test){
  const levelModules = modulesOfLevel(test.level);
  let queue = [];
  levelModules.forEach(module => {
    const modulePool = buildCheckpointQueue(module); // já embaralhado e limitado a 12
    queue = queue.concat(modulePool.slice(0, LEVEL_TEST_QUESTIONS_PER_MODULE));
  });
  return shuffle(queue);
}

function recordLevelTestAttempt(test, scorePct){
  const lt = STATE.levelTestProgress[test.id];
  lt.bestScore = Math.max(lt.bestScore || 0, scorePct);
  saveState();
}

function completeLevelTest(test, scorePct){
  // O card do teste de nível oferece "Refazer →" mesmo já concluído (ver
  // buildLevelTestCard) -- sem esta checagem, cada aprovação repetida
  // pagava +150 XP de novo, além do XP de cada módulo por baixo (esse já
  // protegido por completeModuleUnits, ver acima). Achado de auditoria.
  const alreadyCompleted = STATE.levelTestProgress[test.id].completed;
  const levelModules = modulesOfLevel(test.level);
  levelModules.forEach(module => completeModuleUnits(module, scorePct));
  STATE.levelTestProgress[test.id].completed = true;
  STATE.levelTestProgress[test.id].bestScore = Math.max(STATE.levelTestProgress[test.id].bestScore || 0, scorePct);
  showToast(t('toast.levelComplete', { level: test.level })); // Fase 6: pulo não dá XP

  saveState();
}

function openLevelTest(testId){
  if (!trailSkipAllowed()){ showTrailSkipLocked(); return; }
  const test = trailLevelTests().find(t => t.id === testId);
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = testId;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-back-btn').style.display = 'none';

  document.getElementById('ud-eyebrow').textContent = t('trail.levelTest.eyebrow');
  document.getElementById('ud-title').textContent = test.title;
  document.getElementById('ud-goal').textContent = t(levelTestKey('intro'), { level: test.level, next: test.nextLevel });

  examScreenOpened();

  LEVEL_TEST_STATE.testId = testId;
  LEVEL_TEST_STATE.queue = buildLevelTestQueue(test);
  LEVEL_TEST_STATE.index = 0;
  LEVEL_TEST_STATE.score = 0;
  LEVEL_TEST_STATE.lastPct = 0;
  renderLevelTestQuizStep();

  renderTopbarStats();
}

function renderLevelTestQuizStep(){
  stopExerciseAudio();
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const test = trailLevelTests().find(t => t.id === LEVEL_TEST_STATE.testId);
  const total = LEVEL_TEST_STATE.queue.length;
  document.getElementById('step-progress-fill').style.width = `${total ? Math.round((LEVEL_TEST_STATE.index / total) * 100) : 0}%`;

  if (LEVEL_TEST_STATE.index >= total){
    const pct = total ? Math.round((LEVEL_TEST_STATE.score / total) * 100) : 0;
    LEVEL_TEST_STATE.lastPct = pct;
    recordLevelTestAttempt(test, pct);
    const passed = pct >= LEVEL_TEST_PASS_THRESHOLD;
    const levelUnits = modulesOfLevel(test.level)
      .flatMap(m => m.unitIds)
      .map(id => UNITS.find(u => u.id === id));
    renderModuleCompleteScreen(contentEl, nextBtn, {
      passed,
      title: t('toast.levelComplete', { level: test.level }),
      subtitle: t('fr.levelTest.goStraightTo', { next: test.nextLevel }),
      units: levelUnits,
      scorePct: pct,
      passThreshold: LEVEL_TEST_PASS_THRESHOLD,
      nextLabel: passed ? t('fr.levelTest.finishLevel', { level: test.level }) : t('trail.backToTrail'),
      tier: 'level'
    });
    return;
  }

  const ex = LEVEL_TEST_STATE.queue[LEVEL_TEST_STATE.index];
  nextBtn.style.display = 'none';
  renderExamQuestion(contentEl, ex, LEVEL_TEST_STATE.index, total, 'leveltest',
    (score) => { LEVEL_TEST_STATE.score += score; },
    () => { LEVEL_TEST_STATE.index += 1; renderLevelTestQuizStep(); });
}

// "Continuar" na tela final do Ponto de verificação ou do Teste de Nível: aplica a aprovação (pula as unidades) e
// volta para a trilha. Devolve true se tratou o clique (o app.js do site para por aí).
function handleModuleStepNext(){
  if (STEP_STATE.onCheckpoint){
    const module = trailModules().find(m => m.id === STEP_STATE.onCheckpoint);
    if (CHECKPOINT_STATE.lastPct >= CHECKPOINT_PASS_THRESHOLD){
      completeModuleUnits(module, CHECKPOINT_STATE.lastPct);
    }
    STEP_STATE.onCheckpoint = null;
    setLessonFocusMode(false);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
    if (typeof showDeferredStreakCelebration === 'function') showDeferredStreakCelebration();
    return true;
  }

  if (STEP_STATE.onLevelTest){
    const test = trailLevelTests().find(t => t.id === STEP_STATE.onLevelTest);
    if (LEVEL_TEST_STATE.lastPct >= LEVEL_TEST_PASS_THRESHOLD){
      completeLevelTest(test, LEVEL_TEST_STATE.lastPct);
    }
    STEP_STATE.onLevelTest = null;
    setLessonFocusMode(false);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
    if (typeof showDeferredStreakCelebration === 'function') showDeferredStreakCelebration();
    return true;
  }
  return false;
}
