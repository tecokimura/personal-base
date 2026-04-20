# Resume Instructions

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-20

## 目的

セッションが切れた後に、Codex がこのプロジェクトの設計作業を迷わず再開できるようにする。

## ユーザーが Codex に伝える再開指示

次回のセッション開始時、Keith は Codex に以下のように指示する。

`README.md を読んで対応を再開してください。`

必要に応じて、次も許可する。

`README.md と docs/README.md を読んで、未完了の設計作業を再開してください。`

## Codex が再開時に行うこと

1. `README.md` を読む
2. `docs/roadmap.md` を読む
3. `docs/project-status.md` を読む
4. `docs/prompts/collaboration-rules.md` を読み、意思決定境界を確認する
5. `docs/README.md` を読む
6. 直近で確定済みの内容を `docs/product/vision.md`、`docs/product/target-users.md`、`docs/product/core-usecases.md`、`docs/product/domain-model.md`、`docs/architecture/tenancy-and-permissions.md` で確認する
7. `README.md` と `docs/roadmap.md` の「次に着手すべき論点」から、現在の次ステップを特定する
8. 選択が必要な論点であれば、選択肢を整理して Keith に確認する
9. 確定済み内容は文書へ反映し、`README.md`、`docs/roadmap.md`、`docs/project-status.md` を必要に応じて更新する

## 現在の再開ポイント

現時点の次論点は `WorkHistory の直近表示期間の初期値と監査ログ範囲の整理` である。

理由:

- `vision.md`、`target-users.md`、`core-usecases.md`、`domain-model.md`、`tenancy-and-permissions.md` の主要方針は整理済み
- MVP は `社員台帳と組織図の一元管理` に絞られている
- 兼務ルール、権限スコープ、社員番号ルール、顔写真保存方式、履歴管理の大枠は整理済み
- 一般社員には、同一組織の同僚に対して基本情報に加えて仕事の分かる表示を持たせたい意図がある
- 兼務は別組織所属ではなく、同一組織内の役割兼任や案件兼務として扱う前提が整理済みである
- 入力方式としては、自己紹介でも業務概要でも自由に書ける単一欄 `profile_free_text` が第一候補になっている
- `profile_free_text` は MVP に含める方向で整理済みである
- `WorkHistory` は第 2 フェーズで導入し、完成形では必須機能として扱う
- `WorkHistory` が必須である理由は、社員本人が自分のこれまでの仕事や履歴を管理、確認できるようにするためである
- `WorkHistory` は本人に加えて `HR_ADMIN` と `MANAGER` が補助編集でき、同僚も閲覧できる方向で整理済みである
- `WorkHistory` は最初から `updated_by` を持つ方向で整理済みである
- 将来は、直近 `半年から 1 年` は原文表示、それ以前は AI 要約表示に寄せる構想がある
- 原文表示の直近期間は設定で変更できる方向で整理済みである
- `LoginHistory` と `EditHistory` は第 2 フェーズ前半で導入する推奨が整理済みである
- マルチテナント方式は、共有テーブル型を基本にしつつ、単一テナント専用デプロイにも対応できる方向で整理済みである
- 次は `WorkHistory` の直近表示期間の初期値、監査ログ範囲、`profile_free_text` の更新主体を詰める

## 再開時の注意

- Codex は、未確認の選択肢を確定事項として書かない
- スコープ、優先順位、方針選択は必ず Keith に確認する
- まずはベータ到達を優先する方針を維持する
- 中断後は、まず `docs/project-status.md` で現状を把握してから詳細文書へ入る
