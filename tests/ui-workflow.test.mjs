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

test("Version 2 explains its rule-based scope and three-step use", async()=>{
  const source=await readFile(workspacePath,"utf8");
  for(const text of ["このアプリでできること","ルールベース診断支援","登録された59の臨床ルール","Version 2では心電図画像そのものの自動読影は行いません","画像は任意の参照用","主要所見を入力","解析する","診断候補と理由を確認","未入力項目は正常とはみなされません","本アプリは診断支援ツールです"])assert.match(source,new RegExp(text));
  assert.doesNotMatch(source,/>LOCAL MODE</);
});

test("clinician review includes all requested objective findings", async () => {
  const source = await readFile(workspacePath, "utf8");
  for (const label of ["心拍数","リズム","P波","PR","QRS幅","軸","R波進行","Q波","ST変化","T波","U波","QT / QTc","PVC","R on T候補","脚ブロック候補","電極装着異常"]) {
    assert.match(source, new RegExp(`label:\"${label.replace("/", "\\/")}`));
  }
});

test("clinical result sections keep the requested order", async () => {
  const source = await readFile(workspacePath, "utf8");
  const labels = ["診断候補（優先順位付き）","診断理由","原因疾患鑑別","判定に不足している情報","次に確認すること","追加検査","初期対応","Clinical Pearl"];
  let cursor = -1;
  for (const label of labels) {
    const next = source.indexOf(`title=\"${label}\"`);
    assert.ok(next > cursor, `${label} should follow the preceding result section`);
    cursor = next;
  }
});

test("ordinary clinician input is reduced to seven clinical sections", async()=>{
  const source=await readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
  const labels=["心拍数・リズム","P波・PR","QRS","ST","T波","QT / QTc","その他の重要所見・臨床情報"];
  let cursor=-1;
  for(const label of labels){const next=source.indexOf(`title="${label}"`);assert.ok(next>cursor,label);cursor=next}
  assert.match(source,/未入力項目はunknownとして扱い/);
});

test("bradycardia wide QRS ST and placement details are conditionally disclosed",async()=>{
  const source=await readFile(new URL("../components/ecg/SimplifiedClinicalReview.tsx",import.meta.url),"utf8");
  assert.match(source,/n\(heartRate\).*<50/);
  assert.match(source,/\["wide","rbbb","lbbb"\]\.includes\(qrsChoice\)/);
  assert.match(source,/stChoice==="elevation"\|\|stChoice==="mixed"/);
  assert.match(source,/stChoice==="depression"\|\|stChoice==="mixed"/);
  assert.match(source,/placementWarning&&<details open>/);
});

test("advanced analysis stays closed by default while detailed modules remain available",async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/<details className="advanced-analysis">/);
  assert.doesNotMatch(source,/<details className="advanced-analysis" open>/);
  for(const moduleName of ["TachyarrhythmiaModule","BradyarrhythmiaModule","ElectrolyteModule","InterpretationNavigator","SgarbossaModule"])assert.match(source,new RegExp(`<${moduleName}`));
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
  assert.match(css, /@media\(max-width:720px\).*\.version2-intro__steps\{grid-template-columns:1fr\}/s);
});

test("image upload supports selection, drop, preview, removal and exact image MIME types", async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/accept="image\/jpeg,image\/png,image\/webp"/);
  for(const handler of ["onDragEnter","onDragOver","onDragLeave","onDrop"])assert.match(source,new RegExp(handler));
  assert.match(source,/handleSelectedFile\(e\.dataTransfer\.files\[0\]/);
  assert.match(source,/alt="解析用として送信予定の心電図画像プレビュー"/);
  assert.match(source,/URL\.createObjectURL/);
  assert.match(source,/URL\.revokeObjectURL/);
  assert.match(source,/function removeImage/);
});

test("local workflow calls the browser adapter and supports abort",async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/async function runLocalAnalysis/);
  assert.match(source,/if\(!uploadFile\|\|isBusy/);
  assert.match(source,/new AbortController/);
  assert.match(source,/localAdapterRef\.current\.analyze\(uploadFile/);
  assert.match(source,/abortRef\.current\?\.abort/);
});

test("local model absence and legacy cloud code are explicitly separated",async()=>{
  const [source,route,adapter]=await Promise.all([readFile(workspacePath,"utf8"),readFile(new URL("../app/api/ecg/analyze/route.ts",import.meta.url),"utf8"),readFile(new URL("../lib/ecg-image/local-ecg-image-analysis-adapter.ts",import.meta.url),"utf8")]);
  assert.doesNotMatch(source,/MockEcgImageAnalysisAdapter|ApiEcgImageAnalysisAdapter|\/api\/ecg\/analyze/);
  assert.match(adapter,/LOCAL_MODEL_NOT_AVAILABLE/);
  assert.match(route,/errorResponse\(410/);
  assert.doesNotMatch(route,/formData|OpenAI|service\.analyze/);
});

test("manual findings stay empty before physician entry",async()=>{
  const source=await readFile(workspacePath,"utf8");
  assert.match(source,/aiValue:""/);
  assert.match(source,/画像なしで解析可能/);
  assert.match(source,/showClinicalResults/);
  assert.doesNotMatch(source,/画像を選択し「医師入力で続ける」を選んでください/);
  assert.doesNotMatch(source,/ai:"72 bpm"/);
});

test("real analysis requires anonymization confirmation and mobile preview stacks",async()=>{
  const [source,css]=await Promise.all([readFile(workspacePath,"utf8"),readFile(cssPath,"utf8")]);
  assert.match(source,/!privacyConfirmed/);
  for(const term of ["患者氏名","患者ID","生年月日","施設名"])assert.match(source,new RegExp(term));
  assert.match(css,/@media\(max-width:720px\).*\.upload-preview\{grid-template-columns:1fr\}/s);
});

test("local pipeline uses ONNX foundation and keeps cloud route disabled",async()=>{
  const [route,adapter,manifest]=await Promise.all([
    readFile(new URL("../app/api/ecg/analyze/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../lib/ecg-image/local-ecg-image-analysis-adapter.ts",import.meta.url),"utf8"),
    readFile(new URL("../public/models/ecg/manifest.json",import.meta.url),"utf8")
  ]);
  assert.match(route,/errorResponse\(410/);
  assert.match(adapter,/onnxruntime-web\/webgpu/);
  assert.match(adapter,/onnxruntime-web\/wasm/);
  assert.match(manifest,/"modelAvailable": false/);
});
