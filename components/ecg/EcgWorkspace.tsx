"use client";

import { useEffect, useMemo, useState } from "react";
import { validateEcgFile } from "@/lib/ecg-image/image-parser";
import { evaluateQuality } from "@/logic/quality/quality.js";
import { placementWarnings } from "@/logic/lead-placement/placement.js";

const qualityItems = [
  ["allLeads","12誘導がすべて写っている"],["leadLabels","誘導名が読める"],["waveformsComplete","波形が途中で切れていない"],
  ["speedVisible","紙送り速度が確認できる"],["gainVisible","感度が確認できる"],["gridVisible","グリッドが確認できる"],
  ["inFocus","画像のピントが合っている"],["lowBlur","手ぶれが少ない"],["noGlare","強い反射がない"],
  ["noShadow","影で波形が隠れていない"],["lowTilt","画像の傾きが強くない"],["lowPerspective","遠近歪みが強くない"],
  ["multipleBeats","複数拍が確認できる"],["privacyChecked","患者氏名やIDの映り込みを確認した"],
] as const;
const placementItems = ["V1は第4肋間・胸骨右縁","V2は第4肋間・胸骨左縁","V3はV2とV4の中点","V4は第5肋間・左鎖骨中線","V5はV4と同じ高さ","V6はV4と同じ高さ","四肢電極の左右を確認","誘導コードを確認","体動・筋電図ノイズを確認","基線動揺を確認"];
const systematic = ["記録品質","電極装着","心拍数","リズム","P波","PR間隔","QRS幅","QRS形態","電気軸","R波進行","Q波","ST変化","T波","U波","QT・QTc","前回心電図との比較"];
const findings = [
  {key:"heartRate",label:"心拍数",ai:"72 bpm"},{key:"rhythm",label:"リズム",ai:"洞調律"},{key:"regularity",label:"規則性",ai:"整"},
  {key:"pr",label:"PR間隔",ai:"164 ms"},{key:"qrs",label:"QRS幅",ai:"92 ms"},{key:"qtc",label:"QTc",ai:"425 ms"},
  {key:"axis",label:"電気軸",ai:"正常軸"},{key:"rwave",label:"R波進行",ai:"保たれる"},{key:"st",label:"ST変化",ai:"明らかでない"},
];

