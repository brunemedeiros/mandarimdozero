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
// Reestruturação Fase 4 (mesmo prompt-mestre das Fases 1/2/3 acima, ver
// CLAUDE.md) -- "Recursos opcionais contextual por modo". Investigado antes
// de mudar qualquer coisa (mesma disciplina de "investigação antes de mudar"
// já usada em UX-fix 4/6): Imagem/Áudio (card.imageUrl/audioUrl) JÁ renderizam
// corretamente nos 3 modos de revisão hoje (flip/mc/cloze, fr+zh app.js) --
// escondê-los por modo seria regressão, não melhoria. Nota (card.note/
// teacherNote) nunca aparece pro aluno em NENHUM modo, mas isso também não é
// bug de modo -- é o único ponto de leitura confirmado (buildFlashcardsCardsBoxHTML
// acima), um lembrete privado da própria professora, não um campo destinado
// ao aluno. Ou seja: nenhum dos 3 campos genuinamente varia por modo hoje.
// Perguntado à autora o que "contextual" deveria significar dado esse achado
// -- resposta: só o TEXTO de apoio (`#admin-flashcard-resources-hint`,
// `FLASHCARD_RESOURCES_HINT`) muda conforme o modo selecionado, explicando
// onde Imagem/Áudio aparecem NAQUELE modo especificamente; Nota continua
// descrita como lembrete privado nos 3. Zero mudança de visibilidade/
// comportamento dos campos em si.
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-flashcards.js (fetchFlashcardsForStudent, createFlashcard, setFlashcardStatus, uploadFlashcardMedia)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - languages/<lang>/app.js      (isAdminUser)

// Prop 4 (ver CLAUDE.md, "7 propostas") -- editingCardId: qual cartão está
// mostrando o form de edição agora (null = nenhum); _cardsCache: última
// lista de cartões buscada (buildFlashcardsCardsBoxHTML), pra achar o
// objeto completo do cartão em edição sem precisar refazer a busca.
//
// Fase 6D.2 (ver CLAUDE.md) -- nativeCardState: estado do editor nativo
// (shared/flashcard-editor-state.js, Fase 6D.1) pro cartão sendo CRIADO
// agora, começando sempre em cardGenerationMode:'normal' (nunca outro
// default silencioso). Reiniciado a cada render COMPLETO do formulário
// (renderAdminFlashcardsView), nunca mutado fora do listener do novo
// seletor de Card Type -- puramente aditivo, sem efeito na criação real
// de cartão nesta subfase (ver CARD_TYPE_UI_META acima).
// Fase 6D.6 (ver CLAUDE.md) -- editingNativeState: Note editor state
// NATIVO do cartão em edição (ADMIN_FLASHCARDS_STATE.editingCardId), só
// quando a edição está no editor novo -- `null` = edição legada de
// sempre. Seedado lazily por flashcardCardRowHTML() (cartão já nativo,
// createNativeNoteEditorStateFromRow) ou pelo botão "Usar o novo editor
// de campos" num cartão legado (nativeNoteEditorStateFromLegacyRow) --
// nunca populado sozinho só por abrir a edição de um cartão legado
// (Seção 6, "legacy aberto != automaticamente migrado").
let ADMIN_FLASHCARDS_STATE = { studentIds: new Set(), langFilter: 'all', _studentsCache: [], editingCardId: null, editingNativeState: null, _cardsCache: [], nativeCardState: createNativeNoteEditorState({ cardGenerationMode: 'normal' }) };

// Prop 4 -- confirmação obrigatória antes de salvar uma edição (grillado
// com a autora: editar reinicia o progresso de revisão, ela quer avisar
// antes com "Sim"/"Descartar edições"). Modal compartilhado com
// shared/my-flashcards.js (#flashcard-reset-confirm-modal, fr/zh
// index.html) -- usa .onclick (não addEventListener) nos 3 botões de
// propósito, pra nunca empilhar handlers de chamadas anteriores.
function openFlashcardResetConfirm(onConfirm){
  const modal = document.getElementById('flashcard-reset-confirm-modal');
  if (!modal){ onConfirm(); return; }
  modal.style.display = 'flex';
  const close = () => { modal.style.display = 'none'; };
  document.getElementById('flashcard-reset-confirm-yes').onclick = () => { close(); onConfirm(); };
  document.getElementById('flashcard-reset-confirm-discard').onclick = close;
  document.getElementById('flashcard-reset-confirm-close').onclick = close;
}

// Fase 4 da reestruturação (mesmo prompt-mestre, ver CLAUDE.md) -- "Recursos
// opcionais" (Nota/Imagem/Áudio) continua sempre visível nos 3 modos (Imagem/
// Áudio já funcionam corretamente nos 3 -- renderReviewView/renderMultipleChoiceReviewCard/
// renderClozeReviewCard em fr+zh app.js todos mostram card.imageUrl/audioUrl;
// esconder algum deles por modo seria regressão, não melhoria -- confirmado
// lendo o código antes de mudar qualquer coisa). "Contextual por modo" aqui é
// só o TEXTO de apoio embaixo do rótulo, explicando onde cada recurso aparece
// NAQUELE modo específico -- nenhuma mudança de visibilidade/comportamento.
const FLASHCARD_RESOURCES_HINT = {
  flip: 'Imagem e áudio aparecem junto da frente do cartão. Nota é um lembrete só seu -- o aluno nunca vê.',
  mc: 'Imagem e áudio aparecem junto da pergunta, acima das opções de múltipla escolha. Nota é um lembrete só seu -- o aluno nunca vê.',
  cloze: 'Imagem e áudio aparecem junto da frase com a lacuna. Nota é um lembrete só seu -- o aluno nunca vê.',
};

// Fase 6D.2 da reestruturação Note/CardType/CardInstance (ver CLAUDE.md) --
// os 5 Card Types "oficiais" do motor nativo (shared/flashcard-model.js,
// CARD_GENERATION_MODES), só pra rotular o seletor novo abaixo. Esta
// subfase introduz SÓ a seleção explícita -- o valor escolhido grava em
// ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode (novo, shared/
// flashcard-editor-state.js, Fase 6D.1), nunca num campo paralelo/duplicado
// (nada de `selectedCardType`/`cardType`/`type` soltos). Este seletor NÃO
// afeta o que é de fato salvo nesta fase -- "Modo de prática" (os 3 radios
// legados acima) continua sendo o único lido pelo submit handler; a
// persistência nativa (gravar fields/card_generation_mode de verdade) é a
// Fase 6D.6, o editor de Fields completo é a 6D.3+.
const CARD_TYPE_UI_META = [
  { id: 'normal', label: 'Normal' },
  { id: 'normal_reversed', label: 'Normal com reverso' },
  { id: 'multiple_choice', label: 'Múltipla escolha' },
  { id: 'type_answer', label: 'Digite a resposta' },
  { id: 'cloze', label: 'Completar a frase (Cloze)' },
];

