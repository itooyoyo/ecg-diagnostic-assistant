import {integrationSources as S} from "../../data/integration/sources.js";
import {evaluateQtElectrolyteShadow} from "../shadow/evaluate-qt-electrolyte.js";

const ids={long_qt:"long-qt",short_qt:"short-qt",torsades_risk:"tdp-risk",hyperkalemia_pattern:"hyperkalemia-pattern",severe_hyperkalemia:"hyperkalemia-pattern",hypokalemia_hypomagnesemia_pattern:"low-k-mg-pattern",hypercalcemia_pattern:"hypercalcemia-pattern",hypocalcemia_pattern:"hypocalcemia-pattern"};
const labels={long_qt:"QT延長候補",short_qt:"QT短縮候補",torsades_risk:"TdPリスクが高い可能性",hyperkalemia_pattern:"高Kパターンだが採血確認が必要",severe_hyperkalemia:"重症高K血症を否定できません",hypokalemia_hypomagnesemia_pattern:"低K／低Mgに伴う心室性不整脈リスク",hypercalcemia_pattern:"高Caを疑う心電図パターン",hypocalcemia_pattern:"低Caを疑う心電図パターン"};
const urgencyRank={uncertain:0,routine:1,same_day:2,emergency:3,resuscitation:4};
const strength=value=>value==="high_specificity"?"major":value==="weak_contradiction"?"weak":"supportive";
const evidence=item=>({sourceModule:"canonical-qt-electrolyte",findingId:item.field,label:item.label,clinicianConfirmed:true,strength:strength(item.strength)});
const missing=(label,index)=>({id:`canonical-qt-electrolyte-${index}-${label}`,label,sourceModule:"canonical-qt-electrolyte"});
const uniqueBy=(items,key)=>[...new Map(items.map(item=>[key(item),item])).values()];
const maximumUrgency=(a,b)=>urgencyRank[a]>=urgencyRank[b]?a:b;
function candidate(item){const emergency=item.dangerTier===2&&(item.candidateId==="torsades_risk"||item.candidateId==="severe_hyperkalemia");return {id:ids[item.candidateId],ruleIds:[],label:labels[item.candidateId],category:item.candidateId.includes("qt")||item.candidateId==="torsades_risk"?"repolarization":"electrolyte_pattern",confidence:item.supporting.length>=3?"high":item.supporting.length>=2?"moderate":"low",urgency:emergency?"emergency":"same_day",supportingFindings:item.supporting.map(evidence),contradictingFindings:item.contradicting.map(evidence),missingInformation:item.missing.map(missing),alternativeExplanations:[],mustNotMiss:emergency,physicianReviewRequired:true,recommendedChecks:[],recommendedActions:[],limitations:["Canonical QT／電解質候補です。診断確定・治療量決定は行いません。"],sources:[S.ecg]};}
function merge(legacy,canonical){return {...legacy,urgency:maximumUrgency(legacy.urgency,canonical.urgency),mustNotMiss:legacy.mustNotMiss||canonical.mustNotMiss,supportingFindings:uniqueBy([...legacy.supportingFindings,...canonical.supportingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),contradictingFindings:uniqueBy([...legacy.contradictingFindings,...canonical.contradictingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),missingInformation:uniqueBy([...legacy.missingInformation,...canonical.missingInformation],x=>x.id),limitations:[...new Set([...legacy.limitations,...canonical.limitations])]};}
function deduplicate(items){const seen=new Set();return items.filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true})}

export function migrateCanonicalQtElectrolyte({enabled,legacyResult,shadowInput}){
 if(!enabled)return {result:legacyResult,evaluation:null,migratedCandidateIds:[]};
 const evaluation=evaluateQtElectrolyteShadow(shadowInput),eligible=evaluation.candidates.filter(item=>ids[item.candidateId]&&item.status==="supported");
 const byId=new Map(legacyResult.diagnosticCandidates.map(item=>[item.id,item])),migratedCandidateIds=[];
 for(const item of eligible){const canonical=candidate(item),legacy=byId.get(canonical.id);byId.set(canonical.id,legacy?merge(legacy,canonical):canonical);migratedCandidateIds.push(canonical.id)}
 const diagnosticCandidates=deduplicate([...byId.values()]);
 const emergencyIds=new Set(eligible.filter(item=>item.dangerTier===2&&(item.candidateId==="torsades_risk"||item.candidateId==="severe_hyperkalemia")).map(item=>ids[item.candidateId]));
 const criticalFindings=deduplicate([...legacyResult.criticalFindings,...diagnosticCandidates.filter(item=>emergencyIds.has(item.id)&&item.mustNotMiss)]);
 const urgency=criticalFindings.some(item=>emergencyIds.has(item.id))?maximumUrgency(legacyResult.urgency,"emergency"):legacyResult.urgency;
 return {evaluation,migratedCandidateIds:[...new Set(migratedCandidateIds)],result:{...legacyResult,diagnosticCandidates,criticalFindings,urgency,limitations:[...new Set([...legacyResult.limitations,...evaluation.limitations])],revision:{...legacyResult.revision,engineUrgency:maximumUrgency(legacyResult.revision.engineUrgency,urgency),finalUrgency:maximumUrgency(legacyResult.revision.finalUrgency,urgency)}}};
}
