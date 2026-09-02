import {presentObservation,unknownObservation} from "../../types/clinical-observation-runtime.js";
export const RATE_THRESHOLDS_BPM={bradyBelow:60,tachyAtOrAbove:100};
export function deriveRateClass(heartRate){if(heartRate.status!=="present")return heartRate;if(!Number.isFinite(heartRate.value)||heartRate.value<=0)return unknownObservation("心拍数が医学的に評価可能な正数ではありません");return presentObservation(heartRate.value<RATE_THRESHOLDS_BPM.bradyBelow?"bradycardia":heartRate.value>=RATE_THRESHOLDS_BPM.tachyAtOrAbove?"tachycardia":"normal","derived")}
