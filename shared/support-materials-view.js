// ---------- Material de apoio (lado da aluna) -- Fase 8b do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Tela nova pra QUALQUER conta logada (não só quem tem professora
// vinculada -- mesmo padrão de "📇 Meus Cartões", sem gate de admin), mas
// SOMENTE LEITURA: grillado, esta fase não dá autoria de material à aluna
// (diferente de Meus Cartões) -- ela só vê o que foi atribuído a ela.
// Maioria das contas verá o estado vazio (só quem tem professora vinculada
// e já recebeu material terá algo aqui) -- decisão deliberada de manter a
// entrada de menu sempre visível (mesmo raciocínio de "Meus Cartões", que
// também está vazio pra quem nunca criou nada), em vez de gastar uma
// chamada de rede extra no boot só pra decidir se esconde o item de menu.
//
// Depende de (mesma posição de shared/my-flashcards.js -- antes de
// app.js):
//   - shared/teacher-support-materials.js (fetchSupportMaterialsForCurrentStudent)
//   - fr/zh app.js                        (APP_KEY, CURRENT_USER via shared/auth.js)

async function renderSupportMaterialsView(){
  const wrap = document.getElementById('support-materials-content');
  if (!wrap) return;
  if (!CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">Entre na sua conta pra ver seu material de apoio.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const materials = await fetchSupportMaterialsForCurrentStudent(APP_KEY);

  const materialCardHTML = (m) => `
    <div class="admin-badge-row" style="align-items:flex-start;">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(m.title)}</div>
        <div class="admin-badge-desc">
          ${m.description ? `<span style="white-space:pre-wrap;">${escapeHTML(m.description)}</span><br>` : ''}
          ${m.link_url ? `<a href="${escapeHTML(m.link_url)}" target="_blank" rel="noopener noreferrer">🔗 Abrir link</a><br>` : ''}
          ${m.file_url ? `<a href="${escapeHTML(m.file_url)}" target="_blank" rel="noopener noreferrer">📎 ${escapeHTML(m.file_name || 'Baixar arquivo')}</a><br>` : ''}
          enviado em ${new Date(m.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  `;

  wrap.innerHTML = materials.length
    ? materials.map(materialCardHTML).join('')
    : `<p class="profile-empty-note">Sua professora ainda não enviou nenhum material de apoio. Quando ela enviar algo (um resumo, um link, um arquivo), ele aparece aqui.</p>`;
}
