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
- 認証 Cookie は `HttpOnly` を前提にする
- 開発時は `http://localhost:3000` から `http://localhost:3001` への `CORS + credentials: include` を前提にする
- `backend` 側では `Access-Control-Allow-Credentials: true` を有効にする
- 開発時の Cookie 属性は `SameSite=Lax` を基本にし、`Secure` は本番で有効化する
- 本番では可能な限り同一オリジン寄せを前提にする
- 環境変数は `.env.example` を正本の雛形とし、実値は `.env` または `.env.local` で管理する
- 秘密値は git に含めない
- `frontend` で公開してよい値のみ `NEXT_PUBLIC_` を付ける
- `DATABASE_URL`, `DB_PASSWORD`, `SESSION_SECRET` などの秘密値は `backend` 側だけで使う
- ディレクトリごとの `.env` 配置は、まずルート `.env` を正本にする
- `apps/frontend/.env.local` は必要時のローカル上書きとして使えるようにする
- `apps/backend` 個別の `.env` は必要になるまで作らない
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

### 数値コードの第一候補

- 主キー / 外部キーは `integer` を前提にする
- 状態値 / 種別値は `smallint` を前提にする
- 列挙値は将来の途中追加に備え、`10, 20, 30...` の刻みで定義する

#### `UserAccount.status`

- `10 = ACTIVE`
- `20 = SUSPENDED`
- `30 = DISABLED`

#### `RoleAssignment.role_type`

- `10 = HR_ADMIN`
- `20 = MANAGER`
- `30 = ORG_ADMIN`
- `40 = EXECUTIVE_VIEWER`
- `50 = EMPLOYEE`

#### `RoleAssignment.scope_type`

- `10 = TENANT_ALL`
- `20 = SELF`
- `30 = ORGANIZATION`
- `40 = ORGANIZATION_TREE`

### 初回 `HR_ADMIN` 作成の第一候補

- 初回テナント作成と初回 `HR_ADMIN` 作成は、MVP では管理コマンドまたは Seed で行う
- 管理画面の作成は初期必須にしない
- 手順と追加設定方法は、運用者向けのセットアップ文書へ明記する

### 認証・認可 API の第一候補

