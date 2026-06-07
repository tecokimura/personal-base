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
source "${SCRIPT_DIR}/lib.sh"

PIPELINE_LOG="${LOG_DIR}/pipeline-$(date +%Y%m%d).log"

log() { echo "[pipeline] $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "${PIPELINE_LOG}"; }

notify() { "${SCRIPT_DIR}/notify.sh" "$*" 2>/dev/null || true; }

# 二重起動防止（flock でロック取得できなければ即終了）
LOCK_FILE="${LOG_DIR}/pipeline.lock"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "別のパイプラインが実行中 — スキップ"
  exit 0
fi

# バックオフ中は即終了（cron は継続して動くが処理をスキップ）
if in_backoff; then
  REMAINING=$(backoff_remaining_min)
  log "バックオフ中 — あと約${REMAINING}分でスキップ解除"
  exit 0
fi

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

2. 以下の優先順で課題を確認する:
   a. 「実装待ち」カテゴリ (statusId=1: 未対応)
   b. 「修正待ち」カテゴリ (statusId=2: 処理中)
   c. 「レビュー待ち」カテゴリ (statusId=3: 処理済み)
   d. 「動作確認待ち」カテゴリの課題を取得し、get_issue_comments で各課題のコメントを確認する
      → コメントが 1 件以上あれば verify 対象とする

3. 上記 a〜d のうち最初に該当した課題を 1 件選ぶ。

4. 「仕様確認待ち」の課題件数、「動作確認待ち」でコメントなしの件数を数える（waiting_count）。

5. 以下の JSON を出力する（他のテキストは不要）:

```json
{
  "next_action": "impl" | "review" | "verify" | "wait" | "idle",
  "issue_key": "PMO_PJPERSONALBASE-XX" | null,
  "issue_summary": "課題タイトル" | null,
  "waiting_count": 数字,
  "reason": "選択理由の一言メモ"
}
```

- next_action="impl"  : 実装待ち/修正待ち課題あり → impl.sh を起動すべき
- next_action="review": レビュー待ち課題あり → review.sh を起動すべき
- next_action="verify": 動作確認待ちでコメントあり → verify.sh を起動すべき
- next_action="wait"  : 処理可能な課題なし・ユーザー待機中（仕様確認待ち or 動作確認待ちコメントなし）
- next_action="idle"  : 何もすることがない
PROMPT
)

log "オーケストレーター起動"

# Claude に Backlog を確認させて JSON 結果を取得
ORCH_STDERR="${LOG_DIR}/orch-stderr.tmp"
RAW_OUTPUT=$(claude -p "${ORCHESTRATOR_PROMPT}" --model "${CLAUDE_MODEL}" 2>"${ORCH_STDERR}")
ORCH_EXIT=$?
ORCH_STDERR_OUTPUT=$(cat "${ORCH_STDERR}" 2>/dev/null || true)
rm -f "${ORCH_STDERR}"
[[ -n "${ORCH_STDERR_OUTPUT}" ]] && echo "${ORCH_STDERR_OUTPUT}" >> "${PIPELINE_LOG}"

# オーケストレーター自体が制限を受けた場合
if [[ "${ORCH_EXIT}" -ne 0 ]] && is_rate_limited "${RAW_OUTPUT}${ORCH_STDERR_OUTPUT}"; then
  write_backoff "${BACKOFF_DURATION}"
  REMAINING=$(backoff_remaining_min)
  log "Claude制限検出（オーケストレーター）— ${REMAINING}分後に自動再開"
  notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開します"
  exit 0
fi

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
    RATE_LIMITED=false
    while [[ "${RETRY}" -lt "${IMPL_RETRY_MAX}" ]]; do
      "${SCRIPT_DIR}/impl.sh" "${ISSUE_KEY}" && break
      EXIT_CODE=$?
      if [[ "${EXIT_CODE}" -eq 3 ]]; then
        RATE_LIMITED=true
        write_backoff "${BACKOFF_DURATION}"
        REMAINING=$(backoff_remaining_min)
        log "Claude制限検出 — ${REMAINING}分後に自動再開 (${ISSUE_KEY})"
        notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開します\n> *${ISSUE_KEY}* ${ISSUE_SUMMARY}"
        break
      fi
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

    if [[ "${RATE_LIMITED}" == true ]]; then
      : # バックオフ通知済み
    elif [[ "${RETRY}" -ge "${IMPL_RETRY_MAX}" ]]; then
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

    "${SCRIPT_DIR}/review.sh" "${ISSUE_KEY}"
    REVIEW_EXIT=$?
    if [[ "${REVIEW_EXIT}" -eq 3 ]]; then
      write_backoff "${BACKOFF_DURATION}"
      REMAINING=$(backoff_remaining_min)
      log "Claude制限検出（レビュー）— ${REMAINING}分後に自動再開 (${ISSUE_KEY})"
      notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開します\n> *${ISSUE_KEY}* ${ISSUE_SUMMARY}"
    elif [[ "${REVIEW_EXIT}" -eq 0 ]]; then
      REVIEW_RESULT=$(read_result)
      log "レビューセッション完了: ${ISSUE_KEY} — ${REVIEW_RESULT}"
      notify ":mag: [claude-auto] レビュー完了: *${ISSUE_KEY}*\n> ${ISSUE_SUMMARY}\n> ${REVIEW_RESULT}"
    else
      log "WARN: review.sh 異常終了 (${ISSUE_KEY})"
      notify ":warning: [claude-auto] レビュー異常終了: *${ISSUE_KEY}* — ログを確認してください"
    fi
    ;;

  verify)
    log "動作確認セッション起動: ${ISSUE_KEY} (${ISSUE_SUMMARY})"

    "${SCRIPT_DIR}/verify.sh" "${ISSUE_KEY}"
    VERIFY_EXIT=$?
    if [[ "${VERIFY_EXIT}" -eq 3 ]]; then
      write_backoff "${BACKOFF_DURATION}"
      REMAINING=$(backoff_remaining_min)
      log "Claude制限検出（動作確認）— ${REMAINING}分後に自動再開 (${ISSUE_KEY})"
      notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開します\n> *${ISSUE_KEY}* ${ISSUE_SUMMARY}"
    elif [[ "${VERIFY_EXIT}" -eq 0 ]]; then
      VERIFY_RESULT=$(read_result)
      log "動作確認セッション完了: ${ISSUE_KEY} — ${VERIFY_RESULT}"
      notify ":ballot_box_with_check: [claude-auto] 動作確認処理: *${ISSUE_KEY}*\n> ${ISSUE_SUMMARY}\n> ${VERIFY_RESULT}"
    else
      log "WARN: verify.sh 異常終了 (${ISSUE_KEY})"
      notify ":warning: [claude-auto] 動作確認処理異常終了: *${ISSUE_KEY}* — ログを確認してください"
    fi
    ;;

  wait)
    log "ユーザー待機中 (確認待ち: ${WAITING_COUNT}件)"
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
