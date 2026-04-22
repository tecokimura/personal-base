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
4. `docs/decision-backlog.md` を読む
5. `docs/prompts/collaboration-rules.md` を読み、意思決定境界を確認する
6. `docs/README.md` を読む
7. 直近で確定済みの内容を `docs/product/vision.md`、`docs/product/target-users.md`、`docs/product/core-usecases.md`、`docs/product/domain-model.md`、`docs/architecture/tenancy-and-permissions.md` で確認する
8. `docs/decision-backlog.md` の先頭課題から、現在の次ステップを特定する
9. 選択が必要な論点であれば、選択肢を整理して Keith に確認する
10. 確定済み内容は文書へ反映し、`README.md`、`docs/roadmap.md`、`docs/project-status.md`、`docs/decision-backlog.md` を必要に応じて更新する

## 現在の再開ポイント

現時点の次論点は `decision-backlog.md` の先頭課題を順に処理することである。

理由:

- `vision.md`、`target-users.md`、`core-usecases.md`、`domain-model.md`、`tenancy-and-permissions.md` の主要方針は整理済み
- MVP は `社員台帳と組織図の一元管理` に絞られている
- 兼務ルール、権限スコープ、社員番号ルール、顔写真保存方式、履歴管理の大枠は整理済み
- 一般社員には、同一組織の同僚に対して基本情報に加えて仕事の分かる表示を持たせたい意図がある
- 兼務は別組織所属ではなく、同一組織内の役割兼任や案件兼務として扱う前提が整理済みである
- 入力方式としては、自己紹介でも業務概要でも自由に書ける単一欄 `profile_free_text` が第一候補になっている
- `profile_free_text` は MVP に含める方向で整理済みである
- `profile_free_text` は本人に加えて `HR_ADMIN` と `MANAGER` が補助更新できる方向で整理済みである
- `profile_free_text` の Markdown はオプション機能として第 2 フェーズで扱う方向で整理済みである
- 第 2 フェーズの Markdown は入力保存を先に扱い、表示時のレンダリングは第 3 フェーズ以降へ送る方向で整理済みである
- `WorkHistory` は第 2 フェーズで導入し、完成形では必須機能として扱う
- `WorkHistory` が必須である理由は、社員本人が自分のこれまでの仕事や履歴を管理、確認できるようにするためである
- `WorkHistory` は本人に加えて `HR_ADMIN` と `MANAGER` が補助編集でき、同僚も閲覧できる方向で整理済みである
- `WorkHistory` は最初から `updated_by` を持つ方向で整理済みである
- `WorkHistory` の AI サマリは、本人の業務履歴要約とスキルアピール文の自動生成を目的とする方向で整理済みである
- AI サマリは本人以外にも公開してよい情報として扱う方向で整理済みである
- 同僚には、直近 `1 年 (365 日)` までは `WorkHistory` の原文をそのまま表示し、それ以前は AI サマリを表示する方向で整理済みである
- 原文表示の直近期間は設定で変更できる方向で整理済みである
- 本人、`HR_ADMIN`、`MANAGER` は、設定期間ごとのページングで `WorkHistory` の原文を全件閲覧できる方向で整理済みである
- `WorkHistory` の AI サマリは MVP や第 2 フェーズでは必須にせず、第 3 フェーズ以降の拡張候補として扱う方向で整理済みである
- `WorkHistory` の AI サマリは都度生成ではなく、登録または更新時に再生成する方向で整理済みである
- AI サマリは、履歴全体のサマリ文と、利用ツール・技術の一覧を見せる方向で整理済みである
- AI サマリの文字数は設定値で持ち、実装後に調整できる方向で整理済みである
- 初期推奨値として、キャリアサマリは `180〜280 文字`、スキルアピール文は `70〜120 文字` を目安にする方向で整理済みである
- AI サマリの表示順は、`キャリアサマリ` → `スキルアピール文` → `ツール・技術一覧` を第一候補とする方向で整理済みである
- `WorkHistory` は履歴書出力を見据え、Markdown のような自由装飾よりも構造化入力を優先する方向である
- `LoginHistory` と `EditHistory` は第 2 フェーズで導入する推奨が整理済みである
- 第 2 フェーズは、`profile_free_text` 改善、監査の最小導入、`WorkHistory` の登録・閲覧・同僚公開までを扱い、AI サマリは第 3 フェーズ以降で扱う方向で整理済みである
- `EditHistory` の対象エンティティ第一候補は `Employee`, `Employment`, `OrganizationLeader`, `WorkHistory`, `RoleAssignment` で整理済みである
- 監査ログの保存先は DB テーブルを基本としつつ、標準出力や syslog に拡張できる形で整理する方向である
- 監査ログの最小カラム案は `LoginHistory` と `EditHistory` それぞれに整理済みである
- 監査ログの保持期間第一候補は `LoginHistory = 365 日`、`EditHistory = 1825 日 (5 年)` で、設定変更可能とする方向で整理済みである
- マルチテナント方式は、共有テーブル型を基本にしつつ、単一テナント専用デプロイにも対応できる方向で整理済みである
- MVP と第 2 フェーズのアプリケーション構成は `モジュラモノリス` を第一候補とする方向で整理済みである
- 主要データストアは `PostgreSQL` を第一候補とする方向で整理済みである
- 初期の認証方式は `アプリ内認証で開始し、後で SSO を追加する方式` を第一候補とする方向で整理済みである
- `MVP` はアプリ内認証のみを第一候補とし、`第 2 フェーズ` でも SSO は必須にしない方向で整理済みである
- SSO は、顧客要件または導入運用上の必要性が明確になった時点で `第 3 フェーズ以降` の追加候補とする方向で整理済みである
- 顔写真保存は初期はローカルファイル保存を第一候補とし、将来は別サーバや `S3` 互換ストレージへ切り替え可能にする方向で整理済みである
- メール送信基盤は初期外部システムに含めず、必要になった時点で追加する方向で整理済みである
- 完成後フェーズでは、AI アドバイス文や AI 相談チャットも将来拡張候補として扱う方向である
- 次は [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md) の先頭課題から順に処理する

## 再開時の注意

- Codex は、未確認の選択肢を確定事項として書かない
- スコープ、優先順位、方針選択は必ず Keith に確認する
- まずはベータ到達を優先する方針を維持する
- 中断後は、まず `docs/project-status.md` で現状を把握してから詳細文書へ入る
