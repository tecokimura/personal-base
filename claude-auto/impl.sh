#!/usr/bin/env bash
# 実装セッション起動スクリプト
# 使い方: impl.sh <ISSUE_KEY>
#   例:   impl.sh PMO_PJPERSONALBASE-70

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[impl] 課題キーが指定されていません" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/impl-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: 実装セッション

あなたは実装セッション（Codex）です。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}

### 手順
1. Backlog MCP の get_issue で課題詳細を取得する
2. 課題の説明・完了条件を把握し、docs/ の関連設計を参照する
3. 実装を行う（スコープを独断で広げない）
4. 実装完了したら:
   - Backlog 課題を「処理済み」ステータス + カテゴリ「レビュー待ち」に更新する
   - 実装内容のサマリを Backlog コメントに残す
5. 仕様が不明確で進められない場合:
   - Backlog 課題を「処理済み」+ カテゴリ「仕様確認待ち」に更新する
   - 不明点をコメントに明記する
   - exit 2 で終了する（パイプラインが待機状態として扱う）

### 最後に必ず出力すること
作業完了後、必ず最後の行に以下の形式で結果を出力してください（他のテキストの後に単独行で）:

実装完了の場合:
RESULT: 実装完了 → レビュー待ちに更新（実装内容の一言メモ）

仕様確認待ちの場合:
RESULT: 仕様確認待ちに更新（不明点の一言メモ）

### 重要ルール
- スコープを独断で広げない
- 不明点は実装を止めてコメントに記録する
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
PROMPT
)

RESULT_FILE="${LOG_DIR}/last-result.txt"

echo "[impl] 課題 ${ISSUE_KEY} の実装セッションを開始します"
echo "[impl] ログ: ${LOG_FILE}"

OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>>"${LOG_FILE}")
EXIT_CODE=$?
echo "${OUTPUT}" | tee -a "${LOG_FILE}"

# RESULT: 行を抽出して保存（pipeline.sh が読む）
RESULT_LINE=$(echo "${OUTPUT}" | grep "^RESULT:" | tail -1 || true)
echo "${RESULT_LINE:-RESULT: 完了（詳細不明）}" > "${RESULT_FILE}"

echo "[impl] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
