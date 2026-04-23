# Docs Guide

`docs/` はこのプロジェクトの設計ハブです。議論の入口、保存場所、意思決定の記録方式をここで統一します。

## 役割

- `product/`: 顧客、業務、ユースケース、要件を整理する
- `architecture/`: システム構成、データ構造、権限、セキュリティを整理する
- `decisions/`: 設計上の重要判断を ADR として残す
- `setup/`: 初期セットアップや運用開始手順を残す
- `prompts/`: 私たちが議論するときのルールを残す
- `templates/`: 新しい文書を作るときのテンプレートを置く

## おすすめの読み順

1. [product/vision.md](/home/keith/Documents/projects/personal-base/docs/product/vision.md)
2. [product/core-usecases.md](/home/keith/Documents/projects/personal-base/docs/product/core-usecases.md)
3. [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md)
4. [product/domain-model.md](/home/keith/Documents/projects/personal-base/docs/product/domain-model.md)
5. [product/requirements.md](/home/keith/Documents/projects/personal-base/docs/product/requirements.md)
6. [architecture/system-context.md](/home/keith/Documents/projects/personal-base/docs/architecture/system-context.md)
7. [architecture/tenancy-and-permissions.md](/home/keith/Documents/projects/personal-base/docs/architecture/tenancy-and-permissions.md)
8. [architecture/organization-management.md](/home/keith/Documents/projects/personal-base/docs/architecture/organization-management.md)
9. [architecture/employee-directory-management.md](/home/keith/Documents/projects/personal-base/docs/architecture/employee-directory-management.md)
10. [architecture/organization-chart-display.md](/home/keith/Documents/projects/personal-base/docs/architecture/organization-chart-display.md)
11. [prompts/collaboration-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/collaboration-rules.md)
12. [prompts/resume-instructions.md](/home/keith/Documents/projects/personal-base/docs/prompts/resume-instructions.md)
13. [implementation-plan.md](/home/keith/Documents/projects/personal-base/docs/implementation-plan.md)

## 文書ステータスの考え方

- `Draft`: 叩き台
- `In Review`: 論点整理中
- `Decided`: 現時点での結論
- `Superseded`: 別文書や ADR に置き換えられた

各文書の冒頭に、少なくとも以下を置く運用にします。

```md
- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-17
```

## 文書の使い分け

- 業務やプロダクトの話は `product/`
- 技術的な話は `architecture/`
- 後で振り返るべき判断は `decisions/`
- 会話の進め方や書き方のルールは `prompts/`
- 役割分担と意思決定境界は `prompts/collaboration-rules.md`
- セッション再開手順は `prompts/resume-instructions.md`

## 更新時の基本方針

- 既存文書を壊す前に、重要な設計変更は ADR で理由を残す
- 「決まったこと」と「まだ検討中のこと」を混在させない
- 進行中の論点は、各文書末尾に `Open Questions` を置いて管理する
