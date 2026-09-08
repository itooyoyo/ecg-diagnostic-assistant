import { cookies } from "next/headers";
import { EcgAuthGate } from "@/components/auth/EcgAuthGate";
import { ECG_SESSION_COOKIE, getAuthConfiguration, verifySessionToken } from "@/lib/auth/ecg-auth";
import { canonicalMeasurementsEnabled } from "@/logic/integration/canonical-measurement-feature.js";
import { canonicalRateRhythmEnabled } from "@/logic/integration/canonical-rate-rhythm-feature.js";
import { canonicalBasicRhythmCandidatesEnabled } from "@/logic/integration/canonical-basic-rhythm-candidates-feature.js";
import { canonicalConductionCandidatesEnabled } from "@/logic/integration/canonical-conduction-candidates-feature.js";
import { canonicalConductionEmergencyEnabled } from "@/logic/integration/canonical-conduction-emergency-feature.js";
import { canonicalStructuralEnabled } from "@/logic/integration/canonical-structural-feature.js";

export default async function Home() {
  const config=getAuthConfiguration();const cookieStore=await cookies();
  const session=config.configured?verifySessionToken(cookieStore.get(ECG_SESSION_COOKIE)?.value,config.secret):{status:"missing" as const};
  return <EcgAuthGate initialAuthenticated={session.status==="valid"} configured={config.configured} canonicalMeasurementsEnabled={canonicalMeasurementsEnabled(process.env.ECG_CANONICAL_MEASUREMENTS_ENABLED)} canonicalRateRhythmEnabled={canonicalRateRhythmEnabled(process.env.ECG_CANONICAL_RATE_RHYTHM_ENABLED)} canonicalBasicRhythmCandidatesEnabled={canonicalBasicRhythmCandidatesEnabled(process.env.ECG_CANONICAL_BASIC_RHYTHM_CANDIDATES_ENABLED)} canonicalConductionCandidatesEnabled={canonicalConductionCandidatesEnabled(process.env.ECG_CANONICAL_CONDUCTION_CANDIDATES_ENABLED)} canonicalConductionEmergencyEnabled={canonicalConductionEmergencyEnabled(process.env.ECG_CANONICAL_CONDUCTION_EMERGENCY_ENABLED)} canonicalStructuralEnabled={canonicalStructuralEnabled(process.env.ECG_CANONICAL_STRUCTURAL_ENABLED)}/>;
}
