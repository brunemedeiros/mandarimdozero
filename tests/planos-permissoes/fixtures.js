// Etapa 5: respostas de my_permissions() iguais às do banco depois da 116 (tabela Admin > Planos de 2026-10-22),
// para os testes de navegador simularem cada tipo de conta sem Supabase. Soma dos papéis como no servidor
// (_has_permission / _permission_limit da 075): booleano = algum papel liga; limite = o maior (null = sem limite).
const TABLE = {
  //                        user (Grátis)           student (Aluno)          premium_basic            premium_pro              teacher
  own_cards_limit:        { user: [true, 20],      student: [true, null],   premium_basic: [true, null], premium_pro: [true, null], teacher: [true, null] },
  rich_card_formats:      { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [true] },
  tts_monthly_quota:      { user: [false],         student: [true, 300],    premium_basic: [true, 300], premium_pro: [true, 300], teacher: [true, 300] },
  public_deck_import:     { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [true] },
  public_deck_copy_count: { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [true] },
  challenges_premium:     { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [true] },
  conj_games:             { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [true] },
  trail_skip_locked:      { user: [false],         student: [true],         premium_basic: [true],   premium_pro: [true],     teacher: [false] },
  class_logs_view:        { user: [false],         student: [true],         premium_basic: [false],  premium_pro: [false],    teacher: [false] },
  support_materials_view: { user: [false],         student: [true],         premium_basic: [false],  premium_pro: [false],    teacher: [false] },
  teacher_panel:          { user: [false],         student: [false],        premium_basic: [false],  premium_pro: [false],    teacher: [true] },
  teacher_student_analytics: { user: [false],      student: [false],        premium_basic: [false],  premium_pro: [false],    teacher: [true] },
  teacher_board:          { user: [false],         student: [false],        premium_basic: [false],  premium_pro: [false],    teacher: [true] },
  review_bank:            { user: [false],         student: [false],        premium_basic: [false],  premium_pro: [false],    teacher: [true] },
};
const LIMIT_KEYS = ['own_cards_limit', 'tts_monthly_quota'];

function sumFor(roles){
  const out = {};
  for (const [key, row] of Object.entries(TABLE)){
    const on = roles.filter(r => row[r] && row[r][0]);
    const isLimit = LIMIT_KEYS.includes(key);
    let limit = null;
    if (isLimit){
      if (!on.length) limit = 0;
      else if (on.some(r => row[r][1] == null)) limit = null;
      else limit = Math.max(...on.map(r => row[r][1]));
    }
    out[key] = { enabled: on.length > 0, limit };
  }
  return out;
}

// kind: 'free' | 'student' | 'premium' (Premium Basic) | 'premium_pro' | 'teacher'
function permsFor(kind){
  const roles = { free: ['user'], student: ['user', 'student'], premium: ['user', 'premium_basic'],
    premium_pro: ['user', 'premium_pro'], teacher: ['user', 'teacher'] }[kind] || ['user'];
  return { roles, admin: false, permissions: sumFor(roles), free: sumFor(['user']) };
}

module.exports = { TABLE, permsFor, sumFor };
