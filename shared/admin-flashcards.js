// ---------- Flashcards (admin) -- Fase 2/3 do sistema de alunos particulares ----------
// Autoria de flashcard pela professora, atribuído a um aluno específico.
// Desde a Fase 3, o cartão criado aqui é mesclado em STATE.cards do aluno
// (fr/zh app.js, mergeTeacherFlashcardsIntoState) e passa a ser revisável
// via getStudyQueue()/FSRS -- ver CLAUDE.md.
//
// Fase 8a: 3 novos formatos, todos opcionais e independentes entre si --
// imagem, áudio próprio (upload real, diferente do TTS automático que o
// app já tem pra pronúncia) e múltipla escolha (grillado: o cartão vira
// quiz em QUALQUER modo de revisão quando tem respostas erradas
// cadastradas, não só Speed Review -- render em fr/zh app.js).
//
// Pós-Fase 8a: campo "Aluno" virou multi-seleção (checkboxes) -- pedido da
// autora pra poder atribuir o MESMO cartão a vários alunos de uma vez, sem
// repetir o formulário. Um clique em "Criar cartão" cria uma linha em
// teacher_flashcards POR aluno selecionado (mesmo front/back/note/mídia/
// choices, cada linha com o language_app_key do PRÓPRIO aluno -- uma turma
// pode misturar francês e mandarim na mesma seleção). A lista de cartões
// abaixo do formulário passou a agregar os alunos selecionados (antes era
// só o aluno do <select> único), com o @username prefixado em cada linha
// quando há mais de um selecionado, pra não confundir de quem é o quê.
//
// Fase 8c: quarto formato, "Completar a frase" (grillado: o aluno digita a
// palavra que falta numa frase escrita pela professora). Mutuamente
// exclusivo com "Múltipla escolha" -- os dois mudam a MECÂNICA de revisão
// do cartão, não faz sentido os dois juntos. Desde a reorganização visual
// abaixo, essa exclusividade é o próprio HTML (um <input type="radio">
// grupo "Modo de prática"), não mais 2 checkboxes independentes com JS
// forçando a exclusividade uma na outra.
//
// UX-fix (pós-Fase 8c, mesmo dia): reorganização visual + correção de bug
// de estado, pedida pela autora após revisar a tela real (print + crítica
// detalhada). 2 mudanças de fundo, não só estética:
// 1. **Bug real, não só gosto**: a seleção de alunos nunca podia ficar
//    vazia -- o código caía de volta pra "primeiro aluno" sempre que o Set
//    esvaziava, inclusive logo depois de clicar "Limpar seleção". Corrigido:
//    seleção pode ficar genuinamente vazia, "Criar cartão" fica desabilitado
//    nesse estado (com contador visível acima do form), e a validação de
//    submit continua como cinto-de-segurança extra.
// 2. **Hierarquia visual**: reorganizado em 3 blocos rotulados dentro do
//    mesmo <form> (Destinatários continua fora do form, como já era --
//    seleção dispara re-render, não submit): Destinatários -> Conteúdo
//    (+ "Recursos opcionais") -> Modo de prática (radios).
//
// UX-fix 2/3: "aluna"->"aluno" no texto visível, rótulo "Alunos" unificado,
// busca por @usuário (ver CLAUDE.md).
//
// UX-fix 5 (bug real reportado pela autora, mesmo dia da UX-fix 4): marcar
// um checkbox de aluno ENQUANTO a professora já tinha digitado algo no
// formulário (frente/verso/nota/tópico etc.) APAGAVA o texto digitado --
// causa raiz: toda mudança de seleção chamava renderAdminFlashcardsView()
// de novo, que reconstrói TODO o wrap.innerHTML, inclusive o <form> com o
// texto já digitado dentro. Corrigido reestruturando o render em 3 CAIXAS
// independentes dentro do mesmo wrap (Alunos / Conteúdo+form / Cartões):
// mudar a seleção (checkbox, Selecionar todos, Limpar seleção, filtro de
// idioma) agora só chama updateFlashcardsSelectionDependentUI(), que
// atualiza SÓ o que depende da seleção via DOM direto (contador, subtítulo,
// visibilidade do campo pinyin, texto/disabled do botão, e a lista de
// cartões -- essa sim re-buscada, mas vive numa caixa separada do form) --
// o <form> em si (#admin-create-flashcard-form) nunca é recriado por causa
// de uma mudança de seleção, só no boot da tela ou depois de um submit bem
// sucedido (aí sim o form deve mesmo limpar). Mesmo princípio replicado em
// admin-support-materials.js e admin-class-logs.js (mesmo bug, mesmo fix).
// `ADMIN_FLASHCARDS_STATE._studentsCache` guarda a lista de alunos entre
// re-renders incrementais -- evita um round-trip de rede (fetchMyStudents)
// a cada clique de checkbox, já que a lista de alunos não muda nesse meio
// tempo.
//
// UX-fix 5 também endereça 2 pedidos relacionados da autora: (1) busca
// agora casa por NOME também, não só @usuário (`data-searchtext` combina
// os dois, minúsculo) -- rótulo do checkbox virou "Nome (@usuário)" quando
// há display_name, com fallback pro @usuário sozinho quando não há; (2)
// filtro por idioma (pills reaproveitando .leaderboard-tab/.active, zero
// CSS novo) -- construído dinamicamente a partir dos idiomas REALMENTE
// presentes na lista de alunos da professora (nunca hardcoded fr/pt), então
// funciona sem mudança de código se/quando ela tiver aluno de outro idioma.
// Filtro de idioma e busca combinam (AND) via mesmo mecanismo de
// style.display no DOM (não re-renderiza a lista de checkboxes).
//
// Reestruturação Fase 1 (prompt-mestre "formulário de flashcards do
// admin", ver CLAUDE.md) -- ordem/lógica do formulário mudou de propósito:
// "Modo de prática" (radio) agora vem ANTES de "Conteúdo", porque é o modo
// que decide quais campos de conteúdo fazem sentido, não o contrário.
// "Conteúdo" passou a ter 2 blocos MUTUAMENTE EXCLUSIVOS na tela (nunca os
// dois visíveis juntos):
//   - #admin-flashcard-content-main -- Frente/pinyin/Verso, reaproveitado
//     tanto por "Flashcard normal" quanto por "Múltipla escolha" (só os
//     RÓTULOS trocam entre os 2 modos -- "Frente"/"Verso" vs. "Pergunta/
//     termo"/"Resposta correta"; "Outras opções" -- choices -- aparece só
//     dentro dele, só no modo mc).
//   - #admin-flashcard-content-cloze -- Frase com lacuna/Resposta certa/
//     Tradução, campos PRÓPRIOS (não reaproveita front/back do bloco
//     acima) -- "Frente" nunca existiu pra esse modo em nenhuma tela de
//     revisão (renderClozeReviewCard nunca lê card.front/back_hanzi),
//     então deixou de ser um campo obrigatório em teacher_flashcards
//     (migration 035, "front" agora aceita NULL) -- sem inventar um valor
//     substituto (a autora foi explícita sobre isso). "Tradução" virou
//     campo próprio deste bloco porque back_trans continua obrigatório em
//     TODO modo (é o que renderClozeReviewCard mostra depois de
//     responder) -- só migrou de input, não de exigência.
// "Recursos opcionais" (Nota/Imagem/Áudio) continua mode-independente,
// sempre visível, agora depois de Conteúdo. Consumidores de card.front/
// back_hanzi fora da Revisão (Combinar, Speed Review, exportação Anki --
// nenhum entende "cloze", todos pressupõem par frente/verso) ganharam um
// filtro novo em fr/zh app.js pra excluir cartões cloze SEM front (ver
// hasPlainFrontBack() lá) -- cartões cloze já existentes continuam com
// front preenchido, então continuam aparecendo ali normalmente.
//
// Reestruturação Fase 2 (mesmo prompt-mestre da Fase 1 acima, ver
// CLAUDE.md) -- validação contextual por campo: cada campo obrigatório do
// modo selecionado ganha borda vermelha + mensagem específica embaixo
// dele (`.field-invalid`/`.profile-edit-field-error`, mesmo par border-
// color/background já usado em `.gram-exercise.wrong input`/`.mc-option.
// incorrect`, zero cor nova) em vez de só uma frase genérica no rodapé.
// Valida em tempo real no blur de cada campo (wireFlashcardFieldValidation)
// e de forma completa/definitiva no submit (validateFlashcardForm, roda
// ANTES do upload de mídia -- não sobe arquivo à toa se o resto do
// formulário ainda está inválido). Só valida campos que pertencem ao modo
// ATUAL -- nunca marca "Frente" como inválida no modo cloze, por exemplo,
// já que esse campo nem existe pra esse modo. createFlashcard() continua
// validando de novo do lado do dado (fonte de verdade); isto é só a
// camada de UX na frente.
//
// Reestruturação Fase 3 (mesmo prompt-mestre das Fases 1/2 acima, ver
// CLAUDE.md) -- redesenho visual do bloco "Alunos" (Destinatários): o
// contador de seleção (`#admin-flashcard-selection-counter`) virou um
// `.pill` (mesma classe já usada pro streak/XP da topbar e pelo selo de
// "Aluno vinculado" em my-flashcards.js -- zero CSS novo pro chip em si)
// posicionado no TOPO do bloco, ao lado de "Selecionar todos"/"Limpar
// seleção" -- antes ficava como texto solto embaixo da lista rolável de
// checkboxes, exigindo rolar até o fim pra ver quantos alunos estavam
// marcados. `admin-flashcard-select-all`/`-select-none` ganharam a classe
// `.admin-select-link` (nova, fr+zh index.html) -- reaproveita
// `--seal-red-dark`, o mesmo token já usado por `.side-card-link` ("Ver
// ranking completo"), corrigindo de passagem o contraste baixo desses 2
// links no tema escuro (antes sem cor própria, herdavam o azul padrão do
// navegador -- pendência já registrada na UX-fix 4/5). Só
// `shared/admin-flashcards.js` foi tocado -- `admin-support-materials.js`/
// `admin-class-logs.js` têm o MESMO markup de link sem cor própria, mas
// não foram redesenhados nesta fase (mesmo escopo restrito já usado
// desde a Fase 1: só a tela de flashcards é o alvo deste prompt-mestre).
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-flashcards.js (fetchFlashcardsForStudent, createFlashcard, setFlashcardStatus, uploadFlashcardMedia)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_FLASHCARDS_STATE = { studentIds: new Set(), langFilter: 'all', _studentsCache: [] };

