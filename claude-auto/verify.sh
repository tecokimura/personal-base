#!/usr/bin/env bash
# 動作確認セッション起動スクリプト
# 使い方: verify.sh <ISSUE_KEY>
#   例:   verify.sh PMO_PJPERSONALBASE-81
#
# ユーザーの動作確認コメントを読んで:
#   OK     → ステータスを「完了」に更新
#   修正依頼 → 新規課題を「実装待ち」で起票し、現課題は完了にする

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[verify] 課題キーが指定されていません" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/verify-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"
RESULT_FILE="${LOG_DIR}/last-result.txt"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: 動作確認セッション

あなたは動作確認セッションです。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}
実装ベースブランチ: ${IMPL_BRANCH}

### 手順

#### Step 1: 課題とコメントを確認する
1. Backlog MCP の get_issue で課題詳細（タイトル・説明・完了条件）を取得する
2. get_issue_comments でコメント一覧を取得し、最新コメントの投稿者と内容を確認する

#### Step 2: ユーザーコメントがあるか判定する
「実装完了」「レビュー完了」「レビューOK」「動作確認OK・完了にしました」など、AI セッションが書いた定型コメントはユーザーコメントとして扱わない。

**ユーザー（人間）から明示的な確認コメントがある場合 → Step 3A へ**
**ユーザーコメントがない or AI の定型コメントのみの場合 → Step 3B へ**

#### Step 3A: ユーザーコメントがある場合
コメント内容に従って対応する:
- 「OK」「問題なし」「完了」など承認の場合:
  → 課題を「完了」（statusId=4）に更新し、「ユーザー確認OK・完了にしました」とコメントする
- 修正依頼・不具合報告が含まれる場合:
  → 新規課題を PMO_PJPERSONALBASE に起票する（件名: 「[修正] 元課題概要 — 修正内容」、カテゴリ: 実装待ち）
  → 元課題（${ISSUE_KEY}）を「完了」に更新し、「修正依頼を新規課題 XXX に起票しました」とコメントする

#### Step 3B: ユーザーコメントがない場合（自律判断モード）
ユーザーが確認できない状況でも対応済みなら完了にする。以下を確認する:

1. git log ${IMPL_BRANCH}..HEAD -- で実装コミットが存在するか確認する（ブランチが分かる場合）
2. または git log --all --oneline | grep -i "${ISSUE_KEY の番号}" で関連コミットを探す
3. 課題の完了条件と実装内容を照合し、以下のいずれかを判断する:

   **対応済みと判断できる場合**（完了条件を満たすコミットが存在する）:
   → 課題を「完了」（statusId=4）に更新する
   → 「実装内容・コミットログを確認。完了条件が満たされているため対応済みと判断して完了にしました」とコメントする

   **判断が難しい場合**（コミットが見当たらない、完了条件と実装内容が一致しない）:
   → 「仕様確認待ち」カテゴリを付けて、理由をコメントする

### 最後に必ず出力すること
作業完了後、必ず最後の行に以下の形式で結果を出力してください:

完了にした場合:
RESULT: 動作確認OK → 完了にしました（判断根拠の一言）

修正依頼の場合:
RESULT: 修正依頼あり → 新規課題 PMO_PJPERSONALBASE-XX を起票・元課題を完了にしました

仕様確認待ちにした場合:
RESULT: 判断不可 → 仕様確認待ちに更新（理由の一言）

### 重要ルール
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
- スコープを独断で広げない
PROMPT
)

echo "[verify] 課題 ${ISSUE_KEY} の動作確認セッションを開始します"
echo "[verify] ログ: ${LOG_FILE}"

STDERR_FILE="${LOG_DIR}/verify-${ISSUE_KEY}-stderr.tmp"
OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}") && EXIT_CODE=0 || EXIT_CODE=$?
STDERR_OUTPUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"

echo "${OUTPUT}" | tee -a "${LOG_FILE}"
[[ -n "${STDERR_OUTPUT}" ]] && echo "${STDERR_OUTPUT}" >> "${LOG_FILE}"

COMBINED="${OUTPUT}${STDERR_OUTPUT}"
if [[ "${EXIT_CODE}" -ne 0 ]] && is_rate_limited "${COMBINED}"; then
  echo "RESULT: Claude制限により中断 — バックオフ後に自動再開します" > "${RESULT_FILE}"
  echo "[verify] Claude制限を検出 (exit=3)"
  exit 3
fi

RESULT_LINE=$(echo "${OUTPUT}" | grep "^RESULT:" | tail -1 || true)
if [[ "${EXIT_CODE}" -ne 0 && -z "${RESULT_LINE}" ]]; then
  echo "RESULT: エラー終了（詳細不明: exit=${EXIT_CODE}）" > "${RESULT_FILE}"
else
  echo "${RESULT_LINE:-RESULT: 完了（詳細不明）}" > "${RESULT_FILE}"
fi

echo "[verify] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
