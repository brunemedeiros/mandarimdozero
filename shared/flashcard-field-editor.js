// ---------- Editor de Fields nativos, reutilizável -- Fase 6D.3 da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI que opera DIRETAMENTE sobre o Field state já definido na
// Fase 6D.1 (shared/flashcard-editor-state.js: createFieldState() ->
// {id, lang, role, content:{value}, audio, image, pinyinFieldId}) --
// nunca uma estrutura paralela (frontText/backText/fieldValue/etc.).
// Reutilizado por shared/admin-flashcards.js e shared/my-flashcards.js,
// conectado ao `editorState.nativeCardState` que a Fase 6D.2 já
// introduziu nos dois (ADMIN_FLASHCARDS_STATE.nativeCardState/
// MY_FLASHCARDS_STATE.nativeCardState).
//
// Escopo estrito desta subfase (ver relatório completo no CLAUDE.md):
// - Editor de Field genérico (conteúdo + idioma), sem UI de rich text.
// - IDs de Field são ESTÁVEIS -- editar conteúdo/idioma NUNCA cria um id
//   novo; só clonar um Field deliberadamente cria um id novo
//   (cloneFieldIntoEditorState).
// - `fields` continua sendo só ORDEM ESTRUTURAL do Note -- este módulo
//   nunca interpreta fields[0]/fields[1] como frente/verso; isso é
//   trabalho do resolver/renderer (shared/flashcard-model.js, Fase 6C),
//   nunca deste editor.
// - `lang` descreve o Field, nunca decide direção/CardType/áudio
//   automaticamente -- não recria frontIsTargetLanguage/isReverse.
// - `role` fica de fora da UI nesta subfase (Multiple Choice/Type Answer
//   ganham UI de role só nas Fases 6D.4a/6D.4b) -- mas é PRESERVADO ao
//   editar o resto do Field (nunca apagado por updateFieldInEditorState).
// - `audio`/`image`/`pinyinFieldId`: preservados através de qualquer
//   edição de texto/idioma; sem upload/TTS/player/UI de pinyin completa
//   ainda (só um indicador textual de que já existem, se existirem).
// - Não persiste nada (sem chamada de rede aqui) -- só muta o
//   editorState em memória; a gravação nativa é a Fase 6D.6.
// - Não cria CardInstance nem chama buildEngineCardsFromRow/
//   interpretNoteFromRow -- isso é do motor, nunca do editor.
//
// Depende de (mesma posição de shared/flashcard-editor-state.js -- antes
// de shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-editor-state.js (createFieldState, normalizeFieldContent)
//   - escapeHTML (fr/zh app.js -- já carregado antes de qualquer *-flashcards.js)

// Conjunto de idiomas conhecidos hoje pelo motor (ver STUDY_LANG_FOR_APP_KEY/
// isStudyLanguageField em shared/flashcard-model.js: 'fr'/'zh' pro idioma
// estudado, 'zh-pinyin' pro Field satélite de pinyin, 'pt-BR' pra
// tradução). Lista fechada mas ESTENDÍVEL -- quando um novo idioma de site
// existir (ex: português), um novo valor entra aqui, nunca inferido a
// partir de APP_KEY/direção (isso seria recriar frontIsTargetLanguage).
const FIELD_LANG_OPTIONS = [
  { value: 'fr', label: 'Francês' },
  { value: 'zh', label: 'Mandarim (chinês)' },
  { value: 'zh-pinyin', label: 'Pinyin' },
  { value: 'pt-BR', label: 'Português' },
];

function fieldLangLabel(lang){
  const found = FIELD_LANG_OPTIONS.find(o => o.value === lang);
  return found ? found.label : (lang ? lang : '(idioma não definido)');
}

// Fase 7b (ver CLAUDE.md) -- indicador textual reflete o `type` canônico
// de Field.audio em vez de um "tem áudio vinculado" genérico -- deixa
// visível a diferença entre um link externo, um upload, uma configuração
// de TTS ainda sem áudio gerado, e uma gravação futura. Shape legado/
// desconhecido (ex: `{url, source:'upload'}` de dado já persistido antes
// da Fase 7b) cai no fallback genérico -- nunca quebra a tela por causa
// de um `type` ausente. Reutilizado pela Fase 7e (renderFieldAudioBlockHTML,
// abaixo) como linha de status dentro do editor de áudio de verdade.
function fieldAudioIndicatorText(audio){
  if (!audio) return null;
  if (audio.type === 'tts') return audio.generatedUrl ? '🎧 áudio TTS gerado' : '🎧 TTS configurado (áudio ainda não gerado)';
  if (audio.type === 'recording') return audio.url ? '🎙️ gravação vinculada' : '🎙️ gravação configurada (ainda sem arquivo)';
  if (audio.type === 'url') return '🎧 áudio (link externo)';
  if (audio.type === 'upload') return '🎧 áudio (upload)';
  return '🎧 tem áudio vinculado';
}

