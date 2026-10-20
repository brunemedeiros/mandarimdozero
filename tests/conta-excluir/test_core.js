// Excluir a própria conta: lógica da Edge Function delete-my-account com banco falso.
// Rodar: node tests/conta-excluir/test_core.js
const path = require('path');
const { check, summary } = require('../fase-g/harness');
(async () => {
  const { createDeleter, pathFromPublicUrl } = await import(path.join(__dirname, '../../supabase/functions/delete-my-account/core.mjs'));
  const mk = (over) => {
    const calls = [];
    const db = Object.assign({
      getRoleInfo: async () => ({ roles: ['premium_basic'], profileRole: 'user' }),
      countTeacherLinks: async () => 0,
      teachersOf: async () => ['T1'],
      listFiles: async (b, p) => (b === 'flashcard-media' ? [`${p}/a.mp3`] : b === 'mural' ? [`${p}/x.png`] : []),
      reportsOf: async () => [{ id: 'r1', screenshot_url: 'https://x.supabase.co/storage/v1/object/public/report-screenshots/U1/9.png?t=1' }, { id: 'r2', screenshot_url: null }],
      removeFiles: async (b, p) => { calls.push(['remove', b, p]); },
      clearReport: async (id) => { calls.push(['clearReport', id]); },
      deleteMaterialsFor: async () => { calls.push(['materials']); },
      deleteBankStudentsLinkedTo: async () => { calls.push(['bank']); },
      deleteUser: async () => { calls.push(['deleteUser']); },
    }, over || {});
    return { del: createDeleter({ db }), calls };
  };
  const U = { id: 'U1', email: 'Ana@Exemplo.com' };
  let { del, calls } = mk();
  let r = await del({ user: U, body: { confirm_email: 'ana@exemplo.com' } });
  check('aluna comum: apaga a conta (200)', r.status === 200 && r.json.ok === true);
  check('a conta é apagada por último', calls[calls.length - 1][0] === 'deleteUser' && calls.filter(c => c[0] === 'deleteUser').length === 1);
  check('remove avatar, mídia, arquivos do Mural e a captura do report', ['avatars', 'flashcard-media', 'mural', 'report-screenshots'].every(b => calls.some(c => c[0] === 'remove' && c[1] === b)));
  check('captura do report sai pelo caminho certo', JSON.stringify(calls.find(c => c[0] === 'remove' && c[1] === 'report-screenshots')[2]) === '["U1/9.png"]');
  check('arquivos do Mural são só os dela com aquela professora', JSON.stringify(calls.find(c => c[0] === 'remove' && c[1] === 'mural')[2]) === '["T1/U1/x.png"]');
  check('reports: tira e-mail e captura, não apaga o texto (só limpa os campos)', calls.filter(c => c[0] === 'clearReport').map(c => c[1]).join() === 'r1,r2' && !calls.some(c => c[0] === 'remove' && c[1] === 'reports'));
  check('apaga materiais enviados a ela e a pessoa dela no Banco', calls.some(c => c[0] === 'materials') && calls.some(c => c[0] === 'bank'));

  ({ del, calls } = mk());
  r = await del({ user: U, body: { confirm_email: 'outro@x.com' } });
  check('e-mail de confirmação errado: 400 e nada é apagado', r.status === 400 && r.json.error === 'confirm_mismatch' && !calls.length);
  r = await del({ user: U, body: {} });
  check('sem confirmação: 400', r.status === 400);
  r = await del({ user: null, body: {} });
  check('sem login: 401', r.status === 401);

  for (const [nome, over] of [['conta de professora (papel)', { getRoleInfo: async () => ({ roles: ['teacher'], profileRole: 'user' }) }], ['administradora (perfil)', { getRoleInfo: async () => ({ roles: [], profileRole: 'admin' }) }], ['quem tem alunas vinculadas', { countTeacherLinks: async () => 3 }]]) {
    ({ del, calls } = mk(over));
    r = await del({ user: U, body: { confirm_email: 'ana@exemplo.com' } });
    check(`${nome}: 403 e nada é apagado`, r.status === 403 && r.json.error === 'not_allowed_for_teachers' && !calls.length);
  }

  ({ del, calls } = mk({ removeFiles: async () => { throw new Error('falhou'); } }));
  r = await del({ user: U, body: { confirm_email: 'ana@exemplo.com' } });
  check('falha ao remover arquivos: 500 e a conta NÃO é apagada (dá para tentar de novo)', r.status === 500 && r.json.step === 'files' && !calls.some(c => c[0] === 'deleteUser'));
  ({ del, calls } = mk({ deleteUser: async () => { throw new Error('x'); } }));
  r = await del({ user: U, body: { confirm_email: 'ana@exemplo.com' } });
  check('falha na última etapa: 500 com o passo "account"', r.status === 500 && r.json.step === 'account');

  check('pathFromPublicUrl: url válida, com consulta, vazia e de outro bucket', pathFromPublicUrl('https://h/storage/v1/object/public/report-screenshots/a/b.png?t=1', 'report-screenshots') === 'a/b.png' && pathFromPublicUrl('', 'report-screenshots') === null && pathFromPublicUrl('https://h/avatars/x.jpg', 'report-screenshots') === null);
  summary();
})();