function flashcardStudentLabel(s){
  return s.display_name
    ? `${escapeHTML(s.display_name)} (@${escapeHTML(s.username || '?')})`
    : `@${escapeHTML(s.username || '(usuário removido)')}`;
}

// Badges curtos indicando os formatos extras do cartão, só quando
// presentes (cartão comum não ganha nenhum badge novo).
function flashcardFormatBadgesHTML(c){
  return [
    c.image_url ? '🖼️ imagem' : '',
    c.audio_url ? '🎧 áudio' : '',
    (c.choices && c.choices.length) ? '🔤 múltipla escolha' : '',
    c.cloze_sentence ? '📝 completar frase' : '',
  ].filter(Boolean).join(' · ');
}

// Fase 1 da reestruturação (ver CLAUDE.md) -- `front` deixou de ser
// obrigatório no modo cloze (migration 035): um cartão "Completar a
// frase" criado depois dessa mudança não tem `c.front`. Resumo cai pra
// mostrar a frase-lacuna resolvida (com a resposta entre colchetes) em
// vez de um "" → tradução vazio. Cartões cloze já existentes continuam
// com `front` preenchido como sempre -- esse ramo nunca entra pra eles,
// zero mudança visual.
function flashcardFrontSummaryHTML(c){
  if (c.front) return `${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''}`;
  if (c.cloze_sentence) return escapeHTML(c.cloze_sentence.replace('___', `[${c.cloze_answer || '...'}]`));
  return '';
}

