import {adaptExistingRule} from "./rule-adapter.js";

const raw=`
ECG-PWAVE-001|p_wave_atrial|P波とQRSの1:1関係|P波,P-QRS関係|40|information|tachy
ECG-PWAVE-002|p_wave_atrial|心房細動候補|P波,RR規則性,細動波,QRS幅|80|urgent|tachy
ECG-PWAVE-003|p_wave_atrial|心房粗動候補|F波,房室伝導比,RR|80|urgent|tachy
ECG-AVBLOCK-001|pr_pq|I度房室ブロック候補|PR,P-QRS関係|60|attention|brady
ECG-AVBLOCK-002|pr_pq|Mobitz I候補|PR推移,QRS脱落|80|urgent|brady
ECG-AVBLOCK-003|pr_pq|Mobitz II候補|PR推移,QRS脱落,QRS幅|100|emergency|brady
ECG-AVBLOCK-004|pr_pq|高度房室伝導障害候補|P-QRS関係,心房拍数,心室拍数,補充調律|100|emergency|brady
ECG-QRS-001|qrs|RBBB候補|QRS幅,V1-V2,I-aVL-V5-V6|60|attention|conduction
ECG-QRS-002|qrs|LBBB候補|QRS幅,QRS形態,Q波|80|urgent|conduction
ECG-QRS-003|qrs|IVCD候補|QRS幅,脚ブロック形態|60|attention|conduction
ECG-QRS-004|ectopy_r_on_t|PVC候補|先行P,QRS形態,連結期|60|attention|pvc
ECG-QRS-005|ectopy_r_on_t|R on T候補|T終末,PVC開始,U波境界|100|emergency|pvc
ECG-QRS-006|qrs|急性右心負荷候補|RBBB,軸,T波,SpO2-症状|80|urgent|integration
ECG-QT-001|qt_qtc|QT延長候補|QT,RR-心拍数,補正式,性別|60|attention|qt
ECG-QT-002|qt_qtc|QT短縮候補|QT,Q-aT-ST,Ca|60|attention|qt
ECG-QT-003|qt_qtc|TdPリスク|QTc,リズム,PVC,電解質|100|emergency|qt
ECG-AXIS-001|axis|LAFB候補|QRS軸,I-aVL,下壁誘導|60|attention|conduction
ECG-AXIS-002|axis|LPFB候補|QRS軸,I-aVL,下壁誘導|60|attention|conduction
ECG-AXIS-003|axis|右心負荷支持所見|軸,QRS,T波|60|attention|conduction
ECG-RWAVE-001|r_wave_progression|R波進行異常候補|V1-V6形態,装着位置,前回ECG|60|attention|systematic
ECG-QWAVE-001|q_wave|病的Q波候補|Q波幅,Q波深さ,誘導分布|60|attention|systematic
ECG-ST-001|st|急性冠動脈閉塞候補|ST高,隣接誘導,reciprocal,QRS背景,症状|100|emergency|st
ECG-ST-002|st|下壁虚血・右室評価|下壁ST,循環動態,伝導|100|emergency|st
ECG-ST-003|st|後壁虚血候補|V1-V3 ST,R波,症状|100|emergency|st
ECG-ST-004|st|広範囲心内膜下虚血候補|ST誘導分布,aVR,QRS背景|100|emergency|st
ECG-ST-005|st|二次性ST-T変化|QRS背景,ST方向|80|urgent|st
ECG-ST-006|st|Sgarbossa陽性閉塞候補|QRS背景,J点ST,S波深さ,症状|100|emergency|sgarbossa
ECG-ST-007|st|Sgarbossa判定制限|QRS背景,J点ST,S波深さ,症状|100|emergency|sgarbossa
ECG-TWAVE-001|t_wave|虚血性T波変化候補|極性,対称性,新規性,誘導分布|80|urgent|twave
ECG-TWAVE-002|t_wave|hyperacute T支持所見|T波形,ST,誘導分布,症状|100|emergency|twave
ECG-WELLENS-001|wellens_pattern|Wellens pattern候補|T形態,胸痛歴,現在症状,Q波-R波|100|emergency|twave
ECG-TWAVE-004|t_wave|高Kパターン支持|T波,P波,PR,QRS|80|urgent|twave
ECG-TWAVE-005|t_wave|巨大陰性T波鑑別|T波分布,神経症状,構造情報|60|attention|twave
ECG-UWAVE-001|u_wave|低K・低Mg支持|T-U境界,QU,ST,PVC|80|urgent|electrolyte
ECG-UWAVE-002|u_wave|QT測定制限|T終末,U開始,RR|80|urgent|qt
ECG-TACHY-001|tachyarrhythmia|AVNRT候補|QRS幅,規則性,P波,RP|60|attention|tachy
ECG-TACHY-002|tachyarrhythmia|AVRT候補|QRS,P波,RP,デルタ-PR|60|attention|tachy
ECG-TACHY-003|tachyarrhythmia|AF候補|QRS幅,RR,P波,細動波|80|urgent|tachy
ECG-TACHY-004|tachyarrhythmia|AFL候補|F波,伝導比,RR|80|urgent|tachy
ECG-TACHY-005|tachyarrhythmia|VT候補|QRS幅,規則性,AV解離,capture-fusion|100|emergency|tachy
ECG-BRADY-001|bradyarrhythmia|洞性徐脈候補|心拍数,P波,P-QRS関係|60|attention|brady
ECG-BRADY-002|bradyarrhythmia|洞不全候補|PP,pause長,症状|80|urgent|brady
ECG-BRADY-003|bradyarrhythmia|Mobitz I候補|PR推移,QRS幅|80|urgent|brady
ECG-BRADY-004|bradyarrhythmia|Mobitz II候補|PR推移,QRS幅|100|emergency|brady
ECG-BRADY-005|bradyarrhythmia|完全房室ブロック候補|心房拍数,心室拍数,AV関係,補充QRS|100|emergency|brady
ECG-BRADY-006|bradyarrhythmia|下壁虚血関連伝導障害|ST,心拍数,PR-P-QRS|100|emergency|brady
ECG-BBB-001|bundle_branch_ivcd|脚ブロック候補|QRS幅,V1-V2,I-aVL-V5-V6|80|urgent|conduction
ECG-WPW-001|wpw_preexcitation|前興奮候補|PR,デルタ波,QRS|80|urgent|tachy
ECG-WPW-002|wpw_preexcitation|前興奮性AF候補|規則性,QRS,前興奮,心拍数|100|emergency|tachy
ECG-BRUGADA-001|brugada_pattern|Brugada pattern候補|V1-V2 ST形態,J点,装着位置|80|urgent|brugada
ECG-ELECTROLYTE-001|electrolyte_pattern|高Kパターン候補|P波,PR,QRS,T波,リズム|100|emergency|electrolyte
ECG-ELECTROLYTE-002|electrolyte_pattern|低Kパターン候補|ST,T波,U波,QU,PVC|80|urgent|electrolyte
ECG-ELECTROLYTE-003|electrolyte_pattern|高Caパターン候補|QT,ST,Q-aTc|60|attention|electrolyte
ECG-ELECTROLYTE-004|electrolyte_pattern|低Caパターン候補|QT,ST,TdP所見|80|urgent|electrolyte
ECG-ELECTROLYTE-005|electrolyte_pattern|低Mgパターン候補|QT,心室性不整脈|80|urgent|electrolyte
ECG-QUALITY-001|quality_placement|撮影品質・電極装着制限|画質,全誘導,誘導ラベル,装着|100|emergency|quality
ECG-ECTOPY-001|ectopy_r_on_t|心室期外収縮の危険度|PVC形態,頻度,連結期,T終末,症状|80|urgent|pvc`;

