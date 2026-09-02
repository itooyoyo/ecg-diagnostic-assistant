import type {RateRhythmShadowInput} from "../../types/shadow-evaluation";
export type LegacyShadowValue<T>={assessed?:boolean;unknown?:boolean;value?:T|null};
export type RateRhythmSource={heartRateBpm?:number|null;heartRateAssessment?:"present"|"unknown"|"not_assessed";qrsMs?:number|null;qrsAssessment?:"present"|"unknown"|"not_assessed";qrsCategory?:"narrow"|"wide"|"rbbb"|"lbbb"|"indeterminate"|null;clinical?:Record<string,LegacyShadowValue<boolean>>;vf?:LegacyShadowValue<boolean>;rhythm?:Record<string,LegacyShadowValue<unknown>>};
export function adaptRateRhythmToCanonical(source?:RateRhythmSource):RateRhythmShadowInput;
