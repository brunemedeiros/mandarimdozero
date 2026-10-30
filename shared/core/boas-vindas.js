// Etapa 6 do plano "Voz da Prof. Brune": boas-vindas na primeira lição do CURSO (decisão da dona, 2026-10-26).
// A: cartão antes da 1ª palavra da 1ª lição (passo da própria lição, não é janela).
// B: bloco "Recado da Prof. Brune" na tela "Lição concluída!" da 1ª lição, com os números reais (sequência, Revisão, XP).
// Por CURSO, não por conta: aparece enquanto o curso atual não tem nenhuma lição concluída nem unidade pulada, e fica
// marcado no progresso DESTE curso (STATE.welcome = { a: 'AAAA-MM-DD', b: 'AAAA-MM-DD' }, salvo no bloco do curso por
// serializeState). Segundo curso da mesma conta vê de novo; curso com progresso não vê; zerar o curso traz de volta.
// Grátis x Premium: tudo grátis. Relatório: docs/i18n/etapa6-boas-vindas-proposta.md.
// Funções globais (scripts clássicos); STATE, UNITS, t(), tp() etc. são achados na hora da chamada.

const WELCOME_PHOTO_SRC = '../icons/brune-email.jpg';

function welcomeState(){
  if (!STATE.welcome || typeof STATE.welcome !== 'object') STATE.welcome = {};
  return STATE.welcome;
}

function welcomeMarked(part){
  return !!(STATE.welcome && STATE.welcome[part]);
}

function markWelcome(part){
  const w = welcomeState();
  if (!w[part]) w[part] = (typeof todayStr === 'function') ? todayStr() : new Date().toISOString().slice(0, 10);
}

// Curso sem nenhuma lição concluída e sem unidade pulada (nem concluída). Hanzi (zh) também conta como lição.
function welcomeCourseFresh(){
  const up = STATE.unitProgress || {};
  const anyUnit = Object.keys(up).some(id => {
    const p = up[id] || {};
    return p.completed || (Number(p.lessonIdx) || 0) > 0;
  });
  if (anyUnit) return false;
  const hz = STATE.hanziLessonProgress || {};
  if (Object.keys(hz).some(k => hz[k] && hz[k].completed)) return false;
  return true;
}

// Só com conta logada e progresso carregado (antes disso o STATE ainda é o padrão vazio e enganaria o "curso novo").
function welcomeAvailable(){
  try { return !!(CURRENT_USER && progressLoadedOk); } catch (e) { return false; }
}

// Primeiro nome da pessoa (display_name do perfil; senão o nome do cadastro). Sem nome: '' (a frase sai sem nome).
function welcomeFirstName(){
  let full = '';
  try { if (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE && PROFILE_CACHE.display_name) full = PROFILE_CACHE.display_name; } catch (e) {}
  if (!full && typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.user_metadata) full = CURRENT_USER.user_metadata.full_name || CURRENT_USER.user_metadata.name || '';
  return String(full || '').trim().split(/\s+/)[0] || '';
}

// Chave por curso quando existe ('welcome.a.text.frances'); senão a genérica, sem citar o idioma.
function welcomeCourseKey(base){
  const appKey = (typeof LANG_HOOKS !== 'undefined' && LANG_HOOKS.appKey) || (typeof APP_KEY !== 'undefined' ? APP_KEY : '');
  const k = base + '.' + appKey;
  const v = t(k);
  return v && v !== k ? k : base;
}

