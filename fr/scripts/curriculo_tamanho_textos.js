// Tamanho dos textos da lição curta na voz da professora (decisão 352): calorosa, mas curta.
// Um toque de calor por tela (título do painel, uma frase de incentivo no erro, a abertura e a fala final);
// a explicação em si é direta. Os limites contam caracteres visíveis (sem tags HTML).
// Uso: require e chamar textosLongos(rascunho); o validar.js de cada unidade piloto acusa o que passar.
'use strict';

const LIMITES = {
  abertura: 120,      // objetivo da lição dito pela professora
  painel: 110,        // explicação do painel (vale para acerto e erro)
  painelComErro: 150, // incentivo do erro + explicação, como o aluno lê quando erra
  falaFinal: 70,      // fala da professora na tela final
  nota: 340,          // texto da nota em tela própria (sem os exemplos)
};

function semTags(html){ return String(html || '').replace(/<[^>]+>/g, ''); }
function tamanho(campo){ return semTags(campo && campo['pt-BR']).length; }

// Devolve [{ onde, tipo, tamanho, limite }] para cada texto acima do limite. Função pura.
function textosLongos(rascunho, limites = LIMITES){
  const achados = [];
  const confere = (onde, tipo, n) => { if (n > limites[tipo]) achados.push({ onde, tipo, tamanho: n, limite: limites[tipo] }); };
  for (const licao of rascunho.licoes || []){
    for (const t of licao.telas || []){
      if (t.tipo === 'abertura') confere(t.id, 'abertura', tamanho(t.objetivo));
      if (t.tipo === 'fim' && t.fala) confere(t.id, 'falaFinal', tamanho(t.fala));
      if (t.explicacao){
        const base = tamanho(t.explicacao);
        confere(t.id, 'painel', base);
        for (const [opcao, texto] of Object.entries(t.explicacao_erro || {})) confere(`${t.id} (erro: ${opcao})`, 'painelComErro', base + tamanho(texto));
      }
    }
  }
  for (const n of rascunho.notas || []) if (n.destino !== 'painel') confere(n.id, 'nota', tamanho(n.texto));
  return achados;
}

module.exports = { LIMITES, textosLongos, semTags };
