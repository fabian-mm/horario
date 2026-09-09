import { test, expect, type Page } from '@playwright/test';
import { defaultPlanning } from '../../lib/planning';

async function setup(page: Page) {
  await page.clock.install({ time: new Date('2026-09-08T14:00:00Z') });
  const tasks = [
    { id: 'report', title: 'Terminar informe de laboratorio', subject: 'Física', subjectId: 'physics', project: 'Laboratorio de movimiento', date: '2026-09-08', time: '18:00', priority: 'normal', status: 'pending', completed: false, estimatedMinutes: 90 },
    { id: 'exam', title: 'Preparar parcial de cálculo', subject: 'Cálculo', subjectId: 'math', project: 'Primer parcial', date: '2026-09-10', time: '10:00', priority: 'important', status: 'pending', completed: false, estimatedMinutes: 120 },
  ];
  const schedules = [{ id: 'semester', title: 'Semestre 2026-2', active: true, startDate: '2026-08-01', dailyMissions: [{ id: 'class-a', title: 'Laboratorio de física', subject: 'Física', subjectId: 'physics', dayOfWeek: 2, startTime: '10:00', endTime: '12:00', location: 'Aula 204' }] }];
  const studies: { id: string; minutes: number }[] = [];
  let failStudy = true;
  let planning = structuredClone(defaultPlanning);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/planning') {
      if (route.request().method() === 'PATCH') planning = { ...planning, ...route.request().postDataJSON() };
      return route.fulfill({ json: planning });
    }
    if (path === '/api/auth/session') return route.fulfill({ json: { user: { id: 'test-student', name: 'Valentina', email: 'test@example.invalid', subtitle: 'Estudiante' } } });
    if (path === '/api/subjects') return route.fulfill({ json: [{ id: 'physics', name: 'Física' }, { id: 'math', name: 'Cálculo' }] });
    if (path === '/api/missions/report/study') {
      studies.push(route.request().postDataJSON());
      return route.fulfill(failStudy ? { status: 503, json: { error: 'Fallo de conexión simulado' } } : { json: { studiedMinutes: route.request().postDataJSON().minutes } });
    }
    if (path === '/api/missions') {
      if (route.request().method() === 'POST') { const task = route.request().postDataJSON(); const index = tasks.findIndex(t => t.id === task.id); if (index < 0) tasks.push(task); else tasks[index] = task; return route.fulfill({ json: task }); }
      return route.fulfill({ json: tasks });
    }
    if (path === '/api/weekly-quests') {
      if (route.request().method() === 'POST') { const schedule = route.request().postDataJSON(); schedules[0] = schedule; return route.fulfill({ json: schedule }); }
      return route.fulfill({ json: schedules });
    }
    return route.fulfill({ status: 404, json: { error: 'Unexpected test endpoint' } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tu aventura de hoy.' })).toBeVisible();
  return { tasks, schedules, studies, allowStudy: () => { failStudy = false; } };
}

test('agenda, semana y proyectos sin duplicar la navegación', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('button', { name: 'Estudiar Terminar informe de laboratorio' })).toBeAttached();
  await page.screenshot({ path: 'test-results/hoy-desktop.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Semana' }).click();
  await expect(page.locator('.academic-week > section')).toHaveCount(7);
  await expect(page.locator('.academic-week-class')).toHaveCount(1);
  await expect(page.locator('.academic-week-task')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/semana-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Semana siguiente', exact: true }).click();
  await expect(page.locator('.academic-week-task')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Proyectos' }).click();
  await page.getByRole('combobox', { name: 'Filtrar por proyecto', exact: true }).selectOption('Laboratorio de movimiento');
  await expect(page.locator('.academic-task')).toHaveCount(1);
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Proyecto', { exact: false })).toHaveValue('Laboratorio de movimiento');
});

test('90 minutos se conservan tras fallo y recarga, con el mismo identificador al reintentar', async ({ page }) => {
  const f = await setup(page);
  await page.locator('.academic-task').first().hover();
  await page.getByRole('button', { name: 'Estudiar Terminar informe de laboratorio' }).click();
  await page.clock.fastForward(90 * 60000);
  await expect(page.locator('.academic-focus time')).toHaveText('01:30:00');
  await page.getByRole('button', { name: 'Guardar sesión', exact: true }).click();
  await expect(page.locator('.academic-toast')).toContainText('Tu tiempo está conservado');
  expect(f.studies[0].minutes).toBe(90);
  await page.reload();
  await expect(page.locator('.academic-focus time')).toHaveText('01:30:00');
  f.allowStudy();
  await page.getByRole('button', { name: 'Guardar sesión', exact: true }).click();
  await expect(page.locator('.academic-focus')).toHaveCount(0);
  expect(f.studies[1]).toEqual(f.studies[0]);
  expect(f.tasks[0].status).toBe('pending');
  await expect(page.locator('.academic-task').first()).toContainText('1 h 30 min estudiados');
});

test('reorganizar clases arrastrando y copiar sin perder la original', async ({ page }) => {
  const f = await setup(page);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Semana' }).click();
  await page.getByRole('button', { name: 'Organizar horario' }).click();
  await page.locator('.daily-class-card').dragTo(page.locator('.schedule-day').nth(2));
  await expect.poll(() => f.schedules[0].dailyMissions[0].dayOfWeek).toBe(3);
  await page.locator('.daily-class-card').click();
  await page.getByRole('button', { name: 'Copiar a otro día u horario' }).click();
  await page.locator('.schedule-day').nth(4).getByRole('button', { name: 'Pegar clase' }).click();
  await expect(page.locator('.daily-class-card')).toHaveCount(2);
  expect(f.schedules[0].dailyMissions.map(item => item.dayOfWeek).sort()).toEqual([3, 5]);
});

test('móvil: acciones accesibles y página sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Estudiar Terminar informe de laboratorio' }).click();
  await expect(page.getByRole('button', { name: 'Guardar sesión', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/hoy-mobile.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('button', { name: 'Semana' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('RPG: completar y reabrir recalcula la experiencia sin duplicarla', async ({ page }) => {
  await setup(page);
  const xp = page.getByRole('progressbar', { name: 'Experiencia del nivel' });
  await expect(xp).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: 'Completar Terminar informe de laboratorio', exact: true }).click();
  await expect(xp).toHaveAttribute('value', '25');
  await expect(page.locator('.game-feedback')).toContainText('MISIÓN CUMPLIDA');
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Proyectos' }).click();
  await page.getByRole('button', { name: 'Todas', exact: true }).click();
  await page.getByRole('button', { name: 'Reabrir Terminar informe de laboratorio', exact: true }).click();
  await expect(page.locator('.game-feedback')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(xp).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: 'Completar Terminar informe de laboratorio', exact: true }).click();
  await expect(xp).toHaveAttribute('value', '25');
  await page.getByRole('textbox', { name: 'Buscar tareas' }).fill('sin coincidencias');
  await expect(xp).toHaveAttribute('value', '25');
});

test('prioridades persisten sin duplicar tareas ni cambiar la entrega y caducan al día siguiente', async ({ page }) => {
  const f = await setup(page);
  await page.getByRole('button', { name: 'Elegir misiones · 0/3' }).click();
  await page.getByRole('checkbox', { name: /Preparar parcial/ }).check();
  await page.getByRole('button', { name: 'Guardar prioridades' }).click();
  await expect(page.getByRole('region', { name: 'Misiones principales de hoy' })).toContainText('Preparar parcial');
  await expect(page.getByRole('button', { name: 'Estudiar Preparar parcial de cálculo' })).toHaveCount(1);
  expect(f.tasks[1].date).toBe('2026-09-10');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Elegir misiones · 1/3' })).toBeVisible();
  await page.clock.fastForward(24 * 60 * 60000);
  await expect(page.getByRole('button', { name: 'Elegir misiones · 0/3' })).toBeVisible();
});

test('disponibilidad descuenta clases y compromisos y avisa de sobrecarga', async ({ page }) => {
  await setup(page);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Semana' }).click();
  await page.getByRole('button', { name: 'Mi disponibilidad', exact: true }).click();
  const days = page.getByRole('group', { name: 'Días disponibles para estudiar' });
  for (const day of ['Lun', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) await days.getByRole('button', { name: day, exact: true }).click();
  await page.getByLabel('Disponible desde').fill('09:00');
  await page.getByLabel('Disponible hasta').fill('14:00');
  await page.getByRole('button', { name: 'Añadir compromiso' }).click();
  await page.getByLabel('Compromiso 1', { exact: true }).fill('Almuerzo');
  await page.getByRole('button', { name: 'Guardar disponibilidad' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.load-metrics')).toContainText('2 h disponibles');
  await expect(page.locator('.load-warning')).toContainText('1 h 30 min');
  await page.screenshot({ path: 'test-results/disponibilidad-desktop.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Configurar disponibilidad' }).click();
  await expect(page.getByLabel('Compromiso 1', { exact: true })).toHaveValue('Almuerzo');
});

test('concentración 25/5 no suma descansos ni inicia otro ciclo sin permiso', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await setup(page);
  await page.getByText('Modo de concentración', { exact: true }).click();
  await page.getByRole('combobox', { name: /Modo de estudio/ }).selectOption('25');
  await page.getByRole('button', { name: 'Guardar modo' }).click();
  await expect(page.getByText('Modo guardado para tu próxima sesión.')).toBeVisible();
  await page.getByRole('button', { name: 'Estudiar Terminar informe de laboratorio' }).click();
  await page.clock.fastForward(25 * 60000);
  await expect(page.locator('.focus-total')).toContainText('00:25:00');
  await expect(page.locator('.academic-focus')).toContainText('CAMPAMENTO · DESCANSO');
  await expect(page.locator('.academic-focus time')).toHaveText(/^00:0[45]:\d{2}$/);
  await page.screenshot({ path: 'test-results/concentracion-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.clock.fastForward(65 * 60000);
  await expect(page.getByRole('button', { name: 'Siguiente bloque de estudio' })).toBeVisible();
  await expect(page.locator('.focus-total')).toContainText('00:25:00');
  f.allowStudy();
  await page.getByRole('button', { name: 'Guardar sesión', exact: true }).click();
  await expect(page.locator('.academic-focus')).toHaveCount(0);
  expect(f.studies[0].minutes).toBe(25);
  expect(f.tasks[0].status).toBe('pending');
});

test('RPG: respeta movimiento reducido y cambio de tema', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.getByRole('button', { name: 'Completar Terminar informe de laboratorio', exact: true }).click();
  expect(await page.locator('.game-feedback').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Cerrar recompensa' }).click();
  await page.locator('.academic-account').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: /Arcano Violeta/ }).click();
  await expect(page.locator('.rpg-app')).toHaveAttribute('data-theme', 'arcane');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.screenshot({ path: 'test-results/rpg-arcane.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.rpg-app')).toHaveAttribute('data-theme', 'arcane');
});
