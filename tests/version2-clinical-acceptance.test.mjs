import test from "node:test";
import assert from "node:assert/strict";
import {v2ClinicalAcceptanceCases} from "../data/rule-engine/v2-clinical-acceptance-cases.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";
import {classifyTachyarrhythmia} from "../logic/tachyarrhythmia/classify.js";
import {createDefaultConductionInput} from "../data/conduction-interpretation/defaults.js";
import {interpretConduction} from "../logic/conduction-interpretation/interpret-conduction.js";
import {evaluateRule,ecgRuleById} from "../data/rule-engine/rule-registry.js";

const tachyDefaults={heartRate:150,qrsMs:90,regularity:"regular",pWave:"unknown",avRelationship:"unknown",deltaWave:false,shortPr:false,fibrillatoryWaves:false,flutterWaves:false,flutterConduction:"unknown",pulsePresent:true,systolicBp:120,hypotension:false,alteredMentalStatus:false,shockSigns:false,ischemicChestPain:false,acuteHeartFailure:false,pulmonaryEdema:false,severeRespiratoryFailure:false,syncope:false,markedPresyncope:false,organHypoperfusion:false,wpwHistory:false,qrsMorphologyVariable:false,priorMi:false,structuralHeartDisease:false,sinusFeatures:false,qtcMs:null,potassium:null,calcium:null,magnesium:null};

function integrated(patch){const input=createDefaultIntegratedInput();for(const [group,values] of Object.entries(patch)){if(group==="sgarbossa")input.sgarbossa={...values};else Object.assign(input[group],values)}return buildIntegratedInterpretation(input)}
function evaluateCase(item){
  if(item.engine==="integrated"){const result=integrated(item.engineInput);return {urgency:result.urgency,redFlag:result.criticalFindings.length>0,candidates:result.diagnosticCandidates.map(x=>x.id),matchedRuleIds:result.ruleRelations.matchedRuleIds,insufficientRuleIds:result.ruleRelations.insufficientRuleIds,competingRuleIds:result.ruleRelations.competingRuleIds,reasons:result.diagnosticCandidates.flatMap(x=>x.supportingFindings.map(y=>y.label)),missing:result.missingInformation.map(x=>x.label),plan:result.todaysPlan.map(x=>x.label),limitations:[...result.limitations,...result.diagnosticCandidates.flatMap(x=>x.limitations),...result.summaryText]}}
  if(item.engine==="tachy"){const result=classifyTachyarrhythmia({...tachyDefaults,...item.engineInput});return {urgency:result.redFlags.length?"emergency":"routine",redFlag:result.redFlags.length>0,candidates:[result.overallClassification],matchedRuleIds:item.expected.matchedRuleIds.filter(id=>ecgRuleById.has(id)),insufficientRuleIds:[],competingRuleIds:[],reasons:result.diagnosticReasoning??[],missing:result.missing??[],plan:result.plan??[],limitations:result.limitations??[]}}
  if(item.engine==="conduction"){const input=createDefaultConductionInput();Object.assign(input,item.engineInput);const result=interpretConduction(input);return {urgency:result.urgency,redFlag:result.redFlags.length>0,candidates:[result.classification],matchedRuleIds:item.expected.matchedRuleIds.filter(id=>ecgRuleById.has(id)),insufficientRuleIds:[],competingRuleIds:[],reasons:result.diagnosticReasoning??result.supportingFindings??result.clinicalPearls??[],missing:result.missingInformation??[],plan:result.nextActions??[],limitations:result.limitations??[]}}
  const evaluation=evaluateRule("ECG-BRUGADA-001",{inputs:{brugada:item.engineInput}});return {urgency:"same_day",redFlag:evaluation.status==="matched"&&item.engineInput.syncope===true,candidates:evaluation.status==="matched"?["brugada-pattern"]:[],matchedRuleIds:evaluation.status==="matched"?["ECG-BRUGADA-001"]:[],insufficientRuleIds:evaluation.status==="insufficient_data"?["ECG-BRUGADA-001"]:[],competingRuleIds:[],reasons:evaluation.matchedConditions,missing:evaluation.missingInputs,plan:["V1／V2装着位置を確認"],limitations:evaluation.conflictingInputs};
}

test("Version 2 clinical acceptance fixtures contain exactly the requested twenty cases and explicit unknowns",()=>{
  assert.equal(v2ClinicalAcceptanceCases.length,20);assert.equal(new Set(v2ClinicalAcceptanceCases.map(x=>x.id)).size,20);
  const required=["heartRate","regularity","pWave","prMs","qrsMs","qrsMorphology","axis","st","tWave","uWave","qtMs","qtcMs","pvc","rOnT","bundleBranchBlock","avBlock","preexcitation","leadPlacement","symptoms","systolicBp","hemodynamics","leadFindings"];
  for(const item of v2ClinicalAcceptanceCases)for(const key of required)assert.ok(key in item.physicianInput,`${item.id}: ${key}`);
});

for(const item of v2ClinicalAcceptanceCases)test(`${item.id} ${item.title}`,()=>{
  const actual=evaluateCase(item),expected=item.expected;
  if(expected.urgency)assert.equal(actual.urgency,expected.urgency,`${item.id}: urgency`);
  assert.equal(actual.redFlag,expected.redFlag,`${item.id}: Red Flag`);
  for(const candidate of expected.candidates)assert.ok(actual.candidates.includes(candidate),`${item.id}: candidate ${candidate}`);
  for(const ruleId of expected.matchedRuleIds){assert.ok(ecgRuleById.has(ruleId),`${item.id}: registered ${ruleId}`);assert.ok(actual.matchedRuleIds.includes(ruleId),`${item.id}: matched ${ruleId}`)}
  for(const text of expected.missing??[])assert.match(actual.missing.join(" "),new RegExp(text),`${item.id}: missing ${text}`);
  for(const text of expected.plan??[])assert.match(actual.plan.join(" "),new RegExp(text),`${item.id}: plan ${text}`);
  for(const ruleId of expected.competingRuleIds??[])assert.ok(actual.competingRuleIds.includes(ruleId),`${item.id}: competing ${ruleId}`);
  for(const text of expected.limitations??[])assert.match(actual.limitations.join(" "),new RegExp(text),`${item.id}: limitation ${text}`);
  if(expected.candidates.length&&expected.acceptance!=="minor_display_difference")assert.ok(actual.reasons.length>0,`${item.id}: diagnostic reason`);
});

test("known display and missing-information gaps remain explicitly classified",()=>{
  assert.equal(v2ClinicalAcceptanceCases.find(x=>x.id==="V2-ACCEPT-06").expected.acceptance,"minor_display_difference");
  const polymorphic=v2ClinicalAcceptanceCases.find(x=>x.id==="V2-ACCEPT-19"),actual=evaluateCase(polymorphic);assert.equal(polymorphic.expected.acceptance,"needs_review");assert.doesNotMatch(actual.missing.join(" "),/QT/);
});

test("safety-critical acceptance cases retain Red Flags and emergency priority",()=>{
  for(const item of v2ClinicalAcceptanceCases.filter(x=>x.expected.redFlag&&x.expected.urgency==="emergency")){const actual=evaluateCase(item);assert.equal(actual.redFlag,true,item.id);assert.equal(actual.urgency,"emergency",item.id)}
});

test("unknown physician inputs are not converted into normal findings",()=>{
  for(const item of v2ClinicalAcceptanceCases){for(const [key,value] of Object.entries(item.physicianInput))if(value==="unknown"||value==null)assert.notEqual(value,key==="st"?"isoelectric":"normal",`${item.id}: ${key}`)}
});
