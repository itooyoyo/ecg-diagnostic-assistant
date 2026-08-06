import test from "node:test";
import assert from "node:assert/strict";
import {evaluatePocStageGates,LOCAL_POC_STAGE_THRESHOLDS} from "../data/local-image-analysis/poc-stage-gates.js";

test("existing three by four layout remains supported",()=>{const x=evaluatePocStageGates({width:1200,height:900,layoutType:"three_by_four",gridDetected:true});assert.deepEqual(x,{layout:true,segmentation:true,polyline:true,heartRate:true,qrs:true,st:true})});
test("six by two layout reaches every stage at adequate resolution",()=>{const x=evaluatePocStageGates({width:1200,height:900,layoutType:"six_by_two",gridDetected:true});assert.equal(x.st,true)});
test("489x284 six by two image permits layout and regions but stops waveform estimation",()=>{const x=evaluatePocStageGates({width:489,height:284,layoutType:"six_by_two",gridDetected:true});assert.equal(x.layout,true);assert.equal(x.segmentation,true);assert.equal(x.polyline,false);assert.equal(x.heartRate,false);assert.equal(x.qrs,false);assert.equal(x.st,false)});
test("unknown layout is distinct from inadequate resolution",()=>{const x=evaluatePocStageGates({width:1200,height:900,layoutType:"unknown",gridDetected:true});assert.equal(x.layout,false);assert.equal(x.segmentation,false)});
test("missing grid never fabricates QRS or ST",()=>{const x=evaluatePocStageGates({width:1200,height:900,layoutType:"six_by_two",gridDetected:false});assert.equal(x.polyline,false);assert.equal(x.qrs,false);assert.equal(x.st,false)});
test("stage thresholds are centralized and ordered",()=>{assert.ok(LOCAL_POC_STAGE_THRESHOLDS.layoutMinimumWidthPx<LOCAL_POC_STAGE_THRESHOLDS.polylineMinimumWidthPx);assert.ok(LOCAL_POC_STAGE_THRESHOLDS.segmentationMinimumHeightPx<LOCAL_POC_STAGE_THRESHOLDS.polylineMinimumHeightPx)});
