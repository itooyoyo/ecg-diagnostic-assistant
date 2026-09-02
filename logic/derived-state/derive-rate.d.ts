import type {ObservationState,RateClass} from "../../types/clinical-observation";
export const RATE_THRESHOLDS_BPM:Readonly<{bradyBelow:60;tachyAtOrAbove:100}>;
export function deriveRateClass(heartRate:ObservationState<number>):ObservationState<RateClass>;
