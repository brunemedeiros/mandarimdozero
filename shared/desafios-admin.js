// ---------- Desafios: admin e importação (motor comum; ver o topo de shared/desafios.js) ----------
// Etapa 5c da paridade (docs/historico/29-paridade-desafios.md): a revisão do admin (checklist de qualidade com o
// áudio conferido pelo md5 do texto, aprovar e publicar um por um ou em lote, rejeitar, despublicar, editar cada tipo,
// recursos externos, prévia com o player do aluno, busca, filtros e paginação) e a importação de JSON (lote do pipeline
// ou array; sempre entra como pendente). Saíram do fr/app.js com o mesmo nome e o mesmo texto. Só a conta admin
// (CHALLENGES_ADMIN_EMAIL) vê a barra; a tabela é a da configuração (registerChallenges({ table }), padrão 'challenges').

// Aceita tanto um array de desafios quanto a saída direta do pipeline
// (`{accepted: [...], rejected: [...]}`, ver generate_challenges.py) --
// assim o JSON gerado localmente pode ser colado sem edição nenhuma.
function parseChallengesImportInput(rawText){
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(t('adminChallenges.import.invalidJson') + err.message);
  }
  const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.accepted) ? parsed.accepted : null);
  if (!items) throw new Error(t('adminChallenges.import.expectedArray'));
  return items;
}

// Importa desafios direto pro Supabase via a mesma sessão autenticada de
// admin já usada pro resto do painel (sujeita à mesma RLS de escrita) --
// substitui o passo manual de rodar SQL no SQL Editor do Supabase.
// Sempre entra como needs_review (a menos que o item já traga um status
// válido) -- nunca pula a fila de revisão.
async function importChallengesFromJSON(rawText){
  const items = parseChallengesImportInput(rawText);
  const existingIds = new Set(CHALLENGES.map(c => c.id));
  const seenInBatch = new Set();
  const rows = [];
  const skipped = [];

  items.forEach((item, idx) => {
    const label = (item && item.id) ? item.id : t('adminChallenges.import.itemN', { n: idx + 1 });
    if (!item || !item.id || !item.type || !item.level){
      skipped.push(t('adminChallenges.import.missing', { label }));
      return;
    }
    if (!CHALLENGE_VALID_TYPES.includes(item.type)){
      skipped.push(t('adminChallenges.import.badType', { id: item.id, type: item.type }));
      return;
    }
    if (!CHALLENGE_LEVELS_ORDER.includes(item.level)){
      skipped.push(t('adminChallenges.import.badLevel', { id: item.id, level: item.level }));
      return;
    }
    // Regra de 12/10/2026: toda expressão nova chega com registro (campo próprio).
    if (item.type === 'expression' && !Object.prototype.hasOwnProperty.call(EXPRESSION_REGISTERS, item.register)){
      skipped.push(t('adminChallenges.import.badRegister', { id: item.id }));
      return;
    }
    if (existingIds.has(item.id) || seenInBatch.has(item.id)){
      skipped.push(t('adminChallenges.import.dupId', { id: item.id }));
      return;
    }
    seenInBatch.add(item.id);
    const status = CHALLENGE_VALID_STATUSES.includes(item.status) ? item.status : 'needs_review';
    rows.push({ id: item.id, type: item.type, level: item.level, status, data: challengeDataPayload({ ...item, status }) });
  });

  if (rows.length === 0) return { insertedCount: 0, skipped, error: null };

  const { error } = await supabaseClient.from(chCfg().table).insert(rows);
  if (error) return { insertedCount: 0, skipped, error: error.message };
  return { insertedCount: rows.length, skipped, error: null };
}

// ---------- Revisão do admin ----------
// Aprovar/Editar/Rejeitar/Publicar/Despublicar gravam de verdade na
// tabela `challenges` do Supabase (protegida por RLS) -- ver
// loadChallengesFromDB()/persistChallenge() no início da seção de
// Desafios. Não é mais uma simulação de sessão do navegador.
let challengesAdminEditingId = null;
// Seleção pra aprovação em lote (só usada na seção Pendentes) -- guarda
// os ids marcados, sobrevive a um re-render normal (busca/paginação),
// mas é limpa depois de aprovar o lote ou ao trocar de aba admin.
const challengesAdminSelectedIds = new Set();

