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

test.describe('HR_ADMIN による他社員への職歴補助新規作成', () => {
  let tempEmployeeId: number | null = null;

  test.afterEach(async ({ page }) => {
    if (tempEmployeeId != null) {
      await page.request.patch(`/api/admin/employees/${tempEmployeeId}/soft-delete`);
      tempEmployeeId = null;
    }
  });

  test('他社員の詳細画面から職歴を新規追加できる', async ({ page }) => {
    // 一時社員を API で作成（HR_ADMIN は他社員への職歴補助作成が可能）
    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 補助作成テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    // 他社員詳細へ遷移
    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 補助作成テスト用社員', { timeout: 8_000 });

    // 「新規追加」ボタンが職歴セクションに表示される（自分ではないので canAssistEdit = true）
    const addButton = page.locator('button:has-text("新規追加")');
    await expect(addButton).toBeVisible();

    // フォームを開く
    await addButton.click();
    await expect(page.locator('text=職歴を新規追加')).toBeVisible();

    // 開始年月・業務内容を入力
    await page.locator('label:has-text("開始年月") input').fill('2023-04');
    await page.locator('label:has-text("業務内容") textarea').fill('E2E補助作成テスト業務内容');

    // 「追加」ボタンを押下
    await page.click('button[type="submit"]:has-text("追加")');

    // 職歴カードが表示される
    await expect(page.locator('text=E2E補助作成テスト業務内容')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=2023-04')).toBeVisible();

    // フォームが閉じて「新規追加」ボタンが再表示される
    await expect(addButton).toBeVisible();
  });
});
