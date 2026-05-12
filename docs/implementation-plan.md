# Implementation Plan

- Status: Decided
- Owner: Keith / Codex
- Last Updated: 2026-05-11

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
- Lint / Format は `ESLint + Prettier` で進める
- `TypeScript` の `any` 禁止は lint でも検出する
- テスト基盤は、単体テスト / 統合テストに `Vitest`、E2E に `Playwright` を使う
- UI は `Tailwind CSS + 最小自前コンポーネント` を基本にする
- 初期は `Button`, `Input`, `Select`, `Dialog`, `Table`, `Badge` など必要最小限だけ整える
- 追加部品が必要になった場合は `shadcn/ui` を候補にする
- `MUI` と `Ant Design` は初期採用しない
- スタイリング基盤は `Tailwind CSS` で進める
- ディレクトリ構成は `apps/frontend`, `apps/backend`, `docs/`, ルートの `compose.yml`, `package.json`, `pnpm-workspace.yaml`, `.env.example` を基本にする
- `Docker Compose` の初期サービスは `frontend`, `backend`, `db` に絞る
- `packages/` は必要になるまで作らない
- `frontend` と `backend` は `REST API` で通信する
- 開発時の基本ポートは `frontend=3000`, `backend=3001`, `db=5432` にする
- `backend` の API は `/api` プレフィックスを前提にする
- `frontend` は環境変数で API 接続先を持つ
- 認証は `HttpOnly Cookie` を前提にする
- 開発時は `http://localhost:3000` から `http://localhost:3001` への `CORS + credentials: include` を前提にする
- `backend` 側では `Access-Control-Allow-Credentials: true` を有効にする
- 開発時の Cookie 属性は `SameSite=Lax` を基本にし、`Secure` は本番で有効化する
- 本番では可能な限り同一オリジン寄せを前提にする
- 環境変数は `.env.example` を正本の雛形とし、実値は `.env` または `.env.local` で管理する
- 秘密値は git に含めない
- `frontend` で公開してよい値のみ `NEXT_PUBLIC_` を付ける
- `DATABASE_URL`, `DB_PASSWORD`, `SESSION_SECRET` などの秘密値は `backend` 側だけで使う
- Compose でも `.env` を読む前提にする
- 本番の secrets は将来デプロイ先の secret 機構へ寄せる
- ディレクトリごとの `.env` 配置は、まずルート `.env` を正本にする
- `apps/frontend/.env.local` は必要時のローカル上書きとして使えるようにする
- `apps/backend` 個別の `.env` は必要になるまで作らない

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

### MVP 完了条件

以下をすべて満たした状態を、このプロジェクトの `MVP 完了` とみなす。

1. `implementation-plan.md` の着手単位 `1` から `12` までが完了している
2. 実装中に合意した差し込み作業が完了している
   - 現時点では、最小 `PositionMaster` を `プロフィール機能` の後、`論理削除と履歴の最小対応` の前に導入する
3. `docs` 正本に反映すべき確定事項が更新済みである
4. Backlog の進捗状態と `docs` の記述が実態と矛盾していない
5. `MVP` の中心ユースケースである `社員台帳と組織図の一元管理` が、権限制御込みで一通り成立している

補足:

- `12` まで完了すれば機械的に自動完了とするのではなく、上記 `2` から `5` も満たした時点で `MVP 完了` と判定する
- `第 2 フェーズ` 以降へ送る論点は、`docs/decision-backlog.md` と `docs/project-status.md` に明示されていれば、`MVP 完了` のブロッカーにはしない

2026-05-03 時点での判定:

- 着手単位 `1` から `12` は完了
- 差し込み合意した最小 `PositionMaster` は実装済み
- `docs` 正本と Backlog の整合は最終確認済み
- 追加の実装修正タスクは見つかっていない
- したがって、現時点で `MVP 完了` と判定する

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

#### `認証・認可基盤` の最初の実装着手単位

1. `Prisma schema` に `UserAccount / Session / RoleAssignment` を追加する
   - 完了条件:
   - 3 モデルが schema に入っている
   - relation, unique, index が入っている
   - `integer / smallint / nullable` 方針が反映されている
2. 認証・認可基盤の最初の migration を作る
   - 完了条件:
   - `UserAccount / Session / RoleAssignment` の migration が 1 本ある
   - `CHECK` 制約が SQL に追記されている
   - DB 作成後に最低限の整合が取れている
