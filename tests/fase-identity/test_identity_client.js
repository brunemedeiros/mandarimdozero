// Identity/Attribution -- testes do CLIENTE (Node/VM, arquivos REAIS).
// As regras de banco (imutabilidade, tag de sistema, RPC de cópia) são testadas
// em Postgres local por test_identity.sql; aqui: o cliente não tenta escolher/
// alterar username, usa a RPC, descarta/protege tags de sistema.
// Rodar: node tests/fase-identity/test_identity_client.js
const vm = require('vm');
const g = require('../fase-g/harness');
const { read, check, summary } = g;
const J = (ctx, e) => JSON.parse(JSON.stringify(vm.runInContext(e, ctx)));

const { ctx } = g.load('frances', 'u-1');
const run = f => vm.runInContext(read(f), ctx, { filename: f });
['shared/profile.js', 'shared/flashcard-tags-editor.js', 'shared/tag-manager.js'].forEach(run);
const calls = [];
ctx.supabaseClient = {
  rpc: async (n, a) => { calls.push(['rpc', n, a]); return { data: { user_id: 'u-1', username: 'u0123456789', display_name: null }, error: null }; },
  from: (t) => {
    const st = { t, op: null, pl: null };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok) => { calls.push([st.op, st.t, st.pl]); return Promise.resolve({ data: { user_id: 'u-1', username: 'u0123456789', display_name: 'X' }, error: null }).then(ok); };
      if (p === 'update') return (pl) => { st.op = 'update'; st.pl = pl; return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.pl = pl; return b; };
      return () => b;
    } });
    return b;
  },
};
ctx.CURRENT_USER = { id: 'u-1', email: 'maria.silva@gmail.com', user_metadata: { full_name: 'Maria Silva' } };
ctx.PROFILE_CACHE = { user_id: 'u-1', username: 'u0123456789' };

