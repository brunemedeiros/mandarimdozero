#!/usr/bin/env node
// Gera index.html (página única, sem dependências) a partir de fonte.html e dos rascunhos das unidades do piloto
// (piloto-m1/<unidade>/<unidade>.json, fonte única do conteúdo das telas: regra 17, decisões 338 a 356).
// Embute as telas (TELAS) e os áudios reais do site (fr/audio-manifest.js, como data: URIs).
// Sem imagens dentro da lição (decisão 341).
// A foto da professora (icons/brune-email.jpg, a mesma dos e-mails) entra nas falas dela (decisão 350).
// Uso: node docs/i18n/curriculo/maquete-licao-curta/gerar.js [--antes=<commit>]
//   --antes: mostra, ao lado de cada tela, o texto que ela tinha nesse commit (para revisar uma reescrita).
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../../../..');
const { execFileSync } = require('child_process');
const fonte = fs.readFileSync(path.join(__dirname, 'fonte.html'), 'utf8');
const RASCUNHOS = [
  { unidade: 1, caminho: 'docs/i18n/curriculo/piloto-m1/A1-1/A1-1.json' },
  { unidade: 2, caminho: 'docs/i18n/curriculo/piloto-m1/A1-2/A1-2.json' },
  { unidade: 3, caminho: 'docs/i18n/curriculo/piloto-m1/A1-9/A1-9.json' },
];

