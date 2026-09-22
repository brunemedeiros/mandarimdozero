// ---------- Meus Cartões (autoria pela própria aluna) -- Fase 5 do sistema
// de alunas particulares (ver CLAUDE.md) ----------
// Irmã de shared/admin-flashcards.js (mesma estrutura de UI, mesmas classes
// CSS admin-badge-row/profile-section -- zero CSS novo), mas SEM gate de
// admin: qualquer conta logada tem acesso à própria aba "Meus Cartões" --
// diferente de admin-flashcards.js (só a professora cria pra uma aluna
// escolhida), aqui a aluna cria pra si mesma, sem selecionar aluna/idioma
// (o idioma é sempre o do site em que ela está -- APP_KEY, já definido em
// fr/app.js e zh/app.js antes desta função rodar).
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de app.js):
//   - shared/student-flashcards.js (fetchMyOwnFlashcards, createOwnFlashcard, setOwnFlashcardStatus)
//   - shared/roles.js              (hasActiveTeacherLink)
//   - shared/toast.js              (showToast)
//   - fr/zh app.js                 (APP_KEY, CURRENT_USER via shared/auth.js)

// Fase 5.1 (ver CLAUDE.md, "limite de cartões próprios") -- não existe
// assinatura/pagamento real neste app ainda (nenhuma conta pode "virar
// premium" hoje), então o teto abaixo não é um paywall de verdade: é um
// limite de quantidade pro plano grátis (a maioria das contas hoje), com
// `hasActiveTeacherLink()` (shared/roles.js) como o único eixo real que já
// existe pra "isenção" -- aluna vinculada a uma professora tem cartões
// ilimitados. Quando a plataforma tiver assinatura de verdade, este é o
// ponto a substituir/estender, não reinventar do zero.
const FREE_OWN_FLASHCARD_LIMIT = 20;

async function renderMyFlashcardsView(){
  const wrap = document.getElementById('my-flashcards-content');
  if (!wrap) return;
  if (!CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">Entre na sua conta pra criar seus próprios cartões.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const isMandarim = APP_KEY === 'mandarim';
  const [cards, hasLink] = await Promise.all([
    fetchMyOwnFlashcards(APP_KEY),
    hasActiveTeacherLink(),
  ]);
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  const atLimit = !hasLink && activeCards.length >= FREE_OWN_FLASHCARD_LIMIT;

  const cardRowHTML = (c) => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-own-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
    </div>
  `;

  // Selo de tier -- só comunica o que já é real hoje (vínculo com
  // professora), nunca promete "premium" (que não existe em nenhum lugar
  // do app ainda).
  const tierBadgeHTML = hasLink
    ? `<span class="pill">✨ Aluno vinculado — cartões ilimitados</span>`
    : `<span class="pill">🔒 Plano grátis — ${activeCards.length}/${FREE_OWN_FLASHCARD_LIMIT} cartões</span>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span>Novo cartão</span>
        ${tierBadgeHTML}
      </div>
      <form id="my-create-flashcard-form" class="profile-edit-form">
        <label class="profile-edit-label" for="my-flashcard-front">Frente (no idioma estudado)</label>
        <input type="text" id="my-flashcard-front" class="profile-edit-input" placeholder="${isMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}" autocomplete="off">
        ${isMandarim ? `
        <label class="profile-edit-label" for="my-flashcard-pinyin">Pinyin</label>
        <input type="text" id="my-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
        ` : ''}
        <label class="profile-edit-label" for="my-flashcard-back">Verso (tradução)</label>
        <input type="text" id="my-flashcard-back" class="profile-edit-input" placeholder="ex: a biblioteca" autocomplete="off">
        <label class="profile-edit-label" for="my-flashcard-note">Nota (opcional)</label>
        <input type="text" id="my-flashcard-note" class="profile-edit-input" placeholder="contexto, dica de uso..." autocomplete="off">
        <p class="profile-edit-error" id="my-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="my-create-flashcard-btn" ${atLimit ? 'disabled' : ''}>${atLimit ? 'Limite atingido' : 'Criar cartão'}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Seus cartões ativos (${activeCards.length})</div>
      ${activeCards.length ? activeCards.map(cardRowHTML).join('') : `<p class="profile-empty-note">Você ainda não criou nenhum cartão. Use o formulário acima pra adicionar palavras/frases que quer memorizar, mesmo que não estejam na trilha.</p>`}
    </div>

    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados (${archivedCards.length})</div>
      ${archivedCards.map(cardRowHTML).join('')}
    </div>` : ''}
  `;

  document.getElementById('my-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Checagem no submit, não só `disabled` no botão -- disabled já cobre o
    // caminho normal (aluna vê "Limite atingido" e não consegue clicar),
    // mas este é o ponto único de verdade caso o botão seja reativado por
    // qualquer motivo (ex: DOM não re-renderizado a tempo).
    if (atLimit){
      document.getElementById('flashcard-limit-modal').style.display = 'flex';
      return;
    }
    const btn = document.getElementById('my-create-flashcard-btn');
    const errorEl = document.getElementById('my-create-flashcard-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY,
      front: document.getElementById('my-flashcard-front').value,
      backTrans: document.getElementById('my-flashcard-back').value,
      note: document.getElementById('my-flashcard-note').value,
      frontPinyin: document.getElementById('my-flashcard-pinyin')?.value,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    // Sem isto, o cartão só entraria em STATE.cards (e portanto na fila de
    // revisão) no PRÓXIMO carregamento do app -- mergeSelfFlashcardsIntoState()
    // só roda no boot. addSelfFlashcardToState() (fr/zh app.js) empurra o
    // cartão recém-criado direto, pra "já entra na fila de revisão" no toast
    // abaixo ser verdade AGORA, não só depois de recarregar a página.
    if (typeof addSelfFlashcardToState === 'function') addSelfFlashcardToState(result.card);
    showToast('✓ Cartão criado. Ele já entra na sua fila de revisão.');
    renderMyFlashcardsView();
  });

  wrap.querySelectorAll('[data-toggle-own-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.toggleOwnFlashcard;
      const nextStatus = btn.dataset.nextStatus;
      await setOwnFlashcardStatus(id, nextStatus);
      // Mesmo motivo do addSelfFlashcardToState() acima -- sem isto, arquivar
      // um cartão só sairia da fila de revisão (isCardLessonCompleted checa
      // flashcardStatus) no próximo carregamento, não nesta mesma sessão.
      if (typeof updateSelfFlashcardStatusInState === 'function') updateSelfFlashcardStatusInState(id, nextStatus);
      renderMyFlashcardsView();
    });
  });
}

// Wiring do popup de limite (#flashcard-limit-modal, fr/zh index.html) --
// mesmo padrão de abrir/fechar já usado em todo o app (ex: level-modal,
// kbd-shortcuts-modal em fr/zh app.js): botão de fechar + clique no fundo.
// Vive aqui (não em app.js) porque o modal só é aberto por este arquivo.
document.getElementById('flashcard-limit-modal-close')?.addEventListener('click', () => {
  document.getElementById('flashcard-limit-modal').style.display = 'none';
});
document.getElementById('flashcard-limit-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'flashcard-limit-modal') document.getElementById('flashcard-limit-modal').style.display = 'none';
});