3. `UserAccount / Session / RoleAssignment` の repository / service 基盤を作る
   - 完了条件:
   - `UserAccount` を取得できる
   - `Session` を作成 / 失効できる
   - `RoleAssignment` を有効期間込みで取得できる
   - 以後の auth API で使える service の入口がある

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
- `Tenant` は最小テーブルと管理コマンドを持つ
- 組織 / 社員の初期投入は、MVP では既存 API を使った手順書整備を正本とする

## 第 2 フェーズまで通した実装順

以下を `MVP` 完了後から `第 2 フェーズ` までの確定実装順とする。

### 第 2 フェーズの目標

- バックエンド中心で成立した `MVP` を、人間がブラウザで触って確認できる状態へ進める
- `WorkHistory`、監査 API、プロフィール改善を加え、ベータとして使いやすい形へ広げる
- `Playwright` を第 2 フェーズの正式スコープに含め、主要画面のブラウザ確認を手動依存から段階的に外す

### 第 2 フェーズの完了条件

以下を満たした状態を `第 2 フェーズ完了` とみなす。

1. `frontend` からログインし、認証済み状態で主要画面を確認できる
2. 組織一覧 / 組織図 / 社員一覧 / 社員詳細をブラウザで確認できる
3. `WorkHistory` を本人、`HR_ADMIN`、`MANAGER` が作成 / 更新 / 一覧確認できる
4. `WorkHistory` の閲覧境界が、本人、同僚、管理者で仕様どおり反映されている
5. `LoginHistory` と `EditHistory` の最小記録と `HR_ADMIN` 向け閲覧導線がある
6. `profile_free_text` の Markdown 入力保存が可能である
7. 第 2 フェーズ対象の権限、監査、回帰テストが追加されている
8. `Playwright` による主要画面の E2E が導入され、少なくとも最小 4 シナリオが自動確認できる

### 第 2 フェーズの着手単位

13. `最小フロント確認導線`
    - ログイン画面
    - 認証状態確認
    - 組織一覧 / 組織図
    - 社員一覧 / 社員詳細
14. `LoginHistory` と `EditHistory` の最小導入
15. `WorkHistory` のデータモデルと API
16. `WorkHistory` の本人登録 / 更新 / 一覧表示
17. `WorkHistory` の公開範囲反映
18. `MANAGER` と `HR_ADMIN` の補助編集
    - `MANAGER` による `profile_free_text`、顔写真、`Manager Employee ID` の補助更新を含める
    - 所属変更、兼務変更、役職変更、在籍状態変更は、この段階では即時更新 API にせず、申請 / 承認フローまたは下書き機能の追加候補として扱う
19. `同僚向け WorkHistory 閲覧画面`
20. `profile_free_text` の Markdown 入力許可
21. `第 2 フェーズ全体の監査・権限・回帰テスト`
    - `ORG_ADMIN` の組織運用補助拡張と、見送った更新系の扱いを回帰観点に含める

### 第 2 フェーズの確定事項

#### `13. 最小フロント確認導線` の画面範囲

- 第 2 フェーズ前半で作る画面は `ログイン`, `認証状態確認`, `組織一覧`, `組織図`, `社員一覧`, `社員詳細` とする
- ここでの目的は、`MVP` バックエンドをブラウザで確認できる状態を作ることであり、管理用の高度な編集画面を一気に作ることではない
- `Organization` / `Employee` の登録や更新は、必要なものから段階的に画面化し、当初は API 利用を残してよい

#### `Playwright` の導入方針

- `Playwright` は第 2 フェーズの正式スコープに含める
- 最初は `Chromium` のみを対象にし、`headless` 実行を基本とする
- E2E は `frontend + backend + db` をローカル起動した状態で実行する
- 認証は API 偽装ではなく、UI からログインする流れを通す
- テストデータは、管理コマンドと既存 API を使って毎回再投入できる最小 fixture を前提にする
- 第 2 フェーズ前半では、以下の最小 4 シナリオを最初の到達点とする
  - ログインできる
  - 組織一覧が見える
  - 社員一覧 / 社員詳細が見える
  - `WorkHistory` を追加 / 更新 / 削除できる
