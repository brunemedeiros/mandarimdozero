// ---------- Fase 7j (ver CLAUDE.md) -- Anki IMPORT: parser puro do .apkg ----------
//
// Motor comum aos dois idiomas, SEM nenhum conhecimento do modelo Note/Field
// nativo deste app -- devolve só dados CRUS do Anki (notes/models/decks/
// mídia). A tradução pra Note/CardType/Field nativo fica inteira em
// shared/anki-import.js (mapper), nunca aqui -- mesma separação já usada
// entre export (shared/anki-export.js, formato Anki) e config por idioma
// (fr/zh app.js, ANKI_EXPORT_CONFIG).
//
// Dependências INJETADAS pelo chamador (nunca importadas por este arquivo):
//   - SQL: instância já inicializada de sql.js (mesma que shared/anki-export.js
//     já carrega via initSqlJs({locateFile:...cdnjs.../sql.js/1.8.0/...}))
//   - JSZipCtor: a classe JSZip global (mesma que shared/anki-export.js usa)
// Isso permite os mesmos testes Node/VM desta feature carregarem sql.js/jszip
// reais via npm (sem precisar de navegador/CDN) enquanto a produção continua
// usando exatamente as mesmas 2 libs já aprovadas/carregadas pelo exportador.
//
// Formatos .apkg suportados NESTA fase (ver auditoria completa no relatório
// da Fase 7j, CLAUDE.md) -- decisão explícita, não um corte silencioso:
//   - "legado" (collection.anki2, ou collection.anki21 com col.models/
//     col.decks ainda como blob JSON) -- é o que shared/anki-export.js
//     SEMPRE produz (garante round-trip real, ver testes) e o que o próprio
//     Anki gera quando a pessoa marca "Suporte a versões legadas do Anki"
//     na exportação -- opção padrão, documentada, do próprio Anki.
// NÃO suportado, com erro FATAL explícito (nunca finge sucesso/corrompe
// dado em silêncio):
//   - collection.anki21b (zstd) -- formato mais novo (Anki 23.10+,
//     "backend Rust"), exige um decodificador zstd que este app não carrega.
//   - schema 18+ só-relacional (col.models/col.decks vazios, dados reais em
//     tabelas notetypes/fields/templates cujo `config` é PROTOBUF BINÁRIO,
//     não JSON) -- decodificar protobuf à mão arriscaria corromper dado
//     silenciosamente (o risco que a Seção 34 do prompt-mestre pede pra
//     evitar), nunca implementado aqui. Mensagem de erro sempre inclui a
//     instrução exata de como reexportar em modo compatível.

const ANKI_PARSER_ERROR_MESSAGES = {
  invalid_zip: 'Arquivo não é um .apkg/.zip válido.',
  missing_collection: 'Este .apkg não contém um banco de coleção reconhecível (collection.anki2/anki21).',
  unreadable_collection: 'Não foi possível ler o banco de dados da coleção dentro do .apkg.',
  invalid_sqlite: 'O banco de dados da coleção está corrompido ou num formato SQLite não reconhecido.',
  empty_collection: 'A tabela "col" desta coleção está vazia.',
  malformed_col_table: 'Não foi possível ler a tabela "col" desta coleção.',
  malformed_notes_cards: 'Não foi possível ler as tabelas de notas/cartões desta coleção.',
  unsupported_format_zstd: 'Este .apkg usa o formato mais novo do Anki (compactação zstd, collection.anki21b), ainda não suportado por este importador. No Anki, ao exportar, marque a opção "Suporte a versões legadas do Anki" (ou "Support older Anki versions") pra gerar um pacote compatível, e tente de novo.',
  unsupported_format_protobuf: 'Este .apkg foi exportado num formato mais novo do Anki, cujos modelos de cartão ficam guardados em protobuf binário (não suportado por este importador -- decodificar isso à mão arriscaria corromper o conteúdo). No Anki, ao exportar, marque a opção "Suporte a versões legadas do Anki" (ou "Support older Anki versions") pra gerar um pacote compatível, e tente de novo.',
};

function safeParseJsonObject(raw){
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) { return {}; }
}

// Separador de campos usado pelo Anki dentro de `notes.flds` -- 0x1f (unit
// separator), o MESMO caractere que shared/anki-export.js já usa pra juntar
// campos na hora de exportar (`flds.join('\x1f')`) -- confirma que ler com
// `.split('\x1f')` é o inverso exato do que nosso próprio exportador escreve.
const ANKI_FIELD_SEP = '\x1f';

