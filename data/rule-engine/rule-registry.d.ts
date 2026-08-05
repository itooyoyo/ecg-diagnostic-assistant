import type {EcgRule,EcgRuleContext,EcgRuleEvaluation} from "../../types/ecg-rule";
export const ecgRuleRegistry:EcgRule[];
export const ecgRuleById:Map<string,EcgRule>;
export function evaluateRule(id:string,context:EcgRuleContext):EcgRuleEvaluation;
