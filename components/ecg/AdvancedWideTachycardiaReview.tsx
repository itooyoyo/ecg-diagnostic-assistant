"use client";

export type ReviewState = boolean | "indeterminate" | null;
export type ExistingBbbState = "unknown" | "none" | "rbbb" | "lbbb" | "indeterminate";
export type WctAuditState = {
  rsAbsentV1V6:"unknown"|"yes"|"no"|"indeterminate";
  maxRsIntervalMs:number|null;
  rsIntervalStatus:"unentered"|"measured"|"unmeasurable"|"indeterminate";
  bbbLikeMorphology:"unknown"|"rbbb_like"|"lbbb_like"|"neither"|"indeterminate";
  concordance:"unknown"|"positive"|"negative"|"mixed"|"indeterminate";
};

type Props={regularity:"regular"|"irregular"|"unknown";avDissociation:ReviewState;captureBeat:ReviewState;fusionBeat:ReviewState;polymorphicWide:ReviewState;preExcitation:ReviewState;existingBbb:ExistingBbbState;audit:WctAuditState;onFindingChange:(key:"avDissociation"|"captureBeats"|"fusionBeats"|"polymorphicWide",value:ReviewState)=>void;onPreExcitationChange:(value:ReviewState)=>void;onExistingBbbChange:(value:ExistingBbbState)=>void;onAuditChange:(value:WctAuditState)=>void};
const options=<><option value="unknown">未入力</option><option value="false">なし</option><option value="true">あり</option><option value="indeterminate">判定困難</option></>;
const show=(value:ReviewState)=>value==null?"unknown":String(value);
const read=(value:string):ReviewState=>value==="true"?true:value==="false"?false:value==="indeterminate"?"indeterminate":null;

export function AdvancedWideTachycardiaReview(p:Props){
  const preExcitation=p.preExcitation===true;
  const brugadaAvailable=p.regularity==="regular"&&p.polymorphicWide===false&&!preExcitation;
  const audit=(patch:Partial<WctAuditState>)=>p.onAuditChange({...p.audit,...patch});
  return <details className="tachy-inputs wct-review" id="wide-qrs-tachy-review" open>
    <summary>Wide QRS頻拍：VT / SVT鑑別</summary>
    <div className="wct-safety" role="note"><strong>原因不明のWide QRS頻拍では、VTを重要候補として扱います。</strong><p>この詳細入力はVTとSVT with aberrancyの鑑別を補助するもので、SVTを証明したり緊急対応を遅らせたりするものではありません。</p></div>
    <section className="wct-layer"><h4>1. 強いVT支持所見と既存鑑別</h4><div className="tachy-form-grid">
      <Tri label="AV dissociation" value={p.avDissociation} set={v=>p.onFindingChange("avDissociation",v)}/><Tri label="Capture beat" value={p.captureBeat} set={v=>p.onFindingChange("captureBeats",v)}/><Tri label="Fusion beat" value={p.fusionBeat} set={v=>p.onFindingChange("fusionBeats",v)}/><Tri label="多形性Wide" value={p.polymorphicWide} set={v=>p.onFindingChange("polymorphicWide",v)}/>
      <label>既存脚ブロック<select value={p.existingBbb} onChange={e=>p.onExistingBbbChange(e.target.value as ExistingBbbState)}><option value="unknown">未入力</option><option value="none">なし</option><option value="rbbb">既存RBBB</option><option value="lbbb">既存LBBB</option><option value="indeterminate">判定困難</option></select></label>
      <Tri label="Pre-excitation" value={p.preExcitation} set={p.onPreExcitationChange}/>
    </div><details className="wct-education"><summary>見方：AV解離・capture・fusion</summary><div className="wct-education-grid"><Card title="AV dissociation" text="心房と心室が独立して興奮している所見です。"><Diagram kind="av"/></Card><Card title="Capture beat" text="Wide QRS頻拍中に一拍だけ比較的正常に近いQRSが出現する所見です。"><Diagram kind="capture"/></Card><Card title="Fusion beat" text="洞性興奮と心室起源興奮が融合した中間的QRSです。"><Diagram kind="fusion"/></Card></div></details></section>
    {preExcitation&&<Notice title="Pre-excitation経路を優先">通常のBrugada WCT入力を進めず、既存のWPW／前興奮性頻拍経路で評価します。</Notice>}
    {p.regularity==="irregular"&&<Notice title="Irregular Wide">Brugada入力は使用せず、AF＋BBB、pre-excited AF、多形性VT／TdPの既存経路を確認します。</Notice>}
    {p.polymorphicWide===true&&<Notice title="Polymorphic Wide">Brugada入力は使用せず、QT/QTc、R on T、pause、TdP／多形性VTの既存経路を確認します。</Notice>}
    {p.regularity==="unknown"&&<Notice title="規則性未入力">規則性を確認するまでBrugada候補入力へ進みません。</Notice>}
    {p.regularity==="regular"&&p.polymorphicWide==null&&!preExcitation&&<Notice title="単形性の確認が必要">未入力を単形性として扱いません。多形性Wideを「なし」と確認すると次へ進めます。</Notice>}
    {brugadaAvailable&&<section className="wct-layer"><h4>2. Brugada WCT鑑別項目（監査用・Rule未接続）</h4><p className="muted">入力内容は保持されますが、診断候補・緊急度・59 Rulesの結果は変更しません。</p><div className="tachy-form-grid">
      <label>V1〜V6すべてでRS complexなし<select value={p.audit.rsAbsentV1V6} onChange={e=>audit({rsAbsentV1V6:e.target.value as WctAuditState["rsAbsentV1V6"]})}><option value="unknown">未入力</option><option value="yes">はい</option><option value="no">いいえ</option><option value="indeterminate">判定困難</option></select></label>
      <label>RS interval測定<select value={p.audit.rsIntervalStatus} onChange={e=>audit({rsIntervalStatus:e.target.value as WctAuditState["rsIntervalStatus"],maxRsIntervalMs:e.target.value==="measured"?p.audit.maxRsIntervalMs:null})}><option value="unentered">未入力</option><option value="measured">測定可能</option><option value="unmeasurable">測定不能</option><option value="indeterminate">判定困難</option></select></label>
      <label>最大RS interval（ms）<input type="number" min="0" inputMode="numeric" value={p.audit.maxRsIntervalMs??""} disabled={p.audit.rsIntervalStatus!=="measured"} onChange={e=>audit({maxRsIntervalMs:e.target.value===""?null:Number(e.target.value)})}/></label>
      <label>頻拍時QRS morphology<select value={p.audit.bbbLikeMorphology} onChange={e=>audit({bbbLikeMorphology:e.target.value as WctAuditState["bbbLikeMorphology"]})}><option value="unknown">未入力</option><option value="rbbb_like">RBBB-like</option><option value="lbbb_like">LBBB-like</option><option value="neither">どちらとも言えない</option><option value="indeterminate">判定困難</option></select></label>
      <label>Precordial concordance<select value={p.audit.concordance} onChange={e=>audit({concordance:e.target.value as WctAuditState["concordance"]})}><option value="unknown">未入力</option><option value="positive">positive</option><option value="negative">negative</option><option value="mixed">mixed</option><option value="indeterminate">判定困難</option></select></label>
    </div><details className="wct-education"><summary>見方：RS complex・RS interval・concordance</summary><div className="wct-education-grid"><Card title="RS complex" text="同一QRS内にR波と、それに続くS波が存在する形です。V1〜V6を一誘導ずつ確認します。"><Diagram kind="rs"/></Card><Card title="RS interval" text="R波開始からS波最深点までを測ります。25 mm/sでは1 mm＝40 msです。原著の100 ms超は教育表示のみで、Rule判定には使いません。"><Diagram kind="interval"/></Card><Card title="Precordial concordance" text="V1〜V6がすべて主に陽性、すべて主に陰性、またはmixedかを確認します。"><Diagram kind="concordance"/></Card></div></details>{(p.audit.rsAbsentV1V6!=="unknown"||p.audit.rsIntervalStatus!=="unentered"||p.audit.bbbLikeMorphology!=="unknown"||p.audit.concordance!=="unknown")&&<p className="wct-audit-status">Brugada WCT鑑別項目：入力済み（Rule未接続）</p>}</section>}
  </details>
}

