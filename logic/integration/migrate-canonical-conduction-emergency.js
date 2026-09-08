import {integrationSources as S} from "../../data/integration/sources.js";
import {evaluateConductionShadow} from "../shadow/evaluate-conduction.js";

const emergencyIds=new Set(["mobitz_ii","high_grade_av_block","complete_av_block"]);
const labels={mobitz_ii:"Mobitz IIを否定できない",high_grade_av_block:"高度房室ブロックを疑う",complete_av_block:"完全房室ブロックを疑う"};
const urgencyRank={uncertain:0,routine:1,same_day:2,emergency:3,resuscitation:4};
const strength=value=>value==="high_specificity"?"major":value==="weak_contradiction"?"weak":"supportive";
const evidence=item=>({sourceModule:"canonical-conduction",findingId:item.field,label:item.label,clinicianConfirmed:true,strength:strength(item.strength)});
const missing=(label,index)=>({id:`canonical-conduction-emergency-${index}-${label}`,label,sourceModule:"canonical-conduction"});
const uniqueBy=(items,key)=>[...new Map(items.map(item=>[key(item),item])).values()];

function canonicalEmergency(item){return {id:"advanced-av-block",ruleIds:[],label:labels[item.candidateId],category:"conduction",confidence:item.supporting.length>=3?"high":item.supporting.length>=2?"moderate":"low",urgency:"emergency",supportingFindings:item.supporting.map(evidence),contradictingFindings:item.contradicting.map(evidence),missingInformation:item.missing.map(missing),alternativeExplanations:[],mustNotMiss:true,physicianReviewRequired:true,recommendedChecks:[],recommendedActions:[],limitations:["Canonical dangerTier 2の伝導障害所見をEmergency／Red Flagへ統合しています。診断確定や新規Rule生成は行いません。"],sources:[S.arrhythmia]};}
function mergeCandidate(legacy,canonical){return {...legacy,urgency:urgencyRank[legacy.urgency]>=urgencyRank.emergency?legacy.urgency:"emergency",mustNotMiss:true,supportingFindings:uniqueBy([...legacy.supportingFindings,...canonical.supportingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),contradictingFindings:uniqueBy([...legacy.contradictingFindings,...canonical.contradictingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),missingInformation:uniqueBy([...legacy.missingInformation,...canonical.missingInformation],x=>x.id),limitations:[...new Set([...legacy.limitations,...canonical.limitations])]};}
function deduplicate(items){const ids=new Set(),labelsSeen=new Set();return items.filter(item=>{if(ids.has(item.id)||labelsSeen.has(item.label))return false;ids.add(item.id);labelsSeen.add(item.label);return true})}

export function migrateCanonicalConductionEmergency({enabled,legacyResult,shadowInput}){
 if(!enabled)return {result:legacyResult,evaluation:null,migratedEmergencyIds:[]};
 const evaluation=evaluateConductionShadow(shadowInput);
 const supported=evaluation.candidates.filter(item=>emergencyIds.has(item.candidateId)&&item.dangerTier===2&&item.status==="supported");
 if(!supported.length)return {result:legacyResult,evaluation,migratedEmergencyIds:[]};
 const priority={mobitz_ii:1,high_grade_av_block:2,complete_av_block:3};
 const selected=[...supported].sort((a,b)=>priority[b.candidateId]-priority[a.candidateId])[0];
 const canonical=canonicalEmergency(selected);
 const existing=legacyResult.diagnosticCandidates.find(item=>item.id===canonical.id);
 const emergencyCandidate=existing?mergeCandidate(existing,canonical):canonical;
 const diagnosticCandidates=legacyResult.diagnosticCandidates.map(item=>item.id===canonical.id?emergencyCandidate:item);
 if(!existing)diagnosticCandidates.push(emergencyCandidate);
 const criticalFindings=deduplicate([...legacyResult.criticalFindings.filter(item=>item.id!==canonical.id),emergencyCandidate]);
 const urgency=urgencyRank[legacyResult.urgency]>=urgencyRank.emergency?legacyResult.urgency:"emergency";
 return {evaluation,migratedEmergencyIds:supported.map(item=>item.candidateId),result:{...legacyResult,diagnosticCandidates,criticalFindings,urgency,revision:{...legacyResult.revision,engineUrgency:urgency,finalUrgency:urgency}}};
}
