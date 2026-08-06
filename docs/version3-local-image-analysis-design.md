# ECG Diagnostic Assistant Version 3 設計

> **設計変更（2026-08-06）**: 本文の波形抽出、心拍数、QRS幅実測、QT/QTc、ST偏位測定をVersion 3の対象から除外した。Version 3の正式な設計は `version3-feature-candidate-pipeline-design.md` とし、これらの計測・デジタイズ機能はVersion 4へ延期する。

## 1. 位置づけ

Version 3 は、匿名化された12誘導心電図画像から客観的な計測値・波形特徴・所見候補を端末内で推定するローカル画像解析機能である。画像解析エンジンは診断、鑑別、追加検査、初期対応を生成しない。

診断関連の出力は、医師が承認または修正した所見だけを入力として、Version 2 の既存ルールエンジンが生成する。推定候補、未承認値、判定不能値をルールエンジンへ渡してはならない。

通常動作では OpenAI、外部AI、外部API、画像アップロードを使用しない。画像、補正画像、中間波形、計測結果は端末メモリ内だけで扱い、永続保存、教師データ化、学習を行わない。

## 2. 処理フローと責任境界

```text
原画像（端末内）
  ↓
画像補正候補の生成（原画像は保持）
  ↓
画像品質評価 ── 不十分 → 推定停止・理由表示・医師入力へ
  ↓
12誘導領域の認識 ── 不明 → 誘導判定不能・医師入力へ
  ↓
波形抽出（基線、QRS開始・終了、J点、T終末）
  ↓
計測値・所見候補の生成
  ↓
医師レビュー（承認／修正／削除／判定困難）
  ↓ 承認・修正済み所見だけ
Version 2 ルールエンジン
  ↓
診断候補・鑑別・追加確認・追加検査・初期対応
```

境界を以下の3層に固定する。

1. `LocalImagePipeline`: 画像補正、品質評価、誘導認識、波形抽出、計測を担当する。
2. `FindingCandidateReview`: 推定候補と根拠領域を表示し、医師の承認状態を管理する。
3. `RuleEngineInputMapper`: `accepted` と `edited` だけを既存入力型へ変換する。`suggested`、`rejected`、`indeterminate` は診断入力へ含めない。

## 3. 非対象

Version 3では以下を実装対象外とする。

- 画像からの診断、鑑別、治療提案
- OpenAI、クラウド推論、外部画像送信
- P波、Wellens、Brugada、U波、R on T の画像推定
- 教師データ保存、学習、自己改善
- 未入力値の正常補完
- 画像だけを根拠とする診断確定
- Version 2 の医学ルール、閾値、優先順位の変更

## 4. コンポーネント構成

将来実装時は `lib/ecg-image/local/` 配下に責務を分離する。

```text
lib/ecg-image/local/
  contracts.ts                 共通型、単位、候補状態
  pipeline.ts                  各段階の順序制御と中断
  image-decoder.ts             JPEG/PNG/WebPの端末内decode
  preprocessing.ts             回転・台形・濃淡・ノイズ補正
  quality-evaluator.ts         品質指標と停止判定
  grid-detector.ts             方眼、校正情報の候補
  lead-layout-detector.ts      12誘導領域とラベル候補
  waveform-extractor.ts        各誘導の波形座標列
  fiducial-detector.ts         基線/QRS/J点/T終末候補
  measurements/
    heart-rate.ts
    qrs.ts
    qt.ts
    st.ts
    axis.ts
    r-wave-progression.ts
  candidate-mapper.ts          UI候補Schemaへの変換
  worker-client.ts             Web Workerとの通信
workers/
  ecg-local-analysis.worker.ts 重い画像処理の実行
```

現在の `OnnxLocalEcgImageAnalysisAdapter` は公開境界として維持できるが、検証済みモデルがない間は `modelAvailable: false` を維持する。古いOpenAI Providerと廃止済みAPI Routeを通常経路へ再接続しない。

## 5. 共通データ契約

### 5.1 解析セッション

```ts
type LocalAnalysisSession = {
  sessionId: string;
  sourceImage: ImageBitmap;
  correctedImage?: ImageBitmap;
  stage: "quality" | "lead_layout" | "heart_rate" | "qrs" | "qt" | "st" | "complete";
  aborted: boolean;
  pipelineVersion: string;
};
```

`sourceImage` は比較用に保持し、補正処理で上書きしない。画面離脱、画像変更、中断、解析完了後の明示的破棄時に `ImageBitmap.close()`、Object URL revoke、中間Buffer解放を行う。

### 5.2 候補

