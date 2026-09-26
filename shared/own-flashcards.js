// ---------- Flashcards autorados pela PRÓPRIA conta -- Fase 5 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Irmão de shared/teacher-flashcards.js (mesma tabela-espelho, mesmo padrão
// de status active/archived), mas quem autora e quem é dona do cartão são a
// MESMA pessoa -- por isso a RLS de own_flashcards (migration 028, tabela
// renomeada de student_flashcards na migration 043 -- ver CLAUDE.md,
// "aluno/a" sempre significa vínculo formal em teacher_students, e esta
// tabela nunca foi isso: qualquer conta registrada usa "Meus Cartões",
// vinculada ou não) é "dono lê/escreve tudo", sem distinção professora/aluna.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

// Todos os cartões (ativos E arquivados) autorados pela conta LOGADA, num
// idioma específico. Inclui arquivados de propósito -- mesmo motivo de
// fetchFlashcardsForCurrentStudent (teacher-flashcards.js): STATE.cards
// precisa deles presentes pra não perder o progresso de memória já
// acumulado (ver applySerializedState/merge por id, Fase 0); só ficam de
// fora da FILA DE REVISÃO (isCardLessonCompleted checa `status` na
// origem 'self', fr/zh app.js).
async function fetchMyOwnFlashcards(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('own_flashcards')
    .select('*')
    .eq('owner_id', CURRENT_USER.id)
    .eq('language_app_key', languageAppKey)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar seus flashcards:', error); return []; }
  return data || [];
}