// Grillado com a autora (ver CLAUDE.md, "rótulo do seletor de direção do
// cartão") -- rótulo com o nome do idioma de verdade em vez de "idioma
// estudado"/"tradução" genéricos. Diferente de shared/my-flashcards.js
// (sempre 1 idioma só, o do site), aqui a seleção pode ter vários alunos
// -- só mostra o par de idiomas concreto quando a seleção inteira
// (excluindo mandarim, que já esconde o bloco) compartilha o MESMO
// idioma-alvo elegível (`FLASHCARD_DIRECTION_LANGUAGE_LABELS`, hoje só
// francês/português -- decisão minha, não pedida explicitamente no
// grilling, mas segue o mesmo padrão já aprovado pra "sem seleção" ->
// texto genérico: nunca inventa um rótulo ambíguo quando não há um único
// idioma-alvo pra mostrar). Cai pro texto genérico quando: nenhum aluno
// selecionado, seleção mista entre 2+ idiomas elegíveis, ou o idioma não
// tem entrada no mapa.
function adminFlashcardDirectionLabels(selectedStudents){
  const eligibleKeys = [...new Set(selectedStudents.map(s => s.language_app_key).filter(key => FLASHCARD_DIRECTION_LANGUAGE_LABELS[key]))];
  const pair = eligibleKeys.length === 1 ? FLASHCARD_DIRECTION_LANGUAGE_LABELS[eligibleKeys[0]] : null;
  if (!pair){
    return {
      targetFirst: 'Frente no idioma estudado, verso na tradução (padrão)',
      nativeFirst: 'Frente na tradução, verso no idioma estudado',
    };
  }
  return {
    targetFirst: `Frente em ${pair.target} (com áudio), verso com tradução em ${pair.native}`,
    nativeFirst: `Frente na tradução em ${pair.native}, verso em ${pair.target} (com áudio)`,
  };
}

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

