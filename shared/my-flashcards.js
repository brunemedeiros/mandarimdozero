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
//   - shared/student-flashcards.js (fetchMyOwnFlashcards, createOwnFlashcard, setOwnFlashcardStatus, updateOwnFlashcardContent, deleteOwnFlashcardPermanently)
//   - shared/roles.js              (hasActiveTeacherLink)
//   - shared/toast.js              (showToast)
//   - shared/admin-flashcards.js   (openFlashcardResetConfirm -- carregado ANTES deste arquivo, mesma página, função global reaproveitada sem duplicar)
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

const MY_FLASHCARDS_STATE = { editingCardId: null, _cardsCache: [] };

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
  MY_FLASHCARDS_STATE._cardsCache = cards;
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  const atLimit = !hasLink && activeCards.length >= FREE_OWN_FLASHCARD_LIMIT;

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
        ${!isMandarim ? `
        <div class="section-label" style="margin:0 0 4px;">Idioma de cada lado</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="my-flashcard-direction" value="target-front" checked> Frente no idioma estudado, verso na tradução (padrão)
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400; margin-bottom:10px;">
          <input type="radio" name="my-flashcard-direction" value="target-back"> Frente na tradução, verso no idioma estudado
        </label>
        ` : ''}
        <label class="profile-edit-label" for="my-flashcard-front">Frente</label>
        <textarea id="my-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="${isMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}"></textarea>
        ${isMandarim ? `
        <label class="profile-edit-label" for="my-flashcard-pinyin">Pinyin</label>
        <input type="text" id="my-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
        ` : ''}
        <label class="profile-edit-label" for="my-flashcard-back">Verso</label>
        <textarea id="my-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="ex: a biblioteca"></textarea>
        <label class="profile-edit-label" for="my-flashcard-note">Nota (opcional)</label>
        <textarea id="my-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="contexto, dica de uso..."></textarea>
        <p class="profile-edit-error" id="my-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="my-create-flashcard-btn" ${atLimit ? 'disabled' : ''}>${atLimit ? 'Limite atingido' : 'Criar cartão'}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
        <span>Seus cartões ativos (${activeCards.length})</span>
        ${cards.length ? `<button type="button" class="admin-select-link" id="my-flashcards-export-btn" style="background:none; border:none; cursor:pointer;">⬇️ Exportar / compartilhar</button>` : ''}
      </div>
      <div id="my-flashcards-active-box">
        ${activeCards.length ? activeCards.map(c => myFlashcardRowHTML(c)).join('') : `<p class="profile-empty-note">Você ainda não criou nenhum cartão. Use o formulário acima pra adicionar palavras/frases que quer memorizar, mesmo que não estejam na trilha.</p>`}
      </div>
    </div>

    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados (${archivedCards.length})</div>
      <div id="my-flashcards-archived-box">
        ${archivedCards.map(c => myFlashcardRowHTML(c)).join('')}
      </div>
    </div>` : ''}

    <div class="profile-section">
      <div class="section-label">Importar cartões</div>
      <p class="profile-edit-hint">Recebeu um arquivo .json de outro aluno, ou um link de compartilhamento? Importe aqui -- só cartões do MESMO idioma que você está estudando (${isMandarim ? 'mandarim' : 'francês'}) podem ser importados.</p>
      <input type="file" id="my-flashcards-import-file" accept="application/json" style="margin-top:6px;">
      <p class="profile-edit-error" id="my-flashcards-import-error"></p>
    </div>
  `;

  wireMyFlashcardsForm(wrap, atLimit);
  wireMyFlashcardsCardButtons(wrap);
  document.getElementById('my-flashcards-export-btn')?.addEventListener('click', () => openMyFlashcardsExportModal(activeCards.concat(archivedCards).filter(c => c.status === 'active')));
  document.getElementById('my-flashcards-import-file')?.addEventListener('change', (e) => handleMyFlashcardsImportFile(e.target.files[0]));

  if (MY_FLASHCARDS_STATE.editingCardId != null){
    const editingCard = MY_FLASHCARDS_STATE._cardsCache.find(c => c.id === MY_FLASHCARDS_STATE.editingCardId);
    if (editingCard) wireMyFlashcardEditForm(editingCard, wrap);
  }

  maybeAutoImportFromUrl();
}

