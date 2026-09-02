import type {ShadowRateRhythmResult} from "../../types/shadow-evaluation";
export function compareShadowLegacy(legacyCandidates:Array<string|{candidateId:string;dangerTier?:0|1|2}>,shadowResult:ShadowRateRhythmResult):{status:"MATCH"|"REVIEW"|"MAJOR_FAIL";missing:string[];review:string[];legacyCandidateIds:string[];shadowCandidateIds:string[]};
