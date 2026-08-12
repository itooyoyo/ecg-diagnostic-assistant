# Wide QRS頻拍 Advanced入力：Rule化前監査

## 結論

- ECG-TACHY-006は追加しない。登録Ruleは59件のままとする。
- 4項目は監査入力として保持し、診断候補・緊急度・Red Flagへ渡さない。
- RS欠如とprecordial concordanceは、定義を画面上で確認できるため監査入力として試行可能。
- 最大RS intervalとBBB様形態は入力者依存性が高く、現時点ではRule化しない。
- 公開画像は10例をスクリーニングできたが、4項目すべてのreferenceが原著・症例解説に明記された10例（VT 5例、SVT with aberrancy 5例）は確保できなかった。画像から独自に正解を作らない。

## 入力定義

| 項目 | 見る場所 | 入力 | 判定困難条件 | 現時点の扱い |
| --- | --- | --- | --- | --- |
| V1–V6すべてでRSなし | V1–V6を1誘導ずつ | はい／いいえ／判定困難／未入力 | 1誘導でもR後のSの有無を決められない | 監査入力 |
| 最大RS interval | RS complexがあるV1–V6 | R波開始からS波最深点、ms | 開始点・最深点・紙送り速度が不明 | 教育補助 |
| BBB様形態 | 頻拍時QRS | RBBB-like／LBBB-like／どちらとも言えない／判定困難 | 典型形態との比較に確信がない | 教育補助 |
| Precordial concordance | V1–V6の主QRS方向 | positive／negative／mixed／判定困難 | 主方向または誘導を評価できない | 監査入力 |

25 mm/sでは1 mm = 40 msと表示する。RS intervalの数値欄は「測定可能」を明示した場合だけ有効にし、測定不能・判定困難では値を保持しない。

## 公開症例スクリーニング

公開論文中の12誘導または複数誘導画像を候補として確認した。画像はダウンロード・保存・Git追加していない。

| # | 症例ソース | 論文上の機序 | 対象群 | 4項目の完全reference | 採用 |
| --- | --- | --- | --- | --- | --- |
| 1 | [Electrocardiographic Surprise in WCT](https://pmc.ncbi.nlm.nih.gov/articles/PMC13198149/) | VT（capture/fusion、AV解離） | VT | なし | 不採用 |
| 2 | [Wide Complex Tachycardia in a Young Woman](https://pmc.ncbi.nlm.nih.gov/articles/PMC8414418/) | RVOT VT | VT | 一部のみ | 不採用 |
| 3 | [Chest Pain, BBB, and WCT](https://pmc.ncbi.nlm.nih.gov/articles/PMC11500536/) | slow VT/AIVR | VT | 一部のみ | 不採用 |
| 4 | [Activity-Related WCT](https://pmc.ncbi.nlm.nih.gov/articles/PMC6932122/) | VT | VT | なし | 不採用 |
| 5 | [ECG Diagnosis: Monomorphic VT](https://pmc.ncbi.nlm.nih.gov/articles/PMC3048638/) | probable monomorphic VT | VT | なし | 不採用 |
| 6 | [Diagnosing WCT Using Basic EP Properties](https://pmc.ncbi.nlm.nih.gov/articles/PMC8851580/) | supraventricular mechanism with aberrancy | SVT-A | 一部のみ | 不採用 |
| 7 | [Changing RBBB During Tachycardia](https://pmc.ncbi.nlm.nih.gov/articles/PMC9436399/) | SVT with RBBB aberrancyを含むEP鑑別 | SVT-A候補 | なし | 不採用 |
| 8 | [Alternating RBBB Morphologies](https://pmc.ncbi.nlm.nih.gov/articles/PMC7498521/) | dual AV nodal conductionによるWCT | SVT-A候補 | なし | 不採用 |
| 9 | [WCT with Pre-excitation](https://pmc.ncbi.nlm.nih.gov/articles/PMC5469279/) | pre-excited tachycardia | 対象外 | 一部のみ | 除外 |
| 10 | [WCT: What Is the Diagnosis?](https://pmc.ncbi.nlm.nih.gov/articles/PMC3860721/) | atriofascicular pathway-mediated tachycardia | 対象外 | 一部のみ | 除外 |

スクリーニング内訳はVT 5例、SVT with aberrancy相当3例、pre-excited/atriofascicular 2例である。目標のVT 5例は得られたが、SVT with aberrancy 5例と、全例の完全referenceは得られていない。したがって判定困難率や一致率を有効な数値として算出しない。

## Reference固定条件

Rule化検証へ採用する症例は、入力前に次を固定する。

1. VTまたはSVT with aberrancyの確定根拠（EP所見など）
2. V1–V6のRS欠如の有無
3. 各胸部誘導のRS intervalと最大値
4. RBBB-like／LBBB-like／neitherのreference
5. positive／negative／mixed concordanceのreference
6. 紙送り速度と判読可能な原寸画像

症例解説に記載がない項目を、アプリ開発者の画像判読だけでreferenceにしない。

## 入力再現性プロトコル

画像IDだけを使用し、患者情報・画像本体は保存しない。評価者はreferenceを見ずに次の表を1回目と、十分な間隔を空けた2回目で入力する。別評価者にも同じ表を使える。

| 画像ID | 評価者 | 回 | RS欠如 | 最大RS interval | 測定状態 | BBB様形態 | concordance | 判定困難理由 |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
|  |  | 1 |  |  |  |  |  |  |
|  |  | 2 |  |  |  |  |  |  |

項目ごとに完全一致を確認する。RS intervalはカテゴリ一致に加え実測差も記録する。必要症例と独立referenceが揃うまでは一致率を推測しない。

## Safety確認

- 未入力と判定困難を陰性へ変換しない。
- 4項目はTachyInput、EcgRuleContext、59 Rulesへ渡さない。
- regular monomorphic Wide QRS頻拍では、監査入力が空でもVT重要候補と既存urgencyを維持する。
- irregular Wide、多形性Wide、pre-excitationでは、この監査フォームを進めず既存の安全経路を使う。

## Rule化候補判定

| 項目 | 判定 | 理由 |
| --- | --- | --- |
| RS欠如 | 教育補助としてのみ使用 | 定義は比較的明確だが、独立reference付き症例と再現性データが不足 |
| 最大RS interval | 現時点では不適 | 測定点、紙送り速度、等電位成分により入力者依存性が高い |
| BBB様形態 | 現時点では不適 | 詳細形態基準なしに二分類を強制できない |
| Concordance | 教育補助としてのみ使用 | 定義は明確だが、主QRS方向が曖昧な症例の再現性確認が必要 |

## 根拠

- [Brugada et al. 1991（PubMed）](https://pubmed.ncbi.nlm.nih.gov/2022022/): 全胸部誘導でのRS欠如、RS intervalの原著。
- [Differential Diagnosis of Wide QRS Tachycardias](https://pmc.ncbi.nlm.nih.gov/articles/PMC7675136/): concordanceと各アルゴリズムのレビュー。
- [Algorithms used to differentiate WCTs demonstrate limitations](https://pubmed.ncbi.nlm.nih.gov/30497739/): 非循環器医による診断性能の限界。
- [New limb lead algorithm study](https://pubmed.ncbi.nlm.nih.gov/31546028/): アルゴリズム間の観察者一致度比較。