- MVP の最小 API は `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, `GET /api/me/roles` の 4 本を第一候補とする
- `POST /api/auth/login` は `login_identifier + password` を受け取り、成功時に `HttpOnly Cookie` でサーバ側セッションを発行する
- `POST /api/auth/logout` は現在セッションを失効し、Cookie を削除する
- `GET /api/auth/session` は現在の認証状態と最小ユーザー情報を返す
- `GET /api/me/roles` は現在ユーザーの有効ロール一覧を返す
- セッショントークンはレスポンス body に返さず、Cookie のみで扱う

### エラーレスポンスの第一候補

- 失敗レスポンスは共通で `error.code`, `error.message`, `error.details` を持つ JSON 形式を使う
- `error.code` は機械判定用、`error.message` は画面表示用、`error.details` は追加情報用とする
- HTTP ステータスは一般的な意味に合わせて使い分ける
- `400` は入力不正
- `401` は未認証
- `403` は権限不足または他テナント拒否
- `404` は対象なし
- `409` は重複または状態競合
- `500` は想定外障害

### `Prisma schema / migration` 方針の第一候補

- テーブル、型、外部キー、一意制約、`NOT NULL`、index は `Prisma schema` を正本にする
- `CHECK (scope_id >= 0)` のような補助制約は migration SQL で補う
- enum は DB enum を使わず、当面は `smallint` の数値コードで管理する
- コード値の意味はアプリ側の定数または型で一元管理する
- `Prisma Migrate` を正本にし、生成された migration SQL に必要な `CHECK` 制約を追記する
- 最初の認証・認可基盤 migration は `UserAccount`, `Session`, `RoleAssignment` を 1 本にまとめる

### `Prisma schema` モデルの第一候補

#### `UserAccount`

- `id`
- `tenantId`
- `employeeId`
- `loginIdentifier`
- `passwordHash`
- `status`
- `lastLoggedInAt`
- `createdAt`
- `updatedAt`

- `id` は `Int @id @default(autoincrement())`
- `status` は `Int @db.SmallInt`
- `lastLoggedInAt` は `DateTime?`
- `createdAt` は `DateTime @default(now())`
- `updatedAt` は `DateTime @updatedAt`
- `sessions` と `roleAssignments` の relation を持つ
- `employeeId -> Employee.id` の明示 relation を持つ
- `@@unique([tenantId, employeeId])`
- `@@unique([tenantId, loginIdentifier])`
- `@@index([tenantId])`

#### `Session`

- `id`
- `tenantId`
- `userAccountId`
- `sessionTokenHash`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

- `id` は `Int @id @default(autoincrement())`
- `revokedAt` は `DateTime?`
- `userAccount` は `UserAccount` への relation を持つ
- `@@index([tenantId])`
- `@@index([userAccountId])`
- `@@index([expiresAt])`

#### `RoleAssignment`

- `id`
- `tenantId`
- `userAccountId`
- `roleType`
- `scopeType`
- `scopeId`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

- `id` は `Int @id @default(autoincrement())`
- `roleType` は `Int @db.SmallInt`
- `scopeType` は `Int @db.SmallInt`
- `effectiveTo` は `DateTime?`
- `userAccount` は `UserAccount` への relation を持つ
- `@@index([tenantId])`
- `@@index([userAccountId])`
- `@@index([roleType])`
- `@@index([scopeType, scopeId])`

#### `Prisma schema` に書くもの / migration SQL に回すもの

- `Prisma schema` に書く:
  - 主キー
  - 外部キー
  - 一意制約
  - index
  - 型
  - nullable / not null
- migration SQL に回す:
  - `CHECK (scope_id >= 0)`
  - `CHECK (status > 0)`
  - `CHECK (role_type > 0)`
  - `CHECK (scope_type > 0)`

### `Employee` との relation の第一候補

- `UserAccount.employeeId -> Employee.id` の明示 relation を貼る
- `UserAccount` は `Employee` に対して 1:1 前提で扱う
- 一意制約は `@@unique([tenantId, employeeId])` で表現する

### 認証状態遷移の第一候補

#### ログイン成功時

- `UserAccount.status = ACTIVE` であることを前提にする
- `login_identifier + password` の一致を確認する
- 成功時は `Session` を新規作成する
- `session_token_hash` を保存する
- `expires_at` はアプリ設定で一元管理するセッション有効期限を使って計算する
- `revoked_at` は `NULL` とする
- `UserAccount.last_logged_in_at` を更新する
- `UserAccount.updated_at` を更新する
- `HttpOnly Cookie` を返す
- 既存セッションはこの時点では失効させず、同時ログインを許可する

- セッション有効期限のような業務設定値は、環境変数ではなくアプリ内の設定ファイルまたは設定モジュールで一元管理する
- `14 日` は初期推奨値に留め、コード中にマジックナンバーで直接書かない

#### ログアウト時

- 現在の `Session` を特定する
- `revoked_at` に現在時刻を入れる
- `updated_at` を更新する
- Cookie を削除する
- `UserAccount` 側の状態は変更しない

#### `退職` / `休職` 時

- `Employment.status` を `退職` または `休職` に更新する
- 対応する `UserAccount.status` を `DISABLED` に更新する
- 有効な `Session` をすべて失効する
- 通常画面からは非表示にする
- 在籍終了者一覧からのみ参照できるようにする

#### 復帰時

- `Employment.status` を在職中へ戻す
- `UserAccount.status` は明示操作で `ACTIVE` に戻す
- セッションは自動復元しない
- 再ログイン時に新しい `Session` を発行する
- 所属は自動復元せず、`HR_ADMIN` が正しい所属を再設定する

### 認証 DTO の第一候補

- 最初に作る DTO は `LoginRequestDto`, `AuthSessionResponseDto`, `RoleItemDto`, `MyRolesResponseDto`, `ApiErrorResponseDto` の最小構成を第一候補とする

#### `LoginRequestDto`

- `loginIdentifier: string`
- `password: string`
- `loginIdentifier` は必須、空文字不可、最大 `255`
- `password` は必須、空文字不可、最大 `255`

#### `AuthSessionResponseDto`

- 認証済み:
  - `authenticated: true`
  - `userAccountId: number`
  - `employeeId: number`
  - `tenantId: number`
  - `displayName: string`
- 未認証:
  - `authenticated: false`

- `authenticated` を判別子にした union 型の shape を第一候補とする

#### `RoleItemDto`

- `roleType: number`
- `roleName: string`
- `scopeType: number`
- `scopeName: string`
- `scopeId: number`

- 数値コードと名前の両方を返す shape を第一候補とする

#### `MyRolesResponseDto`

- `roles: RoleItemDto[]`

#### `ApiErrorResponseDto`

- `error.code: string`
- `error.message: string`
- `error.details: Record<string, unknown>`

- `details` は常に持つ shape を第一候補とする

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
