// ---------- Fase 7g (gravação de áudio por Field, ver CLAUDE.md) ----------
//
// Terceira fonte REAL de Field.audio, depois de upload de arquivo (Fase 7e)
// e TTS explícito (Fase 7f) -- captura direta pelo microfone do navegador
// (MediaRecorder + getUserMedia). `Field.audio.type:'recording'` já existia
// como CONTRATO desde a Fase 7b (`{type:'recording', url, recordedAt,
// mimeType, durationMs}`, `resolveFieldAudioUrl()`/`isValidFieldAudio()` já
// sabiam ler/validar esse shape) -- este arquivo é o que finalmente PRODUZ
// esse shape de verdade, nunca um contrato novo. Nenhuma mudança em
// shared/flashcard-model.js foi necessária por causa desta fase (conferido
// por leitura antes de escrever qualquer linha aqui).
//
// Reaproveita a MESMA infraestrutura de Storage já construída na Fase 7e
// (bucket `flashcard-media`, uploadFlashcardMedia()/uploadOwnFlashcardMedia()
// -- shared/teacher-flashcards.js/shared/own-flashcards.js) -- nunca um
// bucket novo, nunca um pipeline de persistência paralelo. A única mudança
// nesses 2 arquivos (ver CLAUDE.md) foi generalizar minimamente a checagem
// `kind === 'audio'` pra também aceitar `kind === 'recording'` (mesma
// validação de MIME/tamanho, `validateFieldAudioUploadFile()`, aplicada aos
// dois) -- o path resultante (`{userId}/recording-{fieldId}-{ts}-{rand}.ext`)
// fica genuinamente identificável como gravação, distinto de um upload
// manual (`{userId}/audio-{fieldId}-{ts}-{rand}.ext`), sem duplicar nenhuma
// lógica de upload/validação.
//
// Duas camadas, deliberadamente separadas:
//   1. Máquina de estados PURA (createFieldAudioRecorderState/
//      fieldAudioRecorderReducer/can*FieldAudioRecording) -- zero API de
//      navegador, 100% testável em Node/VM. É esta camada que os 27
//      cenários determinísticos exercitam.
//   2. Camada de integração (createFieldAudioRecorder) -- liga a máquina
//      pura a MediaRecorder/getUserMedia de verdade, com os dois
//      INJETÁVEIS (`opts.mediaDevices`/`opts.MediaRecorderImpl`, default
//      `navigator.mediaDevices`/`window.MediaRecorder`) -- nunca hardcoded
//      -- pra permitir mock controlado num ambiente sem microfone real
//      (ver CLAUDE.md, seção de testes desta fase, sobre o que depende de
//      hardware real vs. o que é mockado).
//
// Estado transitório (MediaStream, MediaRecorder, chunks de Blob, timer de
// duração) mora SÓ neste módulo -- NUNCA em editorState/Field/STATE.cards.
// `field.audio` só é atualizado por quem integra (shared/flashcard-field-
// editor.js, wireFieldAudioBlockFor) DEPOIS que uma gravação já foi enviada
// com sucesso pro Storage -- mesma disciplina de "nunca antes do sucesso"
// já usada por upload (7e) e TTS (7f). Falha de permissão/gravação/upload
// NUNCA altera field.audio (o áudio anterior, se havia, permanece intacto).
//
// Nunca inicia sozinho -- start() só é chamado em resposta a um clique
// explícito em "🎙️ Gravar" (shared/flashcard-field-editor.js). Abrir o
// editor, o Preview (shared/flashcard-preview.js, que nunca importa nada
// deste arquivo) ou a Revisão nunca solicita permissão de microfone.
//
// Registro por fieldId (FIELD_AUDIO_RECORDER_REGISTRY) -- garante (a) "no
// máximo 1 gravação por Field" de forma estrutural (o MESMO objeto
// recorder é reaproveitado entre re-renders da caixa de Fields, nunca uma
// instância nova por render -- sem isso, um re-render disparado por OUTRO
// Field ex: "+ Adicionar campo"/"🗑 Remover" enquanto este Field está
// gravando destruiria a referência ao MediaRecorder/stream ativos,
// vazando o microfone ligado sem nenhum jeito de pará-lo pela UI); (b) um
// ponto único de liberação (releaseFieldAudioRecorder/
// releaseAllFieldAudioRecorders) quando um Field é removido ou uma sessão
// de edição termina.
//
// Depende de: nada de shared/flashcard-model.js/shared/flashcard-editor-
// state.js (nenhuma função daqui é chamada por eles) -- é consumido só por
// shared/flashcard-field-editor.js (wireFieldAudioBlockFor), carregado
// logo depois deste arquivo (ver ordem de <script> em fr/zh index.html).

