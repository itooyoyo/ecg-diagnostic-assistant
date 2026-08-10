/** Stable rule identifiers for the integrated, physician-confirmed rule engine. */
export const candidateRuleIds={
  "atrial-fibrillation-pattern":["ECG-PWAVE-002","ECG-TACHY-003"],
  "lbbb-pattern":["ECG-QRS-002","ECG-BBB-001"],
  "lbbb-paced-occlusion":["ECG-ST-006"],
  "lbbb-paced-occlusion-limited":["ECG-ST-007"],
  "technical-limitation":["ECG-QUALITY-001"],
  "acute-coronary-occlusion":["ECG-ST-001"],
  "inferior-rv-conduction":["ECG-ST-002","ECG-BRADY-006"],
  "posterior-ischemia":["ECG-ST-003"],
  "wellens-pattern":["ECG-WELLENS-001"],
  "diffuse-subendocardial-ischemia":["ECG-ST-004"],
  "digitalis-effect":["ECG-ST-008"],
  "rate-related-st-change":["ECG-ST-009"],
  "preexcitation-pattern":["ECG-WPW-001"],
  "r-wave-progression":["ECG-RWAVE-001"],
  "tdp-risk":["ECG-QT-003","ECG-UWAVE-002"],
  "hyperkalemia-pattern":["ECG-ELECTROLYTE-001"],
  "low-k-mg-pattern":["ECG-ELECTROLYTE-002","ECG-ELECTROLYTE-005"],
  "hypercalcemia-pattern":["ECG-ELECTROLYTE-003"],
  "hypocalcemia-pattern":["ECG-ELECTROLYTE-004"],
  "advanced-av-block":["ECG-AVBLOCK-004","ECG-BRADY-005"],
  "wide-qrs-tachycardia":["ECG-TACHY-005"],
  "preexcited-af":["ECG-WPW-002"],
  "acute-right-heart-strain":["ECG-QRS-006","ECG-AXIS-003"],
  "giant-negative-t-differential":["ECG-TWAVE-005"]
};

export function rulesForCandidate(candidateId){return candidateRuleIds[candidateId]??[]}
