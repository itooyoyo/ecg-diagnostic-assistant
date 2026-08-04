import { NextResponse } from "next/server";
import { ECG_SESSION_COOKIE, getAuthConfiguration, parseCookie, verifySessionToken } from "@/lib/auth/ecg-auth";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request){const config=getAuthConfiguration();if(!config.configured)return NextResponse.json({authenticated:false},{headers});const result=verifySessionToken(parseCookie(request,ECG_SESSION_COOKIE),config.secret);return NextResponse.json(result.status==="valid"?{authenticated:true,expiresAt:new Date(result.session.exp*1000).toISOString()}:{authenticated:false},{headers})}
