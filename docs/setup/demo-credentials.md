# デモ・ローカル開発環境 認証情報ルール

- Status: Decided
- Owner: Keith
- Last Updated: 2026-06-16

## ルール

デモ用・ローカル開発用のアカウントは以下の命名規則に統一する。

| ロール | loginIdentifier | パスワード |
|---|---|---|
| HR_ADMIN（管理者） | `admin@example.com` | `demo` |
| MANAGER | `manager@example.com` | `demo` |
| ORG_ADMIN | `org-admin@example.com` | `demo` |
| EXECUTIVE_VIEWER | `exec-viewer@example.com` | `demo` |
| EMPLOYEE（一般社員） | `employee@example.com` | `demo` |

## 命名規則

- **パスワード**: すべて `demo` に統一する
- **loginIdentifier**: `{役割}@example.com` 形式
- **テナントコード**: `demo`（デモ用テナント）

## 適用範囲

このルールが適用される箇所：

| ファイル | 用途 |
|---|---|
| `apps/backend/src/debug/debug-fixtures.service.ts` | デバッグ用ワンボタンログイン |
| `docs/setup/initial-bootstrap.md` の手順例 | セットアップ手順書のサンプル値 |

## 適用しない箇所

- **E2Eテスト用アカウント** (`e2e-admin@test.local` / `E2ePassword1!`) はテスト自動化専用のため変更しない
- **本番環境** では絶対に使用しないこと

## 注意事項

- `demo` パスワードは推測されやすいため、本番・ステージング環境への適用は厳禁
- 本番初回セットアップ時は `create-hr-admin` コマンドで任意の強固なパスワードを指定し、速やかに変更を促すこと
