// Lição curta (regra 17 do docs/i18n/curriculo/15-regras-do-curriculo.md; decisões 338 a 360): conferência das `telas` de um rascunho
// de unidade (piloto-m1/<unidade>/<unidade>.json) e lista dos textos dos exercícios para o validador "só palavras vistas".
// Um lugar só para as regras das telas: os validar.js de cada unidade chamam estas funções (puras, sem ler arquivo).
'use strict';
const T = require('./curriculo_tamanho_textos.js');

// Ordem das telas de uma lição de diálogo (decisão 355): uma lição por diálogo.
const ETAPAS_DIALOGO = ['dialogo_cena', 'dialogo_ouvir', 'dialogo_ler', 'dialogo_vf', 'dialogo_montar', 'dialogo_lacuna', 'dialogo_ordenar',
  'dialogo_entendeu', 'dialogo_papel', 'dialogo_fim'];

const licoesComTelas = R => R.licoes.filter(l => l.id !== 'checkpoint');

// Par informal / formal em duas telas (decisão 360): o registro vai junto da tradução, não numa etiqueta nem num quadro
// (decisão 361, a dona: tira o foco da palavra). A forma formal com vous pode trazer o sentido de "vocês" em `traducao_plural`.
// Ex.: "Qual é a sua nacionalidade? (formal) ou Qual é a nacionalidade de vocês?". Função pura; null se faltar a tradução no idioma.
const REGISTROS = ['informal', 'formal'];
const OU = { 'pt-BR': 'ou', en: 'or' };
function traducaoNaTela(t, idioma = 'pt-BR'){
  const tr = t.traducao && t.traducao[idioma];
  if (!tr) return null;
  const plural = t.traducao_plural && t.traducao_plural[idioma];
  return `${tr} (${t.registro})` + (plural ? ` ${OU[idioma]} ${plural}` : '');
}

