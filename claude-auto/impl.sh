#!/usr/bin/env bash
# 実装セッション起動スクリプト
# 使い方: impl.sh <ISSUE_KEY>
#   例:   impl.sh PMO_PJPERSONALBASE-70

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/lib.sh"

cd "${PROJECT_DIR}"

ISSUE_KEY="${1:-}"
if [[ -z "${ISSUE_KEY}" ]]; then
  echo "[impl] 課題キーが指定されていません" >&2
  exit 1
fi

# 課題番号を抽出（ブランチ名のプレフィックスに使用）
ISSUE_NUMBER=$(echo "${ISSUE_KEY}" | grep -oE '[0-9]+$')
BRANCH_FILE="${LOG_DIR}/branch-${ISSUE_KEY}.txt"

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/impl-${ISSUE_KEY}-$(date +%Y%m%d-%H%M%S).log"

PROMPT=$(cat <<PROMPT
## セッション引き継ぎ: 実装セッション

あなたは実装セッション（Codex）です。CLAUDE.md のルールに従って動作してください。

### 担当課題
Backlog 課題キー: ${ISSUE_KEY}

### ブランチ管理（最初に必ず実施）
1. Backlog MCP の get_issue で課題タイトルを取得する
2. 課題タイトルから英語スラグを生成する:
   - 小文字英数字とハイフンのみ（スペース・記号はハイフンに変換）
   - 最大30文字
   - 例: "dev テナント seed スクリプト作成" → "setup-dev-fixtures"
   - ブランチ名: feat/pmo-${ISSUE_NUMBER}-{スラグ}（例: feat/pmo-103-setup-dev-fixtures）
3. git fetch origin でリモートを最新化する
4. ベースブランチ ${IMPL_BRANCH} を最新化する:
   git checkout ${IMPL_BRANCH} && git pull origin ${IMPL_BRANCH}
5. 決定したブランチ名で課題専用ブランチを用意する:
   - リモートに既に存在する場合:
     git checkout {ブランチ名} && git pull origin {ブランチ名}
   - 存在しない場合（新規作成）:
     git checkout -b {ブランチ名} && git push -u origin {ブランチ名}
6. 以降の実装はすべて {ブランチ名} ブランチ上で行う
7. 使用したブランチ名を以下のファイルに書き込む（review.sh が参照する）:
   echo "{ブランチ名}" > ${BRANCH_FILE}

### 実装手順
8. 課題の説明・完了条件を把握し、docs/ の関連設計を参照する
9. 実装を行う（スコープを独断で広げない）
10. 実装完了したら:
   - 変更を {ブランチ名} にコミット・push する
   - Backlog 課題を「処理済み」ステータス + カテゴリ「レビュー待ち」に更新する
   - 実装内容のサマリを Backlog コメントに残す（push した commit hash も記載）
11. 仕様が不明確で進められない場合:
   - Backlog 課題を「処理済み」+ カテゴリ「仕様確認待ち」に更新する
   - 不明点をコメントに明記する
   - exit 2 で終了する（パイプラインが待機状態として扱う）

### 最後に必ず出力すること
作業完了後、必ず最後の行に以下の形式で結果を出力してください（他のテキストの後に単独行で）:

実装完了の場合:
RESULT: 実装完了 → レビュー待ちに更新（実装内容の一言メモ）

仕様確認待ちの場合:
RESULT: 仕様確認待ちに更新（不明点の一言メモ）

### 重要ルール
- スコープを独断で広げない
- 不明点は実装を止めてコメントに記録する
- Backlog 操作は PMO_PJPERSONALBASE プロジェクトのみ
PROMPT
)

RESULT_FILE="${LOG_DIR}/last-result.txt"

echo "[impl] 課題 ${ISSUE_KEY} の実装セッションを開始します"
echo "[impl] ログ: ${LOG_FILE}"

STDERR_FILE="${LOG_DIR}/impl-${ISSUE_KEY}-stderr.tmp"
OUTPUT=$(claude -p "${PROMPT}" --model "${CLAUDE_MODEL}" 2>"${STDERR_FILE}")
EXIT_CODE=$?
STDERR_OUTPUT=$(cat "${STDERR_FILE}" 2>/dev/null || true)
rm -f "${STDERR_FILE}"

echo "${OUTPUT}" | tee -a "${LOG_FILE}"
[[ -n "${STDERR_OUTPUT}" ]] && echo "${STDERR_OUTPUT}" >> "${LOG_FILE}"

# Claude 制限エラーの検出
COMBINED="${OUTPUT}${STDERR_OUTPUT}"
if [[ "${EXIT_CODE}" -ne 0 ]] && is_rate_limited "${COMBINED}"; then
  echo "RESULT: Claude制限により中断 — バックオフ後に自動再開します" > "${RESULT_FILE}"
  echo "[impl] Claude制限を検出 (exit=3)"
  exit 3
fi

# RESULT: 行を抽出して保存（pipeline.sh が読む）
RESULT_LINE=$(echo "${OUTPUT}" | grep "^RESULT:" | tail -1 || true)
if [[ "${EXIT_CODE}" -ne 0 && -z "${RESULT_LINE}" ]]; then
  echo "RESULT: エラー終了（詳細不明: exit=${EXIT_CODE}）" > "${RESULT_FILE}"
else
  echo "${RESULT_LINE:-RESULT: 完了（詳細不明）}" > "${RESULT_FILE}"
fi

echo "[impl] セッション終了 (exit=${EXIT_CODE})"
exit "${EXIT_CODE}"
