import { NextResponse } from "next/server";
import { ECG_ANALYSIS_GATE_COOKIE, ECG_ATTEMPT_COOKIE, ECG_SESSION_COOKIE, cookieOptions } from "@/lib/auth/ecg-auth";
export async function POST(){const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});for(const name of [ECG_SESSION_COOKIE,ECG_ATTEMPT_COOKIE,ECG_ANALYSIS_GATE_COOKIE])response.cookies.set(name,"",cookieOptions(0));return response}
