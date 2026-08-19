import type { EcgInterpretationItem } from "@/types/interpretation";
import { groupFindingFactors } from "@/logic/interpretation/build-interpretation.js";

export function FindingFactors({ item }: { item: EcgInterpretationItem }) {
  const groups = groupFindingFactors(item);
  return <div className="factor-groups">
    <FactorColumn title="この症例で支持される要因" items={groups.supported} />
    <FactorColumn title="現時点で可能性が残る要因" items={groups.possible} />
    <FactorColumn title="情報不足で評価できない要因" items={groups.insufficient} />
  </div>;
}

function FactorColumn({ title, items }: { title: string; items: EcgInterpretationItem["possibleFactors"] }) {
  const occurrences = new Map<string,number>();
  return <section>
    <h5>{title}</h5>
    {items.length ? <ul>{items.map((factor) => {const occurrence=occurrences.get(factor.id)??0;occurrences.set(factor.id,occurrence+1);return <li key={`${title}-${factor.id}-${factor.category}-${occurrence}`}>
      <strong>{factor.label}</strong>
      <span>支持：{factor.supportingInputs.join("・") || "なし"}</span>
      <span>不足：{factor.requiredInputs.join("・") || "なし"}</span>
      <small>優先度：{factor.priority}</small>
    </li>})}</ul> : <p className="interpretation-empty">該当なし</p>}
  </section>;
}
