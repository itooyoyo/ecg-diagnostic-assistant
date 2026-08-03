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
