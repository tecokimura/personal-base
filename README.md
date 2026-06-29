# Talent Management Platform Design Docs

このディレクトリは、カオナビやタレントパレットのようなタレントマネジメントサービスを設計するための作業領域です。

設計の議論が拡散しないように、`README.md` を入口にして全体像、現在地、次にやることを一目で追える構成にしています。

## 目的

- 事業要件、業務要件、プロダクト仕様、技術設計を段階的に整理する
- 検討中の仮説と、確定した意思決定を分けて蓄積する
- 後から見返しても、なぜその設計にしたのか追跡できる状態にする

## ドキュメント構成

```text
.
├── README.md
└── docs
    ├── README.md
    ├── product
    │   ├── vision.md
    │   ├── target-users.md
    │   ├── core-usecases.md
    │   ├── domain-model.md
    │   └── requirements.md
    ├── architecture
    │   ├── system-context.md
    │   ├── application-architecture.md
    │   ├── data-architecture.md
    │   ├── employee-directory-management.md
    │   ├── organization-management.md
    │   ├── organization-chart-display.md
    │   ├── tenancy-and-permissions.md
    │   └── security.md
    ├── decisions
    │   └── ADR-001-documentation-principles.md
    ├── setup
    │   └── initial-bootstrap.md
    ├── prompts
    │   ├── document-rules.md
    │   ├── collaboration-rules.md
    │   ├── resume-instructions.md
    │   └── workshop-rules.md
    └── templates
        ├── design-doc-template.md
        └── adr-template.md
```

## 現在地

| 領域 | 状態 | 説明 |
|---|---|---|
| 設計運用ルール | Done | 文書ルール、会話ルール、ADR方針を定義済み |
| 事業・プロダクトの骨子 | In Progress | Vision、Target Users、Core Use Cases の主要方針を反映済み |
| 技術設計の骨子 | In Progress | 技術検討用の章立てを作成済み |
| 詳細要件定義 | Not Started | 各ユースケースと業務フローの深掘りが必要 |
| 実装計画 | In Progress | `MVP`・`第 2 フェーズ`・`フェーズ 3` 初期課題（PMO-84・87・88・89・90・92・106・108・109）は完了済み。現在は Phase 3 追加課題（PMO-97〜104）を `feat/phase3` ブランチで実装中。PMO-105 がレビュー待ち |

## まず見る場所

