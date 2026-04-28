# Project Status

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-27

## 目的

この文書は、中断後に短時間でプロジェクトの経緯、目的、現在地、次アクションを把握できるようにするための要約である。

フェーズやマイルストーン全体は [roadmap.md](/home/keith/Documents/projects/personal-base/docs/roadmap.md) を正本とする。

## このプロジェクトで作ろうとしているもの

カオナビ、タレントパレットのようなタレントマネジメントサービスを設計している。

ただし、最初から大企業向けの大規模機能を狙うのではなく、必要機能を絞ってベータへ早く到達する方針を採る。

## ここまでの主要判断

### プロダクト方針

- 人材情報を「蓄積する場所」ではなく、「意思決定に使える状態へ整える基盤」として捉える
- 初期は人材データ基盤中心で始める
- AI による助言機能や相談チャットは完成後フェーズの将来拡張として扱う

### ターゲット

- 初期ターゲットは `100 名から 500 名規模の企業`
- 主担当ユーザーは `人事部門 + 管理職`
- 経営層は初期フェーズでは閲覧中心
- 一般社員は、自分の情報や一定範囲の同僚情報を将来的に閲覧できる体験を重視する

### MVP 方針

- MVP の中心ユースケースは `社員台帳と組織図の一元管理`
- 次段階の優先順位は `人材プロフィール更新・自己申告`、その次が `評価情報の集約と閲覧`
- 評価ワークフロー、配置検討、後継者管理、AI 助言は MVP 対象外
- `MVP` から `第 2 フェーズ` までの実装順は `implementation-plan.md` に確定事項として整理済み
- `MVP` の着手単位とチケット粒度、テストケース記述を各単位とセットで進める方針は `implementation-plan.md` に確定事項として整理済み
- `認証・認可基盤` の初期テストケース候補は `auth-authorization-test-cases.md` に整理済みである

### Backlog 管理状況

- Backlog プロジェクト `PMO_PJPERSONALBASE` の初期設定を開始済み
- Backlog 運用ルールの正本は [prompts/backlog-operation-rules.md](/home/keith/Documents/projects/personal-base/docs/prompts/backlog-operation-rules.md) とする
- 初期マイルストーンとして `MVP-基盤構築`、`MVP-業務コア実装`、`Phase 2-拡張機能` を作成済み
- `implementation-plan.md` の着手単位を基準に、MVP の親課題を作成済み
- 直近着手対象として `認証・認可基盤` の子課題を起票済み
- 仕様、設計、ロードマップ、運用ルールの正本は常に `docs/` とし、Backlog は進捗管理と実行管理に使う

### ドメインモデル方針

- 中心エンティティは `Employee`, `Organization`, `Employment`, `RoleAssignment`, `OrganizationLeader`
- `Employment` は独立エンティティとして扱う
- MVP でも兼務を扱う
- 役職はマスタ化する
- `Job Grade` は MVP では持たない
- 上長の正本は `Employment.Manager Employee ID`
- 部門長 / 副部門長は `OrganizationLeader` で別関係として持つ

### 権限モデル方針

