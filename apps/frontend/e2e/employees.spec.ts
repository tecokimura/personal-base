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

test.describe('HR_ADMIN による社員詳細画面からの所属追加', () => {
  let tempEmployeeId: number | null = null;

  test.afterEach(async ({ page }) => {
    if (tempEmployeeId != null) {
      await page.request.patch(`/api/admin/employees/${tempEmployeeId}/soft-delete`);
      tempEmployeeId = null;
    }
  });

  test('「所属を追加」ボタンが表示される', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 所属追加テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 所属追加テスト用社員', { timeout: 8_000 });

    // fixture を参照して organizationId が存在することを確認（後続テストの前提確認）
    expect(fixture.organizationId).toBeGreaterThan(0);

    await expect(page.locator('button:has-text("所属を追加")')).toBeVisible();
  });

  test('所属を追加するとフォームが開く', async ({ page }) => {
    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 所属追加テスト用社員2' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 所属追加テスト用社員2', { timeout: 8_000 });

    await page.locator('button:has-text("所属を追加")').click();
    await expect(page.locator('text=所属を新規追加')).toBeVisible();
    await expect(page.locator('label:has-text("組織") select')).toBeVisible();
    await expect(page.locator('label:has-text("開始日")')).toBeVisible();
  });

  test('主所属が既にある社員に主所属追加するとエラーが表示される', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 主所属重複テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    // 先に主所属を API で追加
    const empRes = await page.request.post(`/api/employees/${tempEmployeeId}/employments`, {
      data: {
        organizationId: fixture.organizationId,
        employmentType: 1,
        isPrimaryAssignment: true,
        startDate: '2024-04-01',
      },
    });
    expect(empRes.ok()).toBeTruthy();

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 主所属重複テスト用社員', { timeout: 8_000 });

    // フォームを開く
    await page.locator('button:has-text("所属を追加")').click();
    await expect(page.locator('text=所属を新規追加')).toBeVisible();

    // 主所属チェックを ON にして必須項目を入力
    await page.locator('label:has-text("組織") select').selectOption(String(fixture.organizationId));
    await page.locator('label:has-text("開始日") input').fill('2024-07-01');
    await page.locator('label:has-text("主所属として設定する") input[type="checkbox"]').check();

    // 送信
    await page.locator('button[type="submit"]:has-text("追加")').click();

    // 制約違反エラーが表示される
    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 8_000 });
  });

  test('必須項目を入力して所属を追加すると一覧に反映される', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 所属追加テスト用社員3' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 所属追加テスト用社員3', { timeout: 8_000 });

    // フォームを開く
    await page.locator('button:has-text("所属を追加")').click();
    await expect(page.locator('text=所属を新規追加')).toBeVisible();

    // 必須項目を入力
    await page.locator('label:has-text("組織") select').selectOption(String(fixture.organizationId));
    await page.locator('label:has-text("開始日") input').fill('2024-04-01');

    // 送信
    await page.locator('button[type="submit"]:has-text("追加")').click();

    // 所属一覧テーブルに追加した行が表示される
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 });

    // フォームが閉じて「所属を追加」ボタンが再表示される
    await expect(page.locator('text=所属を新規追加')).not.toBeVisible();
    await expect(page.locator('button:has-text("所属を追加")')).toBeVisible();
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

test.describe('HR_ADMIN による上長候補選択 UI', () => {
  let tempEmployeeId: number | null = null;

  test.afterEach(async ({ page }) => {
    if (tempEmployeeId != null) {
      await page.request.patch(`/api/admin/employees/${tempEmployeeId}/soft-delete`);
      tempEmployeeId = null;
    }
  });

  test('既存所属の「上長設定」で候補 select が表示される', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    await page.goto(`/employees/${fixture.employeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E Admin', { timeout: 8_000 });

    await page.locator('button:has-text("上長設定")').first().click();

    // 候補 select と解除オプションが表示される
    await expect(page.locator('label:has-text("上長（空欄で解除）") select')).toBeVisible();
    await expect(page.locator('option:has-text("未設定（解除）")')).toBeAttached();
  });

  test('上長を候補から選択して設定・解除できる', async ({ page }) => {
    const fixture: FixtureState = JSON.parse(fs.readFileSync(FIXTURE_STATE, 'utf8'));

    // 一時社員を作成して所属を API で追加
    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 上長設定テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    const empRes = await page.request.post(`/api/employees/${tempEmployeeId}/employments`, {
      data: {
        organizationId: fixture.organizationId,
        employmentType: 1,
        isPrimaryAssignment: true,
        startDate: '2024-04-01',
      },
    });
    expect(empRes.ok()).toBeTruthy();

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 上長設定テスト用社員', { timeout: 8_000 });

    // 上長を E2E Admin に設定
    await page.locator('button:has-text("上長設定")').click();
    await expect(page.locator('label:has-text("上長（空欄で解除）") select')).toBeVisible();
    await page.locator('label:has-text("上長（空欄で解除）") select').selectOption(String(fixture.employeeId));
    await page.locator('button[type="submit"]:has-text("設定")').click();

    // 上長が所属テーブルに反映される
    await expect(page.locator('table')).toContainText(`社員ID: ${fixture.employeeId}`, { timeout: 8_000 });

    // 未設定（解除）を選んで解除
    await page.locator('button:has-text("上長設定")').click();
    await page.locator('label:has-text("上長（空欄で解除）") select').selectOption('');
    await page.locator('button[type="submit"]:has-text("設定")').click();

    // 上長が解除される
    await expect(page.locator('table')).not.toContainText(`社員ID: ${fixture.employeeId}`, { timeout: 8_000 });
  });

  test('所属追加フォームで上長候補 select が表示される', async ({ page }) => {
    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 上長候補確認テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 上長候補確認テスト用社員', { timeout: 8_000 });

    await page.locator('button:has-text("所属を追加")').click();
    await expect(page.locator('text=所属を新規追加')).toBeVisible();

    // 所属追加フォームに上長候補 select が表示される
    await expect(page.locator('label:has-text("上長（任意）") select')).toBeVisible();
  });

  test('所属追加フォームの上長候補に対象社員本人が含まれない', async ({ page }) => {
    const createRes = await page.request.post('/api/employees', {
      data: { fullName: 'E2E 自己除外確認テスト用社員' },
    });
    expect(createRes.ok()).toBeTruthy();
    const newEmployee = await createRes.json() as { id: number };
    tempEmployeeId = newEmployee.id;

    await page.goto(`/employees/${tempEmployeeId}`);
    await expect(page.locator('h1.page-title')).toHaveText('E2E 自己除外確認テスト用社員', { timeout: 8_000 });

    await page.locator('button:has-text("所属を追加")').click();
    await expect(page.locator('label:has-text("上長（任意）") select')).toBeVisible();

    // 対象社員本人は上長候補に表示されない
    await expect(
      page.locator(`label:has-text("上長（任意）") select option[value="${tempEmployeeId}"]`),
    ).not.toBeAttached();
  });
});
