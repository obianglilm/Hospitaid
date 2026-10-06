import type { PartnerView } from "@/lib/ads";

/** Encart publicitaire : toujours étiqueté « Partenaire » pour ne pas être pris pour une information médicale. */
export default function PartnerCard({ partner }: { partner: PartnerView }) {
  return (
    <aside className="partner-card" aria-label={`Partenaire : ${partner.name}`}>
      {partner.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="partner-img" src={partner.imageUrl} alt={partner.name} loading="lazy" referrerPolicy="no-referrer" />
      )}
      <div className="partner-body">
        <span className="badge">Partenaire · {partner.name}</span>
        <strong className="partner-title">{partner.title}</strong>
        {partner.text && <p className="muted" style={{ margin: "4px 0 0" }}>{partner.text}</p>}
        {partner.linkUrl && (
          <a className="btn btn-outline btn-small" style={{ marginTop: 8 }} href={partner.linkUrl} target="_blank" rel="noopener noreferrer sponsored">
            Découvrir →
          </a>
        )}
      </div>
    </aside>
  );
}