async function parseApkgFile(arrayBuffer, deps){
  const SQL = deps && deps.SQL;
  const JSZipCtor = deps && deps.JSZipCtor;
  if (!SQL || !JSZipCtor){
    return { ok: false, fatal: true, code: 'missing_dependencies', error: 'Bibliotecas de leitura de .apkg não carregadas.' };
  }

  let zip;
  try {
    zip = await JSZipCtor.loadAsync(arrayBuffer);
  } catch (e) {
    return { ok: false, fatal: true, code: 'invalid_zip', error: ANKI_PARSER_ERROR_MESSAGES.invalid_zip };
  }

  const anki21bEntry = zip.file('collection.anki21b');
  const anki21Entry = zip.file('collection.anki21');
  const anki2Entry = zip.file('collection.anki2');
  const dbEntry = anki21Entry || anki2Entry;

  if (!dbEntry){
    if (anki21bEntry){
      return { ok: false, fatal: true, code: 'unsupported_format_zstd', error: ANKI_PARSER_ERROR_MESSAGES.unsupported_format_zstd };
    }
    return { ok: false, fatal: true, code: 'missing_collection', error: ANKI_PARSER_ERROR_MESSAGES.missing_collection };
  }

  let dbBytes;
  try {
    dbBytes = await dbEntry.async('uint8array');
  } catch (e) {
    return { ok: false, fatal: true, code: 'unreadable_collection', error: ANKI_PARSER_ERROR_MESSAGES.unreadable_collection };
  }

  let db;
  try {
    db = new SQL.Database(dbBytes);
  } catch (e) {
    return { ok: false, fatal: true, code: 'invalid_sqlite', error: ANKI_PARSER_ERROR_MESSAGES.invalid_sqlite };
  }

  let colRow;
  try {
    const colRes = db.exec('SELECT crt, models, decks FROM col LIMIT 1');
    if (!colRes.length || !colRes[0].values.length){
      db.close && db.close();
      return { ok: false, fatal: true, code: 'empty_collection', error: ANKI_PARSER_ERROR_MESSAGES.empty_collection };
    }
    const row = colRes[0].values[0];
    colRow = { crt: row[0], modelsJson: row[1], decksJson: row[2] };
  } catch (e) {
    db.close && db.close();
    return { ok: false, fatal: true, code: 'malformed_col_table', error: ANKI_PARSER_ERROR_MESSAGES.malformed_col_table };
  }

  const models = safeParseJsonObject(colRow.modelsJson);
  const decks = safeParseJsonObject(colRow.decksJson);

  // Schema 18+ ("legacy3"/backend Rust): col.models/col.decks ficam vazios
  // ('{}') e os dados reais vivem em tabelas relacionais próprias
  // (notetypes/fields/templates) cujo `config` é protobuf -- detectado e
  // recusado explicitamente (ver comentário no topo do arquivo), nunca
  // decodificado às cegas.
  if (!Object.keys(models).length){
    let hasRelationalNotetypes = false;
    try {
      const check = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='notetypes'");
      hasRelationalNotetypes = !!(check.length && check[0].values[0][0] > 0);
    } catch (e) { /* tabela nem existe -- não é o caso relacional, segue pro erro genérico abaixo */ }
    db.close && db.close();
    if (hasRelationalNotetypes){
      return { ok: false, fatal: true, code: 'unsupported_format_protobuf', error: ANKI_PARSER_ERROR_MESSAGES.unsupported_format_protobuf };
    }
    return { ok: false, fatal: true, code: 'empty_collection', error: 'Esta coleção não tem nenhum modelo de cartão (notetype) reconhecível.' };
  }

  let notesRaw, cardsRaw;
  try {
    notesRaw = db.exec('SELECT id, guid, mid, tags, flds, sfld FROM notes');
    cardsRaw = db.exec('SELECT id, nid, did, ord FROM cards');
  } catch (e) {
    db.close && db.close();
    return { ok: false, fatal: true, code: 'malformed_notes_cards', error: ANKI_PARSER_ERROR_MESSAGES.malformed_notes_cards };
  }

  const notes = (notesRaw[0] ? notesRaw[0].values : []).map(row => ({
    id: row[0],
    guid: row[1],
    mid: String(row[2]),
    tags: (row[3] || '').trim().split(/\s+/).filter(Boolean),
    flds: (row[4] || '').split(ANKI_FIELD_SEP),
    sfld: row[5],
  }));

  const cardsByNoteId = new Map();
  (cardsRaw[0] ? cardsRaw[0].values : []).forEach(row => {
    const nid = row[1];
    if (!cardsByNoteId.has(nid)) cardsByNoteId.set(nid, []);
    cardsByNoteId.get(nid).push({ id: row[0], deckId: String(row[2]), ord: row[3] });
  });

  let mediaManifest = {};
  const mediaEntry = zip.file('media');
  if (mediaEntry){
    try {
      const parsed = JSON.parse(await mediaEntry.async('string'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) mediaManifest = parsed;
    } catch (e) {
      // Manifesto de mídia ilegível -- mídia fica indisponível pra toda a
      // importação (cada referência de mídia num Field vai reportar
      // "não encontrada" individualmente, ver shared/anki-import.js), mas
      // isso nunca aborta o parse da coleção inteira -- notas/texto
      // continuam 100% importáveis sem a mídia.
    }
  }

  db.close && db.close();

  return {
    ok: true,
    schemaGeneration: anki21Entry ? 'anki21' : 'anki2',
    models,
    decks,
    notes,
    cardsByNoteId,
    mediaManifest, // { "0": "nome-real.mp3", "1": "outro.jpg", ... }
    zip, // pro chamador buscar bytes de mídia por índice sob demanda (zip.file(String(index)))
  };
}
