import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workspacePath = new URL("../components/ecg/EcgWorkspace.tsx", import.meta.url);
const cssPath = new URL("../app/globals.css", import.meta.url);

test("physician-first workflow exposes the three primary steps", async () => {
  const source = await readFile(workspacePath, "utf8");
  const upload = source.indexOf('id="quick-upload"');
  const review = source.indexOf('id="quick-review"');
  const result = source.indexOf('id="clinical-results"');
  assert.ok(upload >= 0 && review > upload && result > review);
});

test("clinician review includes all requested objective findings", async () => {
  const source = await readFile(workspacePath, "utf8");
  for (const label of ["心拍数","リズム","P波","PR","QRS幅","軸","R波進行","Q波","ST変化","T波","U波","QT / QTc","電極装着異常"]) {
    assert.match(source, new RegExp(`label:\"${label.replace("/", "\\/")}`));
  }
});

test("clinical result sections keep the requested order", async () => {
  const source = await readFile(workspacePath, "utf8");
  const labels = ["診断候補（優先順位付き）","診断理由","鑑別診断","追加で確認すべき所見","推奨追加検査","初期対応","Clinical Pearl"];
  let cursor = -1;
  for (const label of labels) {
    const next = source.indexOf(`title=\"${label}\"`);
    assert.ok(next > cursor, `${label} should follow the preceding result section`);
    cursor = next;
  }
});

test("diagnostic results expose reasons, Red Flag, priorities, and care timeline", async () => {
  const source = await readFile(workspacePath, "utf8");
  assert.match(source, /x\.supportingFindings\.map/);
  assert.match(source, /採用理由/);
  assert.match(source, /否定理由/);
  assert.match(source, /見逃してはいけない疾患/);
  assert.match(source, /criticalFindings/);
  assert.match(source, /緊急/);
  assert.match(source, /早め/);
  assert.match(source, /状況次第/);
  assert.match(source, /今すぐ/);
  assert.match(source, /15分以内/);
  assert.match(source, /30〜60分以内/);
});

test("advanced analysis is closed by default and mobile UI stacks without overflow helpers", async () => {
  const [source, css] = await Promise.all([readFile(workspacePath, "utf8"), readFile(cssPath, "utf8")]);
  assert.match(source, /<details className="advanced-analysis">/);
  assert.doesNotMatch(source, /<details className="advanced-analysis" open/);
  assert.match(css, /@media\(max-width:720px\).*\.finding-editor\{grid-template-columns:1fr\}/s);
});

test("image upload supports selection, drop, preview, removal and exact image MIME types", async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/accept="image\/jpeg,image\/png,image\/webp"/);
  for(const handler of ["onDragEnter","onDragOver","onDragLeave","onDrop"])assert.match(source,new RegExp(handler));
  assert.match(source,/handleSelectedFile\(e\.dataTransfer\.files\[0\]/);
  assert.match(source,/alt="選択した心電図画像のプレビュー"/);
  assert.match(source,/URL\.createObjectURL/);
  assert.match(source,/URL\.revokeObjectURL/);
  assert.match(source,/function removeImage/);
});

test("analysis workflow calls the adapter, prevents duplicate submission and supports abort",async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/async function runImageAnalysis/);
  assert.match(source,/if\(!file\|\|isBusy/);
  assert.match(source,/new AbortController/);
  assert.match(source,/adapter\.analyze\(file/);
  assert.match(source,/abortRef\.current\?\.abort/);
});

test("unconfigured API and mock mode are explicitly separated",async()=>{
  const [source,route,adapter]=await Promise.all([readFile(workspacePath,"utf8"),readFile(new URL("../app/api/ecg/analyze/route.ts",import.meta.url),"utf8"),readFile(new URL("../lib/ecg-image/image-analysis-adapter.ts",import.meta.url),"utf8")]);
  assert.doesNotMatch(source,/MockEcgImageAnalysisAdapter|NEXT_PUBLIC_ENABLE_ECG_MOCK_ANALYSIS|demoMode/);
  assert.match(adapter,/class MockEcgImageAnalysisAdapter/);
  assert.match(route,/errorResponse\(501/);
  assert.match(route,/ANALYSIS_NOT_CONFIGURED/);
  assert.match(adapter,/FormData/);
  assert.doesNotMatch(adapter,/catch[^{]*\{[^}]*MockEcgImageAnalysisAdapter/s);
});

test("normal findings stay hidden before successful image analysis",async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/aiValue:"未解析"/);
  assert.match(source,/analysis\.status!=="success"/);
  assert.match(source,/画像解析後に表示されます/);
  assert.doesNotMatch(source,/ai:"72 bpm"/);
});

test("real analysis requires anonymization confirmation and mobile preview stacks",async()=>{
  const [source,css]=await Promise.all([readFile(workspacePath,"utf8"),readFile(cssPath,"utf8")]);
  assert.match(source,/!privacyConfirmed/);
  assert.match(source,/患者氏名・IDなどの識別情報/);
  assert.match(css,/@media\(max-width:720px\).*\.upload-preview\{grid-template-columns:1fr\}/s);
});

test("server pipeline uses a replaceable ECGImageAnalysisService and server-only OpenAI provider",async()=>{
  const [route,service,factory,provider]=await Promise.all([
    readFile(new URL("../app/api/ecg/analyze/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../lib/ecg-image/server/ecg-image-analysis-service.ts",import.meta.url),"utf8"),
    readFile(new URL("../lib/ecg-image/server/create-ecg-image-analysis-service.ts",import.meta.url),"utf8"),
    readFile(new URL("../lib/ecg-image/server/openai-ecg-image-analysis-provider.ts",import.meta.url),"utf8")
  ]);
  assert.match(route,/service\.analyze/);
  assert.match(route,/bytes\.fill\(0\)/);
  assert.match(service,/type EcgImageAnalysisProvider/);
  assert.match(service,/class ECGImageAnalysisService/);
  assert.match(factory,/process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(factory,/NEXT_PUBLIC/);
  assert.match(provider,/https:\/\/api\.openai\.com\/v1\/chat\/completions/);
  for(const field of ["heartRateBpm","rhythm","pWave","prMs","qrsMs","axisDegrees","rWaveProgression","qWave","st","tWave","uWave","qtMs","qtcMs","imageQuality","leadPlacement","limitations"])assert.match(provider,new RegExp(field));
});
