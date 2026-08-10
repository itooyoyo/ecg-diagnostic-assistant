import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createClinicalReviewStInput} from "../data/st-interpretation/defaults.js";
import {interpretStChanges} from "../logic/st-interpretation/interpret-st.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const setQualitative=(input,status,entries=[])=>{
  input.clinicalReviewStatus=status;
  input.leadMeasurements=input.leadMeasurements.map(measurement=>{
    const selected=entries.find(([lead])=>lead===measurement.lead);
    return {...measurement,direction:selected?.[1]??(status==="none"?"isoelectric":"indeterminate"),clinicianConfirmed:Boolean(selected)||status==="none"};
  });
  return input;
};

const integrated=(patch={})=>{
  const input=createDefaultIntegratedInput();
  Object.assign(input.clinical,patch.clinical);
  Object.assign(input.ecg,patch.ecg);
  input.indeterminateFindingIds=patch.indeterminateFindingIds??[];
  return buildIntegratedInterpretation(input);
};

test("ST unentered is indeterminate rather than normal",()=>{
  const result=interpretStChanges(createClinicalReviewStInput());
  assert.equal(result.overallClassification,"indeterminate");
});

test("ST difficult remains indeterminate",()=>{
  const input=setQualitative(createClinicalReviewStInput(),"indeterminate");
  assert.equal(interpretStChanges(input).overallClassification,"indeterminate");
});

test("explicit no obvious ST change is the only simplified negative state",()=>{
  const input=setQualitative(createClinicalReviewStInput(),"none");
  assert.equal(interpretStChanges(input).overallClassification,"no_significant_change");
});

test("qualitative lead selections derive existing contiguous groups",()=>{
  const input=setQualitative(createClinicalReviewStInput(),"elevation",[["V2","elevation"],["V3","elevation"]]);
  const result=interpretStChanges(input);
  assert.equal(result.overallClassification,"st_elevation");
  assert.ok(result.contiguousLeadGroups.some(group=>group.startsWith("前壁")));
});

test("noncontiguous qualitative leads do not create a contiguous group",()=>{
  const input=setQualitative(createClinicalReviewStInput(),"elevation",[["I","elevation"],["II","elevation"]]);
  assert.equal(interpretStChanges(input).contiguousLeadGroups.length,0);
});

test("ST indeterminate marks ST rules insufficient while other rules continue",()=>{
  const result=integrated({indeterminateFindingIds:["st-change"],ecg:{qtProlonged:true,rOnT:true}});
  assert.ok(result.ruleRelations.insufficientRuleIds.includes("ECG-ST-001"));
  assert.ok(result.diagnosticCandidates.some(candidate=>candidate.id==="tdp-risk"));
});

test("ST indeterminate with ischemic symptoms retains existing follow-up evaluation",()=>{
  const result=integrated({indeterminateFindingIds:["st-change"],clinical:{ischemicChestPain:true}});
  const labels=result.todaysPlan.map(item=>item.label);
  assert.ok(labels.some(label=>label.includes("前回心電図")));
  assert.ok(labels.some(label=>label.includes("連続12誘導")));
  assert.ok(labels.some(label=>label.includes("追加誘導")));
  assert.ok(labels.some(label=>label.includes("トロポニン")));
  assert.ok(result.missingInformation.some(item=>item.id==="st-assessment"));
});

test("simplified ST UI contains six explicit states and conditionally rendered lead pickers",async()=>{
  const source=await readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
  for(const label of ["未入力","明らかなST上昇あり","明らかなST低下あり","上昇と低下の両方あり","明らかなST変化なし","判定困難"])assert.match(source,new RegExp(`>${label}<`));
  assert.match(source,/stChoice==="elevation"\|\|stChoice==="mixed"/);
  assert.match(source,/stChoice==="depression"\|\|stChoice==="mixed"/);
  assert.doesNotMatch(source,/ST elevation mm|ST depression mm|J point mm/);
});

test("all 59 approved rules remain registered",()=>assert.equal(ecgRuleRegistry.length,59));
