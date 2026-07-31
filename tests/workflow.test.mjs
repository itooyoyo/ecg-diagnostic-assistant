import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQuality } from "../logic/quality/quality.js";
import { placementWarnings } from "../logic/lead-placement/placement.js";
import { resolveReviewedFinding } from "../logic/interpretation/review.js";
import { validateEcgFile } from "../lib/ecg-image/image-parser.js";
import { suggestAdditionalLeads } from "../logic/lead-placement/additional-leads.js";
import { existsSync, readFileSync } from "node:fs";
import { classifyTachyarrhythmia } from "../logic/tachyarrhythmia/classify.js";
import { buildInterpretation, groupFindingFactors, resolveInterpretationValue } from "../logic/interpretation/build-interpretation.js";
import { buildTodaysPlan, collectRedFlagCategories } from "../logic/interpretation/build-todays-plan.js";
import { collectAdditionalChecks } from "../logic/interpretation/collect-additional-checks.js";
import { sortByUrgency, urgencyLabel } from "../logic/interpretation/determine-urgency.js";

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
test("provided right-sided lead image exists",()=>assert.equal(existsSync(new URL("../public/images/ecg/lead-placement-right-sided.png",import.meta.url)),true));
test("right-sided guide includes an accessible lightbox and clinical pearl",()=>{
  const source=readFileSync(new URL("../components/ecg/LeadPlacementGuide.tsx",import.meta.url),"utf8");
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/Clinical Pearl/);
  assert.match(source,/V4R.*最重要/s);
});
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
const stableTachy={heartRate:150,qrsMs:90,regularity:"regular",pWave:"unknown",pulsePresent:true,systolicBp:120,hypotension:false,alteredMentalStatus:false,shockSigns:false,ischemicChestPain:false,acuteHeartFailure:false,pulmonaryEdema:false,severeRespiratoryFailure:false,syncope:false,markedPresyncope:false,organHypoperfusion:false,wpwHistory:false,qrsMorphologyVariable:false,priorMi:false,structuralHeartDisease:false,sinusFeatures:false,qtcMs:null,potassium:null,calcium:null,magnesium:null};
test("stable narrow regular tachycardia is classified",()=>assert.equal(classifyTachyarrhythmia(stableTachy).classification,"narrow regular"));
test("narrow irregular lists AF flutter and MAT",()=>{
  const result=classifyTachyarrhythmia({...stableTachy,regularity:"irregular"});
  assert.ok(result.candidates.includes("心房細動"));
  assert.ok(result.candidates.includes("可変伝導心房粗動"));
  assert.ok(result.candidates.includes("多源性心房頻拍"));
});
test("wide regular prioritizes VT",()=>assert.match(classifyTachyarrhythmia({...stableTachy,qrsMs:140}).priority,/心室頻拍/));
test("wide irregular is a red flag",()=>assert.ok(classifyTachyarrhythmia({...stableTachy,qrsMs:140,regularity:"irregular"}).redFlags.includes("wide irregular tachycardia")));
test("tachycardia with hypotension is unstable",()=>assert.equal(classifyTachyarrhythmia({...stableTachy,hypotension:true}).hemodynamics.status,"unstable"));
test("altered mental status suggests synchronized treatment path",()=>assert.match(classifyTachyarrhythmia({...stableTachy,alteredMentalStatus:true}).hemodynamics.message,/同期/));
test("pulseless tachycardia branches to cardiac arrest",()=>{
  const result=classifyTachyarrhythmia({...stableTachy,pulsePresent:false});
  assert.equal(result.hemodynamics.status,"cardiac-arrest");
  assert.doesNotMatch(result.hemodynamics.message,/同期カルディオバージョンを直ちに検討/);
});
test("suspected pre-excited AF warns against AV nodal blockade",()=>{
  const result=classifyTachyarrhythmia({...stableTachy,qrsMs:140,regularity:"irregular",wpwHistory:true});
  assert.ok(result.warnings.some(x=>x.includes("房室結節のみを遮断")));
});
test("unknown P wave is not treated as absent or normal",()=>{
  const result=classifyTachyarrhythmia({...stableTachy,pWave:"unknown"});
  assert.ok(result.missing.some(x=>x.includes("P波")));
});
test("clinician corrected QRS width recalculates narrow to wide",()=>{
  assert.equal(classifyTachyarrhythmia(stableTachy).classification,"narrow regular");
  assert.equal(classifyTachyarrhythmia({...stableTachy,qrsMs:120}).classification,"wide regular");
});
test("clinician corrected regularity recalculates category",()=>{
  assert.equal(classifyTachyarrhythmia(stableTachy).classification,"narrow regular");
  assert.equal(classifyTachyarrhythmia({...stableTachy,regularity:"irregular"}).classification,"narrow irregular");
});
test("sinus tachycardia features prioritize cause search",()=>assert.match(classifyTachyarrhythmia({...stableTachy,sinusFeatures:true}).priority,/原因検索/));
test("wide regular with prior MI strengthens VT support",()=>assert.match(classifyTachyarrhythmia({...stableTachy,qrsMs:140,priorMi:true}).priority,/強く疑う/));
test("missing K Ca Mg are listed as insufficient information",()=>{
  const result=classifyTachyarrhythmia(stableTachy);
  for(const item of ["K","Ca","Mg"])assert.ok(result.missing.includes(item));
});
test("long QT wide irregular rhythm includes TdP",()=>{
  const result=classifyTachyarrhythmia({...stableTachy,qrsMs:140,regularity:"irregular",qtcMs:520});
  assert.equal(result.candidates[0],"QT延長に伴うTdP");
});
test("navigator reference image from user exists",()=>assert.equal(existsSync(new URL("../public/images/robot/navigator-reference.png",import.meta.url)),true));
test("all navigator state images exist",()=>{
  for(const state of ["default","analyzing","warning","complete"]){
    assert.equal(existsSync(new URL(`../public/images/robot/robot-${state}.png`,import.meta.url)),true);
  }
});
test("navigator retains a compact CSS fallback",()=>{
  assert.match(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/\.navigator-robot__head/);
  assert.match(readFileSync(new URL("../components/character/NavigatorRobot.tsx",import.meta.url),"utf8"),/setImageAvailable\(false\)/);
});
test("navigator warning state includes Red Flag text",()=>assert.match(readFileSync(new URL("../components/character/NavigatorRobot.tsx",import.meta.url),"utf8"),/warning: "Red Flag"/));
test("navigator animation respects reduced motion",()=>assert.match(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/@media\(prefers-reduced-motion:reduce\)/));
test("mobile CSS hides duplicate desktop navigator",()=>assert.match(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/navigator-card--desktop\{display:none!important\}/));

