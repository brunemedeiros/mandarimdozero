// Mapa do currículo em dados (decisões 228, 232 e 259): docs/i18n/curriculo/dados/mapa.json + excecoes.json, contados por
// fr/scripts/curriculo_mapa.js. Confere os totais do 08 v2 aprovado e as regras 12, 13, 14, 16 e a decisão 246.
// Se um número não bater, NÃO ajuste o json para forçar: registre em docs/i18n/curriculo/dados/ACHADOS.md.
// Rodar: node tests/curriculo/test_mapa_totais.js
'use strict';
const fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const C = require(path.join(ROOT, 'fr/scripts/curriculo_mapa.js'));

const mapa = C.carregarMapa();
const exc = C.carregarExcecoes();
const ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/published_ids.json'), 'utf8'));
const [A1, A2] = C.contas(mapa);

console.log('== totais do 08 v2 (seção 1 e 3)');
check('A1: 9 módulos', A1.modulos === 9, A1.modulos);
check('A1: 57 unidades', A1.unidades === 57, A1.unidades);
check('A1: 34 vocabulário + 23 gramática', A1.vocabulario === 34 && A1.gramatica === 23, [A1.vocabulario, A1.gramatica]);
check('A1: 385 cartões (decisão 330: + enchanté / enchantée em "Dizer o nome e a nacionalidade"; decisão 331: venir de e les États-Unis trocam de unidade, sem mudar a conta; era 384)', A1.cartoes === 385, A1.cartoes);
check('A1: 762 cartões A/B (385 × 2 − 8 de reconhecimento; decisão 330: ne… pas só de reconhecimento)', A1.ab === 762, A1.ab);
check('A1: 195 novos + 190 publicados', A1.novos === 195 && A1.publicados === 190, [A1.novos, A1.publicados]);
check('A1: cartões por módulo 67/40/51/52/36/29/39/41/30 (decisões 334 e 335: "Perguntar a idade dos outros: até 69", 13, desce para "Família e pessoas próximas"; era 80/27)',
  JSON.stringify(A1.porModulo.map(m => m.cartoes)) === JSON.stringify([67, 40, 51, 52, 36, 29, 39, 41, 30]), A1.porModulo.map(m => m.cartoes));
check('A1: ~152 lições (M1 23, M2 15, M3 19, M4 22, M5 14, M6 12, M7 18, M8 17, M9 12; decisão 335: as 5 lições de "Perguntar a idade dos outros: até 69" passam do M1 ao M2; era M1 28, M2 10)',
  JSON.stringify(A1.porModulo.map(m => m.licoes)) === JSON.stringify([23, 15, 19, 22, 14, 12, 18, 17, 12]), A1.porModulo.map(m => m.licoes));
check('A1: ~31h00 de trilha', A1.tempo === 31 * 60, C.formatarTempo(A1.tempo));
check('A1: "Apresentar-se" fica com o tempo digitado ~3h55 (decisão 270; 16 cartões na A1-1 não mudam a regra, decisões 300 e 308)', A1.porModulo[0].tempo === 3 * 60 + 55, C.formatarTempo(A1.porModulo[0].tempo));
check('A1: 131 notas (decisão 333: a nota de ida e procedência de "Países e cidades" vira duas; era 130)', A1.notas === 131, A1.notas);
check('A1: notas por módulo 29/11/15/14/16/11/11/10/14 (decisão 335: as 2 notas de "Perguntar a idade dos outros" passam ao M2; decisão 333: +1 no M8)',
  JSON.stringify(A1.porModulo.map(m => m.notas)) === JSON.stringify([29, 11, 15, 14, 16, 11, 11, 10, 14]), A1.porModulo.map(m => m.notas));
check('A2: 10 módulos', A2.modulos === 10, A2.modulos);
check('A2: 58 unidades (36 vocabulário + 22 gramática)', A2.unidades === 58 && A2.vocabulario === 36 && A2.gramatica === 22, [A2.unidades, A2.vocabulario, A2.gramatica]);
check('A2: 433 cartões (decisão 323: +7 que voltam, −2 que passam ao A1; era 428)', A2.cartoes === 433, A2.cartoes);
check('A2: 423 novos + 10 publicados', A2.novos === 423 && A2.publicados === 10, [A2.novos, A2.publicados]);
check('A2: 862 cartões A/B', A2.ab === 862, A2.ab);
check('A2: cartões por módulo 49/36/35/48/36/38/48/48/47/48',
  JSON.stringify(A2.porModulo.map(m => m.cartoes)) === JSON.stringify([49, 36, 35, 48, 36, 38, 48, 48, 47, 48]), A2.porModulo.map(m => m.cartoes));