function myFlashcardRowHTML(c){
  if (MY_FLASHCARDS_STATE.editingCardId === c.id) return myFlashcardEditFormHTML(c);
  return `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="admin-badge-delete-btn" data-edit-own-flashcard="${c.id}" title="Editar">✏️</button>
        <button class="admin-badge-delete-btn" data-toggle-own-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
        <button class="admin-badge-delete-btn" data-delete-own-flashcard="${c.id}" title="Apagar permanentemente">🗑</button>
      </div>
    </div>
  `;
}

// Prop 4 (ver CLAUDE.md, "7 propostas") -- edição real (todos os campos,
// inclusive direção) de um cartão próprio. Mesmo shape visual do edit form
// de shared/admin-flashcards.js, mas mais simples -- cartão próprio (Fase 5)
// nunca teve modo/mídia/cloze (esses formatos ficaram restritos a
// teacher_flashcards desde a Fase 8a, ver CLAUDE.md), então não há radios
// de modo aqui, só direção (quando aplicável) + front/pinyin/back/note.
function myFlashcardEditFormHTML(c){
  const isMandarim = APP_KEY === 'mandarim';
  const direction = c.front_is_target_language === false ? 'target-back' : 'target-front';
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:10px;">
      ${!isMandarim ? `
      <div>
        <div class="section-label" style="margin:0 0 4px;">Idioma de cada lado</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-my-flashcard-direction" value="target-front" ${direction === 'target-front' ? 'checked' : ''}> Frente no idioma estudado, verso na tradução
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-my-flashcard-direction" value="target-back" ${direction === 'target-back' ? 'checked' : ''}> Frente na tradução, verso no idioma estudado
        </label>
      </div>` : ''}
      <div>
        <label class="profile-edit-label">Frente</label>
        <textarea id="edit-my-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.front || '')}</textarea>
        ${isMandarim ? `
        <label class="profile-edit-label">Pinyin</label>
        <input type="text" id="edit-my-flashcard-pinyin" class="profile-edit-input" value="${escapeHTML(c.front_pinyin || '')}">` : ''}
        <label class="profile-edit-label">Verso</label>
        <textarea id="edit-my-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.back_trans || '')}</textarea>
        <label class="profile-edit-label">Nota (opcional)</label>
        <textarea id="edit-my-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.note || '')}</textarea>
      </div>
      <p class="profile-edit-error" id="edit-my-flashcard-error"></p>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-secondary" id="edit-my-flashcard-cancel" style="flex:1;">Cancelar</button>
        <button type="button" class="btn btn-primary" id="edit-my-flashcard-save" style="flex:1;">Salvar edição</button>
      </div>
    </div>
  `;
}

function wireMyFlashcardEditForm(c, wrap){
  document.getElementById('edit-my-flashcard-cancel')?.addEventListener('click', () => {
    MY_FLASHCARDS_STATE.editingCardId = null;
    renderMyFlashcardsView();
  });
  document.getElementById('edit-my-flashcard-save')?.addEventListener('click', () => {
    const errorEl = document.getElementById('edit-my-flashcard-error');
    const front = document.getElementById('edit-my-flashcard-front').value;
    const back = document.getElementById('edit-my-flashcard-back').value;
    if (!front.trim()){ errorEl.textContent = 'Digite o texto da frente do cartão.'; return; }
    if (!back.trim()){ errorEl.textContent = 'Digite a tradução (verso do cartão).'; return; }
    const directionRadio = document.querySelector('input[name="edit-my-flashcard-direction"]:checked');
    const frontIsTargetLanguage = directionRadio ? directionRadio.value !== 'target-back' : true;
    // Computado UMA vez só e reaproveitado nas duas chamadas abaixo -- nunca
    // reler `c.revision` depois do `await`: supabase-js real não muta o
    // objeto local, mas nada garante isso pra sempre, e duas leituras
    // separadas da mesma derivação é frágil por definição.
    const nextRevision = (c.revision || 0) + 1;
    const note = document.getElementById('edit-my-flashcard-note').value;
    const frontPinyinValue = document.getElementById('edit-my-flashcard-pinyin')?.value;
    openFlashcardResetConfirm(async () => {
      const result = await updateOwnFlashcardContent(c.id, {
        front,
        backTrans: back,
        note,
        frontPinyin: frontPinyinValue,
        frontIsTargetLanguage,
        revision: nextRevision,
      });
      if (!result.ok){ errorEl.textContent = result.error; return; }
      // Reflete o reset NA MESMA sessão -- ver comentário de
      // replaceSelfFlashcardInState() (fr/zh app.js).
      if (typeof replaceSelfFlashcardInState === 'function'){
        replaceSelfFlashcardInState(c.id, { ...c, front, back_trans: back, note, front_pinyin: frontPinyinValue, front_is_target_language: frontIsTargetLanguage, revision: nextRevision });
      }
      showToast('✓ Cartão editado. O progresso de revisão foi reiniciado.');
      MY_FLASHCARDS_STATE.editingCardId = null;
      renderMyFlashcardsView();
    });
  });
}

function wireMyFlashcardsForm(wrap, atLimit){
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
    const directionRadio = wrap.querySelector('input[name="my-flashcard-direction"]:checked');
    const frontIsTargetLanguage = directionRadio ? directionRadio.value !== 'target-back' : true;
    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY,
      front: document.getElementById('my-flashcard-front').value,
      backTrans: document.getElementById('my-flashcard-back').value,
      note: document.getElementById('my-flashcard-note').value,
      frontPinyin: document.getElementById('my-flashcard-pinyin')?.value,
      frontIsTargetLanguage,
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
}

function wireMyFlashcardsCardButtons(wrap){
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

  wrap.querySelectorAll('[data-edit-own-flashcard]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Number(...) -- c.id vem do Supabase como número; dataset é sempre
      // string, e a comparação `===` em myFlashcardRowHTML()/renderMyFlashcardsView()
      // precisa dos dois lados no mesmo tipo (mesmo bug já evitado em
      // admin-flashcards.js, ver ADMIN_FLASHCARDS_STATE.editingCardId).
      MY_FLASHCARDS_STATE.editingCardId = Number(btn.dataset.editOwnFlashcard);
      renderMyFlashcardsView();
    });
  });

  // Prop 4 -- delete físico de verdade (grillado: a autora aceita perder o
  // histórico de revisão pra poder remover um cartão criado por engano;
  // "arquivar" não resolve porque o cartão continuaria visível na lista).
  wrap.querySelectorAll('[data-delete-own-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteOwnFlashcard;
      if (!confirm('Isso vai apagar o cartão e todo o histórico de revisão permanentemente. Não pode ser desfeito. Continuar?')) return;
      const result = await deleteOwnFlashcardPermanently(id);
      if (!result.ok){ showToast('Não foi possível apagar o cartão agora.'); return; }
      if (typeof removeSelfFlashcardFromState === 'function') removeSelfFlashcardFromState(id);
      showToast('✓ Cartão apagado.');
      renderMyFlashcardsView();
    });
  });
}

// ---------- Prop 6 (ver CLAUDE.md, "7 propostas") -- exportar/importar
// cartões próprios entre alunos ----------
// Formato do payload: { languageAppKey, cards: [{front, frontPinyin, backTrans, note}, ...] }
// -- nunca ids/timestamps/status (cada importação cria linhas NOVAS na
// conta de quem importa, nunca tenta sincronizar/atualizar cartões
// existentes). `languageAppKey` é checado na importação -- um cartão de
// mandarim nunca pode ser importado numa conta logada em fr/, e vice-versa
// (rejeição explícita, não silenciosa).
function myFlashcardsExportPayload(cardsToExport){
  return {
    languageAppKey: APP_KEY,
    cards: cardsToExport.map(c => ({
      front: c.front,
      frontPinyin: c.front_pinyin || null,
      backTrans: c.back_trans,
      note: c.note || null,
      frontIsTargetLanguage: c.front_is_target_language !== false,
    })),
  };
}

function openMyFlashcardsExportModal(cardsToExport){
  if (!cardsToExport.length){ showToast('Você não tem nenhum cartão ativo pra exportar.'); return; }
  const payload = myFlashcardsExportPayload(cardsToExport);
  const json = JSON.stringify(payload, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const shareUrl = `${location.origin}${location.pathname}#import=${base64}`;

  let modal = document.getElementById('my-flashcards-export-modal');
  if (!modal){
    modal = document.createElement('div');
    modal.id = 'my-flashcards-export-modal';
    modal.className = 'app-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="app-modal">
      <div class="app-modal-header">
        <h3>⬇️ Exportar cartões (${cardsToExport.length})</h3>
        <button class="app-modal-close" id="my-flashcards-export-close" aria-label="Fechar">✕</button>
      </div>
      <div class="app-modal-body">
        <p class="profile-edit-hint">Baixe um arquivo .json pra dar pra outro aluno importar, ou copie o link de compartilhamento -- os dois têm o mesmo conteúdo.</p>
        <div style="display:flex; gap:10px; margin:10px 0;">
          <button type="button" class="btn btn-secondary" id="my-flashcards-export-download" style="flex:1;">⬇️ Baixar .json</button>
          <button type="button" class="btn btn-secondary" id="my-flashcards-export-copy-link" style="flex:1;">🔗 Copiar link</button>
        </div>
        <p class="profile-edit-error" id="my-flashcards-export-feedback" style="color:var(--jade);"></p>
      </div>
    </div>
  `;
  const close = () => { modal.style.display = 'none'; };
  document.getElementById('my-flashcards-export-close').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  document.getElementById('my-flashcards-export-download').onclick = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus-cartoes-${APP_KEY}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  document.getElementById('my-flashcards-export-copy-link').onclick = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      document.getElementById('my-flashcards-export-feedback').textContent = '✓ Link copiado!';
    } catch {
      document.getElementById('my-flashcards-export-feedback').textContent = shareUrl;
    }
  };
}

async function handleMyFlashcardsImportFile(file){
  if (!file) return;
  const errorEl = document.getElementById('my-flashcards-import-error');
  errorEl.textContent = '';
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await confirmAndImportMyFlashcards(payload, errorEl);
  } catch {
    errorEl.textContent = 'Não foi possível ler este arquivo. Confirme que é um .json exportado por esta tela.';
  }
}

function maybeAutoImportFromUrl(){
  const hash = location.hash || '';
  const match = hash.match(/[#&]import=([^&]+)/);
  if (!match) return;
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
    const errorEl = document.getElementById('my-flashcards-import-error');
    confirmAndImportMyFlashcards(payload, errorEl);
  } catch {
    // Link malformado/corrompido -- ignora silenciosamente, sem travar o
    // resto da tela por causa de um parâmetro de URL que a aluna nem
    // necessariamente sabia que estava ali.
  } finally {
    // Remove o parâmetro da URL depois de tentar importar -- evita reimportar
    // os mesmos cartões de novo a cada re-render/refresh desta tela.
    history.replaceState(null, '', location.pathname + location.search);
  }
}

async function confirmAndImportMyFlashcards(payload, errorEl){
  if (!payload || !Array.isArray(payload.cards) || !payload.cards.length){
    if (errorEl) errorEl.textContent = 'Arquivo/link não tem nenhum cartão pra importar.';
    return;
  }
  if (payload.languageAppKey !== APP_KEY){
    if (errorEl) errorEl.textContent = `Esses cartões são de outro idioma (${payload.languageAppKey}) -- não podem ser importados aqui.`;
    return;
  }
  if (!confirm(`Importar ${payload.cards.length} cartão(ões) pra sua conta?`)) return;
  let importedCount = 0;
  for (const card of payload.cards){
    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY,
      front: card.front,
      backTrans: card.backTrans,
      note: card.note,
      frontPinyin: card.frontPinyin,
      frontIsTargetLanguage: card.frontIsTargetLanguage,
    });
    if (result.ok){
      importedCount++;
      if (typeof addSelfFlashcardToState === 'function') addSelfFlashcardToState(result.card);
    }
  }
  showToast(`✓ ${importedCount} cartão(ões) importado(s).`);
  renderMyFlashcardsView();
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
