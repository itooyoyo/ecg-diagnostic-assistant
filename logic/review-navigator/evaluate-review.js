export const reviewStatuses=["unreviewed","normal","abnormal","indeterminate","not_applicable"];

export function createReviewState(stepIds){return {steps:Object.fromEntries(stepIds.map(id=>[id,{status:"unreviewed",completed:false,values:{}}])),urgentMode:false}}
export function reviewProgress(state){const total=Object.keys(state.steps).length;const completed=Object.values(state.steps).filter(x=>x.completed).length;return {completed,total,hasUnreviewed:completed<total}}

export function evaluateReviewNavigator(state){
  const value=(step,key)=>state.steps[step]?.values?.[key];
  const status=step=>state.steps[step]?.status??"unreviewed";
  const suggestions=[];const contradictions=[];const redFlags=[];const exclusions=[];
  if(value("st","inferiorElevation")){suggestions.push("V4Rを記録して右室梗塞を評価","右室梗塞を示唆する循環動態を確認","reciprocal changeを確認")}
  if(value("st","v1v3Depression")&&value("rwave","tallRv1v3"))suggestions.push("V7～V9を記録して後壁虚血を評価");
  if(value("qrs","rbbb")&&value("st","v1v3Elevation"))suggestions.push("V1／V2の装着位置を確認","Brugada patternを評価","右室負荷所見を確認","症状・失神・家族歴を確認");
  if(value("qt","prolonged")&&value("ectopy","pvc"))suggestions.push("R on Tを確認","T–U融合を確認","低K／低Mg／低Ca候補を確認","QT延長薬を確認");
  if(value("pwave","absent")&&value("rate","sinusRhythm"))contradictions.push({message:"P波なしと洞調律確定が同時に入力されています",step:"pwave"});
  if(value("qrs","narrow")&&(value("qrs","rbbb")||value("qrs","lbbb")))contradictions.push({message:"narrow QRSと完全脚ブロック候補が同時に入力されています",step:"qrs"});
  if(value("rate","regular")&&value("rate","irregularlyIrregular"))contradictions.push({message:"regularとirregularly irregularが同時に入力されています",step:"rate"});
  if(value("qt","prolonged")&&!value("qt","qtcEntered"))contradictions.push({message:"QTc未入力でQT延長候補が選択されています",step:"qt"});
  if(value("ectopy","rOnT")&&!value("ectopy","pvc"))contradictions.push({message:"R on T候補がありますがPVCが確認されていません",step:"ectopy"});
  if(value("quality","limbReversal")&&value("axis","confirmed"))contradictions.push({message:"左右上肢電極逆接続疑いがある状態で軸が確定されています",step:"quality"});
  if(value("rate","vf"))redFlags.push("VF候補");
  if(value("rate","sustainedVt"))redFlags.push("持続性VT候補");
  if(value("pr","completeBlock"))redFlags.push("完全房室ブロック候補");
  if(value("st","acuteOcclusion"))redFlags.push("急性冠閉塞候補");
  if(value("twave","severeHyperK"))redFlags.push("重症高Kパターン候補");
  if(value("ectopy","rOnT")&&value("qt","prolonged"))redFlags.push("R on T＋QT延長関連リスク");
  for(const [step,label] of [["pwave","P波"],["qrs","QRS幅"],["qt","QT／QTc"],["st","ST"],["twave","T波"],["ectopy","R on T"],["quality","電極装着異常"]])if(status(step)==="unreviewed"||status(step)==="indeterminate")exclusions.push(`${label}未確認のため、関連リスクは除外できません`);
  return {suggestions:[...new Set(suggestions)],contradictions,redFlags:[...new Set(redFlags)],exclusions};
}