// ---------- Editor de áudio por Field -- Fase 7e (ver CLAUDE.md) ----------
//
// Único componente de UI reutilizado por TODO Card Type que passa por
// renderFieldEditorHTML() (normal/normal_reversed/multiple_choice/
// type_answer, mais a TRADUÇÃO do cloze) -- e chamado A MAIS, direto,
// pelo Field de TEXTO do cloze (shared/flashcard-cloze-editor.js, que
// tem seu próprio editor visual e nunca passa por renderFieldEditorHTML).
// Nunca uma segunda implementação por Card Type -- exatamente o mesmo
// espírito de "Field editor genérico, sem conhecimento de Card Type" já
// travado desde a Fase 6D.3.
//
// Escopo desta subfase (Fase 7e): "Arquivo (upload)" é funcional -- URL
// externa/Gravação continuam só de espaço reservado (`<select>` nunca
// finge que funcionam). "Texto para voz" (Fase 7f -- implementação, ver
// CLAUDE.md) passou a ser um 3º ORIGEM FUNCIONAL, deliberadamente MÍNIMA
// (nunca o "seletor completo" descrito na auditoria da Fase 7f, Seção
// 20 -- sem lista de vozes vinda de um provedor real, sem indicador visual
// rico de "desatualizado", sem popover) -- só o necessário pra provar o
// contrato ponta a ponta: texto+idioma+voz(opcional)+velocidade+botão
// Gerar/Regenerar, reaproveitando os mesmos controles/classes CSS já
// calibrados no resto do editor (zero CSS novo).
const FIELD_AUDIO_ORIGIN_UI_META = [
  { value: 'none', label: 'Sem áudio' },
  { value: 'url', label: 'URL externa (em breve)' },
  { value: 'upload', label: 'Arquivo (upload)' },
  { value: 'tts', label: 'Texto para voz' },
  { value: 'recording', label: 'Gravação (em breve)' },
];

// Locale de síntese (audio.language) -- eixo DELIBERADAMENTE independente
// de Field.lang (idioma pedagógico), nunca derivado automaticamente (ver
// contrato da Fase 7b em shared/flashcard-model.js) -- só usado aqui pra
// SUGERIR um valor inicial no `<select>`, nunca gravado sozinho.
const TTS_LANGUAGE_UI_OPTIONS = [
  { value: '', label: '-- escolha o idioma --' },
  { value: 'fr-FR', label: 'Francês (fr-FR)' },
  { value: 'zh-CN', label: 'Mandarim (zh-CN)' },
  { value: 'pt-BR', label: 'Português (pt-BR)' },
];
function suggestedTtsLanguageForFieldLang(lang){
  if (lang === 'fr') return 'fr-FR';
  if (lang === 'zh' || lang === 'zh-pinyin') return 'zh-CN';
  if (lang === 'pt-BR') return 'pt-BR';
  return '';
}
const TTS_RATE_UI_OPTIONS = [
  { value: '0.8', label: 'Lento' },
  { value: '1', label: 'Normal' },
  { value: '1.2', label: 'Rápido' },
];

