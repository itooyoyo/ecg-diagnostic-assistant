import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultIntegratedInput } from "../data/integration/defaults.js";
import { buildIntegratedInterpretation } from "../logic/integration/build-integrated-interpretation.js";
import { ecgRuleRegistry } from "../data/rule-engine/rule-registry.js";

const evaluate=(mutate)=>{const input=createDefaultIntegratedInput();mutate(input);return buildIntegratedInterpretation(input)};

test("simplified AF evidence reaches the existing AF rules without a hyper-K override",()=>{
  const result=evaluate(input=>{input.confirmedModules.push("simplified-af");input.ecg.pWaveAbsent=true;input.clinical.heartRate=125});
  assert.equal(result.diagnosticCandidates[0].id,"atrial-fibrillation-pattern");
  assert.ok(result.ruleRelations.matchedRuleIds.includes("ECG-PWAVE-002"));
  assert.ok(!result.diagnosticCandidates.some(x=>x.id==="severe-hyperkalemia"));
});

test("LBBB remains visible and keeps Sgarbossa review when ST is indeterminate",()=>{
  const result=evaluate(input=>{input.ecg.lbbb=true;input.ecg.wideQrs=true;input.clinical.ischemicChestPain=true;input.indeterminateFindingIds.push("st-change")});
  const candidate=result.diagnosticCandidates.find(x=>x.id==="lbbb-pattern");
  assert.ok(candidate);
  assert.ok(candidate.recommendedChecks.some(x=>x.id==="sgarbossa-review"));
  assert.ok(result.ruleRelations.insufficientRuleIds.some(id=>id.startsWith("ECG-ST-")));
});

test("marked QT plus explicit R on T and syncope is emergency with R on T evidence",()=>{
  const result=evaluate(input=>{input.ecg.qtProlonged=true;input.ecg.qtMarked=true;input.ecg.bradycardia=true;input.ecg.pvc=true;input.clinical.syncope=true;input.confirmedModules.push("simplified-r-on-t")});
  assert.equal(result.urgency,"emergency");
  const candidate=result.diagnosticCandidates.find(x=>x.id==="tdp-risk");
  assert.ok(candidate?.supportingFindings.some(x=>x.findingId==="r-on-t"));
  assert.ok(result.ruleRelations.matchedRuleIds.includes("ECG-QT-003"));
});

test("digitalis and rate-related explanations do not suppress chest-pain ischemia",()=>{
  const result=evaluate(input=>{input.clinical.heartRate=140;input.clinical.digitalisUse=true;input.clinical.ischemicChestPain=true;input.ecg.anyStDepression=true});
  const ids=result.diagnosticCandidates.map(x=>x.id);
  assert.ok(ids.includes("digitalis-effect"));
  assert.ok(ids.includes("rate-related-st-change"));
  assert.ok(ids.includes("acute-coronary-occlusion"));
  assert.equal(result.urgency,"emergency");
});

test("derived inferior reciprocal context retains ACS and adds V4R",()=>{
  const result=evaluate(input=>{input.ecg.inferiorStElevation=true;input.ecg.contiguousStElevation=true;input.confirmedModules.push("derived-reciprocal")});
  const candidate=result.diagnosticCandidates.find(x=>x.id==="acute-coronary-occlusion");
  assert.ok(candidate);
  assert.ok(candidate.recommendedChecks.some(x=>x.id==="right-leads"));
});

test("the registered medical rule count remains 59",()=>assert.equal(ecgRuleRegistry.length,59));
