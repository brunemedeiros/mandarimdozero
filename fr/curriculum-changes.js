// MUDANÇAS DE CURRÍCULO do francês (Etapa 0 de docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, seção 2).
//
// Princípio: o cartão é identificado pelo ITEM (chave `k` congelada em fr/content.js), nunca pelo lugar.
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
// O teste tests/curriculo-ids/test_ids_publicados.js bloqueia o merge se um id já publicado (fr/published_ids.json)
// sumir sem estar no conteúdo, aqui em STUDY_KEY_MERGES ou em STUDY_RETIRED_KEYS.
// Chaves sem o "u" do id do cartão (ex.: "A1-3-v5", "A1-3-p2", "A1-3-d4").

const STUDY_KEY_MERGES = {};
const STUDY_RETIRED_KEYS = [];
const UNIT_MERGES = {};
const MODULE_MERGES = {};
const RETIRED_LESSON_IDS = [];
const CURRICULUM_VERSION = 1;

if (typeof module !== 'undefined' && module.exports){
  module.exports = { STUDY_KEY_MERGES, STUDY_RETIRED_KEYS, UNIT_MERGES, MODULE_MERGES, RETIRED_LESSON_IDS, CURRICULUM_VERSION };
}
