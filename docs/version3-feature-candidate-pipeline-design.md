# ECG Diagnostic Assistant Version 3

## Feature Candidate Pipeline 正式設計

設計改訂日: 2026-08-06

## 1. 完成目標

Version 3は、心電図画像から限定された「特徴候補」だけを端末内で抽出し、その候補を既存57ルールへ接続して診断支援結果を表示する。

```text
心電図画像
  ↓
画像品質・対応レイアウト確認
  ↓
特徴候補の抽出
  ↓
FeatureCandidateRuleAdapter
  ↓
既存57ルール
  ↓
診断候補・鑑別・追加確認・追加検査・初期対応
  ↓
医師確認・修正後にルールだけ再計算
```

画像解析層は診断名、鑑別、検査、対応、Red Flagを生成しない。これらは既存ルールエンジンだけが生成する。

## 2. Version 3の抽出対象

公開する画像特徴候補は次の9種類に限定する。

1. Wide QRS候補
2. ST上昇候補（誘導別）
3. ST低下候補（誘導別）
4. 陰性T候補（誘導別）
5. 尖鋭T候補（誘導別）
6. RBBB形態候補
7. LBBB形態候補
8. Poor R progression候補
9. 異常Q波候補（誘導別）

内部処理が形状や領域を比較しても、公開結果はこの9種類を超えない。疾患名や新しい医学所見を画像処理側で派生させない。

## 3. Version 4へ延期するもの

- 波形全体のデジタル化
- Polyline生成・表示・保存
- mm測定
- ms測定
- 心拍数自動算出
- RR規則性自動算出
- QRS幅の数値測定
- QT・QTc測定
- J点計測
- ST偏位量の数値測定
- 波形ランドマークの公開

Version 3の型、UI、テストへmm、ms、QT、J点、Polylineを持ち込まない。

## 4. 維持する前処理

特徴候補を安全に扱うため、既存Phase Bの次の処理は入力ゲートとして維持する。

- 画像decodeとプレビュー
- 画像品質評価
- 用紙領域候補
- 回転・台形補正候補
- グリッド有無の候補
- 対応3×4レイアウトの確認
- 12誘導領域候補

誘導名は配置順だけで無条件に確定しない。品質不十分、非対応レイアウト、誘導欠損、領域不明では、その領域に依存する特徴を`indeterminate`として保持し、正常・陰性へ変換しない。

## 5. 責務境界

### LocalFeatureCandidateExtractor

画像と確認済み誘導領域から9種類の候補を生成する。既存ルール、疾患名、臨床背景を参照しない。

### FeatureCandidateRuleAdapter

特徴候補を既存ルール入力へ変換する。新しい閾値や医学条件を持たず、既存入力キーへの対応だけを管理する。

### Existing Rule Engine

既存57ルールを変更せず、診断候補、鑑別、追加確認、追加検査、初期対応、Red Flag、Clinical Pearlを生成する。

### Clinician Review

画像候補の承認、修正、却下、判定困難を管理する。修正後は画像を再処理せず、Adapterと既存ルールだけを再実行する。

## 6. 候補契約

```ts
type Version3FeatureType =
  | "qrs_wide_candidate"
  | "st_elevation_candidate"
  | "st_depression_candidate"
  | "t_inversion_candidate"
  | "peaked_t_candidate"
  | "rbbb_morphology_candidate"
  | "lbbb_morphology_candidate"
  | "poor_r_progression_candidate"
  | "abnormal_q_candidate";

type Version3FeatureCandidate = {
  id: string;
  featureType: Version3FeatureType;
  lead?: LeadName;
  leadGroup?: LeadName[];
  imageConfidence: "high" | "medium" | "low" | "indeterminate";
  reviewStatus: "pending" | "accepted" | "modified" | "rejected" | "indeterminate";
  evidence: {
    imageRegion?: { x: number; y: number; width: number; height: number };
    explanationJa: string;
    limitations: string[];
  };
  extractorVersion: string;
};
```

`estimatedMagnitude`、`estimatedUnit`、波形座標列はVersion 3契約から除外する。`imageConfidence`は画像上で候補を再現できる程度であり、診断確率やRule confidenceではない。

## 7. 候補から57ルールへの接続

Adapterは9種類を、既存エンジンが既に持つ所見入力へ対応付ける。

| 画像特徴候補 | 既存入力への接続方針 |
|---|---|
| Wide QRS | 既存のWide QRS所見へ接続 |
| ST上昇 | 誘導別方向候補と連続誘導情報へ接続 |
| ST低下 | 誘導別方向候補と既存誘導分布へ接続 |
| 陰性T | 既存の誘導別T波形態へ接続 |
| 尖鋭T | 既存の尖鋭T所見へ接続 |
| RBBB形態 | 既存のRBBB候補へ接続 |
| LBBB形態 | 既存のLBBB候補へ接続 |
| Poor R progression | 既存のR波進行／R波消失所見へ接続 |
| 異常Q波 | 既存の病的Q波候補へ接続 |

数値を必要とするルールは、画像候補だけで条件を満たしたことにしない。mm、ms、J点、QT、臨床情報などが不足する場合は、既存どおり`insufficient_data`と不足情報を返す。Version 3候補だけで57ルールすべてが`matched`または`not_matched`になるとは主張しない。

候補の状態別方針:

- `pending`: 暫定入力としてのみ扱い、結果に「画像候補・医師未確認」の制限を付ける。
- `accepted`: 医師確認済み入力として再計算する。
- `modified`: 医師修正値を使用して再計算する。
- `rejected`: ルール入力へ渡さない。
- `indeterminate`: 正常扱いせず、不足情報と追加確認へ残す。

