export type ObservationSource="physician"|"derived";

export type ObservationState<T>=
  |{status:"present";value:T;source:ObservationSource}
  |{status:"absent";source:"physician"}
  |{status:"unknown";reason?:string}
  |{status:"not_assessed"};

export type RateClass="bradycardia"|"normal"|"tachycardia";
export type PrClass="short"|"normal"|"prolonged";
export type QrsClass="narrow"|"borderline"|"wide";
export type QtcClass="short"|"normal"|"prolonged";
export type QrsWidthCategory="narrow"|"wide"|"rbbb"|"lbbb";

export type StandardEcgLead="I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";
export type StLeadValue="elevation"|"depression"|"no_change";
export type StLeadObservations=Record<StandardEcgLead,ObservationState<StLeadValue>>;
export type StTerritory="inferior"|"anterior"|"septal"|"lateral"|"diffuse"|"right_precordial"|"posterior_suspicion";

export type EcgMeasurements={
  heartRateBpm:ObservationState<number>;
  prMs:ObservationState<number>;
  qrsMs:ObservationState<number>;
  qtcMs:ObservationState<number>;
};

export type EcgDerivedState={
  rateClass:ObservationState<RateClass>;
  prClass:ObservationState<PrClass>;
  qrsClass:ObservationState<QrsClass>;
  qtcClass:ObservationState<QtcClass>;
  stTerritories:ObservationState<StTerritory[]>;
  contiguousPattern:ObservationState<"contiguous"|"non_contiguous">;
  reciprocalPattern:ObservationState<boolean>;
};

export type ClinicalContextKey="chestPain"|"dyspnea"|"palpitations"|"syncope"|"hypotensionOrShock"|"fever"|"dialysis"|"pacemaker"|"electrolyteAbnormality";
export type CanonicalClinicalContext=Record<ClinicalContextKey,ObservationState<boolean>>;

export const notAssessed=<T>():ObservationState<T>=>({status:"not_assessed"});
export const unknownObservation=<T>(reason?:string):ObservationState<T>=>reason?{status:"unknown",reason}:{status:"unknown"};
export const presentObservation=<T>(value:T,source:ObservationSource="physician"):ObservationState<T>=>({status:"present",value,source});
export const absentObservation=<T>():ObservationState<T>=>({status:"absent",source:"physician"});