// `tolerante`: para a comparação com um commit antigo, tela de tipo que não existe mais é ignorada.
// As telas levam a lição como "unidade.ordem" (ex.: "2.3") e a unidade em `unit`.
function construirTelas(R, unidade, tolerante){
  const pt = x => (x && x['pt-BR']) || '';
  const minusc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const cartao = fr => {
    const c = R.cartoes.find(x => x.fr === fr);
    if (!c) throw new Error('cartão não encontrado: ' + fr);
    return c;
  };
  const frase = fr => {
    const f = R.frases_na_frase.find(x => x.fr === fr);
    if (!f) throw new Error('frase não encontrada: ' + fr);
    return f;
  };
  const erros = t => t.explicacao_erro ? Object.fromEntries(Object.entries(t.explicacao_erro).map(([k, v]) => [k, pt(v)])) : undefined;
  const iniciais = nome => nome.trim().split(/\s+/).pop().charAt(0).toUpperCase();
  // Iniciais dos dois personagens; se coincidirem (Claire e Sr. Costa), duas letras de cada (Cl e Co).
  const quemFala = (a, b) => {
    if (iniciais(a) !== iniciais(b)) return { A: iniciais(a), B: iniciais(b) };
    const duas = n => { const w = n.trim().split(/\s+/).pop(); return w.charAt(0).toUpperCase() + w.charAt(1).toLowerCase(); };
    return { A: duas(a), B: duas(b) };
  };
  // Dados de um diálogo para a maquete: falas, iniciais, nomes e a voz de cada personagem (pelo emoji do falante:
  // 👩 = voz feminina, 👨 = masculina; decisão da dona de 2026-10-15: duas vozes alternando).
  const dialogo = titulo => {
    const d = R.dialogos.find(x => pt(x.titulo) === titulo);
    if (!d) throw new Error('diálogo não encontrado: ' + titulo);
    const voz = f => (f.emoji === '👨' ? 'm' : 'f');
    return { title: pt(d.titulo),
      who: quemFala(d.falantes.A.nome, d.falantes.B.nome),
      names: { A: d.falantes.A.nome, B: d.falantes.B.nome },
      voices: { A: voz(d.falantes.A), B: voz(d.falantes.B) },
      lines: d.falas.map(f => [f.falante, f.fr, f['pt-BR']]) };
  };

  // Converte uma tela do rascunho para o formato que a maquete desenha. Função pura.
  const total = R.licoes.filter(l => l.telas).length;
  function telaDaMaquete(t, licao, telasDaLicao){
    const base = { id: t.id, lesson: `${unidade}.${licao.ordem}`, unit: unidade };
    switch (t.tipo){
      case 'abertura': return { ...base, type: 'intro', n: licao.ordem, total, title: pt(licao.titulo), goal: pt(t.objetivo), size: pt(t.tamanho) };
      case 'cartao': {
        const c = cartao(t.cartao);
        return { ...base, type: 'item', kind: 'Palavra nova', fr: c.fr, tr: pt(c.traducao), role: pt(c.papel_na_funcao) || undefined,
          audios: t.audios || c.fr.split(' / ').map(x => [x, x]) };
      }
      case 'frase': {
        const f = frase(t.frase);
        // Frase em par (informal / formal, decisão 359): um áudio para cada forma.
        const formas = f.fr.split(' / ');
        return { ...base, type: 'item', kind: 'Frase nova', fr: f.fr, tr: f['pt-BR'], role: pt(t.papel) || undefined,
          audios: formas.length > 1 ? formas.map((x, k) => [x, k ? 'formal' : 'informal']) : [[f.fr, '']] };
      }
      case 'complete': return { ...base, type: 'complete', before: t.antes, after: t.depois, tr: pt(t.traducao), opts: t.opcoes, answer: t.resposta,
        full: t.frase_completa, why_ok: pt(t.explicacao), why_err: erros(t) };
      case 'vf': return { ...base, type: 'vf', fr: t.fr, noAudio: !!t.sem_audio, stmt: pt(t.afirmacao), answer: t.resposta,
        full: t.frase_do_painel, fullTr: pt(t.traducao_do_painel), why_ok: pt(t.explicacao) };
      case 'funcao': return { ...base, type: 'funcao', q: pt(t.pergunta), opts: t.opcoes, answer: t.resposta, fullTr: pt(t.traducao_do_painel),
        why_ok: pt(t.explicacao), why_err: erros(t) };
      case 'nota': {
        const n = R.notas.find(x => x.id === t.nota);
        if (!n) throw new Error('nota não encontrada: ' + t.nota);
        const rot = t.rotulos || {}, mudas = t.so_escrita || [];
        return { ...base, type: 'nota', kind: 'Nota · ' + n.tipo_visivel, title: pt(n.titulo), text: pt(n.texto),
          ex: n.exemplos.map(e => [e.fr, e['pt-BR'], rot[e.fr] || null, mudas.includes(e.fr)]), grade: n.grade || null };
      }
      // Unidade 2 (decisão 356): ouvir uma letra ou um nome soletrado e escolher; ouvir e digitar.
      case 'ouvir_escolher': return { ...base, type: 'ouvir', q: pt(t.pergunta), audio: t.audio, opts: t.opcoes, answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'digitar': return { ...base, type: 'digitar', q: pt(t.pergunta), audio: t.audio, answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'montar': return { ...base, type: 'montar', tr: pt(t.traducao), tiles: t.pecas, answer: t.resposta, full: t.frase_completa, why_ok: pt(t.explicacao) };
      case 'fim': {
        // Lista do que foi visto (regra 17): os cartões da lição, as frases-modelo e a frase montada.
        const lista = [];
        for (const x of telasDaLicao){
          if (x.tipo === 'cartao'){ const c = cartao(x.cartao); lista.push([c.fr, pt(c.traducao), minusc(pt(c.papel_na_funcao)) || null]); }
          if (x.tipo === 'frase'){ const f = frase(x.frase); lista.push([f.fr, f['pt-BR'], 'frase']); }
          if (x.tipo === 'montar') lista.push([x.frase_completa, pt(x.traducao), 'frase']);
        }
        return { ...base, type: 'fim', say: pt(t.fala), list: lista };
      }
      // Lição de diálogos em 6 etapas (decisão 353). Os dados do diálogo vão juntos em `dlg`.
      case 'dialogo_cena': return { ...base, type: 'd_cena', dlg: dialogo(t.dialogo), n: licao.ordem, total, licao: pt(licao.titulo), foco: pt(t.foco), size: pt(t.tamanho) };
      case 'dialogo_vf': return { ...base, type: 'd_vf', dlg: dialogo(t.dialogo), fala: t.fala, stmt: pt(t.afirmacao), answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_lacuna': return { ...base, type: 'd_lacuna', dlg: dialogo(t.dialogo), fala: t.fala, before: t.antes, after: t.depois, opts: t.opcoes, answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_ordenar': return { ...base, type: 'd_ordenar', dlg: dialogo(t.dialogo), why_ok: pt(t.explicacao) };
      case 'dialogo_ouvir': return { ...base, type: 'd_ouvir', dlg: dialogo(t.dialogo), q: pt(t.pergunta), opts: t.opcoes.map(pt), answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_ler': return { ...base, type: 'd_ler', dlg: dialogo(t.dialogo) };
      case 'dialogo_montar': return { ...base, type: 'd_montar', dlg: dialogo(t.dialogo), distratores: Object.fromEntries(Object.entries(t.distratores).map(([k, v]) => [k, v.texto])), why_ok: pt(t.explicacao) };
      case 'dialogo_entendeu': return { ...base, type: 'd_entendeu', dlg: dialogo(t.dialogo), q: pt(t.pergunta), opts: t.opcoes.map(pt), answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_papel': return { ...base, type: 'd_papel', dlg: dialogo(t.dialogo), situacao: pt(t.situacao), outro: t.outro_falante,
        turnos: t.turnos.map(x => x.outro ? { outro: [x.outro.fr, x.outro['pt-BR']] }
          : { pedido: pt(x.pedido), opcoes: x.opcoes, certa: x.certa, dicas: Object.fromEntries(Object.entries(x.dicas).map(([k, v]) => [k, pt(v)])) }),
        why_ok: pt(t.explicacao) };
      case 'dialogo_fim': return { ...base, type: 'd_fim', dlg: dialogo(t.dialogo), say: pt(t.fala), frases: t.frases };
      default:
        if (tolerante) return null;
        throw new Error('tipo de tela desconhecido: ' + t.tipo);
    }
  }

  return R.licoes.filter(l => l.telas).flatMap(l => l.telas.map(t => telaDaMaquete(t, l, l.telas))).filter(Boolean);
}

const lerRascunho = c => JSON.parse(fs.readFileSync(path.join(raiz, c), 'utf8'));
const TELAS = RASCUNHOS.flatMap(r => construirTelas(lerRascunho(r.caminho), r.unidade));
// Unidades e lições para as abas e a tela "A unidade" da maquete.
const UNIDADES = RASCUNHOS.map(r => {
  const R = lerRascunho(r.caminho);
  return { n: r.unidade, titulo: R.unidade.titulo['pt-BR'],
    licoes: R.licoes.filter(l => l.telas).map(l => ({ key: `${r.unidade}.${l.ordem}`, n: l.ordem, titulo: l.titulo['pt-BR'], primeira: l.telas[0].id })) };
});

// Texto anterior de cada tela (só os campos de texto que mudaram), para a revisão lado a lado.
const ANTES = {};
const argAntes = process.argv.find(a => a.startsWith('--antes='));
if (argAntes){
  const ref = argAntes.slice('--antes='.length);
  const velhas = RASCUNHOS.flatMap(r => {
    let velho;
    try { velho = JSON.parse(execFileSync('git', ['show', `${ref}:${r.caminho}`], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch (e) { return []; } // o rascunho não existia nesse commit
    return construirTelas(velho, r.unidade, true);
  });
  const porId = Object.fromEntries(velhas.map(t => [t.id, t]));
  for (const t of TELAS){
    const v = porId[t.id]; if (!v) continue;
    const mudou = {};
    for (const campo of ['goal', 'text', 'why_ok', 'say']) if (v[campo] && v[campo] !== t[campo]) mudou[campo] = v[campo];
    if (v.why_err && JSON.stringify(v.why_err) !== JSON.stringify(t.why_err)) mudou.why_err = v.why_err;
    if (Object.keys(mudou).length) ANTES[t.id] = mudou;
  }
}
const FOTO = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(raiz, 'icons/brune-email.jpg')).toString('base64');

const manifesto = fs.readFileSync(path.join(raiz, 'fr/audio-manifest.js'), 'utf8');
const AUD = {};
const comAudioReal = ['salut', 'bonjour', 'bonsoir', 'ça va', 'merci', 'de rien', "s'il te plaît", "s'il vous plaît", 'pardon', 'au revoir', 'à bientôt'];
for (const f of comAudioReal) {
  const re = new RegExp('"' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*"([^"]+)"');
  const m = manifesto.match(re);
  if (!m) throw new Error('sem áudio no manifesto: ' + f);
  AUD[f] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(raiz, 'fr/audio', m[1])).toString('base64');
}

const saida = fonte.replace('/*__ASSETS__*/', 'const AUD=' + JSON.stringify(AUD) + ';\nconst UNIDADES=' + JSON.stringify(UNIDADES) + ';\nconst TELAS=' + JSON.stringify(TELAS) + ';\nconst ANTES=' + JSON.stringify(ANTES) + ';\nconst FOTO=' + JSON.stringify(FOTO) + ';');
if (saida === fonte) throw new Error('marcador /*__ASSETS__*/ não encontrado');
fs.writeFileSync(path.join(__dirname, 'index.html'), saida);
console.log('index.html:', TELAS.length, 'telas,', Object.keys(ANTES).length, 'com texto anterior,', Object.keys(AUD).length, 'áudios,', Math.round(saida.length / 1024), 'KB');
