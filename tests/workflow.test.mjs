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
import { createDefaultStInput } from "../data/st-interpretation/defaults.js";
import { interpretStChanges } from "../logic/st-interpretation/interpret-st.js";
import { createDefaultTWaveInput } from "../data/t-wave-interpretation/defaults.js";
import { interpretTWave } from "../logic/t-wave-interpretation/interpret-t-wave.js";
import { createDefaultQtInput } from "../data/qt-interpretation/defaults.js";
import { calculateQtc, interpretQt } from "../logic/qt-interpretation/interpret-qt.js";
import { createDefaultVentricularEctopyInput } from "../data/ventricular-ectopy/defaults.js";
import { interpretVentricularEctopy } from "../logic/ventricular-ectopy/interpret-ventricular-ectopy.js";
import { createDefaultConductionInput } from "../data/conduction-interpretation/defaults.js";
import { interpretConduction } from "../logic/conduction-interpretation/interpret-conduction.js";

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
const stableTachy={heartRate:150,qrsMs:90,regularity:"regular",pWave:"unknown",avRelationship:"unknown",deltaWave:false,shortPr:false,fibrillatoryWaves:false,flutterWaves:false,flutterConduction:"unknown",pulsePresent:true,systolicBp:120,hypotension:false,alteredMentalStatus:false,shockSigns:false,ischemicChestPain:false,acuteHeartFailure:false,pulmonaryEdema:false,severeRespiratoryFailure:false,syncope:false,markedPresyncope:false,organHypoperfusion:false,wpwHistory:false,qrsMorphologyVariable:false,priorMi:false,structuralHeartDisease:false,sinusFeatures:false,qtcMs:null,potassium:null,calcium:null,magnesium:null};
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
test("altered mental status triggers emergency pathway without energy output",()=>{const r=classifyTachyarrhythmia({...stableTachy,alteredMentalStatus:true});assert.equal(r.hemodynamics.status,"unstable");assert.doesNotMatch(r.hemodynamics.message,/J|ジュール|用量/)});
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
test("tachy algorithm preserves QRS regularity P wave AV sequence",()=>{const r=classifyTachyarrhythmia(stableTachy);assert.deepEqual(r.diagnosticReasoning.slice(0,4).map(x=>x.slice(0,1)),["①","②","③","④"])});
test("tachy identifies sinus tachycardia reasoning",()=>{const r=classifyTachyarrhythmia({...stableTachy,pWave:"present",sinusFeatures:true});assert.match(r.priority,/洞性頻脈/)});
test("tachy identifies AF from irregular RR absent P and fibrillatory waves",()=>{const r=classifyTachyarrhythmia({...stableTachy,regularity:"irregular",pWave:"absent",fibrillatoryWaves:true});assert.match(r.priority,/心房細動候補/)});
test("tachy identifies flutter and conduction ratio",()=>{const r=classifyTachyarrhythmia({...stableTachy,flutterWaves:true,flutterConduction:"2:1"});assert.match(r.priority,/心房粗動候補（2:1伝導）/)});
test("tachy identifies AVNRT or AVRT from retrograde P",()=>{const r=classifyTachyarrhythmia({...stableTachy,pWave:"retrograde"});assert.match(r.priority,/AVNRT／AVRT/)});
test("tachy identifies atrial tachycardia candidate",()=>{const r=classifyTachyarrhythmia({...stableTachy,pWave:"present"});assert.match(r.priority,/心房頻拍候補/)});
test("tachy wide with AV dissociation supports VT candidate",()=>{const r=classifyTachyarrhythmia({...stableTachy,qrsMs:140,avRelationship:"av-dissociation"});assert.match(r.priority,/VT候補/);assert.ok(r.redFlags.some(x=>x.includes("房室解離")))});
test("tachy pre-excited AF from delta wave lists AV nodal blocker cautions",()=>{const r=classifyTachyarrhythmia({...stableTachy,qrsMs:140,regularity:"irregular",deltaWave:true});assert.equal(r.preexcitedAf,true);for(const drug of ["ベラパミル","ジゴキシン","β遮断薬"])assert.ok(r.contraindicatedDrugCandidates.includes(drug))});
test("tachy indeterminate QRS is explicit",()=>{const r=classifyTachyarrhythmia({...stableTachy,qrsMs:null});assert.equal(r.qrsClass,"indeterminate")});
test("tachy plan contains requested bedside checks",()=>{const r=classifyTachyarrhythmia(stableTachy);for(const item of ["症状・血圧・意識・SpO₂を再評価","K・Ca・Mgを確認","12誘導心電図を再検","心エコーと前回心電図を確認"])assert.ok(r.plan.includes(item))});
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

