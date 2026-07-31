export function placementWarnings(input) {
  const warnings = [];
  if (input.raLaReversal) warnings.push({ code:"RA_LA_REVERSAL", message:"左右上肢電極の逆接続を疑います。電極位置を確認し、再記録してください。" });
  if (input.v1v2High) warnings.push({ code:"V1_V2_HIGH", message:"V1・V2の高位装着による偽性変化の可能性があります。第4肋間を確認して再記録してください。" });
  return warnings;
}
