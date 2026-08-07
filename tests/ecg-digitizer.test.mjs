import test from "node:test";
import assert from "node:assert/strict";
import { assessImageQuality, detectGrid, detectSupportedLayout, extractPolyline, extractWaveformCenterline, rectifyQuad, rotateGray, segmentStandard3x4, segmentStandard3x4WithLongII, segmentStandard6x2, simplifyPolyline, toGrayscale } from "../lib/ecg-digitizer/digitizer-core.js";

test("skew correction rotates locally without changing the canvas dimensions",()=>{
  const gray={width:5,height:5,data:new Uint8ClampedArray(25).fill(255)};
  gray.data[2*5+1]=0;
  const rotated=rotateGray(gray,90);
  assert.equal(rotated.width,5);
  assert.equal(rotated.height,5);
  assert.ok(rotated.data.includes(0));
});

test("standard 3x4 segmentation returns all 12 unique lead regions",()=>{
  const regions=segmentStandard3x4(1200,900);
  assert.equal(regions.length,12);
  assert.equal(new Set(regions.map(region=>region.lead)).size,12);
  assert.deepEqual(regions.map(region=>region.lead),["I","aVR","V1","V4","II","aVL","V2","V5","III","aVF","V3","V6"]);
});

test("3x4 plus long II segmentation keeps all 12 leads above the rhythm strip",()=>{
  const regions=segmentStandard3x4WithLongII(1600,800,.72);
  assert.equal(regions.length,12);
  assert.ok(regions.every(region=>region.bounds.y+region.bounds.height<800*.75));
});

test("standard 6x2 segmentation returns the correct left and right lead order",()=>{
  const regions=segmentStandard6x2(1200,900);
  assert.equal(regions.length,12);
  assert.deepEqual(regions.map(x=>x.lead),["I","V1","II","V2","III","V3","aVR","V4","aVL","V5","aVF","V6"]);
  assert.ok(regions.every(x=>x.bounds.width===570&&x.bounds.height===142.5));
});

test("layout detector can identify six separated waveform bands",()=>{
  const width=600,height=360,data=new Uint8ClampedArray(width*height).fill(255);
  for(const center of [30,90,150,210,270,330])for(let y=center-1;y<=center+1;y++)for(let x=20;x<width-20;x+=3)data[y*width+x]=0;
  const result=detectSupportedLayout({width,height,data});
  assert.equal(result.layoutType,"six_by_two");
});

test("layout detector identifies a clear three by four structure",()=>{
  const gray=syntheticLayout({width:900,height:360,rows:3});
  assert.equal(detectSupportedLayout(gray).layoutType,"three_by_four");
});

test("layout detector returns unknown when structural evidence is ambiguous",()=>{
  const width=700,height=360,data=new Uint8ClampedArray(width*height).fill(255);
  for(let y=40;y<height;y+=47)for(let x=30;x<width-30;x+=29)data[y*width+x]=0;
  assert.equal(detectSupportedLayout({width,height,data}).layoutType,"unknown");
});

test("layout detector tolerates large top and bottom margins in six by two",()=>{
  const gray=syntheticLayout({width:800,height:500,rows:6,marginRatio:.15});
  assert.equal(detectSupportedLayout(gray).layoutType,"six_by_two");
});

test("layout detector uses row structure instead of aspect-ratio fallback for wide three by four",()=>{
  const gray=syntheticLayout({width:1500,height:360,rows:3});
  assert.equal(detectSupportedLayout(gray).layoutType,"three_by_four");
});

test("partially cropped layout returns unknown instead of guessing",()=>{
  const gray=syntheticLayout({width:800,height:480,rows:6,rightHalf:false});
  assert.equal(detectSupportedLayout(gray).layoutType,"unknown");
});

test("quality gate stops an undersized blank image",()=>{
  const quality=assessImageQuality({width:200,height:120,data:new Uint8ClampedArray(200*120).fill(255)});
  assert.equal(quality.status,"stop");
  assert.ok(quality.reasons.includes("解像度不足"));
});

test("grayscale conversion preserves dimensions",()=>{
  const gray=toGrayscale({width:2,height:1,data:new Uint8ClampedArray([255,0,0,255,0,255,0,255])});
  assert.equal(gray.width,2);assert.equal(gray.height,1);assert.equal(gray.data.length,2);assert.ok(gray.data[0]!==gray.data[1]);
});

test("grid detector returns periodic candidates for a synthetic grid",()=>{
  const width=160,height=120,data=new Uint8ClampedArray(width*height).fill(255);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x%10===0||y%10===0)data[y*width+x]=80;
  const grid=detectGrid({width,height,data});
  assert.equal(grid.detected,true);assert.ok(grid.xPeriod);assert.ok(grid.yPeriod);
});

