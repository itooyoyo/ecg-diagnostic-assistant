import type { FindingFactor } from "@/types/interpretation";
import { interpretationSources } from "./sources";

export const interpretationFactors: Record<string, FindingFactor> = {
  technicalQuality: {
    id: "technical-quality",
    label: "記録条件・アーチファクトの影響",
    category: "technical",
    priority: "high",
    supportingInputs: ["撮影品質チェック"],
    contradictingInputs: [],
    requiredInputs: ["紙送り速度", "感度", "電極装着"],
    isRedFlag: false,
    sources: [interpretationSources.ahaStandardization],
  },
  ischemicContext: {
    id: "ischemic-context",
    label: "虚血性変化の可能性",
    category: "ischemia",
    priority: "high",
    supportingInputs: ["ST変化", "T波変化"],
    contradictingInputs: ["前回心電図で不変"],
    requiredInputs: ["症状", "発症時刻", "前回心電図", "トロポニン"],
    isRedFlag: false,
    sources: [interpretationSources.ahaStandardization],
  },
  ventricularRisk: {
    id: "ventricular-risk",
    label: "致死性心室性不整脈リスク",
    category: "other",
    priority: "high",
    supportingInputs: ["QT・QTc異常", "心室性期外収縮"],
    contradictingInputs: [],
    requiredInputs: ["失神", "薬歴", "K", "Ca", "Mg"],
    isRedFlag: true,
    sources: [
      interpretationSources.jcsArrhythmia,
      interpretationSources.escVentricularArrhythmia,
    ],
  },
  electrolyteContext: {
    id: "electrolyte-context",
    label: "電解質異常の可能性",
    category: "electrolyte",
    priority: "medium",
    supportingInputs: ["再分極異常"],
    contradictingInputs: [],
    requiredInputs: ["K", "Ca", "Mg", "腎機能"],
    isRedFlag: false,
    sources: [interpretationSources.jcsArrhythmia],
  },
};