const withSt=(changes,context={})=>{const input=createDefaultStInput();for(const [lead,direction,amplitudeMm,morphology="horizontal"] of changes){const m=input.leadMeasurements.find(x=>x.lead===lead);Object.assign(m,{direction,amplitudeMm,morphology,measurementPoint:"j_point",baselineReference:"tp_segment"});}Object.assign(input.clinical,context);return input};
test("ST: no finding is not routinely escalated",()=>assert.equal(interpretStChanges(createDefaultStInput()).overallClassification,"no_significant_change"));
test("ST: single mild elevation is not a contiguous group",()=>assert.equal(interpretStChanges(withSt([["II","elevation",1]])).contiguousLeadGroups.length,0));
test("ST: contiguous inferior elevation with symptoms is a red flag",()=>assert.ok(interpretStChanges(withSt([["II","elevation",1],["III","elevation",1]],{ischemicSymptoms:true})).redFlags.length));
test("ST: reciprocal change increases red flag evidence",()=>{const x=withSt([["II","elevation",1],["III","elevation",1]]);x.reciprocalFinding.status="present";assert.ok(interpretStChanges(x).redFlags.some(v=>v.includes("reciprocal")))});
test("ST: absent reciprocal change does not exclude elevation",()=>assert.equal(interpretStChanges(withSt([["II","elevation",1],["III","elevation",1]])).overallClassification,"st_elevation"));
test("ST: inferior elevation suggests V4R",()=>assert.equal(interpretStChanges(withSt([["II","elevation",1],["III","elevation",1]])).suggestedAdditionalLeads[0].emphasizedLead,"V4R"));
test("ST: inferior elevation plus hypotension is emergency",()=>assert.equal(interpretStChanges(withSt([["II","elevation",1],["III","elevation",1]],{hypotension:true})).urgency,"emergency"));
test("ST: V1-V3 horizontal depression suggests V7-V9",()=>assert.deepEqual(interpretStChanges(withSt([["V1","depression",1],["V2","depression",1],["V3","depression",1]])).suggestedAdditionalLeads[0].leads,["V7","V8","V9"]));
test("ST: high R in V1-V3 can suggest posterior leads",()=>assert.equal(interpretStChanges(withSt([],{highRWaveV1toV3:true})).suggestedAdditionalLeads[0].type,"posterior"));
test("ST: broad depression plus aVR elevation is high risk, not left-main diagnosis",()=>{const x=withSt([["I","depression",1],["II","depression",1],["III","depression",1],["aVL","depression",1],["aVF","depression",1],["V5","depression",1],["aVR","elevation",1]],{ischemicSymptoms:true});const r=interpretStChanges(x);assert.ok(r.redFlags.some(v=>v.includes("aVR")));assert.ok(r.limitations.every(v=>!v.includes("左主幹部確定")))});
test("ST: LBBB routes to secondary repolarization classification",()=>{const x=withSt([["II","elevation",1],["III","elevation",1]]);x.qrsContext="lbbb";assert.equal(interpretStChanges(x).overallClassification,"secondary_repolarization_change")});
test("ST: pacing routes to secondary repolarization classification",()=>{const x=withSt([["II","elevation",1],["III","elevation",1]]);x.qrsContext="paced";assert.equal(interpretStChanges(x).overallClassification,"secondary_repolarization_change")});
test("ST: V1/V2 placement concern makes result indeterminate",()=>{const x=createDefaultStInput();x.preconditions.v1v2HighPlacementConcern=true;x.preconditions.placementConcern=true;assert.equal(interpretStChanges(x).overallClassification,"indeterminate")});
test("ST: dynamic change raises emergency urgency",()=>{const x=createDefaultStInput();x.dynamicChange=true;assert.equal(interpretStChanges(x).urgency,"emergency")});
test("ST: physician amplitude correction recalculates threshold",()=>{const low=withSt([["II","elevation",0.5],["III","elevation",0.5]]);assert.equal(interpretStChanges(low).contiguousLeadGroups.length,0);for(const m of low.leadMeasurements.filter(x=>["II","III"].includes(x.lead)))m.amplitudeMm=1;assert.ok(interpretStChanges(low).contiguousLeadGroups.length)});
test("ST: uncertain J point is indeterminate",()=>{const x=withSt([["II","elevation",1]]);x.leadMeasurements.find(m=>m.lead==="II").measurementPoint="unknown";assert.equal(interpretStChanges(x).overallClassification,"indeterminate")});
test("ST: missing demographics prevents V2-V3 threshold application",()=>assert.equal(interpretStChanges(withSt([["V2","elevation",3],["V3","elevation",3]])).overallClassification,"indeterminate"));
test("ST: poor image quality is never normal",()=>{const x=createDefaultStInput();x.preconditions.imageQualityAdequate=false;assert.equal(interpretStChanges(x).overallClassification,"indeterminate")});
test("ST: module includes physician lead controls and mobile stacking",()=>{const ui=readFileSync(new URL("../components/interpretation/STChangeModule.tsx",import.meta.url),"utf8");const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");assert.match(ui,/12誘導 ST計測/);assert.match(ui,/Reciprocal change/);assert.match(css,/@media\(max-width:720px\).*st-lead-grid/s)});
test("ST: plan actions remain deduplicated",()=>{const r=interpretStChanges(withSt([["II","elevation",1],["III","elevation",1]],{ischemicSymptoms:true}));assert.equal(r.nextActions.length,new Set(r.nextActions).size)});

const withT=(changes,clinical={},extra={})=>{const x=createDefaultTWaveInput();for(const [lead,morphology,polarity="negative",symmetry="symmetric"] of changes)Object.assign(x.leadMeasurements.find(m=>m.lead===lead),{morphology,polarity,symmetry});Object.assign(x.clinical,clinical);Object.assign(x,extra);return x};
test("T wave: normal input remains normal and compact",()=>assert.equal(interpretTWave(createDefaultTWaveInput()).overallClassification,"normal"));
test("T wave: isolated V1 inversion is normal variant candidate without red flag",()=>{const r=interpretTWave(withT([["V1","inverted"]]));assert.ok(r.normalVariantCandidates.length);assert.equal(r.redFlags.length,0)});
test("T wave: new symmetric V2-V4 inversion with chest pain flags Wellens",()=>{const r=interpretTWave(withT([["V2","inverted"],["V3","inverted"],["V4","inverted"]],{chestPainHistory:true},{newComparedWithPrior:true}));assert.equal(r.wellensPattern,"type_b_candidate");assert.ok(r.redFlags.length)});
test("T wave: biphasic V2-V3 while pain free does not exclude Wellens",()=>{const r=interpretTWave(withT([["V2","biphasic","biphasic_positive_negative"],["V3","biphasic","biphasic_positive_negative"]],{chestPainHistory:true,currentlyPainFree:true}));assert.equal(r.wellensPattern,"type_a_candidate")});
test("T wave: negative troponin does not remove Wellens candidate",()=>{const r=interpretTWave(withT([["V2","biphasic","biphasic_positive_negative"],["V3","biphasic","biphasic_positive_negative"]],{chestPainHistory:true,troponinNegative:true}));assert.ok(r.wellensPattern.startsWith("type_"))});
test("T wave: anterior hyperacute pattern with symptoms is red flag",()=>{const r=interpretTWave(withT([["V2","hyperacute","positive"],["V3","hyperacute","positive"]],{ischemicSymptoms:true},{newComparedWithPrior:true}));assert.ok(r.redFlags.some(x=>x.includes("hyperacute")))});
test("T wave: generalized peaked pattern with renal failure suggests electrolyte factor",()=>{const leads=["I","II","III","aVL","aVF","V4"].map(l=>[l,"peaked","positive"]);const r=interpretTWave(withT(leads,{renalFailure:true}));assert.ok(r.possibleFactors.some(x=>x.category==="electrolyte"))});
test("T wave: peaked pattern plus wide QRS raises emergency urgency",()=>{const leads=["I","II","III","aVL","aVF","V4"].map(l=>[l,"peaked","positive"]);const r=interpretTWave(withT(leads,{renalFailure:true},{qrsContext:"wide"}));assert.equal(r.urgency,"emergency")});
test("T wave: giant negative pattern with apical hypertrophy retains structural candidate",()=>{const r=interpretTWave(withT([["V4","giant_negative"],["V5","giant_negative"]],{apicalHypertrophyKnown:true}));assert.ok(r.possibleFactors.some(x=>x.category==="structural"))});
test("T wave: giant negative pattern with neurologic symptoms is red flag",()=>assert.equal(interpretTWave(withT([["V4","giant_negative"]],{neurologicSymptoms:true})).urgency,"emergency"));
test("T wave: macroscopic alternans warns of ventricular arrhythmia risk",()=>{const r=interpretTWave(withT([["II","alternans","positive"]],{macroscopicAlternationPersistent:true,qrsAlternansExcluded:true}));assert.ok(r.redFlags.some(x=>x.includes("alternans")))});
test("T wave: flat T plus U wave and low K suggests electrolyte factor",()=>{const r=interpretTWave(withT([["V4","flattened","flat"]],{uWavePresent:true,potassium:2.9}));assert.ok(r.possibleFactors.some(x=>x.category==="electrolyte"))});
test("T wave: LBBB supports secondary repolarization candidate",()=>assert.ok(interpretTWave(withT([["V5","inverted"]],{}, {qrsContext:"lbbb"})).possibleFactors.some(x=>x.category==="conduction")));
test("T wave: RBBB with V1-V3 inversion supports secondary change",()=>assert.ok(interpretTWave(withT([["V1","inverted"],["V2","inverted"],["V3","inverted"]],{}, {qrsContext:"rbbb"})).warnings.some(x=>x.includes("二次性"))));
test("T wave: deleting negative morphology removes inversion logic",()=>{const x=withT([["V2","inverted"]]);Object.assign(x.leadMeasurements.find(m=>m.lead==="V2"),{morphology:"normal",polarity:"positive"});assert.equal(interpretTWave(x).overallClassification,"normal")});
test("T wave: correcting biphasic direction recalculates Wellens",()=>{const x=withT([["V2","biphasic","biphasic_negative_positive"],["V3","biphasic","biphasic_negative_positive"]],{chestPainHistory:true});assert.equal(interpretTWave(x).wellensPattern,"not_supported");for(const m of x.leadMeasurements.filter(m=>["V2","V3"].includes(m.lead)))m.polarity="biphasic_positive_negative";assert.equal(interpretTWave(x).wellensPattern,"type_a_candidate")});
test("T wave: unclear T end shows QT measurement limitation",()=>{const x=withT([["V4","inverted"]]);x.associatedQtStatus="difficult";x.leadMeasurements.find(m=>m.lead==="V4").endClear=false;assert.ok(interpretTWave(x).warnings.some(x=>x.includes("QT測定困難")))});
test("T wave: absent QT input is missing information",()=>assert.ok(interpretTWave(withT([["V4","inverted"]])).missingInformation.includes("QT／QTc")));
test("T wave: poor image quality is indeterminate",()=>{const x=createDefaultTWaveInput();x.preconditions.imageQualityAdequate=false;assert.equal(interpretTWave(x).overallClassification,"indeterminate")});
test("T wave: chronic prior change does not trigger new ischemic red flag",()=>{const r=interpretTWave(withT([["V4","hyperacute","positive"],["V5","hyperacute","positive"]],{ischemicSymptoms:true},{newComparedWithPrior:false,priorEcgAvailable:true}));assert.equal(r.redFlags.length,0)});
test("T wave: integrated plan entries are deduplicated",()=>{const r=interpretTWave(withT([["V2","hyperacute","positive"],["V3","hyperacute","positive"]],{ischemicSymptoms:true},{newComparedWithPrior:true}));assert.equal(r.nextActions.length,new Set(r.nextActions).size)});
test("T wave: mobile CSS stacks lead map and detail controls",()=>{const ui=readFileSync(new URL("../components/interpretation/TWaveModule.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");assert.match(ui,/誘導分布・形態/);assert.match(css,/@media\(max-width:720px\).*t-wave-lead-grid/s)});

test("QT: normal QT remains routine",()=>{const r=interpretQt(createDefaultQtInput());assert.equal(r.classification,"normal");assert.equal(r.urgency,"routine")});
test("QT: 480 ms at 60 bpm is prolonged",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:480,rrMs:1000,heartRate:60,formula:"fridericia"});assert.equal(interpretQt(x).classification,"prolonged")});
test("QT: 500 ms is marked prolongation and red flag",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:500,rrMs:1000,heartRate:60});const r=interpretQt(x);assert.equal(r.classification,"marked_prolongation");assert.ok(r.redFlags.length)});
test("QT: 320 ms is short QT candidate",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:320,rrMs:1000,heartRate:60});assert.equal(interpretQt(x).classification,"short")});
test("QT: low calcium supports electrolyte cause",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:490,rrMs:1000,heartRate:60,lowCa:true});assert.ok(interpretQt(x).possibleFactors.some(f=>f.category==="electrolyte"))});
test("QT: low potassium adds TdP risk",()=>{const x=createDefaultQtInput();x.lowK=true;assert.ok(interpretQt(x).tdpRiskFactors.includes("低K"))});
test("QT: high calcium with short QT supports electrolyte cause",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:320,rrMs:1000,heartRate:60,highCa:true});assert.ok(interpretQt(x).possibleFactors.some(f=>f.category==="electrolyte"))});
test("QT: prolonging drug is represented as a cause",()=>{const x=createDefaultQtInput();x.qtProlongingDrug=true;assert.ok(interpretQt(x).possibleFactors.some(f=>f.category==="drug"))});
test("QT: bradycardia contributes to TdP risk",()=>{const x=createDefaultQtInput();Object.assign(x,{heartRate:45,rrMs:1333,bradycardia:true});assert.ok(interpretQt(x).tdpRiskFactors.includes("徐脈"))});
test("QT: U wave overlap creates measurement limitation",()=>{const x=createDefaultQtInput();x.measurementStatus="u_wave_overlap";const r=interpretQt(x);assert.equal(r.classification,"indeterminate");assert.ok(r.warnings.some(v=>v.includes("QT測定制限")))});
test("QT: Bazett and Fridericia differ during tachycardia",()=>{const b=calculateQtc(350,500,120,"bazett"),f=calculateQtc(350,500,120,"fridericia");assert.notEqual(b,f);assert.ok(b>f)});
test("QT: physician correction recalculates classification",()=>{const x=createDefaultQtInput();assert.equal(interpretQt(x).classification,"normal");Object.assign(x,{qtMs:500,rrMs:1000,heartRate:60});assert.equal(interpretQt(x).classification,"marked_prolongation")});
test("QT: overlapping risk factors raise TdP priority",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:510,rrMs:1000,heartRate:60,syncope:true,lowK:true,lowMg:true,qtProlongingDrug:true});assert.equal(interpretQt(x).tdpRiskLevel,"high")});
test("QT: abnormal plan includes required checks without duplicates",()=>{const x=createDefaultQtInput();Object.assign(x,{qtMs:490,rrMs:1000,heartRate:60});const r=interpretQt(x);for(const item of ["K","Mg","Ca","服薬","連続モニター","再ECG","失神歴"])assert.ok(r.additionalChecks.includes(item));assert.equal(r.additionalChecks.length,new Set(r.additionalChecks).size)});
test("QT: mobile module stacks controls",()=>{const ui=readFileSync(new URL("../components/interpretation/QtModule.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");assert.match(ui,/QT測定・医師修正/);assert.match(ui,/Clinical Pearl/);assert.match(css,/@media\(max-width:720px\).*qt-grid/s)});

const pvcInput=(patch={},finding={})=>{const x=createDefaultVentricularEctopyInput();Object.assign(x,{clinicianClassification:"pvc",pvcCountInTracing:1,totalAnalyzedBeats:10,...patch});Object.assign(x.finding,finding);return x};
const pvcContext=(qtPatch={},stPatch={},tPatch={})=>({qtResult:{...interpretQt(createDefaultQtInput()),...qtPatch},stResult:{...interpretStChanges(createDefaultStInput()),...stPatch},tWaveResult:{...interpretTWave(createDefaultTWaveInput()),...tPatch}});
test("PVC: no ectopy remains compact normal",()=>assert.equal(interpretVentricularEctopy(createDefaultVentricularEctopyInput()).overallClassification,"no_ventricular_ectopy"));
test("PVC: isolated monomorphic asymptomatic PVC is low complexity",()=>{const r=interpretVentricularEctopy(pvcInput());assert.equal(r.overallClassification,"isolated_low_complexity");assert.equal(r.redFlags.length,0)});
test("PVC: bigeminy is complex ectopy",()=>assert.equal(interpretVentricularEctopy(pvcInput({}, {ectopyType:"bigeminy"})).overallClassification,"complex_ventricular_ectopy"));
test("PVC: trigeminy is complex ectopy",()=>assert.equal(interpretVentricularEctopy(pvcInput({}, {ectopyType:"trigeminy"})).overallClassification,"complex_ventricular_ectopy"));
test("PVC: couplet is repetitive",()=>assert.equal(interpretVentricularEctopy(pvcInput({consecutiveBeats:2},{ectopyType:"couplet"})).repetitiveEctopy,true));
test("PVC: triplet routes to tachyarrhythmia reevaluation",()=>{const r=interpretVentricularEctopy(pvcInput({consecutiveBeats:3},{ectopyType:"triplet"}));assert.equal(r.overallClassification,"ventricular_tachyarrhythmia_candidate");assert.ok(r.nextActions.some(x=>x.includes("頻脈性不整脈")))});
test("PVC: polymorphic morphology increases complexity",()=>assert.equal(interpretVentricularEctopy(pvcInput({}, {morphology:"polymorphic"})).overallClassification,"complex_ventricular_ectopy"));
test("PVC: syncope is red flag",()=>assert.equal(interpretVentricularEctopy(pvcInput({syncope:true})).urgency,"emergency"));
test("PVC: hemodynamic instability is prioritized",()=>assert.match(interpretVentricularEctopy(pvcInput({hemodynamicInstability:true})).nextActions[0],/循環動態/));
test("PVC: repetitive ectopy plus acute ST change raises ischemic red flag",()=>{const r=interpretVentricularEctopy(pvcInput({consecutiveBeats:2}),pvcContext({}, {overallClassification:"st_elevation"}));assert.ok(r.redFlags.some(x=>x.includes("ST変化")))});
test("PVC: QT prolongation is integrated",()=>assert.equal(interpretVentricularEctopy(pvcInput(),pvcContext({classification:"prolonged"})).associatedQtProlongation,true));
test("PVC: early beat on T wave becomes R on T candidate",()=>assert.equal(interpretVentricularEctopy(pvcInput({pvcStartMs:300},{timing:"r_on_t_candidate"})).rOnTCandidate,true));
test("PVC: unknown T end limits R on T classification",()=>{const r=interpretVentricularEctopy(pvcInput({pvcStartMs:300,tEndMs:null},{timing:"r_on_t_candidate"}));assert.equal(r.rOnTCandidate,null);assert.ok(r.warnings.some(x=>x.includes("判定制限")))});
test("PVC: correcting U/T boundary recalculates R on T",()=>{const x=pvcInput({pvcStartMs:410,tEndMs:null,uStartMs:400},{timing:"r_on_t_candidate"});assert.equal(interpretVentricularEctopy(x).rOnTCandidate,null);x.tEndMs=420;x.uStartMs=450;assert.equal(interpretVentricularEctopy(x).rOnTCandidate,true)});
test("PVC: polymorphic with low K and low Mg has high urgency",()=>assert.equal(interpretVentricularEctopy(pvcInput({lowK:true,lowMg:true},{morphology:"polymorphic"})).urgency,"emergency"));
test("PVC: PAC with aberrancy is not confirmed as PVC",()=>{const x=pvcInput();x.clinicianClassification="pac_aberrancy";assert.equal(interpretVentricularEctopy(x).pvcPresent,false)});
test("PVC: paced beat is not confirmed as PVC",()=>{const x=pvcInput();x.clinicianClassification="paced";assert.equal(interpretVentricularEctopy(x).pvcPresent,false)});
test("PVC: artifact is indeterminate rather than normal",()=>{const x=pvcInput();x.clinicianClassification="artifact";assert.equal(interpretVentricularEctopy(x).overallClassification,"indeterminate")});
test("PVC: short tracing ratio is not labeled long-term burden",()=>{const r=interpretVentricularEctopy(pvcInput({pvcCountInTracing:2,totalAnalyzedBeats:20}));assert.equal(r.estimatedRecordingFrequencyPercent,10);assert.ok(r.warnings.some(x=>x.includes("長時間PVC burdenではありません")))});
test("PVC: high long-term burden with reduced LVEF suggests cardiomyopathy",()=>{const r=interpretVentricularEctopy(pvcInput({longTermBurdenAssessed:true,longTermBurdenPercent:12,lvefReduced:true}));assert.ok(r.possibleFactors.some(x=>x.id==="pvc-pvc-cm"))});
test("PVC: physician deletion removes PVC logic",()=>{const x=pvcInput();x.clinicianClassification="none";assert.equal(interpretVentricularEctopy(x).findings.length,0)});
test("PVC: morphology correction recalculates complexity",()=>{const x=pvcInput();assert.equal(interpretVentricularEctopy(x).overallClassification,"isolated_low_complexity");x.finding.morphology="polymorphic";assert.equal(interpretVentricularEctopy(x).overallClassification,"complex_ventricular_ectopy")});
test("PVC: plan checks contain no duplicates",()=>{const r=interpretVentricularEctopy(pvcInput());assert.equal(r.additionalChecks.length,new Set(r.additionalChecks).size)});
test("PVC: mobile CSS stacks card and preserves labeled timeline",()=>{const ui=readFileSync(new URL("../components/interpretation/VentricularEctopyModule.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");assert.match(ui,/先行QRS、ST、T波、U波とPVC開始位置/);assert.match(css,/@media\(max-width:720px\).*pvc-grid/s)});

test("conduction: normal QRS remains normal",()=>assert.equal(interpretConduction(createDefaultConductionInput()).classification,"normal_qrs"));
test("conduction: RBBB morphology is classified",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:130,v1RsrPrime:true,wideTerminalS_I:true,wideTerminalS_V6:true});assert.equal(interpretConduction(x).classification,"rbbb_candidate")});
test("conduction: LBBB morphology is classified",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:140,v1DeepWideS:true,broadNotchedR_V5V6:true,lateralQWaveAbsent:true});assert.equal(interpretConduction(x).classification,"lbbb_candidate")});
test("conduction: LAFB candidate integrates left axis",()=>{const x=createDefaultConductionInput();Object.assign(x,{axis:"left",inferiorLeadsRsPattern:true,leadI_qRPattern:true});assert.equal(interpretConduction(x).classification,"lafb_candidate")});
test("conduction: LPFB candidate integrates right axis",()=>{const x=createDefaultConductionInput();Object.assign(x,{axis:"right",leadI_rSPattern:true,inferior_qRPattern:true});assert.equal(interpretConduction(x).classification,"lpfb_candidate")});
test("conduction: wide QRS without BBB morphology is IVCD candidate",()=>{const x=createDefaultConductionInput();x.qrsDurationMs=130;assert.equal(interpretConduction(x).classification,"nonspecific_ivcd_candidate")});
test("conduction: indeterminate QRS width is not normal",()=>{const x=createDefaultConductionInput();x.qrsDurationMs=null;assert.equal(interpretConduction(x).classification,"indeterminate")});
test("conduction: RBBB limits ordinary ST interpretation",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:130,v1RsrPrime:true,wideTerminalS_I:true,wideTerminalS_V6:true});const c=interpretConduction(x),st=createDefaultStInput();st.qrsContext=c.qrsContext;st.leadMeasurements.find(m=>m.lead==="II").direction="elevation";st.leadMeasurements.find(m=>m.lead==="II").amplitudeMm=1;assert.equal(c.stTInterpretationLimited,true);assert.ok(interpretStChanges(st).warnings.some(v=>v.includes("二次性")))});
test("conduction: LBBB adds ST assessment limitation pearl",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:140,v1DeepWideS:true,broadNotchedR_I:true,lateralQWaveAbsent:true});const r=interpretConduction(x);assert.ok(r.clinicalPearls.some(v=>v.includes("ST評価は困難")))});
test("conduction: bifascicular candidate is a red flag",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:130,v1RsrPrime:true,wideTerminalS_I:true,wideTerminalS_V6:true,axis:"left",inferiorLeadsRsPattern:true,leadI_qRPattern:true});assert.equal(interpretConduction(x).classification,"bifascicular_candidate");assert.equal(interpretConduction(x).urgency,"emergency")});
test("conduction: wide QRS plus syncope is red flag",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:130,syncope:true});assert.ok(interpretConduction(x).redFlags.some(v=>v.includes("失神")))});
test("conduction: wide QRS plus high potassium is red flag",()=>{const x=createDefaultConductionInput();Object.assign(x,{qrsDurationMs:130,highPotassium:true});assert.ok(interpretConduction(x).redFlags.some(v=>v.includes("高K")))});
test("conduction: physician correction recalculates classification",()=>{const x=createDefaultConductionInput();assert.equal(interpretConduction(x).classification,"normal_qrs");x.clinicianClassification="lbbb_candidate";assert.equal(interpretConduction(x).classification,"lbbb_candidate")});
test("conduction: mobile CSS stacks module controls",()=>{const ui=readFileSync(new URL("../components/interpretation/ConductionModule.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");assert.match(ui,/RBBB・LBBB形態/);assert.match(css,/@media\(max-width:720px\).*conduction-grid/s)});