const implementationFiles={tachy:["logic/tachyarrhythmia/classify.js"],brady:["logic/bradyarrhythmia/interpret-brady.js"],conduction:["logic/conduction-interpretation/interpret-conduction.js"],pvc:["logic/ventricular-ectopy/interpret-ventricular-ectopy.js"],qt:["logic/qt-interpretation/interpret-qt.js"],st:["logic/st-interpretation/interpret-st.js"],sgarbossa:["logic/sgarbossa/interpret-sgarbossa.js"],twave:["logic/t-wave-interpretation/interpret-t-wave.js"],electrolyte:["logic/electrolyte-interpretation/interpret-electrolytes.js"],integration:["logic/integration/build-integrated-interpretation.js"],systematic:["logic/interpretation/build-interpretation.js"],quality:["logic/quality/quality.js"],brugada:["data/rule-engine/rule-registry.js"]};

function defaultEvaluation(rule,context){const snapshot=context?.evaluations?.[rule.id];if(snapshot)return adaptExistingRule(snapshot);return adaptExistingRule({status:"insufficient_data",missingInputs:[...rule.requiredInputs],explanationJa:`${rule.titleJa}の評価に必要な入力が不足しています。`})}
function evaluateBrugada(rule,context){const input=context?.inputs?.brugada??{};const missing=[];if(input.pattern==null)missing.push("V1／V2 ST形態");if(input.placementConfirmed==null)missing.push("V1／V2装着位置");if(missing.length)return adaptExistingRule({status:"insufficient_data",matchedConditions:input.pattern===true?["V1／V2のBrugada様形態"]:[],missingInputs:missing,explanationJa:"Brugada patternの評価に必要な形態または装着位置が未確認です。"});if(input.pattern===false)return adaptExistingRule({status:"not_matched",explanationJa:"医師入力ではBrugada様形態を認めません。"});if(input.placementConfirmed===false)return adaptExistingRule({status:"insufficient_data",matchedConditions:["V1／V2のBrugada様形態"],missingInputs:["適正肋間でのV1／V2再記録"],conflictingInputs:["V1／V2装着位置未確認"],explanationJa:"装着位置の影響を除外できないため、Brugada pattern候補を保留します。"});const supporting=["適正装着でV1／V2のBrugada様形態",input.syncope===true&&"失神歴",input.familyHistory===true&&"家族歴"].filter(Boolean);return adaptExistingRule({status:"matched",matchedConditions:supporting,explanationJa:"既存入力に基づきBrugada pattern候補として評価します。RBBB様波形との鑑別が必要です。"})}

export const ecgRuleRegistry=raw.trim().split("\n").map(line=>{const [id,category,titleJa,required,priority,severity,implementation]=line.split("|");const rule={id,version:"2.0.0",category,titleJa,descriptionJa:`既存アプリ判定「${titleJa}」を共通形式で評価します。`,requiredInputs:required.split(","),optionalInputs:[],priority:Number(priority),severity,outputs:{},sourceClassification:"existing_app_rule",sourceRefs:[],limitations:["既存判定関数の結果を変更しません。"],implementationFiles:implementationFiles[implementation]??[],testIds:[]};return {...rule,evaluate:context=>id==="ECG-BRUGADA-001"?evaluateBrugada(rule,context):defaultEvaluation(rule,context)}});
export const ecgRuleById=new Map(ecgRuleRegistry.map(rule=>[rule.id,rule]));
export function evaluateRule(id,context){const rule=ecgRuleById.get(id);if(!rule)throw new Error(`Unknown ECG rule: ${id}`);return rule.evaluate(context)}

