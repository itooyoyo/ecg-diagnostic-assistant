import type { EcgInterpretationItem } from "@/types/interpretation";
import { sortByUrgency } from "@/logic/interpretation/determine-urgency.js";

export function InterpretationSummary({ items }: { items: EcgInterpretationItem[] }) {
  const important = sortByUrgency(items.filter((item) => item.abnormal || item.status === "indeterminate"));
  return <section className="interpretation-summary" aria-label="重要所見サマリー">
    <div><span>重要所見</span><strong>{important.length}</strong></div>
    <ul>{important.map((item) => <li className={`urgency-${item.urgency}`} key={item.id}>
      <strong>{item.title}</strong>
      <span>{item.status === "indeterminate" ? "判定不能・再確認" : item.urgency === "emergency" ? "Red Flag" : "当日評価"}</span>
    </li>)}</ul>
  </section>;
}
