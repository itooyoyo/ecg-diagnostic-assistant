# ECG画像解析技術の調査・採用候補選定

調査日: 2026-08-06
対象: ECG Diagnostic Assistant Version 3
調査範囲: 公式GitHub、README、LICENSE、依存関係・推論構成の公開情報、原著論文、PhysioNet公式資料。実装、install、モデル取得、患者画像利用は行っていない。

## 1. 調査目的

心電図写真をローカル処理し、固定値ではない客観的な波形または所見候補を得て、医師確認後に既存57ルールへ渡せる既存技術を選定する。画像解析側には診断、鑑別、治療提案を担当させない。

結論を先に示すと、すべての必須条件、特に「実写真12誘導」「明確なコード・重みライセンス」「ブラウザ完結」「継続保守」を同時に満たす完成OSSは確認できなかった。実用PoC候補は2件で、第1候補は **ECGtizer**、第2候補は **ECG-Digitiser** である。ただし両者とも現状はPython実行が前提で、条件付き採用とする。

## 2. 必須条件

- 標準12誘導の紙心電図、スキャンまたは写真を扱える
- 画像から誘導別時系列、または客観的特徴候補を生成できる
- ローカル実行でき、外部APIや画像送信を必要としない
- ソース、ライセンス、再配布条件を監査できる
- 固定値・fixtureではない
- 医師による承認、修正、削除を挟める出力である
- 承認済み所見だけを `EcgRuleContext` に変換できる
- 可能ならブラウザ、WebGPU、WASMまたはONNX Runtime Webで動く

採用可否はコードだけでなく、モデル重み、学習データ、依存ライブラリを別々に評価した。不明点は商用利用可能と推測していない。

## 3. 調査方法

情報源の優先順位は、原著論文、公式GitHub、公式ドキュメント、研究機関資料とした。GitHubではREADMEとLICENSEに加え、公開されている依存構成、モデルファイル、実行入口、入出力、commit履歴を確認した。

評価記号:

- ○: 公式資料で確認
- △: 一部対応、制約あり、追加変換または検証が必要
- ×: 非対応
- 不明: 公開資料では確認不能

モデルサイズと推論メモリは、公式に明記されていない場合は「不明」とした。今回はモデルをダウンロードして実測していない。

## 4. 候補一覧

調査候補は9件。実用PoC候補2件、評価・信号処理補助3件、条件不成立または不採用4件である。

| # | 名称 | 種別 | 主出力 | ライセンス | 実写真12誘導 | ブラウザ | 判定 |
|---:|---|---|---|---|---:|---:|---|
| 1 | ECGtizer | A: digitizer | 誘導別配列、HL7 aECG XML | Unlicense | ○ | × | 条件付き採用・第1候補 |
| 2 | ECG-Digitiser | A/D: Challenge winner | 誘導別時系列、segmentation | BSD-2-Clause | △ | × | 条件付き採用・第2候補 |
| 3 | ECG-Image-Kit | A/D: 生成・digitization toolset | 合成画像、補助的digitization | BSD-3-Clause | △ | × | 評価基盤として採用 |
| 4 | PhysioNet Challenge 2024 Python example | D: 公式baseline | WFDB入出力、簡易予測 | BSD-2-Clause | △ | × | 評価契約のみ採用 |
| 5 | AIMED ConvNeXt | B: 画像分類 | 11診断クラス | コード・重み不明 | ○相当 | △ | 不採用 |
| 6 | Tereshchenkolab/ecg-digitize | A: digitizer | デジタル信号 | MIT | △ | × | 新規採用しない |
| 7 | NeuroKit2 | C: 信号解析 | R peak、delineation等 | MIT | 画像非対応 | × | 復元後の補助候補 |
| 8 | WFDB Python | C/D: 信号I/O・処理 | WFDB信号・注釈 | MIT | 画像非対応 | × | 中間形式・評価に採用可能 |
| 9 | ECGdeli | C: delineation | P/QRS/T fiducial points | GPL-3.0 | 画像非対応 | × | 本アプリ統合は不採用 |