const source={organization:"Test Society",title:"Verified source",year:2026,evidenceType:"guideline"};
const factor=(overrides={})=>({id:"factor",label:"要因",category:"other",priority:"medium",supportingInputs:["ST変化"],contradictingInputs:[],requiredInputs:[],isRedFlag:false,sources:[source],...overrides});
const interpretationItem=(overrides={})=>({id:"st-change",title:"ST変化",aiValue:"AI値",clinicianValue:null,status:"accepted",abnormal:true,confidence:null,meaning:[],possibleFactors:[],mustNotMiss:[],additionalChecks:[],nextActions:[],urgency:"same_day",limitations:[],sources:[source],...overrides});

test("systematic interpretation defines all 18 ordered items",()=>{
  const text=readFileSync(new URL("../data/interpretation/items.ts",import.meta.url),"utf8");
  for(const label of ["記録品質","電極装着","心拍数","リズム","P波","PR間隔","QRS幅","QRS形態","電気軸","R波進行","Q波","ST変化","T波","QT・QTc","U波","心室性期外収縮","前回心電図との比較","総合読影"])assert.match(text,new RegExp(label.replace(/[・]/g,"[・]")));
});
test("accepted interpretation uses AI value",()=>assert.equal(resolveInterpretationValue(interpretationItem()),"AI値"));
test("edited interpretation prioritizes clinician value",()=>assert.equal(resolveInterpretationValue(interpretationItem({status:"edited",clinicianValue:"医師値"})),"医師値"));
test("rejected AI finding is excluded",()=>{
  const result=buildInterpretation([interpretationItem({status:"rejected"})])[0];
  assert.equal(result.resolvedValue,null);
  assert.equal(result.excludedFromDecision,true);
  assert.equal(result.abnormal,null);
  assert.deepEqual(buildTodaysPlan([{...result,nextActions:["使用しない"]}]).sameDay,[]);
  assert.deepEqual(collectRedFlagCategories([{...result,urgency:"emergency",mustNotMiss:[factor({isRedFlag:true})]}]),[]);
});
test("indeterminate interpretation is not normal",()=>{
  const result=buildInterpretation([interpretationItem({status:"indeterminate",abnormal:false})])[0];
  assert.equal(result.requiresReview,true);
  assert.equal(result.abnormal,null);
});
test("factors are separated into supported possible and insufficient",()=>{
  const result=groupFindingFactors(interpretationItem({possibleFactors:[
    factor({id:"supported"}),
    factor({id:"possible",requiredInputs:["K"]}),
    factor({id:"insufficient",supportingInputs:[]}),
  ]}));
  assert.deepEqual(result.supported.map(x=>x.id),["supported"]);
  assert.deepEqual(result.possible.map(x=>x.id),["possible"]);
  assert.deepEqual(result.insufficient.map(x=>x.id),["insufficient"]);
});
test("urgency sorting puts Red Flag first",()=>{
  const result=sortByUrgency([
    interpretationItem({id:"routine",urgency:"routine"}),
    interpretationItem({id:"emergency",urgency:"emergency"}),
    interpretationItem({id:"uncertain",urgency:"uncertain"}),
    interpretationItem({id:"same-day",urgency:"same_day"}),
  ]);
  assert.deepEqual(result.map(x=>x.id),["emergency","same-day","uncertain","routine"]);
  assert.equal(urgencyLabel("emergency"),"Red Flag");
});
test("additional checks are deduplicated across abnormal items",()=>{
  const result=collectAdditionalChecks([
    interpretationItem({additionalChecks:["前回心電図","K"]}),
    interpretationItem({id:"t-wave",additionalChecks:["K","症状"]}),
  ]);
  assert.deepEqual(result,["前回心電図","K","症状"]);
});
test("Today's Plan deduplicates shared actions",()=>{
  const result=buildTodaysPlan([
    interpretationItem({id:"st",nextActions:["前回心電図と比較"]}),
    interpretationItem({id:"t",nextActions:["前回心電図と比較","当日再評価"]}),
  ]);
  assert.deepEqual(result.sameDay,["前回心電図と比較","当日再評価"]);
});
test("Today's Plan separates emergency same-day uncertain and routine",()=>{
  const result=buildTodaysPlan([
    interpretationItem({id:"e",urgency:"emergency",nextActions:["緊急確認"]}),
    interpretationItem({id:"s",urgency:"same_day",nextActions:["当日確認"]}),
    interpretationItem({id:"u",urgency:"uncertain",status:"indeterminate",nextActions:["再評価"]}),
    interpretationItem({id:"r",urgency:"routine",abnormal:false,nextActions:["通常確認"]}),
  ]);
  assert.deepEqual(result,{redFlags:["緊急確認"],sameDay:["当日確認"],reevaluate:["再評価"],routine:["通常確認"]});
});
test("Red Flag integration emits only hypothetical categories",()=>{
  const redFlag=factor({id:"fatal-va",label:"致死性不整脈リスク",isRedFlag:true});
  const result=collectRedFlagCategories([interpretationItem({urgency:"emergency",mustNotMiss:[redFlag]})]);
  assert.equal(result[0].label,"致死性不整脈リスク");
  assert.match(result[0].note,/確定.*未実装/);
});
test("interpretation UI includes responsive accordion and source sections",()=>{
  const navigator=readFileSync(new URL("../components/interpretation/InterpretationNavigator.tsx",import.meta.url),"utf8");
  const detail=readFileSync(new URL("../components/interpretation/InterpretationDetailCard.tsx",import.meta.url),"utf8");
  assert.match(navigator,/<details/);
  assert.match(detail,/見逃してはいけない病態/);
  assert.match(detail,/出典/);
  assert.match(readFileSync(new URL("../app/globals.css",import.meta.url),"utf8"),/\.interpretation-item summary/);
});
