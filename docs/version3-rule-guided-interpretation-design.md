# ECG Diagnostic Assistant Version 3

## Rule-guided ECG Interpretation Engine 設計

## 1. 位置付け

Version 3 は画像全体をAIが診断する仕組みではない。現在登録済みの57ルールが、医師が次に確認すべき所見を決定する適応型の読影ナビゲータである。

診断候補、鑑別、追加検査、初期対応は、引き続き既存のルールエンジンだけが生成する。画像処理は入力候補の提示に限定し、画像、未承認の推定値、信頼度だけから診断を成立させない。

```text
心電図画像
  ↓
初期確認（撮影品質など、既存ルールが要求する入力）
  ↓
Question Orchestrator
  ├─ 現在の確認済み所見を57ルールへ仮評価
  ├─ requiredInputs / missingInputs を収集
  └─ 次に必要な質問を1つ選択
  ↓
医師が回答・修正・判定困難を選択
  ↓
再評価して次の質問を選択
  ↓
既存ルールエンジン
  ↓
診断候補 → 鑑別 → 追加確認 → 追加検査 → 初期対応
```

## 2. 変更しない境界

- 57ルールの医学条件、閾値、Rule ID、優先度、出力文言を変更しない。
- 新しい医学知識、疾患、治療、推測を追加しない。
- `matched`、`not_matched`、`insufficient_data`、`not_applicable` の既存判定状態を維持する。
- 未入力を正常・陰性として扱わない。
- PIN認証、画像の端末内処理、外部送信禁止を維持する。
- OpenAIおよび外部AIを通常経路へ戻さない。

## 3. 責務の分離

### 入力補助層

画像表示と、将来のローカル画像処理による所見候補を扱う。候補は `pending` のままではルール入力にしない。医師が承認または修正した値だけを確認済み所見へ昇格する。

### Question Orchestrator

診断しない。既存ルールのメタデータと評価結果から、次の質問、質問理由、関連Rule IDを返す。

### 既存Rule Engine

確認済み所見だけを入力として、従来どおり診断候補、鑑別、追加確認、追加検査、初期対応、Red Flagを計算する。

## 4. データ契約

利用側が扱う最小契約は次の形とする。

```ts
type NextQuestion = {
  id: string;
  title: string;
  reason: string;
  required: boolean;
  dependsOnRule: string[];
};
```

実装時は、決定過程を監査できるよう次の情報を付加する。

```ts
type RuleGuidedQuestion = NextQuestion & {
  inputKeys: string[];
  source:
    | "required_input"
    | "missing_input"
    | "competing_rule"
    | "safety_confirmation";
  state: "ready" | "blocked" | "answered" | "skipped" | "not_applicable";
  priority: number;
  severity: EcgRuleSeverity;
};

type ConfirmedFinding = {
  inputKey: string;
  value: unknown;
  reviewState: "confirmed" | "modified" | "indeterminate";
  source: "clinician" | "local_candidate";
  reviewedAt: string;
};

type RuleGuidanceSnapshot = {
  currentQuestion: RuleGuidedQuestion | null;
  queuedQuestions: RuleGuidedQuestion[];
  matchedRuleIds: string[];
  insufficientRuleIds: string[];
  competingRuleIds: string[];
  completedInputKeys: string[];
  unresolvedInputKeys: string[];
};
```

`indeterminate` は陰性回答ではない。対応するルールは原則 `insufficient_data` のままとし、不足情報と追加確認を保持する。

## 5. 質問定義レジストリ

ルール本文から画面を自動生成せず、既存の入力キーと既存UI部品を結ぶ明示的なレジストリを用意する。

```ts
type RuleInputQuestionDefinition = {
  inputKey: string;
  questionId: string;
  title: string;
  answerControl: string;
  existingStepId: string;
};
```

このレジストリは医学ロジックを持たない。質問文、回答UI、保存先の対応だけを管理する。57ルールの全 `requiredInputs` と `optionalInputs` が、既存入力または明示的な未対応項目へ対応していることを自動検査する。

## 6. 次の質問の決定手順

1. 医師確認済み所見だけで57ルールを評価する。
2. `matched`、`insufficient_data`、競合中のルールから未解決の `requiredInputs` と `missingInputs` を収集する。
3. 回答済み、明示的に `not_applicable` となった入力、同一質問の重複を除外する。
4. 入力キーを質問レジストリへ変換する。
5. 既存の緊急度、既存の優先度、必須入力かどうか、Rule ID、question IDの順で安定ソートする。
6. 先頭を `currentQuestion`、残りを監査可能なキューとして返す。
7. 回答後に全体を再評価し、固定された次画面へ進まず、新しい最優先質問を選ぶ。

独自の医学的重み付けは追加しない。並び順は既存ルールの `severity` と `priority` をそのまま利用する。

