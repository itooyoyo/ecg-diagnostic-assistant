import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const provider=fs.readFileSync("lib/ecg-image/server/openai-ecg-image-analysis-provider.ts","utf8");
const route=fs.readFileSync("app/api/ecg/analyze/route.ts","utf8");
const workspace=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
const cropper=fs.readFileSync("components/ecg/EcgImageCropper.tsx","utf8");
const processing=fs.readFileSync("lib/ecg-image/client-image-processing.ts","utf8");
const limits=fs.readFileSync("lib/ecg-image/upload-limits.ts","utf8");
const adapterSource=fs.readFileSync("lib/ecg-image/image-analysis-adapter.ts","utf8");
const css=fs.readFileSync("app/globals.css","utf8");
const types=fs.readFileSync("types/ecg.ts","utf8");
const service=fs.readFileSync("lib/ecg-image/server/ecg-image-analysis-service.ts","utf8");
const adapter=fs.readFileSync("lib/ecg-image/image-analysis-adapter.ts","utf8");

const cases=[
  ["empty provider response",provider,"EMPTY_MODEL_RESPONSE"],
  ["invalid JSON",provider,"INVALID_JSON"],
  ["missing schema field",provider,"SCHEMA_VALIDATION_FAILED"],
  ["invalid enum or field issue is safe",provider,"fieldIssues"],
  ["partial invalid measurement is classified",types,"INVALID_MEASUREMENT_VALUE"],
  ["large structural failure remains an error",provider,"STRUCTURED_OUTPUT_FAILED"],
  ["provider refusal",provider,"MODEL_REFUSAL"],
  ["provider incomplete output",provider,"MODEL_OUTPUT_INCOMPLETE"],
  ["timeout",provider,"ANALYSIS_TIMEOUT"],
  ["rate limit",provider,"PROVIDER_RATE_LIMITED"],
  ["raw provider response is not returned",route,"publicErrorDetail"],
  ["API key and stack trace are not response fields",types,"suggestedActions"],
  ["image selection keeps original preview",workspace,"originalPreview"],
  ["crop starts cropping status",workspace,"cropping"],
  ["crop rectangle state is retained",workspace,"cropState"],
  ["90 degree rotation is supported",cropper,"右へ90度回転"],
  ["crop confirmation creates processed file",processing,"createProcessedEcgFile"],
  ["analysis sends upload file only",workspace,"adapter.analyze(uploadFile"],
  ["return to original is supported",workspace,"useOriginalImage"],
  ["recrop clears anonymization confirmation",workspace,"setPrivacyConfirmed(false)"],
  ["new image clears crop state",workspace,"setCropState(null)"],
  ["image removal revokes Blob URLs",workspace,"URL.revokeObjectURL"],
  ["small crop is rejected",processing,"sw<320||sh<220"],
  ["mobile crop UI remains in viewport",css,"max-height:46vh"],
  ["crop failure keeps original image available",cropper,"onCancel"],
  ["analysis failure offers crop correction",workspace,"切り抜きを修正"],
  ["analysis failure offers manual continuation",workspace,"AI解析を使わず手入力で続ける"],
  ["manual continuation displays no-AI warning",workspace,"画像AI解析未実施"],
  ["manual path does not inject mock adapter",workspace,"new ApiEcgImageAnalysisAdapter"],
  ["legacy clinical tests remain part of CI",fs.readFileSync("package.json","utf8"),"tests/*.test.mjs"],
];
for(const [name,source,needle] of cases)test(name,()=>assert.ok(source.includes(needle),`missing ${needle}`));

