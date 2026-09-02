import type {ConductionShadowInput} from "../../types/conduction-shadow";
import type {LegacyShadowValue} from "./adapt-rate-rhythm";
export type ConductionShadowSource={heartRateBpm?:number|null;heartRateAssessment?:"present"|"unknown"|"not_assessed";prMs?:number|null;prAssessment?:"present"|"unknown"|"not_assessed";prCategory?:"short"|"normal"|"prolonged"|"indeterminate"|null;qrsMs?:number|null;qrsAssessment?:"present"|"unknown"|"not_assessed";qrsCategory?:"narrow"|"wide"|"rbbb"|"lbbb"|"indeterminate"|null;clinical?:Record<string,LegacyShadowValue<boolean>>;conduction?:Record<string,LegacyShadowValue<unknown>>};
export function adaptConductionToCanonical(source?:ConductionShadowSource):ConductionShadowInput;
