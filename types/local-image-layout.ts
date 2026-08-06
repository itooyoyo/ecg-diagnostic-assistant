import type {LeadName} from "@/types/ecg";
import type {LocalFeatureConfidence} from "@/types/local-ecg-feature";

export type LocalImageQualityLevel="adequate"|"limited"|"inadequate"|"indeterminate";
export type LocalImageQualityIssueType="low_resolution"|"blur"|"low_contrast"|"overexposure"|"underexposure"|"glare"|"cropped_edges"|"excessive_rotation"|"perspective_distortion"|"grid_not_detected"|"lead_labels_not_visible"|"waveform_overlap"|"unknown";
export type LocalEcgImageQualityResult={level:LocalImageQualityLevel;width:number;height:number;aspectRatio:number;issues:Array<{type:LocalImageQualityIssueType;severity:"mild"|"moderate"|"severe";explanationJa:string;affectedRegion?:ImageRegion}>;metrics:{brightnessMean:number|null;contrastEstimate:number|null;blurEstimate:number|null;clippedWhiteRatio:number|null;clippedBlackRatio:number|null;estimatedRotationDeg:number|null};canProceedToLayoutDetection:boolean;suggestedActions:string[]};
export type ImageRegion={x:number;y:number;width:number;height:number};
export type EcgPaperRegionCandidate={polygon:Array<{x:number;y:number}>;confidence:LocalFeatureConfidence;limitations:string[]};
export type EcgLeadRegionCandidate={id:string;lead:LeadName|"rhythm_strip"|"unknown";region:ImageRegion;confidence:LocalFeatureConfidence;reviewStatus:"pending"|"accepted"|"modified"|"rejected";limitations:string[]};
export type EcgLeadLayoutType="three_by_four"|"six_by_two"|"twelve_lead_with_long_ii"|"twelve_lead_with_long_v1"|"unknown";
export type EcgLeadLayoutCandidate={layoutType:EcgLeadLayoutType;confidence:LocalFeatureConfidence;expectedLeadOrder:Array<LeadName|"rhythm_strip">;detectedRegions:EcgLeadRegionCandidate[];missingLeads:LeadName[];limitations:string[];reviewStatus:"pending"|"accepted"|"modified"|"rejected"};
export type LocalGridCandidate={detected:boolean;horizontalSpacingPx:number|null;verticalSpacingPx:number|null;confidence:LocalFeatureConfidence;limitations:string[]};
export type ConfirmedLeadLayout={layoutType:EcgLeadLayoutType;paperRegion:EcgPaperRegionCandidate;grid:{detected:boolean;horizontalSpacingPx:number|null;verticalSpacingPx:number|null};leads:Array<{lead:EcgLeadRegionCandidate["lead"];region:ImageRegion}>;imageQuality:LocalEcgImageQualityResult};
