#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ "$cmd" == git\ push* ]]; then
  branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current)
  if [[ ! "$branch" =~ ^feat/pmo-[0-9]+-[a-z0-9-]{1,30}$ ]]; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"push対象ブランチが規約外: $branch\"}}"
    exit 0
  fi
fi
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
