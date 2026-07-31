export function buildTodaysPlan(items) {
  const plan = { redFlags: [], sameDay: [], reevaluate: [], routine: [] };
  const seen = new Set();

  for (const item of items) {
    if (item.status === "rejected") continue;
    const actions = item.nextActions.length ? item.nextActions : item.additionalChecks;
    for (const action of actions) {
      if (seen.has(action)) continue;
      seen.add(action);
      if (item.urgency === "emergency") plan.redFlags.push(action);
      else if (item.urgency === "same_day") plan.sameDay.push(action);
      else if (item.urgency === "uncertain" || item.status === "indeterminate") plan.reevaluate.push(action);
      else plan.routine.push(action);
    }
  }
  return plan;
}

export function collectRedFlagCategories(items) {
  return items
    .filter((item) => item.urgency === "emergency" && item.status !== "rejected")
    .flatMap((item) => item.mustNotMiss)
    .filter((factor, index, all) => all.findIndex((candidate) => candidate.id === factor.id) === index)
    .map((factor) => ({
      id: factor.id,
      label: factor.label,
      category: factor.category,
      note: "仮カテゴリです。疾患確定・閾値判定は未実装です。",
    }));
}
