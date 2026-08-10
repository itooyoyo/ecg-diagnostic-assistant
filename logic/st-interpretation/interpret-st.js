import { contiguousLeadGroups, elevationThresholdMm } from "../../data/st-interpretation/criteria.js";
import { stFactors } from "../../data/st-interpretation/factors.js";
import { stEvidenceSources } from "../../data/st-interpretation/sources.js";

const abnormalQrsContexts=new Set(["rbbb","lbbb","paced","lvh","preexcitation","other"]);

export function createEmptyStMeasurement(lead){
  return {lead,direction:"indeterminate",amplitudeMm:null,amplitudeMv:null,measurementPoint:"unknown",morphology:"indeterminate",baselineReference:"uncertain",clinicianConfirmed:false,confidence:null,limitations:[]};
}

export function normalizeMeasurement(measurement){
  const amplitudeMm=finiteOrNull(measurement.amplitudeMm);
  return {...measurement,amplitudeMm,amplitudeMv:amplitudeMm==null?null:Number((amplitudeMm/10).toFixed(3))};
}

export function assessLeadMeasurement(measurement,clinical){
  const value=normalizeMeasurement(measurement);
  if(value.direction==="indeterminate"||value.amplitudeMm==null)return {lead:value.lead,significant:null,reason:"方向または振幅が未確定です"};
  if(value.direction==="isoelectric")return {lead:value.lead,significant:false,reason:"等電位として確認済みです"};
  if(value.baselineReference==="uncertain"||value.measurementPoint==="unknown")return {lead:value.lead,significant:null,reason:"基線または測定時点が未確定です"};
  if(value.direction==="elevation"){
    if(value.measurementPoint!=="j_point")return {lead:value.lead,significant:null,reason:"ST上昇基準はJ点測定値で評価します"};
    const criterion=elevationThresholdMm(value.lead,clinical.age,clinical.sex);
    return {lead:value.lead,significant:criterion.threshold==null?null:value.amplitudeMm>=criterion.threshold,reason:criterion.reason};
  }
  const morphologyEligible=value.morphology==="horizontal"||value.morphology==="downsloping";
  return {lead:value.lead,significant:morphologyEligible&&value.amplitudeMm>=0.5,reason:morphologyEligible?"水平型または右下がり型で0.5 mm以上を評価":"形状単独では虚血性ST低下と確定しません"};
}

