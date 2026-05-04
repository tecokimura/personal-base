import { test, expect } from '@playwright/test';

test.describe('組織一覧', () => {
  test('組織一覧ページを表示できる', async ({ page }) => {
    await page.goto('/organizations');

    await expect(page.locator('h1.page-title')).toHaveText('組織一覧');
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
  });

  test('E2Eテスト用組織が一覧に表示される', async ({ page }) => {
    await page.goto('/organizations');

    // テーブルが描画されるまで待つ
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });

    // フィクスチャで upsert した組織コード E2EORG が存在する
    await expect(page.locator('table')).toContainText('E2EORG');
  });
});