```ts
type CandidateStatus = "suggested" | "accepted" | "edited" | "rejected" | "indeterminate";

type LocalFindingCandidate<T> = {
  id: string;
  field: string;
  value: T | null;
  unit?: "bpm" | "ms" | "mm" | "degree";
  confidence: "high" | "medium" | "low";
  status: CandidateStatus;
  sourceLead?: LeadName;
  sourceRegion?: { x: number; y: number; width: number; height: number };
  methodVersion: string;
  limitations: string[];
};
```

confidence は診断確率ではなく、画像処理上の計測候補の信頼度である。UIでは必ず「画像解析候補の信頼度」と表示する。

### 5.3 誘導認識

```ts
type LeadRegion = {
  lead: LeadName | null;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: "high" | "medium" | "low";
  status: "identified" | "ambiguous" | "not_identifiable";
  alternatives: LeadName[];
};
```

Ⅰ、Ⅱ、Ⅲ、aVR、aVL、aVF、V1〜V6を個別に管理する。位置が不明な領域へ誘導名を推測入力せず、`not_identifiable` と「誘導判定不能」を返す。

### 5.4 波形ランドマーク

```ts
type FiducialCandidates = {
  baseline: PointSeries | null;
  qrsOnsets: Point[];
  qrsOffsets: Point[];
  jPoints: Point[];
  tEnds: Point[];
  limitations: string[];
};
```

各ランドマークは複数拍の候補を保持し、単一拍だけで代表値を確定しない。校正、紙送り速度、感度が不明なときは、実単位への換算を行わず判定困難とする。

## 6. 画像補正

前処理は原画像から派生画像を生成する。補正前後を医師が切り替えて確認できるようにする。

- グレースケール変換
- コントラスト候補の生成
- 回転角推定と回転補正候補
- 用紙四隅推定と台形補正候補
- 方眼周期・方向の検出
- 波形を損なわない範囲のノイズ除去
- ぼけ、反射、影、画像切れ、解像度、傾き、台形歪みの定量評価

自動補正値と品質指標は再現可能な形で結果に含める。強い平滑化、細線消失、ST基線変形につながる処理は採用しない。

## 7. 品質停止ゲート

品質評価結果は `pass | limited | stop` とする。

- `pass`: 次段階へ進む。
- `limited`: 解析を続けられる項目だけ候補を生成し、制限事項を付ける。
- `stop`: 波形計測を開始せず、医師入力へ移行する。

停止理由は少なくとも以下を個別に表現する。

- ぼけ
- 反射
- 画像切れ
- 誘導欠損
- 傾き過大
- 台形歪み過大
- 方眼または校正情報を確認できない
- 波形と背景を分離できない
- 解像度不足

複数理由を保持し、単一の「解析失敗」へ丸めない。品質不良時に正常値や既定値を生成しない。

## 8. 段階実装

各Stepは独立したfeature flagの内側で実装し、そのStepの受入条件を満たすまで次へ進まない。

### Step 1: 画像品質

入力: decode済み原画像。

出力: 補正候補、品質指標、`pass | limited | stop`、具体的制限理由。

受入条件:

- JPEG、PNG、WebPを端末内で処理できる。
- 原画像と補正画像を比較できる。
- 品質不良例では後続処理を停止する。
- 外部通信が発生しない。
- 中断とメモリ解放を確認できる。

### Step 2: 誘導認識

入力: Step 1を通過した補正画像。

出力: 12誘導それぞれの領域、認識状態、候補信頼度、代替候補。

受入条件:

- 12誘導を固定順序へ無理に当てはめない。
- 欠損と不明を区別する。
- 誘導不明時は「誘導判定不能」とする。
- 各領域をオーバーレイ表示して医師が確認できる。

### Step 3: 心拍数

入力: 認識済み誘導領域、方眼校正候補、抽出波形。

出力: 心拍数候補、RR系列、RR規則性候補、使用誘導、計測不能理由。

受入条件:

- 複数拍から計測する。
- 校正不明または拍数不足では数値を捏造しない。
- 心拍数とRR規則性を別候補としてレビューできる。

### Step 4: QRS幅

入力: QRS開始・終了候補。

出力: 拍別QRS幅、代表値候補、RBBB候補、LBBB候補、限界。

受入条件:

- QRS幅候補と形態候補を分離する。
- RBBB/LBBBは所見候補に留める。
- QRS境界不明時は判定困難とする。

### Step 5: QT

入力: QRS開始、T終末、RR、校正情報。

出力: QT候補、QTc候補、使用した既存補正式名、T終末の制限。

受入条件:

- QTとQTcを別候補として扱う。
- T終末不明時はQT/QTc候補を生成しない。
- U波推定は行わず、境界不明を制限事項として残す。

### Step 6: ST

入力: 基線、J点、校正情報、誘導領域。

出力: 誘導別ST偏位候補（mm）、測定位置、信頼度、R波進行候補、軸候補。

受入条件:

- 誘導別の値と根拠領域を表示する。
- ST偏位から診断名を生成しない。
- 医師承認前にSTルールを発火させない。

