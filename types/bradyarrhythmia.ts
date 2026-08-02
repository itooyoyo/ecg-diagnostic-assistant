import type { EvidenceSource, FindingFactor, UrgencyLevel } from "@/types/interpretation";

export type HemodynamicStatus="stable"|"potentially_unstable"|"unstable"|"indeterminate";
export type Ternary=boolean|null;
export type BradyClassification="no_bradycardia"|"physiologic_sinus_bradycardia_candidate"|"sinus_bradycardia_candidate"|"sinus_pause_candidate"|"sinoatrial_block_candidate"|"sinus_node_dysfunction_candidate"|"first_degree_av_block"|"mobitz_i_candidate"|"mobitz_ii_candidate"|"two_to_one_av_block"|"high_grade_av_block_candidate"|"complete_av_block_candidate"|"av_dissociation_uncertain"|"af_slow_ventricular_response"|"indeterminate";
export type BradyInput={
  ventricularRateBpm:number|null;atrialRateBpm:number|null;rateRegularity:"regular"|"regularly_irregular"|"irregular"|"indeterminate";
  pWavePresence:"present"|"absent"|"intermittent"|"hidden"|"indeterminate";sinusMorphology:"sinus"|"non_sinus"|"uncertain";hiddenInQrs:Ternary;hiddenInTWave:Ternary;
  pToQrsRelationship:"one_to_one"|"two_to_one"|"three_to_one"|"variable_conduction"|"av_dissociation"|"indeterminate";
  prIntervalsMs:number[];prPattern:"normal"|"prolonged_constant"|"progressive_prolongation"|"constant_before_dropped_qrs"|"variable"|"not_measurable"|"indeterminate";
  droppedQrs:Ternary;multipleNonconductedP:Ternary;ppRegular:Ternary;qrsWidthMs:number|null;escapeRhythm:"none"|"atrial_escape"|"junctional_escape"|"ventricular_escape"|"paced_rhythm"|"indeterminate";
  pausePresent:Ternary;pauseDurationMs:number|null;expectedPWaveMissing:Ternary;pauseMultipleOfBaselinePp:"yes"|"no"|"uncertain";symptomsDuringPause:Ternary;
  adverseSigns:{alteredMentalStatus:Ternary;syncope:Ternary;presyncope:Ternary;hypotension:Ternary;shockSigns:Ternary;ischemicChestDiscomfort:Ternary;acuteHeartFailure:Ternary;hypoxemia:Ternary;poorPerfusion:Ternary};
  symptomCorrelation:"recorded_during_symptoms"|"unknown"|"normal_rate_during_symptoms"|"asymptomatic"|"indeterminate";
  athlete:boolean;sleeping:boolean;betaBlocker:boolean;avNodalDrug:boolean;hypothyroidism:boolean;hypothermia:boolean;inferiorIschemia:boolean;anteriorIschemia:boolean;highPotassium:boolean;lowPotassium:boolean;lowMagnesium:boolean;qtMarkedProlongation:boolean;rOnTCandidate:boolean;polymorphicPvc:boolean;atrialFibrillation:boolean;atrialFlutter:boolean;artifactConcern:boolean;pacBlockedByPrematureAtrialBeat:boolean;newConductionDisease:boolean;bundleBranchBlock:boolean;
  clinicianClassification:"auto"|BradyClassification;
};
export type BradyInterpretation={classification:BradyClassification;hemodynamicStatus:HemodynamicStatus;clinicallyRelevantBradycardia:"present"|"absent"|"context_dependent"|"indeterminate";urgency:UrgencyLevel;redFlags:string[];diagnosticReasoning:string[];possibleFactors:FindingFactor[];mustNotMiss:FindingFactor[];additionalChecks:string[];nextActions:string[];pacingEvaluation:string[];clinicalPearls:string[];warnings:string[];limitations:string[];sources:EvidenceSource[]};
