# Initial Bootstrap

- Status: Decided
- Owner: Keith / Codex
- Last Updated: 2026-05-03

## 目的

初回テナント作成と初回 `HR_ADMIN` 作成の進め方を固定し、MVP の導入手順をぶらさないようにする。

## 決定事項

- MVP では、初回テナント作成と初回 `HR_ADMIN` 作成を管理コマンドで行う
- 初期段階では専用の管理画面を必須にしない
- 追加設定方法も同じ文書で案内する
- `Tenant` は MVP でも最小テーブルを持つ
- 組織 / 社員の初期投入は、MVP では既存 API を使った手順書整備で対応する

## 想定フロー

1. テナントを作成する
2. 初回 `Employee` を作成する
3. 初回 `UserAccount` を作成する
4. 初回 `HR_ADMIN` の `RoleAssignment` を作成する
5. 仮パスワードまたは初期ログイン情報を発行する

## 手順書に必ず含める内容

- 管理コマンド名または Seed の実行方法
- `create-tenant` コマンドの実行方法
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

## コマンド実行例

### 前提条件

- ルート `.env` が設定済みであること
- 開発時の `DATABASE_URL` は、ホストから `prisma migrate dev` を実行する前提で `localhost:5432` を向くこと
- `compose.yml` の `db` サービスが起動済みであること
- `prisma migrate deploy`（または `prisma migrate dev`）でマイグレーション適用済みであること

開発時の `DATABASE_URL` 例:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_base?schema=public
```

注意:

- `apps/backend` で `npx prisma migrate dev` を実行する場合、ルート `.env` は自動ではシェル環境に載らないことがある
- その場合は、先にルート `.env` を `source` してから Prisma コマンドを実行する

実行例:

```bash
cd /home/keith/Documents/projects/personal-base
set -a
source .env
set +a
cd apps/backend
npx prisma migrate dev --name add-position-master
```

### 初回 Tenant 作成

```bash
# apps/backend ディレクトリで実行
pnpm create-tenant \
  --tenantCode=sample \
  --name="Sample Company"
```

成功時の出力例:
```
Tenant created: id=1, tenantCode=sample, name=Sample Company
```

**注意事項：**
- `tenantCode` は一意であること
- 初回 `HR_ADMIN` 作成前に実行すること
- `create-hr-admin` は既存 `tenantId` を前提に実行すること

### 初回 HR_ADMIN 作成

```bash
# apps/backend ディレクトリで実行
pnpm create-hr-admin \
  --tenantId=1 \
  --loginIdentifier=admin@example.com \
  --password=<初期パスワード>
```

成功時の出力例：
```
HR_ADMIN created: employeeId=1, userAccountId=1, tenantId=1
```

**注意事項：**
- 指定した `tenantId` の `Tenant` が既存でない場合はエラーにする
- 同じ `tenantId` + `loginIdentifier` の組み合わせが既存の場合はエラーになる
- パスワードは bcryptjs でハッシュ化して保存される
- 初期作成時の `Employee.fullName` は `loginIdentifier` が入るため、作成後に正式な氏名へ更新すること
- 作成後は速やかに本人にパスワードを伝え、変更を促すこと（パスワード変更 API は後続フェーズで実装）

### 追加 HR_ADMIN / ロール割当

初回 HR_ADMIN でログイン後、管理 API でロールを追加付与する。

```
POST /api/admin/role-assignments
Cookie: session_token=<セッショントークン>
Content-Type: application/json

