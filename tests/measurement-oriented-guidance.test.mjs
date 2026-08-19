import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {WIDE_QRS_THRESHOLD_MS} from "../logic/tachyarrhythmia/classify.js";
import {QT_CLASSIFICATION_THRESHOLDS_MS} from "../logic/qt-interpretation/interpret-qt.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const guide=fs.readFileSync("components/ecg/FindingEducationGuide.tsx","utf8");

test("QRS guide references the engine threshold",()=>{assert.equal(WIDE_QRS_THRESHOLD_MS,120);assert.match(guide,/WIDE_QRS_THRESHOLD_MS/)});
test("QTc guide references the engine thresholds",()=>{assert.deepEqual(QT_CLASSIFICATION_THRESHOLDS_MS,{shortMax:330,borderlineMin:440,prolongedMin:480,markedProlongationMin:500});assert.match(guide,/QT_CLASSIFICATION_THRESHOLDS_MS/)});
test("ST guide teaches the approved assessment order without creating another threshold",()=>{assert.match(guide,/Shape → 誘導分布 → reciprocal → 症状・QRS背景/);assert.match(guide,/concaveでもACSを除外せず/);assert.doesNotMatch(guide,/elevationThresholdMm|contiguousLeadGroups/)});
test("PR guide distinguishes general reference from categorical Rule input",()=>{assert.match(guide,/一般的目安は0\.12～0\.20秒/);assert.match(guide,/既存Ruleの医師入力を置き換えません/)});
test("the requested eleven topics and common six-part format are present",()=>{for(const text of ["調律","心拍数","軸","R波移行帯","P波","PR / PQ間隔","QRS","ST","T波","QT / QTc","U波","どこを見る","どう見る / 測る","正常の目安","異常なら何を考える","見落とし防止","この所見を入力する"])assert.match(guide,new RegExp(text.replace(/[/?]/g,"\\$&")))});
test("measurement guide provides input focus and indeterminate safety",()=>{assert.match(guide,/\.focus\(\)/);assert.match(guide,/scrollIntoView/);assert.match(guide,/未入力・判定困難を正常所見として扱いません/)});
test("original SVG diagrams cover axis progression P QRS ST T QT and U",()=>{for(const text of ["電気軸四象限","V1からV6のR波移行帯","IIとV1で確認するP波","QRS幅と形態","ST評価順序","T波形態","U波"]){assert.match(guide,new RegExp(text))}});
test("guide is optional navigation and does not gate rule evaluation",()=>{assert.match(guide,/すべて完了しなくても、入力済み所見だけで59 Rulesを評価できます/);assert.doesNotMatch(guide,/required.*completed|全STEP.*必須/)});
test("compact navigation exposes the current guide position",()=>{assert.match(guide,/aria-current=\{activeGuide===id\?"step":undefined\}/);assert.match(guide,/className=\{activeGuide===id\?"is-current":undefined\}/)});
test("approved registry remains 59 rules",()=>{assert.equal(ecgRuleRegistry.length,59)});
