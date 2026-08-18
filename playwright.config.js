import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5176',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Explicitly points to local Google Chrome to bypass CDN download issues & launcher lookup failures
          executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        },
      },
    },
  ],

  // Run Vite dev server automatically before starting tests
  webServer: {
    command: 'npx vite --port 5176',
    url: 'http://localhost:5176',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
})
