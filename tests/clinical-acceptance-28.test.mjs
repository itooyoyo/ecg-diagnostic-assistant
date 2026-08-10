import test from "node:test";
import assert from "node:assert/strict";
import {v2ClinicalAcceptanceCases} from "../data/rule-engine/v2-clinical-acceptance-cases.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";

const extraCases=[
 {id:21,name:"digitalis使用＋ST低下",clinical:{digitalisUse:true},ecg:{anyStDepression:true},expected:["digitalis-effect"]},
 {id:22,name:"頻脈＋ST低下",clinical:{heartRate:140},ecg:{anyStDepression:true},expected:["rate-related-st-change"]},
 {id:23,name:"digitalis＋頻脈＋ST低下",clinical:{heartRate:140,digitalisUse:true,ischemicChestPain:true},ecg:{anyStDepression:true,diffuseStDepression:true,avrElevation:true},expected:["digitalis-effect","rate-related-st-change","diffuse-subendocardial-ischemia"]},
 {id:24,name:"Δ波＋PR短縮",clinical:{},ecg:{deltaWave:true,shortPr:true},expected:["preexcitation-pattern"]},
 {id:25,name:"PVC＋R on T＋QT延長",clinical:{},ecg:{pvc:true,rOnT:true,qtProlonged:true},expected:["tdp-risk"],redFlag:true},
 {id:26,name:"V1-V3 high R＋ST低下",clinical:{},ecg:{stDepressionV1toV3:true,tallRV1toV3:true},expected:["posterior-ischemia"],checks:"V7～V9"},
 {id:27,name:"LBBB＋虚血疑い",clinical:{ischemicChestPain:true},ecg:{lbbb:true,contiguousStElevation:true},sgarbossa:{applicable:true,originalPositive:false,modifiedPositive:false,indeterminate:true,context:"lbbb"},expected:["lbbb-paced-occlusion-limited","acute-coronary-occlusion"],redFlag:true},
 {id:28,name:"diffuse ST depression＋aVR elevation",clinical:{ischemicChestPain:true},ecg:{diffuseStDepression:true,avrElevation:true},expected:["diffuse-subendocardial-ischemia"],redFlag:true},
];
const run=c=>{const x=createDefaultIntegratedInput();Object.assign(x.clinical,c.clinical);Object.assign(x.ecg,c.ecg);if(c.sgarbossa)x.sgarbossa=c.sgarbossa;return buildIntegratedInterpretation(x)};

test("clinical acceptance set contains existing 20 plus fixed 8 cases",()=>{assert.equal(v2ClinicalAcceptanceCases.length,20);assert.equal(v2ClinicalAcceptanceCases.length+extraCases.length,28)});
for(const c of extraCases)test(`V2-ACCEPT-${c.id} ${c.name}`,()=>{const r=run(c);const ids=r.diagnosticCandidates.map(x=>x.id);for(const id of c.expected)assert.ok(ids.includes(id),`${id} missing`);if(c.redFlag)assert.ok(r.criticalFindings.length>0);if(c.checks)assert.match(r.diagnosticCandidates.flatMap(x=>x.recommendedChecks.map(y=>y.label)).join(" "),new RegExp(c.checks));assert.ok(!r.diagnosticCandidates.some(x=>/CABG適応確定|左主幹部病変確定|3枝病変確定/.test(x.label)))});
test("28-case extension has no ischemia suppression",()=>{for(const c of extraCases.filter(x=>x.clinical.ischemicChestPain)){const r=run(c);if(c.ecg.contiguousStElevation||c.ecg.diffuseStDepression)assert.ok(r.diagnosticCandidates.some(x=>x.category==="acute_ischemia"))}});
test("digitalis and rate-related candidates never assert absence of ACS",()=>{for(const c of extraCases.slice(0,3)){const text=JSON.stringify(run(c));assert.doesNotMatch(text,/ACSなし|虚血なし|CABG適応確定/)}});

