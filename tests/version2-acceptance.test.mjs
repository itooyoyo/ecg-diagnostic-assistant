import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workspace=fs.readFileSync("components/ecg/EcgWorkspace.tsx","utf8");
const navigator=fs.readFileSync("components/ecg/SystematicReviewNavigator.tsx","utf8");
const changelog=fs.readFileSync("CHANGELOG.md","utf8");

test("authenticated workspace opens with the concise Version 2 purpose and privacy message",()=>{
  for(const text of ["心電図画像を確認し、各所見を順番に入力","既存ルール","画像から所見を自動抽出せず","外部解析サービスへ送信しません"])assert.match(workspace,new RegExp(text));
  assert.match(workspace,/<details><summary>Version 2の詳細と制限<\/summary>/);
});

test("accepted fourteen-step protocol is present in order",()=>{
  const titles=["記録条件・撮影品質","心拍数・規則性","P波","PR／PQ","QRS幅・形態","電気軸","R波進行","異常Q波","ST変化","T波","U波","QT／QTc","期外収縮・R on T","最終確認"];
  let cursor=-1;
  for(const title of titles){const next=navigator.indexOf(`title:\"${title}\"`);assert.ok(next>cursor,title);cursor=next}
});

test("normal screen keeps Rule IDs and competing details inside advanced analysis",()=>{
  const advanced=workspace.indexOf('<details className="advanced-analysis">');
  assert.ok(advanced>0);
  assert.ok(workspace.indexOf("<IntegratedInterpretation",advanced)>advanced);
  assert.ok(workspace.indexOf("<ClinicalResults")<advanced);
});

test("local workflow contains no cloud analysis invocation",()=>{
  assert.doesNotMatch(workspace,/\/api\/ecg\/analyze|OpenAI|ApiEcgImageAnalysisAdapter|MockEcgImageAnalysisAdapter/);
  assert.match(workspace,/URL\.revokeObjectURL/);
});

test("Version 2 release notes contain required features and limitations",()=>{
  for(const text of ["OpenAIを使用する通常解析経路を停止","PIN認証","14段階","57ルール","Explainable Rule Engine","未確認項目","Red Flag","画像からの自動所見抽出は未搭載","OCRは未搭載","前向き検証は未実施"])assert.match(changelog,new RegExp(text));
});

test("existing ten-case manual workflow suite remains part of acceptance",()=>{
  const clinical=fs.readFileSync("tests/clinical-cases.test.mjs","utf8");
  for(let index=1;index<=10;index++)assert.match(clinical,new RegExp(`clinical case ${String(index).padStart(2,"0")}`));
});