- 第 2 フェーズ完了までに、対象画面は原則として E2E 対象へ広げる
  - `ログイン`
  - `認証状態確認`
  - `組織一覧`
  - `組織図`
  - `社員一覧`
  - `社員詳細`
  - `WorkHistory` 本人画面
  - `WorkHistory` 同僚閲覧画面
  - 監査 API の確認導線

#### `WorkHistory` の最小入力項目

- `employeeId`
- `yearMonthFrom`
- `yearMonthTo`
- `isCurrent`
- `workSummary`
- `toolsUsed`
- `roleName`
- `teamSize`
- `projectCode`

補足:

- `projectCode` は第 2 フェーズでは任意項目とする
- `workSummary` はプレーンテキスト前提とし、Markdown や自由装飾は入れない
- `toolsUsed` は初期は自由入力の文字列または文字列配列として扱い、`Skill` や辞書マスタ連携は第 3 フェーズ以降へ送る
- `teamSize` は任意入力とし、未入力を許可する

#### `WorkHistory` の更新主体と補助編集境界

- 本人は自分の `WorkHistory` を作成 / 更新 / 一覧確認できる
- `HR_ADMIN` は全社員の `WorkHistory` を作成 / 更新 / 一覧確認できる
- `MANAGER` は `ORGANIZATION_TREE` 配下社員の `WorkHistory` を作成 / 更新 / 一覧確認できる
- `ORG_ADMIN` は第 2 フェーズでは `WorkHistory` 専用の更新主体に含めない
- `EXECUTIVE_VIEWER` は `WorkHistory` の更新主体に含めない
- `MANAGER` による補助更新対象は `profile_free_text`, 顔写真, `managerEmployeeId`, `WorkHistory` とする
- 所属変更、兼務変更、役職変更、在籍状態変更は、第 2 フェーズでは即時更新 API に拡張せず、後続フェーズの申請 / 承認または下書き機能候補として扱う

#### `WorkHistory` の公開範囲

- 本人は自分の `WorkHistory` 原文を全件閲覧できる
- `HR_ADMIN` は全社員の `WorkHistory` 原文を全件閲覧できる
- `MANAGER` は `ORGANIZATION_TREE` 配下社員の `WorkHistory` 原文を全件閲覧できる
- `EXECUTIVE_VIEWER` は全社閲覧ロールとして `WorkHistory` 閲覧対象に含める
- `EMPLOYEE` は主所属が同じ同僚の `WorkHistory` 原文を閲覧できる
- `ORG_ADMIN` は第 2 フェーズでは `WorkHistory` 専用の通常閲覧主体に含めない
- 論理削除社員の `WorkHistory` は `HR_ADMIN` と `ORG_ADMIN` のみ閲覧できる
- AI サマリや公開範囲の本人設定は第 4 フェーズ以降へ送る

#### `LoginHistory` / `EditHistory` の最小項目と閲覧主体

- `LoginHistory` の最小項目は `tenantId`, `userAccountId`, `employeeId`, `loggedInAt`, `ipAddress`, `userAgent` とする
- `EditHistory` の最小項目は `tenantId`, `entityType`, `entityId`, `actionType`, `changedByEmployeeId`, `changedAt`, `scopeSummary` とする
- `LoginHistory` / `EditHistory` の閲覧主体は `HR_ADMIN` のみとする
- 第 2 フェーズでは通常画面へ `updatedBy` / `updatedAt` を露出せず、監査 API または管理者向け確認導線に限定する

#### Markdown の扱い

- Markdown を許可する対象は `profile_free_text` のみとする
- 第 2 フェーズでは Markdown の入力保存だけを扱う
- 表示時は Markdown レンダリングせず、生テキストのまま表示する
- `WorkHistory` には Markdown を入れず、構造化入力を維持する

#### 第 2 フェーズで明示的に入れないもの

- AI 要約、AI 推薦、AI アドバイス、AI チャット
- `Skill` や `Position` の高度な検索体験
- 所属変更、兼務変更、役職変更、在籍状態変更の申請 / 承認 UI
- 一般社員向けの高度なプロフィール公開設定

### 第 2 フェーズで作る最小実装

以下は、第 2 フェーズで必ず作る最小実装である。

- `frontend` の最小確認導線
  - ログイン
  - 認証状態確認
  - 組織一覧
  - 組織図
  - 社員一覧
  - 社員詳細
