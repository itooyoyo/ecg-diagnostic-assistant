import "server-only";

import type { EcgImageAnalysisResult } from "@/types/ecg";

export type EcgImagePayload={bytes:Uint8Array;mimeType:"image/jpeg"|"image/png"|"image/webp"};
export type EcgImageAnalysisProvider={
  readonly name:string;
  readonly model:string;
  analyze(image:EcgImagePayload,options?:{signal?:AbortSignal}):Promise<Omit<EcgImageAnalysisResult,"analysisId"|"source"|"model"|"extractedAt">>;
};

export class ECGImageAnalysisService{
  constructor(private readonly provider:EcgImageAnalysisProvider){}

  async analyze(image:EcgImagePayload,options?:{signal?:AbortSignal}):Promise<EcgImageAnalysisResult>{
    const extracted=await this.provider.analyze(image,options);
    return {...extracted,analysisId:crypto.randomUUID(),source:"real_ai",model:`${this.provider.name}:${this.provider.model}`,extractedAt:new Date().toISOString()};
  }
}

export class ECGImageAnalysisServiceError extends Error{
  constructor(public readonly code:string,message:string,public readonly status=500){super(message);this.name="ECGImageAnalysisServiceError"}
}
