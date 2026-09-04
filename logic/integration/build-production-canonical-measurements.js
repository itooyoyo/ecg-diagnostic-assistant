import {adaptClinicalReviewToCanonical} from "./adapt-clinical-review.js";

const observationValue=observation=>observation.status==="present"?observation.value:observation.status;
const assessmentStatus=(observation,categoryOnly=false)=>observation.status==="present"?(categoryOnly?"inferred_category_only":"entered"):observation.status==="unknown"?"unknown":"not_entered";
const categoryClass=observation=>observation.status!=="present"?observationValue(observation):["wide","rbbb","lbbb"].includes(observation.value)?"wide":observation.value;

function compare(field,legacy,canonical,legacySource){
  const canonicalValue=observationValue(canonical);
  let classification="MATCH";
  let reason="clinical meaning matches";
  if(canonical.status==="present"&&JSON.stringify(legacy)!==JSON.stringify(canonicalValue)){
    classification="MAJOR_FAIL";reason="entered canonical value differs from the legacy effective value";
  }else if(canonical.status!=="present"&&legacy!=null){
    classification="REVIEW";reason=legacySource==="legacy_pseudo_value"||legacySource==="legacy_default"?`${legacySource} is intentionally excluded from canonical evidence`:"legacy has a value while canonical preserves an unassessed or unknown state";
  }else if(legacy==null&&canonical.status==="present"){
    classification="MAJOR_FAIL";reason="canonical contains entered evidence missing from the legacy snapshot";
  }
  return {field,legacy,canonical:canonicalValue,legacySource,classification,reason};
}

export function buildProductionCanonicalMeasurementShadow(input){
  const canonical=adaptClinicalReviewToCanonical({
    heartRateBpm:input.heartRate.value,heartRateAssessment:input.heartRate.assessment,
    prMs:input.pr.value,prAssessment:input.pr.assessment,prCategory:input.pr.category,prCategoryAssessment:input.pr.categoryAssessment,
    qrsMs:input.qrs.value,qrsAssessment:input.qrs.measurementAssessment,qrsCategory:input.qrs.category,qrsCategoryAssessment:input.qrs.categoryAssessment,
    qtcMs:input.qtc.value,qtcAssessment:input.qtc.assessment,
  });
  const effectiveClasses={
    rateClass:canonical.derived.rateClass,
    prClass:canonical.derived.prClass.status==="not_assessed"?canonical.categorical.prClass:canonical.derived.prClass,
    qrsClass:canonical.derived.qrsClass.status==="not_assessed"?{...canonical.categorical.qrsWidth,...(canonical.categorical.qrsWidth.status==="present"?{value:categoryClass(canonical.categorical.qrsWidth)}:{})}:canonical.derived.qrsClass,
    qtcClass:canonical.derived.qtcClass,
  };
  const provenance={
    heartRateBpm:{source:canonical.measurements.heartRateBpm.status==="present"?"physician_measurement":null,assessmentStatus:assessmentStatus(canonical.measurements.heartRateBpm)},
    prMs:{source:canonical.measurements.prMs.status==="present"?"physician_measurement":null,assessmentStatus:assessmentStatus(canonical.measurements.prMs)},
    qrsMs:{source:canonical.measurements.qrsMs.status==="present"?"physician_measurement":null,assessmentStatus:assessmentStatus(canonical.measurements.qrsMs)},
    qrsWidthCategory:{source:canonical.categorical.qrsWidth.status==="present"?"physician_category":null,assessmentStatus:assessmentStatus(canonical.categorical.qrsWidth,true)},
    qtcMs:{source:canonical.measurements.qtcMs.status==="present"?"physician_measurement":null,assessmentStatus:assessmentStatus(canonical.measurements.qtcMs)},
  };
  const comparisons=[
    compare("heartRateBpm",input.legacy.heartRateBpm,canonical.measurements.heartRateBpm,input.legacySources.heartRateBpm),
    compare("prMs",input.legacy.prMs,canonical.measurements.prMs,input.legacySources.prMs),
    compare("qrsMs",input.legacy.qrsMs,canonical.measurements.qrsMs,input.legacySources.qrsMs),
    compare("qtcMs",input.legacy.qtcMs,canonical.measurements.qtcMs,input.legacySources.qtcMs),
    compare("rateClass",input.legacy.rateClass,effectiveClasses.rateClass,input.legacySources.rateClass),
    compare("prClass",input.legacy.prClass,effectiveClasses.prClass,input.legacySources.prClass),
    compare("qrsClass",input.legacy.qrsClass,effectiveClasses.qrsClass,input.legacySources.qrsClass),
    compare("qtcClass",input.legacy.qtcClass,effectiveClasses.qtcClass,input.legacySources.qtcClass),
  ];
  return {enabled:Boolean(input.enabled),canonical,effectiveClasses,provenance,comparisons,summary:{match:comparisons.filter(x=>x.classification==="MATCH").length,review:comparisons.filter(x=>x.classification==="REVIEW").length,majorFail:comparisons.filter(x=>x.classification==="MAJOR_FAIL").length}};
}
