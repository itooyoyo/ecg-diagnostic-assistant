import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createDefaultStInput} from "../data/st-interpretation/defaults.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";
import {interpretStChanges} from "../logic/st-interpretation/interpret-st.js";

const ui=readFileSync(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");

function inferiorSt(){
  const input=createDefaultStInput();
  input.clinicalReviewStatus="mixed";
  for(const [lead,direction] of [["II","elevation"],["III","elevation"],["aVF","elevation"],["aVL","depression"]]){
    Object.assign(input.leadMeasurements.find(item=>item.lead===lead),{direction,clinicianConfirmed:true});
  }
  return input;
}

test("shape controls are disclosed only for elevation or mixed ST review",()=>{
  assert.match(ui,/stChoice==="elevation"\|\|stChoice==="mixed"/);
  assert.doesNotMatch(ui,/stChoice==="depression"[^\n]*<StElevationShapePicker/);
});

test("shape picker exposes four accessible audit choices",()=>{
  for(const value of ["concave","straight","convex","indeterminate"])assert.match(ui,new RegExp(`value:\"${value}\"`));
  assert.match(ui,/type="radio"/);
  assert.match(ui,/aria-label={`ST上昇形状/);
});

test("straight is independent from the existing horizontal morphology",()=>{
  const types=readFileSync(new URL("../types/st-interpretation.ts",import.meta.url),"utf8");
  assert.match(types,/StElevationShape = "unentered"\|"concave"\|"straight"\|"convex"\|"indeterminate"/);
  assert.match(types,/StMorphology = "horizontal"/);
});

test("all shape states leave the ST interpretation unchanged",()=>{
  const baseline=inferiorSt();
  const expected=interpretStChanges(baseline);
  for(const elevationShape of ["unentered","concave","straight","convex","indeterminate"]){
    assert.deepEqual(interpretStChanges({...baseline,elevationShape}),expected);
  }
});

test("inferior elevation plus aVL depression keeps reciprocal derivation",()=>{
  const result=interpretStChanges(inferiorSt());
  assert.equal(result.reciprocalChanges[0].status,"present");
  assert.ok(result.redFlags.some(item=>item.includes("reciprocal")));
});

test("acute injury checks are conditionally tied to existing ST support",()=>{
  assert.match(ui,/acuteStSupport&&<section/);
  for(const text of ["hs-cardiac troponin","前回ECGとの比較","serial ECG","troponin結果を待って緊急評価を遅らせません"])assert.match(ui,new RegExp(text));
  assert.match(ui,/CK／CK-MBは必須入力ではありません/);
});

test("inflammatory checks remain education only",()=>{
  assert.match(ui,/inflammatoryEducation&&<details/);
  for(const text of ["CRP","発熱","胸痛の性状","心膜摩擦音","心嚢液の有無","診断候補を自動生成しません"])assert.match(ui,new RegExp(text));
});

test("unvalidated mimic findings are explicitly disconnected from rules",()=>{
  for(const text of ["PR depression","J-point notching／slurring","terminal QRS distortion","ST/T ratio","今回Rule未接続","測定値を今回Ruleへ使用しない"])assert.match(ui,new RegExp(text.replace("/","\\/")));
});

test("shape cards remain responsive and keyboard-native",()=>{
  assert.match(css,/\.st-shape-grid\{display:grid/);
  assert.match(css,/@media\(max-width:720px\).*\.st-shape-grid\{grid-template-columns:repeat\(2/);
  assert.match(css,/@media\(max-width:340px\).*\.st-shape-grid\{grid-template-columns:1fr/);
  assert.match(ui,/<label className={`st-shape-card/);
});

test("approved medical registry remains 59 rules",()=>assert.equal(ecgRuleRegistry.length,59));
