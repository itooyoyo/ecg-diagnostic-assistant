import type {IntegratedInput,IntegratedInterpretation} from "@/types/integrated-interpretation";

export type LocalAnalysisStatus="idle"|"validating_image"|"detecting_layout"|"extracting_waveforms"|"measuring"|"evaluating_rules"|"success"|"unsupported"|"failed"|"cancelled";
export type PocQuality="adequate"|"limited"|"inadequate";
export type RhythmRegularity="regular"|"regularly_irregular"|"irregularly_irregular"|"indeterminate";
export type QrsWidthCandidate="narrow"|"wide"|"indeterminate";
export type StDirection="elevation"|"depression"|"isoelectric"|"indeterminate";
export type StandardPocLead="I"|"II"|"III"|"aVR"|"aVL"|"aVF"|"V1"|"V2"|"V3"|"V4"|"V5"|"V6";

export type DigitizedLeadPoC={lead:StandardPocLead;points:Array<{x:number;y:number}>;quality:PocQuality;limitations:string[]};
export type StDirectionCandidate={lead:StandardPocLead;direction:StDirection;quality:PocQuality;limitations:string[]};
export type LocalPocMeasurements={heartRateBpm:number|null;rrIntervals:number[];rhythmRegularity:RhythmRegularity;estimatedQrsDurationMs:number|null;qrsWidthCandidate:QrsWidthCandidate;stDirections:StDirectionCandidate[];quality:PocQuality;limitations:string[]};
export type LocalPocResult={imageQuality:PocQuality;layout:"three_by_four"|"six_by_two";leads:DigitizedLeadPoC[];measurements:LocalPocMeasurements;context:IntegratedInput;ruleResult:IntegratedInterpretation;extractedFields:string[];indeterminateFields:string[];limitations:string[];processingTimeMs:number};
export type LocalPocCorrection={heartRateBpm:number|null;rhythmRegularity:RhythmRegularity;qrsWidthCandidate:QrsWidthCandidate;stDirections:StDirectionCandidate[];source:"local_image_poc"|"physician_corrected"};
