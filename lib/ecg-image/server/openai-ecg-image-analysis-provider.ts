import "server-only";

import OpenAI from "openai";
import { makeAnalysisError } from "@/lib/ecg-image/analysis-errors";
import type { EcgAnalysisFieldIssue, EcgImageAnalysisResult } from "@/types/ecg";
import { ECGImageAnalysisServiceError, type EcgImageAnalysisProvider, type EcgImagePayload } from "./ecg-image-analysis-service";

type ExtractedResult=Omit<EcgImageAnalysisResult,"analysisId"|"source"|"model"|"extractedAt">;
const confidenceKeys=["heartRate","rhythm","pWave","pr","qrs","axis","rwave","qWave","st","tWave","uWave","qtc","pvc","rOnT","bundleBranchBlock","placement","regularity"];
const nullableConfidence={type:["number","null"],minimum:0,maximum:1};

export const ecgImageFindingsSchema={
  type:"object",additionalProperties:false,required:["imageQuality","measurements","findings","confidence","limitations"],
  properties:{
    imageQuality:{type:"object",additionalProperties:false,required:["analyzable","limitations"],properties:{analyzable:{type:["boolean","null"]},limitations:{type:"array",items:{type:"string"}}}},
    measurements:{type:"object",additionalProperties:false,required:["heartRateBpm","rhythm","prMs","qrsMs","qtMs","qtcMs","axisDegrees"],properties:{heartRateBpm:{type:["number","null"]},rhythm:{type:["string","null"]},prMs:{type:["number","null"]},qrsMs:{type:["number","null"]},qtMs:{type:["number","null"]},qtcMs:{type:["number","null"]},axisDegrees:{type:["number","null"]}}},
    findings:{type:"object",additionalProperties:false,required:["pWave","qrs","st","tWave","uWave","ectopy","pvc","rOnT","bundleBranchBlock","rWaveProgression","qWave","leadPlacement","regularity"],properties:Object.fromEntries(["pWave","qrs","st","tWave","uWave","ectopy","pvc","rOnT","bundleBranchBlock","rWaveProgression","qWave","leadPlacement","regularity"].map(key=>[key,{type:"string"}]))},
    confidence:{type:"object",additionalProperties:false,required:["overall","perField"],properties:{overall:{type:["number","null"],minimum:0,maximum:1},perField:{type:"object",additionalProperties:false,required:confidenceKeys,properties:Object.fromEntries(confidenceKeys.map(key=>[key,nullableConfidence]))}}},
    limitations:{type:"array",items:{type:"string"}}
  }
} as const;

export class OpenAIEcgImageAnalysisProvider implements EcgImageAnalysisProvider{
  readonly name="openai-responses";
  private readonly client:OpenAI;
  constructor(apiKey:string,readonly model:string){this.client=new OpenAI({apiKey,maxRetries:1,timeout:85_000})}

  async analyze(image:EcgImagePayload,options?:{signal?:AbortSignal}):Promise<ExtractedResult>{
    let base64=Buffer.from(image.bytes).toString("base64");
    try{
      const response=await this.client.responses.create({model:this.model,store:false,reasoning:{effort:"low"},
        instructions:"心電図画像から客観的な所見候補だけを抽出してください。診断、原因疾患、治療、PCI適応、薬剤、薬剤量、予後は生成しないでください。読めない値はnullまたは判定不能とし、推測で正常値を補完しないでください。画像品質と解析上の制限を必ず明記してください。出力は医師確認前の候補であり最終診断ではありません。",
        input:[{role:"user",content:[{type:"input_text",text:"指定JSON Schemaに従い、心拍数、リズム、P波、PR、QRS、QT/QTc、軸、R波進行、Q波、ST、T波、U波、PVC、R on T候補、脚ブロック候補、電極装着異常候補、画像品質、解析不能理由を抽出してください。"},{type:"input_image",image_url:`data:${image.mimeType};base64,${base64}`,detail:"high"}]}],
        text:{format:{type:"json_schema",name:"ecg_image_findings",description:"心電図画像から抽出した客観的所見候補。診断や治療を含まない。",strict:true,schema:ecgImageFindingsSchema}}
      },{signal:options?.signal});
      if(response.status==="incomplete")throw serviceError("MODEL_OUTPUT_INCOMPLETE","解析結果の出力が途中で終了しました。",502,true,response.incomplete_details?.reason?[response.incomplete_details.reason]:undefined);
      const refusal=response.output.flatMap(item=>item.type==="message"?item.content:[]).find(item=>item.type==="refusal");
      if(refusal&&refusal.type==="refusal")throw serviceError("MODEL_REFUSAL","画像解析サービスがこの画像の解析を完了できませんでした。",422,false,[refusal.refusal]);
      if(!response.output_text.trim())throw serviceError("EMPTY_MODEL_RESPONSE","画像解析サービスから所見を取得できませんでした。",502,true);
      let parsed:unknown;
      try{parsed=JSON.parse(response.output_text)}catch{throw serviceError("INVALID_JSON","解析結果のJSON形式が正しくありませんでした。",502,true)}
      const extracted=validateResult(parsed);
      if(extracted.imageQuality.analyzable===false){const code=classifyImageLimitation([...extracted.imageQuality.limitations,...extracted.limitations]);throw new ECGImageAnalysisServiceError(makeAnalysisError(code,"画像から解析に必要な心電図所見を取得できませんでした。",{retryable:true,analysisLimitations:[...extracted.imageQuality.limitations,...extracted.limitations]}),422)}
      return extracted;
    }catch(error){
      if(error instanceof DOMException&&error.name==="AbortError")throw error;
      if(error instanceof ECGImageAnalysisServiceError)throw error;
      if(error instanceof OpenAI.RateLimitError)throw serviceError("PROVIDER_RATE_LIMITED","画像解析サービスが混雑しています。時間をおいて再試行してください。",429,true);
      if(error instanceof OpenAI.APIConnectionTimeoutError)throw serviceError("ANALYSIS_TIMEOUT","画像解析がタイムアウトしました。",504,true);
      if(error instanceof OpenAI.APIError)throw serviceError("PROVIDER_UNAVAILABLE",providerErrorMessage(error.status),error.status===401?503:502,error.status!==401);
      throw serviceError("PROVIDER_UNAVAILABLE","画像解析サービスへ接続できませんでした。",502,true);
    }finally{base64=""}
  }
}