// Render puro -- nunca side-effect (mesmo I/O de rede que o Gerar áudio
// dispara vive só em wireFieldAudioBlockFor, abaixo). `resolveFieldAudioUrl`/
// `FIELD_AUDIO_UPLOAD_MIME_TYPES` vêm de shared/flashcard-model.js
// (carregado antes deste arquivo, ver "Depende de" no topo) -- checados
// defensivamente (`typeof ... !== 'undefined'`) só pra este arquivo nunca
// quebrar sozinho se algum dia for carregado fora de ordem num teste.
function renderFieldAudioBlockHTML(field, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'field-editor';
  const audio = field.audio || null;
  const originValue = audio ? audio.type : 'none';
  const resolvedUrl = (typeof resolveFieldAudioUrl === 'function') ? resolveFieldAudioUrl(audio) : null;
  const statusText = fieldAudioIndicatorText(audio) || 'Nenhum áudio configurado.';
  const acceptAttr = (typeof FIELD_AUDIO_UPLOAD_MIME_TYPES !== 'undefined') ? FIELD_AUDIO_UPLOAD_MIME_TYPES.join(',') : 'audio/*';

  const canGenerate = !!(opts.noteId) && typeof opts.ttsFn === 'function';
  const ttsAudio = (audio && audio.type === 'tts') ? audio : null;
  const ttsText = (ttsAudio && typeof ttsAudio.text === 'string' && ttsAudio.text) ? ttsAudio.text : (field.content.value || '');
  const ttsLanguage = (ttsAudio && ttsAudio.language) || suggestedTtsLanguageForFieldLang(field.lang);
  const ttsVoiceId = (ttsAudio && ttsAudio.voiceId) || '';
  const ttsRate = (ttsAudio && ttsAudio.rate !== null && ttsAudio.rate !== undefined) ? String(ttsAudio.rate) : '1';
  const generateLabel = (ttsAudio && ttsAudio.generatedUrl) ? '🔊 Regenerar áudio' : '🔊 Gerar áudio';

  const showUpload = originValue === 'upload' || originValue === 'none';
  const showTts = originValue === 'tts';

  return `
    <div class="field-audio-block" data-field-audio-field="${field.id}" style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--paper-line);">
      <label class="profile-edit-label" for="${namePrefix}-audio-origin-${field.id}">Áudio</label>
      <select id="${namePrefix}-audio-origin-${field.id}" class="profile-edit-input" data-field-audio-origin="${field.id}">
        ${FIELD_AUDIO_ORIGIN_UI_META.map(o => `<option value="${o.value}" ${originValue === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      <p class="profile-edit-hint" style="margin:2px 0 6px;">URL externa e gravação chegam em fases futuras -- use upload de arquivo ou texto para voz.</p>
      <p class="profile-edit-hint" data-field-audio-status="${field.id}" style="margin:0 0 4px;">${escapeHTML(statusText)}</p>
      ${resolvedUrl ? `<audio controls preload="none" style="width:100%; margin-bottom:6px;" src="${escapeHTML(resolvedUrl)}"></audio>` : ''}

      <div data-field-audio-panel-upload="${field.id}" style="${showUpload ? '' : 'display:none;'}">
        <input type="file" accept="${acceptAttr}" data-field-audio-file="${field.id}">
      </div>

      <div data-field-audio-panel-tts="${field.id}" style="${showTts ? '' : 'display:none;'}">
        ${canGenerate ? `
          <label class="profile-edit-label" for="${namePrefix}-audio-tts-text-${field.id}">Texto a sintetizar</label>
          <textarea id="${namePrefix}-audio-tts-text-${field.id}" class="profile-edit-input profile-edit-textarea" rows="2" data-field-audio-tts-text="${field.id}">${escapeHTML(ttsText)}</textarea>
          <label class="profile-edit-label" for="${namePrefix}-audio-tts-lang-${field.id}">Idioma da síntese</label>
          <select id="${namePrefix}-audio-tts-lang-${field.id}" class="profile-edit-input" data-field-audio-tts-lang="${field.id}">
            ${TTS_LANGUAGE_UI_OPTIONS.map(o => `<option value="${o.value}" ${ttsLanguage === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <label class="profile-edit-label" for="${namePrefix}-audio-tts-voice-${field.id}">Voz (opcional)</label>
          <input type="text" id="${namePrefix}-audio-tts-voice-${field.id}" class="profile-edit-input" placeholder="ex: padrão do provedor" value="${escapeHTML(ttsVoiceId)}" data-field-audio-tts-voice="${field.id}">
          <label class="profile-edit-label" for="${namePrefix}-audio-tts-rate-${field.id}">Velocidade</label>
          <select id="${namePrefix}-audio-tts-rate-${field.id}" class="profile-edit-input" data-field-audio-tts-rate="${field.id}">
            ${TTS_RATE_UI_OPTIONS.map(o => `<option value="${o.value}" ${ttsRate === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-secondary" style="margin-top:6px;" data-field-audio-tts-generate="${field.id}">${generateLabel}</button>
          <p class="profile-edit-hint" data-field-audio-tts-msg="${field.id}" style="margin:4px 0 0;"></p>
        ` : `<p class="profile-edit-hint">Salve o cartão primeiro para poder gerar áudio por texto.</p>`}
      </div>

      <p class="profile-edit-field-error" data-field-audio-error="${field.id}"></p>
      ${audio ? `<button type="button" class="admin-select-link" data-field-audio-remove="${field.id}">🗑 Remover áudio</button>` : ''}
    </div>
  `;
}

// Liga o bloco de áudio de UM Field (identificado por `fieldId`) dentro
// de `container` -- chamada tanto pelo wiring genérico
// (wireFieldEditorList, abaixo) quanto direto pelo editor de Cloze
// (shared/flashcard-cloze-editor.js, pro Field de frase, que nunca passa
// por wireFieldEditorList). `opts.uploadFn`/`opts.deleteFn` (Seção 7 --
// "mesma infraestrutura pros dois editores") vêm de quem integra
// (shared/admin-flashcards.js -> uploadFlashcardMedia/deleteFlashcardMedia;
// shared/my-flashcards.js -> uploadOwnFlashcardMedia/deleteOwnFlashcardMedia).
function wireFieldAudioBlockFor(container, editorState, fieldId, onChange, opts){
  opts = opts || {};
  const block = container.querySelector(`[data-field-audio-field="${fieldId}"]`);
  if (!block) return;
  const fileInput = block.querySelector('[data-field-audio-file]');
  const errorEl = block.querySelector('[data-field-audio-error]');
  const statusEl = block.querySelector('[data-field-audio-status]');
  const removeBtn = block.querySelector('[data-field-audio-remove]');
  const originSelect = block.querySelector('[data-field-audio-origin]');
  const uploadPanel = block.querySelector('[data-field-audio-panel-upload]');
  const ttsPanel = block.querySelector('[data-field-audio-panel-tts]');

  // Trocar de ORIGEM no `<select>` NUNCA sobrescreve field.audio sozinho
  // (decisão travada na auditoria da Fase 7c, item D5) -- exceto
  // escolher "Sem áudio" explicitamente, que é a ÚNICA outra forma
  // (além do botão "Remover áudio") de limpar a referência antes de
  // existir um ativo concreto novo. Trocar pra 'upload'/'tts' só alterna
  // QUAL PAINEL aparece (mutação de DOM local, nunca re-render da caixa
  // inteira -- mesma disciplina de "nunca perder o que a pessoa já
  // digitou" já usada em todo o resto deste arquivo).
  if (originSelect){
    originSelect.addEventListener('change', () => {
      const val = originSelect.value;
      if (uploadPanel) uploadPanel.style.display = (val === 'upload' || val === 'none') ? '' : 'none';
      if (ttsPanel) ttsPanel.style.display = (val === 'tts') ? '' : 'none';
      if (val === 'none'){
        updateFieldInEditorState(editorState, fieldId, { audio: null });
        if (onChange) onChange('structure', fieldId);
      }
    });
  }

  if (fileInput){
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (errorEl) errorEl.textContent = '';
      // Validação client-side ANTES de qualquer chamada de rede (Seção 4) --
      // uploadFn() valida de novo do lado do dado (mesma disciplina de
      // duas camadas já usada em toda a feature), mas checar aqui primeiro
      // evita gastar uma chamada de Storage num arquivo já sabidamente
      // inválido.
      if (typeof validateFieldAudioUploadFile === 'function'){
        const v = validateFieldAudioUploadFile(file);
        if (!v.ok){
          if (errorEl) errorEl.textContent = v.error;
          fileInput.value = '';
          return;
        }
      }
      if (typeof opts.uploadFn !== 'function'){
        if (errorEl) errorEl.textContent = 'Upload de áudio não está disponível nesta tela.';
        return;
      }
      fileInput.disabled = true;
      if (statusEl) statusEl.textContent = 'Enviando áudio...';
      const up = await opts.uploadFn(file, 'audio', fieldId);
      // Seção 8 (relatório da fase) -- guarda contra o container ter sido
      // removido do DOM enquanto o upload estava em voo (ex: a professora
      // cancelou a edição/trocou de Card Type antes do upload terminar) --
      // nunca mutar um editorState que a tela já abandonou, nunca tocar um
      // elemento desconectado.
      if (!block.isConnected) return;
      if (!up.ok){
        fileInput.disabled = false;
        fileInput.value = '';
        if (errorEl) errorEl.textContent = up.error || 'Não foi possível enviar o áudio agora.';
        if (statusEl){
          const currentField = (editorState.fields || []).find(f => f.id === fieldId);
          statusEl.textContent = fieldAudioIndicatorText(currentField && currentField.audio) || 'Nenhum áudio configurado.';
        }
        return; // Seção 2/9 -- upload falhou: o áudio anterior (se havia) permanece intacto, nada é sobrescrito.
      }
      // Seção 14 -- rastreia o upload recém-concluído NESTA sessão de
      // edição, pra a tela de integração poder compensar (best-effort
      // delete) se a gravação da Note falhar logo em seguida -- ver
      // shared/admin-flashcards.js/shared/my-flashcards.js, handlers de
      // submit/salvar, que leem editorState.__freshMediaUploads.
      editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
      editorState.__freshMediaUploads.push({ path: up.path, deleteFn: opts.deleteFn || null });
      // Só ATUALIZA field.audio depois do upload ter sucesso de verdade
      // (Seção 2/9) -- nunca antes.
      updateFieldInEditorState(editorState, fieldId, {
        audio: { type: 'upload', url: up.url, uploadedAt: new Date().toISOString(), mimeType: file.type || null },
      });
      if (onChange) onChange('structure', fieldId);
    });
  }

  // ---------- Fase 7f (TTS explícito por Field, implementação -- ver
  // CLAUDE.md) -- botão "Gerar/Regenerar áudio" ----------
  const ttsGenerateBtn = block.querySelector('[data-field-audio-tts-generate]');
  if (ttsGenerateBtn){
    ttsGenerateBtn.addEventListener('click', async () => {
      const textEl = block.querySelector('[data-field-audio-tts-text]');
      const langEl = block.querySelector('[data-field-audio-tts-lang]');
      const voiceEl = block.querySelector('[data-field-audio-tts-voice]');
      const rateEl = block.querySelector('[data-field-audio-tts-rate]');
      const msgEl = block.querySelector('[data-field-audio-tts-msg]');
      const text = (textEl && textEl.value) || '';
      const language = (langEl && langEl.value) || '';
      const voiceId = (voiceEl && voiceEl.value.trim()) || null;
      const rate = rateEl ? Number(rateEl.value) : null;

      if (errorEl) errorEl.textContent = '';
      if (typeof validateTtsGenerationRequest === 'function'){
        const v = validateTtsGenerationRequest({ text, language });
        if (!v.ok){
          if (errorEl) errorEl.textContent = v.error;
          return;
        }
      }
      if (typeof opts.ttsFn !== 'function' || !opts.noteId){
        if (errorEl) errorEl.textContent = 'Geração de áudio não está disponível nesta tela.';
        return;
      }

      // Concorrência (Seção 11 da auditoria da Fase 7f) -- calcula o
      // generationKey da config NO MOMENTO DO CLIQUE, antes de disparar a
      // requisição. Se a pessoa editar texto/idioma/voz/velocidade
      // enquanto a geração está em voo, a resposta que voltar é
      // comparada de novo contra a config ATUAL do formulário -- só
      // aplicada se ainda bater; senão é DESCARTADA silenciosamente
      // (nunca sobrescreve uma config mais nova com um resultado velho).
      const myKey = (typeof computeTtsGenerationKey === 'function')
        ? await computeTtsGenerationKey(text, language, voiceId, rate)
        : null;

      ttsGenerateBtn.disabled = true;
      const originalLabel = ttsGenerateBtn.textContent;
      ttsGenerateBtn.textContent = 'Gerando áudio...';
      if (msgEl) msgEl.textContent = '';

      const res = await opts.ttsFn({ rowId: opts.noteId, fieldId, text, language, voiceId, rate });

      if (!block.isConnected) return; // guarda contra container abandonado enquanto a geração estava em voo (Seção 8, mesmo padrão do upload)

      ttsGenerateBtn.disabled = false;
      ttsGenerateBtn.textContent = originalLabel;

      if (!res.ok){
        if (errorEl) errorEl.textContent = res.error || 'Não foi possível gerar o áudio agora.';
        return; // falha nunca sobrescreve o áudio anterior (se havia) -- mesma regra do upload.
      }

      const stillCurrentText = (textEl && textEl.value) || '';
      const stillCurrentLanguage = (langEl && langEl.value) || '';
      const stillCurrentVoiceId = (voiceEl && voiceEl.value.trim()) || null;
      const stillCurrentRate = rateEl ? Number(rateEl.value) : null;
      const currentKey = (typeof computeTtsGenerationKey === 'function')
        ? await computeTtsGenerationKey(stillCurrentText, stillCurrentLanguage, stillCurrentVoiceId, stillCurrentRate)
        : myKey;
      if (myKey !== null && currentKey !== myKey){
        // A pessoa mudou a config enquanto a geração estava em voo --
        // resultado obsoleto, descartado (nunca aplicado). O áudio
        // devolvido ainda ficou salvo no Storage (órfão) -- best-effort,
        // mesma categoria já documentada pra remoção/substituição (sem
        // garbage collector nesta fase).
        if (msgEl) msgEl.textContent = 'A configuração mudou enquanto o áudio era gerado -- clique em Gerar de novo.';
        return;
      }

      // Só ATUALIZA field.audio depois da geração ter sucesso de verdade
      // (mesma regra 2/9 do upload) -- text:null quando o texto digitado
      // é idêntico ao texto de exibição do Field (sem override explícito,
      // ver ttsEffectiveText em shared/flashcard-model.js); um override
      // real só é gravado quando a pessoa de fato mudou o texto padrão.
      const currentField = (editorState.fields || []).find(f => f.id === fieldId);
      const currentFieldText = (currentField && currentField.content && currentField.content.value) || '';
      const override = (text !== currentFieldText) ? text : null;
      editorState.__freshMediaUploads = editorState.__freshMediaUploads || [];
      editorState.__freshMediaUploads.push({ path: res.path, deleteFn: opts.deleteFn || null });
      // storagePath (Decisão 4, ver CLAUDE.md/shared/flashcard-model.js) --
      // a IDENTIDADE persistente do asset no bucket (res.path, o mesmo
      // valor já rastreado em __freshMediaUploads acima), gravada
      // SEPARADA de generatedUrl (a URL de acesso derivada/cacheada) --
      // nunca a única fonte de verdade, só a referência estável pra uma
      // futura rotina de limpeza/re-derivação de URL.
      updateFieldInEditorState(editorState, fieldId, {
        audio: {
          type: 'tts', text: override, language, voiceId, rate,
          generationKey: res.generationKey, generatedUrl: res.url, generatedAt: res.generatedAt,
          storagePath: res.path || null,
        },
      });
      if (onChange) onChange('structure', fieldId);
    });
  }

  if (removeBtn){
    removeBtn.addEventListener('click', () => {
      // Seção 10 -- remoção EXPLÍCITA é só de REFERÊNCIA (field.audio =
      // null), NUNCA delete físico do objeto no Storage: um Field
      // clonado (cloneFieldIntoEditorState, Fase 6D.3) copia `audio` por
      // VALOR (mesma URL), então 2 Fields podem apontar pro mesmo
      // arquivo sem nenhuma contagem de referências -- deletar aqui
      // arriscaria quebrar o áudio do OUTRO Field clonado. O arquivo
      // órfão fica documentado no relatório desta fase (CLAUDE.md) como
      // candidato a uma rotina de limpeza futura, nunca apagado às cegas
      // agora ("nenhum garbage collector é necessário nesta fase").
      updateFieldInEditorState(editorState, fieldId, { audio: null });
      if (onChange) onChange('structure', fieldId);
    });
  }
}

// ---------- Validação básica (Fase 6D.3 -- só o Field, não o Card Type
// inteiro; validação de cardinalidade por tipo, como Múltipla Escolha,
// continua sendo trabalho de fase futura/do motor, nunca deste módulo) ----------
// Não é chamada por nenhum fluxo de submit nesta subfase (submit continua
// 100% legacy, ver shared/admin-flashcards.js/shared/my-flashcards.js) --
// existe pronta pra quando 6D.6+ precisar dela.
function isValidFieldState(field){
  if (!field || typeof field !== 'object') return false;
  if (typeof field.id !== 'string' || !field.id) return false;
  if (!field.content || typeof field.content.value !== 'string') return false;
  return true;
}

// ---------- Render ----------

// Renderiza UM Field -- textarea de conteúdo + select de idioma + um
// indicador textual (não editável) de áudio/imagem/pinyin já vinculados,
// se existirem. `opts.namePrefix` evita colisão de id quando o mesmo
// componente aparece 2x na mesma página (admin + my-flashcards).
function renderFieldEditorHTML(field, index, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'field-editor';
  const removable = opts.removable !== false;
  const label = opts.label || `Campo ${index + 1}`;
  const contentValue = field.content && typeof field.content.value === 'string' ? field.content.value : '';
  // Fase 7e (ver CLAUDE.md) -- áudio saiu de `mediaNotes` (texto estático)
  // e virou o editor de verdade (renderFieldAudioBlockHTML, acima) --
  // imagem/pinyin continuam só indicador textual, ainda fora do escopo
  // desta subfase (Seção 8/19 -- só upload de ÁUDIO é implementado agora).
  const mediaNotes = [];
  if (field.image) mediaNotes.push('🖼️ tem imagem vinculada');
  if (field.pinyinFieldId) mediaNotes.push('🔤 tem um campo de pinyin vinculado');
  return `
    <div class="field-editor-row" data-field-editor data-field-id="${field.id}" data-field-index="${index}" style="border:1px solid var(--paper-line); border-radius:var(--radius); padding:10px; margin-bottom:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
        <span class="section-label" style="margin:0;">${escapeHTML(label)}</span>
        ${removable ? `<button type="button" class="admin-badge-delete-btn" data-field-remove="${field.id}" title="Remover campo">🗑</button>` : ''}
      </div>
      <label class="profile-edit-label" for="${namePrefix}-content-${field.id}">Conteúdo</label>
      <textarea id="${namePrefix}-content-${field.id}" class="profile-edit-input profile-edit-textarea" rows="2" data-field-content="${field.id}">${escapeHTML(contentValue)}</textarea>
      <label class="profile-edit-label" for="${namePrefix}-lang-${field.id}">Idioma</label>
      <select id="${namePrefix}-lang-${field.id}" class="profile-edit-input" data-field-lang="${field.id}">
        <option value="" ${!field.lang ? 'selected' : ''}>(não definido)</option>
        ${FIELD_LANG_OPTIONS.map(o => `<option value="${o.value}" ${field.lang === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      ${renderFieldAudioBlockHTML(field, opts)}
      ${mediaNotes.length ? `<p class="profile-edit-hint" style="margin-top:6px;">${mediaNotes.join(' · ')} (edição ainda não implementada nesta fase -- preservados como estão).</p>` : ''}
    </div>
  `;
}

// Renderiza a lista completa de Fields de um editorState nativo + botão de
// "adicionar campo". Puramente descritivo -- wireFieldEditorList() precisa
// rodar depois de inserir este HTML no DOM pra mutação de verdade acontecer.
function renderFieldEditorListHTML(editorState, opts){
  opts = opts || {};
  const fields = editorState.fields || [];
  return `
    <div data-field-editor-list>
      ${fields.length ? fields.map((f, i) => renderFieldEditorHTML(f, i, opts)).join('') : `<p class="profile-edit-hint">Nenhum campo ainda -- use "Adicionar campo" abaixo.</p>`}
    </div>
    ${opts.allowAdd !== false ? `<button type="button" class="admin-select-link" data-field-add>+ Adicionar campo</button>` : ''}
  `;
}

// ---------- Mutadores puros (Field state -- nunca tocam CardInstance/FSRS/
// nunca chamam rede) ----------

// Fase 6D.8 -- os Fields que são satélite de pinyin de outro Field (alvo
// de ALGUM field.pinyinFieldId na mesma Note) nunca contam como candidato
// a "campo sem papel ainda" -- mesmo critério que contentFieldIndices()
// (motor, shared/flashcard-model.js) já usa pra nunca tratar um satélite
// de pinyin como um slot de conteúdo próprio. Achado real durante a Fase
// 6D.8: transitionToMultipleChoice()/transitionToTypeAnswer() (6D.4a/6D.4b)
// nunca excluíam o satélite ao escolher `unroled[cursor]` -- inofensivo
// enquanto nenhum estado convertido de legado carregava um satélite de
// pinyin antes de trocar de Card Type, mas quebrava de verdade nesse
// cenário real (ex: converter um Normal zh com front_pinyin, depois trocar
// pra "Digite a resposta" -- o Field de pinyin virava `answer` por engano,
// perdendo a tradução real). Corrigido aqui, reutilizado pelos 2
// transitionTo*, nunca duplicado.
function fieldIsPinyinSatellite(field, fields){
  return fields.some(f => f.pinyinFieldId === field.id);
}

// Cria um Field NOVO (id gerado por createFieldState, Fase 6D.1) e o
// adiciona ao FIM de editorState.fields. `fields` continua sendo só a
// ordem estrutural/editorial -- nunca interpretado como frente/verso por
// este módulo.
function addFieldToEditorState(editorState, overrides){
  const field = createFieldState(overrides || {});
  editorState.fields = editorState.fields.concat([field]);
  return field;
}

// Remove um Field pelo ID -- nunca por índice (índice não é identidade,
// restrição 4 da Fase 6D.3). Os Fields restantes preservam seus próprios
// ids/conteúdo/lang/role/audio/image/pinyinFieldId intactos.
function removeFieldFromEditorState(editorState, fieldId){
  editorState.fields = editorState.fields.filter(f => f.id !== fieldId);
}

// Atualiza SÓ os campos passados em `patch` de um Field já existente,
// casando por id -- NUNCA cria um Field novo, NUNCA gera um id novo pro
// Field editado. Campos de `patch` não mencionados (audio/image/role/
// pinyinFieldId quando o patch só mexe em content/lang, por exemplo)
// continuam exatamente como estavam -- é isso que garante que editar
// texto/idioma nunca apaga áudio/imagem/pinyinFieldId já vinculados
// (restrições 8/9/10 da Fase 6D.3).
function updateFieldInEditorState(editorState, fieldId, patch){
  editorState.fields = editorState.fields.map(f => {
    if (f.id !== fieldId) return f;
    const next = Object.assign({}, f, patch);
    if (patch && patch.content !== undefined) next.content = normalizeFieldContent(patch.content);
    return next;
  });
}

// Clonagem DELIBERADA de um Field -- o único caso em que um ID NOVO é
// esperado (restrição 4). Copia lang/role/content/audio/image do
// original, mas NUNCA copia pinyinFieldId -- um pinyinFieldId apontaria
// pro Field ORIGINAL, não faria sentido no clone (e criaria uma referência
// cruzada entre dois Fields que o usuário não pediu).
function cloneFieldIntoEditorState(editorState, fieldId){
  const original = (editorState.fields || []).find(f => f.id === fieldId);
  if (!original) return null;
  const clone = createFieldState({
    lang: original.lang,
    role: original.role,
    content: { value: original.content && typeof original.content.value === 'string' ? original.content.value : '' },
    audio: original.audio,
    image: original.image,
    pinyinFieldId: null,
  });
  editorState.fields = editorState.fields.concat([clone]);
  return clone;
}

// ---------- Wiring: liga o DOM (data-field-*) aos mutadores acima ----------
// `onChange(kind, fieldId)` é chamado depois de QUALQUER mutação --
// `kind` é 'content'/'lang'/'remove'/'add'. Quem integra decide o que
// fazer: mutação de texto/idioma não precisa de re-render (o próprio
// input/select já reflete a mudança, e re-renderizar apagaria o que a
// pessoa está digitando -- mesma disciplina de
// updateFlashcardsSelectionDependentUI(), ver "UX-fix 5" no CLAUDE.md);
// add/remove SIM precisam de re-render (a lista de linhas mudou).
// `opts` (novo, Fase 7e -- ver CLAUDE.md) é opcional, repassado pra
// wireFieldAudioBlockFor() (uploadFn/deleteFn) -- nenhum dos 4 wirings
// pré-existentes (content/lang/remove/add) precisou de `opts`, só o de
// áudio, adicionado ao final.
function wireFieldEditorList(container, editorState, onChange, opts){
  if (!container) return;
  container.querySelectorAll('[data-field-content]').forEach(el => {
    el.addEventListener('input', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldContent, { content: { value: el.value } });
      if (onChange) onChange('content', el.dataset.fieldContent);
    });
  });
  container.querySelectorAll('[data-field-lang]').forEach(el => {
    el.addEventListener('change', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldLang, { lang: el.value || null });
      if (onChange) onChange('lang', el.dataset.fieldLang);
    });
  });
  container.querySelectorAll('[data-field-remove]').forEach(el => {
    el.addEventListener('click', () => {
      const fieldId = el.dataset.fieldRemove;
      removeFieldFromEditorState(editorState, fieldId);
      if (onChange) onChange('remove', fieldId);
    });
  });
  const addBtn = container.querySelector('[data-field-add]');
  if (addBtn){
    addBtn.addEventListener('click', () => {
      const field = addFieldToEditorState(editorState, {});
      if (onChange) onChange('add', field.id);
    });
  }
  // Fase 7e -- liga o editor de áudio de CADA Field mostrado neste
  // container VIA renderFieldEditorHTML (escopado a `[data-field-editor]
  // [data-field-audio-field]`, de propósito -- o Field de FRASE do Cloze
  // tem seu próprio bloco de áudio, injetado direto por
  // renderClozeEditorHTML() FORA de qualquer `.field-editor-row`, e é
  // wireado explicitamente por wireClozeEditor(); sem este escopo, os
  // dois wirings casariam o MESMO bloco e duplicariam os listeners de
  // upload/remoção nele).
  container.querySelectorAll('[data-field-editor] [data-field-audio-field]').forEach(block => {
    wireFieldAudioBlockFor(container, editorState, block.dataset.fieldAudioField, onChange, opts);
  });
}

// Helper de integração reutilizado pelos dois editores (admin/my-flashcards)
// -- re-renderiza SÓ a caixa de Fields nativos (nunca o form inteiro) e
// rewire, quando a MUDANÇA foi estrutural (add/remove, ou 'structure' --
// Fase 7e, emitido por um upload/remoção de áudio concluído); edição de
// texto/idioma já está refletida no próprio DOM sem precisar de nada
// extra. `boxEl` é o container que recebe renderFieldEditorListHTML();
// `opts` é repassado pra renderFieldEditorHTML (namePrefix/label/
// removable/allowAdd) E pra wireFieldEditorList (uploadFn/deleteFn,
// Fase 7e).
function refreshNativeFieldsBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderFieldEditorListHTML(editorState, opts);
  wireFieldEditorList(boxEl, editorState, (kind) => {
    if (kind === 'add' || kind === 'remove' || kind === 'structure') refreshNativeFieldsBox(boxEl, editorState, opts);
  }, opts);
}
