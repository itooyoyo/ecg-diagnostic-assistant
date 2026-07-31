import type { EvidenceSource, FindingFactor, UrgencyLevel } from "./interpretation";

export type EcgLead = "I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6"|"V3R"|"V4R"|"V5R"|"V6R"|"V7"|"V8"|"V9";
export type StandardEcgLead = Extract<EcgLead,"I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6">;
export type StDirection = "elevation"|"depression"|"isoelectric"|"indeterminate";
export type StMorphology = "horizontal"|"upsloping"|"downsloping"|"convex"|"concave"|"coved"|"saddleback"|"scooped"|"indeterminate";
export type StMeasurementPoint = "j_point"|"j_plus_20"|"j_plus_40"|"j_plus_60"|"j_plus_80"|"unknown";
export type StBaselineReference = "tp_segment"|"pr_segment"|"other"|"uncertain";

export type StMeasurement = {
  lead: EcgLead;
  direction: StDirection;
  amplitudeMm: number|null;
  amplitudeMv: number|null;
  measurementPoint: StMeasurementPoint;
  morphology: StMorphology;
  baselineReference: StBaselineReference;
  clinicianConfirmed: boolean;
  confidence: number|null;
  limitations: string[];
};

export type ReciprocalFinding = {
  status: "present"|"absent"|"indeterminate";
  leads: EcgLead[];
  amplitudeMm: number|null;
  dynamicChange: boolean|null;
};

export type StClinicalContext = {
  age: number|null;
  sex: "male"|"female"|null;
  ischemicSymptoms: boolean|null;
  symptomOnset: string;
  hemodynamicInstability: boolean;
  hypotension: boolean;
  jugularVenousDistension: boolean;
  pulmonaryCongestionAbsent: boolean;
  troponinDynamicChange: boolean|null;
  posteriorOcclusionSuspected: boolean;
  highRWaveV1toV3: boolean;
  earlyRepolarizationSuspected: boolean;
  heartRate: number|null;
};

export type StPreconditions = {
  imageQualityAdequate: boolean;
  paperSpeedKnown: boolean;
  gainKnown: boolean;
  baselineStable: boolean;
  noiseAcceptable: boolean;
  leadLabelsKnown: boolean;
  placementConcern: boolean;
  v1v2HighPlacementConcern: boolean;
};

export type StInterpretationInput = {
  leadMeasurements: StMeasurement[];
  reciprocalFinding: ReciprocalFinding;
  dynamicChange: boolean|null;
  priorEcgAvailable: boolean;
  priorComparison: "unchanged"|"new"|"worsened"|"improved"|"transient"|"indeterminate";
  qrsContext: "narrow"|"rbbb"|"lbbb"|"paced"|"lvh"|"preexcitation"|"other"|"unknown";
  preconditions: StPreconditions;
  clinical: StClinicalContext;
};

export type StInterpretation = {
  leadMeasurements: StMeasurement[];
  contiguousLeadGroups: string[];
  reciprocalChanges: ReciprocalFinding[];
  dynamicChange: boolean|null;
  priorEcgAvailable: boolean;
  qrsContext: StInterpretationInput["qrsContext"];
  overallClassification: "no_significant_change"|"st_elevation"|"st_depression"|"mixed"|"secondary_repolarization_change"|"indeterminate";
  leadResults: Array<{lead:EcgLead;significant:boolean|null;reason:string}>;
  urgency: UrgencyLevel;
  redFlags: string[];
  possibleFactors: FindingFactor[];
  mustNotMiss: FindingFactor[];
  additionalChecks: string[];
  nextActions: string[];
  suggestedAdditionalLeads: Array<{type:"right-sided"|"posterior";leads:string[];emphasizedLead?:string;message:string}>;
  warnings: string[];
  limitations: string[];
  sources: EvidenceSource[];
};