## 5. 候補別詳細

### 5.1 ECGtizer

- 目的: PDF/画像の紙心電図を誘導別信号へ復元し、HL7 aECG XMLへ出力
- GitHub: https://github.com/UMMISCO/ecgtizer
- 論文: https://arxiv.org/abs/2412.12139
- コードライセンス: Unlicense
- 最終更新: 2026-04-18のcommitを確認
- 保守: 2026年に品質、実画像クラッシュ、性能、依存脆弱性の修正があり継続中
- 入力: PDF、PNG、JPG/JPEG
- レイアウト: Classic 3×4、6×2、ほか単一・6誘導形式
- 12誘導: ○。I、II、III、aVR、aVL、aVF、V1–V6を明記
- 写真劣化: ノイズ分類、Otsu/Sauvola二値化を持つ。強い反射・台形歪みの保証は不明
- digitization: ○。誘導別NumPy配列、XML、元画像オーバーレイ
- 所見分類: ×。これは本アプリには望ましい
- 重み: 任意のlead completion用PyTorch `.pth` を同梱。画像抽出本体は主に画像処理
- 重みライセンス: LICENSEがリポジトリ全体を覆うように見えるが、重み由来を含む明示条項は不足。商用配布前に著者確認推奨
- 依存: Python、画像処理、NumPy系、PDF変換。任意機能でPyTorch
- OpenCV: 実装中のcontour等画像処理依存あり
- ONNX: △。任意autoencoderだけなら検討可能だが、抽出全体はONNX化不能
- ブラウザ/WebGPU/WASM: ×。公式対応なし。Python/WASMへの大規模移植が必要
- モデルサイズ・メモリ: optional weightと入力DPIに依存。公式値なし
- 商用利用: コードは可。ただし依存物・重み・データを別監査
- 医療制限: 研究用OSSで、医療機器としての検証・認証・保証なし
- 医師確認: `plot_over()` と誘導配列を独自UIで表示可能
- 接続: 誘導配列 → signal feature adapter → 医師承認 → `EcgRuleContext`
- 欠点: ブラウザ非対応、Python/Poppler依存、写真一般化と重み条件の追加確認が必要
- 導入難易度: 高

### 5.2 ECG-Digitiser

- 目的: Hough変換とnnU-Net segmentationで印刷心電図を時系列へ復元
- GitHub: https://github.com/felixkrones/ECG-Digitiser
- 論文: https://arxiv.org/abs/2410.14185
- コードライセンス: BSD-2-Clause
- 最終更新: 2025-06-18のcommitを確認
- 保守: 2025年に重み・修正あり。ECGtizerより更新は古い
- 実績: PhysioNet Challenge 2024 digitization 1位。hidden score 12.15、論文CV SNR 17.02
- 入力: ECG画像。Challengeのスキャン・写真を研究対象に含む
- レイアウト: 学習済み重みは3×4 + 下段rhythm strip、25 mm/s、10 mm/mV等を想定
- 傾き: 合成学習条件で約5度まで。Hough transformで回転補正
- 反射・強い台形歪み: Challengeデータには実世界劣化を含むが個別保証なし
- digitization: ○
- 所見分類: ×
- 重み: Git LFSでpretrained segmentation weights公開
- 重みライセンス: リポジトリBSD表示は確認。モデルカード型の独立ライセンス・学習データ由来説明は不足し、再配布前に著者確認推奨
- 依存: Python 3.11、nnU-Net fork、PyTorch系、画像処理
- OpenCV: Hough・後処理系で依存
- ONNX: △。segmentationモデル単体は技術検証余地があるが公式exportなし。dynamic shape、nnU-Net演算、前後処理、vectorisationが残る
- ブラウザ/WebGPU/WASM: ×。公式対応なし
- モデルサイズ・メモリ: 公式READMEに製品向け値なし。nnU-Netのため軽量ブラウザモデルとは評価できない
- 商用利用: コードは可。重み・データ・同梱forkを別監査
- 医師確認: segmentation maskとvectorised信号を独自UIへ表示可能
- 接続: 誘導別WFDB相当信号 → 計測 → 医師承認 → 57ルール
- 欠点: レイアウト制約、重い依存、RGB PNG問題のため同梱nnU-Net forkを要求
- 導入難易度: 非常に高い