function flashcardCardRowHTML(c, showUsername){
  return `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(c.__studentUsername || '?')}</span> · ` : ''}${flashcardFrontSummaryHTML(c)} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}${flashcardFormatBadgesHTML(c) ? ' · ' + flashcardFormatBadgesHTML(c) : ''}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
    </div>
  `;
}

// Busca + monta o HTML da caixa "Cartões" pra um conjunto de alunos
// selecionados -- vive numa função própria porque é chamada tanto no
// render completo quanto (re-fetch isolado) a cada mudança de seleção,
// SEM tocar no <form> ao lado (ver comentário no topo do arquivo).
async function buildFlashcardsCardsBoxHTML(selectedStudents){
  const cardLists = await Promise.all(selectedStudents.map(s => fetchFlashcardsForStudent(s.student_id)));
  const cards = cardLists.flatMap((list, i) => list.map(c => ({ ...c, __studentUsername: selectedStudents[i].username })));
  cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');
  const showUsername = selectedStudents.length > 1;

  return `
    <div class="profile-section">
      <div class="section-label">Cartões ativos (${activeCards.length})</div>
      ${activeCards.length ? activeCards.map(c => flashcardCardRowHTML(c, showUsername)).join('') : `<p class="profile-empty-note">Nenhum cartão ainda pra${selectedStudents.length > 1 ? ' esses alunos' : selectedStudents.length === 1 ? ' este aluno' : ' nenhum aluno selecionado'}.</p>`}
    </div>
    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados (${archivedCards.length})</div>
      ${archivedCards.map(c => flashcardCardRowHTML(c, showUsername)).join('')}
    </div>` : ''}
  `;
}

function wireFlashcardsCardsBox(cardsBox){
  cardsBox.querySelectorAll('[data-toggle-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setFlashcardStatus(btn.dataset.toggleFlashcard, btn.dataset.nextStatus);
      const selectedStudents = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
    });
  });
}

// Atualiza tudo que depende da seleção de alunos SEM recriar o <form> --
// chamada por: mudar um checkbox, "Selecionar todos", "Limpar seleção",
// e o filtro de idioma. Nunca toca em #admin-create-flashcard-form.
async function updateFlashcardsSelectionDependentUI(wrap){
  // Fase 2 da reestruturação (ver CLAUDE.md) -- trocar a seleção de
  // alunos pode mudar se pinyin (mandarim) é exigido no modo cloze;
  // limpa erros de campo já marcados pra não deixar um aviso "obrigatório
  // pra aluno de mandarim" preso na tela depois que ela desmarcou o único
  // aluno de mandarim da seleção.
  clearAllFlashcardFieldErrors();
  const students = ADMIN_FLASHCARDS_STATE._studentsCache;
  const selectedStudents = students.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
  const anyMandarim = selectedStudents.some(s => s.language_app_key === 'mandarim');
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhum aluno selecionado'
    : selectedStudents.length === 1
      ? '1 aluno selecionado'
      : `${selectedStudents.length} alunos selecionados`;

  const counterEl = document.getElementById('admin-flashcard-selection-counter');
  if (counterEl) counterEl.textContent = selectionCountLabel;

  const subtitleEl = document.getElementById('admin-flashcard-content-subtitle');
  if (subtitleEl) subtitleEl.textContent = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1 ? ` -- ${selectedStudents.length} alunos selecionados` : '';

  const contentHint = document.getElementById('admin-flashcard-content-hint');
  if (contentHint) contentHint.style.display = selectedStudents.length ? 'none' : '';

  const modeChecked = wrap.querySelector('input[name="admin-flashcard-mode"]:checked')?.value;

  const frontInput = document.getElementById('admin-flashcard-front');
  if (frontInput) frontInput.placeholder = anyMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque';

  const pinyinWrap = document.getElementById('admin-flashcard-pinyin-wrap');
  if (pinyinWrap) pinyinWrap.style.display = anyMandarim ? '' : 'none';

  const clozeSentenceInput = document.getElementById('admin-flashcard-cloze-sentence');
  if (clozeSentenceInput) clozeSentenceInput.placeholder = anyMandarim ? 'ex: 我 ___ 巴西人。' : 'ex: Je ___ de Paris.';
  const clozeAnswerInput = document.getElementById('admin-flashcard-cloze-answer');
  if (clozeAnswerInput) clozeAnswerInput.placeholder = anyMandarim ? 'ex: 是' : 'ex: viens';
  const clozePinyinWrap = document.getElementById('admin-flashcard-cloze-pinyin-wrap');
  if (clozePinyinWrap){
    clozePinyinWrap.style.display = (modeChecked === 'cloze' && anyMandarim) ? '' : 'none';
  }

  const btn = document.getElementById('admin-create-flashcard-btn');
  if (btn){
    btn.disabled = !selectedStudents.length;
    btn.textContent = `Criar cartão${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}`;
  }

  const cardsBox = document.getElementById('admin-flashcards-cards-box');
  if (cardsBox){
    cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
    wireFlashcardsCardsBox(cardsBox);
  }

  return selectedStudents;
}

