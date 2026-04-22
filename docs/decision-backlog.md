# Decision Backlog

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-22

## 目的

未決の論点を 1 か所に集約し、次に何を決めるかを迷わないようにする。

同じ論点を別文書で何度も往復しないために、再開時はまずこの一覧を確認する。

## 現在の決定待ち課題

### 1. `WorkHistory` の公開範囲を確定する

決めること:

- `EMPLOYEE` にどこまで原文を見せるか
- `MANAGER` にどの組織範囲まで原文を見せるか
- `ORG_ADMIN` を `WorkHistory` 閲覧主体に含めるか
- 論理削除社員の `WorkHistory` を誰まで見せるか

現時点の有力案:

- `本人`: 全件原文閲覧可
- `HR_ADMIN`: 全件原文閲覧可
- `MANAGER`: `ORGANIZATION_TREE` 配下の原文閲覧可
- `EMPLOYEE`: 主所属が同じ同僚の原文閲覧可
- `ORG_ADMIN`: `WorkHistory` 専用権限は持たず、必要なら別ロールで扱う

反映先:

- `docs/architecture/tenancy-and-permissions.md`
- `docs/product/requirements.md`
- `docs/project-status.md`

### 2. `WorkHistory` の第 2 フェーズ最小項目を画面イメージと照らして最終確認する

決めること:

- 現時点の最小項目で入力画面と一覧表示が成立するか
- `project_code` を任意項目として残すか
- `updated_by`, `updated_at` を UI で見せるか、内部保持だけにするか

現時点の有力案:

- 必須寄り:
  - `employee_id`
  - `year_month_from`
  - `year_month_to`
  - `is_current`
  - `work_summary`
  - `tech_stack_or_tools`
  - `role_name`
  - `team_size`
  - `updated_by`
  - `updated_at`
- 任意:
  - `project_code`
- 第 2 フェーズでは外す:
  - `organization_name_snapshot`
  - `visibility_scope`
  - `sort_order`
  - `created_by`

反映先:

- `docs/product/domain-model.md`
- `docs/product/requirements.md`
- `docs/project-status.md`

### 3. 初期の外部システム一覧を確定する

決めること:

- 初期の外部依存をどこまで持つか
- 初期構成に必須なものと、将来追加候補をどう分けるか

現時点の有力案:

- 初期の第一候補:
  - ローカルファイル保存
  - CSV 取込 / CSV 出力
- 将来追加候補:
  - 外部 IdP / SSO
  - 別サーバ or `S3` 互換ストレージ
  - HRIS 連携
  - AI 要約基盤
  - 専用検索基盤
  - メール送信基盤

反映先:

- `docs/architecture/system-context.md`
- `docs/project-status.md`
- `docs/roadmap.md`

### 4. `WorkHistory` の AI サマリを第 3 フェーズ以降のどこで扱うかを決める

決めること:

- 第 3 フェーズの前半で扱うか、さらに後ろへ送るか
- AI サマリ導入の前提条件を何にするか

現時点の前提:

- `MVP` と `第 2 フェーズ` では必須にしない
- 表示順と文字数の推奨値は整理済み

反映先:

- `docs/roadmap.md`
- `docs/project-status.md`
- `docs/prompts/resume-instructions.md`

### 5. 完成後フェーズの AI 機能の優先順位を整理する

決めること:

- `AI アドバイス文`
- `AI 相談チャット`
- `AI 検索 / 推薦`

のどれを先に扱うか

現時点の前提:

- いずれも `MVP` と `第 2 フェーズ` の対象外

反映先:

- `docs/roadmap.md`
- `docs/project-status.md`

## 次に着手する推奨順

1. `WorkHistory` の公開範囲
2. `WorkHistory` の第 2 フェーズ最小項目の最終確認
3. 初期の外部システム一覧
4. `WorkHistory` の AI サマリ導入タイミング
5. 完成後フェーズの AI 機能優先順位

## 再開時の使い方

- まずこの文書を見て、次に決める課題を 1 つ選ぶ
- その課題だけを会話で確定する
- 確定後、対応する文書へ反映し、この一覧から削除または更新する
