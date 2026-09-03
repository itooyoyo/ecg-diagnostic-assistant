import type {StructuralShadowInput} from "../../types/structural-shadow";
import type {LegacyShadowValue} from "./adapt-rate-rhythm";
import type {RateRhythmSource} from "./adapt-rate-rhythm";
export type StructuralShadowSource=RateRhythmSource&{conduction?:Record<string,LegacyShadowValue<unknown>>;context?:Record<string,LegacyShadowValue<unknown>>};
export function adaptStructuralToCanonical(source?:StructuralShadowSource):StructuralShadowInput;
