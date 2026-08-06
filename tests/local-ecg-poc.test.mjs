import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {localPocToRuleContext,recalculateLocalPocRules} from "../lib/ecg-features/local/local-poc.js";

const leads=["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
const st=(overrides={})=>leads.map(lead=>({lead,direction:overrides[lead]??"isoelectric",quality:"adequate",limitations:[]}));
const measurements=(extra={})=>({heartRateBpm:72,rrIntervals:[820,830,825],rhythmRegularity:"regular",estimatedQrsDurationMs:88,qrsWidthCandidate:"narrow",stDirections:st(),quality:"adequate",limitations:[],...extra});

test("PoC adapter preserves all unavailable fields as indeterminate",()=>{
 const result=localPocToRuleContext({heartRateBpm:null,rrIntervals:[],rhythmRegularity:"indeterminate",estimatedQrsDurationMs:null,qrsWidthCandidate:"indeterminate",stDirections:[],quality:"limited",limitations:[]});
 assert.deepEqual(result.indeterminateFields,["heartRateBpm","rhythmRegularity","qrsWidthCandidate","stDirections"]);
 assert.equal(result.context.quality.jPointClear,false);
 assert.equal(result.context.quality.pWaveClear,false);
 assert.equal(result.context.quality.tEndClear,false);
});

test("heart rate, regularity and QRS candidates map into rule context",()=>{
 const result=localPocToRuleContext(measurements({heartRateBpm:45,qrsWidthCandidate:"wide",estimatedQrsDurationMs:140}));
 assert.equal(result.context.ecg.bradycardia,true);
 assert.equal(result.context.ecg.wideQrs,true);
 assert.equal(result.context.ecg.qrsProlonged,true);
 assert.deepEqual(result.extractedFields,["heartRateBpm","rhythmRegularity","qrsWidthCandidate","stDirections"]);
});

test("inferior ST elevation and reciprocal depression remain available to existing rules",()=>{
 const result=localPocToRuleContext(measurements({stDirections:st({II:"elevation",III:"elevation",aVF:"elevation",I:"depression",aVL:"depression"})}));
 assert.equal(result.context.ecg.inferiorStElevation,true);
 assert.equal(result.context.ecg.contiguousStElevation,true);
 assert.equal(result.context.ecg.reciprocalChange,true);
});

test("V1-V3 depression is mapped without inventing J-point measurements",()=>{
 const result=localPocToRuleContext(measurements({stDirections:st({V1:"depression",V2:"depression",V3:"depression"})}));
 assert.equal(result.context.ecg.stDepressionV1toV3,true);
 assert.equal(result.context.quality.jPointClear,false);
});

test("physician correction recalculates rules without image input",()=>{
 const result=recalculateLocalPocRules({heartRateBpm:44,rhythmRegularity:"regular",qrsWidthCandidate:"wide",stDirections:st(),source:"physician_corrected"});
 assert.equal(result.context.ecg.bradycardia,true);
 assert.equal(result.context.ecg.wideQrs,true);
 assert.ok(result.ruleResult);
});

test("PoC implementation contains no network, storage, fixture or mock path",()=>{
 const source=fs.readFileSync(new URL("../lib/ecg-features/local/local-poc.js",import.meta.url),"utf8");
 for(const forbidden of ["fetch(","XMLHttpRequest","localStorage","sessionStorage","/api/ecg/analyze","MockEcg","fixture"]) assert.equal(source.includes(forbidden),false,forbidden);
 assert.ok(source.includes("createImageBitmap"));
 assert.ok(source.includes("extractPolyline"));
 assert.ok(source.includes("buildIntegratedInterpretation"));
});

test("UI exposes local start, cancellation, physician correction and required disclaimer",()=>{
 const source=fs.readFileSync(new URL("../components/ecg/LocalEcgPoc.tsx",import.meta.url),"utf8");
 for(const text of ["ローカル解析を開始","解析を中止","医師確認・修正","修正所見でルールを再計算","画像から推定した特徴候補と、登録済みルールに基づく診断支援結果です。"] ) assert.ok(source.includes(text),text);
});

test("UI offers automatic, three by four, six by two, and unknown layout choices",()=>{
 const source=fs.readFileSync(new URL("../components/ecg/LocalEcgPoc.tsx",import.meta.url),"utf8");
 for(const value of ["auto","three_by_four","six_by_two","unknown"]) assert.ok(source.includes(`value=\"${value}\"`));
 assert.ok(source.includes("左列 I・II・III・aVR・aVL・aVF"));
});

test("workspace only exposes the PoC after anonymization confirmation",()=>{
 const source=fs.readFileSync(new URL("../components/ecg/EcgWorkspace.tsx",import.meta.url),"utf8");
 assert.ok(source.includes("processedFile&&!isCropping&&privacyConfirmed&&<LocalEcgPoc"));
});
