# Initial Bootstrap

- Status: Decided
- Owner: Keith / Codex
- Last Updated: 2026-04-22

## 目的

初回テナント作成と初回 `HR_ADMIN` 作成の進め方を固定し、MVP の導入手順をぶらさないようにする。

## 決定事項

- MVP では、初回テナント作成と初回 `HR_ADMIN` 作成を管理コマンドまたは Seed で行う
- 初期段階では専用の管理画面を必須にしない
- 追加設定方法も同じ文書で案内する

## 想定フロー

1. テナントを作成する
2. 初回 `Employee` を作成する
3. 初回 `UserAccount` を作成する
4. 初回 `HR_ADMIN` の `RoleAssignment` を作成する
5. 仮パスワードまたは初期ログイン情報を発行する

## 手順書に必ず含める内容

- 管理コマンド名または Seed の実行方法
- 必須引数と任意引数
- `tenant_id` と `tenant_code` の指定方法
- 初回 `Employee` の必須項目
- `login_identifier` の指定方法
- 仮パスワードの扱い
- 再実行時の注意点
- 追加の `HR_ADMIN` 作成方法
- `ORG_ADMIN` や `MANAGER` の追加付与方法

## 追加設定の方針

- 初回セットアップ後のロール追加は `RoleAssignment` で行う
- `ORG_ADMIN` と `HR_ADMIN` は同一ユーザーへ同時付与できる
- 組織スコープ付きロールは `scope_type` と `scope_id` を明示して付与する

## 備考

- 具体的なコマンド名とオプションは実装時に確定する
- 実装後は、この文書へ実行例を追記する