check('A2: ~178 lições (sem mudança pela decisão 323)', A2.licoes === 178, A2.licoes);
check('A2: ~33h10 de trilha pela regra do 08 (40 min por vocabulário, 25 por gramática)', A2.tempo === 33 * 60 + 10, C.formatarTempo(A2.tempo));
check('A2: tempos por módulo do 08 = regra', A2.porModulo.every((m, i) => m.tempo === mapa.niveis[1].modulos[i].tempo_08_min),
  A2.porModulo.map(m => C.formatarTempo(m.tempo)));
check('A2: ~76 notas (77 com le château, que só entra se couber)', A2.notas === 76 && A2.notasCondicionais === 1, [A2.notas, A2.notasCondicionais]);

console.log('== "Cumprimentar e se despedir" (A1-1), unidade polida pela dona (decisões 311 a 314)');
{
  const u = C.indicePorId(mapa)['A1-1'].unidade;
  const ordem = u.cartoes.map(c => `${c.licao}:${c.palavra}`);
  check('16 cartões na ordem da dona, com a lição (1 a 4) de cada cartão', JSON.stringify(ordem) === JSON.stringify([
    '1:salut / coucou', '1:bonjour', '1:bonsoir', '1:monsieur / madame',
    '2:ça va', '2:tu vas bien ? / vous allez bien ?', '2:et toi ? / et vous ?', '2:je vais bien',
    '3:merci', '3:de rien', "3:s'il te plaît / s'il vous plaît", '3:pardon', '3:excuse-moi / excusez-moi',
    '4:au revoir', '4:à bientôt', '4:bonne journée / bonne soirée']), ordem);
  check('as 10 chaves publicadas continuam na unidade', JSON.stringify(u.cartoes.filter(c => c.chave !== 'nova').map(c => c.chave).sort()) ===
    JSON.stringify(['A1-1-v0', 'A1-1-v1', 'A1-1-v2', 'A1-1-v3', 'A1-1-v4', 'A1-1-v5', 'A1-1-v6', 'A1-1-v7', 'A1-1-v8', 'A1-1-v9']));
  check('6 cartões novos (chave "nova"), todos com A e B', u.cartoes.filter(c => c.chave === 'nova').length === 6 && C.cartoesAB(u) === 32, C.cartoesAB(u));
  check('4 lições + Revisão da unidade', C.licoesDaUnidade(u) === 5, C.licoesDaUnidade(u));
  check('lições com id: reaproveita ola-e-tchau, cortesia-e-como-vai e informal-agradecer; despedir-se é nova (decisão 284)',
    JSON.stringify(u.licoes.map(l => l.id)) === JSON.stringify(['ola-e-tchau', 'cortesia-e-como-vai', 'informal-agradecer', 'despedir-se']), u.licoes.map(l => l.id));
  const titulos = C.notasDaUnidade(u).map(n => n.titulo);
  check('9 notas na ordem da dona', JSON.stringify(titulos) === JSON.stringify(['"Bonjour" ou "Bonsoir"?', 'Madame, monsieur e mademoiselle',
    'Ça va pode ser pergunta ou resposta', "Como perguntar 'tudo bem?'", 'Como responder', '"S\'il vous plaît" no dia a dia',
    'Pardon, excuse-moi ou excusez-moi?', 'À plus', 'Salut também pode ser tchau, de modo informal']), titulos);
  check('saem bise, letras mudas e Bienvenue (decisões 291 e 311)', !titulos.some(t => /bise|mudas|Bienvenue/i.test(t)));
  check('toda nota tem momento e exemplos com tradução', C.notasDaUnidade(u).every(n => n.momento && C.palavrasDaNota(n).length > 0));
  check('conferência das lições declaradas: sem problema', C.conferirLicoesDaUnidade(mapa).length === 0, C.conferirLicoesDaUnidade(mapa));
}

