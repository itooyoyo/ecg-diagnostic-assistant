import { NextResponse, type NextRequest } from "next/server";
import { ECG_SESSION_COOKIE, getAuthConfiguration, verifySessionToken } from "@/lib/auth/ecg-auth";

export function proxy(request:NextRequest){
  const config=getAuthConfiguration();
  if(!config.configured)return authError(503,"AUTH_REQUIRED","管理者による認証設定が完了していません。","管理者が認証設定を完了するまでお待ちください");
  const session=verifySessionToken(request.cookies.get(ECG_SESSION_COOKIE)?.value,config.secret);
  if(session.status==="valid")return NextResponse.next();
  return session.status==="expired"
    ?authError(401,"SESSION_EXPIRED","認証の有効期限が切れました。","PINを再入力してください")
    :authError(401,"AUTH_REQUIRED","PIN認証が必要です。","PINを入力して再度利用してください");
}

function authError(status:number,code:string,userMessage:string,action:string){return NextResponse.json({ok:false,error:{code,userMessage,retryable:false,suggestedActions:[action]}},{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
export const config={matcher:"/api/ecg/:path*"};
