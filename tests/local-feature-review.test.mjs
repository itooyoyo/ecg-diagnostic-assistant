import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {collectReviewedLocalFeatures,updateLocalFeatureReview} from "../lib/ecg-features/local/review-candidates.js";

const candidate=(overrides={})=>({id:"candidate-1",featureType:"st_elevation_candidate",lead:"V2",confidence:"medium",evidence:{explanationJa:"局所形状候補",limitations:[]},reviewStatus:"pending",...overrides});
test("local feature candidates start pending and pending is not confirmed",()=>{const result=collectReviewedLocalFeatures([candidate()]);assert.equal(result.confirmed.length,0);assert.equal(result.missing[0].reason,"医師未確認")});
test("only accepted candidates become confirmed rule inputs",()=>{const result=collectReviewedLocalFeatures([candidate({reviewStatus:"accepted"})]);assert.equal(result.confirmed.length,1);assert.equal(result.confirmed[0].reviewStatus,"accepted")});
test("modified physician value overrides the estimated candidate",()=>{const result=collectReviewedLocalFeatures([candidate({reviewStatus:"modified",estimatedMagnitude:2,estimatedUnit:"mm",physicianValue:"医師修正所見"})]);assert.equal(result.confirmed[0].value,"医師修正所見")});
test("rejected candidate is not passed and is not reported as missing",()=>{const result=collectReviewedLocalFeatures([candidate({reviewStatus:"rejected"})]);assert.deepEqual(result,{confirmed:[],missing:[]})});
test("indeterminate candidate is not converted to a normal finding",()=>{const result=collectReviewedLocalFeatures([candidate({reviewStatus:"indeterminate"})]);assert.equal(result.confirmed.length,0);assert.equal(result.missing[0].reason,"医師が判定困難と判断")});
test("review updates do not mutate the source candidate",()=>{const source=[candidate()];const next=updateLocalFeatureReview(source,"candidate-1","accepted");assert.equal(source[0].reviewStatus,"pending");assert.equal(next[0].reviewStatus,"accepted")});
test("Phase A UI separates image confidence from rule state and has no diagnosis probability",()=>{const source=fs.readFileSync("components/ecg/LocalFeatureReview.tsx","utf8");assert.match(source,/画像候補信頼度/);assert.match(source,/医師確認/);assert.doesNotMatch(source,/診断確率\s*[：:]/)});
test("Phase A keeps cloud analysis and external image transfer disconnected",()=>{const source=fs.readFileSync("components/ecg/LocalFeatureReview.tsx","utf8")+fs.readFileSync("lib/ecg-features/local/review-candidates.js","utf8");assert.doesNotMatch(source,/fetch\s*\(|OpenAI|\/api\/ecg\/analyze/)});
test("result UI contains the rule-based non-diagnostic disclaimer",()=>{const source=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");assert.match(source,/ルールベース推定結果・確定診断ではありません/);assert.match(source,/画像のみから確定診断を行うものではありません/)});
