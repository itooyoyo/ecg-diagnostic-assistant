"use client";

import { useEffect, useState } from "react";
import { classifyTachyarrhythmia, type AvRelationship, type PWaveState, type Regularity, type TachyInput } from "@/logic/tachyarrhythmia/classify.js";

type TachyarrhythmiaModuleProps = {
  heartRate:number|null;
  qrsMs:number|null;
  regularity:Regularity;
  onRedFlagChange?:(active:boolean)=>void;
};

const unstableFields = [
  ["hypotension","低血圧／ショック"],["alteredMentalStatus","意識障害"],["shockSigns","ショック徴候"],
  ["ischemicChestPain","持続する虚血性胸痛"],["acuteHeartFailure","急性心不全"],["pulmonaryEdema","肺水腫"],
  ["severeRespiratoryFailure","重篤な呼吸不全"],["syncope","失神"],["markedPresyncope","著明な前失神"],["organHypoperfusion","進行する臓器低灌流"],
] as const;
const initialFlags = Object.fromEntries(unstableFields.map(([key])=>[key,false])) as Record<(typeof unstableFields)[number][0],boolean>;
const quadrantCopy = {
  "narrow regular":["洞性頻脈","AVNRT","正方向性AVRT","心房頻拍／粗動"],
  "narrow irregular":["心房細動","可変伝導粗動","MAT","頻発PAC"],
  "wide regular":["心室頻拍を最優先","SVT＋脚ブロック","変行伝導","副伝導路"],
  "wide irregular":["pre-excited AF","多形性VT／TdP","AF＋脚ブロック","電解質／薬剤性"],
};

