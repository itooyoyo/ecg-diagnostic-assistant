import type {StandardEcgLead} from "./st-interpretation";

export type FourStateFinding="present"|"absent"|"unknown"|"not_assessed";
export type JWaveMorphology="notching"|"slurring"|"other"|"unknown"|"not_assessed";
export type JPointAmplitude="ge_0_1"|"lt_0_1"|"unknown"|"not_assessed";
export type JWaveDistribution="inferior"|"lateral"|"other"|"unknown"|"not_assessed";
export type PostJStSlope="horizontal_descending"|"ascending"|"other"|"unknown"|"not_assessed";

export type JWaveReviewState={
  presence:FourStateFinding;
  morphology:JWaveMorphology;
  amplitude:JPointAmplitude;
  distribution:JWaveDistribution;
  leads:StandardEcgLead[];
  postJStSlope:PostJStSlope;
  vfOrPolymorphicVtHistory:FourStateFinding;
  cardiacArrestHistory:FourStateFinding;
  familySuddenDeath:FourStateFinding;
  hypothermia:FourStateFinding;
};

export const createDefaultJWaveReview=():JWaveReviewState=>({presence:"not_assessed",morphology:"not_assessed",amplitude:"not_assessed",distribution:"not_assessed",leads:[],postJStSlope:"not_assessed",vfOrPolymorphicVtHistory:"not_assessed",cardiacArrestHistory:"not_assessed",familySuddenDeath:"not_assessed",hypothermia:"not_assessed"});
