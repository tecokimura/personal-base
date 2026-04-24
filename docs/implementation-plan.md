# Implementation Plan

- Status: Decided
- Owner: Keith / Codex
- Last Updated: 2026-04-22

## 目的

設計済みの方針を、実装に着手できる順序へ落とし込む。

MVP と第 2 フェーズの実装順を明確にし、後戻りを減らす。

## 前提

- `MVP` の中心ユースケースは `社員台帳と組織図の一元管理`
- `第 2 フェーズ` で `WorkHistory`、`LoginHistory`、`EditHistory` を入れる
- 技術方針は `モジュラモノリス + Docker Compose + PostgreSQL + NestJS + Next.js + Prisma + TypeScript + RBAC + 組織スコープ`
- `TypeScript` を使う実装では `any` を使わないことを厳守する
- バックエンドは `NestJS + TypeScript`、フロントエンドは `Next.js + TypeScript` で進める
- ORM / マイグレーションは `Prisma` で進める
- リポジトリ構成は `1 リポジトリ` で進める
- Node.js のパッケージマネージャは `pnpm` で進める

## 決定事項

### MVP の実装順

以下を `MVP` の確定実装順とする。

1. 認証・認可の土台
2. 組織と社員台帳の基本 CRUD
3. 組織図表示
4. 権限制御を反映した閲覧境界
5. 顔写真と `profile_free_text`
6. 論理削除と履歴の最小対応
7. CSV 取込 / 出力
8. バリデーションとエラーハンドリング
9. 更新メタ情報と最低限の監査導線
10. テストと初期運用導線
11. ベータ運用に必要な管理機能

### `1. 認証・認可の土台`

- アプリ内認証
- `tenant_id` 境界
- `RBAC + 組織スコープ`
- 最低限のユーザー作成とロール割当

#### `認証・認可基盤` の確定チケット

1. `UserAccount / Session / RoleAssignment` のデータモデルとマイグレーション
2. ログイン / ログアウト / セッション検証の認証 API
3. `AuthorizationService` とロール判定基盤
4. 初回 `HR_ADMIN` 作成の管理コマンドと手順書
5. `MANAGER / ORG_ADMIN` 権限を反映した管理 API
6. `認証・認可基盤` のテストケース設計とテスト実装

#### `認証・認可基盤` のチケット補足

- `3` は `AuthorizationService` を共通入口にし、許可の和集合で判定する
- `4` は `Seed` ではなく管理コマンドを正本とする
- `5` は `MANAGER` の補助更新と `ORG_ADMIN` の論理削除社員対応を MVP 対象とする
- `6` の初期候補は [docs/architecture/auth-authorization-test-cases.md](/home/keith/Documents/projects/personal-base/docs/architecture/auth-authorization-test-cases.md) を起点にし、実装前に見直す

#### `認証・認可基盤` の推奨実装開始順

1. `UserAccount / Session / RoleAssignment` のデータモデルとマイグレーション
2. ログイン / ログアウト / セッション検証の認証 API
3. `AuthorizationService` とロール判定基盤
4. 初回 `HR_ADMIN` 作成の管理コマンドと手順書
5. `MANAGER / ORG_ADMIN` 権限を反映した管理 API
6. `認証・認可基盤` のテストケース設計とテスト実装

#### 最初の動く縦切り

以下を最初の到達点とする。

- 初回 `HR_ADMIN` を管理コマンドで作成できる
- 作成した `HR_ADMIN` でログインできる
- セッションが発行される
- `AuthorizationService` で `HR_ADMIN` を許可できる

#### 次の着手単位へ進む条件

以下を満たしたら、`組織管理` の詳細設計と実装へ進んでよい。

- 初回 `HR_ADMIN` 作成ができる
- ログインできる
- セッション検証ができる
- `AuthorizationService` が利用できる
- 他テナント拒否の最低限確認ができる

### `2. 組織と社員台帳の基本 CRUD`

- `Organization`
- `Employee`
- `Employment`
- `RoleAssignment`
- `OrganizationLeader`
- 一覧 / 詳細 / 登録 / 更新

### `3. 組織図表示`

- 親子組織の表示
- 主所属 / 兼務表示
- 上長 / 組織責任者表示

### `4. 権限制御を反映した閲覧境界`

- `HR_ADMIN`
- `MANAGER`
- `ORG_ADMIN`
- `EXECUTIVE_VIEWER`
- `EMPLOYEE`

