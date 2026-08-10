import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const evaluate=(patch={})=>{
  const base=createDefaultIntegratedInput();
  return buildIntegratedInterpretation({...base,...patch,quality:{...base.quality,...patch.quality},clinical:{...base.clinical,...patch.clinical},ecg:{...base.ecg,...patch.ecg}});
};
const candidateIds=result=>result.diagnosticCandidates.map(candidate=>candidate.id);

test("Version 2 can evaluate physician findings without an image",()=>{
  const result=evaluate();
  assert.equal(candidateIds(result).includes("technical-limitation"),false);
  assert.equal(result.ruleRelations.matchedRuleIds.includes("ECG-QUALITY-001"),false);
});

test("unset image quality fields are not converted to explicit failure",()=>{
  const result=evaluate({quality:{imageAdequate:undefined,allLeads:undefined,leadLabels:undefined,speedVisible:undefined,gainVisible:undefined}});
  assert.equal(candidateIds(result).includes("technical-limitation"),false);
  assert.equal(result.ruleRelations.matchedRuleIds.includes("ECG-QUALITY-001"),false);
});

test("unknown electrode placement does not suppress a clinical candidate",()=>{
  const result=evaluate({quality:{placementConcern:undefined},clinical:{ischemicChestPain:true},ecg:{contiguousStElevation:true}});
  assert.ok(candidateIds(result).includes("acute-coronary-occlusion"));
  assert.equal(candidateIds(result).includes("technical-limitation"),false);
});

test("explicit electrode concern retains both quality and ischemia candidates",()=>{
  const result=evaluate({quality:{placementConcern:true,limbReversal:true},clinical:{ischemicChestPain:true},ecg:{contiguousStElevation:true}});
  assert.ok(candidateIds(result).includes("technical-limitation"));
  assert.ok(candidateIds(result).includes("acute-coronary-occlusion"));
  assert.ok(result.ruleRelations.competingRuleIds.includes("ECG-QUALITY-001"));
  assert.ok(result.ruleRelations.competingRuleIds.includes("ECG-ST-001"));
  assert.ok(result.todaysPlan.some(item=>item.label.includes("再記録")));
});

test("explicitly inadequate quality still activates QUALITY-001",()=>{
  const result=evaluate({quality:{imageAdequate:false}});
  assert.ok(candidateIds(result).includes("technical-limitation"));
  assert.ok(result.ruleRelations.matchedRuleIds.includes("ECG-QUALITY-001"));
});

test("image optional workflow exposes seven-section input before collapsed reference image",async()=>{
  const [workspace,review]=await Promise.all([
    readFile(new URL("../components/ecg/EcgWorkspace.tsx",import.meta.url),"utf8"),
    readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(workspace,/画像なしで解析可能/);
  assert.match(workspace,/<details className="reference-image" id="reference-image">/);
  assert.doesNotMatch(workspace,/<details className="reference-image" id="reference-image" open>/);
  assert.match(workspace,/Version 2では心電図画像そのものの自動読影は行いません/);
  assert.match(workspace,/if\(qualityAssessmentEnabled\)Object\.assign\(x\.quality/);
  assert.match(review,/>解析する<\/button>/);
  assert.equal((review.match(/<ReviewSection code=/g)??[]).length,7);
});

test("all 59 approved rules remain registered for image-free evaluation",()=>{
  assert.equal(ecgRuleRegistry.length,59);
});