- MVP の権限モデルは `RBAC + 組織スコープ`
- `HR_ADMIN` は全社閲覧・更新
- `MANAGER` は `ORGANIZATION_TREE` を持つ
- `MANAGER` は最小範囲の更新権限のみを持つ
- `MANAGER` の閲覧判定は `ORGANIZATION_TREE` 配下の主所属と兼務の両方を含める
- `MANAGER` の通常社員に対する閲覧項目は `ORG_ADMIN` と同一にする
- `ORG_ADMIN` は役職とは別に追加付与できる独立ロールとする
- `ORG_ADMIN` の基本閲覧範囲は `ORGANIZATION_TREE` とし、必要に応じて複数 `RoleAssignment` で広げる
- `ORG_ADMIN` の通常社員に対する閲覧項目は `MANAGER` と同一にする
- `EXECUTIVE_VIEWER` は独立ロールで全社閲覧のみ
- `EXECUTIVE_VIEWER` は通常社員に対して `HR_ADMIN` と同一の閲覧項目を持つ
- `EXECUTIVE_VIEWER` は全社の社員基本情報、顔写真、`profile_free_text`、`WorkHistory` 原文を閲覧できる
- `MANAGER` / `ORG_ADMIN` / `HR_ADMIN` / `EXECUTIVE_VIEWER` は連絡先メールアドレスを閲覧できる
- `HR_ADMIN` と `EXECUTIVE_VIEWER` の差分は、更新権限と論理削除社員の閲覧 / 復元に置く
- `HR_ADMIN` と `EXECUTIVE_VIEWER` は過去の所属履歴も閲覧できる
- `HR_ADMIN` と `EXECUTIVE_VIEWER` の通常社員閲覧項目は、氏名、表示名、メールアドレス、社員番号、入社日、主所属、兼務、過去の所属履歴、役職、雇用区分、生年月日、顔写真、`profile_free_text`、`WorkHistory`、上長、部門長 / 副部門長で固定する
- `HR_ADMIN` は `UserAccount` の有効 / 無効状態を閲覧できる
- `EXECUTIVE_VIEWER` は `UserAccount` の有効 / 無効状態を閲覧しない
- 役職、兼務、所属、在籍状態の本更新は `HR_ADMIN` のみ
- 論理削除社員の閲覧・復元は `HR_ADMIN` と `ORG_ADMIN` に許可する
- 論理削除は退職管理の主手段ではなく、誤登録や無効化のための例外的な管理機能として扱う方向で整理する
- `HR_ADMIN` と `ORG_ADMIN` は、論理削除社員について通常社員と同じ項目を閲覧できる
- ただし、`UserAccount` の有効 / 無効状態は `HR_ADMIN` のみ閲覧できる
- `EMPLOYEE` は同一組織社員の基本情報に加え、自己紹介または業務概要の自由記述テキストを閲覧できる方向で整理する
- `EMPLOYEE` は同一テナント内の全社組織図を閲覧できる
- `EMPLOYEE` は主所属が同じ社員の氏名、表示名、メールアドレス、入社日、主所属、兼務、役職、上長、部門長 / 副部門長、顔写真、`profile_free_text`、`WorkHistory` を閲覧できる
- `EMPLOYEE` に見せる `profile_free_text` は全文表示とする
- `EMPLOYEE` は同僚の `WorkHistory` 全件にアクセスできる
- 標準表示では直近 `1 年 (365 日)` の原文を表示し、それ以前は `AI サマリ` を表示する
- 過去原文も、詳細表示やページングでたどれる前提とする
- `EMPLOYEE` には生年月日、社員番号、雇用区分、論理削除状態、`UserAccount` の有効 / 無効状態、更新者 / 更新日時の内部メタ情報を同僚向けには見せない
- この範囲を `EMPLOYEE` の同僚閲覧項目として固定する
- `MANAGER` と `ORG_ADMIN` は通常社員に対して同一の閲覧項目を持ち、生年月日も含める
- `MANAGER` と `ORG_ADMIN` は過去の所属履歴も補助情報として閲覧できる
- `MANAGER` と `ORG_ADMIN` の通常社員閲覧項目は、氏名、表示名、メールアドレス、社員番号、主所属、兼務、過去の所属履歴、役職、雇用区分、生年月日、顔写真、`profile_free_text`、`WorkHistory`、上長で固定する
- ただし、生年月日の表示範囲は後続フェーズ終盤で再検討する
- `updated_by` / `updated_at` のような更新メタ情報は、現時点では `HR_ADMIN` を含め通常 UI に表示しない
- `HR_ADMIN` 向けの更新メタ情報表示は、将来の監査画面や管理画面で再検討する

### 技術アーキテクチャ方針

