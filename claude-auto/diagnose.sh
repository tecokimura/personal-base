#!/usr/bin/env bash
# diagnose.sh — パイプライン実行前の診断・自律修正スクリプト
#
# 役割:
#   1. 直近のエラーログを確認し、AIが自律修正できる問題を修正する
#   2. Backlog課題・ソースコード(ブランチ)・docs の整合性を確認し矛盾を修正する
#   3. 修正内容と要対応事項をSlackに詳細報告する
#
# 終了コード:
#   0 = 問題なし or 自律修正完了（メイン処理を続行してよい）
#   3 = Claude レート制限（バックオフが必要）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

cd "${PROJECT_DIR}"

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/diagnose-$(date +%Y%m%d-%H%M%S).log"
touch "${LOG_FILE}"

trap 'echo "[diagnose] 予期しないエラーで終了 (line $LINENO, exit $?)" | tee -a "${LOG_FILE}" >&2' ERR

log()    { echo "[diagnose] $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "${LOG_FILE}"; }
notify() { "${SCRIPT_DIR}/notify.sh" "$1" 2>/dev/null || true; }

log "診断フェーズ開始"

# ── 情報収集 ─────────────────────────────────────────────────────

# 直近のパイプラインログ（本日分 + 昨日分）
PIPELINE_LOG_TODAY="${LOG_DIR}/pipeline-$(date +%Y%m%d).log"
PIPELINE_LOG_YESTERDAY="${LOG_DIR}/pipeline-$(date -d yesterday +%Y%m%d).log"
PIPELINE_RECENT=""
if [[ -f "${PIPELINE_LOG_TODAY}" ]]; then
  PIPELINE_RECENT+="### 本日のパイプラインログ（末尾60行）\n"
  PIPELINE_RECENT+="$(tail -60 "${PIPELINE_LOG_TODAY}")\n\n"
fi
if [[ -f "${PIPELINE_LOG_YESTERDAY}" ]]; then
  PIPELINE_RECENT+="### 昨日のパイプラインログ（末尾20行）\n"
  PIPELINE_RECENT+="$(tail -20 "${PIPELINE_LOG_YESTERDAY}")\n\n"
fi

# 直近のセッションログからエラー行を抽出（impl / review / diagnose）
SESSION_ERRORS=""
while IFS= read -r -d '' log_file; do
  errors=$(grep -E "WARN|ERROR|が見つかりません|異常終了|失敗|exit=[^0]" "${log_file}" 2>/dev/null | tail -5 || true)
  if [[ -n "${errors}" ]]; then
    SESSION_ERRORS+="### $(basename "${log_file}")\n${errors}\n\n"
  fi
done < <(find "${LOG_DIR}" -name "*.log" -not -name "diagnose-*" -not -name "pipeline-*" -mmin -1440 -print0 2>/dev/null || true)

# last-result.txt
LAST_RESULT=""
if [[ -f "${LOG_DIR}/last-result.txt" ]]; then
  LAST_RESULT=$(cat "${LOG_DIR}/last-result.txt")
fi

# ブランチ情報
log "ブランチ情報を取得中..."
git fetch origin --prune 2>&1 | tee -a "${LOG_FILE}" || true
BRANCH_INFO=$(git branch -a 2>/dev/null || echo "取得失敗")

# branch ファイル一覧（review.sh が参照するブランチ対応表）
BRANCH_FILES_INFO=""
while IFS= read -r -d '' bf; do
  key=$(basename "${bf}" .txt | sed 's/^branch-//')
  val=$(cat "${bf}" | tr -d '[:space:]')
  BRANCH_FILES_INFO+="  ${key} → ${val}\n"
done < <(find "${LOG_DIR}" -name "branch-*.txt" -print0 2>/dev/null || true)

log "情報収集完了 — Claude に診断を委譲中..."

# ── Claude に診断・修正を委譲 ────────────────────────────────────

PROMPT=$(cat <<PROMPT
## diagnose フェーズ: 診断・自律修正エージェント

あなたはパイプライン診断エージェントです。以下の情報を読み、問題を特定・修正してください。
**新規実装は行わない**。診断・ステータス修正のみが役割です。

---

### 実装ベースブランチ
${IMPL_BRANCH}

### 現在のブランチ一覧（git branch -a）
${BRANCH_INFO}

### branch ファイル（課題キー → 対応ブランチ名）
${BRANCH_FILES_INFO:-なし}

### 直近のパイプラインログ
${PIPELINE_RECENT:-なし}

### セッションログのエラー行
${SESSION_ERRORS:-なし}

### 前回の実行結果（last-result.txt）
${LAST_RESULT:-なし}

---

## タスク（順番に実施）

### Step 1: エラーログ診断・自律修正

パイプラインログ・セッションログを読んで問題を特定する。

以下のパターンで自律修正する:
- **「ブランチが見つかりません」エラー** → branch ファイルが指すブランチがリモートに存在しない
  → get_issue でその課題の実装状況を確認し、実態に合わせて update_issue でステータス修正
- **同一課題のレビュー/実装が繰り返し失敗** → 原因を特定して修正
- **その他 AI で対応可能な問題** → 判断して対応

### Step 2: Backlog・ブランチ・docs の整合性チェック

1. get_issues で PMO_PJPERSONALBASE の未完了課題を取得（statusId=1,2,3）
2. 各課題を確認:
   - カテゴリ「レビュー待ち」または「修正待ち」の課題 → 対応ブランチがリモートに存在するか確認
     - ブランチなし → get_issue_comments でコメントを確認し、実装済みなら ${IMPL_BRANCH} にマージ済みか確認して適切なステータスに更新
   - カテゴリ「実装待ち」の課題 → feat/pmo-{番号}-* 形式のブランチが既に存在する場合は「レビュー待ち」に更新を検討
   - ステータス「完了」なのにカテゴリが「レビュー待ち」「修正待ち」等のまま残っている → カテゴリを削除
3. docs/current-position.md を読み、現在地の記述と Backlog の状態が一致しているか確認
   - 乖離があればコメントとして記録（docs 自体の変更は行わない）

### Step 3: 結果サマリ出力

すべての作業完了後、必ず以下の JSON を最後に出力する（他のテキストの後に単独行で）:

DIAGNOSE_RESULT: {"issues_found": 数字, "issues_fixed": 数字, "needs_human": true|false, "fixed_summary": "修正内容の一言サマリ（なければ「問題なし」）", "human_summary": "人間の判断が必要な内容（なければ空文字）"}

### 重要ルール
- スコープを広げない（診断・Backlog修正のみ。コードの新規実装・コミットは行わない）
- 判断が難しい場合は needs_human=true にして human_summary に理由を書く
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
PROMPT
)

STDERR_FILE="${LOG_DIR}/diagnose-stderr.tmp"
OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}") && EXIT_CODE=0 || EXIT_CODE=$?
STDERR_OUTPUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"

