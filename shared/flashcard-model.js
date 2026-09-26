// ---------- Fase 3 do prompt-mestre "reestruturação de flashcards inspirada
// no Anki" (ver CLAUDE.md) -- camada de compatibilidade ----------
//
// Este arquivo é o ÚNICO lugar do app, daqui pra frente, com permissão de
// ler as colunas legadas de teacher_flashcards/own_flashcards:
//   front, back_trans, front_pinyin, front_is_target_language, choices,
//   cloze_sentence, cloze_answer, cloze_answer_pinyin, audio_url, image_url
// Tudo que consome um flashcard (buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard em fr/zh app.js, e tudo depois deles) passa
// primeiro por interpretNoteFromRow() -- nunca lê `row.*` direto de novo.
//
// Modelo Note/Field/CardInstance conforme especificado na Fase 2 v2
// (aprovada pela autora, ver CLAUDE.md):
//   - Field só sabe seu idioma REAL (`lang`) e conteúdo -- nunca carrega
//     "target"/"native" nem posição.
//   - Note.fieldOrder é só a ordem de edição/exibição no editor -- NUNCA
//     interpretado como frente/verso (ressalva explícita da autora).
//   - Quem decide frente/verso (ou pergunta/resposta, ou qual campo é a
//     lacuna) é o CardInstance -- frontFieldIndex/backFieldIndex,
//     promptFieldIndex/correctFieldIndex, textFieldIndex, conforme o tipo.
//   - isStudyLanguageField() é só um helper pra regras que genuinamente
//     dependem do idioma do app -- nunca decide direção, áudio automático
//     ou apresentação (ressalva explícita da autora). Usado nesta fase só
//     UMA vez, como heurística de INTERPRETAÇÃO de dado histórico (ver
//     comentário em interpretNoteFromRow), não como regra de runtime.
//
// Depende de (já definido em fr/app.js e zh/app.js antes deste script ser
// efetivamente CHAMADO em runtime -- ordem de <script> não importa aqui
// porque nada neste arquivo roda no top-level, só declara funções):
//   - flashcardIdForRow(prefix, row)

const STUDY_LANG_FOR_APP_KEY = { frances: 'fr', mandarim: 'zh' };

