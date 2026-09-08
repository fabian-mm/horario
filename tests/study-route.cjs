const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real route, replacing only authentication and database boundaries.
function fixture(userId = 'student-a', exists = true) {
  const task = { id: 'task-a', userId: 'student-a', status: 'pending', studiedMinutes: 0, studySessions: [] };
  const writes = [];
  let dbCalls = 0;
  const collection = {
    async updateOne(filter, change) {
      writes.push({ filter, change });
      if (!exists || filter.userId !== task.userId || filter.id !== task.id || task.studySessions.some(session => session.id === filter['studySessions.id'].$ne)) return;
      task.studySessions.push(change.$push.studySessions);
      task.studiedMinutes += change.$inc.studiedMinutes;
    },
    async findOne(filter) { return exists && filter.userId === task.userId && filter.id === task.id ? task : null; },
  };
  const source = readFileSync(resolve(__dirname, '../app/api/missions/[missionId]/study/route.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const scopedRequire = name => name === '@/lib/auth' ? { getSessionUserId: async () => userId }
    : name === '@/lib/mongodb' ? { getDb: async () => { dbCalls++; return { collection: () => collection }; } } : require(name);
  vm.runInNewContext(`(function(require, exports) { ${compiled}\n })`, { Date })(scopedRequire, exports);
  const save = (body = { id: 'session-90', minutes: 90, finishedAt: '2026-09-08T18:00:00.000Z' }) => exports.POST(new Request('http://localhost/api/missions/task-a/study', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ missionId: 'task-a' }) });
  return { task, writes, save, dbCalls: () => dbCalls };
}

test('90 minutos se guardan sin completar la tarea y el reintento no los duplica', async () => {
  const f = fixture();
  assert.equal((await f.save()).status, 200);
  assert.equal((await f.save()).status, 200);
  assert.equal(f.task.studiedMinutes, 90);
  assert.equal(f.task.studySessions.length, 1);
  assert.equal(f.task.status, 'pending');
  assert.equal(f.writes[0].filter.userId, 'student-a');
  assert.equal(f.writes[0].filter['studySessions.id'].$ne, 'session-90');
  assert.equal(f.writes[0].change.$set.status, undefined);
});
test('rechaza sesiones sin autenticar antes de consultar la base', async () => {
  const f = fixture(null);
  assert.equal((await f.save()).status, 401);
  assert.equal(f.dbCalls(), 0);
});
test('no permite guardar tiempo en una tarea ajena o inexistente', async () => {
  for (const f of [fixture('student-b'), fixture('student-a', false)]) {
    assert.equal((await f.save()).status, 404);
    assert.equal(f.task.studiedMinutes, 0);
  }
});
test('rechaza tiempos negativos y fechas inválidas sin escribir', async () => {
  const f = fixture();
  assert.equal((await f.save({ id: 'bad', minutes: -90, finishedAt: 'invalid' })).status, 400);
  assert.equal(f.writes.length, 0);
});