- MVP と第 2 フェーズのアプリケーション構成は `モジュラモノリス` を第一候補とする
- アプリケーション実行環境は `Docker Compose` を前提にする
- 主要データストアは `PostgreSQL` を第一候補とする
- バックエンドは `NestJS + TypeScript` で進める
- フロントエンドは `Next.js + TypeScript` で進める
- `Next.js` は `App Router` を前提にする
- ORM / マイグレーションは `Prisma` で進める
- リポジトリ構成は `1 リポジトリ` で進める
- Node.js のパッケージマネージャは `pnpm` で進める
- Lint / Format は `ESLint + Prettier` で進める
- `TypeScript` の `any` 禁止は lint でも検出する
- テスト基盤は、単体テスト / 統合テストに `Vitest`、E2E に `Playwright` を使う
- UI は `Tailwind CSS + 最小自前コンポーネント` を基本にする
- 初期は `Button`, `Input`, `Select`, `Dialog`, `Table`, `Badge` など必要最小限だけ整える
- 追加部品が必要になった場合は `shadcn/ui` を候補にする
- `MUI` と `Ant Design` は初期採用しない
- スタイリング基盤は `Tailwind CSS` で進める
- ディレクトリ構成は `apps/frontend`, `apps/backend`, `docs/`, ルートの `compose.yml`, `package.json`, `pnpm-workspace.yaml`, `.env.example` を基本にする
- `Docker Compose` の初期サービスは `frontend`, `backend`, `db` の 3 つに絞る
- `packages/` は必要になるまで作らない
- `frontend` と `backend` は `REST API` で通信する
- `frontend` は `3000`, `backend` は `3001`, `db` は `5432` を開発時の基本ポートにする
- `backend` の API は `/api` プレフィックスを前提にする
- `frontend` は環境変数で API 接続先を持つ
- 認証は `HttpOnly Cookie` を前提にする
- 開発時は `http://localhost:3000` から `http://localhost:3001` への `CORS + credentials: include` を前提にする
- `backend` 側では `Access-Control-Allow-Credentials: true` を有効にする
- 開発時の Cookie 属性は `SameSite=Lax` を基本にし、`Secure` は本番で有効化する
- 本番では可能な限り同一オリジン寄せを前提にする
- 環境変数は `.env.example` を正本の雛形とし、実値は `.env` または `.env.local` で管理する
- 秘密値は git に含めない
- `frontend` で公開してよい値のみ `NEXT_PUBLIC_` を付ける
- `DATABASE_URL`, `DB_PASSWORD`, `SESSION_SECRET` などの秘密値は `backend` 側だけで使う
- Compose でも `.env` を読む前提にする
- 本番の secrets は将来デプロイ先の secret 機構へ寄せる
- ディレクトリごとの `.env` 配置は、まずルート `.env` を正本にする
- `apps/frontend/.env.local` は必要時のローカル上書きとして使えるようにする
- `apps/backend` 個別の `.env` は必要になるまで作らない
- `TypeScript` を使う実装では `any` を使わないことを厳守する
- 認可はアプリケーション層で `RBAC + 組織スコープ` を一元的に扱う
- 初期の認証方式は `アプリ内認証で開始し、後で SSO を追加する方式` を第一候補とする
- `MVP` はアプリ内認証のみを第一候補とし、`第 2 フェーズ` でも SSO は必須にしない
- SSO は、顧客要件または導入運用上の必要性が明確になった時点で `第 3 フェーズ以降` の追加候補とする
- 認証主体は `Employee` と分離した `UserAccount` を独立で持つ
- MVP の認証は `メールアドレス + パスワード` を第一候補とする
- `UserAccount` のログイン識別子は `login_identifier` とし、連絡先メールアドレスとは分離する
- セッションは `DB 保存のサーバ側セッション` を第一候補とし、発行履歴を DB に残す
- セッションは将来の管理画面からの強制失効に備え、個別に無効化できる前提とする
- 認可判定は `AuthorizationService` に集約する
- 1 ユーザーは複数の `RoleAssignment` を同時保持できる
- `RoleAssignment.scope_id` は `NULL` を使わず、非組織スコープでは `0` を使う
- 認可判定は有効ロールの許可の和集合で扱う
- 初回 `HR_ADMIN` 作成は管理コマンドまたは Seed で行い、手順は文書化する
- 初期は同期処理中心で始め、非同期処理は限定用途に絞る
- 専用検索基盤は初期導入せず、RDB 中心で開始する
- メール送信基盤は初期外部システムに含めず、必要になった時点で追加する
- 初期の外部システム一覧は `ローカルファイル保存` と `CSV 取込 / CSV 出力` を第一候補とする
- 将来追加候補はフェーズ確定ではなく、現時点で想定している候補としてのみ扱う

