import "server-only";

import OpenAI from "openai";
import { makeAnalysisError } from "@/lib/ecg-image/analysis-errors";
import type { EcgAnalysisErrorCode, EcgAnalysisFieldIssue, EcgImageAnalysisResult, EcgOpenAIDebugInfo } from "@/types/ecg";
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
  readonly name="openai-responses";private readonly client:OpenAI;
  constructor(apiKey:string,readonly model:string){this.client=new OpenAI({apiKey,maxRetries:1,timeout:85_000})}

  async analyze(image:EcgImagePayload,options?:{signal?:AbortSignal;requestId?:string}):Promise<ExtractedResult>{
    let base64=Buffer.from(image.bytes).toString("base64");const debug=createDebug();const startedAt=Date.now();const requestId=options?.requestId;
    try{
      const apiPromise=this.client.responses.create({model:this.model,store:false,reasoning:{effort:"low"},
        instructions:"心電図画像から客観的な所見候補だけを抽出してください。診断、原因疾患、治療、PCI適応、薬剤、薬剤量、予後は生成しないでください。読めない値はnullまたは判定不能とし、推測で正常値を補完しないでください。画像品質と解析上の制限を必ず明記してください。出力は医師確認前の候補であり最終診断ではありません。",
        input:[{role:"user",content:[{type:"input_text",text:"指定JSON Schemaに従い、心拍数、リズム、P波、PR、QRS、QT/QTc、軸、R波進行、Q波、ST、T波、U波、PVC、R on T候補、脚ブロック候補、電極装着異常候補、画像品質、解析不能理由を抽出してください。"},{type:"input_image",image_url:`data:${image.mimeType};base64,${base64}`,detail:"high"}]}],
        text:{format:{type:"json_schema",name:"ecg_image_findings",description:"心電図画像から抽出した客観的所見候補。診断や治療を含まない。",strict:true,schema:ecgImageFindingsSchema}}
      },{signal:options?.signal});
      const {data:response,response:httpResponse}=await apiPromise.withResponse();
      debug.httpStatus=httpResponse.status;debug.responseStatus=response.status??null;debug.finishReason=response.incomplete_details?.reason??(response.status==="completed"?"completed":null);
      debug.outputTypes=response.output.flatMap(item=>item.type==="message"?[item.type,...item.content.map(content=>content.type)]:[item.type]);
      debug.outputText=response.output_text||null;debug.preParseText=response.output_text||null;debug.rawResponse=safeStringify(response);
      debug.incomplete=response.status==="incomplete";debug.tokenLimitExceeded=response.incomplete_details?.reason==="max_output_tokens";
      const refusal=response.output.flatMap(item=>item.type==="message"?item.content:[]).find(item=>item.type==="refusal");debug.refusal=Boolean(refusal);
      logDiagnostic({requestId,stage:"openai_response",httpStatus:httpResponse.status,responseStatus:response.status??null,incompleteReason:response.incomplete_details?.reason??null,outputTypes:debug.outputTypes,outputTextPresent:Boolean(response.output_text),outputTextLength:response.output_text?.length??0,refusalPresent:Boolean(refusal),durationMs:Date.now()-startedAt});
      if(debug.tokenLimitExceeded)throw providerError("TOKEN_LIMIT_EXCEEDED","OpenAIの出力上限に達し、解析結果が途中で終了しました。",502,true,debug,{requestId,stage:"openai_response"});
      if(debug.incomplete)throw providerError("MODEL_OUTPUT_INCOMPLETE","OpenAIの解析結果が途中で終了しました。",502,true,debug,{requestId,stage:"openai_response"});
      if(refusal&&refusal.type==="refusal")throw providerError("MODEL_REFUSAL","OpenAIが画像を解析できませんでした。",422,false,debug,{requestId,stage:"openai_response",limitations:[refusal.refusal]});
      if(!response.output_text.trim())throw providerError("EMPTY_MODEL_RESPONSE","OpenAIから解析結果のJSON形式が取得できませんでした。",502,true,debug,{requestId,stage:"openai_response"});
      let parsed:unknown;
      try{parsed=JSON.parse(response.output_text)}catch(error){debug.sdkError=serializeError(error);throw providerError("INVALID_JSON","OpenAIから有効なJSON形式が取得できませんでした。",502,true,debug,{requestId,stage:"json_parse"})}
      const extracted=validateResult(parsed,debug,requestId);debug.structuredOutputSucceeded=true;
      if(extracted.imageQuality.analyzable===false){const code=classifyImageLimitation([...extracted.imageQuality.limitations,...extracted.limitations]);throw providerError(code,code==="ECG_REGION_NOT_FOUND"?"画像が心電図として認識されませんでした。":"OpenAIが画像から必要な心電図所見を取得できませんでした。",422,true,debug,{requestId,stage:"image_validation",limitations:[...extracted.imageQuality.limitations,...extracted.limitations]})}
      if(isDevelopment()){extracted.debug={...debug};logDebug(debug)}
      return extracted;
    }catch(error){
      if(error instanceof DOMException&&error.name==="AbortError")throw error;
      if(error instanceof ECGImageAnalysisServiceError){logDebug(error.detail.debug??debug);logErrorDiagnostic(error,requestId,startedAt);throw error}
      debug.sdkError=serializeError(error);
      if(error instanceof OpenAI.RateLimitError){debug.httpStatus=error.status;debug.rateLimited=true;throwLogged(providerError("PROVIDER_RATE_LIMITED","OpenAIのRate Limitに達しました。時間をおいて再試行してください。",429,true,debug,apiErrorOptions(error,requestId)),requestId,startedAt)}
      if(error instanceof OpenAI.APIConnectionTimeoutError){debug.timedOut=true;throwLogged(providerError("ANALYSIS_TIMEOUT","OpenAI画像解析がタイムアウトしました。",504,true,debug,{requestId,stage:"openai_request"}),requestId,startedAt)}
      if(error instanceof OpenAI.APIError){debug.httpStatus=error.status;const mapped=mapApiError(error);throwLogged(providerError(mapped.code,mapped.message,mapped.status,mapped.retryable,debug,apiErrorOptions(error,requestId)),requestId,startedAt)}
      throwLogged(providerError("PROVIDER_UNAVAILABLE","OpenAI SDKで予期しないエラーが発生しました。",502,true,debug,{requestId,stage:"openai_request"}),requestId,startedAt);
    }finally{base64=""}
  }
}

