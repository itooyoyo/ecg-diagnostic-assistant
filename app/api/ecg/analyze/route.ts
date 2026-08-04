import { makeAnalysisError, publicErrorDetail } from "@/lib/ecg-image/analysis-errors";
import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { createECGImageAnalysisService } from "@/lib/ecg-image/server/create-ecg-image-analysis-service";
import { ECGImageAnalysisServiceError } from "@/lib/ecg-image/server/ecg-image-analysis-service";
import type { EcgAnalysisErrorCode, EcgAnalysisErrorDetail } from "@/types/ecg";
import { ABSOLUTE_UPLOAD_BYTES } from "@/lib/ecg-image/upload-limits";
import { ECG_ANALYSIS_GATE_COOKIE, ECG_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createAnalysisGateToken, getAuthConfiguration, parseCookie, readAnalysisGateToken, serializeHttpOnlyCookie, verifySessionToken } from "@/lib/auth/ecg-auth";
import { reserveAnalysis } from "@/lib/auth/rate-limits";

export const runtime="nodejs";

export async function POST(request:Request){
  const requestId=crypto.randomUUID();const config=getAuthConfiguration();
  if(!config.configured)return errorResponse(503,makeAnalysisError("AUTH_REQUIRED","管理者による認証設定が完了していません。",{requestId,suggestedActions:["管理者が認証設定を完了するまでお待ちください"]}));
  const session=verifySessionToken(parseCookie(request,ECG_SESSION_COOKIE),config.secret);
  if(session.status!=="valid")return errorResponse(401,makeAnalysisError(session.status==="expired"?"SESSION_EXPIRED":"AUTH_REQUIRED",session.status==="expired"?"認証の有効期限が切れました。":"PIN認証が必要です。",{requestId}));
  const nowMs=Date.now();const previousStart=readAnalysisGateToken(parseCookie(request,ECG_ANALYSIS_GATE_COOKIE),config.secret,session.session.sid,nowMs);const reservation=reserveAnalysis(session.session.sid,previousStart,nowMs);
  if(!reservation.allowed)return errorResponse(429,makeAnalysisError("ANALYSIS_RATE_LIMITED","連続解析はできません。少し待ってから再試行してください。",{requestId,retryable:true}),undefined,reservation.retryAfterSeconds);
  const gateCookie=serializeHttpOnlyCookie(ECG_ANALYSIS_GATE_COOKIE,createAnalysisGateToken(config.secret,session.session.sid,nowMs),SESSION_MAX_AGE_SECONDS);
  let form:FormData;
  try{form=await request.formData()}catch{return errorResponse(400,makeAnalysisError("INVALID_FILE","画像データを読み込めませんでした。",{requestId}),gateCookie)}
  const image=form.get("image");
  if(!(image instanceof File))return errorResponse(400,makeAnalysisError("INVALID_FILE","解析する画像を1件選択してください。",{requestId}),gateCookie);
  const validation=validateEcgFile(image);
  if(image.size>ABSOLUTE_UPLOAD_BYTES)return errorResponse(413,makeAnalysisError("FILE_TOO_LARGE","解析用画像のデータ量が大きすぎます。切り抜き範囲を狭くするか、画像を軽量化して再試行してください。",{requestId}),gateCookie);
  if(!validation.valid){const code:EcgAnalysisErrorCode=image.size===0?"INVALID_FILE":"UNSUPPORTED_MEDIA_TYPE";return errorResponse(415,makeAnalysisError(code,validation.error??"画像を読み込めませんでした。",{requestId}),gateCookie)}
  const service=createECGImageAnalysisService();
  if(!service)return errorResponse(501,makeAnalysisError("ANALYSIS_NOT_CONFIGURED","画像解析サービスが設定されていません。",{requestId}),gateCookie);
  const bytes=new Uint8Array(await image.arrayBuffer());
  try{
    const result=await service.analyze({bytes,mimeType:image.type as "image/jpeg"|"image/png"|"image/webp"},{signal:request.signal,requestId});
    return Response.json({ok:true,...result},{headers:responseHeaders(requestId,gateCookie)});
  }catch(error){
    if(error instanceof DOMException&&error.name==="AbortError")return errorResponse(499,makeAnalysisError("USER_CANCELLED","画像解析を中断しました。",{requestId}),gateCookie);
    if(error instanceof ECGImageAnalysisServiceError)return errorResponse(error.status,{...error.detail,requestId},gateCookie);
    if(process.env.NODE_ENV==="development")console.error("[ECG Analysis] Unexpected route error",error);
    return errorResponse(500,makeAnalysisError("UNEXPECTED_SERVER_ERROR","解析APIで予期しない内部エラーが発生しました。",{requestId}),gateCookie);
  }finally{bytes.fill(0)}
}

function responseHeaders(requestId:string,setCookie?:string,retryAfter?:number){const headers:Record<string,string>={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Request-Id":requestId};if(setCookie)headers["Set-Cookie"]=setCookie;if(retryAfter)headers["Retry-After"]=String(retryAfter);return headers}
function errorResponse(status:number,error:EcgAnalysisErrorDetail,setCookie?:string,retryAfter?:number){return Response.json({ok:false,error:publicErrorDetail(error)},{status,headers:responseHeaders(error.requestId??"",setCookie,retryAfter)})}
