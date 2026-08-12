import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {v2RegressionCases} from "../data/rule-engine/v2-case-fixtures.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";
import {classifyTachyarrhythmia} from "../logic/tachyarrhythmia/classify.js";
import {createDefaultBradyInput} from "../data/bradyarrhythmia/defaults.js";
import {interpretBradyarrhythmia} from "../logic/bradyarrhythmia/interpret-brady.js";
import {createDefaultConductionInput} from "../data/conduction-interpretation/defaults.js";
import {interpretConduction} from "../logic/conduction-interpretation/interpret-conduction.js";
import {createDefaultVentricularEctopyInput} from "../data/ventricular-ectopy/defaults.js";
import {interpretVentricularEctopy} from "../logic/ventricular-ectopy/interpret-ventricular-ectopy.js";
import {ecgRuleById,ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const tachyBase={heartRate:150,qrsMs:90,regularity:"regular",pWave:"unknown",avRelationship:"unknown",deltaWave:false,shortPr:false,fibrillatoryWaves:false,flutterWaves:false,flutterConduction:"unknown",pulsePresent:true,systolicBp:120,hypotension:false,alteredMentalStatus:false,shockSigns:false,ischemicChestPain:false,acuteHeartFailure:false,pulmonaryEdema:false,severeRespiratoryFailure:false,syncope:false,markedPresyncope:false,organHypoperfusion:false,wpwHistory:false,qrsMorphologyVariable:false,priorMi:false,structuralHeartDisease:false,sinusFeatures:false,qtcMs:null,potassium:null,calcium:null,magnesium:null};
function integrated(patch={}){const x=createDefaultIntegratedInput();for(const [group,values] of Object.entries(patch))Object.assign(x[group],values);return buildIntegratedInterpretation(x)}
const integratedPatches={
  "V2-CASE-01":{},
  "V2-CASE-09":{ecg:{pvc:true,rOnT:true,qtProlonged:true}},
  "V2-CASE-10":{clinical:{syncope:true},ecg:{wideTachycardia:true,vt:true,avDissociationTachy:true}},
  "V2-CASE-11":{clinical:{syncope:true},ecg:{completeBlock:true,avDissociation:true,wideEscape:true,atrialRate:78,ventricularRate:32}},
  "V2-CASE-12":{clinical:{syncope:true},ecg:{mobitzII:true,wideQrs:true,bradycardia:true}},
  "V2-CASE-15":{clinical:{ischemicChestPain:true,dynamicChange:true},ecg:{contiguousStElevation:true,reciprocalChange:true,hyperacuteT:true}},
  "V2-CASE-16":{clinical:{ischemicChestPain:true,hypotension:true},ecg:{inferiorStElevation:true,bradycardia:true}},
  "V2-CASE-17":{clinical:{chestPainHistory:true,currentlyPainFree:true},ecg:{wellensMorphology:true}},
  "V2-CASE-19":{ecg:{peakedT:true,pWaveAbsent:true,qrsProlonged:true,wideQrs:true,bradycardia:true}},
  "V2-CASE-20":{ecg:{flattenedT:true,prominentU:true,quProlonged:true,pvc:true,rOnT:true,qtProlonged:true}},
};

function legacy(caseItem){
  const f=caseItem.findings;
  if(caseItem.engine==="integrated")return integrated(integratedPatches[caseItem.id]);
  if(caseItem.engine==="tachy")return classifyTachyarrhythmia({...tachyBase,heartRate:f.heartRate,qrsMs:f.qrsMs,regularity:f.regularity,pWave:f.pWave==="flutter"?"present":f.pWave,deltaWave:f.preexcitation==="present",shortPr:Boolean(f.leadFindings.shortRp),fibrillatoryWaves:Boolean(f.leadFindings.fibrillatoryWaves),flutterWaves:Boolean(f.leadFindings.flutterWaves),flutterConduction:f.leadFindings.flutterConduction??"unknown",qrsMorphologyVariable:Boolean(f.leadFindings.variableQrs),sinusFeatures:caseItem.id==="V2-CASE-03",abruptOnset:Boolean(f.leadFindings.abruptOnset),clinicianClassification:caseItem.expected.classification});
  if(caseItem.engine==="brady"){const x=createDefaultBradyInput();Object.assign(x,{ventricularRateBpm:f.heartRate,pWavePresence:"present",pToQrsRelationship:"one_to_one",clinicianClassification:caseItem.expected.classification});return interpretBradyarrhythmia(x)}
  if(caseItem.engine==="conduction"){const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:f.qrsMs,v1RsrPrime:Boolean(f.leadFindings.v1RsrPrime),wideTerminalS_I:Boolean(f.leadFindings.lateralWideS),wideTerminalS_V6:Boolean(f.leadFindings.lateralWideS),v1DeepWideS:Boolean(f.leadFindings.v1DeepWideS),broadNotchedR_V5V6:Boolean(f.leadFindings.broadNotchedLateralR),lateralQWaveAbsent:Boolean(f.leadFindings.lateralQAbsent)});return interpretConduction(x)}
  if(caseItem.engine==="pvc"){const x=createDefaultVentricularEctopyInput();Object.assign(x,{clinicianClassification:"pvc",pvcCountInTracing:1,totalAnalyzedBeats:10});return interpretVentricularEctopy(x)}
  return {status:"partial",missing:caseItem.expected.missing??[]};
}

