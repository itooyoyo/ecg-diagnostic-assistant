export function buildNoPriorityDisplay({candidateCount,criticalCount,enteredFindings,unassessedItems}){
  if(candidateCount>0)return null;
  const uniqueEntered=[...new Set(enteredFindings.filter(Boolean))];
  const uniqueUnassessed=[...new Set(unassessedItems.filter(Boolean))];
  const fullyReviewed=criticalCount===0&&uniqueUnassessed.length===0&&uniqueEntered.length>0;
  return {
    title:"現時点で優先度の高い診断候補はありません。",
    summary:fullyReviewed?"入力された範囲では明らかな異常所見は認められません。":"入力された範囲では、緊急性の高い所見や明確な診断候補は抽出されていません。",
    enteredFindings:uniqueEntered,
    unassessedItems:uniqueUnassessed,
    additionalInformation:uniqueUnassessed.slice(0,6),
  };
}
