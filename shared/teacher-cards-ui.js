// ---------- Cartões (painel da professora): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar, eventos,
// diálogos, editor de campos) fica em shared/admin-flashcards.js. Testado em tests/painel-cartoes/test_cards_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t()/tp() (chaves cards.*, admin.flashcards.*).
//
// Os ids e data-* que os testes e o controlador usam foram mantidos de propósito (data-student-checkbox, data-dest-select,
// data-tree-list, #admin-flashcard-native-fields, #admin-create-flashcard-btn...): a tela mudou de cara, o contrato não.
//
// Depende de: shared/i18n (t, tp, fmtDate), shared/profile.js (escapeHTML), shared/admin-students.js (STUDENT_LANGUAGE_LABELS),
// shared/teacher-students-ui.js (tsuInitials, tsuNorm, tsuTp), shared/admin-flashcards.js (CARD_TYPE_UI_META).

const TCC_PAGE_SIZE = 10;
const TCC_TYPES = [
  { id: 'normal', desc: 'cards.type.normal.desc' },
  { id: 'normal_reversed', desc: 'cards.type.normalReversed.desc' },
  { id: 'multiple_choice', desc: 'cards.type.multipleChoice.desc' },
  { id: 'type_answer', desc: 'cards.type.typeAnswer.desc' },
  { id: 'cloze', desc: 'cards.type.cloze.desc' },
];

function tccEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function tccName(s){ return (s && (s.display_name || s.username)) || t('admin.common.removedUser'); }
function tccLangLabel(key){ return STUDENT_LANGUAGE_LABELS[key] || key; }
function tccTypeLabel(id){ const m = CARD_TYPE_UI_META.find(x => x.id === id); return m ? m.label : id; }

// Tipo do cartão de uma linha: nativo traz card_generation_mode; legado deduz pelas colunas antigas.
function tccCardType(c){
  if (c.card_generation_mode) return c.card_generation_mode;
  if (c.cloze_sentence) return 'cloze';
  if (c.choices && c.choices.length) return 'multiple_choice';
  return 'normal';
}
function tccHasMedia(c, kind){
  if (kind === 'audio' && c.audio_url) return true;
  if (kind === 'image' && c.image_url) return true;
  return Array.isArray(c.fields) && c.fields.some(f => f && f[kind] && (f[kind].url || f[kind].type));
}
// Resumo "frente → verso" (cloze novo não tem frente: mostra a frase com a resposta entre colchetes).
function tccSummary(c){
  const front = c.front
    ? `${c.front}${c.front_pinyin ? ` (${c.front_pinyin})` : ''}`
    : (c.cloze_sentence ? c.cloze_sentence.replace('___', `[${c.cloze_answer || '...'}]`) : '');
  return { front, back: c.back_trans || '' };
}

/* ---------------- Quadro da tela ---------------- */

function tccTabsHTML(tab, count){
  const a = (id, label) => `<a href="#" role="tab" data-cards-tab="${id}"${tab === id ? ' aria-current="page"' : ''}>${tccEsc(label)}</a>`;
  return `<nav class="p-abas" aria-label="${tccEsc(t('cards.tab.aria'))}">${a('criar', t('cards.tab.create'))}${a('lista', `${t('cards.tab.list')}${count === null || count === undefined ? '' : ` (${count})`}`)}${a('banco', t('cards.tab.bank'))}</nav>`;
}

// panes = { criar, lista, banco } (HTML já pronto); só o da aba atual fica visível, os outros ficam montados e escondidos
// (o formulário de criação nunca é refeito ao trocar de aba).
function tccShellHTML(tab, count, panes){
  const pane = (id, html) => `<section data-cards-pane="${id}"${tab === id ? '' : ' hidden'}>${html}</section>`;
  return `<div class="painel"><div class="p-pagina" data-tcc="pagina">
    <header class="p-cabecalho"><div><h2>${tccEsc(t('cards.title'))}</h2><span class="p-subtitulo">${tccEsc(t('cards.sub'))}</span></div></header>
    <div data-cards-tabs>${tccTabsHTML(tab, count)}</div>
    ${pane('criar', panes.criar)}${pane('lista', panes.lista)}${pane('banco', panes.banco)}
  </div></div>`;
}

function tccLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tccEsc(t('cards.loading'))}</span></div></div></div>`;
}
function tccNoStudentsHTML(){
  return `<div class="painel"><div class="p-pagina" data-tcc="vazio"><header class="p-cabecalho"><div><h2>${tccEsc(t('cards.title'))}</h2><span class="p-subtitulo">${tccEsc(t('cards.sub'))}</span></div></header>
    <div class="p-vazio"><strong>${tccEsc(t('cards.noStudents.title'))}</strong><span>${tccEsc(t('cards.noStudents.text'))}</span><button type="button" data-ir-secao="students">${tccEsc(t('students.title'))}</button></div></div></div>`;
}
function tccFailHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-alerta p-alerta--erro" role="alert"><span>${tccEsc(t('cards.fail'))}</span></div></div></div>`;
}
function tccBankHTML(){
  return `<div class="p-vazio"><strong>${tccEsc(t('cards.bank.title'))}</strong><span>${tccEsc(t('cards.bank.text'))}</span></div>`;
}

/* ---------------- Criar cartão ---------------- */

function tccChipsHTML(selected){
  if (!selected.length) return `<p class="p-subtitulo" style="margin:0">${tccEsc(t('cards.who.none'))}</p>`;
  return `<ul class="p-chips">${selected.map(s => `<li class="p-chip">${tccEsc(tccName(s))} <small>${tccEsc(tccLangLabel(s.language_app_key))}</small> <button type="button" aria-label="${tccEsc(t('cards.who.removePerson', { name: tccName(s) }))}" data-tirar-aluno="${tccEsc(s.student_id)}">×</button></li>`).join('')}</ul>`;
}

// Seletor de pessoas (caixa aberta pelo botão "Escolher pessoas"). Com 2+ idiomas só um fica ativo por vez
// (um cartão vale para um idioma só: áudio e pronúncia dependem dele).
function tccPickerHTML(students, langsPresent, langFilter, selectedIds){
  const seg = langsPresent.length > 1
    ? `<div class="p-seg" role="toolbar" aria-label="${tccEsc(t('cards.who.langAria'))}">${langsPresent.map(k => `<button type="button" data-lang-filter="${tccEsc(k)}" aria-pressed="${langFilter === k ? 'true' : 'false'}">${tccEsc(tccLangLabel(k))} (${students.filter(s => s.language_app_key === k).length})</button>`).join('')}</div>` : '';
  const rows = students.map(s => `<label data-student-row data-lang="${tccEsc(s.language_app_key)}" data-searchtext="${tccEsc(`${s.display_name || ''} ${s.username || ''}`.toLowerCase())}"${langsPresent.length > 1 && s.language_app_key !== langFilter ? ' hidden' : ''}><input type="checkbox" data-student-checkbox value="${tccEsc(s.student_id)}"${selectedIds.has(s.student_id) ? ' checked' : ''}> ${tccEsc(tccName(s))} <small>@${tccEsc(s.username || '')} · ${tccEsc(tccLangLabel(s.language_app_key))}</small></label>`).join('');
  return `<details class="p-popover" style="margin:.6rem 0 0"><summary role="button" class="outline p-pequeno">${tccEsc(t('cards.who.pick'))}</summary>
    <div class="p-popover-corpo"><small>${tccEsc(t('cards.who.hint'))}${langsPresent.length > 1 ? ' ' + tccEsc(t('cards.who.langHint')) : ''}</small>${seg}
      <input type="search" id="admin-flashcard-search" placeholder="${tccEsc(t('students.search.placeholder'))}" aria-label="${tccEsc(t('students.search.aria'))}" autocomplete="off">
      <div class="p-acoes"><a href="#" id="admin-flashcard-select-all">${tccEsc(t('publicProfile.selectAll'))}</a><a href="#" id="admin-flashcard-select-none">${tccEsc(t('publicProfile.clear'))}</a></div>
      <fieldset class="p-rolagem" style="max-height:12rem;overflow:auto">${rows}</fieldset></div></details>`;
}

