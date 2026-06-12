#!/usr/bin/env bash
# レビュー（PM）セッション起動スクリプト
# 使い方: review.sh <ISSUE_KEY>
#   例:   review.sh PMO_PJPERSONALBASE-70

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

cd "${PROJECT_DIR}"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[review] 課題キーが指定されていません" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/review-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"

# ── コンパイルチェック ──────────────────────────────────────────────
echo "[review] TypeScript コンパイルチェック実行中..."

BACKEND_TSC=$(cd "${PROJECT_DIR}/apps/backend" && npx --no-install tsc --noEmit 2>&1 || true)
FRONTEND_TSC=$(cd "${PROJECT_DIR}/apps/frontend" && npx --no-install tsc --noEmit 2>&1 || true)

if [[ -z "${BACKEND_TSC}" ]]; then
  BACKEND_RESULT="エラーなし（クリーン）"
else
  BACKEND_RESULT="エラーあり:
${BACKEND_TSC}"
fi

if [[ -z "${FRONTEND_TSC}" ]]; then
  FRONTEND_RESULT="エラーなし（クリーン）"
else
  FRONTEND_RESULT="エラーあり:
${FRONTEND_TSC}"
fi

echo "[review] バックエンド TSC: $([ -z "${BACKEND_TSC}" ] && echo 'クリーン' || echo 'エラーあり')"
echo "[review] フロントエンド TSC: $([ -z "${FRONTEND_TSC}" ] && echo 'クリーン' || echo 'エラーあり')"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: PM セッション（コードレビュー）

あなたは PM セッションです。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}

### コンパイルチェック結果（レビュー前自動実行済み）

**バックエンド (npx tsc --noEmit):**
${BACKEND_RESULT}

**フロントエンド (npx tsc --noEmit):**
${FRONTEND_RESULT}

コンパイルエラーがある場合は、内容を Backlog コメントに記載した上でレビュー NG としてください。

### 手順
1. Backlog MCP の get_issue でレビュー対象課題を取得する
2. 課題の完了条件と実装コメントを確認する
3. git diff develop...${IMPL_BRANCH} で実装差分を確認する
4. コードレビューを実施する（バグ・設計・テスト・完了条件の充足・上記コンパイルエラーの有無）
5. レビュー結果を Backlog コメントに記録する（OK/NG・指摘内容）
6. レビュー OK の場合:
   - 課題を「処理済み」+ カテゴリ「動作確認待ち」に更新する
7. レビュー NG の場合:
   - 課題を「処理中」+ カテゴリ「修正待ち」に更新する
   - 修正内容をコメントに明記する
8. ユーザーへのエスカレーションが必要な場合:
   - 課題に「仕様確認待ち」カテゴリを付けてコメントで理由を記載する

### 最後に必ず出力すること
作業完了後、必ず最後の行に以下の形式で結果を出力してください（他のテキストの後に単独行で）:

レビュー OK の場合:
RESULT: レビューOK → 動作確認待ちに更新（一言コメント）

レビュー NG の場合:
RESULT: レビューNG → 修正待ちに更新（主な指摘: 指摘内容の一言メモ）

仕様確認が必要な場合:
RESULT: 仕様確認待ちに更新（確認事項の一言メモ）

### 重要ルール
- スコープ・優先順位の判断はユーザーへ確認する
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
PROMPT
)

RESULT_FILE="${LOG_DIR}/last-result.txt"

echo "[review] 課題 ${ISSUE_KEY} のレビューセッションを開始します"
echo "[review] ログ: ${LOG_FILE}"

STDERR_FILE="${LOG_DIR}/review-${ISSUE_KEY}-stderr.tmp"
OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}")
EXIT_CODE=$?
STDERR_OUTPUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"

echo "${OUTPUT}" | tee -a "${LOG_FILE}"
[[ -n "${STDERR_OUTPUT}" ]] && echo "${STDERR_OUTPUT}" >> "${LOG_FILE}"

COMBINED="${OUTPUT}${STDERR_OUTPUT}"
if [[ "${EXIT_CODE}" -ne 0 ]] && is_rate_limited "${COMBINED}"; then
  echo "RESULT: Claude制限により中断 — バックオフ後に自動再開します" > "${RESULT_FILE}"
  echo "[review] Claude制限を検出 (exit=3)"
  exit 3
fi

RESULT_LINE=$(echo "${OUTPUT}" | grep "^RESULT:" | tail -1 || true)
echo "${RESULT_LINE:-RESULT: 完了（詳細不明）}" > "${RESULT_FILE}"

echo "[review] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
