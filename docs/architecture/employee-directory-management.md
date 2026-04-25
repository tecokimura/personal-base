# Employee Directory Management

- Status: In Review
- Owner: Keith / Codex
- Last Updated: 2026-04-22

## 目的

`社員台帳管理` の MVP 詳細設計を定義し、`Employee` と `Employment` の責務、データ項目、更新ルール、論理削除、API 範囲を固定する。

## 背景

社員台帳は `Employee`、`Employment`、`Organization`、`RoleAssignment` の境界が曖昧だとすぐ破綻する。

特に、主所属 / 兼務、上長、在籍状態、論理削除をどこに持つかを先に固定しないと、組織図表示や権限制御へ影響が広がる。

## 前提

- MVP の中心ユースケースは `社員台帳と組織図の一元管理`
- `Employee` は社員本人の基本情報を表す
- `Employment` は所属、主所属 / 兼務、上長、在籍状態を表す
- `Organization` と `OrganizationLeader` は `organization-management` の責務とする
- `tenant_id` は全主要テーブルに持ち、他テナント越境を許可しない
- `WorkHistory` は業務実績の正本とする
- `Employment` の過去履歴は、必要に応じて管理補助情報として扱う
- 役職、兼務、所属、在籍状態の本更新は `HR_ADMIN` のみが行う
- 論理削除社員の閲覧・復元は `HR_ADMIN` と `ORG_ADMIN` が行う

## 決定事項

### モジュール責務

- `employee-directory-management` モジュールは `Employee` と `Employment` を責務範囲とする
- `Employee` は社員の最新版プロフィール情報の正本とする
- `Employment` は現在の組織所属の正本とする
- `Employment` の過去履歴は、権限制御や管理補助に必要な範囲だけ扱う
- 組織責任者は `OrganizationLeader` の正本を参照する
- 認可判定は `authorization` が行い、社員台帳側は対象データを提供する

### MVP の対象

- 社員一覧取得
- 社員詳細取得
- 社員登録
- 社員基本情報更新
- 所属情報登録
- 所属情報更新
- 主所属 / 兼務の管理
- 上長設定
- 論理削除社員の閲覧 / 復元

### MVP では持たないもの

- 物理削除
- 汎用変更履歴の差分保持
- 複雑な兼務優先順位
- 兼務比率
- 所属変更の申請 / 承認フロー
- 役職変更申請フロー

### `Employee` の項目

MVP の `Employee` は以下を持つ。

- `id`
- `tenant_id`
- `employee_number`
- `full_name`
- `display_name`
- `email`
- `birth_date`
- `photo_storage_key`
- `profile_free_text`
- `is_deleted`
- `deleted_at`
- `created_at`
- `updated_at`
- `updated_by`

補足:

- `Employee ID` は内部の不変 ID とする
- `employee_number` は業務表示用の文字列とする
- `employee_number` 未設定時はプレースホルダ番号を自動付与する
- 顔写真本体は DB に持たず、参照情報のみを持つ
- 在籍状態は `Employee` に持たず、`Employment` 側を正本とする

### `Employee` の制約

- `tenant_id + id` を内部識別の基本とする
- `tenant_id + employee_number` は一意とする
- `email` は連絡先として持つが、ログイン識別子の正本ではない
- `is_deleted = true` の場合は `deleted_at` を必須とする
- 論理削除後もレコードは保持する

### 社員番号ルール

- 既存番号がある場合はその値を優先する
- 未設定時はプレースホルダ番号を自動付与する
- 接頭辞は `TEMP / CONT / EXT` を使う
- `employee_number` は数値ではなく文字列として扱う

### `Employment` の項目

MVP の `Employment` は以下を持つ。

- `id`
- `tenant_id`
- `employee_id`
- `organization_id`
- `position_master_id`
- `employment_type`
- `is_primary_assignment`
- `manager_employee_id`
- `start_date`
- `end_date`
- `status`
- `created_at`
- `updated_at`
- `updated_by`

### `Employment` の基本ルール

- 1 人の社員は複数の `Employment` を持てる
- `is_primary_assignment = true` は同一社員で同時点に 1 件だけ許可する
- 主所属以外は `兼務` として扱う
- 上長の正本は `Employment.manager_employee_id` とする
- 所属変更や兼務変更は、現在有効な所属情報を正しく保つことを優先する
- 過去の所属履歴は、必要な場合に管理補助情報として残せる形にする
- 過去の所属履歴には、少なくとも `organization_id`, `organization_name_snapshot`, `start_date`, `end_date` を残せる形を第一候補とする

### `Employment` の制約

- `employee_id`, `organization_id`, `manager_employee_id` は同一 `tenant_id` 内のみ許可する
- `start_date <= end_date` を満たす
- 同一社員に有効な主所属は 1 件だけ許可する
- 同一社員が同一組織に対して、有効期間が重複する `Employment` を重複登録しない
- `manager_employee_id` は原則として同一テナントの有効社員を参照する

### 主所属 / 兼務の扱い

- 主所属は、社員一覧の代表所属、組織図の代表表示、権限判定の基本所属として使う
- 兼務は組織図表示と組織詳細表示には含める
- 兼務を理由に閲覧範囲を広げない
- 兼務表示の ON / OFF は全社設定で切り替える前提を維持する

