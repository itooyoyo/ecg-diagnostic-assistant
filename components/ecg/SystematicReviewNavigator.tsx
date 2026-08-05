"use client";
import {useEffect,useMemo,useState} from "react";
import {createReviewState,evaluateReviewNavigator,reviewProgress,reviewStatuses} from "@/logic/review-navigator/evaluate-review.js";

type Status="unreviewed"|"normal"|"abnormal"|"indeterminate";
type Step={id:string;title:string;hint:string;items:string[];signals?:{key:string;label:string}[]};
const steps:Step[]=[
 {id:"quality",title:"記録条件・撮影品質",hint:"12誘導、校正、画像切れと装着異常を最初に確認",items:["12誘導の有無","誘導名","紙送り速度","感度","校正波形","基線動揺","筋電図ノイズ","反射","画像切れ","電極装着異常疑い","V1／V2肋間位置","左右上肢電極逆接続"],signals:[{key:"limbReversal",label:"左右上肢電極逆接続疑い"}]},
 {id:"rate",title:"心拍数",hint:"心房拍数と心室拍数を分けて確認",items:["心拍数","心房拍数","心室拍数","徐脈","頻脈"]},
 {id:"rhythm",title:"リズム",hint:"規則性とP波・QRSの関係を確認",items:["regular","regularly irregular","irregularly irregular","洞調律候補","VF候補","持続性VT候補"],signals:[{key:"sinusRhythm",label:"洞調律候補"},{key:"regular",label:"regular"},{key:"irregularlyIrregular",label:"irregularly irregular"},{key:"vf",label:"VF候補"},{key:"sustainedVt",label:"持続性VT候補"}]},
 {id:"pwave",title:"P波",hint:"まず有無を確認し、IIおよびV1を参照",items:["P波あり／なし／不明","IIで陽性","aVRで陰性","V1形態","陰性P波","細動波候補","粗動波候補","P波とQRSの関係"],signals:[{key:"absent",label:"P波なし"}]},
 {id:"pr",title:"PR／PQ",hint:"一定性とQRS脱落を長い記録で確認",items:["PR時間","一定／変動","短縮","延長","脱落"],signals:[{key:"completeBlock",label:"完全房室ブロック候補"}]},
 {id:"qrs",title:"QRS幅・形態",hint:"最も幅を測定しやすい誘導で測定",items:["QRS幅","narrow／wide","RBBB候補","LBBB候補","IVCD","ペーシング","前興奮／Δ波"],signals:[{key:"narrow",label:"narrow QRS"},{key:"rbbb",label:"RBBB候補"},{key:"lbbb",label:"LBBB候補"}]},
 {id:"axis",title:"電気軸",hint:"軸角度と方向を確認",items:["軸角度","正常","左軸偏位","右軸偏位","極端軸偏位"],signals:[{key:"confirmed",label:"軸評価を確定"}]},
 {id:"rwave",title:"R波進行",hint:"V1からV6まで連続して確認",items:["正常","poor R progression","reversed progression","V1で高いR波"],signals:[{key:"tallRv1v3",label:"V1～V3で高いR波"}]},
 {id:"qwave",title:"異常Q波",hint:"該当誘導、幅、深さを確認",items:["異常Q波","該当誘導","幅","深さ"]},
 {id:"st",title:"ST変化",hint:"J点と基線を確認し、連続する誘導で評価",items:["誘導別方向・振幅","連続誘導","reciprocal change","広範ST低下","aVR上昇","動的変化","前回ECG比較","J点"],signals:[{key:"inferiorElevation",label:"II・III・aVF ST上昇"},{key:"v1v3Depression",label:"V1～V3 ST低下"},{key:"v1v3Elevation",label:"V1～V3 ST上昇"},{key:"acuteOcclusion",label:"急性冠閉塞候補"}]},
 {id:"twave",title:"T波",hint:"極性、対称性、分布を確認",items:["陽性／陰性／二相性／平坦","対称性","尖鋭T","hyperacute T","巨大陰性T","T-wave alternans","Wellens pattern"],signals:[{key:"severeHyperK",label:"重症高Kパターン候補"}]},
 {id:"uwave",title:"U波",hint:"T波との境界と融合を確認",items:["U波あり","増高U波","陰性U波","T–U融合"]},
 {id:"qt",title:"QT／QTc",hint:"T波終末とU波を区別できない場合は判定困難",items:["QT","QTc","補正式","印字値／医師計測","延長候補","短縮候補","T波終末","U波混入"],signals:[{key:"qtcEntered",label:"QTc入力済み"},{key:"prolonged",label:"QT延長候補"}]},
 {id:"summary",title:"最終確認",hint:"未確認・矛盾・Red Flag・期外収縮を確認して結果へ進む",items:["未確認項目","入力矛盾","追加確認","緊急候補","PVC／R on T"],signals:[{key:"pvc",label:"PVCあり"},{key:"rOnT",label:"R on T候補"}]},
];
const labels:Record<string,string>={unreviewed:"未確認",normal:"正常",abnormal:"異常",indeterminate:"判定困難"};

