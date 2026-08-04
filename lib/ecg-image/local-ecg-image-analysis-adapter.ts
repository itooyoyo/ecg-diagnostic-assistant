import { EcgAnalysisError } from "@/lib/ecg-image/image-analysis-adapter";
import type { EcgImageAnalysisResult } from "@/types/ecg";

export type EcgAnalysisMode="local"|"manual";
export type LocalBackend="webgpu"|"wasm"|"none";
export type LocalSupport={supported:boolean;backend:LocalBackend;reason?:string};
type ModelManifest={modelAvailable:boolean;modelVersion:string|null;validatedForClinicalUse:boolean;supportedFindings:string[];limitations:string[];modelPath?:string|null};

export interface LocalEcgImageAnalysisAdapter {
  isSupported():Promise<LocalSupport>;
  analyze(file:File,options?:{signal?:AbortSignal}):Promise<EcgImageAnalysisResult>;
}

export class OnnxLocalEcgImageAnalysisAdapter implements LocalEcgImageAnalysisAdapter{
  private manifest:ModelManifest|null=null;
  async isSupported():Promise<LocalSupport>{
    const backend=detectLocalBackend();
    if(backend==="none")return {supported:false,backend,reason:"この端末ではWebGPUまたはWebAssemblyを利用できません。"};
    try{
      const response=await fetch("/models/ecg/manifest.json",{cache:"no-store"});
      if(!response.ok)return {supported:false,backend,reason:"ローカルモデル情報を読み込めません。"};
      this.manifest=await response.json() as ModelManifest;
    }catch{return {supported:false,backend,reason:"ローカルモデル情報を読み込めません。"}}
    if(!this.manifest.modelAvailable||!this.manifest.validatedForClinicalUse||!this.manifest.modelPath)return {supported:false,backend,reason:this.manifest.limitations[0]??"検証済みローカルECGモデルは未搭載です。"};
    return {supported:true,backend};
  }
  async analyze(_file:File,options?:{signal?:AbortSignal}):Promise<EcgImageAnalysisResult>{
    if(options?.signal?.aborted)throw new DOMException("Aborted","AbortError");
    const support=await this.isSupported();
    if(!support.supported)throw localModelUnavailable(support.reason);
    // The runtime is deliberately loaded only after a validated model is declared.
    // Model-specific preprocessing and output mapping must be implemented and validated together.
    if(support.backend==="webgpu")await import("onnxruntime-web/webgpu");else await import("onnxruntime-web/wasm");
    throw localModelUnavailable("検証済みモデルの入出力実装が未搭載です。");
  }
}

export function detectLocalBackend():LocalBackend{
  if(typeof navigator!=="undefined"&&"gpu" in navigator&&globalThis.isSecureContext)return "webgpu";
  if(typeof WebAssembly!=="undefined")return "wasm";
  return "none";
}
function localModelUnavailable(reason?:string){return new EcgAnalysisError({code:"LOCAL_MODEL_NOT_AVAILABLE",userMessage:"ローカル自動解析モデルは現在準備中です。医師による所見入力で診断支援を利用できます。",retryable:false,suggestedActions:["医師入力で続ける"],analysisLimitations:reason?[reason]:undefined})}
