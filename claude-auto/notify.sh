#!/usr/bin/env bash
# Slack 通知スクリプト
# 使い方: notify.sh "メッセージ本文"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

MESSAGE="${1:-}"

if [[ -z "${MESSAGE}" ]]; then
  echo "[notify] メッセージが空です" >&2
  exit 1
fi

if [[ -z "${SLACK_WEBHOOK_URL}" ]]; then
  echo "[notify] SLACK_WEBHOOK_URL 未設定 — コンソール出力のみ: ${MESSAGE}"
  exit 0
fi

curl -s -X POST "${SLACK_WEBHOOK_URL}" \
  -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg text "${MESSAGE}" '{"text": $text}')"

echo "[notify] Slack 送信完了"
