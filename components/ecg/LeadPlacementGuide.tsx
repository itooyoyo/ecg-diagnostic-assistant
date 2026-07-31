"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { placementWarnings } from "@/logic/lead-placement/placement.js";
import { suggestAdditionalLeads, type AdditionalLeadFindings } from "@/logic/lead-placement/additional-leads.js";

const tabs = [
  ["standard", "標準12誘導"],
  ["mistakes", "装着ミス"],
  ["right", "右側胸部誘導"],
  ["posterior", "後壁誘導"],
] as const;
type GuideTab = (typeof tabs)[number][0];

const placementItems = ["V1は第4肋間・胸骨右縁","V2は第4肋間・胸骨左縁","V3はV2とV4の中点","V4は第5肋間・左鎖骨中線","V5はV4と同じ高さ","V6はV4と同じ高さ","四肢電極の左右を確認","誘導コードを確認","体動・筋電図ノイズを確認","基線動揺を確認"];

export function LeadPlacementGuide({onWarningChange}:{onWarningChange?:(warning:boolean)=>void}) {
  const [tab,setTab]=useState<GuideTab>("standard");
  const [placement,setPlacement]=useState<boolean[]>(Array(placementItems.length).fill(false));
  const [concerns,setConcerns]=useState({raLaReversal:false,v1v2High:false});
  const [signals,setSignals]=useState<AdditionalLeadFindings>({inferiorStElevation:false,hypotension:false,stDepressionV1toV3:false,suspectedRVOcclusion:false,suspectedPosteriorOcclusion:false});
  const warnings=placementWarnings(concerns);
  const suggestions=suggestAdditionalLeads(signals);

  function updateConcern(key:keyof typeof concerns,checked:boolean) {
    const next={...concerns,[key]:checked};
    setConcerns(next);
    onWarningChange?.(next.raLaReversal||next.v1v2High);
  }
  function updateSignal(key:keyof AdditionalLeadFindings,checked:boolean) {
    setSignals(value=>({...value,[key]:checked}));
  }

  return <section className="card" id="section-1">
    <div className="cardhead"><div><div className="eyebrow">Lead placement</div><h3>電極装着確認</h3></div><span className="badge">画像・文章ガイド</span></div>
    <div className="guide-tabs" role="tablist" aria-label="電極装着ガイド">
      {tabs.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={`guide-tab ${tab===key?"active":""}`} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==="standard"&&<div role="tabpanel" className="guide-panel">
      <GuideImage src="/images/ecg/lead-placement-precordial.png" alt="標準胸部誘導V1からV6の装着位置を示すユーザー提供図" ready/>
      <div className="guide-copy">
        <h4>標準胸部誘導</h4>
        <div className="guide-leads">{["V1：第4肋間・胸骨右縁","V2：第4肋間・胸骨左縁","V3：V2とV4の中点","V4：第5肋間・左鎖骨中線","V5：V4と同じ高さ・左前腋窩線","V6：V4と同じ高さ・左中腋窩線"].map(x=><div className="lead" key={x}>{x}</div>)}</div>
        <ul className="guide-notes"><li>胸骨角から第2肋間を確認し、第4肋間を同定</li><li>乳頭位置を基準にしない</li><li>V5・V6はV4と同じ水平線</li><li>女性でも胸壁上の解剖学的位置を優先</li></ul>
        <div className="compact-image-pending"><span>画像準備中</span><div><strong>四肢誘導</strong><br/>RA：右上肢　LA：左上肢　RL：右下肢　LL：左下肢</div></div>
      </div>
      <div className="guide-checklist"><h4>装着チェックリスト</h4><div className="checks">{placementItems.map((x,i)=><label className="check" key={x}><input type="checkbox" checked={placement[i]} onChange={e=>setPlacement(v=>v.map((n,j)=>j===i?e.target.checked:n))}/>{x}</label>)}</div></div>
    </div>}

    {tab==="mistakes"&&<div role="tabpanel" className="guide-panel">
      <GuideImage alt="装着ミス確認図" pendingText="画像準備中：装着ミスは文章とチェック項目で確認できます"/>
      <div className="guide-copy"><h4>装着ミスを疑う所見</h4>
        <label className="check"><input type="checkbox" checked={concerns.raLaReversal} onChange={e=>updateConcern("raLaReversal",e.target.checked)}/>RA–LA逆接続を疑う</label>
        <label className="check"><input type="checkbox" checked={concerns.v1v2High} onChange={e=>updateConcern("v1v2High",e.target.checked)}/>V1・V2高位装着を疑う</label>
        {warnings.map(w=><div className="result warn" key={w.code}>{w.message}<br/>診断を確定せず再記録を推奨します。続行時は解析結果に警告を付けます。</div>)}
      </div>
    </div>}

    {tab==="right"&&<div role="tabpanel" className="guide-panel right-sided-panel">
      <div>
        <h4 className="guide-visual-heading">右側胸部誘導（V3R〜V6R）</h4>
        <GuideImage src="/images/ecg/lead-placement-right-sided.png" alt="右側胸部誘導V3R、V4R、V5R、V6Rの装着位置を示すユーザー提供図" width={858} height={836} ready lightbox pendingText="画像準備中：右側鏡像配置を文章で確認してください"/>
      </div>
      <div className="guide-copy"><h4>主な適応</h4>
        <ul className="guide-notes">{["下壁ST上昇（II、III、aVF）","右室梗塞を疑う","下壁梗塞＋低血圧","頸静脈怒張","肺うっ血が乏しい低血圧","右冠動脈閉塞を疑う"].map(x=><li key={x}>{x}</li>)}</ul>
        <div className="result">下壁梗塞を疑う場合は、右室梗塞評価のため右側胸部誘導、特にV4Rを追加します。</div>
        <div className="guide-leads"><div className="lead"><strong>V3R</strong><br/>V3の右胸部鏡像位置</div><div className="lead emphasized-lead"><span className="most-important">最重要</span><strong>V4R</strong><br/>第5肋間・右鎖骨中線<br/><small>右室梗塞評価で最も重要な誘導</small></div><div className="lead"><strong>V5R</strong><br/>V4Rと同じ高さ<br/>右前腋窩線</div><div className="lead"><strong>V6R</strong><br/>V4Rと同じ高さ<br/>右中腋窩線</div></div>
        <p className="guide-caution">R表記を明確にし、通常のV3～V6と混同しないでください。取得時刻は将来記録できる構造へ拡張します。</p>
        <SignalChecks signals={signals} update={updateSignal} keys={[["inferiorStElevation","下壁誘導のST上昇"],["hypotension","低血圧"],["suspectedRVOcclusion","右冠動脈閉塞疑い"]]}/>
        <Suggestions suggestions={suggestions.filter(s=>s.type==="right-sided")}/>
      </div>
      <aside className="clinical-pearl"><div className="eyebrow">Clinical Pearl</div><p>II、III、aVFでST上昇を認めた場合は、右室梗塞合併の評価としてV4Rを含む右側胸部誘導の追加を推奨します。</p></aside>
    </div>}

    {tab==="posterior"&&<div role="tabpanel" className="guide-panel">
      <GuideImage alt="後壁誘導V7からV9の装着位置図" pendingText="画像準備中：V6と同じ水平線を文章で確認してください"/>
      <div className="guide-copy"><h4>後壁誘導を追加する状況</h4>
        <ul className="guide-notes">{["V1～V3の水平型ST低下","V1～V3の高いR波","後壁または側壁虚血を疑う","標準12誘導で診断できないがACS疑いが強い","右冠動脈または左回旋枝領域の閉塞を疑う"].map(x=><li key={x}>{x}</li>)}</ul>
        <div className="guide-leads"><div className="lead">V7：V6と同じ高さ・左後腋窩線</div><div className="lead">V8：V6と同じ高さ・左肩甲骨中線</div><div className="lead">V9：V6と同じ高さ・左脊柱傍線</div></div>
        <div className="result">V7～V9はすべてV6と同じ水平線に配置します。</div>
        <SignalChecks signals={signals} update={updateSignal} keys={[["stDepressionV1toV3","V1～V3のST低下"],["suspectedPosteriorOcclusion","後壁閉塞疑い"]]}/>
        <Suggestions suggestions={suggestions.filter(s=>s.type==="posterior")}/>
      </div>
    </div>}
  </section>;
}