### 5.3 ECG-Image-Kit

- 目的: ECG時系列から、紙背景、文字、しわ、折れ、遠近変換などを含む合成画像を生成しdigitization研究を支援
- GitHub: https://github.com/alphanumericslab/ecg-image-kit
- 論文: https://doi.org/10.1088/1361-6579/ad4954
- ライセンス: BSD-3-Clause
- 最終更新: 今回の取得では信頼できる直近commit日を確定できず
- 12誘導/3×4: ○
- 写真: 実写真そのものより、写真・スキャン劣化を模した合成データ作成が中心
- digitization: toolsetあり。ただし汎用実写真エンジンとして単独採用しない
- 重み: 本体の中心は生成・画像処理で、採用可能な単一production modelとしては確認できず
- Python/OpenCV: 依存あり
- ONNX/ブラウザ: パイプライン全体は不可/非対応
- 商用: コードは可。生成元時系列データのライセンスは別
- 接続: 本番より、ground truth付き回帰試験とcandidate engineの頑健性評価に使う
- 欠点: 完成した写真解析ランタイムではない
- 導入難易度: 評価用途は中、本番用途は高

### 5.4 PhysioNet Challenge 2024 Python example

- GitHub: https://github.com/physionetchallenges/python-example-2024
- 公式ページ: https://moody-challenge.physionet.org/2024/
- 論文: https://moody-challenge.physionet.org/2024/papers/cinc_paper.pdf
- ライセンス: BSD-2-Clause
- 目的: digitization/classification entryの入出力、Docker、評価契約を例示
- 対応画像: 合成画像、実スキャン、実写真、汚損、画面撮影をChallengeが評価
- 12誘導: ○
- digitization/classification: API枠はあるが、公式READMEが「高性能baselineではない」と明記
- 重み: 製品採用できる高性能重みではない
- ONNX/ブラウザ: ×
- 接続: WFDB出力契約とSNR評価を本アプリのengine adapter試験に再利用可能
- 欠点: エンジンではなく評価ハーネス

### 5.5 AIMED ConvNeXt（PhysioNet 2024 classification winner）

- 論文: https://www.cinc.org/archives/2024/pdf/CinC2024-398.pdf
- 目的: ECG画像を11クラスへ直接分類
- 実績: Challenge test macro F1 0.817、classification 1位
- 入力: 合成および実ECG画像。回転補正後のConvNeXt ensemble
- 対応所見: NORM、acute/old MI、ST/T changes、conduction disturbance、hypertrophy、PAC、PVC、AF/AFL、tachycardia、bradycardia
- 重み・GitHub: 調査時点で、公式に再配布可能なコード・学習済みensemble・LICENSEを一式確認できず
- 学習データ: CODE15、PTB-XLに加えprivate image datasetsを使用
- ONNX: ConvNeXt単体は一般にexport可能性があるが、5-model ensemble、画像前処理、実際のcheckpointがないため未検証
- ブラウザ: 未検証。高解像度ensembleは容量・メモリ面で不利
- 57ルール: 診断クラスを直接出すため、客観的所見入力との親和性が低い
- 判定: **ライセンス不明・重み未確認のため採用不可**

### 5.6 Tereshchenkolab/ecg-digitize

