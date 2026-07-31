import type { FindingFactor } from "@/types/interpretation";

export function MustNotMiss({ factors }: { factors: FindingFactor[] }) {
  if (!factors.length) return <p className="interpretation-empty">現在の入力から生成された仮Red Flagカテゴリはありません。</p>;
  return <div className="must-not-miss">
    {factors.map((factor) => <div key={factor.id}>
      <strong>{factor.label}</strong>
      <span>見逃し回避のため優先確認</span>
      <small>疾患確定ではありません</small>
    </div>)}
  </div>;
}
