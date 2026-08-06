"use client";

import type {LocalEcgFeatureCandidate,LocalFeatureConfidence,LocalFeatureReviewStatus,LocalFeatureType} from "@/types/local-ecg-feature";
import {updateLocalFeatureReview} from "@/lib/ecg-features/local/review-candidates.js";

const featureLabels:Record<LocalFeatureType,string>={lead_layout:"12誘導位置",image_quality:"画像品質",rr_regular:"RR整候補",rr_irregular:"RR不整候補",qrs_narrow_candidate:"narrow QRS候補",qrs_wide_candidate:"wide QRS候補",rsr_prime_candidate:"RSR'候補",deep_s_candidate:"深いS波候補",tall_r_candidate:"高いR波候補",poor_r_progression_candidate:"poor R progression候補",abnormal_q_candidate:"異常Q波候補",st_elevation_candidate:"ST上昇候補",st_depression_candidate:"ST低下候補",t_inversion_candidate:"陰性T波候補",peaked_t_candidate:"尖鋭T波候補",giant_negative_t_candidate:"巨大陰性T波候補",qt_prolongation_candidate:"QT延長候補"};
const confidenceLabels:Record<LocalFeatureConfidence,string>={high:"高",medium:"中",low:"低",indeterminate:"判定困難"};

export function LocalFeatureReview({candidates,onChange}:{candidates:LocalEcgFeatureCandidate[];onChange:(next:LocalEcgFeatureCandidate[])=>void}){
  const update=(id:string,status:LocalFeatureReviewStatus,value?:unknown)=>onChange(updateLocalFeatureReview(candidates,id,status,value));
  return <section className="local-feature-review" aria-labelledby="local-feature-review-title">
    <div className="cardhead"><div><div className="eyebrow">Local feature candidates</div><h4 id="local-feature-review-title">ローカル推定所見</h4><p className="muted">未確認候補はルールエンジンへ渡されません。画像特徴の信頼度は診断確率ではありません。</p></div><span className="badge">医師確認必須</span></div>
    {candidates.length===0?<div className="analysis-placeholder">現在、ローカル推定候補はありません。固定値や疑似所見は生成せず、医師入力で続けられます。</div>:<div className="local-feature-list">{candidates.map(candidate=><article className="local-feature-candidate" key={candidate.id}>
      <header><div><strong>{featureLabels[candidate.featureType]}</strong><span>{candidate.leadGroup?.join("、")||candidate.lead||"画像全体"}</span></div><span className={`feature-confidence feature-confidence--${candidate.confidence}`}>画像候補信頼度：{confidenceLabels[candidate.confidence]}</span></header>
      <p><b>推定理由：</b>{candidate.evidence.explanationJa}</p>
      {candidate.evidence.limitations.length>0&&<p className="muted"><b>制限：</b>{candidate.evidence.limitations.join("、")}</p>}
      {candidate.evidence.imageRegion&&<p className="muted">対象領域：x {candidate.evidence.imageRegion.x}, y {candidate.evidence.imageRegion.y}, width {candidate.evidence.imageRegion.width}, height {candidate.evidence.imageRegion.height}</p>}
      {candidate.reviewStatus==="modified"&&<label>医師修正値<input aria-label={`${featureLabels[candidate.featureType]}の医師修正値`} value={String(candidate.physicianValue??"")} onChange={event=>update(candidate.id,"modified",event.target.value)}/></label>}
      <div className="upload-actions" aria-label={`${featureLabels[candidate.featureType]}の確認操作`}><button className="btn" type="button" onClick={()=>update(candidate.id,"accepted")}>承認</button><button className="btn" type="button" onClick={()=>update(candidate.id,"modified",candidate.physicianValue??"")}>修正</button><button className="btn" type="button" onClick={()=>update(candidate.id,"rejected")}>却下</button><button className="btn" type="button" onClick={()=>update(candidate.id,"indeterminate")}>判定困難</button></div>
      <p className="muted" aria-live="polite">医師確認：{reviewStatusJa(candidate.reviewStatus)}</p>
    </article>)}</div>}
  </section>;
}

function reviewStatusJa(status:LocalFeatureReviewStatus){return {pending:"未確認",accepted:"承認済み",modified:"医師修正",rejected:"却下",indeterminate:"判定困難"}[status]}
