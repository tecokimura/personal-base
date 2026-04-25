# Resume Instructions

- Status: Draft
- Owner: Keith / Codex
- Last Updated: 2026-04-24

## 目的

セッションが切れた後に、Codex がこのプロジェクトの設計作業を迷わず再開できるようにする。

## ユーザーが Codex に伝える再開指示

次回のセッション開始時、Keith は Codex に以下のように指示する。

`README.md を読んで対応を再開してください。`

必要に応じて、次も許可する。

`README.md と docs/README.md を読んで、未完了の設計作業を再開してください。`

## Codex が再開時に行うこと

1. `README.md` を読む
2. `docs/roadmap.md` を読む
3. `docs/project-status.md` を読む
4. `docs/decision-backlog.md` を読む
5. `docs/implementation-plan.md` を読む
6. `docs/prompts/collaboration-rules.md` を読み、意思決定境界を確認する
7. `docs/README.md` を読む
8. 直近で確定済みの内容を `docs/product/vision.md`、`docs/product/target-users.md`、`docs/product/core-usecases.md`、`docs/product/domain-model.md`、`docs/architecture/tenancy-and-permissions.md` で確認する
9. `docs/decision-backlog.md` の先頭課題、または `implementation-plan.md` の先頭作業から、現在の次ステップを特定する
10. 論点が曖昧な場合は、確定事項にするか残タスクにするかを Keith に確認する
11. 選択が必要な論点であれば、選択肢を整理して Keith に確認する
12. 確定済み内容は文書へ反映し、`README.md`、`docs/roadmap.md`、`docs/project-status.md`、`docs/decision-backlog.md`、`docs/implementation-plan.md` を必要に応じて更新する

## 現在の再開ポイント

現時点の次論点は、`認証・認可基盤` の実装を続け、`Employee` の最小 Prisma モデルを追加して `UserAccount.employeeId -> Employee.id` relation を実コードへ反映することである。

理由:

