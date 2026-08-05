import {ecgRuleById} from "./rule-registry.js";

const confidenceJa={high:"高",moderate:"中",low:"低",indeterminate:"低"};

/** Derives explanation-only data from existing rule-engine output. */
export function explainCandidate(candidate){
  const usedRules=candidate.ruleIds.map(id=>{
    const rule=ecgRuleById.get(id);
    return {id,requiredInputs:rule?.requiredInputs??[],explanationJa:rule?.descriptionJa??""};
  });
  return {
    ruleConfidence:confidenceJa[candidate.confidence]??"低",
    usedRules,
    judgmentReasons:candidate.supportingFindings.map(item=>item.label),
    exclusionReasons:candidate.contradictingFindings.map(item=>item.label),
    missingInformation:candidate.missingInformation.map(item=>item.label),
    nextChecks:candidate.recommendedChecks.map(item=>item.label),
    recommendedTests:candidate.recommendedChecks.filter(item=>item.category==="test").map(item=>item.label),
    initialActions:candidate.recommendedActions.map(item=>item.label)
  };
}
