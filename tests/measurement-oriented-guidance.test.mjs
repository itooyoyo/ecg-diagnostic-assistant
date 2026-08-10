import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {WIDE_QRS_THRESHOLD_MS} from "../logic/tachyarrhythmia/classify.js";
import {QT_CLASSIFICATION_THRESHOLDS_MS} from "../logic/qt-interpretation/interpret-qt.js";
import {contiguousLeadGroups,elevationThresholdMm} from "../data/st-interpretation/criteria.js";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const guide=fs.readFileSync("components/ecg/FindingEducationGuide.tsx","utf8");

test("QRS guide references the engine threshold",()=>{assert.equal(WIDE_QRS_THRESHOLD_MS,120);assert.match(guide,/WIDE_QRS_THRESHOLD_MS/)});
test("QTc guide references the engine thresholds",()=>{assert.deepEqual(QT_CLASSIFICATION_THRESHOLDS_MS,{shortMax:330,borderlineMin:440,prolongedMin:480,markedProlongationMin:500});assert.match(guide,/QT_CLASSIFICATION_THRESHOLDS_MS/)});
test("ST guide references shared criteria and lead groups",()=>{assert.equal(elevationThresholdMm("I",null,"unknown").threshold,1);assert.deepEqual(contiguousLeadGroups["下壁（II・III・aVF）"],["II","III","aVF"]);assert.match(guide,/contiguousLeadGroups/)});
test("PR guide distinguishes general reference from categorical Rule input",()=>{assert.match(guide,/一般的目安は120–200 ms/);assert.match(guide,/数値閾値ではなく/)});
test("all requested guide topics and six-part format are present",()=>{for(const text of ["心電図の基本","PR間隔","QRS幅","QT / QTc","ST / J点","Δ波","R on T","R波進行","後壁鏡像変化","LBBB","reciprocal change","Digitalis effect","頻脈関連ST変化","どこを見る？","どう測る？","判定の目安","この所見なら何を考える？","見落とし防止","アプリではどこへ入力する？"])assert.match(guide,new RegExp(text.replace(/[/?]/g,"\\$&")))});
test("measurement guide provides input focus and indeterminate safety",()=>{assert.match(guide,/\.focus\(\)/);assert.match(guide,/scrollIntoView/);assert.match(guide,/未入力・判定困難を正常所見として扱いません/)});
test("original SVG diagrams cover delta R-on-T progression posterior and LBBB",()=>{for(const text of ["正常QRS","R on Tの比較","V1からV6","後壁鏡像変化","LBBB / 二次性ST-T"])assert.match(guide,new RegExp(text))});
test("digitalis and rate-related guides do not suppress ischemia",()=>{assert.match(guide,/digitalis使用＝虚血なし、とは扱いません/);assert.match(guide,/虚血を除外する所見ではありません/)});
test("approved registry remains 59 rules",()=>{assert.equal(ecgRuleRegistry.length,59)});
