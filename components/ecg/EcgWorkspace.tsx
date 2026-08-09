"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { EcgAnalysisError } from "@/lib/ecg-image/image-analysis-adapter";
import { OnnxLocalEcgImageAnalysisAdapter, type LocalSupport } from "@/lib/ecg-image/local-ecg-image-analysis-adapter";
import { EcgImageCropper } from "@/components/ecg/EcgImageCropper";
import { SystematicReviewNavigator } from "@/components/ecg/SystematicReviewNavigator";
import { compressEcgImageForUpload, type CropRect, type EcgUploadImage } from "@/lib/ecg-image/client-image-processing";
import { ABSOLUTE_UPLOAD_BYTES, TARGET_UPLOAD_BYTES } from "@/lib/ecg-image/upload-limits";
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
import type { IntegratedInput, IntegratedInterpretation as IntegratedResult } from "@/types/integrated-interpretation";
import { createDefaultIntegratedInput } from "@/data/integration/defaults.js";
import { buildIntegratedInterpretation } from "@/logic/integration/build-integrated-interpretation.js";
import type { TachyResult } from "@/logic/tachyarrhythmia/classify.js";
import type { SgarbossaInput } from "@/types/sgarbossa-interpretation";
import { createDefaultSgarbossaInput } from "@/data/sgarbossa/defaults.js";
import { interpretSgarbossa } from "@/logic/sgarbossa/interpret-sgarbossa.js";
import { SgarbossaModule } from "@/components/interpretation/SgarbossaModule";
import type { AnalysisProcessState, EcgAnalysisErrorDetail, EcgImageAnalysisResult } from "@/types/ecg";

const qualityItems = [
  ["allLeads","12誘導がすべて写っている"],["leadLabels","誘導名が読める"],["waveformsComplete","波形が途中で切れていない"],
  ["speedVisible","紙送り速度が確認できる"],["gainVisible","感度が確認できる"],["gridVisible","グリッドが確認できる"],
  ["inFocus","画像のピントが合っている"],["lowBlur","手ぶれが少ない"],["noGlare","強い反射がない"],
  ["noShadow","影で波形が隠れていない"],["lowTilt","画像の傾きが強くない"],["lowPerspective","遠近歪みが強くない"],
  ["multipleBeats","複数拍が確認できる"],["privacyChecked","患者氏名やIDの映り込みを確認した"],
] as const;
const findings = [
  {key:"heartRate",label:"心拍数"},{key:"rhythm",label:"リズム"},{key:"pWave",label:"P波"},
  {key:"pr",label:"PR"},{key:"qrs",label:"QRS幅"},{key:"axis",label:"軸"},
  {key:"rwave",label:"R波進行"},{key:"qWave",label:"Q波"},{key:"st",label:"ST変化"},
  {key:"tWave",label:"T波"},{key:"uWave",label:"U波"},{key:"qtc",label:"QT / QTc"},
  {key:"pvc",label:"PVC"},{key:"rOnT",label:"R on T候補"},{key:"bundleBranchBlock",label:"脚ブロック候補"},
  {key:"avBlock",label:"房室ブロック"},{key:"pacing",label:"ペーシング"},
  {key:"placement",label:"電極装着異常"},{key:"regularity",label:"規則性"},
];
type ReviewEntry={aiValue:string;clinicianValue:string;status:"accepted"|"edited"|"rejected"|"indeterminate";confidence:number|null;limitations:string[]};
const emptyReview=()=>Object.fromEntries(findings.map(f=>[f.key,{aiValue:"",clinicianValue:"",status:"indeterminate",confidence:null,limitations:[]}])) as Record<string,ReviewEntry>;
const initialAnalysis:AnalysisProcessState={status:"idle",progressMessage:"画像を選択してください",errorMessage:null,startedAt:null,completedAt:null};

// Version 2 is clinician-input only. The local extraction path remains isolated for Version 3.
const enableFutureLocalExtraction=false;