console.log('== "Dizer o nome e a nacionalidade" (A1-2) e "Dizer de onde é, onde mora e que línguas fala" (A1-9), decisões 326 a 332');
{
  const idx = C.indicePorId(mapa);
  const u = idx['A1-2'].unidade;
  const ordem = u.cartoes.map(c => `${c.licao}:${c.palavra}`);
  check('A1-2: 15 cartões na ordem da dona, em 3 lições (5 + 4 + 6; decisão 330: enchanté / enchantée no fim da lição 1)', JSON.stringify(ordem) === JSON.stringify([
    '1:je', '1:tu / vous', "1:s'appeler", "1:moi, c'est…", '1:enchanté / enchantée',
    '2:le prénom', '2:le nom', '2:épeler', "2:Ça s'écrit comment ?",
    '3:être', '3:le pays', '3:français / française', '3:brésilien / brésilienne', '3:américain / américaine', '3:ne… pas']), ordem);
  check('A1-2: tu / vous mantém a chave A1-2-v1; américain / américaine mantém A1-9-v2', u.cartoes[1].chave === 'A1-2-v1' && u.cartoes[13].chave === 'A1-9-v2');
  check('A1-2: enchanté / enchantée é cartão novo em par (chave "nova", decisão 330)', u.cartoes[4].chave === 'nova' && u.cartoes[4].origem === 'novo');
  check('A1-2: ne… pas só de reconhecimento (decisão 330); a unidade tem 29 cartões A/B', u.cartoes[14].reconhecimento_so === true && C.cartoesAB(u) === 29, C.cartoesAB(u));
  check('A1-2: lições reaproveitam os ids publicados (decisão 284)', JSON.stringify(u.licoes.map(l => l.id)) === JSON.stringify(['pronomes-e-nome', 'nome-e-ser', 'nacionalidades']), u.licoes.map(l => l.id));
  check('A1-2: 3 lições + Revisão da unidade', C.licoesDaUnidade(u) === 4, C.licoesDaUnidade(u));
  const titulos = C.notasDaUnidade(u).map(n => n.titulo);
  check('A1-2: 8 notas, cada uma com momento (gatilho, decisão 326)', titulos.length === 8 && C.notasDaUnidade(u).every(n => n.momento), titulos);
  const acentos = C.notasDaUnidade(u).find(n => n.titulo === 'Os acentos ao soletrar');
  check('A1-2: nota dos acentos logo depois do alfabeto, com gatilho em Ça s\'écrit comment ? (decisão 330)', acentos && acentos.tipo === 'Exp' && acentos.confianca === 'alta' &&
    acentos.momento.depois_de === "Ça s'écrit comment ?" && titulos.indexOf('Os acentos ao soletrar') === titulos.indexOf('O alfabeto em francês') + 1 &&
    JSON.stringify(acentos.exemplos.map(e => e.fr.split(':')[0])) === JSON.stringify(['é', 'è', 'ê', 'ç', 'ë']));
  check('A1-2: a nota Tu t\'appelles comment ? registra que os exercícios aceitam as duas ordens', /duas ordens/.test(C.notasDaUnidade(u).find(n => n.id === 'N06').correcao || ''));
  check('A1-2: sem nota de "outras nacionalidades"', !titulos.some(t => /outras nacionalidades/i.test(t)));
  const u9 = idx['A1-9'];
  check('A1-9 com o título da decisão 332', u9.unidade.nome === 'Dizer de onde é, onde mora e que línguas fala', u9.unidade.nome);
  check('A1-9 no módulo "Apresentar-se", logo depois de A1-2', u9.modulo === 'A1-m1' && u9.ordemGlobal === idx['A1-2'].ordemGlobal + 1, [u9.modulo, u9.posicao]);
  check('"Família e pessoas próximas" começa em "Apresentar a família"', mapa.niveis[0].modulos[1].unidades[0].id === 'A1-4');
  const p9 = u9.unidade.cartoes.map(c => c.palavra);
  check('A1-9: 12 cartões, com la France (A1-2-v5), le Brésil (A1-2-v6) e les États-Unis, sem américain e sem venir de (decisão 331)', p9.length === 12 &&
    !p9.some(p => /américain/.test(p)) && !p9.includes('venir de') && p9.includes('les États-Unis') &&
    u9.unidade.cartoes.some(c => c.palavra === 'la France' && c.chave === 'A1-2-v5') && u9.unidade.cartoes.some(c => c.palavra === 'le Brésil' && c.chave === 'A1-2-v6'), p9);
  const n9 = C.notasDaUnidade(u9.unidade);
  const habiter = n9.find(n => /^J'habite en France/.test(n.titulo));
  check('A1-9: nota de en / au / aux + país e à + cidade como fórmulas, versão grátis da gramática de países (decisão 331)', habiter && habiter.versao_gratis_de.includes('A1-g4') &&
    JSON.stringify(habiter.exemplos.map(e => e.fr)) === JSON.stringify(["J'habite en France.", "J'habite au Brésil.", "J'habite aux États-Unis.", "J'habite à Paris."]));
  check('A1-9: nenhuma nota cita venir de; a origem vem com Je suis de + cidade', !n9.some(n => /venir|viens/i.test(n.titulo + JSON.stringify(n.exemplos || []))) &&
    n9.some(n => (n.exemplos || []).some(e => e.fr === 'Je suis de Rio.')));
  const u31 = idx['A1-31'].unidade, p31 = u31.cartoes.map(c => c.palavra);
  const n31 = C.notasDaUnidade(u31), ida = n31[0], vinda = n31[1];
  check('"Países e cidades": duas notas breves, cada uma com o seu gatilho (decisão 333): ida depois de partir, procedência depois de venir de',
    ida && vinda && ida.breve && vinda.breve && ida.momento.depois_de === 'partir' && vinda.momento.depois_de === 'venir de' &&
    p31.includes(ida.momento.depois_de) && p31.includes(vinda.momento.depois_de) && ida.versao_gratis_de.includes('A1-g4') && vinda.versao_gratis_de.includes('A1-g4'), n31.map(n => n.titulo));
  check('"Países e cidades": a nota da ida não fala de venir; a da procedência traz d\'Italie e des États-Unis',
    !C.palavrasDaNota(ida).some(f => /vien/.test(f)) && C.palavrasDaNota(ida).some(f => /aux États-Unis/.test(f)) &&
    ["Je viens d'Italie.", 'Je viens des États-Unis.'].every(f => C.palavrasDaNota(vinda).includes(f)) && !C.palavrasDaNota(vinda).some(f => /^Je (vais|pars)/.test(f)));
  check('"Países e cidades": sem a nota antiga que juntava ida e procedência', !n31.some(n => /aller.*venir/.test(n.titulo)));
  check('"Países e cidades": venir de (chave A1-9-v9) logo depois de partir, sem les États-Unis (decisão 331)', p31.length === 10 && !p31.includes('les États-Unis') &&
    p31.indexOf('venir de') === p31.indexOf('partir') + 1 && u31.cartoes.find(c => c.palavra === 'venir de').chave === 'A1-9-v9', p31);
  check('"Gramática: preposições com cidades e países": versão grátis fala da nota nova da A1-9 e do cartão venir de', /J'habite en France/.test(idx['A1-g4'].unidade.versao_gratis_texto) &&
    /cartão venir de/.test(idx['A1-g4'].unidade.versao_gratis_texto) && !/France \/ Brésil\)/.test(idx['A1-g4'].unidade.versao_gratis_texto));
}

