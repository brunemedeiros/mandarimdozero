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
let ADMIN_FLASHCARDS_STATE = { studentIds: new Set(), langFilter: 'all', _studentsCache: [], editingCardId: null, editingNativeState: null, editingNativeConversionBaseline: null, _cardsCache: [], decksByLang: {}, destByStudent: {}, _ensuredKeys: new Set(), _destToken: 0, nativeCardState: createNativeNoteEditorState({ cardGenerationMode: 'normal' }) };

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
      <p class="profile-edit-error" id="edit-flashcard-use-native-error"></p>

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
    if (c.image_url){
      // Seção 10 -- limitação conhecida (registrada em
      // shared/flashcard-native-persistence.js, attachLegacyMediaToFields):
      // a URL da imagem é preservada no Field, mas ainda não é exibida na
      // Revisão pro caminho nativo (gap fora do escopo desta fase) --
      // avisa em vez de deixar a professora achar que a imagem sumiu.
      showToast('⚠️ A imagem deste cartão foi preservada nos dados, mas ainda não aparece na tela de Revisão pra cartões do novo editor.');
    }
    const cardsBox = document.getElementById('admin-flashcards-cards-box');
    const selectedStudents = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
    cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
    wireFlashcardsCardsBox(cardsBox);
  });

  document.getElementById('edit-flashcard-cancel').addEventListener('click', () => {
    ADMIN_FLASHCARDS_STATE.editingCardId = null;
    ADMIN_FLASHCARDS_STATE.editingNativeState = null;
    ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
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
      <div id="edit-native-flashcard-tags"></div>
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
    openFlashcardPreviewFromEditorState(editorState, {
      appKey: editorState.languageAppKey || c.language_app_key || 'frances',
      origin: 'teacher',
    });
  });

  document.getElementById('edit-native-flashcard-cancel').addEventListener('click', () => {
    // Fase 7e (ver CLAUDE.md) -- cancelar descarta o rascunho inteiro,
    // mesma disciplina de sempre (Seção 16/17); qualquer áudio enviado
    // durante esta sessão de edição nunca chega a ser referenciado por
    // nenhuma linha real, mesmo tratamento de órfão que uma falha de
    // save já recebe.
    compensateFreshMediaUploads(editorState);
    ADMIN_FLASHCARDS_STATE.editingCardId = null;
    ADMIN_FLASHCARDS_STATE.editingNativeState = null;
    ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
    updateFlashcardsSelectionDependentUI(document.getElementById('admin-flashcards-content'));
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
      showToast(nextRevision > (c.revision || 0) ? '✓ Cartão editado. O progresso de revisão foi reiniciado.' : '✓ Cartão editado.');
      ADMIN_FLASHCARDS_STATE.editingCardId = null;
      ADMIN_FLASHCARDS_STATE.editingNativeState = null;
      ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
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
  return deck.kind === 'teacher_root' ? 'Cartões da professora (padrão)' : deck.name;
}

function teacherDeckOptionsHTML(tree, selectedId){
  return orderedTeacherDecks(tree, tree).map(({ deck, depth }) => {
    const pad = '  '.repeat(depth);
    return `<option value="${deck.id}" ${deck.id === selectedId ? 'selected' : ''}>${pad}${escapeHTML(teacherDeckLabel(deck))}</option>`;
  }).join('');
}

// Rótulo do Deck de um cartão já criado (destino sempre visível na lista).
function teacherCardDeckLabelHTML(c){
  if (c.deck_id == null) return '📂 <em>sem Deck (cartão anterior aos Decks)</em> · ';
  const deck = getDeckById(ADMIN_FLASHCARDS_STATE.decksByLang[c.language_app_key] || [], c.deck_id);
  return `📂 ${escapeHTML(deck ? teacherDeckLabel(deck) : 'Deck')} · `;
}

// Mover cartão entre Teacher Decks do MESMO aluno (a Note inteira -- os
// CardInstances irmãos de reverso/Cloze andam juntos, pois deck_id vive na
// linha, nunca no CardInstance).
function teacherCardMoveSelectHTML(c){
  const tree = teacherTreeForStudent(c.student_id, c.language_app_key);
  if (!tree.length) return '';
  return `<select class="profile-edit-input" data-move-card="${c.id}" title="Mover este cartão para outro Deck deste aluno" style="width:auto; max-width:190px; padding:2px 4px;">
    <option value="">Mover para…</option>
    ${orderedTeacherDecks(tree, tree).filter(({ deck }) => deck.id !== c.deck_id).map(({ deck, depth }) =>
      `<option value="${deck.id}">${'  '.repeat(depth)}${escapeHTML(teacherDeckLabel(deck))}</option>`).join('')}
  </select>`;
}

// Fase H (H1/H4) -- árvore de Teacher Decks do aluno, com contagem de cartões
// (Notes) por Deck e exclusão de Teacher Deck VAZIO. A UI só reflete a regra
// (teacher_root nunca; teacher só sem subdecks e sem cartões); quem decide de
// verdade é o trigger da migration 054 no banco. Nunca há "apagar e mover
// cartões automaticamente" nem "substituir por outro Deck".
async function fillTeacherTreeLists(box, selected, problems){
  const S = ADMIN_FLASHCARDS_STATE;
  for (const s of selected){
    if (problems && problems[`${s.student_id}|${s.language_app_key}`]) continue;
    const holder = box.querySelector(`[data-tree-list="${s.student_id}"]`);
    if (!holder) continue;
    const notes = (await fetchFlashcardsForStudent(s.student_id)).filter(c => c.language_app_key === s.language_app_key);
    if (!holder.isConnected) return;
    const tree = teacherTreeForStudent(s.student_id, s.language_app_key);
    const rows = orderedTeacherDecks(tree, tree).map(({ deck, depth }) => {
      const own = notes.filter(c => c.deck_id === deck.id).length;
      const kids = tree.filter(d => d.parent_deck_id === deck.id).length;
      const deletable = deck.kind === 'teacher' && kids === 0 && own === 0;
      const del = deck.kind === 'teacher'
        ? `<button type="button" class="admin-badge-delete-btn" data-tree-delete="${deck.id}" ${deletable ? '' : 'disabled'} title="${deletable ? 'Apagar este Deck (vazio)' : 'Só é possível apagar um Deck sem subdecks e sem cartões'}">🗑</button>`
        : '';
      return `<div class="admin-badge-row" data-tree-row="${deck.id}" style="padding-left:${depth * 16}px;">
        <span style="flex:1;">${escapeHTML(teacherDeckLabel(deck))} <span class="profile-edit-hint">(${own} cartão(ões)${kids ? `, ${kids} subdeck(s)` : ''})</span></span>${del}
      </div>`;
    }).join('');
    holder.innerHTML = `<div class="section-label">Árvore de Decks</div>${rows}`;
    holder.querySelectorAll('[data-tree-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const list = S.decksByLang[s.language_app_key] || [];
        const deck = getDeckById(list, Number(btn.dataset.treeDelete));
        if (!deck || !confirm(`Apagar o Deck "${deck.name}"? Ele está vazio.`)) return;
        const res = await deleteTeacherDeck({ deck, decks: list });
        if (!res.ok){ showToast(res.error || 'Não foi possível apagar o Deck.'); return; }
        S.decksByLang[s.language_app_key] = list.filter(d => d.id !== deck.id);
        if (S.destByStudent[adminDestKey(s)] === deck.id) delete S.destByStudent[adminDestKey(s)];
        showToast('✓ Deck apagado.');
        renderTeacherDestinationRows(box, selected, problems || {});
      });
    });
  }
}

