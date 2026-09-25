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
const MY_FLASHCARDS_STATE = { editingCardId: null, _cardsCache: [], nativeCardState: createNativeNoteEditorState({ cardGenerationMode: 'normal' }) };

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

async function renderMyFlashcardsView(){
  const wrap = document.getElementById('my-flashcards-content');
  if (!wrap) return;
  if (!CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">Entre na sua conta pra criar seus próprios cartões.</p>`;
    return;
  }
  // Fase 6D.2 (ver CLAUDE.md) -- nativeCardState reinicia a cada render
  // COMPLETO (carregamento inicial + depois de um submit bem sucedido),
  // mesmo ciclo de vida do resto do formulário. Mesmo padrão de
  // ADMIN_FLASHCARDS_STATE em shared/admin-flashcards.js.
  MY_FLASHCARDS_STATE.nativeCardState = createNativeNoteEditorState({ cardGenerationMode: 'normal' });
  wrap.innerHTML = loadingHTML();

  const isMandarim = APP_KEY === 'mandarim';
  const [cards, hasLink, planTier] = await Promise.all([
    fetchMyOwnFlashcards(APP_KEY),
    hasActiveTeacherLink(),
    fetchMyPlanTier(),
  ]);
  const premium = planTier === 'premium';
  MY_FLASHCARDS_STATE._cardsCache = cards;
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  const atLimit = !hasLink && activeCards.length >= FREE_OWN_FLASHCARD_LIMIT;

  // Selo de tier -- eixo de QUANTIDADE (vínculo com professora) continua
  // separado do eixo de PREMIUM (formatos ricos) -- ver comentário em
  // shared/roles.js. Uma conta pode mostrar os dois selos juntos.
  const tierBadgeHTML = (hasLink
    ? `<span class="pill">✨ Aluno vinculado — cartões ilimitados</span>`
    : `<span class="pill">🔒 Plano grátis — ${activeCards.length}/${FREE_OWN_FLASHCARD_LIMIT} cartões</span>`)
    + (premium ? `<span class="pill">⭐ Premium</span>` : '');

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span>Novo cartão</span>
        ${tierBadgeHTML}
      </div>
      <form id="my-create-flashcard-form" class="profile-edit-form">
        ${premium ? `
        <div class="section-label" style="margin:0 0 6px;">Modo de prática</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="my-flashcard-mode" value="flip" checked> Flashcard normal — vira o cartão pra ver a resposta
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="my-flashcard-mode" value="mc"> Múltipla escolha — escolhe entre opções
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400; margin-bottom:10px;">
          <input type="radio" name="my-flashcard-mode" value="cloze"> Completar a frase — digita a palavra que falta
        </label>
        ` : `
        <p class="profile-edit-hint">🔒 <strong>Premium</strong> desbloqueia imagem, áudio, múltipla escolha e completar a frase nos seus próprios cartões. Fale com a administração pra ativar.</p>
        `}
        <div id="my-flashcard-direction-wrap" style="${isMandarim ? 'display:none;' : ''}">
        <div class="section-label" style="margin:0 0 4px;">Idioma de cada lado</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="my-flashcard-direction" value="target-front" checked> ${myFlashcardDirectionLabels().targetFirst}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400; margin-bottom:10px;">
          <input type="radio" name="my-flashcard-direction" value="target-back"> ${myFlashcardDirectionLabels().nativeFirst}
        </label>
        </div>
        ${premium ? `
        <!-- Fase 6D.2 da reestruturação Note/CardType/CardInstance (ver
             CLAUDE.md) -- seletor NOVO, aditivo, ao lado do "Modo de
             prática" legado acima (que continua sendo o único lido na
             hora de salvar). Mesmo padrão de shared/admin-flashcards.js:
             só muta MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode,
             zero efeito no cartão criado nesta subfase. Gated por premium,
             mesmo critério do bloco "Modo de prática" acima -- sem isso,
             uma conta grátis veria um seletor de 5 tipos sem nenhum dos 3
             campos correspondentes na tela. -->
        <div class="section-label" style="margin:14px 0 4px;">Card Type (novo motor -- pré-visualização, Fase 6D)</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Seletor novo, ainda em construção -- não afeta o cartão criado. O "Modo de prática" acima continua sendo o que decide o cartão salvo de fato.</p>
        <select id="my-flashcard-card-type-preview" class="profile-edit-input">
          ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === 'normal' ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>

        <!-- Fase 6D.3 da reestruturação Note/CardType/CardInstance (ver
             CLAUDE.md) -- mesmo editor de Fields nativos reutilizável de
             shared/admin-flashcards.js (shared/flashcard-field-editor.js),
             conectado a MY_FLASHCARDS_STATE.nativeCardState.fields. Gated
             por premium, mesmo critério do seletor de Card Type acima. -->
        <div class="section-label" style="margin:14px 0 4px;">Campos nativos (novo motor -- pré-visualização, Fase 6D)</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Ainda não afeta o cartão criado -- só o novo estado nativo, em construção.</p>
        <div id="my-flashcard-native-fields"></div>
        ` : ''}
        <div id="my-flashcard-content-main">
        <label class="profile-edit-label" id="my-flashcard-front-label" for="my-flashcard-front">Frente</label>
        <textarea id="my-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="${isMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}"></textarea>
        ${isMandarim ? `
        <label class="profile-edit-label" for="my-flashcard-pinyin">Pinyin</label>
        <input type="text" id="my-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
        ` : ''}
        <label class="profile-edit-label" id="my-flashcard-back-label" for="my-flashcard-back">Verso</label>
        <textarea id="my-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="ex: a biblioteca"></textarea>
        ${premium ? `
        <div id="my-flashcard-mc-fields" style="display:none; margin:4px 0 0;">
          <label class="profile-edit-label" for="my-flashcard-mc-1">Outras opções — opção errada 1</label>
          <input type="text" id="my-flashcard-mc-1" class="profile-edit-input" autocomplete="off">
          <label class="profile-edit-label" for="my-flashcard-mc-2">Opção errada 2 (opcional)</label>
          <input type="text" id="my-flashcard-mc-2" class="profile-edit-input" autocomplete="off">
          <label class="profile-edit-label" for="my-flashcard-mc-3">Opção errada 3 (opcional)</label>
          <input type="text" id="my-flashcard-mc-3" class="profile-edit-input" autocomplete="off">
        </div>` : ''}
        </div>
        ${premium ? `
        <div id="my-flashcard-content-cloze" style="display:none;">
          <label class="profile-edit-label" for="my-flashcard-cloze-sentence">Frase com lacuna (use ___ pra marcar o espaço)</label>
          <input type="text" id="my-flashcard-cloze-sentence" class="profile-edit-input" placeholder="${isMandarim ? 'ex: 我 ___ 巴西人。' : 'ex: Je ___ de Paris.'}" autocomplete="off">
          <label class="profile-edit-label" for="my-flashcard-cloze-answer">Resposta certa</label>
          <input type="text" id="my-flashcard-cloze-answer" class="profile-edit-input" placeholder="${isMandarim ? 'ex: 是' : 'ex: viens'}" autocomplete="off">
          <div id="my-flashcard-cloze-pinyin-wrap" style="display:none;">
            <label class="profile-edit-label" for="my-flashcard-cloze-pinyin">Pinyin da resposta (é o que você vai digitar)</label>
            <input type="text" id="my-flashcard-cloze-pinyin" class="profile-edit-input" placeholder="ex: shì" autocomplete="off">
          </div>
          <label class="profile-edit-label" for="my-flashcard-cloze-trans">Tradução (mostrada depois de responder)</label>
          <input type="text" id="my-flashcard-cloze-trans" class="profile-edit-input" placeholder="ex: Eu venho de Paris." autocomplete="off">
        </div>` : ''}
        <label class="profile-edit-label" for="my-flashcard-note">Nota (opcional)</label>
        <textarea id="my-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="contexto, dica de uso..."></textarea>
        ${premium ? `
        <label class="profile-edit-label" for="my-flashcard-image">Imagem (opcional)</label>
        <input type="file" id="my-flashcard-image" class="profile-edit-input" accept="image/*">
        <label class="profile-edit-label" for="my-flashcard-audio">Áudio próprio (opcional, além da pronúncia automática)</label>
        <input type="file" id="my-flashcard-audio" class="profile-edit-input" accept="audio/*">
        ` : ''}
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

  wireMyFlashcardsForm(wrap, atLimit, premium);
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
function myFlashcardEditFormHTML(c){
  const isMandarim = APP_KEY === 'mandarim';
  const direction = c.front_is_target_language === false ? 'target-back' : 'target-front';
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:10px;">
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

function wireMyFlashcardsForm(wrap, atLimit, premium){
  // Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md) -- só
  // existe pra quem é premium (os radios nem são renderizados pra quem não
  // é, ver renderMyFlashcardsView). Mesmo padrão de mode-toggle de
  // shared/admin-flashcards.js, sem a parte de multi-aluno (aqui é sempre
  // "pra mim mesma") nem a validação por campo (escopo reduzido de
  // propósito -- ver comentário no topo do arquivo).
  if (premium){
    wrap.querySelectorAll('input[name="my-flashcard-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const mode = wrap.querySelector('input[name="my-flashcard-mode"]:checked').value;
        document.getElementById('my-flashcard-content-main').style.display = mode === 'cloze' ? 'none' : '';
        document.getElementById('my-flashcard-content-cloze').style.display = mode === 'cloze' ? '' : 'none';
        document.getElementById('my-flashcard-mc-fields').style.display = mode === 'mc' ? '' : 'none';
        const isMandarim = APP_KEY === 'mandarim';
        document.getElementById('my-flashcard-cloze-pinyin-wrap').style.display = (mode === 'cloze' && isMandarim) ? '' : 'none';
        const directionWrapEl = document.getElementById('my-flashcard-direction-wrap');
        if (directionWrapEl && !isMandarim) directionWrapEl.style.display = mode === 'cloze' ? 'none' : '';
        document.getElementById('my-flashcard-front-label').textContent = mode === 'mc' ? 'Pergunta/termo' : 'Frente';
        document.getElementById('my-flashcard-back-label').textContent = mode === 'mc' ? 'Resposta correta' : 'Verso';
      });
    });

    // Fase 6D.2 (ver CLAUDE.md) -- seletor NOVO, puramente aditivo: só
    // muta MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode, nunca
    // cria um campo paralelo/duplicado, não dispara chamada de rede, e não
    // altera a visibilidade dos blocos de Conteúdo legados (controlados só
    // pelo radio "Modo de prática" acima). O submit handler abaixo
    // continua lendo só esse radio legado -- a persistência nativa é a
    // Fase 6D.6. Só existe quando `premium` (mesmo gate do seletor no
    // HTML, ver renderMyFlashcardsView).
    document.getElementById('my-flashcard-card-type-preview')?.addEventListener('change', (e) => {
      const newMode = e.target.value;
      // Fase 6D.4a (ver CLAUDE.md) -- mesma transição dedicada de
      // shared/admin-flashcards.js ao trocar PRA multiple_choice.
      if (newMode === 'multiple_choice') transitionToMultipleChoice(MY_FLASHCARDS_STATE.nativeCardState);
      else MY_FLASHCARDS_STATE.nativeCardState.cardGenerationMode = newMode;
      refreshNativeCardTypeBox(document.getElementById('my-flashcard-native-fields'), MY_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'my-native' });
    });

    // Fase 6D.3/6D.4a (ver CLAUDE.md) -- caixa "Campos nativos", mesmo
    // padrão de shared/admin-flashcards.js. Só existe quando `premium`
    // (mesmo gate do bloco HTML acima, ver renderMyFlashcardsView).
    refreshNativeCardTypeBox(document.getElementById('my-flashcard-native-fields'), MY_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'my-native' });
  }

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
    const mode = premium ? (wrap.querySelector('input[name="my-flashcard-mode"]:checked')?.value || 'flip') : 'flip';
    const isCloze = mode === 'cloze';
    const isMC = mode === 'mc';

    btn.disabled = true;

    // Upload de imagem/áudio ANTES de criar o cartão -- mesmo padrão de
    // shared/admin-flashcards.js (a URL pública precisa existir pra gravar
    // junto no insert).
    let imageUrl = null, audioUrl = null;
    if (premium){
      const imageFile = document.getElementById('my-flashcard-image')?.files[0];
      const audioFile = document.getElementById('my-flashcard-audio')?.files[0];
      if (imageFile){
        const up = await uploadOwnFlashcardMedia(imageFile, 'image');
        if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
        imageUrl = up.url;
      }
      if (audioFile){
        const up = await uploadOwnFlashcardMedia(audioFile, 'audio');
        if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
        audioUrl = up.url;
      }
    }

    const directionRadio = wrap.querySelector('input[name="my-flashcard-direction"]:checked');
    const frontIsTargetLanguage = directionRadio ? directionRadio.value !== 'target-back' : true;
    const choices = isMC ? [
      document.getElementById('my-flashcard-mc-1').value,
      document.getElementById('my-flashcard-mc-2').value,
      document.getElementById('my-flashcard-mc-3').value,
    ] : [];
    const front = isCloze ? '' : document.getElementById('my-flashcard-front').value;
    const backTrans = isCloze ? document.getElementById('my-flashcard-cloze-trans').value : document.getElementById('my-flashcard-back').value;
    const clozeSentence = isCloze ? document.getElementById('my-flashcard-cloze-sentence').value : '';
    const clozeAnswer = isCloze ? document.getElementById('my-flashcard-cloze-answer').value : '';
    const clozeAnswerPinyin = isCloze ? document.getElementById('my-flashcard-cloze-pinyin')?.value : '';

    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY,
      front,
      backTrans,
      note: document.getElementById('my-flashcard-note').value,
      frontPinyin: isCloze ? '' : document.getElementById('my-flashcard-pinyin')?.value,
      frontIsTargetLanguage,
      imageUrl,
      audioUrl,
      choices,
      clozeSentence,
      clozeAnswer,
      clozeAnswerPinyin,
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