const diagnostics=["① HTTP Status","② Response.status","③ finish reason","④ response.output types","⑤ response.output_text","⑥ Structured Output generated","⑦ pre-JSON-parse text","⑧ Schema Validation Error","⑨ OpenAI SDK Error","⑩ Rate limit","⑪ Timeout","⑫ Refusal","⑬ Incomplete","⑭ Token limit"];
for(const label of diagnostics)test(`development diagnostics include ${label}`,()=>assert.ok(provider.includes(label)));
test("HTTP status is captured through SDK withResponse",()=>assert.ok(provider.includes("withResponse()")&&provider.includes("httpResponse.status")));
test("raw response UI is development-only",()=>assert.ok(workspace.includes('process.env.NODE_ENV==="development"')&&workspace.includes("OpenAI Raw Response（開発モードのみ）")));
test("generic ANALYSIS_FAILED is not used by the API pipeline",()=>assert.ok(!provider.includes('"ANALYSIS_FAILED"')&&!route.includes('"ANALYSIS_FAILED"')));
for(const code of ["PROVIDER_AUTHENTICATION_FAILED","PROVIDER_REQUEST_INVALID","MODEL_NOT_AVAILABLE","MODEL_ACCESS_DENIED","PROVIDER_RATE_LIMITED","ANALYSIS_TIMEOUT","EMPTY_MODEL_RESPONSE","MODEL_REFUSAL","MODEL_OUTPUT_INCOMPLETE","INVALID_JSON","SCHEMA_VALIDATION_FAILED"]){
  test(`specific provider failure is retained: ${code}`,()=>assert.ok(provider.includes(`"${code}"`)));
}
test("requestId crosses route, service, and provider",()=>assert.ok(route.includes("signal:request.signal,requestId")&&service.includes("requestId?:string")&&provider.includes("const requestId=options?.requestId")));
test("production diagnostics are explicitly gated",()=>assert.ok(provider.includes('process.env.ECG_ANALYSIS_DIAGNOSTICS==="true"')));
test("diagnostic metadata excludes image and output text bodies",()=>{const logger=provider.slice(provider.indexOf("function logErrorDiagnostic"));assert.ok(logger.includes("durationMs"));assert.ok(!logger.includes("base64"));assert.ok(!logger.includes("outputText:"));});
test("diagnostic response records only output presence and length",()=>assert.ok(provider.includes("outputTextPresent")&&provider.includes("outputTextLength")));
test("schema diagnostics retain field names",()=>assert.ok(provider.includes("schemaValidationFields:detail.fieldIssues?.map(issue=>issue.field)")));
test("mock confidence contains every strict schema key",()=>{for(const key of ["heartRate","rhythm","pWave","pr","qrs","axis","rwave","qWave","st","tWave","uWave","qtc","pvc","rOnT","bundleBranchBlock","placement","regularity"])assert.ok(adapter.includes(`${key}:null`),`missing mock confidence ${key}`)});

test("2 MB JPEG bypasses recompression under target",()=>assert.ok(processing.includes("if(source.size<=targetBytes)return")));
test("6.9 MB input targets 3.5 MB",()=>assert.ok(limits.includes("3.5*1024*1024")&&processing.includes("blob.size<=targetBytes")));
test("large PNG converts to a high quality upload format",()=>assert.ok(processing.includes('source.type==="image/webp"?"image/webp":"image/jpeg"')));
test("only uploadFile is sent to the API",()=>assert.ok(workspace.includes("adapter.analyze(uploadFile")&&!workspace.includes("adapter.analyze(originalFile")&&!workspace.includes("adapter.analyze(processedFile")));
test("quality-only attempts preserve dimensions first",()=>assert.ok(processing.indexOf("for(const configuredLongEdge")<processing.indexOf("for(const quality")));
test("quality sequence is bounded at 0.82",()=>assert.ok(limits.includes("0.94,0.91,0.88,0.85,0.82")&&!limits.includes("0.80")));
test("dimension sequence is centralized",()=>assert.ok(limits.includes("4096,3600,3200")));
test("failed compression does not return the source file",()=>assert.ok(processing.includes("判読性を保つ設定では4MB以下に軽量化できませんでした")));
test("4 MB absolute limit disables analysis",()=>assert.ok(limits.includes("ABSOLUTE_UPLOAD_BYTES=4*1024*1024")&&workspace.includes("uploadFile.size>ABSOLUTE_UPLOAD_BYTES")));
test("compression supports cancellation",()=>assert.ok(processing.includes("throwIfAborted(input.signal)")&&workspace.includes("uploadAbortRef.current?.abort()")));
test("new image clears prior uploadFile",()=>assert.ok(workspace.includes("setUploadFile(null);setUploadInfo(null)")));
test("crop confirmation regenerates uploadFile",()=>assert.ok(workspace.includes("setProcessedFile(processed)")&&workspace.includes("[processedFile,uploadRevision]")));
test("reprocessing clears anonymization confirmation",()=>assert.ok(workspace.includes("setUploadPreview(\"\");setUploadError(\"\");setPrivacyConfirmed(false)")));
test("HTTP 413 maps to FILE_TOO_LARGE before JSON parsing",()=>assert.ok(adapterSource.indexOf("response.status===413")<adapterSource.indexOf("response.json()")&&adapterSource.includes('code:"FILE_TOO_LARGE"')));
test("Vercel payload error maps to FILE_TOO_LARGE",()=>assert.ok(adapterSource.includes('vercelError==="FUNCTION_PAYLOAD_TOO_LARGE"')));
test("HTML 413 is never classified as INVALID_JSON",()=>assert.ok(adapterSource.indexOf("response.status===413")<adapterSource.indexOf("content-type")));
test("manual clinician entry remains available",()=>assert.ok(workspace.includes("AI解析を使わず手入力で続ける")));
test("compression attempts have a finite maximum",()=>assert.ok(limits.includes("MAX_COMPRESSION_ATTEMPTS")&&processing.includes("attempts>MAX_COMPRESSION_ATTEMPTS")));