### 在籍状態の扱い

- 在籍状態の正本は `Employment.status` とする
- 在籍状態の実装値は `NOT NULL` の数値コードを前提とする
- `Employee` に在籍状態の独立カラムは持たない
- MVP では、社員の現在在籍状態は「有効な主所属 `Employment`」から判断する
- 通常の社員一覧、社員詳細、組織図の既定表示は `在職中` を中心にし、`退職` と `休職` は在籍状態で通常画面から外す
- `退職` または `休職` へ変更した時点で、対応する `UserAccount` はログイン不可にする
- `退職` または `休職` へ変更した時点で、既存セッションも即時失効させる
- 復帰時の `UserAccount` 再有効化は明示操作で行う
- 復帰時の所属は自動復元せず、`HR_ADMIN` が明示的に再設定する
- 退職や離任でも `Employee` は物理削除せず、履歴を残す
- 業務実績の履歴は `Employment` ではなく `WorkHistory` を主に参照する

### 論理削除ルール

- 論理削除の正本は `Employee.is_deleted` と `deleted_at` とする
- 論理削除前に、有効な `Employment` は論理削除用の `削除` 状態へ整える
- 論理削除時に `退職` や `休職` の状態値は使わない
- 論理削除社員は通常一覧から除外する
- `ORG_ADMIN` は論理削除社員の閲覧 / 復元を行える
- 復元時は `Employee` の論理削除解除のみ行い、所属復元は別操作として扱う
- 論理削除は退職管理の主手段ではなく、誤登録や無効化の例外用途として残す方向で後続設計する

### 役職と雇用区分の扱い

- 役職の正本は `Employment.position_master_id` とする
- 雇用区分の正本は `Employment.employment_type` とする
- 役職変更、雇用区分変更、所属変更、兼務変更、在籍状態変更は `HR_ADMIN` の本更新とする

### 更新主体

- `HR_ADMIN` は `Employee` と `Employment` の本更新を行える
- `HR_ADMIN` は `退職` / `休職` の在籍状態変更を行える
- `MANAGER` は MVP では `profile_free_text`、顔写真、`Manager Employee ID` の補助更新のみ行える
- `HR_ADMIN` は論理削除社員の閲覧 / 復元を行える
- `ORG_ADMIN` は論理削除社員の閲覧 / 復元を行えるが、本更新主体にはしない
- `MANAGER` は `退職` / `休職` の在籍状態変更も論理削除 / 復元も行えない
- `EXECUTIVE_VIEWER` と `EMPLOYEE` は本更新を行わない

### API の第一候補

MVP では以下を第一候補とする。

- 社員一覧取得
- 社員詳細取得
- 在籍終了者一覧取得
- 在籍終了者詳細取得
- 社員登録
- 社員基本情報更新
- 所属一覧取得
- 所属追加
- 所属終了
- 主所属切替
- 上長更新
- 論理削除社員一覧取得
- 論理削除社員詳細取得
- 論理削除社員復元

### API の振る舞い

- 登録 / 更新 / 論理削除 / 復元は `AuthorizationService` を必ず通す
- 他テナントの社員 ID、組織 ID、上長 ID を指定した場合は拒否する
- 社員詳細では、基本属性に加えて現在の主所属、兼務一覧、上長、論理削除状態を返せる形を第一候補とする
- 論理削除社員詳細でも、過去所属履歴は引き続き参照できる形を第一候補とする
- `MANAGER` と `ORG_ADMIN` には、必要に応じて過去の所属履歴も補助情報として返せる形を許容する
- 一覧の既定表示は主所属ベースとする
- 在籍終了者は通常一覧や組織図とは分離し、専用一覧から参照する
- 在籍終了者一覧は、既存画面の権限別メニュー追加から到達できる前提とする
- 在籍終了者一覧の閲覧は `HR_ADMIN` と `ORG_ADMIN` に許可する
- 在籍終了者一覧は `退職` と `休職` を同じ一覧で扱い、`status` による絞り込みで見分ける
- 論理削除社員一覧は通常一覧と分離する
- UI 上は `退職`, `休職`, `論理削除` を明確に区別して扱う

### エラー方針

- 他テナント参照、主所属重複、期間重複、無効組織指定は業務エラーとして扱う
- 想定外障害とはログ上で区別できるようにする
- 管理者が判別しやすいよう、`employee_id`, `organization_id`, `manager_employee_id`, `tenant_id`, 操作種別をログへ残す

## 検討した選択肢

### 1. `Employee` に所属や在籍状態も集約する

利点:

- 実装が軽い
- 一覧取得が単純

欠点:

- 兼務に弱い
- 履歴に弱い
- 権限境界が崩れやすい

### 2. `Employee` と `Employment` を分ける

利点:

- 主所属 / 兼務を自然に表現できる
- 所属履歴を扱いやすい
- 将来拡張に強い

欠点:

- CRUD が一段複雑になる
- 一覧取得で結合が増える

現時点では `2` を採用する。

## Open Questions

- `email` を MVP 必須にするか
- 主所属切替を単独 API にするか、所属更新 API に含めるか
- 現時点で管理している未決論点はない

## 次に決めること

- 実装前に必要な技術設計
