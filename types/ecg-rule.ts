export type EcgRuleCategory=
  |"quality_placement"|"rate_regularity"|"p_wave_atrial"|"pr_pq"|"qrs"|"axis"
  |"r_wave_progression"|"q_wave"|"st"|"t_wave"|"u_wave"|"qt_qtc"
  |"ectopy_r_on_t"|"bradyarrhythmia"|"tachyarrhythmia"|"av_block"
  |"bundle_branch_ivcd"|"wpw_preexcitation"|"brugada_pattern"|"wellens_pattern"
  |"pacing"|"electrolyte_pattern"|"acute_coronary_candidate"
  |"additional_leads_tests"|"urgency_initial_action"|"other";

export type EcgRuleSeverity="information"|"attention"|"urgent"|"emergency";
export type EcgRuleStatus="matched"|"not_matched"|"insufficient_data"|"not_applicable";

export type EcgRuleEvaluation={
  status:EcgRuleStatus;
  matchedConditions:string[];
  missingInputs:string[];
  conflictingInputs:string[];
  competingRuleIds?:string[];
  explanationJa:string;
};

export type EcgRuleContext={
  /** Existing module input/result objects. Adapters must not infer absent values. */
  inputs:Readonly<Record<string,unknown>>;
  results:Readonly<Record<string,unknown>>;
  /** Precomputed output from an existing rule module, normalized by the adapter. */
  evaluations?:Readonly<Record<string,Partial<EcgRuleEvaluation>>>;
};

export type EcgRule={
  id:`ECG-${string}-${string}`;
  version:string;
  category:EcgRuleCategory;
  titleJa:string;
  descriptionJa:string;
  requiredInputs:string[];
  optionalInputs:string[];
  evaluate:(context:EcgRuleContext)=>EcgRuleEvaluation;
  priority:number;
  severity:EcgRuleSeverity;
  outputs:{
    findingCandidates?:string[];
    diagnosisCandidates?:string[];
    differentialCandidates?:string[];
    additionalChecks?:string[];
    recommendedTests?:string[];
    immediateActions?:string[];
  };
  sourceClassification:"guideline"|"standard_statement"|"existing_app_rule"|"user_supplied_rule";
  sourceRefs?:string[];
  limitations:string[];
  implementationFiles:string[];
  testIds:string[];
};
