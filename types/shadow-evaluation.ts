import type {ObservationState,QrsWidthCategory,RateClass} from "./clinical-observation";

export type ShadowEvidenceStrength="high_specificity"|"moderate"|"weak_contradiction";
export type ShadowEvidence={field:string;label:string;strength:ShadowEvidenceStrength};
export type ShadowCandidateStatus="supported"|"possible"|"insufficient_data";
export type ShadowCandidateEvaluation={candidateId:string;status:ShadowCandidateStatus;dangerTier:0|1|2;score?:number;supporting:ShadowEvidence[];contradicting:ShadowEvidence[];missing:string[]};
export type RhythmRegularity="regular"|"irregular"|"regularly_irregular";
export type PqrsRelationship="one_to_one"|"junctional_compatible"|"abnormal";
export type CanonicalRhythmState={
  regularity:ObservationState<RhythmRegularity>;
  pWavesPresent:ObservationState<boolean>;
  pBeforeEveryQrs:ObservationState<boolean>;
  qrsAfterEveryP:ObservationState<boolean>;
  variableRr:ObservationState<boolean>;
  flutterActivity:ObservationState<boolean>;
  multiplePMorphologies:ObservationState<boolean>;
  avDissociation:ObservationState<boolean>;
  captureBeat:ObservationState<boolean>;
  fusionBeat:ObservationState<boolean>;
  preExcitation:ObservationState<boolean>;
  afSuspicion:ObservationState<boolean>;
  pQrsRelationship:ObservationState<PqrsRelationship>;
};
export type RateRhythmShadowInput={rateClass:ObservationState<RateClass>;qrsWidth:ObservationState<QrsWidthCategory>;rhythm:CanonicalRhythmState;clinical:{hypotensionOrShock:ObservationState<boolean>;syncope:ObservationState<boolean>;cardiacArrest:ObservationState<boolean>;electrolyteAbnormality:ObservationState<boolean>};vf:ObservationState<boolean>};
export type ShadowRateRhythmResult={rateClass:ObservationState<RateClass>;sinusPattern:"sinus_pattern_supported"|"sinus_pattern_uncertain";candidates:ShadowCandidateEvaluation[];emergencyPatterns:string[]};
