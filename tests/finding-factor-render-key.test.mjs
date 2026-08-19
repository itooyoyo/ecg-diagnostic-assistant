import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {groupFindingFactors} from "../logic/interpretation/build-interpretation.js";
import {stFactors} from "../data/st-interpretation/factors.js";

const source=fs.readFileSync(new URL("../components/interpretation/FindingFactors.tsx",import.meta.url),"utf8");

test("factor render key includes section semantic id category and occurrence",()=>{
  assert.match(source,/key=\{`\$\{title\}-\$\{factor\.id\}-\$\{factor\.category\}-\$\{occurrence\}`\}/);
  assert.doesNotMatch(source,/<li key=\{factor\.id\}>/);
});

test("duplicate ST factor remains medically present while render key can distinguish it",()=>{
  const item={possibleFactors:[stFactors.acuteIschemia],mustNotMiss:[stFactors.acuteIschemia]};
  const grouped=groupFindingFactors(item);
  assert.equal(grouped.possible.filter(factor=>factor.id==="st-acute-ischemia").length,2);
});

test("duplicate brady risk factor remains medically present while render key can distinguish it",()=>{
  const bradyRisk={...stFactors.acuteIschemia,id:"brady-risk",category:"conduction"};
  const item={possibleFactors:[bradyRisk],mustNotMiss:[bradyRisk]};
  const grouped=groupFindingFactors(item);
  assert.equal(grouped.possible.filter(factor=>factor.id==="brady-risk").length,2);
});
