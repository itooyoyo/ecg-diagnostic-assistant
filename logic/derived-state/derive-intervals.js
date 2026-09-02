import {QT_CLASSIFICATION_THRESHOLDS_MS} from "../qt-interpretation/interpret-qt.js";
import {presentObservation,unknownObservation} from "../../types/clinical-observation-runtime.js";
export const PR_THRESHOLDS_MS={shortBelow:120,prolongedAbove:200};
export const QRS_WIDE_THRESHOLD_MS=120;
const valid=value=>Number.isFinite(value)&&value>0;
export function derivePrClass(pr){if(pr.status!=="present")return pr;if(!valid(pr.value))return unknownObservation("PR間隔が医学的に評価可能な正数ではありません");return presentObservation(pr.value<PR_THRESHOLDS_MS.shortBelow?"short":pr.value>PR_THRESHOLDS_MS.prolongedAbove?"prolonged":"normal","derived")}
export function deriveQrsClass(qrs){if(qrs.status!=="present")return qrs;if(!valid(qrs.value))return unknownObservation("QRS幅が医学的に評価可能な正数ではありません");return presentObservation(qrs.value>=QRS_WIDE_THRESHOLD_MS?"wide":"narrow","derived")}
export function deriveQtcClass(qtc){if(qtc.status!=="present")return qtc;if(!valid(qtc.value))return unknownObservation("QTcが医学的に評価可能な正数ではありません");return presentObservation(qtc.value<=QT_CLASSIFICATION_THRESHOLDS_MS.shortMax?"short":qtc.value>=QT_CLASSIFICATION_THRESHOLDS_MS.borderlineMin?"prolonged":"normal","derived")}
