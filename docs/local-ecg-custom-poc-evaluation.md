# 自作ローカルECG画像解析PoC 評価と終了判定

評価日: 2026-08-07

対象ブランチ: `feature/local-ecg-poc-validation`

位置付け: 実験checkpoint。Version 2およびmainへの統合対象ではない。

## 1. 結論

自作PoCは、判定不能を正常へ補完しないこと、低品質な抽出を57ルールへ渡さないこと、画像を外部送信しないこと、OpenAIを使用しないことを実現した。一方、正常画像でも全拍の安定検出に至らず、LBBB画像ではQRS候補を生成できず、AF画像ではグリッド接続成分が波形候補より優位となり、複数画像でHR/RRを確定できなかった。

**安全性は確保できたが、複数画像・形態・grid条件に対する自動抽出精度がVersion 3採用基準に達していない。**

したがって、自作画像処理だけでVersion 3を完成させる方針を終了する。今後は、既存ECG digitizerを第一選択とし、復元波形または客観的所見を医師が確認した後に既存57ルールへ接続する。

## 2. 実装した方式

- 画像品質と解像度の段階別安全ゲート
- 3×4、3×4＋long II、6×2レイアウト候補の識別
- 12誘導領域の分割とlong IIの独立抽出
- 二値化画像からのPolyline／centerline候補生成
- Connected Componentsによる波形成分候補の抽出
- 近接R candidateのクラスタリングと代表点選択
- QRS形態品質監査
  - geometry
  - prominence
  - continuity
  - grid／artifact overlap
  - temporal consistency
- `adequate`、`limited`、`inadequate`の品質分類
- R peak不足時のHR `null`、RR `indeterminate`保持
- 解析候補と医師修正値の分離
- 承認可能な所見だけをRule Contextへ渡す安全境界

## 3. 実画像評価

患者画像はリポジトリへ保存していない。実ブラウザで検証した主な画像は正常洞調律、LBBB、AF、および此前の3×4／6×2検証画像である。

| 症例・条件 | 主な結果 | 安全動作 |
|---|---|---|
| 正常画像 | レイアウトとlong IIを識別したが、adequateなConnected Component候補は3個に留まり、全拍を安定追跡できなかった | HRは`null`、RRは`indeterminate`のまま保持 |
| LBBB画像 | 6×2候補を識別したがQRS candidateは0 | wide/narrowを補完せず判定不能を保持 |
| AF画像 | 多数の候補を生成したが、grid overlapが約0.88〜0.93でartifact優位 | 全候補をinadequateとして遮断し、HR・Rule Engineへ流入させなかった |
| 3×4＋long II画像 | 12誘導とlong IIを分離できる条件がある一方、線幅、grid、断裂の影響でR列の再現性が不足 | 不十分な候補から固定RRや正常値を生成しなかった |
| 低解像度6×2 | 手動指定では12領域候補を生成できたが、Polyline以降の解像度条件を満たさない例があった | 理由を示して安全停止 |

実画像の総検証対象は少なくとも5条件（正常、LBBB、AF、3×4＋long II、低解像度6×2）。病型別の臨床精度を主張できる規模ではなく、採用判断のための失敗モード確認として扱う。

## 4. 問題点と停止理由

### Grid接続

薄いグリッドでもQRSの急峻な縦線と接続し、Connected Componentが波形ではなく紙面構造を表すことがある。gridを強く除去すると、本来のQRS垂直成分も失うため、安全な汎化が難しい。

### Polyline／centerline

線幅、印刷濃度、JPEG圧縮、文字重なり、波形断裂により、同一拍が複数線または複数成分になる。中央値や中心線化だけでは、P/QRS/ST/Tを保ちながら一意な時系列へ復元できなかった。

### R candidateと形態差

正常像向けのprominence・幅・連続性条件は、LBBBなどのwide morphologyに一般化しない。閾値緩和はT波やgrid artifactの採用を増やすため、件数を増やすだけの調整は行わなかった。

### HR/RR未確定

accepted peak数、RR分布、refractory violation、形態品質を同時に満たすR列が不足した。固定値、補間、正常範囲へのclampを禁止しているため、HR/RRを確定しなかった。

### 自作継続時の技術課題

- 多様な紙面・撮影条件を学習したtrace/grid/background segmentation
- 遠近・湾曲・回転の堅牢な補正
- レイアウトと誘導ラベルの一般化
- 重なり区間を欠損として扱える2D-to-1D復元
- time/voltage calibrationの監査可能な推定
- 病的QRS形態を保持する信号追跡
- 多施設・多機種・多病型の匿名化検証データと医師正解値

これらは小規模なルールベース画像処理の追加調整では解決しにくく、Version 3の目的に対して工数と臨床安全性のリスクが高い。

## 5. 安全性の評価

- OpenAIおよび外部画像解析APIを使用しない
- 画像はブラウザ内処理で、外部サーバーへ送信しない
- 判定不能を正常、QRS未評価をnarrow、ST未評価をisoelectricへ変換しない
- 低品質候補を57ルールへ自動流入させない
- 画像処理部分は診断名を生成しない
- 医師修正後は画像解析を再実行せず、既存ルールだけを再計算する設計を維持

重大な誤抽出を確定所見としてRule Engineへ流入させた事例は0件だった。ただし、これは抽出精度が十分という意味ではなく、安全ゲートが機能して多くを判定不能にした結果である。

## 6. 既存技術の再調査

既存調査9件にOpen ECG Digitizerを追加し、計10件を比較した。今回のPoC候補は、診断分類モデルではなく誘導別波形を出力する2件へ絞る。

### 第1候補: Open ECG Digitizer