- 設計の進め方: [docs/README.md](/home/keith/Documents/projects/personal-base/docs/README.md)
- 全体ゴールと現在地の一覧: [docs/current-position.md](/home/keith/Documents/projects/personal-base/docs/current-position.md)
- 文書ルール: [docs/prompts/document-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/document-rules.md)
- 役割分担ルール: [docs/prompts/collaboration-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/collaboration-rules.md)
- Backlog運用ルール: [docs/prompts/backlog-operation-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/backlog-operation-rules.md)
- プロジェクト状況サマリ: [docs/project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 決定待ち課題一覧: [docs/decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- ロードマップとマイルストーン: [docs/roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装計画: [docs/implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 初期セットアップ手順: [docs/setup/initial-bootstrap.md](/home/keith/Documents/projects/personal-base/docs/setup/initial-bootstrap.md)
- デモ環境認証情報ルール: [docs/setup/demo-credentials.md](/home/keith/Documents/projects/personal-base/docs/setup/demo-credentials.md)
- 再開手順: [docs/prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)
- レビュアー向けブリーフィング（現状共有・方向性すり合わせ用）: [docs/review-briefing.md](/home/keith/Documents/projects/personal-base/docs/review-briefing.md)
- 会話ルール: [docs/prompts/workshop-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/workshop-rules.md)
- 事業・プロダクト観点の入口: [docs/product/vision.md](/home/keith/Documents/projects/personal-base/docs/product/vision.md)
- 技術設計の入口: [docs/architecture/system-context.md](/home/keith/Documents/projects/personal-base/docs/architecture/system-context.md)
- 組織管理の詳細設計: [docs/architecture/organization-management.md](/home/keith/Documents/projects/personal-base/docs/architecture/organization-management.md)
- 社員台帳管理の詳細設計: [docs/architecture/employee-directory-management.md](/home/keith/Documents/projects/personal-base/docs/architecture/employee-directory-management.md)
- 組織図表示の詳細設計: [docs/architecture/organization-chart-display.md](/home/keith/Documents/projects/personal-base/docs/architecture/organization-chart-display.md)

## 進め方

1. `vision.md` で、誰のどの課題を解くかを定義する
2. `core-usecases.md` と `domain-model.md` で、業務とデータの中心を固める
3. `requirements.md` で、MVP範囲と非機能要件を切り出す
4. `architecture/` 配下で、システム、権限、データ、セキュリティを詰める
5. 重要な判断は `decisions/` に ADR として残す

## 次に着手すべき論点

現在は **フェーズ 3（サービス利用性強化）の後半**にいる。

### 直近の作業（次セッションで最初にやること）

1. `claude-auto` の cron を再開し、Backlog の `実装待ち` 課題を順次実装する
   - PMO-97（ダッシュボード括弧削除）→ PMO-98（ログイン画面テナント名表示）の順
   - 実装ブランチ: `feat/phase3`
2. PMO-105（バックアップコード警告バナー）のレビューが承認されたら動作確認 → マージ

### フェーズ 3 残件サマリ

| 課題 | 内容 | 状態 |
|---|---|---|
| PMO-97 | ダッシュボードから `[ID]` 括弧表記を削除 | 実装待ち |
| PMO-98 | ログイン画面にテナント名を表示 | 実装待ち |
| PMO-99 | デバッグ用シードに全権限ロールのサンプル社員追加 | 実装待ち |
| PMO-101 | マネージャー向け「管理メンバー一覧」ページ | 実装待ち |
| PMO-102 | アカウント設定：パスワード変更機能 | 実装待ち |
| PMO-103 | dev テナント・動作確認環境の整備 | 実装待ち |
| PMO-104 | Wiki のセットアップ手順を4テナント体制に更新 | 実装待ち |
| PMO-105 | バックアップコード残枚数警告バナー | レビュー待ち |

### フェーズ 3 完了済み

MVP・第2フェーズ全課題に加え、PMO-84・87・88・89・90・91・92・93・94・95・96・100・106・107・108・109 が完了済み。

### 方向性すり合わせ中の論点

- フェーズ 3 残件消化後にフェーズ 4（AI拡張）に進むか、PMO-85（写真リスト）・PMO-70（アカウント発行）を先にやるか
- 「誰かに見せられるデモ状態」の基準をどこに置くか

詳細は [docs/review-briefing.md](/home/keith/Documents/projects/personal-base/docs/review-briefing.md) を参照。

### 不変の確定事項

- `TypeScript` を使う実装では `any` を使わないことを厳守する
- Backlog の実行管理は `PMO_PJPERSONALBASE` を使い、運用ルールの正本は [docs/prompts/backlog-operation-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/backlog-operation-rules.md) とする
- 決定待ち課題は [docs/decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md) を正本とする
- 実装順の正本は [docs/implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md) とする

## 運用ルール

- 仕様の本文には「現時点の結論」を書く
- 仮説や迷いは `Open Questions` に分離する
- 重要な設計判断は ADR として残す
- 一度に複数の論点を混ぜず、1 ドキュメント 1 主題で進める
- 選択肢がある判断は、必ずあなたに確認してから確定する
- Git ブランチ運用は [docs/prompts/collaboration-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/collaboration-rules.md) の `Git ブランチ運用ルール` を正本とする

## 更新の仕方

- 新しい設計論点を始めるときは、先に `docs/templates/design-doc-template.md` をコピーして作る
- 大きな方針決定をしたときは、`docs/templates/adr-template.md` を元に `docs/decisions/` へ追加する
- この `README.md` の「現在地」と「次に着手すべき論点」を更新して、進捗を見失わないようにする

## セッション再開方法

次回、Keith が Codex に以下のように伝えれば再開できる。

`README.md を読んで対応を再開してください。`

詳細な再開ルールは [docs/prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md) に残してある。
