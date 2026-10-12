// A lista de idiomas (AVAILABLE_LANGUAGES) agora é GERADA a partir do registro
// único: languages/registry.json -> languages/registry.js (scripts/build-registry.js).
// Para adicionar/alterar um idioma, editar o JSON e rodar `node scripts/build-registry.js`.
// Este arquivo mantém só o que não é dado de idioma e carrega DEPOIS de registry.js.
const LAST_LANGUAGE_KEY = 'last_language';
