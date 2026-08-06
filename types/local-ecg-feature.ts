import type { LeadName } from "@/types/ecg";

export type LocalFeatureConfidence="high"|"medium"|"low"|"indeterminate";
export type LocalFeatureReviewStatus="pending"|"accepted"|"modified"|"rejected"|"indeterminate";
export type LocalFeatureType=
  | "lead_layout" | "image_quality" | "rr_regular" | "rr_irregular"
  | "qrs_narrow_candidate" | "qrs_wide_candidate" | "rsr_prime_candidate"
  | "deep_s_candidate" | "tall_r_candidate" | "poor_r_progression_candidate"
  | "abnormal_q_candidate" | "st_elevation_candidate" | "st_depression_candidate"
  | "t_inversion_candidate" | "peaked_t_candidate" | "giant_negative_t_candidate"
  | "qt_prolongation_candidate";

export type LocalEcgFeatureCandidate={
  id:string;featureType:LocalFeatureType;lead?:LeadName;leadGroup?:LeadName[];
  direction?:"positive"|"negative"|"biphasic";
  estimatedMagnitude?:number|null;estimatedUnit?:"mm"|"ms"|null;
  confidence:LocalFeatureConfidence;
  evidence:{imageRegion?:{x:number;y:number;width:number;height:number};explanationJa:string;limitations:string[]};
  reviewStatus:LocalFeatureReviewStatus;physicianValue?:unknown;physicianComment?:string;
};

export type ReviewedLocalFeature={
  id:string;featureType:LocalFeatureType;lead?:LeadName;leadGroup?:LeadName[];value:unknown;
  reviewStatus:"accepted"|"modified";imageConfidence:LocalFeatureConfidence;
};
