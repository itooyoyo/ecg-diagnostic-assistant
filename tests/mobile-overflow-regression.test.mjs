import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ecgRuleRegistry} from "../data/rule-engine/rule-registry.js";

const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");

test("ST lead picker uses bounded mobile columns",()=>{
  assert.match(css,/\.compact-lead-picker,\.st-shape-fieldset\{width:100%;min-width:0;max-width:100%\}/);
  assert.match(css,/@media\(max-width:720px\)[\s\S]*?\.compact-lead-picker\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css,/@media\(max-width:340px\)\{\.compact-lead-picker\{grid-template-columns:1fr\}\}/);
});

test("ST shape and education SVGs cannot establish intrinsic page width",()=>{
  assert.match(css,/\.finding-guide-body>svg,\.st-shape-wave,\.wct-education-grid svg\{min-width:0;max-width:100%;height:auto;overflow:hidden\}/);
});

test("ST differential table becomes a wrapping mobile table",()=>{
  assert.match(css,/\.st-differential-education table\{width:100%;min-width:0;table-layout:fixed/);
  assert.match(css,/\.st-differential-education th,\.st-differential-education td\{padding:6px;overflow-wrap:anywhere;word-break:break-word\}/);
});

test("advanced and result sections contain long mobile content",()=>{
  assert.match(css,/\.advanced-analysis__body,\.advanced-analysis__body>\.card,\.clinical-results\{min-width:0;max-width:100%\}/);
  assert.match(css,/\.clinical-results code\{overflow-wrap:anywhere;word-break:break-word\}/);
});

test("eleven item guide and Wide QRS flow wrap within mobile cards",()=>{
  assert.match(css,/\.systematic-eleven-nav\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);overflow-x:visible\}/);
  assert.match(css,/\.tachy-flow\{flex-wrap:wrap;overflow-x:visible\}/);
});

test("medical rule registry remains unchanged",()=>assert.equal(ecgRuleRegistry.length,59));
