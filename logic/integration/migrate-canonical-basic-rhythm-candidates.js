import {integrationSources as S} from "../../data/integration/sources.js";
import {evaluateRateRhythmShadow} from "../shadow/evaluate-rate-rhythm.js";

const migratedIds={
  atrial_fibrillation:"atrial-fibrillation-pattern",
  atrial_flutter:"atrial-flutter-pattern",
  supraventricular_tachycardia:"supraventricular-tachycardia-pattern",
  multifocal_atrial_tachycardia:"multifocal-atrial-tachycardia-pattern",
  junctional_rhythm:"junctional-rhythm-pattern",
};
const labels={
  atrial_fibrillation:"心房細動候補",
  atrial_flutter:"心房粗動候補",
  supraventricular_tachycardia:"上室性頻拍候補",
  multifocal_atrial_tachycardia:"多源性心房頻拍候補",
  junctional_rhythm:"接合部調律候補",
};
const urgency={atrial_fibrillation:"same_day",atrial_flutter:"same_day",supraventricular_tachycardia:"same_day",multifocal_atrial_tachycardia:"same_day",junctional_rhythm:"routine"};
const strength=value=>value==="high_specificity"?"major":value==="weak_contradiction"?"weak":"supportive";
const evidence=item=>({sourceModule:"canonical-basic-rhythm",findingId:item.field,label:item.label,clinicianConfirmed:true,strength:strength(item.strength)});
const missing=(label,index)=>({id:`canonical-basic-rhythm-${index}-${label}`,label,sourceModule:"canonical-basic-rhythm"});
const uniqueBy=(items,key)=>[...new Map(items.map(item=>[key(item),item])).values()];

function canonicalCandidate(item){
  return {id:migratedIds[item.candidateId],ruleIds:[],label:labels[item.candidateId],category:"arrhythmia",confidence:item.supporting.length>=3?"high":item.supporting.length>=2?"moderate":"low",urgency:urgency[item.candidateId],supportingFindings:item.supporting.map(evidence),contradictingFindings:item.contradicting.map(evidence),missingInformation:item.missing.map(missing),alternativeExplanations:[],mustNotMiss:false,physicianReviewRequired:true,recommendedChecks:[],recommendedActions:[],limitations:["Canonical basic rhythm候補です。既存59 Rule由来の診断Ruleを追加・変更しません。"],sources:[S.arrhythmia]};
}
function mergeCandidate(legacy,canonical){
  return {...legacy,supportingFindings:uniqueBy([...legacy.supportingFindings,...canonical.supportingFindings],item=>`${item.sourceModule}:${item.findingId}:${item.label}`),contradictingFindings:uniqueBy([...legacy.contradictingFindings,...canonical.contradictingFindings],item=>`${item.sourceModule}:${item.findingId}:${item.label}`),missingInformation:uniqueBy([...legacy.missingInformation,...canonical.missingInformation],item=>item.id),limitations:[...new Set([...legacy.limitations,...canonical.limitations])]};
}

export function migrateCanonicalBasicRhythmCandidates({enabled,legacyResult,shadowInput}){
  if(!enabled)return {result:legacyResult,evaluation:null,migratedCandidateIds:[]};
  const evaluation=evaluateRateRhythmShadow(shadowInput);
  const supported=evaluation.candidates.filter(item=>item.status==="supported"&&migratedIds[item.candidateId]);
  const byId=new Map(legacyResult.diagnosticCandidates.map(item=>[item.id,item]));
  const migratedCandidateIds=[];
  for(const item of supported){const canonical=canonicalCandidate(item),legacy=byId.get(canonical.id);byId.set(canonical.id,legacy?mergeCandidate(legacy,canonical):canonical);migratedCandidateIds.push(canonical.id)}
  const diagnosticCandidates=[...byId.values()];
  return {evaluation,migratedCandidateIds:[...new Set(migratedCandidateIds)],result:{...legacyResult,diagnosticCandidates}};
}
