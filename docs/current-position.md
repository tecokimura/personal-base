# Current Position

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-06-08 (Phase 3 着手開始)

## この 1 枚で見ること

この文書は、`最終ゴール`、`今のフェーズ`、`現在の着手単位`、`次の 1 手` を一目で把握するための進行管理メモである。

詳細設計や個別論点の正本は各リンク先を参照し、この文書では迷わないための最小情報だけを扱う。

## いまどこにいるか

| 項目 | 現在地 |
|---|---|
| 最終ゴール | タレントマネジメントサービスをベータ到達可能な形で作る |
| 直近ゴール | Phase 3 課題（PMO-84〜95）を順次実装し、サービス利用性を高める |
| 現在フェーズ | `フェーズ 3. サービス利用性強化` |
| 現在マイルストーン | Phase 3 着手開始 |
| 現在の着手単位 | PMO-84（デバッグ機能）・PMO-88（メニュー整理）・PMO-90（ダッシュボード）・PMO-92（プロフィールリンク）が実装待ち |
| 現在の実装開始点 | feat/phase3 ブランチ（develop から作成済み） |
| 次の具体作業 | パイプライン（claude-auto）を再開し、実装待ち課題を実装する |

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
フェーズ 2.5（完了）
  1. PMO-66〜80 の動作確認・差分修正 → すべて完了
  2. 完了済み主要課題: PMO-71（組織図改善）、PMO-72〜73（表示名・在籍判定）、
     PMO-74〜80（社員追加・基本情報編集・所属UI・組織図・論理削除）
    ↓
フェーズ 3（進行中）
  PMO-83 で合意した 12 課題を PMO-84〜95 として起票済み
  実装待ち: PMO-84・88・90・92
  仕様確認待ち: PMO-86・87・89・91・94・95
  調査: PMO-93（UIライブラリ）
    ↓
次の 1 手
  claude-auto パイプラインを再開し、実装待ち課題から順次実装する
```

## フェーズ進行の見取り図

| フェーズ | 目的 | 状態 |
|---|---|---|
| フェーズ 0 | 設計ルールと文書運用を整える | Done |
| フェーズ 1 | `MVP` を実装開始できるまで設計を固め、MVP を成立させる | Done |
| フェーズ 2 | 最小フロント、監査 API、`WorkHistory` を含むベータ拡張を整理する | Done |
| フェーズ 2.5 | 動作確認・差分修正・Phase 3 決定 | Done |
| フェーズ 3 | AI なしでサービス利用性を高める拡張（PMO-84〜95） | In Progress |
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