// MD5 (RFC 1321) puro em JS -- só usado aqui, pra conferir se um áudio já
// gerado ainda corresponde ao texto atual. O pipeline Python nomeia cada
// arquivo de áudio como md5(texto)[:12] + '.mp3' (ver scripts/
// challenges_pipeline/tts.py) -- então basta recalcular o mesmo hash no
// texto salvo agora e comparar com o nome do arquivo: se bater, o áudio
// é da versão atual do texto; se não bater, o texto foi editado depois
// que o áudio foi gerado ("áudio desatualizado").
function md5Hex(str){
  function rotl(x, c){ return (x << c) | (x >>> (32 - c)); }
  const K = new Uint32Array([
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
  ]);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
             5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
             6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];

  const msg = new TextEncoder().encode(str);
  const origLenBits = msg.length * 8;
  const withOne = new Uint8Array(((msg.length + 8) >> 6 << 6) + 64);
  withOne.set(msg);
  withOne[msg.length] = 0x80;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 8, origLenBits >>> 0, true);
  dv.setUint32(withOne.length - 4, Math.floor(origLenBits / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < withOne.length; chunkStart += 64){
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(chunkStart + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++){
      let F, g;
      if (i < 16){ F = (B & C) | (~B & D); g = i; }
      else if (i < 32){ F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48){ F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  function toHexLE(n){
    let bytes = [];
    for (let i = 0; i < 4; i++){ bytes.push((n & 0xff).toString(16).padStart(2, '0')); n >>>= 8; }
    return bytes.join('');
  }
  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
}

function challengeAudioIsFresh(text, audioFile){
  if (!audioFile) return null; // sem áudio nenhum -- não é "desatualizado", é "ausente"
  return md5Hex(text).slice(0, 12) + '.mp3' === audioFile;
}

// Lista os campos de áudio de um desafio (texto de origem + arquivo),
// independente do tipo -- usado tanto pro checklist quanto pra prévia.
function challengeAudioFields(c){
  if (c.type === 'expression'){
    return [
      { label: t('adminChallenges.audio.target'), text: c.canonicalExpression, audioFile: c.expressionAudioFile },
      { label: t('adminChallenges.audio.ex1'), text: c.example.text, audioFile: c.example.audioFile },
      { label: t('adminChallenges.audio.ex2'), text: c.secondExample.text, audioFile: c.secondExample.audioFile },
    ];
  }
  if (c.type === 'listen_translate'){
    return [{ label: t('adminChallenges.audio.sentence'), text: c.sentenceFr, audioFile: c.audioFile }];
  }
  if (c.type === 'accent'){
    return [{ label: t('adminChallenges.audio.word'), text: c.targetText, audioFile: c.audioFile }];
  }
  return [];
}

// Checklist de qualidade -- cada item tem { label, ok, blocking }.
// `blocking` = true significa que o desafio realmente não funciona sem
// isso (nunca deve ser publicado assim); os outros são avisos.
function challengeQualityChecklist(c){
  const items = [];

  challengeAudioFields(c).forEach(f => {
    if (!f.audioFile){
      items.push({ label: t('adminChallenges.qa.audioMissing', { label: f.label }), ok: false, blocking: true });
    } else if (challengeAudioIsFresh(f.text, f.audioFile) === false){
      items.push({ label: t('adminChallenges.qa.audioStale', { label: f.label }), ok: false, blocking: false, audioFile: f.audioFile });
    } else {
      items.push({ label: t('adminChallenges.qa.audioOk', { label: f.label }), ok: true, blocking: false, audioFile: f.audioFile });
    }
  });

  if (c.type === 'expression'){
    items.push({ label: t('adminChallenges.qa.correctSet'), ok: !!c.correctAnswer && c.options.includes(c.correctAnswer), blocking: true });
    items.push({ label: t('adminChallenges.qa.fourOptions'), ok: c.options.length === 4, blocking: true });
    items.push({ label: t('adminChallenges.qa.explanationFilled'), ok: !!c.explanation, blocking: false });
    items.push({ label: t('adminChallenges.qa.microValid'), ok: !!(c.microActivity.prompt && c.microActivity.answer), blocking: false });
  } else if (c.type === 'listen_translate'){
    items.push({ label: t('adminChallenges.qa.sentenceFilled'), ok: !!c.sentenceFr, blocking: true });
    items.push({ label: t('adminChallenges.qa.hintFilled'), ok: !!c.hintText, blocking: false });
    items.push({ label: t('adminChallenges.qa.oneTranslation'), ok: (c.referenceTranslations || []).length > 0, blocking: true });
  } else if (c.type === 'accent'){
    items.push({ label: t('adminChallenges.qa.wordFilled'), ok: !!c.targetText, blocking: true });
    items.push({ label: t('adminChallenges.qa.explanationFilled'), ok: !!c.explanation, blocking: false });
  } else if (c.type === 'cloze_grammar'){
    const problems = validateClozeGrammarItem(c);
    items.push({ label: problems.length ? 'Lacunas/opções: ' + problems.join('; ') : 'Lacunas, opções e explicação válidas', ok: !problems.length, blocking: true });
    items.push({ label: 'Tradução preenchida', ok: !!c.translationPt, blocking: false });
  }

  return items;
}

function challengeQualityChecklistHTML(c){
  const items = challengeQualityChecklist(c);
  return `
    <div class="challenges-admin-checklist">
      <strong style="font-size:12px;">${t('adminChallenges.qa.title')}</strong>
      ${items.map(it => `
        <div class="challenges-admin-checklist-item ${it.ok ? 'ok' : 'warn'}">
          ${it.ok ? '✓' : '⚠'} ${escapeHtmlChallenge(it.label)}
          ${it.audioFile ? `<span class="challenges-admin-audio-duration" data-audio-file="${escapeHtmlChallenge(it.audioFile)}">${t('adminChallenges.qa.loadingDuration')}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// Preenche a duração real de cada áudio referenciado no checklist (só
// carrega os metadados, não baixa o arquivo inteiro).
function wireChallengeAudioDurations(container){
  container.querySelectorAll('[data-audio-file]').forEach(el => {
    const audio = new Audio(`audio/challenges/${el.dataset.audioFile}`);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      el.textContent = `· ${audio.duration.toFixed(1).replace('.', ',')} s`;
    });
    audio.addEventListener('error', () => {
      el.textContent = t('adminChallenges.qa.loadFail');
    });
  });
}

const CHALLENGE_RESOURCE_TYPE_LABEL = {
  get dictionary(){ return t('adminChallenges.res.dictionary'); },
  get article(){ return t('adminChallenges.res.article'); },
  get youtube(){ return t('adminChallenges.res.youtube'); },
  get youglish(){ return t('adminChallenges.res.youglish'); },
};
const CHALLENGE_RESOURCE_QUALITY_LABEL = {
  get high(){ return t('adminChallenges.res.qHigh'); },
  get medium(){ return t('adminChallenges.res.qMedium'); },
  get low(){ return t('adminChallenges.res.qLow'); },
};

function challengeAdminResourceHTML(r, idx){
  return `
    <div class="challenges-admin-resource ${r.approved === false ? 'rejected' : ''}" data-resource-idx="${idx}">
      <div class="challenges-admin-resource-info">
        <strong>${escapeHtmlChallenge(r.sourceName || r.title)}</strong>
        <span class="challenges-admin-hint">${t('adminChallenges.res.type', { type: escapeHtmlChallenge(CHALLENGE_RESOURCE_TYPE_LABEL[r.type] || r.type) })}${r.quality ? ` · ${t('adminChallenges.res.quality', { quality: CHALLENGE_RESOURCE_QUALITY_LABEL[r.quality] || r.quality })}` : ''}</span>
        <span class="challenges-admin-hint">${escapeHtmlChallenge(r.description || '')}</span>
        <span class="challenges-admin-hint">${r.lastChecked ? t('adminChallenges.res.checked', { date: escapeHtmlChallenge(r.lastChecked) }) : t('adminChallenges.res.unchecked')}</span>
      </div>
      <div class="challenges-admin-resource-actions">
        <a class="btn btn-secondary btn-sm" href="${escapeHtmlChallenge(r.url)}" target="_blank" rel="noopener">${t('adminChallenges.res.open')}</a>
        <button class="btn btn-sm ${r.approved !== false ? 'btn-primary' : 'btn-secondary'}" data-resource-action="approve">${t('adminChallenges.res.approve')}</button>
        <button class="btn btn-sm ${r.approved === false ? 'btn-primary' : 'btn-secondary'}" data-resource-action="reject">${t('adminChallenges.btn.reject')}</button>
      </div>
    </div>
  `;
}

function challengeAdminReadViewExpression(c){
  const resourcesHTML = (c.externalResources && c.externalResources.length)
    ? c.externalResources.map((r, idx) => challengeAdminResourceHTML(r, idx)).join('')
    : `<p class="challenges-admin-hint">${t('adminChallenges.res.none')}</p>`;

  return `
    <p class="challenges-admin-field"><strong>${t('adminChallenges.audio.target')}:</strong> ${c.expressionAudioFile ? `${t('adminChallenges.view.audioAvailable')} — <span class="challenges-admin-hint">${t('adminChallenges.view.targetAudioNote')}</span>` : `<span class="challenges-admin-hint">${t('adminChallenges.view.absent')}</span>`}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.example')}:</strong> ${escapeHtmlChallenge(c.example.text)}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.question')}:</strong> ${escapeHtmlChallenge(c.question)}</p>
    <ul class="challenges-admin-choices">
      ${c.options.map(opt => `<li class="${opt === c.correctAnswer ? 'correct' : ''}">${escapeHtmlChallenge(opt)}</li>`).join('')}
    </ul>
    <p class="challenges-admin-field"><strong>${t('fr.step.explanation')}:</strong> ${escapeHtmlChallenge(c.explanation)}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.secondExample')}:</strong> ${escapeHtmlChallenge(c.secondExample.text)} ${c.secondExample.audioFile ? '🔊' : `<span class="challenges-admin-hint">${t('adminChallenges.view.noAudio')}</span>`}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.micro')}:</strong> ${escapeHtmlChallenge(c.microActivity.prompt)} → ${escapeHtmlChallenge(c.microActivity.answer)}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.resources')}:</strong></p>
    <div class="challenges-admin-resources">${resourcesHTML}</div>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewExpression(c){
  const optionsText = c.options.map(o => (o === c.correctAnswer ? '*' : '') + o).join('\n');
  return `
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.example')}
      <textarea class="challenges-admin-edit-input" data-field="example.text" rows="2">${escapeHtmlChallenge(c.example.text)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.view.question')}
      <input class="challenges-admin-edit-input" data-field="question" value="${escapeHtmlChallenge(c.question)}">
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.options')}
      <textarea class="challenges-admin-edit-input" data-field="options" rows="4">${escapeHtmlChallenge(optionsText)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('fr.step.explanation')}
      <textarea class="challenges-admin-edit-input" data-field="explanation" rows="2">${escapeHtmlChallenge(c.explanation)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.view.secondExample')}
      <textarea class="challenges-admin-edit-input" data-field="secondExample.text" rows="2">${escapeHtmlChallenge(c.secondExample.text)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.microPrompt')}
      <input class="challenges-admin-edit-input" data-field="microActivity.prompt" value="${escapeHtmlChallenge(c.microActivity.prompt)}">
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.microAnswer')}
      <input class="challenges-admin-edit-input" data-field="microActivity.answer" value="${escapeHtmlChallenge(c.microActivity.answer)}">
    </label>
    <p class="challenges-admin-hint">${t('adminChallenges.edit.exampleHint')}</p>
  `;
}

function challengeAdminReadViewListenTranslate(c){
  return `
    <p class="challenges-admin-field"><strong>${t('fieldEditor.audio.title')}:</strong> ${c.audioFile ? t('adminChallenges.view.audioAvailable') : `<span class="challenges-admin-hint">${t('adminChallenges.view.absent')}</span>`}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.sentenceFr')}:</strong> ${escapeHtmlChallenge(c.sentenceFr)}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.hint')}:</strong> ${escapeHtmlChallenge(c.hintText)}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.translations')}:</strong></p>
    <ul class="challenges-admin-choices">
      ${(c.referenceTranslations || []).map(t => `<li>${escapeHtmlChallenge(t)}</li>`).join('')}
    </ul>
    <p class="challenges-admin-field"><strong>${t('fr.step.explanation')}:</strong> ${escapeHtmlChallenge(c.explanation || '—')}</p>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewListenTranslate(c){
  return `
    <label class="challenges-admin-edit-label">${t('adminChallenges.view.sentenceFr')}
      <textarea class="challenges-admin-edit-input" data-field="sentenceFr" rows="2">${escapeHtmlChallenge(c.sentenceFr)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.hint')}
      <input class="challenges-admin-edit-input" data-field="hintText" value="${escapeHtmlChallenge(c.hintText)}">
    </label>
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.translations')}
      <textarea class="challenges-admin-edit-input" data-field="referenceTranslations" rows="4">${escapeHtmlChallenge((c.referenceTranslations || []).join('\n'))}</textarea>
    </label>
    <label class="challenges-admin-edit-label">${t('fr.step.explanation')}
      <input class="challenges-admin-edit-input" data-field="explanation" value="${escapeHtmlChallenge(c.explanation || '')}">
    </label>
    <p class="challenges-admin-hint">${t('adminChallenges.edit.sentenceHint')}</p>
  `;
}

function challengeAdminReadViewAccent(c){
  return `
    <p class="challenges-admin-field"><strong>${t('fieldEditor.audio.title')}:</strong> ${c.audioFile ? t('adminChallenges.view.audioAvailable') : `<span class="challenges-admin-hint">${t('adminChallenges.view.absent')}</span>`}</p>
    <p class="challenges-admin-field"><strong>${t('adminChallenges.view.word')}:</strong> ${escapeHtmlChallenge(c.targetText)}</p>
    <p class="challenges-admin-field"><strong>${t('fr.step.explanation')}:</strong> ${escapeHtmlChallenge(c.explanation || '—')}</p>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewAccent(c){
  return `
    <label class="challenges-admin-edit-label">${t('adminChallenges.edit.word')}
      <input class="challenges-admin-edit-input" data-field="targetText" value="${escapeHtmlChallenge(c.targetText)}">
    </label>
    <label class="challenges-admin-edit-label">${t('fr.step.explanation')}
      <input class="challenges-admin-edit-input" data-field="explanation" value="${escapeHtmlChallenge(c.explanation || '')}">
    </label>
    <p class="challenges-admin-hint">${t('adminChallenges.edit.wordHint')}</p>
  `;
}

function clozeGrammarBlanksText(c){
  return (c.blanks || []).map(b => (b.options || []).map(o => (o === b.answer ? '*' : '') + o).join(' | ')).join('\n');
}

function challengeAdminReadViewClozeGrammar(c){
  return `
    <p class="challenges-admin-field"><strong>Frase:</strong> ${escapeHtmlChallenge(c.sentenceFr || '')}</p>
    <p class="challenges-admin-field"><strong>Opções por lacuna:</strong></p>
    <ul class="challenges-admin-choices">
      ${(c.blanks || []).map((b, i) => `<li>Lacuna ${i + 1}: ${(b.options || []).map(o => o === b.answer ? `<strong>${escapeHtmlChallenge(o)}</strong>` : escapeHtmlChallenge(o)).join(' · ')}</li>`).join('')}
    </ul>
    <p class="challenges-admin-field"><strong>Tradução:</strong> ${escapeHtmlChallenge(c.translationPt || '—')}</p>
    <p class="challenges-admin-field"><strong>Explicação:</strong> ${escapeHtmlChallenge(c.explanation || '—')}</p>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewClozeGrammar(c){
  return `
    <label class="challenges-admin-edit-label">Frase (use ___ para cada lacuna)
      <textarea class="challenges-admin-edit-input" data-field="sentenceFr" rows="2">${escapeHtmlChallenge(c.sentenceFr || '')}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Opções (uma linha por lacuna, separadas por " | " — marque a certa com * no início)
      <textarea class="challenges-admin-edit-input" data-field="blanks" rows="3">${escapeHtmlChallenge(clozeGrammarBlanksText(c))}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Tradução (pt-BR)
      <input class="challenges-admin-edit-input" data-field="translationPt" value="${escapeHtmlChallenge(c.translationPt || '')}">
    </label>
    <label class="challenges-admin-edit-label">Explicação (pt-BR)
      <textarea class="challenges-admin-edit-input" data-field="explanation" rows="2">${escapeHtmlChallenge(c.explanation || '')}</textarea>
    </label>
  `;
}

function challengeAdminReadView(c){
  if (c.type === 'cloze_grammar') return challengeAdminReadViewClozeGrammar(c);
  if (c.type === 'listen_translate') return challengeAdminReadViewListenTranslate(c);
  if (c.type === 'accent') return challengeAdminReadViewAccent(c);
  return challengeAdminReadViewExpression(c);
}

function challengeAdminEditView(c){
  if (c.type === 'cloze_grammar') return challengeAdminEditViewClozeGrammar(c);
  if (c.type === 'listen_translate') return challengeAdminEditViewListenTranslate(c);
  if (c.type === 'accent') return challengeAdminEditViewAccent(c);
  return challengeAdminEditViewExpression(c);
}

// Mostra um trecho do conteúdo de verdade, não só o rótulo genérico da
// categoria -- com vários "Ouça e traduza" pendentes ao mesmo tempo, o
// admin não tinha como distinguir um card do outro sem abrir cada um.
function challengeAdminCardTitle(c){
  if (c.type === 'expression') return escapeHtmlChallenge(c.canonicalExpression);
  if (c.type === 'listen_translate'){
    const snippet = (c.sentenceFr || '').length > 60 ? c.sentenceFr.slice(0, 57) + '…' : (c.sentenceFr || '');
    return `🎧 ${escapeHtmlChallenge(snippet)}`;
  }
  if (c.type === 'accent') return t('adminChallenges.card.accentTitle', { word: escapeHtmlChallenge(c.targetText) });
  if (c.type === 'cloze_grammar') return `🧠 ${escapeHtmlChallenge(c.sentenceFr || '')}`;
  return '';
}

// Aprova só se não houver problema bloqueante (áudio ausente, resposta
// correta não definida, etc.) -- com problema não-bloqueante (ex: áudio
// desatualizado), pede confirmação explícita em vez de aprovar direto.
// Grava a publicação de verdade no Supabase (status/published_at/
// published_by) -- não é mais uma simulação de sessão, então continua
// publicado depois de fechar/reabrir o navegador.
async function approveChallengeWithGate(c){
  const items = challengeQualityChecklist(c);
  const blocking = items.filter(it => !it.ok && it.blocking);
  const warnings = items.filter(it => !it.ok && !it.blocking);
  if (blocking.length){
    alert(t('adminChallenges.approve.blocked') + '\n\n' + blocking.map(b => '• ' + b.label).join('\n'));
    return false;
  }
  if (warnings.length){
    const proceed = confirm(t('adminChallenges.approve.warnings') + '\n\n' + warnings.map(w => '• ' + w.label).join('\n') + '\n\n' + t('adminChallenges.approve.anyway'));
    if (!proceed) return false;
  }
  const previousStatus = c.status;
  c.status = 'published';
  const ok = await persistChallenge(c, {
    published_at: new Date().toISOString(),
    published_by: CURRENT_USER.email,
  });
  if (!ok){
    c.status = previousStatus;
    return false;
  }
  showToast(t('adminChallenges.toast.published'));
  return true;
}

// Aprovação em lote: só publica automaticamente quem não tem NENHUM item
// pendente no checklist de qualidade (nem bloqueante, nem aviso) -- ao
// contrário de approveChallengeWithGate (que pergunta um por um via
// confirm()), aqui isso viraria uma sequência de alertas irritante pra
// várias dezenas de itens. Quem tem qualquer problema fica de fora do
// lote e continua pendente, listado no resumo pra revisão individual.
async function approveChallengeSilent(c){
  const items = challengeQualityChecklist(c);
  if (items.some(it => !it.ok)) return { ok: false, skipped: true };
  const previousStatus = c.status;
  c.status = 'published';
  const ok = await persistChallenge(c, {
    published_at: new Date().toISOString(),
    published_by: CURRENT_USER.email,
  });
  if (!ok){ c.status = previousStatus; return { ok: false, skipped: false }; }
  return { ok: true, skipped: false };
}

// Tira um desafio publicado do ar sem descartar o conteúdo (volta pra
// "approved": pronto, mas não visível pro aluno até ser publicado de
// novo). Persistido de verdade, mesma lógica de approveChallengeWithGate.
async function unpublishChallenge(c){
  const previousStatus = c.status;
  c.status = 'approved';
  const ok = await persistChallenge(c, {
    unpublished_at: new Date().toISOString(),
    unpublished_by: CURRENT_USER.email,
  });
  if (!ok){
    c.status = previousStatus;
    return false;
  }
  showToast(t('adminChallenges.toast.unpublished'));
  return true;
}

// ---------- Ver versão do aluno (prévia administrativa) ----------
// Reaproveita o MESMO player que o aluno usa (openChallengePlayer /
// openExpressionPlayer / openListenTranslatePlayer / openAccentPlayer) --
// nunca uma versão separada só pra exibição. O único acréscimo é a faixa
// de aviso "modo administrador" com os controles de aprovar/voltar.
function openChallengePreview(c){
  challengePreviewMode = true;
  challengeQueueContext = null;
  document.getElementById('challenges-admin-wrap').style.display = 'none';
  document.getElementById('challenges-categories-wrap').style.display = 'none';
  document.getElementById('challenges-list-wrap').style.display = 'none';

  openChallengePlayer(c.id);
  renderChallengePreviewBanner(c);
}

function renderChallengePreviewBanner(c){
  const banner = document.getElementById('challenge-preview-banner');
  const items = challengeQualityChecklist(c);
  const blocking = items.filter(it => !it.ok && it.blocking);

  banner.className = 'challenge-preview-banner';
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="challenge-preview-banner-label">${t('adminChallenges.preview.label')}</div>
    <div class="challenge-preview-banner-actions">
      ${c.type !== 'expression' ? `<button class="btn btn-secondary btn-sm" id="preview-show-answer-btn">${t('adminChallenges.preview.showAnswer')}</button>` : ''}
      <button class="btn btn-secondary" id="preview-back-to-edit-btn">${t('adminChallenges.preview.backToEdit')}</button>
      <button class="btn btn-primary" id="preview-approve-btn"${blocking.length ? ' disabled' : ''}>${t('adminChallenges.preview.approve')}</button>
    </div>
  `;
  if (blocking.length){
    const warn = document.createElement('div');
    warn.className = 'challenge-preview-warning';
    warn.textContent = '⚠ ' + blocking.map(b => b.label).join(' · ');
    banner.after(warn);
    banner.dataset.hasWarningEl = '1';
  }

  document.getElementById('preview-back-to-edit-btn').addEventListener('click', () => {
    challengePreviewMode = false;
    challengesAdminEditingId = c.id;
    removePreviewWarningEl();
    renderChallengesAdmin();
  });
  document.getElementById('preview-approve-btn').addEventListener('click', async () => {
    if (await approveChallengeWithGate(c)){
      challengePreviewMode = false;
      removePreviewWarningEl();
      renderChallengesAdmin();
    }
  });
  const showAnswerBtn = document.getElementById('preview-show-answer-btn');
  if (showAnswerBtn){
    showAnswerBtn.addEventListener('click', () => {
      const answer = c.type === 'listen_translate' ? (c.referenceTranslations || [])[0] : c.type === 'cloze_grammar' ? clozeGrammarFilled(c) : c.targetText;
      alert(t('adminChallenges.preview.expected') + answer);
    });
  }
}

function removePreviewWarningEl(){
  const banner = document.getElementById('challenge-preview-banner');
  if (banner && banner.dataset.hasWarningEl){
    const next = banner.nextElementSibling;
    if (next && next.classList.contains('challenge-preview-warning')) next.remove();
    delete banner.dataset.hasWarningEl;
  }
}

function challengeAdminPublishedCardHTML(c){
  // Mesmo padrão de estado de edição do card de pendentes
  // (challengeAdminPendingCardHTML) -- "Editar" só troca challengesAdminEditingId,
  // então o card precisa reagir a isso pra realmente mostrar o formulário
  // (senão o botão fica sem efeito visível nenhum, como ficava antes).
  const editing = challengesAdminEditingId === c.id;
  return `
    <div class="challenges-admin-card" data-challenge-id="${c.id}">
      <div class="challenges-admin-card-header">
        <span class="challenge-card-level">${c.level}</span>
        <strong>${challengeAdminCardTitle(c)}</strong>
      </div>
      ${editing ? `<div class="challenges-admin-card-body">${challengeAdminEditView(c)}</div>` : ''}
      <div class="challenges-admin-actions">
        ${editing
          ? `<button class="btn btn-primary" data-action="save">${t('adminChallenges.btn.save')}</button>
             <button class="btn btn-secondary" data-action="cancel-edit">${t('myFlashcards.edit.cancel')}</button>`
          : `<button class="btn btn-secondary" data-action="preview">${t('adminChallenges.btn.preview')}</button>
             <button class="btn btn-secondary" data-action="edit">${t('adminChallenges.btn.edit')}</button>
             <button class="btn btn-secondary" data-action="unpublish">${t('adminChallenges.btn.unpublish')}</button>`
        }
      </div>
    </div>
  `;
}

// Recarrega do Supabase antes de renderizar -- garante que a fila de
// revisão e a lista de publicados refletem o estado real do banco (ex:
// uma publicação feita em outra sessão/navegador), não um cache antigo.
// ---------- Busca/filtro/paginação do painel admin ----------
// Com dezenas de desafios, uma lista única sem busca vira inviável. Busca
// e filtros re-renderizam só a lista (renderChallengesAdminList, sem
// buscar do banco de novo -- senão cada tecla digitada dispararia uma
// consulta); só ações que mudam dado de verdade (aprovar/editar/etc.)
// chamam renderChallengesAdmin(), que recarrega.
const challengesAdminFilterState = { search: '', type: 'all', level: 'all' };
const CHALLENGES_ADMIN_PAGE_SIZE = 15;
const challengesAdminVisibleCount = { pending: CHALLENGES_ADMIN_PAGE_SIZE, published: CHALLENGES_ADMIN_PAGE_SIZE, unpublished: CHALLENGES_ADMIN_PAGE_SIZE };
const CHALLENGE_TYPE_LABELS = {
  get expression(){ return t('fr.challenges.cat.expression.title'); },
  get listen_translate(){ return t('fr.challenges.cat.listenTranslate.title'); },
  get accent(){ return t('fr.challenges.cat.accent.title'); },
  get cloze_grammar(){ return t('fr.challenges.cat.clozeGrammar.title'); },
};

function challengeSearchableText(c){
  return [c.canonicalExpression, c.sentenceFr, c.targetText, c.question, c.explanation, c.translationPt]
    .filter(Boolean).join(' ').toLowerCase();
}

function applyChallengesAdminFilters(list){
  const { search, type, level } = challengesAdminFilterState;
  return list.filter(c => {
    if (type !== 'all' && c.type !== type) return false;
    if (level !== 'all' && c.level !== level) return false;
    if (search && !challengeSearchableText(c).includes(search)) return false;
    return true;
  });
}

function challengesAdminFilterBarHTML(){
  const levelOptions = CHALLENGE_LEVELS_ORDER.map(l => `<option value="${l}" ${challengesAdminFilterState.level === l ? 'selected' : ''}>${l}</option>`).join('');
  const typeOptions = Object.entries(CHALLENGE_TYPE_LABELS).map(([val, label]) =>
    `<option value="${val}" ${challengesAdminFilterState.type === val ? 'selected' : ''}>${label}</option>`).join('');
  return `
    <div class="challenges-admin-filters">
      <input type="text" id="challenges-admin-search" placeholder="${t('adminChallenges.filter.searchPh')}" value="${escapeHtmlChallenge(challengesAdminFilterState.search)}">
      <select id="challenges-admin-filter-type">
        <option value="all" ${challengesAdminFilterState.type === 'all' ? 'selected' : ''}>${t('adminChallenges.filter.allTypes')}</option>
        ${typeOptions}
      </select>
      <select id="challenges-admin-filter-level">
        <option value="all" ${challengesAdminFilterState.level === 'all' ? 'selected' : ''}>${t('adminChallenges.filter.allLevels')}</option>
        ${levelOptions}
      </select>
    </div>
  `;
}

function wireChallengesAdminFilterBar(content){
  const searchInput = content.querySelector('#challenges-admin-search');
  const typeSelect = content.querySelector('#challenges-admin-filter-type');
  const levelSelect = content.querySelector('#challenges-admin-filter-level');
  searchInput.addEventListener('input', () => {
    challengesAdminFilterState.search = searchInput.value.trim().toLowerCase();
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  typeSelect.addEventListener('change', () => {
    challengesAdminFilterState.type = typeSelect.value;
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  levelSelect.addEventListener('change', () => {
    challengesAdminFilterState.level = levelSelect.value;
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  // Foca de novo depois de re-renderizar (o innerHTML novo perde o foco).
  searchInput.focus();
  const val = searchInput.value;
  searchInput.value = '';
  searchInput.value = val;
}

// Uma seção (pendentes/publicados/despublicados) com paginação por
// "Carregar mais" -- mostra só challengesAdminVisibleCount[sectionKey]
// itens do total já filtrado, sem limitar o que existe no banco.
function challengesAdminSectionHTML(sectionKey, title, filteredList, cardHTMLFn, emptyMsg, toolbarHTML = ''){
  if (filteredList.length === 0){
    return emptyMsg ? `<h3 class="challenges-admin-section-title">${title} (0)</h3><p class="challenges-admin-empty">${emptyMsg}</p>` : '';
  }
  const visibleCount = challengesAdminVisibleCount[sectionKey];
  const visible = filteredList.slice(0, visibleCount);
  const remaining = filteredList.length - visible.length;
  return `
    <h3 class="challenges-admin-section-title">${title} (${filteredList.length})</h3>
    ${toolbarHTML}
    ${visible.map(cardHTMLFn).join('')}
    ${remaining > 0 ? `<button class="btn btn-secondary challenges-admin-load-more" data-section="${sectionKey}">${t('adminChallenges.section.loadMore', { n: Math.min(remaining, CHALLENGES_ADMIN_PAGE_SIZE), remaining })}</button>` : ''}
  `;
}

// Barra de aprovação em lote na seção Pendentes -- ação de sempre continua
// sendo aprovar um por um; o lote é um atalho pra vários itens "óbvios"
// acumulados. `filteredPending` é a lista inteira já filtrada (não só a
// página visível), pra "selecionar todos" e a contagem baterem mesmo com
// "Carregar mais" ainda não clicado, e pra descartar seleção de itens que
// saíram da fila (aprovados/rejeitados em outra aba) num refresh.
function challengesAdminBulkToolbarHTML(filteredPending){
  const filteredIds = new Set(filteredPending.map(c => c.id));
  [...challengesAdminSelectedIds].forEach(id => { if (!filteredIds.has(id)) challengesAdminSelectedIds.delete(id); });
  const selectedCount = challengesAdminSelectedIds.size;
  const allSelected = filteredPending.length > 0 && selectedCount === filteredPending.length;
  return `
    <div class="challenges-admin-bulk-toolbar">
      <label class="challenges-admin-select-all">
        <input type="checkbox" id="challenges-admin-select-all" ${allSelected ? 'checked' : ''}>
        ${t('adminChallenges.bulk.selectAll', { n: filteredPending.length })}
      </label>
      <button class="btn btn-primary btn-sm" id="challenges-admin-bulk-approve-btn" ${selectedCount === 0 ? 'disabled' : ''}>
        ${t('adminChallenges.bulk.approveSelected', { n: selectedCount })}
      </button>
    </div>
  `;
}

function challengeAdminPendingCardHTML(c){
  const editing = challengesAdminEditingId === c.id;
  return `
    <div class="challenges-admin-card" data-challenge-id="${c.id}">
      <div class="challenges-admin-card-header">
        ${editing ? '' : `<input type="checkbox" class="challenges-admin-select-checkbox" data-id="${c.id}" ${challengesAdminSelectedIds.has(c.id) ? 'checked' : ''} aria-label="${t('adminChallenges.bulk.checkboxAria')}">`}
        <span class="challenge-card-level">${c.level}</span>
        <strong>${challengeAdminCardTitle(c)}</strong>
      </div>
      <div class="challenges-admin-card-body">
        ${editing ? challengeAdminEditView(c) : challengeAdminReadView(c)}
      </div>
      <div class="challenges-admin-actions">
        ${editing
          ? `<button class="btn btn-primary" data-action="save">${t('adminChallenges.btn.save')}</button>
             <button class="btn btn-secondary" data-action="cancel-edit">${t('myFlashcards.edit.cancel')}</button>`
          : `<button class="btn btn-primary" data-action="approve">${t('adminChallenges.btn.approvePublish')}</button>
             <button class="btn btn-secondary" data-action="preview">${t('adminChallenges.btn.preview')}</button>
             <button class="btn btn-secondary" data-action="edit">${t('adminChallenges.btn.edit')}</button>
             <button class="btn btn-secondary" data-action="reject">${t('adminChallenges.btn.reject')}</button>`
        }
      </div>
    </div>
  `;
}

async function renderChallengesAdmin(){
  if (!isChallengesAdmin()) return;
  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'block';

  const content = document.getElementById('challenges-admin-content');
  content.innerHTML = loadingHTML();
  const ok = await loadChallengesFromDB(true);
  if (!ok){
    content.innerHTML = `<p class="challenges-admin-empty">${t('adminChallenges.loadFailed')}</p>`;
    return;
  }

  renderChallengesAdminList();
}

// Renderiza a partir do que já está em CHALLENGES, sem consultar o banco
// de novo -- usada pela busca/filtros/paginação (renderChallengesAdmin
// chama esta depois de carregar).
function renderChallengesAdminList(){
  const content = document.getElementById('challenges-admin-content');

  const pendingUnfiltered = pendingChallenges();
  const publishedUnfiltered = publishedChallenges();
  const unpublishedUnfiltered = unpublishedButApprovedChallenges();
  const pending = applyChallengesAdminFilters(pendingUnfiltered);
  const published = applyChallengesAdminFilters(publishedUnfiltered);
  const unpublished = applyChallengesAdminFilters(unpublishedUnfiltered);

  // Uma seção vazia por causa do filtro atual não é a mesma coisa que uma
  // seção genuinamente vazia -- a mensagem diz qual é qual, em vez de
  // sempre "nenhum desafio [status]" mesmo quando na verdade existem,
  // só não bateram com a busca/filtro.
  const sectionEmptyMsg = (filtered, unfiltered, genuineMsg) =>
    filtered.length === 0 && unfiltered.length > 0 ? t('adminChallenges.section.noResults') : genuineMsg;

  const pendingHTML = challengesAdminSectionHTML('pending', t('adminChallenges.section.pending'), pending, challengeAdminPendingCardHTML,
    sectionEmptyMsg(pending, pendingUnfiltered, t('adminChallenges.section.pendingEmpty')),
    pending.length > 0 ? challengesAdminBulkToolbarHTML(pending) : '');
  const publishedHTML = challengesAdminSectionHTML('published', t('adminChallenges.section.published'), published, challengeAdminPublishedCardHTML,
    sectionEmptyMsg(published, publishedUnfiltered, t('adminChallenges.section.publishedEmpty')));
  const unpublishedHTML = challengesAdminSectionHTML('unpublished', t('adminChallenges.section.unpublished'), unpublished, challengeAdminPublishedCardHTML,
    sectionEmptyMsg(unpublished, unpublishedUnfiltered, t('adminChallenges.section.unpublishedEmpty')));

  // Cada seção já mostra sua própria mensagem contextual quando vazia
  // (genuinamente vazia vs. vazia só por causa do filtro atual) --
  // nenhuma mensagem redundante no topo.
  content.innerHTML = challengesAdminFilterBarHTML() + pendingHTML + publishedHTML + unpublishedHTML;
  wireChallengesAdminFilterBar(content);

  content.querySelectorAll('.challenges-admin-load-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      challengesAdminVisibleCount[section] += CHALLENGES_ADMIN_PAGE_SIZE;
      renderChallengesAdminList();
    });
  });

  content.querySelectorAll('.challenges-admin-select-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) challengesAdminSelectedIds.add(cb.dataset.id);
      else challengesAdminSelectedIds.delete(cb.dataset.id);
      renderChallengesAdminList();
    });
  });
  const selectAllCb = content.querySelector('#challenges-admin-select-all');
  if (selectAllCb) selectAllCb.addEventListener('change', () => {
    if (selectAllCb.checked) pending.forEach(c => challengesAdminSelectedIds.add(c.id));
    else pending.forEach(c => challengesAdminSelectedIds.delete(c.id));
    renderChallengesAdminList();
  });
  const bulkApproveBtn = content.querySelector('#challenges-admin-bulk-approve-btn');
  if (bulkApproveBtn) bulkApproveBtn.addEventListener('click', async () => {
    const targets = pending.filter(c => challengesAdminSelectedIds.has(c.id));
    if (targets.length === 0) return;
    if (!confirm(tp('adminChallenges.bulk.confirm', targets.length === 1 ? 1 : 2, { n: targets.length }))) return;
    bulkApproveBtn.disabled = true;
    bulkApproveBtn.textContent = t('adminChallenges.bulk.approving');
    let published = 0;
    const skipped = [];
    for (const c of targets){
      const result = await approveChallengeSilent(c);
      if (result.ok){ published++; challengesAdminSelectedIds.delete(c.id); }
      else if (result.skipped) skipped.push(challengeAdminCardTitle(c));
    }
    showToast(skipped.length === 0
      ? tp('adminChallenges.bulk.published', published === 1 ? 1 : 2, { published })
      : t('adminChallenges.bulk.publishedSkipped', { published, skipped: skipped.length, list: skipped.join(', ') }));
    renderChallengesAdmin();
  });

  wireChallengeAudioDurations(content);

  content.querySelectorAll('.challenges-admin-card').forEach(card => {
    const id = card.dataset.challengeId;
    const approveBtn = card.querySelector('[data-action="approve"]');
    const previewBtn = card.querySelector('[data-action="preview"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    const cancelBtn = card.querySelector('[data-action="cancel-edit"]');
    const unpublishBtn = card.querySelector('[data-action="unpublish"]');

    if (approveBtn) approveBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      if (await approveChallengeWithGate(c)) renderChallengesAdmin();
    });
    if (previewBtn) previewBtn.addEventListener('click', () => {
      const c = CHALLENGES.find(x => x.id === id);
      openChallengePreview(c);
    });
    if (unpublishBtn) unpublishBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      if (!confirm(t('adminChallenges.confirm.unpublish'))) return;
      if (await unpublishChallenge(c)) renderChallengesAdmin();
    });
    if (rejectBtn) rejectBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      const previousStatus = c.status;
      c.status = 'rejected';
      const ok = await persistChallenge(c, {
        rejected_at: new Date().toISOString(),
        rejected_by: CURRENT_USER.email,
      });
      if (!ok){ c.status = previousStatus; return; }
      showToast(t('adminChallenges.toast.rejected'));
      renderChallengesAdmin();
    });
    if (editBtn) editBtn.addEventListener('click', () => {
      challengesAdminEditingId = id;
      renderChallengesAdminList();
    });
    card.querySelectorAll('.challenges-admin-resource').forEach(resEl => {
      const idx = parseInt(resEl.dataset.resourceIdx, 10);
      resEl.querySelectorAll('[data-resource-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const c = CHALLENGES.find(x => x.id === id);
          const previousApproved = c.externalResources[idx].approved;
          c.externalResources[idx].approved = btn.dataset.resourceAction === 'approve';
          const ok = await persistChallenge(c);
          if (!ok){ c.externalResources[idx].approved = previousApproved; return; }
          renderChallengesAdmin();
        });
      });
    });
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      challengesAdminEditingId = null;
      renderChallengesAdminList();
    });
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      card.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        const value = input.value;
        if (field === 'options'){
          const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
          c.options = lines.map(l => l.replace(/^\*/, '').trim());
          const starred = lines.find(l => l.startsWith('*'));
          if (starred) c.correctAnswer = starred.replace(/^\*/, '').trim();
        } else if (field === 'blanks'){
          c.blanks = value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
            const opts = line.split('|').map(o => o.trim()).filter(Boolean);
            const starred = opts.find(o => o.startsWith('*'));
            return { options: opts.map(o => o.replace(/^\*/, '').trim()), answer: starred ? starred.replace(/^\*/, '').trim() : '' };
          });
        } else if (field === 'referenceTranslations'){
          c.referenceTranslations = value.split('\n').map(l => l.trim()).filter(Boolean);
        } else if (field.includes('.')){
          const [obj, key] = field.split('.');
          c[obj][key] = value;
        } else {
          c[field] = value;
        }
      });
      // Editar um desafio já publicado/aprovado não deve deixar uma edição
      // incompleta no ar imediatamente -- volta pra needs_review até ser
      // revisado e aprovado de novo (mesmo padrão da opção de fallback
      // combinada: reverter status em vez de manter uma versão "shadow").
      const wasLive = c.status === 'published' || c.status === 'approved';
      if (wasLive) c.status = 'needs_review';
      const ok = await persistChallenge(c);
      if (!ok) return;
      challengesAdminEditingId = null;
      showToast(wasLive
        ? t('adminChallenges.toast.savedBackToReview')
        : t('adminChallenges.toast.saved'));
      renderChallengesAdmin();
    });
  });
}

