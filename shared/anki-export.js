// ---------- Exportação .apkg (formato real do Anki via sql.js + JSZip) ----------
// Motor comum aos dois idiomas: schema do Anki, empacotamento em .apkg,
// download. O que muda por idioma (campos do card e template de
// pergunta/resposta -- francês só tem { francês, tradução }, chinês tem
// { pinyin, caractere, tradução }; nome/filtro das unidades no seletor;
// prefixo do guid/nome do arquivo; como montar os campos de cada card a
// partir de STATE.cards) fica num `config` que cada app.js monta e passa
// pras funções abaixo. Ver languages/{fr,zh}/app.js (`ANKI_EXPORT_CONFIG`).
let exportSelectedUnit = 'all';

function renderExportDeckSelect(config){
  const wrap = document.getElementById('export-deck-select');
  const options = [{id:'all', label:'Todas as unidades'}].concat(config.unitOptions());
  wrap.innerHTML = options.map(o => `<button class="deck-chip ${exportSelectedUnit===o.id?'active':''}" data-id="${o.id}">${o.label}</button>`).join('');
  wrap.querySelectorAll('.deck-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      exportSelectedUnit = chip.dataset.id;
      renderExportDeckSelect(config);
    });
  });
}

function ankiRandId(){
  // gera IDs no estilo epoch-ms usado pelo Anki
  return Date.now() + Math.floor(Math.random()*100000);
}

