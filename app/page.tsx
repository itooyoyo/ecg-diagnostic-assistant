import { cookies } from "next/headers";
import { EcgAuthGate } from "@/components/auth/EcgAuthGate";
import { ECG_SESSION_COOKIE, getAuthConfiguration, verifySessionToken } from "@/lib/auth/ecg-auth";

export default async function Home() {
  const config=getAuthConfiguration();const cookieStore=await cookies();
  const session=config.configured?verifySessionToken(cookieStore.get(ECG_SESSION_COOKIE)?.value,config.secret):{status:"missing" as const};
  return <EcgAuthGate initialAuthenticated={session.status==="valid"} configured={config.configured}/>;
}
