import type {StTShadowInput,StMorphology} from "../../types/st-t-shadow";
import type {LegacyShadowValue} from "./adapt-rate-rhythm";
import type {LegacyStLeadMeasurement} from "../derived-state/derive-st-distribution";
export type StTShadowSource={stMeasurements?:LegacyStLeadMeasurement[];context?:Record<string,LegacyShadowValue<boolean|StMorphology>>};
export function adaptStTToCanonical(source?:StTShadowSource):StTShadowInput;