// Prop 4 (ver CLAUDE.md, "7 propostas") -- edição real (TODOS os campos,
// grillado explicitamente) de um cartão já criado, mais exclusão física.
// Vive numa div própria em vez de <form> porque troca de conteúdo entre
// modos precisa mostrar/esconder blocos, mesmo padrão do form de criação
// -- mas com ids PRÓPRIOS (edit-flashcard-*, não admin-flashcard-*) pra
// nunca colidir com o form de criação ao lado. `direction` (Prop 1+2) só
// aparece quando o idioma do ALUNO DESTE cartão não é mandarim -- mesmo
// motivo do form de criação (ver comentário lá): não existe um
// "back_pinyin" pra completar o par hanzi+pinyin se invertido no zh.
function flashcardEditFormHTML(c){
  const isMandarim = c.language_app_key === 'mandarim';
  const isMC = !!(c.choices && c.choices.length);
  const isCloze = !!c.cloze_sentence;
  const mode = isCloze ? 'cloze' : (isMC ? 'mc' : 'flip');
  const direction = c.front_is_target_language === false ? 'target-back' : 'target-front';
  const choices = c.choices || [];
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:8px;">
      <div class="section-label" style="margin:0;">Editar cartão</div>
      <button type="button" class="admin-select-link" id="edit-flashcard-use-native" style="align-self:flex-start; background:none; border:none; cursor:pointer; padding:0;">🧪 Usar o novo editor de campos (nativo) -- preserva o conteúdo já digitado</button>

      <div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="flip" ${mode === 'flip' ? 'checked' : ''}> Flashcard normal
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="mc" ${mode === 'mc' ? 'checked' : ''}> Múltipla escolha
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="cloze" ${mode === 'cloze' ? 'checked' : ''}> Completar a frase
        </label>
      </div>

      ${!isMandarim ? `
      <div id="edit-flashcard-direction-wrap" style="${mode === 'cloze' ? 'display:none;' : ''}">
        <div class="section-label" style="margin:0 0 4px;">Idioma de cada lado</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-direction" value="target-front" ${direction === 'target-front' ? 'checked' : ''}> ${adminFlashcardDirectionLabels([c]).targetFirst}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-direction" value="target-back" ${direction === 'target-back' ? 'checked' : ''}> ${adminFlashcardDirectionLabels([c]).nativeFirst}
        </label>
      </div>` : ''}

      <div id="edit-flashcard-content-main" style="${mode === 'cloze' ? 'display:none;' : ''}">
        <label class="profile-edit-label" id="edit-flashcard-front-label">${mode === 'mc' ? 'Pergunta/termo' : 'Frente'}</label>
        <textarea id="edit-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.front || '')}</textarea>
        ${isMandarim ? `
        <label class="profile-edit-label">Pinyin</label>
        <input type="text" id="edit-flashcard-pinyin" class="profile-edit-input" value="${escapeHTML(c.front_pinyin || '')}">` : ''}
        <label class="profile-edit-label" id="edit-flashcard-back-label">${mode === 'mc' ? 'Resposta correta' : 'Verso'}</label>
        <textarea id="edit-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.back_trans || '')}</textarea>
        <div id="edit-flashcard-mc-fields" style="${mode === 'mc' ? '' : 'display:none;'} margin:4px 0 0;">
          <label class="profile-edit-label">Outras opções -- opção errada 1</label>
          <input type="text" id="edit-flashcard-mc-1" class="profile-edit-input" value="${escapeHTML(choices[0] || '')}">
          <label class="profile-edit-label">Opção errada 2 (opcional)</label>
          <input type="text" id="edit-flashcard-mc-2" class="profile-edit-input" value="${escapeHTML(choices[1] || '')}">
          <label class="profile-edit-label">Opção errada 3 (opcional)</label>
          <input type="text" id="edit-flashcard-mc-3" class="profile-edit-input" value="${escapeHTML(choices[2] || '')}">
        </div>
      </div>

      <div id="edit-flashcard-content-cloze" style="${mode === 'cloze' ? '' : 'display:none;'}">
        <label class="profile-edit-label">Frase com lacuna (use ___ pra marcar o espaço)</label>
        <input type="text" id="edit-flashcard-cloze-sentence" class="profile-edit-input" value="${escapeHTML(c.cloze_sentence || '')}">
        <label class="profile-edit-label">Resposta certa</label>
        <input type="text" id="edit-flashcard-cloze-answer" class="profile-edit-input" value="${escapeHTML(c.cloze_answer || '')}">
        ${isMandarim ? `
        <label class="profile-edit-label">Pinyin da resposta</label>
        <input type="text" id="edit-flashcard-cloze-pinyin" class="profile-edit-input" value="${escapeHTML(c.cloze_answer_pinyin || '')}">` : ''}
        <label class="profile-edit-label">Tradução</label>
        <textarea id="edit-flashcard-cloze-trans" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.back_trans || '')}</textarea>
      </div>

      <div>
        <label class="profile-edit-label">Nota</label>
        <textarea id="edit-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.note || '')}</textarea>
        <label class="profile-edit-label">Imagem${c.image_url ? ' (já tem uma -- escolha um arquivo só pra trocar)' : ''}</label>
        <input type="file" id="edit-flashcard-image" class="profile-edit-input" accept="image/*">
        <label class="profile-edit-label">Áudio próprio${c.audio_url ? ' (já tem um -- escolha um arquivo só pra trocar)' : ''}</label>
        <input type="file" id="edit-flashcard-audio" class="profile-edit-input" accept="audio/*">
      </div>

      <p class="profile-edit-error" id="edit-flashcard-error"></p>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-secondary" id="edit-flashcard-cancel" style="flex:1;">Cancelar</button>
        <button type="button" class="btn btn-primary" id="edit-flashcard-save" style="flex:1;">Salvar</button>
      </div>
    </div>
  `;
}

// Wiring do form de edição -- mode-switch replica o mesmo comportamento
// do form de criação (esconde/mostra blocos, troca rótulos), mas escopado
// aos ids `edit-flashcard-*`. Salvar passa pelo modal de confirmação
// (openFlashcardResetConfirm) ANTES de chamar updateFlashcardContent --
// só depois do "Sim" a chamada de rede acontece de verdade.
function wireFlashcardEditForm(c, container){
  const isMandarim = c.language_app_key === 'mandarim';

  container.querySelectorAll('input[name="edit-flashcard-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      const contentMain = document.getElementById('edit-flashcard-content-main');
      const contentCloze = document.getElementById('edit-flashcard-content-cloze');
      const mcFields = document.getElementById('edit-flashcard-mc-fields');
      const directionWrap = document.getElementById('edit-flashcard-direction-wrap');
      if (contentMain) contentMain.style.display = mode === 'cloze' ? 'none' : '';
      if (contentCloze) contentCloze.style.display = mode === 'cloze' ? '' : 'none';
      if (mcFields) mcFields.style.display = mode === 'mc' ? '' : 'none';
      if (directionWrap) directionWrap.style.display = mode === 'cloze' ? 'none' : '';
      const frontLabel = document.getElementById('edit-flashcard-front-label');
      const backLabel = document.getElementById('edit-flashcard-back-label');
      if (frontLabel) frontLabel.textContent = mode === 'mc' ? 'Pergunta/termo' : 'Frente';
      if (backLabel) backLabel.textContent = mode === 'mc' ? 'Resposta correta' : 'Verso';
    });
  });

  // Fase 6D.6 (ver CLAUDE.md) -- ação EXPLÍCITA de conversão Legacy->Native
  // (nunca automática): clicar aqui monta um Note editor state a partir
  // do conteúdo JÁ EXISTENTE deste cartão (nativeNoteEditorStateFromLegacyRow,
  // shared/flashcard-native-persistence.js -- preserva front/back_trans/
  // choices/cloze_sentence+cloze_answer(+pinyin), nunca começa em branco)
  // e troca a exibição pro editor nativo -- mas NADA é salvo ainda; só o
  // clique em "Salvar" do formulário nativo grava de verdade.
  document.getElementById('edit-flashcard-use-native')?.addEventListener('click', async () => {
    ADMIN_FLASHCARDS_STATE.editingNativeState = nativeNoteEditorStateFromLegacyRow(c);
    const cardsBox = document.getElementById('admin-flashcards-cards-box');
    const selectedStudents = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
    cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
    wireFlashcardsCardsBox(cardsBox);
  });

  document.getElementById('edit-flashcard-cancel').addEventListener('click', () => {
    ADMIN_FLASHCARDS_STATE.editingCardId = null;
    ADMIN_FLASHCARDS_STATE.editingNativeState = null;
    updateFlashcardsSelectionDependentUI(document.getElementById('admin-flashcards-content'));
  });

  document.getElementById('edit-flashcard-save').addEventListener('click', () => {
    const errorEl = document.getElementById('edit-flashcard-error');
    errorEl.textContent = '';
    const mode = container.querySelector('input[name="edit-flashcard-mode"]:checked').value;
    const isMC = mode === 'mc';
    const isCloze = mode === 'cloze';
    const direction = container.querySelector('input[name="edit-flashcard-direction"]:checked')?.value || 'target-front';

    if (!isCloze){
      if (!document.getElementById('edit-flashcard-front').value.trim()){ errorEl.textContent = 'Digite a frente.'; return; }
      if (!document.getElementById('edit-flashcard-back').value.trim()){ errorEl.textContent = 'Digite o verso.'; return; }
      if (isMC){
        const anyChoice = ['edit-flashcard-mc-1', 'edit-flashcard-mc-2', 'edit-flashcard-mc-3'].some(id => document.getElementById(id).value.trim());
        if (!anyChoice){ errorEl.textContent = 'Digite pelo menos 1 opção errada.'; return; }
      }
    } else {
      const sentence = document.getElementById('edit-flashcard-cloze-sentence').value.trim();
      if ((sentence.match(/___/g) || []).length !== 1){ errorEl.textContent = 'A frase precisa ter exatamente um espaço marcado com ___.'; return; }
      if (!document.getElementById('edit-flashcard-cloze-answer').value.trim()){ errorEl.textContent = 'Digite a resposta certa.'; return; }
      if (isMandarim && !document.getElementById('edit-flashcard-cloze-pinyin').value.trim()){ errorEl.textContent = 'Digite o pinyin da resposta.'; return; }
      if (!document.getElementById('edit-flashcard-cloze-trans').value.trim()){ errorEl.textContent = 'Digite a tradução.'; return; }
    }

    openFlashcardResetConfirm(async () => {
      const saveBtn = document.getElementById('edit-flashcard-save');
      if (saveBtn) saveBtn.disabled = true;
      const imageFile = document.getElementById('edit-flashcard-image').files[0];
      const audioFile = document.getElementById('edit-flashcard-audio').files[0];
      // undefined = mantém a mídia já existente (updateFlashcardContent só
      // sobrescreve image_url/audio_url quando o valor não é undefined).
      let imageUrl, audioUrl;
      if (imageFile){
        const up = await uploadFlashcardMedia(imageFile, 'image');
        if (!up.ok){ errorEl.textContent = up.error; if (saveBtn) saveBtn.disabled = false; return; }
        imageUrl = up.url;
      }
      if (audioFile){
        const up = await uploadFlashcardMedia(audioFile, 'audio');
        if (!up.ok){ errorEl.textContent = up.error; if (saveBtn) saveBtn.disabled = false; return; }
        audioUrl = up.url;
      }
      const front = isCloze ? '' : document.getElementById('edit-flashcard-front').value;
      const backTrans = isCloze ? document.getElementById('edit-flashcard-cloze-trans').value : document.getElementById('edit-flashcard-back').value;
      const note = document.getElementById('edit-flashcard-note').value;
      const pinyinValue = (!isCloze && isMandarim) ? document.getElementById('edit-flashcard-pinyin').value : '';
      const choices = isMC ? [
        document.getElementById('edit-flashcard-mc-1').value,
        document.getElementById('edit-flashcard-mc-2').value,
        document.getElementById('edit-flashcard-mc-3').value,
      ] : [];
      const clozeSentence = isCloze ? document.getElementById('edit-flashcard-cloze-sentence').value : '';
      const clozeAnswer = isCloze ? document.getElementById('edit-flashcard-cloze-answer').value : '';
      const clozeAnswerPinyin = (isCloze && isMandarim) ? document.getElementById('edit-flashcard-cloze-pinyin').value : '';

      const result = await updateFlashcardContent(c.id, {
        languageAppKey: c.language_app_key,
        front, backTrans, note,
        frontPinyin: pinyinValue,
        imageUrl, audioUrl, choices,
        clozeSentence, clozeAnswer, clozeAnswerPinyin,
        frontIsTargetLanguage: direction === 'target-front',
        revision: (c.revision || 0) + 1,
      });
      if (saveBtn) saveBtn.disabled = false;
      if (!result.ok){ errorEl.textContent = result.error; return; }
      showToast('✓ Cartão editado. O progresso de revisão foi reiniciado.');
      ADMIN_FLASHCARDS_STATE.editingCardId = null;
      updateFlashcardsSelectionDependentUI(document.getElementById('admin-flashcards-content'));
    });
  });
}

// ---------- Fase 6D.6 (ver CLAUDE.md) -- edição de um cartão NATIVO
// (fields+card_generation_mode presentes) ou conversão explícita de um
// legado (via o botão "Usar o novo editor de campos" acima) ----------
//
// Reaproveita 100% dos componentes já construídos nas Fases 6D.2-6D.5
// (CARD_TYPE_UI_META, refreshNativeCardTypeBox, transitionToXxx,
// stripClozeMarksFromEditorState) -- nunca uma segunda implementação de
// editor de Card Type, só apontada pra um editorState de EDIÇÃO em vez do
// de criação (ADMIN_FLASHCARDS_STATE.editingNativeState em vez de
// .nativeCardState). Ids próprios (edit-native-flashcard-*) pra nunca
// colidir com o form de criação nem com o form de edição legado ao lado.
function flashcardNativeEditFormHTML(c, editorState){
  return `
    <div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:8px;">
      <div class="section-label" style="margin:0;">Editar cartão (editor nativo)</div>
      <p class="profile-edit-hint" style="margin:0;">Este cartão usa o novo modelo de campos -- editando aqui, o conteúdo é gravado em fields/card_generation_mode, nunca nas colunas antigas.</p>
      <div class="section-label" style="margin:6px 0 4px;">Card Type</div>
      <select id="edit-native-flashcard-card-type" class="profile-edit-input">
        ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === editorState.cardGenerationMode ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select>
      <div id="edit-native-flashcard-fields"></div>
      <button type="button" class="admin-select-link" id="edit-native-flashcard-preview-btn" style="background:none; border:none; cursor:pointer; align-self:flex-start; padding:0;">👁️ Pré-visualizar</button>
      <label class="profile-edit-label">Nota (privada -- o aluno nunca vê)</label>
      <textarea id="edit-native-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(editorState.privateNote || '')}</textarea>
      <p class="profile-edit-error" id="edit-native-flashcard-error"></p>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-secondary" id="edit-native-flashcard-cancel" style="flex:1;">Cancelar</button>
        <button type="button" class="btn btn-primary" id="edit-native-flashcard-save" style="flex:1;">Salvar</button>
      </div>
    </div>
  `;
}

function wireFlashcardNativeEditForm(c, editorState, container){
  const boxEl = document.getElementById('edit-native-flashcard-fields');
  refreshNativeCardTypeBox(boxEl, editorState, { namePrefix: 'edit-native' });

  document.getElementById('edit-native-flashcard-card-type').addEventListener('change', (e) => {
    const newMode = e.target.value;
    const wasCloze = editorState.cardGenerationMode === 'cloze';
    if (wasCloze && newMode !== 'cloze') stripClozeMarksFromEditorState(editorState);
    if (newMode === 'multiple_choice') transitionToMultipleChoice(editorState);
    else if (newMode === 'type_answer') transitionToTypeAnswer(editorState);
    else if (newMode === 'cloze') transitionToCloze(editorState);
    else editorState.cardGenerationMode = newMode;
    refreshNativeCardTypeBox(boxEl, editorState, { namePrefix: 'edit-native' });
  });

  // Fase 6D.7 (ver CLAUDE.md) -- Preview do rascunho de EDIÇÃO atual
  // (editorState, já mutado por qualquer troca de Card Type/Field feita
  // nesta tela antes de salvar) -- nunca do que já está gravado no banco
  // (c), exatamente a mesma regra "estado atual do editor" da criação.
  // languageAppKey já vem correto de createNativeNoteEditorStateFromRow()/
  // nativeNoteEditorStateFromLegacyRow() (row.language_app_key).
  document.getElementById('edit-native-flashcard-preview-btn')?.addEventListener('click', () => {
    openFlashcardPreviewFromEditorState(editorState, {
      appKey: editorState.languageAppKey || c.language_app_key || 'frances',
      origin: 'teacher',
    });
  });

  document.getElementById('edit-native-flashcard-cancel').addEventListener('click', () => {
    ADMIN_FLASHCARDS_STATE.editingCardId = null;
    ADMIN_FLASHCARDS_STATE.editingNativeState = null;
    updateFlashcardsSelectionDependentUI(document.getElementById('admin-flashcards-content'));
  });

  document.getElementById('edit-native-flashcard-save').addEventListener('click', () => {
    const errorEl = document.getElementById('edit-native-flashcard-error');
    errorEl.textContent = '';
    editorState.privateNote = (document.getElementById('edit-native-flashcard-note').value || '').trim() || null;
    const v = validateNoteEditorStateForSave(editorState);
    if (!v.ok){ errorEl.textContent = v.error; return; }

    // Seção 4/5/21 (ver CLAUDE.md) -- ID sempre preservado (mesmo c.id,
    // nunca um novo). Revision só incrementa quando: (a) o cartão já era
    // nativo E o conteúdo/estrutura genuinamente mudou
    // (noteEditorStateRequiresNewRevision, Fase 6D.1 -- nunca reimplementado
    // aqui); ou (b) é uma conversão Legacy->Native de verdade (a estrutura
    // sempre muda -- colunas legadas soltas viram Note/Field -- reset é
    // esperado e coerente com o resto do app: editar sempre reseta
    // progresso desde a Fase Prop4/"7 propostas").
    const wasNative = isNoteFieldsPresent(c) && isCardGenerationModePresent(c);
    let nextRevision = c.revision || 0;
    if (wasNative){
      const original = createNativeNoteEditorStateFromRow(c);
      if (noteEditorStateRequiresNewRevision(original, editorState)) nextRevision += 1;
    } else {
      nextRevision += 1;
    }

    const doSave = async () => {
      const saveBtn = document.getElementById('edit-native-flashcard-save');
      if (saveBtn) saveBtn.disabled = true;
      const result = await updateFlashcardContent(c.id, { revision: nextRevision, nativeState: editorState });
      if (saveBtn) saveBtn.disabled = false;
      if (!result.ok){ errorEl.textContent = result.error; return; }
      showToast(nextRevision > (c.revision || 0) ? '✓ Cartão editado. O progresso de revisão foi reiniciado.' : '✓ Cartão editado.');
      ADMIN_FLASHCARDS_STATE.editingCardId = null;
      ADMIN_FLASHCARDS_STATE.editingNativeState = null;
      updateFlashcardsSelectionDependentUI(document.getElementById('admin-flashcards-content'));
    };

    // Só assusta a professora com o aviso de reset quando um reset vai
    // realmente acontecer -- diferente do form legado (que sempre
    // incrementa, então sempre mostra o aviso), o editor nativo só
    // incrementa quando algo em noteEditorStateContentForComparison()
    // (Fase 6D.1 -- fields/cardGenerationMode/privateNote/languageAppKey)
    // de fato mudou. Cancelar sem alterar nada, então, nunca reseta
    // progresso nem mostra o modal de confirmação.
    if (nextRevision > (c.revision || 0)){
      openFlashcardResetConfirm(doSave);
    } else {
      doSave();
    }
  });
}

function flashcardCardRowHTML(c, showUsername){
  if (ADMIN_FLASHCARDS_STATE.editingCardId === c.id){
    // Cartão já nativo -> sempre edita no editor novo (nunca mostra a
    // versão legada de campos que nem existem mais pra ele -- choices/
    // cloze_sentence ficam null numa Note nativa). Seedado LAZY (só quando
    // ainda não existe um editingNativeState desta sessão de edição) --
    // trocar de Card Type/editar Fields depois não deveria resetar o
    // estado do editor a cada re-render da caixa de cartões.
    if (!ADMIN_FLASHCARDS_STATE.editingNativeState && isNoteFieldsPresent(c) && isCardGenerationModePresent(c)){
      ADMIN_FLASHCARDS_STATE.editingNativeState = createNativeNoteEditorStateFromRow(c);
    }
    if (ADMIN_FLASHCARDS_STATE.editingNativeState) return flashcardNativeEditFormHTML(c, ADMIN_FLASHCARDS_STATE.editingNativeState);
    return flashcardEditFormHTML(c);
  }
  return `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(c.__studentUsername || '?')}</span> · ` : ''}${flashcardFrontSummaryHTML(c)} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}${flashcardFormatBadgesHTML(c) ? ' · ' + flashcardFormatBadgesHTML(c) : ''}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="admin-badge-delete-btn" data-preview-flashcard="${c.id}" title="Pré-visualizar como o aluno vai ver na Revisão">👁</button>
        <button class="admin-badge-delete-btn" data-edit-flashcard="${c.id}" title="Editar">✏️</button>
        <button class="admin-badge-delete-btn" data-toggle-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
        <button class="admin-badge-delete-btn" data-delete-flashcard="${c.id}" title="Apagar permanentemente">🗑</button>
      </div>
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
  // Prop 4 (ver CLAUDE.md, "7 propostas") -- cacheia a lista buscada pra
  // wireFlashcardsCardsBox() achar o objeto completo do cartão em edição
  // sem precisar refazer a busca de rede.
  ADMIN_FLASHCARDS_STATE._cardsCache = cards;
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
  // Fase 6D.7 (ver CLAUDE.md) -- Preview a partir de uma linha JÁ SALVA
  // (nativa ou legada), sempre usando o idioma REAL daquela linha
  // (c.language_app_key), nunca o idioma do site onde o Painel de Admin
  // está sendo visto agora -- a professora pode estar em fr/index.html
  // gerenciando um aluno de mandarim (anyMandarim já cobre esse cenário
  // pra criação), e o Preview precisa resolver pronúncia/pinyin contra o
  // idioma certo independente disso.
  cardsBox.querySelectorAll('[data-preview-flashcard]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.previewFlashcard);
      const card = ADMIN_FLASHCARDS_STATE._cardsCache.find(c => c.id === id);
      if (!card){ openFlashcardPreviewWithError('Não foi possível carregar este cartão pra pré-visualizar.'); return; }
      openFlashcardPreviewFromRow(card, { appKey: card.language_app_key, origin: 'teacher' });
    });
  });
  cardsBox.querySelectorAll('[data-toggle-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setFlashcardStatus(btn.dataset.toggleFlashcard, btn.dataset.nextStatus);
      const selectedStudents = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
    });
  });
  // Prop 4 (ver CLAUDE.md, "7 propostas") -- Editar/Apagar.
  cardsBox.querySelectorAll('[data-edit-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      ADMIN_FLASHCARDS_STATE.editingCardId = Number(btn.dataset.editFlashcard);
      // Fase 6D.6 (ver CLAUDE.md) -- toda NOVA edição começa sem
      // editingNativeState -- flashcardCardRowHTML() semeia de novo se o
      // cartão for nativo, ou continua null (legado, sem toggle ainda
      // clicado) até a professora explicitamente pedir o editor novo.
      ADMIN_FLASHCARDS_STATE.editingNativeState = null;
      const selectedStudents = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
    });
  });
  cardsBox.querySelectorAll('[data-delete-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Isso vai apagar o cartão e todo o histórico de revisão permanentemente. Não pode ser desfeito. Continuar?')) return;
      await deleteFlashcardPermanently(btn.dataset.deleteFlashcard);
      showToast('Cartão apagado.');
      const selectedStudents = ADMIN_FLASHCARDS_STATE._studentsCache.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
    });
  });
  // Se um cartão está em edição, o HTML acima já renderizou
  // flashcardEditFormHTML()/flashcardNativeEditFormHTML() no lugar da
  // linha normal (ver flashcardCardRowHTML) -- falta só wirear os
  // handlers do form certo (Fase 6D.6: editingNativeState decide qual).
  if (ADMIN_FLASHCARDS_STATE.editingCardId != null){
    const editingCard = ADMIN_FLASHCARDS_STATE._cardsCache.find(c => c.id === ADMIN_FLASHCARDS_STATE.editingCardId);
    if (editingCard){
      if (ADMIN_FLASHCARDS_STATE.editingNativeState){
        wireFlashcardNativeEditForm(editingCard, ADMIN_FLASHCARDS_STATE.editingNativeState, cardsBox);
      } else {
        wireFlashcardEditForm(editingCard, cardsBox);
      }
    }
  }
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
  // Fase 6D.5 (ver CLAUDE.md) -- mesma regra do render inicial: só o
  // booleano relevante pra validação (compareAnswer/pinyin obrigatório),
  // mutação pura de estado, NUNCA dispara re-render da caixa "Campos
  // nativos" (que só re-renderiza por sua própria mudança estrutural).
  ADMIN_FLASHCARDS_STATE.nativeCardState.languageAppKey = anyMandarim ? 'mandarim' : null;
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

  // Seletor de direção (Prop 1+2, grillado): não se aplica ao zh -- hanzi
  // (front_pinyin+back_hanzi) é um par inseparável, sem back_pinyin pra
  // completar a inversão -- ver CLAUDE.md pra achado completo. Também não
  // se aplica ao modo cloze (não tem noção de "frente"/"verso").
  const directionWrap = document.getElementById('admin-flashcard-direction-wrap');
  if (directionWrap) directionWrap.style.display = (!anyMandarim && modeChecked !== 'cloze') ? '' : 'none';
  const directionLabels = adminFlashcardDirectionLabels(selectedStudents);
  const directionTargetLabel = document.getElementById('admin-flashcard-direction-target-label');
  if (directionTargetLabel) directionTargetLabel.textContent = directionLabels.targetFirst;
  const directionNativeLabel = document.getElementById('admin-flashcard-direction-native-label');
  if (directionNativeLabel) directionNativeLabel.textContent = directionLabels.nativeFirst;

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
  // Fase 6D.2 (ver CLAUDE.md) -- nativeCardState reinicia a cada render
  // COMPLETO (carregamento inicial + depois de um submit bem sucedido),
  // mesmo ciclo de vida do resto do formulário (frente/verso/modo voltam
  // ao padrão). Nunca resetado por updateFlashcardsSelectionDependentUI()
  // (re-render incremental por seleção de aluno/idioma) -- só aqui.
  ADMIN_FLASHCARDS_STATE.nativeCardState = createNativeNoteEditorState({ cardGenerationMode: 'normal' });
  ADMIN_FLASHCARDS_STATE.editingNativeState = null;
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
  // Fase 6D.5 (ver CLAUDE.md) -- languageAppKey do editor nativo espelha o
  // mesmo sinal `anyMandarim` que o resto desta função já usa pra decidir
  // se pinyin é exigido (mistura fr+pt não precisa de compareAnswer, só
  // mandarim precisa) -- nunca escolhe um idioma "representante" arbitrário
  // pra seleção mista, só o booleano relevante pra validação.
  ADMIN_FLASHCARDS_STATE.nativeCardState.languageAppKey = anyMandarim ? 'mandarim' : null;
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
  //
  // Sem pill "Todos" de propósito -- pedido explícito da autora: um cartão
  // (áudio próprio + pronúncia automática/TTS) só faz sentido pra UM idioma
  // por vez, então misturar alunos de idiomas diferentes na mesma seleção
  // gera pronúncia errada pra quem não é do idioma escolhido no momento da
  // criação. Sempre exatamente 1 idioma ativo quando há 2+ presentes -- o
  // filtro deixa de ser "visualização", vira a própria trava de seleção.
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  if (langsPresent.length > 1 && !langsPresent.includes(ADMIN_FLASHCARDS_STATE.langFilter)){
    ADMIN_FLASHCARDS_STATE.langFilter = langsPresent[0];
  }
  const langFilterHTML = langsPresent.length > 1 ? `
    <div class="leaderboard-tabs" role="tablist" aria-label="Filtrar por idioma" style="justify-content:flex-start; margin-bottom:8px;">
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

        <!-- Prop 1+2 (ver CLAUDE.md, "7 propostas") -- qual lado tem o
             idioma estudado; decide (a) o rótulo dos campos abaixo e (b)
             qual lado recebe a pronúncia automática. Só aparece quando
             NENHUMA aluna selecionada é de mandarim -- não existe um
             "back_pinyin" pra completar o par hanzi+pinyin se invertido
             no zh (ver comentário em fr/zh app.js, buildCardFromTeacherFlashcard). -->
        <div id="admin-flashcard-direction-wrap" style="${anyMandarim ? 'display:none;' : ''}">
          <div class="section-label" style="margin:18px 0 4px;">Idioma de cada lado</div>
          <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
            <input type="radio" name="admin-flashcard-direction" value="target-front" checked>
            <span id="admin-flashcard-direction-target-label">${adminFlashcardDirectionLabels(selectedStudents).targetFirst}</span>
          </label>
          <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
            <input type="radio" name="admin-flashcard-direction" value="target-back">
            <span id="admin-flashcard-direction-native-label">${adminFlashcardDirectionLabels(selectedStudents).nativeFirst}</span>
          </label>
        </div>

        <!-- Fase 6D.2 da reestruturação Note/CardType/CardInstance (ver
             CLAUDE.md) -- seletor NOVO, aditivo, ao lado do "Modo de
             prática" legado acima (que continua existindo e continua
             sendo o único lido na hora de salvar). Este seletor só existe
             pra provar a seleção explícita de Card Type contra o novo
             estado nativo (ADMIN_FLASHCARDS_STATE.nativeCardState) --
             zero efeito no cartão criado nesta subfase. -->
        <div class="section-label" style="margin:18px 0 4px;">Card Type (novo motor, Fase 6D)</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Escolha o tipo do cartão nativo abaixo. Só vale se você preencher "Campos nativos" -- deixando aquela seção vazia, o "Modo de prática" acima continua decidindo o cartão salvo.</p>
        <select id="admin-flashcard-card-type-preview" class="profile-edit-input">
          ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === 'normal' ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>

        <!-- Fase 6D.3 da reestruturação Note/CardType/CardInstance (ver
             CLAUDE.md) -- editor de Fields nativos reutilizável
             (shared/flashcard-field-editor.js), conectado a
             ADMIN_FLASHCARDS_STATE.nativeCardState.fields. Mesmo espírito
             aditivo do seletor de Card Type acima (Fase 6D.2): não afeta o
             cartão criado nesta subfase, o "Modo de prática" legado
             continua sendo o único lido no submit. -->
        <div class="section-label" style="margin:14px 0 4px;">Campos nativos (novo motor, Fase 6D)</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Assim que você adicionar um campo aqui, ELE (não o "Conteúdo" abaixo) vira o cartão salvo ao clicar "Criar cartão". Deixe vazio pra continuar usando o formulário de sempre.</p>
        <div id="admin-flashcard-native-fields"></div>
        <button type="button" class="admin-select-link" id="admin-flashcard-preview-btn" style="background:none; border:none; cursor:pointer; margin:6px 0 0;">👁️ Pré-visualizar</button>

        <div class="section-label" style="margin:18px 0 6px;">Conteúdo</div>
        <div id="admin-flashcard-content-main">
          <label class="profile-edit-label" id="admin-flashcard-front-label" for="admin-flashcard-front">Frente</label>
          <textarea id="admin-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="${anyMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}"></textarea>
          <p class="profile-edit-field-error" id="admin-flashcard-front-error"></p>
          <div id="admin-flashcard-pinyin-wrap" style="${anyMandarim ? '' : 'display:none;'}">
            <label class="profile-edit-label" for="admin-flashcard-pinyin">Pinyin (usado só nos alunos de mandarim selecionados)</label>
            <input type="text" id="admin-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
          </div>
          <label class="profile-edit-label" id="admin-flashcard-back-label" for="admin-flashcard-back">Verso</label>
          <textarea id="admin-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="ex: a biblioteca"></textarea>
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
        <p class="profile-edit-hint" id="admin-flashcard-resources-hint" style="margin-top:-2px;">${FLASHCARD_RESOURCES_HINT.flip}</p>
        <label class="profile-edit-label" for="admin-flashcard-note">Nota</label>
        <textarea id="admin-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="contexto, dica de uso..."></textarea>
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

  // "Selecionar todos" respeita o filtro de idioma ativo (quando há 2+
  // idiomas presentes) -- sem isso, marcar "todos" poderia juntar alunos de
  // idiomas diferentes na mesma seleção pela porta dos fundos, quebrando a
  // mesma trava que a remoção da pill "Todos" (acima) existe pra garantir.
  document.getElementById('admin-flashcard-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    const eligible = langsPresent.length > 1
      ? students.filter(s => s.language_app_key === ADMIN_FLASHCARDS_STATE.langFilter)
      : students;
    ADMIN_FLASHCARDS_STATE.studentIds = new Set(eligible.map(s => s.student_id));
    wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => { cb.checked = eligible.some(s => s.student_id === cb.value); });
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
      if (ADMIN_FLASHCARDS_STATE.langFilter === pill.dataset.langFilter) return;
      ADMIN_FLASHCARDS_STATE.langFilter = pill.dataset.langFilter;
      // Trocar de idioma sempre zera a seleção -- é o que de fato GARANTE
      // que nunca existe seleção mista entre idiomas (o filtro deixou de
      // ser só uma lente de visualização, ver comentário acima de
      // langFilterHTML). Sem isso, um aluno marcado em "Francês" continuaria
      // marcado (só escondido) ao trocar pra "Português".
      ADMIN_FLASHCARDS_STATE.studentIds = new Set();
      wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => { cb.checked = false; });
      wrap.querySelectorAll('[data-lang-filter]').forEach(p => p.classList.toggle('active', p === pill));
      applyFlashcardPickerFilters(wrap);
      updateFlashcardsSelectionDependentUI(wrap);
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
      document.getElementById('admin-flashcard-front-label').textContent = mode === 'mc' ? 'Pergunta/termo' : 'Frente';
      document.getElementById('admin-flashcard-back-label').textContent = mode === 'mc' ? 'Resposta correta' : 'Verso';
      const anyMandarimNow = ADMIN_FLASHCARDS_STATE._studentsCache.some(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) && s.language_app_key === 'mandarim');
      document.getElementById('admin-flashcard-cloze-pinyin-wrap').style.display = (mode === 'cloze' && anyMandarimNow) ? '' : 'none';
      // Prop 1+2 (grillado, ver CLAUDE.md): direção não se aplica ao modo
      // cloze (sem noção de frente/verso) nem ao zh (par hanzi/pinyin
      // inseparável) -- o wrap já nasce escondido pro zh (ver HTML).
      const directionWrapEl = document.getElementById('admin-flashcard-direction-wrap');
      if (directionWrapEl && !anyMandarimNow) directionWrapEl.style.display = mode === 'cloze' ? 'none' : '';
      // Fase 4 da reestruturação (ver CLAUDE.md) -- texto de apoio de
      // "Recursos opcionais" muda conforme o modo (Imagem/Áudio continuam
      // sempre visíveis nos 3, só a explicação de ONDE eles aparecem muda).
      document.getElementById('admin-flashcard-resources-hint').textContent = FLASHCARD_RESOURCES_HINT[mode];
      // Fase 2 da reestruturação (ver CLAUDE.md) -- trocar de modo esconde
      // um bloco de campo inteiro; nenhum erro marcado nele deveria
      // continuar visível quando ele reaparecer num estado limpo.
      clearAllFlashcardFieldErrors();
    });
  });

  // Fase 6D.2 (ver CLAUDE.md) -- seletor NOVO, puramente aditivo: só muta
  // ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode, nunca cria
  // um campo paralelo/duplicado (`selectedCardType`/`isReverse`/etc.), não
  // dispara nenhuma chamada de rede/gravação, e não altera a visibilidade
  // dos blocos de Conteúdo legados (esses continuam controlados só pelo
  // radio "Modo de prática" de sempre, ver listener acima). O submit
  // handler abaixo continua lendo só o radio legado -- a persistência
  // nativa (gravar fields/card_generation_mode de verdade) é a Fase 6D.6.
  document.getElementById('admin-flashcard-card-type-preview')?.addEventListener('change', (e) => {
    const newMode = e.target.value;
    // Fase 6D.5 (ver CLAUDE.md, restrição 12) -- sair do modo cloze pra
    // qualquer outro nunca deixa sintaxe {{cN::...}} presa num Field que o
    // Card Type novo vai ler como texto puro -- reverte todas as marcas
    // pro próprio texto (answer) ANTES de trocar o modo. Checado ANTES da
    // atribuição, porque depois dela `cardGenerationMode` já não seria
    // mais 'cloze'.
    const wasCloze = ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode === 'cloze';
    if (wasCloze && newMode !== 'cloze') stripClozeMarksFromEditorState(ADMIN_FLASHCARDS_STATE.nativeCardState);
    // Fase 6D.4a/6D.4b/6D.5 (ver CLAUDE.md) -- trocar PRA multiple_choice/
    // type_answer/cloze passa pela transição dedicada de cada um
    // (reaproveita Fields sem role existentes de forma determinística,
    // nunca inventa conteúdo/distrator) em vez de só atribuir o modo;
    // qualquer outra troca continua sendo a atribuição direta de sempre
    // (normal_reversed não ganhou transição própria ainda -- fora do
    // escopo destas subfases).
    if (newMode === 'multiple_choice') transitionToMultipleChoice(ADMIN_FLASHCARDS_STATE.nativeCardState);
    else if (newMode === 'type_answer') transitionToTypeAnswer(ADMIN_FLASHCARDS_STATE.nativeCardState);
    else if (newMode === 'cloze') transitionToCloze(ADMIN_FLASHCARDS_STATE.nativeCardState);
    else ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode = newMode;
    refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), ADMIN_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'admin-native' });
  });

  // Fase 6D.7 (ver CLAUDE.md) -- Preview do RASCUNHO atual do editor
  // nativo (não salvo) -- reaproveita o MESMO estado que o submit já lê
  // (ADMIN_FLASHCARDS_STATE.nativeCardState), nunca uma cópia separada.
  // `languageAppKey` já é mantido correto por updateFlashcardsSelectionDependentUI()
  // a cada troca de seleção de aluno ('mandarim' ou null); 'frances' é o
  // fallback quando null -- hoje o único outro caso real (nenhum aluno de
  // mandarim selecionado).
  document.getElementById('admin-flashcard-preview-btn')?.addEventListener('click', () => {
    openFlashcardPreviewFromEditorState(ADMIN_FLASHCARDS_STATE.nativeCardState, {
      appKey: ADMIN_FLASHCARDS_STATE.nativeCardState.languageAppKey || 'frances',
      origin: 'teacher',
    });
  });

  // Fase 6D.3/6D.4a (ver CLAUDE.md) -- caixa "Campos nativos", renderizada/
  // wireada UMA vez aqui (carregamento inicial + depois de um submit bem
  // sucedido, mesmo ciclo de vida de nativeCardState em si).
  // refreshNativeCardTypeBox() decide entre o editor estruturado de
  // Multiple Choice (6D.4a) e o Field editor genérico (6D.3) conforme o
  // Card Type atual -- add/remove/mudança estrutural re-renderiza só esta
  // caixa, nunca o form inteiro.
  refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), ADMIN_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'admin-native' });

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

    // Fase 6D.6 da reestruturação Note/CardType/CardInstance (ver
    // CLAUDE.md) -- a "Campos nativos" (Fase 6D.2-6D.5) deixa de ser só
    // pré-visualização a partir daqui: assim que a professora adicionou
    // pelo menos 1 campo nela, ESSE é o cartão que "Criar cartão" salva --
    // o "Modo de prática"/Frente/Verso legados abaixo são ignorados por
    // completo nesse caso (nunca misturados como 2ª fonte de verdade,
    // Seção 2). Com a caixa vazia (0 campos, o estado inicial de sempre),
    // o comportamento continua 100% legado, byte a byte idêntico a antes
    // desta fase -- "legacy aberto != automaticamente migrado" (Seção 6)
    // cumprido por construção: nada aqui decide converter sozinho, só a
    // presença de conteúdo que a própria professora escolheu criar no
    // editor novo.
    const nativeState = ADMIN_FLASHCARDS_STATE.nativeCardState;
    const useNative = isNativeNoteEditorState(nativeState) && (nativeState.fields || []).length > 0;
    if (useNative){
      // "Nota" é o único campo do bloco legado "Recursos opcionais" que
      // faz sentido ler aqui -- é um texto simples sem ambiguidade de
      // modo (mesmo papel em native/legacy: lembrete privado da
      // professora, nunca mostrado ao aluno), fica visível na tela
      // independente do Card Type escolhido. Imagem/áudio NÃO são lidos
      // pro caminho nativo -- Seção 15 desta fase proíbe implementar
      // upload/mídia nova; o editor de Field (6D.3) ainda não tem UI pra
      // anexar mídia a um Field, só preserva o que já existir.
      nativeState.privateNote = (document.getElementById('admin-flashcard-note').value || '').trim() || null;
      const v = validateNoteEditorStateForSave(nativeState);
      if (!v.ok){
        errorEl.textContent = v.error;
        return;
      }
      btn.disabled = true;
      const results = await Promise.all(selectedNow.map(s => createFlashcard({
        studentId: s.student_id,
        languageAppKey: s.language_app_key,
        nativeState,
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
      renderAdminFlashcardsView();
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

    // Prop 1+2 (grillado, ver CLAUDE.md): direção só existe na UI quando o
    // wrap está visível (não-cloze, não-mandarim) -- pra qualquer outro
    // caso (cloze, ou seleção com mandarim) o padrão `true` (frente =
    // idioma estudado) é o único comportamento que sempre existiu, então
    // nunca lê um radio que pode nem estar renderizado.
    const directionRadio = wrap.querySelector('input[name="admin-flashcard-direction"]:checked');
    const frontIsTargetLanguage = directionRadio ? directionRadio.value !== 'target-back' : true;

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
      // zh nunca lê este campo (par hanzi/pinyin inseparável, ver
      // CLAUDE.md) -- grava o padrão `true` pra linha de mandarim mesmo
      // que uma seleção mista fr+zh tenha ficado com o wrap escondido.
      frontIsTargetLanguage: s.language_app_key === 'mandarim' ? true : frontIsTargetLanguage,
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