### 対象データ項目の現時点方針

- `Employee` では、社員番号、氏名、表示名、メールアドレス、生年月日、顔写真、`profile_free_text`、在籍状態を MVP 必須候補としている
- 顔写真はデフォルト画像ありの任意設定
- 社員番号は未設定者や契約社員も扱えるよう拡張余地を持たせる

### 顔写真保存方針

- DB に画像本体は持たず、参照情報のみを持つ
- 初期はローカルファイル保存を第一候補とする
- 将来は別サーバや `S3` 互換ストレージを追加、設定できるようにする
- 保存先は抽象化し、環境で切り替えられるようにする

### 履歴管理方針

- MVP では全変更の汎用履歴ではなく、重要な対象だけ履歴を持つ
- `OrganizationLeader` は履歴前提で扱う
- `Employment` は現在所属の正本とし、過去所属履歴は管理補助情報として必要最小限で扱う
- 過去所属履歴には、少なくとも `organization_id`, `organization_name_snapshot`, `start_date`, `end_date` を残せる形を第一候補とする
- 主所属/兼務、上長、部門長 / 副部門長、在籍状態の現在値を正本管理できるようにする
- 在籍状態の実装値は `NOT NULL` の数値コードを前提とする
- 履歴は事後対応として組織管理者が補正できるようにする
- 退職や離任でも物理削除はせず、在籍状態と履歴で過去データを残す
- 通常の社員一覧、社員詳細、組織図の既定表示は `在職中` を中心にし、`退職` と `休職` は在籍状態で通常画面から外す
- 在籍終了者は通常画面と分離し、既存画面の権限別メニュー追加から専用一覧へ到達できるようにする
- 在籍終了者一覧の閲覧は `HR_ADMIN` と `ORG_ADMIN` に許可する
- 在籍終了者一覧は `退職` と `休職` を同じ一覧で扱い、`status` による絞り込みで見分ける
- UI 上は `退職`, `休職`, `論理削除` を明確に区別して扱う
- `退職` / `休職` の在籍状態変更は `HR_ADMIN` のみが行える
- 論理削除 / 復元は `HR_ADMIN` と `ORG_ADMIN` が行える
- `MANAGER` は `退職` / `休職` の在籍状態変更も論理削除 / 復元も行えない
- `退職` または `休職` へ変更した時点で、対応する `UserAccount` はログイン不可にする
- `退職` または `休職` へ変更した時点で、既存セッションも即時失効させる
- 復帰時の `UserAccount` 再有効化は明示操作で行う
- 復帰時の所属は自動復元せず、`HR_ADMIN` が明示的に再設定する
- 論理削除は退職管理とは分離し、誤登録や無効化の例外用途として残す
- 論理削除時に在籍状態へ `退職` や `休職` は使わず、必要なら `削除` の状態値を使う
- 論理削除社員の閲覧・復元は `HR_ADMIN` と `ORG_ADMIN` が行える
- 論理削除社員の詳細でも、過去所属履歴は引き続き参照できる

### 社員番号ルール

- `Employee ID` は内部の不変 ID とする
- `社員番号` は業務表示用の文字列として扱う
- 既存番号がある場合はその値を優先する
- 未設定時はプレースホルダ番号を自動付与する
- 接頭辞は `TEMP / CONT / EXT` を使う
- `TEMP` は `Temporary`
- `CONT` は `Contract`
- `EXT` は `External`

### 兼務ルール

