import type { StandardEcgLead } from "../../types/st-interpretation";
export const standardLeads:StandardEcgLead[];
export const contiguousLeadGroups:Record<string,StandardEcgLead[]>;
export const reciprocalEducation:ReadonlyArray<{sourceGroup:string;elevation:readonly string[];checkDepression:readonly string[]}>;
export function elevationThresholdMm(lead:StandardEcgLead,age:number|null,sex:"male"|"female"|null):{threshold:number|null;reason:string};
