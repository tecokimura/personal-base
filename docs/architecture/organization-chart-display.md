# Organization Chart Display

- Status: Decided
- Owner: Keith / Codex
- Last Updated: 2026-04-29

## 目的

`組織図表示` の MVP 詳細設計を定義し、組織ツリー、社員表示、主所属 / 兼務、上長、部門長 / 副部門長の見せ方と API 形状を固定する。

## 背景

`組織図表示` は `Organization`、`OrganizationLeader`、`Employment`、権限制御の交点になる。

ここが曖昧だと、組織管理と社員台帳管理の両方に表示用ロジックが分散しやすい。

## 前提

- MVP の中心ユースケースは `社員台帳と組織図の一元管理`
- 組織階層の正本は `Organization.parent_organization_id`
- 部門長 / 副部門長の正本は `OrganizationLeader`
- 主所属 / 兼務 / 上長の正本は `Employment`
- 組織図の標準表示では主所属と兼務の両方を見せる
- 表示ラベルは `主所属` / `兼務` を使う
- 兼務表示は全社設定で ON / OFF を切り替える前提を維持する
- 権限制御は `AuthorizationService` を通す

## 決定事項

### 今回確定した表示範囲

- 組織図には `組織名`, `部門長`, `直属メンバー`, `子組織` を表示する
- 必要に応じて人数を表示できる前提とする
- 社員は `顔写真`, `表示名`, `役職`, `主所属 / 兼務` ラベルを表示する

### モジュール責務

- `organization-chart-display` は表示用の集約責務を持つ
- 組織の正本更新は `organization-management` が行う
- 社員と所属の正本更新は `employee-directory-management` が行う
- このモジュールは表示用 ViewModel を組み立てるが、正本データは持たない

### MVP の対象

- 組織ツリー表示
- 組織ノードごとの基本情報表示
- 部門長表示
- 社員の主所属表示
- 社員の兼務表示
- 上長表示
- 組織詳細画面でのメンバー一覧表示

### MVP では持たないもの

- 組織図のドラッグアンドドロップ編集
- 表示ノードごとの個別カスタム色分け
- 人数推移や分析表示
- 異動シミュレーション
- レイアウトの手動保存

### 表示の正本

- 組織ツリーは `Organization` から組み立てる
- 部門長 / 副部門長は有効な `OrganizationLeader` から取得する
- 社員表示は有効な `Employment` から取得する
- 主所属判定は `Employment.is_primary_assignment = true` を使う
- 上長表示は `Employment.manager_employee_id` を使う

### 組織ツリーの基本ルール

- 組織図は木構造として表示する
- ルート組織は複数許可する
- ノード順は `display_order` 昇順、同値時は `created_at` 昇順を使う
- `is_active = false` の組織は通常の組織図表示から除外する
- 過去履歴参照は MVP の対象にしない

### 組織ノードの表示項目

MVP の組織ノードは以下を持つ。

- `organization_id`
- `organization_name`
- `organization_code`
- `parent_organization_id`
- `children_count`
- `primary_leader`
- `member_count`

補足:

- `organization_code` は表示可能なら返すが、表示必須にはしない
- `member_count` は現在有効な `Employment` を対象にする

### 社員カードの表示項目

MVP の社員カードは以下を持つ。

- `employee_id`
- `employee_number`
- `display_name`
- `photo_storage_key`
- `assignment_label`
- `position_name`
- `manager_display_name`
- `primary_organization_name`

補足:

- `assignment_label` は `主所属` または `兼務`
- `manager_display_name` は該当 `Employment` の `manager_employee_id` から引く
- `primary_organization_name` は兼務表示時の補助情報として使えるようにする

### 主所属 / 兼務の表示ルール

- 組織図の標準表示では主所属と兼務の両方を見せる
- 主所属は通常表示とする
- 兼務は `assignment_label = 兼務` を付けて区別する
- 兼務表示 OFF の場合は、主所属だけを表示する
- 同一社員が複数組織に出ることを許可する
- 兼務表示の既定値は `ON` とする