- 兼務は `Employment` の複数レコードで表現する
- `Is Primary Assignment` で主所属を 1 件だけ示す
- 表示ラベルは `主所属` / `兼務`
- 組織図の標準表示では主所属と兼務の両方を見せる
- 組織詳細画面でも兼務メンバーを表示する
- 兼務表示は全社設定で ON/OFF を切り替える
- 兼務は別組織をまたぐ所属よりも、同一組織内の役割兼任や他部署案件の兼務を中心に扱う
- 兼務を理由に別組織の閲覧範囲を広げない
- ただし、主所属 / 兼務の最終的な見せ方は実際の表示デザイン確認後に見直す前提とする

### 組織図表示方針

- 組織図には `組織名`, `部門長`, `直属メンバー`, `子組織` を表示する
- 必要に応じて人数を表示できる前提とする
- 社員は `顔写真`, `表示名`, `役職`, `主所属 / 兼務` ラベルを表示する
- 部門長 / 副部門長と上長は別概念として扱う
- 部門長 / 副部門長は複数持てる前提とし、標準組織図では `部門長` のみ表示し、複数いる場合は詳細画面で表示する
- ただし、部門長 / 副部門長 / 上長 / 兼務の最終的な見せ方は実装後の表示デザイン確認で見直す前提とする

### プロフィールと業務履歴方針

