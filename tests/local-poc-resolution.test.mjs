import test from "node:test";
import assert from "node:assert/strict";
import {detectGrid,extractPolyline,segmentStandard6x2} from "../lib/ecg-digitizer/digitizer-core.js";
import {measureLocalPocLeads} from "../lib/ecg-features/local/local-poc.js";
import {evaluatePocStageGates} from "../data/local-image-analysis/poc-stage-gates.js";

const widths=[1200,1000,800,700,640,600,572,540,500];

test("synthetic 6x2 resolution sweep compares polyline continuity and measurements",()=>{
  for(const width of widths){
    const height=Math.round(width*372/572),gray=syntheticSixByTwo(width,height),grid=detectGrid(gray);
    const gates=evaluatePocStageGates({width,height,layoutType:"six_by_two",gridDetected:grid.detected});
    const leads=segmentStandard6x2(width,height).map(region=>{
      const trace=extractPolyline(gray,region.bounds,{threshold:115,minPointDistance:1});
      const coverage=trace.points.length/Math.max(1,region.bounds.width);
      return {lead:region.lead,points:trace.points,quality:trace.status!=="extracted"?"inadequate":coverage<.55?"limited":"adequate",limitations:trace.limitations};
    });
    const measurements=measureLocalPocLeads(leads,grid,"adequate",gates);
    const extracted=leads.filter(lead=>lead.quality!=="inadequate");
    const continuity=extracted.reduce((sum,lead)=>sum+lead.points.length/(width*.95/2),0)/Math.max(1,extracted.length);
    assert.equal(extracted.length,12,`${width}px should extract all leads`);
    assert.ok(continuity>=.55,`${width}px continuity ${continuity}`);
    const measurementExpected=width>=640;
    if(!measurementExpected)assert.equal(measurements.heartRateBpm,null,`${width}px heart rate gate`);
    if(measurements.heartRateBpm!==null)assert.ok(measurements.heartRateSource!=="indeterminate",`${width}px audited heart-rate source`);
    assert.equal(measurements.rhythmRegularity!=="indeterminate",false,`${width}px RR requires at least three intervals`);
    assert.equal(measurements.qrsWidthCandidate!=="indeterminate",false,`${width}px three-pixel spikes lack auditable QRS onset/offset`);
    if(!measurementExpected)assert.ok(measurements.stDirections.every(item=>item.direction==="indeterminate"),`${width}px ST gate`);
  }
});

function syntheticSixByTwo(width,height){
  const data=new Uint8ClampedArray(width*height).fill(255),gridX=Math.max(4,Math.round(width/60)),gridY=Math.max(4,Math.round(height/60));
  for(let x=0;x<width;x+=gridX)for(let y=0;y<height;y+=1)data[y*width+x]=180;
  for(let y=0;y<height;y+=gridY)for(let x=0;x<width;x+=1)data[y*width+x]=180;
  for(const region of segmentStandard6x2(width,height)){
    const x0=Math.ceil(region.bounds.x),x1=Math.floor(region.bounds.x+region.bounds.width),baseline=Math.round(region.bounds.y+region.bounds.height/2);
    const beatGap=Math.max(36,Math.floor(region.bounds.width/4));
    for(let x=x0;x<x1;x+=1){
      const phase=(x-x0)%beatGap;
      let offset=0;
      if(phase===8)offset=-Math.max(2,Math.round(region.bounds.height*.12));
      else if(phase===9)offset=-Math.max(4,Math.round(region.bounds.height*.28));
      else if(phase===10)offset=-Math.max(2,Math.round(region.bounds.height*.12));
      const y=Math.max(Math.ceil(region.bounds.y)+1,Math.min(Math.floor(region.bounds.y+region.bounds.height)-2,baseline+offset));
      data[y*width+x]=0;
    }
  }
  return {width,height,data};
}
