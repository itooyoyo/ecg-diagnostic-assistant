import {integrationSources as S} from "../../data/integration/sources.js";
import {evaluateStructuralShadow} from "../shadow/evaluate-structural.js";

const migrated={lvh:"lvh-pattern",lv_strain:"lv-strain-pattern",rvh:"rvh-pattern",rv_strain:"rbbb-right-strain",acute_right_heart_strain:"acute-right-heart-strain",paced_rhythm:"paced-rhythm",structural_abnormality_pattern:"structural-strain-output"};
const labels={lvh:"左室肥大候補",lv_strain:"左室肥大に伴うstrain pattern候補",rvh:"右室肥大候補",rv_strain:"右室strain pattern候補",acute_right_heart_strain:"急性右心負荷候補",paced_rhythm:"ペーシング調律候補",structural_abnormality_pattern:"構造的心疾患に伴う心電図変化候補"};
const urgency={lvh:"routine",lv_strain:"same_day",rvh:"routine",rv_strain:"same_day",acute_right_heart_strain:"same_day",paced_rhythm:"routine",structural_abnormality_pattern:"routine"};
const strength=value=>value==="high_specificity"?"major":value==="weak_contradiction"?"weak":"supportive";
const evidence=item=>({sourceModule:"canonical-structural",findingId:item.field,label:item.label,clinicianConfirmed:true,strength:strength(item.strength)});
const missing=(label,index)=>({id:`canonical-structural-${index}-${label}`,label,sourceModule:"canonical-structural"});
const uniqueBy=(items,key)=>[...new Map(items.map(item=>[key(item),item])).values()];
function canonicalCandidate(item){return {id:migrated[item.candidateId],ruleIds:[],label:labels[item.candidateId],category:"structural",confidence:item.status==="supported"?(item.supporting.length>=3?"high":"moderate"):"low",urgency:urgency[item.candidateId],supportingFindings:item.supporting.map(evidence),contradictingFindings:item.contradicting.map(evidence),missingInformation:item.missing.map(missing),alternativeExplanations:[],mustNotMiss:false,physicianReviewRequired:true,recommendedChecks:[],recommendedActions:[],limitations:["Canonical structural候補です。虚血・Sgarbossa・Emergency判定はlegacyを維持します。"],sources:[S.ecg]};}
function merge(legacy,canonical){return {...legacy,supportingFindings:uniqueBy([...legacy.supportingFindings,...canonical.supportingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),contradictingFindings:uniqueBy([...legacy.contradictingFindings,...canonical.contradictingFindings],x=>`${x.sourceModule}:${x.findingId}:${x.label}`),missingInformation:uniqueBy([...legacy.missingInformation,...canonical.missingInformation],x=>x.id),limitations:[...new Set([...legacy.limitations,...canonical.limitations])]};}
function deduplicate(items){const ids=new Set(),labelsSeen=new Set();return items.filter(item=>{if(ids.has(item.id)||labelsSeen.has(item.label))return false;ids.add(item.id);labelsSeen.add(item.label);return true})}

export function migrateCanonicalStructural({enabled,legacyResult,shadowInput}){
 if(!enabled)return {result:legacyResult,evaluation:null,axisState:null,migratedCandidateIds:[]};
 const evaluation=evaluateStructuralShadow(shadowInput),eligible=evaluation.candidates.filter(item=>migrated[item.candidateId]&&(item.status==="supported"||item.candidateId==="structural_abnormality_pattern"&&item.status==="possible"));
 const byId=new Map(legacyResult.diagnosticCandidates.map(item=>[item.id,item])),migratedCandidateIds=[];
 for(const item of eligible){const canonical=canonicalCandidate(item),legacy=byId.get(canonical.id);byId.set(canonical.id,legacy?merge(legacy,canonical):canonical);migratedCandidateIds.push(canonical.id)}
 const diagnosticCandidates=deduplicate([...byId.values()]);
 return {evaluation,axisState:shadowInput.axis,migratedCandidateIds:[...new Set(migratedCandidateIds)],result:{...legacyResult,diagnosticCandidates,limitations:[...new Set([...legacyResult.limitations,...evaluation.limitations])]}};
}