export function EcgWorkspace({onAuthRequired}:{onAuthRequired?:()=>void}={}) {
  const [quality,setQuality]=useState<Record<string,boolean>>(()=>Object.fromEntries(qualityItems.map(([k])=>[k,false])));
  const qualityResult=useMemo(()=>evaluateQuality(quality),[quality]);
  const [hasPlacementWarning,setHasPlacementWarning]=useState(false);
  const [hasTachyRedFlag,setHasTachyRedFlag]=useState(false);
  const [tachyResult,setTachyResult]=useState<TachyResult|null>(null);
  const [processedFile,setProcessedFile]=useState<File|null>(null);
  const [originalFile,setOriginalFile]=useState<File|null>(null);
  const [uploadFile,setUploadFile]=useState<File|null>(null);
  const [uploadInfo,setUploadInfo]=useState<EcgUploadImage|null>(null);
  const [originalPreview,setOriginalPreview]=useState("");
  const [preview,setPreview]=useState("");
  const [processedPreview,setProcessedPreview]=useState("");
  const [uploadPreview,setUploadPreview]=useState("");
  const [isPreparingUpload,setIsPreparingUpload]=useState(false);
  const [uploadError,setUploadError]=useState("");
  const [uploadRevision,setUploadRevision]=useState(0);
  const [cropState,setCropState]=useState<CropRect|null>(null);
  const [isCropping,setIsCropping]=useState(false);
  const [fileError,setFileError]=useState("");
  const [review,setReview]=useState<Record<string,ReviewEntry>>(emptyReview);
  const [analysis,setAnalysis]=useState<AnalysisProcessState>(initialAnalysis);
  const [analysisResult,setAnalysisResult]=useState<EcgImageAnalysisResult|null>(null);
  const [manualMode,setManualMode]=useState(false);
  const [privacyConfirmed,setPrivacyConfirmed]=useState(false);
  const [isDragging,setIsDragging]=useState(false);
  const fileInputRef=useRef<HTMLInputElement|null>(null);
  const abortRef=useRef<AbortController|null>(null);
  const uploadAbortRef=useRef<AbortController|null>(null);
  const localAdapterRef=useRef(new OnnxLocalEcgImageAnalysisAdapter());
  const [localSupport,setLocalSupport]=useState<LocalSupport|null>(null);
  const isBusy=isPreparingUpload||analysis.status==="uploading"||analysis.status==="analyzing";
  const [reanalysisCount,setReanalysisCount]=useState(0);
  const confirmedValue=(key:string)=>review[key]?.status==="accepted"?review[key].aiValue:review[key]?.status==="edited"?review[key].clinicianValue:null;
  const confirmedHeartRate=numberFromFinding(confirmedValue("heartRate"));
  const confirmedQrs=numberFromFinding(confirmedValue("qrs"));
  const confirmedRegularity:Regularity=confirmedValue("regularity")==="整"?"regular":confirmedValue("regularity")==="不整"?"irregular":"unknown";
  const [systematicItems,setSystematicItems]=useState<EcgInterpretationItem[]>(()=>interpretationItems);
  const [systematicProtocolComplete,setSystematicProtocolComplete]=useState(false);
  useEffect(()=>{if(analysis.status!=="success")setSystematicProtocolComplete(false)},[analysis.status]);
  const [stInput,setStInput]=useState<StInterpretationInput>(()=>createDefaultStInput());
  const [conductionInput,setConductionInput]=useState<ConductionInput>(()=>createDefaultConductionInput());
  const conductionResult=useMemo(()=>interpretConduction(conductionInput),[conductionInput]);
  const integratedStInput=useMemo<StInterpretationInput>(()=>({...stInput,qrsContext:conductionResult.qrsContext==="other"?"other":conductionResult.qrsContext}),[stInput,conductionResult.qrsContext]);
  const stResult=useMemo(()=>interpretStChanges(integratedStInput),[integratedStInput]);
  const [sgarbossaInput,setSgarbossaInput]=useState<SgarbossaInput>(()=>createDefaultSgarbossaInput());
  const integratedSgarbossaInput=useMemo<SgarbossaInput>(()=>{const detected=integratedStInput.qrsContext==="lbbb"?"lbbb":integratedStInput.qrsContext==="paced"?"ventricular_paced":integratedStInput.qrsContext==="rbbb"?"rbbb":integratedStInput.qrsContext==="narrow"?"narrow":sgarbossaInput.context;return {...sgarbossaInput,aiContext:detected,context:sgarbossaInput.contextClinicianConfirmed?sgarbossaInput.context:detected,leadMeasurements:sgarbossaInput.leadMeasurements.map(m=>{const st=integratedStInput.leadMeasurements.find(x=>x.lead===m.lead);const direction=st?.direction==="elevation"||st?.direction==="depression"?st.direction:st?.direction==="indeterminate"?"indeterminate":"none";return {...m,stDirection:direction,stDeviationMm:st?.amplitudeMm??m.stDeviationMm}})}},[sgarbossaInput,integratedStInput]);
  const sgarbossaResult=useMemo(()=>interpretSgarbossa(integratedSgarbossaInput),[integratedSgarbossaInput]);
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
    Object.assign(x,{sgarbossa:{applicable:sgarbossaResult.applicability==="applicable",originalPositive:sgarbossaResult.originalPositive,modifiedPositive:sgarbossaResult.modifiedPositive,indeterminate:sgarbossaResult.clinicalConcern==="indeterminate",context:integratedSgarbossaInput.context}});
    x.confirmedModules=["quality","clinician-review","ST","T-wave","QT","PVC","conduction","Sgarbossa","bradyarrhythmia","tachyarrhythmia","electrolyte"];
    x.indeterminateFindingIds=systematicItems.filter(i=>i.status==="indeterminate").map(i=>i.id);x.rejectedFindingIds=systematicItems.filter(i=>i.status==="rejected").map(i=>i.id);x.override=integratedOverride;return x;
  },[quality,qualityResult.grade,hasPlacementWarning,integratedStInput,stResult,integratedTWaveInput,tWaveResult,qtInput,qtResult,pvcInput,pvcResult,conductionInput,conductionResult,integratedBradyInput,bradyResult,integratedElectrolyteInput,tachyResult,systematicItems,integratedOverride,sgarbossaResult,integratedSgarbossaInput.context]);
  const integratedResult=useMemo(()=>buildIntegratedInterpretation(integratedInput),[integratedInput]);
  const interpretedItems=useMemo(()=>systematicItems.map((item)=>item.id==="st-change"?{...item,aiValue:stResult.overallClassification,clinicianValue:item.status==="accepted"?null:stResult.overallClassification,abnormal:stResult.overallClassification==="no_significant_change"?false:stResult.overallClassification==="indeterminate"?null:true,urgency:stResult.urgency,meaning:stResult.contiguousLeadGroups.length?stResult.contiguousLeadGroups:["誘導別ST計測を臨床背景と併せて評価します。"],possibleFactors:stResult.possibleFactors,mustNotMiss:stResult.mustNotMiss,additionalChecks:stResult.additionalChecks,nextActions:stResult.nextActions,limitations:stResult.limitations,sources:stResult.sources}:item.id==="t-wave"?{...item,aiValue:tWaveResult.overallClassification,clinicianValue:item.status==="accepted"?null:tWaveResult.overallClassification,abnormal:tWaveResult.overallClassification==="normal"?false:tWaveResult.overallClassification==="indeterminate"?null:true,urgency:tWaveResult.urgency,meaning:[...tWaveResult.affectedLeadGroups,...tWaveResult.warnings],possibleFactors:tWaveResult.possibleFactors,mustNotMiss:tWaveResult.mustNotMiss,additionalChecks:tWaveResult.additionalChecks,nextActions:tWaveResult.nextActions,limitations:tWaveResult.limitations,sources:tWaveResult.sources}:item.id==="qt-qtc"?{...item,aiValue:`QTc ${qtResult.qtcMs??"判定不能"} ms (${qtInput.formula})`,clinicianValue:item.status==="accepted"?null:qtResult.qtcMs,abnormal:qtResult.classification==="normal"?false:qtResult.classification==="indeterminate"?null:true,urgency:qtResult.urgency,meaning:[qtResult.classification,...qtResult.warnings],possibleFactors:qtResult.possibleFactors,mustNotMiss:qtResult.mustNotMiss,additionalChecks:qtResult.additionalChecks,nextActions:qtResult.nextActions,limitations:qtResult.limitations,sources:qtResult.sources}:item.id==="ventricular-ectopy"?{...item,aiValue:pvcResult.overallClassification,clinicianValue:item.status==="accepted"?null:pvcResult.overallClassification,abnormal:pvcResult.pvcPresent,urgency:pvcResult.urgency,meaning:pvcResult.warnings,possibleFactors:pvcResult.possibleFactors,mustNotMiss:pvcResult.mustNotMiss,additionalChecks:pvcResult.additionalChecks,nextActions:pvcResult.nextActions,limitations:pvcResult.limitations,sources:pvcResult.sources}:item),[systematicItems,stResult,tWaveResult,qtResult,qtInput.formula,pvcResult]);
  const bradyIntegratedItems=useMemo(()=>interpretedItems.map((item)=>item.id!=="rhythm"?item:{...item,aiValue:bradyResult.classification,clinicianValue:item.status==="accepted"?null:bradyResult.classification,abnormal:bradyResult.classification==="no_bradycardia"?false:bradyResult.classification==="indeterminate"?null:true,urgency:bradyResult.urgency,meaning:[...bradyResult.diagnosticReasoning,...bradyResult.warnings],possibleFactors:bradyResult.possibleFactors,mustNotMiss:bradyResult.mustNotMiss,additionalChecks:bradyResult.additionalChecks,nextActions:bradyResult.nextActions,limitations:bradyResult.limitations,sources:bradyResult.sources}),[interpretedItems,bradyResult]);
  const conductionIntegratedItems=useMemo(()=>bradyIntegratedItems.map((item)=>item.id!=="qrs-morphology"?item:{...item,aiValue:conductionResult.classification,clinicianValue:item.status==="accepted"?null:conductionResult.classification,abnormal:conductionResult.classification==="normal_qrs"?false:conductionResult.classification==="indeterminate"?null:true,urgency:conductionResult.urgency,meaning:[...conductionResult.clinicalPearls,...conductionResult.warnings],possibleFactors:conductionResult.possibleFactors,mustNotMiss:conductionResult.mustNotMiss,additionalChecks:conductionResult.additionalChecks,nextActions:conductionResult.nextActions,limitations:conductionResult.limitations,sources:conductionResult.sources}),[bradyIntegratedItems,conductionResult]);
  const builtSystematicItems=useMemo(()=>buildInterpretation(conductionIntegratedItems),[conductionIntegratedItems]);
  const electrolytePlanItem=useMemo<EcgInterpretationItem>(()=>({id:"electrolyte-module",title:"電解質ECG",aiValue:"電解質ECG評価",clinicianValue:null,status:"accepted",abnormal:Object.values(electrolyteResult.assessments).some(x=>x.level==="suspicious"||x.level==="possible"),confidence:null,urgency:electrolyteResult.urgency,meaning:electrolyteResult.redFlags,possibleFactors:electrolyteResult.possibleFactors,mustNotMiss:electrolyteResult.mustNotMiss,additionalChecks:electrolyteResult.additionalChecks,nextActions:electrolyteResult.nextActions,limitations:electrolyteResult.limitations,sources:electrolyteResult.sources}),[electrolyteResult]);
  const planItems=useMemo(()=>[...builtSystematicItems,electrolytePlanItem],[builtSystematicItems,electrolytePlanItem]);
  const interpretationPlan=useMemo(()=>buildTodaysPlan(planItems),[planItems]);
  const interpretationRedFlags=useMemo(()=>collectRedFlagCategories(planItems),[planItems]);
  const hasClinicianEdits=analysis.status==="success"&&Object.values(review).some(item=>item.status==="edited");
  const hasBradyRedFlag=bradyResult.redFlags.length>0;
  const hasElectrolyteRedFlag=electrolyteResult.redFlags.length>0;
  const hasIntegratedRedFlag=["resuscitation","emergency"].includes(integratedResult.urgency);
  const navigatorState:NavigatorState=analysis.status==="success"&&(hasPlacementWarning||hasTachyRedFlag||hasBradyRedFlag||hasElectrolyteRedFlag||hasIntegratedRedFlag)?"warning":isBusy?"analyzing":analysis.status==="success"?"complete":"default";
  const tachyActive=confirmedHeartRate!=null&&confirmedHeartRate>=100;
  const navigatorComment=hasIntegratedRedFlag?"重要所見があります。循環動態と医師確定所見を確認してください。":hasPlacementWarning||hasTachyRedFlag||hasBradyRedFlag||hasElectrolyteRedFlag?"緊急対応を優先してください":tachyActive?"QRS幅と規則性から整理します":hasClinicianEdits?"医師確認済み所見から総合サマリーを更新しました。":navigatorState==="analyzing"?STEP_NAVIGATOR_COMMENTS[1]:STEP_NAVIGATOR_COMMENTS[0];

  useEffect(()=>()=>{if(originalPreview)URL.revokeObjectURL(originalPreview)},[originalPreview]);
  useEffect(()=>()=>{if(processedPreview)URL.revokeObjectURL(processedPreview)},[processedPreview]);
  useEffect(()=>()=>{if(uploadPreview)URL.revokeObjectURL(uploadPreview)},[uploadPreview]);
  useEffect(()=>{
    setUploadFile(null);setUploadInfo(null);setUploadPreview("");setUploadError("");setPrivacyConfirmed(false);
    if(!processedFile)return;
    const controller=new AbortController();uploadAbortRef.current=controller;setIsPreparingUpload(true);setAnalysis({...initialAnalysis,status:"file_selected",progressMessage:"解析用画像を準備しています"});
    compressEcgImageForUpload({file:processedFile,targetBytes:TARGET_UPLOAD_BYTES,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;setUploadFile(result.file);setUploadInfo(result);if(result.file!==processedFile)setUploadPreview(URL.createObjectURL(result.file));setAnalysis({...initialAnalysis,status:"file_selected",progressMessage:"解析を開始できます"})}).catch(error=>{if(error instanceof DOMException&&error.name==="AbortError")return;setUploadError(error instanceof Error?error.message:"画像軽量化に失敗しました。");setAnalysis({...initialAnalysis,status:"error",progressMessage:"解析用画像を準備できませんでした",errorMessage:error instanceof Error?error.message:"画像軽量化に失敗しました。"})}).finally(()=>{if(uploadAbortRef.current===controller){uploadAbortRef.current=null;setIsPreparingUpload(false)}});
    return()=>controller.abort();
  },[processedFile,uploadRevision]);
  useEffect(()=>()=>{abortRef.current?.abort();uploadAbortRef.current?.abort()},[]);
  useEffect(()=>{let active=true;localAdapterRef.current.isSupported().then(result=>{if(active)setLocalSupport(result)});return()=>{active=false}},[]);
  function resetExtractedFindings(){setAnalysisResult(null);setManualMode(false);setReview(emptyReview());setReanalysisCount(0)}
  function handleSelectedFile(next:File|null){
    if(isBusy)return;
    setFileError("");setProcessedFile(null);setOriginalFile(null);setUploadFile(null);setUploadInfo(null);setOriginalPreview("");setPreview("");setProcessedPreview("");setUploadPreview("");setCropState(null);setIsCropping(false);setPrivacyConfirmed(false);resetExtractedFindings();
    if(!next){removeImage();return}
    const result=validateEcgFile(next);
    if(!result.valid){setFileError(result.error??"画像を読み込めませんでした");setAnalysis({...initialAnalysis,status:"error",progressMessage:"画像を選択してください",errorMessage:result.error??"画像を読み込めませんでした"});return}
    const url=URL.createObjectURL(next);setOriginalFile(next);setProcessedFile(next);setOriginalPreview(url);setPreview(url);setAnalysis({...initialAnalysis,status:"file_selected",progressMessage:"解析用画像を準備しています"});
  }
  function removeImage(){
    abortRef.current?.abort();uploadAbortRef.current?.abort();setProcessedFile(null);setOriginalFile(null);setUploadFile(null);setUploadInfo(null);setOriginalPreview("");setPreview("");setProcessedPreview("");setUploadPreview("");setCropState(null);setIsCropping(false);setFileError("");setUploadError("");setPrivacyConfirmed(false);resetExtractedFindings();setAnalysis(initialAnalysis);
    if(fileInputRef.current)fileInputRef.current.value="";
  }
  function useOriginalImage(){if(!originalFile)return;setProcessedFile(originalFile);setPreview(originalPreview);setProcessedPreview("");setCropState(null);setIsCropping(false);setPrivacyConfirmed(false);resetExtractedFindings();setAnalysis({...initialAnalysis,status:"file_selected",progressMessage:"元画像から解析用画像を準備します"})}
  function confirmCrop(processed:File,crop:CropRect){const url=URL.createObjectURL(processed);setProcessedFile(processed);setProcessedPreview(url);setPreview(url);setCropState(crop);setIsCropping(false);setPrivacyConfirmed(false);resetExtractedFindings();setAnalysis({...initialAnalysis,status:"file_selected",progressMessage:"切り抜き画像を軽量化します"})}
  function continueManually(){setManualMode(true);setAnalysisResult(null);setReview(emptyReview());setAnalysis({...initialAnalysis,status:"success",progressMessage:"医師入力で続行中",completedAt:new Date().toISOString()});requestAnimationFrame(()=>document.getElementById("quick-review")?.scrollIntoView({behavior:"smooth"}))}
  async function runLocalAnalysis(){
    if(!uploadFile||isBusy||!privacyConfirmed||uploadFile.size>ABSOLUTE_UPLOAD_BYTES)return;
    const controller=new AbortController();abortRef.current=controller;let timedOut=false;
    const timeout=window.setTimeout(()=>{timedOut=true;controller.abort()},90000);
    setAnalysis({status:"uploading",progressMessage:"画像を準備しています",errorMessage:null,startedAt:new Date().toISOString(),completedAt:null});
    try{
      await Promise.resolve();setAnalysis(x=>({...x,status:"analyzing",progressMessage:"心電図所見を抽出しています"}));
      const result=await localAdapterRef.current.analyze(uploadFile,{signal:controller.signal});
      setAnalysisResult(result);setReview(reviewFromAnalysis(result));
      setAnalysis(x=>({...x,status:"success",progressMessage:"解析結果を医師が確認してください",completedAt:new Date().toISOString()}));
      requestAnimationFrame(()=>document.getElementById("quick-review")?.scrollIntoView({behavior:"smooth"}));
    }catch(error){
      if(error instanceof EcgAnalysisError){if(error.code==="AUTH_REQUIRED"||error.code==="SESSION_EXPIRED"){onAuthRequired?.();return}setAnalysis(x=>({...x,status:error.code==="ANALYSIS_NOT_CONFIGURED"?"not_configured":"error",progressMessage:error.code==="ANALYSIS_NOT_CONFIGURED"?"画像解析サービスが設定されていません":"解析できなかった理由",errorMessage:error.message,errorDetail:error.detail,completedAt:new Date().toISOString()}));return}
      if(error instanceof EcgAnalysisError&&error.code==="ANALYSIS_NOT_CONFIGURED")setAnalysis(x=>({...x,status:"not_configured",progressMessage:"画像解析サービスが設定されていません",errorMessage:error.message,completedAt:new Date().toISOString()}));
      else if(error instanceof DOMException&&error.name==="AbortError")setAnalysis({...initialAnalysis,status:uploadFile?"file_selected":"idle",progressMessage:timedOut?"解析がタイムアウトしました。再試行してください":"解析を中断しました",errorMessage:timedOut?"90秒以内に応答がありませんでした":null});
      else setAnalysis(x=>({...x,status:"error",progressMessage:"解析に失敗しました",errorMessage:error instanceof Error?error.message:"不明なエラー",completedAt:new Date().toISOString()}));
    }finally{window.clearTimeout(timeout);abortRef.current=null}
  }
  const resultClass=qualityResult.grade==="C"?"result stop":qualityResult.grade==="B"?"result warn":"result";
  return <div className="shell compact-shell">
    <aside className="side">
      <div className="brand"><NavigatorRobot variant="icon" state={navigatorState}/><div><div className="eyebrow">Medical Rule Engine</div><h1>ECG Diagnostic Assistant</h1></div></div>
      <nav className="nav"><a className="active" href="#quick-upload">01　画像</a><a href="#quick-review">02　所見修正</a><a href="#clinical-results">03　結果</a></nav>
      <div className="privacy">EXPLAINABLE RULE ENGINE<br/>医師が確認した所見から既存ルールだけで結果を再計算します</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">Cardiac navigation console</div><h2>心電図読影・対応支援ツール</h2><p className="subtitle">画像処理と所見入力はこの端末内で行われます</p></div><span className="badge">LOCAL MODE</span></header>
      <NavigatorCard className="navigator-card--mobile" state={navigatorState} comment={navigatorComment}/>
      <section className="card version2-intro" aria-labelledby="version2-intro-title">
        <div className="eyebrow">ECG Diagnostic Assistant Version 2</div>
        <h3 id="version2-intro-title">心電図ルールベース解析エンジン</h3>
        <p>心電図画像を参照しながら所見を入力してください。入力された所見をルールに基づいて解析します。</p>
      </section>
      <div className="steps compact-steps">{["画像アップロード","医師による主要所見入力","ルールベース解析結果"].map((s,i)=><span className={`step ${i===0?"on":""}`} key={s}>STEP {i+1} · {s}</span>)}</div>

      <section className="card workflow-card" id="quick-upload"><div className="cardhead"><div><div className="eyebrow">Step 1</div><h3>心電図画像アップロード</h3></div><span className="badge">画像は永続保存しません</span></div>
        {enableFutureLocalExtraction&&<div className="local-analysis-status" role="status"><strong>{localSupport==null?"ローカル実行環境を確認中":localSupport.backend==="webgpu"?"ローカルGPU解析に対応":localSupport.backend==="wasm"?"CPU解析で動作可能":"この端末ではローカル所見抽出に非対応"}</strong><span>{localSupport?.supported?"検証済みモデルを利用できます":localSupport?.reason??"所見抽出モデルは準備中です"}</span></div>}
        <div className={`upload-dropzone ${isDragging?"is-dragging":""}`} onDragEnter={e=>{e.preventDefault();if(!isBusy)setIsDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{if(e.currentTarget===e.target)setIsDragging(false)}} onDrop={e=>{e.preventDefault();setIsDragging(false);handleSelectedFile(e.dataTransfer.files[0]??null)}}>
          <strong>JPEG / PNG / WebP</strong><p className="muted">20MB以下の画像を選択、またはここへドロップしてください。</p>
          <input ref={fileInputRef} aria-label="心電図画像ファイル" type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy} onChange={e=>handleSelectedFile(e.target.files?.[0]??null)}/>
        </div>
        {isCropping&&originalFile&&originalPreview&&<EcgImageCropper file={originalFile} previewUrl={originalPreview} onCancel={()=>setIsCropping(false)} onConfirm={confirmCrop}/>}
        {processedFile&&preview&&!isCropping&&<div className="upload-actions"><button className="btn" type="button" disabled={isBusy} onClick={()=>{setIsCropping(true);setAnalysis(x=>({...x,status:"cropping",progressMessage:"切り抜き範囲を調整してください"}))}}>{cropState?"もう一度切り抜く":"画像を切り抜く"}</button>{cropState&&<button className="btn" type="button" disabled={isBusy} onClick={useOriginalImage}>元画像に戻す</button>}<span className="muted">{cropState?`回転 ${cropState.rotation}°・切り抜き後に送信サイズを調整します`:"元画像から送信サイズを調整します"}</span></div>}
        {(fileError||uploadError)&&<><div className="error" role="alert">{fileError||uploadError}</div>{uploadError&&<div className="upload-actions"><button className="btn" type="button" onClick={()=>setIsCropping(true)} disabled={!originalFile}>切り抜きを修正</button><button className="btn" type="button" onClick={()=>setUploadRevision(x=>x+1)} disabled={!processedFile||isBusy}>画像を軽量化して再試行</button><button className="btn" type="button" onClick={()=>fileInputRef.current?.click()}>別画像を選ぶ</button><button className="btn" type="button" onClick={continueManually} disabled={!processedFile||!privacyConfirmed}>医師入力で続ける</button></div>}</>}
        {originalFile&&preview&&<div className="upload-preview"><div>{/* Blob URLs cannot use Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploadPreview||preview} alt="解析用として送信予定の心電図画像プレビュー"/></div><div className="upload-file-summary"><section><h4>元画像</h4><dl><div><dt>ファイル名</dt><dd>{originalFile.name}</dd></div><div><dt>元サイズ</dt><dd>{formatFileSize(originalFile.size)}</dd></div></dl></section><section><h4>解析用画像</h4>{uploadInfo?<dl><div><dt>送信サイズ</dt><dd>{formatFileSize(uploadInfo.outputBytes)}</dd></div><div><dt>画像寸法</dt><dd>{uploadInfo.outputWidth} × {uploadInfo.outputHeight} px</dd></div><div><dt>形式</dt><dd>{uploadInfo.mimeType}</dd></div><div><dt>軽量化</dt><dd>{uploadInfo.compressed?"高品質形式へ軽量化しました":"不要（元画像を維持）"}</dd></div><div><dt>品質値</dt><dd>{uploadInfo.quality??"再圧縮なし"}</dd></div></dl>:<p className="muted">{isPreparingUpload?"送信画像を準備しています…":"送信画像を準備できていません"}</p>}</section></div><div className="upload-actions"><button className="btn" type="button" disabled={isBusy} onClick={()=>fileInputRef.current?.click()}>画像を変更</button><button className="btn" type="button" disabled={isBusy} onClick={removeImage}>画像を削除</button></div></div>}
        {uploadInfo?.compressed&&<div className="result warn" role="status"><strong>画像を送信可能なサイズへ軽量化しました。</strong><br/>波形、誘導名、校正波形が判読できることを確認してください。</div>}
        <label className="privacy-confirm"><input type="checkbox" checked={privacyConfirmed} disabled={isBusy} onChange={e=>setPrivacyConfirmed(e.target.checked)}/>患者氏名・患者ID・生年月日・施設名が画像に含まれていないことを確認しました</label>
        <div className={`analysis-status analysis-status--${analysis.status}`} role="status" aria-live="polite">{isBusy&&<span className="analysis-spinner" aria-hidden="true"/>}<div><strong>{analysis.progressMessage}</strong>{analysis.errorMessage&&<p>{analysis.errorMessage}</p>}</div></div>
        {analysis.errorDetail&&<><AnalysisErrorDetails error={analysis.errorDetail}/><div className="upload-actions"><button className="btn" type="button" onClick={()=>setIsCropping(true)} disabled={!originalFile}>切り抜きを修正</button>{analysis.errorDetail.code==="FILE_TOO_LARGE"&&<button className="btn" type="button" onClick={()=>setUploadRevision(x=>x+1)} disabled={!processedFile||isBusy}>画像を軽量化して再試行</button>}<button className="btn" type="button" onClick={useOriginalImage} disabled={!originalFile}>元画像に戻る</button><button className="btn" type="button" onClick={()=>fileInputRef.current?.click()}>別の画像を選択</button><button className="btn" type="button" onClick={continueManually} disabled={!processedFile||!privacyConfirmed}>医師入力で続ける</button></div></>}
        {manualMode&&<div className="result warn" role="status"><strong>医師入力モード</strong><br/>医師が確認した所見を、既存のルールベース解析エンジンで総合評価します。固定値や疑似所見は使用しません。</div>}
        {analysisResult?.partialSuccess&&<div className="result warn" role="status"><strong>一部の項目を解析できませんでした</strong><br/>取得できた所見は表示しています。判定不能の項目を医師が確認・入力してください。</div>}
        <div className="upload-actions"><button className="btn primary-action" type="button" disabled={!processedFile||isBusy||!privacyConfirmed} onClick={continueManually}>医師入力で続ける</button>{enableFutureLocalExtraction&&<button className="btn secondary" type="button" disabled={!uploadFile||isBusy||!privacyConfirmed||!localSupport?.supported} onClick={runLocalAnalysis}>ローカル所見抽出を開始</button>}{isPreparingUpload&&<button className="btn secondary" type="button" onClick={()=>uploadAbortRef.current?.abort()}>画像処理を中断</button>}{enableFutureLocalExtraction&&!isPreparingUpload&&(analysis.status==="uploading"||analysis.status==="analyzing")&&<button className="btn secondary" type="button" onClick={()=>abortRef.current?.abort()}>解析を中断</button>}</div>
      </section>

      {analysis.status==="success"&&<SystematicReviewNavigator onCompletionChange={setSystematicProtocolComplete}/>}
      <section className="card workflow-card" id="quick-review"><div className="cardhead"><div><div className="eyebrow">Step 2 · Clinician review</div><h3>医師による所見入力</h3><p className="muted">初期値は未入力です。画像を確認して所見を入力し、既存ルールエンジンで再計算します。</p></div><span className="badge">端末内入力</span></div>
        {analysis.status!=="success"?<div className="analysis-placeholder">画像を選択し「医師入力で続ける」を選んでください</div>:<>{analysisResult&&<div className={analysisResult.imageQuality.analyzable===false?"result warn":"result"}><strong>画質：{analysisResult.imageQuality.analyzable===true?"解析可能":analysisResult.imageQuality.analyzable===false?"解析困難":"判定不能"}</strong><br/><span>{[...analysisResult.imageQuality.limitations,...analysisResult.limitations].join("、")||"解析不能理由・制限事項なし"}</span></div>}<div className="findings-review-grid">{findings.filter(f=>f.key!=="regularity").map(f=>{const entry=review[f.key];return <label className="finding-editor" key={f.key}><span><strong>{f.label}</strong><small>{entry.aiValue?`所見抽出候補: ${entry.aiValue}`:"未入力"}</small></span><input aria-label={`${f.label}の医師入力値（簡易フロー）`} placeholder="未入力" value={entry.status==="edited"?entry.clinicianValue:entry.aiValue} onChange={e=>setReview(x=>({...x,[f.key]:{...x[f.key],status:"edited",clinicianValue:e.target.value}}))}/><select aria-label={`${f.label}の判定（簡易フロー）`} value={entry.status} onChange={e=>setReview(x=>({...x,[f.key]:{...x[f.key],status:e.target.value as ReviewEntry["status"]}}))}><option value="indeterminate">未入力／判定不能</option><option value="edited">医師入力</option><option value="accepted">所見抽出候補を採用</option><option value="rejected">除外</option></select></label>})}</div><button className="btn primary-action" type="button" onClick={()=>{setReanalysisCount(x=>x+1);requestAnimationFrame(()=>document.getElementById("clinical-results")?.scrollIntoView({behavior:"smooth"}))}}>入力所見で再計算</button><p className="muted reanalysis-status" aria-live="polite">{reanalysisCount>0?`医師入力所見で総合結果を再計算しました（${reanalysisCount}回）`:"診断候補・対応には医師が入力した所見だけを使用します。"}</p></>}
      </section>

      {analysis.status==="success"&&systematicProtocolComplete?<ClinicalResults result={integratedResult} pearls={[...(tachyResult?.active?tachyResult.clinicalPearls:[]),...(bradyResult.classification!=="no_bradycardia"?bradyResult.clinicalPearls:[]),...conductionResult.clinicalPearls,...(sgarbossaResult.applicability==="applicable"?sgarbossaResult.clinicalPearls:[])]}/>:<section className="card workflow-card" id="clinical-results"><div className="cardhead"><div><div className="eyebrow">Step 3 · Result</div><h3>診断・対応</h3></div></div><div className="analysis-placeholder">{analysis.status!=="success"?"主要所見入力後に表示されます":"系統的読影14 STEPを完了すると、診断候補・理由・除外理由・追加確認・検査・初期対応を表示します。"}</div></section>}

      <details className="advanced-analysis"><summary><span>詳細解析</span><small>品質確認・誘導分布・各解析モジュールを表示</small></summary><div className="advanced-analysis__body">

      <IntegratedInterpretation result={integratedResult} override={integratedOverride} onOverrideChange={setIntegratedOverride}/>

      {analysisResult&&<section className="card"><div className="cardhead"><div><div className="eyebrow">Finding extraction details</div><h3>画像品質・confidence</h3></div><span className="badge">詳細解析</span></div><p><strong>モデル：</strong>{analysisResult.model??"不明"}</p><p><strong>全体confidence：</strong>{analysisResult.confidence.overall==null?"判定不能":`${Math.round(analysisResult.confidence.overall*100)}%`}</p><div className="grid2">{findings.map(({key,label})=><div className="lead" key={key}><span className="muted">{label}</span><br/><strong>{review[key].confidence==null?"判定不能":`${Math.round(review[key].confidence!*100)}%`}</strong></div>)}</div><SimpleList items={[...analysisResult.imageQuality.limitations,...analysisResult.limitations]}/></section>}

      {analysisResult?.fieldIssues?.length?<section className="card"><div className="eyebrow">Partial success</div><h3>解析できなかった項目</h3><ul className="list">{analysisResult.fieldIssues.slice(0,5).map(x=><li key={`${x.field}-${x.issue}`}><code>{x.field}</code>：{x.issue}</li>)}</ul></section>:null}
      <section className="card" id="section-0">
        <div className="cardhead"><div><div className="eyebrow">Step 0</div><h3>撮影・記録品質</h3></div><span className="badge">手動チェック</span></div>
        <div className="checks">{qualityItems.map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={quality[key]} onChange={e=>setQuality(q=>({...q,[key]:e.target.checked}))}/>{label}</label>)}</div>
        <div className={resultClass}><strong>{qualityResult.grade}. {qualityResult.message}</strong><br/>{qualityResult.grade==="C"?"正面から、反射を避け、全12誘導・誘導名・速度・感度を含めて波形が切れないよう再撮影してください。":qualityResult.grade==="B"?"未確認項目があります。医師の判断で注意付き解析を続行できます。":"品質項目をすべて確認しました。"}</div>
      </section>

      <LeadPlacementGuide onWarningChange={setHasPlacementWarning}/>

      <section className="card" id="section-2"><div className="cardhead"><div><div className="eyebrow">Upload state</div><h3>画像解析の状態</h3></div></div><p className="muted">画像選択・プレビュー・解析・医師修正は通常画面に集約しています。詳細解析では医学判定モジュールのみを確認できます。</p></section>
      <TachyarrhythmiaModule heartRate={confirmedHeartRate} qrsMs={confirmedQrs} regularity={confirmedRegularity} onRedFlagChange={setHasTachyRedFlag} onResultChange={setTachyResult}/>
      <BradyarrhythmiaModule input={integratedBradyInput} result={bradyResult} onChange={setBradyInput}/>
      <ElectrolyteModule input={integratedElectrolyteInput} result={electrolyteResult} onChange={setElectrolyteInput}/>
      <section className="card systematic-shell" id="section-6">
        <div className="cardhead"><div><div className="eyebrow">Step 4</div><h3>系統的読影</h3><p className="muted systematic-intro">18項目を順に確認します。正常所見はコンパクト表示、異常・判定不能は詳細を展開します。</p></div><span className="badge">共通基盤</span></div>
        <InterpretationSummary items={builtSystematicItems}/>
        <InterpretationNavigator items={builtSystematicItems} stInput={integratedStInput} stResult={stResult} onStChange={(next)=>{setStInput(next);setSystematicItems(current=>current.map(item=>item.id==="st-change"?{...item,status:"edited"}:item))}} tWaveInput={integratedTWaveInput} tWaveResult={tWaveResult} onTWaveChange={(next)=>{setTWaveInput(next);setSystematicItems(current=>current.map(item=>item.id==="t-wave"?{...item,status:"edited"}:item))}} qtInput={qtInput} qtResult={qtResult} onQtChange={(next)=>{setQtInput(next);setSystematicItems(current=>current.map(item=>item.id==="qt-qtc"?{...item,status:"edited"}:item))}} pvcInput={pvcInput} pvcResult={pvcResult} onPvcChange={(next)=>{setPvcInput(next);setSystematicItems(current=>current.map(item=>item.id==="ventricular-ectopy"?{...item,status:"edited"}:item))}} conductionInput={conductionInput} conductionResult={conductionResult} onConductionChange={(next)=>{setConductionInput(next);setSystematicItems(current=>current.map(item=>item.id==="qrs-morphology"?{...item,status:"edited"}:item))}} onChange={(next)=>setSystematicItems((current)=>current.map((item)=>item.id===next.id?next:item))}/>
      </section>
        <SgarbossaModule input={integratedSgarbossaInput} result={sgarbossaResult} onChange={(next)=>{setSgarbossaInput(next);setStInput(current=>({...current,leadMeasurements:current.leadMeasurements.map(m=>{const s=next.leadMeasurements.find(x=>x.lead===m.lead);return s?{...m,direction:s.stDirection==="none"?"isoelectric":s.stDirection,amplitudeMm:s.stDeviationMm,clinicianConfirmed:s.clinicianConfirmed}:m})}))}}/>
      </div></details>
    </main>
    <aside className="right">
      <NavigatorCard className="navigator-card--desktop" state={navigatorState} comment={navigatorComment}/>
      <section className="card alert" id="section-5"><div className="eyebrow">Step 3</div><h3>Red Flag</h3><p className="muted">系統的読影から生成された仮カテゴリ</p><h4>確認カテゴリ</h4>{interpretationRedFlags.length?<ul className="list">{interpretationRedFlags.map((flag)=><li key={flag.id}><strong>{flag.label}</strong><br/><span>{flag.note}</span></li>)}</ul>:<p className="muted">現在の入力から生成された仮カテゴリはありません。</p>}<div className="result stop">疾患名や閾値による確定判定は未実装です。理由・追加確認項目・直ちに確認する項目のみを表示します。</div></section>
      <section className="card" id="section-8"><div className="eyebrow">Today&apos;s Plan</div><h3>今日確認すること</h3><PlanGroup title="Red Flag" items={interpretationPlan.redFlags}/><PlanGroup title="当日評価" items={interpretationPlan.sameDay}/><PlanGroup title="判定不能の再評価" items={interpretationPlan.reevaluate}/><PlanGroup title="通常評価" items={interpretationPlan.routine}/></section>
    </aside>
  </div>;
}

function ClinicalResults({result,pearls}:{result:IntegratedResult;pearls:string[]}) {
  const top=result.diagnosticCandidates[0];
  const differentials=result.diagnosticCandidates.slice(1);
  const tests=result.todaysPlan.filter(x=>x.category==="test");
  const actions=result.todaysPlan.filter(x=>x.category==="immediate"||x.category==="today");
  return <section className="card workflow-card clinical-results" id="clinical-results"><div className="cardhead"><div><div className="eyebrow">Step 3 · Result</div><h3>診断・対応</h3><p className="muted">医師確認所見から再計算した結果です。</p></div><span className={`urgency-chip urgency-chip--${result.urgency}`}>{result.urgency}</span></div>
    {result.conflictingFindings.length>0&&<section className="result warn"><strong>併存または鑑別が必要な候補</strong><ul className="list">{result.conflictingFindings.map(x=><li key={x.id}>{x.description}</li>)}</ul></section>}
    <section className="red-flag-panel" aria-labelledby="red-flag-title"><div><span aria-hidden="true">!</span><div><div className="eyebrow">Must not miss</div><h4 id="red-flag-title">見逃してはいけない疾患</h4></div></div>{result.criticalFindings.length?<ul className="list">{result.criticalFindings.map(x=><li key={x.id}><strong>{x.label}</strong><span>{x.supportingFindings.map(v=>v.label).join("、")||"緊急所見として医師確認が必要"}</span></li>)}</ul>:<p className="muted">現在の確定所見からRed Flag候補は生成されていません。</p>}</section>
    <ResultBlock number="1" title="診断候補（優先順位付き）">{result.diagnosticCandidates.length?<div className="candidate-reasons">{result.diagnosticCandidates.map((x,i)=><article key={x.id}><header><span>{i+1}</span><div><strong>{x.label}</strong><small>Rule confidence：{ruleConfidenceJa(x.confidence)} · {x.urgency}</small></div></header><div><b>判定理由</b><SimpleList items={x.supportingFindings.map(v=>v.label)}/></div></article>)}</div>:<p className="muted">優先候補は生成されていません。</p>}</ResultBlock>
    <ResultBlock number="2" title="診断理由"><SimpleList items={top?.supportingFindings.map(x=>x.label)??[]}/></ResultBlock>
    <ResultBlock number="3" title="原因疾患鑑別">{differentials.length?<div className="differential-cards">{differentials.map(x=><article key={x.id}><h5>{x.label}</h5><div><b>採用理由</b><SimpleList items={x.supportingFindings.map(v=>v.label)}/></div><div><b>否定理由</b><SimpleList items={x.contradictingFindings.map(v=>v.label)}/></div></article>)}</div>:<p className="muted">現時点で追加の原因疾患鑑別候補はありません。</p>}</ResultBlock>
    <ResultBlock number="4" title="推奨追加検査"><SimpleList items={[...result.missingInformation.map(x=>x.label),...(top?.missingInformation.map(x=>x.label)??[])]}/>{tests.length?<div className="priority-list">{tests.map(x=><div key={x.id}><span className={`priority-tag priority-tag--${planPriorityKey(x.priority)}`}>{planPriorityLabel(x.priority)}</span><strong>{x.label}</strong></div>)}</div>:null}</ResultBlock>
    <ResultBlock number="5" title="初期対応"><p className="muted">以下は診断確定ではなく推奨対応です。</p><div className="care-timeline">{[["今すぐ",actions.filter(x=>x.category==="immediate")],["15分以内",actions.filter(x=>x.category==="today"&&x.priority<=2)],["30〜60分以内",actions.filter(x=>x.category==="today"&&x.priority>2)]] .map(([label,rows])=><div key={label as string}><time>{label as string}</time><SimpleList items={(rows as typeof actions).map(x=>x.label)}/></div>)}</div></ResultBlock>
    <ResultBlock number="6" title="Clinical Pearl"><SimpleList items={pearls.slice(0,3)}/></ResultBlock>
  </section>;
}

function ResultBlock({number,title,children}:{number:string;title:string;children:React.ReactNode}) {return <section className="clinical-result-block"><header><span>{number}</span><h4>{title}</h4></header>{children}</section>}
function AnalysisErrorDetails({error}:{error:EcgAnalysisErrorDetail}){return <section className="analysis-error-detail" aria-labelledby="analysis-error-title"><div className="eyebrow">安全なエラーコード：{error.code}</div><h4 id="analysis-error-title">解析できなかった理由</h4><p>{error.userMessage}</p>{error.fieldIssues?.length?<div><strong>不足または不正な項目</strong><ul className="list">{error.fieldIssues.slice(0,5).map(x=><li key={`${x.field}-${x.issue}`}><code>{x.field}</code>：{x.issue}</li>)}</ul></div>:null}{error.analysisLimitations?.length?<div><strong>画像上の判読制限</strong><SimpleList items={error.analysisLimitations}/></div>:null}<div><strong>改善方法</strong><SimpleList items={error.suggestedActions}/></div><p className="muted">再試行：{error.retryable?"可能":"画像または設定の変更が必要"}{error.requestId?` ／ Request ID: ${error.requestId}`:""}</p></section>}
function SimpleList({items}:{items:string[]}) {const unique=[...new Set(items)];return unique.length?<ul className="list">{unique.map(x=><li key={x}>{x}</li>)}</ul>:<p className="muted">現時点で追加項目はありません。</p>}
function planPriorityKey(priority:number){return priority<=1?"urgent":priority<=3?"early":"conditional"}
function planPriorityLabel(priority:number){return priority<=1?"緊急":priority<=3?"早め":"状況次第"}
function ruleConfidenceJa(confidence:IntegratedResult["diagnosticCandidates"][number]["confidence"]){return confidence==="high"?"高":confidence==="moderate"?"中":"低"}

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
function formatFileSize(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}
function displayFinding(value:unknown){if(value==null||value==="")return "判定不能";if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);try{return JSON.stringify(value)}catch{return "判定不能"}}
function reviewFromAnalysis(result:EcgImageAnalysisResult):Record<string,ReviewEntry>{
  const m=result.measurements,f=result.findings;
  const values:Record<string,string>={heartRate:m.heartRateBpm==null?"判定不能":`${m.heartRateBpm} bpm`,rhythm:m.rhythm??"判定不能",pWave:displayFinding(f.pWave),pr:m.prMs==null?"判定不能":`${m.prMs} ms`,qrs:m.qrsMs==null?displayFinding(f.qrs):`${m.qrsMs} ms`,axis:m.axisDegrees==null?"判定不能":`${m.axisDegrees}°`,rwave:displayFinding(f.rWaveProgression),qWave:displayFinding(f.qWave),st:displayFinding(f.st),tWave:displayFinding(f.tWave),uWave:displayFinding(f.uWave),qtc:`QT ${m.qtMs??"判定不能"} ms / QTc ${m.qtcMs??"判定不能"} ms`,pvc:displayFinding(f.pvc??f.ectopy),rOnT:displayFinding(f.rOnT),bundleBranchBlock:displayFinding(f.bundleBranchBlock),placement:displayFinding(f.leadPlacement),regularity:displayFinding(f.regularity)};
  const limitations=[...result.imageQuality.limitations,...result.limitations];
  return Object.fromEntries(findings.map(({key})=>[key,{aiValue:values[key]??"判定不能",clinicianValue:"",status:"accepted",confidence:result.confidence.perField[key]??result.confidence.overall,limitations}])) as Record<string,ReviewEntry>;
}

function PlanGroup({title,items}:{title:string;items:string[]}) {
  if(!items.length)return null;
  return <div className="plan-group"><h4>{title}</h4><ul className="list">{items.map((item)=><li key={item}>{item}</li>)}</ul></div>;
}
