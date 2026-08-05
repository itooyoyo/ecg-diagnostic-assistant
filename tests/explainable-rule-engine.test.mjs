import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {explainCandidate} from "../data/rule-engine/explain-candidate.js";
import {v2RegressionCases} from "../data/rule-engine/v2-case-fixtures.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";

const ui=fs.readFileSync("components/integration/DiagnosticCandidates.tsx","utf8");
const workspace=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
const integrated=(patch={})=>{const input=createDefaultIntegratedInput();for(const [group,values] of Object.entries(patch))Object.assign(input[group],values);return buildIntegratedInterpretation(input)};

test("detail view follows the explainable rule order",()=>{
  const labels=["<RuleEvidence rules=",'title="判定理由"','title="除外理由"','title="不足情報"','title="次に確認すべきこと"','title="追加検査"','title="初期対応"'];
  let cursor=-1;
  for(const label of labels){const next=ui.indexOf(label);assert.ok(next>cursor,`${label} must follow the preceding section`);cursor=next}
});

test("rule confidence is displayed only as high medium or low Japanese labels",()=>{
  for(const confidence of ["high","moderate","low","indeterminate"]){const explanation=explainCandidate({...integrated({clinical:{ischemicChestPain:true},ecg:{contiguousStElevation:true}}).diagnosticCandidates[0],confidence});assert.ok(["高","中","低"].includes(explanation.ruleConfidence))}
  assert.match(ui,/Rule confidence/);
  assert.match(workspace,/ruleConfidenceJa/);
});

test("candidate explanation is derived from existing evidence without new clinical content",()=>{
  const candidate=integrated({quality:{limbReversal:true},ecg:{contiguousStElevation:true}}).diagnosticCandidates.find(item=>item.id==="acute-coronary-occlusion");
  const explanation=explainCandidate(candidate);
  assert.deepEqual(explanation.judgmentReasons,candidate.supportingFindings.map(item=>item.label));
  assert.deepEqual(explanation.exclusionReasons,candidate.contradictingFindings.map(item=>item.label));
  assert.deepEqual(explanation.missingInformation,candidate.missingInformation.map(item=>item.label));
  assert.deepEqual(explanation.initialActions,candidate.recommendedActions.map(item=>item.label));
});

test("used rules expose stable IDs and their existing required inputs",()=>{
  const candidate=integrated({clinical:{ischemicChestPain:true},ecg:{contiguousStElevation:true,reciprocalChange:true}}).diagnosticCandidates.find(item=>item.id==="acute-coronary-occlusion");
  const explanation=explainCandidate(candidate);
  assert.deepEqual(explanation.usedRules.map(rule=>rule.id),candidate.ruleIds);
  assert.ok(explanation.usedRules.every(rule=>rule.requiredInputs.length>0));
});

test("all twenty regression cases retain explainability coverage",()=>{
  assert.equal(v2RegressionCases.length,20);
  for(const item of v2RegressionCases){
    const isNormal=item.expected.candidate===null;
    const hasRules=(item.expected.ruleIds?.length??0)>0;
    const hasExplicitMissing=(item.expected.missing?.length??0)>0;
    assert.ok(isNormal||hasRules||hasExplicitMissing,`${item.id} must have rules, missing information, or an explicit normal result`);
  }
});

test("Clinical Pearl display remains supplied only through existing module props",()=>{
  assert.match(workspace,/ClinicalResults result=\{integratedResult\} pearls=/);
  assert.match(workspace,/tachyResult\.clinicalPearls/);
  assert.match(workspace,/bradyResult\.clinicalPearls/);
  assert.match(workspace,/conductionResult\.clinicalPearls/);
  assert.doesNotMatch(ui,/Clinical Pearl/);
});
