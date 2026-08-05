# ECG rule catalog

本書は、現在実装されている医師作成ロジックを検索可能なIF–THEN形式で整理した台帳です。これは新しい医学ロジックではなく、`logic/`配下の既存判定を説明するための安定IDです。画像解析モデルは入力所見の抽出だけを担当し、診断候補・鑑別・追加確認・対応は本ルールエンジンが生成します。

重みは表示上の根拠強度です（★★★★★：見逃し防止・緊急、★★★★☆：強い候補、★★★☆☆：支持候補、★★☆☆☆：補助所見、★☆☆☆☆：技術的注意）。確定診断の確率ではありません。

## 優先順位

1. VF／心停止・無脈性リズム（蘇生対応）
2. STEMI相当の急性冠動脈閉塞候補（Sgarbossa、後壁・右室候補を含む）
3. 完全房室ブロック／高度房室ブロック
4. 重症高Kパターン
5. Brugada pattern候補
6. Wellens pattern候補
7. その他の既存ルール候補

同順位では`mustNotMiss`、緊急度、支持所見数の順で表示します。医師による除外・緊急度修正は候補そのものを消去せず、修正履歴を保持します。

## IF–THENルール

| Rule ID | 分類 | IF（医師確認所見） | THEN | 重み | 必要入力 | 入力不足時の追加確認 |
|---|---|---|---|---|---|---|
| Rule-P-001 | P波 | P波あり＋各QRSと1:1 | 洞性／心房調律評価を継続 | ★★☆☆☆ | P波、P-QRS関係 | V1/V2、長いリズムストリップ |
| Rule-P-002 | P波 | P波なし＋RR絶対不整＋細動波 | 心房細動候補 | ★★★★☆ | P波、RR規則性、細動波、QRS幅 | V1/V2、感度変更、長時間記録 |
| Rule-P-003 | P波 | F波＋2:1/3:1/4:1または可変伝導 | 心房粗動候補 | ★★★★☆ | F波、房室伝導比、RR | 下壁誘導、長い記録 |
| Rule-PR-001 | PQ（PR） | PR延長＋1:1伝導 | Ⅰ度房室ブロック候補 | ★★★☆☆ | PR、P-QRS関係 | PR再測定、前回ECG |
| Rule-PR-002 | PQ（PR） | PR漸増後QRS脱落 | Mobitz I候補 | ★★★★☆ | PR推移、QRS脱落 | 長いリズムストリップ |
| Rule-PR-003 | PQ（PR） | 一定PR後QRS脱落 | Mobitz II候補 | ★★★★★ | PR推移、脱落、QRS幅 | 長い記録、前回ECG、モニター |
| Rule-PR-004 | PQ（PR） | 複数非伝導P、2:1、またはAV解離 | 高度房室伝導障害候補 | ★★★★★ | P/QRS関係、心房・心室拍数、補充調律 | 長い記録、前回ECG、循環動態 |
| Rule-QRS-001 | QRS | QRS延長＋V1 rsR′＋側壁誘導幅広S | RBBB候補 | ★★★☆☆ | QRS幅、V1/V2、I/aVL/V5/V6 | 前回ECG、胸部誘導再確認 |
| Rule-QRS-002 | QRS | QRS延長＋V1深いS＋I/aVL/V5/V6幅広R＋側壁Q消失 | LBBB候補 | ★★★★☆ | QRS幅・形態、Q波 | 前回ECG、Sgarbossa入力 |
| Rule-QRS-003 | QRS | WideだがRBBB/LBBB基準を満たさない | IVCD候補 | ★★★☆☆ | QRS幅、脚ブロック形態 | K、薬剤、前回ECG |
| Rule-QRS-004 | QRS | 早期収縮＋幅広QRS＋先行Pなし | PVC候補 | ★★★☆☆ | 先行P、QRS形態、連結期 | 長い記録、PVC形態確認 |
| Rule-QRS-005 | QRS | PVCがT波終末へ重なる | R on T候補 | ★★★★★ | T終末、PVC開始、U波境界 | QT/QU再測定、長い記録 |
| Rule-QRS-006 | QRS | RBBB＋右軸＋右室strain＋低酸素 | 急性右心負荷候補 | ★★★★☆ | RBBB、軸、T波、SpO₂/症状 | 循環動態、Echo、臨床評価 |
| Rule-QT-001 | QT | 補正式別QTc延長 | QT延長候補 | ★★★☆☆ | QT、RR/心拍数、補正式、性別 | QT再測定、U波境界、K/Mg/Ca |
| Rule-QT-002 | QT | QT/ST短縮 | QT短縮／高Caパターン候補 | ★★★☆☆ | QT、Q-aT/ST、Ca | Ca・イオン化Ca、再ECG |
| Rule-QT-003 | QT | QT延長＋徐脈/PVC/R on T/多形性Wideのうち複数 | TdPリスク | ★★★★★ | QTc、リズム、PVC、電解質 | K/Mg/Ca、連続モニター、QT再測定 |
| Rule-AXIS-001 | 軸 | 左軸＋対応QRS形態 | LAFB候補 | ★★★☆☆ | QRS軸、I/aVL、下壁誘導 | 軸再測定、前回ECG |
| Rule-AXIS-002 | 軸 | 右軸＋対応QRS形態 | LPFB候補 | ★★★☆☆ | QRS軸、I/aVL、下壁誘導 | 右室負荷、前回ECG |
| Rule-AXIS-003 | 軸 | 右軸＋RBBB＋右室strain | 右心負荷の支持所見 | ★★★☆☆ | 軸、QRS、T波 | SpO₂、Echo、臨床評価 |
| Rule-R-001 | R波進行 | V1～V4でR波進行不良／R波消失 | 前壁病変または装着異常の鑑別 | ★★★☆☆ | V1～V6形態、装着位置、前回ECG | V1/V2位置、再記録、前回比較 |
| Rule-Q-001 | Q波 | 隣接誘導の病的Q波 | 既往/進行性心筋障害の支持所見 | ★★★☆☆ | Q幅・深さ、誘導分布 | 前回ECG、Echo、臨床経過 |
| Rule-ST-001 | ST | 隣接誘導ST上昇＋胸痛/reciprocal/動的変化/hyperacute T | 急性冠動脈閉塞候補 | ★★★★★ | ST高、隣接誘導、reciprocal、QRS背景、症状 | 再ECG、前回ECG、Echo |
| Rule-ST-002 | ST | II/III/aVF ST上昇＋低血圧/JVD/肺うっ血乏しい/房室ブロック | 下壁虚血＋右室/伝導障害候補 | ★★★★★ | 下壁ST、循環動態、伝導 | V4R、右側胸部誘導、Echo |
| Rule-ST-003 | ST | V1～V3水平型ST低下＋胸痛/高いR/動的変化 | 後壁虚血候補 | ★★★★★ | V1～V3 ST、R波、症状 | V7～V9、再ECG |
| Rule-ST-004 | ST | 広範ST低下＋aVR上昇 | 広範囲心内膜下虚血候補 | ★★★★★ | ST誘導分布、aVR、QRS背景 | 再ECG、循環動態、循環器評価 |
| Rule-ST-005 | ST | LBBB/ペーシング/RBBB | 通常ST基準を制限し二次性ST-Tを表示 | ★★★★☆ | QRS背景、ST方向 | 前回ECG、適用可能ならSgarbossa |
| Rule-ST-006 | ST | LBBB/ペーシング＋Original/Modified Sgarbossa陽性 | 急性冠動脈閉塞を強く疑う | ★★★★★ | QRS背景、J点ST、S波深さ、症状 | 再ECG、前回ECG、Echo |
| Rule-ST-007 | ST | LBBB/ペーシング＋Sgarbossa陰性/判定制限＋虚血症状 | 陰性のみで閉塞を除外しない | ★★★★★ | 同上 | 測定再確認、経時変化、前回ECG |
| Rule-T-001 | T波 | 新規対称性陰性T＋虚血症状 | 虚血性T波変化候補 | ★★★★☆ | 極性、対称性、新規性、誘導分布 | 前回ECG、再ECG、症状経過 |
| Rule-T-002 | T波 | hyperacute T＋隣接ST変化/症状 | 急性冠動脈閉塞の支持所見 | ★★★★★ | T波形、ST、誘導分布、症状 | 再ECG、前回ECG |
| Rule-T-003 | Wellens | V2～V3二相性/深い対称性陰性T＋胸痛歴 | Wellens pattern候補 | ★★★★★ | T形態、胸痛歴、現在の症状、Q波/R波 | 前回ECG、循環器評価（陰性troponinでも保持） |
| Rule-T-004 | T波 | 全般性尖鋭T＋P/QRS進行変化 | 高Kパターン候補 | ★★★★☆ | T波、P波、PR、QRS | 至急K、再ECG、モニター |
| Rule-T-005 | T波 | 巨大陰性T＋神経症状/心尖部肥大情報 | CNS/心尖部HCM等の鑑別 | ★★★☆☆ | T波分布、神経症状、構造情報 | Echo、臨床評価 |
| Rule-U-001 | U波 | T平低＋著明U＋QU延長 | 低K/低Mgパターンの支持 | ★★★★☆ | T/U境界、QU、ST、PVC | K/Mg/Ca、QT/QU再測定 |
| Rule-U-002 | U波 | QT著明延長だがT/U境界不明 | QT測定制限 | ★★★★☆ | T終末、U開始、RR | 別誘導、再計測、長い記録 |
| Rule-TACHY-001 | 頻脈 | Narrow＋規則＋逆行P/short RP＋突然発症 | AVNRT候補 | ★★★☆☆ | QRS幅、規則性、P、RP | V1/V2、長い記録 |
| Rule-TACHY-002 | 頻脈 | Narrow＋規則＋前興奮/逆行P | AVRT候補 | ★★★☆☆ | QRS、P、RP、デルタ/PR | 洞調律ECG、長い記録 |
| Rule-TACHY-003 | 頻脈 | Narrow＋不規則＋Pなし＋細動波 | AF候補 | ★★★★☆ | QRS幅、RR、P、細動波 | 長い記録、電解質、Echo |
| Rule-TACHY-004 | 頻脈 | F波＋一定/可変伝導 | AFL候補 | ★★★★☆ | F波、伝導比、RR | 長い記録 |
| Rule-TACHY-005 | 頻脈 | Wide頻拍（特にAV解離/capture/fusion/MI既往） | VTを除外できない／強く疑う | ★★★★★ | QRS幅、規則性、AV解離、capture/fusion | 12誘導再検、前回ECG、循環動態 |
| Rule-BRADY-001 | 徐脈 | 洞性P＋徐脈 | 洞性徐脈候補 | ★★★☆☆ | 心拍数、P、P-QRS | 症状、薬剤、前回ECG |
| Rule-BRADY-002 | 徐脈 | 洞停止/長いpause | 洞不全候補 | ★★★★☆ | PP、pause長、症状 | 長い記録、失神歴 |
| Rule-BRADY-003 | 徐脈 | PR漸増後脱落 | Mobitz I候補 | ★★★★☆ | PR推移、QRS幅 | 長い記録、下壁虚血評価 |
| Rule-BRADY-004 | 徐脈 | 一定PR後脱落 | Mobitz II候補 | ★★★★★ | PR推移、QRS幅 | モニター、前回ECG |
| Rule-BRADY-005 | 徐脈 | AV解離＋心房拍数>心室拍数＋補充調律 | 完全房室ブロック候補 | ★★★★★ | 心房/心室拍数、AV関係、補充QRS | 長い記録、循環動態、前回ECG |
| Rule-BRADY-006 | 徐脈 | 下壁ST上昇＋徐脈/房室ブロック | 下壁虚血関連伝導障害候補 | ★★★★★ | ST、心拍数、PR/P-QRS | V4R、再ECG、循環動態 |
| Rule-BBB-001 | 脚ブロック | QRS延長＋RBBB/LBBB形態 | 脚ブロック候補、通常ST-T評価を制限 | ★★★★☆ | QRS幅、V1/V2、I/aVL/V5/V6 | 前回ECG、電解質、Echo、虚血評価 |
| Rule-WPW-001 | WPW | PR短縮＋デルタ波＋Wide | 前興奮候補 | ★★★★☆ | PR、デルタ、QRS | 洞調律12誘導、前回ECG |
| Rule-WPW-002 | WPW | 不規則Wide頻拍＋前興奮＋可変QRS | 前興奮性AFを否定できない | ★★★★★ | 規則性、QRS、前興奮、心拍数 | 専門評価、薬剤安全性確認 |
| Rule-BRUGADA-001 | Brugada | V1/V2 coved/saddleback様ST＋適正装着 | Brugada pattern候補（現行は所見提示） | ★★★★☆ | V1/V2 ST形態、J点、装着位置、発熱/失神 | 高位肋間再記録、前回ECG、専門評価 |
| Rule-ELEC-001 | 電解質 | 尖鋭T＋P平低/消失＋QRS延長/Wide/sine wave | 高Kパターン候補 | ★★★★★ | P、PR、QRS、T、リズム | 至急K、血液ガス、再ECG、モニター |
| Rule-ELEC-002 | 電解質 | ST低下＋T平低＋U波＋QU延長±PVC/R on T | 低Kパターン候補 | ★★★★☆ | ST、T、U、QU、PVC | K/Mg/Ca、モニター |
| Rule-ELEC-003 | 電解質 | QT/ST短縮 | 高Caパターン候補 | ★★★☆☆ | QT、ST、Q-aTc | Ca・イオン化Ca |
| Rule-ELEC-004 | 電解質 | QT延長＋ST延長 | 低Caパターン候補 | ★★★★☆ | QT、ST、TdP所見 | Ca・イオン化Ca、モニター |
| Rule-ELEC-005 | 電解質 | QT延長＋PVC/VT/TdP | 低Mgパターン候補 | ★★★★☆ | QT、心室性不整脈 | Mg、K、Ca、モニター |
| Rule-QUALITY-001 | 撮影不良・電極装着 | 12誘導不足/ラベル不足/装着異常/画質不良 | 診断を正常扱いせず再記録を優先 | ★★★★★ | 画質、全誘導、ラベル、装着 | 適正条件で再記録。不安定なら急性対応を遅らせない |
| Rule-OTHER-001 | その他 | PVC頻度/連発/多形性/R on T候補が入力済み | 既存心室期外収縮ルールで危険度・追加確認を再計算 | ★★★★☆ | PVC形態、頻度、連結期、T終末、症状 | 長い記録、QT/QU、電解質、前回ECG |

## 責務境界

- 画像解析モデルの出力：測定値と観察所見のみ（心拍数、P、PR、QRS、軸、R波、Q波、ST、T、U、QT/QTc、品質、装着）。
- 禁止するモデル出力：診断名、鑑別、重症度、追加検査、治療・対応、薬剤選択。
- ルールエンジンの出力：候補、支持/矛盾所見、使用Rule ID、追加確認項目、鑑別、追加検査、初期対応、Red Flag。
- 医師修正後は同じルールエンジンを再実行し、画像モデルへ診断を問い合わせません。
