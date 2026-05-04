# E2E テスト実行手順

## 概要

Playwright を使用した E2E テストです。フロントエンド（Next.js）とバックエンド（NestJS）の両方が起動している状態で実行します。

## 前提条件

- PostgreSQL が起動していること（デフォルト: `localhost:5432`）
- pnpm がインストールされていること
- Playwright ブラウザがインストールされていること

Playwright ブラウザのインストール:

```bash
cd apps/frontend
pnpm exec playwright install chromium
```

## テスト実行手順

### 1. バックエンドを起動

```bash
cd apps/backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_base?schema=public pnpm start:dev
```

### 2. フロントエンドを起動

```bash
cd apps/frontend
pnpm dev
```

### 3. E2E テストを実行

```bash
cd apps/frontend
pnpm test:e2e
```

環境変数でポートや DB を変更する場合:

```bash
E2E_BASE_URL=http://localhost:3000 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_base?schema=public \
pnpm test:e2e
```

## テストシナリオ

| ファイル | プロジェクト | 概要 |
|---|---|---|
| `e2e/login.spec.ts` | `login` | ログイン成功・失敗 |
| `e2e/organizations.spec.ts` | `authenticated` | 組織一覧表示 |
| `e2e/employees.spec.ts` | `authenticated` | 社員一覧・社員詳細 |
| `e2e/work-histories.spec.ts` | `authenticated` | 職歴追加・編集・削除 |

## フィクスチャ

`globalSetup` がテスト開始前に自動的に以下を実行します。

1. バックエンドの `setup-e2e-fixtures` コマンドを実行し、テスト用テナント・ユーザー・組織を upsert
2. ブラウザで UI ログインし、認証済みストレージ状態を `e2e/.auth/admin.json` に保存

フィクスチャの定数:

| 項目 | 値 |
|---|---|
| テナントコード | `E2ETEST` |
| ログイン ID | `e2e-admin@test.local` |
| パスワード | `E2ePassword1!` |
| 組織コード | `E2EORG` |

## .gitignore

以下のファイルは git 管理外です:

- `e2e/.auth/` — 認証済みストレージ状態（実行時に生成）
- `e2e/.fixture-state.json` — フィクスチャ情報（実行時に生成）
- `playwright-report/` — テストレポート
- `test-results/` — テスト結果

## テストレポート

テスト実行後、以下で HTML レポートを確認できます:

```bash
cd apps/frontend
pnpm exec playwright show-report
```