console.log('== ordem dos módulos "Apresentar-se" e "Família e pessoas próximas" (decisões 334 e 335)');
{
  const idx = C.indicePorId(mapa);
  const [m1, m2] = mapa.niveis[0].modulos;
  check('ordem do módulo "Apresentar-se" (decisão 335)', JSON.stringify(m1.unidades.map(x => x.id)) ===
    JSON.stringify(['A1-1', 'A1-2', 'A1-9', 'A1-g12', 'A1-3', 'A1-g1', 'A1-22', 'A1-g11']), m1.unidades.map(x => x.id));
  check('ordem do módulo "Família e pessoas próximas" (decisão 335)', JSON.stringify(m2.unidades.map(x => x.id)) ===
    JSON.stringify(['A1-4', 'A1-g17', 'A1-21', 'A1-g2', 'A1-16', 'A1-g22']), m2.unidades.map(x => x.id));
  check('"ordem" de cada unidade = posição na lista (1..n), sem buraco', [m1, m2].every(m => m.unidades.every((u, i) => u.ordem === i + 1)));
  check('"Gramática: perguntar sim ou não" logo depois de "Dizer de onde é, onde mora e que línguas fala" (gatilho Tu parles anglais ?)',
    idx['A1-g12'].ordemGlobal === idx['A1-9'].ordemGlobal + 1 && idx['A1-g12'].posicao === 'M1.4', idx['A1-g12'].posicao);
  check('"Perguntar a idade dos outros: até 69" logo depois da "Gramática: artigos e plural" (M2.3)',
    idx['A1-21'].modulo === 'A1-m7' && idx['A1-21'].ordemGlobal === idx['A1-g17'].ordemGlobal + 1 && idx['A1-21'].posicao === 'M2.3', idx['A1-21'].posicao);
  check('mesmos nomes, ids e funções (só a posição muda)', idx['A1-g12'].unidade.id_funcao === 'gramatica-perguntar-sim-ou-nao' && idx['A1-21'].unidade.id_funcao === 'perguntar-a-idade-dos-outros-ate-69');
  check('"Gramática: être e avoir": versão grátis só em unidades anteriores (sai A1-21, que agora vem depois)',
    JSON.stringify(idx['A1-g1'].unidade.versao_gratis_em) === JSON.stringify(['A1-2', 'A1-3']) && !/M1\.5 il a/.test(idx['A1-g1'].unidade.versao_gratis_texto));
  check('quem concluiu o módulo continua concluído: regra registrada nas duas unidades que mudam de módulo (decisão 330, item 4, estendida)',
    ['A1-g12', 'A1-21'].every(id => /continua com ele concluído/.test(idx[id].unidade.progresso_modulo_concluido || '')));
  check('"Consigo..." dos dois módulos segue a ordem nova', /perguntas de sim ou não/.test(m1.consigo) && !/1 a 69|perguntar a do outro/.test(m1.consigo) &&
    /idade dos outros/.test(m2.consigo) && !/sim ou não/.test(m2.consigo), [m1.consigo, m2.consigo]);
  check('diálogo "No parque" anotado como possível em "Perguntar a idade dos outros" (a decidir)', /No parque/.test(idx['A1-21'].unidade.dialogo_a_decidir || ''));
}

