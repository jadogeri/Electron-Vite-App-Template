import { defineConfig } from '@playwright/test'
export default defineConfig({
  timeout: 180000,
  expect: { timeout: 30000 },
  testDir: './tests/ui',
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: { trace: process.env.PLAYWRIGHT_LOW_MEMORY ? 'off' : 'retain-on-failure', screenshot: 'only-on-failure', baseURL: 'http://127.0.0.1:4173', viewport: {width:1000,height:800},
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH,
      args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
        ...(process.env.PLAYWRIGHT_LOW_MEMORY ? ['--renderer-process-limit=1'] : [])] } : {} },
  webServer: {
    command: 'npm run build && vite preview --host 127.0.0.1 --port 4173 --strictPort --config vite.preview.config.ts',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false
  }
})
