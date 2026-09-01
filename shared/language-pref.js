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

// Grava o novo idioma atual, preservando o progresso de todos os idiomas já
// salvos (mesmo padrão de merge de shared/auth.js: lê o que existe, só
// sobrescreve a chave _meta).
async function setCurrentLearningLanguage(userId, langId){
  const { data: existing, error: fetchError } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchError){
    console.error('Erro ao ler progresso antes de trocar idioma:', fetchError);
    throw fetchError;
  }
  const existingMeta = (existing && existing.data && existing.data._meta) || {};
  const merged = Object.assign({}, existing && existing.data, {
    _meta: Object.assign({}, existingMeta, { currentLearningLanguage: langId }),
  });
  const { error } = await supabaseClient
    .from('progress')
    .upsert({ user_id: userId, data: merged }, { onConflict: 'user_id' });
  if (error){
    console.error('Erro ao salvar idioma atual:', error);
    throw error;
  }
}
