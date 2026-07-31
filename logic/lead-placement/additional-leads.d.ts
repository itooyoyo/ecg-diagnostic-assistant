export type AdditionalLeadFindings = {
  inferiorStElevation:boolean;
  hypotension:boolean;
  stDepressionV1toV3:boolean;
  suspectedRVOcclusion:boolean;
  suspectedPosteriorOcclusion:boolean;
};
export type AdditionalLeadSuggestion = {
  type:"right-sided"|"posterior";
  leads:string[];
  emphasizedLead:string|null;
  urgentContext:boolean;
  message:string;
};
export function suggestAdditionalLeads(findings:AdditionalLeadFindings):AdditionalLeadSuggestion[];
