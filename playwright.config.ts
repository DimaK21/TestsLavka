import { defineConfig, devices } from '@playwright/test';

const publicUrl = process.env.QA_SHOP_PUBLIC_URL;
const port = process.env.QA_SHOP_TEST_PORT || '3100';
const localUrl = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: publicUrl ? '**/smoke.spec.ts' : '**/*.spec.ts',
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: publicUrl || localUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: publicUrl ? undefined : {
    command: 'node tests/support/serve-shop.cjs',
    url: `${localUrl}/api/health`,
    env: { PORT: port },
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
