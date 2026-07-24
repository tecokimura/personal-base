# Current Position

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-06-29 (Phase 3 後半・レビュアー向けブリーフィング後)

## この 1 枚で見ること

この文書は、`最終ゴール`、`今のフェーズ`、`現在の着手単位`、`次の 1 手` を一目で把握するための進行管理メモである。

詳細設計や個別論点の正本は各リンク先を参照し、この文書では迷わないための最小情報だけを扱う。

## いまどこにいるか

| 項目 | 現在地 |
|---|---|
| 最終ゴール | タレントマネジメントサービスをベータ到達可能な形で作る |
| 直近ゴール | Phase 3 残件（PMO-97〜105）を消化し、フェーズ 4 移行の判断をする |
| 現在フェーズ | `フェーズ 3. サービス利用性強化`（後半） |
| 現在マイルストーン | Phase 3 初期課題完了済み、追加課題（PMO-97〜105）を実装中 |
| 現在の着手単位 | Backlog の `実装待ち` カテゴリを参照（正本は Backlog） |
| 現在の実装ブランチ | `feat/phase3`（PMO-106・107・108・109 はマージ済み） |
| 次の具体作業 | Backlog の `実装待ち` 課題を `claude-auto` で順次実装する |

## ゴールから現在地まで

```text
最終ゴール
  Talent Management Platform をベータ到達可能な形で作る
    ↓
直近ゴール
  フェーズ 3 残件を消化し、フェーズ 4（AI拡張）移行の判断をする
    ↓
現在のマイルストーン
  Phase 3 初期課題完了、追加課題を実装中
    ↓
フェーズ 2.5（完了）
  1. PMO-66〜80 の動作確認・差分修正 → すべて完了
  2. 完了済み主要課題: PMO-71（組織図改善）、PMO-72〜73（表示名・在籍判定）、
     PMO-74〜80（社員追加・基本情報編集・所属UI・組織図・論理削除）
    ↓
フェーズ 3（進行中）
  完了済み: PMO-84・87・88・89・90・91・92・93・94・95・96・100・105・106・107・108・109
  残件: Backlog の `実装待ち` カテゴリを参照
    ↓
次の 1 手
  cron（claude-auto）を再開し、PMO-97 から順次実装する
```

## フェーズ進行の見取り図

| フェーズ | 目的 | 状態 |
|---|---|---|
| フェーズ 0 | 設計ルールと文書運用を整える | Done |
| フェーズ 1 | `MVP` を実装開始できるまで設計を固め、MVP を成立させる | Done |
| フェーズ 2 | 最小フロント、監査 API、`WorkHistory` を含むベータ拡張を整理する | Done |
| フェーズ 2.5 | 動作確認・差分修正・Phase 3 決定 | Done |
| フェーズ 3 | AI なしでサービス利用性を高める拡張（PMO-84〜109） | In Progress |
| フェーズ 4 | AI を使った検索、要約、助言を整理する | Not Started |

## フェーズ 3 課題状況

### 完了済み

| 課題 | 内容 |
|---|---|
| PMO-84 | デバッグ機能（権限別ワンボタンログイン） |
| PMO-87 | テナントID入力の廃止（URL のサブドメイン/環境変数で自動判別） |
| PMO-88 | メニューのリンク整理（組織図・社員一覧へのナビ改善） |
| PMO-89 | 2FA設定（TOTP・QRコード認証） |
| PMO-90 | ダッシュボードにテナント名・社員名を表示 |
| PMO-91 | 左メニューを権限ごとに整理（一般/Manager/Admin で表示切替） |
| PMO-92 | 自分のプロフィールへのショートカットをメニューに追加 |
| PMO-93 | UIライブラリ調査 → shadcn/ui の採用決定 |
| PMO-94 | 資格情報管理機能の追加 |
| PMO-95 | 管理者設定プロフィール項目の追加 |
| PMO-96 | EmployeeAdminSection の Prisma マイグレーション実行 |
| PMO-100 | Tailwind CSS + shadcn/ui のインストール・設定 |
| PMO-106 | ログイン直後のメニューフラッシュ問題の修正 |
| PMO-107 | ログインページを shadcn/ui コンポーネントで再実装 |
| PMO-108 | 社員一覧に「削除済み社員」へのリンクを追加（テーブル右下に配置） |
| PMO-109 | サイドバーメニューに組織図ページへのリンクを追加 |

### 残件

課題ごとのステータスは Backlog プロジェクト `PMO_PJPERSONALBASE` のカテゴリ `実装待ち` が正本。docs には持たない。

### フェーズ 3 スコープ外・判断中

| 課題 | 内容 | 状態 |
|---|---|---|
| PMO-85 | 社員一覧を写真リスト形式へ改善 | 仕様確定待ち |
| PMO-70 | 管理者による社員ユーザーアカウント発行機能 | フェーズ 3 後半候補 |
| PMO-86 | スキルシート画面 | フェーズ 4 候補として保留 |

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

## 方向性すり合わせ中の論点（2026-06-29 時点）

レビュアーとのブリーフィングで話し合い中の論点。詳細は [docs/review-briefing.md](/home/keith/Documents/projects/personal-base/docs/review-briefing.md) を参照。

1. フェーズ 3 残件消化後にフェーズ 4（AI拡張）に進むか、PMO-85（写真リスト）・PMO-70（アカウント発行）を先にやるか
2. 「誰かに見せられるデモ状態」の基準をどこに置くか
3. フェーズ 4（AI拡張）の優先度・タイミング

## 直近で迷ったらここを見る

- 全体のフェーズとマイルストーン: [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装順の正本: [implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 現在までの判断要約: [project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 未決事項の正本: [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- 再開手順: [prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)
- レビュアー向けブリーフィング: [review-briefing.md](/home/keith/Documents/projects/personal-base/docs/review-briefing.md)

## 更新ルール

- `現在フェーズ`、`現在マイルストーン`、`現在の着手単位` が変わったら更新する
- 実装が 1 ステップ進んだら課題状況テーブルを更新する
- 実装結果で設計の正本に差分が出た場合は、まず `security.md` や該当設計文書を更新する
- 詳細な判断はこの文書へ書き足さず、正本の設計文書または `ADR` に反映する