export function TachyarrhythmiaModule({heartRate,qrsMs,regularity,onRedFlagChange}:TachyarrhythmiaModuleProps) {
  const [pulsePresent,setPulsePresent]=useState<boolean|null>(true);
  const [systolicBp,setSystolicBp]=useState<number|null>(120);
  const [flags,setFlags]=useState(initialFlags);
  const [pWave,setPWave]=useState<PWaveState>("unknown");
  const [pQrs,setPQrs]=useState<AvRelationship>("unknown");
  const [deltaWave,setDeltaWave]=useState(false);
  const [shortPr,setShortPr]=useState(false);
  const [fibrillatoryWaves,setFibrillatoryWaves]=useState(false);
  const [flutterWaves,setFlutterWaves]=useState(false);
  const [flutterConduction,setFlutterConduction]=useState<TachyInput["flutterConduction"]>("unknown");
  const [wpwHistory,setWpwHistory]=useState(false);
  const [qrsMorphologyVariable,setQrsMorphologyVariable]=useState(false);
  const [priorMi,setPriorMi]=useState(false);
  const [structuralHeartDisease,setStructuralHeartDisease]=useState(false);
  const [sinusFeatures,setSinusFeatures]=useState(false);
  const [qtcMs,setQtcMs]=useState<number|null>(null);
  const [potassium,setPotassium]=useState<number|null>(null);
  const [calcium,setCalcium]=useState<number|null>(null);
  const [magnesium,setMagnesium]=useState<number|null>(null);
  const [clinical,setClinical]=useState({pulse:null as number|null,spo2:null as number|null,dyspnea:false,previousEcg:false,medications:false});

  const input:TachyInput={heartRate,qrsMs,regularity,pWave,pulsePresent,systolicBp,...flags,avRelationship:pQrs,deltaWave,shortPr,fibrillatoryWaves,flutterWaves,flutterConduction,wpwHistory,qrsMorphologyVariable,priorMi,structuralHeartDisease,sinusFeatures,qtcMs,potassium,calcium,magnesium};
  const result=classifyTachyarrhythmia(input);
  const hasRedFlag=result.redFlags.length>0||result.hemodynamics.status==="cardiac-arrest";
  useEffect(()=>onRedFlagChange?.(hasRedFlag),[hasRedFlag,onRedFlagChange]);
  if(!result.active) return <section className="card tachy-shell" id="tachyarrhythmia"><div className="cardhead"><div><div className="eyebrow">Tachyarrhythmia module</div><h3>頻脈性不整脈</h3></div><span className="badge">待機中</span></div><p className="muted">医師確認後の心拍数が100 bpm以上になると起動します。単一の心拍数だけで診断名を決定しません。</p></section>;

  return <section className="card tachy-shell" id="tachyarrhythmia">
    <div className="cardhead"><div><div className="eyebrow">Tachyarrhythmia workflow</div><h3>頻脈性不整脈モジュール</h3><p className="muted tachy-subtitle">QRS幅と規則性から整理します</p></div><span className="badge">{heartRate ?? "—"} bpm</span></div>

    {(result.hemodynamics.status==="unstable"||result.hemodynamics.status==="cardiac-arrest")&&<div className="tachy-redflag" role="alert"><div className="eyebrow">Red Flag</div><strong>{result.hemodynamics.label}</strong><p>{result.hemodynamics.message}</p><small>薬剤用量・通電条件は提示せず、専門チームへの連絡を優先します。</small></div>}

    <div className="tachy-flow" aria-label="頻脈分類フロー"><span>01 QRS幅</span><i>→</i><span>02 規則性</span><i>→</i><span>03 P波</span><i>→</i><span>04 房室解離</span><i>→</i><span>05 最終候補</span></div>
    <div className="tachy-summary">
      <div><span>循環動態</span><strong>{result.hemodynamics.label}</strong></div>
      <div><span>QRS幅</span><strong>{qrsMs==null?"情報不足":qrsMs<120?`Narrow ${qrsMs} ms`:`Wide ${qrsMs} ms`}</strong></div>
      <div><span>規則性</span><strong>{regularity==="regular"?"規則的":regularity==="irregular"?"不規則":"情報不足"}</strong></div>
      <div><span>分類</span><strong>{result.classification ?? "分類情報不足"}</strong></div>
    </div>

    <div className="tachy-quadrants">{Object.entries(quadrantCopy).map(([name,candidates])=><div key={name} className={`tachy-quadrant ${name.startsWith("wide")?"tachy-quadrant--wide":""} ${result.classification===name?"active":""}`}><span>{name}</span><ul>{candidates.map(x=><li key={x}>{x}</li>)}</ul></div>)}</div>

    <details className="tachy-inputs" open><summary>循環動態・臨床情報を入力</summary>
      <div className="tachy-form-grid">
        <label>脈拍<input type="number" inputMode="numeric" value={clinical.pulse??""} onChange={e=>setClinical(v=>({...v,pulse:numberOrNull(e.target.value)}))}/></label>
        <label>収縮期血圧<input aria-label="収縮期血圧" type="number" inputMode="numeric" value={systolicBp??""} onChange={e=>setSystolicBp(numberOrNull(e.target.value))}/></label>
        <label>SpO₂<input type="number" inputMode="numeric" value={clinical.spo2??""} onChange={e=>setClinical(v=>({...v,spo2:numberOrNull(e.target.value)}))}/></label>
        <label>QTc<input aria-label="QTc入力" type="number" inputMode="numeric" value={qtcMs??""} onChange={e=>setQtcMs(numberOrNull(e.target.value))}/></label>
        <label>K<input aria-label="K入力" type="number" step="0.1" value={potassium??""} onChange={e=>setPotassium(numberOrNull(e.target.value))}/></label>
        <label>Ca<input aria-label="Ca入力" type="number" step="0.1" value={calcium??""} onChange={e=>setCalcium(numberOrNull(e.target.value))}/></label>
        <label>Mg<input aria-label="Mg入力" type="number" step="0.1" value={magnesium??""} onChange={e=>setMagnesium(numberOrNull(e.target.value))}/></label>
        <label>脈の有無<select aria-label="脈の有無" value={pulsePresent==null?"unknown":String(pulsePresent)} onChange={e=>setPulsePresent(e.target.value==="unknown"?null:e.target.value==="true")}><option value="true">脈あり</option><option value="false">無脈性</option><option value="unknown">不明</option></select></label>
      </div>
      <div className="checks tachy-checks">{unstableFields.map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={flags[key]} onChange={e=>setFlags(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}</div>
      <div className="checks tachy-checks">
        <label className="check"><input type="checkbox" checked={clinical.dyspnea} onChange={e=>setClinical(v=>({...v,dyspnea:e.target.checked}))}/>呼吸困難</label>
        <label className="check"><input type="checkbox" checked={clinical.previousEcg} onChange={e=>setClinical(v=>({...v,previousEcg:e.target.checked}))}/>前回心電図あり</label>
        <label className="check"><input type="checkbox" checked={clinical.medications} onChange={e=>setClinical(v=>({...v,medications:e.target.checked}))}/>服薬情報確認済み</label>
      </div>
    </details>

    <details className="tachy-inputs"><summary>P波・頻拍機序を確認</summary>
      <div className="tachy-form-grid">
        <label>P波／心房活動<select aria-label="P波評価" value={pWave} onChange={e=>setPWave(e.target.value as PWaveState)}><option value="unknown">不明／確認不能</option><option value="present">P波あり</option><option value="absent">P波なし</option><option value="retrograde">逆行性P波</option><option value="buried">QRSまたはT波内に埋没</option></select></label>
        <label>P–QRS関係<select value={pQrs} onChange={e=>setPQrs(e.target.value as AvRelationship)}><option value="unknown">不明</option><option value="one-to-one">PとQRSが1:1</option><option value="more-p">PがQRSより多い</option><option value="more-qrs">QRSがPより多い</option><option value="av-dissociation">房室解離</option></select></label>
      </div>
      {pWave==="unknown"&&<div className="result warn">P波なしとは確定しません。小さくて見えない、QRS／T波内に埋没、心房活動を確認できない可能性があります。II・V1・V2、長いリズムストリップ、感度・紙送り速度、QRS前後とT波形状を確認してください。</div>}
      <div className="checks tachy-checks">
        <label className="check"><input type="checkbox" checked={fibrillatoryWaves} onChange={e=>setFibrillatoryWaves(e.target.checked)}/>細動波</label>
        <label className="check"><input type="checkbox" checked={flutterWaves} onChange={e=>setFlutterWaves(e.target.checked)}/>F波</label>
        <label>粗動伝導比<select value={flutterConduction} onChange={e=>setFlutterConduction(e.target.value as TachyInput["flutterConduction"])}><option value="unknown">不明</option><option value="2:1">2:1</option><option value="3:1">3:1</option><option value="4:1">4:1</option><option value="variable">可変</option></select></label>
        <label className="check"><input type="checkbox" checked={deltaWave} onChange={e=>setDeltaWave(e.target.checked)}/>デルタ波</label>
        <label className="check"><input type="checkbox" checked={shortPr} onChange={e=>setShortPr(e.target.checked)}/>PR短縮</label>
        <label className="check"><input type="checkbox" checked={wpwHistory} onChange={e=>setWpwHistory(e.target.checked)}/>WPW／副伝導路既往</label>
        <label className="check"><input type="checkbox" checked={qrsMorphologyVariable} onChange={e=>setQrsMorphologyVariable(e.target.checked)}/>QRS形態が拍ごとに変化</label>
        <label className="check"><input type="checkbox" checked={priorMi} onChange={e=>setPriorMi(e.target.checked)}/>心筋梗塞既往</label>
        <label className="check"><input type="checkbox" checked={structuralHeartDisease} onChange={e=>setStructuralHeartDisease(e.target.checked)}/>構造的心疾患</label>
        <label className="check"><input type="checkbox" checked={sinusFeatures} onChange={e=>setSinusFeatures(e.target.checked)}/>徐々に発症・停止／心拍変動・誘因あり</label>
      </div>
    </details>

    <div className="tachy-results">
      <div><div className="eyebrow">最優先候補</div><h4>{result.priority}</h4><ul className="list">{result.candidates.map(x=><li key={x}>{x}</li>)}</ul></div>
      <div><div className="eyebrow">不足情報</div><ul className="list">{result.missing.length?result.missing.map(x=><li key={x}>{x}</li>):<li>主要項目入力済み</li>}</ul></div>
    </div>
    <div className="tachy-results"><div><div className="eyebrow">診断アルゴリズム／理由</div><ol className="list">{result.diagnosticReasoning.map(x=><li key={x}>{x}</li>)}</ol></div><div><div className="eyebrow">Clinical Pearl</div><ul className="list">{result.clinicalPearls.map(x=><li key={x}>{x}</li>)}</ul></div></div>
    {result.warnings.map(x=><div className={`result ${result.preexcitedAf?"stop":"warn"}`} key={x}>{x}{result.preexcitedAf&&x.includes("房室結節")&&<><br/><small>ベラパミル、ジルチアゼム、β遮断薬、ジゴキシン、アデノシン系薬剤を安易に使用せず、専門医・救急対応を優先します。</small></>}</div>)}
    {result.contraindicatedDrugCandidates.length>0&&<div className="result stop" role="alert"><strong>禁忌候補（AF＋WPW疑い）</strong><p>{result.contraindicatedDrugCandidates.join("／")}</p><small>AV結節遮断薬単独は避け、臨床状況とガイドラインに基づき薬剤を選択してください。</small></div>}

    <section className="tachy-plan"><div className="eyebrow">Tachycardia Today&apos;s Plan</div><h4>この症例で今すぐ確認すること</h4><div className="tachy-plan-grid"><div><span>循環動態</span><strong>{result.hemodynamics.label}</strong></div><div><span>分類</span><strong>{result.classification??"情報不足"}</strong></div><div><span>最優先候補</span><strong>{result.priority}</strong></div><div><span>見逃してはいけない</span><strong>{result.redFlags.join("／")||"入力上のRed Flagなし"}</strong></div></div><h4>今すぐ行うこと</h4><ul className="list">{result.plan.map(x=><li key={x}>{x}</li>)}</ul></section>
  </section>;
}

function numberOrNull(value:string){const n=Number(value);return value===""||!Number.isFinite(n)?null:n}