function GuideImage({src,alt,ready=false,pendingText="画像準備中",width=459,height=296,lightbox=false}:{src?:string;alt:string;ready?:boolean;pendingText?:string;width?:number;height?:number;lightbox?:boolean}) {
  const [available,setAvailable]=useState(ready);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false)};
    document.addEventListener("keydown",close);
    return()=>document.removeEventListener("keydown",close);
  },[expanded]);
  const image=src?<Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 720px) 100vw, 42vw" loading={lightbox?"eager":"lazy"} onError={()=>setAvailable(false)}/>:null;
  return <>
    <div className={`guide-visual ${available?"guide-visual--ready":"guide-visual--pending"}`}>
      {available&&image?(lightbox?<button type="button" className="lightbox-trigger" onClick={()=>setExpanded(true)} aria-label="右側胸部誘導の図を拡大表示">{image}<span>拡大表示</span></button>:image):<><span>画像準備中</span><p>{pendingText}</p></>}
    </div>
    {expanded&&available&&src&&<div className="image-lightbox" role="dialog" aria-modal="true" aria-label="右側胸部誘導の拡大図" onClick={()=>setExpanded(false)}>
      <div className="image-lightbox__content" onClick={event=>event.stopPropagation()}>
        <button type="button" className="image-lightbox__close" onClick={()=>setExpanded(false)} autoFocus aria-label="拡大表示を閉じる">×</button>
        <Image src={src} alt={alt} width={width} height={height} sizes="95vw"/>
      </div>
    </div>}
  </>;
}

function SignalChecks({signals,update,keys}:{signals:AdditionalLeadFindings;update:(key:keyof AdditionalLeadFindings,checked:boolean)=>void;keys:Array<[keyof AdditionalLeadFindings,string]>}) {
  return <fieldset className="signal-checks"><legend>提案条件（診断確定には使用しません）</legend>{keys.map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={signals[key]} onChange={e=>update(key,e.target.checked)}/>{label}</label>)}</fieldset>;
}

function Suggestions({suggestions}:{suggestions:ReturnType<typeof suggestAdditionalLeads>}) {
  if(!suggestions.length)return <p className="muted routine-note">該当所見がないため追加誘導をroutine表示していません。</p>;
  return <div aria-live="polite">{suggestions.map(s=><div className={`result suggestion ${s.urgentContext?"suggestion--priority":""}`} key={s.type}>{s.message}{s.urgentContext&&<><br/><strong>低血圧を伴うためV4Rを優先して確認します。</strong></>}</div>)}</div>;
}
