export function suggestAdditionalLeads(findings) {
  const suggestions = [];
  const suggestRight = findings.inferiorStElevation || findings.suspectedRVOcclusion;
  const suggestPosterior = findings.stDepressionV1toV3 || findings.suspectedPosteriorOcclusion;

  if (suggestRight) {
    suggestions.push({
      type: "right-sided",
      leads: ["V3R", "V4R", "V5R", "V6R"],
      emphasizedLead: "V4R",
      urgentContext: Boolean(findings.inferiorStElevation && findings.hypotension),
      message: "右室梗塞を評価するためV4Rを含む右側胸部誘導を追加してください。",
    });
  }
  if (suggestPosterior) {
    suggestions.push({
      type: "posterior",
      leads: ["V7", "V8", "V9"],
      emphasizedLead: null,
      urgentContext: false,
      message: "後壁虚血を評価するためV7～V9を追加してください。",
    });
  }
  return suggestions;
}
