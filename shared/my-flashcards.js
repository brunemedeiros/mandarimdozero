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
//   - shared/own-flashcards.js (fetchMyOwnFlashcards, createOwnFlashcard, uploadOwnFlashcardMedia, setOwnFlashcardStatus, updateOwnFlashcardContent, deleteOwnFlashcardPermanently)
//   - shared/roles.js              (hasActiveTeacherLink, fetchMyPlanTier)
//   - shared/toast.js              (showToast)
//   - shared/admin-flashcards.js   (openFlashcardResetConfirm, CARD_TYPE_UI_META -- carregado ANTES deste arquivo, mesma página, reaproveitado sem duplicar; ver Fase 6D.2 no CLAUDE.md)
//   - shared/flashcard-native-persistence.js (nativeNoteEditorStateFromLegacyRow,
//     validateNoteEditorStateForSave, nativeContentColumnsFromEditorState,
//     classifyFlashcardRowModel, legacyFlashcardConversionPreflight -- Fase 6D.6/6D.8;
//     nativeNoteEditorStateFromImportPayload -- CONSOLIDAÇÃO-6)
//   - shared/flashcard-mc-editor.js/flashcard-typeanswer-editor.js/flashcard-cloze-editor.js
//     (transitionToMultipleChoice/transitionToTypeAnswer/transitionToCloze/
//     stripClozeMarksFromEditorState/refreshNativeCardTypeBox -- carregados
//     ANTES deste arquivo; ver Fase 6D.4a/6D.4b/6D.5 no CLAUDE.md)
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

// Fase 6D.2 (ver CLAUDE.md) -- nativeCardState: mesmo papel de
// ADMIN_FLASHCARDS_STATE.nativeCardState (shared/admin-flashcards.js),
// começando sempre em cardGenerationMode:'normal'. `CARD_TYPE_UI_META`
// NÃO é redeclarado aqui -- admin-flashcards.js carrega antes desta view
// na mesma página (fr/zh index.html) e já declara essa constante no
// escopo global do documento; um segundo `const CARD_TYPE_UI_META` neste
// arquivo lançaria SyntaxError de redeclaração assim que este <script>
// rodasse (scripts separados compartilham o mesmo escopo léxico de
// top-level pra let/const), quebrando a página inteira -- mesmo motivo
// pelo qual openFlashcardResetConfirm já era só reaproveitada, nunca
// duplicada (ver "Depende de" no topo do arquivo).
// Fase 6D.6 (ver CLAUDE.md) -- editingNativeState: mesmo papel de
// ADMIN_FLASHCARDS_STATE.editingNativeState (shared/admin-flashcards.js) --
// Note editor state nativo do cartão em edição, só quando a edição está
// no editor novo. `null` = edição legada de sempre.
//
// CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- editingNativeConversionBaseline: mesmo
// papel de ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline -- clone
// do editorState no instante da conversão Legacy->Native, usado no save
// pra decidir se revision (e portanto FSRS) é preservado.
const MY_FLASHCARDS_STATE = { _decks: [], editingCardId: null, editingNativeState: null, editingNativeConversionBaseline: null, _cardsCache: [], nativeCardState: createNativeNoteEditorState({ cardGenerationMode: 'normal' }) };

// Grillado com a autora (ver CLAUDE.md, "rótulo do seletor de direção do
// cartão") -- rótulos com o nome do idioma de verdade em vez de "idioma
// estudado"/"tradução" genéricos. "Meus Cartões" é o caso simples do
// grilling: este bloco inteiro só aparece quando `!isMandarim`, e como
// cada site só ensina 1 idioma (APP_KEY fixo pra toda a sessão), o par
// alvo/nativo é sempre o mesmo -- sem lógica de seleção nenhuma, ao
// contrário de shared/admin-flashcards.js (multi-aluno, precisa recalcular
// por seleção). Cai pro texto genérico de sempre só se APP_KEY não tiver
// entrada no mapa (nunca deveria acontecer pro fr/zh reais, mas evita
// mostrar "undefined" se um idioma novo for adicionado sem atualizar
// FLASHCARD_DIRECTION_LANGUAGE_LABELS em admin-students.js).
function myFlashcardDirectionLabels(){
  const pair = FLASHCARD_DIRECTION_LANGUAGE_LABELS[APP_KEY];
  if (!pair){
    return {
      targetFirst: 'Frente no idioma estudado, verso na tradução (padrão)',
      nativeFirst: 'Frente na tradução, verso no idioma estudado',
    };
  }
  return {
    targetFirst: `Frente em ${pair.target} (com áudio), verso com tradução em ${pair.native}`,
    nativeFirst: `Frente na tradução em ${pair.native}, verso em ${pair.target} (com áudio)`,
  };
}

// ---------- Fase F -- Decks pessoais em "Meus Cartões" ----------
//
// Camada de UI mínima sobre o Deck Engine (shared/deck-engine.js) e a
// camada de dado (shared/deck-data.js) -- nenhuma regra de árvore/permissão
// é replicada aqui: só os Decks que canPlaceOwnNoteInDeck aceita como
// destino (personal_root + personal do próprio usuário) aparecem.
// Course/Teacher/outros usuários nunca são listados.

function personalDeckDepth(decks, deck){
  return getDeckAncestors(decks, deck.id).length;
}

