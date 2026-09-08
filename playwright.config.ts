import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://localhost:3100', channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Bogota', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --port 3100', url: 'http://localhost:3100', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
