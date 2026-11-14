import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: ['**/chofer-movil-y-rastreo.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile-chofer',
      testMatch: '**/chofer-movil-y-rastreo.spec.ts',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host localhost --port 5173',
    cwd: '../../Frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});

