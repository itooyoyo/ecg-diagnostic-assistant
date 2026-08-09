import test from "node:test";
import assert from "node:assert/strict";
import {createDefaultIntegratedInput} from "../data/integration/defaults.js";
import {buildIntegratedInterpretation} from "../logic/integration/build-integrated-interpretation.js";

function integrated({clinical={},ecg={}}={}){
  const input=createDefaultIntegratedInput();
  Object.assign(input.clinical,clinical);
  Object.assign(input.ecg,ecg);
  return buildIntegratedInterpretation(input);
}

test("marked QT plus bradycardia PVC R-on-T and syncope is emergency",()=>{
  const result=integrated({clinical:{syncope:true},ecg:{qtProlonged:true,qtMarked:true,bradycardia:true,pvc:true,rOnT:true}});
  assert.equal(result.urgency,"emergency");
  assert.equal(result.diagnosticCandidates.find(x=>x.id==="tdp-risk")?.urgency,"emergency");
});

test("marked QT plus R-on-T and syncope is emergency without requiring bradycardia or PVC",()=>{
  const result=integrated({clinical:{syncope:true},ecg:{qtProlonged:true,qtMarked:true,rOnT:true}});
  assert.equal(result.urgency,"emergency");
});

test("QT prolongation alone does not over-escalate to emergency",()=>{
  assert.notEqual(integrated({ecg:{qtProlonged:true}}).urgency,"emergency");
});

test("PVC alone does not over-escalate to emergency",()=>{
  assert.notEqual(integrated({ecg:{pvc:true}}).urgency,"emergency");
});

test("bradycardia alone retains its existing urgency",()=>{
  assert.equal(integrated({ecg:{bradycardia:true}}).urgency,"routine");
});

test("PVC with unknown QT does not treat QT as positive",()=>{
  const result=integrated({ecg:{pvc:true}});
  assert.equal(result.diagnosticCandidates.some(x=>x.id==="tdp-risk"),false);
  assert.notEqual(result.urgency,"emergency");
});

test("established TdP or polymorphic wide tachycardia retains emergency priority",()=>{
  for(const ecg of [{qtProlonged:true,tdp:true},{qtProlonged:true,polymorphicWideTachycardia:true}]){
    const result=integrated({ecg});
    assert.equal(result.urgency,"emergency");
    assert.equal(result.diagnosticCandidates.find(x=>x.id==="tdp-risk")?.urgency,"emergency");
  }
});
