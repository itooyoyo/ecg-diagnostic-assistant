# ECG Diagnostic Assistant Version 3 特徴抽出エンジン設計

> **設計変更（2026-08-06）**: 本文のPolyline、RR、QT延長形状候補などを含む旧案は廃止された。Version 3の正式な設計は `version3-feature-candidate-pipeline-design.md` とし、波形デジタイザー、mm・ms測定、QT・J点計測はVersion 4へ延期する。

## 1. 目的と境界

Version 3は、Version 3-1で得た誘導別Polylineから、波形の「特徴候補」だけを端末内で抽出する。画像解析層は診断名、鑑別、追加検査、初期対応、Red Flagを生成しない。

今回の設計は、従来案に含まれていたmm換算、QT実測、心拍数などの数値計測より前に置く候補抽出段階である。グリッドは画像補正と形状比較に利用できるが、ST偏位をmmへ換算しない。QTは時間を測定せず、延長を疑う形状候補だけを返す。

通常経路ではOpenAI、外部API、画像送信を使用しない。診断は、医師が承認または修正した所見を入力として、既存57ルールだけが行う。

## 2. 処理フロー

```text
原画像
  ↓ 端末内処理
画像品質評価・補正
  ↓
12誘導領域候補
  ↓
誘導別Polyline
  ↓
正規化された形状・拍候補
  ↓
特徴候補
  ↓
医師レビュー（承認／修正／削除）
  ↓ 承認・修正済みだけ
RuleEngineInputMapper
  ↓
既存57ルール
```

特徴候補から既存ルールへ直接接続してはならない。`suggested`は表示専用であり、診断計算には使わない。

## 3. 抽出対象

### 3.1 画像・配置

- 画像品質
- 12誘導位置

### 3.2 リズム・形態候補

- RR規則性
- QRS幅候補（数値ではなく`narrow_candidate | wide_candidate | indeterminate`）
- RSR'候補
- 深いS候補
- 高いR候補
- ST上昇候補
- ST低下候補
- 陰性T候補
- 尖鋭T候補
- 巨大陰性T候補
- QT延長候補（QT時間は出力しない）
- Q波候補

対象外は、診断、STのmm値、QT/QTc実測、P波解析、Wellens判定、Brugada判定、電解質判定、治療提案である。

## 4. モジュール責務

```text
lib/ecg-features/local/
  contracts.ts                 候補・レビュー状態・根拠の型
  feature-pipeline.ts          段階実行、中断、誘導別失敗の集約
  beat-candidate-detector.ts   拍境界の候補（確定計測はしない）
  morphology-normalizer.ts     基線と振幅を画像座標内で正規化
  rr-regularity.ts             RR規則性候補
  qrs-morphology.ts            幅、RSR'、深いS、高いRの候補
  st-morphology.ts             上昇・低下候補
  t-morphology.ts              陰性、尖鋭、巨大陰性候補
  qt-morphology.ts             QT延長形状候補
  q-wave-morphology.ts         Q波候補
  candidate-review-mapper.ts   医師レビュー状態の管理
  rule-input-mapper.ts         承認・修正済み所見だけを既存入力へ変換
```

各抽出器は診断モジュールをimportしない。`rule-input-mapper.ts`だけが画像処理側と既存入力型の境界になる。

## 5. データ契約

```ts
type FeatureKind =
  | "rr_regularity"
  | "qrs_width_candidate"
  | "rsr_prime"
  | "deep_s"
  | "tall_r"
  | "st_elevation_candidate"
  | "st_depression_candidate"
  | "t_inversion_candidate"
  | "peaked_t_candidate"
  | "giant_negative_t_candidate"
  | "qt_prolongation_candidate"
  | "q_wave_candidate";

type ReviewStatus =
  | "suggested"
  | "accepted"
  | "edited"
  | "rejected"
  | "indeterminate";

type FeatureCandidate = {
  id: string;
  feature: FeatureKind;
  lead: LeadName | null;
  value: string | boolean | null;
  confidence: "high" | "medium" | "low";
  status: ReviewStatus;
  evidence: {
    sourceRegion: { x: number; y: number; width: number; height: number };
    polylineRange?: { startIndex: number; endIndex: number };
    beatIndexes: number[];
  };
  limitations: string[];
  extractorVersion: string;
};
```

`confidence`は画像上の特徴抽出の安定性であり、疾患確率や診断confidenceではない。数値のmm、ms、QTcをこの契約へ追加しない。