ごとの見え方を固定する。

### `5. 顔写真と profile_free_text`

- ローカルファイル保存
- 顔写真アップロード
- `profile_free_text` の登録 / 更新 / 表示

### `6. 論理削除と履歴の最小対応`

- 論理削除社員
- `Employment` と `OrganizationLeader` の履歴前提運用
- `ORG_ADMIN` による閲覧 / 復元

### `7. CSV 取込 / 出力`

- 初期データ投入
- 管理者向けエクスポート

### `8. バリデーションとエラーハンドリング`

- 入力制約
- 重複チェック
- 権限エラー
- 不正データ防止

### `9. 更新メタ情報と最低限の監査導線`

- `updated_at`
- `updated_by`
- 重要更新の痕跡を追える状態

### `10. テストと初期運用導線`

- 権限テスト
- 他テナント非表示テスト
- 初期セットアップ手順
- 管理者が最初に使い始める導線

### `11. ベータ運用に必要な管理機能`

- 初回テナント作成
- 初回 `HR_ADMIN` 作成
- ロール割当
- 組織 / 社員の初期投入手順

## 第 2 フェーズまで通した実装順

以下を `MVP` 完了後から `第 2 フェーズ` までの確定実装順とする。

12. `LoginHistory` と `EditHistory` の最小導入
13. `WorkHistory` のデータモデルと API
14. `WorkHistory` の本人登録 / 更新 / 一覧表示
15. `MANAGER` と `HR_ADMIN` の補助編集
    - `MANAGER` による `profile_free_text`、顔写真、`Manager Employee ID` の補助更新を含める
    - 所属変更、兼務変更、役職変更、在籍状態変更は、この段階では即時更新 API にせず、申請 / 承認フローまたは下書き機能の追加候補として扱う
16. `WorkHistory` の公開範囲反映
17. 同僚向け `WorkHistory` 閲覧画面
18. `profile_free_text` の Markdown 入力許可
19. 第 2 フェーズ全体の監査・権限・回帰テスト
    - `ORG_ADMIN` の組織運用補助拡張と、見送った更新系の扱いを回帰観点に含める

### 第 2 フェーズ順序の理由

- `WorkHistory` は補助編集と同僚公開があるため、先に監査の土台を入れた方が運用説明しやすい
- `MANAGER` や `ORG_ADMIN` の更新対象を広げる論点は、監査と運用手順が先に固まってから扱う方が安全
- データモデルと API を先に固めることで、本人 UI と管理者 UI を作り分けやすい
- 公開範囲は確定済みだが、表示画面より先にサーバ側の境界を固める方が安全
- Markdown は `WorkHistory` と独立しているため、第 2 フェーズ終盤の作業として扱える

## 着手単位とチケット粒度

以下を `MVP` の確定方針とする。

### 着手単位

着手単位は `implementation-plan.md` の実装順を基準に切る。

ただし、`2. 組織と社員台帳の基本 CRUD` は作業量が大きいため、以下の 2 つへ分割する。

1. `認証・認可基盤`
2. `組織管理`
3. `社員台帳管理`
4. `組織図表示`
5. `閲覧権限制御`
6. `プロフィール機能`
7. `論理削除と履歴の最小対応`
8. `CSV 入出力`
9. `入力検証とエラー処理`
10. `更新メタ情報と監査導線`
11. `テストと初期運用`
12. `ベータ運用管理機能`

### チケット粒度

各着手単位は、原則として `2 から 5` 件のチケットへ分解する。

基本の分解軸は以下とする。

- `データモデル / マイグレーション`
- `アプリケーションサービス / API`
- `画面`
- `権限反映`
- `テストケース記述と実装`

### テストの進め方

- テストは後付けにせず、各着手単位に対応するテストケース記述と実装をセットで進める
- テストケースの最低セットは `正常系 / 権限エラー / バリデーションエラー / テナント越境防止` とする
- 回帰観点の統合テストは、各着手単位の完了時に追加で確認する
- `認証・認可基盤` の初期テストケース候補は [docs/architecture/auth-authorization-test-cases.md](/home/keith/Documents/projects/personal-base/docs/architecture/auth-authorization-test-cases.md) を起点にする

## 次に決めること

- `組織管理` の詳細設計
- `認証・認可基盤` の実装順に沿った着手