export function EcgWorkspace() {
  const [quality,setQuality]=useState<Record<string,boolean>>(()=>Object.fromEntries(qualityItems.map(([k])=>[k,false])));
  const [placement,setPlacement]=useState<boolean[]>(Array(placementItems.length).fill(false));
  const [concerns,setConcerns]=useState({raLaReversal:false,v1v2High:false});
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [fileError,setFileError]=useState("");
  const [review,setReview]=useState<Record<string,{status:string,value:string}>>(()=>Object.fromEntries(findings.map(f=>[f.key,{status:"accepted",value:f.ai}])));
  const qualityResult=useMemo(()=>evaluateQuality(quality),[quality]);
  const warnings=useMemo(()=>placementWarnings(concerns),[concerns]);

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  function chooseFile(next:File|null){
    if(preview) URL.revokeObjectURL(preview);
    setPreview("");setFile(null);setFileError("");
    if(!next)return;
    const result=validateEcgFile(next);
    if(!result.valid){setFileError(result.error??"ファイルを確認してください。");return;}
    setFile(next);setPreview(URL.createObjectURL(next));
  }
  const resultClass=qualityResult.grade==="C"?"result stop":qualityResult.grade==="B"?"result warn":"result";
  return <div className="shell">
    <aside className="side">
      <div className="brand"><div className="brandmark">⌁</div><div><div className="eyebrow">Medical AI</div><h1>ECG Diagnostic Assistant</h1></div></div>
      <nav className="nav">{["撮影・記録品質","電極装着確認","画像アップロード","AI抽出結果","所見確認・修正","Red Flag","系統的読影","診断候補","Today's Plan","原因別対応"].map((x,i)=><a className={i===0?"active":""} href={`#section-${i}`} key={x}>{String(i+1).padStart(2,"0")}　{x}</a>)}</nav>
      <div className="privacy">LOCAL SESSION<br/>画像・患者情報は保存・外部送信されません</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">Cardiac navigation console</div><h2>心電図読影・対応支援ツール</h2><p className="subtitle">心電図を読むだけでなく、次の行動まで導く</p></div><span className="badge">Ver. 0.1 / MOCK ANALYSIS</span></header>
      <div className="steps">{["品質","取込","抽出","警告","読影","対応"].map((s,i)=><span className={`step ${i===0?"on":""}`} key={s}>STEP {i} · {s}</span>)}</div>

      <section className="card" id="section-0">
        <div className="cardhead"><div><div className="eyebrow">Step 0</div><h3>撮影・記録品質</h3></div><span className="badge">手動チェック</span></div>
        <div className="checks">{qualityItems.map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={quality[key]} onChange={e=>setQuality(q=>({...q,[key]:e.target.checked}))}/>{label}</label>)}</div>
        <div className={resultClass}><strong>{qualityResult.grade}. {qualityResult.message}</strong><br/>{qualityResult.grade==="C"?"正面から、反射を避け、全12誘導・誘導名・速度・感度を含めて波形が切れないよう再撮影してください。":qualityResult.grade==="B"?"未確認項目があります。医師の判断で注意付き解析を続行できます。":"品質項目をすべて確認しました。"}</div>
      </section>

      <section className="card" id="section-1">
        <div className="cardhead"><div><div className="eyebrow">Lead placement</div><h3>電極装着確認</h3></div></div>
        <details><summary>電極装着ガイドを開く</summary>
          <h4>四肢誘導</h4><div className="leadgrid">{["RA：右上肢","LA：左上肢","RL：右下肢","LL：左下肢"].map(x=><div className="lead" key={x}>{x}</div>)}</div>
          <div className="placeholder">図版未配置：/images/ecg/lead-placement-limb.png</div>
          <h4>胸部誘導</h4><div className="leadgrid">{["V1：第4肋間・胸骨右縁","V2：第4肋間・胸骨左縁","V3：V2とV4の中点","V4：第5肋間・左鎖骨中線","V5：V4と同じ高さ・左前腋窩線","V6：V4と同じ高さ・左中腋窩線"].map(x=><div className="lead" key={x}>{x}</div>)}</div>
          <div className="result warn">V5・V6はV4と同じ水平線。胸骨角から肋間を同定し、乳頭を基準にしません。女性も乳房組織の下ではなく正しい胸壁上に配置します。</div>
          <div className="placeholder">図版未配置：/images/ecg/lead-placement-precordial.png</div>
        </details>
        <h4>装着チェックリスト</h4><div className="checks">{placementItems.map((x,i)=><label className="check" key={x}><input type="checkbox" checked={placement[i]} onChange={e=>setPlacement(v=>v.map((n,j)=>j===i?e.target.checked:n))}/>{x}</label>)}</div>
        <h4>装着ミスを疑う所見</h4><div className="grid2">
          <label className="check"><input type="checkbox" checked={concerns.raLaReversal} onChange={e=>setConcerns(x=>({...x,raLaReversal:e.target.checked}))}/>RA–LA逆接続を疑う</label>
          <label className="check"><input type="checkbox" checked={concerns.v1v2High} onChange={e=>setConcerns(x=>({...x,v1v2High:e.target.checked}))}/>V1・V2高位装着を疑う</label>
        </div>
        {warnings.map(w=><div className="result warn" key={w.code}>{w.message}<br/>診断を確定せず再記録を推奨します。続行時は解析結果に警告を付けます。</div>)}
        <details><summary>追加誘導ガイド</summary><div className="grid2"><div><h4>右側胸部誘導</h4><p className="muted">下壁虚血／右室梗塞の評価候補</p><div className="leadgrid"><div className="lead">V3R</div><div className="lead" style={{border:"1px solid var(--cyan)"}}>V4R ★</div><div className="lead">V5R・V6R</div></div></div><div><h4>後壁誘導</h4><p className="muted">V1〜V3のST低下／後壁虚血の評価候補</p><div className="leadgrid">{["V7","V8","V9"].map(x=><div className="lead" key={x}>{x}</div>)}</div></div></div></details>
      </section>

      <section className="card" id="section-2"><div className="cardhead"><div><div className="eyebrow">Step 1</div><h3>心電図画像アップロード</h3></div><span className="badge">端末内のみ</span></div>
        <div className="grid2"><div className="upload"><div><strong>JPG / JPEG / PNG / PDF</strong><p className="muted">20MB以下。サーバー保存・外部送信なし</p><input aria-label="心電図ファイル" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>chooseFile(e.target.files?.[0]??null)}/>{fileError&&<div className="error">{fileError}</div>}</div></div>
          <details open><summary>心電図の上手な撮影方法</summary><ul className="list">{["用紙全体を平らにし、真上から平行に撮影","四隅・12誘導・誘導名を含める","標準感度と紙送り速度を写す","照明反射を避け、読める解像度を確保","患者名・ID・生年月日は必要に応じて隠す"].map(x=><li key={x}>{x}</li>)}</ul></details></div>
        {file&&<div>{file.type==="application/pdf"?<div className="pdf">PDFを読み込みました：{file.name}<br/><span className="muted">ブラウザ内プレビュー対象</span></div>:<>
          {/* Blob URLs are session-local user content and cannot use Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview" src={preview} alt="アップロードした心電図のプレビュー"/>
        </>}</div>}
        <button className="btn" style={{marginTop:12}} disabled={!file||!qualityResult.canAnalyze}>モック解析を開始</button>
      </section>

      <section className="card" id="section-3"><div className="cardhead"><div><div className="eyebrow">Step 2</div><h3>AI抽出結果</h3></div><span className="badge">OBJECTIVE FINDINGS</span></div><div className="grid2">{findings.map(f=><div className="lead" key={f.key}><span className="muted">{f.label}</span><br/><strong>{f.ai}</strong></div>)}</div><div className="result warn">診断名ではなく客観的所見のモックです。実AI APIには接続していません。</div></section>
      <section className="card" id="section-4"><div className="cardhead"><div><div className="eyebrow">Clinician review</div><h3>所見確認・修正</h3></div><span className="badge">変更時に再計算</span></div>
        {findings.map(f=><div className="finding-row" key={f.key}><div><strong>{f.label}</strong><br/><span className="muted">AI: {f.ai}</span></div><input aria-label={`${f.label}の医師修正値`} value={review[f.key].value} onChange={e=>setReview(x=>({...x,[f.key]:{status:"edited",value:e.target.value}}))}/><select aria-label={`${f.label}の判定`} value={review[f.key].status} onChange={e=>setReview(x=>({...x,[f.key]:{...x[f.key],status:e.target.value}}))}><option value="accepted">正しい</option><option value="edited">修正</option><option value="rejected">削除</option><option value="indeterminate">判定不能</option></select></div>)}
        <div className="result">診断候補・対応は医師確認後の確定所見を使用します。削除・判定不能は正常として扱いません。</div>
      </section>
      <section className="card" id="section-6"><div className="cardhead"><div><div className="eyebrow">Step 4</div><h3>系統的読影</h3></div><span className="badge">UI骨格</span></div><div className="systematic">{systematic.map(x=><div key={x}>{x}</div>)}</div></section>
      <section className="card" id="section-7"><div className="cardhead"><div><div className="eyebrow">Differential</div><h3>診断候補・原因別対応</h3></div><span className="badge">ダミー表示</span></div><p className="muted">医師確定所見から将来のルールエンジンが生成します。Ver.0.1では診断確定や治療用量を提示しません。</p></section>
    </main>
    <aside className="right">
      <div className="card"><div className="robot"><div className="robotshape"/><div><div className="eyebrow">Navigator</div><strong>画像品質と電極装着を確認します</strong><p className="muted" style={{fontSize:11}}>画像未配置時プレースホルダー</p></div></div></div>
      <section className="card alert" id="section-5"><div className="eyebrow">Step 3</div><h3>Red Flag</h3><p className="muted">サンプル表示枠</p><h4>確認カテゴリ</h4><ul className="list"><li>急性冠動脈閉塞を疑う所見</li><li>持続性心室頻拍／心室細動</li><li>高度房室ブロック</li><li>wide QRS tachycardia</li><li>QT延長とTdPリスク</li><li>Brugadaパターン</li><li>高K血症疑い</li></ul><div className="result stop">理由・不足情報・直ちに確認する項目をここに表示します。</div></section>
      <section className="card" id="section-8"><div className="eyebrow">Today&apos;s Plan</div><h3>今日確認すること</h3><ul className="list">{["再心電図／前回との比較","血圧・意識・SpO₂","K・Ca・Mg","トロポニン","心エコー","右側／後壁誘導","循環器評価"].map(x=><li key={x}>{x}</li>)}</ul></section>
    </aside>
  </div>;
}
