import type {IntegratedInput,IntegratedInterpretation} from "@/types/integrated-interpretation";

export type LocalAnalysisStatus="idle"|"validating_image"|"detecting_layout"|"extracting_waveforms"|"measuring"|"evaluating_rules"|"success"|"unsupported"|"failed"|"cancelled";
export type PocQuality="adequate"|"limited"|"inadequate";
export type RhythmRegularity="regular"|"regularly_irregular"|"irregularly_irregular"|"indeterminate";
export type QrsWidthCandidate="narrow"|"wide"|"indeterminate";
export type StDirection="elevation"|"depression"|"isoelectric"|"indeterminate";
export type StandardPocLead="I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";
export type MeasurementSource="long_ii"|"lead_ii"|"other"|"indeterminate";
export type PeakCandidate={x:number;y:number;prominence:number;amplitude:number;candidateWidthPx:number;precedingRrPx:number|null;followingRrPx:number|null;clusterId:number;accepted:boolean;rejectionReason:string|null;artifactClass:"same_qrs_cluster"|"t_wave_or_noise"|"grid_residual_candidate"|"local_noise_candidate"|null};
export type QrsBeatAudit={peakX:number;onsetX:number|null;offsetX:number|null;durationMs:number|null};
export type RuleContextAuditItem={field:string;value:boolean|number|string|null;source:"local_image_poc"|"physician_corrected"|"indeterminate";quality:PocQuality|"indeterminate"};

export type DigitizedLeadPoC={lead:StandardPocLead;points:Array<{x:number;y:number}>;quality:PocQuality;limitations:string[]};
export type StDirectionCandidate={lead:StandardPocLead;direction:StDirection;quality:PocQuality;baselineCandidate:{startX:number;endX:number}|null;jPointCandidate:{x:number;y:number}|null;samplePointCandidate:{x:number;y:number}|null;baselineY:number|null;stY:number|null;differencePx:number|null;limitations:string[]};
export type LocalPocMeasurements={heartRateBpm:number|null;heartRateSource:MeasurementSource;rrIntervals:number[];rhythmRegularity:RhythmRegularity;rhythmSource:MeasurementSource;rawPeakCandidateCount:number;peakClusterCount:number;peakCandidates:PeakCandidate[];peakQuality:{refractoryViolationRate:number;prominenceMedian:number|null;rrOutlierRate:number|null};estimatedQrsDurationMs:number|null;qrsWidthCandidate:QrsWidthCandidate;qrsAudit:{measurementLead:string|null;beatCount:number;beats:QrsBeatAudit[];medianDurationMs:number|null;quality:PocQuality;limitations:string[]};stDirections:StDirectionCandidate[];quality:PocQuality;limitations:string[]};
export type LocalPocResult={imageQuality:PocQuality;layout:"three_by_four"|"three_by_four_with_long_ii"|"six_by_two";leads:DigitizedLeadPoC[];longII:DigitizedLeadPoC|null;measurements:LocalPocMeasurements;context:IntegratedInput;contextAudit:RuleContextAuditItem[];ruleResult:IntegratedInterpretation;extractedFields:string[];indeterminateFields:string[];limitations:string[];processingTimeMs:number};
export type LocalPocCorrection={heartRateBpm:number|null;rhythmRegularity:RhythmRegularity;qrsWidthCandidate:QrsWidthCandidate;stDirections:StDirectionCandidate[];source:"local_image_poc"|"physician_corrected"};
