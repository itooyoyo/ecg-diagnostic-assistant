export const ACCEPTED_ECG_TYPES=["image/jpeg","image/png","image/webp"];
export function validateEcgFile(file){
  if(file.size===0)return {valid:false,error:"空の画像ファイルは解析できません。"};
  if(!ACCEPTED_ECG_TYPES.includes(file.type))return {valid:false,error:"対応していない形式です。JPEG、PNG、WebPを選択してください。"};
  if(file.size>20*1024*1024)return {valid:false,error:"20MB以下の画像を選択してください。"};
  return {valid:true,error:null};
}