function tccTypesHTML(selected){
  return `<div class="p-tipos" role="radiogroup" aria-label="${tccEsc(t('myFlashcards.cardType'))}">${TCC_TYPES.map(x => `<label><input type="radio" name="admin-flashcard-card-type" value="${x.id}" data-card-type${selected === x.id ? ' checked' : ''}><b>${tccEsc(tccTypeLabel(x.id))}</b><span>${tccEsc(t(x.desc))}</span></label>`).join('')}</div>`;
}

// Linha de destino de UM aluno (Deck onde o cartão entra) + criar subdeck + árvore. opts: { options (HTML dos <option>), problem }
function tccDestRowHTML(s, opts){
  const head = `<div class="p-pessoa"><span class="p-avatar" aria-hidden="true">${tccEsc(tsuInitials(tccName(s)))}</span><div><strong>${tccEsc(tccName(s))}</strong><small>${tccEsc(tccLangLabel(s.language_app_key))}</small></div></div>`;
  if (opts.problem) return `<div class="p-destino" data-dest-row="${tccEsc(s.student_id)}">${head}<p class="profile-edit-error" role="alert">${tccEsc(opts.problem)}</p></div>`;
  return `<div class="p-destino" data-dest-row="${tccEsc(s.student_id)}">${head}
    <select data-dest-select="${tccEsc(s.student_id)}" aria-label="${tccEsc(t('admin.flashcards.dest.destAria', { username: s.username || '' }))}">${opts.options}</select>
    <details><summary>${tccEsc(t('cards.deck.folders', { name: tccName(s) }))}</summary>
      <div class="p-ferramentas"><input class="p-cresce" type="text" data-dest-subname="${tccEsc(s.student_id)}" placeholder="${tccEsc(t('admin.flashcards.dest.subnamePlaceholder'))}" aria-label="${tccEsc(t('cards.deck.newSub'))}" maxlength="60"><button type="button" class="outline p-pequeno" data-dest-newsub="${tccEsc(s.student_id)}">${tccEsc(t('admin.flashcards.dest.newSub'))}</button></div>
      <p class="profile-edit-error" data-dest-err="${tccEsc(s.student_id)}" role="alert"></p>
      <div data-tree-list="${tccEsc(s.student_id)}" aria-label="${tccEsc(t('admin.flashcards.dest.treeAria', { username: s.username || '' }))}"></div></details></div>`;
}
// rows = [{ deck, depth, label, own, kids, deletable }]
function tccTreeHTML(rows){
  return `<ul class="p-lista">${rows.map(r => `<li data-tree-row="${tccEsc(r.deck.id)}" style="padding-left:${r.depth * 1.1}rem"><span>${tccEsc(r.label)} <small>${tccEsc(t('admin.flashcards.dest.countCards', { n: r.own }))}${r.kids ? tccEsc(t('admin.flashcards.dest.countSubdecks', { n: r.kids })) : ''})</small></span>${r.deck.kind === 'teacher' ? `<button type="button" class="outline p-pequeno" data-tree-delete="${tccEsc(r.deck.id)}"${r.deletable ? '' : ' disabled'} title="${tccEsc(r.deletable ? t('admin.flashcards.dest.deleteTitle') : t('admin.flashcards.dest.deleteDisabledTitle'))}">${tccEsc(t('cards.act.delete'))}</button>` : ''}</li>`).join('')}</ul>`;
}

function tccSubmitLabel(n){ return `${t('myFlashcards.create')}${n > 1 ? t('admin.common.forNStudents', { n }) : ''}`; }

