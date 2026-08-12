# ECG Rule Engine Version 2 回帰検証

- 検証日: 2026-08-05
- 対象: ECG Diagnostic Assistant Version 2（未コミット作業ツリー）
- 症例: 合成fixture 20例（実患者データ・画像なし）
- 比較: 既存判定関数の直接出力と、同出力をRule ID／不足／競合メタデータ付きで返す台帳Adapter経路

## 集計

| 項目 | 件数 |
|---|---:|
| 実行成功 | 20 |
| 完全一致 | 20 |
| 意味的一致 | 0 |
| 表現・表示順のみ相違 | 0 |
| 重大不一致 | 0 |
| 緊急度低下 | 0 |
| Red Flag消失 | 0 |
| 部分対応 | 1 |
| 未実装 | 0 |

「完全一致」は、Adapterが既存臨床出力オブジェクトを変更せず返すことをdeep equalityで確認した結果である。Brugada patternは既存の独立判定エンジンがないため、症例実行自体は成功するが台帳評価は部分対応とした。新しい医学条件で補完していない。

## 症例別結果

| ID | 症例 | 旧／台帳 | 緊急度・分類 | 主な発火Rule ID | 不足入力 | 対応状況 |
|---|---|---|---|---|---|---|
| V2-CASE-01 | 正常洞調律 | 完全一致 | routine、Red Flagなし | なし | なし | 完全対応 |
| V2-CASE-02 | 洞性徐脈 | 完全一致 | sinus bradycardia candidate | ECG-BRADY-001 | なし | 完全対応 |
| V2-CASE-03 | 洞性頻脈 | 完全一致 | sinus tachycardia candidate | なし（fixture: CASE-TACHY-SINUS-006） | なし | 完全対応 |
| V2-CASE-04 | 心房細動 | 完全一致 | atrial fibrillation candidate | ECG-PWAVE-002、ECG-TACHY-003 | なし | 完全対応 |
| V2-CASE-05 | 心房粗動 | 完全一致 | atrial flutter candidate | ECG-PWAVE-003、ECG-TACHY-004 | なし | 完全対応 |
| V2-CASE-06 | AVNRT相当 | 完全一致 | AVNRT candidate | ECG-TACHY-001 | なし | 完全対応 |
| V2-CASE-07 | WPW／早期興奮 | 完全一致 | pre-excited AF candidate | ECG-WPW-002 | なし | 完全対応 |
| V2-CASE-08 | 単発PVC | 完全一致 | isolated low complexity | ECG-ECTOPY-001 | なし | 完全対応 |
| V2-CASE-09 | PVC＋R on T | 完全一致 | same day、TdP risk | ECG-QT-003 | なし | 完全対応 |
| V2-CASE-10 | 持続性VT候補 | 完全一致 | emergency | ECG-TACHY-005 | なし | 完全対応 |
| V2-CASE-11 | 完全房室ブロック | 完全一致 | emergency | ECG-AVBLOCK-004、ECG-BRADY-005 | なし | 完全対応 |
| V2-CASE-12 | Mobitz II候補 | 完全一致 | emergency | ECG-AVBLOCK-004 | なし | 完全対応 |
| V2-CASE-13 | RBBB | 完全一致 | RBBB candidate | ECG-QRS-001、ECG-BBB-001 | なし | 完全対応 |
| V2-CASE-14 | LBBB | 完全一致 | LBBB、通常ST評価制限 | ECG-QRS-002、ECG-BBB-001 | Sgarbossa誘導別測定 | 完全対応 |
| V2-CASE-15 | 前壁急性冠閉塞候補 | 完全一致 | emergency | ECG-ST-001 | なし | 完全対応 |
| V2-CASE-16 | 下壁急性冠閉塞＋右室評価 | 完全一致 | emergency | ECG-ST-002 | V4R | 完全対応 |
| V2-CASE-17 | Wellens候補 | 完全一致 | emergency | ECG-WELLENS-001 | なし | 完全対応 |
| V2-CASE-18 | Brugada pattern候補 | 完全一致（現状出力） | 独立判定未実装 | なし | V1・V2装着位置 | 部分対応 |
| V2-CASE-19 | 重症高K | 完全一致 | emergency | ECG-ELECTROLYTE-001 | 採血による確認 | 完全対応 |
| V2-CASE-20 | 低K＋QT/QU延長・U波 | 完全一致 | emergency | ECG-ELECTROLYTE-002 | K/Mg/Ca | 完全対応 |

## 不足入力

- 下壁急性冠閉塞候補は保持したままV4Rを追加確認として提示した。
- LBBBは通常ST基準で正常扱いせず、Sgarbossa専用測定不足を保持した。
- BrugadaはV1・V2装着位置確認を保持し、未実装の独立診断を補完しなかった。
- null／unknownを正常値へ変換していない。

## 競合・併存シナリオ

| シナリオ | 現行結果 |
|---|---|
| 高K＋ST上昇 | 高K候補と急性冠閉塞候補を併存保持 |
| LBBB＋虚血疑い | 虚血候補を保持し、専用評価制限を保持 |
| 頻拍＋ST低下 | 各既存モジュールで別々に評価。統合competing IDは未分離 |
| RBBB＋V1～V3 ST上昇 | 各既存モジュールで別々に評価。統合competing IDは未分離 |
| 低K＋PVC＋R on T | 低K/Mg候補とTdPリスクを併存保持 |
| 電極逆接続＋偽性虚血 | 技術的制限を優先し、ACS候補は抑制される既存挙動を記録 |

電極逆接続時にACS候補が抑制される点は旧実装と台帳経路で一致するため移行不一致ではない。ただし「競合候補を消去しない」というVersion 2目標に対する旧実装側の欠落として残す。医学的判断が必要なため今回は変更していない。

## 修正内容

- 20例の構造化fixtureを追加
- Rule IDマッピングと判定理由の結合を回帰テスト化
- Adapter経由で臨床出力が変わらないことを20例すべてで検証
- 不足入力、競合ケース、部分対応を明示

医学ロジック、閾値、診断基準、治療内容は変更していない。

## 残る課題

- Brugada patternの既存判定を共通Rule Adapterへ分離
- 頻拍＋ST低下、RBBB＋V1～V3 ST上昇のcompeting Rule ID統合
- 電極逆接続時の虚血候補保持方針は医学的確認後に決定
- ルール台帳Adapterを全57件へ拡張
- ブラウザ上で20 fixtureを投入する開発専用ハーネスは未実装
