export type QualityKey = "allLeads"|"leadLabels"|"waveformsComplete"|"speedVisible"|"gainVisible"|"gridVisible"|"inFocus"|"lowBlur"|"noGlare"|"noShadow"|"lowTilt"|"lowPerspective"|"multipleBeats"|"privacyChecked";
export type QualityState = Record<QualityKey, boolean>;
export type ReviewStatus = "accepted"|"edited"|"rejected"|"indeterminate";
export type MeasuredValue = { value:number|null; unit:string; confidence:number; unmeasurable:boolean };
export type LeadName = "I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";
export type ObjectiveFindings = {
  heartRate: MeasuredValue; rhythm:string; regularity:string; pWavePresent:boolean|null;
  pWaveMorphology:string; pQrsRelationship:string; prInterval:MeasuredValue; qrsDuration:MeasuredValue;
  qtInterval:MeasuredValue; qtc:MeasuredValue; qtcFormula:string; axis:string; rWaveProgression:string;
  pathologicQWaves:string; stElevation:string; stDepression:string; tWaveAbnormality:string; uWave:string;
  ectopy:string; pacedRhythm:boolean|null; artifact:string; leadPlacementConcern:string;
  confidence:number; analysisLimitations:string[]; leadFindings:Record<LeadName,Record<string,unknown>>;
};
export type ReviewedFinding<T=string> = { aiValue:T; clinicianValue:T|null; status:ReviewStatus };
export type EvidenceSource = { sourceOrganization:"JCS"|"JHRS"|"AHA/ACC/HRS"|"ESC"; sourceTitle:string; publicationYear:number; section:string; url:string; evidenceType:"guideline"|"statement"|"peer-reviewed" };
export type AnalysisStatus="idle"|"file_selected"|"cropping"|"uploading"|"analyzing"|"partial_success"|"success"|"error"|"not_configured";
export type EcgAnalysisErrorCode =
  | "INVALID_FILE" | "FILE_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "DEIDENTIFICATION_NOT_CONFIRMED" | "AUTH_REQUIRED" | "SESSION_EXPIRED" | "ANALYSIS_RATE_LIMITED"
  | "IMAGE_DECODE_FAILED" | "IMAGE_TOO_SMALL" | "IMAGE_NOT_ANALYZABLE" | "ECG_REGION_NOT_FOUND"
  | "LEADS_NOT_IDENTIFIABLE" | "INSUFFICIENT_VISIBLE_LEADS" | "PAPER_SPEED_UNKNOWN" | "GAIN_UNKNOWN"
  | "MODEL_REFUSAL" | "EMPTY_MODEL_RESPONSE" | "MODEL_OUTPUT_INCOMPLETE" | "INVALID_JSON"
  | "STRUCTURED_OUTPUT_FAILED" | "SCHEMA_VALIDATION_FAILED" | "INVALID_MEASUREMENT_VALUE" | "TOKEN_LIMIT_EXCEEDED" | "PROVIDER_RATE_LIMITED"
  | "ANALYSIS_TIMEOUT" | "ANALYSIS_NOT_CONFIGURED" | "PROVIDER_AUTHENTICATION_FAILED" | "PROVIDER_REQUEST_INVALID"
  | "MODEL_NOT_AVAILABLE" | "LOCAL_MODEL_NOT_AVAILABLE" | "MODEL_ACCESS_DENIED" | "PROVIDER_UNAVAILABLE" | "UNEXPECTED_SERVER_ERROR" | "USER_CANCELLED";
export type EcgAnalysisFieldIssue={field:string;issue:string};
export type EcgOpenAIDebugInfo={
  httpStatus:number|null;responseStatus:string|null;finishReason:string|null;outputTypes:string[];
  outputText:string|null;structuredOutputSucceeded:boolean;preParseText:string|null;
  schemaValidationError:string|null;sdkError:string|null;rateLimited:boolean;timedOut:boolean;
  refusal:boolean;incomplete:boolean;tokenLimitExceeded:boolean;rawResponse:string|null;
};
export type EcgAnalysisErrorDetail={
  code:EcgAnalysisErrorCode;userMessage:string;retryable:boolean;suggestedActions:string[];
  fieldIssues?:EcgAnalysisFieldIssue[];analysisLimitations?:string[];requestId?:string;debug?:EcgOpenAIDebugInfo;
  providerStatus?:number;providerCode?:string;providerType?:string;providerRequestId?:string;stage?:string;
};
export type EcgImageAnalysisResult={
  analysisId:string;
  source:"local"|"real_ai"|"mock";
  model?:string;
  extractedAt:string;
  imageQuality:{analyzable:boolean|null;limitations:string[]};
  measurements:{heartRateBpm:number|null;rhythm:string|null;prMs:number|null;qrsMs:number|null;qtMs:number|null;qtcMs:number|null;axisDegrees:number|null};
  findings:{pWave:unknown;qrs:unknown;st:unknown;tWave:unknown;uWave:unknown;ectopy:unknown;pvc?:unknown;rOnT?:unknown;bundleBranchBlock?:unknown;rWaveProgression?:unknown;qWave?:unknown;leadPlacement?:unknown;regularity?:unknown};
  confidence:{overall:number|null;perField:Record<string,number|null>};
  limitations:string[];
  partialSuccess?:boolean;
  fieldIssues?:EcgAnalysisFieldIssue[];
  debug?:EcgOpenAIDebugInfo;
};
export type AnalysisProcessState={status:AnalysisStatus;progressMessage:string;errorMessage:string|null;errorDetail?:EcgAnalysisErrorDetail|null;startedAt:string|null;completedAt:string|null};
