import type { EcgImageAnalysisResult } from "@/types/ecg";
export type EcgImageAnalysisOptions={signal?:AbortSignal};
export interface EcgImageAnalysisAdapter { analyze(file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult>; }
export class EcgAnalysisError extends Error { constructor(public code:string,message:string,public status?:number){super(message);this.name="EcgAnalysisError";} }
export class ApiEcgImageAnalysisAdapter implements EcgImageAnalysisAdapter {
  async analyze(file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult>{
    const body=new FormData();body.append("image",file,file.name);
    let response:Response;
    try{response=await fetch("/api/ecg/analyze",{method:"POST",body,signal:options?.signal});}
    catch(error){if(error instanceof DOMException&&error.name==="AbortError")throw error;throw new EcgAnalysisError("NETWORK_ERROR","画像解析サービスへ接続できませんでした。");}
    let payload:unknown;
    try{payload=await response.json();}catch{throw new EcgAnalysisError("INVALID_RESPONSE","解析サービスから不正な応答が返されました。",response.status);}
    if(!response.ok){const e=(payload as {error?:{code?:string;message?:string}})?.error;throw new EcgAnalysisError(e?.code??"SERVER_ERROR",e?.message??"画像解析に失敗しました。",response.status);}
    if(!isAnalysisResult(payload))throw new EcgAnalysisError("INVALID_RESPONSE","解析結果の形式が正しくありません。",response.status);
    return payload;
  }
}
export class MockEcgImageAnalysisAdapter implements EcgImageAnalysisAdapter {
  async analyze(_file:File,options?:EcgImageAnalysisOptions):Promise<EcgImageAnalysisResult> {
    if(options?.signal?.aborted)throw new DOMException("Aborted","AbortError");
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,350);options?.signal?.addEventListener("abort",()=>{clearTimeout(timer);reject(new DOMException("Aborted","AbortError"));},{once:true});});
    return {analysisId:`demo-${Date.now()}`,source:"mock",model:"explicit-demo-fixture-v1",extractedAt:new Date().toISOString(),imageQuality:{analyzable:true,limitations:["デモfixtureであり、選択画像を解析した結果ではありません。"]},measurements:{heartRateBpm:72,rhythm:"洞調律（デモ）",prMs:164,qrsMs:92,qtMs:388,qtcMs:425,axisDegrees:45},findings:{pWave:"各QRSに先行（デモ）",qrs:"明らかな異常なし（デモ）",st:"明らかな変化なし（デモ）",tWave:"明らかな異常なし（デモ）",uWave:"評価困難（デモ）",ectopy:"なし（デモ）",rWaveProgression:"保たれる（デモ）",qWave:"病的Q波なし（デモ）",leadPlacement:"明らかな異常なし（デモ）",regularity:"整"},confidence:{overall:null,perField:{}},limitations:["開発・テスト専用のデモ解析です。実画像解析ではありません。"]};
  }
}
function isAnalysisResult(value:unknown):value is EcgImageAnalysisResult{if(!value||typeof value!=="object")return false;const x=value as Partial<EcgImageAnalysisResult>;return typeof x.analysisId==="string"&&(x.source==="real_ai"||x.source==="mock")&&typeof x.extractedAt==="string"&&Boolean(x.measurements)&&Boolean(x.findings)&&Boolean(x.confidence)&&Array.isArray(x.limitations);}
