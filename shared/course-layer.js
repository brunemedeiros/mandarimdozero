// E2 (docs/i18n/arquitetura-multi-idioma-cursos.md): camada do curso x conteúdo-base.
//
// O conteúdo-base (fr/content.js, zh/content.js) é do IDIOMA ESTUDADO: ids, estrutura, frases,
// hanzi/pinyin, respostas. Tudo que é língua de origem (títulos, metas, traduções, explicações,
// cenários, rótulos) vive na CAMADA DO CURSO (courses/<estudado>-<site>/layer.js), no mesmo
// formato do overlay de inglês (shared/content-i18n.js), mais `dialogue.speakers`.
//
// Funções puras (sem DOM), usadas pelo app e pelos scripts/testes:
//   extract(content) -> layer   lê o texto de língua de origem de um conteúdo completo
//   strip(content)              remove esse texto do conteúdo (deixa só a base), IN PLACE
//   apply(content, layer)       grava a camada no conteúdo, IN PLACE (inverso de strip)
// content = { units, levels?, modules?, levelTests? } (os mesmos arrays de content.js).
//
// Tabelas de conjugação: na base a tabela vira { "0": [{form}], "1": [...] } (colunas por índice);
// a camada traz o rótulo da coluna e o pronome de cada linha, e apply() recria o objeto com rótulos.
(function(root){
  'use strict';

  function put(o, k, v){ if (v !== undefined) o[k] = v; }
  function each(a, fn){ (a || []).forEach(fn); }

  function extractUnit(u){
    var L = {};
    put(L, 'title', u.title);
    put(L, 'goal', u.goal);
    if (u.lessons){ L.lessons = {}; each(u.lessons, function(l){ put(L.lessons, l.id, l.title); }); }
    if (u.vocab) L.vocab = u.vocab.map(function(v){ return v.t; });
    if (u.phrases) L.phrases = u.phrases.map(function(p){ var o = { t: p.t }; put(o, 'scenario', p.scenario); return o; });
    if (u.dialogue){
      L.dialogue = { title: u.dialogue.title,
        lines: (u.dialogue.lines || []).map(function(l){ return l.t; }),
        speakers: (u.dialogue.lines || []).map(function(l){ return l.spk; }) };
    }
    if (u.concepts){
      L.concepts = {};
      each(u.concepts, function(c){
        L.concepts[c.id] = (c.blocks || []).map(function(b){
          var o = { title: b.title, body: b.body, examples: (b.examples || []).map(function(e){ return e.t; }) };
          if (b.variants) o.variants = b.variants.map(function(v){ return v.region; });
          return o;
        });
      });
    }
    if (u.grammar){
      L.grammar = {
        blocks: (u.grammar.blocks || []).map(function(b){
          var o = { title: b.title, body: b.body, examples: (b.examples || []).map(function(e){ return e.t; }) };
          if (b.table) o.table = Object.keys(b.table).map(function(k){ return { label: k, pronouns: b.table[k].map(function(r){ return r.pronoun; }) }; });
          return o;
        }),
        exercises: (u.grammar.exercises || []).map(function(x){ var o = {}; put(o, 'prompt', x.prompt); put(o, 'hint', x.hint); return o; })
      };
    }
    if (u.trueFalseExercises) L.trueFalse = u.trueFalseExercises.map(function(x){ return { claim: x.claim, whyNote: x.whyNote }; });
    return L;
  }

  function extract(content){
    var layer = { units: {} };
    each(content.units, function(u){ layer.units[u.id] = extractUnit(u); });
    if (content.levels){ layer.levels = {}; each(content.levels, function(l){ layer.levels[l.id] = l.label; }); }
    if (content.modules){ layer.modules = {}; each(content.modules, function(m){ layer.modules[m.id] = m.title; }); }
    if (content.levelTests){ layer.levelTests = {}; each(content.levelTests, function(x){ layer.levelTests[x.id] = x.title; }); }
    return layer;
  }

  function stripUnit(u){
    delete u.title; delete u.goal;
    each(u.lessons, function(l){ delete l.title; });
    each(u.vocab, function(v){ delete v.t; });
    each(u.phrases, function(p){ delete p.t; delete p.scenario; });
    if (u.dialogue){ delete u.dialogue.title; each(u.dialogue.lines, function(l){ delete l.t; delete l.spk; }); }
    each(u.concepts, function(c){
      each(c.blocks, function(b){
        delete b.title; delete b.body;
        each(b.examples, function(e){ delete e.t; });
        each(b.variants, function(v){ delete v.region; });
      });
    });
    if (u.grammar){
      each(u.grammar.blocks, function(b){
        delete b.title; delete b.body;
        each(b.examples, function(e){ delete e.t; });
        if (b.table){
          var nt = {};
          Object.keys(b.table).forEach(function(k, ci){ nt[String(ci)] = b.table[k].map(function(r){ return { form: r.form }; }); });
          b.table = nt;
        }
      });
      each(u.grammar.exercises, function(x){ delete x.prompt; delete x.hint; });
    }
    each(u.trueFalseExercises, function(x){ delete x.claim; delete x.whyNote; });
  }

  function strip(content){
    each(content.units, stripUnit);
    each(content.levels, function(l){ delete l.label; });
    each(content.modules, function(m){ delete m.title; });
    each(content.levelTests, function(x){ delete x.title; });
    return content;
  }

  function set(o, k, v){ if (v !== undefined) o[k] = v; }

  function applyUnit(u, L){
    if (!L) return;
    set(u, 'title', L.title); set(u, 'goal', L.goal);
    each(u.lessons, function(l){ if (L.lessons) set(l, 'title', L.lessons[l.id]); });
    each(u.vocab, function(v, i){ if (L.vocab) set(v, 't', L.vocab[i]); });
    each(u.phrases, function(p, i){ var lp = L.phrases && L.phrases[i]; if (lp){ set(p, 't', lp.t); set(p, 'scenario', lp.scenario); } });
    if (u.dialogue && L.dialogue){
      set(u.dialogue, 'title', L.dialogue.title);
      each(u.dialogue.lines, function(l, i){
        if (L.dialogue.lines) set(l, 't', L.dialogue.lines[i]);
        if (L.dialogue.speakers) set(l, 'spk', L.dialogue.speakers[i]);
      });
    }
    each(u.concepts, function(c){
      var lc = L.concepts && L.concepts[c.id];
      each(c.blocks, function(b, bi){
        var lb = lc && lc[bi]; if (!lb) return;
        set(b, 'title', lb.title); set(b, 'body', lb.body);
        each(b.examples, function(e, ei){ if (lb.examples) set(e, 't', lb.examples[ei]); });
        each(b.variants, function(v, vi){ if (lb.variants) set(v, 'region', lb.variants[vi]); });
      });
    });
    if (u.grammar && L.grammar){
      each(u.grammar.blocks, function(b, bi){
        var lb = L.grammar.blocks && L.grammar.blocks[bi]; if (!lb) return;
        set(b, 'title', lb.title); set(b, 'body', lb.body);
        each(b.examples, function(e, ei){ if (lb.examples) set(e, 't', lb.examples[ei]); });
        if (b.table && lb.table){
          var nt = {};
          Object.keys(b.table).forEach(function(k, ci){
            var col = lb.table[ci];
            nt[col ? col.label : k] = b.table[k].map(function(r, ri){
              return { pronoun: col && col.pronouns ? col.pronouns[ri] : r.pronoun, form: r.form };
            });
          });
          b.table = nt;
        }
      });
      each(u.grammar.exercises, function(x, i){ var lx = L.grammar.exercises && L.grammar.exercises[i]; if (lx){ set(x, 'prompt', lx.prompt); set(x, 'hint', lx.hint); } });
    }
    each(u.trueFalseExercises, function(x, i){ var lt = L.trueFalse && L.trueFalse[i]; if (lt){ set(x, 'claim', lt.claim); set(x, 'whyNote', lt.whyNote); } });
  }

  function apply(content, layer){
    if (!layer) return content;
    each(content.units, function(u){ applyUnit(u, layer.units && layer.units[u.id]); });
    each(content.levels, function(l){ if (layer.levels) set(l, 'label', layer.levels[l.id]); });
    each(content.modules, function(m){ if (layer.modules) set(m, 'title', layer.modules[m.id]); });
    each(content.levelTests, function(x){ if (layer.levelTests) set(x, 'title', layer.levelTests[x.id]); });
    return content;
  }

  var CourseLayer = { extract: extract, strip: strip, apply: apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = CourseLayer;
  else root.CourseLayer = CourseLayer;
})(typeof window !== 'undefined' ? window : this);