echo "${OUTPUT}" | tee -a "${LOG_FILE}"
[[ -n "${STDERR_OUTPUT}" ]] && echo "${STDERR_OUTPUT}" >> "${LOG_FILE}"

# レート制限チェック
if [[ "${EXIT_CODE}" -ne 0 ]] && is_rate_limited "${OUTPUT}${STDERR_OUTPUT}" "${EXIT_CODE}"; then
  log "Claude制限検出（diagnose）"
  exit 3
fi

# ── DIAGNOSE_RESULT を抽出して Slack 報告 ────────────────────────

RESULT_JSON=$(echo "${OUTPUT}" | grep "^DIAGNOSE_RESULT:" | tail -1 | sed 's/^DIAGNOSE_RESULT: //' || true)

if [[ -z "${RESULT_JSON}" ]]; then
  log "WARN: DIAGNOSE_RESULT を取得できませんでした"
  notify ":warning: [diagnose] *診断結果の取得に失敗* — ログを確認してください: $(basename "${LOG_FILE}")"
  exit 0
fi

ISSUES_FOUND=$(echo "${RESULT_JSON}" | jq -r '.issues_found // 0')
ISSUES_FIXED=$(echo "${RESULT_JSON}"  | jq -r '.issues_fixed // 0')
NEEDS_HUMAN=$(echo "${RESULT_JSON}"   | jq -r '.needs_human // false')
FIXED_SUMMARY=$(echo "${RESULT_JSON}" | jq -r '.fixed_summary // "問題なし"')
HUMAN_SUMMARY=$(echo "${RESULT_JSON}" | jq -r '.human_summary // ""')

log "診断完了 — 発見: ${ISSUES_FOUND}件 / 修正: ${ISSUES_FIXED}件 / 人間対応要: ${NEEDS_HUMAN}"

if [[ "${ISSUES_FOUND}" -gt 0 ]]; then
  if [[ "${NEEDS_HUMAN}" == "true" && -n "${HUMAN_SUMMARY}" ]]; then
    notify ":warning: [diagnose] *要対応あり*\n自律修正: ${ISSUES_FIXED}件（${FIXED_SUMMARY}）\n要対応: ${HUMAN_SUMMARY}"
  elif [[ "${ISSUES_FIXED}" -gt 0 ]]; then
    notify ":wrench: [diagnose] *自律修正完了* ${ISSUES_FIXED}件\n内容: ${FIXED_SUMMARY}"
  fi
fi

log "診断フェーズ完了"
exit 0
