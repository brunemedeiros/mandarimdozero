#!/usr/bin/env node
// Lista do que as páginas principais podem carregar (Content-Security-Policy, por <meta>).
// Auditoria de segurança, achado 6 (docs/historico/36-auditoria-seguranca-2026-11.md), aprovado pela autora em 2026-11-25.
//
// O GitHub Pages não deixa configurar cabeçalhos, então a política vai num <meta> no começo do <head> de
// index.html, fr/index.html e zh/index.html. O código escrito solto dentro das páginas (<script> sem src) só roda
// se a "impressão digital" (sha256) dele estiver na lista: este script recalcula tudo e reescreve o <meta>.
//
//   node scripts/csp-atualizar.js          reescreve o <meta> das 3 páginas
//   node scripts/csp-atualizar.js --check  só confere (sai com erro se alguma página estiver desatualizada)
//
// Mudou um <script> solto de uma dessas páginas? Rode sem --check e faça commit do resultado. A publicação
// (.github/workflows/deploy-pages.yml) também roda este script antes de ir ao ar, então o site publicado nunca
// fica com uma impressão digital velha; o teste tests/csp/ avisa quem esqueceu.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const SUPABASE = 'https://eigjocalzwamisgqilhg.supabase.co';
const GA = ['https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];

const PAGES = {
  'index.html': {},
  'fr/index.html': {},
  // Hanzi Writer (só zh) vem do jsdelivr com versão e lacre; os desenhos dos caracteres também vêm de lá (fetch).
  'zh/index.html': { scripts: ['https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/'], connect: ['https://cdn.jsdelivr.net'] },
};

function inlineHashes(html){
  const out = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))){
    const attrs = m[1] || '';
    if (/\ssrc\s*=/.test(attrs)) continue;
    const type = (/\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1];
    if (type && !/^(text\/javascript|module|application\/javascript)$/i.test(type)) continue; // JSON e afins não rodam
    out.push("'sha256-" + crypto.createHash('sha256').update(m[2], 'utf8').digest('base64') + "'");
  }
  return out;
}

function policyFor(page, html){
  const extra = PAGES[page] || {};
  const d = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...inlineHashes(html), GA[0], ...(extra.scripts || []), "'wasm-unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'data:', 'blob:', SUPABASE],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", SUPABASE, SUPABASE.replace('https:', 'wss:'), ...GA, ...(extra.connect || [])],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(d).map(([k, v]) => k + ' ' + v.join(' ')).join('; ');
}

const META_RE = /<meta http-equiv="Content-Security-Policy" content="[^"]*" data-csp="scripts\/csp-atualizar\.js">\n/;

// Lista "busque já" (dona, 2026-11-26): com a política num <meta>, o Chrome e o Firefox deixam de buscar os scripts da página
// em paralelo enquanto ela é lida (o "preload scanner" se desliga) e os ~180 <script src> passaram a vir um de cada vez: no
// celular a abertura foi de ~6 s para ~30 s. Um <link rel="preload"> por script, logo depois do <meta>, devolve a busca em
// paralelo sem tirar a proteção (a ordem de execução continua a dos <script>). Só arquivos do próprio site, sem lacre (SRI).
const PRELOAD_RE = /<!-- preload:scripts\/csp-atualizar\.js -->\n[\s\S]*?<!-- \/preload -->\n/;
function preloadBlock(html){
  const srcs = [];
  const re = /<script\s[^>]*\bsrc="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))){
    const tag = m[0], src = m[1];
    if (/^(https?:)?\/\//i.test(src) || /\sintegrity=/i.test(tag) || srcs.includes(src)) continue;
    srcs.push(src);
  }
  if (!srcs.length) return '';
  return '<!-- preload:scripts/csp-atualizar.js -->\n' + srcs.map(u => `<link rel="preload" as="script" href="${u}">\n`).join('') + '<!-- /preload -->\n';
}

function render(page){
  const file = path.join(ROOT, page);
  const html = fs.readFileSync(file, 'utf8');
  const semMeta = html.replace(META_RE, '').replace(PRELOAD_RE, '');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(page, semMeta)}" data-csp="scripts/csp-atualizar.js">\n`;
  // Logo depois do <meta charset>: a política só vale para o que vem depois dela no documento.
  const m = /<meta charset="[^"]*">\s*\n/i.exec(semMeta);
  if (!m) throw new Error(page + ': sem <meta charset>');
  const at = m.index + m[0].length;
  return { file, before: html, after: semMeta.slice(0, at) + meta + preloadBlock(semMeta) + semMeta.slice(at) };
}

if (require.main === module){
  const check = process.argv.includes('--check');
  let stale = [];
  for (const page of Object.keys(PAGES)){
    const r = render(page);
    if (r.before !== r.after){
      if (check) stale.push(page); else { fs.writeFileSync(r.file, r.after); console.log('atualizado:', page); }
    }
  }
  if (check){
    if (stale.length){ console.error('CSP desatualizada em: ' + stale.join(', ') + '\nRode: node scripts/csp-atualizar.js'); process.exit(1); }
    console.log('CSP em dia nas ' + Object.keys(PAGES).length + ' páginas');
  }
}
module.exports = { PAGES, policyFor, inlineHashes, preloadBlock, render };
