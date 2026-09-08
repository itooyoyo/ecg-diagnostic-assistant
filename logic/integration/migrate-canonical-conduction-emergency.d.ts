import type {ConductionShadowInput} from "../../types/conduction-shadow";
import type {IntegratedInterpretation} from "../../types/integrated-interpretation";
export function migrateCanonicalConductionEmergency(input:{enabled:boolean;legacyResult:IntegratedInterpretation;shadowInput:ConductionShadowInput}):{result:IntegratedInterpretation;evaluation:import("../../types/conduction-shadow").ConductionShadowResult|null;migratedEmergencyIds:string[]};