console.log('== revisão dos cortes (decisões 323 e 324)');
{
  const idx = C.indicePorId(mapa);
  const palavras = id => idx[id].unidade.cartoes.map(c => c.palavra);
  const voltam = { 'A1-4': ['les grands-parents', 'marié / mariée'], 'A1-16': ['beau / belle', 'long / longue', 'court / courte'], 'A1-6': ['se coucher'], 'A1-5': ['adorer'],
    'A1-25': ['le menu', 'la boisson'], 'A1-28': ['en espèces', 'le portable', 'le mail'], 'A1-17': ['le studio', "l'immeuble", 'le jardin', 'le balcon'],
    'A2-35': ['bavard', 'paresseux'], 'A2-8': ['en ligne'], 'A2-10': ['le dentiste'], 'A2-16': ['la note'], 'A2-17': ['la faute'], 'A2-30': ["l'écran"] };
  const cartoes = Object.entries(voltam).flatMap(([id, ps]) => ps.map(p => idx[id].unidade.cartoes.find(c => c.palavra === p)));
  check('as 23 palavras voltam a cartão, cada uma na sua unidade, com chave "nova"', cartoes.length === 23 && cartoes.every(c => c && c.chave === 'nova' && c.origem === 'novo'),
    Object.entries(voltam).flatMap(([id, ps]) => ps.filter(p => !palavras(id).includes(p)).map(p => id + ':' + p)));
  check('le portable e le mail só no A1 ("Telefonar e deixar recado" e "Internet e redes" sem os dois)',
    !palavras('A2-27').includes('le portable') && !palavras('A2-30').includes('le mail'));
  check('se marier continua cartão de "Contar as fases da vida" (dois cartões com marié / mariée)', palavras('A2-3').includes('se marier'));
  const vocab = C.unidadesEmOrdem(mapa).flatMap(it => (it.unidade.notas || []).filter(n => n.tipo === 'Vocab').map(n => ({ u: it.unidade.id, n })));
  check('nenhuma nota de vocabulário vazia nem com palavra que virou cartão', vocab.every(({ u, n }) => (n.palavras || []).length > 0 &&
    !(n.palavras || []).some(p => palavras(u).includes(p))), vocab.filter(({ u, n }) => !(n.palavras || []).length || n.palavras.some(p => palavras(u).includes(p))).map(x => x.n.titulo));
  check('saem as 5 notas que ficaram vazias', !vocab.some(({ n }) => ['Mais sobre família', 'Mais sobre rotina', 'Mais sobre o restaurante',
    'Mais sobre pagamento e contato', 'Outras palavras de moradia'].includes(n.titulo)));
  const carater = vocab.find(({ u, n }) => u === 'A2-35' && n.titulo === 'Outras palavras de caráter');
  check('"Outras palavras de caráter" com a lista de origem, sem bavard e paresseux', carater && JSON.stringify(carater.n.palavras) === '["sociable","égoïste","ambitieux"]');
  const paises = vocab.find(({ u, n }) => u === 'A1-31' && n.titulo === 'Outras palavras de países');
  check('"Outras palavras de países" fechada (decisão 324)', paises && JSON.stringify(paises.n.palavras) === JSON.stringify(['la Chine', "l'Argentine", 'le Japon', 'le Mexique', 'les Pays-Bas']));
  check('nenhuma unidade passa do aviso de ~18 cartões', C.sinaisUnidadeGrande(mapa).length === 0, C.sinaisUnidadeGrande(mapa));
}