// Busca (texto) + filtro de idioma combinados (AND) -- os dois são filtros
// puros de DOM (style.display) sobre a lista de checkboxes já renderizada,
// nunca re-renderizam nada (nem a lista de alunos, nem o form).
function applyFlashcardPickerFilters(wrap){
  const q = (document.getElementById('admin-flashcard-search')?.value || '').trim().toLowerCase();
  const lang = ADMIN_FLASHCARDS_STATE.langFilter;
  wrap.querySelectorAll('[data-student-row]').forEach(row => {
    const matchesText = !q || row.dataset.searchtext.includes(q);
    const matchesLang = lang === 'all' || row.dataset.lang === lang;
    row.style.display = (matchesText && matchesLang) ? '' : 'none';
  });
}

// Fase 2 da reestruturação do formulário de flashcards (ver CLAUDE.md) --
// validação contextual por campo: borda vermelha + mensagem específica
// embaixo do campo (mesmo par border-color/background já usado em
// .gram-exercise.wrong input/.mc-option.incorrect, zero cor nova), em vez
// de só uma frase genérica no rodapé do formulário. createFlashcard()
// continua sendo a fonte de verdade da validação (client-side é só a
// camada de UX na frente, mesmo nível de confiança de outros gates de UI
// já existentes no app -- ver Fase 5.1 no CLAUDE.md).
function markFlashcardFieldInvalid(inputId, errorId, message){
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (input) input.classList.add('field-invalid');
  if (errEl) errEl.textContent = message;
}

function clearFlashcardFieldInvalid(inputId, errorId){
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (input) input.classList.remove('field-invalid');
  if (errEl) errEl.textContent = '';
}

const FLASHCARD_FIELD_IDS = [
  ['admin-flashcard-front', 'admin-flashcard-front-error'],
  ['admin-flashcard-back', 'admin-flashcard-back-error'],
  ['admin-flashcard-mc-1', 'admin-flashcard-mc-error'],
  ['admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error'],
  ['admin-flashcard-cloze-answer', 'admin-flashcard-cloze-answer-error'],
  ['admin-flashcard-cloze-pinyin', 'admin-flashcard-cloze-pinyin-error'],
  ['admin-flashcard-cloze-trans', 'admin-flashcard-cloze-trans-error'],
];

function clearAllFlashcardFieldErrors(){
  FLASHCARD_FIELD_IDS.forEach(([inputId, errorId]) => clearFlashcardFieldInvalid(inputId, errorId));
}

// Valida só os campos que pertencem ao MODO atualmente selecionado --
// campos escondidos (ex: Frente no modo cloze) nunca são marcados
// inválidos, mesmo que vazios, porque não fazem parte do cartão que será
// criado nesse modo. Devolve `true`/`false`; ao devolver `false`, já
// marcou cada campo problemático e focou o primeiro.
function validateFlashcardForm(wrap){
  const mode = wrap.querySelector('input[name="admin-flashcard-mode"]:checked').value;
  const isMC = mode === 'mc';
  const isCloze = mode === 'cloze';
  const anyMandarimNow = ADMIN_FLASHCARDS_STATE._studentsCache.some(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) && s.language_app_key === 'mandarim');
  clearAllFlashcardFieldErrors();
  let ok = true;
  let firstInvalid = null;
  function fail(inputId, errorId, message){
    markFlashcardFieldInvalid(inputId, errorId, message);
    if (!firstInvalid) firstInvalid = document.getElementById(inputId);
    ok = false;
  }

  if (!isCloze){
    if (!document.getElementById('admin-flashcard-front').value.trim()){
      fail('admin-flashcard-front', 'admin-flashcard-front-error', 'Obrigatório.');
    }
    if (!document.getElementById('admin-flashcard-back').value.trim()){
      fail('admin-flashcard-back', 'admin-flashcard-back-error', 'Obrigatório.');
    }
    if (isMC){
      const anyChoiceFilled = ['admin-flashcard-mc-1', 'admin-flashcard-mc-2', 'admin-flashcard-mc-3']
        .some(id => document.getElementById(id).value.trim());
      if (!anyChoiceFilled){
        fail('admin-flashcard-mc-1', 'admin-flashcard-mc-error', 'Digite pelo menos 1 opção errada.');
      }
    }
  } else {
    const sentence = document.getElementById('admin-flashcard-cloze-sentence').value.trim();
    const blankCount = (sentence.match(/___/g) || []).length;
    if (!sentence){
      fail('admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error', 'Obrigatório.');
    } else if (blankCount !== 1){
      fail('admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error', 'Precisa ter exatamente um espaço marcado com ___.');
    }
    if (!document.getElementById('admin-flashcard-cloze-answer').value.trim()){
      fail('admin-flashcard-cloze-answer', 'admin-flashcard-cloze-answer-error', 'Obrigatório.');
    }
    if (anyMandarimNow && !document.getElementById('admin-flashcard-cloze-pinyin').value.trim()){
      fail('admin-flashcard-cloze-pinyin', 'admin-flashcard-cloze-pinyin-error', 'Obrigatório pra aluno(s) de mandarim.');
    }
    if (!document.getElementById('admin-flashcard-cloze-trans').value.trim()){
      fail('admin-flashcard-cloze-trans', 'admin-flashcard-cloze-trans-error', 'Obrigatório.');
    }
  }

  if (firstInvalid) firstInvalid.focus();
  return ok;
}

