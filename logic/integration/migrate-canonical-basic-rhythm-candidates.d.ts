import type {IntegratedInterpretation} from "../../types/integrated-interpretation";
import type {RateRhythmShadowInput,ShadowRateRhythmResult} from "../../types/shadow-evaluation";
export function migrateCanonicalBasicRhythmCandidates(input:{enabled:boolean;legacyResult:IntegratedInterpretation;shadowInput:RateRhythmShadowInput}):{result:IntegratedInterpretation;evaluation:ShadowRateRhythmResult|null;migratedCandidateIds:string[]};
