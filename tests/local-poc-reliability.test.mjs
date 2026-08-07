import test from "node:test";
import assert from "node:assert/strict";
import {detectRPeakCandidates,localPocToRuleContext,measureLocalPocLeads} from "../lib/ecg-features/local/local-poc.js";
import {extractWaveformCenterline} from "../lib/ecg-digitizer/digitizer-core.js";

const grid={detected:true,xPeriod:10,yPeriod:10},gates={heartRate:true,qrs:true,st:true};
const leadNames=["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
function trace(peaks=[]){return Array.from({length:501},(_,x)=>({x,y:peaks.includes(x)?20:50}))}
function lead(name,peaks=[]){return {lead:name,points:trace(peaks),quality:"adequate",limitations:[]}}

test("long II is preferred for heart rate and rhythm when adequate",()=>{
 const leads=leadNames.map(name=>lead(name,[])),longII=lead("II",[50,150,250,350,450]);
 const result=measureLocalPocLeads(leads,grid,"adequate",gates,longII);
 assert.equal(result.heartRateSource,"long_ii");
 assert.equal(result.rhythmSource,"long_ii");
 assert.equal(result.heartRateBpm,150);
});

test("long II is never included in the twelve ST lead results",()=>{
 const result=measureLocalPocLeads(leadNames.map(name=>lead(name,[50,150,250,350,450])),grid,"adequate",gates,lead("II",[50,150,250,350,450]));
 assert.equal(result.stDirections.length,12);
 assert.deepEqual(result.stDirections.map(item=>item.lead),leadNames);
});

test("refractory period rejects duplicate peak candidates",()=>{
 const candidates=detectRPeakCandidates(trace([50,70,150,250,350]),grid);
 assert.ok(candidates.some(item=>!item.accepted&&item.rejectionReason==="refractory_period"));
});

test("nearby raw candidates are grouped into one QRS cluster",()=>{
 const candidates=detectRPeakCandidates(trace([50,51,52,150,250,350]),grid);
 const firstCluster=candidates.filter(item=>item.clusterId===candidates[0].clusterId);
 assert.ok(firstCluster.length>=3);
 assert.equal(firstCluster.filter(item=>item.accepted).length,1);
 assert.ok(firstCluster.filter(item=>!item.accepted).every(item=>item.rejectionReason==="cluster_duplicate"));
});

test("one QRS cluster never creates multiple accepted peaks",()=>{
 const candidates=detectRPeakCandidates(trace([50,51,52,53,150,250,350]),grid);
 for(const clusterId of new Set(candidates.map(item=>item.clusterId)))assert.ok(candidates.filter(item=>item.clusterId===clusterId&&item.accepted).length<=1);
});

test("cluster representative selection is deterministic",()=>{
 const points=trace([50,51,52,150,250,350]);points[51].y=15;
 const first=detectRPeakCandidates(points,grid),second=detectRPeakCandidates(points,grid);
 assert.deepEqual(first,second);
 assert.equal(first.find(item=>item.clusterId===first[0].clusterId&&item.accepted)?.x,51);
});

test("lower-amplitude T-like deflection is not promoted over R peaks",()=>{
 const points=trace([50,150,250,350]);points[100].y=38;points[200].y=38;points[300].y=38;
 const candidates=detectRPeakCandidates(points,grid);
 assert.equal(candidates.some(item=>[100,200,300].includes(item.x)&&item.accepted),false);
});

test("thin periodic residue is not mass-accepted as R peaks",()=>{
 const points=trace(Array.from({length:35},(_,index)=>40+index*10)),candidates=detectRPeakCandidates(points,grid);
 assert.ok(candidates.filter(item=>item.accepted).length<=2);
 assert.ok(candidates.some(item=>item.artifactClass==="grid_residual_candidate"||item.rejectionReason==="cluster_duplicate"));
});

test("clustering reduces refractory rejection bursts",()=>{
 const candidates=detectRPeakCandidates(trace([50,51,52,150,151,152,250,251,252,350,351,352]),grid);
 assert.ok(candidates.filter(item=>item.rejectionReason==="cluster_duplicate").length>=8);
 assert.ok(candidates.filter(item=>item.rejectionReason==="refractory_period").length<=1);
});

test("R peak detector runs on the improved centerline",()=>{
 const width=500,height=100,data=new Uint8ClampedArray(width*height).fill(255);
 for(let x=0;x<width;x+=1){let y=50;for(const peak of [60,160,260,360,460])if(Math.abs(x-peak)<=2)y=20+Math.abs(x-peak)*15;data[y*width+x]=10}
 const centerline=extractWaveformCenterline({width,height,data},{x:0,y:0,width,height},{threshold:100,grid});
 const candidates=detectRPeakCandidates(centerline.points,grid);
 assert.ok(candidates.some(item=>item.accepted));
});

test("unreliable extreme peak train is not passed as a heart rate",()=>{
 const noisy=Array.from({length:501},(_,x)=>({x,y:x%12===0?20:50})),result=measureLocalPocLeads([lead("II")],grid,"adequate",gates,{lead:"II",points:noisy,quality:"adequate",limitations:[]});
 assert.equal(result.heartRateBpm,null);
 assert.equal(result.rhythmRegularity,"indeterminate");
 assert.ok(result.limitations.includes("R波検出の信頼性不足"));
});

test("insufficient QRS onset and offset evidence remains indeterminate",()=>{
 const result=measureLocalPocLeads([lead("II",[50,150,250,350,450])],grid,"adequate",gates);
 assert.equal(result.qrsWidthCandidate,"indeterminate");
 assert.equal(result.qrsAudit.quality,"limited");
 assert.ok(result.qrsAudit.beats.length>0);
});

test("unclear baseline or J point leaves ST direction indeterminate",()=>{
 const result=measureLocalPocLeads([{lead:"II",points:trace([]),quality:"adequate",limitations:[]}],grid,"adequate",gates);
 assert.equal(result.stDirections[0].direction,"indeterminate");
 assert.equal(result.stDirections[0].jPointCandidate,null);
});

test("field quality gates do not convert unavailable values to normal",()=>{
 const adapted=localPocToRuleContext({heartRateBpm:null,rhythmRegularity:"indeterminate",qrsWidthCandidate:"indeterminate",stDirections:[],quality:"adequate"});
 assert.equal(adapted.context.ecg.wideQrs,undefined);
 assert.equal(adapted.context.ecg.contiguousStElevation,undefined);
 assert.deepEqual(adapted.indeterminateFields,["heartRateBpm","rhythmRegularity","qrsWidthCandidate","stDirections"]);
});

test("measurement source is indeterminate when no reliable reference exists",()=>{
 const result=measureLocalPocLeads([],grid,"adequate",gates,null);
 assert.equal(result.heartRateSource,"indeterminate");
 assert.equal(result.rhythmSource,"indeterminate");
});
