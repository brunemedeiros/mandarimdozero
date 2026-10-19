// i18n Etapa 3 -- varredura ESTÁTICA de português que pode chegar à tela com o site em inglês.
//
// O que procura (sem corrigir nada):
//   1. Literais de string/template em fr/app.js, zh/app.js, shared/**/*.js (fora de shared/i18n e shared/vendor)
//      com cara de português e que NÃO são chave de t()/tp(); classifica cada um:
//        - "fallback-ok"      : fallback de t()/wrapper cuja chave EXISTE em en.js (não aparece em inglês);
//        - "fallback-sem-en"  : fallback cuja chave NÃO existe em en.js (aparece em português em inglês);
//        - "literal"          : texto solto, sem t() (candidato a achado; triagem manual no relatório);
//        - "console"          : dentro de console.* (ignorado na contagem).
//   2. Chaves usadas em t('...')/tp('...') (literal) que existem em pt-BR.js e faltam em en.js.
//   3. fr/index.html e zh/index.html: nós de texto e atributos (placeholder, title, aria-label, alt) em português
//      sem data-i18n/data-i18n-html/data-i18n-attr cobrindo (inclui <script> inline, tratado como JS).
//
// Rodar: node tests/i18n/scan_pt_literais.js [--json saida.json]
// Sai com código 1 se achar qualquer "literal", "fallback-sem-en", chave faltando ou HTML sem data-i18n.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ts = require(require.resolve('typescript', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const ROOT = path.resolve(__dirname, '..', '..');

function loadCat(lang){
  const s = { window: {} }; vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'i18n', lang + '.js'), 'utf8'), s);
  return s.window.I18N_CATALOG[lang];
}
const PT = loadCat('pt-BR'), EN = loadCat('en');

// Português inequívoco (não casa com inglês nem com francês ensinado).
const PT_RE = /[ãõÃÕ]|ç[ãõo]e?s?\b|\b(você|vocês|não|está|estão|são|também|então|até|já|aqui|agora|ainda|nenhum|nenhuma|seu|sua|seus|suas|para|pelo|pela|com|sem|uma|um|cartões|cartão|lição|lições|revisão|revisões|nível|níveis|unidade|unidades|sequência|amigos?|erro|tente|salvar|carregando|entrar|conta|perfil|hoje|ontem|amanhã|dias?|semana|minutos?|acertos?|palavras?|frase|frases|ouça|digite|escolha|resposta|respostas|começar|continuar|voltar|próxim[oa]|anterior|fechar|cancelar|excluir|apagar|editar|criar|enviar|aluno|aluna|professora|desafios?|conquistas?|missões|missão|foguinho|parabéns|ótimo|muito|bem|isso|esse|essa|este|esta|seja|faça|sobre|onde|quando|porque|depois|antes|todos?|todas?|mais|menos|grátis|baixar|importar|exportar|selecione|selecionar|configurações|notificações|aviso|avisos|ranking|pontos|tempo)\b/i;
// Palavras francesas comuns que também estão no PT_RE (evitam falso positivo em frase francesa ensinada).
const FR_HINT = /\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|des|du|est|suis|sont|avec|pour|dans|une|mais|très|c'est|qu'|j'|l'|d'|n'|ne|pas|bonjour|merci|oui|non)\b/i;
// Palavras de pt que têm peso maior (se aparecem, é pt mesmo com dica francesa).
const PT_STRONG = /[ãõÃÕáíóúÁÍÓÚ]|ções|ção\b|\b(você|não|está|são|também|então|até|já|cartões|cartão|lição|revisão|nível|sequência|amigos|tente|nenhum|nenhuma)\b/i;
// Marcas de tom do pinyin (á/í/ó/ú também aparecem no pinyin: string com tom de pinyin não conta só pelo acento).
const PINYIN = /[āēīōūǎěǐǒǔǖǘǚǜ]/;
// Palavras de interface em português que valem sozinhas (rótulo de 1 palavra).
const PT_UI_WORD = /^\W*(continuar|começar|voltar|abrir|fechar|salvar|cancelar|excluir|apagar|editar|criar|enviar|revisar|estudar|treinar|praticar|unidade|lição|módulo|ponto|bloquead[oa]|disponível|recomendad[oa]|revisad[oa]|concluíd[oa]|aprovad[oa]|opcional|gramática|sequência|amigos|ranking|perfil|conquistas|desafios|configurações|sair|entrar|cadastrar|pular|ouvir|mostrar|esconder|copiar|compartilhar|importar|exportar|buscar|filtrar|todos|todas|nenhum|hoje|ontem|novo|nova|novos|novas|aprendendo|dominad[oa]s?|carregando|erro|refazer|ler|sem itens|bloqueada|concluída|aprovada|ok, entendi|entendi|pronto|feito|sim|não)\b/i;

