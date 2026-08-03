import { validateEcgFile } from "@/lib/ecg-image/image-parser";

export const runtime="nodejs";

export async function POST(request:Request){
  let form:FormData;
  try{form=await request.formData();}catch{return errorResponse(400,"INVALID_FORM_DATA","画像データを読み込めませんでした。");}
  const image=form.get("image");
  if(!(image instanceof File))return errorResponse(400,"IMAGE_REQUIRED","解析する画像を1件指定してください。");
  const validation=validateEcgFile(image);
  if(!validation.valid)return errorResponse(image.size>20*1024*1024?413:400,"INVALID_IMAGE",validation.error??"画像を読み込めませんでした。");
  return errorResponse(501,"ANALYSIS_NOT_CONFIGURED","画像解析サービスが設定されていません");
}

function errorResponse(status:number,code:string,message:string){return Response.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});}
