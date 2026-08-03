import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const provider=fs.readFileSync("lib/ecg-image/server/openai-ecg-image-analysis-provider.ts","utf8");
const route=fs.readFileSync("app/api/ecg/analyze/route.ts","utf8");
const workspace=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
const cropper=fs.readFileSync("components/ecg/EcgImageCropper.tsx","utf8");
const processing=fs.readFileSync("lib/ecg-image/client-image-processing.ts","utf8");
const css=fs.readFileSync("app/globals.css","utf8");
const types=fs.readFileSync("types/ecg.ts","utf8");

const cases=[
  ["empty provider response",provider,"EMPTY_MODEL_RESPONSE"],
  ["invalid JSON",provider,"INVALID_JSON"],
  ["missing schema field",provider,"SCHEMA_VALIDATION_FAILED"],
  ["invalid enum or field issue is safe",provider,"fieldIssues"],
  ["partial invalid measurement is classified",types,"INVALID_MEASUREMENT_VALUE"],
  ["large structural failure remains an error",provider,"必須構造"],
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
  ["analysis sends active processed file",workspace,"adapter.analyze(file"],
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