// Os listeners da barra do admin e da janela de importação, que eram de nível superior no fr/app.js (na mesma ordem,
// logo depois dos do aluno): wireChallengesScreen() (shared/desafios.js) chama esta.
function wireChallengesAdminScreen(){
  document.getElementById('challenges-admin-back-btn').addEventListener('click', renderChallengeCategories);
  document.getElementById('challenges-admin-review-btn').addEventListener('click', () => renderChallengesAdmin());

  document.getElementById('challenges-admin-import-btn').addEventListener('click', () => {
    document.getElementById('challenges-import-textarea').value = '';
    const statusEl = document.getElementById('challenges-import-status');
    statusEl.className = 'challenges-import-status';
    statusEl.textContent = '';
    document.getElementById('challenges-import-modal').style.display = 'flex';
  });
  document.getElementById('challenges-import-modal-close').addEventListener('click', () => {
    document.getElementById('challenges-import-modal').style.display = 'none';
  });
  document.getElementById('challenges-import-modal').addEventListener('click', (e) => {
    if (e.target.id === 'challenges-import-modal') document.getElementById('challenges-import-modal').style.display = 'none';
  });
  document.getElementById('challenges-import-submit-btn').addEventListener('click', async () => {
    const textarea = document.getElementById('challenges-import-textarea');
    const statusEl = document.getElementById('challenges-import-status');
    const btn = document.getElementById('challenges-import-submit-btn');
    statusEl.className = 'challenges-import-status';
    statusEl.textContent = '';

    let result;
    try {
      btn.disabled = true;
      btn.textContent = t('adminChallenges.import.importing');
      result = await importChallengesFromJSON(textarea.value);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('adminChallenges.import.btn');
      statusEl.className = 'challenges-import-status err';
      statusEl.textContent = '❌ ' + err.message;
      return;
    }
    btn.disabled = false;
    btn.textContent = t('adminChallenges.import.btn');

    if (result.error){
      statusEl.className = 'challenges-import-status err';
      statusEl.textContent = t('adminChallenges.import.dbFail', { error: result.error });
      return;
    }
    const lines = [];
    if (result.insertedCount > 0) lines.push(tp('adminChallenges.import.ok', result.insertedCount === 1 ? 1 : 2, { n: result.insertedCount }));
    if (result.skipped.length > 0) lines.push(tp('adminChallenges.import.skipped', result.skipped.length === 1 ? 1 : 2, { n: result.skipped.length }) + '\n' + result.skipped.map(s => '  • ' + s).join('\n'));
    statusEl.className = result.insertedCount > 0 ? 'challenges-import-status ok' : 'challenges-import-status err';
    statusEl.textContent = lines.join('\n\n');
    if (result.insertedCount > 0){
      textarea.value = '';
      renderChallengesAdmin();
    }
  });
}


