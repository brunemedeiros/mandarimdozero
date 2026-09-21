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
//   - shared/toast.js              (showToast)
//   - fr/zh app.js                 (APP_KEY, CURRENT_USER via shared/auth.js)

async function renderMyFlashcardsView(){
  const wrap = document.getElementById('my-flashcards-content');
  if (!wrap) return;
  if (!CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">Entre na sua conta pra criar seus próprios cartões.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const isMandarim = APP_KEY === 'mandarim';
  const cards = await fetchMyOwnFlashcards(APP_KEY);
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');

  const cardRowHTML = (c) => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-own-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
    </div>
  `;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Novo cartão</div>
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
        <button type="submit" class="btn btn-primary btn-block" id="my-create-flashcard-btn">Criar cartão</button>
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