// ---------- MIME/extensão -- nunca confia em nome de arquivo do navegador
// (MediaRecorder nunca produz um Blob com `.name`) ----------

// Ordem de preferência -- só tipos BASE (sem `;codecs=...`), porque o
// Storage (allowed_mime_types, migration 046) e a validação cliente
// (FIELD_AUDIO_UPLOAD_MIME_TYPES, shared/flashcard-model.js) fazem match
// EXATO de string -- um MediaRecorder criado com `{mimeType:'audio/webm'}`
// (sem codec explícito) produz um Blob cujo `.type` já é o tipo base na
// grande maioria dos navegadores; mesmo quando não é (`;codecs=opus`
// anexado pelo navegador), baseAudioMimeType() abaixo sempre normaliza
// antes de validar/subir -- nunca deixa um `;codecs=...` vazar pra
// validação ou pro `contentType` do upload.
const FIELD_AUDIO_RECORDING_MIME_CANDIDATES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];

function baseAudioMimeType(mimeType){
  return (mimeType || '').split(';')[0].trim().toLowerCase();
}

// Único ponto que decide qual MIME o MediaRecorder vai usar -- nunca força
// um valor não suportado pelo navegador (isTypeSupported real, nunca
// assumido). `MediaRecorderImpl` é sempre injetado por quem chama (nunca
// lido de `window`/`MediaRecorder` global aqui) -- mantém esta função pura
// e testável sem nenhuma API de navegador real.
function pickFieldAudioRecordingMimeType(MediaRecorderImpl){
  if (!MediaRecorderImpl || typeof MediaRecorderImpl.isTypeSupported !== 'function') return null;
  for (const candidate of FIELD_AUDIO_RECORDING_MIME_CANDIDATES){
    try { if (MediaRecorderImpl.isTypeSupported(candidate)) return candidate; } catch (e) { /* ignora e tenta o próximo */ }
  }
  return null;
}

const FIELD_AUDIO_RECORDING_EXTENSION_BY_MIME = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
};
function fieldAudioRecordingExtensionForMimeType(baseType){
  return FIELD_AUDIO_RECORDING_EXTENSION_BY_MIME[baseType] || 'webm';
}

// Constrói o "arquivo" que uploadFlashcardMedia()/uploadOwnFlashcardMedia()
// (shared/teacher-flashcards.js/shared/own-flashcards.js) já sabem subir --
// nome/extensão SEMPRE derivados do MIME BASE (nunca de metadado externo,
// nunca de um nome de arquivo real -- gravação nunca tem um, por natureza
// do MediaRecorder). Mesmo princípio já travado na Fase 7e ("nunca confiar
// em nome de arquivo do navegador pra decisão de path/segurança").
function buildFieldAudioRecordingFile(blob, baseType){
  const ext = fieldAudioRecordingExtensionForMimeType(baseType);
  const name = `recording-${Date.now()}.${ext}`;
  if (typeof File === 'function'){
    try { return new File([blob], name, { type: baseType }); } catch (e) { /* cai no fallback abaixo */ }
  }
  // Fallback defensivo -- nunca deveria ser alcançado num navegador real
  // (todo navegador com MediaRecorder tem o construtor File), mas evita
  // quebrar caso algum dia rode num contexto sem ele: decora o próprio
  // Blob com as 2 propriedades que o upload já espera de um "File".
  try { blob.name = name; } catch (e) { /* ignora */ }
  if (blob.type !== baseType){
    try { Object.defineProperty(blob, 'type', { value: baseType, configurable: true }); } catch (e) { /* ignora */ }
  }
  return blob;
}

