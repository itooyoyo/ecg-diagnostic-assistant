import type {EcgRuleEvaluation,EcgRuleStatus} from "@/types/ecg-rule";

export type ExistingRuleSnapshot={
  status:EcgRuleStatus;
  matchedConditions?:string[];
  missingInputs?:string[];
  conflictingInputs?:string[];
  competingRuleIds?:string[];
  explanationJa:string;
};

/**
 * Normalizes an existing module result without changing its thresholds or decisions.
 * Each module-specific adapter remains responsible for mapping its existing result.
 */
export function adaptExistingRule(snapshot:ExistingRuleSnapshot):EcgRuleEvaluation{
  return {
    status:snapshot.status,
    matchedConditions:snapshot.matchedConditions??[],
    missingInputs:snapshot.missingInputs??[],
    conflictingInputs:snapshot.conflictingInputs??[],
    competingRuleIds:snapshot.competingRuleIds??[],
    explanationJa:snapshot.explanationJa,
  };
}

