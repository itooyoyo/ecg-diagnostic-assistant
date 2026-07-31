import type { EvidenceSource } from "@/types/ecg";
// Only primary society guidance is registered. User-provided images are not sourced from these publications.
export const evidenceRegistry: EvidenceSource[] = [
  {
    sourceOrganization:"JCS",
    sourceTitle:"急性冠症候群ガイドライン（2018年改訂版）",
    publicationYear:2018,
    section:"第3章 初期診断、初期治療",
    url:"https://www.j-circ.or.jp/cms/wp-content/uploads/2018/11/JCS2018_kimura.pdf",
    evidenceType:"guideline",
  },
  {
    sourceOrganization:"AHA/ACC/HRS",
    sourceTitle:"2021 AHA/ACC/ASE/CHEST/SAEM/SCCT/SCMR Guideline for the Evaluation and Diagnosis of Chest Pain",
    publicationYear:2021,
    section:"Evaluation of Patients With Acute Chest Pain",
    url:"https://www.ahajournals.org/doi/10.1161/CIR.0000000000001029",
    evidenceType:"guideline",
  },
  {
    sourceOrganization:"ESC",
    sourceTitle:"2023 ESC Guidelines for the management of acute coronary syndromes",
    publicationYear:2023,
    section:"Diagnostic tools: Electrocardiogram",
    url:"https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/",
    evidenceType:"guideline",
  },
];
