const { test } = require('node:test');
const assert = require('node:assert/strict');
const { academicWeek, pendingTasks, freeStudySlots } = require('../.checks/academic.js');
const { calculatePlayerProgress } = require('../.checks/missions.js');
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

test('la experiencia usa solo misiones completadas y sube de nivel a los 250 XP', () => {
  const task = { id: 'rpg', title: 'Misión', subject: 'Física', date: '2026-09-08', time: '10:00', priority: 'boss', completed: true, status: 'completed' };
  const tasks = [task, { ...task, id: 'b' }, { ...task, id: 'c', priority: 'important' }, { ...task, id: 'd', status: 'pending', completed: false, studiedMinutes: 90 }];
  const player = calculatePlayerProgress(tasks);
  assert.equal(player.totalXp, 250);
  assert.equal(player.level, 2);
  assert.equal(player.xpInLevel, 0);
  assert.equal(player.completed, 3);
  assert.equal(calculatePlayerProgress(tasks.map(t => ({ ...t, status: 'pending', completed: false }))).totalXp, 0);
});