- `LoginHistory` と `EditHistory` の最小記録と `HR_ADMIN` 向け閲覧
- `WorkHistory` の最小データモデルと CRUD API
- 本人向け `WorkHistory` 登録 / 更新 / 一覧確認
- `HR_ADMIN` / `MANAGER` の補助編集
- 同僚向け `WorkHistory` 閲覧画面
- `profile_free_text` の Markdown 入力保存
- 第 2 フェーズ対象の監査、権限、回帰テスト
- `Playwright` による主要画面の E2E

この段階での狙いは、「まず使えること」「ブラウザで確認できること」「後続拡張の土台がぶれないこと」である。

### 第 3 フェーズへ送るもの

以下は、第 2 フェーズでは扱わず、第 3 フェーズ以降へ送る。

- 一般社員向け画面の高度化
- 運用管理画面の拡張
- 評価情報の集約と閲覧
- `Skill` や `Position` を使った高度な検索
- 所属変更、兼務変更、役職変更、在籍状態変更の申請 / 承認 UI
- 本人による公開範囲設定
- Markdown のリッチ表示

補足:

- AI 系は第 3 フェーズではなく、第 4 フェーズへ送る
- 第 3 フェーズは、AI なしでもサービスとして使いやすくする拡張フェーズとして扱う

### 第 2 フェーズで最初に確認できる状態

以下を最初の到達点とする。

- ブラウザでログインできる
- 組織一覧、組織図、社員一覧、社員詳細をブラウザで確認できる
- `WorkHistory` 導入前でも、今の `MVP` データを画面で確認できる
- 以後の `WorkHistory` や監査追加を API 単体ではなく画面付きで確認できる

### 第 2 フェーズ順序の理由

- `MVP` で不足していたのは「ブラウザでの確認導線」なので、最初に最小フロントを入れる
- `WorkHistory` は補助編集と同僚公開があるため、先に監査の土台を入れた方が運用説明しやすい
- データモデルと API を先に固めることで、本人 UI と管理者 UI を作り分けやすい
- 公開範囲は確定済みだが、表示画面より先にサーバ側の境界を固める方が安全
- `MANAGER` や `ORG_ADMIN` の更新対象を広げる論点は、監査と `WorkHistory` の基本導線が先に固まってから扱う方が安全
- Markdown は `WorkHistory` と独立しているため、第 2 フェーズ終盤の作業として扱える

### 第 2 フェーズの推奨チケット分解

各着手単位は、以下の粒度で Backlog に分解する。

13. `最小フロント確認導線`
    - `frontend` 基盤とログイン画面
    - 認証状態確認とセッション維持
    - 組織一覧 / 組織図画面
    - 社員一覧 / 社員詳細画面
14. `LoginHistory` と `EditHistory` の最小導入
    - schema / migration
    - 記録処理
    - `HR_ADMIN` 向け一覧 API または最小確認導線
15. `WorkHistory` のデータモデルと API
    - schema / migration
    - repository / service
    - CRUD API
16. `WorkHistory` の本人登録 / 更新 / 一覧表示
    - 本人向け画面
    - 基本バリデーション
    - 自分の履歴確認導線
17. `WorkHistory` の公開範囲反映
    - 閲覧スコープ反映
    - 表示項目マスキング確認
    - 同僚 / 管理者 / 本人の差分テスト
18. `MANAGER` と `HR_ADMIN` の補助編集
    - 補助編集 API
    - 必要な最小画面
    - 監査記録確認
19. `同僚向け WorkHistory 閲覧画面`
    - 同僚向け一覧 / 詳細
    - 権限別の表示差分
20. `profile_free_text` の Markdown 入力許可
    - 入力保存
    - 生テキスト表示維持
    - 回帰確認
21. `第 2 フェーズ全体の監査・権限・回帰テスト`
    - フロント主要導線
    - 権限制御
    - 監査記録と監査 API 導線
    - テナント越境防止

## 着手単位とチケット粒度

以下を `MVP` と `第 2 フェーズ` を通した確定方針とする。

### 着手単位

着手単位は `implementation-plan.md` の実装順を基準に切る。

`MVP` では、`2. 組織と社員台帳の基本 CRUD` を `組織管理` と `社員台帳管理` に分割した。

第 2 フェーズは、画面、監査、`WorkHistory`、補助編集、回帰テストを単位に切る。

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

- Phase 2 整合対応 (`PMO_PJPERSONALBASE-39` から `44`) は完了済みである
- 次に決めることは、Phase 3 の着手候補と将来課題の優先順位である