// Painel "Criar cartão". Os pontos de montagem do editor (#admin-flashcard-native-fields, #admin-flashcard-tags) e dos destinos
// (#admin-flashcard-destinations) saem vazios: o controlador monta o editor de campos e preenche os destinos.
function tccCreateHTML(st){
  const n = st.selected.length;
  return `<div class="p-grade-2 p-grade-2--larga">
    <div style="display:grid;gap:1rem;min-width:0;align-content:start">
      <article><header><h3>${tccEsc(t('cards.step.who'))}</h3></header>
        <div data-cards-chips>${tccChipsHTML(st.selected)}</div>
        ${tccPickerHTML(st.students, st.langsPresent, st.langFilter, st.selectedIds)}
        <div id="admin-flashcard-destinations" style="margin-top:1rem"><p class="p-subtitulo">${tccEsc(t('admin.flashcards.dest.pickStudent'))}</p></div></article>
      <article><header><h3>${tccEsc(t('cards.step.type'))}</h3></header>${tccTypesHTML(st.type)}</article>
      <article class="p-editor"><header><h3>${tccEsc(t('cards.step.content'))}</h3></header>
        <form id="admin-create-flashcard-form" novalidate>
          <p class="p-subtitulo" style="margin:0 0 .5rem">${tccEsc(t('myFlashcards.fields.hint'))}</p>
          <div id="admin-flashcard-native-fields"></div>
          <div id="admin-flashcard-tags"></div>
          <label for="admin-flashcard-note">${tccEsc(t('admin.flashcards.native.privateNote'))}<textarea id="admin-flashcard-note" rows="2" placeholder="${tccEsc(t('myFlashcards.note.placeholder'))}"></textarea></label>
        </form></article>
    </div>
    <aside class="p-lateral"><article><header><h3>${tccEsc(t('cards.summary.title'))}</h3></header>
      <p class="p-subtitulo" style="margin:0 0 .5rem" data-cards-resumo>${tccEsc(n ? tp('cards.summary.people', n) : t('cards.summary.none'))}</p>
      <div class="p-alerta p-alerta--info"><span>${tccEsc(t('cards.summary.warn'))}</span></div>
      <p class="profile-edit-error" id="admin-create-flashcard-error" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end;margin-top:.75rem"><button type="button" class="outline" id="admin-flashcard-preview-btn">${tccEsc(t('myFlashcards.preview'))}</button><button type="submit" form="admin-create-flashcard-form" id="admin-create-flashcard-btn"${n ? '' : ' disabled'}>${tccEsc(tccSubmitLabel(n))}</button></div></article></aside>
  </div>`;
}

/* ---------------- Cartões criados ---------------- */

