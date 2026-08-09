# Version 3画像解析機能の保留状況

## 目的

ECG Diagnostic Assistantの正式運用版をVersion 2へ固定し、Version 3で検討した画像自動所見抽出の現状、採用判断、再開条件を記録する。

## 現行正式版

Version 2を正式運用版とする。PIN認証、心電図画像の表示・切り抜き・回転、医師による系統的所見入力、57ルール、Explainable Rule Engine、Red Flag、診断候補、鑑別、判定理由、追加確認、追加検査、初期対応を維持する。患者画像を外部AIへ送信しない。

## 自作PoCの結果

隔離feature branchで、3×4／6×2レイアウト、long II分離、Polyline抽出、Connected Components、R候補抽出、QRS形態品質評価、安全ゲートを検証した。

判定不能を正常へ補完しないこと、低品質な抽出結果を57ルールへ流入させないこと、画像を外部送信しないことは確認できた。一方、正常波形、LBBB、AFなど複数の実画像・グリッド条件でR候補、QRS形態、HR／RRを安定して抽出できず、Version 3の採用基準には達しなかった。

## 既存Digitizerの調査

- Open ECG Digitizer：技術PoCでは12誘導復元を確認したが、CC BY-SA 4.0のShareAlikeを含む配布条件により正式採用しない。
- ECG-Digitiser：ソースコードはBSD-2-Clauseだが、pretrained model weightsの商用利用・改変・再配布条件を明示する個別ライセンスを確認できないため採用しない。
- その他の公開実装：permissiveなsource licenseとpretrained weights licenseの両方を満たし、商用組み込み・再配布まで明確な候補は確認できなかった。

## 保留判断

画像を選択すると所見を自動抽出し、57ルールで結果を表示するVersion 3機能は正式に保留する。自作Digitizer開発へ自動的に戻らず、Version 2の臨床検証と保守を優先する。

## 再開条件

以下のいずれかが成立した場合のみ、別feature branchで再評価する。

1. MIT、BSD、Apache-2.0等の明示的なpermissive licenseを持つECG Digitizerが公開される。
2. source codeとpretrained model weightsの双方について、商用利用、改変、アプリ組み込み、再配布条件が明確で、ShareAlikeおよび本アプリのソース公開義務がないモデルが公開される。
3. 十分な検証症例数、正解データ、精度基準を用意した自作Digitizer研究プロジェクトを正式に開始する。

## 保持する研究記録

以下は削除せず、Productionへ統合しない研究記録として保持する。

- `feature/local-ecg-poc-validation`
- `feature/open-ecg-digitizer-poc`
- 自作画像解析PoC、Connected Component実験、Open ECG Digitizer PoC
- 評価文書およびライセンス調査文書

## Version 2への影響

実験feature branchは`main`へmergeしない。Version 2のProduction build、PIN認証、医師入力、57ルール、結果表示およびMedical Hubからの導線に画像解析PoCを依存させない。

Production UIでは自動画像解析を利用可能または近日提供と案内せず、次の運用説明を表示する。

> 心電図画像を参照しながら所見を入力してください。入力された所見をルールに基づいて解析します。

## Version 2の保守対象

- 57ルールの臨床検証と重複確認
- ガイドライン改訂時の更新
- 代表症例回帰テスト
- UI改善と見落とし防止
- バグ修正
