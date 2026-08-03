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
export type AnalysisStatus="idle"|"file_selected"|"uploading"|"analyzing"|"success"|"error"|"not_configured";
export type EcgImageAnalysisResult={
  analysisId:string;
  source:"real_ai"|"mock";
  model?:string;
  extractedAt:string;
  imageQuality:{analyzable:boolean|null;limitations:string[]};
  measurements:{heartRateBpm:number|null;rhythm:string|null;prMs:number|null;qrsMs:number|null;qtMs:number|null;qtcMs:number|null;axisDegrees:number|null};
  findings:{pWave:unknown;qrs:unknown;st:unknown;tWave:unknown;uWave:unknown;ectopy:unknown;rWaveProgression?:unknown;qWave?:unknown;leadPlacement?:unknown;regularity?:unknown};
  confidence:{overall:number|null;perField:Record<string,number|null>};
  limitations:string[];
};
export type AnalysisProcessState={status:AnalysisStatus;progressMessage:string;errorMessage:string|null;startedAt:string|null;completedAt:string|null};
