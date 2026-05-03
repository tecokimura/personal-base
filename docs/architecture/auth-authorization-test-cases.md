# Auth Authorization Test Cases

- Status: Updated
- Owner: Keith / Codex
- Last Updated: 2026-05-01

## 目的

`認証・認可基盤` の実装時に、最低限確認すべきテスト観点を先に列挙しておく。

この文書ではテストコード実装までは確定せず、後でテストケース設計へ落とせる材料を残す。

この一覧は詳細設計時点の想定であり、必要ケースを完全に網羅したものではない。

実装着手前と MVP 終盤の両方で見直しを行い、追加・削除・粒度調整を前提とする。

## 基本方針

- `認証`
- `認可`
- `テナント越境防止`
- `セッション失効`
- `エラー分類とログ`

を最低セットとして扱う。

## テストケース候補

凡例: ✅ = 実装済み spec あり / ❌ = 未カバー / 〜 = 間接カバー

### 認証

- ✅ 正しい `login_identifier` とパスワードでログイン成功する（`auth.service.spec.ts`）
- ✅ パスワード不一致でログイン失敗する（`auth.service.spec.ts`）
- ✅ 無効化された `UserAccount` ではログイン失敗する（`auth.service.spec.ts`）
- ✅ ログアウトで対象セッションが失効する（`auth.service.spec.ts`）
- ✅ 失効済みセッションでアクセスすると認証失敗になる（`auth.service.spec.ts` — repository が null を返す経路）
- ✅ 期限切れセッションでアクセスすると認証失敗になる（`auth.service.spec.ts` — repository が null を返す経路）

### 認可

- ✅ `HR_ADMIN` は全社スコープの保護 API を実行できる（`authorization.service.spec.ts`）
- ✅ `MANAGER` は `ORGANIZATION_TREE` 配下の対象へアクセスできる（`employee-directory.service.spec.ts` — ORG_TREE 各テスト）
- ✅ `MANAGER` は配下外の対象へアクセスできない（`employee-directory.service.spec.ts` — assistUpdateProfile ORG_TREE 範囲外テスト）
- ✅ `ORG_ADMIN` は論理削除社員の閲覧と復元を実行できる（`employee-directory.service.spec.ts`）
- ✅ `EMPLOYEE` は管理 API を実行できない（`authorization.service.spec.ts` + `employee-directory.service.spec.ts`）
- ✅ 複数ロールを持つユーザーは許可の和集合で判定される（`authorization.service.spec.ts`）

### テナント越境防止

- ✅ 他テナントの `Employee` へアクセスできない（`employee-directory.service.spec.ts` — tenant isolation セクション）
- ✅ 他テナントの `RoleAssignment` を参照しない（`authorization.service.spec.ts` — 「他テナントへのアクセスを拒否し DB を参照しない」テスト: `getActiveRoles` が呼ばれないことを確認）
- ✅ 他テナントの論理削除社員を復元できない（`employee-directory.service.spec.ts` — tenant isolation セクション）
- ✅ 同じ `resource_id` 相当の値でも `tenant_id` が違えば拒否される（`authorization.service.spec.ts`）

### セッションと権限制御の組み合わせ

- ✅ 有効セッションでも権限不足なら拒否される（`employee-directory.service.spec.ts` — ForbiddenException テスト群）
- 〜 権限があってもセッション失効済みなら拒否される（SessionGuard 統合テストで確認要。service 層では verifySession 経路で保証）
- 〜 テナント不一致セッションなら拒否される（SessionGuard が tenantId 不一致を弾く。統合テストで確認要）

### エラー分類とログ

- ✅ 権限不足時にレスポンスで判別できる（`global-exception.filter.spec.ts` — 403 → FORBIDDEN 変換）（※ `Logger.error` は HttpException 経路では呼ばれない設計。NestJS 標準ログに任せる）
- ✅ 他テナント拒否時にレスポンスで判別できる（`global-exception.filter.spec.ts` — ForbiddenException 経路）（※ 同上）
- ✅ 入力不正と認可失敗がレスポンスの `code` で区別できる（`global-exception.filter.spec.ts` — VALIDATION_ERROR vs FORBIDDEN）
- ✅ 想定外障害が業務エラーと区別でき `Logger.error` が記録される（`global-exception.filter.spec.ts` — 未ハンドル Error/非Error/未知Prismaエラーで Logger.error 呼び出しを確認）

## 後で詰めること

- 各ケースを単体テストに置くか統合テストに置くか
- API ごとの期待ステータスコード
- 画面向けエラーメッセージとログ出力の対応
- テストデータの最小セット
- 未網羅ケースの追加と不要ケースの整理
