import { standardLeads } from "./criteria.js";
import { createEmptyStMeasurement } from "../../logic/st-interpretation/interpret-st.js";

export function createDefaultStInput(){
  return {
    leadMeasurements:standardLeads.map((lead)=>({...createEmptyStMeasurement(lead),direction:"isoelectric",amplitudeMm:0,measurementPoint:"j_point",baselineReference:"tp_segment",clinicianConfirmed:true})),
    reciprocalFinding:{status:"absent",leads:[],amplitudeMm:null,dynamicChange:false},
    dynamicChange:false,priorEcgAvailable:false,priorComparison:"indeterminate",qrsContext:"narrow",
    preconditions:{imageQualityAdequate:true,paperSpeedKnown:true,gainKnown:true,baselineStable:true,noiseAcceptable:true,leadLabelsKnown:true,placementConcern:false,v1v2HighPlacementConcern:false},
    clinical:{age:null,sex:null,ischemicSymptoms:null,symptomOnset:"",hemodynamicInstability:false,hypotension:false,jugularVenousDistension:false,pulmonaryCongestionAbsent:false,troponinDynamicChange:null,posteriorOcclusionSuspected:false,highRWaveV1toV3:false,earlyRepolarizationSuspected:false,heartRate:null},
  };
}

export function createClinicalReviewStInput(){
  const input=createDefaultStInput();
  return {...input,clinicalReviewStatus:"unentered",elevationShape:"unentered",leadMeasurements:standardLeads.map(createEmptyStMeasurement),reciprocalFinding:{status:"indeterminate",leads:[],amplitudeMm:null,dynamicChange:null},dynamicChange:null};
}