function looksPt(s){
  if (!s) return false;
  // atributos visíveis dentro de HTML montado em JS (aria-label/title/placeholder/alt)
  const attrRe = /\b(?:aria-label|title|placeholder|alt)="([^"$]*)"/g; let am;
  while ((am = attrRe.exec(String(s)))) if (am[1] && looksPtText(am[1])) return true;
  return looksPtText(s);
}
function looksPtText(s){
  if (!s) return false;
  const txt = String(s).replace(/<[^>]+>/g, ' ').replace(/\$\{[^}]*\}/g, ' ');
  if (!/[A-Za-zÀ-ú]{2,}/.test(txt)) return false;
  if (PT_UI_WORD.test(txt.trim()) && txt.trim().length <= 40 && !FR_HINT.test(txt)) return true;
  // código / seletor / chave
  if (/^[\w.\-:#\[\]=*>/ ,'"()]+$/.test(txt) && !/\s\w+\s/.test(txt) && !PT_STRONG.test(txt)) return false;
  if (PT_STRONG.test(txt.replace(/[A-Za-zÀ-ÿ]*[āēīōūǎěǐǒǔǖǘǚǜ][A-Za-zÀ-ÿāēīōūǎěǐǒǔǖǘǚǜ]*/g, ' '))) return true;
  if (PT_UI_WORD.test(txt.trim()) && txt.trim().length <= 40 && !FR_HINT.test(txt)) return true;
  if (!PT_RE.test(txt)) return false;
  // precisa de 2 palavras pt fracas para contar se houver cara de francês
  const weak = (txt.match(new RegExp(PT_RE.source, 'gi')) || []).length;
  if (FR_HINT.test(txt)) return weak >= 3;
  return weak >= 1 && /\s/.test(txt.trim());
}

const KEY_FNS = new Set(['t', 'tp', 'tpZero', 'chT', '_ckT', 'mediaErrorText', 'tagsEditorT', 'reportT', 'tsuTp', 'studyTrailTagText']);
function calleeName(call){
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)){
    const obj = e.expression.getText ? e.expression : null;
    if (ts.isIdentifier(e.expression) && (e.expression.text === 'window' || e.expression.text === 'I18N')) return e.name.text;
    if (ts.isIdentifier(e.expression) && e.expression.text === 'console') return 'console.' + e.name.text;
    return '.' + e.name.text;
  }
  return '';
}
function firstKeyArg(call){
  const a = call.arguments[0];
  if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) return a.text;
  return null;
}
// Procura a chave de t() "irmã" quando o literal é fallback em `t(k) || 'pt'` ou `cond ? t(k) : 'pt'`.
function siblingKey(node){
  let found = null;
  const visit = (n) => { if (found) return; if (ts.isCallExpression(n) && KEY_FNS.has(calleeName(n))) { found = firstKeyArg(n) || '<dinâmica>'; return; } ts.forEachChild(n, visit); };
  visit(node);
  return found;
}

