// ---------- Supabase: conexão (compartilhada por todos os idiomas) ----------
// Mesmo projeto Supabase pra toda a plataforma -- uma linha por usuário na
// tabela `progress`, cada idioma guarda seu estado sob sua própria chave
// dentro da coluna `data` (ver APP_KEY em cada languages/<lang>/app.js e
// saveState()/loadState() em shared/auth.js). A anon key não é segredo --
// é a mesma já pública no cliente, só habilita a RLS de leitura/escrita
// já configurada no banco.
//
// Depende do SDK do Supabase (CDN, carregado em <head>) já estar disponível
// quando este script roda -- por isso vem no fim do <body>, junto dos
// outros shared/*.js, nunca antes do <script src=".../supabase-js...">.
const SUPABASE_URL = 'https://eigjocalzwamisgqilhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZ2pvY2FsendhbWlzZ3FpbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjYzNjksImV4cCI6MjEwMjUwMjM2OX0.EyW4vyQcFL2vrBoo-rpLD5J8LNBT3aSEJREZTSqzHVU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL "limpa" (sem #access_token nem outros fragmentos) pra usar como
// redirectTo do OAuth/reset de senha. Usar window.location.href direto é
// perigoso: se a URL já tiver um #access_token sobrando de uma tentativa
// anterior que falhou, o Google devolve um token novo em cima do antigo em
// vez de substituir, quebrando o parsing — e piora a cada nova tentativa.
function cleanRedirectURL(){
  return window.location.origin + window.location.pathname;
}