- GitHub: https://github.com/Tereshchenkolab/ecg-digitize
- 論文: https://pmc.ncbi.nlm.nih.gov/articles/PMC9286778/
- ライセンス: MIT
- 目的: 紙心電図画像を信号化
- 依存: Python 3.6.7を要求する古い構成
- digitization: ○
- 12誘導・3×4: 対応例はあるが、現行上位候補ほど仕様が明確でない
- 重み/ONNX: 古典画像処理中心で該当しない
- ブラウザ: ×
- 保守: 継続保守を確認できず
- 判定: 比較対象には残すが、新規製品統合は不採用

### 5.7 NeuroKit2

- GitHub: https://github.com/neuropsychology/NeuroKit
- 公式docs: https://neuropsychology.github.io/NeuroKit/functions/ecg.html
- ライセンス: MIT
- 最新release: 0.2.13、2026-03-02
- 目的: ECG clean、R peak、rate、quality、P/QRS/T delineation等
- 画像対応: ×。digitizer出力後の信号が必要
- 12誘導: lead-by-lead処理と統合設計が必要
- Python: ○。NumPy/SciPy系
- ONNX: ×。ニューラルモデルではなくPython signal-processing API
- ブラウザ/WASM: 公式対応なし
- 接続: 復元波形 → rate/RR/fiducial候補 → 医師確認 → `EcgRuleContext`
- 判定: 波形復元後のPoC補助として条件付き候補。本番閾値は既存57ルールを変更せず検証する

### 5.8 WFDB Python

- GitHub: https://github.com/MIT-LCP/wfdb-python
- 公式docs: https://wfdb.io/software/python.html
- ライセンス: MIT
- 最新release: 4.3.1、2026-02-03
- 目的: WFDB信号・header・annotationの読み書き、処理、可視化
- 画像/digitization/診断: ×
- ブラウザ: ×
- 接続: ECG-Digitiser/Challenge出力の正規化、評価、fixture形式として有用
- 判定: エンジンではなく中間形式・評価補助

### 5.9 ECGdeli

- GitHub: https://github.com/KIT-IBT/ECGdeli
- 論文: https://doi.org/10.1016/j.softx.2020.100639
- ライセンス: GPL-3.0
- 目的: single/multilead ECGのP、QRS、T onset/peak/offset delineation
- 画像対応: ×
- 依存: MATLABおよびImage/Signal/Statistics/Wavelet Toolboxes
- ONNX/ブラウザ: ×
- 商用: GPLとMATLAB依存のため、現行Next.js製品への組込みは不適
- 判定: アルゴリズム比較対象に限定し、不採用

## 6. ライセンス比較

| 候補 | コード | 重み | 学習データ | 商用判断 |
|---|---|---|---|---|
| ECGtizer | Unlicense | 独立明記が弱い | PTB-XL等、個別条件 | コード可。重みは著者確認推奨 |
| ECG-Digitiser | BSD-2 | 独立model card/license未確認 | PTB-XL/Challenge生成物等 | コード可。重み・データ再監査必須 |
| ECG-Image-Kit | BSD-3 | 単一採用重みなし | 入力ECGデータごとに異なる | コード可。生成物の元データ条件に注意 |
| Challenge example | BSD-2 | 高性能重みなし | PhysioNet各dataset条件 | framework可。データ再配布は別 |
| AIMED ConvNeXt | 不明 | 不明/未公開確認 | private datasetsを含む | 採用不可、著者確認必須 |
| ecg-digitize | MIT | 該当なし | 検証データ別条件 | コード可だが保守性不足 |
| NeuroKit2 | MIT | 該当なし | 利用者入力 | コード可 |
| WFDB Python | MIT | 該当なし | 各PhysioNet dataset別条件 | コード可 |
| ECGdeli | GPL-3 | 該当なし | 利用者入力 | proprietary統合には不適 |

論文が公開されていることは、コード・重み・データの再利用許諾を意味しない。特にAIMEDは成績が最良でも採用条件を満たさない。

## 7. ブラウザ統合比較

