import type {ConductionShadowResult} from "../../types/conduction-shadow";
export function compareConductionLegacy(legacyCandidateIds:string[],shadowResult:ConductionShadowResult):{status:"MATCH"|"REVIEW"|"MAJOR_FAIL";missing:string[];legacyCandidateIds:string[];shadowCandidateIds:string[]};
