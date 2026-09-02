import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {adaptClinicalReviewToCanonical,compareCanonicalShadow,LEGACY_DEFAULT_RISKS} from "../logic/integration/adapt-clinical-review.js";
import {createNotAssessedStLeads,deriveContiguousPattern,deriveReciprocalPattern,deriveStTerritories} from "../logic/derived-state/derive-st-distribution.js";
import {presentObservation,unknownObservation} from "../types/clinical-observation-runtime.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";

const canonical=patch=>adaptClinicalReviewToCanonical(patch);
const allSt=(changes={})=>Object.entries({...Object.fromEntries(["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"].map(lead=>[lead,"isoelectric"])),...changes}).map(([lead,direction])=>({lead,direction,clinicianConfirmed:true}));
const value=observation=>observation.status==="present"?observation.value:observation.status;
const integrated=patch=>{const input=createDefaultIntegratedInput();for(const [group,values] of Object.entries(patch))Object.assign(input[group],values);return buildIntegratedInterpretation(input)};

test("S1 HR unentered remains not_assessed",()=>{const x=canonical({});assert.equal(x.measurements.heartRateBpm.status,"not_assessed");assert.equal(x.derived.rateClass.status,"not_assessed")});
test("S2 HR 45 derives bradycardia",()=>{const x=canonical({heartRateBpm:45,heartRateAssessment:"present"});assert.equal(value(x.measurements.heartRateBpm),45);assert.equal(value(x.derived.rateClass),"bradycardia")});
test("S3 HR 120 derives tachycardia",()=>assert.equal(value(canonical({heartRateBpm:120,heartRateAssessment:"present"}).derived.rateClass),"tachycardia"));
test("S4 QRS unentered remains not_assessed",()=>{const x=canonical({});assert.equal(x.measurements.qrsMs.status,"not_assessed");assert.equal(x.derived.qrsClass.status,"not_assessed")});
test("S5 categorical wide does not create pseudo QRS milliseconds",()=>{const x=canonical({qrsCategory:"wide",qrsAssessment:"present"});assert.equal(value(x.categorical.qrsWidth),"wide");assert.equal(x.measurements.qrsMs.status,"not_assessed");assert.equal(x.derived.qrsClass.status,"not_assessed")});
test("S6 PR unentered is not normal",()=>{const x=canonical({});assert.equal(x.measurements.prMs.status,"not_assessed");assert.equal(x.derived.prClass.status,"not_assessed")});
test("S7 QTc unentered is not normal",()=>{const x=canonical({});assert.equal(x.measurements.qtcMs.status,"not_assessed");assert.equal(x.derived.qtcClass.status,"not_assessed")});
test("numeric PR QRS and QTc use existing boundaries without overwriting measurements",()=>{const x=canonical({prMs:220,prAssessment:"present",qrsMs:120,qrsAssessment:"present",qtcMs:480,qtcAssessment:"present"});assert.equal(value(x.derived.prClass),"prolonged");assert.equal(value(x.derived.qrsClass),"wide");assert.equal(value(x.derived.qtcClass),"prolonged");assert.deepEqual([value(x.measurements.prMs),value(x.measurements.qrsMs),value(x.measurements.qtcMs)],[220,120,480])});

test("ST1 II III aVF elevation derives inferior territory",()=>{const x=canonical({stMeasurements:allSt({II:"elevation",III:"elevation",aVF:"elevation"})});assert.ok(value(x.derived.stTerritories).includes("inferior"));assert.equal(value(x.derived.contiguousPattern),"contiguous")});
test("ST2 V1-V4 elevation follows existing anterior and septal groups",()=>{const x=canonical({stMeasurements:allSt({V1:"elevation",V2:"elevation",V3:"elevation",V4:"elevation"})});assert.ok(value(x.derived.stTerritories).includes("anterior"));assert.ok(value(x.derived.stTerritories).includes("septal"))});
test("ST3 I plus III alone is non-contiguous",()=>{const x=canonical({stMeasurements:allSt({I:"elevation",III:"elevation"})});assert.equal(value(x.derived.contiguousPattern),"non_contiguous")});
test("ST4 inferior elevation plus lateral depression derives reciprocal",()=>{const x=canonical({stMeasurements:allSt({II:"elevation",III:"elevation",aVF:"elevation",aVL:"depression"})});assert.equal(value(x.derived.reciprocalPattern),true)});
test("ST5 unentered leads remain not_assessed rather than no_change",()=>{const x=canonical({});assert.equal(x.derived.stTerritories.status,"not_assessed");assert.equal(x.derived.contiguousPattern.status,"not_assessed");assert.equal(x.derived.reciprocalPattern.status,"not_assessed");for(const lead of Object.values(x.stLeads))assert.equal(lead.status,"not_assessed")});

