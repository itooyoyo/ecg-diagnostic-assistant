import type {ObservationState,PrClass,QrsClass,QtcClass} from "../../types/clinical-observation";
export const PR_THRESHOLDS_MS:Readonly<{shortBelow:120;prolongedAbove:200}>;export const QRS_WIDE_THRESHOLD_MS:120;
export function derivePrClass(value:ObservationState<number>):ObservationState<PrClass>;
export function deriveQrsClass(value:ObservationState<number>):ObservationState<QrsClass>;
export function deriveQtcClass(value:ObservationState<number>):ObservationState<QtcClass>;
