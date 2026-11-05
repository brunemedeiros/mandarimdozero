# Conectar Notion: o que a autora faz uma vez (cadastro da integração no Notion)

Sem isso a função `notion-sync` responde `not_configured` e o botão "Conectar Notion" dá erro.

1. Abra https://www.notion.so/profile/integrations (logada no Notion) e clique em **Nova integração** (New integration).
2. Tipo: **Pública** (Public). Pública aqui só quer dizer "outras pessoas podem conectar o Notion delas"; ela não aparece
   na galeria do Notion e não precisa de revisão deles.
3. Preencha:
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
   Edge Functions > Secrets > Add new secret, com os nomes exatos `NOTION_CLIENT_ID` e `NOTION_CLIENT_SECRET`.
   Nunca colar os valores no chat.
7. Avise o Claude: ele testa no Staging com o seu Notion e mostra a tela antes de publicar.
