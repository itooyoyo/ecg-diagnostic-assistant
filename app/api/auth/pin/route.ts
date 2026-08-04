import { NextResponse } from "next/server";
import { ECG_ATTEMPT_COOKIE, ECG_SESSION_COOKIE, PIN_LOCK_SECONDS, SESSION_MAX_AGE_SECONDS, cookieOptions, createAttemptToken, createSessionToken, getAuthConfiguration, hashClientAddress, parseCookie, readAttemptToken, safePinEqual } from "@/lib/auth/ecg-auth";
import { currentPinState, registerPinFailure, resetPinFailures } from "@/lib/auth/rate-limits";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};

export async function POST(request:Request){
  const requestId=crypto.randomUUID().slice(0,8);const config=getAuthConfiguration();
  if(!config.configured)return NextResponse.json({ok:false,error:{code:"AUTH_NOT_CONFIGURED",message:"管理者による認証設定が完了していません。"}},{status:503,headers});
  const address=(request.headers.get("x-forwarded-for")??"unknown").split(",")[0].trim();const key=hashClientAddress(config.secret,address);
  const cookieState=readAttemptToken(parseCookie(request,ECG_ATTEMPT_COOKIE),config.secret,key);const state=currentPinState(key,cookieState);
  if(state.lockedUntil>Date.now()){console.warn("[ECG Auth] locked",{requestId,locked:true});return NextResponse.json({ok:false,error:{code:"PIN_LOCKED",message:"しばらく待ってから再試行してください。"}},{status:429,headers:{...headers,"Retry-After":String(Math.ceil((state.lockedUntil-Date.now())/1000))}})}
  let pin="";try{const body=await request.json() as {pin?:unknown};if(typeof body.pin==="string")pin=body.pin}catch{}
  if(!safePinEqual(pin,config.pin)){
    const failed=registerPinFailure(key,state);console.warn("[ECG Auth] failed",{requestId,locked:failed.lockedUntil>0});
    const response=NextResponse.json({ok:false,error:{code:"INVALID_PIN",message:"PINコードが正しくありません。"}},{status:401,headers});
    response.cookies.set(ECG_ATTEMPT_COOKIE,createAttemptToken(config.secret,{...failed,ipHash:key}),cookieOptions(PIN_LOCK_SECONDS));return response;
  }
  resetPinFailures(key);console.info("[ECG Auth] success",{requestId,locked:false});
  const response=NextResponse.json({ok:true},{headers});response.cookies.set(ECG_SESSION_COOKIE,createSessionToken(config.secret),cookieOptions(SESSION_MAX_AGE_SECONDS));response.cookies.set(ECG_ATTEMPT_COOKIE,"",cookieOptions(0));return response;
}
