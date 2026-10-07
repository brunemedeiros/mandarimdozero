// Injeta t()/tp()/fmtDate() (pt-BR, a partir do catálogo REAL) em contextos `vm`
// dos testes unitários que carregam arquivos de shared/ que já usam i18n.
const fs = require('fs'), path = require('path'), vm = require('vm');
function installT(ctx){
  const sb = { window: {} }; sb.window = sb;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'i18n', 'pt-BR.js'), 'utf8'), sb);
  const cat = sb.I18N_CATALOG['pt-BR'];
  const interp = (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p && p[k] !== undefined) ? String(p[k]) : m);
  ctx.t = (k, p) => (k in cat) ? interp(typeof cat[k] === 'object' ? cat[k].other : cat[k], p) : k;
  ctx.tp = (k, n, p) => {
    const v = cat[k]; if (v === undefined) return k;
    const s = typeof v === 'object' ? (n === 1 ? v.one : v.other) : v;
    return interp(s, Object.assign({ n }, p));
  };
  ctx.fmtDate = (d) => new Intl.DateTimeFormat('pt-BR').format(d instanceof Date ? d : new Date(d));
  return ctx;
}
module.exports = { installT };
