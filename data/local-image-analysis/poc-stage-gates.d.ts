export type PocLayoutType="three_by_four"|"six_by_two"|"unknown";
export type PocStageThreshold={readonly minimumWidthPx:number;readonly minimumHeightPx:number;readonly minimumPixelsPerLeadWidth:number;readonly minimumPixelsPerLeadHeight:number};
export const LOCAL_POC_STAGE_THRESHOLDS:{readonly layout:PocStageThreshold;readonly segmentation:PocStageThreshold;readonly polyline:PocStageThreshold;readonly heartRate:PocStageThreshold;readonly qrs:PocStageThreshold;readonly st:PocStageThreshold};
export function getPocLeadDimensions(width:number,height:number,layoutType:PocLayoutType):{width:number;height:number};
export function evaluatePocStageGates(input:{width:number;height:number;layoutType:PocLayoutType;gridDetected:boolean;imageQualityAdequate?:boolean}):{layout:boolean;segmentation:boolean;polyline:boolean;heartRate:boolean;qrs:boolean;st:boolean;leadPixels:{width:number;height:number}};
