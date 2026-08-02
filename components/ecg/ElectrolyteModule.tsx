"use client";

import type {ElectrolyteInput,ElectrolyteInterpretation,ElectrolyteTarget,SuspicionLevel} from "@/types/electrolyte-interpretation";

const targets: {key:ElectrolyteTarget;label:string}[]=[
  {key:"hyperkalemia",label:"高K"},{key:"hypokalemia",label:"低K"},{key:"hypercalcemia",label:"高Ca"},{key:"hypocalcemia",label:"低Ca"},{key:"hypomagnesemia",label:"低Mg"},
];
const signals: {key:keyof ElectrolyteInput;label:string}[]=[
  {key:"peakedT",label:"尖鋭T波"},{key:"flattenedT",label:"平低T"},{key:"invertedT",label:"陰性T"},{key:"stDepression",label:"ST低下"},{key:"prominentU",label:"著明U波"},{key:"quProlongation",label:"QU延長"},
  {key:"pWaveFlattened",label:"P波平低化"},{key:"pWaveAbsent",label:"P波消失"},{key:"prProlonged",label:"PR延長"},{key:"qrsProlonged",label:"QRS延長"},{key:"sineWave",label:"Sine wave"},
  {key:"stShort",label:"ST短縮"},{key:"qAtcShort",label:"Q-aTc短縮"},{key:"stProlonged",label:"ST延長"},{key:"frequentPvc",label:"PVC多発"},{key:"vt",label:"VT"},{key:"vf",label:"VF"},{key:"tdp",label:"TdP"},
];
const levelLabels:Record<SuspicionLevel,string>={suspicious:"疑わしい",possible:"可能性あり",no_typical_findings:"典型所見なし",indeterminate:"判定不能"};

export function ElectrolyteModule({input,result,onChange}:{input:ElectrolyteInput;result:ElectrolyteInterpretation;onChange:(next:ElectrolyteInput)=>void}){
  const setSignal=(key:keyof ElectrolyteInput,checked:boolean)=>onChange({...input,[key]:checked});
  const setOverride=(key:ElectrolyteTarget,value:"auto"|SuspicionLevel)=>onChange({...input,clinicianOverrides:{...input.clinicianOverrides,[key]:value}});
  return <section className="card electrolyte-shell" aria-labelledby="electrolyte-title">
    <div className="cardhead"><div><div className="eyebrow">Electrolyte ECG</div><h3 id="electrolyte-title">電解質・薬剤性心電図変化</h3><p className="muted electrolyte-intro">ECG所見から緊急度と初期対応を整理します。原因検索や確定診断は行いません。</p></div><span className="badge">医師修正で再計算</span></div>
    <fieldset className="signal-checks electrolyte-signals"><legend>ECG所見（既存モジュール連携＋医師入力）</legend><div className="checks">{signals.map(({key,label})=><label className="check" key={String(key)}><input type="checkbox" checked={Boolean(input[key])} onChange={e=>setSignal(key,e.target.checked)}/>{label}</label>)}</div><label className="check"><input type="checkbox" checked={!input.imageQualityAdequate} onChange={e=>setSignal("imageQualityAdequate",!e.target.checked)}/>判定不能（画像品質・計測制限）</label></fieldset>
    {result.redFlags.length>0&&<div className="electrolyte-redflag" role="alert"><strong>Red Flag</strong><ul className="list">{result.redFlags.map(x=><li key={x}>{x}</li>)}</ul></div>}
    <div className="electrolyte-grid">{targets.map(({key,label})=>{const a=result.assessments[key];return <article className={`electrolyte-result electrolyte-result--${a.level}`} key={key}><div className="electrolyte-result__head"><h4>{label}</h4><span>{levelLabels[a.level]}</span></div><p>{a.supportingFindings.length?a.supportingFindings.join("・"):"該当する典型ECG所見は入力されていません。"}</p><div className="clinical-pearl"><strong>Clinical Pearl</strong><p>{a.clinicalPearl}</p></div><label>医師修正<select aria-label={`${label}疑いの医師修正`} value={input.clinicianOverrides[key]} onChange={e=>setOverride(key,e.target.value as "auto"|SuspicionLevel)}><option value="auto">AI判定</option><option value="suspicious">疑わしい</option><option value="possible">可能性あり</option><option value="no_typical_findings">典型所見なし</option><option value="indeterminate">判定不能</option></select></label></article>})}</div>
    <div className="electrolyte-plan"><div><h4>初期対応</h4>{result.nextActions.length?<ul className="list">{result.nextActions.map(x=><li key={x}>{x}</li>)}</ul>:<p className="muted">現時点で緊急対応を示す典型所見はありません。</p>}</div><div><h4>Today&apos;s Plan / 追加検査</h4><ul className="list">{result.additionalChecks.map(x=><li key={x}>{x}</li>)}</ul></div></div>
    <div className="result"><strong>判定上の制限</strong><ul className="list">{result.limitations.map(x=><li key={x}>{x}</li>)}</ul></div>
  </section>;
}
