import type {ShadowCandidateEvaluation} from "../../types/shadow-evaluation";
export type ShadowResultLike={candidates:ShadowCandidateEvaluation[];emergencyPatterns?:string[]};
export function mergeShadowResults(results:ShadowResultLike[]):{candidates:ShadowCandidateEvaluation[];emergencyPatterns:string[];duplicateCandidateIds:string[]};
export function auditCandidateConsistency(results:ShadowResultLike[]):{duplicateCandidateIds:string[];invalidDangerTiers:string[];conflictingDangerTiers:string[];merged:ReturnType<typeof mergeShadowResults>};
export function auditObservationState(observation:unknown):boolean;
