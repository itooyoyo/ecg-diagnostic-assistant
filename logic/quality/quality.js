export const requiredQualityKeys = ["allLeads","waveformsComplete","inFocus"];
export function evaluateQuality(q) {
  const missingCritical = requiredQualityKeys.filter((key) => !q[key]);
  if (missingCritical.length) return { grade:"C", canAnalyze:false, message:"解析不適切・再撮影推奨" };
  const warnings = Object.values(q).filter((value) => !value).length;
  if (warnings) return { grade:"B", canAnalyze:true, message:"注意付きで解析可能" };
  return { grade:"A", canAnalyze:true, message:"解析可能" };
}
