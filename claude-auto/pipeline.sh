#!/usr/bin/env bash
# claude-auto パイプライン エントリポイント
# cron から定期実行する: */15 * * * * /path/to/pipeline.sh >> /path/to/logs/cron.log 2>&1
#
# 状態機械:
#   実装待ち  → impl.sh  → 完了で「レビュー待ち」
#   修正待ち  → impl.sh  → 完了で「レビュー待ち」
#   レビュー待ち → review.sh → 完了で「動作確認待ち」or「修正待ち」
#   仕様確認待ち / 動作確認待ち → ユーザー待機（スキップ + Slack通知）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

mkdir -p "${LOG_DIR}"
PIPELINE_LOG="${LOG_DIR}/pipeline-$(date +%Y%m%d).log"

log() { echo "[pipeline] $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "${PIPELINE_LOG}"; }

notify() { "${SCRIPT_DIR}/notify.sh" "$*" 2>/dev/null || true; }

read_result() {
  local result_file="${LOG_DIR}/last-result.txt"
  if [[ -f "${result_file}" ]]; then
    sed 's/^RESULT: //' "${result_file}"
  else
    echo "（結果不明）"
  fi
}

# Backlog REST API でカテゴリ別課題を取得（claude -p セッションに委譲）
# pipeline 自体は Claude セッションを使って Backlog を読み、振り分けを行う

ORCHESTRATOR_PROMPT=$(cat <<'PROMPT'
## pipeline オーケストレーター

あなたは claude-auto パイプラインのオーケストレーターです。
以下の手順を順番に実行し、最後に JSON で結果を出力してください。

### 手順

1. Backlog MCP の get_categories で PMO_PJPERSONALBASE のカテゴリ一覧を取得し、
   各カテゴリの ID を確認する。

2. 以下の優先順で課題を取得する:
   - 「実装待ち」カテゴリ (statusId=1: 未対応)
   - 「修正待ち」カテゴリ (statusId=2: 処理中)
   - 「レビュー待ち」カテゴリ (statusId=3: 処理済み)

3. 取得した課題リストから最初の 1 件を選ぶ。

4. 「仕様確認待ち」「動作確認待ち」の課題があれば件数を数える。

5. 以下の JSON を出力する（他のテキストは不要）:

```json
{
  "next_action": "impl" | "review" | "wait" | "idle",
  "issue_key": "PMO_PJPERSONALBASE-XX" | null,
  "issue_summary": "課題タイトル" | null,
  "waiting_count": 数字,
  "reason": "選択理由の一言メモ"
}
```

- next_action="impl"  : 実装待ち/修正待ち課題あり → impl.sh を起動すべき
- next_action="review": レビュー待ち課題あり → review.sh を起動すべき
- next_action="wait"  : 処理可能な課題なし・ユーザー待機中
- next_action="idle"  : 何もすることがない
PROMPT
)

log "オーケストレーター起動"

# Claude に Backlog を確認させて JSON 結果を取得
RAW_OUTPUT=$(claude -p "${ORCHESTRATOR_PROMPT}" --model "${CLAUDE_MODEL}" 2>>"${PIPELINE_LOG}")

# JSON ブロックを抽出（```json ... ``` または 裸の {} を探す）
DECISION=$(echo "${RAW_OUTPUT}" | grep -Pzo '```json\s*\K[\s\S]*?(?=```)' | tr -d '\0' || true)
if [[ -z "${DECISION}" ]]; then
  DECISION=$(echo "${RAW_OUTPUT}" | grep -Pzo '\{[\s\S]*\}' | tr -d '\0' || true)
fi

if [[ -z "${DECISION}" ]]; then
  log "ERROR: オーケストレーターから JSON を取得できませんでした"
  log "出力: ${RAW_OUTPUT}"
  notify ":warning: [claude-auto] オーケストレーター JSON 取得失敗。ログを確認してください。"
  exit 1
fi

NEXT_ACTION=$(echo "${DECISION}" | jq -r '.next_action // "idle"')
ISSUE_KEY=$(echo "${DECISION}"   | jq -r '.issue_key // empty')
ISSUE_SUMMARY=$(echo "${DECISION}" | jq -r '.issue_summary // ""')
WAITING_COUNT=$(echo "${DECISION}" | jq -r '.waiting_count // 0')
REASON=$(echo "${DECISION}"      | jq -r '.reason // ""')

log "判定: next_action=${NEXT_ACTION} issue=${ISSUE_KEY} reason=${REASON}"

case "${NEXT_ACTION}" in
  impl)
    log "実装セッション起動: ${ISSUE_KEY} (${ISSUE_SUMMARY})"

    RETRY=0
    while [[ "${RETRY}" -lt "${IMPL_RETRY_MAX}" ]]; do
      "${SCRIPT_DIR}/impl.sh" "${ISSUE_KEY}" && break
      EXIT_CODE=$?
      if [[ "${EXIT_CODE}" -eq 2 ]]; then
        IMPL_RESULT=$(read_result)
        log "仕様確認待ちに移行: ${ISSUE_KEY}"
        notify ":question: [claude-auto] 仕様確認待ち: *${ISSUE_KEY}*\n> ${ISSUE_SUMMARY}\n> ${IMPL_RESULT}"
        break
      fi
      RETRY=$((RETRY + 1))
      log "WARN: impl.sh 失敗 (exit=${EXIT_CODE}) リトライ ${RETRY}/${IMPL_RETRY_MAX}"
      if [[ "${RETRY}" -lt "${IMPL_RETRY_MAX}" ]]; then
        sleep "${IMPL_RETRY_DELAY}"
      fi
    done

    if [[ "${RETRY}" -ge "${IMPL_RETRY_MAX}" ]]; then
      log "ERROR: リトライ上限到達 (${ISSUE_KEY})"
      notify ":rotating_light: [claude-auto] 実装リトライ上限: *${ISSUE_KEY}* — 手動確認が必要です"
    else
      IMPL_RESULT=$(read_result)
      log "実装セッション完了: ${ISSUE_KEY} — ${IMPL_RESULT}"
      notify ":white_check_mark: [claude-auto] 実装完了: *${ISSUE_KEY}*\n> ${ISSUE_SUMMARY}\n> ${IMPL_RESULT}"
    fi
    ;;

  review)
    log "レビューセッション起動: ${ISSUE_KEY} (${ISSUE_SUMMARY})"

    "${SCRIPT_DIR}/review.sh" "${ISSUE_KEY}" && {
      REVIEW_RESULT=$(read_result)
      log "レビューセッション完了: ${ISSUE_KEY} — ${REVIEW_RESULT}"
      notify ":mag: [claude-auto] レビュー完了: *${ISSUE_KEY}*\n> ${ISSUE_SUMMARY}\n> ${REVIEW_RESULT}"
    } || {
      log "WARN: review.sh 異常終了 (${ISSUE_KEY})"
      notify ":warning: [claude-auto] レビュー異常終了: *${ISSUE_KEY}* — ログを確認してください"
    }
    ;;

  wait)
    log "ユーザー待機中 (仕様確認待ち/動作確認待ち: ${WAITING_COUNT}件)"
    if [[ "${WAITING_COUNT}" -gt 0 ]]; then
      notify ":pause_button: [claude-auto] ユーザー待機中 — Backlog に確認待ち課題が ${WAITING_COUNT} 件あります"
    fi
    ;;

  idle)
    log "処理対象なし（idle）"
    ;;

  *)
    log "WARN: 不明な next_action=${NEXT_ACTION}"
    ;;
esac

log "パイプライン完了"
