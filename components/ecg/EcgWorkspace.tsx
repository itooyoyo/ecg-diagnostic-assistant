"use client";

import { useEffect, useMemo, useState } from "react";
import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { evaluateQuality } from "@/logic/quality/quality.js";
import { NavigatorRobot, STEP_NAVIGATOR_COMMENTS, type NavigatorState } from "@/components/character/NavigatorRobot";
import { LeadPlacementGuide } from "@/components/ecg/LeadPlacementGuide";
import { TachyarrhythmiaModule } from "@/components/ecg/TachyarrhythmiaModule";
import { BradyarrhythmiaModule } from "@/components/ecg/BradyarrhythmiaModule";
import { ElectrolyteModule } from "@/components/ecg/ElectrolyteModule";
import { InterpretationNavigator } from "@/components/interpretation/InterpretationNavigator";
import { InterpretationSummary } from "@/components/interpretation/InterpretationSummary";
import { interpretationItems } from "@/data/interpretation/items";
import { buildInterpretation } from "@/logic/interpretation/build-interpretation.js";
import { buildTodaysPlan, collectRedFlagCategories } from "@/logic/interpretation/build-todays-plan.js";
import type { Regularity } from "@/logic/tachyarrhythmia/classify.js";
import type { EcgInterpretationItem } from "@/types/interpretation";
import type { StInterpretationInput } from "@/types/st-interpretation";
import { createDefaultStInput } from "@/data/st-interpretation/defaults.js";
import { interpretStChanges } from "@/logic/st-interpretation/interpret-st.js";
import type { TWaveInterpretationInput } from "@/types/t-wave-interpretation";
import { createDefaultTWaveInput } from "@/data/t-wave-interpretation/defaults.js";
import { interpretTWave } from "@/logic/t-wave-interpretation/interpret-t-wave.js";
import type { QtInterpretationInput } from "@/types/qt-interpretation";
import { createDefaultQtInput } from "@/data/qt-interpretation/defaults.js";
import { interpretQt } from "@/logic/qt-interpretation/interpret-qt.js";
import type { VentricularEctopyInput } from "@/types/ventricular-ectopy";
import { createDefaultVentricularEctopyInput } from "@/data/ventricular-ectopy/defaults.js";
import { interpretVentricularEctopy } from "@/logic/ventricular-ectopy/interpret-ventricular-ectopy.js";
import type { ConductionInput } from "@/types/conduction-interpretation";
import { createDefaultConductionInput } from "@/data/conduction-interpretation/defaults.js";
import { interpretConduction } from "@/logic/conduction-interpretation/interpret-conduction.js";
import type { BradyInput } from "@/types/bradyarrhythmia";
import { createDefaultBradyInput } from "@/data/bradyarrhythmia/defaults.js";
import { interpretBradyarrhythmia } from "@/logic/bradyarrhythmia/interpret-brady.js";
import type { ElectrolyteInput } from "@/types/electrolyte-interpretation";
import { createDefaultElectrolyteInput } from "@/data/electrolyte-interpretation/defaults.js";
import { interpretElectrolytes } from "@/logic/electrolyte-interpretation/interpret-electrolytes.js";
import { IntegratedInterpretation } from "@/components/integration/IntegratedInterpretation";
import type { IntegratedInput } from "@/types/integrated-interpretation";
import { createDefaultIntegratedInput } from "@/data/integration/defaults.js";
import { buildIntegratedInterpretation } from "@/logic/integration/build-integrated-interpretation.js";
import type { TachyResult } from "@/logic/tachyarrhythmia/classify.js";

const qualityItems = [
  ["allLeads","12誘導がすべて写っている"],["leadLabels","誘導名が読める"],["waveformsComplete","波形が途中で切れていない"],
  ["speedVisible","紙送り速度が確認できる"],["gainVisible","感度が確認できる"],["gridVisible","グリッドが確認できる"],
  ["inFocus","画像のピントが合っている"],["lowBlur","手ぶれが少ない"],["noGlare","強い反射がない"],
  ["noShadow","影で波形が隠れていない"],["lowTilt","画像の傾きが強くない"],["lowPerspective","遠近歪みが強くない"],
  ["multipleBeats","複数拍が確認できる"],["privacyChecked","患者氏名やIDの映り込みを確認した"],
] as const;
const findings = [
  {key:"heartRate",label:"心拍数",ai:"72 bpm"},{key:"rhythm",label:"リズム",ai:"洞調律"},{key:"regularity",label:"規則性",ai:"整"},
  {key:"pr",label:"PR間隔",ai:"164 ms"},{key:"qrs",label:"QRS幅",ai:"92 ms"},{key:"qtc",label:"QTc",ai:"425 ms"},
  {key:"axis",label:"電気軸",ai:"正常軸"},{key:"rwave",label:"R波進行",ai:"保たれる"},{key:"st",label:"ST変化",ai:"明らかでない"},
];