// Validação em tempo real: cada campo obrigatório valida no blur (assim
// que a professora sai dele, não só quando ela clica "Criar cartão") e
// limpa o próprio erro assim que ela volta a digitar -- feedback
// imediato nos dois sentidos, sem esperar o submit pra descobrir o que
// falta. `validateFlashcardForm()` continua sendo a checagem completa e
// definitiva rodada no submit (cobre também campos que a professora
// nunca chegou a tocar).
function wireFlashcardFieldValidation(wrap){
  const currentMode = () => wrap.querySelector('input[name="admin-flashcard-mode"]:checked').value;
  const anyMandarimNow = () => ADMIN_FLASHCARDS_STATE._studentsCache.some(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) && s.language_app_key === 'mandarim');

  function onBlurRequired(inputId, errorId, relevantModes){
    const input = document.getElementById(inputId);
    input.addEventListener('blur', () => {
      if (!relevantModes.includes(currentMode())) return;
      if (!input.value.trim()) markFlashcardFieldInvalid(inputId, errorId, 'Obrigatório.');
    });
    input.addEventListener('input', () => clearFlashcardFieldInvalid(inputId, errorId));
  }

  onBlurRequired('admin-flashcard-front', 'admin-flashcard-front-error', ['flip', 'mc']);
  onBlurRequired('admin-flashcard-back', 'admin-flashcard-back-error', ['flip', 'mc']);
  onBlurRequired('admin-flashcard-cloze-answer', 'admin-flashcard-cloze-answer-error', ['cloze']);
  onBlurRequired('admin-flashcard-cloze-trans', 'admin-flashcard-cloze-trans-error', ['cloze']);

  ['admin-flashcard-mc-1', 'admin-flashcard-mc-2', 'admin-flashcard-mc-3'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => {
      if (currentMode() !== 'mc') return;
      const anyFilled = ['admin-flashcard-mc-1', 'admin-flashcard-mc-2', 'admin-flashcard-mc-3']
        .some(i => document.getElementById(i).value.trim());
      if (!anyFilled) markFlashcardFieldInvalid('admin-flashcard-mc-1', 'admin-flashcard-mc-error', 'Digite pelo menos 1 opção errada.');
    });
    input.addEventListener('input', () => clearFlashcardFieldInvalid('admin-flashcard-mc-1', 'admin-flashcard-mc-error'));
  });

  const clozeSentence = document.getElementById('admin-flashcard-cloze-sentence');
  clozeSentence.addEventListener('blur', () => {
    if (currentMode() !== 'cloze') return;
    const v = clozeSentence.value.trim();
    if (!v) markFlashcardFieldInvalid('admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error', 'Obrigatório.');
    else if ((v.match(/___/g) || []).length !== 1) markFlashcardFieldInvalid('admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error', 'Precisa ter exatamente um espaço marcado com ___.');
  });
  clozeSentence.addEventListener('input', () => clearFlashcardFieldInvalid('admin-flashcard-cloze-sentence', 'admin-flashcard-cloze-sentence-error'));

  const clozePinyin = document.getElementById('admin-flashcard-cloze-pinyin');
  clozePinyin.addEventListener('blur', () => {
    if (currentMode() !== 'cloze' || !anyMandarimNow()) return;
    if (!clozePinyin.value.trim()) markFlashcardFieldInvalid('admin-flashcard-cloze-pinyin', 'admin-flashcard-cloze-pinyin-error', 'Obrigatório pra aluno(s) de mandarim.');
  });
  clozePinyin.addEventListener('input', () => clearFlashcardFieldInvalid('admin-flashcard-cloze-pinyin', 'admin-flashcard-cloze-pinyin-error'));
}

