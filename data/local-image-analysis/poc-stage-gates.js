// Provisional engineering thresholds for safe image-processing stages.
// These are not medical criteria and must not be relaxed for a single image.
export const LOCAL_POC_STAGE_THRESHOLDS=Object.freeze({
  layoutMinimumWidthPx:320,layoutMinimumHeightPx:180,
  segmentationMinimumWidthPx:400,segmentationMinimumHeightPx:220,
  polylineMinimumWidthPx:640,polylineMinimumHeightPx:360,
});

export function evaluatePocStageGates({width,height,layoutType,gridDetected}){
  const sized=(minimumWidth,minimumHeight)=>width>=minimumWidth&&height>=minimumHeight;
  const layoutKnown=layoutType==="three_by_four"||layoutType==="six_by_two";
  const layout=sized(LOCAL_POC_STAGE_THRESHOLDS.layoutMinimumWidthPx,LOCAL_POC_STAGE_THRESHOLDS.layoutMinimumHeightPx)&&layoutKnown;
  const segmentation=layout&&sized(LOCAL_POC_STAGE_THRESHOLDS.segmentationMinimumWidthPx,LOCAL_POC_STAGE_THRESHOLDS.segmentationMinimumHeightPx);
  const polyline=segmentation&&sized(LOCAL_POC_STAGE_THRESHOLDS.polylineMinimumWidthPx,LOCAL_POC_STAGE_THRESHOLDS.polylineMinimumHeightPx)&&gridDetected;
  return {layout,segmentation,polyline,heartRate:polyline,qrs:polyline,st:polyline};
}