- GitHub: https://github.com/Ahus-AIM/Open-ECG-Digitizer
- 論文: https://doi.org/10.1038/s41746-025-02327-1
- ライセンス: CC BY-SA 4.0。帰属表示とShareAlikeが必要。コードへのCC適用および本アプリとの配布境界は導入前に法務確認する
- モデル入手: repositoryのGit LFS (`git lfs pull`)
- 学習済み重み: 公開あり
- モデルサイズ: 公式READMEに総容量の明記なし。次回PoCで取得前にLFS pointerと配布条件を確認し、取得後に実測する
- 入力: scanまたはスマートフォン写真の12誘導画像。標準12誘導の任意subsetを扱える
- 出力: 誘導別の生時系列、単位µV。重なりなど復元不能区間はNaNになり得る
- 構成: U-Net semantic segmentation、遠近補正、crop、grid scale推定、layout identification、segmentation-to-trace
- ローカル実行: 可。Python 3.12、Linux、CUDAでの試験記載あり
- ONNX: 公式export手順なし。U-Net単体は技術検証候補だが、前後処理と動的形状を含むpipeline全体のONNX化は未確認
- ブラウザ: そのままは不可。Python依存があり、初回PoCは隔離されたローカルプロセスが現実的
- 必要メモリ: 公式値なし。CUDA試験構成であり、CPU/GPUメモリをPoCで実測する
- 57ルール接続: 波形→客観計測候補→overlayと品質情報を医師確認→承認値だけを`EcgRuleContext`へ変換
- 導入難易度: 中〜高
- 最大の欠点: CC BY-SA 4.0の配布条件、Python/CUDA中心、ブラウザ直接実行不可
- 選定理由: 実写真、遠近歪み、12誘導、grid scale、欠損NaNまで一体化し、自作PoCの主要失敗点を直接扱う

### 第2候補: ECG-Digitiser

- GitHub: https://github.com/felixkrones/ECG-Digitiser
- 論文: https://arxiv.org/abs/2410.14185
- ライセンス: BSD-2-Clause（source repository）。重み・派生データ・同梱nnU-Net forkの条件は再配布前に個別確認する
- モデル入手: repositoryのGit LFS (`git lfs pull`)
- 学習済み重み: pretrained ECG segmentation modelsを公開
- モデルサイズ: 公式READMEに明記なし。PoCでLFS pointerと実ファイルを確認する
- 入力: 主に3×4＋10秒rhythm strip、25 mm/s、10 mm/mV。合成データでは回転等の劣化を含む
- 出力: segmentationおよびvectorized ECG signal
- ローカル実行: 可。Python 3.11、PyTorch／nnU-Net fork等が必要
- ONNX: 公式exportなし。segmentation model単体の変換可能性はあるが、nnU-Net演算・dynamic shape・後処理を検証する必要がある
- ブラウザ: そのままは不可。モデルと前後処理の移植負担が大きい
- 必要メモリ: 公式値なし。nnU-Netのため次回PoCで実測が必要
- 57ルール接続: vectorized signal→客観計測候補→医師承認→`EcgRuleContext`
- 導入難易度: 高
- 最大の欠点: 学習済み重みが想定するレイアウトが限定的で、写真・6×2・強い遠近歪みへの一般化が不明
- 選定理由: PhysioNet Challenge 2024 digitization winner、BSD-2-Clause、重みとvectorization実装が公開

## 7. 方針比較

| 方針 | 説明可能性 | 57ルール親和性 | 導入工数 | 主なリスク | 判定 |
|---|---:|---:|---:|---|---|
| 案A: 既存digitizer→波形→客観計測 | 高 | 高 | 中〜高 | license、計算資源、実画像一般化 | 優先 |
| 案B: 画像特徴モデル→所見候補 | 中 | 中〜高 | 中 | モデルが診断分類へ寄りやすく、根拠監査が弱い | 予備 |
| 自作PoC継続 | 高 | 高 | 非常に高 | grid、線追跡、形態一般化、検証データ不足 | 終了 |

## 8. 次回PoCの最小構成

第1候補だけを新しい隔離feature branchで評価する。mainとVersion 2には触れない。

1. ライセンス、重み、依存関係を固定し、再配布せずローカル検証用に取得する
2. 患者情報を含まない画像1枚をローカルPython processへ渡す
3. Open ECG Digitizerで誘導別波形、segmentation mask、品質情報、NaN区間を取得する
4. 原画像・mask・復元波形を監査画面に重ねて表示する
5. 処理時間、CPU/GPUメモリ、モデル容量、失敗理由を記録する
6. この段階では57ルールへ接続しない
7. 医師が波形復元を承認できた場合に限り、次段階で計測adapterを設計する

撤退基準は、対象レイアウトで誘導取り違えが起きる、欠損を正常波形として補間する、実写真で監査可能な波形を復元できない、または配布ライセンスを本アプリと両立できない場合とする。

## 9. Version 2への影響

mainへのmergeは行わない。PIN認証、画像表示、医師入力、既存57ルール、Explainable Rule Engine、Medical Hub連携は変更しない。Version 3の自作コードと本checkpointは実験ブランチだけに保持する。

## 10. 参照一次資料

- Open ECG Digitizer: https://github.com/Ahus-AIM/Open-ECG-Digitizer
- Stenhede et al., npj Digital Medicine (2026): https://doi.org/10.1038/s41746-025-02327-1
- ECG-Digitiser: https://github.com/felixkrones/ECG-Digitiser
- Krones et al.: https://arxiv.org/abs/2410.14185
- George B. Moody PhysioNet Challenge 2024: https://moody-challenge.physionet.org/2024/
- 既存比較文書: `docs/ecg-image-engine-survey.md`
