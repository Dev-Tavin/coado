import { defineConfig } from '@playwright/test';

const PORTA = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  // Um servidor só, com banco em memória: os testes rodam em sequência e cada um cria seus próprios clientes.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // RNF-005: todos os testes rodam nas duas larguras.
  projects: [
    { name: 'celular-360', use: { browserName: 'chromium', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
    { name: 'desktop-1440', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && node src/server.js',
    url: `http://localhost:${PORTA}/api/saude`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORTA), COADO_DADOS: ':memoria:', JWT_SECRET: 'segredo-e2e' },
  },
});
