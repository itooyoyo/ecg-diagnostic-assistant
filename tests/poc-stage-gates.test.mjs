import test from "node:test";
import assert from "node:assert/strict";
import {evaluatePocStageGates,getPocLeadDimensions,LOCAL_POC_STAGE_THRESHOLDS} from "../data/local-image-analysis/poc-stage-gates.js";

test("existing high-resolution three by four layout remains supported",()=>{
  const x=evaluatePocStageGates({width:1200,height:900,layoutType:"three_by_four",gridDetected:true});
  assert.equal(x.layout,true);assert.equal(x.segmentation,true);assert.equal(x.polyline,true);assert.equal(x.heartRate,true);assert.equal(x.qrs,true);assert.equal(x.st,true);
});

test("572x372 six by two permits polyline but withholds measurements",()=>{
  const x=evaluatePocStageGates({width:572,height:372,layoutType:"six_by_two",gridDetected:true});
  assert.ok(x.leadPixels.width>270);assert.ok(x.leadPixels.height>58);
  assert.equal(x.polyline,true);assert.equal(x.heartRate,false);assert.equal(x.qrs,false);assert.equal(x.st,false);
});

test("489x284 six by two image permits polyline but keeps measurements indeterminate",()=>{
  const x=evaluatePocStageGates({width:489,height:284,layoutType:"six_by_two",gridDetected:true});
  assert.equal(x.layout,true);assert.equal(x.segmentation,true);assert.equal(x.polyline,true);assert.equal(x.heartRate,false);assert.equal(x.qrs,false);assert.equal(x.st,false);
});

test("unknown layout is distinct from inadequate resolution",()=>{
  const x=evaluatePocStageGates({width:1200,height:900,layoutType:"unknown",gridDetected:true});
  assert.equal(x.layout,false);assert.equal(x.segmentation,false);
});

test("missing grid never fabricates waveform, QRS, or ST",()=>{
  const x=evaluatePocStageGates({width:1200,height:900,layoutType:"six_by_two",gridDetected:false});
  assert.equal(x.polyline,false);assert.equal(x.qrs,false);assert.equal(x.st,false);
});

test("limited image quality permits inspection polyline but blocks automated measurements",()=>{
  const x=evaluatePocStageGates({width:1200,height:900,layoutType:"six_by_two",gridDetected:true,imageQualityAdequate:false});
  assert.equal(x.polyline,true);assert.equal(x.heartRate,false);assert.equal(x.qrs,false);assert.equal(x.st,false);
});

test("stage thresholds are centralized by per-lead sampling needs",()=>{
  assert.ok(LOCAL_POC_STAGE_THRESHOLDS.segmentation.minimumPixelsPerLeadWidth<LOCAL_POC_STAGE_THRESHOLDS.polyline.minimumPixelsPerLeadWidth);
  assert.ok(LOCAL_POC_STAGE_THRESHOLDS.polyline.minimumPixelsPerLeadWidth<LOCAL_POC_STAGE_THRESHOLDS.heartRate.minimumPixelsPerLeadWidth);
  assert.ok(LOCAL_POC_STAGE_THRESHOLDS.polyline.minimumPixelsPerLeadHeight<LOCAL_POC_STAGE_THRESHOLDS.qrs.minimumPixelsPerLeadHeight);
});

test("same canvas width produces different per-lead sampling for 3x4 and 6x2",()=>{
  const three=getPocLeadDimensions(640,360,"three_by_four"),six=getPocLeadDimensions(640,360,"six_by_two");
  assert.ok(six.width>three.width*1.9);assert.ok(three.height>six.height*1.9);
});

test("resolution sweep keeps 6x2 stage decisions stable and explicit",()=>{
  const widths=[1200,1000,800,700,640,600,572,540,500];
  const results=widths.map(width=>evaluatePocStageGates({width,height:Math.round(width*372/572),layoutType:"six_by_two",gridDetected:true}));
  assert.ok(results.every(x=>x.polyline));
  results.forEach((result,index)=>{
    const expected=widths[index]>=640;
    assert.equal(result.heartRate,expected);assert.equal(result.qrs,expected);assert.equal(result.st,expected);
  });
});