function renderTeacherDestinationRows(box, selected, problems){
  const S = ADMIN_FLASHCARDS_STATE;
  box.innerHTML = selected.map(s => {
    const key = `${s.student_id}|${s.language_app_key}`;
    const head = `<div class="admin-badge-name">${flashcardStudentLabel(s)} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}</div>`;
    if (problems[key]) return `<div class="admin-badge-row" style="flex-direction:column; align-items:stretch; gap:4px;">${head}<p class="profile-edit-error">${escapeHTML(problems[key])}</p></div>`;
    const tree = teacherTreeForStudent(s.student_id, s.language_app_key);
    const root = tree.find(d => d.kind === 'teacher_root');
    const chosen = tree.some(d => d.id === S.destByStudent[adminDestKey(s)]) ? S.destByStudent[adminDestKey(s)] : (root ? root.id : null);
    return `<div class="admin-badge-row" data-dest-row="${s.student_id}" style="flex-direction:column; align-items:stretch; gap:6px;">
      ${head}
      <select class="profile-edit-input" data-dest-select="${s.student_id}" aria-label="Deck de destino de ${escapeHTML(s.username || '')}">${teacherDeckOptionsHTML(tree, chosen)}</select>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <input type="text" class="profile-edit-input" data-dest-subname="${s.student_id}" placeholder="Nome do novo subdeck (dentro do Deck escolhido)" maxlength="60" style="flex:1; min-width:140px;">
        <button type="button" class="btn btn-secondary" data-dest-newsub="${s.student_id}">+ Subdeck</button>
      </div>
      <p class="profile-edit-error" data-dest-err="${s.student_id}"></p>
      <div data-tree-list="${s.student_id}" aria-label="Árvore de Decks de ${escapeHTML(s.username || '')}"></div>
    </div>`;
  }).join('');
  // Fase H (H1/H4) -- árvore visível por aluno+idioma, com exclusão de
  // Teacher Deck vazio (assíncrono: precisa contar os cartões de cada Deck).
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
      showToast('✓ Subdeck criado.');
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
    box.innerHTML = '<p class="profile-edit-hint">Selecione ao menos um aluno para escolher o Deck de destino.</p>';
    return;
  }
  box.innerHTML = '<p class="profile-edit-hint">Preparando os Decks…</p>';
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