// front/back_trans obrigatórios (mesma validação de createFlashcard em
// teacher-flashcards.js); note e frontPinyin opcionais, frontPinyin só faz
// sentido pra languageAppKey==='mandarim' (mesmo motivo da migration 027 --
// zh mostra hanzi e pinyin em campos separados no cartão de revisão).
//
// Prompt-mestre "flashcards -- 7 propostas" (ver CLAUDE.md): frontIsTargetLanguage
// -- qual lado tem o idioma estudado, decide rótulo + pronúncia automática
// (fr/zh app.js). Default `true` preserva o comportamento de todo cartão
// já existente.
//
// Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md) --
// choices/clozeSentence/clozeAnswer/clozeAnswerPinyin: mesmos 2 formatos
// ricos (múltipla escolha, completar a frase) que só teacher_flashcards
// tinha até aqui (Fase 8a/8c), agora também disponíveis em cartão próprio
// -- gate de "é premium?" fica na UI (shared/my-flashcards.js), não aqui:
// esta função só valida o CONTEÚDO, mesmo princípio de _validateFlashcardContent
// em teacher-flashcards.js (copiada aqui de propósito, não importada --
// mesmo padrão de duplicação intencional já usado nas 3 telas de admin).
// `front` só é exigido fora do modo cloze (migration 040, mesmo motivo da
// 035 pra teacher_flashcards).
function _validateOwnFlashcardContent({ front, backTrans, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin, languageAppKey }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  const cleanClozeSentence = (clozeSentence || '').trim();
  const cleanClozeAnswer = (clozeAnswer || '').trim();
  const isCloze = !!cleanClozeSentence;
  if (!isCloze && !cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  const cleanChoices = (choices || []).map(c => (c || '').trim()).filter(Boolean);
  if (cleanClozeSentence){
    if ((cleanClozeSentence.match(/___/g) || []).length !== 1){
      return { ok: false, error: 'A frase precisa ter exatamente um espaço marcado com ___ (3 underscores).' };
    }
    if (!cleanClozeAnswer) return { ok: false, error: 'Digite a resposta certa pro espaço em branco.' };
    if (languageAppKey === 'mandarim' && !(clozeAnswerPinyin || '').trim()){
      return { ok: false, error: 'Digite o pinyin da resposta (é o que você vai digitar).' };
    }
  }
  return { ok: true, cleanFront, cleanBack, cleanChoices, cleanClozeSentence, cleanClozeAnswer };
}

// Fase 6D.6 (ver CLAUDE.md) -- `nativeState` opcional, mesmo contrato de
// createFlashcard() em shared/teacher-flashcards.js: presente = única
// fonte de conteúdo (parâmetros legados ignorados), ausente = comportamento
// idêntico a antes desta fase.
async function createOwnFlashcard({ languageAppKey, front, backTrans, note, frontPinyin, frontIsTargetLanguage, imageUrl, audioUrl, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin, nativeState }){
  const identity = { owner_id: CURRENT_USER.id, language_app_key: languageAppKey };
  if (nativeState){
    const payload = Object.assign({}, identity, nativeContentColumnsFromEditorState(nativeState));
    const { data, error } = await supabaseClient.from('own_flashcards').insert(payload).select().single();
    if (error){ console.error('Erro ao criar seu flashcard (nativo):', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
    return { ok: true, card: data };
  }
  const v = _validateOwnFlashcardContent({ front, backTrans, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin, languageAppKey });
  if (!v.ok) return v;
  const { data, error } = await supabaseClient
    .from('own_flashcards')
    .insert(Object.assign({}, identity, {
      front: v.cleanFront || null,
      back_trans: v.cleanBack,
      note: (note || '').trim() || null,
      front_pinyin: (frontPinyin || '').trim() || null,
      front_is_target_language: frontIsTargetLanguage !== false,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      choices: v.cleanChoices.length ? v.cleanChoices : null,
      cloze_sentence: v.cleanClozeSentence || null,
      cloze_answer: v.cleanClozeAnswer || null,
      cloze_answer_pinyin: languageAppKey === 'mandarim' ? ((clozeAnswerPinyin || '').trim() || null) : null,
    }))
    .select()
    .single();
  if (error){ console.error('Erro ao criar seu flashcard:', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
  return { ok: true, card: data };
}

// Upload de mídia (imagem/áudio) pro bucket `flashcard-media` -- mesmo
// bucket já usado por teacher-flashcards.js (uploadFlashcardMedia): a
// policy de escrita já é "qualquer autenticado, restrito à própria pasta
// (auth.uid())" (migration 032), nunca escopada a professora -- funciona
// pra cartão próprio sem nenhuma migração nova. Path com prefixo `self-`
// só pra facilitar auditoria manual do bucket (não afeta RLS nem leitura).
//
// Fase 7e (ver CLAUDE.md) -- mesmas 2 extensões de uploadFlashcardMedia
// (shared/teacher-flashcards.js): validação MIME/tamanho quando
// `kind==='audio'` (validateFieldAudioUploadFile, shared/flashcard-
// model.js, mesma migration 046 espelhada dos dois lados) + `resourceId`
// opcional pra rastreabilidade do path (sanitizado, nunca usado pra
// decisão de segurança -- ownership continua vindo só de CURRENT_USER.id).
async function uploadOwnFlashcardMedia(file, kind, resourceId){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  // Fase 7g (ver CLAUDE.md) -- mesma generalização de
  // uploadFlashcardMedia (shared/teacher-flashcards.js): `kind==='recording'`
  // passa pela MESMA validação MIME/tamanho que `kind==='audio'` já usava.
  if (kind === 'audio' || kind === 'recording'){
    const v = validateFieldAudioUploadFile(file);
    if (!v.ok) return { ok: false, error: v.error };
  }
  const extRaw = (file.name || '').split('.').pop() || 'bin';
  const ext = (extRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8)) || 'bin';
  const safeResourceId = (resourceId ? String(resourceId) : '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const resourceSegment = safeResourceId ? `${safeResourceId}-` : '';
  const path = `${CURRENT_USER.id}/self-${kind}-${resourceSegment}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('flashcard-media')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' });
  if (error){ console.error(`Erro ao subir ${kind} do cartão:`, error); return { ok: false, error: 'Não foi possível enviar o arquivo agora.' }; }
  const { data: pub } = supabaseClient.storage.from('flashcard-media').getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, path };
}

// Fase 7e (ver CLAUDE.md) -- mesma remoção best-effort de
// deleteFlashcardMedia (shared/teacher-flashcards.js), espelhada aqui pro
// lado da própria aluna. Mesmo bucket, mesma RLS de ownership por
// auth.uid() -- nenhuma diferença funcional entre os dois lados.
async function deleteOwnFlashcardMedia(path){
  if (!path) return { ok: false };
  const { error } = await supabaseClient.storage.from('flashcard-media').remove([path]);
  if (error){ console.warn('Não foi possível remover mídia órfã do cartão (best-effort):', error); return { ok: false }; }
  return { ok: true };
}

// Fase 7f (TTS explícito por Field, implementação -- ver CLAUDE.md) --
// mesmo serviço de front-end de requestFieldAudioTTS (shared/
// teacher-flashcards.js), espelhado aqui pro lado da própria conta:
// mesma Edge Function (tts-generate), só troca `table` pra 'own_flashcards'
// -- a function decide sozinha (via RLS de own_flashcards, owner-only)
// se esta conta pode tocar na linha. TTS_GENERATION_ERROR_LABELS vem de
// shared/flashcard-model.js (declarado 1 vez só ali, nunca duplicado aqui
// -- mesmo motivo de CARD_TYPE_UI_META na Fase 6D.2, evita colisão de
// `const` top-level entre 2 <script> no mesmo escopo global).
async function requestOwnFieldAudioTTS({ rowId, fieldId, text, language, voiceId, rate }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const v = validateTtsGenerationRequest({ text, language });
  if (!v.ok) return v;
  const { data, error } = await supabaseClient.functions.invoke('tts-generate', {
    body: { table: 'own_flashcards', rowId, fieldId, text, language, voiceId: voiceId || null, rate: (rate === undefined ? null : rate) },
  });
  if (error || !data?.ok){
    const code = data?.error || error?.context?.error || null;
    return { ok: false, error: TTS_GENERATION_ERROR_LABELS[code] || 'Não foi possível gerar o áudio agora.' };
  }
  return { ok: true, url: data.url, path: data.path, generationKey: data.generationKey, generatedAt: data.generatedAt };
}

async function setOwnFlashcardStatus(id, status){
  const { error } = await supabaseClient.from('own_flashcards').update({ status }).eq('id', id).eq('owner_id', CURRENT_USER.id);
  return { ok: !error };
}

// Fase 1 do perfil público (ver CLAUDE.md, grilling Q1) -- eixo SEPARADO de
// `status` (active/archived, que decide se o cartão entra na fila de
// revisão): `hidden_from_profile` só decide se ESTE cartão específico
// aparece na lista de cartões públicos de um perfil PÚBLICO. Nunca afeta
// revisão/FSRS (mesmo princípio já vale pra `status`, não muda aqui) --
// escondido do perfil e arquivado da revisão são perguntas diferentes, uma
// aluna pode ter um cartão ativo (revisa normalmente) mas escondido do
// perfil, ou arquivado mas ainda visível no perfil.
async function setOwnFlashcardHidden(id, hidden){
  const { error } = await supabaseClient.from('own_flashcards').update({ hidden_from_profile: !!hidden }).eq('id', id).eq('owner_id', CURRENT_USER.id);
  return { ok: !error };
}

// Prop 4 (ver CLAUDE.md, "7 propostas") -- edição real (todos os campos)
// de um cartão que a própria aluna criou. `revision` calculado pelo
// CHAMADOR (`(card.revision||0)+1`) -- mesmo mecanismo de "reset via id
// novo" de updateFlashcardContent (shared/teacher-flashcards.js), ver
// comentário lá pra detalhe completo. Aqui quem edita e quem é dona da
// sessão são a MESMA pessoa -- fr/zh app.js chama replaceSelfFlashcardInState()
// logo em seguida pra refletir o reset NA MESMA sessão, sem esperar reload.
// Fase 6D.6 (ver CLAUDE.md) -- `nativeState` opcional, mesmo contrato de
// updateFlashcardContent() em shared/teacher-flashcards.js.
async function updateOwnFlashcardContent(id, { front, backTrans, note, frontPinyin, frontIsTargetLanguage, revision, nativeState }){
  if (nativeState){
    const patch = Object.assign({ revision }, nativeContentColumnsFromEditorState(nativeState));
    const { error } = await supabaseClient.from('own_flashcards').update(patch).eq('id', id).eq('owner_id', CURRENT_USER.id);
    if (error){ console.error('Erro ao editar seu flashcard (nativo):', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
    return { ok: true };
  }
  const v = _validateOwnFlashcardContent({ front, backTrans });
  if (!v.ok) return v;
  const { error } = await supabaseClient.from('own_flashcards').update({
    front: v.cleanFront,
    back_trans: v.cleanBack,
    note: (note || '').trim() || null,
    front_pinyin: (frontPinyin || '').trim() || null,
    front_is_target_language: frontIsTargetLanguage !== false,
    revision,
  }).eq('id', id).eq('owner_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao editar seu flashcard:', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
  return { ok: true };
}

// Prop 4 -- delete físico de verdade (grillado: aceita perder o histórico
// de revisão pra poder apagar um cartão criado por engano; "arquivar" não
// resolve isso porque o cartão continuaria visível na lista de
// arquivados). Mesmo padrão de deleteFlashcardPermanently em
// shared/teacher-flashcards.js.
async function deleteOwnFlashcardPermanently(id){
  const { error } = await supabaseClient.from('own_flashcards').delete().eq('id', id).eq('owner_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao apagar seu flashcard:', error); return { ok: false }; }
  return { ok: true };
}
