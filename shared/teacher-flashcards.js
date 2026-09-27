// ---------- Flashcards autorados por professora -- Fase 2/3 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Fase 2: só CRIAR/ATRIBUIR o conteúdo do cartão a uma aluna (admin).
// Fase 3 (integração com revisão): a própria aluna busca seus cartões
// (fetchFlashcardsForCurrentStudent) pra mesclar em STATE.cards no boot do
// app (fr/zh app.js).
//
// Depende de (mesma posição de shared/roles.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

async function fetchFlashcardsForStudent(studentId){
  if (!CURRENT_USER || !studentId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar flashcards:', error); return []; }
  return data || [];
}

// Todos os flashcards (ativos E arquivados) atribuídos à conta LOGADA como
// aluna, num idioma específico -- chamado do lado da aluna (RLS
// teacher_flashcards_student_read, migration 026: auth.uid()=student_id),
// não do lado da professora. Inclui arquivados de propósito: STATE.cards
// precisa deles presentes pra não perder o progresso de memória já
// acumulado (ver applySerializedState/merge por id, Fase 0) -- só ficam de
// fora da FILA DE REVISÃO (isCardLessonCompleted checa `status` na
// origem 'teacher', fr/zh app.js).
async function fetchFlashcardsForCurrentStudent(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .select('*')
    .eq('student_id', CURRENT_USER.id)
    .eq('language_app_key', languageAppKey);
  if (error){ console.error('Erro ao carregar flashcards da aluna:', error); return []; }
  return data || [];
}

// back_trans é obrigatório em QUALQUER modo (é o mínimo pra um cartão
// existir -- ver comentário na migration 035): no flip é o verso, na
// múltipla escolha é a opção certa dentro de card.mcOptions, no cloze é a
// tradução revelada depois de responder (renderClozeReviewCard). `front`
// só é obrigatório fora do modo cloze -- ver migration 035: no modo
// "Completar a frase" o conteúdo inteiro do cartão já vive em
// cloze_sentence/cloze_answer, e `front` nunca é lido/exibido em nenhuma
// tela pra esse modo (renderClozeReviewCard não referencia card.front/
// card.back_hanzi) -- exigi-lo ali forçaria dado morto só pra satisfazer
// uma constraint. note e frontPinyin são sempre opcionais. frontPinyin só
// faz sentido pra languageAppKey==='mandarim' (ver migration 027 -- zh
// mostra pinyin e hanzi em campos separados no flashcard de revisão,
// diferente do fr que usa só `front`); a UI (shared/admin-flashcards.js)
// só mostra o campo quando a aluna selecionada é de mandarim.
// languageAppKey vem do vínculo já existente em teacher_students (cada
// aluna vale pra 1 idioma -- não é escolhido de novo aqui).
//
// Fase 8a (ver CLAUDE.md) -- imageUrl/audioUrl/choices são todos opcionais
// e independentes entre si (um cartão pode ter imagem sem ser múltipla
// escolha, ou múltipla escolha sem imagem). `choices` é um array de 1-3
// respostas ERRADAS -- a certa continua sendo `backTrans`, nunca duplicada
// aqui (ver comentário na migration 032). Vazio/undefined -> cartão comum.
//
// Fase 8c (ver CLAUDE.md) -- clozeSentence/clozeAnswer/clozeAnswerPinyin:
// quarto formato, "completar a frase". clozeSentence precisa conter
// exatamente 1 marcador "___" (3 underscores) -- sem isso não há onde a
// aluna digitar. clozeAnswerPinyin só é gravado quando languageAppKey é
// 'mandarim' (a aluna digita pinyin, não hanzi -- mesmo motivo dos
// exercícios de digitar da trilha zh). Mutuamente exclusivo com `choices`
// -- checado na UI (shared/admin-flashcards.js), não aqui: esta função
// não impede tecnicamente gravar os dois juntos, mas nenhum call site
// real faz isso.
// Prompt-mestre "flashcards -- 7 propostas" (ver CLAUDE.md, Q1-Q4): qual
// lado (Frente/Verso) contém o idioma estudado -- decide (a) o rótulo dos
// campos e (b) qual lado recebe a pronúncia automática (fr/zh app.js,
// renderReviewView/renderMultipleChoiceReviewCard). Vale só pros modos
// flip/mc (grillado -- cloze não usa front/back_trans pra isso, mantém a
// mecânica de sempre). Default `true` -- todo cartão já existente tem de
// fato o front no idioma estudado, então omitir o parâmetro preserva
// comportamento.
function _validateFlashcardContent({ languageAppKey, front, backTrans, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  const cleanClozeSentence = (clozeSentence || '').trim();
  const cleanClozeAnswer = (clozeAnswer || '').trim();
  const isCloze = !!cleanClozeSentence;
  // front só é exigido fora do modo cloze -- ver migration 035/comentário
  // acima. Nunca inventamos um valor substituto quando ausente: gravamos
  // `null` de verdade, não uma cópia da frase-cloze nem da tradução.
  if (!isCloze && !cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  const cleanChoices = (choices || []).map(c => (c || '').trim()).filter(Boolean);
  if (cleanClozeSentence){
    if ((cleanClozeSentence.match(/___/g) || []).length !== 1){
      return { ok: false, error: 'A frase precisa ter exatamente um espaço marcado com ___ (3 underscores).' };
    }
    if (!cleanClozeAnswer) return { ok: false, error: 'Digite a resposta certa pro espaço em branco.' };
    if (languageAppKey === 'mandarim' && !(clozeAnswerPinyin || '').trim()){
      return { ok: false, error: 'Digite o pinyin da resposta (é o que o aluno vai digitar).' };
    }
  }
  return { ok: true, cleanFront, cleanBack, cleanChoices, cleanClozeSentence, cleanClozeAnswer };
}

// Fase 6D.6 da reestruturação Note/CardType/CardInstance (ver CLAUDE.md) --
// `nativeState` (opcional) é um Note editor state NATIVO já validado por
// validateNoteEditorStateForSave() (shared/flashcard-native-persistence.js)
// -- quando presente, ele é a ÚNICA fonte de conteúdo persistido: os
// parâmetros legados (front/backTrans/choices/clozeSentence/etc.) são
// IGNORADOS por completo, nunca misturados como uma segunda fonte de
// verdade. Sem `nativeState` (o caso de toda chamada já existente antes
// desta fase), o comportamento é BYTE A BYTE idêntico a antes -- "legacy
// aberto != automaticamente migrado" (regra central desta fase) cumprida
// por construção: nada aqui decide converter sozinho, quem decide é o
// CHAMADOR (shared/admin-flashcards.js), passando `nativeState` só quando
// o usuário explicitamente usou o editor nativo.
async function createFlashcard({ studentId, languageAppKey, front, backTrans, note, frontPinyin, imageUrl, audioUrl, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin, frontIsTargetLanguage, nativeState }){
  const identity = {
    teacher_id: CURRENT_USER.id,
    student_id: studentId,
    language_app_key: languageAppKey,
  };
  if (nativeState){
    const payload = Object.assign({}, identity, nativeContentColumnsFromEditorState(nativeState));
    const { data, error } = await supabaseClient.from('teacher_flashcards').insert(payload).select().single();
    if (error){ console.error('Erro ao criar flashcard (nativo):', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
    return { ok: true, card: data };
  }
  const v = _validateFlashcardContent({ languageAppKey, front, backTrans, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin });
  if (!v.ok) return v;
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .insert(Object.assign({}, identity, {
      front: v.cleanFront || null,
      back_trans: v.cleanBack,
      note: (note || '').trim() || null,
      front_pinyin: (frontPinyin || '').trim() || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      choices: v.cleanChoices.length ? v.cleanChoices : null,
      cloze_sentence: v.cleanClozeSentence || null,
      cloze_answer: v.cleanClozeAnswer || null,
      cloze_answer_pinyin: languageAppKey === 'mandarim' ? ((clozeAnswerPinyin || '').trim() || null) : null,
      front_is_target_language: frontIsTargetLanguage !== false,
    }))
    .select()
    .single();
  if (error){ console.error('Erro ao criar flashcard:', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
  return { ok: true, card: data };
}

// Prop 4 (ver CLAUDE.md, "7 propostas") -- edição real de um cartão já
// criado, TODOS os campos (grillado explicitamente -- inclui modo/mídia/
// direção, não só texto). `revision` é calculado pelo CHAMADOR a partir do
// valor que já tem em mãos (`(card.revision||0)+1`) -- evita um round-trip
// extra só pra ler o valor atual antes de incrementar. fr/zh app.js usa
// esse número pra recompor o id do card (`t${id}` quando revision=0,
// `t${id}-r${revision}` quando >0) -- um id novo nunca bate com nenhum já
// salvo em STATE.cards, então applySerializedState() descarta o progresso
// de memória antigo pelo MESMO mecanismo que já descarta qualquer cartão
// sem correspondência (Fase 0), sem precisar de nenhum código especial de
// "reset". `imageUrl`/`audioUrl` passados como `undefined` mantêm a mídia
// já existente (não sobrescreve com null); passe `null` explicitamente
// pra remover.
// Fase 6D.6 (ver CLAUDE.md) -- `nativeState` (opcional), mesmo contrato de
// createFlashcard() acima: quando presente, é a ÚNICA fonte de conteúdo do
// UPDATE (parâmetros legados ignorados). `revision` continua vindo do
// CHAMADOR (mesmo mecanismo de sempre -- id novo de STATE.cards via
// flashcardIdForRow, reset de progresso via merge-por-id, nenhum código
// especial de "reset" aqui) -- só que agora o chamador decide incrementar
// ou não usando noteEditorStateRequiresNewRevision() (Fase 6D.1) em vez de
// incrementar sempre incondicionalmente.
async function updateFlashcardContent(id, { languageAppKey, front, backTrans, note, frontPinyin, imageUrl, audioUrl, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin, frontIsTargetLanguage, revision, nativeState }){
  if (nativeState){
    const patch = Object.assign({ revision }, nativeContentColumnsFromEditorState(nativeState));
    const { error } = await supabaseClient.from('teacher_flashcards').update(patch).eq('id', id);
    if (error){ console.error('Erro ao editar flashcard (nativo):', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
    return { ok: true };
  }
  const v = _validateFlashcardContent({ languageAppKey, front, backTrans, choices, clozeSentence, clozeAnswer, clozeAnswerPinyin });
  if (!v.ok) return v;
  const patch = {
    front: v.cleanFront || null,
    back_trans: v.cleanBack,
    note: (note || '').trim() || null,
    front_pinyin: (frontPinyin || '').trim() || null,
    choices: v.cleanChoices.length ? v.cleanChoices : null,
    cloze_sentence: v.cleanClozeSentence || null,
    cloze_answer: v.cleanClozeAnswer || null,
    cloze_answer_pinyin: languageAppKey === 'mandarim' ? ((clozeAnswerPinyin || '').trim() || null) : null,
    front_is_target_language: frontIsTargetLanguage !== false,
    revision,
  };
  if (imageUrl !== undefined) patch.image_url = imageUrl;
  if (audioUrl !== undefined) patch.audio_url = audioUrl;
  const { error } = await supabaseClient.from('teacher_flashcards').update(patch).eq('id', id);
  if (error){ console.error('Erro ao editar flashcard:', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
  return { ok: true };
}

// Prop 4 -- delete físico de verdade (grillado: a autora aceita perder o
// histórico de revisão pra poder corrigir um cartão criado por engano),
// diferente de setFlashcardStatus('archived') abaixo, que preserva
// progresso. A linha some de teacher_flashcards; a próxima vez que a
// aluna carregar o app, mergeTeacherFlashcardsIntoState() simplesmente
// não vai mais encontrar essa linha -- o cartão órfão em STATE.cards
// salvo é descartado pelo mesmo mecanismo de sempre (Fase 0), sem
// precisar de nenhum código novo.
async function deleteFlashcardPermanently(id){
  const { error } = await supabaseClient.from('teacher_flashcards').delete().eq('id', id);
  if (error){ console.error('Erro ao apagar flashcard:', error); return { ok: false }; }
  return { ok: true };
}

// Fase 8a -- upload de mídia pro bucket `flashcard-media` (migration 032,
// leitura pública/escrita restrita à pasta do próprio auth.uid() -- sempre
// a PROFESSORA aqui). Path com componente aleatório -- diferente do avatar
// (path fixo, upsert), cada cartão pode ter sua própria mídia sem
// sobrescrever a de outro. Devolve a URL pública já pronta pra gravar em
// createFlashcard(); não grava nada no banco sozinho.
//
// Fase 7e (ver CLAUDE.md) -- 2 extensões, aditivas, sem quebrar nenhum
// call site existente (kind==='image', sem resourceId):
// 1. `kind==='audio'` passa por validateFieldAudioUploadFile() (shared/
//    flashcard-model.js) ANTES de qualquer chamada de rede -- MIME/
//    tamanho espelhando exatamente a migration 046 (bucket já reforça a
//    mesma regra do lado do servidor, esta é só a 1ª camada/feedback
//    rápido). `kind==='image'` nunca passa por essa checagem -- fora do
//    escopo desta subfase (só áudio).
// 2. `resourceId` (opcional -- Seção 5, "path deve permitir identificar o
//    recurso") -- quando presente (o id do Field, gerado por
//    createFieldState), entra no path como um segmento a mais entre
//    `kind` e o timestamp. Nunca usado pra decisão de segurança (a
//    ownership continua vindo só de `CURRENT_USER.id`, 1º segmento do
//    path, checado pela RLS de Storage) -- sanitizado defensivamente
//    (só [a-zA-Z0-9_-], truncado) porque field ids são gerados por este
//    app (nunca confiáveis por padrão, Seção 15 -- nunca deixar o
//    usuário escolher um path arbitrário).
async function uploadFlashcardMedia(file, kind, resourceId){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  // Fase 7g (ver CLAUDE.md) -- `kind==='recording'` (gravação por
  // microfone, shared/flashcard-field-audio-recorder.js) passa pela MESMA
  // validação de MIME/tamanho que `kind==='audio'` (upload manual, Fase
  // 7e) já usava -- generalização mínima, nunca uma segunda função de
  // validação: os dois produzem um arquivo de áudio que precisa respeitar
  // o mesmo `allowed_mime_types`/`file_size_limit` do bucket (migration
  // 046). Só o valor literal de `kind` difere entre os dois, o que já
  // basta pra dar ao path resultante (`kind-{resourceId}-{ts}-{rand}.ext`,
  // abaixo) um segmento identificável como gravação, distinto de um
  // upload manual, sem precisar de nenhum parâmetro novo.
  if (kind === 'audio' || kind === 'recording'){
    const v = validateFieldAudioUploadFile(file);
    if (!v.ok) return { ok: false, error: v.error };
  }
  const extRaw = (file.name || '').split('.').pop() || 'bin';
  const ext = (extRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8)) || 'bin';
  const safeResourceId = (resourceId ? String(resourceId) : '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const resourceSegment = safeResourceId ? `${safeResourceId}-` : '';
  const path = `${CURRENT_USER.id}/${kind}-${resourceSegment}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('flashcard-media')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' });
  if (error){ console.error(`Erro ao subir ${kind} do flashcard:`, error); return { ok: false, error: 'Não foi possível enviar o arquivo agora.' }; }
  const { data: pub } = supabaseClient.storage.from('flashcard-media').getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, path };
}

// Fase 7e (ver CLAUDE.md, Seção 10/14) -- remoção BEST-EFFORT de um objeto
// do bucket -- nunca lança, falha é sempre silenciosa (best-effort, quem
// chama já decide o que fazer se `ok:false`). Só 2 usos legítimos, os
// dois documentados no relatório da fase: (a) compensação de upload
// órfão quando a professora subiu um áudio novo nesta sessão de edição e
// a gravação da Note falhou logo em seguida (nesse caso o objeto nunca
// chegou a ser referenciado por nenhuma linha real -- seguro deletar);
// (b) nunca usado em "substituir"/"remover" um áudio JÁ SALVO -- ver
// shared/flashcard-field-editor.js pra justificativa completa (um Field
// clonado pode compartilhar a mesma URL, tornando delete físico ali
// inseguro sem contagem de referências).
async function deleteFlashcardMedia(path){
  if (!path) return { ok: false };
  const { error } = await supabaseClient.storage.from('flashcard-media').remove([path]);
  if (error){ console.warn('Não foi possível remover mídia órfã do flashcard (best-effort):', error); return { ok: false }; }
  return { ok: true };
}

// ---------- Fase 7f (TTS explícito por Field, implementação -- ver
// CLAUDE.md) -- serviço de front-end ----------
//
// Só CHAMA a Edge Function tts-generate (supabase/functions/tts-generate)
// e devolve o resultado estruturado -- NUNCA muta STATE global, NUNCA
// grava nada em `field.audio` sozinha, NUNCA persiste a Note (isso
// continua sendo decisão exclusiva de quem chama, dentro do fluxo normal
// de edição -- shared/flashcard-field-editor.js só aplica o resultado ao
// editorState em memória; a gravação de verdade só acontece quando a
// professora clica Salvar no formulário, mesmo caminho de sempre via
// updateFlashcardContent()). Validação client-side ANTES da chamada de
// rede (validateTtsGenerationRequest, shared/flashcard-model.js) -- a
// Edge Function valida de novo do lado do servidor, 2ª camada real.
async function requestFieldAudioTTS({ rowId, fieldId, text, language, voiceId, rate }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const v = validateTtsGenerationRequest({ text, language });
  if (!v.ok) return v;
  const { data, error } = await supabaseClient.functions.invoke('tts-generate', {
    body: { table: 'teacher_flashcards', rowId, fieldId, text, language, voiceId: voiceId || null, rate: (rate === undefined ? null : rate) },
  });
  if (error || !data?.ok){
    const code = data?.error || error?.context?.error || null;
    return { ok: false, error: TTS_GENERATION_ERROR_LABELS[code] || 'Não foi possível gerar o áudio agora.' };
  }
  return { ok: true, url: data.url, path: data.path, generationKey: data.generationKey, generatedAt: data.generatedAt };
}

async function setFlashcardStatus(id, status){
  const { error } = await supabaseClient.from('teacher_flashcards').update({ status }).eq('id', id);
  return { ok: !error };
}
