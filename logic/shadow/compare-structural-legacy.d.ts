import type {StructuralShadowResult} from "../../types/structural-shadow";
export function compareStructuralLegacy(legacyCandidateIds:string[],shadowResult:StructuralShadowResult):{status:"MATCH"|"MAJOR_FAIL";missing:string[];legacyCandidateIds:string[];shadowCandidateIds:string[]};
