import test from "node:test";
import assert from "node:assert/strict";
import {detectRPeakCandidates,localPocToRuleContext,measureLocalPocLeads} from "../lib/ecg-features/local/local-poc.js";

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
 assert.equal(adapted.context.ecg.wideQrs,false);
 assert.equal(adapted.context.ecg.contiguousStElevation,false);
 assert.deepEqual(adapted.indeterminateFields,["heartRateBpm","rhythmRegularity","qrsWidthCandidate","stDirections"]);
});

test("measurement source is indeterminate when no reliable reference exists",()=>{
 const result=measureLocalPocLeads([],grid,"adequate",gates,null);
 assert.equal(result.heartRateSource,"indeterminate");
 assert.equal(result.rhythmSource,"indeterminate");
});