| 候補 | 区分 | 主な障害 |
|---|---|---|
| ECGtizer | C: Pythonサーバー/ローカル補助プロセス必要 | Poppler、Python画像処理、contour/threshold後処理 |
| ECG-Digitiser | D: 現実的にブラウザ化困難 | nnU-Net、Hough、dynamic image shape、mask vectorisation、容量 |
| ECG-Image-Kit | D | Python画像生成・処理全体を移植する必要 |
| Challenge example | C | Python/Docker契約でありブラウザruntimeでない |
| AIMED ConvNeXt | B相当だが採用不能 | checkpointなし、ensemble、前処理・高解像度・容量不明 |
| ecg-digitize | D | 古いPython GUI/画像処理依存 |
| NeuroKit2/WFDB | C | Python/SciPy処理。ONNX対象ではない |
| ECGdeli | D | MATLAB proprietary toolboxes + GPL |

ONNX Runtime WebはONNX graphをWebAssembly/WebGPUで実行できるが、Python/OpenCVパイプラインを自動変換しない。PyTorch exporterもモデルgraphの変換であり、用紙検出、Hough変換、誘導切出し、mask vectorisation、信号後処理は別実装になる。

- ONNX Runtime Web: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- WebGPU EP: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- PyTorch ONNX exporter: https://docs.pytorch.org/docs/stable/onnx.html

未対応演算子、dynamic shape、画像サイズ、GPU buffer、JS heap、端末差は、実checkpointを取得しない今回の調査では検証不能。したがって「ONNX化すれば動く」と断定できる候補は0件である。

## 8. 57ルールとの接続方法

### 推奨経路: digitization first

```text
匿名化ECG画像
  → 既存digitizer（診断しない）
  → LeadSignal[] + quality + extraction overlay + failure reason
  → 信号計測adapter（rate / RR / QRS / STなどの候補）
  → 医師が承認・修正・削除
  → approved findingsのみEcgRuleContextへ変換
  → 既存57ルール
  → 診断候補・鑑別・追加確認・追加検査・初期対応
```

engine adapterは、元画像、誘導名、sampling rate、信号配列、抽出品質、信頼性、失敗理由を保持する。候補値を未入力や正常へ自動変換しない。医師修正後は画像を再処理せず、`EcgRuleContext` と57ルールだけを再計算する。

### 画像分類経路

```text
画像 → feature classifier → objective feature candidate
→ 医師確認 → EcgRuleContext → 57ルール
```

ただし調査した公開画像分類モデルは診断クラスを直接出すものが中心で、ST上昇誘導、QRS幅、RBBB morphology等の客観所見を十分に返さない。現在は推奨しない。

## 9. 実装案A／B／C比較

期間は1人のエンジニアがPoCを行う粗い目安で、臨床検証・規制対応期間を含まない。

| 項目 | 案A: 既存digitizer + 信号計測 | 案B: 画像feature model | 案C: Phase B自作継続 |
|---|---|---|---|
| PoC期間 | 3–6週 | 6–12週以上 | 3–6か月以上 |
| 技術 | Python bridge、WFDB、信号処理、adapter | 学習/重み、ONNX、CV、校正 | CV、用紙・grid・lead分割、vectorisation、全計測 |
| 精度検証 | ground-truth waveformとSNRで比較可能 | 所見ごとのlabel設計が必要 | 全段階を個別検証する必要 |
| 保守 | upstream + adapter | model drift、再学習、runtime | 全責任を自前で負う |
| ブラウザ性能 | 初期は不適。後で部分移植 | 軽量単一modelなら可能性 | 最適化次第だが工数最大 |
| 臨床安全性 | 波形とoverlayを医師確認可能 | black-box候補になりやすい | 完全制御できるが未検証期間が長い |
| 将来拡張 | 高。digitizer交換可能 | 出力labelに拘束 | 高いが保守負担最大 |
| 57ルール親和性 | 高 | 中～低 | 高 |
| 推奨 | **最優先** | 現時点では見送り | fallbackとして保留 |

## 10. 推奨候補

