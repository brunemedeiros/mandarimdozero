// Fase J (Painel de Tags) -- testes unitários (Node/VM). Arquivos REAIS.
// A regra SQL (rename/fusão/delete/RLS/atomicidade) é testada no Postgres real
// (test_supabase_real.sql); aqui: normalização do nome novo, plano de rename,
// colisão, atualização do reviewTagFilter, wrappers de RPC e garantias
// estáticas (sem SELECT/UPDATE de linhas no cliente, sem revision).
// Rodar: node tests/fase-j/test_tag_manager_unit.js
const vm = require('vm');
const g = require('../fase-g/harness');
const { read, check, summary } = g;

function ctxFor(appKey){
  const { ctx } = g.load(appKey, 'u-1');
  vm.runInContext(read('shared/tag-manager.js'), ctx, { filename: 'shared/tag-manager.js' });
  return ctx;
}
const J = (ctx, expr) => JSON.parse(JSON.stringify(vm.runInContext(expr, ctx)));
const fr = ctxFor('frances'), zh = ctxFor('mandarim');

for (const [label, c] of [['fr', fr], ['zh', zh]]){
  // ----- planTagRename: normalização canônica do nome novo -----
  const counts = `{saudacao: 27, cumprimentos: 4, a1: 9}`;
  let p = J(c, `planTagRename('saudacao', 'Cumprimentos', ${counts})`);
  check(label + ' plan: normaliza pela função canônica (caixa)', p.ok && p.newSlug === 'cumprimentos');
  check(label + ' plan: colisão informa N afetadas e M já no destino', p.affected === 27 && p.collision === 4, p);
  p = J(c, `planTagRename('saudacao', 'Saudação Nova!', ${counts})`);
  check(label + ' plan: acento/espaço/pontuação → slug (sem 2ª normalização)', p.newSlug === 'saudacao-nova' && p.collision === 0 && p.affected === 27, p);
  p = J(c, `planTagRename('saudacao', 'SAUDAÇÃO', ${counts})`);
  check(label + ' plan: normalizado igual ao antigo = nenhuma alteração (sem UPDATE)', p.ok && p.unchanged === true && p.affected === 0, p);
  p = J(c, `planTagRename('saudacao', '!!!', ${counts})`);
  check(label + ' plan: nome inválido → erro, sem newSlug', p.ok === false && /válido/.test(p.error), p);
  p = J(c, `planTagRename('saudacao', '${'a'.repeat(51)}', ${counts})`);
  check(label + ' plan: 51 caracteres rejeitado (limite 50 do modelo)', p.ok === false && /50/.test(p.error), p);
  p = J(c, `planTagRename('saudacao', '${'a'.repeat(50)}', ${counts})`);
  check(label + ' plan: 50 caracteres aceito', p.ok === true && p.newSlug.length === 50, p);
  p = J(c, `planTagRename('a1', 'a2', {a1: 1})`);
  check(label + ' plan: destino inexistente = sem colisão', p.collision === 0);

  // ----- transformação do array (espelho local; persistência é a RPC) -----
  check(label + ' rename in-place, ordem preservada', J(c, `renameTagInTagList(['a1','saudacao','verbos'],'saudacao','cumprimentos')`).join() === 'a1,cumprimentos,verbos');
  check(label + ' rename com fusão: sem duplicata', J(c, `renameTagInTagList(['a1','cumprimentos','saudacao'],'saudacao','cumprimentos')`).join() === 'a1,cumprimentos');
  check(label + ' rename com fusão: posição da 1ª ocorrência', J(c, `renameTagInTagList(['saudacao','a1','cumprimentos'],'saudacao','cumprimentos')`).join() === 'cumprimentos,a1');
  check(label + ' rename: variantes/substring intactas (igualdade exata)', J(c, `renameTagInTagList(['saudacao-x','x-saudacao','saudacao'],'saudacao','y')`).join() === 'saudacao-x,x-saudacao,y');
  check(label + ' rename: Tag ausente = array igual', J(c, `renameTagInTagList(['a1'],'zz','y')`).join() === 'a1');
  check(label + ' delete remove só a Tag', J(c, `removeTagFromTagList(['a1','saudacao','verbos'],'saudacao')`).join() === 'a1,verbos');
  check(label + ' delete: Tag ausente = igual', J(c, `removeTagFromTagList(['a1'],'zz')`).join() === 'a1');
  check(label + ' sem tags (undefined) → []', J(c, `removeTagFromTagList(undefined,'x')`).length === 0 && J(c, `renameTagInTagList(null,'x','y')`).length === 0);

  // ----- reviewTagFilter -----
  check(label + ' filtro: rename troca o slug antigo pelo novo', J(c, `reviewTagFilterAfterRename(['a1','saudacao'],'saudacao','cumprimentos')`).join() === 'a1,cumprimentos');
  check(label + ' filtro: rename com destino já no filtro deduplica', J(c, `reviewTagFilterAfterRename(['cumprimentos','saudacao'],'saudacao','cumprimentos')`).join() === 'cumprimentos');
  check(label + ' filtro: rename sem a Tag no filtro = null (nada a persistir)', J(c, `reviewTagFilterAfterRename(['a1'],'saudacao','x')`) === null);
  check(label + ' filtro: sem filtro (vazio) = null', J(c, `reviewTagFilterAfterRename([],'saudacao','x')`) === null && J(c, `reviewTagFilterAfterDelete([],'saudacao')`) === null);
  check(label + ' filtro: delete remove o slug excluído', J(c, `reviewTagFilterAfterDelete(['a1','saudacao'],'saudacao')`).join() === 'a1');
  check(label + ' filtro: delete da única tag → [] (limpo, nunca morto)', J(c, `reviewTagFilterAfterDelete(['saudacao'],'saudacao')`).length === 0);
  check(label + ' filtro: OR/múltiplas continuam valendo após rename', J(c, `cardMatchesTagFilter({tags:['cumprimentos']}, reviewTagFilterAfterRename(['a1','saudacao'],'saudacao','cumprimentos'))`) === true);
  check(label + ' filtro: OR não casa card sem nenhuma das tags', J(c, `cardMatchesTagFilter({tags:['verbos']}, ['a1','cumprimentos'])`) === false);

  // ----- estado local (STATE.cards + reviewTagFilter), scope own -----
  vm.runInContext(`
    STATE.cards = [
      {id:'s1', origin:'self', tags:['a1','saudacao'], deckId:5, reps:3, due:'2026-01-01'},
      {id:'t1', origin:'teacher', tags:['saudacao'], deckId:6},
      {id:'u1', origin:'study'}];
    STATE.studySettings = {reviewTagFilter:['a1','saudacao'], reviewOriginFilter:'all'};
    window.__saved = [];
    updateStudySetting = (patch) => { Object.assign(STATE.studySettings, patch); window.__saved.push(patch); };
    applyTagChangeToLocalState('own','rename','saudacao','cumprimentos');`, c);
  check(label + ' local rename: cards self atualizados', J(c, `STATE.cards[0].tags`).join() === 'a1,cumprimentos');
  check(label + ' local rename: Teacher Card NÃO é tocado (outra propriedade)', J(c, `STATE.cards[1].tags`).join() === 'saudacao');
  check(label + ' local rename: card de trilha (sem tags) intacto', J(c, `STATE.cards[2].tags === undefined`));
  check(label + ' local rename: FSRS/deck do card intactos', J(c, `STATE.cards[0].reps === 3 && STATE.cards[0].deckId === 5 && STATE.cards[0].due === '2026-01-01'`));
  check(label + ' local rename: reviewTagFilter atualizado e persistido', J(c, `STATE.studySettings.reviewTagFilter`).join() === 'a1,cumprimentos' && J(c, `window.__saved.length`) === 1);
  check(label + ' local rename: outros filtros intactos', J(c, `STATE.studySettings.reviewOriginFilter`) === 'all');
  vm.runInContext(`applyTagChangeToLocalState('own','delete','a1',null);`, c);
  check(label + ' local delete: tag removida do card e do filtro', J(c, `STATE.cards[0].tags`).join() === 'cumprimentos' && J(c, `STATE.studySettings.reviewTagFilter`).join() === 'cumprimentos');
  vm.runInContext(`window.__saved.length = 0; applyTagChangeToLocalState('own','delete','naoexiste',null);`, c);
  check(label + ' local delete: Tag fora do filtro não dispara persistência', J(c, `window.__saved.length`) === 0);
  vm.runInContext(`applyTagChangeToLocalState('teacher','rename','cumprimentos','x');`, c);
  check(label + ' local: scope teacher não altera cards/filtro da conta', J(c, `STATE.cards[0].tags`).join() === 'cumprimentos' && J(c, `STATE.studySettings.reviewTagFilter`).join() === 'cumprimentos');

  // ----- wrappers de RPC -----
  vm.runInContext(`
    window.__calls = [];
    supabaseClient = { rpc: async (name, args) => { window.__calls.push({name, args});
      if (args.p_scope === 'bad') return { data: null, error: { message: 'invalid_scope' } };
      if (name === 'list_note_tags') return { data: [{tag:'a1', notes:'3'}], error: null };
      if (name === 'rename_note_tag') return { data: {affected: 5, merged: 2, unchanged: false}, error: null };
      return { data: {affected: 4}, error: null }; } };`, c);
  vm.runInContext(`(async () => { window.__l = await fetchNoteTags('own'); window.__r = await renameNoteTag('own','a','b'); window.__d = await deleteNoteTag('own','a'); window.__e = await renameNoteTag('bad','a','b'); })()`, c);
}
setTimeout(() => {
  for (const [label, c] of [['fr', fr], ['zh', zh]]){
    check(label + ' rpc: list devolve notas numéricas', J(c, `window.__l`).tags[0].notes === 3);
    check(label + ' rpc: rename mapeia affected/merged', J(c, `window.__r`).affected === 5 && J(c, `window.__r`).merged === 2);
    check(label + ' rpc: delete mapeia affected', J(c, `window.__d`).affected === 4);
    check(label + ' rpc: erro vira mensagem amigável', J(c, `window.__e`).ok === false && /inválido/.test(J(c, `window.__e`).error));
    check(label + ' rpc: params corretos (p_scope/p_old/p_new)', JSON.stringify(J(c, `window.__calls[1].args`)) === '{"p_scope":"own","p_old":"a","p_new":"b"}');
  }

  // ----- garantias estáticas do arquivo de produção -----
  const src = read('shared/tag-manager.js').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  check('estático: não lê/escreve linhas (sem .from(/.insert(/.update(/.delete()', !/\.from\(|\.insert\(|\.update\(|\.delete\(/.test(src));
  check('estático: só as 3 RPCs de tags', (src.match(/\.rpc\('([a-z_]+)'/g) || []).sort().join() === ".rpc('delete_note_tag',.rpc('list_note_tags',.rpc('rename_note_tag'".replace(/,\./g, ',.'));
  check('estático: nunca menciona revision/fsrs/deck_id/fields', !/revision|fsrs|deck_id|\bfields\b/i.test(src));
  check('estático: nenhuma normalização própria (usa normalizeNoteTags/validateNoteTags)', /normalizeNoteTags\(/.test(src) && !/normalize\('NFD'\)/.test(src));
  const mig = read('shared/supabase_migrations/057_note_tag_management_rpcs.sql');
  const migCode = mig.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  check('migration: RPCs SECURITY INVOKER, sem DEFINER', !/security definer/i.test(migCode) && (migCode.match(/security invoker/gi) || []).length === 3);
  check('migration: só UPDATE de tags (sem revision/deck_id/fields/status no SET)', !/set\s+(?:[^;]*?)(revision|deck_id|fields|status)\s*=/i.test(migCode.replace(/update\s+\w+\s+\w*\s*set\s+tags\s*=/gi, 'update t set tags =').replace(/set tags = [\s\S]*?where/gi, 'where')));
  check('migration: sem LIKE/replace textual', !/\blike\b|replace\(/i.test(migCode));
  check('migration: sem tabela/coluna nova', !/create table|add column/i.test(migCode));
  check('migration: anon revogado', /revoke all on function public\.rename_note_tag\(text, text, text\) from public, anon/.test(migCode));
  summary('Fase J unit');
}, 300);