export function interpretStChanges(input){
  const measurements=input.leadMeasurements.map(normalizeMeasurement);
  const qualitativeReview=["elevation","depression","mixed"].includes(input.clinicalReviewStatus);
  const leadResults=measurements.map((measurement)=>input.clinicalReviewStatus==="none"&&measurement.clinicianConfirmed?{lead:measurement.lead,significant:false,reason:"通常画面で明らかなST変化なしとして医師確認済みです"}:qualitativeReview&&measurement.clinicianConfirmed&&(measurement.direction==="elevation"||measurement.direction==="depression")?{lead:measurement.lead,significant:true,reason:"通常画面で明らかなST変化として医師確認済みです"}:assessLeadMeasurement(measurement,input.clinical));
  const significant=(direction)=>measurements.filter((measurement,index)=>measurement.direction===direction&&leadResults[index].significant===true).map((measurement)=>measurement.lead);
  const elevated=significant("elevation");
  const depressed=significant("depression");
  const groups=[];
  for(const [name,leads] of Object.entries(contiguousLeadGroups)){
    const elevationCount=leads.filter((lead)=>elevated.includes(lead)).length;
    const depressionCount=leads.filter((lead)=>depressed.includes(lead)).length;
    if(elevationCount>=2)groups.push(`${name}：連続誘導ST上昇`);
    if(depressionCount>=2)groups.push(`${name}：連続誘導ST低下`);
  }
  const inferiorElevation=groups.some((group)=>group.startsWith("下壁")&&group.includes("ST上昇"));
  const posteriorPattern=["V1","V2","V3"].filter((lead)=>depressed.includes(lead)).length>=2;
  const diffuseDepression=depressed.filter((lead)=>lead!=="aVR").length>=6;
  const avrElevation=elevated.includes("aVR");
  const derivedReciprocal=inferiorElevation&&["I","aVL"].some((lead)=>depressed.includes(lead));
  const reciprocalPresent=input.reciprocalFinding.status==="present"||derivedReciprocal;
  const dynamic=input.dynamicChange===true||input.priorComparison==="new"||input.priorComparison==="worsened"||input.priorComparison==="transient";
  const missingPreconditions=collectMissingPreconditions(input.preconditions);
  const qrsSecondary=abnormalQrsContexts.has(input.qrsContext);
  let overallClassification=input.clinicalReviewStatus==="none"?"no_significant_change":"indeterminate";
  if(input.clinicalReviewStatus==="unentered"||input.clinicalReviewStatus==="indeterminate")overallClassification="indeterminate";
  else if(missingPreconditions.length||leadResults.some((result)=>result.significant===null&&!qualitativeReview))overallClassification="indeterminate";
  else if(qrsSecondary&&(elevated.length||depressed.length))overallClassification="secondary_repolarization_change";
  else if(elevated.length&&depressed.length)overallClassification="mixed";
  else if(elevated.length)overallClassification="st_elevation";
  else if(depressed.length)overallClassification="st_depression";
  else if(input.clinicalReviewStatus==null)overallClassification="no_significant_change";

  const redFlags=[];
  const ischemicSymptoms=input.clinical.ischemicSymptoms===true;
  if(input.clinical.hemodynamicInstability&&(elevated.length||depressed.length))redFlags.push("循環動態不安定を伴うST変化");
  if(ischemicSymptoms&&groups.some((group)=>group.includes("ST上昇")))redFlags.push("虚血症状と連続誘導ST上昇の併存");
  if(dynamic)redFlags.push("新規または動的なST変化");
  if(reciprocalPresent&&elevated.length)redFlags.push("ST上昇とreciprocal changeの併存");
  if(inferiorElevation&&input.clinical.hypotension)redFlags.push("下壁誘導ST上昇と低血圧の併存");
  if(posteriorPattern&&input.clinical.posteriorOcclusionSuspected)redFlags.push("V1–V3水平型ST低下と後壁虚血疑い");
  if(diffuseDepression&&avrElevation&&ischemicSymptoms)redFlags.push("広範なST低下とaVR上昇を伴う虚血症状");
  if(overallClassification==="indeterminate"&&ischemicSymptoms)redFlags.push("ST判定不能だがACSの臨床疑いが残る");

  const suggestedAdditionalLeads=[];
  if(inferiorElevation)suggestedAdditionalLeads.push({type:"right-sided",leads:["V3R","V4R","V5R","V6R"],emphasizedLead:"V4R",message:"右室梗塞評価のため、V4Rを含む右側胸部誘導を追加してください。"});
  if(posteriorPattern||input.clinical.posteriorOcclusionSuspected||input.clinical.highRWaveV1toV3)suggestedAdditionalLeads.push({type:"posterior",leads:["V7","V8","V9"],message:"後壁虚血評価のため、V7–V9を追加してください。"});

  const warnings=[
    ...missingPreconditions.map((item)=>`${item}が不十分なためST判定を確定しません。`),
    ...(qrsSecondary?["QRS異常に伴う二次性ST–T変化の可能性があります。LBBB・心室ペーシングでは医師確認後にSgarbossaモジュールへ引き継ぎます。"]:[]),
    ...(input.preconditions.v1v2HighPlacementConcern?["V1・V2高位装着が疑われます。再記録を優先してください。"]:[]),
    ...(input.clinical.age==null||input.clinical.sex==null?["年齢・性別情報が不足しているためV2–V3の基準適用に制限があります。"]:[]),
    "ST形状単独、単一誘導、reciprocal changeの不在だけで急性冠動脈閉塞を確定・除外しません。",
  ];
  const additionalChecks=dedupe([
    "症状","発症時刻","血圧","意識","SpO₂","前回心電図","連続心電図","トロポニン","K","Ca","Mg","腎機能","薬歴","心エコー","循環器評価",
    ...suggestedAdditionalLeads.map((suggestion)=>suggestion.type==="right-sided"?"右側胸部誘導":"後壁誘導"),
  ]);
  const nextActions=dedupe([
    ...(input.clinical.hemodynamicInstability?["循環動態不安定への対応を最優先"]:[]),
    ...(redFlags.length?["急性冠動脈閉塞を否定できないため直ちに医師が再評価"]:[]),
    ...(dynamic||ischemicSymptoms?["短時間での連続心電図と症状の時間関係を確認"]:[]),
    ...suggestedAdditionalLeads.map((suggestion)=>suggestion.message),
    ...(qrsSecondary?["QRS背景を考慮した専用評価へ引き継ぐ"]:[]),
  ]);
  const possibleFactors=[stFactors.acuteIschemia,stFactors.inflammation,stFactors.secondary,stFactors.metabolic,stFactors.technical];
  const mustNotMiss=redFlags.length?[stFactors.acuteIschemia]:[];
  const urgency=redFlags.length?"emergency":groups.length?"same_day":overallClassification==="indeterminate"?"uncertain":"routine";
  return {leadMeasurements:measurements,contiguousLeadGroups:groups,reciprocalChanges:[{...input.reciprocalFinding,status:reciprocalPresent?"present":input.reciprocalFinding.status}],dynamicChange:input.dynamicChange,priorEcgAvailable:input.priorEcgAvailable,qrsContext:input.qrsContext,overallClassification,leadResults,urgency,redFlags,possibleFactors,mustNotMiss,additionalChecks,nextActions,suggestedAdditionalLeads,warnings,limitations:["このモジュールはST変化を構造化して注意喚起するもので、ACS・STEMI・責任冠動脈を確定しません。","トロポニン結果を待って緊急評価を遅らせてはいけません。","LBBB・ペーシング・肥大・wide QRSに対する専用虚血基準は未実装です。"],sources:stEvidenceSources};
}

function collectMissingPreconditions(preconditions){
  const labels={imageQualityAdequate:"画像品質",paperSpeedKnown:"紙送り速度",gainKnown:"感度",baselineStable:"基線",noiseAcceptable:"ノイズ",leadLabelsKnown:"誘導名"};
  const missing=Object.entries(labels).filter(([key])=>!preconditions[key]).map(([,label])=>label);
  if(preconditions.placementConcern)missing.push("電極装着");
  return missing;
}
function finiteOrNull(value){return typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null}
function dedupe(items){return [...new Set(items)]}
