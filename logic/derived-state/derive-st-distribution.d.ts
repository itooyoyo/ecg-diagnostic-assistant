import type {ObservationState,StLeadObservations,StTerritory} from "../../types/clinical-observation";
export type LegacyStLeadMeasurement={lead:string;direction:string;clinicianConfirmed?:boolean};
export function createNotAssessedStLeads():StLeadObservations;
export function adaptLegacyStLeads(measurements:LegacyStLeadMeasurement[]):StLeadObservations;
export function deriveStTerritories(observations:StLeadObservations):ObservationState<StTerritory[]>;
export function deriveContiguousPattern(observations:StLeadObservations):ObservationState<"contiguous"|"non_contiguous">;
export function deriveReciprocalPattern(observations:StLeadObservations):ObservationState<boolean>;
