import type {QtElectrolyteShadowInput,QtElectrolyteShadowResult} from "../../types/qt-electrolyte-shadow";
import type {IntegratedInterpretation} from "../../types/integrated-interpretation";
export function migrateCanonicalQtElectrolyte(input:{enabled:boolean;legacyResult:IntegratedInterpretation;shadowInput:QtElectrolyteShadowInput}):{result:IntegratedInterpretation;evaluation:QtElectrolyteShadowResult|null;migratedCandidateIds:string[]};
