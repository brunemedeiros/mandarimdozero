// ---------- Idioma atualmente estudado pela conta (compartilhado) ----------
// Fonte de verdade: mesma linha/tabela `progress` de sempre (user_id, data
// jsonb), guardado em data._meta.currentLearningLanguage -- não precisa de
// tabela nova nem migração de schema, e reaproveita a RLS já configurada.
// localStorage (LAST_LANGUAGE_KEY, ver languages/index.js) continua existindo
// só como atalho de UX pra modo convidado (sem conta) e pra pintar a tela
// mais rápido antes da resposta do Supabase -- nunca é a fonte de verdade
// pra quem tem conta.
//
// Depende de shared/supabase-client.js (supabaseClient) já carregado.

// Idiomas em que o usuário já tem QUALQUER progresso salvo hoje, mesmo sem
// nunca ter definido _meta.currentLearningLanguage explicitamente (contas de
// antes desta feature existir). Mapeia APP_KEY (chave de progresso) -> id do
// idioma em AVAILABLE_LANGUAGES. Se um novo idioma for adicionado, seu
// APP_KEY entra aqui também.
const APP_KEY_TO_LANG_ID = { frances: 'fr', mandarim: 'zh' };

// Lê data._meta.currentLearningLanguage da conta. Se nunca foi definido mas
// a conta já tem progresso salvo em algum idioma (formato anterior a esta
// feature), infere a partir daí em vez de tratar como conta nova -- pra não
// pedir de novo pra quem já estuda. Só retorna null quando a conta é
// realmente nova nessa plataforma (nenhum progresso em nenhum idioma).
async function getCurrentLearningLanguage(userId){
  const { data, error } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error){
    console.error('Erro ao ler idioma atual da conta:', error);
    return null;
  }
  const stored = data && data.data;
  if (stored && stored._meta && stored._meta.currentLearningLanguage){
    return stored._meta.currentLearningLanguage;
  }
  if (stored){
    for (const key of Object.keys(APP_KEY_TO_LANG_ID)){
      if (stored[key]) return APP_KEY_TO_LANG_ID[key];
    }
  }
  return null;
}

// Helper ÚNICO de merge de data._meta (usado pelo idioma estudado e pelo
// idioma do site): lê a linha FRESCA logo antes de gravar e só sobrescreve
// as chaves de `patch` dentro de _meta, preservando o progresso de todos os
// idiomas já salvos e qualquer outra chave de _meta. Nunca passa por
// serializeState() (que é por idioma estudado).
async function mergeProgressMeta(userId, patch){
  const { data: existing, error: fetchError } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchError){
    console.error('Erro ao ler progresso antes de gravar _meta:', fetchError);
    throw fetchError;
  }
  const existingMeta = (existing && existing.data && existing.data._meta) || {};
  const merged = Object.assign({}, existing && existing.data, {
    _meta: Object.assign({}, existingMeta, patch),
  });
  const { error } = await supabaseClient
    .from('progress')
    .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
  if (error){
    console.error('Erro ao salvar _meta:', error);
    throw error;
  }
}

// Grava o novo idioma atual, preservando o progresso de todos os idiomas já
// salvos (mesmo padrão de merge de shared/auth.js: lê o que existe, só
// sobrescreve a chave _meta).
async function setCurrentLearningLanguage(userId, langId){
  await mergeProgressMeta(userId, { currentLearningLanguage: langId });
}

// ---------- Idioma do site (interface + conteúdo), por conta ----------
// Guardado em data._meta.uiLanguage ('pt-BR' | 'en'). Eixo SEPARADO do
// idioma estudado (nunca derivado de APP_KEY/currentLearningLanguage).
// Ordem de leitura: conta > navegador (localStorage 'ui-language') > pt-BR.
// A conta é aplicada por shared/auth.js depois de loadState(); este arquivo
// só lê/grava o valor.
const ACCOUNT_UI_LANGUAGES = ['pt-BR', 'en'];

function normalizeAccountUiLanguage(v){
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  for (const lang of ACCOUNT_UI_LANGUAGES){
    if (lang.toLowerCase() === s) return lang;
  }
  return null;
}

// Extrai o idioma do site de um progress.data já lido (sem rede).
function uiLanguageFromProgressData(progressData){
  const meta = progressData && progressData._meta;
  return normalizeAccountUiLanguage(meta && meta.uiLanguage);
}

async function getAccountUiLanguage(userId){
  const { data, error } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error){
    console.error('Erro ao ler idioma do site da conta:', error);
    return null;
  }
  return uiLanguageFromProgressData(data && data.data);
}

async function setAccountUiLanguage(userId, lang){
  const norm = normalizeAccountUiLanguage(lang);
  if (!norm) throw new Error('idioma do site inválido: ' + lang);
  await mergeProgressMeta(userId, { uiLanguage: norm });
  return norm;
}
