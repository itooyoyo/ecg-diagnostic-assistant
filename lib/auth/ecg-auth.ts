import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const ECG_SESSION_COOKIE = "ecg_app_session";
export const ECG_ATTEMPT_COOKIE = "ecg_pin_attempt";
export const ECG_ANALYSIS_GATE_COOKIE = "ecg_analysis_gate";
export const SESSION_MAX_AGE_SECONDS = 1800;
export const PIN_LOCK_SECONDS = 900;
export const ANALYSIS_COOLDOWN_SECONDS = 10;

type SessionPayload = { kind:"session"; authenticated:true; iat:number; exp:number; sid:string };
type AttemptPayload = { kind:"attempt"; count:number; lockedUntil:number; ipHash:string; exp:number };
type AnalysisPayload = { kind:"analysis"; sid:string; lastAt:number; exp:number };
type SignedPayload = SessionPayload | AttemptPayload | AnalysisPayload;

export type SessionVerification =
  | { status:"valid"; session:SessionPayload }
  | { status:"missing" | "expired" | "invalid" };

export function getAuthConfiguration(env:NodeJS.ProcessEnv=process.env){
  const pin=env.ECG_APP_PIN??"";
  const secret=env.ECG_AUTH_SECRET??"";
  return { configured:/^\d{8,12}$/.test(pin)&&secret.length>=32, pin, secret };
}

export function safePinEqual(input:string, expected:string){
  const left=createHmac("sha256","ecg-pin-comparison").update(input).digest();
  const right=createHmac("sha256","ecg-pin-comparison").update(expected).digest();
  return timingSafeEqual(left,right);
}

export function createSessionToken(secret:string, nowMs=Date.now(), sid=randomUUID()){
  const iat=Math.floor(nowMs/1000);
  return signPayload({kind:"session",authenticated:true,iat,exp:iat+SESSION_MAX_AGE_SECONDS,sid},secret);
}

export function verifySessionToken(token:string|undefined, secret:string, nowMs=Date.now()):SessionVerification{
  if(!token)return {status:"missing"};
  const payload=verifySignedPayload(token,secret);
  if(!payload||payload.kind!=="session"||payload.authenticated!==true||typeof payload.sid!=="string")return {status:"invalid"};
  if(payload.exp<=Math.floor(nowMs/1000))return {status:"expired"};
  return {status:"valid",session:payload};
}

export function createAttemptToken(secret:string,input:{count:number;lockedUntil:number;ipHash:string},nowMs=Date.now()){
  return signPayload({kind:"attempt",...input,exp:Math.floor(nowMs/1000)+PIN_LOCK_SECONDS},secret);
}

export function readAttemptToken(token:string|undefined,secret:string,ipHash:string,nowMs=Date.now()){
  const payload=token?verifySignedPayload(token,secret):null;
  if(!payload||payload.kind!=="attempt"||payload.ipHash!==ipHash||payload.exp<=Math.floor(nowMs/1000))return {count:0,lockedUntil:0};
  return {count:payload.count,lockedUntil:payload.lockedUntil};
}

export function createAnalysisGateToken(secret:string,sid:string,lastAt:number,nowMs=Date.now()){
  return signPayload({kind:"analysis",sid,lastAt,exp:Math.floor(nowMs/1000)+SESSION_MAX_AGE_SECONDS},secret);
}

export function readAnalysisGateToken(token:string|undefined,secret:string,sid:string,nowMs=Date.now()){
  const payload=token?verifySignedPayload(token,secret):null;
  if(!payload||payload.kind!=="analysis"||payload.sid!==sid||payload.exp<=Math.floor(nowMs/1000))return null;
  return payload.lastAt;
}

export function hashClientAddress(secret:string,address:string){return createHmac("sha256",secret).update(address).digest("base64url").slice(0,24)}
export function parseCookie(request:Request,name:string){
  const source=request.headers.get("cookie")??"";
  for(const part of source.split(";")){const index=part.indexOf("=");if(index<0)continue;if(part.slice(0,index).trim()===name)return decodeURIComponent(part.slice(index+1).trim())}
  return undefined;
}
export function cookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge}}
export function serializeHttpOnlyCookie(name:string,value:string,maxAge:number){
  const parts=[`${name}=${encodeURIComponent(value)}`,"Path=/",`Max-Age=${maxAge}`,"HttpOnly","SameSite=Strict"];
  if(process.env.NODE_ENV==="production")parts.push("Secure");return parts.join("; ");
}

function signPayload(payload:SignedPayload,secret:string){
  const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body,secret)}`;
}
function signature(body:string,secret:string){return createHmac("sha256",secret).update(body).digest("base64url")}
function verifySignedPayload(token:string,secret:string):SignedPayload|null{
  const [body,sig,...rest]=token.split(".");
  if(!body||!sig||rest.length)return null;
  const expected=Buffer.from(signature(body,secret));const actual=Buffer.from(sig);
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
  try{return JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as SignedPayload}catch{return null}
}
