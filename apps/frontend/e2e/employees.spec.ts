import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { FixtureState } from './global-setup';

const FIXTURE_STATE = path.resolve(__dirname, '.fixture-state.json');

test.describe('社員一覧・社員詳細', () => {
  test('社員一覧ページを表示できる', async ({ page }) => {
    await page.goto('/employees');

    await expect(page.locator('h1.page-title')).toHaveText('社員一覧');
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
  });

  test('E2E Admin が社員一覧に表示される', async ({ page }) => {
    await page.goto('/employees');

    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('table')).toContainText('E2E Admin');
  });

  test('社員詳細ページに遷移できる', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    await page.goto(`/employees/${fixture.employeeId}`);

    // 氏名が表示される
    await expect(page.locator('h1.page-title')).toHaveText('E2E Admin', { timeout: 8_000 });

    // 基本情報カードが表示される
    await expect(page.locator('.card').first()).toBeVisible();
  });
});