async function renderAdminFlashcardsView(){
  const wrap = document.getElementById('admin-flashcards-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const students = await fetchMyStudents();
  if (!students.length){
    wrap.innerHTML = `<p class="profile-empty-note">Vincule um aluno primeiro, na aba "🎓 Alunos", pra poder criar flashcards pra ele.</p>`;
    return;
  }
  ADMIN_FLASHCARDS_STATE._studentsCache = students;

  // Descarta seleções de alunos que não existem mais (vínculo removido
  // entre um render e outro) -- SEM cair de volta pra "primeiro aluno"
  // quando o resultado fica vazio (seleção vazia é um estado válido).
  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_FLASHCARDS_STATE.studentIds = new Set([...ADMIN_FLASHCARDS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
  const anyMandarim = selectedStudents.some(s => s.language_app_key === 'mandarim');
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhum aluno selecionado'
    : selectedStudents.length === 1
      ? '1 aluno selecionado'
      : `${selectedStudents.length} alunos selecionados`;

  // Filtro de idioma: pills construídas a partir dos idiomas REALMENTE
  // presentes nos alunos desta professora (nunca hardcoded fr/pt/mandarim)
  // -- reaproveita .leaderboard-tab/.active (mesma classe já usada nas
  // sub-abas do Painel de Admin), zero CSS novo. Só aparece quando há mais
  // de 1 idioma na lista (ruído puro com só 1).
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  const langFilterHTML = langsPresent.length > 1 ? `
    <div class="leaderboard-tabs" role="tablist" aria-label="Filtrar por idioma" style="justify-content:flex-start; margin-bottom:8px;">
      <button type="button" class="leaderboard-tab ${ADMIN_FLASHCARDS_STATE.langFilter === 'all' ? 'active' : ''}" data-lang-filter="all">Todos (${students.length})</button>
      ${langsPresent.map(key => `<button type="button" class="leaderboard-tab ${ADMIN_FLASHCARDS_STATE.langFilter === key ? 'active' : ''}" data-lang-filter="${key}">${STUDENT_LANGUAGE_LABELS[key] || key} (${students.filter(s => s.language_app_key === key).length})</button>`).join('')}
    </div>
  ` : '';

  // Busca casa por nome E @usuário (data-searchtext combina os dois) --
  // filtro só de DOM (data-student-row/data-searchtext, wired abaixo),
  // nunca dispara renderAdminFlashcardsView() de novo.
  const studentCheckboxesHTML = students.map(s => `
    <label data-student-row data-lang="${s.language_app_key}" data-searchtext="${escapeHTML(`${s.display_name || ''} ${s.username || ''}`.toLowerCase())}" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0; width:100%; box-sizing:border-box;">
      <input type="checkbox" data-student-checkbox value="${s.student_id}" ${ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      ${flashcardStudentLabel(s)} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const newCardSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${selectedStudents.length} alunos selecionados`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Alunos</div>
      <p class="profile-edit-hint">Selecione os alunos que vão receber este cartão.</p>
      <div class="admin-recipients-summary">
        <span class="pill" id="admin-flashcard-selection-counter">${selectionCountLabel}</span>
        <div class="admin-recipients-actions">
          <a href="#" id="admin-flashcard-select-all" class="admin-select-link">Selecionar todos</a>
          <a href="#" id="admin-flashcard-select-none" class="admin-select-link">Limpar seleção</a>
        </div>
      </div>
      ${langFilterHTML}
      <input type="text" id="admin-flashcard-search" class="profile-edit-input" placeholder="Buscar por nome ou @usuário..." autocomplete="off" style="margin-bottom:8px;">
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:flex; flex-direction:column;">
        ${studentCheckboxesHTML}
      </div>
    </div>

    <div class="profile-section">
      <div class="section-label">Cartão<span id="admin-flashcard-content-subtitle">${newCardSubtitle}</span></div>
      <p class="profile-edit-hint" id="admin-flashcard-content-hint" style="${selectedStudents.length ? 'display:none;' : ''}">Selecione ao menos um aluno acima pra poder criar o cartão.</p>
      <form id="admin-create-flashcard-form" class="profile-edit-form">
        <div class="section-label" style="margin:0 0 6px;">Modo de prática</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Como o aluno vai responder este cartão -- decide os campos abaixo.</p>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="admin-flashcard-mode" value="flip" checked>
          Flashcard normal -- vira o cartão pra ver a resposta
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="admin-flashcard-mode" value="mc">
          Múltipla escolha -- escolhe entre opções
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="admin-flashcard-mode" value="cloze">
          Completar a frase -- digita a palavra que falta
        </label>

        <div class="section-label" style="margin:18px 0 6px;">Conteúdo</div>
        <div id="admin-flashcard-content-main">
          <label class="profile-edit-label" id="admin-flashcard-front-label" for="admin-flashcard-front">Frente (no idioma estudado)</label>
          <input type="text" id="admin-flashcard-front" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}" autocomplete="off">
          <p class="profile-edit-field-error" id="admin-flashcard-front-error"></p>
          <div id="admin-flashcard-pinyin-wrap" style="${anyMandarim ? '' : 'display:none;'}">
            <label class="profile-edit-label" for="admin-flashcard-pinyin">Pinyin (usado só nos alunos de mandarim selecionados)</label>
            <input type="text" id="admin-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
          </div>
          <label class="profile-edit-label" id="admin-flashcard-back-label" for="admin-flashcard-back">Verso (tradução)</label>
          <input type="text" id="admin-flashcard-back" class="profile-edit-input" placeholder="ex: a biblioteca" autocomplete="off">
          <p class="profile-edit-field-error" id="admin-flashcard-back-error"></p>
          <div id="admin-flashcard-mc-fields" style="display:none; margin:4px 0 0;">
            <label class="profile-edit-label" for="admin-flashcard-mc-1">Outras opções -- opção errada 1</label>
            <input type="text" id="admin-flashcard-mc-1" class="profile-edit-input" autocomplete="off">
            <p class="profile-edit-field-error" id="admin-flashcard-mc-error"></p>
            <label class="profile-edit-label" for="admin-flashcard-mc-2">Opção errada 2 (opcional)</label>
            <input type="text" id="admin-flashcard-mc-2" class="profile-edit-input" autocomplete="off">
            <label class="profile-edit-label" for="admin-flashcard-mc-3">Opção errada 3 (opcional)</label>
            <input type="text" id="admin-flashcard-mc-3" class="profile-edit-input" autocomplete="off">
          </div>
        </div>
        <div id="admin-flashcard-content-cloze" style="display:none;">
          <label class="profile-edit-label" for="admin-flashcard-cloze-sentence">Frase com lacuna (use ___ pra marcar o espaço)</label>
          <input type="text" id="admin-flashcard-cloze-sentence" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 我 ___ 巴西人。' : 'ex: Je ___ de Paris.'}" autocomplete="off">
          <p class="profile-edit-field-error" id="admin-flashcard-cloze-sentence-error"></p>
          <label class="profile-edit-label" for="admin-flashcard-cloze-answer">Resposta certa</label>
          <input type="text" id="admin-flashcard-cloze-answer" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 是' : 'ex: viens'}" autocomplete="off">
          <p class="profile-edit-field-error" id="admin-flashcard-cloze-answer-error"></p>
          <div id="admin-flashcard-cloze-pinyin-wrap" style="display:none;">
            <label class="profile-edit-label" for="admin-flashcard-cloze-pinyin">Pinyin da resposta (é o que o aluno vai digitar)</label>
            <input type="text" id="admin-flashcard-cloze-pinyin" class="profile-edit-input" placeholder="ex: shì" autocomplete="off">
            <p class="profile-edit-field-error" id="admin-flashcard-cloze-pinyin-error"></p>
          </div>
          <label class="profile-edit-label" for="admin-flashcard-cloze-trans">Tradução (mostrada ao aluno depois de responder)</label>
          <input type="text" id="admin-flashcard-cloze-trans" class="profile-edit-input" placeholder="ex: Eu venho de Paris." autocomplete="off">
          <p class="profile-edit-field-error" id="admin-flashcard-cloze-trans-error"></p>
        </div>

        <div class="section-label" style="margin:18px 0 6px;">Recursos opcionais</div>
        <label class="profile-edit-label" for="admin-flashcard-note">Nota</label>
        <input type="text" id="admin-flashcard-note" class="profile-edit-input" placeholder="contexto, dica de uso..." autocomplete="off">
        <label class="profile-edit-label" for="admin-flashcard-image">Imagem</label>
        <input type="file" id="admin-flashcard-image" class="profile-edit-input" accept="image/*">
        <label class="profile-edit-label" for="admin-flashcard-audio">Áudio próprio (além da pronúncia automática)</label>
        <input type="file" id="admin-flashcard-audio" class="profile-edit-input" accept="audio/*">

        <p class="profile-edit-error" id="admin-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-flashcard-btn" ${selectedStudents.length ? '' : 'disabled'}>Criar cartão${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}</button>
      </form>
    </div>

    <div class="profile-section" id="admin-flashcards-cards-box">
      ${await buildFlashcardsCardsBoxHTML(selectedStudents)}
    </div>
  `;

  wireFlashcardsCardsBox(document.getElementById('admin-flashcards-cards-box'));

  wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_FLASHCARDS_STATE.studentIds.add(cb.value);
      else ADMIN_FLASHCARDS_STATE.studentIds.delete(cb.value);
      updateFlashcardsSelectionDependentUI(wrap);
    });
  });

  document.getElementById('admin-flashcard-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_FLASHCARDS_STATE.studentIds = new Set(students.map(s => s.student_id));
    wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => { cb.checked = true; });
    updateFlashcardsSelectionDependentUI(wrap);
  });
  document.getElementById('admin-flashcard-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_FLASHCARDS_STATE.studentIds = new Set();
    wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => { cb.checked = false; });
    updateFlashcardsSelectionDependentUI(wrap);
  });

  wrap.querySelectorAll('[data-lang-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      ADMIN_FLASHCARDS_STATE.langFilter = pill.dataset.langFilter;
      wrap.querySelectorAll('[data-lang-filter]').forEach(p => p.classList.toggle('active', p === pill));
      applyFlashcardPickerFilters(wrap);
    });
  });

  document.getElementById('admin-flashcard-search').addEventListener('input', () => applyFlashcardPickerFilters(wrap));

  // "Modo de prática" é um radio group (name="admin-flashcard-mode") --
  // exclusividade entre Flashcard normal/Múltipla escolha/Completar a
  // frase já vem de graça do próprio HTML, não precisa de JS forçando.
  // Fase 1 da reestruturação (ver CLAUDE.md): o modo agora decide qual
  // bloco de Conteúdo aparece -- #admin-flashcard-content-main (Frente/
  // Verso/pinyin, reaproveitado tanto por Flashcard normal quanto por
  // Múltipla escolha -- só os RÓTULOS mudam, "Frente"/"Verso" vs.
  // "Pergunta/termo"/"Resposta correta") ou #admin-flashcard-content-cloze
  // (Frase com lacuna/Resposta certa/Tradução, campos próprios). Os campos
  // que não pertencem ao modo selecionado ficam genuinamente escondidos,
  // não só reordenados.
  wrap.querySelectorAll('input[name="admin-flashcard-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      document.getElementById('admin-flashcard-content-main').style.display = mode === 'cloze' ? 'none' : '';
      document.getElementById('admin-flashcard-content-cloze').style.display = mode === 'cloze' ? '' : 'none';
      document.getElementById('admin-flashcard-mc-fields').style.display = mode === 'mc' ? '' : 'none';
      document.getElementById('admin-flashcard-front-label').textContent = mode === 'mc' ? 'Pergunta/termo (no idioma estudado)' : 'Frente (no idioma estudado)';
      document.getElementById('admin-flashcard-back-label').textContent = mode === 'mc' ? 'Resposta correta' : 'Verso (tradução)';
      const anyMandarimNow = ADMIN_FLASHCARDS_STATE._studentsCache.some(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) && s.language_app_key === 'mandarim');
      document.getElementById('admin-flashcard-cloze-pinyin-wrap').style.display = (mode === 'cloze' && anyMandarimNow) ? '' : 'none';
      // Fase 2 da reestruturação (ver CLAUDE.md) -- trocar de modo esconde
      // um bloco de campo inteiro; nenhum erro marcado nele deveria
      // continuar visível quando ele reaparecer num estado limpo.
      clearAllFlashcardFieldErrors();
    });
  });

  wireFlashcardFieldValidation(wrap);

  document.getElementById('admin-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-flashcard-btn');
    const errorEl = document.getElementById('admin-create-flashcard-error');
    errorEl.textContent = '';

    const selectedNow = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
    if (!selectedNow.length){
      errorEl.textContent = 'Selecione ao menos um aluno.';
      return;
    }

    // Fase 2 da reestruturação (ver CLAUDE.md) -- validação contextual por
    // campo RODA ANTES do upload de mídia/chamada de rede, não só depois:
    // evita subir imagem/áudio à toa quando o resto do formulário ainda
    // está inválido, e mostra exatamente qual campo corrigir (borda +
    // mensagem embaixo dele) em vez de só uma frase genérica no rodapé.
    // createFlashcard() continua validando de novo do lado do dado -- isto
    // é só a camada de UX na frente, mesmo espírito de outros gates de UI
    // já existentes no app.
    if (!validateFlashcardForm(wrap)){
      errorEl.textContent = 'Corrija os campos destacados acima.';
      return;
    }

    btn.disabled = true;

    // Fase 8a -- upload de imagem/áudio ANTES de criar o(s) cartão(ões) (a
    // URL pública precisa existir pra gravar junto no insert). Feito UMA
    // vez só, mesmo com vários alunos selecionados -- o arquivo é o mesmo
    // pra todos, reenviar por aluno seria desperdício de banda/Storage.
    const imageFile = document.getElementById('admin-flashcard-image').files[0];
    const audioFile = document.getElementById('admin-flashcard-audio').files[0];
    let imageUrl = null, audioUrl = null;
    if (imageFile){
      const up = await uploadFlashcardMedia(imageFile, 'image');
      if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
      imageUrl = up.url;
    }
    if (audioFile){
      const up = await uploadFlashcardMedia(audioFile, 'audio');
      if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
      audioUrl = up.url;
    }

    const mode = wrap.querySelector('input[name="admin-flashcard-mode"]:checked').value;
    const isMC = mode === 'mc';
    const isCloze = mode === 'cloze';

    // Múltipla escolha já foi validada (pelo menos 1 opção preenchida) em
    // validateFlashcardForm() acima -- não precisa checar de novo aqui.
    const choices = isMC ? [
      document.getElementById('admin-flashcard-mc-1').value,
      document.getElementById('admin-flashcard-mc-2').value,
      document.getElementById('admin-flashcard-mc-3').value,
    ] : [];

    // Fase 1 da reestruturação (ver CLAUDE.md): no modo cloze, "Frente"
    // não existe na tela (nunca lida/exibida em renderClozeReviewCard) --
    // front some vazio, createFlashcard() grava `null` (migration 035),
    // sem inventar um valor substituto. "Verso"/tradução continua sempre
    // obrigatório em todo modo, só migra de input conforme o bloco visível
    // (#admin-flashcard-back pro flip/mc, #admin-flashcard-cloze-trans pro
    // cloze -- back_trans é o que renderClozeReviewCard mostra depois de
    // responder).
    const front = isCloze ? '' : document.getElementById('admin-flashcard-front').value;
    const backTrans = isCloze ? document.getElementById('admin-flashcard-cloze-trans').value : document.getElementById('admin-flashcard-back').value;
    const note = document.getElementById('admin-flashcard-note').value;
    const pinyinValue = isCloze ? '' : document.getElementById('admin-flashcard-pinyin')?.value;

    const clozeSentence = isCloze ? document.getElementById('admin-flashcard-cloze-sentence').value : '';
    const clozeAnswer = isCloze ? document.getElementById('admin-flashcard-cloze-answer').value : '';
    const clozeAnswerPinyin = isCloze ? document.getElementById('admin-flashcard-cloze-pinyin')?.value : '';

    // Uma linha em teacher_flashcards POR aluno selecionado -- mesmo
    // conteúdo, cada uma com o language_app_key do PRÓPRIO aluno (nunca o
    // de outro, mesmo numa seleção mista fr+zh). Pinyin (front E cloze) só
    // vai junto pros que são de mandarim -- gravar pinyin numa linha de
    // francês seria dado morto (nada no fr lê esses campos), então evita
    // sujar o registro à toa.
    const results = await Promise.all(selectedNow.map(s => createFlashcard({
      studentId: s.student_id,
      languageAppKey: s.language_app_key,
      front,
      backTrans,
      note,
      frontPinyin: s.language_app_key === 'mandarim' ? pinyinValue : '',
      imageUrl, audioUrl, choices,
      clozeSentence, clozeAnswer,
      clozeAnswerPinyin: s.language_app_key === 'mandarim' ? clozeAnswerPinyin : '',
    })));
    btn.disabled = false;

    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length){
      errorEl.textContent = failed[0].error;
      return;
    }
    const okCount = results.length - failed.length;
    if (failed.length){
      showToast(`✓ ${okCount} cartão(ões) criado(s), ${failed.length} falharam.`);
    } else {
      showToast(results.length > 1 ? `✓ ${okCount} cartões criados.` : '✓ Cartão criado.');
    }
    // Único ponto onde um re-render COMPLETO acontece por causa da seleção
    // -- e é intencional aqui: um submit bem sucedido deve mesmo limpar o
    // formulário (frente/verso/nota/mídia/modo), diferente de marcar um
    // checkbox, que não deveria apagar nada.
    renderAdminFlashcardsView();
  });
}
