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

フロントエンドは未実装のため、MVP 時点の動作確認は `curl` などで API を直接呼ぶ前提とする。

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
  --password='ChangeMe123!'
```

### 4. ログインして Cookie を保存する

```bash
curl -i -c /tmp/personal-base-cookie.txt \
  -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": 1,
    "loginIdentifier": "admin@example.com",
    "password": "ChangeMe123!"
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

### 11. ブラウザ確認について

- 現時点ではフロントエンド画面は未実装のため、ブラウザ単体で業務画面を開いて確認することはできない
- ブラウザで確認したい場合は、まず上記の初期データ投入を済ませたうえで、API レスポンスを直接確認するか、後続のフロント実装を待つ

### 論理削除社員の一覧・復元

```
# 論理削除社員一覧（HR_ADMIN または ORG_ADMIN）
GET /api/admin/employees/deleted

# 復元
PATCH /api/admin/employees/:id/restore

# 論理削除
PATCH /api/admin/employees/:id/soft-delete
```