test("U1 unknown V2 is not negative ST evidence",()=>{const leads=createNotAssessedStLeads();leads.V2=unknownObservation("判定困難");assert.equal(deriveStTerritories(leads).status,"unknown");assert.equal(deriveContiguousPattern(leads).status,"unknown")});
test("U2 unknown QRS is not narrow",()=>assert.equal(canonical({qrsAssessment:"unknown",qrsCategory:"indeterminate"}).derived.qrsClass.status,"unknown"));
test("U3 unknown PR is not normal",()=>assert.equal(canonical({prAssessment:"unknown",prCategory:"indeterminate"}).derived.prClass.status,"unknown"));
test("U4 unknown chest pain is not absence",()=>assert.equal(canonical({clinical:{chestPain:{value:null,assessed:true,unknown:true}}}).clinical.chestPain.status,"unknown"));
test("explicitly denied context is distinct from unknown and not_assessed",()=>{assert.equal(canonical({clinical:{dyspnea:{value:false,assessed:true}}}).clinical.dyspnea.status,"absent");assert.equal(canonical({}).clinical.dyspnea.status,"not_assessed")});

test("shadow comparison passes matching legacy classifications",()=>{const x=canonical({heartRateBpm:45,heartRateAssessment:"present",prMs:160,prAssessment:"present",qrsMs:90,qrsAssessment:"present",qtcMs:420,qtcAssessment:"present",stMeasurements:allSt()});const comparison=compareCanonicalShadow(x,{rateClass:"bradycardia",prClass:"normal",qrsClass:"narrow",qtcClass:"normal",stTerritories:[],contiguousPattern:"non_contiguous",reciprocalPattern:false});assert.equal(comparison.pass,true);assert.equal(comparison.items.filter(item=>item.status==="review").length,0)});
test("shadow comparison records disagreement as REVIEW without changing either input",()=>{const x=canonical({qrsMs:120,qrsAssessment:"present"});const comparison=compareCanonicalShadow(x,{qrsClass:"narrow"});assert.equal(comparison.pass,false);assert.deepEqual(comparison.items[0],{field:"qrsClass",legacy:"narrow",canonical:"wide",status:"review"});assert.equal(value(x.measurements.qrsMs),120)});

test("legacy normal defaults are explicitly inventoried and canonical empty input ignores them",()=>{assert.equal(LEGACY_DEFAULT_RISKS.length,4);const x=canonical({});for(const item of Object.values(x.measurements))assert.equal(item.status,"not_assessed")});
test("legacy QRS pseudo values are audited but never generated by canonical adapter",()=>{const source=readFileSync(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");assert.match(source,/value===\"narrow\"\?100/);assert.match(source,/value===\"wide\"\|\|value===\"rbbb\"\|\|value===\"lbbb\"\?140/);const x=canonical({qrsCategory:"rbbb",qrsAssessment:"present"});assert.equal(x.measurements.qrsMs.status,"not_assessed")});

test("canonical shadow execution cannot remove emergency candidates or Red Flags",()=>{const cases=[{clinical:{ischemicChestPain:true},ecg:{contiguousStElevation:true,reciprocalChange:true}},{ecg:{wideTachycardia:true}},{clinical:{cardiacArrest:true},ecg:{vf:true}},{clinical:{syncope:true},ecg:{qtProlonged:true,qtMarked:true,pvc:true,rOnT:true}},{ecg:{mobitzII:true}},{ecg:{highGradeBlock:true}},{ecg:{completeBlock:true}},{ecg:{peakedT:true,pWaveAbsent:true,wideQrs:true,qrsProlonged:true}},{ecg:{wideTachycardia:true,irregularTachycardia:true,preexcitation:true,variableQrs:true}},{clinical:{shock:true}}];for(const patch of cases){const before=integrated(patch);canonical({});const after=integrated(patch);assert.deepEqual(after,before);assert.ok(["emergency","resuscitation"].includes(after.urgency))}});
test("Rule IDs priorities and count remain the baseline 59",()=>{assert.equal(ecgRuleRegistry.length,59);const digest=createHash("sha256").update(JSON.stringify(ecgRuleRegistry.map(rule=>[rule.id,rule.priority]))).digest("hex");assert.equal(digest,"df1b40ccdfca60e9f81670c0db33a7b6d0a75a50273856a0004f879a5942bc3d")});
test("pure ST helpers do not mutate observations",()=>{const leads=createNotAssessedStLeads();leads.II=presentObservation("elevation");const snapshot=structuredClone(leads);deriveStTerritories(leads);deriveContiguousPattern(leads);deriveReciprocalPattern(leads);assert.deepEqual(leads,snapshot)});
