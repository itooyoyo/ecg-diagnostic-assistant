import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyTachyarrhythmia} from "../logic/tachyarrhythmia/classify.js";
import {adaptTachyResultToIntegratedEcg} from "../logic/integration/adapt-tachy-result.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const ui=readFileSync(new URL("../components/ecg/AdvancedWideTachycardiaReview.tsx",import.meta.url),"utf8");
const workspace=readFileSync(new URL("../components/ecg/TachyarrhythmiaModule.tsx",import.meta.url),"utf8");
const base={heartRate:180,qrsMs:160,regularity:"regular",pWave:"unknown",pulsePresent:true,systolicBp:120,hypotension:false,alteredMentalStatus:false,shockSigns:false,ischemicChestPain:false,acuteHeartFailure:false,pulmonaryEdema:false,severeRespiratoryFailure:false,syncope:false,markedPresyncope:false,organHypoperfusion:false,wpwHistory:false,qrsMorphologyVariable:false,priorMi:false,structuralHeartDisease:false,sinusFeatures:false,avRelationship:"unknown",deltaWave:false,shortPr:false,fibrillatoryWaves:false,flutterWaves:false,flutterConduction:"unknown",qtcMs:null,potassium:null,calcium:null,magnesium:null};
function integrated(patch={}){const tachy=classifyTachyarrhythmia({...base,...patch}),input=createDefaultIntegratedInput();Object.assign(input.ecg,adaptTachyResultToIntegratedEcg(tachy));return {tachy,result:buildIntegratedInterpretation(input)}}

test("regular monomorphic Wide exposes the Advanced WCT route",()=>{assert.match(workspace,/result\.qrsClass==="wide"/);assert.match(ui,/Wide QRS頻拍：VT \/ SVT鑑別/);assert.match(ui,/polymorphicWide===false/)});
test("irregular Wide hides Brugada audit inputs and names the existing route",()=>{assert.match(ui,/regularity==="irregular"/);assert.match(ui,/AF＋BBB、pre-excited AF、多形性VT／TdP/)});
test("polymorphic Wide hides Brugada audit inputs and retains QT TdP route",()=>{assert.match(ui,/polymorphicWide===true/);assert.match(ui,/QT\/QTc、R on T、pause、TdP／多形性VT/)});
test("pre-excitation bypasses Brugada and prioritizes the existing WPW route",()=>{const {result}=integrated({regularity:"irregular",preExcitation:true,qrsMorphologyVariable:true});assert.ok(result.ruleRelations.matchedRuleIds.includes("ECG-WPW-002"));assert.match(ui,/Pre-excitation経路を優先/)});
test("AV dissociation reaches the existing VT supporting reason",()=>assert.ok(integrated({avDissociation:true}).result.diagnosticCandidates.find(x=>x.id==="wide-qrs-tachycardia").supportingFindings.some(x=>x.findingId==="av-dissociation")));
test("capture beat reaches the existing VT supporting reason",()=>assert.ok(integrated({avDissociation:true,captureBeats:true}).result.diagnosticCandidates.find(x=>x.id==="wide-qrs-tachycardia").supportingFindings.some(x=>x.findingId==="capture")));
test("fusion beat reaches the existing VT supporting reason",()=>assert.ok(integrated({avDissociation:true,fusionBeats:true}).result.diagnosticCandidates.find(x=>x.id==="wide-qrs-tachycardia").supportingFindings.some(x=>x.findingId==="fusion")));
test("existing RBBB retains the SVT plus BBB differential",()=>assert.ok(integrated({existingBundleBranchBlock:true}).result.diagnosticCandidates.find(x=>x.id==="wide-qrs-tachycardia").alternativeExplanations.includes("SVT＋既存脚ブロック")));
test("RS absence is audit state only and cannot enter the rule engine",()=>{assert.match(ui,/rsAbsentV1V6/);assert.doesNotMatch(workspace,/rsAbsentV1V6.*input:TachyInput/);assert.doesNotMatch(readFileSync(new URL("../logic/tachyarrhythmia/classify.js",import.meta.url),"utf8"),/rsAbsentV1V6/)});
test("RS interval 120 ms remains audit state and does not change tachy output",()=>{assert.match(ui,/maxRsIntervalMs/);assert.deepEqual(integrated().tachy,integrated({maxRsIntervalMs:120}).tachy)});
test("unknown and indeterminate findings are not converted to false",()=>{assert.match(workspace,/typeof value==="boolean"\?value:null/);const x=classifyTachyarrhythmia({...base,avDissociation:null,captureBeats:null,fusionBeats:null,polymorphicWide:null,existingBundleBranchBlock:null,preExcitation:null});for(const key of ["avDissociation","captureBeat","fusionBeat","polymorphicWide","existingBundleBranchBlock","preExcitation"])assert.equal(x.findings[key],null)});
test("advanced audit includes morphology and concordance but no aVR or Vi Vt",()=>{for(const text of ["bbbLikeMorphology","Precordial concordance","RBBB-like","LBBB-like"])assert.match(ui,new RegExp(text));assert.doesNotMatch(ui,/initial R in aVR|Vi\/Vt|descending limb notch/)});
test("unstable Wide remains emergency before Advanced review is completed",()=>assert.equal(integrated({hypotension:true,systolicBp:70}).result.urgency,"emergency"));
test("the approved medical registry remains 59 rules",()=>assert.equal(ecgRuleRegistry.length,59));
