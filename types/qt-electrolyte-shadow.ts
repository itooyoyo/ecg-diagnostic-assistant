import type {EcgDerivedState,ObservationState} from "./clinical-observation";
import type {ShadowCandidateEvaluation} from "./shadow-evaluation";

export type QtElectrolyteShadowInput={
  qtcMs:ObservationState<number>;
  qtcClass:EcgDerivedState["qtcClass"];
  heartRateBpm:ObservationState<number>;
  rateClass:EcgDerivedState["rateClass"];
  qrsClass:EcgDerivedState["qrsClass"];
  qtMs:ObservationState<number>;
  pvc:ObservationState<boolean>;
  ventricularEctopy:ObservationState<boolean>;
  rOnT:ObservationState<boolean>;
  polymorphicVt:ObservationState<boolean>;
  tdp:ObservationState<boolean>;
  syncope:ObservationState<boolean>;
  qtMarked:ObservationState<boolean>;
  qtProlongingMedication:ObservationState<boolean>;
  antiarrhythmicMedication:ObservationState<boolean>;
  psychotropicMedication:ObservationState<boolean>;
  congenitalOrFamilyContext:ObservationState<boolean>;
  potassiumHigh:ObservationState<boolean>;
  potassiumLow:ObservationState<boolean>;
  magnesiumLow:ObservationState<boolean>;
  calciumHigh:ObservationState<boolean>;
  calciumLow:ObservationState<boolean>;
  peakedT:ObservationState<boolean>;
  hyperacuteT:ObservationState<boolean>;
  tFlattening:ObservationState<boolean>;
  uWave:ObservationState<boolean>;
  quProlongation:ObservationState<boolean>;
  pWaveLoss:ObservationState<boolean>;
  pWaveAttenuation:ObservationState<boolean>;
  prProlongation:ObservationState<boolean>;
  qrsWidening:ObservationState<boolean>;
  sineWave:ObservationState<boolean>;
  stDepression:ObservationState<boolean>;
  ischemicChestPain:ObservationState<boolean>;
  dynamicIschemicChange:ObservationState<boolean>;
  territorialHyperacuteT:ObservationState<boolean>;
  wideTachycardia:ObservationState<boolean>;
  pacedRhythm:ObservationState<boolean>;
};

export type QtElectrolyteShadowResult={
  candidates:ShadowCandidateEvaluation[];
  limitations:string[];
  emergencyPatterns:string[];
};
