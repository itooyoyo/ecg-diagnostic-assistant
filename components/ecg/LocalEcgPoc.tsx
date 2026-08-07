"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {analyzeLocalEcgPoc,recalculateLocalPocRules} from "@/lib/ecg-features/local/local-poc.js";
import type {LocalAnalysisStatus,LocalPocCorrection,LocalPocResult,QrsWidthCandidate,RhythmRegularity,StDirection} from "@/types/local-ecg-poc";

type LayoutChoice="auto"|"three_by_four"|"six_by_two"|"unknown";
type UiStatus=LocalAnalysisStatus|"unsupported"|"failed";
const statusLabels:Record<UiStatus,string>={idle:"待機中",validating_image:"画像品質を確認中",detecting_layout:"心電図配置を確認中",extracting_waveforms:"12誘導の波形候補を抽出中",measuring:"客観的所見候補を計測中",evaluating_rules:"登録済みルールで再評価中",success:"解析完了",unsupported:"自動解析対象外",failed:"解析失敗",cancelled:"解析を中止しました"};

export function LocalEcgPoc({file}:{file:File}){
 const [status,setStatus]=useState<UiStatus>("idle"),[result,setResult]=useState<LocalPocResult|null>(null),[message,setMessage]=useState(""),[layoutType,setLayoutType]=useState<LayoutChoice>("auto");
 const previewUrl=useMemo(()=>URL.createObjectURL(file),[file]);
 const [correction,setCorrection]=useState<LocalPocCorrection>({heartRateBpm:null,rhythmRegularity:"indeterminate",qrsWidthCandidate:"indeterminate",stDirections:[],source:"physician_corrected"});
 const controller=useRef<AbortController|null>(null),busy=!["idle","success","unsupported","failed","cancelled"].includes(status);
 useEffect(()=>()=>URL.revokeObjectURL(previewUrl),[previewUrl]);
 async function run(){controller.current?.abort();controller.current=new AbortController();setResult(null);setMessage("");try{const next=await analyzeLocalEcgPoc(file,{signal:controller.current.signal,onStatus:setStatus,layoutType});setResult(next);setStatus("success");setCorrection({heartRateBpm:next.measurements.heartRateBpm,rhythmRegularity:next.measurements.rhythmRegularity,qrsWidthCandidate:next.measurements.qrsWidthCandidate,stDirections:next.measurements.stDirections,source:"physician_corrected"})}catch(error){if(controller.current.signal.aborted){setStatus("cancelled");return}setStatus(error instanceof Error&&error.name==="UnsupportedImageError"?"unsupported":"failed");setMessage(error instanceof Error?error.message:"ローカル解析に失敗しました。")}}
 function recalculate(){if(!result)return;setStatus("evaluating_rules");const updated=recalculateLocalPocRules(correction,result.imageQuality);setResult({...result,...updated});setStatus("success")}
 function changeLayout(value:LayoutChoice){setLayoutType(value);setResult(null);setMessage("");setStatus("idle")}
 return <section className="local-poc" aria-labelledby="local-poc-title">
  <header><div><div className="eyebrow">Version 3 PoC</div><h4 id="local-poc-title">最小ローカル自動解析</h4></div><span className="badge">ブラウザ内処理</span></header>
  <p>3行×4列または6行×2列の12誘導画像を対象に、画像品質、心拍数、RR規則性、QRS幅候補、誘導別ST方向候補を推定します。</p>
  <label className="phase-b-layout-select">心電図の配置<select value={layoutType} disabled={busy} onChange={event=>changeLayout(event.target.value as LayoutChoice)}><option value="auto">自動判定</option><option value="three_by_four">3行×4列</option><option value="six_by_two">6行×2列</option><option value="unknown">不明</option></select></label>
  {layoutType==="six_by_two"&&<div className="result"><strong>6行×2列として選択</strong><br/>左列 I・II・III・aVR・aVL・aVF、右列 V1〜V6の位置候補を生成します。</div>}
  <div className="upload-actions"><button className="btn primary-action" type="button" disabled={busy||layoutType==="unknown"} onClick={run}>ローカル解析を開始</button>{busy&&<button className="btn" type="button" onClick={()=>controller.current?.abort()}>解析を中止</button>}</div>
  <div className="analysis-status" role="status" aria-live="polite">{busy&&<span className="analysis-spinner" aria-hidden="true"/>}<strong>{statusLabels[status]}</strong></div>{message&&<div className="result warn" role="alert">{message}</div>}
  {status==="unsupported"&&<div className="upload-actions"><button className="btn" type="button" onClick={()=>document.getElementById("quick-review")?.scrollIntoView({behavior:"smooth"})}>医師入力で続ける</button></div>}
  {status==="success"&&result&&<>
   <div className="clinical-disclaimer"><strong>画像から推定した特徴候補と、登録済みルールに基づく診断支援結果です。</strong><p>自動診断ではありません。すべての候補を医師が原画像で確認し、承認または修正してください。緊急時は本結果を待たず標準診療を優先してください。</p></div>
   <div className="poc-metrics"><Metric label="画像品質" value={result.imageQuality}/><Metric label="レイアウト" value={result.layout}/><Metric label="心拍数候補" value={result.measurements.heartRateBpm==null?"判定困難":`${result.measurements.heartRateBpm} /分`}/><Metric label="RR規則性" value={result.measurements.rhythmRegularity}/><Metric label="QRS候補" value={result.measurements.qrsWidthCandidate}/></div>
   <MeasurementAudit result={result} previewUrl={previewUrl}/><PhysicianComparison result={result}/>
   <fieldset className="poc-correction"><legend>医師確認・修正</legend><label>心拍数<input type="number" min="1" max="300" value={correction.heartRateBpm??""} onChange={event=>setCorrection(current=>({...current,heartRateBpm:event.target.value?Number(event.target.value):null}))}/></label><label>RR規則性<select value={correction.rhythmRegularity} onChange={event=>setCorrection(current=>({...current,rhythmRegularity:event.target.value as RhythmRegularity}))}><option value="regular">規則的</option><option value="regularly_irregular">規則的不整</option><option value="irregularly_irregular">絶対性不整候補</option><option value="indeterminate">判定困難</option></select></label><label>QRS分類<select value={correction.qrsWidthCandidate} onChange={event=>setCorrection(current=>({...current,qrsWidthCandidate:event.target.value as QrsWidthCandidate}))}><option value="narrow">Narrow</option><option value="wide">Wide</option><option value="indeterminate">判定困難</option></select></label><div className="poc-st-grid">{correction.stDirections.map(item=><label key={item.lead}>{item.lead}<select value={item.direction} onChange={event=>setCorrection(current=>({...current,stDirections:current.stDirections.map(candidate=>candidate.lead===item.lead?{...candidate,direction:event.target.value as StDirection}:candidate)}))}><option value="elevation">上昇候補</option><option value="depression">低下候補</option><option value="isoelectric">等電位候補</option><option value="indeterminate">判定困難</option></select></label>)}</div><button className="btn primary-action" type="button" onClick={recalculate}>修正所見でルールを再計算</button></fieldset>
   <RuleResult result={result}/>
  </>}
 </section>
}

