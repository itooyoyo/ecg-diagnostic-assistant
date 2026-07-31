import type { EcgInterpretationItem, InterpretationStatus, UrgencyLevel } from "@/types/interpretation";
import { commonInterpretationSources } from "./sources";
import { interpretationFactors } from "./factors";

export const interpretationOrder = [
  ["recording-quality", "記録品質"],
  ["lead-placement", "電極装着"],
  ["heart-rate", "心拍数"],
  ["rhythm", "リズム"],
  ["p-wave", "P波"],
  ["pr-interval", "PR間隔"],
  ["qrs-duration", "QRS幅"],
  ["qrs-morphology", "QRS形態"],
  ["axis", "電気軸"],
  ["r-wave-progression", "R波進行"],
  ["q-wave", "Q波"],
  ["st-change", "ST変化"],
  ["t-wave", "T波"],
  ["qt-qtc", "QT・QTc"],
  ["u-wave", "U波"],
  ["ventricular-ectopy", "心室性期外収縮"],
  ["prior-comparison", "前回心電図との比較"],
  ["integrated-interpretation", "総合読影"],
] as const;

const samples: Partial<Record<string, {
  status: InterpretationStatus;
  abnormal: boolean | null;
  urgency: UrgencyLevel;
  aiValue: string;
  meaning: string[];
  possibleFactors: EcgInterpretationItem["possibleFactors"];
  mustNotMiss: EcgInterpretationItem["mustNotMiss"];
  additionalChecks: string[];
  nextActions: string[];
}>> = {
  "st-change": {
    status: "accepted",
    abnormal: true,
    urgency: "same_day",
    aiValue: "ST変化あり（部位・程度は未判定）",
    meaning: ["再分極変化として臨床背景と併せて評価します。"],
    possibleFactors: [interpretationFactors.ischemicContext, interpretationFactors.technicalQuality],
    mustNotMiss: [],
    additionalChecks: ["症状", "発症時刻", "前回心電図", "トロポニン"],
    nextActions: ["医師が波形と臨床背景を当日中に再評価"],
  },
  "t-wave": {
    status: "indeterminate",
    abnormal: null,
    urgency: "uncertain",
    aiValue: "T波判定保留",
    meaning: ["情報不足のため正常とは扱いません。"],
    possibleFactors: [interpretationFactors.ischemicContext, interpretationFactors.electrolyteContext],
    mustNotMiss: [],
    additionalChecks: ["前回心電図", "K", "症状"],
    nextActions: ["追加情報を確認して再評価"],
  },
  "qt-qtc": {
    status: "edited",
    abnormal: true,
    urgency: "emergency",
    aiValue: "QT・QTc要確認",
    meaning: ["閾値判定は未実装です。医師確認値を優先します。"],
    possibleFactors: [interpretationFactors.electrolyteContext],
    mustNotMiss: [interpretationFactors.ventricularRisk],
    additionalChecks: ["薬歴", "K", "Ca", "Mg", "失神"],
    nextActions: ["致死性不整脈リスクを優先して確認"],
  },
};

export const interpretationItems: EcgInterpretationItem[] = interpretationOrder.map(([id, title]) => {
  const sample = samples[id];
  return {
    id,
    title,
    aiValue: sample?.aiValue ?? "明らかな異常所見なし",
    clinicianValue: sample?.status === "edited" ? "医師修正値（要入力）" : null,
    status: sample?.status ?? "accepted",
    abnormal: sample?.abnormal ?? false,
    confidence: null,
    meaning: sample?.meaning ?? [],
    possibleFactors: sample?.possibleFactors ?? [],
    mustNotMiss: sample?.mustNotMiss ?? [],
    additionalChecks: sample?.additionalChecks ?? [],
    nextActions: sample?.nextActions ?? [],
    urgency: sample?.urgency ?? "routine",
    limitations: ["画像・臨床情報からの確定診断ロジックは未実装です。"],
    sources: commonInterpretationSources,
  };
});
