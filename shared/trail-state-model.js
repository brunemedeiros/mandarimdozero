// Fase 1 da trilha de Estudo (relatório da Fase 0, 06/10/2026): modelo PURO
// do estado dos itens da trilha e da "próxima" lição. Sem DOM, sem STATE,
// sem rede -- fr e zh chamam estas funções (antes cada idioma tinha a sua
// cópia de recalculateUnlockedUnits/unitBlockState, já divergentes).
//
// Entrada comum (nunca lida de globais):
//   groups   : array de arrays de unidades, na ORDEM da trilha. Francês = um
//              grupo por nível (unitsOfLevel); mandarim = um grupo só.
//              Cada unidade: { id, lessons?: [...] }.
//   progress : mapa unitId -> { started, completed, unlocked, lessonIdx,
//              completedVia? } (é o STATE.unitProgress).
//
// Decisões da professora (06/10/2026) refletidas aqui:
//  - uma única unidade "atual" por trilha: a PRIMEIRA não concluída em ordem
//    (não "a última usada");
//  - existe "pulada": unidade concluída por Ponto de verificação/Teste de
//    Nível. Ela libera a próxima unidade e conta para o nível, mas é
//    distinta de "concluída" (selos/XP/painel tratam à parte, fases futuras);
//  - recomeçar a lição é aceitável: nenhum progresso parcial é lido aqui.

// completedVia (aditivo, sem migration). Ausente ou desconhecido = 'lessons'
// (todo save anterior a esta fase). Só 'skip_test' é "pulada".
const TRAIL_COMPLETED_VIA = ['lessons', 'skip_test'];

function unitCompletedVia(prog){
  if (!prog || !prog.completed) return null;
  return prog.completedVia === 'skip_test' ? 'skip_test' : 'lessons';
}

// Registra COMO a unidade foi concluída. Só escreve na primeira conclusão:
// refazer o ponto de verificação nunca reclassifica uma unidade que o aluno
// já tinha concluído estudando. Não toca em `completed` (quem chama decide).
function stampUnitCompletion(prog, via, dateStr){
  if (!prog || prog.completedVia) return;
  prog.completedVia = via === 'skip_test' ? 'skip_test' : 'lessons';
  if (dateStr) prog.completedAt = dateStr;
}

// Mesma regra que fr/zh já aplicavam (recalculateUnlockedUnits), agora num
// lugar só: a 1ª unidade de cada grupo nasce liberada; as demais liberam
// quando a anterior do mesmo grupo foi concluída (por lições OU pulada). A
// liberação é "pegajosa" (OR com o valor já salvo): nunca tranca de volta o
// que um save anterior já liberou. Muta `progress` e devolve-o.
function recalcUnlocked(groups, progress){
  (groups || []).forEach(units => {
    (units || []).forEach((u, i) => {
      const prog = progress[u.id];
      if (!prog) return;
      if (i === 0){ prog.unlocked = true; return; }
      const prev = progress[units[i - 1].id];
      prog.unlocked = !!(prev && prev.completed) || !!prog.unlocked;
    });
  });
  return progress;
}

// Primeira unidade, em ordem da trilha, que não está concluída E está
// liberada. null = trilha inteira concluída (ou nenhuma liberada).
function currentTrailUnit(groups, progress){
  for (const units of (groups || [])){
    for (const u of (units || [])){
      const prog = progress[u.id];
      if (prog && !prog.completed && prog.unlocked) return u;
    }
  }
  return null;
}

// Estado de uma unidade na trilha:
//   'done'      concluída estudando (completedVia 'lessons' ou ausente)
//   'skipped'   concluída por Ponto de verificação / Teste de Nível
//   'current'   a única unidade "atual" da trilha (currentTrailUnit)
//   'available' liberada, não concluída, mas não é a atual (ex.: 1ª unidade
//               de outro nível, ou unidade liberada fora de ordem)
//   'locked'    ainda não liberada
// Nunca olha lessonIdx para decidir 'done': a conclusão zera lessonIdx.
function trailItemState(unit, groups, progress){
  const prog = progress[unit.id];
  if (!prog) return 'locked';
  if (prog.completed) return unitCompletedVia(prog) === 'skip_test' ? 'skipped' : 'done';
  if (!prog.unlocked) return 'locked';
  const cur = currentTrailUnit(groups, progress);
  return cur && cur.id === unit.id ? 'current' : 'available';
}

// "Continuar": para onde o aluno deve ir agora. Devolve
//   { unitId, lessonIdx, lessonCount }
// lessonIdx = lição a abrir dentro da unidade (0 se nunca começou); para
// unidade sem lições (gramática / motor antigo) lessonCount = 0 e
// lessonIdx = null. null = nada a continuar (trilha concluída).
function nextTrailItem(groups, progress){
  const u = currentTrailUnit(groups, progress);
  if (!u) return null;
  const count = Array.isArray(u.lessons) ? u.lessons.length : 0;
  if (!count) return { unitId: u.id, lessonIdx: null, lessonCount: 0 };
  const raw = (progress[u.id] && progress[u.id].lessonIdx) || 0;
  const idx = Math.min(Math.max(raw, 0), count - 1);
  return { unitId: u.id, lessonIdx: idx, lessonCount: count };
}
