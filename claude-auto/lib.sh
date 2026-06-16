#!/usr/bin/env bash
# claude-auto 共通ライブラリ

BACKOFF_FILE="${LOG_DIR}/backoff.txt"
IDLE_BACKOFF_FILE="${LOG_DIR}/idle-backoff.txt"

# Claude の出力にレート制限・使用量制限のキーワードが含まれるか判定
# 引数: 出力テキスト（stdout + stderr を結合して渡す）
# 戻り値: 0=制限あり, 1=制限なし
is_rate_limited() {
  local output="${1:-}"
  echo "${output}" | grep -qiE \
    "rate.?limit|usage.?limit|too many requests|quota exceeded|overloaded|529|Claude is unable|please try again later|capacity"
}

# アイドルバックオフ（処理対象なしのとき Claude 起動を抑制）
in_idle_backoff() {
  if [[ ! -f "${IDLE_BACKOFF_FILE}" ]]; then return 1; fi
  local until now
  until=$(cat "${IDLE_BACKOFF_FILE}")
  now=$(date +%s)
  if [[ "${now}" -lt "${until}" ]]; then return 0; else rm -f "${IDLE_BACKOFF_FILE}"; return 1; fi
}

write_idle_backoff() {
  local duration="${1:-7200}"  # デフォルト2時間
  echo "$(( $(date +%s) + duration ))" > "${IDLE_BACKOFF_FILE}"
}

clear_idle_backoff() { rm -f "${IDLE_BACKOFF_FILE}"; }

idle_backoff_remaining_min() {
  if [[ ! -f "${IDLE_BACKOFF_FILE}" ]]; then echo 0; return; fi
  local until now
  until=$(cat "${IDLE_BACKOFF_FILE}")
  now=$(date +%s)
  local r; r=$(( (until - now) / 60 ))
  echo $(( r > 0 ? r : 0 ))
}

# Claude レート制限バックオフ（エラー時）
# バックオフ状態を書き込む（pipeline.sh から呼ぶ）
# 引数: バックオフ秒数
write_backoff() {
  local duration="${1:-3600}"
  local until=$(( $(date +%s) + duration ))
  echo "${until}" > "${BACKOFF_FILE}"
}

# バックオフ中かどうか確認
# 戻り値: 0=バックオフ中, 1=バックオフ解除済み
in_backoff() {
  if [[ ! -f "${BACKOFF_FILE}" ]]; then
    return 1
  fi
  local until
  until=$(cat "${BACKOFF_FILE}")
  local now
  now=$(date +%s)
  if [[ "${now}" -lt "${until}" ]]; then
    return 0
  else
    rm -f "${BACKOFF_FILE}"
    return 1
  fi
}

# バックオフ残り時間（分）を返す
backoff_remaining_min() {
  if [[ ! -f "${BACKOFF_FILE}" ]]; then
    echo 0; return
  fi
  local until now
  until=$(cat "${BACKOFF_FILE}")
  now=$(date +%s)
  local remaining; remaining=$(( (until - now) / 60 ))
  echo $(( remaining > 0 ? remaining : 0 ))
}