function scanJs(rel, text, lineOffset, out, usedKeys){
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1 + lineOffset;
  function classify(node){
    // sobe a árvore para achar contexto
    let p = node.parent, child = node;
    while (p){
      if (ts.isCallExpression(p)){
        const nm = calleeName(p);
        if (nm.startsWith('console.')) return { kind: 'console' };
        if (KEY_FNS.has(nm)){
          const idx = p.arguments.indexOf(child);
          if (idx === 0) return { kind: 'key' };
          if (idx > 0){ const k = firstKeyArg(p) || '<dinâmica>'; return { kind: 'fallback', key: k, via: nm }; }
        }
      }
      if (ts.isBinaryExpression(p) && (p.operatorToken.kind === ts.SyntaxKind.BarBarToken || p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) && p.right === child){
        const k = siblingKey(p.left); if (k) return { kind: 'fallback', key: k, via: '||' };
      }
      if (ts.isConditionalExpression(p) && p.whenFalse === child){
        const k = siblingKey(p.whenTrue); if (k) return { kind: 'fallback', key: k, via: '?:' };
      }
      if (ts.isFunctionLike(p) || ts.isSourceFile(p)) break;
      child = p; p = p.parent;
    }
    return { kind: 'literal' };
  }
  function fnName(node){
    let p = node.parent;
    while (p){
      if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name) return p.name.getText(sf);
      if ((ts.isFunctionExpression(p) || ts.isArrowFunction(p)) && p.parent && ts.isVariableDeclaration(p.parent)) return p.parent.name.getText(sf);
      if ((ts.isFunctionExpression(p) || ts.isArrowFunction(p)) && p.parent && ts.isPropertyAssignment(p.parent)) return p.parent.name.getText(sf);
      p = p.parent;
    }
    return '(topo)';
  }
  function visit(node){
    if (ts.isCallExpression(node) && KEY_FNS.has(calleeName(node))){
      const k = firstKeyArg(node); if (k) usedKeys.push({ key: k, file: rel, line: lineOf(node.getStart(sf)) });
    }
    let s = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) s = node.text;
    else if (ts.isTemplateExpression(node)) s = node.getText(sf).slice(1, -1);
    if (s !== null && looksPt(s)){
      const c = classify(node);
      let kind = c.kind;
      if (kind === 'fallback') kind = (c.key !== '<dinâmica>' && Object.prototype.hasOwnProperty.call(EN, c.key)) ? 'fallback-ok' : 'fallback-sem-en';
      if (kind !== 'key') out.push({ file: rel, line: lineOf(node.getStart(sf)), kind, key: c.key, fn: fnName(node), text: s.replace(/\s+/g, ' ').slice(0, 160) });
    }
    if (ts.isTemplateExpression(node)){ node.templateSpans.forEach(sp => visit(sp.expression)); return; }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

function listJs(){
  const files = ['fr/app.js', 'zh/app.js'];
  (function walk(dir){
    for (const f of fs.readdirSync(path.join(ROOT, dir))){
      const rel = dir + '/' + f, abs = path.join(ROOT, rel);
      if (fs.statSync(abs).isDirectory()){ if (!/^shared\/(i18n|vendor|supabase_migrations|icons|fonts|brand)$/.test(rel)) walk(rel); }
      else if (f.endsWith('.js')) files.push(rel);
    }
  })('shared');
  return files;
}

