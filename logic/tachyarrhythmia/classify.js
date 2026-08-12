export const TACHYCARDIA_THRESHOLD_BPM = 100;
export const WIDE_QRS_THRESHOLD_MS = 120;

const baseActions = ["継続モニター", "静脈路確保", "12誘導心電図", "血圧・SpO₂再評価"];

export function evaluateHemodynamics(input) {
  if (input.pulsePresent === false) {
    return {
      status: "cardiac-arrest",
      label: "無脈性・心停止分岐",
      message: "同期カルディオバージョンではなく、直ちに心停止対応へ移行してください。",
    };
  }
  const unstable = input.hypotension || input.alteredMentalStatus || input.shockSigns ||
    input.ischemicChestPain || input.acuteHeartFailure || input.pulmonaryEdema ||
    input.severeRespiratoryFailure || input.syncope || input.markedPresyncope ||
    input.organHypoperfusion;
  if (unstable) {
    return {
      status: "unstable",
      label: "循環動態不安定",
      message: "循環動態不安定な頻脈です。直ちに救急対応へ移行し、リズムに応じた処置を検討してください。",
    };
  }
  if (input.pulsePresent == null || input.systolicBp == null) {
    return {
      status: "insufficient",
      label: "情報不足",
      message: "脈拍と血圧を確認し、循環動態を再評価してください。",
    };
  }
  return { status: "stable", label: "循環動態安定", message: "現時点の入力では不安定所見を認めません。" };
}

