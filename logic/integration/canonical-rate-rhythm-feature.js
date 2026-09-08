export const ECG_CANONICAL_RATE_RHYTHM_FLAG="ECG_CANONICAL_RATE_RHYTHM_ENABLED";
export function canonicalRateRhythmEnabled(value){return typeof value==="string"&&["1","true","on","yes"].includes(value.trim().toLowerCase())}
