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

    // ---- Popula notes + cards a partir dos cartões do app ----
    const exportCards = config.cards(exportSelectedUnit);

    if (!exportCards.length){
      statusEl.textContent = 'Nenhum cartão para exportar nessa seleção.';
      statusEl.className = 'export-status err';
      return;
    }

    let usnCounter = -1;
    const baseId = Date.now();
    exportCards.forEach((card, i) => {
      // IDs únicos e crescentes: baseId + índice garante que nunca colidem,
      // mesmo exportando centenas de cartões na mesma chamada.
      const noteId = baseId + (i * 2);
      const cardId = baseId + (i * 2) + 1;
      const flds = config.noteFields(card).join('\x1f');
      const sfld = config.sortField(card);
      const csum = simpleChecksum(sfld);
      const guid = `${config.guidPrefix}${card.id}`;

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
        noteId, guid, modelId, now, usnCounter, `unidade${card.unitId} `, flds, sfld, csum, 0, ""
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
    zip.file("media", JSON.stringify({}));

    const blob = await zip.generateAsync({ type:"blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = config.filename(exportSelectedUnit);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    statusEl.textContent = `Exportado! ${exportCards.length} cartão(ões) no arquivo .apkg — importe direto no Anki.`;
    statusEl.className = 'export-status ok';

  }catch(err){
    console.error(err);
    statusEl.textContent = 'Não foi possível gerar o arquivo agora. Tente novamente.';
    statusEl.className = 'export-status err';
  }
}

// Liga o botão que abre o modal (📦 Exportar, na Trilha), fechar pelo X ou
// clicando fora, e o botão "Gerar arquivo .apkg" -- mesmos ids/estrutura de
// modal nos dois idiomas (#export-open-btn/#export-modal/#export-modal-close/
// #export-deck-select/#export-status/#export-btn). Chamado uma vez por
// app.js, passando o `config` daquele idioma.
function wireAnkiExportModal(config){
  document.getElementById('export-open-btn').addEventListener('click', () => {
    renderExportDeckSelect(config);
    document.getElementById('export-modal').style.display = 'flex';
  });
  document.getElementById('export-modal-close').addEventListener('click', () => {
    document.getElementById('export-modal').style.display = 'none';
  });
  document.getElementById('export-modal').addEventListener('click', (e) => {
    if (e.target.id === 'export-modal'){
      document.getElementById('export-modal').style.display = 'none';
    }
  });
  document.getElementById('export-btn').addEventListener('click', () => generateApkg(config));
}
