import type { EcgInterpretationItem } from "@/types/interpretation";
import { urgencyLabel } from "@/logic/interpretation/determine-urgency.js";
import { InterpretationDetailCard } from "./InterpretationDetailCard";
import type { StInterpretation, StInterpretationInput } from "@/types/st-interpretation";

export function InterpretationNavigator({
  items,
  onChange,
  stInput, stResult, onStChange,
}: {
  items: EcgInterpretationItem[];
  onChange: (item: EcgInterpretationItem) => void;
  stInput: StInterpretationInput;
  stResult: StInterpretation;
  onStChange: (input: StInterpretationInput) => void;
}) {
  return <div className="interpretation-navigator">
    {items.map((item, index) => {
      const detailed = item.abnormal !== false || item.status !== "accepted";
      return <details className={`interpretation-item urgency-${item.urgency} ${detailed?"is-detailed":"is-compact"}`} data-interpretation-id={item.id} key={item.id} open={detailed}>
        <summary>
          <span className="interpretation-number">{String(index + 1).padStart(2,"0")}</span>
          <strong>{item.title}</strong>
          <span className="interpretation-state">{item.status === "indeterminate" ? "判定不能" : item.abnormal ? "異常" : "正常"}</span>
          <span className="interpretation-urgency">{urgencyLabel(item.urgency)}</span>
        </summary>
        <InterpretationDetailCard item={item} onChange={onChange} stInput={item.id==="st-change"?stInput:undefined} stResult={item.id==="st-change"?stResult:undefined} onStChange={onStChange}/>
      </details>;
    })}
  </div>;
}
