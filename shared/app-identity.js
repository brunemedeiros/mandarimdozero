// GERADO por scripts/generate_pwa_assets.py a partir de shared/app-identity.json -- não editar à mão.
// Fonte única do nome/identidade do produto pra qualquer tela que precise exibi-lo (Perfil, títulos etc.), sem duplicar a string em cada arquivo.
window.APP_IDENTITY = {
  "_comment": "Fonte única dos dados GLOBAIS da marca (PWA hoje, apps de loja no futuro) -- name/shortName por idioma NÃO moram mais aqui: são derivados em scripts/generate_pwa_assets.py a partir de languages/index.js (fonte de verdade de id/name/appKey, ver Fase A3/B1 da tarefa de rebranding), pra nunca duplicar o nome do idioma em dois arquivos. Editar SÓ este arquivo (pra cor/descrição) ou languages/index.js (pra nome/id) e rodar `python3 scripts/generate_pwa_assets.py` -- ele regenera fr/manifest.json, zh/manifest.json, shared/app-identity.js e os ícones maskable a partir daqui. Nunca editar os manifests ou o app-identity.js à mão -- são gerados.",
  "brand": {
    "productName": "Idiomas com Prof. Brune",
    "author": "Prof. Brune",
    "lang": "pt-BR"
  },
  "apps": {
    "fr": {
      "description": "Estudo pessoal de francês com a Prof. Brune",
      "themeColor": "#3498D6",
      "backgroundColor": "#FAF5EA",
      "name": "Francês com Prof. Brune",
      "shortName": "Francês"
    },
    "zh": {
      "description": "Estudo pessoal de chinês (mandarim) com a Prof. Brune",
      "themeColor": "#C0231F",
      "backgroundColor": "#FBF4E8",
      "name": "Chinês com Prof. Brune",
      "shortName": "Chinês"
    }
  }
};