function createDebug():EcgOpenAIDebugInfo{return {httpStatus:null,responseStatus:null,finishReason:null,outputTypes:[],outputText:null,structuredOutputSucceeded:false,preParseText:null,schemaValidationError:null,sdkError:null,rateLimited:false,timedOut:false,refusal:false,incomplete:false,tokenLimitExceeded:false,rawResponse:null}}
type ProviderErrorOptions={requestId?:string;stage?:string;limitations?:string[];fieldIssues?:EcgAnalysisFieldIssue[];providerStatus?:number;providerCode?:string;providerType?:string;providerRequestId?:string};
function providerError(code:EcgAnalysisErrorCode,message:string,status:number,retryable:boolean,debug:EcgOpenAIDebugInfo,options:ProviderErrorOptions={}){return new ECGImageAnalysisServiceError(makeAnalysisError(code,message,{retryable,analysisLimitations:options.limitations,fieldIssues:options.fieldIssues,debug,...options}),status)}
function throwLogged(error:ECGImageAnalysisServiceError,requestId?:string,startedAt=Date.now()):never{logDebug(error.detail.debug??createDebug());logErrorDiagnostic(error,requestId,startedAt);throw error}

export function validateResult(value:unknown,debug=createDebug(),requestId?:string):ExtractedResult{
  const issues:EcgAnalysisFieldIssue[]=[];
  if(!value||typeof value!=="object"){debug.schemaValidationError="ルート値がobjectではありません。";throw providerError("STRUCTURED_OUTPUT_FAILED","Structured Output生成に失敗しました。",502,true,debug,{requestId,stage:"schema_validation"})}
  const result=value as Record<string,unknown>;
  for(const key of ["imageQuality","measurements","findings","confidence","limitations"])if(!(key in result))issues.push({field:key,issue:"必須項目です"});
  if(issues.length){debug.schemaValidationError=safeStringify(issues);throw providerError("SCHEMA_VALIDATION_FAILED","Schema Validationに失敗しました。",502,true,debug,{requestId,stage:"schema_validation",fieldIssues:issues})}
  const extracted=result as unknown as ExtractedResult;
  if(!Array.isArray(extracted.limitations))issues.push({field:"limitations",issue:"配列である必要があります"});
  const measurements=extracted.measurements as unknown as Record<string,unknown>;
  for(const [key,min,max] of [["heartRateBpm",10,350],["prMs",40,500],["qrsMs",20,500],["qtMs",100,1000],["qtcMs",100,1000],["axisDegrees",-180,180]] as const){const value=measurements?.[key];if(value!==null&&(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)){issues.push({field:`measurements.${key}`,issue:`${min}〜${max}の数値またはnullである必要があります`});measurements[key]=null}}
  const confidence=extracted.confidence?.perField??{};for(const key of confidenceKeys){const value=confidence[key];if(value!==null&&(typeof value!=="number"||value<0||value>1)){issues.push({field:`confidence.perField.${key}`,issue:"0〜1の数値またはnullである必要があります"});confidence[key]=null}}
  if(issues.length){debug.schemaValidationError=safeStringify(issues);extracted.partialSuccess=true;extracted.fieldIssues=issues.slice(0,5);extracted.limitations=[...extracted.limitations,"一部の項目を安全なnullへ変換しました。医師が確認してください。"]}
  return extracted;
}

