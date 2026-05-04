import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { FixtureState } from './global-setup';

const FIXTURE_STATE = path.resolve(__dirname, '.fixture-state.json');

test.describe('ログイン', () => {
  test('正しい認証情報でログインできる', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    await page.goto('/login');
    await page.fill('#tenantId', String(fixture.tenantId));
    await page.fill('#loginIdentifier', fixture.loginIdentifier);
    await page.fill('#password', fixture.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('誤ったパスワードでログインに失敗する', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    await page.goto('/login');
    await page.fill('#tenantId', String(fixture.tenantId));
    await page.fill('#loginIdentifier', fixture.loginIdentifier);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 5_000 });
  });
});
