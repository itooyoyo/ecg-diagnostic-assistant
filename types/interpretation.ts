export type InterpretationStatus =
  | "accepted"
  | "edited"
  | "rejected"
  | "indeterminate";

export type UrgencyLevel =
  | "emergency"
  | "same_day"
  | "routine"
  | "uncertain";

export type EvidenceSource = {
  organization: string;
  title: string;
  year: number;
  section?: string;
  url?: string;
  evidenceType:
    | "guideline"
    | "consensus"
    | "scientific_statement"
    | "original_article";
};

export type FindingFactor = {
  id: string;
  label: string;
  category:
    | "ischemia"
    | "structural"
    | "electrolyte"
    | "drug"
    | "rate_related"
    | "conduction"
    | "physiologic"
    | "technical"
    | "other";
  priority: "high" | "medium" | "low";
  supportingInputs: string[];
  contradictingInputs: string[];
  requiredInputs: string[];
  isRedFlag: boolean;
  sources: EvidenceSource[];
};

export type EcgInterpretationItem = {
  id: string;
  title: string;
  aiValue: unknown;
  clinicianValue: unknown;
  status: InterpretationStatus;
  abnormal: boolean | null;
  confidence: number | null;
  meaning: string[];
  possibleFactors: FindingFactor[];
  mustNotMiss: FindingFactor[];
  additionalChecks: string[];
  nextActions: string[];
  urgency: UrgencyLevel;
  limitations: string[];
  sources: EvidenceSource[];
};

export type FactorGroup = {
  supported: FindingFactor[];
  possible: FindingFactor[];
  insufficient: FindingFactor[];
};

export type InterpretationPlan = {
  redFlags: string[];
  sameDay: string[];
  reevaluate: string[];
  routine: string[];
};
