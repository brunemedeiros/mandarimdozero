// MUDANÇAS DE CURRÍCULO do chinês (mesma forma do fr/curriculum-changes.js; C1 de docs/auditoria-paridade-fr-zh.md).
//
// Princípio: o cartão é identificado pelo ITEM (chave `k` congelada em zh/content.js), nunca pelo lugar.
// Unidade, módulo, nível e lição são só prateleiras. Este arquivo guarda o que o carregamento precisa saber
// para levar o progresso de quem já estuda através de uma mudança de conteúdo:
//
//   STUDY_KEY_MERGES   { chaveAntiga: chaveSobrevivente }   item fundido (mesmo item em dois lugares). No carregamento,
//                      o progresso da antiga passa para a sobrevivente; se o save tiver as duas, vale a revisão mais
//                      recente (empate: maior stability; firstLearnedDate = a mais antiga). A com A, B com B.
//                      O perdedor vai para o arquivo (STATE.retiredStudyCards).
//   STUDY_RETIRED_KEYS [chave, ...]   item excluído. O progresso vai para o arquivo e volta se a chave voltar.
//   UNIT_MERGES        { unidadeAntiga: unidadeNova | null }   null = unidade excluída.
//   MODULE_MERGES      { móduloAntigo: móduloNovo | null }     null = módulo excluído.
//   RETIRED_LESSON_IDS ["<unidade>/<id da lição>", ...]       lição removida de propósito.
//   CURRICULUM_VERSION número gravado em cada bloco de progresso (`_curriculumVersion`).
//
// NUNCA editar à mão para "consertar" um id: toda mudança de currículo passa pelo script de operações (Etapa 0b).
// O teste tests/curriculo-ids/test_ids_publicados.js bloqueia o merge se um id já publicado (zh/published_ids.json)
// sumir sem estar no conteúdo, aqui em STUDY_KEY_MERGES ou em STUDY_RETIRED_KEYS.
// Chaves sem o "u" do id do cartão (ex.: "1-v5", "3-p2", "5-d4"). As unidades do zh são números: em UNIT_MERGES e em
// RETIRED_LESSON_IDS escrevem-se como texto ("3", "3/cumprimentar"). O zh ainda não tem módulos (MODULE_MERGES vazio).

const STUDY_KEY_MERGES = {};
const STUDY_RETIRED_KEYS = [];
const UNIT_MERGES = {};
const MODULE_MERGES = {};
const RETIRED_LESSON_IDS = [];
const CURRICULUM_VERSION = 1;

if (typeof module !== 'undefined' && module.exports){
  module.exports = { STUDY_KEY_MERGES, STUDY_RETIRED_KEYS, UNIT_MERGES, MODULE_MERGES, RETIRED_LESSON_IDS, CURRICULUM_VERSION };
}
