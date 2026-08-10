import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=await readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
test("R on T is four-state and has no legacy checkbox",()=>{assert.match(source,/R on T<select/);for(const value of ["unentered","absent","present","indeterminate"])assert.match(source,new RegExp(`value="${value}"`));assert.doesNotMatch(source,/type="checkbox"[^>]*checked=\{pvc\.finding\.timing/)});
test("guidance controls expose approved UI connections",()=>{assert.match(source,/value="short"/);assert.match(source,/poor R-wave progression/);assert.match(source,/early_tall/)});
test("education is collapsed keyboard-native and has nine diagrams",()=>{assert.match(source,/<details className="finding-education">/);assert.match(source,/<summary aria-label=/);assert.equal((source.match(/<MiniDiagram title=/g)??[]).length,9);assert.match(source,/P-QRS-ST-T-U/);assert.match(source,/reciprocal change/)});
test("LBBB and R-on-T reminders remain conditional",()=>{assert.match(source,/qrsChoice==="lbbb"/);assert.match(source,/pvc\.clinicianClassification==="pvc"/)});
