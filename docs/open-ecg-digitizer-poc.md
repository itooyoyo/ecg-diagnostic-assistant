# Open ECG Digitizer 隔離PoC評価

評価日: 2026-08-07

ブランチ: `feature/open-ecg-digitizer-poc`

## 結論

匿名化済みの1657×781px、3×4＋long II画像1枚を、Open ECG Digitizerの公式コードと公式重みでローカル処理した。`3x4+1R`を認識し、12誘導のcanonical time series、signal/grid segmentation、遠近補正後画像、NaN区間、grid scaleを取得できた。目視上、主要波形形態と誘導配置は元画像に整合し、重大な誘導取り違えは認めなかった。

この結果は1画像だけの技術PoCであり、臨床精度や一般化性能を証明しない。Next.js、57ルール、API Route、Vercelには接続していない。

## 使用バージョンと固定情報

| 項目 | 値 |
|---|---|
| upstream | Open ECG Digitizer 1.9.3 |
| repository | `https://github.com/Ahus-AIM/Open-ECG-Digitizer` |
| commit | `97a15087d4abcda843da8c58ee74b1d8f47e6f9a` |
| Python | 3.12.13 |
| PyTorch | 2.13.0+cpu |
| device | CPU、CUDAなし |
| resample size | 2000px |
| input | 匿名化済みPNG、1657×781px、3×4＋long II |

## ライセンス監査

### Repository／コード

repository直下のLICENSEはCC BY-SA 4.0である。商用利用は禁止されていないが、共有時の帰属表示、改変表示、ShareAlikeが必要であり、特許・商標権は許諾対象外である。Creative Commonsライセンスをソフトウェアへ適用した場合の配布境界は一般的なソフトウェアライセンスほど明確ではないため、製品導入前に法務確認が必要である。

### モデル重み

重みは同じrepositoryのGit LFS追跡ファイルとして配布され、別個のmodel licenseまたはmodel cardは見つからなかった。したがってrepositoryのCC BY-SA 4.0が重みにも適用されるように見えるが、明示的な重みライセンスがないため確定扱いしない。再配布・同梱前に著者確認が必要である。

### 学習データ

公式Hugging Face dataset cardはOpen ECG Digitizer Development DatasetをApache-2.0と表示する。データセットはECG-Image-Kit forkで生成されたとされる。ただし、生成元信号を含む全素材の由来と商用再利用条件をdataset cardだけで完全には監査できないため、製品利用前にprovenance確認が必要である。

### 利用形態別の整理

| 利用形態 | 現時点の評価 |
|---|---|
| コードをimport／改変して配布 | CC BY-SA 4.0の帰属・改変表示・ShareAlikeが関係する。アプリ全体への波及範囲は不明で法務確認必須 |
| モデルを同梱して配布 | 別model licenseが見つからないため、CC BY-SA 4.0適用を前提に慎重に扱う。著者確認推奨 |
| 結果だけ利用 | 数値波形という事実的出力へShareAlikeが及ぶかは明記されていない。入力画像の権利・個人情報も別途考慮が必要 |
| 商用利用 | CC BY-SA 4.0自体は商用利用を禁止しないが、上記条件と第三者権利の確認が必要 |

### 主要依存関係

公式requirementsはPyTorch、TorchVision、NumPy、SciPy、scikit-image、scikit-learn、OpenCV、Ray、Transformers等を含む。主要パッケージはApache-2.0、BSD、MIT系が中心だが、transitive dependenciesを含む完全な法務監査は未実施である。`torchaudio`と`yacs`はインストール済みmetadataだけではlicenseを確定できなかった。

## モデル容量とハッシュ

| ファイル | bytes | SHA256 |
|---|---:|---|
| `lead_name_unet_weights_07072025.pt` | 23,296,757 | `840BD6BF2433EE6C22DB67F57C861D9D427F29E10A32EEB334F0BCF061B175A2` |
| `unet_weights_07072025.pt` | 90,464,067 | `17FE7071EF270102631306127262FC08C250D79D4E3AEB572AB1719DD34D320B` |
| 合計 | 113,760,824（約108.49 MiB） | ― |

重み、upstream checkout、入力画像、生成物はすべてGit対象外である。

## 実行環境と依存導入

公式READMEはPython 3.12、Ubuntu/Debian、CUDAを試験環境としている。本PoCはWindows上のPython 3.12.13とCPU版PyTorchで実行した。

最初の`.venv-open-ecg`では、Windows長パス制限によりJupyterLab widgetのmapファイル配置に失敗した。短い`.oed-venv`へ同じ公式requirementsを導入して成功した。公式コードは変更していない。

Windows固有の実行条件として以下が必要だった。

- `PYTHONUTF8=1`: layout YAMLをcp932ではなくUTF-8で読む
- `MPLBACKEND=Agg`: Tcl/Tk不要のheadless plot
- 書込可能な`MPLCONFIGDIR`
- `device=cpu`: CUDAがないため

## 処理結果

