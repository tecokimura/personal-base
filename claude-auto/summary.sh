#!/usr/bin/env bash
# 日次サマリー通知スクリプト
# 使い方: summary.sh
# cron 例: 0 9 * * * /path/to/summary.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

cd "${PROJECT_DIR}"

mkdir -p "${LOG_DIR}"
SUMMARY_LOG="${LOG_DIR}/summary-$(date +%Y%m%d).log"
log() { echo "[summary] $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "${SUMMARY_LOG}"; }

notify() { "${SCRIPT_DIR}/notify.sh" "$1" 2>/dev/null || true; }

PROMPT=$(cat <<'PROMPT'
## 日次サマリー集計

Backlog MCP を使って PMO_PJPERSONALBASE プロジェクトの課題数を集計してください。

### 手順
1. get_categories で各カテゴリの ID を確認する
2. 以下のカテゴリごとに get_issues で **未完了課題のみ（statusId=1,2,3）** を集計する:
   - 実装待ち（statusId=1: 未対応）
   - レビュー待ち（statusId=3: 処理済み）
   - 修正待ち（statusId=2: 処理中）
   - 仕様確認待ち（statusId=3: 処理済み）
   - 動作確認待ち（statusId=3: 処理済み）
   ※ statusId=4（完了）の課題は除外する
3. 以下の JSON のみ出力する（他のテキスト不要）:

```json
{
  "impl_waiting": 数字,
  "review_waiting": 数字,
  "fix_waiting": 数字,
  "spec_waiting": 数字,
  "verify_waiting": 数字
}
```
PROMPT
)

log "日次サマリー集計開始"

STDERR_FILE="${LOG_DIR}/summary-stderr.tmp"
RAW=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}") && CLAUDE_EXIT=0 || CLAUDE_EXIT=$?
STDERR_OUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"
[[ -n "${STDERR_OUT}" ]] && echo "${STDERR_OUT}" >> "${SUMMARY_LOG}"

if [[ "${CLAUDE_EXIT}" -ne 0 ]]; then
  if is_rate_limited "${RAW}${STDERR_OUT}" "${CLAUDE_EXIT}"; then
    log "Claude制限検出 — summary をスキップ（次回自動実行まで待機）"
    exit 0
  fi
  log "ERROR: Claude 呼び出し失敗"
  exit 1
fi

# JSON 抽出
RESULT=$(echo "${RAW}" | grep -Pzo '```json\s*\K[\s\S]*?(?=```)' | tr -d '\0' || true)
if [[ -z "${RESULT}" ]]; then
  RESULT=$(echo "${RAW}" | grep -Pzo '\{[\s\S]*\}' | tr -d '\0' || true)
fi

if [[ -z "${RESULT}" ]]; then
  log "ERROR: JSON 取得失敗"
  exit 1
fi

IMPL=$(echo "${RESULT}"   | jq -r '.impl_waiting   // 0')
REVIEW=$(echo "${RESULT}" | jq -r '.review_waiting // 0')
FIX=$(echo "${RESULT}"    | jq -r '.fix_waiting    // 0')
SPEC=$(echo "${RESULT}"   | jq -r '.spec_waiting   // 0')
VERIFY=$(echo "${RESULT}" | jq -r '.verify_waiting // 0')

TODAY=$(date '+%Y-%m-%d')

# ユーザー確認が必要な件数
USER_ACTION=$((SPEC + VERIFY))

MSG=":bar_chart: [claude-auto] *日次サマリー ${TODAY}*"
MSG="${MSG}\n:hammer: 実装待ち: ${IMPL}件"
[[ "${FIX}" -gt 0 ]] && MSG="${MSG}\n:wrench: 修正待ち: ${FIX}件"
MSG="${MSG}\n:mag: レビュー待ち: ${REVIEW}件"
[[ "${SPEC}" -gt 0 ]] && MSG="${MSG}\n:question: 仕様確認待ち: ${SPEC}件  ← *要確認*"
[[ "${VERIFY}" -gt 0 ]] && MSG="${MSG}\n:ballot_box_with_check: 動作確認待ち: ${VERIFY}件  ← *要確認*"
[[ "${USER_ACTION}" -eq 0 ]] && MSG="${MSG}\n:white_check_mark: ユーザー確認待ちなし — パイプライン自動処理中"

log "集計完了: 実装待ち=${IMPL} レビュー待ち=${REVIEW} 修正待ち=${FIX} 仕様確認待ち=${SPEC} 動作確認待ち=${VERIFY}"
notify "${MSG}"
