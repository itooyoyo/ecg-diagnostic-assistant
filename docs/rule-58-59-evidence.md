# ECG-ST-008 / ECG-ST-009 医学的根拠

## 適用範囲

この文書は、既存57ルールに追加承認された2つの Explainable Rule の根拠と制限を記録する。いずれも診断確定ルールではなく、ST低下の競合する説明を保持するためのルールである。虚血・ACS関連ルールを抑制しない。

## ECG-ST-008 — Digitalis effect / digitalis関連ST-T変化

FDAのLANOXIN（digoxin）公式添付文書は、治療量のdigoxinでもPR延長とST低下を生じ得ること、運動負荷時には虚血と区別困難な偽陽性ST-T変化を生じ得ること、これらの電気生理学的変化自体は中毒を意味しないことを記載している。

- IF: digitalis使用が明示され、かつST低下が明示される
- THEN: 「Digitalis effectによるST-T変化」を鑑別候補として保持する
- 制限: digitalis使用単独では発火しない。虚血なし、ACSなし、digitalis toxicity、薬剤中止を結論しない。症状、前回ECG、連続ECG、既存ACS評価を並列して確認する。

一次資料:

- [FDA LANOXIN label (2019), ECG Changes](https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/020405s015lbl.pdf)
- [FDA Digoxin label (2015), ECG Changes During Exercise](https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/021648s008lbl.pdf)

## ECG-ST-009 — Rate-related ST change / 頻脈関連ST-T変化

発作性上室頻拍中のST低下は心拍数と関連し、冠動脈病変がなくても生じ得ることが一次研究で報告されている。一方、頻脈中のST低下のみで虚血を確定できず、また症状・循環動態・持続する変化がある状況で虚血を否定する根拠にもならない。

- IF: 明示的な頻脈（既存閾値）とST低下が同時に入力される
- THEN: 「頻脈に伴う二次性ST変化」を鑑別候補として保持する
- 制限: ST低下を正常扱いしない。虚血・ACS候補を削除しない。心拍数改善後のECG、前回ECG、必要時の連続12誘導・既存ACS評価を確認する。

一次文献:

- [Pronounced ST-segment depression during paroxysmal supraventricular tachycardia (PMID 8411633)](https://pubmed.ncbi.nlm.nih.gov/8411633/)
- [Relationship of myocardial ischemia and injury to CAD in SVT (PMID 20643248)](https://pubmed.ncbi.nlm.nih.gov/20643248/)
- [Analysis of ST segment depression in SVT (PMID 38960131)](https://pubmed.ncbi.nlm.nih.gov/38960131/)

## 競合時の扱い

digitalis使用、頻脈、ST低下が重なる場合は、Digitalis effect、rate-related ST change、心筋虚血を同時に保持できる。結果は一つへ強制せず、臨床背景と経時変化を含めた再評価を促す。