### 第1候補: ECGtizer（条件付き）

採用理由:

- 実画像/PDF、Classic 3×4/6×2、標準12誘導を公式に明記
- 診断ではなく誘導別信号を返す
- 元画像へのoverlayで医師確認を構成しやすい
- 2026年も保守・性能・security更新がある
- コードライセンスの商用障壁が低い

不足点:

- ブラウザ実行不可
- 強い反射・台形歪み・任意レイアウトの定量成績が不足
- optional model weightの独立ライセンス記述が弱い
- TypeScriptへ直接導入できない

最小統合案は、製品へ依存追加する前に隔離ローカルPython CLIで1枚ずつ処理し、JSON化した誘導配列とoverlayだけを評価用adapterへ渡すこと。最初の自動候補は、比較的検証しやすい画像品質、心拍数、RR規則性、wide/narrow QRS候補に限定する。ST/QTは波形復元誤差の影響が大きいため初期自動承認しない。

医師UIでは、元画像、overlay、候補値、抽出品質、承認/修正/削除を並べる。未承認候補は57ルールへ渡さない。

検証症例数:

- 技術ゲート: 最低50画像（layout・scan/photo・劣化別）
- 臨床PoC: 最低200画像を推奨し、正常/不整脈/wide QRS/ST変化/品質不良を層別化
- 本番可否: 単施設200例だけで決めず、別装置・別撮影条件の外部検証が必要

撤退基準:

- 誘導取り違えが1件でも自動的に正常確定へ波及する
- 品質不良をadequate/high confidenceとして通す
- wide QRSをnarrowへ誤分類する安全性エラーが許容範囲を超える
- 急性ST候補、重症不整脈候補、高K鑑別を医師確認前に消す
- 標準3×4実写真で安定した誘導分割が得られない
- 重み・依存物の再配布条件を解消できない
- ローカル処理要件または性能上限を満たせない

### 第2候補: ECG-Digitiser（条件付き）

Challenge優勝と定量SNRを重視する比較候補。3×4定型画像に限定した場合の復元精度をECGtizerと同一評価セットで比較する。nnU-Net依存、重み、メモリ、ブラウザ化の負担から第2候補とする。

### 採用しない候補

- AIMED ConvNeXt: コード・重みライセンスを確認できず、private dataを含み、診断クラス直接出力
- Tereshchenkolab/ecg-digitize: 古いPython依存と保守不明
- ECGdeli: GPL-3.0、MATLAB/toolbox依存
- Challenge example: 高性能engineではない
- ECG-Image-Kit単独: 本番写真engineではなく評価・生成基盤

## 11. 採用時の最小PoC

今回は実施しない。次フェーズで承認された場合のみ、以下の順で行う。

1. 法務・SBOM確認: code、weights、training data、transitive dependenciesを分離
2. ECGtizerとECG-Digitiserを製品外の隔離ローカル環境で固定version評価
3. 匿名化済み50画像と医師確認ground truthを準備
4. paper/lead extraction、誘導取り違え、波形SNR、失敗理由、処理時間を比較
5. 出力schemaだけを作り、57ルール本体は変更しない
6. 心拍数、RR、wide/narrowの候補表示から開始
7. 医師承認後だけrule engineを再計算
8. 重大エラー0件を満たすまで自動採用しない

画像や抽出結果を外部へ送らず、ローカル一時メモリで処理し、保存は明示操作時だけとする。

## 12. 不採用理由

- 「論文あり」だけでソース、重み、データの利用許諾が揃わない
- 画像分類の上位手法は診断ラベルを直接返し、57ルールの説明可能な所見入力に合わない
- PyTorch使用だけではONNX/ブラウザ対応にならない
- Python/OpenCV/Matlabの前後処理はmodel graph外である
- 古いOSSは商用ライセンスが良くても保守・security・現行runtime適合性を満たさない
- 合成画像generatorは実写真runtimeの代替ではない

## 13. 残る課題

