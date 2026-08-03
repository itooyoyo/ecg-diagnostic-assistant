import "server-only";

import { ECGImageAnalysisService } from "./ecg-image-analysis-service";
import { OpenAIEcgImageAnalysisProvider } from "./openai-ecg-image-analysis-provider";

export function createECGImageAnalysisService():ECGImageAnalysisService|null{
  const provider=(process.env.ECG_IMAGE_ANALYSIS_PROVIDER??"openai").toLowerCase();
  if(provider!=="openai")return null;
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return null;
  const model=process.env.OPENAI_ECG_MODEL??"gpt-5.6";
  return new ECGImageAnalysisService(new OpenAIEcgImageAnalysisProvider(apiKey,model));
}
