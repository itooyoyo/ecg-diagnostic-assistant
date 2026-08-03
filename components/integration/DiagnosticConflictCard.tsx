import type {IntegratedConflict} from "@/types/integrated-interpretation";
export function DiagnosticConflictCard({items}:{items:IntegratedConflict[]}){if(!items.length)return null;return <section className="integrated-conflicts"><h3>矛盾所見</h3>{items.map(x=><div key={x.id}><strong>確認が必要</strong><p>{x.description}</p><small>{x.consequence}</small></div>)}</section>}