const FIELD_AUDIO_RECORDING_ERROR_LABELS = {
  permission_denied: 'Permissão de microfone negada -- não foi possível gravar. Você pode permitir o acesso ao microfone nas configurações do navegador e tentar de novo.',
  no_device: 'Nenhum microfone disponível neste navegador/dispositivo.',
  recording_error: 'Ocorreu um erro durante a gravação -- tente de novo.',
  upload_error: 'Gravação concluída, mas não foi possível salvá-la -- tente de novo.',
};

// ---------- Máquina de estados PURA ----------
//
// `status` é sempre um dos 7 valores abaixo -- nunca outro. `errorCode`/
// `errorMessage` só são não-nulos quando `status==='error'`. Uma
// transição não reconhecida pro estado atual é um NO-OP (devolve o mesmo
// conteúdo, nunca lança) -- é isso que garante "nenhuma gravação dupla no
// mesmo Field" (REQUEST_PERMISSION só é aceito em idle/error/ready --
// nunca em requesting_permission/recording/stopping/uploading), "nenhum
// stop duplicado" (STOP só aceito em recording) e "nenhum cancelamento
// simultâneo a upload" (CANCEL deliberadamente ausente do bucket
// `uploading` -- cai no no-op default).
function createFieldAudioRecorderState(){
  return { status: 'idle', errorCode: null, errorMessage: null };
}

const FIELD_AUDIO_RECORDER_TRANSITIONS = {
  idle: {
    REQUEST_PERMISSION: () => ({ status: 'requesting_permission', errorCode: null, errorMessage: null }),
  },
  requesting_permission: {
    PERMISSION_GRANTED: () => ({ status: 'recording', errorCode: null, errorMessage: null }),
    PERMISSION_DENIED: () => ({ status: 'error', errorCode: 'permission_denied', errorMessage: FIELD_AUDIO_RECORDING_ERROR_LABELS.permission_denied }),
    NO_DEVICE: () => ({ status: 'error', errorCode: 'no_device', errorMessage: FIELD_AUDIO_RECORDING_ERROR_LABELS.no_device }),
    CANCEL: () => createFieldAudioRecorderState(),
  },
  recording: {
    STOP: () => ({ status: 'stopping', errorCode: null, errorMessage: null }),
    RECORDER_ERROR: (event) => ({ status: 'error', errorCode: 'recording_error', errorMessage: (event && event.error) || FIELD_AUDIO_RECORDING_ERROR_LABELS.recording_error }),
    CANCEL: () => createFieldAudioRecorderState(),
  },
  stopping: {
    // O evento `onstop` real do MediaRecorder pode chegar DEPOIS de um
    // CANCEL já ter revertido o status pra `idle` (ex: usuário cancelou
    // enquanto o navegador ainda estava finalizando o arquivo) -- a
    // camada de integração (createFieldAudioRecorder) já guarda contra
    // isso checando `status==='stopping'` antes de processar o blob
    // tardio, mas a máquina pura em si também nunca aceita STOPPED fora
    // deste bucket (chegar aqui já implica que o cancelamento ainda não
    // aconteceu).
    STOPPED: () => ({ status: 'uploading', errorCode: null, errorMessage: null }),
    RECORDER_ERROR: (event) => ({ status: 'error', errorCode: 'recording_error', errorMessage: (event && event.error) || FIELD_AUDIO_RECORDING_ERROR_LABELS.recording_error }),
    CANCEL: () => createFieldAudioRecorderState(),
  },
  uploading: {
    UPLOAD_SUCCESS: () => ({ status: 'ready', errorCode: null, errorMessage: null }),
    UPLOAD_FAILURE: (event) => ({ status: 'error', errorCode: 'upload_error', errorMessage: (event && event.error) || FIELD_AUDIO_RECORDING_ERROR_LABELS.upload_error }),
    // CANCEL propositalmente AUSENTE -- nunca cancelamento simultâneo a
    // upload (o clique de "Cancelar" já fica escondido nesta fase pela
    // UI, mas a máquina em si também recusa, defesa em profundidade).
  },
  ready: {
    REQUEST_PERMISSION: () => ({ status: 'requesting_permission', errorCode: null, errorMessage: null }), // regravar
    RESET: () => createFieldAudioRecorderState(),
  },
  error: {
    REQUEST_PERMISSION: () => ({ status: 'requesting_permission', errorCode: null, errorMessage: null }), // tentar de novo
    RESET: () => createFieldAudioRecorderState(),
  },
};