// CONSOLIDAÇÃO-3 (ver CLAUDE.md) -- "Arquivar" deixou de ser uma ação
// normal de produto: um cartão ATIVO não tem mais nenhum botão de
// arquivar aqui, em lugar nenhum. O único vestígio do mecanismo que
// sobrevive é "Reativar" (↺), mostrado só em cartões JÁ arquivados
// (`c.status === 'archived'`, herdados de antes desta fase) -- nunca um
// substituto/nome novo pra "esconder"/"suspender": é a AÇÃO INVERSA
// (devolver um cartão histórico pro estado ativo padrão), e uma vez
// reativado o cartão não tem mais nenhum botão de status (vira
// indistinguível de um cartão que nunca foi arquivado). `setFlashcardStatus`
// (shared/teacher-flashcards.js) não mudou -- só quem chama com
// `'archived'` deixou de existir na UI.
function flashcardCardRowHTML(c, showUsername){
  if (ADMIN_FLASHCARDS_STATE.editingCardId === c.id){
    // Cartão já nativo -> sempre edita no editor novo (nunca mostra a
    // versão legada de campos que nem existem mais pra ele -- choices/
    // cloze_sentence ficam null numa Note nativa). Seedado LAZY (só quando
    // ainda não existe um editingNativeState desta sessão de edição) --
    // trocar de Card Type/editar Fields depois não deveria resetar o
    // estado do editor a cada re-render da caixa de cartões.
    if (!ADMIN_FLASHCARDS_STATE.editingNativeState && classifyFlashcardRowModel(c) === 'native'){
      ADMIN_FLASHCARDS_STATE.editingNativeState = createNativeNoteEditorStateFromRow(c);
    }
    if (ADMIN_FLASHCARDS_STATE.editingNativeState) return flashcardNativeEditFormHTML(c, ADMIN_FLASHCARDS_STATE.editingNativeState);
    return flashcardEditFormHTML(c);
  }
  return `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(c.__studentUsername || '?')}</span> · ` : ''}${flashcardFrontSummaryHTML(c)} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${teacherCardDeckLabelHTML(c)}${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}${flashcardFormatBadgesHTML(c) ? ' · ' + flashcardFormatBadgesHTML(c) : ''}</div>
        ${(c.tags && c.tags.length) ? `<div data-row-tags style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">${noteTagChipsHTML(c.tags)}</div>` : ''}
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        ${teacherCardMoveSelectHTML(c)}
        <button class="admin-badge-delete-btn" data-preview-flashcard="${c.id}" title="Pré-visualizar como o aluno vai ver na Revisão">👁</button>
        <button class="admin-badge-delete-btn" data-edit-flashcard="${c.id}" title="Editar">✏️</button>
        ${c.status === 'archived' ? `<button class="admin-badge-delete-btn" data-toggle-flashcard="${c.id}" data-next-status="active" title="Reativar (tirar do arquivo histórico)">↺</button>` : ''}
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
  await loadTeacherDecksByLang(selectedStudents);
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

  // CONSOLIDAÇÃO-3 (ver CLAUDE.md) -- esta seção "Arquivados" já era, desde
  // antes desta fase, uma área visualmente SEPARADA de "Cartões ativos"
  // (label própria, nunca misturada na mesma lista) -- exatamente o que
  // §5 pede ("área separada de históricos arquivados"), então foi
  // reaproveitada tal como estava, sem nenhuma reconstrução. O que mudou
  // é só que nenhum cartão pode mais CHEGAR aqui por uma ação da UI --
  // só existe o que já estava arquivado antes desta fase (ou um cartão
  // que a professora reativou e arquivou de novo ANTES desta fase
  // existir, mas nenhum daqui pra frente).
  return `
    <div class="profile-section">
      <div class="section-label">Cartões ativos (${activeCards.length})</div>
      ${activeCards.length ? activeCards.map(c => flashcardCardRowHTML(c, showUsername)).join('') : `<p class="profile-empty-note">Nenhum cartão ainda pra${selectedStudents.length > 1 ? ' esses alunos' : selectedStudents.length === 1 ? ' este aluno' : ' nenhum aluno selecionado'}.</p>`}
    </div>
    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados historicamente (${archivedCards.length})</div>
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
  cardsBox.querySelectorAll('[data-move-card]').forEach(sel => {
    sel.addEventListener('change', async () => {
      if (!sel.value) return;
      const card = ADMIN_FLASHCARDS_STATE._cardsCache.find(c => c.id === Number(sel.dataset.moveCard));
      const list = card ? (ADMIN_FLASHCARDS_STATE.decksByLang[card.language_app_key] || []) : [];
      const destination = getDeckById(list, Number(sel.value));
      const res = card ? await setTeacherFlashcardDeck({ note: card, destination, decks: list }) : { ok: false, error: 'Cartão não encontrado.' };
      if (!res.ok){ showToast(res.error || 'Não foi possível mover o cartão.'); sel.value = ''; return; }
      showToast('✓ Cartão movido.');
      const selectedStudents = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
      const destBox = document.getElementById('admin-flashcard-destinations');
      if (destBox) fillTeacherTreeLists(destBox, selectedStudents, {});
    });
  });
  cardsBox.querySelectorAll('[data-toggle-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setFlashcardStatus(btn.dataset.toggleFlashcard, btn.dataset.nextStatus);
      const selectedStudents = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
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
      ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
      const selectedStudents = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
    });
  });
  cardsBox.querySelectorAll('[data-delete-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Isso vai apagar o cartão e todo o histórico de revisão permanentemente. Não pode ser desfeito. Continuar?')) return;
      await deleteFlashcardPermanently(btn.dataset.deleteFlashcard);
      showToast('Cartão apagado.');
      const selectedStudents = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
      cardsBox.innerHTML = await buildFlashcardsCardsBoxHTML(selectedStudents);
      wireFlashcardsCardsBox(cardsBox);
      const destBox = document.getElementById('admin-flashcard-destinations');
      if (destBox) fillTeacherTreeLists(destBox, selectedStudents, {});
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
  const students = ADMIN_FLASHCARDS_STATE._studentsCache;
  // (langFilter normalizado ANTES de calcular a seleção efetiva -- H8)
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  if (langsPresent.length > 1 && !langsPresent.includes(ADMIN_FLASHCARDS_STATE.langFilter)){
    ADMIN_FLASHCARDS_STATE.langFilter = langsPresent[0];
  }
  const selectedStudents = adminSelectedStudents(students);
  const anyMandarim = selectedStudents.some(s => s.language_app_key === 'mandarim');
  // Fase 6D.5 (ver CLAUDE.md) -- mesma regra do render inicial: só o
  // booleano relevante pra validação (compareAnswer/pinyin obrigatório de
  // um Cloze/Digite a resposta em mandarim), mutação pura de estado, NUNCA
  // dispara re-render da caixa "Campos" (que só re-renderiza por sua
  // própria mudança estrutural).
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

  const btn = document.getElementById('admin-create-flashcard-btn');
  if (btn){
    btn.disabled = !selectedStudents.length;
    btn.textContent = `Criar cartão${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}`;
  }

  await refreshTeacherDestinationsUI();

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

// CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- markFlashcardFieldInvalid/
// clearFlashcardFieldInvalid/FLASHCARD_FIELD_IDS/clearAllFlashcardFieldErrors/
// validateFlashcardForm/wireFlashcardFieldValidation (validação contextual
// por campo do formulário legado de CRIAÇÃO -- "Modo de prática"/Frente/
// Verso/campos de MC/Cloze legados) foram removidas: existiam só pra
// validar um formulário que não existe mais na tela de criação (ver
// renderAdminFlashcardsView abaixo -- só o editor nativo, sem bifurcação
// legacy/native). Nenhuma outra função deste arquivo as chamava.

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
  ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
  // Fase G -- Decks sempre relidos num render completo (ex.: depois de um
  // submit); destByStudent (destino escolhido por aluno) é preservado pra
  // professora continuar criando no mesmo Deck.
  ADMIN_FLASHCARDS_STATE.decksByLang = {};
  wrap.innerHTML = loadingHTML();

  // Fase H (H6) -- só vínculos ATIVOS aparecem: professora sem vínculo ativo
  // não cria Teacher Decks nem Teacher Cards (o banco também recusa, 055).
  const students = (await fetchMyStudents()).filter(x => x.status === 'active');
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

  // (langFilter normalizado ANTES de calcular a seleção efetiva -- H8)
  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  if (langsPresent.length > 1 && !langsPresent.includes(ADMIN_FLASHCARDS_STATE.langFilter)){
    ADMIN_FLASHCARDS_STATE.langFilter = langsPresent[0];
  }
  const selectedStudents = adminSelectedStudents(students);
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

    <div class="profile-section" id="admin-flashcard-dest-section">
      <div class="section-label">Destino (Deck de cada aluno)</div>
      <p class="profile-edit-hint">Cada aluno tem a sua própria árvore de Decks. Por padrão o cartão vai para "Cartões da professora" do aluno; escolha um subdeck se quiser organizar.</p>
      <div id="admin-flashcard-destinations"></div>
    </div>

    <div class="profile-section">
      <div class="section-label">Cartão<span id="admin-flashcard-content-subtitle">${newCardSubtitle}</span></div>
      <p class="profile-edit-hint" id="admin-flashcard-content-hint" style="${selectedStudents.length ? 'display:none;' : ''}">Selecione ao menos um aluno acima pra poder criar o cartão.</p>
      <!-- CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- único fluxo de criação: Tipo de
           cartão -> Campos -> Pré-visualizar -> Salvar. O formulário legado
           (Modo de prática/Idioma de cada lado/Frente-Verso/Recursos
           opcionais no nível do cartão) foi removido da CRIAÇÃO -- continua
           existindo só pra EDIÇÃO de cartão legado já existente
           (flashcardEditFormHTML, abaixo), nunca mais como opção de criar
           um cartão novo. Direção de revisão deixou de ser um controle
           próprio -- cada Field agora escolhe seu próprio idioma
           (renderFieldEditorHTML, shared/flashcard-field-editor.js). -->
      <form id="admin-create-flashcard-form" class="profile-edit-form">
        <div class="section-label" style="margin:0 0 4px;">Tipo de cartão</div>
        <select id="admin-flashcard-card-type-preview" class="profile-edit-input">
          ${CARD_TYPE_UI_META.map(t => `<option value="${t.id}" ${t.id === 'normal' ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>

        <div class="section-label" style="margin:14px 0 4px;">Campos</div>
        <p class="profile-edit-hint" style="margin-top:-2px;">Adicione os campos deste cartão -- por exemplo, Frente e Verso pra um cartão Normal. Cada campo tem seu próprio idioma e seus próprios recursos de áudio.</p>
        <div id="admin-flashcard-native-fields"></div>
        <div id="admin-flashcard-tags"></div>
        <button type="button" class="admin-select-link" id="admin-flashcard-preview-btn" style="background:none; border:none; cursor:pointer; margin:6px 0 0;">👁️ Pré-visualizar</button>

        <label class="profile-edit-label" for="admin-flashcard-note" style="margin-top:14px;">Nota (privada -- o aluno nunca vê)</label>
        <textarea id="admin-flashcard-note" class="profile-edit-input profile-edit-textarea" rows="2" placeholder="contexto, dica de uso..."></textarea>

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

  // CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- único seletor de Card Type: muta
  // ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode, nunca cria
  // um campo paralelo/duplicado (`selectedCardType`/`isReverse`/etc.). É
  // este valor que decide de verdade o cartão salvo -- não existe mais
  // nenhum "Modo de prática" concorrente nem bifurcação legacy/native no
  // submit (ver handler abaixo).
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
    refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), ADMIN_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'admin-native', uploadFn: uploadFlashcardMedia, deleteFn: deleteFlashcardMedia, ttsFn: requestFieldAudioTTS, noteId: ADMIN_FLASHCARDS_STATE.nativeCardState.noteId });
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
  // Fase 7f (TTS explícito por Field, implementação -- ver CLAUDE.md) --
  // ttsFn/noteId seguem o MESMO par uploadFn/deleteFn acima: `noteId` é
  // sempre `null` aqui (o rascunho ainda não foi salvo) -- o botão "Gerar
  // áudio" mostra "Salve o cartão primeiro" até o 1º submit bem-sucedido
  // (mesmo motivo do upload real só existir depois de um Field ter um
  // `rowId` real pra a Edge Function checar autorização contra).
  refreshNativeCardTypeBox(document.getElementById('admin-flashcard-native-fields'), ADMIN_FLASHCARDS_STATE.nativeCardState, { namePrefix: 'admin-native', uploadFn: uploadFlashcardMedia, deleteFn: deleteFlashcardMedia, ttsFn: requestFieldAudioTTS, noteId: ADMIN_FLASHCARDS_STATE.nativeCardState.noteId });

  mountNoteTagsEditor(document.getElementById('admin-flashcard-tags'), ADMIN_FLASHCARDS_STATE.nativeCardState);

  refreshTeacherDestinationsUI();

  document.getElementById('admin-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-flashcard-btn');
    const errorEl = document.getElementById('admin-create-flashcard-error');
    errorEl.textContent = '';

    const selectedNow = adminSelectedStudents(ADMIN_FLASHCARDS_STATE._studentsCache);
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
    // CONSOLIDAÇÃO-1 (ver CLAUDE.md) -- único caminho de criação: sempre
    // nativo, sem bifurcação. "Nota" é a única leitura fora de
    // nativeState/nativeState.fields -- texto simples sem ambiguidade de
    // Card Type (lembrete privado da professora, nunca mostrado ao
    // aluno). Imagem/áudio são recursos POR FIELD (dentro do editor
    // nativo, ver "Campos" acima), nunca mais um upload solto no nível do
    // cartão -- removidos daqui junto com o resto do formulário legado.
    const nativeState = ADMIN_FLASHCARDS_STATE.nativeCardState;
    nativeState.privateNote = (document.getElementById('admin-flashcard-note').value || '').trim() || null;
    const v = validateNoteEditorStateForSave(nativeState);
    if (!v.ok){
      errorEl.textContent = v.error;
      return;
    }
    btn.disabled = true;
    // Uma Note (linha em teacher_flashcards) POR aluno selecionado -- mesmo
    // conteúdo/Fields, cada uma com o language_app_key do PRÓPRIO aluno
    // (nunca compartilhando id/linha entre alunos, mesmo numa seleção
    // mista fr+zh).
    // Fase G -- cada aluno resolve o SEU destino (teacher_root dele por
    // padrão, ou o subdeck escolhido pra ele) e cria a SUA linha: N criações
    // independentes, cada uma atômica (Note+Fields+deck_id num só INSERT).
    // NÃO existe atomicidade entre alunos: pode haver sucesso parcial, e uma
    // falha nunca atribui o cartão ao Deck de outro aluno.
    const results = await Promise.all(selectedNow.map(async s => {
      const dest = await resolveTeacherCreationDeck({
        studentId: s.student_id,
        languageAppKey: s.language_app_key,
        deckId: ADMIN_FLASHCARDS_STATE.destByStudent[adminDestKey(s)],
        decks: ADMIN_FLASHCARDS_STATE.decksByLang[s.language_app_key],
      });
      if (!dest.ok) return { ok: false, error: dest.error, student: s };
      const r = await createFlashcard({
        studentId: s.student_id,
        languageAppKey: s.language_app_key,
        nativeState,
        deckId: dest.deckId,
      });
      return Object.assign({ student: s }, r);
    }));
    btn.disabled = false;
    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length){
      // Fase 7e (ver CLAUDE.md, Seção 14) -- TODAS as inserções
      // falharam -- nenhuma linha real ficou de pé referenciando o
      // áudio recém-enviado nesta sessão, seguro compensar. Se só
      // PARTE falhou (vários alunos selecionados), o mesmo áudio já
      // está referenciado pela(s) linha(s) que teve(tiveram) sucesso --
      // nunca compensa nesse caso.
      compensateFreshMediaUploads(nativeState);
      errorEl.textContent = failed[0].error;
      return;
    }
    clearFreshMediaUploads(nativeState);
    const okCount = results.length - failed.length;
    if (failed.length){
      showToast(`✓ ${okCount} cartão(ões) criado(s); falhou pra: ${failed.map(f => '@' + (f.student.username || '?')).join(', ')}.`);
    } else {
      showToast(results.length > 1 ? `✓ ${okCount} cartões criados.` : '✓ Cartão criado.');
    }
    // Único ponto onde um re-render COMPLETO acontece por causa da seleção
    // -- e é intencional aqui: um submit bem sucedido deve mesmo limpar o
    // formulário (Card Type/Campos/Nota), diferente de marcar um
    // checkbox, que não deveria apagar nada.
    renderAdminFlashcardsView();
  });
}
