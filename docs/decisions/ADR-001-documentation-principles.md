# ADR-001: Documentation Principles

- Status: Accepted
- Owner: Keith / Codex
- Last Updated: 2026-04-17

## Context

このプロジェクトは、実装より前にプロダクト設計と技術設計を深く詰める必要がある。設計対象は、人事データ、評価、スキル、配置、権限、監査など複数の論点にまたがり、議論が拡散しやすい。

## Decision

以下の原則で設計文書を運用する。

- `docs/` を単一の設計ハブにする
- `product/` と `architecture/` を分離する
- 重要な判断は ADR として `decisions/` に残す
- 会話ルールと文書ルールを `prompts/` に明文化する
- トップの `README.md` を進捗確認の入口にする

## Alternatives Considered

### 1. すべて 1 つの長い文書にまとめる

把握はしやすいが、設計論点が増えると更新と参照が難しくなるため不採用。

### 2. 会話ベースでのみ進め、文書化は後回しにする

初速は出るが、設計判断の追跡が難しくなるため不採用。

## Consequences

- 設計の全体像を追いやすくなる
- どの議論がどこにあるかを迷いにくくなる
- 文書更新の手間は増えるが、後戻りコストは下がる

## Follow-up

- `product/` 配下の中身を順次具体化する
- MVP とテナント設計の ADR を追加する
