import { test, expect } from '@playwright/test';

test.describe('職歴管理', () => {
  test('職歴ページを表示できる', async ({ page }) => {
    await page.goto('/work-histories');

    await expect(page.locator('h1.page-title')).toHaveText('職歴管理', { timeout: 8_000 });
  });

  test('職歴を追加・編集・削除できる', async ({ page }) => {
    await page.goto('/work-histories');
    await expect(page.locator('h1.page-title')).toHaveText('職歴管理', { timeout: 8_000 });

    // ─── 追加 ─────────────────────────────────
    await page.click('button:has-text("職歴を追加")');
    await expect(page.locator('text=新規職歴')).toBeVisible();

    // 開始年月（pattern 属性で YYYY-MM 形式を強制）
    await page.locator('label:has-text("開始年月") input').fill('2020-04');
    // 終了年月
    await page.locator('label:has-text("終了年月") input').fill('2023-03');
    // 業務内容（必須）
    await page.locator('textarea').fill('E2Eテスト用の業務内容サンプル');
    // 役割
    await page.locator('label:has-text("役割・職名") input').fill('テストエンジニア');
    // 使用技術
    await page.locator('label:has-text("使用技術・ツール") input').fill('Playwright, TypeScript');

    await page.click('button[type="submit"]:has-text("追加")');

    // 追加後にカードが表示される
    await expect(page.locator('.card', { hasText: 'E2Eテスト用の業務内容サンプル' })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('.card', { hasText: '2020-04' })).toBeVisible();

    // ─── 編集 ─────────────────────────────────
    await page.locator('.card', { hasText: 'E2Eテスト用の業務内容サンプル' })
      .locator('button:has-text("編集")')
      .click();

    // 編集フォームが表示される
    await expect(page.locator('text=職歴を編集')).toBeVisible();

    // 業務内容を変更
    await page.locator('textarea').fill('E2Eテスト用の業務内容（更新後）');
    await page.click('button[type="submit"]:has-text("保存")');

    await expect(page.locator('.card', { hasText: 'E2Eテスト用の業務内容（更新後）' })).toBeVisible({ timeout: 8_000 });

    // ─── 削除 ─────────────────────────────────
    // window.confirm を自動承認
    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('.card', { hasText: 'E2Eテスト用の業務内容（更新後）' })
      .locator('button:has-text("削除")')
      .click();

    await expect(page.locator('.card', { hasText: 'E2Eテスト用の業務内容（更新後）' })).not.toBeVisible({ timeout: 8_000 });
  });

  test('isCurrent チェックで終了年月が無効になる', async ({ page }) => {
    await page.goto('/work-histories');
    await page.click('button:has-text("職歴を追加")');

    const toInput = page.locator('label:has-text("終了年月") input');
    await expect(toInput).toBeEnabled();

    // 「現在も継続中」チェック
    await page.locator('input[type="checkbox"]').check();
    await expect(toInput).toBeDisabled();
  });
});
