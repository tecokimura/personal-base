# Security

- Status: In Review
- Owner: Keith / Codex
- Last Updated: 2026-04-22

## 目的

個人情報を扱うサービスとしてのセキュリティ設計論点を整理する。

## 背景

人事情報は機微性が高く、アクセス制御、監査、暗号化、運用統制を早い段階から設計対象に含める必要がある。

## 前提

- 個人情報保護は必須
- 監査可能性が重要

## 決定事項

- 初期の認可方針は `RBAC + 組織スコープ` を第一候補とする
- 認可判定はアプリケーション層で一元的に扱う
- `tenant_id` を境界の基本単位とし、すべての主要データアクセスで必須条件とする
- MVP は同期処理中心で始め、非同期処理はファイル処理や将来の AI 処理など限定用途に絞る
- 初期の認証方式は `アプリ内認証で開始し、後で SSO を追加する方式` を第一候補とする
- 認証主体は `Employee` とは分離した `UserAccount` を独立で持ち、`UserAccount.employee_id` で社員へ紐づける
- MVP の認証は `メールアドレス + パスワード` を第一候補とし、パスワードはハッシュ保存する
- セッションは `JWT` ではなく `DB 保存のサーバ側セッション` を第一候補とする
- セッション発行履歴は DB に残し、どのユーザーに、いつ、どこまで有効なセッションを発行したかを追えるようにする
- 将来の管理画面からの強制セッション失効に備え、セッションは個別に無効化できる設計を前提とする
- 認可判定は Controller や画面へ分散させず、`AuthorizationService` に集約する
- 1 ユーザーは複数の `RoleAssignment` を同時保持でき、認可判定時は有効なロールをすべて評価する
- `RoleAssignment` は `effective_from` と `effective_to` を最初から持つ
- `AuthorizationService` は許可の和集合で判定し、MVP では明示的な deny ルールを持たない

### 認証方式の考え方

- MVP では、まずアプリ内認証でログインできる状態を優先する
- `MVP` はアプリ内認証のみを第一候補とする
- `第 2 フェーズ` でも SSO は必須にしない
- SSO は、顧客要件や導入要件が見えた段階で `第 3 フェーズ以降` に追加する
- 認証方式が増えても、認可は共通の `RBAC + 組織スコープ` で扱う
- 認証と認可を分離して設計し、将来の IdP 追加で権限制御が崩れない形を優先する

### 認証主体と社員の分離

- ログイン主体は `Employee` ではなく `UserAccount` とする
- `Employee` は業務上の本人情報、`UserAccount` は認証情報とログイン可否を持つ
- 1 人の社員に 1 つの `UserAccount` を紐づけることを第一候補とする
- 将来の SSO や外部 IdP 連携時も、認証方式の差分は `UserAccount` 側で吸収する
- `UserAccount` のログイン識別子は `login_identifier` とし、連絡先メールアドレスとは別物として扱う
- `login_identifier` はログインに使う一意な文字列であり、現時点ではメールアドレス形式を許容する
- 通知や連絡先として使う値に誤用しないため、項目名に `email` は使わない

### セッション管理の第一候補

- ログイン成功時は Cookie ベースでサーバ側セッションを発行する
- Cookie に載せる値はランダムなセッショントークンとし、DB にはそのハッシュのみを保存する
- セッションの保持先は DB とし、少なくとも `user_account_id`, `tenant_id`, `expires_at`, `revoked_at` を追えるようにする
- セッション発行時には、だれに、いつ、どこまで有効なセッションを発行したかを DB に記録する
- MVP のセッション有効期限は固定値 `14 日` を第一候補とする
- ログアウト時は該当セッションを失効させる
- 将来の管理画面からの強制セッション切断に備え、セッション単位で `revoked_at` を設定できる前提とする
- `UserAccount` が `退職` または `休職` により無効化された時は、その時点で既存セッションも即時失効させる

### 認可判定の第一候補

- 認可判定は `AuthorizationService` に集約する
- 判定入力は少なくとも `actor`, `tenant_id`, `action`, `resource_type`, `resource_id`, `organization_context` を持つ
- 判定材料は `RoleAssignment`, `scope_type`, `scope_id`, `organization_tree` を使う
- 画面側のメニュー制御は補助にとどめ、最終判定は必ずサーバ側で行う
- 複数ロールを持つ場合は、同一 `tenant_id` 内で有効なロールの許可を合算して判定する

### ロール評価の第一候補

- 1 ユーザーは複数の `RoleAssignment` を保持できる
- 認可判定時は、同一 `tenant_id` 内で有効な `RoleAssignment` をすべて評価する
- `MANAGER` と `ORG_ADMIN` の兼任を前提とする
- 期限付き権限付与に備え、`effective_from` と `effective_to` を最初から持つ

### テーブル詳細の第一候補

#### `UserAccount`

- `id`
- `tenant_id`
- `employee_id`
- `login_identifier`
- `password_hash`
- `is_active`
- `last_logged_in_at`
- `created_at`
- `updated_at`

制約:

- `tenant_id + employee_id` は一意
- `tenant_id + login_identifier` は一意

#### `Session`

- `id`
- `tenant_id`
- `user_account_id`
- `session_token_hash`
- `issued_at`
- `expires_at`
- `revoked_at`
- `last_accessed_at`
- `ip_address`
- `user_agent`
- `created_at`

制約:

- `user_account_id` は `UserAccount` を参照する
- `revoked_at IS NULL` のセッションだけが有効候補
- `expires_at` を過ぎたセッションは無効とする

#### `RoleAssignment`

- `id`
- `tenant_id`
- `employee_id`
- `role_type`
- `scope_type`
- `scope_id`
- `effective_from`
- `effective_to`
- `created_at`
- `updated_at`

制約:

- `employee_id` は `Employee` を参照する
- `scope_id` は `NULL` を使わず、非組織スコープでは `0` を使う
- `TENANT_ALL` と `SELF` は `scope_id = 0` とする
- `ORGANIZATION` と `ORGANIZATION_TREE` は `scope_id = organization_id` とする

### 初回 `HR_ADMIN` 作成の第一候補

- 初回テナント作成と初回 `HR_ADMIN` 作成は、MVP では管理コマンドまたは Seed で行う
- 管理画面の作成は初期必須にしない
- 手順と追加設定方法は、運用者向けのセットアップ文書へ明記する

### SSO を追加する条件の第一候補

- 初回導入顧客から明確な SSO 要望がある
- 手動アカウント管理が導入運用のボトルネックになる
- 社内 ID 管理と連携しないと運用負荷や統制負荷が高い

### 初期セキュリティ設計の考え方

- 認証より先に認可の抜け漏れを防ぐ
- テナント境界をクエリとアプリケーションサービスの両方で明示する
- 監査は差分全文よりも、まず「誰が、いつ、何に対して何をしたか」を追えることを優先する
- 高度な AI 機能や専用検索基盤は、権限と監査の整理後に追加する

## 検討した選択肢

- 標準的な SaaS セキュリティ要件に沿って段階的に整備する
- 高い統制要件を初期から前提にする

## Open Questions

- 初期段階で必要な監査ログの粒度はどこまでか
- 保存データ暗号化の対象と境界はどうするか
- 運用者アクセスの統制をどうするか
- SSO を追加する際の顧客切替方式をどうするか
- SSO の第一候補プロバイダを何にするか

## 次に決めること

- 監査対象イベント
- 保存データ暗号化方針
