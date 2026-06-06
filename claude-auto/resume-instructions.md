# Resume Instructions

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-29

## 目的

セッションが切れた後に、Codex がこのプロジェクトの設計作業を迷わず再開できるようにする。

## ユーザーが Codex に伝える再開指示

次回のセッション開始時、Keith は Codex に以下のように指示する。

`README.md を読んで対応を再開してください。`

必要に応じて、次も許可する。

`README.md と docs/README.md を読んで、未完了の設計作業を再開してください。`

## Codex が再開時に行うこと

1. `README.md` を読む
2. `docs/README.md` を読む
3. `docs/current-position.md` を読む
4. `docs/project-status.md` を読む
5. `docs/decision-backlog.md` を読む
6. `docs/implementation-plan.md` を読む
7. `docs/prompts/collaboration-rules.md` を読み、意思決定境界を確認する
8. `docs/prompts/backlog-operation-rules.md` を読み、Backlog の扱いを確認する
9. `docs/current-position.md` と `docs/project-status.md` から、現在の着手単位と次の 1 手を特定する
10. Backlog を触る必要がある場合は、`PMO_PJPERSONALBASE` だけを対象にする
11. 論点が曖昧な場合は、確定事項にするか残タスクにするかを Keith に確認する
12. 選択が必要な論点であれば、選択肢を整理して Keith に確認する
13. 確定済み内容は文書へ反映し、`README.md`、`docs/current-position.md`、`docs/project-status.md`、`docs/decision-backlog.md`、`docs/implementation-plan.md` を必要に応じて更新する

## 現在の再開ポイント

現時点の次論点は、`プロフィール機能` の実装準備を進め、`顔写真` と `profile_free_text` の MVP 範囲を確認して着手条件を固めることである。

理由:

- `認証・認可基盤`、`組織管理`、`社員台帳管理`、`組織図表示`、`閲覧権限制御` は完了済み
- `MVP` の完了率は概算 `40%前後` と見ている
- 次の着手単位は `プロフィール機能` である
- `顔写真` は MVP に含めるが、保存・運用詳細は実装中に過不足が出たら `docs` 正本へ反映する
- `profile_free_text` は MVP に含める方向で整理済みであり、本人に加えて `HR_ADMIN` と `MANAGER` が補助更新できる前提である
- `profile_free_text` の Markdown は第 2 フェーズ以降へ送る
- `MANAGER` の補助更新、在籍終了者一覧 API、`PositionMaster`、生年月日表示範囲、本人公開範囲設定、更新メタ情報表示、`AI 検索 / 推薦` の着手方針は、今すぐのブロッカーではない
- 上記の後続論点は Backlog の `PMO_PJPERSONALBASE-24` に整理済みである
- Backlog を使う場合は `PMO_PJPERSONALBASE` だけを対象にする
- `docs` と Backlog が矛盾したら `docs` を優先する
- 直近で迷ったら、まず `docs/current-position.md` と `docs/project-status.md` を見る

## 再開時の注意

- Codex は、未確認の選択肢を確定事項として書かない
- スコープ、優先順位、方針選択は必ず Keith に確認する
- まずはベータ到達を優先する方針を維持する
- 中断後は、まず `docs/project-status.md` で現状を把握してから詳細文書へ入る
- Backlog 上で状態更新やコメントを入れる場合も、正本更新の必要性を先に確認する
