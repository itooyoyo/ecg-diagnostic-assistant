/** Normalize an existing result without changing its thresholds or decisions. */
export function adaptExistingRule(snapshot){return {status:snapshot.status,matchedConditions:snapshot.matchedConditions??[],missingInputs:snapshot.missingInputs??[],conflictingInputs:snapshot.conflictingInputs??[],competingRuleIds:snapshot.competingRuleIds??[],explanationJa:snapshot.explanationJa}}
