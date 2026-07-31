import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQuality } from "../logic/quality/quality.js";
import { placementWarnings } from "../logic/lead-placement/placement.js";
import { resolveReviewedFinding } from "../logic/interpretation/review.js";
import { validateEcgFile } from "../lib/ecg-image/image-parser.js";
import { suggestAdditionalLeads } from "../logic/lead-placement/additional-leads.js";
import { existsSync } from "node:fs";

const good = {allLeads:true,leadLabels:true,waveformsComplete:true,speedVisible:true,gainVisible:true,gridVisible:true,inFocus:true,lowBlur:true,noGlare:true,noShadow:true,lowTilt:true,lowPerspective:true,multipleBeats:true,privacyChecked:true};
test("all quality checks pass",()=>assert.equal(evaluateQuality(good).grade,"A"));
test("12 leads missing recommends retake",()=>assert.equal(evaluateQuality({...good,allLeads:false}).canAnalyze,false));
test("labels missing allows cautioned analysis",()=>assert.equal(evaluateQuality({...good,leadLabels:false}).grade,"B"));
test("strong glare suggests caution",()=>assert.equal(evaluateQuality({...good,noGlare:false}).grade,"B"));
test("tilt displays caution",()=>assert.equal(evaluateQuality({...good,lowTilt:false}).grade,"B"));
test("privacy reflection warns",()=>assert.equal(evaluateQuality({...good,privacyChecked:false}).grade,"B"));
test("RA-LA concern recommends rerecording",()=>assert.match(placementWarnings({raLaReversal:true,v1v2High:false})[0].message,/再記録/));
test("V1/V2 high concern identifies fourth interspace",()=>assert.match(placementWarnings({raLaReversal:false,v1v2High:true})[0].message,/第4肋間/));
test("accepted AI value is final",()=>assert.equal(resolveReviewedFinding({aiValue:"洞調律",clinicianValue:null,status:"accepted"}),"洞調律"));
test("edited clinician value is final",()=>assert.equal(resolveReviewedFinding({aiValue:72,clinicianValue:80,status:"edited"}),80));
test("rejected value is excluded",()=>assert.equal(resolveReviewedFinding({aiValue:72,clinicianValue:null,status:"rejected"}),null));
test("indeterminate is never treated as normal",()=>assert.equal(resolveReviewedFinding({aiValue:"正常",clinicianValue:null,status:"indeterminate"}),null));
test("JPEG image is accepted",()=>assert.equal(validateEcgFile({type:"image/jpeg",size:1024}).valid,true));
test("PDF is accepted",()=>assert.equal(validateEcgFile({type:"application/pdf",size:1024}).valid,true));
test("unsupported file is rejected",()=>assert.equal(validateEcgFile({type:"text/plain",size:1024}).valid,false));
test("oversized file is rejected",()=>assert.equal(validateEcgFile({type:"image/png",size:21*1024*1024}).valid,false));
const noAdditionalSignals={inferiorStElevation:false,hypotension:false,stDepressionV1toV3:false,suspectedRVOcclusion:false,suspectedPosteriorOcclusion:false};
test("provided precordial lead image exists",()=>assert.equal(existsSync(new URL("../public/images/ecg/lead-placement-precordial.png",import.meta.url)),true));
test("missing optional lead image remains detectable for compact fallback",()=>assert.equal(existsSync(new URL("../public/images/ecg/lead-placement-right-sided.png",import.meta.url)),false));
test("inferior ST elevation suggests right-sided leads",()=>{
  const result=suggestAdditionalLeads({...noAdditionalSignals,inferiorStElevation:true});
  assert.deepEqual(result[0].leads,["V3R","V4R","V5R","V6R"]);
});
test("inferior ST elevation with hypotension prioritizes V4R",()=>{
  const result=suggestAdditionalLeads({...noAdditionalSignals,inferiorStElevation:true,hypotension:true});
  assert.equal(result[0].emphasizedLead,"V4R");
  assert.equal(result[0].urgentContext,true);
});
test("V1 through V3 ST depression suggests posterior leads",()=>{
  const result=suggestAdditionalLeads({...noAdditionalSignals,stDepressionV1toV3:true});
  assert.deepEqual(result[0].leads,["V7","V8","V9"]);
});
test("suspected right coronary occlusion suggests right-sided leads",()=>assert.equal(suggestAdditionalLeads({...noAdditionalSignals,suspectedRVOcclusion:true})[0].type,"right-sided"));
test("suspected posterior occlusion suggests posterior leads",()=>assert.equal(suggestAdditionalLeads({...noAdditionalSignals,suspectedPosteriorOcclusion:true})[0].type,"posterior"));
test("no findings does not routinely suggest additional leads",()=>assert.deepEqual(suggestAdditionalLeads(noAdditionalSignals),[]));
