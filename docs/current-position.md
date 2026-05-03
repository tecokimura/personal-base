# Current Position

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-05-03 (MVP 完了)

## この 1 枚で見ること

この文書は、`最終ゴール`、`今のフェーズ`、`現在の着手単位`、`次の 1 手` を一目で把握するための進行管理メモである。

詳細設計や個別論点の正本は各リンク先を参照し、この文書では迷わないための最小情報だけを扱う。

## いまどこにいるか

| 項目 | 現在地 |
|---|---|
| 最終ゴール | タレントマネジメントサービスをベータ到達可能な形で作る |
| 直近ゴール | `MVP` の中核である `社員台帳と組織図の一元管理` を成立させる |
| 現在フェーズ | `フェーズ 1. MVP 設計確定` と `MVP` 実装を完了 |
| 現在マイルストーン | `M2. 実装開始可能な設計一式` 到達 |
| 現在の着手単位 | `MVP 完了` |
| 現在の実装開始点 | `ベータ運用に必要な管理機能` 完了後 |
| 次の具体作業 | `第 2 フェーズ` の着手順と優先順位を確認する |

## ゴールから現在地まで

```text
最終ゴール
  Talent Management Platform をベータ到達可能な形で作る
    ↓
直近ゴール
  MVP の中核である 社員台帳と組織図の一元管理 を成立させる
    ↓
現在のマイルストーン
  M2. 実装開始可能な設計一式 到達
    ↓
現在の着手単位
  MVP 完了
    ↓
現在の作業地点
  実装タスク `1` から `12` の完了を再確認済み
  `MVP 完了条件` の最終確認で追加の実装修正タスクなしと判断済み
    ↓
次の 1 手
  `第 2 フェーズ` の着手順を確認する
```

## フェーズ進行の見取り図

| フェーズ | 目的 | 状態 |
|---|---|---|
| フェーズ 0 | 設計ルールと文書運用を整える | Done |
| フェーズ 1 | `MVP` を実装開始できるまで設計を固め、MVP を成立させる | Done |
| フェーズ 2 | ベータ拡張の設計を整理する | In Progress |
| フェーズ 3 | 将来拡張の設計余地を整理する | Not Started |

## MVP 実装順の中での現在地

| 順番 | 着手単位 | 状態 |
|---|---|---|
| 1 | 認証・認可の土台 | Done |
| 2 | 組織管理 | Done |
| 3 | 社員台帳管理 | Done |
| 4 | 組織図表示 | Done |
| 5 | 権限制御を反映した閲覧境界 | Done |
| 6 | 顔写真と `profile_free_text` | Done |
| 7 | 論理削除と履歴の最小対応 | Done |
| 8 | CSV 取込 / 出力 | Done |
| 9 | バリデーションとエラーハンドリング | Done |
| 10 | 更新メタ情報と最低限の監査導線 | Done |
| 11 | テストと初期運用導線 | Done |
| 12 | ベータ運用に必要な管理機能 | Done |

## 認証・認可基盤の中での現在地

| ステップ | 状態 |
|---|---|
| `UserAccount / Session / RoleAssignment` のデータモデル整理 | Done |
| ログイン / ログアウト / セッション検証の仕様整理 | Done |
| ロール方針、状態遷移、最小 API / DTO 整理 | Done |
| `Employee` 最小モデル追加 | Done |
| `UserAccount.employeeId -> Employee.id` relation 反映 | Done |
| 初回 migration 作成 | Done |
| repository / service 基盤作成 | Done |
| ログイン / ログアウト / セッション検証 API | Done |
| AuthorizationService とロール判定基盤 | Done |
| 初回 HR_ADMIN 作成コマンド・管理 API・テスト | Done |

## 直近で迷ったらここを見る

- 全体のフェーズとマイルストーン: [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装順の正本: [implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 現在までの判断要約: [project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 未決事項の正本: [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- 再開手順: [prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)

## 更新ルール

- `現在フェーズ`、`現在マイルストーン`、`現在の着手単位` が変わったら更新する
- 実装が 1 ステップ進んだら `認証・認可基盤の中での現在地` を更新する
- 実装結果で設計の正本に差分が出た場合は、まず `security.md` や該当設計文書を更新する
- 詳細な判断はこの文書へ書き足さず、正本の設計文書または `ADR` に反映する
