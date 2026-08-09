import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {candidateRuleIds} from "../data/rule-engine/candidate-rules.js";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";

const engine=fs.readFileSync("logic/integration/build-integrated-interpretation.js","utf8");
const ui=fs.readFileSync("components/integration/DiagnosticCandidates.tsx","utf8");
const shell=fs.readFileSync("components/integration/IntegratedInterpretation.tsx","utf8");
const catalog=fs.readFileSync("docs/ecg-rule-catalog.md","utf8");
const readme=fs.readFileSync("README.md","utf8");
const localAdapter=fs.readFileSync("lib/ecg-image/local-ecg-image-analysis-adapter.ts","utf8");
const registry=fs.readFileSync("docs/ecg-rule-registry.md","utf8");
const ruleType=fs.readFileSync("types/ecg-rule.ts","utf8");
const ruleAdapter=fs.readFileSync("data/rule-engine/rule-adapter.ts","utf8");

test("every integrated candidate has stable rule IDs",()=>{
  const ids=[...engine.matchAll(/add\(candidate\("([^"]+)"/g)].map(x=>x[1]);
  assert.ok(ids.length>=18);
  for(const id of ids)assert.ok(candidateRuleIds[id]?.length,`${id} must have a Rule ID`);
});

test("acute coronary candidate exposes the rule used",()=>{
  const input=createDefaultIntegratedInput();
  Object.assign(input.clinical,{ischemicChestPain:true});
  Object.assign(input.ecg,{contiguousStElevation:true,reciprocalChange:true});
  const result=buildIntegratedInterpretation(input);
  assert.deepEqual(result.diagnosticCandidates.find(x=>x.id==="acute-coronary-occlusion").ruleIds,["ECG-ST-001"]);
});

test("candidate UI shows rule IDs and additional confirmation items",()=>{
  assert.match(ui,/使用Rule/);
  assert.match(ui,/不足情報/);
  assert.match(ui,/次に確認すべきこと/);
});

test("rule catalog covers every requested category",()=>{
  for(const category of ["P波","PR","QRS","QT","軸","R波進行","Q波","ST","T波","U波","頻脈","徐脈","脚ブロック","WPW","Brugada","Wellens","電解質"])assert.match(catalog,new RegExp(`\\| [^\\n]*${category}`));
});

test("rule catalog defines IF THEN required inputs and priority",()=>{
  for(const heading of ["IF（医師確認所見）","THEN","必要入力","入力不足時の追加確認","優先順位"])assert.match(catalog,new RegExp(heading));
});

test("application identifies itself as an Explainable Rule Engine",()=>{
  assert.match(readme,/Explainable AIではなく[\s\S]*Explainable Rule Engine/);
  assert.match(shell,/Explainable Rule Engine/);
  assert.match(shell,/画像モデルは所見抽出のみ/);
});

test("local image adapter cannot produce a diagnosis",()=>{
  assert.doesNotMatch(localAdapter,/diagnos(?:is|tic)|differential|treatment|診断候補|鑑別診断|初期対応/i);
});

test("Version 2 UI is clinician-input first and does not advertise future extraction",()=>{
  const source=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
  assert.match(source,/const enableFutureLocalExtraction=false/);
  assert.match(source,/ルールベース診断支援/);
  assert.match(source,/主要所見を入力/);
  assert.match(source,/診断候補と理由を確認/);
  assert.match(source,/心電図画像そのものを自動読影する機能は使用していません/);
  assert.doesNotMatch(source,/ローカル心電図解析モデルを開発中です|将来はローカル画像解析モデルを追加/);
});

test("candidate Rule IDs are unique and follow the stable naming convention",()=>{
  const ids=Object.values(candidateRuleIds).flat();
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ids)assert.match(id,/^ECG-[A-Z]+-\d{3}$/);
});

test("registry inventories 57 existing rules without filling empty categories",()=>{
  assert.match(registry,/今回検出した既存ルールは57件/);
  assert.match(registry,/0件のカテゴリは「機能がない」という意味ではなく/);
  for(let index=1;index<=26;index++)assert.match(registry,new RegExp(`\\| ${String(index).padStart(2,"0")} \\|`));
});

test("common rule contract separates status severity priority and provenance",()=>{
  for(const token of ["EcgRuleCategory","EcgRuleSeverity","EcgRuleEvaluation","requiredInputs","optionalInputs","sourceClassification","implementationFiles","testIds"])assert.match(ruleType,new RegExp(token));
  for(const status of ["matched","not_matched","insufficient_data","not_applicable"])assert.match(ruleType,new RegExp(status));
});

test("adapter preserves missing conflicting and competing information",()=>{
  for(const token of ["missingInputs","conflictingInputs","competingRuleIds","explanationJa"])assert.match(ruleAdapter,new RegExp(token));
  assert.match(registry,/必須入力が欠ける場合は正常扱いせず`insufficient_data`/);
  assert.match(registry,/併存または鑑別が必要/);
});