| 項目 | 結果 |
|---|---|
| 認識layout | `3x4+1R` |
| layout matching cost | `0.024081663339730924` |
| 復元誘導 | 12/12 |
| canonical samples | 各誘導10,000 |
| sampling rate候補 | 1,000 Hz（公式George Moody設定の10秒／10,000 sample） |
| pixel spacing X | 0.166601 mm/pixel |
| pixel spacing Y | 0.168694 mm/pixel |
| average scale | 5.965122 pixel/mm |
| cold公式CLI wall time | 約60.03秒 |
| cold core pipeline | 約37.60秒 |
| warm wrapper total | 19.511秒 |
| warm core pipeline | 11.94秒 |
| peak process RAM | 3,109,707,776 bytes（約2.90 GiB） |

### NaN率

| Lead | NaN率 |
|---|---:|
| I | 75.00% |
| II | 0.00% |
| III | 76.57% |
| aVR | 75.34% |
| aVL | 75.34% |
| aVF | 76.36% |
| V1 | 75.48% |
| V2 | 75.61% |
| V3 | 75.54% |
| V4 | 75.61% |
| V5 | 75.00% |
| V6 | 75.27% |

短時間誘導の約75% NaNは、10秒canonical軸のうち当該誘導が印字されていない区間を含む。IIはlong stripのため全10秒が復元された。NaN率だけを抽出失敗率とは解釈できない。V4右端には入力画像に含まれる画面UIの重なりがあり、監査上の制限として残る。

## Segmentationと波形整合性

- signal maskはグリッドや誘導名より波形本体を優位に分離した
- overlay上でQRS、ST-T形態は概ね原画像へ重なった
- `3x4+1R`の列順と誘導割当は元画像と一致した
- long IIは連続した10秒波形として復元された
- 短時間誘導は本来の記録窓外をNaNとして保持した
- 一部誘導の窓境界に段差・短い断裂があり、客観計測前に品質ゲートが必要
- 画像1枚だけなので、重大な誘導取り違えなしという結果を一般化しない

upstreamはclinical quality labelを返さない。PoC JSONではこれを`null`／`not_provided_by_upstream`として保持し、独自confidenceを捏造していない。

## 監査出力

Git除外の`tools/open-ecg-digitizer-poc/output/wrapper`へ以下を生成した。

- `result.json`: layout、grid scale、全誘導signal、NaN、timing、RAM
- `audit/aligned-image.png`
- `audit/segmentation-signal-mask.png`
- `audit/segmentation-grid-mask.png`
- `audit/segmentation-overlay.png`
- `audit/reconstructed-waveforms.png`
- `audit/leads/*.png`: 誘導別復元波形

公式pipelineは誘導別の原画像cropを直接返さないため、本PoCではaligned full image、global overlay、誘導別復元plotで監査した。誘導別cropと復元波形の自動位置合わせは次段階の課題である。

## 失敗箇所の分類

1. 依存関係: Windows長パス制限で初回venv失敗。短いvenvで解決
2. runtime/config: cp932によるlayout YAML読込失敗。UTF-8 modeで解決
3. runtime/plot: Tcl/Tk backend不在。Agg backendで解決
4. wrapper audit: Matplotlib 3.11で無効なcolormap名を使用。wrapperのみ修正
5. layout／segmentation／signal reconstruction: 最終実行は成功

## 57ルールへの接続可能性

技術的には接続可能。ただし直結は禁止する。推奨境界は次の通り。

`digitized waveform + NaN + layout metadata → 客観計測adapter → 品質ゲート → 医師確認 → 承認値のみEcgRuleContext → 57ルール`

次段階でも画像モデルから診断名を生成しない。窓境界、NaN、誘導取り違え、grid scaleの妥当性を検証してから計測へ進む。

## ONNX／ブラウザ化

U-Net単体は一般論としてONNX export候補だが、公式export手順はない。pipelineにはperspective correction、crop、autocorrelation grid scale、layout matching、2D-to-1D signal extraction、lead-name U-Netが含まれるため、モデルだけ変換してもブラウザ化は完了しない。

現状の約2.90 GiB peak RAMとCPU推論時間から、現在構成のままブラウザへ移植するのは非現実的である。量子化、モデル分割、WebGPU対応演算子、前後処理のTypeScript/WASM移植を個別評価する必要がある。

## 通信とプライバシー

- OpenAI通信: 0
- 外部解析API: 0
- 推論時の画像アップロード: 0
- モデル取得時のみ公式GitHub／Git LFSへ通信
- 入力画像、重み、復元波形、mask、overlayはGitへcommitしない

## PoC判定

最小PoCは成功。1画像について公式pipelineを最後まで通し、12誘導、mask、NaN、layout、grid scale、監査plotを取得できた。

ただし採用判定は未完了である。最大の課題は、CC BY-SA 4.0のコード・重みを既存アプリへ組み込む際の配布境界と、約2.90 GiBのpeak RAMを含む実行負荷である。

次に行うべき1項目は、**ライセンス／重みの利用条件を著者へ確認したうえで、患者情報を含まない複数レイアウト画像による波形復元精度評価を設計すること**である。