// Decks pessoais ordenados em árvore (pai antes dos filhos), com a
// profundidade pra indentação. personal_root primeiro por construção.
function orderedPersonalDecks(decks){
  const mine = (decks || []).filter(d => ['personal_root', 'personal'].includes(d.kind) && d.owner_id === CURRENT_USER.id);
  const out = [];
  const walk = (parentId) => {
    mine.filter(d => (d.parent_deck_id || null) === parentId)
      .sort((a, b) => a.id - b.id)
      .forEach(d => { out.push(d); walk(d.id); });
  };
  const roots = mine.filter(d => d.kind === 'personal_root');
  roots.forEach(r => { out.push(r); walk(r.id); });
  return out;
}

function personalDeckOptionsHTML(decks){
  return orderedPersonalDecks(decks).map(d => {
    const pad = '\u00A0\u00A0'.repeat(Math.max(0, personalDeckDepth(decks, d) - 1));
    return `<option value="${d.id}">${pad}${escapeHTML(d.kind === 'personal_root' ? 'Meus Decks' : d.name)}</option>`;
  }).join('');
}

function personalDecksListHTML(decks){
  const cards = (typeof STATE !== 'undefined' && STATE.cards) || [];
  return orderedPersonalDecks(decks).map(d => {
    const pad = Math.max(0, personalDeckDepth(decks, d) - 1) * 16;
    const n = getStudyScopeForDeck(decks, d.id, cards).length;
    return `<div class="admin-badge-row" style="padding-left:${pad}px;">
      <span style="flex:1;">${escapeHTML(d.kind === 'personal_root' ? 'Meus Decks' : d.name)} <span class="profile-edit-hint">(${n} cartões)</span></span>
      <button type="button" class="btn btn-secondary" data-study-deck="${d.id}">Estudar este Deck</button>
    </div>`;
  }).join('');
}

// ---------- Fase G -- "Cartões da professora" (SOMENTE LEITURA) ----------
//
// Teacher Decks que a aluna RECEBEU (kind teacher_root/teacher com
// owner_id = ela; RLS decks_owner_select já a deixa LER, nunca escrever).
// Estruturalmente só-leitura: nenhum botão de criar/mover/apagar Deck nem de
// mudar o Deck de um cartão -- só "Estudar este Deck", que usa o MESMO
// caminho de sempre (startDeckReviewSession, Fase D; nenhuma fila/FSRS
// separados). Estudar um Teacher Deck estuda também os descendentes.
// Cópia para "Meus Decks" NÃO existe (fluxo futuro, fora da Fase G).
function teacherReceivedDecks(decks){
  return (decks || []).filter(d => ['teacher_root', 'teacher'].includes(d.kind) && d.owner_id === CURRENT_USER.id);
}

function teacherDecksReadOnlyHTML(decks){
  const mine = teacherReceivedDecks(decks);
  if (!mine.length) return '';
  const cards = (typeof STATE !== 'undefined' && STATE.cards) || [];
  const rows = orderedTeacherDecks(decks, mine).map(({ deck, depth }) => {
    const n = getStudyScopeForDeck(decks, deck.id, cards).length;
    return `<div class="admin-badge-row" style="padding-left:${depth * 16}px;">
      <span style="flex:1;">${escapeHTML(deck.name)} <span class="profile-edit-hint">(${n} cartões)</span></span>
      <button type="button" class="btn btn-secondary" data-study-deck="${deck.id}" ${n ? '' : 'disabled'}>Estudar este Deck</button>
    </div>`;
  }).join('');
  return `<div class="profile-section" id="teacher-decks-section">
      <div class="section-label">Cartões da professora</div>
      <p class="profile-edit-hint">Decks organizados pela sua professora. Aqui você só estuda; ela cuida da organização.</p>
      <div id="teacher-decks-list">${rows}</div>
    </div>`;
}

function wireMyDecksSection(wrap){
  wrap.querySelectorAll('[data-study-deck]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Único caminho de estudo por Deck: startDeckReviewSession (fr/zh
      // app.js, Fase D) -- mesma fila/FSRS do Review, nenhuma fila nova.
      if (typeof startDeckReviewSession === 'function') startDeckReviewSession(Number(btn.dataset.studyDeck));
    });
  });
  document.getElementById('my-deck-new-btn')?.addEventListener('click', async () => {
    const errEl = document.getElementById('my-deck-error');
    errEl.textContent = '';
    const res = await createPersonalDeck({
      name: document.getElementById('my-deck-new-name').value,
      parentDeckId: Number(document.getElementById('my-deck-new-parent').value),
      languageAppKey: APP_KEY,
      decks: MY_FLASHCARDS_STATE._decks,
    });
    if (!res.ok){ errEl.textContent = res.error; return; }
    renderMyFlashcardsView();
  });
}