MVPの自動結果表示では`pending`候補を暫定入力として既存ルールへ渡すが、確定所見と混同しない。緊急度を下げる根拠、正常確定、候補除外の根拠には使用しない。医師確認後は同じ57ルールを確認済み入力で再計算する。

## 8. ルール入力の出所

ルール入力には出所を付ける。

```ts
type RuleInputProvenance = {
  source: "image_candidate" | "clinician_confirmed" | "clinician_modified";
  candidateId?: string;
  featureType?: Version3FeatureType;
  lead?: LeadName;
  limitations: string[];
};
```

既存57ルールのIF/THEN条件やRule IDは変更せず、説明画面で「画像候補による暫定入力」か「医師確認済み」かを区別するために使う。

## 9. UI設計

通常画面は次の順序とする。

1. 画像選択・プレビュー
2. 「ローカル特徴候補を抽出」
3. 処理進捗と品質判定
4. 9種類の特徴候補カード
5. 画像候補による暫定ルール結果
6. 医師による承認・修正・却下・判定困難
7. 医師確認後のルール再計算結果

候補カードには特徴名、誘導、画像上の根拠領域、画像候補信頼度、制限事項を表示する。mm・ms・QT・J点・Polylineを表示しない。

結果画面には必ず次を表示する。

> 画像から推定した特徴候補と、登録済みルールに基づく診断支援結果です

併せて「画像解析は診断を行わない」「最終判断は医師が行う」「未確認候補を含む結果か」を表示する。

## 10. 安全条件

- 品質`inadequate`では特徴候補と自動ルール結果を生成しない。
- 非対応レイアウトでは特徴候補を生成しない。
- 誘導不明の候補を特定誘導所見として渡さない。
- 特徴未検出を正常または陰性確定へ変換しない。
- 低confidence候補は自動除外や緊急度低下に使わない。
- 競合候補を削除せず、既存の競合Rule ID表示を維持する。
- 医師修正でRed Flagが消える場合も、変更前候補と変更理由を監査可能にする。
- 固定fixture、モック、`LOCAL_MODEL_NOT_AVAILABLE`を解析成功として扱わない。
- OpenAI、`/api/ecg/analyze`、外部OCR、外部画像送信を使用しない。
- PIN認証と匿名化確認を維持する。

## 11. 実装計画

### Phase 0: 契約と旧経路の整理

- Version 3正式対象を9種類へ固定する。
- Polyline、mm、ms、QT、J点をVersion 3の公開型とUIから除外する。
- 現行のデジタイザー試作は通常経路から外し、Version 4向け実験コードとして隔離する。
- モックAdapterを通常経路へ接続しないテストを維持する。

### Phase 1: Feature Candidate Pipeline

- 既存の画像品質・用紙・3×4領域候補を入力ゲートとして接続する。
- 9種類だけを返す`LocalFeatureCandidateExtractor`契約を実装する。
- 各誘導の失敗を個別に保持する。
- 処理中断と画像変更時のメモリ解放を実装する。

### Phase 2: 特徴抽出器

- Wide QRS、RBBB形態、LBBB形態
- ST上昇、ST低下
- 陰性T、尖鋭T
- Poor R progression、異常Q波

各グループは匿名化fixtureと医師確認済み正解値が揃った段階で個別に有効化する。未検証の抽出器を成功扱いしない。

### Phase 3: FeatureCandidateRuleAdapter

- 9種類と既存入力キーの明示的な対応表を実装する。
- `pending`暫定入力と医師確認済み入力のprovenanceを保持する。
- 数値不足を補完せず、`insufficient_data`へ流す。
- 57/57ルールの評価入口へ接続されることを確認する。
- 既存57ルールの医学条件と回帰結果を変更しない。

### Phase 4: 自動結果と医師レビューUI

- 画像選択後に1つの開始操作で品質評価から暫定結果まで進める。
- 特徴候補と診断支援結果を視覚的に分離する。
- 指定の結果説明文を表示する。
- 医師修正時は画像を再解析せず、Adapterと57ルールだけを再実行する。
- 判定不能理由と不足情報を表示する。

### Phase 5: 検証

- 9種類それぞれに陽性、陰性、判定不能、品質不良fixtureを用意する。
- 誘導別の偽陽性、偽陰性、判定不能を集計する。
- 自動候補と医師修正後で緊急度・Red Flagの消失を監査する。
- OpenAI、外部API、画像送信、永続保存がないことをBrowser Networkで確認する。
- 既存57ルール、代表20症例、全テスト、lint、buildを実行する。

## 12. 受入条件

- 画像から生成される公開候補が9種類だけである。
- 固定値、モック、疑似正常値を通常画面で使用しない。
- 品質不良・非対応レイアウト・誘導不明を正常扱いしない。
- 画像候補から既存57ルールの評価入口へ接続できる。
- 数値不足ルールは`insufficient_data`を保持する。
- 手入力なしで暫定結果を表示できる。
- 医師修正後は画像再解析なしでルール結果を再計算できる。
- 画像解析層が診断名、鑑別、検査、対応を生成しない。
- 結果画面に指定説明文を表示する。
- OpenAI、外部API、画像外部送信がない。
- 既存57ルールの医学ロジックと既存回帰結果が変わらない。

## 13. 今回の変更範囲

今回は設計書の更新だけを行う。型、抽出器、Adapter、UI、feature flag、依存関係、医学ロジックは変更しない。commit・pushも行わない。
