export const ECG_CANONICAL_MEASUREMENTS_FLAG="ECG_CANONICAL_MEASUREMENTS_ENABLED";

export function canonicalMeasurementsEnabled(value){
  return typeof value==="string"&&["1","true","on","yes"].includes(value.trim().toLowerCase());
}