- `profile_free_text` は MVP に含める
- `profile_free_text` は自己紹介または業務概要を自由に書ける単一欄とする
- `profile_free_text` は本人に加えて `HR_ADMIN` と `MANAGER` が補助更新できる
- MVP ではプレーンテキスト入力を前提とする
- Markdown はオプション機能として `profile_free_text` に限って第 2 フェーズの拡張候補とする
- 第 2 フェーズの Markdown 許可は入力保存を先に扱い、表示時の Markdown レンダリングは後続フェーズへ送る
- そのため、第 2 フェーズでは Markdown 記法を含む入力内容も生テキストのまま表示する前提とする
- `WorkHistory` では Markdown のような自由装飾を入れず、構造化入力を優先する
- `WorkHistory` は第 2 フェーズで導入し、完成形では必須機能とする
- `WorkHistory` が必須である理由は、社員本人が自分のこれまでの仕事や履歴を管理、確認できるようにするためである
- 業務実績の履歴は `WorkHistory` を主に参照し、過去所属履歴は補助情報として扱う
- `WorkHistory` の第一候補項目は `年月`, `業務内容`, `開発環境やツール`, `役割`, `開発チーム人数`, `project_code` とする
- `project_code` は第 2 フェーズでは任意項目とする
- `WorkHistory` は本人に加えて `HR_ADMIN` と `MANAGER` が補助編集できる前提とする
- `WorkHistory` は最初から `updated_by` を持つ
- `updated_by` と `updated_at` は第 2 フェーズで保持するが、通常 UI の表示項目には含めない
- `WorkHistory` は `year_month_to` と `is_current` の両方を持つ
- 同僚も `WorkHistory` を閲覧できる前提とする
- `HR_ADMIN` は全社員の `WorkHistory` 原文を全件閲覧できる
- `MANAGER` は `ORGANIZATION_TREE` 配下社員の `WorkHistory` 原文を全件閲覧できる
- `EMPLOYEE` は主所属が同じ同僚の `WorkHistory` 原文を閲覧できる
- `ORG_ADMIN` は第 2 フェーズでは `WorkHistory` 専用の閲覧主体に含めない
- `EXECUTIVE_VIEWER` は第 2 フェーズでも `WorkHistory` 閲覧対象に含める
- 論理削除社員の `WorkHistory` は `HR_ADMIN` と `ORG_ADMIN` のみ閲覧できる
- `WorkHistory` の AI サマリは、本人のこれまでの業務内容を要約し、他者にスキルをアピールする文章を生成する目的で使う
- AI サマリは本人以外にも公開してよい情報として扱い、同僚や管理者も閲覧できる前提とする
- 同僚は `WorkHistory` 全件にアクセスできるが、標準表示は `直近 1 年の原文 + それ以前の AI サマリ` を第一候補とする
- 過去原文は、詳細表示やページングでたどれる前提とする
- 本人、`HR_ADMIN`、`MANAGER` は、設定した期間単位のページングで `WorkHistory` の原文を全件閲覧できる方向とする
- AI サマリは MVP や第 2 フェーズの必須対象には置かず、`フェーズ 3` の対象とする
- `WorkHistory` の AI サマリを `フェーズ 3` に入れる前提条件は、`WorkHistory` 入力運用、原文閲覧ルール、監査ログ運用が最低限安定していることとする
- AI サマリは都度生成ではなく、`WorkHistory` 登録・更新時に再生成する方向とする
- AI サマリは、履歴全体のサマリ文と、利用ツール・技術を表形式または一覧で見せる方向とする
- AI サマリの文字数は設定値で持ち、実装後に調整できる方向とする
- 初期推奨値として、キャリアサマリは `180〜280 文字`、スキルアピール文は `70〜120 文字` を目安にする
- ツール・技術一覧はカテゴリ別の一覧表示を第一候補とする
- AI サマリの表示順は、`キャリアサマリ` → `スキルアピール文` → `ツール・技術一覧` を第一候補とする
- `WorkHistory` は履歴書出力を見据え、自由装飾よりも構造化入力を優先する
- `LoginHistory` と `EditHistory` は第 2 フェーズで導入する推奨とする
- 第 2 フェーズでは `profile_free_text` の改善、監査の最小導入、`WorkHistory` の登録・閲覧・同僚公開までを優先し、AI サマリは第 3 フェーズ以降へ送る
- `LoginHistory` と `EditHistory` の閲覧は `HR_ADMIN` のみに許可する前提とする
- `EditHistory` の対象エンティティ第一候補は `Employee`, `Employment`, `OrganizationLeader`, `WorkHistory`, `RoleAssignment` とする
- 監査ログの保存先は DB テーブルを基本としつつ、標準出力や syslog に拡張できる形を第一候補とする
- 監査ログの最小カラム案は、`LoginHistory = tenant_id / employee_id / logged_in_at / ip_address / user_agent`、`EditHistory = tenant_id / entity_type / entity_id / action_type / changed_by_employee_id / changed_at / scope_summary` とする
- 監査ログの保持期間第一候補は、`LoginHistory = 365 日`、`EditHistory = 1825 日 (5 年)` とする
- 監査ログの保持期間は、システム設定または管理者向けサービス設定で変更できる方向とする
- `フェーズ 4` の AI 機能優先順位は、`AI 検索 / 推薦` → `AI アドバイス文` → `AI 相談チャット` とする
- `AI 検索 / 推薦` は必要機能として扱うが、AI を使うか通常検索拡張で始めるかは現時点では確定しない

## まだ未決の主論点

- 未決論点の正本は [decision-backlog.md](/home/keith/Documents/projects/personal-base/docs/decision-backlog.md) とする

## 次に進む論点

優先候補は以下。

1. `Employee` 最小 Prisma モデル追加と `UserAccount.employeeId -> Employee.id` relation 反映: 完了
2. 次は初回 auth migration の作成 (`PMO_PJPERSONALBASE-13`) へ進む
3. その後に repository / service 基盤 (`PMO_PJPERSONALBASE-15`) へ進む
4. `認証・認可基盤` の API 実装へ入る
5. `TypeScript` を使う領域では `any` を使わない実装ルールを維持する

### マルチテナント方式の現時点推奨

- 推奨は `共有テーブル型を基本にしつつ、単一テナント専用デプロイにも対応できる方式`
- `tenant_id` は全主要テーブルに持ち、内部の不変 ID として扱う
- 変更が起こりうる識別子は `tenant_code` や `tenant_slug` のような別項目で吸収する

## 再開時の読み順

1. `README.md`
2. `docs/project-status.md`
3. `docs/prompts/resume-instructions.md`
4. `docs/product/domain-model.md`
5. `docs/architecture/tenancy-and-permissions.md`