{
  "targetUserAccountId": 2,
  "roleType": 1,       // 1=HR_ADMIN, 2=MANAGER, 3=ORG_ADMIN, 4=EXECUTIVE_VIEWER, 5=EMPLOYEE
  "scopeType": 4,      // 1=SELF, 2=ORGANIZATION, 3=ORGANIZATION_TREE, 4=TENANT_ALL
  "scopeId": 0,        // 非組織スコープは 0。組織スコープは organization_id を指定
  "effectiveFrom": "2026-04-28T00:00:00.000Z"
}
```

### ロール失効

```
DELETE /api/admin/role-assignments/:id
Cookie: session_token=<セッショントークン>
```

### 組織 / 社員の初期投入

MVP では専用 seed や一括投入スクリプトは追加せず、既存 API を使った最小手順を正本とする。

1. `create-tenant` で初回 tenant を作成する
2. `create-hr-admin` で初回 `HR_ADMIN` を作成する
3. 初回 `HR_ADMIN` でログインする
4. `POST /api/organizations` で必要な組織を作成する
5. `POST /api/employees` と所属 API で社員と所属を投入する
6. 必要に応じて `POST /api/admin/role-assignments` で `MANAGER` / `ORG_ADMIN` / `EXECUTIVE_VIEWER` を追加する

CSV 取込は後続対応とし、この段階では前提にしない。

## 動作確認の最短手順

MVP 時点の最短確認手順として、まずは `curl` などで API を直接呼ぶ前提とする。

ブラウザで確認したい場合も、まずは以下の手順で初期データを投入しないと表示対象が存在しない。

### 1. バックエンドを起動する

```bash
cd /home/keith/Documents/projects/personal-base/apps/backend
pnpm start:dev
```

### 2. 初回 tenant を作成する

```bash
cd /home/keith/Documents/projects/personal-base/apps/backend
pnpm create-tenant \
  --tenantCode=demo \
  --name="Demo Company"
```

### 3. 初回 HR_ADMIN を作成する

```bash
cd /home/keith/Documents/projects/personal-base/apps/backend
pnpm create-hr-admin \
  --tenantId=1 \
  --loginIdentifier=admin@example.com \
  --password='demo'
```

### 4. ログインして Cookie を保存する

```bash
curl -i -c /tmp/personal-base-cookie.txt \
  -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": 1,
    "loginIdentifier": "admin@example.com",
    "password": "demo"
  }'
```

補足:
- `session_token` は `HttpOnly Cookie` で返る
- 以後の認証付き API は `-b /tmp/personal-base-cookie.txt` を付けて呼ぶ

### 5. ログイン確認をする

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  http://localhost:3001/api/auth/me
```

### 6. 初回組織を作成する

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  -X POST http://localhost:3001/api/organizations \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationName": "人事部",
    "organizationCode": "HR",
    "displayOrder": 10
  }'
```

想定:
- 返却 JSON の `id` を控える
- 例では以後 `organizationId=1` を使う

### 7. 初回社員を作成する

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  -X POST http://localhost:3001/api/employees \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "山田 太郎",
    "employeeNumber": "EMP001",
    "displayName": "山田",
    "email": "yamada@example.com"
  }'
```

想定:
- 返却 JSON の `id` を控える
- 例では以後 `employeeId=2` を使う

### 8. 社員へ主所属を追加する

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  -X POST http://localhost:3001/api/employees/2/employments \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId": 1,
    "employmentType": 1,
    "isPrimaryAssignment": true,
    "startDate": "2026-05-03",
    "status": 1
  }'
```

## dev DB をクリーンに戻す / fixture を再投入する手順

`PMO_PJPERSONALBASE-25` で確認したとおり、ローカル開発 DB の状態は各自の確認履歴に依存する。動作確認前に状態が読めない場合は、以下のどちらかの手順を使う。

### 手順 A. DB をリセットして最初から再投入する

```bash
cd /home/keith/Documents/projects/personal-base
set -a
source .env
set +a
cd apps/backend
npx prisma migrate reset --force
pnpm create-tenant --tenantCode=demo --name="Demo Company"
pnpm create-hr-admin --tenantId=1 --loginIdentifier=admin@example.com --password='demo'
```

その後の組織 / 社員投入は、この文書の `6` から `8` の API 手順を使う。

### 手順 B. E2E 用 fixture を既知状態へ再投入する

`frontend + backend + db` の確認を既知データで揃えたい場合は、fixture コマンドを使う。

```bash
cd /home/keith/Documents/projects/personal-base
set -a
source .env
set +a
cd apps/backend
pnpm setup-e2e-fixtures
```

補足:

- fixture 再投入コマンドの実装は [setup-e2e-fixtures.command.ts](/home/keith/Documents/projects/personal-base/apps/backend/src/commands/setup-e2e-fixtures.command.ts) を正本とする
- fixture は E2E 向けの既知状態を作るものであり、完全なクリーン環境が必要な場合は `手順 A` を優先する

### 9. 初回 HR_ADMIN の氏名を正式値へ更新する

`create-hr-admin` 直後は `Employee.fullName = loginIdentifier` なので、必要に応じて更新する。

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  -X PATCH http://localhost:3001/api/employees/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "初期管理者",
    "displayName": "管理者"
  }'
```

