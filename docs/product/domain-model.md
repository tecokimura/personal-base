# Domain Model

- Status: In Review
- Owner: Keith / Codex
- Last Updated: 2026-04-17

## 目的

サービス内で扱う中心エンティティと関係を整理する。

## 背景

タレントマネジメントでは、社員、組織、評価、スキル、異動、役職などが強く関連する。ここが曖昧だと後続の設計が崩れる。

ただし、今回の MVP は `社員台帳と組織図の一元管理` に絞っているため、最初からすべてのドメインを同じ深さで持つべきではない。まずは MVP を成立させる最小の中心モデルを定義し、その後にスキル、業務履歴、評価へ拡張できる形を目指す。

## 前提

- 社員情報が中核エンティティになる
- 将来的に履歴管理が必要になる可能性が高い
- MVP の中心ユースケースは `社員台帳と組織図の一元管理`
- 主担当ユーザーは `人事部門 + 管理職`
- 一般社員向け機能、スキル、評価、AI 助言は後続フェーズで拡張する余地を持つ

## 決定事項

- MVP の中心エンティティは `Employee`, `Organization`, `Employment`, `RoleAssignment` とする
- `Employee` を社員本人の基本単位とし、組織所属や権限は別概念として切り分ける
- `Organization` は組織図を表す階層構造として扱う
- 雇用情報や在籍状態は `Employee` にべた書きせず、`Employment` として独立させる
- MVP でも兼務を扱う
- 役職は自由文字列ではなく、マスタ化を前提とする
- `Job Grade` は役職と同義にしない限り将来は独立候補だが、MVP では持たない
- 権限や閲覧ロールは、将来の認可設計に接続しやすいよう `RoleAssignment` として独立させる方針とする
- `Evaluation`, `SkillProfile`, `WorkHistory` は MVP の主要エンティティからは外し、後続拡張エンティティ候補として扱う

### MVP で持つべき最小モデル

#### `Employee`

社員本人を表す中心エンティティ。

想定項目候補:

- 社員 ID
- 社員番号
- 氏名
- 表示名
- メールアドレス
- 生年月日
- 顔写真
- 入社日
- 雇用区分
- 在籍状態
- 直属上長に相当する社員参照

#### `Organization`

部署、部門、チームなど組織図のノードを表すエンティティ。

想定項目候補:

- 組織 ID
- 組織名
- 組織コード
- 親組織 ID
- 表示順
- 有効状態
- 組織責任者に相当する社員参照

#### `Employment`

社員の所属、役職、在籍状態など、時点によって変化しうる勤務上の情報を持つエンティティ。

想定項目候補:

- Employment ID
- Employee ID
- Organization ID
- Position Master ID
- Employment Type
- Is Primary Assignment
- Manager Employee ID
- Start Date
- End Date
- Status

#### `RoleAssignment`

アプリ上の利用権限を表すエンティティ候補。

想定項目候補:

- RoleAssignment ID
- Employee ID
- Role Type
- Scope Type
- Scope ID
- Effective From
- Effective To

### エンティティ関係の第一候補

- `Employee` 1 : N `Employment`
- `Organization` 1 : N `Employment`
- `Organization` は自己参照で親子階層を持つ
- `Employee` 1 : N `RoleAssignment`
- `PositionMaster` 1 : N `Employment`

この形にしておくと、将来以下を足しやすい。

- `SkillProfile`
- `WorkHistory`
- `Evaluation`
- `CareerPreference`

### 追加で必要になるマスタ候補

#### `PositionMaster`

役職名を標準化するためのマスタ。

想定項目候補:

- Position Master ID
- Position Code
- Position Name
- Display Order
- Active Flag

## 検討した選択肢

### 1. すべてを `Employee` に集約して持つ

社員テーブルに所属、役職、状態、権限まで寄せる案。初速は速いが、異動、兼務、履歴、権限スコープで破綻しやすい。

### 2. MVP に必要な概念だけ分ける

`Employee`, `Organization`, `Employment`, `RoleAssignment` を分ける案。MVP ではやや設計コストが上がるが、後続拡張に耐えやすい。

### 3. 最初から履歴イベント中心で設計する

異動、組織改編、権限変更をイベントとして強く持つ案。将来性は高いが、初期実装には重すぎる。

現時点では、`2. MVP に必要な概念だけ分ける` を第一候補とする。

理由:

- MVP の単純さと将来拡張のバランスがよい
- `社員台帳と組織図` の実装に必要な単位が明確になる
- 後からスキル、評価、業務履歴を追加しても破綻しにくい

## Open Questions

- 組織責任者を `Organization` に直接持つか、別の関係で持つか
- 一般社員、管理職、人事、経営層の権限スコープを `RoleAssignment` でどこまで表現するか
- 履歴管理を MVP 時点でどこまで持つか
- 兼務時の主所属と副所属をどう表現するか
- `PositionMaster` と `Job Grade` を別マスタにするか

## 次に決めること

- `社員台帳と組織図` の対象データ項目
- 権限スコープの最小単位
- 兼務の表現ルール

## `社員台帳と組織図` の対象データ項目たたき台

MVP では、項目を増やしすぎると入力負荷と設計負荷が上がる。したがって、`MVP 必須`、`あると望ましい`、`後回し候補` に分けて考える。

### `Employee`

#### MVP 必須候補

