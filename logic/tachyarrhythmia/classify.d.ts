export type Regularity="regular"|"irregular"|"unknown";
export type PWaveState="present"|"absent"|"unknown"|"retrograde"|"buried";
export type AvRelationship="one-to-one"|"more-p"|"more-qrs"|"av-dissociation"|"unknown";
export type TachyInput={
  heartRate:number|null;qrsMs:number|null;regularity:Regularity;pWave:PWaveState;pulsePresent:boolean|null;systolicBp:number|null;
  hypotension:boolean;alteredMentalStatus:boolean;shockSigns:boolean;ischemicChestPain:boolean;acuteHeartFailure:boolean;pulmonaryEdema:boolean;
  severeRespiratoryFailure:boolean;syncope:boolean;markedPresyncope:boolean;organHypoperfusion:boolean;
  wpwHistory:boolean;qrsMorphologyVariable:boolean;priorMi:boolean;structuralHeartDisease:boolean;sinusFeatures:boolean;
  avRelationship:AvRelationship;deltaWave:boolean;shortPr:boolean;fibrillatoryWaves:boolean;flutterWaves:boolean;flutterConduction:"2:1"|"3:1"|"4:1"|"variable"|"unknown";
  atrialRateBpm?:number|null;qrsCategoryOverride?:"auto"|"narrow"|"wide"|"variable"|"indeterminate";atrialActivity?:"sinus_p_wave"|"ectopic_p_wave"|"retrograde_p_wave"|"flutter_wave"|"fibrillatory_activity"|"no_visible_atrial_activity"|"hidden_in_qrs"|"hidden_in_t_wave"|"indeterminate";rpIntervalMs?:number|null;prIntervalMs?:number|null;shortRp?:boolean|null;longRp?:boolean|null;abruptOnset?:boolean|null;abruptTermination?:boolean|null;avDissociation?:boolean|null;captureBeats?:boolean|null;fusionBeats?:boolean|null;polymorphicWide?:boolean|null;existingBundleBranchBlock?:boolean|null;preExcitation?:boolean|null;highPotassium?:boolean;dynamicStChange?:boolean;hyperacuteT?:boolean;artifactConcern?:boolean;frequentPac?:boolean;multiplePWaveMorphologies?:boolean;clinicianClassification?:"auto"|"sinus_tachycardia_candidate"|"atrial_tachycardia_candidate"|"atrial_flutter_candidate"|"atrial_fibrillation_candidate"|"avnrt_candidate"|"avrt_candidate"|"junctional_tachycardia_candidate"|"ventricular_tachycardia_candidate"|"preexcited_atrial_fibrillation_candidate"|"other_wide_complex_tachycardia"|"mixed"|"indeterminate";
  qtcMs:number|null;potassium:number|null;calcium:number|null;magnesium:number|null;
};
export type TachyResult={active:boolean;hemodynamics:{status:string;label:string;message:string};classification:string|null;overallClassification:string;qrsClass:"narrow"|"wide"|"variable"|"indeterminate";candidates:string[];priority:string|null;redFlags:string[];warnings:string[];missing:string[];preexcitedAf?:boolean;findings:{regularity:Regularity;avDissociation:boolean|null;captureBeat:boolean|null;fusionBeat:boolean|null;existingBundleBranchBlock:boolean|null;polymorphicWide:boolean|null;qrsMorphologyVariable:boolean|null;preExcitation:boolean|null;torsadesCandidate:boolean};plan:string[];diagnosticReasoning:string[];contraindicatedDrugCandidates:string[];clinicalPearls:string[];possibleCauses:string[];limitations:string[]};
export const TACHYCARDIA_THRESHOLD_BPM:number;
export const WIDE_QRS_THRESHOLD_MS:number;
export function evaluateHemodynamics(input:TachyInput):TachyResult["hemodynamics"];
export function classifyTachyarrhythmia(input:TachyInput):TachyResult;
