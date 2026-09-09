const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availableSlots, weeklyCapacity, planningPatchSchema, defaultPlanning } = require('../.checks/planning.js');
const { planningWarnings, projectSummaries } = require('../.checks/academic.js');
const { missionSchema } = require('../.checks/validation.js');
const { advanceSession, pauseSession, resumeSession, phaseRemaining } = require('../.checks/study-session.js');
const task = { id: 't', title: 'Informe', subject: 'Física', date: '2026-09-08', time: '18:00', completed: false, status: 'pending', priority: 'normal', estimatedMinutes: 120 };

test('disponibilidad combina solapamientos y no cuenta días ni horas pasadas', () => {
  const a = { days: [2], startTime: '08:00', endTime: '14:00', commitments: [{ id: 'c', title: 'Transporte', days: [2], startTime: '09:00', endTime: '11:00' }] };
  const day = new Date(2026,8,8,12);
  assert.deepEqual(availableSlots(day, a, [{ startTime: '10:00', endTime: '12:00' }], new Date(2026,8,8,9)), [{ start:720, end:840 }]);
  assert.deepEqual(availableSlots(new Date(2026,8,7,12), a, []), []);
  assert.deepEqual(availableSlots(day, a, [], new Date(2026,8,9,12)), []);
});
test('bloques reservados no se descuentan dos veces al comparar carga y capacidad', () => {
  const a = { days: [2], startTime: '10:00', endTime: '12:00', commitments: [] };
  const t = { ...task, studyBlocks: [{ id:'b', date:task.date, startTime:'10:00', endTime:'11:00' }] };
  const load = weeklyCapacity(new Date(2026,8,8,9), a, [t], [], new Date(2026,8,8,9));
  assert.equal(load.capacity,120); assert.equal(load.reserved,60); assert.equal(load.unreserved,60); assert.equal(load.shortage,0);
  assert.equal(weeklyCapacity(new Date(2026,8,8,9),a,[{...t,estimatedMinutes:180}],[],new Date(2026,8,8,9)).shortage,60);
});
test('validación limita prioridades a tres y rechaza duplicados y horarios inválidos', () => {
  assert.equal(planningPatchSchema.safeParse({ dailyFocus: { date: '2026-09-08', missionIds:['1','2','3','4'] } }).success,false);
  assert.equal(planningPatchSchema.safeParse({ dailyFocus: { date: '2026-09-08', missionIds:['1','1'] } }).success,false);
  assert.equal(planningPatchSchema.safeParse({ availability:{...defaultPlanning.availability,startTime:'20:00',endTime:'08:00'} }).success,false);
  assert.equal(planningPatchSchema.safeParse({ concentration:{mode:'interval',workMinutes:0,breakMinutes:5} }).success,false);
});
test('un ciclo en segundo plano solo cuenta trabajo y espera antes de repetir', () => {
  const session = { id:'s',missionId:'t',title:'Informe',elapsedMs:0,startedAt:0,mode:'interval',workMinutes:25,breakMinutes:5,phase:'work',phaseElapsedMs:0 };
  const rest = advanceSession(session,27*60000);
  assert.equal(rest.elapsedMs,25*60000); assert.equal(rest.phase,'break'); assert.equal(phaseRemaining(rest),3*60000);
  const ready = advanceSession(rest,90*60000);
  assert.equal(ready.phase,'ready'); assert.equal(ready.elapsedMs,25*60000); assert.equal(ready.startedAt,null);
  assert.equal(advanceSession(ready,180*60000).elapsedMs,25*60000);
  const resumed = resumeSession(ready,180*60000);
  assert.equal(advanceSession(resumed,181*60000).elapsedMs,26*60000);
});
test('pausar y recargar durante descanso no añade tiempo de estudio', () => {
  const initial = { id:'s',missionId:'t',title:'T',elapsedMs:1500000,startedAt:0,mode:'interval',workMinutes:25,breakMinutes:5,phase:'break',phaseElapsedMs:0 };
  const paused = pauseSession(initial,60000);
  const restored = JSON.parse(JSON.stringify(paused));
  assert.equal(advanceSession(restored,300000).elapsedMs,1500000);
  assert.equal(advanceSession(resumeSession(restored,300000),360000).phaseElapsedMs,120000);
  assert.equal(advanceSession({ ...initial, mode:'free', elapsedMs:0 },90*60000).elapsedMs,90*60000);
});
test('subtareas y bloques conservan validación, avisos y esfuerzo por proyecto', () => {
  const t = { ...task,project:'Proyecto',studiedMinutes:30,subtasks:[{id:'s',title:'Leer',completed:true}],studyBlocks:[{id:'b',date:task.date,startTime:'17:30',endTime:'18:30'}] };
  assert.equal(missionSchema.safeParse(t).success,true);
  assert.equal(missionSchema.safeParse({...t,studyBlocks:[{...t.studyBlocks[0],date:'2026-02-31'}]}).success,false);
  assert.equal(planningWarnings(t,[],[]).length,1);
  assert.equal(projectSummaries([t])[0].remainingMinutes,90);
});
