export function updateLocalFeatureReview(candidates,id,reviewStatus,physicianValue,physicianComment){
  return candidates.map(candidate=>candidate.id===id?{...candidate,reviewStatus,...(reviewStatus==="modified"?{physicianValue}:{}),...(physicianComment!==undefined?{physicianComment}:{})}:candidate);
}

export function collectReviewedLocalFeatures(candidates){
  const confirmed=[];const missing=[];
  for(const candidate of candidates){
    if(candidate.reviewStatus==="accepted")confirmed.push({id:candidate.id,featureType:candidate.featureType,lead:candidate.lead,leadGroup:candidate.leadGroup,value:candidateValue(candidate),reviewStatus:"accepted",imageConfidence:candidate.confidence});
    else if(candidate.reviewStatus==="modified"&&hasPhysicianValue(candidate.physicianValue))confirmed.push({id:candidate.id,featureType:candidate.featureType,lead:candidate.lead,leadGroup:candidate.leadGroup,value:candidate.physicianValue,reviewStatus:"modified",imageConfidence:candidate.confidence});
    else if(candidate.reviewStatus==="pending"||candidate.reviewStatus==="indeterminate")missing.push({id:candidate.id,featureType:candidate.featureType,reason:candidate.reviewStatus==="pending"?"医師未確認":"医師が判定困難と判断"});
  }
  return {confirmed,missing};
}

function candidateValue(candidate){if(candidate.estimatedMagnitude!=null)return {magnitude:candidate.estimatedMagnitude,unit:candidate.estimatedUnit??null,direction:candidate.direction??null};if(candidate.direction)return candidate.direction;return true}
function hasPhysicianValue(value){return value!==undefined&&value!==null&&value!==""}
