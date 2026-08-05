# ECG Rule Registry

## 目的

この台帳は、現在コード内に存在する判定を追跡可能にするためのVersion 2インデックスである。新しい基準、閾値、疾患、検査、治療は追加しない。IF–THEN、必要入力、出力、追加確認の詳細は[`ecg-rule-catalog.md`](ecg-rule-catalog.md)を正本とする。

## IDと同期方法

- 公開用の安定IDは`ECG-{意味カテゴリ}-{連番3桁}`とする。
- 現在の`Rule-*` IDは移行中の互換IDであり、既存候補との追跡を壊さないため保持する。
- 共通型は`types/ecg-rule.ts`、既存結果を変更せず正規化するAdapterは`data/rule-engine/rule-adapter.ts`に置く。
- ルール条件は既存の各`interpret-*`／`classify`関数が正本である。台帳文言を変更するときは、該当実装と回帰テストを同じ変更で確認する。
- 今回検出した既存ルールは57件。重複実装として削除したものは0件で、PR/徐脈、QRS/脚ブロック、ST/ACSのような複数視点の参照は別ルールとして保持する。

## カテゴリ別棚卸し

| # | カテゴリ | 台帳化済み | 主な実装ファイル | 主な回帰テスト |
|---:|---|---:|---|---|
| 01 | 撮影品質・電極装着 | 1 | `logic/quality/quality.js`, `logic/integration/build-integrated-interpretation.js` | `workflow.test.mjs`, `clinical-cases.test.mjs` |
| 02 | 心拍数・規則性 | 0（単独ルール未分離） | `logic/tachyarrhythmia/classify.js`, `logic/bradyarrhythmia/interpret-brady.js` | `workflow.test.mjs` |
| 03 | P波・心房所見 | 3 | `logic/tachyarrhythmia/classify.js` | `workflow.test.mjs` |
| 04 | PR／PQ | 4 | `logic/bradyarrhythmia/interpret-brady.js` | `bradyarrhythmia.test.mjs` |
| 05 | QRS幅・形態 | 6 | `logic/conduction-interpretation/interpret-conduction.js`, `logic/ventricular-ectopy/interpret-ventricular-ectopy.js` | `conduction.test.mjs`, `ventricular-ectopy.test.mjs` |
| 06 | 電気軸 | 3 | `logic/conduction-interpretation/interpret-conduction.js` | `conduction.test.mjs` |
| 07 | R波進行 | 1 | `logic/interpretation/build-interpretation.js` | `workflow.test.mjs` |
| 08 | 異常Q波 | 1 | `logic/t-wave-interpretation/interpret-t-wave.js`, integration | `t-wave.test.mjs` |
| 09 | ST変化 | 7 | `logic/st-interpretation/interpret-st.js`, `logic/sgarbossa/interpret-sgarbossa.js` | `st-interpretation.test.mjs`, `sgarbossa*.test.mjs` |
| 10 | T波 | 4 | `logic/t-wave-interpretation/interpret-t-wave.js` | `t-wave.test.mjs` |
| 11 | U波 | 2 | `logic/qt-interpretation/interpret-qt.js`, electrolyte integration | `qt-interpretation.test.mjs` |
| 12 | QT／QTc | 3 | `logic/qt-interpretation/interpret-qt.js` | `qt-interpretation.test.mjs` |
| 13 | 期外収縮・R on T | 1（複合ルール） | `logic/ventricular-ectopy/interpret-ventricular-ectopy.js` | `ventricular-ectopy.test.mjs` |
| 14 | 徐脈性不整脈 | 6 | `logic/bradyarrhythmia/interpret-brady.js` | `bradyarrhythmia.test.mjs` |
| 15 | 頻脈性不整脈 | 5 | `logic/tachyarrhythmia/classify.js` | `workflow.test.mjs`, `clinical-cases.test.mjs` |
| 16 | 房室ブロック | 0（PR・徐脈ルールを参照） | `logic/bradyarrhythmia/interpret-brady.js` | `bradyarrhythmia.test.mjs` |
| 17 | 脚ブロック・心室内伝導障害 | 1（QRSルールも参照） | `logic/conduction-interpretation/interpret-conduction.js` | `conduction.test.mjs` |
| 18 | WPW／早期興奮 | 2 | `logic/tachyarrhythmia/classify.js`, integration | `workflow.test.mjs` |
| 19 | Brugada pattern | 1 | systematic interpretation/integration | `workflow.test.mjs` |
| 20 | Wellens pattern | 1 | `logic/t-wave-interpretation/interpret-t-wave.js` | `t-wave.test.mjs`, `clinical-cases.test.mjs` |
| 21 | ペーシング | 0（QRS背景・ST制限として実装） | conduction/ST/Sgarbossa integration | `sgarbossa*.test.mjs` |
| 22 | 電解質パターン | 5 | `logic/electrolyte-interpretation/interpret-electrolytes.js` | `electrolyte-interpretation.test.mjs` |
| 23 | 急性冠症候群候補 | 0（ST/T/Q波の複合候補） | `logic/integration/build-integrated-interpretation.js` | `integration.test.mjs`, `clinical-cases.test.mjs` |
| 24 | 追加誘導・追加検査 | 0（各ルール出力） | ST/integration/today's plan | `lead-placement.test.mjs`, `integration.test.mjs` |
| 25 | 緊急度・初期対応 | 0（各ルール出力） | `logic/interpretation/determine-urgency.js`, integration | `integration.test.mjs` |
| 26 | その他 | 1 | integration | `integration.test.mjs` |

合計は57件。0件のカテゴリは「機能がない」という意味ではなく、独立したRule IDへまだ分離していない既存横断処理を示す。実装済みとして補完しない。

## 共通評価契約

評価状態は`matched`、`not_matched`、`insufficient_data`、`not_applicable`を区別する。必須入力が欠ける場合は正常扱いせず`insufficient_data`とし、`missingInputs`と追加確認項目を返す。複数候補は削除せず、`conflictingInputs`または`competingRuleIds`へ保持し、「併存または鑑別が必要」と表示する。

緊急度、診断候補の確からしさ、追加確認の優先度、表示順は別概念として扱う。既存のRed Flagとpriorityを変更しない。

## 未整理項目

- 02、16、21、23、24、25の横断処理を、既存出力を変えず独立Rule IDへ分離する作業
- 57件すべてについて共通`EcgRule.evaluate` Adapterを実装する作業
- 互換`Rule-*`から公開`ECG-*` IDへの段階移行
- ルール定義からMarkdownを自動生成する仕組み