### 5.1 誘導位置

各領域は`identified | ambiguous | not_identifiable`を個別に返す。一つの誘導が不明でも他誘導の抽出は続ける。不明な誘導名を配置順だけで確定しない。

### 5.2 画像品質

品質は`pass | limited | stop`と具体的理由を返す。`limited`では利用可能な誘導・特徴だけを抽出し、`stop`では特徴候補を生成しない。品質不良を陰性または正常へ変換しない。

## 6. 特徴抽出の考え方

医学的な新規閾値は定義しない。各抽出器は、既存入力済みルールが必要とする所見ラベルに対応する画像形状候補を作るだけとする。採用する閾値は、別途検証データと先生の承認を得て設定する。

- RR規則性: 複数の拍候補間隔のばらつきから`regular_candidate | irregular_candidate | indeterminate`を返す。
- QRS幅候補: 画像上の相対的な横幅から候補を返し、ms値は返さない。
- RSR'、深いS、高いR、Q波: 基線に対する形状候補と根拠Polyline区間を返す。
- ST上昇・低下: 基線に対する方向候補を返し、mm値を返さない。
- T波候補: 極性・相対形状の候補を返す。疾患名へ変換しない。
- QT延長候補: QRS開始候補からT終末候補までの相対的形状だけを扱い、QT、QTc、補正式を返さない。

単一拍だけの候補、波形境界が曖昧な候補、ノイズ依存の候補は低confidenceまたは`indeterminate`にする。未検出を陰性確定へ変換しない。

## 7. 医師レビュー

候補ごとに以下を表示する。

- 特徴名と対象誘導
- confidence（高／中／低）
- 原画像上の根拠領域
- Polyline上の根拠区間
- 制限事項
- 承認、修正、削除

初期状態は必ず`suggested`とする。医師操作は候補単位で行い、一括承認は設けない。修正時は元候補と医師修正値を別々に保持する。再抽出で医師修正を上書きしない。

## 8. 既存57ルールとの接続

`RuleEngineInputMapper`の不変条件:

- `accepted`: 対応する既存所見へ変換する。
- `edited`: 医師修正値を変換する。
- `suggested`: 渡さない。
- `rejected`: 渡さない。
- `indeterminate`: 正常扱いせず、追加確認項目として扱う。
- 誘導不明・品質停止: その画像由来所見を渡さない。

既存57ルールのRule ID、IF/THEN条件、優先度、診断候補、鑑別、追加検査、初期対応、Red Flag、Clinical Pearlは変更しない。画像解析層にこれらの生成責務を持たせない。

## 9. UI案

通常画面は次の順序とする。

1. 原画像と抽出Polyline
2. 誘導領域・特徴根拠のオーバーレイ
3. 誘導別の特徴候補カード
4. 承認／修正／削除
5. 「承認済み所見で再解析」

例:

```text
ST上昇候補  V2
画像解析候補の信頼度: 高
[根拠を表示]
[承認] [修正] [削除]
```

画像解析候補とルールエンジンの診断結果は、同じ見た目・同じ見出しで混在させない。

## 10. 安全性・プライバシー

- Client ComponentまたはWeb Worker内だけで処理する。
- OpenAI、`/api/ecg/analyze`、外部`fetch`を呼ばない。
- 画像、Polyline、特徴候補をログや永続Storageへ保存しない。
- 画像変更・中断・画面離脱時にBitmap、Object URL、中間Bufferを破棄する。
- PIN認証と匿名化確認は維持する。
- 抽出失敗を正常所見へ置換しない。

## 11. 将来実装時のテスト境界

1. 12誘導位置と各誘導の失敗状態を個別に返す。
2. 品質`stop`では特徴抽出器を呼ばない。
3. ST候補にmm値が含まれない。
4. QT候補にms値、QTc、補正式が含まれない。
5. 全候補の初期状態が`suggested`である。
6. `suggested`だけでは既存ルールが発火しない。
7. `accepted`と`edited`だけが既存入力へ渡る。
8. `rejected`と`indeterminate`が診断入力へ渡らない。
9. 一誘導の失敗で全体処理を停止しない。
10. 画像解析結果に診断名、鑑別、検査、対応が含まれない。
11. 外部通信、OpenAI、画像保存が発生しない。
12. 既存57ルールの回帰結果が変わらない。

## 12. 今回の完了範囲

今回は設計書だけを追加する。特徴抽出器、UI、型、Rule Engine接続、依存関係は実装しない。commit・pushも行わない。
