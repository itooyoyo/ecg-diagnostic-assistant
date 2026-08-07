// Provisional engineering thresholds, derived from per-lead sampling needs.
// They are not medical criteria and must not be relaxed for a single image.
export const LOCAL_POC_STAGE_THRESHOLDS=Object.freeze({
  layout:Object.freeze({minimumWidthPx:320,minimumHeightPx:180,minimumPixelsPerLeadWidth:0,minimumPixelsPerLeadHeight:0}),
  segmentation:Object.freeze({minimumWidthPx:0,minimumHeightPx:0,minimumPixelsPerLeadWidth:90,minimumPixelsPerLeadHeight:32}),
  polyline:Object.freeze({minimumWidthPx:0,minimumHeightPx:0,minimumPixelsPerLeadWidth:120,minimumPixelsPerLeadHeight:40}),
  heartRate:Object.freeze({minimumWidthPx:640,minimumHeightPx:0,minimumPixelsPerLeadWidth:220,minimumPixelsPerLeadHeight:40}),
  qrs:Object.freeze({minimumWidthPx:640,minimumHeightPx:0,minimumPixelsPerLeadWidth:220,minimumPixelsPerLeadHeight:48}),
  st:Object.freeze({minimumWidthPx:640,minimumHeightPx:0,minimumPixelsPerLeadWidth:220,minimumPixelsPerLeadHeight:48}),
});

export function getPocLeadDimensions(width,height,layoutType){
  if(layoutType==="three_by_four")return {width:width*.92/4,height:height*.92/3};
  if(layoutType==="three_by_four_with_long_ii")return {width:width*.92/4,height:height*.70/3};
  if(layoutType==="six_by_two")return {width:width*.95/2,height:height*.95/6};
  return {width:0,height:0};
}

export function evaluatePocStageGates({width,height,layoutType,gridDetected,imageQualityAdequate=true}){
  const layoutKnown=layoutType==="three_by_four"||layoutType==="three_by_four_with_long_ii"||layoutType==="six_by_two";
  const leadPixels=getPocLeadDimensions(width,height,layoutType);
  const meets=stage=>width>=stage.minimumWidthPx&&height>=stage.minimumHeightPx&&leadPixels.width>=stage.minimumPixelsPerLeadWidth&&leadPixels.height>=stage.minimumPixelsPerLeadHeight;
  const layout=layoutKnown&&meets(LOCAL_POC_STAGE_THRESHOLDS.layout);
  const segmentation=layout&&meets(LOCAL_POC_STAGE_THRESHOLDS.segmentation);
  const polyline=segmentation&&gridDetected&&meets(LOCAL_POC_STAGE_THRESHOLDS.polyline);
  const heartRate=polyline&&imageQualityAdequate&&meets(LOCAL_POC_STAGE_THRESHOLDS.heartRate);
  const qrs=polyline&&imageQualityAdequate&&meets(LOCAL_POC_STAGE_THRESHOLDS.qrs);
  const st=polyline&&imageQualityAdequate&&meets(LOCAL_POC_STAGE_THRESHOLDS.st);
  return {layout,segmentation,polyline,heartRate,qrs,st,leadPixels};
}
