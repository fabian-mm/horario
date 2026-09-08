const { test } = require('node:test');
const assert = require('node:assert/strict');
const { academicWeek, pendingTasks, freeStudySlots } = require('../.checks/academic.js');
test('la semana cruza meses y años desde lunes hasta domingo', () => {
  const dates = academicWeek(new Date(2027, 0, 1, 12));
  assert.equal(dates[0].getDate(), 28);
  assert.equal(dates[0].getMonth(), 11);
  assert.equal(dates[6].getDate(), 3);
  assert.equal(dates[6].getDay(), 0);
});
test('las entregas enviadas no aparecen como pendientes y las atrasadas se separan', () => {
  const task = { id: 'a', title: 'Informe', subject: 'Física', date: '2026-09-08', time: '10:00', priority: 'normal', completed: false };
  const result = pendingTasks([task, { ...task, id: 'b', date: '2026-09-07' }, { ...task, id: 'c', status: 'submitted' }, { ...task, id: 'd', date: '2026-09-09' }], new Date(2026, 8, 8, 12));
  assert.deepEqual(result.today.map(t => t.id), ['a']);
  assert.deepEqual(result.overdue.map(t => t.id), ['b']);
  assert.deepEqual(result.upcoming.map(t => t.id), ['d']);
});
test('las clases solapadas no crean huecos falsos', () => {
  assert.deepEqual(freeStudySlots([{ startTime: '07:00', endTime: '10:00' }, { startTime: '09:00', endTime: '12:00' }, { startTime: '13:00', endTime: '21:00' }]), [{ start: 720, end: 780 }]);
  assert.deepEqual(freeStudySlots([{ startTime: '08:00', endTime: '20:00' }]), []);
});
