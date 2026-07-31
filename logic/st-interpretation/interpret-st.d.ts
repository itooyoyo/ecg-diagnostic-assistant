import type { EcgLead, StClinicalContext, StInterpretation, StInterpretationInput, StMeasurement } from "../../types/st-interpretation";
export function createEmptyStMeasurement(lead:EcgLead):StMeasurement;
export function normalizeMeasurement(measurement:StMeasurement):StMeasurement;
export function assessLeadMeasurement(measurement:StMeasurement,clinical:StClinicalContext):{lead:EcgLead;significant:boolean|null;reason:string};
export function interpretStChanges(input:StInterpretationInput):StInterpretation;