test("waveform extractor returns a polyline and baseline for a visible trace",()=>{
  const width=240,height=100,data=new Uint8ClampedArray(width*height).fill(255);
  for(let x=0;x<width;x++){const y=Math.round(50+15*Math.sin(x/12));data[y*width+x]=10;}
  const result=extractPolyline({width,height,data},{x:0,y:0,width,height},{threshold:80});
  assert.equal(result.status,"extracted");assert.ok(result.points.length>50);assert.ok(result.baselineY!=null);
});

test("an unrecognizable lead fails independently with no fabricated points",()=>{
  const width=100,height=60,data=new Uint8ClampedArray(width*height).fill(255);
  const result=extractPolyline({width,height,data},{x:0,y:0,width,height});
  assert.equal(result.status,"indeterminate");assert.deepEqual(result.points,[]);
});

test("quad rectification produces a new rectangular grayscale image",()=>{
  const width=20,height=20,data=new Uint8ClampedArray(width*height).map((_,index)=>index%256);
  const result=rectifyQuad({width,height,data},[{x:2,y:1},{x:17,y:2},{x:18,y:18},{x:1,y:17}]);
  assert.ok(result.width>0);assert.ok(result.height>0);assert.equal(result.data.length,result.width*result.height);
});

test("polyline simplification retains endpoints",()=>{
  const points=Array.from({length:20},(_,x)=>({x,y:10}));const simplified=simplifyPolyline(points,4);
  assert.deepEqual(simplified[0],points[0]);assert.deepEqual(simplified.at(-1),points.at(-1));assert.ok(simplified.length<points.length);
});

test("centerline keeps at most one tracked value per column",()=>{
  const gray=syntheticTrace({width:240,height:100});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  assert.equal(new Set(result.points.map(point=>point.x)).size,result.points.length);
});

test("centerline prefers waveform continuity at a grid crossing",()=>{
  const gray=syntheticTrace({width:240,height:100,horizontalGrid:true});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  const middle=result.points.filter(point=>point.x>80&&point.x<160);
  assert.ok(middle.filter(point=>Math.abs(point.y-50)<=3).length>middle.length*.8);
});

test("centerline preserves a steep QRS transition",()=>{
  const gray=syntheticTrace({width:240,height:100,qrs:true});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  assert.ok(Math.max(...result.points.map(point=>Math.abs(point.y-50)))>=28);
});

test("centerline excludes a calibration pulse by morphology",()=>{
  const gray=syntheticTrace({width:240,height:100,calibration:true});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  assert.ok(result.audit.roi.x>20);
  assert.ok(result.points.every(point=>point.x>=result.audit.roi.x));
});

test("centerline excludes a dense lead-label-like block",()=>{
  const gray=syntheticTrace({width:240,height:100,label:true});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  assert.ok(result.audit.roi.x>12);
});

test("centerline records missing segments and tracking coverage",()=>{
  const gray=syntheticTrace({width:240,height:100,missing:[100,119]});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  assert.ok(result.audit.missingSegments.some(segment=>segment.length>=20));
  assert.equal(result.audit.trackingCoverage,result.audit.trackedColumns/result.audit.totalColumns);
  assert.ok(result.audit.trackingCoverage<1);
});

test("centerline does not over-smooth QRS amplitude",()=>{
  const gray=syntheticTrace({width:240,height:100,qrs:true});
  const result=extractWaveformCenterline(gray,{x:0,y:0,width:240,height:100},{threshold:100,grid:{xPeriod:10,yPeriod:10}});
  const amplitude=Math.max(...result.points.map(point=>Math.abs(point.y-50)));
  assert.ok(amplitude>=28);
});

function syntheticLayout({width,height,rows,marginRatio=.04,rightHalf=true}){
  const data=new Uint8ClampedArray(width*height).fill(255),margin=height*marginRatio,usable=height-2*margin;
  for(let row=0;row<rows;row+=1){
    const center=Math.round(margin+(row+.5)*usable/rows);
    for(let y=center-2;y<=center+2;y+=1)for(let x=20;x<width-20;x+=3){
      if(rightHalf||x<width/2)data[y*width+x]=0;
    }
  }
  return {width,height,data};
}

function syntheticTrace({width,height,horizontalGrid=false,qrs=false,calibration=false,label=false,missing=null}){
  const data=new Uint8ClampedArray(width*height).fill(255);
  if(horizontalGrid)for(let x=0;x<width;x+=1)data[20*width+x]=80;
  for(let x=0;x<width;x+=1){
    if(missing&&x>=missing[0]&&x<=missing[1])continue;
    let y=50;
    if(qrs&&x>=116&&x<=124)y=[50,42,30,15,8,15,30,42,50][x-116];
    data[y*width+x]=10;
  }
  if(calibration)for(let x=8;x<=20;x+=1)for(let y=15;y<=70;y+=1)if(x===8||x===20||y===15)data[y*width+x]=0;
  if(label)for(let x=4;x<=14;x+=1)for(let y=10;y<=35;y+=3)data[y*width+x]=0;
  return {width,height,data};
}
