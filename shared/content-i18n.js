// Fase 8 (i18n): conteúdo do curso (trilha) no idioma do site.
//
// O conteúdo-fonte continua em português (fr/content.js, UNITS/MODULES/LEVELS).
// Um "overlay" por idioma (fr/content.en.js -> window.CONTENT_OVERLAYS.en) traz só
// os campos TRADUZÍVEIS. Este módulo guarda um retrato do português original no
// momento da criação e, a cada troca de idioma, reaplica o overlay NO PRÓPRIO
// objeto (os objetos continuam os mesmos, então nenhuma referência existente a
// UNITS/MODULES quebra). Campo sem tradução cai no português. Unidade sem overlay
// aparece inteira em português, com aviso (`isUnitTranslated`).
//
// Formato do overlay (tudo opcional; só o que existir é aplicado):
//   { levels:{A1:"..."}, modules:{"A1-m1":"..."}, levelTests:{"A1-final":"..."},
//     units:{ "A1-1": {
//       title, goal, lessons:{lessonId:"título"},
//       vocab:["t",...], phrases:[{t, scenario}], dialogue:{title, lines:["t",...]},
//       concepts:{conceptId:[{title, body, examples:["t",...], variants:["região",...]}]},
//       trueFalse:[{claim, whyNote}]
//     } } }
// O texto do aluno nunca passa por aqui: só o conteúdo do curso.
(function(){
  'use strict';
  var DEFAULT_LANG = 'pt-BR';

  function pick(ov, orig){
    return (typeof ov === 'string' && ov !== '') ? ov : orig;
  }

  // Retrato do português de UMA unidade (só os campos traduzíveis).
  function snapUnit(u){
    var s = { title: u.title, goal: u.goal };
    s.lessons = (u.lessons || []).map(function(l){ return l.title; });
    s.vocab = (u.vocab || []).map(function(v){ return v.t; });
    s.phrases = (u.phrases || []).map(function(p){ return { t: p.t, scenario: p.scenario }; });
    if (u.dialogue){
      s.dialogue = { title: u.dialogue.title, lines: (u.dialogue.lines || []).map(function(l){ return l.t; }) };
    }
    s.concepts = {};
    (u.concepts || []).forEach(function(c){
      s.concepts[c.id] = (c.blocks || []).map(function(b){
        return { title: b.title, body: b.body, examples: (b.examples || []).map(function(e){ return e.t; }),
          variants: (b.variants || []).map(function(v){ return v.region; }) };
      });
    });
    s.trueFalse = (u.trueFalseExercises || []).map(function(x){ return { claim: x.claim, whyNote: x.whyNote }; });
    return s;
  }

  function applyUnit(u, snap, ov){
    // ov === null -> restaura o português.
    var o = ov || {};
    u.title = pick(o.title, snap.title);
    u.goal = pick(o.goal, snap.goal);
    (u.lessons || []).forEach(function(l, i){
      l.title = pick(o.lessons && o.lessons[l.id], snap.lessons[i]);
    });
    (u.vocab || []).forEach(function(v, i){
      v.t = pick(o.vocab && o.vocab[i], snap.vocab[i]);
    });
    (u.phrases || []).forEach(function(p, i){
      var op = (o.phrases && o.phrases[i]) || {};
      p.t = pick(op.t, snap.phrases[i].t);
      if (snap.phrases[i].scenario !== undefined) p.scenario = pick(op.scenario, snap.phrases[i].scenario);
    });
    if (u.dialogue && snap.dialogue){
      u.dialogue.title = pick(o.dialogue && o.dialogue.title, snap.dialogue.title);
      (u.dialogue.lines || []).forEach(function(l, i){
        l.t = pick(o.dialogue && o.dialogue.lines && o.dialogue.lines[i], snap.dialogue.lines[i]);
      });
    }
    (u.concepts || []).forEach(function(c){
      var ob = (o.concepts && o.concepts[c.id]) || [];
      (c.blocks || []).forEach(function(b, bi){
        var sb = snap.concepts[c.id][bi];
        var obi = ob[bi] || {};
        b.title = pick(obi.title, sb.title);
        b.body = pick(obi.body, sb.body);
        (b.examples || []).forEach(function(e, ei){
          e.t = pick(obi.examples && obi.examples[ei], sb.examples[ei]);
        });
        (b.variants || []).forEach(function(v, vi){
          v.region = pick(obi.variants && obi.variants[vi], sb.variants[vi]);
        });
      });
    });
    (u.trueFalseExercises || []).forEach(function(x, i){
      var ot = (o.trueFalse && o.trueFalse[i]) || {};
      x.claim = pick(ot.claim, snap.trueFalse[i].claim);
      x.whyNote = pick(ot.whyNote, snap.trueFalse[i].whyNote);
    });
  }

  // cfg: { units, modules?, levels?, levelTests?, overlayUrl(lang) -> string,
  //        getLang() -> 'pt-BR'|'en', onApplied(lang) }
  function create(cfg){
    var units = cfg.units || [];
    var snaps = {};
    units.forEach(function(u){ snaps[u.id] = snapUnit(u); });
    var modSnap = {}; (cfg.modules || []).forEach(function(m){ modSnap[m.id] = m.title; });
    var lvlSnap = {}; (cfg.levels || []).forEach(function(l){ lvlSnap[l.id] = l.label; });
    var ltSnap = {}; (cfg.levelTests || []).forEach(function(x){ ltSnap[x.id] = x.title; });
    var activeLang = DEFAULT_LANG;
    var activeOverlay = null;
    var loading = {};

    function overlayFor(lang){
      return (window.CONTENT_OVERLAYS && window.CONTENT_OVERLAYS[lang]) || null;
    }

    function load(lang){
      if (lang === DEFAULT_LANG || overlayFor(lang)) return Promise.resolve(true);
      if (loading[lang]) return loading[lang];
      loading[lang] = new Promise(function(resolve){
        try {
          var s = document.createElement('script');
          s.src = cfg.overlayUrl(lang);
          s.async = true;
          s.onload = function(){ resolve(true); };
          s.onerror = function(){ delete loading[lang]; resolve(false); };
          (document.head || document.documentElement).appendChild(s);
        } catch (e) { resolve(false); }
      });
      return loading[lang];
    }

    function apply(lang){
      activeLang = lang || DEFAULT_LANG;
      activeOverlay = activeLang === DEFAULT_LANG ? null : overlayFor(activeLang);
      var ou = (activeOverlay && activeOverlay.units) || {};
      units.forEach(function(u){ applyUnit(u, snaps[u.id], ou[u.id] || null); });
      (cfg.modules || []).forEach(function(m){
        m.title = pick(activeOverlay && activeOverlay.modules && activeOverlay.modules[m.id], modSnap[m.id]);
      });
      (cfg.levels || []).forEach(function(l){
        l.label = pick(activeOverlay && activeOverlay.levels && activeOverlay.levels[l.id], lvlSnap[l.id]);
      });
      (cfg.levelTests || []).forEach(function(x){
        x.title = pick(activeOverlay && activeOverlay.levelTests && activeOverlay.levelTests[x.id], ltSnap[x.id]);
      });
      if (typeof cfg.onApplied === 'function') cfg.onApplied(activeLang);
    }

    // Carrega o overlay (se preciso) e aplica. Seguro de chamar várias vezes.
    function sync(lang){
      var l = lang || (cfg.getLang && cfg.getLang()) || DEFAULT_LANG;
      return load(l).then(function(){ apply(l); return l; });
    }

    function isUnitTranslated(unitId){
      if (activeLang === DEFAULT_LANG) return true;
      return !!(activeOverlay && activeOverlay.units && activeOverlay.units[unitId]);
    }

    return { sync: sync, apply: apply, isUnitTranslated: isUnitTranslated, activeLang: function(){ return activeLang; } };
  }

  window.ContentI18n = { create: create };
})();
