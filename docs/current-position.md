# Current Position

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-24

## この 1 枚で見ること

この文書は、`最終ゴール`、`今のフェーズ`、`現在の着手単位`、`次の 1 手` を一目で把握するための進行管理メモである。

詳細設計や個別論点の正本は各リンク先を参照し、この文書では迷わないための最小情報だけを扱う。

## いまどこにいるか

| 項目 | 現在地 |
|---|---|
| 最終ゴール | タレントマネジメントサービスをベータ到達可能な形で作る |
| 直近ゴール | `MVP` の中核である `社員台帳と組織図の一元管理` を実装開始できる状態にする |
| 現在フェーズ | `フェーズ 1. MVP 設計確定` の終盤から `実装着手` へ移行中 |
| 現在マイルストーン | `M2. 実装開始可能な設計一式` |
| 現在の着手単位 | `認証・認可基盤` |
| 現在の実装開始点 | `Prisma schema` の拡張 |
| 次の具体作業 | `Employee` の最小 Prisma モデル追加と `UserAccount.employeeId -> Employee.id` relation 反映 |

## ゴールから現在地まで

```text
最終ゴール
  Talent Management Platform をベータ到達可能な形で作る
    ↓
直近ゴール
  MVP の中核である 社員台帳と組織図の一元管理 を成立させる
    ↓
現在のマイルストーン
  M2. 実装開始可能な設計一式
    ↓
現在の着手単位
  1. 認証・認可基盤
    ↓
現在の作業地点
  Prisma schema の実装を進める段階
    ↓
次の 1 手
  Employee モデル追加 -> UserAccount relation 反映 -> 初回 migration
```

## フェーズ進行の見取り図

| フェーズ | 目的 | 状態 |
|---|---|---|
| フェーズ 0 | 設計ルールと文書運用を整える | Done |
| フェーズ 1 | `MVP` を実装開始できるまで設計を固める | In Progress |
| フェーズ 2 | ベータ拡張の設計を整理する | Not Started |
| フェーズ 3 | 将来拡張の設計余地を整理する | Not Started |

## MVP 実装順の中での現在地

| 順番 | 着手単位 | 状態 |
|---|---|---|
| 1 | 認証・認可の土台 | In Progress |
| 2 | 組織と社員台帳の基本 CRUD | Not Started |
| 3 | 組織図表示 | Not Started |
| 4 | 権限制御を反映した閲覧境界 | Not Started |
| 5 | 顔写真と `profile_free_text` | Not Started |
| 6 | 論理削除と履歴の最小対応 | Not Started |
| 7 | CSV 取込 / 出力 | Not Started |
| 8 | バリデーションとエラーハンドリング | Not Started |
| 9 | 更新メタ情報と最低限の監査導線 | Not Started |
| 10 | テストと初期運用導線 | Not Started |
| 11 | ベータ運用に必要な管理機能 | Not Started |

## 認証・認可基盤の中での現在地

| ステップ | 状態 |
|---|---|
| `UserAccount / Session / RoleAssignment` のデータモデル整理 | Done |
| ログイン / ログアウト / セッション検証の仕様整理 | Done |
| ロール方針、状態遷移、最小 API / DTO 整理 | Done |
| `Employee` 最小モデル追加 | Next |
| `UserAccount.employeeId -> Employee.id` relation 反映 | Next |
| 初回 migration 作成 | After Next |
| repository / service 基盤作成 | Later |

## 直近で迷ったらここを見る

- 全体のフェーズとマイルストーン: [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装順の正本: [implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 現在までの判断要約: [project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 未決事項の正本: [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- 再開手順: [prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)

## 更新ルール

- `現在フェーズ`、`現在マイルストーン`、`現在の着手単位` が変わったら更新する
- 実装が 1 ステップ進んだら `認証・認可基盤の中での現在地` を更新する
- 詳細な判断はこの文書へ書き足さず、正本の設計文書または `ADR` に反映する
