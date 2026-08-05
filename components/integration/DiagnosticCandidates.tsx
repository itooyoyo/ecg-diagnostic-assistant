import {explainCandidate} from "@/data/rule-engine/explain-candidate.js";
import type {IntegratedDiagnosticCandidate,IntegratedOverride} from "@/types/integrated-interpretation";

export function DiagnosticCandidates({items,override,onChange}:{items:IntegratedDiagnosticCandidate[];override:IntegratedOverride;onChange:(x:IntegratedOverride)=>void}){
  return <section className="integrated-section"><h3>診断候補</h3>{items.length===0?<p className="muted">医師確定所見から優先候補は生成されていません。</p>:<div className="integrated-candidates">{items.map((candidate,index)=>{
    const explanation=explainCandidate(candidate);
    return <details key={candidate.id} open={index<2}>
      <summary><span>{candidate.mustNotMiss?"A":"B"}</span><strong>{candidate.label}</strong><small>Rule confidence：{explanation.ruleConfidence}／{candidate.urgency}</small></summary>
      <div className="integrated-candidate-body">
        <RuleEvidence rules={explanation.usedRules}/>
        <Evidence title="判定理由" items={explanation.judgmentReasons} empty="判定理由となる確定所見はありません。"/>
        <Evidence title="除外理由" items={explanation.exclusionReasons} empty="既存ルールで除外所見は確認されていません。"/>
        <Evidence title="不足情報" items={explanation.missingInformation} empty="現在の候補に固有の不足情報はありません。"/>
        <Evidence title="次に確認すべきこと" items={explanation.nextChecks}/>
        <Evidence title="追加検査" items={explanation.recommendedTests}/>
        <Evidence title="初期対応" items={explanation.initialActions}/>
        <Evidence title="鑑別・代替説明" items={candidate.alternativeExplanations}/>
        <div><h4>適用制限</h4><ul className="list">{candidate.limitations.map(value=><li key={value}>{value}</li>)}</ul></div>
        <div><h4>出典</h4><ul className="evidence-list">{candidate.sources.map(source=><li key={`${source.organization}-${source.title}`}><strong>{source.organization}</strong><span>{source.title} ({source.year})</span><small>{source.section}／{source.evidenceType}</small></li>)}</ul></div>
        <label>医師による候補判定<select value={override.candidateStates[candidate.id]??"auto"} onChange={event=>onChange({...override,candidateStates:{...override.candidateStates,[candidate.id]:event.target.value as "auto"|"accepted"|"excluded"},modifiedAt:new Date().toISOString()})}><option value="auto">ルール判定</option><option value="accepted">採用</option><option value="excluded">除外</option></select></label>
      </div>
    </details>;
  })}</div>}</section>;
}

function RuleEvidence({rules}:{rules:Array<{id:string;requiredInputs:string[];explanationJa:string}>}){
  return <div><h4>使用Rule</h4>{rules.length?<ul className="evidence-list">{rules.map(rule=><li key={rule.id}><strong>{rule.id}</strong><span>{rule.explanationJa}</span><small>使用条件：{rule.requiredInputs.join("、")}</small></li>)}</ul>:<p className="muted">使用Ruleはありません。</p>}</div>;
}

function Evidence({title,items,empty="該当情報なし"}:{title:string;items:string[];empty?:string}){
  return <div><h4>{title}</h4>{items.length?<ul className="list">{[...new Set(items)].map(item=><li key={item}>{item}</li>)}</ul>:<p className="muted">{empty}</p>}</div>;
}