補足:

- この見せ方は現時点の第一候補とする
- 実際の表示デザイン確認後に見直す前提とする

### 上長の表示ルール

- 上長は所属単位で表示する
- 主所属と兼務で異なる上長を持てる
- 上長未設定は許可し、その場合は空表示とする
- 上長は部門長 / 副部門長の代替表示にしない

補足:

- 現時点では、上長は `社員カード` 側に寄せて表示する第一候補とする
- 実際の表示デザイン確認後に見直す前提とする

### 部門長 / 副部門長の表示ルール

- 組織ノードには有効な `部門長` を表示する
- `部門長` がいない場合は空表示を許可する
- `副部門長` は MVP の標準組織図では表示必須にしない
- 組織詳細画面では部門長 / 副部門長の一覧を返せる形を優先する
- 部門長 / 副部門長は複数持てる前提とする
- ただし、標準の組織図では 1 人だけ表示し、複数いる場合は詳細画面で表示する

補足:

- 現時点では、部門長 / 副部門長は `組織ノード` 側に寄せて表示する第一候補とする
- 実際の表示デザイン確認後に見直す前提とする

### 組織詳細画面の第一候補

組織詳細画面は以下を返す。

- 組織基本情報
- 直下子組織一覧
- 現在の `部門長`
- 現在の部門長 / 副部門長一覧
- 主所属メンバー一覧
- 兼務メンバー一覧

### 一覧の表示順

- 主所属メンバーは `display_name` 昇順を第一候補とする
- 兼務メンバーも `display_name` 昇順を第一候補とする
- 部門長 / 副部門長一覧は `部門長` を優先し、その後 `display_name` 昇順とする

### API の第一候補

MVP では以下を第一候補とする。

- 組織図ルート一覧取得
- 組織ツリー取得
- 組織詳細表示取得
- 組織ノード配下メンバー取得

### API の形状方針

- 組織ツリー取得は、表示用に必要な最小ノード情報を返す
- 組織詳細表示取得は、組織情報とメンバー情報をまとめて返す
- 組織ノード配下メンバー取得は、主所属と兼務を区別して返す
- 認可判定で許可されないノードは返さない
- 実装済みの第一候補 API は `GET /org-chart/tree`, `GET /org-chart/organizations/:id`, `GET /org-chart/organizations/:id/members` とする

### 実装反映メモ

- `org-chart` は読み取り専用の集約モジュールとして実装する
- `EmployeeCard.position_name` は `PositionMaster` 未実装の間は `null` 固定で返す
- `MANAGER / ORG_ADMIN` の `ORGANIZATION_TREE` による枝刈りは `閲覧権限制御` で反映する

### 権限反映の前提

- `HR_ADMIN` は全社の組織図を閲覧できる
- `EXECUTIVE_VIEWER` は全社の組織図を閲覧できる
- `MANAGER` は `ORGANIZATION_TREE` 配下の組織図を閲覧できる
- `ORG_ADMIN` は `ORGANIZATION_TREE` 配下の組織図を閲覧できる
- `EMPLOYEE` も同一テナント内の全社組織図を閲覧できる

### エラー方針

- 他テナントの組織 ID 指定は拒否する
- 閲覧不可ノード指定は認可エラーとして扱う
- 想定外障害とはログ上で区別できるようにする
- 管理者が判別しやすいよう、`organization_id`, `tenant_id`, `actor`, 操作種別をログへ残す

## 検討した選択肢

### 1. 表示のたびに正本テーブルを都度結合する

利点:

- 実装が単純
- 初期は同期処理で済む

欠点:

- ノード数や所属数が増えると重くなりやすい

### 2. 表示用集約を専用 ViewModel として組み立てる

利点:

- API 契約を安定させやすい
- 後で最適化しやすい

欠点:

- 初期実装が一段増える

現時点では `2` を採用する。ただし、保存は正本テーブルのままとし、事前集計テーブルは持たない。

## Open Questions

- 現時点で管理している未決論点はない

## 次に決めること

- `プロフィール機能` の詳細設計