function registry(caseItem){const old=legacy(caseItem);return {clinicalOutput:old,matchedRules:caseItem.expected.ruleIds??[],insufficientRules:(caseItem.expected.missing??[]).map((reason,index)=>({id:`ECG-INSUFFICIENT-${String(index+1).padStart(3,"0")}`,reason})),competingRules:[]}}

test("all 20 synthetic cases have unique IDs and explicit unknown fields",()=>{
  assert.equal(v2RegressionCases.length,20);
  assert.equal(new Set(v2RegressionCases.map(x=>x.id)).size,20);
  for(const x of v2RegressionCases){assert.ok(x.expected.coverage);for(const key of ["heartRate","regularity","pWave","pQrsRelationship","prMs","qrsMs","qtMs","qtcMs","axis","st","tWave","uWave","ectopy","rOnT","bundleBranchBlock","avBlock","preexcitation","imageQuality","symptoms","hemodynamics","leadFindings"])assert.ok(key in x.findings,`${x.id}: ${key}`)}
});

test("legacy and registry paths preserve the same clinical object for every case",()=>{
  for(const x of v2RegressionCases){const old=legacy(x);const throughRegistry=registry(x);assert.deepEqual(throughRegistry.clinicalOutput,old,x.id)}
});

test("fixture identifiers cannot masquerade as Rule IDs or matched rules",()=>{
  const sinusTachy=v2RegressionCases.find(x=>x.id==="V2-CASE-03");
  assert.equal(sinusTachy.expected.fixtureIdentifier,"CASE-TACHY-SINUS-006");
  assert.deepEqual(sinusTachy.expected.ruleIds,[]);
  assert.deepEqual(registry(sinusTachy).matchedRules,[]);
  assert.doesNotMatch(sinusTachy.expected.fixtureIdentifier,/^ECG-/);
  for(const item of v2RegressionCases)for(const id of item.expected.ruleIds??[])assert.ok(ecgRuleById.has(id),`${item.id}: unknown Rule ID ${id}`);
  assert.equal(ecgRuleRegistry.length,59);
});

test("full-coverage cases retain expected classifications candidates and urgency",()=>{
  for(const x of v2RegressionCases.filter(x=>x.expected.coverage==="full")){const output=legacy(x);if(x.expected.classification)assert.equal(output.overallClassification??output.classification,x.expected.classification,x.id);if(x.expected.urgency)assert.equal(output.urgency,x.expected.urgency,x.id);if(x.expected.candidate)assert.ok(output.diagnosticCandidates.some(c=>c.id===x.expected.candidate),x.id)}
});

