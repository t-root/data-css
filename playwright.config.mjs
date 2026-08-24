import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4178' },
  webServer: {
    command: 'python3 -m http.server 4178 --bind 127.0.0.1',
    port: 4178,
    reuseExistingServer: !process.env.CI,
  },
});
