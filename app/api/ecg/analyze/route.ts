import { makeAnalysisError, publicErrorDetail } from "@/lib/ecg-image/analysis-errors";
import { ECG_SESSION_COOKIE, getAuthConfiguration, parseCookie, verifySessionToken } from "@/lib/auth/ecg-auth";
import type { EcgAnalysisErrorDetail } from "@/types/ecg";

export const runtime="nodejs";

export async function POST(request:Request){
  const requestId=crypto.randomUUID();const config=getAuthConfiguration();
  if(!config.configured)return errorResponse(503,makeAnalysisError("AUTH_REQUIRED","管理者による認証設定が完了していません。",{requestId,suggestedActions:["管理者が認証設定を完了するまでお待ちください"]}));
  const session=verifySessionToken(parseCookie(request,ECG_SESSION_COOKIE),config.secret);
  if(session.status!=="valid")return errorResponse(401,makeAnalysisError(session.status==="expired"?"SESSION_EXPIRED":"AUTH_REQUIRED",session.status==="expired"?"認証の有効期限が切れました。":"PIN認証が必要です。",{requestId}));
  return errorResponse(410,makeAnalysisError("LOCAL_MODEL_NOT_AVAILABLE","クラウド画像解析は停止されています。画像は送信せず、ローカル画面から医師入力で続けてください。",{requestId,suggestedActions:["医師入力で続ける"]}));
}
function responseHeaders(requestId:string){return {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Request-Id":requestId}}
function errorResponse(status:number,error:EcgAnalysisErrorDetail){return Response.json({ok:false,error:publicErrorDetail(error)},{status,headers:responseHeaders(error.requestId??"")})}