- ECGtizer optional weightとECG-Digitiser pretrained weightsの明示的な再配布許諾確認
- transitive dependencyと同梱font/modelのライセンス一覧
- 実checkpointのサイズ、CPU/GPUメモリ、推論時間の実測
- 強い台形歪み、反射、折れ、文字重なり、部分欠損、非3×4レイアウトの層別成績
- 誘導取り違えを検出して全結果を保留する安全機構
- signal feature extractorの医学的妥当性と既存57ルール入力との意味整合
- ブラウザ完結が必須なら、modelだけでなく前後処理を含むWASM/WebGPU PoC
- 医療機器該当性、品質管理、監査ログ、サイバーセキュリティ、臨床評価

## 14. 参照文献・公式URL

- PhysioNet Challenge 2024: https://moody-challenge.physionet.org/2024/
- Challenge results: https://moody-challenge.physionet.org/2024/results/
- Challenge papers: https://moody-challenge.physionet.org/2024/papers/
- Challenge dataset paper: https://arxiv.org/abs/2409.16612
- ECGtizer: https://github.com/UMMISCO/ecgtizer
- ECGtizer paper: https://arxiv.org/abs/2412.12139
- ECG-Digitiser: https://github.com/felixkrones/ECG-Digitiser
- ECG-Digitiser paper: https://arxiv.org/abs/2410.14185
- ECG-Image-Kit: https://github.com/alphanumericslab/ecg-image-kit
- ECG-Image-Kit paper: https://doi.org/10.1088/1361-6579/ad4954
- PhysioNet Python example: https://github.com/physionetchallenges/python-example-2024
- AIMED ConvNeXt paper: https://www.cinc.org/archives/2024/pdf/CinC2024-398.pdf
- Tereshchenkolab/ecg-digitize: https://github.com/Tereshchenkolab/ecg-digitize
- Tereshchenkolab paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC9286778/
- NeuroKit2: https://github.com/neuropsychology/NeuroKit
- WFDB Python: https://github.com/MIT-LCP/wfdb-python
- ECGdeli: https://github.com/KIT-IBT/ECGdeli
- ONNX Runtime Web: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- PyTorch ONNX: https://docs.pytorch.org/docs/stable/onnx.html

## 付録A: 5段階採用評価

5が最良。「導入工数」は5が最小工数。「外部送信なし」はローカル構成時の実現性。

| 候補 | 技術適合 | License安全 | Browser | 精度検証 | 保守 | 導入工数 | 57ルール | 外部送信なし | 医師修正 | 判定 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ECGtizer | 5 | 4 | 1 | 4 | 5 | 3 | 5 | 5 | 5 | 条件付き採用 |
| ECG-Digitiser | 5 | 4 | 1 | 5 | 3 | 2 | 5 | 5 | 4 | 条件付き採用 |
| ECG-Image-Kit | 3 | 5 | 1 | 5 | 3 | 3 | 3 | 5 | 2 | 評価用途 |
| Challenge example | 2 | 5 | 1 | 5 | 3 | 3 | 3 | 5 | 1 | 評価用途 |
| AIMED ConvNeXt | 3 | 1 | 2 | 2 | 1 | 1 | 2 | 5 | 3 | 不採用 |
| ecg-digitize | 3 | 5 | 1 | 3 | 1 | 2 | 4 | 5 | 3 | 不採用 |
| NeuroKit2 | 3 | 5 | 1 | 4 | 5 | 3 | 4 | 5 | 4 | 補助候補 |
| WFDB Python | 2 | 5 | 1 | 5 | 5 | 4 | 3 | 5 | 2 | 中間形式 |
| ECGdeli | 3 | 2 | 1 | 4 | 2 | 1 | 4 | 5 | 3 | 不採用 |

点数は候補間比較のための工学的評価であり、臨床精度スコアではない。総合点だけで採否を決めず、ライセンス不明や重大な安全性制約をゲート条件とする。
