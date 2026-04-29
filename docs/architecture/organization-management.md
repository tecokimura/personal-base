# Organization Management

- Status: In Review
- Owner: Keith / Codex
- Last Updated: 2026-04-29

## 目的

`組織管理` の MVP 詳細設計を定義し、`Organization` と `OrganizationLeader` の責務、データ項目、更新ルール、API 範囲を固定する。

## 背景

`組織図表示`、`Employment`、`RBAC + 組織スコープ` はすべて組織データを前提にする。

`組織管理` の設計が曖昧なまま先へ進むと、親子関係、表示順、部門長 / 副部門長の履歴、無効化ルールが後からぶれやすい。

## 前提

- MVP の中心ユースケースは `社員台帳と組織図の一元管理`
- `Organization` は組織図のノードを表す
- `OrganizationLeader` は部門長 / 副部門長を表す別関係エンティティとする
- `Employment` は組織所属と主所属 / 兼務を表す別エンティティとする
- `tenant_id` は全主要テーブルに持ち、他テナント越境を許可しない
- `OrganizationLeader` は履歴前提で扱う
- MVP では `HR_ADMIN` を本更新主体とし、`ORG_ADMIN` は組織運用補助にとどめる
- `organization_code` は MVP では任意項目として扱う

## 決定事項

### モジュール責務

- `organization-management` モジュールは `Organization` と `OrganizationLeader` を責務範囲とする
- `Employment` の所属変更、主所属 / 兼務、上長は `employment-management` 側で扱う
- 組織スコープ判定に必要な組織ツリー参照は `organization-management` が正本を提供し、認可判定は `authorization` が行う

### MVP の対象

- 組織の登録
- 組織の更新
- 組織一覧 / 詳細の取得
- 親子組織の階層構造の取得
- 部門長 / 副部門長の登録 / 終了
- 部門長 / 副部門長の履歴保持
- 組織の有効 / 無効管理

### MVP では持たないもの

- 組織の物理削除
- 組織統合や大規模組織再編の専用フロー
- コストセンター、拠点情報、組織説明
- 組織ごとの個別設定画面

### `Organization` の項目

MVP の `Organization` は以下を持つ。

