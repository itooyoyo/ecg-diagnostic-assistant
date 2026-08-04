import { makeAnalysisError, publicErrorDetail } from "@/lib/ecg-image/analysis-errors";
import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { createECGImageAnalysisService } from "@/lib/ecg-image/server/create-ecg-image-analysis-service";
import { ECGImageAnalysisServiceError } from "@/lib/ecg-image/server/ecg-image-analysis-service";
import type { EcgAnalysisErrorCode, EcgAnalysisErrorDetail } from "@/types/ecg";

export const runtime="nodejs";

export async function POST(request:Request){
  const requestId=crypto.randomUUID();let form:FormData;
  try{form=await request.formData()}catch{return errorResponse(400,makeAnalysisError("INVALID_FILE","画像データを読み込めませんでした。",{requestId}))}
  const image=form.get("image");
  if(!(image instanceof File))return errorResponse(400,makeAnalysisError("INVALID_FILE","解析する画像を1件選択してください。",{requestId}));
  const validation=validateEcgFile(image);
  if(!validation.valid){const code:EcgAnalysisErrorCode=image.size>20*1024*1024?"FILE_TOO_LARGE":image.size===0?"INVALID_FILE":"UNSUPPORTED_MEDIA_TYPE";return errorResponse(code==="FILE_TOO_LARGE"?413:415,makeAnalysisError(code,validation.error??"画像を読み込めませんでした。",{requestId}))}
  const service=createECGImageAnalysisService();
  if(!service)return errorResponse(501,makeAnalysisError("ANALYSIS_NOT_CONFIGURED","画像解析サービスが設定されていません。",{requestId}));
  const bytes=new Uint8Array(await image.arrayBuffer());
  try{
    const result=await service.analyze({bytes,mimeType:image.type as "image/jpeg"|"image/png"|"image/webp"},{signal:request.signal,requestId});
    return Response.json({ok:true,...result},{headers:responseHeaders(requestId)});
  }catch(error){
    if(error instanceof DOMException&&error.name==="AbortError")return errorResponse(499,makeAnalysisError("USER_CANCELLED","画像解析を中断しました。",{requestId}));
    if(error instanceof ECGImageAnalysisServiceError)return errorResponse(error.status,{...error.detail,requestId});
    if(process.env.NODE_ENV==="development")console.error("[ECG Analysis] Unexpected route error",error);
    return errorResponse(500,makeAnalysisError("UNEXPECTED_SERVER_ERROR","解析APIで予期しない内部エラーが発生しました。",{requestId}));
  }finally{bytes.fill(0)}
}

function responseHeaders(requestId:string){return {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Request-Id":requestId}}
function errorResponse(status:number,error:EcgAnalysisErrorDetail){return Response.json({ok:false,error:publicErrorDetail(error)},{status,headers:responseHeaders(error.requestId??"")})}
