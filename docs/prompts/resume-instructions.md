# Resume Instructions

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-17

## 目的

セッションが切れた後に、Codex がこのプロジェクトの設計作業を迷わず再開できるようにする。

## ユーザーが Codex に伝える再開指示

次回のセッション開始時、Keith は Codex に以下のように指示する。

`README.md を読んで対応を再開してください。`

必要に応じて、次も許可する。

`README.md と docs/README.md を読んで、未完了の設計作業を再開してください。`

## Codex が再開時に行うこと

1. `README.md` を読む
2. `docs/project-status.md` を読む
3. `docs/prompts/collaboration-rules.md` を読み、意思決定境界を確認する
4. `docs/README.md` を読む
5. 直近で確定済みの内容を `docs/product/vision.md`、`docs/product/target-users.md`、`docs/product/core-usecases.md`、`docs/product/domain-model.md` で確認する
6. `README.md` の「次に着手すべき論点」から、現在の次ステップを特定する
7. 選択が必要な論点であれば、選択肢を整理して Keith に確認する
8. 確定済み内容は文書へ反映し、`README.md` の現在地を必要に応じて更新する

## 現在の再開ポイント

現時点の次論点は `権限スコープの最小単位` である。

理由:

- `vision.md`、`target-users.md`、`core-usecases.md`、`domain-model.md` の主要方針は整理済み
- MVP は `社員台帳と組織図の一元管理` に絞られている
- 兼務ルールと対象データ項目の大枠は整理済み
- 次に、誰がどこまで見えるかを決める `権限スコープ` を定義する必要がある

## 再開時の注意

- Codex は、未確認の選択肢を確定事項として書かない
- スコープ、優先順位、方針選択は必ず Keith に確認する
- まずはベータ到達を優先する方針を維持する
- 中断後は、まず `docs/project-status.md` で現状を把握してから詳細文書へ入る
