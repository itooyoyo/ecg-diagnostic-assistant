export function resolveReviewedFinding(finding) {
  if (finding.status === "accepted") return finding.aiValue;
  if (finding.status === "edited") return finding.clinicianValue;
  return null;
}