## 9. 医師レビューUI

自動候補は既存の医師入力値を上書きしない。項目ごとに以下を表示する。

- 候補値と単位
- 対象誘導
- 根拠画像領域
- 画像解析候補の信頼度（高／中／低）
- 制限事項
- 承認、修正、削除、判定困難

初期状態は必ず `suggested` とする。一括承認は設けず、候補ごとの確認を原則とする。修正値には候補値と医師値を別々に保持し、再解析時も医師値を暗黙に上書きしない。

## 10. ルールエンジン接続

`RuleEngineInputMapper` は以下の不変条件をテストで保証する。

- `accepted`: 候補値を既存入力へ渡す。
- `edited`: 医師修正値を既存入力へ渡す。
- `suggested`: 渡さない。
- `rejected`: 渡さない。
- `indeterminate`: 正常・陰性へ変換せず、不足情報として扱う。
- 品質 `stop`: 画像由来の全候補を渡さない。

ルールエンジンの関数、Rule ID、優先順位、Red Flag、Clinical Pearl、追加検査、初期対応はVersion 2のまま維持する。

## 11. 端末内実行とセキュリティ

- 画像解析コードはClient ComponentまたはWeb Worker内だけで実行する。
- `/api/ecg/analyze`、OpenAI Provider、外部fetchを呼ばない。
- モデルや静的処理資産が必要な場合は同一オリジンの `/models/ecg/` から取得する。
- Content Security Policyの`connect-src`を拡大しない。
- 画像、Base64、波形座標、解析結果をログへ出さない。
- localStorage、sessionStorage、IndexedDB、Cache Storageへ患者画像を保存しない。
- テレメトリへ画像や所見を送信しない。
- PIN認証と既存の匿名化確認を維持する。

## 12. 実行性能と中断

UIスレッドを塞がないよう、重い処理はWeb Workerへ分離する。各段階は`AbortSignal`を受け取り、画像変更、削除、再切り抜き、画面離脱時に停止できるようにする。

進捗は「画像補正」「品質確認」「誘導認識」「波形抽出」「計測」「候補作成」の段階名で表示する。処理時間の疑似進捗や固定結果は表示しない。

## 13. テスト方針

各Stepで unit、fixture、UI、privacy regression を実行する。fixtureは匿名化済みの検証用画像だけをリポジトリ外または明示的なテスト資産として扱い、患者画像を保存しない。

共通テスト:

1. OpenAI Provider、`/api/ecg/analyze`、外部URLが通常経路から呼ばれない。
2. 原画像が補正処理で変更されない。
3. 中断後に候補がReact stateへ反映されない。
4. 画像変更時にObject URLと中間資産を破棄する。
5. 品質`stop`で後続段階を呼ばない。
6. 判定不能を正常値へ変換しない。
7. `suggested`候補でルールが発火しない。
8. `accepted`と`edited`だけで既存ルールを再計算する。
9. `rejected`候補をルール入力から除外する。
10. Version 2の既存診断結果、Red Flag、優先順位が変わらない。
11. JPEG、PNG、WebPでdecodeできる。
12. PC、430、390、375、320pxで候補と根拠画像を確認できる。
13. `prefers-reduced-motion`を維持する。
14. 既存全テスト、lint、buildが成功する。

段階別の数値精度基準は、検証用正解データと評価計画が確定してから別文書で定義する。精度基準を満たす前に`validatedForClinicalUse`を`true`にしない。

## 14. Feature flagとリリース条件

Version 3の各機能は既定OFFとし、検証完了した段階だけ順次有効化する。

```ts
type LocalPipelineFeatures = {
  quality: boolean;
  leadLayout: boolean;
  heartRate: boolean;
  qrs: boolean;
  qt: boolean;
  st: boolean;
};
```

`enableFutureLocalExtraction`を一度に全面ONにはしない。Stepごとの実装、テスト、lint、build、ブラウザ確認を完了してから次のflagを有効化する。

## 15. Version 3 完了条件

- OpenAIと外部画像送信が通常経路に存在しない。
- 品質不良で安全に停止し、具体的理由を表示する。
- 12誘導の認識状態と根拠領域を表示できる。
- 心拍数、RR規則性、QRS幅、QT/QTc、ST偏位、RBBB/LBBB、軸、R波進行を候補として扱う。
- P波、Wellens、Brugada、U波、R on Tを画像推定しない。
- 医師の承認・修正済み所見だけでVersion 2ルールを再計算する。
- 診断・鑑別・追加検査・初期対応は既存ルールエンジンだけが生成する。
- 画像、教師データ、中間結果を永続保存しない。
- Version 2の全回帰テストが維持される。

本設計段階ではコード、依存関係、manifest、feature flagの値を変更しない。
