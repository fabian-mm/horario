const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(userId = 'student-a') {
  let saved = null; const writes = []; const filters = [];
  const collection = { findOne: async filter => { filters.push(filter); return saved; }, countDocuments: async filter => { filters.push(filter); return filter.id.$in.every(id => id === 'owned') ? filter.id.$in.length : 0; }, updateOne: async (filter, update) => { writes.push({filter,update}); saved = {...saved,...update.$set}; } };
  const source = readFileSync(resolve(__dirname,'../app/api/planning/route.ts'),'utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const scoped = name => name === '@/lib/auth' ? {getSessionUserId:async()=>userId} : name === '@/lib/mongodb' ? {getDb:async()=>({collection:()=>collection})} : name === '@/lib/planning' ? require('../.checks/planning.js') : require(name);
  vm.runInNewContext('(function(require,exports){'+code+'\n})',{})(scoped,exports);
  return { writes,filters,get:exports.GET,patch:body=>exports.PATCH(new Request('http://localhost/api/planning',{method:'PATCH',body:JSON.stringify(body)})) };
}
test('planificación requiere sesión y nunca acepta un propietario del cliente',async()=>{
  const f=fixture(null); assert.equal((await f.get()).status,401); assert.equal((await f.patch({})).status,401); assert.equal(f.writes.length,0);
  assert.equal((await fixture().patch({userId:'other'})).status,400);
});
test('las prioridades se validan contra las tareas de la cuenta autenticada',async()=>{
  const f=fixture(); assert.equal((await f.patch({dailyFocus:{date:'2026-09-08',missionIds:['foreign']}})).status,400);
  assert.equal(f.filters[0].userId,'student-a'); assert.equal(f.writes.length,0);
});
test('configuración aislada por usuario y parches independientes',async()=>{
  const f=fixture(); assert.equal((await f.patch({dailyFocus:{date:'2026-09-08',missionIds:['owned']}})).status,200);
  await f.patch({concentration:{mode:'interval',workMinutes:50,breakMinutes:10}});
  assert.equal(f.writes[0].filter._id,'student-a'); assert.equal(f.writes[1].update.$set.dailyFocus,undefined);
  const body=await (await f.get()).json(); assert.deepEqual(body.dailyFocus.missionIds,['owned']); assert.equal(body.concentration.workMinutes,50); assert.equal(body.availability.startTime,'08:00');
});