- `vision.md`、`target-users.md`、`core-usecases.md`、`domain-model.md`、`tenancy-and-permissions.md` の主要方針は整理済み
- MVP は `社員台帳と組織図の一元管理` に絞られている
- 兼務ルール、権限スコープ、社員番号ルール、顔写真保存方式、履歴管理の大枠は整理済み
- 一般社員には、同一組織の同僚に対して基本情報に加えて仕事の分かる表示を持たせたい意図がある
- 兼務は別組織所属ではなく、同一組織内の役割兼任や案件兼務として扱う前提が整理済みである
- 入力方式としては、自己紹介でも業務概要でも自由に書ける単一欄 `profile_free_text` が第一候補になっている
- `profile_free_text` は MVP に含める方向で整理済みである
- `profile_free_text` は本人に加えて `HR_ADMIN` と `MANAGER` が補助更新できる方向で整理済みである
- `profile_free_text` の Markdown はオプション機能として第 2 フェーズで扱う方向で整理済みである
- 第 2 フェーズの Markdown は入力保存を先に扱い、表示時のレンダリングは第 3 フェーズ以降へ送る方向で整理済みである
- `WorkHistory` は第 2 フェーズで導入し、完成形では必須機能として扱う
- `WorkHistory` が必須である理由は、社員本人が自分のこれまでの仕事や履歴を管理、確認できるようにするためである
- `WorkHistory` は本人に加えて `HR_ADMIN` と `MANAGER` が補助編集でき、同僚も閲覧できる方向で整理済みである
- `WorkHistory` は最初から `updated_by` を持つ方向で整理済みである
- `WorkHistory` の AI サマリは、本人の業務履歴要約とスキルアピール文の自動生成を目的とする方向で整理済みである
- AI サマリは本人以外にも公開してよい情報として扱う方向で整理済みである
- 同僚には、直近 `1 年 (365 日)` までは `WorkHistory` の原文をそのまま表示し、それ以前は AI サマリを表示する方向で整理済みである
- 原文表示の直近期間は設定で変更できる方向で整理済みである
- 本人、`HR_ADMIN`、`MANAGER` は、設定期間ごとのページングで `WorkHistory` の原文を全件閲覧できる方向で整理済みである
- `WorkHistory` の AI サマリは MVP や第 2 フェーズでは必須にせず、`フェーズ 3` の対象として扱う方向で整理済みである
- `WorkHistory` の AI サマリを `フェーズ 3` に入れる前提条件は、`WorkHistory` 入力運用、原文閲覧ルール、監査ログ運用が最低限安定していることとする方向で整理済みである
- `WorkHistory` の AI サマリは都度生成ではなく、登録または更新時に再生成する方向で整理済みである
- AI サマリは、履歴全体のサマリ文と、利用ツール・技術の一覧を見せる方向で整理済みである
- AI サマリの文字数は設定値で持ち、実装後に調整できる方向で整理済みである
- 初期推奨値として、キャリアサマリは `180〜280 文字`、スキルアピール文は `70〜120 文字` を目安にする方向で整理済みである
- AI サマリの表示順は、`キャリアサマリ` → `スキルアピール文` → `ツール・技術一覧` を第一候補とする方向で整理済みである
- `WorkHistory` は履歴書出力を見据え、Markdown のような自由装飾よりも構造化入力を優先する方向である
- `LoginHistory` と `EditHistory` は第 2 フェーズで導入する推奨が整理済みである
- 第 2 フェーズは、`profile_free_text` 改善、監査の最小導入、`WorkHistory` の登録・閲覧・同僚公開までを扱い、AI サマリは第 3 フェーズ以降で扱う方向で整理済みである
- `EditHistory` の対象エンティティ第一候補は `Employee`, `Employment`, `OrganizationLeader`, `WorkHistory`, `RoleAssignment` で整理済みである
- 監査ログの保存先は DB テーブルを基本としつつ、標準出力や syslog に拡張できる形で整理する方向である
- 監査ログの最小カラム案は `LoginHistory` と `EditHistory` それぞれに整理済みである
- 監査ログの保持期間第一候補は `LoginHistory = 365 日`、`EditHistory = 1825 日 (5 年)` で、設定変更可能とする方向で整理済みである
- マルチテナント方式は、共有テーブル型を基本にしつつ、単一テナント専用デプロイにも対応できる方向で整理済みである
- MVP と第 2 フェーズのアプリケーション構成は `モジュラモノリス` を第一候補とする方向で整理済みである
- 主要データストアは `PostgreSQL` を第一候補とする方向で整理済みである
- 初期の認証方式は `アプリ内認証で開始し、後で SSO を追加する方式` を第一候補とする方向で整理済みである
- `MVP` はアプリ内認証のみを第一候補とし、`第 2 フェーズ` でも SSO は必須にしない方向で整理済みである
- SSO は、顧客要件または導入運用上の必要性が明確になった時点で `第 3 フェーズ以降` の追加候補とする方向で整理済みである
- 認証主体は `Employee` と分離した `UserAccount` を独立で持つ方向で整理済みである
- MVP の認証は `メールアドレス + パスワード` を第一候補とする方向で整理済みである
- `UserAccount` のログイン識別子は `login_identifier` とし、連絡先メールアドレスとは分離する方向で整理済みである
- セッションは `DB 保存のサーバ側セッション` を第一候補とし、発行履歴を DB に残す方向で整理済みである
- セッションは将来の管理画面からの強制失効に備え、個別に無効化できる前提で整理済みである
- 認可判定は `AuthorizationService` に集約する方向で整理済みである
- 1 ユーザーは複数の `RoleAssignment` を同時保持できる方向で整理済みである
- 顔写真保存は初期はローカルファイル保存を第一候補とし、将来は別サーバや `S3` 互換ストレージへ切り替え可能にする方向で整理済みである
- メール送信基盤は初期外部システムに含めず、必要になった時点で追加する方向で整理済みである
- 初期の外部システム一覧は `ローカルファイル保存` と `CSV 取込 / CSV 出力` を第一候補とする方向で整理済みである
- 将来追加候補はフェーズ確定ではなく、現時点で想定している候補としてのみ扱う方向で整理済みである
- 完成後フェーズでは、AI アドバイス文や AI 相談チャットも将来拡張候補として扱う方向である
- AI アドバイス文、AI 相談チャット、AI 検索 / 推薦は `フェーズ 4` の候補として扱う方向で整理済みである
- `フェーズ 4` の AI 機能優先順位は、`AI 検索 / 推薦` → `AI アドバイス文` → `AI 相談チャット` の順で整理済みである
- `AI 検索 / 推薦` は必要機能として扱うが、AI を使うか通常検索拡張で始めるかは未確定のまま残す方向で整理済みである
- `MVP` の実装順と `第 2 フェーズ` までの確定実装順は `implementation-plan.md` を正本として整理済みである
- 実行環境は `Docker Compose`、主要データストアは `PostgreSQL` を前提にする方向で整理済みである
- バックエンドは `NestJS + TypeScript`、フロントエンドは `Next.js + TypeScript` で進める方針で確定済みであり、`Next.js` は `App Router` 前提である
- ORM / マイグレーションは `Prisma` で進める方針で確定済みである
- リポジトリ構成は `1 リポジトリ` で進める方針で確定済みである
- Node.js のパッケージマネージャは `pnpm` で進める方針で確定済みである
- Lint / Format は `ESLint + Prettier` で進め、`TypeScript` の `any` 禁止は lint でも検出する方針で確定済みである
- テスト基盤は、単体テスト / 統合テストに `Vitest`、E2E に `Playwright` を使う方針で確定済みである
- UI は `Tailwind CSS + 最小自前コンポーネント` を基本にし、初期は `Button`, `Input`, `Select`, `Dialog`, `Table`, `Badge` など必要最小限を整え、追加部品が必要になった場合は `shadcn/ui` を候補にし、`MUI` と `Ant Design` は初期採用しない方針で確定済みである
- スタイリング基盤は `Tailwind CSS` で進める方針で確定済みである
- ディレクトリ構成は `apps/frontend`, `apps/backend`, `docs/`, ルートの `compose.yml`, `package.json`, `pnpm-workspace.yaml`, `.env.example` を基本にする方針で確定済みである
- `Docker Compose` の初期サービスは `frontend`, `backend`, `db` に絞り、`packages/` は必要になるまで作らない方針で確定済みである
- `frontend` と `backend` は `REST API` で通信し、開発時の基本ポートは `frontend=3000`, `backend=3001`, `db=5432`、`backend` の API は `/api` プレフィックスを前提にする方針で確定済みである
- `frontend` は環境変数で API 接続先を持つ方針で確定済みである
- 認証は `HttpOnly Cookie` を前提にし、開発時は `http://localhost:3000` から `http://localhost:3001` への `CORS + credentials: include` を使う方針で確定済みである
- `backend` 側では `Access-Control-Allow-Credentials: true` を有効にし、開発時の Cookie 属性は `SameSite=Lax`、`Secure` は本番で有効化する方針で確定済みである
- 本番では可能な限り同一オリジン寄せを前提にする方針で確定済みである
- 環境変数は `.env.example` を正本の雛形とし、実値は `.env` または `.env.local` で管理し、秘密値は git に含めない方針で確定済みである
- `frontend` で公開してよい値のみ `NEXT_PUBLIC_` を付け、`DATABASE_URL`, `DB_PASSWORD`, `SESSION_SECRET` などは `backend` 側だけで使う方針で確定済みである
- Compose でも `.env` を読み、本番の secrets は将来デプロイ先の secret 機構へ寄せる方針で確定済みである
- ディレクトリごとの `.env` 配置は、まずルート `.env` を正本にし、`apps/frontend/.env.local` は必要時のローカル上書き、`apps/backend` 個別の `.env` は必要になるまで作らない方針で確定済みである
- `TypeScript` を使う実装では `any` を使わないことを厳守する方向で整理済みである
- `認証・認可基盤` では、主キー / 外部キーは `integer`、状態値 / 種別値は `smallint`、列挙値は `10, 20, 30...` 刻みで定義する方針で整理済みである
- `認証・認可基盤` の最小 API は `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, `GET /api/me/roles` の 4 本で整理済みである
- `認証・認可基盤` の最小 DTO は `LoginRequestDto`, `AuthSessionResponseDto`, `RoleItemDto`, `MyRolesResponseDto`, `ApiErrorResponseDto` で整理済みである
- `認証・認可基盤` の状態遷移は、`ログイン成功`, `ログアウト`, `退職 / 休職`, `復帰` まで整理済みである
- `MVP` の着手単位、チケット粒度、テストケース記述を各単位とセットで進める方針は `implementation-plan.md` に確定事項として整理済みである
- `認証・認可基盤` のチケット分解、実装開始順、最初の動く縦切り、次の着手単位へ進む条件は `implementation-plan.md` に整理済みである
- `組織管理`, `社員台帳管理`, `組織図表示` の詳細設計たたき台は `architecture/` 配下に追加済みである
- 組織図には `組織名`, `部門長`, `直属メンバー`, `子組織` を表示する方向で整理済みである
- `EMPLOYEE` は同一テナント内の全社組織図を閲覧できる方向で整理済みである
- `EMPLOYEE` は主所属が同じ社員の氏名、表示名、主所属、兼務、役職、顔写真、`profile_free_text`、`WorkHistory` を閲覧できる方向で整理済みである
- `MANAGER` の閲覧判定は `ORGANIZATION_TREE` 配下の主所属と兼務の両方を含める方向で整理済みである
- `ORG_ADMIN` の基本閲覧範囲は `ORGANIZATION_TREE` とし、必要に応じて複数 `RoleAssignment` で広げる方向で整理済みである
- `EXECUTIVE_VIEWER` は全社の社員基本情報、`profile_free_text`、`WorkHistory` 原文を閲覧できる方向で整理済みである
- 論理削除社員の閲覧・復元は `ORG_ADMIN` に加えて `HR_ADMIN` にも許可する方向で整理済みである
- 組織図の `部門長 / 副部門長`, `上長`, `主所属 / 兼務` の最終的な見せ方は実装後のデザイン確認で見直す前提である
- `閲覧権限制御` の主要論点は整理済みであり、残りは生年月日再検討、本人公開範囲設定、AI サマリ具体仕様、更新メタ情報表示などの後続論点に寄せている
- `EMPLOYEE` には、同僚の氏名、表示名、メールアドレス、入社日、主所属、兼務、役職、上長、部門長 / 副部門長、顔写真、`profile_free_text`、`WorkHistory` を見せる方向で整理済みである
- `EMPLOYEE` の `WorkHistory` は全件アクセス可能だが、標準表示は `直近 1 年の原文 + それ以前の AI サマリ` を第一候補として整理済みである
- `MANAGER / ORG_ADMIN` は通常社員に対して同一の閲覧項目を持ち、過去の所属履歴も補助情報として閲覧できる方向で整理済みである
- `HR_ADMIN / EXECUTIVE_VIEWER` は通常社員に対して同一の閲覧項目を持ち、過去の所属履歴も閲覧できる方向で整理済みである
- `HR_ADMIN` のみ `UserAccount` の有効 / 無効状態を閲覧でき、他ロールには見せない方向で整理済みである
- `退職` と `休職` は在籍状態で管理し、通常画面から外す
- 在籍終了者一覧は `HR_ADMIN` と `ORG_ADMIN` が見られ、既存画面の権限別メニュー追加から到達する
- 在籍終了者一覧は `退職` と `休職` を同じ一覧で扱い、`status` で絞り込む
- `退職` または `休職` へ変更した時点で、対応する `UserAccount` はログイン不可になり、既存セッションも即時失効する
- 復帰時の `UserAccount` 再有効化は明示操作で行い、所属は自動復元せず `HR_ADMIN` が再設定する
- 論理削除は退職管理とは分離し、必要なら在籍状態には `削除` の状態値を使う
- 論理削除社員の詳細でも過去所属履歴は参照できる
- 次は `認証・認可基盤` の実装を続け、`Employee` の最小 Prisma モデル追加と relation 反映を行う。その後に初回 migration へ進む
- 曖昧な論点は、確定事項にするか残タスクにするかを Keith に確認してから進める

## 再開時の注意

- Codex は、未確認の選択肢を確定事項として書かない
- スコープ、優先順位、方針選択は必ず Keith に確認する
- まずはベータ到達を優先する方針を維持する
- 中断後は、まず `docs/project-status.md` で現状を把握してから詳細文書へ入る