// Devolve a lista de problemas (texto) das telas do rascunho R. Vazia = tudo certo.
function conferirTelas(R){
  const problemas = [];
  const confere = (ok, msg) => { if (!ok) problemas.push(msg); };
  const comTelas = licoesComTelas(R);

  // Cada diálogo na lição dele, com a tela que o mostra (decisões 320, 338 e 355).
  for (const l of comTelas){
    const seus = R.dialogos.filter(d => d.licao === l.id).map(d => d.titulo['pt-BR']);
    const nasTelas = R.dialogos.filter(d => (l.telas || []).some(t => t.tipo.startsWith('dialogo') && t.dialogo === d.titulo['pt-BR'])).map(d => d.titulo['pt-BR']);
    confere(l.inclui_dialogo === (seus.length > 0), `lição ${l.id}: inclui_dialogo não bate com os diálogos dela`);
    confere(JSON.stringify(nasTelas) === JSON.stringify(seus), `lição ${l.id}: as telas não trazem exatamente os diálogos dela`);
  }

  // Pergunta não leva rótulo "Pergunta": o "?" já diz (decisão 361, a dona). Continuam Resposta, Pedido, Fala e o "Pergunta e
  // resposta" do ça va (a mesma forma serve para as duas, e não tem "?").
  const soPergunta = x => ((x || {})['pt-BR'] || '') === 'Pergunta';
  for (const c of R.cartoes) confere(!soPergunta(c.papel_na_funcao), `cartão "${c.fr}": rótulo de pergunta (o "?" já diz)`);
  for (const l of comTelas) for (const t of l.telas || []) confere(!soPergunta(t.papel), `tela ${t.id}: rótulo de pergunta (o "?" já diz)`);

  // Lições de cartões: cada cartão uma vez, na ordem; nota depois do gatilho; exercícios coerentes; "Complete" alternando (decisão 342).
  for (const l of comTelas.filter(l => l.tipo !== 'dialogos')){
    const telas = l.telas || [];
    confere(telas.length > 0, `lição ${l.id} sem telas`);
    if (!telas.length) continue;
    const ids = telas.map(t => t.id);
    // Cartão em par (informal / formal) pode vir em duas telas, uma por forma (decisão 360): forma 0 e depois forma 1.
    const telasCartao = telas.filter(t => t.tipo === 'cartao');
    const cartoesNasTelas = [...new Set(telasCartao.map(t => t.cartao))];
    confere(JSON.stringify(cartoesNasTelas) === JSON.stringify(R.cartoes.filter(c => c.licao === l.id).map(c => c.fr)), `lição ${l.id}: telas de cartão fora da ordem ou da lista do mapa`);
    for (const fr of cartoesNasTelas){
      const ts = telasCartao.filter(t => t.cartao === fr);
      const partida = ts.length === 2 && ts[0].forma === 0 && ts[1].forma === 1 && fr.split(' / ').length === 2 && ts.every(t => t.traducao && t.registro);
      confere((ts.length === 1 && ts[0].forma === undefined) || partida, `lição ${l.id}: cartão "${fr}" deve vir numa tela só ou em duas (forma 0 e forma 1, com tradução e registro)`);
    }
    confere(telas[0].tipo === 'abertura' && telas[telas.length - 1].tipo === 'fim', `lição ${l.id}: começa sem abertura ou termina sem a tela final`);
    for (const t of telas){
      if (t.tipo === 'frase'){
        confere(R.frases_na_frase.some(f => f.fr === t.frase), `tela ${t.id}: frase fora do frases_na_frase`);
        if (t.forma !== undefined) confere([0, 1].includes(t.forma) && t.frase.split(' / ').length === 2 && t.traducao && t.registro, `tela ${t.id}: frase em par mostrada por forma sem forma 0/1, tradução ou registro`);
      }
      if (t.forma !== undefined && (t.tipo === 'cartao' || t.tipo === 'frase')){
        confere(REGISTROS.includes(t.registro), `tela ${t.id}: registro deve ser informal ou formal`);
        confere(!t.traducao_plural || t.forma === 1, `tela ${t.id}: o "vocês" (traducao_plural) só vai na forma formal`);
      }
      if (t.tipo === 'relacionar'){
        const esq = t.pares.map(x => x[0]), dir = t.pares.map(x => x[1]);
        confere(t.pares.length >= 3 && new Set(esq).size === esq.length && new Set(dir).size === dir.length, `tela ${t.id}: "Relacione" com menos de 3 pares ou com item repetido`);
      }
      if (t.tipo === 'nota'){
        const n = R.notas.find(x => x.id === t.nota);
        confere(n && n.destino === 'nota' && n.momento.licao === l.id, `tela ${t.id}: nota inexistente, de outra lição ou marcada como painel`);
        const alvo = n && telas.find(x => (x.tipo === 'cartao' && x.cartao === n.momento.depois_do_cartao) || (x.tipo === 'frase' && x.frase === n.momento.depois_da_frase));
        confere(alvo && ids.indexOf(alvo.id) < ids.indexOf(t.id), `tela ${t.id}: nota antes do gatilho (regra 4)`);
      }
      if (['complete', 'funcao', 'ouvir_escolher'].includes(t.tipo)) confere(t.opcoes.includes(t.resposta), `tela ${t.id}: resposta fora das opções`);
      if (t.tipo === 'vf') confere(typeof t.resposta === 'boolean', `tela ${t.id}: V/F sem resposta verdadeiro/falso`);
      if (t.tipo === 'complete') confere(t.opcoes.length === 2 && t.antes + t.resposta + t.depois === t.frase_completa, `tela ${t.id}: "Complete" sem 2 opções ou com frase completa diferente das partes`);
      if (t.tipo === 'montar') confere(t.resposta.join(' ') === t.frase_completa && t.resposta.every(p => t.pecas.includes(p)) && t.pecas.length > t.resposta.length, `tela ${t.id}: peças, resposta e frase não batem (ou não sobra peça)`);
      if (t.tipo === 'digitar') confere(typeof t.audio === 'string' && typeof t.resposta === 'string' && t.resposta.length > 0, `tela ${t.id}: "digitar" sem áudio ou sem resposta`);
    }
    const completes = telas.filter(t => t.tipo === 'complete').map(t => t.distrator === 'grafia' ? 'grafia' : 'palavra');
    if (completes.length >= 2) confere(new Set(completes).size === 2, `lição ${l.id}: os "Complete" não alternam grafia e outra palavra (decisão 342)`);
  }

  // Lições de diálogo (decisões 353 a 355).
  for (const l of comTelas.filter(l => l.tipo === 'dialogos')){
    const seus = R.dialogos.filter(d => d.licao === l.id);
    confere(seus.length === 1, `lição ${l.id}: precisa de exatamente um diálogo`);
    for (const d of seus){
      const nome = d.titulo['pt-BR'];
      confere(JSON.stringify(l.telas.map(t => t.tipo)) === JSON.stringify(ETAPAS_DIALOGO) && l.telas.every(t => t.dialogo === nome),
        `lição ${l.id}: telas fora da ordem ${ETAPAS_DIALOGO.join(' > ')} (${l.telas.map(t => t.tipo).join(' > ')})`);
      const falaOk = i => Number.isInteger(i) && i >= 0 && i < d.falas.length;
      for (const t of l.telas){
        if (['dialogo_ouvir', 'dialogo_entendeu'].includes(t.tipo)) confere(Number.isInteger(t.resposta) && t.resposta >= 0 && t.resposta < t.opcoes.length, `tela ${t.id}: resposta fora das opções`);
        if (t.tipo === 'dialogo_vf') confere(falaOk(t.fala) && typeof t.resposta === 'boolean', `tela ${t.id}: V/F sem fala válida ou sem resposta verdadeiro/falso`);
        if (t.tipo === 'dialogo_montar') confere(JSON.stringify(Object.keys(t.distratores).map(Number)) === JSON.stringify(d.falas.map((_, i) => i))
          && d.falas.every((f, i) => t.distratores[i].texto !== f.fr && ['grafia', 'registro'].includes(t.distratores[i].tipo)), `tela ${t.id}: falta um distrator de grafia ou de registro por fala (ou distrator igual à fala)`);
        if (t.tipo === 'dialogo_lacuna') confere(falaOk(t.fala) && t.antes + t.resposta + t.depois === d.falas[t.fala].fr && t.opcoes.length === 2 && t.opcoes.includes(t.resposta),
          `tela ${t.id}: lacuna não reconstrói a fala, ou sem 2 opções com a certa`);
        if (t.tipo === 'dialogo_papel'){
          confere(['A', 'B'].includes(t.outro_falante) && t.turnos.some(x => x.outro) && t.turnos.some(x => x.opcoes), `tela ${t.id}: "sua vez" sem falas do outro ou sem escolhas`);
          for (const x of t.turnos.filter(x => x.opcoes)){
            const erradas = x.opcoes.filter((_, k) => k !== x.certa);
            confere(Number.isInteger(x.certa) && x.certa >= 0 && x.certa < x.opcoes.length && x.opcoes.length === 3, `tela ${t.id}: escolha sem 3 opções ou com resposta fora delas`);
            confere(JSON.stringify(Object.keys(x.dicas).sort()) === JSON.stringify(erradas.slice().sort()), `tela ${t.id}: cada opção errada precisa de uma dica (e só elas)`);
          }
        }
        if (t.tipo === 'dialogo_fim') confere(t.frases.length > 0 && t.frases.every(falaOk), `tela ${t.id}: frase da tela final fora do diálogo`);
      }
    }
  }

  // Nota em tela própria ou como painel de exercício (decisão 339).
  const telaComId = id => comTelas.some(l => (l.telas || []).some(t => t.id === id && t.explicacao));
  for (const n of R.notas){
    if (n.destino === 'nota') confere(comTelas.some(l => (l.telas || []).some(t => t.tipo === 'nota' && t.nota === n.id)), `nota "${n.id}" sem tela`);
    else confere(n.destino === 'painel' && (n.paineis || []).length > 0 && n.paineis.every(telaComId), `nota "${n.id}": painel sem tela de exercício com explicação`);
  }

  // Voz da professora calorosa, mas curta (decisão 352).
  for (const a of T.textosLongos(R)) problemas.push(`texto longo demais em ${a.onde} (${a.tipo}): ${a.tamanho} caracteres, limite ${a.limite}`);
  return problemas;
}

