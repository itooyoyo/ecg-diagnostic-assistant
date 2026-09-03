import type {QtElectrolyteShadowInput} from "../../types/qt-electrolyte-shadow";
import type {Assessment} from "../integration/adapt-clinical-review";
import type {LegacyShadowValue} from "./adapt-rate-rhythm";
export type QtElectrolyteShadowSource={heartRateBpm?:number|null;heartRateAssessment?:Assessment;qrsMs?:number|null;qrsAssessment?:Assessment;qtcMs?:number|null;qtcAssessment?:Assessment;context?:Record<string,LegacyShadowValue<unknown>|undefined>};
export function adaptQtElectrolyteToCanonical(source?:QtElectrolyteShadowSource):QtElectrolyteShadowInput;