console.log('== reconhecimento só (decisões 218 e 255; regra 12)');
{
  const rec = C.unidadesEmOrdem(mapa).flatMap(it => (it.unidade.cartoes || []).filter(c => c.reconhecimento_so).map(c => `${it.unidade.id}:${c.palavra}`));
  check('ne… pas (A1-2, decisão 330) + 7 verbos de "Verbos muito usados" (A1-36) + savoir, connaître, dire, donner',
    JSON.stringify(rec) === JSON.stringify(['A1-2:ne… pas', 'A1-36:aller', 'A1-36:faire', 'A1-36:vouloir', 'A1-36:pouvoir', 'A1-36:devoir', 'A1-36:voir', 'A1-36:prendre',
      'A2-10:donner', 'A2-17:savoir', 'A2-17:connaître', 'A2-20:dire']), rec);
  const prendre = mapa.niveis[0].modulos[3].unidades[0].cartoes.find(c => c.palavra === 'prendre');
  check('prendre mantém a chave publicada A1-14-v6 (decisão 255)', prendre && prendre.chave === 'A1-14-v6' && prendre.origem === 'publicado');
}

console.log('== regras');
check('regra 14: nenhuma palavra é cartão em duas unidades (fora as aceitas)', C.conferirRegra14(mapa, exc).length === 0, C.conferirRegra14(mapa, exc));
check('regra 13 (decisão 319): de 3 a 5 cartões por lição nas unidades desenhadas lição por lição', C.conferirCartoesPorLicao(mapa).length === 0, C.conferirCartoesPorLicao(mapa));
{
  const fake = { niveis: [{ id: 'X', modulos: [{ id: 'm', unidades: [{ id: 'U', nome: 'U', tipo: 'vocabulario', cartoes: [
    { palavra: 'a', licao: 1 }, { palavra: 'b', licao: 1 }, { palavra: 'c', licao: 2 }, { palavra: 'd', licao: 2 }, { palavra: 'e', licao: 2 },
    { palavra: 'f', licao: 2 }, { palavra: 'g', licao: 2 }, { palavra: 'h', licao: 2 } ] }] }] }] };
  const p = C.conferirCartoesPorLicao(fake);
  check('regra 13: lição com 2 cartões e lição com 6 são acusadas', p.length === 2 && p.some(x => x.licao === 1 && x.cartoes === 2) && p.some(x => x.licao === 2 && x.cartoes === 6), p);
}
{
  const fake = { niveis: [{ id: 'X', modulos: [{ id: 'm', unidades: [{ id: 'U', nome: 'U', tipo: 'vocabulario',
    licoes: [{ licao: 1, id: 'a', cartoes_aceitos: 6 }, { licao: 2, id: 'b', cartoes_aceitos: 6 }],
    cartoes: Array.from({ length: 13 }, (_, i) => ({ palavra: 'p' + i, licao: i < 6 ? 1 : 2 })) }] }] }] };
  const p = C.conferirCartoesPorLicao(fake);
  check('regra 13: cartoes_aceitos libera só o número aceito (6 passa, 7 continua acusado)', p.length === 1 && p[0].licao === 2 && p[0].cartoes === 7, p);
}
check('regra 13: unidade grande é só aviso (função existe e devolve lista)', Array.isArray(C.sinaisUnidadeGrande(mapa)));
check('regra 12: toda gramática tem versão grátis numa unidade ANTERIOR de vocabulário', C.conferirVersaoGratis(mapa).length === 0, C.conferirVersaoGratis(mapa));
check('regra 16 suspensa (decisão 325): o teto de tempo não entra nas conferências que falham', !('tetoTempo' in C.conferirTudo(mapa, exc, ids)));
check('decisão 246: títulos das notas de vocabulário', C.conferirTitulosNotasVocab(mapa).length === 0, C.conferirTitulosNotasVocab(mapa));
check('decisão 246: existe ao menos uma nota de vocabulário (o teste não roda vazio)',
  C.unidadesEmOrdem(mapa).some(it => (it.unidade.notas || []).some(n => n.tipo === 'Vocab')));
