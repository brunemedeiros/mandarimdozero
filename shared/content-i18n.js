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
//       grammar:{blocks:[{title, body, examples:["t"], table:[{label, pronouns:["..."]}]}], exercises:[{hint, prompt?}]} (só unidades type:"grammar"),
//       trueFalse:[{claim, whyNote}],
//       src: { vocab:{"8":{f}}, phrases:{"1":{f, blocks, scenarioEmoji}}, lines:{"3":{f}},
//              concepts:{id:{"0":{"0":{f}}}}, grammar:{"0":{"0":{f}}} }
//          (opcional) frase do IDIOMA ESTUDADO localizada para o idioma do site: no site em inglês
//          o aluno é americano, então "Je suis brésilienne." vira "Je suis américaine."
//          Mapas esparsos por índice. Chaves aceitas: f (fr), c/p (zh), blocks, scenarioEmoji.
//     } } }
// Fase 10 (mandarim): também aceita histórias e banco de hanzi:
//   stories:{ "1": { title, subtitle, beats:[{lines:["t",...], question:{prompt, options:[...]}}],
//              src:{ beats:{"1":{"1":{c,p}}} } } }   (src opcional: fala localizada, como em units[].src)
//   hanzi:{ "你": { meaning, radicals:["m",...], mnemonic } }   (chave = caractere)
// O texto do aluno nunca passa por aqui: só o conteúdo do curso.
(function(){
  'use strict';
  var DEFAULT_LANG = 'pt-BR';

  function pick(ov, orig){
    return (typeof ov === 'string' && ov !== '') ? ov : orig;
  }

  // Campos do idioma ESTUDADO que o overlay pode trocar (ver `src` no formato abaixo).
  // Guardamos a referência original (não um clone) para restaurar o mesmo objeto.
  var SRC_KEYS = ['f', 'c', 'p', 'blocks', 'scenarioEmoji'];
  function snapSrc(o){
    var s = {};
    SRC_KEYS.forEach(function(k){ if (o && o[k] !== undefined) s[k] = o[k]; });
    return s;
  }
  function applySrc(o, snap, ov){
    if (!o || !snap) return;
    SRC_KEYS.forEach(function(k){
      if (snap[k] === undefined) return;
      var v = ov && ov[k] !== undefined ? ov[k] : snap[k];
      o[k] = v;
    });
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
    if (u.grammar){
      s.grammar = {
        blocks: (u.grammar.blocks || []).map(function(b){
          return { title: b.title, body: b.body, examples: (b.examples || []).map(function(e){ return e.t; }),
            table: b.table ? Object.keys(b.table).map(function(k){ return { label: k, pronouns: b.table[k].map(function(r){ return r.pronoun; }) }; }) : null,
            tableForms: b.table ? Object.keys(b.table).map(function(k){ return b.table[k].map(function(r){ return r.form; }); }) : null };
        }),
        exercises: (u.grammar.exercises || []).map(function(x){ return { prompt: x.prompt, hint: x.hint }; })
      };
    }
    s.trueFalse = (u.trueFalseExercises || []).map(function(x){ return { claim: x.claim, whyNote: x.whyNote }; });
    // Fonte localizada (idioma estudado): vocab/frases/falas/exemplos.
    s.src = {
      vocab: (u.vocab || []).map(snapSrc),
      phrases: (u.phrases || []).map(snapSrc),
      lines: u.dialogue ? (u.dialogue.lines || []).map(snapSrc) : [],
      concepts: {},
      grammar: []
    };
    (u.concepts || []).forEach(function(c){
      s.src.concepts[c.id] = (c.blocks || []).map(function(b){ return (b.examples || []).map(snapSrc); });
    });
    if (u.grammar) s.src.grammar = (u.grammar.blocks || []).map(function(b){ return (b.examples || []).map(snapSrc); });
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
    if (u.grammar && snap.grammar){
      var og = o.grammar || {};
      (u.grammar.blocks || []).forEach(function(b, bi){
        var sb = snap.grammar.blocks[bi], ob = (og.blocks && og.blocks[bi]) || {};
        b.title = pick(ob.title, sb.title);
        b.body = pick(ob.body, sb.body);
        (b.examples || []).forEach(function(e, ei){ e.t = pick(ob.examples && ob.examples[ei], sb.examples[ei]); });
        if (sb.table){
          // Recria a tabela mantendo a ordem das colunas; rótulo traduzido vira a chave.
          var nt = {};
          sb.table.forEach(function(col, ci){
            var oc = (ob.table && ob.table[ci]) || {};
            nt[pick(oc.label, col.label)] = col.pronouns.map(function(pr, ri){ return { pronoun: pick(oc.pronouns && oc.pronouns[ri], pr), form: sb.tableForms[ci][ri] }; });
          });
          b.table = nt;
        }
      });
      (u.grammar.exercises || []).forEach(function(x, i){
        var oe = (og.exercises && og.exercises[i]) || {};
        x.prompt = pick(oe.prompt, snap.grammar.exercises[i].prompt);
        x.hint = pick(oe.hint, snap.grammar.exercises[i].hint);
      });
    }
    (u.trueFalseExercises || []).forEach(function(x, i){
      var ot = (o.trueFalse && o.trueFalse[i]) || {};
      x.claim = pick(ot.claim, snap.trueFalse[i].claim);
      x.whyNote = pick(ot.whyNote, snap.trueFalse[i].whyNote);
    });
    // Frases do idioma estudado localizadas para o idioma do site
    // (ex.: "Je suis brésilienne." -> "Je suis américaine." no site em inglês).
    // Mapas esparsos por índice; ausente = mantém o original.
    var os = o.src || {}, ss = snap.src || {};
    (u.vocab || []).forEach(function(v, i){ applySrc(v, ss.vocab && ss.vocab[i], os.vocab && os.vocab[i]); });
    (u.phrases || []).forEach(function(p, i){ applySrc(p, ss.phrases && ss.phrases[i], os.phrases && os.phrases[i]); });
    if (u.dialogue) (u.dialogue.lines || []).forEach(function(l, i){ applySrc(l, ss.lines && ss.lines[i], os.lines && os.lines[i]); });
    (u.concepts || []).forEach(function(c){
      (c.blocks || []).forEach(function(b, bi){
        (b.examples || []).forEach(function(e, ei){
          var sb = ss.concepts && ss.concepts[c.id] && ss.concepts[c.id][bi];
          var ob = os.concepts && os.concepts[c.id] && os.concepts[c.id][bi];
          applySrc(e, sb && sb[ei], ob && ob[ei]);
        });
      });
    });
    if (u.grammar) (u.grammar.blocks || []).forEach(function(b, bi){
      (b.examples || []).forEach(function(e, ei){
        var sb = ss.grammar && ss.grammar[bi], ob = os.grammar && os.grammar[bi];
        applySrc(e, sb && sb[ei], ob && ob[ei]);
      });
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
    var stories = cfg.stories || [];
    var storySnap = {};
    stories.forEach(function(st){
      storySnap[st.id] = { title: st.title, subtitle: st.subtitle, beats: (st.beats || []).map(function(b){
        return { lines: (b.lines || []).map(function(l){ return l.t; }),
          srcLines: (b.lines || []).map(snapSrc),
          question: b.question ? { prompt: b.question.prompt, options: (b.question.options || []).slice() } : null };
      }) };
    });
    var hanziAll = [];
    (cfg.hanzi || []).forEach(function(lesson){ (lesson || []).forEach(function(h){ hanziAll.push(h); }); });
    var hanziSnap = {};
    hanziAll.forEach(function(h){
      hanziSnap[h.char] = { meaning: h.meaning, radicals: (h.radicals || []).map(function(r){ return r.m; }), mnemonic: h.mnemonic };
    });
    var activeLang = DEFAULT_LANG;
    var activeOverlay = null;
    var loading = {};

    function overlayFor(lang){
      return (window.CONTENT_OVERLAYS && window.CONTENT_OVERLAYS[lang]) || null;
    }

    function loadScript(url){
      return new Promise(function(resolve){
        try {
          var sc = document.createElement('script');
          sc.src = url;
          sc.async = true;
          sc.onload = function(){ resolve(true); };
          sc.onerror = function(){ resolve(false); };
          (document.head || document.documentElement).appendChild(sc);
        } catch (e) { resolve(false); }
      });
    }

    // Carrega o overlay principal e os extras (cfg.extraUrls(lang): ex. desafios).
    function load(lang){
      if (lang === DEFAULT_LANG) return Promise.resolve(true);
      if (loading[lang]) return loading[lang];
      var urls = [cfg.overlayUrl(lang)].concat(typeof cfg.extraUrls === 'function' ? cfg.extraUrls(lang) : []);
      var todo = overlayFor(lang) ? urls.slice(1) : urls;
      loading[lang] = Promise.all(todo.map(loadScript)).then(function(r){
        var ok = r.every(Boolean);
        if (!ok) delete loading[lang];
        return ok;
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
      var os = (activeOverlay && activeOverlay.stories) || {};
      stories.forEach(function(st){
        var sn = storySnap[st.id], o = os[st.id] || {};
        st.title = pick(o.title, sn.title);
        st.subtitle = pick(o.subtitle, sn.subtitle);
        (st.beats || []).forEach(function(b, bi){
          var ob = (o.beats && o.beats[bi]) || {}, sb = sn.beats[bi];
          (b.lines || []).forEach(function(l, li){
            l.t = pick(ob.lines && ob.lines[li], sb.lines[li]);
            // src: fala do idioma estudado localizada (mesma ideia de units[].src)
            var osb = o.src && o.src.beats && o.src.beats[bi];
            applySrc(l, sb.srcLines && sb.srcLines[li], osb && osb[li]);
          });
          if (b.question && sb.question){
            b.question.prompt = pick(ob.question && ob.question.prompt, sb.question.prompt);
            b.question.options = sb.question.options.map(function(op, oi){ return pick(ob.question && ob.question.options && ob.question.options[oi], op); });
          }
        });
      });
      var oh = (activeOverlay && activeOverlay.hanzi) || {};
      hanziAll.forEach(function(h){
        var sn = hanziSnap[h.char], o = oh[h.char] || {};
        h.meaning = pick(o.meaning, sn.meaning);
        (h.radicals || []).forEach(function(r, ri){ r.m = pick(o.radicals && o.radicals[ri], sn.radicals[ri]); });
        if (sn.mnemonic !== undefined) h.mnemonic = pick(o.mnemonic, sn.mnemonic);
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