// Fase 2 v2, ressalva da autora: helper de idioma, nunca de direção/áudio/
// apresentação. Único uso nesta fase: heurística de interpretação do
// audio_url legado (ver interpretNoteFromRow).
function isStudyLanguageField(field, appKey){
  return field.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

// ============================================================
// Fase 7b (ver CLAUDE.md) -- CONTRATO NATIVO DE Field.audio
// ============================================================
//
// Ausência de áudio é sempre `null` (nunca `{type:'none'}`) -- decisão
// explícita: todo o código já existente (buildNativeRuntimeFields,
// resolveCardField, comparação de estado do editor) já trata `field.audio`
// como "tem ou não tem" via checagem de truthiness (`field.audio || null`,
// `if (field.audio)`); introduzir um segundo valor "vazio mas presente"
// (`{type:'none'}`) duplicaria a representação de "nada" sem nenhum
// requisito real que precise distinguir "nunca configurado" de
// "explicitamente sem áudio" -- e obrigaria reescrever toda checagem
// truthy já existente pra também excluir esse novo caso.
//
// Quando presente, `field.audio` é SEMPRE um objeto com discriminador
// `type` (nunca `source` -- ver nota de compatibilidade abaixo) em um dos
// 4 valores de FIELD_AUDIO_TYPES:
//
//   { type: 'url', url }
//     -- link externo arbitrário, colado pela professora/aluna (nunca
//     hospedado pelo próprio app). `url` obrigatório.
//
//   { type: 'upload', url, uploadedAt, mimeType }
//     -- arquivo hospedado no próprio Storage do app (mesmo bucket
//     `flashcard-media` já usado pelo upload legado, migration 032).
//     `url` obrigatório; `uploadedAt`/`mimeType` são metadado opcional,
//     nunca lidos por resolveCardField() (só documentação/auditoria
//     futura). MESMO shape funcional que o código legado já produzia
//     (`{url, source:'upload'}`) -- só o nome do discriminador mudou
//     (ver nota de compatibilidade).
//
//   { type: 'tts', text, language, voiceId, rate, generationKey,
//     generatedUrl, generatedAt, storagePath }
//     -- CONFIGURAÇÃO de síntese de voz, nunca execução. Cada propriedade
//     é opcional/nullable -- um Field pode ter `type:'tts'` com TODAS
//     essas propriedades `null`, representando "o modo TTS foi escolhido
//     mas nada mais foi configurado ainda" (estado válido, não um erro).
//     - `text`: override opcional do texto a sintetizar -- `null` (o caso
//       comum) significa "sintetize field.content.value no momento da
//       geração".
//     - `language`: locale EXPLÍCITO da síntese (ex: 'fr-FR'/'zh-CN') --
//       DELIBERADAMENTE DISTINTO de `field.lang` (idioma pedagógico do
//       Field, ex: 'fr'/'zh'). NUNCA derivado automaticamente de
//       `field.lang` por nenhum código deste motor -- uma futura UI PODE
//       oferecer um valor sugerido a partir de `field.lang`, mas o que
//       fica gravado é sempre a escolha explícita (ou `null`, se a
//       pessoa ainda não escolheu). Nem `resolveFieldAudioUrl()` nem
//       `resolveCardField()` abaixo leem `language` pra decidir nada --
//       só existe como configuração, pra a geração (Fase 7f
//       implementação) consumir.
//     - `voiceId`/`rate`: configuração de síntese, mesma lógica de
//       "nullable = ainda não escolhido" que `language`.
//     - `generationKey`: hash SHA-256 determinístico de (texto efetivo +
//       language + voiceId + rate + providerModelId + configVersion --
//       os 2 últimos são CONSTANTES DE CÓDIGO, nunca persistidas aqui,
//       ver TTS_PROVIDER_MODEL_ID/TTS_CONFIG_VERSION abaixo) -- calculado
//       por computeTtsGenerationKey(). É dado DERIVADO, nunca a fonte de
//       verdade (a fonte de verdade são as propriedades de configuração
//       acima) -- serve só pra decidir idempotência/staleness
//       (isTtsAudioStale()), comparando o valor recém-computado contra
//       este já persistido.
//     - `generatedUrl`/`generatedAt`: o ATIVO já gerado e cacheado (se
//       existir) -- distinção explícita entre CONFIGURAÇÃO (as
//       propriedades acima, o que a pessoa pediu) e ATIVO RESOLVIDO
//       (isto, o que de fato existe como arquivo hoje). Um Field pode
//       ter `type:'tts'` com configuração completa e `generatedUrl:null`
//       (ainda não gerado) -- estado perfeitamente válido.
//     - `storagePath` (Fase 7f -- implementação): a REFERÊNCIA ESTÁVEL
//       ao objeto no bucket `flashcard-media` (ex:
//       `{userId}/tts-{fieldId}-{ts}-{rand}.wav`) -- É ESTA a IDENTIDADE
//       PERSISTENTE do asset, nunca `generatedUrl`. `generatedUrl` é só a
//       URL de ACESSO derivada/cacheada a partir dela
//       (`storage.from('flashcard-media').getPublicUrl(storagePath)`) --
//       hoje as duas coincidem em conteúdo (o bucket é público, sem URL
//       assinada/expirável, então `getPublicUrl()` de um path sempre
//       devolve a mesma URL, sem nunca precisar re-derivar), mas por que
//       guardar as duas mesmo assim: (1) uma futura rotina de limpeza de
//       áudio órfão (já cogitada, nunca implementada -- ver Fase 7e)
//       precisa do PATH pra chamar `storage.remove([path])`, nunca da
//       URL pública (extrair o path de dentro da URL seria acoplamento
//       implícito ao formato atual de URL pública do Supabase, frágil se
//       esse formato mudar); (2) se o bucket algum dia precisar virar
//       privado/com URL assinada (mudança de infraestrutura, não
//       decidida aqui), a URL vira algo com expiração -- o PATH continua
//       sendo a única coisa que permite re-derivar/re-assinar uma URL de
//       acesso nova sem precisar regenerar o áudio do zero. Nullable
//       (`null` quando o Field ainda não tem asset gerado, mesmo motivo
//       de `generatedUrl:null`) -- nunca lido por `resolveFieldAudioUrl()`/
//       `resolveCardField()` (que continuam expondo só `generatedUrl`
//       como `audioUrl` de exibição -- `storagePath` é metadado de
//       identidade/gestão, não de apresentação, mesmo papel que
//       `uploadedAt`/`mimeType` já tinham pro tipo `'upload'`). Adição
//       ADITIVA e OPCIONAL ao contrato -- nunca quebra dado já persistido
//       sem esta propriedade (um Field TTS gerado antes desta mudança
//       simplesmente tem `storagePath` ausente/`undefined`, continua
//       resolvendo `audioUrl` normalmente via `generatedUrl`, só não
//       participa de uma futura rotina de limpeza até ser regenerado).
//
//   { type: 'recording', url, recordedAt, mimeType, durationMs }
//     -- suporte estrutural pra gravação futura (MediaRecorder), NÃO
//     implementada nesta fase (sem microfone, sem UI, sem upload
//     específico -- ver CLAUDE.md, Fase 7 auditoria, subfase 7g). `url`
//     é nullable (`null` = "modo gravação escolhido, ainda sem arquivo",
//     mesmo espírito do TTS antes de gerar) -- uma vez gravado, aponta
//     pro MESMO tipo de URL que `upload` já usa (reaproveita a mesma
//     infraestrutura de Storage, nunca um mecanismo de persistência
//     paralelo).
//
// Nota de compatibilidade -- discriminador renomeado de `source` pra
// `type`: o shape anterior (`{url, source:'upload'}` / `{source:'tts',
// enabled:true}`, Fase 6B/8a) usava `source` como discriminador, mas
// NENHUM código em produção jamais LÊ essa propriedade (confirmado por
// grep antes de decidir isto) -- só é escrita. resolveCardField() sempre
// leu `.url` direto, então dado já persistido com `source` continua
// resolvendo corretamente mesmo sem nenhuma migração (a chave que
// importa pra resolução, `.url`, nunca mudou de nome). Ainda assim, os
// pontos que ESCREVEM esse shape (interpretação de audio_url legado, os
// call sites em interpretNoteFromRow()/attachLegacyMediaToFields) foram
// atualizados nesta fase pra emitir `type:'upload'` -- daqui pra frente,
// toda escrita nova usa o discriminador canônico único (`type`), nunca
// os dois convivendo como fontes de verdade diferentes.
const FIELD_AUDIO_TYPES = ['url', 'upload', 'tts', 'recording'];

// Validação ESTRUTURAL pura -- nunca lança, nunca decide nada sobre
// direção/apresentação. `null`/`undefined` são sempre válidos (ausência
// de áudio). Quando presente, exige um `type` reconhecido; exige `url`
// string não-vazia pra 'url'/'upload' (são inúteis sem link); 'tts' e
// 'recording' toleram todas as propriedades ausentes/null (representam
// configuração incompleta, não erro -- ver comentário acima). Usada por
// testes e por uma futura UI de edição de áudio (Fase 7e) -- NÃO é
// chamada hoje por validateNoteEditorStateForSave() (shared/
// flashcard-native-persistence.js): áudio continua opcional em qualquer
// Card Type, e a ausência de UI de edição real nesta fase significa que
// nenhum fluxo de salvar hoje pode produzir um `field.audio` inválido de
// qualquer jeito -- gate de validação forte fica pra quando a UI de
// edição (7e) existir de verdade.
function isValidFieldAudio(audio){
  if (audio === null || audio === undefined) return true;
  if (typeof audio !== 'object' || Array.isArray(audio)) return false;
  if (!FIELD_AUDIO_TYPES.includes(audio.type)) return false;
  if (audio.type === 'url' || audio.type === 'upload'){
    return typeof audio.url === 'string' && audio.url.length > 0;
  }
  if (audio.type === 'recording'){
    return audio.url === null || audio.url === undefined || (typeof audio.url === 'string' && audio.url.length > 0);
  }
  // type === 'tts' -- toda propriedade é opcional/nullable (ver comentário
  // acima); só rejeita se algo presente tiver o TIPO errado.
  const strOrNull = (v) => v === null || v === undefined || typeof v === 'string';
  return strOrNull(audio.text) && strOrNull(audio.language) && strOrNull(audio.voiceId)
    && (audio.rate === null || audio.rate === undefined || typeof audio.rate === 'number')
    && strOrNull(audio.generationKey) && strOrNull(audio.generatedUrl) && strOrNull(audio.generatedAt) && strOrNull(audio.storagePath);
}

// Único ponto que decide "que URL este `field.audio` resolve HOJE" --
// nunca gera TTS, nunca busca nada externo, nunca escolhe áudio baseado
// em `field.lang`. Defensivo: qualquer shape não reconhecido (incluindo
// lixo/estado inválido) devolve `null` em vez de lançar -- resolução pra
// EXIBIÇÃO nunca deve quebrar a tela por causa de um dado malformado
// (rejeitar dado malformado é trabalho de isValidFieldAudio(), numa
// camada de validação, não de leitura). Compatível com o shape anterior
// (`source` em vez de `type`) sem nenhuma normalização especial -- a
// única propriedade que importa pra 'url'/'upload'/'recording' já era
// `.url` desde a Fase 6B, nome nunca mudou.
function resolveFieldAudioUrl(audio){
  if (!audio || typeof audio !== 'object') return null;
  const candidate = audio.type === 'tts' ? audio.generatedUrl : audio.url;
  return typeof candidate === 'string' && candidate ? candidate : null;
}

// ---------- Fase 7e (upload de áudio por Field, ver CLAUDE.md) ----------
//
// Espelha EXATAMENTE os valores da migration 046
// (shared/supabase_migrations/046_flashcard_media_size_mime_limits.sql,
// aplicada ao vivo no bucket `flashcard-media`) -- nunca uma lista
// inventada a partir de conhecimento geral. A validação aqui é uma
// SEGUNDA camada, cliente, redundante de propósito com o
// file_size_limit/allowed_mime_types do próprio bucket (regra já travada
// neste arquivo/CLAUDE.md: "nunca confiar somente no cliente") -- dá
// feedback imediato sem round-trip de rede, mas o Storage rejeita de
// qualquer jeito um upload que burle esta checagem (ex: via devtools).
const FIELD_AUDIO_UPLOAD_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac',
  'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a',
];
const FIELD_AUDIO_UPLOAD_MAX_BYTES = 5242880; // 5 MiB

// Validação PURA de um File/Blob antes de subir pro Storage -- nunca faz
// I/O, nunca lança. `file.type` (MIME reportado pelo navegador) é a
// mesma fonte que `allowed_mime_types` do bucket já usa pra decidir --
// não é 100% confiável (um navegador pode reportar tipo errado/vazio),
// por isso é só a PRIMEIRA camada; a policy do bucket é quem de fato
// impede um upload malicioso. `file.name`/extensão NUNCA entram nesta
// checagem (Seção 15 -- nunca confiar no nome de arquivo pra decisão de
// segurança).
function validateFieldAudioUploadFile(file){
  if (!file) return { ok: false, error: 'Nenhum arquivo selecionado.' };
  if (typeof file.size === 'number' && file.size <= 0) return { ok: false, error: 'Arquivo vazio.' };
  if (typeof file.size === 'number' && file.size > FIELD_AUDIO_UPLOAD_MAX_BYTES){
    return { ok: false, error: 'Arquivo maior que 5 MB -- escolha um arquivo de áudio menor.' };
  }
  const type = file.type || '';
  if (!FIELD_AUDIO_UPLOAD_MIME_TYPES.includes(type)){
    return { ok: false, error: 'Formato de áudio não suportado. Use MP3, M4A/AAC, OGG, WAV ou WEBM.' };
  }
  return { ok: true };
}

// ---------- Fase 7f (TTS explícito por Field, implementação -- ver
// CLAUDE.md) -- contrato de geração compartilhado ----------
//
// providerModelId/configVersion são CONSTANTES DE CÓDIGO, nunca
// persistidas em Field.audio -- decisão explícita da auditoria da Fase
// 7f (Seção 21): o shape já travado na Fase 7b (text/language/voiceId/
// rate/generationKey/generatedUrl/generatedAt) já é suficiente; os 2
// conceitos novos (Seção 9 da auditoria: "generationKey precisa incluir
// QUAL provedor/modelo gerou, e QUAL versão do algoritmo de geração, pra
// invalidar cache numa troca futura") entram só como entrada do hash,
// espelhadas EXATAMENTE aqui e em supabase/functions/tts-generate/index.ts
// -- os dois lados precisam concordar no mesmo valor pro cliente conseguir
// calcular "está desatualizado?" sem round-trip de rede. Trocar de
// provedor/algoritmo no futuro = mudar as 2 constantes nos DOIS lugares --
// invalida o cache de TODO Field TTS já gerado (generationKey muda pra
// todo mundo), sem nenhuma migração de dado.
const TTS_PROVIDER_MODEL_ID = 'unconfigured'; // trocar quando um provedor real for contratado (ver Edge Function tts-generate)
const TTS_CONFIG_VERSION = 1;