function Metric({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
function MeasurementAudit({result,previewUrl}:{result:LocalPocResult;previewUrl:string}){
 const measurement=result.measurements,accepted=measurement.peakCandidates.filter(item=>item.accepted),rejected=measurement.peakCandidates.filter(item=>!item.accepted),rr=measurement.rrIntervals,trace=result.longII??result.leads.find(item=>item.lead==="II")??null,points=trace?.points??[],minX=points[0]?.x??0,maxX=points.at(-1)?.x??1,minY=points.length?Math.min(...points.map(point=>point.y)):0,maxY=points.length?Math.max(...points.map(point=>point.y)):1,spanX=Math.max(1,maxX-minX),spanY=Math.max(1,maxY-minY);
 const polyline=points.map(point=>`${((point.x-minX)/spanX)*100},${((point.y-minY)/spanY)*40}`).join(" ");
 return <details><summary>計測監査：long II・R peak・QRS・ST・Rule Context</summary>
  {result.longII?.audit&&<CenterlineAuditView result={result} previewUrl={previewUrl}/>}
  <p>long II: {result.longII?`${result.longII.quality}、${result.longII.points.length} points`:"未検出"}／HR source: {measurement.heartRateSource}／RR source: {measurement.rhythmSource}</p>
  <p>R peak raw candidates {measurement.rawPeakCandidateCount}、clusters {measurement.peakClusterCount}、accepted {accepted.length}、rejected {rejected.length}、refractory violations {rejected.filter(item=>item.rejectionReason==="refractory_period").length}</p>
  <p>prominence median {measurement.peakQuality.prominenceMedian??"-"}、refractory violation rate {(measurement.peakQuality.refractoryViolationRate*100).toFixed(1)}%、RR outlier rate {measurement.peakQuality.rrOutlierRate==null?"-":`${(measurement.peakQuality.rrOutlierRate*100).toFixed(1)}%`}</p>
  {points.length>0&&<svg viewBox="0 0 100 40" role="img" aria-label="long IIに重ねたR peak候補"><polyline points={polyline} fill="none" stroke="currentColor" strokeWidth=".35"/>{measurement.peakCandidates.map((peak,index)=>{const nearest=points.reduce((best,point)=>Math.abs(point.x-peak.x)<Math.abs(best.x-peak.x)?point:best,points[0]);return <circle key={`${peak.x}-${index}`} cx={((peak.x-minX)/spanX)*100} cy={((nearest.y-minY)/spanY)*40} r=".7" fill={peak.accepted?"#22d3ee":"#ef4444"}/>})}</svg>}
  <p>RR intervals: {rr.length?rr.join(", "):"判定困難"}／median {median(rr)??"-"}／min {rr.length?Math.min(...rr):"-"}／max {rr.length?Math.max(...rr):"-"}</p>
  <ul className="list">{measurement.peakCandidates.map((peak,index)=><li key={`${peak.x}-${index}`}>x/y {Math.round(peak.x)}/{Math.round(peak.y)}・prominence {peak.prominence.toFixed(1)}・amplitude {peak.amplitude.toFixed(1)}・width {peak.candidateWidthPx.toFixed(1)}・cluster {peak.clusterId}・preceding/following {peak.precedingRrPx??"-"}/{peak.followingRrPx??"-"}・{peak.accepted?"accepted":`rejected (${peak.rejectionReason}; ${peak.artifactClass})`}</li>)}</ul>
  <p>QRS lead {measurement.qrsAudit.measurementLead??"未選択"}／beats {measurement.qrsAudit.beatCount}／median {measurement.qrsAudit.medianDurationMs??"判定困難"} ms／quality {measurement.qrsAudit.quality}</p>
  <ul className="list">{measurement.qrsAudit.beats.map((beat,index)=><li key={`${beat.peakX}-${index}`}>peak {Math.round(beat.peakX)}・onset {beat.onsetX??"-"}・offset {beat.offsetX??"-"}・duration {beat.durationMs??"-"} ms</li>)}</ul>
  <table><thead><tr><th>lead</th><th>baseline</th><th>J-point</th><th>ST sample</th><th>difference</th><th>direction</th><th>quality / limitations</th></tr></thead><tbody>{measurement.stDirections.map(item=><tr key={item.lead}><td>{item.lead}</td><td>{item.baselineY??"-"}</td><td>{item.jPointCandidate?`${item.jPointCandidate.x}, ${item.jPointCandidate.y}`:"-"}</td><td>{item.samplePointCandidate?`${item.samplePointCandidate.x}, ${item.samplePointCandidate.y}`:"-"}</td><td>{item.differencePx??"-"}</td><td>{item.direction}</td><td>{item.quality} / {item.limitations.join("、")}</td></tr>)}</tbody></table>
  <h5>Rule Context監査</h5><table><thead><tr><th>field</th><th>value</th><th>source</th><th>quality</th></tr></thead><tbody>{result.contextAudit.map(item=><tr key={item.field}><td>{item.field}</td><td>{item.value==null?"unknown / null":String(item.value)}</td><td>{item.source}</td><td>{item.quality}</td></tr>)}</tbody></table>
 </details>
}
function CenterlineAuditView({result,previewUrl}:{result:LocalPocResult;previewUrl:string}){
 const trace=result.longII, audit=trace?.audit;if(!trace||!audit)return null;const roi=audit.roi,viewBox=`${roi.x} ${roi.y} ${Math.max(1,roi.width)} ${Math.max(1,roi.height)}`;
 const accepted=result.measurements.peakCandidates.filter(item=>item.accepted),rejected=result.measurements.peakCandidates.filter(item=>!item.accepted);
 const longMissing=audit.missingSegments.filter(segment=>segment.length>=5),shownMissing=longMissing.slice(0,20);
 const pointString=(points:Array<{x:number;y:number}>)=>points.map(point=>`${point.x},${point.y}`).join(" ");
 return <section aria-labelledby="long-ii-audit-title"><h5 id="long-ii-audit-title">long II 波形抽出監査</h5>
  <p>tracking coverage {(audit.trackingCoverage*100).toFixed(1)}%（{audit.trackedColumns}/{audit.totalColumns}列）／missing {audit.missingColumns}列／ambiguous {audit.ambiguousColumns}列</p>
  <svg viewBox={viewBox} role="img" aria-label="long II原画像、候補画素、旧Polyline、改善centerline、R peakの重ね合わせ">
   {previewUrl&&<image href={previewUrl} x="0" y="0" width={audit.sourceWidth} height={audit.sourceHeight} preserveAspectRatio="none" opacity=".55"/>}
   {audit.candidatePoints.map((point,index)=><circle key={`candidate-${index}`} cx={point.x} cy={point.y} r=".45" fill="#facc15" opacity=".45"/>)}
   {audit.legacyPoints.length>0&&<polyline points={pointString(audit.legacyPoints)} fill="none" stroke="#f97316" strokeWidth="1" opacity=".7"/>}
   <polyline points={pointString(trace.points)} fill="none" stroke="#22d3ee" strokeWidth="1.2"/>
   {accepted.map((peak,index)=><circle key={`accepted-${index}`} cx={peak.x} cy={peak.y} r="3" fill="#22c55e"/>)}
   {rejected.map((peak,index)=><circle key={`rejected-${index}`} cx={peak.x} cy={peak.y} r="2" fill="#ef4444" opacity=".8"/>)}
  </svg>
  <p className="muted">黄: 二値化候補／橙: 旧Polyline／シアン: 改善centerline／緑: accepted／赤: rejected</p>
  <p>missing segments: {audit.missingSegments.length}区間（5列以上 {longMissing.length}区間）{shownMissing.length?`：${shownMissing.map(segment=>`${Math.round(segment.startX)}–${Math.round(segment.endX)} (${segment.length})`).join("、")}${longMissing.length>shownMissing.length?"…":""}`:""}</p>
  <p>HR source: {result.measurements.heartRateSource}／limitations: {[...trace.limitations,...result.measurements.limitations].join("、")||"なし"}</p>
 </section>
}
function PhysicianComparison({result}:{result:LocalPocResult}){const rows=[{label:"心拍数",value:result.measurements.heartRateBpm??"判定困難"},{label:"RR規則性",value:result.measurements.rhythmRegularity},{label:"QRS duration",value:result.measurements.estimatedQrsDurationMs??"判定困難"},{label:"QRS narrow/wide",value:result.measurements.qrsWidthCandidate},...result.measurements.stDirections.map(item=>({label:`${item.lead} ST`,value:item.direction}))];return <details><summary>医師確認用比較表</summary><table><thead><tr><th>項目</th><th>ローカル推定</th><th>医師確認</th><th>一致／不一致</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}><td>{row.label}</td><td>{row.value}</td><td aria-label={`${row.label} 医師確認欄`}></td><td></td></tr>)}</tbody></table></details>}
function RuleResult({result}:{result:LocalPocResult}){const output=result.ruleResult;return <section className="poc-rule-results"><h4>57ルールによる結果</h4><p><strong>緊急度:</strong> {output.urgency}</p><h5>見逃してはいけない候補</h5><ul className="list">{output.criticalFindings.length?output.criticalFindings.map(item=><li key={item.id}>{item.label}（{item.ruleIds.join(", ")}）</li>):<li>抽出・承認済み所見から発火した候補なし</li>}</ul><h5>診断候補</h5><ul className="list">{output.diagnosticCandidates.length?output.diagnosticCandidates.map(item=><li key={item.id}><strong>{item.label}</strong> — {item.supportingFindings.map(finding=>finding.label).join("、")||"理由は詳細解析で確認"} <small>{item.ruleIds.join(", ")}</small></li>):<li>候補なし（未抽出項目は正常ではなく未評価です）</li>}</ul><h5>追加確認・不足情報</h5><ul className="list">{output.missingInformation.slice(0,8).map(item=><li key={item.id}>{item.label}</li>)}</ul><h5>追加検査・初期対応</h5><ul className="list">{output.todaysPlan.slice(0,10).map(item=><li key={item.id}>{item.label}</li>)}</ul>{result.indeterminateFields.length>0&&<p className="muted">未評価: {result.indeterminateFields.join("、")}</p>}</section>}
function median(values:number[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}
