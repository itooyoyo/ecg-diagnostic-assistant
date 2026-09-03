import type {StTShadowResult} from "../../types/st-t-shadow";
export function compareStTLegacy(legacyCandidateIds:string[],shadowResult:StTShadowResult):{status:"MATCH"|"REVIEW"|"MAJOR_FAIL";missing:string[];legacyCandidateIds:string[];shadowCandidateIds:string[]};