function classifyImageLimitation(limitations:string[]):EcgAnalysisErrorCode{const text=limitations.join(" ").toLowerCase();if(/心電図.*(見つ|検出)|ecg.*not.*found/.test(text))return "ECG_REGION_NOT_FOUND";if(/誘導名|lead label/.test(text))return "LEADS_NOT_IDENTIFIABLE";if(/12誘導|visible leads|誘導.*不足/.test(text))return "INSUFFICIENT_VISIBLE_LEADS";if(/解像度|小さ|resolution/.test(text))return "IMAGE_TOO_SMALL";if(/紙送り|paper speed/.test(text))return "PAPER_SPEED_UNKNOWN";if(/感度|gain/.test(text))return "GAIN_UNKNOWN";return "IMAGE_NOT_ANALYZABLE"}
function mapApiError(error:{status?:number}):{code:EcgAnalysisErrorCode;message:string;status:number;retryable:boolean}{
  if(error.status===401)return {code:"PROVIDER_AUTHENTICATION_FAILED",message:"画像解析サービスの認証設定を確認してください。",status:503,retryable:false};
  if(error.status===400)return {code:"PROVIDER_REQUEST_INVALID",message:"画像解析リクエストの形式をサービスが受理できませんでした。",status:502,retryable:false};
  if(error.status===403)return {code:"MODEL_ACCESS_DENIED",message:"画像解析モデルへのアクセス権限を確認してください。",status:503,retryable:false};
  if(error.status===404)return {code:"MODEL_NOT_AVAILABLE",message:"設定されている画像解析モデルを利用できません。管理者がモデル設定を確認してください。",status:503,retryable:false};
  return {code:"PROVIDER_UNAVAILABLE",message:`OpenAI APIがHTTP ${error.status??"不明"}を返しました。`,status:502,retryable:true};
}
function apiErrorOptions(error:{status?:number;code?:string|null;type?:string|null;requestID?:string|null},requestId?:string):ProviderErrorOptions{return {requestId,stage:"openai_request",providerStatus:error.status,providerCode:error.code??undefined,providerType:error.type??undefined,providerRequestId:error.requestID??undefined}}
function serializeError(error:unknown){if(error instanceof Error)return safeStringify({name:error.name,message:error.message,stack:error.stack,...(error instanceof OpenAI.APIError?{status:error.status,code:error.code,type:error.type,requestId:error.requestID}:{} )});return safeStringify(error)}
function safeStringify(value:unknown){try{return JSON.stringify(value,null,2)}catch{return String(value)}}
function isDevelopment(){return process.env.NODE_ENV==="development"}
function logDebug(debug:EcgOpenAIDebugInfo){if(!isDevelopment())return;console.group("[ECG Analysis] OpenAI response diagnostics");console.debug("① HTTP Status",debug.httpStatus);console.debug("② Response.status",debug.responseStatus);console.debug("③ finish reason",debug.finishReason);console.debug("④ response.output types",debug.outputTypes);console.debug("⑤ response.output_text",debug.outputText);console.debug("⑥ Structured Output generated",debug.structuredOutputSucceeded);console.debug("⑦ pre-JSON-parse text",debug.preParseText);console.debug("⑧ Schema Validation Error",debug.schemaValidationError);console.debug("⑨ OpenAI SDK Error",debug.sdkError);console.debug("⑩ Rate limit",debug.rateLimited);console.debug("⑪ Timeout",debug.timedOut);console.debug("⑫ Refusal",debug.refusal);console.debug("⑬ Incomplete",debug.incomplete);console.debug("⑭ Token limit",debug.tokenLimitExceeded);console.groupEnd()}
function diagnosticsEnabled(){return process.env.ECG_ANALYSIS_DIAGNOSTICS==="true"}
function logDiagnostic(event:Record<string,unknown>){if(!diagnosticsEnabled())return;console.error("[ECG_ANALYSIS_DIAGNOSTIC]",event)}
function logErrorDiagnostic(error:ECGImageAnalysisServiceError,requestId:string|undefined,startedAt:number){const detail=error.detail;logDiagnostic({requestId:detail.requestId??requestId,stage:detail.stage??"provider_error",errorCode:detail.code,openAIErrorClass:error.name,openAIErrorStatus:detail.providerStatus??null,openAIErrorCode:detail.providerCode??null,openAIErrorType:detail.providerType??null,openAIRequestId:detail.providerRequestId??null,schemaValidationFields:detail.fieldIssues?.map(issue=>issue.field)??[],timeout:detail.code==="ANALYSIS_TIMEOUT",rateLimit:detail.code==="PROVIDER_RATE_LIMITED",durationMs:Date.now()-startedAt})}
