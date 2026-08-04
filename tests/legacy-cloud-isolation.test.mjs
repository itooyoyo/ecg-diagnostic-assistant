import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const provider=fs.readFileSync("lib/ecg-image/server/openai-ecg-image-analysis-provider.ts","utf8");
const factory=fs.readFileSync("lib/ecg-image/server/create-ecg-image-analysis-service.ts","utf8");
const workspace=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
const route=fs.readFileSync("app/api/ecg/analyze/route.ts","utf8");

test("legacy OpenAI provider is isolated from normal UI",()=>{assert.doesNotMatch(workspace,/openai-ecg-image-analysis-provider|ApiEcgImageAnalysisAdapter|\/api\/ecg\/analyze/)});
test("legacy OpenAI provider is isolated from retired route",()=>{assert.doesNotMatch(route,/create-ecg-image-analysis-service|service\.analyze|arrayBuffer/);assert.match(route,/410/)});
test("legacy provider remains server-only",()=>{assert.match(factory,/process\.env\.OPENAI_API_KEY/);assert.doesNotMatch(factory,/NEXT_PUBLIC/)});
const diagnostics=["① HTTP Status","② Response.status","③ finish reason","④ response.output types","⑤ response.output_text","⑥ Structured Output generated","⑦ pre-JSON-parse text","⑧ Schema Validation Error","⑨ OpenAI SDK Error","⑩ Rate limit","⑪ Timeout","⑫ Refusal","⑬ Incomplete","⑭ Token limit"];
for(const label of diagnostics)test(`isolated legacy diagnostics retain ${label}`,()=>assert.match(provider,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))));
for(const code of ["PROVIDER_AUTHENTICATION_FAILED","PROVIDER_REQUEST_INVALID","MODEL_NOT_AVAILABLE","MODEL_ACCESS_DENIED","PROVIDER_RATE_LIMITED","ANALYSIS_TIMEOUT","EMPTY_MODEL_RESPONSE","MODEL_REFUSAL","MODEL_OUTPUT_INCOMPLETE","INVALID_JSON","SCHEMA_VALIDATION_FAILED"]){test(`isolated legacy provider retains safe error ${code}`,()=>assert.match(provider,new RegExp(`\"${code}\"`)))}
for(const field of ["heartRateBpm","rhythm","pWave","prMs","qrsMs","axisDegrees","rWaveProgression","qWave","st","tWave","uWave","pvc","rOnT","bundleBranchBlock","qtMs","qtcMs","imageQuality","leadPlacement","limitations"]){test(`isolated schema still contains ${field}`,()=>assert.match(provider,new RegExp(field)))}
test("isolated provider still disables storage",()=>assert.match(provider,/store:false/));
test("isolated provider still uses Responses API only",()=>{assert.match(provider,/client\.responses\.create/);assert.doesNotMatch(provider,/chat\.completions/)});
