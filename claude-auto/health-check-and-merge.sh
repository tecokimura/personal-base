#!/usr/bin/env bash
# バッチ実行用: チケットブランチのヘルスチェック → 通ればバッチブランチへ統合
# 使い方: health-check-and-merge.sh <ISSUE_KEY> <FEATURE_BRANCH> <BATCH_BRANCH>
#
# 動作:
#   1. FEATURE_BRANCH をチェックアウトし、リポジトリ全体で typecheck + backend test を実行
#   2. 両方通れば BATCH_BRANCH にマージ（--no-ff）して push し、FEATURE_BRANCH を削除して exit 0
#   3. どちらか失敗すれば統合せず、claude-auto/logs/failed-<ISSUE_KEY>.txt に理由を記録して exit 1
#
# 失敗時、FEATURE_BRANCH はローカル/リモートに残したまま（人間が調査できるように削除しない）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

cd "${PROJECT_DIR}"

ISSUE_KEY="${1:-}"
FEATURE_BRANCH="${2:-}"
BATCH_BRANCH="${3:-}"

if [[ -z "${ISSUE_KEY}" || -z "${FEATURE_BRANCH}" || -z "${BATCH_BRANCH}" ]]; then
  echo "[health-check] 使い方: health-check-and-merge.sh <ISSUE_KEY> <FEATURE_BRANCH> <BATCH_BRANCH>" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
FAILED_FILE="${LOG_DIR}/failed-${ISSUE_KEY}.txt"
LOG_FILE="${LOG_DIR}/healthcheck-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[health-check] $*" | tee -a "${LOG_FILE}"; }

record_failure() {
  local reason="$1"
  {
    echo "issue: ${ISSUE_KEY}"
    echo "branch: ${FEATURE_BRANCH}"
    echo "failed_at: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "reason: ${reason}"
  } > "${FAILED_FILE}"
  log "統合を見送りました（${FAILED_FILE} に記録）"
}

log "ブランチ ${FEATURE_BRANCH} をチェックアウト中..."
git fetch origin >> "${LOG_FILE}" 2>&1
if ! git checkout "${FEATURE_BRANCH}" >> "${LOG_FILE}" 2>&1; then
  record_failure "ブランチ ${FEATURE_BRANCH} のチェックアウトに失敗"
  exit 1
fi
git pull origin "${FEATURE_BRANCH}" >> "${LOG_FILE}" 2>&1 || true

log "typecheck 実行中..."
if ! pnpm typecheck >> "${LOG_FILE}" 2>&1; then
  TAIL=$(tail -30 "${LOG_FILE}")
  record_failure "pnpm typecheck 失敗:
${TAIL}"
  exit 1
fi
log "typecheck OK"

log "backend test 実行中..."
if ! (cd "${PROJECT_DIR}/apps/backend" && npx vitest run >> "${LOG_FILE}" 2>&1); then
  TAIL=$(tail -60 "${LOG_FILE}")
  record_failure "backend test 失敗:
${TAIL}"
  exit 1
fi
log "backend test OK"

log "全ヘルスチェックOK — ${BATCH_BRANCH} へ統合します"

if ! git checkout "${BATCH_BRANCH}" >> "${LOG_FILE}" 2>&1; then
  record_failure "バッチブランチ ${BATCH_BRANCH} のチェックアウトに失敗"
  exit 1
fi
git pull origin "${BATCH_BRANCH}" >> "${LOG_FILE}" 2>&1 || true

if ! git merge --no-ff "${FEATURE_BRANCH}" -m "merge: ${ISSUE_KEY} into ${BATCH_BRANCH}" >> "${LOG_FILE}" 2>&1; then
  record_failure "バッチブランチへのマージがコンフリクト等で失敗"
  git merge --abort >> "${LOG_FILE}" 2>&1 || true
  exit 1
fi

git push origin "${BATCH_BRANCH}" >> "${LOG_FILE}" 2>&1

# 統合できたのでチケットブランチは削除（ローカル・リモート）
git branch -d "${FEATURE_BRANCH}" >> "${LOG_FILE}" 2>&1 || true
git push origin --delete "${FEATURE_BRANCH}" >> "${LOG_FILE}" 2>&1 || true

rm -f "${FAILED_FILE}"
log "統合完了: ${FEATURE_BRANCH} → ${BATCH_BRANCH}"
exit 0
