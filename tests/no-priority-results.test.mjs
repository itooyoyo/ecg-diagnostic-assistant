import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildNoPriorityDisplay} from "../logic/integration/build-no-priority-display.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

test("partially reviewed ECG summarizes entered findings and keeps ST QT unassessed",()=>{
  const display=buildNoPriorityDisplay({
    candidateCount:0,
    criticalCount:0,
    enteredFindings:["心拍数：78/分","リズム：規則的","P波：あり","PR：正常","QRS：narrow","T波：明らかな異常なし"],
    unassessedItems:["ST変化","QT/QTc"],
  });
  assert.equal(display.title,"現時点で優先度の高い診断候補はありません。");
  assert.match(display.summary,/入力された範囲/);
  assert.doesNotMatch(display.summary,/正常心電図|異常所見は認められません/);
  assert.deepEqual(display.unassessedItems,["ST変化","QT/QTc"]);
});

test("fully and explicitly reviewed findings use restrained no-abnormality wording",()=>{
  const display=buildNoPriorityDisplay({
    candidateCount:0,
    criticalCount:0,
    enteredFindings:["心拍数：78/分","リズム：規則的","P波：あり","PR：正常","QRS：narrow","ST変化：明らかなST変化なし","T波：明らかな異常なし","QT/QTc：QT 400 ms"],
    unassessedItems:[],
  });
  assert.equal(display.summary,"入力された範囲では明らかな異常所見は認められません。");
  assert.doesNotMatch(display.summary,/正常心電図/);
});

test("matched pathological candidate keeps the existing candidate result path",()=>{
  assert.equal(buildNoPriorityDisplay({candidateCount:1,criticalCount:1,enteredFindings:[],unassessedItems:[]}),null);
});

test("many unknowns remain unassessed and are not converted to normal",()=>{
  const display=buildNoPriorityDisplay({
    candidateCount:0,
    criticalCount:0,
    enteredFindings:[],
    unassessedItems:["心拍数","リズム","P波","PR","QRS","ST変化","T波","QT/QTc"],
  });
  assert.equal(display.enteredFindings.length,0);
  assert.equal(display.unassessedItems.length,8);
  assert.equal(display.additionalInformation.length,6);
  assert.doesNotMatch(display.summary,/異常所見は認められません/);
});

test("result UI replaces the old empty-candidate sentence with structured sections",async()=>{
  const source=await readFile(new URL("../components/ecg/EcgWorkspace.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/優先候補は生成されていません/);
  assert.match(source,/今回十分に評価できていない項目/);
  assert.match(source,/追加すると評価しやすくなる情報/);
  assert.match(source,/reviewedFields/);
});

test("all 59 approved medical rules remain registered",()=>assert.equal(ecgRuleRegistry.length,59));