function welcomeEsc(s){
  return (typeof escapeHTML === 'function') ? escapeHTML(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function welcomeHeaderHTML(kickerKey){
  return `
    <div class="bv-quem">
      <img class="bv-foto" src="${WELCOME_PHOTO_SRC}" alt="" width="52" height="52" loading="lazy" decoding="async">
      <div><div class="bv-kicker">${t(kickerKey)}</div><div class="bv-assina">Prof. Brune</div></div>
    </div>`;
}

function welcomeItemHTML(icon, title, sub){
  return `<li><span class="bv-ic" aria-hidden="true">${icon}</span><span class="bv-item"><b>${title}</b><small>${sub}</small></span></li>`;
}

// ---------- A: cartão antes da 1ª palavra ----------
// Mostra se: lição de vocabulário, introdução no começo (1º bloco, 1ª palavra), não é revisão de lição concluída,
// curso novo e A ainda não marcado. Enquanto está na tela (acq.welcomeAShowing) continua aparecendo nas repinturas.
function shouldShowWelcomeA(u){
  const acq = STEP_STATE.acq;
  if (!acq || acq.phase !== 'intro') return false;
  if (acq.welcomeAShowing) return true;
  if (acq.welcomeADone) return false;
  if (!welcomeAvailable() || STEP_STATE.lessonReview) return false;
  if (!u || !isLessonUnit(u) || acq.blockIdx !== 0 || acq.introIdx !== 0) return false;
  if (welcomeMarked('a') || !welcomeCourseFresh()) return false;
  return true;
}

function renderWelcomeCardA(u, contentEl, nextBtn){
  const acq = STEP_STATE.acq;
  const first = !acq.welcomeAShowing;
  acq.welcomeAShowing = true;
  if (first){
    // Marca ao aparecer: sair pelo ✕ também conta como visto (não volta na próxima vez).
    markWelcome('a');
    if (typeof saveState === 'function') saveState();
  }
  const lesson = currentLesson(u);
  const n = (lesson && lesson.vocabIdx && lesson.vocabIdx.length) || ((acq.blocks && acq.blocks[0]) || []).length || 0;
  const name = welcomeFirstName();
  const title = name ? t('welcome.a.title', { name: welcomeEsc(name) }) : t('welcome.a.titleNoName');
  contentEl.innerHTML = `
    <section class="bv bv-a" aria-labelledby="bv-a-title">
      ${welcomeHeaderHTML('welcome.a.kicker')}
      <h2 class="bv-titulo" id="bv-a-title" tabindex="-1">${title}</h2>
      <p class="bv-texto">${t(welcomeCourseKey('welcome.a.text'))}</p>
      <ul class="bv-lista">
        ${n ? welcomeItemHTML('📖', tp('welcome.a.words', n === 1 ? 1 : 2, { n }), t(welcomeCourseKey('welcome.a.wordsSub'))) : ''}
        ${welcomeItemHTML('🧠', t('welcome.a.check'), t('welcome.a.checkSub'))}
        ${welcomeItemHTML('🔁', t('welcome.a.review'), t('welcome.a.reviewSub'))}
      </ul>
      <p class="bv-tempo">⏱ ${t('welcome.a.time')}</p>
    </section>
  `;
  const back = document.getElementById('step-back-btn');
  if (back) back.style.display = 'none';
  nextBtn.textContent = t('welcome.a.start');
  nextBtn.style.display = 'flex';
  const fill = document.getElementById('step-progress-fill');
  if (fill) fill.style.width = '0%';
  // Acessibilidade: o foco vai para o título (leitor de tela anuncia o cartão).
  const h = contentEl.querySelector('#bv-a-title');
  if (h) try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
}

// "Começar a lição →" no cartão A: segue para a 1ª palavra. Devolve true se tratou o clique.
function welcomeAHandleNext(){
  const acq = STEP_STATE.acq;
  if (!acq || !acq.welcomeAShowing) return false;
  acq.welcomeAShowing = false;
  acq.welcomeADone = true;
  renderStep();
  return true;
}

// ---------- B: bloco na tela "Lição concluída!" da 1ª lição ----------
// Decide ANTES de a lição avançar (finishCurrentLesson), com o curso ainda "novo".
function shouldShowWelcomeB(){
  if (!welcomeAvailable() || STEP_STATE.lessonReview) return false;
  return !welcomeMarked('b') && welcomeCourseFresh();
}

function welcomeBlockBHTML({ xpEarned, words }){
  const name = welcomeFirstName();
  const title = name ? t(welcomeCourseKey('welcome.b.title'), { name: welcomeEsc(name) }) : t(welcomeCourseKey('welcome.b.titleNoName'));
  const streak = Math.max(1, (typeof effectiveStreak === 'function' ? effectiveStreak() : STATE.streak) || 1);
  const xp = Math.max(0, Number(xpEarned) || 0);
  const items = [
    welcomeItemHTML('🔥', tp('welcome.b.streak', streak === 1 ? 1 : 2, { n: streak }), t('welcome.b.streakSub', { next: streak + 1 })),
    words > 0 ? welcomeItemHTML('🔁', t('welcome.b.review'), tp('welcome.b.reviewSub', words === 1 ? 1 : 2, { n: words })) : '',
    welcomeItemHTML('⭐', t('welcome.b.xp', { n: xp }), t('welcome.b.xpSub')),
  ];
  return `
    <section class="bv bv-b" aria-labelledby="bv-b-title">
      ${welcomeHeaderHTML('welcome.b.kicker')}
      <h3 id="bv-b-title">${title}</h3>
      <ul class="bv-lista">${items.join('')}</ul>
    </section>`;
}