// HTML: tokenizador simples (suficiente para os index.html do repo), com pilha de cobertura data-i18n.
function scanHtml(rel, out, usedKeys){
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const stack = []; // {tag, covered}
  const re = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))){
    if (m[0].startsWith('<!--') || m[0].startsWith('<style')) continue;
    if (m[0].startsWith('<script')){
      if (!/\bsrc=/.test(m[1] || '') && !/type=["']?(application\/ld\+json|text\/template)/.test(m[1] || '')){
        const startLine = lineAt(m.index + m[0].indexOf('>') + 1) - 1;
        scanJs(rel + ' <script>', m[2], startLine, out, usedKeys);
      }
      continue;
    }
    if (m[3]){ const tag = m[3].toLowerCase(); for (let i = stack.length - 1; i >= 0; i--){ if (stack[i].tag === tag){ stack.length = i; break; } } continue; }
    if (m[4]){
      const tag = m[4].toLowerCase(), attrsSrc = m[5] || '';
      const attrs = {}; attrsSrc.replace(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_, n, a, b, c) => { attrs[n.toLowerCase()] = a ?? b ?? c ?? ''; });
      const parentCovered = stack.length ? stack[stack.length - 1].covered : false;
      const covered = parentCovered || 'data-i18n' in attrs || 'data-i18n-html' in attrs;
      const attrKeys = {};
      (attrs['data-i18n-attr'] || '').split(';').forEach(p => { const [a, k] = p.split(':'); if (a && k) { attrKeys[a.trim()] = k.trim(); usedKeys.push({ key: k.trim(), file: rel, line: lineAt(m.index) }); } });
      if (attrs['data-i18n']) usedKeys.push({ key: attrs['data-i18n'], file: rel, line: lineAt(m.index) });
      if (attrs['data-i18n-html']) usedKeys.push({ key: attrs['data-i18n-html'], file: rel, line: lineAt(m.index) });
      for (const a of ['placeholder', 'title', 'aria-label', 'alt', 'value']){
        if (a === 'value' && !(tag === 'input' && /button|submit/.test(attrs.type || ''))) continue;
        if (attrs[a] && looksPt(attrs[a]) && !attrKeys[a]) out.push({ file: rel, line: lineAt(m.index), kind: 'html-attr', attr: a, tag, id: attrs.id || '', text: attrs[a].slice(0, 160) });
      }
      for (const a of Object.keys(attrs)){
        if (/^on/.test(a) && looksPt(attrs[a])) out.push({ file: rel, line: lineAt(m.index), kind: 'html-onattr', attr: a, tag, id: attrs.id || '', text: attrs[a].slice(0, 160) });
      }
      if (!VOID.has(tag) && !m[6]) stack.push({ tag, covered, id: attrs.id || (stack.length ? stack[stack.length - 1].id : '') });
      continue;
    }
    if (m[7]){
      const txt = m[7].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      const covered = stack.length ? stack[stack.length - 1].covered : false;
      if (txt && !covered && looksPt(txt)) out.push({ file: rel, line: lineAt(m.index), kind: 'html-text', near: stack.length ? stack[stack.length - 1].id : '', text: txt.slice(0, 160) });
    }
  }
}

const out = [], usedKeys = [];
for (const rel of listJs()) scanJs(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'), 0, out, usedKeys);
for (const rel of ['fr/index.html', 'zh/index.html']) scanHtml(rel, out, usedKeys);

const missing = [];
const seenMissing = new Set();
for (const u of usedKeys){
  if (Object.prototype.hasOwnProperty.call(PT, u.key) && !Object.prototype.hasOwnProperty.call(EN, u.key)){
    const id = u.key + '@' + u.file + ':' + u.line; if (seenMissing.has(id)) continue; seenMissing.add(id);
    missing.push(u);
  }
}
const ptOnlyKeys = Object.keys(PT).filter(k => !Object.prototype.hasOwnProperty.call(EN, k));

const counts = {};
out.forEach(o => { counts[o.kind] = (counts[o.kind] || 0) + 1; });
const byFile = {};
out.filter(o => o.kind !== 'console' && o.kind !== 'fallback-ok').forEach(o => { byFile[o.file] = (byFile[o.file] || 0) + 1; });

const jsonIdx = process.argv.indexOf('--json');
if (jsonIdx > 0) fs.writeFileSync(process.argv[jsonIdx + 1], JSON.stringify({ findings: out, missing, ptOnlyKeys }, null, 1));

if (!process.argv.includes('--quiet')){
  for (const o of out.filter(o => o.kind !== 'console' && o.kind !== 'fallback-ok'))
    console.log(`${o.kind.padEnd(15)} ${o.file}:${o.line}  [${o.fn || o.attr || o.near || ''}]${o.key ? ' key=' + o.key : ''}  ${o.text}`);
  for (const u of missing) console.log(`chave-sem-en    ${u.file}:${u.line}  ${u.key}  (pt: ${String(typeof PT[u.key] === 'object' ? JSON.stringify(PT[u.key]) : PT[u.key]).slice(0, 100)})`);
}
console.log('\nResumo por tipo:', JSON.stringify(counts));
console.log('Chaves usadas em t()/data-i18n que existem em pt-BR e faltam em en:', missing.length, '(chaves distintas:', new Set(missing.map(m => m.key)).size + ')');
console.log('Chaves só no pt-BR (catálogo inteiro):', ptOnlyKeys.length);
console.log('Por arquivo (sem console/fallback-ok):', JSON.stringify(byFile));
const bad = (counts.literal || 0) + (counts['fallback-sem-en'] || 0) + (counts['html-text'] || 0) + (counts['html-attr'] || 0) + (counts['html-onattr'] || 0) + missing.length;
process.exit(bad ? 1 : 0);
