import type { EcgInterpretationItem } from "@/types/interpretation";
import { urgencyLabel } from "@/logic/interpretation/determine-urgency.js";
import { InterpretationDetailCard } from "./InterpretationDetailCard";
import type { StInterpretation, StInterpretationInput } from "@/types/st-interpretation";
import type { TWaveInterpretation, TWaveInterpretationInput } from "@/types/t-wave-interpretation";
import type { QtInterpretation, QtInterpretationInput } from "@/types/qt-interpretation";
import type { VentricularEctopyInput, VentricularEctopyInterpretation } from "@/types/ventricular-ectopy";

export function InterpretationNavigator({
  items,
  onChange,
  stInput, stResult, onStChange, tWaveInput, tWaveResult, onTWaveChange, qtInput, qtResult, onQtChange, pvcInput, pvcResult, onPvcChange,
}: {
  items: EcgInterpretationItem[];
  onChange: (item: EcgInterpretationItem) => void;
  stInput: StInterpretationInput;
  stResult: StInterpretation;
  onStChange: (input: StInterpretationInput) => void;
  tWaveInput: TWaveInterpretationInput;
  tWaveResult: TWaveInterpretation;
  onTWaveChange: (input: TWaveInterpretationInput) => void;
  qtInput: QtInterpretationInput;
  qtResult: QtInterpretation;
  onQtChange: (input: QtInterpretationInput) => void;
  pvcInput: VentricularEctopyInput;
  pvcResult: VentricularEctopyInterpretation;
  onPvcChange: (input: VentricularEctopyInput) => void;
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
        <InterpretationDetailCard item={item} onChange={onChange} stInput={item.id==="st-change"?stInput:undefined} stResult={item.id==="st-change"?stResult:undefined} onStChange={onStChange} tWaveInput={item.id==="t-wave"?tWaveInput:undefined} tWaveResult={item.id==="t-wave"?tWaveResult:undefined} onTWaveChange={onTWaveChange} qtInput={item.id==="qt-qtc"?qtInput:undefined} qtResult={item.id==="qt-qtc"?qtResult:undefined} onQtChange={onQtChange} pvcInput={item.id==="ventricular-ectopy"?pvcInput:undefined} pvcResult={item.id==="ventricular-ectopy"?pvcResult:undefined} onPvcChange={onPvcChange}/>
      </details>;
    })}
  </div>;
}
