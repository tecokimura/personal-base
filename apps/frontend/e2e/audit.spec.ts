import { test, expect } from '@playwright/test';
import path from 'path';

const MEMBER_AUTH_STATE = path.resolve(__dirname, '.auth/member.json');

test.describe('監査ログ一覧画面', () => {
  test('HR_ADMIN が /audit を開ける', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('h1.page-title')).toHaveText('監査ログ', { timeout: 8_000 });
  });

  test('監査ログ一覧テーブルが表示される', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('h1.page-title')).toHaveText('監査ログ', { timeout: 8_000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
  });

  test('監査イベントが 1 件以上表示される', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('h1.page-title')).toHaveText('監査ログ', { timeout: 8_000 });
    // global-setup のブラウザログインにより LoginHistory が最低 1 件存在する
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 });
  });

  test('サイドバーに「監査ログ」リンクが表示される', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('nav a:has-text("監査ログ")')).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('非 HR_ADMIN の権限制御', () => {
  test.use({ storageState: MEMBER_AUTH_STATE });

  test('サイドバーに「監査ログ」リンクが表示されない', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('nav')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('nav a:has-text("監査ログ")')).not.toBeVisible();
  });

  test('/audit を開くと利用不可メッセージが表示される', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('.error-msg')).toHaveText('この画面は HR_ADMIN のみ利用できます', { timeout: 8_000 });
    await expect(page.locator('table')).not.toBeVisible();
  });
});

test.describe('監査ログ API アクセス制御', () => {
  test('認証なしで GET /api/admin/audit/events を呼ぶと 401 が返る', async ({ playwright }) => {
    // 明示的に未認証の APIRequestContext を作成（storageState を持たない）
    const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
    const apiContext = await playwright.request.newContext({ baseURL: BASE_URL });
    const res = await apiContext.get('/api/admin/audit/events');
    expect(res.status()).toBe(401);
    await apiContext.dispose();
  });
});