### 10. 表示系 API を確認する

社員一覧:

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  http://localhost:3001/api/employees
```

組織図:

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  http://localhost:3001/api/org-chart/tree
```

組織詳細:

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  http://localhost:3001/api/org-chart/organizations/1
```

組織メンバー:

```bash
curl -s -b /tmp/personal-base-cookie.txt \
  http://localhost:3001/api/org-chart/organizations/1/members
```

### 11. ブラウザで人間確認する手順

第 2 フェーズ完了時点では、`http://localhost:3000` で最小フロントを確認できる。
人間が 1 人で安定して確認したい場合は、都度 API 手入力でデータを作るより、既知状態へ戻せる fixture を使う方が安全である。

#### 推奨手順

1. `db` を起動する
2. backend と frontend を起動する
3. fixture を再投入する
4. ブラウザで `http://localhost:3000/login` にアクセスする
5. fixture の既知アカウントでログインする
6. 主要画面を順に確認する

起動例:

```bash
cd /home/keith/Documents/projects/personal-base
docker compose up -d db

set -a
source .env
set +a

cd apps/backend
pnpm start:dev
```

別ターミナル:

```bash
cd /home/keith/Documents/projects/personal-base
set -a
source .env
set +a

cd apps/frontend
pnpm dev
```

fixture 再投入:

```bash
cd /home/keith/Documents/projects/personal-base
set -a
source .env
set +a

cd apps/backend
pnpm setup-e2e-fixtures
```

既知ログイン情報:

- `tenantId`: `1` とは限らない。fixture 実行結果の JSON に出る `tenantId` を使う
- `loginIdentifier`: `e2e-admin@test.local`
- `password`: `E2ePassword1!`

デモ用アカウント（ワンボタンログイン経由）の認証情報ルールは [demo-credentials.md](./demo-credentials.md) を参照すること。

補足:

- `tenantId` は環境によって変わりうるため、`1` 固定で覚えないこと
- fixture の正本は [setup-e2e-fixtures.command.ts](/home/keith/Documents/projects/personal-base/apps/backend/src/commands/setup-e2e-fixtures.command.ts) とする
- 既存の手動投入データを残したままでも fixture は既知状態へ寄せるが、完全にまっさらな確認が必要なら前述の `手順 A. DB をリセットして最初から再投入する` を使う

#### ブラウザ確認の観点

ログイン後は少なくとも次を確認する。

- `/dashboard`
  - 認証済みユーザーの氏名、テナント ID、社員 ID が表示される
- `/employees`
  - 社員一覧が表示される
- `/employees/:id`
  - 社員詳細、`profile_free_text`、所属、`WorkHistory` が表示される
- `/work-histories`
  - 本人の `WorkHistory` 一覧、追加、編集、削除ができる

ロール差分を人手で確認したい場合は、fixture の `HR_ADMIN` でログインした後、必要な対象社員とロールを追加投入して確認する。
追加ロール付与の基本手順はこの文書の `追加 HR_ADMIN / ロール割当` を参照すること。

### 論理削除社員の一覧・復元

```
# 論理削除社員一覧（HR_ADMIN または ORG_ADMIN）
GET /api/admin/employees/deleted

# 復元
PATCH /api/admin/employees/:id/restore

# 論理削除
PATCH /api/admin/employees/:id/soft-delete
```