check('decisão 238: id_funcao único e em kebab-case', C.conferirIdFuncao(mapa).length === 0, C.conferirIdFuncao(mapa));
check('excecoes.json: toda unidade citada existe no mapa', C.conferirExcecoes(mapa, exc).length === 0, C.conferirExcecoes(mapa, exc));

console.log('== chaves estáveis');
check('chaves: sem repetição e todas no livro-razão fr/published_ids.json', C.conferirChaves(mapa, ids).length === 0, C.conferirChaves(mapa, ids));
check('todo cartão de palavra publicado está no mapa (como chave ou fundida)', C.chavesPublicadasForaDoMapa(mapa, ids).length === 0, C.chavesPublicadasForaDoMapa(mapa, ids));
{
  const pubUnits = new Set(ids.units);
  const vocabPub = C.unidadesEmOrdem(mapa).filter(it => pubUnits.has(it.unidade.id)).map(it => it.unidade.id);
  check('as 30 unidades publicadas estão no mapa', ids.units.every(u => vocabPub.includes(u)), ids.units.filter(u => !vocabPub.includes(u)));
}

console.log('== funções puras (regras isoladas)');
{
  // decisão 260: a versão grátis tem um lugar só (versao_gratis_em na gramática); a unidade que abriga é derivada.
  const abriga = C.gramaticasAbrigadasPor({ niveis: [{ id: 'X', modulos: [{ id: 'm', unidades: [{ id: 'V1', tipo: 'vocabulario' }, { id: 'V2', tipo: 'vocabulario' }, { id: 'G1', tipo: 'gramatica', versao_gratis_em: ['V1', 'V2'] }] }] }] });
  check('versão grátis derivada: unidade abriga a gramática que a cita', JSON.stringify(abriga) === JSON.stringify({ V1: ['G1'], V2: ['G1'] }), abriga);
  check('mapa.json não repete a ligação nas unidades', !JSON.stringify(mapa).includes('abriga_versao_gratis_de'));
}
{
  const voc = (n, extra) => Object.assign({ tipo: 'vocabulario', cartoes: Array.from({ length: n }, (_, i) => ({ palavra: 'p' + i })) }, extra);
  check('lições: 10 palavras = 3 + Revisão', C.licoesDaUnidade(voc(10)) === 4);
  check('lições: 11 palavras = 4 + Revisão', C.licoesDaUnidade(voc(11)) === 5);
  check('lições: gramática não entra na conta', C.licoesDaUnidade({ tipo: 'gramatica' }) === 0);
  check('lições: valor do 08 vence a regra quando existe', C.licoesDaUnidade(voc(11, { licoes_08: 4 })) === 4);
  check('A/B: reconhecimento tem 1 cartão', C.cartoesAB({ cartoes: [{ palavra: 'a' }, { palavra: 'b', reconhecimento_so: true }] }) === 3);
  const m = { niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'u1', cartoes: [{ palavra: 'Le chat' }] }, { id: 'u2', cartoes: [{ palavra: 'le  chat' }] }] }] }] };
  check('regra 14 acusa repetição (maiúscula e espaço não escondem)', C.conferirRegra14(m, {}).length === 1);
  check('regra 14 aceita a repetição registrada', C.conferirRegra14(m, { regra14_repeticoes_aceitas: [{ palavra: 'le chat' }] }).length === 0);
  const g = { niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'g', tipo: 'gramatica', versao_gratis_em: ['v'] }, { id: 'v', tipo: 'vocabulario' }] }] }] };
  check('versão grátis depois da gramática é acusada', C.conferirVersaoGratis(g).length === 1);
  check('teto da regra 16 é 3h55 (decisão 270)', C.REGRAS.tetoModuloMin === 235, C.REGRAS.tetoModuloMin);
  const t = { niveis: [{ id: 'A1', modulos: [{ id: 'a', tempo_08_min: 236, unidades: [] }, { id: 'b', tempo_08_min: 235, unidades: [] }, { id: 'c', tempo_08_min: 300, unidades: [] }] }] };
  check('teto: 3h56 acusa, 3h55 passa e o último módulo do nível também é acusado', JSON.stringify(C.conferirTetoTempo(t).map(p => p.modulo)) === '["a","c"]', C.conferirTetoTempo(t));
  check('palavrasDaNota: sai dos exemplos com tradução, junta o "palavras" antigo, sem repetir (decisão 274)',
    JSON.stringify(C.palavrasDaNota({ palavras: ['adorer'], exemplos: [{ fr: 'Ça va ?', 'pt-BR': 'Tudo bem?' }, { fr: 'adorer', 'pt-BR': 'adorar' }, { fr: 'sem tradução' }] })) === '["adorer","Ça va ?"]');
  {
    const base = () => ({ niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'u', tipo: 'vocabulario',
      licoes: [{ licao: 1, id: 'a' }, { licao: 2, id: 'b' }, { licao: 3, id: 'c' }],
      cartoes: Array.from({ length: 9 }, (_, i) => ({ palavra: 'p' + i, licao: 1 + Math.floor(i / 3) })),
      notas: [{ titulo: 'n', momento: { licao: 2, depois_de: 'p4' } }] }] }] }] });
    check('lições declaradas: unidade coerente passa', C.conferirLicoesDaUnidade(base()).length === 0, C.conferirLicoesDaUnidade(base()));
    const m1 = base(); m1.niveis[0].modulos[0].unidades[0].notas[0].momento.licao = 3;
    check('lições declaradas: momento da nota fora da lição do cartão é acusado', C.conferirLicoesDaUnidade(m1).length === 1, C.conferirLicoesDaUnidade(m1));
    const m2 = base(); m2.niveis[0].modulos[0].unidades[0].cartoes[8].licao = 4;
    check('lições declaradas: cartão em lição não declarada é acusado', C.conferirLicoesDaUnidade(m2).some(p => p.problema === 'cartão numa lição não declarada'));
    const m3 = base(); m3.niveis[0].modulos[0].unidades[0].licoes.push({ licao: 4, id: 'd' });
    check('lições declaradas: lição sem cartão e conta errada são acusadas', C.conferirLicoesDaUnidade(m3).length === 2, C.conferirLicoesDaUnidade(m3));
  }
  check('título de nota de vocabulário fora do padrão é acusado',
    C.conferirTitulosNotasVocab({ niveis: [{ id: 'A1', modulos: [{ id: 'x', ordem: 1, unidades: [{ id: 'u', notas: [{ tipo: 'Vocab', titulo: 'Outros traços' }] }] }] }] }).length === 1);
}

summary('curriculo mapa totais');
