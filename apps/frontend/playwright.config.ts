import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const AUTH_STATE = path.resolve(__dirname, 'e2e/.auth/admin.json');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',

  projects: [
    // ログインフローを通す専用プロジェクト（storageState なし）
    {
      name: 'login',
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
      testMatch: '**/login.spec.ts',
    },
    // 認証済み状態で動くプロジェクト
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
        storageState: AUTH_STATE,
      },
      testIgnore: '**/login.spec.ts',
    },
  ],
});
