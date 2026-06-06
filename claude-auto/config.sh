#!/usr/bin/env bash
# claude-auto パイプライン設定

# プロジェクト
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKLOG_PROJECT_KEY="PMO_PJPERSONALBASE"

# リトライ設定
IMPL_RETRY_MAX=4         # 実装セッションの最大リトライ回数
IMPL_RETRY_DELAY=300     # リトライ間隔（秒）

# ログ
LOG_DIR="${PROJECT_DIR}/claude-auto/logs"

# Slack（webhook URL は環境変数 SLACK_WEBHOOK_URL で渡す、または .env に記載）
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Claude モデル（claude -p に渡す --model 引数）
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-6}"

# cron ポーリング間隔の目安（分）— crontab 設定時の参考値
# CRON_INTERVAL_MIN=15
