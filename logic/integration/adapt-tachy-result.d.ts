import type {TachyResult} from "../tachyarrhythmia/classify.js";
export function adaptTachyResultToIntegratedEcg(result:TachyResult|null):Record<string,boolean|null>;