export function EcgWorkspace() {
  const [quality,setQuality]=useState<Record<string,boolean>>(()=>Object.fromEntries(qualityItems.map(([k])=>[k,false])));
  const qualityResult=useMemo(()=>evaluateQuality(quality),[quality]);
  const [hasPlacementWarning,setHasPlacementWarning]=useState(false);
  const [hasTachyRedFlag,setHasTachyRedFlag]=useState(false);
  const [tachyResult,setTachyResult]=useState<TachyResult|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [fileError,setFileError]=useState("");
  const [review,setReview]=useState<Record<string,{status:string,value:string}>>(()=>Object.fromEntries(findings.map(f=>[f.key,{status:"accepted",value:f.ai}])));
  const confirmedValue=(key:string,aiValue:string)=>review[key]?.status==="accepted"?aiValue:review[key]?.status==="edited"?review[key].value:null;
  const confirmedHeartRate=numberFromFinding(confirmedValue("heartRate","72 bpm"));
  const confirmedQrs=numberFromFinding(confirmedValue("qrs","92 ms"));
  const confirmedRegularity:Regularity=confirmedValue("regularity","整")==="整"?"regular":confirmedValue("regularity","整")==="不整"?"irregular":"unknown";
  const [systematicItems,setSystematicItems]=useState<EcgInterpretationItem[]>(()=>interpretationItems);
  const [stInput,setStInput]=useState<StInterpretationInput>(()=>createDefaultStInput());
  const [conductionInput,setConductionInput]=useState<ConductionInput>(()=>createDefaultConductionInput());
  const conductionResult=useMemo(()=>interpretConduction(conductionInput),[conductionInput]);
  const integratedStInput=useMemo<StInterpretationInput>(()=>({...stInput,qrsContext:conductionResult.qrsContext==="other"?"other":conductionResult.qrsContext}),[stInput,conductionResult.qrsContext]);
  const stResult=useMemo(()=>interpretStChanges(integratedStInput),[integratedStInput]);
  const [tWaveInput,setTWaveInput]=useState<TWaveInterpretationInput>(()=>createDefaultTWaveInput());
  const [qtInput,setQtInput]=useState<QtInterpretationInput>(()=>createDefaultQtInput());
  const qtResult=useMemo(()=>interpretQt(qtInput),[qtInput]);
  const integratedTWaveInput=useMemo<TWaveInterpretationInput>(()=>({...tWaveInput,qrsContext:conductionResult.qrsContext==="other"?"wide":conductionResult.qrsContext,associatedQrsAbnormality:conductionResult.stTInterpretationLimited,associatedQtStatus:qtResult.classification==="indeterminate"?(qtInput.measurementStatus==="u_wave_overlap"?"u_wave_overlap":"difficult"):"confirmed"}),[tWaveInput,qtResult.classification,qtInput.measurementStatus,conductionResult]);
  const tWaveResult=useMemo(()=>interpretTWave(integratedTWaveInput,{stResult}),[integratedTWaveInput,stResult]);
  const [pvcInput,setPvcInput]=useState<VentricularEctopyInput>(()=>createDefaultVentricularEctopyInput());
  const pvcResult=useMemo(()=>interpretVentricularEctopy(pvcInput,{stResult,tWaveResult,qtResult}),[pvcInput,stResult,tWaveResult,qtResult]);
  const [bradyInput,setBradyInput]=useState<BradyInput>(()=>createDefaultBradyInput());
  const integratedBradyInput=useMemo<BradyInput>(()=>({...bradyInput,ventricularRateBpm:confirmedHeartRate,qrsWidthMs:confirmedQrs,bundleBranchBlock:conductionResult.stTInterpretationLimited,qtMarkedProlongation:qtResult.classification==="marked_prolongation",rOnTCandidate:pvcResult.rOnTCandidate===true}),[bradyInput,confirmedHeartRate,confirmedQrs,conductionResult.stTInterpretationLimited,qtResult.classification,pvcResult.rOnTCandidate]);
  const bradyResult=useMemo(()=>interpretBradyarrhythmia(integratedBradyInput),[integratedBradyInput]);
  const [electrolyteInput,setElectrolyteInput]=useState<ElectrolyteInput>(()=>createDefaultElectrolyteInput());
  const integratedElectrolyteInput=useMemo<ElectrolyteInput>(()=>({...electrolyteInput,peakedT:electrolyteInput.peakedT||tWaveResult.overallClassification==="peaked_t_wave",flattenedT:electrolyteInput.flattenedT||tWaveResult.overallClassification==="flattened_t_wave",invertedT:electrolyteInput.invertedT||tWaveResult.overallClassification==="t_wave_inversion",stDepression:electrolyteInput.stDepression||integratedStInput.leadMeasurements.some(x=>x.direction==="depression"),wideQrs:electrolyteInput.wideQrs||conductionResult.wideQrs===true,bradycardia:electrolyteInput.bradycardia||bradyResult.classification!=="no_bradycardia"&&bradyResult.classification!=="indeterminate",qtShort:electrolyteInput.qtShort||qtResult.classification==="short",qtProlonged:electrolyteInput.qtProlonged||["borderline_prolonged","prolonged","marked_prolongation"].includes(qtResult.classification),pvc:electrolyteInput.pvc||pvcResult.pvcPresent===true,frequentPvc:electrolyteInput.frequentPvc||pvcResult.overallClassification==="frequent_pvc"||pvcResult.repetitiveEctopy===true,rOnT:electrolyteInput.rOnT||pvcResult.rOnTCandidate===true}),[electrolyteInput,tWaveResult.overallClassification,integratedStInput.leadMeasurements,conductionResult.wideQrs,bradyResult.classification,qtResult.classification,pvcResult]);
  const electrolyteResult=useMemo(()=>interpretElectrolytes(integratedElectrolyteInput),[integratedElectrolyteInput]);
  const [integratedOverride,setIntegratedOverride]=useState(()=>createDefaultIntegratedInput().override);
  const integratedInput=useMemo<IntegratedInput>(()=>{
    const x=createDefaultIntegratedInput();
    const st=(lead:string,direction:"elevation"|"depression")=>integratedStInput.leadMeasurements.some(m=>m.lead===lead&&m.direction===direction&&m.clinicianConfirmed);
    const tMorph=(morphology:string,leads?:string[])=>integratedTWaveInput.leadMeasurements.some(m=>m.clinicianConfirmed&&m.morphology===morphology&&(!leads||leads.includes(m.lead)));
    Object.assign(x.quality,{allLeads:quality.allLeads,leadLabels:quality.leadLabels,speedVisible:quality.speedVisible,gainVisible:quality.gainVisible,imageAdequate:qualityResult.grade!=="C",baselineStable:integratedStInput.preconditions.baselineStable,noiseAcceptable:integratedStInput.preconditions.noiseAcceptable,placementConcern:hasPlacementWarning||integratedStInput.preconditions.placementConcern,v1v2High:integratedStInput.preconditions.v1v2HighPlacementConcern,jPointClear:!integratedStInput.leadMeasurements.some(m=>m.measurementPoint==="unknown"),tEndClear:qtInput.tEndKnown,pWaveClear:integratedBradyInput.pWavePresence!=="indeterminate"});
    Object.assign(x.clinical,{alteredMentalStatus:integratedBradyInput.adverseSigns.alteredMentalStatus===true,shock:integratedBradyInput.adverseSigns.shockSigns===true,hypotension:integratedBradyInput.adverseSigns.hypotension===true||integratedStInput.clinical.hypotension,severeHypoxia:integratedBradyInput.adverseSigns.hypoxemia===true,ischemicChestPain:integratedBradyInput.adverseSigns.ischemicChestDiscomfort===true||integratedStInput.clinical.ischemicSymptoms===true,chestPainHistory:integratedTWaveInput.clinical.chestPainHistory,currentlyPainFree:integratedTWaveInput.clinical.currentlyPainFree===true,acuteHeartFailure:integratedBradyInput.adverseSigns.acuteHeartFailure===true,syncope:integratedBradyInput.adverseSigns.syncope===true||integratedTWaveInput.clinical.syncope,dyspnea:integratedTWaveInput.clinical.dyspnea,neurologicSymptoms:integratedTWaveInput.clinical.neurologicSymptoms,poorPerfusion:integratedBradyInput.adverseSigns.poorPerfusion===true,jvd:integratedStInput.clinical.jugularVenousDistension,noPulmonaryCongestion:integratedStInput.clinical.pulmonaryCongestionAbsent,priorEcgAvailable:integratedStInput.priorEcgAvailable||integratedTWaveInput.priorEcgAvailable,dynamicChange:integratedStInput.dynamicChange===true||integratedTWaveInput.leadMeasurements.some(m=>m.dynamicChange===true),troponinNegative:integratedTWaveInput.clinical.troponinNegative,apicalHypertrophy:integratedTWaveInput.clinical.apicalHypertrophyKnown});
    Object.assign(x.ecg,{inferiorStElevation:["II","III","aVF"].filter(l=>st(l,"elevation")).length>=2,contiguousStElevation:stResult.overallClassification==="st_elevation"||stResult.overallClassification==="mixed",reciprocalChange:integratedStInput.reciprocalFinding.status==="present",stDepressionV1toV3:["V1","V2","V3"].some(l=>st(l,"depression")),tallRV1toV3:integratedStInput.clinical.highRWaveV1toV3,diffuseStDepression:integratedStInput.leadMeasurements.filter(m=>m.direction==="depression"&&m.clinicianConfirmed).length>=6,avrElevation:st("aVR","elevation"),v1Elevation:st("V1","elevation"),hyperacuteT:tMorph("hyperacute"),wellensMorphology:tWaveResult.wellensPattern.startsWith("type_"),newTInversion:tWaveResult.overallClassification==="t_wave_inversion"&&tWaveResult.newComparedWithPrior===true,pathologicQWave:integratedTWaveInput.clinical.pathologicQWaves,giantNegativeT:tMorph("giant_negative"),qtProlonged:["borderline_prolonged","prolonged","marked_prolongation"].includes(qtResult.classification),qtMarked:qtResult.classification==="marked_prolongation",qtShort:qtResult.classification==="short",uWaveOverlap:qtInput.measurementStatus==="u_wave_overlap",tWaveAlternans:tMorph("alternans"),pvc:pvcResult.pvcPresent===true,polymorphicPvc:pvcInput.finding.morphology==="polymorphic",rOnT:pvcResult.rOnTCandidate===true,pause:integratedBradyInput.pausePresent===true,wideQrs:conductionResult.wideQrs===true,rbbb:conductionResult.classification==="rbbb_candidate",lbbb:conductionResult.classification==="lbbb_candidate",rightAxis:conductionInput.axis==="right",peakedT:tWaveResult.overallClassification==="peaked_t_wave",pWaveAbsent:integratedBradyInput.pWavePresence==="absent",prProlonged:integratedBradyInput.prPattern==="prolonged_constant",qrsProlonged:conductionResult.wideQrs===true,flattenedT:tWaveResult.overallClassification==="flattened_t_wave",prominentU:integratedElectrolyteInput.prominentU,quProlonged:integratedElectrolyteInput.quProlongation,stShort:integratedElectrolyteInput.stShort,stProlonged:integratedElectrolyteInput.stProlonged,bradycardia:bradyResult.clinicallyRelevantBradycardia==="present",mobitzI:bradyResult.classification==="mobitz_i_candidate",mobitzII:bradyResult.classification==="mobitz_ii_candidate",twoToOneBlock:bradyResult.classification==="two_to_one_av_block",highGradeBlock:bradyResult.classification==="high_grade_av_block_candidate",completeBlock:bradyResult.classification==="complete_av_block_candidate",avDissociation:bradyResult.classification==="av_dissociation_uncertain",atrialRate:integratedBradyInput.atrialRateBpm,ventricularRate:integratedBradyInput.ventricularRateBpm,wideEscape:integratedBradyInput.escapeRhythm==="ventricular_escape"&&Boolean(integratedBradyInput.qrsWidthMs&&integratedBradyInput.qrsWidthMs>=120),wideTachycardia:tachyResult?.active===true&&tachyResult.qrsClass==="wide",irregularTachycardia:tachyResult?.classification==="wide irregular",polymorphicWideTachycardia:tachyResult?.overallClassification?.includes("torsades")||false,preexcitation:tachyResult?.preexcitedAf===true,vt:tachyResult?.overallClassification==="ventricular_tachycardia_candidate",tdp:tachyResult?.overallClassification?.includes("torsades")||false});
    x.confirmedModules=["quality","clinician-review","ST","T-wave","QT","PVC","conduction","bradyarrhythmia","tachyarrhythmia","electrolyte"];
    x.indeterminateFindingIds=systematicItems.filter(i=>i.status==="indeterminate").map(i=>i.id);x.rejectedFindingIds=systematicItems.filter(i=>i.status==="rejected").map(i=>i.id);x.override=integratedOverride;return x;
  },[quality,qualityResult.grade,hasPlacementWarning,integratedStInput,stResult,integratedTWaveInput,tWaveResult,qtInput,qtResult,pvcInput,pvcResult,conductionInput,conductionResult,integratedBradyInput,bradyResult,integratedElectrolyteInput,tachyResult,systematicItems,integratedOverride]);
  const integratedResult=useMemo(()=>buildIntegratedInterpretation(integratedInput),[integratedInput]);
  const interpretedItems=useMemo(()=>systematicItems.map((item)=>item.id==="st-change"?{...item,aiValue:stResult.overallClassification,clinicianValue:item.status==="accepted"?null:stResult.overallClassification,abnormal:stResult.overallClassification==="no_significant_change"?false:stResult.overallClassification==="indeterminate"?null:true,urgency:stResult.urgency,meaning:stResult.contiguousLeadGroups.length?stResult.contiguousLeadGroups:["誘導別ST計測を臨床背景と併せて評価します。"],possibleFactors:stResult.possibleFactors,mustNotMiss:stResult.mustNotMiss,additionalChecks:stResult.additionalChecks,nextActions:stResult.nextActions,limitations:stResult.limitations,sources:stResult.sources}:item.id==="t-wave"?{...item,aiValue:tWaveResult.overallClassification,clinicianValue:item.status==="accepted"?null:tWaveResult.overallClassification,abnormal:tWaveResult.overallClassification==="normal"?false:tWaveResult.overallClassification==="indeterminate"?null:true,urgency:tWaveResult.urgency,meaning:[...tWaveResult.affectedLeadGroups,...tWaveResult.warnings],possibleFactors:tWaveResult.possibleFactors,mustNotMiss:tWaveResult.mustNotMiss,additionalChecks:tWaveResult.additionalChecks,nextActions:tWaveResult.nextActions,limitations:tWaveResult.limitations,sources:tWaveResult.sources}:item.id==="qt-qtc"?{...item,aiValue:`QTc ${qtResult.qtcMs??"判定不能"} ms (${qtInput.formula})`,clinicianValue:item.status==="accepted"?null:qtResult.qtcMs,abnormal:qtResult.classification==="normal"?false:qtResult.classification==="indeterminate"?null:true,urgency:qtResult.urgency,meaning:[qtResult.classification,...qtResult.warnings],possibleFactors:qtResult.possibleFactors,mustNotMiss:qtResult.mustNotMiss,additionalChecks:qtResult.additionalChecks,nextActions:qtResult.nextActions,limitations:qtResult.limitations,sources:qtResult.sources}:item.id==="ventricular-ectopy"?{...item,aiValue:pvcResult.overallClassification,clinicianValue:item.status==="accepted"?null:pvcResult.overallClassification,abnormal:pvcResult.pvcPresent,urgency:pvcResult.urgency,meaning:pvcResult.warnings,possibleFactors:pvcResult.possibleFactors,mustNotMiss:pvcResult.mustNotMiss,additionalChecks:pvcResult.additionalChecks,nextActions:pvcResult.nextActions,limitations:pvcResult.limitations,sources:pvcResult.sources}:item),[systematicItems,stResult,tWaveResult,qtResult,qtInput.formula,pvcResult]);
  const bradyIntegratedItems=useMemo(()=>interpretedItems.map((item)=>item.id!=="rhythm"?item:{...item,aiValue:bradyResult.classification,clinicianValue:item.status==="accepted"?null:bradyResult.classification,abnormal:bradyResult.classification==="no_bradycardia"?false:bradyResult.classification==="indeterminate"?null:true,urgency:bradyResult.urgency,meaning:[...bradyResult.diagnosticReasoning,...bradyResult.warnings],possibleFactors:bradyResult.possibleFactors,mustNotMiss:bradyResult.mustNotMiss,additionalChecks:bradyResult.additionalChecks,nextActions:bradyResult.nextActions,limitations:bradyResult.limitations,sources:bradyResult.sources}),[interpretedItems,bradyResult]);
  const conductionIntegratedItems=useMemo(()=>bradyIntegratedItems.map((item)=>item.id!=="qrs-morphology"?item:{...item,aiValue:conductionResult.classification,clinicianValue:item.status==="accepted"?null:conductionResult.classification,abnormal:conductionResult.classification==="normal_qrs"?false:conductionResult.classification==="indeterminate"?null:true,urgency:conductionResult.urgency,meaning:[...conductionResult.clinicalPearls,...conductionResult.warnings],possibleFactors:conductionResult.possibleFactors,mustNotMiss:conductionResult.mustNotMiss,additionalChecks:conductionResult.additionalChecks,nextActions:conductionResult.nextActions,limitations:conductionResult.limitations,sources:conductionResult.sources}),[bradyIntegratedItems,conductionResult]);
  const builtSystematicItems=useMemo(()=>buildInterpretation(conductionIntegratedItems),[conductionIntegratedItems]);
  const electrolytePlanItem=useMemo<EcgInterpretationItem>(()=>({id:"electrolyte-module",title:"電解質ECG",aiValue:"電解質ECG評価",clinicianValue:null,status:"accepted",abnormal:Object.values(electrolyteResult.assessments).some(x=>x.level==="suspicious"||x.level==="possible"),confidence:null,urgency:electrolyteResult.urgency,meaning:electrolyteResult.redFlags,possibleFactors:electrolyteResult.possibleFactors,mustNotMiss:electrolyteResult.mustNotMiss,additionalChecks:electrolyteResult.additionalChecks,nextActions:electrolyteResult.nextActions,limitations:electrolyteResult.limitations,sources:electrolyteResult.sources}),[electrolyteResult]);
  const planItems=useMemo(()=>[...builtSystematicItems,electrolytePlanItem],[builtSystematicItems,electrolytePlanItem]);
  const interpretationPlan=useMemo(()=>buildTodaysPlan(planItems),[planItems]);
  const interpretationRedFlags=useMemo(()=>collectRedFlagCategories(planItems),[planItems]);
  const hasClinicianEdits=Object.values(review).some(item=>item.status!=="accepted");
  const hasBradyRedFlag=bradyResult.redFlags.length>0;
  const hasElectrolyteRedFlag=electrolyteResult.redFlags.length>0;
  const hasIntegratedRedFlag=["resuscitation","emergency"].includes(integratedResult.urgency);
  const navigatorState:NavigatorState=hasPlacementWarning||hasTachyRedFlag||hasBradyRedFlag||hasElectrolyteRedFlag||hasIntegratedRedFlag?"warning":file?"analyzing":hasClinicianEdits?"complete":"default";
  const tachyActive=confirmedHeartRate!=null&&confirmedHeartRate>=100;
  const navigatorComment=hasIntegratedRedFlag?"重要所見があります。循環動態と医師確定所見を確認してください。":hasPlacementWarning||hasTachyRedFlag||hasBradyRedFlag||hasElectrolyteRedFlag?"緊急対応を優先してください":tachyActive?"QRS幅と規則性から整理します":hasClinicianEdits?"医師確認済み所見から総合サマリーを更新しました。":navigatorState==="analyzing"?STEP_NAVIGATOR_COMMENTS[1]:STEP_NAVIGATOR_COMMENTS[0];

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  function chooseFile(next:File|null){
    if(preview) URL.revokeObjectURL(preview);
    setPreview("");setFile(null);setFileError("");
    if(!next)return;
    const result=validateEcgFile(next);
    if(!result.valid){setFileError(result.error??"ファイルを確認してください。");return;}
    setFile(next);setPreview(URL.createObjectURL(next));
  }
  const resultClass=qualityResult.grade==="C"?"result stop":qualityResult.grade==="B"?"result warn":"result";
  return <div className="shell">
    <aside className="side">
      <div className="brand"><NavigatorRobot variant="icon" state={navigatorState}/><div><div className="eyebrow">Medical AI</div><h1>ECG Diagnostic Assistant</h1></div></div>
      <nav className="nav">{["撮影・記録品質","電極装着確認","画像アップロード","AI抽出結果","所見確認・修正","Red Flag","系統的読影","診断候補","Today's Plan","原因別対応"].map((x,i)=><a className={i===0?"active":""} href={`#section-${i}`} key={x}>{String(i+1).padStart(2,"0")}　{x}</a>)}</nav>
      <div className="privacy">LOCAL SESSION<br/>画像・患者情報は保存・外部送信されません</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">Cardiac navigation console</div><h2>心電図読影・対応支援ツール</h2><p className="subtitle">心電図を読むだけでなく、次の行動まで導く</p></div><span className="badge">Ver. 0.1 / MOCK ANALYSIS</span></header>
      <NavigatorCard className="navigator-card--mobile" state={navigatorState} comment={navigatorComment}/>
      <div className="steps">{["品質","取込","抽出","警告","読影","対応"].map((s,i)=><span className={`step ${i===0?"on":""}`} key={s}>STEP {i} · {s}</span>)}</div>

      <IntegratedInterpretation result={integratedResult} override={integratedOverride} onOverrideChange={setIntegratedOverride}/>

      <section className="card" id="section-0">
        <div className="cardhead"><div><div className="eyebrow">Step 0</div><h3>撮影・記録品質</h3></div><span className="badge">手動チェック</span></div>
        <div className="checks">{qualityItems.map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={quality[key]} onChange={e=>setQuality(q=>({...q,[key]:e.target.checked}))}/>{label}</label>)}</div>
        <div className={resultClass}><strong>{qualityResult.grade}. {qualityResult.message}</strong><br/>{qualityResult.grade==="C"?"正面から、反射を避け、全12誘導・誘導名・速度・感度を含めて波形が切れないよう再撮影してください。":qualityResult.grade==="B"?"未確認項目があります。医師の判断で注意付き解析を続行できます。":"品質項目をすべて確認しました。"}</div>
      </section>

      <LeadPlacementGuide onWarningChange={setHasPlacementWarning}/>

      <section className="card" id="section-2"><div className="cardhead"><div><div className="eyebrow">Step 1</div><h3>心電図画像アップロード</h3></div><span className="badge">端末内のみ</span></div>
        <div className="grid2"><div className="upload"><div><strong>JPG / JPEG / PNG / PDF</strong><p className="muted">20MB以下。サーバー保存・外部送信なし</p><input aria-label="心電図ファイル" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>chooseFile(e.target.files?.[0]??null)}/>{fileError&&<div className="error">{fileError}</div>}</div></div>
          <details open><summary>心電図の上手な撮影方法</summary><ul className="list">{["用紙全体を平らにし、真上から平行に撮影","四隅・12誘導・誘導名を含める","標準感度と紙送り速度を写す","照明反射を避け、読める解像度を確保","患者名・ID・生年月日は必要に応じて隠す"].map(x=><li key={x}>{x}</li>)}</ul></details></div>
        {file&&<div>{file.type==="application/pdf"?<div className="pdf">PDFを読み込みました：{file.name}<br/><span className="muted">ブラウザ内プレビュー対象</span></div>:<>
          {/* Blob URLs are session-local user content and cannot use Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={preview} alt="アップロードした心電図のプレビュー"/>
        </>}</div>}
        <button className="btn" style={{marginTop:12}} disabled={!file||!qualityResult.canAnalyze}>モック解析を開始</button>
      </section>

      <section className="card" id="section-3"><div className="cardhead"><div><div className="eyebrow">Step 2</div><h3>AI抽出結果</h3></div><span className="badge">OBJECTIVE FINDINGS</span></div><div className="grid2">{findings.map(f=><div className="lead" key={f.key}><span className="muted">{f.label}</span><br/><strong>{f.ai}</strong></div>)}</div><div className="result warn">診断名ではなく客観的所見のモックです。実AI APIには接続していません。</div></section>
      <section className="card" id="section-4"><div className="cardhead"><div><div className="eyebrow">Clinician review</div><h3>所見確認・修正</h3></div><span className="badge">変更時に再計算</span></div>
        {findings.map(f=><div className="finding-row" key={f.key}><div><strong>{f.label}</strong><br/><span className="muted">AI: {f.ai}</span></div><input aria-label={`${f.label}の医師修正値`} value={review[f.key].value} onChange={e=>setReview(x=>({...x,[f.key]:{status:"edited",value:e.target.value}}))}/><select aria-label={`${f.label}の判定`} value={review[f.key].status} onChange={e=>setReview(x=>({...x,[f.key]:{...x[f.key],status:e.target.value}}))}><option value="accepted">正しい</option><option value="edited">修正</option><option value="rejected">削除</option><option value="indeterminate">判定不能</option></select></div>)}
        <div className="result">診断候補・対応は医師確認後の確定所見を使用します。削除・判定不能は正常として扱いません。</div>
      </section>
      <TachyarrhythmiaModule heartRate={confirmedHeartRate} qrsMs={confirmedQrs} regularity={confirmedRegularity} onRedFlagChange={setHasTachyRedFlag} onResultChange={setTachyResult}/>
      <BradyarrhythmiaModule input={integratedBradyInput} result={bradyResult} onChange={setBradyInput}/>
      <ElectrolyteModule input={integratedElectrolyteInput} result={electrolyteResult} onChange={setElectrolyteInput}/>
      <section className="card systematic-shell" id="section-6">
        <div className="cardhead"><div><div className="eyebrow">Step 4</div><h3>系統的読影</h3><p className="muted systematic-intro">18項目を順に確認します。正常所見はコンパクト表示、異常・判定不能は詳細を展開します。</p></div><span className="badge">共通基盤</span></div>
        <InterpretationSummary items={builtSystematicItems}/>
        <InterpretationNavigator items={builtSystematicItems} stInput={integratedStInput} stResult={stResult} onStChange={(next)=>{setStInput(next);setSystematicItems(current=>current.map(item=>item.id==="st-change"?{...item,status:"edited"}:item))}} tWaveInput={integratedTWaveInput} tWaveResult={tWaveResult} onTWaveChange={(next)=>{setTWaveInput(next);setSystematicItems(current=>current.map(item=>item.id==="t-wave"?{...item,status:"edited"}:item))}} qtInput={qtInput} qtResult={qtResult} onQtChange={(next)=>{setQtInput(next);setSystematicItems(current=>current.map(item=>item.id==="qt-qtc"?{...item,status:"edited"}:item))}} pvcInput={pvcInput} pvcResult={pvcResult} onPvcChange={(next)=>{setPvcInput(next);setSystematicItems(current=>current.map(item=>item.id==="ventricular-ectopy"?{...item,status:"edited"}:item))}} conductionInput={conductionInput} conductionResult={conductionResult} onConductionChange={(next)=>{setConductionInput(next);setSystematicItems(current=>current.map(item=>item.id==="qrs-morphology"?{...item,status:"edited"}:item))}} onChange={(next)=>setSystematicItems((current)=>current.map((item)=>item.id===next.id?next:item))}/>
      </section>
      <section className="card" id="section-7"><div className="cardhead"><div><div className="eyebrow">Differential</div><h3>診断候補・原因別対応</h3></div><span className="badge">ダミー表示</span></div><p className="muted">医師確定所見から将来のルールエンジンが生成します。Ver.0.1では診断確定や治療用量を提示しません。</p></section>
    </main>
    <aside className="right">
      <NavigatorCard className="navigator-card--desktop" state={navigatorState} comment={navigatorComment}/>
      <section className="card alert" id="section-5"><div className="eyebrow">Step 3</div><h3>Red Flag</h3><p className="muted">系統的読影から生成された仮カテゴリ</p><h4>確認カテゴリ</h4>{interpretationRedFlags.length?<ul className="list">{interpretationRedFlags.map((flag)=><li key={flag.id}><strong>{flag.label}</strong><br/><span>{flag.note}</span></li>)}</ul>:<p className="muted">現在の入力から生成された仮カテゴリはありません。</p>}<div className="result stop">疾患名や閾値による確定判定は未実装です。理由・不足情報・直ちに確認する項目のみを表示します。</div></section>
      <section className="card" id="section-8"><div className="eyebrow">Today&apos;s Plan</div><h3>今日確認すること</h3><PlanGroup title="Red Flag" items={interpretationPlan.redFlags}/><PlanGroup title="当日評価" items={interpretationPlan.sameDay}/><PlanGroup title="判定不能の再評価" items={interpretationPlan.reevaluate}/><PlanGroup title="通常評価" items={interpretationPlan.routine}/></section>
    </aside>
  </div>;
}

function NavigatorCard({state,comment,className}:{state:NavigatorState;comment:string;className:string}) {
  const statusText={default:"待機中",analyzing:"解析中",warning:"Red Flag",complete:"確認完了"}[state];
  return <section className={`card navigator-card ${className}`} aria-label="Navigator">
    <NavigatorRobot state={state}/>
    <div className="navigator-card__copy">
      <div className="eyebrow">Navigator</div>
      <strong>{comment}</strong>
      <span className="navigator-card__status"><i aria-hidden="true"/>{statusText}</span>
    </div>
  </section>;
}

function numberFromFinding(value:string|null){if(value==null)return null;const n=Number.parseFloat(value);return Number.isFinite(n)?n:null}

function PlanGroup({title,items}:{title:string;items:string[]}) {
  if(!items.length)return null;
  return <div className="plan-group"><h4>{title}</h4><ul className="list">{items.map((item)=><li key={item}>{item}</li>)}</ul></div>;
}
