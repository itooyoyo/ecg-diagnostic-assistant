import { ANALYSIS_COOLDOWN_SECONDS, PIN_LOCK_SECONDS } from "@/lib/auth/ecg-auth";

type PinState={count:number;lockedUntil:number};
const pinFailures=new Map<string,PinState>();
const analysisStarts=new Map<string,number>();

export function registerPinFailure(key:string,cookieState:PinState,nowMs=Date.now()){
  const current=pinFailures.get(key);
  const count=Math.max(current?.count??0,cookieState.count)+1;
  const lockedUntil=count>=5?nowMs+PIN_LOCK_SECONDS*1000:0;
  const next={count,lockedUntil};pinFailures.set(key,next);return next;
}
export function currentPinState(key:string,cookieState:PinState,nowMs=Date.now()){
  const current=pinFailures.get(key);const state=(current?.count??0)>=cookieState.count?current??cookieState:cookieState;
  if(state.lockedUntil>nowMs)return state;
  if(state.lockedUntil){pinFailures.delete(key);return {count:0,lockedUntil:0}}
  return state;
}
export function resetPinFailures(key:string){pinFailures.delete(key)}

export function reserveAnalysis(sid:string,cookieLastAt:number|null,nowMs=Date.now()){
  const lastAt=Math.max(analysisStarts.get(sid)??0,cookieLastAt??0);
  const retryAfterMs=ANALYSIS_COOLDOWN_SECONDS*1000-(nowMs-lastAt);
  if(retryAfterMs>0)return {allowed:false,retryAfterSeconds:Math.ceil(retryAfterMs/1000)} as const;
  analysisStarts.set(sid,nowMs);return {allowed:true,retryAfterSeconds:0} as const;
}
