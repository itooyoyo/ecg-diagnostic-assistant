import type {GrayImage} from "./digitizer-core.js";
import type {ConfirmedLeadLayout,EcgLeadLayoutCandidate,EcgLeadLayoutType,EcgLeadRegionCandidate,EcgPaperRegionCandidate,ImageRegion,LocalEcgImageQualityResult,LocalGridCandidate} from "@/types/local-image-layout";
export function evaluateLocalImageQuality(gray:GrayImage,thresholds?:Record<string,number>):LocalEcgImageQualityResult;
export function createPaperRegionCandidate(gray:GrayImage):EcgPaperRegionCandidate;
export function createGridCandidate(gray:GrayImage):LocalGridCandidate;
export function createLayoutCandidate(layoutType:EcgLeadLayoutType,bounds:ImageRegion):EcgLeadLayoutCandidate;
export function updateLeadRegion(regions:EcgLeadRegionCandidate[],id:string,patch:Partial<EcgLeadRegionCandidate>):EcgLeadRegionCandidate[];
export function buildConfirmedLeadLayout(input:{layout:EcgLeadLayoutCandidate|null;paperRegion:EcgPaperRegionCandidate|null;grid:LocalGridCandidate;imageQuality:LocalEcgImageQualityResult}):ConfirmedLeadLayout|null;