function fieldAudioRecorderReducer(state, event){
  const current = state || createFieldAudioRecorderState();
  const type = event && event.type;
  const bucket = FIELD_AUDIO_RECORDER_TRANSITIONS[current.status];
  const handler = bucket && bucket[type];
  if (!handler) return { status: current.status, errorCode: current.errorCode, errorMessage: current.errorMessage };
  return handler(event);
}

// Guards reutilizados pela UI (shared/flashcard-field-editor.js) pra
// decidir quais botões mostrar -- nunca reimplementados ali, único ponto
// de verdade sobre "o que é permitido a partir deste status".
function canStartFieldAudioRecording(status){ return status === 'idle' || status === 'error' || status === 'ready'; }
function canStopFieldAudioRecording(status){ return status === 'recording'; }
function canCancelFieldAudioRecording(status){ return status === 'requesting_permission' || status === 'recording' || status === 'stopping'; }

// ---------- Camada de integração (MediaRecorder/getUserMedia reais) ----------
//
// `opts.mediaDevices`/`opts.MediaRecorderImpl`/`opts.now` são sempre
// injetáveis -- default pras APIs de navegador reais quando presentes,
// nunca hardcoded. `opts.uploadFn`/`opts.deleteFn`/`opts.onReady`/
// `opts.fieldId` são atualizáveis depois via `setCallbacks()` (quem
// integra os re-passa a cada re-render, já que `onChange`/`editorState`
// são recriados a cada `wireFieldEditorList()` -- mesmo motivo pelo qual
// getOrCreateFieldAudioRecorder() abaixo REAPROVEITA a instância viva em
// vez de criar uma nova a cada wire-up).
function createFieldAudioRecorder(opts){
  opts = opts || {};
  const nowFn = typeof opts.now === 'function' ? opts.now : () => Date.now();
  let cb = {
    uploadFn: opts.uploadFn || null,
    deleteFn: opts.deleteFn || null,
    fieldId: opts.fieldId || null,
    onReady: opts.onReady || null,
  };
  let state = createFieldAudioRecorderState();
  const listeners = [];
  let stream = null;
  let recorder = null;
  let chunks = [];
  let recordingStartedAt = null;
  let recordedMimeType = null;

  function emit(){ listeners.slice().forEach((fn) => { try { fn(state); } catch (e) { /* um listener quebrado nunca deve travar a máquina */ } }); }
  function setState(next){ state = next; emit(); }

  function releaseStream(){
    if (stream){ try { stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignora */ } }
    stream = null;
  }
  function resetCapture(){
    releaseStream();
    recorder = null;
    chunks = [];
    recordingStartedAt = null;
  }

  function mediaDevicesImpl(){ return opts.mediaDevices || (typeof navigator !== 'undefined' ? navigator.mediaDevices : null); }
  function mediaRecorderImpl(){ return opts.MediaRecorderImpl || (typeof MediaRecorder !== 'undefined' ? MediaRecorder : null); }

  // Único ponto de entrada pra INICIAR uma gravação -- nunca chamado
  // sozinho (sempre em resposta a um clique explícito, ver shared/
  // flashcard-field-editor.js). Guard de concorrência: só aceita a partir
  // de idle/error/ready (canStartFieldAudioRecording) -- um clique duplo
  // enquanto já está requesting_permission/recording/etc. é um no-op.
  async function start(){
    if (!canStartFieldAudioRecording(state.status)) return;
    setState(fieldAudioRecorderReducer(state, { type: 'REQUEST_PERMISSION' }));
    const md = mediaDevicesImpl();
    if (!md || typeof md.getUserMedia !== 'function'){
      setState(fieldAudioRecorderReducer(state, { type: 'NO_DEVICE' }));
      return;
    }
    let s;
    try {
      s = await md.getUserMedia({ audio: true });
    } catch (err){
      if (state.status !== 'requesting_permission') return; // cancelado enquanto o prompt do navegador estava aberto
      const denied = !!(err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError'));
      setState(fieldAudioRecorderReducer(state, { type: denied ? 'PERMISSION_DENIED' : 'NO_DEVICE' }));
      return;
    }
    if (state.status !== 'requesting_permission'){
      // Cancelado enquanto a permissão ainda estava pendente -- libera o
      // stream recém-concedido IMEDIATAMENTE, nunca fica gravando
      // escondido em segundo plano.
      try { s.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignora */ }
      return;
    }
    const MR = mediaRecorderImpl();
    const mimeType = pickFieldAudioRecordingMimeType(MR);
    if (!MR || !mimeType){
      try { s.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignora */ }
      setState(fieldAudioRecorderReducer(state, { type: 'NO_DEVICE' }));
      return;
    }
    let rec;
    try {
      rec = new MR(s, { mimeType });
    } catch (err){
      try { s.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignora */ }
      setState(fieldAudioRecorderReducer(state, { type: 'RECORDER_ERROR' }));
      return;
    }
    stream = s;
    recorder = rec;
    recordedMimeType = mimeType;
    chunks = [];
    recordingStartedAt = nowFn();
    recorder.ondataavailable = (e) => { if (e && e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onerror = () => {
      resetCapture();
      setState(fieldAudioRecorderReducer(state, { type: 'RECORDER_ERROR' }));
    };
    recorder.onstop = () => {
      const finishedMimeType = (recorder && recorder.mimeType) || recordedMimeType;
      const finishedChunks = chunks;
      const startedAt = recordingStartedAt;
      releaseStream();
      recorder = null;
      chunks = [];
      // Guard contra o evento onstop chegar depois de um CANCEL já ter
      // revertido pra idle -- descarta o blob tardio, nunca o processa.
      if (state.status !== 'stopping') return;
      const blob = new Blob(finishedChunks, { type: finishedMimeType });
      const durationMs = startedAt ? Math.max(0, nowFn() - startedAt) : null;
      setState(fieldAudioRecorderReducer(state, { type: 'STOPPED' }));
      uploadRecordedBlob(blob, finishedMimeType, durationMs);
    };
    recorder.start();
    setState(fieldAudioRecorderReducer(state, { type: 'PERMISSION_GRANTED' }));
  }

  // Guard de concorrência: STOP só é aceito a partir de 'recording' --
  // um segundo clique em "Parar" (já em 'stopping'/'uploading') é um
  // no-op, nunca chama recorder.stop() duas vezes.
  function stop(){
    if (!canStopFieldAudioRecording(state.status)) return;
    setState(fieldAudioRecorderReducer(state, { type: 'STOP' }));
    if (recorder && recorder.state !== 'inactive'){
      try { recorder.stop(); } catch (err){
        resetCapture();
        setState(fieldAudioRecorderReducer(state, { type: 'RECORDER_ERROR', error: 'Não foi possível finalizar a gravação.' }));
      }
    }
  }

  // Guard de concorrência: CANCEL só é aceito a partir de
  // requesting_permission/recording/stopping -- nunca durante 'uploading'
  // (upload já em voo, sem suporte a abort na infraestrutura existente,
  // mesmo princípio já aplicado a upload/TTS) nem a partir de
  // idle/ready/error (nada a cancelar). Nunca altera field.audio -- só
  // libera o stream/estado local, quem integra nunca chama
  // updateFieldInEditorState() em resposta a isto.
  function cancel(){
    if (!canCancelFieldAudioRecording(state.status)) return;
    if (recorder && recorder.state !== 'inactive'){ try { recorder.stop(); } catch (e) { /* ignora */ } }
    resetCapture();
    setState(fieldAudioRecorderReducer(state, { type: 'CANCEL' }));
  }

  async function uploadRecordedBlob(blob, mimeType, durationMs){
    const baseType = baseAudioMimeType(mimeType);
    if (typeof cb.uploadFn !== 'function'){
      setState(fieldAudioRecorderReducer(state, { type: 'UPLOAD_FAILURE', error: 'Upload de gravação não está disponível nesta tela.' }));
      return;
    }
    const file = buildFieldAudioRecordingFile(blob, baseType);
    let res;
    try {
      // Mesmo `kind` que o painel de upload manual usaria pra áudio,
      // exceto pelo valor literal ('recording' em vez de 'audio') --
      // é essa diferença que dá ao path resultante um segmento
      // identificável como gravação (ver nota no topo do arquivo) e que
      // aciona a MESMA validação de MIME/tamanho dentro de
      // uploadFlashcardMedia()/uploadOwnFlashcardMedia() (generalizadas
      // minimamente nesta fase pra aceitar os dois valores de `kind`).
      res = await cb.uploadFn(file, 'recording', cb.fieldId || null);
    } catch (err){
      res = { ok: false, error: 'Não foi possível salvar a gravação agora.' };
    }
    if (!res || !res.ok){
      setState(fieldAudioRecorderReducer(state, { type: 'UPLOAD_FAILURE', error: (res && res.error) || undefined }));
      return;
    }
    setState(fieldAudioRecorderReducer(state, { type: 'UPLOAD_SUCCESS' }));
    if (typeof cb.onReady === 'function'){
      cb.onReady({
        url: res.url,
        path: res.path || null,
        mimeType: baseType,
        durationMs: (durationMs === null || durationMs === undefined) ? null : durationMs,
        recordedAt: new Date().toISOString(),
        deleteFn: cb.deleteFn || null,
      });
    }
  }

  function setCallbacks(partial){
    cb = Object.assign({}, cb, partial || {});
  }

  return {
    getState: () => state,
    onStateChange: (fn) => {
      listeners.push(fn);
      return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    },
    start, stop, cancel, setCallbacks,
  };
}

// ---------- Registro por Field (ver nota no topo do arquivo) ----------

const FIELD_AUDIO_RECORDER_REGISTRY = {};

function getOrCreateFieldAudioRecorder(fieldId, callbacks){
  let entry = FIELD_AUDIO_RECORDER_REGISTRY[fieldId];
  if (!entry){
    entry = createFieldAudioRecorder(Object.assign({ fieldId }, callbacks || {}));
    FIELD_AUDIO_RECORDER_REGISTRY[fieldId] = entry;
  } else if (callbacks){
    entry.setCallbacks(callbacks);
  }
  return entry;
}

// Chamado quando um Field é removido do editorState (ver shared/
// flashcard-field-editor.js, wireFieldEditorList) -- cancela qualquer
// captura em andamento (libera o microfone de verdade, nunca deixa um
// stream aberto órfão) e tira a instância do registro.
function releaseFieldAudioRecorder(fieldId){
  const entry = FIELD_AUDIO_RECORDER_REGISTRY[fieldId];
  if (!entry) return;
  entry.cancel();
  delete FIELD_AUDIO_RECORDER_REGISTRY[fieldId];
}

// Chamado nos pontos em que uma sessão de edição inteira termina (cartão
// novo resetado depois de um submit bem-sucedido, edição cancelada/
// concluída -- ver shared/admin-flashcards.js/shared/my-flashcards.js) --
// nunca deixa um microfone ligado depois que a professora/aluna saiu do
// formulário sem clicar explicitamente em "Cancelar"/"Parar".
function releaseAllFieldAudioRecorders(){
  Object.keys(FIELD_AUDIO_RECORDER_REGISTRY).forEach(releaseFieldAudioRecorder);
}
