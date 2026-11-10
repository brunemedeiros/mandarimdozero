#!/usr/bin/env node
// Gera index.html (página única, sem dependências) a partir de fonte.html e do rascunho da unidade 1
// (piloto-m1/A1-1/A1-1.json, fonte única do conteúdo das telas: regra 17, decisões 338 a 348).
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
const RASCUNHO = 'docs/i18n/curriculo/piloto-m1/A1-1/A1-1.json';

// `tolerante`: para a comparação com um commit antigo, tela de tipo que não existe mais é ignorada.
function construirTelas(R, tolerante){
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
  // Dados de um diálogo para a maquete: falas, iniciais, nomes e a voz de cada personagem (pelo emoji do falante:
  // 👩 = voz feminina, 👨 = masculina; decisão da dona de 2026-10-15: duas vozes alternando).
  const dialogo = titulo => {
    const d = R.dialogos.find(x => pt(x.titulo) === titulo);
    if (!d) throw new Error('diálogo não encontrado: ' + titulo);
    const voz = f => (f.emoji === '👨' ? 'm' : 'f');
    return { title: pt(d.titulo), scene: pt(d.cena),
      who: { A: iniciais(d.falantes.A.nome), B: iniciais(d.falantes.B.nome) },
      names: { A: d.falantes.A.nome, B: d.falantes.B.nome },
      voices: { A: voz(d.falantes.A), B: voz(d.falantes.B) },
      lines: d.falas.map(f => [f.falante, f.fr, f['pt-BR']]) };
  };

  // Converte uma tela do rascunho para o formato que a maquete desenha. Função pura.
  function telaDaMaquete(t, licao, telasDaLicao){
    const base = { id: t.id, lesson: licao.tipo === 'dialogos' ? 5 : licao.ordem };
    switch (t.tipo){
      case 'abertura': return { ...base, type: 'intro', n: licao.ordem, title: pt(licao.titulo), goal: pt(t.objetivo), size: pt(t.tamanho) };
      case 'cartao': {
        const c = cartao(t.cartao);
        return { ...base, type: 'item', kind: 'Palavra nova', fr: c.fr, tr: pt(c.traducao), role: pt(c.papel_na_funcao) || undefined,
          audios: t.audios || c.fr.split(' / ').map(x => [x, x]) };
      }
      case 'frase': {
        const f = frase(t.frase);
        return { ...base, type: 'item', kind: 'Frase nova', fr: f.fr, tr: f['pt-BR'], role: pt(t.papel) || undefined, audios: [[f.fr, '']] };
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
          ex: n.exemplos.map(e => [e.fr, e['pt-BR'], rot[e.fr] || null, mudas.includes(e.fr)]) };
      }
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
      case 'dialogo_cena': return { ...base, type: 'd_cena', dlg: dialogo(t.dialogo), foco: pt(t.foco) };
      case 'dialogo_ouvir': return { ...base, type: 'd_ouvir', dlg: dialogo(t.dialogo), q: pt(t.pergunta), opts: t.opcoes.map(pt), answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_ler': return { ...base, type: 'd_ler', dlg: dialogo(t.dialogo) };
      case 'dialogo_completar': {
        const d = dialogo(t.dialogo);
        return { ...base, type: 'd_completar', dlg: d, fala: t.fala, opts: t.opcoes, answer: d.lines[t.fala][1], why_ok: pt(t.explicacao) };
      }
      case 'dialogo_quem': return { ...base, type: 'd_quem', dlg: dialogo(t.dialogo), fala: t.fala, why_ok: pt(t.explicacao) };
      case 'dialogo_ordenar': return { ...base, type: 'd_ordenar', dlg: dialogo(t.dialogo), falas: t.falas, why_ok: pt(t.explicacao) };
      case 'dialogo_entendeu': return { ...base, type: 'd_entendeu', dlg: dialogo(t.dialogo), q: pt(t.pergunta), opts: t.opcoes.map(pt), answer: t.resposta, why_ok: pt(t.explicacao) };
      case 'dialogo_papel': return { ...base, type: 'd_papel', dlg: dialogo(t.dialogo), falante: t.falante, distratores: t.distratores, why_ok: pt(t.explicacao) };
      case 'dialogo_fim': return { ...base, type: 'd_fim', dlg: dialogo(t.dialogo), say: pt(t.fala), frases: t.frases };
      default:
        if (tolerante) return null;
        throw new Error('tipo de tela desconhecido: ' + t.tipo);
    }
  }

  return R.licoes.filter(l => l.telas).flatMap(l => l.telas.map(t => telaDaMaquete(t, l, l.telas))).filter(Boolean);
}

const TELAS = construirTelas(JSON.parse(fs.readFileSync(path.join(raiz, RASCUNHO), 'utf8')));

// Texto anterior de cada tela (só os campos de texto que mudaram), para a revisão lado a lado.
const ANTES = {};
const argAntes = process.argv.find(a => a.startsWith('--antes='));
if (argAntes){
  const ref = argAntes.slice('--antes='.length);
  const velho = JSON.parse(execFileSync('git', ['show', `${ref}:${RASCUNHO}`], { cwd: raiz, encoding: 'utf8' }));
  const porId = Object.fromEntries(construirTelas(velho, true).map(t => [t.id, t]));
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

const saida = fonte.replace('/*__ASSETS__*/', 'const AUD=' + JSON.stringify(AUD) + ';\nconst TELAS=' + JSON.stringify(TELAS) + ';\nconst ANTES=' + JSON.stringify(ANTES) + ';\nconst FOTO=' + JSON.stringify(FOTO) + ';');
if (saida === fonte) throw new Error('marcador /*__ASSETS__*/ não encontrado');
fs.writeFileSync(path.join(__dirname, 'index.html'), saida);
console.log('index.html:', TELAS.length, 'telas,', Object.keys(ANTES).length, 'com texto anterior,', Object.keys(AUD).length, 'áudios,', Math.round(saida.length / 1024), 'KB');
