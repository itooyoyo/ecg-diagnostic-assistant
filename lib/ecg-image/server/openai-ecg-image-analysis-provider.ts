import "server-only";

import OpenAI from "openai";
import type { EcgImageAnalysisResult } from "@/types/ecg";
import { ECGImageAnalysisServiceError, type EcgImageAnalysisProvider, type EcgImagePayload } from "./ecg-image-analysis-service";

type ExtractedResult=Omit<EcgImageAnalysisResult,"analysisId"|"source"|"model"|"extractedAt">;
const confidenceKeys=["heartRate","rhythm","pWave","pr","qrs","axis","rwave","qWave","st","tWave","uWave","qtc","pvc","rOnT","bundleBranchBlock","placement","regularity"];
const nullableNumber={type:["number","null"],minimum:0,maximum:1};

export const ecgImageFindingsSchema={
  type:"object",additionalProperties:false,
  required:["imageQuality","measurements","findings","confidence","limitations"],
  properties:{
    imageQuality:{type:"object",additionalProperties:false,required:["analyzable","limitations"],properties:{analyzable:{type:["boolean","null"]},limitations:{type:"array",items:{type:"string"}}}},
    measurements:{type:"object",additionalProperties:false,required:["heartRateBpm","rhythm","prMs","qrsMs","qtMs","qtcMs","axisDegrees"],properties:{heartRateBpm:{type:["number","null"]},rhythm:{type:["string","null"]},prMs:{type:["number","null"]},qrsMs:{type:["number","null"]},qtMs:{type:["number","null"]},qtcMs:{type:["number","null"]},axisDegrees:{type:["number","null"]}}},
    findings:{type:"object",additionalProperties:false,required:["pWave","qrs","st","tWave","uWave","ectopy","pvc","rOnT","bundleBranchBlock","rWaveProgression","qWave","leadPlacement","regularity"],properties:{pWave:{type:"string"},qrs:{type:"string"},st:{type:"string"},tWave:{type:"string"},uWave:{type:"string"},ectopy:{type:"string"},pvc:{type:"string"},rOnT:{type:"string"},bundleBranchBlock:{type:"string"},rWaveProgression:{type:"string"},qWave:{type:"string"},leadPlacement:{type:"string"},regularity:{type:"string"}}},
    confidence:{type:"object",additionalProperties:false,required:["overall","perField"],properties:{overall:{type:["number","null"],minimum:0,maximum:1},perField:{type:"object",additionalProperties:false,required:confidenceKeys,properties:Object.fromEntries(confidenceKeys.map(key=>[key,nullableNumber]))}}},
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
      const response=await this.client.responses.create({
        model:this.model,
        store:false,
        reasoning:{effort:"low"},
        instructions:"心電図画像から客観的所見の候補だけを抽出する。診断、原因疾患、治療、PCI適応、薬剤、薬剤量、予後は一切生成しない。読めない値はnullまたは『判定不能』とし、正常値を推測補完しない。画像品質と解析不能理由を必ず明記する。出力は医師確認前の候補であり最終診断ではない。",
        input:[{role:"user",content:[{type:"input_text",text:"画像内の心電図から指定schemaの所見候補を抽出してください。心拍数、リズム、PR、QRS、QT/QTc、軸、P波、Q波、R波進行、ST、T波、U波、PVC、R on T候補、脚ブロック候補、電極装着異常候補、画像品質、解析不能理由のみを対象にしてください。"},{type:"input_image",image_url:`data:${image.mimeType};base64,${base64}`,detail:"high"}]}],
        text:{format:{type:"json_schema",name:"ecg_image_findings",description:"心電図画像から抽出した客観的所見候補。診断や治療を含まない。",strict:true,schema:ecgImageFindingsSchema}}
      },{signal:options?.signal});
      if(!response.output_text)throw new ECGImageAnalysisServiceError("ANALYSIS_REFUSED","画像解析を完了できませんでした。",422);
      return validateResult(JSON.parse(response.output_text));
    }catch(error){
      if(error instanceof DOMException&&error.name==="AbortError")throw error;
      if(error instanceof ECGImageAnalysisServiceError)throw error;
      if(error instanceof SyntaxError)throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果のJSON形式が正しくありません。",502);
      if(error instanceof OpenAI.APIError)throw new ECGImageAnalysisServiceError("PROVIDER_ERROR",providerErrorMessage(error.status),error.status===429?429:502);
      throw new ECGImageAnalysisServiceError("PROVIDER_NETWORK_ERROR","画像解析サービスへ接続できませんでした。",502);
    }finally{base64=""}
  }
}

function validateResult(value:unknown):ExtractedResult{
  if(!value||typeof value!=="object")throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果の形式が正しくありません。",502);
  const result=value as Partial<ExtractedResult>;
  if(!result.imageQuality||!result.measurements||!result.findings||!result.confidence||!Array.isArray(result.limitations))throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果に必要な項目がありません。",502);
  return result as ExtractedResult;
}
function providerErrorMessage(status:number|undefined){return status===401?"画像解析サービスの認証設定を確認してください。":status===429?"画像解析サービスが混雑しています。時間をおいて再試行してください。":"画像解析サービスでエラーが発生しました。"}
