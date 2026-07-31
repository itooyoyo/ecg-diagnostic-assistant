import {tWaveEvidenceSources,tWaveSources} from "../../data/t-wave-interpretation/sources.js";
const groups={"前壁中隔（V1–V4）":["V1","V2","V3","V4"],"前壁（V2–V4）":["V2","V3","V4"],"側壁（I・aVL・V5・V6）":["I","aVL","V5","V6"],"下壁（II・III・aVF）":["II","III","aVF"],"右前胸部（V1–V3）":["V1","V2","V3"]};
const secondary=new Set(["rbbb","lbbb","paced","lvh","rvh","preexcitation","ventricular_rhythm","wide"]);
export function interpretTWave(input,integrated={}){
 const ms=input.leadMeasurements.map(m=>({...m,amplitudeMm:finite(m.amplitudeMm),amplitudeMv:finite(m.amplitudeMm)==null?null:Number((finite(m.amplitudeMm)/10).toFixed(3))}));
 const abnormal=ms.filter(m=>m.morphology!=="normal"), morphs=[...new Set(abnormal.map(m=>m.morphology).filter(x=>x!=="indeterminate"))];
 const leadsOf=m=>abnormal.filter(x=>x.morphology===m).map(x=>x.lead), v23=leadSet(abnormal,["V2","V3"]);
 const affectedLeadGroups=Object.entries(groups).filter(([,leads])=>leads.filter(l=>abnormal.some(m=>m.lead===l)).length>=2).map(([name])=>name);
 const missing=missingPreconditions(input); if(input.associatedQtStatus==="not_checked")missing.push("QT／QTc"); if(input.clinical.age==null||input.clinical.sex==null)missing.push("正常変異評価に必要な年齢・性別");
 const deepSymmetric=ms.some(m=>["V2","V3"].includes(m.lead)&&["inverted","giant_negative"].includes(m.morphology)&&m.symmetry==="symmetric");
 const biphasicPn=ms.some(m=>["V2","V3"].includes(m.lead)&&m.polarity==="biphasic_positive_negative");
 const wellensContext=input.clinical.chestPainHistory&&(v23||biphasicPn||deepSymmetric);
 let wellensPattern="not_supported"; if(wellensContext&&biphasicPn)wellensPattern="type_a_candidate"; else if(wellensContext&&deepSymmetric)wellensPattern="type_b_candidate"; else if(missingPreconditions(input).length)wellensPattern="indeterminate";
 const alternans=leadsOf("alternans").length>0&&input.clinical.macroscopicAlternationPersistent&&!input.clinical.artifactSuspected;
 const localHyper=leadsOf("hyperacute").length>=2&&affectedLeadGroups.length>0;
 const generalizedPeaked=leadsOf("peaked").length>=6;
 const qrsSecondary=secondary.has(input.qrsContext)||input.associatedQrsAbnormality;
 const stAbnormal=integrated.stResult&&integrated.stResult.overallClassification!=="no_significant_change"&&integrated.stResult.overallClassification!=="indeterminate";
 const redFlags=[];
 if(wellensPattern.startsWith("type_"))redFlags.push("胸痛歴とV2–V3中心のWellens pattern候補");
 if(localHyper&&input.clinical.ischemicSymptoms&&(input.newComparedWithPrior!==false))redFlags.push("新規・局在性hyperacute T waveと虚血症状");
 if(alternans)redFlags.push("肉眼的T-wave alternans");
 if(abnormal.length&&input.clinical.hemodynamicInstability)redFlags.push("T波異常と循環動態不安定");
 if(abnormal.length&&input.clinical.syncope)redFlags.push("T波異常と失神");
 if(generalizedPeaked&&input.clinical.renalFailure&&qrsSecondary)redFlags.push("高K血症を示唆する全般性尖鋭T波とQRS異常");
 if(leadsOf("giant_negative").length&&input.clinical.neurologicSymptoms)redFlags.push("新規巨大陰性T波と神経症状");
 if(missingPreconditions(input).length&&input.clinical.ischemicSymptoms)redFlags.push("判定不能だがACSの臨床疑いが残る");
 let overall="normal"; if(missingPreconditions(input).length||morphs.includes("indeterminate"))overall="indeterminate"; else if(morphs.length>1)overall="mixed"; else if(morphs.length===1)overall=({inverted:"t_wave_inversion",biphasic:"biphasic_t_wave",hyperacute:"hyperacute_t_wave",peaked:"peaked_t_wave",giant_negative:"giant_negative_t_wave",alternans:"t_wave_alternans",flattened:"flattened_t_wave"})[morphs[0]]??"indeterminate";
 const normalVariantCandidates=[]; const negativeLeads=abnormal.filter(m=>m.polarity==="negative").map(m=>m.lead); if(negativeLeads.length===1&&["aVR","V1","III"].includes(negativeLeads[0])&&input.newComparedWithPrior!==true&&!input.clinical.ischemicSymptoms&&!stAbnormal)normalVariantCandidates.push(`${negativeLeads[0]}単独陰性T波は正常変異候補`);
 const factors=[]; if(wellensContext||localHyper||stAbnormal)factors.push(factor("ischemia","急性虚血・再灌流後変化（Wellens patternを含む）","ischemia","high",true)); if(generalizedPeaked||leadsOf("flattened").length)factors.push(factor("electrolyte","電解質・代謝異常候補（心電図だけでは確定しない）","electrolyte","high",false)); if(qrsSecondary)factors.push(factor("secondary","QRS異常に伴う二次性T波変化","conduction","high",false)); if(leadsOf("giant_negative").length)factors.push(factor("structural","心筋・構造疾患／中枢神経障害候補","structural","high",false)); if(input.preconditions.placementConcern||input.clinical.artifactSuspected)factors.push(factor("technical","電極装着・アーチファクト","technical","high",false)); if(normalVariantCandidates.length)factors.push(factor("variant","生理的／非特異的変化候補","physiologic","low",false));
 const checks=dedupe(["胸痛","発症時刻","現在は無痛か","呼吸困難","失神","神経症状","血圧","SpO₂","前回心電図","連続心電図","トロポニン","K","Ca","Mg","腎機能","薬剤","心エコー",...(wellensContext||localHyper?["冠動脈評価"]:[]),...(input.clinical.neurologicSymptoms?["頭蓋内疾患評価"]:[])]);
 const actions=dedupe([...(input.clinical.hemodynamicInstability?["循環動態不安定への対応を最優先"]:[]),...(wellensContext?["Wellens patternを否定できないため直ちに循環器評価。運動負荷試験をroutineに提案しない"]:[]),...(localHyper?["短時間で再心電図を行いST変化への移行を確認"]:[]),...(alternans?["連続モニター、QT、K、Ca、Mg、基礎心疾患を確認"]:[]),...(generalizedPeaked?["K、腎機能、P波、PR、QRS幅、薬剤を至急確認"]:[]),...(abnormal.length?["QT／QTcを確認"]:[]),...(input.priorEcgAvailable?[]:["前回心電図と比較"])]);
 const warnings=[...(qrsSecondary?["QRS異常に伴う二次性T波変化の可能性があります。新規・過度・有症状・ST変化併存なら虚血を除外しません。"]:[]),...(wellensContext?["Wellens patternを否定できません。無痛時やトロポニン陰性でも除外せず、症状経過・連続心電図・心エコー・緊急冠動脈評価の必要性を確認してください。"]:[]),...(input.associatedQtStatus!=="confirmed"?[`QT連携：${input.associatedQtStatus==="not_checked"?"QT未確認":input.associatedQtStatus==="difficult"?"QT測定困難":"U波との区別困難"}`]:[])];
 return {leadMeasurements:ms,affectedLeadGroups,newComparedWithPrior:input.newComparedWithPrior,associatedStChange:integrated.stResult?stAbnormal:null,associatedQtProlongation:input.associatedQtStatus==="confirmed"?false:null,associatedQrsAbnormality:qrsSecondary,overallClassification:overall,wellensPattern,normalVariantCandidates,urgency:redFlags.length?"emergency":abnormal.length?"same_day":overall==="indeterminate"?"uncertain":"routine",redFlags,possibleFactors:factors,mustNotMiss:redFlags.length?factors.filter(f=>f.isRedFlag).concat(alternans?[factor("alternans","肉眼的T-wave alternans","other","high",true)]:[]):[],missingInformation:dedupe(missing),additionalChecks:checks,nextActions:actions,warnings,limitations:["T波形態だけで疾患、冠動脈病変、電解質異常を確定しません。","巨大陰性T波に数値閾値は適用していません。","microvolt T-wave alternans解析、QT詳細判定、脚ブロック詳細判定は未実装です。"],sources:tWaveEvidenceSources};
}
function factor(id,label,category,priority,isRedFlag){return {id:`t-${id}`,label,category,priority,supportingInputs:[label],contradictingInputs:[],requiredInputs:["臨床情報","前回心電図"],isRedFlag,sources:id==="alternans"?[tWaveSources.alternans]:id==="ischemia"?[tWaveSources.jcs,tWaveSources.wellens]:[tWaveSources.aha]}}
function missingPreconditions(i){const p=i.preconditions,r=[];if(!p.imageQualityAdequate)r.push("画像品質");if(!p.baselineStable)r.push("基線");if(!p.noiseAcceptable)r.push("筋電図ノイズ");if(!p.leadLabelsKnown)r.push("誘導名");if(p.placementConcern)r.push("電極装着");if(p.v1v2HighPlacementConcern)r.push("V1・V2高位装着");if(!p.heartRateKnown)r.push("心拍数");if(!p.rhythmKnown)r.push("リズム");return r}
function leadSet(ms,leads){return leads.filter(l=>ms.some(m=>m.lead===l)).length>=2} function finite(v){return typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null} function dedupe(a){return [...new Set(a)]}
