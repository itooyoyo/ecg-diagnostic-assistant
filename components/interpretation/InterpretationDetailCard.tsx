import type { EcgInterpretationItem, InterpretationStatus } from "@/types/interpretation";
import { EvidenceSources } from "./EvidenceSources";
import { FindingFactors } from "./FindingFactors";
import { MustNotMiss } from "./MustNotMiss";
import { STChangeModule } from "./STChangeModule";
import type { StInterpretation, StInterpretationInput } from "@/types/st-interpretation";
import type { TWaveInterpretation, TWaveInterpretationInput } from "@/types/t-wave-interpretation";
import { TWaveModule } from "./TWaveModule";

const statusLabels: Record<InterpretationStatus, string> = {
  accepted: "正しい",
  edited: "修正済み",
  rejected: "所見なし（削除）",
  indeterminate: "判定不能",
};

export function InterpretationDetailCard({
  item,
  onChange,
  stInput, stResult, onStChange, tWaveInput, tWaveResult, onTWaveChange,
}: {
  item: EcgInterpretationItem;
  onChange: (next: EcgInterpretationItem) => void;
  stInput?: StInterpretationInput;
  stResult?: StInterpretation;
  onStChange: (input: StInterpretationInput) => void;
  tWaveInput?: TWaveInterpretationInput;
  tWaveResult?: TWaveInterpretation;
  onTWaveChange: (input: TWaveInterpretationInput) => void;
}) {
  return <div className="interpretation-detail">
    <div className="interpretation-values">
      <div><span>AI抽出</span><strong>{displayValue(item.aiValue)}</strong></div>
      <label><span>医師確認</span><input value={displayValue(item.clinicianValue)} placeholder="医師確認値を入力" onChange={(event) => onChange({...item, clinicianValue:event.target.value, status:"edited"})}/></label>
      <label><span>判定状態</span><select value={item.status} onChange={(event) => onChange({...item, status:event.target.value as InterpretationStatus})}>
        {Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
    </div>

    {stInput&&stResult&&<STChangeModule input={stInput} result={stResult} onChange={onStChange}/>}
    {tWaveInput&&tWaveResult&&<TWaveModule input={tWaveInput} result={tWaveResult} onChange={onTWaveChange}/>}

    <DetailSection title="所見の意味" items={item.meaning} />
    <section><h4>考えられる要因</h4><FindingFactors item={item}/></section>
    <section><h4>見逃してはいけない病態</h4><MustNotMiss factors={item.mustNotMiss}/></section>
    <DetailSection title="追加で確認する情報" items={item.additionalChecks} />
    <DetailSection title="次の一手" items={item.nextActions} />
    <section><h4>出典</h4><EvidenceSources sources={item.sources}/></section>
    <DetailSection title="解析上の制限" items={item.limitations} />
  </div>;
}

function DetailSection({ title, items }: { title:string; items:string[] }) {
  return <section><h4>{title}</h4>{items.length ? <ul className="list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="interpretation-empty">現段階では登録なし</p>}</section>;
}

function displayValue(value: unknown) {
  return value == null ? "" : String(value);
}