- `id`
- `tenant_id`
- `organization_name`
- `organization_code`
- `parent_organization_id`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`
- `updated_by`

補足:

- `organization_code` は MVP では `あると望ましい` だが、初期投入や外部連携を見据えて持つ
- `organization_code` は MVP では任意項目とし、未設定を許可する
- `parent_organization_id = 0` は使わず、ルート組織は `NULL` とする
- `updated_by` は `HR_ADMIN` または許可された運用主体を保持する
- `updated_by` は MVP では `Int` 型で保持し、外部キー制約は張らずアプリケーション側で保証する

### `Organization` の制約

- `tenant_id + id` を内部識別の基本とする
- `tenant_id + organization_code` は一意とする
- `organization_code` は MVP では必須にしない
- 親組織は同一 `tenant_id` の `Organization` のみ参照できる
- 自己親子参照は禁止する
- 循環参照は禁止する
- `display_order` は同一親配下で昇順表示に使う

### 組織階層の扱い

- 組織は単一親の木構造を前提とする
- 1 組織は 0 または 1 つの親を持つ
- ルート組織は複数許可する
- 組織図表示では、`display_order` 昇順、同値時は `created_at` 昇順を第一候補とする
- 認可判定で使う `ORGANIZATION_TREE` は、この親子構造を正本として計算する

### 組織の有効 / 無効ルール

- MVP では組織を物理削除しない
- `is_active = false` により運用上の無効化を行う
- 無効組織も履歴参照では残す
- 無効化された組織は、新規所属先や新規の部門長 / 副部門長割当の対象にしない
- 既存履歴の表示では無効組織も参照可能とする
- 通常の組織一覧 / ツリー取得 API は `is_active = true` のみ返し、無効組織は専用フィルタや履歴参照で扱う

### 組織無効化の前提条件

- 配下に有効な子組織が残っている場合は無効化できない
- 主所属 / 兼務を問わず有効な `Employment` が残っている場合は無効化できない
- 有効な `OrganizationLeader` が残っている場合は、先に終了処理を行う
- `Employment` に対する無効化チェックは `社員台帳管理` フェーズで追加し、`組織管理` フェーズでは TODO として先送りする

### `OrganizationLeader` の項目

MVP の `OrganizationLeader` は以下を持つ。

- `id`
- `tenant_id`
- `organization_id`
- `employee_id`
- `leader_type`
- `is_primary_leader`
- `start_date`
- `end_date`
- `status`
- `created_at`
- `updated_at`
- `updated_by`

### `OrganizationLeader` の基本ルール

- `OrganizationLeader` は履歴前提の関係エンティティとする
- 部門長 / 副部門長の変更は既存レコード更新ではなく、終了日設定と新規追加で扱う
- `leader_type` は MVP では単純化し、表示上の意味は `部門長` と `副部門長` に寄せる
- `is_primary_leader = true` は同一組織・同一時点で 1 件だけ許可する
- 同一社員が同一組織に複数の部門長種別で入ることは MVP では避ける
- `leader_type` の数値コードは `1 = 部門長`, `2 = 副部門長` とする
- `status` の数値コードは `1 = 有効`, `2 = 終了済み` とする

### `OrganizationLeader` の制約

- `organization_id` と `employee_id` は同一 `tenant_id` 内のみ許可する
- `start_date <= end_date` を満たす
- `status = active` のレコードは `end_date = NULL` を許可する
- 同一組織に有効な `部門長` 相当の責任者は 1 件だけ許可する

### 部門長と上長の切り分け

- 部門長 / 副部門長の正本は `OrganizationLeader` とする
- 個人の直属上長の正本は `Employment.manager_employee_id` とする
- 同じ社員が両方に入ることは許可する
- 組織図では「部門長 / 副部門長」と「上長」は別の意味として扱う

### 更新主体

- `HR_ADMIN` は `Organization` と `OrganizationLeader` の本更新を行える
- `ORG_ADMIN` は MVP では組織運用補助にとどめ、本更新主体にはしない
- `ORG_ADMIN` は MVP では部門長 / 副部門長の終了操作を行えない
- `MANAGER` は `Organization` と `OrganizationLeader` の本更新主体に含めない
- `EXECUTIVE_VIEWER` と `EMPLOYEE` は更新を行わない

### API の第一候補

MVP では以下を第一候補とする。

- 組織一覧取得
- 組織詳細取得
- 組織登録
- 組織更新
- 組織無効化
- 組織ツリー取得
- 部門長 / 副部門長一覧取得
- 部門長 / 副部門長追加
- 部門長 / 副部門長終了

### API の振る舞い

- 登録 / 更新 / 無効化は `AuthorizationService` を必ず通す
- 他テナントの組織 ID、社員 ID を指定した場合は拒否する
- 組織詳細では、基本属性に加えて直下の子組織一覧と現在の部門長を返せる形を第一候補とする
- 組織ツリー取得は、組織図表示と認可判定の両方で再利用できる形を優先する
- `MANAGE_ORGANIZATION` 権限を追加し、MVP では `HR_ADMIN` のみに付与する

### エラー方針

- 循環参照、他テナント参照、無効化前提違反は業務エラーとして扱う
- 想定外障害とはログ上で区別できるようにする
- 管理者が判別しやすいよう、組織 ID、親組織 ID、`tenant_id`、操作種別をログへ残す

## 検討した選択肢

### 1. `Organization` に部門長を直接持つ

利点:

- 実装が軽い
- 組織図表示に使いやすい

欠点:

- 履歴が持ちにくい
- 複数の部門長 / 副部門長に弱い

### 2. `OrganizationLeader` を別関係で持つ

利点:

- 履歴を持ちやすい
- 部門長と副部門長を分けやすい
- 後続拡張に強い

欠点:

- 組織図参照が一段増える
- MVP としては少し重い

現時点では `2` を採用する。

## Open Questions

- `組織管理` フェーズで先送りした `Employment` 無効化チェックを `社員台帳管理` 実装時にどう統合するか
- `updated_by` を将来の監査導線で `UserAccount` 参照へ昇格させるか

## 次に決めること

- `社員台帳管理` の詳細設計
- `組織図表示` の API 形状
