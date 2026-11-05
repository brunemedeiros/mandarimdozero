// Peças puras do Conectar Notion (testadas em Node: tests/notion/test_map.mjs). Sem rede, sem Supabase.

// Texto simples de uma propriedade do Notion (title, rich_text, select, status, multi_select, date, number, relation já resolvida).
export function propText(p, relationTitles) {
  if (!p) return null;
  switch (p.type) {
    case 'title': return (p.title || []).map(t => t.plain_text || '').join('').trim() || null;
    case 'rich_text': return (p.rich_text || []).map(t => t.plain_text || '').join('').trim() || null;
    case 'select': return p.select?.name || null;
    case 'status': return p.status?.name || null;
    case 'multi_select': return (p.multi_select || []).map(o => o.name).join(', ') || null;
    case 'number': return p.number == null ? null : String(p.number);
    case 'relation': {
      const names = (p.relation || []).map(r => relationTitles?.get(r.id)).filter(Boolean);
      return names.length ? names.join(', ') : null;
    }
    case 'formula': {
      const f = p.formula || {};
      return f.string ?? (f.number != null ? String(f.number) : null);
    }
    default: return null;
  }
}

export function propList(p) {
  if (!p) return [];
  if (p.type === 'multi_select') return (p.multi_select || []).map(o => o.name).filter(Boolean);
  const t = propText(p);
  return t ? t.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// Data do Notion -> { date: 'AAAA-MM-DD', start_time: 'HH:MM' | null, time_zone }. A hora é a escrita no Notion
// (horário local de quem escreveu); o fuso vem do Notion quando houver, senão fica o padrão do site.
export function propDate(p) {
  const start = p?.type === 'date' ? p.date?.start : null;
  if (!start) return { date: null, start_time: null, time_zone: null };
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/.exec(start);
  if (!m) return { date: null, start_time: null, time_zone: null };
  return { date: m[1], start_time: m[2] ? `${m[2]}:${m[3]}` : null, time_zone: p.date.time_zone || null };
}

// Propriedade pelo id (o mapa de colunas guarda o id, que não muda quando a professora renomeia a coluna).
export function byId(page, id) {
  if (!id) return null;
  for (const v of Object.values(page.properties || {})) if (v && v.id === id) return v;
  return null;
}

// Linha do Notion -> formato do notion_ingest. relationTitles: Map(id da página relacionada -> título).
export function mapRow(page, map, relationTitles) {
  const d = propDate(byId(page, map.date));
  return {
    page_id: page.id,
    name: propText(byId(page, map.student), relationTitles),
    date: d.date, start_time: d.start_time, time_zone: d.time_zone,
    topic: map.topic ? propText(byId(page, map.topic)) : null,
    homework: map.homework ? propText(byId(page, map.homework)) : null,
    attendance: map.attendance ? propText(byId(page, map.attendance)) : null,
    skills: map.skills ? propList(byId(page, map.skills)) : [],
    language: map.language ? propText(byId(page, map.language)) : null,
    archived: !!(page.archived || page.in_trash),
    last_edited: page.last_edited_time,
  };
}

// Sugestão de colunas pelo nome e tipo (a professora confirma na tela).
const NAME_HINTS = {
  date: ['data', 'date', 'dia', 'quando'],
  student: ['aluno', 'aluna', 'aluno/a', 'aluno(a)', 'student', 'nome', 'turma'],
  topic: ['topico', 'tema', 'assunto', 'topic', 'conteudo', 'aula'],
  homework: ['para a proxima aula', 'tarefa', 'licao de casa', 'dever', 'homework', 'para casa'],
  attendance: ['presenca', 'status', 'attendance', 'situacao'],
  skills: ['competencias', 'habilidades', 'skills'],
  language: ['idioma', 'lingua', 'language'],
};
const OK_TYPES = {
  date: ['date'], student: ['select', 'title', 'rich_text', 'relation', 'multi_select', 'status'],
  topic: ['title', 'rich_text'], homework: ['rich_text', 'title'], attendance: ['select', 'status'],
  skills: ['multi_select'], language: ['select', 'status', 'rich_text'],
};
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9/() ]/g, ' ').replace(/\s+/g, ' ').trim();

export function suggestColumns(properties) {
  const props = Object.entries(properties || {}).map(([name, p]) => ({ name, id: p.id, type: p.type, key: norm(name) }));
  const out = {};
  const used = new Set();
  for (const field of ['date', 'student', 'homework', 'attendance', 'skills', 'language', 'topic']) {
    const cands = props.filter(p => OK_TYPES[field].includes(p.type) && !used.has(p.id));
    let hit = cands.find(p => NAME_HINTS[field].includes(p.key))
      || cands.find(p => NAME_HINTS[field].some(h => p.key.startsWith(h) || p.key.includes(h)));
    if (!hit && field === 'date') hit = cands[0];
    if (!hit && field === 'topic') hit = cands.find(p => p.type === 'title');
    if (hit) { out[field] = hit.id; used.add(hit.id); }
  }
  return out;
}

export const FIELDS = ['date', 'student', 'topic', 'homework', 'attendance', 'skills', 'language'];
export const FIELD_TYPES = OK_TYPES;
