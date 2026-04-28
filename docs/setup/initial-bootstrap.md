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

## コマンド実行例

### 前提条件

- `DATABASE_URL` 環境変数が設定済みであること
- `prisma migrate deploy`（または `prisma migrate dev`）でマイグレーション適用済みであること

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
- 同じ `tenantId` + `loginIdentifier` の組み合わせが既存の場合はエラーになる
- パスワードは bcryptjs でハッシュ化して保存される
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

### 論理削除社員の一覧・復元

```
# 論理削除社員一覧（HR_ADMIN または ORG_ADMIN）
GET /api/admin/employees/deleted

# 復元
PATCH /api/admin/employees/:id/restore

# 論理削除
PATCH /api/admin/employees/:id/soft-delete
```
