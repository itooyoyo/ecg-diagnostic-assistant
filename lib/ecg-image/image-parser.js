export const ACCEPTED_ECG_TYPES = ["image/jpeg","image/png","application/pdf"];
export function validateEcgFile(file) {
  if (!ACCEPTED_ECG_TYPES.includes(file.type)) return { valid:false, error:"JPG・JPEG・PNG・PDFのみ選択できます。" };
  if (file.size > 20 * 1024 * 1024) return { valid:false, error:"ファイルサイズは20MB以下にしてください。" };
  return { valid:true, error:null };
}
