// ---------- Cartões (painel da professora) -- Fase 2/3 do sistema de alunos particulares ----------
// ATENÇÃO (2026-10-12): a TELA foi reconstruída no Design System do painel (abas Criar cartão / Cartões criados / Banco de
// Revisão, lista em tabela, edição e mudança de Deck em janelas). As peças de HTML ficam em shared/teacher-cards-ui.js; o
// controlador novo está no fim deste arquivo (renderAdminFlashcardsView, adminCardsBind...). Os comentários históricos abaixo
// descrevem a lógica de domínio, que continua valendo, mas citam nomes antigos que não existem mais:
//   updateFlashcardsSelectionDependentUI -> adminSelectionChanged; buildFlashcardsCardsBoxHTML/wireFlashcardsCardsBox ->
//   adminCardsReload/adminCardsRefreshList + tccListBodyHTML; flashcardCardRowHTML -> tccRowHTML + adminOpenCardEditor.
//
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
//   - shared/teacher-cards-ui.js   (tcc* -- peças de HTML da tela nova), shared/teacher-students-ui.js (tsuNorm, tsuTp)
//   - shared/painel/painel-ui.js   (PainelUI.confirmar), shared/toast.js (showToast)
//   - languages/<lang>/app.js      (isAdminUser)
//
// CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- SUPERA os históricos "Reestruturação
// Fase 1-4" acima: o formulário legado de CRIAÇÃO ("Modo de prática"/
// "Idioma de cada lado"/Frente-Verso-pinyin/campos de MC-Cloze legados/
// "Recursos opcionais" no nível do cartão -- tudo descrito acima) foi
// REMOVIDO da tela de criação. Único fluxo agora: Tipo de cartão -> Campos
// -> Pré-visualizar -> Salvar, sempre nativo, sem bifurcação legacy/native
// no submit. O histórico acima continua registrado por completude (é como
// o formulário de EDIÇÃO de um cartão legado -- flashcardEditFormHTML/
// wireFlashcardEditForm, intocados nesta fase -- ainda se comporta), mas
// não descreve mais a tela de CRIAÇÃO.

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
//
// CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- editingNativeConversionBaseline: um
// CLONE (cloneNoteEditorState, round-trip JSON -- nunca a mesma
// referência) do editorState produzido no INSTANTE da conversão
// Legacy->Native (logo depois de nativeNoteEditorStateFromLegacyRow()),
// antes de qualquer edição do usuário. Único ponto de comparação pra
// decidir, no save, se a conversão preserva revision/FSRS (nada mudou
// desde a conversão) ou se precisa incrementar (usuário editou algo
// depois de converter) -- mesmo mecanismo (noteEditorStateRequiresNewRevision)
// já usado pra edição nativa->nativa, nunca uma 2ª implementação de
// comparação. `null` sempre que não há uma conversão em andamento nesta
// sessão de edição -- limpo em todo ponto que também zera editingNativeState.
let ADMIN_FLASHCARDS_STATE = { studentIds: new Set(), langFilter: 'all', _studentsCache: [], editingCardId: null, editingNativeState: null, editingNativeConversionBaseline: null, _cardsCache: [], _truncated: false, decksByLang: {}, destByStudent: {}, _ensuredKeys: new Set(), _destToken: 0, _renderToken: 0, _ligado: false, _destAbertos: new Set(), tab: 'criar', page: 1, filtros: { aluno: '', status: 'active', busca: '' }, preselect: null, nativeCardState: createNativeNoteEditorState({ cardGenerationMode: 'normal' }) };

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
  get flip(){ return t('admin.flashcards.hint.flip'); },
  get mc(){ return t('admin.flashcards.hint.mc'); },
  get cloze(){ return t('admin.flashcards.hint.cloze'); },
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
  { id: 'normal', get label(){ return t('admin.flashcards.cardType.normal'); } },
  { id: 'normal_reversed', get label(){ return t('admin.flashcards.cardType.normalReversed'); } },
  { id: 'multiple_choice', get label(){ return t('admin.flashcards.cardType.multipleChoice'); } },
  { id: 'type_answer', get label(){ return t('admin.flashcards.cardType.typeAnswer'); } },
  { id: 'cloze', get label(){ return t('admin.flashcards.cardType.cloze'); } },
];

// CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- matriz Free/Premium aprovada no
// CONSOLIDAÇÃO-0 (seção 10): plano grátis só vê "Normal" no seletor de
// Card Type; os outros 4 tipos ficam atrás de Premium. Professora/admin
// nunca chama isto (não tem gate de plano, sempre vê os 5 -- mesmo
// comportamento de antes desta fase); usado só por shared/my-flashcards.js
// no formulário de CRIAÇÃO. Editar um cartão já existente continua
// mostrando os 5 (fora do escopo desta fase -- edição nunca foi gateada).
function cardTypeUIMetaForEntitlement(premium){
  return premium ? CARD_TYPE_UI_META : CARD_TYPE_UI_META.filter(t => t.id === 'normal');
}

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
      targetFirst: t('myFlashcards.dir.generic.targetFirst'),
      nativeFirst: t('myFlashcards.dir.generic.nativeFirst'),
    };
  }
  return {
    targetFirst: t('myFlashcards.dir.targetFirst', { target: myFlashcardLangName(pair.target), native: myFlashcardLangName(pair.native) }),
    nativeFirst: t('myFlashcards.dir.nativeFirst', { target: myFlashcardLangName(pair.target), native: myFlashcardLangName(pair.native) }),
  };
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
      <div class="section-label" style="margin:0;">${t('admin.flashcards.edit.title')}</div>
      <button type="button" class="admin-select-link" id="edit-flashcard-use-native" style="align-self:flex-start; background:none; border:none; cursor:pointer; padding:0;">${t('myFlashcards.edit.useNative')}</button>
      <p class="profile-edit-error" id="edit-flashcard-use-native-error"></p>

      <div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="flip" ${mode === 'flip' ? 'checked' : ''}>${t('admin.flashcards.edit.modeFlip')}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="mc" ${mode === 'mc' ? 'checked' : ''}>${t('admin.flashcards.edit.modeMc')}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-mode" value="cloze" ${mode === 'cloze' ? 'checked' : ''}>${t('admin.flashcards.edit.modeCloze')}
        </label>
      </div>

      ${!isMandarim ? `
      <div id="edit-flashcard-direction-wrap" style="${mode === 'cloze' ? 'display:none;' : ''}">
        <div class="section-label" style="margin:0 0 4px;">${t('myFlashcards.edit.sideLanguage')}</div>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-direction" value="target-front" ${direction === 'target-front' ? 'checked' : ''}> ${adminFlashcardDirectionLabels([c]).targetFirst}
        </label>
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:400;">
          <input type="radio" name="edit-flashcard-direction" value="target-back" ${direction === 'target-back' ? 'checked' : ''}> ${adminFlashcardDirectionLabels([c]).nativeFirst}
        </label>
      </div>` : ''}

      <div id="edit-flashcard-content-main" style="${mode === 'cloze' ? 'display:none;' : ''}">
        <label class="profile-edit-label" id="edit-flashcard-front-label">${mode === 'mc' ? t('admin.flashcards.edit.question') : t('myFlashcards.edit.front')}</label>
        <textarea id="edit-flashcard-front" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.front || '')}</textarea>
        ${isMandarim ? `
        <label class="profile-edit-label">${t('myFlashcards.edit.pinyin')}</label>
        <input type="text" id="edit-flashcard-pinyin" class="profile-edit-input" value="${escapeHTML(c.front_pinyin || '')}">` : ''}
        <label class="profile-edit-label" id="edit-flashcard-back-label">${mode === 'mc' ? t('mcEditor.answerLabel') : t('myFlashcards.edit.back')}</label>
        <textarea id="edit-flashcard-back" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.back_trans || '')}</textarea>
        <div id="edit-flashcard-mc-fields" style="${mode === 'mc' ? '' : 'display:none;'} margin:4px 0 0;">
          <label class="profile-edit-label">${t('admin.flashcards.edit.mc1')}</label>
          <input type="text" id="edit-flashcard-mc-1" class="profile-edit-input" value="${escapeHTML(choices[0] || '')}">
          <label class="profile-edit-label">${t('admin.flashcards.edit.mc2')}</label>
          <input type="text" id="edit-flashcard-mc-2" class="profile-edit-input" value="${escapeHTML(choices[1] || '')}">
          <label class="profile-edit-label">${t('admin.flashcards.edit.mc3')}</label>
          <input type="text" id="edit-flashcard-mc-3" class="profile-edit-input" value="${escapeHTML(choices[2] || '')}">
        </div>
      </div>

      <div id="edit-flashcard-content-cloze" style="${mode === 'cloze' ? '' : 'display:none;'}">
        <label class="profile-edit-label">${t('admin.flashcards.edit.clozeSentence')}</label>
        <input type="text" id="edit-flashcard-cloze-sentence" class="profile-edit-input" value="${escapeHTML(c.cloze_sentence || '')}">
        <label class="profile-edit-label">${t('admin.flashcards.edit.clozeAnswer')}</label>
        <input type="text" id="edit-flashcard-cloze-answer" class="profile-edit-input" value="${escapeHTML(c.cloze_answer || '')}">
        ${isMandarim ? `
        <label class="profile-edit-label">${t('admin.flashcards.edit.clozePinyin')}</label>
        <input type="text" id="edit-flashcard-cloze-pinyin" class="profile-edit-input" value="${escapeHTML(c.cloze_answer_pinyin || '')}">` : ''}
        <label class="profile-edit-label">${t('clozeEditor.translationTitle')}</label>
        <textarea id="edit-flashcard-cloze-trans" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.back_trans || '')}</textarea>
      </div>

      <div>
        <label class="profile-edit-label">${t('publicProfile.labelNote')}</label>
        <textarea id="edit-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2">${escapeHTML(c.note || '')}</textarea>
        <label class="profile-edit-label">${t('admin.flashcards.edit.image')}${c.image_url ? t('admin.flashcards.edit.hasOne') : ''}</label>
        <input type="file" id="edit-flashcard-image" class="profile-edit-input" accept="image/*">
        <label class="profile-edit-label">${t('admin.flashcards.edit.ownAudio')}${c.audio_url ? t('admin.flashcards.edit.hasOneAudio') : ''}</label>
        <input type="file" id="edit-flashcard-audio" class="profile-edit-input" accept="audio/*">
      </div>

      <p class="profile-edit-error" id="edit-flashcard-error"></p>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-secondary" id="edit-flashcard-cancel" style="flex:1;">${t('myFlashcards.edit.cancel')}</button>
        <button type="button" class="btn btn-primary" id="edit-flashcard-save" style="flex:1;">${t('profile.save')}</button>
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
      if (frontLabel) frontLabel.textContent = mode === 'mc' ? t('admin.flashcards.edit.question') : t('myFlashcards.edit.front');
      if (backLabel) backLabel.textContent = mode === 'mc' ? t('mcEditor.answerLabel') : t('myFlashcards.edit.back');
    });
  });

  // Fase 6D.6 (ver CLAUDE.md) -- ação EXPLÍCITA de conversão Legacy->Native
  // (nunca automática): clicar aqui monta um Note editor state a partir
  // do conteúdo JÁ EXISTENTE deste cartão (nativeNoteEditorStateFromLegacyRow,
  // shared/flashcard-native-persistence.js -- preserva front/back_trans/
  // choices/cloze_sentence+cloze_answer(+pinyin)/audio_url, nunca começa
  // em branco) e troca a exibição pro editor nativo -- mas NADA é salvo
  // ainda; só o clique em "Salvar" do formulário nativo grava de verdade.
  //
  // Fase 6D.8 (ver CLAUDE.md, Seção 6/18) -- legacyFlashcardConversionPreflight()
  // roda ANTES: bloqueia (sem trocar de tela) os 2 casos em que o
  // mapeamento em si é indeterminável (Cloze sem "___" exato, MC sem
  // resposta certa definida) -- nunca converte "adivinhando" nem produz
  // uma Nota nativa que parece válida mas está errada.
  document.getElementById('edit-flashcard-use-native')?.addEventListener('click', async () => {
    const errorEl = document.getElementById('edit-flashcard-use-native-error');
    const preflight = legacyFlashcardConversionPreflight(c);
    if (!preflight.ok){ if (errorEl) errorEl.textContent = preflight.error; return; }
    if (errorEl) errorEl.textContent = '';
    ADMIN_FLASHCARDS_STATE.editingNativeState = nativeNoteEditorStateFromLegacyRow(c);
    // CONSOLIDAÇÃO-2 -- baseline capturado ANTES de qualquer mutação do
    // usuário (clone, nunca a mesma referência que o Field editor vai
    // mutar em seguida) -- é contra ISTO que o save compara pra decidir
    // se revision precisa incrementar (ver wireFlashcardNativeEditForm).
    ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = cloneNoteEditorState(ADMIN_FLASHCARDS_STATE.editingNativeState);
    adminOpenCardEditor(c.id, { keepState: true });   // reabre a mesma edição, agora no editor novo
  });

  document.getElementById('edit-flashcard-cancel').addEventListener('click', () => {
    adminCloseCardEditor(false);
  });

  document.getElementById('edit-flashcard-save').addEventListener('click', () => {
    const errorEl = document.getElementById('edit-flashcard-error');
    errorEl.textContent = '';
    const mode = container.querySelector('input[name="edit-flashcard-mode"]:checked').value;
    const isMC = mode === 'mc';
    const isCloze = mode === 'cloze';
    const direction = container.querySelector('input[name="edit-flashcard-direction"]:checked')?.value || 'target-front';

    if (!isCloze){
      if (!document.getElementById('edit-flashcard-front').value.trim()){ errorEl.textContent = t('admin.flashcards.edit.err.front'); return; }
      if (!document.getElementById('edit-flashcard-back').value.trim()){ errorEl.textContent = t('admin.flashcards.edit.err.back'); return; }
      if (isMC){
        const anyChoice = ['edit-flashcard-mc-1', 'edit-flashcard-mc-2', 'edit-flashcard-mc-3'].some(id => document.getElementById(id).value.trim());
        if (!anyChoice){ errorEl.textContent = t('admin.flashcards.edit.err.oneWrongOption'); return; }
      }
    } else {
      const sentence = document.getElementById('edit-flashcard-cloze-sentence').value.trim();
      if ((sentence.match(/___/g) || []).length !== 1){ errorEl.textContent = t('admin.flashcards.edit.err.oneBlank'); return; }
      if (!document.getElementById('edit-flashcard-cloze-answer').value.trim()){ errorEl.textContent = t('admin.flashcards.edit.err.answer'); return; }
      if (isMandarim && !document.getElementById('edit-flashcard-cloze-pinyin').value.trim()){ errorEl.textContent = t('admin.flashcards.edit.err.pinyin'); return; }
      if (!document.getElementById('edit-flashcard-cloze-trans').value.trim()){ errorEl.textContent = t('admin.flashcards.edit.err.trans'); return; }
    }

    adminConfirmReset(async () => {
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
      showToast(t('myFlashcards.toast.editedReset'));
      adminCloseCardEditor(true);
      adminCardsAfterChange();
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
    <p class="p-subtitulo" style="margin:0 0 .5rem;">${t('myFlashcards.native.hint')}</p>
    <label>${t('myFlashcards.native.cardType')}
      <select id="edit-native-flashcard-card-type">
        ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === editorState.cardGenerationMode ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select></label>
    <div id="edit-native-flashcard-fields"></div>
    <div id="edit-native-flashcard-tags"></div>
    <p style="margin:.6rem 0 0;"><button type="button" class="outline p-pequeno" id="edit-native-flashcard-preview-btn">${t('myFlashcards.preview')}</button></p>
    <label>${t('admin.flashcards.native.privateNote')}
      <textarea id="edit-native-flashcard-note" rows="2">${escapeHTML(editorState.privateNote || '')}</textarea></label>
    <p class="profile-edit-error" id="edit-native-flashcard-error" role="alert"></p>
    <div class="p-acoes" style="justify-content:flex-end;">
      <button type="button" class="secondary" id="edit-native-flashcard-cancel">${t('myFlashcards.edit.cancel')}</button>
      <button type="button" id="edit-native-flashcard-save">${t('profile.save')}</button>
    </div>
  `;
}

function wireFlashcardNativeEditForm(c, editorState, container){
  // Fase 7e (ver CLAUDE.md) -- uploadFn/deleteFn são o único ponto de
  // integração que a caixa "Campos nativos" precisa pra oferecer upload
  // de áudio de verdade -- shared/flashcard-field-editor.js nunca chama
  // supabaseClient/Storage direto, só através destas 2 funções. Fase 7f
  // (implementação) -- ttsFn (requestFieldAudioTTS) + noteId (a linha JÁ
  // existe de verdade nesta tela de EDIÇÃO -- editorState.noteId sempre
  // preenchido, mesmo num cartão recém-convertido de legado pra nativo,
  // Fase 6D.8) habilitam o botão "Gerar áudio" de verdade.
  const nativeFieldOpts = { namePrefix: 'edit-native', uploadFn: uploadFlashcardMedia, deleteFn: deleteFlashcardMedia, ttsFn: requestFieldAudioTTS, noteId: editorState.noteId };
  const boxEl = document.getElementById('edit-native-flashcard-fields');
  refreshNativeCardTypeBox(boxEl, editorState, nativeFieldOpts);
  // Fase I (Tags): mount PRÓPRIO, irmão da caixa de Campos (sobrevive a troca de Card Type).
  mountNoteTagsEditor(document.getElementById('edit-native-flashcard-tags'), editorState);

  document.getElementById('edit-native-flashcard-card-type').addEventListener('change', (e) => {
    const newMode = e.target.value;
    const wasCloze = editorState.cardGenerationMode === 'cloze';
    if (wasCloze && newMode !== 'cloze') stripClozeMarksFromEditorState(editorState);
    if (newMode === 'multiple_choice') transitionToMultipleChoice(editorState);
    else if (newMode === 'type_answer') transitionToTypeAnswer(editorState);
    else if (newMode === 'cloze') transitionToCloze(editorState);
    else editorState.cardGenerationMode = newMode;
    refreshNativeCardTypeBox(boxEl, editorState, nativeFieldOpts);
  });

  // Fase 6D.7 (ver CLAUDE.md) -- Preview do rascunho de EDIÇÃO atual
  // (editorState, já mutado por qualquer troca de Card Type/Field feita
  // nesta tela antes de salvar) -- nunca do que já está gravado no banco
  // (c), exatamente a mesma regra "estado atual do editor" da criação.
  // languageAppKey já vem correto de createNativeNoteEditorStateFromRow()/
  // nativeNoteEditorStateFromLegacyRow() (row.language_app_key).
  document.getElementById('edit-native-flashcard-preview-btn')?.addEventListener('click', () => {
    adminPreviewOnTop(() => openFlashcardPreviewFromEditorState(editorState, {
      appKey: editorState.languageAppKey || c.language_app_key || 'frances',
      origin: 'teacher',
    }));
  });

  document.getElementById('edit-native-flashcard-cancel').addEventListener('click', () => {
    // Fase 7e (ver CLAUDE.md) -- cancelar descarta o rascunho inteiro,
    // mesma disciplina de sempre (Seção 16/17); qualquer áudio enviado
    // durante esta sessão de edição nunca chega a ser referenciado por
    // nenhuma linha real, mesmo tratamento de órfão que uma falha de
    // save já recebe.
    adminCloseCardEditor(false);   // descarta o rascunho (e compensa a mídia enviada nesta sessão)
  });

  document.getElementById('edit-native-flashcard-save').addEventListener('click', () => {
    const errorEl = document.getElementById('edit-native-flashcard-error');
    errorEl.textContent = '';
    editorState.privateNote = (document.getElementById('edit-native-flashcard-note').value || '').trim() || null;
    const v = validateNoteEditorStateForSave(editorState);
    if (!v.ok){ errorEl.textContent = v.error; return; }

    // CONSOLIDAÇÃO-2 (ver CLAUDE.md) -- ID sempre preservado (mesmo c.id,
    // nunca um novo, UPDATE sempre na mesma linha). Decisão de revision
    // inteira centralizada em nextRevisionForNativeSave() (shared/
    // flashcard-native-persistence.js, comentário completo lá -- inclui a
    // exceção documentada do Cloze) -- nunca duplicada aqui.
    const nextRevision = nextRevisionForNativeSave(c, editorState, ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline);

    const doSave = async () => {
      const saveBtn = document.getElementById('edit-native-flashcard-save');
      if (saveBtn) saveBtn.disabled = true;
      const result = await updateFlashcardContent(c.id, { revision: nextRevision, nativeState: editorState });
      if (saveBtn) saveBtn.disabled = false;
      if (!result.ok){
        // Fase 7e (ver CLAUDE.md, Seção 14) -- a Note não foi salva:
        // qualquer áudio enviado NESTA sessão de edição nunca chega a
        // ser referenciado por nenhuma linha real -- compensação
        // best-effort pra não deixar lixo acumulando no bucket.
        compensateFreshMediaUploads(editorState);
        errorEl.textContent = result.error;
        return;
      }
      clearFreshMediaUploads(editorState);
      showToast(nextRevision > (c.revision || 0) ? t('myFlashcards.toast.editedReset') : t('myFlashcards.toast.edited'));
      adminCloseCardEditor(true);
      adminCardsAfterChange();
    };

    // Só assusta a professora com o aviso de reset quando um reset vai
    // realmente acontecer -- diferente do form legado (que sempre
    // incrementa, então sempre mostra o aviso), o editor nativo só
    // incrementa quando algo em noteEditorStateContentForComparison()
    // (Fase 6D.1 -- fields/cardGenerationMode/privateNote/languageAppKey)
    // de fato mudou. Cancelar sem alterar nada, então, nunca reseta
    // progresso nem mostra o modal de confirmação.
    if (nextRevision > (c.revision || 0)){
      adminConfirmReset(doSave);
    } else {
      doSave();
    }
  });
}
// ---------- Fase G -- Teacher Decks no Painel (destino por aluno) ----------
//
// Camada de UI mínima sobre shared/deck-engine.js (regras) e
// shared/deck-data.js (I/O). Nenhuma regra de árvore é replicada aqui: só
// aparecem como destino os Decks que getTeacherDecksForStudent() devolve
// (teacher_root + subdecks da PRÓPRIA professora para AQUELE aluno+idioma).

// Fase H (H8) -- alunos REALMENTE selecionados. A seleção guarda só
// student_id, mas um aluno pode ter 2 vínculos (idiomas); com 2+ idiomas
// presentes o idioma ativo (langFilter) decide qual linha vale, senão o
// aluno de francês selecionado também "selecionaria" a linha dele em outro
// idioma e o cartão iria para a árvore errada.
function adminSelectedStudents(students){
  const S = ADMIN_FLASHCARDS_STATE;
  const list = students || S._studentsCache;
  const multiLang = new Set(list.map(x => x.language_app_key)).size > 1;
  return list.filter(x => S.studentIds.has(x.student_id) && (!multiLang || x.language_app_key === S.langFilter));
}

// Fase H (H8) -- o Deck de destino é guardado por aluno+IDIOMA (nunca só
// por aluno): trocar de idioma/contexto nunca reaproveita o deck_id antigo.
function adminDestKey(s){ return `${s.student_id}|${s.language_app_key}`; }

async function loadTeacherDecksByLang(students){
  const langs = [...new Set(students.map(s => s.language_app_key))];
  await Promise.all(langs.map(async lang => {
    if (!ADMIN_FLASHCARDS_STATE.decksByLang[lang]){
      ADMIN_FLASHCARDS_STATE.decksByLang[lang] = await fetchDecksForLanguage(lang);
    }
  }));
}

function teacherTreeForStudent(studentId, languageAppKey){
  return getTeacherDecksForStudent(ADMIN_FLASHCARDS_STATE.decksByLang[languageAppKey] || [],
    { teacherId: CURRENT_USER.id, studentId, languageAppKey });
}

function teacherDeckLabel(deck){
  return deck.kind === 'teacher_root' ? t('admin.flashcards.dest.rootDefault') : deck.name;
}

function teacherDeckOptionsHTML(tree, selectedId){
  return orderedTeacherDecks(tree, tree).map(({ deck, depth }) => {
    const pad = '  '.repeat(depth);
    return `<option value="${deck.id}" ${deck.id === selectedId ? 'selected' : ''}>${pad}${escapeHTML(teacherDeckLabel(deck))}</option>`;
  }).join('');
}

// Fase H (H1/H4) -- árvore de Teacher Decks do aluno, com contagem de cartões (Notes) por Deck e exclusão de Teacher Deck VAZIO.
// A UI só reflete a regra (teacher_root nunca; teacher só sem subdecks e sem cartões); quem decide de verdade é o trigger da
// migration 054 no banco. Nunca há "apagar e mover cartões automaticamente" nem "substituir por outro Deck". A contagem vem da
// lista de cartões já carregada (adminCardsReload), sem uma consulta por aluno.
function fillTeacherTreeLists(box, selected, problems){
  const S = ADMIN_FLASHCARDS_STATE;
  for (const s of selected){
    if (problems && problems[`${s.student_id}|${s.language_app_key}`]) continue;
    const holder = box.querySelector(`[data-tree-list="${s.student_id}"]`);
    if (!holder) continue;
    const notes = S._cardsCache.filter(c => c.student_id === s.student_id && c.language_app_key === s.language_app_key);
    const tree = teacherTreeForStudent(s.student_id, s.language_app_key);
    const rows = orderedTeacherDecks(tree, tree).map(({ deck, depth }) => {
      const own = notes.filter(c => c.deck_id === deck.id).length;
      const kids = tree.filter(d => d.parent_deck_id === deck.id).length;
      return { deck, depth, label: teacherDeckLabel(deck), own, kids, deletable: deck.kind === 'teacher' && kids === 0 && own === 0 };
    });
    holder.innerHTML = tccTreeHTML(rows);
    holder.querySelectorAll('[data-tree-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const list = S.decksByLang[s.language_app_key] || [];
        const deck = getDeckById(list, Number(btn.dataset.treeDelete));
        if (!deck) return;
        const opts = { titulo: t('cards.deck.delete.title'), descricao: t('cards.deck.delete.text', { name: deck.name }), confirmar: t('cards.deck.delete.confirm'), cancelar: t('cards.edit.cancel'), perigo: true };
        const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(t('admin.flashcards.dest.deleteConfirm', { name: deck.name }));
        if (!ok) return;
        const res = await deleteTeacherDeck({ deck, decks: list });
        if (!res.ok){ showToast(res.error || t('admin.flashcards.dest.deleteFailed')); return; }
        S.decksByLang[s.language_app_key] = list.filter(d => d.id !== deck.id);
        if (S.destByStudent[adminDestKey(s)] === deck.id) delete S.destByStudent[adminDestKey(s)];
        showToast(t('admin.flashcards.dest.deleted'));
        renderTeacherDestinationRows(box, selected, problems || {});
        adminCardsRefreshList();
      });
    });
  }
}

function renderTeacherDestinationRows(box, selected, problems){
  const S = ADMIN_FLASHCARDS_STATE;
  // Refazer as linhas (trocar a seleção, criar subdeck) não pode fechar a árvore que a professora deixou aberta.
  const abertos = S._destAbertos;
  box.innerHTML = selected.map(s => {
    const key = `${s.student_id}|${s.language_app_key}`;
    if (problems[key]) return tccDestRowHTML(s, { problem: problems[key] });
    const tree = teacherTreeForStudent(s.student_id, s.language_app_key);
    const root = tree.find(d => d.kind === 'teacher_root');
    const chosen = tree.some(d => d.id === S.destByStudent[adminDestKey(s)]) ? S.destByStudent[adminDestKey(s)] : (root ? root.id : null);
    return tccDestRowHTML(s, { options: teacherDeckOptionsHTML(tree, chosen) });
  }).join('');
  box.querySelectorAll('[data-dest-row] > details').forEach(d => { if (abertos.has(d.parentElement.dataset.destRow)) d.open = true; });
  // Fase H (H1/H4) -- árvore visível por aluno+idioma, com exclusão de Teacher Deck vazio.
  fillTeacherTreeLists(box, selected, problems);
  selected.forEach(s => {
    const sel = box.querySelector(`[data-dest-select="${s.student_id}"]`);
    if (!sel) return;
    S.destByStudent[adminDestKey(s)] = Number(sel.value);
    sel.addEventListener('change', () => { S.destByStudent[adminDestKey(s)] = Number(sel.value); });
    box.querySelector(`[data-dest-newsub="${s.student_id}"]`).addEventListener('click', async () => {
      const errEl = box.querySelector(`[data-dest-err="${s.student_id}"]`);
      errEl.textContent = '';
      const list = S.decksByLang[s.language_app_key] || [];
      const parent = getDeckById(list, Number(sel.value));
      const res = await createTeacherDeck({ name: box.querySelector(`[data-dest-subname="${s.student_id}"]`).value, parentDeck: parent, decks: list });
      if (!res.ok){ errEl.textContent = res.error; return; }
      list.push(res.deck);
      S.destByStudent[adminDestKey(s)] = res.deck.id;
      renderTeacherDestinationRows(box, selected, problems);
      showToast(t('admin.flashcards.dest.subCreated'));
    });
  });
}

// Bootstrap LAZY: só quando o aluno é selecionado no formulário (nunca no
// boot do app). Idempotente (ensure_teacher_decks, migration 053).
async function refreshTeacherDestinationsUI(){
  const box = document.getElementById('admin-flashcard-destinations');
  if (!box) return;
  const S = ADMIN_FLASHCARDS_STATE;
  const selected = adminSelectedStudents(S._studentsCache);
  const token = ++S._destToken;
  if (!selected.length){
    box.innerHTML = `<p class="profile-edit-hint">${t('admin.flashcards.dest.pickStudent')}</p>`;
    return;
  }
  box.innerHTML = `<p class="profile-edit-hint">${t('admin.flashcards.dest.preparing')}</p>`;
  const problems = {};
  const freshLangs = new Set();
  await Promise.all(selected.map(async s => {
    const key = `${s.student_id}|${s.language_app_key}`;
    const ensuredKey = `${CURRENT_USER.id}|${key}`; // por professora (troca de conta na mesma página)
    if (S._ensuredKeys.has(ensuredKey)) return;
    const r = await ensureTeacherDecksForStudent(s.student_id, s.language_app_key);
    if (r.ok){ S._ensuredKeys.add(ensuredKey); freshLangs.add(s.language_app_key); }
    else problems[key] = r.error;
  }));
  if (token !== S._destToken) return;
  freshLangs.forEach(lang => { delete S.decksByLang[lang]; });
  await loadTeacherDecksByLang(selected);
  if (token !== S._destToken) return;
  renderTeacherDestinationRows(box, selected, problems);
}

/* =====================================================================================================================
   RECONSTRUÇÃO NO DESIGN SYSTEM DO PAINEL (Fase 2, tela Cartões, 2026-10-12)
   Tudo daqui para baixo é a tela nova: abas "Criar cartão" / "Cartões criados" / "Banco de Revisão", lista em tabela com
   filtros e paginação, edição e movimentação em janelas. A lógica de domínio (editor nativo de campos, Decks da professora,
   preservar/reiniciar progresso, mídia) é a mesma de antes: só a apresentação mudou. HTML em shared/teacher-cards-ui.js.
   Regra herdada (UX-fix 5): mudar seleção, digitar em filtro ou trocar de aba NUNCA refaz o formulário de criação.
   ===================================================================================================================== */

// Texto do Deck de um cartão (coluna "Deck" da lista).
function adminCardDeckLabel(c){
  if (c.deck_id == null) return t('cards.noDeck');
  const deck = getDeckById(ADMIN_FLASHCARDS_STATE.decksByLang[c.language_app_key] || [], c.deck_id);
  return deck ? teacherDeckLabel(deck) : t('admin.flashcards.dest.deckFallback');
}

// Decks de destino possíveis para mover um cartão (os do mesmo aluno e idioma, menos o atual).
function adminCardMoveTargets(c){
  const tree = teacherTreeForStudent(c.student_id, c.language_app_key);
  return orderedTeacherDecks(tree, tree).filter(({ deck }) => deck.id !== c.deck_id);
}
function adminCardCanMove(c){ return adminCardMoveTargets(c).length > 0; }

// Cada cartão leva o vínculo do aluno (__student); cartões de quem deixou de ser aluno saem da lista.
function adminCardsDecorate(cards){
  const byKey = {}; ADMIN_FLASHCARDS_STATE._studentsCache.forEach(s => { byKey[adminDestKey(s)] = s; });
  return cards.filter(c => byKey[`${c.student_id}|${c.language_app_key}`]).map(c => Object.assign(c, { __student: byKey[`${c.student_id}|${c.language_app_key}`] }));
}

function adminCardsWrap(){ return document.getElementById('admin-flashcards-content'); }
function adminCardsListCtx(){ return { deckLabel: adminCardDeckLabel, canMove: adminCardCanMove }; }

// Atualiza só a tabela (e a contagem da aba), sem tocar nos filtros nem no formulário de criação.
function adminCardsRefreshList(){
  const S = ADMIN_FLASHCARDS_STATE, wrap = adminCardsWrap(); if (!wrap) return;
  const body = wrap.querySelector('[data-cards-lista]');
  if (body) body.innerHTML = tccListBodyHTML(S._cardsCache, S.filtros, S._cardsCache.length, S.page, adminCardsListCtx());
  const tabs = wrap.querySelector('[data-cards-tabs]');
  if (tabs) tabs.innerHTML = tccTabsHTML(S.tab, S._cardsCache.filter(c => c.status === 'active').length);
}

// Busca todos os cartões de novo e atualiza a lista. false = a consulta falhou (a lista antiga continua na tela).
async function adminCardsReload(){
  const S = ADMIN_FLASHCARDS_STATE;
  const r = await fetchAllTeacherFlashcards();
  if (r.cards === null) return false;
  S._cardsCache = adminCardsDecorate(r.cards); S._truncated = r.truncated;
  adminCardsRefreshList();
  return true;
}

// Depois de criar, editar, mover, reativar ou apagar: relê os cartões e refaz a árvore de Decks dos alunos escolhidos.
async function adminCardsAfterChange(){
  await adminCardsReload();
  const box = document.getElementById('admin-flashcard-destinations');
  if (box) fillTeacherTreeLists(box, adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache), {});
}

// Confirmação antes de gravar uma edição que reinicia o progresso (a do painel; o modal antigo só sobra para o lado do aluno).
function adminConfirmReset(onConfirm){
  if (window.PainelUI && PainelUI.confirmar){
    PainelUI.confirmar({ titulo: t('cards.edit.resetTitle'), descricao: t('cards.edit.resetText'), confirmar: t('cards.edit.resetConfirm'), cancelar: t('cards.edit.cancel') }).then(ok => { if (ok) onConfirm(); });
  } else openFlashcardResetConfirm(onConfirm);
}

// O Preview é um modal do site, fora da camada de cima; dentro da janela de edição ele ficaria atrás dela.
// Enquanto a janela está aberta o modal vive dentro dela; ao fechar a janela, volta para o <body>.
function adminPreviewOnTop(openFn){
  const dlg = document.getElementById('dlg-editar-cartao'), modal = document.getElementById('flashcard-preview-modal');
  if (dlg && dlg.open && modal && modal.parentNode !== dlg) dlg.appendChild(modal);
  openFn();
}

function adminCloseCardEditor(saved){
  const S = ADMIN_FLASHCARDS_STATE, d = document.getElementById('dlg-editar-cartao');
  if (!saved && S.editingNativeState && typeof compensateFreshMediaUploads === 'function') compensateFreshMediaUploads(S.editingNativeState);
  S.editingCardId = null; S.editingNativeState = null; S.editingNativeConversionBaseline = null;
  if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
  if (d && d.open) d.close();
}

// Abre a janela de edição. Cartão nativo, ou legado que converte com segurança, abre no editor novo (rascunho em memória: nada
// é gravado até "Salvar"); só o legado que não converte (preflight) cai no formulário antigo. opts.keepState = reabrir a mesma
// edição (botão "Usar o novo editor" do formulário antigo).
function adminOpenCardEditor(cardId, opts){
  opts = opts || {};
  const S = ADMIN_FLASHCARDS_STATE, wrap = adminCardsWrap();
  const c = S._cardsCache.find(x => x.id === Number(cardId));
  if (!c || !wrap) return;
  const old = document.getElementById('dlg-editar-cartao');
  if (old){ old.dataset.reabrir = '1'; old.close(); old.remove(); }
  S.editingCardId = c.id;
  if (!opts.keepState){
    S.editingNativeState = null; S.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
    if (classifyFlashcardRowModel(c) === 'native') S.editingNativeState = createNativeNoteEditorStateFromRow(c);
    else if (classifyFlashcardRowModel(c) === 'legacy' && legacyFlashcardConversionPreflight(c).ok){
      // Decisão da autora (2026-10-05): cartão LEGADO abre direto no editor novo.
      S.editingNativeState = nativeNoteEditorStateFromLegacyRow(c);
      S.editingNativeConversionBaseline = cloneNoteEditorState(S.editingNativeState);
    }
  }
  const legacy = !S.editingNativeState;
  const inner = legacy ? flashcardEditFormHTML(c) : flashcardNativeEditFormHTML(c, S.editingNativeState);
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', tccEditDialogHTML(c, inner, legacy));
  const d = document.getElementById('dlg-editar-cartao');
  d.addEventListener('close', () => {
    if (d.dataset.reabrir) return;
    const modal = document.getElementById('flashcard-preview-modal');
    if (modal && modal.parentNode === d) document.body.appendChild(modal);
    if (S.editingCardId != null) adminCloseCardEditor(false);   // fechou no X, no Esc ou no fundo sem salvar: descarta o rascunho
    d.remove();
  });
  d.showModal();
  if (legacy) wireFlashcardEditForm(c, d); else wireFlashcardNativeEditForm(c, S.editingNativeState, d);
}

function adminOpenMoveDialog(cardId){
  const S = ADMIN_FLASHCARDS_STATE, wrap = adminCardsWrap();
  const c = S._cardsCache.find(x => x.id === Number(cardId));
  if (!c || !wrap) return;
  const old = document.getElementById('dlg-mover-cartao'); if (old) old.remove();
  const options = adminCardMoveTargets(c).map(({ deck, depth }) => `<option value="${deck.id}">${'  '.repeat(depth)}${escapeHTML(teacherDeckLabel(deck))}</option>`).join('');
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', tccMoveDialogHTML(c, options));
  const d = document.getElementById('dlg-mover-cartao');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function adminMoveCard(form){
  const S = ADMIN_FLASHCARDS_STATE;
  const card = S._cardsCache.find(c => c.id === Number(form.dataset.cardId));
  const list = card ? (S.decksByLang[card.language_app_key] || []) : [];
  const destination = getDeckById(list, Number(document.getElementById('mover-cartao-deck').value));
  const res = card ? await setTeacherFlashcardDeck({ note: card, destination, decks: list }) : { ok: false, error: t('admin.flashcards.move.notFound') };
  if (!res.ok){ showToast(res.error || t('admin.flashcards.move.failed')); return; }
  document.getElementById('dlg-mover-cartao').close();
  showToast(t('admin.flashcards.move.moved'));
  await adminCardsAfterChange();
}

async function adminDeleteCard(cardId){
  const opts = { titulo: t('cards.delete.title'), descricao: t('cards.delete.text'), confirmar: t('cards.delete.confirm'), cancelar: t('cards.edit.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(t('myFlashcards.confirm.delete'));
  if (!ok) return;
  await deleteFlashcardPermanently(cardId);
  showToast(t('admin.flashcards.delete.deleted'));
  await adminCardsAfterChange();
}

// Atualiza tudo que depende da seleção de alunos SEM refazer o formulário: chips, resumo, botão, pessoas marcadas, destinos.
async function adminSelectionChanged(){
  const S = ADMIN_FLASHCARDS_STATE, wrap = adminCardsWrap(), students = S._studentsCache;
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  if (langsPresent.length > 1 && !langsPresent.includes(S.langFilter)) S.langFilter = langsPresent[0];
  const selected = adminSelectedStudents(students);
  S.nativeCardState.languageAppKey = selected.some(s => s.language_app_key === 'mandarim') ? 'mandarim' : null;
  const chips = wrap.querySelector('[data-cards-chips]'); if (chips) chips.innerHTML = tccChipsHTML(selected);
  wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => { cb.checked = S.studentIds.has(cb.value); });
  const resumo = wrap.querySelector('[data-cards-resumo]'); if (resumo) resumo.textContent = selected.length ? tsuTp('cards.summary.people', selected.length) : t('cards.summary.none');
  const btn = document.getElementById('admin-create-flashcard-btn');
  if (btn){ btn.disabled = !selected.length; btn.textContent = tccSubmitLabel(selected.length); }
  await refreshTeacherDestinationsUI();
}

function adminApplyPickerFilters(wrap){
  const S = ADMIN_FLASHCARDS_STATE;
  const q = (document.getElementById('admin-flashcard-search')?.value || '').trim().toLowerCase();
  const multi = new Set(S._studentsCache.map(s => s.language_app_key)).size > 1;
  wrap.querySelectorAll('[data-student-row]').forEach(row => {
    row.hidden = !((!q || row.dataset.searchtext.includes(q)) && (!multi || row.dataset.lang === S.langFilter));
  });
}

// (Re)monta o editor de campos e o de tags do cartão em criação, a partir de ADMIN_FLASHCARDS_STATE.nativeCardState.
function adminMountCreateEditor(){
  const S = ADMIN_FLASHCARDS_STATE;
  refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), S.nativeCardState, { namePrefix: 'admin-native', uploadFn: uploadFlashcardMedia, deleteFn: deleteFlashcardMedia, ttsFn: requestFieldAudioTTS, noteId: S.nativeCardState.noteId });
  mountNoteTagsEditor(document.getElementById('admin-flashcard-tags'), S.nativeCardState);
}

function adminChangeCardType(newMode){
  const S = ADMIN_FLASHCARDS_STATE, st = S.nativeCardState;
  // Sair do cloze nunca deixa sintaxe {{cN::...}} presa num Field que o Card Type novo leria como texto puro.
  if (st.cardGenerationMode === 'cloze' && newMode !== 'cloze') stripClozeMarksFromEditorState(st);
  if (newMode === 'multiple_choice') transitionToMultipleChoice(st);
  else if (newMode === 'type_answer') transitionToTypeAnswer(st);
  else if (newMode === 'cloze') transitionToCloze(st);
  else st.cardGenerationMode = newMode;
  refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), st, { namePrefix: 'admin-native', uploadFn: uploadFlashcardMedia, deleteFn: deleteFlashcardMedia, ttsFn: requestFieldAudioTTS, noteId: st.noteId });
}

async function adminCreateCards(){
  const S = ADMIN_FLASHCARDS_STATE;
  const btn = document.getElementById('admin-create-flashcard-btn'), errorEl = document.getElementById('admin-create-flashcard-error');
  errorEl.textContent = '';
  const selectedNow = adminSelectedStudents(S._studentsCache);
  if (!selectedNow.length){ errorEl.textContent = t('admin.common.selectAtLeastOne'); return; }
  const nativeState = S.nativeCardState;
  nativeState.privateNote = (document.getElementById('admin-flashcard-note').value || '').trim() || null;
  const v = validateNoteEditorStateForSave(nativeState);
  if (!v.ok){ errorEl.textContent = v.error; return; }
  btn.disabled = true;
  // Uma Note por aluno escolhido, cada uma com o language_app_key e o Deck de destino do PRÓPRIO aluno. Não há atomicidade
  // entre alunos: pode haver sucesso parcial, e uma falha nunca manda o cartão para o Deck de outro aluno.
  const results = await Promise.all(selectedNow.map(async s => {
    const dest = await resolveTeacherCreationDeck({ studentId: s.student_id, languageAppKey: s.language_app_key, deckId: S.destByStudent[adminDestKey(s)], decks: S.decksByLang[s.language_app_key] });
    if (!dest.ok) return { ok: false, error: dest.error, student: s };
    const r = await createFlashcard({ studentId: s.student_id, languageAppKey: s.language_app_key, nativeState, deckId: dest.deckId });
    return Object.assign({ student: s }, r);
  }));
  btn.disabled = false;
  const failed = results.filter(r => !r.ok);
  if (failed.length === results.length){
    // Nenhuma linha ficou de pé referenciando a mídia enviada nesta sessão: seguro compensar (se só parte falhou, não).
    compensateFreshMediaUploads(nativeState);
    errorEl.textContent = failed[0].error;
    return;
  }
  clearFreshMediaUploads(nativeState);
  const okCount = results.length - failed.length;
  if (failed.length) showToast(t('admin.flashcards.createdPartial', { ok: okCount, failed: failed.map(f => '@' + (f.student.username || '?')).join(', ') }));
  else showToast(results.length > 1 ? t('admin.flashcards.createdN', { n: okCount }) : t('admin.flashcards.created'));
  // Só aqui o formulário é limpo (um envio bem-sucedido deve limpar); as pessoas e os Decks escolhidos continuam.
  const mandarim = S.nativeCardState.languageAppKey;
  S.nativeCardState = createNativeNoteEditorState({ cardGenerationMode: 'normal' });
  S.nativeCardState.languageAppKey = mandarim;
  document.getElementById('admin-flashcard-note').value = '';
  const normal = document.querySelector('[data-card-type][value="normal"]'); if (normal) normal.checked = true;
  adminMountCreateEditor();
  await adminCardsAfterChange();
}

async function renderAdminFlashcardsView(){
  const S = ADMIN_FLASHCARDS_STATE, wrap = adminCardsWrap();
  if (!wrap) return;
  if (!isTeacherUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  adminCardsBind(wrap);
  const token = ++S._renderToken;
  S.nativeCardState = createNativeNoteEditorState({ cardGenerationMode: 'normal' });
  S.editingCardId = null; S.editingNativeState = null; S.editingNativeConversionBaseline = null;
  S.decksByLang = {};
  wrap.innerHTML = tccLoadingHTML();

  // Só vínculos ATIVOS: sem vínculo ativo a professora não cria Decks nem cartões (o banco também recusa, 055).
  const students = (await fetchMyStudents()).filter(x => x.status === 'active');
  if (token !== S._renderToken) return;
  if (!students.length){ wrap.innerHTML = tccNoStudentsHTML(); return; }
  S._studentsCache = students;
  const [r] = await Promise.all([fetchAllTeacherFlashcards(), loadTeacherDecksByLang(students)]);
  if (token !== S._renderToken) return;
  if (r.cards === null){ wrap.innerHTML = tccFailHTML(); return; }
  S._cardsCache = adminCardsDecorate(r.cards); S._truncated = r.truncated;

  // Seleção vazia é um estado válido (nunca cai de volta para o primeiro aluno); some só quem deixou de ser aluno.
  const validIds = new Set(students.map(s => s.student_id));
  S.studentIds = new Set([...S.studentIds].filter(id => validIds.has(id)));
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  if (langsPresent.length > 1 && !langsPresent.includes(S.langFilter)) S.langFilter = langsPresent[0];
  if (S.preselect){ // vindo da ficha do aluno (futuro): abre com a pessoa já escolhida
    const s = students.find(x => x.student_id === S.preselect); if (s){ S.langFilter = s.language_app_key; S.studentIds = new Set([s.student_id]); }
    S.preselect = null;
  }
  const selected = adminSelectedStudents(students);
  S.nativeCardState.languageAppKey = selected.some(s => s.language_app_key === 'mandarim') ? 'mandarim' : null;

  wrap.innerHTML = tccShellHTML(S.tab, S._cardsCache.filter(c => c.status === 'active').length, {
    criar: tccCreateHTML({ students, langsPresent, langFilter: S.langFilter, selectedIds: S.studentIds, selected, type: 'normal' }),
    lista: tccListHTML(students, S._cardsCache, S.filtros, S.page, adminCardsListCtx()),
    banco: tccBankHTML(),
  });
  adminApplyPickerFilters(wrap);
  adminMountCreateEditor();
  refreshTeacherDestinationsUI();
}

// Eventos delegados no contêiner da aba: ligados uma vez só, valem para toda renderização.
function adminCardsBind(wrap){
  const S = ADMIN_FLASHCARDS_STATE;
  if (S._ligado) return;
  S._ligado = true;
  const closeMenu = (el) => { const d = el.closest('details'); if (d) d.removeAttribute('open'); };
  const cardOf = (id) => S._cardsCache.find(c => c.id === Number(id));
  wrap.addEventListener('click', (e) => {
    const q = (sel) => e.target.closest(sel);
    let el;
    if ((el = q('[data-cards-tab]'))){
      e.preventDefault(); S.tab = el.dataset.cardsTab;
      wrap.querySelectorAll('[data-cards-pane]').forEach(p => { p.hidden = p.dataset.cardsPane !== S.tab; });
      adminCardsRefreshList(); return;
    }
    if ((el = q('[data-pagina]'))){
      e.preventDefault(); if (el.getAttribute('aria-disabled') === 'true') return;
      S.page = Number(el.dataset.pagina); adminCardsRefreshList(); return;
    }
    if ((el = q('[data-tirar-aluno]'))){ S.studentIds.delete(el.dataset.tirarAluno); adminSelectionChanged(); return; }
    if (q('#admin-flashcard-select-all')){
      e.preventDefault();
      const multi = new Set(S._studentsCache.map(s => s.language_app_key)).size > 1;
      const eligible = multi ? S._studentsCache.filter(s => s.language_app_key === S.langFilter) : S._studentsCache;
      S.studentIds = new Set(eligible.map(s => s.student_id)); adminSelectionChanged(); return;
    }
    if (q('#admin-flashcard-select-none')){ e.preventDefault(); S.studentIds = new Set(); adminSelectionChanged(); return; }
    if ((el = q('[data-lang-filter]'))){
      if (S.langFilter === el.dataset.langFilter) return;
      S.langFilter = el.dataset.langFilter;
      // Trocar de idioma zera a seleção: é o que garante que nunca existe seleção mista entre idiomas (um cartão vale para um idioma).
      S.studentIds = new Set();
      wrap.querySelectorAll('[data-lang-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      adminApplyPickerFilters(wrap); adminSelectionChanged(); return;
    }
    if (q('#admin-flashcard-preview-btn')){
      openFlashcardPreviewFromEditorState(S.nativeCardState, { appKey: S.nativeCardState.languageAppKey || 'frances', origin: 'teacher' }); return;
    }
    if ((el = q('[data-ir-secao]'))){ e.preventDefault(); switchTeacherPanelSection(el.dataset.irSecao); return; }
    if ((el = q('[data-preview-flashcard]'))){
      closeMenu(el); const card = cardOf(el.dataset.previewFlashcard);
      if (!card){ openFlashcardPreviewWithError(t('myFlashcards.err.previewLoad')); return; }
      openFlashcardPreviewFromRow(card, { appKey: card.language_app_key, origin: 'teacher' }); return;
    }
    if ((el = q('[data-edit-flashcard]'))){ closeMenu(el); adminOpenCardEditor(el.dataset.editFlashcard); return; }
    if ((el = q('[data-move-flashcard]'))){ closeMenu(el); adminOpenMoveDialog(el.dataset.moveFlashcard); return; }
    if ((el = q('[data-toggle-flashcard]'))){ closeMenu(el); setFlashcardStatus(el.dataset.toggleFlashcard, el.dataset.nextStatus).then(() => adminCardsAfterChange()); return; }
    if ((el = q('[data-delete-flashcard]'))){ closeMenu(el); adminDeleteCard(el.dataset.deleteFlashcard); return; }
  });
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('[data-cards-busca]')){ S.filtros.busca = e.target.value; S.page = 1; adminCardsRefreshList(); }
    else if (e.target.id === 'admin-flashcard-search') adminApplyPickerFilters(wrap);
  });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-cards-aluno]')){ S.filtros.aluno = e.target.value; S.page = 1; adminCardsRefreshList(); }
    else if (e.target.matches('[data-cards-status]')){ S.filtros.status = e.target.value; S.page = 1; adminCardsRefreshList(); }
    else if (e.target.matches('[data-student-checkbox]')){
      if (e.target.checked) S.studentIds.add(e.target.value); else S.studentIds.delete(e.target.value);
      adminSelectionChanged();
    }
    else if (e.target.matches('[data-card-type]')) adminChangeCardType(e.target.value);
  });
  // Lembra quais árvores de Decks estão abertas (o evento toggle não borbulha: captura).
  wrap.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches && d.matches('[data-dest-row] > details')){ if (d.open) S._destAbertos.add(d.parentElement.dataset.destRow); else S._destAbertos.delete(d.parentElement.dataset.destRow); }
  }, true);
  wrap.addEventListener('submit', (e) => {
    if (e.target.id === 'admin-create-flashcard-form'){ e.preventDefault(); adminCreateCards(); }
    else if (e.target.id === 'form-mover-cartao'){ e.preventDefault(); adminMoveCard(e.target); }
  });
  // Enter dentro da busca de pessoas não envia o formulário de criação.
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'admin-flashcard-search') e.preventDefault(); });
}
