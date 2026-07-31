import type { EvidenceSource } from "@/types/interpretation";

export function EvidenceSources({ sources }: { sources: EvidenceSource[] }) {
  if (!sources.length) return <p className="interpretation-empty">出典未登録のため、確定医学ロジックには使用しません。</p>;
  return <ul className="evidence-list">
    {sources.map((source) => <li key={`${source.organization}-${source.title}`}>
      <strong>{source.organization}</strong> {source.title}（{source.year}）
      {source.section && <span>{source.section}</span>}
      {source.url && <a href={source.url} target="_blank" rel="noreferrer">出典を開く</a>}
    </li>)}
  </ul>;
}
