import type {IntegratedDiagnosticCandidate} from "../../types/integrated-interpretation";

export type CandidateExplanation={
  ruleConfidence:"高"|"中"|"低";
  usedRules:Array<{id:string;requiredInputs:string[];explanationJa:string}>;
  judgmentReasons:string[];
  exclusionReasons:string[];
  missingInformation:string[];
  nextChecks:string[];
  recommendedTests:string[];
  initialActions:string[];
};

export function explainCandidate(candidate:IntegratedDiagnosticCandidate):CandidateExplanation;