async function renderMyFlashcardsView(opts){
  const wrap = document.getElementById('my-flashcards-content');
  if (!wrap) return;
  if (!CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">Entre na sua conta pra criar seus próprios cartões.</p>`;
    return;
  }
  // Fase 6D.2/6D.5 (ver CLAUDE.md) -- nativeCardState reinicia a cada
  // render COMPLETO (carregamento inicial + depois de um submit bem
  // sucedido), mesmo ciclo de vida do resto do formulário. Mesmo padrão
  // de ADMIN_FLASHCARDS_STATE em shared/admin-flashcards.js. `APP_KEY` já
  // é acessível aqui dentro (função chamada só pós-boot) -- diferente do
  // admin (que mistura idiomas entre alunos selecionados), aqui a conta
  // só tem UM idioma relevante, o do site, então `languageAppKey` é
  // sempre `APP_KEY` diretamente, sem precisar de um sinal `anyMandarim`.
  MY_FLASHCARDS_STATE.nativeCardState = createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: APP_KEY });
  // CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- bug real encontrado e corrigido
  // aqui: `editingNativeState`/`editingNativeConversionBaseline` eram
  // SEMPRE zerados aqui, incondicionalmente, ANTES do primeiro `await`
  // desta função -- o corpo síncrono de uma função `async` roda no MESMO
  // tick de quem a chama. O clique em "Usar o novo editor"
  // (wireMyFlashcardEditForm) setava os dois e IMEDIATAMENTE chamava
  // renderMyFlashcardsView(), cujo início síncrono zerava os dois de
  // volta antes de qualquer render acontecer -- a conversão nunca
  // aparecia na tela (a aluna via o mesmo formulário legado de novo, sem
  // nenhum erro visível). `opts.preserveEditingNativeState` é o único
  // call site (o clique de "Usar o novo editor") que precisa pular este
  // reset -- todos os outros (novo clique de editar, cancelar, salvar)
  // já querem `null` mesmo, então continuam sem passar `opts`.
  if (!(opts && opts.preserveEditingNativeState)){
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
  }
  wrap.innerHTML = loadingHTML();

  const isMandarim = APP_KEY === 'mandarim';
  // Fase F -- Decks pessoais carregados sob demanda (bootstrap idempotente
  // + leitura); STATE.decks é atualizado pra "Estudar este Deck"
  // (startDeckReviewSession) nunca enxergar uma lista velha.
  const [cards, hasLink, planTier, decks] = await Promise.all([
    fetchMyOwnFlashcards(APP_KEY),
    hasActiveTeacherLink(),
    fetchMyPlanTier(),
    ensureDecksForCurrentUser(APP_KEY).then(() => fetchDecksForLanguage(APP_KEY)),
  ]);
  const premium = planTier === 'premium';
  MY_FLASHCARDS_STATE._cardsCache = cards;
  MY_FLASHCARDS_STATE._decks = decks;
  MY_FLASHCARDS_STATE._hasLink = hasLink;
  if (typeof STATE !== 'undefined') STATE.decks = decks;
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  // Fase F -- o teto conta CardInstances (regra única em shared/deck-engine.js),
  // nunca linhas.
  const usedInstances = ownCardInstanceUsage(cards);
  const atLimit = !hasLink && usedInstances >= FREE_OWN_FLASHCARD_LIMIT;

  // Selo de tier -- eixo de QUANTIDADE (vínculo com professora) continua
  // separado do eixo de PREMIUM (formatos ricos) -- ver comentário em
  // shared/roles.js. Uma conta pode mostrar os dois selos juntos.
  const tierBadgeHTML = (hasLink
    ? `<span class="pill">✨ Aluno vinculado — cartões ilimitados</span>`
    : `<span class="pill">🔒 Plano grátis — ${usedInstances}/${FREE_OWN_FLASHCARD_LIMIT} cartões</span>`)
    + (premium ? `<span class="pill">⭐ Premium</span>` : '');

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span>Novo cartão</span>
        ${tierBadgeHTML}
      </div>
      <form id="my-create-flashcard-form" class="profile-edit-form">
        <!-- CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- criação passou a ser SEMPRE
             nativa, nos dois tiers: não existe mais formulário legado de
             criação (Modo de prática/Idioma de cada lado/Frente-Verso
             soltos/campo de imagem-áudio de cartão inteiro). Free/Premium
             agora só decide QUAIS Card Types (cardTypeUIMetaForEntitlement)
             e QUAIS origens de áudio por Field (allowedAudioOrigins,
             threaded em wireMyFlashcardsForm) aparecem nos seletores --
             nunca se o editor nativo em si está disponível. Editar um
             cartão LEGADO já existente continua no formulário legado de
             sempre (myFlashcardEditFormHTML, intocado) -- isto é só
             CRIAÇÃO de um cartão novo. -->
        ${premium ? '' : `<p class="profile-edit-hint">🔒 No plano grátis você cria cartões do tipo Normal, com upload de imagem/áudio por campo (URL externa também disponível). <strong>Premium</strong> desbloqueia Normal com reverso, Múltipla escolha, Completar a frase, Digite a resposta, além de gerar áudio por texto e gravar áudio pelo microfone.</p>`}
        <div class="section-label" style="margin:0 0 4px;">Tipo de cartão</div>
        <select id="my-flashcard-card-type-preview" class="profile-edit-input">
          ${cardTypeUIMetaForEntitlement(premium).map(t => `<option value="${t.id}" ${t.id === 'normal' ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
        <div class="section-label" style="margin:14px 0 4px;">Campos</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Adicione os campos deste cartão -- por exemplo, Frente e Verso pra um cartão Normal. Cada campo tem seu próprio idioma e seus próprios recursos de áudio.</p>
        <div id="my-flashcard-native-fields"></div>
        <button type="button" class="admin-select-link" id="my-flashcard-preview-btn" style="background:none; border:none; cursor:pointer; margin:6px 0 0;">👁️ Pré-visualizar</button>
        <label class="profile-edit-label" for="my-flashcard-deck" style="margin-top:14px;">Deck de destino</label>
        <select id="my-flashcard-deck" class="profile-edit-input">${personalDeckOptionsHTML(decks)}</select>
        <label class="profile-edit-label" for="my-flashcard-note" style="margin-top:14px;">Nota (opcional)</label>
        <textarea id="my-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="contexto, dica de uso..."></textarea>
        <p class="profile-edit-error" id="my-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="my-create-flashcard-btn" ${atLimit ? 'disabled' : ''}>${atLimit ? 'Limite atingido' : 'Criar cartão'}</button>
      </form>
    </div>

    <div class="profile-section" id="my-decks-section">
      <div class="section-label">Meus Decks</div>
      <div id="my-decks-list">${personalDecksListHTML(decks)}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
        <input type="text" id="my-deck-new-name" class="profile-edit-input" placeholder="Nome do novo Deck" maxlength="60" style="flex:1; min-width:140px;">
        <select id="my-deck-new-parent" class="profile-edit-input" style="flex:1; min-width:140px;">${personalDeckOptionsHTML(decks)}</select>
        <button type="button" class="btn btn-secondary" id="my-deck-new-btn">+ Criar Deck</button>
      </div>
      <p class="profile-edit-error" id="my-deck-error"></p>
    </div>

    ${teacherDecksReadOnlyHTML(decks)}

    <div class="profile-section">
      <div class="section-label" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
        <span>Seus cartões ativos (${activeCards.length})</span>
        ${cards.length ? `<button type="button" class="admin-select-link" id="my-flashcards-export-btn" style="background:none; border:none; cursor:pointer;">⬇️ Exportar / compartilhar</button>` : ''}
      </div>
      <div id="my-flashcards-active-box">
        ${activeCards.length ? activeCards.map(c => myFlashcardRowHTML(c, premium)).join('') : `<p class="profile-empty-note">Você ainda não criou nenhum cartão. Use o formulário acima pra adicionar palavras/frases que quer memorizar, mesmo que não estejam na trilha.</p>`}
      </div>
    </div>

    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados historicamente (${archivedCards.length})</div>
      <div id="my-flashcards-archived-box">
        ${archivedCards.map(c => myFlashcardRowHTML(c, premium)).join('')}
      </div>
    </div>` : ''}

    <div class="profile-section">
      <div class="section-label">Importar cartões</div>
      <p class="profile-edit-hint">Recebeu um arquivo .json de outro aluno, ou um link de compartilhamento? Importe aqui -- só cartões do MESMO idioma que você está estudando (${isMandarim ? 'mandarim' : 'francês'}) podem ser importados.</p>
      <input type="file" id="my-flashcards-import-file" accept="application/json" style="margin-top:6px;">
      <p class="profile-edit-error" id="my-flashcards-import-error"></p>
    </div>

    <div class="profile-section">
      <div class="section-label">📥 Importar do Anki (.apkg)</div>
      <p class="profile-edit-hint">Tem um baralho do Anki? Escolha o arquivo .apkg exportado de lá -- você confere um resumo (quantos cartões, tipos, avisos) antes de confirmar, nada é importado sem sua confirmação.</p>
      <input type="file" id="anki-import-file" accept=".apkg" style="margin-top:6px;">
    </div>
  `;

  wireMyFlashcardsForm(wrap, atLimit, premium);
  wireMyFlashcardsCardButtons(wrap, premium);
  wireMyDecksSection(wrap);
  document.getElementById('anki-import-file')?.addEventListener('change', (e) => {
    if (typeof handleAnkiImportFileSelected === 'function') handleAnkiImportFileSelected(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('my-flashcards-export-btn')?.addEventListener('click', () => openMyFlashcardsExportModal(activeCards.concat(archivedCards).filter(c => c.status === 'active')));
  document.getElementById('my-flashcards-import-file')?.addEventListener('change', (e) => handleMyFlashcardsImportFile(e.target.files[0]));

  if (MY_FLASHCARDS_STATE.editingCardId != null){
    const editingCard = MY_FLASHCARDS_STATE._cardsCache.find(c => c.id === MY_FLASHCARDS_STATE.editingCardId);
    if (editingCard){
      if (MY_FLASHCARDS_STATE.editingNativeState){
        wireMyFlashcardNativeEditForm(editingCard, MY_FLASHCARDS_STATE.editingNativeState, wrap);
      } else {
        wireMyFlashcardEditForm(editingCard, wrap, premium);
      }
    }
  }

  maybeAutoImportFromUrl();
}

// CONSOLIDAÇÃO-3 (ver CLAUDE.md) -- mesma decisão de shared/admin-flashcards.js
// (flashcardCardRowHTML): "Arquivar" some da UX normal, sem substituto --
// um cartão ATIVO não tem mais nenhum botão de status. "Reativar" (↺)
// continua existindo só em cartões JÁ arquivados de antes desta fase,
// como via de recuperação -- nunca um jeito novo de "esconder"/"suspender"
// (é a ação INVERSA). Uma vez reativado, o cartão não tem mais botão de
// status nenhum. `setOwnFlashcardStatus` (shared/own-flashcards.js) não
// mudou -- só quem chama com `'archived'` deixou de existir na UI.
function myFlashcardRowHTML(c, premium){
  if (MY_FLASHCARDS_STATE.editingCardId === c.id){
    // Fase 6D.6 (ver CLAUDE.md) -- mesmo critério de
    // shared/admin-flashcards.js: cartão já nativo sempre edita no editor
    // novo (choices/cloze_sentence legados ficam null numa Note nativa,
    // o form legado não teria o que mostrar); seedado LAZY, só na
    // primeira vez que este cartão entra em edição nesta sessão.
    if (!MY_FLASHCARDS_STATE.editingNativeState && classifyFlashcardRowModel(c) === 'native'){
      MY_FLASHCARDS_STATE.editingNativeState = createNativeNoteEditorStateFromRow(c);
    }
    if (MY_FLASHCARDS_STATE.editingNativeState) return myFlashcardNativeEditFormHTML(c, MY_FLASHCARDS_STATE.editingNativeState);
    return myFlashcardEditFormHTML(c, premium);
  }
  return `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="admin-badge-delete-btn" data-preview-own-flashcard="${c.id}" title="Pré-visualizar como vai aparecer na Revisão">🔎</button>
        <button class="admin-badge-delete-btn" data-edit-own-flashcard="${c.id}" title="Editar">✏️</button>
        ${c.status === 'archived' ? `<button class="admin-badge-delete-btn" data-toggle-own-flashcard="${c.id}" data-next-status="active" title="Reativar (tirar do arquivo histórico)">↺</button>` : ''}
        <button class="admin-badge-delete-btn" data-toggle-own-flashcard-visibility="${c.id}" data-next-hidden="${c.hidden_from_profile ? 'false' : 'true'}" title="${c.hidden_from_profile ? 'Escondido do perfil -- clique pra tornar visível' : 'Visível no perfil (se a conta for pública) -- clique pra esconder'}">${c.hidden_from_profile ? '🙈' : '👁️'}</button>
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
function myFlashcardEditFormHTML(c, premium){
  const isMandarim = APP_KEY === 'mandarim';
  const direction = c.front_is_target_language === false ? 'target-back' : 'target-front';
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:10px;">
      ${premium ? `<button type="button" class="admin-select-link" id="edit-my-flashcard-use-native" style="align-self:flex-start; background:none; border:none; cursor:pointer; padding:0;">🧪 Usar o novo editor de campos (nativo) -- preserva o conteúdo já digitado</button>
      <p class="profile-edit-error" id="edit-my-flashcard-use-native-error"></p>` : ''}
      ${!isMandarim ? `
      <div>
        <div class="section-label" style="margin:0 0 4px;">Idioma de cada lado</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-my-flashcard-direction" value="target-front" ${direction === 'target-front' ? 'checked' : ''}> ${myFlashcardDirectionLabels().targetFirst}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-my-flashcard-direction" value="target-back" ${direction === 'target-back' ? 'checked' : ''}> ${myFlashcardDirectionLabels().nativeFirst}
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

function wireMyFlashcardEditForm(c, wrap, premium){
  // Fase 6D.6 (ver CLAUDE.md) -- mesma ação explícita de
  // shared/admin-flashcards.js: só existe quando `premium` (mesmo gate
  // do resto do editor nativo nesta tela). Monta o editorState a partir
  // do conteúdo JÁ EXISTENTE (nativeNoteEditorStateFromLegacyRow) --
  // nada é salvo até o clique em "Salvar" do formulário nativo.
  //
  // Fase 6D.8 (ver CLAUDE.md, Seção 6/18) -- mesmo preflight de
  // shared/admin-flashcards.js: bloqueia (sem trocar de tela) os 2 casos
  // em que o mapeamento é indeterminável (Cloze sem "___" exato, MC sem
  // resposta certa).
  document.getElementById('edit-my-flashcard-use-native')?.addEventListener('click', () => {
    const errorEl = document.getElementById('edit-my-flashcard-use-native-error');
    const preflight = legacyFlashcardConversionPreflight(c);
    if (!preflight.ok){ if (errorEl) errorEl.textContent = preflight.error; return; }
    if (errorEl) errorEl.textContent = '';
    MY_FLASHCARDS_STATE.editingNativeState = nativeNoteEditorStateFromLegacyRow(c);
    // CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- baseline capturado ANTES de
    // qualquer mutação do usuário (clone, mesmo mecanismo de
    // shared/admin-flashcards.js) -- é contra ISTO que o save compara pra
    // decidir se revision precisa incrementar.
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = cloneNoteEditorState(MY_FLASHCARDS_STATE.editingNativeState);
    if (c.image_url){
      showToast('⚠️ A imagem deste cartão foi preservada nos dados, mas ainda não aparece na tela de Revisão pra cartões do novo editor.');
    }
    // CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- `preserveEditingNativeState:true`
    // é obrigatório aqui: sem ele, o topo de renderMyFlashcardsView()
    // zeraria de volta o editingNativeState que acabamos de setar, no
    // MESMO tick síncrono (ver comentário completo lá) -- a conversão
    // nunca chegaria a aparecer na tela.
    renderMyFlashcardsView({ preserveEditingNativeState: true });
  });

  document.getElementById('edit-my-flashcard-cancel')?.addEventListener('click', () => {
    MY_FLASHCARDS_STATE.editingCardId = null;
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
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

// ---------- Fase 6D.6 (ver CLAUDE.md) -- edição de um cartão próprio
// NATIVO, ou conversão explícita de um legado (via o botão "Usar o novo
// editor de campos" acima) ----------
//
// Irmão de flashcardNativeEditFormHTML/wireFlashcardNativeEditForm
// (shared/admin-flashcards.js) -- mesmo componente reaproveitado
// (refreshNativeCardTypeBox/transitionToXxx/CARD_TYPE_UI_META), só
// chamando createOwnFlashcard()/updateOwnFlashcardContent() em vez das
// versões teacher_flashcards.
function myFlashcardNativeEditFormHTML(c, editorState){
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:10px;">
      <div class="section-label" style="margin:0;">Editar cartão (editor nativo)</div>
      <p class="profile-edit-hint" style="margin:0;">Este cartão usa o novo modelo de campos -- editando aqui, o conteúdo é gravado em fields/card_generation_mode, nunca nas colunas antigas.</p>
      <div class="section-label" style="margin:6px 0 4px;">Card Type</div>
      <select id="edit-my-native-flashcard-card-type" class="profile-edit-input">
        ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === editorState.cardGenerationMode ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select>
      <div id="edit-my-native-flashcard-fields"></div>
      <button type="button" class="admin-select-link" id="edit-my-native-flashcard-preview-btn" style="background:none; border:none; cursor:pointer; align-self:flex-start; padding:0;">👁️ Pré-visualizar</button>
      <label class="profile-edit-label">Nota (opcional)</label>
      <textarea id="edit-my-native-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(editorState.privateNote || '')}</textarea>
      <p class="profile-edit-error" id="edit-my-native-flashcard-error"></p>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-secondary" id="edit-my-native-flashcard-cancel" style="flex:1;">Cancelar</button>
        <button type="button" class="btn btn-primary" id="edit-my-native-flashcard-save" style="flex:1;">Salvar edição</button>
      </div>
    </div>
  `;
}

function wireMyFlashcardNativeEditForm(c, editorState, wrap){
  // Fase 7e (ver CLAUDE.md) -- mesmo par uploadFn/deleteFn de
  // shared/admin-flashcards.js, só que as versões "own" (aluna é dona do
  // conteúdo) -- shared/flashcard-field-editor.js nunca chama
  // supabaseClient/Storage direto, só através destas 2 funções.
  // Fase 7f (implementação -- ver CLAUDE.md) -- ttsFn/noteId (linha JÁ
  // existe de verdade nesta tela de EDIÇÃO) habilitam "Gerar áudio".
  const nativeFieldOpts = { namePrefix: 'edit-my-native', uploadFn: uploadOwnFlashcardMedia, deleteFn: deleteOwnFlashcardMedia, ttsFn: requestOwnFieldAudioTTS, noteId: editorState.noteId };
  const boxEl = document.getElementById('edit-my-native-flashcard-fields');
  refreshNativeCardTypeBox(boxEl, editorState, nativeFieldOpts);

  document.getElementById('edit-my-native-flashcard-card-type').addEventListener('change', (e) => {
    const newMode = e.target.value;
    const wasCloze = editorState.cardGenerationMode === 'cloze';
    if (wasCloze && newMode !== 'cloze') stripClozeMarksFromEditorState(editorState);
    if (newMode === 'multiple_choice') transitionToMultipleChoice(editorState);
    else if (newMode === 'type_answer') transitionToTypeAnswer(editorState);
    else if (newMode === 'cloze') transitionToCloze(editorState);
    else editorState.cardGenerationMode = newMode;
    refreshNativeCardTypeBox(boxEl, editorState, nativeFieldOpts);
  });

  // Fase 6D.7 (ver CLAUDE.md) -- Preview do rascunho de edição atual.
  document.getElementById('edit-my-native-flashcard-preview-btn')?.addEventListener('click', () => {
    openFlashcardPreviewFromEditorState(editorState, { appKey: APP_KEY, origin: 'self' });
  });

  document.getElementById('edit-my-native-flashcard-cancel').addEventListener('click', () => {
    // Fase 7e (ver CLAUDE.md) -- mesma compensação de
    // shared/admin-flashcards.js: cancelar descarta o rascunho, qualquer
    // áudio enviado nesta sessão de edição nunca chega a ser referenciado.
    compensateFreshMediaUploads(editorState);
    MY_FLASHCARDS_STATE.editingCardId = null;
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
    renderMyFlashcardsView();
  });

  document.getElementById('edit-my-native-flashcard-save').addEventListener('click', () => {
    const errorEl = document.getElementById('edit-my-native-flashcard-error');
    errorEl.textContent = '';
    editorState.privateNote = (document.getElementById('edit-my-native-flashcard-note').value || '').trim() || null;
    const v = validateNoteEditorStateForSave(editorState);
    if (!v.ok){ errorEl.textContent = v.error; return; }

    // CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- mesma disciplina de
    // shared/admin-flashcards.js: decisão de revision inteira centralizada
    // em nextRevisionForNativeSave() (shared/flashcard-native-persistence.js,
    // comentário completo lá -- inclui a exceção documentada do Cloze) --
    // nunca duplicada aqui.
    const nextRevision = nextRevisionForNativeSave(c, editorState, MY_FLASHCARDS_STATE.editingNativeConversionBaseline);

    const doSave = async () => {
      const saveBtn = document.getElementById('edit-my-native-flashcard-save');
      if (saveBtn) saveBtn.disabled = true;
      const result = await updateOwnFlashcardContent(c.id, { revision: nextRevision, nativeState: editorState });
      if (saveBtn) saveBtn.disabled = false;
      if (!result.ok){
        // Fase 7e (ver CLAUDE.md, Seção 14) -- a Note não foi salva:
        // compensação best-effort do(s) áudio(s) enviado(s) nesta sessão.
        compensateFreshMediaUploads(editorState);
        errorEl.textContent = result.error;
        return;
      }
      clearFreshMediaUploads(editorState);
      // Reflete o reset NA MESMA sessão, mesmo motivo de sempre (ver
      // wireMyFlashcardEditForm acima) -- reconstrói o card via o motor
      // real (buildEngineCardsFromRow) a partir da linha atualizada, não
      // um objeto plano inventado à mão.
      if (typeof replaceSelfFlashcardInState === 'function'){
        replaceSelfFlashcardInState(c.id, Object.assign({}, c, { revision: nextRevision }, nativeContentColumnsFromEditorState(editorState)));
      }
      showToast(nextRevision > (c.revision || 0) ? '✓ Cartão editado. O progresso de revisão foi reiniciado.' : '✓ Cartão editado.');
      MY_FLASHCARDS_STATE.editingCardId = null;
      MY_FLASHCARDS_STATE.editingNativeState = null;
      MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
      renderMyFlashcardsView();
    };

    if (nextRevision > (c.revision || 0)){
      openFlashcardResetConfirm(doSave);
    } else {
      doSave();
    }
  });
}

function wireMyFlashcardsForm(wrap, atLimit, premium){
  // CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- criação passou a ser sempre nativa,
  // nos dois tiers. Free/Premium só afeta quais Card Types
  // (cardTypeUIMetaForEntitlement, já refletido no <select> renderido em
  // renderMyFlashcardsView) e quais origens de áudio por Field
  // (allowedAudioOrigins abaixo) aparecem nos seletores -- nunca se o
  // editor nativo em si está wireado. `wrap` não é mais usado pro
  // mode-toggle legado (removido -- não existe mais radio de "Modo de
  // prática" nesta tela), preservado só por compatibilidade de assinatura.
  const nativeFieldOpts = {
    namePrefix: 'my-native',
    uploadFn: uploadOwnFlashcardMedia,
    deleteFn: deleteOwnFlashcardMedia,
    ttsFn: requestOwnFieldAudioTTS,
    noteId: MY_FLASHCARDS_STATE.nativeCardState.noteId,
    // Fase 7h.1 (ver CLAUDE.md) -- matriz Free/Premium aprovada em
    // CONSOLIDAÇÃO-0: Free só vê Sem áudio/URL/Upload; TTS/Gravação ficam
    // atrás de Premium (mesmo filtro que já protegia essas 2 origens
    // quando o gate cobria o bloco inteiro -- agora que o bloco é sempre
    // visível, o filtro é quem faz esse trabalho). `undefined` (premium)
    // = sem restrição.
    allowedAudioOrigins: premium ? undefined : ['none', 'upload', 'url'],
  };

  // Fase 6D.2 (ver CLAUDE.md) -- seletor de Card Type: muta só
  // MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode, nunca cria um
  // campo paralelo/duplicado, não dispara chamada de rede. Sempre wireado
  // agora (Free só vê "Normal" nas opções, já filtrado no <select> --
  // nunca precisa deste listener ficar condicional a `premium`).
  document.getElementById('my-flashcard-card-type-preview')?.addEventListener('change', (e) => {
    const newMode = e.target.value;
    // Fase 6D.5 (ver CLAUDE.md, restrição 12) -- mesma proteção de
    // shared/admin-flashcards.js: sair do modo cloze nunca deixa sintaxe
    // {{cN::...}} presa num Field de outro Card Type, checado ANTES da
    // troca de modo.
    const wasCloze = MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode === 'cloze';
    if (wasCloze && newMode !== 'cloze') stripClozeMarksFromEditorState(MY_FLASHCARDS_STATE.nativeCardState);
    // Fase 6D.4a/6D.4b/6D.5 (ver CLAUDE.md) -- mesma transição dedicada de
    // shared/admin-flashcards.js ao trocar PRA multiple_choice/type_answer/cloze.
    if (newMode === 'multiple_choice') transitionToMultipleChoice(MY_FLASHCARDS_STATE.nativeCardState);
    else if (newMode === 'type_answer') transitionToTypeAnswer(MY_FLASHCARDS_STATE.nativeCardState);
    else if (newMode === 'cloze') transitionToCloze(MY_FLASHCARDS_STATE.nativeCardState);
    else MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode = newMode;
    refreshNativeCardTypeBox(document.getElementById('my-flashcard-native-fields'), MY_FLASHCARDS_STATE.nativeCardState, nativeFieldOpts);
  });

  // Fase 6D.3/6D.4a (ver CLAUDE.md) -- caixa "Campos nativos", mesmo
  // padrão de shared/admin-flashcards.js. Sempre wireada agora (era
  // `if(premium)` antes de CONSOLIDAÇÃO-1).
  // Fase 7e -- uploadFn/deleteFn (uploadOwnFlashcardMedia/
  // deleteOwnFlashcardMedia) habilitam o upload de áudio real por Field.
  // Fase 7f (implementação) -- ttsFn/noteId (sempre `null` aqui, o
  // rascunho ainda não foi salvo) habilitam "Gerar áudio" (Premium only,
  // via allowedAudioOrigins acima).
  refreshNativeCardTypeBox(document.getElementById('my-flashcard-native-fields'), MY_FLASHCARDS_STATE.nativeCardState, nativeFieldOpts);

  // Fase 6D.7 (ver CLAUDE.md) -- Preview do rascunho atual (não salvo).
  // languageAppKey aqui é sempre APP_KEY (o site fixa o idioma pra
  // "Meus Cartões" -- nunca precisa do fallback/mistura que
  // shared/admin-flashcards.js trata). Sempre wireado agora.
  document.getElementById('my-flashcard-preview-btn')?.addEventListener('click', () => {
    openFlashcardPreviewFromEditorState(MY_FLASHCARDS_STATE.nativeCardState, { appKey: APP_KEY, origin: 'self' });
  });

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

    // CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- criação sempre nativa agora, sem
    // bifurcação legado/nativo. CONSOLIDAÇÃO-6 -- `createOwnFlashcard()`
    // nem aceita mais os parâmetros legados (front/backTrans/...): só
    // `{languageAppKey, nativeState}`. Editar um cartão Legacy já
    // existente continua funcionando normalmente, mas por uma função
    // DIFERENTE (updateOwnFlashcardContent, myFlashcardEditFormHTML,
    // intocada -- edição nunca criou linha nova, fora do escopo desta
    // limpeza).
    const nativeState = MY_FLASHCARDS_STATE.nativeCardState;
    nativeState.privateNote = (document.getElementById('my-flashcard-note').value || '').trim() || null;
    const v = validateNoteEditorStateForSave(nativeState);
    if (!v.ok){ errorEl.textContent = v.error; return; }
    // Fase F -- preflight ANTES de persistir, pela regra canônica (limite
    // conta CardInstances: Normal=1, reverso=2, Cloze=N lacunas). Nada é
    // gravado se estourar -- e como o uso vem só de linhas já persistidas,
    // uma criação que falha depois nunca consome limite.
    const pre = preflightOwnCardInstanceCreation({
      activeRows: MY_FLASHCARDS_STATE._cardsCache,
      hasTeacherLink: !!MY_FLASHCARDS_STATE._hasLink,
      editorStates: [nativeState],
      languageAppKey: APP_KEY,
      limit: FREE_OWN_FLASHCARD_LIMIT,
    });
    if (!pre.ok){
      errorEl.textContent = `Este cartão geraria ${pre.requested} cartão(ões) de estudo, mas restam só ${pre.remaining} no plano grátis.`;
      document.getElementById('flashcard-limit-modal').style.display = 'flex';
      return;
    }
    btn.disabled = true;
    const deckSel = document.getElementById('my-flashcard-deck');
    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY, nativeState,
      deckId: deckSel && deckSel.value ? Number(deckSel.value) : undefined,
      decks: MY_FLASHCARDS_STATE._decks,
    });
    btn.disabled = false;
    if (!result.ok){
      // Fase 7e (ver CLAUDE.md, Seção 14) -- a Note nunca chegou a ser
      // criada -- compensação best-effort do(s) áudio(s) enviado(s)
      // nesta sessão.
      compensateFreshMediaUploads(nativeState);
      errorEl.textContent = result.error;
      return;
    }
    clearFreshMediaUploads(nativeState);
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
  // Fase 6D.7 (ver CLAUDE.md) -- Preview a partir de uma linha JÁ SALVA
  // (nativa ou legada). MY_FLASHCARDS_STATE._cardsCache já tem a lista
  // inteira (cache de renderMyFlashcardsView, sem round-trip novo).
  wrap.querySelectorAll('[data-preview-own-flashcard]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.previewOwnFlashcard);
      const card = MY_FLASHCARDS_STATE._cardsCache.find(c => c.id === id);
      if (!card){ openFlashcardPreviewWithError('Não foi possível carregar este cartão pra pré-visualizar.'); return; }
      openFlashcardPreviewFromRow(card, { appKey: APP_KEY, origin: 'self' });
    });
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

  // Fase 1 do perfil público (ver CLAUDE.md, grilling Q1) -- botão de olho,
  // posicionado ao lado do de Arquivar (mesmo pedido da autora), eixo
  // separado do status active/archived (ver comentário de
  // setOwnFlashcardHidden em shared/own-flashcards.js). Nenhuma
  // atualização em STATE.cards/addSelfFlashcardToState precisa acontecer
  // aqui -- diferente de arquivar/apagar, esconder do perfil não afeta a
  // fila de revisão, só o dado que renderPublicProfileInto lê da tabela.
  wrap.querySelectorAll('[data-toggle-own-flashcard-visibility]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.toggleOwnFlashcardVisibility;
      const nextHidden = btn.dataset.nextHidden === 'true';
      await setOwnFlashcardHidden(id, nextHidden);
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
      // Fase 6D.6 (ver CLAUDE.md) -- toda NOVA edição começa sem
      // editingNativeState -- myFlashcardRowHTML() semeia de novo se o
      // cartão for nativo, ou continua null (legado) até o botão "Usar o
      // novo editor" ser clicado.
      MY_FLASHCARDS_STATE.editingNativeState = null;
      MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
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
  // Fase F -- preflight único (mesma regra canônica da criação manual) e
  // Deck padrão (personal_root) resolvido UMA vez pro lote inteiro.
  const importStates = payload.cards.map(c => nativeNoteEditorStateFromImportPayload(c, APP_KEY));
  const pre = preflightOwnCardInstanceCreation({
    activeRows: MY_FLASHCARDS_STATE._cardsCache,
    hasTeacherLink: !!MY_FLASHCARDS_STATE._hasLink,
    editorStates: importStates,
    languageAppKey: APP_KEY,
    limit: FREE_OWN_FLASHCARD_LIMIT,
  });
  if (!pre.ok){
    document.getElementById('flashcard-limit-modal').style.display = 'flex';
    return;
  }
  const dest = await resolveOwnCreationDeck({ languageAppKey: APP_KEY });
  if (!dest.ok){ if (errorEl) errorEl.textContent = dest.error; return; }
  if (!confirm(`Importar ${payload.cards.length} cartão(ões) pra sua conta?`)) return;
  let importedCount = 0;
  for (const card of payload.cards){
    // CONSOLIDAÇÃO-6 (ver CLAUDE.md) -- cartão importado agora nasce
    // NATIVO (fields/card_generation_mode), nunca mais o branch Legacy de
    // createOwnFlashcard(). Reaproveita nativeNoteEditorStateFromImportPayload()
    // (shared/flashcard-native-persistence.js), que por sua vez reaproveita
    // o mesmo mapeamento front/back->Field já usado pra converter um
    // cartão Legacy existente -- nenhuma 2ª implementação.
    const nativeState = nativeNoteEditorStateFromImportPayload(card, APP_KEY);
    const result = await createOwnFlashcard({ languageAppKey: APP_KEY, nativeState, deckId: dest.deckId, decks: dest.decks });
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
