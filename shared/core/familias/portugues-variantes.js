// Português de Portugal x português do Brasil nas respostas ESCRITAS em português (família latina; regra da dona,
// 2026-10-26, ampliada em 2026-10-29 para todo exercício com resposta em português).
//
// Os sites ensinam e corrigem o português do BRASIL. Resposta com marca de Portugal nunca é "certa": se, trocada pela
// forma do Brasil, ela seria aceita, o resultado é "Quase" (o mesmo "quase" de cada exercício: XP de EXERCISE_XP_ALMOST,
// nota Difícil na Revisão, meio ponto na gramática/Conjugação) e a devolutiva mostra a forma do Brasil
// ("No Brasil se diz: estou comendo (em vez de "estou a comer").").
//
// Só entram marcas seguras: a construção estar/andar/ficar + "a" + infinitivo ("estou a comer" = "estou comendo") e
// vocabulário típico de Portugal (lista abaixo). "tu" + 2ª pessoa NÃO conta (o Brasil também usa).
//
// Quem usa:
//  - Ouça e traduza dos Desafios (resposta em pt-BR): listenTranslateVerdict em shared/desafios.js.
//  - Lição (digitar de ouvido, lacuna digitada), Revisão (Digite a resposta, Cloze; também os cartões do Banco),
//    gramática e Conjugação, quando o site declara LANG_HOOKS.typedAnswerLang = 'pt-BR' (o site de português):
//    typedPtBrAdjust / typedPtBrNoteHTML em shared/core/licao-feedback.js. fr e zh não declaram: nada muda.
//
// Funções PURAS (sem DOM, sem STATE, sem t() próprio). Uso no Node: require('shared/core/familias/portugues-variantes.js');
// na página: window.PortuguesVariantes (carregado por todos os sites, antes de shared/desafios.js).
// Testes: tests/desafios-ptpt/ (Ouça e traduza) e tests/respostas-ptbr/ (lição, Revisão, gramática, site de mentira 'pt').
(function (root) {
  'use strict';

  // = normalizeForTranslationCompare (shared/desafios.js): minúsculas, sem acento, pontuação vira espaço.
  function normalizar(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,!?;:'"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var PT_EU_ASPECT_AUX = new Set([
    'estou','estas','esta','estamos','estao','estava','estavas','estavamos','estavam','estive','estiveste','esteve',
    'estivemos','estiveram','estarei','estaras','estara','estaremos','estarao','estaria','estarias','estariamos','estariam',
    'esteja','estejas','estejamos','estejam','estivesse','estivesses','estivessemos','estivessem','estar',
    'ando','andas','anda','andamos','andam','andava','andavas','andavamos','andavam','andei','andou','andaram','andar',
    'fico','ficas','fica','ficamos','ficam','ficava','ficavas','ficavamos','ficavam','fiquei','ficou','ficaram','ficar',
    'ficarei','ficara','ficaria'
  ]);
  // Palavras em -ar/-er/-ir que não são infinitivo depois de "estar a" (substantivos).
  var PT_EU_NOT_INFINITIVE = new Set(['lugar','mar','par','ar','bar','colher','mulher','prazer','altar','nivel','dever']);
  // [palavras de Portugal (normalizadas, sem acento), forma do Brasil]
  var PT_EU_VOCAB = [
    [['casas','de','banho'], 'banheiros'], [['casa','de','banho'], 'banheiro'],
    [['pequenos','almocos'], 'cafés da manhã'], [['pequeno','almoco'], 'café da manhã'], [['pequeno-almoco'], 'café da manhã'],
    [['telemovel'], 'celular'], [['telemoveis'], 'celulares'],
    [['autocarro'], 'ônibus'], [['autocarros'], 'ônibus'],
    [['comboio'], 'trem'], [['comboios'], 'trens'],
    [['facto'], 'fato'], [['factos'], 'fatos'],
    [['contacto'], 'contato'], [['contactos'], 'contatos'], [['contactar'], 'contatar'],
    [['ecra'], 'tela'], [['ecras'], 'telas'],
    [['frigorifico'], 'geladeira'], [['frigorificos'], 'geladeiras'],
    [['rapariga'], 'moça'], [['raparigas'], 'moças']
  ];
  // "sumo" (suco) só como substantivo: "eu sumo" (do verbo sumir) é do Brasil.
  var PT_EU_SUMO_BEFORE = new Set(['o','um','os','uns','do','no','ao','meu','teu','seu','nosso','este','esse','aquele','de','com']);
  var PT_EU_TRANSPORT = new Set(['autocarro','autocarros','comboio','comboios','onibus','trem','trens','metro','taxi','aviao','barco','eletrico','electrico']);

  function gerundio(inf) {
    if (inf === 'por') return 'pondo';
    return inf.slice(0, -2) + ({ ar: 'ando', er: 'endo', ir: 'indo' })[inf.slice(-2)];
  }
  function ehInfinitivo(w) {
    return (/^[a-z]{2,}(ar|er|ir)$/.test(w) && !PT_EU_NOT_INFINITIVE.has(w)) || w === 'por';
  }

  // Devolve { text: a resposta com as formas do Brasil, marks: [{ pt, br }] } (marks vazio = nenhuma marca; text igual).
  function paraBrasil(text) {
    var toks = String(text || '').split(/\s+/).filter(Boolean).map(function (raw) {
      var core = raw.replace(/^[^\p{L}\d]+|[^\p{L}\d-]+$/gu, '');
      return { raw: raw, core: core, norm: normalizar(core) };
    });
    var out = [], marks = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      // estar/andar/ficar + a + infinitivo -> gerúndio
      if (PT_EU_ASPECT_AUX.has(t.norm) && toks[i + 1] && toks[i + 1].norm === 'a' && toks[i + 2] && ehInfinitivo(toks[i + 2].norm)) {
        var ger = gerundio(toks[i + 2].norm);
        out.push(t.core, ger);
        marks.push({ pt: (t.core + ' a ' + toks[i + 2].core).toLowerCase(), br: (t.core + ' ' + ger).toLowerCase() });
        i += 2; continue;
      }
      // apanhar (o autocarro, o comboio...) -> pegar
      if (/^apanh(ar|o|as|a|amos|am|ei|ou|aram|ava|avas|avamos|avam|aste|ando|e|es|em)$/.test(t.norm)
          && toks.slice(i + 1, i + 4).some(function (x) { return PT_EU_TRANSPORT.has(x.norm); })) {
        var rest = t.norm.slice(5);
        var brv = (/^[ei]/.test(rest) ? 'pegu' : 'peg') + rest;
        out.push(brv); marks.push({ pt: t.core.toLowerCase(), br: brv }); continue;
      }
      if (t.norm === 'sumo' && ((i > 0 && PT_EU_SUMO_BEFORE.has(toks[i - 1].norm)) || (toks[i + 1] && toks[i + 1].norm === 'de'))) {
        out.push('suco'); marks.push({ pt: 'sumo', br: 'suco' }); continue;
      }
      if (t.norm === 'sumos') { out.push('sucos'); marks.push({ pt: 'sumos', br: 'sucos' }); continue; }
      var v = null;
      for (var k = 0; k < PT_EU_VOCAB.length && !v; k++) {
        var seq = PT_EU_VOCAB[k][0];
        if (seq.every(function (w, j) { return toks[i + j] && toks[i + j].norm === w; })) v = PT_EU_VOCAB[k];
      }
      if (v) {
        var n = v[0].length;
        out.push(v[1]);
        marks.push({ pt: toks.slice(i, i + n).map(function (x) { return x.core; }).join(' ').toLowerCase(), br: v[1] });
        i += n - 1; continue;
      }
      out.push(t.raw);
    }
    return { text: marks.length ? out.join(' ') : String(text || ''), marks: marks };
  }

  // Veredito geral. resposta = o que a pessoa escreveu; aceitas = lista de respostas aceitas (usada pela comparação
  // padrão: igual sem maiúscula, acento e pontuação); opcoes.aceita(texto, aceitas) -> boolean troca a comparação
  // pela do exercício (ex.: o veredito da lição). Devolve null quando a regra não se aplica (sem marca de Portugal, ou
  // nem a resposta nem a versão do Brasil seriam aceitas: aí o exercício julga como sempre), ou
  // { verdict: 'almost', pairs: [{ pt, br }], text: resposta com as formas do Brasil }.
  function ptBrVerdictAdjust(resposta, aceitas, opcoes) {
    var conv = paraBrasil(resposta);
    if (!conv.marks.length) return null;
    var o = opcoes || {};
    var aceita = typeof o.aceita === 'function' ? o.aceita : function (texto, lista) {
      var x = normalizar(texto);
      return !!x && (lista || []).some(function (a) { return normalizar(a) === x; });
    };
    if (!aceita(conv.text, aceitas) && !aceita(String(resposta || ''), aceitas)) return null;
    return { verdict: 'almost', pairs: conv.marks, text: conv.text };
  }

  function escaparPadrao(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // HTML da devolutiva: "<lead> No Brasil se diz: <strong>estou comendo</strong> (em vez de "estou a comer")."
  // opcoes: t(chave, vars) (obrigatório: o catálogo do site ou o chT dos Desafios), keys { line, pair } (padrão
  // 'answer.ptpt.line' / 'answer.ptpt.pair' de shared/i18n), esc (escape do texto da pessoa), tag ('div'),
  // cls ('review-almost'), lead (texto antes da linha, ex.: "Quase! Essa forma é de Portugal."; escapado).
  function ptBrFeedbackHTML(pairs, opcoes) {
    var o = opcoes || {};
    if (!pairs || !pairs.length || typeof o.t !== 'function') return '';
    var esc = typeof o.esc === 'function' ? o.esc : escaparPadrao;
    var keys = o.keys || {};
    var kLine = keys.line || 'answer.ptpt.line', kPair = keys.pair || 'answer.ptpt.pair';
    var tag = o.tag || 'div', cls = o.cls == null ? 'review-almost' : o.cls;
    var forms = pairs.map(function (m) { return o.t(kPair, { br: esc(m.br), pt: esc(m.pt) }); }).join(', ');
    return '<' + tag + ' class="' + cls + '">' + (o.lead ? esc(o.lead) + ' ' : '') + o.t(kLine, { forms: forms }) + '</' + tag + '>';
  }

  var api = {
    normalizar: normalizar,
    paraBrasil: paraBrasil,
    ptEuropeanToBrazilian: paraBrasil,
    ptBrVerdictAdjust: ptBrVerdictAdjust,
    ptBrFeedbackHTML: ptBrFeedbackHTML
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PortuguesVariantes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