// A janela de importação (admin), igual à do fr/index.html; mountChallengesScreen() (shared/desafios-telas.js) a põe
// na página quando o site não a tem.
function challengesImportModalHTML(){
  return `
<div id="challenges-import-modal" class="app-modal-overlay" style="display:none;">
  <div class="app-modal">
    <div class="app-modal-header">
      <h3 data-i18n="adminChallenges.modal.title">Importar desafios via JSON</h3>
      <button class="app-modal-close" id="challenges-import-modal-close" aria-label="Fechar" data-i18n-attr="aria-label:common.close">✕</button>
    </div>
    <div class="app-modal-body">
      <p>Cole aqui a saída do pipeline de geração (<code>challenges_pipeline_output.json</code>, ou só o array de <code>accepted</code>). Vai direto para o banco, sem precisar rodar SQL manualmente no Supabase.</p>
      <textarea id="challenges-import-textarea" class="challenges-import-textarea" placeholder='[{"id": "expr-auto-001", "type": "expression", "level": "B1", ...}, ...]' rows="12"></textarea>
      <button class="btn btn-primary btn-block" id="challenges-import-submit-btn" style="max-width:320px; margin:12px auto 0;" data-i18n="adminChallenges.import.btn">Importar</button>
      <div class="challenges-import-status" id="challenges-import-status"></div>
    </div>
  </div>
</div>
`;
}
