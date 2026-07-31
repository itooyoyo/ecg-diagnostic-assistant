export type QualityKey = "allLeads"|"leadLabels"|"waveformsComplete"|"speedVisible"|"gainVisible"|"gridVisible"|"inFocus"|"lowBlur"|"noGlare"|"noShadow"|"lowTilt"|"lowPerspective"|"multipleBeats"|"privacyChecked";
export type QualityState = Record<QualityKey, boolean>;
export type ReviewStatus = "accepted"|"edited"|"rejected"|"indeterminate";
export type MeasuredValue = { value:number|null; unit:string; confidence:number; unmeasurable:boolean };
export type LeadName = "I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";
export type ObjectiveFindings = {
  heartRate: MeasuredValue; rhythm:string; regularity:string; pWavePresent:boolean|null;
  pWaveMorphology:string; pQrsRelationship:string; prInterval:MeasuredValue; qrsDuration:MeasuredValue;
  qtInterval:MeasuredValue; qtc:MeasuredValue; qtcFormula:string; axis:string; rWaveProgression:string;
  pathologicQWaves:string; stElevation:string; stDepression:string; tWaveAbnormality:string; uWave:string;
  ectopy:string; pacedRhythm:boolean|null; artifact:string; leadPlacementConcern:string;
  confidence:number; analysisLimitations:string[]; leadFindings:Record<LeadName,Record<string,unknown>>;
};
export type ReviewedFinding<T=string> = { aiValue:T; clinicianValue:T|null; status:ReviewStatus };
export type EvidenceSource = { sourceOrganization:"JCS"|"JHRS"|"AHA/ACC/HRS"|"ESC"; sourceTitle:string; publicationYear:number; section:string; url:string; evidenceType:"guideline"|"statement"|"peer-reviewed" };
