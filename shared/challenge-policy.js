// Política de Desafios por escopo de conteúdo -- vale para QUALQUER idioma
// (atual e futuro) e para qualquer nível/módulo/unidade/lição novo.
//
// REGRA (CLAUDE.md, "Regra de Desafios ao criar conteúdo novo"): ao criar um
// nível, módulo, unidade ou lição, ANTES de dar o conteúdo como pronto, passar
// por challengeChecklist(idioma, escopo) e decidir, categoria por categoria:
//   - existe desafio possível para esse conteúdo? (ou "não se aplica", com motivo)
//   - audience 'trail'   -> aberto a todos, dentro da trilha de estudos
//   - audience 'premium' -> só contas Premium (cadeado para Free; vive na
//                           unidade "Desafios do Módulo N" e na aba Desafios)
// Este arquivo só guarda a política e o checklist; não toca no banco nem na UI.
// Hoje só o francês implementa a aba Desafios (tabela `challenges`, campos
// moduleId/unitId/theme dentro de `data`); outros idiomas seguem a mesma regra
// e registram "ainda sem aba" até ela existir.

const CHALLENGE_SCOPES = ['level', 'module', 'unit', 'lesson'];

// audience padrão sugerida por categoria; quem cria pode mudar, mas precisa
// DECIDIR explicitamente (não deixar em branco).
const CHALLENGE_CATEGORIES = {
  dictation:        { label: 'Ditado',                scope: 'module', defaultAudience: 'trail',   note: 'Já aberto a todos (free:true).' },
  listen_translate: { label: 'Ouça e traduza',        scope: 'unit',   defaultAudience: 'premium', note: 'Poucos por unidade (hoje 2), frases só com vocabulário já visto no módulo.' },
  writing_marks:    { label: 'Acentuação / tons',     scope: 'unit',   defaultAudience: 'premium', note: 'fr: só ´ ` ^ ~ ¨ ("ç" NÃO é acento). zh: marcas de tom do pinyin.' },
  expression:       { label: 'Expressões',            scope: 'unit',   defaultAudience: 'premium', note: 'Leve: ~5 por módulo, no fim da unidade.' },
};

// Tetos por módulo (o builder do francês aplica; outros idiomas devem respeitar).
const CHALLENGE_MODULE_CAPS = { listen_translate: 10, writing_marks: 12, expression: 6 };

// Devolve a lista de decisões a tomar para um conteúdo novo.
function challengeChecklist(languageAppKey, scope){
  if (!CHALLENGE_SCOPES.includes(scope)) throw new Error('escopo inválido: ' + scope);
  const rank = CHALLENGE_SCOPES.indexOf(scope);
  return Object.entries(CHALLENGE_CATEGORIES).map(([id, c]) => ({
    category: id,
    label: c.label,
    languageAppKey,
    // categoria de módulo/unidade é avaliada no nível pedido ou acima dele
    applies: CHALLENGE_SCOPES.indexOf(c.scope) >= rank || CHALLENGE_SCOPES.indexOf(c.scope) <= rank,
    suggestedAudience: c.defaultAudience,
    decision: null,   // 'trail' | 'premium' | 'n/a' -- preencher
    reason: c.note,
  }));
}