(async () => {
  // 1/4/5 criação: via RPC, sem enviar username/e-mail/nome
  const p = await vm.runInContext('createInitialProfile()', ctx);
  check('1 createInitialProfile usa a RPC ensure_my_profile', calls[0] && calls[0][1] === 'ensure_my_profile', calls);
  check('4/5 RPC chamada SEM argumentos (nada derivado de e-mail/nome vai do cliente)', calls[0][2] === undefined);
  check('1 nenhum INSERT direto em profiles pelo cliente', !calls.some(c => c[0] === 'insert'));
  check('1 devolve o perfil criado pelo servidor', p && p.username === 'u0123456789');

  // 6/7 saveProfileEdits nunca envia username
  calls.length = 0;
  ctx.__args = { displayName: ' Novo Nome ', username: 'hacker', bio: 'b', featuredBadgeId: null, publicProfile: true };
  await vm.runInContext('saveProfileEdits(__args)', ctx);
  const upd = calls.find(c => c[0] === 'update');
  check('6 UPDATE do perfil NÃO contém username (mesmo se o chamador passar um)', upd && !('username' in upd[2]) && !('user_id' in upd[2]), upd);
  check('8 display_name segue editável', upd && upd[2].display_name === 'Novo Nome');
  check('6 isUsernameAvailable removida (não há mais escolha de username)', J(ctx, "typeof isUsernameAvailable") === 'undefined');
  const src = read('shared/profile.js');
  check('6 saveProfileEdits não referencia slugifyUsername/username no payload', !/username:\s*cleanUsername/.test(src));

  // UI: campo apenas leitura
  for (const f of ['fr/index.html', 'zh/index.html']){
    const h = read(f);
    check(f + ' campo de username readonly', /id="profile-edit-username"[^>]*readonly/.test(h));
    check(f + ' rótulo não promete edição', !/for="profile-edit-username">Nome de usuário</.test(h));
  }

  // 13/14/15 tags de sistema (espelho de UX)
  check('13 isAttributionTag reconhece criado-por e criado-por-x', J(ctx, "[isAttributionTag('criado-por'),isAttributionTag('criado-por-ana'),isAttributionTag('Criado-Por-X'),isAttributionTag('criado-poruma'),isAttributionTag('saudacao')]").join() === 'true,true,true,false,false');
  const part = J(ctx, "partitionNoteTagsByLimits(['a1','criado-por-vitima','Criado Por Outro','saudacao'])");
  check('13/20 import descarta tag de sistema e informa (system_tag)', part.tags.join() === 'a1,saudacao' && part.dropped.filter(d => d.reason === 'system_tag').length === 2, part);
  check('20 stripSystemTags remove criado-por', J(ctx, "stripSystemTags(['x','criado-por-y'])").join() === 'x');
  const st = J(ctx, "nativeNoteEditorStateFromImportPayload({front:'a',backTrans:'b',tags:['criado-por-vitima','ok']}, 'frances')");
  check('20 payload de arquivo/link com criado-por-* nunca vira tag da Note', st.tags.join() === 'ok', st.tags);
  check('20 e fica registrado como descartado', J(ctx, "summarizeDroppedImportTags([nativeNoteEditorStateFromImportPayload({front:'a',backTrans:'b',tags:['criado-por-vitima']}, 'frances')])").includes('sistema'));
  check('20 cópia pública não mostra aviso de "perda" por tag de sistema', J(ctx, "summarizeDroppedImportTags([nativeNoteEditorStateFromImportPayload({front:'a',backTrans:'b',tags:['criado-por-vitima']}, 'frances')], {ignoreSystem:true})") === '');
  check('15 chip de tag de sistema não tem botão remover', !J(ctx, "noteTagChipsHTML(['criado-por-ana'], {removable:true})").includes('data-tag-remove'));
  check('15 chip de tag comum tem botão remover', J(ctx, "noteTagChipsHTML(['a1'], {removable:true})").includes('data-tag-remove'));
  check('14 planTagRename recusa renomear a atribuição', J(ctx, "planTagRename('criado-por-ana','outra',{})").ok === false);
  check('14 planTagRename recusa renomear tag comum PARA criado-por-*', J(ctx, "planTagRename('a1','Criado Por Fulano',{})").ok === false);
  check('15 gerenciador não oferece Renomear/Excluir para a atribuição', !J(ctx, "tagManagerRowsHTML([{tag:'criado-por-ana',notes:2}],{counts:{}})").includes('data-tag-delete'));
  check('15 mas oferece para tag comum', J(ctx, "tagManagerRowsHTML([{tag:'a1',notes:2}],{counts:{}})").includes('data-tag-delete'));
  check('14 mensagem de erro do servidor mapeada', /sistema/.test(J(ctx, "tagManagerErrorMessage({message:'system_tag_protected'})")));

  // 17-19 cópia: cliente usa a RPC e NÃO envia tags
  calls.length = 0;
  ctx.resolveOwnCreationDeck = async () => ({ ok: true, deckId: 5, decks: [] });
  ctx.__st = J(ctx, "nativeNoteEditorStateFromImportPayload({front:'bonjour',backTrans:'olá',tags:['saudacao','criado-por-vitima']}, 'frances')");
  const r = await vm.runInContext("copyPublicFlashcard({sourceId: 9001, languageAppKey:'frances', nativeState: __st, deckId: 5})", ctx);
  const rc = calls.find(c => c[0] === 'rpc' && c[1] === 'copy_public_flashcard');
  check('17 cópia pública usa a RPC copy_public_flashcard', !!rc && r.ok);
  check('17 payload enviado não contém tags nem owner_id/username', rc && !('tags' in rc[2].p_columns) && !('owner_id' in rc[2].p_columns) && !('username' in rc[2].p_columns), rc && Object.keys(rc[2].p_columns));
  check('17 sem INSERT direto em own_flashcards na cópia pública', !calls.some(c => c[0] === 'insert'));
  const pp = read('shared/public-profile.js');
  check('17 public-profile.js usa copyPublicFlashcard (não createOwnFlashcard)', /copyPublicFlashcard\(/.test(pp) && !/await createOwnFlashcard\(/.test(pp));
  check('16 sem colunas de origem no cliente (source_user_id/source_card_id)', !/source_user_id|source_card_id/.test(read('shared/own-flashcards.js') + pp));

  // 12 usernames legados válidos no roteador público
  summary('Identity (cliente)');
})();
