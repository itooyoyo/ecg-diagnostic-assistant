const urgencyRank = {
  emergency: 0,
  same_day: 1,
  uncertain: 2,
  routine: 3,
};

export function sortByUrgency(items) {
  return [...items].sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
}

export function urgencyLabel(urgency) {
  return {
    emergency: "Red Flag",
    same_day: "当日評価",
    routine: "通常評価",
    uncertain: "判定不能・再確認",
  }[urgency];
}
