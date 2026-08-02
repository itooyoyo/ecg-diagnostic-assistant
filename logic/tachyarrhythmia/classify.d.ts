export type Regularity="regular"|"irregular"|"unknown";
export type PWaveState="present"|"absent"|"unknown"|"retrograde"|"buried";
export type AvRelationship="one-to-one"|"more-p"|"more-qrs"|"av-dissociation"|"unknown";
export type TachyInput={
  heartRate:number|null;qrsMs:number|null;regularity:Regularity;pWave:PWaveState;pulsePresent:boolean|null;systolicBp:number|null;
  hypotension:boolean;alteredMentalStatus:boolean;shockSigns:boolean;ischemicChestPain:boolean;acuteHeartFailure:boolean;pulmonaryEdema:boolean;
  severeRespiratoryFailure:boolean;syncope:boolean;markedPresyncope:boolean;organHypoperfusion:boolean;
  wpwHistory:boolean;qrsMorphologyVariable:boolean;priorMi:boolean;structuralHeartDisease:boolean;sinusFeatures:boolean;
  avRelationship:AvRelationship;deltaWave:boolean;shortPr:boolean;fibrillatoryWaves:boolean;flutterWaves:boolean;flutterConduction:"2:1"|"3:1"|"4:1"|"variable"|"unknown";
  qtcMs:number|null;potassium:number|null;calcium:number|null;magnesium:number|null;
};
export type TachyResult={active:boolean;hemodynamics:{status:string;label:string;message:string};classification:string|null;qrsClass:"narrow"|"wide"|"indeterminate";candidates:string[];priority:string|null;redFlags:string[];warnings:string[];missing:string[];preexcitedAf?:boolean;plan:string[];diagnosticReasoning:string[];contraindicatedDrugCandidates:string[];clinicalPearls:string[]};
export const TACHYCARDIA_THRESHOLD_BPM:number;
export const WIDE_QRS_THRESHOLD_MS:number;
export function evaluateHemodynamics(input:TachyInput):TachyResult["hemodynamics"];
export function classifyTachyarrhythmia(input:TachyInput):TachyResult;