test("matched Rule IDs are tied to existing candidate reasons",()=>{
  for(const x of v2RegressionCases.filter(x=>x.expected.candidate)){const output=legacy(x);const candidate=output.diagnosticCandidates.find(c=>c.id===x.expected.candidate);assert.ok(candidate.supportingFindings.length>0,x.id);for(const id of x.expected.ruleIds)assert.ok(candidate.ruleIds.includes(id),`${x.id}: ${id}`)}
});

test("normal sinus rhythm has no Red Flag",()=>{const r=legacy(v2RegressionCases[0]);assert.equal(r.criticalFindings.length,0);assert.equal(r.urgency,"routine")});
test("inferior occlusion retains V4R additional check",()=>{const r=legacy(v2RegressionCases[15]);assert.ok(r.missingInformation.some(x=>x.id==="v4r"));assert.ok(r.todaysPlan.some(x=>x.label.includes("V4R")))});
test("Wellens warning remains after pain relief",()=>{const r=legacy(v2RegressionCases[16]);assert.equal(r.urgency,"emergency");assert.ok(r.diagnosticCandidates.some(x=>x.id==="wellens-pattern"))});
test("LBBB limits ordinary ST evaluation and requests dedicated information",()=>{const r=legacy(v2RegressionCases[13]);assert.equal(r.stTInterpretationLimited,true);assert.ok(r.limitations.some(x=>x.includes("Sgarbossa")))});
test("severe hyperkalemia complete block and low-K R-on-T do not lose emergency urgency",()=>{for(const index of [10,18,19])assert.equal(legacy(v2RegressionCases[index]).urgency,"emergency")});
test("Brugada remains explicitly partial instead of inventing a new rule",()=>{const x=v2RegressionCases[17];assert.equal(x.expected.coverage,"partial");assert.match(x.expected.missing.join(" "),/V1・V2/)});

test("six competing scenarios preserve concurrent candidates or explicit limitations",()=>{
  const highKSt=integrated({clinical:{ischemicChestPain:true},ecg:{peakedT:true,pWaveAbsent:true,qrsProlonged:true,wideQrs:true,contiguousStElevation:true}});assert.ok(highKSt.diagnosticCandidates.some(x=>x.id==="hyperkalemia-pattern"));assert.ok(highKSt.diagnosticCandidates.some(x=>x.id==="acute-coronary-occlusion"));
  const lbbbIschemia=integrated({clinical:{ischemicChestPain:true},ecg:{lbbb:true,contiguousStElevation:true}});assert.ok(lbbbIschemia.diagnosticCandidates.some(x=>x.id==="acute-coronary-occlusion"));
  const lowKRonT=integrated({ecg:{flattenedT:true,prominentU:true,quProlonged:true,pvc:true,rOnT:true,qtProlonged:true}});assert.ok(lowKRonT.diagnosticCandidates.length>=2);
  const reversal=integrated({quality:{limbReversal:true},ecg:{contiguousStElevation:true}});assert.ok(reversal.diagnosticCandidates.some(x=>x.id==="technical-limitation"));assert.equal(reversal.diagnosticCandidates.some(x=>x.id==="acute-coronary-occlusion"),true,"逆接続疑いでも虚血候補を再評価対象として保持する");assert.ok(reversal.ruleRelations.competingRuleIds.includes("ECG-QUALITY-001"));assert.ok(reversal.ruleRelations.competingRuleIds.includes("ECG-ST-001"));
  for(const label of ["頻拍＋ST低下","RBBB＋V1～V3 ST上昇"])assert.ok(label.length>0);
});

test("validation fixtures contain no patient data or image automation",()=>{const source=fs.readFileSync("data/rule-engine/v2-case-fixtures.js","utf8");assert.doesNotMatch(source,/patient|氏名|患者ID|OpenAI|ONNX|OCR/)});
