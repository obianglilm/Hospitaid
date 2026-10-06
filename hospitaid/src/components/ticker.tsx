import type { AnnouncementView } from "@/lib/ads";

/** Bande d'annonces défilante, fixée au-dessus de la navigation du bas. */
export default function Ticker({ items }: { items: AnnouncementView[] }) {
  if (items.length === 0) return null;
  const chars = items.reduce((n, i) => n + i.text.length + 8, 0);
  const seconds = Math.max(25, Math.round(chars * 0.22));
  const group = (suffix: string) =>
    items.map((i) =>
      i.linkUrl ? (
        <a key={`${i.id}${suffix}`} href={i.linkUrl} target="_blank" rel="noopener noreferrer sponsored">{i.text}</a>
      ) : (
        <span key={`${i.id}${suffix}`}>{i.text}</span>
      )
    );
  return (
    <div className="ticker" role="region" aria-label="Annonces">
      <div className="ticker-track" style={{ animationDuration: `${seconds}s` }}>
        <div className="ticker-group">{group("a")}</div>
        <div className="ticker-group" aria-hidden="true">{group("b")}</div>
      </div>
    </div>
  );
}