export function classifyTachyarrhythmia(input) {
  const hemodynamics = evaluateHemodynamics(input);
  const missing = [];
  if (input.heartRate == null) missing.push("心拍数");
  if (input.qrsMs == null) missing.push("QRS幅");
  if (!input.regularity || input.regularity === "unknown") missing.push("規則性");
  if (input.pWave === "unknown") missing.push("心房活動（P波は見えないだけの可能性を含む）");
  if (!input.avRelationship || input.avRelationship === "unknown") missing.push("房室関係／房室解離");
  if (input.potassium == null) missing.push("K");
  if (input.calcium == null) missing.push("Ca");
  if (input.magnesium == null) missing.push("Mg");

  const isTachycardia = input.heartRate != null && input.heartRate >= TACHYCARDIA_THRESHOLD_BPM;
  const qrsClass = input.qrsCategoryOverride&&input.qrsCategoryOverride!=="auto"?input.qrsCategoryOverride:input.qrsMorphologyVariable?"variable":input.qrsMs == null ? "indeterminate" : input.qrsMs < WIDE_QRS_THRESHOLD_MS ? "narrow" : "wide";
  const diagnosticReasoning = [`① QRS幅：${qrsClass === "indeterminate" ? "判定不能" : qrsClass === "narrow" ? "Narrow" : "Wide"}`, `② 規則性：${input.regularity === "unknown" ? "判定不能" : input.regularity === "regular" ? "規則" : "不規則"}`, `③ P波：${input.pWave}`, `④ 房室解離：${input.avRelationship === "av-dissociation" ? "あり" : input.avRelationship === "unknown" ? "判定不能" : "明確でない"}`];
  const findings={regularity:input.regularity,avDissociation:input.avDissociation??null,captureBeat:input.captureBeats??null,fusionBeat:input.fusionBeats??null,existingBundleBranchBlock:input.existingBundleBranchBlock??null,polymorphicWide:input.polymorphicWide??null,qrsMorphologyVariable:input.qrsMorphologyVariable??null,preExcitation:input.preExcitation??((input.deltaWave||input.shortPr||input.wpwHistory)?true:null),torsadesCandidate:false};
  const baseResult = { qrsClass, diagnosticReasoning, contraindicatedDrugCandidates:[], clinicalPearls:[],overallClassification:"indeterminate",possibleCauses:[],findings,limitations:["単一所見で頻拍機序を確定しません。","薬剤用量、ショックエネルギー、抗凝固・アブレーション・ICD適応を自動決定しません。"] };
  if (!isTachycardia) return { ...baseResult, active:false, hemodynamics, classification:null, candidates:[], priority:null, redFlags:[], warnings:[], missing, plan:[] };
  if (hemodynamics.status === "cardiac-arrest") {
    return { ...baseResult, active:true, hemodynamics, classification:null, candidates:["心停止リズム"], priority:"心停止対応", redFlags:["無脈性"], warnings:[], missing, plan:["心停止アルゴリズムへ分岐", "蘇生チームを準備"] };
  }

  let classification = null;
  if ((qrsClass === "narrow" || qrsClass === "wide") && input.regularity && input.regularity !== "unknown") {
    classification = `${qrsClass} ${input.regularity}`;
  }

  const catalog = {
    "narrow regular": {
      priority: input.sinusFeatures ? "洞性頻脈（原因検索を優先）" : "発作性上室性頻拍を含む規則的上室頻拍",
      candidates:["洞性頻脈","AVNRT","正方向性AVRT","心房頻拍","一定伝導の心房粗動","接合部頻拍"],
    },
    "narrow irregular": {
      priority:"心房細動を含む不規則上室頻拍",
      candidates:["心房細動","可変伝導心房粗動","多源性心房頻拍","頻発性心房期外収縮","洞性不整脈"],
    },
    "wide regular": {
      priority:"心室頻拍を最優先",
      candidates:["単形性心室頻拍","SVT＋既存脚ブロック","SVT＋変行伝導","副伝導路を介する頻拍","ペーシング調律","電解質異常／薬剤性QRS延長"],
    },
    "wide irregular": {
      priority:"pre-excited AFまたは多形性心室頻拍を優先除外",
      candidates:["心房細動＋WPW／副伝導路","心房細動＋脚ブロック／変行伝導","多形性心室頻拍","QT延長に伴うTdP","心室細動へ移行しうる心室調律","電解質異常／薬剤性"],
    },
  };
  const category = classification ? catalog[classification] : null;
  const candidates = category ? [...category.candidates] : [];
  let priority = category?.priority ?? "分類情報不足";
  const warnings = [];
  const redFlags = [];
  const contraindicatedDrugCandidates = [];
  const clinicalPearls = [qrsClass === "wide" ? "Wide QRS頻拍は、確証がなければVTとして扱うことを基本に、臨床経過・既往・12誘導所見を合わせて評価します。" : "Narrow QRS頻拍では、まず上室性頻拍の機序を整理します。"];
  let overallClassification="indeterminate";const possibleCauses=[];

  if (classification === "narrow irregular" && input.pWave === "absent" && input.fibrillatoryWaves) {
    priority = "心房細動候補";
    overallClassification="atrial_fibrillation_candidate";
    diagnosticReasoning.push("⑤ RR不整＋P波消失＋細動波から心房細動を支持");
  } else if (input.flutterWaves) {
    priority = `心房粗動候補${input.flutterConduction !== "unknown" ? `（${input.flutterConduction}伝導）` : ""}`;
    overallClassification="atrial_flutter_candidate";
    diagnosticReasoning.push("⑤ F波と房室伝導比から心房粗動を支持");
  } else if (classification === "narrow regular" && (input.pWave === "retrograde" || input.pWave === "buried")) {
    priority = "AVNRT／AVRT候補";
    overallClassification=input.longRp?"avrt_candidate":"avnrt_candidate";
    diagnosticReasoning.push("⑤ 規則的Narrow頻拍＋逆行性または埋没P波からAVNRT／AVRTを候補化");
  } else if (classification === "narrow regular" && input.pWave === "present") {
    priority = input.sinusFeatures ? "洞性頻脈（原因検索を優先）" : "心房頻拍候補";
    overallClassification=input.sinusFeatures?"sinus_tachycardia_candidate":"atrial_tachycardia_candidate";
    diagnosticReasoning.push(`⑤ P波を認め、${input.sinusFeatures ? "洞性の発症様式" : "異所性心房頻拍"}を評価`);
  }

  if (hemodynamics.status === "unstable") redFlags.push("循環動態不安定な頻脈");
  if (classification === "wide irregular") redFlags.push("wide irregular tachycardia");
  if (classification === "wide regular") warnings.push("確証がなければ心室頻拍として扱い、単一所見でVTを否定しないでください。");
  if(classification==="wide regular"){overallClassification=input.existingBundleBranchBlock&&!input.avDissociation&&!input.captureBeats&&!input.fusionBeats?"other_wide_complex_tachycardia":"ventricular_tachycardia_candidate";redFlags.push("原因不明のWide QRS頻拍");}
  if (classification?.startsWith("wide") && input.avRelationship === "av-dissociation") {
    priority = "房室解離を伴うVT候補";
    redFlags.push("Wide QRS頻拍＋房室解離");
    diagnosticReasoning.push("⑤ Wide QRS頻拍＋房室解離はVTを支持");
  }
  if(classification?.startsWith("wide")&&(input.avDissociation||input.captureBeats||input.fusionBeats)){overallClassification="ventricular_tachycardia_candidate";priority="VTを強く疑う候補";warnings.push("AV解離／capture／fusion候補はVTを支持しますが不明瞭画像から確定しません。");}
  if (classification === "wide regular" && (input.priorMi || input.structuralHeartDisease)) {
    priority = "器質的心疾患を背景とする心室頻拍を強く疑う";
    warnings.push("心筋梗塞既往／構造的心疾患はVTを支持します。");
  }
  const wpwEvidence = input.preExcitation === true || input.wpwHistory || input.deltaWave || input.shortPr;
  const preexcitedAf = classification === "wide irregular" && (wpwEvidence || input.qrsMorphologyVariable);
  if (preexcitedAf) {
    redFlags.push("WPW／副伝導路を介する心房細動疑い");
    warnings.push("房室結節のみを遮断する薬剤は避けてください。");
    overallClassification="preexcited_atrial_fibrillation_candidate";
    contraindicatedDrugCandidates.push("ベラパミル", "ジルチアゼム", "β遮断薬", "ジゴキシン", "アデノシン", "静注アミオダロン");
    clinicalPearls.push("WPW／副伝導路を伴う心房細動では、AV結節遮断薬単独により副伝導路伝導が優位になる可能性があります。");
  }
  if(input.polymorphicWide&&qrsClass!=="narrow"){overallClassification="ventricular_tachycardia_candidate";findings.torsadesCandidate=input.qtcMs!=null&&input.qtcMs>=500;priority=findings.torsadesCandidate?"QT延長に伴うTdP候補":"多形性VT候補（虚血・電気疾患等を評価）";redFlags.push(priority);}
  if(input.highPotassium&&qrsClass!=="narrow")possibleCauses.push("高Kによる代謝性Wide QRS頻拍候補");if(input.dynamicStChange||input.hyperacuteT)possibleCauses.push("急性虚血またはrate-related ST-T変化");if(input.multiplePWaveMorphologies&&classification==="narrow irregular"&&!input.fibrillatoryWaves){overallClassification="atrial_tachycardia_candidate";priority="多源性心房頻拍候補";}if(input.frequentPac&&classification==="narrow irregular"&&!input.fibrillatoryWaves)warnings.push("頻発PACを心房細動と誤確定しません。");if(input.artifactConcern){overallClassification="indeterminate";priority="アーチファクト疑い／判定不能";}
  if(input.clinicianClassification&&input.clinicianClassification!=="auto")overallClassification=input.clinicianClassification;
  if (classification === "wide irregular" && input.qtcMs != null && input.qtcMs >= 500) {
    candidates.unshift("QT延長に伴うTdP");
    redFlags.push("QT延長を伴うwide irregular rhythm");
  }
  if (input.sinusFeatures && classification === "narrow regular") {
    warnings.push("洞性頻脈では不整脈治療より、発熱・疼痛・脱水・貧血・低酸素・感染・甲状腺・肺塞栓・心不全・薬剤などの原因検索を優先します。");
  }

  const plan = [...baseActions];
  if (hemodynamics.status === "unstable") plan.unshift("救急対応を開始し、専門チームへ連絡");
  if (classification?.startsWith("wide")) plan.push("循環器／救急専門医へ相談");
  plan.push("症状・血圧・意識・SpO₂を再評価", "K・Ca・Mgを確認", "12誘導心電図を再検", "心エコーと前回心電図を確認");

  return { active:true, hemodynamics, classification, overallClassification, qrsClass, candidates, priority, redFlags:[...new Set(redFlags)], warnings, missing, preexcitedAf, findings, plan:[...new Set(plan)], diagnosticReasoning, contraindicatedDrugCandidates, clinicalPearls,possibleCauses,limitations:baseResult.limitations };
}
