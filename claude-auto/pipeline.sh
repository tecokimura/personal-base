#!/usr/bin/env bash
# claude-auto パイプライン エントリポイント
# cron から定期実行する: */30 * * * * /path/to/pipeline.sh >> /path/to/logs/cron.log 2>&1
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

# .claude/settings.local.json を読み込ませるためプロジェクトルートに移動
cd "${PROJECT_DIR}"

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

# Claude レート制限バックオフ中は即終了
if in_backoff; then
  REMAINING=$(backoff_remaining_min)
  log "バックオフ中 — あと約${REMAINING}分でスキップ解除"
  exit 0
fi

# アイドルバックオフ中は即終了（処理対象なし時に Claude 起動を抑制）
if in_idle_backoff; then
  REMAINING=$(idle_backoff_remaining_min)
  log "アイドルバックオフ中 — あと約${REMAINING}分でチェック再開（手動解除: rm claude-auto/logs/idle-backoff.txt）"
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

# サブシェルをバックグラウンドで実行しながら1分ごとにハートビートログを出す
# 使い方: run_with_heartbeat "ラベル" コマンド [引数...]
run_with_heartbeat() {
  local label="$1"
  shift
  "$@" &
  local PID=$!
  local ELAPSED=0
  while kill -0 "${PID}" 2>/dev/null; do
    sleep 60
    ELAPSED=$((ELAPSED + 1))
    log "${label} 実行中... (${ELAPSED}分経過)"
  done
  wait "${PID}" && return 0 || return $?
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
   a. 「修正待ち」カテゴリ (statusId=2: 処理中)
   b. 「レビュー待ち」カテゴリ (statusId=3: 処理済み)
   c. 「実装待ち」カテゴリ (statusId=1: 未対応)
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
log "Backlog を確認中（Claude 応答待ち）..."

# Claude に Backlog を確認させて JSON 結果を取得
ORCH_STDERR="${LOG_DIR}/orch-stderr.tmp"
RAW_OUTPUT=$(claude -p "${ORCHESTRATOR_PROMPT}" --model "${CLAUDE_MODEL}" 2>"${ORCH_STDERR}")
ORCH_EXIT=$?
ORCH_STDERR_OUTPUT=$(cat "${ORCH_STDERR}" 2>/dev/null || true)
rm -f "${ORCH_STDERR}"
[[ -n "${ORCH_STDERR_OUTPUT}" ]] && echo "${ORCH_STDERR_OUTPUT}" >> "${PIPELINE_LOG}"
log "オーケストレーター応答受信 (exit=${ORCH_EXIT})"

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

log "Backlog確認完了 — next_action=${NEXT_ACTION} issue=${ISSUE_KEY:-なし} (${REASON})"

# 課題キーを短縮表示（PMO_PJPERSONALBASE-95 → PMO-95）
short_key() { echo "${1}" | sed 's/PMO_PJPERSONALBASE-/PMO-/'; }

# Slack リンク形式（<URL|表示テキスト>）
issue_link() { echo "<https://tecotec.backlog.com/view/${1}|$(short_key "${1}")>"; }

case "${NEXT_ACTION}" in
  impl)
    clear_idle_backoff
    SHORT=$(short_key "${ISSUE_KEY}")
    LINK=$(issue_link "${ISSUE_KEY}")
    log "→ 実装セッション起動: ${SHORT} (${ISSUE_SUMMARY})"

    run_with_heartbeat "実装 [${SHORT}]" "${SCRIPT_DIR}/impl.sh" "${ISSUE_KEY}" && IMPL_EXIT=0 || IMPL_EXIT=$?

    if [[ "${IMPL_EXIT}" -eq 3 ]]; then
      write_backoff "${BACKOFF_DURATION}"
      REMAINING=$(backoff_remaining_min)
      log "Claude制限検出 — ${REMAINING}分後に自動再開 (${SHORT})"
      notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開\n*${LINK}* ${ISSUE_SUMMARY}"
    elif [[ "${IMPL_EXIT}" -eq 2 ]]; then
      IMPL_RESULT=$(read_result)
      log "仕様確認待ちに移行 → ユーザー確認が必要です (${SHORT})"
      notify ":rotating_light: [claude-auto] *【要対応】仕様確認待ち*\n*${LINK}* ${ISSUE_SUMMARY}\n不明点: ${IMPL_RESULT}"
    elif [[ "${IMPL_EXIT}" -ne 0 ]]; then
      log "WARN: impl.sh 失敗 (exit=${IMPL_EXIT}) — 次回 cron で再試行します (${SHORT})"
      notify ":warning: [claude-auto] *実装失敗* — 次回 cron で再試行します\n*${LINK}* ${ISSUE_SUMMARY}"
    else
      IMPL_RESULT=$(read_result)
      if echo "${IMPL_RESULT}" | grep -q "仕様確認待ち"; then
        log "仕様確認待ちに移行（exit=0）→ ユーザー確認が必要です (${SHORT})"
        notify ":rotating_light: [claude-auto] *【要対応】仕様確認待ち*\n*${LINK}* ${ISSUE_SUMMARY}\n不明点: ${IMPL_RESULT}"
      else
        log "実装完了 → Backlogをレビュー待ちに更新しました (${SHORT})"
        notify ":white_check_mark: [claude-auto] *実装完了* → レビュー待ち\n*${LINK}* ${ISSUE_SUMMARY}\n内容: ${IMPL_RESULT}"
      fi
    fi
    ;;

  review)
    clear_idle_backoff
    SHORT=$(short_key "${ISSUE_KEY}")
    LINK=$(issue_link "${ISSUE_KEY}")
    log "→ レビューセッション起動: ${SHORT} (${ISSUE_SUMMARY})"

    run_with_heartbeat "レビュー [${SHORT}]" "${SCRIPT_DIR}/review.sh" "${ISSUE_KEY}" && REVIEW_EXIT=0 || REVIEW_EXIT=$?
    if [[ "${REVIEW_EXIT}" -eq 3 ]]; then
      write_backoff "${BACKOFF_DURATION}"
      REMAINING=$(backoff_remaining_min)
      log "Claude制限検出（レビュー）— ${REMAINING}分後に自動再開 (${SHORT})"
      notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開\n*${LINK}* ${ISSUE_SUMMARY}"
    elif [[ "${REVIEW_EXIT}" -eq 0 ]]; then
      REVIEW_RESULT=$(read_result)
      if echo "${REVIEW_RESULT}" | grep -q "レビューNG\|修正待ち"; then
        log "レビューNG → Backlogを修正待ちに更新しました (${SHORT})"
        notify ":x: [claude-auto] *レビューNG* → 修正待ち（自動修正実装を開始します）\n*${LINK}* ${ISSUE_SUMMARY}\n指摘: ${REVIEW_RESULT}"
      elif echo "${REVIEW_RESULT}" | grep -q "仕様確認待ち"; then
        log "仕様確認待ちに移行 → ユーザー確認が必要です (${SHORT})"
        notify ":rotating_light: [claude-auto] *【要対応】仕様確認待ち*\n*${LINK}* ${ISSUE_SUMMARY}\n確認事項: ${REVIEW_RESULT}"
      else
        log "レビューOK → Backlogを動作確認待ちに更新しました (${SHORT})"
        notify ":rotating_light: [claude-auto] *【要対応】動作確認待ち* — 動作確認をお願いします\n*${LINK}* ${ISSUE_SUMMARY}\nレビュー結果: ${REVIEW_RESULT}"
      fi
    else
      log "WARN: review.sh 異常終了 (exit=${REVIEW_EXIT}) (${SHORT})"
      notify ":warning: [claude-auto] *レビュー異常終了* — ログを確認してください\n*${LINK}* ${ISSUE_SUMMARY}"
    fi
    ;;

  verify)
    clear_idle_backoff
    SHORT=$(short_key "${ISSUE_KEY}")
    LINK=$(issue_link "${ISSUE_KEY}")
    log "→ 動作確認セッション起動: ${SHORT} (${ISSUE_SUMMARY})"

    run_with_heartbeat "動作確認 [${SHORT}]" "${SCRIPT_DIR}/verify.sh" "${ISSUE_KEY}" && VERIFY_EXIT=0 || VERIFY_EXIT=$?
    if [[ "${VERIFY_EXIT}" -eq 3 ]]; then
      write_backoff "${BACKOFF_DURATION}"
      REMAINING=$(backoff_remaining_min)
      log "Claude制限検出（動作確認）— ${REMAINING}分後に自動再開 (${SHORT})"
      notify ":hourglass: [claude-auto] Claude制限中 — 約${REMAINING}分後に自動再開\n*${LINK}* ${ISSUE_SUMMARY}"
    elif [[ "${VERIFY_EXIT}" -eq 0 ]]; then
      VERIFY_RESULT=$(read_result)
      log "動作確認完了 → Backlogを更新しました (${SHORT})"
      notify ":ballot_box_with_check: [claude-auto] *動作確認処理完了*\n*${LINK}* ${ISSUE_SUMMARY}\n結果: ${VERIFY_RESULT}"
    else
      log "WARN: verify.sh 異常終了 (exit=${VERIFY_EXIT}) (${SHORT})"
      notify ":warning: [claude-auto] *動作確認異常終了* — ログを確認してください\n*${LINK}* ${ISSUE_SUMMARY}"
    fi
    ;;

  wait)
    log "処理対象なし — ユーザー確認待ち ${WAITING_COUNT}件 → 2時間後に再チェック"
    write_idle_backoff 7200
    if [[ "${WAITING_COUNT}" -gt 0 ]]; then
      notify ":pause_button: [claude-auto] *ユーザー確認待ち ${WAITING_COUNT} 件* — Backlog を確認してください\n仕様確認待ち または 動作確認待ち のカテゴリを確認してください"
    fi
    ;;

  idle)
    write_idle_backoff 7200
    log "処理対象なし（全課題完了 or 未登録）→ 2時間後に再チェック"
    ;;

  *)
    log "WARN: 不明な next_action=${NEXT_ACTION}"
    ;;
esac

log "パイプライン完了 — 次回: $(date -d '+30 minutes' '+%H:%M') ごろ自動実行"
