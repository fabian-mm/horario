import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.clock.install({ time: new Date('2026-09-08T14:00:00Z') });
  const tasks = [
    { id: 'report', title: 'Terminar informe de laboratorio', subject: 'Física', subjectId: 'physics', project: 'Laboratorio de movimiento', date: '2026-09-08', time: '18:00', priority: 'normal', status: 'pending', completed: false, estimatedMinutes: 90 },
    { id: 'exam', title: 'Preparar parcial de cálculo', subject: 'Cálculo', subjectId: 'math', project: 'Primer parcial', date: '2026-09-10', time: '10:00', priority: 'important', status: 'pending', completed: false, estimatedMinutes: 120 },
  ];
  const schedules = [{ id: 'semester', title: 'Semestre 2026-2', active: true, startDate: '2026-08-01', dailyMissions: [{ id: 'class-a', title: 'Laboratorio de física', subject: 'Física', subjectId: 'physics', dayOfWeek: 2, startTime: '10:00', endTime: '12:00', location: 'Aula 204' }] }];
  const studies: { id: string; minutes: number }[] = [];
  let failStudy = true;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') return route.fulfill({ json: { user: { id: 'test-student', name: 'Valentina', email: 'test@example.invalid', subtitle: 'Estudiante' } } });
    if (path === '/api/subjects') return route.fulfill({ json: [{ id: 'physics', name: 'Física' }, { id: 'math', name: 'Cálculo' }] });
    if (path === '/api/missions/report/study') {
      studies.push(route.request().postDataJSON());
      return route.fulfill(failStudy ? { status: 503, json: { error: 'Fallo de conexión simulado' } } : { json: { studiedMinutes: 90 } });
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
  await expect(page.getByRole('heading', { name: 'Tu día, con claridad.' })).toBeVisible();
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
