import type { EcgAnalysisErrorDetail, EcgImageAnalysisResult } from "@/types/ecg";
export type EcgImageAnalysisOptions={signal?:AbortSignal};
export interface EcgImageAnalysisAdapter {analyze(file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult>}
export class EcgAnalysisError extends Error{
  constructor(public detail:EcgAnalysisErrorDetail,public status?:number){super(detail.userMessage);this.name="EcgAnalysisError"}
  get code(){return this.detail.code}
}
export class ApiEcgImageAnalysisAdapter implements EcgImageAnalysisAdapter{
  async analyze(file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult>{
    const body=new FormData();body.append("image",file,file.name);let response:Response;
    try{response=await fetch("/api/ecg/analyze",{method:"POST",body,signal:options?.signal})}
    catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw error;throw new EcgAnalysisError({code:"PROVIDER_UNAVAILABLE",userMessage:"画像解析サービスへ接続できませんでした。",retryable:true,suggestedActions:["通信状態を確認して、もう一度解析してください"]})}
    const vercelError=response.headers.get("x-vercel-error");
    if(response.status===413||vercelError==="FUNCTION_PAYLOAD_TOO_LARGE")throw new EcgAnalysisError({code:"FILE_TOO_LARGE",userMessage:"解析用画像のデータ量が大きすぎます。切り抜き範囲を狭くするか、画像を軽量化して再試行してください。",retryable:true,suggestedActions:["切り抜きを修正","画像を軽量化して再試行","別画像を選ぶ","手入力で続ける"]},413);
    const contentType=response.headers.get("content-type")??"";
    if(!contentType.toLowerCase().includes("application/json"))throw new EcgAnalysisError({code:"INVALID_JSON",userMessage:"解析APIからJSON形式を取得できませんでした。",retryable:true,suggestedActions:["もう一度解析してください"]},response.status);
    let payload:unknown;
    try{payload=await response.json()}catch{throw new EcgAnalysisError({code:"INVALID_JSON",userMessage:"解析APIからJSON形式を取得できませんでした。",retryable:true,suggestedActions:["もう一度解析してください"]},response.status)}
    if(!response.ok){const detail=(payload as {error?:EcgAnalysisErrorDetail})?.error;throw new EcgAnalysisError(detail??{code:"UNEXPECTED_SERVER_ERROR",userMessage:"解析APIのエラー形式を確認できませんでした。",retryable:true,suggestedActions:["もう一度解析してください"]},response.status)}
    if(!isAnalysisResult(payload))throw new EcgAnalysisError({code:"STRUCTURED_OUTPUT_FAILED",userMessage:"Structured Outputの結果形式を確認できませんでした。",retryable:true,suggestedActions:["もう一度解析してください"]},response.status);
    return payload;
  }
}

// 明示的なテスト専用。通常画面からは参照しない。
export class MockEcgImageAnalysisAdapter implements EcgImageAnalysisAdapter{
  async analyze(_file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult>{
    if(options?.signal?.aborted)throw new DOMException("Aborted","AbortError");
    return {analysisId:`demo-${Date.now()}`,source:"mock",model:"explicit-demo-fixture-v1",extractedAt:new Date().toISOString(),imageQuality:{analyzable:true,limitations:["テスト専用モックです"]},measurements:{heartRateBpm:72,rhythm:"洞調律（デモ）",prMs:164,qrsMs:92,qtMs:388,qtcMs:425,axisDegrees:45},findings:{pWave:"各QRSに先行",qrs:"明らかな異常なし",st:"明らかな変化なし",tWave:"明らかな異常なし",uWave:"判定困難",ectopy:"なし",pvc:"なし",rOnT:"なし",bundleBranchBlock:"なし",rWaveProgression:"保たれる",qWave:"病的Q波なし",leadPlacement:"明らかな異常なし",regularity:"整"},confidence:{overall:null,perField:{heartRate:null,rhythm:null,pWave:null,pr:null,qrs:null,axis:null,rwave:null,qWave:null,st:null,tWave:null,uWave:null,qtc:null,pvc:null,rOnT:null,bundleBranchBlock:null,placement:null,regularity:null}},limitations:["実画像解析結果ではありません"]};
  }
}
function isAnalysisResult(value:unknown):value is EcgImageAnalysisResult{if(!value||typeof value!=="object")return false;const x=value as Partial<EcgImageAnalysisResult>;return typeof x.analysisId==="string"&&(x.source==="local"||x.source==="real_ai"||x.source==="mock")&&typeof x.extractedAt==="string"&&Boolean(x.measurements)&&Boolean(x.findings)&&Boolean(x.confidence)&&Array.isArray(x.limitations)}