## 7. 分岐の考え方

分岐条件は既存ルールが既に要求している入力だけで構成する。

- QRS幅がWideとして確認された場合だけ、既存のRBBB、LBBB、IVCD関連入力を候補にする。
- QRS幅がWideでないことが確認された場合、脚ブロック詳細画面を表示しない。ただし「未入力」をWideなしへ変換しない。
- RBBB候補が成立または情報不足の場合、既存ルールが要求するV1・V2、波形、装着位置の確認を提示する。
- P波が確認され、関連ルールに不足入力がなければ、不要なAF専用画面を表示しない。
- STが正常として医師確認され、競合ルールや未解決の安全確認がなければ、STEMI詳細画面を表示しない。
- QTが正常として医師確認され、関連する不足入力がなければ、QT延長詳細画面を表示しない。

画面を出さないことと陰性判定は別である。質問を省略できるのは、回答済み所見から既存ルール上 `not_applicable` と説明できる場合だけとする。

## 8. UI構成

通常画面は次の要素に絞る。

1. 心電図画像
2. 現在の質問
3. 「なぜ確認するか」
4. 関連する既存Rule ID
5. 回答、修正、判定困難
6. 現在までの確認済み所見

詳細画面では、質問キュー、発火ルール、不足入力、競合ルール、除外された分岐と理由を表示する。

固定14 STEPは安全な全項目レビューとして残し、通常経路では適応型質問を優先する。「全項目を確認」からいつでも開けるようにする。医師はナビゲータが提示していない所見も手動追加できる。

進捗は14項目の消化率ではなく、現在成立し得るルールの必須質問が何件解決したかで表す。未解決の緊急ルールがある場合は完了扱いにしない。

## 9. 安全性

- 緊急所見は全質問終了を待たず、既存ルールが成立した時点で表示する。
- 競合候補を質問選択の都合で削除しない。
- 電極装着異常や画像品質制限がある場合も、既存方針どおり候補とlimitationsを保持する。
- 「判定困難」「スキップ」は正常に変換しない。
- ローカル画像処理の候補は、医師承認前に質問回答や診断入力へ使用しない。
- ルールが質問を生成できない場合は黙って終了せず、未対応入力キーと関連Rule IDを詳細画面に表示する。

## 10. 説明可能性

質問ごとに次を記録する。

- なぜ今この質問が必要か。
- どのRule IDが要求したか。
- どの入力が不足していたか。
- 回答によって、どの分岐が有効または `not_applicable` になったか。

最終結果では既存のExplainable Rule Engine表示を維持し、使用Rule、判定理由、除外理由、不足情報、追加確認を提示する。画像モデルのconfidenceを診断のRule confidenceとして表示しない。

## 11. 実装段階

### Phase 1: 質問レジストリの棚卸し

57ルールの全入力キーを既存画面へ対応付け、未対応と重複をレポートする。動作は変更しない。

### Phase 2: Shadow mode

固定14 STEPを維持したまま、裏側で `RuleGuidanceSnapshot` を生成する。既存20症例で、必要質問の欠落、不要質問、順序の安定性を比較する。

### Phase 3: 適応型UI

機能フラグ配下で1問ずつ表示する。全項目レビューへの退避経路を維持する。

### Phase 4: 受入確認

57ルールと代表20症例で既存診断、緊急度、Red Flagが変化しないことを確認してから通常経路へ切り替える。

## 12. 必須テスト設計

- 57ルールの全必須入力が質問レジストリで解決できる。
- 同じ確認済み所見から常に同じ質問順になる。
- 未入力が正常または陰性へ変換されない。
- Wide QRSなしでは不要な脚ブロック詳細を表示しない。
- ST正常では不要なST詳細を表示しない。
- QT正常では不要なQT延長詳細を表示しない。
- 判定困難では関連ルールが `insufficient_data` と不足情報を保持する。
- 競合ルールが両方保持される。
- 緊急ルールの質問と警告が通常ルールより先に出る。
- ローカル候補のpending、rejectedはルール入力にならない。
- ローカル候補のconfirmed、modifiedだけがルール入力になる。
- 既存20症例の診断候補、緊急度、Red Flag、対応が変わらない。
- 外部API、OpenAI、画像送信が発生しない。

## 13. Version 3 完了条件

- 57ルールが必要とする入力から次の質問を決定できる。
- 不要な入力画面を安全に省略できる。
- 省略理由と質問理由をRule ID単位で追跡できる。
- 医師の承認前に画像候補が診断へ流れない。
- 既存ルールの医学的判定結果が変わらない。
- 固定14 STEPの全項目レビューを安全網として利用できる。

本設計段階では実装、既存挙動の変更、commit、pushを行わない。