// Posição do fim de uma lição (decisões 253 e 320): os cartões das lições 1 a n e só as notas dessas lições. Na última lição é o fim
// da unidade. Devolve {mapa, posicao} sem mexer no mapa real.
function posicaoNoFimDaLicao(M, mapaReal, unidadeId, n){
  const un = M.indicePorId(mapaReal)[unidadeId].unidade;
  if (n >= Math.max(...un.licoes.map(l => l.licao))) return { mapa: mapaReal, posicao: 'fim' };
  const copia = JSON.parse(JSON.stringify(mapaReal));
  const uc = M.indicePorId(copia)[unidadeId].unidade;
  uc.notas = (uc.notas || []).filter(x => x.momento && x.momento.licao <= n);
  return { mapa: copia, posicao: un.cartoes.filter(c => c.licao <= n).length };
}

// Textos em francês das telas para o validador "só palavras vistas": [{grupo, obrigatorio, onde, fr, contexto, mapa}].
// - lições de cartões: na posição da tela (cartões das lições anteriores + os desta lição já mostrados), contexto exercicio_licao;
//   o distrator de grafia é errado de propósito e não entra; o V/F logo depois de uma nota mostra uma forma da nota (informativo).
// - lições de diálogo: as falas e os textos dos exercícios, no contexto dialogo (notas contam, decisão 253).
function textosDasTelas(R, M, mapa, unidadeId){
  const u = M.indicePorId(mapa)[unidadeId].unidade;
  const numLicao = Object.fromEntries(u.licoes.map(l => [l.id, l.licao]));
  const casos = [];
  const add = (grupo, obrigatorio, onde, fr, contexto, mapaDoCaso) => casos.push({ grupo, obrigatorio, onde, fr, contexto, mapa: mapaDoCaso });
  for (const l of licoesComTelas(R)){
    const n = numLicao[l.id];
    if (l.tipo === 'dialogos'){
      const p = posicaoNoFimDaLicao(M, mapa, unidadeId, n);
      const ctx = { tipo: 'dialogo', posicao: p.posicao };
      for (const d of R.dialogos.filter(d => d.licao === l.id)){
        const nome = d.titulo['pt-BR'];
        for (const f of d.falas) add(`Diálogo "${nome}" (lição ${n})`, true, f.chave === 'nova' ? `nova (${f.falante})` : f.chave, f.fr, ctx, p.mapa);
        for (const t of l.telas){
          const textos = t.tipo === 'dialogo_montar' ? Object.values(t.distratores).filter(x => x.tipo === 'registro').map(x => x.texto)
            : t.tipo === 'dialogo_papel' ? t.turnos.flatMap(x => x.outro ? [x.outro.fr] : x.opcoes) : [];
          for (const o of textos) add('Exercícios do diálogo', true, `${nome} ${t.id}`, o, ctx, p.mapa);
        }
      }
      continue;
    }
    const base = posicaoNoFimDaLicao(M, mapa, unidadeId, n - 1);
    let vistos = u.cartoes.filter(c => c.licao < n).length;
    l.telas.forEach((t, i) => {
      if (t.tipo === 'cartao'){ if (!t.forma) vistos++; return; } // cartão em duas telas conta uma vez (decisão 360)
      const ctx = { tipo: 'exercicio_licao', posicao: vistos };
      const onde = `${l.id} ${t.id}`;
      const textos = [];
      if (t.tipo === 'complete'){ textos.push(t.frase_completa); if (t.distrator !== 'grafia') textos.push(...t.opcoes); }
      if (t.tipo === 'funcao') textos.push(...t.opcoes);
      if (t.tipo === 'montar') textos.push(t.frase_completa, ...t.pecas);
      if (t.tipo === 'relacionar') textos.push(...t.pares.map(x => x[0]));
      if (t.tipo === 'vf'){
        const depoisDeNota = l.telas[i - 1] && l.telas[i - 1].tipo === 'nota';
        add(depoisDeNota ? 'Exercícios das telas: V/F de nota (informativo)' : 'Exercícios das telas', !depoisDeNota, onde, t.fr, ctx, base.mapa);
      }
      for (const x of textos) add('Exercícios das telas', true, onde, x, ctx, base.mapa);
    });
  }
  return casos;
}

module.exports = { ETAPAS_DIALOGO, conferirTelas, traducaoNaTela, posicaoNoFimDaLicao, textosDasTelas };
