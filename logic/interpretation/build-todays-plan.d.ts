import type { EcgInterpretationItem, InterpretationPlan } from "../../types/interpretation";

export function buildTodaysPlan(items: EcgInterpretationItem[]): InterpretationPlan;
export function collectRedFlagCategories(items: EcgInterpretationItem[]): Array<{
  id: string;
  label: string;
  category: string;
  note: string;
}>;
