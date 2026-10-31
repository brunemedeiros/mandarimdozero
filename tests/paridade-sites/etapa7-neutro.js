// Etapa 7 (2026-10-31, vocabulário aprovado pela dona; docs/i18n/etapa7-vocabulario-auditoria.md seção 9): textos que
// mudaram DE PROPÓSITO. Os testes "antes x depois" desta pasta aplicam esta troca ao lado de ANTES (a árvore antiga), para a
// comparação continuar provando que o resto não mudou. Funciona no HTML cru e no HTML dentro de JSON.stringify (aspas escapadas).
const q = '\\\\*"'; // aspas com ou sem barras de escape
const plural = (n, um, varios) => (Number(n) === 1 ? um : varios);
function etapa7(v){
  return String(v)
    // a fase final dentro da unidade (lição "checkpoint" da unidade) virou "Revisão da Unidade" / "Unit review"
    .replace(new RegExp('(ub-lesson-title' + q + '>)Ponto de verificação<', 'g'), '$1Revisão da Unidade<')
    .replace(new RegExp('(ub-lesson-title' + q + '>)Checkpoint<', 'g'), '$1Unit review<')
    .replace(/🧩(<\/span>)? Ponto de verificação/g, (m, s) => '🧩' + (s || '') + ' Revisão da Unidade')
    .replace(/🧩(<\/span>)? Checkpoint/g, (m, s) => '🧩' + (s || '') + ' Unit review')
    .split('Ponto de verificação concluído!').join('Revisão da Unidade concluída!')
    .split('Checkpoint completed!').join('Unit review completed!')
    .split('Palavras para rever do Ponto de verificação').join('Palavras para rever da Revisão da Unidade')
    .split('Words to review from the Checkpoint').join('Words to review from the Unit review')
    .split('Checkpoint desbloqueado').join('História desbloqueada')
    .split('Checkpoint unlocked').join('Story unlocked')
    // Ponto de verificação do módulo: nome inteiro no Mapa
    .replace(new RegExp('(tm-label' + q + '>)Ponto<', 'g'), '$1Ponto de verificação<')
    .split('Refazer o ponto').join('Refazer o Ponto de verificação')
    // metas das conquistas: "Ponto(s) de verificação" / "Checkpoint(s)" com maiúscula
    .replace(/(Tire 100% em (?:um|\d+|todos os)) (pontos?) de verificação/g, (m, a, p) => a + ' ' + p[0].toUpperCase() + p.slice(1) + ' de verificação')
    .replace(/(Score 100% on (?:a|\d+|every)) checkpoint/g, '$1 Checkpoint')
    .split('Retake the checkpoint').join('Retake the Checkpoint')
    // Mapa: painel da unidade e o ✕
    .replace(/🔁 (\d+) para revisar/g, (m, n) => '🔁 ' + n + plural(n, ' cartão para revisar hoje', ' cartões para revisar hoje'))
    .replace(/🔁 (\d+) to review/g, (m, n) => '🔁 ' + n + plural(n, ' card to review today', ' cards to review today'))
    .split('Fechar painel').join('Fechar')
    .split('Close panel').join('Close')
    // grátis (só no site em português) e Missões do dia
    .replace(new RegExp('(tier-free' + q + '>)Free<', 'g'), '$1Grátis<')
    .replace(/(\d+) ditado Free/g, (m, n) => n + plural(n, ' ditado grátis', ' ditados grátis'))
    // nome do modo na aba Revisão: "Speed Review" virou "Revisão rápida" (pt) / "Quick review" (en); vira um marcador só
    .replace(new RegExp('(class=' + q + 'name' + q + '>)(?:Speed Review|Revisão rápida|Quick review)<', 'g'), '$1MODO_RAPIDO<')
    .split('Revisão Rápida').join('Revisão rápida')
    // Perfil > Progresso (opção A da dona): sem o contador "Para estudar hoje"; "Para revisar" -> "Já aprendidos", "Devidos" -> "Para hoje"
    .replace(new RegExp('<div class=' + q + 'stat-card' + q + ' data-stat=' + q + 'today' + q + '[^>]*><div class=' + q + 'num' + q + '>[^<]*</div><div class=' + q + 'label' + q + '>[^<]*</div></div>(\\\\n|\\n)?\\s*', 'g'), '')
    .replace(new RegExp('(data-stat=' + q + 'review' + q + '><div class=' + q + 'num' + q + '>[^<]*</div><div class=' + q + 'label' + q + '>)(?:Para revisar|To review)<', 'g'), (m, a) => a + (/To review/.test(m) ? 'Learned<' : 'Já aprendidos<'))
    .replace(new RegExp('(data-stat=' + q + 'due' + q + '><div class=' + q + 'num' + q + '>[^<]*</div><div class=' + q + 'label' + q + '>)(?:Devidos|Due)<', 'g'), (m, a) => a + (/Devidos/.test(m) ? 'Para hoje<' : 'Due today<'))
    // cartão (pt) / card (en) no lugar de flashcard
    .split('Crie seus próprios flashcards').join('Crie seus próprios cartões')
    .split('Create your own flashcards').join('Create your own cards')
    .split('progress, flashcards, achievements').join('progress, cards, achievements')
    .split('your flashcards, the records your teacher keeps about you (lessons and flashcards)').join('your cards, the records your teacher keeps about you (lessons and cards)')
    .split('path flashcards').join('path cards')
    .split('flashcards and your own, with their memory').join('cards and your own, with their memory')
    // Revisão rápida (en Quick review) e a retomada de 5 minutos
    .split('Used review, speed review and').join('Used review, quick review and')
    .split('Shall we do a quick review?').join('Shall we do a short review?')
    .split('Fazer uma revisão rápida').join('Fazer uma revisão de 5 minutos')
    .split('Do a quick review').join('Do a 5-minute review')
    .replace(/Revise (\d+) cartas? em atraso/g, (m, n) => 'Revise ' + n + plural(n, ' cartão atrasado', ' cartões atrasados'));
}
module.exports = { etapa7 };
