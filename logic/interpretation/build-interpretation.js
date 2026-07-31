export function resolveInterpretationValue(item) {
  if (item.status === "accepted") return item.aiValue;
  if (item.status === "edited") return item.clinicianValue;
  return null;
}

export function buildInterpretation(items) {
  return items.map((item) => ({
    ...item,
    resolvedValue: resolveInterpretationValue(item),
    excludedFromDecision: item.status === "rejected",
    requiresReview: item.status === "indeterminate",
    abnormal: item.status === "indeterminate" || item.status === "rejected"
      ? null
      : item.abnormal,
  }));
}

export function groupFindingFactors(item) {
  const factors = [...item.possibleFactors, ...item.mustNotMiss];
  return {
    supported: factors.filter((factor) =>
      factor.supportingInputs.length > 0 &&
      factor.requiredInputs.length === 0
    ),
    possible: factors.filter((factor) =>
      factor.supportingInputs.length > 0 &&
      factor.requiredInputs.length > 0
    ),
    insufficient: factors.filter((factor) =>
      factor.supportingInputs.length === 0
    ),
  };
}
