import { ABSOLUTE_UPLOAD_BYTES, ECG_UPLOAD_LONG_EDGES, ECG_UPLOAD_QUALITIES, MAX_COMPRESSION_ATTEMPTS, TARGET_UPLOAD_BYTES } from "./upload-limits";

export type CropRect={x:number;y:number;width:number;height:number;rotation:0|90|180|270};
export type EcgUploadImage={file:File;originalBytes:number;outputBytes:number;outputWidth:number;outputHeight:number;mimeType:string;quality:number|null;resized:boolean;compressed:boolean};

export async function createProcessedEcgFile(file:File,crop:CropRect):Promise<File>{
  const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  try{
    const sx=Math.round(bitmap.width*crop.x),sy=Math.round(bitmap.height*crop.y);
    const sw=Math.max(1,Math.round(bitmap.width*crop.width)),sh=Math.max(1,Math.round(bitmap.height*crop.height));
    if(sw<320||sh<220)throw new Error("切り抜き範囲が小さすぎます。心電図全体が含まれるように調整してください。");
    const rotated=crop.rotation===90||crop.rotation===270;
    const canvas=document.createElement("canvas");canvas.width=rotated?sh:sw;canvas.height=rotated?sw:sh;
    const context=canvas.getContext("2d");if(!context)throw new Error("画像編集を開始できませんでした。");
    context.translate(canvas.width/2,canvas.height/2);context.rotate(crop.rotation*Math.PI/180);
    context.drawImage(bitmap,sx,sy,sw,sh,-sw/2,-sh/2,sw,sh);
    const mimeType=file.type==="image/png"?"image/png":file.type==="image/webp"?"image/webp":"image/jpeg";
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,mimeType,mimeType==="image/png"?undefined:.96));
    if(!blob)throw new Error("切り抜き画像を作成できませんでした。");
    return new File([blob],`cropped-${file.name}`,{type:mimeType,lastModified:Date.now()});
  }finally{bitmap.close()}
}

export async function compressEcgImageForUpload(input:{file:File;crop?:CropRect;rotation?:number;targetBytes?:number;signal?:AbortSignal}):Promise<EcgUploadImage>{
  const targetBytes=Math.min(input.targetBytes??TARGET_UPLOAD_BYTES,ABSOLUTE_UPLOAD_BYTES);throwIfAborted(input.signal);
  const source=input.crop?await createProcessedEcgFile(input.file,{...input.crop,rotation:(input.rotation??input.crop.rotation) as CropRect["rotation"]}):input.file;
  const bitmap=await createImageBitmap(source,{imageOrientation:"from-image"});
  try{
    throwIfAborted(input.signal);
    if(source.size<=targetBytes)return {file:source,originalBytes:input.file.size,outputBytes:source.size,outputWidth:bitmap.width,outputHeight:bitmap.height,mimeType:source.type,quality:null,resized:false,compressed:source!==input.file};
    const outputType=source.type==="image/webp"?"image/webp":"image/jpeg";
    const originalLongEdge=Math.max(bitmap.width,bitmap.height);let attempts=0;
    for(const configuredLongEdge of ECG_UPLOAD_LONG_EDGES){
      const longEdge=Math.min(originalLongEdge,configuredLongEdge);const scale=Math.min(1,longEdge/originalLongEdge);
      const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
      const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
      const context=canvas.getContext("2d");if(!context)throw new Error("画像軽量化を開始できませんでした。");
      context.fillStyle="#fff";context.fillRect(0,0,width,height);
      context.drawImage(bitmap,0,0,width,height);
      for(const quality of ECG_UPLOAD_QUALITIES){
        throwIfAborted(input.signal);if(++attempts>MAX_COMPRESSION_ATTEMPTS)throw new Error("画像軽量化の最大試行回数に達しました。");
        const blob=await canvasToBlob(canvas,outputType,quality);throwIfAborted(input.signal);
        if(blob.size<=targetBytes){const extension=outputType==="image/webp"?"webp":"jpg";const name=source.name.replace(/\.[^.]+$/,"");const file=new File([blob],`${name}-upload.${extension}`,{type:outputType,lastModified:Date.now()});return {file,originalBytes:input.file.size,outputBytes:file.size,outputWidth:width,outputHeight:height,mimeType:outputType,quality,resized:width!==bitmap.width||height!==bitmap.height,compressed:true}}
      }
    }
    throw new Error("心電図の判読性を保つ設定では4MB以下に軽量化できませんでした。切り抜き範囲を狭くしてください。");
  }finally{bitmap.close()}
}

function canvasToBlob(canvas:HTMLCanvasElement,mimeType:string,quality:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("画像軽量化に失敗しました。")),mimeType,quality))}
function throwIfAborted(signal?:AbortSignal){if(signal?.aborted)throw new DOMException("Aborted","AbortError")}
