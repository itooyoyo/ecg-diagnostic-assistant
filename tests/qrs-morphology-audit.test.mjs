import test from "node:test";
import assert from "node:assert/strict";
import {evaluateConnectedBeatSeries,evaluateQrsMorphologyAudit,localPocToRuleContext} from "../lib/ecg-features/local/local-poc.js";

const grid={detected:true,xPeriod:20,yPeriod:20};
function connected({xs=[100,200,300,400,500],width=8,height=40,gridOverlap=.1,continuity=.9,edge=false,text=false}={}){
 const roi={x:0,y:0,width:650,height:120};
 const qrsCandidates=xs.map((x,index)=>({id:index,boundingBox:{x:edge&&index===0?1:x-width/2,y:40,width,height},pixelCount:Math.max(8,Math.round(width*height*.35)),width,height,aspectRatio:width/height,centroid:{x,y:60},leftEndpoint:{x:x-width/2,y:60},rightEndpoint:{x:x+width/2,y:60},top:40,bottom:40+height,localDarkness:180,gridOverlap,candidateType:text&&index===0?"text_candidate":"waveform_candidate"}));
 const segments=qrsCandidates.map(item=>({componentId:item.id,start:{x:item.boundingBox.x,y:60},end:{x:item.boundingBox.x+item.width,y:60},length:item.width,slope:0,verticalRange:item.height,continuityScore:continuity,waveformLikelihood:.9,points:[{x:item.boundingBox.x,y:60},{x:item.boundingBox.x+item.width,y:60}]}));
 const qrsClusters=qrsCandidates.map((item,index)=>({id:index,componentIds:[item.id],boundingBox:item.boundingBox}));
 const rPeakCandidates=qrsCandidates.map((item,index)=>({source:"connected_component",componentId:item.id,clusterId:index,x:item.centroid.x,y:30,amplitude:30,prominence:30,height:item.height,width:item.width,area:item.pixelCount,quality:"limited",limitations:[]}));
 return {roi,candidatePixels:1000,components:qrsCandidates,segments,qrsCandidates,qrsClusters,rPeakCandidates,coverage:.8,gaps:[],quality:"adequate"};
}
function morphology(input,centerline=true){const beat=evaluateConnectedBeatSeries(input,grid,{paperSpeedMmPerSecond:25});return evaluateQrsMorphologyAudit(input,beat,{grid,centerlinePeaks:centerline?input.rPeakCandidates.map(x=>({x:x.x})):[]})}

test("generates explicit QRS geometry features",()=>{const item=morphology(connected())[0];assert.deepEqual(Object.keys(item.geometry),["height","width","area","aspectRatio","verticalSpan","horizontalSpan","density","connectedness"])});
test("generates artifact features separately",()=>{const item=morphology(connected())[0];assert.equal(typeof item.artifactSignals.gridOverlapRatio,"number");assert.equal(item.qrsLikelihoodFeatures.localAbruptChange,true)});
test("evaluates temporal consistency",()=>assert.equal(morphology(connected())[2].temporalConsistency.consistent,true));
test("detects high grid overlap",()=>{const item=morphology(connected({gridOverlap:.85}))[2];assert.equal(item.quality,"inadequate");assert.match(item.limitations.join(" "),/grid overlap/)});
test("flags a text-like candidate without deleting audit data",()=>{const input=connected({text:true});input.qrsCandidates[0].boundingBox={x:10,y:20,width:8,height:12};input.qrsCandidates[0].height=12;input.qrsClusters[0].boundingBox=input.qrsCandidates[0].boundingBox;const item=morphology(input)[0];assert.equal(item.artifactSignals.textOverlapLikelihood,"high");assert.equal(item.quality,"inadequate")});
test("wide QRS morphology is not artifact merely because it is wide",()=>{const item=morphology(connected({width:42,height:42}))[2];assert.notEqual(item.quality,"inadequate");assert.equal(item.artifactSignals.longHorizontal,false)});
test("adequate quality requires multiple independent signals",()=>assert.equal(morphology(connected())[2].quality,"adequate"));
test("limited quality preserves an uncertain candidate",()=>{const item=morphology(connected({continuity:.1}))[2];assert.equal(item.quality,"limited");assert.match(item.limitations.join(" "),/連続性/)});
test("inadequate morphology is rejected before HR construction",()=>{const input=connected({gridOverlap:.9});const audit=morphology(input);const beats=evaluateConnectedBeatSeries(input,grid,{paperSpeedMmPerSecond:25,morphologyAudit:audit});assert.equal(beats.heartRateBpm,null);assert.equal(beats.rejectedCount,5)});
test("does not collapse morphology into a single confidence number",()=>{const item=morphology(connected())[0];assert.equal("confidence" in item,false);assert.ok(item.geometry&&item.prominence&&item.continuity&&item.artifactSignals)});
test("edge artifact is inadequate",()=>assert.equal(morphology(connected({edge:true}))[0].quality,"inadequate"));
test("AF-like irregular intervals remain auditable without diagnosis",()=>{const input=connected({xs:[100,160,320,390,550,620]});const items=morphology(input);assert.ok(items.some(item=>!item.temporalConsistency.consistent));assert.equal("diagnosis" in items[0],false)});
test("morphology audit does not add HR to the 57-rule context",()=>{const measurements={heartRateBpm:null,rhythmRegularity:"indeterminate",qrsWidthCandidate:"indeterminate",stDirections:[],quality:"adequate"};const result=localPocToRuleContext(measurements);assert.equal(result.context.ecg.veryRapidRate,undefined);assert.ok(result.indeterminateFields.includes("heartRateBpm"))});
test("all retained items expose limitations arrays and stable identifiers",()=>{for(const item of morphology(connected())){assert.equal(typeof item.componentId,"string");assert.equal(typeof item.clusterId,"string");assert.ok(Array.isArray(item.limitations))}});
