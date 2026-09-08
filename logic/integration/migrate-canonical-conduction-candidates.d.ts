import type {ConductionShadowInput,ConductionShadowResult} from "../../types/conduction-shadow";
import type {IntegratedInterpretation} from "../../types/integrated-interpretation";
export function migrateCanonicalConductionCandidates(input:{enabled:boolean;legacyResult:IntegratedInterpretation;shadowInput:ConductionShadowInput}):{result:IntegratedInterpretation;evaluation:ConductionShadowResult|null;migratedCandidateIds:string[]};
