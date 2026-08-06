import type {LocalEcgFeatureCandidate,LocalFeatureReviewStatus,ReviewedLocalFeature} from "@/types/local-ecg-feature";
export function updateLocalFeatureReview(candidates:LocalEcgFeatureCandidate[],id:string,reviewStatus:LocalFeatureReviewStatus,physicianValue?:unknown,physicianComment?:string):LocalEcgFeatureCandidate[];
export function collectReviewedLocalFeatures(candidates:LocalEcgFeatureCandidate[]):{confirmed:ReviewedLocalFeature[];missing:Array<{id:string;featureType:LocalEcgFeatureCandidate["featureType"];reason:string}>};
