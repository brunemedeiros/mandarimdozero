// Ícones do site iguais em todo aparelho (docs/icones-fluent.md, decisão da autora em 2026-10-14).
//
// O emoji continua escrito no texto (i18n, conteúdo, telas), mas na hora de mostrar cada emoji conhecido vira o
// desenho do Microsoft Fluent Emoji (versão Color, SVG, licença MIT em shared/icons/fluent/LICENSE) ou uma bandeira
// própria (shared/icons/flags/). O caractere fica dentro do <span class="emo">, transparente: copiar/colar,
// leitores de tela e qualquer código que leia textContent continuam vendo o emoji.
//
// Não mexe em: campo de texto (input/textarea/select/option, editor), <code>/<pre>, <svg>, title/placeholder/aria,
// notificação do celular e e-mail (texto puro, o aparelho desenha). Para desligar num trecho: data-no-emoji-icons.
// Emoji fora do mapa (ex.: digitado num cartão) fica como está. Seta de abrir/fechar (▾ ▸ ▲ ▼) não é ícone e fica.
(function(){
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // emoji (sem o seletor de variação U+FE0F) -> arquivo em shared/icons/
  var MAP = {
    "👩": "fluent/1f469.svg",
    "🙂": "fluent/1f642.svg",
    "🏫": "fluent/1f3eb.svg",
    "🙋‍♀": "fluent/1f64b-200d-2640.svg",
    "📄": "fluent/1f4c4.svg",
    "🧑‍🍳": "fluent/1f9d1-200d-1f373.svg",
    "🧑‍💼": "fluent/1f9d1-200d-1f4bc.svg",
    "🧑‍🌾": "fluent/1f9d1-200d-1f33e.svg",
    "🎩": "fluent/1f3a9.svg",
    "😎": "fluent/1f60e.svg",
    "🤙": "fluent/1f919.svg",
    "🧒": "fluent/1f9d2.svg",
    "🧑‍🦱": "fluent/1f9d1-200d-1f9b1.svg",
    "👵": "fluent/1f475.svg",
    "🧳": "fluent/1f9f3.svg",
    "👩‍💼": "fluent/1f469-200d-1f4bc.svg",
    "🏁": "fluent/1f3c1.svg",
    "🚀": "fluent/1f680.svg",
    "🀄": "fluent/1f004.svg",
    "🧑": "fluent/1f9d1.svg",
    "🎒": "fluent/1f392.svg",
    "👑": "fluent/1f451.svg",
    "🇧🇷": "flags/br.svg",
    "🇨🇳": "flags/cn.svg",
    "🇫🇷": "flags/fr.svg",
    "🇵🇹": "flags/pt.svg",
    "🇺🇸": "flags/us.svg",
    "🈺": "fluent/1f004.svg",
    "🌅": "fluent/1f305.svg",
    "🌍": "fluent/1f30d.svg",
    "🌎": "fluent/1f30e.svg",
    "🌐": "fluent/1f310.svg",
    "🌙": "fluent/1f319.svg",
    "🌟": "fluent/1f31f.svg",
    "🌡": "fluent/1f321.svg",
    "🌦": "fluent/1f326.svg",
    "🌧": "fluent/1f327.svg",
    "🌱": "fluent/1f331.svg",
    "🍂": "fluent/1f342.svg",
    "🍎": "fluent/1f34e.svg",
    "🍗": "fluent/1f357.svg",
    "🍚": "fluent/1f35a.svg",
    "🍜": "fluent/1f35c.svg",
    "🍞": "fluent/1f35e.svg",
    "🍬": "fluent/1f36c.svg",
    "🍵": "fluent/1f375.svg",
    "🍽": "fluent/1f37d.svg",
    "🎁": "fluent/1f381.svg",
    "🎂": "fluent/1f382.svg",
    "🎈": "fluent/1f388.svg",
    "🎉": "fluent/1f389.svg",
    "🎓": "fluent/1f393.svg",
    "🎖": "fluent/1f396.svg",
    "🎙": "fluent/1f399.svg",
    "🎧": "fluent/1f3a7.svg",
    "🎨": "fluent/1f3a8.svg",
    "🎫": "fluent/1f3ab.svg",
    "🎬": "fluent/1f3ac.svg",
    "🎭": "fluent/1f3ad.svg",
    "🎯": "fluent/1f3af.svg",
    "🎴": "fluent/1f3b4.svg",
    "🎵": "fluent/1f3b5.svg",
    "🎸": "fluent/1f3b8.svg",
    "🏃": "fluent/1f3c3.svg",
    "🏅": "fluent/1f3c5.svg",
    "🏆": "fluent/1f3c6.svg",
    "🏠": "fluent/1f3e0.svg",
    "🏮": "fluent/1f3ee.svg",
    "🏷": "fluent/1f3f7.svg",
    "🐈": "fluent/1f408.svg",
    "🐉": "fluent/1f409.svg",
    "🐞": "fluent/1f41e.svg",
    "🐢": "fluent/1f422.svg",
    "🐱": "fluent/1f431.svg",
    "🐶": "fluent/1f436.svg",
    "👀": "fluent/1f440.svg",
    "👁": "fluent/1f441.svg",
    "👆": "fluent/1f446.svg",
    "👋": "fluent/1f44b.svg",
    "👏": "fluent/1f44f.svg",
    "👖": "fluent/1f456.svg",
    "👗": "fluent/1f457.svg",
    "👤": "fluent/1f9d1.svg",
    "👥": "fluent/1f465.svg",
    "👬": "fluent/1f465.svg",
    "👦": "fluent/1f466.svg",
    "👧": "fluent/1f467.svg",
    "👨": "fluent/1f468.svg",
    "💊": "fluent/1f48a.svg",
    "💔": "fluent/1f494.svg",
    "💛": "fluent/1f49b.svg",
    "💡": "fluent/1f4a1.svg",
    "💪": "fluent/1f4aa.svg",
    "💬": "fluent/1f4ac.svg",
    "💳": "fluent/1f4b3.svg",
    "💶": "fluent/1f4b6.svg",
    "💼": "fluent/1f4bc.svg",
    "💾": "fluent/1f4be.svg",
    "📁": "fluent/1f4c1.svg",
    "📂": "fluent/1f4c2.svg",
    "📅": "fluent/1f4c5.svg",
    "📇": "fluent/1f4c7.svg",
    "📈": "fluent/1f4c8.svg",
    "📊": "fluent/1f4ca.svg",
    "📌": "fluent/1f4cc.svg",
    "📍": "fluent/1f4cd.svg",
    "📎": "fluent/1f4ce.svg",
    "📏": "fluent/1f4cf.svg",
    "📖": "fluent/1f4d6.svg",
    "📘": "fluent/1f4d8.svg",
    "📚": "fluent/1f4da.svg",
    "📜": "fluent/1f4dc.svg",
    "📝": "fluent/1f4dd.svg",
    "📟": "fluent/1f4df.svg",
    "📥": "fluent/1f4e5.svg",
    "📦": "fluent/1f4e6.svg",
    "📧": "fluent/1f4e7.svg",
    "📰": "fluent/1f4f0.svg",
    "📱": "fluent/1f4f1.svg",
    "📺": "fluent/1f4fa.svg",
    "🔀": "fluent/1f500.svg",
    "🔁": "fluent/1f501.svg",
    "🔄": "fluent/1f504.svg",
    "🔇": "fluent/1f507.svg",
    "🔊": "fluent/1f50a.svg",
    "🔍": "fluent/1f50d.svg",
    "🔎": "fluent/1f50e.svg",
    "🔒": "fluent/1f512.svg",
    "🔔": "fluent/1f514.svg",
    "🔗": "fluent/1f517.svg",
    "🔢": "fluent/1f522.svg",
    "🔤": "fluent/1f524.svg",
    "🔥": "fluent/1f525.svg",
    "🔴": "fluent/1f534.svg",
    "🔵": "fluent/1f535.svg",
    "🕗": "fluent/1f557.svg",
    "🕰": "fluent/1f570.svg",
    "🖥": "fluent/1f5a5.svg",
    "🖼": "fluent/1f5bc.svg",
    "🗂": "fluent/1f5c2.svg",
    "🗑": "fluent/1f5d1.svg",
    "🗓": "fluent/1f5d3.svg",
    "🗣": "fluent/1f5e3.svg",
    "🗺": "fluent/1f5fa.svg",
    "🗼": "fluent/1f5fc.svg",
    "😊": "fluent/1f60a.svg",
    "😕": "fluent/1f615.svg",
    "🙈": "fluent/1f648.svg",
    "🙋": "fluent/1f64b.svg",
    "🙏": "fluent/1f64f.svg",
    "🚇": "fluent/1f687.svg",
    "🚉": "fluent/1f689.svg",
    "🚌": "fluent/1f68c.svg",
    "🚧": "fluent/1f6a7.svg",
    "⚑": "fluent/1f6a9.svg",
    "🚩": "fluent/1f6a9.svg",
    "🚫": "fluent/1f6ab.svg",
    "🚶": "fluent/1f6b6.svg",
    "🚻": "fluent/1f6bb.svg",
    "🚿": "fluent/1f6bf.svg",
    "🛋": "fluent/1f6cb.svg",
    "🛍": "fluent/1f6cd.svg",
    "🛏": "fluent/1f6cf.svg",
    "🛠": "fluent/1f6e0.svg",
    "🟡": "fluent/1f7e1.svg",
    "🤒": "fluent/1f912.svg",
    "🤔": "fluent/1f914.svg",
    "🤕": "fluent/1f915.svg",
    "🤝": "fluent/1f91d.svg",
    "🥇": "fluent/1f947.svg",
    "🥈": "fluent/1f948.svg",
    "🥉": "fluent/1f949.svg",
    "🥐": "fluent/1f950.svg",
    "🥖": "fluent/1f956.svg",
    "🥛": "fluent/1f95b.svg",
    "🥦": "fluent/1f966.svg",
    "🥩": "fluent/1f969.svg",
    "🥺": "fluent/1f97a.svg",
    "🧀": "fluent/1f9c0.svg",
    "🧠": "fluent/1f9e0.svg",
    "🧩": "fluent/1f9e9.svg",
    "🧪": "fluent/1f9ea.svg",
    "🧬": "fluent/1f9ec.svg",
    "🧭": "fluent/1f9ed.svg",
    "🧱": "fluent/1f9f1.svg",
    "🧾": "fluent/1f9fe.svg",
    "🩺": "fluent/1fa7a.svg",
    "🪑": "fluent/1fa91.svg",
    "👨‍👩‍👧": "fluent/1fac2.svg",
    "👨‍👩‍👧‍👦": "fluent/1fac2.svg",
    "👪": "fluent/1fac2.svg",
    "🫶": "fluent/1faf6.svg",
    "⌨": "fluent/2328.svg",
    "⏭": "fluent/23ed.svg",
    "⏰": "fluent/23f0.svg",
    "⏱": "fluent/23f1.svg",
    "⏳": "fluent/23f3.svg",
    "⏸": "fluent/23f8.svg",
    "⏹": "fluent/23f9.svg",
    "▶": "fluent/25b6.svg",
    "☀": "fluent/2600.svg",
    "☕": "fluent/2615.svg",
    "⚖": "fluent/2696.svg",
    "⚙": "fluent/2699.svg",
    "⚠": "fluent/26a0.svg",
    "⚡": "fluent/26a1.svg",
    "⛅": "fluent/26c5.svg",
    "⛩": "fluent/26e9.svg",
    "✂": "fluent/2702.svg",
    "✅": "fluent/2705.svg",
    "✈": "fluent/2708.svg",
    "✍": "fluent/270d.svg",
    "✏": "fluent/270f.svg",
    "✓": "fluent/2714.svg",
    "✕": "fluent/2716.svg",
    "✨": "fluent/2728.svg",
    "✱": "fluent/2733.svg",
    "❄": "fluent/2744.svg",
    "✗": "fluent/274c.svg",
    "❌": "fluent/274c.svg",
    "❓": "fluent/2753.svg",
    "❤": "fluent/2764.svg",
    "⬅": "fluent/2b05.svg",
    "⬆": "fluent/2b06.svg",
    "⬇": "fluent/2b07.svg",
    "⭐": "fluent/2b50.svg"
  };

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('icons/', script.src).href : '../shared/icons/';
  // Bandeira (par de letras regionais) | sequência com ZWJ e tom de pele | símbolos de texto que viram ícone (✓ ✕ ✗ ✱ ⚑).
  var RE = /\p{Regional_Indicator}\p{Regional_Indicator}|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*|[\u2713\u2715\u2717\u2731\u2691]\uFE0F?/gu;
  var QUICK = /[\u2600-\u27BF\u2B00-\u2BFF\u2691\u23E9-\u23FA\u231A-\u2328\u25B6\uD83C-\uD83E]/;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, TITLE: 1, NOSCRIPT: 1, svg: 1, SVG: 1, TEMPLATE: 1 };

  function norm(e){ return e.replace(/[\uFE0F\uFE0E]/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, ''); }
  function fileFor(e){ return MAP[norm(e)] || null; }

  function skipped(el){
    for (; el && el.nodeType === 1; el = el.parentNode){
      if (SKIP[el.nodeName] || el.isContentEditable) return true;
      if (el.classList && el.classList.contains('emo')) return true;
      if (el.hasAttribute && el.hasAttribute('data-no-emoji-icons')) return true;
    }
    return false;
  }

  function processText(node){
    var t = node.nodeValue;
    if (!t || !QUICK.test(t)) return;
    RE.lastIndex = 0;
    var m, last = 0, frag = null;
    while ((m = RE.exec(t))){
      var f = fileFor(m[0]);
      if (!f) continue;
      if (!frag) frag = document.createDocumentFragment();
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var sp = document.createElement('span');
      sp.className = 'emo';
      sp.style.setProperty('--emo', 'url("' + BASE + f + '")');
      sp.textContent = m[0];
      frag.appendChild(sp);
      last = m.index + m[0].length;
    }
    if (!frag || !node.parentNode) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  function scan(root){
    if (!root) return;
    if (root.nodeType === 3){ if (!skipped(root.parentNode)) processText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var list = [], n;
    while ((n = walker.nextNode())) if (QUICK.test(n.nodeValue)) list.push(n);
    for (var i = 0; i < list.length; i++) if (!skipped(list[i].parentNode)) processText(list[i]);
  }

  function addStyle(){
    var st = document.createElement('style');
    st.setAttribute('data-emoji-icons', '');
    st.textContent = '.emo{display:inline-block;width:1.2em;height:1.2em;line-height:1.2em;vertical-align:-0.22em;'
      + 'background:var(--emo) center/contain no-repeat;color:transparent!important;-webkit-text-fill-color:transparent;'
      + 'text-shadow:none;overflow:hidden;white-space:nowrap;text-align:center;letter-spacing:0;font-style:normal;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function start(){
    addStyle();
    scan(document.body);
    new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++){
        var mu = muts[i];
        if (mu.type === 'characterData') scan(mu.target);
        else for (var j = 0; j < mu.addedNodes.length; j++) scan(mu.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.EmojiIcons = { MAP: MAP, fileFor: fileFor, scan: scan, base: function(){ return BASE; } };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
