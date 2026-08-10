import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("shared checkbox labels keep their input at intrinsic size and remain tappable",async()=>{
  const [css,review]=await Promise.all([
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(css,/\.check\s*\{[^}]*min-width:0[^}]*min-height:44px[^}]*overflow-wrap:anywhere[^}]*cursor:pointer/);
  assert.match(css,/\.check>input\[type="checkbox"\]\s*\{[^}]*flex:0 0 17px[^}]*width:17px[^}]*min-height:17px/);
  assert.match(review,/<label className="check"><input type="checkbox" checked=\{brady\.atrialFibrillation\}/);
});

test("AF checkbox remains wired to the existing atrialFibrillation state",async()=>{
  const review=await readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
  assert.match(review,/checked=\{brady\.atrialFibrillation\}/);
  assert.match(review,/atrialFibrillation:e\.target\.checked/);
});