// Filtros sobre a lista de cartões já com __student (vínculo) em cada item. f = { aluno, status, busca }
function tccFilterCards(cards, f){
  const q = tsuNorm(f.busca).trim();
  return cards.filter(c => {
    if ((c.status === 'archived') !== (f.status === 'archived')) return false;
    if (f.aluno && c.student_id !== f.aluno) return false;
    if (q){
      const s = tccSummary(c);
      const hay = tsuNorm([s.front, s.back, c.note, (c.tags || []).join(' '), c.__student ? `${c.__student.display_name || ''} ${c.__student.username || ''}` : ''].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function tccFiltersHTML(students, f){
  const seen = new Set(), opts = [];
  students.forEach(s => { if (!seen.has(s.student_id)){ seen.add(s.student_id); opts.push(s); } });
  return `<div class="p-ferramentas">
    <select aria-label="${tccEsc(t('cards.list.studentAria'))}" data-cards-aluno><option value="">${tccEsc(t('cards.list.studentAll'))}</option>${opts.map(s => `<option value="${tccEsc(s.student_id)}"${f.aluno === s.student_id ? ' selected' : ''}>${tccEsc(tccName(s))}</option>`).join('')}</select>
    <select aria-label="${tccEsc(t('cards.list.statusAria'))}" data-cards-status><option value="active"${f.status !== 'archived' ? ' selected' : ''}>${tccEsc(t('cards.list.statusActive'))}</option><option value="archived"${f.status === 'archived' ? ' selected' : ''}>${tccEsc(t('cards.list.statusArchived'))}</option></select>
    <input class="p-cresce" type="search" placeholder="${tccEsc(t('cards.list.search'))}" aria-label="${tccEsc(t('cards.list.searchAria'))}" value="${tccEsc(f.busca || '')}" data-cards-busca>
  </div>`;
}

// ctx = { deckLabel(card) -> texto do Deck }
function tccRowHTML(c, ctx){
  const s = tccSummary(c);
  const type = tccTypeLabel(tccCardType(c));
  const media = [tccHasMedia(c, 'audio') ? t('admin.flashcards.badge.audio') : '', tccHasMedia(c, 'image') ? t('admin.flashcards.badge.image') : ''].filter(Boolean);
  const tags = (c.tags || []).map(tag => `<span class="p-selo" data-tag="${tccEsc(tag)}">${tccEsc(tag)}</span>`).join(' ');
  const who = c.__student || null;
  return `<tr data-card-row="${tccEsc(c.id)}">
    <td><b>${tccEsc(s.front)}</b>${s.back ? ` → ${tccEsc(s.back)}` : ''}${c.note ? `<br><small>${tccEsc(c.note)}</small>` : ''}</td>
    <td><strong>${tccEsc(tccName(who))}</strong><br><small>@${tccEsc((who && who.username) || '')}</small></td>
    <td>${tccEsc(ctx.deckLabel(c))}</td>
    <td data-row-tags class="p-oculta-movel">${tags}</td>
    <td><span class="p-selo p-selo--info">${tccEsc(type)}</span>${media.length ? ` <small>${tccEsc(media.join(' · '))}</small>` : ''}</td>
    <td class="p-oculta-movel">${tccEsc(fmtDate(c.created_at))}</td>
    <td><details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary p-pequeno">${tccEsc(t('cards.menu'))}</summary><div class="p-menu-lista" role="menu">
      <button type="button" class="p-menu-item" role="menuitem" data-preview-flashcard="${tccEsc(c.id)}">${tccEsc(t('cards.act.preview'))}</button>
      <button type="button" class="p-menu-item" role="menuitem" data-edit-flashcard="${tccEsc(c.id)}">${tccEsc(t('cards.act.edit'))}</button>
      ${ctx.canMove(c) ? `<button type="button" class="p-menu-item" role="menuitem" data-move-flashcard="${tccEsc(c.id)}">${tccEsc(t('cards.act.move'))}</button>` : ''}
      ${c.status === 'archived' ? `<button type="button" class="p-menu-item" role="menuitem" data-toggle-flashcard="${tccEsc(c.id)}" data-next-status="active">${tccEsc(t('cards.act.reactivate'))}</button>` : ''}
      <div class="p-menu-sep" role="separator"></div>
      <button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-delete-flashcard="${tccEsc(c.id)}">${tccEsc(t('cards.act.delete'))}</button></div></details></td>
  </tr>`;
}

// Páginas visíveis: 1, vizinhas da atual e a última, com reticências nos buracos.
function tccPageList(page, pages){
  const keep = new Set([1, pages, page - 1, page, page + 1].filter(p => p >= 1 && p <= pages));
  const out = []; let last = 0;
  [...keep].sort((a, b) => a - b).forEach(p => { if (p - last > 1) out.push('…'); out.push(p); last = p; });
  return out;
}
function tccPaginationHTML(total, page){
  const pages = Math.max(1, Math.ceil(total / TCC_PAGE_SIZE));
  if (pages <= 1) return '';
  const from = (page - 1) * TCC_PAGE_SIZE + 1, to = Math.min(total, page * TCC_PAGE_SIZE);
  const items = tccPageList(page, pages).map(p => p === '…' ? '<li><span class="p-pag-mais" aria-hidden="true">…</span></li>' : `<li><a href="#" data-pagina="${p}"${p === page ? ' aria-current="page"' : ''}>${p}</a></li>`).join('');
  return `<div class="p-ferramentas"><nav class="p-paginacao" aria-label="${tccEsc(t('cards.page.aria'))}"><ul>
    <li><a href="#" class="p-pag-ant" data-pagina="${page - 1}"${page <= 1 ? ' aria-disabled="true"' : ''}>${tccEsc(t('cards.page.prev'))}</a></li>${items}
    <li><a href="#" class="p-pag-prox" data-pagina="${page + 1}"${page >= pages ? ' aria-disabled="true"' : ''}>${tccEsc(t('cards.page.next'))}</a></li></ul></nav>
    <small class="p-cresce" style="text-align:right">${tccEsc(t('cards.page.range', { from, to, total }))}</small></div>`;
}

// Corpo da lista (tabela + paginação); o filtro e a busca ficam fora para nunca perderem o foco ao digitar.
function tccListBodyHTML(cards, f, totalActiveOrArchived, page, ctx){
  const filtered = tccFilterCards(cards, f);
  if (!filtered.length){
    return `<div class="p-vazio"><strong>${tccEsc(t(cards.length ? 'cards.empty.filtered' : 'cards.empty.title'))}</strong>${cards.length ? '' : `<span>${tccEsc(t('cards.empty.text'))}</span><button type="button" data-cards-tab="criar">${tccEsc(t('cards.empty.btn'))}</button>`}</div>`;
  }
  const pages = Math.max(1, Math.ceil(filtered.length / TCC_PAGE_SIZE));
  const p = Math.min(Math.max(1, page || 1), pages);
  const slice = filtered.slice((p - 1) * TCC_PAGE_SIZE, p * TCC_PAGE_SIZE);
  return `<article class="p-tabela p-tabela--compacta"><table class="striped"><thead><tr>
    <th scope="col">${tccEsc(t('cards.col.card'))}</th><th scope="col">${tccEsc(t('cards.col.for'))}</th><th scope="col">${tccEsc(t('cards.col.deck'))}</th><th scope="col" class="p-oculta-movel">${tccEsc(t('cards.col.tags'))}</th><th scope="col">${tccEsc(t('cards.col.format'))}</th><th scope="col" class="p-oculta-movel">${tccEsc(t('cards.col.created'))}</th><th scope="col"><span class="p-so-leitor">${tccEsc(t('cards.menu'))}</span></th>
  </tr></thead><tbody>${slice.map(c => tccRowHTML(c, ctx)).join('')}</tbody></table></article>${tccPaginationHTML(filtered.length, p)}`;
}

function tccListHTML(students, cards, f, page, ctx){
  return `${tccFiltersHTML(students, f)}<div data-cards-lista>${tccListBodyHTML(cards, f, cards.length, page, ctx)}</div>`;
}

/* ---------------- Diálogos ---------------- */

// Janela de edição: o conteúdo (editor nativo ou formulário antigo) vem pronto em innerHTML.
function tccEditDialogHTML(c, innerHTML, legacy){
  return `<dialog id="dlg-editar-cartao" class="p-dialogo p-dialogo--larga" data-nao-fechar-no-fundo aria-labelledby="dlg-editar-cartao-t"><article class="p-editor">
    <header><button type="button" rel="prev" aria-label="${tccEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-editar-cartao-t">${tccEsc(t('cards.edit.title'))}</h3>
      <p>${tccEsc(t('cards.edit.for', { name: tccName(c.__student) }))}${legacy ? ' ' + tccEsc(t('cards.edit.legacyNote')) : ''}</p></header>
    <div data-cartao-editor>${innerHTML}</div></article></dialog>`;
}

function tccMoveDialogHTML(c, optionsHTML){
  return `<dialog id="dlg-mover-cartao" class="p-dialogo" aria-labelledby="dlg-mover-cartao-t"><article>
    <header><button type="button" rel="prev" aria-label="${tccEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-mover-cartao-t">${tccEsc(t('cards.move.title'))}</h3>
      <p>${tccEsc(tccSummary(c).front)}</p></header>
    <form id="form-mover-cartao" data-card-id="${tccEsc(c.id)}"><label>${tccEsc(t('cards.move.to'))}<select id="mover-cartao-deck">${optionsHTML}</select></label>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tccEsc(t('cards.edit.cancel'))}</button><button type="submit">${tccEsc(t('cards.move.confirm'))}</button></footer></form></article></dialog>`;
}