function simpleChecksum(str){
  // Anki usa os primeiros 8 dígitos do sha1 do campo — aqui usamos um hash simples
  // suficiente para não colidir dentro de um mesmo baralho pequeno.
  let hash = 0;
  for (let i=0;i<str.length;i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100000000;
}

// ============================================================
// Fase 7i (ver CLAUDE.md) -- MÍDIA no export Anki
// ============================================================
//
// Nenhuma arquitetura de mídia nova -- só REUTILIZA o contrato de
// Field.audio/Field.image já travado desde a Fase 7b/7a
// (resolveCardExportMedia(), shared/flashcard-model.js, carregado ANTES
// deste arquivo em fr/zh index.html) e baixa as URLs já resolvidas pra
// dentro do pacote .apkg -- NUNCA gera TTS (resolveFieldAudioUrl(), usado
// por baixo de resolveCardExportMedia(), só devolve `generatedUrl` de um
// Field TTS se ele já existir, nunca dispara geração), NUNCA apaga/altera
// arquivo nenhum no Storage (só LÊ, via fetch()).

// `[sound:filename]`/`<img src="filename">` -- sintaxe padrão do Anki pra
// referenciar um arquivo já presente na pasta "media" do pacote (ver
// collectExportMediaAssets() abaixo).
function mediaTagHTML(kind, filename){
  return kind === 'audio' ? `[sound:${filename}]` : `<img src="${filename}">`;
}

// Concatena o texto de um campo com a mídia já resolvida pro lado dele
// (`mediaSide`, vindo de collectExportMediaAssets() -- já são strings
// `[sound:...]`/`<img ...>` prontas, ou '' quando não há mídia nesse lado
// ou o download dela falhou). Imagem antes do texto (mesma ordem visual
// que os 4 renderers de Revisão já usam -- imagem no topo do flashcard,
// texto abaixo); áudio depois do texto (mesmo lugar do botão 🎧 na tela).
function ankiFieldHTML(text, mediaSide){
  const imageTag = (mediaSide && mediaSide.imageTag) || '';
  const audioTag = (mediaSide && mediaSide.audioTag) || '';
  return `${imageTag}${imageTag ? '<br>' : ''}${text || ''}${audioTag}`;
}

// Extensão do arquivo de mídia -- só pra dar um nome legível dentro do
// pacote (Anki não liga pra extensão em si, só usa o nome pra casar
// `[sound:x]`/`<img src="x">` com o arquivo de fato presente no zip).
// Nunca lê o nome do arquivo original enviado pela professora (esse dado
// nem chega até aqui -- só a URL pública já resolvida) -- deriva da
// própria URL, com fallback seguro se não achar nada reconhecível.
function guessMediaExtension(url, kind){
  try{
    const path = new URL(url, window.location.href).pathname;
    const m = /\.([a-zA-Z0-9]{2,5})$/.exec(path);
    if (m) return `.${m[1].toLowerCase()}`;
  }catch(e){ /* URL inválida/relativa -- cai no fallback abaixo */ }
  return kind === 'audio' ? '.mp3' : '.jpg';
}

// Dado UM card já construído (STATE.cards), decide se ele vai pro modelo
// "Cloze" nativo do Anki ou pro modelo "Básico" (o mesmo modelo
// frente/verso de sempre, agora também usado por Múltipla Escolha/
// Digite a resposta/trilha -- ver noteFields()/clozeFields() em fr/zh
// app.js). Mesma checagem nos 2 idiomas -- fica aqui, não em `config`,
// pra nunca duplicar/divergir entre fr e zh.
function ankiExportCardKind(card){
  if (card.cardInstance && card.cardInstance.cardTypeId === 'cloze') return 'cloze';
  // K2-F: B da trilha (normal_reversed, frente = tradução) vai para um modelo
  // "Reverso" com os MESMOS campos semânticos do Básico, mas frente/verso
  // invertidos no template -- preserva a direção do CardInstance sem
  // misturar o conteúdo dos campos. Estrutural, não por sufixo de id.
  if (card.origin === 'study' && card.cardInstance && !isStudyWordProjectionCard(card)) return 'reverse';
  // K2-F hardening: Teacher/Self (CardInstance-level, nunca agrupados) usam o
  // MESMO modelo Reverso quando o lado mostrado na frente é a tradução e o
  // verso é o idioma estudado. Critério estrutural (idioma de cada Field
  // resolvido, nunca sufixo de id nem reviewDirection/isReverse).
  if ((card.origin === 'teacher' || card.origin === 'self') && ankiCardIsReversed(card)) return 'reverse';
  return 'basic';
}

// Lados do CardInstance na direção em que ele é mostrado: frente (prompt) e
// verso (resposta), cada um { text, lang, pinyinText }. Só normal, múltipla
// escolha e digite-a-resposta (os tipos que usam o modelo Básico/Reverso).
function ankiExportSides(card){
  if (!card.cardInstance) return null;
  const v = resolveCardContentView(card);
  if (v.kind === 'normal') return { front: v.front, back: v.back };
  if (v.kind === 'multiple_choice') return { front: v.prompt, back: v.correct || { text: v.correctText, lang: null, pinyinText: null } };
  if (v.kind === 'type_answer'){
    const a = v.answer || {};
    return { front: v.prompt, back: { text: v.displayAnswerText, lang: a.lang || null, pinyinText: a.pinyinText || null } };
  }
  return null;
}

// Invertido = frente NÃO está no idioma estudado e o verso está.
function ankiCardIsReversed(card){
  const sides = ankiExportSides(card);
  if (!sides || !sides.front || !sides.back) return false;
  const appKey = (typeof APP_KEY !== 'undefined') ? APP_KEY : null;
  return !isStudyLanguageField(sides.front, appKey) && isStudyLanguageField(sides.back, appKey);
}

// Constrói a string de tags do Note (coluna `notes.tags` do Anki),
// corrigindo na origem o bug "unidadenull" (CONSOLIDAÇÃO-5) em vez de
// mascará-lo com um .replace() posterior.
//
// Causa raiz: a versão anterior gravava incondicionalmente
// `unidade${card.unitId} ` -- mas `card.unitId` é SEMPRE `null` pra
// qualquer cartão nativo/legado autorado por professora/aluna (origin
// teacher/self, ver buildEngineCardsFromRow() em
// shared/flashcard-model.js), o que produzia a string literal
// "unidadenull " pra esses cartões (a maioria do conteúdo real). Além
// de quebrada, essa "tag" nunca teve relação nenhuma com a feature real
// de Tags (migration 048) -- é um rótulo fabricado a partir de
// `unitId`, pré-existente à feature de Tags, nunca atualizado quando
// cartões sem unidade passaram a existir.
//
// Correção (nunca um placeholder novo):
// - cartão de TRILHA (`card.unitId != null`) -- comportamento histórico
//   preservado EXATAMENTE como estava, byte a byte (`unidade${N} `) --
//   nunca teve o bug, nunca tocado aqui, fora do escopo desta fase.
// - cartão de professora/aluna (`card.unitId == null`) -- usa as Tags
//   REAIS da Note (`card.tags`, já normalizadas por
//   normalizeNoteTags() dentro de buildEngineCardsFromRow(), nunca
//   recalculado aqui), formatadas no padrão canônico do Anki (espaço
//   líder/final quando há tags -- mesmo formato que
//   shared/anki-parser.js já espera ao reimportar:
//   `(row[3]||'').trim().split(/\s+/)`). Sem tags reais -> string
//   vazia, NUNCA "unidadenull" nem qualquer outro placeholder.
function ankiNoteTagsString(card){
  if (card.unitId != null) return `unidade${card.unitId} `;
  const tags = Array.isArray(card.tags) ? card.tags : [];
  return tags.length ? ` ${tags.join(' ')} ` : '';
}

// Passa por TODOS os cards a exportar, resolve a mídia de cada um
// (resolveCardExportMedia(), shared/flashcard-model.js -- nunca
// reimplementado aqui), deduplica por URL (2 cards podem apontar pro
// MESMO arquivo -- ex: as várias CardInstance de um Cloze multi-marca
// compartilham o mesmo Field de áudio/imagem, Fase 7a), baixa cada URL
// única exatamente 1 vez (`fetch`, nunca modifica/apaga nada no
// Storage -- só leitura) e devolve, por card, os textos `[sound:]`/
// `<img>` já prontos pra `ankiFieldHTML()` concatenar.
//
// Falha em baixar UMA mídia específica (rede, CORS, arquivo removido)
// nunca aborta a exportação inteira -- essa mídia simplesmente não entra
// no pacote (o campo fica só com o texto, sem a tag), e o total de
// falhas é reportado no status final pra usuária não ficar achando que
// deu tudo certo silenciosamente.
async function collectExportMediaAssets(exportCards){
  const urlEntries = new Map(); // url -> {index, filename, kind, url, failed}
  let nextIndex = 0;

  function registerUrl(url, kind){
    if (!url) return null;
    if (urlEntries.has(url)) return urlEntries.get(url);
    const entry = { index: nextIndex, filename: `${kind}_${nextIndex}${guessMediaExtension(url, kind)}`, kind, url, failed: false };
    urlEntries.set(url, entry);
    nextIndex += 1;
    return entry;
  }

  const rawMediaForCard = new Map();
  exportCards.forEach(card => {
    const media = resolveCardExportMedia(card); // shared/flashcard-model.js -- nunca gera nada, só lê URLs já resolvidas
    rawMediaForCard.set(card.id, {
      front: media.front ? {
        audioEntry: registerUrl(media.front.audioUrl, 'audio'),
        imageEntry: registerUrl(media.front.imageUrl, 'image'),
      } : null,
      back: media.back ? {
        audioEntry: registerUrl(media.back.audioUrl, 'audio'),
        imageEntry: registerUrl(media.back.imageUrl, 'image'),
      } : null,
    });
  });

  const zipFiles = [];
  const manifest = {};
  await Promise.all(Array.from(urlEntries.values()).map(async entry => {
    try{
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      zipFiles.push({ index: entry.index, bytes });
      manifest[String(entry.index)] = entry.filename;
    }catch(err){
      console.error('[anki-export] não foi possível baixar mídia pro pacote:', entry.url, err);
      entry.failed = true;
    }
  }));

  function sideTags(sideMedia){
    if (!sideMedia) return { audioTag: '', imageTag: '' };
    const audioTag = (sideMedia.audioEntry && !sideMedia.audioEntry.failed) ? mediaTagHTML('audio', sideMedia.audioEntry.filename) : '';
    const imageTag = (sideMedia.imageEntry && !sideMedia.imageEntry.failed) ? mediaTagHTML('image', sideMedia.imageEntry.filename) : '';
    return { audioTag, imageTag };
  }

  const mediaForCard = new Map();
  rawMediaForCard.forEach((val, cardId) => {
    mediaForCard.set(cardId, { front: sideTags(val.front), back: sideTags(val.back) });
  });

  const failedCount = Array.from(urlEntries.values()).filter(e => e.failed).length;
  return { mediaForCard, manifest, zipFiles, failedCount };
}

async function generateApkg(config){
  const statusEl = document.getElementById('export-status');
  statusEl.textContent = 'Gerando arquivo...';
  statusEl.className = 'export-status';

  try{
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    const db = new SQL.Database();

    // ---- Schema mínimo do Anki (col, notes, cards, graves, revlog) ----
    db.run(`
      CREATE TABLE col (
        id integer primary key, crt integer, mod integer, scm integer, ver integer,
        dty integer, usn integer, ls integer, conf text, models text, decks text,
        dconf text, tags text
      );
      CREATE TABLE notes (
        id integer primary key, guid text, mid integer, mod integer, usn integer,
        tags text, flds text, sfld text, csum integer, flags integer, data text
      );
      CREATE TABLE cards (
        id integer primary key, nid integer, did integer, ord integer, mod integer,
        usn integer, type integer, queue integer, due integer, ivl integer,
        factor integer, reps integer, lapses integer, left integer, odue integer,
        odid integer, flags integer, data text
      );
      CREATE TABLE revlog (
        id integer primary key, cid integer, usn integer, ease integer, ivl integer,
        lastIvl integer, factor integer, time integer, type integer
      );
      CREATE TABLE graves (usn integer, oid integer, type integer);
      CREATE INDEX ix_notes_usn ON notes (usn);
      CREATE INDEX ix_cards_usn ON cards (usn);
      CREATE INDEX ix_revlog_usn ON revlog (usn);
      CREATE INDEX ix_cards_nid ON cards (nid);
      CREATE INDEX ix_cards_sched ON cards (did, queue, due);
      CREATE INDEX ix_notes_csum ON notes (csum);
    `);

    const now = Math.floor(Date.now()/1000);
    const modelId = ankiRandId();
    const deckId = ankiRandId();

    const deckName = config.deckName(exportSelectedUnit);

    // ---- Popula notes + cards a partir dos cartões do app ----
    const exportCards = config.cards(exportSelectedUnit);

    if (!exportCards.length){
      statusEl.textContent = 'Nenhum cartão para exportar nessa seleção.';
      statusEl.className = 'export-status err';
      return;
    }

    // Fase 7i -- segundo "modelo" (note type) do Anki, só pra cards Cloze
    // nativos (ver ankiExportCardKind()). Estrutura (campos/qfmt/afmt)
    // é a MESMA nos 2 idiomas -- Cloze não tem coluna de pinyin separada
    // (o pinyin, quando existe, já vem embutido como HINT nativo do
    // próprio Anki dentro da marca, ver buildAnkiClozeFieldText() em
    // shared/flashcard-model.js) -- só o `css` (cores de marca) vem do
    // `config` de cada idioma, pra manter a identidade visual sem
    // duplicar a definição do modelo inteiro por idioma. Só é criado/
    // incluído no pacote quando a seleção atual tem pelo menos 1 card
    // Cloze -- nunca importa um note type "Cloze" vazio/não usado no
    // Anki de quem nunca criou um cartão desse tipo.
    const hasClozeCards = exportCards.some(c => ankiExportCardKind(c) === 'cloze');
    const clozeModelId = hasClozeCards ? ankiRandId() : null;
    // K2-F -- modelo "Reverso" (só quando há B da trilha na seleção).
    const hasReverseCards = exportCards.some(c => ankiExportCardKind(c) === 'reverse');
    const reverseModelId = hasReverseCards ? ankiRandId() : null;

    // Fase 7i -- baixa toda a mídia (áudio/imagem) referenciada pelos
    // cards selecionados ANTES de montar os campos das notes -- é isso
    // que permite `noteFields()`/`clozeFields()` (config de cada idioma)
    // já receberem as tags `[sound:]`/`<img>` prontas pra concatenar.
    const media = await collectExportMediaAssets(exportCards);

    const model = {
      [modelId]: {
        id: modelId, name: config.modelName, type: 0, mod: now, usn: -1,
        sortf: 0, did: deckId,
        flds: config.fields,
        tmpls: [
          {
            name: "Cartão 1", ord:0,
            qfmt: config.qfmt,
            afmt: config.afmt,
            bqfmt:"", bafmt:"", did: null
          }
        ],
        css: config.css,
        latexPre: "", latexPost: "", latexsvg:false, req: [[0,"any",[0]]]
      }
    };
    if (hasReverseCards){
      model[reverseModelId] = {
        id: reverseModelId, name: `${config.modelName} - Reverso`, type: 0, mod: now, usn: -1,
        sortf: 0, did: deckId,
        flds: config.fields,
        tmpls: [
          { name: "Cartão 1", ord:0, qfmt: config.reverseQfmt, afmt: config.reverseAfmt, bqfmt:"", bafmt:"", did: null }
        ],
        css: config.css,
        latexPre: "", latexPost: "", latexsvg:false, req: [[0,"any",[0]]]
      };
    }
    if (hasClozeCards){
      model[clozeModelId] = {
        id: clozeModelId, name: `${config.modelName} - Cloze`, type: 1, mod: now, usn: -1,
        sortf: 0, did: deckId,
        flds: [
          { name: "Text", ord:0, font: "Arial", size: 22 },
          { name: "Tradução", ord:1, font: "Arial", size: 18 },
        ],
        tmpls: [
          {
            name: "Cloze", ord:0,
            qfmt: "{{cloze:Text}}",
            afmt: "{{cloze:Text}}<hr id='answer'><div style='text-align:center;font-size:18px;'>{{Tradução}}</div>",
            bqfmt:"", bafmt:"", did: null
          }
        ],
        // Reaproveita o css de marca do idioma (mesmas cores do modelo
        // Básico) -- nunca uma definição de modelo por idioma duplicada,
        // só a folha de estilo é per-idioma.
        css: config.css,
        latexPre: "", latexPost: "", latexsvg:false, req: [[0,"any",[0]]]
      };
    }

    const decks = {
      "1": { id:1, name:"Default", extendRev:50, usn:0, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc:"", dyn:0 },
      [deckId]: { id:deckId, name: deckName, extendRev:50, usn:-1, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc: config.deckDesc, dyn:0 }
    };

    const dconf = {
      "1": { id:1, name:"Default", new:{delays:[1,10],ints:[1,4,7],initialFactor:2500,perDay:20,order:1}, rev:{perDay:200,ease4:1.3,fuzz:0.05,ivlFct:1,maxIvl:36500}, lapse:{delays:[10],mult:0,minInt:1,leechFails:8,leechAction:0}, timer:0, misc:{} }
    };

    const conf = { curDeck: deckId, curModel: String(modelId), nextPos:1, sortType:"noteFld", sortBackwards:false, activeDecks:[deckId] };

    db.run(`INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)`, [
      now, now*1000, now*1000,
      JSON.stringify(conf), JSON.stringify(model), JSON.stringify(decks),
      JSON.stringify(dconf), JSON.stringify({})
    ]);

    let usnCounter = -1;
    const baseId = Date.now();
    exportCards.forEach((card, i) => {
      // IDs únicos e crescentes: baseId + índice garante que nunca colidem,
      // mesmo exportando centenas de cartões na mesma chamada.
      const noteId = baseId + (i * 2);
      const cardId = baseId + (i * 2) + 1;
      const kind = ankiExportCardKind(card);
      const cardMedia = media.mediaForCard.get(card.id) || { front: null, back: null };
      const noteMid = kind === 'cloze' ? clozeModelId : kind === 'reverse' ? reverseModelId : modelId;
      const flds = (kind === 'cloze' ? config.clozeFields(card, cardMedia)
        : kind === 'reverse' ? config.reverseFields(card, cardMedia)
        : config.noteFields(card, cardMedia)).join('\x1f');
      const sfld = config.sortField(card);
      const csum = simpleChecksum(sfld);
      const guid = `${config.guidPrefix}${card.id}`;

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
        noteId, guid, noteMid, now, usnCounter, ankiNoteTagsString(card), flds, sfld, csum, 0, ""
      ]);

      db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        cardId, noteId, deckId, 0, now, usnCounter,
        0, 0, i, 0, 2500, 0, 0, 0, 0, 0, 0, ""
      ]);
    });

    db.run(`INSERT INTO graves SELECT -1, 0, 0 WHERE 0`); // no-op, keeps table valid

    const dbBytes = db.export();

    // ---- Empacota em .apkg (é um zip contendo collection.anki2 + media) ----
    const zip = new JSZip();
    zip.file("collection.anki2", dbBytes);
    // Fase 7i -- manifesto de mídia real (antes sempre `{}`, incondicional
    // -- nenhum áudio/imagem jamais tinha ido pro pacote). Chave = índice
    // numérico (nome do arquivo DENTRO do zip, ver zip.file(String(index),...)
    // abaixo), valor = nome de arquivo legível (o que as tags `[sound:]`/
    // `<img>` embutidas nos campos referenciam).
    zip.file("media", JSON.stringify(media.manifest));
    media.zipFiles.forEach(f => zip.file(String(f.index), f.bytes));

    const blob = await zip.generateAsync({ type:"blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = config.filename(exportSelectedUnit);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    const mediaNote = media.failedCount > 0
      ? ` (${media.failedCount} arquivo(s) de mídia não puderam ser incluídos -- os cartões foram exportados mesmo assim, só sem esse áudio/imagem específico.)`
      : '';
    statusEl.textContent = `Exportado! ${exportCards.length} cartão(ões) no arquivo .apkg — importe direto no Anki.${mediaNote}`;
    statusEl.className = `export-status ${media.failedCount > 0 ? 'err' : 'ok'}`;

  }catch(err){
    console.error(err);
    statusEl.textContent = 'Não foi possível gerar o arquivo agora. Tente novamente.';
    statusEl.className = 'export-status err';
  }
}

// Liga o botão "Gerar arquivo .apkg" -- mesmos ids nos dois idiomas
// (#export-deck-select/#export-status/#export-btn). Vive dentro da aba
// "📦 Exportar" de Configurações (ver switchSettingsSection em cada
// app.js), não é mais modal aberto por um botão solto na Trilha. Chamado
// uma vez por app.js, passando o `config` daquele idioma.
function wireAnkiExport(config){
  document.getElementById('export-btn').addEventListener('click', () => generateApkg(config));
}
