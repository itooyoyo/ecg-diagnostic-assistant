export type CropRect={x:number;y:number;width:number;height:number;rotation:0|90|180|270};

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
