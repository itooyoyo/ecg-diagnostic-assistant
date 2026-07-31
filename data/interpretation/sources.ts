import type { EvidenceSource } from "@/types/interpretation";

export const interpretationSources = {
  jcsArrhythmia: {
    organization: "JCS/JHRS",
    title: "2022 Guideline on Diagnosis and Risk Assessment of Arrhythmia",
    year: 2022,
    section: "書誌情報・診断評価の全体構成",
    url: "https://doi.org/10.1253/circj.CJ-22-0827",
    evidenceType: "guideline",
  },
  ahaStandardization: {
    organization: "AHA/ACCF/HRS",
    title: "Recommendations for the Standardization and Interpretation of the Electrocardiogram: Part IV",
    year: 2009,
    section: "ST segment, T and U waves, and QT interval",
    url: "https://pubmed.ncbi.nlm.nih.gov/19281931/",
    evidenceType: "scientific_statement",
  },
  escVentricularArrhythmia: {
    organization: "ESC",
    title: "2022 Guidelines for Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death",
    year: 2022,
    section: "書誌情報のみ。本文の変換・判定実装には未使用",
    url: "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/ventricular-arrhythmias-and-the-prevention-of-sudden-cardiac-death/",
    evidenceType: "guideline",
  },
} satisfies Record<string, EvidenceSource>;

export const commonInterpretationSources = Object.values(interpretationSources);
