# Conectar Notion: o que a autora faz uma vez (cadastro da integração no Notion)

Sem isso a função `notion-sync` responde `not_configured` e o botão "Conectar Notion" dá erro.

1. Abra https://www.notion.so/profile/integrations (logada no Notion) e clique em **New connection** (Nova conexão).
2. Nome: `Idiomas com Prof. Brune`. Em **Authentication method**, escolha **OAuth** (não "API token": o API token só
   serve para um espaço do Notion e não dá o client ID e o client secret que o site precisa). OAuth é o que o Notion antes
   chamava de integração "pública": cada professora entra com o próprio Notion.
3. Preencha o que a tela pedir (em 2026-11 a tela nova do OAuth pede só o nome e os endereços de volta; site, política,
   termos e e-mail só aparecem se um dia a integração for para a galeria do Notion, e podem ficar em branco):
   - Nome: `Idiomas com Prof. Brune`; logo: o mesmo do site (`icons/` do repositório) ou deixe sem.
   - Site: `https://app.profbrune.com.br`
   - Política de privacidade: `https://app.profbrune.com.br/privacidade-notion.html` (só existe depois do merge na `main`)
   - Termos de uso: `https://app.profbrune.com.br/ajuda/` (rascunho atual)
   - E-mail: `contato@profbrune.com.br`
   - Endereços de volta (Redirect URIs), os dois:
     - `https://agenda.profbrune.com.br/notion/callback` (produção; o Netlify repassa, `infra/agenda-netlify/netlify.toml`)
     - `https://ilfjzizjfcmhibkhwber.supabase.co/functions/v1/notion-sync/callback` (Staging, para testar)
4. Permissões (Capabilities): marque só **Ler conteúdo** (Read content). Desmarque Atualizar e Inserir conteúdo, e em
   informações do usuário escolha **Sem informações** (no user information).
5. Salve. Na aba de configuração aparecem o **OAuth client ID** e o **OAuth client secret**.
6. No Supabase, nos dois projetos (Staging `ilfjzizjfcmhibkhwber` e produção `eigjocalzwamisgqilhg`):
   Edge Functions > Secrets > Add new secret (Staging: https://supabase.com/dashboard/project/ilfjzizjfcmhibkhwber/functions/secrets ;
   produção: https://supabase.com/dashboard/project/eigjocalzwamisgqilhg/functions/secrets), com os nomes exatos `NOTION_CLIENT_ID` e `NOTION_CLIENT_SECRET`.
   Nunca colar os valores no chat.
7. Avise o Claude: ele testa no Staging com o seu Notion e mostra a tela antes de publicar.
