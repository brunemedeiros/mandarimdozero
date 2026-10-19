// Excluir a própria conta (aluna/usuária). Lógica pura, testada com banco falso (tests/conta-excluir/test_core.js).
// Ordem: valida -> limpa o que a exclusão da conta NÃO apaga sozinha (arquivos, reports, materiais, pessoa no Banco) -> apaga a conta
// (o banco apaga em cascata o resto: progresso, cartões, aulas, respostas). Qualquer falha antes do fim para tudo e é seguro tentar de novo.
// Professora e administradora não excluem por aqui: apagar a conta delas apagaria os dados de todas as alunas.

const BLOCKED_ROLES = ['teacher', 'admin'];

export function pathFromPublicUrl(url, bucket){
  const marker = `/${bucket}/`;
  const s = String(url || '');
  const i = s.indexOf(marker);
  if (i < 0) return null;
  const rest = s.slice(i + marker.length).split('?')[0];
  return rest ? decodeURIComponent(rest) : null;
}

export function createDeleter({ db }){
  return async function deleteAccount({ user, body }){
    if (!user || !user.id) return { status: 401, json: { ok: false, error: 'unauthorized' } };
    const typed = String((body && body.confirm_email) || '').trim().toLowerCase();
    const email = String(user.email || '').trim().toLowerCase();
    if (!email || typed !== email) return { status: 400, json: { ok: false, error: 'confirm_mismatch' } };

    const uid = user.id;
    let step = 'check';
    try {
      const info = await db.getRoleInfo(uid);
      const roles = (info.roles || []).concat(info.profileRole ? [info.profileRole] : []);
      if (roles.some((r) => BLOCKED_ROLES.includes(r)) || (await db.countTeacherLinks(uid)) > 0) {
        return { status: 403, json: { ok: false, error: 'not_allowed_for_teachers' } };
      }

      step = 'files';
      const teachers = await db.teachersOf(uid);
      const jobs = [
        ['avatars', [`${uid}/avatar.jpg`]],
        ['flashcard-media', await db.listFiles('flashcard-media', uid)],
      ];
      for (const t of teachers) jobs.push(['mural', await db.listFiles('mural', `${t}/${uid}`)]);
      const reports = await db.reportsOf(uid);
      const shots = reports.map((r) => pathFromPublicUrl(r.screenshot_url, 'report-screenshots')).filter(Boolean);
      jobs.push(['report-screenshots', shots]);
      for (const [bucket, paths] of jobs) if (paths.length) await db.removeFiles(bucket, paths);

      step = 'reports';
      for (const r of reports) await db.clearReport(r.id);

      step = 'rows';
      await db.deleteMaterialsFor(uid);
      await db.deleteBankStudentsLinkedTo(uid);

      step = 'account';
      await db.deleteUser(uid);
      return { status: 200, json: { ok: true } };
    } catch (e) {
      return { status: 500, json: { ok: false, error: 'step_failed', step } };
    }
  };
}