function Tri({label,value,set}:{label:string;value:ReviewState;set:(v:ReviewState)=>void}){return <label>{label}<select value={show(value)} onChange={e=>set(read(e.target.value))}>{options}</select></label>}
function Notice({title,children}:{title:string;children:React.ReactNode}){return <div className="result warn"><strong>{title}</strong><p>{children}</p></div>}
function Card({title,text,children}:{title:string;text:string;children:React.ReactNode}){return <figure><figcaption>{title}</figcaption>{children}<p>{text}</p></figure>}
function Diagram({kind}:{kind:"av"|"capture"|"fusion"|"rs"|"interval"|"concordance"}){const paths={av:"M8 50h24l8-7 7 7 9-34 10 55 10-21h39l8-7 7 7 9-34 10 55 10-21h43",capture:"M8 50h15l8-25 12 50 12-25h26l8-25 12 50 12-25h28l5-18 7 36 7-18h25l8-25 12 50 12-25h10",fusion:"M8 50h18l8-25 12 50 12-25h28l8-19 10 42 12-23h28l7-22 10 47 12-25h38",rs:"M8 50h65l12-38 13 69 16-31h98",interval:"M8 50h65l12-38 13 69 16-31h98",concordance:"M8 50h14l5-24 7 38 7-14h18l5-24 7 38 7-14h18l5 24 7-38 7 14h18l5 24 7-38 7 14h18l5-24 7 38 7-14h18"};return <svg viewBox="0 0 220 90" role="img" aria-label={`${kind}模式図`}><path className="wct-baseline" d="M8 50H212"/><path className="wct-wave" d={paths[kind]}/>{kind==="av"&&<path className="wct-atrial" d="M18 28q7-14 14 0m40 0q7-14 14 0m40 0q7-14 14 0m40 0q7-14 14 0"/>}{kind==="interval"&&<path className="wct-measure" d="M73 76V18M98 76V18M73 70H98"/>}</svg>}
