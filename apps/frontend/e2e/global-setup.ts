/**
 * Playwright グローバルセットアップ。
 * 1. バックエンドの setup-e2e-fixtures コマンドでテナント・ユーザー・組織を upsert する
 * 2. ブラウザで UI ログインし、認証済みストレージ状態を保存する
 *
 * 前提: frontend (port 3000) と backend (port 3001) が起動済みであること
 */
import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.resolve(__dirname, '.auth/admin.json');
const MEMBER_AUTH_STATE = path.resolve(__dirname, '.auth/member.json');
const FIXTURE_STATE = path.resolve(__dirname, '.fixture-state.json');
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/personal_base?schema=public';

export interface FixtureState {
  tenantId: number;
  employeeId: number;
  loginIdentifier: string;
  password: string;
  organizationId: number;
  memberEmployeeId: number;
  memberLoginIdentifier: string;
  memberPassword: string;
}

export default async function globalSetup(): Promise<void> {
  // ─── Step 1: フィクスチャセットアップ ───────────────────────────
  const repoRoot = path.resolve(__dirname, '../../../..');
  const output = execSync('pnpm --filter @personal-base/backend setup-e2e-fixtures', {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL },
  });

  // stdout の最終行が JSON
  const lines = output.trim().split('\n');
  const fixture: FixtureState = JSON.parse(lines[lines.length - 1]);

  fs.writeFileSync(FIXTURE_STATE, JSON.stringify(fixture, null, 2));

  // ─── Step 2: ブラウザ UI ログイン → storageState 保存 ──────────
  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('#tenantId', String(fixture.tenantId));
  await page.fill('#loginIdentifier', fixture.loginIdentifier);
  await page.fill('#password', fixture.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

  await context.storageState({ path: AUTH_STATE });
  await context.close();

  // ─── Step 3: member ユーザー（非 HR_ADMIN）のブラウザログイン → storageState 保存 ──
  fs.mkdirSync(path.dirname(MEMBER_AUTH_STATE), { recursive: true });

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await memberPage.goto(`${BASE_URL}/login`);
  await memberPage.fill('#tenantId', String(fixture.tenantId));
  await memberPage.fill('#loginIdentifier', fixture.memberLoginIdentifier);
  await memberPage.fill('#password', fixture.memberPassword);
  await memberPage.click('button[type="submit"]');
  await memberPage.waitForURL(/\/dashboard/, { timeout: 10_000 });

  await memberContext.storageState({ path: MEMBER_AUTH_STATE });
  await browser.close();

  console.log(`[globalSetup] fixture ready: tenantId=${fixture.tenantId}, employeeId=${fixture.employeeId}, memberEmployeeId=${fixture.memberEmployeeId}`);
}
