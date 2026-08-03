import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { createECGImageAnalysisService } from "@/lib/ecg-image/server/create-ecg-image-analysis-service";
import { ECGImageAnalysisServiceError } from "@/lib/ecg-image/server/ecg-image-analysis-service";

export const runtime="nodejs";

export async function POST(request:Request){
  let form:FormData;
  try{form=await request.formData();}catch{return errorResponse(400,"INVALID_FORM_DATA","画像データを読み込めませんでした。");}
  const image=form.get("image");
  if(!(image instanceof File))return errorResponse(400,"IMAGE_REQUIRED","解析する画像を1件指定してください。");
  const validation=validateEcgFile(image);
  if(!validation.valid)return errorResponse(image.size>20*1024*1024?413:400,"INVALID_IMAGE",validation.error??"画像を読み込めませんでした。");
  const service=createECGImageAnalysisService();
  if(!service)return errorResponse(501,"ANALYSIS_NOT_CONFIGURED","画像解析サービスが設定されていません");
  const bytes=new Uint8Array(await image.arrayBuffer());
  try{
    const result=await service.analyze({bytes,mimeType:image.type as "image/jpeg"|"image/png"|"image/webp"},{signal:request.signal});
    return Response.json(result,{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    if(error instanceof DOMException&&error.name==="AbortError")return errorResponse(499,"ANALYSIS_CANCELLED","画像解析を中断しました。");
    if(error instanceof ECGImageAnalysisServiceError)return errorResponse(error.status,error.code,error.message);
    return errorResponse(500,"ANALYSIS_FAILED","画像解析に失敗しました。");
  }finally{
    bytes.fill(0);
  }
}

function errorResponse(status:number,code:string,message:string){return Response.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});}
