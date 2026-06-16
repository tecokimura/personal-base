#!/usr/bin/env bash
# 動作確認セッション起動スクリプト
# 使い方: verify.sh <ISSUE_KEY>
#   例:   verify.sh PMO_PJPERSONALBASE-81
#
# ユーザーの動作確認コメントを読んで:
#   OK     → ステータスを「完了」に更新
#   修正依頼 → 新規課題を「実装待ち」で起票し、現課題は完了にする

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[verify] 課題キーが指定されていません" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/verify-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"
RESULT_FILE="${LOG_DIR}/last-result.txt"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: 動作確認セッション

あなたは動作確認セッションです。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}

### 手順
1. Backlog MCP の get_issue で課題詳細を取得する
2. get_issue_comments でコメント一覧を取得し、最新コメントを確認する
3. **ユーザー（人間）から明示的な動作確認コメントがあるか判定する**
   - 「実装完了」「レビューOK」など AI セッションが書いた定型コメントはユーザーコメントとして扱わない
   - ユーザーコメントがない場合 → 何もせず終了する（ユーザーの確認を待つ）
4. ユーザーコメントがある場合のみ以下を実施する:

#### コメントが「OK」「問題なし」「完了」など承認の場合:
   - 課題を「完了」ステータス（statusId=4）に更新する（カテゴリは不要）
   - Backlog コメントに「動作確認OK・完了にしました」と記録する

#### コメントに修正依頼・不具合報告が含まれる場合:
   - 新規課題を PMO_PJPERSONALBASE に起票する
     - 件名: 「[修正] 元課題の概要 — 修正内容の一言」
     - カテゴリ: 「実装待ち」
     - 説明: ユーザーの修正依頼内容を詳細に記載する
   - 元課題（${ISSUE_KEY}）を「完了」ステータスに更新する
   - 元課題にコメント「修正依頼を新規課題 XXX に起票しました」と記録する

### 最後に必ず出力すること
作業完了後、必ず最後の行に以下の形式で結果を出力してください:

ユーザーコメントなしの場合:
RESULT: ユーザーコメント待ち — 動作確認を待機中

承認の場合:
RESULT: 動作確認OK → 完了にしました

修正依頼の場合:
RESULT: 修正依頼あり → 新規課題 PMO_PJPERSONALBASE-XX を起票・元課題を完了にしました

### 重要ルール
- 動作確認はユーザーが行うものであり、AI が代替判断して完了にしてはならない
- ユーザーコメントなしの場合は必ず待機する（git log や実装内容を見て独断で完了にしない）
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
- スコープを独断で広げない
PROMPT
)

echo "[verify] 課題 ${ISSUE_KEY} の動作確認セッションを開始します"
echo "[verify] ログ: ${LOG_FILE}"

STDERR_FILE="${LOG_DIR}/verify-${ISSUE_KEY}-stderr.tmp"
OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}") && EXIT_CODE=0 || EXIT_CODE=$?
STDERR_OUTPUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"

echo "${OUTPUT}" | tee -a "${LOG_FILE}"
[[ -n "${STDERR_OUTPUT}" ]] && echo "${STDERR_OUTPUT}" >> "${LOG_FILE}"

COMBINED="${OUTPUT}${STDERR_OUTPUT}"
if [[ "${EXIT_CODE}" -ne 0 ]] && is_rate_limited "${COMBINED}" "${EXIT_CODE}"; then
  echo "RESULT: Claude制限により中断 — バックオフ後に自動再開します" > "${RESULT_FILE}"
  echo "[verify] Claude制限を検出 (exit=3)"
  exit 3
fi

RESULT_LINE=$(echo "${OUTPUT}" | grep "^RESULT:" | tail -1 || true)
if [[ "${EXIT_CODE}" -ne 0 && -z "${RESULT_LINE}" ]]; then
  echo "RESULT: エラー終了（詳細不明: exit=${EXIT_CODE}）" > "${RESULT_FILE}"
else
  echo "${RESULT_LINE:-RESULT: 完了（詳細不明）}" > "${RESULT_FILE}"
fi

echo "[verify] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
