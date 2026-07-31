import type { EcgInterpretationItem, FactorGroup } from "../../types/interpretation";

export type BuiltInterpretationItem = EcgInterpretationItem & {
  resolvedValue: unknown;
  excludedFromDecision: boolean;
  requiresReview: boolean;
};

export function resolveInterpretationValue(item: EcgInterpretationItem): unknown;
export function buildInterpretation(items: EcgInterpretationItem[]): BuiltInterpretationItem[];
export function groupFindingFactors(item: EcgInterpretationItem): FactorGroup;
