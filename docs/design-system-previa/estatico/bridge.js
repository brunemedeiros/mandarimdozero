(function(){
  var r=document.documentElement;
  function apply(o){
    if(o.theme){r.setAttribute('data-theme',o.theme);r.setAttribute('data-bs-theme',o.theme);}
    if(o.lang){r.setAttribute('data-lang',o.lang);
      document.querySelectorAll('[data-lang-name]').forEach(function(e){e.textContent=o.lang==='zh'?'Mandarim':'Francês';});}
  }
  var dark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
  apply({theme:dark?'dark':'light',lang:'fr'});
  addEventListener('message',function(e){if(e.data&&e.data.brune)apply(e.data.brune);});
  try{parent.postMessage({bridgeReady:true},'*');}catch(_){}
})();