// Limite de caracteres por geração -- controle de custo (auditoria Fase
// 7f, Seção 14/15: "nunca gerar um texto absurdamente longo"). Mesmo
// valor espelhado na Edge Function (2ª camada real -- nunca confia só no
// cliente, mesma disciplina de FIELD_AUDIO_UPLOAD_MAX_BYTES acima).
const TTS_TEXT_MAX_LENGTH = 500;

// Hash SHA-256 das 6 entradas do generationKey (Seção 9 da auditoria), em
// ORDEM FIXA -- nunca JSON.stringify de um objeto (ordem de chave não é
// garantida entre engines/versões, e um hash que depende disso deixaria
// de ser determinístico). Usa Web Crypto (crypto.subtle), disponível tanto
// no navegador quanto no runtime Deno das Edge Functions -- mesmo
// algoritmo nos dois lados, sem duplicar lógica de hash em JS puro.
// Assíncrona (subtle.digest é sempre Promise) -- só chamada em pontos que
// já são async (gerar/checar "está desatualizado?"), nunca no caminho de
// render síncrono (resolveCardField()/resolveFieldAudioUrl() continuam
// 100% síncronas, nunca tocam nisto).
async function computeTtsGenerationKey(effectiveText, language, voiceId, rate){
  const parts = [
    effectiveText || '',
    language || '',
    voiceId || '',
    (rate === null || rate === undefined) ? '' : String(rate),
    TTS_PROVIDER_MODEL_ID,
    String(TTS_CONFIG_VERSION),
  ];
  const input = parts.map(p => encodeURIComponent(p)).join('\u001F');
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Texto EFETIVO que seria sintetizado AGORA pra um dado Field + a
// configuração TTS que ele já carrega -- regra já travada na Fase 7c
// (Seção F): se `audio.text` é um override explícito (não-null,
// não-vazio), usa ele; senão usa `field.content.value` (o texto de
// exibição do próprio Field) -- é essa regra que decide QUAL mudança
// invalida o cache (editar o Field invalida só quando não há override;
// editar o override nunca é afetado por uma edição do texto de exibição).
function ttsEffectiveText(field, audioConfig){
  const override = (audioConfig && typeof audioConfig.text === 'string') ? audioConfig.text : null;
  if (override !== null && override !== '') return override;
  return (field && field.content && field.content.value) || '';
}

// "Desatualizado" é sempre um estado CALCULADO na hora (Seção 9/10 da
// auditoria), nunca um booleano persistido em Field.audio -- compara o
// generationKey recém-computado (a partir do estado ATUAL do Field)
// contra o já persistido em `audio.generationKey`. Um Field sem
// `type:'tts'`, ou com `type:'tts'` mas ainda sem `generatedUrl` (nunca
// gerado), nunca é "desatualizado" -- essa pergunta só faz sentido quando
// já existe um ativo gerado pra comparar contra.
async function isTtsAudioStale(field){
  const audio = field && field.audio;
  if (!audio || audio.type !== 'tts' || !audio.generatedUrl) return false;
  const text = ttsEffectiveText(field, audio);
  const freshKey = await computeTtsGenerationKey(text, audio.language, audio.voiceId, audio.rate);
  return freshKey !== audio.generationKey;
}

// Validação de ENTRADA pura (nunca I/O) -- mesma disciplina de
// validateFieldAudioUploadFile acima: camada CLIENTE, feedback imediato
// sem round-trip; a Edge Function tts-generate valida de novo do lado do
// servidor (2ª camada real, nunca confia só nisto).
function validateTtsGenerationRequest({ text, language }){
  const cleanText = (text || '').trim();
  if (!cleanText) return { ok: false, error: 'Digite o texto a sintetizar.' };
  if (cleanText.length > TTS_TEXT_MAX_LENGTH){
    return { ok: false, error: `Texto muito longo (máximo ${TTS_TEXT_MAX_LENGTH} caracteres).` };
  }
  if (!language || typeof language !== 'string'){
    return { ok: false, error: 'Escolha o idioma da síntese.' };
  }
  return { ok: true };
}

// Rótulos de erro compartilhados entre shared/teacher-flashcards.js e
// shared/own-flashcards.js (os 2 serviços de front-end que chamam a Edge
// Function tts-generate) -- declarado UMA vez só aqui (shared/
// flashcard-model.js já carrega antes dos dois, mesma posição de
// FIELD_AUDIO_UPLOAD_MIME_TYPES) pra nunca colidir como top-level `const`
// duplicado no mesmo escopo global de documento (mesmo problema já
// corrigido na Fase 6D.2 pra CARD_TYPE_UI_META).
const TTS_GENERATION_ERROR_LABELS = {
  provider_not_configured: 'Geração de áudio por TTS ainda não está configurada no servidor (nenhum provedor de voz contratado).',
  provider_not_implemented: 'Geração de áudio por TTS ainda não está disponível -- infraestrutura em construção.',
  rate_limited: 'Muitas gerações de áudio em pouco tempo -- espere alguns minutos e tente de novo.',
  not_authorized: 'Sem permissão para gerar áudio para este cartão.',
  invalid_session: 'Sessão expirada -- faça login de novo.',
  text_too_long: `Texto muito longo (máximo ${TTS_TEXT_MAX_LENGTH} caracteres).`,
  missing_text: 'Digite o texto a sintetizar.',
  missing_language: 'Escolha o idioma da síntese.',
  upload_failed: 'Áudio gerado, mas não foi possível salvá-lo -- tente de novo.',
};

const FLASHCARD_MODEL_FSRS_DEFAULTS = Object.freeze({
  ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0,
  stability: 0, difficulty: 0, state: 'new', lastReview: null,
  fsrsReps: 0, fsrsLapses: 0,
});

// ---------- Sintaxe Cloze nova: {{cN::resposta}} ----------
// Puras -- só entendem a sintaxe NOVA, nunca cloze_sentence/cloze_answer.
const CLOZE_MARK_RE = /\{\{(c\d+)::(.*?)\}\}/g;

// Fase 5 (ver CLAUDE.md) -- {{cN::texto|compareAnswer}}: "|" separa o
// texto que fica embutido na frase (sempre mostrado ao revelar) do valor
// de comparação opcional daquela lacuna (pinyin no zh). Sem "|", a marca
// não tem compareAnswer próprio (caso comum do fr -- o próprio texto é a
// resposta esperada). Nunca confundir com "/" (aceita múltiplas formas
// dentro do próprio texto ou compareAnswer, ex. "viens/vient" -- feature
// separada, já tratada por acceptedForms() em fr/zh app.js).
function splitClozeMarkRaw(raw){
  const pipeIdx = raw.indexOf('|');
  if (pipeIdx === -1) return { answer: raw, compareAnswer: null };
  return { answer: raw.slice(0, pipeIdx), compareAnswer: raw.slice(pipeIdx + 1) };
}

function parseClozeMarks(text){
  const marks = [];
  let m;
  CLOZE_MARK_RE.lastIndex = 0;
  while ((m = CLOZE_MARK_RE.exec(text))){
    const { answer, compareAnswer } = splitClozeMarkRaw(m[2]);
    marks.push({ id: m[1], answer, compareAnswer });
  }
  return marks;
}

// Mostra `text` com a lacuna `targetMarkId` oculta (___) por padrão, e
// qualquer outra marcação da mesma nota já revelada como texto puro --
// relevante quando uma nota tiver c1+c2+c3 (Fase 5: geração real disso
// existe agora em interpretNoteFromRow(), ver seção correspondente).
// `opts.reveal=true` também revela o alvo. Nunca vaza a parte pós-"|"
// (compareAnswer) no texto renderizado -- só o texto embutido (answer).
function renderClozeText(text, targetMarkId, opts){
  const reveal = !!(opts && opts.reveal);
  CLOZE_MARK_RE.lastIndex = 0;
  return text.replace(CLOZE_MARK_RE, (_, id, raw) => {
    const { answer } = splitClozeMarkRaw(raw);
    if (id !== targetMarkId) return answer;
    return reveal ? answer : '___';
  });
}

// ============================================================
// Fase 6B (ver CLAUDE.md) -- Note NATIVA: persistência real de Fields como
// unidade de conteúdo, ao lado (nunca em cima) da inferência implícita que
// já existia. `fields` (array de Field) + `card_generation_mode` (string)
// SEMPRE pareados numa linha nativa -- ausência dos dois é o caminho
// legado (ramo `else` de interpretNoteFromRow, intocado desde a Fase 3);
// presença de só um dos dois é um estado inválido, nunca gravado por
// escrita correta (CHECK constraint proposto pra migration, ainda NÃO
// aplicada) mas SEMPRE revalidado aqui -- o motor nunca confia só na
// constraint do banco.
//
// Shape de Field persistido (row.fields[i]):
//   { id, lang, role, content: {type:'plain', value}, audio, image, pinyinFieldId }
// -- `id` é estável (não muda se a ordem dos Fields mudar no editor) e é o
// que `pinyinFieldId` referencia -- nunca um índice de array (índice muda
// se a ordem mudar; id não). Nada no motor de geração de CardInstance usa
// `id` pra decidir DIREÇÃO -- frontFieldIndex/backFieldIndex/promptFieldIndex/
// answerFieldIndex continuam por ÍNDICE de array, exatamente como o
// caminho legado já fazia (ver buildNativeRuntimeFields/interpretNativeNoteFromRow
// abaixo). `role` NUNCA decide direção de normal/normal_reversed/
// type_answer/cloze (restrição explícita da autora: "role não determina
// direção") -- pra esses 4 tipos, o convênio é sempre posicional (índice 0
// = front/prompt/texto-cloze, índice 1 = back/answer/tradução), mesmo se a
// professora nunca marcar `role` em nenhum Field. Só múltipla escolha
// consulta `role`, porque é o único tipo com mais de 2 Fields
// semanticamente distintos (prompt/answer/1-3 distractors) -- posição
// sozinha não basta pra desambiguar 5 fields.
// ============================================================

const CARD_GENERATION_MODES = ['normal', 'normal_reversed', 'multiple_choice', 'cloze', 'type_answer'];

function isNoteFieldsPresent(row){
  return row.fields !== null && row.fields !== undefined;
}
function isCardGenerationModePresent(row){
  return row.card_generation_mode !== null && row.card_generation_mode !== undefined && row.card_generation_mode !== '';
}

// Cardinalidade de múltipla escolha nativa -- o motor valida, nunca confia
// só na UI (restrição explícita da autora: "não confie apenas na validação
// da UI"). Exatamente 1 Field role:'prompt', exatamente 1 role:'answer'
// (nunca o MESMO Field nos dois papéis), 1 a 3 role:'distractor'.
function validateMultipleChoiceFields(fields){
  const prompts = fields.filter(f => f.role === 'prompt');
  const answers = fields.filter(f => f.role === 'answer');
  const distractors = fields.filter(f => f.role === 'distractor');
  if (prompts.length !== 1) return { ok: false, error: `Múltipla escolha precisa de exatamente 1 Field com role 'prompt' (encontrado: ${prompts.length}).` };
  if (answers.length !== 1) return { ok: false, error: `Múltipla escolha precisa de exatamente 1 Field com role 'answer' (encontrado: ${answers.length}).` };
  if (prompts[0].id === answers[0].id) return { ok: false, error: 'O mesmo Field não pode ser prompt e resposta ao mesmo tempo.' };
  if (distractors.length < 1 || distractors.length > 3) return { ok: false, error: `Múltipla escolha precisa de 1 a 3 Fields com role 'distractor' (encontrado: ${distractors.length}).` };
  return { ok: true };
}

// Validação estrutural completa de uma linha nativa -- chamada por
// interpretNoteFromRow() ANTES de gerar qualquer CardInstance. Devolve
// {ok:false,error} em vez de lançar, pra ser testável isoladamente;
// interpretNoteFromRow() decide lançar a partir do resultado (ver abaixo).
function validateNativeNoteRow(row){
  const hasFields = isNoteFieldsPresent(row);
  const hasMode = isCardGenerationModePresent(row);
  if (hasFields !== hasMode){
    return { ok: false, error: 'fields e card_generation_mode precisam estar ambos presentes ou ambos ausentes (nunca só um).' };
  }
  if (!hasFields) return { ok: true, native: false };
  if (!Array.isArray(row.fields) || !row.fields.length){
    return { ok: false, error: 'fields precisa ser um array não vazio quando presente.' };
  }
  if (!CARD_GENERATION_MODES.includes(row.card_generation_mode)){
    return { ok: false, error: `card_generation_mode desconhecido: "${row.card_generation_mode}".` };
  }
  if (row.fields.some(f => !f || !f.id)){
    return { ok: false, error: 'Todo Field precisa ter um id.' };
  }
  const ids = row.fields.map(f => f.id);
  if (new Set(ids).size !== ids.length){
    return { ok: false, error: 'Fields precisam ter ids únicos dentro da mesma Note.' };
  }
  for (const f of row.fields){
    if (f.pinyinFieldId != null && !ids.includes(f.pinyinFieldId)){
      return { ok: false, error: `pinyinFieldId "${f.pinyinFieldId}" não corresponde a nenhum Field desta Note.` };
    }
  }
  if (row.card_generation_mode === 'multiple_choice'){
    const mc = validateMultipleChoiceFields(row.fields);
    if (!mc.ok) return mc;
  } else {
    // normal/normal_reversed/type_answer/cloze são todos posicionais (ver
    // contentFieldIndices abaixo) -- precisam de pelo menos 2 "slots" de
    // conteúdo, descontando Fields que só existem como par de pinyin de
    // outro Field.
    const slots = contentFieldIndices(row.fields);
    if (slots.length < 2){
      return { ok: false, error: `Este modo precisa de pelo menos 2 Fields de conteúdo, descontando pares de pinyin (encontrado: ${slots.length}).` };
    }
  }
  return { ok: true, native: true };
}

// Converte row.fields (persistido, pinyinFieldId por ID ESTÁVEL) pro shape
// runtime que resolveCardField() já consome (pinyinFieldIndex por ÍNDICE) --
// resolveCardField() não precisa de NENHUMA mudança, só esta função traduz
// id->índice uma vez, na leitura (e continua válida mesmo que a ordem dos
// Fields mude no editor, porque a referência persistida é sempre por id).
// `audio` é passado através sem transformação -- resolveCardField() já lê
// `.url` dele defensivamente (upload tem url, tts não tem, então nunca
// produz audioUrl automático -- correto, TTS é gerado em runtime pelo
// motor de pronúncia já existente, nunca guarda URL própria).
// `image` é só armazenado aqui (`field.image`), sem nenhuma resolução pra
// view/renderer ainda -- modelagem/persistência desta fase, comportamento
// visual fica pra Fase 6C/D (ver CLAUDE.md, decisão explícita da autora).
function buildNativeRuntimeFields(rawFields){
  const idToIndex = new Map(rawFields.map((f, i) => [f.id, i]));
  return rawFields.map(f => {
    const field = {
      lang: f.lang,
      text: (f.content && f.content.value) || '',
      role: f.role || null,
      audio: f.audio || null,
      image: f.image || null,
    };
    if (f.pinyinFieldId != null && idToIndex.has(f.pinyinFieldId)){
      field.pinyinFieldIndex = idToIndex.get(f.pinyinFieldId);
    }
    return field;
  });
}

function fieldIndexByRole(rawFields, role){
  return rawFields.findIndex(f => f.role === role);
}

// "Slot" posicional (front/back, prompt/answer, texto/tradução) pula
// Fields que são satélites de pinyin de outro Field -- mesmo espírito de
// audio/image (um Field de pinyin não é uma posição própria, é um anexo de
// outro Field; só é modelado como Field separado, em vez de inline, por
// herdar o shape que resolveCardField()/pinyinFieldIndex já usa desde a
// Fase 3). Sem isso, um Note zh de 3 Fields (hanzi+pinyin+tradução) teria
// "back" apontando pro Field de PINYIN (índice 1) em vez da tradução
// (índice 2) -- quebraria o mesmo convênio que o caminho legado já usa
// (ver ramo `else`, isZh: front=0, back=2, pulando o pinyin do meio).
// Nenhuma `role` envolvida aqui -- é puramente estrutural (quem é alvo de
// pinyinFieldId de outro Field nunca conta como slot de conteúdo).
function contentFieldIndices(rawFields){
  const pinyinTargetIds = new Set(rawFields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const indices = [];
  rawFields.forEach((f, i) => { if (!pinyinTargetIds.has(f.id)) indices.push(i); });
  return indices;
}

// Gera { note, cards } a partir de uma linha NATIVA já validada por
// validateNativeNoteRow(). Mesmo shape de retorno do caminho legado -- todo
// consumidor a jusante (buildEngineCardsFromRow, resolveCardContentView, os
// resolvers) já é agnóstico a qual dos dois caminhos produziu a Note --
// nenhum deles precisa de nenhuma mudança por causa desta função existir.
function interpretNativeNoteFromRow(row, { origin, appKey, idPrefix, cardId }){
  const rawFields = row.fields;
  const fields = buildNativeRuntimeFields(rawFields);
  const note = {
    id: cardId,
    legacyRowId: row.id,
    origin,
    languageAppKey: appKey,
    status: row.status,
    note: row.note || null,
    // Fase 6B -- imagem nativa vive no FIELD agora (ver buildNativeRuntimeFields),
    // não na Note -- "imagem como propriedade exclusiva da Note" foi
    // explicitamente rejeitado pela autora. Note.image continua existindo
    // só pro caminho LEGADO (ramo `else`, intocado) -- nunca populado aqui.
    image: null,
    fields,
    fieldOrder: fields.map((_, i) => i),
  };

  const mode = row.card_generation_mode;

  if (mode === 'multiple_choice'){
    const promptIdx = fieldIndexByRole(rawFields, 'prompt');
    const answerIdx = fieldIndexByRole(rawFields, 'answer');
    const distractorTexts = rawFields
      .filter(f => f.role === 'distractor')
      .map(f => (f.content && f.content.value) || '');
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'multiple_choice',
      promptFieldIndex: promptIdx, correctFieldIndex: answerIdx, distractors: distractorTexts,
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  // normal/normal_reversed/type_answer/cloze são todos posicionais --
  // "slot" 0 = front/prompt/texto-cloze, slot 1 = back/answer/tradução,
  // PULANDO Fields que são satélite de pinyin de outro Field (ver
  // contentFieldIndices -- é o que faz um Note zh de 3 Fields resolver
  // front=hanzi/back=tradução, sem cair no Field de pinyin do meio,
  // exatamente como o caminho legado já faz). validateNativeNoteRow() já
  // garantiu slots.length>=2 antes de chegar aqui.
  const slots = contentFieldIndices(rawFields);

  if (mode === 'type_answer'){
    // Fase 6B -- primeiro tipo genuinamente novo no motor (nenhum dado
    // legado jamais representou "digite a resposta", é 100% nativo, sem
    // caminho de inferência implícita correspondente no ramo `else`).
    // compareAnswer NÃO é gravado aqui como campo próprio -- reaproveita o
    // MESMO pareamento hanzi/pinyin que Normal já usa via pinyinFieldIndex
    // (ver resolveTypeAnswerCardView, que ganhou um fallback novo pra
    // isso): o Field de resposta pode ter um pinyinFieldIndex, e o
    // resolver cai pra ele -- nenhum canal de comparação novo inventado.
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'type_answer',
      promptFieldIndex: slots[0], answerFieldIndex: slots[1],
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  if (mode === 'cloze'){
    // slots[0] é o texto com as marcas {{cN::...}} -- mesmo convênio
    // posicional do caminho legado (textFieldIndex:0), só a FONTE do texto
    // muda (Field nativo em vez da coluna cloze_sentence). Mecanismo de
    // marcas (parseClozeMarks/renderClozeText) inalterado, já validado na
    // Fase 5 -- reaproveitado aqui sem nenhuma mudança.
    const text = fields[slots[0]].text;
    const marks = parseClozeMarks(text);
    const cards = marks.map(mark => ({
      id: `${cardId}-${mark.id}`, noteId: cardId, cardTypeId: 'cloze', markId: mark.id,
      textFieldIndex: slots[0], translationFieldIndex: slots[1],
      compareAnswer: null, // idem legado -- resolveClozeCardView() cai pro compareAnswer embutido na própria marca (mark.compareAnswer)
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }));
    return { note, cards };
  }

  if (mode === 'normal_reversed'){
    // buildReversedCardInstancePair já existe desde a Fase 4a, reaproveitada
    // sem nenhuma mudança -- só os índices passados agora respeitam
    // contentFieldIndices() em vez de 0/1 fixos.
    const cards = buildReversedCardInstancePair(cardId, slots[0], slots[1]);
    return { note, cards };
  }

  // mode === 'normal'
  const cards = [{
    id: cardId, noteId: cardId, cardTypeId: 'normal',
    frontFieldIndex: slots[0], backFieldIndex: slots[1],
    ...FLASHCARD_MODEL_FSRS_DEFAULTS,
  }];
  return { note, cards };
}

// ---------- O adapter ----------
// row: linha crua de teacher_flashcards/own_flashcards.
// opts.origin: 'teacher' | 'self'
// opts.appKey: 'frances' | 'mandarim' (== APP_KEY do site)
// opts.idPrefix: 't' | 's' (mesmo prefixo que flashcardIdForRow já usa)
//
// Devolve { note, cards }:
//   - note: Note (Fase 2 v2)
//   - cards: array de CardInstance (sempre 1 elemento pra dado legado --
//     Cloze com múltiplas lacunas nunca ocorre aqui, porque cloze_sentence
//     só suporta um "___" por natureza da coluna antiga)
// Fase 4d (ver CLAUDE.md): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// removida -- o fluxo real agora é sempre Note+CardInstance ->
// resolveCardField() -> renderer/feature (ver seção "Fase 4b" abaixo),
// nunca mais um objeto legado intermediário.
function interpretNoteFromRow(row, opts){
  const { origin, appKey, idPrefix } = opts;
  const isZh = appKey === 'mandarim';
  const studyLang = STUDY_LANG_FOR_APP_KEY[appKey];
  const cardId = flashcardIdForRow(idPrefix, row);

  // Fase 6B (ver CLAUDE.md) -- Note NATIVA: fields+card_generation_mode
  // (snake_case, nome real de coluna decidido nesta fase) sempre PAREADOS.
  // Presença de só um dos dois é estado inválido, rejeitado por
  // validateNativeNoteRow() -- o motor nunca confia só no CHECK constraint
  // proposto pra migration (ainda NÃO aplicada), valida de novo aqui.
  // Ramo curto-circuita ANTES de qualquer lógica legada abaixo -- nenhuma
  // linha com fields populado toca no código que segue.
  if (isNoteFieldsPresent(row) || isCardGenerationModePresent(row)){
    const validation = validateNativeNoteRow(row);
    if (!validation.ok) throw new Error(`Note nativa inválida (linha id=${row.id}): ${validation.error}`);
    return interpretNativeNoteFromRow(row, { origin, appKey, idPrefix, cardId });
  }

  // Inferência implícita de sempre (Fase 3), pro dado 100% legado (sem
  // fields) -- comportamento intocado.
  //
  // Fase 6B, mudança em relação à Fase 5: o mecanismo `row.cardGenerationMode`
  // (camelCase, só em memória de teste -- nunca existiu como coluna SQL)
  // que permitia "normal_reversed sobre colunas legadas soltas, sem
  // fields" foi RETIRADO. A própria Fase 5 já registrava esse nome como
  // provisório ("o nome físico da coluna fica pra Fase 6") -- agora que a
  // Fase 6B decide o nome real (`card_generation_mode`, sempre pareado com
  // `fields`), manter os 2 mecanismos vivos ao mesmo tempo criaria duas
  // fontes de verdade pro mesmo conceito, exatamente o que este projeto
  // evita sistematicamente (ver princípio geral no topo do CLAUDE.md).
  // Nenhuma linha real jamais usou esse campo -- retirada sem impacto em
  // produção. Quem quiser normal_reversed agora usa uma Note nativa
  // (fields+card_generation_mode), não mais um flag solto sobre colunas
  // legadas -- testes que exercitavam o mecanismo antigo foram
  // atualizados/substituídos (ver relatório desta fase).
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const cardTypeId = isCloze ? 'cloze' : isMC ? 'multiple_choice' : 'normal';

  const noteBase = {
    id: cardId,                 // legado: Note.id == id do CardInstance principal (ver ressalva de IDs abaixo)
    legacyRowId: row.id,        // numérico, cru -- mesma info que `rowId` já carregava antes desta fase
    origin,
    languageAppKey: appKey,
    status: row.status,
    note: row.note || null,
    // Achado desta fase (ver relatório): image_url legado NUNCA foi
    // vinculado a um lado específico -- é ilustração do conceito inteiro,
    // não de um Field. Fica no nível da Note, não de um Field individual
    // (Field.image continua existindo no modelo pra uso futuro do editor
    // novo, Fase 6+, só não é usado por este adapter).
    image: row.image_url ? { url: row.image_url } : null,
  };

  if (isCloze){
    // Fase 5 (ver CLAUDE.md) -- detecção estrutural, não depende de
    // explicitMode: se cloze_sentence já contém marcação nativa
    // {{cN::...}}, ela é a ÚNICA fonte de verdade pra geração -- nunca
    // misturada com cloze_answer/cloze_answer_pinyin legados da mesma
    // linha (ajuste explícito da autora). Nenhum dado legado real produz
    // isso hoje (schema antigo só permite "___", nunca "{{c") -- só uma
    // linha construída por um editor futuro (Fase 6) ou por teste.
    const hasNativeMarks = /\{\{c\d+::/.test(row.cloze_sentence || '');
    if (hasNativeMarks){
      // Um CardInstance por cN distinto -- id/FSRS/histórico próprios
      // pra cada um (`${cardId}-${markId}`, nunca colide com `-b` de
      // normal_reversed nem com `-r{revision}` de edição). A sintaxe
      // {{cN::texto}}/{{cN::texto|compareAnswer}} é representação
      // INTERNA apenas -- a professora nunca digita isso à mão, quem
      // gera é o editor visual (Fase 6, fora do escopo aqui).
      const text = row.cloze_sentence;
      const textField = { lang: isZh ? 'zh' : studyLang, text };
      if (row.audio_url) textField.audio = { url: row.audio_url, type: 'upload' };
      const note = {
        ...noteBase,
        fields: [
          textField,
          { lang: 'pt-BR', text: row.back_trans },
        ],
        fieldOrder: [0, 1],
      };
      const marks = parseClozeMarks(text);
      const cards = marks.map(mark => ({
        id: `${cardId}-${mark.id}`, noteId: cardId, cardTypeId: 'cloze', markId: mark.id,
        textFieldIndex: 0, translationFieldIndex: 1,
        // compareAnswer null de propósito -- resolveClozeCardView() cai
        // pro compareAnswer embutido na própria marca (mark.compareAnswer,
        // extraído do "|" por parseClozeMarks), nunca lê cloze_answer_pinyin
        // aqui (seria misturar as duas fontes, proibido pelo ajuste 3).
        compareAnswer: null,
        ...FLASHCARD_MODEL_FSRS_DEFAULTS,
      }));
      return { note, cards };
    }

    // ÚNICO trecho que ainda conhece cloze_sentence/cloze_answer/
    // cloze_answer_pinyin (caminho legado, "___" -- inalterado desde a
    // Fase 3) -- reconstrói a sintaxe {{c1::...}} na hora.
    // zh: o que a aluna DIGITA é pinyin (cloze_answer_pinyin), o que está
    // de fato escrito na frase e é revelado depois é hanzi (cloze_answer)
    // -- por isso a marcação embute o hanzi (é o conteúdo real da frase)
    // e `compareAnswer` no CardInstance guarda separadamente o valor de
    // comparação quando ele difere do texto embutido (só acontece no zh).
    const text = row.cloze_sentence.replace('___', `{{c1::${row.cloze_answer}}}`);
    const textField = { lang: isZh ? 'zh' : studyLang, text };
    // Áudio próprio em cartão cloze é renderizado por renderClozeReviewCard
    // (confirmado na auditoria da Fase 0/1) -- precisa sobreviver à ponte
    // igual ao caso normal/MC abaixo, vinculado ao único Field que
    // representa o idioma estudado (o campo de texto com a lacuna).
    if (row.audio_url) textField.audio = { url: row.audio_url, type: 'upload' };
    const note = {
      ...noteBase,
      fields: [
        textField,
        { lang: 'pt-BR', text: row.back_trans },
      ],
      fieldOrder: [0, 1],
    };
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'cloze', markId: 'c1',
      textFieldIndex: 0, translationFieldIndex: 1,
      compareAnswer: isZh ? (row.cloze_answer_pinyin || '') : null,
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards };
  }

  // Normal / Múltipla escolha -- mesmo par de Fields (frente/verso); só o
  // CardInstance difere entre os dois tipos.
  let fields, frontFieldIndex, backFieldIndex;
  if (isZh){
    // zh nunca inverte (Fase 0/1 da auditoria: front_is_target_language
    // nunca é lido em zh/app.js) -- hanzi sempre no índice 0, junto do
    // pinyin (pinyinFieldIndex), tradução sempre no índice 2.
    fields = [
      { lang: 'zh', text: row.front, pinyinFieldIndex: 1 },
      { lang: 'zh-pinyin', text: row.front_pinyin || '' },
      { lang: 'pt-BR', text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 2;
  } else {
    // fr: a coluna `front` do banco sempre mapeia pro índice 0 (é
    // literalmente "o que a professora digitou na caixa Frente") --
    // front_is_target_language decide só o IDIOMA de cada índice, NUNCA
    // a posição (posição continua fixa: [0]=front,[1]=back, exatamente
    // como a coluna do banco já era).
    fields = [
      { lang: studyLang, text: row.front },
      { lang: 'pt-BR', text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 1;
    if (row.front_is_target_language === false){
      fields[0].lang = 'pt-BR';
      fields[1].lang = studyLang;
    }
  }

  // Áudio -- heurística de INTERPRETAÇÃO de dado histórico, não uma regra
  // de runtime (ver ressalva da autora no topo do arquivo): audio_url
  // legado nunca foi explicitamente vinculado a um lado (Fase 0: era
  // renderizado fora da estrutura frente/verso, sempre visível). A única
  // leitura consistente com a intenção original (pronúncia do idioma
  // estrangeiro) é vincular ao campo cujo idioma é o estudado.
  // isStudyLanguageField() é usado aqui UMA vez, só pra interpretar este
  // dado histórico -- cartões autorados pelo editor novo (Fase 6+) vão
  // gravar o áudio explicitamente no Field certo, sem depender disto.
  if (row.audio_url){
    const studyIdx = fields.findIndex(f => isStudyLanguageField(f, appKey));
    if (studyIdx >= 0) fields[studyIdx].audio = { url: row.audio_url, type: 'upload' };
  }

  const note = { ...noteBase, fields, fieldOrder: fields.map((_, i) => i) };

  // Fase 6B -- normal_reversed sobre colunas legadas soltas foi retirado
  // (ver comentário no topo desta função); pra reverso, use uma Note
  // nativa (fields+card_generation_mode:'normal_reversed'), que já
  // reaproveita buildReversedCardInstancePair() no ramo nativo acima.
  const cards = [{
    id: cardId, noteId: cardId, cardTypeId,
    frontFieldIndex, backFieldIndex,
    ...(isMC ? {
      promptFieldIndex: frontFieldIndex,
      correctFieldIndex: backFieldIndex,
      distractors: row.choices,
    } : {}),
    ...FLASHCARD_MODEL_FSRS_DEFAULTS,
  }];
  return { note, cards };
}

// ============================================================
// Fase 4 do prompt-mestre "reestruturação inspirada no Anki" (ver
// CLAUDE.md) -- MOTOR DE TIPOS/TEMPLATES.
//
// 4d (concluída): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// REMOVIDA -- não existe mais nenhum objeto legado intermediário em
// nenhum ponto do sistema. buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard (fr/zh app.js) chamam buildEngineCardsFromRow()
// diretamente; todo consumidor (renderizadores de Revisão, Speed Review,
// Combinar, export Anki) lê `note`/`cardInstance` via
// resolveCardField()/resolveCardContentView(), nunca um campo de conteúdo
// solto tipo `card.front`/`card.choices`/`card.clozeSentence`.
//
// Princípio central, travado pela autora (Fase 4, restrições 2-5): o fluxo
// final é
//     Note + CardInstance -> resolveCardField() -> renderer/feature
// nunca
//     Note + CardInstance -> objeto legado/shape intermediário -> renderer
// resolveCardField() é o ÚNICO ponto que projeta um Field pra texto/áudio
// exibível -- nenhum renderer (ou Speed Review/Combinar/export Anki, a
// partir de 4c) deve ler `note.fields[i]` direto.
// ============================================================

// Catálogo dos 5 tipos previstos nesta fase -- só documentação/referência,
// não uma tabela de despacho (o despacho de verdade mora em cada
// renderer/feature, olhando `cardInstance.cardTypeId`). "Normal com
// reverso" NÃO tem um cardTypeId próprio -- ver buildReversedCardInstancePair()
// logo abaixo pra explicação de por quê.
const CARD_TYPE_IDS = Object.freeze({
  NORMAL: 'normal',
  TYPE_ANSWER: 'type_answer',
  CLOZE: 'cloze',
  MULTIPLE_CHOICE: 'multiple_choice',
});

// ---------- resolveCardField() -- o único ponto de projeção Field->exibição ----------
// Devolve o texto/pinyin/áudio/imagem de UM Field, dado seu índice dentro
// de note.fields. Nunca decide direção (isso já foi decidido antes, por
// quem escolheu QUAL índice passar aqui -- o CardInstance) nem lê `lang`
// pra inferir front/back/template -- só devolve o que o Field já carrega.
// `field.pinyinFieldIndex` (zh) é resolvido aqui pra nenhum chamador
// precisar saber que hanzi/pinyin são 2 Fields relacionados.
//
// Fase 7a (ver CLAUDE.md) -- `imageUrl` passou a ser resolvido aqui
// também, exatamente pelo mesmo padrão de `audioUrl` (só lê `field.image.url`
// defensivamente, nunca inventa nada). Antes desta fase, imagem SÓ existia
// no nível da Note (`note.image`, caminho legado) -- `field.image` já era
// persistido desde a Fase 6B mas nunca chegava a lugar nenhum de exibição.
// `resolveCardField()` continua sendo o ÚNICO ponto de projeção Field->
// exibição -- nenhuma segunda função de "resolver imagem" foi criada.
//
// Fase 7b (ver CLAUDE.md) -- `audioUrl` passou a ser calculado via
// resolveFieldAudioUrl() (definida acima, junto do contrato de
// Field.audio), em vez da leitura inline `(field.audio && field.audio.url)
// || null` -- mesmo resultado pra todo dado já existente (upload/url
// sempre tinham `.url`), mas agora também resolve corretamente
// `type:'tts'` (usa `generatedUrl` se já existir, `null` senão -- nunca
// gera nada aqui) e `type:'recording'` (idem `upload`, `url` nullable).
// A View devolvida por resolveCardField() continua expondo só o ATIVO
// resolvido (`audioUrl`, uma URL ou null) -- nunca a CONFIGURAÇÃO
// completa de `field.audio` (ex: `language`/`voiceId`/`generationKey` do
// modo TTS não aparecem aqui, de propósito: quem precisar da
// configuração pra oferecer uma UI de edição/geração lê `field.audio`
// direto, nunca por meio desta view de exibição).
function resolveCardField(note, fieldIndex){
  if (fieldIndex === null || fieldIndex === undefined) return null;
  const field = note.fields[fieldIndex];
  if (!field) return null;
  const pinyinField = field.pinyinFieldIndex !== undefined && field.pinyinFieldIndex !== null
    ? note.fields[field.pinyinFieldIndex] : null;
  return {
    text: field.text,
    lang: field.lang,
    pinyinText: pinyinField ? pinyinField.text : null,
    audioUrl: resolveFieldAudioUrl(field.audio),
    imageUrl: (field.image && field.image.url) || null,
  };
}

// ---------- Elegibilidade de pronúncia automática (TTS) ----------
// Ressalva importante, sinalizada explicitamente no checkpoint da Fase 4a
// (não decidida em silêncio): a restrição da autora ("lang nunca decide se
// deve existir áudio") é sobre usar `lang` pra inventar DIREÇÃO/estrutura
// (ex: "este campo é lang==studyLang, então ele É o front") -- isso
// continua proibido, e resolveCardField() acima não faz isso em nenhum
// caso. Esta função aqui é uma categoria DIFERENTE de decisão: o motor de
// pronúncia do app (speakFrench()/AUDIO_MANIFEST, fr/app.js -- não
// reconstruído nesta fase, restrição 7) só sabe falar UM idioma real;
// chamá-lo sobre texto que não está nesse idioma produziria pronúncia
// errada (voz francesa lendo português), não uma escolha de
// apresentação. `lang` aqui é consultado como propriedade INTRÍNSECA do
// próprio Field (o mesmo tipo de checagem que já se faz sobre `field.text`
// em si), nunca pra decidir qual campo É o front/back -- isso o
// CardInstance já decidiu antes de resolveCardField() ser chamado.
// audio_url explícito (upload) sempre conta como "tem áudio", em
// QUALQUER idioma -- só a tentativa de TTS AUTOMÁTICO depende do idioma
// real do campo.
function fieldHasAudio(resolvedField, appKey){
  if (!resolvedField) return false;
  if (resolvedField.audioUrl) return true;
  return resolvedField.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

// ---------- Resolvers por Card Type ----------
// Cada um devolve só texto/áudio já resolvido (via resolveCardField) --
// nenhum HTML, nenhuma decisão de tela. O renderer (fr/zh app.js, Fase
// 4b/4c) decide como desenhar isso; este arquivo nunca sabe de DOM.

// Normal -- também usado pelas DUAS CardInstance de um par "Normal com
// reverso" (ver buildReversedCardInstancePair) -- mecanicamente idênticas,
// só com frontFieldIndex/backFieldIndex trocados entre si.
function resolveNormalCardView(note, cardInstance){
  return {
    front: resolveCardField(note, cardInstance.frontFieldIndex),
    back: resolveCardField(note, cardInstance.backFieldIndex),
  };
}

function resolveMultipleChoiceCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const correct = resolveCardField(note, cardInstance.correctFieldIndex);
  return {
    prompt,
    // `correct` (Field resolvido inteiro, com audioUrl) fica disponível pro
    // renderer buscar áudio próprio em qualquer um dos 2 lados -- a
    // heurística de interpretação (Fase 3) vincula o upload ao campo cujo
    // idioma é o estudado, que pode ser prompt OU correct dependendo da
    // direção do cartão. `correctText` continua exposto solto por
    // conveniência (é o que a maioria dos chamadores só precisa).
    correct,
    correctText: correct ? correct.text : '',
    distractorTexts: cardInstance.distractors || [],
  };
}

// "Digite a resposta" -- novo nesta fase, sem dado legado (nenhuma coluna
// de teacher_flashcards/own_flashcards jamais pediu este tipo). Estrutura
// deliberadamente próxima da de Cloze (promptFieldIndex/answerFieldIndex
// em vez de textFieldIndex/markId, porque não há lacuna embutida numa
// frase -- é pergunta inteira -> resposta digitada inteira) -- mesmo
// mecanismo de comparação (compareAnswer opcional, pro caso zh em que o
// que se digita, pinyin, difere do que se revela, hanzi).
function resolveTypeAnswerCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const answer = resolveCardField(note, cardInstance.answerFieldIndex);
  const displayAnswerText = answer ? answer.text : '';
  // Fase 6B (ver CLAUDE.md) -- compareAnswer pro zh reaproveita o MESMO
  // pareamento hanzi/pinyin que resolveCardField() já resolve pra QUALQUER
  // Field (pinyinFieldIndex) -- não um canal de comparação próprio deste
  // tipo. cardInstance.compareAnswer explícito continua tendo prioridade
  // (mantém a mesma flexibilidade de antes, testada na Fase 4a), mas nenhum
  // caminho de geração hoje (legado nem nativo) o define pra type_answer --
  // é sempre null/undefined nesse caso, então a cadeia cai pro pinyin do
  // Field de resposta (zh) ou pro próprio texto da resposta (fr, sem
  // pinyin) -- mesmo espírito já usado por Normal/resolveNormalCardView.
  const compareAnswerText = (cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined)
    ? cardInstance.compareAnswer
    : (answer && answer.pinyinText ? answer.pinyinText : displayAnswerText);
  // Fase 7a (ver CLAUDE.md) -- `answer` (o Field resolvido inteiro, com seu
  // próprio audioUrl/imageUrl) passa a ser devolvido, não só descartado
  // depois de extrair `displayAnswerText`/`pinyinText` dele -- achado #2 da
  // auditoria da Fase 7 (mídia da resposta nunca chegava ao renderer, mesmo
  // que o Field a tivesse). O renderer decide QUANDO mostrar (só depois de
  // revelada -- nunca antes, seria vazar a resposta pelo ouvido/imagem).
  return { prompt, answer, displayAnswerText, compareAnswerText };
}

// Cloze -- reaproveita parseClozeMarks/renderClozeText já existentes
// (sintaxe {{cN::...}}, nunca cloze_sentence/cloze_answer aqui). Devolve a
// frase com TODAS as marcações ainda embutidas (`rawSentenceText`) -- quem
// desenha decide se usa renderClozeText pra ocultar/revelar a lacuna alvo.
function resolveClozeCardView(note, cardInstance){
  // Fase 7a (ver CLAUDE.md) -- passou a resolver o Field de texto via
  // resolveCardField() (antes lia `.audio.url` direto do Field cru, nunca
  // considerava imagem) -- mesmo ÚNICO ponto de projeção Field->exibição
  // que todo o resto do motor já usa, nenhuma segunda leitura de imagem/
  // áudio inventada aqui. Como TODAS as CardInstance (c1/c2/...) de uma
  // mesma Note compartilham o MESMO textFieldIndex, elas naturalmente
  // resolvem a MESMA origem de mídia -- nunca um áudio/imagem diferente
  // por lacuna, sem precisar de nenhum código especial pra garantir isso.
  const textFieldView = resolveCardField(note, cardInstance.textFieldIndex);
  const translation = resolveCardField(note, cardInstance.translationFieldIndex);
  const marks = parseClozeMarks(textFieldView.text);
  const mark = marks.find(m => m.id === cardInstance.markId) || marks[0];
  const displayAnswerText = mark ? mark.answer : '';
  // Fase 5 -- prioridade de compareAnswer: cardInstance.compareAnswer
  // explícito (caminho legado, vem de cloze_answer_pinyin) vence; senão
  // cai pro compareAnswer embutido na própria marca (mark.compareAnswer,
  // extraído do "|" por parseClozeMarks -- caminho nativo multi-marca);
  // senão usa o próprio texto da marca (fr sem pinyin, nos dois caminhos).
  // Nunca mistura cloze_answer_pinyin legado com marca nativa da mesma
  // nota -- as duas fontes já são mutuamente exclusivas por construção em
  // interpretNoteFromRow() (uma nota ou é 100% legada ou 100% nativa).
  const compareAnswerText = (cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined)
    ? cardInstance.compareAnswer
    : (mark && mark.compareAnswer !== null && mark.compareAnswer !== undefined ? mark.compareAnswer : displayAnswerText);
  return {
    rawSentenceText: textFieldView.text,
    markId: cardInstance.markId,
    audioUrl: textFieldView.audioUrl,
    imageUrl: textFieldView.imageUrl,
    translation,
    displayAnswerText,
    compareAnswerText,
  };
}

// ---------- "Normal com reverso" ----------
// Decisão arquitetural (reportada explicitamente no checkpoint 4a, não
// presumida): NÃO existe um cardTypeId `normal_reversed` -- uma Note
// reversível gera 2 CardInstance, cada uma com cardTypeId:'normal'
// (renderizadas pelo MESMO resolveNormalCardView acima), só com
// frontFieldIndex/backFieldIndex trocados entre si. É fiel ao Anki real
// (a note type "Basic and reversed card" gera Card 1 e Card 2, as duas
// usando o mesmo template "Card", só com Frente/Verso invertidos -- não
// um template distinto) e evita inventar uma 6ª forma de renderizar
// quando a lógica já é idêntica à de "Normal".
// Sufixo de id `-b` (nunca `-r{revision}`, que já significa "cartão
// editado" desde a Fase 8) -- garante que as 2 metades do par nunca
// colidem entre si nem com o mecanismo de reset-por-edição já existente.
// Pura/independente -- não chamada por interpretNoteFromRow() (nenhuma
// linha legada jamais pediu isto, não há coluna pra "reversível" em
// teacher_flashcards/own_flashcards) -- existe pronta pro editor futuro
// (Fase 6+, fora do escopo desta fase) poder gerar uma Note reversível.
function buildReversedCardInstancePair(noteId, frontFieldIndex, backFieldIndex){
  return [
    { id: noteId, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex, backFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
    { id: `${noteId}-b`, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex: backFieldIndex, backFieldIndex: frontFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
  ];
}

// ============================================================
// Fase 4b -- caminho REAL de construção de STATE.cards (substitui
// legacyFlashcardRowToCard() como o que buildCardFromTeacherFlashcard()/
// buildCardFromSelfFlashcard() de fato chamam a partir de agora).
// ============================================================

// Constrói o(s) card(s) nativos pro STATE.cards a partir de uma linha
// legada. Diferença central em relação à ponte (Fase 3): NENHUM campo de
// conteúdo (front/back_trans/clozeSentence/choices/frontIsTargetLanguage/
// audioUrl de Field) é reconstruído solto no card -- `note`+`cardInstance`
// vão INTEIROS, e quem precisar de texto/áudio passa por
// resolveCardField()/resolveCardContentView() abaixo, nunca lendo
// `card.front` etc. (esse campo simplesmente não existe mais no objeto).
//
// Campos FSRS continuam FLAT no nível de topo do card -- mesmo lugar de
// sempre, porque shared/fsrs.js (não tocado nesta fase, restrição da
// autora) lê/escreve ali direto (`applyMemoryGrade(card, grade)` muta
// `card.due`/`card.stability`/etc. do objeto que se passa a ele). Por
// isso eles são DESTRUCTURADOS pra fora do CardInstance bruto aqui --
// `cardInstance` guardado no card carrega só identidade/apresentação
// (id/cardTypeId/índices de campo), nunca uma 2ª cópia dos campos FSRS
// que iria dessincronizar da cópia real assim que a 1ª revisão acontecer.
//
// Devolve um ARRAY -- hoje sempre 1 elemento pra dado legado (nenhuma
// linha jamais pediu "Normal com reverso"), mas o formato já é o que
// "Normal com reverso"/multi-CardInstance vai precisar quando o editor
// existir (Fase 6+).
function buildEngineCardsFromRow(row, opts){
  const { note, cards } = interpretNoteFromRow(row, opts);
  const unitTitle = note.origin === 'teacher' ? 'Da sua professora' : 'Meus cartões';
  return cards.map(rawCardInstance => {
    const {
      id, noteId, cardTypeId,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
      ...presentationFields
    } = rawCardInstance;
    const cardInstance = { id, noteId, cardTypeId, ...presentationFields };
    return {
      id,
      rowId: note.legacyRowId,
      unitId: null,
      unitTitle,
      vocabIdx: null,
      type: 'vocab',
      origin: note.origin,
      teacherNote: note.note,
      flashcardStatus: note.status,
      // Note-level (nunca de um Field específico -- achado da Fase 3,
      // confirmado de novo aqui): imagem ilustra o conceito inteiro.
      imageUrl: note.image ? note.image.url : null,
      note,
      cardInstance,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
    };
  });
}

// Dispatcher único -- dado um card de STATE.cards já construído por
// buildEngineCardsFromRow(), devolve a "view" de conteúdo certa pro tipo
// dele (ver resolvers acima). É o ponto de entrada que renderers/Speed
// Review/Combinar/export Anki (Fase 4b/4c) chamam -- nunca despacham por
// conta própria olhando `card.choices`/`card.clozeSentence` (esses campos
// não existem mais no card nativo).
function resolveCardContentView(card){
  const { note, cardInstance } = card;
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.MULTIPLE_CHOICE){
    return { kind: CARD_TYPE_IDS.MULTIPLE_CHOICE, ...resolveMultipleChoiceCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.TYPE_ANSWER){
    return { kind: CARD_TYPE_IDS.TYPE_ANSWER, ...resolveTypeAnswerCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.CLOZE){
    return { kind: CARD_TYPE_IDS.CLOZE, ...resolveClozeCardView(note, cardInstance) };
  }
  return { kind: CARD_TYPE_IDS.NORMAL, ...resolveNormalCardView(note, cardInstance) };
}
