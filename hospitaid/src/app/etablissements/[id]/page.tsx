import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const facility = await prisma.healthFacility.findUnique({
    where: { id: params.id },
    include: { type: true },
  });
  if (!facility) return notFound();

  return (
    <main className="container">
      <Link href="/etablissements" className="back-link">← Établissements</Link>
      <h1 className="page-title" style={{ fontSize: 22 }}>{facility.name}</h1>
      <div style={{ margin: "6px 0 12px" }}>
        <span className={`badge ${facility.verifiedAt ? "badge-ok" : "badge-warn"}`}>
          {facility.verifiedAt ? "Informations vérifiées" : "Informations non vérifiées"}
        </span>
      </div>
      <section className="card">
        <dl style={{ margin: 0 }}>
          <div className="spec-row"><dt>Type</dt><dd>{facility.type.label}</dd></div>
          <div className="spec-row"><dt>Ville</dt><dd>{facility.city}</dd></div>
          <div className="spec-row"><dt>Adresse</dt><dd>{facility.address ?? "À vérifier"}</dd></div>
          <div className="spec-row"><dt>Téléphone</dt><dd>{facility.phone ?? "À vérifier"}</dd></div>
        </dl>
      </section>
      {facility.sourceNote && <p className="muted">Source : {facility.sourceNote}</p>}
      <div className="notice">
        Merci de confirmer ces informations directement auprès de l&apos;établissement avant tout déplacement.
      </div>
      <Link href="/simulateur" className="btn btn-primary btn-block">Simuler un tarif →</Link>
    </main>
  );
}
