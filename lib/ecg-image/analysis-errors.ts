import type { EcgAnalysisErrorCode, EcgAnalysisErrorDetail, EcgAnalysisFieldIssue, EcgOpenAIDebugInfo } from "@/types/ecg";

const actions:Partial<Record<EcgAnalysisErrorCode,string[]>>={
  INVALID_FILE:["JPEG、PNG、WebPの画像を選択してください"],FILE_TOO_LARGE:["20MB以下の画像を選択してください"],UNSUPPORTED_MEDIA_TYPE:["JPEG、PNG、WebPの画像を選択してください"],
  ECG_REGION_NOT_FOUND:["心電図波形部分を大きく切り抜いてください","机や背景を除いてください"],
  LEADS_NOT_IDENTIFIABLE:["誘導名を含めて切り抜いてください","画像の向きを確認してください"],
  INSUFFICIENT_VISIBLE_LEADS:["12誘導全体が含まれるようにしてください","切り抜き範囲を広げてください"],
  IMAGE_TOO_SMALL:["より広い範囲または高解像度の画像を使用してください"],
  IMAGE_NOT_ANALYZABLE:["反射、影、傾き、ぼけを避けて再撮影してください","切り抜きと回転を調整してください"],
  PAPER_SPEED_UNKNOWN:["心電図端の記録条件を含めてください","不明な場合は医師が手入力してください"],
  GAIN_UNKNOWN:["心電図端の記録条件を含めてください","不明な場合は医師が手入力してください"],
  SCHEMA_VALIDATION_FAILED:["心電図全体が入るよう切り抜きを調整してください","もう一度解析してください"],
  PROVIDER_RATE_LIMITED:["時間をおいてもう一度解析してください"],
  ANALYSIS_TIMEOUT:["画像を切り抜いて容量を小さくしてください","もう一度解析してください"],
  ANALYSIS_NOT_CONFIGURED:["管理者に画像解析サービスの設定を依頼してください"],
  PROVIDER_AUTHENTICATION_FAILED:["管理者にOpenAI APIの認証設定確認を依頼してください"],
  PROVIDER_REQUEST_INVALID:["管理者に画像解析リクエスト設定の確認を依頼してください"],
  MODEL_NOT_AVAILABLE:["管理者に画像解析モデル設定の確認を依頼してください"],
  MODEL_ACCESS_DENIED:["管理者に画像解析モデルのアクセス権限確認を依頼してください"],
  PROVIDER_UNAVAILABLE:["時間をおいてもう一度解析してください"],
};

export function makeAnalysisError(code:EcgAnalysisErrorCode,userMessage:string,options:{retryable?:boolean;fieldIssues?:EcgAnalysisFieldIssue[];analysisLimitations?:string[];requestId?:string;suggestedActions?:string[];debug?:EcgOpenAIDebugInfo;providerStatus?:number;providerCode?:string;providerType?:string;providerRequestId?:string;stage?:string}={}):EcgAnalysisErrorDetail{
  return {code,userMessage,retryable:options.retryable??false,suggestedActions:options.suggestedActions??actions[code]??["画像を確認し、必要に応じて切り抜きまたは別画像を選択してください"],fieldIssues:options.fieldIssues?.slice(0,5),analysisLimitations:options.analysisLimitations,requestId:options.requestId,debug:process.env.NODE_ENV==="development"?options.debug:undefined,providerStatus:options.providerStatus,providerCode:options.providerCode,providerType:options.providerType,providerRequestId:options.providerRequestId,stage:options.stage};
}

export function publicErrorDetail(error:EcgAnalysisErrorDetail):EcgAnalysisErrorDetail{
  return {...error,fieldIssues:error.fieldIssues?.slice(0,5),requestId:error.requestId?.slice(0,64),debug:process.env.NODE_ENV==="development"?error.debug:undefined};
}
