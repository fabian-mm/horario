const { test } = require('node:test');
const assert = require('node:assert/strict');
const { semesterWeeks, prepareExam, weeklyReview, rescheduleError } = require('../.checks/semester.js');
const { remainingEstimate } = require('../.checks/missions.js');
const { missionSchema } = require('../.checks/validation.js');
const availability = {days:[1,2,3,4,5,6,7],startTime:'08:00',endTime:'18:00',commitments:[]};
const exam = {id:'exam',title:'Parcial',kind:'exam',subject:'Cálculo',date:'2026-09-12',time:'10:00',status:'pending',completed:false,priority:'normal',estimatedMinutes:120,studiedMinutes:120};
const now = new Date(2026,8,8,9);

test('semestre agrupa hitos al cruzar año y detecta concentración sin inventar esfuerzo',()=>{
  const tasks=[{...exam,date:'2027-01-01'},{...exam,id:'b',kind:'major',date:'2026-12-31'},{...exam,id:'c',kind:'task',priority:'boss',date:'2027-01-02'},{...exam,id:'d',kind:'task',date:'2027-01-01'}];
  const weeks=semesterWeeks('2026-12-28','2027-01-03',tasks);
  assert.equal(weeks.length,1); assert.equal(weeks[0].tasks.length,3); assert.equal(weeks[0].crowded,true);
  assert.deepEqual(semesterWeeks('2027-01-02','2026-12-01',tasks),[]);
});
test('preparación distribuye temas antes del examen sin solapar ni repetir reservas',()=>{
  const a={...availability,commitments:[{id:'l',title:'Ocupado',days:[2],startTime:'09:00',endTime:'12:00'}]};
  const result=prepareExam(exam,['Límites','Derivadas','Práctica'],60,'2026-09-08',a,[],[],now);
  assert.equal(result.length,3); assert.equal(result[0].startTime,'12:00');
  assert.equal(new Set(result.map(b=>b.date)).size,3); assert.ok(result.every(b=>b.date<exam.date));
  const reserved={...exam,studyBlocks:result.map((b,i)=>({...b,id:String(i)}))};
  assert.deepEqual(prepareExam(reserved,['Límites','Derivadas','Práctica'],60,'2026-09-08',a,[],[],now),[]);
  assert.deepEqual(prepareExam(exam,['Tema'],60,'2026-09-12',a,[],[],now),[]);
  assert.deepEqual(prepareExam(exam,['Tema'],60,'2026-09-08',{...a,days:[]},[],[],now),[]);
});
test('revisión usa fechas locales y conserva bloques sin confirmar aunque haya estudio',()=>{
  const t={...exam,studySessions:[{id:'old',minutes:90,finishedAt:new Date(2026,8,6,12).toISOString()},{id:'new',minutes:30,finishedAt:new Date(2026,8,7,12).toISOString()}],studyBlocks:[{id:'b',date:'2026-09-07',startTime:'10:00',endTime:'11:00'}]};
  const review=weeklyReview([t],now,now);
  assert.equal(review.studied,30); assert.equal(review.accumulated,120); assert.equal(review.pastBlocks.length,1); assert.equal(review.pending.length,1);
  assert.equal(remainingEstimate(t),120); assert.equal(remainingEstimate({...t,remainingMinutes:45}),45); assert.equal(remainingEstimate({...t,remainingMinutes:0}),0);
  assert.equal(t.status,'pending'); assert.equal(t.studyBlocks[0].status,undefined);
});
test('reprogramación rechaza pasado, solapamientos y fin posterior a la entrega',()=>{
  const b={id:'b',date:'2026-09-08',startTime:'13:00',endTime:'14:00'};
  assert.equal(rescheduleError(exam,b,[],[],availability,now),null);
  assert.match(rescheduleError(exam,{...b,startTime:'08:00',endTime:'09:00'},[],[],availability,now),/futuro/);
  assert.match(rescheduleError(exam,{...b,date:exam.date,startTime:'11:00'},[],[],availability,now),/entrega/);
  assert.match(rescheduleError(exam,b,[{...exam,id:'other',studyBlocks:[b]}],[],availability,now),/libre/);
});
test('metadatos nuevos se validan y el historial sigue siendo propiedad del servidor',()=>{
  const parsed=missionSchema.parse({...exam,remainingMinutes:60,examTopics:['Límites'],studySessions:[{id:'forged',minutes:999}],studyBlocks:[{id:'b',date:'2026-09-09',startTime:'10:00',endTime:'11:00',topic:'Límites',status:'done'}]});
  assert.equal(parsed.studySessions,undefined); assert.equal(parsed.studiedMinutes,undefined); assert.equal(parsed.studyBlocks[0].status,'done');
  assert.equal(missionSchema.safeParse({...exam,remainingMinutes:-1}).success,false);
});