function serviceError(code:Parameters<typeof makeAnalysisError>[0],message:string,status:number,retryable=false,limitations?:string[]){return new ECGImageAnalysisServiceError(makeAnalysisError(code,message,{retryable,analysisLimitations:limitations}),status)}

export function validateResult(value:unknown):ExtractedResult{
  if(!value||typeof value!=="object")throw serviceError("SCHEMA_VALIDATION_FAILED","解析結果の必須構造を確認できませんでした。",502,true);
  const result=value as Record<string,unknown>;const issues:EcgAnalysisFieldIssue[]=[];
  for(const key of ["imageQuality","measurements","findings","confidence","limitations"])if(!(key in result))issues.push({field:key,issue:"必須項目です"});
  if(issues.length)throw new ECGImageAnalysisServiceError(makeAnalysisError("SCHEMA_VALIDATION_FAILED","解析結果に不足している項目があります。",{retryable:true,fieldIssues:issues}),502);
  const extracted=result as unknown as ExtractedResult;
  if(!Array.isArray(extracted.limitations))issues.push({field:"limitations",issue:"配列である必要があります"});
  const measurements=extracted.measurements as unknown as Record<string,unknown>;
  for(const [key,min,max] of [["heartRateBpm",10,350],["prMs",40,500],["qrsMs",20,500],["qtMs",100,1000],["qtcMs",100,1000],["axisDegrees",-180,180]] as const){const v=measurements?.[key];if(v!==null&&(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)){issues.push({field:`measurements.${key}`,issue:`${min}〜${max}の数値またはnullである必要があります`});measurements[key]=null}}
  const confidence=extracted.confidence?.perField??{};for(const key of confidenceKeys){const v=confidence[key];if(v!==null&&(typeof v!=="number"||v<0||v>1)){issues.push({field:`confidence.perField.${key}`,issue:"0〜1の数値またはnullである必要があります"});confidence[key]=null}}
  if(issues.length){extracted.partialSuccess=true;extracted.fieldIssues=issues.slice(0,5);extracted.limitations=[...extracted.limitations,"一部の項目を安全なnullへ変換しました。医師が確認してください。"]}
  return extracted;
}
function providerErrorMessage(status:number|undefined){return status===401?"画像解析サービスの認証設定を確認してください。":"画像解析サービスで一時的なエラーが発生しました。"}
function classifyImageLimitation(limitations:string[]):Parameters<typeof makeAnalysisError>[0]{const text=limitations.join(" ").toLowerCase();if(/心電図.*(見つ|検出)|ecg.*not.*found/.test(text))return "ECG_REGION_NOT_FOUND";if(/誘導名|lead label/.test(text))return "LEADS_NOT_IDENTIFIABLE";if(/12誘導|visible leads|誘導.*不足/.test(text))return "INSUFFICIENT_VISIBLE_LEADS";if(/解像度|小さ|resolution/.test(text))return "IMAGE_TOO_SMALL";if(/紙送り|paper speed/.test(text))return "PAPER_SPEED_UNKNOWN";if(/感度|gain/.test(text))return "GAIN_UNKNOWN";return "IMAGE_NOT_ANALYZABLE"}
