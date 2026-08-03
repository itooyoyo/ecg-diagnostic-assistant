import "server-only";

import type { EcgImageAnalysisResult } from "@/types/ecg";
import { ECGImageAnalysisServiceError, type EcgImageAnalysisProvider, type EcgImagePayload } from "./ecg-image-analysis-service";

type ExtractedResult=Omit<EcgImageAnalysisResult,"analysisId"|"source"|"model"|"extractedAt">;

const schema={
  type:"object",additionalProperties:false,
  required:["imageQuality","measurements","findings","confidence","limitations"],
  properties:{
    imageQuality:{type:"object",additionalProperties:false,required:["analyzable","limitations"],properties:{analyzable:{type:["boolean","null"]},limitations:{type:"array",items:{type:"string"}}}},
    measurements:{type:"object",additionalProperties:false,required:["heartRateBpm","rhythm","prMs","qrsMs","qtMs","qtcMs","axisDegrees"],properties:{heartRateBpm:{type:["number","null"]},rhythm:{type:["string","null"]},prMs:{type:["number","null"]},qrsMs:{type:["number","null"]},qtMs:{type:["number","null"]},qtcMs:{type:["number","null"]},axisDegrees:{type:["number","null"]}}},
    findings:{type:"object",additionalProperties:false,required:["pWave","qrs","st","tWave","uWave","ectopy","rWaveProgression","qWave","leadPlacement","regularity"],properties:{pWave:{type:"string"},qrs:{type:"string"},st:{type:"string"},tWave:{type:"string"},uWave:{type:"string"},ectopy:{type:"string"},rWaveProgression:{type:"string"},qWave:{type:"string"},leadPlacement:{type:"string"},regularity:{type:"string"}}},
    confidence:{type:"object",additionalProperties:false,required:["overall","perField"],properties:{overall:{type:["number","null"],minimum:0,maximum:1},perField:{type:"object",additionalProperties:false,required:["heartRate","rhythm","pWave","pr","qrs","axis","rwave","qWave","st","tWave","uWave","qtc","placement","regularity"],properties:Object.fromEntries(["heartRate","rhythm","pWave","pr","qrs","axis","rwave","qWave","st","tWave","uWave","qtc","placement","regularity"].map(key=>[key,{type:["number","null"],minimum:0,maximum:1}]))}}},
    limitations:{type:"array",items:{type:"string"}}
  }
} as const;

export class OpenAIEcgImageAnalysisProvider implements EcgImageAnalysisProvider{
  readonly name="openai";
  constructor(private readonly apiKey:string,readonly model:string,private readonly endpoint="https://api.openai.com/v1/chat/completions"){}

  async analyze(image:EcgImagePayload,options?:{signal?:AbortSignal}):Promise<ExtractedResult>{
    const base64=Buffer.from(image.bytes).toString("base64");
    let response:Response;
    try{
      response=await fetch(this.endpoint,{method:"POST",headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},signal:options?.signal,body:JSON.stringify({model:this.model,temperature:0,messages:[{role:"system",content:"あなたは心電図画像から客観的所見だけを抽出する医療画像解析支援です。診断を確定せず、読み取れない値はnullまたは判定不能とし、推測で正常値を補完しないでください。誘導名、校正、画質を確認し、画像だけで判断できない制限を必ず明記してください。"},{role:"user",content:[{type:"text",text:"この心電図画像から、指定JSON schemaの客観的所見を抽出してください。QTcは画像上で確認または妥当に計算できる場合だけ返してください。"},{type:"image_url",image_url:{url:`data:${image.mimeType};base64,${base64}`,detail:"high"}}]}],response_format:{type:"json_schema",json_schema:{name:"ecg_image_findings",strict:true,schema}}})});
    }catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw error;throw new ECGImageAnalysisServiceError("PROVIDER_NETWORK_ERROR","画像解析サービスへ接続できませんでした。",502)}
    let payload:unknown;
    try{payload=await response.json()}catch{throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析サービスから不正な応答が返されました。",502)}
    if(!response.ok){const message=(payload as {error?:{message?:string}})?.error?.message;throw new ECGImageAnalysisServiceError("PROVIDER_ERROR",message?`画像解析サービス: ${message}`:"画像解析サービスでエラーが発生しました。",response.status>=400&&response.status<500?502:response.status)}
    const content=(payload as {choices?:Array<{message?:{content?:string;refusal?:string}}>} )?.choices?.[0]?.message;
    if(content?.refusal)throw new ECGImageAnalysisServiceError("ANALYSIS_REFUSED","画像解析を完了できませんでした。",422);
    if(!content?.content)throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果が空でした。",502);
    try{return validateResult(JSON.parse(content.content))}catch(error){if(error instanceof ECGImageAnalysisServiceError)throw error;throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果のJSON形式が正しくありません。",502)}
  }
}

function validateResult(value:unknown):ExtractedResult{
  if(!value||typeof value!=="object")throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果の形式が正しくありません。",502);
  const result=value as Partial<ExtractedResult>;
  if(!result.imageQuality||!result.measurements||!result.findings||!result.confidence||!Array.isArray(result.limitations))throw new ECGImageAnalysisServiceError("PROVIDER_INVALID_RESPONSE","画像解析結果に必要な項目がありません。",502);
  return result as ExtractedResult;
}
