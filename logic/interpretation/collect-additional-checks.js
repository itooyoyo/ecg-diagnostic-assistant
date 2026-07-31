export function collectAdditionalChecks(items) {
  const checks = [];
  for (const item of items) {
    if (item.status === "rejected") continue;
    if (!item.abnormal && item.status !== "indeterminate") continue;
    for (const check of item.additionalChecks) {
      if (!checks.includes(check)) checks.push(check);
    }
  }
  return checks;
}