export function SystematicReviewNavigator({onCompletionChange}:{onCompletionChange?:(complete:boolean)=>void}){
 const [state,setState]=useState(()=>createReviewState(steps.map(x=>x.id)));const progress=reviewProgress(state);const evaluation=useMemo(()=>evaluateReviewNavigator(state),[state]);
 useEffect(()=>onCompletionChange?.(!progress.hasUnreviewed),[onCompletionChange,progress.hasUnreviewed]);
 const updateStatus=(id:string,status:Status)=>setState(s=>({...s,steps:{...s.steps,[id]:{...s.steps[id],status,completed:false,values:status==="abnormal"?s.steps[id].values:{}}}}));
 const toggleValue=(id:string,key:string,checked:boolean)=>setState(s=>({...s,steps:{...s.steps,[id]:{...s.steps[id],values:{...s.steps[id].values,[key]:checked}}}}));
 const toggleComplete=(id:string)=>setState(s=>s.steps[id].status==="unreviewed"?s:{...s,steps:{...s.steps,[id]:{...s.steps[id],completed:!s.steps[id].completed}}});
 return <section className="card systematic-review" aria-labelledby="systematic-review-title"><div className="cardhead"><div><div className="eyebrow">Systematic review navigator</div><h3 id="systematic-review-title">見落とし防止の系統的読影</h3><p>心電図画像を確認し、各項目を順番に入力してください。</p><p className="muted">本アプリは入力所見を既存ルールと照合し、診断候補・見逃してはいけない所見・追加確認・初期対応を提示します。画像からの自動所見抽出は現在準備中です。患者氏名・IDなどの識別情報を含む画像は使用しないでください。</p></div><span className="badge">確認済み {progress.completed}／{progress.total} STEP</span></div>
 {progress.hasUnreviewed&&<div className="result warn">未確認項目があります。緊急時は全項目の入力を待たず結果を確認できます。</div>}
 <label className="check urgent-review"><input type="checkbox" checked={state.urgentMode} onChange={e=>setState(s=>({...s,urgentMode:e.target.checked}))}/>緊急所見を優先して確認</label>
 {evaluation.redFlags.length>0&&<div className="result stop" role="alert"><strong>緊急に除外・評価すべき候補</strong><ul className="list">{evaluation.redFlags.map(x=><li key={x}>{x}</li>)}</ul></div>}
 <div className="review-step-list">{steps.map((step,index)=>{const current=state.steps[step.id];const next=steps[index+1];const stepSuggestions=evaluation.suggestionsByStep[step.id]??[];return <details className={`review-step review-step--${current.status}`} id={`review-${step.id}`} key={step.id} open={index===0&&!current.completed}><summary><span>STEP {index+1}</span><strong>{step.title}</strong><small>{labels[current.status]}</small></summary><div className="review-step-body"><p className="muted">{step.hint}</p><label>確認状態<select value={current.status} onChange={e=>updateStatus(step.id,e.target.value as Status)}>{reviewStatuses.map(x=><option value={x} key={x}>{labels[x]}</option>)}</select></label>{current.status==="abnormal"&&<div className="review-details"><h4>詳細入力</h4><ul className="compact-item-list">{step.items.map(x=><li key={x}>{x}</li>)}</ul>{step.signals?.map(x=><label className="check" key={x.key}><input type="checkbox" checked={Boolean(current.values[x.key])} onChange={e=>toggleValue(step.id,x.key,e.target.checked)}/>{x.label}</label>)}</div>}<label className="check step-complete"><input type="checkbox" checked={current.completed} disabled={current.status==="unreviewed"} onChange={()=>toggleComplete(step.id)}/>医師がこのSTEPを確認完了</label>{current.completed&&<div className="result"><strong>次に確認してください</strong>{stepSuggestions.length?<ul className="list">{stepSuggestions.map(x=><li key={x}>{x}</li>)}</ul>:<p>{next?`STEP ${index+2}「${next.title}」へ進んでください。`:"全STEPが完了しました。ルールベース解析結果を確認してください。"}</p>}</div>}</div></details>})}</div>
 <div className="review-safety-grid"><section><h4>未確認のため除外できない項目</h4><ul className="list">{evaluation.exclusions.map(x=><li key={x}>{x}</li>)}</ul></section><section><h4>次に確認</h4>{evaluation.suggestions.length?<ul className="list">{evaluation.suggestions.map(x=><li key={x}>{x}</li>)}</ul>:<p className="muted">現在の明示入力から追加確認は生成されていません。</p>}</section><section><h4>入力矛盾</h4>{evaluation.contradictions.length?<ul className="list">{evaluation.contradictions.map(x=><li key={x.message}><a href={`#review-${x.step}`}>{x.message}</a> — 入力内容を再確認してください</li>)}</ul>:<p className="muted">検出された入力矛盾はありません。</p>}</section></div>
 </section>
}
