# Current Position

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-05-25 (Phase 2.5 実装待ち課題を反映)

## この 1 枚で見ること

この文書は、`最終ゴール`、`今のフェーズ`、`現在の着手単位`、`次の 1 手` を一目で把握するための進行管理メモである。

詳細設計や個別論点の正本は各リンク先を参照し、この文書では迷わないための最小情報だけを扱う。

## いまどこにいるか

| 項目 | 現在地 |
|---|---|
| 最終ゴール | タレントマネジメントサービスをベータ到達可能な形で作る |
| 直近ゴール | Phase 2 完了後の整合対応を完了し、次フェーズへ迷わず移行できる状態を保つ |
| 現在フェーズ | `フェーズ 2.5. 動作確認・差分修正・Phase 3 決定` |
| 現在マイルストーン | `Phase 2-拡張機能` 完了、2.5 フェーズ進行中 |
| 現在の着手単位 | PMO-66〜69 の動作確認（Keith 実施中） |
| 現在の実装開始点 | `PMO_PJPERSONALBASE-66` から `69` の動作確認待ち |
| 次の具体作業 | 動作確認完了 → 差分修正 → Phase 3 候補の決定 |

## ゴールから現在地まで

```text
最終ゴール
  Talent Management Platform をベータ到達可能な形で作る
    ↓
直近ゴール
  第 2 フェーズの親課題をクローズし、次フェーズへ移行できる状態を作る
    ↓
現在のマイルストーン
  Phase 2-拡張機能 完了
    ↓
フェーズ 2.5（現在）
  1. PMO-66〜69 の動作確認（Keith 実施中）
  2. 差分修正（確認で出た不整合を修正）
  3. Phase 3 候補の絞り込みと着手順の決定
    ↓
次の 1 手
  動作確認完了後、差分修正課題を整理し Phase 3 に移行する
```

## フェーズ進行の見取り図

| フェーズ | 目的 | 状態 |
|---|---|---|
| フェーズ 0 | 設計ルールと文書運用を整える | Done |
| フェーズ 1 | `MVP` を実装開始できるまで設計を固め、MVP を成立させる | Done |
| フェーズ 2 | 最小フロント、監査 API、`WorkHistory` を含むベータ拡張を整理する | Done |
| フェーズ 2.5 | 動作確認・差分修正・Phase 3 決定 | In Progress |
| フェーズ 3 | AI なしでサービス利用性を高める拡張を整理する | Not Started |
| フェーズ 4 | AI を使った検索、要約、助言を整理する | Not Started |

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

## 第 2 フェーズ着手単位の現在地

| 順番 | 着手単位 | 状態 |
|---|---|---|
| 13 | 最小フロント確認導線 | Done |
| 14 | `LoginHistory` と `EditHistory` の最小導入 | Done |
| 15 | `WorkHistory` のデータモデルと API | Done |
| 16 | `WorkHistory` の本人登録 / 更新 / 一覧表示 | Done |
| 17 | `WorkHistory` の公開範囲反映 | Done |
| 18 | `MANAGER` と `HR_ADMIN` の補助編集 | Done |
| 19 | 同僚向け `WorkHistory` 閲覧画面 | Done |
| 20 | `profile_free_text` の Markdown 入力許可 | Done |
| 21 | 第 2 フェーズ全体の監査・権限・回帰テスト | Done |

## 直近で迷ったらここを見る

- 全体のフェーズとマイルストーン: [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装順の正本: [implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 現在までの判断要約: [project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 未決事項の正本: [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- 再開手順: [prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)

## 更新ルール

- `現在フェーズ`、`現在マイルストーン`、`現在の着手単位` が変わったら更新する
- 実装が 1 ステップ進んだら `第 2 フェーズ着手単位の現在地` を更新する
- 実装結果で設計の正本に差分が出た場合は、まず `security.md` や該当設計文書を更新する
- 詳細な判断はこの文書へ書き足さず、正本の設計文書または `ADR` に反映する
