import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // Margen para máquinas cargadas: un fallo observado fue de infraestructura
  // en browserContext.newPage, no del producto.
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'off',
    headless: true
  },
  webServer: {
    command: 'python scripts/serve.py 4174',
    url: 'http://127.0.0.1:4174/index.html',
    reuseExistingServer: true,
    timeout: 15000
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