- Employee ID
- 社員番号
- 氏名
- 表示名
- メールアドレス
- 生年月日
- 顔写真
- 在籍状態

#### あると望ましい候補

- 入社日

#### 後回し候補

- 電話番号
- 住所
- 緊急連絡先
- 学歴
- 自己紹介文

### `Organization`

#### MVP 必須候補

- Organization ID
- 組織名
- 親組織 ID
- 表示順
- 有効状態

#### あると望ましい候補

- 組織コード
- 組織責任者社員 ID

#### 後回し候補

- 組織説明
- コストセンター
- 拠点情報

### `Employment`

#### MVP 必須候補

- Employment ID
- Employee ID
- Organization ID
- Position Master ID
- Employment Type
- Is Primary Assignment
- Manager Employee ID
- Start Date
- Status

#### あると望ましい候補

- End Date

#### 後回し候補

- Job Grade
- 異動理由
- 任用区分
- 出向区分
- 勤務地

### `PositionMaster`

#### MVP 必須候補

- Position Master ID
- Position Name
- Active Flag

#### あると望ましい候補

- Position Code
- Display Order

#### 後回し候補

- Position Level
- 役職カテゴリ

### `RoleAssignment`

#### MVP 必須候補

- RoleAssignment ID
- Employee ID
- Role Type
- Scope Type
- Scope ID

#### あると望ましい候補

- Effective From
- Effective To

#### 後回し候補

- 権限付与理由
- 承認者情報

### 現時点の考え方

- MVP は `社員台帳と組織図` に絞るため、本人確認と組織表示に必要な項目を優先する
- 高機微な個人情報は、MVP では持たないか、最小限に絞る方が安全
- 後続のスキル、業務履歴、評価を見据えても、最初から過剰なプロフィール項目は不要
- 兼務を扱うため、`Employment` の分離は維持する
- 顔写真はデフォルト画像を持ち、任意設定とする
- 社員番号は未設定者も扱えるようにし、初期値や代替値を許容する
- 契約社員など別区分の社員にも対応できるよう、社員番号ルールに拡張余地を持たせる

### ここで Keith の判断が必要な点

- 組織責任者を `Organization` に直接持つか、別の関係で持つか
- 社員番号の生成/初期値ルールをどうするか
- 顔写真の保存方式をどうするか

## 兼務ルールたたき台

MVP でも兼務を扱う前提なので、`Employment` を単なる所属情報ではなく、「社員と組織の関係」を表す単位として扱う。

### 基本方針候補

- 1 人の社員は複数の `Employment` を持てる
- `Employment` ごとに所属組織、役職、上長、状態を持てる
- そのうち 1 件を `主所属` とし、残りを `副所属` とする
- `主所属` は 1 件のみ許可する
- `副所属` は複数件を許可する

### 主所属の扱い

主所属は、以下の基準に使う第一候補とする。

- 社員一覧のデフォルト表示組織
- 組織図での主な所属先
- 権限判定時の基本スコープ
- 人事管理上の代表所属

### 副所属の扱い

副所属は、以下の用途で扱う。

- 兼務先組織への所属表示
- 管理職による兼務メンバー把握
- 将来の権限制御や業務履歴との接続

MVP では、副所属について高度な重み付けや工数配分までは持たない。

また、このプロジェクトで想定する兼務は、社員が多数の部署を横断するケースよりも、部長が他部署の部長を兼任する、執行役員が部長を兼任する、といった役職者の兼任が中心である。この前提により、兼務は例外的な複雑構造ではなく、組織上の役割重複として扱う。

### 上長の扱い

- `Manager Employee ID` は `Employment` ごとに持つ
- これにより、主所属と副所属で別の上長を設定できる
- `Employee` にも直属上長相当の参照を置く余地はあるが、MVP では持たない
- MVP の上長情報の正本は `Employment.Manager Employee ID` とする

### 組織図での見え方

- 組織図の標準表示では、社員は `主所属` に加えて `副所属` も見えるようにする
- ただし、表示上は `主所属` と `兼務` が識別できる必要がある
- 組織詳細画面では副所属メンバーも一覧できるようにする
- 副所属メンバーの表示は全社設定で ON/OFF 切替できるようにする

### データ制約の第一候補

- 同一社員に `Is Primary Assignment = true` の `Employment` は 1 件のみ
- 同一社員は同一組織に対して、有効期間が重複する同種の `Employment` を重複登録しない
- `Manager Employee ID` は原則として同一テナント内の有効な社員を参照する

### MVP でやらないこと

- 兼務比率の管理
- 主所属の自動切替ルール
- 複雑な兼務優先順位
- 兼務ごとの詳細権限カスタマイズ

### 現時点の第一候補

現時点では、以下を第一候補とする。

- 兼務は `Employment` の複数レコードで表現する
- `Is Primary Assignment` で主所属を 1 件だけ示す
- 組織図の標準表示では主所属と副所属の両方を見せる
- ただし、表示ラベルは `主所属` と `兼務` を使って区別する
- 副所属メンバーは組織詳細画面でも表示し、全社設定で ON/OFF 切替できる
- 上長の正本は `Employment.Manager Employee ID` に持つ

### ここで Keith の判断が必要な点

- 組織責任者を `Organization` に直接持つか、別の関係で持つか
- 権限スコープの最小単位をどう置くか
