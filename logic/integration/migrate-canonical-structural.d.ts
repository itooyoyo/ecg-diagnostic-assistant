import type {StructuralShadowInput,StructuralShadowResult} from "../../types/structural-shadow";
import type {IntegratedInterpretation} from "../../types/integrated-interpretation";
export function migrateCanonicalStructural(input:{enabled:boolean;legacyResult:IntegratedInterpretation;shadowInput:StructuralShadowInput}):{result:IntegratedInterpretation;evaluation:StructuralShadowResult|null;axisState:StructuralShadowInput["axis"]|null;migratedCandidateIds:string[]};
