"use client";

import {CriticalSummary} from "./CriticalSummary";
import {DiagnosticCandidates} from "./DiagnosticCandidates";
import {DiagnosticConflictCard} from "./DiagnosticConflictCard";
import {IntegratedTodaysPlan} from "./IntegratedTodaysPlan";
import {ExternalToolActions} from "./ExternalToolActions";
import type {IntegratedInterpretation as Result,IntegratedOverride,IntegratedUrgency} from "@/types/integrated-interpretation";

export function IntegratedInterpretation({result,override,onOverrideChange}:{result:Result;override:IntegratedOverride;onOverrideChange:(x:IntegratedOverride)=>void}){
  return <section className="card integrated-shell" id="integrated-summary">
    <div className="cardhead"><div><div className="eyebrow">Explainable Rule Engine</div><h2>総合診断・優先度統合</h2><p className="muted">画像モデルは所見抽出のみを担当し、医師確認・修正後の所見を先生作成ルールだけで再計算します。</p></div><span className="badge">品質 {result.dataQuality}</span></div>
    <CriticalSummary result={result}/>
    <section className="integrated-controls"><h3>医師による総合判定修正</h3><div className="integrated-control-grid"><label>総合緊急度<select value={override.urgency} onChange={e=>onOverrideChange({...override,urgency:e.target.value as "auto"|IntegratedUrgency,modifiedAt:new Date().toISOString()})}><option value="auto">エンジン判定</option><option value="resuscitation">蘇生対応</option><option value="emergency">緊急</option><option value="same_day">当日評価</option><option value="routine">通常評価</option><option value="uncertain">判定不能</option></select></label><label>総合コメント<textarea value={override.summaryComment} onChange={e=>onOverrideChange({...override,summaryComment:e.target.value,modifiedAt:new Date().toISOString()})} placeholder="医師確認後のコメント"/></label></div>{result.revision.modified&&<p className="muted">医師修正あり：{override.modifiedAt?new Date(override.modifiedAt).toLocaleString("ja-JP"):"時刻未記録"}。下位モジュールの確定値は変更していません。</p>}</section>
    <div className="integrated-grid"><section className="integrated-section"><h3>重要所見サマリー</h3><ul className="list">{result.criticalFindings.map(x=><li key={x.id}>{x.label}</li>)}</ul>{result.missingInformation.length>0&&<p className="muted">追加確認：{result.missingInformation.map(x=>x.label).join("、")}</p>}</section><DiagnosticConflictCard items={result.conflictingFindings}/></div>
    <DiagnosticCandidates items={result.diagnosticCandidates} override={override} onChange={onOverrideChange}/>
    <IntegratedTodaysPlan items={result.todaysPlan} override={override} onChange={onOverrideChange}/>
    <ExternalToolActions items={result.externalToolActions}/>
    <div className="result"><strong>安全上の制限</strong><ul className="list">{result.limitations.map(x=><li key={x}>{x}</li>)}</ul></div>
  </section>
}
