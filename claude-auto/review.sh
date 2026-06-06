#!/usr/bin/env bash
# レビュー（PM）セッション起動スクリプト
# 使い方: review.sh <ISSUE_KEY>
#   例:   review.sh PMO_PJPERSONALBASE-70

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[review] 課題キーが指定されていません" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/review-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: PM セッション（コードレビュー）

あなたは PM セッションです。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}

### 手順
1. Backlog MCP の get_issue でレビュー対象課題を取得する
2. 課題の完了条件と実装コメントを確認する
3. git diff を使って実装差分を確認する
4. コードレビューを実施する（バグ・設計・テスト・完了条件の充足）
5. レビュー結果を Backlog コメントに記録する（OK/NG・指摘内容）
6. レビュー OK の場合:
   - 課題を「処理済み」+ カテゴリ「動作確認待ち」に更新する
7. レビュー NG の場合:
   - 課題を「処理中」+ カテゴリ「修正待ち」に更新する
   - 修正内容をコメントに明記する
8. ユーザーへのエスカレーションが必要な場合:
   - 課題に「仕様確認待ち」カテゴリを付けてコメントで理由を記載する

### 重要ルール
- スコープ・優先順位の判断はユーザーへ確認する
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
PROMPT
)

echo "[review] 課題 ${ISSUE_KEY} のレビューセッションを開始します"
echo "[review] ログ: ${LOG_FILE}"

claude -p "${PROMPT}" \
  --model "${CLAUDE_MODEL}" \
  2>&1 | tee -a "${LOG_FILE}"

EXIT_CODE=${PIPESTATUS[0]}
echo "[review] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
