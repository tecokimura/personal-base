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
| 実装計画 | In Progress | MVP と第 2 フェーズの実装順、着手単位、チケット粒度は整理済み。次は詳細設計 |

## まず見る場所

- 設計の進め方: [docs/README.md](/home/keith/Documents/projects/personal-base/docs/README.md)
- 文書ルール: [docs/prompts/document-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/document-rules.md)
- 役割分担ルール: [docs/prompts/collaboration-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/collaboration-rules.md)
- プロジェクト状況サマリ: [docs/project-status.md](/home/keith/Documents/projects/personal-base/docs/project-status.md)
- 決定待ち課題一覧: [docs/decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md)
- ロードマップとマイルストーン: [docs/roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
- 実装計画: [docs/implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)
- 初期セットアップ手順: [docs/setup/initial-bootstrap.md](/home/keith/Documents/projects/personal-base/docs/setup/initial-bootstrap.md)
- 再開手順: [docs/prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)
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

- 決定待ち課題は [docs/decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md) を正本とする
- 実装順の正本は [docs/implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md) とする
- 直近は `認証・認可基盤` の実装着手と並行して、`閲覧権限制御` の詳細設計を詰める段階に入っている

## 運用ルール

- 仕様の本文には「現時点の結論」を書く
- 仮説や迷いは `Open Questions` に分離する
- 重要な設計判断は ADR として残す
- 一度に複数の論点を混ぜず、1 ドキュメント 1 主題で進める
- 選択肢がある判断は、必ずあなたに確認してから確定する

## 更新の仕方

- 新しい設計論点を始めるときは、先に `docs/templates/design-doc-template.md` をコピーして作る
- 大きな方針決定をしたときは、`docs/templates/adr-template.md` を元に `docs/decisions/` へ追加する
- この `README.md` の「現在地」と「次に着手すべき論点」を更新して、進捗を見失わないようにする

## セッション再開方法

次回、Keith が Codex に以下のように伝えれば再開できる。

`README.md を読んで対応を再開してください。`

詳細な再開ルールは [docs/prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md) に残してある。
